import { vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import type { CloudClient } from "../src/cloud/client";
import { EventBus } from "../src/core/event-bus";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import { LinkPresenceService } from "../src/modules/link-presence/link-presence-service";
import { ChatService } from "../src/modules/link-chat/chat-service";
import { LinkChatView } from "../src/modules/link-chat/view";
import type { NotificationSoundStore } from "../src/storage/device-notification-sound-store";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";

export async function setupPlatformView(storage = new MemoryKeyValueStorage(), hiddenTabs: Array<"room" | "music"> = [], soundStore?: NotificationSoundStore, cloud?: CloudClient, settingsStorage = new MemoryKeyValueStorage()) {
  const adapter = {
    getMemberName: (id: number) => `Member ${id}`, getMemberNickname: () => undefined,
    getOwnMemberNumber: () => 72385, getOwnName: () => "Lilja", getKnownContacts: () => [],
    getRoomCharacters: () => [], getCurrentRoomName: () => undefined,
    isInChatRoom: () => false, isMemberInCurrentRoom: () => false, isKnownFriend: () => false,
    getPlayerRelationships: () => [], getOnlineFriends: () => [], getOnlineFriend: () => undefined,
    hasOnlineFriendSnapshot: () => true, getOnlineFriendsUpdatedAt: () => Date.now(),
    canSendBeep: () => true, isReady: () => true, sendBeep: vi.fn(), sendKikiLinkProtocol: vi.fn(),
    getRoomSearchSpace: () => "X", searchRooms: vi.fn(async () => []),
    getCurrentLobbyRoom: () => undefined, getRoomAdminSnapshot: () => undefined,
  } as unknown as BCAdapter;
  const settings = new SettingsStore(settingsStorage);
  settings.update(draft => { draft.ui.launcherOpen = "last"; draft.ui.hiddenTabs = hiddenTabs; });
  const service = new ChatService(new MemoryChatRepository(), settings);
  const presence = new LinkPresenceService(adapter, settings, new EventBus(), "1.1.8");
  const view = new LinkChatView(adapter, service, settings, "1.1.8", undefined, undefined, presence, undefined, soundStore);
  if (cloud) view.attachCloud(cloud, storage);
  view.attachNavigationStorage(storage); view.mount(); await view.open();
  const root = document.querySelector("#kikilink-root")!.shadowRoot!;
  const route = (id: string) => root.querySelector<HTMLButtonElement>(`.kl-platform-link[data-route="${id}"]`)!;
  const area = (id: string) => root.querySelector<HTMLButtonElement>(`.kl-platform-area[data-area="${id}"]`)!;
  return { view, root, settings, storage, route, area, service, presence, adapter };
}
