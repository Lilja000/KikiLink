/** BC r131 contracts are documented in CUSTOM-ACTIVITIES-2026-09-13.md. */
import { sanitizeClothingTemplate, type ClothingTemplate } from "../../core/appearance-template";
export interface ActivityChoice { name: string; label: string }
export interface ClothingChoice extends ActivityChoice { current?: string; template?: ClothingTemplate }
export interface ExpressionChoice extends ActivityChoice {
  values: Array<{ value: string | null; label: string }>;
  /** One Eyes setting writes all supported native eye groups together. */
  parts?: ExpressionChoice[];
}
export interface PoseChoice extends ActivityChoice { category: string }
export interface ActivityCapabilities {
  expressions: ExpressionChoice[];
  poses: PoseChoice[];
  clothing: ClothingChoice[];
}

export function activityCapabilities(character = currentPlayer()): ActivityCapabilities {
  const groups = nativeGroups(character);
  const expressions: ExpressionChoice[] = [];
  if (character && typeof CharacterSetFacialExpression === "function" && typeof InventoryAllow === "function") {
    for (const group of groups) {
      if (hiddenActivityChoice(group)) continue;
      const item = appearanceItem(character, group.Name);
      const allowed = item?.Asset.AllowExpression ?? group.AllowExpression;
      if (!item || !Array.isArray(allowed) || allowed.length === 0) continue;
      const values = [...new Set([null, ...allowed.filter(value => typeof value === "string" || value === null)])];
      expressions.push({ name: group.Name, label: expressionLabel(group),
        values: values.map(value => ({ value, label: value === null ? "Neutral" : humanize(value) })) });
    }
  }
  const eyes = expressions.filter(choice => choice.name === "Eyes" || choice.name === "Eyes2");
  if (eyes.length) {
    const index = expressions.findIndex(choice => eyes.includes(choice));
    for (const eye of eyes) expressions.splice(expressions.indexOf(eye), 1);
    expressions.splice(index, 0, { name: "Eyes", label: "Eyes", parts: eyes,
      values: eyes[0]!.values.filter(value => eyes.every(eye => eye.values.some(other => other.value === value.value))) });
  }
  const poses = character && character.ActivePoseMapping && typeof PoseSetActive === "function" &&
    typeof PoseCanChangeUnaided === "function" && typeof PoseAvailable === "function"
    // Authoring must not depend on the editor's current restraints. Execution rechecks the target.
    ? nativePoses().filter(selectablePose)
      .map(pose => ({ name: pose.Name, label: humanize(pose.Name), category: pose.Category })) : [];
  const clothing = groups.filter(group => isClothingGroup(group) && !hiddenActivityChoice(group))
    .map(group => {
      const item = character && appearanceItem(character, group.Name);
      let template: ClothingTemplate | undefined;
      try {
        if (item && typeof ServerBundledItemFromAppearanceItem === "function")
          template = sanitizeClothingTemplate(ServerBundledItemFromAppearanceItem(item));
      } catch { /* An unavailable capture cannot be selected for Wear. */ }
      return { name: group.Name, label: group.Description || humanize(group.Name),
        current: item ? item.Asset.Description || humanize(item.Asset.Name) : "Empty", ...(template ? { template } : {}) };
    });
  return { expressions, poses, clothing };
}

export function currentPlayer(): BCPlayer | undefined {
  return typeof Player === "object" && Player !== null ? Player : undefined;
}
export function nativeGroups(character?: BCCharacter): BCAssetGroup[] {
  return typeof AssetGroup !== "undefined" && Array.isArray(AssetGroup)
    ? AssetGroup.filter(group => group && typeof group.Name === "string" &&
      (!character?.AssetFamily || !group.Family || group.Family === character.AssetFamily)) : [];
}
export function nativePoses(): BCPose[] {
  // PoseRecord also covers poses registered by compatible addons after startup.
  const poses = typeof PoseRecord === "object" && PoseRecord !== null ? Object.values(PoseRecord) : [];
  if (typeof PoseFemale3DCG !== "undefined" && Array.isArray(PoseFemale3DCG)) poses.push(...PoseFemale3DCG);
  return [...new Map(poses.filter(pose => pose && typeof pose.Name === "string" && typeof pose.Category === "string")
    .map(pose => [pose.Name, pose])).values()];
}
export function appearanceItem(character: BCCharacter, group: string): BCAppearanceItem | undefined {
  return Array.isArray(character.Appearance) ? character.Appearance.find(item => item?.Asset?.Group?.Name === group) : undefined;
}
export function isClothingGroup(group: BCAssetGroup): boolean {
  return group.Category === "Appearance" && group.Clothing === true && group.AllowNone === true;
}
export function expressionValue(character: BCCharacter, group: string): string | null | undefined {
  return appearanceItem(character, group)?.Property?.Expression;
}
export function expressionApiGroup(group: string): string {
  // Native "Eyes" writes both eyes. Eyes1 addresses only the Eyes appearance item.
  return group === "Eyes" ? "Eyes1" : group;
}
export function expressionHasNativeTimer(character: BCCharacter, group: string): boolean {
  return character.ExpressionQueue?.some(entry => entry.Group === group ||
    (group === "Eyes2" && entry.Group === "Eyes")) ?? false;
}
export function expressionAllowed(character: BCCharacter, group: string, value: string | null): boolean {
  const item = appearanceItem(character, group);
  const nativeGroup = nativeGroups(character).find(candidate => candidate.Name === group);
  if (!item || !nativeGroup || typeof CharacterSetFacialExpression !== "function" || typeof InventoryAllow !== "function") return false;
  const allowed = item.Asset.AllowExpression ?? nativeGroup.AllowExpression;
  if (!Array.isArray(allowed) || allowed.length === 0 || (value !== null && !allowed.includes(value))) return false;
  return safe(() => InventoryAllow(character, item.Asset,
    [...(nativeGroup.ExpressionPrerequisite ?? []), ...(item.Asset.ExpressionPrerequisite ?? [])], false));
}
export function poseAllowed(character: BCCharacter, name: string): boolean {
  const pose = nativePoses().find(candidate => candidate.Name === name);
  return !!pose && !!character.ActivePoseMapping && selectablePose(pose) &&
    typeof PoseSetActive === "function" && typeof PoseCanChangeUnaided === "function" && typeof PoseAvailable === "function" &&
    safe(() => PoseAvailable(character, pose.Category, name) && PoseCanChangeUnaided(character, name));
}
function selectablePose(pose: BCPose): boolean {
  // Hogtied is a real BodyFull pose in BC's AssetPoseMap (r131). It is still subject
  // to PoseAvailable / PoseCanChangeUnaided; a menu flag alone is not a permission.
  return pose.AllowMenu === true || pose.AllowMenuTransient === true ||
    (pose.Name === "Hogtied" && pose.Category === "BodyFull");
}
export function hiddenActivityChoice(group: Pick<BCAssetGroup, "Name" | "Description">): boolean {
  return ["Pussy", "Genitalia", "Panties", "EyesOver", "Eyes2Over"].includes(group.Name) ||
    ["Genitalia", "Panties", "Left Eye (Over)", "Right Eye (Over)"].includes(group.Description);
}
export function canAffectCharacter(actor: BCCharacter, target: BCCharacter): boolean {
  if (actor !== currentPlayer()) return false;
  if (actor === target) return true;
  if ([...(actor.BlackList ?? []), ...(actor.GhostList ?? []), ...(target.BlackList ?? []), ...(target.GhostList ?? [])]
    .some(member => member === actor.MemberNumber || member === target.MemberNumber)) return false;
  return target.AllowItem === true && typeof actor.CanInteract === "function" &&
    typeof ServerChatRoomGetAllowItem === "function" && safe(() => actor.CanInteract!() && ServerChatRoomGetAllowItem(actor, target));
}

/** Native wardrobe access + server appearance validation, independently for every selected slot. */
export function clothingRemovable(actor: BCCharacter, target: BCCharacter, groupName: string, selected: ReadonlySet<string>, seen = new Set<string>(), isSwap = false): boolean {
  if (seen.has(groupName)) return false;
  seen.add(groupName);
  const group = nativeGroups(target).find(candidate => candidate.Name === groupName);
  const item = appearanceItem(target, groupName);
  if (!group || !isClothingGroup(group) || !item || !canAffectCharacter(actor, target) ||
      typeof actor.CanInteract !== "function" || typeof actor.CanChangeClothesOn !== "function" ||
      typeof WardrobeGroupAccessible !== "function" || typeof ValidationCreateDiffParams !== "function" ||
      typeof ValidationCanRemoveItem !== "function" || typeof InventoryBlockedOrLimited !== "function" ||
      typeof InventoryItemHasEffect !== "function" || typeof InventoryRemove !== "function") return false;
  if (!safe(() => actor.CanInteract!() && actor.CanChangeClothesOn!(target) &&
    (actor !== target || (typeof actor.CanChangeOwnClothes === "function" && actor.CanChangeOwnClothes())) &&
    WardrobeGroupAccessible(target, group, { ExcludeNonCloth: true }) &&
    !item.Property?.LockedBy && !InventoryItemHasEffect(item, "Lock", true) &&
    !InventoryBlockedOrLimited(target, item) &&
    ValidationCanRemoveItem(item, ValidationCreateDiffParams(target, actor.MemberNumber), isSwap))) return false;
  // InventoryRemove can cascade into linked items. Never use that to strip an unselected or locked slot.
  for (const dependency of [...(group.RemoveItemOnRemove ?? []), ...(item.Asset.RemoveItemOnRemove ?? [])]) {
    const linked = appearanceItem(target, dependency.Group);
    if (linked?.Asset.Name !== dependency.Name) continue;
    if (!selected.has(dependency.Group) || !clothingRemovable(actor, target, dependency.Group, selected, new Set(seen))) return false;
  }
  return true;
}
export function safe(check: () => boolean): boolean { try { return check() === true; } catch { return false; } }
export function humanize(value: string): string { return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " "); }
function expressionLabel(group: BCAssetGroup): string {
  if (group.Name === "Eyes") return "Left eye";
  if (group.Name === "Eyes2") return "Right eye";
  if (group.Name === "Fluids") return "Tears / Drool";
  return group.Description || humanize(group.Name);
}
