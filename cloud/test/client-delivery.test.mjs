import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fixture } from "./helpers.mjs";
import { createApp } from "../src/app.mjs";
import { Database } from "../src/db.mjs";
import sharp from "sharp";
import catalog from "../shared/preferences-catalog.json" with { type: "json" };

test("HTTP profile appearance, preference patches and Mailbox survive client/API reloads without leaking private ratings", { timeout: 20000 }, async t => {
  const previousLocation = globalThis.location;
  globalThis.location = new URL("https://bondageprojects.elementfx.com/R131/");
  t.after(() => { if (previousLocation === undefined) delete globalThis.location; else globalThis.location = previousLocation; });
  const f = await fixture(t), root = resolve(import.meta.dirname, "../..");
  const bundle = join(f.dir, "profile-client.mjs");
  await build({ stdin: { contents: `export {CloudClient} from './src/cloud/client.ts';`, resolveDir: root }, bundle: true, platform: "node", format: "esm", outfile: bundle, logLevel: "silent" });
  const { CloudClient } = await import(pathToFileURL(bundle));
  let endpoint = await f.app.listen({ port: 0, host: "127.0.0.1" });
  const live = new Set(), devices = new Map();
  t.after(() => { for (const c of live) c.destroy(); });
  const open = async member => {
    let proof = Promise.resolve();
    const client = new CloudClient({ origin: `${f.config.origin}/kikilink-test`, memberNumber: member, getMemberNumber: () => member,
      isBlocked: () => false, verificationDelays: [0, 15, 30],
      deviceStore: { load: async () => devices.get(member), save: async value => devices.set(member, value), pause: async () => devices.set(member, "paused") },
      sendProof: (_target, wire) => { const data = JSON.parse(wire); proof = f.verify({ challengeId: data.challengeId, proof: data.proof, sender: member }).then(r => assert.equal(r.statusCode, 200, r.body)); },
      fetchImpl: async (input, init = {}) => {
        const url = new URL(String(input)); assert.ok(url.pathname.startsWith("/kikilink-test/"));
        if (url.pathname.endsWith("/auth/exchange")) await proof;
        const headers = new Headers(init.headers); headers.set("origin", f.origin);
        return fetch(`${endpoint}${url.pathname.slice("/kikilink-test".length)}${url.search}`, { ...init, headers });
      } });
    live.add(client); await client.connect(); return client;
  };
  const a = await open(101), b = await open(202);
  const features = (await a.request("GET", "/v1/me")).features;
  assert.equal(features.fullProfile, true);
  assert.equal(features.profileGradientAngle, true);
  const bytes = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#b03566" } }).png().toBuffer();
  const avatar = await a.request("POST", "/v1/media/avatar", new Blob([bytes], { type: "image/png" }));
  const banner = await a.request("POST", "/v1/media/banner", new Blob([bytes], { type: "image/png" }));
  const input = { displayName: "Fixture owner", bio: "Retain this bio", statusMessage: "Custom status", publicTags: ["Public tag"],
    avatarId: avatar.id, bannerId: banner.id, avatarFrame: "none", avatarDecoration: { mode: "gradient", preset: "rose", primary: "#123456", secondary: "#654321", angle: 225 },
    profileStyle: "gradient", profileGradient: { start: "#654321", end: "#123456", angle: 315, enabled: true }, profileOutlineColor: "#aabbcc", visible: true, revision: 0 };
  const saved = await a.request("PUT", "/v1/profiles/me", input); assert.equal(saved.revision, 1);
  const ids = [...catalog.items.slice(0, 8).map(i => i.id), "roleplay.foxy", "edge.watersports"], ratings = Object.fromEntries(ids.map(id => [id, "like"]));
  await a.request("PUT", "/v1/preferences/me", { mode: "public", ratings, revision: 0 });
  const prefs = await a.request("PATCH", "/v1/preferences/me", { updates: { [ids[0]]: "hard_limit", [ids[1]]: "neutral", "roleplay.foxy": null }, revision: 1 });
  await b.request("PUT", "/v1/preferences/me", { mode: "public", ratings: { ...ratings, [ids[0]]: "love" }, revision: 0 });
  assert.equal((await b.request("GET", "/v1/compatibility/101")).hardLimitConflictCount, 1);
  const post = await a.request("POST", "/v1/feed", { text: "Fixture post", mediaIds: [], clientId: crypto.randomUUID() });
  await b.request("POST", `/v1/feed/${post.id}/comments`, { text: "Fixture comment" });
  assert.equal((await a.request("GET", "/v1/mailbox")).unread, 1);
  for (const c of live) c.destroy(); live.clear(); await f.app.close(); f.db.close();
  const db = new Database(f.path), api = createApp({ db, keys: f.keys, storage: f.storage, config: f.config });
  endpoint = await api.app.listen({ port: 0, host: "127.0.0.1" });
  t.after(async () => { for (const c of live) c.destroy(); await api.app.close(); db.close(); });
  const a2 = await open(101), b2 = await open(202);
  const own = await a2.profile(101, true), other = await b2.profile(101, true);
  for (const [key, value] of Object.entries(input)) if (key !== "revision") {
    assert.deepEqual(own[key], value, `Owner reload: ${key}`);
    assert.deepEqual(other[key], value, `Public reload: ${key}`);
  }
  assert.deepEqual((await a2.request("GET", "/v1/preferences/me")).ratings, prefs.ratings);
  assert.equal(prefs.ratings["edge.watersports"], "like");
  assert.ok(!Object.hasOwn(prefs.ratings, "roleplay.foxy"));
  assert.ok((await b2.media(avatar.id)).size > 0);
  assert.equal((await a2.request("GET", "/v1/mailbox")).unread, 1);
  assert.equal((await b2.request("GET", "/v1/mailbox")).unread, 0);
  await a2.request("POST", "/v1/mailbox/read", {});
  assert.equal((await a2.request("GET", "/v1/mailbox")).unread, 0);
  await a2.request("PATCH", "/v1/preferences/me", { mode: "private", updates: {}, revision: prefs.revision });
  await assert.rejects(b2.request("GET", "/v1/preferences/101"), error => error.status === 403);
  assert.deepEqual(await b2.request("GET", "/v1/compatibility/101"), { status: "private" });
  assert.equal((await b2.profile(101, true)).bio, input.bio);
  assert.equal("ratings" in other, false);
});

// Real client modules, Fastify HTTP, SQLite, crypto and SSE. BC proof transport is a disposable fixture.
test("Two real clients recover Direct delivery/read and offline Feed counts after client/API restarts", { timeout: 20000 }, async t => {
  const previousLocation = globalThis.location;
  globalThis.location = new URL("https://bondageprojects.elementfx.com/R131/");
  t.after(() => { if (previousLocation === undefined) delete globalThis.location; else globalThis.location = previousLocation; });
  const f = await fixture(t), root = resolve(import.meta.dirname, "../..");
  const bundle = join(f.dir, "client.mjs");
  await build({ stdin: { contents: `export {CloudClient} from './src/cloud/client.ts'; export {CommunityService} from './src/cloud/community.ts'; export {CloudDirect} from './src/cloud/direct.ts'; export {ChatService} from './src/modules/link-chat/chat-service.ts'; export {MemoryChatRepository} from './src/storage/memory-chat-repository.ts'; export {MemoryKeyValueStorage,SettingsStore} from './src/core/settings.ts'; export {directReceiptState} from './src/modules/link-chat/message-receipt.ts';`, resolveDir: root }, bundle: true, platform: "node", format: "esm", outfile: bundle, logLevel: "silent" });
  const { CloudClient, CommunityService, CloudDirect, ChatService, MemoryChatRepository, MemoryKeyValueStorage, SettingsStore, directReceiptState } = await import(pathToFileURL(bundle));
  let api = f, endpoint = await f.app.listen({ port: 0, host: "127.0.0.1" });
  const devices = new Map(), states = new Map(), repositories = new Map(), requests = [], live = new Set();
  const until = async (check, label) => { for (let i = 0; i < 150; i++) { if (await check()) return; await new Promise(r => setTimeout(r, 15)); } assert.fail(label); };
  const open = async member => {
    const peer = member === 101 ? 202 : 101;
    let proof = Promise.resolve();
    const storage = states.get(member) ?? new MemoryKeyValueStorage(); states.set(member, storage);
    storage.setItem(`kikilink:cloud:direct-consent:${member}:v1`, "no");
    const client = new CloudClient({ origin: f.config.origin, memberNumber: member, getMemberNumber: () => member, isBlocked: () => false,
      verificationDelays: [0, 15, 30], deviceStore: { load: async () => devices.get(member), save: async key => devices.set(member, key), pause: async () => devices.set(member, "paused") },
      sendProof: (_target, wire) => { const data = JSON.parse(wire); proof = f.verify({ challengeId: data.challengeId, proof: data.proof, sender: member }).then(r => assert.equal(r.statusCode, 200, r.body)); },
      fetchImpl: async (input, init = {}) => {
        const url = new URL(String(input)); requests.push({ member, method: init.method ?? "GET", path: url.pathname });
        if (url.pathname === "/v1/auth/exchange") await proof;
        const headers = new Headers(init.headers); headers.set("origin", f.origin);
        return fetch(`${endpoint}${url.pathname}${url.search}`, { ...init, headers });
      } });
    await client.connect();
    const adapter = { ownFriends: () => [peer], subscribeFriends: () => () => {}, getOwnMemberNumber: () => member, getMemberName: number => `Fixture ${number}`, setNativeFriend: () => {} };
    const community = new CommunityService(client, adapter, storage); await community.start();
    assert.equal(community.directEnabled, true, "Legacy opt-out must not silently disable Direct");
    const repository = repositories.get(member) ?? new MemoryChatRepository(); repositories.set(member, repository);
    const chat = new ChatService(repository, new SettingsStore(storage));
    const direct = new CloudDirect(community, chat, storage, { active: () => false, changed: () => {}, incoming: () => {} });
    const runtime = { client, community, chat, direct, close: () => { direct.destroy(); community.destroy(); client.destroy(); live.delete(runtime); } }; live.add(runtime); return runtime;
  };
  t.after(() => { for (const runtime of live) runtime.close(); });
  // Existing account identities precede capability rollout, just as the production upgrade path does.
  await f.login(101); await f.login(202);
  const alice = await open(101), bob = await open(202);
  await alice.community.refresh(); await bob.community.refresh();
  assert.equal(alice.direct.canUse(202), true); assert.equal(bob.direct.canUse(101), true);
  bob.close();
  for (let i = 0; i < 2; i++) await alice.client.request("POST", "/v1/feed", {
    text: `Posted while recipient is offline ${i}`, mediaIds: [], clientId: crypto.randomUUID(),
  });
  await alice.direct.send(202, "Fixture 202", "Saved while recipient is offline");
  await until(async () => (await alice.chat.getMessages(202))[0]?.delivery === "sent", "Server did not confirm Sent");
  assert.equal(f.db.get("SELECT state FROM direct_messages").state, "sent");
  assert.equal(directReceiptState((await alice.chat.getMessages(202))[0].delivery), "sent", "One check needs only confirmed Cloud storage while recipient is offline");
  alice.close(); await f.app.close(); f.db.close();
  const reopened = new Database(f.path);
  api = createApp({ db: reopened, keys: f.keys, storage: f.storage, config: f.config });
  endpoint = await api.app.listen({ port: 0, host: "127.0.0.1" });
  t.after(async () => { for (const runtime of live) runtime.close(); await api.app.close(); reopened.close(); });
  const returningBob = await open(202); await returningBob.direct.sync();
  assert.equal(returningBob.community.feedUnread, 2, "Returning from offline must restore the unread post count");
  assert.equal((await returningBob.chat.getMessages(101))[0].content, "Saved while recipient is offline");
  assert.equal((await returningBob.chat.getConversation(101)).unread, 1);
  assert.equal(reopened.get("SELECT state FROM direct_messages").state, "delivered");
  await returningBob.direct.sync(); assert.equal((await returningBob.chat.getMessages(101)).length, 1);
  assert.equal((await returningBob.chat.getConversation(101)).unread, 1, "Resync must not clear or duplicate unread");
  const returningAlice = await open(101); await returningAlice.direct.sync();
  assert.equal((await returningAlice.chat.getMessages(202))[0].delivery, "delivered");
  assert.equal(directReceiptState((await returningAlice.chat.getMessages(202))[0].delivery), "sent", "Receiving without reading must keep one check");
  assert.equal(returningAlice.community.feedUnread, 0, "Own posts must not count as unread");
  await returningBob.chat.markRead(101); await returningBob.direct.sync();
  await until(async () => { await returningAlice.direct.sync(); return (await returningAlice.chat.getMessages(202))[0].delivery === "read"; }, "Read acknowledgement did not reach sender");
  assert.equal(directReceiptState((await returningAlice.chat.getMessages(202))[0].delivery), "read", "Only recipient read acknowledgment enables two checks");
  await returningBob.community.readFeed(returningBob.community.feedLatest);
  assert.equal(returningBob.community.feedUnread, 0);
  assert.equal(reopened.get("SELECT count(*) AS n FROM direct_messages").n, 1);
  assert.equal(requests.filter(r => r.path === "/v1/direct/202/messages").length, 1);
  assert.ok(requests.filter(r => r.path === "/v1/events").length <= 4, "Each client lifetime owns one SSE connection");
});
