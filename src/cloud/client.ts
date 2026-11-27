import {preflightAccountControl, accountControlBody, accountControlReceipt, accountControlError, type AccountControlReview} from './account-control-generation';
export type MediaReportScope = number | { communityId: string; id: number };
export const mediaReportKey = (report?: MediaReportScope): string => typeof report === "object" ? `community:${report.communityId}:${report.id}` : String(report ?? "profile");
import type { CloudProfile } from "./types";
import {
  createDeviceKey,
  IndexedDbCloudDeviceStore,
  signDeviceChallenge,
  type CloudDeviceStore,
  type DeviceCredential,
  type DeviceKey,
} from "./device-key";

export const KIKILINK_CLOUD_ORIGIN =
  typeof __KIKILINK_CLOUD_ORIGIN__ === "string"
    ? __KIKILINK_CLOUD_ORIGIN__
    : "";
const cloudTestMember =
  typeof __KIKILINK_CLOUD_TEST_MEMBER__ === "number"
    ? __KIKILINK_CLOUD_TEST_MEMBER__
    : 0;
const cloudTestMembers =
  typeof __KIKILINK_CLOUD_TEST_MEMBERS__ !== "undefined"
    ? __KIKILINK_CLOUD_TEST_MEMBERS__
    : [];
export const cloudMemberEnabled = (memberNumber: number): boolean =>
  cloudTestMembers.length > 0
    ? cloudTestMembers.includes(memberNumber)
    : cloudTestMember === 0 || memberNumber === cloudTestMember;
export class CloudError extends Error {
  constructor(
    readonly code: string,
    readonly status = 0,
    readonly retryAfterMs = 0,
  ) {
    super(code);
  }
}
/** Network failures are reported as 503 by the authenticated transport. */
export function isTemporaryCloudReadError(error: unknown): boolean {
  return error instanceof CloudError && (error.status === 408 || error.status === 429 || error.status >= 500 && error.status <= 599);
}
interface PendingIdentity {
  challengeId: string;
  exchange: string;
  expiresAt: number;
  retryProof?: { verifierMember: number; wire: string; sent: boolean };
}
interface CloudSession {
  token: string;
  memberNumber: number;
  expiresAt: number;
  device?: DeviceCredential;
}
interface CloudOptions {
  origin: string;
  memberNumber: number;
  getMemberNumber(): number | undefined;
  isBlocked(member: number): boolean;
  sendProof(target: number, payload: string): void;
  fetchImpl?: typeof fetch;
  xhrFactory?: () => XMLHttpRequest;
  now?: () => number;
  deviceStore?: CloudDeviceStore;
  pageOrigin?: string;
  verificationDelays?: readonly number[];
  proofPreparationDelays?: readonly number[];
}
type CloudConnectionState =
  "idle" | "connecting" | "verifying" | "connected" | "unavailable";

/** Optional account-pinned service. Construction is passive; authenticated login starts it. */
export class CloudClient {
  readonly memberNumber: number;
  readonly #origin: string;
  readonly #fetch: typeof fetch;
  readonly #now: () => number;
  #session: CloudSession | undefined;
  #sessionVersion=0;
  #pending: PendingIdentity | undefined;
  #closed = false;
  #lifetime = new AbortController();
  #stream: AbortController | undefined;
  #eventLeases = 0;
  #failures = 0;
  #retryAt = 0;
  #cache = new Map<number, { value: CloudProfile; at: number; refreshAfter: number }>();
  #inflight = new Map<number, Promise<CloudProfile>>();
  #mediaInflight = new Map<string, Promise<Blob>>();
  #mediaCache = new Map<string, { blob: Blob; at: number }>();
  #mediaBytes = 0;
  #mediaVersion = 0;
  #blocked = new Set<number>();
  #profileVersion = 0;
  #listeners = new Set<(kind: string, cause?: string) => void>();
  #activeRequests = 0;
  #requestWaiters: Array<() => void> = [];
  #epoch = 0;
  #deviceKey: DeviceKey | undefined;
  readonly #deviceStore: CloudDeviceStore | undefined;
  #connectTask: Promise<void> | undefined;
  #refreshTimer: ReturnType<typeof setTimeout> | undefined;
  #refreshFailures = 0;
  #sessionRejections = 0;
  #sessionRetryAt = 0;
  #rejectedSessionPath: string | undefined;
  #autoStopped = false;
  #connectionState: CloudConnectionState = "idle";
  #connectionError = "";
  #storageTask: Promise<unknown> = Promise.resolve();
  #uploads = new Set<AbortController>();

  constructor(private readonly options: CloudOptions) {
    // Refuse before opening IndexedDB or creating any account-specific state.
    if (!cloudMemberEnabled(options.memberNumber))
      throw new CloudError("development_allowlist");
    const url = new URL(options.origin);
    const base = `${url.origin}${url.pathname === "/" ? "" : url.pathname.replace(/\/$/u, "")}`;
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password || url.search || url.hash ||
      !/^\/(?:[A-Za-z0-9._~-]+\/?)*$/u.test(url.pathname) || base !== options.origin
    )
      throw new CloudError("invalid_cloud_origin");
    this.memberNumber = options.memberNumber;
    this.#origin = base;
    this.#fetch = options.fetchImpl ?? fetch.bind(globalThis);
    this.#now = options.now ?? Date.now;
    this.#deviceStore =
      options.deviceStore ??
      (typeof indexedDB !== "undefined"
        ? new IndexedDbCloudDeviceStore(base, this.memberNumber)
        : undefined);
  }
  #check(): void {
    let current: number | undefined;
    try {
      current = this.options.getMemberNumber();
    } catch {
      throw new CloudError("account_unavailable");
    }
    if (this.#closed || current !== this.memberNumber) {
      this.destroy();
      throw new CloudError("account_changed");
    }
  }
  get connected(): boolean {
    try {
      this.#check();
      return !!this.#session && this.#session.expiresAt > this.#now();
    } catch {
      return false;
    }
  }
  /** Public base URL only; authentication credentials stay inside this client. */
  get origin(): string { return this.#origin; }
  get verifying(): boolean {
    return !!this.#pending && this.#pending.expiresAt > this.#now();
  }
  get connectionState(): string {
    return this.#connectionState;
  }
  get connectionError(): string {
    return this.#connectionError;
  }
  /** Remaining circuit-breaker delay; UI retries must not exhaust themselves during it. */
  get retryDelay(): number { return Math.max(0, this.#retryAt - this.#now(), this.#sessionRetryAt - this.#now()); }
  #setConnection(state: CloudConnectionState, error = ""): void {
    this.#connectionState = state;
    this.#connectionError = error;
    this.#notify("connection");
  }
  #checkEpoch(epoch: number): void {
    this.#check();
    if (epoch !== this.#epoch) throw new CloudError("session_changed");
  }
  #store(action: () => Promise<void>): Promise<unknown> {
    this.#storageTask = this.#storageTask
      .catch(() => {})
      .then(action)
      .catch(() => {});
    return this.#storageTask;
  }
  /** Called after BC's authenticated account lifecycle, including MainHall/ChatSearch. */
  connect(automatic = false, refresh = false): Promise<void> {
    if (automatic && this.#autoStopped) return Promise.resolve();
    if (this.connected && !refresh) return Promise.resolve();
    if (this.#connectTask) return this.#connectTask;
    if (automatic && this.#now() < this.#sessionRetryAt)
      return Promise.reject(new CloudError("cloud_temporarily_unavailable", 503, this.#sessionRetryAt - this.#now()));
    if (!automatic) this.#autoStopped = false;
    const epoch = this.#epoch;
    const task = this.#connect(epoch, automatic)
      .catch((error: unknown) => {
        if (!this.#closed && epoch === this.#epoch) {
          this.#pending = undefined;
          this.#setConnection(
            "unavailable",
            error instanceof CloudError
              ? error.code
              : "cloud_temporarily_unavailable",
          );
          this.#scheduleDeviceRecovery(error, epoch);
        }
        throw error;
      })
      .finally(() => {
        if (this.#connectTask === task) this.#connectTask = undefined;
      });
    this.#connectTask = task;
    return task;
  }
  #scheduleDeviceRecovery(error: unknown, epoch: number): void {
    // Retry only a transient failure with an existing, unexpired device grant.
    // Fresh enrollment failures must not turn into repeated BC proof traffic.
    if (this.#closed || this.#autoStopped || !this.#deviceKey?.device || this.#deviceKey.device.expiresAt <= this.#now()) return;
    if (!(error instanceof CloudError) || !(error.status >= 500 || [408, 429].includes(error.status))) return;
    const delay = Math.max(this.retryDelay, error.retryAfterMs,
      Math.min(60000, 5000 * 2 ** Math.min(this.#refreshFailures++, 4)));
    clearTimeout(this.#refreshTimer);
    this.#refreshTimer = setTimeout(() => {
      this.#refreshTimer = undefined;
      if (this.#closed || this.#autoStopped || epoch !== this.#epoch || !this.#deviceKey?.device || this.#deviceKey.device.expiresAt <= this.#now()) return;
      void this.connect(true, true).catch(() => {});
    }, delay);
  }
  async #connect(epoch: number, automatic: boolean): Promise<void> {
    this.#checkEpoch(epoch);
    this.#setConnection("connecting");
    if (this.#deviceStore) {
      const saved = await (
        this.#deviceStore.prepare
          ? this.#deviceStore.prepare(!automatic)
          : this.#deviceStore.load()
      ).catch(() => undefined);
      this.#checkEpoch(epoch);
      if (saved === "paused" && automatic) {
        this.#autoStopped = true;
        this.#session = undefined;
        this.#deviceKey = undefined;
        clearTimeout(this.#refreshTimer);
        this.stopEvents(true);
        this.#notify("session");
        this.#setConnection("idle");
        return;
      }
      if (saved && saved !== "paused") this.#deviceKey = saved;
    }
    if (
      this.#deviceKey?.device &&
      this.#deviceKey.device.expiresAt > this.#now()
    ) {
      try {
        await this.#resumeDevice(epoch);
        return;
      } catch (error) {
        this.#checkEpoch(epoch);
        if (!(error instanceof CloudError) || error.status !== 401) throw error;
        if (automatic) {
          // A remote sign-out must not silently turn into a new BC enrollment.
          // Explicit Connect may authorize this device again with a fresh proof.
          this.#autoStopped = true;
          this.#pending = undefined; this.#deviceKey = undefined;
          this.#rejectSession(this.#session, "/v1/auth/device-challenges");
          const revokedEpoch = this.#epoch;
          for (const controller of this.#uploads) controller.abort();
          this.#blocked.clear();
          if (this.#deviceStore) await this.#store(() => this.#deviceStore!.pause());
          this.#checkEpoch(revokedEpoch); this.#setConnection("unavailable", "device_access_revoked");
          throw new CloudError("device_access_revoked", 401);
        }
        this.#deviceKey = undefined; // Explicit reconnection enrolls a fresh key.
      }
    }
    if (!this.#deviceKey && typeof crypto?.subtle !== "undefined") {
      const key = await createDeviceKey();
      this.#checkEpoch(epoch);
      this.#deviceKey = key;
    }
    this.#setConnection("verifying");
    await this.beginIdentity();
    let pendingReplies = 0;
    for (const delay of this.options.verificationDelays ?? [
      0, 250, 750, 1500, 3000, 5000,
    ]) {
      if (delay) await this.#wait(delay);
      this.#checkEpoch(epoch);
      try {
        await this.finishIdentity();
        return;
      } catch (error) {
        if (
          !(error instanceof CloudError) ||
          error.code !== "verification_pending"
        )
          throw error;
        // One bounded retry for a first public enrollment whose native Beep
        // raced delivery preparation. Device resumes never send BC proofs.
        const retry = this.#pending?.retryProof;
        if (++pendingReplies >= 4 && retry && !retry.sent) {
          this.#checkEpoch(epoch);
          if (this.options.isBlocked(retry.verifierMember)) throw new CloudError("verifier_unavailable");
          retry.sent = true;
          this.options.sendProof(retry.verifierMember, retry.wire);
        }
      }
    }
    throw new CloudError("verification_unavailable");
  }
  async #wait(delay: number): Promise<void> {
    const signal = this.#lifetime.signal;
    if (signal.aborted) throw new CloudError("session_changed");
    await new Promise<void>((resolve, reject) => {
      const stop = () => {
        clearTimeout(timer);
        reject(new CloudError("session_changed"));
      };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", stop);
        resolve();
      }, delay);
      signal.addEventListener("abort", stop, { once: true });
    });
  }
  async #resumeDevice(epoch: number): Promise<void> {
    const key = this.#deviceKey!,
      device = key.device!;
    const challenge = await this.request<{
      challengeId: string;
      nonce: string;
      expiresAt: number;
    }>(
      "POST",
      "/v1/auth/device-challenges",
      { deviceId: device.id, memberNumber: this.memberNumber },
      false,
    );
    this.#checkEpoch(epoch);
    if (
      !/^[a-f0-9-]{36}$/i.test(challenge.challengeId) ||
      !/^[A-Za-z0-9_-]{43}$/.test(challenge.nonce) ||
      !Number.isSafeInteger(challenge.expiresAt) ||
      challenge.expiresAt <= this.#now() ||
      challenge.expiresAt > this.#now() + 65000
    )
      throw new CloudError("invalid_device_challenge");
    const signature = await signDeviceChallenge(
      key,
      challenge.challengeId,
      challenge.nonce,
      device.id,
      this.memberNumber,
      this.options.pageOrigin ?? location.origin,
    );
    this.#checkEpoch(epoch);
    const session = await this.request<CloudSession>(
      "POST",
      "/v1/auth/device-exchange",
      {
        challengeId: challenge.challengeId,
        nonce: challenge.nonce,
        deviceId: device.id,
        memberNumber: this.memberNumber,
        signature,
      },
      false,
    );
    await this.#acceptSession(session, epoch);
  }
  async #acceptSession(session: CloudSession, epoch: number): Promise<void> {
    this.#checkEpoch(epoch);
    if (
      session.memberNumber !== this.memberNumber ||
      !/^[A-Za-z0-9_-]{43}$/.test(session.token) ||
      !Number.isSafeInteger(session.expiresAt) ||
      session.expiresAt <= this.#now() ||
      session.expiresAt > this.#now() + 3605000 ||
      (session.device &&
        (!/^[a-f0-9-]{36}$/i.test(session.device.id) ||
          !Number.isSafeInteger(session.device.expiresAt) ||
          session.device.expiresAt <= this.#now() ||
          session.device.expiresAt > this.#now() + 30 * 86400000 + 5000))
    )
      throw new CloudError("identity_mismatch");
    this.#refreshFailures = 0;
    this.#session = session;this.#sessionVersion++;
    this.#pending = undefined;
    if (session.device && this.#deviceKey) {
      this.#deviceKey.device = session.device;
      const key = this.#deviceKey;
      if (this.#deviceStore)
        await this.#store(async () => {
          this.#checkEpoch(epoch);
          await this.#deviceStore!.save(key);
        });
      this.#checkEpoch(epoch);
    }
    this.#setConnection("connected");
    this.#notify("session");
    if (this.#eventLeases > 0) this.startEvents();
    clearTimeout(this.#refreshTimer);
    const remaining = session.expiresAt - this.#now();
    if (session.device)
      this.#refreshTimer = setTimeout(
        () => {
          void this.connect(true, true).catch(() => {});
        },
        Math.max(1000, remaining > 60000 ? remaining - 30000 : remaining + 100),
      );
  }
  #authenticated(path: string): void {
    if (this.#rejectedSessionPath !== path.split("?")[0]) return;
    this.#sessionRejections = 0;
    this.#sessionRetryAt = 0;
    this.#rejectedSessionPath = undefined;
  }
  #rejectSession(session: CloudSession | undefined, path: string): void {
    if (this.#session !== session) return;
    const attempt = this.#sessionRejections++;
    const delay = attempt === 0 ? 0 : Math.min(60000, 5000 * 2 ** Math.min(attempt - 1, 4));
    this.#sessionRetryAt = this.#now() + delay;
    this.#rejectedSessionPath = path.split("?")[0];
    const epoch = ++this.#epoch;
    this.#session = undefined;
    this.#profileVersion++;
    this.#inflight.clear();
    this.#cache.clear();
    this.#clearMedia();
    this.stopEvents(true);
    clearTimeout(this.#refreshTimer);
    this.#notify("session");
    this.#setConnection("unavailable", "authentication_required");
    // A rejected access token may precede its local expiry (server restart or
    // another device renewal). Recover once immediately, then back off if fresh
    // tokens are also rejected. Device exchange alone does not prove recovery;
    // the rejecting endpoint must succeed before its backoff is reset.
    if (!this.#autoStopped && this.#deviceKey?.device && this.#deviceKey.device.expiresAt > this.#now())
      this.#refreshTimer = setTimeout(() => {
        this.#refreshTimer = undefined;
        // An older proactive renewal may still be unwinding after the epoch
        // change. Do not reuse that invalidated task as the recovery attempt.
        void (this.#connectTask ?? Promise.resolve()).catch(() => {}).then(() => {
          if (this.#closed || this.#autoStopped || epoch !== this.#epoch || this.connected) return;
          return this.connect(true, true);
        }).catch(() => {});
      }, delay);
  }
  subscribe(listener: (kind: string, cause?: string) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  #notify(kind: string, cause?: string): void {
    for (const listener of this.#listeners) {
      try {
        if (cause === undefined) listener(kind); else listener(kind, cause);
      } catch {
        /* UI listeners do not affect transport. */
      }
    }
  }
  async beginIdentity(): Promise<void> {
    const epoch = this.#epoch;
    this.#check();
    const challenge = await this.request<
      PendingIdentity & { proof: string; verifierMember: number; delivery?: "pending" }
    >(
      "POST",
      "/v1/auth/challenges",
      {
        memberNumber: this.memberNumber,
        ...(this.#deviceKey ? { publicKey: this.#deviceKey.publicKey } : {}),
      },
      false,
    );
    this.#check();
    if (
      !/^[a-f0-9-]{36}$/i.test(challenge.challengeId) ||
      !/^[A-Za-z0-9_-]{43}$/.test(challenge.proof) ||
      !/^[A-Za-z0-9_-]{43}$/.test(challenge.exchange) ||
      !Number.isSafeInteger(challenge.expiresAt) ||
      challenge.expiresAt <= this.#now() ||
      challenge.expiresAt > this.#now() + 185000 ||
      !Number.isSafeInteger(challenge.verifierMember) ||
      challenge.verifierMember <= 0 ||
      challenge.verifierMember === this.memberNumber ||
      (challenge.delivery !== undefined && challenge.delivery !== "pending") ||
      this.options.isBlocked(challenge.verifierMember)
    )
      throw new CloudError("verifier_unavailable");
    const pending: PendingIdentity = {
      challengeId: challenge.challengeId,
      exchange: challenge.exchange,
      expiresAt: challenge.expiresAt,
    };
    this.#pending = pending;
    if (challenge.delivery === "pending") {
      let ready = false;
      for (const delay of this.options.proofPreparationDelays ?? [0, 500, 750, 1000, 1500, 2500, 4000]) {
        if (delay) await this.#wait(delay);
        this.#checkEpoch(epoch);
        if (this.#pending !== pending || pending.expiresAt <= this.#now()) throw new CloudError("verification_expired");
        const result = await this.request<{ ready: boolean }>("POST", "/v1/auth/proof-ready",
          { challengeId: pending.challengeId, exchange: pending.exchange }, false);
        if (!result || typeof result.ready !== "boolean") throw new CloudError("verifier_unavailable");
        if (result.ready) { ready = true; break; }
      }
      if (!ready) throw new CloudError("verifier_unavailable");
    }
    this.#checkEpoch(epoch);
    if (this.options.isBlocked(challenge.verifierMember)) throw new CloudError("verifier_unavailable");
    const wire = JSON.stringify({ t: "cloud-verify", v: 1, challengeId: challenge.challengeId, proof: challenge.proof });
    if (challenge.delivery === "pending") pending.retryProof = { verifierMember: challenge.verifierMember, wire, sent: false };
    this.options.sendProof(
      challenge.verifierMember,
      wire,
    );
  }
  async finishIdentity(): Promise<void> {
    const epoch = this.#epoch;
    this.#check();
    if (!this.#pending || this.#pending.expiresAt <= this.#now())
      throw new CloudError("verification_expired");
    const session = await this.request<CloudSession>(
      "POST",
      "/v1/auth/exchange",
      {
        challengeId: this.#pending.challengeId,
        exchange: this.#pending.exchange,
      },
      false,
    );
    await this.#acceptSession(session, epoch);
  }
  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    authenticated = true,
    signal?: AbortSignal,
  ): Promise<T> {
    const epoch = this.#epoch;
    const response = await this.#response(method, path, body, authenticated, signal);
    this.#check();
    if (epoch !== this.#epoch) throw new CloudError("session_changed");
    let value: T;
    if (response.status !== 204) {
      const bytes = await this.#boundedBody(response, 512 * 1024);
      this.#checkEpoch(epoch);
      try { value = JSON.parse(new TextDecoder().decode(bytes)) as T; }
      catch { throw new CloudError("invalid_response"); }
    } else value = undefined as T;
    // Keep the last complete profile visible until the complete save response is ready.
    const boundProfile=path==='/v1/profiles/me'&&!!body&&typeof body==='object'&&'recoveryGeneration' in body;
    const boundBlock=path.startsWith('/v1/blocks/')&&!!body&&typeof body==='object'&&'recoveryGeneration' in body;
    if (method !== "GET" && !boundProfile && !boundBlock && (path.startsWith("/v1/blocks") || path === "/v1/profiles/me")) {
      this.#profileVersion++; this.#inflight.clear();
      if (path.startsWith("/v1/blocks")) {
        const member = Number(path.split("/").pop());
        if (Number.isSafeInteger(member) && member > 0) {
          if (method === "PUT") this.#blocked.add(member); else this.#blocked.delete(member);
        }
        this.#cache.clear(); this.#clearMedia(); this.#notify("profiles-cleared");
      } else {
        if (method === "DELETE") {
          this.#cache.delete(this.memberNumber);
          this.#notify(`profile:${this.memberNumber}`);
        } else if (method === "PUT" && !(body && typeof body === 'object' && 'recoveryGeneration' in body)) this.rememberProfile(value as CloudProfile);
      }
    }
    if (method === "DELETE" && !boundProfile && (path === "/v1/profiles/me" || /^\/v1\/relationships\/\d+$/u.test(path) || /^\/v1\/groups\/[^/]+(?:\/members\/\d+)?$/u.test(path))) this.#clearMedia();
    if (method === "PATCH" && path === "/v1/privacy/me") { this.#profileVersion++; this.#cache.clear(); this.#inflight.clear(); this.#notify("profiles-cleared"); this.#notify("privacy"); }
    return value;
  }
  /** Authenticated raw POST with real byte progress. Mutations are never replayed. */
  async upload<T>(path: string, body: Blob, options: {
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {}): Promise<T> {
    this.#check();
    if (!path.startsWith("/v1/") || path.includes("\\") || path.includes("#") ||
      path.split("?")[0]!.includes("..") || new URL(path, this.#origin).origin !== new URL(this.#origin).origin)
      throw new CloudError("invalid_path");
    if (!(body instanceof Blob) || !body.size) throw new CloudError("invalid_upload");
    if (options.signal?.aborted) throw new CloudError("request_cancelled");
    if (!this.connected || this.#autoStopped) throw new CloudError("authentication_required", 401);
    if (this.#now() < this.#retryAt) throw new CloudError("cloud_temporarily_unavailable", 503);
    const controller = new AbortController();
    this.#uploads.add(controller);
    const signal = AbortSignal.any([this.#lifetime.signal, controller.signal,
      ...(options.signal ? [options.signal] : [])]);
    const epoch = this.#epoch;
    let acquired = false;
    try {
      const waiting = this.#acquireRequest(signal);
      if (waiting) await waiting;
      acquired = true;
      this.#checkEpoch(epoch);
      if (signal.aborted) throw new CloudError("request_cancelled");
      if (!this.connected) throw new CloudError("authentication_required", 401);
      const session = this.#session!;
      const url = new URL(this.#origin + path).href;
      return await new Promise<T>((resolve, reject) => {
        let xhr: XMLHttpRequest;
        try { xhr = this.options.xhrFactory?.() ?? new XMLHttpRequest(); }
        catch { reject(new CloudError("upload_unavailable")); return; }
        let settled = false;
        let guard: ReturnType<typeof setInterval> | undefined;
        const finish = (error?: unknown, value?: T) => {
          if (settled) return;
          settled = true;
          clearInterval(guard);
          signal.removeEventListener("abort", abort);
          xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onabort = xhr.onprogress = null;
          xhr.upload.onprogress = null;
          if (error) { xhr.abort(); reject(error); }
          else resolve(value as T);
        };
        const abort = () => finish(new CloudError("request_cancelled"));
        const valid = () => {
          try {
            this.#checkEpoch(epoch);
            if (signal.aborted) throw new CloudError("request_cancelled");
            if (!this.connected) throw new CloudError("authentication_required", 401);
            return true;
          } catch (error) { finish(error); return false; }
        };
        const progress = (percent: number) => {
          try { options.onProgress?.(percent); } catch { /* Rendering cannot break an upload. */ }
        };
        signal.addEventListener("abort", abort, { once: true });
        // Account switches can precede the host's lifecycle callback.
        guard = setInterval(valid, 250);
        xhr.upload.onprogress = event => {
          if (valid() && event.lengthComputable && event.total > 0)
            progress(Math.min(99, Math.max(0, Math.floor(event.loaded / event.total * 100))));
        };
        xhr.onprogress = event => { if (event.loaded > 512 * 1024) finish(new CloudError("response_too_large")); };
        xhr.onabort = abort;
        xhr.onerror = xhr.ontimeout = () => {
          if (!valid()) return;
          this.#failure();
          finish(new CloudError("cloud_temporarily_unavailable", 503));
        };
        xhr.onload = () => {
          if (!valid()) return;
          if (xhr.responseURL !== url) { finish(new CloudError("invalid_response_origin")); return; }
          if (xhr.responseText.length > 512 * 1024) { finish(new CloudError("response_too_large")); return; }
          let value: unknown;
          try { value = xhr.status === 204 ? undefined : JSON.parse(xhr.responseText); }
          catch {
            if (xhr.status >= 200 && xhr.status < 300) { finish(new CloudError("invalid_response")); return; }
          }
          if (xhr.status < 200 || xhr.status >= 300) {
            const code = value && typeof value === "object" && "error" in value && typeof value.error === "string"
              ? value.error : "cloud_request_failed";
            if (xhr.status === 401 && this.#session === session) this.#rejectSession(session, path);
            if (xhr.status >= 500) this.#failure();
            const retry = xhr.getResponseHeader("Retry-After");
            const delay = retry === null ? 0 : /^\d+$/u.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - this.#now();
            finish(new CloudError(code, xhr.status, Number.isFinite(delay) ? Math.max(0, Math.min(delay, 86_400_000)) : 0));
            return;
          }
          this.#failures = 0;
          this.#authenticated(path);
          progress(100);
          finish(undefined, value as T);
        };
        try {
          xhr.open("POST", url, true);
          xhr.withCredentials = false;
          xhr.timeout = options.timeoutMs ?? 180000;
          xhr.setRequestHeader("Authorization", `Bearer ${session.token}`);
          xhr.setRequestHeader("Content-Type", body.type || "application/octet-stream");
          progress(0);
          if (valid()) xhr.send(body);
        } catch { finish(new CloudError("upload_unavailable")); }
      });
    } finally {
      this.#uploads.delete(controller);
      if (acquired) { this.#activeRequests--; this.#requestWaiters.shift()?.(); }
    }
  }
  async #response(
    method: string,
    path: string,
    body: unknown,
    authenticated: boolean,
    callerSignal?: AbortSignal,
  ): Promise<Response> {
    this.#check();
    if (callerSignal?.aborted) throw new CloudError("request_cancelled");
    if (
      !path.startsWith("/v1/") ||
      path.includes("\\") ||
      path.includes("#") ||
      path.includes("..") ||
      new URL(path, this.#origin).origin !== new URL(this.#origin).origin
    )
      throw new CloudError("invalid_path");
    if (
      authenticated &&
      !this.connected &&
      this.#deviceKey?.device &&
      !this.#autoStopped
    )
      await this.connect(true);
    if (authenticated && !this.connected)
      throw new CloudError("authentication_required", 401);
    if (this.#now() < this.#retryAt)
      throw new CloudError("cloud_temporarily_unavailable", 503);
    const requestEpoch = this.#epoch;
    const raw = body instanceof Blob;
    const headers: Record<string, string> = {};
    if (body !== undefined)
      headers["Content-Type"] = raw ? body.type : "application/json";
    const signal = AbortSignal.any([
      this.#lifetime.signal,
      AbortSignal.timeout(raw ? 20000 : 8000),
      ...(callerSignal ? [callerSignal] : []),
    ]);
    const waiting = this.#acquireRequest(callerSignal ? signal : this.#lifetime.signal);
    if (waiting) await waiting;
    try {
      this.#checkEpoch(requestEpoch);
      if (authenticated && !this.connected) throw new CloudError("authentication_required", 401);
      const requestSession = this.#session;
      if (authenticated && requestSession) headers.Authorization = `Bearer ${requestSession.token}`;
      const response = await this.#fetch(this.#origin + path, {
        method,
        headers,
        credentials: "omit",
        redirect: "error",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        signal,
        ...(body !== undefined
          ? { body: raw ? body : JSON.stringify(body) }
          : {}),
      });
      this.#checkEpoch(requestEpoch);
      if (!response.ok) {
        let code = "cloud_request_failed";
        try {
          const data = JSON.parse(
            new TextDecoder().decode(await this.#boundedBody(response, 4096)),
          ) as { error?: string };
          if (data.error) code = data.error;
        } catch {
          /* Bounded generic error. */
        }
        this.#checkEpoch(requestEpoch);
        if (response.status === 401 && authenticated) {
          if (this.#session !== requestSession) throw new CloudError("session_changed");
          this.#rejectSession(requestSession, path);
        }
        if (response.status >= 500) this.#failure();
        const retryAfter = response.headers.get("Retry-After");
        const retryDelay = retryAfter === null ? 0 : /^\d+$/.test(retryAfter)
          ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - this.#now();
        throw new CloudError(code, response.status,
          Number.isFinite(retryDelay) ? Math.max(0, Math.min(retryDelay, 86_400_000)) : 0);
      }
      this.#failures = 0;
      if (authenticated) this.#authenticated(path);
      return response;
    } catch (error) {
      if (callerSignal?.aborted) throw new CloudError("request_cancelled");
      if (error instanceof CloudError) throw error;
      this.#failure();
      throw new CloudError("cloud_temporarily_unavailable", 503);
    } finally {
      this.#activeRequests--;
      this.#requestWaiters.shift()?.();
    }
  }
  #acquireRequest(signal = this.#lifetime.signal): Promise<void> | undefined {
    if (signal.aborted) throw new CloudError("request_cancelled");
    if (this.#activeRequests < 6) { this.#activeRequests++; return; }
    if (this.#requestWaiters.length >= 24) throw new CloudError("too_many_requests", 429);
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer); signal.removeEventListener("abort", abort);
        const index = this.#requestWaiters.indexOf(grant); if (index >= 0) this.#requestWaiters.splice(index, 1);
      };
      const grant = () => { cleanup(); this.#activeRequests++; resolve(); };
      const abort = () => { cleanup(); reject(new CloudError("request_cancelled")); };
      const timer = setTimeout(() => { cleanup(); reject(new CloudError("too_many_requests", 429)); }, 5000);
      this.#requestWaiters.push(grant);
      signal.addEventListener("abort", abort, { once: true });
    });
  }
  #failure(): void {
    this.#failures++;
    if (this.#failures >= 2) this.#retryAt = this.#now() + 30000;
  }
  async #boundedBody(response: Response, max: number): Promise<Uint8Array> {
    const reader = response.body?.getReader();
    if (!reader) return new Uint8Array();
    const parts: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const p = await reader.read();
        if (p.done) break;
        length += p.value.byteLength;
        if (length > max) throw new CloudError("response_too_large");
        parts.push(p.value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const p of parts) {
      bytes.set(p, offset);
      offset += p.length;
    }
    return bytes;
  }
  isProfileBlocked(member: number): boolean { return this.#blocked.has(member) || this.options.isBlocked(member); }
  /**
   * Known addon identity for the room canvas, not live presence or fresh profile metadata.
   * Like a painted avatar's flower, this survives metadata expiry within the bounded account
   * cache. Block, denial, replacement/default, eviction and disconnect still remove the proof.
   * No profile cloning, storage, or network work runs per frame.
   */
  hasCachedAddonProfile(member: number): boolean {
    try {
      if (!this.connected || this.isProfileBlocked(member)) return false;
      const cached = this.#cache.get(member);
      return Boolean(cached && !cached.value.isDefault);
    } catch {
      // A guarded native relationship wrapper must hide the marker until it is readable again.
      return false;
    }
  }
  /** Synchronous, account-scoped snapshot; never opens storage or starts network work. */
  peekProfile(member: number): CloudProfile | undefined {
    if (!this.connected || this.isProfileBlocked(member)) return;
    const cached = this.#cache.get(member);
    if (!cached || this.#now() - cached.at >= 300000) return;
    this.#cache.delete(member); this.#cache.set(member, cached);
    return structuredClone(cached.value);
  }
  /** Only call after validating an explicit profile removal receipt. */
  forgetProfile(member:number):void {
    this.#profileVersion++;this.#cache.delete(member);this.#inflight.clear();this.#clearMedia();this.#notify(`profile:${member}`);
  }
  rememberProfile(value: CloudProfile): void {
    if (!this.connected || !value || !Number.isSafeInteger(value.memberNumber) || this.isProfileBlocked(value.memberNumber)) return;
    const previous = this.#cache.get(value.memberNumber)?.value;
    if (previous && !previous.isDefault && !value.isDefault &&
      value.revision < previous.revision && value.updatedAt <= previous.updatedAt) return;
    this.#cache.delete(value.memberNumber);
    this.#cache.set(value.memberNumber, { value: structuredClone(value), at: this.#now(), refreshAfter: this.#now() + 60000 });
    while (this.#cache.size > 100) this.#cache.delete(this.#cache.keys().next().value!);
    if (JSON.stringify(previous) !== JSON.stringify(value)) this.#notify(`profile:${value.memberNumber}`);
  }
  async profile(member: number, fresh = false, options?: { independent?: boolean }): Promise<CloudProfile> {
    this.#check();
    if (this.isProfileBlocked(member)) throw new CloudError("blocked", 404);
    const cached = this.#cache.get(member);
    if (!fresh && this.connected && cached && this.#now() - cached.at < 300000) {
      if (this.#now() >= cached.refreshAfter) void this.profile(member, true).catch(() => {});
      return structuredClone(cached.value);
    }
    const running = this.#inflight.get(member);
    // An explicit profile open may replace an older lookup for this member.
    // Default reads keep the existing deduplication and cache timing.
    if (running && !options?.independent) return running;
    const version = this.#profileVersion;
    const promise = this.request<CloudProfile>("GET", `/v1/profiles/${member}`)
      .then((value) => {
        this.#check();
        if (version !== this.#profileVersion || this.#inflight.get(member) !== promise || this.isProfileBlocked(member)) throw new CloudError("profile_changed");
        if (value.memberNumber !== member)
          throw new CloudError("invalid_profile");
        this.rememberProfile(value);
        return structuredClone(value);
      })
      .catch((error) => {
        if (version === this.#profileVersion && this.#inflight.get(member) === promise) {
          if (error instanceof CloudError && (error.status === 403 || error.status === 404)) {
            this.#cache.delete(member); this.#notify(`profile:${member}`);
          } else if (cached) cached.refreshAfter = this.#now() + 30000;
        }
        throw error;
      })
      .finally(() => { if (this.#inflight.get(member) === promise) this.#inflight.delete(member); });
    this.#inflight.set(member, promise);
    return promise;
  }
  async media(assetId: string, reportId?: MediaReportScope, options?: { fresh?: boolean; recoveryGeneration?: string }): Promise<Blob> {
    this.#check();
    if (!this.connected) throw new CloudError("not_connected");
    const generation = options?.recoveryGeneration;
    if (generation !== undefined && !/^[a-f0-9]{32}$/u.test(generation)) throw new CloudError('invalid_recovery_generation');
    const key = `${this.#epoch}:${mediaReportKey(reportId)}:${assetId}:${generation ?? ''}`;
    const cached = this.#mediaCache.get(key);
    if (!options?.fresh && cached && this.#now() - cached.at < 300000) {
      this.#mediaCache.delete(key); this.#mediaCache.set(key, cached); return cached.blob;
    }
    const existing = this.#mediaInflight.get(key);
    if (existing) return existing;
    const version = this.#mediaVersion;
    const task = this.#readMedia(assetId, reportId, generation).then(blob => {
      if (version !== this.#mediaVersion) throw new CloudError("media_changed");
      // Moderation evidence remains an explicit, permission-checked read.
      if (reportId === undefined) {
        const previous = this.#mediaCache.get(key);
        if (previous) { this.#mediaBytes -= previous.blob.size; this.#mediaCache.delete(key); }
        this.#mediaCache.set(key, { blob, at: this.#now() }); this.#mediaBytes += blob.size;
        while (this.#mediaCache.size > 80 || this.#mediaBytes > 24 * 1024 ** 2) {
          const first = this.#mediaCache.keys().next().value!;
          this.#mediaBytes -= this.#mediaCache.get(first)!.blob.size; this.#mediaCache.delete(first);
        }
      }
      return blob;
    }).finally(() => {
      if (this.#mediaInflight.get(key) === task) this.#mediaInflight.delete(key);
    });
    this.#mediaInflight.set(key, task);
    return task;
  }
  invitationAvatar(groupId: string, assetId: string, invitedAt: number, generation?: string): Promise<Blob> {
    return this.#invitationImage(`/v1/group-invitations/${encodeURIComponent(groupId)}/avatar/${encodeURIComponent(assetId)}`, invitedAt, generation);
  }
  async historicalInvitationAvatar(mailboxId: number, assetId: string, invitedAt: number, generation?: string): Promise<Blob> {
    if (!Number.isSafeInteger(mailboxId) || mailboxId <= 0) throw new CloudError("invalid_invitation");
    return this.#invitationImage(`/v1/mailbox/${mailboxId}/group-avatar/${encodeURIComponent(assetId)}`, invitedAt, generation);
  }
  /** Card art is readable only with the current viewer's grant for this card revision. */
  async swipeCardImage(member: number, revision: number): Promise<Blob> {
    if (!Number.isSafeInteger(member) || member < 1 || !Number.isSafeInteger(revision) || revision < 1)
      throw new CloudError("invalid_card");
    if (member !== this.memberNumber && this.isProfileBlocked(member)) throw new CloudError("profile_blocked", 403);
    const image = await this.#readImage(`/v1/matching/swipe/cards/${member}/image?revision=${revision}`);
    if (member !== this.memberNumber && this.isProfileBlocked(member)) throw new CloudError("profile_blocked", 403);
    return image;
  }
  async #invitationImage(path: string, invitedAt: number, generation?: string): Promise<Blob> {
    this.#check();
    if (!this.connected) throw new CloudError("not_connected");
    if (!Number.isSafeInteger(invitedAt) || invitedAt <= 0) throw new CloudError("invalid_invitation");
    if (generation !== undefined && !/^[a-f0-9]{32}$/u.test(generation)) throw new CloudError("invalid_recovery_generation");
    const query = new URLSearchParams({ invitedAt: String(invitedAt) });
    if (generation) query.set("recoveryGeneration", generation);
    const version = this.#mediaVersion;
    const blob = await this.#readImage(`${path}?${query}`, generation);
    if (version !== this.#mediaVersion) throw new CloudError("media_changed");
    return blob;
  }
  #clearMedia(): void {
    this.#mediaVersion++; this.#mediaCache.clear(); this.#mediaInflight.clear(); this.#mediaBytes = 0;
    this.#notify("media-invalidated");
  }
  async #readMedia(assetId: string, reportId?: MediaReportScope, generation?: string): Promise<Blob> {
    if (
      reportId !== undefined &&
      (typeof reportId === "number" ? !Number.isSafeInteger(reportId) || reportId <= 0 : !Number.isSafeInteger(reportId.id) || reportId.id <= 0 || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(reportId.communityId))
    )
      throw new CloudError("invalid_report");
    const path = reportId === undefined
        ? `/v1/media/${assetId}${generation ? `?recoveryGeneration=${generation}` : ''}`
        : typeof reportId === "object" ? `/v1/communities/${reportId.communityId}/reports/${reportId.id}/media/${assetId}${generation ? `?recoveryGeneration=${generation}` : ''}` : `/v1/moderation/reports/${reportId}/media/${assetId}${generation ? `?recoveryGeneration=${generation}` : ''}`;
    return this.#readImage(path, generation);
  }
  async #readImage(path: string, generation?: string): Promise<Blob> {
    const epoch = this.#epoch;
    const response = await this.#response("GET", path, undefined, true);
    if (generation && response.headers.get('x-recovery-generation') !== generation) throw new CloudError('recovery_generation_required', 409);
    if (response.headers.get("content-type")?.split(";")[0] !== "image/webp")
      throw new CloudError("invalid_image");
    const bytes = await this.#boundedBody(response, 3 * 1024 ** 2);
    this.#check();
    if (epoch !== this.#epoch) throw new CloudError("session_changed");
    return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "image/webp" });
  }
  retainEvents(): () => void {
    this.#eventLeases++; this.startEvents();
    return () => { this.#eventLeases = Math.max(0, this.#eventLeases - 1); if (!this.#eventLeases) this.stopEvents(); };
  }
  startEvents(): void {
    if (!this.connected || this.#stream) return;
    const controller = new AbortController();
    this.#stream = controller;
    void this.#events(controller);
  }
  async #events(controller: AbortController): Promise<void> {
    for (
      let attempt = 0;
      !controller.signal.aborted && this.connected;
      attempt++
    ) {
      // The server sends a heartbeat every 25 seconds. A half-open connection
      // can otherwise wait forever, losing all message hints until a tab reload.
      const requestController = new AbortController();
      const signal = AbortSignal.any([controller.signal, this.#lifetime.signal, requestController.signal]);
      let watchdog: ReturnType<typeof setTimeout> | undefined;
      const armWatchdog = () => {
        clearTimeout(watchdog);
        watchdog = setTimeout(() => requestController.abort(), 60000);
      };
      armWatchdog();
      try {
        const session = this.#session!;
        const response = await this.#fetch(this.#origin + "/v1/events", {
          headers: { Authorization: `Bearer ${session.token}` },
          credentials: "omit",
          redirect: "error",
          cache: "no-store",
          referrerPolicy: "no-referrer",
          signal,
        });
        this.#check();
        if (signal.aborted) break;
        if (response.status === 401) this.#rejectSession(session, "/v1/events");
        if (!response.ok || !response.body)
          throw new Error("stream_unavailable");
        const reader = response.body.getReader(),
          decoder = new TextDecoder();
        let buffer = "";
        try {
          for (;;) {
            const part = await reader.read();
            this.#check();
            if (part.done || signal.aborted) break;
            if (part.value.byteLength) { armWatchdog(); attempt = -1; }
            buffer += decoder.decode(part.value, { stream: true });
            if (buffer.length > 16384) throw new Error("stream_limit");
            let end;
            while ((end = buffer.indexOf("\n\n")) >= 0) {
              const entry = buffer.slice(0, end);
              buffer = buffer.slice(end + 2);
              const kind = /^event: (direct-retention|music-sessions|matching|workshop-moderation|workshop|profile-friends|profile-activity|profile-location|profile-discovery|profile-communities|privacy|albums|spaces|calendar|community-reports|communities|channel-read|channel-messages|feed|groups|typing|reports|ready|relationships|mailbox|direct|direct-reactions|message-reactions|read|receipts|feed-read|preferences)\n/mu.exec(entry)?.[1];
              if (kind) { this.#authenticated("/v1/events");
                if (["profile-discovery", "privacy", "relationships", "ready"].includes(kind)) { this.#profileVersion++; this.#cache.clear(); this.#inflight.clear(); this.#notify("profiles-cleared", kind); } if (["relationships", "communities", "community-reports", "ready"].includes(kind)) this.#clearMedia(); this.#notify(kind); }
            }
          }
        } finally {
          await reader.cancel().catch(() => {});
        }
      } catch {
        /* Native BC continues. Reconnect only while an event consumer retains the stream. */
      } finally {
        clearTimeout(watchdog);
        requestController.abort();
      }
      if (!controller.signal.aborted)
        await new Promise<void>((resolve) => {
          const done = () => {
            clearTimeout(timer);
            controller.signal.removeEventListener("abort", done);
            resolve();
          };
          const timer = setTimeout(done, Math.min(60_000, 1000 * 2 ** Math.min(attempt, 6)));
          controller.signal.addEventListener("abort", done, { once: true });
        });
    }
    if (this.#stream === controller) this.#stream = undefined;
  }
  stopEvents(force = false): void {
    if (!force && this.#eventLeases > 0) return;
    this.#stream?.abort();
    this.#stream = undefined;
  }
  /** Apply only a validated block acknowledgement in its still-current account UI. */
  rememberBlock(member:number,blocked:boolean):void {
    if(!Number.isSafeInteger(member)||member<1||this.#closed)return;
    this.#profileVersion++;this.#inflight.clear();
    if(blocked)this.#blocked.add(member);else this.#blocked.delete(member);
    this.#cache.clear();this.#clearMedia();this.#notify('profiles-cleared');
  }
  async logout(allDevices = false, review?: AccountControlReview): Promise<void> {
    if(review&&(this.#closed||this.memberNumber!==review.owner||this.origin!==review.origin))throw new CloudError('session_changed');
    const logoutOwner=this.memberNumber;let logoutVersion=this.#sessionVersion;
    for (const controller of this.#uploads) controller.abort();
    this.#autoStopped = true;
    clearTimeout(this.#refreshTimer);
    try {
      // An expired access token must not leave a still-valid device grant behind.
      // This uses the saved signature only and never starts another native proof.
      if (!this.connected && this.#deviceKey?.device){
        await this.#resumeDevice(this.#epoch);logoutVersion=this.#sessionVersion;
      }
      if (this.connected) {
        if(review)await preflightAccountControl(this,review,()=>!this.#closed&&logoutVersion===this.#sessionVersion);
        if(logoutVersion!==this.#sessionVersion)throw new CloudError('session_changed');
        const operationId=crypto.randomUUID(),action=allDevices?'logout-all':'logout';
        const result=await this.request('POST',allDevices?'/v1/auth/logout-all':'/v1/auth/logout',review?accountControlBody(review,operationId):{});
        if(logoutVersion!==this.#sessionVersion)throw new CloudError('session_changed');
        if(review)accountControlReceipt(result,review,operationId,action,{signedOut:allDevices?'all':'current'});
      }
    } catch(error) {throw accountControlError(error);
    } finally {
     if(!this.#closed&&logoutVersion===this.#sessionVersion&&this.memberNumber===logoutOwner){
      clearTimeout(this.#refreshTimer);
      const cleanupEpoch=++this.#epoch;
      this.#lifetime.abort();
      this.#lifetime = new AbortController();
      this.#session = undefined;
      this.#pending = undefined;
      this.#deviceKey = undefined;
      if (this.#deviceStore)
        await this.#store(() => this.#deviceStore!.pause());
      if(cleanupEpoch===this.#epoch&&logoutVersion===this.#sessionVersion&&!this.#closed&&this.memberNumber===logoutOwner){
        this.#setConnection("idle");this.#cache.clear();this.#clearMedia();this.#blocked.clear();this.stopEvents(true);this.#notify("session");
      }
     }
    }
  }
  destroy(): void {
    this.#closed = true;
    this.#lifetime.abort();
    clearTimeout(this.#refreshTimer);
    this.#deviceKey = undefined;
    this.stopEvents(true);
    this.#session = undefined;
    this.#pending = undefined;
    this.#cache.clear();
    this.#clearMedia(); this.#blocked.clear();
    this.#inflight.clear();
    this.#listeners.clear();
  }
}
