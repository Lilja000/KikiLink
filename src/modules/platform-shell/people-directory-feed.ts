import type { CloudClient } from "../../cloud/client";
import { element } from "../../utils/dom";
import { readPeopleDirectoryPages, type PeopleDirectoryPerson } from "./people-directory";

/** Public identities are held only while All is visible and the same account can read the directory. */
export class PeopleDirectoryFeed {
  readonly element = element("div", { className: "kl-directory-feed-footer" });
  readonly #status = element("span", { className: "kl-setting-help" });
  readonly #action = element("button", { type: "button", className: "kl-text-button" });
  readonly #unsubscribe: () => void;
  #release: (() => void) | undefined;
  #query: string | undefined;
  #rows: PeopleDirectoryPerson[] = [];
  #next: number | null = null;
  #suggestions: number | undefined;
  #generation = 0;
  #pages = 0;
  #foreground = false;
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(readonly client: CloudClient, readonly options: {
    current(): boolean;
    blocked(member: number): boolean;
    changed(): void;
  }) {
    this.#status.setAttribute("role", "status");
    this.element.append(this.#status, this.#action);
    this.element.hidden = true;
    this.#action.addEventListener("click", () => {
      if (this.#current() && !this.#action.hidden && !this.#action.disabled)
        void this.#load(++this.#generation, this.#next ?? 0);
    });
    this.#unsubscribe = client.subscribe((kind, cause) => {
      if (this.#query === undefined) return;
      if (!["profiles-cleared", "profile-discovery", "privacy", "matching", "relationships", "session", "connection", "ready"].includes(kind)) return;
      if (!this.options.current()) { this.hide(); return; }
      if (kind === "profiles-cleared" && cause === "ready") return; // followed immediately by ready
      const routine = kind === "ready" || kind === "matching";
      if (routine && this.#foreground) return;
      const quiet = this.#pages > 0 && this.#current() && routine;
      this.#restart(0, quiet);
      if (!quiet) this.options.changed();
    });
  }

  #current(): boolean {
    return this.#query !== undefined && this.options.current() && this.client.connected;
  }

  get items(): readonly PeopleDirectoryPerson[] {
    if (!this.#current()) return [];
    return this.#rows.filter(person => !this.client.isProfileBlocked(person.memberNumber) && !this.options.blocked(person.memberNumber));
  }

  get awaitingResults(): boolean {
    return this.#current() && !this.#rows.length && !this.#status.hidden;
  }

  show(query: string): void {
    if (!this.options.current()) { this.hide(); return; }
    const normalized = query.trim().slice(0, 80);
    if (normalized === this.#query) return;
    const typing = this.#query !== undefined;
    this.#query = normalized;
    this.#release ??= this.client.retainEvents();
    this.#restart(typing ? 180 : 0);
  }

  #restart(delay: number, quiet = false): void {
    const generation = ++this.#generation;
    clearTimeout(this.#timer);
    if (!quiet) { this.#rows = []; this.#next = null; this.#pages = 0; }
    if (!this.#current()) { this.#foreground = false; this.#display(""); return; }
    if (!quiet) { this.#foreground = true; this.#display("Loading shared profiles…"); }
    this.#timer = setTimeout(() => { void this.#load(generation, 0, quiet); }, delay);
  }

  async #load(generation: number, cursor: number, quiet = false): Promise<void> {
    const owner = this.client.memberNumber, origin = this.client.origin, query = this.#query;
    const current = () => this.#current() && generation === this.#generation && this.client.memberNumber === owner && this.client.origin === origin;
    if (!current() || query === undefined) return;
    const pages = quiet ? this.#pages : 1;
    if (!quiet) { this.#foreground = true; this.#display("Loading shared profiles…"); }
    try {
      if (!cursor) {
        const me = await this.client.request<{ memberNumber: number; features?: { profileDiscovery?: boolean; peopleSuggestions?: boolean } }>("GET", "/v1/me");
        if (!current()) return;
        if (me.memberNumber !== owner) throw new Error("Account changed");
        this.#suggestions = me.features?.peopleSuggestions === true && !query ? Math.floor(Date.now() / 86400000) : undefined;
        if (me.features?.profileDiscovery !== true) {
          this.#rows = []; this.#next = null; this.#pages = 0;
          this.#display("");
          this.options.changed();
          return;
        }
      }
      const page = await readPeopleDirectoryPages(this.client, owner, query, cursor, pages, this.#suggestions, current);
      if (!page || !current()) return;
      if (quiet && page.nextCursor === this.#next && JSON.stringify(page.items) === JSON.stringify(this.#rows)) return;
      this.#pages = cursor ? this.#pages + 1 : pages;
      const prior = new Set(this.#rows.map(row => row.memberNumber));
      if (cursor && page.items.some(row => prior.has(row.memberNumber))) throw new Error("Directory changed");
      this.#rows = cursor ? this.#rows.concat(page.items) : page.items;
      this.#next = page.nextCursor;
      this.#display("", this.#next === null ? "" : "More profiles");
    } catch {
      if (!current()) return;
      // A rejected page may reflect a visibility change. Retry against a fresh first page.
      this.#rows = [];
      this.#next = null; this.#pages = 0;
      this.#display("Shared profiles could not load.", "Retry");
    } finally {
      if (generation === this.#generation) this.#foreground = false;
    }
    this.options.changed();
  }

  #display(status: string, action = ""): void {
    this.element.hidden = !status && !action;
    this.#status.textContent = status;
    this.#status.hidden = !status;
    this.#action.textContent = action;
    this.#action.hidden = !action;
    this.#action.disabled = !action;
  }

  hide(): void {
    if (this.#query === undefined) return;
    this.#query = undefined; this.#pages = 0; this.#foreground = false;
    this.#generation++;
    clearTimeout(this.#timer);
    this.#rows = [];
    this.#next = null;
    this.#display("");
    this.#release?.();
    this.#release = undefined;
  }

  destroy(): void { this.hide(); this.#unsubscribe(); }
}
