import type { KeyValueStorage } from "../../core/settings";
import type { LinkMessage } from "../../core/types";

/** Personal presentation overrides live alongside account settings. The transport
 * envelope, retry payload, delivery receipts and imported source remain intact. */
interface Change { key: string; peer: number; at: number; text: string | null }
const LIMIT = 2000;
export class DirectPresentation {
  readonly #key: string;
  readonly #session = new Map<string, Change>();
  #source: string | null | undefined;
  #saved = new Map<string, Change>();

  constructor(readonly storage: KeyValueStorage, owner: number, readonly origin: () => string) {
    this.#key = `kikilink:direct-presentation:${owner}:v1`;
  }
  #identity(message: LinkMessage): string {
    const cloud = !!(message.cloudId || message.clientMessageId || message.id.startsWith("cloud-"));
    const identity = cloud ? [this.origin(), message.cloudGeneration ?? "legacy", message.clientMessageId || message.cloudId || message.id]
      : ["native", message.id, message.sentAt];
    return JSON.stringify([message.peerNumber, ...identity]);
  }
  #load(): void {
    const bytes = this.storage.getItem(this.#key);
    if (bytes === this.#source) return;
    const entries: unknown = bytes === null ? [] : JSON.parse(bytes);
    if (!Array.isArray(entries) || entries.length > LIMIT) throw new Error("Saved local message changes are unavailable.");
    const saved = new Map<string, Change>();
    for (const row of entries) {
      if (typeof row?.key !== "string" || row.key.length > 700 || !Number.isSafeInteger(row.peer) || row.peer <= 0 ||
          !Number.isSafeInteger(row.at) || row.at < 0 || row.text !== null && (typeof row.text !== "string" || row.text.length > 2000))
        throw new Error("Saved local message changes are unavailable.");
      saved.set(row.key, row);
    }
    this.#source = bytes; this.#saved = saved;
  }
  #store(next: Map<string, Change>): void {
    if (next.size > LIMIT) throw new Error("Local message change storage is full.");
    const value = JSON.stringify([...next.values()]);
    if (this.storage.setItemVerified) this.storage.setItemVerified(this.#key, value);
    else this.storage.setItem(this.#key, value);
    if (this.storage.getItem(this.#key) !== value) throw new Error("Could not save local message changes.");
    this.#source = value; this.#saved = next;
  }
  hasPeer(peer: number): boolean {
    try { this.#load(); } catch { return true; }
    for (const changes of [this.#session, this.#saved]) for (const row of changes.values()) if (row.peer === peer) return true;
    return false;
  }
  project(message: LinkMessage): LinkMessage | undefined {
    if (message.direction !== "outgoing") return message;
    try { this.#load(); } catch { return; }
    const key = this.#identity(message), change = this.#session.get(key) ?? this.#saved.get(key);
    if (!change) return message;
    if (change.text === null) return;
    const copy = { ...message, content: change.text, localEdited: true };
    delete copy.cloudMentions;
    return copy;
  }
  change(message: LinkMessage, text: string | null, persist: boolean): void {
    const displayed = this.project(message);
    if (message.direction !== "outgoing" || !displayed || text !== null &&
        (text.length > 2000 || !text.trim() && !message.cloudMediaIds?.length && !message.cloudAudioIds?.length && !message.archivedAttachments))
      throw new Error("This message cannot be changed.");
    const key = this.#identity(message), row = { key, peer: message.peerNumber, at: message.sentAt, text: text === null ? null : text.trim() };
    if (persist) {
      const next = new Map(this.#saved); next.set(key, row); this.#store(next); this.#session.delete(key);
    } else this.#session.set(key, row);
  }
  clear(): void {
    if (this.storage.getItem(this.#key) !== null) this.#store(new Map());
    this.#session.clear();
  }
  forget(matches: (row: Change) => boolean): void {
    this.#load();
    const next = new Map(this.#saved);
    for (const [key, row] of next) if (matches(row)) next.delete(key);
    if (next.size !== this.#saved.size) this.#store(next);
    for (const [key, row] of this.#session) if (matches(row)) this.#session.delete(key);
  }
}
