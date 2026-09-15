import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

export class R2Storage {
  constructor(config) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: "auto",
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      maxAttempts: 2,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  async send(command) {
    return this.client.send(command, {
      abortSignal: AbortSignal.timeout(15000),
    });
  }
  async put(key, bytes, contentType = "image/webp") {
    await this.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: bytes,
        ContentLength: bytes.length,
        ContentType: contentType,
        CacheControl: "private, no-store",
      }),
    );
  }
  async putStream(key, stream, bytes) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: stream,
        ContentLength: bytes,
        ContentType: "application/octet-stream",
      }),
      { abortSignal: AbortSignal.timeout(120000) },
    );
  }
  async downloadTo(key, target, maxBytes) {
    const { createWriteStream } = await import("node:fs");
    const { pipeline } = await import("node:stream/promises");
    const { Transform } = await import("node:stream");
    const result = await this.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (
      !Number.isSafeInteger(result.ContentLength) ||
      result.ContentLength > maxBytes
    ) {
      result.Body?.destroy();
      throw new Error("Backup size exceeds bound");
    }
    let size = 0;
    const bounded = new Transform({
      transform(chunk, _encoding, cb) {
        size += chunk.length;
        cb(
          size > maxBytes ? new Error("Backup size exceeds bound") : null,
          chunk,
        );
      },
    });
    await pipeline(
      result.Body,
      bounded,
      createWriteStream(target, { flags: "wx", mode: 0o600 }),
      { signal: AbortSignal.timeout(120000) },
    );
  }
  async get(key, maxBytes) {
    const result = await this.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (
      !Number.isSafeInteger(result.ContentLength) ||
      result.ContentLength > maxBytes
    ) {
      result.Body?.destroy();
      throw new Error("Stored object exceeds bound");
    }
    const parts = [];
    let length = 0;
    const timeout = setTimeout(
      () => result.Body?.destroy(new Error("Object read timeout")),
      15000,
    );
    timeout.unref();
    try {
      for await (const chunk of result.Body) {
        length += chunk.length;
        if (length > maxBytes) throw new Error("Stored object exceeds bound");
        parts.push(chunk);
      }
      return Buffer.concat(parts);
    } finally {
      clearTimeout(timeout);
      result.Body?.destroy();
    }
  }
  async delete(key) {
    await this.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
  async healthy() {
    await this.send(new HeadBucketCommand({ Bucket: this.bucket }));
    return true;
  }
  async list(prefix, continuation) {
    return this.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuation,
        MaxKeys: 200,
      }),
    );
  }
  close() {
    this.client.destroy();
  }
}
