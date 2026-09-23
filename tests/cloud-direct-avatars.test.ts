// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { CloudClient } from "../src/cloud/client";
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
  const adapter = {
    getOwnMemberNumber: () => 101, getOwnName: () => "Kiki", getMemberName: (member: number) => `Person ${member}`,
    getMemberNickname: () => undefined, getKnownContacts: () => [], getOnlineFriends: () => [], getRoomCharacters: () => [],
    getCurrentRoomName: () => undefined, getPlayerRelationships: () => [], isInChatRoom: () => false, canSendBeep: () => true,
    isReady: () => true, sendBeep: vi.fn(), getNativeFriendNumbers: () => [],
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
  return { view, root, avatar, client, profiles, settings, decode, reads, fetchImpl };
}

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
