// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import { ChatService } from "../src/modules/link-chat/chat-service";
import { LinkChatView } from "../src/modules/link-chat/view";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";

afterEach(() => {
  document.body.replaceChildren();
});

describe("LinkChatView", () => {
  it("mounts, displays a conversation, and sends through the BC adapter", async () => {
    const sendBeep = vi.fn();
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getOwnMemberNumber: () => 999,
      sendBeep,
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const service = new ChatService(new MemoryChatRepository(), settings);
    const view = new LinkChatView(adapter, service, settings, "0.2.0");

    view.mount();
    await view.openChat(123, "Reina");

    const host = document.querySelector("#kikilink-root");
    const shadow = host?.shadowRoot;
    expect((host as HTMLElement | null)?.dataset.theme).toBe("dark");
    expect(shadow?.querySelector(".kl-brand-emblem .kl-emblem-image")).not.toBeNull();
    expect(shadow?.querySelector(".kl-panel")?.hasAttribute("hidden")).toBe(false);
    expect(shadow?.querySelector(".kl-chat-name")?.textContent).toBe("Reina");
    expect((shadow?.querySelector(".kl-panel") as HTMLElement | null)?.dataset.mobileView).toBe(
      "chat",
    );

    shadow?.querySelector<HTMLButtonElement>(".kl-back")?.click();
    expect((shadow?.querySelector(".kl-panel") as HTMLElement | null)?.dataset.mobileView).toBe(
      "list",
    );

    const composer = shadow?.querySelector<HTMLTextAreaElement>(".kl-composer-input");
    if (!composer) throw new Error("Missing LinkChat composer");
    composer.value = "Hello from KikiLink";
    composer.dispatchEvent(new Event("input", { bubbles: true }));
    shadow?.querySelector<HTMLButtonElement>(".kl-send")?.click();
    await Promise.resolve();

    expect(sendBeep).toHaveBeenCalledWith(123, "Hello from KikiLink", false);

    shadow
      ?.querySelector<HTMLButtonElement>('button[title="LinkChat settings"]')
      ?.click();
    const selects = shadow?.querySelectorAll<HTMLSelectElement>(".kl-select");
    const themeSelect = selects?.item(0);
    const sideSelect = selects?.item(1);
    const reducedMotion = shadow?.querySelector<HTMLInputElement>(
      ".kl-setting-section .kl-switch input",
    );
    if (!themeSelect || !sideSelect || !reducedMotion) {
      throw new Error("Missing appearance controls");
    }
    themeSelect.value = "light";
    sideSelect.value = "left";
    reducedMotion.checked = true;
    shadow
      ?.querySelector<HTMLButtonElement>(".kl-dialog-actions .kl-text-button--primary")
      ?.click();

    expect((host as HTMLElement | null)?.dataset.theme).toBe("light");
    expect((host as HTMLElement | null)?.dataset.reducedMotion).toBe("true");
    expect((shadow?.querySelector(".kl-launcher") as HTMLElement | null)?.dataset.side).toBe(
      "left",
    );

    view.destroy();
    expect(document.querySelector("#kikilink-root")).toBeNull();
  });
});
