import { Window } from "happy-dom";
import { describe, it, expect } from "vitest";
import { LINK_CHAT_STYLES } from "../src/modules/link-chat/styles";
import { CLOUD_STYLES } from "../src/cloud/styles";
const cases = [320, 390, 720, 721, 820, 1440].flatMap((width) =>
  ["comfortable", "compact", "super-compact"].flatMap((density) =>
    ["guided", "compact"].flatMap((home) =>
      ["dark", "light"].map((theme) => ({ width, density, home, theme })),
    ),
  ),
);
describe("Cloud responsive CSS in the existing shell (not painted browser geometry)", () => {
  it.each([390, 1440].flatMap(width => ["comfortable", "compact", "super-compact"].flatMap(density => ["list", "chat"].map(mobileView => ({ width, density, mobileView })))))(
    "keeps embedded Groups inside the native Chat layout at $width / $density / $mobileView", async ({ width, density, mobileView }) => {
      const win = new Window({ width, height: 900 });
      try {
        const host = win.document.createElement("div"); host.dataset.density = density; win.document.body.append(host);
        const root = host.attachShadow({ mode: "open" });
        root.innerHTML = `<style>${LINK_CHAT_STYLES}${CLOUD_STYLES}</style><section class="kl-panel" data-cloud="true" data-mobile-view="${mobileView}"><div class="kl-layout" data-cloud-groups="true"><aside class="kl-sidebar"><div class="kl-chat-filters"><button class="kl-chat-filter">All</button><button class="kl-chat-filter">Unread</button><button class="kl-chat-filter">Groups</button></div><div class="kl-conversations" hidden></div><div class="kl-conversations kl-cloud-group-list"><button class="kl-conversation kl-cloud-group-row"><span class="kl-avatar kl-group-inbox-avatar">AB</span><span class="kl-group-inbox-copy"><strong>A long group title</strong></span><span></span></button></div></aside><main class="kl-main"><div class="kl-chat"></div><section class="kl-cloud" data-embedded="true"><header class="kl-cloud-bar">Feed</header><div class="kl-cloud-tabs">Tabs</div><div class="kl-group-thread"></div></section></main></div></section>`;
        const css = (selector: string) => win.getComputedStyle(root.querySelector(selector)!);
        expect(css(".kl-cloud-group-row").gridTemplateColumns).toContain("minmax(0,1fr)");
        expect(parseFloat(css(".kl-group-inbox-copy").minWidth)).toBe(0);
        expect(css(".kl-cloud-tabs").display).toBe("none"); expect(css(".kl-cloud-bar").display).toBe("none");
        expect(css(".kl-chat").display).toBe("none"); expect(css(".kl-conversations[hidden]").display).toBe("none");
        if (width <= 720 && mobileView === "list") {
          expect(css(".kl-main").display).toBe("none");
          expect(css(".kl-sidebar").display).toBe("grid");
        } else if (width <= 720) {
          expect(css(".kl-sidebar").display).toBe("none"); expect(css(".kl-main").display).toBe("grid");
        } else expect(css(".kl-sidebar").display).toBe("grid");
      } finally { await win.happyDOM.close(); }
    });
  it.each(cases)(
    "keeps Cloud usable at $width / $density / $home",
    async ({ width, density, home, theme }) => {
      const win = new Window({ width, height: 800 });
      try {
        const host = win.document.createElement("div");
        host.dataset.density = density;
        host.dataset.homeLayout = home;
        host.dataset.textScale = "extra-large";
        host.dataset.theme = theme;
        win.document.body.append(host);
        const root = host.attachShadow({ mode: "open" });
        root.innerHTML = `<style>${LINK_CHAT_STYLES}${CLOUD_STYLES}</style><section class="kl-panel" data-cloud="true"><header class="kl-topbar"></header><div class="kl-shell"><nav class="kl-feature-nav">${["home", "chat", "roster", "room", "music", "activities", "cloud", "settings"].map(target => `<button class="kl-nav-item" data-target="${target}"><span class="kl-nav-label">${target}</span></button>`).join("")}</nav><div class="kl-workspace"><section class="kl-feature-page kl-cloud"><article class="kl-cloud-card"><textarea></textarea><button>Very long label ${"x".repeat(60)}</button><p>${"longword".repeat(80)}</p><img class="kl-cloud-image" /></article></section></div></div></section>`;
        const css = (selector: string) =>
          win.getComputedStyle(root.querySelector(selector)!);
        // Happy DOM retains overflow shorthand instead of expanding overflowY.
        expect(css(".kl-cloud").overflow).toBe("auto");
        expect(parseFloat(css(".kl-cloud-card").minWidth)).toBe(0);
        expect(css(".kl-cloud-card").overflowWrap).toBe("anywhere");
        expect(css(".kl-cloud-card button").minHeight).toBe("44px");
        expect(css(".kl-cloud textarea").boxSizing).toBe("border-box");
        expect(css(".kl-cloud-image").maxWidth).toBe("100%");
        if (width <= 720) {
          // A scrolling flex column consumed most of the owner's phone screen.
          // Check the actual cascade, including desktop direction and density rules.
          expect(css(".kl-feature-nav").display).toBe("flex");
          expect(css(".kl-feature-nav").flexDirection).toBe("row");
          expect(css(".kl-feature-nav").flexWrap).toBe("nowrap");
          expect(css(".kl-feature-nav").overflowX).toBe("auto");
          expect(css(".kl-feature-nav").overflowY).toBe("hidden");
          expect(css(".kl-nav-item").minWidth).toBe("56px");
          expect(css(".kl-nav-item").flexShrink).toBe("0");
          expect(css('.kl-nav-item[data-target="settings"]').display).toBe("none");
          expect(css(".kl-shell").gridTemplateRows).toBe("minmax(0, 1fr) auto");
        } else {
          expect(css(".kl-feature-nav").flexDirection).toBe("column");
          expect(css(".kl-feature-nav").overflowY).toBe("auto");
          expect(css('.kl-nav-item[data-target="settings"]').display).toBe("flex");
        }
      } finally {
        await win.happyDOM.close();
      }
    },
  );
});

it.each([320,390,844,1440].flatMap(width=>['comfortable','compact','super-compact'].map(density=>({width,density}))))(
  'keeps message alignment, the independent scroll area and composer sizing at $width / $density', async ({width,density})=>{
    const win=new Window({width,height:width===844?390:844});
    try {
      const host=win.document.createElement('div');host.dataset.density=density;win.document.body.append(host);
      const root=host.attachShadow({mode:'open'});
      root.innerHTML=`<style>${LINK_CHAT_STYLES}${CLOUD_STYLES}</style><section class="kl-cloud" data-embedded="true"><div class="kl-cloud-body"><header class="kl-group-header"><button class="kl-social-icon-button kl-group-back"></button><button class="kl-group-identity">Long group name</button><div class="kl-group-avatar-stack"><div class="kl-social-author"></div></div><button class="kl-social-icon-button kl-group-settings-button"></button></header><section class="kl-group-management" hidden></section><section class="kl-group-thread"><div class="kl-group-history"><article class="kl-group-message" data-own="false"><div class="kl-group-message-bubble"><p class="kl-group-message-text">${'long'.repeat(500)}</p></div></article><article class="kl-group-message" data-own="true"><div class="kl-group-message-bubble">Mine</div></article></div><div class="kl-group-composer"><textarea class="kl-group-input"></textarea><div class="kl-group-compose-actions"><button class="kl-social-primary">Send</button></div></div></section></div></section>`;
      const css=(s:string)=>win.getComputedStyle(root.querySelector(s)!);
      expect(css('.kl-cloud').overflow).toBe('hidden');expect(css('.kl-cloud').padding).toBe('0px');
      expect(parseFloat(css('.kl-group-thread').minHeight)).toBe(0);expect(css('.kl-group-history').overflow).toBe('auto');
      expect(css('.kl-group-composer').position).toBe('static');expect(css('.kl-group-composer').flexShrink).toBe('0');
      expect(css('.kl-group-input').minHeight).toBe('44px');expect(css('.kl-group-message-text').overflowWrap).toBe('anywhere');
      expect(css('[data-own="false"]').alignSelf).toBe('flex-start');expect(css('[data-own="true"]').alignSelf).toBe('flex-end');
      expect(css('.kl-group-management').display).toBe('none');
      if(width<=720){expect(css('.kl-group-settings-button').minHeight).toBe('44px');expect(css('.kl-group-avatar-stack').display).toBe('flex');}
    } finally {await win.happyDOM.close();}
  });

it.each([320, 390, 844, 1440].flatMap(width => ['comfortable', 'compact', 'super-compact'].map(density => ({ width, density }))))(
  'shares message actions and reply geometry and keeps activity choices shrinkable at $width / $density', async ({ width, density }) => {
    const win = new Window({ width, height: 844 });
    try {
      const host = win.document.createElement('div'); host.dataset.density = density; win.document.body.append(host);
      const root = host.attachShadow({ mode: 'open' });
      const controls = '<div class="kl-message-side-actions"><button class="kl-message-action"><svg class="kl-icon"></svg></button><button class="kl-message-action"></button></div>';
      const quote = '<div class="kl-message-reply"><svg class="kl-message-reply-icon"></svg><span class="kl-message-reply-copy"><strong class="kl-message-reply-author">Author</strong><span class="kl-message-reply-excerpt">Long excerpt</span></span></div>';
      root.innerHTML = `<style>${LINK_CHAT_STYLES}${CLOUD_STYLES}</style><section id="direct"><div class="kl-message-row kl-message-line kl-message-interaction" data-direction="outgoing"><div class="kl-message-bubble">${quote}Hello</div>${controls}</div></section><section id="group" class="kl-cloud"><article class="kl-group-message kl-message-interaction" data-own="true" data-direction="outgoing"><div class="kl-message-line kl-group-message-line" data-direction="outgoing"><div class="kl-message-bubble kl-group-message-bubble"><div class="kl-group-message-text">${quote}Hello</div></div>${controls}</div></article></section><div class="kl-sequence-editor"><div class="kl-sequence-step"><div class="kl-activity-choice-grid"><button class="kl-activity-choice" aria-pressed="true">${'LongAddonSlot'.repeat(8)}</button><button class="kl-activity-choice">Eyes</button></div></div></div>`;
      const css = (selector: string) => win.getComputedStyle(root.querySelector(selector)!);
      for (const selector of ['.kl-message-line', '.kl-message-side-actions', '.kl-message-action', '.kl-icon', '.kl-message-reply', '.kl-message-reply-copy']) {
        const direct = css(`#direct ${selector}`), group = css(`#group ${selector}`);
        for (const property of ['display', 'gap', 'width', 'height', 'min-height', 'padding', 'border-radius', 'opacity', 'transform', 'transition', 'pointer-events', 'font-size']) {
          expect(group.getPropertyValue(property), `${selector} ${property}`).toBe(direct.getPropertyValue(property));
        }
      }
      expect(css('#group .kl-message-line').flexDirection).toBe('row-reverse');
      expect(css('#group .kl-message-side-actions').pointerEvents).toBe('none');
      expect(parseFloat(css('#group .kl-message-bubble').minWidth)).toBe(0);
      expect(css('.kl-activity-choice-grid').display).toBe('grid');
      expect(css('.kl-activity-choice-grid').gridTemplateColumns).toContain('auto-fit');
      expect(parseFloat(css('.kl-activity-choice').minWidth)).toBe(0);
      expect(css('.kl-activity-choice').overflowWrap).toBe('anywhere');
      expect(css('[aria-pressed="true"]').boxShadow).not.toBe('none');
    } finally { await win.happyDOM.close(); }
  },
);
