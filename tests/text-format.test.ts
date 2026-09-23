// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { appendFormattedText } from "../src/modules/link-chat/text-format";
import { parseMessageLinks } from "../src/modules/link-chat/media";

function render(text: string) {
  const node = document.createElement("div");
  appendFormattedText(node, text, parseMessageLinks(text)); return node;
}
describe("opt-in content formatting", () => {
  it("combines all four inline styles inside a heading without extra line breaks", () => {
    const node = render("# **__~~*All styles*~~__**\nNormal  spacing\n\nLast line");
    expect(node.querySelector('[role="heading"] strong u s em')?.textContent).toBe("All styles");
    expect(node.textContent).toBe("All styles\nNormal  spacing\n\nLast line");
    expect(node.querySelector("h1,p,br")).toBeNull();
  });
  it("handles triple stars and either nesting order", () => {
    for (const value of ["***Both***", "**Bold *and italic* end**", "*Italic **and bold** end*"]) {
      const node = render(value); expect(node.querySelector("strong")).not.toBeNull();
      expect(node.querySelector("em")).not.toBeNull(); expect(node.textContent).not.toContain("*");
    }
  });
  it("retains unmatched and empty markup and supports literal escaped delimiters", () => {
    for (const value of ["unfinished *text", "__underline", "~~strike", "2 * 3", "**", "* *"])
      expect(render(value).textContent).toBe(value);
    expect(render("\\*literal\\* \\__plain\\__\n\\# not a heading").textContent).toBe("*literal* __plain__\n# not a heading");
  });
  it("keeps hostile HTML and CSS as text with no executable attributes", () => {
    const node = render('**<img src=x onerror=alert(1)>**\n# <style>body{display:none}</style>');
    expect(node.querySelector("img,style,script,iframe")).toBeNull();
    expect(node.querySelector("strong")?.textContent).toContain("onerror=alert(1)");
    expect(node.querySelectorAll("[style],[onclick],[onerror]")).toHaveLength(0);
  });
  it("protects URL punctuation and closes formatting around links and images", () => {
    const value = '**https://example.com/a*b*c** then __https://example.com/a.png__';
    const node = document.createElement("div"), links: Array<{ url: string; image: boolean }> = [];
    appendFormattedText(node, value, parseMessageLinks(value), link => {
      links.push(link); const anchor = document.createElement("a"); anchor.href = link.url;
      anchor.textContent = value.slice(link.start, link.end); return anchor;
    });
    expect(node.querySelector("strong a")?.textContent).toBe("https://example.com/a*b*c");
    expect(node.querySelector("u a")?.textContent).toBe("https://example.com/a.png");
    expect(links.map(link => link.image)).toEqual([false, true]);
    expect(render("https://example.com/a*b*c").querySelector("em")).toBeNull();
  });
  it("keeps adjacent unformatted fields literal and bounds hostile nesting", () => {
    const author = document.createElement("span"), bio = document.createElement("p"), tag = document.createElement("span");
    for (const node of [author, bio, tag]) node.textContent = "**Name** # title __tag__";
    const message = render("**Message**"), root = document.createElement("div"); root.append(author, bio, tag, message);
    expect(root.querySelectorAll("strong")).toHaveLength(1);
    expect(author.textContent).toBe("**Name** # title __tag__");
    const large = render("*__~~**".repeat(5000) + "word");
    expect(large.textContent).toContain("word");
    expect(large.querySelectorAll("strong strong strong,em em em")).toHaveLength(0);
  });
});
