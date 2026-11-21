/** Explicit signals. Preference ratings remain in the existing Preferences contract. */
export const MATCH_INTENTS = [
  "Casual chat",
  "Friends",
  "Roleplay",
  "Long-term partner",
  "Group",
  "Room",
  "Event",
];
const LEGACY_MATCH_LANGUAGE = "Estonian";
const MATCH_LANGUAGE_OPTIONS = [
  "English",
  "Russian",
  "Finnish",
  "French",
  "German",
  "Spanish",
  "Portuguese",
  "Italian",
  "Japanese",
  "Korean",
  "Chinese",
];
export const MATCH_LANGUAGES = [...MATCH_LANGUAGE_OPTIONS, LEGACY_MATCH_LANGUAGE];
export function matchLanguageOptions(selected) {
  return selected.includes(LEGACY_MATCH_LANGUAGE) ? MATCH_LANGUAGES : MATCH_LANGUAGE_OPTIONS;
}
export const MATCH_INTERESTS = [
  ["quiet-company", "Quiet company"],
  ["small-groups", "Small groups"],
  ["meeting-people", "Meeting new people"],
  ["community-events", "Community events"],
  ["outfit-design", "Outfit design"],
  ["room-design", "Room design"],
  ["writing", "Writing & stories"],
  ["creative-feedback", "Creative feedback"],
  ["casual-scenes", "Casual scenes"],
  ["planned-stories", "Planned stories"],
  ["character-depth", "Character depth"],
  ["slow-pace", "A slower pace"],
].map(([id, label]) => ({ id, label }));
export const MATCH_STATES = [
  "Pending",
  "Accepted",
  "Declined",
  "Cancelled",
  "Expired",
];
export const MATCH_DAY = 86400000;
export const MATCH_HISTORY_DAYS = 30;
export const DEFAULT_MATCH_SIGNAL = {
  published: false,
  intents: ["Casual chat", "Friends"],
  languages: ["English"],
  interests: ["quiet-company", "small-groups", "writing"],
  availability: "Available now",
  days: [0, 1, 2, 3, 4, 5, 6],
  from: "18:00",
  to: "23:00",
  utcOffset: 3,
  duration: 30,
  size: "Either",
  note: "",
  audience: "Everyone",
  expiresAt: null,
  use: {
    compatibility: true,
    interests: true,
    availability: true,
    connections: true,
  },
  share: {
    compatibility: "Details",
    interests: true,
    availability: true,
    connections: true,
  },
};
export const DEFAULT_MATCH_FILTERS = {
  query: "",
  scope: "all",
  intent: "",
  language: "",
  interest: "",
  community: "",
  minCompatibility: 0,
  online: false,
  available: false,
  mutual: false,
  timezone: "any",
  sort: "recommended",
  priority: "balanced",
};
export const matchObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);
export const matchExact = (v, keys) =>
  matchObject(v) &&
  Object.keys(v).sort().join(",") === [...keys].sort().join(",");
export const matchInteger = (v, min = 0, max = Number.MAX_SAFE_INTEGER - 1) =>
  Number.isSafeInteger(v) && v >= min && v <= max;
export const matchText = (v, max) =>
  typeof v === "string" &&
  v.length <= max &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(
    v,
  );
export const matchUuid = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
const choices = (v, allowed, min, max = allowed.length) =>
  Array.isArray(v) &&
  v.length >= min &&
  v.length <= max &&
  new Set(v).size === v.length &&
  v.every((x) => allowed.includes(x));
const time = (v) =>
  typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export function checkedMatchSignal(v) {
  const error = () => {
    throw new Error(
      "Choose valid signal details, distinct days and times, and a note of up to 180 characters.",
    );
  };
  if (
    !matchExact(v, Object.keys(DEFAULT_MATCH_SIGNAL)) ||
    typeof v.published !== "boolean" ||
    !choices(v.intents, MATCH_INTENTS, 1) ||
    !choices(v.languages, MATCH_LANGUAGES, 1, 5) ||
    !choices(
      v.interests,
      MATCH_INTERESTS.map((x) => x.id),
      0,
    ) ||
    !choices(v.days, [0, 1, 2, 3, 4, 5, 6], 1) ||
    !time(v.from) ||
    !time(v.to) ||
    v.from === v.to ||
    !matchInteger(v.utcOffset, -12, 14) ||
    !matchInteger(v.duration, 15, 240) ||
    !["Available now", "Planning ahead", "Not looking"].includes(
      v.availability,
    ) ||
    !["One-to-one", "Small group", "Either"].includes(v.size) ||
    !matchText(v.note, 180) ||
    !["Everyone", "Friends"].includes(v.audience) ||
    (v.expiresAt !== null && !matchInteger(v.expiresAt, 1, 8640000000000000))
  )
    return error();
  if (
    !matchExact(v.use, [
      "compatibility",
      "interests",
      "availability",
      "connections",
    ]) ||
    Object.values(v.use).some((x) => typeof x !== "boolean") ||
    !matchExact(v.share, [
      "compatibility",
      "interests",
      "availability",
      "connections",
    ]) ||
    !["Details", "Score only", "Off"].includes(v.share.compatibility) ||
    ["interests", "availability", "connections"].some(
      (k) => typeof v.share[k] !== "boolean",
    ) ||
    (v.published && v.availability === "Not looking")
  )
    return error();
  return structuredClone(v);
}
export function checkedMatchFilters(v) {
  if (
    !matchExact(v, Object.keys(DEFAULT_MATCH_FILTERS)) ||
    !matchText(v.query, 160) ||
    !["all", "saved", "hidden"].includes(v.scope) ||
    !["", ...MATCH_INTENTS].includes(v.intent) ||
    !["", ...MATCH_LANGUAGES].includes(v.language) ||
    !["", ...MATCH_INTERESTS.map((x) => x.id)].includes(v.interest) ||
    (v.community !== "" && !matchUuid(v.community)) ||
    !matchInteger(v.minCompatibility, 0, 100) ||
    ["online", "available", "mutual"].some((k) => typeof v[k] !== "boolean") ||
    !["any", "same", "near"].includes(v.timezone) ||
    !["recommended", "compatibility", "time", "name"].includes(v.sort) ||
    !["balanced", "compatibility", "time"].includes(v.priority)
  )
    throw new Error("The matching filters are invalid.");
  return structuredClone(v);
}
const minute = (v) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
function weekly(v) {
  const ranges = [],
    week = 10080,
    duration = (minute(v.to) - minute(v.from) + 1440) % 1440;
  for (const day of v.days) {
    const start =
        (((day * 1440 + minute(v.from) - v.utcOffset * 60) % week) + week) %
        week,
      end = start + duration;
    if (end <= week) ranges.push([start, end]);
    else ranges.push([start, week], [0, end - week]);
  }
  const merged = [];
  for (const [a, b] of ranges.sort((x, y) => x[0] - y[0])) {
    const old = merged.at(-1);
    if (old && a <= old[1]) old[1] = Math.max(old[1], b);
    else merged.push([a, b]);
  }
  return merged;
}
export function matchingOverlap(a, b) {
  let total = 0;
  for (const x of weekly(a))
    for (const y of weekly(b))
      total += Math.max(0, Math.min(x[1], y[1]) - Math.max(x[0], y[0]));
  return total;
}
/** Rank an already privacy-filtered projection; do not pass raw peer signals. */
export function rankMatch(candidate, own, priority = "balanced", sharedTags = []) {
  const c = structuredClone(candidate),
    common = c.interests.filter((x) => own.interests.includes(x)),
    commonNames = [...new Set([...common.map(id => MATCH_INTERESTS.find(x => x.id === id).label), ...sharedTags])],
    intents = c.intents.filter((x) => own.intents.includes(x)),
    language = c.languages.some((x) => own.languages.includes(x));
  const max =
    priority === "compatibility"
      ? [50, 15, 10, 10, 10, 5]
      : priority === "time"
        ? [20, 15, 10, 15, 35, 5]
        : [35, 20, 15, 15, 10, 5];
  const available = [
    c.compatibility?.status === "available",
    own.intents.length > 0 && c.intents.length > 0,
    own.languages.length > 0 && c.languages.length > 0,
    own.use.interests && c.interestsShared,
    own.use.availability && c.overlapMinutes !== null,
    own.use.connections && c.connectionsShared,
  ];
  const value = [
    c.compatibility?.score / 100 || 0,
    intents.length ? 1 : 0,
    language ? 1 : 0,
    Math.min(commonNames.length, 3) / 3,
    Math.min(c.overlapMinutes ?? 0, 120) / 120,
    c.mutualCount > 0 || c.communities.length ? 1 : 0,
  ];
  const labels = [
    "Compatibility",
    "Shared intent",
    "Language",
    "Shared interests",
    "Shared time",
    "Connections",
  ];
  const explanations = [
    available[0]
      ? `${c.compatibility.count} comparable ratings.`
      : "Shared comparison unavailable.",
    intents.length
      ? `Shared intent: ${intents.join(", ")}.`
      : "No shared intent.",
    language ? "A language in common." : "No selected language in common.",
    available[3]
      ? `${commonNames.length} shared interests; up to 3 contribute.`
      : "Shared interests are not used or available.",
    available[4]
      ? `${c.overlapMinutes} minutes of shared weekly time; up to 120 contribute.`
      : "Shared schedule is not used or available.",
    available[5]
      ? `${c.mutualCount ?? 0} visible mutual connections; ${c.communities.length} readable communities in common.`
      : "Connections are not used or shared.",
  ];
  c.breakdown = labels.map((label, i) => ({
    label,
    points: available[i] ? Math.round(value[i] * max[i] * 10) / 10 : 0,
    max: max[i],
    available: available[i],
    explanation: explanations[i],
  }));
  c.score = Math.round(c.breakdown.reduce((s, x) => s + x.points, 0) * 10) / 10;
  c.coverage = c.breakdown.reduce((s, x) => s + (x.available ? x.max : 0), 0);
  c.reasons = [
    intents.length
      ? `Looking for ${intents.slice(0, 2).join(" or ").toLowerCase()}`
      : "",
    commonNames.length
      ? `Shared interests: ${commonNames.slice(0, 2).join(", ")}`
      : "",
    c.overlapMinutes > 0
      ? `${c.overlapMinutes} minutes of shared weekly time`
      : "",
    c.mutualCount > 0 ? `${c.mutualCount} visible mutual connections` : "",
    c.communities.length ? "A community in common" : "",
    language ? "A language in common" : "",
  ]
    .filter(Boolean)
    .slice(0, 3);
  delete c.interestsShared;
  delete c.connectionsShared;
  return c;
}
export function filterMatch(c, f, own) {
  const q = f.query.trim().normalize("NFKC").toLowerCase(),
    text = [
      c.name,
      c.note,
      ...c.interests.map(
        (id) => MATCH_INTERESTS.find((x) => x.id === id)?.label ?? "",
      ),
      ...c.communities.map((x) => x.name),
    ]
      .join(" ")
      .normalize("NFKC")
      .toLowerCase();
  return (
    (f.scope === "hidden" ? c.hidden : !c.hidden) &&
    (f.scope !== "saved" || c.saved) &&
    (!q || text.includes(q)) &&
    (!f.intent || c.intents.includes(f.intent)) &&
    (!f.language || c.languages.includes(f.language)) &&
    (!f.interest || c.interests.includes(f.interest)) &&
    (!f.community || c.communities.some((x) => x.id === f.community)) &&
    (!f.minCompatibility || c.compatibility?.score >= f.minCompatibility) &&
    (!f.online || c.status === "online") &&
    (!f.available ||
      (c.availability?.status === "Available now" && c.status !== "dnd")) &&
    (!f.mutual || c.mutualCount > 0) &&
    (f.timezone === "any" ||
      (c.availability !== null &&
        Math.abs(c.availability.utcOffset - own.utcOffset) <=
          (f.timezone === "same" ? 0 : 2)))
  );
}
export function compareMatches(a, b, sort) {
  return (
    (sort === "name"
      ? a.name.localeCompare(b.name, "en")
      : sort === "compatibility"
        ? (b.compatibility?.score ?? -1) - (a.compatibility?.score ?? -1)
        : sort === "time"
          ? (b.overlapMinutes ?? -1) - (a.overlapMinutes ?? -1)
          : 0) ||
    b.score - a.score ||
    a.memberNumber - b.memberNumber
  );
}
