export const COMMUNITY_STYLES = `
.kl-nav-item { position: relative; }
.kl-topbar .kl-brand { flex: 0 1 220px; width:220px; min-width:48px; }
.kl-brand-subtitle { flex-wrap:nowrap; gap:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
/* Keep the same combined desktop budget while moving the workspace title 22px
   left and giving it enough room for "Custom Activities". */
.kl-topbar-drag-space { min-width:6px; flex:0 0 6px; }
.kl-topbar-context { flex:1 1 176px; width:0; min-width:0; text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.kl-mailbox-trigger { position:relative; }
.kl-mailbox-trigger .kl-roster-count { top:-5px; right:-5px; }
.kl-mailbox-popover { width:min(380px,calc(100vw - 16px)); max-width:calc(100vw - 16px); max-height:min(520px,calc(100dvh - 20px)); padding:14px; margin:0; }
.kl-mailbox-popover > header { justify-content:space-between; gap:6px; }
.kl-mailbox-popover > header > strong { flex:1; }
.kl-mailbox-list { overflow:auto; overscroll-behavior:contain; max-height:min(420px,calc(100dvh - 130px)); }
.kl-mailbox-item { padding:12px 2px; border-bottom:1px solid var(--kl-border); display:grid; gap:6px; }
.kl-mailbox-item[data-unread="true"] { border-left:3px solid var(--kl-gold); padding-left:10px; }
.kl-mailbox-item > button { text-align:left; justify-content:flex-start; white-space:normal; }
.kl-mailbox-item time { color:var(--kl-muted); font-size:var(--kl-type-xs); }
.kl-relationship-controls { display:flex; align-items:center; gap:6px; flex-wrap:wrap; min-width:0; }
.kl-friend-action { display:inline-flex; gap:6px; align-items:center; justify-content:center; min-height:40px; min-width:148px; }
.kl-friend-action svg { width:16px; height:16px; flex:none; }
.kl-relationship-controls > .kl-cloud-status { flex-basis:100%; }
.kl-addon-profile-actions > .kl-relationship-controls { grid-column:1/-1; }
.kl-players-toolbar { display:flex; flex-wrap:wrap; gap:8px; }
.kl-players-toolbar button { display:inline-flex; align-items:center; gap:6px; }
.kl-players-toolbar svg { width:16px; height:16px; }
.kl-friend-navigation { display:grid; gap:6px; padding:0 0 10px; }
.kl-request-segments { background:var(--kl-surface); border:1px solid var(--kl-border); border-radius:12px; padding:3px; }
.kl-request-segments button { flex:1; }
.kl-directory-filter[aria-pressed="true"] { color:var(--kl-text); border-color:var(--kl-gold); background:color-mix(in srgb,var(--kl-gold),transparent 90%); }
.kl-request-actions { grid-column:2/-1; }
.kl-player-tags { display:flex; flex-wrap:wrap; gap:4px; min-width:0; }
.kl-player-tag { display:inline-flex; align-items:center; gap:3px; font-size:10px; color:var(--kl-muted); max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.kl-player-tag svg { width:10px; height:10px; flex:none; }
.kl-picker-selection { display:flex; align-items:center; flex-wrap:wrap; gap:6px; }
.kl-picker-selection > small { flex-basis:100%; color:var(--kl-muted); }
.kl-picker-selection button { min-height:30px; font-size:var(--kl-type-xs); }
.kl-contact[data-selected="true"] { border-color:var(--kl-gold); background:color-mix(in srgb,var(--kl-gold),transparent 88%); }
.kl-contact > svg { width:18px; height:18px; margin-left:auto; }
.kl-message-meta { flex-wrap:wrap; }
.kl-message-delivery { font-size:var(--kl-type-xxs); }
.kl-message-meta .kl-text-button { min-height:24px; font-size:var(--kl-type-xs); padding:2px 6px; }
.kl-direct-consent { border:1px solid var(--kl-border); border-radius:12px; padding:12px; }
.kl-direct-consent p { color:var(--kl-muted); font-size:var(--kl-type-sm); }
@container kl-panel (max-width:920px) {
  .kl-topbar .kl-brand { flex-basis:194px; width:194px; }
  .kl-brand-subtitle { display:grid; gap:0; }
  .kl-topbar-context,.kl-local-clock { display:none; }
  .kl-topbar-drag-space { flex:1 1 72px; }
}
@container kl-panel (max-width:820px) {
  .kl-topbar-drag-space,.kl-finder-trigger-label { display:none; }
  .kl-topbar .kl-presence-trigger { min-width:90px; flex:0 1 180px; }
  .kl-topbar .kl-finder-trigger { width:var(--kl-topbar-action-size); padding-inline:0; justify-content:center; }
}
@container kl-panel (max-width:600px) {
  .kl-topbar .kl-brand { flex:1 1 80px; width:auto; min-width:50px; }
  .kl-brand-title { max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .kl-topbar .kl-brand-subtitle,.kl-topbar-drag-space,.kl-topbar .kl-finder-trigger,.kl-topbar .kl-presence-trigger { display:none; }
  .kl-topbar { gap:6px; padding-inline:10px; }
  .kl-topbar .kl-topbar-settings,.kl-topbar > .kl-icon-button:last-child { width:36px; height:40px; }
  .kl-brand-emblem { width:30px; height:30px; }
}

/* News and Mailbox share one outer size in every density and input mode.
   Keep this after the general button rules, including the touch overrides. */
.kl-topbar { --kl-topbar-action-size:40px; }
:host([data-density="super-compact"]) .kl-topbar { --kl-topbar-action-size:34px; }
.kl-topbar .kl-text-button.kl-news-trigger,
.kl-topbar .kl-icon-button.kl-mailbox-trigger {
  height:var(--kl-topbar-action-size); min-height:var(--kl-topbar-action-size); align-self:center;
}
.kl-topbar .kl-icon-button.kl-mailbox-trigger {
  width:var(--kl-topbar-action-size); min-width:var(--kl-topbar-action-size); flex:0 0 var(--kl-topbar-action-size); padding:0;
}
@media (max-width:720px), (pointer:coarse) {
  .kl-topbar { --kl-topbar-action-size:44px; }
  :host([data-density="super-compact"]) .kl-topbar { --kl-topbar-action-size:44px; }
}

.kl-content-dialog { width:min(700px,calc(100vw - 24px)); max-height:calc(100dvh - 24px); }
.kl-content-dialog .kl-dialog-body { overflow:auto; }
.kl-report-dialog { width:min(460px,calc(100vw - 24px)); }
.kl-report-dialog .kl-report-form { border:0; padding:0; box-shadow:none; background:transparent; }
.kl-report-reasons { display:grid; gap:6px; min-width:0; margin:0; padding:0; border:0; }
.kl-report-reasons legend { margin-bottom:10px; color:var(--kl-text); }
.kl-report-reason { display:flex; align-items:center; gap:10px; min-height:42px; padding:8px 10px; border:1px solid var(--kl-border); border-radius:10px; cursor:pointer; }
.kl-report-reason:has(input:checked) { border-color:var(--kl-gold); background:var(--kl-surface-2); }
.kl-report-reason:focus-within { outline:2px solid var(--kl-gold); outline-offset:2px; }
.kl-report-form .kl-report-reason input { flex:0 0 auto; width:16px; height:16px; margin:0; padding:0; accent-color:var(--kl-gold); }
.kl-report-form > label { display:grid; gap:8px; }
.kl-report-form .kl-cloud-status:empty { display:none; }
.kl-content-dialog:has(.kl-mute-sheet) { width:min(360px,calc(100vw - 24px)); }
.kl-full-image { display:grid; justify-items:center; gap:12px; }
.kl-full-image img { max-width:100%; max-height:72dvh; width:auto; height:auto; object-fit:contain; }
.kl-avatar-expand { position:absolute; inset:0; border:0; background:transparent; border-radius:inherit; cursor:zoom-in; z-index:9; }
.kl-avatar-expand:disabled { cursor:default; }
.kl-avatar-expand:focus-visible { outline:2px solid var(--kl-profile-accent,var(--kl-gold)); outline-offset:4px; }
.kl-addon-profile-facts { grid-auto-rows:minmax(63px,1fr); }
.kl-addon-profile-fact strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
`;
