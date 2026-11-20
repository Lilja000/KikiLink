export interface ZipFile { name: string; blob: Blob }
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
const header = (size: number) => new DataView(new ArrayBuffer(size));
const bytes = (value: DataView) => value.buffer as ArrayBuffer;

export async function blobCRC32(blob: Blob, check: () => void): Promise<number> {
  let crc = 0xffffffff;
  for (let start = 0; start < blob.size; start += 1024 * 1024) {
    check(); const chunk = new Uint8Array(await blob.slice(start, start + 1024 * 1024).arrayBuffer()); check();
    for (const value of chunk) crc = CRC_TABLE[(crc ^ value) & 255]! ^ (crc >>> 8);
  }
  check(); return (crc ^ 0xffffffff) >>> 0;
}

/** Standard ZIP32, stored entries. Blob payloads are not assembled into one ArrayBuffer. */
export async function storedZip(files: readonly ZipFile[], check: () => void, progress: (done: number) => void = () => {}): Promise<Blob> {
  if (files.length > 8192) throw new Error('There are too many files for one device export.');
  const names = new Set<string>(), local: BlobPart[] = [], central: BlobPart[] = [];
  let offset = 0, directorySize = 0;
  for (const [index, file] of files.entries()) {
    check();
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(file.name) || file.name.split('/').some(part => part === '..' || part === '') || names.has(file.name))
      throw new Error('An export filename is invalid.');
    names.add(file.name);
    const name = new TextEncoder().encode(file.name); if (name.length > 65535 || file.blob.size > 0x7fffffff || offset + file.blob.size > 0x7fffffff) throw new Error('This device export exceeds the 2 GiB limit.');
    const crc = await blobCRC32(file.blob, check);
    const h = header(30); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true); h.setUint16(12, 33, true);
    h.setUint32(14, crc, true); h.setUint32(18, file.blob.size, true); h.setUint32(22, file.blob.size, true); h.setUint16(26, name.length, true);
    local.push(bytes(h), name.buffer, file.blob);
    const c = header(46); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true); c.setUint16(14, 33, true);
    c.setUint32(16, crc, true); c.setUint32(20, file.blob.size, true); c.setUint32(24, file.blob.size, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.push(bytes(c), name.buffer); directorySize += 46 + name.length; offset += 30 + name.length + file.blob.size;
    progress(index + 1);
  }
  check(); if (offset + directorySize + 22 > 0x7fffffff) throw new Error('This device export exceeds the 2 GiB limit.');
  const end = header(22); end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, directorySize, true); end.setUint32(16, offset, true);
  return new Blob([...local, ...central, bytes(end)], { type: 'application/zip' });
}
