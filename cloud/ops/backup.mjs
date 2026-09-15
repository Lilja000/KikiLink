import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm, open, stat, rename, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import {
  randomBytes,
  randomUUID,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { createGzip, createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { Database } from "../src/db.mjs";

export async function encryptedBackup(db, keys, directory) {
  const dir = await mkdtemp(join(directory, "backup-")),
    plain = join(dir, "snapshot.sqlite"),
    encrypted = join(dir, "snapshot.klbackup");
  try {
    await db.backup(plain);
    const nonce = randomBytes(12),
      metadata = {
        v: 1,
        purpose: "kikilink-cloud-backup",
        alg: "A256GCM",
        keyId: keys.active,
        nonce: nonce.toString("base64url"),
        createdAt: Date.now(),
        snapshotId: randomUUID(),
      };
    const header = Buffer.from(JSON.stringify(metadata) + "\n");
    const cipher = createCipheriv(
      "aes-256-gcm",
      keys.keys.get(keys.active),
      nonce,
    );
    cipher.setAAD(header);
    const handle = await open(encrypted, "wx", 0o600);
    await handle.write(header);
    await handle.close();
    await pipeline(
      createReadStream(plain),
      createGzip(),
      cipher,
      createWriteStream(encrypted, { flags: "a", mode: 0o600 }),
    );
    const end = await open(encrypted, "a");
    await end.write(cipher.getAuthTag());
    await end.close();
    await rm(plain);
    return {
      path: encrypted,
      metadata,
      bytes: (await stat(encrypted)).size,
      dispose: () => rm(dir, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
}

export async function restoreBackup(encrypted, keys, target, maxBytes) {
  // Restore only to a new candidate. Never overwrite a live database or activate automatically.
  let exists = false;
  try {
    await access(target);
    exists = true;
  } catch {}
  if (exists) throw new Error("Restore target already exists");
  const file = await open(encrypted, "r");
  let header, metadata, cipherStart, tag;
  try {
    const info = await file.stat(),
      prefix = Buffer.alloc(2048);
    const { bytesRead } = await file.read(prefix, 0, 2048, 0);
    const end = prefix.subarray(0, bytesRead).indexOf(10);
    if (end < 0 || info.size < end + 18)
      throw new Error("Invalid backup header");
    header = prefix.subarray(0, end + 1);
    metadata = JSON.parse(header.toString("utf8"));
    cipherStart = end + 1;
    if (
      metadata.v !== 1 ||
      metadata.purpose !== "kikilink-cloud-backup" ||
      metadata.alg !== "A256GCM" ||
      !keys.keys.has(metadata.keyId)
    )
      throw new Error("Backup key/schema unavailable");
    tag = Buffer.alloc(16);
    await file.read(tag, 0, 16, info.size - 16);
  } finally {
    await file.close();
  }
  const nonce = Buffer.from(metadata.nonce, "base64url");
  if (nonce.length !== 12) throw new Error("Invalid backup nonce");
  const temporary = await mkdtemp(join(dirname(target), "restore-")),
    candidate = join(temporary, "candidate.sqlite");
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      keys.keys.get(metadata.keyId),
      nonce,
    );
    decipher.setAAD(header);
    decipher.setAuthTag(tag);
    let size = 0;
    const bound = new Transform({
      transform(chunk, _encoding, cb) {
        size += chunk.length;
        cb(
          size > maxBytes ? new Error("Restored database exceeds bound") : null,
          chunk,
        );
      },
    });
    await pipeline(
      createReadStream(encrypted, {
        start: cipherStart,
        end: (await stat(encrypted)).size - 17,
      }),
      decipher,
      createGunzip(),
      bound,
      createWriteStream(candidate, { flags: "wx", mode: 0o600 }),
    );
    // A restore is an explicit operation on a NEW candidate. Upgrade older,
    // checksummed snapshots here; ordinary service startup still never migrates.
    const db = new Database(candidate, { migrate: true });
    try {
      if (!db.healthy()) throw new Error("Restored database integrity failed");
      // Restore must not revive logged-out sessions/challenges or obsolete presence.
      db.raw.exec(
        "DELETE FROM sessions; DELETE FROM auth_challenges; DELETE FROM auth_devices; DELETE FROM presence; PRAGMA wal_checkpoint(TRUNCATE);",
      );
    } finally {
      db.close();
    }
    // A second exclusive check protects against accidental same-host operator races.
    const lock = await open(target, "wx", 0o600);
    await lock.close();
    await rename(candidate, target);
    return { target, metadata, bytes: size };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
