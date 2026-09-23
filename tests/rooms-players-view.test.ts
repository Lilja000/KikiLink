// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter, BCLobbyRoom } from "../src/bc/adapter";
import { EventBus } from "../src/core/event-bus";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { KikiLinkEvents, OnlineFriend, RoomCharacter } from "../src/core/types";
import { ChatService } from "../src/modules/link-chat/chat-service";
import { LinkChatView } from "../src/modules/link-chat/view";
import { LinkPresenceService } from "../src/modules/link-presence/link-presence-service";
import { LinkRosterService } from "../src/modules/link-roster/link-roster-service";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";
import { PeopleRepository } from "../src/storage/people-repository";

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function setup() {
  let currentName: string | undefined = "Garden";
  let fresh = true;
  let characters: RoomCharacter[] = [{ memberNumber: 1, memberName: "Anna", isFriend: true }, { memberNumber: 5, memberName: "Nearby guest", isFriend: false }];
  const contacts = [{ memberNumber: 1, memberName: "Anna" }, { memberNumber: 2, memberName: "Nikki" },
    { memberNumber: 3, memberName: "Lobby friend" }, { memberNumber: 4, memberName: "Offline friend" }];
  const friends: OnlineFriend[] = [
    { memberNumber: 1, memberName: "Anna", roomName: "Garden", privateRoom: false },
    { memberNumber: 2, memberName: "Nikki", roomName: "Dungeon", privateRoom: false },
    { memberNumber: 3, memberName: "Lobby friend", privateRoom: false },
  ];
  const base = { description: "", language: "EN", memberCount: 3, memberLimit: 10, canJoin: true, locked: false, privateRoom: false, mapType: "" };
  const rooms: BCLobbyRoom[] = [{ ...base, name: "Garden", friends: [contacts[0]!] },
    { ...base, name: "Dungeon", friends: [contacts[1]!] }, { ...base, name: "Favorite", friends: [] },
    { ...base, name: "Full room", memberCount: 10, friends: [contacts[0]!] }];
  const roomSettings = { name: "Garden", description: "Existing description", background: "Boudoir", limit: 10,
    game: "", space: "X", language: "EN", visibility: ["All"], access: ["All"], blockCategory: [], admins: [999],
    whitelist: [], blacklist: [], custom: { imageUrl: "", musicUrl: "", sizeMode: 2, imageFilter: "", musicSync: false } };
  let admin = true;
  const adapter = {
    getMemberName: (id: number) => contacts.find(p => p.memberNumber === id)?.memberName ?? `Member ${id}`,
    getMemberNickname: () => undefined, getOwnMemberNumber: () => 999, getOwnName: () => "Kiki",
    getKnownContacts: () => contacts, getRoomCharacters: () => characters, getCurrentRoomName: () => currentName,
    isInChatRoom: () => Boolean(currentName), isMemberInCurrentRoom: (id: number) => characters.some(p => p.memberNumber === id),
    isKnownFriend: (id: number) => contacts.some(p => p.memberNumber === id), getPlayerRelationships: () => [],
    getOnlineFriends: () => friends, getOnlineFriend: (id: number) => friends.find(p => p.memberNumber === id),
    hasOnlineFriendSnapshot: () => true, getOnlineFriendsUpdatedAt: () => fresh ? Date.now() : 1,
    canSendBeep: () => true, isReady: () => true, sendBeep: vi.fn(), sendKikiLinkProtocol: vi.fn(),
    getRoomSearchSpace: () => "X", searchRooms: vi.fn(async () => rooms), joinRoom: vi.fn(async () => undefined),
    getCurrentLobbyRoom: () => currentName ? rooms[0] : undefined,
    getRoomAdminSnapshot: () => currentName ? { roomName: currentName, isAdmin: admin, customization: roomSettings.custom,
      settings: roomSettings, players: characters.map(p => ({ ...p, admin: false, whitelisted: false })) } : undefined,
  } as unknown as BCAdapter;
  const settings = new SettingsStore(new MemoryKeyValueStorage());
  settings.update(draft => { draft.linkRoom.favoriteRoomNames = ["Favorite"];
    draft.linkRoster.trackEncounters = false;
    draft.linkRoom.presets = [{ id: "old", label: "Existing preset", savedAt: 1, room: roomSettings }]; });
  const people = new PeopleRepository(new MemoryKeyValueStorage());
  const roster = new LinkRosterService(adapter, people, settings);
  roster.saveNotebook(2, "Nikki", "Keep this note", ["trusted"]);
  roster.toggleFavorite(2, "Nikki");
  const bus = new EventBus<KikiLinkEvents>();
  const presence = new LinkPresenceService(adapter, settings, bus, "0.29.0");
  const service = new ChatService(new MemoryChatRepository(), settings);
  await service.ensureConversation(2, "Nikki");
  const view = new LinkChatView(adapter, service, settings, "0.29.0", undefined, roster, presence);
  view.mount(); await view.open();
  const root = document.querySelector("#kikilink-root")!.shadowRoot!;
  const get = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const click = (selector: string) => get<HTMLButtonElement>(selector).click();
  return { adapter, settings, people, service, view, root, get, click, presence, rooms,
    stale: () => { fresh = false; }, leave: () => { currentName = undefined; characters = []; }, readonly: () => { admin = false; } };
}

describe("Rooms and Players browsing", () => {
  it("keeps room people before variable metadata and retains their action after Full/Locked updates", async () => {
    const f = await setup();
    const room = f.rooms[1]!;
    try {
      f.click('[data-target="room"]');
      await vi.waitFor(() => expect(f.root.querySelector('[data-room-name="Dungeon"] .kl-room-people-button')).not.toBeNull());
      const footer = f.get('[data-room-name="Dungeon"] .kl-lobby-card-footer');
      const people = footer.querySelector<HTMLButtonElement>(".kl-room-people-button")!;
      for (const [canJoin, memberCount, label] of [[false, 10, "Full"], [false, 3, "Locked"], [true, 3, "Join"]] as const) {
        Object.assign(room, { canJoin, memberCount, language: "RU", creator: "A creator with a much longer display name" });
        f.click(".kl-lobby-refresh");
        await vi.waitFor(() => expect(footer.querySelector(".kl-lobby-join")?.textContent).toBe(label));
        expect([...footer.children].map(child => child.className)).toEqual(["kl-lobby-people", "kl-lobby-flags", "kl-text-button kl-lobby-join"]);
        expect(footer.querySelector(".kl-room-people-button")).toBe(people);
        expect(footer.querySelector(".kl-lobby-flags")?.getAttribute("title")).toContain("RU · by A creator with a much longer display name");
        expect(people.textContent).toContain("1 friend");
      }
      people.click();
      expect(f.get(".kl-roster-list").textContent).toContain("Nikki");
    } finally { f.view.destroy(); }
  });

  it("renders live current-room metadata in the same order as lobby cards and updates it on refresh", async () => {
    const f = await setup();
    try {
      Object.assign(f.rooms[0]!, { description: "A live description", creator: "Room host", mapType: "Never", locked: true });
      f.click('[data-target="room"]');
      await vi.waitFor(() => expect(f.get(".kl-current-room-summary .kl-lobby-flags").textContent).toBe("EN · by Room host · Character view · Locked"));
      const main = f.get(".kl-current-room-summary .kl-lobby-card-main");
      expect([...main.children].map(n => n.className)).toEqual(["kl-lobby-name", "kl-lobby-current", "kl-lobby-count", "kl-lobby-indicators"]);
      expect(f.root.querySelector(".kl-current-room-summary .kl-room-people-label")).toBeNull();
      f.click(".kl-current-room-summary .kl-lobby-description");
      expect(f.get(".kl-content-dialog .kl-room-description-full").textContent).toBe("A live description");
      f.get<HTMLDialogElement>(".kl-content-dialog").close();
      Object.assign(f.rooms[0]!, { description: "Updated description", creator: "New host", mapType: "Always", locked: false });
      f.click(".kl-lobby-refresh");
      await vi.waitFor(() => expect(f.get(".kl-current-room-summary .kl-lobby-flags").textContent).toBe("EN · by New host · Map view"));
      expect(f.get(".kl-current-room-summary .kl-lobby-description").textContent).toBe("Updated description");
      expect(f.get(".kl-current-room-summary .kl-lobby-locked").hidden).toBe(true);
    } finally { f.view.destroy(); }
  });

  it("shows public tags only and opens private details from the row without deleting notebook data", async () => {
    const f = await setup();
    try {
      const original = f.presence.get.bind(f.presence);
      vi.spyOn(f.presence, "get").mockImplementation(member => ({ ...original(member), publicTags: ["Tea lover"] }));
      vi.spyOn(f.adapter, "getPlayerRelationships").mockReturnValue(["lover", "whitelist"]);
      f.click('[data-target="roster"]'); f.click('[data-scope="friends"]');
      const row = f.get('.kl-roster-entry[data-member-number="2"]');
      expect(row.querySelector(".kl-player-tags")?.textContent).toBe("Tea lover");
      expect(row.textContent).not.toContain("whitelist");
      expect(row.textContent).not.toContain("trusted");
      row.click();
      expect(f.get(".kl-roster-detail").hidden).toBe(false);
      expect(f.get<HTMLTextAreaElement>(".kl-roster-note").value).toBe("Keep this note");
      expect(f.get<HTMLDialogElement>(".kl-addon-profile-dialog").open).toBe(false);
      expect(f.people.get(2)?.tags).toEqual(["trusted"]);
    } finally { f.view.destroy(); }
  });
  it("labels inaccessible lobbies Locked and removes the small lock when access returns", async () => {
    const f = await setup();
    const room = { name: "Closed room", description: "", language: "EN", memberCount: 2, memberLimit: 10,
      canJoin: false, locked: true, privateRoom: false, mapType: "", friends: [] };
    vi.mocked(f.adapter.searchRooms).mockResolvedValue([room]);
    try {
      f.click('[data-target="room"]');
      await vi.waitFor(() => expect(f.root.querySelector('[data-room-name="Closed room"]')).not.toBeNull());
      const selector = '[data-room-name="Closed room"]';
      expect(f.get(`${selector} .kl-lobby-join`).textContent).toBe("Locked");
      expect(f.root.querySelectorAll(`${selector} .kl-lobby-indicators .kl-lobby-lock`)).toHaveLength(1);
      vi.mocked(f.adapter.searchRooms).mockResolvedValue([{ ...room, canJoin: true, locked: false }]);
      f.click(".kl-lobby-refresh");
      await vi.waitFor(() => expect(f.get(`${selector} .kl-lobby-join`).textContent).toBe("Join"));
      expect(f.get(`${selector} .kl-lobby-locked`).hidden).toBe(true);
    } finally { f.view.destroy(); }
  });
  it("opens the directory, pins current room once, keeps full rooms, and preserves presets outside a room", async () => {
    const f = await setup();
    try {
      f.click('[data-target="room"]');
      await vi.waitFor(() => expect(f.get(".kl-lobby-list").children).toHaveLength(3));
      expect(f.get(".kl-room-current-panel").hidden).toBe(true);
      expect(f.get(".kl-lobby-list .kl-lobby-name").textContent).toBe("Favorite");
      expect(f.root.querySelectorAll('.kl-lobby-card[data-current="true"]')).toHaveLength(1);
      expect(f.root.querySelector('.kl-current-room-summary .kl-lobby-join')).toBeNull();
      expect(f.get<HTMLButtonElement>('[data-room-name="Full room"] .kl-lobby-join').textContent).toBe("Full");
      expect(f.get<HTMLButtonElement>('[data-room-name="Full room"] .kl-lobby-join').disabled).toBe(true);
      f.click('[data-room-filter="friends"]');
      // Anna is observably in Garden, so an older room-search claim about Full room is removed.
      expect(f.get(".kl-lobby-list").children).toHaveLength(1);
      f.click(".kl-room-manage");
      expect(f.get(".kl-room-current-panel").hidden).toBe(false);
      expect(f.get(".kl-room-manager").textContent).toContain("Access");
      f.readonly(); f.click('[data-room-subview="presets"]');
      expect(f.get<HTMLButtonElement>(".kl-room-preset-card .kl-text-button--primary").disabled).toBe(true);
      f.leave(); f.click('[data-room-subview="presets"]');
      expect(f.get(".kl-room-preset-list").textContent).toContain("Existing preset");
      expect(f.get<HTMLButtonElement>(".kl-room-preset-create .kl-text-button--primary").disabled).toBe(true);
    } finally { f.view.destroy(); }
  });

  it("keeps people browsing separate from notes, includes remote/offline friends, and restores context", async () => {
    const f = await setup();
    try {
      f.click('[data-target="roster"]');
      expect(f.get(".kl-roster-detail").hidden).toBe(true);
      expect(f.get(".kl-roster-list").children).toHaveLength(2);
      f.click('[data-scope="friends"]');
      expect(f.get(".kl-roster-list").children).toHaveLength(4);
      expect(f.get('.kl-roster-entry[data-member-number="3"] .kl-roster-location-button').textContent).toContain("Lobby");
      expect(f.get('.kl-roster-entry[data-member-number="4"] .kl-roster-location-button').textContent).toBe("Offline");
      expect(f.get('.kl-roster-entry[data-member-number="2"] .kl-roster-location-button').textContent).toContain("Dungeon");
      expect(f.get('.kl-roster-entry[data-member-number="2"]').textContent).not.toContain("Keep this note");
      expect(f.root.querySelector('.kl-roster-list .kl-room-player-actions')).toBeNull();
      const search = f.get<HTMLInputElement>(".kl-roster-search"); search.value = "Nikki"; search.dispatchEvent(new Event("input"));
      f.click('[data-people-filter="favorites"]');
      f.get(".kl-roster-list").scrollTop = 84;
      f.click('.kl-roster-entry[data-member-number="2"] .kl-roster-location-button');
      await vi.waitFor(() => expect(f.get(".kl-lobby-list").textContent).toContain("Dungeon"));
      f.click(".kl-room-page .kl-social-back");
      expect(search.value).toBe("Nikki");
      expect(f.get('[data-people-filter="favorites"]').getAttribute("aria-pressed")).toBe("true");
      expect(f.get(".kl-roster-list").scrollTop).toBe(84);
      f.click(".kl-roster-entry-select");
      expect(f.get<HTMLTextAreaElement>(".kl-roster-note").value).toBe("Keep this note");
      const note = f.get<HTMLTextAreaElement>(".kl-roster-note"); note.value = "Keep this edited note"; note.dispatchEvent(new Event("input"));
      f.click('[data-target="room"]');
      f.click('[data-target="roster"]');
      expect(search.value).toBe("Nikki");
      expect(f.people.get(2)?.note).toBe("Keep this edited note");
      f.view.close(); await f.view.open();
      expect(f.get(".kl-panel").dataset.workspace).toBe("roster");
      expect(search.value).toBe("Nikki");
      expect(await f.service.getConversation(2)).toMatchObject({ peerName: "Nikki" });
    } finally { f.view.destroy(); }
  });

  it("links rooms to legitimately known players and labels stale location as unknown", async () => {
    const f = await setup();
    try {
      f.click('[data-target="room"]');
      await vi.waitFor(() => expect(f.get(".kl-lobby-list").children).toHaveLength(3));
      f.get(".kl-lobbies-panel").scrollTop = 123;
      f.click('[data-room-name="Dungeon"] .kl-room-people-button');
      expect(f.get(".kl-roster-list").children).toHaveLength(1);
      expect(f.get(".kl-roster-entry-name").textContent).toBe("Nikki");
      f.click(".kl-roster-page .kl-social-back");
      expect(f.get(".kl-lobbies-panel").scrollTop).toBe(123);
      f.click(".kl-current-room-summary .kl-room-people-button");
      expect(f.get(".kl-roster-list").children).toHaveLength(2);
      f.click('[data-scope="friends"]');
      f.stale(); f.view.setConnectionState("ready");
      const nikki = f.get('.kl-roster-entry[data-member-number="2"]');
      expect(nikki.querySelector(".kl-roster-location-button")?.textContent).toBe("Status unknown");
      expect(nikki.querySelector<HTMLElement>(".kl-roster-join")?.hidden).toBe(true);
      expect(f.people.get(2)?.note).toBe("Keep this note");
    } finally { f.view.destroy(); }
  });

  it("retains a useful cached directory after a failed refresh", async () => {
    const f = await setup();
    try {
      f.click('[data-target="room"]');
      await vi.waitFor(() => expect(f.get(".kl-lobby-list").children).toHaveLength(3));
      vi.mocked(f.adapter.searchRooms).mockRejectedValueOnce(new Error("Backend unavailable"));
      f.click(".kl-lobby-refresh");
      await vi.waitFor(() => expect(f.get(".kl-room-directory-status").textContent).toContain("Backend unavailable"));
      expect(f.get(".kl-lobby-list").children).toHaveLength(3);
      expect(f.get(".kl-current-room-summary").hidden).toBe(false);
      expect(f.get<HTMLButtonElement>(".kl-lobby-refresh").disabled).toBe(false);
    } finally { f.view.destroy(); }
  });
});
