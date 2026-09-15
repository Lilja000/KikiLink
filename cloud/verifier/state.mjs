import {
  openSync,
  writeFileSync,
  fsyncSync,
  closeSync,
  renameSync,
  readFileSync,
  lstatSync,
  fstatSync,
  constants,
} from "node:fs";
import { join } from "node:path";

const reasons = new Set([
  "login_rejected",
  "identity_mismatch",
  "server_disconnect",
  "protocol_error",
  "login_timeout",
  "retry_budget_exhausted",
  "beep_permissions_refused",
]);

export function readSuspension(directory) {
  const path = join(directory, "suspended.json");
  try {
    const info = lstatSync(path);
    if (
      !info.isFile() ||
      info.size > 1024 ||
      info.uid !== process.getuid() ||
      info.mode & 0o077
    )
      throw new Error("Invalid suspension marker");
    const record = JSON.parse(readFileSync(path, "utf8"));
    if (!reasons.has(record.reason))
      throw new Error("Invalid suspension reason");
    return record.reason;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export function suspendPermanently(directory, reason) {
  if (!reasons.has(reason)) throw new Error("Invalid suspension reason");
  const fd = openSync(join(directory, "suspended.json"), "wx", 0o600);
  try {
    writeFileSync(fd, JSON.stringify({ reason, at: Date.now() }));
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  const dir = openSync(directory, "r");
  try {
    fsyncSync(dir);
  } finally {
    closeSync(dir);
  }
}

export function writeStatus(directory, state) {
  const target = join(directory, "status.json");
  const candidate = join(directory, "status.tmp");
  // The kernel process lock makes this fixed candidate safe and bounded, even
  // across a crash. Never follow a symlink or block on an unexpected FIFO.
  const fd = openSync(
    candidate,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_TRUNC |
      constants.O_NOFOLLOW |
      constants.O_NONBLOCK,
    0o600,
  );
  try {
    const info = fstatSync(fd);
    if (!info.isFile() || info.uid !== process.getuid() || info.mode & 0o077)
      throw new Error("Invalid status candidate");
    writeFileSync(fd, JSON.stringify({ state, at: Date.now() }));
  } finally {
    closeSync(fd);
  }
  renameSync(candidate, target);
}
