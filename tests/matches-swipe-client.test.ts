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

it("coalesces SSE hints and unregisters callbacks on section close", async () => {
  let event: ((kind: string) => void) | undefined;
  const release = vi.fn(), unsubscribe = vi.fn();
  const client = { subscribe(cb: (kind: string) => void) { event = cb; return unsubscribe; }, retainEvents: () => release };
  const api = new SwipeApi(client as unknown as CloudClient);
  const hints = vi.fn();
  const close = api.watch(hints);
  event!("feed"); event!("matching"); event!("ready"); event!("matching");
  await Promise.resolve();
  expect(hints.mock.calls).toEqual([[new Set(["matching", "ready"])]]);
  event!("matching"); close(); close();
  await Promise.resolve();
  expect(hints).toHaveBeenCalledTimes(1);
  expect(unsubscribe).toHaveBeenCalledOnce(); expect(release).toHaveBeenCalledOnce();
});
