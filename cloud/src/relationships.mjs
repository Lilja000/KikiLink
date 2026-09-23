import { requireThat } from "./validation.mjs";
const DAY = 86400000;

/** Cloud grants record each authenticated side's consent, not claims about the other side's BC list. */
export class Relationships {
  constructor(social, mailbox, changed) { Object.assign(this, { social, mailbox, changed, db: social.db, now: social.now }); }
  pair(a, b) { requireThat(a !== b, 400, "cannot_friend_self"); return a < b ? [a, b] : [b, a]; }
  row(a, b) { return this.db.get("SELECT * FROM relationships WHERE low_member=? AND high_member=?", ...this.pair(a, b)); }
  supports(peer, feature = "friend_requests") {
    return !!this.db.get(`SELECT 1 FROM social_capabilities c JOIN users u ON u.member_number=c.member_number WHERE c.member_number=? AND c.${feature}=1 AND c.updated_at>? AND u.disabled=0`, peer, this.now() - 45 * DAY);
  }
  allowed(a, b) {
    return a !== b && !this.social.blocked(a, b) && this.row(a, b)?.state === "accepted" &&
      !!this.db.get("SELECT 1 FROM relationship_grants WHERE owner=? AND peer=?", a, b) &&
      !!this.db.get("SELECT 1 FROM relationship_grants WHERE owner=? AND peer=?", b, a) &&
      !!this.db.get("SELECT 1 FROM users WHERE member_number=? AND disabled=0", b);
  }
  view(actor, peer) {
    this.social.visibleActor(actor, peer);
    const row = this.row(actor, peer);
    return { memberNumber: peer, supported: this.supports(peer), directMessages: this.supports(peer, "direct_messages"),
      state: row?.state === "pending" ? row.sender === actor ? "sent" : "received" : row?.state ?? "none",
      revision: row?.revision ?? 0, updatedAt: row?.updated_at ?? 0, canMessage: this.allowed(actor, peer),
      nativeSyncRequired: row?.state === "accepted" && !this.db.get("SELECT 1 FROM relationship_grants WHERE owner=? AND peer=?", actor, peer) };
  }
  grant(actor, peer) { this.db.run("INSERT INTO relationship_grants VALUES(?,?,?) ON CONFLICT(owner,peer) DO UPDATE SET updated_at=excluded.updated_at", actor, peer, this.now()); }
  update(actor, peer, state, sender = actor) {
    this.db.run(`INSERT INTO relationships(low_member,high_member,sender,state,updated_at) VALUES(?,?,?,?,?)
      ON CONFLICT(low_member,high_member) DO UPDATE SET sender=excluded.sender,state=excluded.state,revision=relationships.revision+1,updated_at=excluded.updated_at`, ...this.pair(actor, peer), sender, state, this.now());
  }
  send(actor, peer) {
    this.social.visibleActor(actor, peer);
    requireThat(this.supports(actor) && this.supports(peer), 409, "friend_requests_unsupported");
    const old = this.row(actor, peer);
    if (old?.state === "accepted" || old?.state === "pending") return this.view(actor, peer);
    requireThat(!old || this.now() - old.updated_at > 60_000, 429, "request_cooldown");
    requireThat(this.db.get("SELECT count(*) AS n FROM relationships WHERE sender=? AND state='pending'", actor).n < 100, 409, "request_limit");
    this.db.transaction(() => {
      this.update(actor, peer, "pending");
      this.mailbox.notify(peer, actor, "friend_request", "profile", String(actor), `friend:${actor}`, 1, true);
    });
    this.changed("relationships", actor, undefined, [actor, peer]);
    return this.view(actor, peer);
  }
  action(actor, peer, action) {
    this.social.visibleActor(actor, peer);
    const old = this.row(actor, peer);
    if (action === "accept" && old?.state === "accepted") return this.view(actor, peer);
    if (action === "cancel" && old?.state === "cancelled" || action === "decline" && old?.state === "declined") return this.view(actor, peer);
    requireThat(old?.state === "pending", 409, "request_no_longer_pending");
    requireThat(action === "cancel" ? old.sender === actor : old.sender !== actor, 403, "request_action_forbidden");
    this.db.transaction(() => {
      this.update(actor, peer, action === "accept" ? "accepted" : action === "cancel" ? "cancelled" : "declined", old.sender);
      if (action === "accept") this.mailbox.notify(peer, actor, "friend_accepted", "profile", String(actor), `accepted:${actor}:${old.revision}`, 1, true);
    });
    this.changed("relationships", actor, undefined, [actor, peer]);
    this.changed("mailbox", actor, undefined, [actor, peer]);
    return this.view(actor, peer);
  }
  confirm(actor, peers) {
    const accepted = [], confirmed = [], changedPeers = [];
    this.db.transaction(() => {
      for (const peer of peers) {
        if (actor === peer || this.social.blocked(actor, peer) || !this.db.get("SELECT 1 FROM users WHERE member_number=? AND disabled=0", peer)) continue;
        const old = this.row(actor, peer);
        // Tombstones cannot silently become friendships on login from a stale BC device.
        if (old && !["accepted", "pending"].includes(old.state)) continue;
        if (!this.db.get("SELECT 1 FROM relationship_grants WHERE owner=? AND peer=?", actor, peer)) { this.grant(actor, peer); changedPeers.push(peer); }
        confirmed.push(peer);
        if (!old && this.supports(actor) && this.supports(peer) && this.db.get("SELECT 1 FROM relationship_grants WHERE owner=? AND peer=?", peer, actor)) {
          this.update(actor, peer, "accepted"); accepted.push(peer);
        }
      }
    });
    if (changedPeers.length) this.changed("relationships", actor, undefined, [actor, ...changedPeers]);
    return { confirmed, accepted };
  }
  revoke(actor, peer) {
    this.pair(actor, peer);
    this.db.transaction(() => {
      this.db.run("DELETE FROM relationship_grants WHERE (owner=? AND peer=?) OR (owner=? AND peer=?)", actor, peer, peer, actor);
      if (this.row(actor, peer)) this.update(actor, peer, "revoked");
      for (const m of this.db.all("SELECT id,sender FROM direct_messages WHERE state='sent' AND ((sender=? AND recipient=?) OR (sender=? AND recipient=?))", actor, peer, peer, actor)) {
        this.db.run("UPDATE direct_messages SET state='revoked',payload=NULL WHERE id=?", m.id);
        this.db.run("INSERT INTO direct_receipts(sender,message_id,state,occurred_at) VALUES(?,?,'revoked',?)", m.sender, m.id, this.now());
      }
    });
    this.changed("relationships", actor, undefined, [actor, peer]);
    this.changed("direct", actor, undefined, [actor, peer]);
  }
  list(actor, after, limit) {
    const rows = this.db.all(`SELECT CASE WHEN low_member=? THEN high_member ELSE low_member END AS peer FROM relationships
      WHERE (low_member=? OR high_member=?) AND CASE WHEN low_member=? THEN high_member ELSE low_member END>?
      ORDER BY peer LIMIT ?`, actor, actor, actor, actor, after, limit + 1);
    return { items: rows.slice(0, limit).filter(r => !this.social.blocked(actor, r.peer) && this.db.get("SELECT 1 FROM users WHERE member_number=? AND disabled=0", r.peer)).map(r => this.view(actor, r.peer)),
      nextCursor: rows.length > limit ? rows[limit - 1].peer : null };
  }
}
