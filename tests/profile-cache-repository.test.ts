import { describe, expect, it } from "vitest";
import { MemoryKeyValueStorage, type KeyValueStorage } from "../src/core/settings";
import { AccountKeyValueStorage } from "../src/storage/account-data-storage";
import {
  MAX_CACHED_PUBLIC_PROFILE_AGE_MS,
  MAX_CACHED_PUBLIC_PROFILE_RICH_AGE_MS,
  MAX_CACHED_PUBLIC_PROFILES,
  PUBLIC_PROFILE_CACHE_KEY,
  ProfileCacheRepository,
  type CachedPublicProfileInput,
  type CachedPublicProfileRecord,
} from "../src/storage/profile-cache-repository";

function profile(
  memberNumber: number,
  overrides: Partial<CachedPublicProfileInput> = {},
): CachedPublicProfileInput {
  return {
    memberNumber,
    displayName: `Player ${memberNumber}`,
    ...overrides,
  };
}

function storedProfile(
  memberNumber: number,
  syncedAt: number,
  overrides: Partial<CachedPublicProfileRecord> = {},
): CachedPublicProfileRecord {
  return {
    ...profile(memberNumber),
    syncedAt,
    lastAccessedAt: syncedAt,
    ...overrides,
  };
}

describe("ProfileCacheRepository", () => {
  it("round-trips only sanitized voluntary public profile fields", () => {
    const storage = new MemoryKeyValueStorage();
    const first = new ProfileCacheRepository(storage);
    const now = Date.now();
    const saved = first.upsert({
      ...profile(123, {
        displayName: "  Rei\u202ena\u0000   Wolf  ",
        avatarUrl: " https://CDN.example/avatar.webp ",
        avatarFrame: "ribbon",
        profileStyle: "garden",
        bannerUrl: "https://cdn.example/banner.png?size=wide",
        bio: "  Tea, stories, and quiet rooms.  ",
        profileOutlineColor: "#A1B2C3",
        profileGradient: { enabled: true, primary: "#D71932", secondary: "#112233" },
        profileRevision: "revision_25-A",
        addonVersion: "0.26.0-beta.1",
      }),
      status: "dnd",
      roomName: "Private room",
      note: "Never cache this",
      relationships: ["friend"],
      blob: { bytes: "not an image cache" },
    } as unknown as CachedPublicProfileInput, now);

    expect(saved).toEqual({
      memberNumber: 123,
      displayName: "Rei na Wolf",
      avatarUrl: "https://cdn.example/avatar.webp",
      avatarFrame: "ribbon",
      profileStyle: "garden",
      bannerUrl: "https://cdn.example/banner.png?size=wide",
      bio: "Tea, stories, and quiet rooms.",
      profileOutlineColor: "#a1b2c3",
      profileGradient: { enabled: true, primary: "#d71932", secondary: "#112233" },
      richSyncedAt: now,
      profileRevision: "revision_25-A",
      addonVersion: "0.26.0-beta.1",
      syncedAt: now,
      lastAccessedAt: now,
    });
    expect(saved).not.toHaveProperty("status");
    expect(saved).not.toHaveProperty("roomName");
    expect(saved).not.toHaveProperty("note");
    expect(saved).not.toHaveProperty("relationships");
    expect(saved).not.toHaveProperty("blob");

    const restored = new ProfileCacheRepository(storage).get(123, now + 1_000);
    expect(restored).toMatchObject({ ...saved, lastAccessedAt: now + 1_000 });
    const raw = storage.getItem(PUBLIC_PROFILE_CACHE_KEY) ?? "";
    expect(raw).not.toContain("Private room");
    expect(raw).not.toContain("Never cache this");
  });

  it("drops unsafe optional values and rejects an invalid record identity", () => {
    const repository = new ProfileCacheRepository(new MemoryKeyValueStorage());
    const now = Date.now();
    const sanitized = repository.upsert({
      memberNumber: 456,
      displayName: "\u202e\u0000",
      avatarUrl: "http://example.com/avatar.png",
      avatarFrame: "remote-css",
      profileStyle: "external-theme",
      bannerUrl: "[img]https://example.com/banner.webp[/img]",
      bio: "\u202e".repeat(200),
      profileOutlineColor: "red; background: url(evil)",
      profileGradient: {
        enabled: true,
        primary: "#123456",
        secondary: "linear-gradient(red, blue)",
      },
      profileRevision: "revision with spaces",
      addonVersion: "<script>",
    } as unknown as CachedPublicProfileInput, now);

    expect(sanitized).toEqual({
      memberNumber: 456,
      displayName: "Member 456",
      syncedAt: now,
      lastAccessedAt: now,
    });
    expect(repository.upsert(profile(457, {
      avatarUrl: "https://cdn.example/unbounded.avif",
    }), now)).not.toHaveProperty("avatarUrl");
    expect(() => repository.upsert(profile(0), now)).toThrow("Invalid cached public profile");
  });

  it("inherits account isolation from the injected account storage", () => {
    const browser = new MemoryKeyValueStorage();
    const accountOne = new ProfileCacheRepository(new AccountKeyValueStorage(101, browser));
    const accountTwo = new ProfileCacheRepository(new AccountKeyValueStorage(202, browser));
    const now = Date.now();

    accountOne.upsert(profile(303, { displayName: "Only account one" }), now);
    accountTwo.upsert(profile(404, { displayName: "Only account two" }), now);

    expect(new ProfileCacheRepository(new AccountKeyValueStorage(101, browser)).list(now))
      .toMatchObject([{ memberNumber: 303, displayName: "Only account one" }]);
    expect(new ProfileCacheRepository(new AccountKeyValueStorage(202, browser)).list(now))
      .toMatchObject([{ memberNumber: 404, displayName: "Only account two" }]);
  });

  it("ignores malformed persisted data and keeps the newest valid duplicate", () => {
    const malformed = new MemoryKeyValueStorage();
    malformed.setItem(PUBLIC_PROFILE_CACHE_KEY, "not-json");
    expect(new ProfileCacheRepository(malformed).list()).toEqual([]);

    const now = Date.now();
    const storage = new MemoryKeyValueStorage();
    storage.setItem(PUBLIC_PROFILE_CACHE_KEY, JSON.stringify({
      version: 1,
      records: [
        storedProfile(123, now - 2_000, { displayName: "Older", lastAccessedAt: now }),
        { memberNumber: -1, displayName: "Invalid", syncedAt: now, lastAccessedAt: now },
        storedProfile(123, now - 1_000, {
          displayName: "Newer",
          lastAccessedAt: now - 500,
        }),
        storedProfile(456, now - MAX_CACHED_PUBLIC_PROFILE_AGE_MS - 1, {
          displayName: "Expired",
          lastAccessedAt: now,
        }),
      ],
    }));

    const repository = new ProfileCacheRepository(storage);
    expect(repository.list(now)).toMatchObject([{
      memberNumber: 123,
      displayName: "Newer",
      syncedAt: now - 1_000,
    }]);
    expect(repository.get(456, now)).toBeUndefined();
  });

  it("enforces the 200-record LRU bound and persists an access before later eviction", () => {
    const storage = new MemoryKeyValueStorage();
    const repository = new ProfileCacheRepository(storage);
    const now = Date.now();

    for (let memberNumber = 1; memberNumber <= MAX_CACHED_PUBLIC_PROFILES; memberNumber += 1) {
      repository.upsert(profile(memberNumber), now);
    }
    expect(repository.get(1, now)?.lastAccessedAt).toBe(now);
    repository.upsert(profile(201), now);

    expect(repository.list(now)).toHaveLength(MAX_CACHED_PUBLIC_PROFILES);
    expect(repository.get(1, now)).toBeDefined();
    expect(repository.get(2, now)).toBeUndefined();
    expect(repository.get(201, now)).toBeDefined();

    const restored = new ProfileCacheRepository(storage);
    expect(restored.get(1, now)).toBeDefined();
    expect(restored.get(2, now)).toBeUndefined();
  });

  it("expires records by sync age even when they were accessed recently", () => {
    const repository = new ProfileCacheRepository(new MemoryKeyValueStorage());
    const firstSync = 1_000_000;
    const boundary = firstSync + MAX_CACHED_PUBLIC_PROFILE_AGE_MS;
    repository.upsert(profile(123), firstSync);
    repository.upsert(profile(456), boundary - 1_000);

    expect(repository.get(123, boundary)).toBeDefined();
    expect(repository.prune(boundary + 1)).toBe(1);
    expect(repository.get(123, boundary + 1)).toBeUndefined();
    expect(repository.get(456, boundary + 1)).toBeDefined();
  });

  it("ages rich profile details independently from refreshed basic profile fields", () => {
    const storage = new MemoryKeyValueStorage();
    const repository = new ProfileCacheRepository(storage);
    const firstDetailsAt = 1_000_000;
    repository.upsert(profile(123, {
      avatarUrl: "https://cdn.example/avatar-old.png",
      bannerUrl: "https://cdn.example/banner.png",
      bio: "A cached public bio",
      profileOutlineColor: "#123456",
      profileGradient: { enabled: true, primary: "#abcdef", secondary: "#654321" },
    }), firstDetailsAt);

    const basicRefreshAt = firstDetailsAt + MAX_CACHED_PUBLIC_PROFILE_RICH_AGE_MS - 1_000;
    repository.upsert(profile(123, {
      avatarUrl: "https://cdn.example/avatar-new.png",
      bannerUrl: "https://cdn.example/banner.png",
      bio: "A cached public bio",
      profileOutlineColor: "#123456",
      profileGradient: { enabled: true, primary: "#abcdef", secondary: "#654321" },
      richSyncedAt: firstDetailsAt,
    }), basicRefreshAt);

    const refreshed = repository.peek(123, basicRefreshAt);
    expect(refreshed).toMatchObject({
      avatarUrl: "https://cdn.example/avatar-new.png",
      bannerUrl: "https://cdn.example/banner.png",
      bio: "A cached public bio",
      syncedAt: basicRefreshAt,
      richSyncedAt: firstDetailsAt,
    });

    const afterRichExpiry = repository.peek(
      123,
      firstDetailsAt + MAX_CACHED_PUBLIC_PROFILE_RICH_AGE_MS + 1,
    );
    expect(afterRichExpiry).toMatchObject({
      avatarUrl: "https://cdn.example/avatar-new.png",
      syncedAt: basicRefreshAt,
    });
    expect(afterRichExpiry).not.toHaveProperty("bannerUrl");
    expect(afterRichExpiry).not.toHaveProperty("bio");
    expect(afterRichExpiry).not.toHaveProperty("profileOutlineColor");
    expect(afterRichExpiry).not.toHaveProperty("profileGradient");
    expect(afterRichExpiry).not.toHaveProperty("richSyncedAt");
  });

  it("migrates legacy rich profile timestamps from the original sync age", () => {
    const storage = new MemoryKeyValueStorage();
    const now = Date.now();
    const legacySyncedAt = now - 60_000;
    storage.setItem(PUBLIC_PROFILE_CACHE_KEY, JSON.stringify({
      version: 1,
      records: [storedProfile(123, legacySyncedAt, {
        bannerUrl: "https://cdn.example/legacy-banner.png",
        profileOutlineColor: "#123456",
      })],
    }));

    const migrated = new ProfileCacheRepository(storage).peek(123, now);
    expect(migrated).toMatchObject({
      bannerUrl: "https://cdn.example/legacy-banner.png",
      richSyncedAt: legacySyncedAt,
    });
    const raw = JSON.parse(storage.getItem(PUBLIC_PROFILE_CACHE_KEY) ?? "null") as {
      version: number;
      records: CachedPublicProfileRecord[];
    };
    expect(raw.version).toBe(2);
    expect(raw.records[0]?.richSyncedAt).toBe(legacySyncedAt);
  });

  it("does not let an older local receipt overwrite a newer profile", () => {
    const repository = new ProfileCacheRepository(new MemoryKeyValueStorage());
    const now = Date.now();
    repository.upsert(profile(123, { displayName: "New profile" }), now);

    const result = repository.upsert(profile(123, { displayName: "Stale profile" }), now - 1);

    expect(result.displayName).toBe("New profile");
    expect(repository.get(123, now)?.displayName).toBe("New profile");
  });

  it("periodically persists a frequently-read record without writing on every access", () => {
    const storage = new MemoryKeyValueStorage();
    const repository = new ProfileCacheRepository(storage);
    const initial = 1_000_000;
    repository.upsert(profile(123), initial);

    for (let minute = 1; minute <= 6; minute += 1) {
      repository.get(123, initial + minute * 60_000);
    }

    const raw = JSON.parse(storage.getItem(PUBLIC_PROFILE_CACHE_KEY) ?? "null") as {
      records: CachedPublicProfileRecord[];
    };
    expect(raw.records[0]?.lastAccessedAt).toBe(initial + 5 * 60_000);
  });

  it("peeks for protocol merging without promoting or persisting an LRU access", () => {
    const storage = new MemoryKeyValueStorage();
    const repository = new ProfileCacheRepository(storage);
    const initial = 1_000_000;
    repository.upsert(profile(123), initial);
    const before = storage.getItem(PUBLIC_PROFILE_CACHE_KEY);

    expect(repository.peek(123, initial + 10 * 60_000)?.lastAccessedAt).toBe(initial);
    expect(storage.getItem(PUBLIC_PROFILE_CACHE_KEY)).toBe(before);
    expect(repository.get(123, initial + 10 * 60_000)?.lastAccessedAt)
      .toBe(initial + 10 * 60_000);
  });

  it("rejects malformed stored timestamps, controls in URLs, and unsupported envelopes", () => {
    const now = Date.now();
    const storage = new MemoryKeyValueStorage();
    storage.setItem(PUBLIC_PROFILE_CACHE_KEY, JSON.stringify({
      version: 1,
      records: [
        storedProfile(1, now + 60_000),
        storedProfile(2, now, { lastAccessedAt: now + 60_000 }),
        storedProfile(3, now, { syncedAt: now - 0.5 }),
        storedProfile(4, now, { avatarUrl: "https://exa\nmple.com/avatar.png" }),
      ],
    }));

    const records = new ProfileCacheRepository(storage).list(now);
    expect(records).toEqual([expect.objectContaining({ memberNumber: 4 })]);
    expect(records[0]).not.toHaveProperty("avatarUrl");

    storage.setItem(PUBLIC_PROFILE_CACHE_KEY, JSON.stringify({ version: 99, records: [] }));
    expect(new ProfileCacheRepository(storage).list(now)).toEqual([]);
    storage.setItem(PUBLIC_PROFILE_CACHE_KEY, JSON.stringify({ version: 1, records: {} }));
    expect(new ProfileCacheRepository(storage).list(now)).toEqual([]);
  });

  it("uses replacement semantics, returns clones, and can clear all cached profiles", () => {
    const storage = new MemoryKeyValueStorage();
    const repository = new ProfileCacheRepository(storage);
    const now = Date.now();
    repository.upsert(profile(123, {
      avatarUrl: "https://cdn.example/avatar.png",
      profileOutlineColor: "#123456",
    }), now);
    repository.upsert(profile(123, { displayName: "No visuals now" }), now + 1);

    const listed = repository.list(now + 1);
    expect(listed[0]).not.toHaveProperty("avatarUrl");
    expect(listed[0]).not.toHaveProperty("profileOutlineColor");
    if (listed[0]) listed[0].displayName = "Mutated clone";
    expect(repository.get(123, now + 1)?.displayName).toBe("No visuals now");

    repository.clear();
    expect(repository.list(now + 1)).toEqual([]);
    expect(storage.getItem(PUBLIC_PROFILE_CACHE_KEY)).toBeNull();
  });

  it("keeps a defensive in-memory cache when persistent storage is unavailable", () => {
    const denied: KeyValueStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    const repository = new ProfileCacheRepository(denied);
    const now = Date.now();
    const saved = repository.upsert(profile(123, { displayName: "Session profile" }), now);
    saved.displayName = "Mutated outside";

    expect(repository.get(123, now)?.displayName).toBe("Session profile");
    expect(repository.remove(123)).toBe(true);
    expect(repository.get(123, now)).toBeUndefined();
  });
});
