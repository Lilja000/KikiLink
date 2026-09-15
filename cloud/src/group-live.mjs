import { requireThat } from "./validation.mjs";

/** Ephemeral, session-bound signals. Draft text is never accepted or retained. */
export class GroupLive {
  constructor(social) { this.social = social; this.typists = new Map(); }
  prune() {
    for (const [key, value] of this.typists) {
      if (value.until <= this.social.now() || !this.social.db.get(
        "SELECT 1 FROM sessions s JOIN users u ON u.member_number=s.member_number WHERE s.token_hash=? AND s.expires_at>? AND u.disabled=0",
        key, this.social.now(),
      )) this.typists.delete(key);
    }
  }
  typing(identity, conversationId, typing) {
    const membership = this.social.conversation(identity.member, conversationId);
    this.prune();
    if (typing) {
      requireThat(this.typists.has(identity.tokenHash) || this.typists.size < 1000, 429, "typing_capacity");
      this.typists.set(identity.tokenHash, { member: identity.member, conversationId, until: Math.min(identity.expiresAt, this.social.now() + 8000) });
    } else if (this.typists.get(identity.tokenHash)?.conversationId === conversationId) this.typists.delete(identity.tokenHash);
    return membership.group_id;
  }
  group(actor, groupId) {
    const membership = this.social.membership(actor, groupId);
    this.prune();
    const members = this.social.db.all(
      `SELECT m.member_number AS memberNumber, p.status, p.expires_at AS expiresAt
       FROM group_members m JOIN users u ON u.member_number=m.member_number
       LEFT JOIN presence p ON p.member_number=m.member_number AND p.expires_at>?
         AND EXISTS(SELECT 1 FROM sessions s WHERE s.member_number=m.member_number AND s.expires_at>?)
       WHERE m.group_id=? AND m.status='active' AND u.disabled=0`, this.social.now(), this.social.now(), groupId,
    ).filter(m => !this.social.blocked(actor, m.memberNumber));
    const active = new Set(members.map(m => m.memberNumber));
    const typing = new Map();
    for (const signal of this.typists.values()) {
      if (signal.conversationId === membership.conversation_id && active.has(signal.member) && signal.member !== actor)
        typing.set(signal.member, Math.max(typing.get(signal.member) ?? 0, signal.until));
    }
    return {
      members: members.map(m => ({ memberNumber: m.memberNumber, status: m.status ?? "unavailable", expiresInMs: Math.max(0, (m.expiresAt ?? 0) - this.social.now()) })),
      typing: [...typing].map(([memberNumber, until]) => ({ memberNumber, expiresInMs: until - this.social.now() })),
    };
  }
}
