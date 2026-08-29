import type {
  BCAdapter,
  BCLobbyRoom,
  BCRoomSearchSpace,
  BCRoomAdminPlayer,
  BCRoomMemberAction,
} from "../../bc/adapter";
import type {
  AvatarFrame,
  BCConnectionState,
  ConversationMeta,
  KikiLinkSettings,
  LinkNotification,
  LinkReactionFired,
  LinkMessage,
  MusicPlaylist,
  MusicTrack,
  NotificationSoundChoice,
  NotificationSoundPreset,
  PlayerRelationship,
  PresenceSnapshot,
  PresenceStatus,
  ProfileCardStyle,
  QuickAction,
  ReactionRule,
  RoomPreset,
  RosterEntry,
  SettingsSection,
} from "../../core/types";
import { MemoryKeyValueStorage, type SettingsStore } from "../../core/settings";
import { EventBus } from "../../core/event-bus";
import { debounce, element } from "../../utils/dom";
import { LinkActivitiesService } from "../link-activities/link-activities-service";
import { CustomActivitiesView } from "../link-activities/custom-activities-view";
import {
  LinkRosterService,
  type RosterScope,
  type RosterSyncResult,
} from "../link-roster/link-roster-service";
import { PeopleRepository } from "../../storage/people-repository";
import {
  DeviceNotificationSoundStore,
  type DeviceNotificationSound,
  type NotificationSoundStore,
} from "../../storage/device-notification-sound-store";
import {
  DeviceMusicStore,
  type DeviceMusicTrack,
  type MusicStore,
} from "../../storage/device-music-store";
import {
  DeviceGalleryStore,
  type GalleryStore,
} from "../../storage/device-gallery-store";
import {
  conversationDisplayName,
  galleryMediaProvider,
  type ChatMediaItem,
  type ChatService,
} from "./chat-service";
import { LinkPresenceService } from "../link-presence/link-presence-service";
import {
  createDefaultReactionRule,
  MAX_REACTION_COOLDOWN_SECONDS,
  MAX_REACTION_MEMBERS,
  MAX_REACTION_RULES,
} from "../link-reactions/reaction-rules";
import {
  NOTIFICATION_SOUND_LABELS,
  NotificationSoundService,
} from "../link-reactions/notification-sounds";
import { LINK_CHAT_STYLES } from "./styles";
import { normalizeImageUrl, parseMessageLinks } from "./media";
import { RemoteImageLoader } from "./remote-image-loader";
import {
  LitterboxImageUploader,
  normalizeLitterboxUploadConfig,
  uploadPreparedImageToCatbox,
  uploadLocalRoomAudio,
  uploadMusicToCatbox,
  type LitterboxUploadConfig,
  type LocalImageUploader,
  type PreparedLocalImage,
} from "./image-upload";
import { kikiIcon, type KikiLinkIconName } from "./icons";
import { RoomBlossomBadge } from "./blossom";
import { KIKILINK_NEWS } from "./news";
import {
  GroupChatPanel,
  type GroupChatPanelFeedback,
} from "./group-chat-panel";
import type {
  GroupConversation,
  GroupChatService,
  GroupChatUpdate,
} from "./group-chat-service";
import KIKILINK_EMBLEM_DATA_URL from "../../../design/branding/kikilink-emblem.webp";

type WorkspaceView = "home" | "news" | "chat" | "gallery" | "roster" | "room" | "music" | "activities" | "settings";
type PrimaryWorkspaceView = Exclude<WorkspaceView, "settings">;
type RoomSubView = "current" | "lobbies" | "presets";
type GalleryFileStorage = "device" | "catbox" | "litterbox";
type KnownContact = ReturnType<BCAdapter["getKnownContacts"]>[number];
type FeatureTarget = WorkspaceView;
type HomeAction =
  | { kind: "new-chat" }
  | { kind: "chat"; peerNumber?: number; peerName?: string }
  | { kind: "group"; groupId: string }
  | { kind: "roster" }
  | { kind: "activities" }
  | { kind: "settings" };
type FinderResultKind = "destination" | "conversation" | "player" | "activity" | "setting";
type MessageGroupPosition = "single" | "start" | "middle" | "end";
type FinderAction =
  | { kind: "workspace"; target: FeatureTarget }
  | { kind: "new-chat" }
  | { kind: "presence" }
  | { kind: "conversation"; peerNumber: number; peerName: string }
  | { kind: "player"; memberNumber: number }
  | { kind: "activity"; index: number }
  | { kind: "setting"; section: SettingsSection };

interface FinderResult {
  id: string;
  kind: FinderResultKind;
  icon: KikiLinkIconName;
  category: string;
  title: string;
  detail: string;
  keywords: string;
  priority: number;
  action: FinderAction;
}

interface ProfileTarget {
  memberNumber: number;
  displayName: string;
}

interface GalleryItem {
  url: string;
  provider: ChatMediaItem["provider"] | "device";
  sortAt: number;
  saved: boolean;
  expiresAt?: number;
  localId?: string;
  chat?: ChatMediaItem;
}

interface QueuedRemoteImageLoad {
  target: HTMLElement;
  url: string;
  token: number;
}

interface SharedRoomMusic {
  url: string;
  expiresAt: number;
}

const KIKILINK_CREATOR_MEMBER_NUMBER = 0;
const MAX_AUTO_REMOTE_IMAGE_LOADS = 4;
const MAX_FALLBACK_AUTO_REMOTE_IMAGE_LOADS = 12;
const WORKSPACE_TITLES: Record<WorkspaceView, string> = {
  home: "Home",
  news: "News",
  chat: "Chat",
  gallery: "Media Gallery",
  roster: "Players",
  room: "Room Tools",
  music: "Music",
  activities: "Custom Activities",
  settings: "Settings",
};

export class LinkChatView {
  readonly #host = document.createElement("div");
  readonly #shadow = this.#host.attachShadow({ mode: "open" });
  readonly #launcher = element("button", {
    className: "kl-launcher",
    type: "button",
    title: "Open KikiLink",
    ariaLabel: "Open KikiLink",
  });
  readonly #badge = element("span", { className: "kl-badge" });
  readonly #connection = element("span", { className: "kl-connection" });
  readonly #connectionDot = element("span", { className: "kl-connection-dot" });
  readonly #connectionText = element("span", { className: "kl-connection-text" });
  readonly #panel = element("section", {
    className: "kl-panel",
    ariaLabel: "KikiLink Link Deck",
  });
  readonly #featureNav = element("nav", {
    className: "kl-feature-nav",
    ariaLabel: "KikiLink features",
  });
  readonly #workspace = element("div", { className: "kl-workspace" });
  readonly #home = element("section", { className: "kl-home" });
  readonly #newsPage = element("section", {
    className: "kl-feature-page kl-news-page",
    ariaLabel: "KikiLink news and changelog",
  });
  readonly #chatLayout = element("div", { className: "kl-layout" });
  readonly #contextTitle = element("div", { className: "kl-topbar-context", text: "Home" });
  readonly #newsTrigger = element("button", {
    className: "kl-text-button kl-news-trigger",
    type: "button",
    title: "KikiLink news and changelog",
    ariaLabel: "Open KikiLink news and changelog",
  });
  readonly #finderTrigger = element("button", {
    className: "kl-text-button kl-finder-trigger",
    type: "button",
    title: "Find anything in KikiLink (Ctrl+K)",
    ariaLabel: "Find chats, players, activities, and settings",
  });
  readonly #topbarSettingsButton = element("button", {
    className: "kl-icon-button kl-topbar-settings",
    type: "button",
    title: "KikiLink settings",
    ariaLabel: "Open KikiLink settings",
  });
  readonly #homeNavButton = element("button", {
    className: "kl-nav-item",
    type: "button",
    title: "Home",
    ariaLabel: "Open KikiLink home",
  });
  readonly #chatNavButton = element("button", {
    className: "kl-nav-item",
    type: "button",
    title: "LinkChat",
    ariaLabel: "Open LinkChat",
  });
  readonly #roomNavButton = element("button", {
    className: "kl-nav-item kl-room-button",
    type: "button",
    title: "Room tools",
    ariaLabel: "Open room tools",
  });
  readonly #musicNavButton = element("button", {
    className: "kl-nav-item kl-music-button",
    type: "button",
    title: "Music & playlists",
    ariaLabel: "Open music and playlists",
  });
  readonly #settingsNavButton = element("button", {
    className: "kl-nav-item",
    type: "button",
    title: "KikiLink settings",
    ariaLabel: "Open KikiLink settings",
  });
  readonly #homeGreeting = element("h1", { className: "kl-home-title" });
  readonly #homeActionIcon = element("span", { className: "kl-home-next-icon" });
  readonly #homeActionTitle = element("h2", { className: "kl-home-next-title" });
  readonly #homeActionDescription = element("p", { className: "kl-home-next-description" });
  readonly #homeActionMeta = element("span", { className: "kl-home-next-meta" });
  readonly #homeActionButton = element("button", {
    className: "kl-text-button kl-text-button--primary kl-home-next-button",
    type: "button",
  });
  readonly #homeConnection = element("span", { className: "kl-home-status-value" });
  readonly #homeRoom = element("span", { className: "kl-home-status-value" });
  readonly #homePresence = element("button", {
    className: "kl-home-status-value kl-home-presence",
    type: "button",
    title: "Change your KikiLink status",
  });
  readonly #homeChatMetric = element("span", { className: "kl-feature-card-metric" });
  readonly #homeRosterMetric = element("span", { className: "kl-feature-card-metric" });
  readonly #homeActivitiesMetric = element("span", { className: "kl-feature-card-metric" });
  readonly #homeGalleryMetric = element("span", { className: "kl-feature-card-metric" });
  readonly #homeSettingsMetric = element("span", { className: "kl-feature-card-metric" });
  readonly #homeRosterAction = element("span", { className: "kl-feature-card-action" });
  readonly #homeActivitiesAction = element("span", { className: "kl-feature-card-action" });
  readonly #homeRosterCard = element("button", {
    className: "kl-feature-card",
    type: "button",
    title: "Open LinkRoster",
  });
  readonly #homeActivitiesCard = element("button", {
    className: "kl-feature-card",
    type: "button",
    title: "Open Custom Activities",
  });
  readonly #homeGalleryCard = element("button", {
    className: "kl-feature-card",
    type: "button",
    title: "Open Media Gallery",
  });
  readonly #conversationList = element("div", { className: "kl-conversations" });
  readonly #galleryButton = element("button", {
    className: "kl-sidebar-new-chat kl-sidebar-gallery",
    type: "button",
    title: "Media gallery",
    ariaLabel: "Open media gallery",
  });
  readonly #search = element("input", { className: "kl-search" });
  readonly #empty = element("div", { className: "kl-empty" });
  readonly #chat = element("section", { className: "kl-chat" });
  readonly #chatAvatar = element("div", { className: "kl-avatar" });
  readonly #chatName = element("div", { className: "kl-chat-name" });
  readonly #chatNumber = element("div", { className: "kl-chat-number" });
  readonly #chatPresence = element("div", { className: "kl-chat-presence" });
  readonly #chatRoom = element("div", { className: "kl-chat-room" });
  readonly #pinButton = element("button", {
    className: "kl-icon-button",
    type: "button",
    title: "Pin conversation",
    ariaLabel: "Pin conversation",
  });
  readonly #profileButton = element("button", {
    className: "kl-icon-button kl-profile-more",
    type: "button",
    title: "Player actions",
    ariaLabel: "Open player actions",
  });
  readonly #messages = element("div", { className: "kl-messages" });
  readonly #typingIndicator = element("div", {
    className: "kl-typing-indicator",
    ariaLabel: "Typing status",
  });
  readonly #composer = element("textarea", { className: "kl-composer-input" });
  readonly #sendButton = element("button", {
    className: "kl-text-button kl-text-button--primary kl-send",
    type: "button",
    text: "Send",
  });
  readonly #attachImageButton = element("button", {
    className: "kl-icon-button kl-attach-image",
    type: "button",
    title: "Send an image",
    ariaLabel: "Send an image",
  });
  readonly #quickActions = element("div", { className: "kl-quick-actions" });
  readonly #includeRoom = element("input") as HTMLInputElement;
  readonly #counter = element("span", { className: "kl-counter" });
  readonly #galleryPage = element("section", {
    className: "kl-feature-page kl-gallery-page",
    ariaLabel: "Chat media gallery",
  });
  readonly #gallerySubtitle = element("p", { className: "kl-feature-page-subtitle" });
  readonly #galleryGrid = element("div", { className: "kl-gallery-grid" });
  readonly #roomPage = element("section", {
    className: "kl-feature-page kl-room-page",
    ariaLabel: "Room tools",
  });
  readonly #roomAdminStatus = element("div", { className: "kl-room-admin-status" });
  readonly #roomImageUrl = element("input", { className: "kl-search" }) as HTMLInputElement;
  readonly #roomMusicUrl = element("input", { className: "kl-search" }) as HTMLInputElement;
  readonly #roomSizeMode = element("select", { className: "kl-select" }) as HTMLSelectElement;
  readonly #roomMusicSync = element("input") as HTMLInputElement;
  readonly #roomSaveButton = element("button", {
    className: "kl-text-button kl-text-button--primary",
    type: "button",
    text: "Apply room media",
  });
  readonly #roomPlayers = element("div", { className: "kl-room-player-list" });
  readonly #roomImageFileInput = element("input") as HTMLInputElement;
  readonly #roomMusicFileInput = element("input") as HTMLInputElement;
  readonly #roomSubnav = element("div", { className: "kl-room-subnav" });
  readonly #roomCurrentPanel = element("div", { className: "kl-room-subpanel kl-room-current-panel" });
  readonly #roomLobbiesPanel = element("div", { className: "kl-room-subpanel kl-lobbies-panel" });
  readonly #roomPresetsPanel = element("div", { className: "kl-room-subpanel kl-room-presets-panel" });
  readonly #lobbyQuery = element("input", { className: "kl-search kl-lobby-search" }) as HTMLInputElement;
  readonly #lobbySpaceSelect = element("select", {
    className: "kl-select kl-lobby-space",
    ariaLabel: "Lobby space",
  }) as HTMLSelectElement;
  readonly #lobbyRefreshButton = element("button", {
    className: "kl-icon-button kl-lobby-refresh",
    type: "button",
    title: "Refresh room list",
    ariaLabel: "Refresh room list",
  });
  readonly #lobbyStatus = element("div", { className: "kl-room-directory-status" });
  readonly #lobbyList = element("div", { className: "kl-lobby-list" });
  readonly #presetName = element("input", { className: "kl-search kl-preset-name" }) as HTMLInputElement;
  readonly #saveRoomPresetButton = element("button", {
    className: "kl-text-button kl-text-button--primary",
    type: "button",
    text: "Save current room",
  });
  readonly #roomPresetList = element("div", { className: "kl-room-preset-list" });
  readonly #roomPlaylistSync = element("input") as HTMLInputElement;
  readonly #roomPlaylistSyncStatus = element("p", { className: "kl-setting-help kl-room-playlist-sync-status" });
  readonly #musicPage = element("section", {
    className: "kl-feature-page kl-music-page",
    ariaLabel: "Music and playlists",
  });
  readonly #playlistSelect = element("select", { className: "kl-select kl-playlist-select" }) as HTMLSelectElement;
  readonly #newPlaylistButton = element("button", {
    className: "kl-text-button",
    type: "button",
    text: "New playlist",
  });
  readonly #musicTitleInput = element("input", { className: "kl-search" }) as HTMLInputElement;
  readonly #musicUrlInput = element("input", { className: "kl-search" }) as HTMLInputElement;
  readonly #musicFileInput = element("input") as HTMLInputElement;
  readonly #musicFileMode = element("select", {
    className: "kl-select kl-music-file-mode",
  }) as HTMLSelectElement;
  readonly #musicAddButton = element("button", {
    className: "kl-text-button kl-text-button--primary",
    type: "button",
    text: "Add track",
  });
  readonly #musicAddStatus = element("div", { className: "kl-music-add-status" });
  readonly #musicQueue = element("div", { className: "kl-music-queue" });
  readonly #musicQueueSearch = element("input", {
    className: "kl-search kl-music-queue-search",
    ariaLabel: "Search current playlist",
  }) as HTMLInputElement;
  readonly #musicQueueSummary = element("span", { className: "kl-music-queue-summary" });
  readonly #musicArtwork = element("div", { className: "kl-music-artwork" });
  readonly #musicNowTitle = element("strong", { className: "kl-music-now-title", text: "Nothing playing" });
  readonly #musicNowSource = element("span", { className: "kl-music-now-source", text: "Choose a track" });
  readonly #musicProgress = element("input", { className: "kl-music-progress" }) as HTMLInputElement;
  readonly #musicTime = element("span", { className: "kl-music-time", text: "0:00 / 0:00" });
  readonly #musicPreviousButton = element("button", {
    className: "kl-icon-button",
    type: "button",
    title: "Previous track",
    ariaLabel: "Previous track",
  });
  readonly #musicPlayButton = element("button", {
    className: "kl-icon-button kl-music-play",
    type: "button",
    title: "Play",
    ariaLabel: "Play",
  });
  readonly #musicNextButton = element("button", {
    className: "kl-icon-button",
    type: "button",
    title: "Next track",
    ariaLabel: "Next track",
  });
  readonly #musicRepeatButton = element("button", {
    className: "kl-text-button kl-music-mode",
    type: "button",
  });
  readonly #musicShuffleButton = element("button", {
    className: "kl-text-button kl-music-mode",
    type: "button",
    text: "Shuffle",
  });
  readonly #musicVolume = element("input", { className: "kl-volume-input" }) as HTMLInputElement;
  readonly #musicMuteButton = element("button", {
    className: "kl-text-button kl-music-mode",
    type: "button",
    text: "Mute",
  });
  readonly #musicPlaybackRate = element("select", {
    className: "kl-select kl-music-rate",
    ariaLabel: "Playback speed",
  }) as HTMLSelectElement;
  readonly #musicSleepSelect = element("select", {
    className: "kl-select kl-music-sleep",
    ariaLabel: "Sleep timer",
  }) as HTMLSelectElement;
  readonly #musicSleepStatus = element("span", { className: "kl-music-sleep-status" });
  readonly #audio = document.createElement("audio");
  readonly #settingsPage = element("section", {
    className: "kl-settings-page",
    ariaLabel: "KikiLink settings",
  });
  readonly #settingsTabs = element("div", { className: "kl-settings-tabs" });
  readonly #settingsPanels = new Map<SettingsSection, HTMLElement>();
  readonly #historyToggle = element("input") as HTMLInputElement;
  readonly #enterToSendToggle = element("input") as HTMLInputElement;
  readonly #typingIndicatorsToggle = element("input") as HTMLInputElement;
  readonly #imagePreviewSelect = element("select", { className: "kl-select" }) as HTMLSelectElement;
  readonly #imageUploadsToggle = element("input") as HTMLInputElement;
  readonly #imageUploadRetentionSelect = element("select", {
    className: "kl-select",
  }) as HTMLSelectElement;
  readonly #imageUploadSettingsOptions = element("div", {
    className: "kl-image-upload-settings-options",
  });
  readonly #roomBadgeToggle = element("input") as HTMLInputElement;
  readonly #retentionInput = element("input", { className: "kl-number-input" }) as HTMLInputElement;
  readonly #saveSettingsButton = element("button", {
    className: "kl-text-button kl-text-button--primary",
    type: "button",
    text: "Save changes",
  });
  readonly #themeSelect = element("select", { className: "kl-select" }) as HTMLSelectElement;
  readonly #accentInput = element("input", { className: "kl-color-input" }) as HTMLInputElement;
  readonly #densitySelect = element("select", { className: "kl-select" }) as HTMLSelectElement;
  readonly #textScaleSelect = element("select", { className: "kl-select" }) as HTMLSelectElement;
  readonly #homeLayoutSelect = element("select", { className: "kl-select" }) as HTMLSelectElement;
  readonly #launcherSideSelect = element("select", {
    className: "kl-select",
  }) as HTMLSelectElement;
  readonly #launcherOpenSelect = element("select", {
    className: "kl-select",
  }) as HTMLSelectElement;
  readonly #reducedMotionToggle = element("input") as HTMLInputElement;
  readonly #quickActionsEditor = element("div", { className: "kl-action-editor" });
  readonly #rosterEnabledToggle = element("input") as HTMLInputElement;
  readonly #rosterTrackingToggle = element("input") as HTMLInputElement;
  readonly #rosterRetentionSelect = element("select", {
    className: "kl-select",
  }) as HTMLSelectElement;
  readonly #notebookFileInput = element("input") as HTMLInputElement;
  readonly #notebookCount = element("span", { className: "kl-data-tools-count" });
  readonly #rosterButton = element("button", {
    className: "kl-nav-item kl-roster-button",
    type: "button",
    title: "LinkRoster",
    ariaLabel: "Open LinkRoster",
  });
  readonly #rosterCount = element("span", { className: "kl-roster-count" });
  readonly #rosterPage = element("section", {
    className: "kl-feature-page kl-roster-page",
    ariaLabel: "LinkRoster players",
  });
  readonly #rosterSubtitle = element("p", { className: "kl-feature-page-subtitle" });
  readonly #rosterScopes = element("div", { className: "kl-roster-scopes" });
  readonly #rosterSearch = element("input", {
    className: "kl-search kl-roster-search",
  }) as HTMLInputElement;
  readonly #rosterList = element("div", { className: "kl-roster-list" });
  readonly #rosterDetail = element("section", { className: "kl-roster-detail" });
  readonly #rosterNote = element("textarea", {
    className: "kl-roster-note",
  }) as HTMLTextAreaElement;
  readonly #rosterTags = element("input", {
    className: "kl-roster-tags",
  }) as HTMLInputElement;
  readonly #saveNotebookButton = element("button", {
    className: "kl-text-button kl-text-button--primary kl-save-notebook",
    type: "button",
    text: "Save note",
  });
  readonly #activitiesToggle = element("input") as HTMLInputElement;
  readonly #friendOnlineAlertToggle = element("input") as HTMLInputElement;
  readonly #roomJoinAlertToggle = element("input") as HTMLInputElement;
  readonly #notificationSoundsToggle = element("input") as HTMLInputElement;
  readonly #soundVolumeInput = element("input", { className: "kl-volume-input" }) as HTMLInputElement;
  readonly #soundVolumeValue = element("output", { className: "kl-volume-value" });
  readonly #customSoundInput = element("input") as HTMLInputElement;
  readonly #customSoundList = element("div", { className: "kl-custom-sound-list" });
  readonly #chatSoundSelect = element("select", { className: "kl-select" }) as HTMLSelectElement;
  readonly #friendOnlineSoundSelect = element("select", {
    className: "kl-select",
  }) as HTMLSelectElement;
  readonly #roomJoinSoundSelect = element("select", {
    className: "kl-select",
  }) as HTMLSelectElement;
  readonly #reactionsToggle = element("input") as HTMLInputElement;
  readonly #reactionRulesEditor = element("div", { className: "kl-reaction-rules-editor" });
  readonly #reactionRuleCount = element("span", { className: "kl-data-tools-count" });
  readonly #activitiesButton = element("button", {
    className: "kl-nav-item kl-activities-button",
    type: "button",
    title: "Custom Activities",
    ariaLabel: "Open Custom Activities",
  });
  readonly #activitiesPage = element("section", {
    className: "kl-feature-page kl-activities-page",
    ariaLabel: "Custom Activities",
  });
  readonly #newChatDialog = element("dialog", { className: "kl-dialog kl-new-chat-dialog" });
  readonly #newChatQuery = element("input", { className: "kl-search kl-new-chat-query" }) as HTMLInputElement;
  readonly #newChatFilterSelect = element("select", {
    className: "kl-select kl-new-chat-filter",
    ariaLabel: "Filter known contacts",
  }) as HTMLSelectElement;
  readonly #newChatSortSelect = element("select", {
    className: "kl-select kl-new-chat-sort",
    ariaLabel: "Sort known contacts",
  }) as HTMLSelectElement;
  readonly #newChatResults = element("div", { className: "kl-contact-results" });
  readonly #finderDialog = element("dialog", { className: "kl-dialog kl-finder-dialog" });
  readonly #finderQuery = element("input", { className: "kl-finder-query" }) as HTMLInputElement;
  readonly #finderResults = element("div", { className: "kl-finder-results" });
  readonly #finderStatus = element("div", { className: "kl-sr-only" });
  readonly #presenceTrigger = element("button", {
    className: "kl-presence-trigger",
    type: "button",
    title: "Change KikiLink status",
    ariaLabel: "Change KikiLink status",
  });
  readonly #presenceTriggerDot = element("span", { className: "kl-presence-dot" });
  readonly #presenceTriggerAvatar = element("div", { className: "kl-avatar kl-presence-trigger-avatar" });
  readonly #presenceTriggerLabel = element("span", { className: "kl-presence-trigger-label" });
  readonly #presenceTriggerName = element("strong", { className: "kl-presence-trigger-name" });
  readonly #presenceTriggerStatus = element("span", { className: "kl-presence-trigger-status" });
  readonly #localClock = element("time", { className: "kl-local-clock" });
  readonly #presenceDialog = element("dialog", { className: "kl-dialog kl-presence-dialog" });
  readonly #presenceOptions = element("div", { className: "kl-presence-options" });
  readonly #presenceEnabledToggle = element("input") as HTMLInputElement;
  readonly #presenceMessage = element("input", { className: "kl-search kl-presence-message" }) as HTMLInputElement;
  readonly #autoIdleInput = element("input", { className: "kl-number-input" }) as HTMLInputElement;
  readonly #presenceAvatarUrl = element("input", {
    className: "kl-search kl-presence-avatar-url",
  }) as HTMLInputElement;
  readonly #presenceAvatarPreview = element("div", { className: "kl-avatar kl-profile-avatar-preview" });
  readonly #presenceAvatarFrame = element("select", {
    className: "kl-select kl-profile-frame-select",
    ariaLabel: "Avatar decoration",
  }) as HTMLSelectElement;
  readonly #presenceProfileStyle = element("select", {
    className: "kl-select kl-profile-style-select",
    ariaLabel: "Profile card style",
  }) as HTMLSelectElement;
  readonly #afkAutoReplyToggle = element("input") as HTMLInputElement;
  readonly #afkAutoReplyMessage = element("textarea", {
    className: "kl-custom-activity-template kl-afk-reply-message",
  }) as HTMLTextAreaElement;
  readonly #afkAutoReplyOptions = element("div", { className: "kl-afk-reply-options" });
  readonly #imageDialog = element("dialog", { className: "kl-dialog kl-image-dialog" });
  readonly #imageDialogTitle = element("div", { className: "kl-dialog-title" });
  readonly #imageDialogSubtitle = element("div", { className: "kl-dialog-subtitle" });
  readonly #imageUrlInput = element("input", { className: "kl-search kl-image-url" }) as HTMLInputElement;
  readonly #imagePreview = element("div", { className: "kl-image-compose-preview" });
  readonly #imageLinkTab = element("button", {
    className: "kl-image-source-tab",
    type: "button",
    text: "Image link",
  });
  readonly #imageFileTab = element("button", {
    className: "kl-image-source-tab",
    type: "button",
    text: "Local file",
  });
  readonly #imageLinkPanel = element("div", { className: "kl-image-source-panel" });
  readonly #imageFilePanel = element("div", { className: "kl-image-source-panel" });
  readonly #imageFileInput = element("input") as HTMLInputElement;
  readonly #chooseImageFileButton = element("button", {
    className: "kl-text-button kl-image-file-choose",
    type: "button",
    text: "Choose image",
  });
  readonly #localImageStatus = element("div", {
    className: "kl-image-compose-preview kl-local-image-status",
  });
  readonly #galleryStorageOptions = element("fieldset", {
    className: "kl-gallery-storage-options",
  });
  readonly #galleryRetentionSelect = element("select", {
    className: "kl-select kl-gallery-retention",
    ariaLabel: "Litterbox image lifetime",
  }) as HTMLSelectElement;
  readonly #galleryRetentionField = element("label", {
    className: "kl-gallery-retention-field",
  });
  readonly #imageFilePrivacyIcon = element("span", {
    className: "kl-image-file-privacy-icon",
  });
  readonly #imageFilePrivacyText = element("span");
  readonly #sendImageButton = element("button", {
    className: "kl-text-button kl-text-button--primary",
    type: "button",
    text: "Send image",
  });
  readonly #profileMenu = element("div", { className: "kl-profile-menu" });
  readonly #addonProfileDialog = element("dialog", {
    className: "kl-dialog kl-addon-profile-dialog",
  });
  readonly #addonProfileBody = element("div", { className: "kl-addon-profile-body" });
  readonly #aliasDialog = element("dialog", { className: "kl-dialog kl-alias-dialog" });
  readonly #aliasInput = element("input", { className: "kl-search kl-alias-input" }) as HTMLInputElement;
  readonly #saveAliasButton = element("button", {
    className: "kl-text-button kl-text-button--primary",
    type: "button",
    text: "Save nickname",
  });
  readonly #clearAliasButton = element("button", {
    className: "kl-text-button",
    type: "button",
    text: "Use native nickname",
  });
  readonly #removeChatDialog = element("dialog", { className: "kl-dialog kl-remove-chat-dialog" });
  readonly #removeChatName = element("strong", { className: "kl-remove-chat-name" });
  readonly #removeChatButton = element("button", {
    className: "kl-text-button kl-text-button--danger",
    type: "button",
    text: "Remove chat",
  });
  readonly #backButton = element("button", {
    className: "kl-icon-button kl-back",
    type: "button",
    title: "Back to conversations",
    ariaLabel: "Back to conversations",
  });
  #activePeer: number | undefined;
  #activeName = "";
  #activeNativeName = "";
  #selectedActivityIndex = 0;
  #customActivitiesView: CustomActivitiesView | undefined;
  #selectedRosterMember: number | undefined;
  #rosterScope: RosterScope = "current";
  #workspaceView: WorkspaceView = "home";
  #roomSubView: RoomSubView = "current";
  #lobbyRooms: BCLobbyRoom[] = [];
  #lastWorkspaceView: PrimaryWorkspaceView = "home";
  #settingsReturnView: PrimaryWorkspaceView = "home";
  #settingsSection: SettingsSection = "appearance";
  #presentCount = 0;
  #unreadCount = 0;
  #notebookDirty = false;
  #mounted = false;
  #connectionState: BCConnectionState = "connecting";
  #homeAction: HomeAction = { kind: "new-chat" };
  #finderCatalog: FinderResult[] = [];
  #visibleFinderResults: FinderResult[] = [];
  #finderSelectedIndex = 0;
  #finderRenderToken = 0;
  #galleryRenderToken = 0;
  #lobbyRenderToken = 0;
  #lobbyJoinBusy = false;
  #musicRenderToken = 0;
  #toastTimer: ReturnType<typeof setTimeout> | undefined;
  #clockTimer: ReturnType<typeof setTimeout> | undefined;
  #roomRefreshTimer: ReturnType<typeof setTimeout> | undefined;
  #launcherDrag:
    | {
        pointerId: number;
        startX: number;
        startY: number;
        startLeft: number;
        startTop: number;
        moved: boolean;
      }
    | undefined;
  #panelDrag:
    | {
        pointerId: number;
        startX: number;
        startY: number;
        startLeft: number;
        startTop: number;
        moved: boolean;
      }
    | undefined;
  #suppressLauncherClickUntil = 0;
  #presenceUnsubscribe: (() => void) | undefined;
  #groupChatService: GroupChatService | undefined;
  #groupChatPanel: GroupChatPanel | undefined;
  #groupChatUnsubscribe: (() => void) | undefined;
  #presenceRenderFrame: number | undefined;
  #pendingPresenceAll = false;
  readonly #pendingPresenceMembers = new Set<number>();
  #typingStopTimer: ReturnType<typeof setTimeout> | undefined;
  #messageRenderLimit = 120;
  #messageRenderPeer: number | undefined;
  #loadingOlderMessages = false;
  readonly #renderedMessageIds = new Set<string>();
  readonly #remoteImageRenderTokens = new WeakMap<HTMLElement, number>();
  readonly #remoteImageTargets = new Set<HTMLElement>();
  readonly #remoteImageAbortControllers = new Map<HTMLElement, AbortController>();
  readonly #remoteImageVisibilityTasks = new Map<HTMLElement, QueuedRemoteImageLoad>();
  readonly #remoteImageFallbackTargets = new Set<HTMLElement>();
  readonly #remoteImageAutoLoadQueue: QueuedRemoteImageLoad[] = [];
  #remoteImageVisibilityObserver: IntersectionObserver | undefined;
  #remoteImageAutoLoadsActive = 0;
  #remoteImageAutoDrainScheduled = false;
  readonly #remoteImageRemovalObserver = new MutationObserver(() =>
    this.#cancelDetachedRemoteImageLoads(),
  );
  readonly #suppressProfileClickUntil = new WeakMap<HTMLElement, number>();
  readonly #profileMenuLongPressTimers = new Set<ReturnType<typeof setTimeout>>();
  readonly #revealedAvatarUrls = new Set<string>();
  #profileMenuToken = 0;
  #addonProfileToken = 0;
  #addonProfileOpenToken = 0;
  #addonProfilePresenceSignature = "";
  #addonProfileTarget: ProfileTarget | undefined;
  #addonProfileReturnFocus: HTMLElement | undefined;
  #aliasTarget: { memberNumber: number; nativeName: string } | undefined;
  #removeChatTarget: { memberNumber: number; displayName: string } | undefined;
  #imageSourceMode: "link" | "file" = "link";
  #imageDestination: "chat" | "gallery" = "chat";
  #galleryFileStorage: GalleryFileStorage = "device";
  #preparedLocalImage: PreparedLocalImage | undefined;
  #localImageObjectUrl: string | undefined;
  #imageUploadBusy = false;
  #imageUploadToken = 0;
  #imagePrepareToken = 0;
  #localImageError: string | undefined;
  readonly #galleryObjectUrls = new Set<string>();
  #deviceGalleryCount = 0;
  #activeTrackId: string | undefined;
  #musicObjectUrl: string | undefined;
  #localMusicTrackIds: Set<string> | undefined;
  #localMusicTrackIdsPromise: Promise<Set<string>> | undefined;
  #musicSleepTimer: ReturnType<typeof setTimeout> | undefined;
  #musicStopAfterTrack = false;
  #roomPlaylistSyncEnabled = false;
  #lastRoomSyncedTrackUrl = "";
  readonly #sharedRoomMusic = new Map<string, SharedRoomMusic>();
  readonly #pendingRoomMusicUploads = new Map<string, Promise<string>>();

  readonly #handleOutsidePointerDown = (event: PointerEvent): void => {
    if (this.#profileMenu.hidden) return;
    if (event.composedPath().includes(this.#host)) return;
    this.#closeProfileMenu();
  };

  readonly #handleViewportResize = (): void => {
    this.#positionLauncher();
    this.#positionPanel();
    this.#updateSettingsTabOrientation();
    this.#closeProfileMenu();
  };

  readonly #saveDraft = debounce((peerNumber: number, peerName: string, value: string) => {
    void this.service.setDraft(peerNumber, peerName, value);
  }, 250);

  constructor(
    private readonly adapter: BCAdapter,
    private readonly service: ChatService,
    private readonly settings: SettingsStore,
    private readonly version: string,
    private readonly activities = new LinkActivitiesService(adapter, settings),
    private readonly roster = new LinkRosterService(
      adapter,
      new PeopleRepository(new MemoryKeyValueStorage()),
      settings,
    ),
    presence?: LinkPresenceService,
    private readonly imageUploader: LocalImageUploader<LitterboxUploadConfig> = new LitterboxImageUploader(),
    private readonly soundStore: NotificationSoundStore = new DeviceNotificationSoundStore(
      adapter.getOwnMemberNumber(),
    ),
    private readonly musicStore: MusicStore = new DeviceMusicStore(
      adapter.getOwnMemberNumber(),
    ),
    private readonly galleryStore: GalleryStore = new DeviceGalleryStore(
      adapter.getOwnMemberNumber(),
    ),
    private readonly catboxImageUpload: (
      image: PreparedLocalImage,
    ) => Promise<string> = uploadPreparedImageToCatbox,
    private readonly remoteImageLoader: Pick<RemoteImageLoader, "load" | "destroy"> = new RemoteImageLoader(),
  ) {
    this.presence =
      presence ??
      new LinkPresenceService(adapter, settings, new EventBus(), version);
    this.#roomBadge = new RoomBlossomBadge(adapter, settings, this.presence);
    this.#notificationSounds = new NotificationSoundService(async (id) =>
      (await this.soundStore.get(id))?.blob,
    );
  }

  private readonly presence: LinkPresenceService;
  readonly #roomBadge: RoomBlossomBadge;
  readonly #notificationSounds: NotificationSoundService;

  attachGroupChatService(service: GroupChatService): void {
    if (this.#mounted) throw new Error("Attach group chats before mounting KikiLink");
    this.#groupChatUnsubscribe?.();
    this.#groupChatPanel?.destroy();
    this.#groupChatService = service;
    const panel = new GroupChatPanel(this.adapter, service, this.presence, {
      onActivate: () => {
        this.#stopLocalTyping();
        this.#empty.hidden = true;
        this.#chat.hidden = true;
        panel.chatPane.hidden = false;
        this.#panel.dataset.mobileView = "chat";
        void this.#updateUnreadBadge();
      },
      onClose: () => {
        this.#chat.hidden = this.#activePeer === undefined;
        this.#empty.hidden = this.#activePeer !== undefined;
        this.#panel.dataset.mobileView = "list";
        void this.#updateUnreadBadge();
      },
      onFeedback: (feedback) => this.#onGroupFeedback(feedback),
      confirmRemove: (group) =>
        typeof window !== "undefined" &&
        window.confirm(`Remove “${group.title}” from this account's KikiLink groups?`),
    });
    this.#groupChatPanel = panel;
    this.#groupChatUnsubscribe = service.subscribe((update) => this.#onGroupChatUpdate(update));
  }

  flushGroupStateForPageHide(): void {
    const service = this.#groupChatService;
    if (!service) return;
    const draft = this.#groupChatPanel?.flushPendingDraft() ?? Promise.resolve();
    void draft.then(
      () => service.flushNow(),
      () => service.flushNow(),
    );
  }

  getActiveGroupId(): string | undefined {
    const panel = this.#groupChatPanel;
    if (
      !this.#mounted ||
      this.#panel.hidden ||
      this.#workspaceView !== "chat" ||
      this.#chatLayout.hidden ||
      !panel ||
      panel.chatPane.hidden
    ) {
      return undefined;
    }
    return panel.activeGroupId;
  }

  mount(): void {
    if (this.#mounted) return;
    this.#mounted = true;
    this.#host.id = "kikilink-root";

    const style = document.createElement("style");
    style.textContent = LINK_CHAT_STYLES;
    this.#applyTheme(this.settings.get());
    this.#buildLauncher();
    this.#buildPanel();
    this.#buildNewChatDialog();
    this.#buildFinderDialog();
    this.#buildPresenceDialog();
    this.#buildAddonProfileDialog();
    this.#buildImageDialog();
    this.#buildAliasDialog();
    this.#buildRemoveChatDialog();
    this.#profileMenu.hidden = true;
    this.#profileMenu.setAttribute("role", "menu");
    this.#profileMenu.setAttribute("aria-label", "Player actions");
    this.#shadow.append(
      style,
      this.#launcher,
      this.#panel,
      this.#newChatDialog,
      this.#finderDialog,
      this.#presenceDialog,
      this.#addonProfileDialog,
      this.#imageDialog,
      this.#aliasDialog,
      this.#removeChatDialog,
      this.#profileMenu,
    );
    if (this.#groupChatPanel) this.#shadow.append(this.#groupChatPanel.newGroupDialog);
    document.body.append(this.#host);
    this.#remoteImageRemovalObserver.observe(this.#shadow, {
      childList: true,
      subtree: true,
    });
    this.#startRemoteImageVisibilityObserver();
    this.#roomBadge.mount();
    this.#positionLauncher();
    this.#positionPanel();
    window.addEventListener("resize", this.#handleViewportResize);
    document.addEventListener("pointerdown", this.#handleOutsidePointerDown);
    this.#presenceUnsubscribe = this.presence.subscribe((memberNumber) =>
      this.#schedulePresenceRender(memberNumber),
    );

    void this.refresh();
  }

  destroy(): void {
    this.#mounted = false;
    this.#invalidateGalleryRender();
    this.#addonProfileOpenToken += 1;
    this.#cancelProfileMenuLongPresses();
    this.#saveDraft.cancel();
    this.#imageUploadToken += 1;
    this.#imageUploadBusy = false;
    this.#stopLocalTyping();
    if (this.#toastTimer !== undefined) clearTimeout(this.#toastTimer);
    if (this.#clockTimer !== undefined) clearTimeout(this.#clockTimer);
    this.#clockTimer = undefined;
    if (this.#roomRefreshTimer !== undefined) clearTimeout(this.#roomRefreshTimer);
    this.#roomRefreshTimer = undefined;
    if (this.#presenceRenderFrame !== undefined) cancelAnimationFrame(this.#presenceRenderFrame);
    this.#presenceRenderFrame = undefined;
    this.#finderDialog.close();
    this.#newChatDialog.close();
    this.#presenceDialog.close();
    this.#addonProfileDialog.close();
    this.#addonProfileTarget = undefined;
    this.#addonProfilePresenceSignature = "";
    this.#revealedAvatarUrls.clear();
    this.#remoteImageRemovalObserver.disconnect();
    this.#remoteImageVisibilityObserver?.disconnect();
    this.#remoteImageVisibilityObserver = undefined;
    this.#cancelAllRemoteImageLoads();
    this.#imageDialog.close();
    this.#resetLocalImage();
    this.#aliasDialog.close();
    this.#removeChatDialog.close();
    this.#closeProfileMenu();
    window.removeEventListener("resize", this.#handleViewportResize);
    document.removeEventListener("pointerdown", this.#handleOutsidePointerDown);
    this.#presenceUnsubscribe?.();
    this.#presenceUnsubscribe = undefined;
    this.#groupChatUnsubscribe?.();
    this.#groupChatUnsubscribe = undefined;
    this.#groupChatPanel?.destroy();
    this.#groupChatPanel = undefined;
    this.#groupChatService = undefined;
    this.#audio.pause();
    this.#audio.removeAttribute("src");
    this.#clearMusicSleepTimer();
    this.#clearMediaSession();
    this.#releaseMusicObjectUrl();
    this.#sharedRoomMusic.clear();
    this.#pendingRoomMusicUploads.clear();
    this.#releaseGalleryObjectUrls();
    this.#roomBadge.destroy();
    this.#host.remove();
    void this.#notificationSounds.destroy();
    this.soundStore.close();
    this.musicStore.close();
    this.galleryStore.close();
    this.remoteImageLoader.destroy();
  }

  isActiveConversation(peerNumber: number): boolean {
    return (
      !this.#panel.hidden &&
      this.#workspaceView === "chat" &&
      !this.#chatLayout.hidden &&
      !this.#chat.hidden &&
      this.getActiveGroupId() === undefined &&
      this.#activePeer === peerNumber
    );
  }

  setConnectionState(state: BCConnectionState, message?: string): void {
    this.#connectionState = state;
    this.#connection.dataset.state = state;
    this.#connectionText.textContent =
      state === "ready" ? "Connected" : state === "error" ? "Connection error" : "Connecting";
    this.#connection.title = message ?? this.#connectionText.textContent ?? "";
    this.#homeConnection.textContent = this.#connectionText.textContent;
    this.#homeConnection.dataset.state = state;
    const canSend = this.adapter.canSendBeep();
    this.#sendButton.disabled = !canSend;
    this.#attachImageButton.disabled = !canSend || this.#activePeer === undefined;
    this.#composer.placeholder = canSend ? "Write a Beep…" : "Connecting to Bondage Club…";
    if (this.#newChatDialog.open) this.#renderKnownContacts();
    if (this.#workspaceView === "activities") this.#renderActivitiesPage();
    if (this.#workspaceView === "roster") this.#renderRoster();
    if (this.#workspaceView === "room") void this.#renderRoomTools(true);
    if (this.#workspaceView === "music") void this.#renderMusicPage();
  }

  async onMessage(
    peerNumber: number,
    incoming: boolean,
    message?: LinkMessage,
  ): Promise<void> {
    if (
      incoming &&
      this.presence.getOwnStatus() !== "dnd" &&
      this.settings.get().linkChat.openOnIncoming
    ) {
      await this.openChat(peerNumber, this.adapter.getMemberName(peerNumber));
      return;
    }

    if (this.#activePeer === peerNumber) {
      if (message && this.#messageRenderPeer === peerNumber) this.#appendMessage(message);
      else await this.#renderMessages(peerNumber);
    }
    await this.refresh();
  }

  onReaction(reaction: LinkReactionFired): void {
    if (this.presence.getOwnStatus() === "dnd") return;
    this.#toast(
      reaction.action === "room-emote"
        ? `Reaction “${reaction.ruleLabel}” sent: ${reaction.message}`
        : reaction.message,
    );
  }

  onNotification(notification: LinkNotification): void {
    if (this.presence.getOwnStatus() === "dnd") return;
    if (notification.showToast) this.#toast(notification.message);
    const sounds = this.settings.get().linkReactions.sounds;
    if (!sounds.enabled) return;
    const preset =
      notification.kind === "chat"
        ? sounds.chat
        : notification.kind === "friend-online"
          ? sounds.friendOnline
          : sounds.roomJoin;
    void this.#notificationSounds.play(preset, { volume: sounds.volume });
  }

  #onGroupFeedback(feedback: GroupChatPanelFeedback): void {
    if (!this.#mounted) return;
    if (feedback.tone === "error") this.#toast(feedback.message, "error");
    else if (feedback.tone === "warning") this.#toast(feedback.message);
  }

  #onGroupChatUpdate(update: GroupChatUpdate): void {
    if (!this.#mounted) return;
    void this.#updateUnreadBadge();
    if (this.#workspaceView === "home") void this.#renderHome();
    if (this.presence.getOwnStatus() === "dnd") return;

    if (update.kind === "group-added" && update.incoming) {
      this.#toast(`${update.group.title} was added to your group chats.`);
      return;
    }
    if (
      update.kind !== "message" ||
      !update.incoming ||
      this.getActiveGroupId() === update.groupId
    ) {
      return;
    }
    const group = this.#groupChatService?.getGroup(update.groupId);
    const title = group?.title ?? "Group chat";
    this.#toast(`${title} · ${update.message.senderName}: ${messagePreview(update.message.content)}`);
    const sounds = this.settings.get().linkReactions.sounds;
    if (sounds.enabled) {
      void this.#notificationSounds.play(sounds.chat, { volume: sounds.volume });
    }
  }

  async open(): Promise<void> {
    const settings = this.settings.get();
    const preference = settings.ui.launcherOpen;
    const requested =
      preference === "chat" ? "chat" : preference === "last" ? this.#lastWorkspaceView : "home";
    await this.#openPanel(this.#availableWorkspace(requested, settings));
  }

  async #openPanel(view: WorkspaceView): Promise<void> {
    this.#panel.hidden = false;
    this.#positionPanel();
    this.#launcher.setAttribute("aria-expanded", "true");
    this.#showWorkspace(view);
    await this.refresh();
  }

  close(): void {
    this.#addonProfileOpenToken += 1;
    this.#cancelProfileMenuLongPresses();
    this.#stopLocalTyping();
    if (this.#finderDialog.open) this.#finderDialog.close();
    if (this.#newChatDialog.open) this.#newChatDialog.close();
    if (this.#presenceDialog.open) this.#presenceDialog.close();
    if (this.#addonProfileDialog.open) this.#addonProfileDialog.close();
    if (this.#imageDialog.open) this.#imageDialog.close();
    if (this.#aliasDialog.open) this.#aliasDialog.close();
    if (this.#removeChatDialog.open) this.#removeChatDialog.close();
    if (this.#groupChatPanel?.newGroupDialog.open) this.#groupChatPanel.newGroupDialog.close();
    this.#closeProfileMenu();
    this.#invalidateGalleryRender();
    this.#cancelAllRemoteImageLoads();
    this.#panel.hidden = true;
    this.#launcher.setAttribute("aria-expanded", "false");
  }

  #availableWorkspace(
    view: PrimaryWorkspaceView,
    settings = this.settings.get(),
  ): PrimaryWorkspaceView {
    if (view === "roster" && !settings.linkRoster.enabled) return "home";
    if (view === "activities" && !settings.linkActivities.enabled) return "home";
    return view;
  }

  async openChat(memberNumber: number, memberName?: string): Promise<void> {
    const existing = await this.service.getConversation(memberNumber);
    const name =
      this.adapter.getMemberNickname(memberNumber) ||
      existing?.peerName ||
      memberName?.trim() ||
      this.adapter.getMemberName(memberNumber);
    await this.service.ensureConversation(memberNumber, name);
    await this.#openPanel("chat");
    await this.#selectConversation(memberNumber, name);
  }

  openActivities(): void {
    void this.#openPanel(this.#workspaceView).then(() => this.#openActivities());
  }

  openRoster(): void {
    void this.#openPanel(this.#workspaceView).then(() => this.#openRoster());
  }

  onRosterSync(result: RosterSyncResult): void {
    const countChanged = this.#presentCount !== result.presentCount;
    this.#presentCount = result.presentCount;
    this.#rosterCount.hidden = result.presentCount === 0;
    this.#rosterCount.textContent = result.presentCount > 99 ? "99+" : result.presentCount.toString();
    this.#rosterButton.title = result.presentCount
      ? `LinkRoster · ${result.presentCount} in room`
      : "LinkRoster";
    if (countChanged || result.changed) {
      this.#renderHomeStatus();
      void this.#renderHome();
    }
    if (result.changed) {
      for (const memberNumber of new Set([...result.joined, ...result.left])) {
        this.#schedulePresenceRender(memberNumber);
      }
      this.presence.requestMany(result.joined);
    }
    if (this.#workspaceView === "roster" && result.changed) this.#renderRoster();
  }

  async refresh(): Promise<void> {
    const [, conversations] = await Promise.all([
      this.#updateUnreadBadge(),
      this.service.listConversations(),
    ]);
    await this.#renderConversations(conversations);
    this.#groupChatPanel?.refresh();
    await this.#renderHome(conversations);
  }

  #buildLauncher(): void {
    this.#badge.hidden = true;
    this.#launcher.append(this.#emblem("kl-launcher-emblem"), this.#badge);
    this.#launcher.setAttribute("aria-expanded", "false");
    this.#launcher.addEventListener("click", () => {
      if (Date.now() < this.#suppressLauncherClickUntil) return;
      if (this.#panel.hidden) void this.open();
      else this.close();
    });
    this.#launcher.addEventListener("pointerdown", (event) => this.#startLauncherDrag(event));
    this.#launcher.addEventListener("pointermove", (event) => this.#moveLauncher(event));
    this.#launcher.addEventListener("pointerup", (event) => this.#finishLauncherDrag(event));
    this.#launcher.addEventListener("pointercancel", (event) => this.#cancelLauncherDrag(event));
  }

  #buildPanel(): void {
    this.#panel.hidden = true;
    this.#panel.id = "kikilink-panel";
    this.#panel.setAttribute("role", "region");
    this.#launcher.setAttribute("aria-controls", this.#panel.id);
    this.#panel.dataset.mobileView = "list";
    this.#panel.dataset.workspace = "home";
    this.#connection.append(this.#connectionDot, this.#connectionText);
    this.setConnectionState(this.adapter.isReady() ? "ready" : "connecting");
    const brand = element(
      "div",
      { className: "kl-brand" },
      this.#emblem("kl-brand-emblem"),
      element(
        "div",
        { className: "kl-brand-copy" },
        element("div", { className: "kl-brand-title", text: "KikiLink" }),
        element(
          "div",
          { className: "kl-brand-subtitle" },
          `Personal Link Deck · v${this.version}`,
          this.#connection,
        ),
      ),
    );
    brand.setAttribute("title", "Drag to move KikiLink");
    const close = element("button", {
      className: "kl-icon-button",
      type: "button",
      title: "Close KikiLink",
      ariaLabel: "Close KikiLink",
      onClick: () => this.close(),
    });
    close.append(kikiIcon("close"));
    this.#topbarSettingsButton.append(kikiIcon("settings"));
    this.#topbarSettingsButton.addEventListener("click", () => this.#openSettings());
    this.#finderTrigger.replaceChildren(
      kikiIcon("search", "kl-finder-trigger-icon"),
      element("span", { className: "kl-finder-trigger-label", text: "Find" }),
      element("kbd", { className: "kl-finder-shortcut", text: "Ctrl K" }),
    );
    this.#finderTrigger.setAttribute("aria-keyshortcuts", "Control+K Meta+K");
    this.#finderTrigger.addEventListener("click", () => this.#openFinder());
    this.#newsTrigger.replaceChildren(
      kikiIcon("note", "kl-news-trigger-icon"),
      element("span", { className: "kl-news-trigger-label", text: "News" }),
    );
    this.#newsTrigger.addEventListener("click", () => this.#activateFeature("news"));
    this.#presenceTriggerLabel.replaceChildren(
      this.#presenceTriggerName,
      this.#presenceTriggerStatus,
    );
    this.#presenceTrigger.replaceChildren(
      this.#presenceTriggerAvatar,
      this.#presenceTriggerLabel,
      this.#presenceTriggerDot,
    );
    this.#presenceTrigger.addEventListener("click", () => this.#openPresenceDialog());
    this.#renderOwnPresence();
    this.#scheduleClockUpdate();
    this.#contextTitle.dataset.noPanelDrag = "true";
    this.#localClock.dataset.noPanelDrag = "true";
    const dragSpace = element("div", {
      className: "kl-topbar-drag-space",
      ariaLabel: "Drag to move KikiLink",
    });
    const topbar = element(
      "header",
      { className: "kl-topbar" },
      brand,
      this.#newsTrigger,
      dragSpace,
      this.#contextTitle,
      this.#localClock,
      this.#presenceTrigger,
      this.#finderTrigger,
      this.#topbarSettingsButton,
      close,
    );
    topbar.addEventListener("pointerdown", (event) => this.#startPanelDrag(event));
    topbar.addEventListener("pointermove", (event) => this.#movePanel(event));
    topbar.addEventListener("pointerup", (event) => this.#finishPanelDrag(event));
    topbar.addEventListener("pointercancel", (event) => this.#cancelPanelDrag(event));

    this.#buildFeatureNavigation();
    this.#buildHome();
    this.#buildNewsPage();

    this.#search.type = "search";
    this.#search.placeholder = "Search chats";
    this.#search.autocomplete = "off";
    this.#search.addEventListener("input", () => void this.#renderConversations());
    this.#galleryButton.append(
      kikiIcon("image"),
      element("span", { className: "kl-sidebar-gallery-label", text: "Gallery" }),
    );
    this.#galleryButton.addEventListener("click", () => void this.#openGallery());
    const newChatButton = element("button", {
      className: "kl-sidebar-new-chat",
      type: "button",
      title: "New Beep chat",
      ariaLabel: "New Beep chat",
      onClick: () => this.#openNewChat(),
    }, kikiIcon("plus"));
    const sidebar = element(
      "aside",
      { className: "kl-sidebar" },
      element("div", { className: "kl-search-wrap" }, this.#search),
      element(
        "div",
        { className: "kl-sidebar-heading" },
        element("span", { text: "Recent chats" }),
        element("div", { className: "kl-sidebar-heading-actions" }, this.#galleryButton, newChatButton),
      ),
      this.#conversationList,
      this.#groupChatPanel?.sidebarSection,
    );

    this.#empty.append(
      element("div", { className: "kl-empty-mark" }, kikiIcon("chat")),
      element("h2", { className: "kl-empty-title", text: "Your Beeps, connected" }),
      element("p", {
        className: "kl-empty-copy",
        text: "Choose a conversation or start a new one by member number.",
      }),
      element("button", {
        className: "kl-text-button kl-text-button--primary",
        type: "button",
        text: "New chat",
        onClick: () => this.#openNewChat(),
      }),
    );

    this.#buildChat();
    const main = element(
      "main",
      { className: "kl-main" },
      this.#empty,
      this.#chat,
      this.#groupChatPanel?.chatPane,
    );
    this.#chatLayout.append(sidebar, main);
    this.#buildRosterPage();
    this.#buildGalleryPage();
    this.#buildRoomPage();
    this.#buildMusicPage();
    this.#buildActivitiesPage();
    this.#buildSettingsPage();
    this.#workspace.append(
      this.#home,
      this.#newsPage,
      this.#chatLayout,
      this.#galleryPage,
      this.#rosterPage,
      this.#roomPage,
      this.#musicPage,
      this.#activitiesPage,
      this.#settingsPage,
    );
    const shell = element("div", { className: "kl-shell" }, this.#featureNav, this.#workspace);
    this.#panel.append(topbar, shell);
    this.#showWorkspace("home", false);
    this.#panel.addEventListener("keydown", (event) => {
      const target = event.target;
      const editing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (
        event.key.toLocaleLowerCase() === "k" &&
        (event.ctrlKey || event.metaKey) &&
        !editing
      ) {
        event.preventDefault();
        this.#openFinder();
        return;
      }
      if (event.key === "Escape" && !this.#profileMenu.hidden) {
        this.#closeProfileMenu();
        return;
      }
      if (
        event.key === "Escape" &&
        !this.#newChatDialog.open &&
        !this.#finderDialog.open &&
        !this.#presenceDialog.open &&
        !this.#addonProfileDialog.open &&
        !this.#imageDialog.open &&
        !this.#aliasDialog.open &&
        !this.#removeChatDialog.open
      ) {
        this.close();
      }
    });
    this.#shadow.addEventListener("pointerdown", (event) => {
      if (this.#profileMenu.hidden || event.composedPath().includes(this.#profileMenu)) return;
      this.#closeProfileMenu();
    });
  }

  #buildFeatureNavigation(): void {
    this.#configureNavButton(this.#homeNavButton, "home", "Home", "home");
    this.#configureNavButton(this.#chatNavButton, "chat", "Chat", "chat");
    this.#configureNavButton(this.#rosterButton, "users", "Players", "roster");
    this.#configureNavButton(this.#roomNavButton, "location", "Room", "room");
    this.#configureNavButton(this.#musicNavButton, "music", "Music", "music");
    this.#configureNavButton(this.#activitiesButton, "activities", "Custom", "activities");
    this.#configureNavButton(this.#settingsNavButton, "settings", "Settings", "settings");
    this.#rosterCount.hidden = true;
    this.#rosterButton.append(this.#rosterCount);
    this.#featureNav.append(
      this.#homeNavButton,
      this.#chatNavButton,
      this.#rosterButton,
      this.#roomNavButton,
      this.#musicNavButton,
      this.#activitiesButton,
      this.#settingsNavButton,
    );
  }

  #configureNavButton(
    button: HTMLButtonElement,
    icon: KikiLinkIconName,
    label: string,
    target: FeatureTarget,
  ): void {
    button.dataset.target = target;
    button.replaceChildren(
      kikiIcon(icon, "kl-nav-icon"),
      element("span", { className: "kl-nav-label", text: label }),
    );
    button.addEventListener("click", () => this.#activateFeature(target));
  }

  #activateFeature(target: FeatureTarget): void {
    if (target === "home" || target === "chat" || target === "news") {
      this.#showWorkspace(target);
      if (target !== "news") void this.refresh();
      return;
    }
    if (target === "roster") {
      this.#openRoster();
      return;
    }
    if (target === "activities") {
      this.#openActivities();
      return;
    }
    if (target === "room") {
      void this.#openRoomTools();
      return;
    }
    if (target === "music") {
      this.#showWorkspace("music");
      void this.#renderMusicPage();
      return;
    }
    if (target === "gallery") {
      void this.#openGallery();
      return;
    }
    this.#openSettings();
  }

  #buildNewsPage(): void {
    const fullChangelog = element("a", {
      className: "kl-text-button kl-news-changelog-link",
      text: "Full changelog",
    });
    fullChangelog.href = "https://github.com/Lilja000/KikiLink/blob/main/CHANGELOG.md";
    fullChangelog.target = "_blank";
    fullChangelog.rel = "noopener noreferrer";
    const header = element(
      "header",
      { className: "kl-feature-page-header" },
      element(
        "div",
        { className: "kl-feature-page-heading" },
        element("div", { className: "kl-feature-page-eyebrow", text: "KIKILINK JOURNAL" }),
        element("h1", { className: "kl-feature-page-title", text: "News" }),
        element("p", {
          className: "kl-feature-page-subtitle",
          text: "New features, important fixes, and the details behind each release.",
        }),
      ),
      fullChangelog,
    );
    const releases = KIKILINK_NEWS.map((release) => {
      const current = release.version === this.version;
      const published = element("time", { className: "kl-news-date", text: release.date });
      published.dateTime = release.date;
      const article = element(
        "article",
        { className: "kl-news-release" },
        element(
          "div",
          { className: "kl-news-release-rail" },
          element("span", { className: "kl-news-release-dot" }),
        ),
        element(
          "div",
          { className: "kl-news-release-card" },
          element(
            "div",
            { className: "kl-news-release-meta" },
            element("span", { className: "kl-news-version", text: `v${release.version}` }),
            current ? element("span", { className: "kl-news-current", text: "Current" }) : null,
            published,
          ),
          element("h2", { text: release.title }),
          element("p", { className: "kl-news-summary", text: release.summary }),
          element(
            "ul",
            { className: "kl-news-highlights" },
            ...release.highlights.map((highlight) =>
              element("li", {}, element("span", { text: highlight }))),
          ),
        ),
      );
      article.dataset.version = release.version;
      article.dataset.current = String(current);
      return article;
    });
    this.#newsPage.append(header, element("div", { className: "kl-news-feed" }, ...releases));
  }

  #buildHome(): void {
    this.#homePresence.addEventListener("click", () => this.#openPresenceDialog());
    this.#homeActionTitle.id = "kikilink-home-next-title";
    this.#homeActionButton.addEventListener("click", () => void this.#runHomeAction());
    const nextStep = element(
      "section",
      { className: "kl-home-next", ariaLabel: "Suggested next step" },
      this.#homeActionIcon,
      element(
        "div",
        { className: "kl-home-next-copy" },
        element("div", { className: "kl-home-next-kicker", text: "SUGGESTED NEXT STEP" }),
        this.#homeActionTitle,
        this.#homeActionDescription,
      ),
      element(
        "div",
        { className: "kl-home-next-footer" },
        this.#homeActionMeta,
        this.#homeActionButton,
      ),
    );
    nextStep.setAttribute("aria-labelledby", this.#homeActionTitle.id);

    const homeMark = element(
      "div",
      { className: "kl-home-mark" },
      this.#emblem("kl-home-emblem"),
      element("span", { className: "kl-home-orbit" }),
    );
    homeMark.setAttribute("aria-hidden", "true");
    const hero = element(
      "header",
      { className: "kl-home-hero" },
      element(
        "div",
        { className: "kl-home-hero-copy" },
        element("div", { className: "kl-home-eyebrow", text: "KIKILINK HOME" }),
        this.#homeGreeting,
        element("p", {
          className: "kl-home-lead",
          text: "Your Beeps and room tools, organized around what you want to do next.",
        }),
        element(
          "div",
          { className: "kl-home-statuses" },
          this.#homeStatus("Connection", this.#homeConnection),
          this.#homeStatus("My status", this.#homePresence),
          this.#homeStatus("Current room", this.#homeRoom),
        ),
      ),
      nextStep,
      homeMark,
    );

    const chatCard = element("button", {
      className: "kl-feature-card kl-feature-card--primary",
      type: "button",
      title: "Open LinkChat",
      onClick: () => this.#activateFeature("chat"),
    });
    this.#fillFeatureCard(
      chatCard,
      "chat",
      "START OR CONTINUE",
      "Chat",
      "Read recent Beeps, find conversations, and send a message.",
      this.#homeChatMetric,
      element("span", { className: "kl-feature-card-action", text: "Open Chat" }),
    );
    this.#fillFeatureCard(
      this.#homeRosterCard,
      "users",
      "SEE WHO IS HERE",
      "Players",
      "Find people in the room, Whisper, and keep private notes.",
      this.#homeRosterMetric,
      this.#homeRosterAction,
    );
    this.#homeRosterCard.addEventListener("click", () => this.#activateFeature("roster"));
    this.#fillFeatureCard(
      this.#homeActivitiesCard,
      "activities",
      "EXPRESS YOURSELF",
      "Custom Activities",
      "Create personal actions that appear beside vanilla Activities.",
      this.#homeActivitiesMetric,
      this.#homeActivitiesAction,
    );
    this.#homeActivitiesCard.addEventListener("click", () => this.#activateFeature("activities"));
    this.#fillFeatureCard(
      this.#homeGalleryCard,
      "image",
      "YOUR IMAGE LIBRARY",
      "Gallery",
      "Browse chat images or add a link and local upload directly to your library.",
      this.#homeGalleryMetric,
      element("span", { className: "kl-feature-card-action", text: "Open gallery" }),
    );
    this.#homeGalleryCard.addEventListener("click", () => this.#activateFeature("gallery"));
    const settingsCard = element("button", {
      className: "kl-feature-card",
      type: "button",
      title: "KikiLink settings",
      onClick: () => this.#activateFeature("settings"),
    });
    this.#fillFeatureCard(
      settingsCard,
      "settings",
      "MAKE IT YOURS",
      "Settings",
      "Adjust the look, comfort, launcher, privacy, and optional tools.",
      this.#homeSettingsMetric,
      element("span", { className: "kl-feature-card-action", text: "Customize" }),
    );
    const sectionHeading = element(
      "div",
      { className: "kl-home-section-heading" },
      element("h2", { text: "Choose a tool" }),
      element("p", {
        className: "kl-home-section-description",
        text: "Core tools stay here; Gallery is easy to reach without adding another main tab.",
      }),
    );
    const cards = element(
      "section",
      { className: "kl-feature-grid", ariaLabel: "KikiLink tools" },
      chatCard,
      this.#homeRosterCard,
      this.#homeActivitiesCard,
      this.#homeGalleryCard,
      settingsCard,
    );
    const privacy = element(
      "div",
      { className: "kl-home-privacy" },
      kikiIcon("lock", "kl-home-privacy-icon"),
      element(
        "span",
        {},
        "Account-private by design · data belongs to this BC MemberNumber; presence is shared only with compatible KikiLink users.",
      ),
    );
    this.#home.append(hero, sectionHeading, cards, privacy);
  }

  #homeStatus(label: string, value: HTMLElement): HTMLDivElement {
    return element(
      "div",
      { className: "kl-home-status" },
      element("span", { className: "kl-home-status-label", text: label }),
      value,
    );
  }

  #fillFeatureCard(
    card: HTMLButtonElement,
    icon: KikiLinkIconName,
    kicker: string,
    title: string,
    description: string,
    metric: HTMLElement,
    action: HTMLElement,
  ): void {
    card.replaceChildren(
      kikiIcon(icon, "kl-feature-card-icon"),
      element(
        "span",
        { className: "kl-feature-card-copy" },
        element("span", { className: "kl-feature-card-kicker", text: kicker }),
        element("span", { className: "kl-feature-card-title", text: title }),
        element("span", { className: "kl-feature-card-description", text: description }),
      ),
      element(
        "span",
        { className: "kl-feature-card-footer" },
        metric,
        action,
      ),
    );
  }

  async #runHomeAction(): Promise<void> {
    const action = this.#homeAction;
    if (action.kind === "new-chat") {
      this.#openNewChat();
      return;
    }
    if (action.kind === "chat") {
      if (action.peerNumber !== undefined) {
        await this.openChat(action.peerNumber, action.peerName);
      } else {
        this.#activateFeature("chat");
      }
      return;
    }
    if (action.kind === "group") {
      await this.#openPanel("chat");
      await this.#groupChatPanel?.activate(action.groupId);
      return;
    }
    this.#activateFeature(action.kind);
  }

  #showWorkspace(view: WorkspaceView, remember = true): void {
    if (this.#workspaceView === "roster" && view !== "roster") this.#saveNotebook(false);
    if (this.#workspaceView === "gallery" && view !== "gallery") {
      this.#invalidateGalleryRender();
    }
    this.#workspaceView = view;
    if (remember && view !== "settings") this.#lastWorkspaceView = view;
    this.#panel.dataset.workspace = view;
    this.#home.hidden = view !== "home";
    this.#newsPage.hidden = view !== "news";
    this.#chatLayout.hidden = view !== "chat";
    this.#galleryPage.hidden = view !== "gallery";
    this.#rosterPage.hidden = view !== "roster";
    this.#roomPage.hidden = view !== "room";
    this.#musicPage.hidden = view !== "music";
    this.#activitiesPage.hidden = view !== "activities";
    this.#settingsPage.hidden = view !== "settings";
    if (view === "chat" && this.#groupChatPanel?.activeGroupId) {
      void this.#groupChatPanel.markVisibleActiveRead();
    }
    if (view === "chat" && this.#activePeer === undefined) {
      this.#panel.dataset.mobileView = "list";
    }
    this.#contextTitle.textContent = WORKSPACE_TITLES[view];
    this.#updateNavigation();
  }

  #updateNavigation(): void {
    for (const button of this.#featureNav.querySelectorAll<HTMLButtonElement>(".kl-nav-item")) {
      const active =
        button.dataset.target === this.#workspaceView ||
        (this.#workspaceView === "gallery" && button.dataset.target === "chat");
      button.dataset.active = String(active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    if (this.#workspaceView === "settings") {
      this.#topbarSettingsButton.setAttribute("aria-current", "page");
    } else {
      this.#topbarSettingsButton.removeAttribute("aria-current");
    }
    if (this.#workspaceView === "news") this.#newsTrigger.setAttribute("aria-current", "page");
    else this.#newsTrigger.removeAttribute("aria-current");
  }

  #buildChat(): void {
    this.#chat.hidden = true;
    this.#backButton.append(kikiIcon("back"));
    this.#backButton.addEventListener("click", () => this.#showConversationList());
    this.#renderPinButton(false);
    this.#pinButton.addEventListener("click", () => void this.#togglePin());
    this.#profileButton.append(kikiIcon("more"));
    this.#attachImageButton.append(kikiIcon("image"));
    this.#sendButton.replaceChildren(
      kikiIcon("send"),
      element("span", { className: "kl-send-label", text: "Send" }),
    );
    const person = element(
      "div",
      { className: "kl-chat-person" },
      this.#chatName,
      element(
        "div",
        { className: "kl-chat-subline" },
        this.#chatNumber,
        this.#chatPresence,
        this.#chatRoom,
      ),
    );
    const header = element(
      "header",
      { className: "kl-chat-header" },
      this.#backButton,
      this.#chatAvatar,
      person,
      this.#pinButton,
      this.#profileButton,
    );
    this.#profileButton.addEventListener("click", () => {
      if (this.#activePeer === undefined) return;
      const bounds = this.#profileButton.getBoundingClientRect();
      void this.#openProfileMenu(
        this.#activePeer,
        this.#activeName,
        bounds.right,
        bounds.bottom + 6,
        this.#profileButton,
      );
    });
    this.#bindProfileMenu(this.#chatAvatar, () =>
      this.#activePeer === undefined
        ? undefined
        : { memberNumber: this.#activePeer, displayName: this.#activeName },
    );
    this.#chatAvatar.addEventListener("click", () => {
      if (this.#activePeer !== undefined) {
        void this.#openAddonProfile(this.#activePeer, this.#activeName);
      }
    });
    this.#chatAvatar.addEventListener("keydown", (event) => {
      if ((event.key !== "Enter" && event.key !== " ") || this.#activePeer === undefined) return;
      event.preventDefault();
      void this.#openAddonProfile(this.#activePeer, this.#activeName);
    });
    this.#bindProfileMenu(person, () =>
      this.#activePeer === undefined
        ? undefined
        : { memberNumber: this.#activePeer, displayName: this.#activeName },
    );

    this.#composer.maxLength = 1000;
    this.#composer.rows = 1;
    this.#composer.addEventListener("input", () => {
      this.#resizeComposer();
      this.#updateCounter();
      if (this.#activePeer !== undefined) {
        this.#saveDraft(this.#activePeer, this.#activeNativeName, this.#composer.value);
        this.#updateLocalTyping();
      }
    });
    this.#composer.addEventListener("blur", () => this.#stopLocalTyping());
    this.#composer.addEventListener("keydown", (event) => {
      const enterToSend = this.settings.get().linkChat.enterToSend;
      if (
        event.key === "Enter" &&
        !event.isComposing &&
        ((event.ctrlKey || event.metaKey) || (enterToSend && !event.shiftKey && !event.altKey))
      ) {
        event.preventDefault();
        void this.#send();
      }
    });
    this.#sendButton.addEventListener("click", () => void this.#send());
    this.#attachImageButton.addEventListener("click", () => this.#openImageDialog());
    this.#includeRoom.type = "checkbox";
    this.#includeRoom.addEventListener("change", () => {
      this.settings.update((draft) => {
        draft.linkChat.includeRoomByDefault = this.#includeRoom.checked;
      });
    });
    const options = element(
      "div",
      { className: "kl-composer-options" },
      element("label", { className: "kl-check" }, this.#includeRoom, "Share current room"),
      this.#counter,
    );
    const composer = element(
      "footer",
      { className: "kl-composer" },
      this.#typingIndicator,
      this.#quickActions,
      element(
        "div",
        { className: "kl-composer-row" },
        this.#attachImageButton,
        this.#composer,
        this.#sendButton,
      ),
      options,
    );
    this.#typingIndicator.hidden = true;
    this.#typingIndicator.setAttribute("role", "status");
    this.#typingIndicator.setAttribute("aria-live", "polite");
    this.#chat.append(header, this.#messages, composer);
    this.#renderQuickActions();
    this.#updateCounter();
  }

  #buildSettingsPage(): void {
    const header = element(
      "header",
      { className: "kl-feature-page-header" },
      element(
        "div",
        { className: "kl-feature-page-heading" },
        element("div", { className: "kl-feature-page-eyebrow", text: "MAKE IT YOURS" }),
        element("h1", { className: "kl-feature-page-title", text: "Settings" }),
        element("p", {
          className: "kl-feature-page-subtitle",
          text: "Tune KikiLink for your screen, habits, and comfort without changing the game.",
        }),
      ),
    );

    this.#themeSelect.replaceChildren(
      selectOption("dark", "Dark lacquer"),
      selectOption("light", "Light paper"),
      selectOption("system", "Follow system"),
    );
    this.#themeSelect.dataset.setting = "theme";
    this.#themeSelect.setAttribute("aria-label", "Theme");
    const theme = this.#settingRow(
      "Theme",
      "Lacquer black, warm paper, or your system theme.",
      this.#themeSelect,
    );

    this.#accentInput.type = "color";
    this.#accentInput.dataset.setting = "accent";
    this.#accentInput.setAttribute("aria-label", "Custom accent color");
    const accentPresets = element("div", { className: "kl-color-presets" });
    for (const [color, label] of [
      ["#d71932", "Crimson"],
      ["#b63a67", "Sakura"],
      ["#ad7624", "Gold"],
      ["#7557c8", "Violet"],
      ["#247f7a", "Jade"],
    ] as const) {
      const swatch = element("button", {
        className: "kl-color-swatch",
        type: "button",
        title: label,
        ariaLabel: `Use ${label} accent`,
        onClick: () => {
          this.#accentInput.value = color;
          this.#updateAccentPresets();
        },
      });
      swatch.dataset.color = color;
      swatch.setAttribute("aria-pressed", "false");
      swatch.style.setProperty("--kl-swatch", color);
      accentPresets.append(swatch);
    }
    this.#accentInput.addEventListener("input", () => this.#updateAccentPresets());
    const accent = this.#settingRow(
      "Accent color",
      "Choose a preset or any color that feels like yours.",
      element("div", { className: "kl-color-control" }, accentPresets, this.#accentInput),
    );

    this.#densitySelect.replaceChildren(
      selectOption("comfortable", "Comfortable"),
      selectOption("compact", "Compact"),
      selectOption("super-compact", "Super compact"),
    );
    this.#densitySelect.dataset.setting = "density";
    this.#densitySelect.setAttribute("aria-label", "Interface spacing");
    const density = this.#settingRow(
      "Spacing",
      "Comfortable is roomy; Compact fits more; Super compact keeps only the essentials.",
      this.#densitySelect,
    );

    this.#textScaleSelect.replaceChildren(
      selectOption("normal", "Default"),
      selectOption("large", "Large"),
      selectOption("extra-large", "Extra large"),
    );
    this.#textScaleSelect.dataset.setting = "text-scale";
    this.#textScaleSelect.setAttribute("aria-label", "Text size");
    const textScale = this.#settingRow(
      "Text size",
      "Increase labels and supporting text throughout the deck.",
      this.#textScaleSelect,
    );

    this.#homeLayoutSelect.replaceChildren(
      selectOption("showcase", "Guided"),
      selectOption("compact", "Focused"),
    );
    this.#homeLayoutSelect.dataset.setting = "home-layout";
    this.#homeLayoutSelect.setAttribute("aria-label", "Home style");
    const homeLayout = this.#settingRow(
      "Home style",
      "Guided suggests a useful next step; Focused keeps only the essentials.",
      this.#homeLayoutSelect,
    );

    this.#launcherSideSelect.replaceChildren(
      selectOption("right", "Right"),
      selectOption("left", "Left"),
    );
    this.#launcherSideSelect.dataset.setting = "launcher-side";
    this.#launcherSideSelect.setAttribute("aria-label", "Launcher side");
    const launcherSide = this.#settingRow(
      "Launcher side",
      "Choose its default side. You can still drag the emblem anywhere.",
      this.#launcherSideSelect,
    );

    this.#launcherOpenSelect.replaceChildren(
      selectOption("home", "Link Deck home"),
      selectOption("last", "Last section"),
      selectOption("chat", "LinkChat directly"),
    );
    this.#launcherOpenSelect.dataset.setting = "launcher-open";
    this.#launcherOpenSelect.setAttribute("aria-label", "Launcher opens");
    const launcherOpen = this.#settingRow(
      "Launcher opens",
      "Choose what happens when you tap the floating emblem.",
      this.#launcherOpenSelect,
    );

    this.#reducedMotionToggle.type = "checkbox";
    const reducedMotionSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#reducedMotionToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#reducedMotionToggle.setAttribute("aria-label", "Reduced motion");
    const reducedMotion = this.#settingRow(
      "Reduced motion",
      "Disable panel and control animations.",
      reducedMotionSwitch,
    );

    this.#roomBadgeToggle.type = "checkbox";
    this.#roomBadgeToggle.setAttribute("aria-label", "Show KikiLink Blossom");
    const roomBadgeSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#roomBadgeToggle,
      element("span", { className: "kl-switch-track" }),
    );
    const moveRoomBadge = element("button", {
      className: "kl-text-button kl-text-button--primary",
      type: "button",
      text: "Move flower",
      onClick: () => this.#beginRoomBadgePlacement(),
    });
    const resetRoomBadge = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Reset flower position",
      onClick: () => this.#resetRoomBadgePosition(),
    });
    const roomBadgeSection = element(
      "section",
      { className: "kl-setting-section kl-room-badge-settings" },
      element("div", { className: "kl-setting-section-title", text: "Blossom badge" }),
      this.#settingRow(
        "Show Blossom flower",
        "A small translucent KikiLink mark beside the addon icons above compatible characters.",
        roomBadgeSwitch,
      ),
      element(
        "div",
        { className: "kl-setting-action-row" },
        element(
          "div",
          { className: "kl-setting-copy" },
          element("div", { className: "kl-setting-name", text: "Flower position" }),
          element("div", {
            className: "kl-setting-help",
            text: "Choose Move flower while you are in a room, then drag the flower above your character once. Normal gameplay cannot move it.",
          }),
        ),
        element("div", { className: "kl-inline-actions" }, moveRoomBadge, resetRoomBadge),
      ),
    );

    this.#historyToggle.type = "checkbox";
    const historySwitch = element(
      "label",
      { className: "kl-switch" },
      this.#historyToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#historyToggle.setAttribute("aria-label", "Save message history");
    const history = this.#settingRow(
      "Save message history",
      "Stored for this BC account; recent history is mirrored to your other devices.",
      historySwitch,
    );

    this.#enterToSendToggle.type = "checkbox";
    const enterToSendSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#enterToSendToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#enterToSendToggle.setAttribute("aria-label", "Send messages with Enter");
    const enterToSend = this.#settingRow(
      "Enter sends",
      "Press Enter to send and Shift+Enter for a new line. Ctrl+Enter always sends.",
      enterToSendSwitch,
    );

    this.#typingIndicatorsToggle.type = "checkbox";
    const typingIndicatorsSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#typingIndicatorsToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#typingIndicatorsToggle.setAttribute("aria-label", "Share typing indicators");
    const typingIndicators = this.#settingRow(
      "Typing indicators",
      "Show and share a short-lived typing signal only with compatible KikiLink users.",
      typingIndicatorsSwitch,
    );

    this.#imagePreviewSelect.replaceChildren(
      selectOption("ask", "Ask before loading"),
      selectOption("always", "Always show"),
      selectOption("never", "Links only"),
    );
    this.#imagePreviewSelect.setAttribute("aria-label", "Remote image previews");
    const imagePreviews = this.#settingRow(
      "Image previews",
      "Controls chat images and KikiLink profile avatars. Ask keeps initials or a placeholder until you explicitly show the image.",
      this.#imagePreviewSelect,
    );

    this.#imageUploadsToggle.type = "checkbox";
    this.#imageUploadsToggle.setAttribute("aria-label", "Enable temporary Litterbox sharing");
    this.#imageUploadsToggle.addEventListener("change", () =>
      this.#renderImageUploadSettingsOptions(),
    );
    const imageUploadsSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#imageUploadsToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#imageUploadRetentionSelect.replaceChildren(
      selectOption("1h", "1 hour"),
      selectOption("12h", "12 hours"),
      selectOption("24h", "24 hours"),
      selectOption("72h", "3 days"),
    );
    this.#imageUploadRetentionSelect.setAttribute("aria-label", "Temporary file lifetime");
    const litterboxLink = element("a", {
      className: "kl-inline-link",
      text: "Litterbox by Catbox",
    });
    litterboxLink.href = "https://litterbox.catbox.moe/";
    litterboxLink.target = "_blank";
    litterboxLink.rel = "noopener noreferrer";
    this.#imageUploadSettingsOptions.append(
      this.#settingRow(
        "Temporary link lifetime",
        "Litterbox removes shared chat images and room media after this period.",
        this.#imageUploadRetentionSelect,
      ),
      element(
        "p",
        { className: "kl-image-upload-privacy" },
        kikiIcon("lock"),
        element(
          "span",
          {},
          "Only an explicit Share or Upload action makes a network request. KikiLink replaces the filename; images are resized and stripped of metadata before the public file is sent to ",
          litterboxLink,
          ". Audio may retain embedded metadata. Expiration cannot remove copies another person already saved. Manual Gallery files stay on this device and are never uploaded automatically.",
        ),
      ),
    );
    const imageUploads = element(
      "section",
      { className: "kl-setting-section kl-image-upload-settings" },
      element("div", {
        className: "kl-setting-section-title",
        text: "Temporary file sharing",
      }),
      this.#settingRow(
        "Share local files",
        "Create expiring public links through Litterbox without an account.",
        imageUploadsSwitch,
      ),
      this.#imageUploadSettingsOptions,
    );

    this.#retentionInput.type = "number";
    this.#retentionInput.min = "1";
    this.#retentionInput.max = "3650";
    this.#retentionInput.dataset.setting = "retention-days";
    this.#retentionInput.setAttribute("aria-label", "Message retention in days");
    const retention = this.#settingRow(
      "Retention",
      "Automatically remove older messages.",
      element("label", {}, this.#retentionInput, " days"),
    );

    const clearHistory = element("button", {
      className: "kl-text-button kl-text-button--danger",
      type: "button",
      text: "Clear all LinkChat history",
      onClick: () => void this.#clearHistory(),
    });
    const appearanceSection = this.#createSettingsPanel(
      "appearance",
      "Appearance & comfort",
      "Choose a look and reading density that stays comfortable during long sessions.",
      theme,
      accent,
      density,
      textScale,
      homeLayout,
      reducedMotion,
      roomBadgeSection,
    );

    const resetLauncher = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Reset launcher position",
      onClick: () => this.#resetLauncherPosition(),
    });
    const resetPanel = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Reset window position",
      onClick: () => this.#resetPanelPosition(),
    });
    const navigationSection = this.#createSettingsPanel(
      "navigation",
      "Navigation & launcher",
      "Decide where KikiLink lives and what you see first.",
      launcherOpen,
      launcherSide,
      element(
        "div",
        { className: "kl-setting-action-row" },
        element(
          "div",
          { className: "kl-setting-copy" },
          element("div", { className: "kl-setting-name", text: "Launcher position" }),
          element("div", {
            className: "kl-setting-help",
            text: "A button alternative to dragging: return the emblem to its safe corner.",
          }),
        ),
        resetLauncher,
      ),
      element(
        "div",
        { className: "kl-setting-action-row" },
        element(
          "div",
          { className: "kl-setting-copy" },
          element("div", { className: "kl-setting-name", text: "Window position" }),
          element("div", {
            className: "kl-setting-help",
            text: "Drag the KikiLink title bar on desktop, or return the window to its default corner.",
          }),
        ),
        resetPanel,
      ),
    );

    this.#rosterEnabledToggle.type = "checkbox";
    const rosterEnabledSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#rosterEnabledToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#rosterEnabledToggle.setAttribute("aria-label", "Enable LinkRoster");
    const rosterEnabled = this.#settingRow(
      "Enable LinkRoster",
      "Room roster, quick player actions, favorites, and private notes.",
      rosterEnabledSwitch,
    );
    this.#rosterTrackingToggle.type = "checkbox";
    const rosterTrackingSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#rosterTrackingToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#rosterTrackingToggle.setAttribute("aria-label", "Remember player encounters");
    const rosterTracking = this.#settingRow(
      "Remember encounters",
      "Store the last room, time, and encounter count only for this BC account.",
      rosterTrackingSwitch,
    );
    this.#rosterRetentionSelect.replaceChildren(
      selectOption("30", "30 days"),
      selectOption("90", "90 days"),
      selectOption("180", "180 days"),
      selectOption("365", "1 year"),
      selectOption("730", "2 years"),
      selectOption("0", "Keep forever"),
    );
    this.#rosterRetentionSelect.dataset.setting = "roster-retention";
    this.#rosterRetentionSelect.setAttribute("aria-label", "Player encounter retention");
    const rosterRetention = this.#settingRow(
      "Forget old encounters",
      "Applies only to players without notes, tags, or a favorite. Notebook entries stay safe.",
      this.#rosterRetentionSelect,
    );

    this.#notebookFileInput.type = "file";
    this.#notebookFileInput.accept = ".json,application/json";
    this.#notebookFileInput.hidden = true;
    this.#notebookFileInput.addEventListener("change", () => void this.#importNotebookFile());
    const exportNotebook = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Export",
      ariaLabel: "Export player notebook backup",
      onClick: () => this.#exportNotebook(),
    });
    const importNotebook = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Import",
      ariaLabel: "Import player notebook backup",
      onClick: () => this.#notebookFileInput.click(),
    });
    const notebookTools = element(
      "section",
      { className: "kl-data-tools" },
      element(
        "div",
        { className: "kl-data-tools-copy" },
        element("div", { className: "kl-data-tools-title", text: "Notebook backup" }),
        element("div", {
          className: "kl-setting-help",
          text: "Download or merge a manual JSON backup of this account's player notebook.",
        }),
        this.#notebookCount,
      ),
      element(
        "div",
        { className: "kl-data-tools-actions" },
        exportNotebook,
        importNotebook,
        this.#notebookFileInput,
      ),
    );
    const clearPeople = element("button", {
      className: "kl-text-button kl-text-button--danger",
      type: "button",
      text: "Clear player notes & encounter history",
      onClick: () => this.#clearPeople(),
    });
    const rosterSection = this.#createSettingsPanel(
      "players",
      "Players & private notebook",
      "Control what the player workspace remembers for this BC account.",
      rosterEnabled,
      rosterTracking,
      rosterRetention,
      notebookTools,
      clearPeople,
    );
    const addQuickAction = element("button", {
      className: "kl-text-button kl-add-action",
      type: "button",
      text: "+ Add quick action",
      onClick: () => this.#addQuickActionEditorRow(),
    });
    const quickActionsSection = element(
      "section",
      { className: "kl-setting-section kl-setting-editor-section" },
      element("div", { className: "kl-setting-section-title", text: "Quick actions" }),
      element("div", {
        className: "kl-setting-help",
        text: "Insert reusable actions into a Beep. Variables: {name}, {member}, {me}.",
      }),
      this.#quickActionsEditor,
      addQuickAction,
    );
    const chatSection = this.#createSettingsPanel(
      "chat",
      "Chat, history & privacy",
      "Keep this account's Beep history useful and under your control.",
      enterToSend,
      typingIndicators,
      imagePreviews,
      imageUploads,
      history,
      retention,
      quickActionsSection,
      clearHistory,
    );

    this.#activitiesToggle.type = "checkbox";
    const activitiesSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#activitiesToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#activitiesToggle.setAttribute("aria-label", "Show Custom Activities tab");
    const activitiesEnabled = this.#settingRow(
      "Show Custom Activities tab",
      "Keep your personal activity builder in the KikiLink toolbar.",
      activitiesSwitch,
    );
    const openCustomActivities = element("button", {
      className: "kl-text-button kl-text-button--primary",
      type: "button",
      text: "Open Custom Activities",
      onClick: () => this.#openActivities(),
    });
    const activitiesSection = this.#createSettingsPanel(
      "activities",
      "Custom Activities",
      "Create personal actions without replacing or cluttering Bondage Club's vanilla Activities.",
      activitiesEnabled,
      element("div", {
        className: "kl-presence-caveat",
        text: "Your account's list starts empty. Blossom marks every custom action in the native menu.",
      }),
      openCustomActivities,
    );

    this.#friendOnlineAlertToggle.type = "checkbox";
    const friendOnlineSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#friendOnlineAlertToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#friendOnlineAlertToggle.setAttribute("aria-label", "Friend online alerts");
    const friendOnlineAlerts = this.#settingRow(
      "Friends come online",
      "Show a small local notice when a friend appears online.",
      friendOnlineSwitch,
    );

    this.#roomJoinAlertToggle.type = "checkbox";
    const roomJoinSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#roomJoinAlertToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#roomJoinAlertToggle.setAttribute("aria-label", "Room join alerts");
    const roomJoinAlerts = this.#settingRow(
      "Someone joins your room",
      "Show a small local notice after a player joins the current room.",
      roomJoinSwitch,
    );

    this.#notificationSoundsToggle.type = "checkbox";
    const notificationSoundsSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#notificationSoundsToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#notificationSoundsToggle.setAttribute("aria-label", "Notification sounds");
    this.#notificationSoundsToggle.addEventListener("change", () => {
      if (this.#notificationSoundsToggle.checked) void this.#notificationSounds.unlock();
    });
    const notificationSounds = this.#settingRow(
      "Notification sounds",
      "Use a different gentle sound for chats and the alerts above.",
      notificationSoundsSwitch,
    );

    this.#soundVolumeInput.type = "range";
    this.#soundVolumeInput.min = "0";
    this.#soundVolumeInput.max = "100";
    this.#soundVolumeInput.step = "1";
    this.#soundVolumeInput.setAttribute("aria-label", "Alert volume");
    this.#soundVolumeInput.addEventListener("input", () => {
      this.#soundVolumeValue.textContent = `${this.#soundVolumeInput.value}%`;
    });
    const soundVolume = this.#settingRow(
      "Alert volume",
      "Applies to built-in and local custom notification sounds.",
      element(
        "label",
        { className: "kl-volume-control" },
        this.#soundVolumeInput,
        this.#soundVolumeValue,
      ),
    );

    const soundEntries = Object.entries(NOTIFICATION_SOUND_LABELS) as Array<
      [NotificationSoundPreset, string]
    >;
    for (const select of [
      this.#chatSoundSelect,
      this.#friendOnlineSoundSelect,
      this.#roomJoinSoundSelect,
    ]) {
      select.replaceChildren(
        ...soundEntries.map(([value, label]) => selectOption(value, label)),
      );
    }
    this.#chatSoundSelect.setAttribute("aria-label", "Chat notification sound");
    this.#friendOnlineSoundSelect.setAttribute("aria-label", "Friend online sound");
    this.#roomJoinSoundSelect.setAttribute("aria-label", "Room join sound");
    const soundChoice = (label: string, select: HTMLSelectElement): HTMLElement =>
      element(
        "div",
        { className: "kl-sound-choice" },
        element("span", { className: "kl-setting-name", text: label }),
        element(
          "div",
          { className: "kl-sound-choice-controls" },
          select,
          element("button", {
            className: "kl-text-button kl-sound-preview",
            type: "button",
            text: "Play",
            ariaLabel: `Preview ${label.toLocaleLowerCase()} sound`,
            onClick: () =>
              void this.#notificationSounds.play(soundChoiceOr(select.value, "chime"), {
                volume: Number(this.#soundVolumeInput.value),
              }),
          }),
        ),
      );
    const soundChoices = element(
      "details",
      { className: "kl-settings-disclosure kl-sound-settings" },
      element(
        "summary",
        {},
        element("span", { text: "Choose sounds" }),
        element("span", { className: "kl-disclosure-meta", text: "Optional" }),
      ),
      element(
        "div",
        { className: "kl-sound-choices" },
        soundChoice("Incoming chat", this.#chatSoundSelect),
        soundChoice("Friend online", this.#friendOnlineSoundSelect),
        soundChoice("Room join", this.#roomJoinSoundSelect),
      ),
    );

    this.#customSoundInput.type = "file";
    this.#customSoundInput.accept = "audio/*";
    this.#customSoundInput.hidden = true;
    this.#customSoundInput.addEventListener("change", () => void this.#addCustomSound());
    const addCustomSound = element("button", {
      className: "kl-text-button kl-text-button--primary",
      type: "button",
      text: "Add local sound",
      onClick: () => this.#customSoundInput.click(),
    });
    const customSounds = element(
      "details",
      { className: "kl-settings-disclosure kl-custom-sounds" },
      element(
        "summary",
        {},
        element("span", { text: "My sounds" }),
        element("span", { className: "kl-disclosure-meta", text: "Device only" }),
      ),
      element(
        "div",
        { className: "kl-custom-sounds-body" },
        element("p", {
          className: "kl-setting-help",
          text: "Audio must be 5 seconds or shorter and under 10 MB. The file stays in this browser and is never synchronized.",
        }),
        addCustomSound,
        this.#customSoundInput,
        this.#customSoundList,
      ),
    );

    this.#reactionsToggle.type = "checkbox";
    const reactionsSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#reactionsToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#reactionsToggle.setAttribute("aria-label", "Enable advanced reaction rules");
    const reactionsEnabled = this.#settingRow(
      "Enable custom rules",
      "Run your own ordered event rules. Leave this off if the quick alerts are enough.",
      reactionsSwitch,
    );
    const addReactionRule = element("button", {
      className: "kl-text-button kl-add-action kl-add-reaction-rule",
      type: "button",
      text: "+ Add event rule",
      onClick: () => this.#addReactionRuleEditorRow(),
    });
    const reactionRules = element(
      "section",
      { className: "kl-setting-section kl-setting-editor-section kl-reaction-rules" },
      element(
        "div",
        { className: "kl-reaction-rules-heading" },
        element("div", { className: "kl-setting-section-title", text: "Custom rules" }),
      ),
      element("div", {
        className: "kl-setting-help",
        text: "Triggers: incoming Beep, room join/leave, or friend online. Variables: {name}, {member}, {message}, {room}, {me}, {event}.",
      }),
      this.#reactionRulesEditor,
      addReactionRule,
    );
    const reactionSafety = element(
      "div",
      { className: "kl-reaction-safety" },
      kikiIcon("lock", "kl-reaction-safety-icon"),
      element(
        "span",
        {},
        "Local notices stay private. Public room emotes never expose {message} and keep the 10-second send guard.",
      ),
    );
    const advancedReactions = element(
      "details",
      { className: "kl-settings-disclosure kl-reaction-advanced" },
      element(
        "summary",
        {},
        element("span", { text: "Advanced" }),
        this.#reactionRuleCount,
      ),
      element(
        "div",
        { className: "kl-reaction-advanced-content" },
        reactionsEnabled,
        reactionSafety,
        reactionRules,
      ),
    );
    const reactionsSection = this.#createSettingsPanel(
      "reactions",
      "Notifications",
      "Turn on only the alerts you want. Everything else stays out of the way.",
      friendOnlineAlerts,
      roomJoinAlerts,
      notificationSounds,
      soundVolume,
      soundChoices,
      customSounds,
      advancedReactions,
    );

    const aboutMark = element("img", { className: "kl-about-watermark" }) as HTMLImageElement;
    aboutMark.src = KIKILINK_EMBLEM_DATA_URL;
    aboutMark.alt = "";
    aboutMark.decoding = "async";
    aboutMark.draggable = false;
    const creatorNumber = element(
      "span",
      {
        className: "kl-about-creator-number",
        text: `Member ${KIKILINK_CREATOR_MEMBER_NUMBER}`,
      },
    );
    const discord = element("a", {
      className: "kl-about-link kl-about-link--discord",
      text: "Join the KikiLink Discord",
    });
    discord.href = "https://discord.gg/6sgGTnptht";
    discord.target = "_blank";
    discord.rel = "noopener noreferrer nofollow";
    discord.append(kikiIcon("external", "kl-about-link-icon"));
    const repository = element("a", {
      className: "kl-about-link",
      text: "Open source repository",
    });
    repository.href = "https://github.com/Lilja000/KikiLink";
    repository.target = "_blank";
    repository.rel = "noopener noreferrer nofollow";
    repository.append(kikiIcon("external", "kl-about-link-icon"));
    const aboutCard = element(
      "section",
      { className: "kl-about-card" },
      aboutMark,
      element(
        "div",
        { className: "kl-about-brand" },
        this.#emblem("kl-about-emblem"),
        element(
          "div",
          {},
          element("div", { className: "kl-about-name", text: "KikiLink" }),
          element("div", { className: "kl-about-tagline", text: "Personal Link Deck for Bondage Club" }),
        ),
      ),
      element(
        "div",
        { className: "kl-about-creator" },
        element("span", { className: "kl-about-label", text: "CREATED BY" }),
        element("strong", { text: "Kiki" }),
        creatorNumber,
      ),
      element(
        "dl",
        { className: "kl-about-facts" },
        aboutFact("Version", this.version),
        aboutFact("Release channel", "Stable"),
        aboutFact("License", "MIT"),
        aboutFact("Data", "Scoped to your signed-in BC account"),
      ),
      element("div", { className: "kl-about-links" }, discord, repository),
      element("p", {
        className: "kl-about-note",
        text: "KikiLink is an independent quality-of-life addon. It keeps account data separate and shares Presence only with compatible KikiLink users.",
      }),
    );
    const aboutSection = this.#createSettingsPanel(
      "about",
      "About KikiLink",
      "Version, creator, community, and project information.",
      aboutCard,
    );

    const panels = element(
      "div",
      { className: "kl-settings-panels" },
      appearanceSection,
      navigationSection,
      chatSection,
      rosterSection,
      activitiesSection,
      reactionsSection,
      aboutSection,
    );

    this.#saveSettingsButton.addEventListener("click", () => this.#saveSettings());
    const cancel = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Discard",
      onClick: () => this.#cancelSettings(),
    });
    const actions = element(
      "footer",
      { className: "kl-settings-actions" },
      element("span", {
        className: "kl-settings-local-note",
        text: "Saved to this BC account.",
      }),
      cancel,
      this.#saveSettingsButton,
    );
    this.#settingsPage.append(
      header,
      element("div", { className: "kl-settings-layout" }, this.#settingsTabs, panels),
      actions,
    );
    this.#updateSettingsTabOrientation();
  }

  #createSettingsPanel(
    section: SettingsSection,
    title: string,
    description: string,
    ...children: Node[]
  ): HTMLElement {
    const tabId = `kikilink-settings-tab-${section}`;
    const panelId = `kikilink-settings-panel-${section}`;
    const labels: Record<SettingsSection, { icon: KikiLinkIconName; label: string }> = {
      appearance: { icon: "appearance", label: "Appearance" },
      navigation: { icon: "navigation", label: "Navigation" },
      chat: { icon: "chat", label: "Chat" },
      players: { icon: "users", label: "Players" },
      activities: { icon: "activities", label: "Activities" },
      reactions: { icon: "reactions", label: "Alerts" },
      about: { icon: "profile", label: "About" },
    };
    const tab = element(
      "button",
      { className: "kl-settings-tab", type: "button" },
      kikiIcon(labels[section].icon, "kl-settings-tab-icon"),
      element("span", { text: labels[section].label }),
    );
    tab.id = tabId;
    tab.dataset.section = section;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", panelId);
    tab.setAttribute("aria-selected", "false");
    tab.tabIndex = -1;
    tab.addEventListener("click", () => this.#showSettingsSection(section, true));
    tab.addEventListener("keydown", (event) => this.#handleSettingsTabKey(event));
    this.#settingsTabs.setAttribute("role", "tablist");
    this.#settingsTabs.setAttribute("aria-label", "Settings categories");
    this.#settingsTabs.append(tab);

    const panel = element(
      "section",
      { className: "kl-settings-panel" },
      element("h2", { className: "kl-settings-panel-title", text: title }),
      element("p", { className: "kl-settings-panel-description", text: description }),
      element("div", { className: "kl-settings-panel-body" }, ...children),
    );
    panel.id = panelId;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tabId);
    panel.hidden = true;
    this.#settingsPanels.set(section, panel);
    return panel;
  }

  #handleSettingsTabKey(event: KeyboardEvent): void {
    if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    const tabs = [...this.#settingsTabs.querySelectorAll<HTMLButtonElement>(".kl-settings-tab")];
    const current = tabs.indexOf(event.currentTarget as HTMLButtonElement);
    if (current < 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (current + (event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next]?.focus();
    const section = tabs[next]?.dataset.section as SettingsSection | undefined;
    if (section) this.#showSettingsSection(section, true);
  }

  #updateSettingsTabOrientation(): void {
    this.#settingsTabs.setAttribute(
      "aria-orientation",
      window.matchMedia?.("(max-width: 720px)").matches ? "horizontal" : "vertical",
    );
  }

  #buildNewChatDialog(): void {
    const title = element("div", { className: "kl-dialog-title", text: "New Beep chat" });
    title.id = "kikilink-new-chat-title";
    this.#newChatDialog.setAttribute("aria-labelledby", title.id);
    const close = element("button", {
      className: "kl-icon-button",
      type: "button",
      title: "Close",
      ariaLabel: "Close new chat",
      onClick: () => this.#newChatDialog.close(),
    });
    close.append(kikiIcon("close"));
    const header = element(
      "header",
      { className: "kl-dialog-header" },
      title,
      close,
    );

    this.#newChatQuery.type = "search";
    this.#newChatQuery.placeholder = "Search name or enter member number";
    this.#newChatQuery.autocomplete = "off";
    this.#newChatQuery.addEventListener("input", () => this.#renderKnownContacts());
    this.#newChatQuery.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      void this.#submitNewChat();
    });
    this.#newChatFilterSelect.replaceChildren(
      selectOption("all", "All contacts"),
      selectOption("online", "Online only"),
      selectOption("room", "In this room"),
    );
    this.#newChatFilterSelect.value = "all";
    this.#newChatFilterSelect.addEventListener("change", () => this.#renderKnownContacts());
    this.#newChatSortSelect.replaceChildren(
      selectOption("online", "Online first"),
      selectOption("alphabetical", "A–Z"),
    );
    this.#newChatSortSelect.value = "online";
    this.#newChatSortSelect.addEventListener("change", () => this.#renderKnownContacts());

    const body = element(
      "div",
      { className: "kl-dialog-body kl-new-chat-body" },
      this.#newChatQuery,
      element(
        "div",
        { className: "kl-contact-toolbar" },
        element("div", { className: "kl-contact-heading", text: "Known contacts" }),
        element(
          "div",
          { className: "kl-contact-controls" },
          this.#newChatFilterSelect,
          this.#newChatSortSelect,
        ),
      ),
      this.#newChatResults,
    );
    const open = element("button", {
      className: "kl-text-button kl-text-button--primary",
      type: "button",
      text: "Open chat",
      onClick: () => void this.#submitNewChat(),
    });
    const cancel = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Cancel",
      onClick: () => this.#newChatDialog.close(),
    });
    this.#newChatDialog.append(
      header,
      body,
      element("footer", { className: "kl-dialog-actions" }, cancel, open),
    );
  }

  #buildFinderDialog(): void {
    const title = element("div", { className: "kl-dialog-title", text: "Find anything" });
    title.id = "kikilink-finder-title";
    this.#finderDialog.setAttribute("aria-labelledby", title.id);
    const close = element("button", {
      className: "kl-icon-button",
      type: "button",
      title: "Close",
      ariaLabel: "Close LinkFinder",
      onClick: () => this.#finderDialog.close(),
    });
    close.append(kikiIcon("close"));
    const header = element(
      "header",
      { className: "kl-dialog-header" },
      element(
        "div",
        { className: "kl-dialog-heading" },
        title,
        element("div", {
          className: "kl-dialog-subtitle",
          text: "Jump to a chat, player, activity, or setting.",
        }),
      ),
      close,
    );

    this.#finderResults.id = "kikilink-finder-results";
    this.#finderResults.setAttribute("role", "listbox");
    this.#finderResults.setAttribute("aria-label", "KikiLink search results");
    this.#finderQuery.type = "search";
    this.#finderQuery.placeholder = "Search chats, players, activities, settings…";
    this.#finderQuery.autocomplete = "off";
    this.#finderQuery.spellcheck = false;
    this.#finderQuery.setAttribute("role", "combobox");
    this.#finderQuery.setAttribute("aria-label", "Find anything in KikiLink");
    this.#finderQuery.setAttribute("aria-autocomplete", "list");
    this.#finderQuery.setAttribute("aria-controls", this.#finderResults.id);
    this.#finderQuery.setAttribute("aria-expanded", "false");
    this.#finderQuery.addEventListener("input", () => this.#renderFinderResults());
    this.#finderQuery.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        this.#moveFinderSelection(event.key === "ArrowDown" ? 1 : -1);
        return;
      }
      if (event.key === "Enter" && this.#visibleFinderResults.length > 0) {
        event.preventDefault();
        void this.#chooseFinderResult(this.#finderSelectedIndex);
      }
    });

    this.#finderStatus.setAttribute("role", "status");
    this.#finderStatus.setAttribute("aria-live", "polite");
    this.#finderDialog.addEventListener("close", () => {
      this.#finderRenderToken += 1;
      this.#finderQuery.setAttribute("aria-expanded", "false");
      this.#finderQuery.removeAttribute("aria-activedescendant");
    });

    const searchIcon = kikiIcon("search", "kl-finder-search-icon");
    searchIcon.setAttribute("aria-hidden", "true");
    const body = element(
      "div",
      { className: "kl-finder-body" },
      element("div", { className: "kl-finder-input-wrap" }, searchIcon, this.#finderQuery),
      this.#finderStatus,
      this.#finderResults,
    );
    const footer = element(
      "footer",
      { className: "kl-finder-footer" },
      element("span", { text: "Results stay in this browser" }),
      element(
        "span",
        { className: "kl-finder-keys" },
        element("kbd", { text: "↑↓" }),
        " navigate ",
        element("kbd", { text: "Enter" }),
        " open ",
        element("kbd", { text: "Esc" }),
        " close",
      ),
    );
    this.#finderDialog.append(header, body, footer);
  }

  #buildPresenceDialog(): void {
    const title = element("div", { className: "kl-dialog-title", text: "Your KikiLink profile" });
    title.id = "kikilink-presence-title";
    this.#presenceDialog.setAttribute("aria-labelledby", title.id);
    const close = element("button", {
      className: "kl-icon-button",
      type: "button",
      title: "Close",
      ariaLabel: "Close status menu",
      onClick: () => this.#presenceDialog.close(),
    });
    close.append(kikiIcon("close"));
    const header = element(
      "header",
      { className: "kl-dialog-header" },
      element(
        "div",
        { className: "kl-dialog-heading" },
        title,
        element("div", {
          className: "kl-dialog-subtitle",
          text: "Avatar, status, quiet DND, and a bounded auto-reply in one place.",
        }),
      ),
      close,
    );

    this.#presenceEnabledToggle.type = "checkbox";
    this.#presenceEnabledToggle.setAttribute("aria-label", "Share KikiLink presence");
    this.#presenceEnabledToggle.addEventListener("change", () => this.#renderPresenceDialog());
    const presenceEnabledSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#presenceEnabledToggle,
      element("span", { className: "kl-switch-track" }),
    );

    for (const status of ["online", "idle", "dnd", "offline"] as const) {
      const option = element(
        "button",
        { className: "kl-presence-option", type: "button" },
        presenceDot(status),
        element(
          "span",
          { className: "kl-presence-option-copy" },
          element("span", { className: "kl-presence-option-title", text: presenceLabel(status) }),
          element("span", { className: "kl-presence-option-help", text: presenceHelp(status) }),
        ),
        element("span", { className: "kl-presence-option-check", text: "✓" }),
      );
      option.dataset.status = status;
      option.addEventListener("click", () => {
        this.presence.setOwnStatus(status);
        this.#renderOwnPresence();
        this.#renderPresenceDialog();
      });
      this.#presenceOptions.append(option);
    }

    this.#presenceMessage.type = "text";
    this.#presenceMessage.maxLength = 80;
    this.#presenceMessage.placeholder = "Optional: roleplaying, busy, open to chat…";
    this.#presenceMessage.autocomplete = "off";
    this.#autoIdleInput.type = "number";
    this.#autoIdleInput.min = "0";
    this.#autoIdleInput.max = "120";
    this.#autoIdleInput.step = "1";
    this.#autoIdleInput.setAttribute("aria-label", "Minutes before automatic Idle");

    this.#presenceAvatarUrl.type = "url";
    this.#presenceAvatarUrl.maxLength = 500;
    this.#presenceAvatarUrl.placeholder = "https://i.imgur.com/avatar.png";
    this.#presenceAvatarUrl.autocomplete = "off";
    this.#presenceAvatarUrl.spellcheck = false;
    this.#presenceAvatarUrl.setAttribute("aria-label", "Direct profile avatar URL");
    this.#presenceAvatarUrl.addEventListener("input", () => this.#renderOwnAvatarPreview());
    this.#presenceAvatarFrame.replaceChildren(
      selectOption("none", "None"),
      selectOption("blossom", "Blossom wreath"),
      selectOption("rose", "Rose ring"),
      selectOption("starlight", "Starlight halo"),
    );
    this.#presenceAvatarFrame.addEventListener("change", () => this.#renderOwnAvatarPreview());
    this.#presenceProfileStyle.replaceChildren(
      selectOption("classic", "Classic"),
      selectOption("garden", "Garden"),
      selectOption("midnight", "Midnight"),
    );

    this.#afkAutoReplyToggle.type = "checkbox";
    this.#afkAutoReplyToggle.setAttribute("aria-label", "Send an automatic reply while Idle or DND");
    this.#afkAutoReplyToggle.addEventListener("change", () => this.#renderPresenceDialog());
    const afkAutoReplySwitch = element(
      "label",
      { className: "kl-switch" },
      this.#afkAutoReplyToggle,
      element("span", { className: "kl-switch-track" }),
    );
    this.#afkAutoReplyMessage.maxLength = 500;
    this.#afkAutoReplyMessage.placeholder = "Hi, I'm AFK. Message me later!";
    this.#afkAutoReplyOptions.append(
      element("span", { className: "kl-custom-field-label", text: "AFK message" }),
      this.#afkAutoReplyMessage,
      element("span", {
        className: "kl-custom-field-help",
        text: "Sent privately at most once per person during each Idle or DND session; your room is never included.",
      }),
    );

    const body = element(
      "div",
      { className: "kl-dialog-body kl-presence-body" },
      this.#settingRow(
        "Share presence",
        "Answer compatible KikiLink status requests and announce inside your current room.",
        presenceEnabledSwitch,
      ),
      this.#presenceOptions,
      element(
        "label",
        { className: "kl-presence-field" },
        element("span", { className: "kl-presence-field-label", text: "Status note" }),
        this.#presenceMessage,
      ),
      element(
        "section",
        { className: "kl-profile-avatar-field" },
        this.#presenceAvatarPreview,
        element(
          "label",
          { className: "kl-presence-field" },
          element("span", { className: "kl-presence-field-label", text: "Profile avatar" }),
          this.#presenceAvatarUrl,
          element("span", {
            className: "kl-custom-field-help",
            text: "Use a direct HTTPS JPG, PNG, GIF, WebP, or AVIF link from a trusted host. Other players' avatars follow your image-preview privacy setting.",
          }),
        ),
      ),
      element(
        "div",
        { className: "kl-profile-style-fields" },
        element(
          "label",
          { className: "kl-presence-field" },
          element("span", { className: "kl-presence-field-label", text: "Avatar decoration" }),
          this.#presenceAvatarFrame,
        ),
        element(
          "label",
          { className: "kl-presence-field" },
          element("span", { className: "kl-presence-field-label", text: "Profile card" }),
          this.#presenceProfileStyle,
        ),
      ),
      this.#settingRow(
        "Automatic Idle",
        "Minutes without a tap or keypress. Enter 0 to disable; maximum 120.",
        element("label", {}, this.#autoIdleInput, " min"),
      ),
      this.#settingRow(
        "Reply while Idle / DND",
        "Privately answer new Beeps while you are Idle or in Do not disturb.",
        afkAutoReplySwitch,
      ),
      this.#afkAutoReplyOptions,
      element(
        "div",
        { className: "kl-presence-caveat" },
        kikiIcon("lock"),
        "Appear Offline changes KikiLink only. Bondage Club can still show your native online state.",
      ),
    );
    const save = element("button", {
      className: "kl-text-button kl-text-button--primary",
      type: "button",
      text: "Save profile",
      onClick: () => this.#savePresencePreferences(),
    });
    this.#presenceDialog.append(
      header,
      body,
      element(
        "footer",
        { className: "kl-dialog-actions" },
        element("button", {
          className: "kl-text-button",
          type: "button",
          text: "Close",
          onClick: () => this.#presenceDialog.close(),
        }),
        save,
      ),
    );
  }

  #buildAddonProfileDialog(): void {
    const title = element("div", { className: "kl-dialog-title", text: "KikiLink profile" });
    title.id = "kikilink-addon-profile-title";
    this.#addonProfileDialog.setAttribute("aria-labelledby", title.id);
    const close = (): void => this.#addonProfileDialog.close();
    this.#addonProfileDialog.append(
      element(
        "header",
        { className: "kl-dialog-header kl-addon-profile-dialog-header" },
        element(
          "div",
          { className: "kl-dialog-heading" },
          title,
          element("div", {
            className: "kl-dialog-subtitle",
            text: "Voluntary addon profile plus facts visible to your Bondage Club account.",
          }),
        ),
        this.#dialogCloseButton("Close KikiLink profile", close),
      ),
      this.#addonProfileBody,
    );
    this.#addonProfileDialog.addEventListener("close", () => {
      this.#cancelRemoteImageLoadsWithin(this.#addonProfileBody);
      this.#addonProfileBody.replaceChildren();
      this.#addonProfileTarget = undefined;
      this.#addonProfileToken += 1;
      this.#addonProfileOpenToken += 1;
      this.#addonProfilePresenceSignature = "";
      const returnFocus = this.#addonProfileReturnFocus;
      this.#addonProfileReturnFocus = undefined;
      if (returnFocus?.isConnected) returnFocus.focus();
    });
  }

  async #openAddonProfile(
    memberNumber: number,
    displayName: string,
    returnFocus?: HTMLElement,
  ): Promise<void> {
    if (
      !Number.isSafeInteger(memberNumber) ||
      memberNumber < 0 ||
      !this.#mounted ||
      this.#panel.hidden
    ) {
      return;
    }
    const operation = ++this.#addonProfileOpenToken;
    this.#addonProfileToken += 1;
    const active = this.#shadow.activeElement;
    this.#addonProfileReturnFocus =
      returnFocus?.isConnected === true
        ? returnFocus
        : active instanceof HTMLElement
          ? active
          : undefined;
    this.#addonProfileTarget = undefined;
    this.#addonProfilePresenceSignature = "";
    this.#addonProfileBody.replaceChildren(
      element("div", {
        className: "kl-addon-profile-loading",
        text: "Checking KikiLink profile…",
      }),
    );
    if (!this.#addonProfileDialog.open) {
      try {
        this.#addonProfileDialog.showModal();
      } catch {
        if (!this.#addonProfileDialog.isConnected) return;
        this.#addonProfileDialog.setAttribute("open", "");
      }
    }

    let own = false;
    try {
      own = memberNumber === this.adapter.getOwnMemberNumber();
    } catch {
      // Discovery below remains fail-closed when a native wrapper is temporarily guarded.
    }
    if (!own) {
      try {
        // A capability or typing packet proves the addon exists but carries no optional profile.
        // Refresh on every explicit open so a compatible card can populate or replace stale data.
        this.presence.request(memberNumber, true);
      } catch {
        // Compatibility below still decides whether the reduced profile card may open.
      }
    }
    let compatible = own;
    try {
      compatible ||= this.presence.hasCompatiblePeer(memberNumber);
    } catch {
      // Wait below remains fail-closed.
    }
    if (!compatible) compatible = await this.#waitForAddonProfilePeer(memberNumber, operation);
    if (
      operation !== this.#addonProfileOpenToken ||
      !this.#mounted ||
      this.#panel.hidden ||
      !this.#addonProfileDialog.open
    ) {
      return;
    }
    if (!compatible) {
      this.#addonProfileDialog.close();
      if (this.#mounted) this.#toast("KikiLink is not detected for this player yet.", "error");
      return;
    }

    this.#addonProfileTarget = { memberNumber, displayName };
    await this.#renderAddonProfile();
    if (
      operation !== this.#addonProfileOpenToken ||
      !this.#mounted ||
      this.#panel.hidden ||
      !this.#addonProfileDialog.open ||
      this.#addonProfileTarget?.memberNumber !== memberNumber
    ) {
      return;
    }
    this.#addonProfileDialog
      .querySelector<HTMLButtonElement>(".kl-addon-profile-action--primary")
      ?.focus();
  }

  #waitForAddonProfilePeer(memberNumber: number, operation: number): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (value: boolean): void => {
        if (settled) return;
        settled = true;
        if (timer !== undefined) clearTimeout(timer);
        unsubscribe();
        resolve(value);
      };
      const detected = (): boolean => {
        if (
          operation !== this.#addonProfileOpenToken ||
          !this.#mounted ||
          this.#panel.hidden
        ) {
          return false;
        }
        try {
          return this.presence.hasCompatiblePeer(memberNumber);
        } catch {
          return false;
        }
      };
      const unsubscribe = this.presence.subscribe((changedMember) => {
        if (changedMember !== undefined && changedMember !== memberNumber) return;
        if (detected()) finish(true);
      });
      if (detected()) {
        finish(true);
        return;
      }
      timer = setTimeout(() => finish(detected()), 1_600);
    });
  }

  async #renderAddonProfile(): Promise<void> {
    const target = this.#addonProfileTarget;
    if (!target) return;
    const token = ++this.#addonProfileToken;
    let conversation: ConversationMeta | undefined;
    try {
      conversation = await this.service.getConversation(target.memberNumber);
    } catch {
      if (
        token === this.#addonProfileToken &&
        this.#mounted &&
        this.#addonProfileTarget?.memberNumber === target.memberNumber
      ) {
        if (this.#addonProfileDialog.open) this.#addonProfileDialog.close();
        this.#toast("This KikiLink profile could not be read right now.", "error");
      }
      return;
    }
    if (token !== this.#addonProfileToken || this.#addonProfileTarget?.memberNumber !== target.memberNumber) {
      return;
    }
    let adapterName = `Member ${target.memberNumber}`;
    try {
      adapterName = this.adapter.getMemberName(target.memberNumber);
    } catch {
      // The known conversation/display name below still keeps the profile usable.
    }
    const nativeName = conversation?.peerName || target.displayName || adapterName;
    const shownName = conversation ? conversationDisplayName(conversation) : nativeName;
    const snapshot = this.presence.get(target.memberNumber);
    this.#addonProfilePresenceSignature = profilePresenceSignature(snapshot);
    const notebook = this.roster.get(target.memberNumber, nativeName);
    let relationships: PlayerRelationship[] = [];
    let inRoom = false;
    let isFriend = false;
    let currentRoomName = "";
    try {
      relationships = typeof this.adapter.getPlayerRelationships === "function"
        ? this.adapter.getPlayerRelationships(target.memberNumber)
        : [];
    } catch {
      // BC can replace guarded cross-realm character objects while the dialog is open.
    }
    try {
      inRoom = typeof this.adapter.isMemberInCurrentRoom === "function"
        ? this.adapter.isMemberInCurrentRoom(target.memberNumber)
        : false;
      if (inRoom && typeof this.adapter.getCurrentRoomName === "function") {
        currentRoomName = this.adapter.getCurrentRoomName() ?? "";
      }
    } catch {
      // Keep the profile useful without claiming that the player is still in the room.
    }
    try {
      isFriend = typeof this.adapter.isKnownFriend === "function"
        ? this.adapter.isKnownFriend(target.memberNumber)
        : false;
    } catch {
      // Friend state is native-observable and may briefly be unavailable during a BC refresh.
    }
    const style = snapshot.profileStyle ?? "classic";
    const frame = snapshot.avatarFrame ?? "none";

    const avatar = element("div", { className: "kl-avatar kl-addon-profile-avatar" });
    avatar.dataset.avatarFrame = frame;
    this.#renderAvatar(avatar, shownName, target.memberNumber);
    const avatarShell = element(
      "div",
      { className: "kl-addon-profile-avatar-shell" },
      avatar,
      presenceDot(snapshot.status),
    );
    avatarShell.dataset.frame = frame;

    const publicBadges = element("div", { className: "kl-addon-profile-badges" });
    publicBadges.append(element("span", { className: "kl-addon-profile-badge", text: "KIKILINK" }));
    if (isFriend) publicBadges.append(element("span", { className: "kl-addon-profile-badge", text: "FRIEND" }));
    for (const relationship of relationships) {
      publicBadges.append(
        element("span", {
          className: `kl-addon-profile-badge kl-addon-profile-badge--${relationship}`,
          text: rosterRelationshipLabel(relationship).toUpperCase(),
          title: rosterRelationshipDescription(relationship),
        }),
      );
    }

    const avatarPolicy = this.settings.get().linkChat.imagePreviews;
    const avatarRevealed = Boolean(
      snapshot.avatarUrl &&
      this.#revealedAvatarUrls.has(avatarRevealKey(target.memberNumber, snapshot.avatarUrl)),
    );
    const hiddenAvatar = Boolean(snapshot.avatarUrl) &&
      (avatarPolicy === "never" || (avatarPolicy === "ask" && !avatarRevealed));
    const avatarControl = hiddenAvatar && avatarPolicy === "ask"
      ? element("button", {
          className: "kl-text-button kl-addon-profile-show-avatar",
          type: "button",
          text: "Show profile avatar",
          onClick: () => {
            if (snapshot.avatarUrl) {
              this.#rememberRevealedAvatar(target.memberNumber, snapshot.avatarUrl);
            }
            this.#schedulePresenceRender(target.memberNumber);
            void this.#renderAddonProfile();
          },
        })
      : hiddenAvatar && avatarPolicy === "never"
        ? element("span", {
            className: "kl-addon-profile-avatar-note",
            text: "Avatar hidden by Links only privacy setting",
          })
        : null;

    const statusLine = element(
      "div",
      { className: "kl-addon-profile-status", title: presenceDescription(snapshot) },
      presenceDot(snapshot.status),
      element("strong", { text: presenceLabel(snapshot.status) }),
      snapshot.statusMessage
        ? element("span", { className: "kl-addon-profile-custom-status", text: snapshot.statusMessage })
        : null,
    );
    statusLine.dataset.presenceDescription = "true";
    const hero = element(
      "section",
      { className: "kl-addon-profile-hero" },
      element("div", { className: "kl-addon-profile-banner" }),
      avatarShell,
      element(
        "div",
        { className: "kl-addon-profile-identity" },
        element("h2", { text: shownName }),
        conversation?.localAlias
          ? element("p", { className: "kl-addon-profile-native-name", text: `Bondage Club name · ${nativeName}` })
          : null,
        element("p", { className: "kl-addon-profile-member", text: `Member #${target.memberNumber}` }),
        publicBadges,
        statusLine,
        avatarControl,
      ),
    );

    const facts = element(
      "div",
      { className: "kl-addon-profile-facts" },
      this.#addonProfileFact("Current room", snapshot.roomName || (inRoom ? currentRoomName || "Current room" : "Unavailable")),
      this.#addonProfileFact("KikiLink", snapshot.addonVersion ? `v${snapshot.addonVersion}` : "Detected"),
      this.#addonProfileFact("Last seen", inRoom ? "Now" : notebook.lastSeenAt ? formatFullSeenTime(notebook.lastSeenAt) : "Not recorded"),
    );

    const privateSection = element(
      "section",
      { className: "kl-addon-profile-private" },
      element(
        "div",
        { className: "kl-addon-profile-section-title" },
        kikiIcon("lock"),
        element("strong", { text: "Only visible to you" }),
      ),
      element("p", {
        text: `Private note · ${notebook.note || "No private note saved"}`,
      }),
      element("p", {
        text: `Private tags · ${notebook.tags.length > 0 ? notebook.tags.join(" · ") : "No private tags saved"}`,
      }),
      element("p", {
        text: `Last recorded room · ${notebook.lastRoomName || "Not recorded"}`,
      }),
      element("p", {
        text: `Encounter count · ${notebook.encounterCount ? notebook.encounterCount.toString() : "Not recorded"}`,
      }),
    );

    const message = element("button", {
      className: "kl-text-button kl-text-button--primary kl-addon-profile-action kl-addon-profile-action--primary",
      type: "button",
      text: "Message",
      onClick: () => {
        this.#addonProfileDialog.close();
        this.#runPlayerAction(
          () => this.openChat(target.memberNumber, nativeName),
          "LinkChat could not be opened.",
        );
      },
    });
    const whisper = element("button", {
      className: "kl-text-button kl-addon-profile-action",
      type: "button",
      text: "Whisper",
      onClick: () => {
        try {
          this.adapter.startWhisper(target.memberNumber);
          this.#addonProfileDialog.close();
          this.close();
        } catch (error) {
          this.#toast(error instanceof Error ? error.message : "Unable to start Whisper", "error");
        }
      },
    });
    whisper.disabled = !inRoom;
    const nativeProfile = element("button", {
      className: "kl-text-button kl-addon-profile-action",
      type: "button",
      text: "Native profile",
      onClick: () => {
        try {
          this.adapter.openProfile(target.memberNumber);
          this.#addonProfileDialog.close();
          this.close();
        } catch (error) {
          this.#toast(error instanceof Error ? error.message : "Unable to open profile", "error");
        }
      },
    });
    nativeProfile.disabled = !inRoom;
    const favorite = element("button", {
      className: "kl-text-button kl-addon-profile-action",
      type: "button",
      text: notebook.favorite ? "Unfavorite" : "Favorite",
      onClick: () => {
        this.roster.toggleFavorite(target.memberNumber, nativeName);
        void this.#renderAddonProfile();
        this.#renderRoster();
      },
    });
    const note = element("button", {
      className: "kl-text-button kl-addon-profile-action",
      type: "button",
      text: "Private note",
      onClick: () => {
        this.#addonProfileDialog.close();
        this.#openRoster(target.memberNumber);
      },
    });

    const card = element(
      "article",
      { className: "kl-addon-profile-card" },
      hero,
      facts,
      privateSection,
      element("div", { className: "kl-addon-profile-actions" }, message, whisper, nativeProfile, favorite, note),
    );
    card.dataset.profileStyle = style;
    card.dataset.memberNumber = target.memberNumber.toString();
    this.#addonProfileBody.replaceChildren(card);
  }

  #addonProfileFact(label: string, value: string): HTMLDivElement {
    return element(
      "div",
      { className: "kl-addon-profile-fact" },
      element("span", { text: label }),
      element("strong", { text: value }),
    );
  }

  #openPresenceDialog(): void {
    const config = this.settings.get().linkPresence;
    this.#presenceEnabledToggle.checked = config.enabled;
    this.#presenceMessage.value = config.statusMessage;
    this.#presenceAvatarUrl.value = config.avatarUrl;
    this.#presenceAvatarFrame.value = config.avatarFrame;
    this.#presenceProfileStyle.value = config.profileStyle;
    this.#autoIdleInput.value = config.autoIdleMinutes.toString();
    this.#afkAutoReplyToggle.checked = config.afkAutoReply.enabled;
    this.#afkAutoReplyMessage.value = config.afkAutoReply.message;
    this.#renderOwnAvatarPreview();
    this.#renderPresenceDialog();
    if (!this.#presenceDialog.open) this.#presenceDialog.showModal();
    this.#presenceOptions.querySelector<HTMLButtonElement>('[data-active="true"]')?.focus();
  }

  #renderPresenceDialog(): void {
    const selected = this.settings.get().linkPresence.status;
    const enabled = this.#presenceEnabledToggle.checked;
    for (const option of this.#presenceOptions.querySelectorAll<HTMLButtonElement>(
      ".kl-presence-option",
    )) {
      const active = option.dataset.status === selected;
      option.dataset.active = String(active);
      option.setAttribute("aria-pressed", String(active));
      option.disabled = !enabled;
    }
    this.#presenceMessage.disabled = !enabled;
    this.#afkAutoReplyMessage.disabled = !this.#afkAutoReplyToggle.checked;
    this.#afkAutoReplyOptions.dataset.disabled = String(!this.#afkAutoReplyToggle.checked);
  }

  #savePresencePreferences(): void {
    const autoIdle = Number(this.#autoIdleInput.value);
    const normalizedAvatarUrl = this.#presenceAvatarUrl.value.trim()
      ? normalizeImageUrl(this.#presenceAvatarUrl.value)
      : null;
    if (
      this.#presenceAvatarUrl.value.trim() &&
      (!normalizedAvatarUrl || normalizedAvatarUrl.length > 500)
    ) {
      this.#presenceAvatarUrl.focus();
      this.#toast("Use a direct HTTPS avatar link up to 500 characters ending in an image extension.", "error");
      return;
    }
    const avatarUrl = normalizedAvatarUrl ?? "";
    if (
      !Number.isInteger(autoIdle) ||
      autoIdle < 0 ||
      autoIdle > 120
    ) {
      this.#autoIdleInput.focus();
      this.#toast("Automatic Idle must be between 0 and 120 minutes.", "error");
      return;
    }
    if (this.#afkAutoReplyToggle.checked && !this.#afkAutoReplyMessage.value.trim()) {
      this.#afkAutoReplyMessage.focus();
      this.#toast("Add a short AFK auto-reply message.", "error");
      return;
    }
    this.presence.setOwnProfile({
      enabled: this.#presenceEnabledToggle.checked,
      statusMessage: this.#presenceMessage.value,
      avatarUrl,
      avatarFrame: this.#presenceAvatarFrame.value as AvatarFrame,
      profileStyle: this.#presenceProfileStyle.value as ProfileCardStyle,
      autoIdleMinutes: autoIdle,
      afkAutoReply: {
        enabled: this.#afkAutoReplyToggle.checked,
        message: this.#afkAutoReplyMessage.value,
      },
    });
    this.#renderOwnPresence();
    this.#presenceDialog.close();
    this.#toast("KikiLink profile saved.");
  }

  #buildImageDialog(): void {
    this.#imageDialogTitle.textContent = "Send an image";
    this.#imageDialogTitle.id = "kikilink-image-title";
    this.#imageDialog.setAttribute("aria-labelledby", this.#imageDialogTitle.id);
    const header = element(
      "header",
      { className: "kl-dialog-header" },
      element(
        "div",
        { className: "kl-dialog-heading" },
        this.#imageDialogTitle,
        this.#imageDialogSubtitle,
      ),
      this.#dialogCloseButton("Close image sender", () => this.#requestCloseImageDialog()),
    );
    this.#imageUrlInput.type = "url";
    this.#imageUrlInput.maxLength = 900;
    this.#imageUrlInput.placeholder = "https://example.com/image.webp";
    this.#imageUrlInput.autocomplete = "off";
    this.#imageUrlInput.spellcheck = false;
    this.#imageUrlInput.addEventListener("input", () => this.#renderImageComposePreview());
    this.#imageUrlInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      void this.#sendImage();
    });
    this.#imageLinkTab.id = "kikilink-image-source-link";
    this.#imageLinkTab.setAttribute("role", "tab");
    this.#imageLinkTab.setAttribute("aria-controls", "kikilink-image-link-panel");
    this.#imageLinkTab.addEventListener("click", () => this.#setImageSourceMode("link"));
    this.#imageLinkTab.addEventListener("keydown", (event) =>
      this.#handleImageSourceTabKey(event),
    );
    this.#imageFileTab.id = "kikilink-image-source-file";
    this.#imageFileTab.setAttribute("role", "tab");
    this.#imageFileTab.setAttribute("aria-controls", "kikilink-image-file-panel");
    this.#imageFileTab.addEventListener("click", () => this.#setImageSourceMode("file"));
    this.#imageFileTab.addEventListener("keydown", (event) =>
      this.#handleImageSourceTabKey(event),
    );
    this.#imageLinkPanel.id = "kikilink-image-link-panel";
    this.#imageLinkPanel.setAttribute("role", "tabpanel");
    this.#imageLinkPanel.setAttribute("aria-labelledby", this.#imageLinkTab.id);
    this.#imageLinkPanel.append(
      element(
        "label",
        { className: "kl-presence-field" },
        element("span", { className: "kl-presence-field-label", text: "Direct HTTPS image link" }),
        this.#imageUrlInput,
      ),
      this.#imagePreview,
      element("p", {
        className: "kl-image-upload-note",
        text: "Supported links: JPG, PNG, GIF, WebP, and AVIF.",
      }),
    );
    this.#imageFilePanel.id = "kikilink-image-file-panel";
    this.#imageFilePanel.setAttribute("role", "tabpanel");
    this.#imageFilePanel.setAttribute("aria-labelledby", this.#imageFileTab.id);
    this.#imageFileInput.type = "file";
    this.#imageFileInput.accept = "image/jpeg,image/png,image/webp";
    this.#imageFileInput.hidden = true;
    this.#imageFileInput.addEventListener("change", () => {
      const file = this.#imageFileInput.files?.[0];
      if (file) void this.#prepareLocalImage(file);
    });
    this.#chooseImageFileButton.addEventListener("click", () => this.#imageFileInput.click());
    this.#galleryRetentionSelect.replaceChildren(
      selectOption("1h", "1 hour"),
      selectOption("12h", "12 hours"),
      selectOption("24h", "24 hours"),
      selectOption("72h", "72 hours"),
    );
    this.#galleryRetentionSelect.value = this.settings.get().linkChat.imageUploads.retention;
    this.#galleryRetentionSelect.addEventListener("change", () =>
      this.#renderLocalImageComposeState());
    this.#galleryRetentionField.append(
      element("span", { text: "Litterbox lifetime" }),
      this.#galleryRetentionSelect,
    );
    const galleryStorageChoices = ([
      ["device", "lock", "This device", "Private · stays until you delete it"],
      ["catbox", "star", "Catbox", "Public link · no automatic expiry"],
      ["litterbox", "status", "Litterbox", "Public link · expires automatically"],
    ] as const).map(([storage, icon, title, description]) => {
      const input = element("input") as HTMLInputElement;
      input.type = "radio";
      input.name = "kikilink-gallery-storage";
      input.value = storage;
      input.checked = storage === "device";
      input.addEventListener("change", () => {
        if (input.checked) this.#setGalleryFileStorage(storage);
      });
      const choice = element(
        "label",
        { className: "kl-gallery-storage-choice" },
        input,
        element("span", { className: "kl-gallery-storage-icon" }, kikiIcon(icon)),
        element(
          "span",
          { className: "kl-gallery-storage-copy" },
          element("strong", { text: title }),
          element("small", { text: description }),
        ),
      );
      choice.dataset.storage = storage;
      return choice;
    });
    this.#galleryStorageOptions.append(
      element("legend", { text: "Store this Gallery image" }),
      ...galleryStorageChoices,
      this.#galleryRetentionField,
    );
    this.#galleryStorageOptions.hidden = true;
    this.#imageFilePrivacyIcon.append(kikiIcon("lock"));
    const setupUploads = element("button", {
      className: "kl-text-button kl-image-upload-setup",
      type: "button",
      text: "Set up local uploads",
      onClick: () => {
        this.#imageDialog.close();
        this.#openSettings("chat");
        this.#imageUploadsToggle.focus();
      },
    });
    this.#imageFilePanel.append(
      this.#localImageStatus,
      element(
        "div",
        { className: "kl-image-file-actions" },
        this.#chooseImageFileButton,
        setupUploads,
        this.#imageFileInput,
      ),
      this.#galleryStorageOptions,
      element(
        "p",
        { className: "kl-image-upload-note kl-image-file-privacy" },
        this.#imageFilePrivacyIcon,
        this.#imageFilePrivacyText,
      ),
    );
    const sourceTabs = element(
      "div",
      { className: "kl-image-source-tabs" },
      this.#imageLinkTab,
      this.#imageFileTab,
    );
    sourceTabs.setAttribute("role", "tablist");
    sourceTabs.setAttribute("aria-label", "Image source");
    const body = element(
      "div",
      { className: "kl-dialog-body kl-image-body" },
      sourceTabs,
      this.#imageLinkPanel,
      this.#imageFilePanel,
    );
    this.#sendImageButton.addEventListener("click", () => void this.#sendImage());
    this.#imageDialog.addEventListener("cancel", (event) => {
      if (this.#imageUploadBusy) event.preventDefault();
    });
    this.#imageDialog.addEventListener("close", () => {
      if (!this.#imageUploadBusy) this.#resetLocalImage();
    });
    this.#imageDialog.append(
      header,
      body,
      element(
        "footer",
        { className: "kl-dialog-actions" },
        element("button", {
          className: "kl-text-button",
          type: "button",
          text: "Cancel",
          onClick: () => this.#requestCloseImageDialog(),
        }),
        this.#sendImageButton,
      ),
    );
  }

  #buildAliasDialog(): void {
    const title = element("div", { className: "kl-dialog-title", text: "Local nickname" });
    title.id = "kikilink-alias-title";
    this.#aliasDialog.setAttribute("aria-labelledby", title.id);
    this.#aliasInput.type = "text";
    this.#aliasInput.maxLength = 40;
    this.#aliasInput.autocomplete = "off";
    this.#aliasInput.spellcheck = false;
    this.#aliasInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.isComposing) return;
      event.preventDefault();
      void this.#saveLocalAlias(this.#aliasInput.value);
    });
    this.#saveAliasButton.addEventListener("click", () =>
      void this.#saveLocalAlias(this.#aliasInput.value),
    );
    this.#clearAliasButton.addEventListener("click", () => void this.#saveLocalAlias(""));
    this.#aliasDialog.addEventListener("close", () => {
      this.#aliasTarget = undefined;
    });
    this.#aliasDialog.append(
      element(
        "header",
        { className: "kl-dialog-header" },
        element(
          "div",
          { className: "kl-dialog-heading" },
          title,
          element("div", {
            className: "kl-dialog-subtitle",
            text: "A private label for this KikiLink chat. It is never sent to anyone.",
          }),
        ),
        this.#dialogCloseButton("Close local nickname", () => this.#aliasDialog.close()),
      ),
      element(
        "div",
        { className: "kl-dialog-body kl-alias-body" },
        element(
          "label",
          { className: "kl-presence-field" },
          element("span", { className: "kl-presence-field-label", text: "Nickname you will see" }),
          this.#aliasInput,
        ),
        element(
          "p",
          { className: "kl-local-only-note" },
          kikiIcon("lock"),
          element("span", {
            text: "Bondage Club names, outgoing messages, and the other player's addon stay unchanged.",
          }),
        ),
      ),
      element(
        "footer",
        { className: "kl-dialog-actions kl-alias-actions" },
        this.#clearAliasButton,
        element("span", { className: "kl-dialog-actions-spacer" }),
        element("button", {
          className: "kl-text-button",
          type: "button",
          text: "Cancel",
          onClick: () => this.#aliasDialog.close(),
        }),
        this.#saveAliasButton,
      ),
    );
  }

  #buildRemoveChatDialog(): void {
    const title = element("div", { className: "kl-dialog-title", text: "Remove recent chat?" });
    title.id = "kikilink-remove-chat-title";
    this.#removeChatDialog.setAttribute("aria-labelledby", title.id);
    this.#removeChatDialog.addEventListener("close", () => {
      this.#removeChatTarget = undefined;
    });
    this.#removeChatButton.addEventListener("click", () => void this.#confirmRemoveChat());
    this.#removeChatDialog.append(
      element(
        "header",
        { className: "kl-dialog-header" },
        element("div", { className: "kl-dialog-heading" }, title),
        this.#dialogCloseButton("Close remove chat confirmation", () =>
          this.#removeChatDialog.close(),
        ),
      ),
      element(
        "div",
        { className: "kl-dialog-body kl-remove-chat-body" },
        element("div", { className: "kl-remove-chat-icon" }, kikiIcon("trash")),
        element(
          "p",
          {},
          "Remove ",
          this.#removeChatName,
          " from KikiLink recent chats and delete this chat's account-scoped KikiLink history?",
        ),
        element("p", {
          className: "kl-remove-chat-safe",
          text: "This does not unfriend them and does not change Bondage Club's native Beep log.",
        }),
      ),
      element(
        "footer",
        { className: "kl-dialog-actions" },
        element("button", {
          className: "kl-text-button",
          type: "button",
          text: "Keep chat",
          onClick: () => this.#removeChatDialog.close(),
        }),
        this.#removeChatButton,
      ),
    );
  }

  #openAliasDialog(conversation: ConversationMeta): void {
    this.#aliasTarget = {
      memberNumber: conversation.peerNumber,
      nativeName: conversation.peerName,
    };
    this.#aliasInput.value = conversation.localAlias ?? "";
    this.#aliasInput.placeholder = conversation.peerName;
    this.#clearAliasButton.hidden = !conversation.localAlias;
    if (!this.#aliasDialog.open) this.#aliasDialog.showModal();
    this.#aliasInput.focus();
    this.#aliasInput.select();
  }

  async #saveLocalAlias(value: string): Promise<void> {
    const target = this.#aliasTarget;
    if (!target) return;
    const alias = await this.service.setLocalAlias(target.memberNumber, value);
    const conversation = await this.service.getConversation(target.memberNumber);
    if (!conversation) {
      this.#aliasDialog.close();
      return;
    }
    if (target.memberNumber === this.#activePeer) {
      const displayName = conversationDisplayName(conversation);
      this.#activeName = displayName;
      this.#activeNativeName = conversation.peerName;
      this.#chatName.textContent = displayName;
      this.#renderAvatar(this.#chatAvatar, displayName, target.memberNumber);
      this.#renderTypingIndicator();
    }
    this.#aliasDialog.close();
    await this.refresh();
    this.#toast(alias ? `Local nickname set to ${alias}.` : "Using the native nickname again.");
  }

  #openRemoveChatDialog(memberNumber: number, displayName: string): void {
    this.#removeChatTarget = { memberNumber, displayName };
    this.#removeChatName.textContent = displayName;
    if (!this.#removeChatDialog.open) this.#removeChatDialog.showModal();
    this.#removeChatButton.focus();
  }

  async #confirmRemoveChat(): Promise<void> {
    const target = this.#removeChatTarget;
    if (!target) return;
    if (target.memberNumber === this.#activePeer) this.#saveDraft.cancel();
    await this.service.removeConversation(target.memberNumber);
    if (target.memberNumber === this.#activePeer) this.#resetActiveConversation();
    this.#removeChatDialog.close();
    await this.refresh();
    this.#toast(`${target.displayName} removed from recent chats.`);
  }

  #openImageDialog(destination: "chat" | "gallery" = "chat"): void {
    if (destination === "chat" && this.#activePeer === undefined) {
      this.#toast("Choose a conversation first.", "error");
      return;
    }
    this.#imageDestination = destination;
    this.#imageDialogTitle.textContent = destination === "gallery" ? "Add to Gallery" : "Send an image";
    this.#imageDialogSubtitle.textContent = destination === "gallery"
      ? "Save a direct link, keep a prepared file private, or upload it to Catbox/Litterbox."
      : "A normal Beep link for everyone; an inline preview for KikiLink.";
    this.#galleryStorageOptions.hidden = destination !== "gallery";
    this.#setGalleryFileStorage("device");
    this.#resetLocalImage();
    this.#imageUrlInput.value = "";
    this.#renderImageComposePreview();
    this.#setImageSourceMode("link");
    if (!this.#imageDialog.open) this.#imageDialog.showModal();
    this.#imageUrlInput.focus();
  }

  #setImageSourceMode(mode: "link" | "file"): void {
    this.#imageSourceMode = mode;
    const linkActive = mode === "link";
    this.#imageLinkPanel.hidden = !linkActive;
    this.#imageFilePanel.hidden = linkActive;
    this.#imageLinkTab.dataset.active = String(linkActive);
    this.#imageFileTab.dataset.active = String(!linkActive);
    this.#imageLinkTab.setAttribute("aria-selected", String(linkActive));
    this.#imageFileTab.setAttribute("aria-selected", String(!linkActive));
    this.#imageLinkTab.tabIndex = linkActive ? 0 : -1;
    this.#imageFileTab.tabIndex = linkActive ? -1 : 0;
    if (linkActive) this.#renderImageComposePreview();
    else this.#renderLocalImageComposeState();
  }

  #setGalleryFileStorage(storage: GalleryFileStorage): void {
    this.#galleryFileStorage = storage;
    for (const input of this.#galleryStorageOptions.querySelectorAll<HTMLInputElement>(
      "input[type='radio']",
    )) {
      input.checked = input.value === storage;
      input.closest<HTMLElement>(".kl-gallery-storage-choice")!.dataset.active = String(input.checked);
    }
    this.#galleryRetentionField.hidden = storage !== "litterbox";
    this.#imageFilePrivacyIcon.replaceChildren(
      kikiIcon(this.#imageDestination !== "gallery" || storage === "device" ? "lock" : "external"),
    );
    this.#imageFilePrivacyText.textContent =
      this.#imageDestination !== "gallery"
        ? "Nothing uploads on selection. KikiLink removes the filename and metadata first; only Upload & send creates an expiring Litterbox link."
        : storage === "device"
          ? "Nothing uploads. The prepared image stays privately in this browser until you delete it."
          : storage === "catbox"
            ? "Nothing uploads on selection. Saving creates a public Catbox link without an automatic expiry."
            : "Nothing uploads on selection. Saving creates a public Litterbox link for the lifetime you choose.";
    if (this.#imageSourceMode === "file") this.#renderLocalImageComposeState();
  }

  #handleImageSourceTabKey(event: KeyboardEvent): void {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const mode = event.key === "ArrowLeft" || event.key === "Home" ? "link" : "file";
    this.#setImageSourceMode(mode);
    (mode === "link" ? this.#imageLinkTab : this.#imageFileTab).focus();
  }

  #renderImageComposePreview(): void {
    const url = normalizeImageUrl(this.#imageUrlInput.value);
    if (this.#imageSourceMode === "link") {
      this.#sendImageButton.textContent = this.#imageDestination === "gallery" ? "Save to Gallery" : "Send image";
      this.#sendImageButton.disabled = !url;
    }
    if (!this.#imageUrlInput.value.trim()) {
      this.#imagePreview.replaceChildren(
        element("span", { className: "kl-image-compose-icon" }, kikiIcon("image")),
        element("span", { text: "Paste a direct image link to check it." }),
      );
      this.#imagePreview.dataset.state = "empty";
      return;
    }
    if (!url) {
      this.#imagePreview.replaceChildren(
        element("span", { className: "kl-image-compose-icon" }, kikiIcon("warning")),
        element("span", { text: "Use a direct HTTPS link ending in a supported image extension." }),
      );
      this.#imagePreview.dataset.state = "error";
      return;
    }
    const parsed = new URL(url);
    this.#imagePreview.replaceChildren(
      element("span", { className: "kl-image-compose-icon" }, kikiIcon("check")),
      element(
        "span",
        {},
        element("strong", { text: this.#imageDestination === "gallery" ? "Ready to save" : "Ready to send" }),
        element("small", { text: `${parsed.hostname}${parsed.pathname}` }),
      ),
    );
    this.#imagePreview.dataset.state = "ready";
  }

  #renderLocalImageComposeState(): void {
    const settings = this.settings.get().linkChat.imageUploads;
    const config = settings.enabled ? normalizeLitterboxUploadConfig(settings) : null;
    const gallery = this.#imageDestination === "gallery";
    const storage = this.#galleryFileStorage;
    const setupButton = this.#imageFilePanel.querySelector<HTMLButtonElement>(
      ".kl-image-upload-setup",
    );
    setupButton?.toggleAttribute("hidden", gallery || config !== null);
    this.#chooseImageFileButton.hidden = !gallery && config === null;
    this.#chooseImageFileButton.disabled = this.#imageUploadBusy;
    for (const input of this.#galleryStorageOptions.querySelectorAll<HTMLInputElement>(
      "input[type='radio']",
    )) {
      input.disabled = this.#imageUploadBusy;
    }
    this.#galleryRetentionSelect.disabled = this.#imageUploadBusy;
    this.#chooseImageFileButton.textContent = this.#preparedLocalImage
      ? "Choose another"
      : "Choose image";
    this.#sendImageButton.textContent = gallery
      ? storage === "device"
        ? "Save on this device"
        : storage === "catbox"
          ? "Upload to Catbox"
          : "Upload to Litterbox"
      : "Upload & send";
    this.#sendImageButton.disabled =
      this.#imageUploadBusy || (!gallery && config === null) || this.#preparedLocalImage === undefined;

    if (this.#imageUploadBusy) {
      this.#localImageStatus.replaceChildren(
        element("span", { className: "kl-image-compose-icon" }, kikiIcon("image")),
        element(
          "span",
          {},
          element("strong", {
            text: gallery
              ? storage === "device"
                ? "Saving to this device…"
                : `Uploading to ${storage === "catbox" ? "Catbox" : "Litterbox"}…`
              : "Uploading prepared image…",
          }),
          element("small", {
            text: gallery && storage === "device"
              ? "The prepared copy stays inside this browser."
              : "Only the privacy-prepared WebP is being sent; the original file stays local.",
          }),
        ),
      );
      this.#localImageStatus.dataset.state = "loading";
      return;
    }

    if (!config && !gallery) {
      this.#localImageStatus.replaceChildren(
        element("span", { className: "kl-image-compose-icon" }, kikiIcon("lock")),
        element(
          "span",
          {},
          element("strong", { text: "Temporary upload is off" }),
          element("small", { text: "Enable Litterbox sharing once in Chat settings." }),
        ),
      );
      this.#localImageStatus.dataset.state = "empty";
      return;
    }

    if (this.#localImageError) {
      this.#localImageStatus.replaceChildren(
        element("span", { className: "kl-image-compose-icon" }, kikiIcon("warning")),
        element(
          "span",
          {},
          element("strong", { text: "Image not ready" }),
          element("small", { text: this.#localImageError }),
        ),
      );
      this.#localImageStatus.dataset.state = "error";
      return;
    }

    const prepared = this.#preparedLocalImage;
    if (!prepared) {
      this.#localImageStatus.replaceChildren(
        element("span", { className: "kl-image-compose-icon" }, kikiIcon("image")),
        element(
          "span",
          {},
          element("strong", { text: "Choose a local image" }),
          element("small", { text: "JPG, PNG, or WebP · up to 10 MB" }),
        ),
      );
      this.#localImageStatus.dataset.state = "empty";
      return;
    }

    const thumbnail = this.#localImageObjectUrl
      ? element("img", { className: "kl-local-image-thumbnail", ariaLabel: "Prepared image preview" })
      : element("span", { className: "kl-image-compose-icon" }, kikiIcon("check"));
    if (thumbnail instanceof HTMLImageElement && this.#localImageObjectUrl) {
      thumbnail.src = this.#localImageObjectUrl;
      thumbnail.alt = "Prepared local image";
    }
    this.#localImageStatus.replaceChildren(
      thumbnail,
      element(
        "span",
        {},
        element("strong", {
          text: gallery
            ? storage === "device"
              ? "Ready for private device storage"
              : storage === "catbox"
                ? "Ready for Catbox with no automatic expiry"
                : `Ready for ${formatRetention(this.#galleryRetentionSelect.value as LitterboxUploadConfig["retention"])} Litterbox storage`
            : "Prepared locally",
        }),
        element("small", {
          text: `${prepared.width} × ${prepared.height} · ${formatBytes(prepared.blob.size)} · metadata removed`,
        }),
      ),
    );
    this.#localImageStatus.dataset.state = "ready";
  }

  async #prepareLocalImage(file: File): Promise<void> {
    this.#resetLocalImage();
    const token = this.#imagePrepareToken;
    this.#chooseImageFileButton.disabled = true;
    this.#sendImageButton.disabled = true;
    this.#localImageStatus.replaceChildren(
      element("span", { className: "kl-image-compose-icon" }, kikiIcon("image")),
      element(
        "span",
        {},
        element("strong", { text: "Preparing safely…" }),
        element("small", { text: "Removing metadata and the original filename locally." }),
      ),
    );
    this.#localImageStatus.dataset.state = "loading";
    try {
      const prepared = await this.imageUploader.prepare(file);
      if (token !== this.#imagePrepareToken) return;
      this.#preparedLocalImage = prepared;
      if (typeof URL.createObjectURL === "function") {
        this.#localImageObjectUrl = URL.createObjectURL(prepared.blob);
      }
    } catch (error) {
      if (token !== this.#imagePrepareToken) return;
      this.#localImageError = imageUploadErrorMessage(error);
    } finally {
      if (token === this.#imagePrepareToken) {
        this.#imageFileInput.value = "";
        this.#renderLocalImageComposeState();
      }
    }
  }

  #resetLocalImage(): void {
    this.#imagePrepareToken += 1;
    this.#preparedLocalImage = undefined;
    this.#localImageError = undefined;
    this.#imageFileInput.value = "";
    if (this.#localImageObjectUrl && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(this.#localImageObjectUrl);
    }
    this.#localImageObjectUrl = undefined;
  }

  #requestCloseImageDialog(): void {
    if (this.#imageUploadBusy) {
      this.#toast("Wait for the image upload to finish.", "error");
      return;
    }
    this.#imageDialog.close();
  }

  async #sendImage(): Promise<void> {
    if (this.#imageSourceMode === "file") {
      await this.#uploadAndSendLocalImage();
      return;
    }
    const url = normalizeImageUrl(this.#imageUrlInput.value);
    if (!url) {
      this.#renderImageComposePreview();
      return;
    }
    if (this.#imageDestination === "gallery") {
      if (!this.#saveGalleryImage(url)) return;
      this.#imageDialog.close();
      this.#toast("Image saved to your Gallery.");
      return;
    }
    const sent = await this.#sendContent(url, false);
    if (!sent) return;
    this.#imageDialog.close();
    this.#toast("Image link sent.");
  }

  async #uploadAndSendLocalImage(): Promise<void> {
    const image = this.#preparedLocalImage;
    if (this.#imageDestination === "gallery") {
      if (!image || this.#imageUploadBusy) {
        this.#renderLocalImageComposeState();
        return;
      }
      const storage = this.#galleryFileStorage;
      const litterboxConfig = storage === "litterbox"
        ? normalizeLitterboxUploadConfig({ retention: this.#galleryRetentionSelect.value })
        : null;
      if (storage === "litterbox" && !litterboxConfig) {
        this.#localImageError = "Choose a valid temporary image lifetime";
        this.#renderLocalImageComposeState();
        return;
      }
      this.#imageUploadBusy = true;
      const token = ++this.#imageUploadToken;
      this.#localImageError = undefined;
      this.#renderLocalImageComposeState();
      try {
        let remoteUrl: string | undefined;
        if (storage === "device") {
          await this.galleryStore.add({ blob: image.blob, width: image.width, height: image.height });
        } else if (storage === "catbox") {
          remoteUrl = await this.catboxImageUpload(image);
        } else {
          remoteUrl = await this.imageUploader.upload(image, litterboxConfig!);
        }
        if (token !== this.#imageUploadToken) return;
        const savedAt = Date.now();
        const expiresAt = litterboxConfig
          ? savedAt + litterboxRetentionMs(litterboxConfig.retention)
          : undefined;
        if (remoteUrl && !this.#saveGalleryImage(remoteUrl, savedAt, false, expiresAt)) {
          throw new Error("The image host returned a link KikiLink could not save");
        }
        this.#imageUploadBusy = false;
        this.#imageDialog.close();
        this.#resetLocalImage();
        await this.#renderGallery();
        this.#toast(
          storage === "device"
            ? "Image saved permanently on this device. Nothing was uploaded."
            : storage === "catbox"
              ? "Image uploaded to Catbox and saved to Gallery without an automatic expiry."
              : `Image uploaded to Litterbox and saved for ${formatRetention(litterboxConfig!.retention)}.`,
        );
      } catch (error) {
        if (token !== this.#imageUploadToken) return;
        this.#imageUploadBusy = false;
        this.#localImageError = imageUploadErrorMessage(error);
        this.#renderLocalImageComposeState();
        this.#toast(this.#localImageError, "error");
      }
      return;
    }
    const uploadSettings = this.settings.get().linkChat.imageUploads;
    const config = uploadSettings.enabled
      ? normalizeLitterboxUploadConfig(uploadSettings)
      : null;
    if (!image || !config || this.#imageUploadBusy) {
      this.#renderLocalImageComposeState();
      return;
    }

    this.#imageUploadBusy = true;
    const token = ++this.#imageUploadToken;
    this.#localImageError = undefined;
    this.#renderLocalImageComposeState();
    try {
      const url = await this.imageUploader.upload(image, config);
      if (token !== this.#imageUploadToken) return;
      this.#imageUrlInput.value = url;
      const sent = await this.#sendContent(url, false);
      if (token !== this.#imageUploadToken) return;
      this.#imageUploadBusy = false;
      if (!sent) {
        this.#setImageSourceMode("link");
        this.#toast("Upload finished. The direct link is kept here so it is not lost.", "error");
        return;
      }
      this.#toast(`Private details removed; ${formatRetention(config.retention)} link sent.`);
      this.#imageDialog.close();
    } catch (error) {
      if (token !== this.#imageUploadToken) return;
      this.#imageUploadBusy = false;
      this.#localImageError = imageUploadErrorMessage(error);
      this.#renderLocalImageComposeState();
      this.#toast(this.#localImageError, "error");
    }
  }

  async #openFinder(): Promise<void> {
    this.#finderQuery.value = "";
    this.#finderCatalog = [];
    this.#visibleFinderResults = [];
    this.#finderSelectedIndex = 0;
    this.#finderResults.replaceChildren(
      element("div", { className: "kl-finder-loading", text: "Gathering your shortcuts…" }),
    );
    if (!this.#finderDialog.open) this.#finderDialog.showModal();
    this.#finderQuery.setAttribute("aria-expanded", "true");
    this.#finderQuery.focus();

    const token = ++this.#finderRenderToken;
    let catalog: FinderResult[];
    try {
      catalog = await this.#buildFinderCatalog();
    } catch {
      if (token !== this.#finderRenderToken || !this.#finderDialog.open) return;
      this.#finderResults.replaceChildren(
        element("div", {
          className: "kl-finder-empty kl-finder-error",
          text: "KikiLink shortcuts could not be gathered right now. Try again shortly.",
        }),
      );
      this.#finderStatus.textContent = "Shortcuts temporarily unavailable";
      return;
    }
    if (token !== this.#finderRenderToken || !this.#finderDialog.open) return;
    this.#finderCatalog = catalog;
    this.#renderFinderResults();
  }

  async #buildFinderCatalog(): Promise<FinderResult[]> {
    const settings = this.settings.get();
    const conversations = await this.service.listConversations();
    const unread = conversations.reduce((count, conversation) => count + conversation.unread, 0);
    const currentRoomCount = this.adapter.getRoomCharacters().length;
    const results: FinderResult[] = [
      {
        id: "destination-home",
        kind: "destination",
        icon: "home",
        category: "Destination",
        title: "Home",
        detail: "Overview and your suggested next step",
        keywords: "start link deck overview dashboard",
        priority: 52,
        action: { kind: "workspace", target: "home" },
      },
      {
        id: "destination-news",
        kind: "destination",
        icon: "note",
        category: "Destination",
        title: "News & changelog",
        detail: `What is new in KikiLink v${this.version}`,
        keywords: "news changelog release update version features fixes latest",
        priority: 66,
        action: { kind: "workspace", target: "news" },
      },
      {
        id: "destination-chat",
        kind: "destination",
        icon: "chat",
        category: "Destination",
        title: "Chat",
        detail: unread > 0 ? `${unread} unread ${unread === 1 ? "Beep" : "Beeps"}` : "Recent Beep conversations",
        keywords: "beep message messages conversation conversations linkchat",
        priority: 76 + Math.min(unread, 20),
        action: { kind: "workspace", target: "chat" },
      },
      {
        id: "new-chat",
        kind: "destination",
        icon: "plus",
        category: "Action",
        title: "Start a new chat",
        detail: "Choose a contact or enter a member number",
        keywords: "new beep contact member number send message",
        priority: 92,
        action: { kind: "new-chat" },
      },
      {
        id: "change-status",
        kind: "destination",
        icon: "status",
        category: "Action",
        title: "Change my status",
        detail: settings.linkPresence.enabled
          ? presenceLabel(this.presence.get(this.adapter.getOwnMemberNumber()).status)
          : "Presence sharing is off",
        keywords: "presence status online idle away dnd do not disturb offline invisible note",
        priority: 84,
        action: { kind: "presence" },
      },
      {
        id: "destination-players",
        kind: "destination",
        icon: "users",
        category: "Destination",
        title: "Players",
        detail: settings.linkRoster.enabled
          ? `${currentRoomCount} ${currentRoomCount === 1 ? "person" : "people"} here now`
          : "Optional player notebook · currently off",
        keywords: "roster people room notes tags favorites whisper profile linkroster",
        priority: 74,
        action: { kind: "workspace", target: "roster" },
      },
      {
        id: "destination-room",
        kind: "destination",
        icon: "location",
        category: "Destination",
        title: "Room Tools",
        detail: this.adapter.isInChatRoom() ? "Background, music, players, and roles" : "Enter a room first",
        keywords: "room admin background music kick promote whitelist roles customization lobbies rooms directory refresh presets blacklist access",
        priority: 72,
        action: { kind: "workspace", target: "room" },
      },
      {
        id: "destination-music",
        kind: "destination",
        icon: "music",
        category: "Destination",
        title: "Music & Playlists",
        detail: `${settings.linkMusic.playlists.length} playlists · local and shared files`,
        keywords: "music player playlist songs tracks audio hosted local seek shuffle repeat room sync",
        priority: 71,
        action: { kind: "workspace", target: "music" },
      },
      {
        id: "destination-gallery",
        kind: "destination",
        icon: "image",
        category: "Destination",
        title: "Media Gallery",
        detail: "Images you add directly and media from saved LinkChat conversations",
        keywords: "gallery library add upload images pictures device litterbox catbox media all chats",
        priority: 70,
        action: { kind: "workspace", target: "gallery" },
      },
      {
        id: "destination-activities",
        kind: "destination",
        icon: "activities",
        category: "Destination",
        title: "Custom Activities",
        detail: settings.linkActivities.enabled
          ? `${settings.linkActivities.customActivities.length} custom activities`
          : "Custom activity builder · currently off",
        keywords: "custom activity activities vanilla body slot arousal blossom",
        priority: 68,
        action: { kind: "workspace", target: "activities" },
      },
      {
        id: "destination-settings",
        kind: "destination",
        icon: "settings",
        category: "Destination",
        title: "Settings",
        detail: "Customize KikiLink",
        keywords: "preferences customize configuration options",
        priority: 62,
        action: { kind: "workspace", target: "settings" },
      },
    ];

    for (const conversation of conversations) {
      const details = [
        "Chat",
        `#${conversation.peerNumber}`,
        conversation.unread > 0 ? `${conversation.unread} unread` : "",
        conversation.lastMessageAt > 0 ? formatRelativeTime(conversation.lastMessageAt) : "",
      ].filter(Boolean);
      results.push({
        id: `conversation-${conversation.peerNumber}`,
        kind: "conversation",
        icon: "chat",
        category: "Chat",
        title: conversationDisplayName(conversation),
        detail: details.join(" · "),
        keywords: `${conversation.peerNumber} beep message conversation ${conversation.lastMessage}`,
        priority: 120 + Math.min(conversation.unread * 8, 40) + (conversation.pinned ? 12 : 0),
        action: {
          kind: "conversation",
          peerNumber: conversation.peerNumber,
          peerName: conversation.peerName,
        },
      });
    }

    const rosterEntries = this.roster.list("known");
    const knownPeople = new Set(rosterEntries.map((entry) => entry.memberNumber));
    for (const entry of rosterEntries) {
      const details = [
        entry.present ? "Here now" : "Player",
        `#${entry.memberNumber}`,
        entry.favorite ? "Favorite" : "",
        entry.tags.slice(0, 2).join(" · "),
      ].filter(Boolean);
      results.push({
        id: `player-${entry.memberNumber}`,
        kind: "player",
        icon: entry.favorite ? "star" : "users",
        category: entry.present ? "In room" : "Player",
        title: entry.displayName,
        detail: details.join(" · "),
        keywords: `${entry.memberNumber} ${entry.note} ${entry.tags.join(" ")} ${entry.lastRoomName} roster player`,
        priority: 104 + (entry.present ? 24 : 0) + (entry.favorite ? 12 : 0),
        action: { kind: "player", memberNumber: entry.memberNumber },
      });
    }

    const conversationNumbers = new Set(conversations.map((conversation) => conversation.peerNumber));
    try {
      for (const contact of this.adapter.getKnownContacts()) {
        if (knownPeople.has(contact.memberNumber) || conversationNumbers.has(contact.memberNumber)) continue;
        results.push({
          id: `contact-${contact.memberNumber}`,
          kind: "conversation",
          icon: "chat",
          category: "Contact",
          title: contact.memberName,
          detail: `Known contact · #${contact.memberNumber}`,
          keywords: `${contact.memberNumber} contact friend beep new chat`,
          priority: 90,
          action: {
            kind: "conversation",
            peerNumber: contact.memberNumber,
            peerName: contact.memberName,
          },
        });
      }
    } catch {
      // Finder destinations and stored conversations remain useful during native contact refreshes.
    }

    settings.linkActivities.customActivities.forEach((activity, index) => {
      results.push({
        id: `activity-${index}`,
        kind: "activity",
        icon: "activities",
        category: "Custom Activity",
        title: activity.name,
        detail: `${activity.targetGroup} · ${activity.template}`,
        keywords: `custom activity vanilla body slot ${activity.targetGroup} ${activity.image} arousal ${activity.template}`,
        priority: 72,
        action: { kind: "activity", index },
      });
    });

    for (const setting of finderSettingResults()) results.push(setting);
    return results;
  }

  #renderFinderResults(): void {
    const query = normalizeFinderText(this.#finderQuery.value);
    let results: FinderResult[];
    if (!query) {
      const featuredConversation = this.#finderCatalog
        .filter((result) => result.kind === "conversation" && result.id.startsWith("conversation-"))
        .sort((left, right) => right.priority - left.priority)[0];
      const suggestedIds = [
        featuredConversation?.id,
        "new-chat",
        featuredConversation ? undefined : "destination-chat",
        "destination-players",
        "destination-room",
        "destination-gallery",
        "destination-activities",
        "destination-settings",
      ].filter((id): id is string => Boolean(id));
      results = suggestedIds
        .map((id) => this.#finderCatalog.find((result) => result.id === id))
        .filter((result): result is FinderResult => result !== undefined);
    } else {
      results = rankFinderResults(this.#finderCatalog, query);
      const directNumber = Number(query.replace(/^#/u, ""));
      const hasDirectConversation = results.some(
        (result) =>
          result.action.kind === "conversation" && result.action.peerNumber === directNumber,
      );
      let ownMemberNumber = -1;
      try {
        ownMemberNumber = this.adapter.getOwnMemberNumber();
      } catch {
        // Direct member actions fail closed while the local account identity is guarded.
      }
      if (
        /^#?\d+$/u.test(query) &&
        Number.isSafeInteger(directNumber) &&
        directNumber > 0 &&
        Number.isSafeInteger(ownMemberNumber) &&
        ownMemberNumber > 0 &&
        directNumber !== ownMemberNumber &&
        !hasDirectConversation
      ) {
        let directName = `Member ${directNumber}`;
        try {
          directName = this.adapter.getMemberName(directNumber);
        } catch {
          // The member number is sufficient for a local LinkChat conversation.
        }
        results.unshift({
          id: `direct-${directNumber}`,
          kind: "conversation",
          icon: "plus",
          category: "Action",
          title: `Start chat with #${directNumber}`,
          detail: directName,
          keywords: query,
          priority: 1000,
          action: {
            kind: "conversation",
            peerNumber: directNumber,
            peerName: directName,
          },
        });
      }
      results = results.slice(0, 12);
    }

    this.#visibleFinderResults = results;
    this.#finderSelectedIndex = 0;
    this.#finderResults.replaceChildren();
    if (results.length === 0) {
      this.#finderResults.append(
        element(
          "div",
          { className: "kl-finder-empty" },
          element("div", { className: "kl-finder-empty-title", text: "Nothing matches yet" }),
          element("div", {
            text: "Try a name, member number, feature, activity, or setting.",
          }),
        ),
      );
      this.#finderStatus.textContent = "No KikiLink results found";
      this.#finderQuery.removeAttribute("aria-activedescendant");
      return;
    }

    results.forEach((result, index) => {
      const resultIcon = element(
        "span",
        { className: "kl-finder-result-icon" },
        kikiIcon(result.icon, "kl-finder-result-symbol", result.icon === "star"),
      );
      const option = element(
        "button",
        { className: "kl-finder-result", type: "button" },
        resultIcon,
        element(
          "span",
          { className: "kl-finder-result-copy" },
          element("span", { className: "kl-finder-result-title", text: result.title }),
          element("span", { className: "kl-finder-result-detail", text: result.detail }),
        ),
        element("span", { className: "kl-finder-result-category", text: result.category }),
      );
      option.id = `kikilink-finder-option-${index}`;
      option.dataset.finderKind = result.kind;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(index === 0));
      option.tabIndex = -1;
      option.addEventListener("pointermove", () => this.#setFinderSelection(index, false));
      option.addEventListener("click", () => void this.#chooseFinderResult(index));
      this.#finderResults.append(option);
    });
    this.#finderStatus.textContent = `${results.length} ${results.length === 1 ? "result" : "results"} available`;
    this.#setFinderSelection(0, false);
  }

  #moveFinderSelection(delta: number): void {
    if (this.#visibleFinderResults.length === 0) return;
    const next =
      (this.#finderSelectedIndex + delta + this.#visibleFinderResults.length) %
      this.#visibleFinderResults.length;
    this.#setFinderSelection(next, true);
  }

  #setFinderSelection(index: number, scroll: boolean): void {
    if (index < 0 || index >= this.#visibleFinderResults.length) return;
    this.#finderSelectedIndex = index;
    const options = [...this.#finderResults.querySelectorAll<HTMLElement>('[role="option"]')];
    options.forEach((option, candidate) => {
      option.dataset.selected = String(candidate === index);
      option.setAttribute("aria-selected", String(candidate === index));
    });
    const selected = options[index];
    if (!selected) return;
    this.#finderQuery.setAttribute("aria-activedescendant", selected.id);
    if (scroll) selected.scrollIntoView?.({ block: "nearest" });
  }

  async #chooseFinderResult(index: number): Promise<void> {
    const result = this.#visibleFinderResults[index];
    if (!result) return;
    this.#finderDialog.close();
    const action = result.action;
    if (action.kind === "workspace") {
      this.#activateFeature(action.target);
    } else if (action.kind === "new-chat") {
      this.#openNewChat();
    } else if (action.kind === "presence") {
      this.#openPresenceDialog();
    } else if (action.kind === "conversation") {
      await this.openChat(action.peerNumber, action.peerName);
    } else if (action.kind === "player") {
      this.#openRoster(action.memberNumber);
    } else if (action.kind === "activity") {
      this.#openActivities(action.index);
    } else {
      this.#openSettings(action.section);
    }
  }

  #buildGalleryPage(): void {
    const addImage = element("button", {
      className: "kl-text-button kl-text-button--primary",
      type: "button",
      text: "Add image",
      onClick: () => this.#openImageDialog("gallery"),
    });
    const refresh = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Refresh",
      onClick: () => void this.#renderGallery(),
    });
    const header = element(
      "header",
      { className: "kl-feature-page-header" },
      element(
        "div",
        { className: "kl-feature-page-heading" },
        element("div", { className: "kl-feature-page-eyebrow", text: "ALL CHATS" }),
        element("h1", { className: "kl-feature-page-title", text: "Media Gallery" }),
        this.#gallerySubtitle,
      ),
      element("div", { className: "kl-gallery-header-actions" }, addImage, refresh),
    );
    this.#galleryPage.append(header, this.#galleryGrid);
  }

  async #openGallery(): Promise<void> {
    this.#showWorkspace("gallery");
    await this.#renderGallery();
  }

  async #renderGallery(): Promise<void> {
    const token = ++this.#galleryRenderToken;
    this.#cancelRemoteImageLoadsWithin(this.#galleryGrid);
    this.#releaseGalleryObjectUrls();
    this.#galleryGrid.setAttribute("aria-busy", "true");
    this.#galleryGrid.replaceChildren(
      element("div", { className: "kl-gallery-empty", text: "Collecting images from LinkChat…" }),
    );
    try {
      const settings = this.settings.get();
      const [chatItems, deviceGalleryRead] = await Promise.all([
        this.service.listMedia(400),
        this.galleryStore.list().then(
          (images) => ({ ok: true as const, images }),
          () => ({ ok: false as const, images: [] }),
        ),
      ]);
      if (token !== this.#galleryRenderToken) return;
      const localImages = deviceGalleryRead.images;
      if (deviceGalleryRead.ok) this.#deviceGalleryCount = localImages.length;
      const deviceGalleryError = deviceGalleryRead.ok
        ? undefined
        : element(
            "div",
            { className: "kl-gallery-empty kl-gallery-storage-error" },
            element("strong", { text: "Device Gallery could not be read." }),
            element("span", { text: "Refresh to try again; no local files were changed." }),
          );
      const hidden = new Set(settings.linkChat.gallery.hiddenUrls);
      const now = Date.now();
      const expiredSavedUrls = settings.linkChat.gallery.saved
        .filter((saved) => saved.expiresAt !== undefined && saved.expiresAt <= now)
        .map((saved) => saved.url);
      if (expiredSavedUrls.length > 0) {
        const expired = new Set(expiredSavedUrls);
        for (const url of expired) hidden.add(url);
        this.settings.update((draft) => {
          draft.linkChat.gallery.saved = draft.linkChat.gallery.saved.filter(
            (saved) => !expired.has(saved.url),
          );
          draft.linkChat.gallery.hiddenUrls = [
            ...expired,
            ...draft.linkChat.gallery.hiddenUrls.filter((url) => !expired.has(url)),
          ];
        });
      }
      const itemsByUrl = new Map<string, GalleryItem>();
      for (const saved of settings.linkChat.gallery.saved) {
        if (hidden.has(saved.url) || (saved.expiresAt !== undefined && saved.expiresAt <= now)) {
          continue;
        }
        itemsByUrl.set(saved.url, {
          url: saved.url,
          provider: galleryMediaProvider(saved.url),
          sortAt: saved.addedAt,
          saved: true,
          ...(saved.expiresAt === undefined ? {} : { expiresAt: saved.expiresAt }),
        });
      }
      for (const chat of chatItems) {
        if (hidden.has(chat.url)) continue;
        const existing = itemsByUrl.get(chat.url);
        itemsByUrl.set(chat.url, {
          url: chat.url,
          provider: chat.provider,
          sortAt: Math.max(existing?.sortAt ?? 0, chat.sentAt),
          saved: existing?.saved ?? false,
          chat,
        });
      }
      const localItems = localImages.map((image): GalleryItem => {
        const url = URL.createObjectURL(image.blob);
        this.#galleryObjectUrls.add(url);
        return {
          url,
          provider: "device",
          sortAt: image.createdAt,
          saved: true,
          localId: image.id,
        };
      });
      const items = [...localItems, ...itemsByUrl.values()]
        .sort((left, right) => right.sortAt - left.sortAt)
        .slice(0, 400);
      const savedCount = items.filter((item) => item.saved).length;
      this.#gallerySubtitle.textContent = items.length
        ? `${items.length} unique image${items.length === 1 ? "" : "s"} from your library and saved chats${savedCount ? ` · ${savedCount} added directly` : ""}. Device files are private; Catbox and Litterbox entries use public links.`
        : "Images from saved chats and anything you add directly will appear here. Choose private device storage, Catbox, or expiring Litterbox for local files.";
      this.#renderHomeStatus();
      if (items.length === 0) {
        if (deviceGalleryError) {
          this.#galleryGrid.replaceChildren(deviceGalleryError);
          return;
        }
        this.#galleryGrid.replaceChildren(
          element(
            "div",
            { className: "kl-gallery-empty" },
            element("div", { text: "Your Gallery is empty." }),
            element("button", {
              className: "kl-text-button kl-text-button--primary",
              type: "button",
              text: "Add the first image",
              onClick: () => this.#openImageDialog("gallery"),
            }),
          ),
        );
        return;
      }
      let roomAdmin = false;
      try {
        roomAdmin = this.adapter.getRoomAdminSnapshot()?.isAdmin === true;
      } catch {
        // Cross-realm game objects can be temporarily unavailable while BC changes screens.
      }
      this.#galleryGrid.replaceChildren(
        ...(deviceGalleryError ? [deviceGalleryError] : []),
        ...items.map((item) => this.#galleryItem(item, roomAdmin)),
      );
    } catch (error) {
      if (token !== this.#galleryRenderToken) return;
      this.#galleryGrid.replaceChildren(
        element("div", {
          className: "kl-gallery-empty",
          text: error instanceof Error ? error.message : "The media gallery could not be loaded.",
        }),
      );
    } finally {
      if (token === this.#galleryRenderToken) {
        this.#galleryGrid.setAttribute("aria-busy", "false");
      }
    }
  }

  #galleryItem(item: GalleryItem, roomAdmin: boolean): HTMLElement {
    const actions = element("div", { className: "kl-gallery-actions" });
    if (item.chat) {
      actions.append(element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Open chat",
        onClick: () => this.#runPlayerAction(
          () => this.openChat(item.chat!.peerNumber, item.chat!.peerName),
          "LinkChat could not be opened.",
        ),
      }));
    }
    if (roomAdmin) {
      actions.append(
        element("button", {
          className: "kl-text-button kl-text-button--primary",
          type: "button",
          text: item.localId ? "Share & use as background" : "Use as room background",
          onClick: () => item.localId
            ? void this.#shareLocalGalleryImage(item)
            : this.#runPlayerAction(
                () => this.#selectGalleryRoomBackground(item.url),
                "Room Tools could not be opened.",
              ),
        }),
      );
    }
    actions.append(
      element("button", {
        className: "kl-text-button kl-text-button--danger kl-gallery-remove",
        type: "button",
        text: "Remove",
        ariaLabel: "Remove image from this Gallery",
        onClick: () => void this.#removeGalleryImage(item),
      }),
    );
    const card = element(
      "article",
      { className: "kl-gallery-item" },
      this.#imageCard(item.url, item.localId !== undefined),
      element(
        "div",
        { className: "kl-gallery-meta" },
        element("strong", {
          text: item.provider === "device"
            ? "On this device"
            : item.provider === "catbox"
              ? "Catbox"
              : item.provider === "litterbox"
                ? "Litterbox"
              : "Image",
        }),
        element("span", {
          text: item.chat
            ? `${item.chat.direction === "outgoing" ? "Sent to" : "From"} ${item.chat.peerName} · ${formatMessageTime(item.chat.sentAt)}`
            : item.localId
              ? `Stored permanently on this device · ${formatMessageTime(item.sortAt)}`
              : `Added to Gallery · ${formatMessageTime(item.sortAt)}${item.expiresAt ? ` · ${formatGalleryExpiry(item.expiresAt)}` : ""}`,
        }),
      ),
      actions,
    );
    if (!item.localId) card.dataset.galleryUrl = item.url;
    else card.dataset.galleryId = item.localId;
    card.dataset.gallerySource = item.saved ? "library" : "chat";
    return card;
  }

  #saveGalleryImage(
    value: string,
    addedAt = Date.now(),
    render = true,
    expiresAt?: number,
  ): boolean {
    const url = normalizeImageUrl(value);
    if (!url || url.length > 500) {
      this.#toast("Use a direct HTTPS image link ending in a supported image extension.", "error");
      return false;
    }
    this.settings.update((draft) => {
      draft.linkChat.gallery.hiddenUrls = draft.linkChat.gallery.hiddenUrls.filter(
        (hiddenUrl) => hiddenUrl !== url,
      );
      draft.linkChat.gallery.saved = [
        { url, addedAt, ...(expiresAt === undefined ? {} : { expiresAt }) },
        ...draft.linkChat.gallery.saved.filter((saved) => saved.url !== url),
      ];
    });
    this.#renderHomeStatus();
    if (render && this.#workspaceView === "gallery") void this.#renderGallery();
    return true;
  }

  async #removeGalleryImage(item: GalleryItem): Promise<void> {
    if (item.localId) {
      if (!window.confirm("Delete this image permanently from this device Gallery?")) return;
      try {
        await this.galleryStore.delete(item.localId);
        await this.#renderGallery();
        this.#toast("Image permanently deleted from this device Gallery.");
      } catch (error) {
        this.#toast(error instanceof Error ? error.message : "The local image could not be deleted.", "error");
      }
      return;
    }
    if (
      !window.confirm(
        "Remove this image from your KikiLink Gallery? The original chat message and hosted file will not be deleted.",
      )
    ) {
      return;
    }
    this.settings.update((draft) => {
      draft.linkChat.gallery.saved = draft.linkChat.gallery.saved.filter(
        (saved) => saved.url !== item.url,
      );
      draft.linkChat.gallery.hiddenUrls = [
        item.url,
        ...draft.linkChat.gallery.hiddenUrls.filter((url) => url !== item.url),
      ];
    });
    this.#renderHomeStatus();
    void this.#renderGallery();
    this.#toast("Image removed from this Gallery. Its chat message was left untouched.");
  }

  async #selectGalleryRoomBackground(url: string): Promise<void> {
    const returnWorkspace = this.#workspaceView;
    this.#roomImageUrl.value = url;
    try {
      await this.#openRoomTools(false);
    } catch (error) {
      if (this.#mounted && this.#workspaceView === "room") {
        this.#showWorkspace(returnWorkspace);
      }
      throw error;
    }
    if (!this.#mounted) return;
    this.#toast("Image selected. Review it, then apply the room media.");
  }

  async #shareLocalGalleryImage(item: GalleryItem): Promise<void> {
    if (!item.localId) return;
    const uploadSettings = this.settings.get().linkChat.imageUploads;
    const config = uploadSettings.enabled
      ? normalizeLitterboxUploadConfig(uploadSettings)
      : null;
    if (!config) {
      this.#toast("Enable shared uploads in Chat settings first.", "error");
      this.#openSettings("chat");
      return;
    }
    try {
      const stored = await this.galleryStore.get(item.localId);
      if (!stored) throw new Error("This device image is no longer available");
      this.#toast(`Sharing the image for ${formatRetention(config.retention)}…`);
      const url = await this.imageUploader.upload({
        blob: stored.blob,
        width: stored.width,
        height: stored.height,
        sourceBytes: stored.blob.size,
      }, config);
      await this.#selectGalleryRoomBackground(url);
    } catch (error) {
      this.#toast(error instanceof Error ? error.message : "The image could not be shared.", "error");
    }
  }

  #releaseGalleryObjectUrls(): void {
    if (typeof URL.revokeObjectURL === "function") {
      for (const url of this.#galleryObjectUrls) URL.revokeObjectURL(url);
    }
    this.#galleryObjectUrls.clear();
  }

  #invalidateGalleryRender(): void {
    this.#galleryRenderToken += 1;
    this.#cancelRemoteImageLoadsWithin(this.#galleryGrid);
    this.#releaseGalleryObjectUrls();
    this.#galleryGrid.setAttribute("aria-busy", "false");
  }

  #buildRoomPage(): void {
    const refresh = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Refresh room",
      onClick: () => {
        if (this.#roomSubView === "lobbies") void this.#refreshLobbies();
        else if (this.#roomSubView === "presets") this.#renderRoomPresets();
        else void this.#renderRoomTools(true);
      },
    });
    const header = element(
      "header",
      { className: "kl-feature-page-header" },
      element(
        "div",
        { className: "kl-feature-page-heading" },
        element("div", { className: "kl-feature-page-eyebrow", text: "CURRENT ROOM" }),
        element("h1", { className: "kl-feature-page-title", text: "Room Tools" }),
        element("p", {
          className: "kl-feature-page-subtitle",
          text: "Background, music, and native room administration without leaving the Link Deck.",
        }),
      ),
      refresh,
    );

    this.#roomImageUrl.type = "url";
    this.#roomImageUrl.placeholder = "https://…/background.webp";
    this.#roomImageUrl.maxLength = 250;
    this.#roomMusicUrl.type = "url";
    this.#roomMusicUrl.placeholder = "https://…/music.mp3";
    this.#roomMusicUrl.maxLength = 250;
    this.#roomSizeMode.replaceChildren(
      selectOption("1", "Fill / stretch"),
      selectOption("2", "Fill & crop (keep ratio)"),
      selectOption("3", "Show full image (keep ratio)"),
    );
    this.#roomMusicSync.type = "checkbox";
    const syncSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#roomMusicSync,
      element("span", { className: "kl-switch-track" }),
    );
    this.#roomPlaylistSync.type = "checkbox";
    this.#roomPlaylistSync.addEventListener("change", () => {
      this.#roomPlaylistSyncEnabled = this.#roomPlaylistSync.checked;
      if (this.#roomPlaylistSyncEnabled) {
        this.#roomPlaylistSyncStatus.textContent =
          "Playlist follow is on. Play a compatible Music track to update the room.";
        void this.#syncPlayingTrackToRoom(true);
      } else {
        this.#lastRoomSyncedTrackUrl = "";
        this.#roomPlaylistSyncStatus.textContent = "Playlist follow is off.";
      }
    });
    const playlistSyncSwitch = element(
      "label",
      { className: "kl-switch" },
      this.#roomPlaylistSync,
      element("span", { className: "kl-switch-track" }),
    );
    this.#roomImageFileInput.type = "file";
    this.#roomImageFileInput.accept = "image/*";
    this.#roomImageFileInput.hidden = true;
    this.#roomImageFileInput.addEventListener("change", () => void this.#uploadRoomBackground());
    this.#roomMusicFileInput.type = "file";
    this.#roomMusicFileInput.accept = "audio/mpeg,audio/mp4,video/mp4,.mp3,.mp4";
    this.#roomMusicFileInput.hidden = true;
    this.#roomMusicFileInput.addEventListener("change", () => void this.#uploadRoomMusic());
    const gallery = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Choose from gallery",
      onClick: () => void this.#openGallery(),
    });
    const upload = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Upload image",
      onClick: () => this.#roomImageFileInput.click(),
    });
    const uploadMusic = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Upload music",
      onClick: () => this.#roomMusicFileInput.click(),
    });
    this.#roomSaveButton.addEventListener("click", () => this.#saveRoomCustomization());

    const mediaForm = element(
      "section",
      { className: "kl-room-media" },
      element("h2", { text: "Room media" }),
      element(
        "label",
        { className: "kl-room-field" },
        element("span", { text: "Background image" }),
        this.#roomImageUrl,
      ),
      element(
        "div",
        { className: "kl-inline-actions" },
        gallery,
        upload,
        this.#roomImageFileInput,
      ),
      element(
        "label",
        { className: "kl-room-field" },
        element("span", { text: "Background layout" }),
        this.#roomSizeMode,
      ),
      element(
        "label",
        { className: "kl-room-field" },
        element("span", { text: "Music URL" }),
        this.#roomMusicUrl,
      ),
      element("div", { className: "kl-inline-actions" }, uploadMusic, this.#roomMusicFileInput),
      this.#settingRow(
        "Synchronize music",
        "Ask compatible BC clients to keep room playback aligned.",
        syncSwitch,
      ),
      this.#settingRow(
        "Follow KikiLink playlist",
        "While enabled, each compatible MP3/MP4 track you play becomes the room music. Device tracks are shared temporarily when first needed. This switch is session-only.",
        playlistSyncSwitch,
      ),
      this.#roomPlaylistSyncStatus,
      element("p", {
        className: "kl-room-media-note",
        text: "Uploaded backgrounds and room music use your temporary Litterbox lifetime. Images are privacy-prepared; audio is renamed but may retain embedded metadata. For a long-lived room, use a durable HTTPS link you control.",
      }),
      this.#roomSaveButton,
    );
    const players = element(
      "section",
      { className: "kl-room-players" },
      element("h2", { text: "Players & roles" }),
      element("p", {
        className: "kl-setting-help",
        text: "Kick, Admin, and room Whitelist buttons call Bondage Club's native room commands.",
      }),
      this.#roomPlayers,
    );
    this.#roomCurrentPanel.append(
      this.#roomAdminStatus,
      element("div", { className: "kl-room-grid" }, mediaForm, players),
    );
    this.#buildLobbyPanel();
    this.#buildRoomPresetsPanel();
    for (const [target, label] of [
      ["current", "Room"],
      ["lobbies", "Lobbies"],
      ["presets", "Presets"],
    ] as const) {
      const button = element("button", {
        className: "kl-room-subnav-button",
        type: "button",
        text: label,
        onClick: () => this.#showRoomSubView(target),
      });
      button.dataset.roomSubview = target;
      this.#roomSubnav.append(button);
    }
    const content = element(
      "div",
      { className: "kl-room-content" },
      this.#roomCurrentPanel,
      this.#roomLobbiesPanel,
      this.#roomPresetsPanel,
    );
    this.#roomPage.append(header, this.#roomSubnav, content);
    this.#showRoomSubView("current", false);
  }

  #showRoomSubView(view: RoomSubView, refresh = true): void {
    this.#roomSubView = view;
    this.#roomCurrentPanel.hidden = view !== "current";
    this.#roomLobbiesPanel.hidden = view !== "lobbies";
    this.#roomPresetsPanel.hidden = view !== "presets";
    for (const button of this.#roomSubnav.querySelectorAll<HTMLButtonElement>("button")) {
      button.dataset.active = String(button.dataset.roomSubview === view);
    }
    if (!refresh) return;
    if (view === "current") void this.#renderRoomTools(true);
    else if (view === "lobbies") {
      this.#renderLobbies();
      if (this.#lobbyRooms.length === 0) void this.#refreshLobbies();
    } else {
      this.#renderRoomPresets();
    }
  }

  #buildLobbyPanel(): void {
    this.#lobbyQuery.type = "search";
    this.#lobbyQuery.placeholder = "Filter rooms or descriptions";
    this.#lobbyQuery.setAttribute("aria-label", "Filter lobby rooms");
    this.#lobbyQuery.autocomplete = "off";
    this.#lobbyQuery.addEventListener("input", () => this.#renderLobbies());
    this.#lobbyQuery.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void this.#refreshLobbies();
      }
    });
    this.#lobbyRefreshButton.append(kikiIcon("refresh"));
    this.#lobbyRefreshButton.addEventListener("click", () => void this.#refreshLobbies());
    this.#lobbySpaceSelect.replaceChildren(
      selectOption("", "♀ Female"),
      selectOption("X", "♀♂ Mixed"),
      selectOption("M", "♂ Male"),
    );
    this.#lobbySpaceSelect.value = typeof this.adapter.getRoomSearchSpace === "function"
      ? this.adapter.getRoomSearchSpace()
      : "";
    this.#lobbySpaceSelect.addEventListener("change", () => {
      this.#lobbyRooms = [];
      void this.#refreshLobbies();
    });
    this.#roomLobbiesPanel.append(
      element(
        "div",
        { className: "kl-lobby-toolbar" },
        element(
          "div",
          {},
          element("h2", { text: "Live lobbies" }),
          element("p", {
            className: "kl-setting-help",
            text: "Favorite room names come first in gold; rooms with friends follow in your accent color. KikiLink refreshes only when you ask.",
          }),
        ),
        element(
          "div",
          { className: "kl-lobby-search-wrap" },
          this.#lobbySpaceSelect,
          this.#lobbyQuery,
          this.#lobbyRefreshButton,
        ),
      ),
      this.#lobbyStatus,
      this.#lobbyList,
    );
  }

  async #refreshLobbies(): Promise<void> {
    const token = ++this.#lobbyRenderToken;
    this.#lobbyRefreshButton.disabled = true;
    this.#lobbyStatus.textContent = "Refreshing Bondage Club rooms…";
    this.#lobbyStatus.dataset.state = "loading";
    try {
      const rooms = await this.adapter.searchRooms(
        this.#lobbyQuery.value,
        this.#lobbySpaceSelect.value as BCRoomSearchSpace,
      );
      if (token !== this.#lobbyRenderToken) return;
      this.#lobbyRooms = rooms;
      const friendNumbers = rooms.flatMap((room) => room.friends.map((friend) => friend.memberNumber));
      this.presence.requestMany(friendNumbers);
      this.#renderLobbies();
    } catch (error) {
      if (token !== this.#lobbyRenderToken) return;
      const message = error instanceof Error
        ? error.message
        : "The room list could not be refreshed.";
      this.#lobbyRooms = [];
      this.#renderLobbies();
      const hasCurrentRoom = this.#lobbyList.querySelector('[data-current="true"]') !== null;
      this.#lobbyStatus.textContent = hasCurrentRoom ? `${message} · Your current room is still shown.` : message;
      this.#lobbyStatus.dataset.state = "error";
    } finally {
      if (token === this.#lobbyRenderToken) this.#lobbyRefreshButton.disabled = false;
    }
  }

  #renderLobbies(): void {
    const filter = this.#lobbyQuery.value.trim().toLocaleLowerCase();
    const favoriteKeys = new Set(
      this.settings.get().linkRoom.favoriteRoomNames.map(lobbyRoomNameKey),
    );
    let currentRoomName = "";
    let currentRoomKey = "";
    try {
      currentRoomName = (this.adapter.getCurrentRoomName() ?? "").trim();
      currentRoomKey = lobbyRoomNameKey(currentRoomName);
    } catch {
      // Keep the directory usable while BC replaces its room globals.
    }
    let roomSource = this.#lobbyRooms.slice(0, 500);
    try {
      const currentRoom = typeof this.adapter.getCurrentLobbyRoom === "function"
        ? this.adapter.getCurrentLobbyRoom()
        : undefined;
      if (currentRoom) {
        const fallbackCurrentRoomKey = lobbyRoomNameKey(currentRoom.name);
        if (!currentRoomKey) currentRoomKey = fallbackCurrentRoomKey;
        if (
          currentRoomKey &&
          !roomSource.some((room) => lobbyRoomNameKey(room.name) === currentRoomKey)
        ) {
          roomSource = [currentRoom, ...roomSource];
        }
      }
    } catch {
      // The live directory still renders if BC swaps room data mid-frame.
    }
    if (
      currentRoomKey &&
      currentRoomName &&
      !roomSource.some((room) => lobbyRoomNameKey(room.name) === currentRoomKey)
    ) {
      let memberCount = 1;
      try {
        memberCount = Math.max(1, this.adapter.getRoomCharacters().length + 1);
      } catch {
        // The name alone is enough to keep the current room visible during guarded refreshes.
      }
      roomSource = [{
        name: currentRoomName,
        description: "Live room details are temporarily unavailable.",
        language: "",
        memberCount,
        memberLimit: memberCount,
        canJoin: false,
        locked: false,
        privateRoom: false,
        mapType: "",
        friends: [],
      }, ...roomSource];
    }
    const rooms = roomSource
      .map((room, index) => ({
        room,
        index,
        favorite: favoriteKeys.has(lobbyRoomNameKey(room.name)),
        current: Boolean(currentRoomKey) && lobbyRoomNameKey(room.name) === currentRoomKey,
      }))
      .filter(({ room, current }) =>
        current || !filter || `${room.name}\n${room.description}\n${room.language}`.toLocaleLowerCase().includes(filter),
      )
      .sort((left, right) => {
        const leftRank = left.current
          ? 3
          : left.favorite
            ? 2
            : left.room.friends.length > 0
              ? 1
              : 0;
        const rightRank = right.current
          ? 3
          : right.favorite
            ? 2
            : right.room.friends.length > 0
              ? 1
              : 0;
        return rightRank - leftRank || left.index - right.index;
      });
    const friendRoomCount = rooms.filter(({ room }) => room.friends.length > 0).length;
    const favoriteRoomCount = rooms.filter(({ favorite }) => favorite).length;
    this.#lobbyStatus.textContent = rooms.length === 0
      ? `No rooms returned for ${lobbySpaceLabel(this.#lobbySpaceSelect.value)}.`
      : `${rooms.length} rooms · ${favoriteRoomCount} favorite${favoriteRoomCount === 1 ? "" : "s"} · ${friendRoomCount} with friends`;
    this.#lobbyStatus.dataset.state = rooms.length > 0 ? "ready" : "empty";
    this.#lobbyList.replaceChildren(
      ...rooms.map(({ room, favorite, current }) => this.#lobbyCard(room, favorite, current)),
    );
  }

  #lobbyCard(room: BCLobbyRoom, isFavorite: boolean, isCurrent: boolean): HTMLElement {
    const friends = element("div", { className: "kl-lobby-friends" });
    if (room.friends.length > 0) {
      for (const friend of room.friends.slice(0, 5)) {
        const avatar = this.#avatar(friend.memberName, friend.memberNumber, "kl-lobby-friend-avatar");
        avatar.title = `${friend.memberName} · #${friend.memberNumber}`;
        friends.append(avatar);
      }
      if (room.friends.length > 5) {
        friends.append(element("span", { className: "kl-lobby-friend-more", text: `+${room.friends.length - 5}` }));
      }
    }
    const flags = [
      room.language,
      room.creator ? `by ${room.creator}` : "",
      lobbyMapTypeLabel(room.mapType),
      room.locked ? "Locked" : "",
      room.privateRoom ? "Private" : "",
    ].filter(Boolean);
    const join = isCurrent
      ? element("span", { className: "kl-lobby-current", text: "Current room" })
      : element("button", {
          className: "kl-text-button kl-lobby-join",
          type: "button",
          text: this.#lobbyJoinBusy ? "Joining…" : room.canJoin ? "Join" : "Unavailable",
          onClick: () => void this.#joinLobby(room),
        });
    if (join instanceof HTMLButtonElement) join.disabled = this.#lobbyJoinBusy || !room.canJoin;
    const favorite = element("button", {
      className: "kl-icon-button kl-lobby-favorite",
      type: "button",
      title: isFavorite ? `Remove ${room.name} from favorites` : `Add ${room.name} to favorites`,
      ariaLabel: isFavorite ? `Remove ${room.name} from favorite rooms` : `Add ${room.name} to favorite rooms`,
      onClick: () => this.#toggleFavoriteLobby(room.name),
    });
    favorite.setAttribute("aria-pressed", String(isFavorite));
    favorite.append(kikiIcon("star", "kl-lobby-favorite-icon", isFavorite));
    const card = element(
      "article",
      { className: "kl-lobby-card" },
      element(
        "div",
        { className: "kl-lobby-card-main" },
        element("strong", { className: "kl-lobby-name", text: room.name }),
        element("span", {
          className: "kl-lobby-count",
          text: `${room.memberCount}/${room.memberLimit}`,
        }),
        room.friends.length > 0
          ? element("span", { className: "kl-lobby-friend-label", text: `${room.friends.length} friend${room.friends.length === 1 ? "" : "s"}` })
          : null,
        favorite,
      ),
      room.description
        ? element("p", { className: "kl-lobby-description", text: room.description })
        : null,
      element(
        "div",
        { className: "kl-lobby-card-footer" },
        element("span", { className: "kl-lobby-flags", text: flags.join(" · ") || "Public room" }),
        friends,
        join,
      ),
    );
    card.dataset.hasFriends = String(room.friends.length > 0);
    card.dataset.favorite = String(isFavorite);
    card.dataset.current = String(isCurrent);
    return card;
  }

  #toggleFavoriteLobby(roomName: string): void {
    const key = lobbyRoomNameKey(roomName);
    if (!key) return;
    let added = false;
    this.settings.update((draft) => {
      const existing = draft.linkRoom.favoriteRoomNames.findIndex(
        (name) => lobbyRoomNameKey(name) === key,
      );
      if (existing >= 0) {
        draft.linkRoom.favoriteRoomNames.splice(existing, 1);
      } else {
        draft.linkRoom.favoriteRoomNames.unshift(roomName.trim());
        added = true;
      }
    });
    this.#renderLobbies();
    this.#toast(added ? `${roomName} added to favorite rooms.` : `${roomName} removed from favorite rooms.`);
  }

  async #joinLobby(room: BCLobbyRoom): Promise<void> {
    if (this.#lobbyJoinBusy) return;
    let wasInChatRoom = false;
    let roomStateReadable = true;
    try {
      wasInChatRoom =
        typeof this.adapter.isInChatRoom === "function" && this.adapter.isInChatRoom();
    } catch {
      // A guarded room object must never bypass confirmation and unexpectedly leave a room.
      roomStateReadable = false;
      wasInChatRoom = true;
    }
    if (wasInChatRoom) {
      if (typeof confirm !== "function") {
        this.#toast("KikiLink cannot safely confirm leaving the current room right now.", "error");
        return;
      }
      const prompt = roomStateReadable
        ? `Leave the current room and join “${room.name}”?`
        : `KikiLink could not verify the current room state. Continue with Bondage Club's safe leave-and-join flow for “${room.name}”?`;
      if (!confirm(prompt)) return;
    }
    this.#lobbyJoinBusy = true;
    this.#renderLobbies();
    try {
      this.#toast(
        wasInChatRoom
          ? `Leaving safely, then joining ${room.name}…`
          : `Joining ${room.name}…`,
      );
      await this.adapter.joinRoom(room.name);
      this.#toast(`Joined ${room.name}.`);
      this.close();
    } catch (error) {
      this.#toast(error instanceof Error ? error.message : "Could not join this room.", "error");
    } finally {
      this.#lobbyJoinBusy = false;
      if (this.#mounted) this.#renderLobbies();
    }
  }

  #buildRoomPresetsPanel(): void {
    this.#presetName.type = "text";
    this.#presetName.placeholder = "Preset name (for example: Moon Garden)";
    this.#presetName.maxLength = 60;
    this.#saveRoomPresetButton.addEventListener("click", () => this.#saveCurrentRoomPreset());
    this.#roomPresetsPanel.append(
      element(
        "div",
        { className: "kl-room-preset-create" },
        element(
          "div",
          {},
          element("h2", { text: "Room presets" }),
          element("p", {
            className: "kl-setting-help",
            text: "Save the room name, description, BC background, custom media, limits, access, admins, whitelist, and blacklist. Passwords and large map layouts are never copied.",
          }),
        ),
        element("div", { className: "kl-room-preset-create-actions" }, this.#presetName, this.#saveRoomPresetButton),
      ),
      this.#roomPresetList,
    );
  }

  #saveCurrentRoomPreset(): void {
    const snapshot = this.adapter.getRoomAdminSnapshot();
    if (!snapshot) {
      this.#toast("Enter a chat room before saving a preset.", "error");
      return;
    }
    const label = this.#presetName.value.trim() || snapshot.roomName;
    const preset: RoomPreset = {
      id: createLocalId("room"),
      label: label.slice(0, 60),
      savedAt: Date.now(),
      room: structuredClone(snapshot.settings),
    };
    this.settings.update((draft) => {
      draft.linkRoom.presets = [preset, ...draft.linkRoom.presets].slice(0, 12);
    });
    this.#presetName.value = "";
    this.#renderRoomPresets();
    this.#toast(`Saved room preset “${preset.label}”.`);
  }

  #renderRoomPresets(): void {
    const presets = this.settings.get().linkRoom.presets;
    if (presets.length === 0) {
      this.#roomPresetList.replaceChildren(
        element("div", { className: "kl-gallery-empty", text: "No room presets yet." }),
      );
      return;
    }
    this.#roomPresetList.replaceChildren(...presets.map((preset) => this.#roomPresetCard(preset)));
  }

  #roomPresetCard(preset: RoomPreset): HTMLElement {
    const detail = [
      `${preset.room.limit} players`,
      preset.room.language || "Any language",
      `${preset.room.admins.length} admins`,
      `${preset.room.whitelist.length} whitelist`,
      `${preset.room.blacklist.length} blacklist`,
    ].join(" · ");
    return element(
      "article",
      { className: "kl-room-preset-card" },
      element(
        "div",
        { className: "kl-room-preset-copy" },
        element("strong", { text: preset.label }),
        element("span", { text: preset.room.name }),
        element("small", { text: detail }),
      ),
      element(
        "div",
        { className: "kl-room-preset-actions" },
        element("button", {
          className: "kl-text-button kl-text-button--primary",
          type: "button",
          text: "Apply",
          onClick: () => this.#applyRoomPreset(preset),
        }),
        element("button", {
          className: "kl-icon-button",
          type: "button",
          title: "Delete preset",
          ariaLabel: `Delete ${preset.label}`,
          onClick: () => this.#deleteRoomPreset(preset),
        }, kikiIcon("trash")),
      ),
    );
  }

  #applyRoomPreset(preset: RoomPreset): void {
    if (
      typeof confirm === "function" &&
      !confirm(`Apply “${preset.label}” to the current room? This updates the live room settings.`)
    ) {
      return;
    }
    try {
      this.adapter.applyRoomPreset(preset.room);
      this.#toast(`Applying room preset “${preset.label}”…`);
      this.#scheduleRoomToolsRefresh();
    } catch (error) {
      this.#toast(error instanceof Error ? error.message : "The room preset could not be applied.", "error");
    }
  }

  #deleteRoomPreset(preset: RoomPreset): void {
    if (typeof confirm === "function" && !confirm(`Delete room preset “${preset.label}”?`)) return;
    this.settings.update((draft) => {
      draft.linkRoom.presets = draft.linkRoom.presets.filter((candidate) => candidate.id !== preset.id);
    });
    this.#renderRoomPresets();
  }

  async #openRoomTools(refreshFields = true): Promise<void> {
    this.#showWorkspace("room");
    await this.#renderRoomTools(refreshFields);
  }

  async #renderRoomTools(refreshFields: boolean): Promise<void> {
    const snapshot = this.adapter.getRoomAdminSnapshot();
    if (!snapshot) {
      this.#roomAdminStatus.textContent = "Enter a chat room to use Room Tools.";
      this.#roomAdminStatus.dataset.state = "empty";
      this.#roomPlayers.replaceChildren(
        element("div", { className: "kl-gallery-empty", text: "No active room." }),
      );
      this.#setRoomControlsEnabled(false);
      this.#roomPlaylistSyncEnabled = false;
      this.#roomPlaylistSync.checked = false;
      this.#roomPlaylistSyncStatus.textContent = "Enter a room to follow the playlist.";
      return;
    }
    this.#roomAdminStatus.textContent = snapshot.isAdmin
      ? `${snapshot.roomName} · You are a room administrator`
      : `${snapshot.roomName} · View only (administrator rights required to make changes)`;
    this.#roomAdminStatus.dataset.state = snapshot.isAdmin ? "admin" : "readonly";
    this.#setRoomControlsEnabled(snapshot.isAdmin);
    this.#roomPlaylistSync.checked = snapshot.isAdmin && this.#roomPlaylistSyncEnabled;
    this.#roomPlaylistSyncStatus.textContent = snapshot.isAdmin
      ? this.#roomPlaylistSyncEnabled
        ? "Following the Music tab. Compatible device tracks are shared temporarily when needed."
        : "Playlist follow is off."
      : "Only a room administrator can make room music follow the playlist.";
    if (!snapshot.isAdmin) this.#roomPlaylistSyncEnabled = false;
    if (refreshFields) {
      this.#roomImageUrl.value = snapshot.customization.imageUrl;
      this.#roomMusicUrl.value = snapshot.customization.musicUrl;
      this.#roomSizeMode.value = snapshot.customization.sizeMode.toString();
      this.#roomMusicSync.checked = snapshot.customization.musicSync;
    }
    this.#roomPlayers.replaceChildren(
      ...snapshot.players.map((player) => this.#roomPlayerRow(player, snapshot.isAdmin)),
    );
    this.presence.requestMany(snapshot.players.map((player) => player.memberNumber));
    if (snapshot.players.length === 0) {
      this.#roomPlayers.append(
        element("div", { className: "kl-gallery-empty", text: "No other players are in this room." }),
      );
    }
  }

  #setRoomControlsEnabled(enabled: boolean): void {
    for (const control of [
      this.#roomImageUrl,
      this.#roomMusicUrl,
      this.#roomSizeMode,
      this.#roomMusicSync,
      this.#roomSaveButton,
      this.#roomImageFileInput,
      this.#roomMusicFileInput,
      this.#roomPlaylistSync,
    ]) {
      control.disabled = !enabled;
    }
    for (const button of this.#roomPage.querySelectorAll<HTMLButtonElement>(
      ".kl-room-media .kl-inline-actions button",
    )) {
      button.disabled = !enabled;
    }
  }

  #roomPlayerRow(player: BCRoomAdminPlayer, canManage: boolean): HTMLElement {
    const presence = this.presence.get(player.memberNumber);
    const actions = element("div", { className: "kl-room-player-actions" });
    if (canManage) {
      actions.append(
        this.#roomActionButton(player, player.admin ? "demote" : "promote", player.admin ? "Remove admin" : "Make admin"),
        this.#roomActionButton(
          player,
          player.whitelisted ? "unwhitelist" : "whitelist",
          player.whitelisted ? "Remove whitelist" : "Whitelist",
        ),
        this.#roomActionButton(player, "kick", "Kick", true),
      );
    }
    const badges = element("div", { className: "kl-room-player-badges" });
    const status = element("span", { text: presenceLabel(presence.status) });
    status.dataset.status = presence.status;
    status.dataset.presenceLabel = "true";
    status.hidden = presence.status === "unknown";
    badges.append(status);
    if (player.admin) badges.append(element("span", { text: "ADMIN" }));
    if (player.whitelisted) badges.append(element("span", { text: "WHITELIST" }));
    const row = element(
      "article",
      { className: "kl-room-player" },
      element(
        "div",
        { className: "kl-avatar-wrap" },
        this.#avatar(player.memberName, player.memberNumber),
        presenceDot(presence.status),
      ),
      element(
        "div",
        { className: "kl-room-player-copy" },
        element("strong", { text: player.memberName }),
        element("span", { text: `#${player.memberNumber}` }),
        badges,
      ),
      actions,
    );
    row.dataset.memberNumber = player.memberNumber.toString();
    return row;
  }

  #roomActionButton(
    player: BCRoomAdminPlayer,
    action: BCRoomMemberAction,
    label: string,
    danger = false,
  ): HTMLButtonElement {
    return element("button", {
      className: `kl-text-button${danger ? " kl-text-button--danger" : ""}`,
      type: "button",
      text: label,
      onClick: () => void this.#runRoomMemberAction(player, action),
    });
  }

  async #runRoomMemberAction(player: BCRoomAdminPlayer, action: BCRoomMemberAction): Promise<void> {
    if (
      action === "kick" &&
      typeof confirm === "function" &&
      !confirm(`Kick ${player.memberName} from the room?`)
    ) {
      return;
    }
    try {
      this.adapter.runRoomMemberAction(player.memberNumber, action);
      this.#toast(`${roomActionPastTense(action)} ${player.memberName}.`);
      this.#scheduleRoomToolsRefresh();
    } catch (error) {
      this.#toast(error instanceof Error ? error.message : "The room action failed.", "error");
    }
  }

  #scheduleRoomToolsRefresh(): void {
    if (this.#roomRefreshTimer !== undefined) clearTimeout(this.#roomRefreshTimer);
    this.#roomRefreshTimer = setTimeout(() => {
      this.#roomRefreshTimer = undefined;
      if (this.#mounted) void this.#renderRoomTools(true);
    }, 700);
  }

  #saveRoomCustomization(): void {
    try {
      this.adapter.updateRoomCustomization({
        imageUrl: this.#roomImageUrl.value,
        musicUrl: this.#roomMusicUrl.value,
        sizeMode: Number(this.#roomSizeMode.value),
        musicSync: this.#roomMusicSync.checked,
      });
      this.#toast("Room background and music update sent to Bondage Club.");
    } catch (error) {
      this.#toast(error instanceof Error ? error.message : "Room media could not be updated.", "error");
    }
  }

  async #uploadRoomBackground(): Promise<void> {
    const file = this.#roomImageFileInput.files?.[0];
    this.#roomImageFileInput.value = "";
    if (!file) return;
    const settings = this.settings.get().linkChat.imageUploads;
    const config = settings.enabled ? normalizeLitterboxUploadConfig(settings) : null;
    if (!config) {
      this.#toast("Enable temporary local image uploads in Chat settings first.", "error");
      this.#openSettings("chat");
      return;
    }
    try {
      this.#roomAdminStatus.textContent = "Preparing and uploading the room background…";
      const prepared = await this.imageUploader.prepare(file);
      const url = await this.imageUploader.upload(prepared, config);
      this.#roomImageUrl.value = url;
      await this.#renderRoomTools(false);
      this.#toast("Background uploaded. Apply room media when ready.");
    } catch (error) {
      this.#toast(
        error instanceof Error ? error.message : "The room background could not be uploaded.",
        "error",
      );
      await this.#renderRoomTools(false);
    }
  }

  async #uploadRoomMusic(): Promise<void> {
    const file = this.#roomMusicFileInput.files?.[0];
    this.#roomMusicFileInput.value = "";
    if (!file) return;
    const settings = this.settings.get().linkChat.imageUploads;
    const config = settings.enabled ? normalizeLitterboxUploadConfig(settings) : null;
    if (!config) {
      this.#toast("Enable temporary local uploads in Chat settings first.", "error");
      this.#openSettings("chat");
      return;
    }
    try {
      this.#roomAdminStatus.textContent = "Uploading temporary room music…";
      this.#roomMusicUrl.value = await uploadLocalRoomAudio(file, config);
      await this.#renderRoomTools(false);
      this.#toast("Music uploaded. Apply room media when ready.");
    } catch (error) {
      this.#toast(
        error instanceof Error ? error.message : "The room music could not be uploaded.",
        "error",
      );
      await this.#renderRoomTools(false);
    }
  }

  #buildMusicPage(): void {
    const header = element(
      "header",
      { className: "kl-feature-page-header" },
      element(
        "div",
        { className: "kl-feature-page-heading" },
        element("div", { className: "kl-feature-page-eyebrow", text: "YOUR MUSIC" }),
        element("h1", { className: "kl-feature-page-title", text: "Music & Playlists" }),
        element("p", {
          className: "kl-feature-page-subtitle",
          text: "A small private player for local files, direct links, and expiring shared tracks.",
        }),
      ),
      this.#newPlaylistButton,
    );

    this.#playlistSelect.addEventListener("change", () => {
      this.settings.update((draft) => {
        draft.linkMusic.activePlaylistId = this.#playlistSelect.value;
      });
      void this.#renderMusicPage();
    });
    this.#newPlaylistButton.addEventListener("click", () => this.#createPlaylist());
    const renamePlaylist = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Rename",
      onClick: () => this.#renameActivePlaylist(),
    });
    const duplicatePlaylist = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Duplicate",
      onClick: () => this.#duplicateActivePlaylist(),
    });
    const clearPlaylist = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Clear",
      onClick: () => void this.#clearActivePlaylist(),
    });
    const deletePlaylist = element("button", {
      className: "kl-text-button kl-text-button--danger",
      type: "button",
      text: "Delete",
      onClick: () => void this.#deleteActivePlaylist(),
    });
    const playlistMenu = element("details", { className: "kl-music-playlist-menu" });
    playlistMenu.append(
      element("summary", {
        className: "kl-text-button",
        text: "Manage",
        title: "Playlist actions",
        ariaLabel: "Playlist actions",
      }),
      element(
        "div",
        { className: "kl-music-playlist-actions" },
        renamePlaylist,
        duplicatePlaylist,
        clearPlaylist,
        deletePlaylist,
      ),
    );

    this.#musicTitleInput.type = "text";
    this.#musicTitleInput.placeholder = "Track title (optional)";
    this.#musicTitleInput.maxLength = 80;
    this.#musicUrlInput.type = "url";
    this.#musicUrlInput.placeholder = "https://…/track.mp3";
    this.#musicUrlInput.maxLength = 500;
    this.#musicFileInput.type = "file";
    this.#musicFileInput.accept = "audio/*,video/mp4,.aac,.flac,.m4a,.mp3,.mp4,.oga,.ogg,.opus,.wav,.webm";
    this.#musicFileInput.multiple = true;
    this.#musicFileMode.replaceChildren(
      selectOption("local", "Keep only on this device"),
      selectOption("catbox", "Upload to long-lived Catbox"),
    );
    this.#musicAddButton.addEventListener("click", () => void this.#addMusicTrack());
    this.#musicQueueSearch.type = "search";
    this.#musicQueueSearch.placeholder = "Search this playlist";
    this.#musicQueueSearch.autocomplete = "off";
    this.#musicQueueSearch.addEventListener("input", () => void this.#renderMusicPage());

    const library = element(
      "section",
      { className: "kl-music-library" },
      element(
        "div",
        { className: "kl-music-playlist-toolbar" },
        element("label", {}, element("span", { text: "Playlist" }), this.#playlistSelect),
        playlistMenu,
      ),
      element(
        "div",
        { className: "kl-music-queue-tools" },
        element("div", { className: "kl-music-queue-search-wrap" }, kikiIcon("search"), this.#musicQueueSearch),
        this.#musicQueueSummary,
      ),
      this.#musicQueue,
    );
    const add = element(
      "section",
      { className: "kl-music-add" },
      element("h2", { text: "Add a track" }),
      element("label", {}, element("span", { text: "Title" }), this.#musicTitleInput),
      element("label", {}, element("span", { text: "Direct HTTPS audio URL" }), this.#musicUrlInput),
      element("div", { className: "kl-music-add-divider", text: "or choose a file" }),
      element("label", {}, element("span", { text: "Audio files" }), this.#musicFileInput),
      element("label", {}, element("span", { text: "File handling" }), this.#musicFileMode),
      element("p", {
        className: "kl-setting-help",
        text: "Local files stay in this browser. Anonymous Catbox uploads are public bearer links and are retained until two years of inactivity; account-linked uploads would be permanent.",
      }),
      this.#musicAddStatus,
      this.#musicAddButton,
    );
    this.#musicArtwork.replaceChildren(
      element("span", { className: "kl-music-artwork-ring" }),
      element("span", { className: "kl-music-artwork-center" }, kikiIcon("music")),
    );
    this.#musicPlaybackRate.replaceChildren(
      selectOption("0.75", "0.75×"),
      selectOption("1", "1×"),
      selectOption("1.25", "1.25×"),
      selectOption("1.5", "1.5×"),
      selectOption("2", "2×"),
    );
    this.#musicPlaybackRate.value = "1";
    this.#musicPlaybackRate.addEventListener("change", () => {
      this.#audio.playbackRate = Number(this.#musicPlaybackRate.value) || 1;
    });
    this.#musicSleepSelect.replaceChildren(
      selectOption("off", "Sleep timer off"),
      selectOption("end", "After this track"),
      selectOption("15", "After 15 minutes"),
      selectOption("30", "After 30 minutes"),
      selectOption("60", "After 1 hour"),
    );
    this.#musicSleepSelect.value = "off";
    this.#musicSleepSelect.addEventListener("change", () => this.#setMusicSleepTimer());
    const nowPlaying = element(
      "section",
      { className: "kl-music-now-card" },
      element("div", { className: "kl-music-now-eyebrow", text: "NOW PLAYING" }),
      this.#musicArtwork,
      element("div", { className: "kl-music-now-card-copy" }, this.#musicNowTitle, this.#musicNowSource),
      element(
        "div",
        { className: "kl-music-session-options" },
        element("label", {}, element("span", { text: "Speed" }), this.#musicPlaybackRate),
        element("label", {}, element("span", { text: "Sleep" }), this.#musicSleepSelect),
      ),
      this.#musicSleepStatus,
    );

    this.#musicProgress.type = "range";
    this.#musicProgress.min = "0";
    this.#musicProgress.max = "1000";
    this.#musicProgress.step = "1";
    this.#musicProgress.value = "0";
    this.#musicProgress.addEventListener("input", () => {
      if (!Number.isFinite(this.#audio.duration) || this.#audio.duration <= 0) return;
      this.#audio.currentTime = (Number(this.#musicProgress.value) / 1000) * this.#audio.duration;
      this.#renderMusicProgress();
    });
    this.#musicPreviousButton.append(kikiIcon("previous"));
    this.#musicPlayButton.append(kikiIcon("play"));
    this.#musicNextButton.append(kikiIcon("next"));
    this.#musicPreviousButton.addEventListener("click", () => void this.#previousTrack());
    this.#musicPlayButton.addEventListener("click", () => void this.#toggleMusicPlayback());
    this.#musicNextButton.addEventListener("click", () => void this.#nextTrack(false));
    this.#musicRepeatButton.addEventListener("click", () => this.#cycleMusicRepeat());
    this.#musicShuffleButton.addEventListener("click", () => this.#toggleMusicShuffle());
    this.#musicMuteButton.addEventListener("click", () => {
      this.#audio.muted = !this.#audio.muted;
      this.#renderMusicTransport();
    });
    this.#musicVolume.type = "range";
    this.#musicVolume.min = "0";
    this.#musicVolume.max = "100";
    this.#musicVolume.step = "1";
    this.#musicVolume.addEventListener("input", () => {
      const volume = Math.max(0, Math.min(100, Number(this.#musicVolume.value) || 0));
      this.#audio.volume = volume / 100;
      this.settings.update((draft) => {
        draft.linkMusic.volume = volume;
      });
    });

    this.#audio.preload = "metadata";
    this.#audio.addEventListener("timeupdate", () => this.#renderMusicProgress());
    this.#audio.addEventListener("loadedmetadata", () => this.#renderMusicProgress());
    this.#audio.addEventListener("durationchange", () => this.#renderMusicProgress());
    this.#audio.addEventListener("play", () => {
      this.#renderMusicTransport();
      void this.#syncPlayingTrackToRoom();
    });
    this.#audio.addEventListener("pause", () => this.#renderMusicTransport());
    this.#audio.addEventListener("ended", () => {
      if (this.#musicStopAfterTrack) {
        this.#musicStopAfterTrack = false;
        this.#musicSleepSelect.value = "off";
        this.#musicSleepStatus.textContent = "Stopped after the track.";
        this.#stopMusic();
        return;
      }
      void this.#nextTrack(true);
    });
    this.#audio.addEventListener("error", () => {
      if (this.#activeTrackId) this.#toast("This track could not be played by the browser.", "error");
      this.#renderMusicTransport();
    });

    this.#installMediaSessionHandlers();

    const player = element(
      "footer",
      { className: "kl-music-player" },
      element("div", { className: "kl-music-seek" }, this.#musicProgress, this.#musicTime),
      element(
        "div",
        { className: "kl-music-controls" },
        this.#musicShuffleButton,
        this.#musicPreviousButton,
        this.#musicPlayButton,
        this.#musicNextButton,
        this.#musicRepeatButton,
        this.#musicMuteButton,
        element("label", { className: "kl-music-volume" }, element("span", { text: "Volume" }), this.#musicVolume),
      ),
    );
    this.#musicPage.append(
      header,
      element("div", { className: "kl-music-body" }, library, element("div", { className: "kl-music-side" }, nowPlaying, add)),
      player,
    );
    void this.#renderMusicPage();
  }

  async #renderMusicPage(forceLocalRefresh = false): Promise<void> {
    const token = ++this.#musicRenderToken;
    const settings = this.settings.get().linkMusic;
    this.#playlistSelect.replaceChildren(
      ...settings.playlists.map((playlist) => selectOption(playlist.id, `${playlist.name} · ${playlist.tracks.length}`)),
    );
    this.#playlistSelect.value = settings.activePlaylistId;
    this.#musicVolume.value = settings.volume.toString();
    this.#audio.volume = settings.volume / 100;
    this.#musicRepeatButton.textContent = settings.repeatMode === "one"
      ? "Repeat one"
      : settings.repeatMode === "all"
        ? "Repeat all"
        : "Repeat off";
    this.#musicRepeatButton.dataset.active = String(settings.repeatMode !== "off");
    this.#musicShuffleButton.dataset.active = String(settings.shuffle);
    const playlist = activePlaylist(settings.playlists, settings.activePlaylistId);
    const localTracks = await this.#getLocalMusicTrackIds(forceLocalRefresh);
    if (token !== this.#musicRenderToken) return;
    let roomAdmin = false;
    try {
      roomAdmin = this.adapter.getRoomAdminSnapshot()?.isAdmin === true;
    } catch {
      // Bondage Club can briefly replace room globals while changing screens.
    }
    const query = this.#musicQueueSearch.value.trim().toLocaleLowerCase();
    const visibleTracks = playlist.tracks
      .map((track, index) => ({ track, index }))
      .filter(({ track }) => !query || `${track.title}\n${track.source}`.toLocaleLowerCase().includes(query));
    this.#musicQueueSummary.textContent = query
      ? `${visibleTracks.length} of ${playlist.tracks.length} tracks`
      : `${playlist.tracks.length} track${playlist.tracks.length === 1 ? "" : "s"}`;
    this.#musicQueue.replaceChildren(
      ...visibleTracks.map(({ track, index }) =>
        this.#musicTrackRow(track, index, localTracks, roomAdmin)),
    );
    if (visibleTracks.length === 0) {
      this.#musicQueue.append(
        element("div", {
          className: "kl-gallery-empty",
          text: playlist.tracks.length === 0 ? "This playlist is empty." : "No matching tracks.",
        }),
      );
    }
    this.#renderMusicTransport();
  }

  #musicTrackRow(
    track: MusicTrack,
    index: number,
    localTracks: Set<string>,
    roomAdmin: boolean,
  ): HTMLElement {
    const unavailable = track.source === "local" && !localTracks.has(track.locator);
    const play = element("button", {
      className: "kl-icon-button kl-music-track-play",
      type: "button",
      title: unavailable ? "Local file is unavailable on this device" : `Play ${track.title}`,
      ariaLabel: unavailable ? `${track.title} unavailable` : `Play ${track.title}`,
      onClick: () => void this.#playTrack(track),
    }, kikiIcon(this.#activeTrackId === track.id && !this.#audio.paused ? "pause" : "play"));
    play.disabled = unavailable;
    const menu = element("details", { className: "kl-music-track-menu" });
    const menuToggle = element("summary", {
      className: "kl-icon-button",
      title: `Actions for ${track.title}`,
      ariaLabel: `Actions for ${track.title}`,
    }, kikiIcon("more"));
    const actions = element("div", { className: "kl-music-track-menu-popover" });
    const directRoomUrl = track.source === "local"
      ? undefined
      : normalizeRoomTrackUrl(track.locator);
    if (roomAdmin && !unavailable && (track.source === "local" || directRoomUrl)) {
      actions.append(element("button", {
        className: "kl-music-track-room",
        type: "button",
        text: track.source === "local" ? "Share & use as room music" : "Use as room music",
        onClick: () => void this.#useMusicTrackAsRoomMusic(track),
      }));
    }
    actions.append(
      element("button", {
        type: "button",
        text: "Rename",
        onClick: () => this.#renameMusicTrack(track),
      }),
      element("button", {
        type: "button",
        text: "Move up",
        onClick: () => this.#moveMusicTrack(track, -1),
      }),
      element("button", {
        type: "button",
        text: "Move down",
        onClick: () => this.#moveMusicTrack(track, 1),
      }),
    );
    if (track.source !== "local") {
      const original = element("a", { text: "Open original" });
      original.href = track.locator;
      original.target = "_blank";
      original.rel = "noopener noreferrer";
      actions.append(original);
    }
    actions.append(element("button", {
      className: "kl-music-track-delete",
      type: "button",
      text: "Remove",
      onClick: () => void this.#removeMusicTrack(track),
    }));
    menu.append(menuToggle, actions);
    const row = element(
      "article",
      { className: "kl-music-track" },
      element("span", { className: "kl-music-track-number", text: (index + 1).toString() }),
      play,
      element(
        "div",
        { className: "kl-music-track-copy" },
        element("strong", { text: track.title }),
        element("span", {
          text: unavailable
            ? "Local file missing on this device"
            : track.source === "local"
              ? "On this device"
              : track.source === "catbox"
                ? "Catbox"
                : "Direct link",
        }),
      ),
      menu,
    );
    row.dataset.active = String(this.#activeTrackId === track.id);
    row.dataset.trackId = track.id;
    return row;
  }

  async #useMusicTrackAsRoomMusic(track: MusicTrack): Promise<void> {
    let roomAdmin = false;
    try {
      roomAdmin = this.adapter.getRoomAdminSnapshot()?.isAdmin === true;
    } catch {
      // Treat a temporarily unavailable room snapshot as read-only.
    }
    if (!roomAdmin) {
      this.#toast("Only a room administrator can change room music.", "error");
      return;
    }

    const uploadSettings = this.settings.get().linkChat.imageUploads;
    const config = track.source === "local" && uploadSettings.enabled
      ? normalizeLitterboxUploadConfig(uploadSettings)
      : null;
    if (track.source === "local" && !config) {
      this.#toast("Enable temporary shared uploads in Chat settings first.", "error");
      this.#openSettings("chat");
      return;
    }

    try {
      if (track.source === "local" && config) {
        this.#toast(`Sharing “${track.title}” for ${formatRetention(config.retention)}…`);
      }
      const roomUrl = await this.#roomUrlForMusicTrack(track, config ?? undefined);
      const liveSnapshot = this.adapter.getRoomAdminSnapshot();
      if (!liveSnapshot?.isAdmin) {
        throw new Error("Room administrator rights were lost before the music was ready");
      }
      await this.#openRoomTools(true);
      this.#roomMusicUrl.value = roomUrl;
      this.#toast(track.source === "local" && config
        ? `Music shared for ${formatRetention(config.retention)}. Review it, then apply room media.`
        : "Music selected. Review it, then apply room media.");
    } catch (error) {
      this.#toast(
        error instanceof Error ? error.message : "The room music could not be prepared.",
        "error",
      );
    }
  }

  async #addMusicTrack(): Promise<void> {
    if (this.#musicAddButton.disabled) return;
    this.#musicAddButton.disabled = true;
    this.#musicAddStatus.textContent = "";
    const staged: MusicTrack[] = [];
    let committed = false;
    try {
      const trackCount = this.settings.get().linkMusic.playlists.reduce(
        (total, playlist) => total + playlist.tracks.length,
        0,
      );
      const files = [...(this.#musicFileInput.files ?? [])];
      const addCount = Math.max(1, files.length);
      if (trackCount + addCount > 100) {
        throw new Error(`You can add ${Math.max(0, 100 - trackCount)} more tracks`);
      }
      if (files.length > 0) {
        for (const [index, file] of files.entries()) {
          let source: MusicTrack["source"];
          let locator: string;
          let fallbackTitle = file.name.replace(/\.[^.]+$/u, "");
          if (this.#musicFileMode.value === "catbox") {
            this.#musicAddStatus.textContent = `Uploading ${index + 1}/${files.length} to Catbox…`;
            locator = await uploadMusicToCatbox(file, undefined, (progress) => {
              const amount = progress.percent === undefined ? "" : ` · ${progress.percent}%`;
              this.#musicAddStatus.textContent = `Uploading ${index + 1}/${files.length}${amount}`;
            });
            source = "catbox";
          } else {
            this.#musicAddStatus.textContent = `Saving ${index + 1}/${files.length} on this device…`;
            const localTrackIds = await this.#getLocalMusicTrackIds();
            const stored = await this.musicStore.add(file);
            locator = stored.id;
            fallbackTitle = stored.name.replace(/\.[^.]+$/u, "");
            source = "local";
            localTrackIds.add(stored.id);
          }
          staged.push({
            id: createLocalId("track"),
            title: ((files.length === 1 ? this.#musicTitleInput.value.trim() : "") || fallbackTitle || "Untitled track").slice(0, 80),
            source,
            locator,
            addedAt: Date.now(),
          });
        }
      } else {
        const locator = normalizeAudioTrackUrl(this.#musicUrlInput.value);
        staged.push({
          id: createLocalId("track"),
          title: (this.#musicTitleInput.value.trim() || trackTitleFromUrl(locator) || "Untitled track").slice(0, 80),
          source: "url",
          locator,
          addedAt: Date.now(),
        });
      }
      this.#appendMusicTracks(staged);
      committed = true;
      this.#musicTitleInput.value = "";
      this.#musicUrlInput.value = "";
      this.#musicFileInput.value = "";
      this.#musicAddStatus.textContent = staged.length === 1
        ? `Added “${staged[0]!.title}”.`
        : `Added ${staged.length} tracks.`;
      await this.#renderMusicPage();
    } catch (error) {
      const message = error instanceof Error ? error.message : "The track could not be added.";
      if (staged.length > 0 && !committed) {
        this.#appendMusicTracks(staged);
        committed = true;
        this.#musicTitleInput.value = "";
        this.#musicUrlInput.value = "";
        this.#musicFileInput.value = "";
        await this.#renderMusicPage();
        this.#musicAddStatus.textContent = `Added ${staged.length}; stopped because: ${message}`;
      } else {
        this.#musicAddStatus.textContent = message;
      }
      this.#toast(this.#musicAddStatus.textContent, "error");
    } finally {
      this.#musicAddButton.disabled = false;
    }
  }

  #createPlaylist(): void {
    if (this.settings.get().linkMusic.playlists.length >= 8) {
      this.#toast("KikiLink supports up to 8 playlists.", "error");
      return;
    }
    const value = typeof prompt === "function" ? prompt("Playlist name", "New playlist") : "New playlist";
    const name = value?.trim().slice(0, 60);
    if (!name) return;
    const id = createLocalId("playlist");
    this.settings.update((draft) => {
      draft.linkMusic.playlists.push({ id, name, tracks: [] });
      draft.linkMusic.activePlaylistId = id;
    });
    void this.#renderMusicPage();
  }

  #renameActivePlaylist(): void {
    const music = this.settings.get().linkMusic;
    const playlist = activePlaylist(music.playlists, music.activePlaylistId);
    const value = typeof prompt === "function" ? prompt("Playlist name", playlist.name) : playlist.name;
    const name = value?.trim().slice(0, 60);
    if (!name || name === playlist.name) return;
    this.settings.update((draft) => {
      activePlaylist(draft.linkMusic.playlists, draft.linkMusic.activePlaylistId).name = name;
    });
    void this.#renderMusicPage();
  }

  #duplicateActivePlaylist(): void {
    const music = this.settings.get().linkMusic;
    if (music.playlists.length >= 8) {
      this.#toast("KikiLink supports up to 8 playlists.", "error");
      return;
    }
    const playlist = activePlaylist(music.playlists, music.activePlaylistId);
    const total = music.playlists.reduce((count, candidate) => count + candidate.tracks.length, 0);
    if (total + playlist.tracks.length > 100) {
      this.#toast("Duplicating this playlist would exceed 100 saved tracks.", "error");
      return;
    }
    const id = createLocalId("playlist");
    this.settings.update((draft) => {
      const source = activePlaylist(draft.linkMusic.playlists, draft.linkMusic.activePlaylistId);
      draft.linkMusic.playlists.push({
        id,
        name: `${source.name} copy`.slice(0, 60),
        tracks: source.tracks.map((track) => ({ ...track, id: createLocalId("track"), addedAt: Date.now() })),
      });
      draft.linkMusic.activePlaylistId = id;
    });
    void this.#renderMusicPage();
  }

  async #clearActivePlaylist(): Promise<void> {
    const music = this.settings.get().linkMusic;
    const playlist = activePlaylist(music.playlists, music.activePlaylistId);
    if (playlist.tracks.length === 0) return;
    if (typeof confirm === "function" && !confirm(`Remove all tracks from “${playlist.name}”?`)) return;
    const removed = [...playlist.tracks];
    if (this.#activeTrackId && removed.some((track) => track.id === this.#activeTrackId)) this.#stopMusic();
    this.settings.update((draft) => {
      activePlaylist(draft.linkMusic.playlists, draft.linkMusic.activePlaylistId).tracks = [];
    });
    await this.#deleteOrphanedLocalTracks(removed);
    await this.#renderMusicPage();
  }

  async #deleteActivePlaylist(): Promise<void> {
    const music = this.settings.get().linkMusic;
    const playlist = activePlaylist(music.playlists, music.activePlaylistId);
    if (music.playlists.length <= 1) {
      this.#toast("Keep at least one playlist.", "error");
      return;
    }
    if (typeof confirm === "function" && !confirm(`Delete playlist “${playlist.name}”?`)) return;
    const removed = [...playlist.tracks];
    const removedTrackIds = new Set(removed.map((track) => track.id));
    if (this.#activeTrackId && removedTrackIds.has(this.#activeTrackId)) this.#stopMusic();
    this.settings.update((draft) => {
      draft.linkMusic.playlists = draft.linkMusic.playlists.filter((candidate) => candidate.id !== playlist.id);
      draft.linkMusic.activePlaylistId = draft.linkMusic.playlists[0]!.id;
    });
    await this.#deleteOrphanedLocalTracks(removed);
    await this.#renderMusicPage();
  }

  async #removeMusicTrack(track: MusicTrack): Promise<void> {
    if (this.#activeTrackId === track.id) this.#stopMusic();
    this.settings.update((draft) => {
      const playlist = activePlaylist(draft.linkMusic.playlists, draft.linkMusic.activePlaylistId);
      playlist.tracks = playlist.tracks.filter((candidate) => candidate.id !== track.id);
    });
    await this.#deleteOrphanedLocalTracks([track]);
    await this.#renderMusicPage();
  }

  #renameMusicTrack(track: MusicTrack): void {
    const value = typeof prompt === "function" ? prompt("Track title", track.title) : track.title;
    const title = value?.trim().slice(0, 80);
    if (!title || title === track.title) return;
    this.settings.update((draft) => {
      const playlist = activePlaylist(draft.linkMusic.playlists, draft.linkMusic.activePlaylistId);
      const saved = playlist.tracks.find((candidate) => candidate.id === track.id);
      if (saved) saved.title = title;
    });
    void this.#renderMusicPage();
  }

  #moveMusicTrack(track: MusicTrack, direction: -1 | 1): void {
    this.settings.update((draft) => {
      const playlist = activePlaylist(draft.linkMusic.playlists, draft.linkMusic.activePlaylistId);
      const index = playlist.tracks.findIndex((candidate) => candidate.id === track.id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= playlist.tracks.length) return;
      const [moved] = playlist.tracks.splice(index, 1);
      if (moved) playlist.tracks.splice(target, 0, moved);
    });
    void this.#renderMusicPage();
  }

  async #playTrack(track: MusicTrack): Promise<void> {
    let source: string;
    if (track.source === "local") {
      const stored = await this.musicStore.get(track.locator);
      if (!stored) {
        this.#toast("This local track is not stored on this device.", "error");
        await this.#renderMusicPage();
        return;
      }
      this.#releaseMusicObjectUrl();
      source = URL.createObjectURL(stored.blob);
      this.#musicObjectUrl = source;
    } else {
      this.#releaseMusicObjectUrl();
      source = track.locator;
    }
    this.#activeTrackId = track.id;
    this.#audio.src = source;
    this.#audio.load();
    try {
      await this.#audio.play();
    } catch (error) {
      this.#toast(error instanceof Error ? error.message : "The browser blocked playback.", "error");
    }
    await this.#renderMusicPage();
  }

  async #toggleMusicPlayback(): Promise<void> {
    if (!this.#activeTrackId) {
      const settings = this.settings.get().linkMusic;
      const first = activePlaylist(settings.playlists, settings.activePlaylistId).tracks[0];
      if (first) await this.#playTrack(first);
      return;
    }
    if (this.#audio.paused) {
      try {
        await this.#audio.play();
      } catch (error) {
        this.#toast(error instanceof Error ? error.message : "The browser blocked playback.", "error");
      }
    } else {
      this.#audio.pause();
    }
  }

  async #previousTrack(): Promise<void> {
    if (this.#audio.currentTime > 3) {
      this.#audio.currentTime = 0;
      return;
    }
    const settings = this.settings.get().linkMusic;
    const tracks = activePlaylist(settings.playlists, settings.activePlaylistId).tracks;
    if (tracks.length === 0) return;
    const index = tracks.findIndex((track) => track.id === this.#activeTrackId);
    const previous = tracks[(index <= 0 ? tracks.length : index) - 1];
    if (previous) await this.#playTrack(previous);
  }

  async #nextTrack(fromEnded: boolean): Promise<void> {
    const settings = this.settings.get().linkMusic;
    const tracks = activePlaylist(settings.playlists, settings.activePlaylistId).tracks;
    if (tracks.length === 0) return;
    if (fromEnded && settings.repeatMode === "one") {
      this.#audio.currentTime = 0;
      await this.#audio.play().catch(() => undefined);
      return;
    }
    const index = tracks.findIndex((track) => track.id === this.#activeTrackId);
    let nextIndex = index + 1;
    if (settings.shuffle && tracks.length > 1) {
      do nextIndex = Math.floor(Math.random() * tracks.length);
      while (nextIndex === index);
    } else if (nextIndex >= tracks.length) {
      if (!fromEnded || settings.repeatMode === "all") nextIndex = 0;
      else {
        this.#audio.pause();
        this.#audio.currentTime = 0;
        this.#renderMusicTransport();
        return;
      }
    }
    const next = tracks[Math.max(0, nextIndex)];
    if (next) await this.#playTrack(next);
  }

  #cycleMusicRepeat(): void {
    this.settings.update((draft) => {
      draft.linkMusic.repeatMode = draft.linkMusic.repeatMode === "off"
        ? "all"
        : draft.linkMusic.repeatMode === "all"
          ? "one"
          : "off";
    });
    void this.#renderMusicPage();
  }

  #toggleMusicShuffle(): void {
    this.settings.update((draft) => {
      draft.linkMusic.shuffle = !draft.linkMusic.shuffle;
    });
    void this.#renderMusicPage();
  }

  #renderMusicTransport(): void {
    const settings = this.settings.get().linkMusic;
    const track = settings.playlists.flatMap((playlist) => playlist.tracks)
      .find((candidate) => candidate.id === this.#activeTrackId);
    this.#musicNowTitle.textContent = track?.title ?? "Nothing playing";
    this.#musicNowSource.textContent = track
      ? track.source === "local"
        ? "On this device"
        : track.source === "catbox"
          ? "Catbox"
          : "Direct link"
      : "Choose a track";
    this.#musicPlayButton.replaceChildren(kikiIcon(track && !this.#audio.paused ? "pause" : "play"));
    this.#musicPlayButton.title = track && !this.#audio.paused ? "Pause" : "Play";
    this.#musicPlayButton.setAttribute("aria-label", this.#musicPlayButton.title);
    this.#musicArtwork.dataset.playing = String(Boolean(track && !this.#audio.paused));
    this.#musicMuteButton.textContent = this.#audio.muted ? "Unmute" : "Mute";
    this.#musicMuteButton.dataset.active = String(this.#audio.muted);
    this.#renderMusicProgress();
    for (const row of this.#musicQueue.querySelectorAll<HTMLElement>(".kl-music-track")) {
      const button = row.querySelector<HTMLButtonElement>(".kl-music-track-play");
      if (!button) continue;
      const active = row.dataset.trackId === track?.id;
      row.dataset.active = String(active);
      button.replaceChildren(kikiIcon(active && !this.#audio.paused ? "pause" : "play"));
    }
    this.#updateMediaSession(track);
  }

  #renderMusicProgress(): void {
    const duration = Number.isFinite(this.#audio.duration) && this.#audio.duration > 0
      ? this.#audio.duration
      : 0;
    const current = Number.isFinite(this.#audio.currentTime) ? this.#audio.currentTime : 0;
    this.#musicProgress.value = duration > 0
      ? Math.round(Math.min(1, current / duration) * 1000).toString()
      : "0";
    this.#musicProgress.disabled = duration <= 0;
    this.#musicTime.textContent = `${formatAudioTime(current)} / ${formatAudioTime(duration)}`;
    this.#updateMediaSessionPosition(current, duration);
  }

  #stopMusic(): void {
    this.#audio.pause();
    this.#audio.removeAttribute("src");
    this.#activeTrackId = undefined;
    this.#releaseMusicObjectUrl();
    this.#renderMusicTransport();
  }

  #appendMusicTracks(tracks: MusicTrack[]): void {
    if (tracks.length === 0) return;
    this.settings.update((draft) => {
      const playlist = activePlaylist(draft.linkMusic.playlists, draft.linkMusic.activePlaylistId);
      playlist.tracks.push(...tracks);
    });
  }

  async #getLocalMusicTrackIds(force = false): Promise<Set<string>> {
    if (!force && this.#localMusicTrackIds) return this.#localMusicTrackIds;
    if (!force && this.#localMusicTrackIdsPromise) return this.#localMusicTrackIdsPromise;
    const load = this.musicStore.list()
      .catch(() => [])
      .then((tracks) => {
        this.#localMusicTrackIds = new Set(tracks.map((track) => track.id));
        return this.#localMusicTrackIds;
      });
    this.#localMusicTrackIdsPromise = load;
    try {
      return await load;
    } finally {
      if (this.#localMusicTrackIdsPromise === load) this.#localMusicTrackIdsPromise = undefined;
    }
  }

  async #deleteOrphanedLocalTracks(tracks: MusicTrack[]): Promise<void> {
    const locators = new Set(
      tracks.filter((track) => track.source === "local").map((track) => track.locator),
    );
    if (locators.size === 0) return;
    const stillUsed = new Set(
      this.settings.get().linkMusic.playlists.flatMap((playlist) =>
        playlist.tracks.filter((track) => track.source === "local").map((track) => track.locator),
      ),
    );
    const localTrackIds = await this.#getLocalMusicTrackIds();
    await Promise.all([...locators]
      .filter((locator) => !stillUsed.has(locator))
      .map(async (locator) => {
        await this.musicStore.delete(locator).catch(() => undefined);
        localTrackIds.delete(locator);
        this.#sharedRoomMusic.delete(locator);
      }));
  }

  #setMusicSleepTimer(): void {
    this.#clearMusicSleepTimer();
    const value = this.#musicSleepSelect.value;
    if (value === "off") {
      this.#musicSleepStatus.textContent = "";
      return;
    }
    if (value === "end") {
      this.#musicStopAfterTrack = true;
      this.#musicSleepStatus.textContent = "Playback will stop after this track.";
      return;
    }
    const minutes = Number(value);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const stopAt = Date.now() + minutes * 60_000;
    this.#musicSleepStatus.textContent = `Stops at ${new Date(stopAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`;
    this.#musicSleepTimer = setTimeout(() => {
      this.#musicSleepTimer = undefined;
      this.#musicSleepSelect.value = "off";
      this.#musicSleepStatus.textContent = "Sleep timer finished.";
      this.#stopMusic();
    }, minutes * 60_000);
  }

  #clearMusicSleepTimer(): void {
    if (this.#musicSleepTimer !== undefined) clearTimeout(this.#musicSleepTimer);
    this.#musicSleepTimer = undefined;
    this.#musicStopAfterTrack = false;
  }

  #installMediaSessionHandlers(): void {
    if (!("mediaSession" in navigator)) return;
    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
      play: () => void this.#toggleMusicPlayback(),
      pause: () => this.#audio.pause(),
      previoustrack: () => void this.#previousTrack(),
      nexttrack: () => void this.#nextTrack(false),
      seekbackward: (details) => {
        this.#audio.currentTime = Math.max(0, this.#audio.currentTime - (details.seekOffset ?? 10));
      },
      seekforward: (details) => {
        this.#audio.currentTime = Math.min(this.#audio.duration || Infinity, this.#audio.currentTime + (details.seekOffset ?? 10));
      },
      seekto: (details) => {
        if (typeof details.seekTime === "number") this.#audio.currentTime = details.seekTime;
      },
    };
    for (const [action, handler] of Object.entries(handlers) as [MediaSessionAction, MediaSessionActionHandler][]) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some browsers expose Media Session but only implement a subset of actions.
      }
    }
  }

  #updateMediaSession(track: MusicTrack | undefined): void {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.playbackState = track
        ? this.#audio.paused ? "paused" : "playing"
        : "none";
      if (!track) {
        navigator.mediaSession.metadata = null;
        return;
      }
      if (typeof MediaMetadata === "function") {
        const music = this.settings.get().linkMusic;
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: "KikiLink",
          album: activePlaylist(music.playlists, music.activePlaylistId).name,
          artwork: [{ src: KIKILINK_EMBLEM_DATA_URL, type: "image/webp" }],
        });
      }
    } catch {
      // Media metadata is a progressive enhancement and must never stop playback.
    }
  }

  #updateMediaSessionPosition(current: number, duration: number): void {
    if (!("mediaSession" in navigator) || duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: this.#audio.playbackRate || 1,
        position: Math.max(0, Math.min(current, duration)),
      });
    } catch {
      // Firefox and older Chromium versions may expose only part of Media Session.
    }
  }

  #clearMediaSession(): void {
    if (!("mediaSession" in navigator)) return;
    for (const action of ["play", "pause", "previoustrack", "nexttrack", "seekbackward", "seekforward", "seekto"] as MediaSessionAction[]) {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch {
        // Ignore unsupported actions during teardown.
      }
    }
    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    } catch {
      // Ignore partial Media Session implementations.
    }
  }

  #releaseMusicObjectUrl(): void {
    if (!this.#musicObjectUrl) return;
    URL.revokeObjectURL(this.#musicObjectUrl);
    this.#musicObjectUrl = undefined;
  }

  async #roomUrlForMusicTrack(
    track: MusicTrack,
    config?: LitterboxUploadConfig,
  ): Promise<string> {
    if (track.source !== "local") {
      const roomUrl = normalizeRoomTrackUrl(track.locator);
      if (!roomUrl) {
        throw new Error("Bondage Club room music must use a direct HTTPS MP3 or MP4 link");
      }
      return roomUrl;
    }
    if (!config) throw new Error("Enable temporary shared uploads in Chat settings first");

    const cached = this.#sharedRoomMusic.get(track.locator);
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url;
    this.#sharedRoomMusic.delete(track.locator);

    const pending = this.#pendingRoomMusicUploads.get(track.locator);
    if (pending) return pending;
    const upload = (async () => {
      const stored = await this.musicStore.get(track.locator);
      if (!stored) throw new Error("This local track is not stored on this device");
      const url = await uploadLocalRoomAudio(deviceRoomMusicFile(stored), config);
      this.#sharedRoomMusic.set(track.locator, {
        url,
        expiresAt: Date.now() + litterboxRetentionMs(config.retention),
      });
      return url;
    })();
    this.#pendingRoomMusicUploads.set(track.locator, upload);
    try {
      return await upload;
    } finally {
      if (this.#pendingRoomMusicUploads.get(track.locator) === upload) {
        this.#pendingRoomMusicUploads.delete(track.locator);
      }
    }
  }

  async #syncPlayingTrackToRoom(force = false): Promise<void> {
    if (!this.#roomPlaylistSyncEnabled || !this.#activeTrackId || this.#audio.paused) return;
    const settings = this.settings.get().linkMusic;
    const track = settings.playlists.flatMap((playlist) => playlist.tracks)
      .find((candidate) => candidate.id === this.#activeTrackId);
    if (!track) return;
    const snapshot = this.adapter.getRoomAdminSnapshot();
    if (!snapshot?.isAdmin) {
      this.#roomPlaylistSyncEnabled = false;
      this.#roomPlaylistSync.checked = false;
      this.#roomPlaylistSyncStatus.textContent = "Playlist follow stopped because you are not a room administrator.";
      if (force) this.#toast(this.#roomPlaylistSyncStatus.textContent, "error");
      return;
    }

    const uploadSettings = this.settings.get().linkChat.imageUploads;
    const config = track.source === "local" && uploadSettings.enabled
      ? normalizeLitterboxUploadConfig(uploadSettings)
      : null;
    if (track.source === "local" && !config) {
      this.#roomPlaylistSyncStatus.textContent =
        "Enable temporary shared uploads in Chat settings to use device tracks as room music.";
      if (force) this.#toast(this.#roomPlaylistSyncStatus.textContent, "error");
      return;
    }

    try {
      if (track.source === "local" && config) {
        this.#roomPlaylistSyncStatus.textContent =
          `Sharing “${track.title}” for room playback…`;
      }
      const activeTrackId = track.id;
      const roomUrl = await this.#roomUrlForMusicTrack(track, config ?? undefined);
      if (
        !this.#roomPlaylistSyncEnabled ||
        this.#activeTrackId !== activeTrackId ||
        this.#audio.paused
      ) {
        return;
      }
      if (!force && roomUrl === this.#lastRoomSyncedTrackUrl) return;
      const liveSnapshot = this.adapter.getRoomAdminSnapshot();
      if (!liveSnapshot?.isAdmin) {
        this.#roomPlaylistSyncEnabled = false;
        this.#roomPlaylistSync.checked = false;
        this.#roomPlaylistSyncStatus.textContent =
          "Playlist follow stopped because you are not a room administrator.";
        if (force) this.#toast(this.#roomPlaylistSyncStatus.textContent, "error");
        return;
      }
      this.adapter.updateRoomCustomization({
        ...liveSnapshot.customization,
        musicUrl: roomUrl,
        musicSync: true,
      });
      this.#lastRoomSyncedTrackUrl = roomUrl;
      this.#roomMusicUrl.value = roomUrl;
      this.#roomMusicSync.checked = true;
      this.#roomPlaylistSyncStatus.textContent = `Room now follows “${track.title}”.`;
    } catch (error) {
      this.#roomPlaylistSyncStatus.textContent = error instanceof Error
        ? error.message
        : "The room music could not be updated.";
      if (force) this.#toast(this.#roomPlaylistSyncStatus.textContent, "error");
    }
  }

  #buildRosterPage(): void {
    const header = element(
      "header",
      { className: "kl-feature-page-header" },
      element(
        "div",
        { className: "kl-feature-page-heading" },
        element("div", { className: "kl-feature-page-eyebrow", text: "PEOPLE" }),
        element("h1", { className: "kl-feature-page-title", text: "Players" }),
        this.#rosterSubtitle,
      ),
      element("button", {
        className: "kl-text-button",
        type: "button",
        text: "New chat",
        onClick: () => this.#openNewChat(),
      }),
    );

    for (const [scope, label] of [
      ["current", "In room"],
      ["known", "Known"],
      ["favorites", "Favorites"],
    ] as const) {
      const button = element("button", {
        className: "kl-roster-scope",
        type: "button",
        text: label,
      });
      button.dataset.scope = scope;
      button.addEventListener("click", () => {
        this.#saveNotebook(false);
        this.#rosterScope = scope;
        this.#selectedRosterMember = undefined;
        this.#renderRoster();
      });
      this.#rosterScopes.append(button);
    }

    this.#rosterSearch.type = "search";
    this.#rosterSearch.placeholder = "Search name, number, tag, or note";
    this.#rosterSearch.autocomplete = "off";
    this.#rosterSearch.addEventListener("input", () => this.#renderRoster());

    const listPane = element(
      "section",
      { className: "kl-roster-list-pane" },
      this.#rosterScopes,
      this.#rosterSearch,
      this.#rosterList,
    );
    const body = element(
      "div",
      { className: "kl-roster-body" },
      listPane,
      this.#rosterDetail,
    );
    const privacy = element("div", {
      className: "kl-roster-privacy",
      text: "Notes, tags, favorites, and encounter history belong only to this BC account.",
    });
    const footer = element("footer", { className: "kl-feature-page-footer" }, privacy);
    this.#saveNotebookButton.addEventListener("click", () => this.#saveNotebook(true));
    this.#rosterNote.maxLength = 2000;
    this.#rosterNote.rows = 7;
    this.#rosterNote.placeholder = "Private note about this player…";
    this.#rosterNote.addEventListener("input", () => {
      this.#notebookDirty = true;
      this.#saveNotebookButton.disabled = false;
    });
    this.#rosterNote.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        this.#saveNotebook(true);
      }
    });
    this.#rosterTags.maxLength = 200;
    this.#rosterTags.placeholder = "friend, roleplay, trusted";
    this.#rosterTags.addEventListener("input", () => {
      this.#notebookDirty = true;
      this.#saveNotebookButton.disabled = false;
    });
    this.#rosterPage.append(header, body, footer);
  }

  #openRoster(memberNumber?: number): void {
    if (!this.settings.get().linkRoster.enabled) {
      this.#openSettings("players");
      this.#rosterEnabledToggle.focus();
      this.#toast("Enable LinkRoster here to add it back to your deck.");
      return;
    }
    this.#showWorkspace("roster");
    this.roster.sync();
    this.#rosterSearch.value = "";
    const selectedEntry =
      memberNumber === undefined
        ? undefined
        : this.roster.list("known").find((entry) => entry.memberNumber === memberNumber);
    this.#rosterScope =
      selectedEntry?.present === true
        ? "current"
        : memberNumber !== undefined
          ? "known"
          : this.adapter.isInChatRoom()
            ? "current"
            : "known";
    this.#selectedRosterMember = memberNumber;
    this.#notebookDirty = false;
    this.#renderRoster();
    if (memberNumber !== undefined) {
      this.#rosterList
        .querySelector<HTMLButtonElement>(`[data-member-number="${memberNumber}"]`)
        ?.focus();
    } else {
      this.#rosterSearch.focus();
    }
  }

  #renderRoster(): void {
    const roomName = this.adapter.getCurrentRoomName();
    this.#rosterSubtitle.textContent = roomName
      ? `${roomName} · private player notebook`
      : "Private player notebook";
    for (const button of this.#rosterScopes.querySelectorAll<HTMLButtonElement>(
      ".kl-roster-scope",
    )) {
      button.dataset.active = String(button.dataset.scope === this.#rosterScope);
    }

    const entries = this.roster.list(this.#rosterScope, this.#rosterSearch.value);
    if (!entries.some((entry) => entry.memberNumber === this.#selectedRosterMember)) {
      this.#selectedRosterMember = entries[0]?.memberNumber;
      this.#notebookDirty = false;
    }

    this.#rosterList.replaceChildren();
    if (entries.length === 0) {
      this.#rosterList.append(
        element("div", {
          className: "kl-roster-empty",
          text:
            this.#rosterScope === "current" && !this.adapter.isInChatRoom()
              ? "Join a chat room to see its roster."
              : this.#rosterScope === "favorites"
                ? "No favorite players yet. Use the star on any player."
                : this.#rosterSearch.value
                  ? "No players match this search."
                  : "No players recorded yet.",
        }),
      );
    } else {
      for (const entry of entries) this.#rosterList.append(this.#rosterEntryButton(entry));
      this.presence.requestMany(entries.slice(0, 60).map((entry) => entry.memberNumber));
    }

    const selected = entries.find(
      (entry) => entry.memberNumber === this.#selectedRosterMember,
    );
    if (!this.#notebookDirty) this.#renderRosterDetail(selected);
  }

  #rosterEntryButton(entry: RosterEntry): HTMLButtonElement {
    const presence = this.presence.get(entry.memberNumber);
    const badges = element("div", { className: "kl-roster-entry-badges" });
    if (entry.present) {
      badges.append(element("span", { className: "kl-roster-badge kl-roster-live", text: "HERE" }));
    }
    const status = element("span", {
      className: "kl-roster-badge kl-roster-presence-label",
      text: presenceLabel(presence.status),
    });
    status.dataset.status = presence.status;
    status.dataset.presenceLabel = "true";
    status.hidden = presence.status === "unknown";
    badges.append(status);
    if (entry.isFriend) {
      badges.append(element("span", { className: "kl-roster-badge kl-roster-friend", text: "FRIEND" }));
    }
    for (const relationship of entry.relationships) {
      badges.append(
        element("span", {
          className: `kl-roster-badge kl-roster-relationship kl-roster-relationship--${relationship}`,
          text: rosterRelationshipLabel(relationship).toUpperCase(),
          title: rosterRelationshipDescription(relationship),
        }),
      );
    }
    if (entry.favorite) badges.append(kikiIcon("star", "kl-roster-favorite", true));
    const preview = entry.tags.length
      ? entry.tags.join(" · ")
      : entry.note
        ? entry.note.replace(/\s+/gu, " ")
        : entry.lastRoomName || `Member ${entry.memberNumber}`;
    const button = element(
      "button",
      { className: "kl-roster-entry", type: "button" },
      element(
        "div",
        { className: "kl-avatar-wrap" },
        this.#avatar(entry.displayName, entry.memberNumber),
        presenceDot(presence.status),
      ),
      element(
        "div",
        { className: "kl-roster-entry-copy" },
        element(
          "div",
          { className: "kl-roster-entry-name-row" },
          element("span", { className: "kl-roster-entry-name", text: entry.displayName }),
          badges,
        ),
        element("div", { className: "kl-roster-entry-preview", text: preview }),
      ),
      element("span", {
        className: "kl-roster-entry-time",
        text: entry.present ? "now" : formatRelativeTime(entry.lastSeenAt),
      }),
    );
    button.dataset.selected = String(entry.memberNumber === this.#selectedRosterMember);
    button.dataset.memberNumber = entry.memberNumber.toString();
    button.addEventListener("click", () => {
      if (entry.memberNumber === this.#selectedRosterMember) return;
      this.#saveNotebook(false);
      this.#selectedRosterMember = entry.memberNumber;
      this.#notebookDirty = false;
      this.#renderRoster();
    });
    this.#bindProfileMenu(button, () => ({
      memberNumber: entry.memberNumber,
      displayName: entry.displayName,
    }));
    return button;
  }

  #renderRosterDetail(entry: RosterEntry | undefined): void {
    this.#rosterDetail.replaceChildren();
    if (!entry) {
      this.#rosterDetail.append(
        element("div", {
          className: "kl-roster-detail-empty",
          text: "Select a player to open quick actions and private notes.",
        }),
      );
      return;
    }

    const favorite = element("button", {
      className: "kl-icon-button kl-roster-star",
      type: "button",
      title: entry.favorite ? "Remove from favorites" : "Add to favorites",
      ariaLabel: entry.favorite ? "Remove from favorites" : "Add to favorites",
      onClick: () => {
        this.#saveNotebook(false);
        this.roster.toggleFavorite(entry.memberNumber, entry.displayName);
        this.#notebookDirty = false;
        this.#renderRoster();
      },
    });
    favorite.append(kikiIcon("star", "kl-favorite-icon", entry.favorite));
    const presence = this.presence.get(entry.memberNumber);
    const detailBadges = element("div", { className: "kl-roster-detail-badges" });
    if (entry.present) {
      detailBadges.append(element("span", { className: "kl-roster-badge kl-roster-live", text: "HERE" }));
    }
    if (entry.isFriend) {
      detailBadges.append(element("span", { className: "kl-roster-badge kl-roster-friend", text: "FRIEND" }));
    }
    for (const relationship of entry.relationships) {
      detailBadges.append(
        element("span", {
          className: `kl-roster-badge kl-roster-relationship kl-roster-relationship--${relationship}`,
          text: rosterRelationshipLabel(relationship).toUpperCase(),
          title: rosterRelationshipDescription(relationship),
        }),
      );
    }
    const identity = element(
      "div",
      { className: "kl-roster-identity" },
      element(
        "div",
        { className: "kl-avatar-wrap" },
        this.#avatar(entry.displayName, entry.memberNumber, "kl-roster-avatar"),
        presenceDot(presence.status),
      ),
      element(
        "div",
        { className: "kl-roster-identity-copy" },
        element("div", { className: "kl-roster-name", text: entry.displayName }),
        element("div", {
          className: "kl-roster-number",
          text: `Member ${entry.memberNumber}${entry.present ? " · in this room" : ""}`,
        }),
        detailBadges.childElementCount > 0 ? detailBadges : null,
        element(
          "div",
          { className: "kl-roster-detail-presence", title: presenceDescription(presence) },
          presenceDot(presence.status),
          element("span", { text: presenceLabel(presence.status) }),
          presence.statusMessage
            ? element("span", { className: "kl-presence-note", text: presence.statusMessage })
            : null,
        ),
      ),
      favorite,
    );
    identity.dataset.memberNumber = entry.memberNumber.toString();
    const detailPresence = identity.querySelector<HTMLElement>(".kl-roster-detail-presence");
    if (detailPresence) detailPresence.dataset.presenceDescription = "true";
    const detailPresenceLabel = detailPresence?.querySelector<HTMLElement>("span:not(.kl-presence-dot)");
    if (detailPresenceLabel) detailPresenceLabel.dataset.presenceLabel = "true";

    const whisper = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Whisper",
      title: entry.present ? "Set native Whisper target" : "Player is not in this room",
      onClick: () => this.#startRosterWhisper(entry),
    });
    whisper.disabled = !entry.present;
    const beep = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Beep",
      onClick: () => void this.#openRosterBeep(entry),
    });
    const profile = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Profile",
      title: entry.present ? "Open native profile" : "Player is not in this room",
      onClick: () => this.#openRosterProfile(entry),
    });
    profile.disabled = !entry.present;
    const copy = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Copy ID",
      onClick: () => void this.#copyRosterMemberNumber(entry.memberNumber),
    });
    const quickActions = element(
      "div",
      { className: "kl-roster-quick-actions" },
      whisper,
      beep,
      profile,
      copy,
    );

    const stats = element(
      "div",
      { className: "kl-roster-stats" },
      this.#rosterStat("Last seen", entry.present ? "Now" : formatFullSeenTime(entry.lastSeenAt)),
      this.#rosterStat("Last room", entry.lastRoomName || "Not recorded"),
      this.#rosterStat("Encounters", entry.encounterCount.toString()),
    );
    this.#rosterTags.value = entry.tags.join(", ");
    this.#rosterNote.value = entry.note;
    this.#saveNotebookButton.disabled = true;
    const notebook = element(
      "div",
      { className: "kl-roster-notebook" },
      element("label", { className: "kl-roster-field-label" }, "Tags", this.#rosterTags),
      element("label", { className: "kl-roster-field-label" }, "Private note", this.#rosterNote),
      element(
        "div",
        { className: "kl-roster-note-actions" },
        element("span", { className: "kl-setting-help", text: "Ctrl+Enter to save" }),
        this.#saveNotebookButton,
      ),
    );
    this.#rosterDetail.append(identity, quickActions, stats, notebook);
    this.#bindProfileMenu(identity, () => ({
      memberNumber: entry.memberNumber,
      displayName: entry.displayName,
    }));
    this.presence.request(entry.memberNumber);
  }

  #rosterStat(label: string, value: string): HTMLDivElement {
    return element(
      "div",
      { className: "kl-roster-stat" },
      element("div", { className: "kl-roster-stat-label", text: label }),
      element("div", { className: "kl-roster-stat-value", text: value }),
    );
  }

  #saveNotebook(showToast: boolean): void {
    if (!this.#notebookDirty || this.#selectedRosterMember === undefined) return;
    const entry = this.roster
      .list("known")
      .find((candidate) => candidate.memberNumber === this.#selectedRosterMember);
    const displayName = entry?.displayName ?? this.adapter.getMemberName(this.#selectedRosterMember);
    const tags = this.#rosterTags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);
    this.roster.saveNotebook(
      this.#selectedRosterMember,
      displayName,
      this.#rosterNote.value,
      tags,
    );
    this.#notebookDirty = false;
    this.#saveNotebookButton.disabled = true;
    if (showToast) this.#toast("Private player note saved.");
    this.#renderRoster();
  }

  #startRosterWhisper(entry: RosterEntry): void {
    this.#saveNotebook(false);
    try {
      this.adapter.startWhisper(entry.memberNumber);
      this.close();
    } catch (error) {
      this.#toast(error instanceof Error ? error.message : "Unable to start Whisper", "error");
      this.#renderRoster();
    }
  }

  async #openRosterBeep(entry: RosterEntry): Promise<void> {
    this.#saveNotebook(false);
    await this.openChat(entry.memberNumber, entry.displayName);
  }

  #openRosterProfile(entry: RosterEntry): void {
    this.#saveNotebook(false);
    try {
      this.adapter.openProfile(entry.memberNumber);
      this.close();
    } catch (error) {
      this.#toast(error instanceof Error ? error.message : "Unable to open profile", "error");
      this.#renderRoster();
    }
  }

  async #copyRosterMemberNumber(memberNumber: number): Promise<void> {
    try {
      await copyText(memberNumber.toString());
      this.#toast(`Member ${memberNumber} copied.`);
    } catch {
      this.#toast("The browser blocked clipboard access.", "error");
    }
  }

  #buildActivitiesPage(): void {
    this.#customActivitiesView = new CustomActivitiesView(
      this.#activitiesPage,
      this.adapter,
      this.settings,
      this.activities,
      () => {
        this.#renderHomeStatus();
        void this.#renderHome();
      },
      (message, kind) => this.#toast(message, kind),
    );
    this.#customActivitiesView.open();
  }

  #openActivities(activityIndex?: number): void {
    if (!this.settings.get().linkActivities.enabled) {
      this.#openSettings("activities");
      this.#activitiesToggle.focus();
      this.#toast("Turn on the Custom Activities tab to open your activity builder.");
      return;
    }

    this.#showWorkspace("activities");
    const activities = this.settings.get().linkActivities.customActivities;
    this.#selectedActivityIndex =
      activityIndex !== undefined && Number.isInteger(activityIndex) && activityIndex >= 0
        ? activityIndex
        : 0;
    this.#customActivitiesView?.open(
      activityIndex === undefined ? undefined : activities[this.#selectedActivityIndex]?.id,
    );
  }

  #renderActivitiesPage(): void {
    this.#customActivitiesView?.refresh();
  }

  #settingRow(name: string, help: string, control: Node): HTMLDivElement {
    return element(
      "div",
      { className: "kl-setting-row" },
      element(
        "div",
        { className: "kl-setting-copy" },
        element("div", { className: "kl-setting-name", text: name }),
        element("div", { className: "kl-setting-help", text: help }),
      ),
      control,
    );
  }

  #dialogCloseButton(ariaLabel: string, onClick: () => void): HTMLButtonElement {
    const button = element("button", {
      className: "kl-icon-button",
      type: "button",
      title: "Close",
      ariaLabel,
      onClick,
    });
    button.append(kikiIcon("close"));
    return button;
  }

  async #renderHome(providedConversations?: ConversationMeta[]): Promise<void> {
    const ownName = this.adapter.getOwnName().trim();
    const greeting = greetingForCurrentTime();
    this.#homeGreeting.textContent =
      ownName && ownName.toLocaleLowerCase() !== "me"
        ? `${greeting}, ${ownName}.`
        : `${greeting}.`;

    const conversations = providedConversations ?? await this.service.listConversations();
    const groups = this.#groupChatService?.listGroups() ?? [];
    const totalChats = conversations.length + groups.length;
    const onlineFriendCount =
      typeof this.adapter.getOnlineFriends === "function"
        ? this.adapter.getOnlineFriends().length
        : 0;
    const recent = [...conversations].sort(
      (left, right) => right.lastMessageAt - left.lastMessageAt,
    )[0];
    const recentGroup = groups.reduce<GroupConversation | undefined>(
      (latest, group) => !latest || group.lastMessageAt > latest.lastMessageAt ? group : latest,
      undefined,
    );
    if (this.#unreadCount > 0) {
      this.#homeChatMetric.textContent = `${this.#unreadCount} unread · ${totalChats} chats`;
    } else if (
      recentGroup &&
      recentGroup.lastMessageAt > 0 &&
      (!recent || recentGroup.lastMessageAt > recent.lastMessageAt)
    ) {
      this.#homeChatMetric.textContent = `Last in ${recentGroup.title} · ${formatRelativeTime(recentGroup.lastMessageAt)}`;
    } else if (recent && recent.lastMessageAt > 0) {
      this.#homeChatMetric.textContent = `Last with ${conversationDisplayName(recent)} · ${formatRelativeTime(recent.lastMessageAt)}`;
    } else if (totalChats > 0) {
      this.#homeChatMetric.textContent = `${totalChats} saved ${totalChats === 1 ? "chat" : "chats"}`;
    } else if (onlineFriendCount > 0) {
      this.#homeChatMetric.textContent = `${onlineFriendCount} ${onlineFriendCount === 1 ? "friend" : "friends"} online`;
    } else {
      this.#homeChatMetric.textContent = "Start your first Beep chat";
    }
    this.#renderHomeStatus();
    this.#renderHomeAction(conversations, recent, groups);
  }

  #renderHomeAction(
    conversations: ConversationMeta[],
    recent: ConversationMeta | undefined,
    groups: GroupConversation[] = [],
  ): void {
    const unread = conversations.find((conversation) => conversation.unread > 0);
    const unreadGroup = groups.find((group) => group.unread > 0);
    const directUnreadTotal = conversations.reduce(
      (count, conversation) => count + conversation.unread,
      0,
    );
    const groupUnreadTotal = groups.reduce((count, group) => count + group.unread, 0);
    const recentGroup = groups.reduce<GroupConversation | undefined>(
      (latest, group) => !latest || group.lastMessageAt > latest.lastMessageAt ? group : latest,
      undefined,
    );
    const settings = this.settings.get();
    const inRoom =
      typeof this.adapter.isInChatRoom === "function" && this.adapter.isInChatRoom();
    const roomName =
      typeof this.adapter.getCurrentRoomName === "function"
        ? this.adapter.getCurrentRoomName()?.trim()
        : undefined;

    this.#homeActionButton.disabled = false;
    if (unread) {
      const total = directUnreadTotal;
      this.#homeAction = {
        kind: "chat",
        peerNumber: unread.peerNumber,
        peerName: unread.peerName,
      };
      this.#homeActionIcon.replaceChildren(kikiIcon("chat"));
      this.#homeActionTitle.textContent = `${total} unread ${total === 1 ? "Beep" : "Beeps"}`;
      this.#homeActionDescription.textContent =
        groupUnreadTotal > 0
          ? `Start with ${conversationDisplayName(unread)}; ${groupUnreadTotal} unread group ${groupUnreadTotal === 1 ? "message is" : "messages are"} also waiting.`
          : total === unread.unread
          ? `Open the conversation with ${conversationDisplayName(unread)} and continue when you are ready.`
          : `Start with ${conversationDisplayName(unread)}, then work through the rest at your pace.`;
      this.#homeActionMeta.textContent =
        groupUnreadTotal > 0
          ? `${total} direct · ${groupUnreadTotal} group`
          : total === unread.unread
            ? `From ${conversationDisplayName(unread)}`
            : "Across direct chats";
      this.#homeActionButton.textContent = total === 1 ? "Read message" : "Read messages";
    } else if (unreadGroup) {
      this.#homeAction = { kind: "group", groupId: unreadGroup.groupId };
      this.#homeActionIcon.replaceChildren(kikiIcon("users"));
      this.#homeActionTitle.textContent = `${unreadGroup.unread} unread in ${unreadGroup.title}`;
      this.#homeActionDescription.textContent = "Open the group conversation and catch up with everyone.";
      this.#homeActionMeta.textContent = `${unreadGroup.memberNumbers.length} members`;
      this.#homeActionButton.textContent = "Open group";
    } else if (conversations.length === 0 && groups.length === 0) {
      this.#homeAction = { kind: "new-chat" };
      this.#homeActionIcon.replaceChildren(kikiIcon("plus"));
      this.#homeActionTitle.textContent = "Start your first chat";
      this.#homeActionDescription.textContent =
        "Choose someone you know or enter a member number. KikiLink keeps the conversation together.";
      this.#homeActionMeta.textContent = "Takes only a moment";
      this.#homeActionButton.textContent = "Start a chat";
    } else if (settings.linkRoster.enabled && inRoom && this.#presentCount > 0) {
      this.#homeAction = { kind: "roster" };
      this.#homeActionIcon.replaceChildren(kikiIcon("users"));
      this.#homeActionTitle.textContent = roomName ? `See who is in ${roomName}` : "See who is here";
      this.#homeActionDescription.textContent =
        "Open Players to Whisper, Beep, view a profile, or add a private note.";
      this.#homeActionMeta.textContent = `${this.#presentCount} ${this.#presentCount === 1 ? "person" : "people"} here now`;
      this.#homeActionButton.textContent = "View players";
    } else if (recentGroup && (!recent || recentGroup.lastMessageAt > recent.lastMessageAt)) {
      this.#homeAction = { kind: "group", groupId: recentGroup.groupId };
      this.#homeActionIcon.replaceChildren(kikiIcon("users"));
      this.#homeActionTitle.textContent = `Continue in ${recentGroup.title}`;
      this.#homeActionDescription.textContent = "Pick up your most recent group conversation.";
      this.#homeActionMeta.textContent = `${recentGroup.memberNumbers.length} members`;
      this.#homeActionButton.textContent = "Open group";
    } else if (recent) {
      this.#homeAction = {
        kind: "chat",
        peerNumber: recent.peerNumber,
        peerName: recent.peerName,
      };
      this.#homeActionIcon.replaceChildren(kikiIcon("chat"));
      this.#homeActionTitle.textContent = `Continue with ${conversationDisplayName(recent)}`;
      this.#homeActionDescription.textContent = "Pick up your most recent Beep conversation.";
      this.#homeActionMeta.textContent =
        recent.lastMessageAt > 0 ? formatRelativeTime(recent.lastMessageAt) : "Conversation ready";
      this.#homeActionButton.textContent = "Open chat";
    } else {
      this.#homeAction = { kind: "chat" };
      this.#homeActionIcon.replaceChildren(kikiIcon("chat"));
      this.#homeActionTitle.textContent = "Open your chats";
      this.#homeActionDescription.textContent = "Find a conversation or start a new Beep.";
      this.#homeActionMeta.textContent = "Recent chats are kept together";
      this.#homeActionButton.textContent = "Open Chat";
    }
    this.#homeActionButton.dataset.action = this.#homeAction.kind;
  }

  #renderHomeStatus(): void {
    const settings = this.settings.get();
    const inRoom =
      typeof this.adapter.isInChatRoom === "function" && this.adapter.isInChatRoom();
    const roomName =
      typeof this.adapter.getCurrentRoomName === "function"
        ? this.adapter.getCurrentRoomName()
        : undefined;
    this.#homeConnection.textContent = this.#connectionText.textContent || "Connecting";
    this.#homeConnection.dataset.state = this.#connectionState;
    this.#homeRoom.textContent = roomName || (inRoom ? "Unnamed room" : "Not in a chat room");
    this.#renderOwnPresence();

    this.#rosterButton.dataset.available = String(settings.linkRoster.enabled);
    this.#homeRosterCard.dataset.available = String(settings.linkRoster.enabled);
    this.#homeRosterMetric.textContent = settings.linkRoster.enabled
      ? this.#presentCount > 0
        ? `${this.#presentCount} ${this.#presentCount === 1 ? "person" : "people"} here now`
        : inRoom
          ? "No other players in this room"
          : "Open while you are in a room"
      : "Disabled · tap to enable";
    this.#homeRosterAction.textContent = settings.linkRoster.enabled ? "View players" : "Turn on Players";

    this.#activitiesButton.dataset.available = String(settings.linkActivities.enabled);
    this.#activitiesButton.hidden = !settings.linkActivities.enabled;
    this.#homeActivitiesCard.dataset.available = String(settings.linkActivities.enabled);
    this.#homeActivitiesMetric.textContent = settings.linkActivities.enabled
      ? settings.linkActivities.customActivities.length > 0
        ? `${settings.linkActivities.customActivities.length} custom ${settings.linkActivities.customActivities.length === 1 ? "activity" : "activities"}`
        : "No custom activities yet"
      : "Hidden · tap to enable";
    this.#homeActivitiesAction.textContent = settings.linkActivities.enabled
      ? "Manage activities"
      : "Show Custom tab";

    const savedGalleryCount = settings.linkChat.gallery.saved.length + this.#deviceGalleryCount;
    this.#homeGalleryMetric.textContent = savedGalleryCount > 0
      ? `${savedGalleryCount} saved ${savedGalleryCount === 1 ? "image" : "images"} · chat media included`
      : "Chat media plus images you add directly";

    const themeLabel =
      settings.ui.theme === "light"
        ? "Light paper"
        : settings.ui.theme === "system"
          ? "System theme"
          : "Dark lacquer";
    const comfortLabel =
      settings.ui.density === "super-compact"
        ? "Super compact"
        : settings.ui.density === "compact"
          ? "Compact"
          : "Comfortable";
    this.#homeSettingsMetric.textContent = `${themeLabel} · ${comfortLabel} · ${settings.ui.accent.toUpperCase()}`;
  }

  #renderOwnPresence(): void {
    const enabled = this.settings.get().linkPresence.enabled;
    const ownMemberNumber = this.adapter.getOwnMemberNumber();
    const ownName = this.adapter.getOwnName();
    const snapshot = this.presence.get(ownMemberNumber);
    const label = enabled ? presenceLabel(snapshot.status) : "Presence off";
    this.#presenceTriggerDot.dataset.status = enabled ? snapshot.status : "unknown";
    this.#presenceTriggerName.textContent = ownName;
    this.#presenceTriggerStatus.textContent = snapshot.statusMessage
      ? `${label} · ${snapshot.statusMessage}`
      : label;
    this.#renderAvatar(this.#presenceTriggerAvatar, ownName, ownMemberNumber, snapshot.avatarUrl);
    this.#presenceTrigger.title = snapshot.statusMessage
      ? `${ownName}: ${label} · ${snapshot.statusMessage}`
      : `KikiLink status: ${label}`;
    this.#homePresence.replaceChildren(
      presenceDot(enabled ? snapshot.status : "unknown"),
      element("span", { text: label }),
    );
    this.#homePresence.title = this.#presenceTrigger.title;
  }

  #scheduleClockUpdate(): void {
    if (this.#clockTimer !== undefined) clearTimeout(this.#clockTimer);
    const now = new Date();
    this.#localClock.dateTime = now.toISOString();
    this.#localClock.textContent = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(now);
    this.#localClock.title = `Local time · ${new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(now)}`;
    this.#clockTimer = setTimeout(
      () => this.#scheduleClockUpdate(),
      Math.max(1_000, 60_000 - (Date.now() % 60_000) + 25),
    );
  }

  #renderActivePresence(): void {
    this.#chatPresence.replaceChildren();
    this.#chatRoom.replaceChildren();
    if (this.#activePeer === undefined) {
      this.#renderTypingIndicator();
      return;
    }
    const snapshot = this.presence.get(this.#activePeer);
    this.#renderAvatar(this.#chatAvatar, this.#activeName, this.#activePeer);
    this.#chatPresence.append(
      presenceDot(snapshot.status),
      element("span", { text: presenceLabel(snapshot.status) }),
    );
    if (snapshot.statusMessage) {
      this.#chatPresence.append(
        element("span", { className: "kl-presence-note", text: snapshot.statusMessage }),
      );
    }
    if (snapshot.roomName) {
      this.#chatRoom.replaceChildren(
        kikiIcon("location", "kl-chat-room-icon"),
        element("span", { className: "kl-chat-room-name", text: snapshot.roomName }),
      );
      this.#chatRoom.hidden = false;
      this.#chatRoom.title = `Current room: ${snapshot.roomName}`;
    } else {
      this.#chatRoom.hidden = true;
      this.#chatRoom.removeAttribute("title");
    }
    this.#chatPresence.title = presenceDescription(snapshot);
    this.#renderTypingIndicator();
  }

  #renderTypingIndicator(): void {
    const typing =
      this.settings.get().linkChat.typingIndicators &&
      this.#activePeer !== undefined &&
      this.presence.isTyping(this.#activePeer);
    this.#typingIndicator.hidden = !typing;
    if (!typing) {
      this.#typingIndicator.replaceChildren();
      return;
    }
    this.#typingIndicator.replaceChildren(
      element("span", { className: "kl-typing-name", text: `${this.#activeName} is typing` }),
      element(
        "span",
        { className: "kl-typing-dots", ariaLabel: "" },
        element("i"),
        element("i"),
        element("i"),
      ),
    );
  }

  #updateLocalTyping(): void {
    if (this.#typingStopTimer !== undefined) clearTimeout(this.#typingStopTimer);
    this.#typingStopTimer = undefined;
    if (this.#activePeer === undefined || !this.#composer.value.trim()) {
      this.#stopLocalTyping();
      return;
    }
    this.presence.setTyping(this.#activePeer, true);
    this.#typingStopTimer = setTimeout(() => {
      this.#typingStopTimer = undefined;
      if (this.#activePeer !== undefined) this.presence.setTyping(this.#activePeer, false, true);
    }, 2_400);
  }

  #stopLocalTyping(): void {
    if (this.#typingStopTimer !== undefined) clearTimeout(this.#typingStopTimer);
    this.#typingStopTimer = undefined;
    if (this.#activePeer !== undefined) this.presence.setTyping(this.#activePeer, false, true);
  }

  #schedulePresenceRender(memberNumber?: number): void {
    if (memberNumber === undefined) this.#pendingPresenceAll = true;
    else this.#pendingPresenceMembers.add(memberNumber);
    if (this.#presenceRenderFrame !== undefined) return;
    this.#presenceRenderFrame = requestAnimationFrame(() => {
      this.#presenceRenderFrame = undefined;
      const updateAll = this.#pendingPresenceAll;
      const members = [...this.#pendingPresenceMembers];
      this.#pendingPresenceAll = false;
      this.#pendingPresenceMembers.clear();

      this.#updateVisiblePresence(updateAll ? undefined : members);
      if (
        updateAll ||
        (this.#activePeer !== undefined && members.includes(this.#activePeer))
      ) {
        this.#renderActivePresence();
      }
      let ownMemberNumber: number | undefined;
      try {
        const candidate = this.adapter.getOwnMemberNumber();
        if (Number.isSafeInteger(candidate) && candidate > 0) ownMemberNumber = candidate;
      } catch {
        // Firefox may revoke the page-owned Player proxy between the event and this frame.
      }
      if (
        ownMemberNumber !== undefined &&
        (updateAll || members.includes(ownMemberNumber))
      ) {
        this.#renderHomeStatus();
      }
      if (
        this.#addonProfileTarget &&
        (updateAll || members.includes(this.#addonProfileTarget.memberNumber))
      ) {
        let signature = "";
        try {
          signature = profilePresenceSignature(
            this.presence.get(this.#addonProfileTarget.memberNumber),
          );
        } catch {
          // Cross-realm native state can disappear between the notification and this frame.
        }
        if (signature !== this.#addonProfilePresenceSignature) {
          void this.#renderAddonProfile();
        }
      }
      if (updateAll) void this.#renderHome();
    });
  }

  #updateVisiblePresence(memberNumbers?: number[]): void {
    const filter = memberNumbers ? new Set(memberNumbers) : undefined;
    for (const target of this.#shadow.querySelectorAll<HTMLElement>("[data-member-number]")) {
      const memberNumber = Number(target.dataset.memberNumber);
      if (!Number.isSafeInteger(memberNumber) || (filter && !filter.has(memberNumber))) continue;
      const snapshot = this.presence.get(memberNumber);
      for (const dot of target.querySelectorAll<HTMLElement>(".kl-presence-dot")) {
        dot.dataset.status = snapshot.status;
      }
      for (const label of target.querySelectorAll<HTMLElement>("[data-presence-label]")) {
        label.textContent = presenceLabel(snapshot.status);
        label.dataset.status = snapshot.status;
        label.hidden = snapshot.status === "unknown";
      }
      const description = target.querySelector<HTMLElement>("[data-presence-description]");
      if (description) description.title = presenceDescription(snapshot);
      const avatar = target.querySelector<HTMLElement>("[data-kikilink-avatar]");
      if (avatar) {
        let avatarName = avatar.dataset.avatarName || `Member ${memberNumber}`;
        if (!avatar.dataset.avatarName) {
          try {
            avatarName = this.adapter.getMemberName(memberNumber);
          } catch {
            // Keep the existing avatar usable while native character data is guarded.
          }
        }
        this.#renderAvatar(
          avatar,
          avatarName,
          memberNumber,
        );
      }
    }
  }

  async #renderConversations(providedConversations?: ConversationMeta[]): Promise<void> {
    const query = this.#search.value.trim().toLocaleLowerCase();
    const allConversations = providedConversations ?? await this.service.listConversations();
    for (const conversation of allConversations) {
      const nickname = this.adapter.getMemberNickname(conversation.peerNumber);
      if (nickname && nickname !== conversation.peerName) {
        conversation.peerName = nickname;
        void this.service.setPeerName(conversation.peerNumber, nickname);
      }
      if (conversation.peerNumber === this.#activePeer) {
        const displayName = conversationDisplayName(conversation);
        this.#activeName = displayName;
        this.#activeNativeName = conversation.peerName;
        this.#chatName.textContent = displayName;
        this.#renderAvatar(this.#chatAvatar, displayName, conversation.peerNumber);
      }
    }
    const conversations = allConversations
      .filter((conversation) => {
        if (!query) return true;
        return (
          conversationDisplayName(conversation).toLocaleLowerCase().includes(query) ||
          conversation.peerName.toLocaleLowerCase().includes(query) ||
          conversation.peerNumber.toString().includes(query) ||
          conversation.lastMessage.toLocaleLowerCase().includes(query)
        );
      })
      .slice(0, 200);

    if (conversations.length === 0) {
      this.#conversationList.replaceChildren(
        element("div", {
          className: "kl-empty-copy",
          text: query ? "No matching chats." : "No conversations yet.",
        }),
      );
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const conversation of conversations) {
      fragment.append(this.#conversationButton(conversation));
    }
    this.#conversationList.replaceChildren(fragment);
    this.presence.requestMany(
      conversations.slice(0, 60).map((conversation) => conversation.peerNumber),
    );
  }

  #conversationButton(conversation: ConversationMeta): HTMLButtonElement {
    const presence = this.presence.get(conversation.peerNumber);
    const displayName = conversationDisplayName(conversation);
    const nameRow = element(
      "div",
      { className: "kl-conversation-name-row" },
      element("span", { className: "kl-conversation-name", text: displayName }),
      conversation.pinned ? kikiIcon("pin", "kl-pin", true) : null,
    );
    const prefix = conversation.lastDirection === "outgoing" ? "You: " : "";
    const previewText = messagePreview(conversation.lastMessage);
    const preview = previewText
      ? `${prefix}${previewText}`
      : `Member ${conversation.peerNumber}`;
    const main = element(
      "div",
      { className: "kl-conversation-main" },
      nameRow,
      element("div", { className: "kl-conversation-preview", text: preview }),
    );
    const side = element(
      "div",
      { className: "kl-conversation-side" },
      element("span", {
        className: "kl-time",
        text: conversation.lastMessageAt > 0 ? formatConversationTime(conversation.lastMessageAt) : "",
      }),
      conversation.unread > 0
        ? element("span", {
            className: "kl-unread",
            text: conversation.unread > 99 ? "99+" : conversation.unread.toString(),
          })
        : null,
    );
    const button = element(
      "button",
      { className: "kl-conversation", type: "button" },
      element(
        "div",
        { className: "kl-avatar-wrap" },
        this.#avatar(displayName, conversation.peerNumber),
        presenceDot(presence.status),
      ),
      main,
      side,
    );
    button.dataset.memberNumber = conversation.peerNumber.toString();
    button.dataset.active = String(conversation.peerNumber === this.#activePeer);
    button.addEventListener("click", () =>
      void this.#selectConversation(conversation.peerNumber, conversation.peerName),
    );
    this.#bindProfileMenu(button, () => ({
      memberNumber: conversation.peerNumber,
      displayName,
    }));
    return button;
  }

  async #selectConversation(peerNumber: number, peerName: string): Promise<void> {
    if (this.#groupChatPanel?.activeGroupId) this.#groupChatPanel.closeActive();
    if (this.#activePeer !== undefined && this.#activePeer !== peerNumber) {
      this.#stopLocalTyping();
    }
    const nativeName = this.adapter.getMemberNickname(peerNumber) ?? peerName;
    const conversation = await this.service.ensureConversation(peerNumber, nativeName);
    if (nativeName !== conversation.peerName) {
      await this.service.setPeerName(peerNumber, nativeName);
      conversation.peerName = nativeName;
    }
    const displayName = conversationDisplayName(conversation);
    this.#activePeer = peerNumber;
    this.#activeName = displayName;
    this.#activeNativeName = nativeName;
    this.#panel.dataset.mobileView = "chat";
    await this.service.markRead(peerNumber);

    this.#empty.hidden = true;
    this.#chat.hidden = false;
    this.#chatAvatar.dataset.memberNumber = peerNumber.toString();
    this.#renderAvatar(this.#chatAvatar, displayName, peerNumber);
    this.#chatName.textContent = displayName;
    this.#chatNumber.textContent = `Member ${peerNumber}`;
    this.#messageRenderLimit = 120;
    this.#messageRenderPeer = peerNumber;
    this.#loadingOlderMessages = false;
    this.#renderedMessageIds.clear();
    this.#renderActivePresence();
    this.presence.request(peerNumber);
    this.#renderPinButton(conversation.pinned);
    this.#composer.value = conversation.draft;
    this.#includeRoom.checked = this.settings.get().linkChat.includeRoomByDefault;
    this.#attachImageButton.disabled = !this.adapter.canSendBeep();
    this.#resizeComposer();
    this.#updateCounter();
    await Promise.all([this.#renderMessages(peerNumber), this.refresh()]);
    this.#composer.focus();
  }

  async #renderMessages(peerNumber: number, scrollToBottom = true): Promise<void> {
    const messages = await this.service.getMessages(peerNumber, this.#messageRenderLimit + 1);
    if (this.#activePeer !== peerNumber) return;
    const hasOlder = messages.length > this.#messageRenderLimit;
    const visibleMessages = hasOlder ? messages.slice(-this.#messageRenderLimit) : messages;
    this.#messageRenderPeer = peerNumber;
    this.#renderedMessageIds.clear();
    if (visibleMessages.length === 0) {
      this.#messages.replaceChildren(
        element("div", {
          className: "kl-empty-copy",
          text: "No Beeps here yet. Send the first one.",
        }),
      );
      return;
    }

    const fragment = document.createDocumentFragment();
    if (hasOlder) {
      fragment.append(this.#olderMessagesControl(peerNumber));
    }
    for (const [index, message] of visibleMessages.entries()) {
      this.#renderedMessageIds.add(message.id);
      fragment.append(
        this.#messageNode(
          message,
          messageGroupPosition(
            visibleMessages[index - 1]?.direction,
            message.direction,
            visibleMessages[index + 1]?.direction,
          ),
        ),
      );
    }
    this.#messages.replaceChildren(fragment);
    if (scrollToBottom) {
      this.#messages.scrollTop = this.#messages.scrollHeight;
    }
  }

  async #loadOlderMessages(peerNumber: number): Promise<void> {
    if (this.#activePeer !== peerNumber || this.#loadingOlderMessages) return;
    this.#loadingOlderMessages = true;
    this.#messages.setAttribute("aria-busy", "true");
    const button = this.#messages.querySelector<HTMLButtonElement>(".kl-load-older button");
    if (button) button.disabled = true;
    const previousHeight = this.#messages.scrollHeight;
    const previousTop = this.#messages.scrollTop;
    try {
      const nextLimit = this.#messageRenderLimit + 120;
      const messages = await this.service.getMessages(peerNumber, nextLimit + 1);
      if (this.#activePeer !== peerNumber) return;
      const hasOlder = messages.length > nextLimit;
      const visibleMessages = hasOlder ? messages.slice(-nextLimit) : messages;
      const missingMessages = visibleMessages.filter(
        (message) => !this.#renderedMessageIds.has(message.id),
      );
      const currentControl = this.#messages.querySelector<HTMLElement>(".kl-load-older");
      const fragment = document.createDocumentFragment();
      if (hasOlder) fragment.append(currentControl ?? this.#olderMessagesControl(peerNumber));
      else currentControl?.remove();
      for (const message of missingMessages) {
        this.#renderedMessageIds.add(message.id);
        fragment.append(this.#messageNode(message));
      }
      if (fragment.childNodes.length > 0) this.#messages.prepend(fragment);
      this.#messageRenderLimit = nextLimit;
      this.#syncMessageGrouping();
      this.#messages.scrollTop = previousTop + (this.#messages.scrollHeight - previousHeight);
    } finally {
      this.#loadingOlderMessages = false;
      this.#messages.setAttribute("aria-busy", "false");
      const currentButton = this.#messages.querySelector<HTMLButtonElement>(
        ".kl-load-older button",
      );
      if (currentButton) currentButton.disabled = false;
    }
  }

  #olderMessagesControl(peerNumber: number): HTMLDivElement {
    return element(
      "div",
      { className: "kl-load-older" },
      element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Load earlier messages",
        onClick: () => void this.#loadOlderMessages(peerNumber),
      }),
    );
  }

  #messageNode(
    message: LinkMessage,
    group: MessageGroupPosition = "single",
  ): HTMLDivElement {
    const body = this.#renderMessageBody(message);
    const actions = element(
      "div",
      { className: "kl-message-side-actions" },
      element("button", {
        className: "kl-message-action",
        type: "button",
        title: "Quote this message in your reply",
        ariaLabel: "Reply to message",
        onClick: () => this.#replyToMessage(message),
      }, kikiIcon("reply")),
      element("button", {
        className: "kl-message-action",
        type: "button",
        title: "Copy message",
        ariaLabel: "Copy message",
        onClick: () => void this.#copyMessage(message.content),
      }, kikiIcon("copy")),
    );
    const meta = element(
      "div",
      { className: "kl-message-meta" },
      message.roomName
        ? element("span", { className: "kl-message-room", text: message.roomName })
        : null,
      element("time", { text: formatMessageTime(message.sentAt) }),
    );
    const bubble = element("div", { className: "kl-message-bubble" }, body, meta);
    if (body.querySelector(".kl-message-media")) bubble.dataset.media = "true";
    const row = element("div", { className: "kl-message-row" }, bubble, actions);
    row.dataset.direction = message.direction;
    row.dataset.group = group;
    row.dataset.messageId = message.id;
    return row;
  }

  #appendMessage(message: LinkMessage): void {
    if (
      this.#activePeer !== message.peerNumber ||
      this.#messageRenderPeer !== message.peerNumber ||
      this.#renderedMessageIds.has(message.id)
    ) {
      return;
    }
    const nearBottom =
      this.#messages.scrollHeight - this.#messages.scrollTop - this.#messages.clientHeight < 96;
    const shouldFollowMessage = message.direction === "outgoing" || nearBottom;
    const previousScrollTop = this.#messages.scrollTop;
    this.#messages.querySelector(".kl-empty-copy")?.remove();
    const previous = this.#messages.querySelector<HTMLElement>(".kl-message-row:last-child");
    const row = this.#messageNode(message);
    if (previous?.dataset.direction === message.direction) {
      previous.dataset.group = previous.dataset.group === "single" ? "start" : "middle";
      row.dataset.group = "end";
    }
    this.#messages.append(row);
    this.#renderedMessageIds.add(message.id);

    if (this.#renderedMessageIds.size > this.#messageRenderLimit) {
      if (!this.#messages.querySelector(".kl-load-older")) {
        this.#messages.prepend(this.#olderMessagesControl(message.peerNumber));
      }
      const oldest = this.#messages.querySelector<HTMLElement>(".kl-message-row");
      if (oldest) {
        const heightBeforeRemoval = this.#messages.scrollHeight;
        if (oldest.dataset.messageId) this.#renderedMessageIds.delete(oldest.dataset.messageId);
        oldest.remove();
        this.#repairFirstMessageGrouping();
        if (!shouldFollowMessage) {
          const removedHeight = Math.max(0, heightBeforeRemoval - this.#messages.scrollHeight);
          this.#messages.scrollTop = Math.max(0, previousScrollTop - removedHeight);
        }
      }
    }
    if (shouldFollowMessage) this.#messages.scrollTop = this.#messages.scrollHeight;
  }

  #syncMessageGrouping(): void {
    const rows = [...this.#messages.querySelectorAll<HTMLElement>(".kl-message-row")];
    for (const [index, row] of rows.entries()) {
      row.dataset.group = messageGroupPosition(
        rows[index - 1]?.dataset.direction,
        row.dataset.direction,
        rows[index + 1]?.dataset.direction,
      );
    }
  }

  #repairFirstMessageGrouping(): void {
    const first = this.#messages.querySelector<HTMLElement>(".kl-message-row");
    if (!first) return;
    const next = first.nextElementSibling;
    first.dataset.group =
      next instanceof HTMLElement &&
      next.classList.contains("kl-message-row") &&
      next.dataset.direction === first.dataset.direction
        ? "start"
        : "single";
  }

  async #send(): Promise<void> {
    const message = this.#composer.value.trim();
    if (!message) return;
    await this.#sendContent(message, true);
  }

  async #sendContent(message: string, clearComposer: boolean): Promise<boolean> {
    if (this.#activePeer === undefined) return false;
    let sent = false;
    try {
      const event = this.adapter.sendBeep(
        this.#activePeer,
        message,
        this.#includeRoom.checked,
      );
      sent = true;
      const storedMessage = await this.service.capture(event, true);
      this.#stopLocalTyping();
      if (clearComposer) {
        this.#composer.value = "";
        await this.service.setDraft(this.#activePeer, this.#activeNativeName, "");
        this.#resizeComposer();
        this.#updateCounter();
      }
      await this.onMessage(this.#activePeer, false, storedMessage);
      if (clearComposer) this.#composer.focus();
      return true;
    } catch (error) {
      this.#toast(
        sent
          ? "Beep was sent, but KikiLink could not save it to this account's history."
          : error instanceof Error
            ? error.message
            : "Unable to send Beep",
        "error",
      );
      return false;
    }
  }

  #renderMessageBody(message: LinkMessage): HTMLElement {
    const content = message.content || "Beep without a message";
    const links = parseMessageLinks(content);
    const previewsEnabled = this.settings.get().linkChat.imagePreviews !== "never";
    const imageUrls = [...new Set(links.filter((link) => link.image).map((link) => link.url))].slice(0, 2);
    const body = element("div", { className: "kl-message-content" });
    let cursor = 0;
    for (const link of links) {
      if (link.start > cursor) body.append(document.createTextNode(content.slice(cursor, link.start)));
      if (link.image && previewsEnabled) {
        cursor = link.end;
        continue;
      }
      const anchor = element("a", { className: "kl-message-link", text: content.slice(link.start, link.end) });
      anchor.href = link.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer nofollow";
      anchor.referrerPolicy = "no-referrer";
      body.append(anchor);
      cursor = link.end;
    }
    if (cursor < content.length) body.append(document.createTextNode(content.slice(cursor)));

    if (imageUrls.length === 0 || !previewsEnabled) return body;
    if (!body.textContent?.trim()) {
      body.replaceChildren();
      body.dataset.mediaOnly = "true";
    }
    const media = element("div", { className: "kl-message-media" });
    for (const url of imageUrls) media.append(this.#imageCard(url));
    body.append(media);
    return body;
  }

  #imageCard(url: string, deviceLocal = false): HTMLElement {
    const parsed = new URL(url);
    const preview = element("div", { className: "kl-image-preview" });
    const open = element("a", { className: "kl-image-open", text: "Show original ↗" });
    open.href = url;
    open.target = "_blank";
    open.rel = "noopener noreferrer nofollow";
    open.referrerPolicy = "no-referrer";
    const card = element(
      "figure",
      { className: "kl-image-card" },
      preview,
      element(
        "figcaption",
        { className: "kl-image-caption" },
        element("span", {
          className: "kl-image-host",
          text: deviceLocal ? "Stored on this device" : parsed.hostname,
        }),
        open,
      ),
    );
    const previewPolicy = this.settings.get().linkChat.imagePreviews;
    if (deviceLocal) {
      this.#loadTrustedLocalImage(preview, url);
    } else if (previewPolicy === "always") {
      this.#queueRemoteImage(preview, url);
    } else {
      preview.append(
        kikiIcon("image", "kl-image-placeholder-icon"),
        element("span", { className: "kl-image-placeholder-title", text: "Remote image" }),
        element("span", {
          className: "kl-image-placeholder-help",
          text: previewPolicy === "ask"
            ? "Load it only when you trust this host."
            : "Preview disabled by your Links only setting.",
        }),
      );
      if (previewPolicy === "ask") {
        preview.append(
          element("button", {
            className: "kl-text-button kl-image-load",
            type: "button",
            text: "Show image",
            onClick: () => this.#loadRemoteImage(preview, url),
          }),
        );
      }
    }
    return card;
  }

  async #loadRemoteImage(preview: HTMLElement, url: string): Promise<void> {
    const token = this.#nextRemoteImageRender(preview);
    await this.#performRemoteImageLoad(preview, url, token);
  }

  #startRemoteImageVisibilityObserver(): void {
    if (typeof IntersectionObserver !== "function") return;
    this.#remoteImageVisibilityObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          const task = this.#remoteImageVisibilityTasks.get(target);
          if (!task) continue;
          this.#remoteImageVisibilityObserver?.unobserve(target);
          this.#remoteImageVisibilityTasks.delete(target);
          if (!this.#isLiveRemoteImageRender(target, task.token)) {
            this.#cancelRemoteImageLoad(target);
            continue;
          }
          target.dataset.state = "queued";
          target.replaceChildren(
            kikiIcon("image", "kl-image-placeholder-icon"),
            element("span", { text: "Waiting to load safely…" }),
          );
          this.#remoteImageAutoLoadQueue.push(task);
        }
        this.#scheduleRemoteImageAutoDrain();
      },
      { rootMargin: "240px 0px", threshold: 0.01 },
    );
  }

  #queueRemoteImage(preview: HTMLElement, url: string): void {
    const token = this.#nextRemoteImageRender(preview);
    const task = { target: preview, url, token };
    if (this.#remoteImageVisibilityObserver) {
      preview.dataset.state = "waiting";
      preview.replaceChildren(
        kikiIcon("image", "kl-image-placeholder-icon"),
        element("span", { text: "Loads automatically when near view…" }),
      );
      this.#remoteImageVisibilityTasks.set(preview, task);
      this.#remoteImageVisibilityObserver.observe(preview);
      return;
    }
    if (this.#remoteImageFallbackTargets.size >= MAX_FALLBACK_AUTO_REMOTE_IMAGE_LOADS) {
      preview.dataset.state = "paused";
      preview.replaceChildren(
        kikiIcon("image", "kl-image-placeholder-icon"),
        element("span", { text: "Automatic preview paused in this browser." }),
        element("button", {
          className: "kl-text-button kl-image-load",
          type: "button",
          text: "Show image",
          onClick: () => this.#loadRemoteImage(preview, url),
        }),
      );
      return;
    }
    this.#remoteImageFallbackTargets.add(preview);
    preview.dataset.state = "queued";
    preview.replaceChildren(
      kikiIcon("image", "kl-image-placeholder-icon"),
      element("span", { text: "Waiting to load safely…" }),
    );
    this.#remoteImageAutoLoadQueue.push(task);
    this.#scheduleRemoteImageAutoDrain();
  }

  #scheduleRemoteImageAutoDrain(): void {
    if (this.#remoteImageAutoDrainScheduled) return;
    this.#remoteImageAutoDrainScheduled = true;
    queueMicrotask(() => {
      this.#remoteImageAutoDrainScheduled = false;
      this.#drainRemoteImageAutoLoads();
    });
  }

  #drainRemoteImageAutoLoads(): void {
    if (!this.#mounted) return;
    while (
      this.#remoteImageAutoLoadsActive < MAX_AUTO_REMOTE_IMAGE_LOADS &&
      this.#remoteImageAutoLoadQueue.length > 0
    ) {
      const task = this.#remoteImageAutoLoadQueue.shift();
      if (!task || !this.#isLiveRemoteImageRender(task.target, task.token)) continue;
      this.#remoteImageAutoLoadsActive += 1;
      void this.#performRemoteImageLoad(task.target, task.url, task.token).finally(() => {
        this.#remoteImageAutoLoadsActive = Math.max(0, this.#remoteImageAutoLoadsActive - 1);
        this.#scheduleRemoteImageAutoDrain();
      });
    }
  }

  async #performRemoteImageLoad(
    preview: HTMLElement,
    url: string,
    token: number,
  ): Promise<void> {
    const controller = this.#startRemoteImageLoad(preview);
    preview.dataset.state = "loading";
    preview.replaceChildren(
      kikiIcon("image", "kl-image-placeholder-icon"),
      element("span", { text: "Loading image safely…" }),
    );
    let localUrl: string;
    try {
      localUrl = await this.remoteImageLoader.load(url, controller.signal);
    } catch {
      if (controller.signal.aborted) return;
      if (!this.#isLiveRemoteImageRender(preview, token)) return;
      this.#showRemoteImageError(preview);
      return;
    } finally {
      this.#releaseRemoteImageLoad(preview, controller);
    }
    if (!this.#isLiveRemoteImageRender(preview, token)) return;
    const image = document.createElement("img");
    image.alt = "Image shared in LinkChat";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("load", () => {
      if (!this.#isLiveRemoteImageRender(preview, token) || image.parentElement !== preview) {
        return;
      }
      preview.dataset.state = "loaded";
    }, { once: true });
    image.addEventListener("error", () => {
      if (!this.#isLiveRemoteImageRender(preview, token) || image.parentElement !== preview) {
        return;
      }
      this.#showRemoteImageError(preview);
    }, { once: true });
    preview.replaceChildren(image);
    image.src = localUrl;
  }

  #loadTrustedLocalImage(preview: HTMLElement, url: string): void {
    const token = this.#nextRemoteImageRender(preview);
    const image = document.createElement("img");
    image.alt = "Image stored on this device";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("load", () => {
      if (this.#isLiveRemoteImageRender(preview, token)) preview.dataset.state = "loaded";
    }, { once: true });
    image.addEventListener("error", () => {
      if (this.#isLiveRemoteImageRender(preview, token)) this.#showRemoteImageError(preview);
    }, { once: true });
    preview.dataset.state = "loading";
    preview.replaceChildren(image);
    image.src = url;
  }

  #showRemoteImageError(preview: HTMLElement): void {
    preview.dataset.state = "error";
    preview.replaceChildren(
      element("span", { className: "kl-image-placeholder-icon", text: "!" }),
      element("span", {
        text: "This image could not be loaded safely. You can still open the original link.",
      }),
    );
  }

  #nextRemoteImageRender(target: HTMLElement): number {
    this.#cancelRemoteImageLoad(target);
    this.#remoteImageTargets.add(target);
    return this.#remoteImageRenderTokens.get(target) ?? 1;
  }

  #isCurrentRemoteImageRender(target: HTMLElement, token: number): boolean {
    return this.#mounted && this.#remoteImageRenderTokens.get(target) === token;
  }

  #isLiveRemoteImageRender(target: HTMLElement, token: number): boolean {
    return target.isConnected && this.#isCurrentRemoteImageRender(target, token);
  }

  #startRemoteImageLoad(target: HTMLElement): AbortController {
    const controller = new AbortController();
    this.#remoteImageAbortControllers.set(target, controller);
    return controller;
  }

  #releaseRemoteImageLoad(target: HTMLElement, controller: AbortController): void {
    if (this.#remoteImageAbortControllers.get(target) === controller) {
      this.#remoteImageAbortControllers.delete(target);
    }
  }

  #cancelRemoteImageLoad(target: HTMLElement): void {
    this.#remoteImageVisibilityObserver?.unobserve(target);
    this.#remoteImageVisibilityTasks.delete(target);
    this.#remoteImageFallbackTargets.delete(target);
    for (let index = this.#remoteImageAutoLoadQueue.length - 1; index >= 0; index -= 1) {
      if (this.#remoteImageAutoLoadQueue[index]?.target === target) {
        this.#remoteImageAutoLoadQueue.splice(index, 1);
      }
    }
    const controller = this.#remoteImageAbortControllers.get(target);
    if (controller) {
      this.#remoteImageAbortControllers.delete(target);
      controller.abort();
    }
    this.#remoteImageRenderTokens.set(
      target,
      (this.#remoteImageRenderTokens.get(target) ?? 0) + 1,
    );
    this.#remoteImageTargets.delete(target);
  }

  #cancelDetachedRemoteImageLoads(): void {
    const targets = new Set<HTMLElement>([
      ...this.#remoteImageTargets,
      ...this.#remoteImageAbortControllers.keys(),
      ...this.#remoteImageVisibilityTasks.keys(),
      ...this.#remoteImageAutoLoadQueue.map((task) => task.target),
    ]);
    for (const target of targets) {
      if (!target.isConnected) this.#cancelRemoteImageLoad(target);
    }
  }

  #cancelAllRemoteImageLoads(): void {
    const targets = new Set<HTMLElement>([
      ...this.#remoteImageTargets,
      ...this.#remoteImageAbortControllers.keys(),
      ...this.#remoteImageVisibilityTasks.keys(),
      ...this.#remoteImageAutoLoadQueue.map((task) => task.target),
    ]);
    for (const target of targets) {
      this.#cancelRemoteImageLoad(target);
    }
    this.#remoteImageAutoLoadQueue.length = 0;
    this.#remoteImageVisibilityTasks.clear();
    this.#remoteImageFallbackTargets.clear();
    this.#remoteImageTargets.clear();
  }

  #cancelRemoteImageLoadsWithin(root: HTMLElement): void {
    const targets = new Set<HTMLElement>([
      ...this.#remoteImageTargets,
      ...this.#remoteImageAbortControllers.keys(),
      ...this.#remoteImageVisibilityTasks.keys(),
      ...this.#remoteImageAutoLoadQueue.map((task) => task.target),
    ]);
    for (const target of targets) {
      if (root.contains(target)) this.#cancelRemoteImageLoad(target);
    }
  }

  #replyToMessage(message: LinkMessage): void {
    const author = message.direction === "incoming" ? this.#activeNativeName : this.adapter.getOwnName();
    const excerpt = message.content.replace(/\s+/gu, " ").trim().slice(0, 180) || "Beep";
    const quote = `> ${author}: ${excerpt}\n`;
    const separator = this.#composer.value && !this.#composer.value.endsWith("\n") ? "\n" : "";
    if (this.#composer.value.length + separator.length + quote.length > 1000) {
      this.#toast("That reply would exceed the 1000 character Beep limit.", "error");
      return;
    }
    this.#composer.value += `${separator}${quote}`;
    this.#composer.dispatchEvent(new Event("input", { bubbles: true }));
    this.#composer.focus();
    this.#composer.setSelectionRange(this.#composer.value.length, this.#composer.value.length);
  }

  async #copyMessage(content: string): Promise<void> {
    try {
      await copyText(content);
      this.#toast("Message copied.");
    } catch {
      this.#toast("The browser blocked clipboard access.", "error");
    }
  }

  async #togglePin(): Promise<void> {
    if (this.#activePeer === undefined) return;
    const pinned = await this.service.togglePinned(this.#activePeer);
    this.#renderPinButton(pinned);
    await this.#renderConversations();
  }

  #renderPinButton(pinned: boolean): void {
    this.#pinButton.replaceChildren(kikiIcon("pin", "kl-pin-button-icon", pinned));
    this.#pinButton.title = pinned ? "Unpin conversation" : "Pin conversation";
    this.#pinButton.setAttribute(
      "aria-label",
      pinned ? "Unpin conversation" : "Pin conversation",
    );
    this.#pinButton.setAttribute("aria-pressed", String(pinned));
  }

  #bindProfileMenu(target: HTMLElement, profile: () => ProfileTarget | undefined): void {
    if (!(target instanceof HTMLButtonElement) && target === this.#chatAvatar) {
      target.tabIndex = 0;
      target.setAttribute("role", "button");
    }
    target.classList.add("kl-profile-menu-target");
    const existingTitle = target.title.trim();
    target.title = existingTitle
      ? `${existingTitle} · Right-click or hold for actions`
      : "Right-click or hold for player actions";

    target.addEventListener("contextmenu", (event) => {
      const value = profile();
      if (!value) return;
      event.preventDefault();
      event.stopPropagation();
      void this.#openProfileMenu(
        value.memberNumber,
        value.displayName,
        event.clientX,
        event.clientY,
        target,
      );
    });
    target.addEventListener("keydown", (event) => {
      if (event.key !== "ContextMenu" && !(event.key === "F10" && event.shiftKey)) return;
      const value = profile();
      if (!value) return;
      event.preventDefault();
      const bounds = target.getBoundingClientRect();
      void this.#openProfileMenu(
        value.memberNumber,
        value.displayName,
        bounds.left + bounds.width / 2,
        bounds.top + Math.min(bounds.height, 44),
        target,
      );
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    let startX = 0;
    let startY = 0;
    const cancel = (): void => {
      if (timer !== undefined) {
        clearTimeout(timer);
        this.#profileMenuLongPressTimers.delete(timer);
      }
      timer = undefined;
    };
    target.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" || event.button !== 0) return;
      const value = profile();
      if (!value) return;
      startX = event.clientX;
      startY = event.clientY;
      cancel();
      const pending = setTimeout(() => {
        this.#profileMenuLongPressTimers.delete(pending);
        if (timer === pending) timer = undefined;
        if (!this.#mounted || this.#panel.hidden || !target.isConnected) return;
        this.#suppressProfileClickUntil.set(target, Date.now() + 700);
        void this.#openProfileMenu(value.memberNumber, value.displayName, startX, startY, target);
      }, 520);
      timer = pending;
      this.#profileMenuLongPressTimers.add(pending);
    });
    target.addEventListener("pointermove", (event) => {
      if (timer === undefined) return;
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > 9) cancel();
    });
    target.addEventListener("pointerup", cancel);
    target.addEventListener("pointercancel", cancel);
    target.addEventListener(
      "click",
      (event) => {
        if (Date.now() >= (this.#suppressProfileClickUntil.get(target) ?? 0)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      true,
    );
  }

  async #openProfileMenu(
    memberNumber: number,
    displayName: string,
    x: number,
    y: number,
    returnFocus?: HTMLElement,
  ): Promise<void> {
    const token = ++this.#profileMenuToken;
    if (!this.#isProfileMenuOperationCurrent(token)) return;
    try {
      await this.#renderProfileMenuOperation(
        memberNumber,
        displayName,
        x,
        y,
        returnFocus,
        token,
      );
    } catch {
      if (!this.#isProfileMenuOperationCurrent(token)) return;
      this.#closeProfileMenu();
      this.#toast("Player actions could not be loaded right now.", "error");
    }
  }

  async #renderProfileMenuOperation(
    memberNumber: number,
    displayName: string,
    x: number,
    y: number,
    returnFocus: HTMLElement | undefined,
    token: number,
  ): Promise<void> {
    this.presence.request(memberNumber);
    const conversation = await this.service.getConversation(memberNumber);
    if (!this.#isProfileMenuOperationCurrent(token)) return;
    const nativeName = conversation?.peerName ?? displayName;
    const shownName = conversation ? conversationDisplayName(conversation) : displayName;
    const snapshot = this.presence.get(memberNumber);
    const rosterEntry = this.roster.get(memberNumber, nativeName);
    let inRoom = false;
    try {
      inRoom = typeof this.adapter.isMemberInCurrentRoom === "function"
        ? this.adapter.isMemberInCurrentRoom(memberNumber)
        : false;
    } catch {
      // A transient native character proxy must not break the action menu.
    }
    const addonAvailable = this.presence.hasCompatiblePeer(memberNumber);
    const headerPresenceLabel = element("span", { text: presenceLabel(snapshot.status) });
    headerPresenceLabel.dataset.presenceLabel = "true";
    const headerPresence = element(
      "span",
      { title: presenceDescription(snapshot) },
      presenceDot(snapshot.status),
      headerPresenceLabel,
      ` · #${memberNumber}`,
    );
    headerPresence.dataset.presenceDescription = "true";
    const header = element(
      "header",
      { className: "kl-profile-menu-header" },
      element(
        "div",
        { className: "kl-avatar-wrap" },
        this.#avatar(shownName, memberNumber),
        presenceDot(snapshot.status),
      ),
      element(
        "div",
        { className: "kl-profile-menu-identity" },
        element("strong", { text: shownName }),
        headerPresence,
        snapshot.statusMessage
          ? element("small", { className: "kl-presence-note", text: snapshot.statusMessage })
          : null,
        conversation?.localAlias
          ? element("small", {
              className: "kl-profile-native-name",
              text: `Local nickname · ${conversation.peerName}`,
            })
          : null,
      ),
    );
    header.dataset.memberNumber = memberNumber.toString();
    const primary = element(
      "div",
      { className: "kl-profile-menu-group" },
      this.#profileMenuAction(
        "profile",
        "KikiLink Profile",
        addonAvailable ? "Open addon profile card" : "KikiLink has not been detected for this player",
        () => this.#openAddonProfile(memberNumber, shownName, returnFocus),
        false,
      ),
      this.#profileMenuAction(
        "chat",
        "Message",
        "Open LinkChat",
        () => this.openChat(memberNumber, nativeName),
      ),
      this.#profileMenuAction(
        "whisper",
        "Whisper",
        inRoom ? "Set native Whisper target" : "Available while this player is in your room",
        () => {
          try {
            this.adapter.startWhisper(memberNumber);
            this.close();
          } catch (error) {
            this.#toast(error instanceof Error ? error.message : "Unable to start Whisper", "error");
          }
        },
        !inRoom,
      ),
      this.#profileMenuAction(
        "profile",
        "Native profile",
        inRoom ? "Open the Bondage Club profile" : "Available while this player is in your room",
        () => {
          try {
            this.adapter.openProfile(memberNumber);
            this.close();
          } catch (error) {
            this.#toast(error instanceof Error ? error.message : "Unable to open profile", "error");
          }
        },
        !inRoom,
      ),
    );
    const organize = element(
      "div",
      { className: "kl-profile-menu-group" },
      this.#profileMenuAction(
        "star",
        rosterEntry.favorite ? "Remove favorite" : "Add favorite",
        "Saved in your private player notebook",
        () => {
          this.roster.toggleFavorite(memberNumber, nativeName);
          this.#renderRoster();
          void this.#renderHome();
          this.#toast(rosterEntry.favorite ? "Removed from favorites." : "Added to favorites.");
        },
        false,
        rosterEntry.favorite,
      ),
      this.#profileMenuAction("note", "Player note", "Open private notes and tags", () => {
        this.#openRoster(memberNumber);
      }),
      conversation
        ? this.#profileMenuAction(
            "edit",
            conversation.localAlias ? "Edit local nickname" : "Set local nickname",
            conversation.localAlias
              ? `Only you see “${conversation.localAlias}”`
              : "Cosmetic and visible only to you",
            () => this.#openAliasDialog(conversation),
          )
        : null,
      conversation
        ? this.#profileMenuAction(
            "pin",
            conversation.pinned ? "Unpin chat" : "Pin chat",
            "Organize your recent chats",
            () => this.#toggleConversationPin(memberNumber),
            false,
            conversation.pinned,
          )
        : null,
      conversation
        ? this.#profileMenuAction(
            "unread",
            "Mark unread",
            "Keep this chat in your unread queue",
            () => this.#markConversationUnread(memberNumber),
          )
        : null,
      this.#profileMenuAction("id", "Copy member ID", `Copy ${memberNumber}`, () => {
        void this.#copyRosterMemberNumber(memberNumber);
      }),
    );
    const remove = conversation
      ? element(
          "div",
          { className: "kl-profile-menu-group kl-profile-menu-group--danger" },
          this.#profileMenuAction(
            "trash",
            "Remove from recent chats",
            "Deletes only this account's KikiLink history",
            () => this.#openRemoveChatDialog(memberNumber, shownName),
          ),
        )
      : null;
    if (!this.#isProfileMenuOperationCurrent(token)) return;
    this.#profileMenu.replaceChildren(header, primary, organize);
    this.#profileMenu.dataset.memberNumber = memberNumber.toString();
    if (remove) this.#profileMenu.append(remove);
    this.#profileMenu.hidden = false;
    this.#profileMenu.style.left = `${x}px`;
    this.#profileMenu.style.top = `${y}px`;
    const bounds = this.#profileMenu.getBoundingClientRect();
    this.#profileMenu.style.left = `${clamp(x, 8, Math.max(8, window.innerWidth - bounds.width - 8))}px`;
    this.#profileMenu.style.top = `${clamp(y, 8, Math.max(8, window.innerHeight - bounds.height - 8))}px`;
    this.#profileMenu.querySelector<HTMLButtonElement>(".kl-profile-menu-action:not(:disabled)")?.focus();
  }

  #isProfileMenuOperationCurrent(token: number): boolean {
    return (
      token === this.#profileMenuToken &&
      this.#mounted &&
      !this.#panel.hidden &&
      this.#host.isConnected
    );
  }

  #cancelProfileMenuLongPresses(): void {
    for (const timer of this.#profileMenuLongPressTimers) clearTimeout(timer);
    this.#profileMenuLongPressTimers.clear();
  }

  #profileMenuAction(
    icon: KikiLinkIconName,
    label: string,
    help: string,
    action: () => void | Promise<void>,
    disabled = false,
    filled = false,
  ): HTMLButtonElement {
    const button = element(
      "button",
      { className: "kl-profile-menu-action", type: "button" },
      element("span", { className: "kl-profile-menu-icon" }, kikiIcon(icon, "kl-profile-action-icon", filled)),
      element(
        "span",
        { className: "kl-profile-menu-copy" },
        element("span", { className: "kl-profile-menu-label", text: label }),
        element("span", { className: "kl-profile-menu-help", text: help }),
      ),
    );
    button.setAttribute("role", "menuitem");
    button.disabled = disabled;
    button.addEventListener("click", () => {
      this.#closeProfileMenu();
      this.#runPlayerAction(action, "Player action could not be completed.");
    });
    return button;
  }

  #runPlayerAction(action: () => void | Promise<void>, fallbackMessage: string): void {
    try {
      const pending = action();
      if (pending) {
        void pending.catch((error: unknown) =>
          this.#reportPlayerActionError(error, fallbackMessage));
      }
    } catch (error) {
      this.#reportPlayerActionError(error, fallbackMessage);
    }
  }

  #reportPlayerActionError(error: unknown, fallbackMessage: string): void {
    if (!this.#mounted) return;
    this.#toast(
      error instanceof Error && error.message.trim() ? error.message : fallbackMessage,
      "error",
    );
  }

  #closeProfileMenu(): void {
    this.#profileMenuToken += 1;
    this.#cancelProfileMenuLongPresses();
    this.#profileMenu.hidden = true;
    this.#profileMenu.replaceChildren();
  }

  async #toggleConversationPin(memberNumber: number): Promise<void> {
    const pinned = await this.service.togglePinned(memberNumber);
    if (memberNumber === this.#activePeer) {
      this.#renderPinButton(pinned);
    }
    await this.#renderConversations();
    this.#toast(pinned ? "Chat pinned." : "Chat unpinned.");
  }

  async #markConversationUnread(memberNumber: number): Promise<void> {
    await this.service.markUnread(memberNumber);
    await this.refresh();
    this.#toast("Chat marked unread.");
  }

  #openNewChat(): void {
    this.#newChatQuery.value = "";
    this.#renderKnownContacts();
    if (!this.#newChatDialog.open) this.#newChatDialog.showModal();
    this.#newChatQuery.focus();
  }

  async #submitNewChat(): Promise<void> {
    const query = this.#newChatQuery.value.trim();
    if (!query) {
      this.#toast("Choose a contact or enter a valid member number.", "error");
      return;
    }
    const memberNumber = Number(query.replace(/^#/u, ""));
    if (!Number.isSafeInteger(memberNumber) || memberNumber <= 0) {
      let exactContact: KnownContact | undefined;
      try {
        exactContact = this.adapter
          .getKnownContacts()
          .find((contact) => contact.memberName.toLocaleLowerCase() === query.toLocaleLowerCase());
      } catch {
        this.#toast("Bondage Club contacts could not be read right now. Try again shortly.", "error");
        return;
      }
      if (exactContact) {
        this.#newChatDialog.close();
        try {
          await this.openChat(exactContact.memberNumber, exactContact.memberName);
        } catch (error) {
          this.#reportPlayerActionError(error, "LinkChat could not be opened.");
        }
        return;
      }
      this.#toast("Choose a contact or enter a valid member number.", "error");
      return;
    }
    let ownMemberNumber = -1;
    try {
      ownMemberNumber = this.adapter.getOwnMemberNumber();
    } catch {
      // Treat an unreadable local identity as unavailable instead of risking a self-Beep.
    }
    if (!Number.isSafeInteger(ownMemberNumber) || ownMemberNumber <= 0) {
      this.#toast("Your Bondage Club account could not be read right now. Try again shortly.", "error");
      return;
    }
    if (memberNumber === ownMemberNumber) {
      this.#toast("You cannot Beep yourself.", "error");
      return;
    }
    let memberName = `Member ${memberNumber}`;
    try {
      memberName = this.adapter.getMemberName(memberNumber);
    } catch {
      // A numeric member ID remains sufficient to open a local conversation.
    }
    this.#newChatDialog.close();
    try {
      await this.openChat(memberNumber, memberName);
    } catch (error) {
      this.#reportPlayerActionError(error, "LinkChat could not be opened.");
    }
  }

  #renderKnownContacts(): void {
    const query = this.#newChatQuery.value.trim().toLocaleLowerCase();
    const onlineNumbers = new Set<number>();
    const roomNumbers = new Set<number>();
    let onlineSnapshotReady = false;
    try {
      for (const friend of this.adapter.getOnlineFriends()) onlineNumbers.add(friend.memberNumber);
      onlineSnapshotReady = this.adapter.hasOnlineFriendSnapshot();
    } catch {
      // The native friend snapshot can be unavailable while BC changes screens.
    }
    try {
      for (const character of this.adapter.getRoomCharacters()) roomNumbers.add(character.memberNumber);
    } catch {
      // Keep the dialog useful with the account contact list alone.
    }
    const filter = this.#newChatFilterSelect.value;
    let contactsReadable = true;
    let contacts: Array<KnownContact & { inRoom: boolean; online: boolean }> = [];
    try {
      contacts = this.adapter
        .getKnownContacts()
        .map((contact) => ({
          ...contact,
          inRoom: roomNumbers.has(contact.memberNumber),
          online: onlineNumbers.has(contact.memberNumber) || roomNumbers.has(contact.memberNumber),
        }))
        .filter((contact) =>
          (!query ||
            contact.memberName.toLocaleLowerCase().includes(query) ||
            contact.memberNumber.toString().includes(query)) &&
          (filter !== "online" || contact.online) &&
          (filter !== "room" || contact.inRoom),
        )
        .sort((left, right) => {
          if (this.#newChatSortSelect.value === "online") {
            const leftRank = left.inRoom ? 2 : left.online ? 1 : 0;
            const rightRank = right.inRoom ? 2 : right.online ? 1 : 0;
            if (leftRank !== rightRank) return rightRank - leftRank;
          }
          return left.memberName.localeCompare(right.memberName, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        })
        .slice(0, 40);
    } catch {
      contactsReadable = false;
    }

    this.#newChatResults.replaceChildren();
    if (contacts.length === 0) {
      this.#newChatResults.append(
        element("div", {
          className: "kl-contact-empty",
          text:
            !contactsReadable
              ? "Bondage Club contacts could not be read right now. Try again shortly."
              : this.#connectionState === "ready"
              ? filter === "online"
                ? onlineSnapshotReady
                  ? "No matching contacts are online. You can still enter a member number."
                  : "Online status is still loading. You can still enter a member number."
                : filter === "room"
                  ? "No matching contacts are in this room."
                  : "No matching known contacts. You can still enter a member number."
              : "Contacts will appear after KikiLink connects to the game.",
        }),
      );
      return;
    }

    for (const contact of contacts) {
      const presence = this.presence.get(contact.memberNumber);
      const nativeState = contact.inRoom
        ? "room"
        : contact.online
          ? "online"
          : onlineSnapshotReady
            ? "offline"
            : "unknown";
      const button = element(
        "button",
        { className: "kl-contact", type: "button" },
        element(
          "div",
          { className: "kl-avatar-wrap" },
          this.#avatar(contact.memberName, contact.memberNumber),
          presenceDot(presence.status === "unknown" && contact.online ? "online" : presence.status),
        ),
        element(
          "div",
          { className: "kl-contact-copy" },
          element("div", { className: "kl-contact-name", text: contact.memberName }),
          element(
            "div",
            { className: "kl-contact-meta" },
            element("span", { className: "kl-contact-number", text: `Member ${contact.memberNumber}` }),
            element("span", {
              className: "kl-contact-native-state",
              text: contact.inRoom
                ? "In this room"
                : contact.online
                  ? "Online"
                  : onlineSnapshotReady
                    ? "Offline"
                    : "Status unknown",
            }),
          ),
        ),
      );
      button.dataset.nativeState = nativeState;
      button.addEventListener("click", () => {
        this.#newChatDialog.close();
        this.#runPlayerAction(
          () => this.openChat(contact.memberNumber, contact.memberName),
          "LinkChat could not be opened.",
        );
      });
      this.#bindProfileMenu(button, () => ({
        memberNumber: contact.memberNumber,
        displayName: contact.memberName,
      }));
      button.dataset.memberNumber = contact.memberNumber.toString();
      this.#newChatResults.append(button);
    }
    try {
      this.presence.requestMany(contacts.map((contact) => contact.memberNumber));
    } catch {
      // Native contacts remain usable if addon presence discovery is temporarily guarded.
    }
  }

  #renderQuickActions(): void {
    const actions = this.settings.get().linkChat.quickActions;
    this.#quickActions.replaceChildren();
    this.#quickActions.hidden = actions.length === 0;

    for (const action of actions) {
      this.#quickActions.append(
        element("button", {
          className: "kl-action-chip",
          type: "button",
          text: action.label,
          title: action.template,
          onClick: () => this.#insertQuickAction(action),
        }),
      );
    }
  }

  #insertQuickAction(action: QuickAction): void {
    if (this.#activePeer === undefined) return;
    const expanded = action.template
      .replaceAll("{name}", this.#activeNativeName)
      .replaceAll("{member}", this.#activePeer.toString())
      .replaceAll("{me}", this.adapter.getOwnName());
    const current = this.#composer.value.trimEnd();
    const next = current ? `${current}\n${expanded}` : expanded;
    if (next.length > 1000) {
      this.#toast("This action would exceed the 1000 character Beep limit.", "error");
      return;
    }

    this.#composer.value = next;
    this.#composer.dispatchEvent(new Event("input", { bubbles: true }));
    this.#composer.focus();
  }

  #renderQuickActionEditor(actions: QuickAction[]): void {
    this.#quickActionsEditor.replaceChildren();
    for (const action of actions) this.#addQuickActionEditorRow(action);
  }

  #addQuickActionEditorRow(action: QuickAction = { label: "", template: "" }): void {
    if (this.#quickActionsEditor.childElementCount >= 12) {
      this.#toast("You can keep up to 12 quick actions.", "error");
      return;
    }

    const label = element("input", { className: "kl-action-label" }) as HTMLInputElement;
    label.placeholder = "Label";
    label.maxLength = 24;
    label.value = action.label;
    label.dataset.field = "label";
    const template = element("input", { className: "kl-action-template" }) as HTMLInputElement;
    template.placeholder = "Action text";
    template.maxLength = 500;
    template.value = action.template;
    template.dataset.field = "template";
    const remove = element("button", {
      className: "kl-icon-button kl-remove-action",
      type: "button",
      title: "Remove action",
      ariaLabel: "Remove quick action",
    });
    remove.append(kikiIcon("trash"));
    const row = element("div", { className: "kl-action-editor-row" }, label, template, remove);
    remove.addEventListener("click", () => row.remove());
    this.#quickActionsEditor.append(row);
    if (!action.label && !action.template) label.focus();
  }

  #readQuickActionEditor(): QuickAction[] {
    return [...this.#quickActionsEditor.querySelectorAll<HTMLElement>(".kl-action-editor-row")]
      .map((row) => ({
        label: row.querySelector<HTMLInputElement>('[data-field="label"]')?.value.trim() ?? "",
        template:
          row.querySelector<HTMLInputElement>('[data-field="template"]')?.value.trim() ?? "",
      }))
      .filter((action) => action.label && action.template);
  }

  #renderReactionRuleEditor(rules: ReactionRule[]): void {
    this.#reactionRulesEditor.replaceChildren();
    for (const rule of rules) this.#addReactionRuleEditorRow(rule);
    this.#updateReactionRuleCount();
  }

  #addReactionRuleEditorRow(
    rule: ReactionRule = createDefaultReactionRule(createReactionRuleId()),
  ): void {
    if (this.#reactionRulesEditor.childElementCount >= MAX_REACTION_RULES) {
      this.#toast(`You can keep up to ${MAX_REACTION_RULES} reaction rules.`, "error");
      return;
    }

    const enabled = element("input") as HTMLInputElement;
    enabled.type = "checkbox";
    enabled.checked = rule.enabled;
    enabled.dataset.field = "enabled";
    enabled.setAttribute("aria-label", `Enable ${rule.label}`);
    const enabledLabel = element(
      "label",
      { className: "kl-reaction-rule-enabled" },
      enabled,
      element("span", { text: "On" }),
    );
    const name = element("input", { className: "kl-reaction-name" }) as HTMLInputElement;
    name.value = rule.label;
    name.maxLength = 32;
    name.placeholder = "Rule name";
    name.dataset.field = "label";
    name.setAttribute("aria-label", "Reaction rule name");

    const trigger = element("select", { className: "kl-select" }) as HTMLSelectElement;
    trigger.replaceChildren(
      selectOption("beep-received", "Incoming Beep"),
      selectOption("room-join", "Player joins room"),
      selectOption("room-leave", "Player leaves room"),
      selectOption("friend-online", "Friend comes online"),
    );
    trigger.value = rule.trigger;
    trigger.dataset.field = "trigger";
    const scope = element("select", { className: "kl-select" }) as HTMLSelectElement;
    scope.replaceChildren(
      selectOption("anyone", "Anyone"),
      selectOption("friends", "Friends only"),
      selectOption("members", "Specific members"),
    );
    scope.value = rule.scope;
    scope.dataset.field = "scope";
    const members = element("input", { className: "kl-reaction-input" }) as HTMLInputElement;
    members.value = rule.memberNumbers.join(", ");
    members.placeholder = "12345, 67890";
    members.maxLength = 240;
    members.dataset.field = "members";
    const textMatch = element("input", { className: "kl-reaction-input" }) as HTMLInputElement;
    textMatch.value = rule.textMatch;
    textMatch.placeholder = "Optional words";
    textMatch.maxLength = 80;
    textMatch.dataset.field = "text-match";
    const action = element("select", { className: "kl-select" }) as HTMLSelectElement;
    action.replaceChildren(
      selectOption("notice", "Local notice"),
      selectOption("room-emote", "Send room emote"),
    );
    action.value = rule.action;
    action.dataset.field = "action";
    const cooldown = element("input", {
      className: "kl-number-input kl-reaction-cooldown",
    }) as HTMLInputElement;
    cooldown.type = "number";
    cooldown.min = "0";
    cooldown.max = MAX_REACTION_COOLDOWN_SECONDS.toString();
    cooldown.value = rule.cooldownSeconds.toString();
    cooldown.dataset.field = "cooldown";
    const template = element("textarea", {
      className: "kl-reaction-template",
    }) as HTMLTextAreaElement;
    template.value = rule.template;
    template.maxLength = 500;
    template.rows = 2;
    template.dataset.field = "template";

    const row = element("article", { className: "kl-reaction-rule" });
    row.dataset.ruleId = rule.id;
    const moveUp = element("button", {
      className: "kl-icon-button kl-reaction-move kl-reaction-move--up",
      type: "button",
      title: "Move rule up",
      ariaLabel: `Move ${rule.label} up`,
      onClick: () => {
        const previous = row.previousElementSibling;
        if (previous) this.#reactionRulesEditor.insertBefore(row, previous);
      },
    });
    moveUp.append(kikiIcon("back"));
    const moveDown = element("button", {
      className: "kl-icon-button kl-reaction-move kl-reaction-move--down",
      type: "button",
      title: "Move rule down",
      ariaLabel: `Move ${rule.label} down`,
      onClick: () => {
        const next = row.nextElementSibling;
        if (next) next.after(row);
      },
    });
    moveDown.append(kikiIcon("back"));
    const remove = element("button", {
      className: "kl-icon-button kl-remove-action",
      type: "button",
      title: "Remove reaction rule",
      ariaLabel: `Remove ${rule.label}`,
      onClick: () => {
        row.remove();
        this.#updateReactionRuleCount();
      },
    });
    remove.append(kikiIcon("trash"));
    const note = element("div", { className: "kl-reaction-rule-note" });
    row.append(
      element(
        "header",
        { className: "kl-reaction-rule-header" },
        enabledLabel,
        name,
        element("div", { className: "kl-reaction-rule-order" }, moveUp, moveDown, remove),
      ),
      element(
        "div",
        { className: "kl-reaction-rule-grid" },
        reactionField("When", trigger),
        reactionField("Who", scope),
        reactionField("Member numbers", members, "kl-reaction-members-field"),
        reactionField("Beep contains", textMatch, "kl-reaction-match-field"),
        reactionField("Then", action),
        reactionField("Cooldown (seconds)", cooldown),
        reactionField("Message template", template, "kl-reaction-template-field"),
      ),
      note,
    );
    trigger.addEventListener("change", () => this.#syncReactionRuleEditorRow(row));
    scope.addEventListener("change", () => this.#syncReactionRuleEditorRow(row));
    action.addEventListener("change", () => this.#syncReactionRuleEditorRow(row));
    this.#reactionRulesEditor.append(row);
    this.#syncReactionRuleEditorRow(row);
    this.#updateReactionRuleCount();
    if (!rule.label) name.focus();
  }

  #syncReactionRuleEditorRow(row: HTMLElement): void {
    const trigger = row.querySelector<HTMLSelectElement>('[data-field="trigger"]')?.value;
    const scope = row.querySelector<HTMLSelectElement>('[data-field="scope"]')?.value;
    const action = row.querySelector<HTMLSelectElement>('[data-field="action"]')?.value;
    const members = row.querySelector<HTMLInputElement>('[data-field="members"]');
    const match = row.querySelector<HTMLInputElement>('[data-field="text-match"]');
    const template = row.querySelector<HTMLTextAreaElement>('[data-field="template"]');
    if (members) members.disabled = scope !== "members";
    if (match) match.disabled = trigger !== "beep-received";
    row.querySelector<HTMLElement>(".kl-reaction-members-field")?.toggleAttribute(
      "data-disabled",
      scope !== "members",
    );
    row.querySelector<HTMLElement>(".kl-reaction-match-field")?.toggleAttribute(
      "data-disabled",
      trigger !== "beep-received",
    );
    if (template) {
      template.placeholder =
        action === "room-emote"
          ? "greets {name} as they arrive."
          : "{name} {event}.";
    }
    const note = row.querySelector<HTMLElement>(".kl-reaction-rule-note");
    if (note) {
      note.textContent =
        action === "room-emote"
          ? "Public room action. Private {message} content is always removed before sending."
          : "Private KikiLink notice shown beside the launcher when the panel is closed.";
      note.dataset.public = String(action === "room-emote");
    }
  }

  #readReactionRuleEditor(): ReactionRule[] | undefined {
    const rules: ReactionRule[] = [];
    const rows = [
      ...this.#reactionRulesEditor.querySelectorAll<HTMLElement>(".kl-reaction-rule"),
    ];
    for (const [index, row] of rows.entries()) {
      const label = row.querySelector<HTMLInputElement>('[data-field="label"]')?.value.trim() ?? "";
      const template =
        row.querySelector<HTMLTextAreaElement>('[data-field="template"]')?.value.trim() ?? "";
      if (!label || !template) {
        const control = row.querySelector<HTMLElement>(
          !label ? '[data-field="label"]' : '[data-field="template"]',
        );
        control?.focus();
        this.#toast(`Complete the name and template for reaction rule ${index + 1}.`, "error");
        return undefined;
      }

      const scopeValue = row.querySelector<HTMLSelectElement>('[data-field="scope"]')?.value;
      const scope =
        scopeValue === "friends" || scopeValue === "members" ? scopeValue : "anyone";
      const membersInput = row.querySelector<HTMLInputElement>('[data-field="members"]');
      const memberNumbers =
        scope === "members" ? parseReactionMemberNumbers(membersInput?.value ?? "") : [];
      if (scope === "members" && (!memberNumbers || memberNumbers.length === 0)) {
        membersInput?.focus();
        this.#toast(
          `Enter up to ${MAX_REACTION_MEMBERS} valid member numbers for reaction rule ${index + 1}.`,
          "error",
        );
        return undefined;
      }

      const cooldownInput = row.querySelector<HTMLInputElement>('[data-field="cooldown"]');
      const cooldownSeconds = Number(cooldownInput?.value);
      if (
        !Number.isInteger(cooldownSeconds) ||
        cooldownSeconds < 0 ||
        cooldownSeconds > MAX_REACTION_COOLDOWN_SECONDS
      ) {
        cooldownInput?.focus();
        this.#toast(
          `Reaction cooldown must be between 0 and ${MAX_REACTION_COOLDOWN_SECONDS} seconds.`,
          "error",
        );
        return undefined;
      }

      const triggerValue = row.querySelector<HTMLSelectElement>('[data-field="trigger"]')?.value;
      const actionValue = row.querySelector<HTMLSelectElement>('[data-field="action"]')?.value;
      rules.push({
        id: row.dataset.ruleId || createReactionRuleId(),
        label,
        enabled:
          row.querySelector<HTMLInputElement>('[data-field="enabled"]')?.checked === true,
        trigger:
          triggerValue === "room-join" ||
          triggerValue === "room-leave" ||
          triggerValue === "friend-online"
            ? triggerValue
            : "beep-received",
        scope,
        memberNumbers: memberNumbers ?? [],
        textMatch:
          triggerValue === "beep-received"
            ? row.querySelector<HTMLInputElement>('[data-field="text-match"]')?.value.trim() ?? ""
            : "",
        action: actionValue === "room-emote" ? "room-emote" : "notice",
        template,
        cooldownSeconds,
      });
    }
    return rules;
  }

  #updateReactionRuleCount(): void {
    const count = this.#reactionRulesEditor.childElementCount;
    this.#reactionRuleCount.textContent =
      count === 0 ? "Optional" : `${count} rule${count === 1 ? "" : "s"}`;
  }

  #openSettings(section?: SettingsSection): void {
    const settings = this.settings.get();
    if (this.#workspaceView !== "settings") this.#settingsReturnView = this.#workspaceView;
    this.#themeSelect.value = settings.ui.theme;
    this.#accentInput.value = settings.ui.accent;
    this.#updateAccentPresets();
    this.#densitySelect.value = settings.ui.density;
    this.#textScaleSelect.value = settings.ui.textScale;
    this.#homeLayoutSelect.value = settings.ui.homeLayout;
    this.#launcherSideSelect.value = settings.ui.launcherSide;
    this.#launcherOpenSelect.value = settings.ui.launcherOpen;
    this.#reducedMotionToggle.checked = settings.ui.reducedMotion;
    this.#historyToggle.checked = settings.linkChat.saveHistory;
    this.#enterToSendToggle.checked = settings.linkChat.enterToSend;
    this.#typingIndicatorsToggle.checked = settings.linkChat.typingIndicators;
    this.#imagePreviewSelect.value = settings.linkChat.imagePreviews;
    this.#imageUploadsToggle.checked = settings.linkChat.imageUploads.enabled;
    this.#imageUploadRetentionSelect.value = settings.linkChat.imageUploads.retention;
    this.#renderImageUploadSettingsOptions();
    this.#roomBadgeToggle.checked = settings.ui.roomBadge.enabled;
    this.#retentionInput.value = settings.linkChat.retentionDays.toString();
    this.#renderQuickActionEditor(settings.linkChat.quickActions);
    this.#rosterEnabledToggle.checked = settings.linkRoster.enabled;
    this.#rosterTrackingToggle.checked = settings.linkRoster.trackEncounters;
    this.#rosterRetentionSelect.value = settings.linkRoster.retentionDays.toString();
    this.#updateNotebookCount();
    this.#activitiesToggle.checked = settings.linkActivities.enabled;
    this.#friendOnlineAlertToggle.checked = settings.linkReactions.quickAlerts.friendOnline;
    this.#roomJoinAlertToggle.checked = settings.linkReactions.quickAlerts.roomJoin;
    this.#notificationSoundsToggle.checked = settings.linkReactions.sounds.enabled;
    this.#soundVolumeInput.value = settings.linkReactions.sounds.volume.toString();
    this.#soundVolumeValue.textContent = `${settings.linkReactions.sounds.volume}%`;
    this.#chatSoundSelect.value = settings.linkReactions.sounds.chat;
    this.#friendOnlineSoundSelect.value = settings.linkReactions.sounds.friendOnline;
    this.#roomJoinSoundSelect.value = settings.linkReactions.sounds.roomJoin;
    void this.#refreshCustomSounds(settings.linkReactions.sounds);
    this.#reactionsToggle.checked = settings.linkReactions.enabled;
    this.#renderReactionRuleEditor(settings.linkReactions.rules);
    this.#showWorkspace("settings", false);
    this.#showSettingsSection(section ?? settings.ui.settingsSection, false);
    this.#settingsTabs
      .querySelector<HTMLButtonElement>(`[data-section="${this.#settingsSection}"]`)
      ?.focus();
  }

  #showSettingsSection(section: SettingsSection, remember: boolean): void {
    this.#settingsSection = section;
    for (const [candidate, panel] of this.#settingsPanels) {
      panel.hidden = candidate !== section;
    }
    for (const tab of this.#settingsTabs.querySelectorAll<HTMLButtonElement>(".kl-settings-tab")) {
      const selected = tab.dataset.section === section;
      tab.dataset.active = String(selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    if (remember && this.settings.get().ui.settingsSection !== section) {
      this.settings.update((draft) => {
        draft.ui.settingsSection = section;
      });
    }
  }

  #renderImageUploadSettingsOptions(): void {
    const enabled = this.#imageUploadsToggle.checked;
    this.#imageUploadSettingsOptions.hidden = !enabled;
    this.#imageUploadRetentionSelect.disabled = !enabled;
  }

  async #refreshCustomSounds(
    selected: KikiLinkSettings["linkReactions"]["sounds"] = {
      ...this.settings.get().linkReactions.sounds,
      chat: soundChoiceOr(this.#chatSoundSelect.value, "chime"),
      friendOnline: soundChoiceOr(this.#friendOnlineSoundSelect.value, "sparkle"),
      roomJoin: soundChoiceOr(this.#roomJoinSoundSelect.value, "pop"),
    },
  ): Promise<void> {
    let sounds: DeviceNotificationSound[];
    try {
      sounds = await this.soundStore.list();
    } catch {
      sounds = [];
    }
    const builtIns = Object.entries(NOTIFICATION_SOUND_LABELS) as Array<
      [NotificationSoundPreset, string]
    >;
    const available = new Set(sounds.map((sound) => `custom:${sound.id}`));
    const selections = [
      [this.#chatSoundSelect, selected.chat, "chime"],
      [this.#friendOnlineSoundSelect, selected.friendOnline, "sparkle"],
      [this.#roomJoinSoundSelect, selected.roomJoin, "pop"],
    ] as const;
    for (const [select, choice, fallback] of selections) {
      select.replaceChildren(
        ...builtIns.map(([value, label]) => selectOption(value, label)),
        ...sounds.map((sound) => selectOption(`custom:${sound.id}`, `My · ${sound.name}`)),
      );
      if (choice.startsWith("custom:") && !available.has(choice)) {
        const unavailable = selectOption(choice, "Custom sound unavailable on this device");
        unavailable.disabled = true;
        select.append(unavailable);
      }
      select.value = choice || fallback;
    }

    if (sounds.length === 0) {
      this.#customSoundList.replaceChildren(
        element("div", {
          className: "kl-custom-sound-empty",
          text: "No local sounds saved on this device.",
        }),
      );
      return;
    }
    this.#customSoundList.replaceChildren(
      ...sounds.map((sound) =>
        element(
          "div",
          { className: "kl-custom-sound" },
          element(
            "div",
            { className: "kl-custom-sound-copy" },
            element("strong", { text: sound.name }),
            element("span", { text: `${(sound.durationMs / 1_000).toFixed(1)} s · local` }),
          ),
          element("button", {
            className: "kl-text-button kl-sound-preview",
            type: "button",
            text: "Play",
            onClick: () =>
              void this.#notificationSounds.play(`custom:${sound.id}`, {
                volume: Number(this.#soundVolumeInput.value),
              }),
          }),
          element("button", {
            className: "kl-icon-button kl-text-button--danger",
            type: "button",
            title: `Delete ${sound.name}`,
            ariaLabel: `Delete ${sound.name}`,
            onClick: () => void this.#deleteCustomSound(sound),
          }, kikiIcon("trash")),
        ),
      ),
    );
  }

  async #addCustomSound(): Promise<void> {
    const file = this.#customSoundInput.files?.[0];
    this.#customSoundInput.value = "";
    if (!file) return;
    try {
      const sound = await this.soundStore.add(file);
      const current = this.settings.get().linkReactions.sounds;
      await this.#refreshCustomSounds({ ...current, chat: `custom:${sound.id}` });
      this.#chatSoundSelect.value = `custom:${sound.id}`;
      this.#toast(`Saved “${sound.name}” locally. Choose Save changes to use it.`);
    } catch (error) {
      this.#toast(
        error instanceof Error ? error.message : "That local sound could not be saved.",
        "error",
      );
    }
  }

  async #deleteCustomSound(sound: DeviceNotificationSound): Promise<void> {
    if (typeof confirm === "function" && !confirm(`Delete the local sound “${sound.name}”?`)) return;
    await this.soundStore.delete(sound.id);
    const choice: NotificationSoundChoice = `custom:${sound.id}`;
    const settings = this.settings.update((draft) => {
      if (draft.linkReactions.sounds.chat === choice) draft.linkReactions.sounds.chat = "chime";
      if (draft.linkReactions.sounds.friendOnline === choice) {
        draft.linkReactions.sounds.friendOnline = "sparkle";
      }
      if (draft.linkReactions.sounds.roomJoin === choice) draft.linkReactions.sounds.roomJoin = "pop";
    });
    await this.#refreshCustomSounds(settings.linkReactions.sounds);
    this.#toast(`Deleted “${sound.name}” from this device.`);
  }

  #updateAccentPresets(): void {
    for (const swatch of this.#settingsPage.querySelectorAll<HTMLButtonElement>(".kl-color-swatch")) {
      const selected = swatch.dataset.color === this.#accentInput.value.toLocaleLowerCase();
      swatch.dataset.selected = String(selected);
      swatch.setAttribute("aria-pressed", String(selected));
    }
  }

  #cancelSettings(): void {
    this.#showWorkspace(this.#availableWorkspace(this.#settingsReturnView));
  }

  #saveSettings(): void {
    const retentionDays = Number(this.#retentionInput.value);
    const reactionRules = this.#readReactionRuleEditor();
    if (!reactionRules) return;
    const currentSettings = this.settings.get();
    const launcherSide = this.#launcherSideSelect.value === "left" ? "left" : "right";
    const settings = this.settings.update((draft) => {
      draft.ui.theme =
        this.#themeSelect.value === "light" || this.#themeSelect.value === "system"
          ? this.#themeSelect.value
          : "dark";
      draft.ui.accent = this.#accentInput.value;
      draft.ui.density =
        this.#densitySelect.value === "compact" ||
        this.#densitySelect.value === "super-compact"
          ? this.#densitySelect.value
          : "comfortable";
      draft.ui.textScale =
        this.#textScaleSelect.value === "large" ||
        this.#textScaleSelect.value === "extra-large"
          ? this.#textScaleSelect.value
          : "normal";
      draft.ui.homeLayout = this.#homeLayoutSelect.value === "compact" ? "compact" : "showcase";
      draft.ui.launcherSide = launcherSide;
      draft.ui.launcherOpen =
        this.#launcherOpenSelect.value === "last" || this.#launcherOpenSelect.value === "chat"
          ? this.#launcherOpenSelect.value
          : "home";
      if (launcherSide !== currentSettings.ui.launcherSide) draft.ui.launcherPosition = null;
      draft.ui.roomBadge = {
        enabled: this.#roomBadgeToggle.checked,
        position: currentSettings.ui.roomBadge.position,
      };
      draft.ui.reducedMotion = this.#reducedMotionToggle.checked;
      draft.ui.settingsSection = this.#settingsSection;
      draft.linkChat.saveHistory = this.#historyToggle.checked;
      draft.linkChat.enterToSend = this.#enterToSendToggle.checked;
      draft.linkChat.typingIndicators = this.#typingIndicatorsToggle.checked;
      draft.linkChat.imagePreviews =
        this.#imagePreviewSelect.value === "always" || this.#imagePreviewSelect.value === "never"
          ? this.#imagePreviewSelect.value
          : "ask";
      draft.linkChat.imageUploads = {
        enabled: this.#imageUploadsToggle.checked,
        retention:
          this.#imageUploadRetentionSelect.value === "1h" ||
          this.#imageUploadRetentionSelect.value === "12h" ||
          this.#imageUploadRetentionSelect.value === "72h"
            ? this.#imageUploadRetentionSelect.value
            : "24h",
      };
      draft.linkChat.quickActions = this.#readQuickActionEditor();
      draft.linkRoster.enabled = this.#rosterEnabledToggle.checked;
      draft.linkRoster.trackEncounters = this.#rosterTrackingToggle.checked;
      const rosterRetentionDays = Number(this.#rosterRetentionSelect.value);
      if (Number.isInteger(rosterRetentionDays)) {
        draft.linkRoster.retentionDays = rosterRetentionDays;
      }
      draft.linkActivities.enabled = this.#activitiesToggle.checked;
      draft.linkReactions.quickAlerts.friendOnline = this.#friendOnlineAlertToggle.checked;
      draft.linkReactions.quickAlerts.roomJoin = this.#roomJoinAlertToggle.checked;
      draft.linkReactions.sounds.enabled = this.#notificationSoundsToggle.checked;
      draft.linkReactions.sounds.volume = Math.round(Number(this.#soundVolumeInput.value));
      draft.linkReactions.sounds.chat = soundChoiceOr(this.#chatSoundSelect.value, "chime");
      draft.linkReactions.sounds.friendOnline = soundChoiceOr(
        this.#friendOnlineSoundSelect.value,
        "sparkle",
      );
      draft.linkReactions.sounds.roomJoin = soundChoiceOr(
        this.#roomJoinSoundSelect.value,
        "pop",
      );
      draft.linkReactions.enabled = this.#reactionsToggle.checked;
      draft.linkReactions.rules = reactionRules;
      if (Number.isInteger(retentionDays)) draft.linkChat.retentionDays = retentionDays;
    });
    this.#applyTheme(settings);
    this.#schedulePresenceRender();
    this.activities.syncFromSettings();
    if (settings.linkReactions.sounds.enabled) void this.#notificationSounds.unlock();
    if (!settings.linkChat.typingIndicators) this.#stopLocalTyping();
    const removedPlayers = this.roster.prune();
    this.#updateNotebookCount();
    this.#renderQuickActions();
    if (this.#activePeer !== undefined) void this.#renderMessages(this.#activePeer);
    this.#renderActivePresence();
    this.#renderHomeStatus();
    void this.#renderHome();
    this.#showWorkspace(this.#availableWorkspace(this.#settingsReturnView, settings));
    void this.service.prune();
    this.#toast(
      removedPlayers > 0
        ? `Settings saved. Forgot ${removedPlayers} old encounter${removedPlayers === 1 ? "" : "s"}.`
        : "Settings saved.",
    );
  }

  #resetLauncherPosition(): void {
    const settings = this.settings.update((draft) => {
      draft.ui.launcherPosition = null;
    });
    this.#applyTheme(settings);
    this.#toast("Launcher returned to its default corner.");
  }

  #resetPanelPosition(): void {
    this.settings.update((draft) => {
      draft.ui.panelPosition = null;
    });
    this.#positionPanel();
    this.#toast("KikiLink window returned to its default corner.");
  }

  #resetRoomBadgePosition(): void {
    this.#roomBadge.resetPosition();
    this.#toast("Blossom returned beside the character addon icons.");
  }

  #beginRoomBadgePlacement(): void {
    if (!this.settings.get().ui.roomBadge.enabled) {
      this.settings.update((draft) => {
        draft.ui.roomBadge.enabled = true;
      });
      this.#roomBadgeToggle.checked = true;
    }
    if (!this.#roomBadge.beginPlacement()) {
      this.#toast("Enter a chat room and wait until your character is visible, then try again.", "error");
      return;
    }
    this.close();
  }

  async #clearHistory(): Promise<void> {
    if (!window.confirm("Clear all KikiLink direct and group chats, messages, and drafts?")) return;
    const [directResult, groupResult] = await Promise.allSettled([
      this.service.clearHistory(),
      this.#groupChatService?.clear() ?? Promise.resolve(true),
    ]);
    this.#resetActiveConversation();
    let refreshFailed = false;
    try {
      await this.refresh();
    } catch (error) {
      refreshFailed = true;
      console.error("[KikiLink:link-chat] Chat list refresh after clear failed", error);
    }

    if (directResult.status === "rejected" || groupResult.status === "rejected") {
      if (directResult.status === "rejected") {
        console.error("[KikiLink:link-chat] Direct chat history clear failed", directResult.reason);
      }
      if (groupResult.status === "rejected") {
        console.error("[KikiLink:group-chat] Group chat history clear failed", groupResult.reason);
      }
      this.#toast(
        "KikiLink could not verify that all chat history was cleared. Please retry.",
        "error",
      );
      return;
    }
    if (!directResult.value && !groupResult.value) {
      this.#toast(
        "Direct and group chats are cleared for this session, but durable browser storage did not retain the change. Saved chats may reappear after reload.",
        "error",
      );
      return;
    }
    if (!groupResult.value) {
      this.#toast(
        "Group chats are cleared for this session, but browser storage did not retain the change. Saved groups may reappear; KikiLink will retry.",
        "error",
      );
      return;
    }
    if (!directResult.value) {
      this.#toast(
        "Direct chats are cleared for this session, but durable browser storage did not retain the change. Saved chats may reappear after reload.",
        "error",
      );
      return;
    }
    if (refreshFailed) {
      this.#toast(
        "Chat history was cleared, but the list could not refresh. Reopen KikiLink to reload it.",
        "error",
      );
      return;
    }
    this.#toast("Direct and group chat history cleared.");
  }

  #resetActiveConversation(): void {
    this.#stopLocalTyping();
    this.#activePeer = undefined;
    this.#activeName = "";
    this.#activeNativeName = "";
    this.#messageRenderPeer = undefined;
    this.#loadingOlderMessages = false;
    this.#renderedMessageIds.clear();
    this.#composer.value = "";
    this.#messages.replaceChildren();
    this.#attachImageButton.disabled = true;
    this.#chat.hidden = true;
    this.#empty.hidden = this.#groupChatPanel?.activeGroupId !== undefined;
    this.#panel.dataset.mobileView = "list";
  }

  #exportNotebook(): void {
    if (typeof URL.createObjectURL !== "function") {
      this.#toast("This browser cannot create a notebook download.", "error");
      return;
    }
    const backup = this.roster.exportNotebook();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `KikiLink-player-notebook-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.hidden = true;
    this.#shadow.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    this.#toast(
      backup.records.length === 1
        ? "Exported 1 player to a local JSON backup."
        : `Exported ${backup.records.length} players to a local JSON backup.`,
    );
  }

  async #importNotebookFile(): Promise<void> {
    const file = this.#notebookFileInput.files?.[0];
    this.#notebookFileInput.value = "";
    if (!file) return;
    if (file.size > 2_000_000) {
      this.#toast("That notebook backup is larger than the 2 MB safety limit.", "error");
      return;
    }
    if (
      !window.confirm(
        "Merge this KikiLink backup with the current player notebook? Existing notes, tags, and favorites will be preserved.",
      )
    ) {
      return;
    }

    try {
      const result = this.roster.importNotebook(await file.text());
      const removed = this.roster.prune();
      this.#updateNotebookCount();
      this.#selectedRosterMember = undefined;
      this.#notebookDirty = false;
      if (this.#workspaceView === "roster") this.#renderRoster();
      void this.#renderHome();
      const skipped = result.skipped > 0 ? ` ${result.skipped} invalid entr${result.skipped === 1 ? "y was" : "ies were"} skipped.` : "";
      const expired = removed > 0 ? ` ${removed} expired encounter${removed === 1 ? " was" : "s were"} omitted.` : "";
      this.#toast(`Merged ${result.imported} player${result.imported === 1 ? "" : "s"}.${skipped}${expired}`);
    } catch (error) {
      this.#toast(error instanceof Error ? error.message : "Could not import that notebook.", "error");
    }
  }

  #updateNotebookCount(): void {
    const count = this.roster.notebookCount();
    this.#notebookCount.textContent = `${count} saved player${count === 1 ? "" : "s"} · JSON stays local`;
  }

  #clearPeople(): void {
    if (!window.confirm("Clear all KikiLink player notes, tags, favorites, and encounter history?")) {
      return;
    }
    this.roster.clear();
    this.#selectedRosterMember = undefined;
    this.#notebookDirty = false;
    this.#updateNotebookCount();
    if (this.#workspaceView === "roster") this.#renderRoster();
    void this.#renderHome();
    this.#toast("LinkRoster notebook cleared.");
  }

  async #updateUnreadBadge(): Promise<void> {
    const unread = await this.service.totalUnread() + (this.#groupChatService?.totalUnread() ?? 0);
    this.#unreadCount = unread;
    this.#badge.hidden = unread === 0;
    this.#badge.textContent = unread > 99 ? "99+" : unread.toString();
  }

  #resizeComposer(): void {
    this.#composer.style.height = "auto";
    this.#composer.style.height = `${Math.min(this.#composer.scrollHeight, 120)}px`;
  }

  #updateCounter(): void {
    const count = this.#composer.value.length;
    this.#counter.textContent = `${count}/1000 · Ctrl+Enter`;
    this.#counter.dataset.over = String(count > 1000);
  }

  #applyTheme(settings: KikiLinkSettings): void {
    this.#host.style.setProperty("--kl-accent", settings.ui.accent);
    this.#host.style.setProperty("--kl-accent-strong", settings.ui.accent);
    this.#host.style.setProperty("--kl-accent-foreground", readableForeground(settings.ui.accent));
    this.#host.dataset.theme = settings.ui.theme;
    this.#host.dataset.density = settings.ui.density;
    this.#host.dataset.textScale = settings.ui.textScale;
    this.#host.dataset.homeLayout = settings.ui.homeLayout;
    this.#host.dataset.reducedMotion = String(settings.ui.reducedMotion);
    this.#launcher.dataset.side = settings.ui.launcherSide;
    this.#panel.dataset.side = settings.ui.launcherSide;
    if (this.#host.isConnected) this.#positionLauncher();
  }

  #startLauncherDrag(event: PointerEvent): void {
    if (event.button !== 0) return;
    const rect = this.#launcher.getBoundingClientRect();
    this.#launcherDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    };
    try {
      this.#launcher.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is an enhancement; document-level pointer delivery still works without it.
    }
  }

  #moveLauncher(event: PointerEvent): void {
    const drag = this.#launcherDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 5) return;

    drag.moved = true;
    event.preventDefault();
    this.#launcher.dataset.dragging = "true";
    this.#placeLauncher(drag.startLeft + deltaX, drag.startTop + deltaY);
  }

  #finishLauncherDrag(event: PointerEvent): void {
    const drag = this.#launcherDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    this.#launcherDrag = undefined;
    this.#launcher.dataset.dragging = "false";
    try {
      this.#launcher.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already have been released by the browser.
    }

    if (!drag.moved) return;
    this.#saveLauncherPosition();
    this.#suppressLauncherClickUntil = Date.now() + 500;
  }

  #cancelLauncherDrag(event: PointerEvent): void {
    if (!this.#launcherDrag || this.#launcherDrag.pointerId !== event.pointerId) return;
    this.#launcherDrag = undefined;
    this.#launcher.dataset.dragging = "false";
    this.#positionLauncher();
  }

  #placeLauncher(left: number, top: number): void {
    const width = this.#launcher.offsetWidth || 58;
    const height = this.#launcher.offsetHeight || 58;
    const maxLeft = Math.max(0, window.innerWidth - width);
    const maxTop = Math.max(0, window.innerHeight - height);
    const safeLeft = clamp(left, 0, maxLeft);
    const safeTop = clamp(top, 0, maxTop);
    const side = safeLeft + width / 2 < window.innerWidth / 2 ? "left" : "right";

    this.#launcher.style.left = `${Math.round(safeLeft)}px`;
    this.#launcher.style.top = `${Math.round(safeTop)}px`;
    this.#launcher.style.right = "auto";
    this.#launcher.style.bottom = "auto";
    this.#launcher.dataset.side = side;
    this.#panel.dataset.side = side;
  }

  #saveLauncherPosition(): void {
    const rect = this.#launcher.getBoundingClientRect();
    const maxLeft = Math.max(0, window.innerWidth - rect.width);
    const maxTop = Math.max(0, window.innerHeight - rect.height);
    const x = maxLeft === 0 ? 0.5 : clamp(rect.left / maxLeft, 0, 1);
    const y = maxTop === 0 ? 0.5 : clamp(rect.top / maxTop, 0, 1);
    const launcherSide = rect.left + rect.width / 2 < window.innerWidth / 2 ? "left" : "right";
    this.settings.update((draft) => {
      draft.ui.launcherPosition = { x, y };
      draft.ui.launcherSide = launcherSide;
    });
  }

  #positionLauncher(): void {
    const ui = this.settings.get().ui;
    if (!ui.launcherPosition) {
      this.#launcher.style.removeProperty("left");
      this.#launcher.style.removeProperty("top");
      this.#launcher.style.removeProperty("right");
      this.#launcher.style.removeProperty("bottom");
      this.#launcher.dataset.side = ui.launcherSide;
      this.#panel.dataset.side = ui.launcherSide;
      return;
    }

    const width = this.#launcher.offsetWidth || 58;
    const height = this.#launcher.offsetHeight || 58;
    this.#placeLauncher(
      ui.launcherPosition.x * Math.max(0, window.innerWidth - width),
      ui.launcherPosition.y * Math.max(0, window.innerHeight - height),
    );
  }

  #startPanelDrag(event: PointerEvent): void {
    if (event.button !== 0 || this.#isMobileLayout() || this.#panelDrag) return;
    const topbar = event.currentTarget;
    for (const target of event.composedPath()) {
      if (target === topbar) break;
      if (
        target instanceof Element &&
        target.matches(
          "button, a, input, select, textarea, label, [role='button'], [contenteditable='true'], [data-no-panel-drag]",
        )
      ) {
        return;
      }
    }
    const rect = this.#panel.getBoundingClientRect();
    this.#panelDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    };
    try {
      (event.currentTarget as HTMLElement | null)?.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional.
    }
  }

  #movePanel(event: PointerEvent): void {
    const drag = this.#panelDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 5) return;
    drag.moved = true;
    event.preventDefault();
    this.#panel.dataset.dragging = "true";
    this.#placePanel(drag.startLeft + deltaX, drag.startTop + deltaY);
  }

  #finishPanelDrag(event: PointerEvent): void {
    const drag = this.#panelDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    this.#panelDrag = undefined;
    this.#panel.dataset.dragging = "false";
    try {
      (event.currentTarget as HTMLElement | null)?.releasePointerCapture(event.pointerId);
    } catch {
      // The browser may have released it already.
    }
    if (drag.moved) this.#savePanelPosition();
  }

  #cancelPanelDrag(event: PointerEvent): void {
    if (!this.#panelDrag || this.#panelDrag.pointerId !== event.pointerId) return;
    this.#panelDrag = undefined;
    this.#panel.dataset.dragging = "false";
    this.#positionPanel();
  }

  #placePanel(left: number, top: number): void {
    if (this.#isMobileLayout()) return;
    const rect = this.#panel.getBoundingClientRect();
    const width = rect.width || Math.min(1_040, Math.max(320, window.innerWidth - 40));
    const height = rect.height || Math.min(680, Math.max(420, window.innerHeight - 130));
    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - width - margin);
    const maxTop = Math.max(margin, window.innerHeight - height - margin);
    this.#panel.style.left = `${Math.round(clamp(left, margin, maxLeft))}px`;
    this.#panel.style.top = `${Math.round(clamp(top, margin, maxTop))}px`;
    this.#panel.style.right = "auto";
    this.#panel.style.bottom = "auto";
  }

  #savePanelPosition(): void {
    const rect = this.#panel.getBoundingClientRect();
    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
    const x = maxLeft === margin ? 0.5 : clamp((rect.left - margin) / (maxLeft - margin), 0, 1);
    const y = maxTop === margin ? 0.5 : clamp((rect.top - margin) / (maxTop - margin), 0, 1);
    this.settings.update((draft) => {
      draft.ui.panelPosition = { x, y };
    });
  }

  #positionPanel(): void {
    const position = this.settings.get().ui.panelPosition;
    if (!position || this.#isMobileLayout()) {
      this.#panel.style.removeProperty("left");
      this.#panel.style.removeProperty("top");
      this.#panel.style.removeProperty("right");
      this.#panel.style.removeProperty("bottom");
      return;
    }
    const rect = this.#panel.getBoundingClientRect();
    const width = rect.width || Math.min(1_040, Math.max(320, window.innerWidth - 40));
    const height = rect.height || Math.min(680, Math.max(420, window.innerHeight - 130));
    const margin = 8;
    this.#placePanel(
      margin + position.x * Math.max(0, window.innerWidth - width - margin * 2),
      margin + position.y * Math.max(0, window.innerHeight - height - margin * 2),
    );
  }

  #isMobileLayout(): boolean {
    return window.innerWidth <= 720;
  }

  #showConversationList(): void {
    this.#panel.dataset.mobileView = "list";
    this.#search.focus();
  }

  #emblem(className: string): HTMLSpanElement {
    const image = element("img", { className: "kl-emblem-image" }) as HTMLImageElement;
    image.src = KIKILINK_EMBLEM_DATA_URL;
    image.alt = "";
    image.decoding = "async";
    image.draggable = false;
    return element("span", { className: `kl-emblem ${className}` }, image);
  }

  #avatar(name: string, memberNumber: number, extraClass = ""): HTMLDivElement {
    const avatar = element("div", {
      className: `kl-avatar${extraClass ? ` ${extraClass}` : ""}`,
    });
    this.#renderAvatar(avatar, name, memberNumber);
    return avatar;
  }

  #renderAvatar(
    target: HTMLElement,
    name: string,
    memberNumber: number,
    explicitUrl?: string,
  ): void {
    let snapshot: PresenceSnapshot;
    try {
      snapshot = this.presence.get(memberNumber);
    } catch {
      snapshot = { memberNumber, status: "unknown", source: "unknown", updatedAt: 0 };
    }
    let ownMember = false;
    try {
      ownMember = memberNumber === this.adapter.getOwnMemberNumber();
    } catch {
      // Treat guarded native identity as remote for privacy purposes.
    }
    const candidateUrl = normalizeImageUrl(explicitUrl ?? snapshot.avatarUrl ?? "") ?? "";
    const policy = this.settings.get().linkChat.imagePreviews;
    const allowedUrl =
      explicitUrl !== undefined ||
      ownMember ||
      policy === "always" ||
      (policy === "ask" && this.#revealedAvatarUrls.has(avatarRevealKey(memberNumber, candidateUrl)))
        ? candidateUrl
        : "";
    const avatarFrame =
      ownMember && explicitUrl !== undefined
        ? this.#presenceAvatarFrame.value || this.settings.get().linkPresence.avatarFrame
        : snapshot.avatarFrame ?? "none";
    if (
      target.dataset.avatarName === name &&
      target.dataset.avatarUrl === allowedUrl &&
      target.dataset.avatarFrame === avatarFrame &&
      target.childNodes.length > 0
    ) {
      return;
    }
    const token = this.#nextRemoteImageRender(target);
    target.dataset.kikilinkAvatar = "true";
    target.dataset.avatarName = name;
    target.dataset.avatarUrl = allowedUrl;
    target.dataset.avatarMemberNumber = memberNumber.toString();
    target.dataset.avatarFrame = avatarFrame;
    if (target.getAttribute("role") === "button") {
      target.setAttribute("aria-label", `Open KikiLink profile for ${name}`);
    } else {
      target.removeAttribute("aria-label");
    }
    const fallback = (): void => {
      if (
        !this.#isCurrentRemoteImageRender(target, token) ||
        target.dataset.avatarName !== name ||
        target.dataset.avatarUrl !== allowedUrl
      ) {
        return;
      }
      target.replaceChildren(document.createTextNode(avatarText(name)));
      target.dataset.avatarState = "initials";
    };
    fallback();
    if (!allowedUrl) return;

    target.dataset.avatarState = "loading";
    const controller = this.#startRemoteImageLoad(target);
    void this.remoteImageLoader.load(allowedUrl, controller.signal).then((localUrl) => {
      if (
        !this.#isLiveRemoteImageRender(target, token) ||
        target.dataset.avatarName !== name ||
        target.dataset.avatarUrl !== allowedUrl
      ) {
        return;
      }
      const image = document.createElement("img");
      image.alt = `${name} profile avatar`;
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("load", () => {
        if (
          this.#isLiveRemoteImageRender(target, token) &&
          image.parentElement === target
        ) {
          target.dataset.avatarState = "image";
        }
      }, { once: true });
      image.addEventListener("error", () => {
        if (target.isConnected) fallback();
      }, { once: true });
      target.replaceChildren(image);
      image.src = localUrl;
    }).catch(() => {
      if (!controller.signal.aborted && target.isConnected) fallback();
    }).finally(() => this.#releaseRemoteImageLoad(target, controller));
  }

  #rememberRevealedAvatar(memberNumber: number, url: string): void {
    const normalized = normalizeImageUrl(url);
    if (!normalized) return;
    const key = avatarRevealKey(memberNumber, normalized);
    this.#revealedAvatarUrls.delete(key);
    this.#revealedAvatarUrls.add(key);
    while (this.#revealedAvatarUrls.size > 200) {
      const oldest = this.#revealedAvatarUrls.values().next().value as string | undefined;
      if (oldest === undefined) break;
      this.#revealedAvatarUrls.delete(oldest);
    }
  }

  #renderOwnAvatarPreview(): void {
    const url = normalizeImageUrl(this.#presenceAvatarUrl.value);
    this.#renderAvatar(
      this.#presenceAvatarPreview,
      this.adapter.getOwnName(),
      this.adapter.getOwnMemberNumber(),
      url ?? "",
    );
    this.#presenceAvatarPreview.dataset.avatarFrame = this.#presenceAvatarFrame.value || "none";
  }

  #toast(message: string, kind: "info" | "error" = "info"): void {
    if (this.#toastTimer !== undefined) clearTimeout(this.#toastTimer);
    this.#toastTimer = undefined;
    this.#shadow.querySelector(".kl-toast")?.remove();
    const toast = element(
      "div",
      { className: "kl-toast" },
      element("span", { className: "kl-toast-message", text: message }),
    );
    toast.dataset.kind = kind;
    toast.setAttribute("role", kind === "error" ? "alert" : "status");
    toast.setAttribute("aria-live", kind === "error" ? "assertive" : "polite");
    toast.setAttribute("aria-atomic", "true");
    const dismiss = element("button", {
      className: "kl-toast-dismiss",
      type: "button",
      title: "Dismiss message",
      ariaLabel: "Dismiss message",
      onClick: () => {
        if (this.#toastTimer !== undefined) clearTimeout(this.#toastTimer);
        this.#toastTimer = undefined;
        toast.remove();
      },
    });
    dismiss.append(kikiIcon("close"));
    toast.append(dismiss);
    const surface = this.#newChatDialog.open
      ? this.#newChatDialog
      : this.#panel.hidden
        ? this.#shadow
        : this.#panel;
    if (surface === this.#shadow) {
      toast.classList.add("kl-toast--floating");
      toast.dataset.side = this.settings.get().ui.launcherSide;
    }
    surface.append(toast);
    if (kind === "info") {
      this.#toastTimer = setTimeout(() => {
        toast.remove();
        this.#toastTimer = undefined;
      }, 5000);
    }
  }
}

function reactionField(
  label: string,
  control: HTMLElement,
  className = "",
): HTMLLabelElement {
  return element(
    "label",
    { className: `kl-reaction-field${className ? ` ${className}` : ""}` },
    element("span", { className: "kl-reaction-field-label", text: label }),
    control,
  );
}

function parseReactionMemberNumbers(value: string): number[] | undefined {
  const source = value.trim();
  if (!source) return [];
  const memberNumbers: number[] = [];
  for (const token of source.split(/[\s,;]+/u).filter(Boolean)) {
    const normalized = token.replace(/^#/u, "");
    if (!/^\d+$/u.test(normalized)) return undefined;
    const memberNumber = Number(normalized);
    if (!Number.isSafeInteger(memberNumber) || memberNumber < 0) return undefined;
    if (!memberNumbers.includes(memberNumber)) memberNumbers.push(memberNumber);
    if (memberNumbers.length > MAX_REACTION_MEMBERS) return undefined;
  }
  return memberNumbers;
}

function createReactionRuleId(): string {
  const random =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `reaction-${Date.now().toString(36)}-${random}`;
}

function soundChoiceOr(
  value: string,
  fallback: NotificationSoundPreset,
): NotificationSoundChoice {
  return value === "sparkle" ||
    value === "pop" ||
    value === "chime" ||
    /^custom:[a-z0-9_-]{1,64}$/iu.test(value)
    ? value as NotificationSoundChoice
    : fallback;
}

function roomActionPastTense(action: BCRoomMemberAction): string {
  if (action === "kick") return "Kicked";
  if (action === "promote") return "Promoted";
  if (action === "demote") return "Removed admin from";
  if (action === "whitelist") return "Whitelisted";
  return "Removed from room whitelist";
}

function finderSettingResults(): FinderResult[] {
  const definitions: Array<{
    section: SettingsSection;
    title: string;
    detail: string;
    keywords: string;
  }> = [
    {
      section: "appearance",
      title: "Appearance & comfort",
      detail: "Theme, logo comfort, room Blossom position, spacing, text size, and motion",
      keywords: "light dark system color colour blossom addon badge icon position drag reset guided focused density compact super tiny font scale reduced motion",
    },
    {
      section: "navigation",
      title: "Navigation & launcher",
      detail: "Opening destination, side, and launcher position",
      keywords: "home last chat left right drag reset emblem start screen",
    },
    {
      section: "chat",
      title: "Chat & history",
      detail: "Typing, temporary Litterbox sharing, history, retention, and Quick Actions",
      keywords: "beep messages typing indicator realtime image picture preview upload local litterbox catbox temporary privacy enter send newline save storage hours days clear wave hug boop template afk idle avatar profile",
    },
    {
      section: "players",
      title: "Players & notebook",
      detail: "Roster, encounters, retention, notes, and notebook backup",
      keywords: "people linkroster tracking private data clear whisper profile export import backup json favorites tags retention",
    },
    {
      section: "activities",
      title: "Custom Activities",
      detail: "Body slots, vanilla pictures, action text, and optional arousal",
      keywords: "custom activities blossom body slot image target me gender pronoun arousal advanced",
    },
    {
      section: "reactions",
      title: "Notifications",
      detail: "Friend, room, and chat alerts with optional sounds and advanced rules",
      keywords:
        "alert sound audio chime sparkle pop linkreactions automation event rule beep join leave online friend notification notice emote advanced cooldown template",
    },
    {
      section: "about",
      title: "About KikiLink",
      detail: "Creator, version, Discord, repository, and license",
      keywords: "about creator kiki member number version discord community github repository license mit",
    },
  ];
  return definitions.map((definition, index) => ({
    id: `setting-${definition.section}`,
    kind: "setting",
    icon: "settings",
    category: "Settings",
    title: definition.title,
    detail: definition.detail,
    keywords: definition.keywords,
    priority: 58 - index,
    action: { kind: "setting", section: definition.section },
  }));
}

function normalizeFinderText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/gu, " ");
}

function rankFinderResults(catalog: FinderResult[], query: string): FinderResult[] {
  const terms = query.split(" ").filter(Boolean);
  return catalog
    .map((result) => {
      const title = normalizeFinderText(result.title);
      const detail = normalizeFinderText(result.detail);
      const category = normalizeFinderText(result.category);
      const haystack = `${title} ${detail} ${category} ${normalizeFinderText(result.keywords)}`;
      if (!terms.every((term) => haystack.includes(term))) return undefined;

      let score = result.priority;
      if (title === query) score += 1000;
      else if (title.startsWith(query)) score += 650;
      else if (title.includes(query)) score += 360;
      if (category === query) score += 220;
      else if (category.startsWith(query)) score += 90;
      if (detail.startsWith(query)) score += 80;
      for (const term of terms) {
        if (title.split(" ").some((word) => word.startsWith(term))) score += 35;
      }
      return { result, score };
    })
    .filter((entry): entry is { result: FinderResult; score: number } => entry !== undefined)
    .sort(
      (left, right) =>
        right.score - left.score || left.result.title.localeCompare(right.result.title),
    )
    .map((entry) => entry.result);
}

function aboutFact(label: string, value: string): HTMLDivElement {
  return element(
    "div",
    { className: "kl-about-fact" },
    element("dt", { text: label }),
    element("dd", { text: value }),
  );
}

function selectOption(value: string, label: string): HTMLOptionElement {
  const option = element("option", { text: label });
  option.value = value;
  return option;
}

function activePlaylist(playlists: MusicPlaylist[], activeId: string): MusicPlaylist {
  const playlist = playlists.find((candidate) => candidate.id === activeId) ?? playlists[0];
  if (!playlist) throw new Error("Create a playlist first");
  return playlist;
}

function createLocalId(prefix: string): string {
  const random = typeof crypto === "object" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`.toLocaleLowerCase().replace(/[^a-z0-9_-]/gu, "").slice(0, 64);
}

function normalizeAudioTrackUrl(value: string): string {
  const candidate = value.trim();
  if (!candidate || candidate.length > 500) throw new Error("Enter a direct HTTPS audio link");
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid direct HTTPS audio link");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !/\.(?:aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/iu.test(url.pathname)
  ) {
    throw new Error("Use a direct HTTPS audio link ending in a supported audio extension");
  }
  return url.href;
}

function normalizeRoomTrackUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && /\.(?:mp3|mp4)$/iu.test(url.pathname)
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

function trackTitleFromUrl(value: string): string {
  try {
    const file = new URL(value).pathname.split("/").at(-1) ?? "";
    return decodeURIComponent(file).replace(/\.[^.]+$/u, "").replace(/[_-]+/gu, " ").trim().slice(0, 80);
  } catch {
    return "Untitled track";
  }
}

function formatAudioTime(value: number): string {
  const seconds = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function lobbySpaceLabel(value: string): string {
  return value === "X" ? "Mixed" : value === "M" ? "Male" : "Female";
}

function lobbyRoomNameKey(value: string): string {
  return value.trim().replace(/\s+/gu, " ").toLocaleLowerCase();
}

function lobbyMapTypeLabel(value: string): string {
  const normalized = value.trim().toLocaleLowerCase();
  if (!normalized) return "";
  if (normalized === "never") return "Character view";
  if (normalized === "always") return "Map view";
  return `Map mode: ${value.trim()}`;
}

function rosterRelationshipLabel(relationship: PlayerRelationship): string {
  if (relationship === "owner") return "Owner";
  if (relationship === "sub") return "Sub";
  if (relationship === "lover") return "Lover";
  if (relationship === "whitelist") return "Whitelist";
  if (relationship === "blacklist") return "Blacklist";
  return "Ghosted";
}

function rosterRelationshipDescription(relationship: PlayerRelationship): string {
  if (relationship === "owner") return "This player is your current owner";
  if (relationship === "sub") return "This player is your BC submissive";
  if (relationship === "lover") return "This player is in your BC lover list";
  if (relationship === "whitelist") return "This player is on your BC whitelist";
  if (relationship === "blacklist") return "This player is on your BC blacklist";
  return "This player is on your BC ghost list";
}

function presenceLabel(status: PresenceSnapshot["status"]): string {
  if (status === "online") return "Online";
  if (status === "idle") return "Idle";
  if (status === "dnd") return "Do not disturb";
  if (status === "offline") return "Offline";
  return "Status unavailable";
}

function presenceHelp(status: PresenceStatus): string {
  if (status === "online") return "Available and ready to chat";
  if (status === "idle") return "Away for a little while";
  if (status === "dnd") return "Silences local alerts and stops chat auto-open";
  return "Appear offline inside KikiLink";
}

function presenceDot(status: PresenceSnapshot["status"]): HTMLSpanElement {
  const dot = element("span", { className: "kl-presence-dot" });
  dot.dataset.status = status;
  dot.setAttribute("aria-hidden", "true");
  return dot;
}

function presenceDescription(snapshot: PresenceSnapshot): string {
  const label = presenceLabel(snapshot.status);
  const source =
    snapshot.source === "kikilink"
      ? "shared by KikiLink"
      : snapshot.source === "room"
        ? "currently in your room"
        : snapshot.source === "friend-list"
          ? "Bondage Club friend list"
          : "not available for this player";
  return snapshot.statusMessage
    ? `${label} · ${snapshot.statusMessage} · ${source}`
    : `${label} · ${source}`;
}

function profilePresenceSignature(snapshot: PresenceSnapshot): string {
  return JSON.stringify([
    snapshot.status,
    snapshot.statusMessage ?? "",
    snapshot.avatarUrl ?? "",
    snapshot.avatarFrame ?? "none",
    snapshot.profileStyle ?? "classic",
    snapshot.addonVersion ?? "",
    snapshot.roomName ?? "",
    snapshot.source,
  ]);
}

function messagePreview(content: string): string {
  const trimmed = content.trim();
  const image = parseMessageLinks(trimmed).find(
    (link) => link.image && link.start === 0 && link.end === trimmed.length,
  );
  return image ? "Image" : content;
}

function messageGroupPosition(
  previousDirection: string | undefined,
  direction: string | undefined,
  nextDirection: string | undefined,
): MessageGroupPosition {
  const joinsPrevious = direction !== undefined && previousDirection === direction;
  const joinsNext = direction !== undefined && nextDirection === direction;
  if (joinsPrevious && joinsNext) return "middle";
  if (joinsPrevious) return "end";
  if (joinsNext) return "start";
  return "single";
}

function avatarText(name: string): string {
  const trimmed = name.trim();
  return trimmed ? [...trimmed][0]?.toLocaleUpperCase() ?? "?" : "?";
}

function avatarRevealKey(memberNumber: number, url: string): string {
  return `${memberNumber}:${url}`;
}

function formatConversationTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function formatMessageTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(timestamp),
  );
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "—";
  const elapsed = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(timestamp),
  );
}

function greetingForCurrentTime(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Still awake";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatFullSeenTime(timestamp: number): string {
  if (!timestamp) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRetention(value: LitterboxUploadConfig["retention"]): string {
  const hours = Number.parseInt(value, 10);
  if (hours === 24) return "1 day";
  if (hours === 72) return "3 days";
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

function litterboxRetentionMs(value: LitterboxUploadConfig["retention"]): number {
  return Number.parseInt(value, 10) * 60 * 60 * 1_000;
}

function formatGalleryExpiry(expiresAt: number): string {
  try {
    return `Expires ${new Date(expiresAt).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    })}`;
  } catch {
    return "Expiry unavailable";
  }
}

function deviceRoomMusicFile(track: DeviceMusicTrack): File {
  const mime = track.mimeType.toLocaleLowerCase().split(";", 1)[0];
  const mimeExtension = mime === "audio/mpeg"
    ? "mp3"
    : mime === "audio/mp4" || mime === "video/mp4"
      ? "mp4"
      : undefined;
  const extension = track.roomExtension ?? mimeExtension;
  if (!extension) {
    throw new Error("Bondage Club room music must be a device MP3 or MP4 track");
  }
  const type = extension === "mp3"
    ? "audio/mpeg"
    : mime === "video/mp4"
      ? "video/mp4"
      : "audio/mp4";
  return new File([track.blob], `kikilink-device-room-music.${extension}`, {
    type,
    lastModified: 0,
  });
}

function imageUploadErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : "Unable to prepare this image";
  return (message || "Unable to prepare this image").slice(0, 180);
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard unavailable");
}

function readableForeground(background: string): "#17100d" | "#fff8ee" {
  const channels = [1, 3, 5].map((index) => Number.parseInt(background.slice(index, index + 2), 16));
  const luminance = relativeLuminance(channels);
  const darkContrast = (luminance + 0.05) / 0.057;
  const lightContrast = 1.044 / (luminance + 0.05);
  return darkContrast >= lightContrast ? "#17100d" : "#fff8ee";
}

function relativeLuminance(channels: number[]): number {
  const [red = 0, green = 0, blue = 0] = channels.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
