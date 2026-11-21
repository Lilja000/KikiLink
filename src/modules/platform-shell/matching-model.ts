import {
  checkedMatchSignal,
  MATCH_INTENTS,
  MATCH_LANGUAGES,
  MATCH_INTERESTS,
  MATCH_STATES,
  matchExact as exact,
  matchInteger as int,
  matchText as text,
  matchUuid as uuid,
  type MatchOwn,
  type MatchCandidate,
  type MatchRequest,
  type MatchChoice,
  type MatchPerson,
} from "../../../cloud/shared/matching.mjs";
const fail = (): never => {
  throw new Error("Matching data could not be verified. Refresh to try again.");
};
const date = (v: unknown) => int(v, 1, 8640000000000000),
  nullableDate = (v: unknown) => v === null || date(v);
const list = (
  v: unknown,
  allowed: readonly unknown[],
  min = 0,
  max = allowed.length,
): v is unknown[] =>
  Array.isArray(v) &&
  v.length >= min &&
  v.length <= max &&
  new Set(v).size === v.length &&
  v.every((x) => allowed.includes(x));
const bool = (v: Record<string, unknown>, keys: string[]) =>
  keys.every((k) => typeof v[k] === "boolean");
const person = (v: unknown): v is MatchPerson =>
  exact(v, ["memberNumber", "name", "username"]) &&
  int(v.memberNumber, 1) &&
  text(v.name, 80) &&
  !!v.name.trim() &&
  (v.username === null ||
    (typeof v.username === "string" && /^[a-z0-9_]{3,24}$/.test(v.username)));
export function checkedMatchOwn(v: unknown, owner: number): MatchOwn {
  if (
    !exact(v, [
      "owner",
      "revision",
      "signal",
      "active",
      "canPublish",
      "serverNow",
    ]) ||
    v.owner !== owner ||
    !int(v.revision) ||
    !bool(v, ["active", "canPublish"]) ||
    !date(v.serverNow)
  )
    return fail();
  checkedMatchSignal(v.signal);
  return structuredClone(v) as unknown as MatchOwn;
}
export function checkedMatchCandidate(
  v: unknown,
  owner: number,
): MatchCandidate {
  const keys = [
    "memberNumber",
    "name",
    "username",
    "note",
    "intents",
    "languages",
    "size",
    "signalRevision",
    "expiresAt",
    "interests",
    "availability",
    "status",
    "compatibility",
    "mutualCount",
    "communities",
    "overlapMinutes",
    "saved",
    "hidden",
    "choiceRevision",
    "canRequest",
    "score",
    "coverage",
    "breakdown",
    "reasons",
  ];
  if (typeof v === "object" && v !== null && Object.hasOwn(v, "activeConnection")) keys.push("activeConnection");
  if (
    !exact(v, keys) ||
    !person({
      memberNumber: v.memberNumber,
      name: v.name,
      username: v.username,
    }) ||
    v.memberNumber === owner ||
    !text(v.note, 180) ||
    !list(v.intents, MATCH_INTENTS, v.signalRevision === 0 ? 0 : 1) ||
    !list(v.languages, MATCH_LANGUAGES, v.signalRevision === 0 ? 0 : 1, 5) ||
    !list(
      v.interests,
      MATCH_INTERESTS.map((x) => x.id),
    ) ||
    !["One-to-one", "Small group", "Either"].includes(String(v.size)) ||
    !int(v.signalRevision) || (v.signalRevision === 0 && v.canRequest !== false) ||
    !nullableDate(v.expiresAt) ||
    !int(v.choiceRevision) ||
    !bool(v, ["saved", "hidden", "canRequest"]) ||
    (keys.includes("activeConnection") && (!exact(v.activeConnection, ["id", "state", "expiresAt"]) ||
      !uuid(v.activeConnection.id) ||
      !(v.activeConnection.state === "Pending" && date(v.activeConnection.expiresAt) ||
        v.activeConnection.state === "Accepted" && v.activeConnection.expiresAt === null))) ||
    ![null, "online", "idle", "dnd", "unavailable"].includes(
      v.status as string | null,
    ) ||
    (v.mutualCount !== null && !int(v.mutualCount)) ||
    (v.overlapMinutes !== null && !int(v.overlapMinutes, 0, 10080)) ||
    typeof v.score !== "number" ||
    !Number.isFinite(v.score) ||
    v.score < 0 ||
    v.score > 100 ||
    !int(v.coverage, 0, 100)
  )
    return fail();
  if (v.availability !== null) {
    const a = v.availability;
    if (
      !exact(a, ["status", "days", "from", "to", "utcOffset", "duration"]) ||
      !["Available now", "Planning ahead"].includes(String(a.status)) ||
      !list(a.days, [0, 1, 2, 3, 4, 5, 6], 1) ||
      !int(a.utcOffset, -12, 14) ||
      !int(a.duration, 15, 240) ||
      typeof a.from !== "string" ||
      typeof a.to !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(a.from) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(a.to) ||
      a.from === a.to
    )
      return fail();
  }
  if (v.compatibility !== null) {
    const c = v.compatibility;
    if (
      !exact(c, [
        "status",
        "count",
        "score",
        "hardLimitConflictCount",
        "details",
      ]) ||
      !int(c.count, 0, 500) ||
      !int(c.hardLimitConflictCount, 0, c.count) ||
      !(
        (c.status === "available" && c.count >= 5 && int(c.score, 0, 100)) ||
        (c.status === "insufficient" && c.count < 5 && c.score === null)
      ) ||
      !Array.isArray(c.details) ||
      c.details.length > 50 ||
      c.details.length > c.count
    )
      return fail();
    for (const d of c.details)
      if (
        !exact(d, ["id", "yours", "theirs"]) ||
        !text(d.id, 80) ||
        !["hate", "dislike", "neutral", "like", "love", "hard_limit"].includes(
          String(d.yours),
        ) ||
        !["hate", "dislike", "neutral", "like", "love", "hard_limit"].includes(
          String(d.theirs),
        )
      )
        return fail();
  }
  if (
    !Array.isArray(v.communities) ||
    v.communities.length > 200 ||
    v.communities.some(
      (c) => !exact(c, ["id", "name"]) || !uuid(c.id) || !text(c.name, 80),
    ) ||
    !Array.isArray(v.breakdown) ||
    v.breakdown.length !== 6 ||
    v.breakdown.some(
      (x) =>
        !exact(x, ["label", "points", "max", "available", "explanation"]) ||
        !text(x.label, 40) ||
        !text(x.explanation, 400) ||
        !int(x.max, 1, 100) ||
        typeof x.points !== "number" ||
        !Number.isFinite(x.points) ||
        x.points < 0 ||
        x.points > x.max ||
        typeof x.available !== "boolean" ||
        (!x.available && x.points !== 0),
    ) ||
    !Array.isArray(v.reasons) ||
    v.reasons.length > 3 ||
    v.reasons.some((x) => !text(x, 300))
  )
    return fail();
  return structuredClone(v) as unknown as MatchCandidate;
}
export function checkedMatchPage(
  v: unknown,
  owner: number,
): {
  items: MatchCandidate[];
  nextCursor: string | null;
  poolLimited: boolean;
  serverNow: number;
} {
  if (
    !exact(v, ["items", "nextCursor", "poolLimited", "serverNow"]) ||
    !Array.isArray(v.items) ||
    v.items.length > 20 ||
    (v.nextCursor !== null && (!text(v.nextCursor, 8192) || !v.nextCursor)) ||
    typeof v.poolLimited !== "boolean" ||
    !date(v.serverNow)
  )
    return fail();
  const items = v.items.map((x) => checkedMatchCandidate(x, owner));
  if (new Set(items.map((x) => x.memberNumber)).size !== items.length)
    return fail();
  return { ...v, items } as {
    items: MatchCandidate[];
    nextCursor: string | null;
    poolLimited: boolean;
    serverNow: number;
  };
}
export function checkedMatchRequest(v: unknown, owner: number): MatchRequest {
  if (
    !exact(v, [
      "id",
      "direction",
      "state",
      "revision",
      "createdAt",
      "expiresAt",
      "updatedAt",
      "peer",
      "intent",
      "message",
      "ownRevision",
      "peerRevision",
      "canAccept",
      "canCancel",
      "canDecline",
    ]) ||
    !uuid(v.id) ||
    !["Incoming", "Outgoing"].includes(String(v.direction)) ||
    !MATCH_STATES.includes(String(v.state)) ||
    !int(v.revision, 1) ||
    !date(v.createdAt) ||
    !date(v.expiresAt) ||
    Number(v.expiresAt) !== Number(v.createdAt) + 86400000 ||
    !date(v.updatedAt) ||
    !int(v.ownRevision) ||
    (v.peerRevision !== null && !int(v.peerRevision, 1)) ||
    !bool(v, ["canAccept", "canCancel", "canDecline"])
  )
    return fail();
  if (v.peer === null) {
    if (
      v.intent !== null ||
      v.message !== null ||
      v.peerRevision !== null ||
      v.canAccept
    )
      return fail();
  } else if (
    !person(v.peer) ||
    v.peer.memberNumber === owner ||
    !MATCH_INTENTS.includes(String(v.intent)) ||
    !text(v.message, 240) ||
    v.peerRevision === null
  )
    return fail();
  if (
    (v.canAccept && (v.direction !== "Incoming" || v.state !== "Pending")) ||
    (v.canDecline && (v.direction !== "Incoming" || v.state !== "Pending")) ||
    (v.canCancel &&
      !(
        v.state === "Accepted" ||
        (v.state === "Pending" && v.direction === "Outgoing")
      ))
  )
    return fail();
  return structuredClone(v) as unknown as MatchRequest;
}
export function checkedMatchRequests(
  v: unknown,
  owner: number,
): { items: MatchRequest[]; nextCursor: number | null; serverNow: number } {
  if (
    !exact(v, ["items", "nextCursor", "serverNow"]) ||
    !Array.isArray(v.items) ||
    v.items.length > 20 ||
    (v.nextCursor !== null && !int(v.nextCursor, 1)) ||
    !date(v.serverNow)
  )
    return fail();
  const items = v.items.map((x) => checkedMatchRequest(x, owner));
  if (new Set(items.map((x) => x.id)).size !== items.length) return fail();
  return { ...v, items } as {
    items: MatchRequest[];
    nextCursor: number | null;
    serverNow: number;
  };
}
export function checkedMatchRequestSummary(v: unknown, owner: number): {
  memberNumbers: number[];
  nextExpiresAt: number | null;
  serverNow: number;
} {
  if (!exact(v, ["incomingPending", "memberNumbers", "nextExpiresAt", "serverNow"]) ||
      !int(v.incomingPending, 0, 100) || !Array.isArray(v.memberNumbers) ||
      v.memberNumbers.length !== v.incomingPending ||
      new Set(v.memberNumbers).size !== v.memberNumbers.length ||
      v.memberNumbers.some(member => !int(member, 1) || member === owner) ||
      !date(v.serverNow) ||
      (v.incomingPending === 0 ? v.nextExpiresAt !== null :
        !date(v.nextExpiresAt) || Number(v.nextExpiresAt) <= Number(v.serverNow))) return fail();
  return { memberNumbers: [...v.memberNumbers], nextExpiresAt: v.nextExpiresAt as number | null, serverNow: v.serverNow as number };
}
export function checkedMatchChoices(v: unknown, owner: number): MatchChoice[] {
  if (!exact(v, ["items"]) || !Array.isArray(v.items) || v.items.length > 200)
    return fail();
  for (const c of v.items)
    if (
      !exact(c, ["target", "revision", "saved", "hidden", "peer"]) ||
      !int(c.target, 1) ||
      c.target === owner ||
      !int(c.revision, 1) ||
      !bool(c, ["saved", "hidden"]) ||
      (c.peer !== null && (!person(c.peer) || c.peer.memberNumber !== c.target))
    )
      return fail();
  if (new Set(v.items.map((c) => c.target)).size !== v.items.length)
    return fail();
  return structuredClone(v.items) as MatchChoice[];
}
