import { requireThat } from "./validation.mjs";

const DAY = 86400000;

/** Additive Feed data. Preferences are always scoped to the authenticated viewer. */
export class FeedTools {
  constructor(feed) { Object.assign(this, { feed, db: feed.db, keys: feed.keys, now: feed.now }); }
  filter(actor, filter = "all") {
    const args = [actor];
    let sql = filter === "hidden"
      ? " AND p.id IN (SELECT post_id FROM feed_preferences WHERE owner=? AND hidden=1)"
      : " AND NOT EXISTS(SELECT 1 FROM feed_preferences fp WHERE fp.owner=? AND fp.post_id=p.id AND fp.hidden=1)";
    if (filter === "saved") { sql += " AND p.id IN (SELECT post_id FROM feed_preferences WHERE owner=? AND bookmarked=1)"; args.push(actor); }
    if (filter === "mine") { sql += " AND p.author=?"; args.push(actor); }
    if (filter === "friends") {
      sql += ` AND p.author IN (SELECT high_member FROM relationships WHERE low_member=? AND state='accepted'
        UNION SELECT low_member FROM relationships WHERE high_member=? AND state='accepted')`;
      args.push(actor, actor);
    }
    return { sql, args };
  }
  metadata(actor, postId) {
    const state = this.db.get("SELECT bookmarked,hidden,watching FROM feed_preferences WHERE owner=? AND post_id=?", actor, postId);
    return { bookmarked: !!state?.bookmarked, hidden: !!state?.hidden, watching: !!state?.watching,
      spoilerMediaIds: this.db.all("SELECT asset_id FROM feed_media WHERE post_id=? AND spoiler=1 ORDER BY position", postId).map(row => row.asset_id),
      poll: this.poll(actor, postId) };
  }
  metadataMany(actor, posts) {
    const ids = [...new Set(posts.map(post => post.id))];
    if (!ids.length) return new Map();
    const placeholders = ids.map(() => "?").join(",");
    const result = new Map(ids.map(id => [id, { bookmarked: false, hidden: false, watching: false, spoilerMediaIds: [], poll: null }]));
    for (const row of this.db.all(`SELECT * FROM feed_preferences WHERE owner=? AND post_id IN (${placeholders})`, actor, ...ids)) {
      Object.assign(result.get(row.post_id), { bookmarked: !!row.bookmarked, hidden: !!row.hidden, watching: !!row.watching });
    }
    for (const row of this.db.all(`SELECT post_id,asset_id FROM feed_media WHERE spoiler=1 AND post_id IN (${placeholders}) ORDER BY post_id,position`, ...ids)) result.get(row.post_id).spoilerMediaIds.push(row.asset_id);
    const polls = this.db.all(`SELECT * FROM feed_polls WHERE post_id IN (${placeholders})`, ...ids);
    if (!polls.length) return result;
    const pollIds = polls.map(row => row.post_id), pollPlaceholders = pollIds.map(() => "?").join(",");
    const visibleVotes = `FROM feed_poll_votes v JOIN users u ON u.member_number=v.member_number AND u.disabled=0 WHERE v.post_id IN (${pollPlaceholders})
      AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.owner=? AND b.target=v.member_number) OR (b.target=? AND b.owner=v.member_number))`;
    const counts = this.db.all(`SELECT v.post_id,v.option_id,COUNT(*) AS count ${visibleVotes} GROUP BY v.post_id,v.option_id`, ...pollIds, actor, actor);
    const voters = this.db.all(`SELECT v.post_id,COUNT(DISTINCT v.member_number) AS n ${visibleVotes} GROUP BY v.post_id`, ...pollIds, actor, actor);
    const mine = this.db.all(`SELECT post_id,option_id FROM feed_poll_votes WHERE post_id IN (${pollPlaceholders}) AND member_number=? ORDER BY option_id`, ...pollIds, actor);
    for (const row of polls) result.get(row.post_id).poll = this.pollView(row, counts.filter(v => v.post_id === row.post_id), voters.find(v => v.post_id === row.post_id)?.n ?? 0, mine.filter(v => v.post_id === row.post_id).map(v => v.option_id));
    return result;
  }
  preference(actor, postId, field, enabled) {
    requireThat(["bookmarked", "hidden", "watching"].includes(field), 400, "invalid_preference");
    this.feed.visiblePost(actor, postId);
    this.db.transaction(() => {
      const old = this.db.get("SELECT * FROM feed_preferences WHERE owner=? AND post_id=?", actor, postId);
      if (enabled && !old?.[field]) {
        requireThat(this.db.get(`SELECT COUNT(*) AS n FROM feed_preferences WHERE owner=? AND ${field}=1`, actor).n < 1000, 409, "feed_preference_limit");
        if (field === "watching") requireThat(this.db.get("SELECT COUNT(*) AS n FROM feed_preferences WHERE post_id=? AND watching=1", postId).n < 1000, 409, "post_watch_limit");
      }
      this.db.run(`INSERT INTO feed_preferences(owner,post_id,${field},updated_at) VALUES(?,?,?,?) ON CONFLICT(owner,post_id) DO UPDATE SET ${field}=excluded.${field},updated_at=excluded.updated_at`, actor, postId, Number(enabled), this.now());
      if (field === "hidden" && enabled) {
        this.db.run("UPDATE feed_preferences SET watching=0 WHERE owner=? AND post_id=?", actor, postId);
        this.db.run("DELETE FROM mailbox WHERE recipient=? AND dedupe_key=?", actor, `watch:${postId}`);
      }
      if (field === "watching" && !enabled) this.db.run("DELETE FROM mailbox WHERE recipient=? AND dedupe_key=?", actor, `watch:${postId}`);
      this.db.run("DELETE FROM feed_preferences WHERE owner=? AND post_id=? AND bookmarked=0 AND hidden=0 AND watching=0", actor, postId);
    });
    return this.feed.view(actor, this.feed.visiblePost(actor, postId));
  }
  createPoll(postId, input) {
    if (!input) return;
    requireThat(input.closesAt >= this.now() + 5 * 60000 && input.closesAt <= this.now() + 7 * DAY, 400, "invalid_poll_expiry");
    const payload = { question: input.question, options: input.options.map((text, index) => ({ id: index + 1, text })) };
    this.db.run("INSERT INTO feed_polls VALUES(?,?,?,?)", postId, this.keys.seal(payload, `feed-poll:${postId}`), Number(input.multiple), input.closesAt);
  }
  pollText(row) {
    const payload = this.keys.open(row.payload, `feed-poll:${row.post_id}`);
    return [payload.question, ...payload.options.map(option => option.text)].join("\n");
  }
  pollTexts(posts) {
    if (!posts.length) return new Map();
    const rows = this.db.all(`SELECT post_id,payload FROM feed_polls WHERE post_id IN (${posts.map(() => "?").join(",")})`, ...posts.map(row => row.id));
    return new Map(rows.map(row => [row.post_id, this.pollText(row)]));
  }
  poll(actor, postId) {
    const row = this.db.get("SELECT * FROM feed_polls WHERE post_id=?", postId);
    if (!row) return null;
    // Aggregate only: voter identities are never part of a response.
    const votes = this.db.all(`SELECT v.option_id,COUNT(*) AS count FROM feed_poll_votes v JOIN users u ON u.member_number=v.member_number AND u.disabled=0
      WHERE v.post_id=? AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.owner=? AND b.target=v.member_number) OR (b.target=? AND b.owner=v.member_number)) GROUP BY v.option_id`, postId, actor, actor);
    const totalVoters = this.db.get(`SELECT COUNT(DISTINCT v.member_number) AS n FROM feed_poll_votes v JOIN users u ON u.member_number=v.member_number AND u.disabled=0
      WHERE v.post_id=? AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.owner=? AND b.target=v.member_number) OR (b.target=? AND b.owner=v.member_number))`, postId, actor, actor).n;
    return this.pollView(row, votes, totalVoters, this.db.all("SELECT option_id FROM feed_poll_votes WHERE post_id=? AND member_number=? ORDER BY option_id", postId, actor).map(v => v.option_id));
  }
  pollView(row, votes, totalVoters, myVotes) {
    const payload = this.keys.open(row.payload, `feed-poll:${row.post_id}`);
    return { question: payload.question, options: payload.options.map(option => ({ ...option, votes: votes.find(v => v.option_id === option.id)?.count ?? 0 })),
      multiple: !!row.multiple, closesAt: row.closes_at, totalVoters, myVotes, closed: this.now() >= row.closes_at };
  }
  vote(actor, postId, optionIds) {
    return this.db.transaction(() => {
      this.feed.visiblePost(actor, postId);
      const row = this.db.get("SELECT * FROM feed_polls WHERE post_id=?", postId);
      requireThat(row);
      requireThat(this.now() < row.closes_at, 409, "poll_closed");
      const payload = this.keys.open(row.payload, `feed-poll:${postId}`);
      requireThat(new Set(optionIds).size === optionIds.length && optionIds.every(id => payload.options.some(option => option.id === id)) && (row.multiple || optionIds.length <= 1), 400, "invalid_poll_vote");
      this.db.run("DELETE FROM feed_poll_votes WHERE post_id=? AND member_number=?", postId, actor);
      for (const optionId of optionIds) this.db.run("INSERT INTO feed_poll_votes VALUES(?,?,?,?)", postId, actor, optionId, this.now());
      return this.feed.view(actor, this.feed.visiblePost(actor, postId));
    });
  }
  replyContext(actor, parentId) {
    if (!parentId) return null;
    try {
      const parent = this.feed.target(actor, "comment", parentId);
      return { id: parent.id, author: parent.author, profile: this.feed.profileSummary(actor, parent.author), text: this.keys.open(parent.payload, `comment:${parent.id}`) };
    } catch (error) {
      if (error.status === 404 || error.status === 403) return null;
      throw error;
    }
  }
}
