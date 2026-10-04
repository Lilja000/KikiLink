import { z } from "zod";
export const member = z.number().int().positive().safe();
export const id = z.uuid();
export const pageId = z.coerce.number().int().positive().safe();
export const cursor = z.coerce.number().int().nonnegative().safe().default(0);
export const count = z.coerce.number().int().min(1).max(40).default(20);
export const shortToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const text = (max) =>
  z
    .string()
    .max(max)
    .refine(
      (v) =>
        !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(
          v,
        ),
      "Unsupported control characters",
    );
const color = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .transform((v) => v.toLowerCase());
export const profile = z
  .object({
    displayName: text(80).trim().min(1),
    bio: text(160).default(""),
    statusMessage: text(80).optional(),
    avatarFrame: z
      .enum([
        "none",
        "blossom",
        "rose",
        "starlight",
        "laurel",
        "thorn",
        "moon",
        "ribbon", "wings", "lotus", "constellation", "crest",
      ])
      .default("none"),
    avatarDecoration: z.object({ mode: z.enum(["none", "preset", "solid", "gradient"]), preset: z.enum(["none", "blossom", "rose", "starlight", "laurel", "thorn", "moon", "ribbon", "wings", "lotus", "constellation", "crest"]), primary: color, secondary: color, angle: z.number().int().min(0).max(315).multipleOf(45) }).strict().optional(),
    publicTags: z.array(text(20).trim().min(1)).max(5).optional(),
    profileStyle: z.enum(["classic", "garden", "midnight", "glacier", "sage", "dusty-rose", "amber", "gradient"]).default("classic"),
    profileOutlineColor: color.optional(),
    profileGradient: z.object({ start: color, end: color, angle: z.number().int().min(0).max(315).multipleOf(45).optional(), enabled: z.boolean().optional() }).strict().optional(),
    avatarId: id.nullable().default(null),
    bannerId: id.nullable().default(null),
    visible: z.boolean().default(true),
    revision: z.number().int().nonnegative(),
  })
  .strict();
const poll = z.object({
  question: text(200).trim().min(1),
  options: z.array(text(100).trim().min(1)).min(2).max(6)
    .refine(options => new Set(options.map(option => option.normalize("NFKC").toLowerCase())).size === options.length, "Duplicate poll option"),
  multiple: z.boolean(),
  closesAt: z.number().int().positive().safe(),
}).strict();
const postFields = z
  .object({
    text: text(4000),
    mediaIds: z.array(id).max(4).default([]),
    clientId: id.optional(),
    spoilerMediaIds: z.array(id).max(4).optional(),
  })
  .strict();
const validMedia = v => new Set(v.mediaIds).size === v.mediaIds.length && (!v.spoilerMediaIds || new Set(v.spoilerMediaIds).size === v.spoilerMediaIds.length && v.spoilerMediaIds.every(id => v.mediaIds.includes(id)));
export const post = postFields.extend({ poll: poll.optional() })
  .refine(
    (v) => v.text.trim().length > 0 || v.mediaIds.length > 0 || !!v.poll,
    "Post cannot be empty",
  )
  .refine(validMedia, "Invalid or duplicate media");
export const postEdit = postFields.extend({ revision: z.number().int().positive() }).refine(validMedia, "Invalid or duplicate media");
export const message = z
  .object({
    clientId: id,
    text: text(4000).trim().min(1),
    membershipVersion: z.number().int().positive(),
    keyVersion: z.number().int().positive(),
    schemaVersion: z.literal(1),
    encryption: z.literal("server-aes-256-gcm"),
  })
  .strict();
export const targetType = z.enum([
  "profile",
  "post",
  "comment",
  "group",
  "message",
]);
export class ApiError extends Error {
  constructor(status, code, retryAfterSeconds) {
    super(code);
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
export const requireThat = (condition, status = 404, code = "not_found") => {
  if (!condition) throw new ApiError(status, code);
};
