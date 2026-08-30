import { KIKILINK_DISTRIBUTION } from "./distribution";

export const KIKILINK_RELEASE_PACKAGE_URL =
  "https://raw.githubusercontent.com/Lilja000/KikiLink/main/package.json";
export const KIKILINK_USERSCRIPT_INSTALL_URL =
  "https://raw.githubusercontent.com/Lilja000/KikiLink/main/dist/KikiLink.user.js";

export const KIKILINK_UPDATE_TIMEOUT_MS = 4_000;
export const KIKILINK_UPDATE_MAX_RESPONSE_BYTES = 8 * 1024;

const MAX_SEMVER_LENGTH = 256;
const MAX_RESPONSE_READS = 256;
const PRODUCTION_BC_HOST_SUFFIXES = [
  "bondageprojects.elementfx.com",
  "bondageprojects.com",
  "bondage-europe.com",
  "bondageeurope.com",
  "bondage-asia.com",
] as const;
const STRICT_SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/u;
const NUMERIC_IDENTIFIER = /^\d+$/u;

export type KikiLinkUpdateFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface KikiLinkUpdateCheckOptions {
  /** Defaults to the current page host. Intended for isolated tests and non-window runtimes. */
  hostname?: string | null;
  /** Pass null to deliberately disable the check. */
  fetchImpl?: KikiLinkUpdateFetch | null;
  /** May lower, but never raise, the production timeout. */
  timeoutMs?: number;
  /** May lower, but never raise, the production response-size limit. */
  maxResponseBytes?: number;
}

interface ParsedSemVer {
  core: readonly [string, string, string];
  prerelease: readonly string[];
}

/**
 * Performs one credentialless release lookup. It never schedules another check and deliberately
 * collapses every unsupported, malformed, or network-failure case to `undefined`.
 */
export async function checkForKikiLinkUpdate(
  currentVersion: string,
  options: KikiLinkUpdateCheckOptions = {},
): Promise<string | undefined> {
  try {
    if (KIKILINK_DISTRIBUTION === "fusam") return undefined;
    const current = parseSemVer(currentVersion);
    if (!current) return undefined;

    const hostname = Object.hasOwn(options, "hostname")
      ? options.hostname ?? undefined
      : currentHostname();
    if (!hostname || !isProductionBCHostname(hostname)) return undefined;

    const fetchImpl = Object.hasOwn(options, "fetchImpl")
      ? options.fetchImpl ?? undefined
      : currentFetch();
    if (!fetchImpl || typeof AbortController !== "function") return undefined;

    const timeoutMs = lowerBoundedLimit(
      options.timeoutMs,
      KIKILINK_UPDATE_TIMEOUT_MS,
    );
    const maxResponseBytes = lowerBoundedLimit(
      options.maxResponseBytes,
      KIKILINK_UPDATE_MAX_RESPONSE_BYTES,
    );
    const controller = new AbortController();
    const deadlineAt = Date.now() + timeoutMs;
    let timedOut = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const request = (async (): Promise<string | undefined> => {
      const response = await fetchImpl(KIKILINK_RELEASE_PACKAGE_URL, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        referrerPolicy: "no-referrer",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (timedOut) {
        await cancelResponse(response);
        return undefined;
      }
      if (!response.ok) {
        await cancelResponse(response);
        return undefined;
      }

      const text = await readBoundedText(
        response,
        maxResponseBytes,
        controller.signal,
        deadlineAt,
      );
      if (timedOut || text === undefined) return undefined;

      const latestVersion = packageVersion(text);
      const latest = latestVersion === undefined
        ? undefined
        : parseSemVer(latestVersion);
      return latest && compareSemVer(latest, current) > 0
        ? latestVersion
        : undefined;
    })().catch(() => undefined);

    const deadline = new Promise<undefined>((resolve) => {
      timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
        resolve(undefined);
      }, timeoutMs);
    });

    try {
      return await Promise.race([request, deadline]);
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  } catch {
    return undefined;
  }
}

function isProductionBCHostname(hostname: string): boolean {
  if (hostname.length === 0 || hostname.length > 254) return false;
  const normalized = hostname.toLowerCase().replace(/\.$/u, "");
  if (!/^[a-z0-9.-]+$/u.test(normalized) || normalized.includes("..")) return false;
  return PRODUCTION_BC_HOST_SUFFIXES.some(
    (suffix) => normalized === suffix || normalized.endsWith(`.${suffix}`),
  );
}

function currentHostname(): string | undefined {
  try {
    return typeof location === "object" && typeof location.hostname === "string"
      ? location.hostname
      : undefined;
  } catch {
    return undefined;
  }
}

function currentFetch(): KikiLinkUpdateFetch | undefined {
  try {
    if (typeof globalThis.fetch !== "function") return undefined;
    return (input, init) => globalThis.fetch(input, init);
  } catch {
    return undefined;
  }
}

function lowerBoundedLimit(candidate: number | undefined, maximum: number): number {
  return typeof candidate === "number" && Number.isSafeInteger(candidate) && candidate > 0
    ? Math.min(candidate, maximum)
    : maximum;
}

async function readBoundedText(
  response: Response,
  maximumBytes: number,
  signal: AbortSignal,
  deadlineAt: number,
): Promise<string | undefined> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null && !declaredLengthFits(declaredLength, maximumBytes)) {
    await cancelResponse(response);
    return undefined;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    await cancelResponse(response);
    return undefined;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  let reads = 0;
  const abortRead = (): void => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abortRead, { once: true });

  try {
    while (!signal.aborted) {
      if (Date.now() >= deadlineAt || reads >= MAX_RESPONSE_READS) {
        await reader.cancel();
        return undefined;
      }
      reads += 1;
      const { done, value } = await reader.read();
      if (Date.now() >= deadlineAt) {
        await reader.cancel();
        return undefined;
      }
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        await reader.cancel();
        return undefined;
      }
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(value);
    }
    if (signal.aborted) return undefined;

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try {
      await reader.cancel();
    } catch {
      // A failed cancellation is still a silent failed update check.
    }
    return undefined;
  } finally {
    signal.removeEventListener("abort", abortRead);
    try {
      reader.releaseLock();
    } catch {
      // The stream may already be detached after an aborted fetch.
    }
  }
}

function declaredLengthFits(value: string, maximumBytes: number): boolean {
  if (!/^(?:0|[1-9]\d*)$/u.test(value)) return false;
  const maximum = String(maximumBytes);
  return value.length < maximum.length ||
    (value.length === maximum.length && value <= maximum);
}

async function cancelResponse(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // Response disposal is best-effort and must not surface to callers.
  }
}

function packageVersion(text: string): string | undefined {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return undefined;
  }
  if (!Object.hasOwn(parsed, "version")) return undefined;
  const version = (parsed as Record<string, unknown>).version;
  return typeof version === "string" ? version : undefined;
}

function parseSemVer(value: string): ParsedSemVer | undefined {
  if (value.length === 0 || value.length > MAX_SEMVER_LENGTH) return undefined;
  const match = STRICT_SEMVER.exec(value);
  if (!match) return undefined;
  const major = match[1];
  const minor = match[2];
  const patch = match[3];
  if (major === undefined || minor === undefined || patch === undefined) return undefined;

  const prerelease = match[4]?.split(".") ?? [];
  if (prerelease.some(
    (identifier) => NUMERIC_IDENTIFIER.test(identifier) &&
      identifier.length > 1 && identifier.startsWith("0"),
  )) {
    return undefined;
  }
  return { core: [major, minor, patch], prerelease };
}

function compareSemVer(left: ParsedSemVer, right: ParsedSemVer): number {
  for (let index = 0; index < left.core.length; index += 1) {
    const leftPart = left.core[index];
    const rightPart = right.core[index];
    if (leftPart === undefined || rightPart === undefined) return 0;
    const comparison = compareNumericIdentifiers(leftPart, rightPart);
    if (comparison !== 0) return comparison;
  }

  if (left.prerelease.length === 0) return right.prerelease.length === 0 ? 0 : 1;
  if (right.prerelease.length === 0) return -1;
  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = left.prerelease[index];
    const rightPart = right.prerelease[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    if (leftPart === rightPart) continue;

    const leftNumeric = NUMERIC_IDENTIFIER.test(leftPart);
    const rightNumeric = NUMERIC_IDENTIFIER.test(rightPart);
    if (leftNumeric && rightNumeric) {
      return compareNumericIdentifiers(leftPart, rightPart);
    }
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return leftPart < rightPart ? -1 : 1;
  }
  return 0;
}

function compareNumericIdentifiers(left: string, right: string): number {
  if (left.length !== right.length) return left.length < right.length ? -1 : 1;
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
