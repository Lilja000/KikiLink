import type { CloudClient } from "../../cloud/client";
import { element } from "../../utils/dom";
import { readPeopleDirectory, type PeopleDirectoryPerson } from "./people-directory";

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
  #generation = 0;
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
        void this.#load(this.#generation, this.#next ?? 0);
    });
    this.#unsubscribe = client.subscribe(kind => {
      if (this.#query === undefined) return;
      if (!["profiles-cleared", "profile-discovery", "privacy", "session", "connection", "ready"].includes(kind)) return;
      if (!this.options.current()) { this.hide(); return; }
      this.#restart(0);
      this.options.changed();
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

  #restart(delay: number): void {
    const generation = ++this.#generation;
    clearTimeout(this.#timer);
    this.#rows = [];
    this.#next = null;
    if (!this.#current()) { this.#display(""); return; }
    this.#display("Loading shared profiles…");
    this.#timer = setTimeout(() => { void this.#load(generation, 0); }, delay);
  }

  async #load(generation: number, cursor: number): Promise<void> {
    const owner = this.client.memberNumber, origin = this.client.origin, query = this.#query;
    const current = () => this.#current() && generation === this.#generation && this.client.memberNumber === owner && this.client.origin === origin;
    if (!current() || query === undefined) return;
    this.#display("Loading shared profiles…");
    try {
      if (!cursor) {
        const me = await this.client.request<{ memberNumber: number; features?: { profileDiscovery?: boolean } }>("GET", "/v1/me");
        if (!current()) return;
        if (me.memberNumber !== owner) throw new Error("Account changed");
        if (me.features?.profileDiscovery !== true) {
          this.#display("");
          this.options.changed();
          return;
        }
      }
      const page = await readPeopleDirectory(this.client, owner, query, 20, cursor);
      if (!current()) return;
      this.#rows = cursor ? this.#rows.concat(page.items) : page.items;
      this.#next = page.nextCursor;
      this.#display("", this.#next === null ? "" : "More profiles");
    } catch {
      if (!current()) return;
      // A rejected page may reflect a visibility change. Retry against a fresh first page.
      this.#rows = [];
      this.#next = null;
      this.#display("Shared profiles could not load.", "Retry");
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
    this.#query = undefined;
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
