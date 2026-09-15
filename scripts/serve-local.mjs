import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const cloud = process.argv.includes("--cloud");
const fusamRoot = process.env.KIKILINK_FUSAM_SOURCE && resolve(process.env.KIKILINK_FUSAM_SOURCE);
const port = Number(process.env.KIKILINK_DEV_PORT || 3001);
const types = { ".js": "text/javascript", ".html": "text/html", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };
const server = createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Private-Network", "true");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (request.method === "OPTIONS") { response.writeHead(204); response.end(); return; }
  if (request.method !== "GET" && request.method !== "HEAD") { response.writeHead(405); response.end(); return; }
  try {
    const path = new URL(request.url, "http://localhost").pathname;
    let file;
    if (path === "/KikiLink.fusam.js") file = resolve(root, cloud ? ".local-dev/cloud/KikiLink.fusam.js" : ".local-dev/dist/KikiLink.fusam.js");
    else if (!cloud && (path === "/kikilink-test.html" || path === "/kikilink-client.html" || path === "/kikilink-client.js")) {
      file = resolve(root, "tests/local-development", path.slice(1));
    } else if (fusamRoot && !path.split("/").some((part) => part.startsWith(".")) && types[extname(path)]) {
      file = resolve(fusamRoot, `.${decodeURIComponent(path)}`);
      if (!file.startsWith(fusamRoot + sep)) throw new Error("Invalid path");
    }
    if (!file || !(await stat(file)).isFile()) throw new Error("Not found");
    response.setHeader("Content-Type", `${types[extname(file)] || "application/octet-stream"}; charset=utf-8`);
    response.writeHead(200);
    response.end(request.method === "HEAD" ? undefined : await readFile(file));
  } catch {
    response.writeHead(404); response.end("Not found");
  }
});
server.listen(port, "127.0.0.1", () => {
  console.log(`${cloud ? "Cloud staging" : "Local"} FUSAM build: http://localhost:${port}/KikiLink.fusam.js`);
  if (fusamRoot && !cloud) console.log(`Three-client test: http://localhost:${port}/kikilink-test.html`);
});
