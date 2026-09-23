import { requireThat } from "./validation.mjs";

const DAY = 86400000, FEATURE_DURATION = 12 * 3600000;

export class FeedHighlights {
  constructor(feed) { this.feed = feed; this.db = feed.db; this.now = feed.now; }
  pin(actor, id, pinned) {
    requireThat(this.feed.social.config.moderators.has(actor), 403, "moderator_required");
    this.feed.visiblePost(actor, id);
    this.db.transaction(() => {
      if (pinned) {
        const existing = this.db.get("SELECT 1 FROM feed_pins WHERE post_id=?", id);
        requireThat(existing || this.db.get("SELECT COUNT(*) AS n FROM feed_pins").n < 10, 409, "pin_limit");
        this.db.run("INSERT OR IGNORE INTO feed_pins VALUES(?,?,?)", id, actor, this.now());
      } else this.db.run("DELETE FROM feed_pins WHERE post_id=?", id);
    });
    return this.feed.view(actor, this.feed.visiblePost(actor, id));
  }
  metadata(id) {
    const pin = this.db.get("SELECT pinned_at FROM feed_pins WHERE post_id=?", id);
    const feature = this.db.get("SELECT featured_at,featured_until FROM feed_features WHERE post_id=? AND featured_until>?", id, this.now());
    return { pinnedAt: pin?.pinned_at ?? null, featuredAt: feature?.featured_at ?? null, featuredUntil: feature?.featured_until ?? null };
  }
  refresh() {
    const at = this.now();
    if (this.db.get("SELECT next_check_at FROM feed_feature_state WHERE id=1").next_check_at > at) return false;
    return this.db.transaction(() => {
      const active = this.db.get(`SELECT f.post_id FROM feed_features f JOIN posts p ON p.id=f.post_id
        JOIN users u ON u.member_number=p.author AND u.disabled=0
        WHERE f.featured_until>? AND p.deleted_at IS NULL LIMIT 1`, at);
      if (active) return false;
      // One vote per member/post; switching emoji never refreshes its date.
      // The choice is global and is persisted before any viewer sees it.
      const winner = this.db.get(`SELECT p.id,COUNT(*) AS votes FROM reactions r
        JOIN posts p ON p.id=r.target_id AND p.deleted_at IS NULL
        JOIN users author ON author.member_number=p.author AND author.disabled=0
        JOIN users reactor ON reactor.member_number=r.member_number AND reactor.disabled=0
        WHERE r.target_type='post' AND r.created_at>? AND r.created_at<=? AND r.member_number<>p.author
        AND NOT EXISTS(SELECT 1 FROM feed_features f WHERE f.post_id=p.id)
        AND NOT EXISTS(SELECT 1 FROM feed_pins pin WHERE pin.post_id=p.id)
        AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.owner=p.author AND b.target=r.member_number) OR (b.target=p.author AND b.owner=r.member_number))
        GROUP BY p.id ORDER BY votes DESC,p.created_at DESC,p.id DESC LIMIT 1`, at - DAY, at);
      if (winner) this.db.run("INSERT INTO feed_features VALUES(?,?,?)", winner.id, at, at + FEATURE_DURATION);
      this.db.run("UPDATE feed_feature_state SET next_check_at=? WHERE id=1", winner ? at + FEATURE_DURATION : at + 60000);
      return Boolean(winner);
    });
  }
  promoted(actor) {
    const rows = this.db.all(`SELECT p.* FROM posts p JOIN users u ON u.member_number=p.author AND u.disabled=0
      LEFT JOIN feed_pins pin ON pin.post_id=p.id
      LEFT JOIN feed_features f ON f.post_id=p.id AND f.featured_until>?
      WHERE p.deleted_at IS NULL AND (pin.post_id IS NOT NULL OR f.post_id IS NOT NULL)
      AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.owner=? AND b.target=p.author) OR (b.target=? AND b.owner=p.author))
      ORDER BY (pin.post_id IS NOT NULL) DESC,pin.pinned_at DESC,p.id DESC LIMIT 11`, this.now(), actor, actor);
    return rows.map(row => this.feed.view(actor, row));
  }
}
