import type { NavigationTab, NavigationVisibilityKey, OptionalPlatformArea } from "../../core/types";
import type { KikiLinkIconName } from "../link-chat/icons";

export type PlatformArea = "home" | OptionalPlatformArea | "settings";
export function hideablePlatformArea(area: PlatformArea): area is OptionalPlatformArea {
  return area !== "home" && area !== "settings";
}
export function platformAreaHidden(area: PlatformArea, hiddenTabs: readonly NavigationVisibilityKey[]): boolean {
  return hideablePlatformArea(area) && hiddenTabs.includes(area);
}
export type PlatformRoute = "discover" | "matching" | "home" | "feed" | "inbox" | "saved" | "news" | "direct" | "groups" | "archived" | "people" | "requests" | "communities" | "events" | "rooms" | "spaces" | "lobbies" | "workshop" | "current-room" | "players" | "music" | "activities" | "presets" | "profile" | "gallery" | "preferences" | "profile-appearance" | "profile-privacy" | "find-people" | "owner-view" | "settings";
export interface PlatformDestination {
  id: PlatformRoute;
  area: PlatformArea;
  label: string;
  icon: KikiLinkIconName;
  legacyTab?: NavigationTab;
  cloud?: boolean;
  action?: boolean;
}
export const PLATFORM_AREAS: ReadonlyArray<{ id: PlatformArea; label: string; icon: KikiLinkIconName }> = [
  { id: "home", label: "Home", icon: "home" },
  { id: "feed", label: "Feed", icon: "feed" },
  { id: "chat", label: "Chat", icon: "chat" },
  { id: "explore", label: "Explore", icon: "navigation" },
  { id: "create", label: "Workshop", icon: "brush" },
  { id: "game", label: "Game", icon: "game" },
  { id: "you", label: "You", icon: "profile" },
  { id: "settings", label: "Settings", icon: "settings" },
];
export const PLATFORM_DESTINATIONS: readonly PlatformDestination[] = [
  { id: "home", area: "home", label: "Overview", icon: "home", legacyTab: "home" },
  { id: "feed", area: "feed", label: "Feed", icon: "feed", legacyTab: "cloud", cloud: true },
  { id: "inbox", area: "home", label: "Inbox", icon: "notifications", cloud: true },
  { id: "saved", area: "home", label: "Saved", icon: "bookmark", legacyTab: "cloud", cloud: true },
  { id: "news", area: "home", label: "News", icon: "note" },
  { id: "direct", area: "chat", label: "Direct", icon: "chat", legacyTab: "chat" },
  { id: "groups", area: "chat", label: "Groups", icon: "users", legacyTab: "chat" },
  { id: "archived", area: "chat", label: "Archived", icon: "archive", legacyTab: "chat" },
  { id: "discover", area: "explore", label: "Discover", icon: "navigation" },
  { id: "communities", area: "explore", label: "Communities", icon: "globe", cloud: true },
  { id: "matching", area: "explore", label: "Matches", icon: "heart", cloud: true },
  { id: "people", area: "explore", label: "People", icon: "users", legacyTab: "roster" },
  { id: "events", area: "explore", label: "Events", icon: "calendar", cloud: true },
  { id: "rooms", area: "explore", label: "Rooms", icon: "door", legacyTab: "room" },
  { id: "requests", area: "explore", label: "Requests", icon: "requests", legacyTab: "roster", cloud: true },
  { id: "workshop", area: "create", label: "Workshop", icon: "appearance" },
  { id: "players", area: "game", label: "Players", icon: "users", legacyTab: "roster" },
  { id: "music", area: "game", label: "Music", icon: "music", legacyTab: "music" },
  { id: "activities", area: "game", label: "Custom activities", icon: "activities", legacyTab: "activities" },
  { id: "presets", area: "game", label: "Room presets", icon: "bookmark", legacyTab: "room" },
  { id: "profile", area: "you", label: "Your profile", icon: "profile" },
  { id: "preferences", area: "you", label: "Preferences", icon: "heart", cloud: true, action: true },
  { id: "profile-appearance", area: "you", label: "Appearance", icon: "appearance", action: true },
  { id: "profile-privacy", area: "you", label: "Privacy", icon: "lock", cloud: true, action: true },
  { id: "find-people", area: "you", label: "Find people", icon: "users", legacyTab: "roster", action: true },
  { id: "owner-view", area: "you", label: "Return to your view", icon: "eye", action: true },
  { id: "gallery", area: "you", label: "Gallery", icon: "image" },
  { id: "settings", area: "settings", label: "Settings", icon: "settings" },
];
export interface PlatformNavigationState {
  route: PlatformRoute;
  hiddenTabs: readonly NavigationVisibilityKey[];
  activitiesEnabled: boolean;
  hasCloud: boolean;
  profilePreview?: boolean;
}
export function visiblePlatformDestinations(state: PlatformNavigationState): PlatformDestination[] {
  return PLATFORM_DESTINATIONS.filter(item => (!item.cloud || state.hasCloud) &&
    (item.area !== "you" || (state.profilePreview ? item.id === "profile" || item.id === "owner-view" : item.id !== "owner-view")) &&
    (item.id !== "find-people" || !platformAreaHidden("explore", state.hiddenTabs)) &&
    (!item.legacyTab || !state.hiddenTabs.includes(item.legacyTab)) &&
    (item.id !== "activities" || state.activitiesEnabled));
}
export function platformDestination(route: PlatformRoute): PlatformDestination {
  return PLATFORM_DESTINATIONS.find(item => item.id === (route === "spaces" || route === "lobbies" || route === "current-room" ? "rooms" : route))!;
}
/** The active area follows real workspace changes, including in-screen links and search results. */
export function routeForWorkspace(workspace: string, context: { archived?: boolean; groups: boolean; roomView: string; requests: boolean; playerScope: string; playersDirectory?: boolean }): PlatformRoute {
  switch (workspace) {
    case "cloud": return "feed";
    case "chat": return context.archived ? "archived" : context.groups ? "groups" : "direct";
    case "roster": return context.requests ? "requests" : context.playersDirectory || context.playerScope === "current" ? "players" : "people";
    case "room": return context.roomView === "presets" ? "presets" : "rooms";
    case "spaces": return "rooms";
    case "discover": case "profile": case "matching": case "events": case "communities": case "news": case "gallery": case "music": case "activities": case "settings": case "inbox": case "saved": case "workshop": return workspace;
    default: return "home";
  }
}
