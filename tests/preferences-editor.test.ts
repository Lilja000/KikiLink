// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { PreferencesEditor, compatibilityDetails } from "../src/cloud/preferences-editor";
import { CloudError, type CloudClient } from "../src/cloud/client";
import { CLOUD_STYLES } from "../src/cloud/styles";
import { LINK_CHAT_STYLES } from "../src/modules/link-chat/styles";
import type { PreferenceLevel, Preferences } from "../src/cloud/preference-model";
import catalog from "../cloud/shared/preferences-catalog.json";

const cleanup: Array<() => void> = [];

afterEach(() => {
  cleanup.splice(0).forEach(fn => fn());
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function setup() {
  let data: Preferences = {
    mode: "private",
    ratings: {},
    revision: 0,
    catalogVersion: catalog.version,
  };
  let listener: (kind: string) => void = () => {};
  const request = vi.fn(async (method: string, path: string, input?: any) => {
    expect(path).toBe("/v1/preferences/me");
    if (method === "PATCH") {
      expect(input.revision).toBe(data.revision);
      const ratings = { ...data.ratings };
      for (const [id, value] of Object.entries(input.updates as Record<string, PreferenceLevel | null>)) {
        if (value === null) delete ratings[id];
        else ratings[id] = value;
      }
      data = {
        ...data,
        mode: input.mode ?? data.mode,
        ratings,
        revision: data.revision + 1,
      };
    }
    if (method === "PUT") {
      data = {
        ...data,
        mode: input.mode,
        ratings: structuredClone(input.ratings),
        revision: data.revision + 1,
      };
    }
    if (method === "DELETE") data = { ...data, mode: "private", ratings: {}, revision: data.revision + 1 };
    return structuredClone(data);
  });
  const client = {
    connected: true,
    request,
    subscribe: (fn: typeof listener) => { listener = fn; return () => {}; },
  } as unknown as CloudClient;
  const editor = new PreferencesEditor(client);
  cleanup.push(() => editor.destroy());
  document.body.append(editor.element);
  const button = (label: string) => [...editor.element.querySelectorAll("button")].find(candidate => candidate.textContent === label)!;
  return {
    editor,
    client,
    request,
    button,
    session: () => listener("session"),
    set: (next: Preferences) => { data = structuredClone(next); },
    data: () => structuredClone(data),
  };
}

function firstRow(editor: PreferencesEditor): HTMLElement {
  return editor.element.querySelector<HTMLElement>(".kl-preference-row")!;
}

it("identifies disabled Community and loads preferences after the server becomes available", async () => {
  const h = setup();
  h.request.mockRejectedValueOnce(new CloudError("community_unavailable", 404));
  await h.editor.load();
  expect(h.editor.element.textContent).toContain("Preferences are not enabled on this Cloud server yet");
  expect(h.editor.dirty).toBe(false);
  h.button("Retry").click();
  await vi.waitFor(() => expect(h.editor.element.textContent).toContain("Quick setup"));
  const id = catalog.items[0]!.id;
  await h.editor.setAndSave(id, "love");
  expect(h.editor.dirty).toBe(false);
  expect(h.data().ratings[id]).toBe("love");
});

it.each([".kl-preferences-summary", ".kl-preferences-summary-copy strong", ".kl-preferences-summary-copy small", ".kl-preferences-count", ".kl-preferences-summary-arrow"])(
  "opens Match preferences from a normal click on %s and reuses the loaded editor",
  async selector => {
    const h = setup();
    const click = () => h.editor.element.querySelector(selector)!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    click();
    expect(h.editor.element.open).toBe(true);
    await vi.waitFor(() => expect(h.editor.element.textContent).toContain("Quick setup"));
    expect(firstRow(h.editor).dataset.level).toBe("not_set");
    click(); expect(h.editor.element.open).toBe(false);
    click(); expect(h.editor.element.open).toBe(true);
    expect(h.request).toHaveBeenCalledTimes(1);
  },
);

it("opens the same disclosure without Cloud and shows a connection message", () => {
  const h = setup();
  Object.defineProperty(h.client, "connected", { value: false });
  h.editor.element.querySelector<HTMLElement>("summary")!.click();
  expect(h.editor.element.open).toBe(true);
  expect(h.editor.element.textContent).toContain("Connect to KikiLink Cloud to edit preferences.");
  expect(h.request).not.toHaveBeenCalled();
});

it("shows loading, a failed response and a working retry after opening by click", async () => {
  const h = setup();
  let fail!: (error: CloudError) => void;
  h.request.mockImplementationOnce(() => new Promise((_, reject) => { fail = reject; }));
  h.editor.element.querySelector<HTMLElement>("summary")!.click();
  expect(h.editor.element.textContent).toContain("Loading preferences…");
  fail(new CloudError("community_disabled", 404));
  await vi.waitFor(() => expect(h.editor.element.textContent).toContain("Preferences are not enabled on this Cloud server yet"));
  expect(h.editor.element.open).toBe(true);
  h.button("Retry").click();
  await vi.waitFor(() => expect(h.editor.element.textContent).toContain("Quick setup"));
  expect(h.request).toHaveBeenCalledTimes(2);
});

it.each(["comfortable", "compact", "super-compact"])(
  "keeps the preferences header and loaded content in a non-shrinking profile column at %s density",
  async density => {
    const h = setup();
    const host = document.createElement("div"); host.dataset.density = density;
    document.body.append(host);
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style"); style.textContent = LINK_CHAT_STYLES + CLOUD_STYLES;
    const dialog = document.createElement("dialog"); dialog.className = "kl-dialog kl-presence-dialog"; dialog.open = true;
    const body = document.createElement("div"); body.className = "kl-dialog-body kl-presence-body";
    body.append(h.editor.element); dialog.append(body); root.append(style, dialog);
    h.editor.element.querySelector<HTMLElement>("summary")!.click();
    await vi.waitFor(() => expect(firstRow(h.editor)).not.toBeNull());
    // CSS cascade only, not browser geometry. The previous min-content assertion
    // passed despite the owner's Firefox screenshot showing only the border.
    // Test the parent sizing rule as well as the header's explicit minimum.
    expect(getComputedStyle(body).display).toBe("flex");
    expect(getComputedStyle(body).flexDirection).toBe("column");
    expect(getComputedStyle(h.editor.element).flexShrink).toBe("0");
    expect(getComputedStyle(h.editor.element).flexBasis).toBe("auto");
    expect(getComputedStyle(h.editor.element).minHeight).toBe("64px");
    expect(getComputedStyle(body).overflow).toBe("auto");
    expect(getComputedStyle(h.editor.element.querySelector(".kl-preferences-body")!).getPropertyValue("container-type")).toBe("inline-size");
    expect(parseInt(getComputedStyle(h.editor.element.querySelector("summary")!).minHeight)).toBeGreaterThanOrEqual(62);
  },
);

it("keeps Not Set distinct from Neutral and makes Like/Dislike one-tap choices", async () => {
  const h = setup();
  expect(h.editor.element.open).toBe(false);
  expect(h.request).not.toHaveBeenCalled();
  await h.editor.load();
  expect(h.editor.element.querySelectorAll(".kl-preference-row")).toHaveLength(catalog.items.filter(item => item.popular).length);
  expect(h.editor.element.querySelector<HTMLSelectElement>('[aria-label="Preference privacy"]')!.value).toBe("private");
  expect(firstRow(h.editor).querySelector(".kl-preference-state")?.textContent).toBe("Not Set");

  const id = firstRow(h.editor).dataset.preferenceId!;
  firstRow(h.editor).querySelector<HTMLButtonElement>(".kl-preference-quick--like")!.click();
  expect(firstRow(h.editor).dataset.level).toBe("like");
  expect(firstRow(h.editor).querySelector(".kl-preference-state")?.textContent).toBe("Like");
  await h.editor.save();
  expect(h.request.mock.calls.at(-1)?.[2]).toMatchObject({ updates: { [id]: "like" }, revision: 0 });

  firstRow(h.editor).querySelector<HTMLButtonElement>(".kl-preference-quick--dislike")!.click();
  expect(firstRow(h.editor).dataset.level).toBe("dislike");
  await h.editor.save();
  expect(h.data().ratings[id]).toBe("dislike");

  firstRow(h.editor).querySelector<HTMLButtonElement>(".kl-preference-name")!.click();
  firstRow(h.editor).querySelector<HTMLButtonElement>('[data-level="neutral"]')!.click();
  await h.editor.save();
  expect(h.data().ratings[id]).toBe("neutral");

  firstRow(h.editor).querySelector<HTMLButtonElement>(".kl-preference-name")!.click();
  firstRow(h.editor).querySelector<HTMLButtonElement>(".kl-preference-unset")!.click();
  await h.editor.save();
  expect(h.request.mock.calls.at(-1)?.[2].updates).toEqual({ [id]: null });
  expect(h.data().ratings).toEqual({});
  expect(firstRow(h.editor).dataset.level).toBe("not_set");
});

it("opens detailed states by normal click and batches a Hard Limit save", async () => {
  const h = setup();
  await h.editor.load();
  const row = firstRow(h.editor);
  const id = row.dataset.preferenceId!;
  row.querySelector<HTMLButtonElement>(".kl-preference-state")!.click();
  expect(row.querySelectorAll(".kl-preference-selector button")).toHaveLength(7);
  row.querySelector<HTMLButtonElement>('[data-level="hard_limit"]')!.click();
  expect(row.dataset.level).toBe("hard_limit");
  expect(row.querySelector(".kl-preference-state")?.textContent).toBe("Hard Limit");
  await h.editor.save();
  expect(h.request.mock.calls.at(-1)?.[2].updates).toEqual({ [id]: "hard_limit" });
});

it("saves through the original Schema 7 numeric PUT API and hides unsupported choices", async () => {
  const h = setup();
  h.set({ mode: "private", ratings: {}, revision: 0, catalogVersion: "2026.09.19-1" });
  await h.editor.load();
  expect(h.editor.element.textContent).toContain("Cloud compatibility mode");
  expect(h.editor.element.querySelector('[data-preference-id="dynamics.dominance"]')).toBeNull();
  const row = firstRow(h.editor), id = row.dataset.preferenceId!;
  row.querySelector<HTMLButtonElement>(".kl-preference-name")!.click();
  expect(row.querySelector('[data-level="hard_limit"]')).toBeNull();
  row.querySelector<HTMLButtonElement>('[data-level="like"]')!.click();
  await h.editor.save();
  const write = h.request.mock.calls.find(call => call[0] === "PUT");
  expect(write?.[2]).toMatchObject({ revision: 0, ratings: { [id]: 1 } });
  expect(h.request.mock.calls.some(call => call[0] === "PATCH")).toBe(false);
  expect(h.editor.dirty).toBe(false);
});

it("discards a pending draft and cancels its delayed write", async () => {
  vi.useFakeTimers();
  const h = setup(); await h.editor.load();
  firstRow(h.editor).querySelector<HTMLButtonElement>(".kl-preference-quick--like")!.click();
  expect(h.editor.dirty).toBe(true);
  h.editor.discard();
  expect(h.editor.dirty).toBe(false);
  expect(firstRow(h.editor).dataset.level).toBe("not_set");
  await vi.advanceTimersByTimeAsync(1000);
  expect(h.request.mock.calls.map(call => call[0])).toEqual(["GET"]);
});

it.each(["like", "dislike"] as const)("clears a saved %s with a second tap and reloads it as Not Set", async level => {
  const h = setup(); await h.editor.load();
  const row = firstRow(h.editor), id = row.dataset.preferenceId!;
  const tap = () => row.querySelector<HTMLButtonElement>(`.kl-preference-quick--${level}`)!.click();
  tap(); await h.editor.save();
  expect(row.querySelector(`[aria-pressed="true"]`)?.classList.contains(`kl-preference-quick--${level}`)).toBe(true);
  expect(row.querySelector<HTMLButtonElement>(`.kl-preference-quick--${level}`)!.title).toContain("Not Set");
  tap();
  expect(row.dataset.level).toBe("not_set");
  expect(row.querySelector('.kl-preference-quick[aria-pressed="true"]')).toBeNull();
  expect(row.querySelector(".kl-preference-state")!.textContent).toBe("Not Set");
  await h.editor.save();
  expect(h.request.mock.calls.at(-1)?.[2].updates).toEqual({ [id]: null });
  await h.editor.load();
  expect(h.editor.preferences!.ratings).not.toHaveProperty(id);
  expect(firstRow(h.editor).dataset.level).toBe("not_set");
});

it.each(["like", "dislike"] as const)("cancels a quick %s before the save delay without making a Cloud write", async level => {
  vi.useFakeTimers();
  const h = setup(); await h.editor.load();
  const row = firstRow(h.editor);
  const tap = () => row.querySelector<HTMLButtonElement>(`.kl-preference-quick--${level}`)!.click();
  tap(); tap();
  await vi.advanceTimersByTimeAsync(1000);
  expect(h.editor.preferences!.ratings).toEqual({});
  expect(h.editor.dirty).toBe(false);
  expect(h.request.mock.calls.map(call => call[0])).toEqual(["GET"]);
  expect(h.editor.element.querySelector(".kl-preferences-status")!.textContent).toContain("Not Set.");
  expect(h.editor.element.querySelector(".kl-preferences-status")!.textContent).not.toContain("Saving");
});

it.each(["like", "dislike"] as const)("keeps a second %s tap cleared when the first save finishes later", async level => {
  const h = setup(); await h.editor.load();
  const row = firstRow(h.editor), id = row.dataset.preferenceId!;
  const tap = () => row.querySelector<HTMLButtonElement>(`.kl-preference-quick--${level}`)!.click();
  const send = h.request.getMockImplementation()!;
  let finish!: () => Promise<void>;
  h.request.mockImplementationOnce((method, path, input) => new Promise(resolve => {
    finish = async () => resolve(await send(method, path, input));
  }));
  tap(); const saving = h.editor.save(); tap();
  expect(row.dataset.level).toBe("not_set");
  await finish(); await saving;
  expect(h.editor.preferences!.ratings).not.toHaveProperty(id);
  expect(h.editor.dirty).toBe(true);
  await h.editor.save();
  expect(h.request.mock.calls.filter(call => call[0] === "PATCH").map(call => call[2].updates)).toEqual([{ [id]: level }, { [id]: null }]);
  await h.editor.load();
  expect(firstRow(h.editor).dataset.level).toBe("not_set");
  expect(h.editor.dirty).toBe(false);
});

it("uses the same Like/Dislike toggle in detailed choices without clearing other explicit states", async () => {
  const h = setup(); await h.editor.load();
  const row = firstRow(h.editor);
  const choose = (level: PreferenceLevel) => {
    row.querySelector<HTMLButtonElement>(".kl-preference-state")!.click();
    row.querySelector<HTMLButtonElement>(`[data-level="${level}"]`)!.click();
  };
  for (const level of ["like", "dislike"] as const) {
    choose(level); expect(row.dataset.level).toBe(level);
    choose(level); expect(row.dataset.level).toBe("not_set");
  }
  for (const level of ["neutral", "love", "hate", "hard_limit"] as const) {
    choose(level); choose(level); expect(row.dataset.level).toBe(level);
  }
  choose("like"); choose("dislike"); expect(row.dataset.level).toBe("dislike");
});

it("searches aliases locally and renders full categories only when opened", async () => {
  const h = setup();
  await h.editor.load();
  const callsAfterLoad = h.request.mock.calls.length;
  h.button("+ More preferences").click();
  const categories = h.editor.element.querySelectorAll<HTMLDetailsElement>(".kl-preference-category");
  expect(categories).toHaveLength(new Set(catalog.items.map(item => item.category)).size);
  expect(h.editor.element.querySelectorAll(".kl-preference-row")).toHaveLength(0);
  categories[0]!.open = true;
  categories[0]!.dispatchEvent(new Event("toggle"));
  expect(categories[0]!.querySelectorAll(".kl-preference-row").length).toBeGreaterThan(0);

  const search = h.editor.element.querySelector<HTMLInputElement>(".kl-preferences-search")!;
  search.value = "rope";
  search.dispatchEvent(new Event("input"));
  const labels = [...h.editor.element.querySelectorAll(".kl-preference-name")].map(node => node.textContent);
  expect(labels).toContain("Rope Bondage");
  expect(labels).toContain("Shibari");
  expect(labels).toContain("Suspension");
  expect(h.request).toHaveBeenCalledTimes(callsAfterLoad);
});

it("merges a revision conflict and reapplies only the local partial update", async () => {
  const h = setup();
  await h.editor.load();
  const localId = firstRow(h.editor).dataset.preferenceId!;
  const remoteId = catalog.items.find(item => item.id !== localId)!.id;
  firstRow(h.editor).querySelector<HTMLButtonElement>(".kl-preference-quick--like")!.click();
  h.set({ mode: "friends", ratings: { [remoteId]: "dislike" }, revision: 7, catalogVersion: catalog.version });
  h.request.mockRejectedValueOnce(new CloudError("preferences_changed_on_another_device", 409));
  await h.editor.save();
  const patchCalls = h.request.mock.calls.filter(call => call[0] === "PATCH");
  expect(patchCalls).toHaveLength(2);
  expect(patchCalls.at(-1)?.[2]).toEqual({ updates: { [localId]: "like" }, revision: 7 });
  expect(h.data().ratings).toEqual({ [remoteId]: "dislike", [localId]: "like" });
  expect(h.editor.dirty).toBe(false);
});

it("does not restore private values from a save completing after logout", async () => {
  const h = setup();
  await h.editor.load();
  const row = firstRow(h.editor);
  const id = row.dataset.preferenceId!;
  row.querySelector<HTMLButtonElement>(".kl-preference-quick--like")!.click();
  let finish!: (value: Preferences) => void;
  h.request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const save = h.editor.save();
  h.session();
  finish({ mode: "private", ratings: { [id]: "like" }, revision: 1, catalogVersion: catalog.version });
  await expect(save).rejects.toMatchObject({ code: "session_changed" });
  expect(h.editor.element.querySelectorAll(".kl-preference-row")).toHaveLength(0);
  expect(h.editor.preferences).toBeUndefined();
});

it("keeps failed edits without an unbounded automatic retry loop", async () => {
  vi.useFakeTimers();
  const h = setup(); await h.editor.load();
  h.request.mockRejectedValueOnce(new CloudError("cloud_temporarily_unavailable", 503));
  firstRow(h.editor).querySelector<HTMLButtonElement>(".kl-preference-quick--like")!.click();
  await vi.advanceTimersByTimeAsync(10_000);
  expect(h.request.mock.calls.filter(call => call[0] === "PATCH")).toHaveLength(1);
  expect(h.editor.dirty).toBe(true);
  expect(h.editor.element.textContent).toContain("Your changes are kept");
  await h.editor.save();
  expect(h.editor.dirty).toBe(false);
});

it("keeps a preference draft across expired authentication but clears it on explicit logout", async () => {
  const h = setup(); await h.editor.load();
  firstRow(h.editor).querySelector<HTMLButtonElement>(".kl-preference-quick--like")!.click();
  Object.defineProperty(h.client, "connected", { value: false, configurable: true });
  Object.defineProperty(h.client, "connectionState", { value: "unavailable", configurable: true });
  h.session();
  expect(h.editor.dirty).toBe(true);
  expect(Object.values(h.editor.preferences!.ratings)).toEqual(["like"]);
  Object.defineProperty(h.client, "connected", { value: true, configurable: true }); h.session();
  await h.editor.save(); expect(h.editor.dirty).toBe(false);
  Object.defineProperty(h.client, "connected", { value: false, configurable: true });
  Object.defineProperty(h.client, "connectionState", { value: "idle", configurable: true }); h.session();
  expect(h.editor.preferences).toBeUndefined();
});

it("explains score-only privacy, separates hard-limit conflicts, and supports inline quick edit", async () => {
  const hidden = compatibilityDetails({ status: "available", count: 5, score: 82 });
  expect(hidden.textContent).toContain("Compatibility-only privacy");
  expect(hidden.textContent).toContain("Not Set is excluded");

  const setMine = vi.fn(async () => {});
  const shared = compatibilityDetails({
    status: "available",
    count: 5,
    score: 82,
    hardLimitConflictCount: 1,
    shared: [
      { id: catalog.items[0]!.id, yours: "love", theirs: "love" },
      { id: catalog.items[1]!.id, yours: "love", theirs: "hard_limit" },
      { id: catalog.items[2]!.id, yours: "neutral", theirs: "like" },
      { id: catalog.items[3]!.id, yours: "hate", theirs: "love" },
    ],
  }, { setMine });
  expect(shared.textContent).toContain("Hard Limit Conflict");
  expect(shared.querySelector('[data-section="hard_limit"]')).not.toBeNull();
  expect(shared.querySelector('[data-section="strong"]')).not.toBeNull();
  expect(shared.querySelector('[data-section="minor"]')).not.toBeNull();
  expect(shared.querySelector('[data-section="conflict"]')).not.toBeNull();
  shared.querySelectorAll<HTMLButtonElement>(".kl-compatibility-edit")[0]!.click();
  shared.querySelector<HTMLButtonElement>('.kl-compatibility-quick-editor [data-level="dislike"]')!.click();
  await vi.waitFor(() => expect(setMine).toHaveBeenCalledWith(catalog.items[1]!.id, "dislike"));
});

it("keeps quick controls and detailed selectors mobile-safe", () => {
  expect(CLOUD_STYLES).toMatch(/@container \(max-width:480px\)[\s\S]*?\.kl-preference-list--quick\s*\{[^}]*grid-template-columns:\s*minmax\(0,1fr\)/u);
  expect(CLOUD_STYLES).toMatch(/@container \(max-width:480px\)[\s\S]*?\.kl-preference-selector\s*\{[^}]*grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/u);
  expect(CLOUD_STYLES).toMatch(/\.kl-preference-quick,\.kl-preference-state\s*\{[^}]*min-height:\s*38px/u);
  expect(CLOUD_STYLES).toMatch(/\.kl-preference-quick\s*\{[^}]*width:\s*38px/u);
  expect(CLOUD_STYLES).not.toContain("long-press");
});

it.each(["like", "dislike"] as const)("clears %s in Compatibility quick edit and removes it from the compared count", async level => {
  const setMine = vi.fn(async () => {}), id = catalog.items[0]!.id;
  const details = compatibilityDetails({ status: "available", count: 5, score: 100,
    shared: catalog.items.slice(0, 5).map(item => ({ id: item.id, yours: level, theirs: level })),
  }, { setMine });
  document.body.append(details);
  details.querySelector<HTMLButtonElement>(".kl-compatibility-edit")!.click();
  details.querySelector<HTMLButtonElement>(`.kl-compatibility-quick-editor [data-level="${level}"]`)!.click();
  await vi.waitFor(() => expect(document.body.textContent).toContain("4 preferences compared"));
  expect(setMine).toHaveBeenCalledWith(id, undefined);
  expect(document.body.textContent).toContain("Not enough shared preferences");
  expect(document.body.textContent).not.toContain("100% compatibility");
});
