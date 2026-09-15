import assert from "node:assert/strict";
import test from "node:test";

import { renderAuthorizePage } from "../src/authorize-page.ts";
import {
  createMultipartPreamble,
  hasExpectedMagic,
  normalizeBondageClubOrigin,
  normalizeCatboxResponse,
  parseUploadDescriptor,
} from "../src/policy.ts";

test("allows only exact HTTPS Bondage Club host families", () => {
  for (const origin of [
    "https://www.bondageprojects.elementfx.com",
    "https://www.bondageprojects.com",
    "https://www.bondage-europe.com",
    "https://www.bondageeurope.com",
    "https://www.bondage-asia.com",
    "https://beta.eu.bondageprojects.com",
  ]) {
    assert.equal(normalizeBondageClubOrigin(origin), origin);
  }
  for (const origin of [
    null,
    "null",
    "http://www.bondageprojects.com",
    "https://www.bondageprojects.com:8443",
    "https://bondageprojects.com",
    "https://bondageprojects.elementfx.com",
    "https://bondage-europe.com",
    "https://bondageeurope.com",
    "https://bondage-asia.com",
    "https://www.bondageprojects.com.evil.example",
    "https://evilbondage-europe.com",
    "https://www.bondageprojects.com/",
    "https://user@www.bondageprojects.com",
  ]) {
    assert.equal(normalizeBondageClubOrigin(origin), null);
  }
});

test("requires matching image metadata and enforces the image bound", () => {
  const valid = parseUploadDescriptor(
    new Headers({
      "Content-Length": "1024",
      "Content-Type": "image/webp",
      "X-KikiLink-Upload-Kind": "image",
      "X-KikiLink-File-Extension": "webp",
    }),
  );
  assert.deepEqual(valid, {
    ok: true,
    value: {
      kind: "image",
      extension: "webp",
      mime: "image/webp",
      bytes: 1024,
      filename: "kikilink-image.webp",
    },
  });

  const wrongMime = parseUploadDescriptor(
    new Headers({
      "Content-Length": "1024",
      "Content-Type": "image/png",
      "X-KikiLink-Upload-Kind": "image",
      "X-KikiLink-File-Extension": "webp",
    }),
  );
  assert.equal(wrongMime.ok, false);
  assert.equal(wrongMime.status, 415);

  const oversized = parseUploadDescriptor(
    new Headers({
      "Content-Length": String(8 * 1024 * 1024 + 1),
      "Content-Type": "image/webp",
      "X-KikiLink-Upload-Kind": "image",
      "X-KikiLink-File-Extension": "webp",
    }),
  );
  assert.equal(oversized.ok, false);
  assert.equal(oversized.status, 413);
});

test("requires a declared raw length and exact audio MIME/extension pair", () => {
  const valid = parseUploadDescriptor(
    new Headers({
      "Content-Length": "4096",
      "Content-Type": "audio/mpeg",
      "X-KikiLink-Upload-Kind": "audio",
      "X-KikiLink-File-Extension": "mp3",
    }),
  );
  assert.equal(valid.ok, true);
  assert.equal(valid.value.filename, "kikilink-track.mp3");

  const mismatch = parseUploadDescriptor(
    new Headers({
      "Content-Length": "4096",
      "Content-Type": "audio/ogg",
      "X-KikiLink-Upload-Kind": "audio",
      "X-KikiLink-File-Extension": "mp3",
    }),
  );
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.status, 415);

  const encoded = parseUploadDescriptor(
    new Headers({
      "Content-Length": "4096",
      "Content-Encoding": "gzip",
      "Content-Type": "audio/mpeg",
      "X-KikiLink-Upload-Kind": "audio",
      "X-KikiLink-File-Extension": "mp3",
    }),
  );
  assert.equal(encoded.ok, false);

  const browserMp4 = parseUploadDescriptor(
    new Headers({
      "Content-Length": "4096",
      "Content-Type": "video/mp4",
      "X-KikiLink-Upload-Kind": "audio",
      "X-KikiLink-File-Extension": "mp4",
    }),
  );
  assert.equal(browserMp4.ok, true);
});

test("checks bounded signatures for every supported container family", () => {
  assert.equal(hasExpectedMagic(ascii("RIFFxxxxWEBP"), "webp"), true);
  assert.equal(hasExpectedMagic(ascii("RIFFxxxxWAVE"), "wav"), true);
  assert.equal(hasExpectedMagic(ascii("fLaC"), "flac"), true);
  assert.equal(hasExpectedMagic(ascii("xxxxftypM4A "), "m4a"), true);
  assert.equal(hasExpectedMagic(ascii("OggS................OpusHead"), "opus"), true);
  assert.equal(hasExpectedMagic(Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3]), "webm"), true);
  assert.equal(hasExpectedMagic(Uint8Array.from([0xff, 0xfb, 0x90, 0x64]), "mp3"), true);
  assert.equal(hasExpectedMagic(ascii("RIFFxxxxWAVE"), "webp"), false);
  assert.equal(hasExpectedMagic(ascii("OggSplain-vorbis"), "opus"), false);
});

test("accepts only a Catbox file URL with the requested extension", () => {
  assert.equal(
    normalizeCatboxResponse("https://files.catbox.moe/abc123.mp3\n", "mp3"),
    "https://files.catbox.moe/abc123.mp3",
  );
  for (const value of [
    "https://files.catbox.moe/abc123.ogg",
    "https://catbox.moe/abc123.mp3",
    "https://files.catbox.moe/abc123.mp3?download=1",
    "https://user@files.catbox.moe/abc123.mp3",
    "https://files.catbox.moe/path/abc123.mp3",
  ]) {
    assert.equal(normalizeCatboxResponse(value, "mp3"), null);
  }
});

test("constructs only the fixed anonymous Catbox fields and a generic filename", () => {
  const descriptor = parseUploadDescriptor(
    new Headers({
      "Content-Length": "4096",
      "Content-Type": "audio/mpeg",
      "X-KikiLink-Upload-Kind": "audio",
      "X-KikiLink-File-Extension": "mp3",
    }),
  ).value;
  const body = new TextDecoder().decode(createMultipartPreamble("boundary", descriptor));
  assert.match(body, /name="reqtype"\r\n\r\nfileupload/u);
  assert.match(body, /name="fileToUpload"; filename="kikilink-track\.mp3"/u);
  assert.doesNotMatch(body, /userhash|original|url/u);
});

test("authorization page keeps state in the fragment and binds Turnstile cdata", () => {
  const page = renderAuthorizePage("site-key", "nonce");
  assert.match(page, /window\.location\.hash/u);
  assert.doesNotMatch(page, /location\.search/u);
  assert.match(page, /cData: state/u);
  assert.match(page, /action: "kikilink_upload"/u);
  assert.match(page, /window\.opener\.postMessage/u);
  assert.match(page, /does not retain the file/u);
});

function ascii(value) {
  return new TextEncoder().encode(value);
}
