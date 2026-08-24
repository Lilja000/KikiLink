import { describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import {
  expandActivityTemplate,
  LinkActivitiesService,
} from "../src/modules/link-activities/link-activities-service";

describe("LinkActivitiesService", () => {
  it("expands original activity variables and performs a native room emote", () => {
    const sendRoomEmote = vi.fn();
    const adapter = {
      canSendRoomEmote: () => true,
      getOwnName: () => "Kiki",
      getRoomCharacters: () => [{ memberNumber: 123, memberName: "Reina" }],
      sendRoomEmote,
    } as unknown as BCAdapter;
    const service = new LinkActivitiesService(adapter);
    const activity = {
      label: "Greeting",
      template: "{source} offers {target} (#{member}) a sakura blossom.",
      category: "Greetings",
      pack: "Test pack",
      favorite: false,
    };
    const target = { memberNumber: 123, memberName: "Reina" };

    expect(service.preview(activity, target)).toBe(
      "Kiki offers Reina (#123) a sakura blossom.",
    );
    expect(service.perform(activity, target)).toBe(
      "Kiki offers Reina (#123) a sakura blossom.",
    );
    expect(sendRoomEmote).toHaveBeenCalledWith(
      "Kiki offers Reina (#123) a sakura blossom.",
    );
  });

  it("expands repeated placeholders without interpreting replacement text", () => {
    expect(
      expandActivityTemplate("greets {target}; {target} sees {source}.", {
        sourceName: "Ki$ki",
        target: { memberNumber: 7, memberName: "{source}" },
      }),
    ).toBe("greets {source}; {source} sees Ki$ki.");
  });
});
