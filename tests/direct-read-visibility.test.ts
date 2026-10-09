// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import { ChatService } from "../src/modules/link-chat/chat-service";
import { LinkChatView } from "../src/modules/link-chat/view";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";

const disposers: Array<() => void> = [];
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
  document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
async function setup() {
  const adapter = {
    getMemberName: () => "Friend", getMemberNickname: () => undefined,
    getOwnMemberNumber: () => 101, getOwnName: () => "Kiki", getKnownContacts: () => [],
    canSendBeep: () => true, isReady: () => true, sendBeep: vi.fn(),
  } as unknown as BCAdapter;
  const settings = new SettingsStore(new MemoryKeyValueStorage());
  const chat = new ChatService(new MemoryChatRepository(), settings);
  const read = vi.fn(); chat.onCloudRead = read;
  const view = new LinkChatView(adapter, chat, settings, "1.1.3");
  disposers.push(() => view.destroy());
  view.mount(); await view.openChat(202, "Friend");
  await new Promise(requestAnimationFrame);
  const shadow = document.querySelector("#kikilink-root")!.shadowRoot!;
  async function receive(sequence = 1) {
    const { message } = await chat.captureCloud({ direction: "incoming", peerNumber: 202, peerName: "Friend",
      content: "A visible message", sentAt: Date.now(), includeRoom: false },
    { id: `cloud-in:${sequence}`, cloudSequence: sequence }, false);
    await view.onMessage(202, true, message);
  }
  return { chat, view, shadow, read, receive };
}
it.each(["workspace", "panel"])("acknowledges an already-rendered Direct message when returning to its %s", async kind => {
  const h = await setup();
  if (kind === "workspace") h.shadow.querySelector<HTMLButtonElement>('[data-target="home"]')!.click();
  else h.view.close();
  await h.receive(); await new Promise(requestAnimationFrame);
  expect(h.read).not.toHaveBeenCalled();
  expect((await h.chat.getConversation(202))?.unread).toBe(1);
  if (kind === "workspace") h.shadow.querySelector<HTMLButtonElement>('[data-target="chat"]')!.click();
  else await h.view.open();
  await vi.waitFor(() => expect(h.read).toHaveBeenCalledWith(202, 1));
  expect((await h.chat.getConversation(202))?.unread).toBe(0);
});
it("does not infer reading from typing while viewing older messages, but acknowledges when the latest messages become visible", async () => {
  const h = await setup();
  const messages = h.shadow.querySelector<HTMLElement>(".kl-messages")!;
  Object.defineProperties(messages, { scrollHeight: { configurable: true, value: 2000 }, clientHeight: { configurable: true, value: 300 } });
  messages.scrollTop = 0;
  await h.receive();
  const composer = h.shadow.querySelector<HTMLTextAreaElement>(".kl-composer-input")!;
  composer.value = "Still reading earlier messages"; composer.dispatchEvent(new Event("input"));
  await new Promise(requestAnimationFrame);
  expect(h.read).not.toHaveBeenCalled();
  expect((await h.chat.getConversation(202))?.unread).toBe(1);
  // Layout/focus can expose the bottom without a scroll event, for example a mobile keyboard closing.
  messages.scrollTop = 1700;
  composer.dispatchEvent(new Event("input"));
  await vi.waitFor(() => expect(h.read).toHaveBeenCalledWith(202, 1));
});
it("keeps a hidden browser document unread even if the selected composer emits input", async () => {
  const h = await setup();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  await h.receive();
  const composer = h.shadow.querySelector<HTMLTextAreaElement>(".kl-composer-input")!;
  composer.value = "Draft"; composer.dispatchEvent(new Event("input"));
  await new Promise(requestAnimationFrame);
  expect(h.read).not.toHaveBeenCalled();
  expect((await h.chat.getConversation(202))?.unread).toBe(1);
});
