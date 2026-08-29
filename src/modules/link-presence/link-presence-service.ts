import type { BCAdapter } from "../../bc/adapter";
import type { EventBus } from "../../core/event-bus";
import type { SettingsStore } from "../../core/settings";
import type {
  AvatarFrame,
  KikiLinkEvents,
  PresenceSnapshot,
  PresenceStatus,
  ProfileCardStyle,
} from "../../core/types";
import { createId } from "../../utils/id";
import { normalizeImageUrl } from "../link-chat/media";

const NATIVE_REFRESH_MS = 30_000;
const CAPABILITY_REFRESH_MS = 2 * 60_000;
const STATUS_CHECK_MS = 15_000;
const REMOTE_STATUS_TTL_MS = 5 * 60_000;
const RECENT_PACKET_ONLINE_MS = 90_000;
const REQUEST_COOLDOWN_MS = 20_000;
const FORCED_REQUEST_COOLDOWN_MS = 2_000;
const REQUEST_QUEUE_INTERVAL_MS = 140;
const MAX_QUEUED_REQUESTS = 60;
const RESPONSE_COOLDOWN_MS = 5_000;
const PROFILE_RESPONSE_COOLDOWN_MS = 2_000;
const TYPING_REFRESH_MS = 1_800;
const TYPING_TTL_MS = 5_500;
const MAX_PROTOCOL_PAYLOAD = 700;

type PresenceListener = (memberNumber?: number) => void;

type PresencePacket =
  | { t: "pq"; i: string; b?: 1; p?: 1 }
  | { t: "pc"; v: string; g?: 1 | 2 }
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
      g?: 1 | 2;
    }
  | { t: "pf"; i: string; h?: string; o?: string }
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
  profileOutlineColor?: string;
  receivedAt: number;
}

interface PendingProfileRequest {
  id: string;
  requestedAt: number;
}

export interface OwnProfilePreferences {
  enabled: boolean;
  statusMessage: string;
  avatarUrl: string;
  bannerUrl: string;
  avatarFrame?: AvatarFrame;
  profileStyle?: ProfileCardStyle;
  profileOutlineColor: string;
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
  readonly #groupCompatiblePeers = new Map<number, { seenAt: number; version: 1 | 2 }>();
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
  readonly #localTyping = new Map<number, { active: true; sentAt: number }>();
  readonly #remoteTypingUntil = new Map<number, number>();
  readonly #typingExpiryTimers = new Map<number, ReturnType<typeof setTimeout>>();
  readonly #unsubscribers: Array<() => void> = [];
  readonly #authenticatedOwnMemberNumber: number | undefined;
  #nativeTimer: ReturnType<typeof setInterval> | undefined;
  #statusTimer: ReturnType<typeof setInterval> | undefined;
  #requestTimer: ReturnType<typeof setTimeout> | undefined;
  #lastInteractionAt = Date.now();
  #lastEffectiveStatus: PresenceStatus = "online";
  #lastRoomName = "";
  #lastCapabilityBroadcastAt = 0;
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
  ) {
    this.#authenticatedOwnMemberNumber = this.#readCurrentMemberNumber();
    // Without a trusted account identity there is no safe settings owner to recover later.
    this.#identityInvalidated = this.#authenticatedOwnMemberNumber === undefined;
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
      this.bus.on("bc:online-friends", () => {
        if (this.#hasAuthenticatedIdentity()) this.#notify();
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

  getOwnProfileOutlineColor(): string {
    return this.#hasAuthenticatedIdentity()
      ? this.settings.get().linkPresence.profileOutlineColor
      : "";
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
    this.#notify(clearedRemoteProfiles ? undefined : this.#ownMemberNumber());
  }

  setOwnProfile(profile: OwnProfilePreferences): void {
    if (!this.#hasAuthenticatedIdentity()) return;
    const previousEnabled = this.settings.get().linkPresence.enabled;
    const next = this.settings.update((draft) => {
      draft.linkPresence.enabled = profile.enabled;
      draft.linkPresence.statusMessage = profile.statusMessage;
      draft.linkPresence.avatarUrl = profile.avatarUrl;
      draft.linkPresence.bannerUrl = profile.bannerUrl;
      if (profile.avatarFrame) draft.linkPresence.avatarFrame = profile.avatarFrame;
      if (profile.profileStyle) draft.linkPresence.profileStyle = profile.profileStyle;
      draft.linkPresence.profileOutlineColor = profile.profileOutlineColor;
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
    this.#notify(clearedRemoteProfiles ? undefined : this.#ownMemberNumber());
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
        ...(config.avatarUrl ? { avatarUrl: config.avatarUrl } : {}),
        ...(config.bannerUrl ? { bannerUrl: config.bannerUrl } : {}),
        avatarFrame: config.avatarFrame,
        profileStyle: config.profileStyle,
        ...(config.profileOutlineColor
          ? { profileOutlineColor: config.profileOutlineColor }
          : {}),
        addonVersion: this.version,
      };
    }

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
    if (
      remote &&
      now - remote.receivedAt <= REMOTE_STATUS_TTL_MS &&
      (remote.status === "offline" || inRoom || onlineFriendPresent || now - remote.receivedAt <= RECENT_PACKET_ONLINE_MS)
    ) {
      return {
        memberNumber,
        status: remote.status,
        source: "kikilink",
        updatedAt: remote.remoteUpdatedAt,
        ...(remote.statusMessage ? { statusMessage: remote.statusMessage } : {}),
        ...(remote.avatarUrl ? { avatarUrl: remote.avatarUrl } : {}),
        ...(remote.avatarFrame ? { avatarFrame: remote.avatarFrame } : {}),
        ...(remote.profileStyle ? { profileStyle: remote.profileStyle } : {}),
        ...(remoteProfileDetails && now - remoteProfileDetails.receivedAt <= REMOTE_STATUS_TTL_MS
          ? {
              ...(remoteProfileDetails.bannerUrl
                ? { bannerUrl: remoteProfileDetails.bannerUrl }
                : {}),
              ...(remoteProfileDetails.profileOutlineColor
                ? { profileOutlineColor: remoteProfileDetails.profileOutlineColor }
                : {}),
            }
          : {}),
        ...(remote.addonVersion ? { addonVersion: remote.addonVersion } : {}),
        ...(observableRoomName ? { roomName: observableRoomName } : {}),
      };
    }
    if (inRoom) {
      const addonVersion = this.#remoteVersions.get(memberNumber);
      return {
        memberNumber,
        status: "online",
        source: "room",
        updatedAt: now,
        ...(currentRoomName ? { roomName: currentRoomName } : {}),
        ...(addonVersion ? { addonVersion } : {}),
      };
    }
    if (onlineFriendPresent) {
      const addonVersion = this.#remoteVersions.get(memberNumber);
      return {
        memberNumber,
        status: "online",
        source: "friend-list",
        updatedAt: now,
        ...(onlineFriendRoomName ? { roomName: onlineFriendRoomName } : {}),
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
      return { memberNumber, status: "offline", source: "friend-list", updatedAt: now };
    }
    return { memberNumber, status: "unknown", source: "unknown", updatedAt: 0 };
  }

  request(memberNumber: number, force = false, includeProfile = false): boolean {
    if (
      !this.#hasAuthenticatedIdentity() ||
      !Number.isSafeInteger(memberNumber) ||
      memberNumber < 0 ||
      memberNumber === this.#authenticatedOwnMemberNumber
    ) {
      return false;
    }
    const now = Date.now();
    const previousRequestAt = includeProfile
      ? this.#lastProfileRequestAt.get(memberNumber)
      : force
        ? this.#lastForcedRequestAt.get(memberNumber)
        : this.#lastRequestAt.get(memberNumber);
    const cooldownMs = includeProfile || force
      ? FORCED_REQUEST_COOLDOWN_MS
      : REQUEST_COOLDOWN_MS;
    if (previousRequestAt !== undefined && now - previousRequestAt < cooldownMs) {
      return false;
    }
    const requestId = createId("p").slice(-18);
    const packet: PresencePacket = {
      t: "pq",
      i: requestId,
      ...(includeProfile ? { p: 1 } : {}),
    };
    this.#lastRequestAt.set(memberNumber, now);
    if (force && !includeProfile) this.#lastForcedRequestAt.set(memberNumber, now);
    if (includeProfile) {
      this.#lastProfileRequestAt.set(memberNumber, now);
      // Register before transport: virtual/test adapters may synchronously deliver the reply.
      this.#pendingProfileRequests.set(memberNumber, { id: requestId, requestedAt: now });
    }
    if (!this.#hasAuthenticatedIdentity()) {
      if (includeProfile && this.#pendingProfileRequests.get(memberNumber)?.id === requestId) {
        this.#pendingProfileRequests.delete(memberNumber);
      }
      return false;
    }
    try {
      this.adapter.sendKikiLinkProtocol(memberNumber, JSON.stringify(packet));
      return true;
    } catch {
      // A transient BC or cross-realm failure must not turn every UI render into another send.
      if (includeProfile && this.#pendingProfileRequests.get(memberNumber)?.id === requestId) {
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
        memberNumber < 0 ||
        memberNumber === ownMemberNumber ||
        this.hasCompatiblePeer(memberNumber, now) ||
        this.#queuedRequests.has(memberNumber) ||
        now - (this.#lastRequestAt.get(memberNumber) ?? 0) < REQUEST_COOLDOWN_MS
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

  /** Relay-capable group v2 peers are required when creating a new group conversation. */
  hasGroupRelayPeer(memberNumber: number, now = Date.now()): boolean {
    if (!this.#hasAuthenticatedIdentity()) return false;
    if (memberNumber === this.#authenticatedOwnMemberNumber) return true;
    const capability = this.#groupCompatiblePeers.get(memberNumber);
    return capability?.version === 2 && now - capability.seenAt <= REMOTE_STATUS_TTL_MS;
  }

  setTyping(memberNumber: number, active: boolean, force = false): boolean {
    if (
      !this.#hasAuthenticatedIdentity() ||
      !Number.isSafeInteger(memberNumber) ||
      memberNumber < 0 ||
      memberNumber === this.#authenticatedOwnMemberNumber
    ) {
      return false;
    }
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
    const memberNumber = this.#requestQueue.shift();
    if (memberNumber === undefined) return;
    this.#queuedRequests.delete(memberNumber);
    this.request(memberNumber);
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
      senderNumber === this.#authenticatedOwnMemberNumber
    ) {
      return;
    }
    const packet = parsePresencePacket(payload);
    if (!packet) return;
    const receivedAt = Date.now();
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
        this.#sendProfileDetails(senderNumber, packet.i);
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
      this.#pendingProfileRequests.delete(senderNumber);
      // A valid empty details packet deliberately clears previously advertised optional fields.
      this.#remoteProfileDetails.set(senderNumber, {
        ...(packet.h ? { bannerUrl: packet.h } : {}),
        ...(packet.o ? { profileOutlineColor: packet.o } : {}),
        receivedAt,
      });
      this.#notify(senderNumber);
      return;
    }
    if (packet.g !== undefined) {
      this.#groupCompatiblePeers.set(senderNumber, { seenAt: receivedAt, version: packet.g });
    }
    this.#remoteVersions.set(senderNumber, packet.v);
    // Capability and profile sharing are deliberately separate. A valid packet proves the addon
    // is installed (and enables Blossom), while disabled Presence still withholds remote profiles.
    if (!this.settings.get().linkPresence.enabled) {
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
    if (
      packet.s === "offline" &&
      packet.m === undefined &&
      packet.a === undefined &&
      packet.f === undefined &&
      packet.c === undefined
    ) {
      this.#remoteProfileDetails.delete(senderNumber);
    }
    this.#notify(senderNumber);
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
      g: 2,
    };
    try {
      if (!this.#hasAuthenticatedIdentity()) return;
      this.adapter.sendKikiLinkProtocol(target, serializePresencePacket(packet));
    } catch {
      // The player may have left the room or gone offline between request and response.
    }
  }

  #sendProfileDetails(target: number, requestId: string): void {
    if (!this.#hasAuthenticatedIdentity()) return;
    const config = this.settings.get().linkPresence;
    const packet: Extract<PresencePacket, { t: "pf" }> = {
      t: "pf",
      i: requestId,
      ...(config.bannerUrl ? { h: config.bannerUrl } : {}),
      ...(config.profileOutlineColor ? { o: config.profileOutlineColor } : {}),
    };
    try {
      if (!this.#hasAuthenticatedIdentity()) return;
      this.adapter.sendKikiLinkProtocol(target, serializeProfileDetailsPacket(packet));
    } catch {
      // Profile details are best-effort and are never broadcast or retried automatically.
    }
  }

  #sendCapability(target?: number): void {
    if (!this.#hasAuthenticatedIdentity()) return;
    const payload = JSON.stringify({ t: "pc", v: this.version, g: 2 } satisfies PresencePacket);
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
      g: 2,
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
      this.adapter.broadcastKikiLinkProtocol(JSON.stringify(query));
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
      if (now - requestedAt > REMOTE_STATUS_TTL_MS) this.#lastRequestAt.delete(memberNumber);
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
          ...("g" in value && (value.g === 1 || value.g === 2) ? { g: value.g } : {}),
        }
      : null;
  }
  if (value.t === "pf") {
    if (!hasExactKeys(value, ["t", "i", "h", "o"]) || !("i" in value) || !isRequestId(value.i)) {
      return null;
    }
    const banner = "h" in value ? sanitizeDirectProfileImageUrl(value.h) : "";
    if ("h" in value && !banner) return null;
    const outline = "o" in value ? sanitizeProfileOutlineColor(value.o) : "";
    if ("o" in value && !outline) return null;
    return {
      t: "pf",
      i: value.i,
      ...(banner ? { h: banner } : {}),
      ...(outline ? { o: outline } : {}),
    };
  }
  if (
    value.t !== "ps" ||
    !("s" in value) ||
    !isPresenceStatus(value.s) ||
    !("u" in value) ||
    typeof value.u !== "number" ||
    !Number.isFinite(value.u) ||
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
    ...("g" in value && (value.g === 1 || value.g === 2) ? { g: value.g } : {}),
  };
}

const UNSAFE_PRESENCE_TEXT = /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu;

function sanitizePresenceText(value: string, maxLength: number): string {
  return value.replace(UNSAFE_PRESENCE_TEXT, " ").replace(/\s+/gu, " ").trim().slice(0, maxLength);
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
    ...(packet.g === 1 || packet.g === 2 ? { g: packet.g } : {}),
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
  const outline = packet.o === undefined ? "" : sanitizeProfileOutlineColor(packet.o);
  if (packet.o !== undefined && !outline) throw new Error("Invalid profile outline color");
  const bounded: Extract<PresencePacket, { t: "pf" }> = {
    t: "pf",
    i: packet.i,
    ...(banner ? { h: banner } : {}),
    ...(outline ? { o: outline } : {}),
  };
  let payload = JSON.stringify(bounded);
  for (const optional of ["h", "o"] as const) {
    if (utf8ByteLength(payload) <= MAX_PROTOCOL_PAYLOAD) return payload;
    delete bounded[optional];
    payload = JSON.stringify(bounded);
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

function sanitizeProfileOutlineColor(value: unknown): string {
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
