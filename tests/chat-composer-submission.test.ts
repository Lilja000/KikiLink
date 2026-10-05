// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { CloudDirect } from "../src/cloud/direct";
import { CommunityService } from "../src/cloud/community";
import type { CloudClient } from "../src/cloud/client";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { LinkMessage } from "../src/core/types";
import { ChatService } from "../src/modules/link-chat/chat-service";
import { LinkChatView } from "../src/modules/link-chat/view";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";

const views: LinkChatView[] = [];
afterEach(() => { for (const view of views.splice(0)) view.destroy(); document.body.replaceChildren(); vi.restoreAllMocks(); });
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
async function setup() {
  const adapter = {
    getMemberName: (member: number) => `Member ${member}`, getMemberNickname: () => undefined,
    getOwnMemberNumber: () => 999, getOwnName: () => "Kiki", getKnownContacts: () => [],
    getPlayerRelationships: () => [], canSendBeep: () => true, isReady: () => true,
    sendBeep: vi.fn((peerNumber: number, content: string, includeRoom: boolean) => ({
      direction: "outgoing" as const, peerNumber, peerName: `Member ${peerNumber}`, content, sentAt: Date.now(), includeRoom,
    })),
  } as unknown as BCAdapter;
  const storage = new MemoryKeyValueStorage();
  const settings = new SettingsStore(storage);
  const chats = new ChatService(new MemoryChatRepository(), settings);
  const view = new LinkChatView(adapter, chats, settings, "1.1.2"); views.push(view);
  const client = { memberNumber: 999, connected: false, destroy: vi.fn(), subscribe: () => () => {}, startEvents: vi.fn(), stopEvents: vi.fn(),
    peekProfile: () => undefined, request: vi.fn(async () => ({ items: [], nextCursor: null })) } as unknown as CloudClient;
  view.attachCloud(client, storage);
  view.mount(); await view.openChat(123, "Member 123");
  const shadow = document.querySelector("#kikilink-root")!.shadowRoot!;
  const input = shadow.querySelector<HTMLTextAreaElement>(".kl-composer-input")!;
  const send = shadow.querySelector<HTMLButtonElement>(".kl-send")!;
  const change = (value: string) => { input.value = value; input.dispatchEvent(new Event("input", { bubbles: true })); };
  const enter = () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true, cancelable: true }));
  const capture = (text: string) => chats.capture({ direction: "outgoing", peerNumber: 123, peerName: "Member 123", content: text, includeRoom: false, sentAt: Date.now() }, true);
  return { view, chats, shadow, input, send, change, enter, capture, adapter };
}

it.each(["Another draft", "First message", "First message + different ending", "", "> Reply to Someone: A quote\nNew answer"])(
  "clears Direct immediately before async outbox work and leaves the next draft intact: %j", async next => {
    const h = await setup();
    vi.spyOn(CloudDirect.prototype, "shouldUse").mockReturnValue(true);
    const gate = deferred<LinkMessage>();
    const send = vi.spyOn(CloudDirect.prototype, "send").mockReturnValueOnce(gate.promise);
    h.change("First message"); h.enter();
    expect(h.input.value).toBe(""); expect(h.input.disabled).toBe(false); expect(h.shadow.activeElement).toBe(h.input);
    h.change(next); h.enter(); h.enter();
    expect(send).toHaveBeenCalledOnce();
    gate.resolve(await h.capture("First message"));
    await vi.waitFor(() => expect(h.send.disabled).toBe(false));
    expect(h.input.value).toBe(next);
    expect((await h.chats.getConversation(123))?.draft).toBe(next);
    expect(h.shadow.activeElement).toBe(h.input);
  },
);

it("restores a rejected Direct submission and reply only when the new draft was never edited", async () => {
  const h = await setup();
  vi.spyOn(CloudDirect.prototype, "shouldUse").mockReturnValue(true);
  const gate = deferred<LinkMessage>();
  vi.spyOn(CloudDirect.prototype, "send").mockReturnValueOnce(gate.promise);
  const reply = "> Reply to Snowy: Quoted text\nMy reply";
  await h.chats.setDraft(123, "Member 123", reply);
  await h.view.openChat(123, "Member 123");
  expect(h.shadow.querySelector(".kl-composer-reply .kl-message-reply-author")?.textContent).toBe("Snowy");
  h.enter();
  expect(h.input.value).toBe("");
  expect(h.shadow.querySelector<HTMLElement>(".kl-composer-reply")!.hidden).toBe(true);
  gate.reject(new Error("Could not save outgoing message"));
  await vi.waitFor(() => expect(h.send.disabled).toBe(false));
  expect(h.input.value).toBe("My reply");
  expect(h.shadow.querySelector(".kl-composer-reply .kl-message-reply-author")?.textContent).toBe("Snowy");
  expect((await h.chats.getConversation(123))?.draft).toBe(reply);
  expect(h.shadow.querySelector(".kl-failed-send-actions")?.textContent).toBe("");
});

it.each(["Next message", "First message", ""])("retains a failed Direct submission separately from edited draft %j, with explicit retry", async next => {
  const h = await setup();
  vi.spyOn(CloudDirect.prototype, "shouldUse").mockReturnValue(true);
  const gate = deferred<LinkMessage>();
  const send = vi.spyOn(CloudDirect.prototype, "send").mockReturnValueOnce(gate.promise);
  h.change("First message"); h.enter(); h.change(next);
  const other = document.createElement("input"); h.shadow.append(other); other.focus();
  gate.reject(new Error("Could not save outgoing message"));
  await vi.waitFor(() => expect(h.send.disabled).toBe(false));
  expect(h.input.value).toBe(next); expect(h.shadow.activeElement).toBe(other);
  const retry = h.shadow.querySelector<HTMLButtonElement>(".kl-failed-send-actions button")!;
  expect(retry.title).toBe("First message");
  send.mockImplementationOnce(async (_peer, _name, text) => h.capture(text));
  retry.click();
  await vi.waitFor(() => expect(h.shadow.querySelector<HTMLButtonElement>(".kl-failed-send-actions")!.hidden).toBe(true));
  expect(send.mock.calls.map(call => call[2])).toEqual(["First message", "First message"]);
  expect(h.input.value).toBe(next); expect(h.shadow.activeElement).toBe(other);
  expect((await h.chats.getMessages(123)).map(message => message.content)).toEqual(["First message"]);
});

it("does not consume an identical next Direct draft when returning to the sender before a late response", async () => {
  const h = await setup();
  vi.spyOn(CloudDirect.prototype, "shouldUse").mockReturnValue(true);
  const gate = deferred<LinkMessage>();
  vi.spyOn(CloudDirect.prototype, "send").mockReturnValueOnce(gate.promise);
  h.change("First message"); h.enter(); h.change("First message");
  await h.view.openChat(456, "Other"); h.change("Other draft");
  await h.view.openChat(123, "Member 123");
  expect(h.input.value).toBe("First message");
  gate.resolve(await h.capture("First message"));
  await vi.waitFor(() => expect(h.send.disabled).toBe(false));
  expect(h.input.value).toBe("First message");
  expect((await h.chats.getConversation(456))?.draft).toBe("Other draft");
});


it("detaches before a slow relationship lookup, then submits only the captured text", async () => {
  let community!: CommunityService;
  const subscribe = CommunityService.prototype.subscribe;
  vi.spyOn(CommunityService.prototype, "subscribe").mockImplementation(function (this: CommunityService, listener) {
    community = this;
    return subscribe.call(this, listener);
  });
  const h = await setup();
  community.supported = true;
  const gate = deferred<undefined>();
  vi.spyOn(community, "get").mockReturnValueOnce(gate.promise);
  h.change("Original text"); h.enter();
  expect(h.input.value).toBe(""); expect(h.adapter.sendBeep).not.toHaveBeenCalled();
  h.change("Edited middle of next message");
  h.input.setSelectionRange(7, 13);
  gate.resolve(undefined);
  await vi.waitFor(() => expect(h.send.disabled).toBe(false));
  expect(h.adapter.sendBeep).toHaveBeenCalledWith(123, "Original text", false);
  expect(h.input.value).toBe("Edited middle of next message");
  expect(h.input.selectionStart).toBe(7); expect(h.input.selectionEnd).toBe(13);
});

it("restores a synchronous native handoff failure but does not restore an accepted send with a history error", async () => {
  const h = await setup();
  vi.mocked(h.adapter.sendBeep).mockImplementationOnce(() => { throw new Error("Disconnected"); });
  h.change("Try this text"); h.enter();
  await vi.waitFor(() => expect(h.send.disabled).toBe(false));
  expect(h.input.value).toBe("Try this text");
  expect((await h.chats.getConversation(123))?.draft).toBe("Try this text");
  vi.spyOn(h.chats, "capture").mockRejectedValueOnce(new Error("History unavailable"));
  h.enter();
  await vi.waitFor(() => expect(h.send.disabled).toBe(false));
  expect(h.input.value).toBe("");
  expect(h.shadow.querySelector<HTMLElement>(".kl-failed-send-actions")!.hidden).toBe(true);
  expect(h.shadow.querySelector(".kl-toast-message")!.textContent).toContain("was sent");
});

it("discards a failed Direct submission without touching newer text or sending it", async () => {
  const h = await setup();
  vi.spyOn(CloudDirect.prototype, "shouldUse").mockReturnValue(true);
  const gate = deferred<LinkMessage>();
  const send = vi.spyOn(CloudDirect.prototype, "send").mockReturnValueOnce(gate.promise);
  h.change("Failed original"); h.enter(); h.change("Keep this draft");
  gate.reject(new Error("Outbox full"));
  await vi.waitFor(() => expect(h.send.disabled).toBe(false));
  h.shadow.querySelector<HTMLButtonElement>('[aria-label="Discard unsent message"]')!.click();
  expect(h.input.value).toBe("Keep this draft");
  expect((await h.chats.getConversation(123))?.draft).toBe("Keep this draft");
  expect(h.shadow.querySelector<HTMLElement>(".kl-failed-send-actions")!.hidden).toBe(true);
  expect(send).toHaveBeenCalledOnce();
});
