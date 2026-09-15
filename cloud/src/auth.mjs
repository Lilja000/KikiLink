import { randomUUID } from "node:crypto";
import { z } from "zod";
import { token, hash, digest, constantEqual } from "./crypto.mjs";
import { DeviceAuth, devicePublicKey } from "./device-auth.mjs";
import { Enrollment } from "./enrollment.mjs";
import {
  member,
  id,
  shortToken,
  requireThat,
  ApiError,
} from "./validation.mjs";

export class Auth {
  constructor(db, config, now = Date.now) {
    Object.assign(this, { db, config, now });
    this.devices = new DeviceAuth(this);
    this.enrollment = new Enrollment(this);
  }
  memberAllowed(number) {
    return Number.isSafeInteger(number) && number > 0 &&
      number !== this.config.verifierMember &&
      (this.config.mode === "production" || this.config.testMembers.has(number));
  }
  rate(key, max, duration) {
    const now = this.now();
    // Atomic across admission attempts; errors do not refund abuse budget.
    const row = this.db.get(
      `INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?)
      ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END,
      expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING count`,
      key,
      now + duration,
      now,
      now,
    );
    requireThat(row.count <= max, 429, "rate_limited");
  }
  ipKey(ip) {
    return digest(
      this.config.rateSecret,
      `${Math.floor(this.now() / 86400000)}:${ip}`,
    );
  }
  start(input, origin) {
    const { memberNumber, publicKey } = z
      .object({ memberNumber: member, publicKey: devicePublicKey.optional() })
      .strict()
      .parse(input);
    requireThat(
      this.memberAllowed(memberNumber),
      403,
      "development_allowlist",
    );
    this.rate(`challenge:${memberNumber}`, 5, 600000);
    requireThat(this.db.get("SELECT disabled FROM users WHERE member_number=?", memberNumber)?.disabled !== 1,
      403, "account_disabled");
    if (this.config.mode === "production") this.enrollment.admit(memberNumber);
    const challengeId = randomUUID(),
      proof = token(),
      exchange = token(),
      expiresAt = this.now() + 180000;
    this.db.run(
      "INSERT INTO auth_challenges(id,member_number,origin,proof_hash,exchange_hash,expires_at,device_public_key) VALUES(?,?,?,?,?,?,?)",
      challengeId,
      memberNumber,
      origin,
      hash(proof),
      hash(exchange),
      expiresAt,
      publicKey ? JSON.stringify(publicKey) : null,
    );
    return {
      challengeId,
      proof,
      exchange,
      expiresAt,
      verifierMember: this.config.verifierMember,
      ...(this.config.mode === "production" ? { delivery: "pending" } : {}),
    };
  }
  proofReady(input, origin) {
    const { challengeId, exchange } = z.object({ challengeId: id, exchange: shortToken }).strict().parse(input);
    const row = this.db.get("SELECT * FROM auth_challenges WHERE id=?", challengeId);
    requireThat(row && row.origin === origin && row.expires_at > this.now() &&
      constantEqual(row.exchange_hash, hash(exchange)), 401, "challenge_invalid");
    return { ready: this.config.mode !== "production" || this.enrollment.canReceive(row.member_number) };
  }
  verify(input) {
    const { challengeId, proof, sender } = z
      .object({ challengeId: id, proof: shortToken, sender: member })
      .strict()
      .parse(input);
    const row = this.db.get(
      "SELECT * FROM auth_challenges WHERE id=?",
      challengeId,
    );
    requireThat(
      row &&
        row.expires_at > this.now() &&
        row.member_number === sender &&
        this.memberAllowed(sender) &&
        constantEqual(row.proof_hash, hash(proof)),
      403,
      "verification_rejected",
    );
    this.db.run(
      "UPDATE auth_challenges SET verified_at=COALESCE(verified_at,?) WHERE id=?",
      this.now(),
      challengeId,
    );
    return { verified: true };
  }
  exchange(input, origin) {
    const { challengeId, exchange } = z
      .object({ challengeId: id, exchange: shortToken })
      .strict()
      .parse(input);
    return this.db.transaction(() => {
      const row = this.db.get(
        "SELECT * FROM auth_challenges WHERE id=?",
        challengeId,
      );
      requireThat(
        row &&
          row.origin === origin &&
          row.expires_at > this.now() &&
          constantEqual(row.exchange_hash, hash(exchange)),
        401,
        "challenge_invalid",
      );
      requireThat(row.verified_at !== null, 409, "verification_pending");
      requireThat(
        this.memberAllowed(row.member_number),
        403,
        "development_allowlist",
      );
      this.db.run(
        "INSERT OR IGNORE INTO users(member_number,created_at) VALUES(?,?)",
        row.member_number,
        this.now(),
      );
      requireThat(
        this.db.get(
          "SELECT disabled FROM users WHERE member_number=?",
          row.member_number,
        ).disabled === 0,
        403,
        "account_disabled",
      );
      this.db.run("DELETE FROM auth_challenges WHERE id=?", challengeId);
      const device = row.device_public_key
        ? this.devices.enroll(
            row.member_number,
            origin,
            JSON.parse(row.device_public_key),
          )
        : undefined;
      return this.issueSession(row.member_number, origin, device);
    });
  }
  issueSession(memberNumber, origin, device) {
    const session = token();
    const expiresAt = Math.min(
      this.now() + 3600000,
      device?.expiresAt ?? Infinity,
    );
    this.db.run(
      "INSERT INTO sessions(token_hash,member_number,origin,created_at,expires_at,device_id) VALUES(?,?,?,?,?,?)",
      hash(session),
      memberNumber,
      origin,
      this.now(),
      expiresAt,
      device?.id ?? null,
    );
    this.db.run(
      "DELETE FROM sessions WHERE member_number=? AND token_hash<>? AND token_hash NOT IN (SELECT token_hash FROM sessions WHERE member_number=? AND token_hash<>? ORDER BY created_at DESC,token_hash DESC LIMIT 4)",
      memberNumber,
      hash(session),
      memberNumber,
      hash(session),
    );
    return {
      token: session,
      memberNumber,
      expiresAt,
      ...(device ? { device } : {}),
    };
  }
  authenticate(header, origin) {
    requireThat(
      typeof header === "string" && /^Bearer [A-Za-z0-9_-]{43}$/.test(header),
      401,
      "authentication_required",
    );
    const tokenHash = hash(header.slice(7));
    const row = this.db.get(
      "SELECT s.member_number,s.expires_at FROM sessions s JOIN users u ON u.member_number=s.member_number WHERE token_hash=? AND origin=? AND u.disabled=0",
      tokenHash,
      origin,
    );
    requireThat(
      row &&
        row.expires_at > this.now() &&
        this.memberAllowed(row.member_number),
      401,
      "session_expired",
    );
    return { member: row.member_number, tokenHash, expiresAt: row.expires_at };
  }
  logout(tokenHash) {
    const row = this.db.get(
      "SELECT device_id FROM sessions WHERE token_hash=?",
      tokenHash,
    );
    if (row?.device_id)
      this.db.run("DELETE FROM auth_devices WHERE id=?", row.device_id);
    this.db.run("DELETE FROM sessions WHERE token_hash=?", tokenHash);
  }
  logoutAll(memberNumber) {
    this.db.transaction(() => {
      this.db.run(
        "DELETE FROM auth_devices WHERE member_number=?",
        memberNumber,
      );
      this.db.run("DELETE FROM sessions WHERE member_number=?", memberNumber);
    });
  }
  moderator(actor) {
    requireThat(this.config.moderators.has(actor), 403, "moderator_required");
  }
  cleanup() {
    for (const table of [
      "auth_challenges",
      "device_challenges",
      "auth_devices",
      "sessions",
      "rate_limits",
      "presence",
    ])
      this.db.run(`DELETE FROM ${table} WHERE expires_at<=?`, this.now());
  }
}

export function apiError(error) {
  if (error instanceof z.ZodError)
    return { status: 400, code: "invalid_input" };
  if (error instanceof ApiError)
    return { status: error.status, code: error.code };
  if (error.code === "FST_ERR_CTP_BODY_TOO_LARGE")
    return { status: 413, code: "body_too_large" };
  if (error.code === "FST_ERR_CTP_INVALID_JSON_BODY")
    return { status: 400, code: "invalid_json" };
  if (error.statusCode === 415)
    return { status: 415, code: "unsupported_content_type" };
  if (error.statusCode === 400) return { status: 400, code: "invalid_input" };
  return { status: 503, code: "temporarily_unavailable" };
}
