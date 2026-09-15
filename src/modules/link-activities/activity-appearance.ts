import { withBCNetworkReason } from "../../bc/traffic-audit";
import { canAffectCharacter, currentPlayer, isClothingGroup } from "./activity-capabilities";

interface AppearanceSnapshot {
  character: BCCharacter;
  items: BCAppearanceItem[];
  poses: Record<string, string | undefined> | undefined;
}

function copyItem({ Asset, ...state }: BCAppearanceItem): BCAppearanceItem {
  return { Asset, ...structuredClone(state) };
}
export function snapshotActivityAppearance(characters: Iterable<BCCharacter>): AppearanceSnapshot[] {
  return [...new Set(characters)].map(character => ({ character, items: (character.Appearance ?? []).map(copyItem),
    poses: character.ActivePoseMapping ? { ...character.ActivePoseMapping } : undefined }));
}
function signature(character: BCCharacter): string {
  return itemSignature(character.Appearance ?? []);
}
function itemSignature(items: BCAppearanceItem[]): string {
  return JSON.stringify(items.map(({ Asset, ...state }) => ({
    asset: Asset.Name, group: Asset.Group.Name, ...state,
  })));
}

/** Prepare every changed character before publishing any of them.
 * BC r131 documents room update and own database sync as separate operations.
 * There is no two-character server transaction/ack; a synchronous failure gets
 * a bounded compensating update, never a delayed retry of stale appearance.
 */
export function publishActivityAppearance(
  characters: Iterable<BCCharacter>,
  before: AppearanceSnapshot[],
  contextValid: () => boolean,
): boolean {
  const changed = [...new Set(characters)];
  if (!changed.length) return true;
  const player = currentPlayer();
  const ownChanged = player !== undefined && changed.includes(player);
  const attempted: BCCharacter[] = [];
  let databaseAttempted = false;
  const stillAllowed = (): boolean => !!player && contextValid() && currentPlayer() === player && changed.every(character => {
    if (!canAffectCharacter(player, character)) return false;
    const original = before.find(snapshot => snapshot.character === character)?.items ?? [];
    const clothes = (items: BCAppearanceItem[]) => items.filter(item => isClothingGroup(item.Asset.Group));
    const clothingChanged = itemSignature(clothes(original)) !== itemSignature(clothes(character.Appearance ?? []));
    return !clothingChanged || (player.CanInteract?.() === true && player.CanChangeClothesOn?.(character) === true &&
      (character !== player || player.CanChangeOwnClothes?.() === true));
  });
  const rollback = (): void => {
    for (const snapshot of before) {
      if (!changed.includes(snapshot.character)) continue;
      try {
        snapshot.character.Appearance = snapshot.items.map(copyItem);
        if (snapshot.poses) snapshot.character.ActivePoseMapping = { ...snapshot.poses };
        else delete snapshot.character.ActivePoseMapping;
        if (contextValid() || snapshot.character === currentPlayer()) CharacterRefresh(snapshot.character, false, true);
      } catch { /* A refusing addon accessor may also refuse a local refresh. */ }
    }
  };
  try {
    if (!stillAllowed() || typeof CharacterRefresh !== "function" || typeof ChatRoomCharacterUpdate !== "function" ||
        (ownChanged && typeof ServerPlayerAppearanceSync !== "function")) throw new Error("Appearance transport unavailable");
    const expected = changed.map(signature);
    for (const character of changed) {
      // Refresh effects/canvas locally. Do not persist a half-finished transfer.
      withBCNetworkReason("appearance-prepare", () => CharacterRefresh(character, false, true));
    }
    if (!stillAllowed() || changed.some((character, i) => signature(character) !== expected[i])) throw new Error("Appearance changed during preparation");
    for (const character of changed) {
      if (!stillAllowed()) throw new Error("Room changed during appearance update");
      attempted.push(character);
      withBCNetworkReason("appearance-update", () => ChatRoomCharacterUpdate(character));
    }
    if (ownChanged) {
      if (!stillAllowed()) throw new Error("Player changed during appearance update");
      databaseAttempted = true;
      withBCNetworkReason("appearance-save", () => ServerPlayerAppearanceSync());
    }
    return true;
  } catch {
    rollback();
    // A send can throw after another hook already handed it off. Correct only
    // this still-current room synchronously, with the restored final state.
    if (contextValid()) {
      for (const character of attempted) {
        try { withBCNetworkReason("appearance-rollback", () => ChatRoomCharacterUpdate(character)); } catch { /* No unbounded retries. */ }
      }
      if (databaseAttempted && currentPlayer() === player) {
        try { withBCNetworkReason("appearance-rollback", () => ServerPlayerAppearanceSync()); } catch { /* No queued stale save. */ }
      }
    }
    return false;
  }
}
