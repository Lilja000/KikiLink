// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { appendFeedFormattedText } from "../src/cloud/feed-spoilers";

function render(text: string) {
  const root = document.createElement("div");
  appendFeedFormattedText(root, text);
  return root;
}

describe("Feed text spoilers", () => {
  it("conceals text from visible and accessible DOM until explicitly revealed", () => {
    const root = render("Before ||**the secret**|| after");
    const button = root.querySelector("button")!;
    expect(root.textContent).toBe("Before Spoiler after");
    expect(root.innerHTML).not.toContain("the secret");
    expect(button.type).toBe("button");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    button.click();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.querySelector("strong")?.textContent).toBe("the secret");
    button.click();
    expect(root.innerHTML).not.toContain("the secret");
  });

  it("keeps hidden multiline content intact across heading boundaries", () => {
    for (const text of [
      "Before ||secret\n# secret heading\nstill secret||\n# Visible",
      "# Visible ||secret\nsecret continued||\n# Next heading",
      "# Visible ||secret\n# secret heading||\n# Next heading",
    ]) {
      const root = render(text);
      expect(root.querySelectorAll("button")).toHaveLength(1);
      expect(root.innerHTML).not.toContain("secret");
      root.querySelector("button")!.click();
      expect(root.textContent).toContain("secret");
    }
  });

  it("preserves surrounding styles and allows each spoiler to toggle independently", () => {
    const root = render("**Bold ||first|| end** and ||second||");
    expect(root.querySelector("strong button")).not.toBeNull();
    const buttons = root.querySelectorAll("button");
    buttons[0]!.click();
    expect(root.textContent).toBe("Bold first end and Spoiler");
    expect(buttons[1]!.getAttribute("aria-expanded")).toBe("false");
  });

  it("leaves unmatched, empty, escaped delimiters and URL punctuation literal", () => {
    for (const text of ["unfinished ||text", "||||", "||  ||", "https://example.com/a||b||c"]) {
      const root = render(text);
      expect(root.textContent).toBe(text);
      expect(root.querySelector("button")).toBeNull();
    }
    expect(render("\\||literal\\|| and ||secret||").textContent).toBe("||literal|| and Spoiler");
  });

  it("never creates active content or nested controls inside the reveal button", () => {
    const root = render('||<img src=x onerror=alert(1)> https://example.com/a*b*c||');
    expect(root.querySelector("img,a,iframe,script")).toBeNull();
    root.querySelector("button")!.click();
    expect(root.querySelector("img,a,iframe,script,button button,[onerror]")).toBeNull();
    expect(root.textContent).toContain("https://example.com/a*b*c");
    expect(root.querySelector("em")).toBeNull();
  });
});
