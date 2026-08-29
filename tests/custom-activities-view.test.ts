// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import { CustomActivitiesView } from "../src/modules/link-activities/custom-activities-view";
import {
  LinkActivitiesService,
  VANILLA_ACTIVITY_IMAGES,
} from "../src/modules/link-activities/link-activities-service";

afterEach(() => {
  for (const key of [
    "ActivityFemale3DCG",
    "ActivityFemale3DCGOrdering",
    "AssetGroup",
    "Player",
    "DrawCharacter",
  ]) {
    Reflect.deleteProperty(globalThis, key);
  }
  document.body.replaceChildren();
});

describe("CustomActivitiesView", () => {
  it("keeps the selected body slot compact, expands all choices, and keeps images canonical", async () => {
    globalThis.ActivityFemale3DCG = [
      {
        Name: "Caress",
        MaxProgress: 10,
        Prerequisite: [],
        Target: ["ItemArms", "ItemHands"],
      },
      {
        Name: "LSCG_Choke",
        MaxProgress: 10,
        Prerequisite: [],
        Target: ["ItemNeck"],
      },
    ];
    globalThis.ActivityFemale3DCGOrdering = ["Caress", "Pet", "LSCG_Choke"];
    globalThis.AssetGroup = [
      {
        Name: "ItemArms",
        Description: "Arms",
        Category: "Item",
        Zone: [[0, 100, 500, 400]],
      },
      {
        Name: "ItemHands",
        Description: "Hands",
        Category: "Item",
        Zone: [[80, 400, 340, 180]],
      },
    ];
    const adapter = { getOwnName: () => "Kiki" } as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const service = new LinkActivitiesService(adapter, settings);
    const root = document.createElement("div");
    document.body.append(root);
    const view = new CustomActivitiesView(
      root,
      adapter,
      settings,
      service,
      vi.fn(),
      vi.fn(),
    );

    view.open();
    root.querySelector<HTMLButtonElement>(".kl-custom-activity-empty button")?.click();

    const picker = root.querySelector<HTMLDetailsElement>(".kl-custom-slot-picker");
    const currentSlot = root.querySelector<HTMLElement>(".kl-custom-slot-current");
    const characterStage = root.querySelector<HTMLElement>(".kl-custom-character-stage");
    const characterCanvas = root.querySelector<HTMLCanvasElement>(".kl-custom-character-canvas");
    expect(picker?.open).toBe(false);
    expect(currentSlot?.textContent).toBe("Arms");
    expect(root.querySelectorAll(".kl-custom-slot-choice")).toHaveLength(0);
    expect(characterStage?.getAttribute("role")).toBe("region");
    expect(characterStage?.tabIndex).toBe(0);
    expect(characterStage?.getAttribute("aria-label")).toContain("Scroll for lower slots");
    expect(characterCanvas?.tabIndex).toBe(-1);

    if (!picker) throw new Error("Missing compact body slot picker");
    picker.open = true;
    picker.dispatchEvent(new Event("toggle"));
    const slots = [...root.querySelectorAll<HTMLButtonElement>(".kl-custom-slot-choice")];
    expect(slots.map((button) => button.dataset.slot)).toEqual(["ItemArms", "ItemHands"]);
    expect(slots.every((button) => button.getAttribute("role") === "radio")).toBe(true);
    expect(slots.find((button) => button.dataset.slot === "ItemArms")?.getAttribute("aria-checked")).toBe(
      "true",
    );

    const images = [...root.querySelectorAll<HTMLButtonElement>(".kl-custom-image-choice")];
    expect(images).toHaveLength(VANILLA_ACTIVITY_IMAGES.length);
    expect(new Set(images.map((button) => button.title))).toHaveLength(VANILLA_ACTIVITY_IMAGES.length);
    expect(images.map((button) => button.title)).not.toContain("LSCG_Choke");
    expect(images.map((button) => button.title)).not.toContain("Pet");
    expect(
      images.every((button) => button.querySelector<HTMLImageElement>("img")?.loading === "lazy"),
    ).toBe(true);

    const imageSearch = root.querySelector<HTMLInputElement>(".kl-custom-image-search");
    const bite = images.find((button) => button.title === "Bite");
    if (!imageSearch || !bite) throw new Error("Missing optimized vanilla image picker");
    imageSearch.value = "bite";
    imageSearch.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(images.filter((button) => !button.hidden).map((button) => button.title)).toEqual([
      "Bite",
    ]);
    bite.click();
    expect(root.querySelector<HTMLButtonElement>('[title="Bite"]')).toBe(bite);
    expect(bite.getAttribute("aria-pressed")).toBe("true");

    slots.find((button) => button.dataset.slot === "ItemHands")?.click();
    expect(picker.open).toBe(false);
    expect(currentSlot?.textContent).toBe("Hands");
    expect(slots.find((button) => button.dataset.slot === "ItemHands")?.getAttribute("aria-checked")).toBe(
      "true",
    );
    const name = root.querySelector<HTMLInputElement>('[data-field="name"]');
    const template = root.querySelector<HTMLTextAreaElement>(".kl-custom-activity-template");
    if (!name || !template) throw new Error("Missing custom activity fields");
    name.value = "Hold hands";
    template.value = "{me} holds {target's} hands.";
    root.querySelector<HTMLButtonElement>(".kl-custom-activity-save")?.click();

    expect(settings.get().linkActivities.customActivities[0]).toMatchObject({
      name: "Hold hands",
      targetGroup: "ItemHands",
      image: "Bite",
    });
  });
});
