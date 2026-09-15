import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { LINK_CHAT_STYLES } from "../src/modules/link-chat/styles";

describe("Rooms and Players responsive cascade", () => {
  it.each([320, 390, 720, 900, 1280].flatMap(width =>
    ["comfortable", "compact", "super-compact"].map(density => ({ width, density }))))(
    "keeps desktop panes and mobile controls bounded at $width / $density", async ({ width, density }) => {
      // This validates the applied cascade, not painted geometry. Container query rules are
      // covered by the CSS source and the real-browser review when that environment is available.
      const win = new Window({ width, height: 800 });
      try {
        const host = win.document.createElement("div"); host.dataset.density = density;
        host.dataset.textScale = "extra-large"; win.document.body.append(host);
        const root = host.attachShadow({ mode: "open" });
        root.innerHTML = `<style>${LINK_CHAT_STYLES}</style>
          <section class="kl-roster-page" data-detail="true">
            <header class="kl-feature-page-header"></header>
            <div class="kl-roster-body"><section class="kl-roster-list-pane">
              <div class="kl-roster-filters"><button class="kl-directory-filter">KikiLink</button></div>
              <div class="kl-roster-results"><div class="kl-roster-list"><div class="kl-roster-entry">
                <button class="kl-avatar-button"><span class="kl-avatar"><img width="200" height="900"></span></button>
                <div class="kl-roster-entry-copy"><button class="kl-roster-entry-select"><span class="kl-roster-entry-name">${"Long player name ".repeat(30)}</span></button></div>
                <div class="kl-roster-entry-actions"><button class="kl-text-button">Message</button><button class="kl-icon-button">…</button></div>
              </div></div></div>
            </section><section class="kl-roster-detail"></section></div>
          </section>
          <section class="kl-room-page"><div class="kl-lobby-card">
            <div class="kl-lobby-card-main"><strong class="kl-lobby-name">${"Long room name ".repeat(30)}</strong><span class="kl-lobby-count">10/10 · Full</span><button class="kl-lobby-favorite"></button></div>
            <div class="kl-lobby-card-footer"><button class="kl-room-people-button">Players</button><button class="kl-text-button kl-room-manage">Manage</button></div>
          </div><div class="kl-room-manager"><fieldset class="kl-room-manager-fields">
            <div class="kl-room-form-grid"><label class="kl-room-field"><input class="kl-input" value="${"Long room name ".repeat(30)}"></label></div>
            <div class="kl-room-background-grid"><button class="kl-room-background-choice"><img width="1920" height="1080"></button></div>
            <div class="kl-room-member-chips"><button class="kl-room-member-chip"><span>${"Long member name ".repeat(30)}</span></button></div>
          </fieldset></div></section><div class="kl-sequence-timing"><div class="kl-sequence-slider"><input type="range"><output>15 s</output></div></div>`;
        const css = (selector: string) => win.getComputedStyle(root.querySelector(selector)!);
        expect(css(".kl-roster-body").gridTemplateColumns).toBe(width <= 720 ? "minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 1fr)");
        expect(css(".kl-roster-body").overflow).toBe("hidden");
        expect(css(".kl-roster-list-pane").display).toBe(width <= 720 ? "none" : "grid");
        expect(css(".kl-roster-list").maxHeight).toBe("none");
        expect(css(".kl-roster-results").gridRow).toBe("5");
        expect(css(".kl-roster-detail").overflowY).toBe("auto");
        expect(css(".kl-roster-entry-actions .kl-text-button").minHeight).toBe(width <= 720 ? "44px" : "32px");
        expect(css(".kl-roster-entry-actions .kl-icon-button").width).toBe(width <= 720 ? "44px" : "32px");
        expect(css(".kl-directory-filter").minHeight).toBe(width <= 720 ? "44px" : "34px");
        expect(css(".kl-room-people-button").minHeight).toBe(width <= 720 ? "44px" : "34px");
        expect(css(".kl-feature-page-header").flexWrap).toBe("wrap");
        for (const name of [".kl-roster-entry-name", ".kl-lobby-name"]) {
          expect(parseFloat(css(name).minWidth)).toBe(0); expect(css(name).textOverflow).toBe("ellipsis");
        }
        expect(css(".kl-lobby-card-main").gridTemplateColumns).toBe("minmax(0, 1fr) auto auto");
        expect(css(".kl-avatar > img").objectFit).toBe("cover");
        expect(css(".kl-avatar > img").position).toBe("absolute");
        expect(css(".kl-room-form-grid").gridTemplateColumns).toContain("auto-fit");
        expect(css(".kl-room-background-grid").gridTemplateColumns).toContain("auto-fit");
        expect(css(".kl-room-background-choice img").objectFit).toBe("cover");
        expect(css(".kl-room-member-chip span").overflowWrap).toBe("anywhere");
        expect(css(".kl-sequence-slider").gridTemplateColumns).toBe("minmax(0, 1fr) 45px");
        for (const selector of [".kl-room-manager", ".kl-room-manager-fields", ".kl-room-form-grid", ".kl-room-background-grid", ".kl-room-member-chips", ".kl-sequence-slider"])
          expect(parseFloat(css(selector).minWidth)).toBe(0);
      } finally { await win.happyDOM.close(); }
    });
});
