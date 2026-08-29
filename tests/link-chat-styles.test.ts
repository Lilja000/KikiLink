import { describe, expect, it } from "vitest";
import { LINK_CHAT_STYLES } from "../src/modules/link-chat/styles";

function declaration(selector: string): string {
  const start = LINK_CHAT_STYLES.indexOf(`\n${selector} {`);
  if (start < 0) throw new Error(`Missing stylesheet selector: ${selector}`);
  const bodyStart = LINK_CHAT_STYLES.indexOf("{", start) + 1;
  const end = LINK_CHAT_STYLES.indexOf("}", bodyStart);
  return LINK_CHAT_STYLES.slice(bodyStart, end);
}

describe("LinkChat visual safeguards", () => {
  it("keeps profile identity copy below the banner and clamps long names", () => {
    expect(declaration(".kl-addon-profile-identity")).toMatch(/padding-top:\s*56px/u);
    expect(declaration(".kl-addon-profile-identity h2")).toMatch(/-webkit-line-clamp:\s*2/u);
    expect(declaration(".kl-addon-profile-identity h2")).toMatch(/overflow-wrap:\s*anywhere/u);
    expect(LINK_CHAT_STYLES).toMatch(
      /@media \(max-width: 410px\)[\s\S]*?\.kl-addon-profile-identity\s*\{[^}]*padding-top:\s*50px;/u,
    );
  });

  it("clips the group avatar artwork without clipping its foreground mark", () => {
    expect(declaration(".kl-group-conversation-avatar")).toMatch(/width:\s*48px/u);
    expect(declaration(".kl-group-conversation-avatar")).toMatch(/overflow:\s*visible/u);
    expect(declaration(".kl-group-conversation-avatar")).toMatch(
      /border:\s*2px solid var\(--kl-group-outline\)/u,
    );
    expect(declaration(".kl-group-conversation-avatar-inner")).toMatch(/overflow:\s*hidden/u);
    expect(LINK_CHAT_STYLES).toContain(
      ".kl-group-conversation-avatar-inner > img { width: 100%; height: 100%;",
    );
    expect(declaration(".kl-group-conversation-mark")).toMatch(/z-index:\s*6/u);
    expect(declaration(".kl-group-conversation-mark")).toMatch(/pointer-events:\s*none/u);
  });

  it("reserves a stable avatar cell inside one selectable contact card", () => {
    expect(declaration(".kl-group-contact-item")).toMatch(
      /grid-template-columns:\s*48px minmax\(0, 1fr\)/u,
    );
    expect(declaration(".kl-group-contact-item")).toMatch(/border:\s*1px solid/u);
    expect(LINK_CHAT_STYLES).toContain('.kl-group-contact-item[data-selected="true"]');
  });

  it("anchors confirmation avatars to one fixed cell instead of accumulating offsets", () => {
    const profile = declaration(".kl-group-confirm-profile");
    const avatar = declaration(".kl-group-confirm-profile .kl-group-member-avatar");

    expect(profile).toMatch(/position:\s*relative/u);
    expect(profile).toMatch(/width:\s*40px/u);
    expect(profile).toMatch(/min-width:\s*40px/u);
    expect(profile).toMatch(/height:\s*40px/u);
    expect(profile).toMatch(/min-height:\s*40px !important/u);
    expect(avatar).toMatch(/position:\s*absolute/u);
    expect(avatar).toMatch(/inset:\s*2px/u);
    expect(avatar).toMatch(/margin:\s*0/u);
    expect(avatar).toMatch(/transform:\s*none/u);
  });

  it("keeps group messages within the ordinary direct-chat bubble footprint", () => {
    const message = declaration(".kl-group-message");

    expect(message).toMatch(/width:\s*fit-content/u);
    expect(message).toMatch(/max-width:\s*min\(72%, 540px\)/u);
    expect(message).toMatch(/grid-template-columns:\s*30px minmax\(0, 1fr\)/u);
    expect(LINK_CHAT_STYLES).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.kl-group-message\s*\{[^}]*max-width:\s*88%/u,
    );
  });

  it("does not reserve an empty status row below the compact group composer", () => {
    expect(declaration(".kl-group-feedback")).toMatch(/min-height:\s*0/u);
    expect(declaration(".kl-group-feedback:empty")).toMatch(/display:\s*none/u);
  });

  it("renders Reply as a compact single-line context rather than a second message", () => {
    const reply = declaration(".kl-message-reply");
    const excerpt = declaration(".kl-message-reply-excerpt");

    expect(reply).toMatch(/grid-template-columns:\s*14px minmax\(0, 1fr\)/u);
    expect(reply).toMatch(/border-bottom:\s*1px solid/u);
    expect(reply).toMatch(/font-size:\s*var\(--kl-type-xs\)/u);
    expect(reply).toMatch(/white-space:\s*nowrap/u);
    expect(excerpt).toMatch(/overflow:\s*hidden/u);
    expect(excerpt).toMatch(/text-overflow:\s*ellipsis/u);
  });

  it("keeps the full body-slot canvas reachable through a focused touch-friendly scroller", () => {
    const stage = declaration(".kl-custom-character-stage");
    const canvas = declaration(".kl-custom-character-canvas");

    expect(stage).toMatch(/place-items:\s*start center/u);
    expect(stage).toMatch(/overflow-y:\s*auto/u);
    expect(stage).toMatch(/overscroll-behavior-y:\s*contain/u);
    expect(stage).toMatch(/touch-action:\s*pan-y/u);
    expect(canvas).toMatch(/width:\s*min\(100%, 250px\)/u);
    expect(canvas).toMatch(/height:\s*auto/u);
    expect(canvas).not.toMatch(/height:\s*min\(100%, 390px\)/u);
    expect(LINK_CHAT_STYLES).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.kl-custom-character-stage\s*\{[^}]*overflow-y:\s*hidden/u,
    );
    expect(LINK_CHAT_STYLES).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.kl-custom-character-canvas\s*\{[^}]*width:\s*auto;[^}]*height:\s*min\(100%, 390px\)/u,
    );
  });
});
