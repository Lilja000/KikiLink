/** Prototype 17.3 moderation, with the real platform review tools on the same layout. */
export const MODERATION_STYLES = `
:is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) > .kl-mod-tabs { gap:20px; padding-top:8px; margin-bottom:20px; }
.kl-mod-page:is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) > .kl-mod-tabs > .kl-text-button {
  height:38px; min-height:38px; padding:0 2px 10px; font-size:12px; font-weight:500; white-space:nowrap;
}
:is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) > .kl-mod-header > .kl-mod-actions { justify-content:flex-end; }
.kl-mod-page:is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) :is(.kl-mod-header,.kl-mod-row-actions) .kl-text-button {
  min-height:36px; padding:0 12px; border-radius:7px; font-size:11px; font-weight:550;
}
.kl-mod-page:is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) .kl-mod-header .kl-mod-icon {
  width:36px; min-width:36px; height:36px; min-height:36px; padding:8px;
}
:is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) .kl-mod-toolbar { margin-block:0 12px; }
:is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) .kl-mod-toolbar > select { height:36px; min-height:36px; padding:0 8px; border-radius:8px; }
.kl-mod-page:is(.kl-cm-moderation,.kl-platform-moderation) .kl-mod-search > input {
  height:34px; min-height:34px; padding:0 8px; border-radius:8px;
}
.kl-mod-page:is(.kl-cm-moderation,.kl-platform-moderation) .kl-mod-search .kl-mod-clear-search { order:0; width:32px; min-width:32px; }
.kl-mod-page .kl-mod-clear-search[hidden] { display:none; }
.kl-cm-moderation .kl-mod-count { line-height:1.5; }
:is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) .kl-mod-main > time { margin-top:4px; }
:is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) .kl-mod-status > .kl-mod-badge[data-priority="high"] { color:var(--kl-gold); border-color:var(--kl-border-strong); }
.kl-community-workspace { font-size:12px; line-height:1.5; }
.kl-community-workspace .kl-mod-header > .kl-mod-actions { gap:6px; }
.kl-community-workspace.kl-mod-page .kl-mod-header .kl-mod-icon[aria-label="Moderation information"] { width:42px; min-width:42px; }
.kl-panel .kl-community-workspace .kl-mod-toolbar > select { font-size:11px; }
.kl-community-workspace .kl-cm-rows.kl-mod-list { gap:10px; }
.kl-community-workspace .kl-mod-row:has(.kl-mod-row-meta) p { margin-bottom:0; }
.kl-community-workspace .kl-mod-row-meta { line-height:1.7; }
.kl-community-workspace .kl-mod-status > .kl-mod-badge { padding:2px 6px; border-radius:4px; line-height:1.4; }
.kl-community-workspace .kl-mod-status > small { color:var(--kl-meta); }
.kl-community-workspace .kl-mod-empty { gap:12px; }
.kl-community-workspace .kl-mod-empty > .kl-icon { width:28px; height:28px; margin:0 0 4px; }
.kl-community-workspace .kl-mod-empty > button { margin-top:4px; background:transparent; }
.kl-community-workspace .kl-mod-empty > button:hover { background:var(--kl-surface-hover); }
.kl-community-workspace .kl-mod-empty > h2 { font-size:16px; line-height:1.4; }
.kl-community-workspace .kl-mod-empty > p { margin:0; }
@container kl-panel (width > 700px) {
  .kl-community-workspace .kl-mod-toolbar select[aria-label="Review status"]:not(:has(option[value="active"]:checked)) { width:91px; }
}
@container kl-panel (width <= 700px) {
  .kl-community-workspace.kl-mod-page .kl-mod-header .kl-mod-icon[aria-label="Moderation actions"] { order:1; }
}
.kl-mod-member-heading { display:flex; align-items:center; flex-wrap:wrap; gap:5px 8px; }
.kl-mod-member-heading > h3 { margin:0; }
.kl-mod-list .kl-mod-row .kl-mod-member-heading { margin-bottom:0; }
.kl-mod-request-row .kl-mod-main > small, .kl-mod-team-row .kl-mod-main > small { display:block; margin-top:4px; line-height:1.7; overflow-wrap:anywhere; }
.kl-mod-team-row .kl-mod-member-heading > h3 { font-size:12px; line-height:1.6; }
.kl-mod-team-summary { margin:0; color:var(--kl-muted); font-size:10px; line-height:1.7; overflow-wrap:anywhere; }
.kl-mod-member-actions { align-items:center; flex-wrap:wrap; gap:8px; }
.kl-mod-team-row .kl-mod-member-actions { align-items:flex-start; gap:12px; }
.kl-mod-team-row .kl-mod-member-actions .kl-mod-badge[data-priority="high"] { color:var(--kl-gold); border-color:var(--kl-border-strong); }
.kl-mod-page .kl-mod-request-row .kl-mod-row-actions > .kl-text-button--primary { background:var(--kl-accent); font-weight:650; }
.kl-mod-page .kl-mod-request-row .kl-mod-row-actions > .kl-text-button--primary:hover { background:color-mix(in srgb,var(--kl-accent),var(--kl-accent-foreground) 10%); }
.kl-mod-role-guide { margin-top:16px; }
.kl-mod-role-guide .kl-mod-role-matrix { margin:12px 0 0; table-layout:fixed; font-size:10px; }
.kl-mod-role-guide .kl-mod-role-matrix :is(th,td) { padding:9px 8px; }
.kl-mod-role-guide .kl-mod-role-matrix th { width:auto; font-weight:550; }
.kl-mod-role-guide .kl-mod-role-matrix td { color:var(--kl-muted); line-height:1.7; }
.kl-mod-role-guide .kl-mod-role-matrix tbody tr:last-child td { border-bottom:0; }
.kl-mod-page .kl-mod-role-guide > p.kl-mod-note { margin-top:12px; font-size:10px; }
.kl-safety-no-access .kl-mod-header .kl-text-button, .kl-mod-no-access > .kl-text-button { min-height:36px; padding:0 12px; border-radius:7px; font-size:11px; font-weight:550; }
.kl-safety-no-access .kl-mod-header .kl-mod-icon { min-width:36px; padding:8px; }
.kl-mod-no-access { gap:12px; background:rgb(17 17 19 / .03); }
.kl-mod-no-access > .kl-text-button { margin-top:4px; }
.kl-mod-page .kl-mod-row .kl-mod-note { margin:0; font-size:10px; }
.kl-mod-page :is(.kl-mod-evidence,.kl-mod-history) > .kl-mod-row + .kl-mod-row { border-top:1px solid var(--kl-border); margin-top:10px; padding-top:10px; }
.kl-mod-page .kl-cm-report-detail.kl-mod-detail { padding:16px; border-radius:10px; background:var(--kl-surface); }
.kl-mod-page .kl-mod-detail > :is(.kl-mod-meta,.kl-mod-copy) { margin-bottom:0; }
.kl-mod-page .kl-mod-detail > .kl-mod-meta { margin-block:14px; }
.kl-mod-page .kl-mod-detail > .kl-mod-details-title { margin:12px 0 8px; font-size:12px; }
.kl-cm-moderation > .kl-mod-back { min-height:28px; margin-bottom:12px; }
.kl-cm-moderation.kl-mod-page > .kl-mod-back { min-height:0; margin-bottom:12px; padding:0; border:0; font-size:11px; line-height:1.5; }
.kl-cm-moderation > .kl-mod-back .kl-icon { width:12px; height:12px; }
.kl-cm-moderation .kl-cm-report-detail { margin-block:14px; }
.kl-cm-moderation .kl-cm-report-detail .kl-mod-meta dt { line-height:1.7; }
.kl-cm-moderation .kl-cm-report-detail .kl-mod-meta dd { font-size:11px; line-height:1.7; }
.kl-cm-moderation .kl-mod-detail > .kl-mod-details-title { margin-top:16px; }
.kl-cm-moderation .kl-mod-evidence > blockquote { margin:8px 0 0; padding:0; border:0; color:var(--kl-muted); font-size:11px; line-height:1.7; }
.kl-cm-moderation .kl-mod-evidence > p.kl-mod-note { margin:8px 0 0; font-size:10px; }
.kl-cm-moderation .kl-mod-case-actions { display:grid; gap:12px; }
.kl-cm-moderation .kl-mod-case-actions .kl-mod-actions { align-items:center; }
.kl-cm-moderation .kl-mod-case-actions .kl-mod-actions:last-child > label { display:flex; align-items:center; gap:8px; flex:none; }
.kl-cm-moderation .kl-mod-case-actions .kl-mod-actions:last-child > label > select { min-width:80px; }
.kl-restoration { font-size:12px; line-height:1.5; }
.kl-restoration .kl-restoration-message { margin-top:12px; }
.kl-restoration > .kl-mod-list + .kl-mod-actions { margin-top:12px; }

.kl-moderation-dialog[open] { position:fixed; inset:0; margin:auto; }
.kl-moderation-dialog.kl-mod-page > .kl-dialog-header,
.kl-moderation-dialog.kl-mod-page > .kl-mod-dialog-footer { min-height:61px; padding-block:10px; }
.kl-moderation-dialog.kl-mod-page .kl-mod-dialog-footer > .kl-text-button { min-height:36px; }
:is(.kl-mod-decision-target,.kl-mod-member-target) > small { flex-basis:100%; margin-top:3px; color:var(--kl-muted); font-size:10px; line-height:1.7; }
.kl-mod-decision-dialog,.kl-mod-decision-dialog > .kl-mod-dialog-body { font-size:12px; line-height:1.5; }
.kl-mod-decision-dialog .kl-mod-decision-target { gap:6px 10px; }
.kl-mod-decision-dialog .kl-mod-decision-target > small { margin-top:5px; }
.kl-mod-decision-dialog .kl-mod-dialog-body :is(select,textarea) { padding:8px 10px; border-radius:8px; font-size:12px; line-height:1.6; }
.kl-mod-decision-meta { display:flex; align-items:flex-start; gap:4px 10px; }
.kl-mod-decision-meta > .kl-mod-note { flex:1; margin:0; min-width:0; color:var(--kl-muted); font-size:10px; line-height:1.7; }
.kl-mod-decision-meta .kl-report-counter { flex:none; }
.kl-mod-decision-validation { margin-top:12px; color:var(--kl-danger); font-size:11px; line-height:1.7; }
.kl-mod-decision-validation[data-valid=true] { color:var(--kl-success,#79c49a); }
.kl-mod-decision-validation ul { margin:0; padding-left:16px; }
.kl-mod-decision-summary { min-width:0; margin:12px 0; padding:12px; border:1px solid var(--kl-border); border-radius:8px; background:var(--kl-input-bg); }
.kl-mod-decision-dialog .kl-mod-decision-summary > :is(h3,p) { margin:0; }
.kl-mod-decision-dialog .kl-mod-decision-summary > p { font-size:11px; line-height:1.7; }
.kl-mod-decision-summary .kl-mod-decision-target > strong { margin-bottom:6px; }
.kl-mod-decision-dialog.kl-mod-page .kl-mod-dialog-body > label:has(select) { margin-bottom:37px; }
.kl-cm-moderation .kl-mod-case-actions .kl-mod-actions .kl-text-button { padding:0 12px; font-size:11px; font-weight:550; line-height:1.5; }
.kl-cm-moderation .kl-mod-case-actions [data-decision-trigger] { font-weight:650; }
.kl-cm-moderation .kl-mod-evidence:not(.kl-mod-history) { border-radius:10px; }
@container kl-panel (width > 700px) and (height > 500px) {
  .kl-mod-decision-dialog.kl-mod-page > .kl-dialog-header { min-height:64px; padding-block:12px; }
}
.kl-mod-decision-dialog .kl-mod-dialog-footer [hidden] { display:none; }
.kl-mod-decision-dialog .kl-mod-decision-discard { flex:1 1 100%; margin:0; padding:6px 10px; font-size:11px; }
.kl-mod-decision-dialog .kl-mod-dialog-footer > .kl-mod-decision-discard + button { margin-inline-end:auto; }
.kl-mod-decision-dialog .kl-mod-dialog-footer > .kl-text-button { padding:0 12px; border-radius:8px; font-size:12px; font-weight:550; }
.kl-mod-decision-dialog .kl-mod-dialog-footer > .kl-text-button--primary { font-weight:650; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-mod-decision-dialog .kl-mod-dialog-body label select { height:40px; }
  .kl-cm-moderation .kl-mod-case-actions .kl-text-button { min-height:40px; }
}
@container kl-panel (width <= 700px) {
  .kl-mod-decision-dialog .kl-mod-dialog-body :is(select,textarea) { font-size:16px; }
  .kl-mod-decision-dialog .kl-mod-dialog-footer > .kl-text-button { font-size:11px; }
}
.kl-mod-member-confirm { min-width:0; margin:12px 0; padding:12px; border:1px solid var(--kl-border); border-radius:8px; background:var(--kl-input-bg); }
.kl-mod-member-confirm > strong { display:block; margin-bottom:6px; font-size:12px; overflow-wrap:anywhere; }
.kl-mod-member-confirm > p { margin:0; color:var(--kl-muted); font-size:11px; line-height:1.7; overflow-wrap:anywhere; }

@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-mod-page:is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) :is(.kl-mod-header,.kl-mod-row-actions) .kl-text-button,
  :is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) .kl-mod-toolbar > select { min-height:40px; }
  :is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) .kl-mod-toolbar > select { height:40px; }
  .kl-mod-page:is(.kl-cm-moderation,.kl-platform-moderation) .kl-mod-search > input { height:38px; min-height:38px; }
  .kl-mod-page:is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) > .kl-mod-tabs > .kl-text-button { height:40px; min-height:40px; }
  .kl-moderation-dialog.kl-mod-page .kl-mod-dialog-footer > .kl-text-button { min-height:40px; }
  .kl-safety-no-access .kl-mod-header .kl-text-button, .kl-mod-no-access > .kl-text-button { min-height:40px; }
}
@container kl-panel (width <= 700px) {
  :is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) > .kl-mod-tabs { gap:18px; margin-bottom:16px; }
  :is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) > .kl-mod-header > .kl-mod-actions { justify-content:flex-start; }
  :is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) .kl-mod-toolbar > .kl-mod-search { flex-basis:100%; }
  :is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) .kl-mod-toolbar > select { flex:1 1 145px; }
  :is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) .kl-mod-row > .kl-mod-row-actions { flex-basis:100%; justify-content:flex-start; }
  :is(.kl-cm-moderation,.kl-platform-moderation,.kl-restoration) .kl-mod-list .kl-mod-row > .kl-mod-main { flex-basis:100%; }
  .kl-mod-role-guide .kl-mod-role-matrix :is(th,td) { padding:8px 5px; }
}
`;
