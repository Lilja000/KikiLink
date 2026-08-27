import type { BCAdapter } from "../bc/adapter";
import type { ChatRepository } from "../storage/chat-repository";
import type { EventBus } from "./event-bus";
import type { SettingsStore } from "./settings";
import type { KeyValueStorage } from "./settings";

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
  | "reactions"
  | "about";
export type BCConnectionState = "connecting" | "ready" | "error";
export type PresenceStatus = "online" | "idle" | "dnd" | "offline";
export type PresenceState = PresenceStatus | "unknown";
export type PresenceSource = "kikilink" | "room" | "friend-list" | "unknown";
export type ImagePreviewPreference = "ask" | "always" | "never";
export type ImageUploadRetention = "1h" | "12h" | "24h" | "72h";
export type ReactionTrigger =
  | "beep-received"
  | "room-join"
  | "room-leave"
  | "friend-online";
export type ReactionScope = "anyone" | "friends" | "members";
export type ReactionAction = "notice" | "room-emote";
export type NotificationSoundPreset = "chime" | "sparkle" | "pop";
export type NotificationSoundChoice = NotificationSoundPreset | `custom:${string}`;
export type LinkNotificationKind = "chat" | "friend-online" | "room-join";
export type MusicTrackSource = "url" | "catbox" | "local";
export type MusicRepeatMode = "off" | "all" | "one";

export interface RoomPresetData {
  name: string;
  description: string;
  background: string;
  limit: number;
  game: string;
  space: string;
  language: string;
  visibility: string[];
  access: string[];
  blockCategory: string[];
  admins: number[];
  whitelist: number[];
  blacklist: number[];
  custom: {
    imageUrl: string;
    imageFilter: string;
    musicUrl: string;
    sizeMode: number;
    musicSync: boolean;
  };
}

export interface RoomPreset {
  id: string;
  label: string;
  savedAt: number;
  room: RoomPresetData;
}

export interface MusicTrack {
  id: string;
  title: string;
  source: MusicTrackSource;
  /** A direct HTTPS URL for remote tracks, or the locally stored record id. */
  locator: string;
  addedAt: number;
}

export interface MusicPlaylist {
  id: string;
  name: string;
  tracks: MusicTrack[];
}

export interface OnlineFriend {
  memberNumber: number;
  memberName: string;
  roomName?: string;
  roomSpace?: string;
  privateRoom: boolean;
  /** Native BC relationship category when this is more specific than a normal friend. */
  relationship?: "sub" | "lover";
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
  avatarUrl?: string;
  roomName?: string;
}

export interface QuickAction {
  label: string;
  template: string;
}

export interface SavedGalleryImage {
  url: string;
  addedAt: number;
}

export interface RoomActivity {
  label: string;
  template: string;
  category: string;
  pack: string;
  favorite: boolean;
}

export type CustomActivityTargetMode = "other" | "self" | "both";

/** A user-created activity registered beside Bondage Club's native activities. */
export interface CustomActivityDefinition {
  id: string;
  name: string;
  targetGroup: string;
  targetMode: CustomActivityTargetMode;
  template: string;
  /** Name of a vanilla activity whose icon should be reused. */
  image: string;
  /** Base arousal amount handed to Bondage Club's preference-aware effect. Zero disables it. */
  arousal: number;
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

export type PlayerRelationship =
  | "owner"
  | "sub"
  | "lover"
  | "whitelist"
  | "blacklist"
  | "ghosted";

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
  relationships: PlayerRelationship[];
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
  schemaVersion: 23;
  ui: {
    accent: string;
    theme: ThemePreference;
    density: InterfaceDensity;
    textScale: TextScalePreference;
    homeLayout: HomeLayoutPreference;
    launcherSide: "left" | "right";
    launcherOpen: LauncherOpenPreference;
    launcherPosition: { x: number; y: number } | null;
    panelPosition: { x: number; y: number } | null;
    roomBadge: {
      enabled: boolean;
      /** Normalized offset inside the character's 500x1000 canvas frame. */
      position: { x: number; y: number } | null;
    };
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
      retention: ImageUploadRetention;
    };
    gallery: {
      saved: SavedGalleryImage[];
      hiddenUrls: string[];
    };
    quickActions: QuickAction[];
  };
  linkPresence: {
    enabled: boolean;
    status: PresenceStatus;
    statusMessage: string;
    avatarUrl: string;
    autoIdleMinutes: number;
    afkAutoReply: {
      enabled: boolean;
      message: string;
    };
  };
  linkActivities: {
    enabled: boolean;
    customActivities: CustomActivityDefinition[];
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
      volume: number;
      chat: NotificationSoundChoice;
      friendOnline: NotificationSoundChoice;
      roomJoin: NotificationSoundChoice;
    };
    enabled: boolean;
    rules: ReactionRule[];
  };
  linkRoom: {
    presets: RoomPreset[];
    /** Room names are matched case-insensitively when the live lobby list is refreshed. */
    favoriteRoomNames: string[];
  };
  linkMusic: {
    playlists: MusicPlaylist[];
    activePlaylistId: string;
    repeatMode: MusicRepeatMode;
    shuffle: boolean;
    volume: number;
  };
}

export interface KikiLinkContext {
  adapter: BCAdapter;
  bus: EventBus<KikiLinkEvents>;
  repository: ChatRepository;
  settings: SettingsStore;
  accountStorage?: KeyValueStorage;
  memberNumber?: number;
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
