import type { BCLobbyRoom, BCRoomSearchSpace } from '../../bc/adapter';
import type { PersistentSpace, SpaceRoom, SpaceRoomStatus } from './spaces-page';

export type SpaceDirectorySort = 'recommended' | 'active' | 'newest';
export type SpaceDirectoryStatus = '' | 'open' | 'full' | 'closed';
export interface SpaceRoomObservation { revision: number; room: string; checkedAt: number; result: SpaceRoomStatus | null }
export const SPACE_ROOM_OBSERVATION_MS = 90000;
export const spaceRoomKey = (room: Pick<SpaceRoom, 'name' | 'searchSpace'>): string => `${room.searchSpace}\0${room.name.trim().toUpperCase()}`;
export const spaceRoomIdentity = (room: SpaceRoom): string => JSON.stringify(room);

function validRoomOccupancy(room: SpaceRoomStatus): boolean {
  return Number.isSafeInteger(room.memberCount) && room.memberCount >= 0 &&
    Number.isSafeInteger(room.memberLimit) && room.memberLimit > 0 &&
    typeof room.locked === 'boolean' && typeof room.canJoin === 'boolean';
}

export function observedPublicLobbyRoom(
  link: Pick<SpaceRoom, 'name' | 'searchSpace'>,
  snapshot: { searchSpace: BCRoomSearchSpace; rooms: readonly BCLobbyRoom[] },
): SpaceRoomStatus | undefined {
  if (link.searchSpace !== snapshot.searchSpace || !link.name.trim()) return;
  const key = spaceRoomKey(link);
  const matches = snapshot.rooms.filter(room => typeof room?.name === 'string' &&
    spaceRoomKey({ name: room.name, searchSpace: snapshot.searchSpace }) === key);
  const [room] = matches;
  if (matches.length !== 1 || room?.privateRoom !== false || !validRoomOccupancy(room)) return;
  const { name, memberCount, memberLimit, canJoin, locked } = room;
  return { name, memberCount, memberLimit, canJoin, locked };
}

export function observedSpaceRoom(space: PersistentSpace, observation: SpaceRoomObservation | undefined, now = Date.now()): SpaceRoomStatus | null | undefined {
  if (!space.canRead || space.archived || !space.room || !observation || observation.revision !== space.revision ||
    observation.room !== spaceRoomIdentity(space.room) || observation.checkedAt > now || now - observation.checkedAt >= SPACE_ROOM_OBSERVATION_MS) return undefined;
  const room = observation.result;
  if (room === null) return null; // Unlisted is unknown, never evidence of closure.
  if (room.name.trim().toUpperCase() !== space.room.name.trim().toUpperCase() || !validRoomOccupancy(room)) return undefined;
  return room;
}
export function spaceDirectoryStatus(room: SpaceRoomStatus | null | undefined): SpaceDirectoryStatus {
  if (!room) return '';
  return room.locked ? 'closed' : room.memberCount >= room.memberLimit ? 'full' : room.canJoin ? 'open' : 'closed';
}
export function visibleSpaces(items: readonly PersistentSpace[], observations: ReadonlyMap<string, SpaceRoomObservation>, sort: SpaceDirectorySort, status: SpaceDirectoryStatus, now = Date.now()): PersistentSpace[] {
  const rooms = new Map(items.map(s=>[s.id,observedSpaceRoom(s,observations.get(s.id),now)]));
  const order = new Map(items.map((s,index)=>[s.id,index]));
  const room = (s: PersistentSpace) => rooms.get(s.id);
  const joined = (s: PersistentSpace) => Number(s.membership === 'active' || s.canManage);
  return items.filter(s => !status || spaceDirectoryStatus(room(s)) === status).sort((a, b) => {
    const ranked = sort === 'active' ? (room(b)?.memberCount ?? 0) - (room(a)?.memberCount ?? 0) :
      sort === 'recommended' ? joined(b) - joined(a) || Number(spaceDirectoryStatus(room(b)) === 'open') - Number(spaceDirectoryStatus(room(a)) === 'open') : 0;
    // Keep the server's unique creation/sequence order for ties.
    return ranked || b.createdAt - a.createdAt || order.get(a.id)! - order.get(b.id)!;
  });
}
