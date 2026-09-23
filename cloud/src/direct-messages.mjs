import { randomUUID } from "node:crypto";
import { requireThat } from "./validation.mjs";
const DAY = 86400000;
export class DirectMessages {
  constructor(social, relationships, changed) { Object.assign(this, { social, relationships, changed, db: social.db, keys: social.keys, now: social.now }); }
  allowed(sender, recipient) {
    return this.relationships.allowed(sender, recipient) && this.relationships.supports(sender, "direct_messages") && this.relationships.supports(recipient, "direct_messages");
  }
  view(row, content = true) {
    return { id: row.id, clientMessageId: row.client_id, sequence: row.sequence, sender: row.sender, recipient: row.recipient,
      createdAt: row.sent_at, storedAt: row.stored_at, deliveredAt: row.delivered_at, expiresAt: row.expires_at, state: row.state,
      ...(content && row.payload ? this.keys.open(row.payload, `direct:${row.id}`) : {}) };
  }
  send(actor, recipient, input) {
    this.social.visibleActor(actor, recipient);
    const old = this.db.get("SELECT * FROM direct_messages WHERE sender=? AND client_id=?", actor, input.clientMessageId);
    if (old) {
      requireThat(old.recipient === recipient, 409, "message_id_conflict");
      if (old.payload) {
        const original = this.keys.open(old.payload, `direct:${old.id}`);
        requireThat(original.text === input.text && original.roomName === input.roomName && old.sent_at === input.createdAt, 409, "message_id_conflict");
      }
      return this.view(old, false);
    }
    requireThat(this.allowed(actor, recipient), 403, "confirmed_friendship_required");
    requireThat(input.createdAt <= this.now() + 300_000 && input.createdAt >= this.now() - 30 * DAY, 400, "message_time_invalid");
    requireThat(this.db.get("SELECT count(*) AS n FROM direct_messages WHERE sender=? AND state='sent'", actor).n < 500, 409, "outbox_full");
    requireThat(this.db.get("SELECT count(*) AS n FROM direct_messages WHERE recipient=? AND state='sent'", recipient).n < 1000, 409, "recipient_inbox_full");
    const id = randomUUID();
    this.db.run(`INSERT INTO direct_messages(id,client_id,sender,recipient,payload,sent_at,stored_at,expires_at) VALUES(?,?,?,?,?,?,?,?)`,
      id, input.clientMessageId, actor, recipient, this.keys.seal({ text: input.text, ...(input.roomName ? { roomName: input.roomName } : {}) }, `direct:${id}`), input.createdAt, this.now(), this.now() + 30 * DAY);
    this.changed("direct", actor, undefined, [actor, recipient]);
    return this.view(this.db.get("SELECT * FROM direct_messages WHERE id=?", id), false);
  }
  inbox(actor, after, limit) {
    const rows = this.db.all("SELECT * FROM direct_messages WHERE recipient=? AND sequence>? ORDER BY sequence LIMIT ?", actor, after, limit + 1);
    const scanned = rows.slice(0, limit);
    return { items: scanned.filter(row => row.expires_at > this.now() && ["sent", "delivered"].includes(row.state) && this.allowed(row.sender, actor)).map(row => this.view(row)),
      cursor: scanned.at(-1)?.sequence ?? after, nextCursor: rows.length > limit ? scanned.at(-1).sequence : null };
  }
  acknowledge(actor, ids) {
    const senders = new Set();
    this.db.transaction(() => {
      for (const id of ids) {
        const row = this.db.get("SELECT * FROM direct_messages WHERE id=? AND recipient=?", id, actor);
        requireThat(row, 404, "message_unavailable");
        if (row.state === "delivered") {
          const readCursor = this.db.get("SELECT cursor FROM social_cursors WHERE owner=? AND scope=?", actor, `direct:${row.sender}`)?.cursor ?? 0;
          if (readCursor >= row.sequence) this.recordRead(actor, row.sender, readCursor);
          senders.add(row.sender);
          continue;
        }
        requireThat(row.state === "sent" && row.expires_at > this.now() && this.allowed(row.sender, actor), 403, "message_unavailable");
        this.db.run("UPDATE direct_messages SET state='delivered',delivered_at=? WHERE id=?", this.now(), id);
        this.db.run("INSERT INTO direct_receipts(sender,message_id,state,occurred_at) VALUES(?,?,'delivered',?)", row.sender, id, this.now());
        const readCursor = this.db.get("SELECT cursor FROM social_cursors WHERE owner=? AND scope=?", actor, `direct:${row.sender}`)?.cursor ?? 0;
        if (readCursor >= row.sequence) this.recordRead(actor, row.sender, readCursor);
        senders.add(row.sender);
      }
    });
    this.changed("direct", actor, undefined, [actor, ...senders]);
    return { acknowledged: ids };
  }
  receipts(actor, after, limit) {
    const rows = this.db.all(`SELECT r.sequence,r.message_id AS messageId,r.state,r.occurred_at AS occurredAt,m.recipient
      FROM direct_receipts r LEFT JOIN direct_messages m ON m.id=r.message_id
      WHERE r.sender=? AND r.sequence>? ORDER BY r.sequence LIMIT ?`, actor, after, limit + 1);
    const page = rows.slice(0, limit);
    return { items: page, cursor: page.at(-1)?.sequence ?? after, nextCursor: rows.length > limit ? page.at(-1).sequence : null };
  }
  recordRead(recipient, sender, cursor) {
    const result = this.db.run(`INSERT INTO direct_receipts(sender,message_id,state,occurred_at)
      SELECT dm.sender,dm.id,'read',? FROM direct_messages dm
      WHERE dm.recipient=? AND dm.sender=? AND dm.sequence<=? AND dm.state='delivered'
      AND NOT EXISTS(SELECT 1 FROM direct_receipts dr WHERE dr.sender=dm.sender AND dr.message_id=dm.id AND dr.state='read')`,
      this.now(), recipient, sender, cursor);
    return result.changes > 0;
  }
  cleanup() {
    for (const row of this.db.all("SELECT id,sender,state FROM direct_messages WHERE expires_at<=? AND payload IS NOT NULL LIMIT 1000", this.now())) {
      this.db.run("UPDATE direct_messages SET payload=NULL,state=CASE WHEN state='sent' THEN 'expired' ELSE state END WHERE id=?", row.id);
      if (row.state === "sent") this.db.run("INSERT INTO direct_receipts(sender,message_id,state,occurred_at) VALUES(?,?,'expired',?)", row.sender, row.id, this.now());
    }
    this.db.run("DELETE FROM direct_messages WHERE expires_at<?", this.now() - 30 * DAY);
    this.db.run("DELETE FROM direct_receipts WHERE occurred_at<?", this.now() - 30 * DAY);
  }
}
