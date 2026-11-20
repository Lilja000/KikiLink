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
.kl-mailbox-popover { width:min(300px,calc(100vw - 16px)); max-width:calc(100vw - 16px); max-height:min(520px,calc(100dvh - 20px)); padding:0; margin:0; }
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
.kl-content-dialog:has(.kl-group-invitation-review,.kl-personal-mail-reader) {
  --kl-invite-side:16px; --kl-invite-bar:12px; --kl-invite-button:36px; --kl-invite-close:32px;
  width:min(540px,calc(100vw - 24px)); grid-template-rows:auto minmax(0,1fr); border-color:var(--kl-border-strong);
  border-radius:12px; background:var(--kl-surface); box-shadow:0 8px 24px #0005; font:12px/1.5 var(--kl-font,system-ui);
}
.kl-content-dialog:has(.kl-group-invitation-review,.kl-personal-mail-reader) > .kl-dialog-header { gap:12px; padding:var(--kl-invite-bar) var(--kl-invite-side); background:var(--kl-surface); }
.kl-content-dialog:has(.kl-group-invitation-review,.kl-personal-mail-reader) .kl-dialog-title { flex:1; min-width:0; font:700 16px/1.4 var(--kl-font,system-ui); letter-spacing:-.2px; overflow-wrap:anywhere; }
.kl-content-dialog:has(.kl-group-invitation-review,.kl-personal-mail-reader) .kl-dialog-title::before { content:'KIKILINK' / ''; display:block; color:var(--kl-text-faint,var(--kl-muted)); font:400 10px/1.7 var(--kl-font,system-ui); letter-spacing:.25px; }
.kl-content-dialog:has(.kl-group-invitation-review,.kl-personal-mail-reader) .kl-dialog-header > .kl-icon-button { flex:none; width:var(--kl-invite-close); height:var(--kl-invite-close); min-width:0; min-height:0; padding:0; border:0; border-radius:8px; color:var(--kl-muted); background:transparent; }
.kl-content-dialog:has(.kl-group-invitation-review,.kl-personal-mail-reader) .kl-dialog-header > .kl-icon-button:hover { color:var(--kl-text); background:var(--kl-surface-hover); }
.kl-content-dialog:has(.kl-group-invitation-review,.kl-personal-mail-reader) .kl-dialog-header .kl-icon { width:16px; height:16px; }
.kl-content-dialog:has(.kl-group-invitation-review,.kl-personal-mail-reader) > .kl-dialog-body { display:flex; padding:0; overflow:hidden; }
.kl-group-invitation-review { display:flex; flex-direction:column; min-height:0; min-width:0; width:100%; }
.kl-group-invitation-review:not(:has(.kl-group-invitation-review-card)) { overflow:auto; gap:8px; padding:var(--kl-invite-side); }
.kl-group-invitation-review > .kl-group-invitation-review-card { display:flex; flex-direction:column; gap:0; min-height:0; min-width:0; padding:0; margin:0; border:0; border-radius:0; }
.kl-group-invitation-review-body { min-height:0; padding:var(--kl-invite-side); overflow:auto; overscroll-behavior:contain; }
.kl-group-invitation-review-summary { display:flex; flex-direction:column; align-items:center; gap:6px; padding:4px 0 12px; text-align:center; }
.kl-group-invitation-review-icon { display:grid; place-items:center; flex:none; width:56px; height:56px; overflow:hidden; margin-bottom:4px; border:1px solid var(--kl-border); border-radius:50%; color:#dac7a8; background:#332c25; }
.kl-group-invitation-review-icon .kl-icon { width:16px; height:16px; }
.kl-group-invitation-review-icon img { display:block; width:100%; height:100%; object-fit:cover; border-radius:inherit; }
.kl-group-invitation-review-summary h3 { min-width:0; max-width:100%; margin:0; font:650 13px/1.5 var(--kl-font,system-ui); overflow-wrap:anywhere; }
.kl-group-invitation-review-summary p { margin:0; color:var(--kl-muted); font-size:12px; }
.kl-group-invitation-count { color:var(--kl-text-faint,var(--kl-muted)); font-size:10px; }
.kl-group-invitation-members { min-width:0; list-style:none; margin:12px 0 0; padding:0; }
.kl-group-invitation-members > li { display:flex; align-items:center; gap:9px; min-width:0; padding:10px 0; border-bottom:1px solid var(--kl-border); }
.kl-group-invitation-members > li:last-child { border-bottom:0; }
.kl-group-invitation-members .kl-group-invitation-member-avatar { flex:none; width:32px; height:32px; border-radius:50%; font:600 10px/1 var(--kl-font,system-ui); }
.kl-group-invitation-members strong { flex:1; min-width:0; font-size:12px; overflow-wrap:anywhere; }
.kl-group-invitation-role { flex:none; padding:2px 6px; border:1px solid var(--kl-border); border-radius:6px; color:var(--kl-muted); font-size:10px; line-height:1.4; }
.kl-group-invitation-review-body > [role="status"] { margin:8px 0 0; }
.kl-group-invitation-review-body > .kl-group-invitation-outcome { margin:12px 0; color:var(--kl-text-faint,var(--kl-muted)); font-size:10px; }
.kl-group-invitation-review-body > [role="status"]:empty { display:none; }
:is(.kl-group-invitation-review-card,.kl-personal-mail-reader) > .kl-cloud-actions { flex:none; justify-content:flex-end; gap:8px; padding:var(--kl-invite-bar) var(--kl-invite-side); border-top:1px solid var(--kl-border); background:var(--kl-input-bg); }
:is(.kl-group-invitation-review-card,.kl-personal-mail-reader) > .kl-cloud-actions > :first-child:not(:last-child) { margin-right:auto; }
:is(.kl-group-invitation-review-card,.kl-personal-mail-reader) > .kl-cloud-actions > button { min-height:var(--kl-invite-button); padding:0 12px; border-radius:8px; background:transparent; font:550 12px/1.5 var(--kl-font,system-ui); }
:is(.kl-group-invitation-review-card,.kl-personal-mail-reader) > .kl-cloud-actions > button:hover:not(:disabled) { background:var(--kl-surface-hover); border-color:var(--kl-border-strong); }
:is(.kl-group-invitation-review-card,.kl-personal-mail-reader) > .kl-cloud-actions > .kl-text-button--primary { color:var(--kl-accent-foreground,#fff8ee); border-color:color-mix(in srgb,var(--kl-accent) 58%,var(--kl-muted)); background:var(--kl-accent); }
:is(.kl-group-invitation-review-card,.kl-personal-mail-reader) > .kl-cloud-actions > .kl-text-button--primary:hover:not(:disabled) { background:color-mix(in srgb,var(--kl-accent),white 12%); }
@media (max-width:700px), (max-width:900px) and (max-height:500px) {
  .kl-content-dialog:has(.kl-group-invitation-review,.kl-personal-mail-reader) { --kl-invite-side:12px; --kl-invite-bar:10px; --kl-invite-button:40px; --kl-invite-close:36px; }
  .kl-content-dialog:has(.kl-group-invitation-review,.kl-personal-mail-reader) .kl-dialog-title { font-size:15px; }
}
.kl-personal-mail-reader { display:flex; flex-direction:column; width:100%; min-height:0; min-width:0; }
.kl-personal-mail-scroll { min-height:0; overflow:auto; overscroll-behavior:contain; padding:var(--kl-invite-side); }
.kl-personal-mail-meta { margin:12px 0; color:var(--kl-text-faint,var(--kl-muted)); font-size:10px; overflow-wrap:anywhere; }
.kl-personal-mail-body { min-width:0; padding:14px; margin:12px 0; border:1px solid var(--kl-border); border-radius:8px; background:var(--kl-input-bg); color:var(--kl-text); font-size:12px; line-height:1.8; white-space:pre-wrap; overflow-wrap:anywhere; }
.kl-personal-mail-body .kl-feed-text-spoiler { display:inline; margin:0; min-height:0; max-width:100%; padding:0 4px; border:1px solid var(--kl-border); border-radius:4px; background:var(--kl-surface-2); color:inherit; font:inherit; white-space:pre-wrap; overflow-wrap:anywhere; }
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
