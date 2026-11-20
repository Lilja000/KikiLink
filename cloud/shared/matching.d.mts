export interface MatchSignal {
  published: boolean;
  intents: string[];
  languages: string[];
  interests: string[];
  availability: "Available now" | "Planning ahead" | "Not looking";
  days: number[];
  from: string;
  to: string;
  utcOffset: number;
  duration: number;
  size: "One-to-one" | "Small group" | "Either";
  note: string;
  audience: "Everyone" | "Friends";
  expiresAt: number | null;
  use: {
    compatibility: boolean;
    interests: boolean;
    availability: boolean;
    connections: boolean;
  };
  share: {
    compatibility: "Details" | "Score only" | "Off";
    interests: boolean;
    availability: boolean;
    connections: boolean;
  };
}
export interface MatchFilters {
  query: string;
  scope: "all" | "saved" | "hidden";
  intent: string;
  language: string;
  interest: string;
  community: string;
  minCompatibility: number;
  online: boolean;
  available: boolean;
  mutual: boolean;
  timezone: "any" | "same" | "near";
  sort: "recommended" | "compatibility" | "time" | "name";
  priority: "balanced" | "compatibility" | "time";
}
export interface MatchPerson {
  memberNumber: number;
  name: string;
  username: string | null;
}
export interface MatchCandidate extends MatchPerson {
  note: string;
  intents: string[];
  languages: string[];
  size: string;
  signalRevision: number;
  expiresAt: number | null;
  interests: string[];
  availability: {
    status: string;
    days: number[];
    from: string;
    to: string;
    utcOffset: number;
    duration: number;
  } | null;
  status: "online" | "idle" | "dnd" | "unavailable" | null;
  compatibility: {
    status: "available" | "insufficient";
    count: number;
    score: number | null;
    hardLimitConflictCount: number;
    details: Array<{ id: string; yours: string; theirs: string }>;
  } | null;
  mutualCount: number | null;
  communities: Array<{ id: string; name: string }>;
  overlapMinutes: number | null;
  saved: boolean;
  hidden: boolean;
  choiceRevision: number;
  canRequest: boolean;
  activeConnection?: { id: string } & (
    { state: "Pending"; expiresAt: number } | { state: "Accepted"; expiresAt: null }
  );
  score: number;
  coverage: number;
  breakdown: Array<{
    label: string;
    points: number;
    max: number;
    available: boolean;
    explanation: string;
  }>;
  reasons: string[];
}
export interface MatchOwn {
  owner: number;
  revision: number;
  signal: MatchSignal;
  active: boolean;
  canPublish: boolean;
  serverNow: number;
}
export interface MatchRequest {
  id: string;
  direction: "Incoming" | "Outgoing";
  state: "Pending" | "Accepted" | "Declined" | "Cancelled" | "Expired";
  revision: number;
  createdAt: number;
  expiresAt: number;
  updatedAt: number;
  peer: MatchPerson | null;
  intent: string | null;
  message: string | null;
  ownRevision: number;
  peerRevision: number | null;
  canAccept: boolean;
  canCancel: boolean;
  canDecline: boolean;
}
export interface MatchChoice {
  target: number;
  revision: number;
  saved: boolean;
  hidden: boolean;
  peer: MatchPerson | null;
}
export const MATCH_INTENTS: readonly string[];
export const MATCH_LANGUAGES: readonly string[];
export function matchLanguageOptions(selected: readonly string[]): readonly string[];
export const MATCH_INTERESTS: readonly { id: string; label: string }[];
export const MATCH_STATES: readonly string[];
export const MATCH_DAY: number;
export const MATCH_HISTORY_DAYS: number;
export const DEFAULT_MATCH_SIGNAL: Readonly<MatchSignal>;
export const DEFAULT_MATCH_FILTERS: Readonly<MatchFilters>;
export function matchObject(v: unknown): v is Record<string, unknown>;
export function matchExact(
  v: unknown,
  keys: string[],
): v is Record<string, unknown>;
export function matchInteger(
  v: unknown,
  min?: number,
  max?: number,
): v is number;
export function matchText(v: unknown, max: number): v is string;
export function matchUuid(v: unknown): v is string;
export function checkedMatchSignal(v: unknown): MatchSignal;
export function checkedMatchFilters(v: unknown): MatchFilters;
export function matchingOverlap(
  a: Pick<MatchSignal, "days" | "from" | "to" | "utcOffset">,
  b: Pick<MatchSignal, "days" | "from" | "to" | "utcOffset">,
): number;
export function rankMatch(
  candidate: Omit<
    MatchCandidate,
    "score" | "coverage" | "breakdown" | "reasons"
  > & { interestsShared: boolean; connectionsShared: boolean },
  own: MatchSignal,
  priority?: MatchFilters["priority"],
): MatchCandidate;
export function filterMatch(
  c: MatchCandidate,
  f: MatchFilters,
  own: MatchSignal,
): boolean;
export function compareMatches(
  a: MatchCandidate,
  b: MatchCandidate,
  sort: MatchFilters["sort"],
): number;
