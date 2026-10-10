import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import PINK_AVATAR from "../design/branding/kikilink-blossom.png";
import PINK_ROOM from "../design/branding/kikilink-blossom.svg";
import GOLD_AVATAR from "../design/branding/kikilink-blossom-gold.png";
import GOLD_ROOM from "../design/branding/kikilink-blossom-gold.svg";
import { blossomImageForMember, isGoldBlossomMember } from "../src/modules/link-chat/blossom-identity";

it("uses matching 128px PNG avatars and separate SVG room sprites for both colors", () => {
  expect(blossomImageForMember(202)).toBe(PINK_AVATAR);
  expect(blossomImageForMember(72385)).toBe(GOLD_AVATAR);
  expect(blossomImageForMember(202, "room")).toBe(PINK_ROOM);
  expect(blossomImageForMember(72385, "room")).toBe(GOLD_ROOM);
  for (const filename of ["kikilink-blossom.png", "kikilink-blossom-gold.png"]) {
    const png = readFileSync(resolve(process.cwd(), "design/branding", filename));
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([128, 128]);
  }
});

it.each([undefined, 0, 202, 72384, 72386, "72385" as unknown as number])(
  "keeps both variants pink for any identity other than numeric 72385: %s", member => {
    expect(isGoldBlossomMember(member)).toBe(false);
    expect(blossomImageForMember(member)).toBe(PINK_AVATAR);
    expect(blossomImageForMember(member, "room")).toBe(PINK_ROOM);
  },
);
