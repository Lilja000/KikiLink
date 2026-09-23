import { z } from "zod";
import { preferencesApi } from "./preferences.mjs";
import { Mailbox } from "./mailbox.mjs";
import { Relationships } from "./relationships.mjs";
import { DirectMessages } from "./direct-messages.mjs";
import { cursor, count, id, member, pageId, text, requireThat } from "./validation.mjs";

/** Additive, account-authenticated routes on the existing Cloud application. */
export function communityApi({ app, db, social, auth, changed }) {
  const mailbox = new Mailbox(social, changed);
  const relationships = new Relationships(social, mailbox, changed);
  const direct = new DirectMessages(social, relationships, changed);
  preferencesApi({ app, social, auth, relationships, changed });
  const paging = z.object({ cursor, limit: count }).strict();
  app.get("/v1/capabilities/me", async req => ({ directMessages: !!db.get("SELECT direct_messages FROM social_capabilities WHERE member_number=?", req.identity.member)?.direct_messages }));
  app.put("/v1/capabilities/me", async req => {
    const input = z.object({ friendRequests: z.boolean(), directMessages: z.boolean() }).strict().parse(req.body);
    db.run(`INSERT INTO social_capabilities VALUES(?,?,?,?) ON CONFLICT(member_number) DO UPDATE SET
      friend_requests=excluded.friend_requests,direct_messages=excluded.direct_messages,updated_at=excluded.updated_at`,
      req.identity.member, Number(input.friendRequests), Number(input.directMessages), social.now());
    changed("relationships", req.identity.member, undefined, [req.identity.member]);
    return input;
  });
  // Only an explicit bounded set of already-known contacts; there is no directory/search endpoint.
  app.post("/v1/relationships/known", async req => {
    const peers = z.object({ members: z.array(member).max(100) }).strict().parse(req.body).members;
    auth.rate(`known:${req.identity.member}`, 12, 60_000);
    return { items: [...new Set(peers)].filter(peer => peer !== req.identity.member && !social.blocked(req.identity.member, peer))
      .filter(peer => db.get("SELECT 1 FROM users WHERE member_number=? AND disabled=0", peer))
      .map(peer => relationships.view(req.identity.member, peer)) };
  });
  app.get("/v1/relationships", async req => {
    const p = paging.parse(req.query); return relationships.list(req.identity.member, p.cursor, p.limit);
  });
  app.get("/v1/relationships/:member", async req => relationships.view(req.identity.member, pageId.parse(req.params.member)));
  app.post("/v1/relationships/confirm", async req => {
    const peers = z.object({ members: z.array(member).max(100) }).strict().parse(req.body).members;
    return relationships.confirm(req.identity.member, [...new Set(peers)]);
  });
  app.post("/v1/relationships/:member/request", async req => {
    z.object({}).strict().parse(req.body);
    auth.rate(`friend-requests:${req.identity.member}`, 30, 86_400_000);
    return relationships.send(req.identity.member, pageId.parse(req.params.member));
  });
  app.post("/v1/relationships/:member/:action", async req => {
    z.object({}).strict().parse(req.body);
    return relationships.action(req.identity.member, pageId.parse(req.params.member), z.enum(["accept", "decline", "cancel"]).parse(req.params.action));
  });
  app.delete("/v1/relationships/:member", async (req, reply) => {
    relationships.revoke(req.identity.member, pageId.parse(req.params.member)); reply.code(204).send();
  });
  app.get("/v1/mailbox", async req => {
    const p = paging.parse(req.query); return mailbox.list(req.identity.member, p.cursor, p.limit);
  });
  app.post("/v1/mailbox/read", async (req, reply) => {
    const input = z.object({ id: member.optional() }).strict().parse(req.body);
    mailbox.read(req.identity.member, input.id); reply.code(204).send();
  });
  app.post("/v1/direct/:member/messages", async (req, reply) => {
    const input = z.object({ clientMessageId: id, text: text(4000).trim().min(1), createdAt: z.number().int().positive(), roomName: text(100).optional() }).strict().parse(req.body);
    return reply.code(201).send(direct.send(req.identity.member, pageId.parse(req.params.member), input));
  });
  app.get("/v1/direct/inbox", async req => {
    const p = paging.parse(req.query); return direct.inbox(req.identity.member, p.cursor, p.limit);
  });
  app.get("/v1/direct/receipts", async req => {
    const p = paging.parse(req.query); return direct.receipts(req.identity.member, p.cursor, p.limit);
  });
  app.post("/v1/direct/acknowledge", async req => {
    const input = z.object({ ids: z.array(id).min(1).max(40) }).strict().parse(req.body);
    return direct.acknowledge(req.identity.member, [...new Set(input.ids)]);
  });
  const visiblePosts = `FROM posts p JOIN users u ON u.member_number=p.author WHERE p.deleted_at IS NULL AND u.disabled=0
    AND NOT EXISTS(SELECT 1 FROM blocks WHERE (owner=? AND target=p.author) OR (target=? AND owner=p.author))`;
  app.get("/v1/feed/unread", async req => {
    const actor = req.identity.member;
    const latest = db.get(`SELECT COALESCE(MAX(p.id),0) AS n ${visiblePosts}`, actor, actor).n;
    // First use establishes a baseline, without treating the entire old Feed as unread.
    db.run("INSERT OR IGNORE INTO social_cursors VALUES(?,'feed',?,?)", actor, latest, social.now());
    const read = db.get("SELECT cursor FROM social_cursors WHERE owner=? AND scope='feed'", actor).cursor;
    return { cursor: read, latest, unread: db.get(`SELECT COUNT(*) AS n ${visiblePosts} AND p.author<>? AND p.id>?`, actor, actor, actor, read).n };
  });
  const cursorInput = z.object({ scope: z.string().max(80), cursor }).strict();
  const writeCursor = (actor, scope, value) => {
    let directSender;
    if (scope === "feed") {
      if (value) social.visibleActor(actor, db.get("SELECT author FROM posts WHERE id=? AND deleted_at IS NULL", value)?.author ?? 0);
    } else if (scope.startsWith("group:")) {
      const group = social.membership(actor, id.parse(scope.slice(6)));
      requireThat(value < group.next_sequence, 400, "invalid_read_cursor");
    } else if (scope.startsWith("direct:")) {
      const peer = pageId.parse(scope.slice(7));
      requireThat(value === 0 || db.get("SELECT 1 FROM direct_messages WHERE sequence=? AND sender=? AND recipient=?", value, peer, actor), 400, "invalid_read_cursor");
      directSender = peer;
    } else requireThat(false, 400, "invalid_read_scope");
    const old = db.get("SELECT cursor FROM social_cursors WHERE owner=? AND scope=?", actor, scope)?.cursor ?? 0;
    if (value <= old) return { cursor: old, changed: false };
    db.run(`INSERT INTO social_cursors VALUES(?,?,?,?) ON CONFLICT(owner,scope) DO UPDATE SET cursor=MAX(cursor,excluded.cursor),updated_at=excluded.updated_at`, actor, scope, value, social.now());
    return { cursor: value, changed: true, directSender: directSender !== undefined && direct.recordRead(actor, directSender, value) ? directSender : undefined };
  };
  app.put("/v1/read-cursors/:scope", async req => {
    const actor = req.identity.member, input = cursorInput.parse({ scope: req.params.scope, ...z.object({ cursor }).strict().parse(req.body) });
    const result = writeCursor(actor, input.scope, input.cursor);
    if (result.changed) changed(input.scope === "feed" ? "feed-read" : "read", actor, undefined, [actor]);
    if (result.directSender !== undefined) changed("direct", actor, undefined, [actor, result.directSender]);
    return { cursor: result.cursor };
  });
  app.put("/v1/read-cursors", async req => {
    const actor = req.identity.member, input = z.object({ items: z.array(cursorInput).min(1).max(100) }).strict().parse(req.body);
    const rows = db.transaction(() => input.items.map(item => ({ scope: item.scope, ...writeCursor(actor, item.scope, item.cursor) })));
    if (rows.some(row => row.changed && row.scope === "feed")) changed("feed-read", actor, undefined, [actor]);
    if (rows.some(row => row.changed && row.scope !== "feed")) changed("read", actor, undefined, [actor]);
    const directSenders = [...new Set(rows.flatMap(row => row.directSender === undefined ? [] : [row.directSender]))];
    if (directSenders.length) changed("direct", actor, undefined, [actor, ...directSenders]);
    return { items: rows.map(({ scope, cursor }) => ({ scope, cursor })) };
  });
  app.get("/v1/read-cursors", async req => ({ items: db.all("SELECT scope,cursor FROM social_cursors WHERE owner=? LIMIT 500", req.identity.member) }));
  return { mailbox, relationships, direct };
}
