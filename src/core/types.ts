import type { BCAdapter } from "../bc/adapter";
import type { ChatRepository } from "../storage/chat-repository";
import type { EventBus } from "./event-bus";
import type { SettingsStore } from "./settings";

export type MessageDirection = "incoming" | "outgoing";
export type ThemePreference = "dark" | "light" | "system";
export type BCConnectionState = "connecting" | "ready" | "error";

export interface QuickAction {
  label: string;
  template: string;
}

export interface RoomActivity {
  label: string;
  template: string;
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
  "link-chat:updated": { peerNumber: number };
  "settings:changed": KikiLinkSettings;
}

export interface KikiLinkSettings {
  schemaVersion: 3;
  ui: {
    accent: string;
    theme: ThemePreference;
    launcherSide: "left" | "right";
    launcherPosition: { x: number; y: number } | null;
    reducedMotion: boolean;
  };
  linkChat: {
    enabled: boolean;
    saveHistory: boolean;
    includeRoomByDefault: boolean;
    retentionDays: number;
    maxMessagesPerConversation: number;
    openOnIncoming: boolean;
    quickActions: QuickAction[];
  };
  linkActivities: {
    enabled: boolean;
    activities: RoomActivity[];
  };
  linkRoster: {
    enabled: boolean;
    trackEncounters: boolean;
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
