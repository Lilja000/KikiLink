// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { CloudClient, CloudError } from "../src/cloud/client";
import { CloudPanel } from "../src/cloud/panel";
import { CloudGroupInbox } from "../src/cloud/group-inbox";
import { CommunityService, type MailItem } from "../src/cloud/community";
import { setupPlatformView } from "./platform-view-fixture";

vi.mock("../src/core/distribution", async importOriginal => ({
  ...await importOriginal<typeof import("../src/core/distribution")>(), KIKILINK_PLATFORM_PREVIEW: true,
}));
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

interface ProcessedMail {
  status?: string | undefined;
  canOpen?: boolean | undefined;
  title?: string;
  invitationTitle?: string;
  memberCount?: number;
  capacity?: number;
  activeMember?: boolean;
  newerInvite?: boolean;
  historyPreview?: unknown;
}

const historicalMembers = [{ memberNumber: 202, role: "owner" }, { memberNumber: 404, role: "admin" },
  { memberNumber: 505, role: "member" }] as const;
const historicalAsset = "76acc6c0-0b49-4214-9a7e-6ca85e0a4d23";

async function setup(initialDetails: Record<string, unknown> = {}, legacyMailbox = false, processed?: ProcessedMail, historyCapable = !legacyMailbox) {
  const owner = 72385;
  const invitation = { id: "garden", title: "Night Garden", owner: 202, invitedAt: Date.now() - 1000 };
  const mail: MailItem = { id: 1, actor: 303, kind: "group_invitation", targetType: "group", targetId: invitation.id,
    count: 1, createdAt: invitation.invitedAt, updatedAt: invitation.invitedAt, read: true, pending: true, ...(legacyMailbox ? {} : { groupInvitedAt: invitation.invitedAt }) };
  const listeners = new Set<(kind: string) => void>();
  let connected = true, invited = !processed || processed.newerInvite === true;
  let accepted = processed?.activeMember === true, failRefresh = false;
  const mailRow = () => processed ? { ...mail, pending: false, groupInvitationStatus: processed.status,
    groupCanOpen: processed.canOpen, groupTitle: processed.title, groupInvitationTitle: processed.invitationTitle,
    groupInvitationMemberCount: processed.memberCount, groupInvitationCapacity: processed.capacity } : { ...mail, pending: invited };
  const activeGroup = { id: invitation.id, title: invitation.title, owner: 202,
    conversationId: "garden-conversation", revision: 1, membershipVersion: 1, keyVersion: 1, createdAt: 100,
    legacyId: null, members: [{ memberNumber: owner, status: "active", role: "member" }], lastIncomingSequence: 0 };
  let details = initialDetails;
  const cloud = new CloudClient({ origin: "https://cloud.example.test", memberNumber: owner,
    getMemberNumber: () => owner, isBlocked: () => false, sendProof: vi.fn(), fetchImpl: vi.fn() });
  vi.spyOn(cloud, "connected", "get").mockImplementation(() => connected);
  vi.spyOn(cloud, "retainEvents").mockReturnValue(() => {});
  vi.spyOn(cloud, "subscribe").mockImplementation(listener => { listeners.add(listener); return () => listeners.delete(listener); });
  const openGroup = vi.spyOn(CloudPanel.prototype, "openGroup").mockResolvedValue();
  const request = vi.spyOn(cloud, "request").mockImplementation(async (method, path) => {
    const pathname = new URL(path, cloud.origin).pathname;
    if (pathname === "/v1/me") return { memberNumber: owner, features: { community: true, groupInvitationHistoryPreview: historyCapable } };
    if (pathname === "/v1/groups/garden/accept" || pathname === "/v1/groups/garden/invitation") {
      invited = false; accepted = method === "POST"; return {};
    }
    if (pathname === "/v1/group-invitations") {
      if (failRefresh) throw new Error("Invitation refresh failed.");
      return { items: invited ? [{ ...invitation, ...details, ...(processed?.newerInvite
        ? { title: "Later invitation", invitedAt: invitation.invitedAt + 500 } : {}) }] : [] };
    }
    if (pathname === "/v1/groups") return { items: accepted ? [activeGroup] : [] };
    if (pathname === "/v1/groups/garden") {
      if (!accepted) throw new Error("Group unavailable.");
      return activeGroup;
    }
    if (pathname === "/v1/mailbox") return { items: [mailRow()], unread: 0, nextCursor: null };
    if (pathname === "/v1/mailbox/1") return { ...mailRow(),
      ...(processed?.historyPreview ? { groupInvitationHistoryPreview: processed.historyPreview } : {}) };
    return { items: [], unread: 0, latest: 0, nextCursor: null, directMessages: true };
  });
  const f = await setupPlatformView(undefined, [], undefined, cloud);
  f.route("inbox").click();
  const inbox = f.root.querySelector<HTMLElement>(".kl-inbox-page")!;
  let reviewDialog: HTMLDialogElement | undefined;
  const dialog = () => {
    reviewDialog = f.root.querySelector<HTMLElement>(".kl-group-invitation-review")?.closest<HTMLDialogElement>("dialog") ?? reviewDialog;
    return reviewDialog!;
  };
  const row = () => inbox.querySelector<HTMLButtonElement>('[data-mail-action="open-1"]')!;
  await vi.waitFor(() => {
    if (processed) expect(row()).not.toBeNull();
    else expect(row()?.textContent).toContain(legacyMailbox ? "Review current invitations in Groups" : invitation.title);
  });
  await vi.waitFor(() => expect(inbox.querySelector(".kl-mailbox-list")?.getAttribute("aria-busy")).toBe("false"));
  const bell = f.root.querySelector<HTMLButtonElement>(".kl-mailbox-trigger")!;
  const popup = f.root.querySelector<HTMLDialogElement>(".kl-mailbox-popover")!;
  const action = (label: string) => dialog().querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;
  const groupWrites = () => request.mock.calls.filter(([method, path]) => method !== "GET" && path.startsWith("/v1/groups/"));
  return { ...f, cloud, request, openGroup, inbox, invitation, get dialog() { return dialog(); }, row, bell, popup, action, groupWrites,
    failRefresh: (fail: boolean) => { failRefresh = fail; },
    leaveGroup: () => { accepted = false; if (processed) processed.canOpen = false; for (const notify of listeners) notify("groups"); },
    finishRemotely: (result: ProcessedMail, replacement?: Record<string, unknown>) => {
      processed = result;
      accepted = result.activeMember === true;
      invited = result.newerInvite === true;
      details = replacement ?? {};
      for (const notify of listeners) notify("groups");
      for (const notify of listeners) notify("mailbox");
    },
    relationshipsChanged: () => { for (const notify of listeners) notify("relationships"); },
    updateInvitation: (next: Record<string, unknown> | undefined) => {
      invited = next !== undefined;
      details = next ?? {};
      for (const listener of listeners) listener("groups");
    },
    disconnect: () => { connected = false; for (const listener of listeners) listener("session"); },
    cleanup: () => { f.view.destroy(); cloud.destroy(); } };
}

it.each(["inbox", "bell"] as const)("opens the pending invitation from %s without joining and restores focus after Escape", async source => {
  const f = await setup();
  const avatar = vi.spyOn(f.cloud, "invitationAvatar");
  try {
    if (source === "bell") {
      f.bell.click();
      await vi.waitFor(() => expect(f.popup.open).toBe(true));
      f.popup.querySelector<HTMLButtonElement>('[data-mail-action="open-1"]')!.click();
    } else { f.row().focus(); f.row().click(); }
    await vi.waitFor(() => expect(f.dialog?.open).toBe(true));
    expect(f.dialog.querySelector("h3")?.textContent).toBe("Night Garden");
    expect(f.dialog.textContent).toContain("Member 303 invited you");
    expect(f.dialog.querySelector('[aria-label="Group members"]')).toBeNull();
    expect(f.dialog.textContent).not.toMatch(/\d+\/\d+ members/);
    expect(avatar).not.toHaveBeenCalled();
    expect(f.action("Accept invitation")).not.toBeNull();
    expect(f.action("Decline")).not.toBeNull();
    expect(f.groupWrites()).toHaveLength(0);
    expect(f.openGroup).not.toHaveBeenCalled();
    expect(f.popup.open).toBe(false);
    f.dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    await vi.waitFor(() => expect(f.dialog.open, f.dialog.textContent ?? "").toBe(false));
    await vi.waitFor(() => expect(f.root.activeElement).toBe(source === "bell" ? f.bell : f.row()));
  } finally { f.cleanup(); }
});

it.each(["accept", "decline"] as const)("completes %s from the review and navigates only after accepting", async response => {
  const subscriptions = vi.spyOn(CommunityService.prototype, "subscribe");
  const f = await setup();
  try {
    const panel = f.root.querySelector<HTMLElement>(".kl-panel")!;
    const added = vi.spyOn(panel, "append");
    f.row().click();
    await vi.waitFor(() => expect(f.dialog?.open).toBe(true));
    if (response === "accept") {
      const community = subscriptions.mock.contexts.find((service): service is CommunityService =>
        service instanceof CommunityService && service.client === f.cloud)!;
      const original = f.request.getMockImplementation()!;
      f.request.mockImplementation(async (method, path, body, authenticated) => {
        const value = await original(method, path, body, authenticated);
        if (method === "POST" && path === "/v1/groups/garden/accept") {
          // A mailbox update can arrive before the confirming group refresh completes.
          community.mailbox.items = community.mailbox.items.map(item => item.id === 1 ? {
            ...item, pending: false, groupInvitationStatus: "accepted", groupInvitationTitle: "Moon & Stars",
          } : item);
        }
        return value;
      });
    }
    const act = f.action(response === "accept" ? "Accept invitation" : "Decline");
    act.click();
    act.click();
    await vi.waitFor(() => expect(f.dialog.open, f.dialog.textContent ?? "").toBe(false));
    act.click();
    const feedback = added.mock.calls.flat().filter((node): node is HTMLElement =>
      node instanceof HTMLElement && node.matches(".kl-toast")).map(node => node.querySelector(".kl-toast-message")?.textContent);
    expect(feedback).toEqual([response === "accept" ? "You joined Moon & Stars." : "Invitation declined."]);
    expect(f.groupWrites()).toHaveLength(1);
    expect(f.groupWrites()[0]?.slice(0, 2)).toEqual(response === "accept"
      ? ["POST", "/v1/groups/garden/accept"] : ["DELETE", "/v1/groups/garden/invitation"]);
    if (response === "accept") {
      expect(f.openGroup).toHaveBeenCalledExactlyOnceWith("garden");
      expect(f.root.querySelector<HTMLElement>(".kl-panel")?.dataset.workspace).toBe("chat");
      f.route("inbox").click();
    } else {
      expect(f.openGroup).not.toHaveBeenCalled();
      expect(f.root.querySelector<HTMLElement>(".kl-panel")?.dataset.workspace).toBe("inbox");
    }
    await vi.waitFor(() => expect(f.inbox.querySelector('[data-mail-action="accept-1"]')).toBeNull());
  } finally { f.cleanup(); }
});

it("shows the group roster before joining and removes old details when the invitation changes", async () => {
  const members = [
    { memberNumber: 202, role: "owner" },
    { memberNumber: 404, role: "admin" },
    { memberNumber: 505, role: "member" },
  ];
  const f = await setup({ members, capacity: 5, avatarId: null });
  try {
    f.row().click();
    await vi.waitFor(() => expect(f.dialog?.open).toBe(true));
    const roster = () => f.dialog.querySelector('[aria-label="Group members"]');
    const rowDetails = () => [...(roster()?.querySelectorAll("li") ?? [])].map(row => row.textContent);
    expect(rowDetails()).toEqual([
      expect.stringMatching(/Member 202.*Owner/), expect.stringMatching(/Member 404.*Admin/),
      expect.stringMatching(/Member 505.*Member/),
    ]);
    expect(f.dialog.textContent).toContain("3/5 members");
    expect(f.dialog.textContent).toContain("Member 303 invited you");
    expect(f.groupWrites()).toHaveLength(0);

    f.updateInvitation({ members: members.slice(0, 2), capacity: 5, avatarId: null });
    await vi.waitFor(() => expect(f.dialog.textContent).toContain("2/5 members"), { timeout: 3000 });
    expect(roster()?.textContent).not.toContain("Member 505");

    f.updateInvitation(undefined);
    await vi.waitFor(() => expect(roster()?.textContent ?? "").not.toContain("Member 404"), { timeout: 3000 });
    expect(f.dialog.querySelector(".kl-group-invitation-review-icon img")).toBeNull();
    expect(f.groupWrites()).toHaveLength(0);
  } finally { f.cleanup(); }
});

it("loads the avatar for this invitation and releases it when the preview closes", async () => {
  const assetId = "c28ad05c-e4ee-428e-808e-eb5508fe3252";
  const f = await setup({ members: [{ memberNumber: 202, role: "owner" }], capacity: 5, avatarId: assetId });
  const avatar = vi.spyOn(f.cloud, "invitationAvatar").mockResolvedValue(new Blob(["image"], { type: "image/webp" }));
  const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:invitation-avatar");
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  try {
    f.row().click();
    await vi.waitFor(() => expect(f.dialog?.querySelector(".kl-group-invitation-review-icon img")?.getAttribute("src"))
      .toBe("blob:invitation-avatar"));
    expect(avatar.mock.calls[0]?.slice(0, 3)).toEqual(["garden", assetId, f.invitation.invitedAt]);
    expect(createUrl).toHaveBeenCalled();
    f.dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    await vi.waitFor(() => expect(revoke).toHaveBeenCalledWith("blob:invitation-avatar"));

    avatar.mockRejectedValue(new Error("Image unavailable"));
    f.row().click();
    await vi.waitFor(() => expect(avatar.mock.calls.length).toBeGreaterThan(1));
    expect(f.dialog.querySelector(".kl-group-invitation-review-icon img")).toBeNull();
    expect(f.action("Accept invitation").disabled).toBe(false);
    expect(f.groupWrites()).toHaveLength(0);
  } finally { f.cleanup(); }
});

it("honors portrait settings and native blocks throughout an open invitation", async () => {
  const details = { members: [{ memberNumber: 202, role: "owner" }, { memberNumber: 505, role: "member" }],
    capacity: 5, avatarId: "c28ad05c-e4ee-428e-808e-eb5508fe3252" };
  const f = await setup(details);
  const avatar = vi.spyOn(f.cloud, "invitationAvatar").mockResolvedValue(new Blob(["image"], { type: "image/webp" }));
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:permitted-invitation-avatar");
  try {
    f.settings.update(draft => { draft.linkPresence.profileImagePreviews = "ask"; });
    f.row().click();
    await vi.waitFor(() => expect(f.dialog?.textContent).toContain("2/5 members"));
    expect(avatar).not.toHaveBeenCalled();
    const askPortrait = f.dialog.querySelector(".kl-group-invitation-member-avatar");
    f.settings.update(draft => { draft.linkPresence.profileImagePreviews = "always"; });
    expect(f.dialog.querySelector(".kl-group-invitation-member-avatar")).not.toBe(askPortrait);
    await vi.waitFor(() => expect(f.dialog.querySelector(".kl-group-invitation-review-icon img")).not.toBeNull());
    f.settings.update(draft => { draft.linkPresence.profileImagePreviews = "never"; });
    expect(f.dialog.querySelector(".kl-group-invitation-review-icon img")).toBeNull();
    expect(revoke).toHaveBeenCalledWith("blob:permitted-invitation-avatar");

    vi.spyOn(f.adapter, "getPlayerRelationships").mockImplementation(id => id === 505 ? ["ghosted"] : []);
    f.updateInvitation(details);
    await vi.waitFor(() => expect(f.dialog.querySelector('[aria-label="Group members"]')).toBeNull());
    expect(f.dialog.textContent).not.toContain("2/5 members");
    expect(f.dialog.textContent).not.toContain("Member 505");
    expect(f.groupWrites()).toHaveLength(0);
  } finally { f.cleanup(); }
});

it("withholds cached preview details until the server confirms the invitation is still pending", async () => {
  const f = await setup({ members: [{ memberNumber: 404, role: "admin" }], capacity: 5,
    avatarId: "c28ad05c-e4ee-428e-808e-eb5508fe3252" });
  let finish!: () => void;
  const wait = new Promise<void>(resolve => { finish = resolve; });
  const avatar = vi.spyOn(f.cloud, "invitationAvatar");
  const original = f.request.getMockImplementation()!;
  const freshListStarted = vi.fn();
  f.request.mockImplementation(async (method, path, body, authenticated) => {
    if (new URL(path, f.cloud.origin).pathname === "/v1/group-invitations") {
      freshListStarted();
      await wait;
      return { items: [] };
    }
    return original(method, path, body, authenticated);
  });
  try {
    f.row().click();
    await vi.waitFor(() => expect(freshListStarted).toHaveBeenCalled());
    expect(f.dialog?.querySelector('[aria-label="Group members"]')).toBeFalsy();
    expect(avatar).not.toHaveBeenCalled();
    finish();
    await vi.waitFor(() => expect(f.dialog?.textContent).toContain("This group invitation is unavailable."));
    expect(f.dialog.querySelector('[aria-label="Group members"]')).toBeNull();
    expect(avatar).not.toHaveBeenCalled();
    expect(f.groupWrites()).toHaveLength(0);
  } finally { finish(); f.cleanup(); }
});

it("discards an avatar that arrives after the open invitation is revoked", async () => {
  const f = await setup({ members: [{ memberNumber: 202, role: "owner" }], capacity: 5,
    avatarId: "c28ad05c-e4ee-428e-808e-eb5508fe3252" });
  let finish!: (image: Blob) => void;
  const download = new Promise<Blob>(resolve => { finish = resolve; });
  const avatar = vi.spyOn(f.cloud, "invitationAvatar").mockReturnValue(download);
  const image = new Blob(["unavailable"], { type: "image/webp" });
  const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:obsolete-invitation-avatar");
  const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  try {
    f.row().click();
    await vi.waitFor(() => expect(avatar).toHaveBeenCalled());
    expect(f.dialog.textContent).toContain("1/5 members");
    f.updateInvitation(undefined);
    await vi.waitFor(() => expect(f.dialog.querySelector('[aria-label="Group members"]')).toBeNull(), { timeout: 3000 });
    finish(image);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.dialog.querySelector("img")).toBeNull();
    if (createUrl.mock.calls.some(([blob]) => blob === image)) {
      expect(revokeUrl).toHaveBeenCalledWith("blob:obsolete-invitation-avatar");
    }
    expect(f.groupWrites()).toHaveLength(0);
  } finally { finish(image); f.cleanup(); }
});

it("honors image-preview changes while the roster is open", async () => {
  const f = await setup({ members: [{ memberNumber: 202, role: "owner" }], capacity: 5,
    avatarId: "c28ad05c-e4ee-428e-808e-eb5508fe3252" });
  const avatar = vi.spyOn(f.cloud, "invitationAvatar").mockResolvedValue(new Blob(["avatar"], { type: "image/webp" }));
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:allowed-group-avatar");
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  try {
    f.settings.update(s => { s.linkPresence.profileImagePreviews = "ask"; });
    f.row().click();
    await vi.waitFor(() => expect(f.dialog?.textContent).toContain("1/5 members"));
    expect(avatar).not.toHaveBeenCalled();
    f.settings.update(s => { s.linkPresence.profileImagePreviews = "always"; });
    await vi.waitFor(() => expect(f.dialog.querySelector(".kl-group-invitation-review-icon img")).not.toBeNull());
    f.settings.update(s => { s.linkPresence.profileImagePreviews = "never"; });
    await vi.waitFor(() => expect(f.dialog.querySelector(".kl-group-invitation-review-icon img")).toBeNull());
    expect(revoke).toHaveBeenCalledWith("blob:allowed-group-avatar");
    expect(f.dialog.textContent).toContain("1/5 members");
    expect(f.action("Accept invitation").disabled).toBe(false);
    expect(f.groupWrites()).toHaveLength(0);
  } finally { f.cleanup(); }
});

it("keeps the original uncertain inline action when opening invitation review", async () => {
  const f = await setup();
  try {
    const handler = f.request.getMockImplementation()!;
    let failed = false;
    f.request.mockImplementation(async (method, path, body, authenticated) => {
      if (method === "POST" && path === "/v1/groups/garden/accept" && !failed) {
        failed = true;
        throw new Error("Invitation response was lost.");
      }
      return handler(method, path, body, authenticated);
    });
    f.inbox.querySelector<HTMLButtonElement>('[data-mail-action="accept-1"]')!.click();
    await vi.waitFor(() => expect(f.inbox.textContent).toContain("Retry original group change"));
    expect(f.groupWrites()).toHaveLength(1);
    expect(f.root.querySelector(".kl-toast-message")?.textContent ?? "").not.toMatch(/You joined|Invitation declined/);
    f.row().click();
    await vi.waitFor(() => expect(f.dialog?.open).toBe(true));
    expect(f.action("Retry original group change")).not.toBeNull();
    expect(f.action("Retry original group change").disabled).toBe(false);
    expect(f.action("Decline")).toBeNull();
    expect(f.action("Accept invitation")).toBeNull();
    f.action("Retry original group change").click();
    await vi.waitFor(() => expect(f.dialog.open, f.dialog.textContent ?? "").toBe(false));
    expect(f.groupWrites()).toHaveLength(2);
    expect(f.groupWrites().every(([method, path]) => method === "POST" && path.endsWith("/accept"))).toBe(true);
    expect(f.openGroup).toHaveBeenCalledExactlyOnceWith("garden");
    expect(f.root.querySelector(".kl-toast-message")?.textContent).toBe("You joined Night Garden.");
  } finally { f.cleanup(); }
});

it.each(["route", "close", "session"] as const)("closes the review on %s and prevents detached actions", async change => {
  const f = await setup();
  try {
    f.row().click();
    await vi.waitFor(() => expect(f.dialog?.open).toBe(true));
    const accept = f.action("Accept invitation");
    if (change === "route") f.route("people").click();
    else if (change === "close") f.view.close();
    else f.disconnect();
    await vi.waitFor(() => expect(f.dialog.open, f.dialog.textContent ?? "").toBe(false));
    accept.click();
    await Promise.resolve(); await Promise.resolve();
    expect(f.groupWrites()).toHaveLength(0);
    expect(f.openGroup).not.toHaveBeenCalled();
  } finally { f.cleanup(); }
});

it("recovers a failed unavailable-invitation refresh without joining", async () => {
  const f = await setup();
  try {
    vi.spyOn(CloudGroupInbox.prototype, "reviewInvitation").mockReturnValueOnce(undefined);
    f.row().click();
    await vi.waitFor(() => expect(f.dialog?.open).toBe(true));
    const refresh = [...f.dialog.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Refresh invitation")!;
    f.failRefresh(true);
    refresh.click();
    await vi.waitFor(() => expect(f.dialog.textContent).toContain("Invitation refresh failed."));
    expect(refresh.disabled).toBe(false);
    f.failRefresh(false);
    refresh.click();
    await vi.waitFor(() => expect(f.dialog.querySelector("h3")?.textContent).toBe("Night Garden"));
    expect(f.groupWrites()).toHaveLength(0);
    expect(f.openGroup).not.toHaveBeenCalled();
  } finally { f.cleanup(); }
});

it.each(["inbox", "bell"] as const)("opens current Groups from an undated Local59 %s notification", async source => {
  const f = await setup({}, true);
  const avatar = vi.spyOn(f.cloud, "invitationAvatar");
  try {
    if (source === "bell") {
      f.bell.click();
      await vi.waitFor(() => expect(f.popup.open).toBe(true));
    }
    const surface = source === "bell" ? f.popup : f.inbox;
    const row = surface.querySelector<HTMLElement>('[data-mail-id="1"]')!;
    expect(row.textContent).toContain("Review current invitations in Groups");
    expect(row.querySelector('[data-mail-action="accept-1"], [data-mail-action="decline-1"]')).toBeNull();
    row.querySelector<HTMLButtonElement>('[data-mail-action="open-1"]')!.click();
    await vi.waitFor(() => expect(f.root.querySelector(".kl-panel")?.getAttribute("data-workspace")).toBe("chat"));
    await vi.waitFor(() => expect(f.root.querySelector(".kl-group-invitation")?.textContent).toContain("Night Garden"));
    expect(f.root.querySelector(".kl-group-invitation-review")).toBeNull();
    expect(f.groupWrites()).toEqual([]);
    expect(f.openGroup).not.toHaveBeenCalled();
    expect(avatar).not.toHaveBeenCalled();
  } finally { f.cleanup(); }
});

const completedAction = (dialog: HTMLDialogElement, label: string) =>
  [...dialog.querySelectorAll<HTMLButtonElement>("button")].find(button => !button.hidden && button.textContent.trim() === label);

async function openProcessedReview(f: Awaited<ReturnType<typeof setup>>, origin: "inbox" | "bell") {
  if (origin === "bell") {
    f.bell.click();
    await vi.waitFor(() => expect(f.popup.open).toBe(true));
  }
  const open = origin === "bell" ? f.popup.querySelector<HTMLButtonElement>('[data-mail-action="open-1"]')! : f.row();
  expect(open.textContent).not.toMatch(/\d+\/\d+ members/);
  if (origin === "inbox") open.focus();
  open.click();
  await vi.waitFor(() => expect(f.dialog?.open).toBe(true));
}

it.each([
  { origin: "inbox", status: "accepted", canOpen: false, message: "Invitation accepted" },
  { origin: "bell", status: "declined", canOpen: false, message: "Invitation declined" },
  { origin: "inbox", status: "cancelled", canOpen: false, message: "Invitation cancelled" },
  { origin: "bell", status: undefined, canOpen: undefined, message: "Invitation no longer pending" },
  { origin: "inbox", status: "unsupported", canOpen: true, message: "Invitation no longer pending" },
] as const)("shows a read-only $message review from $origin and restores focus on Close", async sample => {
  const legacy = sample.status === undefined;
  const invitationTitle = `Tõrva🌙<i>${"Äh".repeat(19)}&</i>`;
  const memberCount = sample.status === "unsupported" ? 6 : 3;
  const processed = { ...sample, ...(legacy ? {} : { invitationTitle }), memberCount, capacity: 5,
    title: "Unverified title", activeMember: true, newerInvite: true };
  const f = await setup({ members: [{ memberNumber: 550, role: "member" }], capacity: 5,
    avatarId: "c28ad05c-e4ee-428e-808e-eb5508fe3252" }, legacy, processed);
  const avatar = vi.spyOn(f.cloud, "invitationAvatar");
  try {
    await openProcessedReview(f, sample.origin);
    await vi.waitFor(() => expect(f.dialog.textContent).toContain(sample.message + "."));
    const heading = f.dialog.querySelector("h3");
    expect(heading?.textContent).toBe(legacy ? "Group invitation" : invitationTitle);
    expect(heading?.childElementCount).toBe(0);
    const labels = [...f.dialog.querySelectorAll("button:not([hidden])")].map(button => button.textContent.trim());
    expect(labels).not.toContain("Open group");
    expect(labels).not.toContain("Accept invitation");
    expect(labels).not.toContain("Decline");
    expect(f.dialog.querySelector('[aria-label="Group members"]')).toBeNull();
    expect(f.dialog.textContent).not.toMatch(/Later invitation|Unverified title|Member 550|1\/5 members/);
    if (legacy || sample.status === "unsupported") {
      expect(f.dialog.querySelector(".kl-group-invitation-count")).toBeNull();
    } else {
      const inviter = f.dialog.querySelector(".kl-group-invitation-review-summary p");
      expect(inviter?.textContent).toBe("Member 303 invited you");
      expect(inviter?.nextElementSibling?.textContent).toBe("3/5 members");
    }
    expect(avatar).not.toHaveBeenCalled();
    completedAction(f.dialog, "Close")!.click();
    await vi.waitFor(() => expect(f.dialog.open).toBe(false));
    await vi.waitFor(() => expect(f.root.activeElement).toBe(sample.origin === "bell" ? f.bell : f.row()));
    expect(f.openGroup).not.toHaveBeenCalled();
    expect(f.groupWrites()).toHaveLength(0);
  } finally { f.cleanup(); }
});

it.each(["bell", "inbox"] as const)("requires an explicit Open group for an accepted invitation from %s", async origin => {
  const f = await setup({}, false, { status: "accepted", canOpen: true, title: "Night Garden", memberCount: 2,
    ...(origin === "inbox" ? { invitationTitle: "Night <Moon> 🌙", capacity: 5 } : {}), activeMember: true });
  try {
    await openProcessedReview(f, origin);
    await vi.waitFor(() => expect(completedAction(f.dialog, "Open group")?.disabled).toBe(false));
    expect(f.dialog.querySelector("h3")?.textContent).toBe(origin === "inbox" ? "Night <Moon> 🌙" : "Group invitation");
    expect(f.dialog.textContent).not.toContain("Night Garden");
    if (origin === "inbox") expect(f.dialog.textContent).toContain("2/5 members");
    else expect(f.dialog.querySelector(".kl-group-invitation-count")).toBeNull();
    expect(f.dialog.textContent).toContain("Invitation accepted.");
    expect(f.openGroup).not.toHaveBeenCalled();
    completedAction(f.dialog, "Open group")!.click();
    await vi.waitFor(() => expect(f.openGroup).toHaveBeenCalledExactlyOnceWith("garden"));
    expect(f.dialog.open).toBe(false);
    expect(f.root.querySelector<HTMLElement>(".kl-panel")?.dataset.workspace).toBe("chat");
    expect(f.groupWrites()).toHaveLength(0);
    expect(f.root.querySelector(".kl-toast-message")?.textContent ?? "").not.toMatch(/You joined|Invitation declined/);
  } finally { f.cleanup(); }
});

it.each(["leave", "disconnect", "other-route"] as const)("prevents a completed invitation opening the group after %s", async change => {
  const f = await setup({}, false, { status: "accepted", canOpen: true, title: "Night Garden", invitationTitle: "Night <Moon> 🌙", memberCount: 4, capacity: 5, activeMember: true });
  try {
    await openProcessedReview(f, "inbox");
    await vi.waitFor(() => expect(completedAction(f.dialog, "Open group")?.disabled).toBe(false));
    const oldButton = completedAction(f.dialog, "Open group")!;
    if (change === "leave") f.leaveGroup();
    else if (change === "disconnect") f.disconnect();
    else f.route("people").click();
    oldButton.click();
    if (change === "leave") {
      await vi.waitFor(() => expect(!f.dialog.open || !completedAction(f.dialog, "Open group") ||
        completedAction(f.dialog, "Open group")!.disabled).toBe(true), { timeout: 3000 });
      expect(f.dialog.querySelector("h3")?.textContent).toBe("Night <Moon> 🌙");
      expect(f.dialog.textContent).toContain("4/5 members");
    } else await vi.waitFor(() => expect(f.dialog.open).toBe(false));
    expect(f.openGroup).not.toHaveBeenCalled();
    expect(f.groupWrites()).toHaveLength(0);
  } finally { f.cleanup(); }
});

it("does not open a new invitation for the same group when rechecking a completed notification", async () => {
  const f = await setup({}, false, { status: "accepted", canOpen: true, title: "Night Garden", memberCount: 3, capacity: 5, activeMember: true });
  try {
    await openProcessedReview(f, "inbox");
    await vi.waitFor(() => expect(completedAction(f.dialog, "Open group")?.disabled).toBe(false));
    const original = f.request.getMockImplementation()!;
    const rechecked = vi.fn();
    f.request.mockImplementation(async (method, path, body, authenticated) => {
      if (new URL(path, f.cloud.origin).pathname === "/v1/mailbox/1") {
        const old = await original(method, path, body, authenticated) as MailItem;
        rechecked();
        return { ...old, actor: 701, groupInvitedAt: f.invitation.invitedAt + 500, groupInvitationMemberCount: 1, groupInvitationCapacity: 5, pending: true,
          groupInvitationHistoryPreview: { members: [{ memberNumber: 777, role: "owner" }], avatarId: historicalAsset } };
      }
      return original(method, path, body, authenticated);
    });
    completedAction(f.dialog, "Open group")!.click();
    await vi.waitFor(() => expect(rechecked).toHaveBeenCalled());
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.dialog.textContent).toContain("3/5 members");
    expect(f.dialog.textContent).not.toMatch(/1\/5 members|Member 777/);
    expect(f.dialog.querySelector('[aria-label="Group members"]')).toBeNull();
    expect(f.openGroup).not.toHaveBeenCalled();
    expect(f.action("Accept invitation")).toBeNull();
    expect(f.groupWrites()).toHaveLength(0);
  } finally { f.cleanup(); }
});

it("ignores an active membership reply arriving after the completed review closes", async () => {
  const f = await setup({}, false, { status: "accepted", canOpen: true, title: "Night Garden", activeMember: true });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  try {
    await openProcessedReview(f, "bell");
    await vi.waitFor(() => expect(completedAction(f.dialog, "Open group")?.disabled).toBe(false));
    const original = f.request.getMockImplementation()!;
    const started = vi.fn();
    f.request.mockImplementation(async (method, path, body, authenticated) => {
      if (new URL(path, f.cloud.origin).pathname === "/v1/groups/garden") {
        started();
        await gate;
      }
      return original(method, path, body, authenticated);
    });
    completedAction(f.dialog, "Open group")!.click();
    await vi.waitFor(() => expect(started).toHaveBeenCalled());
    f.dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    await vi.waitFor(() => expect(f.dialog.open).toBe(false));
    release();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.openGroup).not.toHaveBeenCalled();
    expect(f.groupWrites()).toHaveLength(0);
  } finally { release(); f.cleanup(); }
});

it.each(["accepted", "declined", "cancelled", "expired"] as const)("converts the open pending review to its exact remote %s outcome", async status => {
  const f = await setup({ members: [{ memberNumber: 202, role: "owner" }], capacity: 5, avatarId: null });
  const avatar = vi.spyOn(f.cloud, "invitationAvatar");
  try {
    await openProcessedReview(f, "inbox");
    await vi.waitFor(() => expect(f.dialog.textContent).toContain("1/5 members"));
    const oldAction = f.action("Accept invitation");
    const newerInvite = status === "cancelled";
    f.finishRemotely({ status: status === "expired" ? undefined : status, invitationTitle: "Moonlit archive", memberCount: 2, capacity: 5,
      canOpen: status === "accepted", activeMember: status === "accepted", newerInvite,
      historyPreview: { members: [{ memberNumber: 440, role: "owner" }, historicalMembers[2]], avatarId: null } }, {
      members: [{ memberNumber: 660, role: "owner" }], capacity: 5, avatarId: "c28ad05c-e4ee-428e-808e-eb5508fe3252",
    });
    await vi.waitFor(() => expect(f.dialog.textContent).toContain(status === "expired" ? "Invitation no longer pending." : "Invitation " + status + "."), { timeout: 3000 });
    expect(f.dialog.querySelector("h3")?.textContent).toBe("Moonlit archive");
    expect(f.dialog.textContent).toContain("2/5 members");
    await vi.waitFor(() => expect(f.dialog.querySelector('[aria-label="Group members"]')?.textContent).toMatch(/Member 440.*Owner.*Member 505.*Member/));
    expect(f.dialog.textContent).not.toMatch(/Later invitation|Member 660|Member 202|1\/5 members/);
    expect(completedAction(f.dialog, "Accept invitation")).toBeUndefined();
    expect(completedAction(f.dialog, "Decline")).toBeUndefined();
    expect(completedAction(f.dialog, "Close")).toBeDefined();
    oldAction.click();
    if (status === "accepted") await vi.waitFor(() => expect(completedAction(f.dialog, "Open group")).toBeDefined());
    else expect(completedAction(f.dialog, "Open group")).toBeUndefined();
    expect(avatar).not.toHaveBeenCalled();
    expect(f.openGroup).not.toHaveBeenCalled();
    expect(f.groupWrites()).toHaveLength(0);
    expect(f.root.querySelector(".kl-toast-message")?.textContent ?? "").not.toMatch(/You joined|Invitation declined/);
  } finally { f.cleanup(); }
});

it("drops an exact completion reply when the user has already left the pending review", async () => {
  const f = await setup({ members: [{ memberNumber: 202, role: "owner" }], capacity: 5 });
  const avatar = vi.spyOn(f.cloud, "invitationAvatar");
  const readStarted = vi.fn();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  try {
    await openProcessedReview(f, "bell");
    await vi.waitFor(() => expect(f.dialog.textContent).toContain("1/5 members"));
    const handle = f.request.getMockImplementation()!;
    f.request.mockImplementation(async (method, path, body, authenticated) => {
      if (new URL(path, f.cloud.origin).pathname === "/v1/mailbox/1") {
        readStarted();
        await gate;
      }
      return handle(method, path, body, authenticated);
    });
    f.finishRemotely({ status: "cancelled", newerInvite: true }, { avatarId: "c28ad05c-e4ee-428e-808e-eb5508fe3252" });
    await vi.waitFor(() => expect(readStarted).toHaveBeenCalled());
    f.route("people").click();
    await vi.waitFor(() => expect(f.dialog.open).toBe(false));
    release();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.dialog.open).toBe(false);
    expect(f.openGroup).not.toHaveBeenCalled();
    expect(avatar).not.toHaveBeenCalled();
    expect(f.groupWrites()).toHaveLength(0);
  } finally { release(); f.cleanup(); }
});

it("removes the inviter's displayed name when blocked while reviewing an outcome", async () => {
  const f = await setup({}, false, { status: "accepted", canOpen: true, title: "Night Garden", activeMember: true });
  try {
    await openProcessedReview(f, "bell");
    await vi.waitFor(() => expect(completedAction(f.dialog, "Open group")).toBeDefined());
    expect(f.dialog.textContent).toContain("Member 303 invited you");
    vi.spyOn(f.cloud, "isProfileBlocked").mockImplementation(member => member === 303);
    f.relationshipsChanged();
    await vi.waitFor(() => expect(f.dialog.open && f.dialog.textContent.includes("Member 303")).toBe(false));
    if (f.dialog.open) {
      expect(f.dialog.textContent).not.toContain("Night Garden");
      expect(completedAction(f.dialog, "Open group")).toBeUndefined();
    }
    expect(f.openGroup).not.toHaveBeenCalled();
  } finally { f.cleanup(); }
});

it.each([
  { origin: "inbox", status: "accepted", canOpen: true },
  { origin: "bell", status: "declined", canOpen: false },
] as const)("shows the invitation-time roster from exact $status mail opened through $origin", async sample => {
  const processed = { status: sample.status, canOpen: sample.canOpen, invitationTitle: "Original room", memberCount: 3, capacity: 5,
    activeMember: sample.canOpen, newerInvite: true, historyPreview: { members: historicalMembers, avatarId: historicalAsset } };
  const liveAsset = "171c7d5b-a64a-49e3-978c-e6313fcded92";
  const f = await setup({ members: [{ memberNumber: 701, role: "owner" }], avatarId: liveAsset, capacity: 5 }, false, processed);
  const avatar = vi.spyOn(f.cloud, "historicalInvitationAvatar");
  const pendingAvatar = vi.spyOn(f.cloud, "invitationAvatar"), generalMedia = vi.spyOn(f.cloud, "media");
  if (sample.canOpen) avatar.mockResolvedValue(new Blob(["receipt thumbnail"], { type: "image/webp" }));
  else avatar.mockRejectedValue(new Error("This media is unavailable."));
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:historical-room");
  const shownName = "Lumi <img> & Yu";
  const profile = { memberNumber: 505, displayName: shownName, visible: true, bio: "", revision: 1, updatedAt: 100,
    avatarFrame: "none", profileStyle: "classic", avatarId: null, bannerId: null } as const;
  vi.spyOn(f.cloud, "peekProfile").mockImplementation(member => member === 505 ? profile : undefined);
  try {
    await openProcessedReview(f, sample.origin);
    const roster = () => f.dialog.querySelector('[aria-label="Group members"]');
    await vi.waitFor(() => expect(roster()?.querySelectorAll("li")).toHaveLength(3));
    const rows = [...roster()!.querySelectorAll("li")];
    expect(rows.map(row => [row.querySelector("strong")?.textContent, row.querySelector(".kl-group-invitation-role")?.textContent])).toEqual([
      ["Member 202", "Owner"], ["Member 404", "Admin"], [shownName, "Member"],
    ]);
    expect(rows[2]!.querySelector("strong img")).toBeNull();
    expect(f.dialog.textContent).not.toMatch(/Member 701|Member 72385|Later invitation/);
    expect(f.inbox.textContent).not.toContain(shownName);
    expect(f.popup.textContent).not.toContain(shownName);
    await vi.waitFor(() => expect(avatar).toHaveBeenCalled());
    expect(avatar.mock.calls.every(([mailId, asset, at]) => mailId === 1 && asset === historicalAsset && at === f.invitation.invitedAt)).toBe(true);
    if (sample.canOpen) {
      await vi.waitFor(() => expect(f.dialog.querySelector(".kl-group-invitation-review-icon img")?.getAttribute("src")).toBe("blob:historical-room"));
      await vi.waitFor(() => expect(completedAction(f.dialog, "Open group")).toBeDefined());
    } else {
      expect(f.dialog.querySelector(".kl-group-invitation-review-icon img")).toBeNull();
      expect(completedAction(f.dialog, "Open group")).toBeUndefined();
    }
    expect(pendingAvatar).not.toHaveBeenCalled();
    expect(generalMedia.mock.calls.some(([id]) => id === historicalAsset || id === liveAsset)).toBe(false);
    completedAction(f.dialog, "Close")!.click();
    await vi.waitFor(() => expect(f.dialog.open).toBe(false));
    if (sample.canOpen) {
      await vi.waitFor(() => expect(revoke).toHaveBeenCalledWith("blob:historical-room"));
      await openProcessedReview(f, "inbox");
      await vi.waitFor(() => expect(completedAction(f.dialog, "Open group")).toBeDefined());
      avatar.mockRejectedValue(new Error("Group avatar access ended."));
      f.leaveGroup();
      await vi.waitFor(() => expect(roster()?.textContent).toContain(shownName));
      expect(completedAction(f.dialog, "Open group")).toBeUndefined();
      expect(f.dialog.querySelector(".kl-group-invitation-review-icon img")).toBeNull();
      expect(f.dialog.textContent).toContain("3/5 members");
    }
    expect(f.groupWrites()).toHaveLength(0);
    expect(f.openGroup).not.toHaveBeenCalled();
  } finally { f.cleanup(); }
});

it("clears historical portraits immediately on access hints and discards stale reads, thumbnails and blocked native members", async () => {
  const processed: ProcessedMail = { status: "accepted", canOpen: true, activeMember: true, invitationTitle: "Private original name", memberCount: 3, capacity: 5,
    historyPreview: { members: historicalMembers, avatarId: historicalAsset } };
  const f = await setup({}, false, processed);
  let finishImage!: (image: Blob) => void;
  const avatar = vi.spyOn(f.cloud, "historicalInvitationAvatar").mockImplementation(() => new Promise(resolve => { finishImage = resolve; }));
  const imageUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:previous-invitation");
  try {
    f.settings.update(s => { s.linkPresence.profileImagePreviews = "ask"; });
    await openProcessedReview(f, "inbox");
    const roster = () => f.dialog.querySelector('[aria-label="Group members"]');
    await vi.waitFor(() => expect(roster()?.textContent).toContain("Member 505"));
    expect(avatar).not.toHaveBeenCalled();
    f.settings.update(s => { s.linkPresence.profileImagePreviews = "always"; });
    await vi.waitFor(() => expect(finishImage).toBeTypeOf("function"));
    const staleBlob = new Blob(["stale historical avatar"], { type: "image/webp" });
    const handle = f.request.getMockImplementation()!;
    let finishDetail!: (item: MailItem) => void;
    let holdNext = true;
    f.request.mockImplementation(async (method, path, body, authenticated) => {
      if (holdNext && new URL(path, f.cloud.origin).pathname === "/v1/mailbox/1") {
        holdNext = false;
        return new Promise<MailItem>(resolve => { finishDetail = resolve; });
      }
      return handle(method, path, body, authenticated);
    });
    f.relationshipsChanged();
    expect(roster()).toBeNull();
    expect(f.dialog.textContent).not.toContain("Member 505");
    await vi.waitFor(() => expect(finishDetail).toBeTypeOf("function"));
    const stale = await handle("GET", "/v1/mailbox/1") as MailItem;
    // Native blocks may not have reached the server yet: its still-valid old roster must remain masked.
    const native = vi.spyOn(f.adapter, "getPlayerRelationships").mockImplementation(member => member === 505 ? ["ghosted"] : []);
    f.relationshipsChanged();
    finishImage(staleBlob); finishDetail(stale);
    await vi.waitFor(() => expect(completedAction(f.dialog, "Open group")).toBeDefined());
    expect(roster()).toBeNull();
    expect(f.dialog.textContent).not.toContain("Member 505");
    expect(f.dialog.textContent).toContain("3/5 members");
    expect(imageUrl).not.toHaveBeenCalledWith(staleBlob);
    expect(f.dialog.querySelector(".kl-group-invitation-review-icon img")).toBeNull();

    native.mockRestore();
    for (const malformed of [undefined, { members: historicalMembers.slice(0, 2), avatarId: historicalAsset },
      { members: [historicalMembers[0], historicalMembers[0], historicalMembers[2]], avatarId: historicalAsset }]) {
      processed.historyPreview = malformed;
      f.relationshipsChanged();
      await vi.waitFor(() => expect(completedAction(f.dialog, "Open group")).toBeDefined());
      expect(roster()).toBeNull();
      expect(f.dialog.querySelector(".kl-group-invitation-review-icon img")).toBeNull();
    }
    let denyReceipt = false;
    const denyGroup = vi.fn(() => { throw new CloudError("forbidden", 403); });
    f.request.mockImplementation(async (method, path, body, authenticated) => {
      const pathname = new URL(path, f.cloud.origin).pathname;
      if (pathname === "/v1/groups/garden") return denyGroup();
      if (denyReceipt && pathname === "/v1/mailbox/1") throw new CloudError("not_found", 404);
      return handle(method, path, body, authenticated);
    });
    f.relationshipsChanged();
    await vi.waitFor(() => expect(denyGroup).toHaveBeenCalled());
    expect(f.dialog.open).toBe(true);
    expect(f.dialog.textContent).toContain("Private original name");
    expect(f.dialog.textContent).toContain("Member 303 invited you");
    expect(completedAction(f.dialog, "Open group")).toBeUndefined();
    expect(completedAction(f.dialog, "Close")).toBeDefined();
    denyReceipt = true;
    f.relationshipsChanged();
    await vi.waitFor(() => {
      expect(f.dialog.open).toBe(false);
      expect(f.dialog.textContent).not.toMatch(/Private original name|Member 303|Member 505/);
    });
    expect(f.groupWrites()).toHaveLength(0);
  } finally { f.cleanup(); }
});

it("requires feature support even if an older server sends extra fields on a historical record", async () => {
  const f = await setup({}, false, { status: "accepted", canOpen: true, activeMember: true, memberCount: 3, capacity: 5,
    historyPreview: { members: historicalMembers, avatarId: historicalAsset } }, false);
  const avatar = vi.spyOn(f.cloud, "historicalInvitationAvatar");
  try {
    await openProcessedReview(f, "bell");
    await vi.waitFor(() => expect(completedAction(f.dialog, "Open group")).toBeDefined());
    expect(f.dialog.textContent).toContain("3/5 members");
    expect(f.dialog.querySelector('[aria-label="Group members"]')).toBeNull();
    expect(avatar).not.toHaveBeenCalled();
  } finally { f.cleanup(); }
});
