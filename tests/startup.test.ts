// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { KikiLinkApp } from "../src/core/kikilink";
import { SETTINGS_KEY } from "../src/core/settings";

afterEach(() => {
  vi.useRealTimers();
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

    globalThis.Player.MemberNumber = 999;
    globalThis.Player.Name = "AccountKiki";
    loggedIn = true;
    await vi.advanceTimersByTimeAsync(1);
    await started;

    const host = document.querySelector<HTMLElement>("#kikilink-root");
    expect(host).not.toBeNull();
    expect(host?.hidden).toBe(false);
    expect(host?.shadowRoot?.querySelector(".kl-launcher")).not.toBeNull();

    loggedIn = false;
    await vi.advanceTimersByTimeAsync(250);
    expect(host?.hidden).toBe(true);
    expect(document.querySelector("#kikilink-root")).toBeNull();

    loggedIn = true;
    await vi.advanceTimersByTimeAsync(250);
    const restoredHost = document.querySelector<HTMLElement>("#kikilink-root");
    expect(restoredHost).not.toBeNull();
    expect(restoredHost).not.toBe(host);
    expect(restoredHost?.hidden).toBe(false);

    await app.destroy();
    expect(document.querySelector("#kikilink-root")).toBeNull();
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
    await vi.advanceTimersByTimeAsync(250);

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
