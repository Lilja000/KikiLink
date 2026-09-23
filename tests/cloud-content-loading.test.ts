// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { CloudClient } from "../src/cloud/client";
import { CloudPanel } from "../src/cloud/panel";
import { SocialUI } from "../src/cloud/social-ui";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { CloudProfile } from "../src/cloud/types";

const disposers: Array<() => void> = [];
afterEach(() => { for (const dispose of disposers.splice(0)) dispose(); document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const profile = (memberNumber = 202): CloudProfile => ({ memberNumber, displayName: "Snowy", bio: "Hello", statusMessage: "Around", avatarId: "avatar", bannerId: "banner", avatarFrame: "none", profileStyle: "classic", revision: 1, visible: true, updatedAt: 1 });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
async function setup(handler: (path: string, init?: RequestInit) => Promise<Response>) {
  let now = Date.now(), member = 101;
  const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(url)).pathname;
    if (path === "/v1/auth/challenges") return Response.json({ challengeId: crypto.randomUUID(), proof: "p".repeat(43), exchange: "e".repeat(43), verifierMember: 909, expiresAt: now + 60000 });
    if (path === "/v1/auth/exchange") return Response.json({ memberNumber: 101, token: "t".repeat(43), expiresAt: now + 3600000 });
    return handler(path, init);
  });
  const client = new CloudClient({ origin: "https://cloud.example.test", memberNumber: 101, getMemberNumber: () => member, isBlocked: () => false, sendProof: () => {}, fetchImpl, now: () => now });
  disposers.push(() => client.destroy()); await client.connect();
  return { client, fetchImpl, advance: (time: number) => { now += time; }, switchAccount: () => { member = 303; } };
}
function uiFor(client: CloudClient) {
  const image = vi.fn(() => { const node = document.createElement("div"); node.dataset.state = "loading"; return node; });
  const openProfile = vi.fn();
  const ui = new SocialUI({ client, image, openProfile, isBlocked: () => false, run: async action => { await action(); } });
  disposers.push(() => ui.destroy()); return { ui, image, openProfile };
}

describe("stable Cloud profile rendering", () => {
  it("keeps a visible avatar during a failed replacement and lets that same wrapper recover", async () => {
    const { client } = await setup(async () => Response.json(profile()));
    const { ui, image } = uiFor(client);
    const author = ui.author(profile()); document.body.append(author);
    const avatar = author.querySelector<HTMLElement>(".kl-social-avatar")!;
    const old = avatar.firstElementChild as HTMLElement; old.className = "kl-social-avatar-media"; old.dataset.state = "ready";
    ui.updateAuthor(author, { ...profile(), avatarId: "new" });
    const replacement = image.mock.results.at(-1)!.value as HTMLElement;
    replacement.dataset.state = "error"; replacement.dataset.errorStatus = "0";
    replacement.dispatchEvent(new Event("cloud-image-error"));
    expect(old.parentElement).toBe(avatar); expect(replacement.parentElement).toBe(avatar);
    expect(replacement.style.visibility).toBe("hidden");
    replacement.dataset.state = "ready"; replacement.dispatchEvent(new Event("cloud-image-ready"));
    expect(avatar.firstElementChild).toBe(replacement); expect(replacement.style.visibility).toBe("");
    expect(old.isConnected).toBe(false);
  });

  it("puts the Feed administrator shield beside member 72385's name and retains the avatar on renames", async () => {
    const { client } = await setup(async () => Response.json(profile(72385)));
    const { ui, image } = uiFor(client);
    const admin = ui.author(profile(72385), undefined, undefined, true);
    const shield = admin.querySelector<HTMLElement>(".kl-feed-administrator")!;
    const avatar = admin.querySelector(".kl-social-avatar")!.firstElementChild;
    expect(shield.title).toBe("Administrator");
    expect(shield.previousElementSibling?.classList.contains("kl-social-name")).toBe(true);
    expect(ui.author({ ...profile(202), displayName: "Administrator Kiki" }, undefined, undefined, true).querySelector(".kl-feed-administrator")).toBeNull();
    expect(ui.author(profile(72385)).querySelector(".kl-feed-administrator")).toBeNull();
    const imageCalls = image.mock.calls.length;
    ui.updateAuthor(admin, { ...profile(72385), displayName: "A much longer new nickname" });
    expect(shield.previousElementSibling?.textContent).toBe("A much longer new nickname");
    expect(admin.querySelector(".kl-feed-administrator")).toBe(shield);
    expect(admin.querySelector(".kl-social-avatar")!.firstElementChild).toBe(avatar);
    expect(image).toHaveBeenCalledTimes(imageCalls);
  });
  it("does not let a delayed old session error disconnect a refreshed session", async () => {
    const late = deferred<Response>();
    const { client } = await setup(async path => path === "/v1/late" ? late.promise : Response.json({}));
    const pending = client.request("GET", "/v1/late");
    const rejected = expect(pending).rejects.toMatchObject({ code: "session_changed" });
    await client.logout();
    await client.connect();
    late.resolve(Response.json({ error: "session_expired" }, { status: 401 }));
    await rejected;
    expect(client.connected).toBe(true);
  });
  it("retains a cached avatar while a profile save response body is loading", async () => {
    let finish!: () => void;
    const saved = { ...profile(101), revision: 2, updatedAt: 2, bio: "Changed" };
    const { client } = await setup(async (path, init) => path === "/v1/profiles/me" && init?.method === "PUT"
      ? new Response(new ReadableStream({ start(controller) { finish = () => { controller.enqueue(new TextEncoder().encode(JSON.stringify(saved))); controller.close(); }; } }), { headers: { "content-type": "application/json" } })
      : Response.json(profile(101)));
    await client.profile(101);
    const saving = client.request("PUT", "/v1/profiles/me", {});
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(client.peekProfile(101)?.avatarId).toBe("avatar");
    finish(); await saving;
    expect(client.peekProfile(101)?.bio).toBe("Changed");
  });
  it("does not overwrite a newer profile with an older save response", async () => {
    const late = deferred<Response>();
    const { client } = await setup(async () => late.promise);
    const saving = client.request("PUT", "/v1/profiles/me", {});
    client.rememberProfile({ ...profile(101), revision: 4, updatedAt: 4, bio: "Latest" });
    late.resolve(Response.json({ ...profile(101), revision: 3, updatedAt: 3, bio: "Older" }));
    await saving;
    expect(client.peekProfile(101)?.bio).toBe("Latest");
  });
  it("ignores a 401 from the token used before a background token refresh", async () => {
    const late = deferred<Response>();
    const { client } = await setup(async () => late.promise);
    const pending = client.request("GET", "/v1/late");
    const rejected = expect(pending).rejects.toMatchObject({ code: "session_changed" });
    await client.connect(true, true);
    late.resolve(Response.json({ error: "session_expired" }, { status: 401 }));
    await rejected;
    expect(client.connected).toBe(true);
  });
  it("keeps an unknown member as a skeleton, then reuses its avatar and member-list action during refresh", async () => {
    const first = deferred<Response>(); let next = profile(); let reads = 0;
    const { client } = await setup(async () => ++reads === 1 ? first.promise : Response.json(next));
    const { ui, image, openProfile } = uiFor(client), members = vi.fn();
    const root = ui.member(202, 1, members); document.body.append(root);
    expect(root.querySelector(".kl-social-initials")).toBeNull();
    expect(root.getAttribute("aria-busy")).toBe("true");
    first.resolve(Response.json(profile()));
    await vi.waitFor(() => expect(root.querySelector(".kl-social-name")?.textContent).toBe("Snowy"));
    const avatar = root.querySelector<HTMLButtonElement>(".kl-social-avatar")!, media = avatar.firstChild;
    next = { ...profile(), displayName: "Snowy Updated", avatarFrame: "none", revision: 2 };
    await client.profile(202, true);
    expect(avatar.firstChild).toBe(media); expect(image).toHaveBeenCalledTimes(1);
    expect(root.querySelector(".kl-social-name")?.textContent).toBe("Snowy Updated");
    avatar.click(); expect(members).toHaveBeenCalledTimes(1); expect(openProfile).not.toHaveBeenCalled();
    const reopened = ui.member(202);
    expect(reopened.getAttribute("aria-busy")).toBe("false");
    expect(reopened.querySelector(".kl-social-initials")).toBeNull();
    expect(reopened.querySelector(".kl-social-name")?.textContent).toBe("Snowy Updated");
    await Promise.resolve(); expect(reads).toBe(2);
  });
  it("uses initials immediately for a known default and hides cached authors after a Cloud block", async () => {
    const { client } = await setup(async path => path.startsWith("/v1/blocks/") ? Response.json({}) : Response.json({ ...profile(), avatarId: null, bannerId: null, isDefault: true }));
    await client.profile(202);
    const { ui, image } = uiFor(client), root = ui.member(202); document.body.append(root);
    expect(root.querySelector(".kl-social-initials")?.textContent).toBe("S"); expect(image).not.toHaveBeenCalled();
    await client.request("PUT", "/v1/blocks/202", {});
    expect(root.hidden).toBe(true); expect(client.peekProfile(202)).toBeUndefined();
    await expect(client.profile(202)).rejects.toMatchObject({ code: "blocked" });
  });
  it("returns a stale snapshot immediately, deduplicates quiet refresh, and expires it after five minutes", async () => {
    let reply = Promise.resolve(Response.json(profile()));
    const { client, advance, fetchImpl } = await setup(async () => reply);
    await client.profile(202); advance(61000);
    const pending = deferred<Response>(); reply = pending.promise;
    const reads = [client.profile(202), client.profile(202)];
    expect(await Promise.all(reads)).toEqual([profile(), profile()]);
    expect(fetchImpl.mock.calls.filter(([url]) => String(url).includes("/v1/profiles/"))).toHaveLength(2);
    pending.resolve(Response.json({ ...profile(), displayName: "Refreshed", revision: 2 }));
    await vi.waitFor(() => expect(client.peekProfile(202)?.displayName).toBe("Refreshed"));
    advance(61000); reply = Promise.resolve(Response.json({ error: "unavailable" }, { status: 503 }));
    await expect(client.profile(202, true)).rejects.toMatchObject({ status: 503 });
    const count = fetchImpl.mock.calls.length;
    expect((await client.profile(202)).displayName).toBe("Refreshed"); expect(fetchImpl).toHaveBeenCalledTimes(count);
    advance(300000); expect(client.peekProfile(202)).toBeUndefined();
  });
  it("evicts denied profiles and isolates cached media across blocking, logout and account changes", async () => {
    let denied = false;
    const { client, fetchImpl, switchAccount } = await setup(async path => {
      if (path.startsWith("/v1/media/")) return new Response("pixels", { headers: { "content-type": "image/webp" } });
      if (path.startsWith("/v1/profiles/")) return denied ? Response.json({ error: "not_found" }, { status: 404 }) : Response.json(profile());
      return Response.json({});
    });
    await client.profile(202); await client.media("avatar"); await client.media("avatar");
    expect(fetchImpl.mock.calls.filter(([url]) => String(url).includes("/v1/media/"))).toHaveLength(1);
    denied = true; await expect(client.profile(202, true)).rejects.toMatchObject({ status: 404 }); expect(client.peekProfile(202)).toBeUndefined();
    await client.request("PUT", "/v1/blocks/202", {}); await client.media("another");
    expect(fetchImpl.mock.calls.filter(([url]) => String(url).includes("/v1/media/"))).toHaveLength(2);
    await client.logout(); await expect(client.media("another")).rejects.toMatchObject({ code: "not_connected" });
    switchAccount(); expect(client.peekProfile(202)).toBeUndefined();
  });
  it("bounds profile and image memory without fetching every profile at startup", async () => {
    const { client, fetchImpl } = await setup(async path => path.startsWith("/v1/media/") ? new Response("pixels", { headers: { "content-type": "image/webp" } }) : Response.json({}));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    for (let member = 200; member < 301; member++) client.rememberProfile(profile(member));
    expect(client.peekProfile(200)).toBeUndefined(); expect(client.peekProfile(300)?.memberNumber).toBe(300);
    for (let id = 0; id < 81; id++) await client.media(`image-${id}`);
    const before = fetchImpl.mock.calls.length;
    await client.media("image-80"); expect(fetchImpl).toHaveBeenCalledTimes(before);
    await client.media("image-0"); expect(fetchImpl).toHaveBeenCalledTimes(before + 1);
  });
});

describe("shared decoded image previews", () => {
  it("holds a stable placeholder until decode and paints reopened avatars synchronously from the same URL", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const decoded = deferred<void>(), decode = vi.fn(() => decoded.promise);
    const previous = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "decode");
    Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: decode });
    disposers.push(() => { if (previous) Object.defineProperty(HTMLImageElement.prototype, "decode", previous); else delete (HTMLImageElement.prototype as Partial<HTMLImageElement>).decode; });
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:shared-avatar"), revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const { client, fetchImpl } = await setup(async path => path.startsWith("/v1/media/") ? new Response("pixels", { headers: { "content-type": "image/webp" } }) : Response.json({}));
    const storage = new MemoryKeyValueStorage(), settings = new SettingsStore(storage);
    settings.update(s => { s.linkPresence.profileImagePreviews = "always"; });
    const panel = new CloudPanel(client, { storage, settings: () => settings.get(), ownName: () => "Kiki", legacyGroups: () => [], isBlocked: () => false, openProfile: () => {} });
    disposers.push(() => panel.destroy()); document.body.append(panel.element);
    const one = panel.profileImage("same", "avatar"), two = panel.profileImage("same", "avatar"); document.body.append(one, two);
    await vi.waitFor(() => expect(decode).toHaveBeenCalledTimes(1));
    expect(one.dataset.state).toBe("loading"); expect(one.querySelector("img")).toBeNull();
    decoded.resolve(); await vi.waitFor(() => expect(two.dataset.state).toBe("ready"));
    const reopened = panel.profileImage("same", "avatar"); document.body.append(reopened);
    expect(reopened.dataset.state).toBe("ready"); expect(reopened.querySelector("img")?.src).toBe("blob:shared-avatar");
    expect(create).toHaveBeenCalledTimes(1); expect(fetchImpl.mock.calls.filter(([url]) => String(url).includes("/v1/media/"))).toHaveLength(1);
    await client.logout(); expect(revoke).toHaveBeenCalledWith("blob:shared-avatar");
    settings.update(s => { s.linkPresence.profileImagePreviews = "never"; });
    expect(panel.profileImage("same", "avatar").dataset.state).toBe("hidden");
  });
});
