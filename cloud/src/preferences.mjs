import { z } from "zod";
import { requireThat, pageId } from "./validation.mjs";
import catalog from "../shared/preferences-catalog.json" with { type: "json" };

const ids = new Set(catalog.items.map(item => item.id));
const modes = z.enum(["private", "score", "friends", "public"]);
const levels = z.enum(["hate", "dislike", "neutral", "like", "love", "hard_limit"]);
// Numbers are accepted only as an in-place upgrade path for profiles written by
// the first private Preferences prototype. Responses and new writes are canonical.
const inputLevel = z.union([levels, z.number().int().min(-2).max(2)]);
const ratingsSchema = z.record(z.string().regex(/^[a-z][a-z0-9.-]{1,79}$/), inputLevel);
const updatesSchema = z.record(z.string().regex(/^[a-z][a-z0-9.-]{1,79}$/), inputLevel.nullable());
const legacy = new Map([[-2, "hate"], [-1, "dislike"], [0, "neutral"], [1, "like"], [2, "love"]]);
const scores = { hate: -2, dislike: -1, neutral: 0, like: 1, love: 2 };

export function normalizePreferenceLevel(value) {
  if (typeof value === "number") return legacy.get(value);
  return levels.safeParse(value).success ? value : undefined;
}

export function normalizePreferenceRatings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result = {};
  for (const [id, raw] of Object.entries(value)) {
    const level = normalizePreferenceLevel(raw);
    if (level) result[id] = level;
  }
  return result;
}

export function isHardLimitConflict(left, right) {
  return left === "hard_limit" && (right === "like" || right === "love") ||
    right === "hard_limit" && (left === "like" || left === "love");
}

export function preferenceSimilarity(left, right) {
  if (left === "hard_limit" || right === "hard_limit") {
    if (left === right) return 1;
    const other = left === "hard_limit" ? right : left;
    if (other === "hate") return 1;
    if (other === "dislike") return .75;
    if (other === "neutral") return .5;
    return 0;
  }
  return 1 - Math.abs(scores[left] - scores[right]) / 4;
}

export function comparePreferences(leftInput, rightInput) {
  const left = normalizePreferenceRatings(leftInput), right = normalizePreferenceRatings(rightInput);
  // Absence is Not Set. Explicit Neutral remains in the overlap and is never
  // manufactured for catalogue entries the user did not configure.
  const eligible = Object.keys(left).filter(id => ids.has(id) && right[id] !== undefined);
  const count = eligible.length;
  const hardLimitConflictCount = eligible.filter(id => isHardLimitConflict(left[id], right[id])).length;
  const conflict = hardLimitConflictCount ? { hardLimitConflictCount } : {};
  if (count < 5) return { status: "insufficient", count, ...conflict };
  return {
    status: "available",
    count,
    score: Math.round(eligible.reduce((sum, id) => sum + preferenceSimilarity(left[id], right[id]), 0) / count * 100),
    ...conflict,
  };
}

export function preferencesApi({ app, social, auth, relationships, changed }) {
  const { db, keys, now } = social;
  const cache = new Map();
  const row = owner => db.get("SELECT * FROM interest_preferences WHERE owner=?", owner);
  const own = owner => {
    const saved = row(owner);
    return saved ? {
      mode: saved.mode,
      ratings: normalizePreferenceRatings(keys.open(saved.ratings, `preferences:${owner}`)),
      revision: saved.revision,
      catalogVersion: saved.catalog_version,
    } : { mode: "private", ratings: {}, revision: 0, catalogVersion: catalog.version };
  };
  const invalidate = owner => {
    for (const [key, entry] of cache) if (entry.members.includes(owner)) cache.delete(key);
    changed("preferences", owner, undefined, [owner]);
  };
  const validateIds = (ratings, previous) => {
    for (const id of Object.keys(ratings)) requireThat(ids.has(id) || Object.hasOwn(previous, id), 400, "unknown_preference");
  };
  const persist = (actor, mode, ratings, revision) => {
    requireThat(Object.keys(ratings).length <= 500, 400, "preference_limit");
    const previous = own(actor);
    requireThat(revision === previous.revision, 409, "preferences_changed_on_another_device");
    validateIds(ratings, previous.ratings);
    // A full catalog can produce hundreds of autosaves. Keep an hourly budget
    // for abuse protection; the shared per-minute write limit still applies.
    auth.rate(`preferences-save:${actor}`, 600, 3_600_000);
    // Preferences stay in their own encrypted row. Updating this row cannot erase
    // profile, bio, banner, tags, or any other Cloud profile field.
    db.run(`INSERT INTO interest_preferences VALUES(?,?,?,?,1,?) ON CONFLICT(owner) DO UPDATE SET mode=excluded.mode,ratings=excluded.ratings,
      catalog_version=excluded.catalog_version,revision=interest_preferences.revision+1,updated_at=excluded.updated_at`,
      actor, mode, keys.seal(ratings, `preferences:${actor}`), catalog.version, now());
    invalidate(actor);
    return own(actor);
  };

  app.get("/v1/preferences/me", async req => own(req.identity.member));
  app.put("/v1/preferences/me", async req => {
    const actor = req.identity.member;
    const input = z.object({ mode: modes, ratings: ratingsSchema, revision: z.number().int().nonnegative() }).strict().parse(req.body);
    return persist(actor, input.mode, normalizePreferenceRatings(input.ratings), input.revision);
  });
  app.patch("/v1/preferences/me", async req => {
    const actor = req.identity.member;
    const input = z.object({ mode: modes.optional(), updates: updatesSchema, revision: z.number().int().nonnegative() }).strict().parse(req.body);
    requireThat(Object.keys(input.updates).length <= 200, 400, "preference_update_limit");
    const previous = own(actor), ratings = { ...previous.ratings };
    for (const [id, raw] of Object.entries(input.updates)) {
      requireThat(ids.has(id) || Object.hasOwn(previous.ratings, id), 400, "unknown_preference");
      const level = raw === null ? undefined : normalizePreferenceLevel(raw);
      if (level) ratings[id] = level;
      else delete ratings[id];
    }
    return persist(actor, input.mode ?? previous.mode, ratings, input.revision);
  });
  app.delete("/v1/preferences/me", async (req, reply) => {
    const actor = req.identity.member;
    db.run("UPDATE interest_preferences SET mode='private',ratings=?,revision=revision+1,updated_at=? WHERE owner=?", keys.seal({}, `preferences:${actor}`), now(), actor);
    invalidate(actor); reply.code(204).send();
  });
  app.get("/v1/preferences/:member", async req => {
    const actor = req.identity.member, target = pageId.parse(req.params.member);
    auth.rate(`preferences-read:${actor}`, 30, 3_600_000);
    social.visibleActor(actor, target);
    if (actor === target) return own(actor);
    const saved = own(target);
    requireThat(saved.mode === "public" || saved.mode === "friends" && relationships.allowed(actor, target), 403, "preferences_private");
    return { ratings: saved.ratings, catalogVersion: saved.catalogVersion, mode: saved.mode };
  });
  app.get("/v1/compatibility/:member", async req => {
    const actor = req.identity.member, target = pageId.parse(req.params.member);
    requireThat(actor !== target, 400, "no_self_comparison");
    auth.rate(`compatibility-requests:${actor}`, 30, 60_000);
    social.visibleActor(actor, target);
    const left = own(actor), right = own(target);
    if (left.mode === "private") return { status: "opt_in_required" };
    if (right.mode === "private") return { status: "private" };
    if ((left.mode === "friends" || right.mode === "friends") && !relationships.allowed(actor, target)) return { status: "private" };
    // Access is checked before cache lookup, so privacy changes and blocks are immediate.
    const key = `${actor}:${target}`, old = cache.get(key), revision = `${left.revision}:${right.revision}`;
    if (old?.revision === revision && old.until > now()) return old.value;
    auth.rate(`compatibility-pair:${actor}:${target}`, 4, 3_600_000);
    auth.rate(`compatibility-pairs:${actor}`, 60, 86_400_000);
    const value = comparePreferences(left.ratings, right.ratings);
    if (left.mode !== "score" && right.mode !== "score") {
      value.shared = catalog.items.filter(item => left.ratings[item.id] !== undefined && right.ratings[item.id] !== undefined)
        .map(item => ({ id: item.id, yours: left.ratings[item.id], theirs: right.ratings[item.id] }));
    }
    cache.set(key, { revision, members: [actor, target], until: now() + 900_000, value });
    while (cache.size > 1000) cache.delete(cache.keys().next().value);
    return value;
  });
}
