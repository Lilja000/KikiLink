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
  it("shows every body slot as a radio choice and keeps the image gallery canonical", () => {
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

    slots.find((button) => button.dataset.slot === "ItemHands")?.click();
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
      image: "Caress",
    });
  });
});
