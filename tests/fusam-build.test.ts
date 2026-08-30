import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const FUSAM_SCRIPT = readFileSync(
  resolve(process.cwd(), "dist/KikiLink.fusam.js"),
  "utf8",
);
const USERSCRIPT = readFileSync(
  resolve(process.cwd(), "dist/KikiLink.user.js"),
  "utf8",
);

describe("published FUSAM bundle", () => {
  it("is a standalone page-realm build without userscript metadata", () => {
    expect(FUSAM_SCRIPT).not.toContain("// ==UserScript==");
    expect(FUSAM_SCRIPT).toContain("Long-lived Catbox uploads are unavailable in FUSAM");
    expect(FUSAM_SCRIPT).toContain("//# sourceURL=KikiLink.fusam.js");
    expect(FUSAM_SCRIPT).not.toBe(USERSCRIPT);
  });

  it("contains only the credentialless Litterbox upload transport", () => {
    expect(FUSAM_SCRIPT).toContain(
      "https://litterbox.catbox.moe/resources/internals/api.php",
    );
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
      "kikilink-track.",
      "Catbox returned an unexpected",
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
});
