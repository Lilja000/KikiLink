import { join } from "node:path";
import { readPrivateFile } from "./config.mjs";
try {
  const status = JSON.parse(
    readPrivateFile(
      join(process.env.CLOUD_VERIFIER_STATE, "status.json"),
      1024,
    ),
  );
  const age = Date.now() - status.at;
  process.exitCode =
    status.state === "online" &&
    Number.isSafeInteger(status.at) &&
    age >= 0 &&
    age < 75_000
      ? 0
      : 1;
} catch {
  process.exitCode = 1;
}
