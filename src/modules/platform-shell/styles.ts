/** Preview-scoped rules; stable 1.x tokens, user accent and workspace styles remain authoritative. */
export const PLATFORM_SHELL_STYLES = `
.kl-legacy-profile-badge { position: relative; display: inline-flex; align-items: center; justify-content: center; flex: none; width: 24px; height: 24px; padding: 2px; border: 0; border-radius: 5px; color: var(--kl-gold, #d6a24b); background: transparent; outline-offset: 2px; }
.kl-legacy-badge-mark { display: block; width: 22px; height: 22px; flex: none; }
.kl-legacy-profile-badge:hover, .kl-legacy-profile-badge:focus-visible { background: var(--kl-surface-hover); }
.kl-legacy-profile-badge:focus-visible { outline: 2px solid var(--kl-accent); }
.kl-legacy-profile-badge::after { content: attr(aria-label); position: absolute; z-index: 5; top: calc(100% + 6px); left: 0; display: none; width: max-content; max-width: 170px; padding: 6px 8px; border: 1px solid var(--kl-border); border-radius: 6px; background: var(--kl-surface); box-shadow: var(--kl-shadow); color: var(--kl-text); font-size: 11px; font-weight: 400; }
.kl-legacy-profile-badge:hover::after, .kl-legacy-profile-badge:focus-visible::after { display: block; }
.kl-legacy-badge-field { display: flex; align-items: center; gap: 16px; padding: 16px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-surface); }
.kl-legacy-badge-field[hidden] { display: none; }
.kl-legacy-badge-emblem { display: grid; place-items: center; width: 62px; height: 62px; flex: none; border: 1px solid var(--kl-border); border-radius: 50%; color: var(--kl-gold, #d6a24b); }
.kl-legacy-badge-emblem .kl-legacy-badge-mark { width: 40px; height: 40px; }
.kl-legacy-badge-copy { display: grid; gap: 5px; min-width: 0; overflow-wrap: anywhere; }
@media(max-width: 540px) { .kl-legacy-badge-field { gap: 10px; padding: 12px; } .kl-legacy-badge-emblem { width: 48px; height: 48px; } .kl-legacy-badge-emblem .kl-legacy-badge-mark { width: 34px; height: 34px; } }

.kl-panel[data-platform-preview="true"] {
  width: min(1220px, calc(100vw - 32px));
  height: min(760px, calc(100dvh - 110px));
  grid-template-rows: 56px minmax(0, 1fr);
  border: 0;
  border-radius: 12px;
  container-type: size;
  background: var(--kl-panel-art), var(--kl-panel-bg);
}
.kl-toast { animation: none; }
@media (prefers-reduced-motion: no-preference) {
  :host(:not([data-reduced-motion="true"])) dialog[open] {
    animation: kl-platform-overlay-in 150ms cubic-bezier(.2,.7,.3,1);
  }
  :host(:not([data-reduced-motion="true"])) dialog[open]::backdrop {
    animation: kl-platform-backdrop-in 130ms ease-out;
  }
  :host(:not([data-reduced-motion="true"])) :is(dialog[open]:is([role="menu"], .kl-mailbox-popover, .kl-profile-menu-layer, .kl-group-menu-layer, .kl-launcher-menu), .kl-group-message-menu:not([hidden]), .kl-toast) {
    animation: kl-platform-overlay-in 150ms ease-out;
  }
  :host(:not([data-reduced-motion="true"])) .kl-mention-picker:not([hidden]) {
    animation: kl-platform-mention-in 140ms ease-out;
  }
}
@keyframes kl-platform-overlay-in {
  from { opacity: .45; translate: 0 4px; }
  to { opacity: 1; translate: none; }
}
@keyframes kl-platform-backdrop-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes kl-platform-mention-in {
  from { opacity: 0; translate: 0 3px; }
  to { opacity: 1; translate: none; }
}
.kl-panel[data-platform-preview="true"]::after { z-index: 1; box-shadow: inset 0 0 0 1px var(--kl-border), inset 0 1px rgba(255, 255, 255, 0.045); }
.kl-panel[data-platform-preview="true"] .kl-shell { grid-template-columns: 64px 172px minmax(0, 1fr); }
.kl-panel[data-platform-preview="true"] .kl-topbar { gap: 8px; padding: 0 12px; background: var(--kl-surface); }
.kl-panel[data-platform-preview="true"] .kl-topbar::after { display: none; }
.kl-panel[data-platform-preview="true"] .kl-brand { flex: 0 0 auto; }
.kl-panel[data-platform-preview="true"] .kl-brand-title { font-size: 14px; letter-spacing: .035em; }
.kl-panel[data-platform-preview="true"] .kl-brand-subtitle { font-size: 10px; gap: 4px; }
.kl-panel[data-platform-preview="true"] .kl-brand-product,
.kl-panel[data-platform-preview="true"] .kl-brand-build,
.kl-panel[data-platform-preview="true"] .kl-topbar-context,
.kl-panel[data-platform-preview="true"] .kl-news-trigger { display: none; }
.kl-panel[data-platform-preview="true"] .kl-brand-emblem { width: 32px; height: 32px; border-radius: 9px; box-shadow: none; }
.kl-panel[data-platform-preview="true"] .kl-icon-button,
.kl-panel[data-platform-preview="true"] .kl-finder-trigger { width: 34px; height: 34px; min-height: 34px; padding: 7px; border-radius: 8px; }
.kl-panel[data-platform-preview="true"] .kl-finder-trigger { display: inline-flex; width: auto; }
.kl-panel[data-platform-preview="true"] .kl-presence-trigger { display: flex; height: 40px; min-height: 40px; border-radius: 8px; }
.kl-panel[data-platform-preview="true"] .kl-presence-trigger-avatar { border-radius: 50%; }
.kl-platform-rail, .kl-platform-context { min-height: 0; min-width: 0; overscroll-behavior: contain; scrollbar-width: thin; }
.kl-platform-rail { display: flex; flex-direction: column; gap: 4px; padding: 8px 5px; overflow-y: auto; border-right: 1px solid var(--kl-border); background: var(--kl-bg); }
.kl-platform-area { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 0 0 auto; gap: 4px; min-width: 0; min-height: 52px; width: 100%; padding: 6px 2px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--kl-muted); cursor: pointer; transition: background 140ms ease, color 140ms ease; }
.kl-platform-area > .kl-icon { width: 19px; height: 19px; }
.kl-platform-area-label { font-size: 10px; line-height: 1.2; font-weight: 600; white-space: nowrap; }
.kl-platform-area[data-area="settings"] { margin-top: auto; }
.kl-platform-area:hover, .kl-platform-link:hover { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-platform-area[aria-current="page"] { color: var(--kl-text); background: color-mix(in srgb, var(--kl-accent), transparent 88%); }
.kl-platform-area[aria-current="page"]::before { position: absolute; content: ""; width: 3px; height: 23px; left: -8px; top: 12px; border-radius: 0 3px 3px 0; background: var(--kl-accent); }
.kl-platform-area:focus-visible, .kl-platform-link:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: -2px; }
.kl-platform-context { display: flex; flex-direction: column; gap: 8px; padding: 16px 8px 8px; overflow-y: auto; border-right: 1px solid var(--kl-border); background: var(--kl-surface); }
.kl-platform-context-title { margin: 0 8px 4px; font-size: 14px; line-height: 20px; font-weight: 700; }
.kl-platform-links { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.kl-platform-link { position: relative; display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0; min-height: 36px; padding: 7px 8px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--kl-muted); text-align: left; cursor: pointer; font-size: 12px; line-height: 18px; transition: background 140ms ease, color 140ms ease; }
.kl-platform-link > .kl-icon { flex: 0 0 16px; width: 16px; height: 16px; }
.kl-platform-link > span:not(.kl-roster-count) { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-platform-link[aria-current="page"] { color: var(--kl-text); border-color: var(--kl-border); background: var(--kl-surface-2); }
.kl-platform-link > .kl-roster-count { position: static; margin-left: auto; flex: 0 0 auto; }
.kl-platform-area > .kl-roster-count { position:absolute; top:4px; right:6px; inline-size:8px; min-inline-size:8px; block-size:8px; min-block-size:8px; padding:0; border-radius:50%; font-size:0; line-height:0; }
.kl-panel[data-platform-preview="true"] .kl-layout { grid-template-columns: 234px minmax(0, 1fr); }
.kl-panel[data-platform-preview="true"] .kl-sidebar { width: auto; }
.kl-panel[data-platform-preview="true"] .kl-chat-filters { gap: 4px; }
.kl-panel[data-platform-preview="true"] .kl-feature-page-title { font-family: inherit; font-size: var(--kl-type-xl); }
.kl-panel[data-platform-preview="true"] .kl-feature-page-header { padding: 12px 16px; background: transparent; }
/* The local Overview tools use the same panel and control sizes as Home. */
.kl-home.kl-home--overview { padding: 20px; scrollbar-gutter: stable; }
.kl-home--overview .kl-home-hero {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px;
  min-height: 0; margin-bottom: 20px; padding: 0;
  border: 0; border-radius: 0; background: none; box-shadow: none; overflow: visible;
}
.kl-home--overview .kl-home-mark,
.kl-home--overview .kl-home-hero::before,
.kl-home--overview .kl-feature-card::before { display: none; }
.kl-home--overview :is(.kl-home-title, .kl-home-next-title, .kl-feature-card-title, .kl-home-section-heading h2) {
  font-family: inherit; font-weight: 650; line-height: 1.3; overflow-wrap: anywhere;
}
.kl-home--overview .kl-home-title { font-size: var(--kl-type-xl); letter-spacing: -.3px; }
.kl-home--overview .kl-home-lead { line-height: 1.6; }
.kl-home--overview .kl-home-statuses { gap: 6px; margin-top: 12px; }
.kl-home--overview .kl-home-status {
  min-width: 0; min-height: 28px; padding: 3px 8px;
  border-radius: 8px; background: var(--kl-input-bg);
}
.kl-home--overview .kl-home-status-value { font-weight: 600; }
.kl-home--overview .kl-home-next {
  grid-template-columns: 36px minmax(0, 1fr); gap: 8px 10px;
  padding: 14px; border-color: var(--kl-border); border-radius: 10px;
  background: var(--kl-surface); box-shadow: none;
}
.kl-home--overview :is(.kl-home-next-icon, .kl-feature-card-icon) {
  width: 36px; height: 36px; border-color: var(--kl-border);
  border-radius: 8px; background: var(--kl-surface-2);
}
.kl-home--overview .kl-home-next-icon > .kl-icon { width: 16px; height: 16px; }
.kl-home--overview .kl-home-next-title { font-size: var(--kl-type-md); }
.kl-home--overview .kl-home-next-description { line-height: 1.6; }
.kl-home--overview .kl-home-next-footer {
  flex-direction: row; flex-wrap: wrap; align-items: center; gap: 8px; padding-top: 8px;
}
.kl-home--overview :is(.kl-home-next-button, .kl-home-update-button) {
  min-height: 36px; padding: 0 12px; border-radius: 8px;
  font-size: var(--kl-type-body); font-weight: 550; box-shadow: none;
}
.kl-home--overview .kl-home-section-heading { margin: 0 0 12px; }
.kl-home--overview .kl-home-section-heading h2 { font-size: var(--kl-type-md); }
.kl-home--overview .kl-feature-card {
  min-height: 112px; grid-template-columns: 36px minmax(0, 1fr); gap: 8px 10px;
  padding: 14px; border-radius: 10px;
  transition: border-color 150ms ease, background 150ms ease;
}
.kl-home--overview .kl-feature-card--primary { border-color: var(--kl-border); background: var(--kl-surface); }
.kl-home--overview .kl-feature-card-icon { padding: 9px; }
.kl-home--overview .kl-feature-card-title { font-size: var(--kl-type-md); }
.kl-home--overview .kl-feature-card-description { margin-top: 4px; line-height: 1.6; }
.kl-home--overview .kl-feature-card-footer { flex-wrap: wrap; gap: 6px 8px; padding-top: 8px; }
.kl-home--overview .kl-home-card-cta {
  display: inline-flex; align-items: center; gap: 4px; margin-left: auto; color: var(--kl-muted);
}
.kl-home--overview .kl-feature-card-action { color: inherit; font-weight: 550; }
.kl-home--overview .kl-feature-card-action::after { content: none; }
.kl-home--overview .kl-home-card-cta .kl-icon { width: 12px; height: 12px; }
.kl-home--overview .kl-feature-card:hover { border-color: var(--kl-border-strong); background: var(--kl-surface-hover); }
.kl-home--overview .kl-feature-card:hover .kl-home-card-cta { color: var(--kl-text); }
.kl-home--overview .kl-feature-card:is(:hover, :active) { transform: none; }
.kl-home--overview .kl-home-update { margin: 0 0 16px; border-radius: 10px; }
:host([data-home-layout="compact"]) .kl-home--overview .kl-home-hero { grid-template-columns: minmax(0, 1fr); }
:host([data-density="super-compact"]) .kl-home--overview .kl-home-hero { border-radius: 0; background: none; }
:host([data-density="super-compact"]) .kl-home--overview :is(.kl-home-next, .kl-feature-card) { border-radius: 10px; }
:host([data-density="super-compact"]) .kl-home--overview :is(.kl-home-next-icon, .kl-feature-card-icon) {
  width: 36px; height: 36px; border-radius: 8px;
}
:host([data-density="super-compact"]) .kl-home--overview .kl-home-next { grid-template-columns: 36px minmax(0, 1fr); }
@container kl-panel (max-width: 1100px) { .kl-home.kl-home--overview { padding: 16px; } }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-home.kl-home--overview { padding: 12px; }
}
@container kl-home (max-width: 620px) {
  .kl-home--overview :is(.kl-home-hero, .kl-feature-grid) { grid-template-columns: minmax(0, 1fr); }
  .kl-home--overview .kl-home-hero { gap: 12px; margin-bottom: 16px; }
  .kl-home--overview .kl-home-section-heading { align-items: flex-start; flex-direction: column; gap: 4px; }
  .kl-home--overview .kl-home-section-heading p { text-align: left; }
}
@media (pointer: coarse) {
  :host .kl-home--overview :is(.kl-home-next-button, .kl-home-update-button, .kl-home-presence) { min-height: 44px; }
}
.kl-panel[data-platform-preview="true"] .kl-cloud { padding: 12px; gap: 10px; }
.kl-panel[data-platform-preview="true"] .kl-cloud-bar h2 { font-size: 18px; letter-spacing: 0; }
.kl-panel[data-platform-preview="true"] .kl-cloud-subtitle { display: none; }
.kl-panel[data-platform-preview="true"] .kl-cloud-tabs { padding-bottom: 8px; gap: 6px; }
.kl-panel[data-platform-preview="true"] .kl-cloud-tabs > button { min-height: 34px; padding: 6px 10px; border-radius: 8px; font-size: 12px; }
.kl-panel[data-platform-preview="true"] .kl-settings-tabs { padding: 8px; }
.kl-panel[data-platform-preview="true"] .kl-settings-tab { min-height: 36px; border-radius: 7px; padding: 6px 8px; }
.kl-platform-unavailable { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 12px; padding: 24px; height: 100%; max-width: 520px; }
.kl-platform-unavailable > .kl-icon { color: var(--kl-muted); width: 28px; height: 28px; }
.kl-platform-unavailable h1 { margin: 0; font-size: 18px; }
.kl-platform-unavailable p { margin: 0; color: var(--kl-muted); font-size: 13px; line-height: 1.6; }
@container kl-panel (max-width: 1050px) {
  .kl-panel[data-platform-preview="true"] .kl-shell { grid-template-columns: 60px 156px minmax(0, 1fr); }
  .kl-panel[data-platform-preview="true"] .kl-layout { grid-template-columns: 212px minmax(0, 1fr); }
  .kl-platform-link { font-size: 11px; gap: 6px; }
  .kl-panel[data-platform-preview="true"] .kl-local-clock { display: none; }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-panel[data-platform-preview="true"] .kl-shell { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr) auto; }
  .kl-platform-context { grid-row: 1; border-right: 0; border-bottom: 1px solid var(--kl-border); padding: 4px 8px; overflow-y: hidden; overflow-x: auto; }
  .kl-platform-context-title { display: none; }
  .kl-platform-links { width: max-content; min-width: 100%; flex-direction: row; gap: 4px; }
  .kl-platform-link { width: auto; min-height: 36px; font-size: 12px; flex: 0 0 auto; padding: 6px 10px; }
  .kl-panel[data-platform-preview="true"] .kl-workspace { grid-row: 2; }
  .kl-platform-rail { grid-row: 3; display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 2px; padding: 3px 6px; padding-bottom: max(3px, env(safe-area-inset-bottom)); overflow-x: auto; overflow-y: hidden; border-top: 1px solid var(--kl-border); border-right: 0; }
  .kl-platform-area { min-height: 46px; padding: 4px 2px; gap: 2px; }
  .kl-platform-area[aria-current="page"]::before { width: 18px; height: 2px; top: auto; bottom: -3px; left: calc(50% - 9px); border-radius: 2px 2px 0 0; }
  .kl-panel[data-platform-preview="true"] .kl-topbar-settings { display: grid; }
  .kl-panel[data-platform-preview="true"] .kl-layout { grid-template-columns: 234px minmax(0, 1fr); }
  .kl-panel[data-platform-preview="true"] .kl-brand-title { font-size: 12px; }
  .kl-panel[data-platform-preview="true"] .kl-brand-subtitle { display: none; }
  .kl-panel[data-platform-preview="true"] .kl-topbar { padding: 0 8px; gap: 6px; }
  .kl-panel[data-platform-preview="true"] .kl-local-clock { display: none; }
}
@container kl-panel (max-width: 700px) {
  .kl-panel[data-platform-preview="true"] .kl-layout { grid-template-columns: minmax(0, 1fr); }
  .kl-panel[data-platform-preview="true"] .kl-brand-copy { display: none; }
  .kl-panel[data-platform-preview="true"] .kl-topbar-drag-space { display: block; flex: 1 1 auto; min-width: 0; }
  .kl-panel[data-platform-preview="true"] .kl-finder-trigger-label,
  .kl-panel[data-platform-preview="true"] .kl-finder-shortcut { display: none; }
  .kl-panel[data-platform-preview="true"] .kl-finder-trigger { width: 36px; height: 36px; }
  .kl-panel[data-platform-preview="true"] .kl-presence-trigger { min-width: 104px; max-width: 132px; width: auto; padding: 4px 18px 4px 5px; }
  .kl-panel[data-platform-preview="true"] .kl-presence-trigger-label { display: grid; }
  .kl-panel[data-platform-preview="true"] .kl-presence-trigger-status { max-width: 70px; }
  .kl-panel[data-platform-preview="true"] .kl-icon-button { width: 36px; height: 36px; }
  .kl-panel[data-platform-preview="true"] .kl-feature-page-header { padding: 10px 12px; }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-panel[data-platform-preview="true"] .kl-chat { grid-template-rows: 44px minmax(60px, 1fr) auto; }
  .kl-panel[data-platform-preview="true"] .kl-chat-header { padding: 4px 10px; gap: 8px; }
  .kl-panel[data-platform-preview="true"] .kl-chat-avatar { width: 30px; height: 30px; }
  .kl-panel[data-platform-preview="true"] .kl-chat-header .kl-icon-button { width: 32px; height: 32px; min-height: 32px; }
  .kl-panel[data-platform-preview="true"] .kl-quick-actions,
  .kl-panel[data-platform-preview="true"] .kl-composer > .kl-composer-options { display: none; }
  .kl-panel[data-platform-preview="true"] .kl-composer { padding: 6px 8px; max-height: 112px; overflow-y: auto; overscroll-behavior: contain; }
  .kl-panel[data-platform-preview="true"] .kl-composer-row { gap: 6px; }
  .kl-panel[data-platform-preview="true"] .kl-composer-input { min-height: 38px; max-height: 60px; padding: 8px 10px; border-radius: 9px; }
  .kl-panel[data-platform-preview="true"] .kl-composer-row .kl-icon-button,
  .kl-panel[data-platform-preview="true"] .kl-send { height: 38px; min-height: 38px; }
  .kl-panel[data-platform-preview="true"] .kl-messages { padding: 8px 10px; }
  .kl-panel[data-platform-preview="true"] .kl-typing-indicator { min-height: 14px; margin: 0 2px 4px; }
  .kl-panel[data-platform-preview="true"] .kl-feature-page-header { padding: 6px 12px; min-height: 0; }
  .kl-panel[data-platform-preview="true"] .kl-feature-page-header .kl-text-button { min-height: 34px; padding: 5px 9px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page > .kl-feature-page-footer { display: none; }
  .kl-panel[data-platform-preview="true"] .kl-roster-body { padding: 8px 12px; gap: 6px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-list-pane { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: auto auto auto minmax(0, 1fr); gap: 4px 8px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-search { grid-column: 1; grid-row: 1; min-height: 34px; padding: 6px 10px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-scopes { grid-column: 2; grid-row: 1; padding: 2px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-scope { min-height: 28px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-filters,
  .kl-panel[data-platform-preview="true"] .kl-friend-navigation { grid-column: 1 / -1; grid-row: 2; }
  .kl-panel[data-platform-preview="true"] .kl-roster-room-context { grid-column: 1 / -1; grid-row: 3; }
  .kl-panel[data-platform-preview="true"] .kl-roster-results { grid-column: 1 / -1; grid-row: 4; }
  .kl-panel[data-platform-preview="true"] .kl-cloud { padding: 8px 12px; gap: 6px; }
}
@media (prefers-reduced-motion: reduce) {
  .kl-platform-area, .kl-platform-link { transition: none; }
}
:host([data-reduced-motion="true"]) .kl-platform-area,
:host([data-reduced-motion="true"]) .kl-platform-link { transition: none; }

/* Prototype 17 shell: navigation spans the header; identity belongs to the workspace. */
.kl-panel[data-platform-preview="true"] { grid-template-rows: minmax(0, 1fr); }
.kl-panel[data-platform-preview="true"] .kl-shell { grid-template-columns: 68px 208px minmax(0, 1fr); grid-template-rows: 64px minmax(0, 1fr); }
.kl-panel[data-platform-preview="true"] .kl-platform-rail { grid-column: 1; grid-row: 1 / -1; padding: 0 8px 12px; gap: 10px; background: var(--kl-sidebar-bg); }
.kl-panel[data-platform-preview="true"] .kl-platform-context { grid-column: 2; grid-row: 1 / -1; padding: 0 12px 12px; gap: 0; background: color-mix(in srgb, var(--kl-surface) 70%, transparent); }
.kl-panel[data-platform-preview="true"] .kl-topbar { grid-column: 3; grid-row: 1; min-width: 0; padding: 12px 24px; gap: 16px; background: var(--kl-topbar-bg); }
.kl-panel[data-platform-preview="true"] .kl-workspace { grid-column: 3; grid-row: 2; container: kl-workspace / size; }

/* Most routes own their scrollable panes. Reserve a row above those panes. */
.kl-workspace:has(> .kl-space-session-bar:not([hidden])) {
  display: grid; grid-template: auto minmax(0,1fr) / minmax(0,1fr);
}
.kl-workspace:has(> .kl-space-session-bar:not([hidden])) > :not(.kl-space-session-bar) { grid-area: 2 / 1; }
.kl-workspace > .kl-space-session-bar {
  grid-area: 1 / 1; margin-inline: var(--kl-session-inset,20px);
  position: relative; top: var(--kl-session-inset,20px);
}
.kl-panel .kl-space-session-bar {
  display: flex; align-items: flex-start; flex-wrap: wrap; gap: 8px; min-width: 0;
  margin-bottom: 12px; padding: 10px 12px; border: 1px solid var(--kl-border-strong);
  border-radius: 8px; background: #d6a24b08; color: var(--kl-muted); font-size: 11px; line-height: 1.5;
}
/* A document-scrolling route gives notices the same gutter as its content. */
.kl-workshop-notices { display: contents; }
.kl-panel[data-platform-preview] .kl-cloud[data-platform-feed]:has(> .kl-space-session-bar:not([hidden])) { row-gap: 12px; }
.kl-panel .kl-cloud[data-platform-feed] > .kl-space-session-bar { flex: none; margin-bottom: 0; }
.kl-panel .kl-music-page:has(> .kl-space-session-bar:not([hidden])) {
  display: block; overflow: auto; scrollbar-width: thin; overscroll-behavior: contain;
}
.kl-panel .kl-music-page > .kl-space-session-bar {
  margin-inline: var(--kl-music-padding); position: relative; top: var(--kl-music-padding);
}
.kl-panel .kl-music-page:has(> .kl-space-session-bar:not([hidden])) .kl-music-device-library,
.kl-panel .kl-music-page:has(> .kl-space-session-bar:not([hidden])) .kl-music-body { overflow: visible; height: auto; }
.kl-panel .kl-space-session-bar[hidden], .kl-panel .kl-space-session-bar [hidden] { display: none; }
.kl-space-session-bar > .kl-icon { width: 15px; height: 15px; margin-top: 2px; flex: none; color: var(--kl-success,#79c49a); }
.kl-space-session-copy { flex: 1; min-width: 0; display: flex; align-items: baseline; flex-wrap: wrap; gap: 3px 8px; }
.kl-space-session-copy > strong {
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--kl-text); font-size: 12px; line-height: 1.5; font-weight: 550;
}
.kl-space-session-copy > small { font-size: 10px; line-height: 1.5; }
.kl-panel .kl-space-session-bar > button {
  display: inline-flex; justify-content: center; align-items: center; flex: none;
  border-radius: 8px; background: transparent; color: var(--kl-text); box-shadow: none;
}
.kl-panel .kl-space-session-bar > .kl-space-session-view {
  height: var(--kl-session-control,36px); min-height: 0; gap: 8px; padding: 0 12px;
  border: 1px solid var(--kl-border); color: var(--kl-muted); font: 550 11px/1.5 var(--kl-font,system-ui);
}
.kl-panel .kl-space-session-bar > .kl-space-session-leave {
  height: var(--kl-session-small,32px); width: var(--kl-session-small,32px); min-height: 0; min-width: 0;
  padding: 0; border: 0; color: var(--kl-muted); font: 400 11px/1.5 var(--kl-font,system-ui);
}
.kl-panel .kl-space-session-leave > .kl-icon { width: 16px; height: 16px; }
.kl-panel .kl-space-session-bar > button:hover:not(:disabled) { background: var(--kl-surface-hover); color: var(--kl-text); }
@container kl-panel (max-width:1100px) {
  .kl-workspace { --kl-session-inset: 16px; }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-workspace { --kl-session-inset: 12px; --kl-session-control: 40px; --kl-session-small: 40px; }
}
.kl-platform-brand { display: grid; place-items: center; flex: none; width: calc(100% + 16px); height: 64px; align-self: center; margin: 0 0 2px; padding: 0; border: 0; border-bottom: 1px solid var(--kl-border); background: transparent; cursor: pointer; }
.kl-platform-wordmark { display: flex; align-items: center; gap: 6px; flex: none; min-height: 30px; margin: 0 0 30px; padding: 0 12px; border: 0; background: transparent; font-size: 20px; text-transform: uppercase; letter-spacing: .055em; }
.kl-platform-wordmark > span { border: 1px solid var(--kl-border); border-radius: 4px; padding: 2px 4px; color: var(--kl-muted); font-size: 8px; font-weight: 400; letter-spacing: 0; }
.kl-platform-context > .kl-platform-wordmark { height: 64px; margin: 0 -12px 16px; padding: 0 20px; border-bottom: 1px solid var(--kl-border); background: var(--kl-topbar-bg); font-size: 18px; }
.kl-platform-context-heading { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.kl-platform-context-title { color: var(--kl-muted); font-size: 10px; line-height: 17px; text-transform: uppercase; letter-spacing: 1px; margin: 0 12px; }
.kl-platform-options { position: absolute; right: 0; top: -7px; display: grid; place-items: center; flex: none; width: 32px; height: 32px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--kl-muted); cursor: pointer; }
.kl-platform-options > svg { width: 16px; height: 16px; }
.kl-platform-area { min-height: 47px; padding: 5px 2px; }
.kl-platform-link { min-height: 38px; padding: 7px 12px; gap: 10px; font-size: 12px; }
.kl-platform-area[aria-current="page"], .kl-platform-link[aria-current="page"] { border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 22%); background: color-mix(in srgb, var(--kl-accent) 12%, var(--kl-surface-2)); }
.kl-platform-link[aria-current="page"] { box-shadow: inset 2px 0 var(--kl-accent); }
.kl-shell:has(> .kl-platform-context:is([data-area="explore"],[data-area="home"],[data-area="feed"],[data-area="chat"],[data-area="create"],[data-area="game"],[data-area="settings"])) {
  --kl-nav-selection-bg: color-mix(in srgb, var(--kl-accent) 12%, transparent);
  --kl-nav-selection-border: color-mix(in srgb, var(--kl-accent) 58%, var(--kl-muted));
}
.kl-shell:has(> .kl-platform-context[data-area="explore"]) {
  --kl-explore-control: 36px;
  --kl-explore-small: 32px;
  --kl-explore-radius: 8px;
  --kl-explore-card-radius: 10px;
  --kl-explore-inset: 20px;
  --kl-explore-active-bg: var(--kl-nav-selection-bg);
  --kl-explore-active-border: var(--kl-nav-selection-border);
}
.kl-panel .kl-explore-catalog-empty {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  min-width: 0; border: 1px dashed var(--kl-border);
  border-radius: var(--kl-explore-card-radius, 10px); text-align: center;
}
.kl-panel .kl-explore-catalog-empty > .kl-icon { width: 28px; height: 28px; color: var(--kl-muted); }
.kl-panel .kl-explore-catalog-empty > h2 { margin: 0; font-size: 16px; }
.kl-panel .kl-explore-catalog-empty > p { max-width: 340px; margin: 0; color: var(--kl-muted); font-size: 11px; line-height: 1.7; }
.kl-panel .kl-explore-catalog-empty > .kl-text-button { margin-top: 4px; }
.kl-panel .kl-explore-empty:is(.kl-cm-empty,.kl-ev-empty,.kl-sp-empty,.kl-explore-catalog-empty) {
  padding: 24px 16px;
  background: #11111308;
}
.kl-panel .kl-explore-empty > .kl-icon { margin-bottom: 4px; }
.kl-panel .kl-explore-empty > h2 { line-height: 1.4; font-weight: 650; letter-spacing: -.2px; }
.kl-panel .kl-explore-empty > .kl-text-button--primary {
  min-height: var(--kl-explore-control, 36px); padding: 0 12px;
  border-radius: var(--kl-explore-radius, 8px); border-color: var(--kl-explore-active-border, var(--kl-border));
  font-size: var(--kl-type-body, 12px); font-weight: 650; line-height: 1.5; box-shadow: none;
}
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-panel .kl-explore-empty:is(.kl-cm-empty,.kl-ev-empty,.kl-sp-empty,.kl-explore-catalog-empty) {
    display: grid; grid-template-columns: 28px minmax(0,1fr) auto;
    column-gap: 12px; row-gap: 3px; align-items: center; text-align: left;
  }
  .kl-panel .kl-explore-empty:is(.kl-cm-empty,.kl-ev-empty,.kl-sp-empty,.kl-explore-catalog-empty) > .kl-icon {
    grid-column: 1; grid-row: 1 / 3; width: 24px; height: 24px; margin: 0;
  }
  .kl-panel .kl-explore-empty > h2 { grid-column: 2; grid-row: 1; align-self: end; }
  .kl-panel .kl-explore-empty > p { grid-column: 2; grid-row: 2; align-self: start; max-width: 340px; margin-inline: auto; }
  .kl-panel .kl-explore-empty > .kl-text-button { grid-column: 3; grid-row: 1 / 3; margin: 0; }
  .kl-panel .kl-explore-catalog-empty > .kl-text-button { justify-self: end; }
}
@media (pointer: coarse) { .kl-panel .kl-explore-empty > .kl-text-button--primary { min-height: 44px; } }
.kl-platform-context:is([data-area="explore"],[data-area="home"],[data-area="feed"],[data-area="chat"],[data-area="create"],[data-area="game"],[data-area="settings"]) .kl-platform-link[aria-current="page"] {
  border-color: var(--kl-nav-selection-border); background: var(--kl-nav-selection-bg);
}
.kl-panel[data-platform-preview="true"] .kl-platform-context:is([data-area="explore"],[data-area="home"],[data-area="feed"],[data-area="chat"],[data-area="create"],[data-area="game"],[data-area="settings"]) {
  scrollbar-color: var(--kl-border-strong) transparent;
}
.kl-platform-area > .kl-roster-count, .kl-platform-link:not([data-route="players"]) > .kl-roster-count,
.kl-panel[data-platform-preview="true"] .kl-mailbox-trigger > .kl-roster-count {
  background: var(--kl-accent); color: var(--kl-accent-foreground);
}
.kl-platform-connection { display: flex; align-items: center; gap: 6px; margin-top: auto; padding: 28px 10px 0; border: 0; background: transparent; color: var(--kl-muted); text-align: left; font-size: 9px; cursor: pointer; }
.kl-platform-connection::before { content: ''; flex: none; width: 5px; height: 5px; border-radius: 50%; background: var(--kl-gold); }
.kl-platform-connection[data-connected="true"]::before { background: #79c49a; }
.kl-topbar-identity { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 0 1 auto; }
.kl-identity-copy { min-width: 0; flex: 1; }
.kl-identity-line { display: flex; align-items: center; gap: 8px; min-width: 0; }
.kl-identity-avatar, .kl-identity-name { padding: 0; border: 0; background: transparent; color: var(--kl-text); cursor: pointer; }
.kl-identity-avatar { flex: none; border-radius: 50%; }
.kl-identity-name { min-width: 0; text-align: left; font-size: 13px; line-height: 1.4; }
.kl-identity-name > strong { display: block; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; max-width: 230px; }
.kl-panel[data-platform-preview="true"] .kl-identity-avatar .kl-presence-trigger-avatar { width: 36px; height: 36px; object-fit: cover; border-radius: 50%; }
.kl-panel[data-platform-preview="true"] .kl-identity-avatar img { width: 100%; height: 100%; object-fit: cover; }
.kl-panel[data-platform-preview="true"] .kl-topbar .kl-local-clock { display: inline; flex: none; border: 0; padding: 0; background: none; font-size: 10px; color: var(--kl-muted); }
.kl-panel[data-platform-preview="true"] .kl-topbar .kl-presence-trigger { display: inline-flex; align-items: center; gap: 5px; min-width: 0; width: auto; max-width: 100%; height: 28px; min-height: 28px; padding: 1px 3px; margin: 1px 0 0 -3px; border: 0; box-shadow: none; background: transparent; color: var(--kl-muted); }
.kl-panel[data-platform-preview="true"] .kl-presence-trigger::after { display: none; }
.kl-panel[data-platform-preview="true"] .kl-presence-trigger > .kl-presence-dot { position: static; flex: none; width: 6px; height: 6px; margin: 0; border: 0; }
.kl-panel[data-platform-preview="true"] .kl-presence-trigger-status { font-size: 10px; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-panel[data-platform-preview="true"] .kl-topbar-drag-space { display: block; flex: 1 1 auto; min-width: 0; }
.kl-topbar-actions { display: flex; align-items: center; gap: 12px; flex: none; }
.kl-panel[data-platform-preview="true"] .kl-topbar-actions > .kl-mailbox-trigger { width: 32px; min-width: 32px; flex-basis: 32px; }
@container kl-panel (max-width: 1150px) { .kl-topbar-actions { gap: 8px; } }
.kl-panel[data-platform-preview="true"] .kl-finder-trigger { min-width: 170px; height: 32px; min-height: 32px; border-radius: 7px; padding: 0 10px; }
.kl-panel[data-platform-preview="true"] .kl-finder-trigger-label { font-size: 11px; }
.kl-panel[data-platform-preview="true"] .kl-finder-shortcut { font-size: 9px; }
.kl-identity-menu { display: flex; align-items: center; justify-content: center; gap: 5px; flex: none; height: 36px; min-width: 40px; padding: 3px; border: 0; border-radius: 7px; background: transparent; color: var(--kl-text); cursor: pointer; }
.kl-identity-initial { display: grid; place-items: center; width: 27px; height: 27px; border: 1px solid var(--kl-border-strong); border-radius: 50%; background: var(--kl-avatar-bg); font-size: 11px; }
.kl-identity-chevron { width: 11px; height: 11px; transform: rotate(90deg); }
.kl-identity-menu:hover, .kl-platform-options:is(:hover,[aria-expanded="true"]), .kl-panel[data-platform-preview="true"] .kl-presence-trigger:hover { background: var(--kl-surface-hover); }
.kl-identity-name:focus-visible, .kl-identity-avatar:focus-visible, .kl-identity-menu:focus-visible,
.kl-platform-options:focus-visible, .kl-platform-brand:focus-visible, .kl-platform-connection:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 2px; }
.kl-shell-menu { position: fixed; inset: auto; margin: 0; width: 230px; max-width: var(--kl-surface-width, calc(100vw - 16px)); max-height: var(--kl-surface-height, calc(100dvh - 16px)); overflow-y: auto; overscroll-behavior: contain; padding: 4px; color: var(--kl-text); background: var(--kl-surface-2); border: 1px solid var(--kl-border-strong); border-radius: 10px; box-shadow: 0 8px 24px #0005; font-size: 12px; }
.kl-shell-menu::backdrop { background: transparent; }
.kl-dialog.kl-content-dialog[data-section-sheet] { display:flex; flex-direction:column; width:540px; height:max-content; margin:auto; padding:0; border:1px solid var(--kl-border-strong); border-radius:12px; background:var(--kl-surface); }
.kl-dialog.kl-content-dialog[data-section-sheet="compact"] { width:auto; margin:auto 0 0; border-bottom:0; border-radius:14px 14px 0 0; padding-bottom:env(safe-area-inset-bottom); }
.kl-content-dialog[data-section-sheet] > .kl-dialog-header { flex:none; min-height:0; padding:12px 16px; background:var(--kl-surface); }
.kl-content-dialog[data-section-sheet] .kl-dialog-title { font-size:16px; line-height:1.4; }
.kl-content-dialog[data-section-sheet] .kl-dialog-title::before { content:"KIKILINK"; display:block; color:var(--kl-faint,var(--kl-muted)); font:400 10px/1.7 var(--kl-font, sans-serif); letter-spacing:.25px; }
.kl-content-dialog[data-section-sheet] > .kl-dialog-body { display:flex; min-height:0; padding:0; overflow:hidden; }
.kl-shell-sections { display:flex; flex:1; flex-direction:column; min-height:0; min-width:0; }
.kl-dialog.kl-content-dialog[data-local-message] { width:540px; height:max-content; margin:auto; padding:0; overflow:hidden; border-radius:12px; }
.kl-content-dialog[data-local-message] > .kl-dialog-header { min-height:0; padding:12px 16px; background:var(--kl-surface); }
.kl-content-dialog[data-local-message] .kl-dialog-title { font-size:16px; line-height:1.4; }
.kl-content-dialog[data-local-message] .kl-dialog-title::before { content:"KIKILINK"; display:block; font:400 10px/1.7 sans-serif; letter-spacing:.25px; color:var(--kl-faint,var(--kl-muted)); }
.kl-content-dialog[data-local-message] > .kl-dialog-body { padding:0; }
.kl-local-message-editor, .kl-local-message-field { display:grid; min-width:0; }
.kl-local-message-body { padding:16px; }
.kl-local-message-body p { margin:0; font-size:12px; line-height:1.6; }
.kl-local-message-body p:not(:first-child) { margin-top:8px; }
.kl-local-message-field { gap:6px; font-size:12px; }
.kl-local-message-field textarea { width:100%; min-height:90px; resize:vertical; }
.kl-local-message-hint { color:var(--kl-muted); font-size:10px; }
.kl-local-message-editor > .kl-dialog-actions { justify-content:flex-end; flex-wrap:wrap; margin:0; padding:12px 16px; background:var(--kl-input-bg); }
.kl-content-dialog[data-local-message] > .kl-dialog-header { height:64px; }
.kl-content-dialog[data-local-message] > .kl-dialog-header > .kl-icon-button { width:32px; height:32px; min-width:32px; min-height:32px; }
.kl-local-message-field > span { font-size:12px; line-height:18px; }
.kl-local-message-field textarea { height:114px; min-height:60px; }
.kl-local-message-hint { line-height:15px; }
.kl-local-message-editor .kl-dialog-actions > .kl-text-button { min-height:36px; }
.kl-content-dialog[data-local-message="compact"] > .kl-dialog-header { height:61px; padding:10px 12px; }
.kl-content-dialog[data-local-message="compact"] > .kl-dialog-header > .kl-icon-button { width:40px; height:40px; min-width:40px; min-height:40px; }
.kl-content-dialog[data-local-message="compact"] .kl-local-message-body { padding:12px; }
.kl-content-dialog[data-local-message="compact"] .kl-dialog-actions { padding:10px 12px; }
.kl-content-dialog[data-local-message="compact"] .kl-dialog-actions > .kl-text-button { min-height:40px; }
.kl-content-dialog[data-local-message="compact"] textarea { height:min(146px,36dvh); font-size:16px; }
.kl-shell-section-list { display:grid; gap:4px; padding:16px; overflow:auto; overscroll-behavior:contain; }
.kl-shell-section-row { display:flex; align-items:center; width:100%; min-width:0; min-height:40px; gap:10px; padding:10px; text-align:left; font:inherit; font-size:12px; line-height:1.5; color:var(--kl-muted); background:transparent; border:1px solid transparent; border-radius:7px; cursor:pointer; }
.kl-shell-section-row svg { flex:none; width:16px; height:16px; }
.kl-shell-section-row > span { min-width:0; overflow-wrap:anywhere; }
.kl-shell-section-row > .kl-count { margin-left:auto; }
.kl-shell-section-row:hover { color:var(--kl-text); background:var(--kl-surface-hover); }
.kl-shell-section-row[aria-current="page"] { color:var(--kl-text); border-color:color-mix(in srgb,var(--kl-accent),var(--kl-gold) 22%); background:color-mix(in srgb,var(--kl-accent) 12%,var(--kl-surface-2)); box-shadow:inset 2px 0 var(--kl-accent); }
.kl-shell-sections > .kl-dialog-actions { display:flex; flex:none; justify-content:flex-end; margin:0; padding:12px 16px; background:var(--kl-input-bg); }
.kl-shell-sections .kl-text-button { min-height:34px; padding:0 12px; background:transparent; }
.kl-content-dialog[data-section-sheet] > .kl-dialog-header { height:64px; }
.kl-content-dialog[data-section-sheet] > .kl-dialog-header > .kl-icon-button { width:32px; height:32px; min-width:32px; min-height:32px; padding:0; }
.kl-shell-sections .kl-text-button { min-height:36px; min-width:58px; width:auto; padding:0 10px; font-size:12px; }
.kl-content-dialog[data-section-sheet="compact"] > .kl-dialog-header { height:61px; padding:10px 12px; }
.kl-content-dialog[data-section-sheet="compact"] > .kl-dialog-header > .kl-icon-button { width:40px; height:40px; min-width:40px; min-height:40px; }
.kl-content-dialog[data-section-sheet="compact"] .kl-shell-section-list { padding:12px; }
.kl-content-dialog[data-section-sheet="compact"] .kl-dialog-actions { padding:10px 12px; }
.kl-content-dialog[data-section-sheet="compact"] .kl-text-button { min-height:40px; }
.kl-shell-menu-heading { padding: 9px 10px; border-bottom: 1px solid var(--kl-border); margin-bottom: 4px; overflow-wrap: anywhere; font-size: 11px; }
.kl-chat-options-menu > .kl-shell-menu-heading { color: var(--kl-muted); line-height: 1.5; }
.kl-chat-options-menu > .kl-shell-menu-heading > strong { font-weight: 400; }
.kl-shell-menu[aria-label="Profile menu"] { line-height: 1.5; }
.kl-shell-menu[aria-label="Profile menu"] > .kl-shell-menu-heading { color: var(--kl-muted); }
.kl-shell-menu[aria-label="Profile menu"] > .kl-shell-menu-heading strong { font-weight: 600; }
.kl-shell-menu[aria-label="Profile menu"] > .kl-shell-menu-item { min-height: 32px; border-radius: 8px; font-size: 11px; }
.kl-shell-menu[aria-label="Profile menu"] > .kl-shell-menu-item > .kl-icon { stroke-width: 1.65; }
.kl-shell-menu[aria-label="Profile menu"] > .kl-shell-menu-item:hover { background: #d6a24b16; outline: none; }
.kl-shell-menu[aria-label="Profile menu"] > .kl-shell-menu-item:focus-visible {
  background: #d6a24b16; outline: 2px solid var(--kl-focus, color-mix(in srgb, var(--kl-accent) 52%, white)); outline-offset: 3px;
}
@media (max-width:700px), (max-width:900px) and (max-height:500px) {
  .kl-shell-menu[aria-label="Profile menu"] > .kl-shell-menu-item { min-height:40px; }
}
.kl-shell-menu-heading small { display: block; margin-top: 3px; color: var(--kl-muted); font-size: 10px; }
.kl-shell-menu-item { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 34px; padding: 9px 10px; border: 0; border-radius: 5px; text-align: left; color: var(--kl-text); background: transparent; cursor: pointer; font: inherit; }
.kl-shell-menu-item svg { width: 14px; height: 14px; flex: none; color: var(--kl-muted); }
.kl-shell-menu-item:hover, .kl-shell-menu-item:focus-visible { background: var(--kl-surface-hover); outline: 2px solid var(--kl-accent); outline-offset: -2px; }
.kl-shell-menu-separator { height: 1px; background: var(--kl-border); margin: 4px 6px; }
.kl-explore-action-menu { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent; }
.kl-explore-action-menu > .kl-shell-menu-item { min-height: 32px; min-width: 0; border-radius: 8px; font-size: 11px; line-height: 1.5; font-weight: 400; }
.kl-explore-action-menu > .kl-shell-menu-item > span { min-width: 0; overflow-wrap: anywhere; }
:is(.kl-explore-membership-menu,.kl-explore-detail-options) { line-height: 1.5; }
:is(.kl-explore-membership-menu,.kl-explore-detail-options) > .kl-shell-menu-item:is(:hover,:focus-visible) { background: #d6a24b16; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-explore-action-menu > .kl-shell-menu-item { min-height: 40px; }
}
@media (pointer: coarse) { .kl-explore-action-menu > .kl-shell-menu-item { min-height: 44px; } }
.kl-panel[data-platform-preview="true"] > .kl-finder-dialog { position: fixed; inset: 0; margin: auto; width: 540px; max-width: calc(100vw - 24px); max-height: calc(100dvh - 24px); grid-template-rows: auto minmax(0, 1fr); border: 1px solid var(--kl-border-strong); border-radius: 12px; background: var(--kl-surface); }
.kl-panel[data-platform-preview="true"] .kl-finder-dialog .kl-dialog-header { min-height: 61px; padding: 12px 16px; background: var(--kl-surface); }
.kl-finder-eyebrow { display: block; color: var(--kl-muted); font-size: 9px; line-height: 1.2; letter-spacing: .06em; text-transform: uppercase; }
.kl-panel[data-platform-preview="true"] .kl-finder-dialog .kl-dialog-title { margin: 0; font: 700 16px/1.4 var(--kl-font, system-ui); }
.kl-panel[data-platform-preview="true"] .kl-finder-body { min-height: 0; gap: 8px; padding: 16px; }
.kl-panel[data-platform-preview="true"] .kl-finder-input-wrap { display: flex; align-items: center; gap: 8px; height: 36px; padding-inline: 10px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg); }
.kl-panel[data-platform-preview="true"] .kl-finder-input-wrap:focus-within { border-color: var(--kl-accent); outline: 2px solid color-mix(in srgb, var(--kl-accent) 15%, transparent); }
.kl-panel[data-platform-preview="true"] .kl-finder-search-icon { position: static; width: 15px; height: 15px; color: var(--kl-muted); transform: none; flex: none; }
.kl-panel[data-platform-preview="true"] .kl-finder-query { flex: 1; min-width: 0; height: 100%; padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; font-size: 12px; }
.kl-panel[data-platform-preview="true"] .kl-finder-results { min-height: 0; max-height: none; gap: 8px; overscroll-behavior: contain; }
.kl-panel[data-platform-preview="true"] .kl-finder-result { min-height: 50px; grid-template-columns: 20px minmax(0, 1fr) auto; gap: 12px; padding: 10px 12px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-surface); }
.kl-panel[data-platform-preview="true"] .kl-finder-result:is(:hover,[data-selected="true"]) { border-color: var(--kl-border-strong); background: var(--kl-surface-hover); }
.kl-panel[data-platform-preview="true"] .kl-finder-result-icon { width: 20px; height: 20px; border: 0; border-radius: 0; background: transparent; color: var(--kl-muted); }
.kl-panel[data-platform-preview="true"] .kl-finder-result-title { font-size: 12px; font-weight: 550; }
.kl-panel[data-platform-preview="true"] .kl-finder-result-detail { font-size: 10px; }
.kl-panel[data-platform-preview="true"] .kl-finder-result-category { max-width: 90px; padding: 0; border: 0; color: var(--kl-muted); font-size: 10px; font-weight: 500; letter-spacing: 0; text-transform: none; overflow: hidden; text-overflow: ellipsis; }
.kl-panel[data-platform-preview="true"] :is(.kl-finder-loading,.kl-finder-error) { min-height: 124px; padding: 16px; }
.kl-panel[data-platform-preview="true"] .kl-finder-empty:not(.kl-finder-error) { min-height: 0; gap: 6px; padding: 20px 8px; font-size: 11px; line-height: 1.5; }
.kl-panel[data-platform-preview="true"] .kl-finder-empty-title { color: var(--kl-muted); font-size: 12px; font-weight: 500; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-panel[data-platform-preview="true"] .kl-finder-body { padding: 12px; }
  .kl-panel[data-platform-preview="true"] .kl-finder-dialog .kl-dialog-header { padding-inline: 12px; }
  .kl-panel[data-platform-preview="true"] .kl-finder-input-wrap { height: 40px; }
}
@container kl-panel (max-width: 1250px) {
  .kl-panel[data-platform-preview="true"] .kl-shell { grid-template-columns: 68px 184px minmax(0, 1fr); }
  .kl-panel[data-platform-preview="true"] .kl-topbar { padding-inline: 20px; }
  .kl-panel[data-platform-preview="true"] .kl-platform-context { padding-inline: 8px; }
  .kl-platform-context > .kl-platform-wordmark { margin-inline: -8px; padding-inline: 16px; }
  .kl-panel[data-platform-preview="true"] .kl-finder-trigger { min-width: 130px; }
}
@container kl-panel (max-width: 900px) {
  .kl-panel[data-platform-preview="true"] .kl-shell { grid-template-columns: 60px 164px minmax(0, 1fr); }
  .kl-panel[data-platform-preview="true"] .kl-finder-trigger { width: 34px; min-width: 34px; padding: 7px; }
  .kl-panel[data-platform-preview="true"] .kl-finder-trigger-label, .kl-panel[data-platform-preview="true"] .kl-finder-shortcut { display: none; }
  .kl-panel[data-platform-preview="true"] .kl-identity-name > strong { max-width: 190px; }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-panel[data-platform-preview="true"] .kl-shell { grid-template-columns: minmax(0, 1fr); grid-template-rows: var(--kl-compact-topbar-height, 56px) auto minmax(0, 1fr) 62px; }
  .kl-panel[data-platform-preview="true"] .kl-shell > .kl-topbar { grid-column: 1; grid-row: 1; padding: 8px 12px; gap: 8px; }
  .kl-panel[data-platform-preview="true"] .kl-platform-context { grid-column: 1; grid-row: 2; display: flex; flex-direction: row; align-items: center; padding: 0 8px 0 0; overflow: hidden; background: var(--kl-surface); }
  .kl-panel[data-platform-preview="true"] .kl-platform-context[hidden] { display: none; }
  .kl-platform-wordmark, .kl-platform-brand, .kl-platform-connection, .kl-platform-context-title { display: none; }
  .kl-platform-options { position: static; width: 40px; height: 40px; border-inline-start: 1px solid var(--kl-border); border-radius: 0; }
  .kl-platform-options > svg { width: 18px; height: 18px; }
  .kl-platform-context-heading { order: 2; margin: 0; padding-left: 4px; flex: none; }
  .kl-platform-links { flex: 1; width: auto; min-width: 0; padding: 6px 6px 6px 12px; scroll-padding-inline: 12px; overflow-x: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent; }
  .kl-platform-context[data-area="home"] > .kl-platform-links { scrollbar-width: none; }
  .kl-platform-link { padding: 6px 10px; min-height: 36px; gap: 6px; font-size: 11px; }
  .kl-platform-link > .kl-icon { flex-basis: 14px; width: 14px; height: 14px; }
  .kl-panel[data-platform-preview="true"] .kl-shell > .kl-workspace { grid-column: 1; grid-row: 3; }
  .kl-panel[data-platform-preview="true"] .kl-platform-rail { grid-column: 1; grid-row: 4; display: grid; grid-auto-flow: column; grid-auto-columns: minmax(42px, 1fr); gap: 0; padding: 5px 6px; padding-bottom: max(5px, env(safe-area-inset-bottom)); background: var(--kl-bg); }
  .kl-platform-area { min-height: 50px; gap: 5px; }
  .kl-platform-area[aria-current="page"]::before { inset: -5px 25% auto; width: auto; border-radius: 0 0 2px 2px; }
  .kl-platform-area-label { font-size: 9px; letter-spacing: -.15px; }
  .kl-panel[data-platform-preview="true"] .kl-topbar .kl-presence-trigger { height: 34px; min-height: 34px; }
  .kl-panel[data-platform-preview="true"] .kl-topbar .kl-local-clock { display: none; }
  .kl-topbar-identity { gap: 8px; flex: 1 1 auto; }
  .kl-panel[data-platform-preview="true"] .kl-topbar-drag-space { flex: 0; }
  .kl-identity-line { gap: 4px; flex-wrap: wrap; }
  .kl-panel[data-platform-preview="true"] .kl-identity-avatar .kl-presence-trigger-avatar { width: 32px; height: 32px; }
  .kl-panel[data-platform-preview="true"] .kl-identity-name > strong { max-width: 100%; }
  .kl-identity-name { max-width: 100%; font-size: 12px; }
  .kl-panel[data-platform-preview="true"] .kl-topbar .kl-local-clock { font-size: 9px; }
  .kl-panel[data-platform-preview="true"] .kl-presence-trigger-status { max-width: 100%; font-size: 10px; }
  .kl-topbar-actions { gap: 4px; }
  .kl-panel[data-platform-preview="true"] .kl-topbar-actions > .kl-mailbox-trigger { width: 40px; min-width: 40px; flex-basis: 40px; }
  .kl-panel[data-platform-preview="true"] .kl-topbar-actions > .kl-icon-button,
  .kl-panel[data-platform-preview="true"] .kl-finder-trigger, .kl-identity-menu { width: 40px; min-width: 40px; height: 40px; min-height: 40px; }
  .kl-identity-chevron { display: none; }
  .kl-panel[data-platform-preview="true"] .kl-topbar-settings { display: none; }
}
@container kl-panel (width <= 620px) {
  .kl-panel[data-platform-preview="true"] .kl-shell { --kl-compact-topbar-height: 68px; }
  .kl-panel[data-platform-preview="true"] .kl-shell > .kl-topbar { padding-block: 6px; }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-panel[data-platform-preview="true"] .kl-shell { grid-template-rows: 54px auto minmax(0, 1fr) 54px; }
  .kl-panel[data-platform-preview="true"] .kl-shell > .kl-topbar { padding-block: 4px; }
  .kl-panel[data-platform-preview="true"] .kl-platform-rail { padding: 4px 16px; }
  .kl-panel[data-platform-preview="true"] .kl-platform-links { padding-block: 3px; }
  .kl-platform-link { min-height: 36px; padding-block: 3px; }
  .kl-platform-area { min-height: 46px; flex-direction: row; gap: 7px; }
  .kl-platform-area[aria-current="page"]::before { inset: -4px 30% auto; }
  .kl-platform-area-label { font-size: 10px; }
  .kl-panel[data-platform-preview="true"] .kl-topbar .kl-presence-trigger { height: 28px; min-height: 28px; }
  .kl-panel[data-platform-preview="true"] .kl-topbar .kl-local-clock { display: inline; }
}
@container kl-panel (width <= 1100px) {
  .kl-shell:has(> .kl-platform-context[data-area="explore"]) { --kl-explore-inset: 16px; }
}
@container kl-panel (width > 900px) or ((width > 700px) and (height > 500px)) {
  .kl-platform-context:is([data-area="explore"],[data-area="home"],[data-area="feed"],[data-area="chat"],[data-area="create"],[data-area="game"],[data-area="settings"]) > .kl-platform-context-heading {
    min-height: 30px; margin-bottom: 8px; padding-inline: 8px;
  }
  .kl-platform-context:is([data-area="explore"],[data-area="home"],[data-area="feed"],[data-area="chat"],[data-area="create"],[data-area="game"],[data-area="settings"]) .kl-platform-context-title {
    margin-inline: 0; font-weight: 650; letter-spacing: .04em;
  }
  .kl-platform-context:is([data-area="explore"],[data-area="home"],[data-area="feed"],[data-area="chat"],[data-area="create"],[data-area="game"],[data-area="settings"]) .kl-platform-options {
    position: static; width: 30px; height: 30px;
  }
  .kl-platform-context:is([data-area="explore"],[data-area="home"],[data-area="feed"],[data-area="chat"],[data-area="create"],[data-area="game"],[data-area="settings"]) .kl-platform-link {
    min-height: 36px; padding: 0 10px;
  }
  .kl-panel[data-platform-preview="true"] .kl-shell:has(> .kl-platform-context:is([data-area="explore"],[data-area="home"],[data-area="feed"],[data-area="chat"],[data-area="create"],[data-area="game"],[data-area="settings"])) .kl-finder-trigger {
    gap: 6px; border-radius: 8px; color: var(--kl-muted);
  }
  .kl-shell:has(> .kl-platform-context:is([data-area="explore"],[data-area="home"],[data-area="feed"],[data-area="chat"],[data-area="create"],[data-area="game"],[data-area="settings"])) .kl-finder-trigger-icon {
    flex: none; width: 14px; height: 14px; color: inherit;
  }
  .kl-shell:has(> .kl-platform-context:is([data-area="explore"],[data-area="home"],[data-area="feed"],[data-area="chat"],[data-area="create"],[data-area="game"],[data-area="settings"])) .kl-finder-trigger-label { font-weight: 400; }
  .kl-panel[data-platform-preview="true"] .kl-shell:has(> .kl-platform-context:is([data-area="explore"],[data-area="home"],[data-area="feed"],[data-area="chat"],[data-area="create"],[data-area="game"],[data-area="settings"])) .kl-topbar-actions > .kl-icon-button {
    width: 32px; min-width: 32px; height: 32px; min-height: 32px;
  }
  .kl-shell:has(> .kl-platform-context:is([data-area="explore"],[data-area="home"],[data-area="feed"],[data-area="chat"],[data-area="create"],[data-area="game"],[data-area="settings"])) .kl-identity-menu { width: 50px; height: 32px; }
}
@container kl-panel (width > 1100px) {
  .kl-panel[data-platform-preview="true"] .kl-platform-context:is([data-area="explore"],[data-area="home"],[data-area="feed"],[data-area="chat"],[data-area="create"],[data-area="game"],[data-area="settings"]) { padding-inline: 12px; }
  .kl-platform-context:is([data-area="explore"],[data-area="home"],[data-area="feed"],[data-area="chat"],[data-area="create"],[data-area="game"],[data-area="settings"]) > .kl-platform-wordmark { margin-inline: -12px; padding-inline: 20px; }
}
@container kl-panel (width > 900px) and (width <= 1100px) {
  .kl-panel[data-platform-preview="true"] .kl-shell:has(> .kl-platform-context:is([data-area="explore"],[data-area="home"],[data-area="feed"],[data-area="chat"],[data-area="create"],[data-area="game"],[data-area="settings"])) {
    grid-template-columns: 68px 180px minmax(0, 1fr);
  }
}
@container kl-panel (width > 700px) and (width <= 900px) and (height > 500px) {
  .kl-panel[data-platform-preview="true"] .kl-shell:has(> .kl-platform-context:is([data-area="explore"],[data-area="home"],[data-area="feed"],[data-area="chat"],[data-area="create"],[data-area="game"],[data-area="settings"])) {
    grid-template-columns: 60px 180px minmax(0, 1fr);
  }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-shell:has(> .kl-platform-context[data-area="explore"]) {
    --kl-explore-control: 40px;
    --kl-explore-small: 36px;
    --kl-explore-inset: 12px;
  }
}

.kl-shell-communities:empty { display: none; }
.kl-shell-communities { margin: 16px 0; padding-top: 16px; border-top: 1px solid var(--kl-border); }
.kl-shell-communities h3 { margin: 0 8px 12px; font-size: 10px; font-weight: 650; letter-spacing: .04em; text-transform: uppercase; color: var(--kl-muted); }
.kl-shell-communities p { margin: 8px; font-size: 11px; color: var(--kl-muted); line-height: 1.5; }
.kl-shell-community { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border: 0; border-radius: 7px; width: 100%; min-width: 0; text-align: left; background: transparent; color: var(--kl-muted); cursor: pointer; }
.kl-shell-community:hover { color: var(--kl-text); background: var(--kl-surface-hover); }
.kl-shell-community .kl-cm-emblem { width: 28px; height: 28px; border-radius: 8px; flex: none; }
.kl-shell-community .kl-cm-emblem svg { width: 15px; height: 15px; }
.kl-shell-community > span:last-child { min-width: 0; }
.kl-shell-community strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 500; }
.kl-shell-community small { display: block; margin-top: 3px; font-size: 10px; }
.kl-shell-community-browse { margin: 8px; padding: 4px 0; border: 0; background: none; color: var(--kl-muted); text-align: left; font-size: 11px; cursor: pointer; }
.kl-shell-community-create { display: flex; align-items: center; gap: 8px; width: calc(100% - 16px); margin: 8px; padding: 6px 0; border: 0; background: none; color: var(--kl-muted); text-align: left; font-size: var(--kl-type-sm); cursor: pointer; }
.kl-shell-community-create svg { width: 14px; height: 14px; flex: none; }
.kl-shell-community-create:hover { color: var(--kl-text); }
.kl-shell-community-create:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 3px; border-radius: 4px; }
.kl-shell-community:focus-visible, .kl-shell-community-browse:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: -2px; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) { .kl-shell-communities { display: none; } }

@media (max-width: 900px), (max-height: 500px) {
  .kl-panel[data-platform-preview="true"], .kl-panel[data-platform-preview="true"][data-side="left"] { inset: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left)); width: auto; height: auto; }
  .kl-panel[data-platform-preview="true"] .kl-topbar { cursor: default; touch-action: auto; }
  :host([data-keyboard-viewport="true"]) .kl-panel[data-platform-preview="true"] {
    top: var(--kl-visible-dialog-top);
    bottom: auto;
    height: var(--kl-visible-dialog-height);
  }
}

/* Prototype 17 conversation panels. Each history owns scrolling; notices and composers stay in flow. */
.kl-panel[data-platform-preview="true"] .kl-layout { grid-template-columns: minmax(190px, .76fr) minmax(0, 1.8fr); gap: 12px; padding: 24px; }
.kl-panel[data-platform-preview="true"] .kl-sidebar,
.kl-panel[data-platform-preview="true"] .kl-main { min-width: 0; min-height: 0; overflow: hidden; border: 1px solid var(--kl-border); border-radius: 9px; background: var(--kl-surface); }
.kl-panel[data-platform-preview="true"] .kl-main { grid-template-rows: minmax(0, 1fr); }
.kl-panel[data-platform-preview="true"] .kl-chat { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.kl-panel[data-platform-preview="true"] .kl-chat-header { flex: none; min-height: 62px; gap: 8px; padding: 10px 12px; background: var(--kl-topbar-bg); }
.kl-panel[data-platform-preview="true"] .kl-chat-name { font-size: var(--kl-type-body); font-weight: 600; }
.kl-panel[data-platform-preview="true"] .kl-chat-number { font-size: var(--kl-type-xs); }
.kl-panel[data-platform-preview="true"] .kl-search-wrap { padding: 12px; }
.kl-panel[data-platform-preview="true"] .kl-messages { flex: 1; min-height: 0; padding: 12px; }
.kl-panel[data-platform-preview="true"] .kl-message-bubble,
.kl-panel[data-platform-preview="true"] .kl-group-message-bubble { max-width: min(88%, 480px); padding: 8px 10px 5px; border: 1px solid var(--kl-border); border-radius: 9px 9px 9px 3px; background: var(--kl-surface-2); color: var(--kl-text); font-size: var(--kl-type-body); line-height: 1.75; }
.kl-panel[data-platform-preview="true"] .kl-message-bubble::before { content: none; }
.kl-panel[data-platform-preview="true"] .kl-message-row[data-direction="incoming"][data-group] .kl-message-bubble { border-radius: 9px 9px 9px 3px; }
.kl-panel[data-platform-preview="true"] .kl-message-row[data-direction="outgoing"] .kl-message-bubble,
.kl-panel[data-platform-preview="true"] .kl-group-message[data-own="true"] .kl-group-message-bubble { border-color: color-mix(in srgb, var(--kl-accent) 24%, transparent); border-radius: 9px 9px 3px 9px; background: color-mix(in srgb, var(--kl-accent) 9%, transparent); color: var(--kl-text); }
.kl-panel[data-platform-preview="true"] .kl-message-meta,
.kl-panel[data-platform-preview="true"] .kl-message-row[data-direction="outgoing"] .kl-message-meta,
.kl-panel[data-platform-preview="true"] .kl-group-message[data-own="true"] .kl-social-meta { color: var(--kl-muted); font-size: var(--kl-type-xxs); font-weight: 400; line-height: 1.4; gap: 3px 5px; margin-top: 3px; }
.kl-panel[data-platform-preview="true"] .kl-message-bubble[data-media="true"] { width: min(88%, 720px); max-width: min(88%, 720px); }
.kl-panel[data-platform-preview="true"] .kl-composer { flex: none; min-width: 0; max-height: 50%; overflow-y: auto; padding: 10px 12px; background: var(--kl-surface); }
.kl-panel[data-platform-preview="true"] .kl-composer-input { min-height: 58px; max-height: 120px; padding: 10px; border-radius: 7px; font-size: var(--kl-type-body); }
.kl-panel[data-platform-preview="true"] .kl-composer-options { font-size: var(--kl-type-xs); }
.kl-panel[data-platform-preview="true"] .kl-cloud[data-embedded="true"] { padding: 0; gap: 0; overflow: hidden; }
.kl-panel[data-platform-preview="true"] .kl-group-header { display: flex; min-height: 62px; gap: 8px; padding: 10px 12px; background: var(--kl-topbar-bg); }
.kl-panel[data-platform-preview="true"] .kl-group-header-avatar { width: 32px; height: 32px; border-radius: 50%; }
.kl-panel[data-platform-preview="true"] .kl-group-thread { min-height: 0; flex: 1 1 0; overflow: hidden; }
.kl-panel[data-platform-preview="true"] .kl-group-history { flex: 1 1 0; min-height: 0; padding: 12px; gap: 10px; }
.kl-panel[data-platform-preview="true"] .kl-group-message .kl-group-message-text { font-size: var(--kl-type-body); line-height: 1.75; }
.kl-panel[data-platform-preview="true"] .kl-group-composer { min-height: 0; max-height: 50%; overflow-y: auto; overscroll-behavior: contain; padding: 10px 12px; }
.kl-panel[data-platform-preview="true"] .kl-cloud .kl-group-input { min-height: 58px; height: 58px; max-height: 120px; border-radius: 7px; }
.kl-panel[data-platform-preview="true"] .kl-group-compose-main > .kl-social-primary { border-radius: 7px; }
.kl-panel[data-platform-preview="true"] .kl-group-retained-actions { flex: 0 1 auto; min-height: 0; max-height: 40%; overflow-y: auto; }
.kl-panel[data-platform-preview="true"] .kl-group-history-tools { z-index: 5; }
.kl-panel[data-platform-preview="true"] .kl-group-history-actions > .kl-text-button { min-height: 34px; }
@container kl-panel (max-width: 1250px) {
  .kl-panel[data-platform-preview="true"] .kl-layout { padding: 20px; }
}
@container kl-panel (max-width: 900px) {
  .kl-panel[data-platform-preview="true"] .kl-platform-wordmark { font-size: 17px; }
  .kl-panel[data-platform-preview="true"] .kl-platform-link { font-size: 11px; gap: 8px; padding-inline: 10px; }
}
/* Explicitly reset the legacy viewport-based one-pane rules for a wider addon. */
@container kl-panel (width > 900px) or ((width > 700px) and (height > 500px)) {
  .kl-panel[data-platform-preview="true"] .kl-sidebar { display: grid; }
  .kl-panel[data-platform-preview="true"][data-mobile-view="list"] .kl-main { display: grid; }
  .kl-panel[data-platform-preview="true"] .kl-back,
  .kl-panel[data-platform-preview="true"] .kl-group-back { display: none; }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-panel[data-platform-preview="true"] .kl-layout { grid-template-columns: minmax(0, 1fr); padding: 12px; gap: 0; }
  .kl-panel[data-platform-preview="true"][data-mobile-view="list"] .kl-main,
  .kl-panel[data-platform-preview="true"][data-mobile-view="chat"] .kl-sidebar { display: none; }
  .kl-panel[data-platform-preview="true"][data-mobile-view="chat"] .kl-main { display: grid; }
  .kl-panel[data-platform-preview="true"] .kl-back { display: grid; }
  .kl-panel[data-platform-preview="true"] .kl-group-back { display: inline-flex; }
  .kl-panel[data-platform-preview="true"] .kl-group-avatar-stack { display: none; }
  .kl-panel[data-platform-preview="true"] .kl-composer { padding: 8px 10px; }
  .kl-panel[data-platform-preview="true"] .kl-composer-input,
  .kl-panel[data-platform-preview="true"] .kl-cloud .kl-group-input { font-size: max(16px, var(--kl-type-body)); }
  .kl-panel[data-platform-preview="true"] .kl-message-bubble,
  .kl-panel[data-platform-preview="true"] .kl-group-message-bubble { max-width: min(90%, 560px); }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-panel[data-platform-preview="true"] .kl-layout { padding: 8px 12px; }
  .kl-panel[data-platform-preview="true"] .kl-chat-header,
  .kl-panel[data-platform-preview="true"] .kl-group-header { min-height: 44px; padding: 4px 8px; }
  .kl-panel[data-platform-preview="true"] .kl-group-header .kl-social-icon-button { width: 34px; height: 34px; min-height: 34px; padding: 7px; }
  .kl-panel[data-platform-preview="true"] .kl-composer,
  .kl-panel[data-platform-preview="true"] .kl-group-composer { max-height: 60%; padding: 6px 8px; }
  .kl-panel[data-platform-preview="true"] .kl-composer-input,
  .kl-panel[data-platform-preview="true"] .kl-cloud .kl-group-input { min-height: 42px; height: 42px; max-height: 70px; padding: 8px; }
  .kl-panel[data-platform-preview="true"] .kl-group-compose-main > .kl-social-primary,
  .kl-panel[data-platform-preview="true"] .kl-group-compose-main > .kl-social-icon-button { min-height: 42px; height: 42px; }
  .kl-panel[data-platform-preview="true"] .kl-group-compose-actions { display: none; }
  .kl-panel[data-platform-preview="true"] .kl-group-history,
  .kl-panel[data-platform-preview="true"] .kl-messages { padding: 8px; }
  .kl-panel[data-platform-preview="true"] .kl-group-history-tools > summary { min-height: 26px; padding-block: 4px; }
}

.kl-explore-share-dialog:is(.kl-dialog,.kl-sp-dialog) {
  position:fixed; box-sizing:border-box; width:min(540px,calc(100vw - 24px));
  max-width:calc(100vw - 24px); max-height:calc(100dvh - 24px); padding:0; overflow:hidden;
  border:1px solid var(--kl-border-strong); border-radius:12px; background:var(--kl-surface);
  box-shadow:var(--kl-shadow); color:var(--kl-text); font:12px/1.5 var(--kl-font,system-ui);
}
.kl-explore-share-dialog[open] { display:flex; flex-direction:column; }
.kl-explore-share-dialog:is(.kl-dialog,.kl-sp-dialog)::backdrop { background:#030303b8; }
.kl-explore-share-dialog > .kl-explore-share-heading {
  display:flex; flex:none; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px;
  border-bottom:1px solid var(--kl-border);
}
.kl-explore-share-heading > div { min-width:0; }
.kl-explore-share-dialog .kl-explore-share-heading h2 {
  margin:0; font:700 16px/1.4 var(--kl-title-font,var(--kl-font,system-ui)); letter-spacing:-.2px; overflow-wrap:anywhere;
}
.kl-explore-share-eyebrow {
  display:block; color:var(--kl-text-faint,rgba(245,238,227,.58)); font-size:10px; line-height:1.7; letter-spacing:.25px;
}
.kl-explore-share-dialog .kl-explore-share-heading > .kl-browse-icon {
  flex:none; width:32px; height:32px; min-height:32px; padding:0; border:0; border-radius:7px;
  color:var(--kl-muted); background:transparent;
}
.kl-explore-share-dialog .kl-explore-share-heading > .kl-browse-icon:hover {
  color:var(--kl-text); background:var(--kl-surface-hover);
}
.kl-explore-share-heading .kl-browse-icon > .kl-icon { width:17px; height:17px; }
.kl-explore-share-dialog > .kl-explore-share-body {
  min-width:0; min-height:0; padding:16px; overflow:auto; overscroll-behavior:contain;
}
.kl-explore-share-dialog .kl-explore-share-body > p {
  margin:12px 0; color:var(--kl-text-faint,rgba(245,238,227,.58)); font-size:10px; line-height:1.5;
}
.kl-explore-share-dialog .kl-explore-share-body > [role="status"]:empty { display:none; }
.kl-explore-share-dialog .kl-explore-share-body > label {
  display:grid; gap:6px; min-width:0; font-size:12px; font-weight:550;
}
.kl-explore-share-dialog .kl-explore-share-body input {
  box-sizing:border-box; width:100%; min-width:0; min-height:0; padding:8px 10px;
  border:1px solid var(--kl-border); border-radius:7px; background:var(--kl-input-bg);
  color:var(--kl-text); font:400 12px/1.5 var(--kl-font,system-ui);
}
.kl-explore-share-dialog .kl-explore-share-body input:focus { border-color:var(--kl-border-strong); }
.kl-explore-share-dialog > .kl-explore-share-footer {
  display:flex; flex:none; flex-wrap:wrap; align-items:center; justify-content:flex-end; gap:8px;
  padding:12px 16px; border-top:1px solid var(--kl-border); background:var(--kl-input-bg);
}
.kl-explore-share-dialog .kl-explore-share-footer > .kl-text-button { min-height:36px; border-radius:7px; }
.kl-explore-share-dialog .kl-explore-share-footer > .kl-text-button:first-child { background:transparent; }
.kl-explore-share-dialog .kl-explore-share-footer > .kl-text-button:first-child:hover { background:var(--kl-surface-hover); }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-explore-share-dialog > :is(.kl-explore-share-heading,.kl-explore-share-footer) { padding:10px 12px; }
  .kl-explore-share-dialog > .kl-explore-share-body { padding:12px; }
  .kl-explore-share-dialog .kl-explore-share-heading h2 { font-size:15px; }
  .kl-explore-share-dialog .kl-explore-share-heading > .kl-browse-icon { width:40px; height:40px; min-height:40px; }
  .kl-explore-share-dialog .kl-explore-share-body input { font-size:16px; }
  .kl-explore-share-dialog .kl-explore-share-footer > .kl-text-button { min-height:40px; }
}

/* Native moderation dialogs share the application tokens and remain inside its ShadowRoot. */
.kl-moderation-dialog {
  box-sizing:border-box; width:min(540px,calc(100vw - 24px)); max-width:calc(100vw - 24px);
  max-height:calc(100dvh - 24px); overflow:hidden; padding:0; grid-template-rows:auto minmax(0,1fr) auto;
  border:1px solid var(--kl-border-strong); border-radius:12px; color:var(--kl-text);
  background:var(--kl-surface); box-shadow:var(--kl-shadow);
}
.kl-moderation-dialog::backdrop { background:#030303b8; }
.kl-moderation-dialog > .kl-dialog-header {
  display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px;
  border-bottom:1px solid var(--kl-border); background:var(--kl-surface);
}
.kl-mod-dialog-heading { flex:1; min-width:0; }
.kl-moderation-dialog > .kl-dialog-header h2 {
  margin:0; font-family:var(--kl-title-font,var(--kl-font,inherit)); font-size:16px; font-weight:700; line-height:1.4;
}
.kl-moderation-dialog > .kl-dialog-header .kl-mod-icon {
  width:32px; min-width:32px; height:32px; min-height:32px; padding:7px;
  color:var(--kl-muted); border-color:transparent; border-radius:7px; background:transparent;
}
.kl-moderation-dialog > .kl-dialog-header .kl-mod-icon:hover { color:var(--kl-text); background:var(--kl-surface-hover); }
.kl-moderation-dialog > .kl-mod-dialog-body {
  min-width:0; min-height:0; margin:0; padding:16px; overflow-y:auto; overflow-x:hidden; overscroll-behavior:contain;
  border:0; border-radius:0; background:transparent; overflow-wrap:anywhere;
}
.kl-moderation-dialog .kl-mod-dialog-body label { display:grid; gap:6px; margin:0 0 14px; font-size:12px; font-weight:550; }
.kl-moderation-dialog .kl-mod-dialog-body :is(label,fieldset) :is(select,textarea) {
  width:100%; min-width:0; font-weight:400;
}
.kl-moderation-dialog .kl-mod-dialog-body label select,
.kl-moderation-dialog .kl-mod-dialog-body fieldset select { height:36px; }
.kl-moderation-dialog > .kl-mod-dialog-footer {
  display:flex; flex-wrap:wrap; align-items:center; justify-content:flex-end; gap:8px; margin:0;
  padding:12px 16px; border-top:1px solid var(--kl-border); background:var(--kl-input-bg);
}
.kl-moderation-dialog > .kl-mod-dialog-footer:empty { display:none; }
.kl-moderation-dialog > .kl-mod-dialog-footer > :first-child:not(:last-child) { margin-inline-end:auto; }
.kl-moderation-dialog .kl-mod-dialog-footer .kl-text-button { border-radius:7px; }
.kl-moderation-dialog .kl-mod-dialog-footer .kl-text-button:not(.kl-text-button--primary) { background:transparent; }
.kl-moderation-dialog .kl-mod-dialog-footer .kl-text-button:not(.kl-text-button--primary):hover { background:var(--kl-surface-hover); }
.kl-mod-page .kl-mod-icon { display:inline-flex;align-items:center;justify-content:center;flex:none;width:36px;padding:8px; }
.kl-mod-icon svg { width:16px;height:16px; }
.kl-mod-dialog-body .kl-report-form--compact { display:block; padding:0; border:0; background:transparent; box-shadow:none; }
.kl-report-form--compact fieldset { min-width:0; margin:0 0 14px; padding:0; border:0; }
.kl-report-form--compact legend { margin-bottom:6px; padding:0; font-size:12px; font-weight:550; }
.kl-mod-report-dialog .kl-report-form--compact > label,
.kl-mod-decision-dialog .kl-mod-dialog-body label:has(textarea) { margin-bottom:4px; }
.kl-mod-report-dialog .kl-mod-dialog-body textarea,
.kl-mod-decision-dialog .kl-mod-dialog-body textarea { min-height:120px; resize:vertical; }
.kl-report-counter { display:block; text-align:right; color:var(--kl-muted); font-size:10px; }
.kl-report-form--compact .kl-cloud-status { margin:12px 0 0; font-size:11px; }
.kl-community-report-body .kl-mod-target-search { margin:0 0 14px; }
.kl-community-report-body > .kl-mod-note:empty,
.kl-community-report-body > .kl-mod-actions:empty { display:none; }
.kl-mod-report-dialog .kl-mod-dialog-body > .kl-mod-note { margin:12px 0 0; }
.kl-mod-dialog-footer > .kl-cloud-actions { display:flex; flex:1; justify-content:space-between; gap:8px; margin:0; }
.kl-mod-report-dialog .kl-mod-notice { margin-top:12px; }
.kl-mod-report-dialog .kl-mod-notice button + button { margin-inline-start:8px; }
.kl-workshop-report-dialog .kl-mod-eyebrow { display:none; }
@media (width > 900px), (width > 700px) and (height > 500px) {
 .kl-workshop-report-dialog.kl-moderation-dialog > .kl-dialog-header { min-height:64px; }
 .kl-workshop-report-dialog.kl-moderation-dialog > .kl-mod-dialog-footer { min-height:61px; }
}
.kl-mod-search { display:flex; align-items:center; flex:1 1 170px; min-width:0; border:1px solid var(--kl-border); border-radius:8px; background:var(--kl-input-bg); }
.kl-mod-toolbar .kl-mod-search input { width:100%; min-width:0; border:0; background:transparent; }
.kl-mod-page .kl-mod-search .kl-text-button { order:-1; flex:none; width:34px; min-height:34px; padding:8px; border:0; background:transparent; }
.kl-mod-search svg { width:14px;height:14px; }
.kl-mod-list .kl-mod-main > time { display:block;margin-top:6px; }
.kl-mod-report-target {
  display:flex; align-items:center; flex-wrap:wrap; gap:6px 10px; min-width:0; margin:0 0 16px;
  padding:12px; border:1px solid var(--kl-border); border-radius:8px; background:var(--kl-input-bg); overflow-wrap:anywhere;
}
.kl-mod-report-target strong { flex:1 1 auto; min-width:0; font-size:12px; }
.kl-mod-report-target > .kl-mod-note { flex-basis:100%; }
.kl-cm-moderation { container-type:inline-size; }
.kl-mod-columns { display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:18px;align-items:start; }
.kl-mod-content { min-width:0; }
@container (max-width:740px) { .kl-mod-columns { grid-template-columns:minmax(0,1fr); } .kl-mod-context { grid-row:1; } }
.kl-mod-context { padding:16px; margin:12px 0; border:1px solid var(--kl-border); border-radius:8px; background:var(--kl-surface); }
.kl-mod-role-matrix { width:100%; border-collapse:collapse; font-size:12px; }
.kl-mod-role-matrix th,.kl-mod-role-matrix td { text-align:left; padding:10px 8px; border-bottom:1px solid var(--kl-border); vertical-align:top; overflow-wrap:anywhere; }
.kl-mod-role-matrix th { width:30%; }
.kl-mod-tabs [role=tab][aria-selected=true] { color:var(--kl-text); background:transparent; border-bottom-color:var(--kl-accent); }
@media (max-width:700px),(max-width:900px) and (max-height:500px) {
 .kl-moderation-dialog > .kl-dialog-header,.kl-moderation-dialog > .kl-mod-dialog-footer { padding:10px 12px; }
 .kl-moderation-dialog > .kl-dialog-header h2 { font-size:15px; }
 .kl-moderation-dialog > .kl-dialog-header .kl-mod-icon { width:40px; min-width:40px; height:40px; min-height:40px; }
 .kl-moderation-dialog > .kl-mod-dialog-body { padding:12px; }
 .kl-moderation-dialog .kl-mod-dialog-body label select,.kl-moderation-dialog .kl-mod-dialog-body fieldset select { height:40px; }
 .kl-moderation-dialog .kl-mod-dialog-footer .kl-text-button { min-height:40px; padding-inline:10px; }
}
/* Prototype 17 moderation: compact queues, distinct evidence and decision panels. */
.kl-cloud[data-surface="moderation"] > .kl-cloud-bar, .kl-cloud[data-surface="moderation"] > .kl-cloud-tabs { display: none; }
.kl-mod-page.kl-cm-moderation { display: block; }
.kl-mod-page .kl-mod-detail { display: block; }
.kl-mod-page { min-width: 0; color: var(--kl-text); }
.kl-mod-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.kl-mod-header > div, .kl-mod-main { flex: 1; min-width: 0; }
.kl-mod-header > .kl-mod-actions { flex: 0 1 auto; margin: 0; }
.kl-mod-header h1 { margin: 0; font-size: 24px; font-weight: 700; line-height: 1.3; overflow-wrap: anywhere; }
.kl-mod-eyebrow { display:block; font-size: 10px; line-height:1.7; color: var(--kl-muted); letter-spacing: .25px; }
.kl-mod-page .kl-mod-header .kl-mod-note { margin:6px 0 0; font-size:12px; }
.kl-mod-count { margin:0 0 12px; color:var(--kl-muted);font-size:10px;line-height:1.7; }
.kl-shell-menu-item[aria-checked="true"]::after { content:'✓'; margin-left:auto; }
.kl-mod-page .kl-mod-note, .kl-cm-management .kl-mod-note, .kl-cm-role-guide .kl-mod-note { color: var(--kl-muted); font-size: 11px; line-height: 1.7; margin: 4px 0; overflow-wrap: anywhere; }
.kl-mod-tabs { display: flex; flex-wrap: nowrap; gap: 20px; padding-bottom: 0; margin-bottom: 12px; border-bottom: 1px solid var(--kl-border); overflow-x: auto; }
.kl-mod-page .kl-mod-tabs .kl-text-button { flex: none; min-height: 44px; padding: 10px 2px; border: 0; border-bottom: 2px solid transparent; border-radius: 0; color: var(--kl-muted); background: transparent; font-weight: 500; }
.kl-mod-page .kl-mod-tabs [aria-pressed="true"], .kl-mod-page .kl-mod-tabs [aria-selected="true"] { color: var(--kl-text); background: transparent; border-bottom-color: var(--kl-accent); }
.kl-mod-toolbar, .kl-mod-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 12px 0; min-width: 0; }
.kl-mod-page .kl-mod-header + .kl-mod-toolbar { margin-top: 0; }
.kl-mod-toolbar input { flex: 1 1 170px; min-width: 0; }
.kl-mod-toolbar select { flex: 0 1 auto; min-width: 0; font-size:11px; }
.kl-mod-search:focus-within { outline: 2px solid var(--kl-accent); outline-offset: 2px; }
.kl-mod-page .kl-mod-search input:focus-visible { outline: none; }
.kl-mod-page .kl-mod-search button:focus-visible { outline-offset: -2px; }
.kl-mod-search > .kl-icon { flex: none; margin-inline: 10px 2px; color: var(--kl-muted); }
.kl-mod-triage { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 8px; margin: 12px 0; min-width: 0; }
.kl-mod-triage .kl-mod-actions { align-items: flex-end; margin: 0; }
.kl-mod-triage label { display: grid; gap: 6px; font-size: 11px; min-width: 0; flex: 0 1 180px; }
.kl-mod-page input, .kl-mod-page select, .kl-mod-page textarea { box-sizing: border-box; max-width: 100%; border: 1px solid var(--kl-border); border-radius: 7px; padding: 8px 10px; color: var(--kl-text); background: var(--kl-input-bg, var(--kl-surface)); font: inherit; font-size: 12px; }
.kl-restoration-message { display:grid; gap:8px; margin:16px 0 8px; max-width:680px; }
.kl-restoration-message textarea { width:100%; min-height:100px; resize:vertical; }
.kl-mod-page input, .kl-mod-page select { min-height: 36px; }
.kl-safety > .kl-mod-row { margin: 10px 0; }
.kl-settings-safety .kl-settings-panel-body { min-width: 0; }
.kl-mod-list { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.kl-safety > .kl-mod-row, .kl-mod-list .kl-mod-row { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 10px 12px; padding: 12px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg, var(--kl-surface)); }
.kl-safety > .kl-mod-row > div, .kl-mod-list .kl-mod-main { flex: 1 1 180px; }
.kl-mod-row-actions { display: flex; justify-content: flex-end; flex: 0 1 auto; }
.kl-mod-page .kl-mod-row-actions > .kl-text-button { background: transparent; }
.kl-mod-page .kl-mod-row-actions > .kl-text-button:hover { background: var(--kl-surface-hover); }
.kl-mod-row-meta { display: block; margin-top: 4px; }
.kl-mod-list .kl-mod-main > h3 { margin-block: 0; }
.kl-mod-page h3 { font-size: 13px; line-height: 1.5; margin: 6px 0; overflow-wrap: anywhere; }
.kl-mod-row p, .kl-mod-copy { margin: 6px 0; font-size: 11px; line-height: 1.7; white-space: pre-line; overflow-wrap: anywhere; color: var(--kl-muted); }
.kl-mod-row time, .kl-mod-row small { font-size: 10px; color: var(--kl-muted); }
.kl-mod-status { display: flex; align-items: center; flex-wrap: wrap; gap: 5px 8px; }
.kl-mod-row .kl-mod-status { margin-bottom: 8px; }
.kl-mod-badge { display: inline-flex; max-width: 100%; padding: 2px 5px; border: 1px solid var(--kl-border); border-radius: 5px; font-size: 10px; line-height: 1.4; color: var(--kl-muted); overflow-wrap: anywhere; }
.kl-mod-detail > .kl-mod-badge + .kl-mod-badge { margin-inline-start: 6px; }
.kl-mod-detail, .kl-mod-evidence, .kl-mod-decision { min-width: 0; margin: 12px 0; padding: 12px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg, var(--kl-surface)); }
.kl-mod-page h2 { margin: 0 0 12px; font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; }
.kl-mod-evidence > h2, .kl-mod-page .kl-mod-receipt > h2 { margin-bottom: 8px; font-size: 12px; }
.kl-mod-detail > h2 { font-size: 20px; }
.kl-mod-meta { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; margin: 14px 0; }
.kl-mod-meta dt { color: var(--kl-muted); font-size: 10px; margin-bottom: 3px; }
.kl-mod-meta dd { margin: 0; font-size: 12px; overflow-wrap: anywhere; }
.kl-mod-receipt .kl-mod-meta dd { font-size: 11px; line-height: 1.7; }
.kl-mod-evidence blockquote { border-left: 2px solid var(--kl-border); padding-left: 12px; margin: 8px 0; font-size: 12px; line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; }
.kl-mod-evidence img { max-width: 100%; max-height: 300px; object-fit: contain; }
.kl-mod-decision label { display: grid; gap: 8px; font-size: 12px; margin: 12px 0; }
.kl-mod-recovered-note textarea { width: 100%; min-height: 72px; resize: vertical; }
.kl-mod-decision textarea { width: 100%; min-height: 100px; resize: vertical; }
.kl-mod-notice { padding: 12px; border: 1px solid var(--kl-border); border-radius: 8px; color: var(--kl-text); background: var(--kl-surface-hover); font-size: 12px; line-height: 1.7; }
.kl-mod-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 0; padding: 24px 16px; border: 1px dashed var(--kl-border); border-radius: 10px; text-align: center; }
.kl-mod-empty > .kl-icon { width: 28px; height: 28px; margin-bottom: 4px; color: var(--kl-muted); }
.kl-mod-page .kl-mod-empty h2 { margin: 0; font-size: 16px; }
.kl-mod-page .kl-mod-empty p { max-width: 340px; margin: 0; }
.kl-mod-page .kl-text-button { font-size: 11px; min-height: 36px; max-width: 100%; white-space: normal; overflow-wrap: anywhere; }
.kl-mod-page .kl-mod-back { display: inline-flex; align-items: center; justify-content: flex-start; gap: 6px; padding-inline: 4px; border-color: transparent; background: transparent; color: var(--kl-muted); }
.kl-mod-page > .kl-mod-back { margin-bottom: 8px; }
.kl-mod-back > .kl-icon { flex: none; width: 14px; height: 14px; }
.kl-mod-page .kl-mod-back:hover { color: var(--kl-text); background: var(--kl-surface-hover); }
.kl-mod-page :focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 2px; }
.kl-cm-management { padding: 14px; margin: 12px 0; border: 1px solid var(--kl-border); border-radius: 8px; }
.kl-cm-role-guide { margin-top: 16px; padding: 14px; border: 1px solid var(--kl-border); border-radius: 8px; }
.kl-cm-role-guide table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 11px; text-align: left; }
.kl-cm-role-guide th, .kl-cm-role-guide td { padding: 9px 8px; border-bottom: 1px solid var(--kl-border); vertical-align: top; overflow-wrap: anywhere; }
.kl-cm-role-guide th { width: 30%; font-weight: 500; }
.kl-cm-role-guide td { color: var(--kl-muted); line-height: 1.7; }
.kl-communities-page .kl-cm-management-heading { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; font-size: 13px; }
@media (max-width:700px), (max-height:480px) {
  .kl-mod-header { flex-wrap: wrap; }
  .kl-mod-page .kl-text-button, .kl-mod-page select, .kl-mod-page input { min-height: 40px; }
  .kl-safety > .kl-mod-row, .kl-mod-list .kl-mod-row { padding: 12px; }
  .kl-mod-tabs { gap: 2px; }
}
@media (max-width:700px) {
  .kl-mod-header { align-items:flex-start;gap:10px; }
  .kl-mod-header > div, .kl-mod-header > .kl-mod-actions { flex:1 1 190px; }
  .kl-mod-header h1 { font-size:23px; }
  .kl-mod-page .kl-mod-header .kl-mod-note { font-size:11px; }
  .kl-mod-toolbar > .kl-mod-search { flex-basis:100%; }
  .kl-mod-toolbar > select { flex:1 1 145px; }
  .kl-safety > .kl-mod-row > .kl-mod-main, .kl-mod-list .kl-mod-row > .kl-mod-main { flex-basis:100%; }
  .kl-mod-row > .kl-mod-row-actions { flex-basis: 100%; justify-content: flex-start; }
}
@media (max-width:900px) and (max-height:500px) {
  .kl-mod-header { margin-bottom:8px; }
  .kl-mod-header h1 { font-size:20px; }
  .kl-mod-header .kl-mod-eyebrow { display:none; }
}
`;
