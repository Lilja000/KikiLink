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
  managedCompatible: Set<number>;
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
  vi.useRealTimers();
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
  const managedCompatible = new Set<number>([20, 30, 40, 50, 60]);
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
    hasGroupManagedPeer: (memberNumber) => managedCompatible.has(memberNumber),
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
    hasManagedPeer: (memberNumber) => managedCompatible.has(memberNumber),
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
  document.body.append(
    panel.sidebarSection,
    panel.chatPane,
    panel.newGroupDialog,
    panel.groupActionMenuLayer,
    panel.groupDetailsDialog,
  );
  return {
    service,
    adapter,
    presence,
    sent,
    failed,
    compatible,
    relayCompatible,
    managedCompatible,
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
    expect(harness.panel.newGroupDialog.textContent).toContain("No managed-group-compatible contacts");
  });

  it("selects only detected peers, caps selection, and sends only after final confirmation", async () => {
    const harness = setup();

    expect(harness.panel.sidebarSection.className).toBe("kl-group-sidebar");
    expect(harness.panel.chatPane.className).toBe("kl-group-pane");
    expect(harness.panel.newGroupDialog.className).toBe("kl-group-dialog");
    expect(harness.panel.nodes.sidebarSection).toBe(harness.panel.sidebarSection);
    expect(harness.panel.nodes.groupActionMenuLayer).toBe(harness.panel.groupActionMenuLayer);
    expect(harness.panel.nodes.groupDetailsDialog).toBe(harness.panel.groupDetailsDialog);
    expect(harness.panel.newGroupButton.title).toContain("2–4 KikiLink friends");

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
    expect(group?.protocolVersion).toBe(2);
    expect(harness.sent
      .filter((packet) => parseGroupChatPacket(packet.payload)?.t === "gs")
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
    expect(harness.panel.newGroupDialog.textContent).toContain("friends with current managed-group support");
  });

  it("offers only managed peers for new groups and fails closed without g3 discovery", () => {
    const harness = setup();
    harness.managedCompatible.delete(60);
    harness.panel.openNewGroupDialog();

    expect(harness.panel.newGroupDialog.querySelector("[data-member-number='60']")).toBeNull();
    expect(harness.panel.newGroupDialog.textContent).toContain("managed-group support");

    harness.panel.newGroupDialog.close();
    delete harness.presence.hasGroupManagedPeer;
    harness.panel.openNewGroupDialog();

    expect(harness.panel.newGroupDialog.querySelectorAll(".kl-group-contact")).toHaveLength(0);
    expect(harness.panel.newGroupDialog.textContent).toContain("No managed-group-compatible contacts");
  });

  it("shows profile-capable avatars beside selection and confirmation controls without nesting buttons", async () => {
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
    await vi.waitFor(() => {
      expect(harness.panel.newGroupDialog.querySelector(
        ".kl-group-contact-profile[data-group-member-number='20']",
      )).not.toBe(profile);
    });
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
    for (const confirmationProfile of harness.panel.newGroupDialog.querySelectorAll(
      ".kl-group-confirm-profile",
    )) {
      expect(confirmationProfile.children).toHaveLength(2);
      expect(confirmationProfile.firstElementChild?.classList.contains(
        "kl-group-member-avatar",
      )).toBe(true);
      expect(confirmationProfile.lastElementChild?.classList.contains(
        "kl-group-member-presence",
      )).toBe(true);
    }
    expect(harness.avatarRenders).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ memberNumber: 20, memberName: "Reina" }),
    );
  });

  it("coalesces contact discovery bursts and cancels queued modal work on close", async () => {
    const harness = setup();
    const knownContacts = vi.spyOn(harness.adapter, "getKnownContacts");
    harness.panel.openNewGroupDialog();
    knownContacts.mockClear();

    for (const memberNumber of [20, 30, 40, 50]) {
      for (const listener of harness.presenceListeners) listener(memberNumber);
    }
    expect(knownContacts).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(knownContacts).toHaveBeenCalledTimes(1));

    knownContacts.mockClear();
    for (const listener of harness.presenceListeners) listener(20);
    harness.panel.newGroupDialog.close();
    await settle();
    expect(knownContacts).not.toHaveBeenCalled();
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
  it("uses the ordinary Beep composer geometry and keeps every control in one compact row", async () => {
    const harness = setup();
    const creation = await harness.service.createGroup([20, 30], "Compact Crew");
    await harness.panel.activate(creation.group.groupId);

    const composerArea = required<HTMLElement>(
      harness.panel.chatPane,
      ".kl-group-composer-area",
    );
    const composerRow = required<HTMLElement>(composerArea, ".kl-group-composer-row");
    const composer = required<HTMLTextAreaElement>(composerRow, ".kl-group-composer");
    const attach = required<HTMLButtonElement>(composerRow, ".kl-group-composer-attach");
    const send = required<HTMLButtonElement>(composerRow, ".kl-group-send");
    const counter = required<HTMLElement>(composerArea, ".kl-group-composer-counter");

    expect(composerArea.tagName).toBe("FOOTER");
    expect(composerArea.classList.contains("kl-composer")).toBe(true);
    expect(composerRow.classList.contains("kl-composer-row")).toBe(true);
    expect([...composerRow.children]).toEqual([attach, composer, send]);
    expect(composer.classList.contains("kl-composer-input")).toBe(true);
    expect(composer.getAttribute("rows")).toBe("1");
    expect(composer.getAttribute("aria-label")).toBe("Message the group");
    expect(attach.classList.contains("kl-attach-image")).toBe(true);
    expect(send.classList.contains("kl-send")).toBe(true);
    expect(send.querySelector(".kl-send-label")?.textContent).toBe("Send");
    expect(counter.parentElement?.classList.contains("kl-composer-options")).toBe(true);
  });

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

  it("refreshes keyed transcript author names only when member-name revision changes", async () => {
    const harness = setup();
    const groupId = "group2_20_names001";
    const epochId = "ge_names001";
    expect(await harness.service.receiveProtocol({
      senderNumber: 20,
      payload: serializeGroupChatPacket({
        t: "gs",
        v: 2,
        g: groupId,
        o: 20,
        e: epochId,
        r: 1,
        m: [10, 20, 30],
        n: "Names Crew",
        p: "",
        u: 1_000_000,
      }),
    })).toBe(true);
    expect(await harness.service.receiveProtocol({
      senderNumber: 30,
      payload: serializeGroupChatPacket({
        t: "gm",
        v: 2,
        g: groupId,
        e: epochId,
        i: "gmsg_names001",
        c: "My display name changed",
        u: 1_000_000,
      }),
    })).toBe(true);
    await harness.panel.activate(groupId);
    const original = required<HTMLElement>(
      harness.panel.chatPane,
      "[data-message-id='gmsg_names001']",
    );
    expect(original.querySelector(".kl-group-message-author")?.textContent).toBe("Mina");
    const messageLog = required<HTMLElement>(harness.panel.chatPane, ".kl-group-message-log");
    Object.defineProperties(messageLog, {
      scrollHeight: { configurable: true, value: 600 },
      clientHeight: { configurable: true, value: 120 },
    });
    messageLog.scrollTop = 140;

    expect(await harness.service.receiveProtocol({
      senderNumber: 20,
      payload: serializeGroupChatPacket({
        t: "gn",
        v: 2,
        g: groupId,
        o: 20,
        e: epochId,
        r: 1,
        d: [[10, "Kiki"], [20, "Reina"], [30, "Minerva"]],
        u: 1_000_001,
      }),
    })).toBe(true);

    const refreshed = required<HTMLElement>(
      harness.panel.chatPane,
      "[data-message-id='gmsg_names001']",
    );
    expect(refreshed).not.toBe(original);
    expect(refreshed.querySelector(".kl-group-message-author")?.textContent).toBe("Minerva");
    expect(messageLog.scrollTop).toBe(140);
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

  it("renders same-ID messages from different group authors as separate keyed rows", async () => {
    const harness = setup();
    const creation = await harness.service.createGroup([20, 30], "Collision-safe Crew");
    const sharedMessageId = "gmsg_shared002";
    for (const [senderNumber, content] of [
      [20, "Reina's message"],
      [30, "Mina's message"],
    ] as const) {
      expect(await harness.service.receiveProtocol({
        senderNumber,
        payload: serializeGroupChatPacket({
          t: "gm",
          v: 1,
          g: creation.group.groupId,
          i: sharedMessageId,
          c: content,
          u: 1_000_000,
        }),
      })).toBe(true);
    }

    await harness.panel.activate(creation.group.groupId);
    const rows = [...harness.panel.chatPane.querySelectorAll<HTMLElement>(
      `[data-message-id="${sharedMessageId}"]`,
    )];
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.dataset.messageKey)).toEqual([
      `20:${sharedMessageId}`,
      `30:${sharedMessageId}`,
    ]);
    expect(rows.map((row) => row.querySelector(".kl-group-message-content")?.textContent)).toEqual([
      "Reina's message",
      "Mina's message",
    ]);
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

  it("keeps the pane header compact and moves pin/remove/close into the action menu", async () => {
    const harness = setup();
    const creation = await harness.service.createGroup([20, 30], "Pinned Crew");
    await harness.panel.activate(creation.group.groupId);

    expect(harness.panel.chatPane.querySelector(".kl-group-pin")).toBeNull();
    expect(harness.panel.chatPane.querySelector(".kl-group-remove")).toBeNull();
    expect(harness.panel.chatPane.querySelector(".kl-group-pane-close")).toBeNull();
    expect(harness.panel.chatPane.querySelectorAll(".kl-group-pane-menu-trigger")).toHaveLength(1);

    click(harness.panel.chatPane, ".kl-group-pane-menu-trigger");
    click(harness.panel.groupActionMenuLayer, "[data-group-action='toggle-pin']");
    await vi.waitFor(() => expect(harness.service.getGroup(creation.group.groupId)?.pinned).toBe(true));
    expect(harness.panel.sidebarSection.textContent).toContain("Pinned");

    click(harness.panel.chatPane, ".kl-group-pane-menu-trigger");
    expect(required(
      harness.panel.groupActionMenuLayer,
      "[data-group-action='toggle-pin']",
    ).textContent).toContain("Unpin group");
    click(harness.panel.groupActionMenuLayer, "[data-group-action='remove']");
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

    click(harness.panel.chatPane, ".kl-group-pane-menu-trigger");
    click(harness.panel.groupActionMenuLayer, "[data-group-action='remove']");
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

describe("GroupChatPanel actions and managed details", () => {
  it("offers an explicit ask-first reveal for a hidden custom group avatar", async () => {
    const canRevealGroupAvatar = vi.fn(() => true);
    const onRevealGroupAvatar = vi.fn();
    const harness = setup(new MemoryKeyValueStorage(), {
      canRevealGroupAvatar,
      onRevealGroupAvatar,
    });
    const creation = await harness.service.createManagedGroup([20, 30], "Private Avatar Crew");
    await harness.service.setGroupAvatar(
      creation.group.groupId,
      "https://images.example/private-avatar.webp",
    );
    const returnFocus = document.createElement("button");
    document.body.append(returnFocus);

    harness.panel.openGroupActionMenu(creation.group.groupId, returnFocus);
    const reveal = required<HTMLButtonElement>(
      harness.panel.groupActionMenuLayer,
      '[data-group-action="show-avatar"]',
    );
    expect(reveal.textContent).toContain("Show group avatar");
    reveal.click();

    expect(onRevealGroupAvatar).toHaveBeenCalledWith(creation.group.groupId);
    expect(harness.panel.groupActionMenuLayer.open).toBe(false);
    expect(document.activeElement).toBe(returnFocus);
    expect(canRevealGroupAvatar).toHaveBeenCalledWith(expect.objectContaining({
      groupId: creation.group.groupId,
      avatarUrl: "https://images.example/private-avatar.webp",
    }));
  });

  it("closes every transient group surface on host close and does not reopen stale details", async () => {
    const renameGate = deferred<void>();
    const onRenameGroup = vi.fn(() => renameGate.promise);
    const harness = setup(new MemoryKeyValueStorage(), { onRenameGroup });
    const creation = await harness.service.createManagedGroup([20, 30], "Host Close Crew");
    const returnFocus = document.createElement("button");
    document.body.append(returnFocus);

    harness.panel.openNewGroupDialog();
    expect(harness.panel.newGroupDialog.open).toBe(true);
    harness.panel.handleHostClose();
    expect(harness.panel.newGroupDialog.open).toBe(false);

    harness.panel.openGroupActionMenu(creation.group.groupId, returnFocus);
    expect(harness.panel.groupActionMenuLayer.open).toBe(true);
    harness.panel.handleHostClose();
    expect(harness.panel.groupActionMenuLayer.open).toBe(false);

    harness.panel.openGroupDetails(creation.group.groupId, returnFocus);
    const title = required<HTMLInputElement>(
      harness.panel.groupDetailsDialog,
      ".kl-group-manage-title",
    );
    title.value = "Renamed after close";
    click(harness.panel.groupDetailsDialog, "[data-group-details-action='rename']");
    expect(onRenameGroup).toHaveBeenCalledOnce();
    harness.panel.handleHostClose();
    expect(harness.panel.groupDetailsDialog.open).toBe(false);

    renameGate.resolve();
    await settle();
    expect(harness.panel.groupDetailsDialog.open).toBe(false);
    expect(harness.panel.groupActionMenuLayer.open).toBe(false);
  });

  it("binds an accessible context menu to host rows and restores focus on every close path", async () => {
    const harness = setup();
    const creation = await harness.service.createGroup([20, 30], "Context Crew");
    const hostRow = document.createElement("button");
    hostRow.type = "button";
    hostRow.textContent = "Context Crew";
    document.body.append(hostRow);
    const dispose = harness.panel.bindGroupActionTarget(hostRow, creation.group.groupId);

    hostRow.focus();
    const contextMenu = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 72,
      clientY: 84,
    });
    hostRow.dispatchEvent(contextMenu);
    expect(contextMenu.defaultPrevented).toBe(true);
    expect(harness.panel.groupActionMenuLayer.open).toBe(true);
    expect(harness.panel.groupActionMenuLayer.textContent).toContain("Context Crew");
    expect(harness.panel.groupActionMenuLayer.querySelectorAll("[role='menuitem']").length)
      .toBeGreaterThanOrEqual(3);
    expect(harness.panel.groupActionMenuLayer.querySelectorAll(".kl-icon").length)
      .toBeGreaterThanOrEqual(3);

    required<HTMLButtonElement>(
      harness.panel.groupActionMenuLayer,
      "[role='menuitem']",
    ).dispatchEvent(new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    }));
    expect(harness.panel.groupActionMenuLayer.open).toBe(false);
    expect(document.activeElement).toBe(hostRow);

    hostRow.dispatchEvent(new KeyboardEvent("keydown", {
      key: "ContextMenu",
      bubbles: true,
      cancelable: true,
    }));
    expect(harness.panel.groupActionMenuLayer.open).toBe(true);
    harness.panel.groupActionMenuLayer.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
    }));
    expect(harness.panel.groupActionMenuLayer.open).toBe(false);
    expect(document.activeElement).toBe(hostRow);

    hostRow.dispatchEvent(new KeyboardEvent("keydown", {
      key: "F10",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    }));
    expect(harness.panel.groupActionMenuLayer.open).toBe(true);
    harness.panel.groupActionMenuLayer.dispatchEvent(new Event("cancel", {
      bubbles: false,
      cancelable: true,
    }));
    expect(harness.panel.groupActionMenuLayer.open).toBe(false);
    expect(document.activeElement).toBe(hostRow);

    dispose();
    const afterDispose = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    hostRow.dispatchEvent(afterDispose);
    expect(afterDispose.defaultPrevented).toBe(false);
    expect(harness.panel.groupActionMenuLayer.open).toBe(false);
  });

  it("supports touch long-press without also activating the underlying conversation row", async () => {
    const harness = setup();
    const creation = await harness.service.createGroup([20, 30], "Touch Crew");
    const hostRow = document.createElement("button");
    hostRow.type = "button";
    const activated = vi.fn();
    hostRow.addEventListener("click", activated);
    document.body.append(hostRow);
    harness.panel.bindGroupActionTarget(hostRow, creation.group.groupId);
    vi.useFakeTimers();

    hostRow.dispatchEvent(new PointerEvent("pointerdown", {
      pointerType: "touch",
      clientX: 32,
      clientY: 48,
      bubbles: true,
    }));
    await vi.advanceTimersByTimeAsync(519);
    expect(harness.panel.groupActionMenuLayer.open).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(harness.panel.groupActionMenuLayer.open).toBe(true);

    hostRow.click();
    expect(activated).not.toHaveBeenCalled();
  });

  it("exposes creator-only managed callbacks for name, avatar, outline, add, and kick", async () => {
    const onRenameGroup = vi.fn(async () => undefined);
    const onSetGroupAvatar = vi.fn(async () => undefined);
    const onSetGroupOutlineColor = vi.fn(async () => undefined);
    const onAddGroupMember = vi.fn(async () => undefined);
    const onKickGroupMember = vi.fn(async () => undefined);
    const onPickGroupAvatar = vi.fn(async () => undefined);
    const renderGroupAvatar = vi.fn((target: HTMLElement) => {
      target.textContent = "GC";
    });
    const harness = setup(new MemoryKeyValueStorage(), {
      onRenameGroup,
      onSetGroupAvatar,
      onSetGroupOutlineColor,
      onAddGroupMember,
      onKickGroupMember,
      onPickGroupAvatar,
      renderGroupAvatar,
      confirmKickMember: () => true,
    });
    const creation = await harness.service.createManagedGroup([20, 30, 40], "Managed Crew");
    await harness.panel.activate(creation.group.groupId);

    expect(required(harness.panel.chatPane, ".kl-group-pane-title-row").textContent)
      .toContain("Creator");
    expect(required(harness.panel.chatPane, ".kl-group-header-avatar").textContent).toBe("GC");
    expect(harness.panel.openGroupDetails(creation.group.groupId)).toBe(true);
    expect(harness.panel.groupDetailsDialog.textContent).toContain("You created this group");
    expect(harness.panel.groupDetailsDialog.querySelectorAll(".kl-group-creator-badge").length)
      .toBeGreaterThan(0);

    const title = required<HTMLInputElement>(
      harness.panel.groupDetailsDialog,
      ".kl-group-manage-title",
    );
    title.value = "Renamed Crew";
    click(harness.panel.groupDetailsDialog, "[data-group-details-action='rename']");
    await vi.waitFor(() => expect(onRenameGroup).toHaveBeenCalledWith(
      creation.group.groupId,
      "Renamed Crew",
    ));
    await settle();

    const avatar = required<HTMLInputElement>(
      harness.panel.groupDetailsDialog,
      ".kl-group-manage-avatar-url",
    );
    avatar.value = "https://files.catbox.moe/crew.webp";
    click(harness.panel.groupDetailsDialog, "[data-group-details-action='set-avatar']");
    await vi.waitFor(() => expect(onSetGroupAvatar).toHaveBeenCalledWith(
      creation.group.groupId,
      "https://files.catbox.moe/crew.webp",
    ));
    await settle();

    const outline = required<HTMLInputElement>(
      harness.panel.groupDetailsDialog,
      ".kl-group-manage-outline",
    );
    outline.value = "#aa1133";
    click(harness.panel.groupDetailsDialog, "[data-group-details-action='set-outline']");
    await vi.waitFor(() => expect(onSetGroupOutlineColor).toHaveBeenCalledWith(
      creation.group.groupId,
      "#aa1133",
    ));
    await settle();

    const select = required<HTMLSelectElement>(
      harness.panel.groupDetailsDialog,
      ".kl-group-manage-add-select",
    );
    select.value = "50";
    click(harness.panel.groupDetailsDialog, "[data-group-details-action='add']");
    await vi.waitFor(() => expect(onAddGroupMember).toHaveBeenCalledWith(
      creation.group.groupId,
      50,
    ));
    await settle();

    click(
      harness.panel.groupDetailsDialog,
      ".kl-group-manage-member[data-member-number='20'] [data-group-details-action='kick']",
    );
    await vi.waitFor(() => expect(onKickGroupMember).toHaveBeenCalledWith(
      creation.group.groupId,
      20,
    ));
    await settle();

    const picker = click(
      harness.panel.groupDetailsDialog,
      "[data-group-details-action='pick-avatar']",
    );
    await vi.waitFor(() => expect(onPickGroupAvatar).toHaveBeenCalledWith(
      creation.group.groupId,
      picker,
    ));
    expect(picker.isConnected).toBe(true);
    expect(renderGroupAvatar).toHaveBeenCalled();
  });

  it("keeps non-creator details read-only and labels the actual creator", async () => {
    const onRenameGroup = vi.fn();
    const harness = setup(new MemoryKeyValueStorage(), { onRenameGroup });
    const groupId = "group2_20_readonly1";
    expect(await harness.service.receiveProtocol({
      senderNumber: 20,
      payload: serializeGroupChatPacket({
        t: "gs",
        v: 2,
        g: groupId,
        o: 20,
        e: "ge_readonly1",
        r: 1,
        m: [10, 20, 30],
        n: "Reina's Crew",
        p: "",
        u: 1_000_000,
      }),
    })).toBe(true);

    await harness.panel.activate(groupId);
    expect(harness.panel.chatPane.textContent).toContain("3 members · Created by Reina");
    expect(harness.panel.openGroupDetails(groupId)).toBe(true);
    expect(harness.panel.groupDetailsDialog.textContent).toContain(
      "Only Reina, the group creator, can change",
    );
    expect(harness.panel.groupDetailsDialog.textContent).toContain("Creator");
    expect(harness.panel.groupDetailsDialog.querySelector(".kl-group-manage-title")).toBeNull();
    expect(harness.panel.groupDetailsDialog.querySelector(".kl-group-manage-add")).toBeNull();
    expect(harness.panel.groupDetailsDialog.querySelector(".kl-group-manage-kick")).toBeNull();
    expect(onRenameGroup).not.toHaveBeenCalled();
  });

  it("does not wipe an in-progress manage form on unrelated draft updates", async () => {
    const harness = setup();
    const creation = await harness.service.createManagedGroup([20, 30], "Stable Form");
    harness.panel.openGroupDetails(creation.group.groupId);
    const title = required<HTMLInputElement>(
      harness.panel.groupDetailsDialog,
      ".kl-group-manage-title",
    );
    title.value = "Unsaved name in progress";

    await harness.service.setDraft(creation.group.groupId, "Unrelated group draft");

    expect(required(
      harness.panel.groupDetailsDialog,
      ".kl-group-manage-title",
    )).toBe(title);
    expect(title.value).toBe("Unsaved name in progress");
  });

  it("delegates image composition and safe message-body rendering to the host", async () => {
    const onAttachImage = vi.fn(async () => undefined);
    const renderMessageBody = vi.fn((message: GroupMessage) => {
      const rendered = document.createElement("span");
      rendered.className = "test-rendered-group-body";
      rendered.textContent = `Rendered: ${message.content}`;
      return rendered;
    });
    const harness = setup(new MemoryKeyValueStorage(), { onAttachImage, renderMessageBody });
    const creation = await harness.service.createGroup([20, 30], "Image Crew");
    await harness.service.receiveProtocol({
      senderNumber: 20,
      payload: serializeGroupChatPacket({
        t: "gm",
        v: 1,
        g: creation.group.groupId,
        i: "gmsg_render001",
        c: "https://files.catbox.moe/group.webp",
        u: 1_000_000,
      }),
    });
    await harness.panel.activate(creation.group.groupId);

    expect(required(harness.panel.chatPane, ".test-rendered-group-body").textContent)
      .toBe("Rendered: https://files.catbox.moe/group.webp");
    expect(required(harness.panel.chatPane, ".kl-group-message-profile--large")).toBeTruthy();
    expect(required(harness.panel.chatPane, ".kl-group-message-avatar")).toBeTruthy();
    const attach = click(harness.panel.chatPane, ".kl-group-composer-attach");
    await vi.waitFor(() => expect(onAttachImage).toHaveBeenCalledWith(
      creation.group.groupId,
      attach,
    ));
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
    expect(harness.panel.groupActionMenuLayer.isConnected).toBe(false);
    expect(harness.panel.groupDetailsDialog.isConnected).toBe(false);

    await harness.service.createGroup([40, 50], "Second Crew");
    await settle();
    expect(harness.service.listGroups()).toHaveLength(2);
  });
});
