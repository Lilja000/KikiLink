import { readInertArchivedFields, type InertFieldPolicy } from './inert-archived-fields';

export const galleryFieldPolicy: InertFieldPolicy = {
  format: 'kikilink-inert-gallery-fields',
  kind: 'image',
  knownFields: new Set(['id','name','mimeType','width','height','createdAt','blob','archivedFields']),
};

export const readArchivedGalleryFields = (raw: string, check: () => void = () => {}) =>
  readInertArchivedFields(raw, galleryFieldPolicy, check);
