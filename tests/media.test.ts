import { describe, expect, it } from "vitest";
import {
  isDirectImageUrl,
  normalizeImageUrl,
  parseMessageLinks,
} from "../src/modules/link-chat/media";

describe("LinkChat media", () => {
  it("recognizes safe direct HTTPS image links", () => {
    expect(normalizeImageUrl(" https://cdn.example/image.webp?size=large ")).toBe(
      "https://cdn.example/image.webp?size=large",
    );
    expect(isDirectImageUrl("https://cdn.example/photo.JPG")).toBe(true);
    expect(normalizeImageUrl("http://cdn.example/image.png")).toBeNull();
    expect(normalizeImageUrl("https://cdn.example/page.html")).toBeNull();
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
