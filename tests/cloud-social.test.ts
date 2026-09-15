// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { CloudClient, CloudError } from "../src/cloud/client";
import { CloudFeedView } from "../src/cloud/feed-view";
import { CloudGroupThread } from "../src/cloud/group-thread";
import { CloudProfileEditor, type ProfileEditorFields } from "../src/cloud/profile-editor";
import { SocialUI } from "../src/cloud/social-ui";
import type { CloudGroup, CloudMessage, CloudPost, CloudProfile } from "../src/cloud/types";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";

const dispose: Array<() => void> = [];
afterEach(() => { for (const close of dispose.splice(0)) close(); document.body.replaceChildren(); vi.restoreAllMocks(); });
const profile = (memberNumber = 101): CloudProfile => ({ memberNumber, displayName: `Person ${memberNumber}`, bio: "About me", avatarId: null, bannerId: null, avatarFrame: "none", profileStyle: "classic", revision: 1, visible: true, updatedAt: Date.now() });
const post = (id: number, text = `Post ${id}`): CloudPost => ({ id, text, author: 202, profile: profile(202), revision: 1, mediaIds: [], createdAt: Date.now(), updatedAt: 0, reactions: { counts: [], mine: null }, commentCount: 0 });
function button(root: ParentNode, label: string) {
  const b = [...root.querySelectorAll<HTMLButtonElement>("button")].find(node => node.getAttribute("aria-label") === label || node.textContent === label);
  if (!b) throw new Error(`Missing button ${label}`); return b;
}
function setup(handler: (method: string, path: string, body: unknown) => Promise<unknown>) {
  let connected = true;
  const listeners = new Set<(kind: string) => void>();
  const request = vi.fn(handler), errors: unknown[] = [], openProfile = vi.fn();
  const client = { memberNumber: 101, get connected() { return connected; }, request,
    profile: vi.fn(async (member: number) => profile(member)), media: vi.fn(async () => new Blob(["image"], { type: "image/webp" })),
    subscribe: (fn: (kind: string) => void) => { listeners.add(fn); return () => listeners.delete(fn); } } as unknown as CloudClient;
  const ui = new SocialUI({ client, openProfile, isBlocked: member => member === 303,
    image: (_id, alt) => { const node = document.createElement("span"); node.setAttribute("aria-label", alt); return node; },
    run: async action => { try { await action(); } catch (error) { errors.push(error); } },
  });
  return { client, ui, request, errors, openProfile, disconnect: () => { connected = false; for (const fn of listeners) fn("session"); } };
}
function feed(ui: SocialUI) {
  const view = new CloudFeedView(ui, { openOwnProfile: vi.fn(), openGroups: vi.fn(), report: vi.fn() });
  document.body.append(view.element); dispose.push(() => view.clear()); return view;
}
function fields(): ProfileEditorFields {
  const select = (values: string[]) => { const node = document.createElement("select"); for (const value of values) { const option = document.createElement("option"); option.value = value; option.textContent = value; node.append(option); } return node; };
  const f: ProfileEditorFields = { bio: document.createElement("textarea"), avatarUrl: document.createElement("input"), bannerUrl: document.createElement("input"),
    avatarPreview: document.createElement("div"), bannerPreview: document.createElement("div"), frame: select(["none", "gold"]), style: select(["classic", "garden"]),
    outlineEnabled: document.createElement("input"), outlineColor: document.createElement("input"), gradientEnabled: document.createElement("input"),
    gradientPrimary: document.createElement("input"), gradientSecondary: document.createElement("input"), save: document.createElement("button") };
  document.body.append(...Object.values(f)); return f;
}
describe("bounded social feed", () => {
  it("uses a separate reaction icon and derives circle discussions without any extra API request", async () => {
    const { ui, request } = setup(async () => ({ items: [post(3, "Known person's discussion"), { ...post(2), author: 404, profile: profile(404) }], nextCursor: null }));
    const view = new CloudFeedView(ui, { openOwnProfile: vi.fn(), openGroups: vi.fn(), report: vi.fn(), relatedMembers: () => new Set([202]) });
    document.body.append(view.element); dispose.push(() => view.clear());
    await view.render();
    expect(request).toHaveBeenCalledTimes(1);
    expect(view.element.querySelectorAll(".kl-circle-post")).toHaveLength(1);
    expect(view.element.querySelector(".kl-feed-discussions")!.textContent).toContain("Known person's discussion");
    expect(view.element.querySelector(".kl-reaction-picker summary svg")).not.toBeNull();
    expect(view.element.querySelector(".kl-reaction-picker summary")!.textContent).not.toContain("♡");
  });
  it("loads 20 initially, advances only on demand and uses a fresh search cursor", async () => {
    const { ui, request, openProfile } = setup(async (_method, path) => {
      const query = new URL(path, "https://example.test").searchParams;
      return query.has("q") ? { items: [post(49, "Ｃａｔ photo")], nextCursor: null }
        : { items: Array.from({ length: 20 }, (_, i) => post((query.get("cursor") === "31" ? 30 : 50) - i)), nextCursor: query.get("cursor") === "31" ? null : 31 };
    });
    const view = feed(ui); await view.render({ feedSearch: true });
    expect(request).toHaveBeenCalledTimes(1); expect(view.element.querySelectorAll(".kl-feed-post")).toHaveLength(20);
    button(view.element, "Load more posts").click();
    await vi.waitFor(() => expect(view.element.querySelectorAll(".kl-feed-post")).toHaveLength(40));
    expect(request.mock.calls[1]?.[1]).toBe("/v1/feed?limit=20&cursor=31");
    const query = view.element.querySelector<HTMLInputElement>('input[type="search"]')!; query.value = "cat";
    view.element.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(view.element.querySelectorAll(".kl-feed-post")).toHaveLength(1));
    expect(request.mock.calls[2]?.[1]).toBe("/v1/feed?limit=20&cursor=0&q=cat");
    button(view.element.querySelector(".kl-feed-post")!, "Person 202").click();
    expect(openProfile).toHaveBeenCalledWith(202, "Person 202");
  });
  it("reacts in place, keeps composer/comment drafts, escapes post text and preserves files after failed upload", async () => {
    const { ui, request } = setup(async (method, path) => {
      if (path.startsWith("/v1/reactions")) return { counts: [{ reaction: "dislike", count: 1 }], mine: "dislike" };
      if (path.includes("/comments")) return { items: [], nextCursor: null };
      if (method === "POST") throw new CloudError("cloud_temporarily_unavailable");
      return { items: [post(1, '<img src=x onerror="alert(1)">')], nextCursor: null };
    });
    const view = feed(ui); await view.render({ reactions: ["dislike"] });
    const draft = view.element.querySelector("textarea")!; draft.value = "My unsent post"; draft.dispatchEvent(new Event("input"));
    const card = view.element.querySelector(".kl-feed-post")!;
    expect(card.querySelector("img")).toBeNull();
    button(card, "Comments · 0").click(); await vi.waitFor(() => expect(card.querySelector(".kl-cloud-comments textarea")).not.toBeNull());
    const comment = card.querySelector<HTMLTextAreaElement>(".kl-cloud-comments textarea")!;
    comment.value = "My comment draft"; comment.dispatchEvent(new Event("input"));
    button(card, "Dislike").click(); await vi.waitFor(() => expect(card.querySelector('.kl-reactions > .kl-reaction[aria-pressed="true"]')?.getAttribute("aria-label")).toContain("Dislike: 1"));
    expect(view.element.querySelector(".kl-feed-post")).toBe(card); expect(draft.value).toBe("My unsent post"); expect(comment.value).toBe("My comment draft");
    const input = view.element.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, "files", { value: [new File(["pixels"], "photo.png", { type: "image/png" })] }); input.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(view.element.querySelectorAll(".kl-feed-attachment")).toHaveLength(1));
    button(view.element, "Post").click(); await vi.waitFor(() => expect(request.mock.calls.some(call => call[1] === "/v1/media/feed")).toBe(true));
    expect(draft.value).toBe("My unsent post"); expect(view.element.querySelectorAll(".kl-feed-attachment")).toHaveLength(1);
  });
  it("ignores an old search response after a newer search completes", async () => {
    let complete!: (value: unknown) => void;
    const { ui } = setup(async (_m, path) => path.includes("q=old") ? new Promise(resolve => { complete = resolve; }) : { items: [post(8, "new")], nextCursor: null });
    const view = feed(ui); await view.render({ feedSearch: true });
    const search = (value: string) => { view.element.querySelector<HTMLInputElement>('input[type="search"]')!.value = value; view.element.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true })); };
    search("old"); search("new"); await vi.waitFor(() => expect(view.element.querySelector(".kl-feed-post-text")?.textContent).toBe("new"));
    complete({ items: [post(9, "old")], nextCursor: null }); await Promise.resolve();
    expect(view.element.querySelector(".kl-feed-post-text")?.textContent).toBe("new");
  });
});
describe("one profile editor", () => {
  it("keeps the original decoration and gradient when migrating a default Cloud profile", async () => {
    const { client, request } = setup(async (_method, _path, body) => ({ ...profile(), ...(body as object), revision: 2 }));
    const storage = new MemoryKeyValueStorage(), settings = new SettingsStore(storage);
    const editor = new CloudProfileEditor(client, () => settings.get(), () => "Native", vi.fn(), storage);
    dispose.push(() => editor.destroy()); document.body.append(editor.element);
    const f = fields(); f.frame.value = "gold"; f.style.value = "garden";
    f.gradientEnabled.checked = true; f.gradientPrimary.value = "#123456"; f.gradientSecondary.value = "#654321";
    editor.open(f); await vi.waitFor(() => expect(editor.busy).toBe(false));
    expect(f.frame.value).toBe("gold"); expect(f.style.value).toBe("garden"); expect(f.gradientEnabled.checked).toBe(true);
    await editor.save(); expect(request).toHaveBeenCalledWith("PUT", "/v1/profiles/me", expect.objectContaining({ avatarFrame: "gold", profileStyle: "garden", profileGradient: { start: "#123456", end: "#654321" } }));
    expect(storage.getItem("kikilink:profile-appearance:101:v1")).toBe("1");
    editor.close();
    // A later deliberate reset on another device must not resurrect the old decoration.
    const returning = new CloudProfileEditor(client, () => settings.get(), () => "Native", vi.fn(), storage);
    dispose.push(() => returning.destroy()); document.body.append(returning.element); returning.open(f);
    await vi.waitFor(() => expect(returning.busy).toBe(false));
    expect(f.frame.value).toBe("none"); expect(f.style.value).toBe("classic"); expect(f.gradientEnabled.checked).toBe(false);
  });
  it("keeps existing cloud image IDs when previews fail and uploads only a chosen replacement on Save", async () => {
    const { client, request } = setup(async (method, path, body) => path.startsWith("/v1/media/") ? { id: "new-avatar" } : method === "PUT" ? { ...profile(), ...(body as object), revision: 2 } : { items: [] });
    vi.spyOn(client, "profile").mockResolvedValue({ ...profile(), avatarId: "old-avatar", bannerId: "old-banner" });
    vi.spyOn(client, "media").mockRejectedValue(new Error("preview offline"));
    const editor = new CloudProfileEditor(client, () => new SettingsStore(new MemoryKeyValueStorage()).get(), () => "Native name", vi.fn());
    dispose.push(() => editor.destroy()); document.body.append(editor.element); const f = fields(); editor.open(f);
    await vi.waitFor(() => expect(editor.busy).toBe(false)); expect(editor.name.value).toBe("Person 101");
    expect(request).not.toHaveBeenCalled(); editor.name.value = "New name";
    editor.choose("avatar", new File(["pixels"], "avatar.png", { type: "image/png" })); expect(request).not.toHaveBeenCalled();
    const source = f.avatarPreview.querySelector("img")!.src; f.avatarPreview.replaceChildren();
    expect(editor.restorePreview("avatar")).toBe(true); expect(f.avatarPreview.querySelector("img")!.src).toBe(source);
    await editor.save();
    expect(request.mock.calls.map(call => call[1])).toEqual(["/v1/media/avatar", "/v1/profiles/me"]);
    expect(request.mock.calls[1]?.[2]).toMatchObject({ displayName: "New name", avatarId: "new-avatar", bannerId: "old-banner", revision: 1 });
  });
  it("does not overwrite a profile that failed to load and retains an unsaved name on a conflict", async () => {
    const { client, request } = setup(async () => { throw new CloudError("revision_conflict", 409); });
    vi.spyOn(client, "profile").mockRejectedValueOnce(new Error("offline"));
    const editor = new CloudProfileEditor(client, () => new SettingsStore(new MemoryKeyValueStorage()).get(), () => "Native", vi.fn());
    dispose.push(() => editor.destroy()); document.body.append(editor.element); const f = fields(); editor.open(f);
    await vi.waitFor(() => expect(editor.busy).toBe(false)); await expect(editor.save()).rejects.toMatchObject({ code: "profile_load_failed" }); expect(request).not.toHaveBeenCalled();
    editor.open(f); await vi.waitFor(() => expect(editor.name.value).toBe("Person 101")); editor.name.value = "Unsent name";
    await expect(editor.save()).rejects.toMatchObject({ code: "revision_conflict" }); expect(editor.name.value).toBe("Unsent name");
  });
});
describe("group conversation ordering and drafts", () => {
  it("keeps an intervening incoming message when the send response arrives first", async () => {
    const g: CloudGroup = { id: "g", title: "Friends", owner: 202, conversationId: "c", revision: 1, membershipVersion: 1, keyVersion: 1, createdAt: 1, legacyId: null, members: [{ memberNumber: 101, role: "member", status: "active" }] };
    const message = (sequence: number, sender = 202): CloudMessage => ({ id: `m${sequence}`, conversationId: "c", sequence, sender, text: `Message ${sequence}`, clientId: `client${sequence}`, schemaVersion: 1, encryption: "server-aes-256-gcm", membershipVersion: 1, keyVersion: 1, createdAt: Date.now(), deletedAt: null });
    let removed = false;
    const { ui, request } = setup(async (method, path) => path === "/v1/groups/g" ? g : method === "POST" ? message(3, 101) : path.includes("backward") ? { items: [message(1)], nextCursor: null } : { items: [message(2), message(3, 101)], nextCursor: null, removedIds: removed ? ["m1"] : [] });
    const draft = { text: "My message", clientId: "send1" };
    const thread = new CloudGroupThread(ui, g, draft, { enterToSend: () => true, membershipChanged: vi.fn(), report: vi.fn() });
    dispose.push(() => thread.stop()); document.body.append(thread.element); await thread.loadOlder(); await thread.send();
    expect(request.mock.calls.some(call => call[1].endsWith("direction=forward&cursor=1"))).toBe(true);
    expect([...thread.element.querySelectorAll<HTMLElement>(".kl-group-message")].map(row => row.dataset.messageId)).toEqual(["m1", "m2", "m3"]);
    expect(draft.text).toBe(""); await thread.updates(); expect(thread.element.querySelectorAll(".kl-group-message")).toHaveLength(3);
    removed = true; await thread.updates(); expect(thread.element.querySelector('[data-message-id="m1"] .kl-group-message-text')?.textContent).toBe("Message removed");
  });
  it("keeps a failed message and does not send Enter while composing or after leaving", async () => {
    const g = { id: "g", title: "Friends", conversationId: "c", membershipVersion: 1, keyVersion: 1 } as CloudGroup;
    const { ui, request } = setup(async () => { throw new CloudError("cloud_temporarily_unavailable"); });
    const draft = { text: "Keep this", clientId: "same-id" };
    const thread = new CloudGroupThread(ui, g, draft, { enterToSend: () => true, membershipChanged: vi.fn(), report: vi.fn() });
    document.body.append(thread.element); const input = thread.element.querySelector("textarea")!;
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", isComposing: true })); expect(request).not.toHaveBeenCalled();
    await expect(thread.send()).rejects.toMatchObject({ code: "cloud_temporarily_unavailable" }); expect(draft).toEqual({ text: "Keep this", clientId: "same-id" });
    thread.stop(); await thread.send(); expect(request).toHaveBeenCalledTimes(1);
  });
});
