/** Compact activity library and retained native editor, isolated to the platform client. */
export const ACTIVITIES_STYLES = `
.kl-panel[data-platform-preview="true"] .kl-activities-page { display: block; padding: 20px; overflow: auto; scrollbar-width: thin; background: transparent; }
.kl-activity-library { width: 100%; max-width: 920px; margin-inline: auto; }
.kl-panel[data-platform-preview="true"] .kl-activities-page .kl-feature-page-header { min-height: 36px; padding: 0; gap: 8px; border-bottom: 0; background: transparent; }
.kl-activities-page .kl-feature-page-eyebrow, .kl-activities-page .kl-feature-page-subtitle:empty { display: none; }
.kl-panel[data-platform-preview="true"] .kl-activities-page .kl-feature-page-title { margin: 0; font: 700 20px/1.3 var(--kl-font,system-ui); letter-spacing: -.3px; }
.kl-activity-header-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.kl-activity-library-toolbar, .kl-activity-library-meta, .kl-activity-library-actions { display: flex; align-items: center; gap: 8px; min-width: 0; }
.kl-activity-library-toolbar { flex-wrap: wrap; margin: 16px 0 12px; }
.kl-activity-search-field { display: flex; align-items: center; flex: 1 1 220px; gap: 8px; min-width: 0; min-height: 36px; padding-inline: 10px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg); color: var(--kl-muted); }
.kl-activity-search-field:focus-within { border-color: var(--kl-accent); }
.kl-activity-search-field > .kl-icon { width: 16px; height: 16px; flex: none; }
.kl-activity-search-field .kl-activity-search { width: 100%; min-width: 0; height: 34px; min-height: 34px; padding: 0; border: 0; border-radius: 8px; background: transparent; box-shadow: none; }
.kl-activity-library-actions { flex-wrap: wrap; }
.kl-activity-library :is(.kl-text-button, .kl-icon-button) { min-height: 36px; gap: 6px; }
.kl-activity-library .kl-text-button { display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; }
.kl-activities-page :is(.kl-activity-header-actions,.kl-activity-library-actions,.kl-custom-activity-card-actions) > .kl-text-button { gap: 8px; font: 550 12px/1.5 var(--kl-font,system-ui); }
.kl-activities-page .kl-activity-header-actions .kl-text-button--primary { font-weight: 650; }
.kl-activity-library .kl-text-button > .kl-icon { width: 16px; height: 16px; flex: none; }
.kl-activity-import > .kl-icon, .kl-activity-options-menu[aria-label="Activity library"] .kl-shell-menu-item:first-child > .kl-icon { transform: rotate(-90deg); }
.kl-activities-page .kl-activity-library :is(.kl-activity-library-options,.kl-activity-more) { width: 32px; min-width: 32px; height: 32px; min-height: 32px; padding: 0; border: 0; background: transparent; }
.kl-activity-library-meta { justify-content: space-between; margin-bottom: 12px; }
.kl-activity-library-scopes { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
.kl-activity-library .kl-activity-library-scopes > button { min-height: 32px; padding: 0 9px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--kl-muted); font: 400 11px/1.5 var(--kl-font,system-ui); }
.kl-activity-library .kl-activity-library-scopes > button[aria-pressed="true"] { border-color: color-mix(in srgb,var(--kl-accent),transparent 45%); background: color-mix(in srgb,var(--kl-accent) 12%,var(--kl-input-bg)); color: var(--kl-text); }
.kl-activity-count { flex: none; color: var(--kl-muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.kl-activity-status { margin: 0 0 12px; color: var(--kl-muted); padding: 10px; border: 1px solid var(--kl-border); border-radius: 8px; overflow-wrap: anywhere; }
.kl-panel[data-platform-preview="true"] .kl-activities-page .kl-custom-activity-list { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; align-content: start; }
.kl-activities-page .kl-custom-activity-card { display: flex; flex-direction: column; align-items: stretch; min-height: 0; gap: 12px; padding: 12px; border-radius: 10px; background: var(--kl-surface); box-shadow: none; }
.kl-activities-page .kl-custom-activity-card:hover { transform: none; background: var(--kl-surface); }
.kl-activity-card-heading { display: grid; grid-template-columns: 36px minmax(0,1fr) auto; align-items: center; gap: 10px; min-width: 0; }
.kl-activities-page .kl-custom-activity-card-icon { width: 36px; height: 36px; grid-row: auto; border-radius: 8px; }
.kl-activities-page .kl-custom-activity-card-name { display: block; max-width: 100%; padding: 2px 0; border: 0; color: var(--kl-text); background: transparent; text-align: left; font: 600 13px/1.5 var(--kl-font,system-ui); cursor: pointer; }
.kl-activities-page .kl-custom-activity-card-name:hover { color: var(--kl-accent); }
.kl-activities-page .kl-custom-activity-card-meta { display: flex; flex-wrap: wrap; gap: 4px 8px; margin-top: 4px; font-size: 11px; line-height: 1.5; color: var(--kl-muted); overflow-wrap: anywhere; }
.kl-activities-page .kl-custom-activity-card-template { min-width: 0; margin: 0; white-space: normal; line-height: 1.6; font-size: 12px; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
.kl-activity-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; }
.kl-activity-target-label { display: inline-flex; align-items: center; gap: 6px; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--kl-muted); font-size: 11px; }
.kl-activity-target-label .kl-icon { width: 13px; height: 13px; flex: none; }
.kl-activities-page .kl-custom-activity-card-actions { grid-column: auto; flex: none; gap: 4px; }
.kl-activities-page .kl-custom-activity-card-actions .kl-text-button { min-height: 36px; padding-inline: 8px; border-color: var(--kl-border); background: transparent; color: var(--kl-text); font-size: 12px; }
.kl-activities-page .kl-custom-activity-card-actions .kl-text-button:hover { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-activity-options-menu[aria-label="Activity actions"] .kl-shell-menu-item:last-child { color: var(--kl-danger); }
.kl-activities-page .kl-custom-activity-empty { grid-column: 1 / -1; min-height: 0; padding: 24px 16px; border: 0; border-radius: 0; background: transparent; }
.kl-activities-page .kl-custom-activity-empty > .kl-icon { width: 32px; height: 32px; color: var(--kl-muted); }
.kl-activities-page .kl-custom-activity-empty h2 { margin: 0; font: 600 16px var(--kl-font,system-ui); }
.kl-activity-empty-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.kl-activity-preview { line-height: 1.6; overflow-wrap: anywhere; }
.kl-activity-preview-meta, .kl-activity-preview small { color: var(--kl-muted); }
.kl-dialog.kl-activity-details-dialog { position: fixed; margin: auto; border-radius: 12px; background: var(--kl-surface); }
.kl-activity-details-dialog .kl-dialog-header { min-height: 64px; padding: 12px 16px; background: var(--kl-surface); }
.kl-activity-details-dialog .kl-dialog-title { font: 700 16px var(--kl-font,system-ui); }
.kl-activity-import-review, .kl-activity-delete-review { display: grid; gap: 12px; }
:is(.kl-activity-import-review,.kl-activity-delete-review) p { margin: 0; line-height: 1.5; overflow-wrap: anywhere; }
.kl-activity-confirm-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }

.kl-activity-dialog { position: fixed; width: min(760px,calc(100vw - 32px)); height: auto; max-width: calc(100vw - 16px); max-height: calc(100dvh - 16px); margin: auto; padding: 0; border-radius: 12px; background: var(--kl-surface); }
.kl-activity-dialog[open] { display: grid; grid-template-rows: auto auto minmax(0,1fr) auto; }
.kl-activity-dialog .kl-dialog-header { min-height: 64px; padding: 12px 16px; background: var(--kl-surface); }
.kl-activity-dialog .kl-dialog-header > .kl-icon-button { margin-left: auto; }
.kl-activity-dialog .kl-dialog-title { margin: 0; font: 700 16px var(--kl-font,system-ui); }
.kl-activity-tabs { display: flex; gap: 4px; padding: 0 12px; border-bottom: 1px solid var(--kl-border); }
.kl-activity-tab { min-height: 38px; padding: 8px 12px; border: 0; border-bottom: 2px solid transparent; color: var(--kl-muted); background: transparent; cursor: pointer; font: 600 12px var(--kl-font,system-ui); }
.kl-activity-tab[aria-selected="true"] { color: var(--kl-text); border-bottom-color: var(--kl-accent); }
.kl-activity-dialog-body { container: kl-activity-editor / inline-size; min-height: 0; min-width: 0; padding: 16px; overflow: auto; scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent; }
.kl-activity-tab-panel { min-width: 0; }
.kl-activity-tab-panel[hidden] { display: none !important; }
.kl-activity-dialog .kl-activity-details { display: grid; gap: 16px; padding: 0; border: 0; background: transparent; overflow: visible; }
.kl-activity-editor-content { display: grid; grid-template-columns: minmax(0,1.2fr) minmax(0,1fr); gap: 20px; }
.kl-activity-editor-writing, .kl-activity-editor-settings { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.kl-activity-field-counter { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.kl-activity-field-counter output { color: var(--kl-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.kl-activity-action-input { overflow: hidden; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg); }
.kl-activity-action-input:focus-within { border-color: var(--kl-accent); }
.kl-activity-dialog .kl-activity-action-input > .kl-custom-activity-template { display: block; min-height: 120px; max-height: 240px; border: 0; border-radius: 0; background: transparent; box-shadow: none; font: 400 13px/1.6 var(--kl-font,system-ui); }
.kl-activity-dialog .kl-custom-token-row { gap: 4px; padding: 4px 8px 8px; }
.kl-activity-dialog .kl-custom-token { min-height: 30px; border-radius: 8px; font-size: 11px; }
.kl-activity-dialog .kl-custom-activity-live-preview { border-radius: 8px; font: 400 12px/1.6 var(--kl-font,system-ui); }
.kl-activity-preview-box { display: flex; align-items: flex-start; gap: 12px; padding: 12px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-surface-2); }
.kl-activity-preview-icon { flex: none; width: 24px; height: 24px; object-fit: contain; }
.kl-activity-preview-box .kl-custom-activity-live-preview { min-height: 0; padding: 0; border: 0; background: transparent; }
.kl-activity-dialog .kl-custom-field-label { font-size: 12px; font-weight: 600; }
.kl-activity-dialog .kl-custom-field-help { font-size: 11px; }
.kl-activity-target-choices { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 4px; }
.kl-activity-visuals .kl-custom-slot-grid { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 4px; max-height: 225px; padding: 0; }
.kl-activity-target-choices > button, .kl-activity-visuals .kl-custom-slot-choice { min-width: 0; min-height: 34px; padding: 6px 8px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg); color: var(--kl-muted); font: 400 11px/1.4 var(--kl-font,system-ui); text-overflow: ellipsis; box-shadow: none; }
.kl-activity-target-choices > button { white-space: normal; }
.kl-activity-dialog :is(.kl-activity-target-choices,.kl-custom-slot-grid) > button:hover { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-activity-dialog :is(.kl-activity-target-choices,.kl-custom-slot-grid) > button:is([aria-pressed="true"],[aria-checked="true"]) { border-color: var(--kl-accent); background: color-mix(in srgb,var(--kl-accent) 12%,var(--kl-input-bg)); color: var(--kl-text); }
.kl-activity-dialog .kl-custom-arousal-row { padding: 12px 0 0; border: 0; border-top: 1px solid var(--kl-border); border-radius: 0; background: transparent; }
.kl-activity-visuals { display: grid; grid-template-columns: minmax(220px,300px) minmax(0,1fr); gap: 18px; align-items: start; }
.kl-activity-dialog .kl-custom-character-pane { min-width: 0; grid-template-rows: none; padding: 0; border: 0; border-radius: 0; overflow: visible; background: transparent; }
.kl-activity-dialog .kl-custom-character-stage { max-height: 420px; }
.kl-activity-dialog .kl-custom-image-gallery { display: grid; max-height: 460px; grid-template-columns: repeat(auto-fill,minmax(70px,1fr)); overflow: hidden auto; scroll-snap-type: none; }
.kl-activity-dialog .kl-activity-triggers { border: 0; padding: 0; margin: 0; }
.kl-activity-dialog .kl-sequence-step { border-radius: 9px; }
.kl-activity-dialog .kl-custom-activity-footer { min-height: 61px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 10px 16px; background: var(--kl-surface); }
.kl-activity-error { flex: 1 0 100%; color: var(--kl-error,#f7a4a4); font-size: 12px; line-height: 1.4; overflow-wrap: anywhere; }
.kl-activity-dialog [aria-invalid="true"] { border-color: var(--kl-error,#f7a4a4); }
.kl-activity-dialog .kl-activity-action-input:has([aria-invalid="true"]) { border-color: var(--kl-error,#f7a4a4); }

@container kl-panel (max-width: 1100px) {
 .kl-panel[data-platform-preview="true"] .kl-activities-page { padding: 16px; }
}
@container kl-panel (max-width: 700px) {
 .kl-panel[data-platform-preview="true"] .kl-activities-page { padding: 12px; }
}
@container kl-workspace (max-width: 680px) {
 .kl-panel[data-platform-preview="true"] .kl-activities-page .kl-custom-activity-list { grid-template-columns: minmax(0,1fr); gap: 8px; }
}
@container kl-workspace (max-width: 560px) {
 .kl-panel[data-platform-preview="true"] .kl-activities-page .kl-feature-page-header { flex-wrap: wrap; align-items: center; }
 .kl-activities-page :is(.kl-activity-header-actions,.kl-activity-library-actions,.kl-custom-activity-card-actions) > .kl-text-button,
 .kl-activities-page .kl-activity-library .kl-activity-more { min-height: 40px; }
 .kl-activity-library-scopes { gap: 3px; padding: 2px 1px; }
 .kl-activity-library .kl-activity-library-scopes > button { min-height: 36px; padding-inline: 6px; }
 .kl-activity-library-toolbar { margin-top: 12px; }
 .kl-activity-search-field { flex-basis: 100%; }
 .kl-activity-search-field .kl-activity-search { height: 38px; min-height: 38px; }
 .kl-activity-library-actions { width: 100%; }
 .kl-activity-library-options { margin-left: auto; }
 .kl-activities-page .kl-custom-activity-card-icon { width: 32px; height: 32px; }
 .kl-activity-card-heading { grid-template-columns: 32px minmax(0,1fr) auto; gap: 8px; }
 .kl-activities-page .kl-activity-library .kl-activity-more { min-width: 36px; }
 .kl-activity-library .kl-custom-activity-card-actions .kl-icon { width: 14px; height: 14px; }
 .kl-activity-target-label { max-width: 125px; }
}
@container kl-activity-editor (max-width: 580px) {
 .kl-activity-editor-content, .kl-activity-visuals { grid-template-columns: minmax(0,1fr); gap: 16px; }
 .kl-activity-editor-settings { padding-top: 16px; border-top: 1px solid var(--kl-border); }
 .kl-activity-dialog .kl-custom-character-stage { max-height: 300px; }
 .kl-activity-dialog .kl-custom-image-gallery { max-height: 320px; }
 .kl-activity-visuals .kl-custom-slot-grid { grid-template-columns: repeat(3,minmax(0,1fr)); }
 .kl-activity-target-choices > button, .kl-activity-visuals .kl-custom-slot-choice { min-height: 40px; }
}
@media (max-width: 560px) {
 .kl-activity-dialog-body { padding: 12px; }
 .kl-activity-dialog { width: calc(100vw - 16px); height: calc(100dvh - 16px); }
 .kl-activity-dialog .kl-custom-token { min-height: 34px; }
 .kl-activity-dialog .kl-custom-activity-footer { padding: 8px 10px; }
 .kl-activity-dialog .kl-custom-activity-footer > button { padding: 7px 8px; font-size: 11px; min-height: 36px; }
}
@media (max-height: 500px) {
 .kl-activity-dialog .kl-dialog-header { min-height: 48px; padding-block: 6px; }
 .kl-activity-tab { min-height: 34px; padding-block: 5px; }
 .kl-activity-dialog .kl-custom-activity-footer { min-height: 48px; padding-block: 6px; }
}
`;
