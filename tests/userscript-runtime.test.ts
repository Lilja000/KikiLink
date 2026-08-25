// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const USER_SCRIPT = readFileSync(
  resolve(process.cwd(), "dist/KikiLink.user.js"),
  "utf8",
);
const TEST_MEMBER_NUMBER = 999_001;
const CUSTOM_ACTIVITY_PREFIX = "KikiLinkCustom_";
const GLOBAL_KEYS = [
  "ActivityAllowedForGroup",
  "ActivityDictionaryText",
  "ActivityFemale3DCG",
  "ActivityFemale3DCGOrdering",
  "ActivityRun",
  "AssetGroup",
  "alert",
  "bcModSdk",
  "CharacterGetCurrent",
  "CharacterNickname",
  "ChatRoomCharacter",
  "ChatRoomCharacterDrawlist",
  "ChatRoomCharacterViewDrawOverlay",
  "ChatRoomCharacterViewLoopCharacters",
  "ChatRoomData",
  "ChatRoomDrawCharacterStatusIcons",
  "ChatRoomHideIconState",
  "ChatRoomMessage",
  "ChatRoomPublishCustomAction",
  "ChatRoomSendEmote",
  "CurrentCharacter",
  "CurrentScreen",
  "DialogActivity",
  "DialogBuildActivities",
  "DialogMenuMapping",
  "DialogMenuMode",
  "DrawImageEx",
  "ElementButton",
  "FriendListBeepLog",
  "GameVersion",
  "KikiLink",
  "MainCanvas",
  "Player",
  "PreferenceGetActivityFactor",
  "ServerAccountBeep",
  "ServerAccountQueryResult",
  "ServerIsLoggedIn",
  "ServerPlayerExtensionSettingsSync",
  "ServerPlayerIsInChatRoom",
  "ServerSend",
  "ServerSendBeepMessage",
  "ServerSocket",
] as const;

afterEach(async () => {
  const api = (window as unknown as { KikiLink?: { destroy(): Promise<void> } }).KikiLink;
  if (api) await api.destroy();
  for (const key of GLOBAL_KEYS) {
    Reflect.deleteProperty(globalThis, key);
    Reflect.deleteProperty(window, key);
  }
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.replaceChildren();
  localStorage.clear();
});

describe("published userscript runtime", () => {
  it("keeps Blossom and native custom activities working when ModSDK registration is blocked", async () => {
    const registerMod = vi.fn(() => {
      throw new Error("Duplicate addon intentionally blocks ModSDK registration");
    });
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    setGlobal("alert", vi.fn());
    setGlobal(
      "bcModSdk",
      Object.freeze({
        version: "1.2.0",
        apiVersion: 1,
        registerMod,
        getModsInfo: () => [],
        getPatchingInfo: () => new Map(),
        errorReporterHooks: Object.seal({
          apiEndpointEnter: null,
          hookEnter: null,
          hookChainExit: null,
        }),
      }),
    );

    const player = {
      MemberNumber: TEST_MEMBER_NUMBER,
      Name: "KikiAccount",
      Nickname: "Kiki",
      ExtensionSettings: {},
      FriendNames: new Map<number, string>(),
      FriendList: [],
    };
    const target = {
      MemberNumber: 123_456,
      Name: "ReinaAccount",
      Nickname: "Reina",
      FocusGroup: {
        Name: "ItemArmsMirror",
        Description: "Arms mirror",
        Category: "Item" as const,
        MirrorActivitiesFrom: "ItemArms",
      },
    };
    const groups = [
      {
        Name: "ItemArms",
        Description: "Arms",
        Category: "Item" as const,
        Zone: [[0, 0, 100, 100]] as const,
      },
      target.FocusGroup,
    ];
    const vanillaActivity = {
      Name: "Caress",
      ActivityID: 1,
      MaxProgress: 10,
      MaxProgressSelf: 10,
      Prerequisite: [],
      Target: ["ItemArms"],
      TargetSelf: ["ItemArms"],
    };

    setGlobal("Player", player);
    setGlobal("ChatRoomCharacter", [player, target]);
    setGlobal("ChatRoomCharacterDrawlist", [player, target]);
    setGlobal("ChatRoomCharacterViewLoopCharacters", (callback: Function) => {
      if (callback(0, 100, 0, 500, 1)) return;
      callback(1, 600, 0, 500, 1);
    });
    setGlobal("ChatRoomCharacterViewDrawOverlay", vi.fn());
    setGlobal("ChatRoomDrawCharacterStatusIcons", vi.fn());
    setGlobal("ChatRoomHideIconState", 0);
    setGlobal("ChatRoomData", {
      Name: "KikiLink Runtime Test",
      Space: "MainHall",
      Visibility: ["All"],
    });
    setGlobal("CurrentScreen", "ChatRoom");
    setGlobal("ServerPlayerIsInChatRoom", () => true);
    setGlobal("ServerIsLoggedIn", () => true);
    setGlobal("ServerPlayerExtensionSettingsSync", vi.fn());
    setGlobal("ServerSendBeepMessage", vi.fn());
    setGlobal("ServerSend", vi.fn());
    setGlobal("ServerSocket", null);
    setGlobal("ServerAccountBeep", vi.fn());
    setGlobal("ServerAccountQueryResult", vi.fn());
    setGlobal("ChatRoomMessage", vi.fn());
    setGlobal("ChatRoomSendEmote", vi.fn());
    setGlobal("FriendListBeepLog", []);

    const canvas = document.createElement("canvas");
    canvas.id = "MainCanvas";
    canvas.width = 2_000;
    canvas.height = 1_000;
    Object.defineProperty(canvas, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 2_000,
        bottom: 1_000,
        width: 2_000,
        height: 1_000,
        toJSON: () => ({}),
      }),
    });
    document.body.append(canvas);
    setGlobal("MainCanvas", {
      canvas,
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
    });
    setGlobal("DrawImageEx", vi.fn(() => true));

    setGlobal("GameVersion", "R122");
    setGlobal("AssetGroup", groups);
    setGlobal("ActivityFemale3DCG", [vanillaActivity]);
    setGlobal("ActivityFemale3DCGOrdering", ["Caress"]);
    setGlobal("CurrentCharacter", target);
    setGlobal("CharacterGetCurrent", () => target);
    setGlobal("CharacterNickname", (character: { Nickname?: string; Name: string }) =>
      character.Nickname || character.Name,
    );
    setGlobal("DialogMenuMode", "activities");
    setGlobal("DialogActivity", []);
    setGlobal("ActivityAllowedForGroup", (_character: unknown, groupName: string) => {
      const canonicalGroup = groupName === "ItemArmsMirror" ? "ItemArms" : groupName;
      return getGlobal<Array<typeof vanillaActivity>>("ActivityFemale3DCG")
        .filter((activity) => activity.Target.includes(canonicalGroup))
        .map((activity) => ({ Activity: activity, Group: groupName }));
    });
    setGlobal("ActivityDictionaryText", (keyword: string) => keyword);
    setGlobal("PreferenceGetActivityFactor", () => 2);
    setGlobal("ActivityRun", vi.fn());
    setGlobal("ChatRoomPublishCustomAction", vi.fn());

    const grid = document.createElement("div");
    grid.id = "activity-grid";
    document.body.append(grid);
    setGlobal("ElementButton", {
      CreateForActivity(
        id: string | null,
        itemActivity: { Activity: { Name: string } },
        _character: unknown,
        _onClick: unknown,
        options?: { image?: string },
      ) {
        const button = document.createElement("button");
        button.id = id ?? "activity";
        button.dataset.activity = itemActivity.Activity.Name;
        if (options?.image) button.dataset.image = options.image;
        grid.append(button);
        return button;
      },
    });
    setGlobal("DialogMenuMapping", {
      activities: {
        Reload() {
          grid.replaceChildren();
          getGlobal<Array<{ Activity: { Name: string }; Group: string }>>("DialogActivity")
            .forEach((activity, index) => {
              getGlobal<{
                CreateForActivity(
                  id: string,
                  activity: { Activity: { Name: string }; Group: string },
                  character: typeof target,
                  onClick: () => void,
                  options: Record<string, never>,
                ): HTMLButtonElement;
              }>("ElementButton").CreateForActivity(
                `activity-${index}`,
                activity,
                target,
                () => undefined,
                {},
              );
            });
          return Promise.resolve();
        },
      },
    });
    setGlobal("DialogBuildActivities", (character: typeof target, reload = true) => {
      const activities = getGlobal<
        (character: typeof target, groupName: string) => Array<{
          Activity: { Name: string };
          Group: string;
        }>
      >("ActivityAllowedForGroup")(character, character.FocusGroup.Name);
      setGlobal("DialogActivity", activities);
      if (reload) {
        void getGlobal<{ activities: { Reload(): Promise<void> } }>("DialogMenuMapping")
          .activities.Reload();
      }
    });

    localStorage.setItem(
      `kikilink:account:${TEST_MEMBER_NUMBER}:kikilink:settings:v1`,
      JSON.stringify({
        schemaVersion: 16,
        linkActivities: {
          enabled: true,
          customActivities: [
            {
              id: "runtime-elbow-touch",
              name: "Runtime elbow touch",
              targetGroup: "ItemArms",
              targetMode: "both",
              template: "{me} touches {target's} elbow.",
              image: "Caress",
              arousal: 0,
            },
          ],
        },
      }),
    );

    expect(getGlobal<{ registerMod: unknown }>("bcModSdk").registerMod).toBe(registerMod);
    expect(window.eval("typeof ServerSendBeepMessage")).toBe("function");
    window.eval(USER_SCRIPT);
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    getGlobal<(character: typeof target, reload?: boolean) => void>("DialogBuildActivities")(
      target,
      true,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 550));

    const api = getGlobal<{ getVersion(): string }>("KikiLink");
    const version = document.querySelector<HTMLElement>("#kikilink-version");
    const blossom = document.querySelector<HTMLElement>(".kl-room-blossom");
    const registered = getGlobal<Array<{ Name: string }>>("ActivityFemale3DCG");
    const dialog = getGlobal<Array<{ Activity: { Name: string } }>>("DialogActivity");

    expect(
      document
        .querySelector<HTMLElement>("#kikilink-root")
        ?.shadowRoot?.querySelector<HTMLElement>(".kl-connection-text")?.textContent,
    ).toBe("Connected");
    expect(getGlobal<{ registerMod: unknown }>("bcModSdk").registerMod).toBe(registerMod);
    expect(registerMod).toHaveBeenCalledTimes(1);
    expect(api.getVersion()).toBe("0.20.5");
    expect(version?.textContent).toBe("0.20.5");
    expect(version?.style.opacity).toBe("0.18");
    expect(version?.style.left).toBe("3px");
    expect(blossom?.hidden).toBe(false);
    expect(blossom?.style.display).toBe("block");
    expect(blossom?.style.left).toBe("535px");
    expect(blossom?.style.top).toBe("5px");
    expect(registered.some((activity) => activity.Name.startsWith(CUSTOM_ACTIVITY_PREFIX))).toBe(
      true,
    );
    expect(dialog.some((activity) => activity.Activity.Name.startsWith(CUSTOM_ACTIVITY_PREFIX))).toBe(
      true,
    );
    expect(grid.querySelector(`[data-activity^="${CUSTOM_ACTIVITY_PREFIX}"]`)).not.toBeNull();

    await getGlobal<{ destroy(): Promise<void> }>("KikiLink").destroy();
    expect(document.querySelector("#kikilink-version")).toBeNull();
    expect(document.querySelector(".kl-room-blossom")).toBeNull();
  });
});

function setGlobal(name: string, value: unknown): void {
  for (const context of new Set<object>([globalThis, window])) {
    Object.defineProperty(context, name, {
      configurable: true,
      writable: true,
      value,
    });
  }
}

function getGlobal<T>(name: string): T {
  return (window as unknown as Record<string, unknown>)[name] as T;
}
