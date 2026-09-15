export type SqlStorageValue = ArrayBuffer | string | number | null;

export interface SqlStorageCursor<Row> extends Iterable<Row> {
  toArray(): Row[];
}

export interface SqlStorage {
  exec<Row>(
    query: string,
    ...bindings: SqlStorageValue[]
  ): SqlStorageCursor<Row>;
}

export interface DurableObjectStorage {
  readonly sql: SqlStorage;
  setAlarm(scheduledTime: number): Promise<void>;
}

export interface DurableObjectState {
  readonly storage: DurableObjectStorage;
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
}

export interface DurableObjectId {}

export interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}

export interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

export interface Env {
  UPLOADS_ENABLED?: string;
  RELAY_CANONICAL_ORIGIN?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET?: string;
  IP_HASH_SECRET?: string;
  GLOBAL_DAILY_UPLOADS?: string;
  GLOBAL_DAILY_BYTES?: string;
  GLOBAL_MAX_CONCURRENT?: string;
  UPLOAD_SESSIONS: DurableObjectNamespace;
  GLOBAL_UPLOAD_LEDGER: DurableObjectNamespace;
  SESSION_RATE_LIMITER?: RateLimitBinding;
  UPLOAD_RATE_LIMITER?: RateLimitBinding;
}

export interface FixedLengthStreamPair {
  readonly readable: ReadableStream<Uint8Array>;
  readonly writable: WritableStream<Uint8Array>;
}

declare global {
  const FixedLengthStream: {
    new (expectedLength: number): FixedLengthStreamPair;
  };
}
