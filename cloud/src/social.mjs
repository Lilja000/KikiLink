import { randomUUID, randomBytes } from "node:crypto";
import { encrypt, decrypt } from "./crypto.mjs";
import { requireThat } from "./validation.mjs";

export class Social {
  constructor(db, keys, config, now = Date.now) {
    Object.assign(this, { db, keys, config, now });
  }
  blocked(a, b) {
    return !!this.db.get(
      "SELECT 1 FROM blocks WHERE (owner=? AND target=?) OR (owner=? AND target=?)",
      a,
      b,
      b,
      a,
    );
  }
  user(number) {
    requireThat(
      this.db.get(
        "SELECT 1 FROM users WHERE member_number=? AND disabled=0",
        number,
      ),
    );
  }
  visibleActor(viewer, author) {
    this.user(author);
    requireThat(!this.blocked(viewer, author));
  }
  profile(viewer, number) {
    this.visibleActor(viewer, number);
    const p = this.db.get(
      "SELECT * FROM profiles WHERE member_number=?",
      number,
    );
    requireThat(p && (p.visible || viewer === number));
    const media = this.db.all(
      "SELECT slot,asset_id FROM profile_media WHERE member_number=?",
      number,
    );
    return {
      ...this.keys.open(p.payload, `profile:${number}`),
      memberNumber: number,
      revision: p.revision,
      visible: !!p.visible,
      updatedAt: p.updated_at,
      avatarId: media.find((x) => x.slot === "avatar")?.asset_id ?? null,
      bannerId: media.find((x) => x.slot === "banner")?.asset_id ?? null,
    };
  }
  profileOrDefault(viewer, number) {
    const user = this.db.get("SELECT disabled FROM users WHERE member_number=?", number);
    const p = this.db.get("SELECT visible FROM profiles WHERE member_number=?", number);
    requireThat(!this.blocked(viewer, number) && !user?.disabled && (!p || p.visible || viewer === number));
    if (user && !user.disabled && !this.blocked(viewer, number) && p && (p.visible || viewer === number)) return this.profile(viewer, number);
    return {
      memberNumber: number, displayName: `Member ${number}`, bio: "", statusMessage: "",
      avatarFrame: "none", profileStyle: "classic", avatarId: null, bannerId: null,
      revision: 0, visible: false, updatedAt: 0, isDefault: true,
      ...(viewer === number ? { autoPublishAllowed: !this.db.get("SELECT 1 FROM profile_preferences WHERE member_number=? AND automatic_disabled=1", number) } : {}),
    };
  }
  assetFor(owner, assetId, kind) {
    const a = this.db.get("SELECT * FROM storage_assets WHERE id=?", assetId);
    requireThat(
      a && a.owner === owner && a.kind === kind && a.state === "ready",
      400,
      "invalid_media",
    );
    return a;
  }
  putProfile(actor, input) {
    return this.db.transaction(() => {
      const old = this.db.get(
        "SELECT revision FROM profiles WHERE member_number=?",
        actor,
      );
      requireThat(
        (old?.revision ?? 0) === input.revision,
        409,
        "revision_conflict",
      );
      const { revision, visible, avatarId, bannerId, ...payload } = input;
      this.db.run("DELETE FROM profile_preferences WHERE member_number=?", actor);
      // Older clients do not know custom status. Preserve it on their updates.
      if (payload.statusMessage === undefined && old) {
        const saved = this.db.get("SELECT payload FROM profiles WHERE member_number=?", actor);
        payload.statusMessage = this.keys.open(saved.payload, `profile:${actor}`).statusMessage ?? "";
      }
      for (const [slot, asset] of [
        ["avatar", avatarId],
        ["banner", bannerId],
      ])
        if (asset) this.assetFor(actor, asset, slot);
      this.db.run(
        `INSERT INTO profiles VALUES(?,?,?,?,?) ON CONFLICT(member_number) DO UPDATE SET payload=excluded.payload,revision=excluded.revision,visible=excluded.visible,updated_at=excluded.updated_at`,
        actor,
        this.keys.seal(payload, `profile:${actor}`),
        revision + 1,
        Number(visible),
        this.now(),
      );
      this.db.run("DELETE FROM profile_media WHERE member_number=?", actor);
      for (const [slot, asset] of [
        ["avatar", avatarId],
        ["banner", bannerId],
      ])
        if (asset)
          this.db.run(
            "INSERT INTO profile_media VALUES(?,?,?)",
            actor,
            slot,
            asset,
          );
      return this.profile(actor, actor);
    });
  }
  removeProfile(actor) {
    this.db.transaction(() => {
      this.db.run("DELETE FROM profiles WHERE member_number=?", actor);
      this.db.run("INSERT INTO profile_preferences VALUES(?,1) ON CONFLICT(member_number) DO UPDATE SET automatic_disabled=1", actor);
      this.db.run("DELETE FROM presence WHERE member_number=?", actor);
    });
  }
  block(actor, target, enabled) {
    this.user(target);
    requireThat(actor !== target, 400, "cannot_block_self");
    if (enabled)
      this.db.run(
        "INSERT OR IGNORE INTO blocks VALUES(?,?,?)",
        actor,
        target,
        this.now(),
      );
    else
      this.db.run(
        "DELETE FROM blocks WHERE owner=? AND target=?",
        actor,
        target,
      );
  }
  membership(actor, groupId, roles) {
    const m = this.db.get(
      `SELECT m.*,g.owner,c.id AS conversation_id,c.membership_version,c.key_version,c.next_sequence FROM group_members m
      JOIN groups g ON g.id=m.group_id JOIN conversations c ON c.group_id=g.id WHERE m.group_id=? AND m.member_number=?`,
      groupId,
      actor,
    );
    requireThat(m && m.status === "active");
    if (roles)
      requireThat(roles.includes(m.role), 403, "group_permission_required");
    return m;
  }
  group(actor, groupId) {
    const m = this.membership(actor, groupId);
    const g = this.db.get("SELECT * FROM groups WHERE id=?", groupId);
    return {
      id: groupId,
      title: this.keys.open(g.title, `group:${groupId}`),
      owner: g.owner,
      revision: g.revision,
      legacyId: g.legacy_id,
      createdAt: g.created_at,
      avatarId: this.db.get("SELECT asset_id FROM group_media WHERE group_id=?", groupId)?.asset_id ?? null,
      ...this.groupPin(actor, groupId, m),
      ...this.inboxSummary(actor, m),
      conversationId: m.conversation_id,
      membershipVersion: m.membership_version,
      keyVersion: m.key_version,
      members: this.db.all(
        "SELECT member_number AS memberNumber,role,status FROM group_members WHERE group_id=? AND status<>'removed' ORDER BY member_number",
        groupId,
      ),
    };
  }
  listGroups(actor) {
    return this.db
      .all(
        "SELECT group_id FROM group_members WHERE member_number=? AND status='active' LIMIT 100",
        actor,
      )
      .map((g) => this.group(actor, g.group_id));
  }
  readableMessage(actor, conversationId, messageId, membership = this.conversation(actor, conversationId)) {
    return this.db.get(`SELECT * FROM messages WHERE id=? AND conversation_id=? AND sequence>=? AND created_at>=?
      AND EXISTS(SELECT 1 FROM users WHERE member_number=sender AND disabled=0)
      AND NOT EXISTS(SELECT 1 FROM blocks WHERE (owner=? AND target=sender) OR (target=? AND owner=sender))`,
      messageId, conversationId, membership.joined_sequence, this.now() - 30 * 86400000, actor, actor);
  }
  message(actor, conversationId, messageId) {
    const row = this.readableMessage(actor, conversationId, messageId);
    requireThat(row);
    return this.messageView(row);
  }
  groupPin(actor, groupId, membership = this.membership(actor, groupId)) {
    const pin = this.db.get("SELECT * FROM group_pins WHERE group_id=?", groupId);
    const message = pin?.message_id ? this.readableMessage(actor, membership.conversation_id, pin.message_id, membership) : undefined;
    return { pinRevision: pin?.revision ?? 0, pinnedMessage: message ? this.messageView(message) : null };
  }
  pinMessage(actor, groupId, { messageId, revision }) {
    return this.db.transaction(() => {
      const membership = this.membership(actor, groupId, ["owner", "admin"]);
      const previous = this.db.get("SELECT revision FROM group_pins WHERE group_id=?", groupId)?.revision ?? 0;
      requireThat(previous === revision, 409, "pin_changed");
      if (messageId) {
        const message = this.readableMessage(actor, membership.conversation_id, messageId, membership);
        requireThat(message && message.deleted_at === null);
      }
      this.db.run(`INSERT INTO group_pins VALUES(?,?,?) ON CONFLICT(group_id) DO UPDATE SET message_id=excluded.message_id,revision=excluded.revision`,
        groupId, messageId, previous + 1);
      return this.groupPin(actor, groupId, membership);
    });
  }
  invitations(actor) {
    return this.db
      .all(
        `SELECT g.id,g.owner,g.title,m.invited_at FROM group_members m JOIN groups g ON g.id=m.group_id
      WHERE m.member_number=? AND m.status='invited' AND m.invited_at>? LIMIT 100`,
        actor,
        this.now() - 7 * 86400000,
      )
      .filter((g) => !this.blocked(actor, g.owner))
      .map((g) => ({
        id: g.id,
        owner: g.owner,
        title: this.keys.open(g.title, `group:${g.id}`),
        invitedAt: g.invited_at,
      }));
  }
  wrapConversationKey(conversationId, version) {
    this.db.run(
      "INSERT INTO conversation_keys VALUES(?,?,?)",
      conversationId,
      version,
      this.keys.seal(
        randomBytes(32).toString("base64"),
        `conversation-key:${conversationId}:${version}`,
      ),
    );
  }
  rotate(groupId) {
    const c = this.db.get(
      "UPDATE conversations SET membership_version=membership_version+1,key_version=key_version+1 WHERE group_id=? RETURNING id,key_version",
      groupId,
    );
    this.wrapConversationKey(c.id, c.key_version);
    this.db.run("UPDATE groups SET revision=revision+1 WHERE id=?", groupId);
  }
  createGroup(actor, { title, members, legacyId }) {
    return this.db.transaction(() => {
      if (legacyId) {
        const old = this.db.get(
          "SELECT id FROM groups WHERE owner=? AND legacy_id=?",
          actor,
          legacyId,
        );
        if (old) return this.group(actor, old.id);
      }
      requireThat(
        this.db.get("SELECT COUNT(*) AS n FROM groups WHERE owner=?", actor).n <
          20,
        409,
        "group_quota",
      );
      this.groupCapacity(actor);
      const unique = [...new Set(members)];
      requireThat(
        unique.length === members.length && !unique.includes(actor),
        400,
        "invalid_members",
      );
      for (const target of unique) {
        this.visibleActor(actor, target);
        this.groupCapacity(target);
      }
      const groupId = randomUUID(),
        conversationId = randomUUID();
      this.db.run(
        "INSERT INTO groups(id,owner,title,legacy_id,created_at) VALUES(?,?,?,?,?)",
        groupId,
        actor,
        this.keys.seal(title, `group:${groupId}`),
        legacyId ?? null,
        this.now(),
      );
      this.db.run(
        "INSERT INTO conversations(id,group_id) VALUES(?,?)",
        conversationId,
        groupId,
      );
      this.wrapConversationKey(conversationId, 1);
      this.db.run(
        "INSERT INTO group_members VALUES(?,?,'owner','active',1,?)",
        groupId,
        actor,
        this.now(),
      );
      for (const target of unique)
        this.db.run(
          "INSERT INTO group_members VALUES(?,?,'member','invited',1,?)",
          groupId,
          target,
          this.now(),
        );
      return this.group(actor, groupId);
    });
  }
  groupCapacity(actor) {
    requireThat(
      this.db.get(
        "SELECT COUNT(*) AS n FROM group_members WHERE member_number=? AND status<>'removed'",
        actor,
      ).n < 100,
      409,
      "membership_quota",
    );
  }
  invite(actor, groupId, target) {
    this.db.transaction(() => {
      this.membership(actor, groupId, ["owner", "admin"]);
      this.visibleActor(actor, target);
      this.groupCapacity(target);
      const old = this.db.get(
        "SELECT status FROM group_members WHERE group_id=? AND member_number=?",
        groupId,
        target,
      );
      requireThat(!old || old.status === "removed", 409, "already_a_member");
      const all = this.db.all(
        "SELECT member_number FROM group_members WHERE group_id=? AND status<>'removed'",
        groupId,
      );
      requireThat(all.length < 5, 409, "group_full");
      for (const m of all)
        requireThat(
          !this.blocked(target, m.member_number),
          403,
          "blocked_member",
        );
      this.db.run(
        "INSERT INTO group_members VALUES(?,?,'member','invited',1,?) ON CONFLICT(group_id,member_number) DO UPDATE SET role='member',status='invited',invited_at=excluded.invited_at",
        groupId,
        target,
        this.now(),
      );
    });
  }
  accept(actor, groupId) {
    return this.db.transaction(() => {
      const old = this.db.get(
        "SELECT status,invited_at FROM group_members WHERE group_id=? AND member_number=?",
        groupId,
        actor,
      );
      if (old?.status === "active") return this.group(actor, groupId);
      requireThat(
        old?.status === "invited" && old.invited_at > this.now() - 7 * 86400000,
      );
      for (const m of this.db.all(
        "SELECT member_number FROM group_members WHERE group_id=? AND status='active'",
        groupId,
      ))
        this.visibleActor(actor, m.member_number);
      const c = this.db.get(
        "SELECT next_sequence FROM conversations WHERE group_id=?",
        groupId,
      );
      this.db.run(
        "UPDATE group_members SET status='active',joined_sequence=? WHERE group_id=? AND member_number=?",
        c.next_sequence,
        groupId,
        actor,
      );
      this.rotate(groupId);
      return this.group(actor, groupId);
    });
  }
  removeMember(actor, groupId, target) {
    this.db.transaction(() => {
      const self = this.membership(actor, groupId);
      const other = this.db.get(
        "SELECT * FROM group_members WHERE group_id=? AND member_number=?",
        groupId,
        target,
      );
      requireThat(other && other.status !== "removed");
      requireThat(other.role !== "owner", 409, "owner_transfer_required");
      requireThat(
        actor === target ||
          self.role === "owner" ||
          (self.role === "admin" && other.role === "member"),
        403,
        "group_permission_required",
      );
      this.db.run(
        "UPDATE group_members SET status='removed',role='member' WHERE group_id=? AND member_number=?",
        groupId,
        target,
      );
      this.rotate(groupId);
    });
  }
  changeGroup(actor, groupId, { title, revision, avatarId }) {
    return this.db.transaction(() => {
      this.membership(actor, groupId, ["owner", "admin"]);
      const previous = this.db.get("SELECT asset_id FROM group_media WHERE group_id=?", groupId)?.asset_id;
      if (avatarId && avatarId !== previous) this.assetFor(actor, avatarId, "avatar");
      const r = this.db.run(
        "UPDATE groups SET title=?,revision=revision+1 WHERE id=? AND revision=?",
        this.keys.seal(title, `group:${groupId}`), groupId, revision,
      );
      requireThat(r.changes === 1, 409, "revision_conflict");
      if (avatarId !== undefined) {
        this.db.run("DELETE FROM group_media WHERE group_id=?", groupId);
        if (avatarId) this.db.run("INSERT INTO group_media VALUES(?,?)", groupId, avatarId);
      }
      return this.group(actor, groupId);
    });
  }
  inboxSummary(actor, membership) {
    const where = `FROM messages m JOIN users u ON u.member_number=m.sender
      WHERE m.conversation_id=? AND m.sequence>=? AND m.created_at>? AND m.deleted_at IS NULL AND u.disabled=0
      AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.owner=? AND b.target=m.sender) OR (b.target=? AND b.owner=m.sender))`;
    const args = [membership.conversation_id, membership.joined_sequence, this.now() - 30 * 86400000, actor, actor];
    const last = this.db.get(`SELECT m.* ${where} ORDER BY m.sequence DESC LIMIT 1`, ...args);
    const incoming = this.db.all(`SELECT m.sender AS memberNumber, MAX(m.sequence) AS sequence ${where} AND m.sender<>? GROUP BY m.sender`, ...args, actor);
    const message = last ? this.messageView(last) : null;
    return {
      lastMessage: message ? { ...message, text: message.text?.slice(0, 160) ?? null } : null,
      lastIncomingSequence: Math.max(0, ...incoming.map(m => m.sequence)), incomingSequences: incoming,
    };
  }
  role(actor, groupId, target, role) {
    this.db.transaction(() => {
      this.membership(actor, groupId, ["owner"]);
      this.membership(target, groupId);
      if (role !== "member") this.visibleActor(actor, target);
      requireThat(target !== actor, 400, "invalid_role_change");
      if (role === "owner") {
        requireThat(this.db.get("SELECT COUNT(*) AS n FROM groups WHERE owner=?", target).n < 20, 409, "group_quota");
        this.db.run(
          "UPDATE group_members SET role='admin' WHERE group_id=? AND member_number=?",
          groupId,
          actor,
        );
        this.db.run("UPDATE groups SET owner=? WHERE id=?", target, groupId);
      }
      this.db.run(
        "UPDATE group_members SET role=? WHERE group_id=? AND member_number=?",
        role,
        groupId,
        target,
      );
      this.rotate(groupId);
    });
  }
  deleteGroup(actor, groupId) {
    this.membership(actor, groupId, ["owner"]);
    this.db.run("DELETE FROM groups WHERE id=?", groupId);
  }
  conversation(actor, conversationId) {
    const c = this.db.get(
      "SELECT group_id FROM conversations WHERE id=?",
      conversationId,
    );
    requireThat(c);
    return this.membership(actor, c.group_id);
  }
  conversationKey(conversationId, keyVersion) {
    const row = this.db.get(
      "SELECT wrapped_key FROM conversation_keys WHERE conversation_id=? AND version=?",
      conversationId,
      keyVersion,
    );
    requireThat(row, 503, "encryption_key_unavailable");
    return Buffer.from(
      this.keys.open(
        row.wrapped_key,
        `conversation-key:${conversationId}:${keyVersion}`,
      ),
      "base64",
    );
  }
  messageView(row) {
    const body = row.envelope
      ? decrypt(
          this.conversationKey(row.conversation_id, row.key_version),
          JSON.parse(row.envelope),
          `message:${row.conversation_id}:${row.id}:${row.sender}:${row.membership_version}:${row.key_version}`,
        )
      : null;
    return {
      id: row.id,
      conversationId: row.conversation_id,
      sender: row.sender,
      sequence: row.sequence,
      clientId: row.client_id,
      text: body?.text ?? null,
      schemaVersion: row.schema_version,
      encryption: row.encryption,
      membershipVersion: row.membership_version,
      keyVersion: row.key_version,
      createdAt: row.created_at,
      deletedAt: row.deleted_at,
    };
  }
  send(actor, conversationId, input) {
    return this.db.transaction(() => {
      const m = this.conversation(actor, conversationId);
      const old = this.db.get(
        "SELECT * FROM messages WHERE conversation_id=? AND sender=? AND client_id=?",
        conversationId,
        actor,
        input.clientId,
      );
      if (old) {
        requireThat(old.sequence >= m.joined_sequence);
        const view = this.messageView(old);
        requireThat(view.text === input.text, 409, "idempotency_conflict");
        return view;
      }
      requireThat(
        m.membership_version === input.membershipVersion &&
          m.key_version === input.keyVersion,
        409,
        "membership_changed",
      );
      const msgId = randomUUID(),
        at = this.now();
      const envelope = encrypt(
        this.conversationKey(conversationId, m.key_version),
        { text: input.text },
        `message:${conversationId}:${msgId}:${actor}:${m.membership_version}:${m.key_version}`,
      );
      this.db.run(
        `INSERT INTO messages VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
        msgId,
        conversationId,
        actor,
        m.next_sequence,
        input.clientId,
        m.membership_version,
        m.key_version,
        1,
        "server-aes-256-gcm",
        JSON.stringify(envelope),
        at,
        null,
      );
      this.db.run(
        "UPDATE conversations SET next_sequence=next_sequence+1 WHERE id=?",
        conversationId,
      );
      // Bound each conversation even if maintenance is delayed. Rows contain no large binaries.
      this.db.run(
        "DELETE FROM messages WHERE conversation_id=? AND sequence<?",
        conversationId,
        Math.max(0, m.next_sequence - 4999),
      );
      return this.messageView(
        this.db.get("SELECT * FROM messages WHERE id=?", msgId),
      );
    });
  }
  messages(actor, conversationId, after, limit, direction = "forward", knownFrom = 0) {
    const m = this.conversation(actor, conversationId);
    const backward = direction === "backward";
    const rows = this.db.all(
      `SELECT * FROM messages WHERE conversation_id=? AND sequence${backward ? "<" : ">"}? AND sequence>=?
      AND created_at>=? AND EXISTS(SELECT 1 FROM users WHERE member_number=sender AND disabled=0)
      AND NOT EXISTS(SELECT 1 FROM blocks WHERE (owner=? AND target=sender) OR (target=? AND owner=sender)) ORDER BY sequence ${backward ? "DESC" : "ASC"} LIMIT ?`,
      conversationId,
      backward && after === 0 ? m.next_sequence : after,
      m.joined_sequence,
      this.now() - 30 * 86400000,
      actor,
      actor,
      limit + 1,
    );
    const items = rows.slice(0, limit).map((r) => this.messageView(r));
    if (backward) items.reverse();
    return {
      items,
      nextCursor: rows.length > limit ? rows[limit - 1].sequence : null,
      membershipVersion: m.membership_version,
      keyVersion: m.key_version,
      ...(knownFrom > 0 ? { removedIds: this.db.all(
        `SELECT id FROM messages WHERE conversation_id=? AND sequence>=? AND sequence<=? AND deleted_at IS NOT NULL
         AND created_at>=? AND EXISTS(SELECT 1 FROM users WHERE member_number=sender AND disabled=0)
         AND NOT EXISTS(SELECT 1 FROM blocks WHERE (owner=? AND target=sender) OR (target=? AND owner=sender))
         ORDER BY sequence DESC LIMIT 200`, conversationId, Math.max(knownFrom, m.joined_sequence), after, this.now() - 30 * 86400000, actor, actor,
      ).map(row => row.id) } : {}),
    };
  }
  deleteMessage(actor, conversationId, msgId) {
    const m = this.conversation(actor, conversationId),
      row = this.db.get(
        "SELECT sender,sequence FROM messages WHERE id=? AND conversation_id=?",
        msgId,
        conversationId,
      );
    requireThat(row && row.sequence >= m.joined_sequence);
    requireThat(
      row.sender === actor || m.role === "owner" || m.role === "admin",
      403,
      "message_permission_required",
    );
    this.db.run(
      "UPDATE messages SET envelope=NULL,deleted_at=? WHERE id=?",
      this.now(),
      msgId,
    );
  }
}
