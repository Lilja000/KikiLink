/** Prototype17 settings column, scoped to the isolated platform build. */
export const SETTINGS_STYLES = `
.kl-panel[data-platform-preview="true"] .kl-settings-page { grid-template-rows: minmax(0, 1fr); }
.kl-panel[data-platform-preview="true"] .kl-settings-tabs { flex: 0 0 auto; flex-direction: column; gap: 4px; padding: 0; overflow: visible; border: 0; background: transparent; }
.kl-settings-tabs[hidden] { display: none; }
.kl-panel[data-platform-preview="true"] .kl-settings-tab { flex: 0 0 auto; width: 100%; min-height: 36px; padding: 0 10px; font-size: 12px; line-height: 1.5; gap: 10px; border-radius: 7px; }
.kl-panel[data-platform-preview="true"] .kl-settings-tab[data-active="true"] { border-color: var(--kl-nav-selection-border); background: var(--kl-nav-selection-bg); box-shadow: inset 2px 0 var(--kl-accent); }
.kl-settings-tab-icon { color: var(--kl-muted); width: 16px; height: 16px; padding: 0; flex: none; }
.kl-settings-tab[data-active="true"] .kl-settings-tab-icon { color: var(--kl-text); }
.kl-settings-tab[hidden], .kl-settings-panel[hidden], .kl-inline-setting-error[hidden] { display: none; }
.kl-settings-tab:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: -2px; }
.kl-settings-nav-divider { margin: 16px 8px 8px; padding-top: 12px; border-top: 1px solid var(--kl-border); color: var(--kl-muted); font-size: 10px; line-height: 1.5; letter-spacing: .03em; }
.kl-panel[data-platform-preview="true"] .kl-settings-panel { padding: 20px 20px 24px; overflow-x: hidden; }
.kl-settings-panel-title { display: flex; align-items: center; min-height: 44px; margin: 0 0 16px; font: 700 var(--kl-type-xl)/1.3 var(--kl-font, system-ui); letter-spacing: -.3px; }
.kl-settings-panel-title[hidden] { display: none; }
.kl-settings-panel-description { display: none; }
.kl-settings-panel .kl-settings-panel-body { display: grid; gap: 24px; max-width: 760px; min-width: 0; }
.kl-settings-safety .kl-settings-panel-body { max-width: none; }
.kl-settings-group { min-width: 0; }
.kl-settings-group > h3 { margin: 0 0 8px; font-size: var(--kl-type-body); font-weight: 650; color: var(--kl-muted); }
.kl-settings-group-body { min-width: 0; padding: 0 16px; border: 1px solid var(--kl-border); border-radius: 10px; background: var(--kl-surface); }
.kl-settings-panel .kl-setting-row, .kl-settings-panel .kl-setting-action-row { display: flex; flex-wrap: wrap; align-items: center; min-width: 0; min-height: 56px; gap: 10px 20px; padding: 10px 0; }
.kl-settings-group-body > .kl-setting-row + .kl-setting-row, .kl-settings-group-body > .kl-setting-action-row { border-top: 1px solid var(--kl-border); }
.kl-settings-panel .kl-setting-copy { min-width: 0; flex: 1 1 110px; }
.kl-settings-panel .kl-setting-name { font-size: var(--kl-type-body); line-height: 1.4; font-weight: 500; overflow-wrap: anywhere; }
.kl-settings-panel .kl-setting-help { font-size: var(--kl-type-sm); line-height: 1.45; overflow-wrap: anywhere; max-width: 340px; }
#kikilink-settings-panel-appearance .kl-setting-help { display: none; }
.kl-settings-panel .kl-select { width: 168px; min-width: 0; max-width: 52%; height: 36px; min-height: 36px; border-radius: 8px; background: var(--kl-input-bg); font-size: var(--kl-type-body); }
.kl-settings-panel .kl-text-button { min-height: 36px; padding: 7px 12px; border-radius: 8px; font-size: var(--kl-type-body); font-weight: 600; }
.kl-settings-panel .kl-number-input, .kl-settings-panel input[type="number"] { width: 76px; min-width: 0; max-width: 100%; text-align: end; }
.kl-settings-panel .kl-setting-row > label:not(.kl-switch) { display: flex; align-items: center; gap: 6px; font-size: var(--kl-type-sm); }
.kl-settings-panel .kl-color-control { flex-wrap: wrap; gap: 10px; }
.kl-settings-panel .kl-color-swatch { border-radius: 50%; width: 32px; height: 32px; }
.kl-settings-panel .kl-color-presets { gap: 8px; flex-wrap: wrap; }
.kl-settings-panel .kl-switch { flex: none; width: 36px; height: 36px; }
.kl-settings-panel .kl-switch-track { inset: 7px 0; border-color: var(--kl-border-strong); }
.kl-settings-panel .kl-switch-track::after { top: 3px; left: 3px; width: 14px; height: 14px; background: var(--kl-muted); box-shadow: none; }
.kl-settings-panel .kl-switch input:checked + .kl-switch-track::after { transform: translateX(14px); }
.kl-settings-panel .kl-switch input:disabled + .kl-switch-track { opacity: .46; cursor: not-allowed; }
.kl-settings-panel .kl-switch::before { content: ""; position: absolute; inset: -4px; }
:host([data-density="super-compact"]) .kl-settings-panel .kl-setting-row:not(.kl-settings-accent-row),
:host([data-density="super-compact"]) .kl-settings-panel .kl-setting-action-row { min-height: 44px; padding-block: 6px; }
.kl-settings-panel .kl-setting-section, .kl-settings-panel .kl-settings-disclosure { min-width: 0; padding: 12px 14px; border: 1px solid var(--kl-border); border-radius: 10px; background: var(--kl-surface); box-shadow: none; }
.kl-settings-panel .kl-settings-disclosure { padding-block: 0; }
.kl-settings-panel .kl-settings-disclosure > summary { padding-inline: 0; font-size: var(--kl-type-body); font-weight: 500; }
.kl-settings-panel .kl-settings-disclosure > summary::before { order: 1; margin-inline-start: auto; transform: rotate(45deg); }
.kl-settings-panel .kl-settings-disclosure[open] > summary::before { transform: rotate(225deg); }
.kl-settings-panel .kl-settings-disclosure > summary :is(.kl-disclosure-meta, .kl-data-tools-count) { margin-inline-start: auto; }
.kl-settings-panel .kl-settings-disclosure > summary:has(:is(.kl-disclosure-meta, .kl-data-tools-count))::before { margin-inline-start: 2px; }
.kl-settings-panel .kl-settings-group-body > .kl-settings-disclosure { padding-inline: 0; border-width: 1px 0 0; border-radius: 0; background: none; }
.kl-settings-panel :is(.kl-sound-choices, .kl-custom-sounds-body, .kl-reaction-advanced-content) { padding-inline: 0; }
.kl-settings-panel .kl-sound-choice .kl-select { width: 100%; max-width: 100%; }
.kl-settings-panel .kl-volume-control { min-width: 0; max-width: 100%; }
.kl-settings-panel .kl-setting-section-title { font-size: var(--kl-type-body); font-weight: 650; color: var(--kl-muted); }
.kl-settings-panel .kl-data-tools { border-radius: 8px; padding: 12px 0; background: transparent; border: 0; flex-wrap: wrap; }
.kl-settings-panel .kl-data-tools-actions { flex-wrap: wrap; }
.kl-settings-panel .kl-about-card { padding: 16px; border-radius: 10px; min-height: 0; }
.kl-settings-panel .kl-about-watermark, .kl-settings-panel .kl-about-tagline { display: none; }
.kl-settings-panel .kl-about-name { font: 650 16px var(--kl-font, system-ui); }
.kl-settings-panel .kl-about-facts { overflow-wrap: anywhere; }
.kl-setting-tool-buttons { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.kl-settings-editor-status:empty { display: none; }
.kl-settings-editor-status, .kl-inline-setting-error { font-size: var(--kl-type-body); line-height: 1.5; }
.kl-inline-setting-error { flex: 1 0 100%; display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; border: 1px solid var(--kl-border-strong); border-radius: 6px; background: var(--kl-surface-2); }
.kl-inline-setting-error > span { flex: 1 0 100%; }
.kl-settings-panel .kl-settings-restore { justify-self: start; }
:is(.kl-content-dialog, .kl-settings-backup-dialog):has(.kl-settings-restore-confirm, .kl-position-editor) { position: fixed; inset: 0; width: min(540px, calc(100vw - 24px)); margin: auto; border: 1px solid var(--kl-border-strong); border-radius: 12px; background: var(--kl-surface); }
:is(.kl-content-dialog, .kl-settings-backup-dialog):has(.kl-settings-restore-confirm, .kl-position-editor) > .kl-dialog-header { min-height: 61px; padding: 10px 12px; background: var(--kl-surface); }
:is(.kl-content-dialog, .kl-settings-backup-dialog):has(.kl-settings-restore-confirm, .kl-position-editor) .kl-dialog-title { font: 700 16px/1.3 var(--kl-font, system-ui); }
:is(.kl-content-dialog, .kl-settings-backup-dialog):has(.kl-settings-restore-confirm, .kl-position-editor) .kl-dialog-title::before { content: 'KIKILINK'; display: block; margin-bottom: 3px; color: var(--kl-gold); font-size: 9px; letter-spacing: .14em; }
:is(.kl-content-dialog, .kl-settings-backup-dialog):has(.kl-settings-restore-confirm, .kl-position-editor) > .kl-dialog-body { padding: 0; overflow: hidden; }
.kl-settings-restore-confirm { display: grid; grid-template-rows: minmax(0, 1fr) auto; min-height: 0; }
.kl-settings-restore-copy { display: grid; gap: 8px; padding: 16px; overflow: auto; overscroll-behavior: contain; font-size: 12px; line-height: 1.7; }
.kl-settings-restore-copy > p { margin: 0; }
.kl-settings-restore-copy > p:nth-child(2) { color: var(--kl-muted); font-size: 11px; }
.kl-settings-restore-copy > p:empty { display: none; }
:is(.kl-settings-restore-confirm, .kl-position-editor) > .kl-dialog-actions { min-height: 61px; flex-wrap: wrap; padding: 12px 16px; background: var(--kl-input-bg); }
:is(.kl-settings-restore-confirm, .kl-position-editor) .kl-text-button { min-height: 36px; }
.kl-settings-group-body > button { margin: 12px 8px 12px 0; }
.kl-settings-cloud { display: grid; gap: 18px; min-width: 0; overflow-wrap: anywhere; }
.kl-settings-cloud h3 { margin: 0 0 8px; font-size: 15px; }
.kl-settings-cloud p { margin: 8px 0; }
.kl-settings-confirm { padding: 10px; margin-top: 10px; border: 1px solid var(--kl-border); border-radius: 8px; }
.kl-settings-confirm button + button { margin-left: 8px; }
.kl-settings-account .kl-settings-panel-body { max-width: 980px; }
.kl-account-settings, .kl-account-body { display: grid; gap: 12px; min-width: 0; }
.kl-account-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.kl-account-section { padding: 14px; border: 1px solid var(--kl-border); border-radius: 10px; background: var(--kl-surface); min-width: 0; overflow-wrap: anywhere; }
.kl-account-section > h3 { margin: 0 0 12px; font-size: calc(var(--kl-type-body) + 1px); }
.kl-account-section > .kl-text-button { margin-top: 12px; }
.kl-account-section p { margin: 6px 0; }
.kl-account-status { display: flex; flex-wrap: wrap; gap: 10px 12px; align-items: center; padding: 14px; border: 1px solid var(--kl-border); border-radius: 10px; background: var(--kl-surface); }
.kl-account-status > div { flex: 1 1 130px; min-width: 0; }
.kl-account-status .kl-setting-help { margin: 4px 0 0; }
.kl-account-status > svg, .kl-account-session > svg { box-sizing: content-box; width: 18px; height: 18px; padding: 9px; border: 1px solid var(--kl-border); border-radius: 9px; background: var(--kl-surface-2); color: var(--kl-gold); flex: none; }
.kl-account-status strong { font-size: 14px; font-weight: 650; }
.kl-account-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding-block: 8px; flex-wrap: wrap; }
.kl-account-row + .kl-account-row { border-top: 1px solid var(--kl-border); }
.kl-account-row strong { font-size: var(--kl-type-body); font-weight: 550; }
.kl-account-row > span { color: var(--kl-muted); font-size: var(--kl-type-body); }
.kl-account-badge { display: inline-flex; width: fit-content; border: 1px solid var(--kl-border); border-radius: 999px; padding: 3px 8px; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-account-badge[data-current="true"] { color: var(--kl-gold); border-color: var(--kl-border-strong); }
.kl-sessions-inventory { margin-bottom: 12px; }
.kl-sessions-heading .kl-audit-actions > .kl-audit-info-button { width: 42px; }
.kl-sessions-inventory > h3, .kl-sessions-history > h3 { line-height: 1.4; font-size: 13px; }
.kl-settings-panel .kl-sessions-inventory > p, .kl-settings-panel .kl-sessions-history > p { margin: 0; color: var(--kl-muted); font-size: 11px; line-height: 1.7; }
.kl-session-toolbar, .kl-session-metrics, .kl-session-actions { display: flex; align-items: center; flex-wrap: wrap; min-width: 0; }
.kl-session-toolbar { gap: 8px; margin-bottom: 12px; color: var(--kl-muted); font-size: 11px; }
.kl-session-toolbar > .kl-select { width: auto; height: 36px; min-height: 36px; padding-inline: 8px; font-size: 11px; }
.kl-session-toolbar > span, .kl-session-actions > span { font-size: 10px; color: var(--kl-faint,var(--kl-muted)); }
.kl-account-session-list { display: grid; gap: 10px; }
.kl-account-session { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 10px 12px; min-width: 0; padding: 12px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg); }
.kl-session-icon { display: grid; flex: none; place-items: center; width: 44px; height: 44px; border-radius: 11px; background: #351c22; border: 1px solid #dd9ba425; color: #dd9ba4; }
.kl-session-icon[data-current=true] { background: #312b26; border-color: #caae9225; color: #caae92; }
.kl-session-icon > svg { width: 23px; height: 23px; }
.kl-session-copy { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.kl-session-copy > strong { display: block; font-size: 12px; line-height: 1.6; }
.kl-session-metrics { gap: 5px 8px; margin-top: 8px; color: var(--kl-muted); font-size: 10px; line-height: 1.5; }
.kl-session-metrics > .kl-account-badge { border-radius: 4px; padding: 2px 6px; font-size: 10px; line-height: 1.5; }
.kl-session-copy > p { margin: 6px 0 0; color: var(--kl-muted); font-size: 11px; line-height: 1.7; }
.kl-session-actions { justify-content: flex-end; gap: 6px; }
.kl-session-actions > .kl-text-button { font-size: 11px; background: transparent; }
.kl-panel[data-platform-preview="true"] .kl-session-actions > .kl-session-menu { width: 32px; min-width: 32px; height: 32px; min-height: 32px; padding: 0; border-color: transparent; background: transparent; color: var(--kl-muted); }
.kl-panel[data-platform-preview="true"] .kl-session-actions > .kl-session-menu:hover:not(:disabled) { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-session-history-row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; padding: 10px 0; font-size: 11px; }
.kl-session-history-row + .kl-session-history-row { border-top: 1px solid var(--kl-border); }
.kl-session-history-row time { color: var(--kl-muted); font-size: 10px; }
.kl-content-dialog:has(.kl-session-modal,.kl-timed-mute-modal) { position: fixed; margin: auto; width: min(540px, calc(100vw - 24px)); border-color: var(--kl-border-strong); border-radius: 12px; background: var(--kl-surface); }
.kl-content-dialog:has(.kl-session-modal,.kl-timed-mute-modal)::backdrop { background: #030303b8; }
.kl-content-dialog:has(.kl-session-modal,.kl-timed-mute-modal) > .kl-dialog-header { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 0 12px; padding: 12px 16px; background: var(--kl-surface); }
.kl-content-dialog:has(.kl-session-modal,.kl-timed-mute-modal) .kl-dialog-title { grid-area: 2 / 1; min-width: 0; font: 700 16px/1.4 var(--kl-font, system-ui); overflow-wrap: anywhere; }
.kl-content-dialog:has(.kl-session-modal,.kl-timed-mute-modal) > .kl-dialog-header::before { content: 'KIKILINK'; grid-area: 1 / 1; font: 400 10px/1.7 var(--kl-font, system-ui); letter-spacing: .25px; color: var(--kl-faint, var(--kl-muted)); }
.kl-content-dialog:has(.kl-session-modal,.kl-timed-mute-modal) > .kl-dialog-header > button { grid-area: 1 / 2 / 3 / 3; width: 32px; min-width: 32px; height: 32px; min-height: 32px; padding: 0; border-color: transparent; border-radius: 8px; background: transparent; color: var(--kl-muted); }
.kl-content-dialog:has(.kl-session-modal,.kl-timed-mute-modal) > .kl-dialog-header > button:hover { color: var(--kl-text); background: var(--kl-surface-hover); }
.kl-content-dialog:has(.kl-session-modal,.kl-timed-mute-modal) > .kl-dialog-header > button > svg { width: 16px; height: 16px; }
.kl-content-dialog:has(.kl-session-modal,.kl-timed-mute-modal) > .kl-dialog-body { padding: 0; overflow: hidden; }
:is(.kl-session-modal,.kl-timed-mute-modal) { display: grid; grid-template-rows: minmax(0, 1fr) auto; min-width: 0; min-height: 0; }
.kl-session-modal-body { padding: 16px; overflow: auto; overscroll-behavior: contain; overflow-wrap: anywhere; scrollbar-width: thin; }
.kl-session-modal-body > p { margin: 0; font-size: 12px; line-height: 1.5; }
.kl-session-details { display: grid; grid-template-columns: auto minmax(0,1fr); align-items: baseline; gap: 12px; min-width: 0; margin: 16px 0; font-size: 11px; line-height: 1.5; }
.kl-session-details dt { color: var(--kl-muted); }
.kl-session-details dd { margin: 0; text-align: right; overflow-wrap: anywhere; }
.kl-session-details summary { width: fit-content; max-width: 100%; margin-left: auto; cursor: pointer; }
.kl-session-details summary::marker { color: var(--kl-muted); font-size: 9px; }
.kl-session-access-fields { display: grid; grid-template-columns: auto minmax(0,1fr); gap: 6px 8px; margin: 8px 0 0; padding-top: 8px; border-top: 1px solid var(--kl-border); }
.kl-session-access-fields dt { text-align: left; }
:is(.kl-session-modal,.kl-timed-mute-modal) > .kl-dialog-actions { justify-content: flex-end; align-items: center; gap: 8px; flex-wrap: wrap; padding: 12px 16px; background: var(--kl-input-bg); }
.kl-session-modal > .kl-dialog-actions > :first-child:not(:last-child) { margin-right: auto; }
.kl-session-modal .kl-text-button { min-height: 36px; max-width: 100%; padding: 0 12px; border-radius: 7px; white-space: normal; font-size: 12px; font-weight: 550; background: transparent; }
.kl-session-modal .kl-session-danger { color: var(--kl-danger); border-color: color-mix(in srgb, var(--kl-danger) 36%, transparent); background: color-mix(in srgb, var(--kl-danger) 7%, transparent); }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-content-dialog:has(.kl-session-modal,.kl-timed-mute-modal) > .kl-dialog-header, :is(.kl-session-modal,.kl-timed-mute-modal) > .kl-dialog-actions { padding: 10px 12px; }
  .kl-content-dialog:has(.kl-session-modal) .kl-dialog-title { font-size: 15px; }
  .kl-content-dialog:has(.kl-session-modal,.kl-timed-mute-modal) > .kl-dialog-header > button { width: 40px; height: 40px; }
  .kl-session-modal-body { padding: 12px; }
  .kl-session-modal .kl-text-button { min-height: 40px; }
  .kl-session-toolbar > .kl-select { height: 40px; }
  .kl-panel[data-platform-preview="true"] .kl-session-actions > .kl-session-menu { width: 40px; min-width: 40px; height: 40px; min-height: 40px; }
  .kl-sessions-heading .kl-audit-actions > button, .kl-session-actions > .kl-text-button { min-height: 40px; }
}
@container kl-panel (width <= 700px) {
  .kl-sessions-inventory, .kl-sessions-history { padding: 12px; }
  .kl-session-toolbar > .kl-select { flex: 1 1 145px; min-width: 0; }
  .kl-session-toolbar > span { min-width: 121px; }
  .kl-session-actions { flex-basis: 100%; justify-content: flex-start; }
  .kl-sessions-heading .kl-audit-actions { flex: 1 1 190px; }
}

.kl-account-feedback { padding: 12px 14px; border: 1px solid var(--kl-border-strong); border-radius: 8px; background: var(--kl-surface-2); font-size: var(--kl-type-body); }
.kl-account-toolbar, .kl-account-toolbar > label { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.kl-account-toolbar { justify-content: space-between; }
.kl-account-toolbar .kl-select { max-width: 100%; }
.kl-settings-panel .kl-preference-audience { display: grid; gap: 8px; }
.kl-settings-panel .kl-preference-audience .kl-select { width: 100%; max-width: 100%; }
.kl-account-activity { display: grid; gap: 10px; min-width: 0; }
.kl-account-log-row { display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; gap: 8px 12px; align-items: start; min-width: 0; padding: 12px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg); }
.kl-account-log-row strong { font-size: var(--kl-type-sm); font-weight: 550; overflow-wrap: anywhere; }
.kl-account-log-row > svg { width: 18px; height: 18px; margin-top: 1px; color: var(--kl-muted); }
.kl-account-log-row time, .kl-account-section > time { font-size: var(--kl-type-xs); color: var(--kl-muted); }
.kl-account-diagnostics { white-space: pre-wrap; overflow-wrap: anywhere; font: var(--kl-type-sm)/1.7 ui-monospace, monospace; max-height: 320px; max-width: 100%; overflow: auto; padding: 12px; border: 1px solid var(--kl-border); border-radius: 7px; background: var(--kl-input-bg); }
.kl-sync-list { display: grid; gap: 10px; margin-top: 12px; }
.kl-sync-queue-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px 12px; flex-wrap: wrap; margin-bottom: 10px; }
.kl-sync-queue-heading > h3 { margin: 0; }
.kl-sync-metrics { display: flex; flex-wrap: wrap; gap: 4px 12px; padding: 0; margin: 0; list-style: none; color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-sync-metrics strong { color: var(--kl-text); }
.kl-sync-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.kl-cloud-sync .kl-account-toolbar .kl-select { width: auto; }
.kl-sync-list > .kl-account-section { padding: 12px; border-radius: 8px; background: var(--kl-input-bg); }
.kl-sync-help { margin-top: 16px; color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-sync-help > summary { cursor: pointer; padding: 6px 0; }
.kl-sync-comparison { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: var(--kl-type-sm); }
.kl-sync-comparison th, .kl-sync-comparison td { text-align: left; vertical-align: top; padding: 8px; border-bottom: 1px solid var(--kl-border); overflow-wrap: anywhere; white-space: pre-wrap; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-account-grid { grid-template-columns: minmax(0, 1fr); }
  .kl-account-section, .kl-account-status { padding: 12px; }
  .kl-account-log-row { grid-template-columns: 24px minmax(0, 1fr); }
  .kl-account-log-row > time { grid-column: 2; }
}

.kl-cloud-overview { display:grid; gap:12px; min-width:0; }
.kl-cloud-overview:has(> .kl-cloud-heading) { gap:0; }
.kl-cloud-overview .kl-cloud-heading { margin:0 0 16px; }
.kl-cloud-overview > .kl-cloud-heading ~ :not(:last-child) { margin-bottom:12px; }
.kl-cloud-overview .kl-cloud-heading > h2 { font-family:inherit; }
.kl-cloud-overview .kl-sync-actions { gap:6px; }
.kl-cloud-overview .kl-sync-actions > .kl-text-button { display:inline-flex; align-items:center; justify-content:center; flex:0 0 auto; gap:7px; white-space:nowrap; }
.kl-cloud-overview .kl-sync-actions > .kl-text-button:first-child { min-inline-size:110px; }
.kl-cloud-overview .kl-sync-actions > .kl-text-button--primary { min-inline-size:101px; }
.kl-cloud-overview .kl-sync-actions > .kl-audit-info-button { width:42px; }
.kl-cloud-overview .kl-sync-actions > .kl-text-button svg { flex:none; width:16px; height:16px; }
.kl-cloud-overview .kl-sync-actions .kl-text-button--primary { background:var(--kl-accent); color:var(--kl-accent-foreground); border-color:var(--kl-accent); }
.kl-cloud-overview .kl-sync-actions .kl-text-button--primary:disabled { opacity:.5; }
.kl-cloud-overview .kl-text-button { font-size:11px; }
.kl-cloud-overview .kl-account-section { padding:14px; }
.kl-cloud-overview .kl-cloud-status { padding:16px; }
.kl-cloud-status-heading { display:flex; align-items:center; flex-wrap:wrap; gap:10px 12px; }
.kl-cloud-status-copy { flex:1 1 150px; min-width:0; }
.kl-cloud-status-copy h3 { margin:0; font-size:14px; }
.kl-cloud-status-copy .kl-setting-help { margin:4px 0 0; font-size:10px; line-height:1.7; }
.kl-cloud-icon { box-sizing:border-box; display:inline-grid; flex:none; place-items:center; width:44px; height:44px; border-radius:10px; border:1px solid #98bba825; background:#21332f; color:#98bba8; }
.kl-cloud-icon svg { width:23px; height:23px; }
.kl-cloud-status[data-state="paused"] .kl-cloud-icon, .kl-sync-item[data-status="Conflict"] .kl-cloud-icon { color:#caae92; background:#312b26; border-color:#caae9225; }
.kl-cloud-status[data-state="offline"] .kl-cloud-icon, .kl-sync-item[data-status="Failed"] .kl-cloud-icon { color:#dd9ba4; background:#351c22; border-color:#dd9ba425; }
.kl-cloud-overview .kl-sync-metrics { margin:16px 0; gap:12px 20px; font-size:10px; line-height:1.5; }
.kl-cloud-overview .kl-sync-metrics strong { display:block; margin-bottom:2px; font-size:18px; font-weight:550; }
.kl-cloud-services { display:grid; gap:8px; }
.kl-cloud-service-row, .kl-sync-history-row { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 0; border-bottom:1px solid var(--kl-border); font-size:11px; }
.kl-cloud-service-row { line-height:1.5; }
.kl-cloud-service-row span { text-align:end; }
.kl-cloud-service-row:last-child, .kl-sync-history-row:last-child { border-bottom:0; }
.kl-sync-history-row time { color:var(--kl-muted); font-size:10px; }
.kl-cloud-overview .kl-account-section h3 { font-size:13px; font-weight:650; }
.kl-cloud-overview .kl-cloud-status h3 { font-size:14px; }
.kl-cloud-overview .kl-setting-tool-buttons { margin:0; gap:6px; }
.kl-cloud-grid .kl-setting-tool-buttons button { background:transparent; }
.kl-cloud-grid .kl-setting-tool-buttons button:last-child { border-color:transparent; color:var(--kl-muted); }
.kl-cloud-overview .kl-account-toolbar .kl-select { width:auto; height:36px; padding:0 8px; font-size:11px; }
.kl-cloud-overview .kl-account-toolbar > label { color:var(--kl-muted); font-size:11px; }
.kl-cloud-overview .kl-sync-help { margin:0; }
.kl-cloud-overview .kl-sync-item { display:flex; align-items:flex-start; flex-wrap:wrap; gap:10px 12px; padding:12px; }
.kl-sync-item-copy { flex:1 1 160px; min-width:0; }
.kl-sync-item-copy > strong { font-size:12px; }
.kl-sync-item-meta { display:flex; align-items:center; flex-wrap:wrap; gap:5px 8px; margin-top:8px; color:var(--kl-muted); font-size:10px; }
.kl-sync-item .kl-setting-help, .kl-cloud-overview .kl-cloud-queue .kl-setting-help { font-size:11px; line-height:1.7; }
.kl-cloud-overview > .kl-account-section > .kl-setting-help { margin:0; font-size:11px; line-height:1.7; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-cloud-overview .kl-text-button, .kl-cloud-overview .kl-account-toolbar .kl-select { min-height:40px; }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-cloud-overview .kl-cloud-heading { margin-bottom:8px; }
}
@container kl-panel (width <= 700px) {
  .kl-cloud-overview .kl-cloud-heading > h2, .kl-cloud-overview .kl-cloud-heading > .kl-sync-actions { flex:1 1 190px; }
  .kl-cloud-overview .kl-account-section { padding:12px; }
  .kl-cloud-overview .kl-cloud-status { padding:14px; }
  .kl-cloud-overview .kl-sync-actions { flex-wrap:wrap; }
  .kl-cloud-overview .kl-account-toolbar > label { width:100%; }
  .kl-cloud-overview .kl-account-toolbar .kl-select { flex:1 1 145px; }
  .kl-sync-item > .kl-setting-tool-buttons { flex-basis:100%; }
}
.kl-account-body:has(> .kl-audit-heading) { gap: 0; }
.kl-audit-heading, .kl-audit-actions, .kl-audit-toolbar, .kl-audit-toolbar > label { display: flex; align-items: center; flex-wrap: wrap; min-width: 0; }
.kl-audit-heading { justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.kl-audit-heading > h2 { flex: 1 1 160px; min-width: 0; margin: 0; font: 700 var(--kl-type-xl)/1.3 var(--kl-font, system-ui); letter-spacing: -.3px; }
.kl-audit-actions { gap: 6px; }
.kl-audit-actions > .kl-text-button { background: transparent; font-size: 11px; font-weight: 550; }
.kl-audit-actions > .kl-text-button:hover:not(:disabled) { background: var(--kl-surface-hover); }
.kl-audit-actions > .kl-audit-info-button { display: inline-grid; place-items: center; width: 36px; height: 36px; padding: 0; background: var(--kl-surface-2); }
.kl-audit-info-button > svg { width: 16px; height: 16px; }
.kl-audit-heading ~ .kl-account-feedback { margin: 0 0 12px; }
.kl-audit-toolbar { gap: 8px; margin-bottom: 12px; }
.kl-audit-toolbar > label { gap: 8px; color: var(--kl-muted); font-size: 11px; }
.kl-audit-toolbar .kl-audit-filter { width: auto; max-width: 100%; height: 36px; padding-inline: 8px; font-size: 11px; }
.kl-audit-count { min-width: 0; color: var(--kl-muted); font-size: 10px; }
.kl-audit-heading ~ .kl-account-activity { padding: 16px; border: 1px solid var(--kl-border); border-radius: 10px; background: var(--kl-surface); }
.kl-audit-heading ~ .kl-account-activity > .kl-account-log-row { display: flex; flex-wrap: wrap; align-items: flex-start; }
.kl-audit-heading ~ .kl-account-activity .kl-account-log-row > div { flex: 1; min-width: 0; }
.kl-audit-heading ~ .kl-account-activity .kl-account-log-row > svg { flex: none; width: 44px; height: 44px; padding: 10px; margin: 0; border: 1px solid var(--kl-border); border-radius: 11px; background: #302b28; color: #d5c5ac; }
.kl-audit-heading ~ .kl-account-activity .kl-account-log-row strong { display: block; font-size: 11px; font-weight: 700; }
.kl-audit-heading ~ .kl-account-activity .kl-account-log-row :is(.kl-setting-help, time) { color: var(--kl-muted); font-size: 10px; line-height: 1.7; }
.kl-audit-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px 16px; border: 1px dashed var(--kl-border); border-radius: 10px; text-align: center; }
.kl-audit-empty > svg { width: 28px; height: 28px; margin-bottom: 4px; color: var(--kl-muted); }
.kl-audit-empty > h3 { margin: 0; font-size: 16px; }
.kl-audit-empty > .kl-setting-help { max-width: 340px; margin: 0; font-size: 11px; line-height: 1.7; }
.kl-audit-empty > .kl-text-button { margin-top: 4px; background: transparent; font-weight: 550; }
.kl-audit-empty > .kl-text-button:hover { background: var(--kl-surface-hover); }
.kl-content-dialog:has(.kl-audit-confirm, .kl-audit-info) { position: fixed; inset: 0; margin: auto; border: 1px solid var(--kl-border-strong); background: var(--kl-surface); }
.kl-content-dialog:has(.kl-audit-confirm) { width: min(540px, calc(100vw - 24px)); border-radius: 12px; }
.kl-content-dialog:has(.kl-audit-info) { width: min(320px, 100vw); height: 100dvh; margin: 0 0 0 auto; border-width: 0 0 0 1px; border-radius: 0; }
.kl-content-dialog:has(.kl-audit-confirm, .kl-audit-info) > .kl-dialog-header { min-height: 61px; padding: 12px 16px; background: var(--kl-surface); }
.kl-content-dialog:has(.kl-audit-confirm, .kl-audit-info) .kl-dialog-title { font: 700 16px/1.4 var(--kl-font, system-ui); }
.kl-content-dialog:has(.kl-audit-confirm) > .kl-dialog-body { padding: 0; overflow: hidden; }
.kl-audit-confirm { display: grid; grid-template-rows: minmax(0, 1fr) auto; min-height: 0; }
.kl-audit-confirm > p { margin: 0; padding: 16px; overflow: auto; overscroll-behavior: contain; overflow-wrap: anywhere; font-size: 12px; line-height: 1.7; }
.kl-audit-confirm > .kl-dialog-actions { justify-content: space-between; flex-wrap: wrap; padding: 12px 16px; background: var(--kl-input-bg); }
.kl-audit-confirm > .kl-dialog-actions .kl-text-button { min-height: 36px; }
.kl-audit-confirm .kl-audit-confirm-clear { color: var(--kl-danger); border-color: color-mix(in srgb, var(--kl-danger) 36%, transparent); background: color-mix(in srgb, var(--kl-danger) 7%, transparent); }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-audit-actions > .kl-audit-info-button, .kl-audit-toolbar .kl-audit-filter { height: 40px; }
  .kl-audit-actions > .kl-audit-info-button { width: 40px; }
}
@container kl-panel (width <= 700px) {
  .kl-audit-heading { align-items: flex-start; gap: 10px; }
  .kl-audit-heading > h2 { flex-basis: 190px; }
  .kl-audit-toolbar > label { flex: 1 1 145px; }
  .kl-audit-toolbar .kl-audit-filter { flex: 1 1 auto; }
  .kl-audit-heading ~ .kl-account-activity .kl-account-log-row > div { flex-basis: 105px; }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-audit-heading { margin-bottom: 8px; }
}

.kl-settings-panel .kl-settings-accent-row { display: block; padding: 16px 0; margin: 0; border: 0; }
.kl-settings-accent-row legend { float: none; width: auto; padding: 16px 0 0; margin: 0 0 10px; font-size: var(--kl-type-body); font-weight: 600; line-height: 1.5; }
.kl-settings-panel .kl-settings-accent-row .kl-color-control { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
.kl-settings-panel .kl-settings-accent-row .kl-color-presets { width: auto; justify-content: flex-start; }
.kl-settings-panel .kl-settings-accent-row .kl-color-swatch { position: relative; display: grid; place-items: center; width: 36px; height: 36px; border: 1px solid var(--kl-border); outline: 0; box-shadow: none; background: var(--kl-surface); }
.kl-settings-panel .kl-settings-accent-row .kl-color-swatch::before { content: ''; position: absolute; width: 26px; height: 26px; border-radius: 50%; background: var(--kl-swatch); }
.kl-settings-panel .kl-settings-accent-row .kl-color-swatch[aria-pressed="true"] { border-color: var(--kl-text); }
.kl-settings-panel .kl-settings-accent-row .kl-color-swatch:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 2px; }
.kl-settings-panel .kl-settings-accent-row .kl-color-swatch::after { position: relative; }
.kl-color-swatch[aria-pressed="true"]::after { content: "✓"; font-size: 12px; color: white; text-shadow: 0 1px 2px #000; }
.kl-settings-accent-custom { display: flex; align-items: flex-end; gap: 12px; min-width: 0; max-width: 100%; }
.kl-settings-accent-custom > label { display: grid; gap: 6px; min-width: 0; width: 160px; color: var(--kl-muted); font-size: 11px; font-weight: 550; line-height: 1.5; }
.kl-settings-accent-custom input[type="color"] { flex: none; width: 40px; height: 36px; }
.kl-settings-accent-custom .kl-settings-accent-hex { box-sizing: border-box; width: 100%; min-width: 0; min-height: 36px; padding: 7px 10px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg); color: var(--kl-text); font-family: inherit; font-size: 12px; font-weight: 400; line-height: 1.5; text-transform: uppercase; }
.kl-settings-accent-hex:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 2px; }
.kl-settings-accent-custom > button { flex: none; }
@container kl-panel (max-width: 1100px) {
  .kl-panel[data-platform-preview="true"] .kl-settings-panel { padding: 16px 16px 24px; }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-settings-nav-divider { display: none; }
  .kl-panel[data-platform-preview="true"] .kl-settings-tabs { position: relative; flex: 1 1 auto; flex-direction: row; padding: 6px 6px 6px 12px; scroll-padding-inline: 12px; overflow-x: auto; overflow-y: hidden; gap: 4px; scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent; overscroll-behavior: contain; }
  .kl-panel[data-platform-preview="true"] .kl-settings-tab { width: auto; min-height: 36px; padding: 0 10px; gap: 6px; font-size: var(--kl-type-sm); white-space: nowrap; }
  .kl-settings-tab-icon { width: 14px; height: 14px; }
  .kl-panel[data-platform-preview="true"] .kl-settings-panel { padding: 12px 12px 24px; }
  .kl-settings-group-body { padding-inline: 16px; }
  .kl-settings-panel .kl-setting-row, .kl-settings-panel .kl-setting-action-row { gap: 10px 12px; }
  .kl-settings-panel .kl-setting-help { font-size: var(--kl-type-xs); }
  .kl-settings-panel .kl-select { width: 168px; height: 40px; min-height: 40px; }
  .kl-settings-panel .kl-text-button { min-height: 40px; }
  .kl-settings-accent-custom input[type="color"], .kl-settings-accent-custom .kl-settings-accent-hex { height: 40px; min-height: 40px; }
  .kl-settings-accent-custom .kl-settings-accent-hex { font-size: 16px; }
  .kl-settings-accent-custom { gap: 8px; }
  .kl-settings-panel .kl-color-presets { gap: 6px; }
  .kl-settings-panel .kl-color-control { flex: 1 0 100%; justify-content: flex-start; }
  .kl-settings-panel .kl-setting-section { padding-inline: 12px; }
}
@container kl-panel (width <= 700px) {
  .kl-settings-panel-title { align-items: flex-start; }
}

.kl-settings-recovery-copies { display: grid; gap: 8px; margin-top: 12px; }
.kl-settings-recovery-copies .kl-setting-action-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.kl-settings-recovery-dialog { width: min(560px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); grid-template-rows: auto minmax(0, 1fr) auto; }
.kl-settings-recovery-dialog h2 { margin: 0 auto 0 0; font-size: 18px; }
.kl-settings-recovery-dialog .kl-dialog-body { display: block; overflow: auto; padding: 12px 16px; overflow-wrap: anywhere; }
.kl-settings-recovery-dialog .kl-dialog-body p, .kl-settings-recovery-dialog .kl-dialog-body ul { margin-block: 0 14px; }
.kl-settings-recovery-dialog .kl-dialog-actions { flex-wrap: wrap; }
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-panel[data-platform-preview="true"] .kl-settings-tabs { padding-block: 3px; }
}
@container kl-panel (max-width: 620px) {
  .kl-settings-panel .kl-settings-panel-body { gap: 20px; }
  .kl-settings-panel .kl-select { width: 138px; }
  .kl-settings-group-body { padding-inline: 12px; }
}

.kl-content-dialog:has(.kl-timed-mute-modal) { width: min(480px,calc(100vw - 24px)); }
.kl-timed-mute-body { min-width: 0; min-height: 0; padding: 16px; overflow: auto; overscroll-behavior: contain; overflow-wrap: anywhere; scrollbar-width: thin; }
.kl-timed-mute-body p { margin: 0; color: var(--kl-muted); font-size: 11px; line-height: 1.75; }
.kl-timed-mute-body > p + p { margin-top: 8px; }
.kl-timed-mute-body .kl-cloud-status:empty, .kl-timed-mute-modal [hidden] { display: none; }
.kl-timed-mutes-list { min-width: 0; margin-top: 10px; }
.kl-timed-mutes-row { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 12px 0; border-bottom: 1px solid var(--kl-border); }
.kl-timed-mutes-row:last-child { border-bottom: 0; }
.kl-timed-mutes-row > :first-child { flex: 1; min-width: 0; }
.kl-timed-mutes-row strong { display: block; font-size: 11px; line-height: 1.6; }
.kl-timed-mutes-row p { font-size: 10px; line-height: 1.7; }
.kl-timed-mutes-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 6px; min-width: 0; }
.kl-timed-mutes-actions .kl-text-button { min-height: 32px; max-width: 100%; padding: 5px 8px; border-radius: 7px; background: transparent; font-size: 10px; white-space: normal; }
.kl-timed-mutes-empty { padding: 16px 8px; color: var(--kl-muted); text-align: center; font-size: 11px; line-height: 1.75; }
.kl-timed-mutes-empty h3 { margin: 0; font-size: 13px; font-weight: 650; line-height: 1.6; }
.kl-timed-scope strong { color: var(--kl-text); font-size: 12px; line-height: 1.65; }
.kl-timed-duration-list { display: flex; flex-direction: column; min-width: 0; gap: 6px; margin: 16px 0 12px; padding: 0; border: 0; }
.kl-timed-duration-list legend { margin-bottom: 8px; padding: 0; color: var(--kl-text); font-size: 11px; }
.kl-timed-duration-list label { display: flex; align-items: center; gap: 10px; min-width: 0; min-height: 38px; padding: 8px 10px; background: var(--kl-input-bg); border: 1px solid var(--kl-border); border-radius: 7px; font-size: 11px; line-height: 1.6; cursor: pointer; }
.kl-timed-duration-list label:hover { border-color: var(--kl-border-strong); background: var(--kl-surface-hover); }
.kl-timed-duration-list label:has(:checked) { background: color-mix(in srgb,var(--kl-accent) 7%,transparent); border-color: color-mix(in srgb,var(--kl-accent) 38%,transparent); }
.kl-timed-duration-list label:has(:focus-visible) { outline: 2px solid var(--kl-accent); outline-offset: 2px; }
.kl-timed-duration-list label > input { flex: none; width: 15px; height: 15px; margin: 0; accent-color: var(--kl-accent); }
.kl-timed-duration-list strong { font-size: 11px; font-weight: 500; }
.kl-timed-duration-list small { display: block; margin-top: 2px; font-size: 10px; color: var(--kl-muted); }
.kl-timed-controls { display: flex; flex: 1; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; }
.kl-timed-controls:not([hidden]) > :first-child { margin-right: auto; }
.kl-timed-mute-modal > .kl-dialog-actions .kl-text-button { min-height: 34px; max-width: 100%; padding: 0 12px; border-radius: 7px; font-size: 12px; font-weight: 550; white-space: normal; }
.kl-timed-mute-modal > .kl-dialog-actions .kl-text-button:not(.kl-text-button--primary) { background: transparent; }
.kl-timed-warning, .kl-timed-discard { padding: 10px 12px; border: 1px solid var(--kl-border); border-radius: 7px; background: var(--kl-input-bg); font-size: 11px; line-height: 1.75; }
.kl-timed-warning { margin-block: 12px; }
.kl-timed-discard { flex: 1; }
.kl-timed-discard p { margin: 0 0 8px; }
.kl-timed-discard button + button { margin-left: 8px; }
.kl-content-dialog[data-timed-layout]:not([data-timed-layout=desktop]) > .kl-dialog-header,
.kl-content-dialog[data-timed-layout]:not([data-timed-layout=desktop]) .kl-dialog-actions { padding: var(--kl-timed-bar-padding, 10px 12px); }
.kl-content-dialog[data-timed-layout]:not([data-timed-layout=desktop]) > .kl-dialog-header > button { width: 36px; height: 36px; }
.kl-content-dialog[data-timed-layout]:not([data-timed-layout=desktop]) .kl-timed-mute-body { padding: 12px; }
.kl-content-dialog[data-timed-layout]:not([data-timed-layout=desktop]) .kl-dialog-actions .kl-text-button { min-height: 40px; }
.kl-content-dialog[data-timed-layout]:not([data-timed-layout=desktop]) .kl-timed-mutes-actions .kl-text-button { min-height: 40px; }
[data-timed-layout=narrow] .kl-timed-mutes-row { align-items: flex-start; flex-wrap: wrap; gap: 8px; }
[data-timed-layout=narrow] .kl-timed-mutes-row > :first-child { flex-basis: 150px; }
[data-timed-layout=narrow] .kl-timed-mutes-row .kl-timed-mutes-actions { margin-left: auto; }
[data-timed-layout=narrow] .kl-timed-duration-list label { min-height: 42px; }
.kl-content-dialog[data-timed-layout=landscape] { --kl-timed-bar-padding: 8px 12px; }
[data-timed-layout=landscape] .kl-timed-duration-list { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); margin-block: 12px; }
[data-timed-layout=landscape] .kl-timed-duration-list legend, [data-timed-layout=landscape] .kl-timed-duration-list label:last-child { grid-column: 1/-1; }
[data-timed-layout=landscape] .kl-timed-duration-list label { min-height: 36px; padding: 6px 8px; }
`;
