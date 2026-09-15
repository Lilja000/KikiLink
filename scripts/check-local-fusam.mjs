import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { Window } from "happy-dom";

// DOM integration, not a substitute for rendering/real-BC validation in a browser.
const root = resolve(import.meta.dirname, "..");
const realNow = Date.now.bind(Date);
const fusamRoot = process.env.KIKILINK_FUSAM_SOURCE;
if (!fusamRoot) throw new Error("Set KIKILINK_FUSAM_SOURCE to an unmodified FUSAM checkout");
const cloud = process.argv.includes("--cloud");
const bundle = await readFile(resolve(root, cloud ? ".local-dev/cloud/KikiLink.fusam.js" : ".local-dev/dist/KikiLink.fusam.js"), "utf8");
const mixed = process.argv.includes("--mixed");
const releaseRef = process.env.KIKILINK_RELEASE_REF || "refs/tags/v0.29.0";
const peerBundle = mixed ? execFileSync("git", ["show", `${releaseRef}:dist/KikiLink.fusam.js`], {
  cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
}) : bundle;
const manifest = await readFile(resolve(fusamRoot, "manifest.json"), "utf8");
const fusamEntry = await build({
  stdin: { contents: `import { updateManifest, getAddon } from ${JSON.stringify(resolve(fusamRoot, "manifest.js"))};
    window.loadLocalAddon = async () => { await updateManifest(); const addon = getAddon("localdev");
      if (!addon || addon.name !== "Local Development") throw new Error("Missing actual FUSAM localdev entry");
      await addon.load(addon.versions[0]); return addon.name; };`, resolveDir: root },
  bundle: true, write: false, format: "iife", platform: "browser", logLevel: "silent",
});
let checkPassed = false;
process.on("exit", () => {
  if (!checkPassed) { process.stderr.write("FUSAM check exited without reaching all assertions.\n"); process.exitCode = 1; }
});
const people = [{ id: 910001, name: "Kiki", room: "" }, { id: 910002, name: "Reina", room: "Moon Garden" }, { id: 910003, name: "Mina", room: "Lounge" }];
const cloudDisposers = [], cloudProofs = [];
let cloudFixture, nativeCloud;
if (cloud) {
  const [{fixture},{attachCloudVerifier},{EventEmitter}] = await Promise.all([
    import("../cloud/test/helpers.mjs"), import("../cloud/verifier/bc-adapter.mjs"), import("node:events")]);
  cloudFixture = await fixture({after:fn => cloudDisposers.push(fn)}, {
    origin:"https://cloud-staging.example.invalid", testMembers:new Set(people.map(p => p.id)), moderators:new Set(),
  });
  nativeCloud = new EventEmitter();
  nativeCloud.connected = true;
  cloudDisposers.push(attachCloudVerifier(nativeCloud, {
    expectedVerifierMember:909,allowedMembers:cloudFixture.config.testMembers,getAuthenticatedMemberNumber:() => 909,
    endpoint:"http://127.0.0.1:8792/verify",secret:cloudFixture.config.verifierSecret,
    fetchImpl:async (_url,init) => {
      const r = await cloudFixture.verifier.inject({method:"POST",url:"/verify",headers:init.headers,payload:init.body});
      return new Response(r.body,{status:r.statusCode});
    },
  }));
}
const clients = new Map(); const network = []; const errors = []; let ownerOnline = true;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
async function until(predicate, message) {
  const deadline = realNow() + 5_000;
  while (!predicate()) { if (realNow() > deadline) throw new Error(`${message}\n${errors.join('\n')}`); await sleep(20); }
}
const shadow = (id) => clients.get(id).document.querySelector("#kikilink-root")?.shadowRoot;
const click = (id, selector) => { const target = shadow(id)?.querySelector(selector); assert.ok(target, selector); target.click(); };
const friendIds = (id) => id === 910001 ? [910002, 910003] : [910001];
function friends(win, id) {
  win.ServerAccountQueryResult({ Query: "OnlineFriends", Result: people.filter((p) => friendIds(id).includes(p.id) && (ownerOnline || p.id !== 910001)).map((p) => ({ Type: "Friend", MemberNumber: p.id, MemberName: p.name, ChatRoomName: p.room, ChatRoomSpace: "MainHall", Private: false })) });
}

try {
  for (const person of people) {
    const clientBundle = person.id === 910001 ? bundle : peerBundle;
    const win = new Window({ url: `http://localhost:3001/kikilink-client.html?fusam=http://localhost:3001/KikiLink.fusam.js&fusamType=script`, settings: { enableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true } });
    clients.set(person.id, win);
    win.structuredClone = structuredClone;
    // Happy DOM's immediate animation frames can spin continuously unlike a real 60 Hz browser.
    win.requestAnimationFrame = (callback) => win.setTimeout(() => callback(win.performance.now()), 16);
    win.cancelAnimationFrame = (id) => win.clearTimeout(id);
    win.console.error = (...args) => errors.push(args.map(String).join(" "));
    win.console.warn = () => {}; win.console.info = () => {}; win.console.log = () => {};
    const appendScript = win.document.head.appendChild.bind(win.document.head);
    win.document.head.appendChild = (node) => {
      if (node.tagName === "SCRIPT" && node.src?.startsWith("http://localhost:3001/KikiLink.fusam.js?")) {
        assert.equal(node.type, "text/javascript"); assert.equal(node.crossOrigin, "anonymous");
        network.push({ from: person.id, url: node.src });
        // Emulate a script resource in this Window's realm; no real socket or user data is used.
        setImmediate(() => { win.eval(clientBundle); node.dispatchEvent(new win.Event("load")); });
        return node;
      }
      return appendScript(node);
    };
    win.eval(`window.Player = { MemberNumber: ${person.id}, Name: ${JSON.stringify(person.name)}, Nickname: ${JSON.stringify(person.name)}, FriendList: ${JSON.stringify(friendIds(person.id))}, FriendNames: new Map(${JSON.stringify(people.filter((p) => friendIds(person.id).includes(p.id)).map((p) => [p.id, p.name]))}), ExtensionSettings: {}, BlackList: [], GhostList: [] };
      window.CurrentScreen = ${JSON.stringify(person.room ? "ChatRoom" : "ChatSearch")};
      window.ChatRoomData = ${JSON.stringify(person.room ? { Name: person.room, Space: "MainHall", Visibility: ["All"] } : null)};
      window.ChatRoomCharacter = ${person.room ? "[Player]" : "[]"}; window.ChatRoomCharacterDrawlist = ChatRoomCharacter;
      window.ServerPlayerIsInChatRoom = () => ${Boolean(person.room)}; window.ServerIsLoggedIn = () => true;
      window.ServerPlayerExtensionSettingsSync = () => {}; window.ServerAccountBeep = () => {};
      window.ServerAccountQueryResult = () => {}; window.ChatRoomMessage = () => {}; window.ServerSendBeepMessage = () => {};
      window.FriendListBeepLog = []; window.ActivityFemale3DCG = []; window.AssetGroup = []; window.GameVersion = "R131";
      window.GameReadyState = { load: new Promise(() => {}) }; window.CommonIsObject = v => !!v && typeof v === "object" && !Array.isArray(v);`);
    win.fetch = async (input, init={}) => {
      const url = String(input); network.push({ from: person.id, url });
      if (url.startsWith("http://localhost:3001/manifest.json?")) return new win.Response(manifest);
      if (url.startsWith("http://localhost:3001/KikiLink.fusam.js?")) return new win.Response(clientBundle);
      if (cloudFixture && url.startsWith(cloudFixture.config.origin+"/v1/")) {
        const r = await cloudFixture.app.inject({method:init.method ?? "GET",url:new URL(url).pathname,
          headers:{origin:cloudFixture.origin,...init.headers},...(init.body ? {payload:init.body}:{})});
        return new win.Response(r.statusCode === 204 ? null : r.body,{status:r.statusCode,headers:r.headers});
      }
      throw new Error(`Unexpected network request: ${url}`);
    };
    win.ServerRoomSearch = async () => ({ value: people.filter((p) => p.room).map((p) => ({
      Name: p.room, MemberCount: 1, MemberLimit: 10, CanJoin: true, Language: "EN",
      Visibility: ["All"], Access: ["All"],
      Friends: friendIds(person.id).includes(p.id) ? [{ MemberNumber: p.id, MemberName: p.name }] : [],
    })) });
    win.ServerSend = (event, data) => {
      if (network.length > 1_000) throw new Error("Unbounded synthetic protocol traffic");
      if (event === "AccountQuery" && data.Query === "OnlineFriends") { queueMicrotask(() => friends(win, person.id)); return; }
      if (event !== "AccountBeep") return;
      const target = Number(data.MemberNumber);
      if (nativeCloud && target === 909) {
        assert.equal(data.BeepType,"KikiLink");
        assert.equal(data.IsSecret,true);
        assert.equal(data.ChatRoomName,undefined);
        cloudProofs.push({sender:person.id,screen:win.CurrentScreen});
        queueMicrotask(() => nativeCloud.emit("AccountBeep",{...data,MemberNumber:person.id,MemberName:person.name}));
        return;
      }
      if (!ownerOnline && (target === 910001 || person.id === 910001)) return;
      assert.ok(friendIds(person.id).includes(target), "Must not send a non-friend direct Beep");
      network.push({ from: person.id, to: target, message: data.Message });
      queueMicrotask(() => clients.get(target)?.ServerAccountBeep({ ...data, MemberNumber: person.id, MemberName: person.name }));
    };
    win.eval(fusamEntry.outputFiles[0].text);
  }
  const loaded = await Promise.all([...clients.values()].map((win) => win.loadLocalAddon()));
  assert.deepEqual(loaded, people.map(() => "Local Development"));
  console.log("FUSAM loaded the development entry on all three accounts.");
  await until(() => people.every((p) => shadow(p.id)), "Built KikiLink did not mount on every client");
  console.log("KikiLink mounted on all three accounts.");
  for (const person of people) {
    const expectedCloud = cloud && (!mixed || person.id === 910001);
    assert.equal(Boolean(shadow(person.id).querySelector('[data-target="cloud"]')), expectedCloud, "Cloud navigation must match the explicitly selected development build");
  }
  const owner = clients.get(910001);
  await owner.KikiLink.open();
  click(910001, '[data-target="room"]');
  await until(() => shadow(910001).querySelectorAll('.kl-lobby-list .kl-lobby-card').length === 2, "Room directory did not open through FUSAM");
  assert.equal(shadow(910001).querySelector('.kl-room-current-panel').hidden, true);
  click(910001, '[data-room-name="Moon Garden"] .kl-room-people-button');
  assert.equal(shadow(910001).querySelector('.kl-roster-entry-name').textContent, 'Reina');
  assert.equal(shadow(910001).querySelector('.kl-roster-detail').hidden, true);
  assert.equal(shadow(910001).querySelectorAll('.kl-roster-entry').length, 1);
  click(910001, '.kl-roster-page .kl-social-back');
  click(910001, '[data-target="roster"]');
  click(910001, '[data-scope="friends"]');
  await until(() => shadow(910001).querySelectorAll('.kl-roster-entry .kl-addon-badge').length === 2, "Remote friend flower badges did not appear in Players");
  assert.equal(shadow(910001).querySelectorAll('.kl-roster-entry').length, 2);
  const playerQuery = shadow(910001).querySelector('.kl-roster-search');
  playerQuery.value = 'Reina'; playerQuery.dispatchEvent(new owner.Event('input', { bubbles: true }));
  owner.KikiLink.close(); await owner.KikiLink.open();
  assert.equal(shadow(910001).querySelector('.kl-panel').dataset.workspace, 'roster');
  assert.equal(playerQuery.value, 'Reina');
  assert.equal(shadow(910001).querySelectorAll('.kl-roster-entry').length, 1);
  console.log("Rooms, remote Players, flower badges, cross-navigation, and session restoration passed through FUSAM.");
  click(910001, '[data-target="chat"]');
  console.log("Creator opened Chat.");
  click(910001, '.kl-toolbar-group-button');
  await until(() => shadow(910001).querySelectorAll('.kl-group-contact:not(:disabled)').length === 2, "Cross-room friends were not discovered");
  console.log("Both cross-room friends were discovered.");
  click(910001, '[data-member-number="910002"].kl-group-contact'); click(910001, '[data-member-number="910003"].kl-group-contact');
  click(910001, '[data-review="true"]'); click(910001, '[data-confirm-create="true"]');
  await until(() => people.every((p) => shadow(p.id).querySelector('.kl-group-conversation')), "Group invitation did not reach all accounts");
  console.log("Group invitations reached all accounts.");
  const groupId = shadow(910001).querySelector('.kl-group-conversation').dataset.groupId;
  for (const id of [910002, 910003]) { await clients.get(id).KikiLink.open(); click(id, '[data-target="chat"]'); click(id, `.kl-group-conversation[data-group-id="${groupId}"]`); }
  await until(() => [910002, 910003].every((id) => shadow(id).querySelector('.kl-group-pane')?.hidden === false), "Group not active");
  console.log("All group panes activated.");
  function send(id, text) {
    const composer = shadow(id).querySelector('.kl-group-composer'); assert.ok(composer, "Group composer");
    composer.value = text; composer.dispatchEvent(new (clients.get(id).Event)('input', { bubbles: true }));
    const button = shadow(id).querySelector('.kl-group-send'); assert.ok(button, "Send button"); button.click();
  }
  send(910002, 'Hello Mina from another room');
  await until(() => shadow(910003).textContent.includes('Hello Mina from another room'), "Creator did not relay Reina to Mina");
  send(910003, 'Hello Reina from the Lounge');
  await until(() => shadow(910002).textContent.includes('Hello Reina from the Lounge'), "Creator did not relay Mina to Reina");
  if (!mixed) {
    await clients.get(910002).KikiLink.openChat(910001, 'Kiki');
    await until(() => shadow(910002).querySelector('.kl-chat-room')?.textContent.includes('Lobby'), "Lobby label missing after opening the creator's profile");
    assert.ok(shadow(910002).querySelector('.kl-chat-room').textContent.includes('Lobby'));
    const badge = shadow(910002).querySelector('.kl-chat-header .kl-avatar .kl-addon-badge');
    assert.ok(badge, 'Confirmed creator must have an addon badge');
    const blossomUrl = badge.querySelector('img')?.src ?? '';
    assert.match(blossomUrl, /^data:image\/png;base64,/, 'Badge must use the bundled transparent PNG');
    const blossomPng = Buffer.from(blossomUrl.split(',')[1], 'base64');
    assert.equal(blossomPng.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Valid PNG signature');
    assert.equal(blossomPng[25], 6, 'PNG must retain its RGBA transparency channel');
    click(910002, `.kl-group-conversation[data-group-id="${groupId}"]`);
    ownerOnline = false; for (const person of people) friends(clients.get(person.id), person.id);
    send(910002, 'Keep this draft while Kiki is offline');
    await until(() => shadow(910002).textContent.includes('Message not sent'), "Offline creator was reported as a successful handoff");
    assert.equal(shadow(910002).querySelector('.kl-group-composer').value, 'Keep this draft while Kiki is offline');
  }
  assert.equal(network.some((item) => item.url?.includes('github')), false, "FUSAM must never query GitHub updates");
  if (cloud) {
    const count = mixed ? 1 : people.length;
    await until(() => cloudFixture.db.get("SELECT COUNT(*) AS n FROM sessions").n === count,"Automatic Cloud enrollment did not finish");
    assert.equal(cloudProofs.length,count,"Concurrent startup events must not duplicate the native proof");
    assert.equal(cloudProofs.find(p => p.sender === 910001)?.screen,"ChatSearch","Lobby verification must not wait for a room");
  } else assert.equal(network.some((item) => item.url?.includes('cloud-staging.example.invalid')),false,"Ordinary builds must never contact Cloud");
  assert.equal(errors.length, 0, errors.join('\n'));
  checkPassed = true;
  console.log(JSON.stringify({ passed: true, loader: "unmodified FUSAM Local Development (script mode)", artifact: "KikiLink.fusam.js", clients: 3, peerBuild: mixed ? releaseRef : "local development", creatorLocation: "Lobby", nonMutualFriends: true, bidirectionalRelay: true, roomsPlayersNavigation: true, sessionRestoration: true, offlineDraftPreserved: mixed ? "not checked on old peers" : true, lobbyLabel: mixed ? "not checked on old peers" : true, avatarBadge: mixed ? "not checked on old peers" : true, githubUpdateRequests: 0, transport: "synthetic BC in isolated DOM realms", visualBrowserCheck: "not performed by this DOM check" }, null, 2));
} catch (error) {
  console.error(error);
  console.error(errors.join('\n'));
  console.error(JSON.stringify(network.slice(-24).map((packet) => ({ ...packet, message: packet.message?.slice(0, 180) })), null, 2));
  for (const p of people) console.error(p.name, shadow(p.id)?.querySelector('.kl-group-contact-list')?.textContent);
  process.exitCode = 1;
} finally {
  for (const win of clients.values()) {
    await Promise.race([win.KikiLink?.destroy(), sleep(1_000)]);
    await win.happyDOM.abort();
    await win.happyDOM.close();
  }
  for (const dispose of cloudDisposers.reverse()) await dispose();
}
