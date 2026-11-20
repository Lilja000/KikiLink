import { readInertArchivedFields, type InertFieldPolicy } from './inert-archived-fields';

export const soundFieldPolicy: InertFieldPolicy = {
  format: 'kikilink-inert-sound-fields',
  kind: 'sound',
  knownFields: new Set(['id','name','mimeType','durationMs','createdAt','blob','archivedFields']),
};

export const readArchivedSoundFields = (raw: string, check: () => void = () => {}) =>
  readInertArchivedFields(raw, soundFieldPolicy, check);
