import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { CLOUD_STYLES } from "../src/cloud/styles";
import { LINK_CHAT_STYLES } from "../src/modules/link-chat/styles";

// Applied CSS cascade only. Happy DOM does not paint or measure grid geometry;
// tests/manual-ui also supplies the real UI for browser layout review.
describe("Topbar density and input-mode cascade", () => {
  it.each([390, 720, 980, 1280].flatMap(width =>
    ["comfortable", "compact", "super-compact"].flatMap(density =>
      [false, true].map(touch => ({ width, density, touch })))))(
    "keeps News/Mailbox equal and the shell shrinkable at $width / $density / touch=$touch",
    async ({ width, density, touch }) => {
      const win = new Window({ width, height: 800 });
      try {
        Object.defineProperty(win.navigator, "maxTouchPoints", { value: touch ? 1 : 0 });
        const host = win.document.createElement("div");
        host.dataset.density = density;
        host.dataset.textScale = "extra-large";
        win.document.body.append(host);
        const root = host.attachShadow({ mode: "open" });
        // Happy DOM 20.11 incorrectly ANDs this comma-separated media list.
        // Evaluate its two alternatives independently, preserving browser OR
        // semantics while still testing the real declarations and specificity.
        const styles = `${LINK_CHAT_STYLES}\n${CLOUD_STYLES}`.replace(
          /@media\s*\(max-width:\s*720px\),\s*\(pointer:\s*coarse\)\s*\{/gu,
          () => `@media ${win.matchMedia("(max-width:720px)").matches || win.matchMedia("(pointer:coarse)").matches ? "all" : "not all"} {`,
        );
        root.innerHTML = `<style>${styles}</style>
          <section class="kl-panel"><header class="kl-topbar">
            <div class="kl-brand"><div class="kl-brand-copy">KIKILINK - DEVTEST</div></div>
            <button class="kl-text-button kl-news-trigger"><svg class="kl-icon kl-news-trigger-icon"></svg>News</button>
            <button class="kl-icon-button kl-mailbox-trigger"><svg class="kl-icon"></svg></button>
            <div class="kl-topbar-drag-space"></div>
            <div class="kl-topbar-context">Custom Activities</div>
            <time class="kl-local-clock">03:07 PM</time>
          </header><div class="kl-shell"></div></section>`;
        const css = (selector: string) => win.getComputedStyle(root.querySelector(selector)!);
        const news = css(".kl-news-trigger"), mailbox = css(".kl-mailbox-trigger");
        const size = width <= 720 || touch ? "44px" : density === "super-compact" ? "34px" : "40px";
        expect(news.height).toBe(size);
        expect(mailbox.height).toBe(size);
        expect(news.minHeight).toBe(size);
        expect(mailbox.minHeight).toBe(size);
        expect(mailbox.width).toBe(size);
        expect(css(".kl-mailbox-trigger > .kl-icon").width).toBe("17px");
        expect(css(".kl-panel").gridTemplateColumns).toBe("minmax(0, 1fr)");
        expect(parseFloat(css(".kl-topbar").minWidth)).toBe(0);
        expect(css(".kl-brand").flexShrink).toBe("1");
        if (width > 920) {
          // Assert the content-independent sizing contract, not pixel positions:
          // Happy DOM cannot measure the layout or apply container queries.
          const title = root.querySelector(".kl-topbar-context")!;
          for (const label of ["Chat", "Custom Activities", "A much longer workspace title"]) {
            title.textContent = label;
            expect(css(".kl-topbar-context").flexGrow).toBe("1");
            expect(css(".kl-topbar-context").flexBasis).toBe("176px");
            expect(css(".kl-topbar-context").width).toBe("0px");
            expect(parseFloat(css(".kl-topbar-context").minWidth)).toBe(0);
            expect(css(".kl-topbar-context").textAlign).toBe("left");
            expect(css(".kl-topbar-context").whiteSpace).toBe("nowrap");
            expect(css(".kl-topbar-context").overflow).toBe("hidden");
            expect(css(".kl-topbar-drag-space").flexGrow).toBe("0");
            expect(css(".kl-topbar-drag-space").flexShrink).toBe("0");
            expect(css(".kl-topbar-drag-space").flexBasis).toBe("6px");
            expect(css(".kl-topbar-drag-space").minWidth).toBe("6px");
            expect(css(".kl-local-clock").flexShrink).toBe("0");
          }
        }
      } finally { await win.happyDOM.close(); }
    });
});
