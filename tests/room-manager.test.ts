// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RoomPresetData } from "../src/core/types";
import type { BCRoomAdminSnapshot } from "../src/bc/adapter";
import { RoomManager } from "../src/modules/link-chat/room-manager";

function snapshot(): BCRoomAdminSnapshot { return { roomName: "Garden", isAdmin: true, players: [{ memberNumber: 202, memberName: "Snowy", isFriend: true, admin: false, whitelisted: false }],
  customization: { imageUrl: "", musicUrl: "", musicSync: false, sizeMode: 1 }, settings: {
    name: "Garden", description: "Old", background: "Garden", game: "", language: "EN", space: "X", limit: 10,
    admins: [101], whitelist: [], blacklist: [], access: ["All"], visibility: ["All"], blockCategory: [],
    custom: { imageUrl: "", imageFilter: "", musicUrl: "", sizeMode: 1, musicSync: false }, mapData: { Type: "Hybrid", Tiles: "exact", Fog: true } } }; }
afterEach(() => { document.body.replaceChildren(); vi.unstubAllGlobals(); });
const control = (root: HTMLElement, label: string) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`[aria-label="${label}"]`)!;
function change(root: HTMLElement, label: string, value: string, event = "change"): void { const input = control(root, label); input.value = value; input.dispatchEvent(new Event(event)); }
function click(root: HTMLElement, text: string): void { [...root.querySelectorAll("button")].find(button => button.textContent === text)!.click(); }

describe("Room Manager drafts and permissions", () => {
  it("loads saved map settings, allows editing / member selection, and applies one reviewed draft", async () => {
    const apply = vi.fn(async (_room: RoomPresetData) => {}), view = new RoomManager(apply, () => 101);
    document.body.append(view.root); document.body.append(view.root); view.update(snapshot());
    const saved = snapshot().settings; saved.name = "Saved map"; saved.mapData!.Effects = "effects";
    view.load(saved, "Map preset"); expect(apply).not.toHaveBeenCalled();
    expect(control(view.root, "Room name").value).toBe("Saved map");
    change(view.root, "Room name", "Evening", "input"); change(view.root, "Description", "New description", "input");
    change(view.root, "Add present member to Whitelist", "202");
    change(view.root, "Blacklist member number", "303, 404");
    const blacklist = control(view.root, "Blacklist member number"); blacklist.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    change(view.root, "Access", '["Admin","Whitelist"]'); change(view.root, "Visibility", "[]");
    view.update(snapshot(), true); expect(control(view.root, "Room name").value).toBe("Evening");
    click(view.root, "Apply room settings"); await vi.waitFor(() => expect(view.root.textContent).toContain("Room settings applied."));
    expect(apply).toHaveBeenCalledOnce(); expect(apply.mock.calls[0]![0]).toMatchObject({ name: "Evening", whitelist: [202], blacklist: [303, 404],
      visibility: [], access: ["Admin", "Whitelist"], mapData: { Type: "Hybrid", Tiles: "exact", Effects: "effects", Fog: true } });
    expect(view.root.querySelector<HTMLButtonElement>('[aria-label="Remove 101 from Administrators"]')!.disabled).toBe(true);
  });
  it("keeps map data in legacy presets and reflects the lock toggle with native access roles", async () => {
    const apply = vi.fn(async (_room: RoomPresetData) => {}), view = new RoomManager(apply, () => 101); document.body.append(view.root); view.update(snapshot());
    const saved = snapshot().settings; delete saved.mapData; view.load(saved, "Legacy");
    (control(view.root, "Room locked") as HTMLInputElement).click();
    expect(control(view.root, "Access").value).toBe('["Admin"]');
    click(view.root, "Apply room settings"); await Promise.resolve();
    expect(apply.mock.calls[0]![0]).toMatchObject({ access: ["Admin"], mapData: { Type: "Hybrid", Tiles: "exact" } });
  });
  it("shows paginated previews, filters backgrounds and clears a custom image when selecting a native one", async () => {
    vi.stubGlobal("BackgroundsList", Array.from({ length: 25 }, (_, i) => ({ Name: `Room${i}`, Tag: [i % 2 ? "Outdoor" : "Indoor"] })));
    const apply = vi.fn(async (_room: RoomPresetData) => {}), view = new RoomManager(apply, () => 101); const state = snapshot(); state.settings.custom.imageUrl = "https://example.test/old.webp";
    document.body.append(view.root); view.update(state); expect(view.root.querySelectorAll(".kl-room-background-grid img")).toHaveLength(12);
    change(view.root, "Find background", "Room24", "input"); expect(view.root.querySelectorAll(".kl-room-background-grid img")).toHaveLength(1);
    click(view.root, "Room24"); click(view.root, "Apply room settings"); await Promise.resolve();
    expect(apply.mock.calls[0]![0]).toMatchObject({ background: "Room24", custom: { imageUrl: "", imageFilter: "" } });
  });
  it("shows a native rejection without clearing the draft, and disables editing after admin rights are lost", async () => {
    const apply = vi.fn(async () => { throw new Error("BC rejected this update"); }), view = new RoomManager(apply, () => 101);
    document.body.append(view.root); view.update(snapshot()); change(view.root, "Room name", "Keep draft", "input"); click(view.root, "Apply room settings");
    await vi.waitFor(() => expect(view.root.textContent).toContain("BC rejected this update"));
    expect(control(view.root, "Room name").value).toBe("Keep draft");
    view.update({ ...snapshot(), isAdmin: false }); expect(view.root.querySelector("fieldset")!.disabled).toBe(true);
    view.update(undefined); expect(view.root.childElementCount).toBe(0);
  });
});
