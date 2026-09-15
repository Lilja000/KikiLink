import { loadConfig } from "./config.mjs";
import { KeyRing } from "./crypto.mjs";
import { Database } from "./db.mjs";
import { R2Storage } from "./storage.mjs";
import { createApp, createVerifier } from "./app.mjs";

const config = loadConfig(),
  keys = new KeyRing(config.keys, config.activeKey);
const db = new Database(config.dbPath); // Explicit migrations are an operator action.
const storage = new R2Storage(config.storage);
const cloud = createApp({
  db,
  keys,
  storage,
  config,
  logger: {
    level: "info",
    redact: [
      "req.headers.authorization",
      "req.body",
      "res.headers",
      "body",
      "token",
      "secret",
    ],
  },
});
const verifier = createVerifier({ auth: cloud.auth, config });
let cleaning;
const maintenance = setInterval(async () => {
  if (cleaning) return;
  cleaning = cloud.cleanup();
  try {
    const result = await cleaning;
    cloud.app.log.info({ event: "maintenance", ...result }, "cleanup");
  } catch {
    cloud.app.log.error({ event: "maintenance_failed" }, "cleanup");
  } finally {
    cleaning = undefined;
  }
}, 15 * 60000);
maintenance.unref();
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  clearInterval(maintenance);
  await Promise.all([cloud.app.close(), verifier.close()]);
  storage.close();
  await cleaning?.catch(() => {});
  db.close();
}
process.once("SIGTERM", () => void stop());
process.once("SIGINT", () => void stop());
try {
  await verifier.listen({ host: "127.0.0.1", port: config.verifierPort });
  await cloud.app.listen({ host: config.host, port: config.port });
} catch {
  cloud.app.log.error({ event: "startup_failed" }, "startup failed");
  await stop();
  process.exitCode = 1;
}
