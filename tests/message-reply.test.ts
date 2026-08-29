import { describe, expect, it } from "vitest";
import {
  formatInlineReplyPrefix,
  parseInlineReplyContext,
  stripInlineReplyDraft,
} from "../src/modules/link-chat/message-reply";

describe("inline LinkChat replies", () => {
  it("round-trips one readable bounded prefix and its separate response", () => {
    const value = `${formatInlineReplyPrefix(" Reina ", "  First   line\nsecond line  ")}My answer`;

    expect(value).toBe("> Reply to Reina: First line second line\nMy answer");
    expect(parseInlineReplyContext(value)).toEqual({
      author: "Reina",
      excerpt: "First line second line",
      content: "My answer",
    });
  });

  it("leaves ordinary quotes and malformed or reply-only prefixes untouched", () => {
    for (const value of [
      "> Reina: an ordinary quote\nMy answer",
      "Before\n> Reply to Reina: not the first line\nMy answer",
      "> Reply to Reina: excerpt",
      "> Reply to Reina: excerpt\n   ",
      "> Reply to  Reina: excerpt\nMy answer",
      "> Reply to Reina: excerpt\r\nMy answer",
    ]) {
      expect(parseInlineReplyContext(value)).toBeUndefined();
    }
  });

  it("rejects oversized handcrafted fields and bounds generated Unicode safely", () => {
    expect(parseInlineReplyContext(
      `> Reply to ${"a".repeat(65)}: excerpt\nMy answer`,
    )).toBeUndefined();
    expect(parseInlineReplyContext(
      `> Reply to Reina: ${"x".repeat(181)}\nMy answer`,
    )).toBeUndefined();

    const prefix = formatInlineReplyPrefix("🌸".repeat(80), "✨".repeat(220));
    const parsed = parseInlineReplyContext(`${prefix}Answer`);
    expect((parsed?.author.length ?? 0)).toBeLessThanOrEqual(64);
    expect((parsed?.excerpt.length ?? 0)).toBeLessThanOrEqual(180);
    expect(parsed?.author).not.toContain("�");
    expect(parsed?.excerpt).not.toContain("�");
  });

  it("quotes only the main response when replying to an existing inline reply", () => {
    const existing = `${formatInlineReplyPrefix("Mina", "Earlier")}The actual answer`;
    const next = `${formatInlineReplyPrefix("Reina", existing)}Follow-up`;

    expect(parseInlineReplyContext(next)).toMatchObject({
      author: "Reina",
      excerpt: "The actual answer",
      content: "Follow-up",
    });
  });

  it("replaces a reply-only draft prefix without treating it as display content", () => {
    const pending = formatInlineReplyPrefix("Mina", "Earlier");

    expect(parseInlineReplyContext(pending)).toBeUndefined();
    expect(stripInlineReplyDraft(pending)).toBe("");
    expect(stripInlineReplyDraft(`${pending}Draft answer`)).toBe("Draft answer");
    expect(stripInlineReplyDraft("> Mina: ordinary quote\nDraft answer")).toBe(
      "> Mina: ordinary quote\nDraft answer",
    );
  });
});
