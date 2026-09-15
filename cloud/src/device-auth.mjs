import { createPublicKey, randomUUID, verify } from "node:crypto";
import { z } from "zod";
import { token, hash, constantEqual } from "./crypto.mjs";
import { id, member, shortToken, requireThat } from "./validation.mjs";

export const DEVICE_LIFETIME = 30 * 86400000;
export const devicePublicKey = z
  .object({
    kty: z.literal("EC"),
    crv: z.literal("P-256"),
    x: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    y: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  })
  .strict()
  .superRefine((key, ctx) => {
    try {
      createPublicKey({ key, format: "jwk" });
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid public key" });
    }
  });

export function deviceMessage(
  challengeId,
  nonce,
  deviceId,
  memberNumber,
  origin,
) {
  return `KIKILINK_DEVICE_V1\n${challengeId}\n${nonce}\n${deviceId}\n${memberNumber}\n${origin}`;
}

/** Device credentials never replace the initial proof received from BC. */
export class DeviceAuth {
  constructor(auth) {
    this.auth = auth;
    this.db = auth.db;
    this.now = auth.now;
  }
  enroll(memberNumber, origin, publicKey) {
    const canonical = JSON.stringify(devicePublicKey.parse(publicKey));
    const keyHash = hash(canonical);
    const old = this.db.get(
      "SELECT id,expires_at FROM auth_devices WHERE member_number=? AND origin=? AND key_hash=?",
      memberNumber,
      origin,
      keyHash,
    );
    if (old?.expires_at > this.now())
      return { id: old.id, expiresAt: old.expires_at };
    if (old) this.db.run("DELETE FROM auth_devices WHERE id=?", old.id);
    const device = {
      id: randomUUID(),
      expiresAt: this.now() + DEVICE_LIFETIME,
    };
    this.db.run(
      "INSERT INTO auth_devices VALUES(?,?,?,?,?,?,?)",
      device.id,
      memberNumber,
      origin,
      canonical,
      keyHash,
      this.now(),
      device.expiresAt,
    );
    // A bounded set of devices, ordered deterministically when clocks are equal.
    this.db.run(
      "DELETE FROM auth_devices WHERE member_number=? AND id<>? AND id NOT IN (SELECT id FROM auth_devices WHERE member_number=? AND id<>? ORDER BY created_at DESC,id DESC LIMIT 4)",
      memberNumber,
      device.id,
      memberNumber,
      device.id,
    );
    return device;
  }
  #device(deviceId, memberNumber, origin) {
    const device = this.db.get(
      "SELECT d.* FROM auth_devices d JOIN users u ON u.member_number=d.member_number WHERE d.id=? AND d.member_number=? AND d.origin=? AND u.disabled=0",
      deviceId,
      memberNumber,
      origin,
    );
    requireThat(
      device &&
        device.expires_at > this.now() &&
        this.auth.memberAllowed(memberNumber),
      401,
      "device_unavailable",
    );
    return device;
  }
  start(input, origin) {
    const { deviceId, memberNumber } = z
      .object({ deviceId: id, memberNumber: member })
      .strict()
      .parse(input);
    this.auth.rate(`device:${deviceId}`, 12, 60000);
    const device = this.#device(deviceId, memberNumber, origin);
    const challengeId = randomUUID(),
      nonce = token();
    const expiresAt = Math.min(this.now() + 60000, device.expires_at);
    this.db.run(
      "INSERT INTO device_challenges VALUES(?,?,?,?)",
      challengeId,
      deviceId,
      hash(nonce),
      expiresAt,
    );
    return { challengeId, nonce, expiresAt };
  }
  exchange(input, origin) {
    const { challengeId, nonce, deviceId, memberNumber, signature } = z
      .object({
        challengeId: id,
        nonce: shortToken,
        deviceId: id,
        memberNumber: member,
        signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/),
      })
      .strict()
      .parse(input);
    this.auth.rate(`device-proof:${deviceId}`, 20, 60000);
    return this.db.transaction(() => {
      const device = this.#device(deviceId, memberNumber, origin);
      const challenge = this.db.get(
        "SELECT * FROM device_challenges WHERE id=? AND device_id=?",
        challengeId,
        deviceId,
      );
      requireThat(
        challenge &&
          challenge.expires_at > this.now() &&
          constantEqual(challenge.nonce_hash, hash(nonce)),
        401,
        "device_challenge_invalid",
      );
      const key = createPublicKey({
        key: JSON.parse(device.public_key),
        format: "jwk",
      });
      const valid = verify(
        "sha256",
        Buffer.from(
          deviceMessage(challengeId, nonce, deviceId, memberNumber, origin),
        ),
        { key, dsaEncoding: "ieee-p1363" },
        Buffer.from(signature, "base64url"),
      );
      requireThat(valid, 401, "device_proof_invalid");
      this.db.run("DELETE FROM device_challenges WHERE id=?", challengeId);
      return this.auth.issueSession(memberNumber, origin, {
        id: deviceId,
        expiresAt: device.expires_at,
      });
    });
  }
}
