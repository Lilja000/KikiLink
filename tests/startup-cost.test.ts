// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { KikiLinkApp } from "../src/core/kikilink";
import { ModuleRegistry } from "../src/core/module-registry";
import { SettingsStore, SETTINGS_KEY, DEFAULT_SETTINGS } from "../src/core/settings";
import { LinkActivitiesService } from "../src/modules/link-activities/link-activities-service";
import { LinkChatView } from "../src/modules/link-chat/view";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.replaceChildren(); localStorage.clear(); });

it("profiles complete account startup with an empty and a full activity library", async () => {
  const results: object[] = [];
  for (const count of [0, 100]) {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.linkActivities.customActivities = Array.from({ length: count }, (_, i) => ({
      id: `profile-${i}`, name: `Activity ${i}`, targetGroup: "ItemArms", targetMode: "both", template: "{me} greets {target}.", image: "Caress", arousal: 0,
      effects: { subject: "actor", restore: true, steps: Array.from({ length: 8 }, () => ({ delayMs: 0, durationMs: 1000,
        expressions: [], poses: [], removeClothing: [], wearClothing: [{ Group: "Hat", Name: "Hat", Color: ["#123456", "#ffffff"],
          Property: { TypeRecord: { typed: 1 }, Text: "x".repeat(500), Layers: Array.from({ length: 16 }, (_, n) => ({ n, color: "#123456" })) } }] })) },
    }));
    for (let repeat = 0; repeat < (process.env.KIKILINK_PROFILE_STARTUP ? 3 : 1); repeat++) {
      localStorage.clear();
      localStorage.setItem(`kikilink:account:999:${SETTINGS_KEY}`, JSON.stringify(settings));
      vi.stubGlobal("Player", { MemberNumber: 999, Name: "Fixture", FriendNames: new Map(), FriendList: [], ExtensionSettings: {} });
      vi.stubGlobal("ServerIsLoggedIn", () => true); vi.stubGlobal("ServerSendBeepMessage", vi.fn());
      let reads = 0, readMs = 0, activitiesMs = 0, mountMs = 0;
      const get = SettingsStore.prototype.get, start = LinkActivitiesService.prototype.start, mount = LinkChatView.prototype.mount;
      const readSpy = vi.spyOn(SettingsStore.prototype, "get").mockImplementation(function (this: SettingsStore) {
        const at = performance.now(); try { reads++; return get.call(this); } finally { readMs += performance.now() - at; }
      });
      const activitySpy = vi.spyOn(LinkActivitiesService.prototype, "start").mockImplementation(function (this: LinkActivitiesService) {
        const at = performance.now(); try { start.call(this); } finally { activitiesMs += performance.now() - at; }
      });
      const mountSpy = vi.spyOn(LinkChatView.prototype, "mount").mockImplementation(function (this: LinkChatView) {
        const at = performance.now(); try { mount.call(this); } finally { mountMs += performance.now() - at; }
      });
      const app = new KikiLinkApp("0.29.0"), at = performance.now();
      try {
        await app.start();
        const root = document.querySelector("#kikilink-root")?.shadowRoot;
        expect(root?.querySelector(".kl-launcher")).toBeTruthy();
        expect(root?.querySelector(".kl-sequence-editor")).toBeNull();
        expect(root?.querySelector(".kl-custom-activity-card")).toBeNull();
        results.push({ count, repeat, totalMs: performance.now() - at, reads, readMs, activitiesMs, mountMs,
          cards: root?.querySelectorAll(".kl-custom-activity-card").length });
      } finally { await app.destroy(); readSpy.mockRestore(); activitySpy.mockRestore(); mountSpy.mockRestore(); }
    }
  }
  if (process.env.KIKILINK_PROFILE_STARTUP) { mkdirSync(".local-dev", { recursive: true }); writeFileSync(".local-dev/startup-profile.json", JSON.stringify(results, null, 2)); }
}, 20000);

it("keeps timers bounded across repeated window navigation and releases them on destruction", async () => {
  vi.useFakeTimers();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.stubGlobal("Player", { MemberNumber: 999, Name: "Fixture", FriendNames: new Map(), FriendList: [], ExtensionSettings: {} });
  vi.stubGlobal("ServerIsLoggedIn", () => true); vi.stubGlobal("ServerSendBeepMessage", vi.fn());
  const app = new KikiLinkApp("0.29.0"), api = app.publicApi();
  try {
    await app.start();
    const navigate = async () => {
      api.open(); api.openActivities(); api.openRoster(); api.openChat(202, "Fixture contact"); api.close();
      await vi.advanceTimersByTimeAsync(2000);
    };
    await navigate();
    const timers = vi.getTimerCount();
    for (let i = 0; i < 20; i++) {
      await navigate();
      expect(vi.getTimerCount()).toBeLessThanOrEqual(timers);
      expect(document.querySelectorAll("#kikilink-root")).toHaveLength(1);
    }
    await app.destroy();
    await vi.advanceTimersByTimeAsync(2000);
    expect(vi.getTimerCount()).toBe(0);
    expect(document.querySelector("#kikilink-root")).toBeNull();
  } finally { await app.destroy(); vi.useRealTimers(); }
}, 20000);

it("makes concurrent destroy callers wait for the same complete teardown", async () => {
  vi.useFakeTimers();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.stubGlobal("Player", { MemberNumber: 999, Name: "Fixture", FriendNames: new Map(), FriendList: [], ExtensionSettings: {} });
  vi.stubGlobal("ServerIsLoggedIn", () => true); vi.stubGlobal("ServerSendBeepMessage", vi.fn());
  const app = new KikiLinkApp("0.29.0");
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  try {
    await app.start();
    const stop = ModuleRegistry.prototype.stopAll;
    vi.spyOn(ModuleRegistry.prototype, "stopAll").mockImplementationOnce(async function (this: ModuleRegistry) {
      await gate; await stop.call(this);
    });
    const first = app.destroy();
    await vi.advanceTimersByTimeAsync(0);
    let secondFinished = false;
    const second = app.destroy().then(() => { secondFinished = true; });
    await vi.advanceTimersByTimeAsync(0);
    expect(secondFinished).toBe(false);
    release(); await Promise.all([first, second]);
    expect(document.querySelector("#kikilink-root")).toBeNull();
  } finally { release(); await app.destroy(); vi.useRealTimers(); }
});
