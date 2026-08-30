import { readFile, rm, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const modSdkLicense = await readFile(
  resolve(root, "node_modules/bondage-club-mod-sdk/LICENSE"),
  "utf8",
);
const outDir = resolve(root, "dist");
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
// @name         KikiLink
// @namespace    kikilink.bc
// @version      ${packageJson.version}
// @description  A polished social and interaction addon for Bondage Club.
// @author       KikiLink contributors
// @license      MIT
// @homepageURL  https://github.com/Lilja000/KikiLink
// @supportURL   https://github.com/Lilja000/KikiLink/issues
// @downloadURL  https://raw.githubusercontent.com/Lilja000/KikiLink/main/dist/KikiLink.user.js
// @updateURL    https://raw.githubusercontent.com/Lilja000/KikiLink/main/dist/KikiLink.user.js
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
