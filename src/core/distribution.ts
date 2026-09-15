export type KikiLinkDistribution = "userscript" | "fusam";

const compiledDistribution =
  typeof __KIKILINK_DISTRIBUTION__ === "string"
    ? __KIKILINK_DISTRIBUTION__
    : undefined;

/** The release channel selected at build time. Source-level tests default to the userscript. */
export const KIKILINK_DISTRIBUTION: KikiLinkDistribution =
  compiledDistribution === "fusam" ? "fusam" : "userscript";

/** A local install identity only; version numbers, storage and wire identities stay compatible. */
export const KIKILINK_DEV_TEST =
  typeof __KIKILINK_DEV_TEST__ === "boolean" && __KIKILINK_DEV_TEST__;

const compiledCatboxRelayUrl =
  typeof __KIKILINK_CATBOX_RELAY_URL__ === "string"
    ? __KIKILINK_CATBOX_RELAY_URL__
    : "";

/** Fixed release endpoint. It remains empty until the reviewed relay is approved and deployed. */
export const KIKILINK_CATBOX_RELAY_URL = normalizeRelayUrl(compiledCatboxRelayUrl);

/** FUSAM needs the reviewed relay because Catbox does not permit page-realm CORS uploads. */
export function supportsLongLivedCatboxUploads(): boolean {
  return KIKILINK_DISTRIBUTION !== "fusam" || Boolean(KIKILINK_CATBOX_RELAY_URL);
}

/** True only when the FUSAM build delegates an explicit upload to the reviewed relay. */
export function usesCatboxUploadRelay(): boolean {
  return KIKILINK_DISTRIBUTION === "fusam" && Boolean(KIKILINK_CATBOX_RELAY_URL);
}

function normalizeRelayUrl(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    ) {
      return "";
    }
    return url.origin;
  } catch {
    return "";
  }
}
