import { loadVerifierConfig } from "./config.mjs";
import { readSuspension, suspendPermanently, writeStatus } from "./state.mjs";

process.umask(0o077);
const log = (state) =>
  process.stdout.write(
    JSON.stringify({ event: "cloud_verifier", state }) + "\n",
  );
let connection,
  heartbeat,
  config,
  stopping = false;
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  clearInterval(heartbeat);
  connection?.stop();
  process.exitCode = code;
}
try {
  // Wire/HTTP debug modes can print credentials before application redaction.
  if (process.env.DEBUG || process.env.NODE_DEBUG || process.env.NODE_OPTIONS)
    throw new Error("Debug environments are not supported");
  config = loadVerifierConfig();
  const suspended = readSuspension(config.stateDir);
  if (suspended) {
    log("suspended");
    writeStatus(config.stateDir, "suspended");
  } else {
    const { VerifierConnection } = await import("./connection.mjs");
    connection = new VerifierConnection(config);
    connection.on("diagnostic", (code) => log(code));
    connection.on("state", (state) => {
      log(state);
      try {
        writeStatus(config.stateDir, state);
      } catch {
        log("state_storage_failed");
        shutdown(1);
      }
    });
    connection.on("suspended", (reason) => {
      try {
        suspendPermanently(config.stateDir, reason);
      } catch {
        log("suspension_storage_failed");
        shutdown(1);
      }
    });
    connection.start();
  }
  if (!stopping)
    heartbeat = setInterval(() => {
      try {
        writeStatus(config.stateDir, connection?.state ?? "suspended");
      } catch {
        log("state_storage_failed");
        shutdown(1);
      }
    }, 30_000);
  process.once("SIGTERM", () => shutdown());
  process.once("SIGINT", () => shutdown());
} catch {
  log("configuration_failed");
  shutdown(1);
}
