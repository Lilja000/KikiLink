import type { CloudPollDraft } from "./types";
import { readArchivedFeedDraftFields } from '../storage/feed-draft-archived-fields';
export const FEED_DRAFT_METADATA_KEY = "kikilink:feed-draft:v1";
const MAX_FILES = 4;
const MAX_FILE_BYTES = 5*1024*1024;
export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  spoiler: boolean;
}
export interface SnapshotMetadata {
  text: string;
  clientId: string;
  files: FileMetadata[];
  poll: CloudPollDraft | null;
}
export interface DraftMetadata extends SnapshotMetadata {
  version: 1;
  revision: string;
  archivedFields?: string;
  pending?: SnapshotMetadata & { mediaIds?: string[]; spoilerMediaIds?: string[] };
}

export function validPoll(value: unknown): value is CloudPollDraft | null {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const poll = value as CloudPollDraft;
  return typeof poll.question === "string" && poll.question.length <= 200 && Array.isArray(poll.options) &&
    poll.options.length <= 6 && poll.options.every(option => typeof option === "string" && option.length <= 100) &&
    typeof poll.multiple === "boolean" && Number.isSafeInteger(poll.closesAt) && poll.closesAt > 0;
}

export function parseMetadata(raw: string | null): DraftMetadata | undefined {
  if (raw === null) return undefined;
  if (raw.length > 32_000) throw new Error("The saved Feed draft is invalid");
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") throw new Error("The saved Feed draft is invalid");
  const entry = value as DraftMetadata & { cleared?: boolean };
  if (entry.archivedFields !== undefined) readArchivedFeedDraftFields(entry.archivedFields);
  if (entry.version === 1 && entry.cleared === true) return undefined;
  if (entry.version !== 1 || typeof entry.revision !== "string" || !validSnapshot(entry) ||
    (entry.pending !== undefined && (!validSnapshot(entry.pending) || !validMediaIds(entry.pending.mediaIds) ||
      !validMediaIds(entry.pending.spoilerMediaIds) || entry.pending.spoilerMediaIds?.some(id => !entry.pending!.mediaIds?.includes(id))))) {
    throw new Error("The saved Feed draft is invalid");
  }
  return entry;
}

export function validSnapshot(entry: SnapshotMetadata): boolean {
  return Boolean(entry && typeof entry.text === "string" && entry.text.length <= 4000 &&
    typeof entry.clientId === "string" && /^[a-z0-9_-]{1,128}$/iu.test(entry.clientId) && validPoll(entry.poll) &&
    Array.isArray(entry.files) && entry.files.length <= MAX_FILES && entry.files.every(file =>
      file && typeof file.id === "string" && /^[a-z0-9_-]{1,128}$/iu.test(file.id) && typeof file.name === "string" && file.name.length <= 1024 &&
      typeof file.type === "string" && file.type.startsWith("image/") && Number.isSafeInteger(file.size) && file.size > 0 && file.size <= MAX_FILE_BYTES &&
      Number.isSafeInteger(file.lastModified) && file.lastModified >= 0 && typeof file.spoiler === "boolean") &&
    new Set(entry.files.map(file => file.id)).size === entry.files.length);
}

export function validMediaIds(value: unknown): value is string[] | undefined {
  return value === undefined || (Array.isArray(value) && value.length <= MAX_FILES &&
    value.every(id => typeof id === "string" && /^[a-z0-9_-]{1,128}$/iu.test(id)) && new Set(value).size === value.length);
}

export function metadataFiles(metadata: DraftMetadata): FileMetadata[] {
  return [...new Map([...metadata.files, ...metadata.pending?.files ?? []].map(file => [file.id, file])).values()];
}

