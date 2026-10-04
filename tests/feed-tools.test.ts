// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { CloudClient, CloudError } from "../src/cloud/client";
import { CloudFeedView, type SocialFeatures } from "../src/cloud/feed-view";
import { FeedPollView } from "../src/cloud/feed-poll";
import { SocialUI } from "../src/cloud/social-ui";
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
function setup(handler: (method: string, path: string, body: any) => Promise<unknown>) {
  const request = vi.fn(handler), errors: unknown[] = [], image = vi.fn((id: string) => {
    const node = document.createElement("span"); node.dataset.image = id; return node;
  });
  const blocked = new Set<number>();
  const client = { memberNumber: 101, connected: true, request, profile: async (member: number) => profile(member), subscribe: () => () => {}, isProfileBlocked: () => false } as unknown as CloudClient;
  const ui = new SocialUI({ client, image, openProfile: () => {}, isBlocked: member => blocked.has(member), run: async (action, button) => {
    if (button) button.disabled = true;
    try { await action(); } catch (error) { errors.push(error); } finally { if (button) button.disabled = false; }
  } });
  const view = new CloudFeedView(ui, { openOwnProfile: () => {}, openGroups: () => {}, report: () => {} });
  document.body.append(view.element); cleanup.push(() => { view.destroy(); ui.destroy(); });
  return { view, ui, request, image, errors, blocked, client };
}

describe("Feed community tools", () => {
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
