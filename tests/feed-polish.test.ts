// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CloudClient } from "../src/cloud/client";
import { CloudFeedView } from "../src/cloud/feed-view";
import { FeedPollView } from "../src/cloud/feed-poll";
import { REACTIONS, SocialUI } from "../src/cloud/social-ui";
import { CLOUD_STYLES } from "../src/cloud/styles";
import type { CloudPoll, CloudPost, CloudReactions } from "../src/cloud/types";

const cleanup: Array<() => void> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) close();
  await Promise.resolve(); document.body.replaceChildren(); localStorage.clear(); vi.restoreAllMocks();
});
const profile = { memberNumber: 202, displayName: "Friend", avatarId: null, avatarFrame: "none" as const };
const post = (reactions: CloudReactions = { counts: [], mine: null }): CloudPost => ({ id: 7, author: 202, profile, text: "A post", revision: 1, createdAt: Date.now(), updatedAt: 0, mediaIds: [], reactions, commentCount: 0 });
const poll = (myVotes: number[] = []): CloudPoll => ({ question: "Tonight?", options: [{ id: 1, text: "Games", votes: 1 }, { id: 2, text: "Movie", votes: 0 }], multiple: false, closesAt: Date.now() + 3_600_000, totalVoters: 1, myVotes, closed: false });
function setup(handler: (method: string, path: string, body: any) => Promise<unknown>) {
  const request = vi.fn(handler), errors: unknown[] = [];
  const client = { memberNumber: 101, connected: true, request, profile: async () => profile, subscribe: () => () => {}, isProfileBlocked: () => false } as unknown as CloudClient;
  const ui = new SocialUI({ client, image: () => document.createElement("span"), openProfile: () => {}, isBlocked: () => false,
    run: async (action, button) => { if (button) button.disabled = true; try { await action(); } catch (error) { errors.push(error); } finally { if (button) button.disabled = false; } } });
  const view = new CloudFeedView(ui, { openOwnProfile: () => {}, openGroups: () => {}, report: () => {} });
  const surface = document.createElement("div"); surface.className = "kl-cloud"; surface.append(view.element); document.body.append(surface);
  cleanup.push(() => { view.destroy(); ui.destroy(); }); return { view, ui, request, errors };
}

describe("Feed interaction polish", () => {
  it("marks an attached photo using a corner icon without replacing the preview and posts its spoiler flag", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:photo"); vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const { view, request } = setup(async (method, path) => path === "/v1/media/feed" ? { id: "photo-id" } : method === "POST" ? post() : { items: [], nextCursor: null });
    await view.render({ feedSpoilers: true });
    const style = document.createElement("style"); style.textContent = CLOUD_STYLES; document.body.append(style);
    const files = view.element.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(files, "files", { value: [new File(["pixels"], "photo.png", { type: "image/png" })] }); files.dispatchEvent(new Event("change"));
    const attachment = view.element.querySelector<HTMLElement>(".kl-feed-attachment")!, image = attachment.querySelector("img");
    const spoiler = attachment.querySelector<HTMLButtonElement>(".kl-feed-attachment-spoiler")!;
    expect(spoiler.classList.contains("kl-social-icon-button")).toBe(true);
    expect(spoiler.querySelector("svg")).not.toBeNull(); expect(spoiler.getAttribute("aria-pressed")).toBe("false");
    expect(parseFloat(getComputedStyle(spoiler).width)).toBe(44); expect(parseFloat(getComputedStyle(spoiler).minHeight)).toBe(44);
    expect(getComputedStyle(attachment.querySelector(".kl-feed-attachment-image")!).overflow).toBe("hidden");
    spoiler.click();
    expect(spoiler.getAttribute("aria-pressed")).toBe("true"); expect(spoiler.getAttribute("aria-label")).toBe("Remove spoiler from photo.png");
    expect(attachment.dataset.spoiler).toBe("true"); expect(attachment.querySelector("img")).toBe(image);
    view.element.querySelector<HTMLButtonElement>('[aria-label="Post"]')!.click();
    await vi.waitFor(() => expect(request.mock.calls.find(([method, path]) => method === "POST" && path === "/v1/feed")?.[2]).toMatchObject({ mediaIds: ["photo-id"], spoilerMediaIds: ["photo-id"] }));
  });

  it("keeps twenty choices in the picker while only active reaction counts occupy the post row", async () => {
    const state: CloudReactions = { counts: [{ reaction: "like", count: 3 }, { reaction: "wow", count: 1 }], mine: "like" };
    const { view } = setup(async () => ({ items: [post(state)], nextCursor: null }));
    await view.render({ reactions: REACTIONS.map(([id]) => id) });
    const root = view.element.querySelector(".kl-feed-post > footer > .kl-reactions")!;
    expect(root.querySelectorAll(":scope > .kl-reaction")).toHaveLength(2);
    expect(root.querySelectorAll(".kl-reaction-choices > button")).toHaveLength(20);
    expect(root.querySelector("details")!.open).toBe(false);
  });

  it("supports arrow navigation, Escape, one-tap touch selection and outside dismissal through the existing menu", async () => {
    const { view, request } = setup(async (method, _path, body) => method === "PUT" ? { mine: body.reaction, counts: [{ reaction: body.reaction, count: 1 }] } : { items: [post()], nextCursor: null });
    await view.render({ reactions: REACTIONS.map(([id]) => id) });
    let picker = view.element.querySelector<HTMLDetailsElement>(".kl-reaction-picker")!, summary = picker.querySelector("summary")!;
    summary.focus(); summary.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    const choices = [...picker.querySelectorAll<HTMLButtonElement>("button")];
    expect(picker.open).toBe(true); expect(document.activeElement).toBe(choices[0]);
    choices[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })); expect(document.activeElement).toBe(choices[4]);
    choices[4]!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); expect(picker.open).toBe(false); expect(document.activeElement).toBe(summary);
    picker.open = true;
    choices[0]!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true, pointerType: "touch" }));
    summary.blur(); await Promise.resolve(); expect(picker.open).toBe(true);
    choices[0]!.click(); await vi.waitFor(() => expect(request.mock.calls.filter(([method]) => method === "PUT")).toHaveLength(1));
    await vi.waitFor(() => expect(view.element.querySelector('.kl-reactions > [data-reaction="heart"]')).not.toBeNull());
    picker = view.element.querySelector<HTMLDetailsElement>(".kl-reaction-picker")!;
    expect(picker.open).toBe(false); picker.open = true;
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); expect(picker.open).toBe(false);
  });

  it("retains keyboard focus after a reaction completes and does not steal it from a new draft", async () => {
    let finish!: (value: CloudReactions) => void;
    const { view } = setup(async method => method === "PUT" ? new Promise(resolve => { finish = resolve; }) : { items: [post()], nextCursor: null });
    await view.render({ reactions: ["heart"] });
    const choice = view.element.querySelector<HTMLButtonElement>('.kl-reaction-choices [data-reaction="heart"]')!;
    choice.closest("details")!.open = true; choice.focus(); choice.click();
    finish({ mine: "heart", counts: [{ reaction: "heart", count: 1 }] });
    await vi.waitFor(() => expect(document.activeElement).toBe(view.element.querySelector('.kl-reactions > [data-reaction="heart"]')));
    const current = document.activeElement as HTMLButtonElement; current.click();
    const draft = view.element.querySelector<HTMLTextAreaElement>('[aria-label="Share a post"]')!; draft.focus();
    finish({ mine: null, counts: [] }); await Promise.resolve(); await Promise.resolve(); expect(document.activeElement).toBe(draft);
  });

  it("shows Vote and Update vote as text-only actions", async () => {
    const { ui } = setup(async () => ({}));
    const view = new FeedPollView(ui, poll(), async () => {}); document.body.append(view.element); cleanup.push(() => view.destroy());
    const vote = view.element.querySelector<HTMLButtonElement>('[aria-label="Vote"]')!;
    expect(vote.textContent).toBe("Vote"); expect(vote.querySelector("svg")).toBeNull();
    view.update(poll([1])); view.element.querySelector<HTMLButtonElement>('[aria-label="Change vote"]')!.click();
    const update = view.element.querySelector<HTMLButtonElement>('[aria-label="Update vote"]')!;
    expect(update.textContent).toBe("Update vote"); expect(update.querySelector("svg")).toBeNull();
  });
});
