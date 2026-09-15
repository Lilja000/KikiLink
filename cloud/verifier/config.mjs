import { readFileSync, lstatSync, realpathSync } from "node:fs";
import { isAbsolute } from "node:path";

// Verified against the existing Runner transport and pinned BC R131 source.
// A different credential destination requires a source review, not an env edit.
export const BC_SERVER = "https://bondage-club-server.herokuapp.com/";
export const BC_ORIGIN = "https://www.bondageprojects.elementfx.com";
const accountPattern = /^[a-zA-Z0-9]{1,20}$/;

export function readPrivateFile(path, maxBytes = 4096) {
  if (!path || !isAbsolute(path) || realpathSync(path) !== path)
    throw new Error("Private configuration path required");
  const info = lstatSync(path);
  if (
    !info.isFile() ||
    info.size > maxBytes ||
    info.mode & 0o077 ||
    (process.getuid() !== 0 && info.uid !== process.getuid())
  )
    throw new Error("Private operator-owned configuration required");
  return readFileSync(path, "utf8");
}

export function readIdentityFile(path) {
  const lines = readPrivateFile(path).trim().split("\n");
  const pairs = lines.map((line) => line.split("="));
  if (pairs.some((pair) => pair.length !== 2))
    throw new Error("Invalid private identity file");
  const fields = Object.fromEntries(pairs);
  if (
    lines.length !== 3 ||
    Object.keys(fields).sort().join(",") !==
      "CLOUD_TEST_MEMBERS,CLOUD_VERIFIER_MEMBER,CLOUD_VERIFIER_SECRET"
  )
    throw new Error("Invalid private identity file");
  const member = Number(fields.CLOUD_VERIFIER_MEMBER);
  const members = fields.CLOUD_TEST_MEMBERS.split(",").map(Number);
  if (
    !Number.isSafeInteger(member) ||
    member < 1 ||
    !members.length ||
    members.length > 100 ||
    members.some((n) => !Number.isSafeInteger(n) || n < 1 || n === member) ||
    !/^[A-Za-z0-9_-]{43}$/.test(fields.CLOUD_VERIFIER_SECRET)
  )
    throw new Error("Invalid private identity settings");
  return fields;
}

export function loadVerifierConfig(env = process.env) {
  if (!["staging", "production"].includes(env.CLOUD_VERIFIER_MODE))
    throw new Error("Verifier requires explicit staging or production mode");
  const member = Number(env.CLOUD_VERIFIER_MEMBER);
  const numbers = (env.CLOUD_TEST_MEMBERS ?? "")
    .split(",")
    .map((n) => Number(n.trim()));
  if (
    !Number.isSafeInteger(member) ||
    member < 1 ||
    !numbers.length ||
    numbers.length > 100 ||
    numbers.some((n) => !Number.isSafeInteger(n) || n < 1 || n === member)
  )
    throw new Error("Pin verifier and separate approved tester identities");
  if (!/^[A-Za-z0-9_-]{43}$/.test(env.CLOUD_VERIFIER_SECRET ?? ""))
    throw new Error("Private verifier API credential required");
  const receive = env.CLOUD_VERIFIER_RECEIVE_MEMBERS
    ? env.CLOUD_VERIFIER_RECEIVE_MEMBERS.split(",").map((n) => Number(n.trim()))
    : [];
  if (
    receive.length > 100 ||
    receive.some((n) => !numbers.includes(n) || n === member)
  )
    throw new Error("Receive permissions require approved independent testers");
  const endpoint = new URL(
    env.CLOUD_VERIFIER_ENDPOINT ?? "http://127.0.0.1:8792/verify",
  );
  if (
    endpoint.protocol !== "http:" ||
    endpoint.hostname !== "127.0.0.1" ||
    endpoint.pathname !== "/verify" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    !endpoint.port
  )
    throw new Error("Only the dedicated private verifier ingress is allowed");
  const account = JSON.parse(readPrivateFile(env.CLOUD_BC_ACCOUNT_FILE));
  if (
    !account ||
    Array.isArray(account) ||
    Object.keys(account).sort().join(",") !== "password,username" ||
    typeof account.username !== "string" ||
    typeof account.password !== "string" ||
    !accountPattern.test(account.username) ||
    !accountPattern.test(account.password)
  )
    throw new Error("Invalid protected BC account configuration");
  const stateDir = env.CLOUD_VERIFIER_STATE;
  if (!stateDir || !isAbsolute(stateDir) || realpathSync(stateDir) !== stateDir)
    throw new Error("Dedicated verifier state directory required");
  const info = lstatSync(stateDir);
  if (!info.isDirectory() || info.uid !== process.getuid() || info.mode & 0o077)
    throw new Error(
      "Verifier state directory must be private and service-owned",
    );
  return {
    mode: env.CLOUD_VERIFIER_MODE,
    member,
    allowedMembers: new Set(numbers),
    receiveMembers: new Set(receive),
    endpoint: endpoint.href,
    secret: env.CLOUD_VERIFIER_SECRET,
    username: account.username,
    password: account.password,
    stateDir,
    serverUrl: BC_SERVER,
    origin: BC_ORIGIN,
  };
}
