// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { BrowseFilters, searchField } from "../src/modules/platform-shell/browse-controls";
import { removableFilter } from "../src/modules/platform-shell/applied-filter";

it("removes one applied browse filter at a time and returns keyboard focus to Filters", () => {
  const apply = vi.fn();
  const sheet = new BrowseFilters("Event filters", [
    { key: "when", label: "When", choices: [["upcoming", "Upcoming"], ["past", "Past"]] },
    { key: "language", label: "Language" },
    { key: "mine", label: "My events", presentation: "checkbox" },
  ], apply, { submitLabel: "Apply" });
  sheet.set({ when: "past", language: "English", mine: "1" });
  const chip = removableFilter(document.createElement("button"), "Past");
  chip.addEventListener("click", () => sheet.remove("when"));
  const host = document.createElement("div");
  host.append(sheet.button, chip);
  document.body.append(host);
  try {
    expect(chip.getAttribute("aria-label")).toBe("Remove Past filter");
    chip.focus();
    chip.click();
    expect(apply).toHaveBeenLastCalledWith({ when: "upcoming", language: "English", mine: "1" });
    expect(document.activeElement).toBe(sheet.button);
    sheet.remove("mine");
    expect(apply).toHaveBeenLastCalledWith({ when: "upcoming", language: "English", mine: "0" });
    sheet.button.disabled = true;
    sheet.remove("language");
    expect(apply).toHaveBeenCalledTimes(2);
  } finally {
    host.remove();
  }
});

it("starts at the first group and enables Reset only when a draft field has a non-default value", () => {
  const apply = vi.fn();
  const sheet = new BrowseFilters("Event filters", [
    { key: "scope", label: "Show plans", presentation: "chips", choices: [["all", "All"], ["mine", "My plans"]] },
    { key: "when", label: "When", choices: [["upcoming", "Upcoming"], ["past", "Past"]] },
    { key: "language", label: "Language" },
  ], apply, { submitLabel: "Show events" });
  const host = document.createElement("div");
  host.append(sheet.button, sheet.dialog);
  document.body.append(host);
  try {
    sheet.button.click();
    const reset = sheet.dialog.querySelector<HTMLButtonElement>("footer button")!;
    const [all, mine] = sheet.dialog.querySelectorAll<HTMLButtonElement>("fieldset button");
    expect(document.activeElement).toBe(all);
    expect(reset.disabled).toBe(true);
    mine!.click();
    expect(reset.disabled).toBe(false);
    reset.click();
    expect(reset.disabled).toBe(true);
    expect(document.activeElement).toBe(all);
    const language = sheet.dialog.querySelector<HTMLInputElement>('[aria-label="Language"]')!;
    language.value = "English";
    language.dispatchEvent(new Event("input", { bubbles: true }));
    expect(reset.disabled).toBe(false);
    language.value = "";
    language.dispatchEvent(new Event("input", { bubbles: true }));
    expect(reset.disabled).toBe(true);
    expect(apply).not.toHaveBeenCalled();
  } finally {
    sheet.close();
    host.remove();
  }
});

it("clears a search exactly once, preserves composition and lets an empty field defer to its owner", () => {
  const input = document.createElement("input");
  input.type = "search";
  const onInput = vi.fn();
  const afterClear = vi.fn();
  const ownerKey = vi.fn();
  const field = searchField(input, "Clear members", { afterClear });
  const host = document.createElement("div");
  host.append(field);
  document.body.append(host);
  input.addEventListener("input", onInput);
  host.addEventListener("keydown", ownerKey);
  const escape = (isComposing = false) => input.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true, isComposing }),
  );
  try {
    input.value = "Robin";
    expect(escape(true)).toBe(true);
    expect(input.value).toBe("Robin");
    expect(ownerKey).not.toHaveBeenCalled();
    expect(escape()).toBe(false);
    expect(input.value).toBe("");
    expect(document.activeElement).toBe(input);
    expect(onInput).toHaveBeenCalledTimes(1);
    expect(afterClear).toHaveBeenCalledTimes(1);
    expect(escape()).toBe(true);
    expect(ownerKey).toHaveBeenCalledTimes(1);
    input.value = "A";
    input.disabled = true;
    field.querySelector("button")!.click();
    expect(input.value).toBe("A");
    expect(afterClear).toHaveBeenCalledTimes(1);
  } finally {
    host.remove();
  }
});
