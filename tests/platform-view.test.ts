// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter, BCLobbyRoom } from "../src/bc/adapter";
import { DEFAULT_SETTINGS, MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import { formatClockTime } from "../src/core/time-format";
import type { NotificationSoundStore, DeviceNotificationSound } from "../src/storage/device-notification-sound-store";
import { CloudClient, CloudError } from "../src/cloud/client";
import { DEFAULT_MATCH_FILTERS, DEFAULT_MATCH_SIGNAL, rankMatch, type MatchCandidate } from "../cloud/shared/matching.mjs";
import { rankResource, type MatchResource, type MatchResourceKind } from "../cloud/shared/matching-resources.mjs";
import { SpacesPage, type PersistentSpace } from "../src/modules/platform-shell/spaces-page";
import { EventsPage, type CalendarEvent } from "../src/modules/platform-shell/events-page";
import { localZone } from "../src/modules/platform-shell/event-time";
import { communityShareUrl, spaceShareUrl } from "../src/modules/platform-shell/space-share";
import { CommunitiesPage } from "../src/modules/platform-shell/communities-page";
import type { PeopleDirectoryPerson } from "../src/modules/platform-shell/people-directory";
import { spaceNotesKey } from "../src/modules/platform-shell/space-notes";
import { newWorkshopDraft, type WorkshopDetail, type WorkshopSummary } from "../src/modules/platform-shell/workshop-model";
import { setupPlatformView as setup } from "./platform-view-fixture";

vi.mock("../src/core/distribution", async importOriginal => ({ ...await importOriginal<typeof import("../src/core/distribution")>(), KIKILINK_PLATFORM_PREVIEW: true }));
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

describe("platform shell integration with real workspaces", () => {

  it("keeps Feed between Home and Chat and opens Overview first", async () => {
    const cloud = new CloudClient({ origin: "https://cloud.example.test", memberNumber: 72385, getMemberNumber: () => 72385, isBlocked: () => false, sendProof: vi.fn(), fetchImpl: vi.fn(async () => Response.json({}, { status: 503 })) });
    const f = await setup(undefined, [], undefined, cloud);
    try {
      const areas = [...f.root.querySelectorAll<HTMLButtonElement>(".kl-platform-area")];
      expect(areas.slice(0, 3).map(area => area.dataset.area)).toEqual(["home", "feed", "chat"]);
      expect(areas.every(area => area.querySelector(".kl-roster-count"))).toBe(true);
      f.area("feed").click();
      expect(f.area("feed").getAttribute("aria-current")).toBe("page");
      expect(f.root.querySelector(".kl-panel")?.getAttribute("data-workspace")).toBe("cloud");
      f.area("home").click();
      const sections = [...f.root.querySelectorAll<HTMLButtonElement>(".kl-platform-link[data-route]:not([hidden])")];
      expect(sections.map(button => button.dataset.route)).toEqual(["home", "inbox", "saved", "news"]);
      expect(f.route("home").getAttribute("aria-current")).toBe("page");
      const gameBadge = f.area("game").querySelector<HTMLElement>(".kl-roster-count")!;
      const join = { kind: "room-join" as const, memberNumber: 7, occurredAt: 1, message: "Joined the room", showToast: false };
      f.view.onNotification(join);
      expect(gameBadge.hidden).toBe(false);
      f.area("game").click();
      expect(gameBadge.hidden).toBe(true);
      f.area("home").click();
      f.settings.update(settings => { settings.ui.unreadBadges = false; });
      f.view.onNotification(join);
      expect(gameBadge.hidden).toBe(true);
    } finally { f.view.destroy(); cloud.destroy(); }
  });

  it("reveals the selected People scope after using its filter dialog or clearing filters without moving focus", async () => {
    const cloud = new CloudClient({ origin: "https://cloud.example.test", memberNumber: 72385,
      getMemberNumber: () => 72385, isBlocked: () => false, sendProof: vi.fn(), fetchImpl: vi.fn() });
    const f = await setup(undefined, [], undefined, cloud);
    try {
      f.route("people").click();
      const strip = f.root.querySelector<HTMLElement>(".kl-roster-scopes")!;
      const hidden = strip.querySelector<HTMLButtonElement>('[data-scope="hidden"]')!;
      const all = strip.querySelector<HTMLButtonElement>('[data-scope="all"]')!;
      Object.defineProperties(strip, { clientWidth: { value: 320 }, scrollWidth: { value: 370 } });
      vi.spyOn(strip, "getBoundingClientRect").mockReturnValue(new DOMRect(20, 249, 320, 44));
      vi.spyOn(hidden, "getBoundingClientRect").mockImplementation(() => new DOMRect(338 - strip.scrollLeft, 249, 52, 44));
      vi.spyOn(all, "getBoundingClientRect").mockImplementation(() => new DOMRect(20 - strip.scrollLeft, 249, 44, 44));
      const filter = f.root.querySelector<HTMLButtonElement>(".kl-people-filter-toggle")!;
      filter.click();
      const dialog = f.root.querySelector<HTMLDialogElement>(".kl-people-filter-dialog")!;
      dialog.querySelector<HTMLButtonElement>('[data-people-scope="hidden"]')!.click();
      dialog.querySelector<HTMLButtonElement>("footer .kl-text-button--primary")!.click();
      expect(strip.scrollLeft).toBe(50);
      expect(f.root.activeElement).toBe(filter);
      // A refresh with the same selection must not undo the person's manual swipe.
      strip.scrollLeft = 25;
      const sort = f.root.querySelector<HTMLSelectElement>(".kl-people-sort select")!;
      sort.dispatchEvent(new Event("change"));
      expect(strip.scrollLeft).toBe(25);
      f.root.querySelector<HTMLButtonElement>(".kl-people-clear-filters")!.click();
      expect(all.getAttribute("aria-pressed")).toBe("true");
      expect(strip.scrollLeft).toBe(0);
      expect(f.root.activeElement).toBe(f.root.querySelector('input[aria-label="Search people"]'));
    } finally { f.view.destroy(); cloud.destroy(); }
  });

  it("restores old current-room links inside Rooms and remembers the selected mode", async () => {
    const storage = new MemoryKeyValueStorage();
    storage.setItem("kikilink:platform:last-route:v1", "current-room");
    const f = await setup(storage);
    try {
      expect(f.route("rooms").getAttribute("aria-current")).toBe("page");
      const current = f.root.querySelector<HTMLButtonElement>("#kl-rooms-current")!;
      expect(current.getAttribute("aria-selected")).toBe("true");
      expect(f.root.querySelector(".kl-room-current-panel")?.closest("[hidden]")).toBeNull();
      expect(f.root.querySelector('[data-route="current-room"]')).toBeNull();
      expect(storage.getItem("kikilink:platform:last-route:v1")).toBe("rooms");
      expect(storage.getItem("kikilink:platform:rooms-mode:v1")).toBe("current");
      f.root.querySelector<HTMLButtonElement>("#kl-rooms-lobbies")!.click();
      current.click();
      f.area("home").click();
      f.route("rooms").click();
      expect(current.getAttribute("aria-selected")).toBe("true");
      const custom = { imageUrl: "", musicUrl: "", imageFilter: "", sizeMode: 2, musicSync: false };
      vi.spyOn(f.adapter, "getRoomAdminSnapshot").mockReturnValue({
        roomName: "Garden", isAdmin: true, customization: custom, players: [],
        settings: { name: "Garden", description: "", background: "Boudoir", limit: 10, game: "", space: "X",
          language: "EN", visibility: ["All"], access: ["All"], blockCategory: [], admins: [72385], whitelist: [], blacklist: [], custom },
      });
      current.click();
      const manage = [...f.root.querySelectorAll<HTMLButtonElement>("#kl-rooms-panel-current button")]
        .find(button => button.textContent === "Room settings")!;
      expect(manage.closest("[hidden]")).toBeNull();
      manage.click();
      const dialog = f.root.querySelector<HTMLDialogElement>(".kl-room-settings-dialog")!;
      expect(dialog.open).toBe(true);
      expect([...dialog.querySelectorAll('[role="tab"]')].map(button => button.textContent)).toEqual(["Settings", "Media", "People & roles"]);
    } finally { f.view.destroy(); }
  });

  it("fades only on route changes and honors the two reduced-motion preferences", async () => {
    const f = await setup();
    const workspace = f.root.querySelector<HTMLElement>(".kl-workspace")!;
    const cancel = vi.fn();
    const animate = vi.fn(() => ({ cancel }));
    Object.defineProperty(workspace, "animate", { value: animate });
    try {
      f.area("chat").click();
      expect(animate).toHaveBeenCalledExactlyOnceWith(
        [{ opacity: .6 }, { opacity: 1 }], { duration: 140, easing: "ease-out" },
      );
      f.route("direct").click();
      f.settings.update(draft => { draft.ui.timeFormat = "24-hour"; });
      await f.view.refresh();
      expect(animate).toHaveBeenCalledTimes(1);

      f.area("settings").click();
      expect(cancel).toHaveBeenCalledTimes(1);
      f.root.querySelector<HTMLButtonElement>('[data-section="reactions"]')!.click();
      expect(animate).toHaveBeenCalledTimes(3);

      f.settings.update(draft => { draft.ui.reducedMotion = true; });
      expect(cancel).toHaveBeenCalledTimes(3);
      f.area("chat").click();
      expect(animate).toHaveBeenCalledTimes(3);

      f.settings.update(draft => { draft.ui.reducedMotion = false; });
      vi.spyOn(window, "matchMedia").mockImplementation(query => ({
        matches: query === "(prefers-reduced-motion: reduce)",
      }) as MediaQueryList);
      f.area("explore").click();
      expect(animate).toHaveBeenCalledTimes(3);
    } finally { f.view.destroy(); }
  });

  it("opens Discover first in Explore and restores it after restarting the addon", async () => {
    const storage = new MemoryKeyValueStorage();
    const f = await setup(storage);
    try {
      f.area("explore").click();
      const discover = f.root.querySelector<HTMLElement>(".kl-discover-page")!;
      expect(discover.closest("[hidden]")).toBeNull();
      expect(discover.querySelector("h1")?.textContent).toBe("Discover");
      expect(f.route("discover").getAttribute("aria-current")).toBe("page");
      expect(f.area("explore").getAttribute("aria-current")).toBe("page");
      expect(storage.getItem("kikilink:platform:last-route:v1")).toBe("discover");
      for (const [label, workspace, route] of [
        ["People", "roster", "people"], ["Rooms", "room", "rooms"], ["Workshop", "workshop", "workshop"],
      ] as const) {
        const shortcut = [...discover.querySelectorAll("button")].find(button => button.textContent?.trim() === label)!;
        shortcut.click();
        expect(f.root.querySelector<HTMLElement>(".kl-panel")?.dataset.workspace).toBe(workspace);
        expect(f.route(route).getAttribute("aria-current")).toBe("page");
        expect(discover.closest("[hidden]")).not.toBeNull();
        f.route("discover").click();
      }
    } finally { f.view.destroy(); }
    const restored = await setup(storage, ["room"]);
    try {
      const discover = restored.root.querySelector<HTMLElement>(".kl-discover-page")!;
      expect(discover.closest("[hidden]")).toBeNull();
      expect(restored.route("discover").getAttribute("aria-current")).toBe("page");
      expect(restored.route("rooms").hidden).toBe(true);
      expect([...discover.querySelectorAll("button")].some(button =>
        button.textContent?.trim() === "Rooms" && !button.closest("[hidden]") && !button.disabled)).toBe(false);
    } finally { restored.view.destroy(); }
  });

  async function discoverEventsContext(configure: (event: CalendarEvent) => CalendarEvent[] = event => [event]) {
    const owner = 72385;
    const origin = "https://cloud.example.test";
    const generation = "a".repeat(32);
    const event: CalendarEvent = {
      id: "55555555-5555-4555-8555-555555555558", host: owner, communityId: null, communityName: null,
      title: "Garden party", description: "A quiet evening.", room: "", category: "Social", language: "English",
      visibility: "public", startsAt: Date.now() + 86_400_000, endsAt: Date.now() + 90_000_000,
      capacity: 10, status: "scheduled", revision: 1, canManage: true, archived: false,
      going: 0, maybe: 0, waiting: 0, rsvp: "none", rsvpRevision: 0, waitPosition: null,
      saved: false, reminderMinutes: null, preferencesRevision: 0,
    };
    const events = configure(event);
    let catalogueEvents = events;
    const cloud = new CloudClient({
      origin, memberNumber: owner, getMemberNumber: () => owner, isBlocked: () => false,
      sendProof: vi.fn(), fetchImpl: vi.fn(),
    });
    let connected = true;
    const listeners = new Set<(kind: string) => void>();
    vi.spyOn(cloud, "connected", "get").mockImplementation(() => connected);
    vi.spyOn(cloud, "retainEvents").mockReturnValue(() => {});
    vi.spyOn(cloud, "subscribe").mockImplementation(listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    });
    const me = {
      memberNumber: owner, features: { eventsRsvp: true, eventDiscovery: true, calendarMutationRecoveryGeneration: true },
      directRecovery: { generation, restored: false },
    };
    const createdId = "55555555-5555-4555-8555-555555555559";
    let created: CalendarEvent | undefined;
    let heldMe: (() => Promise<typeof me>) | undefined;
    type PreviewPage = { items: CalendarEvent[]; nextCursor: string | null; recoveryGeneration: string };
    let heldPreview: (() => Promise<PreviewPage>) | undefined;
    const request = vi.spyOn(cloud, "request").mockImplementation(async (method, path, body) => {
      if (method === "POST" && path === "/v1/calendar/events") {
        const change = body as Record<string, unknown>;
        created = {
          ...event, id: createdId, title: String(change.title), description: String(change.description),
          startsAt: Number(change.startsAt), endsAt: Number(change.endsAt), capacity: Number(change.capacity),
        };
        return { applied: true, action: "create", eventId: createdId, operationId: change.operationId, revision: 1, recoveryGeneration: generation };
      }
      if (method !== "GET") throw new CloudError("read_only_fixture", 403);
      if (path === "/v1/me") {
        const read = heldMe;
        heldMe = undefined;
        return read ? read() : me;
      }
      const url = new URL(path, origin);
      if (url.pathname === "/v1/calendar/hosts" || url.pathname === "/v1/calendar/places")
        return { items: [], nextCursor: null, recoveryGeneration: generation };
      if (url.pathname === "/v1/calendar/discover" || url.pathname === "/v1/calendar/events") {
        const upcoming = url.searchParams.get("limit") === "3";
        if (upcoming && heldPreview) {
          const read = heldPreview;
          heldPreview = undefined;
          return read();
        }
        const plans = url.searchParams.get("scope") === "plans";
        return { items: upcoming || plans ? events : catalogueEvents, nextCursor: null, recoveryGeneration: generation };
      }
      if (url.pathname === `/v1/calendar/events/${event.id}`)
        return { ...events[0], title: "Garden party updated", recoveryGeneration: generation };
      if (created && url.pathname === `/v1/calendar/events/${createdId}`)
        return { ...created, recoveryGeneration: generation };
      throw new CloudError("fixture_unavailable", 503);
    });
    const f = await setup(undefined, [], undefined, cloud);
    const discover = () => f.root.querySelector<HTMLElement>(".kl-discover-page")!;
    const button = (label: string) => [...discover().querySelectorAll("button")]
      .find(control => (control.getAttribute("aria-label") ?? control.textContent?.trim()) === label);
    const eventRow = () => [...discover().querySelectorAll<HTMLButtonElement>(".kl-discover-event")]
      .find(control => control.querySelector("strong[title]")?.textContent === event.title);
    const notify = (kind: string) => { for (const listener of listeners) listener(kind); };
    return {
      ...f, cloud, request, discover, button, eventRow, createdId, generation, events,
      upcoming: () => discover().querySelector<HTMLElement>(".kl-discover-upcoming")!,
      eventsPage: () => f.root.querySelector<HTMLElement>(".kl-events-page")!,
      catalogueReads: () => request.mock.calls.map(([, path]) => new URL(path, origin))
        .filter(url => ["/v1/calendar/discover", "/v1/calendar/events"].includes(url.pathname) &&
          url.searchParams.get("limit") === "20" && !url.searchParams.has("status")),
      replaceCatalogue(rows: CalendarEvent[]) { catalogueEvents = rows; },
      plans: () => f.root.querySelector<HTMLDialogElement>("dialog.kl-ev-plans-drawer[open]"),
      editor: () => f.root.querySelector<HTMLDialogElement>("dialog.kl-ev-editor-dialog[open]"),
      holdNextMetadata() {
        let requested = false;
        let resolve!: (value: typeof me) => void;
        const held = new Promise<typeof me>(done => { resolve = done; });
        heldMe = () => { requested = true; return held; };
        return { requested: () => requested, resolve: () => resolve(me) };
      },
      holdNextPreview() {
        let requested = false;
        let resolve!: (value: PreviewPage) => void;
        let reject!: (reason: unknown) => void;
        const held = new Promise<PreviewPage>((done, fail) => {
          resolve = done;
          reject = fail;
        });
        heldPreview = () => { requested = true; return held; };
        return {
          requested: () => requested,
          resolve: (items = events, nextCursor: string | null = null) => resolve({ items, nextCursor, recoveryGeneration: generation }),
          reject: () => reject(new CloudError("fixture_unavailable", 503)),
        };
      },
      setEventsAvailable(available: boolean) { me.features.eventsRsvp = available; notify("calendar"); },
      disconnect() {
        connected = false;
        notify("session");
      },
      reconnect() { connected = true; notify("connection"); },
    };
  }

  it("shows Coming up loading and retries the protected preview with stable keyboard focus", async () => {
    const f = await discoverEventsContext();
    try {
      const failed = f.holdNextPreview();
      f.area("explore").click();
      await vi.waitFor(() => expect(failed.requested()).toBe(true));
      expect(f.upcoming().getAttribute("aria-busy")).toBe("true");
      expect(f.upcoming().querySelector('[role="status"][aria-label="Loading events"]')).not.toBeNull();
      expect(f.upcoming().textContent).not.toContain("No upcoming events yet");
      expect(f.button("All events")?.disabled).toBe(false);

      failed.reject();
      await vi.waitFor(() => expect(f.upcoming().querySelector('[role="alert"]')?.textContent).toContain("Events couldn’t load"));
      expect(f.upcoming().getAttribute("aria-busy")).not.toBe("true");
      const retry = f.button("Retry")!;
      const recovered = f.holdNextPreview();
      const priorRequests = f.request.mock.calls.length;
      retry.focus();
      retry.click();
      expect(f.root.activeElement).toBe(f.button("All events"));
      await vi.waitFor(() => expect(recovered.requested()).toBe(true));
      expect(f.upcoming().getAttribute("aria-busy")).toBe("true");
      expect(f.button("Retry")).toBeUndefined();
      retry.click();
      const retryReads = f.request.mock.calls.slice(priorRequests).map(([, path]) => path);
      expect(retryReads).toHaveLength(2);
      expect(retryReads[0]).toBe("/v1/me");
      expect(retryReads[1]).toMatch(/^\/v1\/calendar\/discover\?/);
      expect(new URLSearchParams(retryReads[1]!.split("?")[1]).get("recoveryGeneration")).toBe(f.generation);

      recovered.resolve();
      await vi.waitFor(() => expect(f.eventRow()).toBeDefined());
      expect(f.upcoming().getAttribute("aria-busy")).not.toBe("true");
      expect(f.upcoming().querySelector('[role="alert"]')).toBeNull();
      expect(f.route("discover").getAttribute("aria-current")).toBe("page");
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("keeps Coming up feedback current across navigation and disconnect", async () => {
    const f = await discoverEventsContext();
    try {
      const oldView = f.holdNextPreview();
      f.area("explore").click();
      await vi.waitFor(() => expect(oldView.requested()).toBe(true));
      f.route("people").click();
      const newView = f.holdNextPreview();
      f.route("discover").click();
      await vi.waitFor(() => expect(newView.requested()).toBe(true));
      oldView.reject();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(f.upcoming().getAttribute("aria-busy")).toBe("true");
      expect(f.upcoming().querySelector('[role="alert"]')).toBeNull();

      f.disconnect();
      await vi.waitFor(() => expect(f.upcoming().textContent).toContain("Connect to Cloud"));
      expect(f.button("Retry")).toBeUndefined();
      newView.resolve();
      const afterReconnect = f.holdNextPreview();
      f.reconnect();
      await vi.waitFor(() => expect(afterReconnect.requested()).toBe(true));
      expect(f.eventRow()).toBeUndefined();
      expect(f.upcoming().getAttribute("aria-busy")).toBe("true");
      afterReconnect.resolve();
      await vi.waitFor(() => expect(f.eventRow()).toBeDefined());
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("distinguishes unavailable and continued Coming up previews from a confirmed empty result", async () => {
    const f = await discoverEventsContext();
    try {
      f.setEventsAvailable(false);
      f.area("explore").click();
      await vi.waitFor(() => expect(f.upcoming().textContent).toContain("Upcoming events are unavailable"));
      expect(f.button("Retry")).toBeUndefined();
      expect(f.request.mock.calls.some(([, path]) => path.startsWith("/v1/calendar/discover?"))).toBe(false);

      const continued = f.holdNextPreview();
      f.setEventsAvailable(true);
      await vi.waitFor(() => expect(continued.requested()).toBe(true));
      continued.resolve([{ ...f.events[0]!, archived: true }], "public-cursor");
      await vi.waitFor(() => expect(f.upcoming().textContent).toContain("More upcoming events"));
      expect(f.button("Retry")).toBeUndefined();
      expect(f.upcoming().textContent).not.toContain("No upcoming events yet");

      const empty = f.holdNextPreview();
      f.setEventsAvailable(true);
      await vi.waitFor(() => expect(empty.requested()).toBe(true));
      empty.resolve([]);
      await vi.waitFor(() => expect(f.upcoming().textContent).toContain("No upcoming events yet"));
      expect(f.upcoming().getAttribute("aria-busy")).not.toBe("true");
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("opens verified upcoming events from Discover and reuses the existing event navigation", async () => {
    const f = await discoverEventsContext();
    try {
      f.area("explore").click();
      await vi.waitFor(() => expect(f.eventRow()).toBeDefined());
      expect(f.discover().querySelector("h2")?.textContent).toBe("Coming up");
      expect(f.request.mock.calls.some(([, path]) => path.startsWith("/v1/matching/"))).toBe(false);
      f.eventRow()!.click();
      await vi.waitFor(() => expect(f.root.querySelector(".kl-events-page h1")?.textContent).toBe("Garden party updated"));
      expect(f.route("events").getAttribute("aria-current")).toBe("page");

      f.route("discover").click();
      f.button("Communities")!.click();
      expect(f.route("communities").getAttribute("aria-current")).toBe("page");
      f.route("discover").click();
      f.button("All events")!.click();
      await vi.waitFor(() => expect(f.root.querySelector(".kl-events-page h1")?.textContent).toBe("Events"));
      expect(f.route("events").getAttribute("aria-current")).toBe("page");
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  const catalogueEventId = "55555555-5555-4555-8555-555555555567";
  const catalogueCard = (page: HTMLElement) => page.querySelector<HTMLButtonElement>(
    `[data-event-id="${catalogueEventId}"] :is(.kl-ev-title, .kl-ev-row-open)`,
  );
  const catalogueFixtures = (event: CalendarEvent): CalendarEvent[] => [
    { ...event, saved: true }, { ...event, id: catalogueEventId, title: "Garden workshop", saved: true },
  ];

  async function filterEventsCatalogue(f: Awaited<ReturnType<typeof discoverEventsContext>>) {
    f.area("explore").click();
    f.route("events").click();
    const page = f.eventsPage();
    await vi.waitFor(() => expect(catalogueCard(page)).not.toBeNull());
    const search = page.querySelector<HTMLInputElement>('[aria-label="Search events"]')!;
    search.value = "garden";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.waitFor(() => expect(f.catalogueReads().at(-1)?.searchParams.get("q")).toBe("garden"));

    page.querySelector<HTMLButtonElement>(".kl-browse-filter")!.click();
    const filters = page.querySelector<HTMLDialogElement>(".kl-browse-dialog--sheet[open]")!;
    filters.querySelector<HTMLInputElement>('[aria-label="Language"]')!.value = "English";
    [...filters.querySelectorAll("button")].find(button => button.textContent === "Saved")!.click();
    filters.querySelector<HTMLButtonElement>('[type="submit"]')!.click();
    await vi.waitFor(() => expect(f.catalogueReads().at(-1)?.searchParams.get("scope")).toBe("saved"));
    await vi.waitFor(() => expect(page.getAttribute("aria-busy")).toBe("false"));
    await vi.waitFor(() => expect(catalogueCard(page)).not.toBeNull());
    return { page, search };
  }

  it.each(["All events", "Events sidebar"] as const)("restores the filtered Events catalogue, its scroll and its focused card via %s", async entry => {
    const f = await discoverEventsContext(catalogueFixtures);
    try {
      const { page, search } = await filterEventsCatalogue(f);
      const sort = page.querySelector<HTMLSelectElement>('[aria-label="Sort events"]')!;
      sort.value = "popular";
      sort.dispatchEvent(new Event("change", { bubbles: true }));
      await vi.waitFor(() => expect(f.catalogueReads().at(-1)?.searchParams.get("sort")).toBe("popular"));
      await vi.waitFor(() => expect(catalogueCard(page)).not.toBeNull());

      const oldCard = catalogueCard(page)!;
      oldCard.focus();
      page.scrollTop = 180;
      expect(f.root.activeElement).toBe(oldCard);
      // A real pointer click focuses shell navigation before it leaves the catalogue.
      f.route("discover").focus();
      f.route("discover").click();
      expect(page.hidden).toBe(true);

      const previousReads = f.catalogueReads().length;
      f.replaceCatalogue([{ ...f.events[1]!, title: "Garden workshop updated" }]);
      const browse = entry === "All events" ? f.button(entry)! : f.route("events");
      browse.focus();
      browse.click();
      await vi.waitFor(() => expect(catalogueCard(page)?.textContent).toBe("Garden workshop updated"));
      expect(f.route("events").getAttribute("aria-current")).toBe("page");
      expect(f.catalogueReads()).toHaveLength(previousReads + 1);
      expect(Object.fromEntries(f.catalogueReads().at(-1)!.searchParams)).toMatchObject({
        q: "garden", scope: "saved", language: "English", sort: "popular", recoveryGeneration: f.generation,
      });
      expect(search.value).toBe("garden");
      expect(page.querySelector<HTMLSelectElement>('[aria-label="Sort events"]')?.value).toBe("popular");
      expect(page.scrollTop).toBe(180);
      expect(f.root.activeElement).toBe(catalogueCard(page));
      expect(catalogueCard(page)).not.toBe(oldCard);
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it.each([true, false])("returns from Discover event detail to a fresh catalogue (prior card accessible: %s)", async priorCardAccessible => {
    const f = await discoverEventsContext(catalogueFixtures);
    try {
      const { page, search } = await filterEventsCatalogue(f);
      const agenda = [...page.querySelectorAll<HTMLButtonElement>(".kl-ev-layout button")].find(button => button.textContent === "Agenda")!;
      agenda.click();
      await vi.waitFor(() => expect(catalogueCard(page)?.classList.contains("kl-ev-row-open")).toBe(true));
      catalogueCard(page)!.focus();
      page.scrollTop = 160;
      f.route("discover").focus();
      f.route("discover").click();
      await vi.waitFor(() => expect(f.eventRow()).toBeDefined());

      const previousReads = f.catalogueReads().length;
      f.eventRow()!.focus();
      f.eventRow()!.click();
      await vi.waitFor(() => expect(page.querySelector("h1")?.textContent).toBe("Garden party updated"));
      expect(f.catalogueReads()).toHaveLength(previousReads);
      expect(f.request.mock.calls.some(([method, path]) => method === "GET" &&
        path === `/v1/calendar/events/${f.events[0]!.id}?recoveryGeneration=${f.generation}`)).toBe(true);

      f.replaceCatalogue(priorCardAccessible
        ? [{ ...f.events[1]!, title: "Garden workshop updated" }]
        : [{ ...f.events[0]!, title: "Another garden event", saved: true }]);
      page.querySelector<HTMLButtonElement>(".kl-ev-back-link")!.click();
      const title = priorCardAccessible ? "Garden workshop updated" : "Another garden event";
      await vi.waitFor(() => expect(page.querySelector(".kl-ev-row-open .kl-ev-title")?.textContent).toBe(title));
      expect(f.route("events").getAttribute("aria-current")).toBe("page");
      expect(page.dataset.layout).toBe("agenda");
      expect(f.catalogueReads()).toHaveLength(previousReads + 1);
      expect(Object.fromEntries(f.catalogueReads().at(-1)!.searchParams)).toMatchObject({
        q: "garden", scope: "saved", language: "English", sort: "soonest", recoveryGeneration: f.generation,
      });
      expect(search.value).toBe("garden");
      expect(page.scrollTop).toBe(160);
      expect(f.root.activeElement).toBe(priorCardAccessible ? catalogueCard(page) : search);
      if (!priorCardAccessible) expect(catalogueCard(page)).toBeNull();
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("renders the Coming up range, accessible date and verified event labels with the current time format", async () => {
    const start = new Date(Date.now() + 3 * 86_400_000);
    start.setHours(23, 15, 0, 0);
    const startsAt = start.getTime(), endsAt = startsAt + 75 * 60_000;
    const f = await discoverEventsContext(event => {
      const hostProfile = { memberNumber: event.host, displayName: "Visible host", username: null, avatarId: null, profileVisible: true };
      return [
        { ...event, startsAt, endsAt, hostProfile, communityId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          communityName: "Garden circle", rsvp: "going", going: event.capacity },
        { ...event, id: "55555555-5555-4555-8555-555555555560", title: "Full event", startsAt: startsAt + 60_000,
          endsAt, hostProfile, going: event.capacity },
        { ...event, id: "55555555-5555-4555-8555-555555555561", title: "Tentative event", startsAt: startsAt + 120_000,
          endsAt, hostProfile: { ...hostProfile, displayName: "Hidden host", profileVisible: false }, rsvp: "maybe" },
      ];
    });
    try {
      f.settings.update(s => { s.ui.timeFormat = "12-hour"; });
      f.area("explore").click();
      const rows = () => [...f.discover().querySelectorAll<HTMLButtonElement>(".kl-discover-event")];
      await vi.waitFor(() => expect(rows()).toHaveLength(3));
      const row = f.eventRow()!;
      const times = () => [...row.querySelectorAll<HTMLTimeElement>("time")];
      expect(times().map(time => time.dateTime)).toEqual([new Date(startsAt).toISOString(), new Date(endsAt).toISOString()]);
      expect(times().map(time => time.textContent)).toEqual([formatClockTime(startsAt, "12-hour"), formatClockTime(endsAt, "12-hour")]);
      expect(row.textContent).toContain(localZone(startsAt));
      expect(row.textContent).toContain("(+1 day)");
      expect(row.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe(
        new Intl.DateTimeFormat(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(start),
      );
      expect(row.textContent).toContain("Garden circle");
      expect(row.textContent).not.toContain("Visible host");
      expect(rows()[1]?.textContent).toContain("Visible host");
      expect(rows()[2]?.textContent).not.toContain("Hidden host");
      expect(rows().map(item => item.querySelector(".kl-ev-badge")?.textContent)).toEqual(["Going", "Full · waitlist open", "Maybe"]);

      const reads = () => f.request.mock.calls.filter(([, path]) => path.startsWith("/v1/calendar/discover?") && path.includes("limit=3"));
      const initialReads = reads().length;
      f.settings.update(s => { s.ui.timeFormat = "24-hour"; });
      await vi.waitFor(() => expect(times().map(time => time.textContent)).toEqual(
        [formatClockTime(startsAt, "24-hour"), formatClockTime(endsAt, "24-hour")],
      ));
      expect(reads()).toHaveLength(initialReads);
      expect(f.route("discover").getAttribute("aria-current")).toBe("page");

      row.click();
      await vi.waitFor(() => expect(f.eventsPage().querySelector("h1")?.textContent).toBe("Garden party updated"));
      const eventId = "55555555-5555-4555-8555-555555555558";
      expect(f.request.mock.calls.some(([method, path]) => method === "GET" &&
        path === `/v1/calendar/events/${eventId}?recoveryGeneration=${f.generation}`)).toBe(true);
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("updates live and expired Coming up rows without another calendar read", async () => {
    const now = new Date();
    now.setSeconds(0, 0);
    vi.useFakeTimers();
    vi.setSystemTime(now);
    let f: Awaited<ReturnType<typeof discoverEventsContext>> | undefined;
    try {
      f = await discoverEventsContext(event => [{ ...event, startsAt: Date.now() + 30_000, endsAt: Date.now() + 90_000 }]);
      f.area("explore").click();
      await vi.advanceTimersByTimeAsync(0);
      const row = f.eventRow()!;
      expect(row?.isConnected).toBe(true);
      row.focus();
      expect(f.root.activeElement).toBe(row);
      expect(row.textContent).not.toContain("Happening now");
      const reads = () => f!.request.mock.calls.filter(([method, path]) => method === "GET" && path.startsWith("/v1/calendar/"));
      const initialReads = reads().length;

      await vi.advanceTimersByTimeAsync(61_000);
      expect(row.textContent).toContain("Happening now");
      expect(f.root.activeElement).toBe(row);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(f.eventRow()).toBeUndefined();
      expect(f.discover().textContent).toContain("No upcoming events yet.");
      expect(f.root.activeElement).toBe(f.button("All events"));
      row.click();
      expect(f.route("discover").getAttribute("aria-current")).toBe("page");
      expect(reads()).toHaveLength(initialReads);
    } finally {
      f?.view.destroy();
      f?.cloud.destroy();
      vi.useRealTimers();
    }
  });

  it("keeps Discover visible under Your plans and Create event and restores the opening button", async () => {
    const f = await discoverEventsContext();
    try {
      f.area("explore").click();
      await vi.waitFor(() => expect(f.eventRow()).toBeDefined());
      const expectDiscover = () => {
        expect(f.route("discover").getAttribute("aria-current")).toBe("page");
        expect(f.storage.getItem("kikilink:platform:last-route:v1")).toBe("discover");
        expect(f.discover().closest("[hidden]")).toBeNull();
        expect(f.eventsPage().closest("[hidden]")).not.toBeNull();
      };
      const plans = f.button("Your plans")!, create = f.button("Create event")!;

      plans.focus();
      plans.click();
      await vi.waitFor(() => expect(f.plans()?.querySelector(".kl-ev-plans-results")?.textContent).toContain("Garden party"));
      expect(f.plans()?.closest("[hidden]")).toBeNull();
      expectDiscover();
      const closePlans = f.plans()!.querySelector<HTMLButtonElement>('[aria-label="Close dialog"]')!;
      closePlans.focus();
      expect(f.root.activeElement).toBe(closePlans);
      closePlans.click();
      expect(f.plans()).toBeNull();
      await vi.waitFor(() => expect(f.root.activeElement).toBe(plans));

      create.focus();
      create.click();
      await vi.waitFor(() => expect(f.editor()).not.toBeNull());
      expect(f.editor()?.closest("[hidden]")).toBeNull();
      expectDiscover();
      f.editor()!.dispatchEvent(new Event("cancel", { cancelable: true }));
      expect(f.editor()).toBeNull();
      await vi.waitFor(() => expect(f.root.activeElement).toBe(create));
      create.click();
      await vi.waitFor(() => expect(f.editor()).not.toBeNull());
      f.editor()!.querySelector<HTMLButtonElement>('[aria-label="Close dialog"]')!.click();
      expect(f.editor()).toBeNull();
      await vi.waitFor(() => expect(f.root.activeElement).toBe(create));

      const catalogReads = f.request.mock.calls.map(([, path]) => new URL(path, f.cloud.origin))
        .filter(({ pathname }) => ["/v1/calendar/events", "/v1/calendar/discover"].includes(pathname));
      expect(catalogReads.every(({ searchParams }) =>
        searchParams.get("limit") === "3" || searchParams.get("scope") === "plans")).toBe(true);
      expect(f.request.mock.calls.filter(([, path]) => path.startsWith("/v1/calendar")).every(([method]) => method === "GET")).toBe(true);

      plans.click();
      await vi.waitFor(() => expect(f.plans()).not.toBeNull());
      const viewPlans = [...f.plans()!.querySelectorAll("button")].find(control => control.textContent === "View my plans")!;
      viewPlans.click();
      await vi.waitFor(() => expect([...f.root.querySelectorAll(".kl-ev-scopes button")]
        .find(control => control.textContent === "My plans")?.getAttribute("aria-pressed")).toBe("true"));
      expect(f.route("events").getAttribute("aria-current")).toBe("page");
      expect(f.eventsPage().dataset.layout).toBe("agenda");
      expect(f.plans()).toBeNull();
      f.route("discover").click();
      f.button("Open my plans")!.click();
      await vi.waitFor(() => expect(f.route("events").getAttribute("aria-current")).toBe("page"));
      expect(f.eventsPage().dataset.layout).toBe("agenda");
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("ignores a delayed Discover event editor after navigation and closes Your plans at session loss", async () => {
    const f = await discoverEventsContext();
    try {
      f.area("explore").click();
      await vi.waitFor(() => expect(f.eventRow()).toBeDefined());
      const metadata = f.holdNextMetadata();
      f.button("Create event")!.click();
      await vi.waitFor(() => expect(metadata.requested()).toBe(true));
      f.area("home").click();
      metadata.resolve();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(f.root.querySelector('dialog[aria-label="Create an event"][open]')).toBeNull();
      expect(f.route("discover").getAttribute("aria-current")).not.toBe("page");

      f.route("discover").click();
      f.button("Your plans")!.click();
      await vi.waitFor(() => expect(f.plans()).not.toBeNull());
      f.disconnect();
      await vi.waitFor(() => expect(f.plans()).toBeNull());
      expect(f.route("discover").getAttribute("aria-current")).toBe("page");
      expect(f.discover().closest("[hidden]")).toBeNull();
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("opens the new Events detail only after a Discover event is confirmed", async () => {
    const f = await discoverEventsContext();
    try {
      f.area("explore").click();
      await vi.waitFor(() => expect(f.eventRow()).toBeDefined());
      f.button("Create event")!.click();
      await vi.waitFor(() => expect(f.editor()).not.toBeNull());
      const control = (label: string) => [...f.editor()!.querySelectorAll("button")].find(button => button.textContent === label)!;
      for (const [field, text] of [["Event title", "New garden gathering"], ["What’s happening?", "A friendly afternoon."]] as const) {
        const input = f.editor()!.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[aria-label="${field}"]`)!;
        input.value = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      control("Continue").click();
      control("Continue").click();
      expect(f.route("discover").getAttribute("aria-current")).toBe("page");
      expect(f.request.mock.calls.some(([method]) => method === "POST")).toBe(false);
      control("Create event").click();
      await vi.waitFor(() => expect(f.eventsPage().querySelector("h1")?.textContent).toBe("New garden gathering"));
      expect(f.route("events").getAttribute("aria-current")).toBe("page");
      expect(f.editor()).toBeNull();
      const writes = f.request.mock.calls.filter(([method]) => method === "POST");
      expect(writes).toHaveLength(1);
      expect(writes[0]?.[2]).toMatchObject({ title: "New garden gathering", recoveryGeneration: f.generation });
      expect(f.request.mock.calls.some(([method, path]) => method === "GET" &&
        path === `/v1/calendar/events/${f.createdId}?recoveryGeneration=${f.generation}`)).toBe(true);
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  async function discoverCommunitiesContext() {
    const owner = 72385;
    const generation = "a".repeat(32);
    const origin = "https://cloud.example.test";
    const listenerSet = new Set<(kind: string) => void>();
    const garden = {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "Garden <b>Club</b>", description: "Quiet evenings",
      language: "English", icon: "leaf", color: "sage", access: "public", discoverable: true,
      invitationPermission: "admins", rules: [], revision: 1, archived: false, restricted: false,
      membership: "active", role: "member", memberCount: 12, onlineCount: 2, canManage: false, canReview: false, canInvite: false,
    };
    const artists = { ...garden, id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "Art group", icon: "brush", color: "amber",
      membership: "none", role: null, memberCount: 1, onlineCount: null };
    const bookClub = { ...garden, id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "Book club", onlineCount: 0 };
    const preview = (items: unknown[]) => ({ items, nextCursor: null, recoveryGeneration: generation });
    let readPreview: () => unknown = () => preview([garden, artists, bookClub]);
    let denyDetail = false;
    const cloud = new CloudClient({
      origin, memberNumber: owner, getMemberNumber: () => owner, isBlocked: () => false,
      sendProof: vi.fn(), fetchImpl: vi.fn(),
    });
    vi.spyOn(cloud, "connected", "get").mockReturnValue(true);
    vi.spyOn(cloud, "retainEvents").mockReturnValue(() => {});
    vi.spyOn(cloud, "subscribe").mockImplementation(listener => {
      listenerSet.add(listener);
      return () => listenerSet.delete(listener);
    });
    const request = vi.spyOn(cloud, "request").mockImplementation(async (method, path) => {
      if (method !== "GET") throw new CloudError("read_only_fixture", 403);
      if (path === "/v1/me") return {
        memberNumber: owner,
        features: { communities: true, communityDirectory: true, communityManagementRecoveryGeneration: true },
        directRecovery: { generation, restored: false },
      };
      const url = new URL(path, origin);
      if (url.pathname === "/v1/community-directory") return url.searchParams.get("limit") === "3"
        ? readPreview() : preview([]);
      if (url.pathname === `/v1/communities/${garden.id}`) {
        if (denyDetail) throw new CloudError("not_found", 404);
        return { ...garden, name: "Garden Club updated", recoveryGeneration: generation };
      }
      if (url.pathname === `/v1/communities/${garden.id}/channels`) return { items: [] };
      if (url.pathname === "/v1/communities") return preview([]);
      throw new CloudError("fixture_unavailable", 503);
    });
    const f = await setup(undefined, [], undefined, cloud);
    const section = () => f.root.querySelector<HTMLElement>(".kl-discover-communities")!;
    const rows = () => [...section().querySelectorAll<HTMLButtonElement>(".kl-discover-community")];
    const previewReads = () => request.mock.calls.map(([, path]) => new URL(path, origin))
      .filter(url => url.pathname === "/v1/community-directory" && url.searchParams.get("limit") === "3");
    const detailReads = () => request.mock.calls.map(([, path]) => new URL(path, origin))
      .filter(url => url.pathname === `/v1/communities/${garden.id}`);
    return {
      ...f, cloud, request, garden, artists, bookClub, section, rows, previewReads, detailReads, generation,
      holdPreview: () => {
        let release!: (value: ReturnType<typeof preview>) => void;
        const held = new Promise<ReturnType<typeof preview>>(resolve => { release = resolve; });
        readPreview = () => held;
        return (items: unknown[]) => { readPreview = () => preview(items); release(preview(items)); };
      },
      denyDetail: () => { denyDetail = true; },
      emit: (kind: string) => { for (const listener of listenerSet) listener(kind); },
    };
  }

  it("reads Find your corner only in Discover and reopens the selected community with fresh access", async () => {
    const f = await discoverCommunitiesContext();
    try {
      expect(f.previewReads()).toHaveLength(0);
      f.area("explore").click();
      await vi.waitFor(() => expect(f.rows()).toHaveLength(3));
      expect(f.section().closest("[hidden]")).toBeNull();
      const card = f.section().closest("section")!;
      expect(card.querySelector("h2")?.textContent).toBe("Find your corner");
      expect(f.rows().map(row => row.querySelector("strong")?.textContent)).toEqual([f.garden.name, f.artists.name, f.bookClub.name]);
      const [garden, artists, bookClub] = f.rows();
      expect(garden?.querySelector("b")).toBeNull();
      expect(garden?.querySelector(".kl-cm-color-sage svg")).not.toBeNull();
      expect(garden?.textContent).toContain("12 members · 2 online");
      expect(garden?.querySelector(".kl-discover-joined")?.textContent).toBe("Joined");
      expect(artists?.textContent).toContain("1 member");
      expect(artists?.textContent).not.toMatch(/online|Joined/u);
      expect(bookClub?.textContent).toContain("0 online");
      expect(f.previewReads()).toHaveLength(1);
      expect(f.previewReads()[0]?.searchParams.get("scope")).toBe("discover");
      expect(f.previewReads()[0]?.searchParams.get("sort")).toBe("recommended");
      expect(f.previewReads()[0]?.searchParams.get("recoveryGeneration")).toBe(f.generation);
      expect(f.detailReads()).toHaveLength(0);
      garden!.click();
      await vi.waitFor(() => expect(f.root.querySelector(".kl-cm-identity-title h1")?.textContent).toBe("Garden Club updated"));
      expect(f.route("communities").getAttribute("aria-current")).toBe("page");
      expect(f.detailReads()).toHaveLength(1);
      expect(f.detailReads()[0]?.searchParams.get("recoveryGeneration")).toBe(f.generation);
      f.route("discover").click();
      card.querySelector<HTMLButtonElement>('button[aria-label="Communities"]')!.click();
      await vi.waitFor(() => expect(f.root.querySelector(".kl-cm-heading h1")?.textContent).toBe("Communities"));
      expect(f.detailReads()).toHaveLength(1);
      expect(f.request.mock.calls.filter(([, path]) => /\/v1\/communit/u.test(path))
        .every(([method]) => method === "GET")).toBe(true);
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("clears invalidated Discover community rows and lets the detail route reject a newly unavailable community", async () => {
    const f = await discoverCommunitiesContext();
    try {
      f.area("explore").click();
      await vi.waitFor(() => expect(f.rows()).toHaveLength(3));
      const staleRow = f.rows()[0]!;
      const resolve = f.holdPreview();
      f.emit("communities");
      expect(f.rows()).toHaveLength(0);
      staleRow.click();
      expect(f.route("discover").getAttribute("aria-current")).toBe("page");
      expect(f.detailReads()).toHaveLength(0);
      await vi.waitFor(() => expect(f.previewReads()).toHaveLength(2));
      resolve([f.garden, { ...f.bookClub, membership: "banned" }]);
      await vi.waitFor(() => expect(f.rows()).toHaveLength(1));
      expect(f.section().textContent).not.toContain(f.bookClub.name);
      f.denyDetail();
      f.rows()[0]!.click();
      await vi.waitFor(() => expect(f.root.querySelector(".kl-communities-page")?.textContent)
        .toContain("This community is no longer available."));
      expect(f.detailReads()).toHaveLength(1);
      expect(f.root.querySelector(".kl-cm-identity-title h1")).toBeNull();
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  async function discoverPeopleContext() {
    const owner = 72385;
    const origin = "https://cloud.example.test";
    const generation = "a".repeat(32);
    const listeners = new Set<(kind: string) => void>();
    const [first, second, third]: [PeopleDirectoryPerson, PeopleDirectoryPerson, PeopleDirectoryPerson] = [
      { memberNumber: 93003, displayName: "Avery", username: "avery_rose" },
      { memberNumber: 93002, displayName: "Robin", username: "robin_leaf" },
      { memberNumber: 93001, displayName: "Morgan", username: null },
    ];
    const guests = [first, second, third];
    const avatarId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const profiles = new Map(guests.map(person => [person.memberNumber, {
      ...person, visible: true, isDefault: false, revision: 1, updatedAt: 1, bio: "Full profile bio", profileStyle: "classic",
      avatarFrame: "none", avatarId: person === first ? avatarId : null, bannerId: null,
      statusMessage: person === first ? "Making <em>tea</em>" : person === second ? "Restricted status" : "",
      aboutHidden: person === second, recoveryGeneration: generation,
    }]));
    const cloud = new CloudClient({
      origin, memberNumber: owner, getMemberNumber: () => owner, isBlocked: () => false,
      sendProof: vi.fn(), fetchImpl: vi.fn(),
    });
    vi.spyOn(cloud, "connected", "get").mockReturnValue(true);
    vi.spyOn(cloud, "retainEvents").mockReturnValue(() => {});
    vi.spyOn(cloud, "subscribe").mockImplementation(listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    });
    let readDirectory: () => unknown = () => ({ items: guests, nextCursor: null });
    const request = vi.spyOn(cloud, "request").mockImplementation(async (method, path) => {
      if (method !== "GET") throw new CloudError("read_only_fixture", 403);
      if (path === "/v1/me") return {
        memberNumber: owner, features: { profileDiscovery: true, profileRecoveryGeneration: true },
        directRecovery: { generation, restored: false },
      };
      const url = new URL(path, origin);
      if (url.pathname === "/v1/people") return readDirectory();
      const match = /^\/v1\/profiles\/(\d+)$/u.exec(url.pathname);
      if (match) {
        const profile = profiles.get(Number(match[1]));
        if (!profile) throw new CloudError("not_found", 404);
        return profile;
      }
      throw new CloudError("fixture_unavailable", 503);
    });
    const media = vi.spyOn(cloud, "media").mockResolvedValue(new Blob(["preview"], { type: "image/webp" }));
    const f = await setup(undefined, [], undefined, cloud);
    const section = () => f.root.querySelector<HTMLElement>(".kl-discover-people")!;
    const rows = () => [...section().querySelectorAll<HTMLButtonElement>(".kl-discover-person")];
    const readUrls = () => request.mock.calls.map(([, path]) => new URL(path, origin));
    return {
      ...f, cloud, media, avatarId, first, second, third, profiles, generation, section, rows,
      directoryReads: () => readUrls().filter(url => url.pathname === "/v1/people"),
      profileReads: (member: number) => readUrls().filter(url => url.pathname === `/v1/profiles/${member}`),
      holdDirectory: () => {
        let release!: (value: unknown) => void;
        const held = new Promise(resolve => { release = resolve; });
        readDirectory = () => held;
        return (items: typeof guests) => release({ items, nextCursor: null });
      },
      emit: (kind: string) => { for (const listener of listeners) listener(kind); },
    };
  }

  it("loads opt-in Familiar faces only in Discover and reads the selected profile again", async () => {
    const f = await discoverPeopleContext();
    try {
      expect(f.directoryReads()).toHaveLength(0);
      f.area("explore").click();
      await vi.waitFor(() => expect(f.rows()).toHaveLength(3));
      const section = f.section().closest("section")!;
      expect(section.querySelector("h2")?.textContent).toBe("Familiar faces");
      expect(f.rows().map(row => row.dataset.memberNumber)).toEqual([f.first, f.second, f.third].map(person => String(person.memberNumber)));
      expect(f.rows().map(row => row.querySelector("strong")?.textContent)).toEqual(["Avery", "Robin", "Morgan"]);
      expect(f.rows().map(row => row.querySelector("small")?.textContent)).toEqual(["Making <em>tea</em>", "@robin_leaf", undefined]);
      expect(f.section().querySelector("em")).toBeNull();
      expect(f.section().textContent).not.toMatch(/Full profile bio|Restricted status/u);
      const avatar = f.rows()[0]!.querySelector(".kl-discover-person-avatar .kl-social-avatar-media")!;
      expect(avatar).not.toBeNull();
      avatar.dispatchEvent(new Event("cloud-visible"));
      await vi.waitFor(() => expect(f.media.mock.calls.map(([id]) => id)).toContain(f.avatarId));
      expect(f.directoryReads()).toHaveLength(1);
      expect(f.directoryReads()[0]?.searchParams.get("limit")).toBe("3");
      expect(f.profileReads(f.first.memberNumber)[0]?.searchParams.get("recoveryGeneration")).toBe(f.generation);

      const profile = f.profiles.get(f.first.memberNumber)!;
      f.profiles.set(f.first.memberNumber, { ...profile, displayName: "Avery refreshed", revision: 2 });
      const previousReads = f.profileReads(f.first.memberNumber).length;
      f.rows()[0]!.click();
      const dialog = f.root.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")!;
      await vi.waitFor(() => expect(dialog.querySelector(".kl-addon-profile-identity h2")?.textContent).toBe("Avery refreshed"));
      expect(dialog.open).toBe(true);
      expect(f.profileReads(f.first.memberNumber).length).toBeGreaterThan(previousReads);
      dialog.close();
      section.querySelector<HTMLButtonElement>('button[aria-label="People"]')!.click();
      expect(f.route("people").getAttribute("aria-current")).toBe("page");
      expect(f.rows()).toHaveLength(0);
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("clears Familiar faces at privacy invalidation and rejects revoked profile reads", async () => {
    const f = await discoverPeopleContext();
    try {
      f.area("explore").click();
      await vi.waitFor(() => expect(f.rows()).toHaveLength(3));
      const stale = f.rows()[0]!;
      stale.click();
      const openProfile = f.root.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")!;
      await vi.waitFor(() => expect(openProfile.querySelector(".kl-addon-profile-identity h2")?.textContent).toBe("Avery"));
      expect(openProfile.textContent).not.toContain("Native profile");
      const resolve = f.holdDirectory();
      const previousReads = f.profileReads(f.first.memberNumber).length;
      f.emit("profile-discovery");
      expect(openProfile.open).toBe(false);
      expect(openProfile.textContent).not.toContain("Full profile bio");
      expect(f.root.activeElement?.getAttribute("aria-label")).toBe("People");
      expect(f.rows()).toHaveLength(0);
      stale.click();
      expect(f.root.querySelector(".kl-addon-profile-dialog[open]")).toBeNull();
      expect(f.profileReads(f.first.memberNumber)).toHaveLength(previousReads);
      f.profiles.delete(f.first.memberNumber);
      await vi.waitFor(() => expect(f.directoryReads()).toHaveLength(2));
      resolve([f.first, f.second]);
      await vi.waitFor(() => expect(f.rows().map(row => row.dataset.memberNumber)).toEqual([String(f.second.memberNumber)]));
      expect(f.section().textContent).not.toContain("Making");
      const profile = f.profiles.get(f.second.memberNumber)!;
      f.profiles.set(f.second.memberNumber, { ...profile, isDefault: true });
      f.rows()[0]!.click();
      const dialog = f.root.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")!;
      await vi.waitFor(() => expect(dialog.querySelector(".kl-addon-profile-unavailable")).not.toBeNull());
      expect(dialog.querySelector(".kl-addon-profile-identity")).toBeNull();
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  async function discoverRoomsContext() {
    const owner = 72385;
    const origin = "https://cloud.example.test";
    const generation = "a".repeat(32);
    const listeners = new Set<(kind: string) => void>();
    const room = { name: "Tea lounge", searchSpace: "X", background: "lounge", capacity: 20 } as const;
    const first: PersistentSpace = {
      id: "55555555-5555-4555-8555-555555555551", owner, communityId: null, communityName: null,
      name: "Tea <em>Lounge</em>", description: "Tea and conversation.", language: "English", tags: [],
      access: "public", discoverable: true, archived: false, spaceArchived: false, revision: 1,
      createdAt: 1, updatedAt: 1, membership: "none", role: null, canRead: true, canManage: false,
      canJoin: true, canTransfer: false, canRestore: false, memberCount: 2, saved: false, preferencesRevision: 0,
      icon: "cup", color: "amber", room,
    };
    const second: PersistentSpace = { ...first, id: "55555555-5555-4555-8555-555555555552", name: "Quiet garden", icon: "leaf", color: "sage", room: null };
    const hidden: PersistentSpace = { ...first, id: "55555555-5555-4555-8555-555555555553", name: "Unavailable Space", canRead: false, room: null };
    const page = (items: PersistentSpace[]) => ({ items, nextCursor: null, recoveryGeneration: generation });
    let readPreview: () => unknown = () => page([first, hidden, second]);
    let readDetail: () => unknown = () => ({ ...first, name: "Tea Lounge updated", revision: 2, recoveryGeneration: generation });
    const cloud = new CloudClient({
      origin, memberNumber: owner, getMemberNumber: () => owner, isBlocked: () => false,
      sendProof: vi.fn(), fetchImpl: vi.fn(),
    });
    vi.spyOn(cloud, "connected", "get").mockReturnValue(true);
    vi.spyOn(cloud, "retainEvents").mockReturnValue(() => {});
    vi.spyOn(cloud, "subscribe").mockImplementation(listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    });
    const request = vi.spyOn(cloud, "request").mockImplementation(async (method, path) => {
      if (method !== "GET") throw new CloudError("read_only_fixture", 403);
      if (path === "/v1/me") return {
        memberNumber: owner, features: { persistentSpaces: true, spaceDirectory: true, spaceMutationRecoveryGeneration: true },
        directRecovery: { generation, restored: false },
      };
      const url = new URL(path, origin);
      if (url.pathname === "/v1/spaces/hosts") return page([]);
      if (url.pathname === "/v1/spaces") return url.searchParams.get("limit") === "3" ? readPreview() : page([second]);
      if (url.pathname === `/v1/spaces/${first.id}`) return readDetail();
      throw new CloudError("fixture_unavailable", 503);
    });
    const f = await setup(undefined, [], undefined, cloud);
    const section = () => f.root.querySelector<HTMLElement>(".kl-discover-rooms")!;
    const rows = () => [...section().querySelectorAll<HTMLButtonElement>(".kl-discover-room")];
    const readUrls = () => request.mock.calls.map(([, path]) => new URL(path, origin));
    return {
      ...f, cloud, first, hidden, second, generation, section, rows,
      previewReads: () => readUrls().filter(url => url.pathname === "/v1/spaces" && url.searchParams.get("limit") === "3"),
      detailReads: () => readUrls().filter(url => url.pathname === `/v1/spaces/${first.id}`),
      holdPreview: () => {
        let release!: (value: ReturnType<typeof page>) => void;
        const held = new Promise<ReturnType<typeof page>>(resolve => { release = resolve; });
        readPreview = () => held;
        return (items: PersistentSpace[]) => release(page(items));
      },
      denyDetail: () => { readDetail = () => { throw new CloudError("space_unavailable", 404); }; },
      emit: (kind: string) => { for (const listener of listeners) listener(kind); },
    };
  }

  it("loads accessible Discover Rooms without searching native rooms and rereads the Space detail", async () => {
    const f = await discoverRoomsContext();
    try {
      expect(f.previewReads()).toHaveLength(0);
      f.area("explore").click();
      await vi.waitFor(() => expect(f.rows()).toHaveLength(2));
      const section = f.section().closest("section")!;
      expect(section.querySelector("h2")?.textContent).toBe("Rooms");
      expect(f.rows().map(row => row.dataset.spaceId)).toEqual([f.first.id, f.second.id]);
      expect(f.rows().map(row => row.querySelector("strong")?.textContent)).toEqual([f.first.name, f.second.name]);
      expect(f.section().querySelector("em")).toBeNull();
      expect(f.section().textContent).not.toMatch(/Unavailable Space|0\/20|in room/u);
      expect(f.rows().map(row => row.querySelector("small")?.textContent)).toEqual(["Room status unknown", "No linked room"]);
      expect(f.rows()[0]?.querySelector('.kl-sp-card-heading-icon[data-color="amber"]')).not.toBeNull();
      expect(f.previewReads()).toHaveLength(1);
      expect(f.previewReads()[0]?.searchParams.get("scope")).toBe("all");
      expect(f.previewReads()[0]?.searchParams.get("directory")).toBe("1");
      expect(f.previewReads()[0]?.searchParams.get("recoveryGeneration")).toBe(f.generation);
      expect(f.adapter.searchRooms).not.toHaveBeenCalled();
      expect(f.detailReads()).toHaveLength(0);

      f.rows()[0]!.click();
      await vi.waitFor(() => expect(f.root.querySelector(".kl-sp-detail-copy h1")?.textContent).toBe("Tea Lounge updated"));
      expect(f.route("rooms").getAttribute("aria-current")).toBe("page");
      expect(f.root.querySelector("#kl-rooms-spaces")?.getAttribute("aria-selected")).toBe("true");
      expect(f.detailReads()).toHaveLength(1);
      expect(f.detailReads()[0]?.searchParams.get("recoveryGeneration")).toBe(f.generation);
      expect(f.adapter.searchRooms).not.toHaveBeenCalled();

      f.route("discover").click();
      await vi.waitFor(() => expect(f.rows()).toHaveLength(2));
      section.querySelector<HTMLButtonElement>('button[aria-label="Rooms"]')!.click();
      await vi.waitFor(() => expect(f.root.querySelector(".kl-sp-title")?.textContent).toBe(f.second.name));
      expect(f.root.querySelector(".kl-sp-detail-copy h1")).toBeNull();
      expect(f.detailReads()).toHaveLength(1);
      expect(f.adapter.searchRooms).not.toHaveBeenCalled();
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("removes invalidated Discover Rooms and does not restore a revoked Space detail on click", async () => {
    const f = await discoverRoomsContext();
    try {
      f.area("explore").click();
      await vi.waitFor(() => expect(f.rows()).toHaveLength(2));
      const stale = f.rows()[0]!;
      const resolve = f.holdPreview();
      f.emit("spaces");
      expect(f.rows()).toHaveLength(0);
      stale.click();
      expect(f.route("discover").getAttribute("aria-current")).toBe("page");
      expect(f.detailReads()).toHaveLength(0);
      await vi.waitFor(() => expect(f.previewReads()).toHaveLength(2));
      resolve([f.first, f.hidden]);
      await vi.waitFor(() => expect(f.rows().map(row => row.dataset.spaceId)).toEqual([f.first.id]));
      f.denyDetail();
      f.rows()[0]!.click();
      await vi.waitFor(() => expect(f.detailReads()).toHaveLength(1));
      await vi.waitFor(() => expect(f.root.querySelector(".kl-spaces-page .kl-sp-status")?.textContent).toContain("This space is no longer available."));
      expect(f.root.querySelector(".kl-sp-detail-copy h1")).toBeNull();
      expect(f.adapter.searchRooms).not.toHaveBeenCalled();
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("shows only fresh matching lobby occupancy in Discover Rooms without an extra native search", async () => {
    const f = await discoverRoomsContext();
    const realNow = Date.now.bind(Date);
    let elapsed = 0;
    vi.spyOn(Date, "now").mockImplementation(() => realNow() + elapsed);
    const native: BCLobbyRoom = {
      name: f.first.room!.name, description: "", language: "EN", memberCount: 2, memberLimit: 8,
      canJoin: true, locked: false, privateRoom: false, mapType: "", friends: [],
    };
    const search = vi.mocked(f.adapter.searchRooms).mockResolvedValue([native]);
    try {
      f.area("explore").click();
      f.route("rooms").click();
      await vi.waitFor(() => expect(f.root.querySelector(".kl-room-directory-status")?.getAttribute("data-state")).toBe("ready"));
      expect(search).toHaveBeenCalledTimes(1);
      expect(search).toHaveBeenCalledWith("", "X");
      f.route("discover").click();
      await vi.waitFor(() => expect(f.rows()[0]?.querySelector("small")?.textContent).toBe("Open · 2/8 in room"));
      expect(search).toHaveBeenCalledTimes(1);

      f.route("rooms").click();
      elapsed = 90_000;
      f.route("discover").click();
      await vi.waitFor(() => expect(f.rows()[0]?.querySelector("small")?.textContent).toBe("Room status unknown"));
      expect(search).toHaveBeenCalledTimes(1);

      f.route("rooms").click();
      const searchSpace = f.root.querySelector<HTMLSelectElement>(".kl-lobby-space")!;
      searchSpace.value = "M";
      searchSpace.dispatchEvent(new Event("change", { bubbles: true }));
      await vi.waitFor(() => expect(f.root.querySelector(".kl-room-directory-status")?.getAttribute("data-state")).toBe("ready"));
      expect(search).toHaveBeenLastCalledWith("", "M");
      f.route("discover").click();
      await vi.waitFor(() => expect(f.rows()[0]?.querySelector("small")?.textContent).toBe("Room status unknown"));
      expect(search).toHaveBeenCalledTimes(2);
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  async function discoverWorkshopContext(browsePatch: Partial<WorkshopSummary> = {}) {
    const owner = 72385;
    const origin = "https://cloud.example.test";
    const generation = "a".repeat(32);
    const listeners = new Set<(kind: string) => void>();
    const item = (suffix: number, title: string, featured = false): WorkshopSummary => ({
      id: `00000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`,
      author: 202, authorName: "Workshop author", type: "Status & emoji",
      status: "published", visibility: "public", title, summary: "Public release", tags: [],
      version: "1.2.0", createdAt: 1000, publishedAt: 2000 + suffix,
      discovery: { installs: 0, featured, featuredUntil: featured ? Date.now() + 60_000 : null },
    });
    const featured = item(1, "Featured <em>status</em> pack", true);
    const newest = item(3, "Newest statuses");
    const second = item(2, "Another status pack");
    const detail: WorkshopDetail = {
      ...featured, title: "Featured pack updated",
      versions: [{
        ...newWorkshopDraft("Status & emoji"), title: "Featured pack updated", version: "1.2.0",
        visibility: "public", payload: { statuses: [{ text: "Hello", icon: "heart" }], emojis: [] },
        permissions: ["status-library"], publishedAt: 2001,
      }],
    };
    let readFeatured: () => WorkshopSummary[] | Promise<WorkshopSummary[]> = () => [featured];
    let readDetail = () => detail;
    const cloud = new CloudClient({
      origin, memberNumber: owner, getMemberNumber: () => owner, isBlocked: () => false,
      sendProof: vi.fn(), fetchImpl: vi.fn(),
    });
    vi.spyOn(cloud, "connected", "get").mockReturnValue(true);
    vi.spyOn(cloud, "retainEvents").mockReturnValue(() => {});
    vi.spyOn(cloud, "subscribe").mockImplementation(listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    });
    const request = vi.spyOn(cloud, "request").mockImplementation(async (method, path) => {
      if (method !== "GET") throw new CloudError("read_only_fixture", 403);
      if (path === "/v1/me") return {
        memberNumber: owner,
        features: {
          workshopPublications: true, workshopCatalog: true, workshopDiscovery: true,
          roomOpening: true, workshopMutationRecoveryGeneration: true,
        },
        directRecovery: { generation, restored: false },
      };
      const url = new URL(path, origin);
      if (url.pathname === `/v1/workshop/${featured.id}`) return { ...readDetail(), recoveryGeneration: generation };
      if (url.pathname === "/v1/workshop/catalog") {
        const collection = url.searchParams.get("collection") ?? "all";
        const items = collection === "featured" ? await readFeatured() : [{ ...newest, ...browsePatch }, second, featured];
        const sort = url.searchParams.get("sort");
        const rows = sort === "recommended" ? items.map(item => ({ ...item, discovery: { ...item.discovery, recommended: false } })) : items;
        return {
          items: rows.slice(0, Number(url.searchParams.get("limit"))), nextCursor: null,
          sort, scope: url.searchParams.get("scope"), collection,
        };
      }
      throw new CloudError("fixture_unavailable", 503);
    });
    const f = await setup(undefined, [], undefined, cloud);
    const section = () => f.root.querySelector<HTMLElement>(".kl-discover-workshop")!;
    const rows = () => [...section().querySelectorAll<HTMLButtonElement>(".kl-discover-workshop-row")];
    const readUrls = () => request.mock.calls.map(([, path]) => new URL(path, origin));
    const catalogReads = () => readUrls().filter(url => url.pathname === "/v1/workshop/catalog");
    return {
      ...f, cloud, featured, newest, second, generation, section, rows, catalogReads,
      previewReads: () => catalogReads().filter(url => url.searchParams.get("limit") !== "20"),
      detailReads: () => readUrls().filter(url => url.pathname === `/v1/workshop/${featured.id}`),
      emit: (kind: string) => { for (const listener of listeners) listener(kind); },
      holdFeatured: () => {
        let release!: (items: WorkshopSummary[]) => void;
        const pending = new Promise<WorkshopSummary[]>(resolve => { release = resolve; });
        readFeatured = () => pending;
        return release;
      },
      unlistDetail: () => {
        readDetail = () => ({
          ...detail, visibility: "unlisted", title: "Unlisted release title",
          discovery: { installs: 0, featured: false, featuredUntil: null },
          versions: detail.versions.map(version => ({ ...version, visibility: "unlisted" })),
        });
      },
    };
  }

  it("shows Featured Workshop works first in Discover and opens current detail or Browse", async () => {
    const f = await discoverWorkshopContext();
    try {
      expect(f.catalogReads()).toHaveLength(0);
      f.area("explore").click();
      await vi.waitFor(() => expect(f.rows()).toHaveLength(3));
      const section = f.section().closest("section")!;
      expect(section.querySelector("h2")?.textContent).toBe("Made by your people");
      expect(f.rows().map(row => row.dataset.packageId)).toEqual([f.featured.id, f.newest.id, f.second.id]);
      expect(f.rows()[0]?.querySelector("strong")?.textContent).toBe(f.featured.title);
      expect(f.section().querySelector("em")).toBeNull();
      expect(f.rows()[0]?.querySelector("small")?.textContent).toBe("Status & emoji · v1.2.0");
      expect(f.rows()[0]?.querySelector(".kl-cm-color-amber")).not.toBeNull();
      expect(f.previewReads().map(url => url.searchParams.get("collection"))).toEqual(["featured", "all"]);
      for (const { searchParams } of f.previewReads()) {
        expect(searchParams.get("scope")).toBe("browse");
        expect(searchParams.get("sort")).toBe("newest");
        expect(searchParams.get("format")).toBe("6");
        expect(Number(searchParams.get("limit"))).toBeLessThanOrEqual(3);
      }
      expect(f.detailReads()).toHaveLength(0);

      f.rows()[0]!.click();
      await vi.waitFor(() => expect(f.root.querySelector(".kl-workshop-detail-header h1")?.textContent).toBe("Featured pack updated"));
      expect(f.route("workshop").getAttribute("aria-current")).toBe("page");
      expect(f.detailReads()).toHaveLength(1);
      expect(f.detailReads()[0]?.searchParams.get("recoveryGeneration")).toBe(f.generation);

      f.route("discover").click();
      await vi.waitFor(() => expect(f.rows()).toHaveLength(3));
      section.querySelector<HTMLButtonElement>('button[aria-label="Workshop"]')!.click();
      await vi.waitFor(() => expect(f.root.querySelectorAll(".kl-workshop-card")).toHaveLength(3));
      expect(f.root.querySelector(".kl-workshop-detail-header")).toBeNull();
      expect(f.root.querySelector(".kl-workshop-heading h1")?.textContent).toBe("Workshop");
      expect(f.catalogReads().at(-1)?.searchParams.get("collection")).toBe("all");
      expect(f.detailReads()).toHaveLength(1);
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("clears invalidated Discover Workshop rows and hides a freshly unlisted release", async () => {
    const f = await discoverWorkshopContext();
    try {
      f.area("explore").click();
      await vi.waitFor(() => expect(f.rows()).toHaveLength(3));
      const stale = f.rows()[0]!;
      const release = f.holdFeatured();
      f.emit("workshop-moderation");
      expect(f.rows()).toHaveLength(0);
      stale.click();
      expect(f.route("discover").getAttribute("aria-current")).toBe("page");
      expect(f.detailReads()).toHaveLength(0);
      await vi.waitFor(() => expect(f.previewReads()).toHaveLength(3));
      release([f.featured]);
      await vi.waitFor(() => expect(f.rows()).toHaveLength(3));
      f.unlistDetail();
      f.rows()[0]!.click();
      await vi.waitFor(() => expect(f.root.querySelector(".kl-workshop-page")?.textContent)
        .toContain("This creation is private or no longer available."));
      expect(f.detailReads()).toHaveLength(1);
      expect(f.root.textContent).not.toContain("Unlisted release title");
      expect(f.root.querySelector(".kl-workshop-detail-header")).toBeNull();
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it.each([
    { visibility: "unlisted" },
    { status: "draft", version: null, publishedAt: null, createdAt: 2003, hasDraft: true },
  ] satisfies Partial<WorkshopSummary>[])("rejects a non-public or unpublished Discover Workshop catalogue entry (%o)", async changes => {
    const f = await discoverWorkshopContext({ ...changes, title: "Hidden release" });
    try {
      f.area("explore").click();
      await vi.waitFor(() => expect(f.previewReads()).toHaveLength(2));
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(f.section().textContent).not.toContain("Hidden release");
      expect(f.rows()).toHaveLength(0);
      expect(f.previewReads()).toHaveLength(2);
      expect(f.detailReads()).toHaveLength(0);
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  async function roomsContext(deferred=false) {
    const owner=72385,generation='a'.repeat(32),listeners=new Set<(kind:string)=>void>();
    const saved={id:'55555555-5555-4555-8555-555555555555',owner,communityId:null,communityName:null,name:'Saved quiet garden',description:'A familiar public Space.',language:'English',tags:[],access:'public',discoverable:true,archived:false,spaceArchived:false,revision:1,createdAt:1,updatedAt:1,membership:'active',role:'owner',canRead:true,canManage:true,canJoin:false,canTransfer:true,canRestore:false,memberCount:1,saved:true,preferencesRevision:1,room:null,presets:[],rules:[]};
    const page={items:[saved],nextCursor:null,recoveryGeneration:generation};
    let release=()=>{};
    const cloud=new CloudClient({origin:'https://cloud.example.test',memberNumber:owner,getMemberNumber:()=>owner,isBlocked:()=>false,sendProof:vi.fn(),fetchImpl:vi.fn(async()=>Response.json({error:'fixture_unavailable'},{status:503}))});
    vi.spyOn(cloud,'connected','get').mockReturnValue(true);
    vi.spyOn(cloud,'retainEvents').mockReturnValue(()=>{});
    vi.spyOn(cloud,'subscribe').mockImplementation(listener=>{listeners.add(listener);return()=>listeners.delete(listener);});
    const request=vi.spyOn(cloud,'request').mockImplementation(async(method,path)=>{
      if(method!=='GET')throw new CloudError('read_only_fixture',403);
      if(path==='/v1/me')return{memberNumber:owner,features:{persistentSpaces:true,spaceDirectory:true,spaceMutationRecoveryGeneration:true},directRecovery:{generation,restored:false}};
      if(path.startsWith('/v1/spaces?')){
        if(new URL(path,cloud.origin).searchParams.get('scope')==='saved')return deferred?new Promise(resolve=>{release=()=>resolve(page);}):page;
        return{items:[],nextCursor:null,recoveryGeneration:generation};
      }
      if(path.startsWith('/v1/spaces/'+saved.id))return path.includes('/members')||path.includes('/audit')?{items:[],nextCursor:null,recoveryGeneration:generation}:{...saved,recoveryGeneration:generation};
      if(path.startsWith('/v1/spaces/hosts'))return{items:[],recoveryGeneration:generation};
      throw new CloudError('fixture_unavailable',503);
    });
    const f=await setup(undefined,[],undefined,cloud);
    f.area('explore').click();f.route('rooms').click();f.root.querySelector<HTMLButtonElement>('#kl-rooms-history')!.click();
    const open=()=>f.root.querySelector<HTMLButtonElement>('[aria-label="Your Space context"]')!.click();
    return{...f,cloud,request,saved,generation,open,release:()=>release(),emit:(kind:string)=>{for(const listener of listeners)listener(kind);}};
  }

  it('opens the Rooms context from History without switching modes and routes a saved Space through the real workspace', async () => {
    const f=await roomsContext();
    try{
      f.open();
      const dialog=f.root.querySelector<HTMLDialogElement>('.kl-sp-info-dialog[open]')!;
      expect(dialog).not.toBeNull();expect(dialog.closest('[hidden]')).toBeNull();
      expect(f.root.querySelector('#kl-rooms-history')?.getAttribute('aria-selected')).toBe('true');
      expect(f.root.querySelector<HTMLElement>('.kl-panel')!.dataset.workspace).toBe('room');
      await vi.waitFor(()=>expect(dialog.querySelector('.kl-sp-saved-row strong')?.textContent).toBe(f.saved.name));
      const read=f.request.mock.calls.find(([,path])=>path.startsWith('/v1/spaces?')&&new URL(path,f.cloud.origin).searchParams.get('scope')==='saved')!;
      expect(new URL(read[1],f.cloud.origin).searchParams.get('recoveryGeneration')).toBe(f.generation);
      dialog.querySelector<HTMLButtonElement>('.kl-sp-saved-row')!.click();
      await vi.waitFor(()=>expect(f.root.querySelector('.kl-sp-detail-copy h1')?.textContent).toBe(f.saved.name));
      expect(dialog.open).toBe(false);expect(f.root.querySelector('#kl-rooms-spaces')?.getAttribute('aria-selected')).toBe('true');
      expect(f.request.mock.calls.filter(([,path])=>path.startsWith('/v1/spaces')).every(([method])=>method==='GET')).toBe(true);
    }finally{f.view.destroy();f.cloud.destroy();}
  });

  it('does not restore a late Rooms context response after route, hide, account, origin or destroy changes', async () => {
    const f=await roomsContext(true);
    try{
      let reads=0;
      for(const change of ['route','hide','account','origin','destroy'] as const){
        f.open();reads++;await vi.waitFor(()=>expect(f.request.mock.calls.filter(([,path])=>path.startsWith('/v1/spaces?')&&new URL(path,f.cloud.origin).searchParams.get('scope')==='saved')).toHaveLength(reads));
        const dialog=f.root.querySelector<HTMLDialogElement>('.kl-sp-info-dialog[open]')!;expect(dialog.textContent).toContain('Loading saved Spaces');
        let restoreIdentity=()=>{};
        if(change==='route'){f.area('chat').click();f.route('direct').click();}
        else if(change==='hide')f.view.close();
        else if(change==='destroy')f.view.destroy();
        else if(change==='account'){const own=vi.spyOn(f.adapter,'getOwnMemberNumber').mockReturnValue(101);restoreIdentity=()=>own.mockRestore();f.emit('session');}
        else{const origin=vi.spyOn(f.cloud,'origin','get').mockReturnValue('https://other.example.test');restoreIdentity=()=>origin.mockRestore();f.emit('session');}
        f.release();await Promise.resolve();await Promise.resolve();
        expect(dialog.open,change).toBe(false);expect(f.root.querySelector('.kl-sp-info-dialog[open]'),change).toBeNull();
        expect(f.root.textContent,change).not.toContain(f.saved.name);restoreIdentity();
        if(change==='destroy')break;
        if(f.root.querySelector<HTMLElement>('.kl-panel')!.hidden)await f.view.open();
        f.area('explore').click();f.route('rooms').click();f.root.querySelector<HTMLButtonElement>('#kl-rooms-history')!.click();
      }
    }finally{f.view.destroy();f.cloud.destroy();}
  });

  it('removes loaded saved-Space context when community permissions change', async () => {
    const f=await roomsContext();
    try{
      f.open();const dialog=f.root.querySelector<HTMLDialogElement>('.kl-sp-info-dialog[open]')!;
      await vi.waitFor(()=>expect(dialog.querySelector('.kl-sp-saved-row strong')?.textContent).toBe(f.saved.name));
      const stale=dialog.querySelector<HTMLButtonElement>('.kl-sp-saved-row')!;
      f.emit('communities');expect(dialog.open).toBe(false);expect(f.root.textContent).not.toContain(f.saved.name);
      stale.click();expect(f.root.querySelector('#kl-rooms-history')?.getAttribute('aria-selected')).toBe('true');
    }finally{f.view.destroy();f.cloud.destroy();}
  });

  it('clears a filtered lobby result with a fresh Mixed search and keeps the current room visible', async () => {
    const f=await setup();
    const room=(name:string):BCLobbyRoom=>({name,description:'Room for tea',language:'EN',memberCount:3,memberLimit:12,
      canJoin:true,locked:false,privateRoom:false,mapType:'',friends:[]});
    const current=room('Current lounge'),garden=room('Garden'),studio=room('Studio');
    vi.spyOn(f.adapter,'getCurrentRoomName').mockReturnValue(current.name);
    vi.spyOn(f.adapter,'getCurrentLobbyRoom').mockReturnValue(current);
    const request=vi.spyOn(f.adapter,'searchRooms').mockImplementation(async(query,space)=>
      space==='M'?[]:query==='Garden'?[garden]:query?[]:[garden,studio]);
    try{
      f.area('explore').click();f.route('rooms').click();
      const panel=f.root.querySelector<HTMLElement>('.kl-lobbies-panel')!;
      const status=panel.querySelector<HTMLElement>('.kl-room-directory-status')!;
      const search=panel.querySelector<HTMLInputElement>('.kl-lobby-search')!;
      const space=panel.querySelector<HTMLSelectElement>('.kl-lobby-space')!;
      const empty=panel.querySelector<HTMLElement>('.kl-lobby-empty')!;
      const clear=empty.querySelector<HTMLButtonElement>('.kl-text-button--primary')!;
      const ready=()=>vi.waitFor(()=>expect(status.dataset.state).toBe('ready'));
      const names=()=>[...panel.querySelectorAll('.kl-lobby-list .kl-lobby-name')].map(name=>name.textContent);
      const enter=()=>search.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
      const fill=(query:string)=>{search.value=query;search.dispatchEvent(new Event('input',{bubbles:true}));};
      await ready();expect(names()).toEqual(['Garden','Studio']);expect(empty.hidden).toBe(true);
      fill('Garden');enter();await ready();expect(request).toHaveBeenLastCalledWith('Garden','X');
      panel.querySelector<HTMLButtonElement>('[data-room-filter="friends"]')!.click();
      const filterButton=panel.querySelector<HTMLButtonElement>('.kl-lobby-filter-button')!;
      filterButton.click();const filters=panel.querySelector<HTMLDialogElement>('.kl-lobby-filter-dialog')!;
      const change=(control:HTMLSelectElement,value:string)=>{control.value=value;control.dispatchEvent(new Event('change',{bubbles:true}));};
      change(filters.querySelector<HTMLSelectElement>('[aria-label="Language"]')!,'l:en');
      change(filters.querySelector<HTMLSelectElement>('[aria-label="Access"]')!,'private');
      filters.close();fill('');
      expect(empty.hidden).toBe(false);expect(status.textContent).toContain('0 rooms');
      expect(empty.querySelector('h2')?.textContent).toBe('No matching lobbies');
      expect(empty.querySelector('[data-icon="door"]')).not.toBeNull();
      const currentCard=panel.querySelector<HTMLElement>('.kl-current-room-summary')!;
      expect(currentCard.hidden).toBe(false);expect(currentCard.textContent).toContain(current.name);
      expect(currentCard.nextElementSibling).toBe(status);
      const searches=request.mock.calls.length;
      clear.focus();clear.click();
      expect(empty.hidden).toBe(true);expect(f.root.activeElement).toBe(search);
      await ready();expect(request).toHaveBeenCalledTimes(searches+1);expect(request).toHaveBeenLastCalledWith('','X');
      expect(names()).toEqual(['Garden','Studio']);expect(search.value).toBe('');expect(space.value).toBe('X');
      expect(panel.querySelector('[data-room-filter="all"]')?.getAttribute('aria-pressed')).toBe('true');
      expect(filters.querySelector<HTMLSelectElement>('[aria-label="Language"]')?.value).toBe('*');
      expect(filters.querySelector<HTMLSelectElement>('[aria-label="Access"]')?.value).toBe('all');
      expect(currentCard.hidden).toBe(false);
      change(space,'M');await ready();expect(empty.hidden).toBe(false);clear.click();await ready();
      expect(request).toHaveBeenLastCalledWith('','X');expect(names()).toEqual(['Garden','Studio']);
      request.mockRejectedValueOnce(new Error('Room list unavailable'));
      fill('Missing');expect(empty.hidden).toBe(false);enter();expect(empty.hidden).toBe(true);
      await vi.waitFor(()=>expect(status.dataset.state).toBe('error'));
      expect(empty.hidden).toBe(true);expect(currentCard.hidden).toBe(false);
    }finally{f.view.destroy();}
  });

  it('opens History actions through the existing pointer and keyboard menus, then closes on navigation', async () => {
    const f=await setup();
    try{
      f.area('explore').click();f.route('rooms').click();
      const tab=f.root.querySelector<HTMLButtonElement>('#kl-rooms-history')!;tab.click();
      const menu=f.root.querySelector<HTMLDialogElement>('#kl-room-history-options')!;
      const context=new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:20,clientY:30});
      tab.dispatchEvent(context);
      expect(context.defaultPrevented).toBe(true);expect(menu.open).toBe(true);
      expect([...menu.querySelectorAll('[role="menuitem"]')].map(b=>b.textContent)).toEqual(['Refresh history','Clear history']);
      expect(tab.getAttribute('aria-selected')).toBe('true');
      menu.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
      expect(menu.open).toBe(false);expect(f.root.activeElement).toBe(tab);
      tab.dispatchEvent(new KeyboardEvent('keydown',{key:'F10',shiftKey:true,bubbles:true,cancelable:true}));
      expect(menu.open).toBe(true);expect(f.root.querySelector<HTMLElement>('.kl-panel')!.hidden).toBe(false);
      f.area('chat').click();f.route('direct').click();
      expect(menu.open).toBe(false);expect(f.route('direct').getAttribute('aria-current')).toBe('page');
    }finally{f.view.destroy();}
  });

  it('uses touch hold for History actions while mouse hold and a moved touch remain ordinary gestures', async () => {
    const f=await setup();
    try{
      f.area('explore').click();f.route('rooms').click();
      const tab=f.root.querySelector<HTMLButtonElement>('#kl-rooms-history')!;tab.click();
      const menu=f.root.querySelector<HTMLDialogElement>('#kl-room-history-options')!;
      vi.useFakeTimers();
      const pointer=(type:string,pointerType:string,clientX=20)=>tab.dispatchEvent(new PointerEvent(type,{pointerType,button:0,clientX,clientY:30,bubbles:true,cancelable:true}));
      pointer('pointerdown','mouse');await vi.advanceTimersByTimeAsync(600);expect(menu.open).toBe(false);pointer('pointerup','mouse');
      pointer('pointerdown','touch');pointer('pointermove','touch',35);await vi.advanceTimersByTimeAsync(600);expect(menu.open).toBe(false);pointer('pointerup','touch',35);
      pointer('pointerdown','touch');await vi.advanceTimersByTimeAsync(519);expect(menu.open).toBe(false);
      await vi.advanceTimersByTimeAsync(1);expect(menu.open).toBe(true);pointer('pointerup','touch');
      const click=new MouseEvent('click',{bubbles:true,cancelable:true});tab.dispatchEvent(click);
      expect(click.defaultPrevented).toBe(true);expect(menu.open).toBe(true);
      f.view.close();expect(menu.open).toBe(false);
    }finally{vi.useRealTimers();f.view.destroy();}
  });

  it('binds private Space notes to the account storage when Cloud attaches before navigation', async () => {
    const visible=vi.spyOn(SpacesPage.prototype,'setVisible'),storage=new MemoryKeyValueStorage();
    const owner=72385,origin='https://cloud.example.test',id='garden-studio',canonical='Tea at the quiet table.';
    const key=spaceNotesKey(owner,origin),otherKey=spaceNotesKey(owner,'https://other.example.test');
    storage.setItem(key,JSON.stringify({format:1,owner,origin,notes:[{id,text:canonical}]}));
    const otherRaw=JSON.stringify({format:1,owner,origin:'https://other.example.test',notes:[{id,text:'Another Cloud note.'}]});
    storage.setItem(otherKey,otherRaw);
    const cloud=new CloudClient({origin,memberNumber:owner,getMemberNumber:()=>owner,
      isBlocked:()=>false,sendProof:vi.fn(),fetchImpl:vi.fn(async()=>Response.json({error:'fixture_offline'},{status:503}))});
    // setup deliberately attaches Cloud before navigation storage, then mounts the view.
    const f=await setup(storage,[],undefined,cloud);
    try{
      f.area('explore').click();f.route('rooms').click();f.root.querySelector<HTMLButtonElement>('#kl-rooms-spaces')!.click();
      const space=visible.mock.contexts.find(value=>value instanceof SpacesPage) as SpacesPage;
      const notes=space.options.notes!;
      expect(notes.storage).toBe(storage);expect(notes.get(id)).toBe(canonical);expect(notes.error).toBe('');
      expect(notes.save(id,'  Bring the sketchbook.  ',canonical)).toBe(true);
      expect(JSON.parse(storage.getItem(key)!)).toEqual({format:1,owner,origin,notes:[{id,text:'Bring the sketchbook.'}]});
      expect(storage.getItem(otherKey)).toBe(otherRaw);
      expect(storage.getItem(spaceNotesKey(101,origin))).toBeNull();
    }finally{f.view.destroy();cloud.destroy();}
  });

  it('opens the existing visit history from a Space without recording a new room visit', async () => {
    const visible=vi.spyOn(SpacesPage.prototype,'setVisible');
    const cloud=new CloudClient({origin:'https://cloud.example.test',memberNumber:72385,getMemberNumber:()=>72385,
      isBlocked:()=>false,sendProof:vi.fn(),fetchImpl:vi.fn(async()=>Response.json({error:'fixture_offline'},{status:503}))});
    const f=await setup(undefined,[],undefined,cloud);
    try {
      f.area('explore').click();f.route('rooms').click();f.root.querySelector<HTMLButtonElement>('#kl-rooms-spaces')!.click();
      const space=visible.mock.contexts.find(value=>value instanceof SpacesPage) as SpacesPage;
      expect(space.options.openHistory).toBeTypeOf('function');
      const before=f.storage.getItem('kikilink:platform:room-history:v1');space.options.openHistory?.();
      expect(f.root.querySelector('#kl-rooms-history')?.getAttribute('aria-selected')).toBe('true');
      expect(f.root.querySelector<HTMLElement>('#kl-rooms-panel-history')!.hidden).toBe(false);
      expect(f.root.querySelector<HTMLElement>('.kl-rooms-directory')!.hidden).toBe(false);
      expect(f.route('rooms').getAttribute('aria-current')).toBe('page');
      expect(f.storage.getItem('kikilink:platform:room-history:v1')).toBe(before);
    } finally {f.view.destroy();cloud.destroy();}
  });

  it('associates an observed Space visit only with its proven active Cloud source', async () => {
    const cloud=new CloudClient({origin:'https://cloud.example.test',memberNumber:72385,getMemberNumber:()=>72385,
      isBlocked:()=>false,sendProof:vi.fn(),fetchImpl:vi.fn(async()=>Response.json({error:'fixture_offline'},{status:503}))});
    const f=await setup(undefined,[],undefined,cloud);
    try{
      vi.spyOn(f.adapter,'isInChatRoom').mockReturnValue(true);vi.spyOn(f.adapter,'getCurrentRoomName').mockReturnValue('Native garden');
      vi.spyOn(f.adapter,'getRoomAdminSnapshot').mockReturnValue({roomName:'Native garden',settings:{space:'X'}} as ReturnType<BCAdapter['getRoomAdminSnapshot']>);
      f.view.observeRoomVisit();const native=f.storage.getItem('kikilink:platform:room-history:v1');
      f.view.observeRoomVisit('garden-space','Native garden','https://other.example.test');
      expect(f.storage.getItem('kikilink:platform:room-history:v1')).toBe(native);
      f.view.observeRoomVisit('garden-space','Native garden');expect(f.storage.getItem('kikilink:platform:room-history:v1')).toBe(native);
      f.view.observeRoomVisit('garden-space','Native garden',cloud.origin);
      const items=JSON.parse(f.storage.getItem('kikilink:platform:room-history:v1')!).items;
      expect(items).toEqual([{kind:'space',id:'garden-space',origin:cloud.origin,at:expect.any(Number)}]);
      expect(items[0].name).toBeUndefined();expect(items[0].at).toBe(JSON.parse(native!).items[0].at);
    }finally{f.view.destroy();cloud.destroy();}
  });

  it('opens shared Spaces and Communities through the current Cloud, keeps event links, and releases the hash listener', async () => {
    const originalUrl = location.href;
    const cloud = new CloudClient({ origin: 'https://cloud.example.test', memberNumber: 72385, getMemberNumber: () => 72385,
      isBlocked: () => false, sendProof: vi.fn(), fetchImpl: vi.fn(async () => Response.json({ error: 'fixture_offline' }, { status: 503 })) });
    const openSpace = vi.spyOn(SpacesPage.prototype, 'open'), openEvent = vi.spyOn(EventsPage.prototype, 'open');
    const openCommunity = vi.spyOn(CommunitiesPage.prototype, 'open');
    const f = await setup(undefined, [], undefined, cloud);
    const route = (hash: string) => { history.replaceState(null, '', hash); window.dispatchEvent(new HashChangeEvent('hashchange')); };
    try {
      route(new URL(spaceShareUrl(location.href, 'garden-studio', cloud.origin)).hash);
      expect(openSpace).toHaveBeenLastCalledWith('garden-studio');
      expect(f.root.querySelector<HTMLElement>('.kl-panel')!.dataset.workspace).toBe('spaces');
      expect(openEvent).not.toHaveBeenCalled();
      const before = openSpace.mock.calls.length;
      route('#kikilink/space/private-place?cloud=https%3A%2F%2Fother.example');
      route('#kikilink/space/another-place?cloud=%ZZ');
      expect(openSpace).toHaveBeenCalledTimes(before);
      route('#kikilink/event/garden-evening?cloud=https%3A%2F%2Fcloud.example.test');
      expect(openEvent).toHaveBeenLastCalledWith('garden-evening');
      expect(f.root.querySelector<HTMLElement>('.kl-panel')!.dataset.workspace).toBe('events');
      const beforeCommunity = openCommunity.mock.calls.length;
      route('#kikilink/community/private-place?cloud=https%3A%2F%2Fother.example');
      expect(openCommunity).toHaveBeenCalledTimes(beforeCommunity);
      route(new URL(communityShareUrl(location.href, 'garden-club', cloud.origin)).hash);
      expect(openCommunity).toHaveBeenLastCalledWith('garden-club');
      expect(f.root.querySelector<HTMLElement>('.kl-panel')!.dataset.workspace).toBe('communities');
      f.view.destroy();
      route('#kikilink/space/after-close?cloud=https%3A%2F%2Fcloud.example.test');
      expect(openSpace).toHaveBeenCalledTimes(before);
    } finally { f.view.destroy(); cloud.destroy(); history.replaceState(null, '', originalUrl); }
  });

  it('opens the reviewed community from Matching group details without joining it', async () => {
    const owner = 72385;
    const communityId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const groupId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    const community = { id: communityId, name: 'Garden Community', description: 'Quiet evenings', language: 'English',
      access: 'public', discoverable: true, invitationPermission: 'admins', rules: [], revision: 1, archived: false,
      membership: null, role: null, memberCount: 6, canManage: false, canReview: false, canInvite: false };
    const group = rankResource({ kind: 'groups', id: groupId, title: 'Garden group', description: 'A small group for tea.',
      host: { memberNumber: 202, name: 'Host', username: null }, revision: 1,
      community: { id: communityId, name: community.name, joined: false }, intents: ['Friends'], languages: ['English'],
      interests: [], capacity: 5, members: 1, available: true, availability: 'Planning ahead', overlapMinutes: null,
      utcOffset: 3, startsAt: null, endsAt: null, saved: false, hidden: false, choiceRevision: 0, canRequest: true, membership: 'none' },
    DEFAULT_MATCH_SIGNAL);
    const cloud = new CloudClient({ origin: 'https://cloud.example.test', memberNumber: owner, getMemberNumber: () => owner,
      isBlocked: () => false, sendProof: vi.fn(), fetchImpl: vi.fn(async () => Response.json({ error: 'fixture_offline' }, { status: 503 })) });
    vi.spyOn(cloud, 'connected', 'get').mockReturnValue(true);
    vi.spyOn(cloud, 'retainEvents').mockReturnValue(() => {});
    const request = vi.spyOn(cloud, 'request').mockImplementation(async (method, path) => {
      if (method !== 'GET') throw new CloudError('read_only_fixture', 403);
      if (path === '/v1/me') return { memberNumber: owner, features: { matchingPeople: true, matchingResources: true, communities: true } };
      if (path === '/v1/matching/me') return { owner, revision: 1, signal: { ...DEFAULT_MATCH_SIGNAL, published: true }, active: true, canPublish: true, serverNow: 1000 };
      if (path.startsWith(`/v1/matching/resources/groups/${groupId}?`)) return group;
      if (path.startsWith('/v1/matching/resources/groups?')) return { items: [group], nextCursor: null, poolLimited: false, serverNow: 1000 };
      if (path.startsWith('/v1/matching/candidates?')) return { items: [], nextCursor: null, poolLimited: false, serverNow: 1000 };
      if (path === `/v1/communities/${communityId}`) return community;
      throw new CloudError('fixture_unavailable', 503);
    });
    const f = await setup(undefined, [], undefined, cloud);
    try {
      f.area('explore').click();
      f.route('people').click();
      f.root.querySelector<HTMLButtonElement>('.kl-people-matches')!.click();
      const matching = f.root.querySelector<HTMLElement>('.kl-matching-page')!;
      const groupsTab = () => Array.from(matching.querySelectorAll<HTMLButtonElement>('.kl-match-type-tabs [role="tab"]'))
        .find(button => button.textContent === 'Groups');
      await vi.waitFor(() => expect(groupsTab()?.matches(':not([aria-disabled="true"])')).toBe(true));
      groupsTab()!.click();
      const title = () => matching.querySelector<HTMLButtonElement>(`[data-resource-id="${groupId}"] .kl-match-name`);
      await vi.waitFor(() => expect(title()?.disabled).toBe(false));
      title()!.click();
      const dialog = matching.querySelector<HTMLDialogElement>('.kl-match-resources .kl-match-dialog')!;
      const link = () => Array.from(dialog.querySelectorAll('button')).find(button => button.textContent === 'View community');
      await vi.waitFor(() => expect(link()?.disabled).toBe(false));
      link()!.click();
      await vi.waitFor(() => expect(f.root.querySelector('.kl-cm-identity-title h1')?.textContent).toBe(community.name));
      expect(f.root.querySelector<HTMLElement>('.kl-panel')!.dataset.workspace).toBe('communities');
      expect(dialog.open).toBe(false);
      expect(request.mock.calls.filter(([, path]) => path.startsWith(`/v1/matching/resources/groups/${groupId}?`))).toHaveLength(2);
      expect(request.mock.calls.filter(([, path]) => path.startsWith('/v1/matching/') || path.startsWith('/v1/communities/'))
        .every(([method]) => method === 'GET')).toBe(true);
    } finally { f.view.destroy(); cloud.destroy(); }
  });

  it('ignores a shared Space when the game account differs from the Cloud account', async () => {
    const originalUrl = location.href;
    const cloud = new CloudClient({ origin: 'https://cloud.example.test', memberNumber: 72385, getMemberNumber: () => 72385,
      isBlocked: () => false, sendProof: vi.fn(), fetchImpl: vi.fn(async () => Response.json({ error: 'fixture_offline' }, { status: 503 })) });
    const openSpace = vi.spyOn(SpacesPage.prototype, 'open');
    const f = await setup(undefined, [], undefined, cloud);
    try {
      vi.spyOn(f.adapter, 'getOwnMemberNumber').mockReturnValue(101);
      history.replaceState(null, '', '#kikilink/space/garden-studio?cloud=https%3A%2F%2Fcloud.example.test');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      expect(openSpace).not.toHaveBeenCalled();
      expect(f.root.querySelector<HTMLElement>('.kl-panel')!.dataset.workspace).not.toBe('spaces');
    } finally { f.view.destroy(); cloud.destroy(); history.replaceState(null, '', originalUrl); }
  });

  it("closes the fitted global search with Escape without closing the addon", async () => {
    const f = await setup();
    try {
      const panel = f.root.querySelector<HTMLElement>(".kl-panel")!;
      const trigger = panel.querySelector<HTMLButtonElement>(".kl-finder-trigger")!;
      trigger.focus(); trigger.click();
      const dialog = panel.querySelector<HTMLDialogElement>(".kl-finder-dialog")!;
      expect(dialog.open).toBe(true);
      dialog.querySelector("input")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
      expect(dialog.open).toBe(false);
      expect(panel.hidden).toBe(false);
    } finally { f.view.destroy(); }
  });

  function finderCandidate(memberNumber: number, name: string): MatchCandidate {
    return rankMatch({
      memberNumber, name, username: null, note: "Shared note",
      intents: ["Friends"], languages: ["English"], size: "Either", signalRevision: 1,
      expiresAt: null, interests: [], interestsShared: false, availability: null,
      status: null, compatibility: null, mutualCount: null, communities: [], connectionsShared: false,
      overlapMinutes: null, saved: false, hidden: false, choiceRevision: 0, canRequest: true,
    }, DEFAULT_MATCH_SIGNAL);
  }

  function finderResource(kind: MatchResourceKind, title: string, score: number, host = 280): MatchResource {
    return {
      ...rankResource({
        kind, id: crypto.randomUUID(), title, description: "Full shared resource description",
        host: { memberNumber: host, name: "Matching host", username: null }, revision: 1,
        community: null, intents: ["Friends"], languages: ["English"], interests: [],
        capacity: 5, members: kind === "rooms" ? null : 1, available: kind === "rooms" ? null : true,
        availability: kind === "groups" ? "Planning ahead" : null, overlapMinutes: null, utcOffset: null,
        startsAt: kind === "events" ? Date.now() + 3_600_000 : null,
        endsAt: kind === "events" ? Date.now() + 7_200_000 : null,
        saved: false, hidden: false, choiceRevision: 0, canRequest: kind === "groups", membership: "none",
      }, DEFAULT_MATCH_SIGNAL),
      score, reasons: ["First shared resource reason", "Second shared resource reason"],
    };
  }

  async function matchingFinderContext(options: {
    people(query: string, limit: string | null): MatchCandidate[] | Promise<MatchCandidate[]>;
    candidate?(member: number): MatchCandidate;
    resources?(kind: MatchResourceKind, query: string): MatchResource[];
    resource?(kind: MatchResourceKind, id: string): MatchResource;
    blocked?: (member: number) => boolean;
    savedBrowse?: string;
  }) {
    const owner = 72385;
    const origin = "https://cloud.example.test";
    const generation = "b".repeat(32);
    const storage = new MemoryKeyValueStorage();
    const browseKey = `kikilink:matching-browse:${encodeURIComponent(origin)}:${owner}:v1`;
    if (options.savedBrowse) storage.setItem(browseKey, options.savedBrowse);
    const cloud = new CloudClient({ origin, memberNumber: owner, getMemberNumber: () => owner,
      isBlocked: options.blocked ?? (() => false), sendProof: vi.fn(), fetchImpl: vi.fn() });
    vi.spyOn(cloud, "connected", "get").mockReturnValue(true);
    vi.spyOn(cloud, "retainEvents").mockReturnValue(() => {});
    const request = vi.spyOn(cloud, "request").mockImplementation(async (method, path) => {
      if (method !== "GET") throw new CloudError("read_only_fixture", 403);
      if (path === "/v1/me") return { memberNumber: owner,
        features: {
          matchingPeople: true, matchingPeopleRecoveryGeneration: true,
          ...(options.resources ? { matchingResources: true, matchingGroupRecoveryGeneration: true } : {}),
        },
        directRecovery: { generation, restored: false } };
      const url = new URL(path, origin);
      if (url.pathname === "/v1/matching/me")
        return { owner, revision: 1, signal: DEFAULT_MATCH_SIGNAL, active: false, canPublish: true,
          serverNow: Date.now(), recoveryGeneration: generation };
      if (url.pathname === "/v1/matching/people")
        return { items: await options.people(url.searchParams.get("query") ?? "", url.searchParams.get("limit")), nextCursor: null,
          poolLimited: false, serverNow: Date.now(), recoveryGeneration: generation };
      const peer = /^\/v1\/matching\/people\/(\d+)$/.exec(url.pathname);
      if (peer && options.candidate) return { ...options.candidate(Number(peer[1])), recoveryGeneration: generation };
      const resource = /^\/v1\/matching\/resources\/(groups|rooms|events)(?:\/([^/]+))?$/.exec(url.pathname);
      if (resource) {
        const kind = resource[1] as MatchResourceKind;
        const id = resource[2];
        if (id && options.resource) return { ...options.resource(kind, id), recoveryGeneration: generation };
        if (!id && options.resources)
          return { items: options.resources(kind, url.searchParams.get("query") ?? ""),
            nextCursor: null, poolLimited: false, serverNow: Date.now(), recoveryGeneration: generation };
      }
      throw new CloudError("fixture_unavailable", 503);
    });
    const f = await setup(storage, [], undefined, cloud);
    const dialog = f.root.querySelector<HTMLDialogElement>(".kl-finder-dialog")!;
    const input = dialog.querySelector("input")!;
    const search = (value: string) => {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const open = () => f.root.querySelector<HTMLButtonElement>(".kl-finder-trigger")!.click();
    const rows = () => [...dialog.querySelectorAll<HTMLButtonElement>('[data-finder-kind="matching"]')];
    const searches = () => request.mock.calls
      .filter(([, path]) => path.startsWith("/v1/matching/people?"))
      .map(([, path]) => new URL(path, origin).searchParams);
    return { ...f, cloud, dialog, input, open, request, rows, search, searches, generation, browseKey };
  }

  it("previews up to three accessible People in Discover and opens a fresh matching explanation", async () => {
    const first = { ...finderCandidate(202, "Garden <b>friend</b>"),
      reasons: ["Shared interest in <i>gardening</i>", "Second shared reason"] };
    const second = { ...finderCandidate(206, "Shared hobby"), reasons: [] };
    const third = finderCandidate(207, "Another friend");
    const f = await matchingFinderContext({
      people: (_query, limit) => limit === "3" ? [
        first,
        { ...finderCandidate(203, "Hidden suggestion"), hidden: true },
        finderCandidate(204, "Blocked suggestion"),
        { ...finderCandidate(205, "Expired suggestion"), expiresAt: Date.now() - 1 },
        second,
        third,
        finderCandidate(208, "Above preview limit"),
      ] : [],
      candidate: member => ({ ...first, memberNumber: member, name: "Garden friend updated" }),
      blocked: member => member === 204,
    });
    const section = () => f.root.querySelector<HTMLElement>(".kl-discover-matching")!;
    const rows = () => [...section().querySelectorAll<HTMLButtonElement>(".kl-discover-match")];
    try {
      f.area("explore").click();
      await vi.waitFor(() => expect(rows()).toHaveLength(3));
      expect(section().closest("[hidden]")).toBeNull();
      expect(section().querySelector("h2")?.textContent).toBe("A little common ground");
      expect(rows().map(row => row.querySelector("strong")?.textContent)).toEqual([first.name, second.name, third.name]);
      expect(rows()[0]?.textContent).toContain(first.reasons[0]);
      expect(rows()[0]?.textContent).not.toContain(first.reasons[1]);
      expect(rows()[0]?.textContent).not.toContain(first.note);
      expect(rows()[0]?.querySelector("b, i")).toBeNull();
      expect(rows()[1]?.textContent).toContain("A shared suggestion");
      const searches = f.searches();
      expect(searches).toHaveLength(1);
      expect(searches[0]?.get("limit")).toBe("3");
      expect(searches[0]?.get("query") ?? "").toBe("");
      expect(searches[0]?.get("scope") ?? "all").toBe("all");
      expect(searches[0]?.get("recoveryGeneration")).toBe(f.generation);
      expect(f.request.mock.calls.some(([, path]) => path.startsWith("/v1/matching/resources/"))).toBe(false);
      const detailReads = () => f.request.mock.calls.filter(([, path]) => path.startsWith("/v1/matching/people/202?"));
      expect(detailReads()).toHaveLength(0);
      rows()[0]!.click();
      const why = () => f.root.querySelector<HTMLDialogElement>('.kl-matching-page dialog[open][data-layout="why"]');
      await vi.waitFor(() => expect(why()?.textContent).toContain("Garden friend updated"));
      expect(detailReads()).toHaveLength(1);
      expect(new URL(detailReads()[0]![1], f.cloud.origin).searchParams.get("recoveryGeneration")).toBe(f.generation);
      expect(f.root.querySelector<HTMLElement>(".kl-panel")?.dataset.workspace).toBe("matching");
      expect(f.request.mock.calls.filter(([, path]) => path.startsWith("/v1/matching/"))
        .every(([method]) => method === "GET")).toBe(true);
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("opens the saved Rooms Browse from an empty Discover preview without changing Matching filters", async () => {
    const savedBrowse = JSON.stringify({ type: "rooms", filters: {
      ...DEFAULT_MATCH_FILTERS, query: "Applied query", scope: "saved", sort: "name",
    } });
    const f = await matchingFinderContext({ people: () => [], resources: () => [], savedBrowse });
    const section = () => f.root.querySelector<HTMLElement>(".kl-discover-matching")!;
    const find = () => [...section().querySelectorAll("button")].find(button => button.textContent?.trim() === "Find matches")!;
    try {
      f.area("explore").click();
      await vi.waitFor(() => expect(section().closest("[hidden]")).toBeNull());
      expect(section().querySelectorAll(".kl-discover-match")).toHaveLength(0);
      find().click();
      await vi.waitFor(() => expect(f.root.querySelector('.kl-matching-page [role="tab"][aria-selected="true"]')?.textContent)
        .toBe("Rooms"));
      await vi.waitFor(() => {
        const read = f.request.mock.calls.find(([, path]) => path.startsWith("/v1/matching/resources/rooms?"));
        expect(read).toBeDefined();
        const rooms = new URL(read![1], f.cloud.origin).searchParams;
        expect(rooms.get("query")).toBe("Applied query");
        expect(rooms.get("scope")).toBe("saved");
        expect(rooms.get("sort")).toBe("name");
      });
      expect(f.storage.getItem(f.browseKey)).toBe(savedBrowse);
      expect(f.root.querySelector('.kl-matching-page dialog[open]')).toBeNull();
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("discards an older Discover Matching preview after leaving and returning to Explore", async () => {
    const earlier = finderCandidate(202, "Earlier suggestion");
    const latest = finderCandidate(203, "Latest suggestion");
    let release!: (rows: MatchCandidate[]) => void;
    const held = new Promise<MatchCandidate[]>(resolve => { release = resolve; });
    let reads = 0;
    const f = await matchingFinderContext({
      people: (_query, limit) => limit !== "3" ? [] : ++reads === 1 ? held : [latest],
    });
    const preview = () => f.root.querySelector<HTMLElement>(".kl-discover-matching")!;
    try {
      f.area("explore").click();
      await vi.waitFor(() => expect(reads).toBe(1));
      f.route("people").click();
      expect(preview().closest("[hidden]")).not.toBeNull();
      f.route("discover").click();
      await vi.waitFor(() => expect(preview().textContent).toContain(latest.name));
      release([earlier]);
      await held;
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(preview().textContent).toContain(latest.name);
      expect(preview().textContent).not.toContain(earlier.name);
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("debounces Finder Matching searches and opens a freshly authorized People explanation", async () => {
    const peer = { ...finderCandidate(202, "Garden <b>friend</b>"),
      reasons: ["Shared interest in <i>gardening</i>", "Another shared reason"] };
    const f = await matchingFinderContext({
      people: query => query === "garden" ? [
        peer,
        { ...finderCandidate(203, "Garden hidden"), hidden: true },
        finderCandidate(204, "Garden blocked"),
        { ...finderCandidate(205, "Garden expired"), expiresAt: Date.now() - 1 },
      ] : [],
      candidate: () => ({ ...peer, name: "Garden friend updated" }),
      blocked: member => member === 204,
    });
    try {
      f.open();
      await vi.waitFor(() => expect(f.input.getAttribute("aria-activedescendant")).not.toBeNull());
      f.search("g");
      await new Promise(resolve => setTimeout(resolve, 350));
      expect(f.searches()).toHaveLength(0);
      f.search("gar");
      f.search("garden");
      expect(f.searches()).toHaveLength(0);
      await vi.waitFor(() => expect(f.rows()).toHaveLength(1));
      const searches = f.searches();
      expect(searches.map(query => query.get("query"))).toEqual(["garden"]);
      expect(searches[0]?.get("scope") ?? "all").toBe("all");
      expect(searches[0]?.get("limit")).toBe("6");
      expect(searches[0]?.get("recoveryGeneration")).toBe(f.generation);
      const row = f.rows()[0]!;
      expect(row.querySelector(".kl-finder-result-title")?.textContent).toBe(peer.name);
      expect(row.querySelector(".kl-finder-result-detail")?.textContent).toBe(peer.reasons[0]);
      expect(row.querySelector(".kl-finder-result-category")?.textContent).toBe("Matching");
      expect(row.querySelector("b")).toBeNull();
      expect(row.querySelector("i")).toBeNull();
      expect(row.textContent).not.toContain(peer.note);
      expect(row.textContent).not.toContain(peer.reasons[1]);
      expect(f.request.mock.calls.some(([, path]) => path.startsWith("/v1/matching/people/202?"))).toBe(false);
      row.click();
      const why = () => f.root.querySelector<HTMLDialogElement>('.kl-matching-page dialog[open][data-layout="why"]');
      await vi.waitFor(() => expect(why()?.textContent).toContain("Garden friend updated"));
      expect(f.dialog.open).toBe(false);
      expect(f.root.querySelector<HTMLElement>(".kl-panel")!.dataset.workspace).toBe("matching");
      expect(why()?.textContent).not.toContain(peer.name);
      expect(f.request.mock.calls.filter(([, path]) => path.startsWith("/v1/matching/"))
        .every(([method]) => method === "GET")).toBe(true);
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("keeps Finder Matching results current when queries race or access changes", async () => {
    const oak = finderCandidate(202, "Oak friend");
    const fern = finderCandidate(203, "Fern friend");
    let finishOak!: (rows: MatchCandidate[]) => void;
    const oakResponse = new Promise<MatchCandidate[]>(resolve => { finishOak = resolve; });
    const f = await matchingFinderContext({
      people: query => query === "oak" ? oakResponse : query === "fern" ? [fern] : [],
    });
    try {
      f.open();
      await vi.waitFor(() => expect(f.input.getAttribute("aria-activedescendant")).not.toBeNull());
      f.search("oak");
      await vi.waitFor(() => expect(f.searches().map(query => query.get("query"))).toEqual(["oak"]));
      f.search("fern");
      await vi.waitFor(() => expect(f.rows().map(row => row.querySelector(".kl-finder-result-title")?.textContent))
        .toEqual([fern.name]));
      finishOak([oak]);
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(f.rows().map(row => row.querySelector(".kl-finder-result-title")?.textContent)).toEqual([fern.name]);
      f.cloud.rememberBlock(203, true);
      expect(f.rows()).toHaveLength(0);
      expect(f.dialog.open).toBe(true);
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("ranks People and resources together under one six-result Finder limit", async () => {
    const groups = [finderResource("groups", "Garden group", 88), finderResource("groups", "Lower group", 45)];
    const rooms = [finderResource("rooms", "Garden room", 99), finderResource("rooms", "Blocked room", 100, 290)];
    const events = [
      finderResource("events", "Garden event", 94),
      { ...finderResource("events", "Hidden event", 100), hidden: true },
    ];
    const resources = { groups, rooms, events };
    const f = await matchingFinderContext({
      people: () => [
        { ...finderCandidate(202, "Garden friend"), score: 92 },
        { ...finderCandidate(203, "Shared hobby"), score: 90 },
        { ...finderCandidate(204, "Another friend"), score: 70 },
        { ...finderCandidate(205, "Lower friend"), score: 40 },
      ],
      resources: kind => resources[kind],
      blocked: member => member === 290,
    });
    try {
      f.open();
      f.search("garden");
      await vi.waitFor(() => expect(f.rows()).toHaveLength(6));
      expect(f.rows().map(row => [
        row.querySelector(".kl-finder-result-title")?.textContent,
        row.querySelector(".kl-finder-result-icon svg")?.getAttribute("data-icon"),
      ])).toEqual([
        ["Garden room", "door"],
        ["Garden event", "calendar"],
        ["Garden friend", "heart"],
        ["Shared hobby", "heart"],
        ["Garden group", "users"],
        ["Another friend", "heart"],
      ]);
      expect(f.rows().map(row => row.querySelector(".kl-finder-result-category")?.textContent))
        .toEqual(Array(6).fill("Matching"));
      const resourceReads = f.request.mock.calls.filter(([, path]) => /^\/v1\/matching\/resources\/(groups|rooms|events)\?/.test(path))
        .map(([, path]) => new URL(path, f.cloud.origin));
      expect(resourceReads.map(url => url.pathname.split("/").pop()).sort()).toEqual(["events", "groups", "rooms"]);
      for (const { searchParams } of resourceReads) {
        expect(searchParams.get("query")).toBe("garden");
        expect(searchParams.get("limit")).toBe("6");
        expect(searchParams.get("recoveryGeneration")).toBe(f.generation);
      }
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it.each([
    ["groups", "Groups"],
    ["rooms", "Rooms"],
    ["events", "Events"],
  ] as const)("opens a freshly authorized Finder explanation for %s", async (kind, tab) => {
    const suggestion = finderResource(kind, "Shared garden", 99);
    const savedBrowse = JSON.stringify({ type: "people", filters: { ...DEFAULT_MATCH_FILTERS, query: "Old search", scope: "saved" } });
    const f = await matchingFinderContext({
      people: () => [],
      resources: (type, query) => type === kind && query === "garden" ? [suggestion] : [],
      savedBrowse,
      resource: (type, id) => {
        expect(type).toBe(kind);
        expect(id).toBe(suggestion.id);
        return { ...suggestion, title: "Shared place updated" };
      },
    });
    try {
      f.open();
      f.search("garden");
      await vi.waitFor(() => expect(f.rows()).toHaveLength(1));
      const row = f.rows()[0]!;
      expect(row.querySelector(".kl-finder-result-detail")?.textContent).toBe(suggestion.reasons[0]);
      expect(row.textContent).not.toContain(suggestion.description);
      expect(row.textContent).not.toContain(suggestion.reasons[1]);
      const detailPath = `/v1/matching/resources/${kind}/${suggestion.id}?`;
      expect(f.request.mock.calls.some(([, path]) => path.startsWith(detailPath))).toBe(false);
      row.click();
      const matching = f.root.querySelector<HTMLElement>(".kl-matching-page")!;
      const why = () => matching.querySelector('dialog[open][data-layout="resource-why"]');
      await vi.waitFor(() => expect(why()?.textContent).toContain("Shared place updated"));
      expect(f.dialog.open).toBe(false);
      expect(f.root.querySelector<HTMLElement>(".kl-panel")!.dataset.workspace).toBe("matching");
      expect(matching.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe(tab);
      expect(f.storage.getItem(f.browseKey)).toBe(savedBrowse);
      expect(f.request.mock.calls.filter(([, path]) => path.startsWith(detailPath))).toHaveLength(1);
      expect(f.request.mock.calls.filter(([, path]) => path.startsWith("/v1/matching/"))
        .every(([method]) => method === "GET")).toBe(true);
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("does not show a Finder explanation for a room hidden before the detail read", async () => {
    const suggestion = finderResource("rooms", "Garden room", 99);
    const f = await matchingFinderContext({
      people: () => [],
      resources: (kind, query) => kind === "rooms" && query === "garden" ? [suggestion] : [],
      resource: () => ({ ...suggestion, title: "Hidden room detail", hidden: true }),
    });
    try {
      f.open();
      f.search("garden");
      await vi.waitFor(() => expect(f.rows()).toHaveLength(1));
      f.rows()[0]!.click();
      const detailPath = `/v1/matching/resources/rooms/${suggestion.id}?`;
      await vi.waitFor(() => expect(f.request.mock.calls.some(([, path]) => path.startsWith(detailPath))).toBe(true));
      const resources = f.root.querySelector(".kl-match-resources")!;
      await vi.waitFor(() => expect(resources.getAttribute("aria-busy")).toBe("false"));
      expect(resources.querySelector('dialog[open][data-layout="resource-why"]')).toBeNull();
      expect(resources.textContent).not.toContain("Hidden room detail");
    } finally { f.view.destroy(); f.cloud.destroy(); }
  });

  it("preserves Overview tool actions and their icons when settings change", async () => {
    const f = await setup();
    try {
      f.area("home").click(); f.route("home").click();
      const overview = f.root.querySelector<HTMLElement>('.kl-home--overview[aria-label="Home overview"]')!;
      expect(overview.querySelectorAll(".kl-home-card-cta > svg[aria-hidden=true]")).toHaveLength(5);
      const players = [...overview.querySelectorAll<HTMLButtonElement>(".kl-feature-card")]
        .find(card => card.querySelector(".kl-feature-card-title")?.textContent === "Players")!;
      const action = players.querySelector(".kl-feature-card-action")!;
      const arrow = players.querySelector(".kl-home-card-cta > svg")!;
      expect(action.textContent).toBe("View players");
      f.settings.update(draft => { draft.linkRoster.enabled = false; });
      await vi.waitFor(() => expect(action.textContent).toBe("Turn on Players"));
      expect(players.querySelector(".kl-home-card-cta > svg")).toBe(arrow);
      overview.querySelector<HTMLButtonElement>(".kl-feature-card--primary")!.click();
      expect(f.route("direct").getAttribute("aria-current")).toBe("page");
    } finally { f.view.destroy(); }
  });

  it("filters Direct in place and retains room sharing and emoji insertion in the compact composer", async () => {
    const f = await setup();
    try {
      const sentAt = Date.now();
      await f.service.capture({ direction: "incoming", peerNumber: 202, peerName: "Anna", content: "Unread message", includeRoom: false, sentAt }, false);
      await f.service.capture({ direction: "incoming", peerNumber: 303, peerName: "Mina", content: "Read message", includeRoom: false, sentAt }, true);
      f.area("chat").click(); f.route("direct").click();
      const page = f.root.querySelector(".kl-chat-page")!;
      const query = <T extends HTMLElement = HTMLElement>(selector: string) => page.querySelector<T>(selector)!;
      expect(query("h1").textContent).toBe("Direct");
      expect(query('[aria-label="New message"]').hidden).toBe(false);
      expect(page.querySelector('[aria-label="Filter chats"]')).toBeNull();
      await vi.waitFor(() => expect(page.querySelectorAll(".kl-chat-list-row")).toHaveLength(2));
      query<HTMLInputElement>(".kl-chat-unread-only input").click();
      await vi.waitFor(() => expect(page.querySelectorAll(".kl-chat-list-row")).toHaveLength(1));
      expect(query(".kl-conversation").dataset.memberNumber).toBe("202");
      const conversationOptions = query<HTMLButtonElement>(".kl-chat-row-options");
      conversationOptions.click();
      const conversationMenu = f.root.querySelector<HTMLDialogElement>(".kl-chat-options-menu[open]")!;
      expect(conversationMenu.getAttribute("aria-label")).toBe("Conversation options");
      expect(conversationMenu.querySelector('[role="menuitem"]')?.textContent).toBe("Pin conversation");
      conversationMenu.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      expect(conversationOptions.getAttribute("aria-expanded")).toBe("false");
      await f.view.openChat(202, "Anna");
      const composer = query<HTMLTextAreaElement>(".kl-composer-input");
      expect(composer.getAttribute("aria-label")).toBe("Message Anna");
      expect(query(".kl-chat-message-avatar-button").getAttribute("aria-label")).toBe("Open profile for Anna");
      expect(query<HTMLButtonElement>(".kl-send").disabled).toBe(true);
      const tools = query<HTMLButtonElement>(".kl-chat-composer-tools");
      const action = (name: string) => [...f.root.querySelectorAll<HTMLButtonElement>(".kl-shell-menu-item")]
        .find(button => button.textContent === name)!;
      const shareWasEnabled = f.settings.get().linkChat.includeRoomByDefault;
      tools.click(); action("Share current room").click();
      expect(f.settings.get().linkChat.includeRoomByDefault).toBe(!shareWasEnabled);
      tools.click();
      expect(f.root.querySelectorAll(".kl-chat-emoji-grid img")).toHaveLength(16);
      action("🌸").click();
      expect(composer.value).toBe("🌸");
      expect(query<HTMLButtonElement>(".kl-send").disabled).toBe(false);
    } finally { f.view.destroy(); }
  });

  it("keeps Direct rows connected on refresh and only moves or removes changed rows", async () => {
    const f = await setup();
    try {
      const now = Date.now();
      const add = (peerNumber: number, peerName: string, sentAt: number, content: string) =>
        f.service.capture({ direction: "incoming", peerNumber, peerName, content, sentAt, includeRoom: false }, false);
      await add(202, "Anna", now, "First message");
      await add(303, "Mina", now - 1_000, "Second message");
      await add(404, "Reina", now - 2_000, "Third message");
      f.area("chat").click();
      await f.view.refresh();

      const list = f.root.querySelector<HTMLElement>(".kl-conversations")!;
      const rows = Array.from(list.children);
      const [anna, mina, reina] = rows;
      expect(rows).toHaveLength(3);
      const options = mina!.querySelector<HTMLButtonElement>(".kl-chat-row-options")!;
      const avatar = mina!.querySelector(".kl-avatar");
      list.scrollTop = 23;
      options.focus();
      const replace = vi.spyOn(list, "replaceChildren");
      const insert = vi.spyOn(list, "insertBefore");

      await f.view.refresh();
      expect(replace).not.toHaveBeenCalled();
      expect(insert).not.toHaveBeenCalled();
      expect(Array.from(list.children)).toEqual(rows);
      expect(f.root.activeElement).toBe(options);
      expect(list.scrollTop).toBe(23);

      await add(404, "Reina", now + 1_000, "New message moves Reina first");
      await f.view.refresh();
      expect(Array.from(list.children)).toEqual([reina, anna, mina]);
      expect(insert.mock.calls.map(([node]) => node)).toEqual([reina]);
      expect(reina!.textContent).toContain("New message moves Reina first");
      expect(f.root.activeElement).toBe(options);

      await f.service.togglePinned(303);
      await f.view.refresh();
      expect(Array.from(list.children)).toEqual([mina, reina, anna]);
      expect(insert.mock.calls.map(([node]) => node)).toEqual([reina, mina]);
      expect(mina!.querySelector(".kl-avatar")).toBe(avatar);
      expect(f.root.activeElement).toBe(options);

      const search = f.root.querySelector<HTMLInputElement>(".kl-chat-page input[type='search']")!;
      search.value = "Reina";
      search.dispatchEvent(new Event("input", { bubbles: true }));
      await vi.waitFor(() => expect(Array.from(list.children)).toEqual([reina]));
      expect(insert.mock.calls.map(([node]) => node)).toEqual([reina, mina]);
    } finally { f.view.destroy(); }
  });

  it("saves top-level Navigation choices without losing individual sections or restoring a hidden start area", async () => {
    const navigation = new MemoryKeyValueStorage(), persistent = new MemoryKeyValueStorage();
    const f = await setup(navigation, ["music"], undefined, undefined, persistent);
    try {
      f.settings.update(draft => { draft.ui.hiddenTabs.push("chat"); });
      f.area("settings").click();
      f.root.querySelector<HTMLButtonElement>('[role="tab"][data-section="navigation"]')!.click();
      const panel = f.root.querySelector<HTMLElement>("#kikilink-settings-panel-navigation")!;
      const areas = [...panel.querySelectorAll<HTMLInputElement>("[data-navigation-area]")];
      expect(areas.map(toggle => toggle.getAttribute("aria-label"))).toEqual(["Feed", "Chat", "Explore", "Workshop", "Game", "You"]);
      expect(areas.find(control => control.dataset.navigationArea === "chat")!.checked).toBe(false);
      const change = (control: HTMLInputElement | HTMLSelectElement) => control.dispatchEvent(new Event("change"));
      for (const toggle of areas) { toggle.checked = false; change(toggle); }
      expect(areas.every(toggle => f.area(toggle.dataset.navigationArea!).hidden)).toBe(true);
      expect(f.area("home").hidden).toBe(false);
      expect(f.area("settings").hidden).toBe(false);
      const start = panel.querySelector<HTMLSelectElement>('[data-setting="launcher-open"]')!;
      expect([...start.options].map(option => option.textContent)).toEqual(["Last selection", "Home", "Chat", "Explore"]);
      expect(start.querySelector<HTMLOptionElement>('option[value="explore"]')!.disabled).toBe(true);
      expect(panel.querySelector("details")?.open).toBe(false);
      expect(panel.querySelector<HTMLInputElement>('[data-navigation-tab="music"]')!.checked).toBe(false);
      const explore = areas.find(control => control.dataset.navigationArea === "explore")!;
      explore.checked = true; change(explore);
      start.value = "explore"; change(start);
      expect(explore.disabled).toBe(true);
      f.view.close(); await f.view.open();
      expect(f.route("discover").getAttribute("aria-current")).toBe("page");
      f.area("settings").click();
      start.value = "last"; change(start);
      expect(explore.disabled).toBe(false);
      explore.checked = false; change(explore);
      expect(f.settings.get().ui.hiddenTabs).toEqual(expect.arrayContaining(["chat", "music", "explore", "create", "game", "you"]));
      // A previous session can leave a route that was later hidden on this account.
      navigation.setItem("kikilink:platform:last-route:v1", "discover");
    } finally { f.view.destroy(); }
    expect(new SettingsStore(persistent).get().ui.hiddenTabs).toEqual(expect.arrayContaining(["chat", "music", "explore", "create", "game", "you"]));
    const restored = await setup(navigation);
    try {
      restored.settings.update(draft => { draft.ui.hiddenTabs = ["explore"]; });
      restored.view.close(); await restored.view.open();
      expect(restored.area("home").getAttribute("aria-current")).toBe("page");
      expect(restored.area("explore").hidden).toBe(true);
    } finally { restored.view.destroy(); }
  });

  it("saves inline settings and keeps categories across navigation without a global save bar", async () => {
    const f = await setup();
    try {
      f.settings.update(d => { d.ui.settingsSection = "activities"; }); f.area("settings").click();
      const page = f.root.querySelector<HTMLElement>(".kl-settings-page")!;
      const sidebar = f.root.querySelector<HTMLElement>('.kl-platform-context[data-area="settings"]')!;
      const tabs = [...sidebar.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
      expect(sidebar.hidden).toBe(false);
      expect(tabs.map(t => t.textContent)).toEqual(["General", "Navigation", "Chat & media", "Alerts", "Game", "Data & about", "Cloud", "Sessions", "Privacy", "Moderation", "My reports", "Activity log"]);
      expect(tabs[4]?.getAttribute("aria-selected")).toBe("true"); expect(page.querySelector('.kl-settings-actions')).toBeNull();
      expect(page.querySelector('input[type="checkbox"][aria-label="Show Blossom above characters"]')?.closest('[role="tabpanel"]')?.id).toBe("kikilink-settings-panel-navigation");
      tabs[0]!.click(); const time = page.querySelector<HTMLSelectElement>('[data-setting="time-format"]')!;
      time.value = "24-hour"; time.dispatchEvent(new Event("change", { bubbles: true }));
      expect(f.settings.get().ui.timeFormat).toBe("24-hour");
      tabs[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
      expect(tabs[11]?.getAttribute("aria-selected")).toBe("true");
      const options = sidebar.querySelector<HTMLButtonElement>('[aria-label="Settings options"]')!;
      options.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      const sections = f.root.querySelector<HTMLDialogElement>('.kl-shell-menu[aria-label="Settings sections"]')!;
      const navigation = [...sections.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')]
        .find(item => item.textContent === "Navigation")!;
      expect(sections.querySelector('[aria-checked="true"]')?.textContent).toBe("Activity log");
      navigation.click();
      expect(sections.open).toBe(false);
      expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
      f.area("game").click(); f.route("music").click(); f.area("settings").click();
      expect(time.value).toBe("24-hour"); expect(f.settings.get().ui.timeFormat).toBe("24-hour");
    } finally { f.view.destroy(); }
  });

  it("keeps account pages in Settings and restores the last page without changing the stable settings schema", async () => {
    const storage=new MemoryKeyValueStorage(), f=await setup(storage);
    f.area('settings').click();f.root.querySelector<HTMLButtonElement>('[data-section="audit"]')!.click();
    expect(f.root.querySelector('.kl-account-settings')?.textContent).toContain('No recorded actions');
    expect(f.settings.get().schemaVersion).toBe(30);f.view.destroy();
    const next=await setup(storage);
    try { next.area('settings').click();expect(next.root.querySelector('[data-section="audit"]')?.getAttribute('aria-selected')).toBe('true'); }
    finally { next.view.destroy(); }
  });

  it("retains invalid numeric input while independent changes save against current settings", async () => {
    const f = await setup();
    try {
      f.area("settings").click(); const page = f.root.querySelector<HTMLElement>(".kl-settings-page")!;
      const tab = (id: string) => f.root.querySelector<HTMLButtonElement>(`[data-section="${id}"]`)!.click();
      const retention = page.querySelector<HTMLInputElement>('[aria-label="Message retention in days"]')!;
      tab("about"); retention.value = "0"; retention.dispatchEvent(new Event("change"));
      expect(retention.getAttribute("aria-invalid")).toBe("true"); expect(f.settings.get().linkChat.retentionDays).toBe(90);
      tab("navigation"); const size = page.querySelector<HTMLInputElement>('[aria-label="Launcher size in pixels"]')!;
      size.value = "72"; size.dispatchEvent(new Event("change"));
      expect(f.settings.get().ui.launcherSize).toBe(72); expect(retention.value).toBe("0");
      f.settings.update(d => { d.ui.notificationsMutedUntil = -1; d.linkPresence.bio = "Saved elsewhere"; });
      tab("about"); retention.value = "180"; retention.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect(f.settings.get().linkChat.retentionDays).toBe(180); expect(retention.hasAttribute("aria-invalid")).toBe(false);
      expect(f.settings.get().linkPresence.bio).toBe("Saved elsewhere"); expect(f.settings.get().ui.notificationsMutedUntil).toBe(-1);
      f.area("game").click(); retention.value="30"; retention.dispatchEvent(new Event("change"));
      expect(f.settings.get().linkChat.retentionDays).toBe(180);
      f.area("settings").click(); tab("about"); retention.value="0";retention.dispatchEvent(new Event("change"));
      f.area("game").click();f.area("settings").click();expect(retention.value).toBe("0");expect(retention.hasAttribute("aria-invalid")).toBe(true);
    } finally { f.view.destroy(); }
  });

  it("keeps compound edits explicit and never commits a partial rule with another field", async () => {
    const f = await setup();
    try {
      f.area("settings").click(); const page = f.root.querySelector<HTMLElement>(".kl-settings-page")!;
      const button=(name:string)=>[...page.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent===name)!;
      f.root.querySelector<HTMLButtonElement>('[data-section="chat"]')!.click(); const before=f.settings.get().linkChat.quickActions;
      button("Add quick action").click();
      const dialog=page.querySelector<HTMLDialogElement>('.kl-settings-quick-dialog')!;
      const nameField=dialog.querySelector<HTMLInputElement>('[aria-label="Name"]')!;
      nameField.value="Hello"; nameField.dispatchEvent(new Event("input"));
      expect(dialog.textContent).toContain("Enter some text.");
      expect([...dialog.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==="Save")!.disabled).toBe(true);
      button("Cancel").click(); button("Discard").click();
      f.root.querySelector<HTMLButtonElement>('[data-section="appearance"]')!.click();
      const time=page.querySelector<HTMLSelectElement>('[data-setting="time-format"]')!;time.value="24-hour";time.dispatchEvent(new Event('change'));
      expect(f.settings.get().linkChat.quickActions).toEqual(before);
      expect(page.querySelectorAll('.kl-settings-quick-row')).toHaveLength(before.length);
      f.root.querySelector<HTMLButtonElement>('[data-section="reactions"]')!.click();button("+ Add event rule").click();
      const name=page.querySelector<HTMLInputElement>('[aria-label="Reaction rule name"]')!;name.value="";button("Save event rules").click();
      expect(f.settings.get().linkReactions.rules).toEqual([]);expect(f.root.activeElement).toBe(name);
    } finally { f.view.destroy(); }
  });

  it("reports a failed persistent write and retries without falsely applying a theme", async () => {
    const f = await setup();
    try {
      f.area("settings").click();const page=f.root.querySelector<HTMLElement>('.kl-settings-page')!;
      const theme=page.querySelector<HTMLSelectElement>('[aria-label="Theme"]')!;
      const original=f.settings.update.bind(f.settings);
      vi.spyOn(f.settings,'update').mockImplementationOnce(()=>{throw new Error('quota');});
      theme.value="light";theme.dispatchEvent(new Event('change'));
      expect(f.settings.get().ui.theme).toBe('dark');expect(theme.value).toBe('light');
      expect(theme.closest('.kl-setting-row')?.textContent).toContain('Couldn’t save');
      f.settings.update=original;[...theme.closest('.kl-setting-row')!.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='Retry')!.click();
      expect(f.settings.get().ui.theme).toBe('light');expect(theme.hasAttribute('aria-invalid')).toBe(false);
    } finally { f.view.destroy(); }
  });

  it("confirms defaults and preserves profile, media, history and compound editor data", async () => {
    const f = await setup();
    try {
      f.settings.update(s=>{s.ui.theme='light';s.linkPresence.bio='Keep';s.linkChat.retentionDays=180;s.linkChat.imagePreviews='never';s.linkReactions.sounds.chat='custom:keep';});
      f.area('settings').click();const restore=f.root.querySelector<HTMLButtonElement>('.kl-settings-restore')!;restore.click();
      const dialog=f.root.querySelector<HTMLDialogElement>('.kl-content-dialog[open]')!;
      const button=(name:string)=>[...dialog.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent===name)!;
      button('Cancel').click();expect(f.settings.get().ui.theme).toBe('light');restore.click();button('Restore defaults').click();
      expect(f.settings.get().ui.theme).toBe('dark');expect(f.settings.get().linkPresence.bio).toBe('Keep');
      expect(f.settings.get().linkChat).toMatchObject({retentionDays:180,imagePreviews:'never'});expect(f.settings.get().linkReactions.sounds.chat).toBe('custom:keep');
    } finally { f.view.destroy(); }
  });

  it("reverts a failed media toggle together with its dependent controls", async () => {
    const f=await setup();
    try {
      f.settings.update(s=>{s.linkChat.imageUploads.enabled=false;});
      f.area('settings').click(); f.root.querySelector<HTMLButtonElement>('[data-section="chat"]')!.click();
      const toggle=f.root.querySelector<HTMLInputElement>('[aria-label="Share local files"]')!;
      const lifetime=f.root.querySelector<HTMLSelectElement>('[aria-label="Temporary links expire"]')!;
      expect(toggle.checked).toBe(false); expect(lifetime.disabled).toBe(true);
      vi.spyOn(f.settings,'update').mockImplementationOnce(()=>{throw new Error('quota');});
      toggle.checked=true; toggle.dispatchEvent(new Event('change'));
      expect(f.settings.get().linkChat.imageUploads.enabled).toBe(false); expect(lifetime.disabled).toBe(false);
      [...toggle.closest('.kl-setting-row')!.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='Revert')!.click();
      expect(toggle.checked).toBe(false); expect(lifetime.disabled).toBe(true); expect(toggle.hasAttribute('aria-invalid')).toBe(false);
    } finally { f.view.destroy(); }
  });

  it("validates hex colour without changing the palette and applies exact prototype presets", async () => {
    const f=await setup();
    try {
      f.area('settings').click();const page=f.root.querySelector<HTMLElement>('.kl-settings-page')!;
      const hex=page.querySelector<HTMLInputElement>('[aria-label="Custom accent hex"]')!;
      hex.value='#123';hex.dispatchEvent(new Event('change'));expect(hex.getAttribute('aria-invalid')).toBe('true');expect(f.settings.get().ui.accent).toBe('#d71932');
      hex.value='#4BAAA3';hex.dispatchEvent(new Event('change'));expect(f.settings.get().ui.accent).toBe('#4baaa3');expect(hex.hasAttribute('aria-invalid')).toBe(false);
      hex.value='invalid';hex.dispatchEvent(new Event('change'));
      page.querySelector<HTMLButtonElement>('[aria-label="Use Rose accent"]')!.click();expect(f.settings.get().ui.accent).toBe('#e85f88');expect(hex.value).toBe('#e85f88');expect(hex.hasAttribute('aria-invalid')).toBe(false);
      page.querySelector<HTMLButtonElement>('[aria-label="Restore default accent colour"]')!.click();expect(f.settings.get().ui.accent).toBe('#d71932');
    } finally { f.view.destroy(); }
  });

  it("adds local sounds without silently selecting them and ignores a late result after destroy", async () => {
    const saved: DeviceNotificationSound[]=[];
    const pending: Array<(sound: DeviceNotificationSound)=>void>=[];
    const store: NotificationSoundStore={list:vi.fn(async()=>saved),get:vi.fn(),add:vi.fn(()=>new Promise<DeviceNotificationSound>(resolve=>pending.push(resolve))),delete:vi.fn(),close:vi.fn()};
    const f=await setup(undefined,[],store);
    try {
      f.area('settings').click(); f.root.querySelector<HTMLButtonElement>('[data-section="reactions"]')!.click();
      const fileInput=f.root.querySelector<HTMLInputElement>('input[type="file"][accept="audio/*"]')!;
      const select=f.root.querySelector<HTMLSelectElement>('[aria-label="Chat notification sound"]')!;
      const soundRow = select.closest('.kl-settings-incoming-sound')!;
      expect(soundRow.querySelector('button[aria-label="Preview incoming chat sound"]')).toBeTruthy();
      const openFilePicker = vi.spyOn(fileInput, 'click').mockImplementation(() => {});
      soundRow.querySelector<HTMLButtonElement>('button[aria-label="Upload a local notification sound"]')!.click();
      expect(openFilePicker).toHaveBeenCalledOnce();
      const file=new File(['fixture'],'sample.wav',{type:'audio/wav'});
      Object.defineProperty(fileInput,'files',{configurable:true,value:[file]}); fileInput.dispatchEvent(new Event('change'));
      select.value='pop';select.dispatchEvent(new Event('change'));
      const sound:DeviceNotificationSound={id:'test-added',name:'Sample',mimeType:file.type,durationMs:100,createdAt:Date.now(),blob:file};
      saved.push(sound);pending.shift()!(sound);
      await vi.waitFor(()=>expect([...select.options].some(o=>o.value==='custom:test-added')).toBe(true));
      expect(select.value).toBe('pop');expect(f.settings.get().linkReactions.sounds.chat).toBe('pop');
      select.value='custom:test-added';select.dispatchEvent(new Event('change'));expect(f.settings.get().linkReactions.sounds.chat).toBe('custom:test-added');
      fileInput.dispatchEvent(new Event('change'));f.view.destroy();const lists=vi.mocked(store.list).mock.calls.length;
      pending.shift()!(sound);await Promise.resolve();expect(store.list).toHaveBeenCalledTimes(lists);
      expect(f.settings.get().linkReactions.sounds.chat).toBe('custom:test-added');
    } finally { f.view.destroy(); }
  });

  it("preserves a missing custom sound and a choice made while its list loads", async () => {
    const resolvers: Array<(sounds: DeviceNotificationSound[]) => void> = [];
    const store = { list: vi.fn(() => new Promise<DeviceNotificationSound[]>(resolve => resolvers.push(resolve))), get: vi.fn(), add: vi.fn(), delete: vi.fn(), close: vi.fn() } as NotificationSoundStore;
    const f = await setup(undefined, [], store);
    try {
      f.settings.update(s=>{s.linkReactions.sounds.chat='custom:previous';}); f.area("settings").click();
      const page=f.root.querySelector<HTMLElement>('.kl-settings-page')!,select = page.querySelector<HTMLSelectElement>('[aria-label="Chat notification sound"]')!;
      const time=page.querySelector<HTMLSelectElement>('[data-setting="time-format"]')!;time.value='24-hour';time.dispatchEvent(new Event('change'));
      expect(f.settings.get().linkReactions.sounds.chat).toBe('custom:previous');
      f.root.querySelector<HTMLButtonElement>('[data-section="reactions"]')!.click();
      select.value = "pop"; select.dispatchEvent(new Event("change"));resolvers.shift()!([]); await Promise.resolve();
      expect(select.value).toBe("pop");expect(f.settings.get().linkReactions.sounds.chat).toBe('pop');
    } finally { f.view.destroy(); }
  });

  it("opens You over the current workspace and restores its route and focus after editing", async () => {
    const f = await setup();
    try {
      f.area("game").click(); f.route("music").click();
      const trigger = f.area("you");
      const profile = f.root.querySelector<HTMLDialogElement>(".kl-addon-profile-dialog")!;
      const editor = f.root.querySelector<HTMLDialogElement>(".kl-presence-dialog")!;
      trigger.focus(); trigger.click();
      await vi.waitFor(() => expect(profile.querySelector(".kl-addon-profile-card")).not.toBeNull());
      expect(profile.open).toBe(true);
      expect(f.storage.getItem("kikilink:platform:last-route:v1")).toBe("music");
      profile.querySelector<HTMLButtonElement>(".kl-profile-edit-link")!.click();
      expect(editor.open).toBe(true);
      expect(profile.open).toBe(true);
      editor.close();
      profile.querySelector<HTMLButtonElement>('[aria-label="Close KikiLink profile"]')!.click();
      await vi.waitFor(() => expect(f.root.activeElement).toBe(trigger));
      expect(profile.open).toBe(false);
      expect(f.root.querySelector<HTMLElement>(".kl-panel")!.dataset.workspace).toBe("music");
      expect(f.route("music").getAttribute("aria-current")).toBe("page");
    } finally { f.view.destroy(); }
  });

  it("opens My profile as a workspace and edits without losing fields across sections", async () => {
    const f = await setup();
    try {
      f.area("game").click(); f.route("music").click();
      f.route("profile").click();
      const card = f.root.querySelector<HTMLElement>(".kl-own-profile-page")!;
      await vi.waitFor(() => expect(card.querySelector('.kl-addon-profile-card')).not.toBeNull());
      expect(card.hidden).toBe(false);
      expect(f.root.querySelector<HTMLDialogElement>('.kl-addon-profile-dialog')!.open).toBe(false);
      expect(f.root.querySelector<HTMLElement>('.kl-panel')!.dataset.workspace).toBe('profile');
      expect(f.route('profile').getAttribute('aria-current')).toBe('page');
      expect(f.route('profile').hasAttribute('aria-haspopup')).toBe(false);
      const actions = card.querySelector('.kl-addon-profile-actions')!;
      expect([...actions.querySelectorAll(':scope > button')].map(button => button.getAttribute('aria-label') ?? button.textContent)).toEqual(['Edit profile', 'Copy member ID']);
      const options = actions.querySelector<HTMLDetailsElement>('details')!;
      expect(options.open).toBe(false);
      expect(options.textContent).toContain('Appearance');
      options.open = true;
      options.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(options.open).toBe(false);
      [...card.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === 'Edit profile')!.click();
      const dialog = f.root.querySelector<HTMLDialogElement>(".kl-presence-dialog")!;
      expect(dialog.open).toBe(true);
      expect([...dialog.querySelectorAll('.kl-presence-body > .kl-platform-profile-sections > [role="tablist"] > button')].map(button => button.textContent)).toEqual(['Basics', 'Appearance']);
      expect(card.hidden).toBe(false);
      expect(f.root.querySelector<HTMLElement>(".kl-panel")!.dataset.workspace).toBe("profile");
      expect(f.storage.getItem("kikilink:platform:last-route:v1")).toBe('profile');
      const bio = dialog.querySelector<HTMLTextAreaElement>('[aria-label="Public KikiLink profile bio"]')!;
      const save = dialog.querySelector<HTMLButtonElement>('.kl-dialog-actions .kl-text-button--primary')!;
      const hint = dialog.querySelector('.kl-profile-save-hint')!;
      const originalBio = bio.value;
      expect(save.disabled).toBe(true); expect(hint.textContent).toBe("Saved");
      bio.value = "Temporary draft"; bio.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
      expect(save.disabled).toBe(false); expect(hint.textContent).toBe("Unsaved changes");
      bio.value = originalBio; bio.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
      expect(save.disabled).toBe(true); expect(hint.textContent).toBe("Saved");
      bio.value = "Unsaved local bio";
      bio.dispatchEvent(new Event("input", { bubbles: true })); await Promise.resolve();
      const appearance = dialog.querySelector<HTMLButtonElement>('#kl-own-profile-tab-appearance')!;
      appearance.click();
      const avatar = dialog.querySelector<HTMLInputElement>('[aria-label="Direct profile avatar URL"]')!;
      avatar.value = 'https://example.test/draft-avatar.png';
      dialog.querySelector<HTMLButtonElement>('#kl-profile-appearance-tab-style')!.click();
      expect(dialog.querySelector('#kl-profile-appearance-panel-avatar')?.hasAttribute('hidden')).toBe(true);
      expect(dialog.querySelector('#kl-profile-appearance-panel-style')?.hasAttribute('hidden')).toBe(false);
      dialog.querySelector<HTMLButtonElement>('#kl-profile-appearance-tab-avatar')!.click();
      expect(dialog.querySelector('[aria-label="Direct profile avatar URL"]')).toBe(avatar);
      expect(avatar.value).toBe('https://example.test/draft-avatar.png');
      avatar.value = '';
      appearance.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      expect(dialog.querySelector('#kl-own-profile-tab-about')?.getAttribute("aria-selected")).toBe("true");
      f.route("profile").click();
      expect(bio.value).toBe("Unsaved local bio");
      expect(dialog.querySelector('textarea[aria-label="Public KikiLink profile bio"]')).toBe(bio);
      expect(dialog.querySelector('#kl-own-profile-panel-about')?.hasAttribute("hidden")).toBe(false);
      expect(dialog.querySelector('.kl-dialog-title')?.textContent).toBe("Edit profile");
      expect(f.root.querySelectorAll<HTMLDialogElement>(".kl-presence-dialog")).toHaveLength(1);
      const idle = dialog.querySelector<HTMLInputElement>('[aria-label="Minutes before automatic Idle"]')!;
      const availability = dialog.querySelector<HTMLDetailsElement>('.kl-profile-presence-controls')!;
      expect(availability.open).toBe(false);
      idle.value = "999";
      [...dialog.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Save changes")!.click();
      expect(dialog.querySelector('#kl-own-profile-tab-about')?.getAttribute("aria-selected")).toBe("true");
      expect(availability.open).toBe(true);
      expect(f.root.activeElement).toBe(idle);
      availability.open = false;
      card.querySelector<HTMLButtonElement>('.kl-addon-profile-status-control')!.click();
      expect(availability.open).toBe(true);
      expect(dialog.querySelector('[aria-label="Minutes before automatic Idle"]')).toBe(idle);
      expect(idle.value).toBe('999');
    } finally { f.view.destroy(); }
  });

  it('keeps the four Cloud profile editor sections and one owner Albums entry point', async () => {
    const cloud = new CloudClient({origin:'https://cloud.example.test',memberNumber:72385,getMemberNumber:()=>72385,isBlocked:()=>false,sendProof:vi.fn(),fetchImpl:vi.fn(async()=>Response.json({error:'fixture_offline'},{status:503}))});
    const f = await setup(undefined, [], undefined, cloud);
    try {
      f.route('profile').click();
      const page = f.root.querySelector<HTMLElement>('.kl-own-profile-page')!;
      await vi.waitFor(()=>expect(page.querySelector('.kl-addon-profile-card')).not.toBeNull());
      expect(page.querySelector('#kl-view-profile-tab-albums')).not.toBeNull();
      [...page.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent==='Edit profile')!.click();
      const dialog=f.root.querySelector<HTMLDialogElement>('.kl-presence-dialog')!;
      expect([...dialog.querySelectorAll('.kl-presence-body > .kl-platform-profile-sections > [role="tablist"] > button')].map(button=>button.textContent)).toEqual(['Basics','Appearance','Preferences','Privacy']);
      const name=dialog.querySelector<HTMLInputElement>('[aria-label="KikiLink display name"]')!;
      expect(name.closest('[data-profile-section]')?.getAttribute('data-profile-section')).toBe('about');
      expect(dialog.querySelector('.kl-albums')).toBeNull();
      expect(dialog.querySelector('.kl-profile-appearance-preview')?.closest('[data-profile-section]')?.getAttribute('data-profile-section')).toBe('appearance');
      dialog.querySelector<HTMLButtonElement>('#kl-own-profile-tab-appearance')!.click();
      dialog.querySelector<HTMLButtonElement>('#kl-own-profile-tab-about')!.click();
      expect(dialog.querySelector('[aria-label="KikiLink display name"]')).toBe(name);
    } finally { f.view.destroy(); cloud.destroy(); }
  });

  it("shows the owner's Matching signal in About and opens its editor from a saved Rooms catalog", async () => {
    const owner = 72385;
    const storage = new MemoryKeyValueStorage();
    const origin = "https://cloud.example.test";
    const key = `kikilink:matching-browse:${encodeURIComponent(origin)}:${owner}:v1`;
    const browse = JSON.stringify({ type: "rooms", filters: { ...DEFAULT_MATCH_FILTERS, query: "Garden", scope: "saved" } });
    storage.setItem(key, browse);
    const cloud = new CloudClient({ origin, memberNumber: owner, getMemberNumber: () => owner,
      isBlocked: () => false, sendProof: vi.fn(), fetchImpl: vi.fn() });
    vi.spyOn(cloud, "connected", "get").mockReturnValue(true);
    vi.spyOn(cloud, "retainEvents").mockReturnValue(() => {});
    const request = vi.spyOn(cloud, "request").mockImplementation(async (method, path) => {
      if (method !== "GET") throw new CloudError("read_only_fixture", 403);
      if (path === "/v1/me") return { memberNumber: owner, features: { matchingPeople: true, matchingResources: true } };
      if (path === "/v1/matching/me") return { owner, revision: 1, signal: { ...DEFAULT_MATCH_SIGNAL, published: true }, active: true, canPublish: true, serverNow: 1000 };
      if (path.startsWith("/v1/matching/resources/rooms?"))
        return { items: [], nextCursor: null, poolLimited: false, serverNow: 1000 };
      throw new CloudError("fixture_unavailable", 503);
    });
    const f = await setup(storage, [], undefined, cloud);
    try {
      f.route("profile").click();
      const page = f.root.querySelector<HTMLElement>(".kl-own-profile-page")!;
      const card = () => page.querySelector<HTMLElement>(".kl-profile-matching-signal:not([hidden])");
      await vi.waitFor(() => expect(card()?.querySelector("h3")?.textContent).toBe("Your matching signal"));
      expect(card()?.closest("[data-profile-section]")?.getAttribute("data-profile-section")).toBe("about");
      expect(card()?.textContent).toContain("Available");
      page.querySelector<HTMLButtonElement>("#kl-view-profile-tab-preferences")!.click();
      expect(card()).toBeNull();
      page.querySelector<HTMLButtonElement>("#kl-view-profile-tab-about")!.click();
      await vi.waitFor(() => expect(card()?.querySelector("button")?.textContent).toBe("My signal"));
      const audience = page.querySelector<HTMLSelectElement>('[aria-label="View profile as"]')!;
      audience.value = "everyone";
      audience.dispatchEvent(new Event("change"));
      expect(card()).toBeNull();
      const previewAudience = page.querySelector<HTMLSelectElement>('[aria-label="View profile as"]')!;
      previewAudience.value = "you";
      previewAudience.dispatchEvent(new Event("change"));
      await vi.waitFor(() => expect(card()?.querySelector("button")?.textContent).toBe("My signal"));
      card()!.querySelector("button")!.click();
      const matching = f.root.querySelector<HTMLElement>(".kl-matching-page")!;
      await vi.waitFor(() => expect(matching.querySelector('dialog[open][data-layout="signal-editor"] h2')?.textContent)
        .toBe("Your matching signal"));
      expect(f.root.querySelector<HTMLElement>(".kl-panel")!.dataset.workspace).toBe("matching");
      expect(matching.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe("Rooms");
      expect(storage.getItem(key)).toBe(browse);
      expect(request.mock.calls.filter(([, path]) => path.startsWith("/v1/matching/")).every(([method]) => method === "GET")).toBe(true);
    } finally { f.view.destroy(); cloud.destroy(); }
  });

  it('saves staged inline privacy without rewriting the Cloud profile', async () => {
    const owner = 72385;
    const cloud = new CloudClient({ origin: 'https://cloud.example.test', memberNumber: owner, getMemberNumber: () => owner,
      isBlocked: () => false, sendProof: vi.fn(), fetchImpl: vi.fn(async () => Response.json({ error: 'fixture_offline' }, { status: 503 })) });
    vi.spyOn(cloud, 'connected', 'get').mockReturnValue(true);
    vi.spyOn(cloud, 'profile').mockResolvedValue({ memberNumber: owner, displayName: 'Lilja', bio: '', statusMessage: '',
      visible: true, avatarFrame: 'none', profileStyle: 'classic', avatarId: null, bannerId: null, revision: 1, updatedAt: 1 });
    const request = vi.spyOn(cloud, 'request').mockImplementation(async (method, path, body) => {
      if (path === '/v1/me') return { memberNumber: owner, features: { profilePrivacy: true } };
      if (path === '/v1/privacy/me') return { memberNumber: owner, showOnline: true, about: 'everyone', ...body as object, revision: method === 'PATCH' ? 1 : 0 };
      return [];
    });
    const f = await setup(undefined, [], undefined, cloud);
    try {
      f.route('profile').click();
      const page = f.root.querySelector<HTMLElement>('.kl-own-profile-page')!;
      await vi.waitFor(() => expect(page.querySelector('.kl-addon-profile-card')).not.toBeNull());
      [...page.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Edit profile')!.click();
      const dialog = f.root.querySelector<HTMLDialogElement>('.kl-presence-dialog')!;
      dialog.querySelector<HTMLButtonElement>('#kl-own-profile-tab-privacy')!.click();
      const choice = () => dialog.querySelector<HTMLSelectElement>('[aria-label="About & personal details"]')!;
      await vi.waitFor(() => expect(choice()).not.toBeNull());
      choice().value = 'friends'; choice().dispatchEvent(new Event('change', { bubbles: true }));
      dialog.querySelector<HTMLButtonElement>('#kl-own-profile-tab-about')!.click();
      expect(choice().value).toBe('friends');
      expect(request.mock.calls.filter(([method]) => method === 'PATCH')).toHaveLength(0);
      dialog.querySelector<HTMLButtonElement>('.kl-dialog-actions .kl-text-button--primary')!.click();
      await vi.waitFor(() => expect(dialog.open).toBe(false));
      expect(request).toHaveBeenCalledWith('PATCH', '/v1/privacy/me', { about: 'friends', revision: 0 });
      expect(request.mock.calls.some(([method, path]) => method === 'PUT' && path === '/v1/profiles/me')).toBe(false);
    } finally { f.view.destroy(); cloud.destroy(); }
  });

  it('adapts an open profile preview to the viewport without losing the draft or an explicit preview choice', async () => {
    let visibleHeight = 768;
    const viewport = new EventTarget();
    Object.defineProperties(viewport, { height: { get: () => visibleHeight }, offsetTop: { value: 0 } });
    vi.stubGlobal('visualViewport', viewport);
    vi.stubGlobal('innerWidth', 1366);
    vi.stubGlobal('innerHeight', 768);
    const f = await setup();
    try {
      f.route('profile').click();
      const page = f.root.querySelector<HTMLElement>('.kl-own-profile-page')!;
      await vi.waitFor(() => expect(page.querySelector('.kl-addon-profile-card')).not.toBeNull());
      vi.spyOn(f.root.querySelector<HTMLElement>('.kl-panel')!, 'clientWidth', 'get').mockReturnValue(0);
      [...page.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Edit profile')!.click();
      const dialog = f.root.querySelector<HTMLDialogElement>('.kl-presence-dialog')!;
      dialog.querySelector<HTMLButtonElement>('#kl-own-profile-tab-appearance')!.click();
      const toggle = dialog.querySelector<HTMLButtonElement>('.kl-profile-preview-toggle')!;
      const preview = dialog.querySelector<HTMLElement>('.kl-profile-preview-content')!;
      const avatar = dialog.querySelector<HTMLInputElement>('[aria-label="Direct profile avatar URL"]')!;
      avatar.value = 'https://example.test/draft.png';
      expect(preview.hidden).toBe(false);

      const resize = (width: number, height: number) => {
        visibleHeight = height;
        vi.stubGlobal('innerWidth', width);
        vi.stubGlobal('innerHeight', height);
        window.dispatchEvent(new Event('resize'));
      };
      preview.querySelector<HTMLButtonElement>('.kl-profile-preview-choice')!.focus();
      resize(390, 844);
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(f.root.activeElement).toBe(toggle);
      resize(844, 390);
      expect(preview.hidden).toBe(true);
      resize(1366, 768);
      expect(preview.hidden).toBe(false);
      visibleHeight = 400;
      viewport.dispatchEvent(new Event('resize'));
      expect(preview.hidden).toBe(true);
      toggle.click();
      resize(390, 844);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(dialog.open).toBe(true);
      expect(avatar.value).toBe('https://example.test/draft.png');
    } finally { f.view.destroy(); vi.unstubAllGlobals(); }
  });

  it('keeps the saved desktop position and uses screen insets on a tablet and in short landscape', async () => {
    let visibleHeight = 768;
    const viewport = new EventTarget();
    Object.defineProperties(viewport, {
      height: { get: () => visibleHeight },
      offsetTop: { value: 0 },
      scale: { value: 1 },
    });
    vi.stubGlobal('visualViewport', viewport);
    vi.stubGlobal('innerWidth', 1366);
    vi.stubGlobal('innerHeight', 768);
    const f = await setup();
    try {
      const panel = f.root.querySelector<HTMLElement>('.kl-panel')!;
      const tabs = f.root.querySelector<HTMLElement>('.kl-settings-tabs')!;
      const position = { x: 0.25, y: 0.75 };
      f.settings.update(draft => { draft.ui.panelPosition = position; });
      f.area('settings').click();
      const resize = (width: number, height: number, panelWidth: number, panelHeight: number) => {
        vi.stubGlobal('innerWidth', width);
        vi.stubGlobal('innerHeight', height);
        visibleHeight = height;
        vi.spyOn(panel, 'clientWidth', 'get').mockReturnValue(panelWidth);
        vi.spyOn(panel, 'clientHeight', 'get').mockReturnValue(panelHeight);
        window.dispatchEvent(new Event('resize'));
      };

      resize(1366, 768, 1220, 658);
      const desktopPosition = panel.style.left;
      expect(desktopPosition).toMatch(/px$/);
      expect(tabs.getAttribute('aria-orientation')).toBe('vertical');
      resize(820, 1180, 802, 1162);
      expect(panel.style.left).toBe('');
      expect(panel.style.right).toBe('');
      expect(tabs.getAttribute('aria-orientation')).toBe('vertical');
      resize(844, 390, 826, 372);
      expect(tabs.getAttribute('aria-orientation')).toBe('horizontal');
      resize(390, 844, 372, 826);
      visibleHeight = 430;
      viewport.dispatchEvent(new Event('resize'));
      expect(f.root.host.getAttribute('data-keyboard-viewport')).toBe('true');
      expect((f.root.host as HTMLElement).style.getPropertyValue('--kl-visible-dialog-height')).toBe('414px');
      resize(1366, 768, 1220, 658);
      expect(f.root.host.getAttribute('data-keyboard-viewport')).toBe('false');
      expect(panel.style.left).toBe(desktopPosition);
      expect(panel.dataset.workspace).toBe('settings');
      expect(f.settings.getSection('ui').panelPosition).toEqual(position);
    } finally { f.view.destroy(); vi.unstubAllGlobals(); }
  });

  it('matches container breakpoints for conversation read gating and settings tabs', async () => {
    const f=await setup();
    try {
      const panel=f.root.querySelector<HTMLElement>('.kl-panel')!;
      let width=1024,height=768;
      vi.spyOn(panel,'clientWidth','get').mockImplementation(()=>width);
      vi.spyOn(panel,'clientHeight','get').mockImplementation(()=>height);
      for (const [w,h,mobile] of [[700,768,true],[701,768,false],[900,500,true],[900,501,false],[901,390,false],[844,390,true],[0,0,window.innerWidth<=700||(window.innerWidth<=900&&window.innerHeight<=500)]] as const) {
        width=w;height=h;
        await f.view.openChat(202,'Peer');
        expect(f.view.isActiveConversation(202)).toBe(true);
        f.root.querySelector<HTMLButtonElement>('.kl-back')!.click();
        expect(f.view.isActiveConversation(202)).toBe(!mobile);
        f.area('settings').click();
        expect(f.root.querySelector('.kl-settings-tabs')?.getAttribute('aria-orientation')).toBe(mobile?'horizontal':'vertical');
      }
    } finally { f.view.destroy(); }
  });

  it("restores My profile after a peer overlay and keeps one mounted profile body", async () => {
    const f=await setup();
    try {
      vi.spyOn(f.presence,'hasCompatiblePeer').mockReturnValue(true);
      await f.view.openChat(202,'Peer');
      const peerAvatar=f.root.querySelector<HTMLButtonElement>('.kl-chat-header > .kl-avatar')!;
      f.route('profile').click();
      const page=f.root.querySelector<HTMLElement>('.kl-own-profile-page')!,dialog=f.root.querySelector<HTMLDialogElement>('.kl-addon-profile-dialog')!;
      await vi.waitFor(()=>expect(page.querySelector('[data-member-number="72385"]')).not.toBeNull());
      const profileBody=page.querySelector('.kl-addon-profile-body');
      // This is the same profile-opening callback used by friends and conversations.
      peerAvatar.click();
      await vi.waitFor(()=>expect(dialog.querySelector('.kl-addon-profile-card[data-member-number="202"]')).not.toBeNull());
      expect(dialog.open).toBe(true);expect(f.root.querySelector<HTMLElement>('.kl-panel')!.dataset.workspace).toBe('profile');
      expect(dialog.querySelector('.kl-addon-profile-body')).toBe(profileBody);
      expect(f.root.querySelectorAll('.kl-addon-profile-body')).toHaveLength(1);
      dialog.close();
      await vi.waitFor(()=>expect(page.querySelector('.kl-addon-profile-card[data-member-number="72385"]')).not.toBeNull());
      expect(dialog.open).toBe(false);expect(page.querySelector('.kl-addon-profile-body')).toBe(profileBody);
      f.view.close();expect(page.querySelector('.kl-addon-profile-card')).toBeNull();
      await f.view.open();
      await vi.waitFor(()=>expect(page.querySelector('.kl-addon-profile-card[data-member-number="72385"]')).not.toBeNull());
      expect(f.root.querySelector<HTMLElement>('.kl-panel')!.dataset.workspace).toBe('profile');
    } finally { f.view.destroy(); }
  });

  it("discards a late profile read after navigation and does not reopen a modal", async () => {
    const f=await setup();
    try {
      let finish!:(value:undefined)=>void;
      vi.spyOn(f.service,'getConversation').mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
      f.route('profile').click();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
      f.area('game').click();f.route('music').click();finish(undefined);await Promise.resolve();await Promise.resolve();
      expect(f.root.querySelector<HTMLElement>('.kl-panel')!.dataset.workspace).toBe('music');
      expect(f.root.querySelector('.kl-own-profile-page .kl-addon-profile-card')).toBeNull();
      expect(f.root.querySelector<HTMLDialogElement>('.kl-addon-profile-dialog')!.open).toBe(false);
    } finally { f.view.destroy(); }
  });

  it("keeps a newer navigation choice when reopening finishes a delayed history refresh", async () => {
    const f = await setup();
    try {
      f.area("game").click(); f.route("presets").click();
      f.view.close();
      let release!: () => void;
      const pending = new Promise<void>(resolve => { release = resolve; });
      vi.spyOn(f.service, "listConversations").mockImplementationOnce(async () => { await pending; return []; });
      const opening = f.view.open();
      f.area("chat").click(); f.route("direct").click();
      release(); await opening;
      expect(f.root.querySelector<HTMLElement>(".kl-panel")!.dataset.workspace).toBe("chat");
      expect(f.route("direct").getAttribute("aria-current")).toBe("page");
      expect(f.storage.getItem("kikilink:platform:last-route:v1")).toBe("direct");
    } finally { f.view.destroy(); }
  });

  it("opens the existing Music, Activities and room screens instead of generating replacements", async () => {
    const f = await setup();
    try {
      f.area("game").click(); f.route("music").click();
      expect(f.root.querySelector<HTMLElement>(".kl-music-page")!.hidden).toBe(false);
      expect(f.root.querySelector<HTMLElement>(".kl-panel")!.dataset.workspace).toBe("music");
      f.route("activities").click();
      expect(f.root.querySelector<HTMLElement>(".kl-activities-page")!.hidden).toBe(false);
      f.route("presets").click();
      expect(f.root.querySelector<HTMLElement>(".kl-room-presets-panel")!.hidden).toBe(false);
      expect(f.root.querySelector(".kl-room-page .kl-feature-page-title")?.textContent).toBe("Room presets");
      expect(f.route("presets").getAttribute("aria-current")).toBe("page");
    } finally { f.view.destroy(); }
  });

  it.each(['lobbies', 'spaces', 'history', 'current'] as const)('restores the selected Rooms mode %s without another sidebar destination', async mode => {
    const storage = new MemoryKeyValueStorage(), first = await setup(storage);
    first.area('explore').click(); first.route('rooms').click();
    first.root.querySelector<HTMLButtonElement>(`#kl-rooms-${mode}`)!.click(); first.view.destroy();
    const second = await setup(storage);
    try {
      expect(second.root.querySelector(`#kl-rooms-${mode}`)?.getAttribute('aria-selected')).toBe('true');
      expect(second.route('rooms').getAttribute('aria-current')).toBe('page');
      expect(second.root.querySelectorAll('[data-route="spaces"],[data-route="lobbies"]')).toHaveLength(0);
      expect(second.root.querySelector<HTMLElement>('.kl-rooms-directory')!.hidden).toBe(false);
    } finally { second.view.destroy(); }
  });

  it.each(['lobbies','spaces'])('migrates the saved %s route to Rooms and preserves its mode', async mode => {
    const storage = new MemoryKeyValueStorage(); storage.setItem('kikilink:platform:last-route:v1', mode);
    storage.setItem('kikilink:launcher:last-section:v1', mode === 'spaces' ? 'spaces' : 'room');
    const f = await setup(storage);
    try { expect(f.root.querySelector(`#kl-rooms-${mode}`)?.getAttribute('aria-selected')).toBe('true'); expect(f.route('rooms').getAttribute('aria-current')).toBe('page'); }
    finally { f.view.destroy(); }
  });

  it("restores a last room subroute and rejects it after the legacy Rooms tab is hidden", async () => {
    const storage = new MemoryKeyValueStorage();
    const first = await setup(storage);
    first.area("game").click(); first.route("presets").click();
    expect(storage.getItem("kikilink:platform:last-route:v1")).toBe("presets");
    first.view.destroy();
    const second = await setup(storage);
    expect(second.route("presets").getAttribute("aria-current")).toBe("page");
    second.view.destroy();
    const third = await setup(storage, ["room"]);
    try {
      expect(third.root.querySelector<HTMLElement>(".kl-panel")!.dataset.workspace).not.toBe("room");
      expect(third.route("presets").hidden).toBe(true);
      expect(third.route("rooms").hidden).toBe(true);
    } finally { third.view.destroy(); }
  });

  it.each(["inbox", "saved"])("falls back from remembered %s when this build has no Cloud client", async savedRoute => {
    const storage = new MemoryKeyValueStorage();
    storage.setItem("kikilink:launcher:last-section:v1", savedRoute);
    storage.setItem("kikilink:platform:last-route:v1", savedRoute);
    const f = await setup(storage);
    try {
      expect(f.root.querySelector<HTMLElement>(".kl-panel")!.dataset.workspace).toBe("home");
      expect(f.route(savedRoute).hidden).toBe(true);
    } finally { f.view.destroy(); }
  });

  it("keeps Workshop an honest disconnected surface and its fallback opens actual Custom Activities", async () => {
    const f = await setup();
    try {
      f.area("create").click();
      const page = f.root.querySelector<HTMLElement>(".kl-workshop-host")!;
      expect(page.hidden).toBe(false); expect(page.textContent).toContain("Connect to Cloud to open Workshop.");
      page.querySelector<HTMLButtonElement>("button")!.click();
      expect(f.root.querySelector<HTMLElement>(".kl-activities-page")!.hidden).toBe(false);
    } finally { f.view.destroy(); }
  });
});

it('renders and restores local Workshop panels without changing profile or reading preferences',async()=>{
 const f=await setup();try{
  const host=document.querySelector<HTMLElement>('#kikilink-root')!,profile=structuredClone(f.settings.get().linkPresence);
  f.settings.update(s=>{s.ui.theme='dark';s.ui.accent='#d71932';s.ui.density='compact';s.ui.textScale='extra-large';s.ui.workshopPalette={packageId:'00000000-0000-4000-8000-000000000001',version:'1.0.0',label:'Midnight',primary:'#111113',secondary:'#19191c'};});
  expect(host.style.getPropertyValue('--kl-panel-bg')).toBe('#111113');expect(host.style.getPropertyValue('--kl-surface-2')).toBe('#19191c');
  f.settings.update(s=>{s.ui.theme='light';});expect(host.style.getPropertyValue('--kl-panel-bg')).toBe('');expect(f.settings.get().ui.workshopPalette).not.toBeNull();
  f.settings.update(s=>{s.ui.theme='system';});expect(host.style.getPropertyValue('--kl-surface-2')).toBe('');
  f.settings.update(s=>{s.ui.theme='dark';});f.area('settings').click();f.root.querySelector<HTMLButtonElement>('[data-section="appearance"]')!.click();
  const restore=[...f.root.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='Restore original palette · Midnight')!;expect(restore.hidden).toBe(false);restore.click();
  expect(f.settings.get().ui.workshopPalette).toBeNull();expect(f.settings.get().ui.accent).toBe(DEFAULT_SETTINGS.ui.accent);expect(f.settings.get().ui.density).toBe('compact');expect(f.settings.get().ui.textScale).toBe('extra-large');expect(f.settings.get().linkPresence).toEqual(profile);expect(restore.hidden).toBe(true);expect(host.style.getPropertyValue('--kl-panel-bg')).toBe('');
 }finally{f.view.destroy();}
});
