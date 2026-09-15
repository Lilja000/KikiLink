import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export const token = () => randomBytes(32).toString("base64url");
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export const digest = (key, value) =>
  createHmac("sha256", key).update(value).digest("hex");
export function constantEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function encrypt(key, value, context) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(context));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return {
    v: 1,
    alg: "A256GCM",
    nonce: nonce.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  };
}
export function decrypt(key, envelope, context) {
  if (envelope.v !== 1 || envelope.alg !== "A256GCM")
    throw new Error("Unsupported encrypted envelope");
  const nonce = Buffer.from(envelope.nonce, "base64url"),
    tag = Buffer.from(envelope.tag, "base64url");
  if (nonce.length !== 12 || tag.length !== 16)
    throw new Error("Invalid encrypted envelope");
  const cipher = createDecipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(context));
  cipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([
      cipher.update(Buffer.from(envelope.ciphertext, "base64url")),
      cipher.final(),
    ]).toString("utf8"),
  );
}
export class KeyRing {
  constructor(keys, active) {
    this.keys = new Map(
      Object.entries(keys).map(([id, value]) => [
        id,
        Buffer.from(value, "base64"),
      ]),
    );
    this.active = active;
    if (
      !this.keys.has(active) ||
      [...this.keys].some(
        ([id, key]) => !/^[a-zA-Z0-9_-]{1,32}$/.test(id) || key.length !== 32,
      )
    )
      throw new Error(
        "A valid external 256-bit key ring and active key ID are required",
      );
  }
  seal(value, context) {
    return JSON.stringify({
      keyId: this.active,
      ...encrypt(this.keys.get(this.active), value, context),
    });
  }
  open(value, context) {
    const envelope = JSON.parse(value);
    const key = this.keys.get(envelope.keyId);
    if (!key) throw new Error("Required decryption key is unavailable");
    return decrypt(key, envelope, context);
  }
}
