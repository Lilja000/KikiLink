import type { BCAdapter } from "../../bc/adapter";
import type { RoomActivity, RoomCharacter } from "../../core/types";

export class LinkActivitiesService {
  constructor(private readonly adapter: BCAdapter) {}

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
