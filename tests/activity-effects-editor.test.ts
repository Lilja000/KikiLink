// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import type { CustomActivityDefinition } from "../src/core/types";
import { activityEffectsEditor } from "../src/modules/link-activities/activity-effects-editor";
import { createBlankCustomActivity, sanitizeCustomActivities } from "../src/modules/link-activities/custom-activity-library";
import type { ActivityCapabilities } from "../src/modules/link-activities/activity-capabilities";

afterEach(() => document.body.replaceChildren());
function open(draft: CustomActivityDefinition, caps: ActivityCapabilities): HTMLElement {
  const root = activityEffectsEditor(draft, () => caps) as HTMLDetailsElement;
  document.body.append(root); root.open = true; root.dispatchEvent(new Event("toggle")); return root;
}
function click(root: HTMLElement, label: string): void {
  const button = [...root.querySelectorAll("button")].find(button => button.textContent === label || button.getAttribute("aria-label") === label);
  if (!button) throw new Error(`No ${label} button`); button.click();
}
function change(root: HTMLElement, label: string, value: string): void {
  const input = root.querySelector<HTMLInputElement | HTMLSelectElement>(`[aria-label="${label}"]`);
  if (!input) throw new Error(`No ${label} control`); input.value = value; input.dispatchEvent(new Event("change"));
}
function capabilities(): ActivityCapabilities {
  return {
    expressions: [{ name: "Eyes", label: "Eyes", values: [{ value: null, label: "Neutral" }, { value: "Shy", label: "Shy" }] }],
    poses: [{ name: "ArmsUp", label: "Arms up", category: "BodyUpper" }],
    clothing: [{ name: "Hat", label: "Hat 1" }, { name: "EchoHat2", label: "Hat 2 🍔" }],
  };
}

describe("progressive sequence editor", () => {
  it("starts compact and builds a stored native-capability sequence without scripts", () => {
    const draft = createBlankCustomActivity();
    const root = activityEffectsEditor(draft, capabilities) as HTMLDetailsElement;
    document.body.append(root); expect(root.open).toBe(false); expect(root.querySelectorAll("select")).toHaveLength(0);
    root.open = true; root.dispatchEvent(new Event("toggle")); click(root, "Add step"); click(root, "Eyes");
    change(root, "Step 1 Eyes", "Shy"); change(root, "Step 1 delay", "0.2"); change(root, "Step 1 duration", "3");
    click(root, "Arms up"); change(root, "Apply changes to", "target");
    click(root, "Hat 1"); click(root, "Hat 2 🍔");
    const saved = sanitizeCustomActivities([{ ...draft, name: "Touch hand" }])[0]!;
    expect(saved.effects).toEqual({ subject: "target", restore: true, steps: [{ delayMs: 200, durationMs: 3000,
      expressions: [{ group: "Eyes", value: "Shy" }], poses: ["ArmsUp"], removeClothing: ["Hat", "EchoHat2"] }] });
    expect(root.textContent).toContain("3.2 s total"); expect(root.querySelectorAll("textarea")).toHaveLength(0);
  });
  it("moves complete steps and preserves values across reorder, remove and restore toggle", () => {
    const draft = createBlankCustomActivity(); const root = open(draft, capabilities());
    click(root, "Add step"); change(root, "Step 1 duration", "2"); click(root, "Add step"); change(root, "Step 2 duration", "5");
    click(root, "Move down"); expect(draft.effects!.steps.map(step => step.durationMs)).toEqual([5000, 2000]);
    const restore = root.querySelector<HTMLInputElement>('[aria-label="Restore previous state"]')!;
    restore.click(); expect(draft.effects!.restore).toBe(false);
    expect(root.querySelector(".kl-sequence-timeline")!.textContent).not.toContain("Restore");
    click(root, "Remove step"); expect(draft.effects!.steps.map(step => step.durationMs)).toEqual([2000]);
  });
  it("refreshes loaded addon slots and keeps an unavailable stored selection reviewable", () => {
    const caps = capabilities(); const draft = createBlankCustomActivity(); const root = open(draft, caps);
    click(root, "Add step");
    click(root, "Hat 2 🍔");
    caps.clothing = caps.clothing.filter(choice => choice.name !== "EchoHat2"); click(root, "Refresh available options");
    expect([...root.querySelectorAll(".kl-sequence-clothing button[data-slot]")].map(label => label.getAttribute("aria-label"))).toEqual(["Hat 1"]);
    expect(draft.effects!.steps[0]!.removeClothing).toEqual(["EchoHat2"]);
    click(root, "Echo Hat2 · unavailable · remove"); expect(draft.effects!.steps[0]!.removeClothing).toEqual([]);
  });
  it("caps step creation and exposes the total time limit without disabling ordinary activity editing", () => {
    const root = open(createBlankCustomActivity(), capabilities());
    for (let i = 0; i < 10; i++) click(root, "Add step");
    expect(root.querySelectorAll(".kl-sequence-step")).toHaveLength(8);
    for (let i = 1; i <= 8; i++) { change(root, `Step ${i} delay`, "15"); change(root, `Step ${i} duration`, "15"); }
    expect(root.textContent).toContain("Maximum 120 s");
  });
  it("toggles tiles and exposes one Eyes control without independent-eye UI", () => {
    const caps = capabilities();
    caps.expressions[0]!.parts = [
      { name: "Eyes", label: "Left eye", values: caps.expressions[0]!.values },
      { name: "Eyes2", label: "Right eye", values: caps.expressions[0]!.values },
    ];
    const draft = createBlankCustomActivity(), root = open(draft, caps); click(root, "Add step");
    expect([...root.querySelectorAll(".kl-activity-choice")].map(tile => tile.textContent)).not.toContain("Left eye");
    click(root, "Eyes"); change(root, "Step 1 Eyes", "Shy");
    expect(draft.effects!.steps[0]!.expressions).toEqual([{ group: "Eyes", value: "Shy" }, { group: "Eyes2", value: "Shy" }]);
    expect(root.textContent).not.toMatch(/each eye|Left eye|Right eye/);
    expect(root.querySelector('[aria-label="Step 1 Left eye"]')).toBeNull();
    click(root, "Eyes"); expect(draft.effects!.steps[0]!.expressions).toEqual([]);
    click(root, "Hat 1"); click(root, "Hat 1"); expect(draft.effects!.steps[0]!.removeClothing).toEqual([]);
    expect(root.querySelector('[data-slot="Hat"]')!.getAttribute("aria-pressed")).toBe("false");
  });
  it("stores native Hogtied, deselects it and avoids conflicting full and partial body poses", () => {
    const caps = capabilities(); caps.poses.push({ name: "Hogtied", label: "Hogtied", category: "BodyFull" });
    const draft = createBlankCustomActivity(), root = open(draft, caps); click(root, "Add step");
    click(root, "Arms up"); click(root, "Hogtied"); expect(draft.effects!.steps[0]!.poses).toEqual(["Hogtied"]);
    expect(root.querySelector('[data-pose="ArmsUp"]')!.getAttribute("aria-pressed")).toBe("false");
    click(root, "Hogtied"); expect(draft.effects!.steps[0]!.poses).toEqual([]);
  });
  it("captures Wear once, refreshes current-item labels and switches cleanly to Remove", () => {
    const caps = capabilities(); caps.clothing[0]!.current = "Scarf";
    caps.clothing[0]!.template = { Group: "Hat", Name: "Scarf", Color: ["#123456"], Property: { TypeRecord: { a: 2 } } };
    const draft = createBlankCustomActivity(), root = open(draft, caps); click(root, "Add step");
    change(root, "Step 1 clothing action", "wear"); click(root, "Hat 1");
    expect(root.querySelector('[data-slot="EchoHat2"]')!.hasAttribute("disabled")).toBe(true);
    expect(root.querySelector<HTMLButtonElement>('[data-slot="Hat"]')?.title ?? root.textContent).toContain("Currently: Scarf");
    caps.clothing[0]!.current = "Cap"; caps.clothing[0]!.template = { Group: "Hat", Name: "Cap" };
    click(root, "Refresh available options");
    expect(root.querySelector<HTMLButtonElement>('[data-slot="Hat"]')!.title).toContain("Currently: Cap"); expect(root.textContent).toContain("Saved: Scarf");
    expect(draft.effects!.steps[0]!.wearClothing![0]!.Property).toEqual({ TypeRecord: { a: 2 } });
    change(root, "Step 1 clothing action", "remove"); click(root, "Hat 1");
    expect(draft.effects!.steps[0]!.wearClothing).toBeUndefined();
    expect(draft.effects!.steps[0]!.removeClothing).toEqual(["Hat"]);
  });
  it("uses 0–15 second sliders, keeps zero duration valid, and exposes Restore as a switch", () => {
    const draft = createBlankCustomActivity(), root = open(draft, capabilities()); click(root, "Add step");
    for (const label of ["Step 1 delay", "Step 1 duration"]) {
      const input = root.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
      expect(input.type).toBe("range"); expect(input.min).toBe("0"); expect(input.max).toBe("15");
      input.value = "15"; input.dispatchEvent(new Event("input")); expect(input.getAttribute("aria-valuetext")).toBe("15 seconds");
    }
    change(root, "Step 1 duration", "0"); expect(draft.effects!.steps[0]!.durationMs).toBe(0);
    const restore = root.querySelector<HTMLInputElement>('[role="switch"]')!;
    restore.click(); expect(draft.effects!.restore).toBe(false); expect(root.textContent).toContain("Keep the final face and pose.");
  });
  it("authorizes transfer slots without capturing an item, switches direction, and deselects on a second tap", () => {
    const draft = createBlankCustomActivity(), root = open(draft, capabilities()); click(root, "Add step");
    change(root, "Step 1 clothing action", "transfer"); click(root, "Hat 2 🍔");
    expect(draft.effects!.steps[0]!.transferClothing).toEqual({ direction: "self-to-target", slots: ["EchoHat2"] });
    change(root, "Step 1 transfer direction", "target-to-self");
    expect(draft.effects!.steps[0]!.transferClothing!.direction).toBe("target-to-self");
    expect(draft.effects!.steps[0]!.wearClothing).toBeUndefined();
    click(root, "Hat 2 🍔"); expect(draft.effects!.steps[0]!.transferClothing!.slots).toEqual([]);
    click(root, "Hat 1"); change(root, "Step 1 clothing action", "remove");
    expect(draft.effects!.steps[0]!.transferClothing).toBeUndefined();
  });
  it("keeps Swap in the same Transfer selector, saves live slots only, and reopens the selected direction", () => {
    const caps = capabilities(); caps.clothing[0]!.current = "Long current hat name";
    caps.clothing[0]!.template = { Group: "Hat", Name: "Cap", Property: { Rotation: 8 } };
    const draft = createBlankCustomActivity(); let root = open(draft, caps); click(root, "Add step");
    change(root, "Step 1 clothing action", "transfer");
    const selector = root.querySelector<HTMLSelectElement>('[aria-label="Step 1 transfer direction"]')!;
    expect([...selector.options].map(option => [option.value, option.textContent])).toEqual([
      ["self-to-target", "Self → Target"], ["target-to-self", "Target → Self"], ["swap", "Swap"],
    ]);
    change(root, "Step 1 transfer direction", "swap"); click(root, "Hat 1"); click(root, "Hat 2 🍔");
    expect(root.textContent).toContain("Self ↔ Target");
    expect(draft.effects!.steps[0]!.transferClothing).toEqual({ direction: "swap", slots: ["Hat", "EchoHat2"] });
    expect(draft.effects!.steps[0]!.wearClothing).toBeUndefined();
    const saved = sanitizeCustomActivities([{ ...draft, name: "Swap hats" }])[0]!;
    root.remove(); root = open(saved, caps);
    expect(root.querySelector<HTMLSelectElement>('[aria-label="Step 1 clothing action"]')!.value).toBe("transfer");
    expect(root.querySelector<HTMLSelectElement>('[aria-label="Step 1 transfer direction"]')!.value).toBe("swap");
    expect(root.querySelector('[data-slot="EchoHat2"]')!.getAttribute("aria-pressed")).toBe("true");
    click(root, "Hat 2 🍔"); expect(saved.effects!.steps[0]!.transferClothing!.slots).toEqual(["Hat"]);
    change(root, "Step 1 transfer direction", "target-to-self"); expect(root.textContent).not.toContain("Self ↔ Target");
    expect(saved.effects!.steps[0]!.transferClothing).toEqual({ direction: "target-to-self", slots: ["Hat"] });
    change(root, "Step 1 clothing action", "wear");
    expect(saved.effects!.steps[0]!.transferClothing).toBeUndefined();
  });
});
