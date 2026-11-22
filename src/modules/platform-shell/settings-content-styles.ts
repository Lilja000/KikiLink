/** General settings rows and account privacy share the prototype's compact controls. */
export const SETTINGS_CONTENT_STYLES = `
.kl-settings-panel .kl-sharing-info { display:inline; padding:0; border:0; background:transparent; color:inherit; text-decoration:underline; font:inherit; cursor:pointer; }
.kl-settings-quick-row { display: flex; gap: 8px; align-items: center; min-width: 0; padding: 12px 0; }
.kl-settings-quick-row:not(:last-child) { border-bottom: 1px solid var(--kl-border); }
.kl-settings-quick-row > div { display: grid; gap: 4px; flex: 1; min-width: 0; line-height: 1.5; }
.kl-settings-quick-row strong { font-weight: 500; font-size: 12px; overflow-wrap: anywhere; }
.kl-settings-quick-row small { font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--kl-muted); }
.kl-panel[data-platform-preview="true"] .kl-settings-quick-row > .kl-icon-button { flex: none; width: 32px; min-width: 32px; height: 32px; min-height: 32px; padding: 0; }
.kl-settings-group-body > .kl-settings-quick-list + button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 150px; height: 36px; min-height: 36px; padding: 0 12px; margin: 4px 0 12px; white-space: nowrap; font-size: 12px; font-weight: 550; }
.kl-settings-group-body > .kl-settings-quick-list + button .kl-icon { width: 16px; height: 16px; flex: none; }
.kl-settings-quick-dialog { position: fixed; inset: 0; margin: auto; width: min(540px, calc(100vw - 24px)); }
.kl-settings-quick-dialog > .kl-dialog-body { display: grid; gap: 14px; overflow: auto; padding: 16px; }
.kl-settings-quick-dialog label, .kl-settings-panel .kl-settings-away-message { display: grid; gap: 6px; align-content: center; font-size: 12px; }
.kl-settings-quick-dialog :is(input, textarea), .kl-settings-away-message textarea { width: 100%; min-width: 0; }
.kl-settings-quick-dialog textarea, .kl-settings-away-message textarea { resize: vertical; min-height: 72px; max-height: 160px; }
.kl-settings-quick-dialog .kl-setting-tool-buttons { margin: 0; }
@container kl-panel (max-width: 620px) {
  .kl-panel[data-platform-preview="true"] .kl-settings-quick-row > .kl-icon-button { width: 40px; min-width: 40px; height: 40px; min-height: 40px; }
  .kl-settings-group-body > .kl-settings-quick-list + button { height: 40px; min-height: 40px; }
}
.kl-data-extra-tools { display: grid; gap: 20px; min-width: 0; }
.kl-data-about-brand { display: flex; gap: 12px; align-items: center; padding: 16px 0; }
.kl-data-about-brand > div { display: grid; gap: 4px; min-width: 0; }
.kl-data-about-brand strong { font-size: 14px; }
.kl-data-about-brand small { color: var(--kl-muted); font-size: 11px; }
.kl-data-about-emblem { width: 32px; height: 32px; }
.kl-data-about-links { display: flex; flex-wrap: wrap; gap: 16px; padding-bottom: 16px; }
.kl-data-about-links a { display: inline-flex; gap: 4px; align-items: center; color: var(--kl-muted); text-decoration: none; font-size: var(--kl-type-body); }
.kl-data-about-links a:hover { color: var(--kl-text); text-decoration: underline; }
.kl-data-about-links svg { width: 12px; height: 12px; }
.kl-settings-backup-actions, .kl-game-notebook-actions { display: flex; max-width: 52%; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 8px; }
.kl-settings-backup-actions > p { flex-basis: 100%; text-align: right; }
:is(#kikilink-settings-panel-about, #kikilink-settings-panel-players) .kl-settings-group-body .kl-setting-help:empty { display: none; }
:is(#kikilink-settings-panel-about, #kikilink-settings-panel-players) .kl-settings-group-body .kl-setting-row { flex-wrap: nowrap; }
:is(#kikilink-settings-panel-about, #kikilink-settings-panel-players) .kl-settings-group-body .kl-inline-setting-error { width: 100%; }
:is(#kikilink-settings-panel-about, #kikilink-settings-panel-players) .kl-settings-group-body .kl-setting-row:has([aria-invalid=true]) { flex-wrap: wrap; }
:is(#kikilink-settings-panel-about, #kikilink-settings-panel-players) .kl-settings-group-body .kl-text-button { padding-inline: 12px; font-size: var(--kl-type-sm); font-weight: 550; }
.kl-settings-group-body .kl-setting-name[for] { cursor: pointer; }
#kikilink-settings-panel-players .kl-text-button:not(:hover) { background: transparent; }
@container kl-panel (width > 700px) and (height > 500px) {
  #kikilink-settings-panel-players .kl-settings-restore { min-height: 34px; }
}
@container kl-panel (width <= 700px) {
  #kikilink-settings-panel-players .kl-settings-panel-title { align-items: flex-start; }
  #kikilink-settings-panel-players .kl-settings-restore { margin-top: 4px; }
}
.kl-data-clear-body .kl-settings-danger,
#kikilink-settings-panel-about .kl-settings-danger { color: var(--kl-danger); }
#kikilink-settings-panel-about .kl-settings-group-body .kl-number-input { width: 76px; height: 36px; font-size: var(--kl-type-body); padding: 5px 8px; }
#kikilink-settings-panel-about .kl-setting-row > label:not(.kl-switch) { gap: 8px; color: var(--kl-muted); }
@container kl-panel (width <= 620px) {
  :is(#kikilink-settings-panel-about, #kikilink-settings-panel-players) .kl-settings-group-body .kl-text-button { padding-inline: 10px; }
  #kikilink-settings-panel-about .kl-settings-group-body .kl-number-input { width: 65px; height: 40px; }
}
.kl-settings-launcher-size { display: inline-flex; align-items: center; gap: 6px; }
.kl-settings-panel .kl-settings-launcher-size .kl-number-input { width: 78px; min-height: 36px; padding: 5px 8px; }
#kikilink-settings-panel-navigation .kl-setting-action-row { flex-flow: row nowrap; align-items: center; }
#kikilink-settings-panel-navigation .kl-setting-action-row > .kl-setting-copy { flex: 1 1 0; }
#kikilink-settings-panel-navigation .kl-setting-action-row > .kl-inline-actions { width: auto; justify-content: flex-end; }
.kl-position-editor { display: grid; grid-template-rows: minmax(0, 1fr) auto; min-width: 0; min-height: 0; }
.kl-position-fields { display: grid; gap: 15px; min-height: 0; padding: 16px; overflow: auto; overscroll-behavior: contain; }
.kl-position-editor > footer > :first-child { margin-right: auto; }
.kl-position-editor > footer .kl-text-button { min-height: 36px; }
.kl-position-travel { position: absolute; inset: 16px; pointer-events: none; }
.kl-position-travel-window { inset: 24px 32px; }
.kl-position-preview { position: relative; height: 190px; border: 1px solid var(--kl-border); border-radius: 10px; overflow: hidden; background: repeating-linear-gradient(0deg, transparent 0 29px, var(--kl-border) 29px 30px), repeating-linear-gradient(90deg, transparent 0 29px, var(--kl-border) 29px 30px), var(--kl-bg); }
.kl-position-preview > small { position: absolute; top: 8px; left: 8px; color: var(--kl-muted); }
.kl-position-marker { position: absolute; transform: translate(-50%, -50%); width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: var(--kl-accent); color: var(--kl-accent-foreground); }
.kl-position-marker img, .kl-position-marker svg { width: 24px; height: 24px; }
.kl-position-window { width: 64px; height: 48px; border-radius: 6px; }
.kl-position-controls { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.kl-position-controls label { display: grid; gap: 4px; }
.kl-position-controls input { width: 100%; margin: 0; accent-color: var(--kl-accent); }
.kl-position-editor [role=alert]:empty { display: none; }
@media (max-width: 620px) { .kl-position-controls { grid-template-columns: 1fr; gap: 4px; } }
.kl-settings-group-body > .kl-setting-row > .kl-setting-copy {
  display: grid; align-content: center; gap: 4px; flex: 1 1 0;
}
.kl-settings-group-body > .kl-setting-row > .kl-setting-copy > .kl-setting-help { margin: 0; }
.kl-settings-group-body > .kl-setting-row > .kl-select { flex: none; padding: 5px 28px 5px 8px; }
.kl-settings-group-body > :first-child.kl-setting-action-row { border-top: 0; }
.kl-settings-panel .kl-switch,
:host([data-density="super-compact"]) .kl-settings-panel .kl-switch { height: 22px; }
.kl-settings-panel .kl-switch-track,
:host([data-density="super-compact"]) .kl-settings-panel .kl-switch-track { inset: 0; }
.kl-settings-panel .kl-switch::before { inset: -11px -4px; }
.kl-settings-panel .kl-switch input:checked + .kl-switch-track { border-color: color-mix(in srgb, var(--kl-accent), var(--kl-muted) 42%); }
.kl-settings-panel .kl-settings-accent-row { min-inline-size: 0; }
.kl-settings-panel .kl-settings-accent-row .kl-color-swatch:hover { transform: none; background: var(--kl-surface-hover); }
.kl-settings-accent-custom input[type="color"] { padding: 3px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg); cursor: pointer; }
.kl-settings-panel .kl-settings-accent-custom > label { width: auto; flex: 0 1 160px; gap: 4px; }
.kl-settings-panel .kl-setting-row > label.kl-volume-control {
  display: flex; flex: 0 1 auto; align-items: center; gap: 8px; max-width: 100%; font-size: var(--kl-type-body); line-height: 1.5;
}
.kl-settings-panel .kl-volume-control .kl-volume-input { width: 130px; min-width: 50px; max-width: 100%; height: 18px; margin: 2px; padding: 0; border: 1px solid var(--kl-border); border-radius: 8px; }
.kl-settings-panel .kl-volume-control .kl-volume-value { min-width: 34px; color: var(--kl-muted); text-align: right; font-weight: 400; font-variant-numeric: tabular-nums; }
.kl-settings-panel .kl-notification-sound-note { max-width: none; margin: 4px 0 0; color: var(--kl-faint, var(--kl-muted)); font-size: var(--kl-type-xs); line-height: 1.5; }
.kl-settings-alert-groups { display: contents; }
@media (hover: hover) and (pointer: fine) {
  @container kl-panel (min-width: 980px) {
    #kikilink-settings-panel-reactions .kl-settings-panel-body { max-width: none; }
    .kl-settings-alert-groups { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 16px; }
    .kl-settings-alert-groups > :first-child { grid-row: span 2; }
  }
}
.kl-settings-panel .kl-switch input:indeterminate + .kl-switch-track::after { transform: translateX(7px); }
.kl-settings-incoming-sound {
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: 8px;
  min-width: 0; padding: 8px 0;
}
.kl-settings-incoming-sound > svg { width: 16px; height: 16px; color: var(--kl-muted); }
.kl-settings-panel .kl-settings-incoming-sound > .kl-select { width: 100%; max-width: none; }
.kl-settings-panel .kl-settings-incoming-sound > .kl-icon-button { width: 42px; height: 36px; min-height: 36px; padding: 0; }
#kikilink-settings-panel-reactions .kl-sound-choices { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.kl-settings-panel .kl-settings-group-body > .kl-settings-disclosure > summary { min-height: 48px; }
.kl-settings-group-body > .kl-setting-row > .kl-number-input { height: 36px; min-height: 36px; border-radius: 8px; padding: 5px 8px; background: var(--kl-input-bg); }

.kl-account-section.kl-settings-privacy-summary { padding: 0; border: 0; background: transparent; }
.kl-account-body:has(> .kl-privacy-heading) { gap: 12px; }
.kl-account-body > .kl-privacy-heading { margin-bottom: 4px; }
.kl-privacy-heading > h2 { font-family: inherit; }
.kl-privacy-heading > .kl-audit-actions > .kl-text-button--primary { background: var(--kl-accent); }
.kl-settings-privacy-summary .kl-account-section { min-width: 0; }
.kl-privacy-card-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; margin-bottom: 12px; }
.kl-privacy-card-heading h3 { margin: 0; font-size: 13px; font-weight: 650; letter-spacing: -.2px; }
.kl-settings-panel .kl-privacy-card-heading > .kl-text-button { position: relative; flex-shrink: 0; min-height: 0; height: auto; padding: 0; border: 0; background: transparent; font-size: 11px; font-weight: 400; line-height: 1.5; }
.kl-settings-privacy-summary .kl-account-row { flex-wrap: nowrap; min-height: 42px; gap: 12px; padding: 12px 0; }
.kl-settings-privacy-summary .kl-account-row + .kl-account-row { border-top: 0; }
.kl-settings-privacy-summary .kl-account-row:not(:last-child) { border-bottom: 1px solid var(--kl-border); }
.kl-settings-privacy-summary .kl-account-row > div { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.kl-settings-privacy-summary .kl-account-row strong { display: block; font-size: 12px; font-weight: 700; line-height: 1.5; }
.kl-settings-privacy-summary .kl-account-row .kl-setting-help { max-width: none; margin: 4px 0 0; font-size: 11px; line-height: 1.7; }
.kl-settings-privacy-summary .kl-account-row > .kl-account-badge { flex-shrink: 0; max-width: 45%; padding: 2px 6px; border-radius: 4px; text-align: end; white-space: normal; font-size: 10px; line-height: 1.4; }
.kl-privacy-notice { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-surface-2); font-size: 12px; }
.kl-privacy-notice svg { flex: none; width: 16px; height: 16px; }
.kl-privacy-more { min-width: 0; }
.kl-privacy-more summary { cursor: pointer; padding: 10px 0; color: var(--kl-muted); }
.kl-privacy-more > :not(summary) { margin-top: 10px; }
.kl-settings-privacy-summary > .kl-setting-help { margin-block: 6px; }

.kl-content-dialog:is(.kl-settings-privacy-dialog,.kl-local-images-dialog) {
  position: fixed; inset: 0; width: min(540px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); margin: auto; padding: 0;
  grid-template-rows: auto minmax(0, 1fr); border: 1px solid var(--kl-border-strong);
  border-radius: 12px; background: var(--kl-surface);
}
:is(.kl-settings-privacy-dialog,.kl-local-images-dialog) > .kl-dialog-header { min-height: 61px; padding: 12px 16px; background: var(--kl-surface); }
:is(.kl-settings-privacy-dialog,.kl-local-images-dialog) > .kl-dialog-header .kl-dialog-title { font: 650 var(--kl-type-lg)/1.4 var(--kl-font, system-ui); }
:is(.kl-settings-privacy-dialog,.kl-local-images-dialog) > .kl-dialog-header .kl-icon-button { width: 36px; height: 36px; min-height: 36px; padding: 0; }
:is(.kl-settings-privacy-dialog,.kl-local-images-dialog) > .kl-dialog-body { min-height: 0; overflow: hidden; padding: 0; }

.kl-local-image-storage { display: grid; grid-template-rows: minmax(0,1fr) auto; min-height: 0; }
.kl-local-image-fields { display: grid; gap: 12px; min-width: 0; overflow: auto; padding: 16px; }
.kl-local-image-fields > :is(dl,p) { margin: 0; }
.kl-local-image-fields > button { justify-self: start; }
.kl-local-image-storage > footer { justify-content: flex-end; flex-wrap: wrap; }
.kl-local-image-storage > footer > :first-child:not(:last-child) { margin-right: auto; }
.kl-settings-privacy-editor { display: grid; grid-template-rows: minmax(0, 1fr) auto; min-height: 0; min-width: 0; }
.kl-settings-privacy-fields { display: grid; gap: 16px; min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 12px 16px; }
.kl-settings-privacy-fields > fieldset { min-inline-size: 0; margin: 0; padding: 0; border: 0; }
.kl-settings-privacy-fields legend { padding: 0; margin: 0 0 6px; color: var(--kl-text); font-size: var(--kl-type-body); font-weight: 550; }
.kl-settings-privacy-fields .kl-profile-privacy-toggle { min-height: 40px; padding: 10px 0; }
.kl-settings-privacy-fields .kl-profile-privacy-toggle strong { font-weight: 550; }
.kl-settings-privacy-fields .kl-profile-privacy-audiences { gap: 12px; }
.kl-settings-privacy-fields .kl-profile-privacy-audience { font-weight: 550; }
.kl-settings-privacy-fields .kl-profile-privacy-audience .kl-select { width: 100%; max-width: 100%; min-height: 36px; }
.kl-settings-privacy-fields > [role="status"] { margin: 0; }
.kl-settings-privacy-fields > [role="status"]:empty { display: none; }
.kl-settings-privacy-editor > .kl-setting-tool-buttons {
  justify-content: flex-end; align-items: center; min-height: 61px; margin: 0; padding: 10px 16px;
  border-top: 1px solid var(--kl-border); background: var(--kl-input-bg);
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-settings-privacy-dialog > .kl-dialog-header, .kl-settings-privacy-fields, .kl-settings-privacy-editor > .kl-setting-tool-buttons { padding-inline: 12px; }
}
@container kl-panel (width <= 620px) {
  .kl-privacy-heading > .kl-audit-actions { flex: 1 1 190px; }
  .kl-settings-privacy-summary .kl-account-row { align-items: flex-start; gap: 8px; }
  .kl-settings-privacy-summary .kl-account-grid { grid-template-columns: minmax(0, 1fr); }
  .kl-privacy-card-heading > .kl-text-button::before { content: ""; position: absolute; inset: -12px 0; }
  .kl-settings-group-body > .kl-setting-row > .kl-select { max-width: 50%; }
  .kl-settings-group-body > .kl-setting-row > .kl-number-input { width: 65px; height: 40px; min-height: 40px; }
  .kl-settings-privacy-fields .kl-profile-privacy-audiences { grid-template-columns: minmax(0, 1fr); }
  .kl-settings-privacy-fields .kl-profile-privacy-audience .kl-select { min-height: 40px; }
  .kl-settings-panel .kl-settings-incoming-sound > .kl-icon-button { height: 40px; min-height: 40px; }
  #kikilink-settings-panel-reactions .kl-sound-choices { grid-template-columns: minmax(0, 1fr); }
}
`;
