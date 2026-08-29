import { describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { MemoryKeyValueStorage, type KeyValueStorage } from "../src/core/settings";
import type { BeepEvent } from "../src/core/types";
import {
  RELEASE_NOTICE_GLOBAL_WINDOW_MS,
  RELEASE_NOTICE_MAX_ATTEMPTS_PER_SESSION,
  RELEASE_NOTICE_STORAGE_PREFIX,
  ReleaseNoticeService,
  compareReleaseVersions,
  releaseNoticeMessage,
  type ReleaseNoticePeerDirectory,
} from "../src/modules/link-chat/release-notice-service";

interface ReleaseNoticeFixture {
  service: ReleaseNoticeService;
  sendBeep: ReturnType<typeof vi.fn<(memberNumber: number, content: string, includeRoom: boolean) => BeepEvent>>;
  versions: Map<number, string>;
  compatible: Set<number>;
  knownFriends: Set<number>;
  onlineFriends: Set<number>;
  roomMembers: Set<number>;
  setNow(value: number): void;
}

function setup(options: {
  currentVersion?: string;
  storage?: KeyValueStorage;
  ownMemberNumber?: number;
  isKnownFriend?: (memberNumber: number) => boolean;
  sendBeep?: ReleaseNoticeFixture["sendBeep"];
  now?: number;
} = {}): ReleaseNoticeFixture {
  let now = options.now ?? 1_000;
  const versions = new Map<number, string>([[123, "0.26.0"]]);
  const compatible = new Set<number>([123]);
  const knownFriends = new Set<number>([123]);
  const onlineFriends = new Set<number>([123]);
  const roomMembers = new Set<number>();
  const sendBeep = options.sendBeep ?? vi.fn(
    (memberNumber: number, content: string, includeRoom: boolean): BeepEvent => ({
      direction: "outgoing",
      peerNumber: memberNumber,
      peerName: `Member ${memberNumber}`,
      content,
      sentAt: now,
      includeRoom,
    }),
  );
  const adapter = {
    canSendBeep: () => true,
    getOwnMemberNumber: () => options.ownMemberNumber ?? 999,
    isKnownFriend: options.isKnownFriend ?? ((memberNumber: number) => knownFriends.has(memberNumber)),
    isMemberInCurrentRoom: (memberNumber: number) => roomMembers.has(memberNumber),
    getOnlineFriend: (memberNumber: number) => onlineFriends.has(memberNumber)
      ? { memberNumber, memberName: `Member ${memberNumber}`, privateRoom: false }
      : undefined,
    sendBeep,
  } satisfies Pick<
    BCAdapter,
    | "canSendBeep"
    | "getOnlineFriend"
    | "getOwnMemberNumber"
    | "isKnownFriend"
    | "isMemberInCurrentRoom"
    | "sendBeep"
  >;
  const peers: ReleaseNoticePeerDirectory = {
    hasCompatiblePeer: (memberNumber) => compatible.has(memberNumber),
    getCompatiblePeerVersion: (memberNumber) => versions.get(memberNumber),
  };
  const service = new ReleaseNoticeService(
    adapter,
    peers,
    options.storage ?? new MemoryKeyValueStorage(),
    options.currentVersion ?? "0.27.0",
    { now: () => now },
  );
  return {
    service,
    sendBeep,
    versions,
    compatible,
    knownFriends,
    onlineFriends,
    roomMembers,
    setNow(value) {
      now = value;
    },
  };
}

describe("ReleaseNoticeService", () => {
  it("returns one concise private ordinary Beep for a reachable compatible older peer", () => {
    const state = setup();

    const event = state.service.maybeNotify(123);

    expect(event).toEqual({
      direction: "outgoing",
      peerNumber: 123,
      peerName: "Member 123",
      content: releaseNoticeMessage("0.27.0"),
      sentAt: 1_000,
      includeRoom: false,
    });
    expect(state.sendBeep).toHaveBeenCalledOnce();
    expect(state.sendBeep).toHaveBeenCalledWith(
      123,
      "KikiLink 0.27.0 is available. Update it in your userscript manager.",
      false,
    );
    expect(state.service.maybeNotify(123)).toBeUndefined();
    expect(state.sendBeep).toHaveBeenCalledOnce();
  });

  it("persists dedupe per recipient and announced version across service restarts", () => {
    const storage = new MemoryKeyValueStorage();
    const first = setup({ storage, currentVersion: "0.27.0" });
    expect(first.service.maybeNotify(123)).toBeDefined();
    expect(storage.getItem(`${RELEASE_NOTICE_STORAGE_PREFIX}123:0.27.0`)).toBe("sent");

    const restarted = setup({ storage, currentVersion: "0.27.0" });
    expect(restarted.service.maybeNotify(123)).toBeUndefined();
    expect(restarted.sendBeep).not.toHaveBeenCalled();

    const nextRelease = setup({ storage, currentVersion: "0.28.0" });
    expect(nextRelease.service.maybeNotify(123)).toBeDefined();
    expect(nextRelease.sendBeep).toHaveBeenCalledOnce();
    expect(storage.getItem(`${RELEASE_NOTICE_STORAGE_PREFIX}123:0.28.0`)).toBe("sent");
  });

  it("never sends to an equal, newer, malformed, self, or live-version-unknown peer", () => {
    for (const remoteVersion of [
      "0.27.0",
      "0.28.0",
      "0.027.0",
      "0.26",
      "v0.26.0",
      " 0.26.0",
      "0.26.0\n",
    ]) {
      const state = setup();
      state.versions.set(123, remoteVersion);
      expect(state.service.maybeNotify(123), remoteVersion).toBeUndefined();
      expect(state.sendBeep, remoteVersion).not.toHaveBeenCalled();
    }

    const self = setup({ ownMemberNumber: 123 });
    expect(self.service.maybeNotify(123)).toBeUndefined();
    expect(self.sendBeep).not.toHaveBeenCalled();

    const cachedOnly = setup();
    cachedOnly.versions.delete(123);
    expect(cachedOnly.service.maybeNotify(123)).toBeUndefined();
    expect(cachedOnly.sendBeep).not.toHaveBeenCalled();
  });

  it("requires friendship, recent compatibility, and a currently observable native route", () => {
    const incompatible = setup();
    incompatible.compatible.delete(123);
    expect(incompatible.service.maybeNotify(123)).toBeUndefined();

    const unreachable = setup();
    unreachable.onlineFriends.delete(123);
    expect(unreachable.service.maybeNotify(123)).toBeUndefined();

    const roomRoute = setup();
    roomRoute.onlineFriends.delete(123);
    roomRoute.roomMembers.add(123);
    expect(roomRoute.service.maybeNotify(123)).toBeDefined();

    const roomStranger = setup();
    roomStranger.onlineFriends.delete(123);
    roomStranger.roomMembers.add(123);
    roomStranger.knownFriends.delete(123);
    expect(roomStranger.service.maybeNotify(123)).toBeUndefined();

    const guardedFriendList = setup({
      isKnownFriend: () => {
        throw new Error("guarded");
      },
    });
    expect(guardedFriendList.service.maybeNotify(123)).toBeUndefined();

    expect(incompatible.sendBeep).not.toHaveBeenCalled();
    expect(unreachable.sendBeep).not.toHaveBeenCalled();
    expect(roomRoute.sendBeep).toHaveBeenCalledOnce();
    expect(roomStranger.sendBeep).not.toHaveBeenCalled();
    expect(guardedFriendList.sendBeep).not.toHaveBeenCalled();
  });

  it("limits native attempts to one per minute and three per addon session", () => {
    const state = setup();
    for (const memberNumber of [1, 2, 3, 4]) {
      state.compatible.add(memberNumber);
      state.versions.set(memberNumber, "0.26.0");
      state.knownFriends.add(memberNumber);
      state.onlineFriends.add(memberNumber);
    }

    expect(state.service.maybeNotify(1)).toBeDefined();
    expect(state.service.maybeNotify(2)).toBeUndefined();
    state.setNow(1_000 + RELEASE_NOTICE_GLOBAL_WINDOW_MS);
    expect(state.service.maybeNotify(2)).toBeDefined();
    state.setNow(1_000 + 2 * RELEASE_NOTICE_GLOBAL_WINDOW_MS);
    expect(state.service.maybeNotify(3)).toBeDefined();
    state.setNow(1_000 + 3 * RELEASE_NOTICE_GLOBAL_WINDOW_MS);
    expect(state.service.maybeNotify(4)).toBeUndefined();

    expect(state.sendBeep).toHaveBeenCalledTimes(RELEASE_NOTICE_MAX_ATTEMPTS_PER_SESSION);
  });

  it("fails closed when storage cannot be read or a swallowed write cannot be verified", () => {
    const unreadableStorage: KeyValueStorage = {
      getItem: () => null,
      getItemResult: () => ({ ok: false }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const unreadable = setup({ storage: unreadableStorage });
    expect(unreadable.service.maybeNotify(123)).toBeUndefined();
    expect(unreadable.sendBeep).not.toHaveBeenCalled();

    class SilentlyDeniedStorage extends MemoryKeyValueStorage {
      override setItem(): void {
        // Mirrors storage wrappers that swallow a denied backing write.
      }
    }
    const denied = setup({ storage: new SilentlyDeniedStorage() });
    expect(denied.service.maybeNotify(123)).toBeUndefined();
    expect(denied.sendBeep).not.toHaveBeenCalled();

    const conservative = new MemoryKeyValueStorage();
    conservative.setItem(`${RELEASE_NOTICE_STORAGE_PREFIX}123:0.27.0`, "unknown-marker");
    const malformedExistingMarker = setup({ storage: conservative });
    expect(malformedExistingMarker.service.maybeNotify(123)).toBeUndefined();
    expect(malformedExistingMarker.sendBeep).not.toHaveBeenCalled();
  });

  it("reserves before transport, prevents re-entrant sends, and only retries after reload", () => {
    const storage = new MemoryKeyValueStorage();
    let service: ReleaseNoticeService;
    const sendBeep = vi.fn((_memberNumber: number, _content: string, _includeRoom: boolean) => {
      expect(service.maybeNotify(123)).toBeUndefined();
      throw new Error("offline");
    });
    const failed = setup({ storage, sendBeep });
    service = failed.service;

    expect(service.maybeNotify(123)).toBeUndefined();
    expect(service.maybeNotify(123)).toBeUndefined();
    expect(sendBeep).toHaveBeenCalledOnce();
    expect(storage.getItem(`${RELEASE_NOTICE_STORAGE_PREFIX}123:0.27.0`)).toBeNull();

    const restarted = setup({ storage });
    expect(restarted.service.maybeNotify(123)).toBeDefined();
    expect(restarted.sendBeep).toHaveBeenCalledOnce();
  });

  it("keeps dedupe isolated when callers provide different account-scoped stores", () => {
    const accountA = setup({ storage: new MemoryKeyValueStorage() });
    const accountB = setup({ storage: new MemoryKeyValueStorage() });

    expect(accountA.service.maybeNotify(123)).toBeDefined();
    expect(accountB.service.maybeNotify(123)).toBeDefined();
    expect(accountA.sendBeep).toHaveBeenCalledOnce();
    expect(accountB.sendBeep).toHaveBeenCalledOnce();
  });
});

describe("compareReleaseVersions", () => {
  it.each([
    ["0.10.0", "0.9.0", 1],
    ["1.0.0", "1.0.0-rc.1", 1],
    ["1.0.0-rc.10", "1.0.0-rc.2", 1],
    ["1.0.0-alpha.1", "1.0.0-alpha.beta", -1],
    ["1.0.0+local", "1.0.0+remote", 0],
    ["12345678901234567890.0.0", "9999999999999999999.0.0", 1],
  ] as const)("compares %s with %s", (left, right, expected) => {
    expect(compareReleaseVersions(left, right)).toBe(expected);
  });

  it.each([
    "",
    "1",
    "1.2",
    "01.2.3",
    "1.02.3",
    "1.2.03",
    "1.2.3-01",
    "v1.2.3",
    "1.2.3 ",
    "1.2.3/../../x",
    "1.2.3-",
  ])("rejects malformed version %j", (version) => {
    expect(compareReleaseVersions("1.2.3", version)).toBeUndefined();
    expect(compareReleaseVersions(version, "1.2.3")).toBeUndefined();
  });
});
