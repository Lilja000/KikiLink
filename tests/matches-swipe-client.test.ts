// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { CloudError, type CloudClient } from "../src/cloud/client";
import { SwipeApi, type SwipeCardDraft } from "../src/cloud/matches-swipe";

const prefix = "/v1/matching/swipe";
const wireCard = (memberNumber: number) => ({
  memberNumber, revision: 2, name: "Player " + memberNumber, background: "CosyChalet",
  hasImage: true, available: true, languages: ["English"], bio: "", tags: ["Games"],
});
const own = { ...wireCard(1), lookSource: "wardrobe", wardrobeSlot: 6, wardrobeName: "Formal" };
const state = { self: own, deck: [wireCard(2)], deckCursor: null, mutuals: [], mutualCursor: null,
  lastVote: null, seen: 0, remaining: 1, mutualCount: 0 };

function fixture(request: (method: string, path: string, body?: unknown) => Promise<unknown>, block = () => false) {
  const client = { memberNumber: 1, request, isProfileBlocked: () => false, swipeCardImage: vi.fn() };
  return { api: new SwipeApi(client as unknown as CloudClient, block), client };
}

it("reads custom links alongside the native fallback and sends only intentional changes", async () => {
  const backgroundUrl = "https://images.example.org/art/scene.WEBP?version=5";
  const draft: SwipeCardDraft = { name: "Kiki", available: true, lookSource: "current", background: "CosyChalet" };
  const saves: Record<string, unknown>[] = [];
  const api = fixture(async (method, _path, body) => {
    if (method === "GET") return { ...state, customBackgrounds: true,
      self: { ...own, backgroundUrl }, deck: [{ ...wireCard(2), backgroundUrl }, { ...wireCard(3), backgroundUrl: "file:///art.webp" }] };
    saves.push(body as Record<string, unknown>);
    return { card: own };
  }).api;
  const data = await api.load();
  expect(data.customBackgrounds).toBe(true);
  expect(data.self?.backgroundUrl).toBe(backgroundUrl);
  expect(data.deck.map(c => [c.background, c.backgroundUrl])).toEqual([["CosyChalet", backgroundUrl], ["CosyChalet", null]]);
  await api.save(draft, data.self);
  await api.save({ ...draft, backgroundUrl: backgroundUrl + "#display" }, data.self);
  await api.save({ ...draft, backgroundUrl: null }, data.self);
  expect(saves[0]).not.toHaveProperty("backgroundUrl");
  expect(saves[1]).toMatchObject({ background: "CosyChalet", backgroundUrl });
  expect(saves[2]).toHaveProperty("backgroundUrl", null);
  for (const url of ["http://images.example.org/a.jpg", "https://127.1/a.jpg", "https://user@images.example.org/a.webp", "https://images.example.org/a.svg"]) {
    await expect(api.save({ ...draft, backgroundUrl: url }, data.self)).rejects.toThrow("invalid_swipe_background_url");
  }
  expect(saves).toHaveLength(3);
});

it("keeps native saves compatible with the original strict schema 78 server", async () => {
  const draft: SwipeCardDraft = { name: "Kiki", available: true, lookSource: "current", background: "Library" };
  const saves: unknown[] = [];
  const api = fixture(async (method, _path, body) => {
    if (method === "GET") return state;
    saves.push(body);
    return { card: own };
  }).api;
  const data = await api.load();
  expect(data.customBackgrounds).toBe(false);
  await api.save({ ...draft, backgroundUrl: null }, data.self);
  expect(saves[0]).not.toHaveProperty("backgroundUrl");
  await expect(api.save({ ...draft, backgroundUrl: "https://images.example.org/a.jpg" }, data.self))
    .rejects.toThrow("swipe_custom_background_unavailable");
  expect(saves).toHaveLength(1);
});

it("follows locally blocked pages without sending block lists and preserves own outfit metadata", async () => {
  const request = vi.fn(async (_method: string, path: string) => {
    if (path === prefix + "/state") return { ...state, deckCursor: 2 };
    if (path === prefix + "/deck?cursor=2&limit=20") return { items: [wireCard(4)], nextCursor: null };
    throw Error(path);
  });
  const api = new SwipeApi({ memberNumber: 1, request, isProfileBlocked: (n: number) => n === 2 } as unknown as CloudClient);
  const snapshot = await api.load();
  expect(snapshot.deck.map(c => c.memberNumber)).toEqual([4]);
  expect(snapshot.self).toMatchObject({ wardrobeSlot: 6, wardrobeName: "Formal", lookSource: "wardrobe", imageVersion: "2" });
  expect(request).toHaveBeenCalledTimes(2);
});

it("rejects a repeated cursor instead of looping, and rejects the actor in their own deck", async () => {
  const api = fixture(async (_method, path) => path.endsWith("/state") ? { ...state, deckCursor: 2 } : { items: [wireCard(2)], nextCursor: 2 }, () => true).api;
  await expect(api.load()).rejects.toThrow("invalid_swipe_response");
  await expect(fixture(async () => ({ ...state, deck: [own] })).api.load()).rejects.toThrow("invalid_swipe_response");
});

it("preserves availability consent and excludes local blocks from loaded mutual badges and undo", async () => {
  const api = fixture(async () => ({
    ...state, deck: [], mutuals: [wireCard(2)], mutualCount: 1,
    initialAvailable: false, discoverability: "paused", lastVote: { id: 10, memberNumber: 2, type: "like" },
  }), () => true).api;
  expect(await api.load()).toMatchObject({ initialAvailable: false, discoverability: "paused", mutuals: [], mutualCount: 0, lastVote: null });
});

it("rechecks native blocks when another list needs an additional page", async () => {
  const blocked = new Set([3]);
  const request = vi.fn(async (_method: string, path: string) => {
    if (path.endsWith("/state")) return { ...state, mutuals: [wireCard(3)], mutualCount: 2, mutualCursor: 3 };
    // The first deck page has already resolved while the same user blocks its candidate in BC.
    blocked.add(2);
    return { items: [wireCard(4)], nextCursor: null };
  });
  const api = new SwipeApi({ memberNumber: 1, request, isProfileBlocked: (member: number) => blocked.has(member) } as unknown as CloudClient);
  const result = await api.load();
  expect(result).toMatchObject({ deck: [], remaining: 0, mutualCount: 1 });
  expect(result.mutuals.map(item => item.memberNumber)).toEqual([4]);
});

it("preserves the operation id and expected revision on retry and omits unchanged art", async () => {
  const saves: Record<string, unknown>[] = [];
  const api = fixture(async (method, _path, body) => {
    if (method === "GET") return state;
    saves.push(body as Record<string, unknown>);
    if (saves.length === 1) throw new CloudError("cloud_temporarily_unavailable", 503);
    return { card: own };
  }).api;
  const previous = (await api.load()).self;
  const draft: SwipeCardDraft = { name: "Changed", available: false, lookSource: "wardrobe", wardrobeSlot: 6, wardrobeName: "Formal", background: "ParkNight" };
  await expect(api.save(draft, previous)).rejects.toThrow("cloud_temporarily_unavailable");
  await api.save({ ...draft }, previous);
  expect(saves[0]).toEqual(saves[1]);
  expect(saves[0]).toMatchObject({ revision: 2, available: false });
  expect(saves[0]).not.toHaveProperty("image");
});

it("never loads or votes on a newly local-blocked character and rejects a wrong receipt", async () => {
  let blocked = false;
  const { api, client } = fixture(async (method) => method === "GET" ? state : { matched: true, vote: { id: 93, memberNumber: 4, type: "like" } }, () => blocked);
  const candidate = (await api.load()).deck[0]!;
  await expect(api.vote(candidate, "like", crypto.randomUUID())).rejects.toThrow("invalid_swipe_response");
  client.swipeCardImage.mockImplementation(async () => { blocked = true; return new Blob(["unused"]); });
  await expect(api.image(candidate)).rejects.toThrow("profile_blocked");
  await expect(api.vote(candidate, "like", crypto.randomUUID())).rejects.toThrow("profile_blocked");
});

it("binds a retry to the reviewed vote's recovery generation, even if its numeric id is reused", async () => {
  const before = "a".repeat(32), after = "b".repeat(32);
  let generation = before;
  const attempts: Record<string, unknown>[] = [];
  const { api } = fixture(async (method, _path, body) => {
    if (method === "GET") return { ...state, lastVote: { id: 7, memberNumber: 2, type: "like", recoveryGeneration: generation } };
    attempts.push(body as Record<string, unknown>);
    if (attempts.length < 3) throw new CloudError("swipe_vote_changed", 409);
    return { undone: true };
  });
  const oldVote = (await api.load()).lastVote!;
  generation = after;
  await expect(api.undo(oldVote)).rejects.toThrow();
  await expect(api.undo(oldVote)).rejects.toThrow();
  await api.undo((await api.load()).lastVote!);
  expect(attempts[0]).toEqual(attempts[1]);
  expect(attempts[0]).toMatchObject({ voteId: 7, recoveryGeneration: before });
  expect(attempts[2]).toMatchObject({ voteId: 7, recoveryGeneration: after });
  expect(attempts[0]!.operationId).not.toBe(attempts[2]!.operationId);
});

it("quietly revalidates just the expanded mutual pages, including withdrawals and edits beyond page one", async () => {
  let second = [wireCard(90), wireCard(91)];
  const request = vi.fn(async (_method: string, path: string) => {
    if (path === prefix + "/state") return { ...state, mutuals: [wireCard(2)], mutualCursor: 2, mutualCount: 3 };
    return { items: second, nextCursor: null };
  });
  const api = fixture(request).api;
  const first = await api.load();
  expect(first.mutualPagesLoaded).toBe(1);
  expect(request).toHaveBeenCalledTimes(1);
  await api.moreMutuals(first.mutualCursor!);
  second = [{ ...wireCard(90), name: "Updated card" }, wireCard(92)];
  const fresh = await api.load();
  expect(fresh.mutualPagesLoaded).toBe(2);
  expect(fresh.mutuals.map(c => [c.memberNumber, c.name])).toEqual([[2, "Player 2"], [90, "Updated card"], [92, "Player 92"]]);
  expect(request).toHaveBeenCalledTimes(4);
  const collapsed = api.collapseMutualPages(fresh);
  expect(collapsed).toMatchObject({mutualCursor: 2, mutualPagesLoaded: 1});
  expect(collapsed.mutuals.map(c => c.memberNumber)).toEqual([2]);
  // Navigating away and back without an intervening network read must preserve More.
  await api.moreMutuals(collapsed.mutualCursor!);
  expect((await api.load()).mutuals.map(c => c.memberNumber)).toEqual([2, 90, 92]);
  api.resetMutualPages();
  expect((await api.load()).mutuals).toHaveLength(1);
  expect(request).toHaveBeenCalledTimes(8);
});

it("coalesces SSE hints and unregisters callbacks on section close", async () => {
  let event: ((kind: string, cause?: string) => void) | undefined;
  const release = vi.fn(), unsubscribe = vi.fn();
  const client = { subscribe(cb: (kind: string, cause?: string) => void) { event = cb; return unsubscribe; }, retainEvents: () => release };
  const api = new SwipeApi(client as unknown as CloudClient);
  const hints = vi.fn();
  const close = api.watch(hints);
  event!("feed"); event!("matching"); event!("profiles-cleared", "ready"); event!("ready"); event!("matching");
  await Promise.resolve();
  expect(hints.mock.calls).toEqual([[new Set(["matching", "ready"])]]);
  event!("profiles-cleared", "relationships"); event!("relationships");
  await Promise.resolve();
  expect(hints.mock.calls[1]).toEqual([new Set(["profiles-cleared", "relationships"])]);
  event!("matching"); close(); close();
  await Promise.resolve();
  expect(hints).toHaveBeenCalledTimes(2);
  expect(unsubscribe).toHaveBeenCalledOnce(); expect(release).toHaveBeenCalledOnce();
});
