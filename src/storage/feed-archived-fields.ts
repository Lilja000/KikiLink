import { readInertArchivedFields, type InertFieldPolicy } from './inert-archived-fields';

export const feedFieldPolicy: InertFieldPolicy = {
  format: 'kikilink-inert-feed-fields',
  kind: 'attachment',
  knownFields: new Set(['id','file','archivedFields']),
};

export const readArchivedFeedFields = (raw: string, check: () => void = () => {}) =>
  readInertArchivedFields(raw, feedFieldPolicy, check);
