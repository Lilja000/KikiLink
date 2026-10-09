// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter, BCCharacterOverlayRenderer } from "../src/bc/adapter";
import { CloudClient } from "../src/cloud/client";
import { CloudDirect } from "../src/cloud/direct";
import type { CloudProfile } from "../src/cloud/types";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import { ChatService } from "../src/modules/link-chat/chat-service";
import { LinkChatView } from "../src/modules/link-chat/view";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";

const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const dispose of cleanup.splice(0).reverse()) dispose();
  document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});
const profile = (memberNumber: number, avatarId: string | null = `avatar-${memberNumber}`): CloudProfile => ({
  memberNumber, avatarId, displayName: `Person ${memberNumber}`, bio: "Saved in Cloud", statusMessage: "", bannerId: null,
  avatarFrame: "none", profileStyle: "classic", revision: 1, visible: true, updatedAt: 1,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
async function setup(options: {
  policy?: "always" | "ask" | "never";
  density?: "comfortable" | "compact" | "super-compact";
  response?: (path: string) => Promise<Response | undefined>;
} = {}) {
  vi.stubGlobal("IntersectionObserver", undefined);
  let objectId = 0;
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:avatar-${++objectId}`);
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const previousDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "decode");
  const decode = vi.fn(async () => {});
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: decode });
  cleanup.push(() => {
    if (previousDecode) Object.defineProperty(HTMLImageElement.prototype, "decode", previousDecode);
    else delete (HTMLImageElement.prototype as Partial<HTMLImageElement>).decode;
  });
  const profiles = new Map([101, 202, 303].map(member => [member, profile(member)]));
  const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
    const path = new URL(String(url)).pathname;
    if (path === "/v1/auth/challenges") return Response.json({ challengeId: crypto.randomUUID(), proof: "p".repeat(43), exchange: "e".repeat(43), verifierMember: 909, expiresAt: Date.now() + 180000 });
    if (path === "/v1/auth/exchange") return Response.json({ memberNumber: 101, token: "t".repeat(43), expiresAt: Date.now() + 3600000 });
    const custom = await options.response?.(path); if (custom) return custom;
    if (path === "/v1/me") return Response.json({ features: {} });
    if (path === "/v1/presence") return new Response(null, { status: 204 });
    if (path.startsWith("/v1/profiles/")) return Response.json(profiles.get(Number(path.split("/").at(-1))));
    if (path.startsWith("/v1/media/")) return new Response("pixels", { headers: { "content-type": "image/webp" } });
    return Response.json({ items: [], cursor: 0, nextCursor: null });
  });
  const client = new CloudClient({ origin: "https://cloud.example.test", memberNumber: 101, getMemberNumber: () => 101, isBlocked: () => false, sendProof: vi.fn(), fetchImpl });
  vi.spyOn(client, "startEvents").mockImplementation(() => {});
  await client.connect();
  let renderOverlay: BCCharacterOverlayRenderer | undefined;
  const adapter = {
    getOwnMemberNumber: () => 101, getOwnName: () => "Kiki", getMemberName: (member: number) => `Person ${member}`,
    getMemberNickname: () => undefined, getKnownContacts: () => [], getOnlineFriends: () => [], getRoomCharacters: () => [],
    getCurrentRoomName: () => undefined, getPlayerRelationships: () => [], isInChatRoom: () => false, canSendBeep: () => true,
    isReady: () => true, sendBeep: vi.fn(), getNativeFriendNumbers: () => [],
    registerCharacterOverlay: (render: BCCharacterOverlayRenderer) => {
      renderOverlay = render;
      return () => { renderOverlay = undefined; };
    },
  } as unknown as BCAdapter;
  const storage = new MemoryKeyValueStorage(), settings = new SettingsStore(storage);
  settings.update(s => { s.linkPresence.profileImagePreviews = options.policy ?? "always"; s.ui.density = options.density ?? "comfortable"; });
  const service = new ChatService(new MemoryChatRepository(), settings);
  const view = new LinkChatView(adapter, service, settings, "0.30.0");
  cleanup.push(() => view.destroy()); view.attachCloud(client, storage); view.mount();
  await view.openChat(202, "Person 202");
  const root = document.querySelector("#kikilink-root")!.shadowRoot!;
  const avatar = () => root.querySelector<HTMLElement>(".kl-chat-header > .kl-avatar")!;
  const reads = (path: string) => fetchImpl.mock.calls.filter(([url]) => new URL(String(url)).pathname === path).length;
  return { view, root, avatar, client, profiles, settings, decode, reads, fetchImpl, service,
    renderOverlay: (member: number) => renderOverlay?.({ MemberNumber: member, Name: `Person ${member}` }, 600, 20, 0.5) };
}

it("shows the same Cloud-confirmed flower on the avatar and room character without native presence", async () => {
  const h = await setup({ policy: "ask" });
  await vi.waitFor(() => expect(h.avatar().querySelector(".kl-addon-badge")).not.toBeNull());
  vi.stubGlobal("ChatRoomHideIconState", 0);
  const draw = vi.fn(() => true);
  vi.stubGlobal("DrawImageResize", draw);
  const requests = h.fetchImpl.mock.calls.length;
  h.renderOverlay(202);
  expect(draw).toHaveBeenCalledOnce();
  expect(h.fetchImpl).toHaveBeenCalledTimes(requests);
  h.client.rememberProfile({ ...profile(303), isDefault: true });
  h.renderOverlay(303);
  expect(draw).toHaveBeenCalledOnce();
  await h.client.request("PUT", "/v1/blocks/202", {});
  h.renderOverlay(202);
  expect(draw).toHaveBeenCalledOnce();
});

it.each([
  { quoted: false, switchChat: false, failed: false },
  { quoted: true, switchChat: false, failed: false },
  { quoted: false, switchChat: true, failed: false },
  { quoted: false, switchChat: false, failed: true },
])("separates a submitted Cloud Direct message from the next draft: %j", async ({ quoted, switchChat, failed }) => {
  const h = await setup(), gate = deferred<void>();
  const submitted = (quoted ? "> Reply to Kiki: Earlier message\n" : "") + "First message";
  await h.service.setDraft(202, "Person 202", submitted);
  await h.view.openChat(202, "Person 202");
  vi.spyOn(CloudDirect.prototype, "shouldUse").mockReturnValue(true);
  const send = vi.spyOn(CloudDirect.prototype, "send").mockImplementation(async (peerNumber, peerName, content) => {
    await gate.promise;
    if (failed) throw new Error("Message has not been sent.");
    return h.service.capture({ direction: "outgoing", peerNumber, peerName, content, sentAt: Date.now(), includeRoom: false }, true);
  });
  const composer = h.root.querySelector<HTMLTextAreaElement>(".kl-composer-input")!;
  const button = h.root.querySelector<HTMLButtonElement>(".kl-send")!;
  const enter = () => composer.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true, cancelable: true }));
  enter(); enter();
  expect(send).toHaveBeenCalledOnce();
  expect(composer.value).toBe("");
  composer.value += "Next message"; composer.dispatchEvent(new Event("input", { bubbles: true }));
  if (switchChat) {
    await h.service.setDraft(303, "Person 303", "Other person's draft");
    await h.view.openChat(303, "Person 303");
  }
  gate.resolve();
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  if (failed) {
    expect(composer.value).toBe("Next message");
    expect((await h.service.getConversation(202))?.draft).toBe("Next message");
    expect(h.root.querySelector<HTMLButtonElement>(".kl-failed-send-actions button")?.title).toBe(submitted);
    expect(await h.service.getMessages(202)).toHaveLength(0);
  } else {
    expect((await h.service.getConversation(202))?.draft).toBe("Next message");
    expect(composer.value).toBe(switchChat ? "Other person's draft" : "Next message");
    if (!switchChat) {
      expect(h.root.querySelector<HTMLElement>(".kl-composer-reply")!.hidden).toBe(true);
      enter(); await vi.waitFor(() => expect(button.disabled).toBe(false));
      expect(send.mock.calls.map(call => call[2])).toEqual([submitted, "Next message"]);
    }
  }
});

describe("Cloud portraits in Direct Chat", () => {
  it.each(["comfortable", "compact", "super-compact"] as const)("uses saved avatars without a native URL and keeps the image through refreshes in %s", async density => {
    const h = await setup({ density });
    const input = h.root.querySelector<HTMLTextAreaElement>(".kl-composer-input")!; input.focus(); input.value = "Unsent draft";
    await vi.waitFor(() => expect(h.avatar().dataset.avatarState).toBe("image"));
    const image = h.avatar().querySelector(".kl-social-avatar-media img")!;
    const own = h.root.querySelector<HTMLElement>(".kl-presence-trigger-avatar")!;
    await vi.waitFor(() => expect(own.dataset.avatarState).toBe("image"));
    expect(h.reads("/v1/media/avatar-202")).toBe(1); expect(h.reads("/v1/media/avatar-101")).toBe(1);
    expect(h.root.activeElement).toBe(input);
    await h.view.refresh(); await h.view.refresh();
    expect(h.avatar().querySelector(".kl-social-avatar-media img")).toBe(image);
    expect(input.value).toBe("Unsent draft"); expect(h.root.activeElement).toBe(input);
    h.client.rememberProfile({ ...profile(202), revision: 2, displayName: "Renamed", avatarFrame: "blossom" });
    expect(h.avatar().querySelector(".kl-social-avatar-media img")).toBe(image);
    h.view.close(); await h.view.openChat(202, "Person 202");
    expect(h.avatar().querySelector(".kl-social-avatar-media img")).toBe(image);
    expect(h.reads("/v1/media/avatar-202")).toBe(1);
  });

  it("does not paint a late profile response onto the next selected person", async () => {
    const old = deferred<Response>();
    const h = await setup({ response: path => path === "/v1/profiles/202" ? old.promise : Promise.resolve(undefined) });
    await h.view.openChat(303, "Person 303");
    await vi.waitFor(() => expect(h.avatar().dataset.avatarState).toBe("image"));
    const image = h.avatar().querySelector("img");
    old.resolve(Response.json(profile(202)));
    await vi.waitFor(() => expect(h.client.peekProfile(202)?.avatarId).toBe("avatar-202"));
    expect(h.avatar().dataset.avatarMemberNumber).toBe("303");
    expect(h.avatar().dataset.cloudAvatar).toBe("avatar-303"); expect(h.avatar().querySelector("img")).toBe(image);
  });

  it("retains the decoded photo until its replacement is decoded, then removes an explicitly deleted avatar", async () => {
    const h = await setup();
    await vi.waitFor(() => expect(h.avatar().dataset.avatarState).toBe("image"));
    const old = h.avatar().querySelector(".kl-social-avatar-media")!;
    const decode = deferred<void>(); h.decode.mockImplementation(() => decode.promise);
    h.client.rememberProfile({ ...profile(202, "new-photo"), revision: 2, updatedAt: 2 });
    expect(old.isConnected).toBe(true);
    await vi.waitFor(() => expect(h.reads("/v1/media/new-photo")).toBe(1));
    await h.view.refresh(); expect(old.isConnected).toBe(true);
    decode.resolve();
    await vi.waitFor(() => expect(h.avatar().dataset.avatarState).toBe("image"));
    expect(old.isConnected).toBe(false); expect(h.avatar().dataset.cloudAvatar).toBe("new-photo");
    h.client.rememberProfile({ ...profile(202, null), revision: 3, updatedAt: 3 });
    expect(h.avatar().querySelector(".kl-social-avatar-media")).toBeNull();
    expect(h.avatar().dataset.avatarState).toBe("initials");
  });

  it("recovers a small avatar after a temporary network failure without reopening the profile", async () => {
    vi.useFakeTimers();
    let tries = 0, offline = true;
    const h = await setup({ response: async path => {
      if (path === "/v1/media/avatar-202") { tries++; if (offline) throw new Error("Network offline"); }
      return undefined;
    } });
    await vi.waitFor(() => expect(h.avatar().dataset.avatarState).toBe("error"));
    const failed = tries; offline = false;
    const wrapper = h.avatar().querySelector(".kl-social-avatar-media");
    await vi.advanceTimersByTimeAsync(31000);
    expect(h.avatar().dataset.avatarState).toBe("image");
    expect(h.avatar().querySelector(".kl-social-avatar-media")).toBe(wrapper); expect(tries).toBe(failed + 1);
  });

  it("retrieves a missing profile after reconnect and clears Cloud portraits on logout", async () => {
    let offline = true;
    const h = await setup({ response: async path => path === "/v1/profiles/202" && offline
      ? Response.json({ error: "unavailable" }, { status: 503 }) : undefined });
    await vi.waitFor(() => expect(h.reads("/v1/profiles/202")).toBe(1));
    expect(h.avatar().querySelector(".kl-social-avatar-media")).toBeNull(); offline = false;
    await h.client.connect(false, true);
    await vi.waitFor(() => expect(h.avatar().dataset.avatarState).toBe("image"));
    const source = h.avatar().querySelector<HTMLImageElement>(".kl-social-avatar-media img")!.src;
    await h.client.logout();
    expect(h.avatar().querySelector(".kl-social-avatar-media")).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(source);
  });

  it.each(["ask", "never"] as const)("respects %s for other avatars while keeping the owner's photo", async policy => {
    const h = await setup({ policy });
    await vi.waitFor(() => expect(h.root.querySelector<HTMLElement>(".kl-presence-trigger-avatar")!.dataset.avatarState).toBe("image"));
    expect(h.reads("/v1/media/avatar-202")).toBe(0); expect(h.avatar().querySelector(".kl-social-avatar-media")).toBeNull();
    h.settings.update(s => { s.linkPresence.profileImagePreviews = "always"; }); await h.view.refresh();
    await vi.waitFor(() => expect(h.avatar().dataset.avatarState).toBe("image"));
    h.settings.update(s => { s.linkPresence.profileImagePreviews = policy; }); await h.view.refresh();
    expect(h.avatar().querySelector(".kl-social-avatar-media")).toBeNull();
  });

  it("removes blocked portraits and does not keep an old image when replacement access is denied", async () => {
    const h = await setup({ response: async path => path === "/v1/media/denied" ? Response.json({ error: "not_found" }, { status: 404 }) : undefined });
    await vi.waitFor(() => expect(h.avatar().dataset.avatarState).toBe("image"));
    h.client.rememberProfile({ ...profile(202, "denied"), revision: 2, updatedAt: 2 });
    await vi.waitFor(() => expect(h.avatar().dataset.avatarState).toBe("error"));
    expect(h.avatar().querySelector(".kl-social-avatar-media img")).toBeNull();
    await vi.waitFor(() => expect([...h.root.querySelectorAll<HTMLElement>('[data-cloud-avatar="denied"]')].every(node => node.dataset.avatarState === "error")).toBe(true));
    const deniedReads = h.reads("/v1/media/denied");
    await h.view.refresh(); expect(h.reads("/v1/media/denied")).toBe(deniedReads);
    await h.client.request("PUT", "/v1/blocks/202", {});
    expect(h.avatar().querySelector(".kl-social-avatar-media")).toBeNull();
  });
});

it("lets the Feed tab silence its badge, restore it, and mark server posts read without touching chat counts", async () => {
  let unread = 4;
  const h = await setup({ response: async path => {
    if (path === "/v1/me") return Response.json({ features: { community: true } });
    if (path === "/v1/feed/unread") return Response.json({ unread, latest: 20 });
    if (path === "/v1/mailbox") return Response.json({ items: [], unread: 0, nextCursor: null });
    return undefined;
  } });
  const original = h.client.request.bind(h.client);
  const request = vi.spyOn(h.client, "request").mockImplementation(async (method, path, body, signal) => {
    if (method === "PUT" && path === "/v1/read-cursors/feed") unread = 0;
    return original(method, path, body, signal);
  });
  const tab = h.root.querySelector<HTMLButtonElement>('.kl-nav-item[data-target="cloud"]')!;
  const badge = () => tab.querySelector<HTMLElement>(".kl-roster-count")!;
  await vi.waitFor(() => expect(tab.textContent).toContain("4"));
  const openMenu = () => tab.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
  const action = (label: string) => [...h.root.querySelectorAll<HTMLButtonElement>(".kl-profile-menu-action")].find(b => b.querySelector(".kl-profile-menu-label")?.textContent === label)!;
  openMenu();
  expect([...h.root.querySelectorAll(".kl-profile-menu-label")].map(n => n.textContent)).toEqual(["Mark all as read", "Mute tab", "Hide tab"]);
  action("Mute tab").click();
  [...h.root.querySelectorAll<HTMLButtonElement>(".kl-mute-choice")].at(-1)!.click();
  await vi.waitFor(() => expect(h.settings.get().ui.tabAlerts.feed.mutedUntil).toBe(-1));
  expect(badge().hidden).toBe(true); expect(unread).toBe(4);
  openMenu(); action("Unmute tab").click(); expect(badge().hidden).toBe(false);
  openMenu(); action("Mark all as read").click();
  await vi.waitFor(() => expect(unread).toBe(0));
  await vi.waitFor(() => expect(badge().hidden).toBe(true));
  expect(request).toHaveBeenCalledWith("PUT", "/v1/read-cursors/feed", { cursor: 20 });
  expect(request.mock.calls.some(([method, path]) => method === "POST" && path === "/v1/mailbox/read")).toBe(false);
  expect(h.settings.get().ui.tabAlerts.chat.mutedUntil).toBe(0);
});
