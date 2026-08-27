// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter, BCCustomActivityIntegration } from "../src/bc/adapter";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import {
  activityImageUrl,
  canonicalVanillaActivityImage,
  expandCustomActivityTemplate,
  LinkActivitiesService,
  VANILLA_ACTIVITY_IMAGES,
} from "../src/modules/link-activities/link-activities-service";

afterEach(() => {
  vi.useRealTimers();
  for (const key of [
    "ActivityFemale3DCG",
    "ActivityFemale3DCGOrdering",
    "AssetGroup",
    "Player",
    "ChatRoomCharacter",
    "ChatRoomPublishCustomAction",
    "ActivityEffectFlat",
    "CharacterNickname",
    "DrawCharacter",
    "GameVersion",
    "DialogBuildActivities",
    "CharacterGetCurrent",
    "CurrentCharacter",
    "DialogMenuMode",
    "DialogActivity",
    "DialogMenuMapping",
    "CurrentScreen",
    "DialogLeave",
  ]) {
    Reflect.deleteProperty(globalThis, key);
  }
  document.body.replaceChildren();
});

describe("native Custom Activities", () => {
  it("defers registration until Bondage Club creates its native activity registries", () => {
    vi.useFakeTimers();
    const settings = settingsWithElbowTouch();
    const unregister = vi.fn();
    const adapter = {
      registerCustomActivityIntegration: () => unregister,
    } as unknown as BCAdapter;
    const service = new LinkActivitiesService(adapter, settings);

    service.start();
    expect(globalThis.ActivityFemale3DCG).toBeUndefined();

    globalThis.ActivityFemale3DCG = [];
    globalThis.ActivityFemale3DCGOrdering = [];
    vi.advanceTimersByTime(500);
    expect(globalThis.ActivityFemale3DCG).toEqual([]);
    expect(globalThis.ActivityFemale3DCGOrdering).toEqual([]);

    globalThis.ActivityFemale3DCG.push({
      Name: "Caress",
      MaxProgress: 10,
      Prerequisite: [],
      Target: ["ItemArms"],
    });
    globalThis.ActivityFemale3DCGOrdering.push("Caress");
    vi.advanceTimersByTime(500);

    expect(
      globalThis.ActivityFemale3DCG.filter((activity) =>
        activity.Name.startsWith("KikiLinkCustom_"),
      ),
    ).toHaveLength(1);
    expect(
      globalThis.ActivityFemale3DCGOrdering.filter((name) =>
        name.startsWith("KikiLinkCustom_"),
      ),
    ).toHaveLength(1);

    service.stop();
    expect(unregister).toHaveBeenCalledOnce();
    expect(globalThis.ActivityFemale3DCG.map((activity) => activity.Name)).toEqual(["Caress"]);
    expect(globalThis.ActivityFemale3DCGOrdering).toEqual(["Caress"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reinjects once when Bondage Club replaces or rebuilds the registry arrays", () => {
    vi.useFakeTimers();
    const oldActivities: BCActivity[] = [
      { Name: "Caress", MaxProgress: 10, Prerequisite: [], Target: ["ItemArms"] },
    ];
    const oldOrdering = ["Caress"];
    globalThis.ActivityFemale3DCG = oldActivities;
    globalThis.ActivityFemale3DCGOrdering = oldOrdering;
    const service = new LinkActivitiesService(
      { registerCustomActivityIntegration: () => () => undefined } as unknown as BCAdapter,
      settingsWithElbowTouch(),
    );

    service.start();
    expect(oldActivities.filter((activity) => activity.Name.startsWith("KikiLinkCustom_"))).toHaveLength(1);

    const replacementActivities: BCActivity[] = [
      { Name: "Caress", MaxProgress: 10, Prerequisite: [], Target: ["ItemArms"] },
    ];
    const replacementOrdering = ["Caress"];
    globalThis.ActivityFemale3DCG = replacementActivities;
    globalThis.ActivityFemale3DCGOrdering = replacementOrdering;
    vi.advanceTimersByTime(500);

    expect(oldActivities.map((activity) => activity.Name)).toEqual(["Caress"]);
    expect(oldOrdering).toEqual(["Caress"]);
    expect(
      replacementActivities.filter((activity) => activity.Name.startsWith("KikiLinkCustom_")),
    ).toHaveLength(1);
    expect(
      replacementOrdering.filter((name) => name.startsWith("KikiLinkCustom_")),
    ).toHaveLength(1);

    for (let index = replacementActivities.length - 1; index >= 0; index -= 1) {
      if (replacementActivities[index]?.Name.startsWith("KikiLinkCustom_")) {
        replacementActivities.splice(index, 1);
      }
    }
    for (let index = replacementOrdering.length - 1; index >= 0; index -= 1) {
      if (replacementOrdering[index]?.startsWith("KikiLinkCustom_")) {
        replacementOrdering.splice(index, 1);
      }
    }
    vi.advanceTimersByTime(500);
    vi.advanceTimersByTime(500);

    expect(
      replacementActivities.filter((activity) => activity.Name.startsWith("KikiLinkCustom_")),
    ).toHaveLength(1);
    expect(
      replacementOrdering.filter((name) => name.startsWith("KikiLinkCustom_")),
    ).toHaveLength(1);

    service.stop();
    expect(replacementActivities.map((activity) => activity.Name)).toEqual(["Caress"]);
    expect(replacementOrdering).toEqual(["Caress"]);
  });

  it("offers only canonical, visually unique vanilla pictures from a fixed manifest", () => {
    globalThis.ActivityFemale3DCG = [
      { Name: "Caress", MaxProgress: 10, Prerequisite: [], Target: ["ItemArms"] },
      { Name: "LSCG_Choke", MaxProgress: 10, Prerequisite: [], Target: ["ItemNeck"] },
    ];
    globalThis.ActivityFemale3DCGOrdering = [
      "Caress",
      "Pet",
      "SpankItem",
      "LSCG_Choke",
      "OtherAddonFoo",
    ];
    const service = new LinkActivitiesService({} as BCAdapter);

    expect(service.getVanillaImages()).toEqual([...VANILLA_ACTIVITY_IMAGES]);
    expect(service.getVanillaImages()).toHaveLength(33);
    expect(new Set(service.getVanillaImages())).toHaveLength(33);
    expect(service.getVanillaImages()).not.toContain("LSCG_Choke");
    expect(service.getVanillaImages()).not.toContain("SpankItem");
    expect(service.getVanillaImages()).not.toContain("Pet");
    expect(canonicalVanillaActivityImage("Pet")).toBe("Caress");
    expect(canonicalVanillaActivityImage("Spank")).toBe("Slap");
    expect(canonicalVanillaActivityImage("PenetrateFast")).toBe("PenetrateSlow");
    expect(canonicalVanillaActivityImage("LSCG_Choke")).toBe("Caress");
    expect(activityImageUrl("LSCG_Choke")).toBe("./Assets/Female3DCG/Activity/Caress.png");
  });

  it("outlines every body zone, draws the selected zone last, and picks the smallest overlap", () => {
    globalThis.ActivityFemale3DCG = [
      {
        Name: "Caress",
        MaxProgress: 10,
        Prerequisite: [],
        Target: ["ItemArms", "ItemHands"],
      },
    ];
    globalThis.ActivityFemale3DCGOrdering = ["Caress"];
    globalThis.AssetGroup = [
      {
        Name: "ItemArms",
        Description: "Arms",
        Category: "Item",
        Zone: [[0, 0, 400, 400]],
      },
      {
        Name: "ItemHands",
        Description: "Hands",
        Category: "Item",
        Zone: [[100, 100, 50, 50]],
      },
    ];
    globalThis.Player = { MemberNumber: 999, Name: "Kiki", FriendNames: new Map() };
    globalThis.DrawCharacter = vi.fn();
    const context = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;
    const canvas = document.createElement("canvas");
    Object.defineProperty(canvas, "getContext", { value: () => context });
    const service = new LinkActivitiesService({} as BCAdapter);

    expect(service.drawPlayer(canvas, "ItemArms")).toBe(true);
    expect(globalThis.DrawCharacter).toHaveBeenCalledOnce();
    expect(context.strokeRect).toHaveBeenCalledTimes(2);
    expect(vi.mocked(context.strokeRect).mock.calls.at(-1)).toEqual([0, 0, 200, 200]);
    expect(service.bodySlotAt(60, 60)?.name).toBe("ItemHands");
  });

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
      getOwnMemberNumber: () => 999,
      sendRoomEmote: vi.fn(),
    } as unknown as BCAdapter;
    const service = new LinkActivitiesService(adapter, settings);

    service.start();

    expect(integration).toBe(service);
    const custom = globalThis.ActivityFemale3DCG.find((activity) =>
      activity.Name.startsWith("KikiLinkCustom_"),
    );
    expect(custom).toMatchObject({
      ActivityID: undefined,
      MaxProgress: 0,
      Target: ["ItemArms"],
      TargetSelf: ["ItemArms"],
    });
    expect(globalThis.ActivityFemale3DCGOrdering.at(-1)).toBe(custom?.Name);
    expect(service.resolveText(`Activity${custom?.Name}`)).toBe("Elbow touch");
    expect(service.resolveText(`Label-ChatSelf-ItemArms-${custom?.Name}`)).toBe("Elbow touch");
    expect(service.resolveText(`ChatSelf-ItemArms-${custom?.Name}`)).toBe(
      "{me} touches {target's} arm and {target's gender} elbow.",
    );
    expect(service.resolveImage(custom?.Name ?? "")).toBe(
      "./Assets/Female3DCG/Activity/Caress.png",
    );

    const button = document.createElement("button");
    service.decorateButton(button, {
      Activity: custom as BCActivity,
      Group: "ItemArms",
    });
    const blossom = button.querySelector<HTMLImageElement>("[data-kikilink-activity-mark]");
    expect(blossom?.alt).toBe("KikiLink custom activity");
    expect(blossom?.src).toContain("data:image/svg+xml");
    expect(blossom?.style.top).toBe("0px");
    expect(blossom?.style.left).toBe("0px");
    expect(blossom?.style.width).toBe("12px");
    expect(blossom?.style.height).toBe("12px");
    expect(blossom?.style.right).toBe("auto");
    expect(blossom?.style.bottom).toBe("auto");
    expect(blossom?.style.getPropertyPriority("left")).toBe("important");

    service.stop();
    expect(globalThis.ActivityFemale3DCG.map((activity) => activity.Name)).toEqual(["Caress"]);
    expect(globalThis.ActivityFemale3DCGOrdering).toEqual(["Caress"]);
  });

  it("uses account-specific native names and refreshes an already-open activity grid", () => {
    globalThis.ActivityFemale3DCG = [
      { Name: "Caress", MaxProgress: 10, Prerequisite: [], Target: ["ItemArms"] },
    ];
    globalThis.ActivityFemale3DCGOrdering = ["Caress"];
    globalThis.DialogMenuMode = "activities";
    const target = { MemberNumber: 123, Name: "Reina" };
    globalThis.CharacterGetCurrent = () => target;
    globalThis.DialogBuildActivities = vi.fn();
    const settings = settingsWithElbowTouch();
    const first = new LinkActivitiesService(
      {
        registerCustomActivityIntegration: () => () => undefined,
        getOwnMemberNumber: () => 101,
      } as unknown as BCAdapter,
      settings,
    );
    first.start();
    const firstName = globalThis.ActivityFemale3DCG.at(-1)?.Name;
    expect(globalThis.DialogBuildActivities).toHaveBeenCalledWith(target, true);
    first.stop();

    vi.mocked(globalThis.DialogBuildActivities).mockClear();
    const second = new LinkActivitiesService(
      {
        registerCustomActivityIntegration: () => () => undefined,
        getOwnMemberNumber: () => 202,
      } as unknown as BCAdapter,
      settings,
    );
    second.start();
    const secondName = globalThis.ActivityFemale3DCG.at(-1)?.Name;
    expect(firstName).toMatch(/^KikiLinkCustom_/);
    expect(secondName).toMatch(/^KikiLinkCustom_/);
    expect(secondName).not.toBe(firstName);
    expect(globalThis.DialogBuildActivities).toHaveBeenCalledWith(target, true);
    second.stop();
  });

  it("extends the exact native dialog list and never duplicates its registered activity", () => {
    globalThis.ActivityFemale3DCG = [
      { Name: "Caress", MaxProgress: 10, Prerequisite: [], Target: ["ItemArms"] },
    ];
    globalThis.ActivityFemale3DCGOrdering = ["Caress"];
    const service = new LinkActivitiesService(
      {
        registerCustomActivityIntegration: () => () => undefined,
        getOwnMemberNumber: () => 999,
      } as unknown as BCAdapter,
      settingsWithElbowTouch(),
    );
    service.start();
    const vanilla: BCItemActivity = {
      Activity: globalThis.ActivityFemale3DCG[0]!,
      Group: "ItemArms",
    };

    const first = service.extendAllowedActivities(
      { MemberNumber: 123, Name: "Reina" },
      "ItemArms",
      [vanilla],
    );
    expect(first.map((item) => item.Activity.Name)).toEqual([
      "Caress",
      expect.stringMatching(/^KikiLinkCustom_/),
    ]);
    expect(
      service.extendAllowedActivities(
        { MemberNumber: 123, Name: "Reina" },
        "ItemArms",
        first,
      ),
    ).toHaveLength(2);
    expect(
      service.extendAllowedActivities(
        { MemberNumber: 123, Name: "Reina" },
        "ItemLegs",
        [vanilla],
      ),
    ).toEqual([vanilla]);
    expect(
      service
        .extendAllowedActivities(
          { MemberNumber: 123, Name: "Reina" },
          "ItemArms",
          [],
        )
        .map((item) => item.Activity.Name),
    ).toEqual([expect.stringMatching(/^KikiLinkCustom_/)]);
    service.stop();
  });

  it("repairs the open native grid without hooks and honors mirrored activity groups", () => {
    vi.useFakeTimers();
    globalThis.ActivityFemale3DCG = [
      { Name: "Caress", MaxProgress: 10, Prerequisite: [], Target: ["ItemArms"] },
    ];
    globalThis.ActivityFemale3DCGOrdering = ["Caress"];
    globalThis.AssetGroup = [
      { Name: "ItemArms", Description: "Arms", Category: "Item" },
      {
        Name: "ItemHands",
        Description: "Hands",
        Category: "Item",
        MirrorActivitiesFrom: "ItemArms",
      },
    ];
    const target = {
      MemberNumber: 123,
      Name: "Reina",
      FocusGroup: globalThis.AssetGroup[1]!,
    };
    globalThis.CharacterGetCurrent = () => target;
    globalThis.DialogMenuMode = "activities";
    globalThis.DialogActivity = [];
    const reload = vi.fn(() => Promise.resolve());
    globalThis.DialogMenuMapping = { activities: { Reload: reload } };
    const service = new LinkActivitiesService(
      {
        registerCustomActivityIntegration: () => () => undefined,
        getOwnMemberNumber: () => 999,
      } as unknown as BCAdapter,
      settingsWithElbowTouch(),
    );

    service.start();
    expect(globalThis.DialogActivity.map((item) => item.Activity.Name)).toEqual([
      expect.stringMatching(/^KikiLinkCustom_/),
    ]);
    expect(globalThis.DialogActivity[0]?.Group).toBe("ItemHands");
    expect(reload).toHaveBeenCalledOnce();

    globalThis.DialogActivity.splice(0);
    vi.advanceTimersByTime(500);
    expect(globalThis.DialogActivity.map((item) => item.Activity.Name)).toEqual([
      expect.stringMatching(/^KikiLinkCustom_/),
    ]);
    expect(reload).toHaveBeenCalledTimes(2);
    service.stop();
  });

  it("repairs and runs a native custom-activity button without relying on BC function hooks", async () => {
    vi.useFakeTimers();
    const arms: BCAssetGroup = {
      Name: "ItemArms",
      Description: "Arms",
      Category: "Item",
    };
    globalThis.ActivityFemale3DCG = [
      { Name: "Caress", MaxProgress: 10, Prerequisite: [], Target: ["ItemArms"] },
    ];
    globalThis.ActivityFemale3DCGOrdering = ["Caress"];
    globalThis.AssetGroup = [arms];
    globalThis.Player = { MemberNumber: 999, Name: "Kiki", FriendNames: new Map() };
    const target = { MemberNumber: 123, Name: "Reina", FocusGroup: arms };
    globalThis.CharacterGetCurrent = () => target;
    globalThis.DialogMenuMode = "activities";
    globalThis.DialogActivity = [];
    globalThis.DialogMenuMapping = { activities: { Reload: vi.fn() } };
    globalThis.CurrentScreen = "ChatRoom";
    globalThis.DialogLeave = vi.fn();
    globalThis.ChatRoomPublishCustomAction = vi.fn();
    const service = new LinkActivitiesService(
      {
        registerCustomActivityIntegration: () => () => undefined,
        getOwnMemberNumber: () => 999,
        sendRoomEmote: vi.fn(),
      } as unknown as BCAdapter,
      settingsWithElbowTouch(),
    );

    service.start();
    const itemActivity = globalThis.DialogActivity[0]!;
    const button = document.createElement("button");
    button.className = "dialog-grid-button";
    button.name = itemActivity.Activity.Name;
    button.dataset.index = "0";
    button.dataset.group = "ItemArms";
    const brokenImage = document.createElement("img");
    brokenImage.className = "button-image";
    brokenImage.src = "./Assets/Female3DCG/Activity/Missing.png";
    const brokenLabel = document.createElement("span");
    brokenLabel.className = "button-label";
    brokenLabel.textContent = `MISSING TEXT IN \"ActivityDictionary.csv\": ${itemActivity.Activity.Name}`;
    button.append(brokenImage, brokenLabel);
    const nativeClick = vi.fn();
    button.addEventListener("click", nativeClick);
    document.body.append(button);

    await Promise.resolve();
    vi.advanceTimersByTime(500);
    expect(brokenLabel.textContent).toBe("Elbow touch");
    expect(brokenImage.getAttribute("src")).toBe("./Assets/Female3DCG/Activity/Caress.png");
    expect(button.querySelector("[data-kikilink-activity-mark]")).not.toBeNull();

    button.click();
    expect(globalThis.ChatRoomPublishCustomAction).toHaveBeenCalledWith(
      "KikiLinkCustomActivity",
      false,
      expect.arrayContaining([
        expect.objectContaining({ Text: "Kiki touches Reina's elbow." }),
      ]),
    );
    expect(nativeClick).not.toHaveBeenCalled();
    expect(globalThis.DialogLeave).toHaveBeenCalledOnce();

    service.stop();
    button.click();
    expect(nativeClick).toHaveBeenCalledOnce();
  });

  it("publishes only the finished sentence while carrying validated arousal metadata", () => {
    globalThis.ActivityFemale3DCG = [
      { Name: "Caress", MaxProgress: 10, Prerequisite: [], Target: ["ItemArms"] },
    ];
    globalThis.ActivityFemale3DCGOrdering = ["Caress"];
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
    const custom = globalThis.ActivityFemale3DCG.find((activity) =>
      activity.Name.startsWith("KikiLinkCustom_"),
    );
    if (!custom) throw new Error("Missing registered custom activity");
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
      v: 2,
      source: 999,
      target: 123,
      group: "ItemArms",
      arousal: 6,
      fallbackActivity: "Caress",
      fallbackCount: 2,
    });
    expect(dictionary).toContainEqual({
      ActivityName: "Caress",
      KikiLinkArousalFallback: true,
    });
    expect(dictionary).toContainEqual({
      ActivityCounter: 2,
      KikiLinkArousalFallback: true,
    });
    service.stop();
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
      v: 2,
      source: 999,
      target: 123,
      group: "ItemArms",
      arousal: 8,
      nonce: "nonce-123456",
      fallbackActivity: "Caress",
      fallbackCount: 2,
    };
    const message = {
      Type: "Action",
      Content: "KikiLinkCustomActivity",
      Sender: 999,
      Dictionary: [
        { Tag: "SourceCharacter", MemberNumber: 999, Text: "Kiki" },
        { Tag: "TargetCharacter", MemberNumber: 123, Text: "Reina" },
        { ActivityName: "Caress", KikiLinkArousalFallback: true },
        { ActivityCounter: 2, KikiLinkArousalFallback: true },
        { Tag: "KikiLinkActivityMeta", Text: JSON.stringify(metadata) },
      ],
    };

    service.onRoomMessage(message);
    expect(message.Dictionary).not.toContainEqual(
      expect.objectContaining({ KikiLinkArousalFallback: true }),
    );
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

  it("keeps the native BC fallback intact when the exact target-side effect is unavailable", () => {
    const source = { MemberNumber: 999, Name: "Kiki" };
    globalThis.Player = {
      MemberNumber: 123,
      Name: "Reina",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomCharacter = [source, globalThis.Player];
    const service = new LinkActivitiesService({
      getOwnMemberNumber: () => 123,
    } as unknown as BCAdapter);
    const message = {
      Type: "Action",
      Content: "KikiLinkCustomActivity",
      Sender: 999,
      Dictionary: [
        { Tag: "SourceCharacter", MemberNumber: 999, Text: "Kiki" },
        { Tag: "TargetCharacter", MemberNumber: 123, Text: "Reina" },
        { ActivityName: "Caress", KikiLinkArousalFallback: true },
        { ActivityCounter: 2, KikiLinkArousalFallback: true },
        {
          Tag: "KikiLinkActivityMeta",
          Text: JSON.stringify({
            v: 2,
            source: 999,
            target: 123,
            group: "ItemArms",
            arousal: 8,
            nonce: "nonce-available",
            fallbackActivity: "Caress",
            fallbackCount: 2,
          }),
        },
      ],
    };

    service.onRoomMessage(message);

    expect(message.Dictionary).toContainEqual({
      ActivityName: "Caress",
      KikiLinkArousalFallback: true,
    });
    expect(message.Dictionary).toContainEqual({
      ActivityCounter: 2,
      KikiLinkArousalFallback: true,
    });
  });

  it("still accepts arousal metadata sent by KikiLink 0.20.9", () => {
    const effect = vi.fn();
    globalThis.ActivityEffectFlat = effect;
    const source = { MemberNumber: 999, Name: "Kiki" };
    globalThis.Player = {
      MemberNumber: 123,
      Name: "Reina",
      FriendNames: new Map(),
    };
    globalThis.ChatRoomCharacter = [source, globalThis.Player];
    const service = new LinkActivitiesService({
      getOwnMemberNumber: () => 123,
    } as unknown as BCAdapter);

    service.onRoomMessage({
      Type: "Action",
      Content: "KikiLinkCustomActivity",
      Sender: 999,
      Dictionary: [
        { Tag: "SourceCharacter", MemberNumber: 999, Text: "Kiki" },
        { Tag: "TargetCharacter", MemberNumber: 123, Text: "Reina" },
        {
          Tag: "KikiLinkActivityMeta",
          Text: JSON.stringify({
            v: 1,
            source: 999,
            target: 123,
            group: "ItemArms",
            arousal: 8,
            nonce: "nonce-legacy01",
          }),
        },
      ],
    });

    expect(effect).toHaveBeenCalledOnce();
    expect(effect).toHaveBeenCalledWith(source, globalThis.Player, 8, "ItemArms", 1);
  });

  it("expands quick variables without interpreting names as templates", () => {
    expect(
      expandCustomActivityTemplate("{me} greets {target}; {they} offer {their} hand to {me}.", {
        sourceName: "{target}",
        targetName: "{me}",
        pronouns: { subject: "she", object: "her", possessive: "her" },
      }),
    ).toBe("{target} greets {me}; she offer her hand to {target}.");

    expect(
      expandCustomActivityTemplate("{ ME } greets { TARGET }; { They } wave.", {
        sourceName: "Kiki",
        targetName: "Lua",
        pronouns: { subject: "she", object: "her", possessive: "her" },
      }),
    ).toBe("Kiki greets Lua; she wave.");
  });
});

function settingsWithElbowTouch(): SettingsStore {
  const settings = new SettingsStore(new MemoryKeyValueStorage());
  settings.update((draft) => {
    draft.linkActivities.customActivities.push({
      id: "elbow-touch",
      name: "Elbow touch",
      targetGroup: "ItemArms",
      targetMode: "both",
      template: "{me} touches {target's} elbow.",
      image: "Caress",
      arousal: 0,
    });
  });
  return settings;
}
