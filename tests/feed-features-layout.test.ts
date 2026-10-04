import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { LINK_CHAT_STYLES } from "../src/modules/link-chat/styles";
import { CLOUD_STYLES } from "../src/cloud/styles";

const cases = [320, 390, 980, 1280].flatMap(width =>
  ["comfortable", "compact", "super-compact"].map(density => ({ width, density })));

describe("Feed expansion CSS guardrails (not painted browser geometry)", () => {
  it.each(cases)("keeps filters, polls and replies shrinkable at $width / $density", async ({ width, density }) => {
    const win = new Window({ width, height: width <= 390 ? 340 : 800 });
    try {
      const host = win.document.createElement("div"); host.dataset.density = density; win.document.body.append(host);
      const root = host.attachShadow({ mode: "open" });
      root.innerHTML = `<style>${LINK_CHAT_STYLES}${CLOUD_STYLES}</style>
        <section class="kl-panel" data-cloud="true"><section class="kl-cloud"><div class="kl-feed-main">
          <div class="kl-feed-filter" role="group">${["Everyone", "Friends", "My posts", "Saved", "Hidden"].map(label => `<button class="kl-social-button">${label}</button>`).join("")}</div>
          <article class="kl-cloud-card kl-feed-post">
            <section class="kl-feed-poll-editor"><input aria-label="Poll question"><div class="kl-feed-poll-editor-options"><div class="kl-feed-poll-editor-option"><input aria-label="Poll option"><button class="kl-social-icon-button" aria-label="Remove option"></button></div></div><div class="kl-feed-poll-settings"><button class="kl-social-button">Add option</button><label class="kl-feed-check"><input type="checkbox">Multiple answers</label><label>Ends in <select><option>7 days</option></select></label></div></section>
            <section class="kl-feed-poll"><div class="kl-feed-poll-options"><label class="kl-feed-poll-choice"><input type="radio"><span>${"Long poll option ".repeat(15)}</span></label></div><div class="kl-feed-poll-actions"><button class="kl-social-button">Vote</button><button class="kl-social-button">View results</button></div></section>
            <div class="kl-feed-media"><div class="kl-feed-media-slot"><button class="kl-social-button kl-feed-spoiler-reveal">Reveal image spoiler</button></div></div>
            <div class="kl-cloud-comments"><div class="kl-comment-thread"><article class="kl-social-comment" data-reply="true"><p>${"longword".repeat(80)}</p></article></div><div class="kl-comment-reply-bar"><span>Replying to a very long name</span><button class="kl-social-icon-button" aria-label="Cancel reply"></button></div><div class="kl-comment-compose"><textarea></textarea><button class="kl-social-button">Send comment</button></div></div>
          </article>
          <div class="kl-feed-undo"><span>Post hidden from your Feed.</span><button class="kl-social-button">Undo</button><button class="kl-social-icon-button" aria-label="Dismiss"></button></div>
        </div></section></section>`;
      const css = (selector: string) => win.getComputedStyle(root.querySelector(selector)!);
      expect(css(".kl-feed-filter").flexWrap).toBe("wrap");
      expect(css(".kl-feed-filter").maxWidth).toBe("100%");
      for (const selector of [".kl-feed-main", ".kl-feed-post", ".kl-feed-poll", ".kl-feed-poll-editor", ".kl-feed-poll-options", ".kl-feed-media-slot", ".kl-comment-thread", ".kl-feed-poll-editor input", ".kl-comment-compose textarea"])
        expect(parseFloat(css(selector).minWidth), selector).toBe(0);
      expect(css(".kl-feed-poll-editor-option").gridTemplateColumns).toContain("minmax(0,1fr)");
      expect(css(".kl-feed-poll-actions").flexWrap).toBe("wrap");
      expect(css(".kl-feed-poll-settings").flexWrap).toBe("wrap");
      expect(css(".kl-feed-post").overflowWrap).toBe("anywhere");
      if (width <= 390) {
        for (const selector of [".kl-feed-filter button", ".kl-feed-poll-editor-option button", ".kl-feed-poll-settings button", ".kl-feed-poll-settings select", ".kl-feed-check", ".kl-feed-poll-choice", ".kl-feed-poll-actions button", ".kl-feed-undo button", ".kl-comment-reply-bar button"])
          expect(parseFloat(css(selector).minHeight), `${selector} should keep a 44px touch target`).toBeGreaterThanOrEqual(44);
        expect(css(".kl-feed-poll-editor-option").gridTemplateColumns).toContain("44px");
      }
    } finally { await win.happyDOM.close(); }
  });
});
