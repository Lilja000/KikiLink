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
});
