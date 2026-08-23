// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import { KikiLinkApp } from "../src/core/kikilink";

afterEach(() => {
  document.body.replaceChildren();
});

describe("KikiLink startup", () => {
  it("mounts the launcher before Bondage Club globals are ready", async () => {
    const app = new KikiLinkApp("0.2.1");

    await app.start();

    const host = document.querySelector<HTMLElement>("#kikilink-root");
    expect(host).not.toBeNull();
    expect(host?.shadowRoot?.querySelector(".kl-launcher")).not.toBeNull();

    await app.destroy();
    expect(document.querySelector("#kikilink-root")).toBeNull();
  });
});
