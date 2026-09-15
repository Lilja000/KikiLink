import {
  LEASE_TTL_MS,
  SESSION_MAX_ATTEMPTS,
  SESSION_MAX_BYTES,
  SESSION_MAX_CONCURRENT,
} from "./policy.ts";
import type { DurableObjectState, DurableObjectStorage, Env } from "./runtime-types.ts";

const GLOBAL_CONCURRENCY_HARD_LIMIT = 20;
const ALARM_RETRY_MS = 15 * 60_000;

export interface UploadLease {
  readonly id: string;
  readonly expiresAt: number;
}

export interface SessionRecord {
  readonly origin: string;
  readonly ipHash: string;
  readonly expiresAt: number;
  readonly attempts: number;
  readonly reservedBytes: number;
  readonly leases: readonly UploadLease[];
}

export interface SessionAdmissionInput {
  readonly origin: string;
  readonly ipHash: string;
  readonly bytes: number;
  readonly leaseId: string;
  readonly now: number;
}

export type AdmissionResult =
  | { readonly ok: true; readonly record: SessionRecord }
  | {
      readonly ok: false;
      readonly status: 401 | 429;
      readonly error: "session_expired" | "session_mismatch" | "attempt_quota" | "byte_quota" | "concurrency_quota";
      readonly record?: SessionRecord;
    };

interface SessionSqlRow {
  token_hash: string;
  origin: string;
  ip_hash: string;
  expires_at: number;
  attempts: number;
  reserved_bytes: number;
  leases_json: string;
}

interface GlobalSqlRow {
  singleton: number;
  utc_day: string;
  attempts: number;
  reserved_bytes: number;
  leases_json: string;
}

interface CreateSessionInput {
  tokenHash: string;
  origin: string;
  ipHash: string;
  expiresAt: number;
}

interface SessionAdmissionRequest extends SessionAdmissionInput {
  tokenHash: string;
}

interface ReleaseSessionInput {
  tokenHash: string;
  leaseId: string;
  now: number;
}

interface GlobalAdmissionInput {
  bytes: number;
  maxAttempts: number;
  maxBytes: number;
  maxConcurrent: number;
  leaseId: string;
  now: number;
}

interface GlobalReleaseInput {
  leaseId: string;
  now: number;
}

export function admitSessionRecord(
  record: SessionRecord,
  input: SessionAdmissionInput,
): AdmissionResult {
  if (record.expiresAt <= input.now) {
    return { ok: false, status: 401, error: "session_expired" };
  }
  if (record.origin !== input.origin || record.ipHash !== input.ipHash) {
    return { ok: false, status: 401, error: "session_mismatch" };
  }

  const leases = record.leases.filter((lease) => lease.expiresAt > input.now);
  if (record.attempts >= SESSION_MAX_ATTEMPTS) {
    return {
      ok: false,
      status: 429,
      error: "attempt_quota",
      record: { ...record, leases },
    };
  }

  const attempted: SessionRecord = { ...record, attempts: record.attempts + 1, leases };
  if (record.reservedBytes + input.bytes > SESSION_MAX_BYTES) {
    return { ok: false, status: 429, error: "byte_quota", record: attempted };
  }
  if (leases.length >= SESSION_MAX_CONCURRENT) {
    return { ok: false, status: 429, error: "concurrency_quota", record: attempted };
  }
  return {
    ok: true,
    record: {
      ...attempted,
      reservedBytes: record.reservedBytes + input.bytes,
      leases: [...leases, { id: input.leaseId, expiresAt: input.now + LEASE_TTL_MS }],
    },
  };
}

export function releaseSessionLease(
  record: SessionRecord,
  leaseId: string,
  now: number,
): SessionRecord {
  return {
    ...record,
    leases: record.leases.filter((lease) => lease.id !== leaseId && lease.expiresAt > now),
  };
}

export class UploadSessionLedger {
  readonly #storage: DurableObjectStorage;
  readonly #ready: Promise<void>;

  constructor(state: DurableObjectState, _env: Env) {
    this.#storage = state.storage;
    this.#ready = state.blockConcurrencyWhile(async () => {
      this.#storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS upload_session (
          token_hash TEXT PRIMARY KEY,
          origin TEXT NOT NULL,
          ip_hash TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          attempts INTEGER NOT NULL,
          reserved_bytes INTEGER NOT NULL,
          leases_json TEXT NOT NULL
        )
      `);
      this.#storage.sql.exec(
        "CREATE INDEX IF NOT EXISTS idx_upload_session_expires_at ON upload_session (expires_at)",
      );
      this.#deleteExpired(Date.now());
      await this.#scheduleNextAlarm();
    });
  }

  async fetch(request: Request): Promise<Response> {
    await this.#ready;
    this.#deleteExpired(Date.now());
    const url = new URL(request.url);
    if (request.method !== "POST") return internalJson({ ok: false }, 405);

    if (url.pathname === "/create") return this.#create(request);
    if (url.pathname === "/admit") return this.#admit(request);
    if (url.pathname === "/release") return this.#release(request);
    return internalJson({ ok: false }, 404);
  }

  async alarm(): Promise<void> {
    await this.#ready;
    try {
      this.#deleteExpired(Date.now());
      await this.#scheduleNextAlarm();
    } catch {
      await this.#storage.setAlarm(Date.now() + ALARM_RETRY_MS);
    }
  }

  async #create(request: Request): Promise<Response> {
    const input = await parseInternalJson<CreateSessionInput>(request);
    if (
      !input ||
      !isTokenHash(input.tokenHash) ||
      typeof input.origin !== "string" ||
      typeof input.ipHash !== "string" ||
      !Number.isSafeInteger(input.expiresAt) ||
      input.expiresAt <= Date.now()
    ) {
      return internalJson({ ok: false }, 400);
    }
    if (this.#readRecord(input.tokenHash)) return internalJson({ ok: false }, 409);
    const record: SessionRecord = {
      origin: input.origin,
      ipHash: input.ipHash,
      expiresAt: input.expiresAt,
      attempts: 0,
      reservedBytes: 0,
      leases: [],
    };
    this.#writeRecord(input.tokenHash, record);
    try {
      await this.#scheduleNextAlarm();
    } catch (error) {
      this.#deleteRecord(input.tokenHash);
      throw error;
    }
    return internalJson({ ok: true }, 201);
  }

  async #admit(request: Request): Promise<Response> {
    const input = await parseInternalJson<SessionAdmissionRequest>(request);
    if (!isAdmissionInput(input) || !isTokenHash(input.tokenHash)) {
      return internalJson({ ok: false }, 400);
    }
    const record = this.#readRecord(input.tokenHash);
    if (!record) return internalJson({ ok: false, error: "session_expired" }, 401);
    const admission = admitSessionRecord(record, input);
    if (!admission.ok) {
      if (admission.error === "session_expired") this.#deleteRecord(input.tokenHash);
      else if (admission.record) this.#writeRecord(input.tokenHash, admission.record);
      return internalJson({ ok: false, error: admission.error }, admission.status);
    }
    this.#writeRecord(input.tokenHash, admission.record);
    return internalJson({ ok: true }, 200);
  }

  async #release(request: Request): Promise<Response> {
    const input = await parseInternalJson<ReleaseSessionInput>(request);
    if (
      !input ||
      !isTokenHash(input.tokenHash) ||
      typeof input.leaseId !== "string" ||
      input.leaseId.length !== 43 ||
      !Number.isSafeInteger(input.now)
    ) {
      return internalJson({ ok: false }, 400);
    }
    const record = this.#readRecord(input.tokenHash);
    if (record) {
      this.#writeRecord(
        input.tokenHash,
        releaseSessionLease(record, input.leaseId, input.now),
      );
    }
    return internalJson({ ok: true }, 200);
  }

  #readRecord(tokenHash: string): SessionRecord | null {
    const rows = this.#storage.sql
      .exec<SessionSqlRow>(
        "SELECT token_hash, origin, ip_hash, expires_at, attempts, reserved_bytes, leases_json FROM upload_session WHERE token_hash = ?",
        tokenHash,
      )
      .toArray();
    const row = rows[0];
    if (!row) return null;
    const leases = parseLeases(row.leases_json);
    if (!leases) return null;
    return {
      origin: row.origin,
      ipHash: row.ip_hash,
      expiresAt: row.expires_at,
      attempts: row.attempts,
      reservedBytes: row.reserved_bytes,
      leases,
    };
  }

  #writeRecord(tokenHash: string, record: SessionRecord): void {
    this.#storage.sql.exec(
      `INSERT INTO upload_session
       (token_hash, origin, ip_hash, expires_at, attempts, reserved_bytes, leases_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(token_hash) DO UPDATE SET
         origin = excluded.origin,
         ip_hash = excluded.ip_hash,
         expires_at = excluded.expires_at,
         attempts = excluded.attempts,
         reserved_bytes = excluded.reserved_bytes,
         leases_json = excluded.leases_json`,
      tokenHash,
      record.origin,
      record.ipHash,
      record.expiresAt,
      record.attempts,
      record.reservedBytes,
      JSON.stringify(record.leases),
    );
  }

  #deleteRecord(tokenHash: string): void {
    this.#storage.sql.exec("DELETE FROM upload_session WHERE token_hash = ?", tokenHash);
  }

  #deleteExpired(now: number): void {
    this.#storage.sql.exec("DELETE FROM upload_session WHERE expires_at <= ?", now);
  }

  async #scheduleNextAlarm(): Promise<void> {
    const row = this.#storage.sql
      .exec<{ expires_at: number }>(
        "SELECT MIN(expires_at) AS expires_at FROM upload_session",
      )
      .toArray()[0];
    if (row && Number.isSafeInteger(row.expires_at)) {
      await this.#storage.setAlarm(row.expires_at + 60_000);
    }
  }
}

export class GlobalUploadLedger {
  readonly #storage: DurableObjectStorage;
  readonly #ready: Promise<void>;

  constructor(state: DurableObjectState, _env: Env) {
    this.#storage = state.storage;
    this.#ready = state.blockConcurrencyWhile(async () => {
      this.#storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS global_upload_ledger (
          singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
          utc_day TEXT NOT NULL,
          attempts INTEGER NOT NULL,
          reserved_bytes INTEGER NOT NULL,
          leases_json TEXT NOT NULL
        )
      `);
    });
  }

  async fetch(request: Request): Promise<Response> {
    await this.#ready;
    if (request.method !== "POST") return internalJson({ ok: false }, 405);
    const pathname = new URL(request.url).pathname;
    if (pathname === "/release") return this.#release(request);
    if (pathname !== "/admit") return internalJson({ ok: false }, 404);
    const input = await parseInternalJson<GlobalAdmissionInput>(request);
    if (!isGlobalAdmissionInput(input)) return internalJson({ ok: false }, 400);

    const day = new Date(Date.now()).toISOString().slice(0, 10);
    let row = this.#readRecord();
    const liveLeases = (row ? parseLeases(row.leases_json, GLOBAL_CONCURRENCY_HARD_LIMIT) : [])?.filter(
      (lease) => lease.expiresAt > input.now,
    );
    if (!liveLeases) return internalJson({ ok: false }, 503);
    if (!row || row.utc_day < day) {
      row = {
        singleton: 1,
        utc_day: day,
        attempts: 0,
        reserved_bytes: 0,
        leases_json: JSON.stringify(liveLeases),
      };
    } else {
      row = { ...row, leases_json: JSON.stringify(liveLeases) };
    }
    if (row.attempts >= input.maxAttempts || row.reserved_bytes + input.bytes > input.maxBytes) {
      return internalJson({ ok: false, error: "global_quota" }, 429);
    }
    if (liveLeases.length >= input.maxConcurrent) {
      return internalJson({ ok: false, error: "global_concurrency" }, 429);
    }
    const attempted = { ...row, attempts: row.attempts + 1 };
    this.#writeRecord({
      ...attempted,
      reserved_bytes: row.reserved_bytes + input.bytes,
      leases_json: JSON.stringify([
        ...liveLeases,
        { id: input.leaseId, expiresAt: input.now + LEASE_TTL_MS },
      ]),
    });
    return internalJson({ ok: true }, 200);
  }

  async #release(request: Request): Promise<Response> {
    const input = await parseInternalJson<GlobalReleaseInput>(request);
    if (
      !input ||
      typeof input.leaseId !== "string" ||
      input.leaseId.length !== 43 ||
      !Number.isSafeInteger(input.now)
    ) {
      return internalJson({ ok: false }, 400);
    }
    const row = this.#readRecord();
    if (!row) return internalJson({ ok: true }, 200);
    const leases = parseLeases(row.leases_json, GLOBAL_CONCURRENCY_HARD_LIMIT);
    if (!leases) return internalJson({ ok: false }, 503);
    this.#writeRecord({
      ...row,
      leases_json: JSON.stringify(
        leases.filter((lease) => lease.id !== input.leaseId && lease.expiresAt > input.now),
      ),
    });
    return internalJson({ ok: true }, 200);
  }

  #readRecord(): GlobalSqlRow | null {
    return (
      this.#storage.sql
        .exec<GlobalSqlRow>(
          "SELECT singleton, utc_day, attempts, reserved_bytes, leases_json FROM global_upload_ledger WHERE singleton = 1",
        )
        .toArray()[0] ?? null
    );
  }

  #writeRecord(row: GlobalSqlRow): void {
    this.#storage.sql.exec(
      `INSERT INTO global_upload_ledger
       (singleton, utc_day, attempts, reserved_bytes, leases_json) VALUES (1, ?, ?, ?, ?)
       ON CONFLICT(singleton) DO UPDATE SET
         utc_day = excluded.utc_day,
         attempts = excluded.attempts,
         reserved_bytes = excluded.reserved_bytes,
         leases_json = excluded.leases_json`,
      row.utc_day,
      row.attempts,
      row.reserved_bytes,
      row.leases_json,
    );
  }
}

function isAdmissionInput(value: SessionAdmissionInput | null): value is SessionAdmissionInput {
  return Boolean(
    value &&
      typeof value.origin === "string" &&
      typeof value.ipHash === "string" &&
      Number.isSafeInteger(value.bytes) &&
      value.bytes > 0 &&
      typeof value.leaseId === "string" &&
      value.leaseId.length === 43 &&
      Number.isSafeInteger(value.now),
  );
}

function isTokenHash(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/u.test(value);
}

function isGlobalAdmissionInput(value: GlobalAdmissionInput | null): value is GlobalAdmissionInput {
  return Boolean(
    value &&
      Number.isSafeInteger(value.bytes) &&
      value.bytes > 0 &&
      Number.isSafeInteger(value.maxAttempts) &&
      value.maxAttempts > 0 &&
      Number.isSafeInteger(value.maxBytes) &&
      value.maxBytes > 0 &&
      Number.isSafeInteger(value.maxConcurrent) &&
      value.maxConcurrent > 0 &&
      typeof value.leaseId === "string" &&
      value.leaseId.length === 43 &&
      Number.isSafeInteger(value.now),
  );
}

function parseLeases(
  value: string,
  maximum = SESSION_MAX_CONCURRENT,
): UploadLease[] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length > maximum) return null;
    const leases: UploadLease[] = [];
    for (const lease of parsed) {
      if (
        !lease ||
        typeof lease !== "object" ||
        typeof Reflect.get(lease, "id") !== "string" ||
        typeof Reflect.get(lease, "expiresAt") !== "number"
      ) {
        return null;
      }
      leases.push({
        id: Reflect.get(lease, "id") as string,
        expiresAt: Reflect.get(lease, "expiresAt") as number,
      });
    }
    return leases;
  } catch {
    return null;
  }
}

async function parseInternalJson<T>(request: Request): Promise<T | null> {
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as T;
  } catch {
    return null;
  }
}

function internalJson(value: object, status: number): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
