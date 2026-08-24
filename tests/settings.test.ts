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
      draft.ui.launcherOpen = "last";
      draft.ui.launcherPosition = { x: 0.25, y: 0.6 };
      draft.ui.density = "super-compact";
      draft.ui.textScale = "large";
      draft.ui.homeLayout = "compact";
      draft.ui.settingsSection = "navigation";
      draft.linkChat.retentionDays = 30;
      draft.linkRoster.retentionDays = 180;
    });

    const second = new SettingsStore(storage);
    expect(second.get().ui.theme).toBe("light");
    expect(second.get().ui.launcherSide).toBe("left");
    expect(second.get().ui.launcherOpen).toBe("last");
    expect(second.get().ui.launcherPosition).toEqual({ x: 0.25, y: 0.6 });
    expect(second.get().ui.density).toBe("super-compact");
    expect(second.get().ui.textScale).toBe("large");
    expect(second.get().ui.homeLayout).toBe("compact");
    expect(second.get().ui.settingsSection).toBe("navigation");
    expect(second.get().linkChat.retentionDays).toBe(30);
    expect(second.get().linkRoster.retentionDays).toBe(180);
  });

  it("rejects invalid persisted values", () => {
    const settings = sanitizeSettings({
      ui: {
        accent: "red",
        theme: "neon",
        launcherSide: "middle",
        launcherOpen: "messages",
        launcherPosition: { x: -1, y: 4 },
        density: "tiny",
        textScale: "huge",
        homeLayout: "busy",
        settingsSection: "unknown",
      },
      linkChat: { retentionDays: -5, maxMessagesPerConversation: 10 },
      linkRoster: { retentionDays: -20 },
    });

    expect(settings.ui.accent).toBe(DEFAULT_SETTINGS.ui.accent);
    expect(settings.ui.theme).toBe(DEFAULT_SETTINGS.ui.theme);
    expect(settings.ui.launcherSide).toBe("right");
    expect(settings.ui.launcherOpen).toBe("home");
    expect(settings.ui.launcherPosition).toBeNull();
    expect(settings.ui.density).toBe("comfortable");
    expect(settings.ui.textScale).toBe("normal");
    expect(settings.ui.homeLayout).toBe("showcase");
    expect(settings.ui.settingsSection).toBe("appearance");
    expect(settings.linkChat.retentionDays).toBe(DEFAULT_SETTINGS.linkChat.retentionDays);
    expect(settings.linkChat.maxMessagesPerConversation).toBe(
      DEFAULT_SETTINGS.linkChat.maxMessagesPerConversation,
    );
    expect(settings.linkChat.quickActions).toEqual(DEFAULT_SETTINGS.linkChat.quickActions);
    expect(settings.linkRoster.retentionDays).toBe(DEFAULT_SETTINGS.linkRoster.retentionDays);
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

    expect(settings.schemaVersion).toBe(10);
    expect(settings.linkActivities).toEqual({
      enabled: false,
      activities: [
        {
          label: "Sakura greeting",
          template: "bows to {target}.",
          category: "Uncategorized",
          pack: "My Activities",
          favorite: false,
        },
      ],
    });
    expect(settings.linkRoster).toEqual(DEFAULT_SETTINGS.linkRoster);
  });

  it("recognizes the original starter activities while migrating schema 8", () => {
    const settings = sanitizeSettings({
      schemaVersion: 8,
      linkActivities: {
        enabled: true,
        activities: [
          {
            label: "Sakura bow",
            template: "bows gracefully to {target}, as if sakura petals drifted between them.",
          },
        ],
      },
    });

    expect(settings.linkActivities.activities).toEqual([
      {
        label: "Sakura bow",
        template: "bows gracefully to {target}, as if sakura petals drifted between them.",
        category: "Greetings",
        pack: "KikiLink Starter",
        favorite: true,
      },
    ]);
  });

  it("demotes the 0.4 Activity shortcut while adding LinkRoster", () => {
    const settings = sanitizeSettings({
      schemaVersion: 2,
      linkActivities: { enabled: true },
    });

    expect(settings.schemaVersion).toBe(10);
    expect(settings.linkActivities.enabled).toBe(false);
    expect(settings.linkRoster).toEqual({
      enabled: true,
      trackEncounters: true,
      retentionDays: 365,
    });
    expect(settings.ui.launcherOpen).toBe("home");
  });

  it("adds comfort preferences to 0.6 settings without changing existing choices", () => {
    const settings = sanitizeSettings({
      schemaVersion: 4,
      ui: {
        accent: "#247f7a",
        theme: "light",
        launcherSide: "left",
        launcherOpen: "chat",
        reducedMotion: true,
      },
      linkRoster: { enabled: false, trackEncounters: false },
    });

    expect(settings.schemaVersion).toBe(10);
    expect(settings.ui).toMatchObject({
      accent: "#247f7a",
      theme: "light",
      density: "comfortable",
      textScale: "normal",
      homeLayout: "showcase",
      launcherSide: "left",
      launcherOpen: "chat",
      reducedMotion: true,
      settingsSection: "appearance",
    });
    expect(settings.linkRoster).toEqual({
      enabled: false,
      trackEncounters: false,
      retentionDays: 365,
    });
    expect(settings.linkPresence).toEqual(DEFAULT_SETTINGS.linkPresence);
  });

  it("sanitizes presence and modern chat preferences", () => {
    const settings = sanitizeSettings({
      schemaVersion: 7,
      linkChat: { enterToSend: false, typingIndicators: false, imagePreviews: "always" },
      linkPresence: {
        enabled: true,
        status: "dnd",
        statusMessage: "  In a scene  ",
        autoIdleMinutes: 30,
      },
    });

    expect(settings.linkChat.enterToSend).toBe(false);
    expect(settings.linkChat.typingIndicators).toBe(false);
    expect(settings.linkChat.imagePreviews).toBe("always");
    expect(settings.linkPresence).toEqual({
      enabled: true,
      status: "dnd",
      statusMessage: "In a scene",
      autoIdleMinutes: 30,
    });
  });

  it("adds and sanitizes schema-10 LinkReactions rules", () => {
    const settings = sanitizeSettings({
      schemaVersion: 9,
      linkReactions: {
        enabled: true,
        rules: [
          {
            id: "Greeting Rule",
            label: "  Welcome friend  ",
            trigger: "room-join",
            scope: "members",
            memberNumbers: [123, 123, -1, "456"],
            action: "room-emote",
            template: "  welcomes {name}.  ",
            cooldownSeconds: 15,
          },
          { label: "Broken", template: "" },
        ],
      },
    });

    expect(settings.schemaVersion).toBe(10);
    expect(settings.linkReactions).toEqual({
      enabled: true,
      rules: [
        {
          id: "greeting-rule",
          label: "Welcome friend",
          enabled: true,
          trigger: "room-join",
          scope: "members",
          memberNumbers: [123],
          textMatch: "",
          action: "room-emote",
          template: "welcomes {name}.",
          cooldownSeconds: 15,
        },
      ],
    });
  });
});
