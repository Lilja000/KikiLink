import { describe, expect, it } from "vitest";
import {
  isDirectImageUrl,
  normalizeImageUrl,
  parseMessageLinks,
} from "../src/modules/link-chat/media";

describe("LinkChat media", () => {
  it("preserves signed Discord URLs including the final ampersand in both input paths", () => {
    const url = "https://cdn.discordapp.com/attachments/1538085321689006090/1550368718733705297/image.png?ex=6aae14e3&is=6aacc363&hm=57b693099d79892dda97ac4251bcf4d792655efdba2cc7735b90f14d7d258f90&";
    expect(normalizeImageUrl(url)).toBe(url);
    expect(parseMessageLinks(url)).toEqual([{ start: 0, end: url.length, url, image: true }]);
    expect(isDirectImageUrl("https://cdn.discordapp.com/attachments/not-an-image?name=image.png")).toBe(false);
  });
  it("recognizes safe direct HTTPS image links", () => {
    expect(normalizeImageUrl(" https://cdn.example/image.webp?size=large ")).toBe(
      "https://cdn.example/image.webp?size=large",
    );
    expect(isDirectImageUrl("https://cdn.example/photo.JPG")).toBe(true);
    expect(normalizeImageUrl("http://cdn.example/image.png")).toBeNull();
    expect(normalizeImageUrl("https://cdn.example/page.html")).toBeNull();
    expect(normalizeImageUrl("https://cdn.example/unbounded.avif")).toBeNull();
    expect(normalizeImageUrl("https://user:secret@cdn.example/image.png")).toBeNull();
  });

  it("extracts only the image URL from clipboard formatting", () => {
    expect(
      normalizeImageUrl("[color=#ff66aa]https://cdn.example/image.png[/color]"),
    ).toBe("https://cdn.example/image.png");
    expect(
      normalizeImageUrl("Preview: [image](https://cdn.example/picture.webp), color #ff66aa"),
    ).toBe("https://cdn.example/picture.webp");
  });

  it("extracts links without swallowing sentence punctuation", () => {
    const links = parseMessageLinks(
      "Look: https://cdn.example/picture.png, then https://example.com/page.",
    );

    expect(links).toMatchObject([
      { url: "https://cdn.example/picture.png", image: true },
      { url: "https://example.com/page", image: false },
    ]);
  });
});
