// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { KikiLinkDistribution } from "../src/core/distribution";
import type { KikiLinkPublicApi } from "../src/core/types";

const harness = vi.hoisted(() => ({
  distribution: "userscript" as "userscript" | "fusam",
  devTest: false,
  created: [] as KikiLinkPublicApi[],
}));

vi.mock("../src/core/distribution", () => ({
  get KIKILINK_DISTRIBUTION() { return harness.distribution; },
  get KIKILINK_DEV_TEST() { return harness.devTest; },
}));

vi.mock("../src/core/kikilink", () => ({
  KikiLinkApp: class {
    #active = false;
    #api: KikiLinkPublicApi;
    constructor(version: string) {
      const distribution = harness.distribution;
      const devTest = harness.devTest;
      this.#api = {
        name: "KikiLink",
        getRuntimeInfo: () => ({ distribution, devTest, active: this.#active }),
        getVersion: () => version,
        destroy: vi.fn(async () => { this.#active = false; }),
        open: vi.fn(), openChat: vi.fn(), openRoster: vi.fn(), openActivities: vi.fn(), close: vi.fn(),
      };
      harness.created.push(this.#api);
    }
    publicApi() { return this.#api; }
    async start() { this.#active = true; }
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
  delete window.KikiLink;
  delete document.documentElement.dataset.kikilinkPageRealm;
  harness.created.length = 0;
  harness.devTest = false;
});

async function load(distribution: KikiLinkDistribution, version: string, devTest = false) {
  harness.distribution = distribution;
  harness.devTest = devTest;
  vi.stubGlobal("__KIKILINK_VERSION__", version);
  vi.resetModules();
  await import("../src/index");
  // Bootstrap may await an existing runtime's asynchronous teardown.
  await Promise.resolve();
  return window.KikiLink!;
}

describe("duplicate distribution loading", () => {
  it.each(["1.1.4", "1.2.0", "1.10.0"])(
    "retains the standalone %s upload runtime when FUSAM 1.1.4 loads later",
    async (version) => {
      const standalone = await load("userscript", version);
      await load("fusam", "1.1.4");

      expect(window.KikiLink).toBe(standalone);
      expect(standalone.destroy).not.toHaveBeenCalled();
      expect(standalone.getRuntimeInfo?.().active).toBe(true);
      expect(harness.created).toHaveLength(1);
      expect(document.documentElement.dataset.kikilinkPageRealm).toBe(version);
    },
  );

  it("lets the equally current standalone replace FUSAM in the opposite load order", async () => {
    const fusam = await load("fusam", "1.1.4");
    const standalone = await load("userscript", "1.1.4");

    expect(standalone).not.toBe(fusam);
    expect(fusam.destroy).toHaveBeenCalledOnce();
    expect(standalone.getRuntimeInfo?.()).toEqual({ distribution: "userscript", devTest: false, active: true });
    expect(harness.created).toHaveLength(2);
  });

  it("rechecks a FUSAM winner installed while standalone waits for the old teardown", async () => {
    const old = await load("fusam", "1.1.3");
    let finishOld!: () => void;
    old.destroy = vi.fn(() => new Promise<void>((resolve) => { finishOld = resolve; }));
    await load("userscript", "1.1.4");
    expect(old.destroy).toHaveBeenCalledOnce();
    const fusamWinner: KikiLinkPublicApi = {
      ...old,
      getVersion: () => "1.1.4",
      getRuntimeInfo: () => ({ distribution: "fusam", devTest: false, active: true }),
      destroy: vi.fn(async () => {}),
    };
    window.KikiLink = fusamWinner;
    finishOld();
    await vi.waitFor(() => expect(window.KikiLink?.getRuntimeInfo?.().distribution).toBe("userscript"));
    expect(fusamWinner.destroy).toHaveBeenCalledOnce();
    expect(window.KikiLink).not.toBe(fusamWinner);
  });

  it.each([
    ["userscript", "1.1.4"],
    ["fusam", "1.1.5"],
  ] as const)("retains a preferred concurrent %s %s winner", async (distribution, version) => {
    const old = await load("fusam", "1.1.3");
    let finishOld!: () => void;
    old.destroy = vi.fn(() => new Promise<void>((resolve) => { finishOld = resolve; }));
    await load("userscript", "1.1.4");
    const winner: KikiLinkPublicApi = {
      ...old,
      getVersion: () => version,
      getRuntimeInfo: () => ({ distribution, devTest: false, active: true }),
      destroy: vi.fn(async () => {}),
    };
    window.KikiLink = winner;
    finishOld();
    await Promise.resolve();
    await Promise.resolve();
    expect(window.KikiLink).toBe(winner);
    expect(winner.destroy).not.toHaveBeenCalled();
  });

  it("does not suppress a newer FUSAM hotfix or let an older standalone replace it", async () => {
    const old = await load("userscript", "1.1.3");
    const hotfix = await load("fusam", "1.1.4");
    await load("userscript", "1.1.3");

    expect(old.destroy).toHaveBeenCalledOnce();
    expect(hotfix.destroy).not.toHaveBeenCalled();
    expect(window.KikiLink).toBe(hotfix);
    expect(document.documentElement.dataset.kikilinkPageRealm).toBe("1.1.4");
  });

  it("uses release precedence for prereleases", async () => {
    const prerelease = await load("userscript", "1.1.4-rc.1");
    const release = await load("fusam", "1.1.4");
    expect(release).not.toBe(prerelease);
    expect(prerelease.destroy).toHaveBeenCalledOnce();
  });

  it("reloads a stopped standalone instead of retaining a dead runtime", async () => {
    const stopped = await load("userscript", "1.1.4");
    await stopped.destroy();
    const next = await load("fusam", "1.1.4");
    expect(next).not.toBe(stopped);
    expect(next.getRuntimeInfo?.().active).toBe(true);
  });

  it("keeps explicit same-channel reloads available for a fresh userscript bridge", async () => {
    const previous = await load("userscript", "1.1.4");
    const next = await load("userscript", "1.1.4");
    expect(next).not.toBe(previous);
    expect(previous.destroy).toHaveBeenCalledOnce();
  });

  it("does not infer upload capabilities from a marker or an unknown old API", async () => {
    const old = await load("userscript", "1.1.4");
    delete old.getRuntimeInfo;
    document.documentElement.dataset.kikilinkPageRealm = "99.0.0";
    const next = await load("fusam", "1.1.4");
    expect(next).not.toBe(old);
    expect(old.destroy).toHaveBeenCalledOnce();
  });

  it("replaces malformed or broken runtime metadata", async () => {
    const old = await load("userscript", "not-a-version");
    const next = await load("fusam", "1.1.4");
    expect(next).not.toBe(old);
    next.getRuntimeInfo = () => { throw new Error("stale runtime"); };
    expect(await load("fusam", "1.1.4")).not.toBe(next);
  });

  it("allows explicit DevTest loads and returning from DevTest to production", async () => {
    const production = await load("userscript", "1.1.4");
    const devTest = await load("fusam", "1.1.3", true);
    expect(devTest).not.toBe(production);
    expect(await load("fusam", "1.1.4")).not.toBe(devTest);
  });
});
