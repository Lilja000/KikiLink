import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { fixture, group } from './helpers.mjs';

test('Group receipts require every relevant recipient and never confuse storage with delivery', async t => {
  const f = await fixture(t), g = await group(f);
  const send = (text) => f.ok('POST', `/v1/conversations/${g.conversationId}/messages`, {
    text, clientId: crypto.randomUUID(), membershipVersion: g.membershipVersion, keyVersion: g.keyVersion,
    schemaVersion: 1, encryption: 'server-aes-256-gcm',
  }, 101, 201);
  const query = (ids) => f.ok('POST', `/v1/conversations/${g.conversationId}/receipts/query`, { ids }, 101);
  const acknowledge = (actor, deliveredIds, readIds) =>
    f.ok('PUT', `/v1/conversations/${g.conversationId}/receipts`, { deliveredIds, readIds }, actor);

  const first = await send('Confirm me honestly');
  assert.equal(first.receiptState, null);
  assert.equal((await query([first.id])).items[0].state, null);
  await acknowledge(202, [first.id], []);
  assert.equal((await query([first.id])).items[0].state, null);
  await acknowledge(303, [first.id], []);
  assert.equal((await query([first.id])).items[0].state, 'delivered');
  await acknowledge(202, [], [first.id]);
  assert.equal((await query([first.id])).items[0].state, 'delivered');
  await acknowledge(303, [], [first.id]);
  assert.equal((await query([first.id])).items[0].state, 'read');
  const recipientView = await f.ok('GET', `/v1/conversations/${g.conversationId}/messages/${first.id}`, undefined, 202);
  assert.equal(Object.hasOwn(recipientView, 'receiptState'), false);

  await f.ok('POST', `/v1/groups/${g.id}/invitations`, { memberNumber: 404 }, 101, 204);
  const expanded = await f.ok('POST', `/v1/groups/${g.id}/accept`, {}, 404);
  assert.equal((await query([first.id])).items[0].state, 'read');
  assert.equal((await f.request('PUT', `/v1/conversations/${g.conversationId}/receipts`, { deliveredIds: [first.id], readIds: [] }, 404)).statusCode, 404);

  const second = await f.ok('POST', `/v1/conversations/${g.conversationId}/messages`, {
    text: 'Everyone currently here', clientId: crypto.randomUUID(), membershipVersion: expanded.membershipVersion,
    keyVersion: expanded.keyVersion, schemaVersion: 1, encryption: 'server-aes-256-gcm',
  }, 101, 201);
  await acknowledge(202, [], [second.id]);
  await acknowledge(303, [], [second.id]);
  assert.equal((await query([second.id])).items[0].state, null);
  await acknowledge(404, [second.id], []);
  assert.equal((await query([second.id])).items[0].state, 'delivered');
  await acknowledge(404, [], [second.id]);
  assert.equal((await query([second.id])).items[0].state, 'read');
});

test('Group typing is session-bound, expiring, member-only and respects blocks and removal', async t => {
  const f = await fixture(t), g = await group(f), path = `/v1/conversations/${g.conversationId}/typing`;
  await f.ok('PUT', '/v1/presence', {status:'online'}, 202, 204);
  await f.ok('PUT', path, {typing:true}, 202, 204);
  const live = await f.ok('GET', `/v1/groups/${g.id}/live`);
  assert.deepEqual(live.typing.map(m=>m.memberNumber), [202]);
  assert.equal(live.members.find(m=>m.memberNumber===202).status, 'online');
  assert.equal((await f.request('GET', `/v1/groups/${g.id}/live`, undefined, 404)).statusCode, 404);
  assert.equal((await f.request('PUT', path, {typing:true}, 404)).statusCode, 404);
  assert.equal((await f.request('PUT', path, {typing:true,text:'Never collect a draft'}, 202)).statusCode, 400);
  await f.ok('PUT','/v1/blocks/202',{},101,204);
  assert.deepEqual((await f.ok('GET', `/v1/groups/${g.id}/live`)).typing, []);
  await f.ok('DELETE','/v1/blocks/202',undefined,101,204);
  f.advance(8001); assert.deepEqual((await f.ok('GET', `/v1/groups/${g.id}/live`)).typing, []);
  await f.ok('PUT', path, {typing:true}, 202, 204);
  await f.ok('DELETE', `/v1/groups/${g.id}/members/202`, undefined, 101, 204);
  assert.deepEqual((await f.ok('GET', `/v1/groups/${g.id}/live`)).typing, []);
  assert.equal((await f.request('PUT', path, {typing:true}, 202)).statusCode, 404);
});
test('Typing ends on logout and presence is no longer shown for a revoked session', async t => {
  const f = await fixture(t), g = await group(f);
  await f.ok('PUT', '/v1/presence', {status:'dnd'}, 202, 204);
  await f.ok('PUT', `/v1/conversations/${g.conversationId}/typing`, {typing:true}, 202, 204);
  f.db.run('DELETE FROM sessions WHERE member_number=202');
  const live = await f.ok('GET', `/v1/groups/${g.id}/live`);
  assert.deepEqual(live.typing, []); assert.equal(live.members.find(m=>m.memberNumber===202).status, 'unavailable');
});
test('Group avatars use validated media, cannot be deleted while referenced, and remain manageable after owner transfer', async t => {
  const f = await fixture(t), g = await group(f);
  const bytes = await sharp({create:{width:32,height:32,channels:3,background:'#c01030'}}).png().toBuffer();
  const r = await f.request('POST', '/v1/media/avatar', bytes, 101, {'content-type':'image/png'});
  assert.equal(r.statusCode,201,r.body); const id=r.json().id;
  const changed=await f.ok('PATCH', `/v1/groups/${g.id}`, {title:g.title,revision:g.revision,avatarId:id});
  assert.equal(changed.avatarId,id);
  assert.equal((await f.request('GET', `/v1/media/${id}`,undefined,202)).statusCode,200);
  assert.equal((await f.request('GET', `/v1/media/${id}`,undefined,404)).statusCode,404);
  assert.equal((await f.request('DELETE', `/v1/media/${id}`,undefined,101)).statusCode,409);
  f.advance(86400001); await f.media.cleanup(); assert.ok(f.db.get('SELECT 1 FROM storage_assets WHERE id=?',id));
  await f.login(101); await f.login(202);
  await f.ok('PUT', `/v1/groups/${g.id}/members/202/role`, {role:'owner'},101,204);
  const current=await f.ok('GET', `/v1/groups/${g.id}`,undefined,202);
  assert.equal((await f.request('PATCH', `/v1/groups/${g.id}`, {title:'No',revision:current.revision,avatarId:null},303)).statusCode,401);
  const renamed=await f.ok('PATCH', `/v1/groups/${g.id}`, {title:'New owner',revision:current.revision,avatarId:id},202);
  assert.equal(renamed.avatarId,id);
  await f.ok('PATCH', `/v1/groups/${g.id}`, {title:renamed.title,revision:renamed.revision,avatarId:null},202);
  await f.media.cleanup(); assert.equal(f.db.get('SELECT 1 FROM storage_assets WHERE id=?',id),undefined);
});
test('Inbox summaries exclude own-only, blocked, deleted and pre-join messages without history fetches', async t => {
  const f=await fixture(t), g=await group(f);
  const send=async (sender,text)=>f.ok('POST',`/v1/conversations/${g.conversationId}/messages`,{text,clientId:crypto.randomUUID(),membershipVersion:g.membershipVersion,keyVersion:g.keyVersion,schemaVersion:1,encryption:'server-aes-256-gcm'},sender,201);
  const own=await send(101,'Own message');
  let summary=(await f.ok('GET','/v1/groups')).items[0]; assert.equal(summary.lastIncomingSequence,0); assert.equal(summary.lastMessage.sequence,own.sequence);
  const other=await send(202,'Incoming message'); await send(303,'Blocked text');
  await f.ok('PUT','/v1/blocks/303',{},101,204);
  summary=(await f.ok('GET','/v1/groups')).items[0]; assert.equal(summary.lastMessage.sequence,other.sequence); assert.deepEqual(summary.incomingSequences,[{memberNumber:202,sequence:other.sequence}]);
  await f.ok('DELETE',`/v1/conversations/${g.conversationId}/messages/${other.id}`,undefined,101,204);
  summary=(await f.ok('GET','/v1/groups')).items[0]; assert.equal(summary.lastIncomingSequence,0);
});
test('Unseen users have a default profile; saved full profiles cross clients and explicit deletion disables automatic republishing', async t => {
  const f=await fixture(t); await f.login(101); await f.login(202);
  const missing=await f.ok('GET','/v1/profiles/999999'); assert.equal(missing.isDefault,true); assert.equal(missing.bio,'');
  const own=await f.ok('GET','/v1/profiles/101'); assert.equal(own.autoPublishAllowed,true);
  const saved=await f.ok('PUT','/v1/profiles/me',{displayName:'Kiki',bio:'Hello',statusMessage:'Mapping',avatarFrame:'blossom',profileStyle:'garden',profileOutlineColor:'#112233',revision:0,visible:true});
  const remote=await f.ok('GET','/v1/profiles/101',undefined,202); assert.equal(remote.statusMessage,'Mapping'); assert.equal(remote.avatarFrame,'blossom'); assert.equal(remote.bio,'Hello');
  const {memberNumber,updatedAt,avatarId,bannerId,statusMessage,...legacy}=saved;
  await f.ok('PUT','/v1/profiles/me',legacy); assert.equal((await f.ok('GET','/v1/profiles/101')).statusMessage,'Mapping');
  await f.ok('DELETE','/v1/profiles/me',undefined,101,204);
  assert.equal((await f.ok('GET','/v1/profiles/101')).autoPublishAllowed,false);
  assert.equal((await f.ok('GET','/v1/profiles/101',undefined,202)).isDefault,true);
});
