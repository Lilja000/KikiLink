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
const TYPING_REFRESH_MS = 1_800;
const TYPING_TTL_MS = 5_500;
const MAX_PROTOCOL_PAYLOAD = 700;

type PresenceListener = (memberNumber?: number) => void;

type PresencePacket =
  | { t: "pq"; i: string; b?: 1 }
  | { t: "pc"; v: string; g?: 1 }
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
      g?: 1;
    }
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

export interface OwnProfilePreferences {
  enabled: boolean;
  statusMessage: string;
  avatarUrl: string;
  avatarFrame?: AvatarFrame;
  profileStyle?: ProfileCardStyle;
  autoIdleMinutes: number;
  afkAutoReply: {
    enabled: boolean;
    message: string;
  };
}

export class LinkPresenceService {
  readonly #remote = new Map<number, RemotePresence>();
  readonly #compatiblePeers = new Map<number, number>();
  readonly #groupCompatiblePeers = new Map<number, number>();
  readonly #remoteVersions = new Map<number, string>();
  readonly #listeners = new Set<PresenceListener>();
  readonly #lastRequestAt = new Map<number, number>();
  readonly #lastForcedRequestAt = new Map<number, number>();
  readonly #lastResponseAt = new Map<number, number>();
  readonly #requestQueue: number[] = [];
  readonly #queuedRequests = new Set<number>();
  readonly #localTyping = new Map<number, { active: true; sentAt: number }>();
  readonly #remoteTypingUntil = new Map<number, number>();
  readonly #typingExpiryTimers = new Map<number, ReturnType<typeof setTimeout>>();
  readonly #unsubscribers: Array<() => void> = [];
  #nativeTimer: ReturnType<typeof setInterval> | undefined;
  #statusTimer: ReturnType<typeof setInterval> | undefined;
  #requestTimer: ReturnType<typeof setTimeout> | undefined;
  #lastInteractionAt = Date.now();
  #lastEffectiveStatus: PresenceStatus = "online";
  #lastRoomName = "";
  #lastCapabilityBroadcastAt = 0;
  #started = false;

  readonly #onInteraction = (): void => {
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
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
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
  ) {}

  start(): void {
    if (this.#started) return;
    this.#started = true;
    this.#lastEffectiveStatus = this.getOwnStatus();
    this.#unsubscribers.push(
      this.bus.on("bc:protocol", (event) => this.#receive(event.senderNumber, event.payload)),
      this.bus.on("bc:online-friends", () => this.#notify()),
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
    this.#compatiblePeers.clear();
    this.#groupCompatiblePeers.clear();
    this.#remoteVersions.clear();
    this.#localTyping.clear();
    this.#remoteTypingUntil.clear();
    for (const timer of this.#typingExpiryTimers.values()) clearTimeout(timer);
    this.#typingExpiryTimers.clear();
  }

  subscribe(listener: PresenceListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  getOwnStatus(): PresenceStatus {
    const config = this.settings.get().linkPresence;
    if (config.status !== "online" || config.autoIdleMinutes === 0) return config.status;
    return Date.now() - this.#lastInteractionAt >= config.autoIdleMinutes * 60_000
      ? "idle"
      : "online";
  }

  getOwnStatusMessage(): string {
    return this.settings.get().linkPresence.statusMessage;
  }

  getOwnAvatarUrl(): string {
    return this.settings.get().linkPresence.avatarUrl;
  }

  setOwnStatus(status: PresenceStatus): void {
    this.settings.update((draft) => {
      draft.linkPresence.status = status;
    });
    this.#lastInteractionAt = Date.now();
    this.#lastEffectiveStatus = this.getOwnStatus();
    this.#publishOwnPresence();
    this.#notify(this.#ownMemberNumber());
  }

  setEnabled(enabled: boolean): void {
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
    } else if (enabled) {
      this.#syncRoom(true);
    }
    this.#notify(clearedRemoteProfiles ? undefined : this.#ownMemberNumber());
  }

  setOwnProfile(profile: OwnProfilePreferences): void {
    const previousEnabled = this.settings.get().linkPresence.enabled;
    const next = this.settings.update((draft) => {
      draft.linkPresence.enabled = profile.enabled;
      draft.linkPresence.statusMessage = profile.statusMessage;
      draft.linkPresence.avatarUrl = profile.avatarUrl;
      if (profile.avatarFrame) draft.linkPresence.avatarFrame = profile.avatarFrame;
      if (profile.profileStyle) draft.linkPresence.profileStyle = profile.profileStyle;
      draft.linkPresence.autoIdleMinutes = profile.autoIdleMinutes;
      draft.linkPresence.afkAutoReply = profile.afkAutoReply;
    }).linkPresence;
    this.#lastEffectiveStatus = this.getOwnStatus();

    let clearedRemoteProfiles = false;
    if (previousEnabled && !next.enabled) {
      // Omitting optional profile fields makes peers replace, rather than retain, stale avatar data.
      this.#publishOwnPresence("offline", true, false);
      clearedRemoteProfiles = this.#clearRemoteProfiles();
    } else if (next.enabled) {
      if (previousEnabled) this.#publishOwnPresence();
      else this.#syncRoom(true);
    }
    this.#notify(clearedRemoteProfiles ? undefined : this.#ownMemberNumber());
  }

  setOwnStatusMessage(statusMessage: string): void {
    this.settings.update((draft) => {
      draft.linkPresence.statusMessage = statusMessage;
    });
    this.#publishOwnPresence();
    this.#notify(this.#ownMemberNumber());
  }

  setOwnAvatarUrl(avatarUrl: string): void {
    this.settings.update((draft) => {
      draft.linkPresence.avatarUrl = avatarUrl;
    });
    this.#publishOwnPresence();
    this.#notify(this.#ownMemberNumber());
  }

  get(memberNumber: number, now = Date.now()): PresenceSnapshot {
    if (memberNumber === this.#ownMemberNumber()) {
      const statusMessage = this.getOwnStatusMessage();
      return {
        memberNumber,
        status: this.getOwnStatus(),
        source: "kikilink",
        updatedAt: now,
        ...(statusMessage ? { statusMessage } : {}),
        ...(this.getOwnAvatarUrl() ? { avatarUrl: this.getOwnAvatarUrl() } : {}),
        avatarFrame: this.settings.get().linkPresence.avatarFrame,
        profileStyle: this.settings.get().linkPresence.profileStyle,
        addonVersion: this.version,
      };
    }

    const remote = this.#remote.get(memberNumber);
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

  request(memberNumber: number, force = false): boolean {
    if (
      !Number.isSafeInteger(memberNumber) ||
      memberNumber < 0 ||
      memberNumber === this.#ownMemberNumber()
    ) {
      return false;
    }
    const now = Date.now();
    const previousRequestAt = force
      ? this.#lastForcedRequestAt.get(memberNumber)
      : this.#lastRequestAt.get(memberNumber);
    const cooldownMs = force ? FORCED_REQUEST_COOLDOWN_MS : REQUEST_COOLDOWN_MS;
    if (previousRequestAt !== undefined && now - previousRequestAt < cooldownMs) {
      return false;
    }
    const packet: PresencePacket = { t: "pq", i: createId("p").slice(-18) };
    try {
      this.adapter.sendKikiLinkProtocol(memberNumber, JSON.stringify(packet));
      this.#lastRequestAt.set(memberNumber, now);
      if (force) this.#lastForcedRequestAt.set(memberNumber, now);
      return true;
    } catch {
      // A transient BC or cross-realm failure must not turn every UI render into another send.
      this.#lastRequestAt.set(memberNumber, now);
      if (force) this.#lastForcedRequestAt.set(memberNumber, now);
      return false;
    }
  }

  /**
   * Quietly discovers KikiLink presence for a visible player list without bursting BC's socket.
   * Repeated renders are cheap: queued members and the normal request cooldown are deduplicated.
   */
  requestMany(memberNumbers: Iterable<number>): number {
    const ownMemberNumber = this.#ownMemberNumber();
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
    return (this.#remoteTypingUntil.get(memberNumber) ?? 0) > now;
  }

  hasCompatiblePeer(memberNumber: number, now = Date.now()): boolean {
    if (memberNumber === this.#ownMemberNumber()) return true;
    const lastSeenAt = this.#compatiblePeers.get(memberNumber);
    return lastSeenAt !== undefined && now - lastSeenAt <= REMOTE_STATUS_TTL_MS;
  }

  /** Group packets are opt-in so older KikiLink versions are never offered as group members. */
  hasGroupChatPeer(memberNumber: number, now = Date.now()): boolean {
    if (memberNumber === this.#ownMemberNumber()) return true;
    const lastSeenAt = this.#groupCompatiblePeers.get(memberNumber);
    return lastSeenAt !== undefined && now - lastSeenAt <= REMOTE_STATUS_TTL_MS;
  }

  setTyping(memberNumber: number, active: boolean, force = false): boolean {
    if (
      !Number.isSafeInteger(memberNumber) ||
      memberNumber < 0 ||
      memberNumber === this.#ownMemberNumber()
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
    if (senderNumber === this.#ownMemberNumber()) return;
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
      if (receivedAt - (this.#lastResponseAt.get(senderNumber) ?? 0) < RESPONSE_COOLDOWN_MS) {
        return;
      }
      this.#lastResponseAt.set(senderNumber, receivedAt);
      if (this.settings.get().linkPresence.enabled) this.#sendPresence(senderNumber, packet.i);
      else this.#sendCapability(senderNumber);
      return;
    }
    if (packet.t === "pc") {
      this.#remoteVersions.set(senderNumber, packet.v);
      if (packet.g === 1) this.#groupCompatiblePeers.set(senderNumber, receivedAt);
      if (!wasCompatible) this.#notify(senderNumber);
      return;
    }
    if (packet.g === 1) this.#groupCompatiblePeers.set(senderNumber, receivedAt);
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
        if ((this.#remoteTypingUntil.get(senderNumber) ?? 0) > Date.now()) return;
        if (this.#remoteTypingUntil.delete(senderNumber)) this.#notify(senderNumber);
      }, TYPING_TTL_MS + 25),
    );
    this.#notify(senderNumber);
  }

  #clearRemoteProfiles(): boolean {
    if (this.#remote.size === 0) return false;
    this.#remote.clear();
    return true;
  }

  #sendPresence(target: number, requestId?: string): void {
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
      g: 1,
    };
    try {
      this.adapter.sendKikiLinkProtocol(target, serializePresencePacket(packet));
    } catch {
      // The player may have left the room or gone offline between request and response.
    }
  }

  #sendCapability(target?: number): void {
    const payload = JSON.stringify({ t: "pc", v: this.version, g: 1 } satisfies PresencePacket);
    try {
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
      g: 1,
    };
    try {
      this.adapter.broadcastKikiLinkProtocol(serializePresencePacket(packet));
    } catch {
      // A malformed or unexpectedly oversized local preference must never break profile controls.
    }
  }

  #syncRoom(force: boolean): void {
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
    const effective = this.getOwnStatus();
    if (effective === this.#lastEffectiveStatus) return;
    this.#lastEffectiveStatus = effective;
    this.#publishOwnPresence();
    this.#notify(this.#ownMemberNumber());
  }

  #prune(now = Date.now()): void {
    const changed = new Set<number>();
    for (const [memberNumber, remote] of this.#remote) {
      if (now - remote.receivedAt <= REMOTE_STATUS_TTL_MS) continue;
      this.#remote.delete(memberNumber);
      changed.add(memberNumber);
    }
    for (const [memberNumber, lastSeenAt] of this.#compatiblePeers) {
      if (now - lastSeenAt <= REMOTE_STATUS_TTL_MS) continue;
      this.#compatiblePeers.delete(memberNumber);
      this.#groupCompatiblePeers.delete(memberNumber);
      this.#remoteVersions.delete(memberNumber);
      changed.add(memberNumber);
    }
    for (const [memberNumber, requestedAt] of this.#lastRequestAt) {
      if (now - requestedAt > REMOTE_STATUS_TTL_MS) this.#lastRequestAt.delete(memberNumber);
    }
    for (const [memberNumber, requestedAt] of this.#lastForcedRequestAt) {
      if (now - requestedAt > REMOTE_STATUS_TTL_MS) this.#lastForcedRequestAt.delete(memberNumber);
    }
    for (const [memberNumber, respondedAt] of this.#lastResponseAt) {
      if (now - respondedAt > REMOTE_STATUS_TTL_MS) this.#lastResponseAt.delete(memberNumber);
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

  #ownMemberNumber(): number {
    try {
      const value = this.adapter.getOwnMemberNumber();
      return Number.isSafeInteger(value) ? value : -1;
    } catch {
      return -1;
    }
  }

  #refreshNativeFriends(): void {
    try {
      this.adapter.refreshOnlineFriends();
    } catch {
      // Native online-friend state is best effort during account and screen transitions.
    }
  }
}

function parsePresencePacket(payload: string): PresencePacket | null {
  let value: unknown;
  try {
    value = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || !("t" in value)) return null;
  if (value.t === "pq") {
    if (!("i" in value) || typeof value.i !== "string" || value.i.length < 1 || value.i.length > 32) {
      return null;
    }
    return { t: "pq", i: value.i, ...("b" in value && value.b === 1 ? { b: 1 } : {}) };
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
      ? { t: "pc", v: version, ...("g" in value && value.g === 1 ? { g: 1 } : {}) }
      : null;
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
  const normalizedAvatar =
    "a" in value && typeof value.a === "string" && value.a.length <= 500
      ? normalizeImageUrl(value.a)
      : null;
  const avatar = normalizedAvatar && normalizedAvatar.length <= 500 ? normalizedAvatar : "";
  const requestId = "i" in value && typeof value.i === "string" ? value.i.slice(0, 32) : "";
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
    ...("g" in value && value.g === 1 ? { g: 1 } : {}),
  };
}

const UNSAFE_PRESENCE_TEXT = /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu;

function sanitizePresenceText(value: string, maxLength: number): string {
  return value.replace(UNSAFE_PRESENCE_TEXT, " ").replace(/\s+/gu, " ").trim().slice(0, maxLength);
}

export function serializePresencePacket(packet: Extract<PresencePacket, { t: "ps" }>): string {
  const bounded: Extract<PresencePacket, { t: "ps" }> = { ...packet };
  let payload = JSON.stringify(bounded);
  // Required status/time/version always win. Long optional URLs and escaped status notes can make
  // otherwise valid preferences exceed the adapter's transport ceiling.
  for (const optional of ["a", "m", "f", "c", "i"] as const) {
    if (payload.length <= MAX_PROTOCOL_PAYLOAD) return payload;
    delete bounded[optional];
    payload = JSON.stringify(bounded);
  }
  return payload;
}

function isAvatarFrame(value: unknown): value is AvatarFrame {
  return value === "none" || value === "blossom" || value === "rose" || value === "starlight";
}

function isProfileCardStyle(value: unknown): value is ProfileCardStyle {
  return value === "classic" || value === "garden" || value === "midnight";
}

function isPresenceStatus(value: unknown): value is PresenceStatus {
  return value === "online" || value === "idle" || value === "dnd" || value === "offline";
}
