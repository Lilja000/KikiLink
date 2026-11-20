/** Prototype conversation layout, scoped to the 2.0 chat workspace. */
export const CHAT_PAGE_STYLES = `
.kl-panel[data-platform-preview="true"] .kl-chat-page {
  grid-template-columns: minmax(192px, 240px) minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  gap: 0;
  padding: 20px;
}
.kl-chat-page-header {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin-bottom: 12px;
}
.kl-chat-page-title { margin: 0; font-size: 20px; line-height: 1.3; letter-spacing: -.3px; }
.kl-chat-page-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
.kl-chat-page-actions > [hidden] { display: none !important; }
.kl-chat-page-actions .kl-chat-page-new {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 36px;
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 650;
  white-space: nowrap;
  box-shadow: none;
}
.kl-chat-page .kl-chat-page-actions .kl-icon-button { width: 42px; min-height: 36px; height: 36px; border-radius: 8px; }
.kl-chat-page-actions .kl-icon { width: 16px; height: 16px; }
@container kl-panel (width <= 1100px) {
  .kl-panel[data-platform-preview="true"] .kl-chat-page { padding: 16px; }
}
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-sidebar {
  grid-template-areas: "search" "chats";
  grid-template-rows: auto minmax(0, 1fr);
  border-right: 0;
  border-radius: 8px 0 0 8px;
}
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-main {
  border-radius: 0 8px 8px 0;
  background: var(--kl-bg);
}
.kl-chat-page .kl-search-wrap { border-bottom: 1px solid var(--kl-border); }
.kl-chat-search-field {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--kl-border);
  border-radius: 8px;
  background: var(--kl-input-bg);
}
.kl-chat-search-field:focus-within { border-color: var(--kl-border-strong); outline: 2px solid color-mix(in srgb, var(--kl-accent) 16%, transparent); }
.kl-chat-search-field > .kl-icon {
  flex: none;
  width: 15px;
  height: 15px;
  color: var(--kl-muted);
  pointer-events: none;
}
.kl-chat-search-field > .kl-search {
  flex: 1;
  width: 0;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  box-shadow: none;
  font-size: 11px;
}
.kl-chat-unread-only {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin-top: 8px;
  border-bottom: 1px solid var(--kl-border);
  font-size: 10px;
  cursor: pointer;
}
.kl-chat-unread-only > input { width: 14px; height: 14px; margin: 0; accent-color: var(--kl-accent); }
.kl-chat-page .kl-conversations { padding: 6px; }
.kl-chat-list-row {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  margin-bottom: 4px;
  border: 1px solid transparent;
  border-radius: 7px;
}
.kl-chat-list-row:hover { background: var(--kl-surface-hover); }
.kl-chat-list-row:has(.kl-conversation[data-active="true"]) {
  border-color: color-mix(in srgb, var(--kl-accent) 28%, transparent);
  background: color-mix(in srgb, var(--kl-accent) 9%, transparent);
}
.kl-chat-list-row > .kl-conversation {
  grid-template-columns: 32px minmax(0, 1fr);
  align-items: center;
  min-width: 0;
  min-height: 59px;
  padding: 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
}
.kl-chat-list-row .kl-avatar-wrap,
.kl-chat-list-row .kl-avatar { width: 32px; height: 32px; }
.kl-chat-list-row .kl-avatar-wrap { grid-row: 1 / span 2; }
.kl-chat-list-row > .kl-conversation:has(.kl-unread) { row-gap: 3px; }
.kl-chat-list-row .kl-conversation-name { font-size: 12px; font-weight: 600; }
.kl-chat-list-row .kl-conversation-preview { margin-top: 3px; font-size: 11px; line-height: 1.4; }
.kl-chat-list-row .kl-conversation-side { grid-column: 2; flex-direction: row; align-items: center; justify-content: flex-start; }
.kl-chat-list-row .kl-conversation-side:not(:has(.kl-unread)) { display: none; }
.kl-chat-list-row .kl-time { display: none; }
.kl-chat-list-row .kl-unread { min-width: 16px; height: 16px; padding: 0 4px; font-size: 9px; }
.kl-chat-page .kl-chat-list-row > .kl-chat-row-options { width: 32px; min-width: 32px; height: 34px; min-height: 34px; margin-right: 2px; padding: 4px; border-radius: 8px; background: transparent; border-color: transparent; }
.kl-chat-list-row > .kl-conversation[data-conversation-kind="direct"] {
  grid-template-columns: 32px minmax(0, 1fr);
  grid-template-rows: auto;
  min-height: 0;
  padding: 10px 8px;
  gap: 10px;
}
.kl-chat-list-row > .kl-conversation[data-conversation-kind="direct"] .kl-avatar-wrap { grid-row: auto; }
.kl-chat-list-row > .kl-conversation[data-conversation-kind="direct"] .kl-avatar { border-radius: 50%; font-size: 10px; }
.kl-chat-list-row > .kl-conversation[data-conversation-kind="direct"] .kl-presence-dot { display: none; }
.kl-chat-list-row > .kl-conversation[data-conversation-kind="direct"] .kl-conversation-name { font-size: var(--kl-type-body); font-weight: 550; line-height: 1.5; }
.kl-chat-list-row > .kl-conversation[data-conversation-kind="direct"] .kl-conversation-preview {
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
  font-style: normal;
  line-height: 1.6;
}
.kl-chat-list-row > .kl-conversation[data-conversation-kind="direct"] .kl-conversation-preview > span {
  color: color-mix(in srgb, var(--kl-accent), white 12%);
}
.kl-chat-list-row > .kl-conversation[data-conversation-kind="direct"] .kl-conversation-side {
  grid-column: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 3px;
}
.kl-chat-list-row > .kl-conversation[data-conversation-kind="direct"] .kl-conversation-side:not(:has(.kl-unread, .kl-pin, .kl-conversation-muted)) {
  display: none;
}
.kl-chat-list-pin { display: inline-flex; }
.kl-chat-list-pin .kl-pin { width: 12px; height: 12px; color: var(--kl-muted); }
.kl-chat-list-empty { padding: 16px 8px; text-align: center; }
.kl-chat-list-empty h2 { margin: 0; font-size: 13px; }
.kl-chat-list-empty p { margin: 8px 0 0; color: var(--kl-muted); font-size: 11px; line-height: 1.7; }
.kl-chat-list-empty .kl-text-button { margin-top: 12px; }
.kl-chat-page :is(.kl-main > .kl-empty:not([hidden]), .kl-cloud-body > .kl-group-thread-empty) {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 24px 16px;
  border: 1px dashed var(--kl-border);
  border-radius: 10px;
  background: #11111308;
}
.kl-chat-page .kl-group-thread-empty { flex: none; margin-block: auto; }
.kl-chat-page .kl-empty-mark { width: 28px; height: 28px; margin: 0 0 4px; border: 0; background: none; color: var(--kl-muted); }
.kl-chat-page .kl-empty-mark > .kl-icon { width: 28px; height: 28px; }
.kl-chat-page .kl-empty .kl-empty-title { margin: 0; font-family: inherit; font-size: 16px; font-weight: 650; line-height: 1.4; letter-spacing: -.2px; }
.kl-chat-page .kl-empty > .kl-text-button {
  margin-top: 16px; min-height: 36px; padding: 0 12px;
  border: 1px solid var(--kl-border); border-radius: 7px; background: transparent;
  color: var(--kl-text); font-family: inherit; font-size: 12px; font-weight: 550; line-height: 1.5;
}
.kl-chat-page .kl-empty > .kl-text-button:hover { background: var(--kl-surface-hover); }
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-chat-header { min-height: 58px; padding: 8px 12px; background: var(--kl-surface); }
.kl-chat-page .kl-chat-archive-footer:not([hidden]) {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
  margin: 0;
  padding: 10px 12px;
  border-top: 1px solid var(--kl-border);
  background: var(--kl-surface);
  color: var(--kl-muted);
}
.kl-chat-archive-footer > span { flex: 1 1 200px; min-width: 0; font-size: 10px; line-height: 1.7; overflow-wrap: anywhere; }
.kl-chat-page .kl-chat-archive-footer > button { max-width: 100%; min-height: 36px; padding: 6px 11px; border: 1px solid var(--kl-border); border-radius: 8px; background: transparent; color: var(--kl-text); font-size: 11px; font-weight: 550; white-space: normal; }
.kl-chat-page .kl-chat-archive-footer > button:hover { background: var(--kl-surface-hover); }
.kl-chat-page .kl-chat-archive-footer > button > .kl-icon { display: none; }
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-chat-header .kl-icon-button {
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  border-color: transparent;
  border-radius: 8px;
  background: transparent;
}
.kl-chat-page .kl-chat-header .kl-icon-button:is(:hover, [aria-expanded="true"]) { background: var(--kl-surface-hover); }
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-chat-header > :is(.kl-chat-open-profile, .kl-profile-more) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  color: var(--kl-muted);
  font-size: var(--kl-type-body);
  letter-spacing: normal;
}
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-chat-header > :is(.kl-chat-open-profile, .kl-profile-more):is(:hover, [aria-expanded="true"]) { color: var(--kl-text); }
.kl-chat-page .kl-chat-header > :is(.kl-chat-open-profile, .kl-profile-more) .kl-icon { width: 16px; height: 16px; }
.kl-chat-page .kl-chat-header > .kl-chat-person { flex: 1; min-width: 0; margin-right: 0; }
.kl-chat-page .kl-chat-header .kl-chat-name { margin: 0; font-size: var(--kl-type-body); font-weight: 650; line-height: 1.4; letter-spacing: -.2px; }
.kl-chat-page .kl-chat-number { display: none; }
.kl-chat-page .kl-chat-subline { gap: 7px; height: 1.6em; margin-top: 3px; font-size: var(--kl-type-xs); line-height: 1.6; }
.kl-chat-page .kl-chat-presence, .kl-chat-page .kl-chat-room { min-height: 0; white-space: nowrap; font: inherit; }
.kl-chat-page .kl-chat-presence > .kl-presence-dot { display: none; }
.kl-chat-page .kl-chat-presence::before { content: none; }
.kl-chat-page .kl-chat-header > .kl-avatar { flex: none; width: 32px; height: 32px; border-radius: 50%; font-size: 10px; }
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-messages {
  padding: 12px 8px;
  scrollbar-width: auto;
  overflow-x: hidden;
  scroll-padding: 12px;
  background: var(--kl-bg);
}
.kl-chat-page .kl-messages:focus-visible { outline: 1px solid var(--kl-border-strong); outline-offset: -1px; }
.kl-chat-page .kl-messages > .kl-date-separator { gap: 12px; margin: 12px 4px 4px; font-size: var(--kl-type-xs); }
.kl-chat-page .kl-messages > .kl-date-separator:first-child { margin-top: 0; }
.kl-chat-page .kl-messages > .kl-date-separator::before,
.kl-chat-page .kl-messages > .kl-date-separator::after { background: var(--kl-border); opacity: 1; }
.kl-chat-page .kl-messages > .kl-chat-list-empty h3 { margin: 0; color: var(--kl-text); font-size: 13px; }
.kl-chat-page .kl-messages .kl-message-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  align-items: start;
  position: relative;
  gap: 10px;
  width: fit-content;
  max-width: min(92%, 680px);
  margin: 12px 0 0;
  padding: 5px 6px;
  border-radius: 6px;
}
.kl-chat-page .kl-messages .kl-message-row[data-direction="outgoing"] {
  grid-template-columns: minmax(0, 1fr) 36px;
  margin-left: auto;
}
.kl-chat-page .kl-messages .kl-message-row:is([data-group="middle"], [data-group="end"]) { margin-top: 0; padding-block: 2px; }
.kl-chat-page .kl-messages .kl-message-row:has(.kl-message-bubble[data-media="true"]) { width: min(92%, 460px); }
.kl-chat-page .kl-messages .kl-message-row:is(:hover, :focus-within) { background: color-mix(in srgb, var(--kl-text) 3%, transparent); }
.kl-chat-message-avatar-cell { grid-area: 1 / 1; min-width: 0; padding-top: 3px; }
.kl-chat-page .kl-message-row[data-direction="outgoing"] > .kl-chat-message-avatar-cell { grid-column: 2; }
.kl-chat-message-avatar-button {
  display: grid;
  place-items: center;
  width: 100%;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.kl-chat-message-avatar-button .kl-avatar { width: 32px; height: 32px; border-radius: 50%; font-size: 10px; }
.kl-chat-page .kl-message-row:is([data-group="middle"], [data-group="end"]) .kl-chat-message-avatar-cell { visibility: hidden; }
.kl-chat-message-heading { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 8px; min-width: 0; min-height: 24px; padding-inline-end: 64px; }
.kl-chat-page .kl-message-row[data-direction="outgoing"] .kl-chat-message-heading { justify-content: flex-end; padding-inline-end: 0; }
.kl-chat-message-author { display: inline-flex; align-items: center; gap: 4px; min-width: 0; min-height: 22px; max-width: 100%; margin: 0; padding: 0; border: 0; background: transparent; color: var(--kl-text); font-family: inherit; font-size: var(--kl-type-body); font-weight: 600; line-height: 1.5; text-align: start; white-space: normal; overflow-wrap: anywhere; cursor: pointer; }
.kl-chat-message-author:hover { text-decoration: underline; }
.kl-chat-message-author-name { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-chat-message-author-name[data-creator="true"] { color: var(--kl-gold); }
.kl-chat-message-administrator { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 14px; width: 14px; height: 14px; color: var(--kl-gold); }
.kl-chat-message-administrator .kl-icon { width: 14px; height: 14px; }
@supports (background-clip: text) or (-webkit-background-clip: text) {
  .kl-chat-message-author-name[data-creator="true"] { background-image: linear-gradient(100deg, #ed2844 0%, #df654c 35%, #d8b65d 73%, #c4a354 100%); background-clip: text; -webkit-background-clip: text; color: transparent; -webkit-text-fill-color: transparent; }
}
@media (forced-colors: active) {
  .kl-chat-message-author-name[data-creator="true"] { background: none; color: CanvasText; -webkit-text-fill-color: CanvasText; }
  .kl-chat-message-administrator { color: CanvasText; }
}
.kl-chat-page .kl-message-row:is([data-group="middle"], [data-group="end"]) .kl-chat-message-author {
  position: absolute;
  width: 1px;
  height: 1px;
  min-height: 0;
  overflow: hidden;
  clip-path: inset(50%);
}
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-message-row .kl-message-meta { flex-wrap: wrap; justify-content: flex-start; gap: 4px; min-width: 0; margin: 0; font-size: var(--kl-type-xs); font-weight: 400; line-height: 1.5; letter-spacing: normal; }
.kl-chat-page .kl-message-time { inline-size: auto; min-width: 0; text-align: start; }
.kl-chat-page .kl-message-stamp { display: inline-flex; align-items: center; gap: 4px; min-width: 0; transform: none; }
.kl-chat-page .kl-message-stamp > .kl-message-time { transform: none; }
.kl-chat-page .kl-message-stamp .kl-message-receipt { width: 18px; min-width: 18px; }
.kl-chat-page .kl-message-stamp .kl-message-receipt svg { width: 18px; }
.kl-chat-page .kl-message-stamp .kl-message-receipt[data-state="read"] { color: color-mix(in srgb, var(--kl-accent), white 12%); }
.kl-chat-page .kl-message-row:is([data-group="middle"], [data-group="end"]) .kl-chat-message-heading:not(:has(.kl-message-room, .kl-message-retry-actions)) {
  min-height: 0;
  height: 0;
  padding: 0;
}
.kl-chat-page .kl-message-row:is([data-group="middle"], [data-group="end"]) .kl-chat-message-heading:not(:has(.kl-message-room, .kl-message-retry-actions)) .kl-message-meta {
  position: absolute;
  inset-block-start: 5px;
  inset-inline-start: 0;
  width: 42px;
  justify-content: center;
  font-size: 8px;
  opacity: 0;
  pointer-events: none;
}
.kl-chat-page .kl-message-row[data-direction="outgoing"] .kl-chat-message-heading:not(:has(.kl-message-room, .kl-message-retry-actions)) .kl-message-meta {
  inset-inline: auto 0;
}
.kl-chat-page .kl-message-row:is([data-group="middle"], [data-group="end"]) .kl-chat-message-heading:not(:has(.kl-message-room, .kl-message-retry-actions)) .kl-message-stamp {
  flex-direction: column;
  gap: 1px;
}
.kl-chat-page .kl-message-row:is(:hover, :focus-within, [data-actions="true"]) .kl-chat-message-heading .kl-message-meta { opacity: 1; }
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-message-row[data-group] .kl-message-bubble {
  position: static;
  grid-area: 1 / 2;
  width: auto;
  max-width: 100%;
  border: 0;
  border-radius: 10px;
  padding: 6px 10px;
  overflow: visible;
  background: color-mix(in srgb, var(--kl-text) 5%, var(--kl-surface));
  font-size: calc(var(--kl-type-body) + 1px);
  line-height: 1.65;
}
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-message-row[data-direction="outgoing"] .kl-message-bubble {
  grid-column: 1;
  background: color-mix(in srgb, var(--kl-accent) 8%, var(--kl-surface));
}
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-message-row:is([data-group="middle"], [data-group="end"]) .kl-message-bubble { padding-block: 5px; }
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-message-row .kl-message-content { font-family: "KikiLink Emoji", var(--kl-font, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif); font-size: calc(var(--kl-type-body) + 1px); line-height: 1.65; }
.kl-chat-page .kl-message-row[data-direction="outgoing"] .kl-message-link { color: var(--kl-gold); }
.kl-chat-page .kl-message-row .kl-message-reply {
  display: block;
  margin: 4px 0 6px;
  padding: 3px 8px;
  border: 0;
  border-inline-start: 2px solid var(--kl-accent);
  border-radius: 3px;
  line-height: 1.6;
  white-space: normal;
}
.kl-chat-page .kl-message-row .kl-message-reply-icon { display: none; }
.kl-chat-page .kl-message-row .kl-message-reply-copy { display: grid; gap: 2px; }
.kl-chat-page .kl-message-row :is(.kl-message-reply-author, .kl-message-reply-excerpt) { color: var(--kl-muted); }
.kl-chat-page .kl-message-row .kl-message-reply-author { font-weight: 500; }
.kl-chat-page .kl-message-row .kl-message-reply-excerpt {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  white-space: normal;
  overflow-wrap: anywhere;
}
.kl-chat-page :is(.kl-message-row, .kl-group-message) .kl-message-reactions { min-width: 0; margin-top: 4px; }
.kl-chat-page :is(.kl-message-row[data-direction="outgoing"], .kl-group-message[data-own="true"]) .kl-message-reactions { justify-content: flex-end; }
.kl-chat-page :is(.kl-message-row, .kl-group-message) .kl-message-reactions > .kl-message-reaction {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 36px;
  min-height: 26px;
  height: 26px;
  padding: 2px 7px;
  border: 1px solid var(--kl-border);
  border-radius: 6px;
  background: var(--kl-surface);
  color: var(--kl-text);
  font-family: var(--kl-font, Inter, ui-sans-serif, system-ui, sans-serif);
  font-size: 11px;
  font-weight: 550;
  line-height: 1.5;
}
.kl-chat-page :is(.kl-message-row, .kl-group-message) .kl-message-reaction-emoji { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 20px; height: 20px; font: 18px/1 "KikiLink Emoji", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif; }
.kl-chat-page :is(.kl-message-row, .kl-group-message) .kl-message-reactions > .kl-message-reaction[aria-pressed="true"] {
  border-color: color-mix(in srgb, var(--kl-accent) 65%, var(--kl-border));
  background: color-mix(in srgb, var(--kl-accent) 16%, var(--kl-surface));
}
.kl-chat-page :is(.kl-message-row, .kl-group-message) .kl-message-reaction-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex: none;
  width: 28px;
  min-width: 28px;
  height: 26px;
  min-height: 26px;
  padding: 3px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--kl-muted);
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
}
.kl-chat-page :is(.kl-message-row, .kl-group-message) .kl-message-reaction-trigger .kl-icon { width: 13px; height: 13px; }
.kl-chat-page :is(.kl-message-row, .kl-group-message) .kl-message-reactions:has(> .kl-message-reaction-trigger:only-child) { height: 0; min-height: 0; margin: 0; }
.kl-chat-page :is(.kl-message-row, .kl-group-message) .kl-message-reaction-trigger:only-child { position: absolute; top: -8px; right: 72px; z-index: 3; width: 32px; min-width: 32px; height: 32px; min-height: 32px; border-color: var(--kl-border); background: var(--kl-surface-2); }
.kl-chat-page :is(.kl-message-row, .kl-group-message):is(:hover, :focus-within) .kl-message-reaction-trigger,
.kl-chat-page :is(.kl-message-row, .kl-group-message) .kl-message-reaction-trigger[aria-expanded="true"] { opacity: 1; pointer-events: auto; }
.kl-chat-page :is(.kl-message-row, .kl-group-message) .kl-message-reaction-trigger:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 2px; }
.kl-chat-page :is(.kl-message-row, .kl-group-message) .kl-message-reaction-trigger:disabled { opacity: .46; cursor: wait; }
.kl-chat-page .kl-message-row .kl-message-reaction-picker > summary {
  width: 28px;
  min-width: 28px;
  min-height: 26px;
  padding: 3px;
  border-radius: 6px;
  background: transparent;
}
.kl-chat-page :is(.kl-direct-private-images, .kl-group-message-images) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; width: 100%; max-width: none; min-width: 0; margin-top: 8px; }
.kl-chat-page :is(.kl-direct-private-images, .kl-group-message-images):has(> :only-child) { grid-template-columns: minmax(0, 1fr); }
.kl-chat-page :is(.kl-direct-private-images, .kl-group-message-images) > .kl-cloud-image-wrap { width: 100%; min-width: 0; overflow: hidden; }
.kl-panel[data-platform-preview="true"] .kl-chat-page :is(.kl-message-row:has(.kl-direct-private-images), .kl-group-message[data-media="true"]) .kl-message-bubble { width: 100%; }
.kl-chat-page :is(.kl-direct-private-images, .kl-group-message-images) .kl-cloud-full-image { display: flex; align-items: center; justify-content: center; position: relative; width: 100%; min-width: 0; height: 160px; min-height: 0; max-height: none; aspect-ratio: var(--kl-chat-image-ratio, 1.6); overflow: hidden; padding: 0; border: 1px solid var(--kl-border); border-radius: 7px; background: var(--kl-input-bg); color: var(--kl-muted); }
.kl-chat-page :is(.kl-direct-private-images, .kl-group-message-images) > .kl-cloud-image-wrap:only-child .kl-cloud-full-image { height: auto; max-height: 240px; }
.kl-chat-page :is(.kl-direct-private-images, .kl-group-message-images) .kl-cloud-full-image img.kl-cloud-image { display: block; width: 100%; min-width: 0; height: 100%; max-height: 160px; margin: 0; border-radius: 0; object-fit: contain; }
.kl-chat-page :is(.kl-direct-private-images, .kl-group-message-images) > .kl-cloud-image-wrap:only-child .kl-cloud-full-image img.kl-cloud-image { height: auto; min-height: 80px; }
.kl-chat-page :is(.kl-direct-private-images, .kl-group-message-images) .kl-cloud-full-image:hover { border-color: var(--kl-border-strong); }
.kl-chat-page .kl-message-row .kl-message-side-actions {
  position: absolute;
  z-index: 2;
  inset-block-start: -9px;
  inset-inline-end: 6px;
  gap: 0;
  padding: 2px;
  border: 1px solid var(--kl-border);
  border-radius: 6px;
  background: var(--kl-surface-2);
  box-shadow: 0 3px 10px #0002;
  transform: none;
}
.kl-chat-page .kl-message-row[data-direction="outgoing"] .kl-message-side-actions { inset-inline: 6px auto; }
.kl-chat-page .kl-message-row .kl-message-side-actions .kl-message-action { width: 28px; height: 28px; min-height: 28px; border-radius: 6px; }
.kl-chat-page .kl-message-row .kl-message-side-actions:has([aria-expanded="true"]) { opacity: 1; pointer-events: auto; transform: none; }
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-composer { max-height: 52%; padding: 8px; overscroll-behavior: contain; }
.kl-chat-page .kl-composer-reply {
  display: flex;
  flex: none;
  align-items: flex-start;
  align-self: stretch;
  gap: 8px;
  max-width: 100%;
  margin-bottom: 6px;
  padding: 4px 8px;
  border: 0;
  border-inline-start: 2px solid var(--kl-accent);
  border-radius: 4px;
  background: var(--kl-input-bg);
}
.kl-chat-page .kl-composer-reply > .kl-message-reply { display: block; flex: 1 1 auto; min-width: 0; margin: 0; padding: 0; border: 0; color: var(--kl-text); font-size: 10px; line-height: 1.5; white-space: normal; }
.kl-chat-page .kl-composer-reply .kl-message-reply-icon { display: none; }
.kl-chat-page .kl-composer-reply .kl-message-reply-copy { display: block; min-width: 0; }
.kl-chat-page .kl-composer-reply .kl-message-reply-author { display: block; color: var(--kl-text); font-size: 10px; line-height: 1.5; white-space: normal; overflow-wrap: anywhere; }
.kl-chat-page .kl-composer-reply .kl-message-reply-author::before { content: "Replying to "; }
.kl-chat-page .kl-composer-reply .kl-message-reply-excerpt { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; margin-top: 3px; overflow: hidden; color: var(--kl-muted); font-size: 10px; line-height: 1.6; white-space: normal; overflow-wrap: anywhere; }
.kl-chat-page .kl-composer-reply > .kl-reply-cancel { width: 32px; min-width: 32px; height: 32px; min-height: 32px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--kl-muted); }
.kl-chat-page .kl-composer-reply > .kl-reply-cancel .kl-icon { width: 16px; height: 16px; }
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-composer-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 4px;
  padding: 4px;
  align-items: end;
  border: 1px solid var(--kl-border);
  border-radius: 8px;
  background: var(--kl-input-bg);
}
.kl-chat-page .kl-composer-row:focus-within { border-color: var(--kl-border-strong); }
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-composer-row > .kl-composer-input {
  min-height: 36px;
  height: 36px;
  max-height: 128px;
  padding: 7px 4px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  font-size: calc(var(--kl-type-body) + 1px);
  line-height: 22px;
}
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-composer-row > :is(.kl-icon-button, .kl-send) {
  width: 32px;
  min-width: 32px;
  height: 36px;
  min-height: 36px;
  padding: 0;
  border-radius: 8px;
}
.kl-chat-page .kl-composer-row > :is(.kl-icon-button, .kl-send) .kl-icon { width: 17px; height: 17px; }
.kl-chat-page .kl-composer-row > .kl-chat-composer-tools .kl-icon { width: 19px; height: 19px; }
.kl-chat-page .kl-composer-row > .kl-attach-image { border-color: transparent; background: transparent; color: var(--kl-muted); }
.kl-chat-page .kl-composer-row .kl-send-label { display: none; }
.kl-chat-page .kl-counter { display: block; margin: 3px 4px 0; text-align: right; font-size: 10px; }
.kl-chat-page .kl-counter[hidden] { display: none; }
.kl-chat-page .kl-chat-inbox:has(> .kl-conversations:not([hidden], .kl-cloud-group-list) .kl-conversation[data-conversation-key]) .kl-group-list-empty { display: none; }
.kl-chat-page .kl-chat-list-row > .kl-cloud-group-row {
  grid-template-columns: 32px minmax(0, 1fr);
  min-height: 52px;
  gap: 10px;
  padding: 10px 8px;
  border: 0;
  background: transparent;
}
.kl-chat-page .kl-cloud-group-row .kl-group-inbox-avatar { width: 32px; height: 32px; border-radius: 50%; overflow: hidden; }
.kl-chat-page .kl-group-inbox-avatar .kl-group-inbox-mark { position: static; width: 16px; height: 16px; padding: 0; background: transparent; }
.kl-chat-page .kl-group-inbox-copy { display: block; }
.kl-chat-page .kl-group-inbox-copy > strong { display: block; font-size: 12px; font-weight: 550; line-height: 1.6; }
.kl-chat-page .kl-group-inbox-copy .kl-group-inbox-preview { display: block; margin-top: 3px; color: var(--kl-muted); font-size: 10px; line-height: 1.6; }
.kl-chat-page .kl-group-inbox-draft-label { color: var(--kl-accent-hover); }
.kl-chat-page .kl-group-inbox-meta { display: flex; align-items: center; gap: 4px; margin-top: 3px; }
.kl-chat-page .kl-group-inbox-status .kl-icon { width: 12px; height: 12px; }
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-group-header { min-height: 58px; padding: 8px 12px; background: var(--kl-surface); }
.kl-chat-page .kl-group-header .kl-group-identity { gap: 8px; cursor: inherit; }
.kl-chat-page .kl-group-identity-copy > h2 { margin: 0; font-size: 12px; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kl-chat-page .kl-group-subtitle { font-size: 10px; line-height: 1.6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kl-chat-page .kl-group-header-avatar { width: 32px; height: 32px; border-radius: 50%; }
.kl-chat-page .kl-group-header-avatar > .kl-icon { width: 16px; height: 16px; }
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-group-header .kl-social-icon-button { width: 32px; min-width: 32px; height: 32px; min-height: 32px; padding: 0; border-color: transparent; border-radius: 8px; background: transparent; color: var(--kl-muted); font-size: var(--kl-type-body); }
.kl-chat-page .kl-group-header .kl-social-icon-button:not(.kl-group-back) { border: 0; }
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-group-header .kl-social-icon-button:is(:hover, [aria-expanded="true"]) { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-chat-page .kl-group-header .kl-social-icon-button .kl-icon { width: 16px; height: 16px; }
.kl-panel[data-platform-preview="true"] .kl-chat-page .kl-cloud[data-embedded="true"] > .kl-cloud-body:has(> .kl-group-thread-preview) { container-type: size; --kl-group-composer-max-height: 52cqh; }
.kl-panel[data-platform-preview="true"] .kl-group-thread-preview .kl-group-history {
  display: block;
  padding: 12px 8px;
  scroll-padding: 12px;
  scrollbar-width: auto;
  scrollbar-gutter: stable;
  overflow-x: hidden;
  background: var(--kl-bg);
}
.kl-group-thread-preview .kl-group-history > .kl-group-load { display: flex; margin-inline: auto; }
.kl-group-thread-preview .kl-group-history > .kl-date-separator { gap: 12px; margin: 12px 4px 4px; font-size: 10px; }
.kl-group-thread-preview .kl-group-history > .kl-group-load[hidden] + .kl-date-separator { margin-top: 0; }
.kl-group-thread-preview .kl-date-separator::before,
.kl-group-thread-preview .kl-date-separator::after { background: var(--kl-border); opacity: 1; }
.kl-chat-page .kl-date-separator { line-height: 1.5; }
.kl-group-thread-preview .kl-group-history > .kl-group-empty { margin: 0; padding: 16px 8px; color: var(--kl-text); font-size: 13px; font-weight: 600; }
.kl-group-thread-preview .kl-group-message {
  grid-template-columns: 36px minmax(0, 1fr);
  grid-template-areas: none;
  grid-template-rows: auto;
  box-shadow: none;
  align-items: start;
  gap: 10px;
  width: fit-content;
  max-width: min(92%, 680px);
  margin-top: 12px;
  padding: 5px 6px;
  border-radius: 6px;
}
.kl-group-thread-preview .kl-group-message[data-own="true"] { grid-template-columns: minmax(0, 1fr) 36px; margin-left: auto; }
.kl-group-thread-preview .kl-group-message[data-media="true"] { width: min(92%, 460px); }
.kl-group-thread-preview .kl-group-message:is(:hover, :focus-within) { background: color-mix(in srgb, var(--kl-text) 3%, transparent); }
.kl-group-thread-preview .kl-group-message[data-grouped] { margin-top: 0; padding-block: 2px; }
.kl-group-thread-preview .kl-group-message:has(> .kl-social-author[hidden]) { display: none; }
.kl-cloud .kl-group-thread-preview .kl-group-message .kl-social-avatar-button { display: flex; align-items: center; justify-content: center; grid-area: 1 / 1; width: 36px; min-width: 36px; height: 36px; min-height: 36px; margin: 3px 0 0; padding: 0; border: 0; border-radius: 50%; background: transparent; color: inherit; cursor: pointer; }
.kl-cloud .kl-group-thread-preview .kl-group-message[data-own="true"] .kl-social-avatar-button { grid-area: 1 / 2; }
.kl-cloud .kl-group-thread-preview .kl-group-message .kl-social-avatar { display: grid; grid-area: auto; flex: none; width: 32px; min-width: 32px; height: 32px; min-height: 32px; margin: 0; }
.kl-cloud .kl-group-thread-preview .kl-group-message[data-grouped] .kl-social-avatar-button { display: none; }
.kl-group-thread-preview .kl-group-message-line { grid-area: 1 / 2; width: 100%; }
.kl-group-thread-preview .kl-group-message[data-own="true"] .kl-group-message-line { grid-area: 1 / 1; }
.kl-panel[data-platform-preview="true"] .kl-group-thread-preview .kl-group-message .kl-group-message-bubble { position: static; max-width: 100%; padding: 6px 10px; border: 0; border-radius: 10px; background: color-mix(in srgb, var(--kl-text) 5%, var(--kl-surface)); color: var(--kl-text); }
.kl-panel[data-platform-preview="true"] .kl-group-thread-preview .kl-group-message[data-own="true"] .kl-group-message-bubble { background: color-mix(in srgb, var(--kl-accent) 8%, var(--kl-surface)); }
.kl-panel[data-platform-preview="true"] .kl-group-thread-preview .kl-group-message[data-grouped] .kl-group-message-bubble { padding-block: 5px; }
.kl-panel[data-platform-preview="true"] .kl-group-thread-preview .kl-group-message .kl-group-message-text { font-family: "KikiLink Emoji", var(--kl-font, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif); font-size: 13px; line-height: 1.65; }
.kl-group-thread-preview .kl-group-message .kl-social-author-copy { align-items: center; gap: 2px 8px; min-height: 24px; margin: 0; padding-right: 64px; }
.kl-group-thread-preview .kl-group-message[data-own="true"] .kl-social-author-copy { padding-right: 0; }
.kl-panel[data-platform-preview="true"] .kl-group-thread-preview .kl-group-message .kl-social-meta { display: flex; align-items: center; margin: 0; color: var(--kl-muted); font-size: 10px; font-weight: 400; line-height: 1.5; letter-spacing: normal; }
.kl-cloud .kl-group-thread-preview .kl-group-message .kl-social-name { min-height: 22px; font-size: 12px; font-weight: 600; line-height: 1.5; }
.kl-group-thread-preview .kl-group-message[data-grouped] .kl-social-author-copy { min-height: 0; height: 0; padding: 0; }
.kl-group-thread-preview .kl-group-message[data-grouped] .kl-social-author-name { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip-path: inset(50%); }
.kl-panel[data-platform-preview="true"] .kl-group-thread-preview .kl-group-message[data-grouped] .kl-social-meta {
  position: absolute;
  top: 5px;
  left: 0;
  justify-content: center;
  width: 42px;
  opacity: 0;
  font-size: 8px;
  pointer-events: none;
}
.kl-panel[data-platform-preview="true"] .kl-group-thread-preview .kl-group-message[data-own="true"][data-grouped] .kl-social-meta { right: 0; left: auto; }
.kl-group-thread-preview .kl-group-message[data-grouped]:is(:hover, :focus-within) .kl-social-meta { opacity: 1; }
.kl-group-thread-preview .kl-group-message .kl-social-meta .kl-message-stamp { display: inline-flex; align-items: center; gap: 4px; }
.kl-group-thread-preview .kl-group-message[data-grouped] .kl-social-meta .kl-message-stamp { flex-direction: column; gap: 1px; }
.kl-group-thread-preview .kl-group-message .kl-message-side-actions {
  position: absolute;
  z-index: 2;
  top: -9px;
  right: 6px;
  gap: 0;
  padding: 2px;
  border: 1px solid var(--kl-border);
  border-radius: 6px;
  background: var(--kl-surface-2);
  box-shadow: 0 3px 10px #0002;
  transform: none;
}
.kl-group-thread-preview .kl-group-message[data-own="true"] .kl-message-side-actions { right: auto; left: 6px; transform: none; }
.kl-group-thread-preview .kl-group-message .kl-message-action { width: 28px; height: 28px; min-height: 28px; }
.kl-panel[data-platform-preview="true"] .kl-group-thread-preview .kl-group-composer { gap: 0; max-height: var(--kl-group-composer-max-height, 52%); padding: 8px; overflow-y: auto; overscroll-behavior: contain; }
.kl-group-thread-preview .kl-group-compose-main { gap: 4px; align-items: end; padding: 4px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg); }
.kl-group-thread-preview .kl-group-compose-main:focus-within { border-color: var(--kl-border-strong); }
.kl-panel[data-platform-preview="true"] .kl-cloud .kl-group-thread-preview .kl-group-input { min-height: 36px; height: 36px; max-height: 128px; padding: 7px 4px; border: 0; border-radius: 0; background: transparent; box-shadow: none; font-size: 13px; line-height: 22px; resize: none; }
.kl-group-thread-preview .kl-group-compose-main > button { width: 32px; min-width: 32px; height: 36px; min-height: 36px; padding: 0; border-radius: 7px; }
.kl-group-thread-preview .kl-group-compose-main > .kl-social-icon-button { border-color: transparent; background: transparent; color: var(--kl-muted); }
.kl-group-thread-preview .kl-group-compose-main > .kl-social-icon-button:hover { background: var(--kl-surface-hover); }
.kl-group-thread-preview .kl-group-compose-main > button .kl-icon { width: 17px; height: 17px; }
.kl-group-thread-preview .kl-group-composer > :is(.kl-composer-reply, .kl-group-attachments:not(:empty), .kl-audio-draft:not(:empty)) { margin-bottom: 6px; }
.kl-group-thread-preview .kl-group-send-icon > span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.kl-group-thread-preview .kl-group-compose-actions { justify-content: flex-end; margin: 3px 4px 0; }
.kl-group-thread-preview .kl-group-compose-actions:has(> [hidden]) { display: none; }
.kl-group-thread-preview .kl-group-upload:has(.kl-group-upload-status:empty):has(button[hidden] + button[hidden]) { display: none; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-panel[data-platform-preview="true"] .kl-chat-page { grid-template-columns: minmax(0, 1fr); padding: 12px; }
  .kl-chat-page-header { margin-bottom: 8px; }
  .kl-panel[data-platform-preview="true"][data-mobile-view="chat"] .kl-chat-page { grid-template-rows: minmax(0, 1fr); }
  .kl-panel[data-platform-preview="true"][data-mobile-view="chat"] .kl-chat-page-header { display: none; }
  .kl-panel[data-platform-preview="true"] .kl-chat-page :is(.kl-sidebar, .kl-main) { border: 1px solid var(--kl-border); border-radius: 8px; }
  .kl-chat-page-actions .kl-chat-page-new { min-height: 40px; height: 40px; }
  .kl-chat-page .kl-chat-page-actions .kl-icon-button { height: 40px; min-height: 40px; }
  .kl-chat-search-field { height: 40px; }
  .kl-chat-unread-only { font-size: 11px; }
  .kl-chat-page .kl-chat-header > .kl-avatar { display: none; }
  .kl-panel[data-platform-preview="true"] .kl-chat-page :is(.kl-chat-header, .kl-group-header) { gap: 7px; }
  .kl-panel[data-platform-preview="true"] .kl-chat-page .kl-chat-header .kl-icon-button { width: 36px; min-width: 36px; height: 36px; min-height: 36px; }
  .kl-panel[data-platform-preview="true"] .kl-chat-page .kl-group-header .kl-social-icon-button { width: 36px; min-width: 36px; height: 36px; min-height: 36px; }
  .kl-panel[data-platform-preview="true"] .kl-chat-page :is(.kl-chat-header > .kl-back, .kl-group-header > .kl-group-back) {
    height: 40px;
    min-height: 40px;
    padding: 0;
    border-color: var(--kl-border);
    border-radius: 8px;
    background: var(--kl-surface-2);
  }
  .kl-chat-page .kl-chat-list-row > .kl-chat-row-options { width: 40px; min-width: 40px; height: 40px; min-height: 40px; }
  .kl-panel[data-platform-preview="true"] .kl-chat-page .kl-messages { padding: 10px 4px; }
  .kl-chat-page .kl-messages .kl-message-row {
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 8px;
    max-width: 100%;
    padding: 5px 4px;
  }
  .kl-chat-page .kl-messages .kl-message-row[data-direction="outgoing"] { grid-template-columns: minmax(0, 1fr) 32px; gap: 10px; padding-inline: 6px; }
  .kl-chat-page .kl-chat-message-avatar-cell { box-sizing: border-box; height: 36px; min-height: 36px; }
  .kl-chat-page .kl-chat-message-heading { min-height: 26px; padding-inline-end: 0; }
  .kl-chat-page .kl-message-row:is([data-group="middle"], [data-group="end"]) .kl-chat-message-heading:not(:has(.kl-message-room, .kl-message-retry-actions)) .kl-message-meta { inset-inline-start: -2px; width: 36px; }
  .kl-chat-page .kl-message-row[data-direction="outgoing"]:is([data-group="middle"], [data-group="end"]) .kl-chat-message-heading:not(:has(.kl-message-room, .kl-message-retry-actions)) .kl-message-meta { inset-inline: auto -2px; }
  .kl-panel[data-platform-preview="true"] .kl-chat-page .kl-message-row[data-group] .kl-message-bubble { padding-inline-end: 10px; }
  .kl-panel[data-platform-preview="true"] .kl-chat-page .kl-message-row[data-direction="outgoing"] .kl-message-bubble { padding-inline: 34px 8px; }
  .kl-chat-page .kl-message-row .kl-message-side-actions {
    inset-block-start: 3px;
    inset-inline-end: 1px;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
    opacity: 1;
    pointer-events: auto;
    transform: none;
  }
  .kl-chat-page .kl-message-row[data-direction="outgoing"] .kl-message-side-actions { inset-inline: 1px auto; }
  .kl-chat-page .kl-message-row .kl-message-side-actions .kl-message-action { width: 36px; height: 36px; min-height: 36px; }
  .kl-chat-page .kl-message-row .kl-message-side-actions .kl-message-action:not(.kl-message-options) { display: none; }
  .kl-chat-page :is(.kl-message-row, .kl-group-message) :is(.kl-message-reactions > .kl-message-reaction, .kl-message-reaction-trigger, .kl-message-reaction-picker > summary) { min-height: 32px; height: 32px; }
  .kl-chat-page :is(.kl-message-row, .kl-group-message) .kl-message-reactions > .kl-message-reaction { min-height: 40px; height: 40px; }
  .kl-chat-page :is(.kl-message-row, .kl-group-message) .kl-message-reaction-trigger:not(:only-child) { min-height: 40px; height: 40px; }
  .kl-chat-page :is(.kl-message-row, .kl-group-message) .kl-message-reaction-trigger { opacity: 1; pointer-events: auto; }
  .kl-chat-page :is(.kl-message-row, .kl-group-message) .kl-message-reaction-trigger:only-child { top: 3px; right: 39px; width: 28px; min-width: 28px; height: 28px; min-height: 28px; border: 0; background: transparent; opacity: 0; }
  .kl-chat-page :is(.kl-message-row, .kl-group-message):focus-within .kl-message-reaction-trigger:only-child,
  .kl-chat-page :is(.kl-message-row, .kl-group-message) .kl-message-reaction-trigger:only-child[aria-expanded="true"] { opacity: 1; }
  .kl-panel[data-platform-preview="true"] .kl-chat-page .kl-composer { padding: 6px; }
  .kl-chat-page .kl-composer-reply > .kl-reply-cancel { width: 40px; min-width: 40px; height: 40px; min-height: 40px; }
  .kl-panel[data-platform-preview="true"] .kl-chat-page .kl-composer-row { padding: 2px; gap: 0; }
  .kl-panel[data-platform-preview="true"] .kl-chat-page .kl-composer-row > :is(.kl-icon-button, .kl-send) { width: 36px; min-width: 36px; height: 40px; min-height: 40px; }
  .kl-panel[data-platform-preview="true"] .kl-chat-page .kl-composer-row > .kl-composer-input { min-height: 40px; padding-block: 8px; font-size: max(16px, var(--kl-type-body)); }
  .kl-chat-page .kl-group-header { display: flex; }
  .kl-chat-page .kl-group-header-avatar { display: none; }
  .kl-chat-page .kl-group-header .kl-group-back { display: inline-flex; }
  .kl-chat-page .kl-chat-archive-footer:not([hidden]) { padding: 10px; }
  .kl-panel[data-platform-preview="true"] .kl-group-thread-preview .kl-group-history { padding: 10px 4px; }
  .kl-group-thread-preview .kl-group-message { grid-template-columns: 32px minmax(0, 1fr); gap: 8px; max-width: 100%; padding-inline: 4px; }
  .kl-group-thread-preview .kl-group-message[data-own="true"] { grid-template-columns: minmax(0, 1fr) 32px; gap: 10px; padding-inline: 6px; }
  .kl-cloud .kl-group-thread-preview .kl-group-message .kl-social-avatar-button { width: 32px; min-width: 32px; }
  .kl-cloud .kl-group-thread-preview .kl-group-message[data-grouped] .kl-social-avatar-button { display: flex; height: 36px; min-height: 36px; margin: 0; visibility: hidden; }
  .kl-group-thread-preview .kl-group-message .kl-social-author-copy { min-height: 26px; padding-right: 0; }
  .kl-group-thread-preview .kl-group-message[data-grouped] .kl-social-author-copy { min-height: 0; }
  .kl-panel[data-platform-preview="true"] .kl-group-thread-preview .kl-group-message[data-grouped] .kl-social-meta { left: -2px; width: 36px; }
  .kl-panel[data-platform-preview="true"] .kl-group-thread-preview .kl-group-message[data-own="true"][data-grouped] .kl-social-meta { right: -2px; left: auto; }
  .kl-panel[data-platform-preview="true"] .kl-group-thread-preview .kl-group-message[data-own="true"] .kl-group-message-bubble { padding-right: 8px; padding-left: 34px; }
  .kl-group-thread-preview .kl-group-message .kl-message-side-actions { top: 3px; right: 1px; padding: 0; border: 0; background: transparent; box-shadow: none; opacity: 1; pointer-events: auto; }
  .kl-group-thread-preview .kl-group-message[data-own="true"] .kl-message-side-actions { right: auto; left: 1px; }
  .kl-group-thread-preview .kl-group-message .kl-message-side-actions > .kl-message-action:not(.kl-message-options) { display: none; }
  .kl-group-thread-preview .kl-group-message .kl-message-side-actions > .kl-message-options { width: 36px; min-height: 36px; height: 36px; }
  .kl-panel[data-platform-preview="true"] .kl-group-thread-preview .kl-group-composer { padding: 6px; }
  .kl-group-thread-preview .kl-group-compose-main { padding: 2px; gap: 0; }
  .kl-group-thread-preview .kl-group-compose-main > button { width: 36px; min-width: 36px; min-height: 40px; height: 40px; }
  .kl-panel[data-platform-preview="true"] .kl-cloud .kl-group-thread-preview .kl-group-input { min-height: 40px; padding-block: 8px; font-size: 16px; }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-panel[data-platform-preview="true"] .kl-chat-page { padding-block: 6px; }
  .kl-chat-page .kl-composer-reply { width: fit-content; align-self: center; margin-inline: auto; }
  .kl-chat-page-header { margin-bottom: 4px; }
  .kl-panel[data-platform-preview="true"] .kl-chat-page :is(.kl-chat-header, .kl-group-header) { min-height: 42px; padding-block: 4px; }
  .kl-chat-page .kl-chat-subline { display: none; }
  .kl-panel[data-platform-preview="true"] .kl-chat-page .kl-composer { max-height: 46%; padding: 4px; }
  .kl-panel[data-platform-preview="true"] .kl-chat-page .kl-composer-row > :is(.kl-icon-button, .kl-send) { height: 40px; min-height: 40px; }
  .kl-panel[data-platform-preview="true"] .kl-chat-page .kl-composer-row > .kl-attach-image { height: 36px; min-height: 36px; }
  .kl-panel[data-platform-preview="true"] .kl-chat-page .kl-composer-row > .kl-composer-input { min-height: 36px; max-height: 76px; padding-block: 7px; font-size: 13px; }
  .kl-chat-page .kl-group-subtitle { display: none; }
  .kl-chat-page .kl-chat-archive-footer:not([hidden]) { padding: 6px 8px; }
  .kl-panel[data-platform-preview="true"] .kl-chat-page .kl-cloud[data-embedded="true"] > .kl-cloud-body:has(> .kl-group-thread-preview) { --kl-group-composer-max-height: 46cqh; }
  .kl-panel[data-platform-preview="true"] .kl-group-thread-preview .kl-group-composer { max-height: var(--kl-group-composer-max-height, 46%); padding: 4px; }
  .kl-panel[data-platform-preview="true"] .kl-group-thread-preview .kl-group-compose-main > button { min-height: 40px; height: 40px; }
  .kl-panel[data-platform-preview="true"] .kl-group-thread-preview .kl-group-compose-main > .kl-social-icon-button:not(.kl-group-compose-tools) { min-height: 36px; height: 36px; }
  .kl-panel[data-platform-preview="true"] .kl-cloud .kl-group-thread-preview .kl-group-input { min-height: 36px; height: 36px; }
  .kl-panel[data-platform-preview="true"] .kl-cloud .kl-group-thread-preview .kl-group-input { max-height: 76px; padding-block: 7px; font-size: 13px; }
}
@media (pointer: coarse) {
  .kl-chat-page :is(.kl-message-row, .kl-group-message) :is(.kl-message-reactions > .kl-message-reaction, .kl-message-reaction-trigger, .kl-message-reaction-picker > summary) {
    min-width: 44px;
    min-height: 44px;
  }
}
@media (pointer: coarse) { .kl-chat-page .kl-chat-archive-footer > button { min-height: 44px; } }

.kl-chat-options-menu:is(.kl-shell-menu, .kl-cloud-group-menu, .kl-group-message-menu) {
  width: 230px;
  max-width: var(--kl-surface-width, calc(100vw - 16px));
  max-height: var(--kl-surface-height, calc(100dvh - 16px));
  padding: 4px;
  border-radius: 10px;
  background: var(--kl-surface-2);
  box-shadow: 0 8px 24px #0005;
  overscroll-behavior: contain;
}
.kl-group-thread-preview > .kl-group-message-menu { max-width: calc(100% - 16px); }
.kl-chat-options-menu::backdrop { background: transparent; }
.kl-chat-options-menu > :is(.kl-shell-menu-item, button[role="menuitem"]) {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  width: 100%;
  min-width: 0;
  min-height: 32px;
  height: auto;
  padding: 9px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--kl-text);
  font-family: inherit;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.5;
  text-align: start;
}
.kl-chat-options-menu > button > svg { width: 14px; height: 14px; flex: none; color: var(--kl-muted); }
.kl-chat-options-menu > button > span { min-width: 0; overflow-wrap: anywhere; }
.kl-chat-options-menu > button:not(:disabled):is(:hover, :focus-visible) { background: color-mix(in srgb, var(--kl-gold) 9%, transparent); }
.kl-chat-options-menu > button:disabled { opacity: .46; cursor: not-allowed; }
.kl-chat-emoji-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; padding: 4px; }
.kl-chat-emoji-grid > .kl-shell-menu-item, .kl-chat-menu-quick-actions > .kl-shell-menu-item {
  display: inline-flex;
  justify-content: center;
  border: 1px solid var(--kl-border);
  border-radius: 8px;
}
.kl-chat-emoji-grid > .kl-shell-menu-item { min-width: 38px; min-height: 38px; padding: 4px; }
.kl-chat-emoji-grid img { display: block; width: 18px; height: 18px; object-fit: contain; }
.kl-chat-menu-quick-actions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--kl-border); }
.kl-chat-menu-quick-label { width: 100%; padding: 0 4px 4px; color: var(--kl-muted); font-size: 10px; }
.kl-chat-menu-quick-actions > .kl-shell-menu-item { width: auto; min-height: 30px; max-width: 100%; padding: 4px 10px; font-size: 11px; }
.kl-chat-menu-quick-actions > button > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 700px), (max-width: 900px) and (max-height: 500px), (pointer: coarse) {
  .kl-chat-options-menu > :is(.kl-shell-menu-item, button[role="menuitem"]),
  .kl-chat-emoji-grid > .kl-shell-menu-item { min-height: 40px; }
}
.kl-message-reaction-menu.kl-chat-options-menu { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 4px; padding: 8px; }
.kl-message-reaction-menu.kl-chat-options-menu[open] { display: grid; }
.kl-message-reaction-menu.kl-chat-options-menu > .kl-shell-menu-item { display: inline-flex; justify-content: center; min-width: 32px; min-height: 36px; height: 36px; padding: 4px; border: 1px solid var(--kl-border); border-radius: 6px; background: transparent; }
.kl-message-reaction-menu.kl-chat-options-menu > .kl-shell-menu-item > span { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 20px; height: 20px; font: 18px/1 "KikiLink Emoji", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif; }
.kl-message-reaction-menu.kl-chat-options-menu > .kl-shell-menu-item:is(:hover, :focus-visible) { border-color: var(--kl-border-strong); background: var(--kl-surface-hover); }
.kl-message-reaction-menu.kl-chat-options-menu > .kl-shell-menu-item[aria-checked="true"] { border-color: color-mix(in srgb, var(--kl-accent) 38%, transparent); background: color-mix(in srgb, var(--kl-accent) 9%, transparent); }
.kl-message-reaction-menu.kl-chat-options-menu > .kl-shell-menu-item[aria-checked="true"]::after { content: none; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-message-reaction-menu.kl-chat-options-menu > .kl-shell-menu-item { min-height: 40px; height: 40px; }
}

.kl-dialog.kl-content-dialog:has(.kl-thread-context) {
  box-sizing: border-box; width: 320px; height: var(--kl-dialog-viewport-height,100dvh);
  margin: 0 0 0 auto; border: 0; border-left: 1px solid var(--kl-border-strong); border-radius: 0;
  background: var(--kl-surface); box-shadow: -12px 0 40px #0006;
}
.kl-content-dialog:has(.kl-thread-context) > .kl-dialog-header { padding: 12px 16px; background: var(--kl-surface); }
.kl-content-dialog:has(.kl-thread-context) .kl-dialog-title { font: 700 16px/1.4 var(--kl-title-font,system-ui); }
.kl-content-dialog:has(.kl-thread-context) .kl-dialog-title::before { content: "KIKILINK"; display: block; margin-bottom: 3px; color: var(--kl-meta); font: 10px/1.7 var(--kl-font,system-ui); }
.kl-content-dialog:has(.kl-thread-context) > .kl-dialog-body { padding: 16px; }
.kl-thread-context h3 { margin: 0; font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.kl-thread-context p { margin: 7px 0 0; color: var(--kl-muted); font-size: 10px; line-height: 1.7; overflow-wrap: anywhere; }
.kl-thread-context > button { margin-top: 12px; font-size: 11px; }
.kl-thread-context hr { border: 0; border-top: 1px solid var(--kl-border); margin: 16px 0; }
.kl-thread-context-pin { padding: 10px 0; border-bottom: 1px solid var(--kl-border); }
.kl-thread-context-pin strong { color: var(--kl-gold); font-size: 10px; }
.kl-thread-settings { padding: 0; background: transparent; color: var(--kl-gold); border: 0; cursor: pointer; text-align: left; font: inherit; }
.kl-message-local-pin svg { width: 12px; height: 12px; color: var(--kl-gold); }
.kl-thread-reactors { display: grid; gap: 6px; }
.kl-thread-reactors p { color: var(--kl-muted); font-size: 11px; }
.kl-thread-reactor { display: flex; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--kl-border); }
.kl-thread-reactor strong { flex: 1; }
.kl-content-dialog:has(.kl-thread-context):not([data-chat-context-narrow]) > .kl-dialog-header { padding-block: 10.5px; }
.kl-thread-context > .kl-text-button { min-height: 36px; height: 36px; }
.kl-thread-settings { min-height: 17px; line-height: 17px; }
.kl-content-dialog[data-chat-context-narrow]:has(.kl-thread-context) > .kl-dialog-header { min-height: 0; padding: 8px 12px; }
.kl-content-dialog[data-chat-context-narrow]:has(.kl-thread-context) > .kl-dialog-body { padding: 12px; }
.kl-content-dialog[data-chat-context-narrow] .kl-thread-context > .kl-text-button { min-height: 40px; height: 40px; }
`;
