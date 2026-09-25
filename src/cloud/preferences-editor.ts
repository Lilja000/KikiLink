import { CloudError, type CloudClient } from "./client";
import { element } from "./dom";
import { kikiIcon } from "../modules/link-chat/icons";
import { exportPreferences, importPreferences, MAX_PREFERENCES_FILE_BYTES } from "./preference-transfer";
import {
  PREFERENCE_LEVEL_LABELS,
  PREFERENCE_LEVELS,
  catalog,
  catalogById,
  compatibilitySection,
  configuredPreferenceGroups,
  isHardLimitConflict,
  normalizePreferenceRatings,
  preferenceLevelAfterTap,
  preferenceSimilarity,
  preferenceMatchesSearch,
  type Compatibility,
  type PreferenceCatalogItem,
  type PreferenceLevel,
  type Preferences,
} from "./preference-model";

export type { Compatibility, PreferenceLevel, Preferences, SharedPreference } from "./preference-model";
export { PREFERENCE_LEVEL_LABELS, PREFERENCE_LEVELS } from "./preference-model";

const AUTO_SAVE_DELAY_MS = 700;
const MIN_AUTO_SAVE_INTERVAL_MS = 3_000;
const MAX_PATCH_ENTRIES = 200;
const LEGACY_CATALOG_VERSION = "2026.09.19-1";
// Schema 7's first public Preferences release contains the imported BC/F-List
// rows. The later KikiLink-curated rows were added together with PATCH, named
// levels and Hard Limit support.
const LEGACY_CATALOG_IDS = new Set(
  catalog.items
    .filter(item => item.sources.some(source => source !== "kikilink-curated"))
    .map(item => item.id),
);
const LEGACY_LEVELS: Record<Exclude<PreferenceLevel, "hard_limit">, number> = {
  hate: -2,
  dislike: -1,
  neutral: 0,
  like: 1,
  love: 2,
};

function sameUpdate(left: PreferenceLevel | null | undefined, right: PreferenceLevel | null): boolean {
  return left === right;
}

/**
 * Preferences stay in this editor and their separate Cloud row. They never enter
 * SettingsStore or a full profile PUT, so a preference edit cannot erase a bio,
 * banner, tags, or another profile field.
 */
export class PreferencesEditor {
  readonly element = element("details", { className: "kl-preferences-editor" });
  readonly #body = element("div", { className: "kl-preferences-body" });
  readonly #status = element("p", { className: "kl-preferences-status", role: "status" });
  readonly #count = element("span", { className: "kl-preferences-count" });
  readonly #search = element("input", {
    type: "search",
    className: "kl-preferences-search",
    placeholder: "Search rope, collars, praise…",
    ariaLabel: "Search preferences",
  });
  readonly #mode = element("select", { ariaLabel: "Preference privacy" });
  readonly #importFile = element("input", { type: "file", hidden: true });
  readonly #listeners = new Set<() => void>();
  readonly #pending = new Map<string, PreferenceLevel | null>();
  #data: Preferences | undefined;
  #base: Preferences | undefined;
  #modeDirty = false;
  #showFull = false;
  #activeSelector: string | undefined;
  #busy = false;
  #generation = 0;
  #saveTimer: ReturnType<typeof setTimeout> | undefined;
  #savePromise: Promise<void> | undefined;
  #resumeDraft = false;
  #legacyCatalog = false;
  #lastSaveAt = 0;
  #retryAt = 0;
  #rateLimitRetries = 0;
  #importToken = 0;
  #unsubscribe: () => void;

  constructor(readonly client: CloudClient) {
    const summary = element(
      "summary",
      { className: "kl-preferences-summary" },
      element("span", { className: "kl-preferences-summary-icon" }, kikiIcon("heart")),
      element(
        "span",
        { className: "kl-preferences-summary-copy" },
        element("strong", { text: "Match preferences" }),
        element("small", { text: "Choose a few likes, dislikes, and boundaries" }),
      ),
      this.#count,
      kikiIcon("next", "kl-preferences-summary-arrow"),
    );
    this.element.append(summary, this.#body);
    for (const [value, label] of [
      ["private", "Private"],
      ["score", "Compatibility only"],
      ["friends", "Friends only"],
      ["public", "Public in KikiLink"],
    ] as const) this.#mode.append(element("option", { value, text: label }));
    this.#mode.addEventListener("change", () => {
      if (!this.#data) return;
      this.#data.mode = this.#mode.value as Preferences["mode"];
      this.#modeDirty = this.#data.mode !== this.#base?.mode;
      this.#changed("Visibility changed. Saving…");
    });
    this.#search.addEventListener("input", () => this.#renderBrowser());
    this.#importFile.accept = ".json,application/json";
    this.#importFile.addEventListener("change", () => {
      const file = this.#importFile.files?.[0];
      this.#importFile.value = "";
      if (file) void this.#importPreferences(file);
    });
    this.element.addEventListener("toggle", () => {
      if (this.element.open && !this.#data && !this.#busy) void this.load();
    });
    this.#unsubscribe = client.subscribe(kind => {
      if (kind !== "session") return;
      if (!client.connected && client.connectionState !== "idle" && this.dirty) {
        clearTimeout(this.#saveTimer);
        this.#generation++;
        this.#resumeDraft = true;
        this.#status.textContent = "Connection lost. Your preference changes are kept; reconnect to save.";
        return;
      }
      if (client.connected && this.#resumeDraft) {
        this.#resumeDraft = false;
        this.#status.textContent = "Connected. Saving your pending preference changes…";
        this.#scheduleSave();
        return;
      }
      this.#reset();
      if (this.element.open) void this.load();
    });
  }

  get dirty(): boolean { return this.#pending.size > 0 || this.#modeDirty; }
  get preferences(): Preferences | undefined { return this.#data ? structuredClone(this.#data) : undefined; }
  subscribe(listener: () => void): () => void { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }

  async load(): Promise<void> {
    if (!this.client.connected) {
      this.#body.replaceChildren(element("p", { className: "kl-preferences-empty", text: "Connect to KikiLink Cloud to edit preferences." }));
      return;
    }
    const generation = ++this.#generation;
    this.#busy = true;
    this.#body.replaceChildren(element("p", { className: "kl-preferences-empty", role: "status", text: "Loading preferences…" }));
    try {
      const received = await this.client.request<Preferences>("GET", "/v1/preferences/me");
      if (generation !== this.#generation) return;
      const data = { ...received, ratings: normalizePreferenceRatings(received.ratings) };
      this.#legacyCatalog = received.catalogVersion === LEGACY_CATALOG_VERSION;
      this.#data = data;
      this.#base = structuredClone(data);
      this.#pending.clear();
      this.#modeDirty = false;
      this.#mode.value = data.mode;
      this.#render();
      if (this.#legacyCatalog)
        this.#status.textContent = "Cloud compatibility mode: 111 preferences are available. New entries and Hard Limit require a Cloud update.";
      this.#emit();
    } catch (error) {
      if (generation === this.#generation) {
        const retry = this.#textButton("Retry", () => this.load());
        const message = error instanceof CloudError && ["community_unavailable", "community_disabled"].includes(error.code)
          ? "Preferences are not enabled on this Cloud server yet. They will be available after the server update."
          : error instanceof CloudError && error.status === 401
            ? "Reconnect to KikiLink Cloud to load preferences."
            : "Could not load preferences. Check your connection and retry.";
        this.#body.replaceChildren(
          element("p", { className: "kl-preferences-empty", text: message }),
          retry,
        );
      }
    } finally {
      if (generation === this.#generation) this.#busy = false;
    }
  }

  async setAndSave(id: string, level: PreferenceLevel | undefined): Promise<void> {
    if (!this.#data) await this.load();
    if (!this.#data || !catalogById.has(id)) throw new Error("Preference is unavailable.");
    this.#set(id, level);
    await this.save();
  }

  openPreference(id?: string): void {
    this.element.open = true;
    const open = (): void => {
      this.#showFull = Boolean(id);
      if (id) this.#search.value = catalogById.get(id)?.label ?? "";
      this.#render();
      const target = id ? this.#body.querySelector<HTMLElement>(`[data-preference-id="${CSS.escape(id)}"]`) : undefined;
      target?.scrollIntoView({ block: "nearest" });
      target?.querySelector<HTMLButtonElement>(".kl-preference-name")?.focus({ preventScroll: true });
    };
    if (this.#data) open(); else void this.load().then(open);
  }

  #render(): void {
    if (!this.#data) return;
    const intro = element(
      "div",
      { className: "kl-preferences-intro" },
      element("div", {}, element("strong", { text: this.#showFull ? "All preferences" : "Quick setup" }),
        element("p", { text: this.#showFull ? "Search or open a category. Only categories you open are rendered." : "Pick only what matters to you. Ten to twenty choices are enough to start." })),
      element("label", { className: "kl-preferences-privacy" }, element("span", { text: "Visibility" }), this.#mode),
    );
    const content = element("div", { className: "kl-preferences-content" });
    const switchView = this.#textButton(this.#showFull ? "Back to quick setup" : "+ More preferences", async () => {
      this.#showFull = !this.#showFull;
      this.#activeSelector = undefined;
      this.#search.value = "";
      this.#render();
    });
    switchView.classList.add("kl-preferences-more");
    const tools = element("div", { className: "kl-preferences-tools" }, this.#showFull ? this.#search : undefined, switchView);
    const maintenance = element(
      "details",
      { className: "kl-preferences-maintenance" },
      element("summary", { text: "Privacy and data" }),
      element("p", { text: "Not Set is omitted. Neutral is an explicit choice. Preferences describe consenting adult interests; they never grant consent." }),
      element("div", { className: "kl-cloud-actions" },
        this.#textButton("Save now", () => this.save().catch(() => {})),
        this.#textButton("Clear configured preferences", () => this.#confirmClear()),
        this.#textButton("Delete saved preferences", () => this.#confirmDelete()),
      ),
    );
    const exportButton = this.#textButton("Export", () => this.#exportPreferences());
    exportButton.title = "Download your current preference list, including unsaved changes";
    const importButton = this.#textButton("Import", () => this.#importFile.click());
    importButton.title = "Import a KikiLink preferences JSON file";
    const transfer = element("div", { className: "kl-preferences-transfer" }, exportButton, importButton, this.#importFile);
    this.#body.replaceChildren(intro, tools, content, this.#status, maintenance, transfer);
    this.#renderBrowser();
    this.#updateCount();
  }

  #renderBrowser(): void {
    const content = this.#body.querySelector<HTMLElement>(".kl-preferences-content");
    if (!content || !this.#data) return;
    const available = this.#availableItems();
    content.replaceChildren();
    if (!this.#showFull) {
      const popular = available.filter(item => item.popular);
      content.append(element("div", { className: "kl-preference-list kl-preference-list--quick" }, ...popular.map(item => this.#row(item))));
      return;
    }
    const query = this.#search.value;
    if (query.trim()) {
      const matches = available.filter(item => preferenceMatchesSearch(item, query));
      const result = element("div", { className: "kl-preference-search-results" });
      for (const category of this.#availableCategories(available)) {
        const categoryItems = matches.filter(item => item.category === category);
        if (!categoryItems.length) continue;
        result.append(
          element("h4", { text: category }),
          element("div", { className: "kl-preference-list" }, ...categoryItems.slice(0, 80).map(item => this.#row(item))),
        );
      }
      if (!matches.length) result.append(element("p", { className: "kl-preferences-empty", text: "No matching preferences." }));
      content.append(result);
      return;
    }
    const categories = element("div", { className: "kl-preference-categories" });
    for (const category of this.#availableCategories(available)) {
      const items = available.filter(item => item.category === category);
      const configured = items.filter(item => this.#data?.ratings[item.id] !== undefined).length;
      const body = element("div", { className: "kl-preference-list" });
      const details = element(
        "details",
        { className: `kl-preference-category${category === "Edge / Taboo" ? " kl-preference-category--edge" : ""}` },
        element("summary", {}, element("span", { text: category }), element("small", { text: configured ? `${configured} set · ${items.length}` : `${items.length}` })),
        body,
      );
      details.addEventListener("toggle", () => {
        if (details.open && !body.childElementCount) body.append(...items.map(item => this.#row(item)));
      });
      categories.append(details);
    }
    content.append(categories);
  }

  #row(item: PreferenceCatalogItem): HTMLElement {
    const row = element("div", { className: "kl-preference-row" });
    row.dataset.preferenceId = item.id;
    this.#paintRow(row, item);
    return row;
  }

  #paintRow(row: HTMLElement, item: PreferenceCatalogItem): void {
    const level = this.#data?.ratings[item.id];
    row.dataset.level = level ?? "not_set";
    row.dataset.preferenceId = item.id;
    const name = element("button", { type: "button", className: "kl-preference-name", text: item.label, ariaLabel: `${item.label}. Open detailed preference choices.` });
    name.addEventListener("click", () => this.#toggleSelector(item.id));
    const dislike = element("button", {
      type: "button", className: "kl-preference-quick kl-preference-quick--dislike",
      title: level === "dislike" ? `Clear ${item.label} to Not Set` : `Set ${item.label} to Dislike`, ariaLabel: `Dislike ${item.label}`,
    }, kikiIcon("thumb-down"));
    dislike.setAttribute("aria-pressed", String(level === "dislike"));
    dislike.addEventListener("click", () => this.#set(item.id, preferenceLevelAfterTap(this.#data?.ratings[item.id], "dislike")));
    const like = element("button", {
      type: "button", className: "kl-preference-quick kl-preference-quick--like",
      title: level === "like" ? `Clear ${item.label} to Not Set` : `Set ${item.label} to Like`, ariaLabel: `Like ${item.label}`,
    }, kikiIcon("thumb-up"));
    like.setAttribute("aria-pressed", String(level === "like"));
    like.addEventListener("click", () => this.#set(item.id, preferenceLevelAfterTap(this.#data?.ratings[item.id], "like")));
    const state = element("button", {
      type: "button", className: "kl-preference-state",
      text: level ? PREFERENCE_LEVEL_LABELS[level] : "Not Set",
      ariaLabel: `${item.label}: ${level ? PREFERENCE_LEVEL_LABELS[level] : "Not Set"}. Open detailed choices.`,
    });
    state.addEventListener("click", () => this.#toggleSelector(item.id));
    const actions = element("div", { className: "kl-preference-actions" }, dislike, like, state);
    row.replaceChildren(name, actions);
    if (this.#activeSelector === item.id) row.append(this.#selector(item, level));
  }

  #selector(item: PreferenceCatalogItem, selected: PreferenceLevel | undefined): HTMLElement {
    const selector = element("div", { className: "kl-preference-selector", role: "group", ariaLabel: `Set ${item.label}` });
    const levels = this.#legacyCatalog ? PREFERENCE_LEVELS.filter(level => level !== "hard_limit") : PREFERENCE_LEVELS;
    for (const level of levels) {
      const choice = element("button", { type: "button", text: PREFERENCE_LEVEL_LABELS[level] });
      choice.dataset.level = level;
      choice.setAttribute("aria-pressed", String(selected === level));
      choice.addEventListener("click", () => this.#set(item.id, preferenceLevelAfterTap(this.#data?.ratings[item.id], level)));
      selector.append(choice);
    }
    const unset = element("button", { type: "button", className: "kl-preference-unset", text: "Not Set" });
    unset.setAttribute("aria-pressed", String(selected === undefined));
    unset.addEventListener("click", () => this.#set(item.id, undefined));
    selector.append(unset);
    return selector;
  }

  #toggleSelector(id: string): void {
    const previous = this.#activeSelector;
    this.#activeSelector = previous === id ? undefined : id;
    for (const candidate of new Set([previous, id])) {
      if (!candidate) continue;
      const item = catalogById.get(candidate);
      if (!item) continue;
      for (const row of this.#body.querySelectorAll<HTMLElement>(`[data-preference-id="${CSS.escape(candidate)}"]`)) this.#paintRow(row, item);
    }
    if (this.#activeSelector) this.#body.querySelector<HTMLElement>(`[data-preference-id="${CSS.escape(id)}"] .kl-preference-selector`)?.scrollIntoView({ block: "nearest" });
  }

  #set(id: string, level: PreferenceLevel | undefined): void {
    if (!this.#data || this.#busy && !this.#savePromise || !this.#supportsItem(id) || this.#legacyCatalog && level === "hard_limit") return;
    const before = this.#data.ratings[id];
    if (before === level) {
      this.#activeSelector = undefined;
      const item = catalogById.get(id);
      if (item) for (const row of this.#body.querySelectorAll<HTMLElement>(`[data-preference-id="${CSS.escape(id)}"]`)) this.#paintRow(row, item);
      return;
    }
    if (level === undefined) delete this.#data.ratings[id];
    else this.#data.ratings[id] = level;
    const base = this.#base?.ratings[id];
    // An in-flight response may still contain the first tap. Keep the second tap
    // even when it restores the old base value, so that response cannot undo it.
    if (base === level && !this.#savePromise) this.#pending.delete(id);
    else this.#pending.set(id, level ?? null);
    this.#activeSelector = undefined;
    const item = catalogById.get(id);
    if (item) for (const row of this.#body.querySelectorAll<HTMLElement>(`[data-preference-id="${CSS.escape(id)}"]`)) this.#paintRow(row, item);
    this.#changed(`${item?.label ?? "Preference"}: ${level ? PREFERENCE_LEVEL_LABELS[level] : "Not Set"}.${this.dirty ? " Saving…" : ""}`);
  }

  #changed(message: string): void {
    this.#status.textContent = message;
    this.#updateCount();
    this.#emit();
    this.#scheduleSave();
  }

  #scheduleSave(): void {
    clearTimeout(this.#saveTimer);
    if (!this.dirty || !this.client.connected) return;
    const delay = Math.max(AUTO_SAVE_DELAY_MS, this.#lastSaveAt + MIN_AUTO_SAVE_INTERVAL_MS - Date.now(), this.#retryAt - Date.now());
    this.#saveTimer = setTimeout(() => void this.#save(false).catch(() => {}), delay);
  }

  save(): Promise<void> { return this.#save(true); }

  async #save(drain: boolean): Promise<void> {
    clearTimeout(this.#saveTimer);
    this.#saveTimer = undefined;
    if (this.#savePromise) {
      await this.#savePromise;
      if (this.dirty) return this.#save(drain);
      return;
    }
    if (!this.#data || !this.dirty) return;
    if (Date.now() < this.#retryAt) {
      const message = this.#showSaveError(new CloudError("rate_limited", 429, this.#retryAt - Date.now()));
      if (this.#rateLimitRetries <= 1) this.#scheduleSave();
      throw new Error(message);
    }
    const task = this.#flush(true);
    this.#savePromise = task;
    let saved = false;
    try { await task; saved = true; }
    finally {
      if (this.#savePromise === task) this.#savePromise = undefined;
      // Drain newer edits after a successful batch, never loop on a failed API.
      if (saved && this.dirty && this.client.connected && !drain) this.#scheduleSave();
    }
    // An explicit profile save must finish the entire imported list before closing.
    if (drain && this.dirty) return this.#save(true);
  }

  async #flush(retryConflict: boolean): Promise<void> {
    if (!this.#data || !this.#base || !this.dirty) return;
    const generation = this.#generation;
    const updates = Object.fromEntries([...this.#pending.entries()].slice(0, MAX_PATCH_ENTRIES));
    const mode = this.#modeDirty ? this.#data.mode : undefined;
    const revision = this.#data.revision;
    this.#lastSaveAt = Date.now();
    this.#status.textContent = "Saving preferences…";
    try {
      const saved = this.#legacyCatalog
        ? await this.client.request<Preferences>("PUT", "/v1/preferences/me", {
          mode: mode ?? this.#base.mode,
          ratings: this.#legacyRatings(updates),
          revision,
        })
        : await this.client.request<Preferences>("PATCH", "/v1/preferences/me", {
          ...(mode ? { mode } : {}),
          updates,
          revision,
        });
      if (generation !== this.#generation || !this.#data) throw new CloudError("session_changed");
      const canonical = { ...saved, ratings: normalizePreferenceRatings(saved.ratings) };
      this.#retryAt = 0;
      this.#rateLimitRetries = 0;
      this.#legacyCatalog = saved.catalogVersion === LEGACY_CATALOG_VERSION;
      for (const [id, value] of Object.entries(updates)) if (sameUpdate(this.#pending.get(id), value)) this.#pending.delete(id);
      if (mode && this.#data.mode === mode) this.#modeDirty = false;
      const localRatings = { ...canonical.ratings };
      for (const [id, value] of this.#pending) {
        if (value === null) delete localRatings[id]; else localRatings[id] = value;
      }
      const localMode = this.#modeDirty ? this.#data.mode : canonical.mode;
      this.#base = structuredClone(canonical);
      this.#data = { ...canonical, mode: localMode, ratings: localRatings };
      this.#mode.value = localMode;
      this.#status.textContent = this.dirty ? "Saved. More changes are waiting…" : "Preferences saved.";
      this.#updateCount();
      this.#emit();
    } catch (error) {
      if (generation !== this.#generation || !this.#data) throw new CloudError("session_changed");
      if (retryConflict && error instanceof CloudError && error.status === 409) {
        let latestRaw: Preferences | undefined;
        try { latestRaw = await this.client.request<Preferences>("GET", "/v1/preferences/me"); }
        catch (refreshError) { error = refreshError; }
        if (generation !== this.#generation || !this.#data) throw new CloudError("session_changed");
        if (latestRaw) {
          const latest = { ...latestRaw, ratings: normalizePreferenceRatings(latestRaw.ratings) };
          const ratings = { ...latest.ratings };
          for (const [id, value] of this.#pending) {
            if (value === null) delete ratings[id]; else ratings[id] = value;
          }
          this.#base = structuredClone(latest);
          this.#data = { ...latest, mode: this.#modeDirty ? this.#data.mode : latest.mode, ratings };
          this.#status.textContent = "Preferences changed on another device. Merged safely and retrying…";
          await this.#flush(false);
          return;
        }
      }
      if (error instanceof CloudError && error.status === 429) {
        this.#retryAt = Date.now() + Math.max(1_000, error.retryAfterMs || 60_000);
        // One timed retry handles a temporary limit without polling a failing API.
        if (++this.#rateLimitRetries === 1) this.#scheduleSave();
      }
      const message = this.#showSaveError(error);
      throw new Error(message);
    }
  }

  #showSaveError(error: unknown): string {
    const message = error instanceof CloudError && error.status === 429
      ? `Cloud save limit reached. Your changes are kept on this screen; retry in ${Math.max(1, Math.ceil((this.#retryAt - Date.now()) / 1000))} seconds.`
      : error instanceof CloudError && error.code === "unknown_preference"
        ? "Cloud needs a preferences catalog update. Your changes are kept on this screen; export them as a backup."
        : error instanceof CloudError && error.status === 401
          ? "Reconnect to KikiLink Cloud to save. Your changes are kept on this screen."
          : "Could not sync preferences. Your changes are kept on this screen; retry when connected.";
    this.#status.replaceChildren(element("span", { text: message }), this.#textButton("Retry", () => this.save().catch(() => {})));
    return message;
  }

  #exportPreferences(): void {
    if (!this.#data) return;
    if (typeof URL.createObjectURL !== "function") throw new Error("This browser cannot create a preferences download.");
    const url = URL.createObjectURL(new Blob([exportPreferences(this.#data.ratings)], { type: "application/json" }));
    const anchor = element("a", { hidden: true });
    anchor.href = url;
    anchor.download = `KikiLink-preferences-${new Date().toISOString().slice(0, 10)}.json`;
    this.element.append(anchor);
    try { anchor.click(); } finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0); }
    this.#status.textContent = "Preference list exported, including any unsaved changes.";
  }

  async #importPreferences(file: File): Promise<void> {
    const generation = this.#generation, token = ++this.#importToken;
    try {
      if (!this.#data) return;
      if (file.size > MAX_PREFERENCES_FILE_BYTES) throw new Error("That preferences file is too large (maximum 64 KB).");
      const imported = importPreferences(await file.text());
      if (generation !== this.#generation || token !== this.#importToken || !this.#data) return;
      const entries = Object.entries(imported.ratings).filter(([id, level]) => this.#supportsItem(id) && (!this.#legacyCatalog || level !== "hard_limit"));
      const skipped = imported.skipped + Object.keys(imported.ratings).length - entries.length;
      if (!entries.length) throw new Error("This file has no preferences supported by your current Cloud server.");
      if (!window.confirm(`Import ${entries.length} preferences? Matching choices will be replaced; other choices and visibility stay the same.`)) return;
      let changed = 0;
      for (const [id, level] of entries) {
        if (this.#data.ratings[id] === level) continue;
        this.#data.ratings[id] = level;
        if (this.#base?.ratings[id] === level && !this.#savePromise) this.#pending.delete(id);
        else this.#pending.set(id, level);
        changed++;
      }
      this.#activeSelector = undefined;
      this.#render();
      this.#changed(`Imported ${changed} changed preferences.${skipped ? ` ${skipped} unsupported entries skipped.` : ""}${this.dirty ? " Saving…" : ""}`);
    } catch (error) {
      if (generation === this.#generation && token === this.#importToken)
        this.#status.textContent = error instanceof Error ? error.message : "Could not import that preferences file.";
    }
  }

  discard(): void {
    clearTimeout(this.#saveTimer);
    this.#saveTimer = undefined;
    this.#resumeDraft = false;
    // Ignore an in-flight response. The request itself may already have reached
    // Cloud, but it must never repopulate a draft the user explicitly discarded.
    this.#generation++;
    if (!this.#base) return;
    this.#data = structuredClone(this.#base);
    this.#pending.clear();
    this.#modeDirty = false;
    this.#activeSelector = undefined;
    this.#mode.value = this.#data.mode;
    this.#render();
    this.#status.textContent = "Unsaved preference changes discarded.";
    this.#emit();
  }

  #availableItems(): PreferenceCatalogItem[] {
    return this.#legacyCatalog
      ? catalog.items.filter(item => LEGACY_CATALOG_IDS.has(item.id))
      : catalog.items;
  }

  #availableCategories(items = this.#availableItems()): string[] {
    return [...new Set(items.map(item => item.category))];
  }

  #supportsItem(id: string): boolean {
    return !this.#legacyCatalog || LEGACY_CATALOG_IDS.has(id);
  }

  #legacyRatings(updates: Record<string, PreferenceLevel | null>): Record<string, number> {
    const ratings = { ...this.#base?.ratings };
    for (const [id, value] of Object.entries(updates)) {
      if (value === null) delete ratings[id];
      else ratings[id] = value;
    }
    return Object.fromEntries(Object.entries(ratings)
      .filter(([id, level]) => LEGACY_CATALOG_IDS.has(id) && level !== "hard_limit")
      .map(([id, level]) => [id, LEGACY_LEVELS[level as Exclude<PreferenceLevel, "hard_limit">]]));
  }

  async #confirmClear(): Promise<void> {
    if (!this.#data) return;
    if (!this.#status.querySelector(".kl-preferences-confirm-clear")) {
      const confirm = this.#textButton("Confirm clear", async () => {
        if (!this.#data) return;
        await this.save();
        if (!this.#data) return;
        const saved = await this.client.request<Preferences>("PUT", "/v1/preferences/me", { mode: this.#data.mode, ratings: {}, revision: this.#data.revision });
        this.#data = { ...saved, ratings: {} };
        this.#base = structuredClone(this.#data);
        this.#pending.clear(); this.#modeDirty = false; this.#status.textContent = "Configured preferences cleared."; this.#render(); this.#emit();
      });
      confirm.classList.add("kl-preferences-confirm-clear");
      this.#status.replaceChildren(element("span", { text: "Clear every configured preference? " }), confirm);
    }
  }

  async #confirmDelete(): Promise<void> {
    if (!this.#status.querySelector(".kl-preferences-confirm-delete")) {
      const confirm = this.#textButton("Confirm deletion", async () => {
        await this.save();
        await this.client.request("DELETE", "/v1/preferences/me");
        await this.load();
      });
      confirm.classList.add("kl-preferences-confirm-delete");
      this.#status.replaceChildren(element("span", { text: "Delete ratings and reset visibility to Private? " }), confirm);
    }
  }

  #textButton(label: string, action: () => void | Promise<void>): HTMLButtonElement {
    const button = element("button", { className: "kl-text-button", type: "button", text: label });
    button.addEventListener("click", () => {
      button.disabled = true;
      const failed = (error: unknown): void => {
        this.#status.textContent = error instanceof Error ? error.message : "Could not complete the action.";
      };
      try { void Promise.resolve(action()).catch(failed).finally(() => { button.disabled = false; }); }
      catch (error) { failed(error); button.disabled = false; }
    });
    return button;
  }

  #updateCount(): void {
    const total = Object.keys(this.#data?.ratings ?? {}).length;
    this.#count.textContent = total ? `${total} set${this.dirty ? " · unsaved" : ""}` : "Set up";
    const retired = Object.keys(this.#data?.ratings ?? {}).filter(id => !catalogById.has(id));
    this.#count.title = retired.length ? `${retired.length} retired preferences are preserved but excluded from Compatibility.` : "";
  }

  #emit(): void { for (const listener of this.#listeners) listener(); }

  #reset(): void {
    clearTimeout(this.#saveTimer);
    this.#resumeDraft = false;
    this.#generation++;
    this.#data = this.#base = undefined;
    this.#pending.clear();
    this.#modeDirty = false;
    this.#legacyCatalog = false;
    this.#lastSaveAt = this.#retryAt = this.#rateLimitRetries = 0;
    this.#activeSelector = undefined;
    this.#busy = false;
    this.#body.replaceChildren();
    this.#count.textContent = "";
    this.#emit();
  }

  destroy(): void {
    clearTimeout(this.#saveTimer);
    this.#generation++;
    this.#unsubscribe();
    this.#listeners.clear();
    this.#data = this.#base = undefined;
    this.element.remove();
  }
}

export function preferenceSummary(
  ratings: Record<string, PreferenceLevel>,
  options: { title?: string; onOpen?: () => void; maximumPerGroup?: number } = {},
): HTMLElement {
  const root = element("section", { className: "kl-profile-preferences" });
  const heading = options.onOpen
    ? element("button", { type: "button", className: "kl-profile-preferences-heading" },
        element("span", {}, kikiIcon("heart"), options.title ?? "Preferences"), kikiIcon("next"))
    : element("div", { className: "kl-profile-preferences-heading" }, element("span", {}, kikiIcon("heart"), options.title ?? "Preferences"));
  if (heading instanceof HTMLButtonElement && options.onOpen) heading.addEventListener("click", options.onOpen);
  root.append(heading);
  const groups = configuredPreferenceGroups(ratings);
  if (!groups.length) {
    root.append(element("p", { className: "kl-profile-preferences-empty", text: "No preferences shared yet." }));
    return root;
  }
  const maximum = options.maximumPerGroup ?? 6;
  for (const group of groups) {
    const chips = element("div", { className: "kl-profile-preference-chips" });
    for (const item of group.items.slice(0, maximum)) chips.append(element("span", { text: item.label, title: `${item.label}: ${PREFERENCE_LEVEL_LABELS[group.level]}` }));
    if (group.items.length > maximum) chips.append(element("span", { text: `+${group.items.length - maximum}`, title: group.items.slice(maximum).map(item => item.label).join(", ") }));
    const section = element("div", { className: "kl-profile-preference-group" }, element("strong", { text: group.label }), chips);
    section.dataset.level = group.level;
    root.append(section);
  }
  return root;
}

export function compatibilityDetails(
  result: Compatibility,
  options: { setMine?: (id: string, level: PreferenceLevel | undefined) => Promise<void> } = {},
): HTMLElement {
  const root = element("div", { className: "kl-compatibility-details" });
  const label = result.status === "available" ? `${result.score}% compatibility`
    : result.status === "insufficient" ? "Not enough shared preferences"
      : result.status === "opt_in_required" ? "Enable Compatibility sharing in Preferences"
        : "Preferences are private or unavailable";
  root.append(element("h3", { text: label }));
  if (result.count !== undefined) root.append(element("p", { className: "kl-compatibility-count", text: `${result.count} preference${result.count === 1 ? "" : "s"} compared · at least 5 are needed for a score` }));
  if (result.hardLimitConflictCount) root.append(
    element("div", { className: "kl-hard-limit-notice" }, kikiIcon("warning"),
      element("div", {}, element("strong", { text: "Hard Limit Conflict" }),
        element("p", { text: `${result.hardLimitConflictCount} shared preference${result.hardLimitConflictCount === 1 ? " has" : "s have"} a hard limit on one side and Like or Love on the other. Boundaries take priority over the score.` }))),
  );
  root.append(element("p", { className: "kl-compatibility-explanation", text: "Only preferences explicitly set by both people are compared. Not Set is excluded; Neutral remains an explicit choice. This is a conversation aid, not consent." }));
  if (!result.shared && (result.status === "available" || result.status === "insufficient")) {
    root.append(element("p", { text: "Compatibility-only privacy is enabled, so the detailed ratings are not available." }));
    return root;
  }
  if (!result.shared) return root;
  const definitions = [
    ["hard_limit", "Hard Limit Conflicts"],
    ["strong", "Strong Matches"],
    ["match", "Matches"],
    ["minor", "Neutral / Minor Differences"],
    ["conflict", "Conflicts"],
  ] as const;
  for (const [section, title] of definitions) {
    const entries = result.shared.filter(entry => compatibilitySection(entry) === section);
    if (!entries.length) continue;
    const group = element("section", { className: "kl-compatibility-section" }, element("h4", {}, element("span", { text: title }), element("small", { text: String(entries.length) })));
    group.dataset.section = section;
    for (const entry of entries) {
      const item = catalogById.get(entry.id);
      if (!item) continue;
      const copy = element("div", { className: "kl-compatibility-item-copy" },
        element("strong", { text: item.label }),
        element("span", { text: `You: ${PREFERENCE_LEVEL_LABELS[entry.yours]} · Them: ${PREFERENCE_LEVEL_LABELS[entry.theirs]}` }),
      );
      const row = element("div", { className: "kl-compatibility-item" }, copy);
      if (options.setMine) {
        const edit = element("button", { type: "button", className: "kl-text-button kl-compatibility-edit", text: "Quick edit" });
        edit.addEventListener("click", () => {
          const existing = row.querySelector(".kl-compatibility-quick-editor");
          if (existing) { existing.remove(); return; }
          const editor = element("div", { className: "kl-compatibility-quick-editor", role: "group", ariaLabel: `Set my preference for ${item.label}` });
          const choices: Array<{ level: PreferenceLevel | undefined; label: string }> = [
            ...PREFERENCE_LEVELS.map(level => ({ level, label: PREFERENCE_LEVEL_LABELS[level] })),
            { level: undefined, label: "Not Set" },
          ];
          for (const { level, label } of choices) {
            const choice = element("button", { type: "button", text: label });
            choice.dataset.level = level ?? "not_set";
            choice.setAttribute("aria-pressed", String(level === entry.yours));
            choice.addEventListener("click", () => {
              const nextLevel = level === undefined ? undefined : preferenceLevelAfterTap(entry.yours, level);
              for (const button of editor.querySelectorAll<HTMLButtonElement>("button")) button.disabled = true;
              void options.setMine!(entry.id, nextLevel).then(() => {
                const shared = nextLevel === undefined
                  ? result.shared!.filter(candidate => candidate !== entry)
                  : result.shared!.map(candidate => candidate === entry ? { ...candidate, yours: nextLevel } : candidate);
                root.replaceWith(compatibilityDetails(recalculateCompatibility(result, shared), options));
              }).catch(() => {
                for (const button of editor.querySelectorAll<HTMLButtonElement>("button")) button.disabled = false;
                editor.append(element("small", { text: "Could not save. Retry when connected." }));
              });
            });
            editor.append(choice);
          }
          row.append(editor);
        });
        row.append(edit);
      }
      group.append(row);
    }
    root.append(group);
  }
  return root;
}

function recalculateCompatibility(result: Compatibility, shared: NonNullable<Compatibility["shared"]>): Compatibility {
  const count = shared.length;
  const hardLimitConflictCount = shared.filter(entry => isHardLimitConflict(entry.yours, entry.theirs)).length;
  const { score: _oldScore, hardLimitConflictCount: _oldConflicts, ...base } = result;
  return {
    ...base,
    status: count >= 5 ? "available" : "insufficient",
    count,
    ...(count >= 5
      ? { score: Math.round(shared.reduce((sum, entry) => sum + preferenceSimilarity(entry.yours, entry.theirs), 0) / count * 100) }
      : {}),
    ...(hardLimitConflictCount ? { hardLimitConflictCount } : {}),
    shared,
  };
}
