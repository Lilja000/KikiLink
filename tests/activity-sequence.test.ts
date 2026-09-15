import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomActivityEffects, CustomActivityStep } from "../src/core/types";
import { activityCapabilities, appearanceItem } from "../src/modules/link-activities/activity-capabilities";
import { blankActivityStep, sanitizeActivityEffects } from "../src/modules/link-activities/activity-effects-definition";
import { sanitizeCustomActivities } from "../src/modules/link-activities/custom-activity-library";
import { ActivitySequence } from "../src/modules/link-activities/activity-sequence";
import { LinkActivitiesService } from "../src/modules/link-activities/link-activities-service";
import type { BCAdapter } from "../src/bc/adapter";
import { SettingsStore, MemoryKeyValueStorage } from "../src/core/settings";

let actor: BCPlayer;
let target: BCPlayer;
let sequence: ActivitySequence;
let refresh: ReturnType<typeof vi.fn>;
let publish: ReturnType<typeof vi.fn>;
let remove: ReturnType<typeof vi.fn>;

function character(member: number): BCPlayer {
  return { ID: member === 101 ? 0 : 1, MemberNumber: member, Name: `Person${member}`, FriendNames: new Map(),
    AssetFamily: "Female3DCG", AllowItem: true, Appearance: [], ActivePoseMapping: {}, ExpressionQueue: [],
    CanInteract: () => true, CanChangeOwnClothes: () => true, CanChangeClothesOn: () => true };
}
function wear(character: BCCharacter, group: BCAssetGroup, expression?: string | null): BCAppearanceItem {
  const item: BCAppearanceItem = { Asset: { Name: `${group.Name}Asset`, Group: group }, Property: {} };
  if (expression !== undefined) item.Property!.Expression = expression;
  character.Appearance!.push(item);
  return item;
}
function effects(steps: Partial<CustomActivityStep>[], extra: Partial<CustomActivityEffects> = {}): CustomActivityEffects {
  return { subject: "actor", restore: true, steps: steps.map(step => ({ ...blankActivityStep(), ...step })), ...extra };
}
function value(character = actor, group = "Eyes"): string | null | undefined { return appearanceItem(character, group)?.Property?.Expression; }
function run(steps: Partial<CustomActivityStep>[], extra: Partial<CustomActivityEffects> = {}): void {
  expect(sequence.start(actor, target, effects(steps, extra))).toBe(true);
}

beforeEach(() => {
  vi.stubGlobal("ServerPlayerAppearanceSync", vi.fn());
  vi.useFakeTimers();
  actor = character(101); target = character(202); sequence = new ActivitySequence();
  const groups: BCAssetGroup[] = [
    { Name: "Eyes", Description: "Eyes", Category: "Appearance", AllowExpression: ["Closed", "Shy", "Angry"] },
    { Name: "Eyes2", Description: "Eyes2", Category: "Appearance", AllowExpression: ["Closed", "Shy", "Angry"] },
    { Name: "Mouth", Description: "Mouth", Category: "Appearance", AllowExpression: ["HalfOpen", "Happy"] },
    { Name: "Hat", Description: "Hat 1", Category: "Appearance", Clothing: true, AllowNone: true },
    { Name: "EchoHat2", Description: "Hat 2 🍔", Category: "Appearance", Clothing: true, AllowNone: true },
    { Name: "BodyUpper", Description: "Body", Category: "Appearance", Clothing: false, AllowNone: false },
    { Name: "ItemArms", Description: "Arms", Category: "Item", Clothing: true, AllowNone: true },
  ];
  vi.stubGlobal("AssetGroup", groups);
  for (const person of [actor, target]) for (const group of groups) wear(person, group, group.Name === "Eyes" ? "Closed" : undefined);
  vi.stubGlobal("Player", actor); vi.stubGlobal("ChatRoomCharacter", [actor, target]);
  vi.stubGlobal("ChatRoomData", { Name: "Test room", Space: "X" });
  vi.stubGlobal("ServerSocket", { connected: true });
  vi.stubGlobal("PoseFemale3DCG", [
    { Name: "ArmsUp", Category: "BodyUpper", AllowMenu: true },
    { Name: "ArmsDown", Category: "BodyUpper", AllowMenu: true },
    { Name: "Kneel", Category: "BodyLower", AllowMenu: true },
    { Name: "HiddenForced", Category: "BodyLower" },
  ]);
  vi.stubGlobal("PoseRecord", {});
  vi.stubGlobal("PoseAvailable", () => true);
  vi.stubGlobal("PoseCanChangeUnaided", () => true);
  vi.stubGlobal("PoseSetActive", (person: BCCharacter, name: string) => {
    sequence.externalChange(person, "pose");
    const category = globalThis.PoseFemale3DCG.find(pose => pose.Name === name)!.Category;
    person.ActivePoseMapping![category] = name;
  });
  vi.stubGlobal("CharacterSetFacialExpression", vi.fn((person: BCCharacter, group: string, expression: string | null) => {
    sequence.externalChange(person, "expression", group);
    const groups = group === "Eyes" ? ["Eyes", "Eyes2"] : [group === "Eyes1" ? "Eyes" : group];
    for (const name of groups) appearanceItem(person, name)!.Property!.Expression = expression;
  }));
  refresh = vi.fn(); publish = vi.fn();
  vi.stubGlobal("CharacterRefresh", refresh); vi.stubGlobal("ChatRoomCharacterUpdate", publish);
  vi.stubGlobal("InventoryAllow", () => true);
  vi.stubGlobal("ServerChatRoomGetAllowItem", () => true);
  vi.stubGlobal("WardrobeGroupAccessible", () => true);
  vi.stubGlobal("ValidationCreateDiffParams", (person: BCCharacter, source: number) => ({ target: person.MemberNumber, source }));
  vi.stubGlobal("ValidationCanRemoveItem", () => true);
  vi.stubGlobal("InventoryBlockedOrLimited", () => false);
  vi.stubGlobal("InventoryItemHasEffect", () => false);
  remove = vi.fn((person: BCCharacter, group: string) => {
    sequence.externalChange(person, "appearance", group);
    person.Appearance = person.Appearance!.filter(item => item.Asset.Group.Name !== group);
  });
  vi.stubGlobal("InventoryRemove", remove);
});
afterEach(() => { sequence.cancel(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("activity sequence lifecycle", () => {
  it("discovers registered BodyFull Hogtied without a menu flag and applies it only when native checks allow it", () => {
    globalThis.PoseFemale3DCG.push({ Name: "Hogtied", Category: "BodyFull" });
    vi.stubGlobal("PoseAvailable", () => false);
    expect(activityCapabilities().poses).toContainEqual({ name: "Hogtied", label: "Hogtied", category: "BodyFull" });
    run([{ durationMs: 100, poses: ["Hogtied"] }]); expect(actor.ActivePoseMapping).toEqual({});
    vi.advanceTimersByTime(100);
    vi.stubGlobal("PoseAvailable", () => true);
    vi.stubGlobal("PoseCanChangeUnaided", () => false);
    run([{ durationMs: 100, poses: ["Hogtied"] }]); expect(actor.ActivePoseMapping).toEqual({});
    vi.advanceTimersByTime(100);
    vi.stubGlobal("PoseCanChangeUnaided", () => true);
    run([{ durationMs: 100, poses: ["Hogtied"] }]); expect(actor.ActivePoseMapping).toEqual({ BodyFull: "Hogtied" });
    vi.advanceTimersByTime(100); expect(actor.ActivePoseMapping).toEqual({});
    globalThis.PoseFemale3DCG = globalThis.PoseFemale3DCG.filter(pose => pose.Name !== "Hogtied");
    expect(activityCapabilities().poses.some(pose => pose.name === "Hogtied")).toBe(false);
  });
  it("curates human labels while keeping native fluid and separate-eye values", () => {
    const extras: BCAssetGroup[] = [
      { Name: "Fluids", Description: "Fluids", Category: "Appearance", AllowExpression: ["TearsLow", "DroolHigh"] },
      ...["Pussy", "EyesOver", "Eyes2Over"].map(Name => ({ Name, Description: Name, Category: "Appearance" as const, AllowExpression: ["A"] })),
      { Name: "Panties", Description: "Panties", Category: "Appearance", Clothing: true, AllowNone: true },
    ];
    globalThis.AssetGroup.push(...extras); for (const group of extras) wear(actor, group);
    const caps = activityCapabilities();
    expect(caps.expressions.map(choice => choice.label)).toEqual(["Eyes", "Mouth", "Tears / Drool"]);
    expect(caps.clothing.map(choice => choice.name)).not.toContain("Panties");
    const eyes = caps.expressions[0]!; expect(eyes.parts!.map(part => part.name)).toEqual(["Eyes", "Eyes2"]);
    expect(caps.expressions.find(choice => choice.name === "Fluids")!.values.map(value => value.value)).toEqual([null, "TearsLow", "DroolHigh"]);
    appearanceItem(actor, "Eyes2")!.Property!.Expression = "Angry";
    run([{ durationMs: 100, expressions: eyes.parts!.map(part => ({ group: part.name, value: "Shy" })) }]);
    expect(value()).toBe("Shy"); expect(value(actor, "Eyes2")).toBe("Shy");
    vi.advanceTimersByTime(100); expect(value()).toBe("Closed"); expect(value(actor, "Eyes2")).toBe("Angry");
  });
  it("applies simultaneous changes after delays, then restores exact original expressions and absence", () => {
    run([
      { delayMs: 100, durationMs: 300, expressions: [{ group: "Eyes", value: "Shy" }, { group: "Mouth", value: "HalfOpen" }] },
      { delayMs: 200, durationMs: 200, expressions: [{ group: "Eyes", value: null }, { group: "Mouth", value: "Happy" }] },
    ]);
    expect(value()).toBe("Closed"); vi.advanceTimersByTime(100);
    expect(value()).toBe("Shy"); expect(value(actor, "Mouth")).toBe("HalfOpen");
    expect(value(actor, "Eyes2")).toBeUndefined();
    expect(globalThis.CharacterSetFacialExpression).toHaveBeenCalledWith(actor, "Eyes1", "Shy", undefined, undefined, true);
    vi.advanceTimersByTime(500); expect(value()).toBeNull();
    vi.advanceTimersByTime(200); expect(value()).toBe("Closed"); expect(value(actor, "Mouth")).toBeUndefined();
    expect(sequence.running).toBe(false); expect(vi.getTimerCount()).toBe(0);
    expect(refresh).toHaveBeenCalledWith(actor, false, true); expect(publish).toHaveBeenCalledWith(actor);
  });
  it("takes snapshots before a delay and yields a field changed manually before its first step", () => {
    run([{ delayMs: 500, durationMs: 200, expressions: [{ group: "Eyes", value: "Shy" }] }]);
    appearanceItem(actor, "Eyes")!.Property!.Expression = "Angry";
    vi.advanceTimersByTime(1000); expect(value()).toBe("Angry");
    expect(globalThis.CharacterSetFacialExpression).not.toHaveBeenCalled();
  });
  it("does not restore or reapply after a native/manual same-value write", () => {
    run([{ durationMs: 200, expressions: [{ group: "Eyes", value: "Shy" }] }, { durationMs: 200, expressions: [{ group: "Eyes", value: "Angry" }] }]);
    globalThis.CharacterSetFacialExpression(actor, "Eyes1", "Shy");
    vi.advanceTimersByTime(1000); expect(value()).toBe("Shy");
  });
  it("cancels replacement timers and captures the restored baseline for the new action", () => {
    run([{ durationMs: 1000, expressions: [{ group: "Eyes", value: "Shy" }] }]);
    run([{ durationMs: 2000, expressions: [{ group: "Eyes", value: "Angry" }] }]);
    vi.advanceTimersByTime(1100); expect(value()).toBe("Angry");
    vi.advanceTimersByTime(1000); expect(value()).toBe("Closed"); expect(vi.getTimerCount()).toBe(0);
  });
  it("retains final expressions when restore is off, but explicit cancellation cleans up", () => {
    run([{ durationMs: 100, expressions: [{ group: "Eyes", value: "Shy" }] }], { restore: false });
    vi.advanceTimersByTime(100); expect(value()).toBe("Shy");
    run([{ durationMs: 500, expressions: [{ group: "Eyes", value: "Angry" }] }], { restore: false });
    sequence.cancel(); expect(value()).toBe("Shy"); expect(vi.getTimerCount()).toBe(0);
  });
  it("restores affected pose categories while retaining unrelated manual pose changes", () => {
    run([{ durationMs: 400, poses: ["ArmsUp"] }]);
    expect(actor.ActivePoseMapping).toEqual({ BodyUpper: "ArmsUp" });
    actor.ActivePoseMapping!.BodyLower = "Kneel";
    vi.advanceTimersByTime(400); expect(actor.ActivePoseMapping).toEqual({ BodyLower: "Kneel" });
  });
  it("restores all categories displaced by a native full-body pose", () => {
    globalThis.PoseFemale3DCG.push({ Name: "FullPose", Category: "BodyFull", AllowMenu: true });
    actor.ActivePoseMapping = { BodyUpper: "ArmsDown", BodyLower: "Kneel" };
    vi.stubGlobal("PoseSetActive", (person: BCCharacter, name: string) => { person.ActivePoseMapping = { BodyFull: name }; });
    run([{ durationMs: 400, poses: ["FullPose"] }]);
    expect(actor.ActivePoseMapping).toEqual({ BodyFull: "FullPose" });
    vi.advanceTimersByTime(400); expect(actor.ActivePoseMapping).toEqual({ BodyUpper: "ArmsDown", BodyLower: "Kneel" });
  });
  it("does not undo a manual pose or bypass a newly applied pose restriction", () => {
    actor.ActivePoseMapping!.BodyUpper = "ArmsDown";
    run([{ durationMs: 400, poses: ["ArmsUp"] }]);
    globalThis.PoseSetActive(actor, "ArmsDown");
    vi.advanceTimersByTime(400); expect(actor.ActivePoseMapping!.BodyUpper).toBe("ArmsDown");
    run([{ durationMs: 400, poses: ["ArmsUp"] }]);
    vi.stubGlobal("PoseCanChangeUnaided", () => false);
    vi.advanceTimersByTime(400); expect(actor.ActivePoseMapping!.BodyUpper).toBe("ArmsUp");
  });
  it("does not touch native expression timers and still applies independent expression groups", () => {
    const queued = { Group: "Eyes", Expression: null, Time: 9999 };
    actor.ExpressionQueue = [queued];
    run([{ durationMs: 100, expressions: [{ group: "Eyes", value: "Shy" }, { group: "Mouth", value: "Happy" }] }]);
    expect(value()).toBe("Closed"); expect(value(actor, "Mouth")).toBe("Happy");
    vi.advanceTimersByTime(100); expect(value(actor, "Mouth")).toBeUndefined(); expect(actor.ExpressionQueue).toEqual([queued]);
  });
  it("restores locally on disconnection without sending or replaying an old update", () => {
    run([{ durationMs: 1000, expressions: [{ group: "Eyes", value: "Shy" }] }]);
    publish.mockClear(); refresh.mockClear(); globalThis.ServerSocket!.connected = false;
    vi.advanceTimersByTime(125); expect(value()).toBe("Closed"); expect(publish).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledWith(actor, false, true);
    globalThis.ServerSocket!.connected = true; vi.advanceTimersByTime(2000);
    expect(publish).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it("cancels when the counterpart leaves and never updates a departed remote character", () => {
    run([{ durationMs: 1000, expressions: [{ group: "Eyes", value: "Shy" }] }], { subject: "target" });
    publish.mockClear(); globalThis.ChatRoomCharacter = [actor];
    vi.advanceTimersByTime(1500); expect(publish).not.toHaveBeenCalled(); expect(sequence.running).toBe(false);
  });
  it("cancels directly on a brief socket disconnect and removes its listener", () => {
    const listeners = new Set<() => void>();
    const connection = { connected: true, on: (_event: string, listener: () => void) => listeners.add(listener),
      off: (_event: string, listener: () => void) => listeners.delete(listener) };
    vi.stubGlobal("ServerSocket", connection);
    run([{ durationMs: 1000, expressions: [{ group: "Eyes", value: "Shy" }] }]);
    expect(listeners.size).toBe(1); publish.mockClear(); connection.connected = false;
    for (const listener of [...listeners]) listener();
    connection.connected = true;
    expect(value()).toBe("Closed"); expect(sequence.running).toBe(false); expect(listeners.size).toBe(0);
    vi.advanceTimersByTime(1500); expect(publish).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it("cleans up a partial native expression write while allowing other step changes", () => {
    const native = globalThis.CharacterSetFacialExpression;
    vi.stubGlobal("CharacterSetFacialExpression", (...args: Parameters<typeof native>) => {
      native(...args);
      if (args[2] === "Shy") throw new Error("Addon hook failed after applying expression");
    });
    run([{ durationMs: 100, expressions: [{ group: "Eyes", value: "Shy" }, { group: "Mouth", value: "Happy" }] }]);
    expect(value(actor, "Mouth")).toBe("Happy"); vi.advanceTimersByTime(100);
    expect(value()).toBe("Closed"); expect(value(actor, "Mouth")).toBeUndefined(); expect(vi.getTimerCount()).toBe(0);
  });
  it("cannot mutate a new account after Player changes", () => {
    run([{ durationMs: 500, expressions: [{ group: "Eyes", value: "Shy" }] }]);
    vi.stubGlobal("Player", target); publish.mockClear(); vi.advanceTimersByTime(1000);
    expect(value(target)).toBe("Closed"); expect(publish).not.toHaveBeenCalled(); expect(sequence.running).toBe(false);
  });
  it("handles a long suspended tab by restoring rather than rapidly playing overdue steps", () => {
    run([{ durationMs: 500, expressions: [{ group: "Eyes", value: "Shy" }] }]);
    const spy = vi.spyOn(performance, "now").mockReturnValue(999999);
    vi.advanceTimersByTime(125); expect(value()).toBe("Closed"); expect(sequence.running).toBe(false); spy.mockRestore();
  });
});

describe("native capabilities and wardrobe restrictions", () => {
  it("discovers only loaded clothing slots and actual expression/pose capabilities", () => {
    expect(activityCapabilities().clothing.map(choice => choice.label)).toEqual(["Hat 1", "Hat 2 🍔"]);
    globalThis.AssetGroup = globalThis.AssetGroup.filter(group => group.Name !== "EchoHat2");
    expect(activityCapabilities().clothing.map(choice => choice.label)).toEqual(["Hat 1"]);
    expect(activityCapabilities().poses.some(pose => pose.name === "HiddenForced")).toBe(false);
    expect(activityCapabilities().expressions[0]?.values.map(choice => choice.value)).toEqual([null, "Closed", "Shy", "Angry"]);
  });
  it("removes multiple slots, skips missing slots and never re-equips removed clothes during restore", () => {
    run([{ durationMs: 100, removeClothing: ["MissingAddonSlot", "Hat", "EchoHat2"], expressions: [{ group: "Eyes", value: "Shy" }] }]);
    expect(remove.mock.calls.map(call => call[1])).toEqual(["Hat", "EchoHat2"]);
    vi.advanceTimersByTime(100); expect(appearanceItem(actor, "Hat")).toBeUndefined(); expect(value()).toBe("Closed");
    expect(sequence.skipped).toBe(1);
  });
  it("refreshes a completed removal when a later addon hook throws", () => {
    remove.mockImplementation((person: BCCharacter, group: string) => {
      person.Appearance = person.Appearance!.filter(item => item.Asset.Group.Name !== group);
      throw new Error("Addon hook failed after removing clothing");
    });
    run([{ durationMs: 100, removeClothing: ["Hat"] }]);
    expect(appearanceItem(actor, "Hat")).toBeUndefined();
    expect(refresh).toHaveBeenCalled(); expect(publish).toHaveBeenCalledWith(actor);
    expect(sequence.skipped).toBe(1);
  });
  it.each(["locked", "native validation", "wardrobe blocked", "limited item", "cannot interact", "cannot change outfit"])("honors %s while allowing unrelated expressions", reason => {
    if (reason === "locked") appearanceItem(actor, "Hat")!.Property!.LockedBy = "Padlock";
    if (reason === "native validation") vi.stubGlobal("ValidationCanRemoveItem", () => false);
    if (reason === "wardrobe blocked") vi.stubGlobal("WardrobeGroupAccessible", () => false);
    if (reason === "limited item") vi.stubGlobal("InventoryBlockedOrLimited", () => true);
    if (reason === "cannot interact") actor.CanInteract = () => false;
    if (reason === "cannot change outfit") actor.CanChangeOwnClothes = () => false;
    run([{ durationMs: 100, removeClothing: ["Hat"], expressions: [{ group: "Eyes", value: "Shy" }] }]);
    expect(remove).not.toHaveBeenCalled(); expect(value()).toBe("Shy");
  });
  it("rejects protected/unknown groups and cascades into unselected or locked items", () => {
    appearanceItem(actor, "Hat")!.Asset.RemoveItemOnRemove = [{ Group: "EchoHat2", Name: "EchoHat2Asset" }];
    run([{ durationMs: 100, removeClothing: ["Hat", "ItemArms", "BodyUpper", "constructor"] }]);
    expect(remove).not.toHaveBeenCalled();
  });
  it("revalidates the live slot at a delayed step and handles addon disappearance", () => {
    run([{ delayMs: 100, durationMs: 100, removeClothing: ["Hat", "EchoHat2"] }]);
    globalThis.AssetGroup = globalThis.AssetGroup.filter(group => group.Name !== "EchoHat2");
    appearanceItem(actor, "Hat")!.Property!.LockedBy = "Lock";
    vi.advanceTimersByTime(500); expect(remove).not.toHaveBeenCalled();
  });
  it("requires native permission and actor identity for target changes", () => {
    target.AllowItem = false;
    expect(sequence.start(actor, target, effects([{ expressions: [{ group: "Eyes", value: "Shy" }] }], { subject: "target" }))).toBe(false);
    target.AllowItem = true; actor.BlackList = [target.MemberNumber];
    expect(sequence.start(actor, target, effects([{ removeClothing: ["Hat"] }], { subject: "target" }))).toBe(false);
    expect(sequence.start(target, actor, effects([{ removeClothing: ["Hat"] }]))).toBe(false);
    expect(remove).not.toHaveBeenCalled(); expect(publish).not.toHaveBeenCalled();
  });
  it("cancels after target permission revocation without a delayed restore", () => {
    run([{ durationMs: 1000, expressions: [{ group: "Eyes", value: "Shy" }] }], { subject: "target" });
    publish.mockClear(); target.AllowItem = false; vi.advanceTimersByTime(1500);
    expect(publish).not.toHaveBeenCalled(); expect(sequence.running).toBe(false);
  });
});

describe("bounded stored sequence definitions", () => {
  it("round-trips optional triggers through the existing activity sanitizer", () => {
    const definition = { id: "touch", name: "Touch hand", template: "{me} touches {target}.", effects: effects([{ removeClothing: ["EchoHat2"] }]) };
    expect(sanitizeCustomActivities([definition])[0]?.effects).toEqual(definition.effects);
  });
  it("bounds time, steps, property counts and rejects unsafe names without losing the activity", () => {
    const value = sanitizeActivityEffects({ steps: Array.from({ length: 50 }, () => ({
      delayMs: Infinity, durationMs: 999999, expressions: [{ group: "__proto__", value: "x" }],
      removeClothing: ["Hat", "Hat", "constructor", "Hat 2 🍔"],
    })) });
    expect(value!.steps.length).toBeLessThanOrEqual(8);
    expect(value!.steps.reduce((sum, step) => sum + step.delayMs + step.durationMs, 0)).toBeLessThanOrEqual(120000);
    expect(value!.steps[0]!.expressions).toEqual([]); expect(value!.steps[0]!.removeClothing).toEqual(["Hat", "Hat 2 🍔"]);
    expect(sanitizeActivityEffects({ steps: [{ expressions: "bad" }] })).toBeUndefined();
  });
});

describe("existing activity integration", () => {
  it("starts effects only on the local invocation, survives unrelated settings, and cancels when disabled", () => {
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update(draft => {
      draft.linkActivities.enabled = true;
      draft.linkActivities.customActivities = [{ id: "test", name: "Touch hand", targetGroup: "ItemArms", targetMode: "other",
        image: "Caress", template: "{me} touches {target}.", arousal: 0,
        effects: effects([{ durationMs: 1000, expressions: [{ group: "Eyes", value: "Shy" }] }]) }];
    });
    vi.stubGlobal("ActivityFemale3DCG", [{ Name: "Caress", MaxProgress: 10, Prerequisite: [], Target: ["ItemArms"] }]);
    vi.stubGlobal("ActivityFemale3DCGOrdering", ["Caress"]);
    const action = vi.fn(); vi.stubGlobal("ChatRoomPublishCustomAction", action); vi.stubGlobal("InventoryGroupIsBlocked", () => false);
    const service = new LinkActivitiesService({ getOwnMemberNumber: () => 101, registerCustomActivityIntegration: () => () => undefined } as unknown as BCAdapter, settings);
    try {
      service.start();
      const activity = globalThis.ActivityFemale3DCG.find(activity => activity.Name.startsWith("KikiLinkCustom_"))!;
      const group = globalThis.AssetGroup.find(group => group.Name === "ItemArms")!;
      expect(service.run(actor, target, group, { Activity: activity, Group: group.Name })).toBe(true);
      expect(value()).toBe("Shy"); expect(service.sequenceRunning).toBe(true);
      expect(JSON.stringify(action.mock.calls[0])).not.toContain("effects");
      settings.update(draft => { draft.linkChat.saveHistory = !draft.linkChat.saveHistory; }); service.syncFromSettings();
      expect(service.sequenceRunning).toBe(true); expect(value()).toBe("Shy");
      settings.update(draft => { draft.linkActivities.enabled = false; }); service.syncFromSettings();
      expect(service.sequenceRunning).toBe(false); expect(value()).toBe("Closed");
      settings.update(draft => { draft.linkActivities.enabled = true; }); service.syncFromSettings();
      service.onRoomMessage({ Type: "Action", Content: "KikiLinkCustomActivity", Sender: 202, Dictionary: [
        { Tag: "SourceCharacter", Text: target.Name, MemberNumber: 202 },
        { Tag: "TargetCharacter", Text: actor.Name, MemberNumber: 101 },
        { Tag: "FocusAssetGroup", AssetGroupName: "ItemArms" },
        { Tag: "KikiLinkActivityMeta", Text: JSON.stringify({ v: 2, source: 202, target: 101, group: "ItemArms", arousal: 0,
          nonce: "untrusted-1234", effects: effects([{ removeClothing: ["Hat"] }]) }) },
      ] });
      expect(service.sequenceRunning).toBe(false); expect(remove).not.toHaveBeenCalled(); expect(value()).toBe("Closed");
    } finally { service.stop(); }
    expect(vi.getTimerCount()).toBe(0);
  });
});
