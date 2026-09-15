import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { loadConfig } from "../src/config.mjs";
import { Database } from "../src/db.mjs";
import { KeyRing } from "../src/crypto.mjs";
import { R2Storage } from "../src/storage.mjs";
import { createApp } from "../src/app.mjs";
import { encryptedBackup, restoreBackup } from "./backup.mjs";

const config = loadConfig(),
  keys = new KeyRing(config.keys, config.activeKey),
  command = process.argv[2];
const directory = dirname(resolve(config.dbPath));
await mkdir(directory, { recursive: true, mode: 0o700 });
const backups = new R2Storage({
  ...config.storage,
  bucket: config.storage.backupBucket,
});
let db;
try {
  if (command === "migrate") {
    let exists = false;
    try {
      exists = (await stat(config.dbPath)).size > 0;
    } catch {}
    if (exists && process.argv[3] !== "--backed-up")
      throw new Error(
        "First make and verify an encrypted backup; then pass --backed-up with the service stopped.",
      );
    db = new Database(config.dbPath, { migrate: true });
    console.log(JSON.stringify({ event: "migrated", integrity: db.healthy() }));
  } else if (command === "backup") {
    db = new Database(config.dbPath);
    const artifact = await encryptedBackup(db, keys, directory);
    try {
      const key = `backups/${new Date(artifact.metadata.createdAt).toISOString().replaceAll(":", "-")}-${artifact.metadata.snapshotId}.klbackup`;
      await backups.putStream(
        key,
        createReadStream(artifact.path),
        artifact.bytes,
      );
      console.log(
        JSON.stringify({ event: "backup_saved", key, bytes: artifact.bytes }),
      );
      let continuation;
      const retained = [];
      do {
        const list = await backups.list("backups/", continuation);
        retained.push(...(list.Contents ?? []));
        continuation = list.NextContinuationToken;
      } while (continuation);
      retained.sort(
        (a, b) => b.LastModified.getTime() - a.LastModified.getTime(),
      );
      for (const [index, object] of retained.entries()) {
        if (
          index >= 14 ||
          object.LastModified.getTime() < Date.now() - 14 * 86400000
        )
          await backups.delete(object.Key);
      }
    } finally {
      await artifact.dispose();
    }
  } else if (command === "restore") {
    const key = process.argv[3],
      target = process.argv[4];
    if (
      !/^backups\/[a-zA-Z0-9.:-]+\.klbackup$/.test(key ?? "") ||
      !target ||
      resolve(target) === resolve(config.dbPath)
    )
      throw new Error("Provide a backup key and NEW offline restore target");
    const temp = await mkdtemp(join(directory, "restore-download-"));
    try {
      const file = join(temp, "encrypted.klbackup");
      await backups.downloadTo(key, file, config.limits.maxDatabaseBytes);
      const result = await restoreBackup(
        file,
        keys,
        resolve(target),
        config.limits.maxDatabaseBytes,
      );
      console.log(
        JSON.stringify({ event: "restore_candidate_verified", ...result }),
      );
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  } else if (command === "cleanup") {
    db = new Database(config.dbPath);
    const storage = new R2Storage(config.storage);
    const cloud = createApp({ db, keys, storage, config });
    try {
      console.log(
        JSON.stringify({ event: "cleanup", ...(await cloud.cleanup()) }),
      );
    } finally {
      await cloud.app.close();
      storage.close();
    }
  } else if (command === "storage-check") {
    const storage = new R2Storage(config.storage);
    try {
      if (process.argv[3] === "--backup") await backups.healthy();
      else await storage.healthy();
      console.log(JSON.stringify({ event: "storage_access_verified" }));
    } finally {
      storage.close();
    }
  } else
    throw new Error("Use migrate, backup, restore, cleanup or storage-check");
} finally {
  db?.close();
  backups.close();
}
