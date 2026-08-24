// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter, BCCustomActivityIntegration } from "../src/bc/adapter";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import {
  expandCustomActivityTemplate,
  LinkActivitiesService,
} from "../src/modules/link-activities/link-activities-service";

afterEach(() => {
  for (const key of [
    "ActivityFemale3DCG",
    "ActivityFemale3DCGOrdering",
    "AssetGroup",
    "Player",
    "ChatRoomCharacter",
    "ChatRoomPublishCustomAction",
    "ActivityEffectFlat",
    "CharacterNickname",
  ]) {
    Reflect.deleteProperty(globalThis, key);
  }
  document.body.replaceChildren();
});

describe("native Custom Activities", () => {
  it("registers beside vanilla activities, reuses an icon, and adds the Blossom marker", () => {
    globalThis.ActivityFemale3DCG = [
      { Name: "Caress", MaxProgress: 10, Prerequisite: [], Target: ["ItemArms"] },
    ];
    globalThis.ActivityFemale3DCGOrdering = ["Caress"];
    globalThis.AssetGroup = [
      {
        Name: "ItemArms",
        Description: "Arms",
        Category: "Item",
        Zone: [[100, 200, 300, 250]],
      },
    ];
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkActivities.customActivities.push({
        id: "elbow-touch",
        name: "Elbow touch",
        targetGroup: "ItemArms",
        targetMode: "both",
        template: "{me} touches {target's} arm and {target's gender} elbow.",
        image: "Caress",
        arousal: 6,
      });
    });
    let integration: BCCustomActivityIntegration | undefined;
    const adapter = {
      registerCustomActivityIntegration: (value: BCCustomActivityIntegration) => {
        integration = value;
        return () => {
          integration = undefined;
        };
      },
      canSendRoomEmote: () => true,
      getRoomCharacters: () => [],
      getOwnName: () => "Kiki",
      sendRoomEmote: vi.fn(),
    } as unknown as BCAdapter;
    const service = new LinkActivitiesService(adapter, settings);

    service.start();

    expect(integration).toBe(service);
    const custom = globalThis.ActivityFemale3DCG.find((activity) =>
      activity.Name.startsWith("KikiLinkCustom_"),
    );
    expect(custom).toMatchObject({
      MaxProgress: 0,
      Target: ["ItemArms"],
      TargetSelf: ["ItemArms"],
    });
    expect(globalThis.ActivityFemale3DCGOrdering.at(-1)).toBe(custom?.Name);
    expect(service.resolveText(`Activity${custom?.Name}`)).toBe("Elbow touch");
    expect(service.resolveImage(custom?.Name ?? "")).toBe(
      "Assets/Female3DCG/Activity/Caress.png",
    );

    const button = document.createElement("button");
    service.decorateButton(button, {
      Activity: custom as BCActivity,
      Group: "ItemArms",
    });
    const blossom = button.querySelector<HTMLImageElement>("[data-kikilink-activity-mark]");
    expect(blossom?.alt).toBe("KikiLink custom activity");
    expect(blossom?.src).toContain("data:image/svg+xml");

    service.stop();
    expect(globalThis.ActivityFemale3DCG.map((activity) => activity.Name)).toEqual(["Caress"]);
    expect(globalThis.ActivityFemale3DCGOrdering).toEqual(["Caress"]);
  });

  it("publishes only the finished sentence while carrying validated arousal metadata", () => {
    globalThis.ActivityFemale3DCG = [];
    globalThis.ActivityFemale3DCGOrdering = [];
    const publish = vi.fn();
    globalThis.ChatRoomPublishCustomAction = publish;
    globalThis.CharacterNickname = (character) => character.Nickname ?? character.Name;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkActivities.customActivities.push({
        id: "elbow-touch",
        name: "Elbow touch",
        targetGroup: "ItemArms",
        targetMode: "other",
        template: "{me} touches {target's} arm and {target's gender} elbow.",
        image: "Caress",
        arousal: 6,
      });
    });
    const adapter = {
      registerCustomActivityIntegration: () => () => undefined,
      canSendRoomEmote: () => true,
      getRoomCharacters: () => [],
      getOwnName: () => "Kiki",
      sendRoomEmote: vi.fn(),
    } as unknown as BCAdapter;
    const service = new LinkActivitiesService(adapter, settings);
    service.start();
    const custom = globalThis.ActivityFemale3DCG[0];
    const actor = { MemberNumber: 999, Name: "AccountKiki", Nickname: "Kiki" };
    const target = {
      MemberNumber: 123,
      Name: "AccountReina",
      Nickname: "Reina",
      GetPronouns: () => "SheHer" as const,
    };

    expect(
      service.run(actor, target, { Name: "ItemArms", Description: "Arms", Category: "Item" }, {
        Activity: custom as BCActivity,
        Group: "ItemArms",
      }),
    ).toBe(true);

    expect(publish).toHaveBeenCalledOnce();
    const [content, leaveDialog, dictionary] = publish.mock.calls[0] as [
      string,
      boolean,
      Array<Record<string, unknown>>,
    ];
    expect(content).toBe("KikiLinkCustomActivity");
    expect(leaveDialog).toBe(false);
    const visible = dictionary.find((entry) =>
      String(entry.Tag).startsWith('MISSING TEXT IN "Interface.csv"'),
    );
    expect(visible?.Text).toBe("Kiki touches Reina's arm and her elbow.");
    expect(String(visible?.Text)).not.toContain("messageType");
    const metaEntry = dictionary.find((entry) => entry.Tag === "KikiLinkActivityMeta");
    expect(JSON.parse(String(metaEntry?.Text))).toMatchObject({
      v: 1,
      source: 999,
      target: 123,
      group: "ItemArms",
      arousal: 6,
    });
  });

  it("applies a valid incoming arousal effect once and rejects spoofed metadata", () => {
    const effect = vi.fn();
    globalThis.ActivityEffectFlat = effect;
    const source = { MemberNumber: 999, Name: "Kiki" };
    globalThis.Player = {
      MemberNumber: 123,
      Name: "Reina",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomCharacter = [source, globalThis.Player];
    const adapter = {
      getOwnMemberNumber: () => 123,
      isMemberInCurrentRoom: (memberNumber: number) => memberNumber === 999,
    } as unknown as BCAdapter;
    const service = new LinkActivitiesService(adapter);
    const metadata = {
      v: 1,
      source: 999,
      target: 123,
      group: "ItemArms",
      arousal: 8,
      nonce: "nonce-123456",
    };
    const message = {
      Type: "Action",
      Content: "KikiLinkCustomActivity",
      Sender: 999,
      Dictionary: [
        { Tag: "SourceCharacter", MemberNumber: 999, Text: "Kiki" },
        { Tag: "TargetCharacter", MemberNumber: 123, Text: "Reina" },
        { Tag: "KikiLinkActivityMeta", Text: JSON.stringify(metadata) },
      ],
    };

    service.onRoomMessage(message);
    service.onRoomMessage(message);
    expect(effect).toHaveBeenCalledOnce();
    expect(effect).toHaveBeenCalledWith(source, globalThis.Player, 8, "ItemArms", 1);

    service.onRoomMessage({
      ...message,
      Sender: 777,
      Dictionary: [
        { Tag: "SourceCharacter", MemberNumber: 999, Text: "Kiki" },
        { Tag: "TargetCharacter", MemberNumber: 123, Text: "Reina" },
        {
          Tag: "KikiLinkActivityMeta",
          Text: JSON.stringify({ ...metadata, nonce: "nonce-999999" }),
        },
      ],
    });
    service.onRoomMessage({
      ...message,
      Dictionary: [
        { Tag: "SourceCharacter", MemberNumber: 999, Text: "Kiki" },
        { Tag: "TargetCharacter", MemberNumber: 123, Text: "Reina" },
        {
          Tag: "KikiLinkActivityMeta",
          Text: JSON.stringify({ ...metadata, arousal: 99, nonce: "nonce-888888" }),
        },
      ],
    });
    expect(effect).toHaveBeenCalledOnce();
  });

  it("expands quick variables without interpreting names as templates", () => {
    expect(
      expandCustomActivityTemplate("{me} greets {target}; {they} offer {their} hand to {me}.", {
        sourceName: "{target}",
        targetName: "{me}",
        pronouns: { subject: "she", object: "her", possessive: "her" },
      }),
    ).toBe("{target} greets {me}; she offer her hand to {target}.");
  });
});
