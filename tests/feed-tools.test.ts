// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { CloudClient, CloudError } from "../src/cloud/client";
import { CloudFeedView, type SocialFeatures } from "../src/cloud/feed-view";
import { FeedPollView } from "../src/cloud/feed-poll";
import { SocialUI } from "../src/cloud/social-ui";
import { formatClockTime, getTimeFormatPreference, refreshClockText } from "../src/core/time-format";
import type { CloudComment, CloudPoll, CloudPost, CloudProfile } from "../src/cloud/types";

const cleanup: Array<() => void> = [];
afterEach(async () => { for (const close of cleanup.splice(0)) close(); await Promise.resolve(); document.body.replaceChildren(); localStorage.clear(); vi.restoreAllMocks(); });
const features: SocialFeatures = { feedBookmarks: true, feedReplies: true, feedFilters: true, feedPolls: true, feedWatch: true, feedHide: true, feedSpoilers: true, feedSearch: true };
const profile = (memberNumber = 101): CloudProfile => ({ memberNumber, displayName: `Person ${memberNumber}`, avatarId: null, avatarFrame: "none", bio: "", bannerId: null, profileStyle: "classic", revision: 1, visible: true, updatedAt: 0 });
const post = (extra: Partial<CloudPost> = {}): CloudPost => ({ id: 7, author: 202, profile: profile(202), text: "A post", revision: 1, createdAt: Date.now(), updatedAt: 0, mediaIds: [], reactions: { counts: [], mine: null }, commentCount: 0, bookmarked: false, hidden: false, watching: false, spoilerMediaIds: [], poll: null, ...extra });
const poll = (extra: Partial<CloudPoll> = {}): CloudPoll => ({ question: "Tonight?", options: [{ id: 1, text: "Games", votes: 1 }, { id: 2, text: "Movie", votes: 0 }], multiple: false, closesAt: Date.now() + 3_600_000, totalVoters: 1, myVotes: [], closed: false, ...extra });
function button(root: ParentNode, label: string): HTMLButtonElement {
  const result = [...root.querySelectorAll<HTMLButtonElement>("button")].find(node => node.getAttribute("aria-label") === label || node.textContent === label);
  if (!result) throw new Error(`Missing button ${label}`); return result;
}
function input(root: ParentNode, label: string, value: string): HTMLInputElement | HTMLTextAreaElement {
  const field = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[aria-label="${label}"]`)!;
  field.value = value; field.dispatchEvent(new Event("input")); return field;
}
function setup(handler: (method: string, path: string, body: any) => Promise<unknown>, platformPreview = false, canPin = false) {
  const request = vi.fn(handler), errors: unknown[] = [], image = vi.fn((id: string) => {
    const node = document.createElement("span"); node.dataset.image = id; return node;
  });
  const blocked = new Set<number>();
  const client = { memberNumber: 101, connected: true, request, profile: async (member: number) => profile(member), subscribe: () => () => {}, isProfileBlocked: () => false } as unknown as CloudClient;
  const ui = new SocialUI({ client, image, openProfile: () => {}, isBlocked: member => blocked.has(member), run: async (action, button) => {
    if (button) button.disabled = true;
    try { await action(); } catch (error) { errors.push(error); } finally { if (button) button.disabled = false; }
  } });
  const view = new CloudFeedView(ui, { platformPreview, canPin: () => canPin, openOwnProfile: () => {}, openGroups: () => {}, report: () => {} });
  document.body.append(view.element); cleanup.push(() => { view.destroy(); ui.destroy(); });
  return { view, ui, request, image, errors, blocked, client };
}

describe("Feed community tools", () => {
  it("starts the platform Feed at the post list and resumes a closed draft in its dialog", async () => {
    const { view, request } = setup(async (method, path, body) => method === "POST" && path === "/v1/feed"
      ? post({ id: 8, author: 101, text: body.text }) : { items: [post()], nextCursor: null }, true);
    await view.render(features);
    const card = view.element.querySelector(".kl-feed-post");
    expect(view.element.querySelector("h1")?.textContent).toBe("Feed");
    expect(card).not.toBeNull();
    expect(view.element.querySelector('[aria-label="Share a post"]')).toBeNull();

    const opener = button(view.element, "Post"); opener.click();
    const dialog = view.element.querySelector<HTMLDialogElement>(".kl-feed-compose-dialog")!;
    expect(dialog.open).toBe(true);
    const editor = input(dialog, "Share a post", "A draft kept when closing");
    expect(document.activeElement).toBe(editor);
    button(dialog, "Cancel").click();
    await vi.waitFor(() => expect(dialog.isConnected).toBe(false));
    expect(document.activeElement).toBe(opener);
    expect(request.mock.calls.some(([method]) => method === "POST")).toBe(false);

    button(view.element, "Resume draft").click();
    const reopened = view.element.querySelector<HTMLDialogElement>(".kl-feed-compose-dialog")!;
    expect(reopened.querySelector("textarea")?.value).toBe("A draft kept when closing");
    button(reopened, "Post").click();
    await vi.waitFor(() => expect(view.element.querySelector('[data-post-id="8"]')?.textContent).toContain("A draft kept when closing"));
    await vi.waitFor(() => expect(reopened.isConnected).toBe(false));
    expect(view.element.querySelector('[data-post-id="7"]')).toBe(card);
    expect(document.activeElement).toBe(opener);
    expect(opener.textContent).toBe("Post");
  });

  it("opens Comments with the live post and preserves its actions, draft and opener when closed", async () => {
    const entry = post({ commentCount: 0, text: "Discuss this update" });
    const { view } = setup(async (_method, path) => path.includes("/comments")
      ? { items: [], nextCursor: null } : { items: [structuredClone(entry)], nextCursor: null }, true);
    await view.render(features);
    const card = view.element.querySelector<HTMLElement>("[data-post-id]")!;
    const opener = button(card, "Comments · 0");
    const author = card.querySelector(".kl-social-author");
    opener.click();
    await vi.waitFor(() => expect(card.querySelector("dialog[open] textarea")).not.toBeNull());
    const dialog = card.querySelector<HTMLDialogElement>("dialog[open]")!;
    expect(dialog.querySelector(".kl-comment-subject .kl-social-author")).toBe(author);
    expect(dialog.querySelector(".kl-comment-subject")?.textContent).toContain("Discuss this update");
    expect(dialog.querySelector("label")?.textContent).toBe("Add a comment");
    const draft = input(dialog, "Comment", "Remember my draft");
    expect(draft.maxLength).toBe(500);
    expect(dialog.querySelector(".kl-comment-spoiler-tool")).toBeNull();
    expect(dialog.querySelector(".kl-comment-counter")?.textContent).toContain(String(draft.value.length));
    button(dialog, "Close").click();
    expect(card.querySelector("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(card.querySelector(".kl-social-author")).toBe(author);
    opener.click();
    await vi.waitFor(() => expect(card.querySelector<HTMLTextAreaElement>("dialog[open] textarea")?.value).toBe("Remember my draft"));
    view.destroy();
  });

  it("opens archived community comments for reading while keeping posting and reply controls locked", async () => {
    const entry = post({ community: { id: "garden", name: "Garden", archived: true }, commentCount: 1 });
    const own = { id: 31, postId: 7, author: 101, profile: profile(101), text: "Saved comment", revision: 1,
      createdAt: 5, updatedAt: 5, reactions: { counts: [], mine: null }, parentId: null };
    const { view, request } = setup(async (_method, path) => path.includes("/comments")
      ? { items: [own], nextCursor: null } : { items: [structuredClone(entry)], nextCursor: null }, true);
    await view.render(features); button(view.element, "Comments · 1").click();
    await vi.waitFor(() => expect(view.element.querySelector("[data-comment-id]")).not.toBeNull());
    const dialog = view.element.querySelector("dialog[open]")!;
    expect(dialog.textContent).toContain("Saved comment");
    expect(dialog.querySelector<HTMLTextAreaElement>("textarea")?.disabled).toBe(true);
    expect(button(dialog, "Reply").disabled).toBe(true);
    expect(button(dialog, "Send comment").disabled).toBe(true);
    expect(dialog.querySelector('[data-comment-id] [aria-label="Edit"]')).toBeNull();
    expect(dialog.querySelector<HTMLElement>("[data-comment-id] .kl-reactions")?.inert).toBe(true);
    expect(request.mock.calls.every(([method]) => method === "GET")).toBe(true);
  });

  it("matches the post menu for owners and peers, persists private pins across refresh and keeps other tools accessible", async () => {
    const owner = post({ id: 5, author: 101, profile: profile(101), createdAt: 2 });
    const other = post({ id: 7, createdAt: 3 });
    const { view, request } = setup(async () => ({ items: [structuredClone(other), structuredClone(owner)], nextCursor: null }), true);
    const capabilities = { ...features, reactionDetails: true, feedPins: false };
    await view.render(capabilities);
    const card = (id: number) => view.element.querySelector<HTMLElement>(`[data-post-id="${id}"]`)!;
    const menu = (id: number) => card(id).querySelector('[aria-label="Post options"]')!.parentElement!;
    const labels = (node: Element) => [...node.querySelectorAll("button")].map(b => b.textContent);
    expect(labels(menu(7))).toEqual(["Open conversation", "Who reacted", "Save post", "Report post…", "Copy text", "Follow comments", "Hide post", "Block author"]);
    expect(labels(menu(5))).toEqual(["Open conversation", "Who reacted", "Save post", "Edit post", "Pin your post", "Delete post…", "Copy text", "Follow comments", "Hide post"]);
    button(menu(5), "Pin your post").click();
    await vi.waitFor(() => expect(labels(menu(5))).toContain("Unpin your post"));
    expect(view.element.querySelector(".kl-feed-posts > article")?.getAttribute("data-post-id")).toBe("5");
    await view.render(capabilities);
    expect(card(5).dataset.pinned).toBe("true"); expect(card(7).dataset.pinned).toBe("false");
    button(menu(5), "Unpin your post").click();
    await vi.waitFor(() => expect(card(5).dataset.pinned).toBe("false"));
    expect(request.mock.calls.some(([method]) => method === "PUT")).toBe(false);
    const options = menu(7) as HTMLDetailsElement;
    expect(card(7).querySelectorAll(":scope > header > details")).toHaveLength(1);
    options.querySelector("summary")!.click();
    expect(options.open).toBe(true);
    options.querySelector("summary")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(options.open).toBe(false);
    for (const key of ["F10", "ContextMenu"]) {
      options.querySelector("summary")!.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey: key === "F10", bubbles: true }));
      expect(options.open).toBe(true);
      expect(document.activeElement).toBe(button(options, "Open conversation"));
      options.open = false;
    }
    vi.useFakeTimers();
    try {
      const body = card(7).querySelector(".kl-feed-post-text")!;
      const touch = { bubbles: true, pointerType: "touch", isPrimary: true, pointerId: 1, clientX: 10, clientY: 10 };
      body.dispatchEvent(new PointerEvent("pointerdown", touch));
      body.dispatchEvent(new PointerEvent("pointermove", { ...touch, clientY: 80 }));
      vi.advanceTimersByTime(600);
      expect(options.open).toBe(false);
      body.dispatchEvent(new PointerEvent("pointerdown", touch));
      vi.advanceTimersByTime(600);
      expect(options.open).toBe(true);
      body.dispatchEvent(new PointerEvent("contextmenu", { ...touch, cancelable: true }));
      expect(options.open).toBe(true);
      expect(card(7).querySelectorAll("details[open]")).toHaveLength(1);
      card(5).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
      expect((menu(5) as HTMLDetailsElement).open).toBe(true);
      expect(options.open).toBe(false);
    } finally { vi.useRealTimers(); }
  });

  it("gives moderators one authoritative pin on their own post even with a saved private pin", async () => {
    const entry = post({ author: 101, profile: profile(101), createdAt: 5 });
    localStorage.setItem("kikilink:feed:personal-pin:v1::101:legacy:7:5", "1");
    const { view, request, errors } = setup(async (method, path, body) => {
      if (method === "PUT" && path === "/v1/feed/7/pin") {
        entry.pinnedAt = body.pinned ? 123 : null;
        return structuredClone(entry);
      }
      return { items: [structuredClone(entry)], nextCursor: null };
    }, true, true);
    await view.render({ ...features, feedPins: true });
    const card = view.element.querySelector<HTMLElement>("[data-post-id]")!;
    const header = card.querySelector("header")!;
    expect(header.querySelectorAll("details")).toHaveLength(1);
    expect(header.querySelector(".kl-post-personal-pin")).toBeNull();
    expect(card.dataset.pinned).toBe("false");
    card.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    button(header, "Pin post").click();
    await vi.waitFor(() => expect(card.dataset.pinned).toBe("true"));
    expect(card.querySelectorAll(".kl-feed-highlights > span")).toHaveLength(1);
    button(header, "Unpin post").click();
    await vi.waitFor(() => expect(card.dataset.pinned).toBe("false"));
    expect(request.mock.calls.filter(([method]) => method === "PUT").map(([, , body]) => body)).toEqual([{ pinned: true }, { pinned: false }]);
    expect(errors).toEqual([]);
  });

  it("clears a submitted platform search, restores focus and keeps compact post labels accessible", async () => {
    const now = Date.now();
    let state = post({ pinnedAt: now, createdAt: now - 1, updatedAt: now, commentCount: 2 });
    const { view, request, errors } = setup(async (_method, path) => ({
      items: path.includes("q=") ? [] : [structuredClone(state)], nextCursor: null,
    }), true);
    await view.render(features);
    const search = input(view.element, "Search feed", "missing");
    expect(button(view.element, "Clear search").hidden).toBe(false);
    search.closest("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(view.element.querySelector(".kl-feed-empty h2")?.textContent).toBe("No posts found"));
    expect(request.mock.calls.at(-1)?.[1]).toContain("q=missing");

    button(view.element, "Clear search").click();
    await vi.waitFor(() => expect(view.element.querySelector(".kl-feed-post")).not.toBeNull());
    expect(document.activeElement).toBe(view.element.querySelector(".kl-feed-search"));
    expect(button(view.element, "Clear search").hidden).toBe(true);
    expect(request.mock.calls.at(-1)?.[1]).not.toContain("q=");
    expect(view.element.querySelector(".kl-feed-post-header .kl-social-meta .kl-feed-highlights")?.textContent).toBe("Pinned");
    expect(view.element.querySelector(".kl-feed-post-header .kl-social-meta .kl-social-edited")?.textContent).toBe("Edited");
    expect(button(view.element, "Comments · 2").textContent).toBe("2");

    state = { ...state, commentCount: 3 };
    await view.sync();
    expect(button(view.element, "Comments · 3").textContent).toBe("3");
    expect(errors).toEqual([]);
  });

  it("shows the author's local date and chosen clock, and keeps reactions ahead of the picker", async () => {
    const at = new Date(2026, 9, 13, 18, 35).getTime();
    const entry = post({ createdAt: at, updatedAt: at, reactions: { mine: null, counts: [{ reaction: "heart", count: 2 }] } });
    const { view } = setup(async () => ({ items: [entry], nextCursor: null }), true);
    await view.render(features);
    const stamp = view.element.querySelector("time")!;
    const format = getTimeFormatPreference();
    try {
      for (const preference of ["12-hour", "24-hour"] as const) {
        refreshClockText(view.element, preference);
        expect(stamp.textContent).toContain(` · ${formatClockTime(at, preference)}`);
        expect(stamp.dateTime).toBe(new Date(at).toISOString());
      }
    } finally { refreshClockText(view.element, format); }
    const actions = view.element.querySelector(".kl-feed-post-actions > .kl-reactions")!;
    expect(actions.firstElementChild?.classList.contains("kl-reaction")).toBe(true);
    expect(actions.lastElementChild?.classList.contains("kl-reaction-picker")).toBe(true);
  });

  it("keeps a pending poll choice through a count refresh and marks the confirmed choice when voting closes", async () => {
    const start = poll();
    let entry = post({ poll: start });
    const { view } = setup(async () => ({ items: [structuredClone(entry)], nextCursor: null }), true);
    await view.render(features);
    const field = view.element.querySelector<HTMLInputElement>('.kl-feed-poll-choice input[aria-label="Games"]')!;
    field.click();
    entry = { ...entry, poll: { ...start, totalVoters: 2 } };
    await view.sync();
    expect(view.element.querySelector('.kl-feed-poll-choice input[aria-label="Games"]')).toBe(field);
    expect(field.checked).toBe(true);
    expect(view.element.querySelector(".kl-feed-poll-meta")?.textContent).toContain("2 voters · Single answer");
    entry = { ...entry, poll: { ...start, closed: true, myVotes: [1] } };
    await view.sync();
    expect(view.element.querySelector('.kl-feed-poll-result[data-mine="true"]')?.textContent).toContain("Games · Your vote");
    expect(view.element.querySelector(".kl-feed-poll-actions")?.textContent).toBe("Voting closed");
    expect(view.element.querySelector(".kl-feed-poll-actions button")).toBeNull();
  });

  it("uses server views for Friends, Saved and Hidden, and leaves old servers on Everyone/My posts", async () => {
    const { view, request } = setup(async () => ({ items: [], nextCursor: null })); await view.render(features);
    for (const [label, filter] of [["Friends", "friends"], ["Saved", "saved"], ["Hidden", "hidden"]]) {
      button(view.element, label!).click(); await vi.waitFor(() => expect(request.mock.calls.at(-1)?.[1]).toContain(`filter=${filter}`));
    }
    await view.render({}); expect(view.element.querySelector('[aria-label="Saved"]')).toBeNull();
    expect(request.mock.calls.at(-1)?.[1]).not.toContain("filter=");
  });

  it("saves and follows in place, hides with Undo and restores the same post", async () => {
    let state = post({ mediaIds: ["photo"] });
    const { view, request } = setup(async (method, _path, body) => {
      if (method === "PUT") { state = { ...state, ...body }; return structuredClone(state); }
      return { items: state.hidden ? [] : [structuredClone(state)], nextCursor: null };
    }); await view.render(features);
    const card = view.element.querySelector<HTMLElement>(".kl-feed-post")!, image = card.querySelector("[data-image]");
    button(card, "Save post").click(); await vi.waitFor(() => expect(button(card, "Unsave post")).toBeTruthy());
    button(card, "Follow comments").click(); await vi.waitFor(() => expect(button(card, "Unfollow comments")).toBeTruthy());
    expect(card.querySelector("[data-image]")).toBe(image);
    button(card, "Hide post").click(); await vi.waitFor(() => expect(card.isConnected).toBe(false));
    expect(document.activeElement).toBe(button(view.element, "Undo"));
    button(view.element, "Undo").click(); await vi.waitFor(() => expect(view.element.querySelector(".kl-feed-post")).not.toBeNull());
    expect(request.mock.calls.filter(([method]) => method === "PUT").map(([, path]) => path)).toEqual(["/v1/feed/7/bookmark", "/v1/feed/7/watch", "/v1/feed/7/hide", "/v1/feed/7/hide"]);
  });

  it("does not fetch image spoilers before explicit reveal and retains the revealed image on sync", async () => {
    let state = post({ text: "A ||secret|| post", mediaIds: ["secret-image"], spoilerMediaIds: ["secret-image"] });
    const { view, image } = setup(async () => ({ items: [structuredClone(state)], nextCursor: null })); await view.render(features);
    expect(image).not.toHaveBeenCalled(); button(view.element, "Reveal image spoiler").click();
    expect(image).toHaveBeenCalledTimes(1); const decoded = view.element.querySelector("[data-image]");
    state = { ...state, commentCount: 2 }; await view.sync();
    expect(view.element.querySelector("[data-image]")).toBe(decoded); expect(image).toHaveBeenCalledTimes(1);
    expect(view.element.querySelector(".kl-feed-post-text [aria-expanded='false']")).not.toBeNull();
  });

  it("creates poll-only posts with one stable closing timestamp and preserves new typing", async () => {
    let finish!: (value: CloudPost) => void;
    const { view, request } = setup(async (method, path) => method === "POST" && path === "/v1/feed"
      ? new Promise<CloudPost>(resolve => { finish = resolve; }) : { items: [], nextCursor: null });
    await view.render(features); button(view.element, "Poll").click();
    input(view.element, "Poll question", "Tonight?"); input(view.element, "Poll option 1", "Games"); input(view.element, "Poll option 2", "Movie");
    button(view.element, "Post").click(); await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    const sent = request.mock.calls.find(([method]) => method === "POST")![2];
    expect(sent.poll).toMatchObject({ question: "Tonight?", options: ["Games", "Movie"], multiple: false });
    input(view.element, "Share a post", "Next thought"); finish(post({ author: 101, text: "", poll: poll() }));
    await vi.waitFor(() => expect(view.element.querySelector(".kl-feed-poll-editor")).toBeNull());
    expect(view.element.querySelector<HTMLTextAreaElement>('[aria-label="Share a post"]')!.value).toBe("Next thought");
  });

  it("resolves an uncertain POST using its original body and key before consuming only the sent prefix", async () => {
    let reject!: (error: Error) => void, attempts = 0;
    const { view, request, errors } = setup(async (method, path) => {
      if (method === "POST" && path === "/v1/feed") { attempts++; if (attempts === 1) return new Promise((_resolve, fail) => { reject = fail; }); return post({ author: 101, text: "First" }); }
      return { items: [], nextCursor: null };
    }); await view.render(features);
    input(view.element, "Share a post", "First"); button(view.element, "Post").click(); await vi.waitFor(() => expect(reject).toBeTypeOf("function"));
    input(view.element, "Share a post", "First plus next"); reject(new CloudError("network_error"));
    await vi.waitFor(() => expect(errors).toHaveLength(1)); button(view.element, "Retry post").click();
    await vi.waitFor(() => expect(attempts).toBe(2));
    const sent = request.mock.calls.filter(([method, path]) => method === "POST" && path === "/v1/feed").map(([, , body]) => body);
    expect(sent[1]).toEqual(sent[0]); expect(sent[1].text).toBe("First");
    await vi.waitFor(() => expect(view.element.querySelector<HTMLTextAreaElement>('[aria-label="Share a post"]')!.value).toBe(" plus next"));
  });

  it("retries an uncertain comment with its original mention text and key while preserving newer typing", async () => {
    let reject!: (error: Error) => void, attempts = 0;
    const created: CloudComment = { ...post(), id: 11, author: 101, profile: profile(), text: "Hello @bravo", postId: 7, parentId: null, replyTo: null };
    const { view, request, errors } = setup(async (method, path) => {
      if (path.includes("comments")) {
        if (method === "POST") { attempts++; if (attempts === 1) return new Promise((_resolve, fail) => { reject = fail; }); return created; }
        return { items: [], nextCursor: null };
      }
      return { items: [post()], nextCursor: null };
    });
    await view.render({ ...features, mentions: true }); button(view.element, "Comments · 0").click();
    await vi.waitFor(() => expect(view.element.querySelector('[aria-label="Comment"]')).not.toBeNull());
    input(view.element, "Comment", created.text); button(view.element, "Send comment").click();
    await vi.waitFor(() => expect(reject).toBeTypeOf("function"));
    input(view.element, "Comment", "A separate newer thought"); reject(new CloudError("network_error"));
    await vi.waitFor(() => expect(errors).toHaveLength(1)); button(view.element, "Send comment").click();
    await vi.waitFor(() => expect(view.element.querySelector('[data-comment-id="11"]')).not.toBeNull());
    const sent = request.mock.calls.filter(([method]) => method === "POST").map(([, , body]) => body);
    expect(sent).toHaveLength(2); expect(sent[1]).toEqual(sent[0]);
    expect(sent[0]).toMatchObject({ text: created.text, clientId: expect.any(String) });
    expect(view.element.querySelector<HTMLTextAreaElement>('[aria-label="Comment"]')!.value).toBe("A separate newer thought");
    expect(view.element.querySelectorAll('[data-comment-id="11"]')).toHaveLength(1);
    expect(button(view.element, "Comments · 1")).toBeTruthy();
  });

  it("allows a corrected comment with a new key after a definite validation failure", async () => {
    let attempts = 0;
    const { view, request, errors } = setup(async (method, path, body) => {
      if (path.includes("comments")) {
        if (method === "POST") {
          if (++attempts === 1) throw new CloudError("too_many_mentions", 400);
          return { ...post(), id: 11, author: 101, profile: profile(), text: body.text, postId: 7, parentId: null, replyTo: null };
        }
        return { items: [], nextCursor: null };
      }
      return { items: [post()], nextCursor: null };
    });
    await view.render({ ...features, mentions: true }); button(view.element, "Comments · 0").click();
    await vi.waitFor(() => expect(view.element.querySelector('[aria-label="Comment"]')).not.toBeNull());
    input(view.element, "Comment", "Rejected draft"); button(view.element, "Send comment").click();
    await vi.waitFor(() => expect(errors).toHaveLength(1));
    expect(view.element.querySelector<HTMLTextAreaElement>('[aria-label="Original Feed draft"]')!.value).toBe('Rejected draft');
    expect(request.mock.calls.filter(([method])=>method==='POST')).toHaveLength(1);
    button(view.element,'Discard saved request').click();button(view.element,'Discard').click();
    await vi.waitFor(()=>expect(view.element.querySelector('[aria-label="Original Feed draft"]')).toBeNull());
    button(view.element,'Comments · 0').click();await vi.waitFor(()=>expect(view.element.querySelector('[aria-label="Comment"]')).not.toBeNull());
    input(view.element, "Comment", "Hello @bravo"); button(view.element, "Send comment").click();
    await vi.waitFor(() => expect(view.element.querySelector('[data-comment-id="11"]')).not.toBeNull());
    const sent = request.mock.calls.filter(([method]) => method === "POST").map(([, , body]) => body);
    expect(sent[1].text).toBe("Hello @bravo"); expect(sent[1].clientId).not.toBe(sent[0].clientId);
    expect(view.element.querySelector<HTMLTextAreaElement>('[aria-label="Comment"]')!.value).toBe("");
  });

  it("sends parent IDs and displays compact reply threads without inserting name prefixes into text", async () => {
    const parent: CloudComment = { ...post(), id: 11, text: "Parent", postId: 7, parentId: null, replyTo: null };
    const child: CloudComment = { ...parent, id: 12, text: "My reply", author: 101, profile: profile(), parentId: 11, replyTo: { id: 11, author: parent.author, profile: parent.profile, text: parent.text } };
    const { view, request } = setup(async (method, path) => path.includes("comments") ? method === "POST" ? child : { items: [parent], nextCursor: null } : { items: [post()], nextCursor: null });
    await view.render(features); button(view.element, "Comments · 0").click(); await vi.waitFor(() => expect(view.element.querySelector(".kl-social-comment")).not.toBeNull());
    button(view.element.querySelector(".kl-social-comment")!, "Reply").click();
    expect(view.element.querySelector(".kl-comment-reply-bar")!.textContent).toContain("Replying to Person 202");
    input(view.element, "Comment", "My reply"); button(view.element, "Send comment").click();
    await vi.waitFor(() => expect(view.element.querySelector('.kl-comment-thread [data-comment-id="12"]')).not.toBeNull());
    expect(request.mock.calls.find(([method]) => method === "POST")?.[2]).toEqual({ text: "My reply", parentId: 11 });
    expect(view.element.querySelector<HTMLTextAreaElement>('[aria-label="Comment"]')!.value).toBe("");
  });

  it("preserves existing poll and media spoilers in the post editor", async () => {
    const original = post({ author: 101, profile: profile(), mediaIds: ["photo"], spoilerMediaIds: ["photo"], poll: poll() });
    const { view, request } = setup(async (method, _path, body) => method === "PATCH" ? { ...original, ...body, revision: 2 } : { items: [original], nextCursor: null });
    await view.render(features); button(view.element, "Edit post").click();
    const dialog = document.querySelector<HTMLDialogElement>(".kl-feed-action-dialog")!;
    input(dialog, "Post text", "Changed intro"); button(dialog, "Save changes").click();
    await vi.waitFor(() => expect(dialog.open).toBe(false));
    expect(request.mock.calls.find(([method]) => method === "PATCH")?.[2]).toMatchObject({ text: "Changed intro", mediaIds: ["photo"], spoilerMediaIds: ["photo"] });
    expect(view.element.querySelector(".kl-feed-poll h4")!.textContent).toBe("Tonight?");
    expect(view.element.querySelector(".kl-feed-spoiler-reveal")).not.toBeNull();
  });

  it("keeps a focused selected poll option mounted during live count changes and uses one bounded vote request", async () => {
    const { ui } = setup(async () => ({})); let pollView!: FeedPollView;
    const vote = vi.fn(async (ids: number[]) => { pollView.update(poll({ myVotes: ids, totalVoters: 3 })); });
    pollView = new FeedPollView(ui, poll(), vote); document.body.append(pollView.element); cleanup.push(() => pollView.destroy());
    const option = pollView.element.querySelector<HTMLInputElement>('input[aria-label="Games"]')!;
    option.checked = true; option.dispatchEvent(new Event("change")); option.focus();
    pollView.update(poll({ totalVoters: 2 })); expect(document.activeElement).toBe(option); expect(option.isConnected).toBe(true);
    button(pollView.element, "Vote").click(); await vi.waitFor(() => expect(vote).toHaveBeenCalledWith([1]));
    await vi.waitFor(() => expect(pollView.element.querySelectorAll(".kl-feed-poll-result")).toHaveLength(2));
    expect(button(pollView.element, "Change vote")).toBeTruthy();
  });

  it("keeps visible replies when a parent is blocked and cannot resurrect that parent on later sends", async () => {
    const parent: CloudComment = { ...post(), id: 11, author: 303, profile: profile(303), text: "Blocked body", postId: 7, parentId: null, replyTo: null };
    const child: CloudComment = { ...parent, id: 12, author: 404, profile: profile(404), text: "Visible reply", parentId: 11, replyTo: { id: 11, author: 303, profile: parent.profile, text: parent.text } };
    const { view, blocked } = setup(async (method, path) => path.includes("comments") ? method === "POST" ? { ...child, id: 13, text: "New comment", parentId: null, replyTo: null } : { items: [parent, child], nextCursor: null } : { items: [post()], nextCursor: null });
    await view.render(features); button(view.element, "Comments · 0").click();
    await vi.waitFor(() => expect(view.element.querySelector('[data-comment-id="12"]')).not.toBeNull());
    button(view.element.querySelector('[data-comment-id="11"]')!, "Reply").click(); blocked.add(303); view.removeBlocked();
    expect(view.element.querySelector('[data-comment-id="11"]')).toBeNull(); expect(view.element.querySelector('[data-comment-id="12"]')).not.toBeNull();
    expect(view.element.querySelector(".kl-comment-reply-bar")!.textContent).toBe("");
    expect(view.element.querySelector('.kl-comment-parent')?.getAttribute("aria-label")).toBe("Reply to an unavailable comment");
    input(view.element, "Comment", "New comment"); button(view.element, "Send comment").click();
    await vi.waitFor(() => expect(view.element.querySelector('[data-comment-id="13"]')).not.toBeNull());
    expect(view.element.querySelector('[data-comment-id="11"]')).toBeNull(); expect(view.element.textContent).not.toContain("Blocked body");
  });

  it("does not steal focus from a new post draft when a slow comment completes", async () => {
    let finish!: (value: CloudComment) => void;
    const { view } = setup(async (method, path) => path.includes("comments") ? method === "POST" ? new Promise(resolve => { finish = resolve; }) : { items: [], nextCursor: null } : { items: [post()], nextCursor: null });
    await view.render(features); button(view.element, "Comments · 0").click(); await vi.waitFor(() => expect(view.element.querySelector('[aria-label="Comment"]')).not.toBeNull());
    input(view.element, "Comment", "Sent comment"); button(view.element, "Send comment").click();
    await vi.waitFor(() => expect(finish).toBeTypeOf("function")); const composer = input(view.element, "Share a post", "My new post"); composer.focus();
    finish({ ...post(), id: 11, postId: 7, text: "Sent comment", parentId: null, replyTo: null });
    await vi.waitFor(() => expect(view.element.querySelector('[data-comment-id="11"]')).not.toBeNull()); expect(document.activeElement).toBe(composer);
  });

  it("restores a frozen post after reload and retries its exact body before preserving the newer draft", async () => {
    let sent: unknown;
    const first = setup(async (method, _path, body) => {
      if (method === "POST") { sent = body; throw new CloudError("network_error"); }
      return { items: [], nextCursor: null };
    }); await first.view.render(features); input(first.view.element, "Share a post", "Frozen post"); button(first.view.element, "Post").click();
    await vi.waitFor(() => expect(first.errors).toHaveLength(1)); input(first.view.element, "Share a post", "Frozen post + next"); first.view.destroy();
    const second = setup(async (method, _path, body) => {
      if (method === "POST") { expect(body).toEqual(sent); return post({ author: 101, text: "Frozen post" }); }
      return { items: [], nextCursor: null };
    }); await second.view.render(features); expect(button(second.view.element, "Retry post")).toBeTruthy(); button(second.view.element, "Retry post").click();
    await vi.waitFor(() => expect(second.view.element.querySelector<HTMLTextAreaElement>('[aria-label="Share a post"]')!.value).toBe(" + next"));
    expect(second.errors).toHaveLength(0);
  });
});
