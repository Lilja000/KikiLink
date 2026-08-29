import { afterEach, describe, expect, it, vi } from "vitest";
import { createId, createSecureId } from "../src/utils/id";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ID generation", () => {
  it("uses getRandomValues when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.set(Array.from({ length: bytes.length }, (_, index) => index));
        return bytes;
      },
    });

    expect(createSecureId("group")).toBe(
      "group_00010203-0405-4607-8809-0a0b0c0d0e0f",
    );
  });

  it("fails closed for authoritative IDs without a secure random source", () => {
    vi.stubGlobal("crypto", undefined);

    expect(() => createSecureId("group")).toThrow("Secure random ID generation is unavailable");
    expect(createId("local")).toMatch(/^local_[a-z0-9]+_[a-z0-9]+$/u);
  });
});
