import type {
  BCAdapter,
  BCCustomActivityIntegration,
} from "../../bc/adapter";
import type {
  CustomActivityDefinition,
  RoomActivity,
  RoomCharacter,
} from "../../core/types";
import type { SettingsStore } from "../../core/settings";
import { BLOSSOM_ICON_DATA_URL } from "../link-chat/blossom";

const ACTIVITY_PREFIX = "KikiLinkCustom_";
const ACTION_CONTENT = "KikiLinkCustomActivity";
const META_TAG = "KikiLinkActivityMeta";
const MAX_SEEN_NONCES = 120;
const REGISTRY_MONITOR_INTERVAL_MS = 500;
const SAFE_ASSET_NAME = /^[A-Za-z][A-Za-z0-9_]{0,79}$/;
/**
 * Canonical, byte-distinct activity pictures shipped by Bondage Club itself.
 *
 * ActivityFemale3DCGOrdering is intentionally not used here: it is a shared mutable registry,
 * so addons such as LSCG append their own activities to it. Several vanilla activity names also
 * point at the same PNG. Keeping this small manifest makes the picker stable, strictly vanilla,
 * and free from visually repeated choices.
 */
export const VANILLA_ACTIVITY_IMAGES = [
  "Bite",
  "BrothersHandshake",
  "Caress",
  "Choke",
  "Cuddle",
  "FrenchKiss",
  "GagKiss",
  "GaggedKiss",
  "Grope",
  "HandGag",
  "Inject",
  "Kiss",
  "Lick",
  "MassageFeet",
  "MassageHands",
  "MasturbateFist",
  "MasturbateHand",
  "MoanGag",
  "MoanGagAngry",
  "MoanGagGiggle",
  "MoanGagTalk",
  "MoanGagWhimper",
  "Nod",
  "PenetrateSlow",
  "Pinch",
  "PoliteKiss",
  "Pull",
  "RestHead",
  "SiblingsCheekKiss",
  "SistersHug",
  "Slap",
  "Suck",
  "Tickle",
] as const;

const VANILLA_ACTIVITY_IMAGE_SET = new Set<string>(VANILLA_ACTIVITY_IMAGES);
const VANILLA_ACTIVITY_IMAGE_ALIASES: Readonly<Record<string, string>> = {
  Clean: "Caress",
  Pet: "Caress",
  Rub: "Cuddle",
  StruggleArms: "Cuddle",
  StruggleLegs: "Cuddle",
  Wiggle: "Cuddle",
  MoanGagGroan: "GaggedKiss",
  CollarGrab: "Grope",
  TakeCare: "Grope",
  MasturbateFoot: "MassageFeet",
  Step: "MassageFeet",
  Kick: "MassageFeet",
  Sit: "MassageFeet",
  MasturbateTongue: "Lick",
  Whisper: "Kiss",
  PenetrateFast: "PenetrateSlow",
  Spank: "Slap",
  Nibble: "Bite",
};

export interface ActivityBodySlot {
  name: string;
  label: string;
  zones: ReadonlyArray<readonly [number, number, number, number]>;
}

interface ActivityMeta {
  v: 1;
  source: number;
  target: number;
  group: string;
  arousal: number;
  nonce: string;
}

interface Pronouns {
  subject: string;
  object: string;
  possessive: string;
}

interface NativeActivityRegistry {
  activities: BCActivity[];
  ordering: string[];
}

export class LinkActivitiesService implements BCCustomActivityIntegration {
  readonly #runtimeActivities = new Map<string, CustomActivityDefinition>();
  readonly #injectedActivities = new Map<string, BCActivity>();
  readonly #seenNonces: string[] = [];
  #bodySlotsCache: ActivityBodySlot[] | undefined;
  #registeredActivities: BCActivity[] | undefined;
  #registeredOrdering: string[] | undefined;
  #registryMonitor: ReturnType<typeof setInterval> | undefined;
  #unregister: (() => void) | undefined;

  constructor(
    private readonly adapter: BCAdapter,
    private readonly settings?: SettingsStore,
  ) {}

  start(): void {
    if (!this.#unregister) {
      this.#unregister = this.adapter.registerCustomActivityIntegration(this);
    }
    if (this.#registryMonitor === undefined) {
      this.#registryMonitor = setInterval(() => {
        this.#ensureRegistryInjection();
        this.#syncOpenNativeDialog();
      }, REGISTRY_MONITOR_INTERVAL_MS);
    }
    this.syncFromSettings();
  }

  stop(): void {
    if (this.#registryMonitor !== undefined) {
      clearInterval(this.#registryMonitor);
      this.#registryMonitor = undefined;
    }
    this.#unregister?.();
    this.#unregister = undefined;
    this.#detachFromRegistries();
    this.#runtimeActivities.clear();
    this.#injectedActivities.clear();
    this.#bodySlotsCache = undefined;
    this.#seenNonces.splice(0);
  }

  syncFromSettings(): void {
    this.#bodySlotsCache = undefined;
    this.#detachFromRegistries();
    this.#runtimeActivities.clear();
    this.#injectedActivities.clear();
    const settings = this.settings?.get();
    if (!settings?.linkActivities.enabled) return;

    const owner = currentMemberNumber(this.adapter);
    for (const definition of settings.linkActivities.customActivities) {
      const runtimeName = runtimeActivityName(owner, definition.id);
      this.#runtimeActivities.set(runtimeName, definition);
    }
    this.#ensureRegistryInjection();
    this.#syncOpenNativeDialog();
  }

  isAvailable(): boolean {
    return this.adapter.canSendRoomEmote();
  }

  isCustomActivity(activityName: string): boolean {
    return this.#runtimeActivities.has(activityName);
  }

  /**
   * Extends the exact list consumed by BC's native DialogActivity grid. The registry injection is
   * still kept for native lookups, while this path makes late-loaded userscripts reliable even if
   * BC or another addon rebuilt/cached the activity list before KikiLink started.
   */
  extendAllowedActivities(
    character: BCCharacter,
    groupName: string,
    activities: BCItemActivity[],
  ): BCItemActivity[] {
    if (!Array.isArray(activities) || !SAFE_ASSET_NAME.test(groupName)) {
      return activities;
    }
    let result = activities;
    const existing = new Set(activities.map((item) => item?.Activity?.Name));
    const selfTarget = character?.MemberNumber === this.adapter.getOwnMemberNumber();

    for (const [runtimeName, definition] of this.#runtimeActivities) {
      if (!activityGroupsMatch(definition.targetGroup, groupName) || existing.has(runtimeName)) {
        continue;
      }
      if (selfTarget && definition.targetMode === "other") continue;
      if (!selfTarget && definition.targetMode === "self") continue;
      if (result === activities) result = [...activities];
      result.push({
        Activity:
          this.#injectedActivities.get(runtimeName) ??
          createNativeActivity(runtimeName, definition),
        Group: groupName,
      });
      existing.add(runtimeName);
    }
    return result;
  }

  getTargets(): RoomCharacter[] {
    return this.adapter.getRoomCharacters();
  }

  preview(activity: RoomActivity, target: RoomCharacter): string {
    return expandActivityTemplate(activity.template, {
      sourceName: this.adapter.getOwnName(),
      target,
    });
  }

  perform(activity: RoomActivity, target: RoomCharacter): string {
    const liveTarget = this.getTargets().find(
      (candidate) => candidate.memberNumber === target.memberNumber,
    );
    if (!liveTarget) throw new Error(`${target.memberName} is no longer in this room`);

    const content = this.preview(activity, liveTarget);
    this.adapter.sendRoomEmote(content);
    return content;
  }

  getBodySlots(): ActivityBodySlot[] {
    if (this.#bodySlotsCache) return this.#bodySlotsCache;
    if (
      typeof AssetGroup === "undefined" ||
      !Array.isArray(AssetGroup) ||
      typeof ActivityFemale3DCG === "undefined" ||
      !Array.isArray(ActivityFemale3DCG)
    ) {
      return fallbackBodySlots();
    }
    const nativeTargets = new Set<string>();
    for (const activity of ActivityFemale3DCG) {
      if (!activity.Name.startsWith(ACTIVITY_PREFIX) && Array.isArray(activity.Target)) {
        for (const target of activity.Target) nativeTargets.add(target);
      }
    }
    const slots = AssetGroup.filter(
      (group) =>
        group.Category === "Item" &&
        Array.isArray(group.Zone) &&
        group.Zone.length > 0 &&
        (nativeTargets.size === 0 || nativeTargets.has(group.Name)),
    )
      .map((group) => ({
        name: group.Name,
        label: group.Description || humanizeGroupName(group.Name),
        zones: group.Zone ?? [],
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
    if (slots.length === 0) return fallbackBodySlots();
    this.#bodySlotsCache = slots;
    return slots;
  }

  getVanillaImages(): string[] {
    return [...VANILLA_ACTIVITY_IMAGES];
  }

  drawPlayer(
    canvas: HTMLCanvasElement,
    selectedGroup?: string,
    hoveredGroup?: string,
  ): boolean {
    const context = canvas.getContext("2d");
    if (!context) return false;
    if (canvas.width !== 250) canvas.width = 250;
    if (canvas.height !== 500) canvas.height = 500;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (
      typeof Player !== "object" ||
      Player === null ||
      typeof DrawCharacter !== "function"
    ) {
      return false;
    }
    DrawCharacter(Player, 0, 0, 0.5, false, context);
    const slots = [...this.getBodySlots()].sort(
      (left, right) =>
        bodySlotDrawLayer(left.name, selectedGroup, hoveredGroup) -
        bodySlotDrawLayer(right.name, selectedGroup, hoveredGroup),
    );
    for (const slot of slots) {
      const selected = slot.name === selectedGroup;
      const hovered = !selected && slot.name === hoveredGroup;
      context.fillStyle = selected
        ? "rgba(215, 25, 50, 0.22)"
        : hovered
          ? "rgba(214, 162, 75, 0.12)"
          : "rgba(255, 255, 255, 0)";
      context.strokeStyle = selected
        ? "rgba(255, 106, 126, 0.98)"
        : hovered
          ? "rgba(224, 185, 112, 0.9)"
          : "rgba(238, 226, 210, 0.28)";
      context.lineWidth = selected ? 2.25 : hovered ? 1.75 : 1;
      for (const [x, y, width, height] of slot.zones) {
        if (selected || hovered) {
          context.fillRect(x * 0.5, y * 0.5, width * 0.5, height * 0.5);
        }
        context.strokeRect(x * 0.5, y * 0.5, width * 0.5, height * 0.5);
      }
    }
    return true;
  }

  bodySlotAt(x: number, y: number): ActivityBodySlot | undefined {
    const sourceX = x * 2;
    const sourceY = y * 2;
    let best: ActivityBodySlot | undefined;
    let bestArea = Number.POSITIVE_INFINITY;
    for (const slot of this.getBodySlots()) {
      for (const [zoneX, zoneY, width, height] of slot.zones) {
        if (
          sourceX < zoneX ||
          sourceX > zoneX + width ||
          sourceY < zoneY ||
          sourceY > zoneY + height
        ) {
          continue;
        }
        const area = width * height;
        if (area < bestArea) {
          best = slot;
          bestArea = area;
        }
      }
    }
    return best;
  }

  resolveText(keyword: string): string | undefined {
    if (keyword.startsWith("Activity")) {
      return this.#runtimeActivities.get(keyword.slice("Activity".length))?.name;
    }
    const runtimeName = [...this.#runtimeActivities.keys()].find((name) => keyword.endsWith(`-${name}`));
    if (!runtimeName) return undefined;
    const definition = this.#runtimeActivities.get(runtimeName);
    if (!definition) return undefined;
    return keyword.startsWith("Label-") ? definition.name : definition.template;
  }

  resolveImage(activityName: string): string | undefined {
    const definition = this.#runtimeActivities.get(activityName);
    return definition ? activityImageUrl(definition.image) : undefined;
  }

  run(
    actor: BCCharacter,
    acted: BCCharacter,
    targetGroup: BCAssetGroup,
    itemActivity: BCItemActivity,
  ): boolean {
    const activityName = itemActivity?.Activity?.Name;
    if (typeof activityName !== "string") return false;
    const definition = this.#runtimeActivities.get(activityName);
    if (!definition) return false;
    if (
      !actor ||
      !acted ||
      !targetGroup ||
      !Number.isSafeInteger(actor.MemberNumber) ||
      !Number.isSafeInteger(acted.MemberNumber) ||
      !SAFE_ASSET_NAME.test(targetGroup.Name) ||
      targetGroup.Name !== definition.targetGroup
    ) {
      return false;
    }
    const text = expandCustomActivityTemplate(definition.template, {
      sourceName: characterName(actor),
      targetName: characterName(acted),
      targetMemberNumber: acted.MemberNumber,
      pronouns: characterPronouns(acted),
    }).slice(0, 1000);
    if (!text) return true;

    if (typeof ChatRoomPublishCustomAction === "function") {
      const meta: ActivityMeta = {
        v: 1,
        source: actor.MemberNumber,
        target: acted.MemberNumber,
        group: targetGroup.Name,
        arousal: definition.arousal,
        nonce: createNonce(),
      };
      ChatRoomPublishCustomAction(ACTION_CONTENT, false, [
        { Tag: "SourceCharacter", Text: characterName(actor), MemberNumber: actor.MemberNumber },
        { Tag: "TargetCharacter", Text: characterName(acted), MemberNumber: acted.MemberNumber },
        { Tag: "FocusAssetGroup", AssetGroupName: targetGroup.Name },
        { Tag: `MISSING TEXT IN \"Interface.csv\": ${ACTION_CONTENT}`, Text: text },
        { Tag: META_TAG, Text: JSON.stringify(meta) },
      ]);
    } else {
      this.adapter.sendRoomEmote(text);
    }
    return true;
  }

  decorateButton(button: HTMLButtonElement, itemActivity: BCItemActivity): void {
    if (!this.#runtimeActivities.has(itemActivity?.Activity?.Name)) return;
    if (button.querySelector("[data-kikilink-activity-mark]")) return;
    const mark = document.createElement("img");
    mark.src = BLOSSOM_ICON_DATA_URL;
    mark.alt = "KikiLink custom activity";
    mark.title = "KikiLink custom activity";
    mark.dataset.kikilinkActivityMark = "true";
    Object.assign(mark.style, {
      position: "absolute",
      top: "0px",
      left: "0px",
      width: "12px",
      height: "12px",
      opacity: "0.96",
      pointerEvents: "none",
      filter: "drop-shadow(0 1px 3px rgba(0,0,0,.75))",
      zIndex: "2",
    });
    // BC's activity-card stylesheet also targets descendant images. Lock only the small marker's
    // geometry so it stays in the true upper-left corner at mobile zoom levels.
    for (const [property, value] of [
      ["position", "absolute"],
      ["top", "0px"],
      ["left", "0px"],
      ["right", "auto"],
      ["bottom", "auto"],
      ["width", "12px"],
      ["height", "12px"],
    ] as const) {
      mark.style.setProperty(property, value, "important");
    }
    if (!button.style.position) button.style.position = "relative";
    button.append(mark);
  }

  onRoomMessage(message: BCChatRoomMessage): void {
    const meta = parseActivityMeta(message);
    if (!meta || meta.arousal <= 0 || meta.target !== this.adapter.getOwnMemberNumber()) return;
    if (message.Sender !== meta.source || !this.adapter.isMemberInCurrentRoom(meta.source)) return;
    if (
      !dictionaryIdentifies(message.Dictionary, "SourceCharacter", meta.source) ||
      !dictionaryIdentifies(message.Dictionary, "TargetCharacter", meta.target) ||
      !this.getBodySlots().some((slot) => slot.name === meta.group)
    ) {
      return;
    }
    const fingerprint = `${meta.source}:${meta.nonce}`;
    if (this.#seenNonces.includes(fingerprint)) return;
    this.#seenNonces.push(fingerprint);
    if (this.#seenNonces.length > MAX_SEEN_NONCES) this.#seenNonces.shift();
    if (typeof ActivityEffectFlat !== "function") return;
    const source =
      typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter)
        ? ChatRoomCharacter.find((character) => character.MemberNumber === meta.source)
        : undefined;
    if (!source || typeof Player !== "object" || Player === null) return;
    ActivityEffectFlat(source, Player, meta.arousal, meta.group, 1);
  }

  #ensureRegistryInjection(): void {
    const registry = getNativeActivityRegistry();
    if (!registry) return;
    const registryChanged =
      registry.activities !== this.#registeredActivities ||
      registry.ordering !== this.#registeredOrdering;
    if (registryChanged) {
      this.#removeFromTrackedRegistry();
      this.#registeredActivities = registry.activities;
      this.#registeredOrdering = registry.ordering;
      this.#injectedActivities.clear();
      this.#bodySlotsCache = undefined;
    }

    if (!nativeActivityRegistryIsLoaded(registry)) {
      removeActivitiesFromRegistry(registry.activities, registry.ordering);
      this.#injectedActivities.clear();
      return;
    }
    if (this.#runtimeActivities.size === 0) {
      removeActivitiesFromRegistry(registry.activities, registry.ordering);
      this.#injectedActivities.clear();
      return;
    }
    if (!registryChanged && this.#registryInjectionIsHealthy(registry)) return;

    removeActivitiesFromRegistry(registry.activities, registry.ordering);
    this.#injectedActivities.clear();
    for (const [runtimeName, definition] of this.#runtimeActivities) {
      const activity = createNativeActivity(runtimeName, definition);
      registry.activities.push(activity);
      registry.ordering.push(runtimeName);
      this.#injectedActivities.set(runtimeName, activity);
    }
    refreshNativeActivityDialog();
  }

  /**
   * Repairs the exact array consumed by the currently open BC activity grid. This path is kept
   * independent from ModSDK and from function replacement so another addon cannot make saved
   * KikiLink activities silently disappear from an already-open native menu.
   */
  #syncOpenNativeDialog(): void {
    if (
      typeof DialogMenuMode === "undefined" ||
      DialogMenuMode !== "activities" ||
      typeof DialogActivity === "undefined" ||
      !Array.isArray(DialogActivity)
    ) {
      return;
    }
    let character: BCCharacter | null | undefined;
    try {
      character =
        typeof CharacterGetCurrent === "function"
          ? CharacterGetCurrent()
          : typeof CurrentCharacter !== "undefined"
            ? CurrentCharacter
            : undefined;
    } catch {
      return;
    }
    const groupName = character?.FocusGroup?.Name;
    if (!character || typeof groupName !== "string") return;
    const extended = this.extendAllowedActivities(character, groupName, DialogActivity);
    if (extended === DialogActivity) return;
    DialogActivity.splice(0, DialogActivity.length, ...extended);
    try {
      const reload = DialogMenuMapping?.activities?.Reload;
      if (typeof reload === "function") {
        const pending = reload.call(DialogMenuMapping.activities, null, {
          reset: true,
          resetDialogItems: false,
        });
        if (pending && typeof pending.catch === "function") void pending.catch(() => undefined);
      }
    } catch {
      // DialogActivity is already repaired; the next native redraw will consume it.
    }
  }

  #registryInjectionIsHealthy(registry: NativeActivityRegistry): boolean {
    const registeredActivities = registry.activities.filter((activity) =>
      typeof activity?.Name === "string" && activity.Name.startsWith(ACTIVITY_PREFIX),
    );
    const registeredOrdering = registry.ordering.filter((name) =>
      typeof name === "string" && name.startsWith(ACTIVITY_PREFIX),
    );
    if (
      registeredActivities.length !== this.#runtimeActivities.size ||
      registeredOrdering.length !== this.#runtimeActivities.size ||
      this.#injectedActivities.size !== this.#runtimeActivities.size
    ) {
      return false;
    }
    for (const runtimeName of this.#runtimeActivities.keys()) {
      const injected = this.#injectedActivities.get(runtimeName);
      if (
        !injected ||
        registeredActivities.filter((activity) => activity === injected).length !== 1 ||
        registeredOrdering.filter((name) => name === runtimeName).length !== 1
      ) {
        return false;
      }
    }
    return true;
  }

  #detachFromRegistries(): void {
    this.#removeFromTrackedRegistry();
    const current = getNativeActivityRegistry();
    if (
      current &&
      (current.activities !== this.#registeredActivities ||
        current.ordering !== this.#registeredOrdering)
    ) {
      removeActivitiesFromRegistry(current.activities, current.ordering);
    }
    this.#registeredActivities = undefined;
    this.#registeredOrdering = undefined;
  }

  #removeFromTrackedRegistry(): void {
    if (this.#registeredActivities && this.#registeredOrdering) {
      removeActivitiesFromRegistry(this.#registeredActivities, this.#registeredOrdering);
    }
  }
}

export function activityImageUrl(image: string): string {
  return `Assets/Female3DCG/Activity/${canonicalVanillaActivityImage(image)}.png`;
}

export function canonicalVanillaActivityImage(image: string): string {
  const canonical = VANILLA_ACTIVITY_IMAGE_ALIASES[image] ?? image;
  return VANILLA_ACTIVITY_IMAGE_SET.has(canonical) ? canonical : "Caress";
}

export function expandCustomActivityTemplate(
  template: string,
  context: {
    sourceName: string;
    targetName: string;
    targetMemberNumber?: number;
    pronouns?: Pronouns;
  },
): string {
  const pronouns = context.pronouns ?? { subject: "they", object: "them", possessive: "their" };
  const values: Record<string, string> = {
    "{target's gender}": pronouns.possessive,
    "{target's}": possessiveName(context.targetName),
    "{their}": pronouns.possessive,
    "{they}": pronouns.subject,
    "{them}": pronouns.object,
    "{source}": context.sourceName,
    "{me}": context.sourceName,
    "{target}": context.targetName,
    "{member}": context.targetMemberNumber?.toString() ?? "member",
  };
  return template
    .trim()
    .replace(
      /\{target's gender\}|\{target's\}|\{their\}|\{they\}|\{them\}|\{source\}|\{me\}|\{target\}|\{member\}/g,
      (token) => values[token] ?? token,
    );
}

export function expandActivityTemplate(
  template: string,
  context: { sourceName: string; target: RoomCharacter },
): string {
  return template
    .trim()
    .replaceAll("{source}", context.sourceName)
    .replaceAll("{target}", context.target.memberName)
    .replaceAll("{member}", context.target.memberNumber.toString());
}

function parseActivityMeta(message: BCChatRoomMessage): ActivityMeta | undefined {
  if (
    message.Type !== "Action" ||
    message.Content !== ACTION_CONTENT ||
    !Array.isArray(message.Dictionary)
  ) {
    return undefined;
  }
  const entry = message.Dictionary.find(
    (candidate) => isRecord(candidate) && candidate.Tag === META_TAG && typeof candidate.Text === "string",
  );
  if (!isRecord(entry) || typeof entry.Text !== "string" || entry.Text.length > 500) return undefined;
  try {
    const parsed = JSON.parse(entry.Text) as unknown;
    if (
      !isRecord(parsed) ||
      parsed.v !== 1 ||
      !validMemberNumber(parsed.source) ||
      !validMemberNumber(parsed.target) ||
      !SAFE_ASSET_NAME.test(typeof parsed.group === "string" ? parsed.group : "") ||
      typeof parsed.arousal !== "number" ||
      !Number.isInteger(parsed.arousal) ||
      parsed.arousal < 0 ||
      parsed.arousal > 20 ||
      typeof parsed.nonce !== "string" ||
      !/^[a-z0-9-]{8,48}$/i.test(parsed.nonce)
    ) {
      return undefined;
    }
    return parsed as unknown as ActivityMeta;
  } catch {
    return undefined;
  }
}

function dictionaryIdentifies(
  dictionary: unknown[] | undefined,
  tag: string,
  memberNumber: number,
): boolean {
  return (
    Array.isArray(dictionary) &&
    dictionary.some(
      (entry) =>
        isRecord(entry) && entry.Tag === tag && entry.MemberNumber === memberNumber,
    )
  );
}

function runtimeActivityName(owner: number, id: string): string {
  const safe = id.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 36) || "Activity";
  return `${ACTIVITY_PREFIX}${hashString(`${owner}/${id}`)}_${safe}`;
}

function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function characterName(character: BCCharacter): string {
  if (typeof CharacterNickname === "function") {
    try {
      const nickname = CharacterNickname(character).trim();
      if (nickname) return nickname;
    } catch {
      // Fall back to the character fields below.
    }
  }
  return character.Nickname?.trim() || character.Name?.trim() || `Member ${character.MemberNumber}`;
}

function characterPronouns(character: BCCharacter): Pronouns {
  const set = character.GetPronouns?.();
  if (set === "SheHer") return { subject: "she", object: "her", possessive: "her" };
  if (set === "HeHim") return { subject: "he", object: "him", possessive: "his" };
  if (set === "ItIt") return { subject: "it", object: "it", possessive: "its" };
  return { subject: "they", object: "them", possessive: "their" };
}

function possessiveName(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

function createNonce(): string {
  const random = Math.random().toString(36).slice(2, 12);
  return `${Date.now().toString(36)}-${random}`;
}

function getNativeActivityRegistry(): NativeActivityRegistry | undefined {
  if (
    typeof ActivityFemale3DCG !== "undefined" &&
    Array.isArray(ActivityFemale3DCG) &&
    typeof ActivityFemale3DCGOrdering !== "undefined" &&
    Array.isArray(ActivityFemale3DCGOrdering)
  ) {
    return { activities: ActivityFemale3DCG, ordering: ActivityFemale3DCGOrdering };
  }
  return undefined;
}

function activityGroupsMatch(configuredGroup: string, focusedGroup: string): boolean {
  if (configuredGroup === focusedGroup) return true;
  if (typeof AssetGroup === "undefined" || !Array.isArray(AssetGroup)) return false;
  const canonical = (name: string): string => {
    const group = AssetGroup.find((candidate) => candidate?.Name === name);
    return group?.MirrorActivitiesFrom ?? group?.Name ?? name;
  };
  return canonical(configuredGroup) === canonical(focusedGroup);
}

function createNativeActivity(
  runtimeName: string,
  definition: CustomActivityDefinition,
): BCActivity {
  return {
    Name: runtimeName,
    ActivityID:
      typeof GameVersion === "string" && GameVersion === "R121" ? -1 : undefined,
    MaxProgress: 0,
    MaxProgressSelf: 0,
    Prerequisite: [],
    Target: definition.targetMode === "self" ? [] : [definition.targetGroup],
    TargetSelf:
      definition.targetMode === "self" || definition.targetMode === "both"
        ? [definition.targetGroup]
        : [],
  };
}

function currentMemberNumber(adapter: BCAdapter): number {
  try {
    const value = adapter.getOwnMemberNumber();
    if (validMemberNumber(value)) return value;
  } catch {
    // Tiny test/fallback adapters may not implement account identity.
  }
  return typeof Player === "object" && Player !== null && validMemberNumber(Player.MemberNumber)
    ? Player.MemberNumber
    : 0;
}

function refreshNativeActivityDialog(): void {
  if (
    typeof DialogBuildActivities !== "function" ||
    typeof CharacterGetCurrent !== "function" ||
    typeof DialogMenuMode === "undefined" ||
    DialogMenuMode !== "activities"
  ) {
    return;
  }
  try {
    const character = CharacterGetCurrent();
    if (character) DialogBuildActivities(character, true);
  } catch {
    // Registration itself is complete; the next native menu open rebuilds the list normally.
  }
}

function nativeActivityRegistryIsLoaded(registry: NativeActivityRegistry): boolean {
  const availableNames = new Set(
    registry.activities
      .map((activity) => activity?.Name)
      .filter((name): name is string =>
        typeof name === "string" && !name.startsWith(ACTIVITY_PREFIX),
      ),
  );
  return registry.ordering.some(
    (name) => typeof name === "string" && availableNames.has(name),
  );
}

function removeActivitiesFromRegistry(activities: BCActivity[], ordering: string[]): void {
  for (let index = activities.length - 1; index >= 0; index -= 1) {
    const name = activities[index]?.Name;
    if (typeof name === "string" && name.startsWith(ACTIVITY_PREFIX)) activities.splice(index, 1);
  }
  for (let index = ordering.length - 1; index >= 0; index -= 1) {
    const name = ordering[index];
    if (typeof name === "string" && name.startsWith(ACTIVITY_PREFIX)) ordering.splice(index, 1);
  }
}

function fallbackBodySlots(): ActivityBodySlot[] {
  return [
    { name: "ItemHead", label: "Head", zones: [[170, 40, 160, 150]] },
    { name: "ItemMouth", label: "Mouth", zones: [[205, 115, 90, 60]] },
    { name: "ItemNeck", label: "Neck", zones: [[190, 190, 120, 70]] },
    { name: "ItemBreast", label: "Breasts", zones: [[145, 245, 210, 150]] },
    { name: "ItemArms", label: "Arms", zones: [[70, 245, 360, 260]] },
    { name: "ItemHands", label: "Hands", zones: [[70, 460, 360, 150]] },
    { name: "ItemTorso", label: "Torso", zones: [[145, 340, 210, 180]] },
    { name: "ItemPelvis", label: "Pelvis", zones: [[145, 500, 210, 130]] },
    { name: "ItemLegs", label: "Legs", zones: [[130, 610, 240, 250]] },
    { name: "ItemFeet", label: "Feet", zones: [[115, 850, 270, 130]] },
  ];
}

function bodySlotDrawLayer(
  groupName: string,
  selectedGroup?: string,
  hoveredGroup?: string,
): number {
  if (groupName === selectedGroup) return 2;
  if (groupName === hoveredGroup) return 1;
  return 0;
}

function humanizeGroupName(value: string): string {
  return value.replace(/^Item/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function validMemberNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
