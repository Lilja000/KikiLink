import { readFile, rm, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const outDir = resolve(root, "dist");
const outfile = resolve(outDir, "KikiLink.user.js");

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
// @match        https://*.bondageprojects.elementfx.com/*
// @match        https://*.bondageprojects.com/*
// @match        https://*.bondage-europe.com/*
// @match        https://*.bondage-asia.com/*
// @run-at       document-end
// @inject-into  page
// @sandbox      raw
// @grant        GM_xmlhttpRequest
// @connect      catbox.moe
// ==/UserScript==`;

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await build({
  entryPoints: [resolve(root, "src/index.ts")],
  outfile,
  bundle: true,
  preserveSymlinks: true,
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  loader: { ".png": "dataurl", ".svg": "dataurl", ".webp": "dataurl" },
  legalComments: "eof",
  sourcemap: false,
  minify: false,
  banner: { js: userscriptHeader },
  define: {
    __KIKILINK_VERSION__: JSON.stringify(packageJson.version),
  },
});

console.log(`Built ${outfile}`);
