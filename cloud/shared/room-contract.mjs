// Saved room plans may exceed the currently loaded game's native room limit.
export const ROOM_PLAN_MIN = 2;
export const ROOM_PLAN_MAX = 50;
export const ROOM_FRESH_CAPACITY = 30;
// Call only after the enclosing bounded snapshot has passed its shape validator.
export function needsRoomOpening(value) {
  if (!value || typeof value !== 'object') return false;
  if (Object.hasOwn(value, 'restoreOnOpen') || typeof value.capacity === 'number' && value.capacity > 20) return true;
  return Object.values(value).some(needsRoomOpening);
}
export function extendedRoomDraft(draft) {
  if (draft?.type === 'Room preset') return draft.payload?.capacity > 20 || Object.hasOwn(draft.payload ?? {}, 'restoreOnOpen');
  return false;
}
