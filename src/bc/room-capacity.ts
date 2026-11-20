import {ROOM_PLAN_MIN, ROOM_PLAN_MAX} from '../../cloud/shared/room-contract.mjs';

/** Validate, never silently resize a saved plan. BC remains authoritative. */
export function nativeRoomCapacity(value: number, population = 0): number {
  if (!Number.isInteger(value) || value < ROOM_PLAN_MIN || value > ROOM_PLAN_MAX)
    throw new Error('Room capacity must be a whole number from 2 to 50.');
  if (value < population) throw new Error(`Keep room for the ${population} people currently inside.`);
  let accepted = value <= 20;
  try {
    if (typeof ServerChatRoomDataValidationRecord !== 'undefined') {
      // Current BC moved the per-field validators off the whole-record function.
      accepted = typeof ServerChatRoomDataValidationRecord?.Limit === 'function' && ServerChatRoomDataValidationRecord.Limit(value) === value;
    } else if (typeof ServerChatRoomDataValidate !== 'undefined' && typeof ServerChatRoomDataValidate.Limit === 'function')
      accepted = ServerChatRoomDataValidate.Limit(value) === value;
  } catch { accepted = false; }
  if (!accepted) throw new Error(`The loaded BC client does not support ${value} places. Choose a supported capacity; your saved plan is kept.`);
  return value;
}
