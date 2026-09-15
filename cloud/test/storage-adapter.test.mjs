import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { R2Storage } from "../src/storage.mjs";

test("Official S3 adapter signs real HTTP PUT/GET/DELETE/list and bounded backup streams (local endpoint, not live R2)", async (t) => {
  const objects = new Map(),
    requests = [];
  const server = createServer(async (req, res) => {
    requests.push({
      method: req.method,
      url: req.url,
      auth: req.headers.authorization,
    });
    const url = new URL(req.url, "http://localhost"),
      key = url.pathname.split("/").slice(2).join("/");
    if (req.method === "HEAD") return res.writeHead(200).end();
    if (req.method === "PUT") {
      const parts = [];
      for await (const p of req) parts.push(p);
      objects.set(key, Buffer.concat(parts));
      return res.writeHead(200, { ETag: '"test"' }).end();
    }
    if (req.method === "DELETE") {
      objects.delete(key);
      return res.writeHead(204).end();
    }
    if (url.searchParams.has("list-type"))
      return res
        .writeHead(200, { "content-type": "application/xml" })
        .end(
          "<ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>backups/one.klbackup</Key><Size>11</Size><LastModified>2026-09-09T00:00:00Z</LastModified></Contents></ListBucketResult>",
        );
    if (key === "too-large")
      return res.writeHead(200, { "content-length": 99999 }).end();
    const body = objects.get(key);
    if (!body) return res.writeHead(404).end();
    res
      .writeHead(200, {
        "content-type": "application/octet-stream",
        "content-length": body.length,
      })
      .end(body);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const storage = new R2Storage({
    endpoint: `http://127.0.0.1:${server.address().port}`,
    bucket: "test-bucket",
    accessKeyId: "local-test-key",
    secretAccessKey: "local-test-secret-never-a-provider-credential",
  });
  const dir = await mkdtemp(join(tmpdir(), "kikilink-s3-test-"));
  t.after(async () => {
    storage.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  });
  await storage.healthy();
  const image = Buffer.from("sanitized image bytes");
  await storage.put("media/image.webp", image);
  assert.deepEqual(await storage.get("media/image.webp", 1024), image);
  await assert.rejects(() => storage.get("too-large", 1024), /exceeds bound/);
  const source = join(dir, "backup.input");
  await writeFile(source, Buffer.from("backup body"));
  await storage.putStream("backups/one.klbackup", createReadStream(source), 11);
  assert.equal(
    (await storage.list("backups/")).Contents[0].Key,
    "backups/one.klbackup",
  );
  const target = join(dir, "backup.output");
  await storage.downloadTo("backups/one.klbackup", target, 1024);
  assert.equal((await readFile(target)).toString(), "backup body");
  await storage.delete("media/image.webp");
  assert.equal(objects.has("media/image.webp"), false);
  assert.ok(requests.every((r) => r.auth?.startsWith("AWS4-HMAC-SHA256 ")));
  assert.ok(requests.every((r) => !r.url.includes("local-test-secret")));
});
