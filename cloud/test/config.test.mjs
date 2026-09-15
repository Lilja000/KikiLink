import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  writeFile,
  chmod,
  stat,
  rm,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config.mjs";
import { KeyRing } from "../src/crypto.mjs";

test("Explicit production mode retains listener, origin, service-identity and secret boundaries", () => {
  const env = {
    CLOUD_MODE: "staging",
    CLOUD_ORIGIN: "https://cloud.example.test",
    CLOUD_ALLOWED_ORIGINS: "https://bondageprojects.elementfx.com",
    CLOUD_TEST_MEMBERS: "101,202",
    CLOUD_MODERATORS: "101",
    CLOUD_VERIFIER_MEMBER: "909",
    CLOUD_VERIFIER_SECRET: randomBytes(32).toString("base64url"),
    CLOUD_RATE_SECRET: randomBytes(32).toString("base64url"),
    CLOUD_KEY_RING: JSON.stringify({
      test: randomBytes(32).toString("base64"),
    }),
    CLOUD_ACTIVE_KEY: "test",
    CLOUD_DB: "/tmp/config-test-only.sqlite",
    R2_ENDPOINT: `https://${"a".repeat(32)}.r2.cloudflarestorage.com`,
    R2_BUCKET: "test-media",
    R2_BACKUP_BUCKET: "test-backups",
    R2_ACCESS_KEY_ID: "local-test",
    R2_SECRET_ACCESS_KEY: "local-test",
  };
  assert.equal(loadConfig(env).host, "127.0.0.1");
  assert.equal(loadConfig({ ...env, CLOUD_MODE: "production" }).mode, "production");
  for (const jurisdiction of ["eu", "us"])
    assert.ok(
      loadConfig({
        ...env,
        R2_ENDPOINT: `https://${"a".repeat(32)}.${jurisdiction}.r2.cloudflarestorage.com`,
      }),
    );
  for (const change of [
    { CLOUD_MODE: "public" },
    { CLOUD_TEST_MEMBERS: "101,202,909" },
    { CLOUD_BIND: "0.0.0.0" },
    { CLOUD_ALLOWED_ORIGINS: "*" },
    {
      CLOUD_ALLOWED_ORIGINS:
        "https://bondageprojects.elementfx.com.attacker.test",
    },
    { CLOUD_MODERATORS: "303" },
    { CLOUD_VERIFIER_SECRET: env.CLOUD_RATE_SECRET },
    { R2_ENDPOINT: "https://attacker.test" },
    {
      R2_ENDPOINT: `https://${"a".repeat(32)}.eu.r2.cloudflarestorage.com.attacker.test`,
    },
    {
      R2_ENDPOINT: `https://${"a".repeat(32)}.eu.r2.cloudflarestorage.com/media`,
    },
    { R2_BACKUP_BUCKET: "test-media" },
  ])
    assert.throws(() => loadConfig({ ...env, ...change }));
  const secretCanary = "DO_NOT_INCLUDE_THIS_VALUE_IN_A_PARSE_ERROR";
  assert.throws(
    () => loadConfig({ ...env, CLOUD_KEY_RING: secretCanary }),
    (e) => !e.message.includes(secretCanary),
  );
  assert.throws(() => new KeyRing({ test: "short" }, "test"));
  assert.throws(() => new KeyRing({}, "missing"));
});

test("Secret initializer writes an exclusive protected external file and never prints secret values", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "kikilink-secret-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, "staging.env"),
    script = fileURLToPath(new URL("../ops/init-secrets.mjs", import.meta.url));
  const output = execFileSync(process.execPath, [script, path], {
    encoding: "utf8",
  });
  const contents = await readFile(path, "utf8"),
    verifier = contents.match(/^CLOUD_VERIFIER_SECRET=(.+)$/m)[1];
  assert.match(verifier, /^[A-Za-z0-9_-]{43}$/);
  assert.ok(!output.includes(verifier));
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  assert.throws(() =>
    execFileSync(process.execPath, [script, path], { stdio: "ignore" }),
  );
  const inside = fileURLToPath(
    new URL("../MUST-NOT-CREATE.env", import.meta.url),
  );
  assert.throws(() =>
    execFileSync(process.execPath, [script, inside], { stdio: "ignore" }),
  );
  await assert.rejects(() => stat(inside), { code: "ENOENT" });
});

test("Secret initializer shares the pinned verifier identity without exposing it or accepting unsafe config", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "kikilink-identity-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const script = fileURLToPath(
    new URL("../ops/init-secrets.mjs", import.meta.url),
  );
  const path = join(dir, "staging.env");
  const identityPath = join(dir, "identity.env");
  const secret = randomBytes(32).toString("base64url");
  const identity = `CLOUD_VERIFIER_MEMBER=909\nCLOUD_TEST_MEMBERS=101,202\nCLOUD_VERIFIER_SECRET=${secret}\n`;
  await writeFile(identityPath, identity, { mode: 0o600 });
  const args = [script, path, "--identity-env", identityPath];
  const output = execFileSync(process.execPath, args, { encoding: "utf8" });
  const contents = await readFile(path, "utf8");
  assert.ok(contents.includes(`CLOUD_VERIFIER_SECRET=${secret}\n`));
  assert.ok(contents.includes("CLOUD_VERIFIER_MEMBER=909\n"));
  assert.ok(contents.includes("CLOUD_TEST_MEMBERS=101,202\n"));
  assert.notEqual(contents.match(/^CLOUD_RATE_SECRET=(.+)$/m)[1], secret);
  assert.ok(!output.includes(secret));
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  assert.throws(() =>
    execFileSync(process.execPath, args, { stdio: "ignore" }),
  );
  assert.equal(await readFile(path, "utf8"), contents);
  await rm(path);
  for (const bad of [
    identity.replace("101,202", "909"),
    identity + "EXTRA=value\n",
    identity.replace(secret, `${secret}=ignored`),
  ]) {
    await writeFile(identityPath, bad);
    assert.throws(() =>
      execFileSync(process.execPath, args, { stdio: "ignore" }),
    );
    await assert.rejects(() => stat(path), { code: "ENOENT" });
  }
  await writeFile(identityPath, identity);
  await chmod(identityPath, 0o644);
  assert.throws(() =>
    execFileSync(process.execPath, args, { stdio: "ignore" }),
  );
  await chmod(identityPath, 0o600);
  await chmod(dir, 0o755);
  assert.throws(() =>
    execFileSync(process.execPath, args, { stdio: "ignore" }),
  );
  await assert.rejects(() => stat(path), { code: "ENOENT" });
});
