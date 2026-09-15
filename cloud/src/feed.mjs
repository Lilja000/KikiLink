import { requireThat } from "./validation.mjs";
import { hash } from "./crypto.mjs";

export class Feed {
  constructor(social) {
    this.social = social;
    const { db, keys, now } = social;
    Object.assign(this, { db, keys, now });
  }
  visiblePost(actor, id) {
    const p = this.db.get(
      "SELECT * FROM posts WHERE id=? AND deleted_at IS NULL",
      id,
    );
    requireThat(p);
    this.social.visibleActor(actor, p.author);
    return p;
  }
  target(actor, type, id) {
    if (type === "post") return this.visiblePost(actor, id);
    const c = this.db.get(
      "SELECT * FROM comments WHERE id=? AND deleted_at IS NULL",
      id,
    );
    requireThat(c);
    this.visiblePost(actor, c.post_id);
    this.social.visibleActor(actor, c.author);
    return c;
  }
  profileSummary(viewer, memberNumber) {
    try {
      const p = this.social.profile(viewer, memberNumber);
      return {
        memberNumber,
        displayName: p.displayName,
        avatarId: p.avatarId,
        avatarFrame: p.avatarFrame,
      };
    } catch {
      return {
        memberNumber,
        displayName: `Member ${memberNumber}`,
        avatarId: null,
        avatarFrame: "none",
      };
    }
  }
  reactions(actor, type, id) {
    const counts = this.db.all(
      `SELECT r.reaction,COUNT(*) AS count FROM reactions r JOIN users u ON u.member_number=r.member_number AND u.disabled=0 WHERE target_type=? AND target_id=?
      AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.owner=? AND b.target=r.member_number) OR (b.target=? AND b.owner=r.member_number)) GROUP BY reaction`,
      type,
      id,
      actor,
      actor,
    );
    return {
      counts,
      mine:
        this.db.get(
          "SELECT reaction FROM reactions WHERE target_type=? AND target_id=? AND member_number=?",
          type,
          id,
          actor,
        )?.reaction ?? null,
    };
  }
  view(actor, p) {
    return {
      id: p.id,
      author: p.author,
      profile: this.profileSummary(actor, p.author),
      text: this.keys.open(p.payload, `post:${p.id}`),
      revision: p.revision,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      mediaIds: this.db
        .all(
          "SELECT asset_id FROM feed_media WHERE post_id=? ORDER BY position",
          p.id,
        )
        .map((x) => x.asset_id),
      reactions: this.reactions(actor, "post", p.id),
      commentCount: this.db.get(
        `SELECT COUNT(*) AS n FROM comments c JOIN users u ON u.member_number=c.author AND u.disabled=0
         WHERE c.post_id=? AND c.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM blocks b
         WHERE (b.owner=? AND b.target=c.author) OR (b.target=? AND b.owner=c.author))`,
        p.id, actor, actor,
      ).n,
    };
  }
  list(actor, before, limit, query = "") {
    if (query) return this.search(actor, before, limit, query);
    const rows = this.db.all(
      `SELECT p.* FROM posts p JOIN users u ON p.author=u.member_number AND u.disabled=0 WHERE p.deleted_at IS NULL AND (?=0 OR p.id<?)
      AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.owner=? AND b.target=p.author) OR (b.target=? AND b.owner=p.author)) ORDER BY p.id DESC LIMIT ?`,
      before,
      before,
      actor,
      actor,
      limit + 1,
    );
    return {
      items: rows.slice(0, limit).map((p) => this.view(actor, p)),
      nextCursor: rows.length > limit ? rows[limit - 1].id : null,
    };
  }
  search(actor, before, limit, query) {
    // Payloads stay encrypted on disk. Scan at most 200 visible candidates per
    // request; the cursor also advances over pages with no matching posts.
    const author = /^#\d+$/.test(query) ? Number(query.slice(1)) : 0;
    if (/^#\d+$/.test(query) && (!Number.isSafeInteger(author) || author <= 0)) return { items: [], nextCursor: null };
    const terms = query.normalize("NFKC").toLowerCase().split(/\s+/).filter(Boolean);
    const rows = this.db.all(
      `SELECT p.* FROM posts p JOIN users u ON p.author=u.member_number AND u.disabled=0
       WHERE p.deleted_at IS NULL AND (?=0 OR p.id<?) AND (?=0 OR p.author=?)
       AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.owner=? AND b.target=p.author) OR (b.target=? AND b.owner=p.author))
       ORDER BY p.id DESC LIMIT 201`,
      before, before, author, author, actor, actor,
    );
    const items = [];
    for (const row of rows.slice(0, 200)) {
      const content = author ? "" : this.keys.open(row.payload, `post:${row.id}`).normalize("NFKC").toLowerCase();
      if (!author && !terms.every(term => content.includes(term))) continue;
      if (items.length === limit) return { items, nextCursor: items[items.length - 1].id };
      items.push(this.view(actor, row));
    }
    return { items, nextCursor: rows.length > 200 ? rows[199].id : null };
  }
  attach(actor, postId, mediaIds) {
    for (const asset of mediaIds) {
      this.social.assetFor(actor, asset, "feed");
      const linked = this.db.get(
        "SELECT post_id FROM feed_media WHERE asset_id=?",
        asset,
      );
      requireThat(
        !linked || linked.post_id === postId,
        409,
        "media_already_attached",
      );
    }
    this.db.run("DELETE FROM feed_media WHERE post_id=?", postId);
    mediaIds.forEach((asset, pos) =>
      this.db.run("INSERT INTO feed_media VALUES(?,?,?)", postId, asset, pos),
    );
  }
  create(actor, input) {
    return this.db.transaction(() => {
      const fingerprint = hash(
        JSON.stringify({ text: input.text, mediaIds: input.mediaIds }),
      );
      if (input.clientId) {
        const old = this.db.get(
          "SELECT * FROM posts WHERE author=? AND client_id=?",
          actor,
          input.clientId,
        );
        if (old) {
          requireThat(old.deleted_at === null);
          requireThat(
            old.request_hash === fingerprint,
            409,
            "idempotency_conflict",
          );
          return this.view(actor, old);
        }
      }
      requireThat(
        this.db.get(
          "SELECT COUNT(*) AS n FROM posts WHERE author=? AND deleted_at IS NULL",
          actor,
        ).n < 500,
        409,
        "post_quota",
      );
      const at = this.now(),
        id = Number(
          this.db.run(
            "INSERT INTO posts(author,client_id,request_hash,created_at,updated_at) VALUES(?,?,?,?,?)",
            actor,
            input.clientId ?? null,
            fingerprint,
            at,
            at,
          ).lastInsertRowid,
        );
      this.db.run(
        "UPDATE posts SET payload=? WHERE id=?",
        this.keys.seal(input.text, `post:${id}`),
        id,
      );
      this.attach(actor, id, input.mediaIds);
      return this.view(actor, this.visiblePost(actor, id));
    });
  }
  edit(actor, id, input) {
    return this.db.transaction(() => {
      const old = this.visiblePost(actor, id);
      requireThat(old.author === actor, 403, "owner_required");
      requireThat(old.revision === input.revision, 409, "revision_conflict");
      this.db.run(
        "UPDATE posts SET payload=?,revision=revision+1,updated_at=? WHERE id=?",
        this.keys.seal(input.text, `post:${id}`),
        this.now(),
        id,
      );
      this.attach(actor, id, input.mediaIds);
      return this.view(actor, this.visiblePost(actor, id));
    });
  }
  removePost(actor, id, moderator = false) {
    const old = this.db.get("SELECT author FROM posts WHERE id=?", id);
    requireThat(old);
    requireThat(moderator || old.author === actor, 403, "owner_required");
    this.db.transaction(() => {
      this.db.run(
        "UPDATE posts SET payload=NULL,deleted_at=?,updated_at=? WHERE id=?",
        this.now(),
        this.now(),
        id,
      );
      this.db.run("DELETE FROM feed_media WHERE post_id=?", id);
      this.db.run(
        "DELETE FROM reactions WHERE (target_type='post' AND target_id=?) OR (target_type='comment' AND target_id IN (SELECT id FROM comments WHERE post_id=?))",
        id,
        id,
      );
      this.db.run(
        "UPDATE comments SET payload=NULL,deleted_at=? WHERE post_id=?",
        this.now(),
        id,
      );
    });
  }
  commentView(actor, c) {
    return {
      id: c.id,
      postId: c.post_id,
      author: c.author,
      profile: this.profileSummary(actor, c.author),
      text: this.keys.open(c.payload, `comment:${c.id}`),
      revision: c.revision,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      reactions: this.reactions(actor, "comment", c.id),
    };
  }
  comments(actor, postId, after, limit) {
    this.visiblePost(actor, postId);
    const rows = this.db.all(
      `SELECT c.* FROM comments c JOIN users u ON u.member_number=c.author AND u.disabled=0 WHERE post_id=? AND c.id>? AND deleted_at IS NULL
      AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.owner=? AND b.target=c.author) OR (b.target=? AND b.owner=c.author)) ORDER BY c.id LIMIT ?`,
      postId,
      after,
      actor,
      actor,
      limit + 1,
    );
    return {
      items: rows.slice(0, limit).map((c) => this.commentView(actor, c)),
      nextCursor: rows.length > limit ? rows[limit - 1].id : null,
    };
  }
  comment(actor, postId, text) {
    return this.db.transaction(() => {
      this.visiblePost(actor, postId);
      requireThat(
        this.db.get(
          "SELECT COUNT(*) AS n FROM comments WHERE post_id=? AND deleted_at IS NULL",
          postId,
        ).n < 1000,
        409,
        "comment_quota",
      );
      requireThat(
        this.db.get(
          "SELECT COUNT(*) AS n FROM comments WHERE author=? AND deleted_at IS NULL",
          actor,
        ).n < 5000,
        409,
        "comment_quota",
      );
      const at = this.now(),
        id = Number(
          this.db.run(
            "INSERT INTO comments(post_id,author,created_at,updated_at) VALUES(?,?,?,?)",
            postId,
            actor,
            at,
            at,
          ).lastInsertRowid,
        );
      this.db.run(
        "UPDATE comments SET payload=? WHERE id=?",
        this.keys.seal(text, `comment:${id}`),
        id,
      );
      return this.commentView(actor, this.target(actor, "comment", id));
    });
  }
  editComment(actor, id, text, revision) {
    const old = this.target(actor, "comment", id);
    requireThat(old.author === actor, 403, "owner_required");
    requireThat(old.revision === revision, 409, "revision_conflict");
    this.db.run(
      "UPDATE comments SET payload=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?",
      this.keys.seal(text, `comment:${id}`),
      this.now(),
      id,
      revision,
    );
    return this.commentView(actor, this.target(actor, "comment", id));
  }
  removeComment(actor, id, moderator = false) {
    const c = this.db.get("SELECT * FROM comments WHERE id=?", id);
    requireThat(c);
    requireThat(
      moderator ||
        c.author === actor ||
        this.visiblePost(actor, c.post_id).author === actor,
      403,
      "owner_required",
    );
    this.db.transaction(() => {
      this.db.run(
        "UPDATE comments SET payload=NULL,deleted_at=? WHERE id=?",
        this.now(),
        id,
      );
      this.db.run(
        "DELETE FROM reactions WHERE target_type='comment' AND target_id=?",
        id,
      );
    });
  }
  react(actor, type, id, reaction) {
    this.target(actor, type, id);
    if (reaction === null)
      this.db.run(
        "DELETE FROM reactions WHERE target_type=? AND target_id=? AND member_number=?",
        type,
        id,
        actor,
      );
    else
      this.db.run(
        "INSERT INTO reactions VALUES(?,?,?,?) ON CONFLICT(target_type,target_id,member_number) DO UPDATE SET reaction=excluded.reaction",
        type,
        id,
        actor,
        reaction,
      );
    return this.reactions(actor, type, id);
  }
  reportable(actor, type, id) {
    if (type === "profile") return this.social.profile(actor, Number(id));
    if (type === "post" || type === "comment")
      return this.target(actor, type, Number(id));
    if (type === "group") return this.social.group(actor, id);
    const m = this.db.get("SELECT * FROM messages WHERE id=?", id);
    requireThat(m);
    const own = this.social.conversation(actor, m.conversation_id);
    requireThat(m.sequence >= own.joined_sequence);
    this.social.visibleActor(actor, m.sender);
    return m;
  }
  report(actor, type, id, reason) {
    this.reportable(actor, type, id);
    const old = this.db.get(
      "SELECT id FROM reports WHERE reporter=? AND target_type=? AND target_id=? AND status='open'",
      actor,
      type,
      id,
    );
    if (old) return { id: old.id };
    const reportId = Number(
      this.db.run(
        "INSERT INTO reports(reporter,target_type,target_id,reason,created_at) VALUES(?,?,?,?,?)",
        actor,
        type,
        id,
        this.keys.seal(reason, `report:${actor}:${type}:${id}`),
        this.now(),
      ).lastInsertRowid,
    );
    return { id: reportId };
  }
  reportList(before, limit) {
    const rows = this.db.all(
      "SELECT * FROM reports WHERE status='open' AND id>? ORDER BY id LIMIT ?",
      before,
      limit + 1,
    );
    return {
      items: rows.slice(0, limit).map((r) => ({
        ...r,
        reason: this.keys.open(
          r.reason,
          `report:${r.reporter}:${r.target_type}:${r.target_id}`,
        ),
      })),
      nextCursor: rows.length > limit ? rows[limit - 1].id : null,
    };
  }
  reportDetail(reportId) {
    const report = this.db.get(
      "SELECT target_type,target_id FROM reports WHERE id=? AND status='open'",
      reportId,
    );
    requireThat(report);
    const type = report.target_type,
      id = report.target_id;
    let author,
      text,
      mediaIds = [];
    if (type === "profile") {
      const row = this.db.get(
        "SELECT payload FROM profiles WHERE member_number=?",
        Number(id),
      );
      requireThat(row);
      const payload = this.keys.open(row.payload, `profile:${id}`);
      author = Number(id);
      text = `${payload.displayName}\n${payload.bio}`;
      mediaIds = this.db
        .all("SELECT asset_id FROM profile_media WHERE member_number=?", author)
        .map((row) => row.asset_id);
    } else if (type === "post" || type === "comment") {
      const table = type === "post" ? "posts" : "comments";
      const row = this.db.get(
        `SELECT author,payload FROM ${table} WHERE id=? AND deleted_at IS NULL`,
        Number(id),
      );
      requireThat(row);
      author = row.author;
      text = this.keys.open(row.payload, `${type}:${id}`);
      if (type === "post")
        mediaIds = this.db
          .all(
            "SELECT asset_id FROM feed_media WHERE post_id=? ORDER BY position",
            Number(id),
          )
          .map((row) => row.asset_id);
    } else if (type === "group") {
      const row = this.db.get("SELECT owner,title FROM groups WHERE id=?", id);
      requireThat(row);
      author = row.owner;
      text = this.keys.open(row.title, `group:${id}`);
    } else {
      const row = this.db.get(
        "SELECT * FROM messages WHERE id=? AND deleted_at IS NULL",
        id,
      );
      requireThat(row);
      author = row.sender;
      text = this.social.messageView(row).text;
    }
    // One currently reported resource; never expose surrounding private chat history.
    return { reportId, targetType: type, targetId: id, author, text, mediaIds };
  }
  moderate(actor, type, id, reason) {
    // Do not copy content into audit logs. A reason and resource reference suffice.
    if (type === "profile") this.social.removeProfile(Number(id));
    else if (type === "post") this.removePost(actor, Number(id), true);
    else if (type === "comment") this.removeComment(actor, Number(id), true);
    else if (type === "message")
      this.db.run(
        "UPDATE messages SET envelope=NULL,deleted_at=? WHERE id=?",
        this.now(),
        id,
      );
    else if (type === "group") this.db.run("DELETE FROM groups WHERE id=?", id);
    this.db.run(
      "INSERT INTO moderation_actions(moderator,action,target_type,target_id,reason,created_at) VALUES(?,?,?,?,?,?)",
      actor,
      "remove",
      type,
      id,
      this.keys.seal(reason, `moderation:${type}:${id}`),
      this.now(),
    );
    this.db.run(
      "UPDATE reports SET status='resolved',resolved_at=? WHERE target_type=? AND target_id=?",
      this.now(),
      type,
      id,
    );
  }
}
