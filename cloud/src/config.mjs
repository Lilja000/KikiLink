import { z } from "zod";

const positive = z.coerce.number().int().positive().safe();
export function loadConfig(env = process.env) {
  const s = z
    .object({
      CLOUD_MODE: z.enum(["development", "staging", "production"]).default("development"),
      CLOUD_COMMUNITY_ENABLED: z.enum(["true", "false"]).default("false"),
      CLOUD_BIND: z.literal("127.0.0.1").default("127.0.0.1"),
      CLOUD_PORT: positive.max(65535).default(8791),
      CLOUD_VERIFIER_PORT: positive.max(65535).default(8792),
      CLOUD_ORIGIN: z.url(),
      CLOUD_ALLOWED_ORIGINS: z.string().min(1),
      CLOUD_TEST_MEMBERS: z.string().min(1),
      CLOUD_MODERATORS: z.string().default(""),
      CLOUD_VERIFIER_MEMBER: positive,
      CLOUD_VERIFIER_SECRET: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
      CLOUD_RATE_SECRET: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
      CLOUD_KEY_RING: z.string().min(1),
      CLOUD_ACTIVE_KEY: z.string().min(1),
      CLOUD_DB: z.string().min(1),
      R2_ENDPOINT: z.url(),
      R2_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
      R2_ACCESS_KEY_ID: z.string().min(1),
      R2_SECRET_ACCESS_KEY: z.string().min(1),
      R2_BACKUP_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
    })
    .parse(env);
  const origin = new URL(s.CLOUD_ORIGIN);
  if (
    origin.protocol !== "https:" ||
    origin.origin !== s.CLOUD_ORIGIN ||
    origin.username ||
    origin.password
  )
    throw new Error("Cloud requires one exact HTTPS origin");
  const origins = s.CLOUD_ALLOWED_ORIGINS.split(",").map((v) => v.trim());
  for (const o of origins) {
    const u = new URL(o);
    const host = u.hostname;
    const bc = [
      "bondageprojects.elementfx.com",
      "bondageprojects.com",
      "bondage-europe.com",
      "bondageeurope.com",
      "bondage-asia.com",
    ].some((h) => host === h || host.endsWith("." + h));
    if (u.origin !== o || u.protocol !== "https:" || u.port || !bc)
      throw new Error("Only explicit HTTPS BC origins are permitted");
  }
  const members = (value) =>
    new Set(value ? value.split(",").map((v) => positive.parse(v.trim())) : []);
  if (s.CLOUD_PORT === s.CLOUD_VERIFIER_PORT)
    throw new Error("Separate API and verifier listeners required");
  if (s.CLOUD_VERIFIER_SECRET === s.CLOUD_RATE_SECRET)
    throw new Error("Secrets must have separate purposes");
  if (
    !/^https:\/\/[a-f0-9]{32}(?:\.(?:eu|us))?\.r2\.cloudflarestorage\.com\/?$/.test(
      s.R2_ENDPOINT,
    )
  )
    throw new Error("Expected a Cloudflare R2 S3 endpoint");
  if (s.R2_BUCKET === s.R2_BACKUP_BUCKET)
    throw new Error("Use separate media and backup buckets");
  let keys;
  try {
    keys = JSON.parse(s.CLOUD_KEY_RING);
  } catch {
    throw new Error("Invalid external key ring JSON");
  }
  const testMembers = members(s.CLOUD_TEST_MEMBERS),
    moderators = members(s.CLOUD_MODERATORS);
  if (testMembers.has(s.CLOUD_VERIFIER_MEMBER) || moderators.has(s.CLOUD_VERIFIER_MEMBER))
    throw new Error("The verifier cannot enroll or administer Cloud");
  if ([...moderators].some((number) => !testMembers.has(number)))
    throw new Error("Moderators must be explicit verified testers");
  return {
    mode: s.CLOUD_MODE,
    communityEnabled: s.CLOUD_COMMUNITY_ENABLED === "true",
    host: s.CLOUD_BIND,
    port: s.CLOUD_PORT,
    verifierPort: s.CLOUD_VERIFIER_PORT,
    origin: s.CLOUD_ORIGIN,
    allowedOrigins: new Set(origins),
    testMembers,
    moderators,
    verifierMember: s.CLOUD_VERIFIER_MEMBER,
    verifierSecret: s.CLOUD_VERIFIER_SECRET,
    rateSecret: s.CLOUD_RATE_SECRET,
    keys,
    activeKey: s.CLOUD_ACTIVE_KEY,
    dbPath: s.CLOUD_DB,
    storage: {
      endpoint: s.R2_ENDPOINT,
      bucket: s.R2_BUCKET,
      backupBucket: s.R2_BACKUP_BUCKET,
      accessKeyId: s.R2_ACCESS_KEY_ID,
      secretAccessKey: s.R2_SECRET_ACCESS_KEY,
    },
    limits: {
      userBytes: 128 * 1024 ** 2,
      globalBytes: 8 * 1024 ** 3,
      userAssets: 200,
      uploadsPerDay: 30,
      maxImageBytes: 5 * 1024 ** 2,
      maxOutputBytes: 3 * 1024 ** 2,
      maxDatabaseBytes: 1024 ** 3,
    },
  };
}
