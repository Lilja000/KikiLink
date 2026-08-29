// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryKeyValueStorage } from "../src/core/settings";
import type { PresenceSnapshot } from "../src/core/types";
import {
  GROUP_MESSAGE_MAX_CONTENT,
  GroupChatService,
  parseGroupChatPacket,
  serializeGroupChatPacket,
  type GroupMessage,
  type GroupSendResult,
  type GroupChatTransport,
} from "../src/modules/link-chat/group-chat-service";
import {
  GroupChatPanel,
  type GroupChatPanelAdapter,
  type GroupChatPanelFeedback,
  type GroupChatPanelMemberTarget,
  type GroupChatPanelOptions,
  type GroupChatPanelPresence,
} from "../src/modules/link-chat/group-chat-panel";

interface SentPacket {
  target: number;
  payload: string;
}

interface PanelHarness {
  service: GroupChatService;
  adapter: GroupChatPanelAdapter;
  presence: GroupChatPanelPresence;
  sent: SentPacket[];
  failed: Set<number>;
  compatible: Set<number>;
  relayCompatible: Set<number>;
  knownFriends: Set<number>;
  statuses: Map<number, PresenceSnapshot["status"]>;
  presenceListeners: Set<(memberNumber?: number) => void>;
  avatarRenders: ReturnType<
    typeof vi.fn<(target: HTMLElement, member: GroupChatPanelMemberTarget) => void>
  >;
  boundProfileTargets: ReturnType<
    typeof vi.fn<(target: HTMLButtonElement, member: GroupChatPanelMemberTarget) => void>
  >;
  openedProfiles: number[];
  feedback: GroupChatPanelFeedback[];
  onActivate: ReturnType<typeof vi.fn<(groupId: string) => void>>;
  onClose: ReturnType<typeof vi.fn<() => void>>;
  panel: GroupChatPanel;
}

const names = new Map<number, string>([
  [10, "Kiki"],
  [20, "Reina"],
  [30, "Mina"],
  [40, "Luna"],
  [50, "Sara"],
  [60, "Aya"],
  [70, "No Addon"],
]);

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function setup(
  storage = new MemoryKeyValueStorage(),
  optionOverrides: Partial<GroupChatPanelOptions> = {},
): PanelHarness {
  const sent: SentPacket[] = [];
  const failed = new Set<number>();
  const compatible = new Set<number>([20, 30, 40, 50, 60]);
  const relayCompatible = new Set<number>([20, 30, 40, 50, 60]);
  const knownFriends = new Set<number>([20, 30, 40, 50, 60, 70]);
  const statuses = new Map<number, PresenceSnapshot["status"]>();
  const presenceListeners = new Set<(memberNumber?: number) => void>();
  const avatarRenders = vi.fn((target: HTMLElement, member: GroupChatPanelMemberTarget) => {
    target.textContent = member.memberName.slice(0, 1);
    target.dataset.renderedMember = String(member.memberNumber);
  });
  const openedProfiles: number[] = [];
  const boundProfileTargets = vi.fn(
    (target: HTMLButtonElement, member: GroupChatPanelMemberTarget) => {
      target.addEventListener("click", () => openedProfiles.push(member.memberNumber));
    },
  );
  const feedback: GroupChatPanelFeedback[] = [];
  const onActivate = vi.fn<(groupId: string) => void>();
  const onClose = vi.fn<() => void>();
  let id = 0;
  const transport: GroupChatTransport = {
    getOwnMemberNumber: () => 10,
    getMemberName: (memberNumber) => names.get(memberNumber) ?? `Member ${memberNumber}`,
    sendKikiLinkProtocol: (target, payload) => {
      sent.push({ target, payload });
      if (failed.has(target)) throw new Error(`${target} is offline`);
    },
    isKnownFriend: () => true,
    isMemberInCurrentRoom: () => false,
    getPlayerRelationships: () => [],
  };
  const adapter: GroupChatPanelAdapter = {
    getOwnMemberNumber: transport.getOwnMemberNumber,
    getMemberName: transport.getMemberName,
    isKnownFriend: (memberNumber) => knownFriends.has(memberNumber),
    getKnownContacts: () => [20, 30, 40, 50, 60, 70].map((memberNumber) => ({
      memberNumber,
      memberName: names.get(memberNumber) ?? `Member ${memberNumber}`,
    })),
  };
  const presence: GroupChatPanelPresence = {
    get: (memberNumber): PresenceSnapshot => ({
      memberNumber,
      status: statuses.get(memberNumber) ?? "online",
      source: "kikilink",
      updatedAt: 1_000_000,
      addonVersion: "0.24.0",
    }),
    hasGroupChatPeer: (memberNumber) => compatible.has(memberNumber),
    hasGroupRelayPeer: (memberNumber) => relayCompatible.has(memberNumber),
    request: vi.fn(() => true),
    requestMany: vi.fn(() => 0),
    subscribe: (listener) => {
      presenceListeners.add(listener);
      return () => presenceListeners.delete(listener);
    },
  };
  const service = new GroupChatService(transport, storage, {
    now: () => 1_000_000,
    idFactory: (prefix) => `${prefix}_${(++id).toString(36).padStart(8, "0")}`,
  });
  const panel = new GroupChatPanel(adapter, service, presence, {
    onActivate,
    onClose,
    onFeedback: (entry) => feedback.push(entry),
    confirmRemove: () => true,
    renderMemberAvatar: avatarRenders,
    bindMemberProfileTarget: boundProfileTargets,
    ...optionOverrides,
  });
  document.body.append(panel.sidebarSection, panel.chatPane, panel.newGroupDialog);
  return {
    service,
    adapter,
    presence,
    sent,
    failed,
    compatible,
    relayCompatible,
    knownFriends,
    statuses,
    presenceListeners,
    avatarRenders,
    boundProfileTargets,
    openedProfiles,
    feedback,
    onActivate,
    onClose,
    panel,
  };
}

function required<ElementType extends Element>(
  root: ParentNode,
  selector: string,
): ElementType {
  const result = root.querySelector<ElementType>(selector);
  if (!result) throw new Error(`Missing test element: ${selector}`);
  return result;
}

function click(root: ParentNode, selector: string): HTMLButtonElement {
  const target = required<HTMLButtonElement>(root, selector);
  target.click();
  return target;
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function deferred<Value>(): {
  promise: Promise<Value>;
  resolve: (value: Value) => void;
} {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe("GroupChatPanel group creation", () => {
  it("prioritizes searched friends beyond the bounded bulk discovery page", () => {
    const harness = setup();
    const distantContact = { memberNumber: 999, memberName: "Zelda" };
    const earlierContacts = Array.from({ length: 65 }, (_, index) => ({
      memberNumber: 1_000 + index,
      memberName: `A contact ${index.toString().padStart(2, "0")}`,
    }));
    vi.spyOn(harness.adapter, "getKnownContacts").mockReturnValue([
      ...earlierContacts,
      distantContact,
    ]);
    vi.spyOn(harness.adapter, "isKnownFriend").mockImplementation(
      (memberNumber) => memberNumber === distantContact.memberNumber,
    );

    harness.panel.openNewGroupDialog();
    const search = required<HTMLInputElement>(
      harness.panel.newGroupDialog,
      ".kl-group-contact-search",
    );
    search.value = "Zelda";
    search.dispatchEvent(new Event("input", { bubbles: true }));

    expect(harness.presence.request).toHaveBeenCalledWith(distantContact.memberNumber);
  });

  it("fails closed without throwing when the local player identity is temporarily guarded", () => {
    const harness = setup();
    vi.spyOn(harness.adapter, "getOwnMemberNumber").mockImplementation(() => {
      throw new Error("Permission denied to access object");
    });

    expect(() => harness.panel.openNewGroupDialog()).not.toThrow();
    expect(harness.panel.newGroupDialog.open).toBe(true);
    expect(harness.panel.newGroupDialog.querySelectorAll(".kl-group-contact")).toHaveLength(0);
    expect(harness.panel.newGroupDialog.textContent).toContain("No relay-capable contacts");
  });

  it("selects only detected peers, caps selection, and sends only after final confirmation", async () => {
    const harness = setup();

    expect(harness.panel.sidebarSection.className).toBe("kl-group-sidebar");
    expect(harness.panel.chatPane.className).toBe("kl-group-pane");
    expect(harness.panel.newGroupDialog.className).toBe("kl-group-dialog");
    expect(harness.panel.nodes.sidebarSection).toBe(harness.panel.sidebarSection);

    harness.panel.openNewGroupDialog();
    expect(harness.panel.newGroupDialog.open).toBe(true);
    expect(harness.panel.newGroupDialog.querySelector("[data-member-number='70']")).toBeNull();
    expect(harness.panel.newGroupDialog.querySelectorAll(".kl-group-contact")).toHaveLength(5);

    click(harness.panel.newGroupDialog, "[data-member-number='20']");
    click(harness.panel.newGroupDialog, "[data-member-number='30']");
    click(harness.panel.newGroupDialog, "[data-member-number='40']");
    click(harness.panel.newGroupDialog, "[data-member-number='50']");
    expect(required<HTMLButtonElement>(
      harness.panel.newGroupDialog,
      "[data-member-number='60']",
    ).disabled).toBe(true);
    expect(required(harness.panel.newGroupDialog, ".kl-group-selection-status").textContent)
      .toBe("4 of 2–4 contacts selected");

    click(harness.panel.newGroupDialog, "[data-member-number='50']");
    click(harness.panel.newGroupDialog, "[data-member-number='40']");
    const title = required<HTMLInputElement>(harness.panel.newGroupDialog, ".kl-group-title-input");
    title.value = "Garden Club";
    title.dispatchEvent(new Event("input", { bubbles: true }));

    harness.failed.add(30);
    click(harness.panel.newGroupDialog, "[data-review='true']");
    expect(harness.sent).toHaveLength(0);
    expect(harness.service.listGroups()).toHaveLength(0);
    expect(harness.panel.newGroupDialog.textContent).toContain("No invitations have been sent yet");

    click(harness.panel.newGroupDialog, "[data-confirm-create='true']");
    await vi.waitFor(() => expect(harness.service.listGroups()).toHaveLength(1));
    const [group] = harness.service.listGroups();
    expect(group?.title).toBe("Garden Club");
    expect(group?.memberNumbers).toEqual([10, 20, 30]);
    expect(harness.sent
      .filter((packet) => parseGroupChatPacket(packet.payload)?.t === "gi")
      .map((packet) => packet.target)).toEqual([20, 30]);
    expect(harness.panel.activeGroupId).toBe(group?.groupId);
    expect(harness.onActivate).toHaveBeenCalledWith(group?.groupId);
    expect(harness.feedback.at(-1)).toMatchObject({
      tone: "warning",
      handedOffTo: [20],
      failed: [{ memberNumber: 30 }],
    });
    expect(harness.panel.chatPane.textContent).toContain(
      "Handed 1 invitation to the local Bondage Club client; 1 local handoff failed",
    );
  });

  it("never offers a detected current-room non-friend that would reject the invitation", () => {
    const harness = setup();
    harness.knownFriends.delete(60);

    harness.panel.openNewGroupDialog();

    expect(harness.panel.newGroupDialog.querySelector("[data-member-number='60']")).toBeNull();
    expect(harness.panel.newGroupDialog.textContent).toContain("relay-capable friends");
  });

  it("offers only relay-capable peers for new groups and fails closed without v2 discovery", () => {
    const harness = setup();
    harness.relayCompatible.delete(60);
    harness.panel.openNewGroupDialog();

    expect(harness.panel.newGroupDialog.querySelector("[data-member-number='60']")).toBeNull();
    expect(harness.panel.newGroupDialog.textContent).toContain("relay-capable");

    harness.panel.newGroupDialog.close();
    delete harness.presence.hasGroupRelayPeer;
    harness.panel.openNewGroupDialog();

    expect(harness.panel.newGroupDialog.querySelectorAll(".kl-group-contact")).toHaveLength(0);
    expect(harness.panel.newGroupDialog.textContent).toContain("No relay-capable contacts");
  });

  it("shows profile-capable avatars beside selection and confirmation controls without nesting buttons", () => {
    const harness = setup();
    harness.panel.openNewGroupDialog();

    const reinaSelection = required<HTMLButtonElement>(
      harness.panel.newGroupDialog,
      "[data-member-number='20']",
    );
    const contactItem = reinaSelection.closest<HTMLElement>(".kl-group-contact-item");
    if (!contactItem) throw new Error("Missing Reina contact item");
    const profile = required<HTMLButtonElement>(contactItem, ".kl-group-contact-profile");
    const selection = required<HTMLButtonElement>(contactItem, ".kl-group-contact");
    expect(profile.parentElement).toBe(contactItem);
    expect(selection.parentElement).toBe(contactItem);
    expect(contactItem.querySelector("button button")).toBeNull();
    expect(profile.getAttribute("aria-label")).toContain("Open KikiLink profile for Reina");
    profile.focus();
    for (const listener of harness.presenceListeners) listener(20);
    const refreshedProfile = required<HTMLButtonElement>(
      harness.panel.newGroupDialog,
      ".kl-group-contact-profile[data-group-member-number='20']",
    );
    expect(document.activeElement).toBe(refreshedProfile);
    refreshedProfile.click();
    expect(harness.openedProfiles).toEqual([20]);

    click(harness.panel.newGroupDialog, "[data-member-number='20']");
    click(harness.panel.newGroupDialog, "[data-member-number='30']");
    click(harness.panel.newGroupDialog, "[data-review='true']");

    expect(harness.panel.newGroupDialog.querySelectorAll(".kl-group-confirm-profile"))
      .toHaveLength(2);
    expect(harness.panel.newGroupDialog.querySelector("button button")).toBeNull();
    expect(harness.avatarRenders).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ memberNumber: 20, memberName: "Reina" }),
    );
  });

  it("previews the same generated title that the service stores", async () => {
    const harness = setup();
    harness.panel.openNewGroupDialog();
    click(harness.panel.newGroupDialog, "[data-member-number='20']");
    click(harness.panel.newGroupDialog, "[data-member-number='30']");
    click(harness.panel.newGroupDialog, "[data-review='true']");

    const previewedTitle = required(
      harness.panel.newGroupDialog,
      ".kl-group-confirm-summary",
    ).textContent;
    expect(previewedTitle).toBe("Group with Reina, Mina");

    click(harness.panel.newGroupDialog, "[data-confirm-create='true']");
    await vi.waitFor(() => expect(harness.service.listGroups()).toHaveLength(1));
    expect(harness.service.listGroups()[0]?.title).toBe(previewedTitle);
  });

  it("does not split an emoji at the UTF-16 title boundary", async () => {
    const harness = setup();
    harness.panel.openNewGroupDialog();
    const title = required<HTMLInputElement>(
      harness.panel.newGroupDialog,
      ".kl-group-title-input",
    );
    title.value = `${"a".repeat(59)}🌸`;
    title.dispatchEvent(new Event("input", { bubbles: true }));
    click(harness.panel.newGroupDialog, "[data-member-number='20']");
    click(harness.panel.newGroupDialog, "[data-member-number='30']");
    click(harness.panel.newGroupDialog, "[data-review='true']");

    const previewedTitle = required(
      harness.panel.newGroupDialog,
      ".kl-group-confirm-summary",
    ).textContent;
    expect(previewedTitle).toBe("a".repeat(59));
    expect(previewedTitle).not.toContain("�");

    click(harness.panel.newGroupDialog, "[data-confirm-create='true']");
    await vi.waitFor(() => expect(harness.service.listGroups()).toHaveLength(1));
    expect(harness.service.listGroups()[0]?.title).toBe(previewedTitle);
  });
});

describe("GroupChatPanel conversation pane", () => {
  it("notifies the host before waiting for mark-read persistence", async () => {
    const harness = setup();
    const creation = await harness.service.createGroup([20, 30], "Atomic pane switch");
    const markRead = deferred<void>();
    vi.spyOn(harness.service, "markRead").mockImplementation(() => markRead.promise);

    const activation = harness.panel.activate(creation.group.groupId);

    expect(harness.panel.chatPane.hidden).toBe(false);
    expect(harness.onActivate).toHaveBeenCalledOnce();
    expect(harness.onActivate).toHaveBeenCalledWith(creation.group.groupId);

    markRead.resolve();
    await expect(activation).resolves.toBe(true);
  });

  it("renders unread and author labels, enforces 246 characters, and reports partial sends", async () => {
    const harness = setup();
    const creation = await harness.service.createGroup([20, 30], "Moonlight Crew");
    harness.sent.splice(0);
    await harness.service.receiveProtocol({
      senderNumber: 20,
      payload: serializeGroupChatPacket({
        t: "gm",
        v: 1,
        g: creation.group.groupId,
        i: "gmsg_aaaaaaaa",
        c: "Are we ready?",
        u: 1_000_000,
      }),
    });

    expect(required(harness.panel.sidebarSection, ".kl-group-list-unread").textContent).toBe("1");
    await harness.panel.activate(creation.group.groupId);
    expect(harness.panel.chatPane.hidden).toBe(false);
    expect(harness.panel.chatPane.textContent).toContain("3 members");
    expect(required(harness.panel.chatPane, ".kl-group-message-author").textContent).toBe("Reina");
    expect(harness.service.getGroup(creation.group.groupId)?.unread).toBe(0);

    const composer = required<HTMLTextAreaElement>(harness.panel.chatPane, ".kl-group-composer");
    expect(composer.maxLength).toBe(GROUP_MESSAGE_MAX_CONTENT);
    composer.value = "x".repeat(GROUP_MESSAGE_MAX_CONTENT + 10);
    composer.dispatchEvent(new Event("input", { bubbles: true }));
    expect(composer.value).toHaveLength(GROUP_MESSAGE_MAX_CONTENT);
    expect(required(harness.panel.chatPane, ".kl-group-composer-counter").textContent)
      .toBe(`${GROUP_MESSAGE_MAX_CONTENT}/${GROUP_MESSAGE_MAX_CONTENT}`);

    composer.value = "Hello everyone";
    composer.dispatchEvent(new Event("input", { bubbles: true }));
    harness.failed.add(30);
    click(harness.panel.chatPane, ".kl-group-send");
    await vi.waitFor(() => expect(harness.service.getMessages(creation.group.groupId)).toHaveLength(2));
    expect(composer.value).toBe("");
    expect(required(harness.panel.chatPane, ".kl-group-feedback").textContent)
      .toContain("1 participant remains unreachable");
    expect(new Set([...harness.panel.chatPane.querySelectorAll(".kl-group-message-author")]
      .map((element) => element.textContent))).toEqual(new Set(["Reina", "You"]));
    expect(harness.feedback.at(-1)).toMatchObject({
      tone: "warning",
      handedOffTo: [20],
      failed: [{ memberNumber: 30 }],
    });
  });

  it("exposes prominent aggregate hooks, avatar stacks, and group search across member data", async () => {
    const harness = setup();
    const first = await harness.service.createGroup([20, 30], "Moon Garden");
    await harness.service.createGroup([40, 50], "Night Watch");
    await harness.service.receiveProtocol({
      senderNumber: 20,
      payload: serializeGroupChatPacket({
        t: "gm",
        v: 1,
        g: first.group.groupId,
        i: "gmsg_search001",
        c: "Meet by the fountain",
        u: 1_000_000,
      }),
    });

    expect(harness.panel.sidebarSection.dataset.groupCount).toBe("2");
    expect(harness.panel.sidebarSection.dataset.unread).toBe("1");
    expect(harness.panel.sidebarSection.dataset.hasUnread).toBe("true");
    expect(required(harness.panel.sidebarSection, ".kl-group-sidebar-count").textContent).toBe("2");
    expect(required(harness.panel.sidebarSection, ".kl-group-sidebar-unread").textContent).toBe("1");
    expect(harness.panel.sidebarSection.querySelectorAll(".kl-group-avatar-stack")).toHaveLength(2);
    expect(harness.panel.sidebarSection.querySelector("button button")).toBeNull();

    harness.panel.setSearchQuery("Luna");
    expect(harness.panel.sidebarSection.querySelectorAll(".kl-group-list-item")).toHaveLength(1);
    expect(harness.panel.sidebarSection.textContent).toContain("Night Watch");
    expect(harness.panel.sidebarSection.textContent).not.toContain("Moon Garden");

    harness.panel.setSearchQuery("20");
    expect(harness.panel.sidebarSection.querySelectorAll(".kl-group-list-item")).toHaveLength(1);
    expect(harness.panel.sidebarSection.textContent).toContain("Moon Garden");

    harness.panel.setSearchQuery("no such group");
    expect(harness.panel.sidebarSection.querySelectorAll(".kl-group-list-item")).toHaveLength(0);
    expect(harness.panel.sidebarSection.textContent).toContain("No group chats match this search");
    expect(harness.panel.sidebarSection.dataset.groupCount).toBe("2");
    expect(harness.panel.sidebarSection.dataset.unread).toBe("1");

    harness.panel.setSearchQuery("");
    expect(harness.panel.sidebarSection.querySelectorAll(".kl-group-list-item")).toHaveLength(2);
  });

  it("shows clickable participant and author avatars without nested interactive controls", async () => {
    const harness = setup();
    const creation = await harness.service.createGroup([20, 30], "Profile Crew");
    await harness.service.receiveProtocol({
      senderNumber: 20,
      payload: serializeGroupChatPacket({
        t: "gm",
        v: 1,
        g: creation.group.groupId,
        i: "gmsg_profile01",
        c: "Open my profile",
        u: 1_000_000,
      }),
    });
    await harness.panel.activate(creation.group.groupId);

    const participants = harness.panel.chatPane.querySelectorAll<HTMLButtonElement>(
      ".kl-group-participant",
    );
    expect(participants).toHaveLength(3);
    const reina = required<HTMLButtonElement>(
      harness.panel.chatPane,
      ".kl-group-participant[data-group-member-number='20']",
    );
    expect(reina.getAttribute("aria-label")).toContain("Open KikiLink profile for Reina");
    reina.click();
    const messageProfile = required<HTMLButtonElement>(
      harness.panel.chatPane,
      ".kl-group-message-profile[data-group-member-number='20']",
    );
    messageProfile.click();

    expect(harness.openedProfiles).toEqual([20, 20]);
    expect(harness.panel.chatPane.querySelector("button button")).toBeNull();
    expect(messageProfile.querySelector(".kl-group-member-avatar")).not.toBeNull();
  });

  it("keeps existing message nodes while appending a newly received group message", async () => {
    const harness = setup();
    const creation = await harness.service.createGroup([20, 30], "Incremental Crew");
    await harness.service.receiveProtocol({
      senderNumber: 20,
      payload: serializeGroupChatPacket({
        t: "gm",
        v: 1,
        g: creation.group.groupId,
        i: "gmsg_before01",
        c: "First",
        u: 1_000_000,
      }),
    });
    await harness.panel.activate(creation.group.groupId);
    const firstNode = required<HTMLElement>(
      harness.panel.chatPane,
      "[data-message-id='gmsg_before01']",
    );
    const sidebarStack = required<HTMLElement>(
      harness.panel.sidebarSection,
      ".kl-group-avatar-stack",
    );

    await harness.service.receiveProtocol({
      senderNumber: 30,
      payload: serializeGroupChatPacket({
        t: "gm",
        v: 1,
        g: creation.group.groupId,
        i: "gmsg_after001",
        c: "Second",
        u: 1_000_001,
      }),
    });

    expect(required(harness.panel.chatPane, "[data-message-id='gmsg_before01']")).toBe(firstNode);
    expect(harness.panel.chatPane.querySelectorAll(".kl-group-message")).toHaveLength(2);
    expect(required(harness.panel.sidebarSection, ".kl-group-avatar-stack")).toBe(sidebarStack);
  });

  it("does not reuse a keyed message node when two groups contain the same message id", async () => {
    const harness = setup();
    const first = await harness.service.createGroup([20, 30], "First Crew");
    const second = await harness.service.createGroup([40, 50], "Second Crew");
    const sharedMessageId = "gmsg_shared001";
    await harness.service.receiveProtocol({
      senderNumber: 20,
      payload: serializeGroupChatPacket({
        t: "gm",
        v: 1,
        g: first.group.groupId,
        i: sharedMessageId,
        c: "First group content",
        u: 1_000_000,
      }),
    });
    await harness.service.receiveProtocol({
      senderNumber: 40,
      payload: serializeGroupChatPacket({
        t: "gm",
        v: 1,
        g: second.group.groupId,
        i: sharedMessageId,
        c: "Second group content",
        u: 1_000_001,
      }),
    });

    await harness.panel.activate(first.group.groupId);
    const firstNode = required<HTMLElement>(
      harness.panel.chatPane,
      `[data-message-id="${sharedMessageId}"]`,
    );
    expect(firstNode.querySelector(".kl-group-message-author")?.textContent).toBe("Reina");
    expect(firstNode.querySelector(".kl-group-message-content")?.textContent)
      .toBe("First group content");

    await harness.panel.activate(second.group.groupId);
    const secondNode = required<HTMLElement>(
      harness.panel.chatPane,
      `[data-message-id="${sharedMessageId}"]`,
    );
    expect(secondNode).not.toBe(firstNode);
    expect(secondNode.querySelector(".kl-group-message-author")?.textContent).toBe("Luna");
    expect(secondNode.querySelector(".kl-group-message-content")?.textContent)
      .toBe("Second group content");
    expect(harness.panel.chatPane.textContent).not.toContain("First group content");
  });

  it("bounds the initial transcript and loads older messages without recreating visible nodes", async () => {
    const harness = setup();
    const creation = await harness.service.createGroup([20, 30], "History Crew");
    const messages = Array.from({ length: 135 }, (_, index): GroupMessage => ({
      id: `gmsg_history${index.toString(36).padStart(4, "0")}`,
      groupId: creation.group.groupId,
      senderNumber: index % 2 === 0 ? 20 : 30,
      senderName: index % 2 === 0 ? "Reina" : "Mina",
      direction: "incoming",
      content: `History ${index}`,
      sentAt: 1_000_000 + index,
      read: false,
    }));
    vi.spyOn(harness.service, "getMessages").mockReturnValue(messages);

    await harness.panel.activate(creation.group.groupId);
    expect(harness.panel.chatPane.querySelectorAll(".kl-group-message")).toHaveLength(120);
    const retained = required<HTMLElement>(
      harness.panel.chatPane,
      `[data-message-id="${messages[15]!.id}"]`,
    );
    const loadOlder = required<HTMLButtonElement>(
      harness.panel.chatPane,
      ".kl-group-load-older",
    );
    expect(loadOlder.hidden).toBe(false);
    expect(loadOlder.textContent).toContain("15");

    loadOlder.click();

    expect(harness.panel.chatPane.querySelectorAll(".kl-group-message")).toHaveLength(135);
    expect(required(
      harness.panel.chatPane,
      `[data-message-id="${messages[15]!.id}"]`,
    )).toBe(retained);
    expect(loadOlder.hidden).toBe(true);
    expect(document.activeElement).toBe(
      required<HTMLElement>(harness.panel.chatPane, ".kl-group-message-log"),
    );
  });

  it("honors the direct-chat Enter preference while always supporting Ctrl+Enter", async () => {
    const harness = setup(new MemoryKeyValueStorage(), { getEnterToSend: () => false });
    const creation = await harness.service.createGroup([20, 30], "Keyboard Crew");
    harness.sent.splice(0);
    await harness.panel.activate(creation.group.groupId);
    const composer = required<HTMLTextAreaElement>(harness.panel.chatPane, ".kl-group-composer");
    composer.value = "Keep the newline";
    composer.dispatchEvent(new Event("input", { bubbles: true }));
    const plainEnter = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    composer.dispatchEvent(plainEnter);
    await settle();

    expect(plainEnter.defaultPrevented).toBe(false);
    expect(harness.service.getMessages(creation.group.groupId)).toHaveLength(0);

    const modifiedEnter = new KeyboardEvent("keydown", {
      key: "Enter",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    composer.dispatchEvent(modifiedEnter);
    await vi.waitFor(() => {
      expect(harness.service.getMessages(creation.group.groupId)).toHaveLength(1);
    });
    expect(modifiedEnter.defaultPrevented).toBe(true);
  });

  it("describes creator relay separately from direct handoffs and warns only for unreachable members", async () => {
    const harness = setup();
    const creation = await harness.service.createGroup([20, 30], "Relay Crew");
    await harness.panel.activate(creation.group.groupId);
    const send = vi.spyOn(harness.service, "sendMessage");
    const resultMessage = (id: string): GroupMessage => ({
      id,
      groupId: creation.group.groupId,
      senderNumber: 10,
      senderName: "Kiki",
      direction: "outgoing",
      content: "Across the relay",
      sentAt: 1_000_000,
      read: true,
    });
    send.mockResolvedValueOnce({
      message: resultMessage("gmsg_relay001"),
      persisted: true,
      handedOffTo: [20],
      failed: [],
      relayViaCreator: 20,
      relayTargets: [30],
      unreachable: [],
    });
    const composer = required<HTMLTextAreaElement>(harness.panel.chatPane, ".kl-group-composer");
    composer.value = "Across the relay";
    composer.dispatchEvent(new Event("input", { bubbles: true }));
    click(harness.panel.chatPane, ".kl-group-send");
    await vi.waitFor(() => expect(harness.feedback).toHaveLength(1));

    expect(harness.feedback[0]).toMatchObject({
      tone: "success",
      handedOffTo: [20],
      relayViaCreator: 20,
      relayTargets: [30],
    });
    expect(harness.feedback[0]?.message).toContain("routed via the group creator (#20)");
    expect(harness.feedback[0]?.message).toContain("creator must be online with KikiLink active");
    expect(harness.feedback[0]?.message).toContain("Delivery is not confirmed");
    expect(harness.feedback[0]?.message).not.toContain("failed");

    send.mockResolvedValueOnce({
      message: resultMessage("gmsg_relay002"),
      persisted: true,
      handedOffTo: [20],
      failed: [{ memberNumber: 30, message: "Creator unavailable" }],
      unreachable: [30],
    });
    composer.value = "One member is unreachable";
    composer.dispatchEvent(new Event("input", { bubbles: true }));
    click(harness.panel.chatPane, ".kl-group-send");
    await vi.waitFor(() => expect(harness.feedback).toHaveLength(2));

    expect(harness.feedback[1]).toMatchObject({ tone: "warning", unreachable: [30] });
    expect(harness.feedback[1]?.message).toContain("1 participant remains unreachable");
  });

  it("refreshes only the changed member's visible avatars and presence indicators", async () => {
    const harness = setup();
    const creation = await harness.service.createGroup([20, 30], "Presence Crew");
    await harness.service.receiveProtocol({
      senderNumber: 20,
      payload: serializeGroupChatPacket({
        t: "gm",
        v: 1,
        g: creation.group.groupId,
        i: "gmsg_presence1",
        c: "Status changed",
        u: 1_000_000,
      }),
    });
    await harness.panel.activate(creation.group.groupId);
    harness.avatarRenders.mockClear();
    harness.statuses.set(20, "dnd");

    for (const listener of harness.presenceListeners) listener(20);

    expect(harness.avatarRenders).toHaveBeenCalled();
    expect(harness.avatarRenders.mock.calls.every(([, member]) => member.memberNumber === 20))
      .toBe(true);
    const changedDots = harness.panel.chatPane.querySelectorAll<HTMLElement>(
      "[data-group-member-number='20'] .kl-group-member-presence",
    );
    expect(changedDots.length).toBeGreaterThan(0);
    expect([...changedDots].every((dot) => dot.dataset.status === "dnd")).toBe(true);
    const unchangedDots = harness.panel.chatPane.querySelectorAll<HTMLElement>(
      "[data-group-member-number='30'] .kl-group-member-presence",
    );
    expect([...unchangedDots].every((dot) => dot.dataset.status === "online")).toBe(true);
    expect(required<HTMLButtonElement>(
      harness.panel.chatPane,
      ".kl-group-participant[data-group-member-number='20']",
    ).getAttribute("aria-label")).toContain("do not disturb");
  });

  it("pins and removes a group through explicit host callbacks", async () => {
    const harness = setup();
    const creation = await harness.service.createGroup([20, 30], "Pinned Crew");
    await harness.panel.activate(creation.group.groupId);

    click(harness.panel.chatPane, ".kl-group-pin");
    await vi.waitFor(() => expect(harness.service.getGroup(creation.group.groupId)?.pinned).toBe(true));
    expect(harness.panel.sidebarSection.textContent).toContain("Pinned");
    expect(required(harness.panel.chatPane, ".kl-group-pin").textContent).toBe("Unpin");

    click(harness.panel.chatPane, ".kl-group-remove");
    await vi.waitFor(() => expect(harness.service.getGroup(creation.group.groupId)).toBeUndefined());
    expect(harness.panel.activeGroupId).toBeUndefined();
    expect(harness.panel.chatPane.hidden).toBe(true);
    expect(harness.onClose).toHaveBeenCalledTimes(1);
  });

  it("warns that a removed group is session-only when durable storage rejects the change", async () => {
    const storage = new MemoryKeyValueStorage();
    const harness = setup(storage);
    const creation = await harness.service.createGroup([20, 30], "Returning Crew");
    await harness.panel.activate(creation.group.groupId);
    vi.spyOn(storage, "setItem").mockImplementation(() => undefined);

    click(harness.panel.chatPane, ".kl-group-remove");
    await vi.waitFor(() => expect(harness.service.getGroup(creation.group.groupId)).toBeUndefined());

    expect(harness.feedback.at(-1)).toMatchObject({ tone: "warning" });
    expect(harness.feedback.at(-1)?.message).toContain("removed for this session");
    expect(harness.feedback.at(-1)?.message).toContain("may reappear after reload");
  });

  it("preserves a focused draft inside a shadow root and restores list focus on close", async () => {
    const harness = setup();
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    document.body.append(host);
    shadow.append(
      harness.panel.sidebarSection,
      harness.panel.chatPane,
      harness.panel.newGroupDialog,
    );
    const creation = await harness.service.createGroup([20, 30], "Shadow Crew");
    await harness.service.setDraft(creation.group.groupId, "Stored draft");
    await harness.panel.activate(creation.group.groupId);

    const composer = required<HTMLTextAreaElement>(shadow, ".kl-group-composer");
    expect(shadow.activeElement).toBe(composer);
    expect(document.activeElement).toBe(host);
    composer.value = "Draft still being typed";

    harness.panel.refresh();

    expect(composer.value).toBe("Draft still being typed");
    expect(shadow.activeElement).toBe(composer);

    harness.panel.closeActive();
    const returnTarget = required<HTMLButtonElement>(
      shadow,
      `[data-group-id="${creation.group.groupId}"]`,
    );
    expect(shadow.activeElement).toBe(returnTarget);
  });

  it("does not rebuild the message log for a draft-only update", async () => {
    const harness = setup();
    const creation = await harness.service.createGroup([20, 30], "Reading Crew");
    await harness.service.sendMessage(creation.group.groupId, "Earlier message");
    await harness.panel.activate(creation.group.groupId);
    const firstMessage = required<HTMLElement>(harness.panel.chatPane, ".kl-group-message");
    const messageLog = required<HTMLElement>(harness.panel.chatPane, ".kl-group-message-log");
    messageLog.scrollTop = 17;

    await harness.service.setDraft(creation.group.groupId, "Local draft");

    expect(required(harness.panel.chatPane, ".kl-group-message")).toBe(firstMessage);
    expect(messageLog.scrollTop).toBe(17);
  });

  it("does not clear the next group's draft or report stale feedback when a send resolves late", async () => {
    const harness = setup();
    const first = await harness.service.createGroup([20, 30], "First Crew");
    const second = await harness.service.createGroup([40, 50], "Second Crew");
    await harness.service.setDraft(second.group.groupId, "Second group draft");
    await harness.panel.activate(first.group.groupId);

    const pendingSend = deferred<GroupSendResult>();
    const send = vi.spyOn(harness.service, "sendMessage").mockReturnValueOnce(pendingSend.promise);
    const composer = required<HTMLTextAreaElement>(harness.panel.chatPane, ".kl-group-composer");
    composer.value = "Message from the first group";
    composer.dispatchEvent(new Event("input", { bubbles: true }));
    click(harness.panel.chatPane, ".kl-group-send");
    expect(send).toHaveBeenCalledWith(first.group.groupId, "Message from the first group");

    await harness.panel.activate(second.group.groupId);
    expect(composer.value).toBe("Second group draft");

    pendingSend.resolve({
      message: {
        id: "gmsg_pending01",
        groupId: first.group.groupId,
        senderNumber: 10,
        senderName: "Kiki",
        direction: "outgoing",
        content: "Message from the first group",
        sentAt: 1_000_000,
        read: true,
      },
      persisted: true,
      handedOffTo: [20, 30],
      failed: [],
    });
    await vi.waitFor(() => expect(composer.disabled).toBe(false));

    expect(harness.panel.activeGroupId).toBe(second.group.groupId);
    expect(composer.value).toBe("Second group draft");
    expect(required(harness.panel.chatPane, ".kl-group-feedback").textContent).toBe("");
    expect(harness.feedback).toHaveLength(0);
  });
});

describe("GroupChatPanel lifecycle", () => {
  it("explains that mutations are paused when saved group state cannot be read safely", () => {
    const storage = new MemoryKeyValueStorage();
    vi.spyOn(storage, "getItemResult").mockReturnValue({ ok: false });
    const harness = setup(storage);

    expect(required(harness.panel.chatPane, ".kl-group-feedback").textContent)
      .toContain("could not be read safely");
    expect(required(harness.panel.chatPane, ".kl-group-feedback").textContent)
      .toContain("Changes are paused");
    expect(harness.feedback.at(-1)).toMatchObject({ tone: "warning" });
  });

  it("shows storage degradation and recovery in user-visible feedback", async () => {
    const storage = new MemoryKeyValueStorage();
    const write = vi.spyOn(storage, "setItem").mockImplementation(() => undefined);
    const harness = setup(storage);
    const creation = await harness.service.createGroup([20, 30], "Storage group");
    await harness.panel.activate(creation.group.groupId);

    harness.service.flushNow();

    expect(harness.service.getPersistenceState()).toMatchObject({
      degraded: true,
      pendingChanges: true,
    });
    expect(required(harness.panel.chatPane, ".kl-group-feedback").textContent)
      .toContain("browser storage did not save");
    expect(harness.feedback.at(-1)).toMatchObject({ tone: "warning" });

    write.mockRestore();
    await harness.service.setDraft(creation.group.groupId, "Recovered draft");
    await harness.service.flush();
    expect(required(harness.panel.chatPane, ".kl-group-feedback").textContent)
      .toContain("storage recovered");
    expect(harness.feedback.at(-1)).toMatchObject({ tone: "success" });
    harness.panel.destroy();
    await harness.service.destroy();
  });

  it("refreshes from service updates and releases presence subscriptions on destroy", async () => {
    const harness = setup();
    expect(harness.presenceListeners.size).toBe(1);
    expect(harness.panel.sidebarSection.querySelectorAll(".kl-group-list-item")).toHaveLength(0);

    await harness.service.createGroup([20, 30], "First Crew");
    expect(harness.panel.sidebarSection.querySelectorAll(".kl-group-list-item")).toHaveLength(1);

    harness.panel.destroy();
    expect(harness.presenceListeners.size).toBe(0);
    expect(harness.panel.sidebarSection.isConnected).toBe(false);
    expect(harness.panel.chatPane.isConnected).toBe(false);
    expect(harness.panel.newGroupDialog.isConnected).toBe(false);

    await harness.service.createGroup([40, 50], "Second Crew");
    await settle();
    expect(harness.service.listGroups()).toHaveLength(2);
  });
});
