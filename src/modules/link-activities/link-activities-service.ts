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
const SAFE_ASSET_NAME = /^[A-Za-z][A-Za-z0-9_]{0,79}$/;
const FALLBACK_IMAGES = [
  "Caress",
  "Cuddle",
  "Kiss",
  "FrenchKiss",
  "PoliteKiss",
  "Nod",
  "TakeCare",
  "Pet",
  "Tickle",
  "MassageHands",
  "MassageFeet",
  "RestHead",
] as const;

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

export class LinkActivitiesService implements BCCustomActivityIntegration {
  readonly #runtimeActivities = new Map<string, CustomActivityDefinition>();
  readonly #seenNonces: string[] = [];
  #unregister: (() => void) | undefined;

  constructor(
    private readonly adapter: BCAdapter,
    private readonly settings?: SettingsStore,
  ) {}

  start(): void {
    if (!this.#unregister) {
      this.#unregister = this.adapter.registerCustomActivityIntegration(this);
    }
    this.syncFromSettings();
  }

  stop(): void {
    this.#unregister?.();
    this.#unregister = undefined;
    this.#removeRegisteredActivities();
    this.#runtimeActivities.clear();
    this.#seenNonces.splice(0);
  }

  syncFromSettings(): void {
    this.#removeRegisteredActivities();
    this.#runtimeActivities.clear();
    const settings = this.settings?.get();
    if (!settings?.linkActivities.enabled || !hasNativeActivityRegistry()) return;

    for (const definition of settings.linkActivities.customActivities) {
      const runtimeName = runtimeActivityName(definition.id);
      const activity: BCActivity = {
        Name: runtimeName,
        MaxProgress: 0,
        MaxProgressSelf: 0,
        Prerequisite: [],
        Target: definition.targetMode === "self" ? [] : [definition.targetGroup],
        ...(definition.targetMode === "self"
          ? { TargetSelf: [definition.targetGroup] }
          : definition.targetMode === "both"
            ? { TargetSelf: [definition.targetGroup] }
            : {}),
      };
      this.#runtimeActivities.set(runtimeName, definition);
      ActivityFemale3DCG.push(activity);
      ActivityFemale3DCGOrdering.push(runtimeName);
    }
  }

  isAvailable(): boolean {
    return this.adapter.canSendRoomEmote();
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
    if (typeof AssetGroup === "undefined" || !Array.isArray(AssetGroup)) {
      return fallbackBodySlots();
    }
    const nativeTargets = new Set<string>();
    if (typeof ActivityFemale3DCG !== "undefined" && Array.isArray(ActivityFemale3DCG)) {
      for (const activity of ActivityFemale3DCG) {
        if (!activity.Name.startsWith(ACTIVITY_PREFIX)) {
          for (const target of activity.Target) nativeTargets.add(target);
        }
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
    return slots.length > 0 ? slots : fallbackBodySlots();
  }

  getVanillaImages(): string[] {
    const images = new Set<string>(FALLBACK_IMAGES);
    if (
      typeof ActivityFemale3DCGOrdering !== "undefined" &&
      Array.isArray(ActivityFemale3DCGOrdering)
    ) {
      for (const name of ActivityFemale3DCGOrdering) {
        if (SAFE_ASSET_NAME.test(name) && !name.startsWith(ACTIVITY_PREFIX)) images.add(name);
      }
    }
    return [...images].sort((left, right) => left.localeCompare(right));
  }

  drawPlayer(
    canvas: HTMLCanvasElement,
    selectedGroup?: string,
    hoveredGroup?: string,
  ): boolean {
    const context = canvas.getContext("2d");
    if (!context) return false;
    canvas.width = 250;
    canvas.height = 500;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (
      typeof Player !== "object" ||
      Player === null ||
      typeof DrawCharacter !== "function"
    ) {
      return false;
    }
    DrawCharacter(Player, 0, 0, 0.5, false, context);
    for (const slot of this.getBodySlots()) {
      if (slot.name !== selectedGroup && slot.name !== hoveredGroup) continue;
      const selected = slot.name === selectedGroup;
      context.fillStyle = selected ? "rgba(215, 25, 50, 0.25)" : "rgba(214, 162, 75, 0.18)";
      context.strokeStyle = selected ? "rgba(255, 106, 126, 0.95)" : "rgba(224, 185, 112, 0.88)";
      context.lineWidth = selected ? 2 : 1.5;
      for (const [x, y, width, height] of slot.zones) {
        context.fillRect(x * 0.5, y * 0.5, width * 0.5, height * 0.5);
        context.strokeRect(x * 0.5, y * 0.5, width * 0.5, height * 0.5);
      }
    }
    return true;
  }

  bodySlotAt(x: number, y: number): ActivityBodySlot | undefined {
    const sourceX = x * 2;
    const sourceY = y * 2;
    return this.getBodySlots().find((slot) =>
      slot.zones.some(
        ([zoneX, zoneY, width, height]) =>
          sourceX >= zoneX &&
          sourceX <= zoneX + width &&
          sourceY >= zoneY &&
          sourceY <= zoneY + height,
      ),
    );
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
      top: "4px",
      right: "4px",
      width: "24px",
      height: "24px",
      opacity: "0.88",
      pointerEvents: "none",
      filter: "drop-shadow(0 1px 3px rgba(0,0,0,.75))",
      zIndex: "2",
    });
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

  #removeRegisteredActivities(): void {
    if (!hasNativeActivityRegistry()) return;
    for (let index = ActivityFemale3DCG.length - 1; index >= 0; index -= 1) {
      if (ActivityFemale3DCG[index]?.Name.startsWith(ACTIVITY_PREFIX)) {
        ActivityFemale3DCG.splice(index, 1);
      }
    }
    for (let index = ActivityFemale3DCGOrdering.length - 1; index >= 0; index -= 1) {
      if (ActivityFemale3DCGOrdering[index]?.startsWith(ACTIVITY_PREFIX)) {
        ActivityFemale3DCGOrdering.splice(index, 1);
      }
    }
  }
}

export function activityImageUrl(image: string): string {
  const safeImage = SAFE_ASSET_NAME.test(image) ? image : "Caress";
  return `Assets/Female3DCG/Activity/${safeImage}.png`;
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

function runtimeActivityName(id: string): string {
  const safe = id.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 36) || "Activity";
  return `${ACTIVITY_PREFIX}${hashString(id)}_${safe}`;
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

function hasNativeActivityRegistry(): boolean {
  return (
    typeof ActivityFemale3DCG !== "undefined" &&
    Array.isArray(ActivityFemale3DCG) &&
    typeof ActivityFemale3DCGOrdering !== "undefined" &&
    Array.isArray(ActivityFemale3DCGOrdering)
  );
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

function humanizeGroupName(value: string): string {
  return value.replace(/^Item/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function validMemberNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
