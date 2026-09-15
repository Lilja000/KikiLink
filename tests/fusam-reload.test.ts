// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";

const script = readFileSync(resolve(process.cwd(), process.env.KIKILINK_TEST_DIST ?? "dist", "KikiLink.fusam.js"), "utf8");

it("keeps one FUSAM runtime when two reloads overlap asynchronous previous cleanup", async () => {
  vi.useFakeTimers();
  vi.spyOn(console, "info").mockImplementation(() => {});
  let finish!: () => void;
  const cleanup = new Promise<void>(resolve => { finish = resolve; });
  const previous = { destroy: vi.fn().mockImplementationOnce(() => cleanup).mockResolvedValue(undefined) };
  window.KikiLink = previous as unknown as NonNullable<typeof window.KikiLink>;
  let newest: typeof window.KikiLink | undefined = undefined;
  try {
    window.eval(script);
    window.eval(script);
    await vi.advanceTimersByTimeAsync(0);
    newest = window.KikiLink;
    expect(newest).not.toBe(previous);
    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(window.KikiLink).toBe(newest);
    expect(document.querySelectorAll("#kikilink-version")).toHaveLength(1);
  } finally {
    finish();
    for (const api of new Set([newest, window.KikiLink])) await api?.destroy();
    await vi.advanceTimersByTimeAsync(100);
    Reflect.deleteProperty(window, "KikiLink");
    document.body.replaceChildren();
    vi.useRealTimers(); vi.restoreAllMocks();
  }
});
