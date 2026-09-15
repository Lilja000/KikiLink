import type { BCLobbyRoom } from "../../bc/adapter";
import type { PresenceSnapshot, RosterEntry } from "../../core/types";

export type RoomDirectoryFilter = "all" | "favorites" | "friends";
export interface PeopleFilters { favorites: boolean; online: boolean; addon: boolean }
export interface DirectoryPlayer { entry: RosterEntry; presence: PresenceSnapshot }

export const roomKey = (name: string): string => name.trim().toLocaleLowerCase();
export const isOnline = (presence: PresenceSnapshot): boolean =>
  presence.status === "online" || presence.status === "idle" || presence.status === "dnd";

/** Only the shared presence service supplies live locations. Notebook history never does. */
export function playerRoom({ presence }: Pick<DirectoryPlayer, "presence">): string | undefined {
  if (!isOnline(presence)) return undefined;
  const name = presence.roomName?.trim();
  if (!name || ["lobby", "private room", "location unknown"].includes(roomKey(name))) return undefined;
  return name;
}

export function playerLocation(player: DirectoryPlayer): string {
  if (player.entry.present) return player.presence.roomName || "In this room";
  if (player.presence.status === "offline") return "Offline";
  if (!isOnline(player.presence)) return "Status unknown";
  return player.presence.roomName || "Location unknown";
}

export function selectPeople(
  players: DirectoryPlayer[], query: string, filters: PeopleFilters,
  inRoom = false, location?: string,
): DirectoryPlayer[] {
  const search = query.trim().toLocaleLowerCase().replace(/^#(?=\d)/u, "");
  const exact = ({ entry }: DirectoryPlayer): number => Number(Boolean(search) &&
    (entry.displayName.toLocaleLowerCase() === search || String(entry.memberNumber) === search));
  const statusRank = ({ presence, entry }: DirectoryPlayer): number =>
    entry.present || isOnline(presence) ? 0 : presence.status === "unknown" ? 1 : 2;
  return players.filter((player) => {
    const { entry, presence } = player;
    if (filters.favorites && !entry.favorite || filters.online && !entry.present && !isOnline(presence) ||
      filters.addon && presence.addonInstalled !== true) return false;
    if (location && roomKey(playerRoom(player) ?? "") !== roomKey(location)) return false;
    return !search || [entry.displayName, String(entry.memberNumber), entry.note, ...entry.tags,
      ...entry.relationships].some((text) => text.toLocaleLowerCase().includes(search));
  }).sort((a, b) => exact(b) - exact(a) || (inRoom ? 0 : statusRank(a) - statusRank(b)) ||
    Number(b.entry.favorite) - Number(a.entry.favorite) ||
    a.entry.displayName.localeCompare(b.entry.displayName) || a.entry.memberNumber - b.entry.memberNumber);
}

export function selectRooms(
  source: BCLobbyRoom[], favorites: string[], query: string,
  filter: RoomDirectoryFilter, currentName = "",
): BCLobbyRoom[] {
  const favoriteKeys = new Set(favorites.map(roomKey));
  const search = query.trim().toLocaleLowerCase();
  const unique = new Map<string, BCLobbyRoom>();
  for (const room of source.slice(0, 500)) {
    const key = roomKey(room.name);
    if (key && key !== roomKey(currentName) && !unique.has(key)) unique.set(key, room);
  }
  const favorite = (room: BCLobbyRoom): number => Number(favoriteKeys.has(roomKey(room.name)));
  return [...unique.values()].filter((room) =>
    (filter !== "favorites" || favorite(room)) && (filter !== "friends" || room.friends.length > 0) &&
    (!search || `${room.name}\n${room.description}\n${room.language}`.toLocaleLowerCase().includes(search)),
  ).sort((a, b) => favorite(b) - favorite(a) || b.friends.length - a.friends.length ||
    a.name.localeCompare(b.name));
}
