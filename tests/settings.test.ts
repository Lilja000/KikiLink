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
    expect(store.get().linkActivities).toEqual({
      enabled: true,
      customActivities: [],
    });
  });

  it("persists validated updates", () => {
    const storage = new MemoryKeyValueStorage();
    const first = new SettingsStore(storage);
    first.update((draft) => {
      draft.ui.theme = "light";
      draft.ui.launcherSide = "left";
      draft.ui.launcherOpen = "last";
      draft.ui.launcherPosition = { x: 0.25, y: 0.6 };
      draft.ui.panelPosition = { x: 0.4, y: 0.2 };
      draft.ui.density = "super-compact";
      draft.ui.textScale = "large";
      draft.ui.homeLayout = "compact";
      draft.ui.settingsSection = "navigation";
      draft.linkChat.retentionDays = 30;
      draft.linkRoster.retentionDays = 180;
      draft.linkReactions.sounds.volume = 42;
      draft.linkReactions.sounds.chat = "custom:soft-bell";
    });

    const second = new SettingsStore(storage);
    expect(second.get().ui.theme).toBe("light");
    expect(second.get().ui.launcherSide).toBe("left");
    expect(second.get().ui.launcherOpen).toBe("last");
    expect(second.get().ui.launcherPosition).toEqual({ x: 0.25, y: 0.6 });
    expect(second.get().ui.panelPosition).toEqual({ x: 0.4, y: 0.2 });
    expect(second.get().ui.density).toBe("super-compact");
    expect(second.get().ui.textScale).toBe("large");
    expect(second.get().ui.homeLayout).toBe("compact");
    expect(second.get().ui.settingsSection).toBe("navigation");
    expect(second.get().linkChat.retentionDays).toBe(30);
    expect(second.get().linkRoster.retentionDays).toBe(180);
    expect(second.get().linkReactions.sounds).toMatchObject({
      volume: 42,
      chat: "custom:soft-bell",
    });
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

    expect(settings.schemaVersion).toBe(17);
    expect(settings.linkActivities).toEqual({
      enabled: true,
      customActivities: [
        {
          id: "legacy-sakura-greeting",
          name: "Sakura greeting",
          targetGroup: "ItemArms",
          targetMode: "other",
          template: "bows to {target}.",
          image: "Caress",
          arousal: 0,
        },
      ],
    });
    expect(settings.linkRoster).toEqual(DEFAULT_SETTINGS.linkRoster);
  });

  it("drops the old bundled starter pack so the new custom library starts empty", () => {
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

    expect(settings.linkActivities.customActivities).toEqual([]);
  });

  it("sanitizes schema-13 custom activities and keeps duplicate IDs unique", () => {
    const longId = "a".repeat(64);
    const settings = sanitizeSettings({
      schemaVersion: 13,
      linkActivities: {
        enabled: true,
        customActivities: [
          {
            id: "  elbow touch  ",
            name: "  Elbow\u0000 touch  ",
            targetGroup: "ItemArms",
            targetMode: "both",
            template: "  {me} touches {target}.  ",
            image: "Caress",
            arousal: 7,
          },
          {
            id: "elbow-touch",
            name: "Second",
            targetGroup: "../../bad",
            targetMode: "everyone",
            template: "waves to {target}",
            image: "bad/path",
            arousal: 99,
          },
          {
            id: longId,
            name: "Long ID one",
            targetGroup: "ItemHands",
            template: "waves",
            image: "Nod",
          },
          {
            id: longId,
            name: "Long ID two",
            targetGroup: "ItemHands",
            template: "nods",
            image: "Nod",
          },
        ],
      },
    });

    expect(settings.linkActivities.customActivities).toEqual([
      {
        id: "elbow-touch",
        name: "Elbow touch",
        targetGroup: "ItemArms",
        targetMode: "both",
        template: "{me} touches {target}.",
        image: "Caress",
        arousal: 7,
      },
      {
        id: "elbow-touch-2",
        name: "Second",
        targetGroup: "ItemArms",
        targetMode: "other",
        template: "waves to {target}",
        image: "Caress",
        arousal: 0,
      },
      {
        id: longId,
        name: "Long ID one",
        targetGroup: "ItemHands",
        targetMode: "other",
        template: "waves",
        image: "Nod",
        arousal: 0,
      },
      {
        id: `${"a".repeat(62)}-2`,
        name: "Long ID two",
        targetGroup: "ItemHands",
        targetMode: "other",
        template: "nods",
        image: "Nod",
        arousal: 0,
      },
    ]);
  });

  it("promotes the new empty Custom Activities tab while adding LinkRoster", () => {
    const settings = sanitizeSettings({
      schemaVersion: 2,
      linkActivities: { enabled: true },
    });

    expect(settings.schemaVersion).toBe(17);
    expect(settings.linkActivities.enabled).toBe(true);
    expect(settings.linkActivities.customActivities).toEqual([]);
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

    expect(settings.schemaVersion).toBe(17);
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
      avatarUrl: "",
      autoIdleMinutes: 30,
      afkAutoReply: DEFAULT_SETTINGS.linkPresence.afkAutoReply,
    });
  });

  it("preserves advanced rules while adding schema-11 quick alerts", () => {
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

    expect(settings.schemaVersion).toBe(17);
    expect(settings.linkReactions).toEqual({
      quickAlerts: {
        friendOnline: false,
        roomJoin: false,
      },
      sounds: {
        enabled: false,
        volume: 65,
        chat: "chime",
        friendOnline: "sparkle",
        roomJoin: "pop",
      },
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

  it("sanitizes simple alerts and notification sound choices", () => {
    const settings = sanitizeSettings({
      schemaVersion: 11,
      linkReactions: {
        quickAlerts: { friendOnline: true, roomJoin: "yes" },
        sounds: {
          enabled: true,
          chat: "sparkle",
          friendOnline: "invalid",
          roomJoin: "chime",
        },
      },
    });

    expect(settings.linkReactions.quickAlerts).toEqual({
      friendOnline: true,
      roomJoin: false,
    });
    expect(settings.linkReactions.sounds).toEqual({
      enabled: true,
      volume: 65,
      chat: "sparkle",
      friendOnline: "sparkle",
      roomJoin: "chime",
    });
  });

  it("sanitizes zero-account temporary image upload preferences", () => {
    expect(
      sanitizeSettings({
        schemaVersion: 13,
        linkChat: { imageUploads: { enabled: false, retention: "forever" } },
      }).linkChat.imageUploads,
    ).toEqual({ enabled: false, retention: "24h" });

    expect(
      sanitizeSettings({
        schemaVersion: 13,
        linkChat: {
          imageUploads: {
            enabled: true,
            cloudName: "old-cloud",
            uploadPreset: "old-preset",
          },
        },
      }).linkChat.imageUploads,
    ).toEqual({ enabled: false, retention: "24h" });

    expect(
      sanitizeSettings({
        schemaVersion: 14,
        linkChat: {
          imageUploads: {
            enabled: true,
            retention: "72h",
          },
        },
      }).linkChat.imageUploads,
    ).toEqual({
      enabled: true,
      retention: "72h",
    });
  });

  it("sanitizes the room Blossom, profile avatar, and AFK reply", () => {
    const settings = sanitizeSettings({
      schemaVersion: 16,
      ui: {
        roomBadge: {
          enabled: true,
          position: { x: 0.72, y: 0.08 },
        },
      },
      linkPresence: {
        avatarUrl: " https://i.imgur.com/kiki.png ",
        afkAutoReply: {
          enabled: true,
          message: "  Back later!  ",
        },
      },
    });

    expect(settings.ui.roomBadge).toEqual({
      enabled: true,
      position: { x: 0.72, y: 0.08 },
    });
    expect(settings.linkPresence.avatarUrl).toBe("https://i.imgur.com/kiki.png");
    expect(settings.linkPresence.afkAutoReply).toEqual({
      enabled: true,
      message: "Back later!",
    });

    const rejected = sanitizeSettings({
      schemaVersion: 16,
      ui: {
        roomBadge: { enabled: true, position: { x: 2, y: -1 } },
      },
      linkPresence: {
        avatarUrl: "http://tracker.example/avatar.png",
        afkAutoReply: { enabled: true, message: "   " },
      },
    });
    expect(rejected.ui.roomBadge).toEqual(DEFAULT_SETTINGS.ui.roomBadge);
    expect(rejected.linkPresence.avatarUrl).toBe("");

    const expandingUnicodeAvatar = `https://example.com/${"é".repeat(240)}.png`;
    expect(expandingUnicodeAvatar.length).toBeLessThan(500);
    expect(
      sanitizeSettings({
        schemaVersion: 14,
        linkPresence: { avatarUrl: expandingUnicodeAvatar },
      }).linkPresence.avatarUrl,
    ).toBe("");
    expect(rejected.linkPresence.afkAutoReply).toEqual({
      enabled: true,
      message: DEFAULT_SETTINGS.linkPresence.afkAutoReply.message,
    });

    expect(
      sanitizeSettings({
        schemaVersion: 15,
        ui: { roomBadge: { enabled: true, position: { x: 0.72, y: 0.08 } } },
      }).ui.roomBadge,
    ).toEqual({ enabled: true, position: null });
  });

  it("migrates the accidental Russian AFK default and old preset badge settings", () => {
    const settings = sanitizeSettings({
      schemaVersion: 14,
      ui: {
        roomBadge: {
          enabled: true,
          placement: "between-addons",
          offsetX: 12,
          offsetY: 4,
        },
      },
      linkPresence: {
        afkAutoReply: {
          enabled: true,
          message: "Привет, я АФК, напишите мне позже!",
        },
      },
    });

    expect(settings.schemaVersion).toBe(17);
    expect(settings.ui.roomBadge).toEqual({ enabled: true, position: null });
    expect(settings.linkPresence.afkAutoReply).toEqual({
      enabled: true,
      message: "Hi, I'm AFK. Message me later!",
    });

    const customized = sanitizeSettings({
      schemaVersion: 14,
      linkPresence: {
        afkAutoReply: {
          enabled: true,
          message: "Still drawing; I'll answer soon.",
        },
      },
    });
    expect(customized.linkPresence.afkAutoReply).toEqual({
      enabled: true,
      message: "Still drawing; I'll answer soon.",
    });
  });
});
