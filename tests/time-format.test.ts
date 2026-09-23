// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import {
  bindClockText,
  bindClockTitle,
  clearClockBinding,
  formatDateTime,
  formatClockTime,
  formatConversationClock,
  refreshClockText,
  setTimeFormatPreference,
} from "../src/core/time-format";

afterEach(() => setTimeFormatPreference("12-hour"));

describe("time format preference", () => {
  it("persists only the supported 12/24-hour values", () => {
    const storage = new MemoryKeyValueStorage();
    const settings = new SettingsStore(storage);
    expect(settings.getSection("ui").timeFormat).toBe("12-hour");
    settings.update(draft => { draft.ui.timeFormat = "12-hour"; });
    expect(new SettingsStore(storage).getSection("ui").timeFormat).toBe("12-hour");
    storage.setItem("kikilink:settings:v1", JSON.stringify({ schemaVersion: 30, ui: { timeFormat: "invalid" } }));
    expect(new SettingsStore(storage).getSection("ui").timeFormat).toBe("12-hour");
    storage.setItem("kikilink:settings:v1", JSON.stringify({ schemaVersion: 30, ui: { timeFormat: "24-hour" } }));
    expect(new SettingsStore(storage).getSection("ui").timeFormat).toBe("24-hour");
    storage.setItem("kikilink:settings:v1", JSON.stringify({ schemaVersion: 30, ui: { theme: "dark" } }));
    expect(new SettingsStore(storage).getSection("ui").timeFormat).toBe("12-hour");
  });

  it("updates existing clock nodes without replacing them", () => {
    const at = new Date(2026, 8, 22, 21, 0).getTime();
    const root = document.createElement("div");
    const time = bindClockText(document.createElement("time"), at);
    root.append(time);
    expect(formatClockTime(at, "24-hour")).toMatch(/21:00/u);
    refreshClockText(root, "12-hour");
    expect(root.firstElementChild).toBe(time);
    expect(time.textContent).toMatch(/9:00\s*PM/iu);
    refreshClockText(root, "24-hour");
    expect(root.firstElementChild).toBe(time);
    expect(time.textContent).toMatch(/21:00/u);
  });

  it("keeps non-today conversation dates as dates", () => {
    const at = new Date(2026, 7, 20, 21, 0).getTime();
    const now = new Date(2026, 8, 22, 10, 0);
    expect(formatConversationClock(at, "12-hour", now)).toBe(formatConversationClock(at, "24-hour", now));
  });

  it("refreshes retained tabs, titles and scheduled times without replacing media or focus", () => {
    const at = new Date(2026, 8, 22, 21, 0).getTime();
    const root = document.createElement("div");
    const cachedTab = document.createElement("section");
    const image = document.createElement("img");
    const input = document.createElement("input");
    document.body.append(root, input);
    input.focus();
    const kinds = ["time", "numeric-date-time", "medium-date-time", "full-seen", "long-date-time", "gallery-expiry", "music-stop", "muted-time", "muted-date-time"] as const;
    const times = kinds.map(kind => bindClockText(document.createElement("time"), at, kind));
    const relative = bindClockTitle(document.createElement("time"), at);
    relative.textContent = "5m";
    const local = bindClockTitle(document.createElement("time"), at, "local-clock-title");
    const muted = bindClockTitle(document.createElement("span"), at, "muted-date-time", true);
    cachedTab.append(image, ...times, relative, local, muted);
    cachedTab.scrollTop = 80;
    refreshClockText(root, "12-hour");
    for (const time of times) expect(time.textContent).toMatch(/9:00\s*PM/iu);
    for (const time of [relative, local, muted]) expect(time.title).toMatch(/9:00\s*PM/iu);
    expect(muted.getAttribute("aria-label")).toBe(muted.title);
    expect(relative.textContent).toBe("5m");
    expect(cachedTab.firstElementChild).toBe(image);
    expect(cachedTab.scrollTop).toBe(80);
    expect(document.activeElement).toBe(input);
    refreshClockText(root, "24-hour");
    for (const time of times) expect(time.textContent).toContain("21:00");
    clearClockBinding(times[0]!);
    times[0]!.textContent = "Notifications on";
    refreshClockText(root, "12-hour");
    expect(times[0]!.textContent).toBe("Notifications on");
    root.remove(); input.remove();
  });

  it("uses 00:00, not 24:00, at midnight in dated timestamps", () => {
    const at = new Date(2026, 8, 22, 0, 0).getTime();
    expect(formatDateTime(at, "medium", "24-hour")).toContain("00:00");
  });
});
