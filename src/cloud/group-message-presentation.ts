import type { KeyValueStorage } from '../core/settings';
import type { CloudGroup, CloudMessage } from './types';

interface Change { id: string; at: number; text: string | null }
interface Scope { groupId: string; conversationId: string; generation: string }
export type GroupPresentationTarget = Pick<CloudGroup, 'id' | 'conversationId'>;

/** Device-only overlays. Cloud history, receipts and moderation always retain the original message. */
export class GroupMessagePresentation {
  readonly #session = new Map<string, Change>();
  readonly #key: string;
  #bytes: string | null | undefined;
  #changes: Change[] = [];
  #nextExpiry = Infinity;
  #days = Infinity;
  constructor(readonly storage: KeyValueStorage, readonly owner: number, origin: string, readonly retentionDays: () => number = () => Infinity) {
    this.#key = 'kikilink:group-presentation:' + owner + ':' + encodeURIComponent(origin) + ':v1';
  }
  clearSession(): void { this.#session.clear(); }
  clear(): void {
    if (this.storage.getItem(this.#key) !== null) {
      this.storage.removeItem(this.#key);
      if (this.storage.getItem(this.#key) !== null) throw new Error('Could not clear local group message changes.');
    }
    this.#session.clear(); this.#bytes = null; this.#changes = [];
  }
  #scope(group: GroupPresentationTarget, generation: string | undefined): string {
    const scope: Scope = { groupId: group.id, conversationId: group.conversationId, generation: generation ?? 'legacy' };
    return JSON.stringify(scope);
  }
  #identity(message: CloudMessage): string {
    return JSON.stringify([message.id, message.sequence, message.createdAt]);
  }
  #read(): Change[] {
    const bytes = this.storage.getItem(this.#key);
    const days=this.retentionDays(), now=Date.now();
    if (this.#bytes === bytes && days===this.#days && now<this.#nextExpiry) return this.#changes;
    const rows: unknown = bytes === null ? [] : JSON.parse(bytes);
    if (!Array.isArray(rows) || rows.length > 500 || rows.some(row => !row || typeof row.id !== 'string' || !Number.isSafeInteger(row.at) ||
        !(row.text === null || typeof row.text === 'string' && row.text.length <= 2000))) {
      throw new Error('Saved local message changes could not be read.');
    }
    const retention = days * 86_400_000;
    const live: Change[] = rows.filter(row=>row.at+retention>now);
    this.#days=days;
    this.#nextExpiry=live.reduce((old,row)=>Math.min(old,row.at+retention),Infinity);
    this.#changes = live; this.#bytes = bytes;
    if(live.length !== rows.length) {
      const remaining=JSON.stringify(live);
      if(this.storage.setItemVerified)this.storage.setItemVerified(this.#key,remaining);
      else this.storage.setItem(this.#key,remaining);
      this.#bytes=remaining;
    }
    return live;
  }
  project(group: GroupPresentationTarget, generation: string | undefined, message: CloudMessage): CloudMessage | undefined {
    if (message.sender !== this.owner || message.conversationId !== group.conversationId || message.text === null || message.deletedAt != null) return message;
    const id = this.#scope(group, generation) + this.#identity(message);
    let change = this.#session.get(id);
    if (!change) {
      try { change = this.#read().find(row => row.id === id); }
      catch { return message; }
    }
    if (!change) return message;
    if (change.text === null) return;
    const copy = { ...message, text: change.text };
    delete copy.mentions;
    return copy;
  }
  change(group: GroupPresentationTarget, generation: string | undefined, message: CloudMessage, text: string | null, persist: boolean): void {
    if (message.conversationId !== group.conversationId || message.sender !== this.owner || message.text === null || message.deletedAt != null ||
        !this.project(group, generation, message) || text !== null && (text.length > 2000 || !text.trim() && !message.mediaIds?.length && !message.audioIds?.length)) {
      throw new Error('This message is unavailable.');
    }
    const id = this.#scope(group, generation) + this.#identity(message);
    const change = { id, at: message.createdAt, text: text === null ? null : text.trim() };
    if (!persist || message.createdAt + this.retentionDays()*86_400_000 <= Date.now()) { this.#session.set(id, change); return; }
    const rows = this.#read().filter(row => row.id !== id);
    if (rows.length >= 500) throw new Error('Local message change storage is full.');
    const bytes = JSON.stringify([...rows, change]);
    if (this.storage.setItemVerified) this.storage.setItemVerified(this.#key, bytes); else this.storage.setItem(this.#key, bytes);
    if (this.storage.getItem(this.#key) !== bytes) throw new Error('Could not save the local message change.');
    this.#session.delete(id);
  }
}
