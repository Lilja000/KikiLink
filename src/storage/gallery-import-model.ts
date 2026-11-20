import { validateLocalImageFile } from '../modules/link-chat/image-upload';
import { deviceGalleryDatabaseName, MAX_DEVICE_GALLERY_IMAGES, MAX_DEVICE_GALLERY_IMAGE_BYTES, type DeviceGalleryImage } from './device-gallery-store';
import { exportValueEncoder } from './device-data-export';
import type { ZipFile } from '../utils/stored-zip';
import { archiveBinaryPath, archiveFieldEntries, archivedFieldBytes, INERT_ARCHIVED_FIELDS_TOTAL, prepareInertArchivedFields } from './inert-archived-fields';
import { galleryFieldPolicy, readArchivedGalleryFields } from './gallery-archived-fields';

export const GALLERY_SOURCE_METADATA_LIMIT = 2*1024*1024;
export const GALLERY_SOURCE_BYTES_LIMIT = 128*1024*1024;
export const GALLERY_RECOVERY_BYTES_LIMIT = 768*1024*1024;
export interface GalleryArchiveSource { readonly metadata: string; readonly files: readonly Readonly<ZipFile>[] }
export interface GalleryRow { key: IDBValidKey; value: unknown }
export interface GalleryImportCopy { format: 1; id: number; createdAt: number; owner: number; before: GalleryRow[]; source: GalleryArchiveSource; added: DeviceGalleryImage[]; bytes: number }
export interface GalleryPlan { added: DeviceGalleryImage[]; kept: number; excluded: number; bytes: number }
const requireValue = (ok: unknown): void => { if (!ok) throw new Error('The archived Gallery data is unsupported or inconsistent.'); };
const object = (value: any): Record<string,any> => { requireValue(value && typeof value === 'object' && !Array.isArray(value)); return value; };
const scalar = (node: any): any => { const value = object(node); requireValue(value.type === 'value' || value.type === 'number'); return value.value; };
export const validGalleryId = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9_-]{1,64}$/i.test(value);
export const galleryKeys = (rows: GalleryRow[]): string => JSON.stringify(rows.map(row => {
  requireValue(validGalleryId(row.key) && object(row.value).id === row.key); return row.key;
}).sort());

/** Copy caller-owned references before decoding or reading any binary data. */
export function snapshotGallerySource(source: GalleryArchiveSource): GalleryArchiveSource {
  requireValue(typeof source.metadata === 'string');
  return Object.freeze({metadata:source.metadata,files:Object.freeze(source.files.map(file => Object.freeze({name:file.name,blob:file.blob})))});
}

/** Decode only Gallery's known fields; retain extra tags in a bounded inactive string. */
export async function prepareGalleryImages(source: GalleryArchiveSource, owner: number, check: () => void, decode = checkWebPImage): Promise<DeviceGalleryImage[]> {
  check(); source = snapshotGallerySource(source); requireValue(source.metadata.length <= GALLERY_SOURCE_METADATA_LIMIT && archivedFieldBytes(source.metadata) <= GALLERY_SOURCE_METADATA_LIMIT);
  const snapshot = object(JSON.parse(source.metadata));
  requireValue(snapshot.name === deviceGalleryDatabaseName(owner) && [1,2].includes(snapshot.version));
  requireValue(Array.isArray(snapshot.stores) && snapshot.stores.length === 1);
  const store = object(snapshot.stores[0]);
  requireValue(store.name === 'images' && store.keyPath === 'id' && store.autoIncrement === false && Array.isArray(store.indexes) && !store.indexes.length && Array.isArray(store.records) && store.records.length <= MAX_DEVICE_GALLERY_IMAGES);
  const files = new Map(source.files.map(file => { requireValue(file.blob instanceof Blob); return [archiveBinaryPath(file.name),file.blob] as const; }));
  requireValue(files.size === source.files.length && source.files.reduce((n,file) => n+file.blob.size,0) <= GALLERY_SOURCE_BYTES_LIMIT);
  const ids = new Set<string>(), result: DeviceGalleryImage[] = []; let archivedBytes = 0;
  for (const row of store.records) {
    check(); const node = object(row.value); requireValue(node.type === 'object' && Array.isArray(node.entries));
    const entries = archiveFieldEntries(node.entries), fields = new Map<string,any>(entries);
    const id = scalar(fields.get('id')), name = scalar(fields.get('name')), mimeType = scalar(fields.get('mimeType'));
    const width = scalar(fields.get('width')), height = scalar(fields.get('height')), createdAt = scalar(fields.get('createdAt'));
    requireValue(validGalleryId(id) && scalar(row.key) === id && !ids.has(id)); ids.add(id);
    requireValue(typeof name === 'string' && name.length > 0 && name.length <= 200 && !/[\u0000-\u001f\u007f]/.test(name) && mimeType === 'image/webp');
    requireValue(Number.isSafeInteger(width) && width > 0 && width <= 16384 && Number.isSafeInteger(height) && height > 0 && height <= 16384 && width*height <= 32000000);
    requireValue(Number.isSafeInteger(createdAt) && createdAt >= 0 && createdAt <= 8640000000000000);
    const tag = object(fields.get('blob')), file = files.get(tag.path);
    requireValue((tag.type === 'blob' || tag.type === 'file') && tag.mimeType === 'image/webp' && file instanceof Blob && file.size > 0 && file.size <= MAX_DEVICE_GALLERY_IMAGE_BYTES);
    const archivedFields = await prepareInertArchivedFields(entries,files,galleryFieldPolicy,check);
    if (archivedFields !== undefined) { archivedBytes += archivedFieldBytes(archivedFields); requireValue(archivedBytes <= INERT_ARCHIVED_FIELDS_TOTAL); }
    const blob = file!.slice(0,file!.size,'image/webp'); await decode(blob,width,height); check();
    result.push({id,name,mimeType:'image/webp',width,height,createdAt,blob,...(archivedFields !== undefined ? {archivedFields} : {})});
  }
  return result;
}

export async function checkWebPImage(blob: Blob, width: number, height: number): Promise<void> {
  await validateLocalImageFile(new File([blob],'saved-gallery.webp',{type:'image/webp'}));
  if (typeof createImageBitmap !== 'function') throw new Error('This browser cannot safely check archived Gallery images.');
  const image = await new Promise<ImageBitmap>((resolve,reject) => {
    let settled = false;
    const timer = setTimeout(() => { settled = true; reject(new Error('Gallery image decoding timed out.')); },10000);
    createImageBitmap(blob).then(bitmap => {
      if (settled) { bitmap.close(); return; } settled = true; clearTimeout(timer); resolve(bitmap);
    },error => { if (!settled) { settled = true; clearTimeout(timer); reject(error); } });
  });
  try { requireValue(image.width === width && image.height === height); } finally { image.close(); }
}

export function planGalleryImport(images: DeviceGalleryImage[], current: GalleryRow[]): GalleryPlan {
  const keys = new Set(JSON.parse(galleryKeys(current)) as string[]);
  if (current.length > MAX_DEVICE_GALLERY_IMAGES) throw new Error('Current Gallery exceeds its image limit. No images were changed.');
  const added: DeviceGalleryImage[] = []; let kept = 0, excluded = 0;
  for (const image of [...images].sort((a,b) => b.createdAt-a.createdAt || a.id.localeCompare(b.id))) {
    if (keys.has(image.id)) { kept++; continue; }
    if (current.length+added.length >= MAX_DEVICE_GALLERY_IMAGES) { excluded++; continue; }
    added.push(image);
  }
  return {added,kept,excluded,bytes:added.reduce((n,image) => n+image.blob.size,0)};
}

/** Size the exact structured copy, including unknown fields and all their binary bytes. */
export function galleryCopyBytes(value: unknown): number {
  const files: ZipFile[] = [], encode = exportValueEncoder(files,() => {});
  return new TextEncoder().encode(JSON.stringify(encode(value))).length + files.reduce((n,file) => n+file.blob.size,0);
}
export function checkGalleryCopies(copies: GalleryImportCopy[], owner: number): void {
  const ids = new Set<number>(); let total = 0;
  for (const copy of copies) {
    if (copy.format !== 1 || copy.owner !== owner || !Number.isSafeInteger(copy.id) || copy.id < 1 || ids.has(copy.id) || !Number.isSafeInteger(copy.createdAt) || !Array.isArray(copy.before) || !Array.isArray(copy.added) || !copy.added.length || !copy.source || typeof copy.source.metadata !== 'string' || !Array.isArray(copy.source.files)) throw new Error('Saved Gallery recovery copies are unsupported. Keep them before retrying.');
    if (copy.before.length > MAX_DEVICE_GALLERY_IMAGES || copy.added.length > MAX_DEVICE_GALLERY_IMAGES || copy.added.some(image => !validGalleryId(image.id) || !(image.blob instanceof Blob) || image.blob.type !== 'image/webp') || copy.source.files.some(file => typeof file?.name !== 'string' || !(file.blob instanceof Blob))) throw new Error('Saved Gallery recovery copies are unsupported.');
    galleryKeys(copy.before);
    let archivedBytes = 0;
    for (const image of copy.added) if (image.archivedFields !== undefined) {
      requireValue(typeof image.archivedFields === 'string'); readArchivedGalleryFields(image.archivedFields);
      archivedBytes += archivedFieldBytes(image.archivedFields); requireValue(archivedBytes <= INERT_ARCHIVED_FIELDS_TOTAL);
    }
    ids.add(copy.id); const bytes = galleryCopyBytes({before:copy.before,source:copy.source,added:copy.added});
    if (bytes !== copy.bytes) throw new Error('Saved Gallery recovery copies are inconsistent.'); total += bytes;
  }
  if (copies.length > 3 || total > GALLERY_RECOVERY_BYTES_LIMIT) throw new Error('Saved Gallery recovery copies exceed their limit.');
}
export function prepareGalleryCopy(copies: GalleryImportCopy[], owner: number, before: GalleryRow[], source: GalleryArchiveSource, added: DeviceGalleryImage[]): GalleryImportCopy {
  checkGalleryCopies(copies,owner); const bytes = galleryCopyBytes({before,source,added});
  const id = Math.max(0,...copies.map(copy => copy.id))+1;
  if (!added.length || !Number.isSafeInteger(id) || copies.length >= 3 || bytes+copies.reduce((n,copy) => n+copy.bytes,0) > GALLERY_RECOVERY_BYTES_LIMIT) throw new Error('Gallery recovery storage is full. No images were changed.');
  return {format:1,id,createdAt:Date.now(),owner,before,source,added,bytes};
}
