import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  MemoryKeyValueStorage,
  SettingsStore,
  sanitizeSettings,
} from "../src/core/settings";

describe("SettingsStore", () => {
  it("starts with independent defaults", () => {
    const store = new SettingsStore(new MemoryKeyValueStorage());
    const settings = store.get();
    settings.ui.accent = "#000000";

    expect(store.get()).toEqual(DEFAULT_SETTINGS);
  });

  it("persists validated updates", () => {
    const storage = new MemoryKeyValueStorage();
    const first = new SettingsStore(storage);
    first.update((draft) => {
      draft.ui.theme = "light";
      draft.ui.launcherSide = "left";
      draft.ui.launcherPosition = { x: 0.25, y: 0.6 };
      draft.linkChat.retentionDays = 30;
    });

    const second = new SettingsStore(storage);
    expect(second.get().ui.theme).toBe("light");
    expect(second.get().ui.launcherSide).toBe("left");
    expect(second.get().ui.launcherPosition).toEqual({ x: 0.25, y: 0.6 });
    expect(second.get().linkChat.retentionDays).toBe(30);
  });

  it("rejects invalid persisted values", () => {
    const settings = sanitizeSettings({
      ui: {
        accent: "red",
        theme: "neon",
        launcherSide: "middle",
        launcherPosition: { x: -1, y: 4 },
      },
      linkChat: { retentionDays: -5, maxMessagesPerConversation: 10 },
    });

    expect(settings.ui.accent).toBe(DEFAULT_SETTINGS.ui.accent);
    expect(settings.ui.theme).toBe(DEFAULT_SETTINGS.ui.theme);
    expect(settings.ui.launcherSide).toBe("right");
    expect(settings.ui.launcherPosition).toBeNull();
    expect(settings.linkChat.retentionDays).toBe(DEFAULT_SETTINGS.linkChat.retentionDays);
    expect(settings.linkChat.maxMessagesPerConversation).toBe(
      DEFAULT_SETTINGS.linkChat.maxMessagesPerConversation,
    );
    expect(settings.linkChat.quickActions).toEqual(DEFAULT_SETTINGS.linkChat.quickActions);
  });

  it("adds the default theme to 0.1 settings without losing LinkChat choices", () => {
    const settings = sanitizeSettings({
      schemaVersion: 1,
      ui: { accent: "#aabbcc", launcherSide: "left", reducedMotion: true },
      linkChat: {
        enabled: true,
        saveHistory: false,
        includeRoomByDefault: true,
        retentionDays: 45,
        maxMessagesPerConversation: 750,
        openOnIncoming: true,
      },
    });

    expect(settings.ui.theme).toBe("dark");
    expect(settings.ui.launcherSide).toBe("left");
    expect(settings.linkChat.saveHistory).toBe(false);
    expect(settings.linkChat.retentionDays).toBe(45);
    expect(settings.linkChat.quickActions).toEqual(DEFAULT_SETTINGS.linkChat.quickActions);
  });

  it("sanitizes custom quick actions", () => {
    const settings = sanitizeSettings({
      linkChat: {
        quickActions: [
          { label: "  Curtsey  ", template: "  *curtsies to {name}*  " },
          { label: "", template: "ignored" },
          { label: "Broken" },
        ],
      },
    });

    expect(settings.linkChat.quickActions).toEqual([
      { label: "Curtsey", template: "*curtsies to {name}*" },
    ]);
  });

  it("migrates and sanitizes LinkActivities settings", () => {
    const settings = sanitizeSettings({
      schemaVersion: 1,
      linkActivities: {
        enabled: false,
        activities: [
          { label: "  Sakura greeting  ", template: "  bows to {target}.  " },
          { label: "", template: "ignored" },
          { label: "Broken" },
        ],
      },
    });

    expect(settings.schemaVersion).toBe(2);
    expect(settings.linkActivities).toEqual({
      enabled: false,
      activities: [{ label: "Sakura greeting", template: "bows to {target}." }],
    });
  });
});
