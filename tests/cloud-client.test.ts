import { describe, it, expect, vi } from "vitest";
import { CloudClient, KIKILINK_CLOUD_ORIGIN } from "../src/cloud/client";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import {
  profileImportDraft,
  recordCloudMigration,
  CLOUD_MIGRATION_KEY,
} from "../src/cloud/migration";

const origin = "https://cloud.example.test";
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
    recordCloudMigration(
      storage,
      101,
      "group2_101_example12",
      "cloud-group-test",
    );
    expect(JSON.parse(storage.getItem(CLOUD_MIGRATION_KEY)!)).toEqual({
      version: 1,
      memberNumber: 101,
      groups: { group2_101_example12: "cloud-group-test" },
    });
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
