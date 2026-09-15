import { DatabaseSync, backup } from "node:sqlite";
import {
  readFileSync,
  readdirSync,
  mkdirSync,
  chmodSync,
  existsSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

const migrationDir = new URL("../migrations/", import.meta.url);
export class Database {
  constructor(path, { migrate = false } = {}) {
    this.path = path;
    if (path !== ":memory:" && !migrate && !existsSync(path))
      throw new Error(
        "Initialize a new database with the explicit migration command before startup",
      );
    if (path !== ":memory:")
      mkdirSync(dirname(resolve(path)), { recursive: true, mode: 0o700 });
    this.raw = new DatabaseSync(path);
    if (path !== ":memory:") chmodSync(path, 0o600);
    this.raw.exec(
      "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA secure_delete=ON; PRAGMA wal_autocheckpoint=1000; PRAGMA journal_size_limit=16777216;",
    );
    try {
      if (migrate) this.migrate();
      this.verifyMigrations();
    } catch (error) {
      this.raw.close();
      throw error;
    }
  }
  run(sql, ...args) {
    return this.raw.prepare(sql).run(...args);
  }
  get(sql, ...args) {
    return this.raw.prepare(sql).get(...args);
  }
  all(sql, ...args) {
    return this.raw.prepare(sql).all(...args);
  }
  transaction(fn) {
    this.raw.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      if (result?.then)
        throw new Error(
          "Database transactions must not cross an await boundary",
        );
      this.raw.exec("COMMIT");
      return result;
    } catch (error) {
      this.raw.exec("ROLLBACK");
      throw error;
    }
  }
  migrations() {
    return readdirSync(migrationDir)
      .filter((f) => /^\d{3}_[a-z_]+\.sql$/.test(f))
      .sort()
      .map((name) => {
        const sql = readFileSync(new URL(name, migrationDir), "utf8");
        return {
          name,
          sql,
          hash: createHash("sha256").update(sql).digest("hex"),
        };
      });
  }
  migrate() {
    this.raw.exec(
      "CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY, hash TEXT NOT NULL, applied_at INTEGER NOT NULL) STRICT",
    );
    for (const m of this.migrations()) {
      const old = this.get(
        "SELECT hash FROM schema_migrations WHERE name=?",
        m.name,
      );
      if (old && old.hash !== m.hash)
        throw new Error(`Migration checksum mismatch: ${m.name}`);
      if (!old)
        this.transaction(() => {
          this.raw.exec(m.sql);
          this.run(
            "INSERT INTO schema_migrations VALUES(?,?,?)",
            m.name,
            m.hash,
            Date.now(),
          );
        });
    }
  }
  verifyMigrations() {
    const rows = this.all(
      "SELECT name,hash FROM schema_migrations ORDER BY name",
    );
    const known = this.migrations();
    if (
      rows.length !== known.length ||
      rows.some((r, i) => r.name !== known[i].name || r.hash !== known[i].hash)
    ) {
      throw new Error(
        "Schema mismatch. Back up and run the explicit migration command before startup.",
      );
    }
  }
  healthy() {
    return this.get("PRAGMA quick_check").quick_check === "ok";
  }
  size() {
    // Count used pages. Deleted content frees quota without requiring a blocking VACUUM.
    return (
      (this.get("PRAGMA page_count").page_count -
        this.get("PRAGMA freelist_count").freelist_count) *
      this.get("PRAGMA page_size").page_size
    );
  }
  async backup(path) {
    await backup(this.raw, path);
    chmodSync(path, 0o600);
  }
  close() {
    this.raw.close();
  }
}
