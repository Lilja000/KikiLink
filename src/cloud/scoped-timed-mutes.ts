import type { KeyValueStorage } from '../core/settings';
import { conversationMuted } from '../modules/link-chat/conversation-mute';

/** Only currently accessible targets are indexed; each device record holds one deadline. */
export class ScopedTimedMutes<Scope> {
  #deadlines = new Map<string, number>();
  #rows: readonly Scope[] | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly storage: KeyValueStorage, private readonly prefix: string,
    private readonly suffix: (scope: Scope) => string, private readonly subject: 'Channel' | 'Group',
    private readonly changed: () => void) {
    if (typeof window !== 'undefined') window.addEventListener('storage', this.#storageChanged);
  }

  #key(row: Scope): string { return this.prefix + this.suffix(row); }

  #read(key: string): number {
    const read = this.storage.getPersistedItemResult?.(key) ?? this.storage.getItemResult?.(key);
    if (read && !read.ok) throw new Error(`${this.subject} notification settings could not be read on this device.`);
    const raw = read ? read.value : this.storage.getItem(key);
    const until = Number(raw);
    return Number.isSafeInteger(until) && conversationMuted(until) ? until : 0;
  }

  #load(key: string): number {
    try { return this.#read(key); }
    catch { return this.#deadlines.get(key) ?? 0; }
  }

  sync(rows: readonly Scope[]): void {
    if (this.#rows === rows) return;
    this.#rows = rows;
    const next = new Map<string, number>();
    for (const row of rows) {
      const key = this.#key(row);
      next.set(key, this.#deadlines.get(key) ?? this.#load(key));
    }
    this.#deadlines = next;
    this.#schedule();
  }

  has(row: Scope): boolean { return this.#deadlines.has(this.#key(row)); }

  until(row: Scope): number {
    const until = this.#deadlines.get(this.#key(row)) ?? 0;
    return conversationMuted(until) ? until : 0;
  }

  set(row: Scope, until: number): void {
    if (until !== 0 && (!Number.isSafeInteger(until) || !conversationMuted(until))) throw new Error('Choose a current mute duration.');
    const key = this.#key(row);
    if (!this.#deadlines.has(key)) throw new Error(`This ${this.subject.toLowerCase()} is no longer available.`);
    if (until === 0) this.storage.removeItem(key);
    else if (this.storage.setItemVerified) this.storage.setItemVerified(key, String(until));
    else this.storage.setItem(key, String(until));
    if (this.#read(key) !== until) throw new Error(`${this.subject} notification settings could not be saved on this device.`);
    this.#deadlines.set(key, until);
    this.#schedule();
    this.changed();
  }

  readonly #storageChanged = (event: StorageEvent): void => {
    if (event.key !== null && !event.key.includes(this.prefix)) return;
    let changed = false;
    for (const [key, old] of this.#deadlines) {
      // AccountKeyValueStorage prefixes native storage keys with the BC account.
      if (event.key !== null && !event.key.endsWith(key)) continue;
      const next = this.#load(key);
      if (next === old) continue;
      this.#deadlines.set(key, next);
      changed = true;
    }
    if (changed) { this.#schedule(); this.changed(); }
  };

  #schedule(): void {
    clearTimeout(this.#timer);
    const now = Date.now();
    let next = Infinity;
    for (const until of this.#deadlines.values()) if (until > now) next = Math.min(next, until);
    if (!Number.isFinite(next)) return;
    this.#timer = setTimeout(() => {
      const now = Date.now();
      let expired = false;
      for (const [key, until] of this.#deadlines) {
        if (until > 0 && until <= now) { this.#deadlines.set(key, 0); expired = true; }
      }
      this.#schedule();
      if (expired) this.changed();
    }, Math.min(2_147_483_647, Math.max(1, next - now)));
  }

  destroy(): void {
    clearTimeout(this.#timer);
    if (typeof window !== 'undefined') window.removeEventListener('storage', this.#storageChanged);
    this.#deadlines.clear();
  }
}
