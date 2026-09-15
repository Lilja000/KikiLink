import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { LINK_CHAT_STYLES } from "../src/modules/link-chat/styles";

const cases = [320, 390, 720, 721, 1280].flatMap((width) =>
  ["comfortable", "compact", "super-compact"].map((density) => ({ width, density })),
);

describe("Chat screenshot regressions across viewport and density", () => {
  // Exercise the actual cascade in a shadow root, including the compact and
  // mobile overrides. Happy DOM checks CSS resolution, not painted pixel bounds.
  it.each(cases)("keeps toolbar, crop, and indicators bounded at $width / $density", async ({ width, density }) => {
    const win = new Window({ width, height: 800 });
    try {
      const host = win.document.createElement("div");
      host.dataset.density = density;
      host.dataset.textScale = "extra-large";
      win.document.body.append(host);
      const root = host.attachShadow({ mode: "open" });
      root.innerHTML = `<style>${LINK_CHAT_STYLES}</style>
        <aside class="kl-sidebar">
          <div class="kl-sidebar-heading"><span>Chats</span>
            <div class="kl-sidebar-heading-actions">
              <button class="kl-sidebar-new-chat kl-sidebar-gallery"><svg class="kl-icon"></svg><span>Gallery</span></button>
              <button class="kl-sidebar-new-chat kl-sidebar-new-group" aria-label="New group"><svg class="kl-icon"></svg></button>
              <button class="kl-sidebar-new-chat" aria-label="New chat">+</button>
            </div>
          </div>
          <div class="kl-conversations"><div class="kl-conversation">
            <div class="kl-avatar-wrap">
              <div class="kl-avatar" data-avatar-frame="moon">
                <img width="200" height="900" alt="Tall portrait">
                <span class="kl-addon-badge"><img alt=""></span>
              </div>
              <span class="kl-presence-dot" data-status="online"></span>
            </div>
          </div></div>
        </aside>`;
      const css = (selector: string) => win.getComputedStyle(root.querySelector(selector)!);
      const toolSize = width <= 720 ? "44px" : density === "super-compact" ? "32px" : "36px";
      expect(css(".kl-sidebar-gallery").width).toBe("auto");
      expect(css(".kl-sidebar-gallery").whiteSpace).toBe("nowrap");
      for (const button of root.querySelectorAll(".kl-sidebar-heading-actions button")) {
        expect(win.getComputedStyle(button).height).toBe(toolSize);
        expect(win.getComputedStyle(button).flexShrink).toBe("0");
      }
      expect(css(".kl-sidebar-new-group").width).toBe(toolSize);
      expect(css(".kl-sidebar-heading").flexWrap).toBe("wrap");
      expect(css(".kl-sidebar-heading-actions").maxWidth).toBe("100%");

      const portrait = css(".kl-avatar > img");
      expect(css(".kl-avatar").height).toBe(density === "super-compact" ? "36px" : "44px");
      expect(portrait.position).toBe("absolute");
      expect(portrait.width).toBe("100%");
      expect(portrait.height).toBe("100%");
      expect(portrait.objectFit).toBe("cover");
      // Happy DOM leaves inherited border-radius unresolved.
      expect(["inherit", css(".kl-avatar").borderRadius]).toContain(portrait.borderRadius);

      expect(css(".kl-addon-badge").width).toBe(css(".kl-presence-dot").width);
      expect(css(".kl-addon-badge").height).toBe(css(".kl-presence-dot").height);
      expect(css(".kl-addon-badge").backgroundColor).toBe("transparent");
      expect(css(".kl-addon-badge").borderWidth).toBe("0px");
      expect(css(".kl-addon-badge > img").objectFit).toBe("contain");
      expect(css(".kl-addon-badge > img").position).not.toBe("absolute");
    } finally {
      await win.happyDOM.close();
    }
  });
});
