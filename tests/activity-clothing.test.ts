import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sanitizeClothingTemplate, type ClothingTemplate } from "../src/core/appearance-template";
import { activityCapabilities } from "../src/modules/link-activities/activity-capabilities";
import { transferActivityClothing, wearActivityClothing } from "../src/modules/link-activities/activity-clothing";
import { blankActivityStep, sanitizeActivityEffects } from "../src/modules/link-activities/activity-effects-definition";
import { ActivitySequence } from "../src/modules/link-activities/activity-sequence";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { CustomActivityTransferDirection } from "../src/core/types";

let actor: BCPlayer, target: BCPlayer, assets: BCAsset[];
let load: ReturnType<typeof vi.fn>;
const bundle = (item: BCAppearanceItem): ClothingTemplate => ({ Group: item.Asset.Group.Name, Name: item.Asset.Name,
  ...(item.Color ? { Color: typeof item.Color === "string" ? item.Color : [...item.Color] } : {}),
  ...(item.Property ? { Property: structuredClone(item.Property) } : {}),
  ...(item.Craft ? { Craft: structuredClone(item.Craft) } : {}), ...(item.Difficulty === undefined ? {} : { Difficulty: item.Difficulty }) });
function character(member: number): BCPlayer { return { MemberNumber: member, Name: `Member ${member}`, FriendNames: new Map(),
  AssetFamily: "Female3DCG", Appearance: [], AllowItem: true, CanInteract: () => true, CanChangeOwnClothes: () => true, CanChangeClothesOn: () => true }; }
const template = (): ClothingTemplate => ({ Group: "EchoHat2", Name: "Scarf", Color: ["#123456", "Default"], Difficulty: 0,
  Property: { TypeRecord: { a: 1, b: 2 }, OverrideHeight: { Height: 5, HeightRatioProportion: .2 }, OverridePriority: { Scarf: 7 },
    Alpha: .8, CustomBlindBackground: "", Text: "Kiki", Move: true, Rotation: 3 }, Craft: { Name: "Favourite", Description: "kept", Color: "#123456" } });
beforeEach(() => {
  vi.stubGlobal("ServerPlayerAppearanceSync", vi.fn());
  actor = character(101); target = character(202);
  const groups: BCAssetGroup[] = [{ Name: "EchoHat2", Description: "Hat 2 🍔", Category: "Appearance", Clothing: true, AllowNone: true },
    { Name: "Hat", Description: "Hat", Category: "Appearance", Clothing: true, AllowNone: true }];
  assets = groups.flatMap(Group => ["Scarf", "Cap"].map(Name => ({ Name, Group })));
  vi.stubGlobal("AssetGroup", groups); vi.stubGlobal("Player", actor);
  vi.stubGlobal("ServerChatRoomGetAllowItem", () => true); vi.stubGlobal("WardrobeGroupAccessible", () => true);
  vi.stubGlobal("InventoryAllow", () => true); vi.stubGlobal("InventoryBlockedOrLimited", () => false);
  vi.stubGlobal("InventoryItemHasEffect", () => false); vi.stubGlobal("InventoryRemove", vi.fn());
  vi.stubGlobal("ValidationCreateDiffParams", (C: BCCharacter, source: number) => ({ C, source }));
  vi.stubGlobal("ValidationCanRemoveItem", vi.fn(() => true)); vi.stubGlobal("ValidationCanAddItem", () => true);
  vi.stubGlobal("ValidationResolveCyclicBlocks", (appearance: BCAppearanceItem[]) => ({ appearance, valid: true }));
  vi.stubGlobal("ValidationResolveAppearanceDiff", vi.fn((_group, _before, item) => ({ item, valid: true })));
  vi.stubGlobal("ServerBundledItemFromAppearanceItem", bundle);
  const restore = (_family: string, item: ClothingTemplate): BCAppearanceItem | null => {
    const Asset = assets.find(asset => asset.Name === item.Name && asset.Group.Name === item.Group);
    if (!Asset) return null;
    const { Group: _group, Name: _name, ...data } = structuredClone(item); return { Asset, ...data };
  };
  vi.stubGlobal("ServerBundledItemToAppearanceItem", restore);
  load = vi.fn((C: BCCharacter, family: string, appearance: ClothingTemplate[]) => { C.Appearance = appearance.map(item => restore(family, item)!); return false; });
  vi.stubGlobal("ServerAppearanceLoadFromBundle", load);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("live item transfer", () => {
  function startTransfer(direction: CustomActivityTransferDirection = "self-to-target", slots = ["EchoHat2"]): ActivitySequence {
    vi.useFakeTimers();
    vi.stubGlobal("ChatRoomData", { Name: "Room", Space: "X" }); vi.stubGlobal("ChatRoomCharacter", [actor, target]);
    vi.stubGlobal("ServerSocket", { connected: true });
    const sequence = new ActivitySequence();
    expect(sequence.start(actor, target, { subject: "actor", restore: false, steps: [{ ...blankActivityStep(), durationMs: 100,
      transferClothing: { direction, slots } }] })).toBe(true);
    return sequence;
  }
  it.each(["self-to-target", "target-to-self", "swap"] as const)("prepares complete %s state, updates each room character once, and separately persists self", direction => {
    actor.Appearance = [ServerBundledItemToAppearanceItem("Female3DCG", template())!, { Asset: assets[3]!, Color: "#aabbcc" }];
    target.Appearance = [{ Asset: assets[1]! }, { Asset: assets[2]!, Property: { Rotation: 3 } }];
    const original = [actor, target].map(C => C.Appearance!.map(bundle));
    const expected = direction === "swap" ? [original[1], original[0]] : direction === "self-to-target"
      ? [[], original[0]] : [original[1], []];
    const calls: string[] = [], room = new Map<number, ClothingTemplate[]>();
    let database = actor.Appearance.map(bundle);
    vi.stubGlobal("CharacterRefresh", vi.fn((C: BCCharacter, push: boolean) => {
      // Both final appearances must exist even at the first refresh.
      expect([actor, target].map(C => C.Appearance!.map(bundle))).toEqual(expected);
      calls.push(`refresh:${C.MemberNumber}:${push}`);
      if (push) database = actor.Appearance!.map(bundle);
    }));
    vi.stubGlobal("ChatRoomCharacterUpdate", vi.fn((C: BCCharacter) => { calls.push(`room:${C.MemberNumber}`); room.set(C.MemberNumber, C.Appearance!.map(bundle)); }));
    vi.stubGlobal("ServerPlayerAppearanceSync", vi.fn(() => { calls.push("database"); database = actor.Appearance!.map(bundle); }));
    const sequence = startTransfer(direction, ["EchoHat2", "Hat"]);
    try {
      expect(sequence.skipped).toBe(0);
      expect(ChatRoomCharacterUpdate).toHaveBeenCalledTimes(2); expect(ServerPlayerAppearanceSync).toHaveBeenCalledTimes(1);
      expect(calls.slice(0, 2).every(call => call.endsWith(":false"))).toBe(true);
      const first = direction === "target-to-self" ? 101 : 202;
      expect(calls.slice(2)).toEqual([`room:${first}`, `room:${first === 202 ? 101 : 202}`, "database"]);
      const final = [actor, target].map(C => C.Appearance!.map(bundle));
      // Replay the fixture's persisted/database + room records, as on a later native sync.
      actor.Appearance = database.map(item => ServerBundledItemToAppearanceItem("Female3DCG", item)!);
      target.Appearance = room.get(202)!.map(item => ServerBundledItemToAppearanceItem("Female3DCG", item)!);
      expect([actor, target].map(C => C.Appearance!.map(bundle))).toEqual(final);
      vi.advanceTimersByTime(10_000); expect(ChatRoomCharacterUpdate).toHaveBeenCalledTimes(2);
    } finally { sequence.cancel(); }
  });
  it.each(["self-to-target", "swap"].flatMap(direction => ["refresh throws", "refresh alters item", "permission revoked"].map(failure => ({ direction: direction as CustomActivityTransferDirection, failure }))))("rolls both local characters back before publication for $direction when $failure", ({ direction, failure }) => {
    actor.Appearance = [ServerBundledItemToAppearanceItem("Female3DCG", template())!]; target.Appearance = [{ Asset: assets[1]! }];
    const before = [actor, target].map(C => C.Appearance!.map(bundle));
    let refused = false;
    vi.stubGlobal("CharacterRefresh", vi.fn((C: BCCharacter) => {
      if (C !== target || refused) return;
      refused = true;
      if (failure === "refresh throws") throw new Error("Addon refuses refresh");
      if (failure === "refresh alters item") C.Appearance![0]!.Color = "Default";
      if (failure === "permission revoked") target.AllowItem = false;
    }));
    vi.stubGlobal("ChatRoomCharacterUpdate", vi.fn());
    const sequence = startTransfer(direction);
    expect(sequence.skipped).toBeGreaterThan(0); expect(sequence.running).toBe(false);
    expect([actor, target].map(C => C.Appearance!.map(bundle))).toEqual(before);
    expect(ChatRoomCharacterUpdate).not.toHaveBeenCalled(); expect(ServerPlayerAppearanceSync).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10_000); expect(ChatRoomCharacterUpdate).not.toHaveBeenCalled();
  });
  it("restores the source and compensates a synchronous target send failure without a stale retry", () => {
    actor.Appearance = [ServerBundledItemToAppearanceItem("Female3DCG", template())!]; target.Appearance = [{ Asset: assets[1]! }];
    const before = [actor, target].map(C => C.Appearance!.map(bundle)), remote = new Map<number, ClothingTemplate[]>();
    let refused = false;
    vi.stubGlobal("CharacterRefresh", vi.fn());
    vi.stubGlobal("ChatRoomCharacterUpdate", vi.fn((C: BCCharacter) => {
      remote.set(C.MemberNumber, C.Appearance!.map(bundle));
      if (!refused) { refused = true; throw new Error("Failure after native handoff"); }
    }));
    const sequence = startTransfer();
    expect(sequence.running).toBe(false); expect([actor, target].map(C => C.Appearance!.map(bundle))).toEqual(before);
    expect(remote.get(202)).toEqual(before[1]); expect(ServerPlayerAppearanceSync).not.toHaveBeenCalled();
    expect(ChatRoomCharacterUpdate).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(5 * 60_000); expect(ChatRoomCharacterUpdate).toHaveBeenCalledTimes(2);
  });
  it("does not start appearance mutation when the own persistence API is missing", () => {
    vi.stubGlobal("ServerPlayerAppearanceSync", undefined); vi.stubGlobal("CharacterRefresh", vi.fn()); vi.stubGlobal("ChatRoomCharacterUpdate", vi.fn());
    vi.stubGlobal("ChatRoomData", { Name: "Room" }); vi.stubGlobal("ChatRoomCharacter", [actor, target]); vi.stubGlobal("ServerSocket", { connected: true });
    actor.Appearance = [ServerBundledItemToAppearanceItem("Female3DCG", template())!]; const before = actor.Appearance.map(bundle);
    const sequence = new ActivitySequence();
    expect(sequence.start(actor, target, { subject: "actor", restore: false, steps: [{ ...blankActivityStep(), transferClothing: { direction: "self-to-target", slots: ["EchoHat2"] } }] })).toBe(false);
    expect(actor.Appearance.map(bundle)).toEqual(before); expect(ChatRoomCharacterUpdate).not.toHaveBeenCalled();
  });
  it.each(["self-to-target", "target-to-self"] as const)("transfers the currently worn full bundle in %s direction", direction => {
    const from = direction === "self-to-target" ? actor : target, to = direction === "self-to-target" ? target : actor;
    from.Appearance = [ServerBundledItemToAppearanceItem("Female3DCG", template())!];
    to.Appearance = [{ Asset: assets[1]! }];
    expect(transferActivityClothing(actor, target, "EchoHat2", direction)).toBe(true);
    expect(from.Appearance).toEqual([]); expect(bundle(to.Appearance[0]!)).toEqual(template());
    const different = { ...template(), Name: "Cap", Color: "#999999", Property: { Rotation: 7 } };
    from.Appearance = [ServerBundledItemToAppearanceItem("Female3DCG", different)!];
    expect(transferActivityClothing(actor, target, "EchoHat2", direction)).toBe(true);
    expect(bundle(to.Appearance[0]!)).toEqual(different);
  });
  it.each(["source permission", "destination permission", "source lock", "destination lock", "missing slot", "incompatible asset", "native diff"])("refuses %s before mutating either character", reason => {
    actor.Appearance = [ServerBundledItemToAppearanceItem("Female3DCG", template())!]; target.Appearance = [{ Asset: assets[1]! }];
    if (reason === "source permission") actor.CanChangeOwnClothes = () => false;
    if (reason === "destination permission") target.AllowItem = false;
    if (reason === "source lock") actor.Appearance[0]!.Property!.LockedBy = "Padlock";
    if (reason === "destination lock") target.Appearance[0]!.Property = { LockedBy: "Padlock" };
    if (reason === "missing slot") vi.stubGlobal("AssetGroup", []);
    if (reason === "incompatible asset") vi.stubGlobal("ServerBundledItemToAppearanceItem", () => null);
    if (reason === "native diff") vi.stubGlobal("ValidationResolveAppearanceDiff", () => ({ item: null, valid: false }));
    const before = [actor, target].map(C => C.Appearance!.map(bundle));
    expect(transferActivityClothing(actor, target, "EchoHat2", "self-to-target")).toBe(false);
    expect(load).not.toHaveBeenCalled(); expect([actor, target].map(C => C.Appearance!.map(bundle))).toEqual(before);
  });
  it.each(["first rejection", "second rejection", "second exception", "changed properties", "collateral slot"])("restores both characters after %s without any broadcast", failure => {
    actor.Appearance = [ServerBundledItemToAppearanceItem("Female3DCG", template())!, { Asset: assets[3]! }];
    target.Appearance = [{ Asset: assets[1]! }, { Asset: assets[3]! }];
    const before = [actor, target].map(C => C.Appearance!.map(bundle));
    let call = 0;
    vi.stubGlobal("ValidationResolveCyclicBlocks", (appearance: BCAppearanceItem[]) => {
      call++;
      if (call === 1 && failure === "first rejection") return { appearance, valid: false };
      if (call === 2 && failure === "second rejection") return { appearance, valid: false };
      if (call === 2 && failure === "second exception") throw new Error("Addon hook refused");
      if (call === 2 && failure === "changed properties") appearance.at(-1)!.Color = "Default";
      if (call === 2 && failure === "collateral slot") appearance.shift();
      return { appearance, valid: true };
    });
    vi.stubGlobal("ChatRoomCharacterUpdate", vi.fn());
    expect(transferActivityClothing(actor, target, "EchoHat2", "self-to-target")).toBe(false);
    expect([actor, target].map(C => C.Appearance!.map(bundle))).toEqual(before);
    expect(ChatRoomCharacterUpdate).not.toHaveBeenCalled();
  });
  it.each(["self-to-target", "swap"] as const)("rolls the destination back if an addon rejects committing the source appearance during %s", direction => {
    actor.Appearance = [ServerBundledItemToAppearanceItem("Female3DCG", template())!]; target.Appearance = [{ Asset: assets[1]! }];
    const original = actor.Appearance, before = target.Appearance.map(bundle);
    let first = true, current = original;
    Object.defineProperty(actor, "Appearance", { configurable: true, get: () => current, set: value => {
      if (first) { first = false; throw new Error("Native state changed"); } current = value;
    } });
    expect(transferActivityClothing(actor, target, "EchoHat2", direction)).toBe(false);
    expect(target.Appearance!.map(bundle)).toEqual(before); expect(actor.Appearance).toBe(original);
  });
  it("stores only direction and slots, rejects conflicting modes, and reads after the delay", () => {
    const effects = sanitizeActivityEffects({ subject: "actor", restore: true, steps: [{ ...blankActivityStep(), delayMs: 500,
      transferClothing: { direction: "target-to-self", slots: ["Missing", "EchoHat2", "EchoHat2"], item: template() },
      wearClothing: [template()], removeClothing: ["EchoHat2"] }] })!;
    expect(effects.steps[0]!.transferClothing).toEqual({ direction: "target-to-self", slots: ["Missing", "EchoHat2"] });
    expect(effects.steps[0]!.wearClothing).toBeUndefined(); expect(effects.steps[0]!.removeClothing).toEqual([]);
    vi.useFakeTimers(); vi.stubGlobal("ChatRoomData", { Name: "Room", Space: "X" }); vi.stubGlobal("ChatRoomCharacter", [actor, target]);
    vi.stubGlobal("ServerSocket", { connected: true }); vi.stubGlobal("CharacterRefresh", vi.fn()); vi.stubGlobal("ChatRoomCharacterUpdate", vi.fn());
    const sequence = new ActivitySequence();
    try {
      sequence.start(actor, target, effects);
      target.Appearance = [ServerBundledItemToAppearanceItem("Female3DCG", template())!];
      vi.advanceTimersByTime(501);
      expect(sequence.skipped).toBe(1); expect(bundle(actor.Appearance![0]!)).toEqual(template()); expect(target.Appearance).toEqual([]);
      expect(ChatRoomCharacterUpdate).toHaveBeenCalledWith(actor); expect(ChatRoomCharacterUpdate).toHaveBeenCalledWith(target);
    } finally { sequence.cancel(); }
  });

  it.each([[true, true], [true, false], [false, true], [false, false]])("swaps a current native addon slot (self item: %s, target item: %s) without publishing intermediate states", (selfHasItem, targetHasItem) => {
    const own = template(), other: ClothingTemplate = { ...template(), Name: "Cap", Color: ["#fedcba", "#654321"],
      Property: { TypeRecord: { a: 3 }, Rotation: 9, Alpha: .4, OverridePriority: { Cap: 2 }, Move: false, Custom: { nested: [1, 2] } } };
    const ownUnrelated = { Asset: assets[2]!, Color: "#eeeeee" }, otherUnrelated = { Asset: assets[3]!, Color: "#111111" };
    const oldOwn = ServerBundledItemToAppearanceItem("Female3DCG", own)!, oldOther = ServerBundledItemToAppearanceItem("Female3DCG", other)!;
    actor.Appearance = [ownUnrelated, ...(selfHasItem ? [oldOwn] : [])];
    target.Appearance = [otherUnrelated, ...(targetHasItem ? [oldOther] : [])];
    vi.stubGlobal("CharacterRefresh", vi.fn()); vi.stubGlobal("ChatRoomCharacterUpdate", vi.fn());
    expect(transferActivityClothing(actor, target, "EchoHat2", "swap")).toBe(selfHasItem || targetHasItem);
    expect(actor.Appearance.map(bundle)).toEqual([bundle(ownUnrelated), ...(targetHasItem ? [other] : [])]);
    expect(target.Appearance.map(bundle)).toEqual([bundle(otherUnrelated), ...(selfHasItem ? [own] : [])]);
    expect(actor.Appearance[0]).toBe(ownUnrelated); expect(target.Appearance[0]).toBe(otherUnrelated);
    if (selfHasItem) {
      expect(target.Appearance[1]!.Property).not.toBe(oldOwn.Property);
      target.Appearance[1]!.Property!.Rotation = 20; expect(oldOwn.Property!.Rotation).toBe(3);
    }
    expect(load).not.toHaveBeenCalled(); expect(InventoryRemove).not.toHaveBeenCalled();
    expect(CharacterRefresh).not.toHaveBeenCalled(); expect(ChatRoomCharacterUpdate).not.toHaveBeenCalled();
    expect(ServerPlayerAppearanceSync).not.toHaveBeenCalled();
  });

  it.each(["own lock", "other lock", "native lock effect", "cannot interact", "own clothes", "other clothes", "room access", "blocked incoming", "own add permission", "other add permission", "missing own slot", "missing other slot", "incompatible item", "conversion changed state"])("rejects the whole Swap before any appearance write for %s", failure => {
    actor.Appearance = [ServerBundledItemToAppearanceItem("Female3DCG", template())!];
    target.Appearance = [{ Asset: assets[1]!, Color: "#fedcba", Property: { Rotation: 9 } }];
    if (failure === "own lock") actor.Appearance[0]!.Property!.LockedBy = "Padlock";
    if (failure === "other lock") target.Appearance[0]!.Property!.LockedBy = "Padlock";
    if (failure === "native lock effect") vi.stubGlobal("InventoryItemHasEffect", (item: BCAppearanceItem) => item.Asset.Name === "Cap");
    if (failure === "cannot interact") actor.CanInteract = () => false;
    if (failure === "own clothes") actor.CanChangeOwnClothes = () => false;
    if (failure === "other clothes") actor.CanChangeClothesOn = C => C !== target;
    if (failure === "room access") vi.stubGlobal("ServerChatRoomGetAllowItem", () => false);
    if (failure === "blocked incoming") vi.stubGlobal("InventoryBlockedOrLimited", (C: BCCharacter, item: BCAppearanceItem) => C === actor && item.Asset.Name === "Cap");
    if (failure.endsWith("add permission")) vi.stubGlobal("ValidationCanAddItem", (_item: BCAppearanceItem, params: { C: BCCharacter }) => params.C !== (failure === "own add permission" ? actor : target));
    if (failure.startsWith("missing")) {
      actor.AssetFamily = "OwnFamily"; target.AssetFamily = "OtherFamily";
      vi.stubGlobal("AssetGroup", [{ ...assets[0]!.Group, Family: failure === "missing own slot" ? "OtherFamily" : "OwnFamily" }]);
    }
    const convert = ServerBundledItemToAppearanceItem;
    if (failure === "incompatible item") vi.stubGlobal("ServerBundledItemToAppearanceItem", (family: string, item: ClothingTemplate) => item.Name === "Scarf" ? null : convert(family, item));
    if (failure === "conversion changed state") vi.stubGlobal("ServerBundledItemToAppearanceItem", (family: string, item: ClothingTemplate) => {
      const converted = convert(family, item)!; converted.Color = "Default"; return converted;
    });
    const original = [actor.Appearance, target.Appearance], before = original.map(items => items.map(bundle));
    expect(transferActivityClothing(actor, target, "EchoHat2", "swap")).toBe(false);
    expect([actor, target].map(C => C.Appearance!.map(bundle))).toEqual(before);
    expect(actor.Appearance).toBe(original[0]); expect(target.Appearance).toBe(original[1]);
    expect(load).not.toHaveBeenCalled(); expect(ServerPlayerAppearanceSync).not.toHaveBeenCalled();
  });

  it.each([1, 2].flatMap(side => ["diff rejects", "diff throws", "cyclic rejects", "cyclic throws", "cyclic alters other slot"].map(failure => ({ side, failure }))))("keeps both Swap appearances intact when side $side $failure", ({ side, failure }) => {
    actor.Appearance = [ServerBundledItemToAppearanceItem("Female3DCG", template())!, { Asset: assets[2]! }];
    target.Appearance = [{ Asset: assets[1]! }, { Asset: assets[3]! }];
    const before = [actor, target].map(C => C.Appearance!.map(bundle));
    let calls = 0;
    if (failure.startsWith("diff")) vi.stubGlobal("ValidationResolveAppearanceDiff", (_slot: string, _old: BCAppearanceItem, item: BCAppearanceItem) => {
      if (++calls === side) {
        if (failure === "diff throws") throw new Error("Refused replacement");
        return { item, valid: false };
      }
      return { item, valid: true };
    });
    else vi.stubGlobal("ValidationResolveCyclicBlocks", (appearance: BCAppearanceItem[]) => {
      if (++calls === side) {
        if (failure === "cyclic throws") throw new Error("Addon validator failed");
        if (failure === "cyclic rejects") return { appearance, valid: false };
        appearance.shift();
      }
      return { appearance, valid: true };
    });
    expect(transferActivityClothing(actor, target, "EchoHat2", "swap")).toBe(false);
    expect([actor, target].map(C => C.Appearance!.map(bundle))).toEqual(before);
  });

  it.each(["both empty", "equal bundles", "same character"])("does no native refresh or network update for Swap with %s", scenario => {
    if (scenario !== "both empty") {
      actor.Appearance = [ServerBundledItemToAppearanceItem("Female3DCG", template())!];
      target.Appearance = [ServerBundledItemToAppearanceItem("Female3DCG", template())!];
    }
    if (scenario === "same character") target = actor;
    const before = [actor.Appearance, target.Appearance];
    vi.stubGlobal("CharacterRefresh", vi.fn()); vi.stubGlobal("ChatRoomCharacterUpdate", vi.fn());
    const sequence = startTransfer("swap");
    try {
      vi.advanceTimersByTime(10_000);
      expect(actor.Appearance).toBe(before[0]); expect(target.Appearance).toBe(before[1]);
      expect(CharacterRefresh).not.toHaveBeenCalled(); expect(ChatRoomCharacterUpdate).not.toHaveBeenCalled();
      expect(ServerPlayerAppearanceSync).not.toHaveBeenCalled();
    } finally { sequence.cancel(); }
  });

  it.each([true, false])("persists item/empty Swap on both sides without reappearing clothes (self initially full: %s)", own => {
    (own ? actor : target).Appearance = [ServerBundledItemToAppearanceItem("Female3DCG", template())!];
    vi.stubGlobal("CharacterRefresh", vi.fn());
    const room = new Map<number, ClothingTemplate[]>(); let database: ClothingTemplate[] = [];
    vi.stubGlobal("ChatRoomCharacterUpdate", vi.fn((C: BCCharacter) => room.set(C.MemberNumber, C.Appearance!.map(bundle))));
    vi.stubGlobal("ServerPlayerAppearanceSync", vi.fn(() => { database = actor.Appearance!.map(bundle); }));
    const sequence = startTransfer("swap");
    try {
      expect(ChatRoomCharacterUpdate).toHaveBeenCalledTimes(2); expect(ServerPlayerAppearanceSync).toHaveBeenCalledTimes(1);
      actor.Appearance = database.map(item => ServerBundledItemToAppearanceItem("Female3DCG", item)!);
      target.Appearance = room.get(target.MemberNumber)!.map(item => ServerBundledItemToAppearanceItem("Female3DCG", item)!);
      expect((own ? actor : target).Appearance).toEqual([]);
      expect((own ? target : actor).Appearance!.map(bundle)).toEqual([template()]);
      vi.advanceTimersByTime(10_000); expect(ChatRoomCharacterUpdate).toHaveBeenCalledTimes(2);
    } finally { sequence.cancel(); }
  });

  it("restores both Swap states after a synchronous second room-update error with bounded compensation", () => {
    actor.Appearance = [ServerBundledItemToAppearanceItem("Female3DCG", template())!]; target.Appearance = [{ Asset: assets[1]! }];
    const before = [actor, target].map(C => C.Appearance!.map(bundle)), room = new Map<number, ClothingTemplate[]>();
    vi.stubGlobal("CharacterRefresh", vi.fn()); let calls = 0;
    vi.stubGlobal("ChatRoomCharacterUpdate", vi.fn((C: BCCharacter) => {
      room.set(C.MemberNumber, C.Appearance!.map(bundle)); if (++calls === 2) throw new Error("Second native handoff failed");
    }));
    const sequence = startTransfer("swap");
    expect(sequence.running).toBe(false); expect([actor, target].map(C => C.Appearance!.map(bundle))).toEqual(before);
    expect([actor, target].map(C => room.get(C.MemberNumber))).toEqual(before);
    expect(ChatRoomCharacterUpdate).toHaveBeenCalledTimes(4); expect(ServerPlayerAppearanceSync).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10_000); expect(ChatRoomCharacterUpdate).toHaveBeenCalledTimes(4);
  });

  it("saves only Swap direction/slots and reads both current items after reload and delay", () => {
    const store = new MemoryKeyValueStorage(), settings = new SettingsStore(store);
    const effects = sanitizeActivityEffects({ steps: [{ ...blankActivityStep(), delayMs: 500,
      transferClothing: { direction: "swap", slots: ["EchoHat2", "EchoHat2"], item: template() }, wearClothing: [template()], removeClothing: ["EchoHat2"] }] })!;
    settings.update(draft => { draft.linkActivities.customActivities = [{ id: "swap", name: "Swap hats", targetGroup: "ItemHead", targetMode: "other",
      template: "{me} swaps hats with {target}.", image: "", arousal: 0, effects }]; });
    const reloaded = new SettingsStore(store).get().linkActivities.customActivities[0]!.effects!;
    expect(reloaded.steps[0]!.transferClothing).toEqual({ direction: "swap", slots: ["EchoHat2"] });
    expect(reloaded.steps[0]!.wearClothing).toBeUndefined(); expect(reloaded.steps[0]!.removeClothing).toEqual([]);
    vi.useFakeTimers(); vi.stubGlobal("ChatRoomData", { Name: "Room", Space: "X" }); vi.stubGlobal("ChatRoomCharacter", [actor, target]);
    vi.stubGlobal("ServerSocket", { connected: true }); vi.stubGlobal("CharacterRefresh", vi.fn()); vi.stubGlobal("ChatRoomCharacterUpdate", vi.fn());
    const sequence = new ActivitySequence();
    try {
      expect(sequence.start(actor, target, reloaded)).toBe(true);
      const newOwn = { ...template(), Color: "#ee55cc" }, newOther = { ...template(), Name: "Cap", Property: { Rotation: 11 } };
      actor.Appearance = [ServerBundledItemToAppearanceItem("Female3DCG", newOwn)!]; target.Appearance = [ServerBundledItemToAppearanceItem("Female3DCG", newOther)!];
      vi.advanceTimersByTime(501);
      expect(actor.Appearance.map(bundle)).toEqual([newOther]); expect(target.Appearance.map(bundle)).toEqual([newOwn]);
      expect(ChatRoomCharacterUpdate).toHaveBeenCalledTimes(2);
    } finally { sequence.cancel(); }
  });
});

describe("native clothing templates", () => {
  it.each(["reject", "throw", "change other slot", "change saved state"])("leaves live clothing untouched when complete Wear validation would %s", failure => {
    target.Appearance = [{ Asset: assets[1]! }, { Asset: assets[3]!, Color: "#abcdef" }];
    const before = target.Appearance.map(bundle);
    const refs = [...target.Appearance];
    vi.stubGlobal("ValidationResolveCyclicBlocks", (appearance: BCAppearanceItem[]) => {
      if (failure === "throw") throw new Error("Native validator refused");
      if (failure === "change other slot") appearance.shift();
      if (failure === "change saved state") appearance.at(-1)!.Color = "Default";
      return { appearance, valid: failure !== "reject" };
    });
    expect(wearActivityClothing(actor, target, template())).toBe(false);
    expect(target.Appearance.map(bundle)).toEqual(before);
    expect(target.Appearance[0]).toBe(refs[0]); expect(target.Appearance[1]).toBe(refs[1]);
    expect(load).not.toHaveBeenCalled();
  });
  it.each(["self", "target"])("keeps complete native appearance parameters and validates %s using the actor's real identity", subject => {
    const C = subject === "self" ? actor : target;
    C.Appearance = [{ Asset: assets[1]! }, { Asset: assets[3]! }];
    expect(wearActivityClothing(actor, C, template())).toBe(true);
    expect(bundle(C.Appearance[1]!)).toEqual(template());
    expect(C.Appearance[0]!.Asset.Group.Name).toBe("Hat");
    expect(load).not.toHaveBeenCalled();
    expect(ValidationCanRemoveItem).toHaveBeenCalledWith(expect.any(Object), { C, source: 101 }, true);
    expect(ValidationResolveAppearanceDiff).toHaveBeenCalledWith("EchoHat2", expect.any(Object), expect.any(Object), { C, source: 101 }, false);
  });
  it("captures a detached item once and keeps it through settings save and reload", () => {
    const item = ServerBundledItemToAppearanceItem("Female3DCG", template())!; actor.Appearance = [item];
    const captured = activityCapabilities().clothing.find(slot => slot.name === "EchoHat2")!;
    expect(captured.current).toBe("Scarf"); expect(captured.template).toEqual(template());
    item.Property!.Rotation = 99;
    const storage = new MemoryKeyValueStorage(), store = new SettingsStore(storage);
    store.update(draft => { draft.linkActivities.customActivities = [{ id: "wear", name: "Wear scarf", targetGroup: "ItemHead", targetMode: "both",
      template: "{me} helps {target}.", image: "", arousal: 0, effects: { subject: "target", restore: false,
        steps: [{ ...blankActivityStep(), wearClothing: [captured.template!] }] } }]; });
    expect(new SettingsStore(storage).get().linkActivities.customActivities[0]!.effects!.steps[0]!.wearClothing).toEqual([template()]);
  });
  it.each(["permission", "locked", "blocked", "validation", "missing slot", "missing item"])("skips %s without calling the native loader", reason => {
    target.Appearance = [{ Asset: assets[1]! }];
    const item = template();
    if (reason === "permission") target.AllowItem = false;
    if (reason === "locked") target.Appearance[0]!.Property = { LockedBy: "Padlock" };
    if (reason === "blocked") vi.stubGlobal("InventoryBlockedOrLimited", () => true);
    if (reason === "validation") vi.stubGlobal("ValidationResolveAppearanceDiff", () => ({ valid: false, item: null }));
    if (reason === "missing slot") vi.stubGlobal("AssetGroup", []);
    if (reason === "missing item") item.Name = "NoLongerInstalled";
    expect(wearActivityClothing(actor, target, item)).toBe(false); expect(load).not.toHaveBeenCalled();
  });
  it("continues with available slots and cancels a delayed wear when the target leaves", () => {
    vi.useFakeTimers(); vi.stubGlobal("ChatRoomData", { Name: "Room", Space: "X" }); vi.stubGlobal("ChatRoomCharacter", [actor, target]);
    vi.stubGlobal("ServerSocket", { connected: true }); vi.stubGlobal("CharacterRefresh", vi.fn()); vi.stubGlobal("ChatRoomCharacterUpdate", vi.fn());
    const sequence = new ActivitySequence();
    try {
      expect(sequence.start(actor, target, { subject: "target", restore: true, steps: [{ ...blankActivityStep(),
        wearClothing: [{ ...template(), Group: "Missing addon slot" }, template()] }] })).toBe(true);
      expect(sequence.skipped).toBe(1); expect(bundle(target.Appearance![0]!)).toEqual(template());
      sequence.cancel(); load.mockClear(); target.Appearance = [];
      sequence.start(actor, target, { subject: "target", restore: true, steps: [{ ...blankActivityStep(), delayMs: 1000, wearClothing: [template()] }] });
      vi.stubGlobal("ChatRoomCharacter", [actor]); vi.advanceTimersByTime(2000);
      expect(load).not.toHaveBeenCalled(); expect(sequence.running).toBe(false);
    } finally { sequence.cancel(); }
  });
  it("bounds templates and timers, excludes executable/prototype data and resolves conflicting slot modes", () => {
    expect(sanitizeClothingTemplate({ ...template(), Property: JSON.parse('{"__proto__":{"bad":true}}') })).toBeUndefined();
    expect(sanitizeClothingTemplate({ ...template(), Property: { huge: "x".repeat(20000) } })).toBeUndefined();
    const value = sanitizeActivityEffects({ steps: [{ delayMs: 999999, durationMs: 999999, removeClothing: ["EchoHat2"], wearClothing: [template(), template()] }] })!;
    expect(value.steps[0]).toMatchObject({ delayMs: 15000, durationMs: 15000, removeClothing: [], wearClothing: [template()] });
  });
});
