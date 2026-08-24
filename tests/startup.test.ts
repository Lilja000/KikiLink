// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { KikiLinkApp } from "../src/core/kikilink";

afterEach(() => {
  vi.useRealTimers();
  for (const key of ["Player", "ServerIsLoggedIn", "ServerSendBeepMessage"]) {
    Reflect.deleteProperty(globalThis, key);
  }
  document.body.replaceChildren();
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
    expect(host?.shadowRoot?.querySelector(".kl-launcher")).not.toBeNull();

    await app.destroy();
    expect(document.querySelector("#kikilink-root")).toBeNull();
  });
});
