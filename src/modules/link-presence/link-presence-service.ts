import type { BCAdapter } from "../../bc/adapter";
import type { EventBus } from "../../core/event-bus";
import type { SettingsStore } from "../../core/settings";
import type {
  KikiLinkEvents,
  PresenceSnapshot,
  PresenceStatus,
} from "../../core/types";
import { createId } from "../../utils/id";
import { normalizeImageUrl } from "../link-chat/media";

const NATIVE_REFRESH_MS = 30_000;
const STATUS_CHECK_MS = 15_000;
const REMOTE_STATUS_TTL_MS = 5 * 60_000;
const RECENT_PACKET_ONLINE_MS = 90_000;
const REQUEST_COOLDOWN_MS = 20_000;
const RESPONSE_COOLDOWN_MS = 5_000;
const TYPING_REFRESH_MS = 1_800;
const TYPING_TTL_MS = 5_500;

type PresenceListener = (memberNumber?: number) => void;

type PresencePacket =
  | { t: "pq"; i: string; b?: 1 }
  | { t: "ps"; i?: string; s: PresenceStatus; m?: string; a?: string; u: number; v: string }
  | { t: "ty"; a: 0 | 1 };

interface RemotePresence {
  status: PresenceStatus;
  statusMessage?: string;
  avatarUrl?: string;
  receivedAt: number;
  remoteUpdatedAt: number;
}

export interface OwnProfilePreferences {
  enabled: boolean;
  statusMessage: string;
  avatarUrl: string;
  autoIdleMinutes: number;
  afkAutoReply: {
    enabled: boolean;
    message: string;
  };
}

export class LinkPresenceService {
  readonly #remote = new Map<number, RemotePresence>();
  readonly #listeners = new Set<PresenceListener>();
  readonly #lastRequestAt = new Map<number, number>();
  readonly #lastResponseAt = new Map<number, number>();
  readonly #localTyping = new Map<number, { active: true; sentAt: number }>();
  readonly #remoteTypingUntil = new Map<number, number>();
  readonly #typingExpiryTimers = new Map<number, ReturnType<typeof setTimeout>>();
  readonly #unsubscribers: Array<() => void> = [];
  #nativeTimer: ReturnType<typeof setInterval> | undefined;
  #statusTimer: ReturnType<typeof setInterval> | undefined;
  #lastInteractionAt = Date.now();
  #lastEffectiveStatus: PresenceStatus = "online";
  #lastRoomName = "";
  #started = false;

  readonly #onInteraction = (): void => {
    const previous = this.getOwnStatus();
    this.#lastInteractionAt = Date.now();
    const next = this.getOwnStatus();
    if (previous !== next) {
      this.#lastEffectiveStatus = next;
      this.#publishOwnPresence();
      this.#notify(this.adapter.getOwnMemberNumber());
    }
  };

  readonly #onVisibilityChange = (): void => {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      this.#onInteraction();
      this.adapter.refreshOnlineFriends();
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
        this.adapter.refreshOnlineFriends();
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
        this.adapter.refreshOnlineFriends();
      }
      this.#syncRoom(false);
      this.#prune();
    }, NATIVE_REFRESH_MS);
    this.#statusTimer = setInterval(() => this.#checkOwnStatus(), STATUS_CHECK_MS);
    this.adapter.refreshOnlineFriends();
    this.#syncRoom(true);
  }

  stop(): void {
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
    this.#notify(this.adapter.getOwnMemberNumber());
  }

  setEnabled(enabled: boolean): void {
    const previous = this.settings.get().linkPresence.enabled;
    if (previous === enabled) return;
    this.settings.update((draft) => {
      draft.linkPresence.enabled = enabled;
    });
    this.#lastEffectiveStatus = this.getOwnStatus();
    if (previous && !enabled) this.#publishOwnPresence("offline", true, false);
    else if (enabled) this.#syncRoom(true);
    this.#notify(this.adapter.getOwnMemberNumber());
  }

  setOwnProfile(profile: OwnProfilePreferences): void {
    const previousEnabled = this.settings.get().linkPresence.enabled;
    const next = this.settings.update((draft) => {
      draft.linkPresence.enabled = profile.enabled;
      draft.linkPresence.statusMessage = profile.statusMessage;
      draft.linkPresence.avatarUrl = profile.avatarUrl;
      draft.linkPresence.autoIdleMinutes = profile.autoIdleMinutes;
      draft.linkPresence.afkAutoReply = profile.afkAutoReply;
    }).linkPresence;
    this.#lastEffectiveStatus = this.getOwnStatus();

    if (previousEnabled && !next.enabled) {
      // Omitting optional profile fields makes peers replace, rather than retain, stale avatar data.
      this.#publishOwnPresence("offline", true, false);
    } else if (next.enabled) {
      if (previousEnabled) this.#publishOwnPresence();
      else this.#syncRoom(true);
    }
    this.#notify(this.adapter.getOwnMemberNumber());
  }

  setOwnStatusMessage(statusMessage: string): void {
    this.settings.update((draft) => {
      draft.linkPresence.statusMessage = statusMessage;
    });
    this.#publishOwnPresence();
    this.#notify(this.adapter.getOwnMemberNumber());
  }

  setOwnAvatarUrl(avatarUrl: string): void {
    this.settings.update((draft) => {
      draft.linkPresence.avatarUrl = avatarUrl;
    });
    this.#publishOwnPresence();
    this.#notify(this.adapter.getOwnMemberNumber());
  }

  get(memberNumber: number, now = Date.now()): PresenceSnapshot {
    if (memberNumber === this.adapter.getOwnMemberNumber()) {
      const statusMessage = this.getOwnStatusMessage();
      return {
        memberNumber,
        status: this.getOwnStatus(),
        source: "kikilink",
        updatedAt: now,
        ...(statusMessage ? { statusMessage } : {}),
        ...(this.getOwnAvatarUrl() ? { avatarUrl: this.getOwnAvatarUrl() } : {}),
      };
    }

    const remote = this.#remote.get(memberNumber);
    const inRoom =
      typeof this.adapter.isMemberInCurrentRoom === "function" &&
      this.adapter.isMemberInCurrentRoom(memberNumber);
    const currentRoomName =
      inRoom && typeof this.adapter.getCurrentRoomName === "function"
        ? this.adapter.getCurrentRoomName()
        : undefined;
    const onlineFriend =
      typeof this.adapter.getOnlineFriends === "function"
        ? this.adapter.getOnlineFriends().find((friend) => friend.memberNumber === memberNumber)
        : undefined;
    const observableRoomName = onlineFriend?.roomName ?? currentRoomName;
    if (
      remote &&
      now - remote.receivedAt <= REMOTE_STATUS_TTL_MS &&
      (remote.status === "offline" || inRoom || onlineFriend || now - remote.receivedAt <= RECENT_PACKET_ONLINE_MS)
    ) {
      return {
        memberNumber,
        status: remote.status,
        source: "kikilink",
        updatedAt: remote.remoteUpdatedAt,
        ...(remote.statusMessage ? { statusMessage: remote.statusMessage } : {}),
        ...(remote.avatarUrl ? { avatarUrl: remote.avatarUrl } : {}),
        ...(observableRoomName ? { roomName: observableRoomName } : {}),
      };
    }
    if (inRoom) {
      return {
        memberNumber,
        status: "online",
        source: "room",
        updatedAt: now,
        ...(currentRoomName ? { roomName: currentRoomName } : {}),
      };
    }
    if (onlineFriend) {
      return {
        memberNumber,
        status: "online",
        source: "friend-list",
        updatedAt: now,
        ...(onlineFriend.roomName ? { roomName: onlineFriend.roomName } : {}),
      };
    }
    if (
      typeof this.adapter.hasOnlineFriendSnapshot === "function" &&
      typeof this.adapter.isKnownFriend === "function" &&
      this.adapter.hasOnlineFriendSnapshot() &&
      this.adapter.isKnownFriend(memberNumber)
    ) {
      return { memberNumber, status: "offline", source: "friend-list", updatedAt: now };
    }
    return { memberNumber, status: "unknown", source: "unknown", updatedAt: 0 };
  }

  request(memberNumber: number, force = false): boolean {
    if (!this.settings.get().linkPresence.enabled || memberNumber === this.adapter.getOwnMemberNumber()) {
      return false;
    }
    const now = Date.now();
    if (!force && now - (this.#lastRequestAt.get(memberNumber) ?? 0) < REQUEST_COOLDOWN_MS) {
      return false;
    }
    const packet: PresencePacket = { t: "pq", i: createId("p").slice(-18) };
    try {
      this.adapter.sendKikiLinkProtocol(memberNumber, JSON.stringify(packet));
      this.#lastRequestAt.set(memberNumber, now);
      return true;
    } catch {
      return false;
    }
  }

  isTyping(memberNumber: number, now = Date.now()): boolean {
    return (this.#remoteTypingUntil.get(memberNumber) ?? 0) > now;
  }

  hasCompatiblePeer(memberNumber: number, now = Date.now()): boolean {
    if (memberNumber === this.adapter.getOwnMemberNumber()) return true;
    const remote = this.#remote.get(memberNumber);
    return remote !== undefined && now - remote.receivedAt <= REMOTE_STATUS_TTL_MS;
  }

  setTyping(memberNumber: number, active: boolean, force = false): boolean {
    if (
      !Number.isSafeInteger(memberNumber) ||
      memberNumber < 0 ||
      memberNumber === this.adapter.getOwnMemberNumber()
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

  #receive(senderNumber: number, payload: string): void {
    if (senderNumber === this.adapter.getOwnMemberNumber()) return;
    const packet = parsePresencePacket(payload);
    if (!packet) return;
    if (packet.t === "ty") {
      if (!this.settings.get().linkChat.typingIndicators) return;
      this.#receiveTyping(senderNumber, packet.a === 1);
      return;
    }
    if (!this.settings.get().linkPresence.enabled) return;
    if (packet.t === "pq") {
      const now = Date.now();
      if (now - (this.#lastResponseAt.get(senderNumber) ?? 0) < RESPONSE_COOLDOWN_MS) return;
      this.#lastResponseAt.set(senderNumber, now);
      this.#sendPresence(senderNumber, packet.i);
      return;
    }

    const receivedAt = Date.now();
    this.#remote.set(senderNumber, {
      status: packet.s,
      ...(packet.m ? { statusMessage: packet.m } : {}),
      ...(packet.a ? { avatarUrl: packet.a } : {}),
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

  #sendPresence(target: number, requestId?: string): void {
    const config = this.settings.get().linkPresence;
    const packet: PresencePacket = {
      t: "ps",
      ...(requestId ? { i: requestId } : {}),
      s: this.getOwnStatus(),
      ...(config.statusMessage ? { m: config.statusMessage } : {}),
      ...(config.avatarUrl ? { a: config.avatarUrl } : {}),
      u: Date.now(),
      v: this.version,
    };
    try {
      this.adapter.sendKikiLinkProtocol(target, JSON.stringify(packet));
    } catch {
      // The player may have left the room or gone offline between request and response.
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
      u: Date.now(),
      v: this.version,
    };
    try {
      this.adapter.broadcastKikiLinkProtocol(JSON.stringify(packet));
    } catch {
      // A malformed or unexpectedly oversized local preference must never break profile controls.
    }
  }

  #syncRoom(force: boolean): void {
    const roomName = this.adapter.isInChatRoom() ? this.adapter.getCurrentRoomName() ?? "?" : "";
    if (!force && roomName === this.#lastRoomName) return;
    this.#lastRoomName = roomName;
    if (!roomName || !this.settings.get().linkPresence.enabled) return;
    const query: PresencePacket = { t: "pq", i: createId("room").slice(-18), b: 1 };
    this.adapter.broadcastKikiLinkProtocol(JSON.stringify(query));
    this.#publishOwnPresence();
  }

  #checkOwnStatus(): void {
    const effective = this.getOwnStatus();
    if (effective === this.#lastEffectiveStatus) return;
    this.#lastEffectiveStatus = effective;
    this.#publishOwnPresence();
    this.#notify(this.adapter.getOwnMemberNumber());
  }

  #prune(now = Date.now()): void {
    for (const [memberNumber, remote] of this.#remote) {
      if (now - remote.receivedAt <= REMOTE_STATUS_TTL_MS) continue;
      this.#remote.delete(memberNumber);
      this.#notify(memberNumber);
    }
  }

  #notify(memberNumber?: number): void {
    for (const listener of [...this.#listeners]) listener(memberNumber);
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
  if (
    value.t !== "ps" ||
    !("s" in value) ||
    !isPresenceStatus(value.s) ||
    !("u" in value) ||
    typeof value.u !== "number" ||
    !Number.isFinite(value.u) ||
    !("v" in value) ||
    typeof value.v !== "string" ||
    value.v.length > 24
  ) {
    return null;
  }
  const message = "m" in value && typeof value.m === "string" ? value.m.trim().slice(0, 80) : "";
  const normalizedAvatar =
    "a" in value && typeof value.a === "string" && value.a.length <= 500
      ? normalizeImageUrl(value.a)
      : null;
  const avatar = normalizedAvatar && normalizedAvatar.length <= 500 ? normalizedAvatar : "";
  const requestId = "i" in value && typeof value.i === "string" ? value.i.slice(0, 32) : "";
  return {
    t: "ps",
    ...(requestId ? { i: requestId } : {}),
    s: value.s,
    ...(message ? { m: message } : {}),
    ...(avatar ? { a: avatar } : {}),
    u: value.u,
    v: value.v,
  };
}

function isPresenceStatus(value: unknown): value is PresenceStatus {
  return value === "online" || value === "idle" || value === "dnd" || value === "offline";
}
