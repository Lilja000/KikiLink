export type KikiLinkDistribution = "userscript" | "fusam";

const compiledDistribution =
  typeof __KIKILINK_DISTRIBUTION__ === "string"
    ? __KIKILINK_DISTRIBUTION__
    : undefined;

/** The release channel selected at build time. Source-level tests default to the userscript. */
export const KIKILINK_DISTRIBUTION: KikiLinkDistribution =
  compiledDistribution === "fusam" ? "fusam" : "userscript";

/** FUSAM runs in the page realm, where Catbox does not permit credentialless CORS uploads. */
export function supportsLongLivedCatboxUploads(): boolean {
  return KIKILINK_DISTRIBUTION !== "fusam";
}
