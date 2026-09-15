import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("Cloud DevTest account isolation", () => {
  it("keeps the group build limited to all three approved players before touching storage", async () => {
    vi.stubGlobal("__KIKILINK_CLOUD_TEST_MEMBER__", 95634);
    vi.stubGlobal("__KIKILINK_CLOUD_TEST_MEMBERS__", [72385, 95634, 259875]);
    const { CloudClient, cloudMemberEnabled } = await import("../src/cloud/client");
    for (const memberNumber of [72385, 95634, 259875]) {
      expect(cloudMemberEnabled(memberNumber)).toBe(true);
      const proof = vi.fn();
      const fetchImpl = vi.fn(async () => Response.json({
        challengeId: crypto.randomUUID(), proof: "a".repeat(43), exchange: "b".repeat(43),
        verifierMember: 259723, expiresAt: Date.now() + 60_000,
      }));
      const client = new CloudClient({ origin: "https://cloud.example.test", memberNumber,
        getMemberNumber: () => memberNumber, isBlocked: () => false, sendProof: proof, fetchImpl });
      expect(client.connected).toBe(false);
      expect(fetchImpl).not.toHaveBeenCalled();
      await client.beginIdentity();
      expect(proof).toHaveBeenCalledOnce();
      expect(client.connected).toBe(false);
      client.destroy();
    }
    for (const memberNumber of [259723, 910002]) {
      const touched = vi.fn();
      expect(cloudMemberEnabled(memberNumber)).toBe(false);
      expect(() => new CloudClient({ origin: "https://cloud.example.test", memberNumber,
        getMemberNumber: () => memberNumber, isBlocked: () => false, sendProof: touched,
        fetchImpl: touched, get deviceStore(): never { touched(); throw new Error("storage_touched"); },
      })).toThrow("development_allowlist");
      expect(touched).not.toHaveBeenCalled();
    }
  });

  it("rejects another synthetic account before touching storage, transport or native proof", async () => {
    vi.stubGlobal("__KIKILINK_CLOUD_TEST_MEMBER__", 95634);
    const { CloudClient, cloudMemberEnabled } = await import("../src/cloud/client");
    const touched = vi.fn();
    const options = {
      origin: "https://cloud.example.test",
      memberNumber: 910002,
      getMemberNumber: () => 910002,
      isBlocked: () => false,
      sendProof: touched,
      fetchImpl: touched,
      get deviceStore(): never {
        touched();
        throw new Error("storage_must_not_be_touched");
      },
    };
    expect(cloudMemberEnabled(options.memberNumber)).toBe(false);
    expect(() => new CloudClient(options)).toThrow("development_allowlist");
    expect(touched).not.toHaveBeenCalled();
  });

  it("still requires the native proof for the allowed ALT and closes after an account switch", async () => {
    vi.stubGlobal("__KIKILINK_CLOUD_TEST_MEMBER__", 95634);
    const { CloudClient } = await import("../src/cloud/client");
    let member = 95634;
    const sendProof = vi.fn();
    const fetchImpl = vi.fn(async () => Response.json({
      challengeId: crypto.randomUUID(),
      proof: "a".repeat(43),
      exchange: "b".repeat(43),
      verifierMember: 909,
      expiresAt: Date.now() + 60_000,
    }));
    const client = new CloudClient({
      origin: "https://cloud.example.test",
      memberNumber: member,
      getMemberNumber: () => member,
      isBlocked: () => false,
      sendProof,
      fetchImpl,
    });
    expect(client.connected).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    await client.beginIdentity();
    expect(sendProof).toHaveBeenCalledOnce();
    expect(client.connected).toBe(false);
    member = 910002;
    await expect(client.finishIdentity()).rejects.toThrow("account_changed");
    expect(fetchImpl).toHaveBeenCalledOnce();
    client.destroy();
  });
});
