import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const FUSAM_SCRIPT = readFileSync(
  resolve(process.cwd(), process.env.KIKILINK_TEST_DIST ?? "dist", "KikiLink.fusam.js"),
  "utf8",
);
const USERSCRIPT = readFileSync(
  resolve(process.cwd(), process.env.KIKILINK_TEST_DIST ?? "dist", "KikiLink.user.js"),
  "utf8",
);
const BUILD_SCRIPT = readFileSync(
  resolve(process.cwd(), "scripts/build.mjs"),
  "utf8",
);

describe("published FUSAM bundle", () => {
  it("is a standalone page-realm build without userscript metadata", () => {
    expect(FUSAM_SCRIPT).not.toContain("// ==UserScript==");
    expect(FUSAM_SCRIPT).toContain("Long-lived Catbox uploads are unavailable in FUSAM");
    expect(FUSAM_SCRIPT).toContain("//# sourceURL=KikiLink.fusam.js");
    expect(FUSAM_SCRIPT).not.toBe(USERSCRIPT);
  });

  it("keeps direct Catbox and privileged userscript transports out of FUSAM", () => {
    expect(FUSAM_SCRIPT).toContain(
      "https://litterbox.catbox.moe/resources/internals/api.php",
    );
    expect(FUSAM_SCRIPT).toContain("kikilink:catbox-relay-session:v1");
    expect(FUSAM_SCRIPT).toContain("/v1/upload");
    expect(FUSAM_SCRIPT).toContain("/authorize");
    for (const userscriptOnlyMarker of [
      "GM_xmlhttpRequest",
      "__KIKILINK_UPLOAD_CAPABILITY__",
      "kikilink-upload-bridge-v1",
      "kikilink:upload-request:v1",
      "kikilink:upload-accepted:v1",
      "kikilink:upload-response:v1",
      "kikilink:upload-progress:v1",
      "kikilink:upload-cancel:v1",
      "https://catbox.moe/user/api.php",
    ]) {
      expect(FUSAM_SCRIPT).not.toContain(userscriptOnlyMarker);
    }

    // These transports remain available only in the isolated userscript distribution.
    for (const userscriptTransportMarker of [
      "GM_xmlhttpRequest",
      "__KIKILINK_UPLOAD_CAPABILITY__",
      "kikilink-upload-bridge-v1",
      "kikilink:upload-request:v1",
      "https://catbox.moe/user/api.php",
      "kikilink-track.",
    ]) {
      expect(USERSCRIPT).toContain(userscriptTransportMarker);
    }
  });

  it("keeps both current European Bondage Club host spellings in the userscript", () => {
    expect(USERSCRIPT).toContain("// @match        https://*.bondage-europe.com/R*/*");
    expect(USERSCRIPT).toContain("// @match        https://*.bondageeurope.com/R*/*");
    expect(USERSCRIPT).toContain("// @noframes");
  });

  it("keeps the relay release gate closed until approval and deployment", () => {
    expect(BUILD_SCRIPT).toContain('const catboxRelayUrl = "";');
    expect(FUSAM_SCRIPT).toContain("The reviewed FUSAM-to-Catbox relay is not enabled");
  });
});
