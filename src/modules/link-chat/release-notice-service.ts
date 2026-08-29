import type { BCAdapter } from "../../bc/adapter";
import type { KeyValueStorage } from "../../core/settings";
import type { BeepEvent } from "../../core/types";

export const RELEASE_NOTICE_STORAGE_PREFIX = "kikilink:release-notice:v1:";
export const RELEASE_NOTICE_GLOBAL_WINDOW_MS = 60_000;
export const RELEASE_NOTICE_MAX_ATTEMPTS_PER_WINDOW = 1;
export const RELEASE_NOTICE_MAX_ATTEMPTS_PER_SESSION = 3;

const RELEASE_NOTICE_MARKER = "sent";
const MAX_VERSION_LENGTH = 64;
const SEMVER_PATTERN =
  /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/u;

type ReleaseNoticeAdapter = Pick<
  BCAdapter,
  | "canSendBeep"
  | "getOnlineFriend"
  | "getOwnMemberNumber"
  | "isKnownFriend"
  | "isMemberInCurrentRoom"
  | "sendBeep"
>;

export interface ReleaseNoticePeerDirectory {
  hasCompatiblePeer(memberNumber: number, now?: number): boolean;
  /** Returns only a version learned from a live, still-compatible protocol peer. */
  getCompatiblePeerVersion(memberNumber: number, now?: number): string | undefined;
}

export interface ReleaseNoticeOptions {
  now?(): number;
}

interface ParsedReleaseVersion {
  core: readonly [string, string, string];
  prerelease: readonly string[];
}

/**
 * Sends a deliberately scarce ordinary Beep when a live KikiLink peer advertises an older release.
 *
 * The injected storage must be scoped to the authenticated BC account. A marker is committed and
 * read back before transport so a reload or re-entrant protocol event cannot duplicate the notice.
 * Storage uncertainty fails closed: missing persistence may suppress a notice, but never creates a
 * retry loop that can spam another player.
 */
export class ReleaseNoticeService {
  readonly #attemptedPairs = new Set<string>();
  readonly #recentAttemptTimes: number[] = [];
  readonly #now: () => number;
  readonly #currentVersionValid: boolean;
  #sessionAttempts = 0;

  constructor(
    private readonly adapter: ReleaseNoticeAdapter,
    private readonly peers: ReleaseNoticePeerDirectory,
    private readonly storage: KeyValueStorage,
    private readonly currentVersion: string,
    options: ReleaseNoticeOptions = {},
  ) {
    const clock = options.now;
    this.#now = clock ? () => clock.call(options) : Date.now;
    this.#currentVersionValid = parseReleaseVersion(currentVersion) !== undefined;
  }

  maybeNotify(memberNumber: number): BeepEvent | undefined {
    if (
      !this.#currentVersionValid ||
      !Number.isSafeInteger(memberNumber) ||
      memberNumber <= 0
    ) {
      return undefined;
    }

    const now = this.#safeNow();
    let compatible = false;
    let remoteVersion: string | undefined;
    try {
      compatible = this.peers.hasCompatiblePeer(memberNumber, now);
      remoteVersion = this.peers.getCompatiblePeerVersion(memberNumber, now);
    } catch {
      return undefined;
    }
    if (
      !compatible ||
      !remoteVersion ||
      compareReleaseVersions(this.currentVersion, remoteVersion) !== 1 ||
      !this.#isReachable(memberNumber)
    ) {
      return undefined;
    }

    const pair = `${memberNumber}:${this.currentVersion}`;
    if (this.#attemptedPairs.has(pair)) return undefined;
    this.#pruneRateWindow(now);
    if (
      this.#sessionAttempts >= RELEASE_NOTICE_MAX_ATTEMPTS_PER_SESSION ||
      this.#recentAttemptTimes.length >= RELEASE_NOTICE_MAX_ATTEMPTS_PER_WINDOW
    ) {
      return undefined;
    }

    const markerKey = `${RELEASE_NOTICE_STORAGE_PREFIX}${pair}`;
    const previousMarker = this.#readMarker(markerKey);
    if (!previousMarker.available || previousMarker.value !== null) {
      this.#attemptedPairs.add(pair);
      return undefined;
    }

    // Reserve every transport attempt synchronously. Even a throwing/re-entrant adapter can cause
    // at most one native send attempt for this peer/version during the current addon session.
    this.#attemptedPairs.add(pair);
    if (!this.#commitMarker(markerKey)) return undefined;
    this.#sessionAttempts += 1;
    this.#recentAttemptTimes.push(now);

    try {
      return this.adapter.sendBeep(
        memberNumber,
        releaseNoticeMessage(this.currentVersion),
        false,
      );
    } catch {
      // A synchronous transport rejection did not send anything. Best-effort rollback permits one
      // retry after a future page load; the session reservation still prevents a local failure loop.
      try {
        this.storage.removeItem(markerKey);
      } catch {
        // Leaving the marker behind is the safer failure mode: it suppresses rather than duplicates.
      }
      return undefined;
    }
  }

  #isReachable(memberNumber: number): boolean {
    try {
      if (!this.adapter.canSendBeep()) return false;
      const ownMemberNumber = this.adapter.getOwnMemberNumber();
      if (
        !Number.isSafeInteger(ownMemberNumber) ||
        ownMemberNumber <= 0 ||
        ownMemberNumber === memberNumber
      ) {
        return false;
      }
      // A shared room proves transport reachability, not consent to unsolicited release Beeps.
      // Restrict this addon-authored message to the authenticated account's native BC friends.
      if (!this.adapter.isKnownFriend(memberNumber)) return false;
    } catch {
      return false;
    }

    try {
      if (this.adapter.isMemberInCurrentRoom(memberNumber)) return true;
    } catch {
      // Try the native online-friend route below.
    }
    try {
      return this.adapter.getOnlineFriend(memberNumber)?.memberNumber === memberNumber;
    } catch {
      return false;
    }
  }

  #safeNow(): number {
    try {
      const now = this.#now();
      return Number.isFinite(now) && now >= 0 ? now : Date.now();
    } catch {
      return Date.now();
    }
  }

  #pruneRateWindow(now: number): void {
    while (
      this.#recentAttemptTimes.length > 0 &&
      now - (this.#recentAttemptTimes[0] ?? now) >= RELEASE_NOTICE_GLOBAL_WINDOW_MS
    ) {
      this.#recentAttemptTimes.shift();
    }
  }

  #commitMarker(key: string): boolean {
    try {
      this.storage.setItem(key, RELEASE_NOTICE_MARKER);
    } catch {
      return false;
    }
    const written = this.#readMarker(key);
    return written.available && written.value === RELEASE_NOTICE_MARKER;
  }

  #readMarker(key: string): { available: boolean; value: string | null } {
    try {
      if (typeof this.storage.getItemResult === "function") {
        const result = this.storage.getItemResult(key);
        if (!result.ok) return { available: false, value: null };
        return { available: true, value: result.value };
      }
      return { available: true, value: this.storage.getItem(key) };
    } catch {
      return { available: false, value: null };
    }
  }
}

export function releaseNoticeMessage(version: string): string {
  return `KikiLink ${version} is available. Update it in your userscript manager.`;
}

/** Returns SemVer precedence, or `undefined` when either input is not a strict release version. */
export function compareReleaseVersions(
  left: string,
  right: string,
): -1 | 0 | 1 | undefined {
  const parsedLeft = parseReleaseVersion(left);
  const parsedRight = parseReleaseVersion(right);
  if (!parsedLeft || !parsedRight) return undefined;

  for (let index = 0; index < parsedLeft.core.length; index += 1) {
    const precedence = compareNumericIdentifiers(
      parsedLeft.core[index] ?? "0",
      parsedRight.core[index] ?? "0",
    );
    if (precedence !== 0) return precedence;
  }

  if (parsedLeft.prerelease.length === 0 && parsedRight.prerelease.length === 0) return 0;
  if (parsedLeft.prerelease.length === 0) return 1;
  if (parsedRight.prerelease.length === 0) return -1;

  const identifiers = Math.max(parsedLeft.prerelease.length, parsedRight.prerelease.length);
  for (let index = 0; index < identifiers; index += 1) {
    const leftIdentifier = parsedLeft.prerelease[index];
    const rightIdentifier = parsedRight.prerelease[index];
    if (leftIdentifier === undefined) return -1;
    if (rightIdentifier === undefined) return 1;
    if (leftIdentifier === rightIdentifier) continue;
    const leftNumeric = /^[0-9]+$/u.test(leftIdentifier);
    const rightNumeric = /^[0-9]+$/u.test(rightIdentifier);
    if (leftNumeric && rightNumeric) {
      return compareNumericIdentifiers(leftIdentifier, rightIdentifier);
    }
    if (leftNumeric) return -1;
    if (rightNumeric) return 1;
    return leftIdentifier < rightIdentifier ? -1 : 1;
  }
  return 0;
}

function parseReleaseVersion(value: string): ParsedReleaseVersion | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_VERSION_LENGTH) {
    return undefined;
  }
  const match = SEMVER_PATTERN.exec(value);
  if (!match) return undefined;
  const prerelease = match[4]?.split(".") ?? [];
  if (
    prerelease.some(
      (identifier) => /^[0-9]+$/u.test(identifier) && identifier.length > 1 && identifier[0] === "0",
    )
  ) {
    return undefined;
  }
  return {
    core: [match[1] ?? "0", match[2] ?? "0", match[3] ?? "0"],
    prerelease,
  };
}

function compareNumericIdentifiers(left: string, right: string): -1 | 0 | 1 {
  if (left.length !== right.length) return left.length < right.length ? -1 : 1;
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
