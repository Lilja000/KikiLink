import { requireThat } from "./validation.mjs";
import releases from "../shared/news.json" with { type: "json" };
const DAY = 86400000;
export class Mailbox {
  constructor(social, changed) { Object.assign(this, { social, changed, db: social.db, now: social.now }); }
  notify(recipient, actor, kind, type, targetId, key, count = 1, renew = false) {
    if (!this.social.config.communityEnabled) return;
    if (actor === recipient || actor && this.social.blocked(recipient, actor)) return;
    if (!this.db.get("SELECT 1 FROM users WHERE member_number=? AND disabled=0", recipient)) return;
    const old = this.db.get("SELECT id FROM mailbox WHERE recipient=? AND dedupe_key=?", recipient, key);
    if (old && !renew) return;
    if (old) this.db.run("UPDATE mailbox SET actor=?,count=?,updated_at=?,read_at=NULL WHERE id=?", actor, count, this.now(), old.id);
    else this.db.run(`INSERT INTO mailbox(recipient,actor,kind,target_type,target_id,dedupe_key,count,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?)`, recipient, actor, kind, type, String(targetId), key, count, this.now(), this.now());
    this.db.run("DELETE FROM mailbox WHERE recipient=? AND id NOT IN (SELECT id FROM mailbox WHERE recipient=? ORDER BY id DESC LIMIT 500)", recipient, recipient);
    queueMicrotask(() => this.changed("mailbox", actor, undefined, [recipient]));
  }
  report(reportId, actor) {
    for (const moderator of this.social.config.moderators) this.notify(moderator, actor, "report", "report", String(reportId), `report:${reportId}`);
  }
  comment(actor, postId, commentId) {
    const p = this.db.get("SELECT author FROM posts WHERE id=? AND deleted_at IS NULL", postId);
    if (!p || !this.social.config.communityEnabled) return;
    const recipients = new Set([actor]);
    const notifyOnce = (recipient, kind) => {
      if (recipients.has(recipient) || this.social.blocked(recipient, p.author)) return;
      recipients.add(recipient);
      this.notify(recipient, actor, kind, "comment", String(commentId), `comment:${commentId}`);
    };
    notifyOnce(p.author, "comment");
    const parent = this.db.get(`SELECT parent.author FROM comments c JOIN comments parent ON parent.id=c.parent_id
      WHERE c.id=? AND parent.deleted_at IS NULL`, commentId);
    if (parent) notifyOnce(parent.author, "comment_reply");
    const watchers = this.db.all(`SELECT fp.owner FROM feed_preferences fp JOIN users u ON u.member_number=fp.owner AND u.disabled=0
      WHERE fp.post_id=? AND fp.watching=1 AND fp.hidden=0
      AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.owner=fp.owner AND b.target IN (?,?)) OR (b.target=fp.owner AND b.owner IN (?,?)))`, postId, actor, p.author, actor, p.author);
    for (const { owner } of watchers) {
      if (recipients.has(owner)) continue;
      const key = `watch:${postId}`;
      const old = this.db.get("SELECT id,count,read_at,created_at FROM mailbox WHERE recipient=? AND dedupe_key=?", owner, key);
      if (old && old.read_at === null && old.created_at > this.now() - 30 * DAY) {
        // Keep one unread notification: additional comments update its count
        // without repeatedly triggering sounds/toasts on subscribed clients.
        this.db.run("UPDATE mailbox SET count=count+1,actor=?,updated_at=? WHERE id=?", actor, this.now(), old.id);
      } else {
        // A new batch receives a fresh cursor/date and moves to the top. Reusing
        // a month-old row would make a renewed notification immediately expire.
        if (old) this.db.run("DELETE FROM mailbox WHERE id=?", old.id);
        this.notify(owner, actor, "post_comment", "post", String(postId), key);
      }
    }
  }
  reaction(actor, type, id, reaction) {
    if (!this.social.config.communityEnabled) return;
    const table = type === "post" ? "posts" : "comments";
    const target = this.db.get(`SELECT author FROM ${table} WHERE id=? AND deleted_at IS NULL`, id);
    if (!target || target.author === actor) return;
    const count = this.db.get(`SELECT COUNT(*) AS n FROM reactions r JOIN users u ON u.member_number=r.member_number
      WHERE r.target_type=? AND r.target_id=? AND r.member_number<>? AND u.disabled=0
      AND NOT EXISTS(SELECT 1 FROM blocks WHERE (owner=? AND target=r.member_number) OR (target=? AND owner=r.member_number))`, type, id, target.author, target.author, target.author).n;
    const key = `reactions:${type}:${id}`;
    if (!count) this.db.run("DELETE FROM mailbox WHERE recipient=? AND dedupe_key=?", target.author, key);
    else if (reaction) this.notify(target.author, actor, "reaction", type, String(id), key, count, true);
    else this.db.run("UPDATE mailbox SET count=? WHERE recipient=? AND dedupe_key=?", count, target.author, key);
  }
  invitations(groupId, actor) {
    for (const member of this.db.all("SELECT member_number,invited_at FROM group_members WHERE group_id=? AND status='invited'", groupId))
      this.notify(member.member_number, actor, "group_invitation", "group", groupId, `group:${groupId}:${member.invited_at}`);
  }
  normalizeReaction(recipient, row) {
    if (row.kind !== "reaction") return row;
    const people = this.db.all(`SELECT r.member_number FROM reactions r JOIN users u ON u.member_number=r.member_number
      WHERE r.target_type=? AND r.target_id=? AND r.member_number<>? AND u.disabled=0
      AND NOT EXISTS(SELECT 1 FROM blocks WHERE (owner=? AND target=r.member_number) OR (target=? AND owner=r.member_number))
      ORDER BY r.member_number`, row.target_type, Number(row.target_id), recipient, recipient, recipient);
    return people.length ? { ...row, actor: people.some(p => p.member_number === row.actor) ? row.actor : people[0].member_number, count: people.length } : null;
  }
  visible(actor, row) {
    if (row.actor && this.social.blocked(actor, row.actor)) return false;
    if (row.kind === "report" && !this.social.config.moderators.has(actor)) return false;
    if (row.actor && !this.db.get("SELECT 1 FROM users WHERE member_number=? AND disabled=0", row.actor)) return false;
    if (row.target_type === "post" || row.target_type === "comment") {
      const post = row.target_type === "post"
        ? this.db.get("SELECT author,deleted_at FROM posts WHERE id=?", Number(row.target_id))
        : this.db.get("SELECT p.author,p.deleted_at,c.deleted_at AS comment_deleted FROM comments c JOIN posts p ON p.id=c.post_id WHERE c.id=?", Number(row.target_id));
      if (!post || post.deleted_at !== null || post.comment_deleted != null || this.social.blocked(actor, post.author) || !this.db.get("SELECT 1 FROM users WHERE member_number=? AND disabled=0", post.author)) return false;
    }
    return true;
  }
  view(actor, row) {
    let pending = false, postId;
    if (row.kind === "friend_request") pending = !!this.db.get(`SELECT 1 FROM relationships WHERE low_member=? AND high_member=? AND sender=? AND state='pending'`, Math.min(actor, row.actor), Math.max(actor, row.actor), row.actor);
    if (row.kind === "group_invitation") pending = !!this.db.get("SELECT 1 FROM group_members WHERE group_id=? AND member_number=? AND status='invited'", row.target_id, actor);
    if (row.target_type === "comment") postId = this.db.get("SELECT post_id FROM comments WHERE id=?", Number(row.target_id))?.post_id;
    return { id: row.id, actor: row.actor, kind: row.kind, targetType: row.target_type, targetId: row.target_id,
      count: row.count, createdAt: row.created_at, updatedAt: row.updated_at, read: row.read_at !== null, pending, ...(postId ? { postId } : {}) };
  }
  list(actor, before, limit) {
    const release = releases.find(r => /^\d+\.\d+\.\d+$/.test(r.version) && Date.parse(r.date) <= this.now());
    if (release) {
      const timestamp = Date.parse(release.date);
      const previous = this.db.get("SELECT cursor FROM social_cursors WHERE owner=? AND scope='release'", actor);
      if (previous && timestamp > previous.cursor) this.notify(actor, null, "release", "release", release.version, `release:${release.version}`);
      this.db.run("INSERT INTO social_cursors VALUES(?,'release',?,?) ON CONFLICT(owner,scope) DO UPDATE SET cursor=MAX(cursor,excluded.cursor)", actor, timestamp, this.now());
    }
    // Small bounded account inbox; filtering never exposes a blocked sender.
    const visible = this.db.all("SELECT * FROM mailbox WHERE recipient=? AND created_at>? ORDER BY id DESC LIMIT 500", actor, this.now() - 30 * DAY).map(row => this.normalizeReaction(actor, row)).filter(row => row && this.visible(actor, row));
    const rows = visible.filter(row => !before || row.id < before);
    return { items: rows.slice(0, limit).map(row => this.view(actor, row)), nextCursor: rows.length > limit ? rows[limit - 1].id : null,
      unread: visible.filter(row => row.read_at === null).length };
  }
  read(actor, id) {
    if (id) requireThat(this.db.get("SELECT 1 FROM mailbox WHERE id=? AND recipient=?", id, actor));
    this.db.run(`UPDATE mailbox SET read_at=? WHERE recipient=?${id ? " AND id=?" : ""}`, this.now(), actor, ...(id ? [id] : []));
    this.changed("mailbox", actor, undefined, [actor]);
  }
}
