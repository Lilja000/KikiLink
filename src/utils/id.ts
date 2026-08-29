let fallbackCounter = 0;

export function createSecureId(prefix = "kl"): string {
  const secureCrypto = globalThis.crypto;
  if (typeof secureCrypto?.randomUUID === "function") {
    return `${prefix}_${secureCrypto.randomUUID()}`;
  }

  if (typeof secureCrypto?.getRandomValues === "function") {
    const bytes = secureCrypto.getRandomValues(new Uint8Array(16));
    // Keep the same UUID-shaped output as randomUUID so existing validators and storage stay stable.
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
    return `${prefix}_${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  throw new Error("Secure random ID generation is unavailable");
}

export function createId(prefix = "kl"): string {
  try {
    return createSecureId(prefix);
  } catch {
    // Non-authoritative local records can still function in unusually old or restricted contexts.
  }

  fallbackCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${fallbackCounter.toString(36)}`;
}
