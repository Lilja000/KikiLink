import { blobCRC32 } from './stored-zip';

export interface StoredZipEntry { readonly name: string; readonly blob: Blob; readonly crc: number }
const invalid = (): never => { throw new Error('This ZIP is damaged or uses an unsupported archive layout. Select the original device export.'); };
const requireZip = (valid: boolean): void => { if (!valid) invalid(); };

/** Read the stored ZIP32 layout produced by device export. No decompression or extraction.
 * This indexes entries only: callers must verifyEntry every entry before accepting contents. */
export async function readStoredZip(file: Blob, check: () => void): Promise<Map<string,StoredZipEntry>> {
  check(); requireZip(file instanceof Blob && file.size >= 22 && file.size <= 0x7fffffff);
  const read = async (start: number, size: number): Promise<DataView> => {
    check(); requireZip(start >= 0 && size >= 0 && start + size <= file.size);
    const buffer = await file.slice(start,start+size).arrayBuffer(); check(); requireZip(buffer.byteLength === size); return new DataView(buffer);
  };
  const end = await read(file.size-22,22);
  requireZip(end.getUint32(0,true) === 0x06054b50 && end.getUint16(4,true) === 0 && end.getUint16(6,true) === 0 && end.getUint16(20,true) === 0);
  const count = end.getUint16(10,true), centralSize = end.getUint32(12,true), centralStart = end.getUint32(16,true);
  requireZip(count > 0 && count <= 8192 && count === end.getUint16(8,true) && centralSize <= 8*1024*1024 && centralStart+centralSize+22 === file.size);
  const central = await read(centralStart,centralSize), entries = new Map<string,StoredZipEntry>(); let position = 0, offset = 0;
  for (let i = 0; i < count; i++) {
    check(); requireZip(position+46 <= centralSize && central.getUint32(position,true) === 0x02014b50);
    const c16 = (n: number) => central.getUint16(position+n,true), c32 = (n: number) => central.getUint32(position+n,true);
    const needed = c16(6), flags = c16(8), size = c32(24), length = c16(28), crc = c32(16);
    requireZip(needed <= 20 && (flags === 0 || flags === 0x800) && c16(10) === 0 && c32(20) === size &&
      length > 0 && length <= 1024 && c16(30) === 0 && c16(32) === 0 && c16(34) === 0 && c32(42) === offset && position+46+length <= centralSize);
    const nameBytes = new Uint8Array(central.buffer,position+46,length);
    const name = new TextDecoder('utf-8',{fatal:true}).decode(nameBytes);
    requireZip(/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(name) && !name.split('/').some(p => p === '' || p === '.' || p === '..') && !entries.has(name));
    const local = await read(offset,30+length), l16 = (n: number) => local.getUint16(n,true), l32 = (n: number) => local.getUint32(n,true);
    requireZip(l32(0) === 0x04034b50 && l16(4) === needed && l16(6) === flags && l16(8) === 0 && l16(10) === c16(12) && l16(12) === c16(14) &&
      l32(14) === crc && l32(18) === size && l32(22) === size && l16(26) === length && l16(28) === 0 &&
      nameBytes.every((byte,index) => byte === local.getUint8(30+index)));
    const start = offset+30+length; requireZip(start+size <= centralStart);
    entries.set(name,Object.freeze({name,blob:file.slice(start,start+size),crc})); offset = start+size; position += 46+length;
  }
  requireZip(position === centralSize && offset === centralStart); check(); return entries;
}

export async function verifyEntry(entry: StoredZipEntry, check: () => void): Promise<void> {
  if (await blobCRC32(entry.blob,check) !== entry.crc) throw new Error('The archive failed its integrity check. No saved data was changed.');
}
