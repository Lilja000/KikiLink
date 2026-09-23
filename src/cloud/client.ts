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
  ) {
    super(code);
  }
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
  #listeners = new Set<(kind: string) => void>();
  #activeRequests = 0;
  #requestWaiters: Array<() => void> = [];
  #epoch = 0;
  #deviceKey: DeviceKey | undefined;
  readonly #deviceStore: CloudDeviceStore | undefined;
  #connectTask: Promise<void> | undefined;
  #refreshTimer: ReturnType<typeof setTimeout> | undefined;
  #autoStopped = false;
  #connectionState: CloudConnectionState = "idle";
  #connectionError = "";
  #storageTask: Promise<unknown> = Promise.resolve();

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
  get retryDelay(): number { return Math.max(0, this.#retryAt - this.#now()); }
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
        }
        throw error;
      })
      .finally(() => {
        if (this.#connectTask === task) this.#connectTask = undefined;
      });
    this.#connectTask = task;
    return task;
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
        delete this.#deviceKey.device;
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
    this.#session = session;
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
  subscribe(listener: (kind: string) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  #notify(kind: string): void {
    for (const listener of this.#listeners) {
      try {
        listener(kind);
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
  ): Promise<T> {
    const epoch = this.#epoch;
    const response = await this.#response(method, path, body, authenticated);
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
    if (method !== "GET" && (path.startsWith("/v1/blocks") || path === "/v1/profiles/me")) {
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
        } else if (method === "PUT") this.rememberProfile(value as CloudProfile);
      }
    }
    if (method === "DELETE" && (path === "/v1/profiles/me" || /^\/v1\/groups\/[^/]+(?:\/members\/\d+)?$/u.test(path))) this.#clearMedia();
    return value;
  }
  async #response(
    method: string,
    path: string,
    body: unknown,
    authenticated: boolean,
  ): Promise<Response> {
    this.#check();
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
    ]);
    const waiting = this.#acquireRequest();
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
          this.#epoch++;
          this.#session = undefined;
          this.#profileVersion++;
          this.#inflight.clear();
          this.#cache.clear();
          this.#clearMedia();
          this.stopEvents(true);
          this.#notify("session");
        }
        if (response.status >= 500) this.#failure();
        throw new CloudError(code, response.status);
      }
      this.#failures = 0;
      return response;
    } catch (error) {
      if (error instanceof CloudError) throw error;
      this.#failure();
      throw new CloudError("cloud_temporarily_unavailable", 503);
    } finally {
      this.#activeRequests--;
      this.#requestWaiters.shift()?.();
    }
  }
  #acquireRequest(): Promise<void> | undefined {
    if (this.#activeRequests < 6) { this.#activeRequests++; return; }
    if (this.#requestWaiters.length >= 24) throw new CloudError("too_many_requests", 429);
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer); this.#lifetime.signal.removeEventListener("abort", abort);
        const index = this.#requestWaiters.indexOf(grant); if (index >= 0) this.#requestWaiters.splice(index, 1);
      };
      const grant = () => { cleanup(); this.#activeRequests++; resolve(); };
      const abort = () => { cleanup(); reject(new CloudError("request_cancelled")); };
      const timer = setTimeout(() => { cleanup(); reject(new CloudError("too_many_requests", 429)); }, 5000);
      this.#requestWaiters.push(grant);
      this.#lifetime.signal.addEventListener("abort", abort, { once: true });
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
  /** Synchronous, account-scoped snapshot; never opens storage or starts network work. */
  peekProfile(member: number): CloudProfile | undefined {
    if (!this.connected || this.isProfileBlocked(member)) return;
    const cached = this.#cache.get(member);
    if (!cached || this.#now() - cached.at >= 300000) return;
    this.#cache.delete(member); this.#cache.set(member, cached);
    return structuredClone(cached.value);
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
  async profile(member: number, fresh = false): Promise<CloudProfile> {
    this.#check();
    if (this.isProfileBlocked(member)) throw new CloudError("blocked", 404);
    const cached = this.#cache.get(member);
    if (!fresh && this.connected && cached && this.#now() - cached.at < 300000) {
      if (this.#now() >= cached.refreshAfter) void this.profile(member, true).catch(() => {});
      return structuredClone(cached.value);
    }
    const running = this.#inflight.get(member);
    if (running) return running;
    const version = this.#profileVersion;
    const promise = this.request<CloudProfile>("GET", `/v1/profiles/${member}`)
      .then((value) => {
        this.#check();
        if (version !== this.#profileVersion || this.isProfileBlocked(member)) throw new CloudError("profile_changed");
        if (value.memberNumber !== member)
          throw new CloudError("invalid_profile");
        this.rememberProfile(value);
        return structuredClone(value);
      })
      .catch((error) => {
        if (version === this.#profileVersion) {
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
  async media(assetId: string, reportId?: number): Promise<Blob> {
    this.#check();
    if (!this.connected) throw new CloudError("not_connected");
    const key = `${this.#epoch}:${reportId ?? "profile"}:${assetId}`;
    const cached = this.#mediaCache.get(key);
    if (cached && this.#now() - cached.at < 300000) {
      this.#mediaCache.delete(key); this.#mediaCache.set(key, cached); return cached.blob;
    }
    const existing = this.#mediaInflight.get(key);
    if (existing) return existing;
    const version = this.#mediaVersion;
    const task = this.#readMedia(assetId, reportId).then(blob => {
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
  #clearMedia(): void {
    this.#mediaVersion++; this.#mediaCache.clear(); this.#mediaInflight.clear(); this.#mediaBytes = 0;
    this.#notify("media-invalidated");
  }
  async #readMedia(assetId: string, reportId?: number): Promise<Blob> {
    if (
      reportId !== undefined &&
      (!Number.isSafeInteger(reportId) || reportId <= 0)
    )
      throw new CloudError("invalid_report");
    const epoch = this.#epoch;
    const response = await this.#response(
      "GET",
      reportId === undefined
        ? `/v1/media/${assetId}`
        : `/v1/moderation/reports/${reportId}/media/${assetId}`,
      undefined,
      true,
    );
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
      try {
        const response = await this.#fetch(this.#origin + "/v1/events", {
          headers: { Authorization: `Bearer ${this.#session!.token}` },
          credentials: "omit",
          redirect: "error",
          cache: "no-store",
          referrerPolicy: "no-referrer",
          signal: AbortSignal.any([controller.signal, this.#lifetime.signal]),
        });
        if (!response.ok || !response.body)
          throw new Error("stream_unavailable");
        const reader = response.body.getReader(),
          decoder = new TextDecoder();
        let buffer = "";
        try {
          for (;;) {
            const part = await reader.read();
            this.#check();
            if (part.done) break;
            buffer += decoder.decode(part.value, { stream: true });
            if (buffer.length > 16384) throw new Error("stream_limit");
            let end;
            while ((end = buffer.indexOf("\n\n")) >= 0) {
              const entry = buffer.slice(0, end);
              buffer = buffer.slice(end + 2);
              const kind = /^event: (feed|groups|typing|reports|ready|relationships|mailbox|direct|read|receipts|feed-read|preferences)\n/mu.exec(entry)?.[1];
              if (kind) this.#notify(kind);
            }
          }
        } finally {
          await reader.cancel().catch(() => {});
        }
      } catch {
        /* Native BC continues. Reconnect is bounded and only while this panel is open. */
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
  async logout(allDevices = false): Promise<void> {
    this.#autoStopped = true;
    clearTimeout(this.#refreshTimer);
    try {
      // An expired access token must not leave a still-valid device grant behind.
      // This uses the saved signature only and never starts another native proof.
      if (!this.connected && this.#deviceKey?.device)
        await this.#resumeDevice(this.#epoch);
      if (this.connected)
        await this.request(
          "POST",
          allDevices ? "/v1/auth/logout-all" : "/v1/auth/logout",
          {},
        );
    } finally {
      clearTimeout(this.#refreshTimer);
      this.#epoch++;
      this.#lifetime.abort();
      this.#lifetime = new AbortController();
      this.#session = undefined;
      this.#pending = undefined;
      this.#deviceKey = undefined;
      if (this.#deviceStore)
        await this.#store(() => this.#deviceStore!.pause());
      this.#setConnection("idle");
      this.#cache.clear();
      this.#clearMedia(); this.#blocked.clear();
      this.stopEvents(true);
      this.#notify("session");
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
