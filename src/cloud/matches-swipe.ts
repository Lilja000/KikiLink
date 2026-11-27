import { CloudClient, CloudError } from "./client";

export type SwipeChoice = "like" | "pass";
export type SwipeLookSource = "wardrobe" | "photo" | "current" | "none";

export interface SwipeCardDraft {
  name: string;
  background: string;
  available: boolean;
  lookSource: SwipeLookSource;
  wardrobeSlot?: number | null;
  wardrobeName?: string | null;
  /** A rendered raster to replace the snapshot, null to clear, or omitted to keep. */
  image?: string | null;
}
export interface SwipeCard {
  memberNumber: number;
  revision: number;
  name: string;
  background: string;
  available: boolean;
  imageVersion: string | null;
  lookSource: SwipeLookSource;
  wardrobeSlot: number | null;
  wardrobeName: string | null;
  languages: string[];
  bio: string;
  tags: string[];
}
export interface SwipeVote { id: string; target: number; type: SwipeChoice; recoveryGeneration?: string }
export interface SwipePage { items: SwipeCard[]; nextCursor: number | null }
export interface SwipeSnapshot {
  self: SwipeCard | null;
  deck: SwipeCard[];
  deckCursor: number | null;
  mutuals: SwipeCard[];
  mutualCursor: number | null;
  /** The mutual list was revalidated through this many visible pages (or its end). */
  mutualPagesLoaded?: number;
  lastVote: SwipeVote | null;
  seen: number;
  remaining: number;
  mutualCount: number;
  initialAvailable?: boolean;
  discoverability?: "ready" | "private" | "paused";
}

const prefix = "/v1/matching/swipe";
const filename = /^[A-Za-z0-9_-]{1,96}$/u;
const uuid = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/iu;
const generationId = /^[\da-f]{32}$/u;
function invalid(): never { throw new CloudError("invalid_swipe_response"); }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
function integer(value: unknown, min: number): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min ? value : invalid();
}
function readText(value: unknown, max: number): string {
  return typeof value === "string" && value.length <= max ? value : invalid();
}
function list(value: unknown, max: number): string[] {
  if (!Array.isArray(value) || value.length > max) invalid();
  return value.map(item => readText(item, 48));
}
function source(value: unknown): value is SwipeLookSource {
  return value === "wardrobe" || value === "photo" || value === "current" || value === "none";
}
function card(value: unknown, owner: number, own: boolean): SwipeCard {
  const v = record(value);
  const memberNumber = integer(v.memberNumber, 1);
  const revision = integer(v.revision, 1);
  if ((memberNumber === owner) !== own || typeof v.hasImage !== "boolean" || typeof v.available !== "boolean") invalid();
  const background = readText(v.background, 96);
  if (!filename.test(background)) invalid();
  const lookSource = own && v.lookSource !== undefined ? v.lookSource : "none";
  if (!source(lookSource)) invalid();
  const slot = own && v.wardrobeSlot != null ? integer(v.wardrobeSlot, 0) : null;
  if (slot !== null && slot > 4095) invalid();
  return {
    memberNumber, revision, name: readText(v.name, 40), background,
    available: v.available, imageVersion: v.hasImage ? String(revision) : null, lookSource,
    wardrobeSlot: slot, wardrobeName: own && v.wardrobeName != null ? readText(v.wardrobeName, 256) : null,
    languages: list(v.languages, 5), bio: readText(v.bio, 320), tags: list(v.tags, 12),
  };
}
function voteReceipt(value: unknown, owner: number): SwipeVote {
  const v = record(value);
  const target = integer(v.memberNumber, 1);
  if (target === owner || (v.type !== "pass" && v.type !== "like")) invalid();
  const generation = v.recoveryGeneration;
  if (generation !== undefined && (typeof generation !== "string" || !generationId.test(generation))) invalid();
  return { id: String(integer(v.id, 1)), target, type: v.type,
    ...(generation === undefined ? {} : { recoveryGeneration: generation }) };
}
function readPage(items: unknown, cursor: unknown, owner: number, maximum: number, after = 0): SwipePage {
  if (!Array.isArray(items) || items.length > maximum) invalid();
  const cards = items.map(item => card(item, owner, false));
  let previous = after;
  for (const item of cards) {
    if (item.memberNumber <= previous) invalid();
    previous = item.memberNumber;
  }
  const nextCursor = cursor == null ? null : integer(cursor, after + 1);
  if (nextCursor !== null && (!cards.length || nextCursor !== previous)) invalid();
  return { items: cards, nextCursor };
}

const hints = new Set(["matching", "session", "connection", "ready", "profiles-cleared", "privacy", "profile-discovery", "relationships", "preferences"]);
/** Account-scoped authenticated transport. All object URLs belong to the requesting view. */
export class SwipeApi {
  #retrySave: { body: string; id: string } | null = null;
  #retryUndo: { vote: string; id: string } | null = null;
  #mutualDepth = 1;
  #mutualEpoch = 0;
  #mutualCuts: number[] = [];
  constructor(private readonly client: CloudClient, private readonly localBlock?: (member: number) => boolean) {}
  #blocked(member: number): boolean {
    return this.client.isProfileBlocked(member) || !!this.localBlock?.(member);
  }

  async load(signal?: AbortSignal): Promise<SwipeSnapshot> {
    const value = record(await this.client.request("GET", prefix + "/state", undefined, true, signal));
    const owner = this.client.memberNumber;
    const initialAvailable = value.initialAvailable ?? true;
    const discoverability = value.discoverability ?? "ready";
    if (typeof initialAvailable !== "boolean" ||
      (discoverability !== "ready" && discoverability !== "private" && discoverability !== "paused")) invalid();
    const self = value.self === null ? null : card(value.self, owner, true);
    const lastVote = value.lastVote === null ? null : voteReceipt(value.lastVote, owner);
    const [deck, mutuals] = await Promise.all([
      this.#visiblePage("deck", readPage(value.deck, value.deckCursor, owner, 20), signal),
      this.#expandedMutuals(readPage(value.mutuals, value.mutualCursor, owner, 40), signal),
    ]);
    // Following blocked pages in one list can keep the other list pending. Check
    // both against the current native block lists before handing them to the UI.
    const visibleDeck = deck.items.filter(item => !this.#blocked(item.memberNumber));
    const visibleMutuals = mutuals.items.filter(item => !this.#blocked(item.memberNumber));
    return { self, initialAvailable, discoverability,
      deck: visibleDeck, deckCursor: deck.nextCursor, mutuals: visibleMutuals, mutualCursor: mutuals.nextCursor,
      mutualPagesLoaded: mutuals.depth,
      lastVote: lastVote && !this.#blocked(lastVote.target) ? lastVote : null, seen: integer(value.seen, 0),
      remaining: visibleDeck.length + Math.max(0, integer(value.remaining, 0) - deck.excluded - deck.items.length),
      mutualCount: visibleMutuals.length + Math.max(0, integer(value.mutualCount, 0) - mutuals.excluded - mutuals.items.length) };
  }
  async #readPage(kind: "deck" | "mutuals", cursor: number, signal?: AbortSignal): Promise<SwipePage> {
    if (!Number.isSafeInteger(cursor) || cursor <= 0) throw new CloudError("invalid_swipe_cursor");
    const limit = kind === "deck" ? 20 : 40;
    const path = prefix + "/" + kind + "?cursor=" + cursor + "&limit=" + limit;
    const value = record(await this.client.request("GET", path, undefined, true, signal));
    return readPage(value.items, value.nextCursor, this.client.memberNumber, limit, cursor);
  }
  async #visiblePage(kind: "deck" | "mutuals", page: SwipePage, signal?: AbortSignal): Promise<SwipePage & { excluded: number }> {
    let excluded = 0;
    for (;;) {
      const items = page.items.filter(item => !this.#blocked(item.memberNumber));
      excluded += page.items.length - items.length;
      if (items.length || page.nextCursor === null) return { items, nextCursor: page.nextCursor, excluded };
      page = await this.#readPage(kind, page.nextCursor, signal);
    }
  }
  async #expandedMutuals(first: SwipePage, signal?: AbortSignal) {
    const epoch = this.#mutualEpoch;
    const depth = this.#mutualDepth;
    let page = await this.#visiblePage("mutuals", first, signal);
    const items = [...page.items], cuts: number[] = [];
    let excluded = page.excluded;
    while (page.nextCursor !== null) {
      cuts.push(page.nextCursor);
      if (cuts.length >= depth || epoch !== this.#mutualEpoch) break;
      page = await this.#visiblePage("mutuals", await this.#readPage("mutuals", page.nextCursor, signal), signal);
      items.push(...page.items);
      excluded += page.excluded;
    }
    // A user can click More or leave Mutual likes while a quiet read is running.
    if (!signal?.aborted && epoch === this.#mutualEpoch && depth === this.#mutualDepth) this.#mutualCuts = cuts;
    return { items, nextCursor: page.nextCursor, excluded, depth };
  }
  async moreMutuals(cursor: number, signal?: AbortSignal): Promise<SwipePage> {
    const epoch = this.#mutualEpoch;
    const after = this.#mutualCuts.indexOf(cursor);
    const page = await this.#visiblePage("mutuals", await this.#readPage("mutuals", cursor, signal), signal);
    if (!signal?.aborted && epoch === this.#mutualEpoch && after >= 0 && this.#mutualCuts[after] === cursor) {
      this.#mutualDepth = Math.max(this.#mutualDepth, after + 2);
      if (page.nextCursor !== null) this.#mutualCuts[after + 1] = page.nextCursor;
    }
    return page;
  }
  resetMutualPages(): void {
    this.#mutualEpoch++;
    this.#mutualDepth = 1;
    this.#mutualCuts = [];
  }
  collapseMutualPages(snapshot: SwipeSnapshot): SwipeSnapshot {
    const firstCursor = this.#mutualCuts[0] ?? snapshot.mutualCursor;
    this.resetMutualPages();
    // Keep the cut visible in the collapsed snapshot. More must work even if
    // the user reopens the tab before the next scheduled read.
    if (firstCursor !== null) this.#mutualCuts = [firstCursor];
    if ((snapshot.mutualPagesLoaded ?? 1) === 1) return snapshot;
    return {
      ...snapshot, mutualPagesLoaded: 1, mutualCursor: firstCursor,
      mutuals: firstCursor === null ? snapshot.mutuals : snapshot.mutuals.filter(c => c.memberNumber <= firstCursor),
    };
  }
  async moreDeck(cursor: number, signal?: AbortSignal): Promise<SwipePage> {
    return this.#visiblePage("deck", await this.#readPage("deck", cursor, signal), signal);
  }
  async image(item: SwipeCard): Promise<Blob | null> {
    if (item.memberNumber !== this.client.memberNumber && this.#blocked(item.memberNumber)) throw new CloudError("profile_blocked", 403);
    if (item.imageVersion === null) return null;
    const result = await this.client.swipeCardImage(item.memberNumber, item.revision);
    if (item.memberNumber !== this.client.memberNumber && this.#blocked(item.memberNumber)) throw new CloudError("profile_blocked", 403);
    return result;
  }
  async save(draft: SwipeCardDraft, previous: SwipeCard | null, signal?: AbortSignal): Promise<void> {
    if (previous && previous.memberNumber !== this.client.memberNumber) throw new CloudError("account_changed");
    const body = {
      revision: previous?.revision ?? 0, name: draft.name, background: draft.background, available: draft.available,
      lookSource: draft.lookSource, wardrobeSlot: draft.lookSource === "wardrobe" ? draft.wardrobeSlot ?? null : null,
      wardrobeName: draft.lookSource === "wardrobe" ? draft.wardrobeName ?? null : null,
      ...(draft.image !== undefined ? { image: draft.image } : {}),
    };
    const fingerprint = JSON.stringify(body);
    if (!this.#retrySave || this.#retrySave.body !== fingerprint) this.#retrySave = { body: fingerprint, id: crypto.randomUUID() };
    const intent = this.#retrySave;
    const data = record(await this.client.request("PUT", prefix + "/card", { ...body, operationId: intent.id }, true, signal));
    card(data.card, this.client.memberNumber, true);
    if (this.#retrySave === intent) this.#retrySave = null;
  }
  async vote(target: SwipeCard, type: SwipeChoice, operationId: string, signal?: AbortSignal): Promise<{ matched: boolean }> {
    if (target.memberNumber === this.client.memberNumber || this.#blocked(target.memberNumber)) throw new CloudError("profile_blocked", 403);
    if (!uuid.test(operationId)) throw new CloudError("invalid_swipe_operation");
    const body = { operationId, memberNumber: target.memberNumber, revision: target.revision, type };
    const data = record(await this.client.request("POST", prefix + "/vote", body, true, signal));
    const receipt = voteReceipt(data.vote, this.client.memberNumber);
    if (receipt.target !== target.memberNumber || receipt.type !== type || typeof data.matched !== "boolean" || (type === "pass" && data.matched)) invalid();
    return { matched: data.matched && !this.#blocked(target.memberNumber) };
  }
  async undo(vote: SwipeVote, signal?: AbortSignal): Promise<void> {
    const voteId = Number(vote.id);
    if (!Number.isSafeInteger(voteId) || voteId <= 0) throw new CloudError("invalid_swipe_vote");
    const generation = vote.recoveryGeneration;
    if (generation !== undefined && !generationId.test(generation)) throw new CloudError("invalid_recovery_generation");
    const key = [vote.id, vote.target, vote.type, generation ?? ""].join("/");
    if (this.#retryUndo?.vote !== key) this.#retryUndo = { vote: key, id: crypto.randomUUID() };
    const intent = this.#retryUndo;
    const body = { operationId: intent.id, voteId, ...(generation === undefined ? {} : { recoveryGeneration: generation }) };
    const data = record(await this.client.request("POST", prefix + "/undo", body, true, signal));
    if (data.undone !== true) invalid();
    if (this.#retryUndo === intent) this.#retryUndo = null;
  }
  async remove(previous?: SwipeCard | null, signal?: AbortSignal): Promise<void> {
    if (!previous) throw new CloudError("swipe_revision_required");
    if (previous.memberNumber !== this.client.memberNumber) throw new CloudError("account_changed");
    await this.client.request("DELETE", prefix + "/card?revision=" + integer(previous.revision, 1), undefined, true, signal);
    this.clearPending();
  }
  clearPending(): void {
    this.#retrySave = this.#retryUndo = null;
    this.resetMutualPages();
  }
  /** Acquire only for the visible Matches section; one event stream is shared with the addon's other views. */
  watch(callback: (reasons: ReadonlySet<string>) => void): () => void {
    let live = true, queued = false;
    const reasons = new Set<string>();
    const schedule = (reason: string) => {
      if (!live) return;
      reasons.add(reason);
      if (queued || document.hidden) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        if (!live || document.hidden) return;
        const batch = new Set(reasons);
        reasons.clear();
        callback(batch);
      });
    };
    const unsubscribe = this.client.subscribe((kind, cause) => {
      // Opening the event stream clears CloudClient's unrelated profile cache.
      // Refresh the snapshot without treating a normal reconnect as a block.
      if (kind === "profiles-cleared" && cause === "ready") schedule("ready");
      else if (hints.has(kind)) schedule(kind);
    });
    const release = this.client.retainEvents();
    const focus = () => schedule("focus");
    const visibility = () => { if (!document.hidden) schedule("visible"); };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      if (!live) return;
      live = false;
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", visibility);
      unsubscribe(); release(); reasons.clear();
    };
  }
}
