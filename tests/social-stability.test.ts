// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { isKikiLinkInputEvent } from "../src/bc/keyboard";
import { syncDateSeparators } from "../src/modules/link-chat/date-separators";
import { reportForm } from "../src/cloud/report-form";
import { CloudError, type CloudClient } from "../src/cloud/client";
import { LinkChatView } from "../src/modules/link-chat/view";
import { ChatService } from "../src/modules/link-chat/chat-service";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { BCAdapter } from "../src/bc/adapter";
import type { BeepEvent } from "../src/core/types";

const dispose: Array<() => void> = [];
afterEach(() => { dispose.splice(0).forEach(fn => fn()); document.body.replaceChildren(); vi.restoreAllMocks(); });
describe("social stability regressions", () => {
  it("keeps the Direct composer enabled and focused after Send without stealing later focus", async () => {
    const adapter = {
      getOwnMemberNumber: () => 999, getOwnName: () => "Kiki", getMemberName: () => "Friend",
      getMemberNickname: () => undefined, getKnownContacts: () => [], canSendBeep: () => true,
      isReady: () => true, isInChatRoom: () => false,
      sendBeep: (peerNumber: number, content: string): BeepEvent => ({ peerNumber, peerName: "Friend", content, direction: "outgoing", sentAt: Date.now(), includeRoom: false }),
    } as unknown as BCAdapter;
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    const service = new ChatService(new MemoryChatRepository(), settings);
    const view = new LinkChatView(adapter, service, settings, "0.30.0"); dispose.push(() => view.destroy());
    view.mount(); await view.openChat(123, "Friend");
    const root = document.querySelector("#kikilink-root")!.shadowRoot!;
    const composer = root.querySelector<HTMLTextAreaElement>(".kl-composer-input")!;
    const send = root.querySelector<HTMLButtonElement>(".kl-send")!;
    composer.value = "First"; composer.dispatchEvent(new Event("input")); send.click();
    expect(composer.disabled).toBe(false);
    await vi.waitFor(() => expect(send.disabled).toBe(false));
    expect(root.activeElement).toBe(composer);
    const original = service.capture.bind(service);
    let complete!: () => void;
    vi.spyOn(service, "capture").mockImplementation(async (...args) => {
      await new Promise<void>(resolve => { complete = resolve; }); return original(...args);
    });
    composer.value = "Second"; composer.dispatchEvent(new Event("input")); send.click();
    composer.value = "Next draft"; composer.dispatchEvent(new Event("input"));
    const other = root.querySelector<HTMLInputElement>(".kl-search")!; other.focus(); complete();
    await vi.waitFor(() => expect(send.disabled).toBe(false));
    expect(root.activeElement).toBe(other);
    expect(composer.value).toBe("Next draft");
    expect((await service.getConversation(123))?.draft).toBe("Next draft");
  });
  it("detects editable shadow events at capture time without preventing their normal input", () => {
    const host = document.createElement("div"); host.id = "kikilink-root";
    const root = host.attachShadow({ mode: "open" }), input = document.createElement("textarea");
    root.append(input); document.body.append(host);
    const values: boolean[] = [];
    const capture = (e: Event) => values.push(isKikiLinkInputEvent(e));
    document.addEventListener("keydown", capture, true);
    try {
      const e = new KeyboardEvent("keydown", { code: "KeyW", key: "w", bubbles: true, composed: true, cancelable: true });
      input.dispatchEvent(e); expect(values).toEqual([true]); expect(e.defaultPrevented).toBe(false);
      host.hidden = true; input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, composed: true }));
      expect(values).toEqual([true, false]);
    } finally { document.removeEventListener("keydown", capture, true); }
  });
  it("has one date separator per contiguous local day after pagination and repeated reconciliation", () => {
    const list = document.createElement("div");
    const row = (day: number, hour: number) => { const r = document.createElement("article"); r.dataset.messageTime = String(new Date(2026, 8, day, hour).getTime()); return r; };
    list.append(row(18, 23), row(19, 0), row(19, 9)); syncDateSeparators(list);
    expect(list.querySelectorAll(".kl-date-separator")).toHaveLength(2);
    list.prepend(row(18, 10)); syncDateSeparators(list); syncDateSeparators(list);
    expect(list.querySelectorAll(".kl-date-separator")).toHaveLength(2);
    expect(list.querySelectorAll("[data-message-time]")).toHaveLength(4);
  });
  it("keeps report input after failure, prevents duplicate clicks, and confirms only saved reports", async () => {
    let fail!: (error: Error) => void;
    const request = vi.fn().mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }))
      .mockResolvedValueOnce({ id: 9 });
    const submitted = vi.fn();
    const form = reportForm({ request } as unknown as CloudClient, "post", "1", true, submitted);
    document.body.append(form);
    form.querySelector<HTMLInputElement>('input[value="spam"]')!.click();
    const comment = form.querySelector("textarea")!; comment.value = "Please review";
    const submit = form.querySelector("button")!; submit.click(); submit.click();
    expect(request).toHaveBeenCalledTimes(1); expect(submitted).not.toHaveBeenCalled();
    fail(new CloudError("cloud_temporarily_unavailable"));
    await vi.waitFor(() => expect(submit.disabled).toBe(false));
    expect(comment.value).toBe("Please review"); submit.click();
    await vi.waitFor(() => expect(form.textContent).toContain("Report submitted. Thank you."));
    expect(request.mock.calls[0]?.[2].clientId).toBe(request.mock.calls[1]?.[2].clientId);
    expect(submitted).toHaveBeenCalledOnce();
  });
  it("requires an explicit report reason and explanation for Other without sending on selection", async () => {
    const request = vi.fn().mockResolvedValue({ id: 3 });
    const form = reportForm({ request } as unknown as CloudClient, "post", "1", true, vi.fn());
    document.body.append(form);
    const submit = form.querySelector("button")!;
    submit.click(); expect(request).not.toHaveBeenCalled();
    expect(form.textContent).toContain("Choose a reason");
    form.querySelector<HTMLInputElement>('input[value="other"]')!.click();
    expect(request).not.toHaveBeenCalled(); submit.click();
    expect(form.textContent).toContain("at least 5 characters");
    const comment = form.querySelector("textarea")!; expect(comment.required).toBe(true);
    comment.value = "Please investigate this issue"; submit.click();
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    expect(request.mock.calls[0]?.[2]).toMatchObject({ reasonCode: "other", reason: "Other: Please investigate this issue" });
  });
});

it.each(['always', 'ask', 'never'] as const)('opens a full avatar with the %s policy, keeps signed links, and returns focus', async policy => {
  const { LinkPresenceService } = await import('../src/modules/link-presence/link-presence-service');
  const { EventBus } = await import('../src/core/event-bus');
  const adapter = { getOwnMemberNumber:()=>999,getOwnName:()=> 'Kiki',getMemberName:()=> 'Friend',getMemberNickname:()=>undefined,
    getKnownContacts:()=>[],getRoomCharacters:()=>[],getOnlineFriends:()=>[],getPlayerRelationships:()=>[],getCurrentRoomName:()=>undefined,
    isKnownFriend:()=>true,isMemberInCurrentRoom:()=>false,isInChatRoom:()=>false,isReady:()=>true,canSendBeep:()=>true,
    refreshOnlineFriends:()=>true,hasOnlineFriendSnapshot:()=>true,sendKikiLinkProtocol:()=>{},broadcastKikiLinkProtocol:()=>false } as unknown as BCAdapter;
  const settings=new SettingsStore(new MemoryKeyValueStorage()); settings.update(d=>{d.linkPresence.profileImagePreviews=policy;});
  const bus=new EventBus<import('../src/core/types').KikiLinkEvents>(),presence=new LinkPresenceService(adapter,settings,bus,'0.30.0');presence.start();
  const signed='https://cdn.discordapp.com/attachments/123/456/avatar.png?ex=abc&is=def&hm=123&';
  bus.emit('bc:protocol',{senderNumber:123,channel:'beep',payload:JSON.stringify({t:'ps',s:'online',a:signed,u:Date.now(),v:'0.30.0',g:3})});
  const view=new LinkChatView(adapter,new ChatService(new MemoryChatRepository(),settings),settings,'0.30.0',undefined,undefined,presence);
  dispose.push(()=>{view.destroy();presence.stop();});view.mount();await view.openChat(123,'Friend');
  const root=document.querySelector('#kikilink-root')!.shadowRoot!;
  root.querySelector<HTMLElement>('.kl-chat-header > .kl-avatar')!.click();
  await vi.waitFor(()=>expect(root.querySelectorAll('.kl-addon-profile-facts > *')).toHaveLength(3));
  const facts=[...root.querySelectorAll('.kl-addon-profile-facts > * > span')].map(x=>x.textContent);
  expect(facts).toEqual(['Current room','Last seen','Compatibility']);
  expect(root.querySelector('.kl-addon-profile-status .kl-profile-compatibility-inline')).toBeNull();
  const expand=root.querySelector<HTMLButtonElement>('.kl-avatar-expand')!;expand.focus();expand.click();
  const viewer=root.querySelector<HTMLDialogElement>('.kl-content-dialog')!;expect(viewer.open).toBe(true);
  expect(viewer.querySelector('a')!.href).toBe(signed);expect(viewer.querySelector('a')!.rel).toBe('noopener noreferrer');
  if(policy !== 'always')expect(viewer.querySelector('img')).toBeNull();
  if(policy === 'ask')viewer.querySelector<HTMLButtonElement>('.kl-full-image button')!.click();
  if(policy !== 'never'){
    const image=viewer.querySelector('img')!;expect(image.src).toBe(signed);expect(image.referrerPolicy).toBe('no-referrer');
    image.dispatchEvent(new Event('error'));expect(viewer.textContent).toContain('expired');expect(viewer.querySelector('a')).not.toBeNull();
  }
  viewer.dispatchEvent(new Event('cancel',{cancelable:true}));expect(viewer.open).toBe(false);
  expect(root.activeElement).toBe(expand);expect(root.querySelector<HTMLDialogElement>('.kl-addon-profile-dialog')!.open).toBe(true);
});
