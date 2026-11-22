import { accountControlPath, accountControlRead, reviewAccountControl } from "../../cloud/account-control-generation";
import type { CloudClient } from "../../cloud/client";

/** Only the owner's block identifiers are needed by the directory. */
export class PeopleRestrictions {
  #members = new Set<number>();
  #owner = 0;
  #origin = "";
  get members(): ReadonlySet<number> {
    this.#checkOwner();
    return this.#members;
  }
  #checkOwner(): void {
    if (this.#owner === this.client.memberNumber && this.#origin === this.client.origin) return;
    this.#owner = this.client.memberNumber;
    this.#origin = this.client.origin;
    this.#members.clear();
    this.#loading = undefined;
    this.#epoch++;
    this.state = "idle";
  }
  state: "idle" | "loading" | "ready" | "error" = "idle";
  #epoch = 0;
  #loading: Promise<void> | undefined;
  constructor(readonly client: CloudClient, readonly current: () => boolean, readonly changed: () => void) {}
  invalidate(): void {
    this.#loading = undefined;
    this.#epoch++;
    this.#checkOwner();
    this.state = "idle";
  }
  async load(revalidate = false): Promise<void> {
    this.#checkOwner();
    if (this.#loading) return this.#loading;
    const quiet = revalidate && this.state === "ready";
    if ((!quiet && this.state !== "idle") || !this.current() || !this.client.connected) return;
    const task = this.#read(quiet);
    this.#loading = task;
    try { await task; } finally { if (task === this.#loading) this.#loading = undefined; }
  }
  async #read(quiet: boolean): Promise<void> {
    const epoch = ++this.#epoch;
    const owner = this.client.memberNumber, origin = this.client.origin;
    const current = () => this.current() && this.client.connected && epoch === this.#epoch &&
      this.client.memberNumber === owner && this.client.origin === origin;
    if (!quiet) this.state = "loading";
    try {
      const review = await reviewAccountControl(this.client, current);
      if (!current()) return;
      const data = accountControlRead<{items: Array<{memberNumber: number}>}>(
        await this.client.request("GET", accountControlPath("/v1/blocks", review)), review);
      if (!current()) return;
      if (!Array.isArray(data?.items) || data.items.some(item => !item || !Number.isSafeInteger(item.memberNumber) || item.memberNumber <= 0))
        throw new Error("Invalid block list");
      const next = new Set(data.items.map(item => item.memberNumber).filter(id => id !== owner));
      if (quiet && next.size === this.#members.size && [...next].every(id => this.#members.has(id))) return;
      this.#members = next;
      this.state = "ready";
    } catch {
      if (!current()) return;
      this.state = "error";
    }
    if (current()) this.changed();
  }
}
