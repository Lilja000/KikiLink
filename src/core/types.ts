import type { BCAdapter } from "../bc/adapter";
import type { ChatRepository } from "../storage/chat-repository";
import type { EventBus } from "./event-bus";
import type { SettingsStore } from "./settings";

export type MessageDirection = "incoming" | "outgoing";
export type ThemePreference = "dark" | "light" | "system";
export type LauncherOpenPreference = "home" | "last" | "chat";
export type InterfaceDensity = "comfortable" | "compact" | "super-compact";
export type TextScalePreference = "normal" | "large" | "extra-large";
export type HomeLayoutPreference = "showcase" | "compact";
export type SettingsSection =
  | "appearance"
  | "navigation"
  | "chat"
  | "players"
  | "activities"
  | "reactions";
export type BCConnectionState = "connecting" | "ready" | "error";
export type PresenceStatus = "online" | "idle" | "dnd" | "offline";
export type PresenceState = PresenceStatus | "unknown";
export type PresenceSource = "kikilink" | "room" | "friend-list" | "unknown";
export type ImagePreviewPreference = "ask" | "always" | "never";
export type ReactionTrigger =
  | "beep-received"
  | "room-join"
  | "room-leave"
  | "friend-online";
export type ReactionScope = "anyone" | "friends" | "members";
export type ReactionAction = "notice" | "room-emote";
export type NotificationSoundPreset = "chime" | "sparkle" | "pop";
export type LinkNotificationKind = "chat" | "friend-online" | "room-join";

export interface OnlineFriend {
  memberNumber: number;
  memberName: string;
  roomName?: string;
  roomSpace?: string;
  privateRoom: boolean;
}

export interface KikiLinkProtocolEvent {
  senderNumber: number;
  payload: string;
  channel: "beep" | "room";
}

export interface PresenceSnapshot {
  memberNumber: number;
  status: PresenceState;
  source: PresenceSource;
  updatedAt: number;
  statusMessage?: string;
  roomName?: string;
}

export interface QuickAction {
  label: string;
  template: string;
}

export interface RoomActivity {
  label: string;
  template: string;
  category: string;
  pack: string;
  favorite: boolean;
}

export interface ReactionRule {
  id: string;
  label: string;
  enabled: boolean;
  trigger: ReactionTrigger;
  scope: ReactionScope;
  memberNumbers: number[];
  textMatch: string;
  action: ReactionAction;
  template: string;
  cooldownSeconds: number;
}

export interface LinkReactionEvent {
  trigger: ReactionTrigger;
  memberNumber: number;
  memberName: string;
  isFriend: boolean;
  occurredAt: number;
  content?: string;
  roomName?: string;
}

export interface LinkReactionFired {
  ruleId: string;
  ruleLabel: string;
  action: ReactionAction;
  message: string;
  event: LinkReactionEvent;
  firedAt: number;
}

export interface LinkNotification {
  kind: LinkNotificationKind;
  message: string;
  showToast: boolean;
  memberNumber: number;
  occurredAt: number;
}

export interface RoomCharacter {
  memberNumber: number;
  memberName: string;
  accountName?: string;
  isFriend?: boolean;
}

export interface PersonRecord {
  memberNumber: number;
  displayName: string;
  favorite: boolean;
  note: string;
  tags: string[];
  firstSeenAt: number;
  lastSeenAt: number;
  lastRoomName: string;
  encounterCount: number;
}

export interface RosterEntry extends PersonRecord {
  present: boolean;
  isFriend: boolean;
}

export interface BeepEvent {
  direction: MessageDirection;
  peerNumber: number;
  peerName: string;
  content: string;
  sentAt: number;
  includeRoom: boolean;
  roomName?: string;
}

export interface LinkMessage extends BeepEvent {
  id: string;
  read: boolean;
}

export interface ConversationMeta {
  peerNumber: number;
  peerName: string;
  localAlias?: string;
  hiddenAt?: number;
  lastMessage: string;
  lastMessageAt: number;
  lastDirection: MessageDirection;
  unread: number;
  pinned: boolean;
  draft: string;
}

export interface KikiLinkEvents {
  "bc:status": { state: BCConnectionState; message?: string };
  "bc:ready": { memberNumber: number };
  "beep:received": BeepEvent;
  "beep:sent": BeepEvent;
  "bc:online-friends": { friends: OnlineFriend[]; receivedAt: number };
  "bc:protocol": KikiLinkProtocolEvent;
  "link-chat:updated": { peerNumber: number };
  "link-reactions:notification": LinkNotification;
  "link-reactions:fired": LinkReactionFired;
  "settings:changed": KikiLinkSettings;
}

export interface KikiLinkSettings {
  schemaVersion: 12;
  ui: {
    accent: string;
    theme: ThemePreference;
    density: InterfaceDensity;
    textScale: TextScalePreference;
    homeLayout: HomeLayoutPreference;
    launcherSide: "left" | "right";
    launcherOpen: LauncherOpenPreference;
    launcherPosition: { x: number; y: number } | null;
    reducedMotion: boolean;
    settingsSection: SettingsSection;
  };
  linkChat: {
    enabled: boolean;
    saveHistory: boolean;
    includeRoomByDefault: boolean;
    retentionDays: number;
    maxMessagesPerConversation: number;
    openOnIncoming: boolean;
    enterToSend: boolean;
    typingIndicators: boolean;
    imagePreviews: ImagePreviewPreference;
    imageUploads: {
      enabled: boolean;
      cloudName: string;
      uploadPreset: string;
    };
    quickActions: QuickAction[];
  };
  linkPresence: {
    enabled: boolean;
    status: PresenceStatus;
    statusMessage: string;
    autoIdleMinutes: number;
  };
  linkActivities: {
    enabled: boolean;
    activities: RoomActivity[];
  };
  linkRoster: {
    enabled: boolean;
    trackEncounters: boolean;
    retentionDays: number;
  };
  linkReactions: {
    quickAlerts: {
      friendOnline: boolean;
      roomJoin: boolean;
    };
    sounds: {
      enabled: boolean;
      chat: NotificationSoundPreset;
      friendOnline: NotificationSoundPreset;
      roomJoin: NotificationSoundPreset;
    };
    enabled: boolean;
    rules: ReactionRule[];
  };
}

export interface KikiLinkContext {
  adapter: BCAdapter;
  bus: EventBus<KikiLinkEvents>;
  repository: ChatRepository;
  settings: SettingsStore;
  version: string;
}

export interface KikiLinkModule {
  readonly id: string;
  isEnabled(settings: KikiLinkSettings): boolean;
  start(context: KikiLinkContext): Promise<void> | void;
  stop(): Promise<void> | void;
}

export interface KikiLinkPublicApi {
  readonly name: "KikiLink";
  open(): void;
  openChat(memberNumber: number, memberName?: string): void;
  openRoster(): void;
  openActivities(): void;
  close(): void;
  getVersion(): string;
  destroy(): Promise<void>;
}
