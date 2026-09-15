import { randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir, realpath, lstat } from "node:fs/promises";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { readIdentityFile } from "../verifier/config.mjs";

const requested = process.argv[2];
if (
  process.argv.length !== 3 &&
  !(process.argv.length === 5 && process.argv[3] === "--identity-env")
)
  throw new Error(
    "Use an output path and optional --identity-env private-file",
  );
const identity = process.argv[4] ? readIdentityFile(process.argv[4]) : null;
if (!requested)
  throw new Error(
    "Provide an absolute, protected environment-file path outside the source checkout",
  );
const target = resolve(requested),
  source = await realpath(fileURLToPath(new URL("../../", import.meta.url)));
await mkdir(dirname(target), { recursive: true, mode: 0o700 });
const parent = await realpath(dirname(target));
const parentInfo = await lstat(parent);
if (
  !parentInfo.isDirectory() ||
  parentInfo.uid !== process.getuid() ||
  parentInfo.mode & 0o077
)
  throw new Error("The output directory must be private and operator-owned");
const pathFromSource = relative(source, parent);
if (
  requested !== target ||
  pathFromSource === "" ||
  !(pathFromSource === ".." || pathFromSource.startsWith("../"))
)
  throw new Error("Secrets must be outside the source checkout");
let template = await readFile(
  new URL("../.env.example", import.meta.url),
  "utf8",
);
template = template
  .replace(
    "CLOUD_VERIFIER_SECRET=GENERATE_SEPARATE_32_BYTE_BASE64URL_SECRET",
    `CLOUD_VERIFIER_SECRET=${identity?.CLOUD_VERIFIER_SECRET ?? randomBytes(32).toString("base64url")}`,
  )
  .replace(
    "CLOUD_RATE_SECRET=GENERATE_SEPARATE_32_BYTE_BASE64URL_SECRET",
    `CLOUD_RATE_SECRET=${randomBytes(32).toString("base64url")}`,
  )
  .replace(
    "GENERATE_32_RANDOM_BYTES_BASE64",
    randomBytes(32).toString("base64"),
  );
if (identity) {
  template = template
    .replace(
      "CLOUD_VERIFIER_MEMBER=REPLACE_WITH_PINNED_VERIFIER_MEMBER_NUMBER",
      `CLOUD_VERIFIER_MEMBER=${identity.CLOUD_VERIFIER_MEMBER}`,
    )
    .replace(
      "CLOUD_TEST_MEMBERS=REPLACE_WITH_APPROVED_TEST_MEMBER_NUMBERS",
      `CLOUD_TEST_MEMBERS=${identity.CLOUD_TEST_MEMBERS}`,
    );
}
await writeFile(target, template, { flag: "wx", mode: 0o600 });
console.log(
  "Protected template created without printing secrets. Complete staging host, BC tester/verifier numbers and R2 settings in the protected file.",
);
