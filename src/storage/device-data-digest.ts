const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');

/** Stable v1 SHA256 over length and ordered 1 MiB chunk hashes; never buffers a whole archive. */
export async function deviceDataDigest(blob: Blob, check: () => void): Promise<string> {
  check();
  if (typeof crypto === 'undefined' || !crypto.subtle?.digest) throw new Error('This browser cannot verify saved data. No export was created.');
  const hashes: string[] = [];
  for (let n = 0; n < blob.size; n += 1048576) {
    check(); const part = await blob.slice(n, n + 1048576).arrayBuffer(); check();
    hashes.push(hex(await crypto.subtle.digest('SHA-256', part))); check();
  }
  const encoded = new TextEncoder().encode(JSON.stringify(['kikilink-chunk-sha256-v1', blob.size, hashes]));
  const result = hex(await crypto.subtle.digest('SHA-256', encoded)); check(); return result;
}
