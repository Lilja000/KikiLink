import { sanitizeClothingTemplate, type ClothingTemplate } from "../../core/appearance-template";
import type { CustomActivityTransferDirection } from "../../core/types";
import { appearanceItem, canAffectCharacter, clothingRemovable, isClothingGroup, nativeGroups } from "./activity-capabilities";

/** A synchronous, unpublished two-character transaction using BC's native item bundles.
 * Validate both detached diffs and cyclic blocks first. Commit only after both succeed.
 * A rejected diff, cyclic block, addon hook exception or altered item rolls both sides back.
 * Swap prepares two replacements from the original bundles, not two transfers.
 * Returns true only when appearance changed; two empty/equal slots are a no-op.
 */
export function transferActivityClothing(actor: BCCharacter, counterpart: BCCharacter, slot: string,
  direction: CustomActivityTransferDirection): boolean {
  const source = direction === "target-to-self" ? counterpart : actor;
  const destination = direction === "target-to-self" ? actor : counterpart;
  const swap = direction === "swap";
  if (source === destination || source.MemberNumber === destination.MemberNumber ||
    !["self-to-target", "target-to-self", "swap"].includes(direction)) return false;
  let rollback: Array<{ character: BCCharacter; appearance: BCAppearanceItem[] }> | undefined;
  try {
    if (!actor.CanInteract?.() ||
      typeof ServerBundledItemFromAppearanceItem !== "function" || typeof ServerBundledItemToAppearanceItem !== "function" ||
      typeof ValidationResolveCyclicBlocks !== "function" || typeof ValidationCreateDiffParams !== "function" ||
      typeof ValidationCanAddItem !== "function" || typeof ValidationResolveAppearanceDiff !== "function" ||
      typeof WardrobeGroupAccessible !== "function" || typeof InventoryAllow !== "function" ||
      typeof InventoryBlockedOrLimited !== "function" || typeof InventoryItemHasEffect !== "function") return false;
    // Validate both registered slots, including an empty side. Nothing is captured
    // by the activity definition: these snapshots are taken at execution time.
    for (const character of [source, destination]) {
      const group = nativeGroups(character).find(group => group.Name === slot);
      if (!character.AssetFamily || !group || !isClothingGroup(group) || !canAffectCharacter(actor, character) ||
        !actor.CanChangeClothesOn?.(character) || (actor === character && !actor.CanChangeOwnClothes?.()) ||
        !WardrobeGroupAccessible(character, group, { ExcludeNonCloth: true })) return false;
    }
    const fromSnapshot = (source.Appearance ?? []).map(copyItem), toSnapshot = (destination.Appearance ?? []).map(copyItem);
    const fromBefore = structuredClone(fromSnapshot.map(item => ServerBundledItemFromAppearanceItem(item)));
    const toBefore = structuredClone(toSnapshot.map(item => ServerBundledItemFromAppearanceItem(item)));
    const fromItem = fromBefore.find(item => item.Group === slot) ?? null;
    const toItem = toBefore.find(item => item.Group === slot) ?? null;
    if ((!swap && !fromItem) || (swap && sameBundle(fromItem, toItem))) return false;

    const prepare = (character: BCCharacter, snapshot: BCAppearanceItem[], before: typeof fromBefore,
      incoming: typeof fromItem): { item: BCAppearanceItem | null; after: typeof fromBefore } | undefined => {
      const previous = snapshot.find(item => item.Asset.Group.Name === slot) ?? null;
      if (previous && !clothingRemovable(actor, character, slot, new Set([slot]), new Set(), !!incoming)) return;
      const candidate = incoming ? ServerBundledItemToAppearanceItem(character.AssetFamily!, structuredClone(incoming)) : null;
      if (incoming && (!candidate || candidate.Asset.Group.Name !== slot || candidate.Asset.Name !== incoming.Name ||
        !isClothingGroup(candidate.Asset.Group) || candidate.Property?.LockedBy || InventoryItemHasEffect(candidate, "Lock", true) ||
        InventoryBlockedOrLimited(character, candidate) || !InventoryAllow(character, candidate.Asset, undefined, false) ||
        !sameBundle(ServerBundledItemFromAppearanceItem(candidate), incoming))) return;
      const params = ValidationCreateDiffParams(character, actor.MemberNumber);
      if (candidate && !ValidationCanAddItem(candidate, params)) return;
      const resolved = ValidationResolveAppearanceDiff(slot, previous, candidate, params, false);
      if (!resolved.valid || (incoming ? !resolved.item || !sameBundle(ServerBundledItemFromAppearanceItem(resolved.item), incoming) : !!resolved.item)) return;
      const item = resolved.item ?? null;
      const after = [...before.filter(item => item.Group !== slot), ...(incoming ? [incoming] : [])];
      // Pure native validators operate on detached data; neither live character
      // is loaded or refreshed. Reject repairs that would change another slot.
      const checked = ValidationResolveCyclicBlocks([...snapshot.filter(item => item.Asset.Group.Name !== slot), ...(item ? [item] : [])],
        { [slot]: [previous, item] });
      if (!checked.valid || !sameAppearanceItems(checked.appearance, after)) return;
      return { item, after };
    };
    const fromResult = prepare(source, fromSnapshot, fromBefore, swap ? toItem : null);
    if (!fromResult) return false;
    const toResult = prepare(destination, toSnapshot, toBefore, fromItem);
    if (!toResult || !sameAppearance(source, fromBefore) || !sameAppearance(destination, toBefore)) return false;
    // Keep unrelated live items by identity. Only the selected slot changes on each character.
    rollback = [source, destination].map(character => ({ character, appearance: character.Appearance ?? [] }));
    const fromAppearance = [...(source.Appearance ?? []).filter(item => item.Asset.Group.Name !== slot), ...(fromResult.item ? [fromResult.item] : [])];
    const toAppearance = [...(destination.Appearance ?? []).filter(item => item.Asset.Group.Name !== slot), ...(toResult.item ? [toResult.item] : [])];
    destination.Appearance = toAppearance;
    source.Appearance = fromAppearance;
    if (!sameAppearance(source, fromResult.after) || !sameAppearance(destination, toResult.after)) throw new Error("Appearance assignment refused");
    rollback = undefined;
    return true;
  } catch { return false; }
  finally {
    // No await, timer or character broadcast occurs inside this transaction.
    for (const entry of rollback ?? []) { try { entry.character.Appearance = entry.appearance; } catch { /* A read-only addon accessor may refuse restoration too. */ } }
  }
}

function sameBundle(a: unknown, b: unknown): boolean {
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) :
    value && typeof value === "object" ? Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)])) : value;
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}
function copyItem(item: BCAppearanceItem): BCAppearanceItem {
  const { Asset, ...state } = item;
  return { Asset, ...structuredClone(state) };
}
function sameAppearance(character: BCCharacter, bundles: ReturnType<typeof ServerBundledItemFromAppearanceItem>[]): boolean {
  return sameAppearanceItems(character.Appearance ?? [], bundles);
}
function sameAppearanceItems(items: BCAppearanceItem[], bundles: ReturnType<typeof ServerBundledItemFromAppearanceItem>[]): boolean {
  const actual = items.map(item => ServerBundledItemFromAppearanceItem(item));
  return actual.length === bundles.length && bundles.every(item => sameBundle(actual.find(other => other.Group === item.Group), item));
}

/** Native bundle conversion, diff resolution and full appearance validation. */
export function wearActivityClothing(actor: BCCharacter, target: BCCharacter, input: ClothingTemplate): boolean {
  let rollback: BCAppearanceItem[] | undefined;
  try {
    const template = sanitizeClothingTemplate(input);
    const group = nativeGroups(target).find(group => group.Name === template?.Group);
    if (!template || !group || !isClothingGroup(group) || !target.AssetFamily || !canAffectCharacter(actor, target) ||
      !actor.CanInteract?.() || !actor.CanChangeClothesOn?.(target) || (actor === target && !actor.CanChangeOwnClothes?.()) ||
      typeof WardrobeGroupAccessible !== "function" || !WardrobeGroupAccessible(target, group, { ExcludeNonCloth: true }) ||
      typeof ServerBundledItemToAppearanceItem !== "function" || typeof ServerBundledItemFromAppearanceItem !== "function" ||
      typeof ValidationResolveCyclicBlocks !== "function" || typeof ValidationCreateDiffParams !== "function" ||
      typeof ValidationCanAddItem !== "function" || typeof ValidationResolveAppearanceDiff !== "function" ||
      typeof InventoryAllow !== "function" || typeof InventoryBlockedOrLimited !== "function" ||
      typeof InventoryItemHasEffect !== "function") return false;
    const previous = appearanceItem(target, group.Name);
    // A replacement must not remove locks or cascade into an unselected slot.
    if (previous && !clothingRemovable(actor, target, group.Name, new Set([group.Name]), new Set(), true)) return false;
    const candidate = ServerBundledItemToAppearanceItem(target.AssetFamily, structuredClone(template));
    if (!candidate || candidate.Asset.Group.Name !== group.Name || candidate.Asset.Name !== template.Name ||
      !isClothingGroup(candidate.Asset.Group) || candidate.Property?.LockedBy || InventoryItemHasEffect(candidate, "Lock", true) ||
      InventoryBlockedOrLimited(target, candidate) || !InventoryAllow(target, candidate.Asset, undefined, false)) return false;
    const snapshot = (target.Appearance ?? []).map(copyItem);
    const before = structuredClone(snapshot.map(item => ServerBundledItemFromAppearanceItem(item)));
    const expected = structuredClone(ServerBundledItemFromAppearanceItem(candidate));
    const previousCopy = snapshot.find(item => item.Asset.Group.Name === group.Name) ?? null;
    const params = ValidationCreateDiffParams(target, actor.MemberNumber);
    if (!ValidationCanAddItem(candidate, params)) return false;
    const resolved = ValidationResolveAppearanceDiff(group.Name, previousCopy, candidate, params, false);
    if (!resolved.valid || !resolved.item || !sameBundle(ServerBundledItemFromAppearanceItem(resolved.item), expected)) return false;
    const after = [...before.filter(item => item.Group !== group.Name), expected];
    // Use the same native detached validation as Transfer. A whole-character loader
    // can repair other slots or mutate appearance before reporting an invalid result.
    const checked = ValidationResolveCyclicBlocks([...snapshot.filter(item => item.Asset.Group.Name !== group.Name), resolved.item],
      { [group.Name]: [previousCopy, resolved.item] });
    if (!checked.valid || !sameAppearanceItems(checked.appearance, after) || !sameAppearance(target, before)) return false;
    rollback = target.Appearance ?? [];
    target.Appearance = [...rollback.filter(item => item.Asset.Group.Name !== group.Name), resolved.item];
    if (!sameAppearance(target, after)) throw new Error("Appearance assignment refused");
    rollback = undefined;
    return true;
  } catch { return false; }
  finally {
    if (rollback) try { target.Appearance = rollback; } catch { /* A native/addon read-only accessor can also refuse rollback. */ }
  }
}
