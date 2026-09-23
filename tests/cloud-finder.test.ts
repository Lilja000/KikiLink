// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { CloudClient } from "../src/cloud/client";
import type { CloudGroup, CloudProfile } from "../src/cloud/types";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import { ChatService } from "../src/modules/link-chat/chat-service";
import { LinkChatView } from "../src/modules/link-chat/view";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";

const disposers: Array<() => void> = [];
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function button(root: ParentNode, text: string): HTMLButtonElement {
  const result = [...root.querySelectorAll("button")].find(b => b.textContent === text);
  if (!result) throw new Error(`Missing button: ${text}`);
  return result;
}

async function setup(cloudEnabled = true) {
  const group: CloudGroup = {
    id: crypto.randomUUID(), title: "Existing group", owner: 202, revision: 1,
    legacyId: null, conversationId: crypto.randomUUID(), membershipVersion: 1,
    keyVersion: 1, createdAt: 1,
    members: [
      { memberNumber: 202, role: "owner", status: "active" },
      { memberNumber: 101, role: "member", status: "active" },
    ],
  };
  const profiles = new Map<number, CloudProfile>();
  let feedResponse: (() => Promise<Response>) | undefined;
  const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
    const path = new URL(String(url)).pathname;
    if (path === "/v1/presence") return new Response(null, { status: 204 });
    if (path === "/v1/events") return new Response(null, { status: 503 });
    if (path === "/v1/auth/challenges") return Response.json({
      challengeId: crypto.randomUUID(), proof: "p".repeat(43), exchange: "e".repeat(43),
      verifierMember: 909, expiresAt: Date.now() + 180000,
    });
    if (path === "/v1/auth/exchange") return Response.json({
      memberNumber: 101, token: "t".repeat(43), expiresAt: Date.now() + 3600000,
    });
    if (path === "/v1/me") return Response.json({ moderator: false });
    if (path.startsWith("/v1/profiles/") && profiles.has(Number(path.split("/").at(-1)))) return Response.json(profiles.get(Number(path.split("/").at(-1))));
    if (path === "/v1/profiles/101")
      return Response.json({ error: "not_found" }, { status: 404 });
    if (path === "/v1/groups") return Response.json({ items: [group] });
    if (path === `/v1/groups/${group.id}`) return Response.json(group);
    if (path === "/v1/feed" && feedResponse) return feedResponse();
    if (["/v1/blocks", "/v1/group-invitations", "/v1/feed",
      `/v1/conversations/${group.conversationId}/messages`].includes(path))
      return Response.json({ items: [], nextCursor: null });
    throw new Error(`Unexpected request: ${path}`);
  });
  const sendProof = vi.fn();
  const client = new CloudClient({
    origin: "https://cloud.example.test", memberNumber: 101,
    getMemberNumber: () => 101, isBlocked: () => false, sendProof, fetchImpl,
  });
  const adapter = {
    getMemberName: (member: number) => `Member ${member}`,
    getMemberNickname: () => undefined, getOwnMemberNumber: () => 101,
    getOwnName: () => "Kiki", getKnownContacts: () => [],
    getRoomCharacters: () => [], getCurrentRoomName: () => undefined,
    getPlayerRelationships: () => [], isInChatRoom: () => false,
    canSendBeep: () => true, isReady: () => true, sendBeep: vi.fn(),
  } as unknown as BCAdapter;
  const storage = new MemoryKeyValueStorage(), settings = new SettingsStore(storage);
  const service = new ChatService(new MemoryChatRepository(), settings);
  const view = new LinkChatView(adapter, service, settings, "0.29.0");
  if (cloudEnabled) view.attachCloud(client, storage);
  disposers.push(() => { view.destroy(); client.destroy(); });
  view.mount();
  await view.open();
  const shadow = document.querySelector("#kikilink-root")!.shadowRoot!;
  const cloud = shadow.querySelector<HTMLElement>(".kl-cloud");
  async function search(text: string) {
    shadow.querySelector<HTMLButtonElement>(".kl-finder-trigger")!.click();
    const query = shadow.querySelector<HTMLInputElement>(".kl-finder-query")!;
    await vi.waitFor(() => expect(query.getAttribute("aria-activedescendant")).not.toBeNull());
    query.value = text;
    query.dispatchEvent(new Event("input", { bubbles: true }));
    return query;
  }
  async function choose(title: string, keyboard = false) {
    const query = await search(title);
    const results = [...shadow.querySelectorAll<HTMLButtonElement>(".kl-finder-result")];
    const index = results.findIndex(r => r.querySelector(".kl-finder-result-title")?.textContent === title);
    expect(index).toBeGreaterThanOrEqual(0);
    if (keyboard) {
      for (let i = 0; i < index; i++) query.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
      query.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    } else results[index]!.click();
    expect(shadow.querySelector<HTMLDialogElement>(".kl-finder-dialog")!.open).toBe(false);
    expect(shadow.querySelector<HTMLElement>(".kl-panel")!.dataset.workspace).toBe(title === "Cloud Groups" ? "chat" : title === "Cloud Feed" ? "cloud" : "chat");
  }
  return { client, view, fetchImpl, sendProof, shadow, cloud, search, choose, settings, service, group,
    setProfile: (profile: CloudProfile) => profiles.set(profile.memberNumber, profile),
    setFeedResponse: (response: () => Promise<Response>) => { feedResponse = response; } };
}

describe("Cloud destinations in LinkFinder", () => {
  it("closes a clean profile directly and offers save, discard, or continued editing for a draft", async () => {
    const { shadow, view, settings } = await setup(false);
    const open = () => shadow.querySelector<HTMLButtonElement>(".kl-presence-trigger")!.click();
    open();
    const dialog = shadow.querySelector<HTMLDialogElement>(".kl-presence-dialog")!;
    button(dialog, "Cancel").click();
    expect(dialog.open).toBe(false);
    expect(shadow.querySelector<HTMLDialogElement>(".kl-unsaved-dialog")!.open).toBe(false);

    open();
    const bio = dialog.querySelector<HTMLTextAreaElement>(".kl-profile-bio-input")!;
    bio.value = "Keep this draft";
    button(dialog, "Cancel").click();
    const warning = shadow.querySelector<HTMLDialogElement>(".kl-unsaved-dialog")!;
    expect(dialog.open).toBe(true); expect(warning.open).toBe(true);
    expect(warning.textContent).toContain("You have unsaved changes");
    button(warning, "Keep Editing").click();
    expect(warning.open).toBe(false); expect(dialog.open).toBe(true); expect(bio.value).toBe("Keep this draft");

    view.close();
    expect(warning.open).toBe(true); expect(dialog.open).toBe(true);
    button(warning, "Discard Changes").click();
    expect(warning.open).toBe(false); expect(dialog.open).toBe(false);
    open(); expect(dialog.querySelector<HTMLTextAreaElement>(".kl-profile-bio-input")!.value).toBe("");

    dialog.querySelector<HTMLTextAreaElement>(".kl-profile-bio-input")!.value = "Saved through confirmation";
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(warning.open).toBe(true);
    button(warning, "Save Changes").click();
    await vi.waitFor(() => expect(dialog.open).toBe(false));
    expect(settings.getSection("linkPresence").bio).toBe("Saved through confirmation");
  });

  it.each(["comfortable", "compact", "super-compact"] as const)(
    "retains the profile disclosure and drafts when the keyboard reduces the viewport at %s density",
    async density => {
      const viewport = Object.assign(new EventTarget(), { height: window.innerHeight, offsetTop: 0 });
      vi.stubGlobal("visualViewport", viewport);
      const { shadow, settings, fetchImpl } = await setup();
      settings.update(draft => { draft.ui.density = density; });
      shadow.querySelector<HTMLButtonElement>(".kl-presence-trigger")!.click();
      const host = shadow.host as HTMLElement;
      const dialog = shadow.querySelector<HTMLDialogElement>(".kl-presence-dialog")!;
      const body = dialog.querySelector<HTMLElement>(".kl-presence-body")!;
      const preferences = body.querySelector<HTMLDetailsElement>(".kl-preferences-editor")!;
      const bio = body.querySelector<HTMLTextAreaElement>(".kl-profile-bio-input")!;
      bio.value = "An unsaved profile draft";
      preferences.querySelector<HTMLElement>("summary")!.click();
      expect(preferences.open).toBe(true);

      for (const height of [260, window.innerHeight, 320]) {
        viewport.height = height;
        viewport.dispatchEvent(new Event("resize"));
        expect(host.dataset.shortViewport).toBe(String(height < window.innerHeight - 80));
        if (height < window.innerHeight - 80) expect(host.style.getPropertyValue("--kl-visible-dialog-height")).toBe(`${height - 16}px`);
        expect(dialog.open).toBe(true);
        expect(preferences.open).toBe(true);
        expect(preferences.textContent).toContain("Connect to KikiLink Cloud to edit preferences.");
        expect(bio.value).toBe("An unsaved profile draft");
        // Applied sizing rules only: Happy DOM does not simulate Firefox layout.
        expect(getComputedStyle(body).display).toBe("flex");
        expect(getComputedStyle(body).flexDirection).toBe("column");
        expect(getComputedStyle(body).overflow).toBe("auto");
        for (const field of Array.from(body.children)) expect(getComputedStyle(field).flexShrink).toBe("0");
        expect(getComputedStyle(preferences).minHeight).toBe("64px");
        expect(dialog.querySelector(".kl-dialog-actions")?.parentElement).toBe(dialog);
      }
      preferences.querySelector<HTMLElement>("summary")!.click();
      expect(preferences.open).toBe(false);
      preferences.querySelector<HTMLElement>("summary")!.click();
      expect(preferences.open).toBe(true);
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it("opens Match preferences after Bio in the existing profile editor even before connecting", async () => {
    const { shadow, fetchImpl } = await setup();
    shadow.querySelector<HTMLButtonElement>(".kl-presence-trigger")!.click();
    const dialog = shadow.querySelector<HTMLDialogElement>(".kl-presence-dialog")!;
    const preferences = dialog.querySelector<HTMLDetailsElement>(".kl-preferences-editor")!;
    expect(dialog.open).toBe(true);
    expect(preferences.previousElementSibling?.querySelector(".kl-profile-bio-input")).not.toBeNull();
    preferences.querySelector<HTMLElement>("summary strong")!.click();
    expect(preferences.open).toBe(true);
    expect(preferences.textContent).toContain("Connect to KikiLink Cloud to edit preferences.");
    expect(fetchImpl).not.toHaveBeenCalled();
    preferences.querySelector<HTMLElement>("summary")!.click();
    expect(preferences.open).toBe(false);
  });

  it("uses the native sidebar and preserves direct/Feed drafts and DOM when switching through Groups", async () => {
    const { client, view, shadow, cloud, choose, fetchImpl } = await setup(); await client.connect();
    await view.openChat(202, "Person 202");
    expect(view.isActiveConversation(202)).toBe(true);
    const direct = shadow.querySelector<HTMLTextAreaElement>(".kl-composer-input")!;
    direct.value = "Direct draft"; direct.dispatchEvent(new Event("input"));
    await choose("Cloud Feed");
    await vi.waitFor(() => expect(cloud!.querySelector(".kl-feed-composer")).not.toBeNull());
    const feed = cloud!.querySelector(".kl-feed-layout");
    const before = fetchImpl.mock.calls.filter(([url]) => new URL(String(url)).pathname === "/v1/feed").length;
    button(cloud!, "Open groups").click();
    await vi.waitFor(() => expect(shadow.querySelector(".kl-cloud-group-row")).not.toBeNull());
    expect(cloud!.parentElement).toBe(shadow.querySelector(".kl-main"));
    expect(view.isActiveConversation(202)).toBe(false);
    expect(shadow.querySelector<HTMLElement>(".kl-layout")!.hidden).toBe(false);
    expect(cloud!.querySelector(".kl-cloud-tabs")!.childNodes).toHaveLength(0);
    expect(shadow.querySelector<HTMLButtonElement>(".kl-sidebar-new-group")!.hidden).toBe(false);
    expect(shadow.querySelector<HTMLButtonElement>(".kl-sidebar-new-chat:not(.kl-sidebar-new-group)")!.hidden).toBe(true);
    shadow.querySelector<HTMLButtonElement>('[data-chat-filter="all"]')!.click();
    expect(cloud!.hidden).toBe(true); expect(direct.value).toBe("Direct draft");
    expect(view.isActiveConversation(202)).toBe(true);
    expect(shadow.querySelector<HTMLButtonElement>(".kl-sidebar-new-group")!.hidden).toBe(true);
    expect(shadow.querySelector<HTMLButtonElement>(".kl-sidebar-new-chat:not(.kl-sidebar-new-group)")!.hidden).toBe(false);
    await choose("Cloud Feed");
    expect(cloud!.querySelector(".kl-feed-layout")).toBe(feed);
    expect(fetchImpl.mock.calls.filter(([url]) => new URL(String(url)).pathname === "/v1/feed")).toHaveLength(before);
  });
  it("renders saved Cloud details with the original KikiLink decorations, gradient and profile actions", async () => {
    const { client, shadow, cloud, choose, setProfile } = await setup();
    setProfile({ memberNumber: 101, displayName: "Kiki Cloud", bio: "Saved bio", revision: 2, visible: true,
      avatarFrame: "moon", profileStyle: "midnight", profileOutlineColor: "#bb2244", profileGradient: { start: "#123456", end: "#654321" },
      avatarId: null, bannerId: null, updatedAt: 1 });
    await client.connect(); await choose("Cloud Feed");
    await vi.waitFor(() => expect(cloud!.querySelector('[aria-label="Kiki Cloud"]')).not.toBeNull());
    cloud!.querySelector<HTMLButtonElement>('[aria-label="Kiki Cloud"]')!.click();
    await vi.waitFor(() => expect(shadow.querySelector(".kl-addon-profile-card")).not.toBeNull());
    const card = shadow.querySelector<HTMLElement>(".kl-addon-profile-card")!;
    expect(card.dataset.profileStyle).toBe("gradient"); expect(card.dataset.customGradient).toBe("true");
    expect(card.style.getPropertyValue("--kl-profile-gradient-primary")).toBe("#123456");
    expect(card.querySelector<HTMLElement>(".kl-addon-profile-avatar")!.dataset.avatarFrame).toBe("moon");
    expect(card.querySelector(".kl-addon-profile-status")).not.toBeNull();
    expect(card.querySelector(".kl-addon-profile-private")).not.toBeNull();
    expect(shadow.querySelector(".kl-cloud-profile")).toBeNull();
    button(card, "Edit profile").click();
    await vi.waitFor(() => expect(shadow.querySelector<HTMLDialogElement>(".kl-presence-dialog")!.open).toBe(true));
    expect(shadow.querySelector(".kl-presence-options")).not.toBeNull();
  });
  it("places Feed after Home, uses one group surface in Chat and one shared profile dialog", async () => {
    const { client, view, cloud, choose, shadow } = await setup(); await client.connect();
    const targets = [...shadow.querySelectorAll<HTMLElement>(".kl-feature-nav .kl-nav-item")].map(node => node.dataset.target);
    expect(targets.slice(0, 3)).toEqual(["home", "cloud", "chat"]);
    await choose("Cloud Feed"); await vi.waitFor(() => expect(cloud!.querySelector("textarea")).not.toBeNull());
    button(cloud!, "My profile").click();
    const dialog = shadow.querySelector<HTMLDialogElement>(".kl-presence-dialog")!; expect(dialog.open).toBe(true);
    expect(dialog.querySelector(".kl-presence-options")).not.toBeNull(); expect(dialog.querySelector(".kl-unified-profile")).not.toBeNull(); dialog.close();
    shadow.querySelector<HTMLButtonElement>(".kl-presence-trigger")!.click();
    expect(shadow.querySelector(".kl-presence-dialog")).toBe(dialog); expect(dialog.open).toBe(true); dialog.close();
    await choose("Cloud Groups"); await vi.waitFor(() => expect(shadow.querySelector(".kl-cloud-group-row")).not.toBeNull());
    expect(shadow.querySelector(".kl-group-chat-panel:not([hidden])")).toBeNull();
    await view.openChat(202, "Person 202");
    expect(cloud!.hidden).toBe(true); expect(shadow.querySelector<HTMLElement>(".kl-layout")!.hidden).toBe(false);
  });
  it("keeps Cloud shortcuts absent from an ordinary non-Cloud view", async () => {
    const { shadow, search, fetchImpl } = await setup(false);
    const query = await search("cloud");
    expect(shadow.querySelector(".kl-cloud")).toBeNull();
    expect(shadow.querySelectorAll(".kl-finder-result")).toHaveLength(0);
    expect(query.placeholder).not.toContain("Cloud");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("searches without requests or proofs and keeps the selected destination through explicit connection", async () => {
    const { shadow, cloud, search, choose, fetchImpl, sendProof, client } = await setup();
    await search("cloud");
    expect([...shadow.querySelectorAll(".kl-finder-result-title")].map(n => n.textContent))
      .toEqual(["Cloud Feed", "Cloud Groups", "My KikiLink profile"]);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(sendProof).not.toHaveBeenCalled();
    shadow.querySelector<HTMLDialogElement>(".kl-finder-dialog")!.close();
    await choose("Cloud Groups", true);
    expect(cloud!.textContent).toContain("Connect your BC identity");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(sendProof).not.toHaveBeenCalled();
    button(cloud!, "Connect with this BC account").click();
    await vi.waitFor(() => expect(cloud!.textContent).toContain("Your group conversations"));
    expect(client.connected).toBe(true);
    expect(shadow.querySelector('[data-chat-filter="groups"]')!.getAttribute("aria-pressed")).toBe("true");
  });

  it("opens each requested tab directly and retains Feed and group message drafts", async () => {
    const { client, cloud, choose, shadow } = await setup();
    await client.connect();
    await choose("Cloud Feed");
    await vi.waitFor(() => expect(cloud!.querySelector('textarea[aria-label="Share a post"]')).not.toBeNull());
    const feedDraft = cloud!.querySelector("textarea")!;
    feedDraft.value = "Unsent Feed draft";
    feedDraft.dispatchEvent(new Event("input"));

    await choose("Cloud Groups");
    await vi.waitFor(() => expect(cloud!.textContent).toContain("Your group conversations"));
    shadow.querySelector<HTMLButtonElement>(".kl-cloud-group-row")!.click();
    await vi.waitFor(() => expect(cloud!.querySelector('textarea[aria-label="Message this Cloud group"]')).not.toBeNull());
    const groupDraft = cloud!.querySelector("textarea")!;
    groupDraft.value = "Unsent group draft";
    groupDraft.dispatchEvent(new Event("input"));
    await choose("Cloud Feed");
    await choose("Cloud Groups", true);
    expect(cloud!.querySelector("textarea")).toBe(groupDraft);
    expect(groupDraft.value).toBe("Unsent group draft");

    await choose("My KikiLink profile", true);
    await vi.waitFor(() => expect(shadow.querySelector<HTMLDialogElement>(".kl-presence-dialog")?.open).toBe(true));
    expect(shadow.querySelectorAll(".kl-unified-profile")).toHaveLength(1);
    shadow.querySelector<HTMLDialogElement>(".kl-presence-dialog")!.close();
    await choose("Cloud Feed");
    await vi.waitFor(() => expect(cloud!.querySelector("textarea")?.value).toBe("Unsent Feed draft"));
    expect(cloud!.querySelector('[aria-current="page"]')!.textContent).toBe("Feed");
  });

  it("ignores a late Feed response after Finder has opened Groups", async () => {
    const { client, cloud, choose, shadow, setFeedResponse } = await setup();
    await client.connect();
    let resolve!: (value: Response) => void;
    let feedRequest!: Promise<Response>;
    setFeedResponse(() => feedRequest = new Promise<Response>(complete => { resolve = complete; }));
    await choose("Cloud Feed");
    await vi.waitFor(() => expect(resolve).toBeTypeOf("function"));
    await choose("Cloud Groups");
    await vi.waitFor(() => expect(cloud!.textContent).toContain("Your group conversations"));
    resolve(Response.json({ items: [], nextCursor: null }));
    await feedRequest;
    await new Promise(complete => setTimeout(complete, 0));
    expect(cloud!.textContent).toContain("Your group conversations");
    expect(cloud!.textContent).not.toContain("Share a post");
    expect(shadow.querySelector('[data-chat-filter="groups"]')!.getAttribute("aria-pressed")).toBe("true");
  });
});

it('shows Direct, Groups and Unread with one contextual action and marks both inboxes read', async () => {
  const {client,view,shadow,service,group,choose}=await setup();
  group.lastMessage={id:'summary',sender:202,sequence:2,text:'Group unread',createdAt:2} as any;
  group.lastIncomingSequence=2;group.incomingSequences=[{memberNumber:202,sequence:2}];
  await client.connect();await service.capture({peerNumber:303,peerName:'Direct friend',direction:'incoming',content:'Direct unread',sentAt:Date.now(),includeRoom:false},false);
  await choose('Cloud Groups');await view.refresh();
  expect([...shadow.querySelectorAll('.kl-chat-filter')].map(n=>n.textContent)).toEqual(['Direct','Groups','Unread']);
  shadow.querySelector<HTMLButtonElement>('[data-chat-filter="unread"]')!.click();
  await vi.waitFor(()=>expect(shadow.querySelector('.kl-conversations:not(.kl-cloud-group-list)')!.textContent).toContain('Direct unread'));
  expect(shadow.querySelector('.kl-cloud-group-list')!.textContent).toContain('Group unread');
  expect(shadow.querySelector<HTMLElement>('.kl-sidebar-new-group')!.hidden).toBe(true);
  const read=shadow.querySelector<HTMLButtonElement>('.kl-sidebar-read-all')!;expect(read.hidden).toBe(false);read.click();
  await vi.waitFor(()=>expect(service.totalUnread()).resolves.toBe(0));
  await vi.waitFor(()=>expect(shadow.querySelectorAll('.kl-cloud-group-row')).toHaveLength(0));
});
it('opens a never-seen group member in the native profile dialog, including the default state', async () => {
  const {client,shadow,cloud,choose,setProfile}=await setup();
  setProfile({memberNumber:202,displayName:'Snowy',bio:'Cloud bio',statusMessage:'Busy mapping',avatarFrame:'moon',profileStyle:'midnight',avatarId:null,bannerId:null,revision:1,visible:true,updatedAt:1});
  await client.connect();await choose('Cloud Groups');
  await vi.waitFor(()=>expect(shadow.querySelector('.kl-cloud-group-row')).not.toBeNull());
  shadow.querySelector<HTMLButtonElement>('.kl-cloud-group-row')!.click();
  await vi.waitFor(()=>expect(cloud!.querySelector('.kl-group-header')).not.toBeNull());
  cloud!.querySelector<HTMLButtonElement>('.kl-group-settings-button')!.click();
  await vi.waitFor(()=>expect(cloud!.querySelector('.kl-group-member .kl-social-name')!.textContent).toBe('Snowy'));
  cloud!.querySelector<HTMLButtonElement>('.kl-group-member .kl-social-avatar')!.click();
  await vi.waitFor(()=>expect(shadow.querySelector('.kl-addon-profile-card')!.textContent).toContain('Cloud bio'));
  expect(shadow.querySelector('.kl-addon-profile-card')!.textContent).toContain('Busy mapping');
  expect(shadow.querySelector('.kl-addon-profile-card')!.textContent).not.toContain('unreachable');
  setProfile({memberNumber:202,displayName:'Member 202',bio:'',statusMessage:'',avatarFrame:'none',profileStyle:'classic',avatarId:null,bannerId:null,revision:0,visible:false,updatedAt:0,isDefault:true});
  await client.profile(202,true);
  shadow.querySelector<HTMLDialogElement>('.kl-addon-profile-dialog')!.close();
  cloud!.querySelector<HTMLButtonElement>('.kl-group-member .kl-social-avatar')!.click();
  await vi.waitFor(()=>expect(shadow.querySelector('.kl-addon-profile-card')!.textContent).not.toContain('Cloud bio'));
  expect(shadow.querySelector('.kl-addon-profile-card')!.textContent).not.toContain('Profile not set up yet');
  expect(shadow.querySelector('.kl-addon-profile-card')!.textContent).not.toContain('Cloud bio');
});
