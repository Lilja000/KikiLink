// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import { LauncherMenu } from "../src/modules/link-chat/launcher-menu";
afterEach(() => { vi.useRealTimers(); document.body.replaceChildren(); });
it("shows mute durations only while unmuted, unmute only while muted, and follows expiry", () => {
  vi.useFakeTimers();
  const settings = new SettingsStore(new MemoryKeyValueStorage());
  const anchor = document.createElement("button"), menu = new LauncherMenu(settings, vi.fn());
  document.body.append(anchor, menu.element);
  try {
    menu.open(anchor);
    const resume = menu.element.querySelector<HTMLButtonElement>(".kl-launcher-unmute")!;
    expect(resume.hidden).toBe(true);
    const hour = menu.element.querySelector<HTMLButtonElement>('[aria-label="Mute for 1 hour"]')!;
    hour.click(); expect(resume.hidden).toBe(false);
    expect(menu.element.querySelector<HTMLElement>(".kl-launcher-mute-options")!.hidden).toBe(true);
    vi.advanceTimersByTime(3600021); expect(resume.hidden).toBe(true);
    menu.element.querySelector<HTMLButtonElement>('[aria-label="Mute until I unmute"]')!.click();
    menu.close(); menu.open(anchor);
    expect(menu.element.querySelector<HTMLButtonElement>(".kl-launcher-unmute")!.hidden).toBe(false);
    menu.element.querySelector<HTMLButtonElement>(".kl-launcher-unmute")!.click();
    expect(settings.get().ui.notificationsMutedUntil).toBe(0);
    expect(menu.element.textContent).not.toMatch(/Resume notifications|Until I resume/);
  } finally { menu.destroy(); }
});
