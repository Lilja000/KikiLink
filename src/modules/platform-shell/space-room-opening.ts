import {spaceReadAt,spaceRead,sameSpaceSource} from '../../cloud/space-mutation-intent';
import {ROOM_FRESH_CAPACITY} from '../../../cloud/shared/room-contract.mjs';
import type {BCRoomAdminSnapshot} from '../../bc/adapter';
import type {RoomPresetData} from '../../core/types';
import type {CloudClient} from '../../cloud/client';
import type {PersistentSpace, SpaceRoom} from './spaces-page';

/** An explicit, editable preparation step. Opening a Space never applies a room. */
export function openingRoom(space: PersistentSpace, choice: string): SpaceRoom {
  if (!space.canManage || !space.canRead || space.archived || !space.room) throw new Error('Choose an active Space you manage.');
  const room = choice === 'current' ? space.room : choice === 'fresh'
    ? {...space.room, description: '', background: 'Lounge', capacity: ROOM_FRESH_CAPACITY, palette: null, restoreOnOpen: false}
    : space.presets?.find(p => p.id === choice)?.room;
  if (!room || !Number.isInteger(room.capacity) || room.capacity < 2 || room.capacity > 50 ||
      typeof room.name !== 'string' || !room.name.trim() || room.name.length > 80 ||
      typeof room.background !== 'string' || room.background.length > 120 || !['','X','M'].includes(room.searchSpace) ||
      room.description !== undefined && (typeof room.description !== 'string' || room.description.length > 400) ||
      room.restoreOnOpen !== undefined && typeof room.restoreOnOpen !== 'boolean') throw new Error('The saved room settings are unavailable. Refresh the Space.');
  return structuredClone(room);
}

export function nativeRoomDraft(space: PersistentSpace, plan: SpaceRoom, snapshot?: BCRoomAdminSnapshot): RoomPresetData {
  if (!snapshot?.isAdmin) throw new Error('Enter the linked BC room as an administrator before preparing its settings.');
  const target = space.room;
  if (!target || snapshot.roomName.toUpperCase() !== target.name.toUpperCase() || snapshot.settings.space !== target.searchSpace)
    throw new Error('Enter this Space’s linked BC room first. The current room is kept.');
  // Packages carry no native membership, access, map or media authority.
  return {...structuredClone(snapshot.settings), name: plan.name, description: plan.description ?? '', background: plan.background,
    limit: plan.capacity, space: plan.searchSpace};
}

/** Protect unrelated native fields copied into the draft from intervening edits. */
export async function authorizeRoomPreparation(client: CloudClient, space: PersistentSpace, baseline: RoomPresetData,
  read: () => BCRoomAdminSnapshot | undefined, current: () => boolean): Promise<void> {
  await authorizeSpaceRoom(client,space,current);
  const native=read();
  if(!native?.isAdmin||JSON.stringify(native.settings)!==JSON.stringify(baseline))
    throw new Error('The BC room changed after preparation. Reset or prepare its settings again.');
}

/** The same fresh Cloud authorization gates existing-room apply and new creation. */
export async function authorizeSpaceRoom(client: CloudClient, space: PersistentSpace, current: () => boolean): Promise<void> {
  if(!current())throw new Error('Reconnect with the account that prepared this room.');
  const member=client.memberNumber,me=await client.request<{memberNumber:number;features?:{roomOpening?:boolean}}>('GET','/v1/me');
  if(!current()||me.memberNumber!==member||me.features?.roomOpening!==true)throw new Error('Room setup is no longer available.');
  const access=spaceRead(client,me);if(space.recoverySource&&!sameSpaceSource(access.source,space.recoverySource))throw new Error('The Space changed after recovery. Prepare its room settings again.');
  const latest=await spaceReadAt(client,space.recoverySource)<PersistentSpace>(`/v1/spaces/${space.id}`);
  if(!current()||client.memberNumber!==member||latest.id!==space.id||!latest.canManage||!latest.canRead||latest.archived||latest.revision!==space.revision||
      JSON.stringify([latest.room,latest.presets])!==JSON.stringify([space.room,space.presets]))
    throw new Error('The Space or your permissions changed. Prepare its room settings again.');
}
