import type {KeyValueStorage} from '../../core/settings';

export type ArchiveTarget = {kind: 'direct'; peer: number} | {kind: 'group'; origin: string; generation: string; id: string; conversationId: string};
export interface ArchivedGroupDraft {text: string; clientId: string; mediaIds?: string[]; audioIds?: string[]}
interface Entry {target: ArchiveTarget; archived: boolean; draft?: ArchivedGroupDraft}
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function validTarget(v: unknown): v is ArchiveTarget {
  if (!object(v)) return false;
  if (v.kind === 'direct') return Object.keys(v).length === 2 && Number.isSafeInteger(v.peer) && (v.peer as number) > 0;
  return v.kind === 'group' && Object.keys(v).length === 5 && typeof v.origin === 'string' && /^https?:\/\/[^\s]{1,250}$/u.test(v.origin)
    && typeof v.generation === 'string' && /^(?:legacy|[a-f0-9]{32})$/u.test(v.generation)
    && typeof v.id === 'string' && /^[\w-]{1,80}$/u.test(v.id) && typeof v.conversationId === 'string' && /^[\w-]{1,80}$/u.test(v.conversationId);
}
function validDraft(v: unknown): v is ArchivedGroupDraft {
  return object(v) && Object.keys(v).every(k => ['text','clientId','mediaIds','audioIds'].includes(k))
    && typeof v.text === 'string' && v.text.length <= 4000 && typeof v.clientId === 'string' && uuid.test(v.clientId)
    && ['mediaIds','audioIds'].every(k => v[k] === undefined || Array.isArray(v[k]) && (v[k] as unknown[]).length <= 4 && (v[k] as unknown[]).every(id => typeof id === 'string' && uuid.test(id)));
}
const identity = (t: ArchiveTarget): string => t.kind === 'direct' ? `direct:${t.peer}` : JSON.stringify([t.origin,t.generation,t.id,t.conversationId]);

/** Device-only organization. Never removes messages, read cursors or retry intents.
 * Cloud group snapshots are bound to their origin, recovery generation and conversation.
 * Separate instances reread the same owner key before changing it. */
export class ConversationArchive {
  readonly #key: string;
  #raw: string | null | undefined;
  #entries = new Map<string, Entry>();
  constructor(readonly owner: number, readonly storage: KeyValueStorage, readonly current: () => boolean = () => true) {
    this.#key = `kikilink:conversation-archive:${owner}:v1`;
  }
  #read(): void {
    if (!this.current()) throw new Error('The account changed. Reopen this conversation.');
    const raw = this.storage.getItem(this.#key);
    if (raw === this.#raw) return;
    const entries = new Map<string, Entry>();
    if (raw !== null) {
      if (raw.length > 2_500_000) throw new Error('The saved archive list is too large.');
      const v: unknown = JSON.parse(raw);
      if (!object(v) || Object.keys(v).some(k=>!['version','owner','entries'].includes(k)) || v.version !== 1 || v.owner !== this.owner || !Array.isArray(v.entries) || v.entries.length > 500) throw new Error('The saved archive list is unavailable.');
      for (const row of v.entries) {
        if (!object(row) || Object.keys(row).some(k=>!['target','archived','draft'].includes(k)) || !validTarget(row.target) || typeof row.archived !== 'boolean' || row.draft !== undefined && (row.target.kind !== 'group' || !validDraft(row.draft))) throw new Error('The saved archive list is unavailable.');
        const key = identity(row.target); if (entries.has(key)) throw new Error('The saved archive list is unavailable.');
        entries.set(key, {target: row.target, archived: row.archived, ...(row.draft ? {draft: row.draft as ArchivedGroupDraft} : {})});
      }
    }
    this.#entries = entries; this.#raw = raw;
  }
  archived(target: ArchiveTarget): boolean { this.#read(); return this.#entries.get(identity(target))?.archived ?? false; }
  draft(target: ArchiveTarget): ArchivedGroupDraft | undefined { this.#read(); const draft = this.#entries.get(identity(target))?.draft; return draft && structuredClone(draft); }
  set(target: ArchiveTarget, archived: boolean, draft?: ArchivedGroupDraft): void {
    if (!validTarget(target) || draft !== undefined && (target.kind !== 'group' || !validDraft(draft))) throw new Error('This conversation cannot be archived. Refresh it and try again.');
    this.#read(); const entries = new Map(this.#entries), key = identity(target), savedDraft = draft ?? entries.get(key)?.draft;
    if (!archived && !savedDraft) entries.delete(key);
    else entries.set(key, {target: structuredClone(target), archived, ...(savedDraft ? {draft: structuredClone(savedDraft)} : {})});
    this.#save(entries);
  }
  /** Once a restored draft is edited or submitted, it belongs to the normal editor.
   * Never replay an archived snapshot as a new send after an uncertain response. */
  forgetDraft(target: ArchiveTarget): void {
    this.#read(); const key = identity(target), previous = this.#entries.get(key);
    if (!previous?.draft) return;
    const entries = new Map(this.#entries);
    if (previous.archived) throw new Error('Restore this conversation before changing its draft.');
    entries.delete(key); this.#save(entries);
  }
  #save(entries: Map<string, Entry>): void {
    if (entries.size > 500) throw new Error('The archive list is full. Restore a conversation before archiving another.');
    const raw = JSON.stringify({version: 1, owner: this.owner, entries: [...entries.values()]});
    if (raw.length > 2_500_000 || !this.current()) throw new Error('The archive list could not be saved for this account.');
    this.storage.setItem(this.#key, raw);
    if (this.storage.getItem(this.#key) !== raw) throw new Error('The archive list could not be saved. Your conversation is kept in its current list.');
    this.#raw = raw; this.#entries = entries;
  }
}
