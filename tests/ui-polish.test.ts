// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { CloudClient } from "../src/cloud/client";
import type { CommunityService } from "../src/cloud/community";
import { MailboxPopover } from "../src/cloud/mailbox-popover";
import { CLOUD_STYLES } from "../src/cloud/styles";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import { ChatService } from "../src/modules/link-chat/chat-service";
import { LINK_CHAT_STYLES } from "../src/modules/link-chat/styles";
import { LinkChatView } from "../src/modules/link-chat/view";
import { MUTE_DURATIONS } from "../src/modules/link-chat/conversation-mute";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";

const cleanup: Array<() => void | Promise<void>> = [];

afterEach(async () => {
  for (const dispose of cleanup.splice(0).reverse()) await dispose();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

async function viewHarness(options: { cloud?: boolean; chat?: boolean } = {}) {
  const adapter = {
    getMemberName: (member: number) => member === 123 ? "Reina" : "Kiki",
    getMemberNickname: () => undefined,
    getOwnMemberNumber: () => 999,
    getOwnName: () => "Kiki",
    getKnownContacts: () => [{ memberNumber: 123, memberName: "Reina" }],
    getOnlineFriends: () => [],
    getOnlineFriend: () => undefined,
    hasOnlineFriendSnapshot: () => true,
    getOnlineFriendsUpdatedAt: () => Date.now(),
    getRoomCharacters: () => [],
    getCurrentRoomName: () => undefined,
    getPlayerRelationships: () => [],
    isKnownFriend: () => true,
    isMemberInCurrentRoom: () => false,
    isInChatRoom: () => false,
    canSendBeep: () => true,
    isReady: () => true,
    sendBeep: vi.fn(),
    sendKikiLinkProtocol: vi.fn(),
    broadcastKikiLinkProtocol: vi.fn(() => false),
    setNativeFriend: vi.fn(),
  } as unknown as BCAdapter;
  const storage = new MemoryKeyValueStorage();
  const settings = new SettingsStore(storage);
  const service = new ChatService(new MemoryChatRepository(), settings);
  if (options.chat) {
    await service.capture({
      direction: "incoming", peerNumber: 123, peerName: "Reina",
      content: "Hello", sentAt: Date.now(), includeRoom: false,
    }, true);
  }
  const view = new LinkChatView(adapter, service, settings, "0.30.0");
  let client: CloudClient | undefined;
  if (options.cloud) {
    client = new CloudClient({
      origin: "https://cloud.example.test",
      memberNumber: 999,
      getMemberNumber: () => 999,
      isBlocked: () => false,
      sendProof: vi.fn(),
      fetchImpl: vi.fn(async () => Response.json({ error: "fixture_offline" }, { status: 503 })),
    });
    view.attachCloud(client, storage);
  }
  view.mount();
  if (options.chat) await view.openChat(123, "Reina");
  else await view.open();
  const shadow = document.querySelector<HTMLElement>("#kikilink-root")!.shadowRoot!;
  cleanup.push(() => { view.destroy(); client?.destroy(); });
  return { view, service, settings, shadow };
}

describe("requested interface cleanup", () => {
  it("fits editing and contact dialogs into a shortened visual viewport without widening them", async () => {
    const previous = Object.getOwnPropertyDescriptor(window, "visualViewport");
    const viewport = Object.assign(new EventTarget(), { height: 340, offsetTop: 20 });
    Object.defineProperty(window, "visualViewport", { value: viewport, configurable: true });
    cleanup.push(() => { if (previous) Object.defineProperty(window, "visualViewport", previous); else Reflect.deleteProperty(window, "visualViewport"); });
    await viewHarness();
    const host = document.querySelector<HTMLElement>("#kikilink-root")!;
    expect(host.dataset.shortViewport).toBe("true");
    expect(host.style.getPropertyValue("--kl-visible-dialog-height")).toBe("324px");
    expect(host.style.getPropertyValue("--kl-visible-dialog-top")).toBe("28px");
    viewport.height = window.innerHeight; viewport.dispatchEvent(new Event("resize"));
    expect(host.dataset.shortViewport).toBe("false");
    expect(host.style.getPropertyValue("--kl-visible-dialog-height")).toBe("");
  });
  it("uses icon-only Mailbox actions and keeps a designed empty state", async () => {
    const readMail = vi.fn(async () => {});
    const community = {
      supported: true,
      error: "",
      client: { connected: true },
      mailbox: { unread: 2, items: [], nextCursor: null },
      adapter: { getMemberName: () => "Reina" },
      subscribe: () => () => {},
      readMail,
      refresh: vi.fn(async () => {}),
      moreMail: vi.fn(async () => {}),
    } as unknown as CommunityService;
    const mailbox = new MailboxPopover(community, { open: vi.fn() });
    document.body.append(mailbox.button, mailbox.element);
    cleanup.push(() => mailbox.destroy());
    mailbox.render();

    const markAll = mailbox.element.querySelector<HTMLButtonElement>('[aria-label="Mark all read"]')!;
    const close = mailbox.element.querySelector<HTMLButtonElement>('[aria-label="Close"]')!;
    expect(markAll.textContent).toBe("");
    expect(close.textContent).toBe("");
    expect(markAll.querySelector("svg")?.dataset.icon).toBe("read-all");
    expect(markAll.classList.contains("kl-sidebar-new-chat")).toBe(true);
    expect(close.className).toBe(markAll.className);
    expect(close.querySelector("svg")?.dataset.icon).toBe("close");
    expect(mailbox.element.querySelector(".kl-mailbox-empty")?.textContent).toContain("You're all caught up.");
    markAll.click();
    await vi.waitFor(() => expect(readMail).toHaveBeenCalledOnce());
    expect(CLOUD_STYLES).toMatch(/\.kl-mailbox-header\s*\{[^}]*border-bottom:/u);
  });

  it("shows one Mute action first and all existing durations in a second sheet", async () => {
    const { service, shadow } = await viewHarness({ chat: true });
    shadow.querySelector<HTMLElement>(".kl-chat-person")!.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 80, clientY: 80 }),
    );
    await vi.waitFor(() => expect(shadow.querySelector<HTMLDialogElement>(".kl-profile-menu-layer")?.open).toBe(true));
    const labels = [...shadow.querySelectorAll(".kl-profile-menu-label")].map(node => node.textContent);
    expect(labels.filter(label => label?.startsWith("Mute"))).toEqual(["Mute"]);
    [...shadow.querySelectorAll<HTMLButtonElement>(".kl-profile-menu-action")]
      .find(button => button.querySelector(".kl-profile-menu-label")?.textContent === "Mute")!.click();

    const dialog = shadow.querySelector<HTMLDialogElement>(".kl-content-dialog")!;
    expect(dialog.open).toBe(true);
    expect([...dialog.querySelectorAll(".kl-mute-choice strong")].map(node => node.textContent))
      .toEqual(MUTE_DURATIONS.map(([label]) => label));
    expect(dialog.querySelectorAll(".kl-mute-choice small")).toHaveLength(0);
    [...dialog.querySelectorAll<HTMLButtonElement>(".kl-mute-choice")]
      .find(button => button.querySelector("strong")?.textContent === "1 hour")!.click();
    await vi.waitFor(() => expect(dialog.open).toBe(false));
    const conversation = await service.getConversation(123);
    expect(conversation?.muteUntil).toBeGreaterThan(Date.now() + 59 * 60_000);
  });

  it("keeps profile customization parallel, ordered, angle-aware, and free of editor shadows", async () => {
    const { shadow } = await viewHarness({ cloud: true });
    shadow.querySelector<HTMLButtonElement>(".kl-presence-trigger")!.click();
    const dialog = shadow.querySelector<HTMLDialogElement>(".kl-presence-dialog")!;
    expect(dialog.open).toBe(true);
    const bio = dialog.querySelector<HTMLTextAreaElement>('[aria-label="Public KikiLink profile bio"]')!;
    const preferences = dialog.querySelector<HTMLElement>(".kl-preferences-editor")!;
    expect(bio.closest(".kl-presence-field")?.nextElementSibling).toBe(preferences);

    const cards = [...dialog.querySelectorAll<HTMLElement>(".kl-profile-customization-card")];
    expect(cards.map(card => card.querySelector("strong")?.textContent)).toEqual(["Avatar decoration", "Profile card"]);
    const grid = dialog.querySelector<HTMLElement>(".kl-profile-customization-grid")!;
    expect(grid.nextElementSibling).toBe(dialog.querySelector(".kl-profile-appearance-preview"));
    const angle = dialog.querySelector<HTMLSelectElement>('[aria-label="Profile card gradient direction"]')!;
    expect([...angle.options].map(option => option.value)).toEqual(["0", "45", "90", "135", "180", "225", "270", "315"]);
    const style = dialog.querySelector<HTMLSelectElement>('[aria-label="Profile card style"]')!;
    style.value = "gradient";
    style.dispatchEvent(new Event("change", { bubbles: true }));
    angle.value = "225";
    angle.dispatchEvent(new Event("change", { bubbles: true }));
    expect(dialog.querySelector<HTMLElement>(".kl-profile-appearance-preview")?.style.getPropertyValue("--kl-profile-gradient-angle")).toBe("225deg");

    const body = dialog.querySelector<HTMLElement>(".kl-presence-body")!;
    const children = [...body.children];
    const banner = dialog.querySelector(".kl-profile-banner-field")!;
    const outline = dialog.querySelector(".kl-profile-outline-field")!;
    const tags = dialog.querySelector('[aria-label="Public profile tags"]')!.closest(".kl-presence-field")!;
    expect(children.indexOf(banner)).toBeLessThan(children.indexOf(outline));
    expect(children.indexOf(outline)).toBeLessThan(children.indexOf(tags));
    expect(LINK_CHAT_STYLES).toMatch(/\.kl-profile-appearance-preview\s*\{[^}]*box-shadow:\s*none\s*!important/u);
    expect(LINK_CHAT_STYLES).toMatch(/\.kl-profile-banner-preview::after\s*\{[^}]*display:\s*none/u);
  });

  it("moves Requests into the Players toolbar and removes the lower All control", async () => {
    const { shadow } = await viewHarness({ cloud: true });
    shadow.querySelector<HTMLButtonElement>('[data-target="roster"]')!.click();
    const toolbar = shadow.querySelector<HTMLElement>(".kl-players-toolbar")!;
    expect([...toolbar.querySelectorAll("button")].map(button => button.textContent)).toEqual(["New chat", "Add friends", "Requests"]);
    const requests = toolbar.querySelector<HTMLButtonElement>(".kl-players-requests")!;
    expect(requests.querySelector("svg")?.dataset.icon).toBe("requests");
    expect([...shadow.querySelectorAll(".kl-roster-scopes button")].map(button => button.textContent))
      .toEqual(["In room", "Friends", "Known"]);
    expect(shadow.querySelector(".kl-friend-navigation")?.textContent).not.toContain("All");
    requests.click();
    expect([...shadow.querySelectorAll(".kl-request-segments button")].map(button => button.textContent))
      .toEqual(["Received", "Sent"]);
    expect(shadow.querySelector<HTMLElement>(".kl-roster-filters")!.hidden).toBe(true);
    expect(LINK_CHAT_STYLES).toMatch(/@media \(max-width: 720px\)[\s\S]*?\.kl-players-toolbar\.kl-cloud-actions\s*\{[^}]*grid-template-columns:\s*repeat\(3,/u);
  });

  it("assigns the New chat and Mark as read icons to their matching actions", async () => {
    const { shadow } = await viewHarness();
    const newChat = shadow.querySelector<HTMLButtonElement>('[aria-label="New Beep chat"]')!;
    const markRead = shadow.querySelector<HTMLButtonElement>(".kl-sidebar-read-all")!;
    expect(newChat.querySelector("svg")?.dataset.icon).toBe("direct-add");
    expect(markRead.querySelector("svg")?.dataset.icon).toBe("read-all");
  });
});
