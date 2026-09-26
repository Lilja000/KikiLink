// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { CloudClient, CloudError } from "../src/cloud/client";
import { CloudFeedView } from "../src/cloud/feed-view";
import { CloudGroupThread } from "../src/cloud/group-thread";
import { CloudProfileEditor, type ProfileEditorFields } from "../src/cloud/profile-editor";
import { SocialUI } from "../src/cloud/social-ui";
import type { CloudGroup, CloudMessage, CloudPost, CloudProfile } from "../src/cloud/types";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import { containKikiLinkKeyboard } from "../src/bc/keyboard";
import { refreshClockText, setTimeFormatPreference } from "../src/core/time-format";

const dispose: Array<() => void> = [];
afterEach(() => {
  setTimeFormatPreference("24-hour");
  for (const close of dispose.splice(0)) close();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
const profile = (memberNumber = 101): CloudProfile => ({ memberNumber, displayName: `Person ${memberNumber}`, bio: "About me", avatarId: null, bannerId: null, avatarFrame: "none", profileStyle: "classic", revision: 1, visible: true, updatedAt: Date.now() });
const post = (id: number, text = `Post ${id}`): CloudPost => ({ id, text, author: 202, profile: profile(202), revision: 1, mediaIds: [], createdAt: Date.now(), updatedAt: 0, reactions: { counts: [], mine: null }, commentCount: 0 });
function button(root: ParentNode, label: string) {
  const b = [...root.querySelectorAll<HTMLButtonElement>("button")].find(node => node.getAttribute("aria-label") === label || node.textContent === label);
  if (!b) throw new Error(`Missing button ${label}`); return b;
}
function setup(handler: (method: string, path: string, body: unknown) => Promise<unknown>) {
  let connected = true;
  const listeners = new Set<(kind: string) => void>();
  const request = vi.fn((method: string, path: string, body?: unknown) => path === "/v1/me"
    ? Promise.resolve({ features: { fullProfile: true, community: true } })
    : handler(method, path, body)), errors: unknown[] = [], openProfile = vi.fn();
  const client = { memberNumber: 101, get connected() { return connected; }, request,
    connect: vi.fn(async () => { connected = true; for (const fn of listeners) fn("session"); }),
    profile: vi.fn(async (member: number) => profile(member)), media: vi.fn(async () => new Blob(["image"], { type: "image/webp" })),
    subscribe: (fn: (kind: string) => void) => { listeners.add(fn); return () => listeners.delete(fn); } } as unknown as CloudClient;
  const ui = new SocialUI({ client, openProfile, isBlocked: member => member === 303,
    image: (_id, alt) => { const node = document.createElement("span"); node.setAttribute("aria-label", alt); return node; },
    run: async (action, button) => {
      if (button) button.disabled = true;
      try { await action(); } catch (error) { errors.push(error); }
      finally { if (button) button.disabled = false; }
    },
  });
  dispose.push(() => ui.destroy());
  return { client, ui, request, errors, openProfile, disconnect: () => { connected = false; for (const fn of listeners) fn("session"); } };
}
function feed(ui: SocialUI) {
  const view = new CloudFeedView(ui, { openOwnProfile: vi.fn(), openGroups: vi.fn(), report: vi.fn() });
  document.body.append(view.element); dispose.push(() => view.destroy()); return view;
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
  it("patches live Feed additions, edits and deletions while keeping images, comment drafts, focus and the editor", async () => {
    const own = { ...post(7), author: 101, profile: profile(), mediaIds: ["photo"] };
    let posts = [own, post(6)], feedReads = 0;
    const { ui } = setup(async (_method, path) => {
      if (path.includes("comments?")) return { items: [], nextCursor: null };
      feedReads++; return { items: structuredClone(posts), nextCursor: null };
    });
    const view = feed(ui); await view.render();
    const card = view.element.querySelector<HTMLElement>('[data-post-id="7"]')!;
    const photo = card.querySelector('[aria-label="Feed image"]');
    const composer = view.element.querySelector<HTMLTextAreaElement>('textarea[aria-label="Share a post"]')!;
    composer.value = "Unsent post"; composer.dispatchEvent(new Event("input"));
    button(card, "Comments · 0").click();
    await vi.waitFor(() => expect(card.querySelector(".kl-cloud-comments textarea")).not.toBeNull());
    const comment = card.querySelector<HTMLTextAreaElement>(".kl-cloud-comments textarea")!;
    comment.value = "Unsent comment"; comment.dispatchEvent(new Event("input"));
    button(card, "Edit post").click();
    const dialog = document.querySelector<HTMLDialogElement>(".kl-feed-action-dialog")!;
    const edit = dialog.querySelector("textarea")!; edit.value = "My unsaved edit"; edit.dispatchEvent(new Event("input")); edit.focus();
    view.element.scrollTop = 100;
    vi.spyOn(view.element, "getBoundingClientRect").mockReturnValue({ top: 0 } as DOMRect);
    vi.spyOn(card, "getBoundingClientRect").mockImplementation(() => ({ top: view.element.querySelector('[data-post-id="8"]') ? 210 : 10, bottom: 300 } as DOMRect));
    posts = [post(8), { ...own, text: "Updated elsewhere", revision: 2, updatedAt: own.createdAt + 1, commentCount: 2 }];
    expect(await view.sync()).toBe(true);
    expect(feedReads).toBe(2);
    expect(view.element.querySelector('[data-post-id="7"]')).toBe(card);
    expect(card.querySelector('[aria-label="Feed image"]')).toBe(photo);
    expect(card.querySelector(".kl-feed-post-text")!.textContent).toBe("Updated elsewhere");
    expect(view.element.querySelector('[data-post-id="6"]')).toBeNull();
    expect(view.element.querySelector(".kl-feed-results")!.textContent).toBe("2 posts");
    expect(composer.value).toBe("Unsent post"); expect(comment.value).toBe("Unsent comment");
    expect(dialog.open).toBe(true); expect(edit.value).toBe("My unsaved edit"); expect(document.activeElement).toBe(edit);
    expect(view.element.scrollTop).toBe(300);
  });

  it("bounds a large live catch-up to three requests and retains the current reading anchor", async () => {
    let changed = false, requests = 0;
    const cursors: number[] = [];
    const { ui } = setup(async (_method, path) => {
      requests++;
      if (!changed) return { items: [post(2), post(1)], nextCursor: 1 };
      const before = Number(new URL(path, "https://cloud.test").searchParams.get("cursor")) || 201;
      cursors.push(before);
      const items = Array.from({ length: 40 }, (_, i) => post(before - i - 1));
      return { items, nextCursor: items.at(-1)!.id };
    });
    const view = feed(ui); await view.render(); changed = true;
    const anchor = view.element.querySelector<HTMLElement>('[data-post-id="2"]')!;
    view.element.scrollTop = 100;
    vi.spyOn(anchor, "getBoundingClientRect").mockReturnValue({ top: 0, bottom: 50 } as DOMRect);
    // The read position is retained even if more than 100 new posts arrived.
    await view.sync();
    expect(requests).toBe(4); expect(view.element.querySelectorAll(".kl-feed-post")).toHaveLength(100);
    expect(anchor.isConnected).toBe(true);
    button(view.element, "Load more posts").click();
    await vi.waitFor(() => expect(requests).toBe(5));
    expect(cursors.at(-1)).toBe(102);
    expect(view.element.querySelector('[data-post-id="101"]')).not.toBeNull();
  });

  it("does not resurrect a deleted post from a Feed request that started before the deletion", async () => {
    const own = { ...post(7), author: 101, profile: profile() };
    let reads = 0, finish!: (value: unknown) => void;
    const { ui } = setup(async method => {
      if (method === "DELETE") return;
      if (++reads > 1) return new Promise(resolve => { finish = resolve; });
      return { items: [structuredClone(own)], nextCursor: null };
    });
    const view = feed(ui); await view.render(); const pending = view.sync();
    button(view.element, "Delete post").click();
    button(document.querySelector(".kl-feed-action-dialog")!, "Delete post").click();
    await vi.waitFor(() => expect(view.element.querySelector('[data-post-id="7"]')).toBeNull());
    finish({ items: [structuredClone(own)], nextCursor: null });
    expect(await pending).toBe(false); expect(view.element.querySelector('[data-post-id="7"]')).toBeNull();
  });

  it.each(["Edit post", "Delete post"])("keeps a pressed %s menu item available until the touch click arrives", async label => {
    const own = { ...post(7), author: 101, profile: profile() };
    const { ui } = setup(async () => ({ items: [own], nextCursor: null }));
    const view = feed(ui); await view.render();
    const action = button(view.element, label), menu = action.closest("details")!;
    const summary = menu.querySelector("summary")!;
    summary.focus(); menu.open = true;
    action.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true, pointerType: "touch" }));
    // Touch/browser focus can leave the summary before the eventual click.
    summary.blur();
    await Promise.resolve();
    expect(menu.open).toBe(true);
    action.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, composed: true, pointerType: "touch" }));
    action.click();
    expect(document.querySelector<HTMLDialogElement>(".kl-feed-action-dialog")!.open).toBe(true);
    expect(menu.open).toBe(false);
  });

  it("dismisses menus outside or by keyboard and keeps touch handling when a cached surface returns", async () => {
    const { ui } = setup(async () => ({}));
    const action = ui.button("Edit post", vi.fn()), menu = ui.menu("Post options", [action]) as HTMLDetailsElement;
    const outside = document.createElement("button"); document.body.append(menu, outside);
    const summary = menu.querySelector("summary")!; summary.focus(); menu.open = true;
    outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true })); expect(menu.open).toBe(false);
    menu.remove(); outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true })); document.body.append(menu);
    summary.focus(); menu.open = true;
    action.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true })); summary.blur(); await Promise.resolve();
    expect(menu.open).toBe(true);
    action.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, composed: true }));
    action.focus(); outside.focus(); await Promise.resolve(); expect(menu.open).toBe(false);
  });

  it("edits a long own post in a visible dialog, retries in place and retains its images and comments", async () => {
    const own = { ...post(7, "Long post\n".repeat(100)), author: 101, profile: profile(), mediaIds: ["photo"] };
    let attempt = 0;
    const { ui, request, errors } = setup(async (method, path, body) => {
      if (method === "PATCH") {
        if (++attempt === 1) throw new CloudError("cloud_temporarily_unavailable");
        const input = body as { text: string; revision: number };
        return { ...own, text: input.text, revision: input.revision + 1, updatedAt: own.createdAt + attempt };
      }
      return { items: path.includes("comments?") ? [] : [own], nextCursor: null };
    });
    const view = feed(ui), host = document.createElement("div");
    const root = host.attachShadow({ mode: "open" }); document.body.append(host); root.append(view.element);
    await view.render();
    const card = view.element.querySelector<HTMLElement>('[data-post-id="7"]')!;
    const image = card.querySelector('[aria-label="Feed image"]');
    button(card, "Comments · 0").click();
    await vi.waitFor(() => expect(card.querySelector('textarea[aria-label="Comment"]')).not.toBeNull());
    const comments = card.querySelector(".kl-cloud-comments");
    const composer = view.element.querySelector<HTMLTextAreaElement>('textarea[aria-label="Share a post"]')!;
    composer.value = "My other draft"; composer.dispatchEvent(new Event("input"));
    view.element.scrollTop = 480;
    const edit = button(card, "Edit post"), menu = edit.closest("details")!;
    menu.open = true; edit.focus(); edit.click();
    const dialog = root.querySelector<HTMLDialogElement>(".kl-feed-action-dialog")!;
    const field = dialog.querySelector("textarea")!;
    expect(dialog.open).toBe(true); expect(menu.open).toBe(false);
    expect(view.element.contains(dialog)).toBe(false); expect(root.activeElement).toBe(field);
    expect(field.value).toBe(own.text); expect(request.mock.calls.some(([method]) => method === "PATCH")).toBe(false);
    expect(button(dialog, "Save changes").disabled).toBe(true);
    field.value = "Edited text"; field.dispatchEvent(new Event("input")); button(dialog, "Save changes").click();
    await vi.waitFor(() => expect(dialog.textContent).toContain("Your changes are still here"));
    expect(dialog.open).toBe(true); expect(field.value).toBe("Edited text"); expect(errors).toEqual([]);
    button(dialog, "Save changes").click();
    await vi.waitFor(() => expect(dialog.open).toBe(false));
    expect(request).toHaveBeenLastCalledWith("PATCH", "/v1/feed/7", { text: "Edited text", mediaIds: ["photo"], revision: 1 });
    expect(view.element.querySelector('[data-post-id="7"]')).toBe(card);
    expect(card.querySelector(".kl-feed-post-text")!.textContent).toBe("Edited text");
    expect(card.querySelector(".kl-feed-expand")).toBeNull(); expect(card.querySelector(".kl-social-edited")).not.toBeNull();
    expect(card.querySelector('[aria-label="Feed image"]')).toBe(image); expect(card.querySelector(".kl-cloud-comments")).toBe(comments);
    expect(composer.value).toBe("My other draft"); expect(view.element.scrollTop).toBe(480);
    expect(root.activeElement).toBe(menu.querySelector("summary"));
    edit.click(); const second = dialog.querySelector("textarea")!;
    expect(second.value).toBe("Edited text"); second.value = "Edited twice"; second.dispatchEvent(new Event("input"));
    button(dialog, "Save changes").click(); await vi.waitFor(() => expect(dialog.open).toBe(false));
    expect(request).toHaveBeenLastCalledWith("PATCH", "/v1/feed/7", { text: "Edited twice", mediaIds: ["photo"], revision: 2 });
  });

  it("shows owner actions only for the actual author and cancels an edit without sending it", async () => {
    const own = { ...post(7), author: 101, profile: profile() }, other = { ...post(8), profile: { ...profile(202), displayName: profile().displayName } };
    const { ui, request } = setup(async () => ({ items: [own, other], nextCursor: null }));
    const view = feed(ui); await view.render();
    const otherCard = view.element.querySelector('[data-post-id="8"]')!;
    expect(otherCard.querySelector('[aria-label="Edit post"]')).toBeNull(); expect(otherCard.querySelector('[aria-label="Delete post"]')).toBeNull();
    button(view.element, "Edit post").click();
    const dialog = document.querySelector<HTMLDialogElement>(".kl-feed-action-dialog")!;
    const field = dialog.querySelector("textarea")!; field.value = "Discarded"; field.dispatchEvent(new Event("input"));
    button(dialog, "Cancel").click(); expect(dialog.open).toBe(false);
    expect(request.mock.calls.filter(([method]) => method !== "GET")).toEqual([]);
    button(view.element, "Edit post").click(); expect(dialog.querySelector("textarea")!.value).toBe(own.text);
    view.clear(); expect(dialog.open).toBe(false); expect(dialog.querySelector("textarea")).toBeNull();
  });

  it("requires a visible delete confirmation, retains failed posts and retries deletion without rebuilding Feed", async () => {
    const own = { ...post(7, "Long post\n".repeat(100)), author: 101, profile: profile(), mediaIds: ["photo"] };
    let attempts = 0;
    const { ui, request, errors } = setup(async method => {
      if (method === "DELETE") { if (++attempts === 1) throw new CloudError("cloud_temporarily_unavailable"); return; }
      return { items: [own, { ...post(6), author: 101, profile: profile() }], nextCursor: null };
    });
    const view = feed(ui); await view.render();
    const card = view.element.querySelector('[data-post-id="7"]')!, neighbour = view.element.querySelector('[data-post-id="6"]');
    const edit = button(card, "Delete post"); edit.click();
    const dialog = document.querySelector<HTMLDialogElement>(".kl-feed-action-dialog")!;
    expect(dialog.open).toBe(true); expect(document.activeElement).toBe(button(dialog, "Cancel"));
    expect(request.mock.calls.some(([method]) => method === "DELETE")).toBe(false);
    button(dialog, "Cancel").click(); expect(dialog.open).toBe(false); expect(card.isConnected).toBe(true);
    edit.click(); button(dialog, "Delete post").click();
    await vi.waitFor(() => expect(dialog.textContent).toContain("Could not delete this post"));
    expect(card.isConnected).toBe(true); expect(errors).toEqual([]);
    button(dialog, "Delete post").click();
    await vi.waitFor(() => expect(dialog.open).toBe(false));
    expect(card.isConnected).toBe(false); expect(view.element.querySelector('[data-post-id="6"]')).toBe(neighbour);
    expect(document.activeElement).toBe(neighbour!.querySelector("summary"));
    expect(request.mock.calls.filter(([method]) => method === "DELETE")).toHaveLength(2);
    expect(view.element.querySelector(".kl-feed-results")!.textContent).toBe("1 post");
    button(neighbour!, "Delete post").click(); button(dialog, "Delete post").click();
    await vi.waitFor(() => expect(dialog.open).toBe(false));
    expect(view.element.querySelector(".kl-feed-results")!.textContent).toBe("");
    expect(view.element.querySelector(".kl-feed-empty")).not.toBeNull();
  });

  it("keeps a conflicting edit without retrying or overwriting the server automatically", async () => {
    const own = { ...post(7), author: 101, profile: profile() };
    const { ui, request } = setup(async method => {
      if (method === "PATCH") throw new CloudError("revision_conflict", 409);
      return { items: [own], nextCursor: null };
    });
    const view = feed(ui); await view.render(); button(view.element, "Edit post").click();
    const dialog = document.querySelector<HTMLDialogElement>(".kl-feed-action-dialog")!;
    const field = dialog.querySelector("textarea")!; field.value = "My version"; field.dispatchEvent(new Event("input"));
    button(dialog, "Save changes").click();
    await vi.waitFor(() => expect(dialog.textContent).toContain("changed in another session"));
    expect(dialog.open).toBe(true); expect(field.value).toBe("My version");
    expect(view.element.querySelector(".kl-feed-post-text")!.textContent).toBe("Post 7");
    expect(request.mock.calls.filter(([method]) => method === "PATCH")).toHaveLength(1);
    button(dialog, "Cancel").click(); expect(dialog.open).toBe(false);
  });

  it("sends one pending edit and never lets its late response close a newer editor", async () => {
    const own = { ...post(7), author: 101, profile: profile() };
    let finish!: () => void;
    const gate = new Promise<void>(resolve => { finish = resolve; });
    const { ui, request } = setup(async (method, _path, body) => {
      if (method === "PATCH") { await gate; return { ...own, text: (body as { text: string }).text, revision: 2, updatedAt: own.createdAt + 1 }; }
      return { items: [own], nextCursor: null };
    });
    const view = feed(ui); await view.render(); button(view.element, "Edit post").click();
    const dialog = document.querySelector<HTMLDialogElement>(".kl-feed-action-dialog")!;
    const field = dialog.querySelector("textarea")!; field.value = "Pending edit"; field.dispatchEvent(new Event("input"));
    const save = button(dialog, "Save changes"); save.click(); save.click();
    expect(request.mock.calls.filter(([method]) => method === "PATCH")).toHaveLength(1);
    button(dialog, "Cancel").click(); button(view.element, "Edit post").click();
    const newer = dialog.querySelector("textarea")!; newer.value = "Another draft"; newer.dispatchEvent(new Event("input"));
    finish(); await vi.waitFor(() => expect(view.element.querySelector(".kl-feed-post-text")!.textContent).toBe("Pending edit"));
    expect(dialog.open).toBe(true); expect(dialog.querySelector("textarea")).toBe(newer); expect(newer.value).toBe("Another draft");
  });

  it.each([false, true])("uses the correct post retry key when pending text changes: %s", async changed => {
    let finish!: () => void;
    const gate = new Promise<void>(resolve => { finish = resolve; });
    let attempt = 0;
    const { ui, request, errors } = setup(async (method, _path, body) => {
      if (method !== "POST") return { items: [], nextCursor: null };
      if (++attempt === 1) { await gate; throw new CloudError("cloud_temporarily_unavailable"); }
      return { ...post(1, (body as { text: string }).text), author: 101, profile: profile() };
    });
    const view = feed(ui); await view.render();
    const input = view.element.querySelector("textarea")!;
    input.value = "First post"; input.dispatchEvent(new Event("input")); button(view.element, "Post").click();
    if (changed) { input.value = "New post"; input.dispatchEvent(new Event("input")); }
    finish(); await vi.waitFor(() => expect(errors).toHaveLength(1));
    button(view.element, "Post").click();
    await vi.waitFor(() => expect(input.value).toBe(""));
    const attempts = request.mock.calls.filter(([method]) => method === "POST").map(([, , body]) => body as { text: string; clientId: string });
    expect(attempts).toHaveLength(2);
    expect(attempts[1]!.text).toBe(changed ? "New post" : "First post");
    expect(attempts[1]!.clientId === attempts[0]!.clientId).toBe(!changed);
  });

  it("bounds inserted confirmed posts and respects the current Feed search without rebuilding controls", async () => {
    let id = 100;
    const { ui } = setup(async (method, _path, body) => method === "POST"
      ? { ...post(++id, (body as { text: string }).text), author: 101, profile: profile() }
      : { items: Array.from({ length: 100 }, (_, i) => post(100 - i, "Earlier post")), nextCursor: 1 });
    const view = feed(ui); await view.render({ feedSearch: true });
    const publish = async (text: string) => {
      const input = view.element.querySelector("textarea")!;
      input.value = text; input.dispatchEvent(new Event("input")); button(view.element, "Post").click();
      await vi.waitFor(() => expect(input.value).toBe(""));
      expect(view.element.querySelector("textarea")).toBe(input);
    };
    await publish("Newest post");
    expect(view.element.querySelectorAll(".kl-feed-post")).toHaveLength(100);
    expect(view.element.querySelector('[data-post-id="1"]')).toBeNull();
    expect(view.element.querySelector(".kl-feed-post")?.getAttribute("data-post-id")).toBe("101");
    view.element.querySelector<HTMLInputElement>(".kl-feed-search")!.value = "needle";
    view.element.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(view.element.querySelector(".kl-feed-empty")).not.toBeNull());
    await publish("Does not match the filter");
    expect(view.element.querySelectorAll(".kl-feed-post")).toHaveLength(0);
  });

  it.each([
    { next: "", moveFocus: false, failed: false },
    { next: "Next post", moveFocus: false, failed: false },
    { next: "Next post", moveFocus: true, failed: false },
    { next: "Next post", moveFocus: true, failed: true },
  ])("keeps Feed typing and focus in place through a post: %j", async ({ next, moveFocus, failed }) => {
    let finish!: () => void;
    const gate = new Promise<void>(resolve => { finish = resolve; });
    const created = { ...post(2, "First post"), author: 101, profile: profile() };
    const { ui, request, errors } = setup(async (method) => {
      if (method === "POST") {
        await gate;
        if (failed) throw new CloudError("cloud_temporarily_unavailable");
        return created;
      }
      return { items: [post(1)], nextCursor: null };
    });
    const host = document.createElement("div"), nativeChat = document.createElement("textarea");
    const root = host.attachShadow({ mode: "open" }); document.body.append(host, nativeChat);
    const view = feed(ui); root.append(view.element);
    dispose.push(containKikiLinkKeyboard(root), () => ui.destroy());
    const shortcut = vi.fn((event: Event) => { if ((event as KeyboardEvent).key === "Enter") nativeChat.focus(); });
    for (const type of ["keydown", "keypress", "keyup"]) document.addEventListener(type, shortcut);
    dispose.push(() => { for (const type of ["keydown", "keypress", "keyup"]) document.removeEventListener(type, shortcut); });
    await view.render();
    const input = view.element.querySelector("textarea")!;
    const search = view.element.querySelector<HTMLInputElement>(".kl-feed-search")!;
    const firstPost = view.element.querySelector('[data-post-id="1"]');
    input.focus(); input.value = "First post"; input.dispatchEvent(new Event("input"));
    const enter = (ctrlKey = false) => {
      for (const type of ["keydown", "keypress", "keyup"]) input.dispatchEvent(new KeyboardEvent(type, {
        key: "Enter", code: "Enter", ctrlKey, bubbles: true, composed: true, cancelable: true,
      }));
    };
    enter();
    expect(request.mock.calls.some(([method]) => method === "POST")).toBe(false);
    expect(root.activeElement).toBe(input);
    enter(true); enter(true);
    expect(request.mock.calls.filter(([method]) => method === "POST")).toHaveLength(1);
    expect(input.disabled).toBe(false);
    if (next) { input.value = next; input.dispatchEvent(new Event("input")); }
    if (moveFocus) search.focus();
    finish();
    await vi.waitFor(() => {
      if (failed) expect(errors).toHaveLength(1);
      else expect(view.element.querySelector('[data-post-id="2"]')).not.toBeNull();
      expect(button(view.element, "Photo").disabled).toBe(false);
    });
    expect(view.element.querySelector("textarea")).toBe(input);
    expect(view.element.querySelector('[data-post-id="1"]')).toBe(firstPost);
    expect(input.value).toBe(next);
    expect(root.activeElement).toBe(moveFocus ? search : input);
    expect(shortcut).not.toHaveBeenCalled();
    expect(request.mock.calls.filter(([method]) => method === "GET")).toHaveLength(1);
    expect(button(view.element, "Post").disabled).toBe(!next);
  });

  it("keeps a decoded avatar during replacement and immediately honors hidden previews", () => {
    const { ui } = setup(async () => ({})); dispose.push(() => ui.destroy());
    const media: HTMLElement[] = [];
    vi.spyOn(ui.options, "image").mockImplementation(() => {
      const node = document.createElement("div"); node.className = "kl-social-avatar-media";
      node.dataset.state = media.length ? "loading" : "ready"; media.push(node); return node;
    });
    const author = ui.author({ ...profile(), avatarId: "first" }); document.body.append(author);
    const avatar = author.querySelector<HTMLElement>(".kl-social-avatar")!;
    ui.updateAuthor(author, { ...profile(), avatarId: "second" });
    expect(avatar.contains(media[0]!)).toBe(true);
    expect(media[1]!.style.visibility).toBe("hidden");
    media[1]!.dataset.state = "ready"; media[1]!.dispatchEvent(new Event("cloud-image-ready"));
    expect(avatar.children).toHaveLength(1); expect(avatar.firstElementChild).toBe(media[1]);
    ui.updateAuthor(author, { ...profile(), avatarId: "third" });
    media[2]!.dataset.state = "error"; media[2]!.dispatchEvent(new Event("cloud-image-error"));
    expect(avatar.children).toHaveLength(2); expect(avatar.firstElementChild).toBe(media[1]);
    expect(media[2]!.style.visibility).toBe("hidden");
    media[2]!.dataset.errorStatus = "404"; media[2]!.dispatchEvent(new Event("cloud-image-error"));
    expect(avatar.contains(media[1]!)).toBe(false); expect(avatar.querySelector(".kl-social-initials")).not.toBeNull();
    vi.spyOn(ui.options, "image").mockImplementation(() => {
      const node = document.createElement("div"); node.dataset.state = "hidden"; return node;
    });
    ui.updateAuthor(author, { ...profile(), avatarId: "private" });
    expect(avatar.contains(media[1]!)).toBe(false);
    expect(avatar.querySelector(".kl-social-initials")).not.toBeNull();
  });
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
  it("tracks profile fields and selected media as unsaved until a successful save", async () => {
    const { client } = setup(async (_method, _path, body) => ({ ...profile(), ...(body as object), revision: 2 }));
    const editor = new CloudProfileEditor(client, () => new SettingsStore(new MemoryKeyValueStorage()).get(), () => "Native", vi.fn());
    dispose.push(() => editor.destroy()); document.body.append(editor.element);
    const f = fields(); editor.open(f);
    await vi.waitFor(() => expect(editor.busy).toBe(false));
    expect(editor.dirty).toBe(false);
    f.bio.value = "Changed bio"; expect(editor.dirty).toBe(true);
    f.bio.value = "About me"; expect(editor.dirty).toBe(false);
    editor.choose("avatar", new File(["pixels"], "avatar.png", { type: "image/png" }));
    expect(editor.dirty).toBe(true);
    await editor.save();
    expect(editor.dirty).toBe(false);
  });

  it.each([false, true])("checks fullProfile independently of Community before mutating (supported=%s)", async supported => {
    const { client, request } = setup(async (_method, path, body) => path === "/v1/profiles/me"
      ? { ...profile(), ...(body as object), revision: 2 } : {});
    const original = request.getMockImplementation()!;
    request.mockImplementation((method, path, body) => path === "/v1/me"
      ? Promise.resolve({ features: { fullProfile: supported, community: false } }) : original(method, path, body));
    const editor = new CloudProfileEditor(client, () => new SettingsStore(new MemoryKeyValueStorage()).get(), () => "Native", vi.fn());
    dispose.push(() => editor.destroy()); const f = fields(); editor.open(f);
    await vi.waitFor(() => expect(editor.busy).toBe(false)); editor.name.value = "My draft";
    if (supported) { await editor.save(); expect(editor.current?.displayName).toBe("My draft"); }
    else {
      await expect(editor.save()).rejects.toMatchObject({ code: "profile_schema_unsupported" });
      expect(request.mock.calls.map(call => call[1])).toEqual(["/v1/me"]);
      expect(editor.name.value).toBe("My draft");
    }
  });
  it("keeps text and chosen files after authentication loss and retries with the original revision", async () => {
    const h = setup(async (method, path, body) => {
      if (path.startsWith("/v1/media/")) return { id: "uploaded-avatar" };
      if (method === "PUT" && first) { first = false; h.disconnect(); throw new CloudError("authentication_required", 401); }
      return { ...profile(), ...(body as object), revision: 2 };
    });
    let first = true;
    const editor = new CloudProfileEditor(h.client, () => new SettingsStore(new MemoryKeyValueStorage()).get(), () => "Native", vi.fn());
    dispose.push(() => editor.destroy()); document.body.append(editor.element);
    const f = fields(); editor.open(f); await vi.waitFor(() => expect(editor.busy).toBe(false));
    editor.name.value = "My draft"; f.bio.value = "Keep my bio";
    editor.choose("avatar", new File(["pixels"], "avatar.png", { type: "image/png" }));
    await expect(editor.save()).rejects.toMatchObject({ code: "authentication_required" });
    expect(editor.name.value).toBe("My draft"); expect(f.bio.value).toBe("Keep my bio");
    expect(f.avatarPreview.querySelector("img")).not.toBeNull();
    button(editor.element, "Connect profile").click();
    await vi.waitFor(() => expect(editor.status.textContent).toBe("Connected. Your draft is ready to save."));
    await editor.save();
    expect(h.request.mock.calls.filter(call => call[1] === "/v1/media/avatar")).toHaveLength(1);
    expect(h.request).toHaveBeenLastCalledWith("PUT", "/v1/profiles/me", expect.objectContaining({ displayName: "My draft", bio: "Keep my bio", avatarId: "uploaded-avatar", revision: 1 }));
  });
  it.each([false, true])("keeps the original decoration and gradient when migrating a default Cloud profile (angle=%s)", async angle => {
    const { client, request } = setup(async (_method, _path, body) => ({ ...profile(), ...(body as object), revision: 2 }));
    request.mockImplementation((_method, path, body) => Promise.resolve(path === "/v1/me"
      ? { features: { fullProfile: true, profileGradientAngle: angle } }
      : { ...profile(), ...(body as object), revision: 2 }));
    const storage = new MemoryKeyValueStorage(), settings = new SettingsStore(storage);
    const editor = new CloudProfileEditor(client, () => settings.get(), () => "Native", vi.fn(), storage);
    dispose.push(() => editor.destroy()); document.body.append(editor.element);
    const f = fields(); f.frame.value = "gold"; f.style.value = "garden";
    f.gradientEnabled.checked = true; f.gradientPrimary.value = "#123456"; f.gradientSecondary.value = "#654321";
    editor.open(f); await vi.waitFor(() => expect(editor.busy).toBe(false));
    expect(f.frame.value).toBe("gold"); expect(f.style.value).toBe("garden"); expect(f.gradientEnabled.checked).toBe(true);
    await editor.save(); expect(request).toHaveBeenCalledWith("PUT", "/v1/profiles/me", expect.objectContaining({ avatarFrame: "gold", profileStyle: "garden", profileGradient: angle
      ? { start: "#123456", end: "#654321", enabled: false, angle: 135 }
      : { start: "#123456", end: "#654321", enabled: false } }));
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
    expect(request.mock.calls.map(call => call[1])).toEqual(["/v1/me", "/v1/media/avatar", "/v1/profiles/me"]);
    expect(request.mock.calls.find(call => call[1] === "/v1/profiles/me")?.[2]).toMatchObject({ displayName: "New name", avatarId: "new-avatar", bannerId: "old-banner", revision: 1 });
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
  it.each(["comfortable", "compact", "super-compact"])("updates group receipts and 12/24-hour text in place in %s density", async density => {
    const g: CloudGroup = { id: "g", title: "Friends", owner: 101, conversationId: "c", revision: 1,
      membershipVersion: 1, keyVersion: 1, createdAt: 1, legacyId: null,
      members: [{ memberNumber: 101, role: "owner", status: "active" }, { memberNumber: 202, role: "member", status: "active" }] };
    const sentAt = new Date(2026, 8, 22, 21, 0).getTime();
    const own: CloudMessage = { id: "own", conversationId: "c", sequence: 1, sender: 101, text: "Stable bubble",
      clientId: "own-client", schemaVersion: 1, encryption: "server-aes-256-gcm", membershipVersion: 1,
      keyVersion: 1, createdAt: sentAt, deletedAt: null, receiptState: null };
    let state: "delivered" | "read" | null = null;
    const { ui } = setup(async (_method, path) => path.includes("receipts/query")
      ? { items: [{ messageId: "own", state }] }
      : { items: [own], nextCursor: null });
    const thread = new CloudGroupThread(ui, g, { text: "", clientId: "draft" }, {
      enterToSend: () => true, membershipChanged: vi.fn(), report: vi.fn(), messageReceipts: true,
    });
    const host = document.createElement("div"); host.dataset.density = density;
    const shadow = host.attachShadow({ mode: "open" }); shadow.append(thread.element); document.body.append(host);
    dispose.push(() => thread.stop(), () => ui.destroy());
    setTimeFormatPreference("24-hour"); await thread.loadOlder();
    const row = thread.element.querySelector<HTMLElement>('[data-message-id="own"]')!;
    const bubble = row.querySelector(".kl-message-bubble");
    const time = row.querySelector<HTMLElement>(".kl-message-time")!;
    const indicator = row.querySelector<HTMLElement>(".kl-message-receipt")!;
    const input = thread.element.querySelector<HTMLTextAreaElement>("textarea")!;
    input.focus(); const scroll = thread.element.querySelector<HTMLElement>(".kl-group-history")!; scroll.scrollTop = 17;
    expect(indicator.dataset.state).toBe("sent");
    expect(indicator.title).toBe("Sent to Cloud");
    await thread.refreshReceipts();
    expect(indicator.dataset.state).toBe("sent");
    state = "delivered"; await thread.refreshReceipts();
    expect(indicator.dataset.state).toBe("sent");
    state = "read"; await thread.refreshReceipts();
    expect(indicator.dataset.state).toBe("read");
    expect(indicator.title).toBe("Read by everyone");
    setTimeFormatPreference("12-hour"); refreshClockText(thread.element, "12-hour");
    expect(time.textContent).toMatch(/9:00\s*PM/iu);
    expect(thread.element.querySelector('[data-message-id="own"]')).toBe(row);
    expect(row.querySelector(".kl-message-bubble")).toBe(bubble);
    expect(row.querySelector(".kl-message-receipt")).toBe(indicator);
    expect(scroll.scrollTop).toBe(17);
    expect(shadow.activeElement).toBe(input);
  });

  it.each([
    { next: "", moveFocus: false, failed: false },
    { next: "Next message", moveFocus: false, failed: false },
    { next: "Next message", moveFocus: true, failed: false },
    { next: "Next message", moveFocus: true, failed: true },
  ])("keeps Cloud group focus after Enter without taking focus back: %j", async ({ next, moveFocus, failed }) => {
    const group = { id: "g", title: "Friends", conversationId: "c", revision: 1, membershipVersion: 1, keyVersion: 1 } as CloudGroup;
    let finish!: () => void;
    const gate = new Promise<void>(resolve => { finish = resolve; });
    const message: CloudMessage = { id: "sent", conversationId: "c", sequence: 1, sender: 101,
      text: "First message", clientId: "send1", schemaVersion: 1, encryption: "server-aes-256-gcm",
      membershipVersion: 1, keyVersion: 1, createdAt: 1, deletedAt: null };
    const { ui, request, errors } = setup(async (method, path) => {
      if (method === "POST") {
        await gate;
        if (failed) throw new CloudError("cloud_temporarily_unavailable");
        return message;
      }
      return path === "/v1/groups/g" ? group : { items: [message], nextCursor: null };
    });
    const draft = { text: "First message", clientId: "send1" };
    const thread = new CloudGroupThread(ui, group, draft, {
      enterToSend: () => true, membershipChanged: vi.fn(), report: vi.fn(),
    });
    dispose.push(() => thread.stop(), () => ui.destroy());
    const host = document.createElement("div"), otherField = document.createElement("input");
    const shadow = host.attachShadow({ mode: "open" });
    document.body.append(host); shadow.append(thread.element, otherField);
    const input = thread.element.querySelector("textarea")!;
    input.focus();
    const enter = () => input.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Enter", bubbles: true, composed: true, cancelable: true,
    }));
    enter(); enter();
    expect(request.mock.calls.filter(([method]) => method === "POST")).toHaveLength(1);
    expect(thread.element.querySelector(".kl-message-receipt")).toBeNull();
    expect(input.disabled).toBe(false);
    expect(shadow.activeElement).toBe(input);
    if (next) { input.value = next; input.dispatchEvent(new Event("input", { bubbles: true })); }
    if (moveFocus) otherField.focus();
    finish();
    await vi.waitFor(() => {
      if (failed) expect(errors).toHaveLength(1);
      else expect(thread.element.querySelector('[data-message-id="sent"]')).not.toBeNull();
      expect(button(thread.element, "Send").disabled).toBe(!next);
    });
    expect(input.value).toBe(next);
    expect(draft.text).toBe(next);
    const receipt = thread.element.querySelector<HTMLElement>(".kl-message-receipt");
    if (failed) expect(receipt).toBeNull();
    else {
      expect(receipt?.dataset.state).toBe("sent");
      expect(receipt?.title).toBe("Sent to Cloud");
    }
    expect(shadow.activeElement).toBe(moveFocus ? otherField : input);
    expect(thread.element.querySelector("textarea")).toBe(input);
  });

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

describe("Feed navigation, highlights and reaction details", () => {
  it("opens mailbox targets in the main Feed column and jumps to the requested comment", async () => {
    const target = post(7, "# **Post heading**"), note = { ...post(80, "__*Comment*__"), postId: 7 };
    target.profile.displayName = "**Literal author**";
    const { ui, request } = setup(async (_method, path) => {
      if (path === "/v1/feed/7") return target;
      if (path === "/v1/comments/80") return note;
      if (path.startsWith("/v1/feed/7/comments")) return { items: [note], nextCursor: null };
      return { items: [target], nextCursor: null };
    });
    const view = feed(ui); await view.render({ reactionDetails: true }); await view.openPost(7, 80);
    expect(view.element.children).toHaveLength(1);
    expect(view.element.firstElementChild?.className).toBe("kl-feed-main");
    expect(view.element.querySelector('.kl-feed-main > [data-post-id="7"]')).not.toBeNull();
    expect(view.element.querySelector('.kl-feed-post-text [role="heading"] strong')?.textContent).toBe("Post heading");
    expect(view.element.querySelector('.kl-social-name')?.textContent).toBe("**Literal author**");
    expect(view.element.querySelector('.kl-social-name strong')).toBeNull();
    expect(view.element.querySelector('.kl-highlighted-comment u em')?.textContent).toBe("Comment");
    expect(view.element.querySelector('[aria-label="Comment options"]')).not.toBeNull();
    expect(request.mock.calls.some(([, path]) => path.includes('comments?cursor=79'))).toBe(true);
    button(view.element, "Back to latest Feed").click();
    await vi.waitFor(() => expect(view.element.querySelector(".kl-feed-aside")).not.toBeNull());
  });

  it("does not let an old mailbox request overwrite a newer navigation", async () => {
    let resolve!: (post: CloudPost) => void;
    const { ui } = setup(async (_method, path) => path === "/v1/feed/7" ? new Promise<CloudPost>(done => { resolve = done; }) : { items: [post(9)], nextCursor: null });
    const view=feed(ui), pending=view.openPost(7);
    await view.render(); resolve(post(7)); await pending;
    expect(view.element.querySelector('[data-post-id="9"]')).not.toBeNull();
    expect(view.element.querySelector('[data-post-id="7"]')).toBeNull();
  });

  it("refreshes a mailbox post without replacing media, animated badges or comment drafts, and removes unavailable content", async () => {
    let target = { ...post(7), mediaIds: ["photo"], pinnedAt: Date.now() }, unavailable = false;
    const { ui } = setup(async (_method, path) => {
      if (path === "/v1/feed/7") {
        if (unavailable) throw new CloudError("not_found", 404);
        return structuredClone(target);
      }
      return { items: [], nextCursor: null };
    });
    const view = feed(ui); await view.openPost(7);
    const card = view.element.querySelector<HTMLElement>('[data-post-id="7"]')!;
    const image = card.querySelector('[aria-label="Feed image"]'), badge = card.querySelector('.kl-feed-highlights')!.firstChild;
    const input = card.querySelector('textarea')!;
    input.value = "Keep my draft"; input.dispatchEvent(new Event("input")); input.focus();
    target = { ...target, text: "Updated post", revision: 2, commentCount: 1, reactions: { counts: [{ reaction: "heart", count: 2 }], mine: null } };
    expect(await view.sync()).toBe(true);
    expect(card.querySelector('.kl-feed-post-text')!.textContent).toBe("Updated post");
    expect(card.querySelector('[aria-label="Feed image"]')).toBe(image);
    expect(card.querySelector('.kl-feed-highlights')!.firstChild).toBe(badge);
    expect(input.value).toBe("Keep my draft"); expect(document.activeElement).toBe(input);
    expect(button(card, "Comments · 1")).toBeTruthy();
    expect(card.querySelector('.kl-reactions')!.textContent).toContain("2");
    unavailable = true; expect(await view.sync()).toBe(true);
    expect(view.element.querySelector('[data-post-id="7"]')).toBeNull();
    expect(view.element.textContent).toContain("This content is no longer available.");
  });

  it("discards a mailbox post refresh after returning to the Feed", async () => {
    let resolve: ((post: CloudPost) => void) | undefined, refresh = false;
    const { ui } = setup(async (_method, path) => path === "/v1/feed/7"
      ? refresh ? new Promise<CloudPost>(done => { resolve = done; }) : post(7)
      : { items: path.includes("comments") ? [] : [post(9)], nextCursor: null });
    const view = feed(ui); await view.openPost(7); refresh = true;
    const pending = view.sync(); await view.render(); resolve!(post(7, "Stale result")); await pending;
    expect(view.element.querySelector('[data-post-id="9"]')).not.toBeNull();
    expect(view.element.querySelector('[data-post-id="7"]')).toBeNull();
  });

  it("keeps pins above Featured and normal posts, avoids duplicates and updates pin actions", async () => {
    const pinned={...post(1),pinnedAt:Date.now()}, featured={...post(2),featuredUntil:Date.now()+43200000};
    const { ui, request }=setup(async (method,path,body) => {
      if(method==="PUT" && path.endsWith('/pin'))return {...pinned,pinnedAt:(body as {pinned:boolean}).pinned?Date.now():null};
      return {items:[post(3),featured],promoted:[pinned,featured],nextCursor:2};
    });
    const view=new CloudFeedView(ui,{openOwnProfile:vi.fn(),openGroups:vi.fn(),report:vi.fn(),canPin:()=>true});
    document.body.append(view.element);dispose.push(()=>view.destroy());
    await view.render({feedPins:true,feedFeatured:true});
    expect([...view.element.querySelectorAll<HTMLElement>('.kl-feed-post')].map(node=>node.dataset.postId)).toEqual(['1','2','3']);
    const card=view.element.querySelector<HTMLElement>('[data-post-id="1"]')!;
    expect(card.textContent).toContain('Pinned');
    expect(view.element.querySelector('[data-post-id="2"]')?.getAttribute('data-featured')).toBe('true');
    button(card,'Unpin post').click();
    await vi.waitFor(()=>expect(card.dataset.pinned).toBe('false'));
    expect([...view.element.querySelectorAll<HTMLElement>('.kl-feed-post')].map(node=>node.dataset.postId)).toEqual(['2','3','1']);
    expect(button(card,'Pin post')).toBeTruthy();
    expect(request).toHaveBeenCalledWith('PUT','/v1/feed/1/pin',{pinned:false});
  });

  it("shows people and emoji from post/comment menus without formatting their names", async () => {
    const {ui,request}=setup(async (_method,path)=>{
      if(path.startsWith('/v1/reactions/'))return {items:[{memberNumber:202,reaction:'wow',profile:{...profile(202),displayName:'**Someone**'}}],nextCursor:null};
      if(path.startsWith('/v1/feed/7/comments'))return {items:[{...post(9,'**Comment body**'),postId:7}],nextCursor:null};
      return {items:[post(7)],nextCursor:null};
    });
    const view=feed(ui);await view.render({reactionDetails:true});
    button(view.element,'Reactions').click();
    await vi.waitFor(()=>expect(document.querySelector('.kl-reaction-member-emoji')?.textContent).toBe('😮'));
    let dialog=document.querySelector<HTMLDialogElement>('.kl-reaction-details-dialog')!;
    expect(dialog.querySelector('.kl-social-name')?.textContent).toBe('**Someone**');
    expect(dialog.querySelector('strong')).toBeNull();dialog.close();
    button(view.element,'Comments · 0').click();
    await vi.waitFor(()=>expect(view.element.querySelector('.kl-social-comment')).not.toBeNull());
    const comment=view.element.querySelector<HTMLElement>('.kl-social-comment')!;
    expect(comment.querySelector('p strong')?.textContent).toBe('Comment body');
    button(comment,'Reactions').click();
    await vi.waitFor(()=>expect(request.mock.calls.some(([,path])=>path.startsWith('/v1/reactions/comment/9'))).toBe(true));
  });
});

describe("Feed read visibility", () => {
  it("observes the latest ordinary post behind pinned posts and clears it when partially visible while scrolling", async () => {
    const observed: Element[] = [];
    const original = globalThis.IntersectionObserver;
    vi.stubGlobal("IntersectionObserver", class {
      observe(target: Element) { observed.push(target); }
      disconnect() {}
    });
    dispose.push(() => { globalThis.IntersectionObserver = original; });
    const { ui } = setup(async () => ({ items: [post(20), post(19)], promoted: [{ ...post(2), pinnedAt: Date.now() }], nextCursor: null }));
    const read = vi.fn(async () => {});
    const view = new CloudFeedView(ui, { openOwnProfile: vi.fn(), openGroups: vi.fn(), report: vi.fn(), canRead: () => true, readFresh: read });
    dispose.push(() => view.destroy());
    const scroll = document.createElement("div"); scroll.className = "kl-cloud"; scroll.append(view.element); document.body.append(scroll);
    vi.spyOn(scroll, "getBoundingClientRect").mockReturnValue({ top: 100, bottom: 500 } as DOMRect);
    await view.render();
    expect(observed.at(-1)?.getAttribute("data-post-id")).toBe("20");
    expect(read).not.toHaveBeenCalled();
    const latest = view.element.querySelector<HTMLElement>('[data-post-id="20"]')!;
    vi.spyOn(latest, "getBoundingClientRect").mockReturnValue({ top: 70, bottom: 200, width: 400 } as DOMRect);
    scroll.dispatchEvent(new Event("scroll"));
    await vi.waitFor(() => expect(read).toHaveBeenCalledWith(20));
    scroll.dispatchEvent(new Event("scroll"));
    expect(read).toHaveBeenCalledOnce();
    view.destroy(); scroll.dispatchEvent(new Event("scroll")); expect(read).toHaveBeenCalledOnce();
  });

  it("keeps failed read acknowledgements retryable, and never reads a hidden panel", async () => {
    let reading = false;
    const { ui } = setup(async () => ({ items: [post(20)], nextCursor: null }));
    const read = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const view = new CloudFeedView(ui, { openOwnProfile: vi.fn(), openGroups: vi.fn(), report: vi.fn(), canRead: () => reading, readFresh: read });
    document.body.append(view.element); dispose.push(() => view.destroy());
    await view.render();
    const latest = view.element.querySelector<HTMLElement>('[data-post-id="20"]')!;
    vi.spyOn(latest, "getBoundingClientRect").mockReturnValue({ top: 20, bottom: 200, width: 400 } as DOMRect);
    view.observeFresh(); await Promise.resolve(); expect(read).not.toHaveBeenCalled();
    reading = true; view.observeFresh();
    await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());
    for (let i = 0; i < 10; i++) view.observeFresh();
    expect(read).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event("online"));
    await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    view.observeFresh(); expect(read).toHaveBeenCalledTimes(2);
  });
});
