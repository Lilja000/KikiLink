import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { LINK_CHAT_STYLES } from "../src/modules/link-chat/styles";

const cases = [320, 390, 720, 820, 1440].flatMap(width =>
  ["comfortable", "compact", "super-compact"].flatMap(density =>
    ["showcase", "compact"].flatMap(homeLayout =>
      ["dark", "light"].map(theme => ({ width, density, homeLayout, theme })))));

describe("Interface mode CSS regressions (not painted geometry)", () => {
  it.each(cases)("keeps controls usable at $width / $density / $homeLayout / $theme", async ({ width, density, homeLayout, theme }) => {
    const win = new Window({ width, height: width === 820 ? 390 : 800 });
    try {
      const host = win.document.createElement("div");
      Object.assign(host.dataset, { density, homeLayout, theme, textScale: "extra-large" });
      win.document.body.append(host);
      const root = host.attachShadow({ mode: "open" });
      root.innerHTML = `<style>${LINK_CHAT_STYLES}</style>
        <section class="kl-panel"><header class="kl-topbar">
          <div class="kl-brand"><span class="kl-brand-emblem"></span></div>
          <button class="kl-text-button kl-news-trigger"><svg class="kl-icon"></svg></button>
          <button class="kl-presence-trigger"><span class="kl-avatar kl-presence-trigger-avatar"></span></button>
          <button class="kl-text-button kl-finder-trigger"><svg class="kl-icon kl-finder-trigger-icon"></svg></button>
          <button class="kl-icon-button kl-topbar-settings"><svg class="kl-icon"></svg></button>
          <button class="kl-icon-button kl-qa-close"><svg class="kl-icon"></svg></button>
        </header><div class="kl-shell">
          <nav class="kl-feature-nav">${["home", "chat", "roster", "room", "music", "activities", "settings"].map(target =>
            `<button class="kl-nav-item" data-target="${target}"><svg class="kl-icon kl-nav-icon"></svg><span class="kl-nav-label">${target}</span></button>`).join("")}</nav>
          <div class="kl-workspace"><section class="kl-home">
            <div class="kl-home-hero"><div class="kl-home-hero-copy"></div><div class="kl-home-next"></div></div>
            <div class="kl-feature-grid"><button class="kl-feature-card"><svg class="kl-icon kl-feature-card-icon"></svg><span class="kl-feature-card-copy">Rooms</span></button></div>
          </section></div>
        </div></section>`;
      const css = (selector: string) => win.getComputedStyle(root.querySelector(selector)!);
      // SVG padding shrinks its drawing viewport, not just the surrounding tile.
      const icon = css(".kl-feature-card-icon");
      const glyphWidth = parseFloat(icon.width) - parseFloat(icon.paddingLeft) - parseFloat(icon.paddingRight)
        - parseFloat(icon.borderLeftWidth) - parseFloat(icon.borderRightWidth);
      const glyphHeight = parseFloat(icon.height) - parseFloat(icon.paddingTop) - parseFloat(icon.paddingBottom)
        - parseFloat(icon.borderTopWidth) - parseFloat(icon.borderBottomWidth);
      expect(glyphWidth).toBeGreaterThanOrEqual(18);
      expect(glyphHeight).toBe(glyphWidth);
      expect(css(".kl-nav-icon").width).toBe(css(".kl-nav-icon").height);
      if (homeLayout === "compact") {
        expect(parseFloat(css(".kl-home-hero").minHeight)).toBe(0);
        // Happy DOM 20 does not resolve comma-separated :host() rules correctly.
        // The Guided-only card's visibility still needs a real browser check.
      }
      // A fixed minimum taller than a short desktop viewport clips the panel.
      expect(parseFloat(css(".kl-panel").minHeight)).toBe(0);
      if (width > 720) {
        expect(css(".kl-feature-nav").overflowY).toBe("auto");
      } else {
        // The bottom row must grow with safe-area padding and density settings.
        expect(css(".kl-shell").gridTemplateRows).toBe("minmax(0, 1fr) auto");
        expect(css(".kl-feature-nav").paddingTop).toBe("5px");
        expect(parseFloat(css(".kl-feature-nav").minHeight)).toBeGreaterThanOrEqual(60);
        expect(parseFloat(css(".kl-finder-trigger").minHeight)).toBeGreaterThanOrEqual(44);
        if (width <= 420) {
          // Six visible items remain after the narrow header hides its labels.
          // Checking their fixed width budget caught the 320px Super compact overflow.
          const sizes = [".kl-brand-emblem", ".kl-news-trigger", ".kl-presence-trigger",
            ".kl-finder-trigger", ".kl-topbar-settings", ".kl-qa-close"].map(selector => parseFloat(css(selector).width));
          const bar = css(".kl-topbar");
          // Happy DOM retains logical padding without mapping it to left/right.
          const inline = bar.getPropertyValue("padding-inline")?.split(/\s+/u).map(value => parseFloat(value));
          const padding = inline?.length ? inline[0]! + (inline[1] ?? inline[0]!)
            : parseFloat(bar.paddingLeft) + parseFloat(bar.paddingRight);
          const minimumWidth = sizes.reduce((sum, value) => sum + value, 0)
            + 5 * parseFloat(bar.gap) + padding;
          expect(minimumWidth).toBeLessThanOrEqual(width - 16 - 2); // 8px margins, 1px panel border
        }
      }
    } finally { await win.happyDOM.close(); }
  });
});
