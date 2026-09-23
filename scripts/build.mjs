import { readFile, rm, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolveBuildConfig } from "./build-config.mjs";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
// Keep disabled until the relay has written Catbox approval and a verified production deployment.
const catboxRelayUrl = "";
const modSdkLicense = await readFile(
  resolve(root, "node_modules/bondage-club-mod-sdk/LICENSE"),
  "utf8",
);
const { devTest, local, trafficAudit, groupTrial, cloudOrigin, cloudTestMember,
  cloudTestMembers, outputDirectory } = resolveBuildConfig(process.argv.slice(2), process.env);
const branch = execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim();
const commit = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const dirty = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: root, encoding: "utf8" }).trim();
let buildId = "";
if (devTest) {
  const inputs = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "src", "cloud/shared", "scripts", "package.json", "package-lock.json"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  const fingerprint = createHash("sha256").update(JSON.stringify({ cloudOrigin, cloudTestMember, cloudTestMembers, trafficAudit, groupTrial }));
  for (const path of [...new Set(inputs)].sort()) {
    fingerprint.update(path).update("\0");
    try { fingerprint.update(await readFile(resolve(root, path))); }
    catch (error) { if (error.code !== "ENOENT") throw error; fingerprint.update("deleted"); }
  }
  buildId = `${commit}${dirty ? "-dirty" : ""}-${fingerprint.digest("hex").slice(0, 12)}`;
}
if (branch.startsWith("local/") && !local) {
  throw new Error("Local development branch: use node scripts/build.mjs --local to preserve release files.");
}
const outDir = resolve(root, outputDirectory);
const userscriptOutfile = resolve(outDir, "KikiLink.user.js");
const fusamOutfile = resolve(outDir, "KikiLink.fusam.js");
const kikiLinkNotice = `/*!
 * KikiLink ${packageJson.version}
 * Copyright (c) 2026 KikiLink contributors
 * MIT licensed: https://github.com/Lilja000/KikiLink
 */`;
const thirdPartyNotice = `/*!
 * KikiLink includes bondage-club-mod-sdk 1.2.0.
 *
${modSdkLicense.trim().split("\n").map((line) => line ? ` * ${line}` : " *").join("\n")}
 */`;
const artifactNotice = `${kikiLinkNotice}\n${thirdPartyNotice}`;

const userscriptHeader = `// ==UserScript==
// @name         KikiLink${devTest ? " - DevTest" : ""}
// @namespace    kikilink.bc${devTest ? ".devtest" : ""}
// @version      ${packageJson.version}
// @description  ${groupTrial ? "DevTest: Private Cloud groups for approved participants 72385, 95634, 259875." : cloudTestMember ? "DevTest: Cloud lobby login for test ALT 95634. Private staging." : devTest ? "DevTest: Rooms and Players browsing for desktop and mobile, based on the restored QoL addon." : "A polished social and interaction addon for Bondage Club."}${devTest ? ` Build ${buildId}.` : ""}
// @author       KikiLink contributors
// @license      MIT
// @homepageURL  https://github.com/Lilja000/KikiLink
// @supportURL   https://github.com/Lilja000/KikiLink/issues
// @downloadURL  ${devTest ? "none" : "https://raw.githubusercontent.com/Lilja000/KikiLink/main/dist/KikiLink.user.js"}
// @updateURL    ${devTest ? "none" : "https://raw.githubusercontent.com/Lilja000/KikiLink/main/dist/KikiLink.user.js"}
// @match        https://*.bondageprojects.elementfx.com/R*/*
// @match        https://*.bondageprojects.com/R*/*
// @match        https://*.bondage-europe.com/R*/*
// @match        https://*.bondageeurope.com/R*/*
// @match        https://*.bondage-asia.com/club/R*
// @noframes
// @run-at       document-end
// @sandbox      DOM
// @grant        GM_xmlhttpRequest
// @connect      catbox.moe
// @connect      litterbox.catbox.moe
// ==/UserScript==`;

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const buildOptions = {
  bundle: true,
  preserveSymlinks: true,
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  loader: { ".png": "dataurl", ".svg": "dataurl", ".webp": "dataurl" },
  legalComments: "eof",
  sourcemap: false,
  minify: false,
  define: {
    __KIKILINK_VERSION__: JSON.stringify(packageJson.version),
    __KIKILINK_TRAFFIC_AUDIT__: JSON.stringify(trafficAudit),
    __KIKILINK_DEV_TEST__: JSON.stringify(devTest),
    __KIKILINK_BUILD_ID__: JSON.stringify(buildId),
    __KIKILINK_CATBOX_RELAY_URL__: JSON.stringify(catboxRelayUrl),
    __KIKILINK_CLOUD_ORIGIN__: JSON.stringify(cloudOrigin),
    __KIKILINK_CLOUD_TEST_MEMBER__: JSON.stringify(cloudTestMember),
    __KIKILINK_CLOUD_TEST_MEMBERS__: JSON.stringify(cloudTestMembers),
  },
};

const pageBuild = await build({
  ...buildOptions,
  entryPoints: [resolve(root, "src/index.ts")],
  outfile: undefined,
  write: false,
  minify: true,
  legalComments: "none",
  define: {
    ...buildOptions.define,
    __KIKILINK_DISTRIBUTION__: JSON.stringify("userscript"),
  },
  footer: { js: "//# sourceURL=KikiLink.page.js" },
});
const pageBundle = pageBuild.outputFiles?.[0]?.text;
if (!pageBundle) throw new Error("KikiLink page runtime did not build");

await build({
  ...buildOptions,
  entryPoints: [resolve(root, "src/userscript-loader.ts")],
  outfile: userscriptOutfile,
  banner: { js: `${userscriptHeader}\n${artifactNotice}` },
  define: {
    ...buildOptions.define,
    __KIKILINK_DISTRIBUTION__: JSON.stringify("userscript"),
    __KIKILINK_PAGE_BUNDLE__: JSON.stringify(pageBundle),
  },
});

await build({
  ...buildOptions,
  entryPoints: [resolve(root, "src/index.ts")],
  outfile: fusamOutfile,
  minify: true,
  legalComments: "none",
  banner: { js: artifactNotice },
  define: {
    ...buildOptions.define,
    __KIKILINK_DISTRIBUTION__: JSON.stringify("fusam"),
  },
  footer: { js: "//# sourceURL=KikiLink.fusam.js" },
});

console.log(`Built ${userscriptOutfile}`);
console.log(`Built ${fusamOutfile}`);
