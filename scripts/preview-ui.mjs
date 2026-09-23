// Local visual harness for the real addon UI. Data and accounts are disposable
// fixtures; this does not connect to Bondage Club or the staging/production API.
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, ".."), output = resolve(root, ".local-dev/manual-ui");
await mkdir(output, { recursive: true });
const result = await build({ absWorkingDir: root, entryPoints: ["tests/manual-ui/fixture.js"],
  bundle: true, format: "esm", target: "es2022", write: false,
  loader: { ".webp": "dataurl", ".png": "dataurl", ".svg": "dataurl" },
  define: { __KIKILINK_DEV_TEST__: "true", __KIKILINK_BUILD_ID__: '"local-visual-fixture"' } });
const template = await readFile(resolve(root, "tests/manual-ui/client.html"), "utf8");
const html = template.replace('<script type="module" src="fixture.bundle.js"></script>',
  `<script type="module">${result.outputFiles[0].text.replaceAll("</script", "<\\/script")}</script>`);
await writeFile(resolve(output, "index.html"), html);
if (!process.argv.includes("--build-only")) {
  const server = createServer((_req, res) => { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }); res.end(html); });
  server.listen(8765, "127.0.0.1", () => console.log("Actual KikiLink UI with synthetic data: http://127.0.0.1:8765"));
}
