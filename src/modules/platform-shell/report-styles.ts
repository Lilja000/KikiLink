/** Reporter receipts and compact report sheets. */
export const REPORT_STYLES = `
.kl-my-reports > .kl-mod-header { margin-bottom: 16px; }
.kl-my-reports > .kl-mod-header .kl-mod-note { margin-top: 6px; font-size: 12px; }
.kl-my-reports > .kl-mod-header .kl-mod-actions { gap: 6px; }
.kl-my-reports .kl-mod-toolbar > select { height: 36px; border-radius: 8px; }
.kl-my-reports .kl-mod-search { height: 36px; }
.kl-my-reports .kl-mod-toolbar .kl-mod-search input { height: 100%; min-height: 0; padding: 0 6px 0 0; border-radius: 0; }
.kl-my-reports .kl-mod-search .kl-report-clear { order: 0; width: 26px; min-height: 26px; padding: 5px; }
.kl-my-reports .kl-mod-search .kl-report-clear[hidden] { display: none; }
.kl-my-reports .kl-mod-search input::-webkit-search-cancel-button { display: none; }
.kl-my-reports .kl-mod-empty { gap: 12px; }
.kl-my-reports .kl-mod-empty > button { margin-top: 4px; }
.kl-my-reports .kl-mod-badge { padding: 2px 6px; border-radius: 4px; }
.kl-my-reports .kl-mod-count { line-height: 1.5; }
.kl-my-reports > .kl-mod-back { min-height: 0; margin-bottom: 12px; padding: 0; border: 0; line-height: 1.5; }
.kl-my-reports > .kl-mod-back .kl-icon { width: 12px; height: 12px; }
.kl-my-reports .kl-mod-receipt { margin: 14px 0; }
.kl-my-reports .kl-mod-receipt .kl-mod-status { margin-bottom: 8px; }
.kl-my-reports .kl-mod-receipt .kl-mod-meta dt { line-height: 1.7; }
.kl-my-reports .kl-mod-receipt > h2 { margin: 16px 0 8px; }
.kl-my-reports .kl-mod-receipt .kl-mod-copy { margin: 0; font-size: 12px; line-height: 1.75; }

.kl-mod-report-dialog.kl-moderation-dialog { position: fixed; width: min(540px, calc(100vw - 24px)); margin: auto; }
.kl-mod-report-dialog .kl-mod-dialog-body :is(label,fieldset) :is(select,textarea) { border-radius: 8px; }
.kl-mod-report-dialog .kl-mod-report-target > small { flex-basis: 100%; color: var(--kl-muted); font-size: 10px; line-height: 1.7; }
.kl-mod-report-dialog .kl-report-form--compact .kl-cloud-status:empty { display: none; }
.kl-mod-report-dialog .kl-mod-target-search { gap: 8px; }
.kl-mod-report-dialog .kl-mod-target-search input { flex: 1 1 130px; }
.kl-mod-report-dialog .kl-mod-notice p { margin: 0 0 8px; }

/* Channel reporting follows the compact prototype form without changing other report sheets. */
.kl-cm-message-report-dialog,.kl-cm-message-report-dialog .kl-mod-dialog-body { font-size:12px; line-height:1.5; }
.kl-cm-message-report-dialog .kl-mod-eyebrow { color:var(--kl-meta); }
.kl-cm-message-report-dialog.kl-moderation-dialog > .kl-dialog-header { padding:12px 16px; }
.kl-cm-message-report-dialog.kl-moderation-dialog > .kl-dialog-header h2 { font-size:16px; line-height:1.4; }
.kl-cm-message-report-dialog.kl-moderation-dialog > .kl-dialog-header .kl-mod-icon { width:32px; min-width:32px; height:32px; min-height:32px; padding:7px; border-radius:8px; }
.kl-cm-message-report-dialog.kl-moderation-dialog > .kl-mod-dialog-body { padding:16px; scrollbar-width:thin; scrollbar-color:#514438 transparent; }
.kl-cm-message-report-dialog .kl-mod-report-target > .kl-mod-badge { flex:none; padding:2px 6px; border-radius:6px; line-height:1.4; white-space:nowrap; }
.kl-cm-message-report-dialog .kl-mod-report-target > strong { flex:1; display:block; }
.kl-cm-message-report-dialog .kl-mod-report-target > small { display:block; margin-top:5px; }
.kl-cm-message-report-dialog .kl-report-form--compact fieldset { margin-bottom:16px; gap:0; }
.kl-cm-message-report-dialog .kl-report-form--compact fieldset::after { content:''; display:block; height:15px; margin-top:6px; }
.kl-cm-message-report-dialog .kl-mod-dialog-body :is(select,textarea) { padding:8px 10px; font-size:12px; }
.kl-cm-message-report-dialog .kl-mod-dialog-body textarea { line-height:1.6; }
.kl-cm-message-report-dialog .kl-report-form--compact > label { margin-bottom:6px; }
.kl-cm-message-report-dialog .kl-report-details-meta { display:flex; align-items:flex-start; justify-content:space-between; gap:4px 10px; min-height:15px; }
.kl-cm-message-report-dialog .kl-report-details-hint { flex:1; min-width:0; color:var(--kl-meta); font-size:10px; line-height:1.7; overflow-wrap:anywhere; }
.kl-cm-message-report-dialog .kl-report-counter { flex:none; font-size:10px; line-height:1.5; color:var(--kl-meta); }
.kl-cm-message-report-dialog .kl-report-form--compact > .kl-mod-note { margin:0; color:var(--kl-meta); font-size:10px; line-height:1.5; }
.kl-cm-message-report-dialog .kl-report-form--compact .kl-cloud-status { margin:12px 0 0; color:var(--kl-danger); font-size:11px; line-height:1.7; }
.kl-cm-message-report-dialog .kl-cloud-status[data-valid=true] { color:var(--kl-success,#79c49a); }
.kl-cm-message-report-dialog .kl-cloud-status ul { margin:0; padding-left:16px; }
.kl-cm-message-report-dialog.kl-moderation-dialog > .kl-mod-dialog-footer { padding:12px 16px; }
.kl-cm-message-report-dialog .kl-mod-dialog-footer .kl-text-button { height:36px; min-height:36px; padding:0 12px; border-radius:8px; font-size:12px; font-weight:550; line-height:1.5; }
.kl-cm-message-report-dialog .kl-text-button--primary { color:#fff; border-color:color-mix(in srgb,var(--kl-accent) 58%,var(--kl-muted)); font-weight:650; box-shadow:none; }
.kl-cm-message-report-dialog .kl-text-button--primary:hover:not(:disabled) { background:color-mix(in srgb,var(--kl-accent),white 12%); }
.kl-cm-message-report-dialog.kl-moderation-dialog { grid-template-rows:auto minmax(0,1fr) auto auto; }
.kl-cm-message-report-dialog .kl-report-discard-area { min-height:0; max-height:min(45dvh,max(0px,calc(var(--kl-dialog-viewport-height,100dvh) - 150px))); overflow:auto; border-top:1px solid #d6a24b50; scrollbar-width:thin; }
.kl-cm-message-report-dialog .kl-report-discard-area:has(.kl-mod-notice[hidden]) { display:none; }
.kl-cm-message-report-dialog .kl-report-discard-area .kl-mod-notice { margin:10px; padding:12px; border:1px solid #d6a24b50; border-radius:8px; background:#302313; color:#edc990; font-size:11px; line-height:1.5; }
.kl-cm-message-report-dialog .kl-report-discard-area .kl-mod-notice p { margin:0; color:inherit; font-size:11px; line-height:1.5; }
.kl-cm-message-report-dialog .kl-report-discard-actions { display:flex; align-items:center; gap:8px; margin-top:10px; }
.kl-cm-message-report-dialog .kl-report-discard-actions .kl-text-button { height:36px; min-height:36px; margin:0; padding:0 12px; border-radius:8px; font-size:12px; font-weight:550; line-height:1.5; }
.kl-cm-message-report-dialog :is(.kl-mod-dialog-footer,.kl-report-discard-actions) .kl-text-button--primary { font-weight:650; }
.kl-cm-message-report-dialog .kl-report-discard-actions .kl-report-discard { color:var(--kl-danger); background:color-mix(in srgb,var(--kl-danger) 7%,transparent); border-color:color-mix(in srgb,var(--kl-danger) 36%,transparent); }

@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
 .kl-cm-message-report-dialog.kl-moderation-dialog > .kl-dialog-header { padding:10px 12px; }
 .kl-cm-message-report-dialog.kl-moderation-dialog > .kl-dialog-header h2 { font-size:15px; }
 .kl-cm-message-report-dialog.kl-moderation-dialog > .kl-dialog-header .kl-mod-icon { width:36px; min-width:36px; height:36px; min-height:36px; }
 .kl-cm-message-report-dialog.kl-moderation-dialog > .kl-mod-dialog-body { padding:12px; }
 .kl-cm-message-report-dialog .kl-mod-dialog-body :is(select,textarea) { font-size:16px; }
 .kl-cm-message-report-dialog.kl-moderation-dialog > .kl-mod-dialog-footer { padding:10px 12px; }
 .kl-cm-message-report-dialog .kl-mod-dialog-footer .kl-text-button { min-height:40px; height:40px; }
 .kl-cm-message-report-dialog .kl-report-discard-actions .kl-text-button { min-height:40px; height:40px; }
}
@container kl-panel (width <= 700px) {
 .kl-cm-message-report-dialog .kl-mod-dialog-footer .kl-cloud-actions { gap:6px; }
 .kl-cm-message-report-dialog .kl-mod-dialog-footer .kl-text-button { padding-inline:10px; font-size:11px; }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
 .kl-cm-message-report-dialog.kl-moderation-dialog > .kl-dialog-header,
 .kl-cm-message-report-dialog.kl-moderation-dialog > .kl-mod-dialog-footer { padding-block:10px; }
}

@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
 .kl-my-reports .kl-mod-toolbar > select, .kl-my-reports .kl-mod-search { height: 40px; }
 .kl-my-reports > .kl-mod-header .kl-text-button, .kl-my-reports .kl-mod-row-actions > .kl-text-button { min-height: 40px; }
}
@container kl-panel (width <= 700px) {
 .kl-my-reports > .kl-mod-header { align-items: flex-start; flex-wrap: wrap; gap: 10px; }
 .kl-my-reports > .kl-mod-header > :first-child { flex: 1 1 190px; }
 .kl-my-reports > .kl-mod-header h1 { font-size: 23px; }
 .kl-my-reports > .kl-mod-header .kl-mod-note { font-size: 11px; }
 .kl-my-reports .kl-mod-toolbar > .kl-mod-search { flex-basis: 100%; }
 .kl-my-reports .kl-mod-toolbar > select { flex: 1 1 145px; }
 .kl-my-reports .kl-mod-row-actions { flex-basis: 100%; justify-content: flex-start; }
}
`;
