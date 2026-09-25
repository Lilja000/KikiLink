import Fastify, { LogController } from "fastify";
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Auth, apiError } from "./auth.mjs";
import { Social } from "./social.mjs";
import { GroupLive } from "./group-live.mjs";
import { Feed } from "./feed.mjs";
import { Media } from "./media.mjs";
import { communityApi } from "./community-api.mjs";
import { constantEqual } from "./crypto.mjs";
import reportReasons from "../shared/report-reasons.json" with { type: "json" };
import {
  requireThat,
  id,
  member,
  pageId,
  cursor,
  count,
  text,
  profile,
  post,
  message,
  targetType,
} from "./validation.mjs";

const MINUTE = 60000,
  DAY = 86400000;
const paging = z.object({ cursor, limit: count }).strict();
const target = z
  .object({
    targetType,
    targetId: z.string().min(1).max(64),
    reason: text(1000).trim().min(5),
  })
  .strict();
function parseTarget(input, minimumReasonLength = 5) {
  const t = target.extend({ reason: text(1000).trim().min(minimumReasonLength) }).parse(input);
  if (["profile", "post", "comment"].includes(t.targetType))
    pageId.parse(t.targetId);
  else id.parse(t.targetId);
  return t;
}

export function createApp({
  db,
  keys,
  storage,
  config,
  now = Date.now,
  logger = false,
}) {
  const app = Fastify({
    logger,
    logController: new LogController({ disableRequestLogging: true }),
    bodyLimit: 16384,
    requestTimeout: 20000,
    connectionTimeout: 30000,
    keepAliveTimeout: 5000,
    trustProxy: "127.0.0.1",
    genReqId: () => randomUUID(),
    onProtoPoisoning: "error",
    onConstructorPoisoning: "error",
  });
  const auth = new Auth(db, config, now),
    social = new Social(db, keys, config, now),
    feed = new Feed(social),
    media = new Media(social, storage, auth);
  const live = new GroupLive(social);
  const events = new EventEmitter();
  events.setMaxListeners(110);
  const streams = new Map();
  let uploads = 0;
  const changed = (kind, actor, groupId, recipients = []) =>
    events.emit("change", { kind, actor, groupId, recipients });
  const community = communityApi({ app, db, social, auth, changed });
  const refreshFeatured = () => { if (feed.highlights.refresh()) changed("feed"); };
  const featuredTimer = setInterval(() => {
    try { refreshFeatured(); } catch { app.log.error({ event: "featured_refresh_failed" }); }
  }, 60000);
  featuredTimer.unref();
  app.addHook("onClose", async () => { clearInterval(featuredTimer); });
  app.decorateRequest("identity", null);
  app.decorateRequest("uploadSlot", false);
  app.decorateRequest("uploadProcessing", false);
  app.addContentTypeParser(
    ["image/jpeg", "image/png", "image/webp"],
    { parseAs: "buffer", bodyLimit: config.limits.maxImageBytes },
    (_req, body, done) => done(null, body),
  );
  app.addHook("onRequest", async (req, reply) => {
    reply
      .header("X-Content-Type-Options", "nosniff")
      .header("Cache-Control", "no-store")
      .header("Referrer-Policy", "no-referrer")
      .header(
        "Content-Security-Policy",
        "default-src 'none'; frame-ancestors 'none'",
      );
    if (req.url === "/health/live" || req.url === "/health/ready") return;
    const origin = req.headers.origin;
    requireThat(config.allowedOrigins.has(origin), 403, "origin_not_allowed");
    reply
      .header("Access-Control-Allow-Origin", origin)
      .header("Vary", "Origin")
      .header("Access-Control-Expose-Headers", "Retry-After,ETag");
    auth.rate("requests:global", 3000, MINUTE);
    auth.rate(`ip:${auth.ipKey(req.ip)}`, 300, MINUTE);
    if (req.method === "OPTIONS") {
      const requested = (req.headers["access-control-request-headers"] ?? "")
        .toLowerCase()
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      requireThat(
        requested.every((h) => ["authorization", "content-type"].includes(h)),
        403,
        "header_not_allowed",
      );
      requireThat(
        ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(
          req.headers["access-control-request-method"],
        ),
        403,
        "method_not_allowed",
      );
      reply
        .header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE")
        .header("Access-Control-Allow-Headers", "Authorization,Content-Type")
        .header("Access-Control-Max-Age", "600");
      return reply.code(204).send();
    }
    const route = req.routeOptions.url;
    const publicAuth = [
      "/v1/auth/challenges",
      "/v1/auth/exchange",
      "/v1/auth/proof-ready",
      "/v1/auth/device-challenges",
      "/v1/auth/device-exchange",
    ].includes(route);
    if (!publicAuth) {
      req.identity = auth.authenticate(req.headers.authorization, origin);
      if (!config.communityEnabled && (/^\/v1\/(capabilities|relationships|mailbox|direct|read-cursors|preferences|compatibility)(?:\/|$)/u.test(route ?? "") || route === "/v1/feed/unread"))
        requireThat(false, 404, "community_unavailable");
      auth.rate(`read:${req.identity.member}`, 180, MINUTE);
      if (req.method !== "GET") {
        const ephemeral = route === "/v1/conversations/:id/typing";
        auth.rate(`${ephemeral ? "typing" : "write"}:${req.identity.member}`, ephemeral ? 45 : 40, MINUTE);
        if (!["DELETE"].includes(req.method))
          requireThat(
            db.size() < config.limits.maxDatabaseBytes,
            503,
            "database_capacity",
          );
      }
    }
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      if (route === "/v1/media/:kind") {
        requireThat(uploads < 2, 429, "uploads_busy");
        auth.rate(
          `upload-day:${req.identity.member}`,
          config.limits.uploadsPerDay,
          DAY,
        );
        const length = Number(req.headers["content-length"]);
        requireThat(
          Number.isSafeInteger(length) &&
            length > 0 &&
            length <= config.limits.maxImageBytes,
          413,
          "image_size_limit",
        );
        requireThat(
          ["image/jpeg", "image/png", "image/webp"].includes(
            req.headers["content-type"],
          ),
          415,
          "image_type",
        );
        uploads++;
        req.uploadSlot = true;
      } else
        requireThat(
          req.headers["content-type"]?.split(";")[0] === "application/json",
          415,
          "json_required",
        );
    }
  });
  const releaseUpload = (req, force = false) => {
    if (req.uploadSlot && (!req.uploadProcessing || force)) {
      uploads--;
      req.uploadSlot = false;
    }
  };
  app.addHook("onResponse", async (req, reply) => {
    releaseUpload(req);
    if (logger)
      app.log.info(
        {
          requestId: req.id,
          route: req.routeOptions.url ?? "unknown",
          method: req.method,
          status: reply.statusCode,
        },
        "request",
      );
  });
  app.addHook("onRequestAbort", async (req) => releaseUpload(req));
  app.addHook("onTimeout", async (req) => releaseUpload(req));
  app.setErrorHandler((error, req, reply) => {
    releaseUpload(req);
    const out = apiError(error);
    if (out.status === 429) reply.header("Retry-After", String(out.retryAfterSeconds ?? 60));
    if (out.status >= 500)
      app.log.error({ requestId: req.id, code: out.code }, "request failed");
    reply.code(out.status).send({ error: out.code, requestId: req.id });
  });
  app.setNotFoundHandler((_req, reply) =>
    reply.code(404).send({ error: "not_found" }),
  );
  app.options("/*", async () => ({}));
  app.get("/health/live", async () => ({
    status: "ok",
    service: "kikilink-cloud",
    apiVersion: 1,
    mode: config.mode,
  }));
  app.get("/health/ready", async () => {
    requireThat(db.get("SELECT 1 AS ok").ok === 1, 503, "database_unavailable");
    return { status: "ok", schemaVersion: db.migrations().length,
      ...(config.mode === "production" ? { enrollmentReady: auth.enrollment.readyUntil > now() } : {}) };
  });
  app.post("/v1/auth/challenges", async (req, reply) =>
    reply.code(201).send(auth.start(req.body, req.headers.origin)),
  );
  app.post("/v1/auth/exchange", async (req) =>
    auth.exchange(req.body, req.headers.origin),
  );
  app.post("/v1/auth/proof-ready", async (req) =>
    auth.proofReady(req.body, req.headers.origin),
  );
  app.post("/v1/auth/device-challenges", async (req, reply) =>
    reply.code(201).send(auth.devices.start(req.body, req.headers.origin)),
  );
  app.post("/v1/auth/device-exchange", async (req) =>
    auth.devices.exchange(req.body, req.headers.origin),
  );
  app.post("/v1/auth/logout", async (req, reply) => {
    auth.logout(req.identity.tokenHash);
    events.emit("change", { kind: "session" });
    reply.code(204).send();
  });
  app.post("/v1/auth/logout-all", async (req, reply) => {
    auth.logoutAll(req.identity.member);
    events.emit("change", { kind: "session" });
    reply.code(204).send();
  });
  app.get("/v1/me", async (req) => ({
    memberNumber: req.identity.member,
    expiresAt: req.identity.expiresAt,
    moderator: config.moderators.has(req.identity.member),
    apiVersion: 1,
    features: { feedPins: true, feedFeatured: true, reactionDetails: true, preferences: !!config.communityEnabled, community: !!config.communityEnabled, directMessages: !!config.communityEnabled, readCursors: !!config.communityEnabled, messageReceipts: !!config.communityEnabled, reportReasons: true, groupPins: true, groupLive: true, groupInbox: true, groupAvatar: true, fullProfile: true, profileGradientAngle: true, feedSearch: true, messageChanges: true, reactions: ["heart", "like", "laugh", "support", "dislike", "wow", "sad"] },
  }));
  app.get("/v1/privacy", async () => ({
    version: 1,
    scope: config.mode === "production" ? "verified KikiLink members" : "development testers only",
    data: [
      "verified BC Member Number",
      "opt-in profile and profile images",
      "feed posts, images, comments and reactions",
      "groups, accepted membership and encrypted messages",
      "blocks and encrypted reports",
      "opt-in friend requests, mailbox and encrypted offline Direct messages",
      "private encrypted interest preferences (separate explicit consent)",
    ],
    messageProtection:
      "TLS and server encryption at rest; not end-to-end encryption",
    retention: {
      messagesDays: 30,
      directMessagePayloadDays: 30,
      directDeduplicationMetadataDays: 60,
      mailboxDays: 30,
      presenceSeconds: 180,
      abandonedMediaHours: 24,
      reportsDays: 30,
      operationalLogsDays: 7,
      backupsDays: 14,
    },
    excluded: [
      "BC passwords",
      "room/movement history",
      "native chat history",
      "Gallery and Music binaries",
    ],
    catbox: "Existing Music, chat attachments and Gallery stay on Catbox",
  }));

  app.get("/v1/profiles/:member", async (req) =>
    social.profileOrDefault(req.identity.member, pageId.parse(req.params.member)),
  );
  app.put("/v1/profiles/me", async (req) =>
    social.putProfile(req.identity.member, profile.parse(req.body)),
  );
  app.delete("/v1/profiles/me", async (req, reply) => {
    social.removeProfile(req.identity.member);
    reply.code(204).send();
  });
  app.get("/v1/blocks", async (req) => ({
    items: db.all(
      "SELECT target AS memberNumber FROM blocks WHERE owner=? LIMIT 1000",
      req.identity.member,
    ),
  }));
  app.put("/v1/blocks/:member", async (req, reply) => {
    requireThat(
      db.get(
        "SELECT COUNT(*) AS n FROM blocks WHERE owner=?",
        req.identity.member,
      ).n < 1000,
      409,
      "block_quota",
    );
    social.block(req.identity.member, pageId.parse(req.params.member), true);
    community.relationships.revoke(req.identity.member, pageId.parse(req.params.member));
    reply.code(204).send();
  });
  app.delete("/v1/blocks/:member", async (req, reply) => {
    social.block(req.identity.member, pageId.parse(req.params.member), false);
    reply.code(204).send();
  });

  app.get("/v1/groups", async (req) => ({
    items: social.listGroups(req.identity.member),
  }));
  app.get("/v1/group-invitations", async (req) => ({
    items: social.invitations(req.identity.member),
  }));
  app.post("/v1/groups", async (req, reply) => {
    const data = z
      .object({
        title: text(60).trim().min(1),
        members: z.array(member).min(2).max(4),
        legacyId: z
          .string()
          .regex(/^group2_[1-9][0-9]*_[a-z0-9_-]{8,31}$/)
          .optional(),
      })
      .strict()
      .parse(req.body);
    // The legacy ID is a migration label, never proof of historical membership.
    if (data.legacyId)
      requireThat(
        data.legacyId.startsWith(`group2_${req.identity.member}_`),
        403,
        "legacy_owner_required",
      );
    auth.rate(`groups:${req.identity.member}`, 10, DAY);
    const group = social.createGroup(req.identity.member, data);
    changed("groups", req.identity.member, group.id);
    community.mailbox.invitations(group.id, req.identity.member);
    return reply.code(201).send(group);
  });
  app.get("/v1/groups/:id", async (req) =>
    social.group(req.identity.member, id.parse(req.params.id)),
  );
  app.put("/v1/groups/:id/pin", async (req) => {
    const groupId = id.parse(req.params.id);
    const input = z.object({ messageId: id.nullable(), revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER) }).strict().parse(req.body);
    auth.rate(`group-pin:${req.identity.member}`, 30, MINUTE);
    const result = social.pinMessage(req.identity.member, groupId, input);
    changed("messages", req.identity.member, groupId);
    return result;
  });
  app.patch("/v1/groups/:id", async (req) => {
    const g = social.changeGroup(
      req.identity.member,
      id.parse(req.params.id),
      z
        .object({
          title: text(60).trim().min(1),
          avatarId: id.nullable().optional(),
          revision: z.number().int().positive(),
        })
        .strict()
        .parse(req.body),
    );
    changed("groups", req.identity.member, g.id);
    return g;
  });
  app.post("/v1/groups/:id/invitations", async (req, reply) => {
    const data = z.union([z.object({ memberNumber: member }).strict(), z.object({ members: z.array(member).min(1).max(4) }).strict()]).parse(req.body);
    const g = id.parse(req.params.id);
    const targets = "members" in data ? [...new Set(data.members)] : [data.memberNumber];
    // A timeout retry skips invitations already saved by this same operation.
    social.membership(req.identity.member, g, ["owner", "admin"]);
    social.inviteMany(req.identity.member, g, targets.filter(target => !db.get("SELECT 1 FROM group_members WHERE group_id=? AND member_number=? AND status<>'removed'", g, target)));
    changed("groups", req.identity.member, g);
    community.mailbox.invitations(g, req.identity.member);
    reply.code(204).send();
  });
  app.post("/v1/groups/:id/accept", async (req) => {
    const group = social.accept(req.identity.member, id.parse(req.params.id));
    changed("groups", req.identity.member, group.id);
    return group;
  });
  app.delete("/v1/groups/:id/invitation", async (req, reply) => {
    db.run(
      "UPDATE group_members SET status='removed' WHERE group_id=? AND member_number=? AND status='invited'",
      id.parse(req.params.id),
      req.identity.member,
    );
    changed("mailbox", req.identity.member, undefined, [req.identity.member]);
    reply.code(204).send();
  });
  app.delete("/v1/groups/:id/members/:member", async (req, reply) => {
    const g = id.parse(req.params.id);
    const targetMember = pageId.parse(req.params.member);
    social.removeMember(req.identity.member, g, targetMember);
    changed("groups", req.identity.member, g, [targetMember]);
    reply.code(204).send();
  });
  app.put("/v1/groups/:id/members/:member/role", async (req, reply) => {
    const g = id.parse(req.params.id),
      data = z
        .object({ role: z.enum(["owner", "admin", "member"]) })
        .strict()
        .parse(req.body);
    social.role(
      req.identity.member,
      g,
      pageId.parse(req.params.member),
      data.role,
    );
    changed("groups", req.identity.member, g);
    reply.code(204).send();
  });
  app.delete("/v1/groups/:id", async (req, reply) => {
    const g = id.parse(req.params.id);
    const recipients = db
      .all(
        "SELECT member_number FROM group_members WHERE group_id=? AND status IN ('active','invited')",
        g,
      )
      .map((row) => row.member_number);
    social.deleteGroup(req.identity.member, g);
    changed("groups", req.identity.member, g, recipients);
    reply.code(204).send();
  });
  app.get("/v1/conversations/:id/messages", async (req) => {
    const p = paging
      .extend({ direction: z.enum(["forward", "backward"]).default("forward"), knownFrom: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0) })
      .parse(req.query);
    return social.messages(
      req.identity.member,
      id.parse(req.params.id),
      p.cursor,
      p.limit,
      p.direction,
      p.knownFrom,
    );
  });
  app.post("/v1/conversations/:id/messages", async (req, reply) => {
    auth.rate(`messages:${req.identity.member}`, 30, MINUTE);
    const c = id.parse(req.params.id);
    const result = social.send(req.identity.member, c, message.parse(req.body));
    changed(
      "messages",
      req.identity.member,
      social.conversation(req.identity.member, c).group_id,
    );
    return reply.code(201).send(result);
  });
  app.put("/v1/conversations/:id/receipts", async req => {
    const conversationId = id.parse(req.params.id);
    const input = z.object({
      deliveredIds: z.array(id).max(40),
      readIds: z.array(id).max(40),
    }).strict().refine(value => value.deliveredIds.length + value.readIds.length > 0, "empty_receipts").parse(req.body);
    auth.rate(`message-receipts:${req.identity.member}`, 240, MINUTE);
    const result = social.acknowledgeMessages(req.identity.member, conversationId, input.deliveredIds, input.readIds);
    changed("receipts", req.identity.member, social.conversation(req.identity.member, conversationId).group_id, result.senders);
    return { acknowledged: result.acknowledged };
  });
  app.post("/v1/conversations/:id/receipts/query", async req => {
    const conversationId = id.parse(req.params.id);
    const input = z.object({ ids: z.array(id).min(1).max(200) }).strict().parse(req.body);
    return social.receiptStates(req.identity.member, conversationId, input.ids);
  });
  app.get("/v1/conversations/:id/messages/:messageId", async req =>
    social.message(req.identity.member, id.parse(req.params.id), id.parse(req.params.messageId)));
  app.delete(
    "/v1/conversations/:id/messages/:messageId",
    async (req, reply) => {
      const c = id.parse(req.params.id);
      social.deleteMessage(
        req.identity.member,
        c,
        id.parse(req.params.messageId),
      );
      changed(
        "messages",
        req.identity.member,
        social.conversation(req.identity.member, c).group_id,
      );
      reply.code(204).send();
    },
  );

  app.post(
    "/v1/media/:kind",
    { bodyLimit: config.limits.maxImageBytes },
    async (req, reply) => {
      req.uploadProcessing = true;
      try {
        const kind = z
          .enum(["avatar", "banner", "feed"])
          .parse(req.params.kind);
        const result = await media.upload(
          req.identity.member,
          kind,
          req.body,
          req.headers["content-type"],
        );
        return reply.code(201).send(result);
      } finally {
        releaseUpload(req, true);
      }
    },
  );
  app.get("/v1/media/:id", async (req, reply) =>
    reply
      .type("image/webp")
      .header("Content-Disposition", 'inline; filename="image.webp"')
      .send(await media.read(req.identity.member, id.parse(req.params.id))),
  );
  app.delete("/v1/media/:id", async (req, reply) => {
    await media.remove(req.identity.member, id.parse(req.params.id));
    reply.code(204).send();
  });

  app.get("/v1/feed", async (req) => {
    const p = paging.extend({ q: text(100).trim().default("") }).parse(req.query);
    refreshFeatured();
    return feed.list(req.identity.member, p.cursor, p.limit, p.q);
  });
  app.put("/v1/feed/:id/pin", async req => {
    auth.moderator(req.identity.member);
    const data = z.object({ pinned: z.boolean() }).strict().parse(req.body);
    const result = feed.highlights.pin(req.identity.member, pageId.parse(req.params.id), data.pinned);
    changed("feed");
    return result;
  });
  app.post("/v1/feed", async (req, reply) => {
    auth.rate(`posts:${req.identity.member}`, 20, DAY);
    const result = feed.create(req.identity.member, post.parse(req.body));
    changed("feed", req.identity.member);
    return reply.code(201).send(result);
  });
  app.get("/v1/feed/:id", async (req) =>
    feed.view(
      req.identity.member,
      feed.visiblePost(req.identity.member, pageId.parse(req.params.id)),
    ),
  );
  app.patch("/v1/feed/:id", async (req) => {
    const data = post
      .safeExtend({ revision: z.number().int().positive() })
      .parse(req.body);
    const result = feed.edit(
      req.identity.member,
      pageId.parse(req.params.id),
      data,
    );
    changed("feed", req.identity.member);
    return result;
  });
  app.delete("/v1/feed/:id", async (req, reply) => {
    feed.removePost(req.identity.member, pageId.parse(req.params.id));
    changed("feed", req.identity.member);
    reply.code(204).send();
  });
  app.get("/v1/feed/:id/comments", async (req) => {
    const p = paging.parse(req.query);
    return feed.comments(
      req.identity.member,
      pageId.parse(req.params.id),
      p.cursor,
      p.limit,
    );
  });
  app.post("/v1/feed/:id/comments", async (req, reply) => {
    const data = z
      .object({ text: text(1000).trim().min(1) })
      .strict()
      .parse(req.body);
    auth.rate(`comments:${req.identity.member}`, 60, DAY);
    const result = feed.comment(
      req.identity.member,
      pageId.parse(req.params.id),
      data.text,
    );
    changed("feed", req.identity.member);
    community.mailbox.comment(req.identity.member, pageId.parse(req.params.id), result.id);
    return reply.code(201).send(result);
  });
  app.get("/v1/comments/:id", async req => feed.commentView(req.identity.member, feed.target(req.identity.member, "comment", pageId.parse(req.params.id))));
  app.patch("/v1/comments/:id", async (req) => {
    const data = z
      .object({
        text: text(1000).trim().min(1),
        revision: z.number().int().positive(),
      })
      .strict()
      .parse(req.body);
    return feed.editComment(
      req.identity.member,
      pageId.parse(req.params.id),
      data.text,
      data.revision,
    );
  });
  app.delete("/v1/comments/:id", async (req, reply) => {
    feed.removeComment(req.identity.member, pageId.parse(req.params.id));
    changed("feed", req.identity.member);
    reply.code(204).send();
  });
  app.get("/v1/reactions/:type/:id", async req => {
    const p = paging.parse(req.query);
    return feed.reactionList(req.identity.member, z.enum(["post", "comment"]).parse(req.params.type), pageId.parse(req.params.id), p.cursor, p.limit);
  });
  app.put("/v1/reactions/:type/:id", async (req) => {
    const data = z
      .object({
        reaction: z.enum(["heart", "like", "laugh", "support", "dislike", "wow", "sad"]).nullable(),
      })
      .strict()
      .parse(req.body);
    const previous = db.get("SELECT reaction FROM reactions WHERE target_type=? AND target_id=? AND member_number=?", req.params.type, Number(req.params.id), req.identity.member)?.reaction ?? null;
    const result = feed.react(
      req.identity.member,
      z.enum(["post", "comment"]).parse(req.params.type),
      pageId.parse(req.params.id),
      data.reaction,
    );
    changed("feed", req.identity.member);
    if (previous !== data.reaction) community.mailbox.reaction(req.identity.member, req.params.type, Number(req.params.id), data.reaction);
    return result;
  });
  app.post("/v1/reports", async (req, reply) => {
    auth.rate(`reports:${req.identity.member}`, 10, DAY);
    const data = target.extend({ reason: text(1000).trim().min(1), reasonCode: z.enum(reportReasons.map(r => r.id)).optional(), clientId: id.optional() }).strict().parse(req.body);
    const t = parseTarget({ targetType: data.targetType, targetId: data.targetId, reason: data.reason }, data.reasonCode ? 1 : 5);
    requireThat(data.reasonCode !== "other" || data.reason.replace(/^Other(?::\s*)?/u, "").trim().length >= 5, 400, "explanation_required");
    const result = feed.report(req.identity.member, t.targetType, t.targetId, data.reason, data.reasonCode, data.clientId);
    changed("reports", req.identity.member);
    community.mailbox.report(result.id, req.identity.member);
    return reply.code(201).send(result);
  });
  app.get("/v1/moderation/reports", async (req) => {
    auth.moderator(req.identity.member);
    const p = paging.parse(req.query);
    return feed.reportList(p.cursor, p.limit);
  });
  app.post("/v1/moderation/remove", async (req, reply) => {
    auth.moderator(req.identity.member);
    const t = parseTarget(req.body);
    feed.moderate(req.identity.member, t.targetType, t.targetId, t.reason);
    changed("reports", req.identity.member);
    changed("feed", req.identity.member);
    changed("groups", req.identity.member);
    reply.code(204).send();
  });
  app.get("/v1/moderation/reports/:id", async (req) => {
    auth.moderator(req.identity.member);
    return feed.reportDetail(pageId.parse(req.params.id));
  });
  app.get("/v1/moderation/reports/:id/media/:assetId", async (req, reply) => {
    auth.moderator(req.identity.member);
    const reportId = pageId.parse(req.params.id),
      assetId = id.parse(req.params.assetId);
    const authorize = () => {
      const report = feed.reportDetail(reportId);
      requireThat(report.mediaIds.includes(assetId));
      return report.author;
    };
    const bytes = await media.read(authorize(), assetId);
    authorize();
    return reply
      .type("image/webp")
      .header("Content-Disposition", 'inline; filename="reported-image.webp"')
      .send(bytes);
  });
  app.post("/v1/moderation/reports/:id/dismiss", async (req, reply) => {
    auth.moderator(req.identity.member);
    db.run(
      "UPDATE reports SET status='dismissed',resolved_at=? WHERE id=?",
      now(),
      pageId.parse(req.params.id),
    );
    changed("reports", req.identity.member);
    reply.code(204).send();
  });
  app.post("/v1/moderation/users/:member/suspend", async (req, reply) => {
    auth.moderator(req.identity.member);
    const memberNumber = pageId.parse(req.params.member);
    requireThat(
      !config.moderators.has(memberNumber),
      403,
      "protected_moderator",
    );
    social.user(memberNumber);
    const data = z
      .object({ reason: text(1000).trim().min(5) })
      .strict()
      .parse(req.body);
    db.transaction(() => {
      db.run("UPDATE users SET disabled=1 WHERE member_number=?", memberNumber);
      db.run("DELETE FROM auth_devices WHERE member_number=?", memberNumber);
      db.run("DELETE FROM sessions WHERE member_number=?", memberNumber);
      db.run("DELETE FROM presence WHERE member_number=?", memberNumber);
      db.run(
        "INSERT INTO moderation_actions(moderator,action,target_type,target_id,reason,created_at) VALUES(?,?,?,?,?,?)",
        req.identity.member,
        "suspend",
        "profile",
        String(memberNumber),
        keys.seal(data.reason, `moderation:profile:${memberNumber}`),
        now(),
      );
    });
    events.emit("change", { kind: "session" });
    reply.code(204).send();
  });

  app.put("/v1/presence", async (req, reply) => {
    const data = z
      .object({ status: z.enum(["online", "idle", "dnd", "offline"]) })
      .strict()
      .parse(req.body);
    if (data.status === "offline")
      db.run("DELETE FROM presence WHERE member_number=?", req.identity.member);
    else
      db.run(
        "INSERT INTO presence VALUES(?,?,?) ON CONFLICT(member_number) DO UPDATE SET status=excluded.status,expires_at=excluded.expires_at",
        req.identity.member,
        data.status,
        now() + 180000,
      );
    reply.code(204).send();
  });
  app.get("/v1/presence/:member", async (req) => {
    const target = pageId.parse(req.params.member);
    social.visibleActor(req.identity.member, target);
    if (target !== req.identity.member)
      requireThat(
        db.get(
          `SELECT 1 FROM group_members a JOIN group_members b ON a.group_id=b.group_id WHERE a.member_number=? AND b.member_number=? AND a.status='active' AND b.status='active'`,
          req.identity.member,
          target,
        ),
      );
    const state = db.get(
      "SELECT status FROM presence WHERE member_number=? AND expires_at>?",
      target,
      now(),
    );
    return { status: state?.status ?? "unavailable" };
  });
  app.put("/v1/conversations/:id/typing", async (req, reply) => {
    const conversationId = id.parse(req.params.id);
    const data = z.object({ typing: z.boolean() }).strict().parse(req.body);
    const groupId = live.typing(req.identity, conversationId, data.typing);
    changed("typing", req.identity.member, groupId);
    reply.code(204).send();
  });
  app.get("/v1/groups/:id/live", async (req) => live.group(req.identity.member, id.parse(req.params.id)));
  app.get("/v1/events", async (req, reply) => {
    const actor = req.identity.member;
    requireThat(
      (streams.get(actor)?.size ?? 0) < 2 &&
        [...streams.values()].reduce((n, s) => n + s.size, 0) < 100,
      429,
      "stream_limit",
    );
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": req.headers.origin,
      Vary: "Origin",
      "X-Content-Type-Options": "nosniff",
    });
    const close = () => {
      clearInterval(heartbeat);
      clearTimeout(expiry);
      events.off("change", listener);
      streams.get(actor)?.delete(close);
      if (!streams.get(actor)?.size) streams.delete(actor);
      res.end();
    };
    const send = (kind) => {
      if (res.writableLength > 65536) {
        close();
        return;
      }
      res.write(`event: ${kind}\ndata: {}\n\n`);
    };
    const listener = (event) => {
      try {
        auth.authenticate(req.headers.authorization, req.headers.origin);
      } catch {
        close();
        return;
      }
      if (event.kind === "session") return;
      if (["relationships", "mailbox", "direct", "read", "feed-read", "preferences"].includes(event.kind) && event.recipients?.includes(actor)) send(event.kind);
      if (event.kind === "reports" && config.moderators.has(actor)) send("reports");
      if (event.kind === "typing" && !social.blocked(actor, event.actor) &&
        db.get("SELECT 1 FROM group_members WHERE group_id=? AND member_number=? AND status='active'", event.groupId, actor)) send("typing");
      if (
        event.kind === "feed" &&
        (!event.actor || !social.blocked(actor, event.actor))
      )
        send("feed");
      // Only invalidation hints, never content, keys, presence or message bodies.
      if (
        ["groups", "messages", "receipts"].includes(event.kind) &&
        (event.kind === "receipts"
          ? event.recipients?.includes(actor)
          : !event.groupId ||
            event.recipients?.includes(actor) ||
            db.get(
              "SELECT 1 FROM group_members WHERE group_id=? AND member_number=? AND (status='active' OR (?='groups' AND status='invited'))",
              event.groupId,
              actor,
              event.kind,
            ))
      )
        send(event.kind === "receipts" ? "receipts" : "groups");
    };
    const heartbeat = setInterval(() => {
      try {
        auth.authenticate(req.headers.authorization, req.headers.origin);
        res.write(": keepalive\n\n");
      } catch {
        close();
      }
    }, 25000);
    heartbeat.unref();
    const expiry = setTimeout(
      close,
      Math.max(1, req.identity.expiresAt - now()),
    );
    expiry.unref();
    if (!streams.has(actor)) streams.set(actor, new Set());
    streams.get(actor).add(close);
    events.on("change", listener);
    res.on("close", close);
    send("ready");
  });
  app.addHook("preClose", async () => {
    for (const group of streams.values())
      for (const close of [...group]) close();
  });
  async function cleanup() {
    auth.cleanup();
    community.direct.cleanup();
    db.run("DELETE FROM mailbox WHERE created_at<?", now() - 30 * DAY);
    db.run("DELETE FROM messages WHERE created_at<?", now() - 30 * DAY);
    db.run(
      "UPDATE group_members SET status='removed' WHERE status='invited' AND invited_at<?",
      now() - 7 * DAY,
    );
    db.run("DELETE FROM reports WHERE created_at<?", now() - 30 * DAY);
    db.run(
      "DELETE FROM moderation_actions WHERE created_at<?",
      now() - 30 * DAY,
    );
    db.run("DELETE FROM posts WHERE deleted_at<?", now() - DAY);
    db.run("DELETE FROM comments WHERE deleted_at<?", now() - DAY);
    db.run(
      `DELETE FROM conversation_keys WHERE version<>(SELECT key_version FROM conversations WHERE id=conversation_id) AND NOT EXISTS(SELECT 1 FROM messages WHERE messages.conversation_id=conversation_keys.conversation_id AND messages.key_version=conversation_keys.version)`,
    );
    return media.cleanup();
  }
  return { app, auth, social, feed, media, ...community, cleanup, events };
}

export function createVerifier({ auth, config }) {
  const app = Fastify({
    logger: false,
    bodyLimit: 4096,
    requestTimeout: 5000,
    connectionTimeout: 10000,
  });
  app.addHook("onRequest", async (req) => {
    requireThat(
      !req.headers.origin && req.ip === "127.0.0.1",
      403,
      "private_listener",
    );
    requireThat(
      constantEqual(
        req.headers.authorization,
        `Bearer ${config.verifierSecret}`,
      ),
      403,
      "verifier_required",
    );
    auth.rate(req.url === "/verify" ? "verifier-ingress" : "verifier-enrollment", 120, MINUTE);
  });
  app.setErrorHandler((e, _r, reply) => {
    const err = apiError(e);
    reply.code(err.status).send({ error: err.code });
  });
  app.post("/verify", async (req) => auth.verify(req.body));
  app.get("/enrollment", async () => auth.enrollment.pending());
  app.post("/enrollment", async (req) => auth.enrollment.prepared(req.body));
  return app;
}
