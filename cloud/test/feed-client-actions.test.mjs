import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import sharp from "sharp";
import { fixture } from "./helpers.mjs";

// Actual UI and CloudClient against disposable HTTP/SQLite, including the
// pointer/focus sequence that previously hid menu actions before their click.
test("Feed touch actions save and delete through CloudClient/HTTP without losing images or comments", { timeout: 15000 }, async t => {
  const f = await fixture(t);
  const win = new Window({ url: `${f.origin}/R132/` });
  let client, ui, view;
  const globals = ["window", "document", "location", "Node", "HTMLElement", "HTMLImageElement", "HTMLInputElement", "HTMLSelectElement", "HTMLTextAreaElement", "HTMLButtonElement", "HTMLDialogElement", "ShadowRoot", "Event", "PointerEvent"];
  const previous = globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  for (const key of globals) Object.defineProperty(globalThis, key, { value: key === "window" ? win : win[key], configurable: true, writable: true });
  t.after(async () => {
    view?.destroy(); ui?.destroy(); client?.destroy();
    await win.happyDOM.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  });
  const bundle = join(f.dir, "feed-ui.mjs");
  await build({ stdin: { contents: `export {CloudClient} from './src/cloud/client.ts'; export {SocialUI} from './src/cloud/social-ui.ts'; export {CloudFeedView} from './src/cloud/feed-view.ts';`, resolveDir: resolve(import.meta.dirname, "../..") }, bundle: true, platform: "node", format: "esm", outfile: bundle, logLevel: "silent" });
  const { CloudClient, SocialUI, CloudFeedView } = await import(pathToFileURL(bundle));
  const endpoint = await f.app.listen({ port: 0, host: "127.0.0.1" });
  let proof = Promise.resolve();
  const requests = [], errors = [];
  client = new CloudClient({ origin: `${f.config.origin}/kikilink-test`, memberNumber: 101, getMemberNumber: () => 101,
    isBlocked: () => false, verificationDelays: [0, 15, 30],
    deviceStore: { load: async () => undefined, save: async () => {}, pause: async () => {} },
    sendProof: (_target, wire) => { const data = JSON.parse(wire); proof = f.verify({ challengeId: data.challengeId, proof: data.proof, sender: 101 }).then(r => assert.equal(r.statusCode, 200, r.body)); },
    fetchImpl: async (input, init = {}) => {
      const url = new URL(String(input)); assert.ok(url.pathname.startsWith("/kikilink-test/"));
      if (url.pathname.endsWith("/auth/exchange")) await proof;
      const path = url.pathname.slice("/kikilink-test".length);
      requests.push({ path, method: init.method });
      const headers = new Headers(init.headers); headers.set("origin", f.origin);
      return fetch(`${endpoint}${path}${url.search}`, { ...init, headers });
    } });
  await client.connect();
  const bytes = await sharp({ create: { width: 40, height: 40, channels: 3, background: "#aa2244" } }).png().toBuffer();
  const media = await client.request("POST", "/v1/media/feed", new Blob([bytes], { type: "image/png" }));
  const own = await client.request("POST", "/v1/feed", { text: "Before edit", mediaIds: [media.id], clientId: crypto.randomUUID() });
  await client.request("POST", `/v1/feed/${own.id}/comments`, { text: "Keep this comment" });
  ui = new SocialUI({ client, openProfile: () => {}, isBlocked: () => false,
    image: (id, alt) => { const node = document.createElement("span"); node.dataset.assetId = id; node.setAttribute("aria-label", alt); return node; },
    run: async (action, button) => { if (button) button.disabled = true; try { await action(); } catch (e) { errors.push(e); } finally { if (button) button.disabled = false; } },
  });
  view = new CloudFeedView(ui, { openOwnProfile: () => {}, openGroups: () => {}, report: () => {} });
  const host = document.createElement("div"), shadow = host.attachShadow({ mode: "open" });
  document.body.append(host); shadow.append(view.element);
  await view.render((await client.request("GET", "/v1/me")).features);
  const button = (root, label) => {
    const found = [...root.querySelectorAll("button")].find(node => node.getAttribute("aria-label") === label || node.textContent === label);
    assert.ok(found, `Missing ${label}`); return found;
  };
  const until = async (check, label) => {
    for (let i = 0; i < 100; i++) { if (await check()) return; await new Promise(r => setTimeout(r, 10)); }
    assert.fail(`${label}: ${shadow.textContent}`);
  };
  const card = view.element.querySelector(`[data-post-id="${own.id}"]`);
  const picture = card.querySelector('[aria-label="Feed image"]');
  button(card, "Comments · 1").click();
  await until(() => card.querySelector(".kl-social-comment"), "Comment did not load");
  const comments = card.querySelector(".kl-cloud-comments");
  const touchAction = async label => {
    const action = button(card, label), menu = action.closest("details"), summary = menu.querySelector("summary");
    summary.focus(); menu.open = true;
    action.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true, pointerType: "touch" }));
    summary.blur(); await Promise.resolve(); assert.equal(menu.open, true, "Menu closed before the touch click");
    action.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, composed: true, pointerType: "touch" }));
    action.click();
    const dialog = shadow.querySelector(".kl-feed-action-dialog");
    assert.equal(dialog.open, true); assert.equal(menu.open, false); return dialog;
  };
  for (let revision = 2; revision <= 3; revision++) {
    const dialog = await touchAction("Edit post"), text = `Saved revision ${revision}`;
    const field = dialog.querySelector("textarea"); field.value = text; field.dispatchEvent(new Event("input"));
    button(dialog, "Save changes").click();
    await until(() => !dialog.open, "Save did not complete");
    const saved = await client.request("GET", `/v1/feed/${own.id}`);
    assert.equal(saved.text, text); assert.equal(saved.revision, revision); assert.deepEqual(saved.mediaIds, [media.id]);
    assert.equal(card.querySelector(".kl-feed-post-text").textContent, text);
    assert.equal(card.querySelector('[aria-label="Feed image"]'), picture);
    assert.equal(card.querySelector(".kl-cloud-comments"), comments);
  }
  assert.equal((await client.media(media.id)).type, "image/webp");
  const cancelled = await touchAction("Delete post"); button(cancelled, "Cancel").click();
  assert.equal((await client.request("GET", `/v1/feed/${own.id}`)).revision, 3);
  const confirm = await touchAction("Delete post"); button(confirm, "Delete post").click();
  await until(() => !confirm.open, "Delete did not complete");
  assert.equal(card.isConnected, false);
  await assert.rejects(client.request("GET", `/v1/feed/${own.id}`), e => e.status === 404);
  await view.render(); assert.equal(view.element.querySelector(".kl-feed-post"), null, "Deleted post returned after reload");
  assert.equal(requests.filter(r => r.path === `/v1/feed/${own.id}` && r.method === "PATCH").length, 2);
  assert.equal(requests.filter(r => r.path === `/v1/feed/${own.id}` && r.method === "DELETE").length, 1, "Cancelled deletion must not send DELETE");
  assert.deepEqual(errors, []);
});
