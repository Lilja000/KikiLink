import { afterEach, describe, it, expect, vi } from "vitest";
import { CloudClient, KIKILINK_CLOUD_ORIGIN } from "../src/cloud/client";
import { createDeviceKey } from "../src/cloud/device-key";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import {
  profileImportDraft,
} from "../src/cloud/migration";

const origin = "https://cloud.example.test";
afterEach(() => vi.useRealTimers());
function setup(fetchImpl: typeof fetch) {
  let member = 101;
  const client = new CloudClient({
    origin,
    memberNumber: 101,
    getMemberNumber: () => member,
    isBlocked: () => false,
    sendProof: () => {},
    fetchImpl,
  });
  return {
    client,
    setMember: (n: number) => {
      member = n;
    },
  };
}
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
describe("Cloud client account and migration boundaries", () => {
  it("remote revocation during proactive renewal invalidates pending private reads and never sends a new automatic proof", async () => {
    const key = await createDeviceKey();
    key.device = { id: crypto.randomUUID(), expiresAt: Date.now() + 86400000 };
    let revoked = false, release!: (value: Response) => void;
    const pause = vi.fn(async () => {}), sendProof = vi.fn();
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const path = new URL(String(url)).pathname;
      if (path === "/v1/auth/device-challenges") return revoked ? response({ error: "device_unavailable" }, 401)
        : response({ challengeId: crypto.randomUUID(), nonce: "n".repeat(43), expiresAt: Date.now() + 60000 });
      if (path === "/v1/auth/device-exchange") return response({ memberNumber: 101, token: "a".repeat(43), expiresAt: Date.now() + 3600000, device: key.device });
      if (path === "/v1/account/sessions") return new Promise<Response>(r => { release = r; });
      throw new Error("Unexpected automatic enrollment");
    });
    const client = new CloudClient({ origin, memberNumber: 101, getMemberNumber: () => 101, isBlocked: () => false, sendProof, fetchImpl,
      pageOrigin: "https://bc.example.test", deviceStore: { load: async () => key, save: async () => {}, pause } });
    try {
      await client.connect();
      const pending = client.request("GET", "/v1/account/sessions");
      await vi.waitFor(() => expect(release).toBeDefined());
      revoked = true; await expect(client.connect(true, true)).rejects.toMatchObject({ code: "device_access_revoked" });
      release(response({ memberNumber: 101, private: "must not return" }));
      await expect(pending).rejects.toMatchObject({ code: "session_changed" });
      expect(client.connected).toBe(false); expect(pause).toHaveBeenCalledOnce();
      await client.connect(true); expect(sendProof).not.toHaveBeenCalled();
    } finally { client.destroy(); }
  });
  it.each(["recover", "destroy", "logout", "account-switch"])("backs off persistent event authentication rejection despite successful renewal and other endpoints: %s", async action => {
    vi.useFakeTimers();
    const key = await createDeviceKey();
    key.device = { id: crypto.randomUUID(), expiresAt: Date.now() + 86400000 };
    let exchanges = 0, allowEvents = false, member = 101;
    const attempts: number[] = [];
    const sendProof = vi.fn();
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(url)).pathname;
      if (path === "/v1/auth/device-challenges") return response({ challengeId: crypto.randomUUID(), nonce: "n".repeat(43), expiresAt: Date.now() + 60000 });
      if (path === "/v1/auth/device-exchange") { exchanges++; return response({ memberNumber: 101, token: "a".repeat(43), expiresAt: Date.now() + 3600000, device: key.device }); }
      if (path === "/v1/events") {
        attempts.push(Date.now());
        if (attempts.length >= 20) client.destroy(); // Bound a broken implementation's test traffic.
        if (!allowEvents) return response({ error: "session_expired" }, 401);
        return new Response(new ReadableStream({ start(controller) {
          init!.signal!.addEventListener("abort", () => controller.error(init!.signal!.reason), { once: true });
          controller.enqueue(new TextEncoder().encode("event: ready\ndata: {}\n\n"));
        } }));
      }
      return response({});
    });
    const client = new CloudClient({ origin, memberNumber: 101, getMemberNumber: () => member, isBlocked: () => false, sendProof, fetchImpl,
      pageOrigin: "https://bc.example.test", deviceStore: { load: async () => key, save: async () => {}, pause: async () => {} } });
    // Real consumers bootstrap other authenticated resources after each session.
    client.subscribe(kind => { if (kind === "session" && client.connected) void client.request("GET", "/v1/me").catch(() => {}); });
    try {
      await client.connect(); client.retainEvents();
      await vi.advanceTimersByTimeAsync(1000);
      await vi.waitFor(() => expect(attempts.length).toBeGreaterThanOrEqual(2));
      expect(exchanges).toBe(2);
      expect(attempts).toHaveLength(2);
      const before = fetchImpl.mock.calls.length;
      await expect(client.request("GET", "/v1/me")).rejects.toMatchObject({ status: 503 });
      expect(fetchImpl).toHaveBeenCalledTimes(before);
      if (action !== "recover") {
        if (action === "destroy") client.destroy();
        if (action === "logout") await client.logout();
        if (action === "account-switch") member = 202;
        const stopped = fetchImpl.mock.calls.length;
        await vi.advanceTimersByTimeAsync(120000);
        expect(fetchImpl).toHaveBeenCalledTimes(stopped);
        expect(client.connected).toBe(false);
        expect(sendProof).not.toHaveBeenCalled();
        return;
      }
      await vi.advanceTimersByTimeAsync(120000);
      expect(attempts.length).toBeLessThanOrEqual(7);
      for (let i = 2; i < attempts.length; i++) expect(attempts[i]! - attempts[i - 1]!).toBeGreaterThanOrEqual(Math.min(60000, 5000 * 2 ** (i - 2)));
      allowEvents = true;
      await vi.advanceTimersByTimeAsync(60000);
      await vi.waitFor(() => expect(client.connected).toBe(true));
      expect(sendProof).not.toHaveBeenCalled();
      // An actual ready event resets rejection backoff for a later independent outage.
      const recovered = attempts.length;
      allowEvents = false; client.stopEvents(true); client.startEvents();
      await vi.advanceTimersByTimeAsync(1000);
      await vi.waitFor(() => expect(attempts).toHaveLength(recovered + 2));
      client.destroy();
      const stopped = fetchImpl.mock.calls.length;
      await vi.advanceTimersByTimeAsync(120000);
      expect(fetchImpl).toHaveBeenCalledTimes(stopped);
    } finally { client.destroy(); }
  });

  it.each(["request", "events"])("renews a rejected access token from its device grant after %s returns 401", async source => {
    vi.useFakeTimers();
    const key = await createDeviceKey();
    key.device = { id: crypto.randomUUID(), expiresAt: Date.now() + 86400000 };
    let exchanges = 0, streams = 0, posts = 0;
    const sendProof = vi.fn();
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(url)).pathname;
      if (path === "/v1/auth/device-challenges") return response({ challengeId: crypto.randomUUID(), nonce: "n".repeat(43), expiresAt: Date.now() + 60000 });
      if (path === "/v1/auth/device-exchange") return response({ memberNumber: 101, token: (++exchanges === 1 ? "a" : "b").repeat(43), expiresAt: Date.now() + 3600000, device: key.device });
      if (path === "/v1/direct/202/messages") { posts++; return response({ error: "session_expired" }, 401); }
      if (path === "/v1/events") {
        streams++;
        if (source === "events" && exchanges === 1) return response({ error: "session_expired" }, 401);
        return new Response(new ReadableStream({ start(controller) {
          init!.signal!.addEventListener("abort", () => controller.error(init!.signal!.reason), { once: true });
          controller.enqueue(new TextEncoder().encode("event: ready\ndata: {}\n\n"));
        } }));
      }
      throw new Error("Unexpected authentication request");
    });
    const client = new CloudClient({ origin, memberNumber: 101, getMemberNumber: () => 101, isBlocked: () => false, sendProof, fetchImpl,
      pageOrigin: "https://bc.example.test", deviceStore: { load: async () => key, save: async () => {}, pause: async () => {} } });
    const hints = vi.fn(); client.subscribe(hints);
    try {
      await client.connect();
      const release = client.retainEvents();
      if (source === "request") await expect(client.request("POST", "/v1/direct/202/messages", { text: "Keep stable ID" })).rejects.toMatchObject({ status: 401 });
      await vi.advanceTimersByTimeAsync(1000);
      await vi.waitFor(() => expect(exchanges).toBe(2));
      expect(client.connected).toBe(true);
      expect(client.connectionState).toBe("connected");
      expect(streams).toBe(2);
      expect(posts).toBe(source === "request" ? 1 : 0); // The owner decides whether a failed mutation can be replayed.
      expect(sendProof).not.toHaveBeenCalled();
      expect(hints.mock.calls.filter(([kind]) => kind === "ready")).toHaveLength(source === "request" ? 2 : 1);
      release();
    } finally { client.destroy(); }
  });

  it.each(["recover", "logout", "account-switch"])("handles a temporary device-session renewal failure: %s", async action => {
    vi.useFakeTimers();
    const key = await createDeviceKey();
    key.device = { id: crypto.randomUUID(), expiresAt: Date.now() + 86400000 };
    let challenges = 0, member = 101;
    const sendProof = vi.fn();
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const path = new URL(String(url)).pathname;
      if (path === "/v1/auth/device-challenges") {
        if (++challenges === 2) return response({ error: "temporarily_unavailable" }, 503);
        return response({ challengeId: crypto.randomUUID(), nonce: "n".repeat(43), expiresAt: Date.now() + 60000 });
      }
      if (path === "/v1/auth/device-exchange") return response({ memberNumber: 101, token: "t".repeat(43), expiresAt: Date.now() + 120000, device: key.device });
      if (path === "/v1/auth/logout") return response({});
      throw new Error("Unexpected authentication request");
    });
    const client = new CloudClient({ origin, memberNumber: 101, getMemberNumber: () => member, isBlocked: () => false, sendProof, fetchImpl,
      pageOrigin: "https://bc.example.test", deviceStore: { load: async () => key, save: async () => {}, pause: async () => {} } });
    try {
      await client.connect();
      await vi.advanceTimersByTimeAsync(90000);
      expect(challenges).toBe(2); expect(client.connectionState).toBe("unavailable");
      if (action === "logout") await client.logout();
      if (action === "account-switch") member = 202;
      await vi.advanceTimersByTimeAsync(5000);
      expect(challenges).toBe(action === "recover" ? 3 : 2);
      if (action === "recover") await vi.waitFor(() => expect(client.connectionState).toBe("connected"));
      expect(sendProof).not.toHaveBeenCalled();
    } finally { client.destroy(); }
  });

  it.each(["recover", "destroy", "logout", "account-switch"])("handles a 401 while an older proactive renewal is still pending: %s", async action => {
    vi.useFakeTimers();
    const key = await createDeviceKey();
    key.device = { id: crypto.randomUUID(), expiresAt: Date.now() + 86400000 };
    let challenges = 0, exchanges = 0, member = 101;
    let finishChallenge!: () => void;
    const challenge = () => response({ challengeId: crypto.randomUUID(), nonce: "n".repeat(43), expiresAt: Date.now() + 60000 });
    const sendProof = vi.fn();
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const path = new URL(String(url)).pathname;
      if (path === "/v1/auth/device-challenges") {
        if (++challenges === 2) return new Promise<Response>(resolve => { finishChallenge = () => resolve(challenge()); });
        return challenge();
      }
      if (path === "/v1/auth/device-exchange") return response({ memberNumber: 101, token: (++exchanges === 1 ? "a" : "b").repeat(43), expiresAt: Date.now() + 3600000, device: key.device });
      if (path === "/v1/auth/logout") return response({});
      return response({ error: "session_expired" }, 401);
    });
    const client = new CloudClient({ origin, memberNumber: 101, getMemberNumber: () => member, isBlocked: () => false, sendProof, fetchImpl,
      pageOrigin: "https://bc.example.test", deviceStore: { load: async () => key, save: async () => {}, pause: async () => {} } });
    try {
      await client.connect();
      const renewal = client.connect(true, true).catch(() => {});
      await vi.waitFor(() => expect(finishChallenge).toBeTypeOf("function"));
      await expect(client.request("GET", "/v1/direct/inbox")).rejects.toMatchObject({ status: 401 });
      await vi.advanceTimersByTimeAsync(1);
      if (action === "destroy") client.destroy();
      if (action === "account-switch") member = 202;
      if (action === "logout") await client.logout();
      const before = fetchImpl.mock.calls.length;
      finishChallenge(); await renewal;
      await vi.advanceTimersByTimeAsync(1000);
      if (action === "recover") {
        await vi.waitFor(() => expect(client.connected).toBe(true));
        expect(exchanges).toBe(2);
      } else expect(fetchImpl).toHaveBeenCalledTimes(before);
      expect(sendProof).not.toHaveBeenCalled();
    } finally { client.destroy(); }
  });

  it.each(["headers", "body"])("reconnects a stalled event stream at %s and catches up once", async stall => {
    vi.useFakeTimers();
    let streams = 0;
    const signals: AbortSignal[] = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(url)).pathname;
      if (path === "/v1/auth/challenges") return response({ challengeId: crypto.randomUUID(), proof: "a".repeat(43), exchange: "b".repeat(43), verifierMember: 909, expiresAt: Date.now() + 60000 });
      if (path === "/v1/auth/exchange") return response({ memberNumber: 101, token: "t".repeat(43), expiresAt: Date.now() + 3600000 });
      if (path !== "/v1/events") throw new Error("Unexpected path");
      const signal = init!.signal!; signals.push(signal); streams++;
      if (streams === 1 && stall === "headers") return new Promise<Response>((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
      return new Response(new ReadableStream({ start(controller) {
        signal.addEventListener("abort", () => controller.error(signal.reason), { once: true });
        controller.enqueue(new TextEncoder().encode("event: ready\ndata: {}\n\n"));
      } }), { headers: { "content-type": "text/event-stream" } });
    });
    const { client } = setup(fetchImpl); await client.connect();
    const hints = vi.fn(); client.subscribe(hints);
    const release = client.retainEvents();
    try {
      await vi.advanceTimersByTimeAsync(0);
      expect(streams).toBe(1);
      await vi.advanceTimersByTimeAsync(61000);
      expect(signals[0]!.aborted).toBe(true);
      expect(streams).toBe(2);
      expect(hints.mock.calls.filter(([kind]) => kind === "ready")).toHaveLength(stall === "headers" ? 1 : 2);
      release(); await vi.advanceTimersByTimeAsync(120000);
      expect(streams).toBe(2);
    } finally { client.destroy(); }
  });

  it("keeps a healthy event stream alive through server heartbeats", async () => {
    vi.useFakeTimers();
    let feed!: ReadableStreamDefaultController<Uint8Array>, streams = 0;
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const path = new URL(String(url)).pathname;
      if (path === "/v1/auth/challenges") return response({ challengeId: crypto.randomUUID(), proof: "a".repeat(43), exchange: "b".repeat(43), verifierMember: 909, expiresAt: Date.now() + 60000 });
      if (path === "/v1/auth/exchange") return response({ memberNumber: 101, token: "t".repeat(43), expiresAt: Date.now() + 3600000 });
      streams++;
      return new Response(new ReadableStream<Uint8Array>({ start(controller) { feed = controller; } }));
    });
    const { client } = setup(fetchImpl); await client.connect(); client.retainEvents();
    try {
      for (let i = 0; i < 6; i++) {
        await vi.advanceTimersByTimeAsync(25000);
        feed.enqueue(new TextEncoder().encode(": keepalive\n\n"));
        await vi.advanceTimersByTimeAsync(0);
      }
      expect(streams).toBe(1);
    } finally { feed.close(); client.destroy(); }
  });

  it("carries the server's Retry-After delay to callers", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const path = new URL(String(url)).pathname;
      if (path === "/v1/auth/challenges") return response({ challengeId: crypto.randomUUID(), proof: "a".repeat(43), exchange: "b".repeat(43), verifierMember: 909, expiresAt: Date.now() + 60000 });
      if (path === "/v1/auth/exchange") return response({ memberNumber: 101, token: "t".repeat(43), expiresAt: Date.now() + 3600000 });
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { "Retry-After": "3475" } });
    });
    const { client } = setup(fetchImpl); await client.connect();
    try {
      await expect(client.request("PATCH", "/v1/preferences/me", { updates: {}, revision: 0 }))
        .rejects.toMatchObject({ code: "rate_limited", status: 429, retryAfterMs: 3_475_000 });
    } finally { client.destroy(); }
  });
  it("shares concurrent avatar reads and rejects their result after an account switch", async () => {
    let complete!: (response: Response) => void;
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const path = new URL(String(url)).pathname;
      if (path === "/v1/auth/challenges") return response({ challengeId: crypto.randomUUID(), proof: "a".repeat(43), exchange: "b".repeat(43), verifierMember: 909, expiresAt: Date.now() + 60000 });
      if (path === "/v1/auth/exchange") return response({ memberNumber: 101, token: "t".repeat(43), expiresAt: Date.now() + 3600000 });
      return new Promise<Response>(resolve => { complete = resolve; });
    });
    const { client, setMember } = setup(fetchImpl); await client.connect();
    const reads = [client.media("same-avatar"), client.media("same-avatar")];
    const results = Promise.allSettled(reads);
    expect(fetchImpl.mock.calls.filter(([url]) => String(url).endsWith("/v1/media/same-avatar"))).toHaveLength(1);
    setMember(202); complete(new Response(new Blob(["pixels"]), { headers: { "content-type": "image/webp" } }));
    expect((await results).every(result => result.status === "rejected")).toBe(true); client.destroy();
  });
  it("bypasses a cached image for explicit viewing and respects a new access denial", async () => {
    let reads = 0, denied = false;
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const path = new URL(String(url)).pathname;
      if (path === "/v1/auth/challenges") return response({ challengeId: crypto.randomUUID(), proof: "a".repeat(43), exchange: "b".repeat(43), verifierMember: 909, expiresAt: Date.now() + 60000 });
      if (path === "/v1/auth/exchange") return response({ memberNumber: 101, token: "t".repeat(43), expiresAt: Date.now() + 3600000 });
      reads++;
      return denied ? new Response(JSON.stringify({ error: "forbidden" }), { status: 403 }) : new Response(new Blob(["pixels"]), { headers: { "content-type": "image/webp" } });
    });
    const { client } = setup(fetchImpl); await client.connect();
    try {
      await client.media("private"); await client.media("private"); expect(reads).toBe(1);
      denied = true; await expect(client.media("private", undefined, { fresh: true })).rejects.toMatchObject({ status: 403 }); expect(reads).toBe(2);
    } finally { client.destroy(); }
  });
  it.each(["pending", "historical"] as const)("checks %s invitation avatar access on each read and keeps its bytes out of general media", async kind => {
    const groupId = crypto.randomUUID(), assetId = crypto.randomUUID(), generation = "a".repeat(32);
    const path = kind === "pending" ? `/v1/group-invitations/${groupId}/avatar/${assetId}` : `/v1/mailbox/71/group-avatar/${assetId}`;
    let revoked = false, responseGeneration = generation;
    const reads: string[] = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const { pathname, searchParams } = new URL(String(url));
      if (pathname === "/v1/auth/challenges") return response({ challengeId: crypto.randomUUID(), proof: "a".repeat(43),
        exchange: "b".repeat(43), verifierMember: 909, expiresAt: Date.now() + 60000 });
      if (pathname === "/v1/auth/exchange") return response({ memberNumber: 101, token: "t".repeat(43), expiresAt: Date.now() + 3600000 });
      reads.push(pathname);
      if (pathname !== path || revoked) return response({ error: "forbidden" }, 403);
      expect(init?.method).toBe("GET");
      expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${"t".repeat(43)}`);
      expect(searchParams.get("invitedAt")).toBe("100");
      expect(searchParams.get("recoveryGeneration")).toBe(generation);
      return new Response("invitation thumbnail", { headers: { "content-type": "image/webp", "x-recovery-generation": responseGeneration } });
    });
    const { client } = setup(fetchImpl);
    try {
      await client.connect();
      const read = () => kind === "pending" ? client.invitationAvatar(groupId, assetId, 100, generation) :
        client.historicalInvitationAvatar(71, assetId, 100, generation);
      expect(await (await read()).text()).toBe("invitation thumbnail");
      responseGeneration = "b".repeat(32);
      await expect(read()).rejects.toMatchObject({ code: "recovery_generation_required" });
      revoked = true;
      await expect(read()).rejects.toMatchObject({ status: 403 });
      await expect(client.media(assetId, undefined, { recoveryGeneration: generation })).rejects.toMatchObject({ status: 403 });
      expect(reads).toEqual([path, path, path, `/v1/media/${assetId}`]);
    } finally { client.destroy(); }
  });
  it("is off by default and construction sends zero requests", () => {
    expect(KIKILINK_CLOUD_ORIGIN).toBe("");
    const fetchImpl = vi.fn();
    const { client } = setup(fetchImpl);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(client.connected).toBe(false);
    client.destroy();
  });
  it("refuses a challenge result after an account switch", async () => {
    let resolve!: (response: Response) => void;
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((r) => {
          resolve = r;
        }),
    );
    const { client, setMember } = setup(fetchImpl);
    const pending = client.beginIdentity();
    setMember(202);
    resolve(
      response({
        challengeId: crypto.randomUUID(),
        proof: "a".repeat(43),
        exchange: "b".repeat(43),
        verifierMember: 909,
        expiresAt: Date.now() + 60000,
      }),
    );
    await expect(pending).rejects.toThrow("account_changed");
    expect(client.verifying).toBe(false);
    client.destroy();
  });
  it("rejects oversized responses before trusting an authentication challenge", async () => {
    const { client } = setup(
      vi.fn(async () => response({ blob: "x".repeat(600000) })),
    );
    await expect(client.beginIdentity()).rejects.toThrow("response_too_large");
    client.destroy();
  });
  it("does not send another origin, credentialed URL, or insecure HTTP", () => {
    expect(
      () =>
        new CloudClient({
          origin: "http://cloud.example.test",
          memberNumber: 101,
          getMemberNumber: () => 101,
          isBlocked: () => false,
          sendProof: () => {},
        }),
    ).toThrow("invalid_cloud_origin");
    expect(
      () =>
        new CloudClient({
          origin: "https://secret@cloud.example.test",
          memberNumber: 101,
          getMemberNumber: () => 101,
          isBlocked: () => false,
          sendProof: () => {},
        }),
    ).toThrow("invalid_cloud_origin");
  });
  it("copies only selected profile fields and never migrates Catbox URLs, private notes or histories", () => {
    const storage = new MemoryKeyValueStorage(),
      settings = new SettingsStore(storage);
    settings.update((s) => {
      s.linkPresence.avatarUrl = "https://files.catbox.moe/existing.png";
      s.linkPresence.bio = "A profile bio";
    });
    const before = JSON.stringify(settings.get());
    const draft = profileImportDraft(settings.get(), "Kiki");
    expect(draft.bio).toBe("A profile bio");
    expect(draft).not.toHaveProperty("avatarUrl");
    expect(draft).not.toHaveProperty("avatarId");
    expect(JSON.stringify(settings.get())).toBe(before);
    expect(JSON.stringify(settings.get())).toBe(before);
  });
});

it('queues a group profile burst within six active requests and rejects queued work after account change', async()=>{
  let active=0,peak=0;
  const fetchImpl=vi.fn(async(url:RequestInfo|URL)=>{
    const path=new URL(String(url)).pathname;
    if(path==='/v1/auth/challenges')return response({challengeId:crypto.randomUUID(),proof:'a'.repeat(43),exchange:'b'.repeat(43),verifierMember:909,expiresAt:Date.now()+60000});
    if(path==='/v1/auth/exchange')return response({memberNumber:101,token:'t'.repeat(43),expiresAt:Date.now()+3600000});
    active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,5));active--;
    return response({memberNumber:Number(path.split('/').at(-1)),displayName:'Member'});
  });
  const {client,setMember}=setup(fetchImpl);await client.connect();
  const profiles=await Promise.all(Array.from({length:15},(_,i)=>client.profile(200+i)));
  expect(profiles).toHaveLength(15);expect(peak).toBeLessThanOrEqual(6);
  const pending=Promise.allSettled(Array.from({length:12},(_,i)=>client.profile(400+i)));
  const before=fetchImpl.mock.calls.length;setMember(202);
  expect((await pending).every(r=>r.status==='rejected')).toBe(true);expect(fetchImpl.mock.calls).toHaveLength(before);client.destroy();
});

it.each(["profile-discovery", "privacy", "relationships", "ready"])("%s hints report the cause and discard stale profile reads", async kind => {
  let stream!: ReadableStreamDefaultController<Uint8Array>, delayed!: (value: Response) => void, slow = false;
  let profile = { memberNumber:202,displayName:"Member",bio:"Shared before change",statusMessage:"Custom",publicTags:["tag"],revision:1,visible:true,updatedAt:1,avatarFrame:"none",profileStyle:"classic",avatarId:null,bannerId:null };
  const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(url)).pathname;
    if (path === "/v1/auth/challenges") return response({ challengeId:crypto.randomUUID(),proof:"a".repeat(43),exchange:"b".repeat(43),verifierMember:909,expiresAt:Date.now()+60000 });
    if (path === "/v1/auth/exchange") return response({ memberNumber:101,token:"t".repeat(43),expiresAt:Date.now()+3600000 });
    if (path === "/v1/profiles/202") return slow ? new Promise<Response>(r => { delayed = r; }) : response(profile);
    if (path === "/v1/events") return new Response(new ReadableStream<Uint8Array>({ start(controller) {
      stream=controller; init!.signal!.addEventListener("abort",()=>controller.error(new Error("closed")),{once:true});
    } }), {headers:{"content-type":"text/event-stream"}});
    throw new Error("Unexpected request");
  });
  const {client}=setup(fetchImpl);
  const changed=vi.fn();client.subscribe(changed);
  try {
    await client.connect();client.retainEvents();await vi.waitFor(()=>expect(stream).toBeDefined());
    await client.profile(202);expect(client.peekProfile(202)?.bio).toBe("Shared before change");
    slow=true;const pending=client.profile(202,true);const rejected=expect(pending).rejects.toMatchObject({code:"profile_changed"});
    await vi.waitFor(()=>expect(delayed).toBeDefined());
    stream.enqueue(new TextEncoder().encode(`event: ${kind}\ndata: {}\n\n`));
    await vi.waitFor(()=>expect(client.peekProfile(202)).toBeUndefined());
    expect(changed).toHaveBeenCalledWith("profiles-cleared",kind);
    delayed(response(profile));await rejected;expect(client.peekProfile(202)).toBeUndefined();
    slow=false;profile={...profile,bio:"",statusMessage:"",publicTags:[]};
    expect((await client.profile(202)).bio).toBe("");
  } finally {client.destroy();}
});
it.each(['profile-communities','profile-discovery','profile-location'])('delivers content-free %s hints to active consumers',async kind=>{
 let stream!:ReadableStreamDefaultController<Uint8Array>;
 const fetchImpl=vi.fn(async(url:RequestInfo|URL,init?:RequestInit)=>{
  const path=new URL(String(url)).pathname;
  if(path==='/v1/auth/challenges')return response({challengeId:crypto.randomUUID(),proof:'a'.repeat(43),exchange:'b'.repeat(43),verifierMember:909,expiresAt:Date.now()+60000});
  if(path==='/v1/auth/exchange')return response({memberNumber:101,token:'t'.repeat(43),expiresAt:Date.now()+3600000});
  if(path==='/v1/events')return new Response(new ReadableStream<Uint8Array>({start(controller){stream=controller;init!.signal!.addEventListener('abort',()=>controller.error(new Error('closed')),{once:true});}}),{headers:{'content-type':'text/event-stream'}});
  throw new Error('Unexpected request');
 });
 const {client}=setup(fetchImpl),hint=vi.fn();const unsubscribe=client.subscribe(hint);
 try{await client.connect();client.retainEvents();await vi.waitFor(()=>expect(stream).toBeDefined());stream.enqueue(new TextEncoder().encode(`event: ${kind}\ndata: {}\n\n`));await vi.waitFor(()=>expect(hint).toHaveBeenCalledWith(kind));}finally{unsubscribe();client.destroy();}
});

it('a privacy acknowledgement invalidates local profile consumers even without an event stream',async()=>{
 const fetchImpl=vi.fn(async(url:RequestInfo|URL)=>{
  const path=new URL(String(url)).pathname;
  if(path==='/v1/auth/challenges')return response({challengeId:crypto.randomUUID(),proof:'a'.repeat(43),exchange:'b'.repeat(43),verifierMember:909,expiresAt:Date.now()+60000});
  if(path==='/v1/auth/exchange')return response({memberNumber:101,token:'t'.repeat(43),expiresAt:Date.now()+3600000});
  return response({memberNumber:101,showLocation:false,revision:1});
 });
 const {client}=setup(fetchImpl),hint=vi.fn();const unsubscribe=client.subscribe(hint);
 try{await client.connect();await client.request('PATCH','/v1/privacy/me',{revision:0,showLocation:false});expect(hint).toHaveBeenCalledWith('profiles-cleared');expect(hint).toHaveBeenCalledWith('privacy');}finally{unsubscribe();client.destroy();}
});
