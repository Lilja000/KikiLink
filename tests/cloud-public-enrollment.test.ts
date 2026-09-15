import { describe, it, expect, vi } from "vitest";
import { CloudClient } from "../src/cloud/client";

const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
function fixture(ready: () => Promise<Response>, exchange = () => reply({ memberNumber: 707,
  token: "t".repeat(43), expiresAt: Date.now() + 3600000 })) {
  let member = 707;
  const proof = vi.fn();
  const challenge = { challengeId: crypto.randomUUID(), proof: "p".repeat(43), exchange: "e".repeat(43),
    verifierMember: 909, expiresAt: Date.now() + 180000, delivery: "pending" };
  const request = vi.fn(async (url: RequestInfo | URL) => {
    const path = new URL(String(url)).pathname;
    if (path === "/v1/auth/challenges") return reply(challenge);
    if (path === "/v1/auth/proof-ready") return ready();
    if (path === "/v1/auth/exchange") return exchange();
    throw new Error("unexpected request");
  });
  const client = new CloudClient({ origin: "https://cloud.example.test", memberNumber: 707,
    getMemberNumber: () => member, isBlocked: () => false, sendProof: proof, fetchImpl: request,
    proofPreparationDelays: [0, 0, 0], verificationDelays: [0, 0, 0, 0, 0, 0] });
  return { client, proof, challenge, request, setMember: (value: number) => { member = value; } };
}

describe("public Cloud enrollment", () => {
  it("waits for delivery preparation, coalesces connection attempts and sends only the proof through BC", async () => {
    let attempts = 0;
    const f = fixture(async () => reply({ ready: ++attempts === 3 }));
    try {
      await Promise.all([f.client.connect(), f.client.connect(), f.client.connect()]);
      expect(f.client.connected).toBe(true);
      expect(f.request.mock.calls.filter(([url]) => String(url).endsWith("/challenges"))).toHaveLength(1);
      expect(f.proof).toHaveBeenCalledTimes(1);
      const sent = f.proof.mock.calls[0]!;
      expect(sent[0]).toBe(909);
      expect(JSON.parse(sent[1])).toEqual({ t: "cloud-verify", v: 1,
        challengeId: f.challenge.challengeId, proof: f.challenge.proof });
      expect(sent[1]).not.toContain(f.challenge.exchange);
    } finally { f.client.destroy(); }
  });
  it.each([false, "malformed"])("does not send BC packets when receive readiness is %s", async (value) => {
    const f = fixture(async () => reply({ ready: value }));
    try {
      await expect(f.client.connect()).rejects.toThrow("verifier_unavailable");
      expect(f.proof).not.toHaveBeenCalled();
      expect(f.request.mock.calls.length).toBeLessThanOrEqual(4);
    } finally { f.client.destroy(); }
  });
  it("discards readiness completed after switching accounts", async () => {
    let settle!: (response: Response) => void;
    let began!: () => void;
    const started = new Promise<void>((resolve) => { began = resolve; });
    const f = fixture(() => { began(); return new Promise((resolve) => { settle = resolve; }); });
    try {
      const task = f.client.connect();
      const result = expect(task).rejects.toThrow("account_changed");
      await started;
      f.setMember(708); settle(reply({ ready: true }));
      await result;
      expect(f.proof).not.toHaveBeenCalled();
    } finally { f.client.destroy(); }
  });
  it("retries a lost initial native proof at most once and never changes the challenge identity", async () => {
    const f = fixture(async () => reply({ ready: true }), () => reply({ error: "verification_pending" }, 409));
    try {
      await expect(f.client.connect()).rejects.toThrow("verification_unavailable");
      expect(f.proof).toHaveBeenCalledTimes(2);
      expect(f.proof.mock.calls[0]).toEqual(f.proof.mock.calls[1]);
    } finally { f.client.destroy(); }
  });
  it("cancels a pending readiness request on teardown without emitting the proof", async () => {
    let settle!: (response: Response) => void;
    let began!: () => void;
    const started = new Promise<void>((resolve) => { began = resolve; });
    const f = fixture(() => { began(); return new Promise((resolve) => { settle = resolve; }); });
    const task = f.client.connect();
    const result = expect(task).rejects.toThrow();
    await started;
    f.client.destroy(); settle(reply({ ready: true }));
    await result;
    expect(f.proof).not.toHaveBeenCalled();
  });
});
