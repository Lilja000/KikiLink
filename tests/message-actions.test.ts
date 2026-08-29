// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import {
  appendActionFormattedText,
  parseMessageActionSegments,
} from "../src/modules/link-chat/message-actions";
import { parseMessageLinks } from "../src/modules/link-chat/media";

describe("LinkChat action text", () => {
  it("emphasizes complete literal action pairs while preserving their exact text", () => {
    const value = "Before * действие * then *waves* after";
    const root = document.createElement("div");

    appendActionFormattedText(root, value);

    expect(root.textContent).toBe(value);
    expect([...root.querySelectorAll("em.kl-message-action-text")].map((node) => node.textContent))
      .toEqual(["* действие *", "*waves*"]);
    expect(parseMessageActionSegments(value)).toEqual([
      { start: 0, end: 7, action: false },
      { start: 7, end: 19, action: true },
      { start: 19, end: 25, action: false },
      { start: 25, end: 32, action: true },
      { start: 32, end: 38, action: false },
    ]);
  });

  it("keeps unmatched, empty, and Markdown-style double asterisks as ordinary text", () => {
    for (const value of ["2 * 3", "an unfinished *action", "**not Markdown**", "empty ** or * *"] ) {
      const root = document.createElement("div");
      appendActionFormattedText(root, value);

      expect(root.textContent).toBe(value);
      expect(root.querySelector("em")).toBeNull();
    }
  });

  it("never interprets message content as HTML", () => {
    const value = "Before *<img src=x onerror=alert(1)> bows* after";
    const root = document.createElement("div");

    appendActionFormattedText(root, value);

    expect(root.textContent).toBe(value);
    expect(root.querySelector("img")).toBeNull();
    expect(root.querySelector("em")?.textContent).toBe("*<img src=x onerror=alert(1)> bows*");
  });

  it("treats links as opaque while allowing an action to contain a safe anchor", () => {
    const value = "*shares https://example.com/a*b*c now* https://cdn.example/picture.png";
    const links = parseMessageLinks(value);
    const root = document.createElement("div");

    appendActionFormattedText(root, value, links, (link) => {
      if (link.image) return undefined;
      const anchor = document.createElement("a");
      anchor.href = link.url;
      anchor.textContent = value.slice(link.start, link.end);
      return anchor;
    });

    const action = root.querySelector("em.kl-message-action-text");
    expect(action?.textContent).toBe("*shares https://example.com/a*b*c now*");
    expect(action?.querySelector("a")?.href).toBe("https://example.com/a*b*c");
    expect(root.textContent).not.toContain("picture.png");
  });
});
