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
describe("published FUSAM bundle", () => {
  it("is a standalone page-realm build without userscript metadata", () => {
    expect(FUSAM_SCRIPT).not.toContain("// ==UserScript==");
    expect(FUSAM_SCRIPT).toContain("//# sourceURL=KikiLink.fusam.js");
    expect(FUSAM_SCRIPT).not.toBe(USERSCRIPT);
  });

  it("uploads external media directly to the supported hosts in both distributions", () => {
    for (const bundle of [FUSAM_SCRIPT, USERSCRIPT]) {
      expect(bundle.includes("https://anondrop.net")).toBe(true);
      expect(bundle.includes("https://waifuvault.moe")).toBe(true);
      expect(bundle.includes("/v1/public-files?")).toBe(false);
      for (const removedTransport of [
        "GM_xmlhttpRequest",
        "__KIKILINK_UPLOAD_CAPABILITY__",
        "kikilink:upload-request:v1",
        "kikilink:catbox-relay-session:v1",
        "https://catbox.moe/user/api.php",
        "https://litterbox.catbox.moe/resources/internals/api.php",
      ]) expect(bundle).not.toContain(removedTransport);
    }
  });

  it("keeps both current European Bondage Club host spellings in the userscript", () => {
    expect(USERSCRIPT).toContain("// @match        https://*.bondage-europe.com/R*/*");
    expect(USERSCRIPT).toContain("// @match        https://*.bondageeurope.com/R*/*");
    expect(USERSCRIPT).toContain("// @noframes");
    expect(USERSCRIPT).toContain("// @grant        none");
  });
});
