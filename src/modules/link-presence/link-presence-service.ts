import type { BCAdapter } from "../../bc/adapter";
import type { EventBus } from "../../core/event-bus";
import type { SettingsStore } from "../../core/settings";
import type {
  AvatarFrame,
  KikiLinkEvents,
  PresenceSnapshot,
  PresenceStatus,
  ProfileCardStyle,
  ProfileGradient,
} from "../../core/types";
import { createId } from "../../utils/id";
import type {
  CachedPublicProfileInput,
  CachedPublicProfileRecord,
} from "../../storage/profile-cache-repository";
import type { ProfileCacheRepository } from "../../storage/profile-cache-repository";
import { normalizeImageUrl } from "../link-chat/media";

const NATIVE_REFRESH_MS = 30_000;
const CAPABILITY_REFRESH_MS = 2 * 60_000;
const STATUS_CHECK_MS = 15_000;
const REMOTE_STATUS_TTL_MS = 5 * 60_000;
const RECENT_PACKET_ONLINE_MS = 90_000;
const REQUEST_COOLDOWN_MS = 20_000;
const BACKGROUND_REQUEST_COOLDOWN_MS = 15 * 60_000;
const FORCED_REQUEST_COOLDOWN_MS = 2_000;
const REQUEST_QUEUE_INTERVAL_MS = 140;
const MAX_QUEUED_REQUESTS = 60;
const MAX_TRACKED_ONLINE_FRIENDS = 500;
const MAX_TRACKED_REMOTE_SENDERS = 500;
const INBOUND_LIVE_PACKET_RATE_WINDOW_MS = 10_000;
const MAX_INBOUND_PRESENCE_PACKETS_PER_SENDER = 8;
const MAX_INBOUND_TYPING_PACKETS_PER_SENDER = 12;
const MAX_INBOUND_LIVE_PACKETS_AGGREGATE = 1_024;
const RESPONSE_COOLDOWN_MS = 5_000;
const PROFILE_RESPONSE_COOLDOWN_MS = 2_000;
const TYPING_REFRESH_MS = 1_800;
const TYPING_TTL_MS = 5_500;
const MAX_PROTOCOL_PAYLOAD = 700;
const MAX_PROFILE_BIO_LENGTH = 160;
const UNCHANGED_PROFILE_CACHE_REFRESH_MS = 15 * 60_000;
const GROUP_CAPABILITY_VERSION = 3 as const;

type GroupCapabilityVersion = 1 | 2 | typeof GROUP_CAPABILITY_VERSION;

type PresenceListener = (memberNumber?: number) => void;

type PresencePacket =
  | { t: "pq"; i: string; b?: 1; p?: 1; e?: 1; d?: 1 }
  | { t: "pc"; v: string; g?: GroupCapabilityVersion }
  | {
      t: "ps";
      i?: string;
      s: PresenceStatus;
      m?: string;
      a?: string;
      f?: AvatarFrame;
      c?: ProfileCardStyle;
      u: number;
      v: string;
      g?: GroupCapabilityVersion;
    }
  | { t: "pf"; i: string; h?: string; o?: string; x?: string; y?: string }
  | { t: "pb"; i: string; b?: string }
  | { t: "ty"; a: 0 | 1 };

interface RemotePresence {
  status: PresenceStatus;
  statusMessage?: string;
  avatarUrl?: string;
  avatarFrame?: AvatarFrame;
  profileStyle?: ProfileCardStyle;
  addonVersion?: string;
  receivedAt: number;
  remoteUpdatedAt: number;
}

interface RemoteProfileDetails {
  bannerUrl?: string;
  bio?: string;
  profileOutlineColor?: string;
  profileGradient?: ProfileGradient;
  receivedAt: number;
}

interface PendingProfileRequest {
  id: string;
  requestedAt: number;
  expectsBio: boolean;
  detailsReceived?: boolean;
  bioReceived?: boolean;
}

interface InboundLivePacketRate {
  windowStartedAt: number;
  presencePackets: number;
  typingPackets: number;
}

interface AcceptedPresenceUpdate {
  sourceUpdatedAt: number;
  receivedAt: number;
}

export interface OwnProfilePreferences {
  enabled: boolean;
  statusMessage: string;
  bio?: string;
  avatarUrl: string;
  bannerUrl: string;
  avatarFrame?: AvatarFrame;
  profileStyle?: ProfileCardStyle;
  profileOutlineColor: string;
  profileGradient?: ProfileGradient;
  autoIdleMinutes: number;
  afkAutoReply: {
    enabled: boolean;
    message: string;
  };
}

export class LinkPresenceService {
  readonly #remote = new Map<number, RemotePresence>();
  readonly #remoteProfileDetails = new Map<number, RemoteProfileDetails>();
  readonly #compatiblePeers = new Map<number, number>();
  readonly #groupCompatiblePeers = new Map<
    number,
    { seenAt: number; version: GroupCapabilityVersion }
  >();
  readonly #remoteVersions = new Map<number, string>();
  readonly #listeners = new Set<PresenceListener>();
  readonly #lastRequestAt = new Map<number, number>();
  readonly #lastForcedRequestAt = new Map<number, number>();
  readonly #lastProfileRequestAt = new Map<number, number>();
  readonly #lastResponseAt = new Map<number, number>();
  readonly #lastProfileResponseAt = new Map<number, number>();
  readonly #pendingProfileRequests = new Map<number, PendingProfileRequest>();
  readonly #requestQueue: number[] = [];
  readonly #queuedRequests = new Set<number>();
  readonly #reachableOnlineFriends = new Set<number>();
  readonly #localTyping = new Map<number, { active: true; sentAt: number }>();
  readonly #remoteTypingUntil = new Map<number, number>();
  readonly #typingExpiryTimers = new Map<number, ReturnType<typeof setTimeout>>();
  readonly #trackedRemoteSenders = new Map<number, number>();
  readonly #inboundLivePacketRates = new Map<number, InboundLivePacketRate>();
  readonly #lastAcceptedPresenceUpdates = new Map<number, AcceptedPresenceUpdate>();
  readonly #unsubscribers: Array<() => void> = [];
  readonly #authenticatedOwnMemberNumber: number | undefined;
  #nativeTimer: ReturnType<typeof setInterval> | undefined;
  #statusTimer: ReturnType<typeof setInterval> | undefined;
  #requestTimer: ReturnType<typeof setTimeout> | undefined;
  #lastInteractionAt = Date.now();
  #lastEffectiveStatus: PresenceStatus = "online";
  #lastRoomName = "";
  #lastCapabilityBroadcastAt = 0;
  #aggregateLivePacketWindowStartedAt: number | undefined;
  #aggregateLivePacketCount = 0;
  #started = false;
  #identityInvalidated = false;

  readonly #onInteraction = (): void => {
    if (!this.#hasAuthenticatedIdentity()) return;
    const previous = this.getOwnStatus();
    this.#lastInteractionAt = Date.now();
    const next = this.getOwnStatus();
    if (previous !== next) {
      this.#lastEffectiveStatus = next;
      this.#publishOwnPresence();
      this.#notify(this.#ownMemberNumber());
    }
  };

  readonly #onVisibilityChange = (): void => {
    if (
      this.#hasAuthenticatedIdentity() &&
      typeof document !== "undefined" &&
      document.visibilityState === "visible"
    ) {
      this.#onInteraction();
      this.#refreshNativeFriends();
      this.#syncRoom(true);
    }
  };

  constructor(
    private readonly adapter: BCAdapter,
    private readonly settings: SettingsStore,
    private readonly bus: EventBus<KikiLinkEvents>,
    private readonly version: string,
    private readonly profileCache?: ProfileCacheRepository,
    expectedOwnMemberNumber?: number,
  ) {
    const currentMemberNumber = this.#readCurrentMemberNumber();
    const expectedProvided = expectedOwnMemberNumber !== undefined;
    const expectedMemberNumber = isPositiveMemberNumber(expectedOwnMemberNumber)
      ? expectedOwnMemberNumber
      : undefined;
    this.#authenticatedOwnMemberNumber = expectedProvided
      ? expectedMemberNumber
      : currentMemberNumber;
    // The account-scoped stores belong to the controller's expected identity. A readable mismatch
    // must fail closed before this instance can read or write them; an unreadable page wrapper may
    // still recover later for the same pinned account.
    this.#identityInvalidated =
      this.#authenticatedOwnMemberNumber === undefined ||
      (expectedProvided &&
        currentMemberNumber !== undefined &&
        currentMemberNumber !== expectedMemberNumber);
  }

  start(): void {
    if (
      this.#started ||
      this.#identityInvalidated ||
      this.#authenticatedOwnMemberNumber === undefined
    ) {
      return;
    }
    const identityReadable = this.#hasAuthenticatedIdentity();
    if (this.#identityInvalidated) return;
    this.#started = true;
    this.#lastEffectiveStatus = identityReadable ? this.#configuredOwnStatus() : "offline";
    this.#unsubscribers.push(
      this.bus.on("bc:protocol", (event) => this.#receive(event.senderNumber, event.payload)),
      this.bus.on("bc:online-friends", ({ friends }) => {
        if (!this.#hasAuthenticatedIdentity()) return;
        const reachableNow = new Set<number>();
        const newlyReachable: number[] = [];
        for (const friend of friends.slice(0, MAX_TRACKED_ONLINE_FRIENDS)) {
          const memberNumber = friend.memberNumber;
          if (
            !isPositiveMemberNumber(memberNumber) ||
            memberNumber === this.#authenticatedOwnMemberNumber ||
            reachableNow.has(memberNumber)
          ) {
            continue;
          }
          reachableNow.add(memberNumber);
          if (!this.#reachableOnlineFriends.has(memberNumber)) newlyReachable.push(memberNumber);
        }
        this.#reachableOnlineFriends.clear();
        for (const memberNumber of reachableNow) this.#reachableOnlineFriends.add(memberNumber);
        this.requestMany(newlyReachable);
        this.#notify();
      }),
      this.bus.on("bc:ready", () => {
        this.#refreshNativeFriends();
        this.#syncRoom(true);
      }),
    );

    if (typeof window !== "undefined") {
      window.addEventListener("pointerdown", this.#onInteraction, { passive: true });
      window.addEventListener("keydown", this.#onInteraction, { passive: true });
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.#onVisibilityChange);
    }

    this.#nativeTimer = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        this.#refreshNativeFriends();
      }
      this.#syncRoom(false);
      this.#prune();
    }, NATIVE_REFRESH_MS);
    this.#statusTimer = setInterval(() => this.#checkOwnStatus(), STATUS_CHECK_MS);
    this.#refreshNativeFriends();
    this.#syncRoom(true);
  }

  stop(): void {
    if (this.#requestTimer !== undefined) clearTimeout(this.#requestTimer);
    this.#requestTimer = undefined;
    this.#requestQueue.splice(0);
    this.#queuedRequests.clear();
    this.#reachableOnlineFriends.clear();
    if (!this.#started) return;
    for (const memberNumber of this.#localTyping.keys()) {
      this.setTyping(memberNumber, false, true);
    }
    this.#started = false;
    if (this.#nativeTimer !== undefined) clearInterval(this.#nativeTimer);
    if (this.#statusTimer !== undefined) clearInterval(this.#statusTimer);
    this.#nativeTimer = undefined;
    this.#statusTimer = undefined;
    for (const unsubscribe of this.#unsubscribers.splice(0).reverse()) unsubscribe();
    if (typeof window !== "undefined") {
      window.removeEventListener("pointerdown", this.#onInteraction);
      window.removeEventListener("keydown", this.#onInteraction);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.#onVisibilityChange);
    }
    this.#listeners.clear();
    this.#remote.clear();
    this.#remoteProfileDetails.clear();
    this.#compatiblePeers.clear();
    this.#groupCompatiblePeers.clear();
    this.#remoteVersions.clear();
    this.#lastProfileRequestAt.clear();
    this.#lastProfileResponseAt.clear();
    this.#pendingProfileRequests.clear();
    this.#localTyping.clear();
    this.#remoteTypingUntil.clear();
    for (const timer of this.#typingExpiryTimers.values()) clearTimeout(timer);
    this.#typingExpiryTimers.clear();
    this.#trackedRemoteSenders.clear();
    this.#inboundLivePacketRates.clear();
    this.#lastAcceptedPresenceUpdates.clear();
    this.#aggregateLivePacketWindowStartedAt = undefined;
    this.#aggregateLivePacketCount = 0;
  }

  subscribe(listener: PresenceListener): () => void {
    // Validate a readable identity now so a confirmed account switch invalidates the old service.
    // A temporarily guarded Player wrapper is recoverable, though: retain the subscriber so the
    // same pinned account does not permanently lose its UI updates during Firefox transitions.
    this.#hasAuthenticatedIdentity();
    if (this.#identityInvalidated) return () => undefined;
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  getOwnStatus(): PresenceStatus {
    return this.#hasAuthenticatedIdentity() ? this.#configuredOwnStatus() : "offline";
  }

  getOwnStatusMessage(): string {
    return this.#hasAuthenticatedIdentity() ? this.settings.get().linkPresence.statusMessage : "";
  }

  getOwnAvatarUrl(): string {
    return this.#hasAuthenticatedIdentity() ? this.settings.get().linkPresence.avatarUrl : "";
  }

  getOwnBannerUrl(): string {
    return this.#hasAuthenticatedIdentity() ? this.settings.get().linkPresence.bannerUrl : "";
  }

  getOwnBio(): string {
    return this.#hasAuthenticatedIdentity() ? this.settings.get().linkPresence.bio : "";
  }

  getOwnProfileOutlineColor(): string {
    return this.#hasAuthenticatedIdentity()
      ? this.settings.get().linkPresence.profileOutlineColor
      : "";
  }

  getOwnProfileGradient(): ProfileGradient | undefined {
    if (!this.#hasAuthenticatedIdentity()) return undefined;
    const gradient = this.settings.get().linkPresence.profileGradient;
    return gradient.enabled ? gradient : undefined;
  }

  hasCachedProfile(memberNumber: number, now = Date.now()): boolean {
    if (!this.#hasAuthenticatedIdentity() || !this.settings.get().linkPresence.enabled) {
      return false;
    }
    if (
      !isPositiveMemberNumber(memberNumber) ||
      (memberNumber !== this.#authenticatedOwnMemberNumber &&
        this.#rejectPeerForRelationship(memberNumber))
    ) {
      return false;
    }
    return this.#cachedProfile(memberNumber, now) !== undefined;
  }

  setOwnStatus(status: PresenceStatus): void {
    if (!this.#hasAuthenticatedIdentity()) return;
    this.settings.update((draft) => {
      draft.linkPresence.status = status;
    });
    this.#lastInteractionAt = Date.now();
    this.#lastEffectiveStatus = this.getOwnStatus();
    this.#publishOwnPresence();
    this.#notify(this.#ownMemberNumber());
  }

  setEnabled(enabled: boolean): void {
    if (!this.#hasAuthenticatedIdentity()) return;
    const previous = this.settings.get().linkPresence.enabled;
    if (previous === enabled) return;
    this.settings.update((draft) => {
      draft.linkPresence.enabled = enabled;
    });
    this.#lastEffectiveStatus = this.getOwnStatus();
    let clearedRemoteProfiles = false;
    if (previous && !enabled) {
      this.#publishOwnPresence("offline", true, false);
      clearedRemoteProfiles = this.#clearRemoteProfiles();
      this.#pendingProfileRequests.clear();
    } else if (enabled) {
      this.#syncRoom(true);
    }
    // Cached-only cards also need a full rerender so voluntary fields disappear immediately.
    this.#notify(previous && !enabled || clearedRemoteProfiles
      ? undefined
      : this.#ownMemberNumber());
  }

  setOwnProfile(profile: OwnProfilePreferences): void {
    if (!this.#hasAuthenticatedIdentity()) return;
    const previousEnabled = this.settings.get().linkPresence.enabled;
    const next = this.settings.update((draft) => {
      draft.linkPresence.enabled = profile.enabled;
      draft.linkPresence.statusMessage = profile.statusMessage;
      if (profile.bio !== undefined) draft.linkPresence.bio = profile.bio;
      draft.linkPresence.avatarUrl = profile.avatarUrl;
      draft.linkPresence.bannerUrl = profile.bannerUrl;
      if (profile.avatarFrame) draft.linkPresence.avatarFrame = profile.avatarFrame;
      if (profile.profileStyle) draft.linkPresence.profileStyle = profile.profileStyle;
      draft.linkPresence.profileOutlineColor = profile.profileOutlineColor;
      if (profile.profileGradient) draft.linkPresence.profileGradient = profile.profileGradient;
      draft.linkPresence.autoIdleMinutes = profile.autoIdleMinutes;
      draft.linkPresence.afkAutoReply = profile.afkAutoReply;
    }).linkPresence;
    this.#lastEffectiveStatus = this.getOwnStatus();

    let clearedRemoteProfiles = false;
    if (previousEnabled && !next.enabled) {
      // Omitting optional profile fields makes peers replace, rather than retain, stale avatar data.
      this.#publishOwnPresence("offline", true, false);
      clearedRemoteProfiles = this.#clearRemoteProfiles();
      this.#pendingProfileRequests.clear();
    } else if (next.enabled) {
      if (previousEnabled) this.#publishOwnPresence();
      else this.#syncRoom(true);
    }
    this.#notify(previousEnabled && !next.enabled || clearedRemoteProfiles
      ? undefined
      : this.#ownMemberNumber());
  }

  setOwnStatusMessage(statusMessage: string): void {
    if (!this.#hasAuthenticatedIdentity()) return;
    this.settings.update((draft) => {
      draft.linkPresence.statusMessage = statusMessage;
    });
    this.#publishOwnPresence();
    this.#notify(this.#ownMemberNumber());
  }

  setOwnAvatarUrl(avatarUrl: string): void {
    if (!this.#hasAuthenticatedIdentity()) return;
    this.settings.update((draft) => {
      draft.linkPresence.avatarUrl = avatarUrl;
    });
    this.#publishOwnPresence();
    this.#notify(this.#ownMemberNumber());
  }

  get(memberNumber: number, now = Date.now()): PresenceSnapshot {
    if (!this.#hasAuthenticatedIdentity()) {
      return { memberNumber, status: "unknown", source: "unknown", updatedAt: 0 };
    }
    if (memberNumber === this.#authenticatedOwnMemberNumber) {
      const config = this.settings.get().linkPresence;
      return {
        memberNumber,
        status: this.#configuredOwnStatus(),
        source: "kikilink",
        updatedAt: now,
        ...(config.statusMessage ? { statusMessage: config.statusMessage } : {}),
        ...(config.bio ? { bio: config.bio } : {}),
        ...(config.avatarUrl ? { avatarUrl: config.avatarUrl } : {}),
        ...(config.bannerUrl ? { bannerUrl: config.bannerUrl } : {}),
        avatarFrame: config.avatarFrame,
        profileStyle: config.profileStyle,
        ...(config.profileOutlineColor
          ? { profileOutlineColor: config.profileOutlineColor }
          : {}),
        ...(config.profileGradient.enabled
          ? { profileGradient: config.profileGradient }
          : {}),
        addonVersion: this.version,
      };
    }
    if (!isPositiveMemberNumber(memberNumber) || this.#rejectPeerForRelationship(memberNumber)) {
      return { memberNumber, status: "unknown", source: "unknown", updatedAt: 0 };
    }

    const cached = this.settings.get().linkPresence.enabled
      ? this.#cachedProfile(memberNumber, now)
      : undefined;
    const remote = this.#remote.get(memberNumber);
    const remoteProfileDetails = this.#remoteProfileDetails.get(memberNumber);
    let inRoom = false;
    try {
      inRoom =
        typeof this.adapter.isMemberInCurrentRoom === "function" &&
        this.adapter.isMemberInCurrentRoom(memberNumber);
    } catch {
      // Firefox can revoke native character wrappers between frames.
    }
    let currentRoomName: string | undefined;
    if (inRoom) {
      try {
        const value = typeof this.adapter.getCurrentRoomName === "function"
          ? this.adapter.getCurrentRoomName()
          : undefined;
        if (typeof value === "string" && value.trim()) currentRoomName = value;
      } catch {
        // Room presence remains observable even if its name is temporarily guarded.
      }
    }
    let onlineFriendPresent = false;
    let onlineFriendRoomName: string | undefined;
    try {
      const onlineFriend = typeof this.adapter.getOnlineFriend === "function"
        ? this.adapter.getOnlineFriend(memberNumber)
        : typeof this.adapter.getOnlineFriends === "function"
          ? this.adapter.getOnlineFriends().find((friend) => friend.memberNumber === memberNumber)
          : undefined;
      if (onlineFriend) {
        if (onlineFriend.memberNumber !== memberNumber) throw new Error("Mismatched friend record");
        if (typeof onlineFriend.roomName === "string" && onlineFriend.roomName.trim()) {
          onlineFriendRoomName = onlineFriend.roomName;
        }
        onlineFriendPresent = true;
      }
    } catch {
      // Treat a denied online-friend object as unavailable instead of rejecting a UI handler.
    }
    const observableRoomName = onlineFriendRoomName ?? currentRoomName;
    const liveProfileDetails = remoteProfileDetails &&
      now - remoteProfileDetails.receivedAt <= REMOTE_STATUS_TTL_MS
      ? remoteProfileDetails
      : undefined;
    if (
      remote &&
      now - remote.receivedAt <= REMOTE_STATUS_TTL_MS &&
      (remote.status === "offline" || inRoom || onlineFriendPresent || now - remote.receivedAt <= RECENT_PACKET_ONLINE_MS)
    ) {
      const cachedDetailsUsed =
        !liveProfileDetails && cached && hasCachedRichProfile(cached);
      return {
        memberNumber,
        status: remote.status,
        source: "kikilink",
        updatedAt: remote.remoteUpdatedAt,
        ...(remote.statusMessage ? { statusMessage: remote.statusMessage } : {}),
        ...(remote.avatarUrl ? { avatarUrl: remote.avatarUrl } : {}),
        ...(remote.avatarFrame ? { avatarFrame: remote.avatarFrame } : {}),
        ...(remote.profileStyle ? { profileStyle: remote.profileStyle } : {}),
        ...(liveProfileDetails
          ? liveProfileDetailFields(liveProfileDetails)
          : cachedPublicProfileFields(cached, true)),
        ...(remote.addonVersion ? { addonVersion: remote.addonVersion } : {}),
        ...(observableRoomName ? { roomName: observableRoomName } : {}),
        ...(cachedDetailsUsed
          ? { profileFromCache: true, profileSyncedAt: cached.richSyncedAt }
          : {}),
      };
    }
    if (inRoom) {
      const addonVersion = this.#remoteVersions.get(memberNumber) ?? cached?.addonVersion;
      return {
        memberNumber,
        status: "online",
        source: "room",
        updatedAt: now,
        ...(currentRoomName ? { roomName: currentRoomName } : {}),
        ...nonRemotePublicProfileFields(cached, liveProfileDetails),
        ...(addonVersion ? { addonVersion } : {}),
      };
    }
    if (onlineFriendPresent) {
      const addonVersion = this.#remoteVersions.get(memberNumber) ?? cached?.addonVersion;
      return {
        memberNumber,
        status: "online",
        source: "friend-list",
        updatedAt: now,
        ...(onlineFriendRoomName ? { roomName: onlineFriendRoomName } : {}),
        ...nonRemotePublicProfileFields(cached, liveProfileDetails),
        ...(addonVersion ? { addonVersion } : {}),
      };
    }
    let knownOfflineFriend = false;
    try {
      knownOfflineFriend =
        typeof this.adapter.hasOnlineFriendSnapshot === "function" &&
        typeof this.adapter.isKnownFriend === "function" &&
        this.adapter.hasOnlineFriendSnapshot() &&
        this.adapter.isKnownFriend(memberNumber);
    } catch {
      // Native friend lists may be guarded during account/screen transitions.
    }
    if (knownOfflineFriend) {
      return {
        memberNumber,
        status: "offline",
        source: "friend-list",
        updatedAt: now,
        ...nonRemotePublicProfileFields(cached, liveProfileDetails),
      };
    }
    return {
      memberNumber,
      status: "unknown",
      source: "unknown",
      updatedAt: 0,
      ...nonRemotePublicProfileFields(cached, liveProfileDetails),
    };
  }

  request(memberNumber: number, force = false, includeProfile = false): boolean {
    if (
      !this.#hasAuthenticatedIdentity() ||
      !Number.isSafeInteger(memberNumber) ||
      memberNumber <= 0 ||
      memberNumber === this.#authenticatedOwnMemberNumber
    ) {
      return false;
    }
    if (this.#rejectPeerForRelationship(memberNumber)) return false;
    const requestProfile = includeProfile && this.settings.get().linkPresence.enabled;
    if (includeProfile && !requestProfile) this.#pendingProfileRequests.delete(memberNumber);
    const now = Date.now();
    const previousRequestAt = requestProfile
      ? this.#lastProfileRequestAt.get(memberNumber)
      : force
        ? this.#lastForcedRequestAt.get(memberNumber)
        : this.#lastRequestAt.get(memberNumber);
    const cooldownMs = requestProfile || force
      ? FORCED_REQUEST_COOLDOWN_MS
      : REQUEST_COOLDOWN_MS;
    if (previousRequestAt !== undefined && now - previousRequestAt < cooldownMs) {
      return false;
    }
    const requestId = createId("p").slice(-18);
    const packet: PresencePacket = {
      t: "pq",
      i: requestId,
      ...(requestProfile ? { p: 1, e: 1, d: 1 } : {}),
    };
    this.#lastRequestAt.set(memberNumber, now);
    if (force && !requestProfile) this.#lastForcedRequestAt.set(memberNumber, now);
    if (requestProfile) {
      this.#lastProfileRequestAt.set(memberNumber, now);
      // Register before transport: virtual/test adapters may synchronously deliver the reply.
      this.#pendingProfileRequests.set(memberNumber, {
        id: requestId,
        requestedAt: now,
        expectsBio: true,
      });
    }
    if (!this.#hasAuthenticatedIdentity()) {
      if (requestProfile && this.#pendingProfileRequests.get(memberNumber)?.id === requestId) {
        this.#pendingProfileRequests.delete(memberNumber);
      }
      return false;
    }
    try {
      this.adapter.sendKikiLinkProtocol(memberNumber, JSON.stringify(packet));
      return true;
    } catch {
      // A transient BC or cross-realm failure must not turn every UI render into another send.
      if (requestProfile && this.#pendingProfileRequests.get(memberNumber)?.id === requestId) {
        this.#pendingProfileRequests.delete(memberNumber);
      }
      return false;
    }
  }

  /**
   * Quietly discovers KikiLink presence for a visible player list without bursting BC's socket.
   * Repeated renders are cheap: queued members and the normal request cooldown are deduplicated.
   */
  requestMany(memberNumbers: Iterable<number>): number {
    if (!this.#hasAuthenticatedIdentity()) return 0;
    const ownMemberNumber = this.#authenticatedOwnMemberNumber;
    const now = Date.now();
    let added = 0;
    for (const memberNumber of memberNumbers) {
      if (
        this.#requestQueue.length >= MAX_QUEUED_REQUESTS ||
        !Number.isSafeInteger(memberNumber) ||
        memberNumber <= 0 ||
        memberNumber === ownMemberNumber ||
        this.hasCompatiblePeer(memberNumber, now) ||
        this.#queuedRequests.has(memberNumber) ||
        now - (this.#lastRequestAt.get(memberNumber) ?? 0) <
          BACKGROUND_REQUEST_COOLDOWN_MS ||
        !this.#isBackgroundRouteReachable(memberNumber)
      ) {
        continue;
      }
      this.#requestQueue.push(memberNumber);
      this.#queuedRequests.add(memberNumber);
      added += 1;
    }
    if (this.#requestQueue.length > 0 && this.#requestTimer === undefined) {
      this.#drainRequestQueue();
    }
    return added;
  }

  isTyping(memberNumber: number, now = Date.now()): boolean {
    if (!this.#hasAuthenticatedIdentity()) return false;
    return (this.#remoteTypingUntil.get(memberNumber) ?? 0) > now;
  }

  hasCompatiblePeer(memberNumber: number, now = Date.now()): boolean {
    if (!this.#hasAuthenticatedIdentity()) return false;
    if (memberNumber === this.#authenticatedOwnMemberNumber) return true;
    const lastSeenAt = this.#compatiblePeers.get(memberNumber);
    return lastSeenAt !== undefined && now - lastSeenAt <= REMOTE_STATUS_TTL_MS;
  }

  /** Group packets are opt-in so older KikiLink versions are never offered as group members. */
  hasGroupChatPeer(memberNumber: number, now = Date.now()): boolean {
    if (!this.#hasAuthenticatedIdentity()) return false;
    if (memberNumber === this.#authenticatedOwnMemberNumber) return true;
    const capability = this.#groupCompatiblePeers.get(memberNumber);
    return capability !== undefined && now - capability.seenAt <= REMOTE_STATUS_TTL_MS;
  }

  /** Relay-capable group v2+ peers are required when creating a new group conversation. */
  hasGroupRelayPeer(memberNumber: number, now = Date.now()): boolean {
    if (!this.#hasAuthenticatedIdentity()) return false;
    if (memberNumber === this.#authenticatedOwnMemberNumber) return true;
    const capability = this.#groupCompatiblePeers.get(memberNumber);
    return capability !== undefined &&
      capability.version >= 2 &&
      now - capability.seenAt <= REMOTE_STATUS_TTL_MS;
  }

  /** Managed group v3 peers understand owner-authorized metadata and membership changes. */
  hasGroupManagedPeer(memberNumber: number, now = Date.now()): boolean {
    if (!this.#hasAuthenticatedIdentity()) return false;
    if (memberNumber === this.#authenticatedOwnMemberNumber) return true;
    const capability = this.#groupCompatiblePeers.get(memberNumber);
    return capability?.version === GROUP_CAPABILITY_VERSION &&
      now - capability.seenAt <= REMOTE_STATUS_TTL_MS;
  }

  setTyping(memberNumber: number, active: boolean, force = false): boolean {
    if (
      !this.#hasAuthenticatedIdentity() ||
      !Number.isSafeInteger(memberNumber) ||
      memberNumber <= 0 ||
      memberNumber === this.#authenticatedOwnMemberNumber
    ) {
      return false;
    }
    if (this.#rejectPeerForRelationship(memberNumber)) return false;
    if (!this.settings.get().linkChat.typingIndicators && !(force && !active)) return false;

    const previous = this.#localTyping.get(memberNumber);
    const now = Date.now();
    if (active && previous && now - previous.sentAt < TYPING_REFRESH_MS) return false;
    if (!active && !previous) return false;

    if (!active) this.#localTyping.delete(memberNumber);
    const packet: PresencePacket = { t: "ty", a: active ? 1 : 0 };
    if (!this.#hasAuthenticatedIdentity()) return false;
    try {
      this.adapter.sendKikiLinkProtocol(memberNumber, JSON.stringify(packet));
      if (active) this.#localTyping.set(memberNumber, { active: true, sentAt: now });
      return true;
    } catch {
      return false;
    }
  }

  #drainRequestQueue(): void {
    this.#requestTimer = undefined;
    if (!this.#hasAuthenticatedIdentity()) {
      if (!this.#identityInvalidated && this.#requestQueue.length > 0) {
        this.#requestTimer = setTimeout(
          () => this.#drainRequestQueue(),
          REQUEST_QUEUE_INTERVAL_MS,
        );
      }
      return;
    }
    let sent = false;
    while (this.#requestQueue.length > 0 && !sent) {
      const memberNumber = this.#requestQueue.shift();
      if (memberNumber === undefined) break;
      this.#queuedRequests.delete(memberNumber);
      const now = Date.now();
      if (
        !isPositiveMemberNumber(memberNumber) ||
        memberNumber === this.#authenticatedOwnMemberNumber ||
        this.hasCompatiblePeer(memberNumber, now) ||
        now - (this.#lastRequestAt.get(memberNumber) ?? 0) <
          BACKGROUND_REQUEST_COOLDOWN_MS ||
        !this.#isBackgroundRouteReachable(memberNumber)
      ) {
        continue;
      }
      sent = this.request(memberNumber);
    }
    if (this.#requestQueue.length > 0) {
      this.#requestTimer = setTimeout(
        () => this.#drainRequestQueue(),
        REQUEST_QUEUE_INTERVAL_MS,
      );
    }
  }

  #receive(senderNumber: number, payload: string): void {
    if (
      !this.#hasAuthenticatedIdentity() ||
      !isPositiveMemberNumber(senderNumber) ||
      senderNumber === this.#authenticatedOwnMemberNumber
    ) {
      return;
    }
    if (this.#rejectPeerForRelationship(senderNumber)) return;
    const packet = parsePresencePacket(payload);
    if (!packet) return;
    const receivedAt = Date.now();
    if (
      (packet.t === "ps" || packet.t === "ty") &&
      !this.#acceptInboundLivePacket(senderNumber, packet.t, receivedAt)
    ) {
      return;
    }
    if (packet.t === "ps" && this.#isStalePresenceUpdate(senderNumber, packet.u, receivedAt)) {
      return;
    }
    this.#trackRemoteSender(senderNumber, receivedAt);
    const wasCompatible = this.hasCompatiblePeer(senderNumber, receivedAt);
    this.#compatiblePeers.set(senderNumber, receivedAt);
    if (packet.t === "ty") {
      if (!this.settings.get().linkChat.typingIndicators) {
        if (!wasCompatible) this.#notify(senderNumber);
        return;
      }
      this.#receiveTyping(senderNumber, packet.a === 1);
      return;
    }
    if (packet.t === "pq") {
      if (!wasCompatible) this.#notify(senderNumber);
      const lastResponseAt = this.#lastResponseAt.get(senderNumber);
      if (lastResponseAt === undefined || receivedAt - lastResponseAt >= RESPONSE_COOLDOWN_MS) {
        this.#lastResponseAt.set(senderNumber, receivedAt);
        if (this.settings.get().linkPresence.enabled) this.#sendPresence(senderNumber, packet.i);
        else this.#sendCapability(senderNumber);
      }
      const lastProfileResponseAt = this.#lastProfileResponseAt.get(senderNumber);
      if (
        packet.p === 1 &&
        this.settings.get().linkPresence.enabled &&
        (lastProfileResponseAt === undefined ||
          receivedAt - lastProfileResponseAt >= PROFILE_RESPONSE_COOLDOWN_MS)
      ) {
        this.#lastProfileResponseAt.set(senderNumber, receivedAt);
        this.#sendProfileDetails(
          senderNumber,
          packet.i,
          packet.e === 1,
          packet.d === 1,
        );
      }
      return;
    }
    if (packet.t === "pc") {
      this.#remoteVersions.set(senderNumber, packet.v);
      if (packet.g !== undefined) {
        this.#groupCompatiblePeers.set(senderNumber, { seenAt: receivedAt, version: packet.g });
      }
      if (!wasCompatible) this.#notify(senderNumber);
      return;
    }
    if (packet.t === "pf") {
      if (!this.settings.get().linkPresence.enabled) {
        this.#pendingProfileRequests.delete(senderNumber);
        if (!wasCompatible) this.#notify(senderNumber);
        return;
      }
      const pending = this.#pendingProfileRequests.get(senderNumber);
      if (
        !pending ||
        pending.id !== packet.i ||
        receivedAt - pending.requestedAt > REMOTE_STATUS_TTL_MS
      ) {
        if (!wasCompatible) this.#notify(senderNumber);
        return;
      }
      if (pending.detailsReceived) return;
      pending.detailsReceived = true;
      if (!pending.expectsBio || pending.bioReceived) {
        this.#pendingProfileRequests.delete(senderNumber);
      }
      // A valid empty details packet deliberately clears previously advertised visual fields.
      // A bio packet can arrive immediately before or after this packet on the same BC route.
      const existing = this.#remoteProfileDetails.get(senderNumber);
      this.#remoteProfileDetails.set(senderNumber, {
        ...(packet.h ? { bannerUrl: packet.h } : {}),
        ...(pending.bioReceived && existing?.bio ? { bio: existing.bio } : {}),
        ...(packet.o ? { profileOutlineColor: packet.o } : {}),
        ...(packet.x && packet.y
          ? {
              profileGradient: {
                enabled: true,
                primary: packet.x,
                secondary: packet.y,
              },
            }
          : {}),
        receivedAt,
      });
      this.#cacheRemoteProfile(senderNumber, receivedAt, true);
      this.#notify(senderNumber);
      return;
    }
    if (packet.t === "pb") {
      if (!this.settings.get().linkPresence.enabled) {
        this.#pendingProfileRequests.delete(senderNumber);
        if (!wasCompatible) this.#notify(senderNumber);
        return;
      }
      const pending = this.#pendingProfileRequests.get(senderNumber);
      if (
        !pending ||
        !pending.expectsBio ||
        pending.id !== packet.i ||
        receivedAt - pending.requestedAt > REMOTE_STATUS_TTL_MS
      ) {
        if (!wasCompatible) this.#notify(senderNumber);
        return;
      }
      if (pending.bioReceived) return;
      pending.bioReceived = true;
      if (pending.detailsReceived) this.#pendingProfileRequests.delete(senderNumber);
      const existing = this.#remoteProfileDetails.get(senderNumber);
      this.#remoteProfileDetails.set(senderNumber, {
        ...(existing?.bannerUrl ? { bannerUrl: existing.bannerUrl } : {}),
        ...(packet.b ? { bio: packet.b } : {}),
        ...(existing?.profileOutlineColor
          ? { profileOutlineColor: existing.profileOutlineColor }
          : {}),
        ...(existing?.profileGradient ? { profileGradient: existing.profileGradient } : {}),
        receivedAt,
      });
      this.#cacheRemoteProfile(senderNumber, receivedAt, true);
      this.#notify(senderNumber);
      return;
    }
    if (packet.g !== undefined) {
      this.#groupCompatiblePeers.set(senderNumber, { seenAt: receivedAt, version: packet.g });
    }
    this.#remoteVersions.set(senderNumber, packet.v);
    this.#lastAcceptedPresenceUpdates.delete(senderNumber);
    this.#lastAcceptedPresenceUpdates.set(senderNumber, {
      sourceUpdatedAt: packet.u,
      receivedAt,
    });
    const withdrawsProfile =
      packet.s === "offline" &&
      packet.m === undefined &&
      packet.a === undefined &&
      packet.f === undefined &&
      packet.c === undefined;
    if (withdrawsProfile) this.#pendingProfileRequests.delete(senderNumber);
    // Capability and profile sharing are deliberately separate. A valid packet proves the addon
    // is installed (and enables Blossom), while disabled Presence still withholds remote profiles.
    if (!this.settings.get().linkPresence.enabled) {
      if (withdrawsProfile) this.profileCache?.remove(senderNumber);
      if (!wasCompatible) this.#notify(senderNumber);
      return;
    }

    this.#remote.set(senderNumber, {
      status: packet.s,
      ...(packet.m ? { statusMessage: packet.m } : {}),
      ...(packet.a ? { avatarUrl: packet.a } : {}),
      ...(packet.f ? { avatarFrame: packet.f } : {}),
      ...(packet.c ? { profileStyle: packet.c } : {}),
      addonVersion: packet.v,
      receivedAt,
      remoteUpdatedAt: Math.abs(packet.u - receivedAt) <= 24 * 60 * 60_000 ? packet.u : receivedAt,
    });
    if (withdrawsProfile) {
      this.#remoteProfileDetails.delete(senderNumber);
      this.profileCache?.remove(senderNumber);
    } else {
      this.#cacheRemoteProfile(senderNumber, receivedAt);
    }
    this.#notify(senderNumber);
  }

  #acceptInboundLivePacket(
    senderNumber: number,
    packetType: "ps" | "ty",
    receivedAt: number,
  ): boolean {
    const aggregateWindowStartedAt = this.#aggregateLivePacketWindowStartedAt;
    if (
      aggregateWindowStartedAt === undefined ||
      receivedAt < aggregateWindowStartedAt ||
      receivedAt - aggregateWindowStartedAt >= INBOUND_LIVE_PACKET_RATE_WINDOW_MS
    ) {
      this.#aggregateLivePacketWindowStartedAt = receivedAt;
      this.#aggregateLivePacketCount = 0;
    }

    let rate = this.#inboundLivePacketRates.get(senderNumber);
    if (
      rate &&
      (receivedAt < rate.windowStartedAt ||
        receivedAt - rate.windowStartedAt >= INBOUND_LIVE_PACKET_RATE_WINDOW_MS)
    ) {
      rate = {
        windowStartedAt: receivedAt,
        presencePackets: 0,
        typingPackets: 0,
      };
    }
    const packetCount = packetType === "ps"
      ? rate?.presencePackets ?? 0
      : rate?.typingPackets ?? 0;
    const perSenderLimit = packetType === "ps"
      ? MAX_INBOUND_PRESENCE_PACKETS_PER_SENDER
      : MAX_INBOUND_TYPING_PACKETS_PER_SENDER;
    if (
      packetCount >= perSenderLimit ||
      this.#aggregateLivePacketCount >= MAX_INBOUND_LIVE_PACKETS_AGGREGATE
    ) {
      return false;
    }

    if (!rate) {
      while (this.#inboundLivePacketRates.size >= MAX_TRACKED_REMOTE_SENDERS) {
        const oldestSender = this.#inboundLivePacketRates.keys().next().value as
          | number
          | undefined;
        if (oldestSender === undefined) break;
        this.#inboundLivePacketRates.delete(oldestSender);
      }
      rate = {
        windowStartedAt: receivedAt,
        presencePackets: 0,
        typingPackets: 0,
      };
    }
    if (packetType === "ps") rate.presencePackets += 1;
    else rate.typingPackets += 1;
    this.#inboundLivePacketRates.delete(senderNumber);
    this.#inboundLivePacketRates.set(senderNumber, rate);
    this.#aggregateLivePacketCount += 1;
    return true;
  }

  #isStalePresenceUpdate(
    senderNumber: number,
    sourceUpdatedAt: number,
    receivedAt: number,
  ): boolean {
    const previous = this.#lastAcceptedPresenceUpdates.get(senderNumber);
    return previous !== undefined &&
      receivedAt - previous.receivedAt <= REMOTE_STATUS_TTL_MS &&
      sourceUpdatedAt < previous.sourceUpdatedAt;
  }

  #trackRemoteSender(senderNumber: number, receivedAt: number): void {
    if (!this.#trackedRemoteSenders.has(senderNumber)) {
      while (this.#trackedRemoteSenders.size >= MAX_TRACKED_REMOTE_SENDERS) {
        const oldestSender = this.#trackedRemoteSenders.keys().next().value as
          | number
          | undefined;
        if (oldestSender === undefined) break;
        this.#purgePeerState(oldestSender);
      }
    } else {
      this.#trackedRemoteSenders.delete(senderNumber);
    }
    this.#trackedRemoteSenders.set(senderNumber, receivedAt);
  }

  #receiveTyping(senderNumber: number, active: boolean): void {
    const previousTimer = this.#typingExpiryTimers.get(senderNumber);
    if (previousTimer !== undefined) clearTimeout(previousTimer);
    this.#typingExpiryTimers.delete(senderNumber);

    if (!active) {
      const changed = this.#remoteTypingUntil.delete(senderNumber);
      if (changed) this.#notify(senderNumber);
      return;
    }

    const expiresAt = Date.now() + TYPING_TTL_MS;
    this.#remoteTypingUntil.set(senderNumber, expiresAt);
    this.#typingExpiryTimers.set(
      senderNumber,
      setTimeout(() => {
        this.#typingExpiryTimers.delete(senderNumber);
        if (!this.#hasAuthenticatedIdentity()) {
          // Expired state can be discarded locally, but an old account must never identify the
          // sender to subscribers after the authenticated MemberNumber has changed.
          this.#remoteTypingUntil.delete(senderNumber);
          return;
        }
        if ((this.#remoteTypingUntil.get(senderNumber) ?? 0) > Date.now()) return;
        if (this.#remoteTypingUntil.delete(senderNumber)) this.#notify(senderNumber);
      }, TYPING_TTL_MS + 25),
    );
    this.#notify(senderNumber);
  }

  #clearRemoteProfiles(): boolean {
    const changed = this.#remote.size > 0 || this.#remoteProfileDetails.size > 0;
    this.#remote.clear();
    this.#remoteProfileDetails.clear();
    return changed;
  }

  #cachedProfile(
    memberNumber: number,
    now = Date.now(),
  ): CachedPublicProfileRecord | undefined {
    try {
      return this.profileCache?.get(memberNumber, now);
    } catch {
      return undefined;
    }
  }

  #cacheRemoteProfile(memberNumber: number, now: number, forceRefresh = false): void {
    if (!this.profileCache) return;
    const remote = this.#remote.get(memberNumber);
    const details = this.#remoteProfileDetails.get(memberNumber);
    let previous: CachedPublicProfileRecord | undefined;
    try {
      previous = this.profileCache.peek(memberNumber, now);
    } catch {
      // The live packet remains useful when the optional local cache is unavailable.
    }
    if (!remote && !previous && !details) return;
    let displayName = previous?.displayName ?? `Member ${memberNumber}`;
    try {
      displayName = sanitizePresenceText(this.adapter.getMemberName(memberNumber), 80) || displayName;
    } catch {
      // A cached/fallback name is sufficient while BC replaces guarded character wrappers.
    }
    const addonVersion = remote?.addonVersion ??
      this.#remoteVersions.get(memberNumber) ??
      previous?.addonVersion;
    const input: CachedPublicProfileInput = {
      memberNumber,
      displayName,
      ...(remote?.avatarUrl
        ? { avatarUrl: remote.avatarUrl }
        : !remote && previous?.avatarUrl
          ? { avatarUrl: previous.avatarUrl }
          : {}),
      ...(remote?.avatarFrame
        ? { avatarFrame: remote.avatarFrame }
        : !remote && previous?.avatarFrame
          ? { avatarFrame: previous.avatarFrame }
          : {}),
      ...(remote?.profileStyle
        ? { profileStyle: remote.profileStyle }
        : !remote && previous?.profileStyle
          ? { profileStyle: previous.profileStyle }
          : {}),
      ...(details
        ? details.bannerUrl
          ? { bannerUrl: details.bannerUrl }
          : {}
        : previous?.bannerUrl
          ? { bannerUrl: previous.bannerUrl }
          : {}),
      ...(details
        ? details.bio
          ? { bio: details.bio }
          : {}
        : previous?.bio
          ? { bio: previous.bio }
          : {}),
      ...(details
        ? details.profileOutlineColor
          ? { profileOutlineColor: details.profileOutlineColor }
          : {}
        : previous?.profileOutlineColor
          ? { profileOutlineColor: previous.profileOutlineColor }
          : {}),
      ...(details
        ? details.profileGradient
          ? { profileGradient: details.profileGradient }
          : {}
        : previous?.profileGradient
          ? { profileGradient: previous.profileGradient }
          : {}),
      ...(details
        ? hasRemoteProfileDetails(details)
          ? { richSyncedAt: details.receivedAt }
          : {}
        : previous?.richSyncedAt !== undefined
          ? { richSyncedAt: previous.richSyncedAt }
          : {}),
      ...(previous?.profileRevision ? { profileRevision: previous.profileRevision } : {}),
      ...(addonVersion ? { addonVersion } : {}),
    };
    if (
      !forceRefresh &&
      previous &&
      cachedPublicProfileMatches(input, previous) &&
      now - previous.syncedAt < UNCHANGED_PROFILE_CACHE_REFRESH_MS
    ) {
      return;
    }
    try {
      this.profileCache.upsert(input, now);
    } catch {
      // An unavailable local store must not interrupt presence transport or UI updates.
    }
  }

  #isBackgroundRouteReachable(memberNumber: number): boolean {
    try {
      if (
        typeof this.adapter.isMemberInCurrentRoom === "function" &&
        this.adapter.isMemberInCurrentRoom(memberNumber)
      ) {
        return true;
      }
    } catch {
      // Try the native online-friend route below.
    }
    try {
      if (typeof this.adapter.getOnlineFriend === "function") {
        return this.adapter.getOnlineFriend(memberNumber)?.memberNumber === memberNumber;
      }
      return typeof this.adapter.getOnlineFriends === "function" &&
        this.adapter.getOnlineFriends().some((friend) => friend.memberNumber === memberNumber);
    } catch {
      return false;
    }
  }

  /**
   * Relationship reads form a privacy boundary. Missing or guarded native state is denied until
   * BC can prove that the peer is neither blacklisted nor ghosted.
   */
  #rejectPeerForRelationship(memberNumber: number): boolean {
    let rejected = true;
    const readRelationships = this.adapter.getPlayerRelationships;
    if (typeof readRelationships === "function") {
      try {
        const relationships = readRelationships.call(this.adapter, memberNumber);
        if (Array.isArray(relationships)) {
          rejected = relationships.some((relationship) => {
            const normalized = String(relationship).toLowerCase();
            return normalized === "blacklist" ||
              normalized === "blacklisted" ||
              normalized === "ghost" ||
              normalized === "ghosted";
          });
        }
      } catch {
        // Cross-realm Player relationship wrappers can be revoked between frames.
      }
    }
    if (rejected) this.#purgePeerState(memberNumber);
    return rejected;
  }

  #purgePeerState(memberNumber: number): void {
    let changed = false;
    changed = this.#remote.delete(memberNumber) || changed;
    changed = this.#remoteProfileDetails.delete(memberNumber) || changed;
    changed = this.#compatiblePeers.delete(memberNumber) || changed;
    changed = this.#groupCompatiblePeers.delete(memberNumber) || changed;
    changed = this.#remoteVersions.delete(memberNumber) || changed;
    changed = this.#pendingProfileRequests.delete(memberNumber) || changed;
    changed = this.#localTyping.delete(memberNumber) || changed;
    changed = this.#remoteTypingUntil.delete(memberNumber) || changed;
    changed = this.#lastRequestAt.delete(memberNumber) || changed;
    changed = this.#lastForcedRequestAt.delete(memberNumber) || changed;
    changed = this.#lastProfileRequestAt.delete(memberNumber) || changed;
    changed = this.#lastResponseAt.delete(memberNumber) || changed;
    changed = this.#lastProfileResponseAt.delete(memberNumber) || changed;
    changed = this.#queuedRequests.delete(memberNumber) || changed;
    changed = this.#reachableOnlineFriends.delete(memberNumber) || changed;
    changed = this.#trackedRemoteSenders.delete(memberNumber) || changed;
    changed = this.#inboundLivePacketRates.delete(memberNumber) || changed;
    changed = this.#lastAcceptedPresenceUpdates.delete(memberNumber) || changed;

    const queueLength = this.#requestQueue.length;
    for (let index = this.#requestQueue.length - 1; index >= 0; index -= 1) {
      if (this.#requestQueue[index] === memberNumber) this.#requestQueue.splice(index, 1);
    }
    changed = this.#requestQueue.length !== queueLength || changed;

    const typingTimer = this.#typingExpiryTimers.get(memberNumber);
    if (typingTimer !== undefined) {
      clearTimeout(typingTimer);
      this.#typingExpiryTimers.delete(memberNumber);
      changed = true;
    }
    try {
      changed = (this.profileCache?.remove(memberNumber) ?? false) || changed;
    } catch {
      // Cache persistence is optional; volatile privacy state has already been removed.
    }
    if (changed) this.#notify(memberNumber);
  }

  #sendPresence(target: number, requestId?: string): void {
    if (!this.#hasAuthenticatedIdentity()) return;
    const config = this.settings.get().linkPresence;
    const packet: PresencePacket = {
      t: "ps",
      ...(requestId ? { i: requestId } : {}),
      s: this.getOwnStatus(),
      ...(config.statusMessage ? { m: config.statusMessage } : {}),
      ...(config.avatarUrl ? { a: config.avatarUrl } : {}),
      f: config.avatarFrame,
      c: config.profileStyle,
      u: Date.now(),
      v: this.version,
      g: GROUP_CAPABILITY_VERSION,
    };
    try {
      if (!this.#hasAuthenticatedIdentity()) return;
      this.adapter.sendKikiLinkProtocol(target, serializePresencePacket(packet));
    } catch {
      // The player may have left the room or gone offline between request and response.
    }
  }

  #sendProfileDetails(
    target: number,
    requestId: string,
    supportsExtendedProfile: boolean,
    supportsBio: boolean,
  ): void {
    if (!this.#hasAuthenticatedIdentity()) return;
    const config = this.settings.get().linkPresence;
    const packet: Extract<PresencePacket, { t: "pf" }> = {
      t: "pf",
      i: requestId,
      ...(config.bannerUrl ? { h: config.bannerUrl } : {}),
      ...(config.profileOutlineColor ? { o: config.profileOutlineColor } : {}),
      ...(supportsExtendedProfile && config.profileGradient.enabled
        ? {
            x: config.profileGradient.primary,
            y: config.profileGradient.secondary,
          }
        : {}),
    };
    try {
      if (!this.#hasAuthenticatedIdentity()) return;
      if (supportsBio) {
        this.adapter.sendKikiLinkProtocol(
          target,
          serializeProfileBioPacket({
            t: "pb",
            i: requestId,
            ...(config.bio ? { b: config.bio } : {}),
          }),
        );
      }
      this.adapter.sendKikiLinkProtocol(target, serializeProfileDetailsPacket(packet));
    } catch {
      // Profile details are best-effort and are never broadcast or retried automatically.
    }
  }

  #sendCapability(target?: number): void {
    if (!this.#hasAuthenticatedIdentity()) return;
    const payload = JSON.stringify({
      t: "pc",
      v: this.version,
      g: GROUP_CAPABILITY_VERSION,
    } satisfies PresencePacket);
    try {
      if (!this.#hasAuthenticatedIdentity()) return;
      if (target === undefined) this.adapter.broadcastKikiLinkProtocol(payload);
      else this.adapter.sendKikiLinkProtocol(target, payload);
    } catch {
      // Discovery is best-effort; the room/player can disappear between native frames.
    }
  }

  #publishOwnPresence(
    statusOverride?: PresenceStatus,
    force = false,
    includeProfile = true,
  ): void {
    if (!this.#hasAuthenticatedIdentity()) return;
    if (!force && !this.settings.get().linkPresence.enabled) return;
    const config = this.settings.get().linkPresence;
    const packet: PresencePacket = {
      t: "ps",
      s: statusOverride ?? this.getOwnStatus(),
      ...(includeProfile && config.statusMessage ? { m: config.statusMessage } : {}),
      ...(includeProfile && config.avatarUrl ? { a: config.avatarUrl } : {}),
      ...(includeProfile ? { f: config.avatarFrame, c: config.profileStyle } : {}),
      u: Date.now(),
      v: this.version,
      g: GROUP_CAPABILITY_VERSION,
    };
    try {
      if (!this.#hasAuthenticatedIdentity()) return;
      this.adapter.broadcastKikiLinkProtocol(serializePresencePacket(packet));
    } catch {
      // A malformed or unexpectedly oversized local preference must never break profile controls.
    }
  }

  #syncRoom(force: boolean): void {
    if (!this.#hasAuthenticatedIdentity()) return;
    let roomName = "";
    try {
      roomName = this.adapter.isInChatRoom() ? this.adapter.getCurrentRoomName() ?? "?" : "";
    } catch {
      return;
    }
    const roomChanged = roomName !== this.#lastRoomName;
    this.#lastRoomName = roomName;
    if (!roomName) return;

    // A peer can join after our first room announcement or can finish loading its addon later.
    // The query runs on entry; enabled profiles use the existing heartbeat while disabled profiles
    // send only a much slower capability refresh. Neither produces visible chat noise.
    if (force || roomChanged) {
      if (!this.#hasAuthenticatedIdentity()) return;
      const query: PresencePacket = { t: "pq", i: createId("room").slice(-18), b: 1 };
      try {
        this.adapter.broadcastKikiLinkProtocol(JSON.stringify(query));
      } catch {
        // Guarded or temporarily unavailable native transport must not abort service startup.
      }
    }
    if (this.settings.get().linkPresence.enabled) {
      this.#publishOwnPresence();
      return;
    }
    const now = Date.now();
    if (force || roomChanged || now - this.#lastCapabilityBroadcastAt >= CAPABILITY_REFRESH_MS) {
      this.#lastCapabilityBroadcastAt = now;
      this.#sendCapability();
    }
  }

  #checkOwnStatus(): void {
    if (!this.#hasAuthenticatedIdentity()) return;
    const effective = this.#configuredOwnStatus();
    if (effective === this.#lastEffectiveStatus) return;
    this.#lastEffectiveStatus = effective;
    this.#publishOwnPresence();
    this.#notify(this.#ownMemberNumber());
  }

  #prune(now = Date.now()): void {
    if (!this.#hasAuthenticatedIdentity()) return;
    const changed = new Set<number>();
    for (const [memberNumber, remote] of this.#remote) {
      if (now - remote.receivedAt <= REMOTE_STATUS_TTL_MS) continue;
      this.#remote.delete(memberNumber);
      changed.add(memberNumber);
    }
    for (const [memberNumber, details] of this.#remoteProfileDetails) {
      if (now - details.receivedAt <= REMOTE_STATUS_TTL_MS) continue;
      this.#remoteProfileDetails.delete(memberNumber);
      changed.add(memberNumber);
    }
    for (const [memberNumber, lastSeenAt] of this.#compatiblePeers) {
      if (now - lastSeenAt <= REMOTE_STATUS_TTL_MS) continue;
      this.#compatiblePeers.delete(memberNumber);
      this.#groupCompatiblePeers.delete(memberNumber);
      this.#remoteVersions.delete(memberNumber);
      changed.add(memberNumber);
    }
    for (const [memberNumber, capability] of this.#groupCompatiblePeers) {
      if (now - capability.seenAt <= REMOTE_STATUS_TTL_MS) continue;
      this.#groupCompatiblePeers.delete(memberNumber);
    }
    for (const [memberNumber, requestedAt] of this.#lastRequestAt) {
      if (now - requestedAt > BACKGROUND_REQUEST_COOLDOWN_MS) {
        this.#lastRequestAt.delete(memberNumber);
      }
    }
    for (const [memberNumber, requestedAt] of this.#lastForcedRequestAt) {
      if (now - requestedAt > REMOTE_STATUS_TTL_MS) this.#lastForcedRequestAt.delete(memberNumber);
    }
    for (const [memberNumber, requestedAt] of this.#lastProfileRequestAt) {
      if (now - requestedAt > REMOTE_STATUS_TTL_MS) this.#lastProfileRequestAt.delete(memberNumber);
    }
    for (const [memberNumber, respondedAt] of this.#lastResponseAt) {
      if (now - respondedAt > REMOTE_STATUS_TTL_MS) this.#lastResponseAt.delete(memberNumber);
    }
    for (const [memberNumber, respondedAt] of this.#lastProfileResponseAt) {
      if (now - respondedAt > REMOTE_STATUS_TTL_MS) {
        this.#lastProfileResponseAt.delete(memberNumber);
      }
    }
    for (const [memberNumber, pending] of this.#pendingProfileRequests) {
      if (now - pending.requestedAt > REMOTE_STATUS_TTL_MS) {
        this.#pendingProfileRequests.delete(memberNumber);
      }
    }
    for (const [memberNumber, lastTrackedAt] of this.#trackedRemoteSenders) {
      if (now - lastTrackedAt <= REMOTE_STATUS_TTL_MS) continue;
      this.#trackedRemoteSenders.delete(memberNumber);
      this.#inboundLivePacketRates.delete(memberNumber);
      this.#lastAcceptedPresenceUpdates.delete(memberNumber);
    }
    try {
      this.profileCache?.prune(now);
    } catch {
      // The cache is an optional optimization and never owns live presence state.
    }
    for (const memberNumber of changed) this.#notify(memberNumber);
  }

  #notify(memberNumber?: number): void {
    for (const listener of [...this.#listeners]) {
      try {
        listener(memberNumber);
      } catch {
        // A detached UI listener must not interrupt presence protocol processing.
      }
    }
  }

  #configuredOwnStatus(): PresenceStatus {
    const config = this.settings.get().linkPresence;
    if (config.status !== "online" || config.autoIdleMinutes === 0) return config.status;
    return Date.now() - this.#lastInteractionAt >= config.autoIdleMinutes * 60_000
      ? "idle"
      : "online";
  }

  #readCurrentMemberNumber(): number | undefined {
    try {
      const value = this.adapter.getOwnMemberNumber();
      return Number.isSafeInteger(value) && value > 0 ? value : undefined;
    } catch {
      return undefined;
    }
  }

  #hasAuthenticatedIdentity(): boolean {
    if (this.#identityInvalidated || this.#authenticatedOwnMemberNumber === undefined) {
      return false;
    }
    const currentMemberNumber = this.#readCurrentMemberNumber();
    // A missing/revoked Player wrapper is transient. Stay silent but retain the pinned identity so
    // the same account can recover without discarding compatibility or presence state.
    if (currentMemberNumber === undefined) return false;
    if (currentMemberNumber !== this.#authenticatedOwnMemberNumber) {
      this.#invalidateForAccountSwitch();
      return false;
    }
    return true;
  }

  #invalidateForAccountSwitch(): void {
    if (this.#identityInvalidated) return;
    this.#identityInvalidated = true;
    this.#started = false;

    if (this.#requestTimer !== undefined) clearTimeout(this.#requestTimer);
    if (this.#nativeTimer !== undefined) clearInterval(this.#nativeTimer);
    if (this.#statusTimer !== undefined) clearInterval(this.#statusTimer);
    this.#requestTimer = undefined;
    this.#nativeTimer = undefined;
    this.#statusTimer = undefined;
    this.#requestQueue.splice(0);
    this.#queuedRequests.clear();
    this.#reachableOnlineFriends.clear();

    for (const unsubscribe of this.#unsubscribers.splice(0).reverse()) unsubscribe();
    if (typeof window !== "undefined") {
      window.removeEventListener("pointerdown", this.#onInteraction);
      window.removeEventListener("keydown", this.#onInteraction);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.#onVisibilityChange);
    }

    this.#remote.clear();
    this.#remoteProfileDetails.clear();
    this.#compatiblePeers.clear();
    this.#groupCompatiblePeers.clear();
    this.#remoteVersions.clear();
    this.#lastRequestAt.clear();
    this.#lastForcedRequestAt.clear();
    this.#lastProfileRequestAt.clear();
    this.#lastResponseAt.clear();
    this.#lastProfileResponseAt.clear();
    this.#pendingProfileRequests.clear();
    this.#localTyping.clear();
    this.#remoteTypingUntil.clear();
    for (const timer of this.#typingExpiryTimers.values()) clearTimeout(timer);
    this.#typingExpiryTimers.clear();
    this.#trackedRemoteSenders.clear();
    this.#inboundLivePacketRates.clear();
    this.#lastAcceptedPresenceUpdates.clear();
    this.#aggregateLivePacketWindowStartedAt = undefined;
    this.#aggregateLivePacketCount = 0;
    this.#lastRoomName = "";
    this.#lastCapabilityBroadcastAt = 0;
    this.#lastEffectiveStatus = "offline";

    // Let the old view discard cached voluntary fields before its normal teardown runs.
    this.#notify();
    this.#listeners.clear();
  }

  #ownMemberNumber(): number {
    return this.#hasAuthenticatedIdentity()
      ? (this.#authenticatedOwnMemberNumber ?? -1)
      : -1;
  }

  #refreshNativeFriends(): void {
    if (!this.#hasAuthenticatedIdentity()) return;
    try {
      this.adapter.refreshOnlineFriends();
    } catch {
      // Native online-friend state is best effort during account and screen transitions.
    }
  }
}

function cachedPublicProfileFields(
  cached: CachedPublicProfileRecord | undefined,
  richOnly = false,
): Partial<PresenceSnapshot> {
  if (!cached || (richOnly && !hasCachedRichProfile(cached))) return {};
  const profileSyncedAt = richOnly ? cached.richSyncedAt : cached.syncedAt;
  return {
    ...(!richOnly && cached.avatarUrl ? { avatarUrl: cached.avatarUrl } : {}),
    ...(!richOnly && cached.avatarFrame ? { avatarFrame: cached.avatarFrame } : {}),
    ...(!richOnly && cached.profileStyle ? { profileStyle: cached.profileStyle } : {}),
    ...(cached.bannerUrl ? { bannerUrl: cached.bannerUrl } : {}),
    ...(cached.bio ? { bio: cached.bio } : {}),
    ...(cached.profileOutlineColor
      ? { profileOutlineColor: cached.profileOutlineColor }
      : {}),
    ...(cached.profileGradient ? { profileGradient: cached.profileGradient } : {}),
    ...(!richOnly && cached.addonVersion ? { addonVersion: cached.addonVersion } : {}),
    profileFromCache: true,
    ...(profileSyncedAt !== undefined ? { profileSyncedAt } : {}),
  };
}

function cachedBasicProfileFields(
  cached: CachedPublicProfileRecord | undefined,
): Partial<PresenceSnapshot> {
  if (
    !cached ||
    !(cached.avatarUrl || cached.avatarFrame || cached.profileStyle || cached.addonVersion)
  ) {
    return {};
  }
  return {
    ...(cached.avatarUrl ? { avatarUrl: cached.avatarUrl } : {}),
    ...(cached.avatarFrame ? { avatarFrame: cached.avatarFrame } : {}),
    ...(cached.profileStyle ? { profileStyle: cached.profileStyle } : {}),
    ...(cached.addonVersion ? { addonVersion: cached.addonVersion } : {}),
    profileFromCache: true,
    profileSyncedAt: cached.syncedAt,
  };
}

function liveProfileDetailFields(details: RemoteProfileDetails): Partial<PresenceSnapshot> {
  return {
    ...(details.bannerUrl ? { bannerUrl: details.bannerUrl } : {}),
    ...(details.bio ? { bio: details.bio } : {}),
    ...(details.profileOutlineColor
      ? { profileOutlineColor: details.profileOutlineColor }
      : {}),
    ...(details.profileGradient ? { profileGradient: details.profileGradient } : {}),
  };
}

function nonRemotePublicProfileFields(
  cached: CachedPublicProfileRecord | undefined,
  liveDetails: RemoteProfileDetails | undefined,
): Partial<PresenceSnapshot> {
  if (!liveDetails) return cachedPublicProfileFields(cached);
  return {
    ...cachedBasicProfileFields(cached),
    ...liveProfileDetailFields(liveDetails),
  };
}

function hasCachedRichProfile(cached: CachedPublicProfileRecord): boolean {
  return Boolean(
    cached.bannerUrl || cached.bio || cached.profileOutlineColor || cached.profileGradient,
  );
}

function hasRemoteProfileDetails(details: RemoteProfileDetails): boolean {
  return Boolean(
    details.bannerUrl || details.bio || details.profileOutlineColor || details.profileGradient,
  );
}

function cachedPublicProfileMatches(
  input: CachedPublicProfileInput,
  cached: CachedPublicProfileRecord,
): boolean {
  return input.memberNumber === cached.memberNumber &&
    input.displayName === cached.displayName &&
    input.avatarUrl === cached.avatarUrl &&
    input.avatarFrame === cached.avatarFrame &&
    input.profileStyle === cached.profileStyle &&
    input.bannerUrl === cached.bannerUrl &&
    input.bio === cached.bio &&
    input.profileOutlineColor === cached.profileOutlineColor &&
    input.richSyncedAt === cached.richSyncedAt &&
    input.profileRevision === cached.profileRevision &&
    input.addonVersion === cached.addonVersion &&
    input.profileGradient?.enabled === cached.profileGradient?.enabled &&
    input.profileGradient?.primary === cached.profileGradient?.primary &&
    input.profileGradient?.secondary === cached.profileGradient?.secondary;
}

function parsePresencePacket(payload: string): PresencePacket | null {
  // JSON is ASCII-heavy, so character length is a cheap lower bound for UTF-8 byte length.
  // Reject obviously oversized packets before asking TextEncoder to allocate for hostile input.
  if (payload.length > MAX_PROTOCOL_PAYLOAD || utf8ByteLength(payload) > MAX_PROTOCOL_PAYLOAD) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || !("t" in value)) return null;
  if (value.t === "pq") {
    if (!("i" in value) || !isRequestId(value.i)) {
      return null;
    }
    return {
      t: "pq",
      i: value.i,
      ...("b" in value && value.b === 1 ? { b: 1 } : {}),
      ...("p" in value && value.p === 1 ? { p: 1 } : {}),
      ...("e" in value && value.e === 1 ? { e: 1 } : {}),
      ...("d" in value && value.d === 1 ? { d: 1 } : {}),
    };
  }
  if (value.t === "ty") {
    if (!("a" in value) || (value.a !== 0 && value.a !== 1)) return null;
    return { t: "ty", a: value.a };
  }
  if (value.t === "pc") {
    if (
      !("v" in value) ||
      typeof value.v !== "string" ||
      value.v.length < 1 ||
      value.v.length > 24
    ) {
      return null;
    }
    const version = sanitizePresenceText(value.v, 24);
    return version
      ? {
          t: "pc",
          v: version,
          ...("g" in value && isGroupCapabilityVersion(value.g) ? { g: value.g } : {}),
        }
      : null;
  }
  if (value.t === "pf") {
    if (
      !hasExactKeys(value, ["t", "i", "h", "o", "x", "y"]) ||
      !("i" in value) ||
      !isRequestId(value.i)
    ) {
      return null;
    }
    const banner = "h" in value ? sanitizeDirectProfileImageUrl(value.h) : "";
    if ("h" in value && !banner) return null;
    const outline = "o" in value ? sanitizeProfileColor(value.o) : "";
    if ("o" in value && !outline) return null;
    const hasPrimary = "x" in value;
    const hasSecondary = "y" in value;
    if (hasPrimary !== hasSecondary) return null;
    const primary = "x" in value ? sanitizeProfileColor(value.x) : "";
    const secondary = "y" in value ? sanitizeProfileColor(value.y) : "";
    if ((hasPrimary && !primary) || (hasSecondary && !secondary)) return null;
    return {
      t: "pf",
      i: value.i,
      ...(banner ? { h: banner } : {}),
      ...(outline ? { o: outline } : {}),
      ...(primary && secondary ? { x: primary, y: secondary } : {}),
    };
  }
  if (value.t === "pb") {
    if (
      !hasExactKeys(value, ["t", "i", "b"]) ||
      !("i" in value) ||
      !isRequestId(value.i)
    ) {
      return null;
    }
    const bio = "b" in value ? sanitizeProfileBio(value.b) : "";
    if ("b" in value && !bio) return null;
    return {
      t: "pb",
      i: value.i,
      ...(bio ? { b: bio } : {}),
    };
  }
  if (
    value.t !== "ps" ||
    !("s" in value) ||
    !isPresenceStatus(value.s) ||
    !("u" in value) ||
    typeof value.u !== "number" ||
    !Number.isSafeInteger(value.u) ||
    value.u < 0 ||
    !("v" in value) ||
    typeof value.v !== "string" ||
    value.v.length < 1 ||
    value.v.length > 24
  ) {
    return null;
  }
  const message = "m" in value && typeof value.m === "string"
    ? sanitizePresenceText(value.m, 80)
    : "";
  const avatar = "a" in value ? sanitizeDirectProfileImageUrl(value.a) : "";
  const requestId = "i" in value && isRequestId(value.i) ? value.i : "";
  const avatarFrame = "f" in value && isAvatarFrame(value.f) ? value.f : undefined;
  const profileStyle = "c" in value && isProfileCardStyle(value.c) ? value.c : undefined;
  const version = sanitizePresenceText(value.v, 24);
  if (!version) return null;
  return {
    t: "ps",
    ...(requestId ? { i: requestId } : {}),
    s: value.s,
    ...(message ? { m: message } : {}),
    ...(avatar ? { a: avatar } : {}),
    ...(avatarFrame ? { f: avatarFrame } : {}),
    ...(profileStyle ? { c: profileStyle } : {}),
    u: value.u,
    v: version,
    ...("g" in value && isGroupCapabilityVersion(value.g) ? { g: value.g } : {}),
  };
}

const UNSAFE_PRESENCE_TEXT = /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu;

function sanitizePresenceText(value: string, maxLength: number): string {
  return value.replace(UNSAFE_PRESENCE_TEXT, " ").replace(/\s+/gu, " ").trim().slice(0, maxLength);
}

function sanitizeProfileBio(value: unknown): string {
  if (typeof value !== "string") return "";
  const cleaned = value
    .replace(UNSAFE_PRESENCE_TEXT, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return [...cleaned].slice(0, MAX_PROFILE_BIO_LENGTH).join("");
}

export function serializePresencePacket(packet: Extract<PresencePacket, { t: "ps" }>): string {
  if (!isPresenceStatus(packet.s) || !Number.isFinite(packet.u)) {
    throw new Error("Invalid required presence fields");
  }
  const version = sanitizePresenceText(packet.v, 24);
  if (!version) throw new Error("Invalid presence version");
  const message = packet.m === undefined ? "" : sanitizePresenceText(packet.m, 80);
  const avatar = packet.a === undefined ? "" : sanitizeDirectProfileImageUrl(packet.a);
  const bounded: Extract<PresencePacket, { t: "ps" }> = {
    t: "ps",
    ...(packet.i !== undefined && isRequestId(packet.i) ? { i: packet.i } : {}),
    s: packet.s,
    ...(message ? { m: message } : {}),
    ...(avatar ? { a: avatar } : {}),
    ...(packet.f !== undefined && isAvatarFrame(packet.f) ? { f: packet.f } : {}),
    ...(packet.c !== undefined && isProfileCardStyle(packet.c) ? { c: packet.c } : {}),
    u: packet.u,
    v: version,
    ...(packet.g !== undefined && isGroupCapabilityVersion(packet.g) ? { g: packet.g } : {}),
  };
  let payload = JSON.stringify(bounded);
  // Required status/time/version always win. Long optional URLs and escaped status notes can make
  // otherwise valid preferences exceed the adapter's transport ceiling.
  for (const optional of ["a", "m", "f", "c", "i"] as const) {
    if (utf8ByteLength(payload) <= MAX_PROTOCOL_PAYLOAD) return payload;
    delete bounded[optional];
    payload = JSON.stringify(bounded);
  }
  return payload;
}

export function serializeProfileDetailsPacket(
  packet: Extract<PresencePacket, { t: "pf" }>,
): string {
  if (!isRequestId(packet.i)) throw new Error("Invalid profile-details request ID");
  const banner = packet.h === undefined ? "" : sanitizeDirectProfileImageUrl(packet.h);
  if (packet.h !== undefined && !banner) throw new Error("Invalid profile banner URL");
  const outline = packet.o === undefined ? "" : sanitizeProfileColor(packet.o);
  if (packet.o !== undefined && !outline) throw new Error("Invalid profile outline color");
  const hasPrimary = packet.x !== undefined;
  const hasSecondary = packet.y !== undefined;
  if (hasPrimary !== hasSecondary) throw new Error("Profile gradient colors must be sent together");
  const primary = hasPrimary ? sanitizeProfileColor(packet.x) : "";
  const secondary = hasSecondary ? sanitizeProfileColor(packet.y) : "";
  if ((hasPrimary && !primary) || (hasSecondary && !secondary)) {
    throw new Error("Invalid profile gradient color");
  }
  const bounded: Extract<PresencePacket, { t: "pf" }> = {
    t: "pf",
    i: packet.i,
    ...(banner ? { h: banner } : {}),
    ...(outline ? { o: outline } : {}),
    ...(primary && secondary ? { x: primary, y: secondary } : {}),
  };
  let payload = JSON.stringify(bounded);
  for (const optional of [["h"], ["x", "y"], ["o"]] as const) {
    if (utf8ByteLength(payload) <= MAX_PROTOCOL_PAYLOAD) return payload;
    for (const key of optional) delete bounded[key];
    payload = JSON.stringify(bounded);
  }
  return payload;
}

export function serializeProfileBioPacket(
  packet: Extract<PresencePacket, { t: "pb" }>,
): string {
  if (!isRequestId(packet.i)) throw new Error("Invalid profile-bio request ID");
  const bio = packet.b === undefined ? "" : sanitizeProfileBio(packet.b);
  if (packet.b !== undefined && !bio) throw new Error("Invalid profile bio");
  const payload = JSON.stringify({
    t: "pb",
    i: packet.i,
    ...(bio ? { b: bio } : {}),
  } satisfies Extract<PresencePacket, { t: "pb" }>);
  if (utf8ByteLength(payload) > MAX_PROTOCOL_PAYLOAD) {
    throw new Error("Profile bio exceeds the protocol limit");
  }
  return payload;
}

function isAvatarFrame(value: unknown): value is AvatarFrame {
  return value === "none" ||
    value === "blossom" ||
    value === "rose" ||
    value === "starlight" ||
    value === "laurel" ||
    value === "thorn" ||
    value === "moon" ||
    value === "ribbon";
}

function isProfileCardStyle(value: unknown): value is ProfileCardStyle {
  return value === "classic" || value === "garden" || value === "midnight";
}

function isPresenceStatus(value: unknown): value is PresenceStatus {
  return value === "online" || value === "idle" || value === "dnd" || value === "offline";
}

function isGroupCapabilityVersion(value: unknown): value is GroupCapabilityVersion {
  return value === 1 || value === 2 || value === GROUP_CAPABILITY_VERSION;
}

function isPositiveMemberNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function sanitizeDirectProfileImageUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const candidate = value.trim();
  if (!candidate || candidate.length > 500) return "";
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return "";
  }
  const normalized = normalizeImageUrl(candidate);
  return normalized && normalized === parsed.href && normalized.length <= 500 ? normalized : "";
}

function sanitizeProfileColor(value: unknown): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/iu.test(value)
    ? value.toLowerCase()
    : "";
}

function isRequestId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9_-]{1,32}$/iu.test(value);
}

function hasExactKeys(value: object, allowed: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.every((key) => allowed.includes(key));
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}
