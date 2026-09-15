import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { hash } from "./crypto.mjs";
import { requireThat, ApiError } from "./validation.mjs";

sharp.cache(false);
sharp.concurrency(1);
const HOUR = 3600000,
  DAY = 24 * HOUR;
export class Media {
  constructor(social, storage, auth) {
    const { db, config, now } = social;
    Object.assign(this, { social, storage, auth, db, config, now });
  }
  async upload(actor, kind, bytes, mime) {
    const limits = this.config.limits;
    requireThat(
      Buffer.isBuffer(bytes) &&
        bytes.length > 0 &&
        bytes.length <= limits.maxImageBytes,
      413,
      "image_size_limit",
    );
    requireThat(
      kind !== "avatar" || bytes.length <= 2 * 1024 ** 2,
      413,
      "avatar_size_limit",
    );
    requireThat(
      ["image/jpeg", "image/png", "image/webp"].includes(mime),
      415,
      "image_type",
    );
    const assetId = randomUUID(),
      key = `media/${assetId}.webp`;
    this.db.transaction(() => {
      const user = this.db.get(
        "SELECT COUNT(*) AS count,COALESCE(SUM(bytes),0) AS bytes FROM storage_assets WHERE owner=?",
        actor,
      );
      const global = this.db.get(
        "SELECT COALESCE(SUM(bytes),0) AS bytes FROM storage_assets",
      );
      requireThat(
        user.count < limits.userAssets &&
          user.bytes + limits.maxOutputBytes <= limits.userBytes,
        413,
        "storage_quota",
      );
      requireThat(
        global.bytes + limits.maxOutputBytes <= limits.globalBytes,
        503,
        "storage_capacity",
      );
      this.db.run(
        "INSERT INTO storage_assets(id,owner,kind,object_key,state,bytes,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)",
        assetId,
        actor,
        kind,
        key,
        "pending",
        limits.maxOutputBytes,
        this.now(),
        this.now() + HOUR,
      );
    });
    let uploaded = false;
    try {
      const pipeline = sharp(bytes, {
        limitInputPixels: 24_000_000,
        animated: false,
        failOn: "warning",
      });
      const info = await pipeline.metadata();
      requireThat(
        ["jpeg", "png", "webp"].includes(info.format) &&
          (info.pages ?? 1) === 1,
        415,
        "image_type",
      );
      requireThat(mime === `image/${info.format}`, 415, "image_type_mismatch");
      requireThat(
        info.width >= 16 && info.height >= 16,
        400,
        "image_dimensions",
      );
      const max = kind === "avatar" ? 512 : kind === "banner" ? 1600 : 1920;
      const result = await pipeline
        .rotate()
        .resize({
          width: max,
          height: kind === "banner" ? 800 : max,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82, effort: 3 })
        .toBuffer({ resolveWithObject: true });
      requireThat(
        result.data.length <= limits.maxOutputBytes,
        413,
        "image_output_limit",
      );
      const checksum = hash(result.data);
      // Deduplicate only unused media owned by this user and of this purpose.
      const duplicate = this.db.get(
        `SELECT a.id FROM storage_assets a WHERE owner=? AND kind=? AND sha256=? AND state='ready'
        AND NOT EXISTS(SELECT 1 FROM profile_media WHERE asset_id=a.id) AND NOT EXISTS(SELECT 1 FROM feed_media WHERE asset_id=a.id) AND NOT EXISTS(SELECT 1 FROM group_media WHERE asset_id=a.id) LIMIT 1`,
        actor,
        kind,
        checksum,
      );
      if (duplicate) {
        this.db.run("DELETE FROM storage_assets WHERE id=?", assetId);
        return this.metadata(actor, duplicate.id);
      }
      uploaded = true; // A timed-out PUT might still complete; retain its key for cleanup.
      await this.storage.put(key, result.data);
      this.db.run(
        "UPDATE storage_assets SET state='ready',bytes=?,sha256=?,width=?,height=?,expires_at=? WHERE id=?",
        result.data.length,
        checksum,
        result.info.width,
        result.info.height,
        this.now() + DAY,
        assetId,
      );
      return this.metadata(actor, assetId);
    } catch (error) {
      if (!uploaded)
        this.db.run("DELETE FROM storage_assets WHERE id=?", assetId);
      // Ambiguous writes retain the quota reservation until the janitor confirms deletion.
      if (error.status) throw error;
      if (!uploaded) throw new ApiError(415, "invalid_image");
      throw error;
    }
  }
  metadata(actor, id) {
    const row = this.db.get(
      "SELECT id,owner,kind,bytes,width,height FROM storage_assets WHERE id=? AND state='ready'",
      id,
    );
    requireThat(row && row.owner === actor);
    return {
      id: row.id,
      kind: row.kind,
      bytes: row.bytes,
      width: row.width,
      height: row.height,
    };
  }
  authorized(actor, id) {
    const row = this.db.get(
      "SELECT * FROM storage_assets WHERE id=? AND state='ready'",
      id,
    );
    requireThat(row);
    this.social.visibleActor(actor, row.owner);
    if (row.owner !== actor) {
      const profile = this.db.get(
        "SELECT p.visible FROM profile_media m JOIN profiles p ON p.member_number=m.member_number WHERE asset_id=?",
        id,
      );
      const post = this.db.get(
        "SELECT p.deleted_at FROM feed_media m JOIN posts p ON p.id=m.post_id WHERE asset_id=?",
        id,
      );
      const group = this.db.get(
        "SELECT 1 FROM group_media a JOIN group_members m ON m.group_id=a.group_id WHERE a.asset_id=? AND m.member_number=? AND m.status='active'", id, actor,
      );
      requireThat(profile?.visible === 1 || (post && post.deleted_at === null) || group);
    }
    return row;
  }
  async read(actor, id) {
    const row = this.authorized(actor, id);
    const body = await this.storage.get(
      row.object_key,
      this.config.limits.maxOutputBytes,
    );
    this.authorized(actor, id); // A removal/block during storage I/O must take effect.
    requireThat(hash(body) === row.sha256, 503, "media_integrity");
    return body;
  }
  async remove(actor, id) {
    const row = this.db.get("SELECT * FROM storage_assets WHERE id=?", id);
    requireThat(row && row.owner === actor);
    requireThat(
      !this.db.get("SELECT 1 FROM profile_media WHERE asset_id=?", id) &&
        !this.db.get("SELECT 1 FROM feed_media WHERE asset_id=?", id) &&
        !this.db.get("SELECT 1 FROM group_media WHERE asset_id=?", id),
      409,
      "media_in_use",
    );
    this.db.run("UPDATE storage_assets SET state='deleting' WHERE id=?", id);
    await this.storage.delete(row.object_key);
    this.db.run("DELETE FROM storage_assets WHERE id=?", id);
  }
  async cleanup() {
    const rows = this.db.all(
      `SELECT * FROM storage_assets a WHERE (state='deleting' OR expires_at<=?)
      AND NOT EXISTS(SELECT 1 FROM profile_media WHERE asset_id=a.id) AND NOT EXISTS(SELECT 1 FROM feed_media WHERE asset_id=a.id) AND NOT EXISTS(SELECT 1 FROM group_media WHERE asset_id=a.id) LIMIT 100`,
      this.now(),
    );
    let removed = 0;
    for (const row of rows) {
      this.db.run(
        "UPDATE storage_assets SET state='deleting' WHERE id=?",
        row.id,
      );
      try {
        await this.storage.delete(row.object_key);
        this.db.run("DELETE FROM storage_assets WHERE id=?", row.id);
        removed++;
      } catch {
        /* Retain the reservation; retry on the next scheduled run. */
      }
    }
    return { examined: rows.length, removed };
  }
}
