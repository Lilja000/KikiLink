import { randomUUID } from "node:crypto";
import { z } from "zod";
import { id, member, requireThat } from "./validation.mjs";

// Application admission bounds, not assumptions about BC packet limits.
export const ENROLLMENT_MEMBERS = 64;
const LEASE_MS = 8000;

/** Receive preparation is not identity verification. It contains neither proof
 * nor exchange secrets and cannot create a user, device or session. */
export class Enrollment {
  constructor(auth) {
    this.auth = auth;
    this.ready = new Set();
    this.readyUntil = 0;
    this.snapshot = undefined;
  }
  admit(number) {
    const { db, now } = this.auth;
    requireThat(this.readyUntil > now(), 503, "verifier_unavailable");
    this.auth.rate("enrollment:global", 40, 60000);
    const counts = db.get(
      "SELECT COUNT(*) AS challenges,COUNT(DISTINCT member_number) AS members,SUM(member_number=?) AS own FROM auth_challenges WHERE expires_at>?",
      number, now(),
    );
    requireThat(counts.challenges < 128 && counts.own < 3 &&
      (counts.own > 0 || counts.members < ENROLLMENT_MEMBERS),
    429, "enrollment_busy");
  }
  pending() {
    requireThat(this.auth.config.mode === "production", 404, "not_found");
    const rows = this.auth.db.all(
      "SELECT DISTINCT member_number FROM auth_challenges WHERE expires_at>? ORDER BY member_number LIMIT ?",
      this.auth.now(), ENROLLMENT_MEMBERS + 1,
    );
    requireThat(rows.length <= ENROLLMENT_MEMBERS, 503, "enrollment_busy");
    const members = rows.map((row) => row.member_number)
      .filter((number) => this.auth.memberAllowed(number));
    this.snapshot = { id: randomUUID(), members, expiresAt: this.auth.now() + LEASE_MS };
    return { snapshot: this.snapshot.id, members };
  }
  prepared(input) {
    requireThat(this.auth.config.mode === "production", 404, "not_found");
    const data = z.object({ snapshot: id, members: z.array(member).max(ENROLLMENT_MEMBERS) }).strict().parse(input);
    requireThat(this.snapshot && data.snapshot === this.snapshot.id &&
      this.snapshot.expiresAt > this.auth.now() &&
      data.members.every((number) => this.snapshot.members.includes(number)),
    409, "enrollment_snapshot_expired");
    this.ready = new Set(data.members);
    this.readyUntil = this.auth.now() + LEASE_MS;
    this.snapshot = undefined;
    return { prepared: true };
  }
  canReceive(number) {
    return this.readyUntil > this.auth.now() && this.ready.has(number);
  }
}
