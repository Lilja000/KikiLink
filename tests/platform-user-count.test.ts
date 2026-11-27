// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { CloudClient } from "../src/cloud/client";
import { setupPlatformView } from "./platform-view-fixture";

vi.mock("../src/core/distribution", async importOriginal => ({
  ...await importOriginal<typeof import("../src/core/distribution")>(), KIKILINK_PLATFORM_PREVIEW: true,
}));

it("opens the shell before Cloud sign-in, fills its count when the read completes and refreshes stale values once", async () => {
  let now = Date.now();
  let complete!: (value: Response) => void;
  const reads = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
    expect(new URL(String(url)).pathname).toBe("/v1/stats/users");
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
    return new Promise<Response>(resolve => { complete = resolve; });
  });
  const sendProof = vi.fn();
  const cloud = new CloudClient({ origin: "https://cloud.example.test", memberNumber: 72385,
    getMemberNumber: () => 72385, isBlocked: () => false, now: () => now, sendProof, fetchImpl: reads });
  const { root, view } = await setupPlatformView(undefined, [], undefined, cloud);
  try {
    const count = root.querySelector(".kl-platform-wordmark .kl-platform-user-count")!;
    expect(count.textContent).toBe("Addon users: —");
    await view.open();
    expect(reads).toHaveBeenCalledTimes(1);
    complete(Response.json({ addonUsers: 3210 })); await cloud.refreshAddonUsers();
    expect(count.textContent).toBe("Addon users: 3,210");
    view.close(); await view.open();
    expect(reads).toHaveBeenCalledTimes(1);
    now += 300_001;
    view.close(); await view.open();
    complete(Response.json({ addonUsers: 3211 })); await cloud.refreshAddonUsers();
    expect(reads).toHaveBeenCalledTimes(2);
    expect(count.textContent).toBe("Addon users: 3,211");
    expect(sendProof).not.toHaveBeenCalled();
  } finally { view.destroy(); cloud.destroy(); }
});
