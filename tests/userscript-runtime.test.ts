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
  "DrawImageCanvas",
  "DrawImageResize",
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
  it("joins Echo and AFC in one ModSDK status-icon router in the built userscript", async () => {
    const calls: string[] = [];
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    setGlobal("alert", vi.fn());

    const sharedSdk = createSharedModSdk();
    setGlobal("bcModSdk", sharedSdk.global);
    const echo = sharedSdk.registerMod({ name: "动作拓展" });
    const afc = sharedSdk.registerMod({ name: "AbundantiaFlorumChromatica" });

    setGlobal("ChatRoomDrawCharacterStatusIcons", () => {
      calls.push("native");
    });
    echo.hookFunction("ChatRoomDrawCharacterStatusIcons", 10, (args, next) => {
      calls.push("echo");
      return next(args);
    });
    afc.hookFunction("ChatRoomDrawCharacterStatusIcons", 0, (args, next) => {
      calls.push("afc");
      return next(args);
    });
    const sharedRouter = getGlobal<Function>("ChatRoomDrawCharacterStatusIcons");

    const player = {
      MemberNumber: TEST_MEMBER_NUMBER,
      Name: "KikiAccount",
      Nickname: "Kiki",
      ExtensionSettings: {},
      FriendNames: new Map<number, string>(),
      FriendList: [],
    };
    setGlobal("Player", player);
    setGlobal("ChatRoomCharacter", [player]);
    setGlobal("ChatRoomCharacterDrawlist", [player]);
    setGlobal("ChatRoomHideIconState", 0);
    setGlobal("ChatRoomData", { Name: "Shared Chain", Visibility: ["All"] });
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
    setGlobal("FriendListBeepLog", []);
    setGlobal("GameVersion", "R131");

    const canvas = document.createElement("canvas");
    canvas.id = "MainCanvas";
    canvas.width = 2_000;
    canvas.height = 1_000;
    document.body.append(canvas);
    setGlobal("MainCanvas", {
      canvas,
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
    });
    setGlobal("DrawImageResize", vi.fn(() => true));

    window.eval(USER_SCRIPT);
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    const statusIcons = getGlobal<
      (character: typeof player, x: number, y: number, zoom: number) => void
    >("ChatRoomDrawCharacterStatusIcons");
    expect(statusIcons).toBe(sharedRouter);
    expect(() => statusIcons(player, 100, 0, 1)).not.toThrow();
    expect(calls).toEqual(["echo", "afc", "native"]);
    expect(getGlobal<ReturnType<typeof vi.fn>>("DrawImageResize")).toHaveBeenCalledWith(
      expect.stringContaining("data:image/svg+xml"),
      490,
      45,
      35,
      35,
    );
    expect(sharedSdk.requests).toContainEqual({
      mod: "KikiLink",
      name: "ChatRoomDrawCharacterStatusIcons",
      priority: 10,
    });

    await getGlobal<{ destroy(): Promise<void> }>("KikiLink").destroy();
    echo.unload();
    afc.unload();
  });

  it("keeps native integrations working without cross-realm objects when ModSDK is blocked", async () => {
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
    setGlobal("DrawImageResize", vi.fn(() => true));

    setGlobal("GameVersion", "R131");
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

    expect(USER_SCRIPT).toContain("// @sandbox      raw");
    expect(USER_SCRIPT).toContain("// @grant        none");
    expect(USER_SCRIPT).not.toContain("unsafeWindow");
    expect(USER_SCRIPT).not.toContain("installBCPageContextBridge");
    expect(window.eval("typeof ServerSendBeepMessage")).toBe("function");
    window.eval(USER_SCRIPT);
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    getGlobal<(character: typeof player, x: number, y: number, zoom: number) => void>(
      "ChatRoomDrawCharacterStatusIcons",
    )(player, 100, 0, 1);
    getGlobal<(character: typeof target, reload?: boolean) => void>("DialogBuildActivities")(
      target,
      true,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 550));

    const api = getGlobal<{
      getVersion(): string;
      openChat(memberNumber: number, memberName?: string): void;
    }>("KikiLink");
    getGlobal<(event: string, data: unknown) => void>("ServerSend")("AccountBeep", {
      MemberNumber: target.MemberNumber,
      BeepType: "",
      IsSecret: true,
      Message: "Runtime message sent through LianChat",
    });
    getGlobal<(message: { Sender: number; Type: string; Content: string }) => void>(
      "ChatRoomMessage",
    )({
      Sender: target.MemberNumber,
      Type: "Hidden",
      Content: `KIKILINK/1 ${JSON.stringify({
        t: "ps",
        s: "online",
        u: Date.now(),
        v: "0.20.9",
      })}`,
    });
    getGlobal<(character: typeof target, x: number, y: number, zoom: number) => void>(
      "ChatRoomDrawCharacterStatusIcons",
    )(target, 600, 0, 1);
    api.openChat(target.MemberNumber, "Reina");
    await vi.waitFor(() => {
      expect(
        document
          .querySelector<HTMLElement>("#kikilink-root")
          ?.shadowRoot?.querySelector(".kl-messages")?.textContent,
      ).toContain("Runtime message sent through LianChat");
    });
    const version = document.querySelector<HTMLElement>("#kikilink-version");
    const blossom = document.querySelector<HTMLElement>(".kl-room-blossom");
    const activityMark = grid.querySelector<HTMLElement>("[data-kikilink-activity-mark]");
    const registered = getGlobal<Array<{ Name: string }>>("ActivityFemale3DCG");
    const dialog = getGlobal<Array<{ Activity: { Name: string } }>>("DialogActivity");

    expect(
      document
        .querySelector<HTMLElement>("#kikilink-root")
        ?.shadowRoot?.querySelector<HTMLElement>(".kl-connection-text")?.textContent,
    ).toBe("Connected");
    expect(getGlobal<{ registerMod: unknown }>("bcModSdk").registerMod).toBe(registerMod);
    expect(registerMod).toHaveBeenCalledTimes(1);
    expect(api.getVersion()).toBe("0.20.9");
    expect(version?.textContent).toBe("0.20.9");
    expect(version?.style.opacity).toBe("0.18");
    expect(version?.style.left).toBe("3px");
    expect(blossom?.hidden).toBe(true);
    expect(blossom?.style.display).toBe("none");
    expect(getGlobal<ReturnType<typeof vi.fn>>("DrawImageResize")).toHaveBeenCalledWith(
      expect.stringContaining("data:image/svg+xml"),
      490,
      45,
      35,
      35,
    );
    expect(getGlobal<ReturnType<typeof vi.fn>>("DrawImageResize")).toHaveBeenCalledWith(
      expect.stringContaining("data:image/svg+xml"),
      990,
      45,
      35,
      35,
    );
    expect(registered.some((activity) => activity.Name.startsWith(CUSTOM_ACTIVITY_PREFIX))).toBe(
      true,
    );
    expect(dialog.some((activity) => activity.Activity.Name.startsWith(CUSTOM_ACTIVITY_PREFIX))).toBe(
      true,
    );
    expect(grid.querySelector(`[data-activity^="${CUSTOM_ACTIVITY_PREFIX}"]`)).not.toBeNull();
    expect(activityMark?.style.width).toBe("12px");
    expect(activityMark?.style.height).toBe("12px");
    expect(activityMark?.style.left).toBe("0px");
    expect(activityMark?.style.top).toBe("0px");

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

function createSharedModSdk(): {
  global: Readonly<Record<string, unknown>>;
  requests: Array<{ mod: string; name: string; priority: number }>;
  registerMod(info: { name: string }): {
    hookFunction(
      name: string,
      priority: number,
      run: (args: any[], next: (args: any[]) => any) => any,
    ): () => void;
    unload(): void;
  };
} {
  type Hook = {
    mod: string;
    priority: number;
    run: (args: any[], next: (args: any[]) => any) => any;
  };
  type HookState = {
    original: (...args: any[]) => any;
    router: (...args: any[]) => any;
    hooks: Hook[];
  };
  const states = new Map<string, HookState>();
  const requests: Array<{ mod: string; name: string; priority: number }> = [];

  const registerMod = (info: { name: string }) => {
    const ownedHooks = new Set<Hook>();
    return {
      hookFunction(
        name: string,
        priority: number,
        run: (args: any[], next: (args: any[]) => any) => any,
      ): () => void {
        let state = states.get(name);
        if (!state) {
          const original = getGlobal<(...args: any[]) => any>(name);
          if (typeof original !== "function") throw new Error(`${name} is unavailable`);
          const hooks: Hook[] = [];
          const nextAt = (index: number, args: any[], thisArg: unknown): any => {
            const ordered = [...hooks].sort((left, right) => right.priority - left.priority);
            const hook = ordered[index];
            if (!hook) return original.apply(thisArg, args);
            return hook.run(args, (nextArgs) => nextAt(index + 1, nextArgs, thisArg));
          };
          const router = function (this: unknown, ...args: any[]): any {
            return nextAt(0, args, this);
          };
          state = { original, router, hooks };
          states.set(name, state);
          setGlobal(name, router);
        }
        const hook = { mod: info.name, priority, run };
        state.hooks.push(hook);
        ownedHooks.add(hook);
        requests.push({ mod: info.name, name, priority });
        return () => {
          const index = state!.hooks.indexOf(hook);
          if (index >= 0) state!.hooks.splice(index, 1);
          ownedHooks.delete(hook);
        };
      },
      unload(): void {
        for (const hook of ownedHooks) {
          for (const state of states.values()) {
            const index = state.hooks.indexOf(hook);
            if (index >= 0) state.hooks.splice(index, 1);
          }
        }
        ownedHooks.clear();
      },
    };
  };

  return {
    global: Object.freeze({
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
    requests,
    registerMod,
  };
}
