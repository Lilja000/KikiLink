import type { KeyValueStorage } from "./settings";

/** KikiLink-only contact restrictions belonging to the active BC account. */
export class LocalProfileRestrictions {
  readonly #key: string;
  #bytes: string | null | undefined;
  #members = new Set<number>();
  constructor(readonly kind: "block" | "ghost", readonly owner: number, readonly storage: KeyValueStorage, readonly current: () => boolean) {
    this.#key = `kikilink:platform:${kind}s:${owner}:v1`;
  }
  invalidate(): void { this.#bytes = undefined; }
  get members(): ReadonlySet<number> {
    if (!this.current()) return new Set();
    if (this.#bytes !== undefined) return this.#members;
    const read = this.storage.getItemResult?.(this.#key);
    if (read && !read.ok) throw new Error("Local restrictions could not be read.");
    const stored = read?.ok ? read.value : this.storage.getItem(this.#key);
    if (stored !== this.#bytes) {
      const list: unknown = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list) || list.some(id => !Number.isSafeInteger(id) || id <= 0 || id === this.owner)) throw new Error("Local restrictions could not be read.");
      this.#members = new Set(list);
      this.#bytes = stored;
    }
    return this.#members;
  }
  has(member: number): boolean {
    if (!this.current() || member === this.owner) return false;
    try { return this.members.has(member); } catch { return true; }
  }
  set(member: number, hidden: boolean): void {
    if (!this.current() || !Number.isSafeInteger(member) || member <= 0 || member === this.owner) throw new Error("This profile is unavailable.");
    this.invalidate();
    const members = new Set(this.members);
    if (hidden) members.add(member);
    else members.delete(member);
    const bytes = JSON.stringify([...members]);
    if (this.storage.setItemVerified) this.storage.setItemVerified(this.#key, bytes);
    else this.storage.setItem(this.#key, bytes);
    const read = this.storage.getPersistedItemResult?.(this.#key) ?? this.storage.getItemResult?.(this.#key);
    if (read ? !read.ok || read.value !== bytes : this.storage.getItem(this.#key) !== bytes) throw new Error("Local restrictions could not be saved.");
    this.#members = members;
    this.#bytes = bytes;
  }
}
