import type { BCAdapter } from "../../bc/adapter";
import type { SettingsStore } from "../../core/settings";
import type {
  LinkReactionEvent,
  LinkReactionFired,
  ReactionRule,
} from "../../core/types";

export const MIN_ROOM_REACTION_INTERVAL_MS = 10_000;

export class LinkReactionsService {
  readonly #lastRuleFiredAt = new Map<string, number>();
  #lastRoomEmoteAt = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly adapter: BCAdapter,
    private readonly settings: SettingsStore,
    private readonly canActForAccount: () => boolean,
  ) {}

  react(event: LinkReactionEvent, now = Date.now()): LinkReactionFired | undefined {
    if (!this.#canAct()) return undefined;
    const settings = this.settings.get().linkReactions;
    if (!this.#canAct()) return undefined;
    if (!settings.enabled) return undefined;

    for (const rule of settings.rules) {
      if (!this.#canAct()) return undefined;
      if (!matchesRule(rule, event)) continue;
      const lastFiredAt = this.#lastRuleFiredAt.get(rule.id) ?? Number.NEGATIVE_INFINITY;
      if (now - lastFiredAt < rule.cooldownSeconds * 1_000) continue;

      const message = expandReactionTemplate(rule, event, this.adapter.getOwnName());
      if (!this.#canAct()) return undefined;
      if (!message) continue;
      if (rule.action === "room-emote") {
        if (now - this.#lastRoomEmoteAt < MIN_ROOM_REACTION_INTERVAL_MS) continue;
        if (!this.adapter.canSendRoomEmote()) continue;
        if (!this.#canAct()) return undefined;
        this.adapter.sendRoomEmote(message);
        if (!this.#canAct()) return undefined;
        this.#lastRoomEmoteAt = now;
      }

      if (!this.#canAct()) return undefined;
      this.#lastRuleFiredAt.set(rule.id, now);
      return {
        ruleId: rule.id,
        ruleLabel: rule.label,
        action: rule.action,
        message,
        event,
        firedAt: now,
      };
    }
    return undefined;
  }

  #canAct(): boolean {
    try {
      return this.canActForAccount() === true;
    } catch {
      return false;
    }
  }
}

export function matchesRule(rule: ReactionRule, event: LinkReactionEvent): boolean {
  if (!rule.enabled || rule.trigger !== event.trigger) return false;
  if (rule.scope === "friends" && !event.isFriend) return false;
  if (rule.scope === "members" && !rule.memberNumbers.includes(event.memberNumber)) return false;
  if (rule.trigger === "beep-received" && rule.textMatch) {
    return normalizeText(event.content ?? "").includes(normalizeText(rule.textMatch));
  }
  return true;
}

export function expandReactionTemplate(
  rule: ReactionRule,
  event: LinkReactionEvent,
  ownName: string,
): string {
  const eventLabel =
    event.trigger === "room-join"
      ? "joined the room"
      : event.trigger === "room-leave"
        ? "left the room"
        : event.trigger === "friend-online"
          ? "came online"
          : "sent a Beep";
  const privateMessage = rule.action === "notice" ? cleanValue(event.content) : "";
  return rule.template
    .replaceAll("{name}", cleanValue(event.memberName))
    .replaceAll("{member}", event.memberNumber.toString())
    .replaceAll("{message}", privateMessage)
    .replaceAll("{room}", cleanValue(event.roomName) || "the room")
    .replaceAll("{me}", cleanValue(ownName) || "me")
    .replaceAll("{event}", eventLabel)
    .replace(/[\u0000-\u001f\u007f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 1_000);
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/gu, " ");
}

function cleanValue(value: string | undefined): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, 500)
    : "";
}
