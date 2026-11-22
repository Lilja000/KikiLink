import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { fixture } from './helpers.mjs';

const root = process.env.CLOUD_TEST_API_ROOT
  ? pathToFileURL(process.env.CLOUD_TEST_API_ROOT + '/')
  : new URL('../src/', import.meta.url);
const [{ deviceMessage }, { Database }, { createApp }] = await Promise.all([
  import(new URL('device-auth.mjs', root)),
  import(new URL('db.mjs', root)),
  import(new URL('app.mjs', root)),
]);

async function prepare(f) {
  const headers = { authorization: `Bearer ${f.config.verifierSecret}` };
  const r = await f.verifier.inject({ method: 'GET', url: '/enrollment', headers });
  assert.equal(r.statusCode, 200, r.body);
  const ready = await f.verifier.inject({ method: 'POST', url: '/enrollment', headers,
    payload: r.json() });
  assert.equal(ready.statusCode, 200, ready.body);
}

async function enroll(f, member) {
  const keys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const challenge = await f.ok('POST', '/v1/auth/challenges', {
    memberNumber: member, publicKey: keys.publicKey.export({ format: 'jwk' }),
  }, undefined, 201);
  assert.equal((await f.verify({ challengeId: challenge.challengeId, proof: challenge.proof, sender: member })).statusCode, 200);
  const session = await f.ok('POST', '/v1/auth/exchange', {
    challengeId: challenge.challengeId, exchange: challenge.exchange,
  }, undefined);
  f.sessions.set(member, session.token);
  return { member, privateKey: keys.privateKey, device: session.device };
}

async function resume(f, account, request = f.request) {
  const { member, privateKey, device } = account;
  const begin = await request('POST', '/v1/auth/device-challenges', { memberNumber: member, deviceId: device.id });
  assert.equal(begin.statusCode, 201, begin.body);
  const c = begin.json();
  const payload = { challengeId: c.challengeId, nonce: c.nonce, deviceId: device.id, memberNumber: member,
    signature: sign('sha256', Buffer.from(deviceMessage(c.challengeId, c.nonce, device.id, member, f.origin)),
      { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url') };
  const response = await request('POST', '/v1/auth/device-exchange', payload);
  assert.equal(response.statusCode, 200, response.body);
  assert.equal((await request('POST', '/v1/auth/device-exchange', payload)).statusCode, 401, 'Device challenges remain one-use');
  f.sessions.set(member, response.json().token);
}

test('Verifier outage and API restart preserve device login, avatars, Feed and idempotent Direct delivery', async t => {
  const f = await fixture(t, { mode: 'production' });
  await prepare(f);
  const alice = await enroll(f, 101), bob = await enroll(f, 202);
  for (const member of [101, 202]) await f.ok('PUT', '/v1/capabilities/me', {
    friendRequests: true, directMessages: true,
  }, member);
  await f.ok('POST', '/v1/relationships/confirm', { members: [202] }, 101);
  await f.ok('POST', '/v1/relationships/confirm', { members: [101] }, 202);
  const bytes = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#886688' } }).png().toBuffer();
  const uploaded = await f.request('POST', '/v1/media/avatar', bytes, 101, {
    'content-type': 'image/png', 'content-length': String(bytes.length),
  });
  assert.equal(uploaded.statusCode, 201, uploaded.body);
  const avatarId = uploaded.json().id;
  await f.ok('PUT', '/v1/profiles/me', { displayName: 'Persistent profile', avatarId, revision: 0 });
  const post = await f.ok('POST', '/v1/feed', { text: 'Verifier-independent Feed', mediaIds: [], clientId: randomUUID() }, 101, 201);
  const message = { clientMessageId: randomUUID(), text: 'Stable delivery identity', createdAt: f.auth.now() };
  const sent = await f.ok('POST', '/v1/direct/202/messages', message, 101, 201);

  // No further native proofs or enrollment lease renewals are provided.
  f.advance(8001);
  const health = await f.request('GET', '/health/ready');
  assert.equal(health.statusCode, 200);
  assert.equal(health.json().enrollmentReady, false);
  assert.equal((await f.request('POST', '/v1/auth/challenges', { memberNumber: 303 })).statusCode, 503);
  await resume(f, alice);
  await resume(f, bob);
  assert.equal((await f.ok('GET', '/v1/profiles/101', undefined, 202)).avatarId, avatarId);
  assert.equal((await f.request('GET', `/v1/media/${avatarId}`, undefined, 202)).statusCode, 200);
  assert.ok((await f.ok('GET', '/v1/feed', undefined, 202)).items.some(p => p.id === post.id));

  await f.app.close();
  f.db.close();
  const db = new Database(f.path);
  const reboot = createApp({ db, keys: f.keys, storage: f.storage, config: f.config, now: f.auth.now });
  t.after(async () => { await reboot.app.close(); db.close(); });
  const request = (method, url, payload, member) => reboot.app.inject({ method, url,
    headers: { origin: f.origin, ...(member ? { authorization: `Bearer ${f.sessions.get(member)}` } : {}) },
    ...(payload !== undefined ? { payload } : {}) });
  await resume(f, alice, request);
  await resume(f, bob, request);
  assert.equal((await request('GET', '/health/ready')).json().enrollmentReady, false);
  assert.equal((await request('POST', '/v1/auth/challenges', { memberNumber: 303 })).statusCode, 503);
  const profile = await request('GET', '/v1/profiles/101', undefined, 202);
  assert.equal(profile.statusCode, 200);
  assert.equal(profile.json().avatarId, avatarId);
  assert.equal((await request('GET', `/v1/media/${avatarId}`, undefined, 202)).statusCode, 200);
  assert.ok((await request('GET', '/v1/feed', undefined, 202)).json().items.some(p => p.id === post.id));
  const retry = await request('POST', '/v1/direct/202/messages', message, 101);
  assert.equal(retry.statusCode, 201, retry.body);
  assert.equal(retry.json().id, sent.id);
  assert.equal(db.get('SELECT count(*) AS n FROM direct_messages').n, 1);
  const inbox = await request('GET', '/v1/direct/inbox', undefined, 202);
  assert.equal(inbox.statusCode, 200, inbox.body);
  assert.equal(inbox.json().items[0].text, message.text);
  const acknowledged = await request('POST', '/v1/direct/acknowledge', { ids: [sent.id] }, 202);
  assert.equal(acknowledged.statusCode, 200, acknowledged.body);
  assert.equal(db.get('SELECT state FROM direct_messages').state, 'delivered');
  reboot.auth.logoutAll(101);
  assert.equal((await request('POST', '/v1/auth/device-challenges', {
    deviceId: alice.device.id, memberNumber: 101,
  })).statusCode, 401, 'Revocation still wins even while the verifier is offline');
});
