// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { KikiLinkApp } from "../src/core/kikilink";
import { SETTINGS_KEY } from "../src/core/settings";
import { AccountDataStorage } from "../src/storage/account-data-storage";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  for (const key of [
    "Player",
    "ServerIsLoggedIn",
    "ServerSendBeepMessage",
    "ServerPlayerExtensionSettingsSync",
  ]) {
    Reflect.deleteProperty(globalThis, key);
  }
  document.body.replaceChildren();
  localStorage.clear();
});

describe("KikiLink startup", () => {
  it("backs off initialization failures, recovers, and disposes partial state", async () => {
    vi.useFakeTimers();
    globalThis.Player = { MemberNumber: 999, Name: "Kiki", FriendNames: new Map(), FriendList: [], ExtensionSettings: {} };
    globalThis.ServerIsLoggedIn = () => true;
    globalThis.ServerSendBeepMessage = vi.fn();
    const originalClone = structuredClone;
    let failing = true;
    const clone = vi.spyOn(globalThis, "structuredClone").mockImplementation((value) => {
      if (failing) throw new Error("Transient initialization failure");
      return originalClone(value);
    });
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = new KikiLinkApp("0.29.0");
    try {
      await app.start();
      expect(document.querySelector("#kikilink-root")).toBeNull();
      await vi.advanceTimersByTimeAsync(7_000);
      expect(errors.mock.calls.length).toBeLessThanOrEqual(4);
      expect(clone.mock.calls.length).toBeLessThan(12);
      failing = false;
      await vi.advanceTimersByTimeAsync(8_000);
      expect(document.querySelector("#kikilink-root")).not.toBeNull();
    } finally { failing = false; await app.destroy(); }
    expect(document.querySelector("#kikilink-root")).toBeNull();
  });

  it("does not spin when logout occurs while account storage is attaching", async () => {
    vi.useFakeTimers();
    let loggedIn = true;
    globalThis.Player = { MemberNumber: 999, Name: "Kiki", FriendNames: new Map(), FriendList: [], ExtensionSettings: {} };
    globalThis.ServerIsLoggedIn = () => loggedIn;
    globalThis.ServerSendBeepMessage = vi.fn();
    const originalAttach = AccountDataStorage.prototype.attachChatRepository;
    vi.spyOn(AccountDataStorage.prototype, "attachChatRepository").mockImplementationOnce(async function (this: AccountDataStorage, repository) {
      await originalAttach.call(this, repository);
      loggedIn = false;
    });
    const app = new KikiLinkApp("0.29.0");
    try {
      await app.start();
      expect(document.querySelector("#kikilink-root")).toBeNull();
      loggedIn = true;
      await vi.advanceTimersByTimeAsync(1_000);
      expect(document.querySelector("#kikilink-root")).not.toBeNull();
    } finally { await app.destroy(); }
  });

  it("keeps the launcher hidden until a Bondage Club account is authenticated", async () => {
    vi.useFakeTimers();
    let loggedIn = false;
    globalThis.Player = {
      MemberNumber: 0,
      Name: "",
      FriendNames: new Map(),
      FriendList: [],
    };
    globalThis.ServerIsLoggedIn = () => loggedIn;
    globalThis.ServerSendBeepMessage = vi.fn();
    const app = new KikiLinkApp("0.3.1");
    const started = app.start();

    await vi.advanceTimersByTimeAsync(99);
    expect(document.querySelector("#kikilink-root")).toBeNull();
    const version = document.querySelector<HTMLElement>("#kikilink-version");
    expect(version?.textContent).toBe("0.3.1");
    expect(version?.dataset.kikilinkVersion).toBe("0.3.1");
    expect(version?.style.opacity).toBe("0.18");
    expect(version?.style.left).toBe("3px");

    globalThis.Player.MemberNumber = 999;
    globalThis.Player.Name = "AccountKiki";
    loggedIn = true;
    await vi.advanceTimersByTimeAsync(1);
    expect(document.querySelector("#kikilink-root")).toBeNull();

    globalThis.Player.ExtensionSettings = {};
    await vi.advanceTimersByTimeAsync(100);
    await started;

    const host = document.querySelector<HTMLElement>("#kikilink-root");
    expect(host).not.toBeNull();
    expect(host?.hidden).toBe(false);
    expect(host?.shadowRoot?.querySelector(".kl-launcher")).not.toBeNull();

    loggedIn = false;
    await vi.advanceTimersByTimeAsync(1_000);
    expect(host?.hidden).toBe(true);
    expect(document.querySelector("#kikilink-root")).toBeNull();

    loggedIn = true;
    await vi.advanceTimersByTimeAsync(1_000);
    const restoredHost = document.querySelector<HTMLElement>("#kikilink-root");
    expect(restoredHost).not.toBeNull();
    expect(restoredHost).not.toBe(host);
    expect(restoredHost?.hidden).toBe(false);

    await app.destroy();
    expect(document.querySelector("#kikilink-root")).toBeNull();
    expect(document.querySelector("#kikilink-version")).toBeNull();
  });

  it("rebuilds KikiLink with the new account's own settings after an in-page switch", async () => {
    vi.useFakeTimers();
    let loggedIn = true;
    localStorage.setItem(
      `kikilink:account:111:${SETTINGS_KEY}`,
      JSON.stringify({ ui: { theme: "light" } }),
    );
    globalThis.Player = {
      MemberNumber: 111,
      Name: "FirstAccount",
      FriendNames: new Map(),
      FriendList: [],
      ExtensionSettings: {},
    };
    globalThis.ServerIsLoggedIn = () => loggedIn;
    globalThis.ServerSendBeepMessage = vi.fn();
    const app = new KikiLinkApp("0.20.2");
    await app.start();
    const firstHost = document.querySelector<HTMLElement>("#kikilink-root");
    expect(firstHost?.dataset.theme).toBe("light");

    globalThis.Player.MemberNumber = 222;
    globalThis.Player.Name = "SecondAccount";
    globalThis.Player.ExtensionSettings = {};
    const boundary = new Event("pointerdown", { bubbles: true, cancelable: true });
    document.body.dispatchEvent(boundary);
    expect(boundary.defaultPrevented).toBe(true);
    expect(firstHost?.hidden).toBe(true);
    await vi.advanceTimersByTimeAsync(1_000);

    const secondHost = document.querySelector<HTMLElement>("#kikilink-root");
    expect(secondHost).not.toBe(firstHost);
    expect(firstHost?.isConnected).toBe(false);
    expect(secondHost?.dataset.theme).toBe("dark");
    expect(
      localStorage.getItem(`kikilink:account:222:${SETTINGS_KEY}`),
    ).toBeNull();

    loggedIn = false;
    await app.destroy();
  });
});
