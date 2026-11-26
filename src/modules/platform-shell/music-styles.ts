const page = '.kl-music-page[data-music-redesign="true"]';
export const MUSIC_STYLES = `
${page} {
  --kl-music-padding: 20px;
  --kl-music-gap: 16px;
  grid-template-rows: auto minmax(0,1fr);
  background: transparent;
}
${page} .kl-feature-page-header { padding: var(--kl-music-padding) var(--kl-music-padding) 0; gap: 12px; border: 0; }
${page} .kl-feature-page-title { margin: 0; font: 700 20px/1.3 var(--kl-font,system-ui); }
${page} .kl-music-heading-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 8px; min-width: 0; }
${page} :is(.kl-music-heading-actions button, .kl-music-open-add) { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 6px 11px; border-radius: 7px; font-size: 12px; white-space: nowrap; }
${page} .kl-music-heading-actions button:not(.kl-text-button--primary) { background: transparent; font-weight: 550; }
${page} .kl-music-open-add { font-weight: 650; }
${page} .kl-music-heading-actions button[hidden] { display: none; }
${page} :is(.kl-music-heading-actions, .kl-music-open-add) .kl-icon { width: 14px; height: 14px; }
${page}[data-cloud-audio="true"] { grid-template-rows: auto minmax(0,1fr) auto; }
${page} > .kl-music-sources { padding: 6px var(--kl-music-padding); border: 0; border-top: 1px solid var(--kl-border); flex-wrap: wrap; }
${page}:has(> .kl-space-session-bar:not([hidden])) > .kl-music-sources { position: sticky; bottom: 0; z-index: 2; background: var(--kl-panel-bg); }
${page} .kl-music-sources > button { padding-inline: 8px; font-size: 12px; }
${page} .kl-music-device-library { grid-template-rows: minmax(0,1fr); }
${page} .kl-music-body { grid-template-columns: minmax(0,1fr) minmax(244px,280px); align-items: start; padding: var(--kl-music-gap) var(--kl-music-padding) var(--kl-music-padding); gap: var(--kl-music-gap); overflow: auto; overscroll-behavior: contain; }
${page} .kl-music-library { min-height: 0; padding: 12px; border-radius: 10px; gap: 0; grid-template-rows: auto auto auto auto; }
${page} .kl-music-playlist-toolbar { grid-row: 2; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: 4px; margin-bottom: 8px; }
${page} .kl-music-playlist-toolbar label > span { display: none; }
${page} .kl-playlist-select { width: 100%; min-width: 0; font-weight: 600; text-overflow: ellipsis; }
${page} :is(.kl-playlist-select,.kl-music-queue-search,.kl-music-session-options select) { height: 36px; min-height: 36px; border-radius: 8px; }
${page} select.kl-playlist-select { height: 37px; }
${page} .kl-music-queue-search { padding-left: 34px; font-size: 12px; }
${page} .kl-music-queue-tools { grid-row: 3; flex-direction: column; align-items: stretch; gap: 12px; }
${page} .kl-music-queue-summary { display: flex; align-items: center; align-self: stretch; min-height: 16px; padding: 0 4px 8px; border-bottom: 1px solid var(--kl-border); margin-bottom: 4px; color: var(--kl-muted); font-size: 11px; }
${page} .kl-music-queue { grid-row: 4; min-height: 0; max-height: none; gap: 2px; overflow: visible; }
${page} .kl-music-track { position: relative; display: flex; gap: 8px; padding: 4px 4px 4px 0; border-radius: 8px; }
${page} .kl-music-track:hover { border-color: transparent; }
${page} .kl-music-track[data-active="true"] { border-color: color-mix(in srgb,var(--kl-accent) 28%,transparent); background: color-mix(in srgb,var(--kl-accent) 9%,var(--kl-surface)); }
${page} .kl-music-track-play { display: flex; flex: 1; align-items: center; gap: 8px; min-width: 0; width: auto; height: auto; padding: 4px; border: 0; border-radius: 8px; background: transparent; color: var(--kl-text); font: inherit; text-align: left; cursor: pointer; }
${page} .kl-music-track-play:disabled { opacity: .6; cursor: default; }
${page} .kl-music-track-number { width: 16px; flex: none; color: var(--kl-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
${page} .kl-music-track-symbol { display: grid; place-items: center; flex: none; width: 30px; height: 30px; border-radius: 8px; background: var(--kl-surface-2); color: var(--kl-muted); }
${page} .kl-music-track-symbol svg { width: 15px; height: 15px; }
${page} :is(.kl-music-track-symbol,.kl-music-controls) :is([data-icon="play"],[data-icon="pause"],[data-icon="previous"],[data-icon="next"]) .kl-icon-fill { fill: currentColor; }
${page} .kl-music-track[data-active="true"] .kl-music-track-symbol { color: var(--kl-accent); }
${page} .kl-music-track-copy { gap: 4px; }
${page} .kl-music-track-copy strong { font-size: 13px; font-weight: 550; line-height: 1.3; }
${page} .kl-music-track-copy span { font-size: 11px; line-height: 1.2; }
${page} .kl-music-track-duration { flex: none; color: var(--kl-muted); font-size: 11px; font-variant-numeric: tabular-nums; white-space: nowrap; }
${page} :is(.kl-music-queue-summary,.kl-music-track-duration,.kl-music-track-number) { line-height: 1.55; }
${page} .kl-music-track-number { text-align: center; }
${page} .kl-music-playlist-menu { align-self: center; }
${page} :is(.kl-music-playlist-menu,.kl-music-track-menu) > summary { display: grid; place-items: center; width: 32px; height: 32px; min-height: 32px; padding: 0; border-color: transparent; border-radius: 8px; background: transparent; color: var(--kl-muted); }
${page} :is(.kl-music-playlist-menu,.kl-music-track-menu) > summary:hover, ${page} :is(.kl-music-playlist-menu,.kl-music-track-menu)[open] > summary { background: var(--kl-surface-hover); color: var(--kl-text); }
${page} .kl-music-playlist-menu:not([open]) > .kl-music-playlist-actions, ${page} .kl-music-track-menu:not([open]) > .kl-music-track-menu-popover { display: none; }
${page} :is(.kl-music-playlist-actions, .kl-music-track-menu-popover) { max-height: var(--kl-music-menu-height, 65dvh); overflow-y: auto; overscroll-behavior: contain; }
${page} details[data-open-above] > :is(.kl-music-playlist-actions, .kl-music-track-menu-popover) { top: auto; bottom: calc(100% + 6px); }
${page} .kl-music-now-card { position: sticky; top: 0; min-width: 0; grid-template-columns: minmax(0,1fr); justify-items: stretch; overflow: visible; padding: 16px; border-radius: 10px; gap: 12px; background: var(--kl-surface); }
${page} .kl-music-now-card::before { display: none; }
${page} .kl-music-current { display: flex; align-items: center; gap: 12px; min-width: 0; }
${page} .kl-music-artwork { flex: none; width: 64px; height: 64px; border-color: var(--kl-border-strong); background: repeating-radial-gradient(circle,var(--kl-surface-2) 0 2px,var(--kl-surface) 3px 5px); box-shadow: none; color: var(--kl-accent); }
${page} .kl-music-artwork[data-playing="true"] { animation: none; }
${page} .kl-music-artwork-center { width: 32px; height: 32px; border: 0; background: var(--kl-surface); color: inherit; }
${page} .kl-music-artwork-center .kl-icon { width: 24px; height: 24px; }
${page} .kl-music-now-card-copy { flex: 1; width: auto; gap: 4px; text-align: left; }
${page} .kl-music-now-card-copy .kl-music-now-title { font: 700 14px/1.4 var(--kl-font,system-ui); }
${page} .kl-music-now-source { color: var(--kl-muted); font-size: 11px; line-height: 1.4; white-space: normal; overflow-wrap: anywhere; }
${page} .kl-music-seek { display: flex; align-items: center; gap: 8px; }
${page} .kl-music-time { min-width: 28px; flex: none; color: var(--kl-muted); font-size: 11px; }
${page} .kl-music-time:last-child { text-align: right; }
${page} .kl-music-now-card input[type="range"] { width: 100%; min-width: 0; height: 28px; min-height: 28px; margin: 0; padding: 0; background: transparent; accent-color: var(--kl-accent); cursor: pointer; }
${page} .kl-music-seek input[type="range"] { margin-block: 2px; }
${page} .kl-music-controls { justify-content: center; flex-wrap: nowrap; gap: 4px; min-width: 0; }
${page} .kl-music-now-card .kl-icon-button { flex: none; width: 36px; min-width: 36px; height: 36px; min-height: 36px; padding: 0; border-radius: 8px; }
${page} .kl-music-now-card .kl-icon-button:not(.kl-music-play) { border-color: transparent; background: transparent; color: var(--kl-muted); }
${page} .kl-music-now-card .kl-icon-button:not(.kl-music-play):hover { background: var(--kl-surface-hover); color: var(--kl-text); }
${page} .kl-music-now-card .kl-icon-button .kl-icon { width: 17px; height: 17px; }
${page} .kl-music-now-card .kl-music-play { width: 40px; height: 40px; border-color: transparent; background: var(--kl-accent); color: var(--kl-accent-foreground); }
${page} .kl-music-now-card .kl-music-play:hover { background: var(--kl-accent-hover,var(--kl-accent)); }
${page} .kl-music-now-card .kl-music-mode[data-active="true"] { border-color: transparent; background: color-mix(in srgb,var(--kl-accent) 12%,transparent); color: var(--kl-accent); }
${page} .kl-music-mode[data-repeat="one"] { position: relative; }
${page} .kl-music-mode[data-repeat="one"]::after { content: "1"; position: absolute; inset: 12px 0 auto; width: 8px; margin-inline: auto; background: var(--kl-surface); font-size: 8px; line-height: 10px; text-align: center; }
${page} .kl-music-volume { display: flex; align-items: center; gap: 4px; min-width: 0; }
${page} .kl-music-volume input[type="range"] { width: 80px; flex: 1; }
${page} .kl-music-volume-value { min-width: 30px; color: var(--kl-muted); font-size: 11px; text-align: right; font-variant-numeric: tabular-nums; }
${page} .kl-music-session-options { grid-template-columns: repeat(2,minmax(0,1fr)); padding-top: 12px; border-top: 1px solid var(--kl-border); }
${page} .kl-music-session-options label { min-width: 0; gap: 4px; color: var(--kl-muted); font-size: 11px; font-weight: 400; line-height: 1.55; }
${page} .kl-music-session-options select { width: 100%; min-width: 0; padding-inline: 8px; font-size: 12px; }
${page} .kl-music-up-next { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 11px; line-height: 1.4; }
${page} .kl-music-up-next[hidden], ${page} .kl-music-sleep-status:empty { display: none; }
${page} .kl-music-up-next span { color: var(--kl-muted); white-space: nowrap; }
${page} .kl-music-up-next strong { overflow: hidden; font-weight: 500; white-space: nowrap; text-overflow: ellipsis; }
${page} .kl-music-sleep-status { text-align: left; }
${page} .kl-music-empty { display: grid; justify-items: center; align-content: center; gap: 12px; min-height: 180px; padding: 24px 12px; text-align: center; }
${page} .kl-music-empty > svg { width: 28px; height: 28px; color: var(--kl-muted); }
${page} .kl-music-empty h2 { margin: 0; font: 700 14px/1.4 var(--kl-font,system-ui); }
.kl-music-library-status { padding: 8px; color: var(--kl-muted); font-size: 12px; overflow-wrap: anywhere; }
.kl-music-dialog { width: min(540px,calc(100vw - 24px)); max-height: calc(100dvh - 24px); padding: 0; border-radius: 12px; }
.kl-music-dialog[open] { display: grid; grid-template-rows: auto minmax(0,1fr); }
.kl-music-dialog .kl-dialog-title { margin: 0; font: 700 16px var(--kl-font,system-ui); }
.kl-music-dialog .kl-dialog-header { padding: 12px 16px; }
.kl-music-dialog .kl-dialog-header > button { margin-left: auto; }
.kl-music-dialog .kl-dialog-body { padding: 16px; min-height: 0; overflow: auto; }
.kl-music-editor-dialog .kl-dialog-header { min-height: 61px; }
.kl-music-editor-dialog .kl-dialog-body { padding: 0; overflow: hidden; }
.kl-music-dialog .kl-music-add { padding: 0; border: 0; background: transparent; }
.kl-music-dialog :is(input,select) { min-width: 0; width: 100%; }
.kl-music-form { display: grid; min-height: 0; grid-template-rows: minmax(0,1fr) auto; }
.kl-music-form-fields { display: grid; align-content: start; gap: 8px; min-height: 0; overflow: auto; padding: 16px; }
.kl-music-form label { display: grid; gap: 8px; margin-top: 8px; font-size: 12px; font-weight: 600; }
.kl-music-form label :is(input,select) { min-height: 36px; height: 36px; border-radius: 7px; }
.kl-music-form p { margin: 0; overflow-wrap: anywhere; line-height: 1.5; }
.kl-music-form-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; min-height: 61px; padding: 10px 16px; border-top: 1px solid var(--kl-border); background: var(--kl-surface); }
.kl-music-form-actions > button { min-height: 38px; border-radius: 7px; }
.kl-music-form-actions > button:first-child { background: transparent; }
.kl-music-form-error { color: var(--kl-danger); font-size: 12px; }
.kl-music-import-cancel { display: none; }
.kl-music-add:has(.kl-text-button--primary:disabled) .kl-music-import-cancel { display: block; }
@container kl-panel (max-width:1100px) {
 ${page} { --kl-music-padding: 16px; --kl-music-gap: 12px; }
 ${page} .kl-music-body { grid-template-columns: minmax(0,1fr) 244px; }
 ${page} .kl-music-now-card { padding: 12px; gap: 8px; }
 ${page} .kl-music-track-number { display: none; }
}
@container kl-panel (max-width:760px) {
 ${page} { --kl-music-padding: 12px; }
 ${page} .kl-music-heading-actions { gap: 4px; }
 ${page} :is(.kl-music-heading-actions button, .kl-music-open-add) { min-height: 40px; padding-inline: 8px; }
 ${page} :is(.kl-playlist-select,.kl-music-queue-search,.kl-music-session-options select) { height: 40px; min-height: 40px; }
 ${page} .kl-music-body { grid-template-columns: minmax(0,1fr); grid-template-rows: max-content max-content; align-content: start; }
 ${page} .kl-music-library { grid-row: 2; }
 ${page} .kl-music-now-card { position: static; grid-row: 1; grid-template-columns: minmax(0,1fr) auto; gap: 8px 12px; }
 ${page} .kl-music-artwork { width: 44px; height: 44px; }
 ${page} .kl-music-now-card > :is(.kl-music-current,.kl-music-seek,.kl-music-session-options,.kl-music-sleep-status,.kl-music-up-next) { grid-column: 1 / -1; }
 ${page} .kl-music-controls { justify-content: flex-start; }
 ${page} .kl-music-volume { max-width: 132px; }
 ${page} .kl-music-volume-value { display: none; }
 ${page} .kl-music-session-options { padding-top: 8px; }
 ${page} .kl-music-track-number { display: block; }
 ${page} :is(.kl-music-playlist-menu,.kl-music-track-menu) > summary { width: 36px; height: 36px; min-height: 36px; }
 ${page} .kl-music-playlist-menu > summary { width: 40px; height: 40px; }
 ${page} .kl-music-track-menu-popover :is(button,a) { min-height: 40px; }
}
@container kl-panel (max-width:420px) {
 ${page} .kl-feature-page-title { font-size: 19px; }
 ${page} .kl-music-now-card { gap: 8px; }
 ${page} .kl-music-volume { max-width: 84px; }
 ${page} .kl-music-now-card .kl-music-volume > .kl-icon-button { width: 32px; min-width: 32px; }
 ${page} .kl-music-controls { gap: 2px; }
 ${page} .kl-music-now-card .kl-icon-button { width: 34px; min-width: 34px; }
 ${page} .kl-music-now-card .kl-music-play { width: 40px; }
 ${page} .kl-music-track { gap: 4px; }
 ${page} .kl-music-track-number { display: none; }
}
@container kl-panel (max-width:330px) {
 ${page} .kl-music-now-card > .kl-music-volume { grid-column: 1/-1; max-width: none; }
}
@container kl-panel (width > 760px) and (height <= 500px) {
 ${page} { --kl-music-padding: 12px; --kl-music-gap: 8px; }
 ${page} .kl-feature-page-title { font-size: 18px; }
 ${page} .kl-music-body { grid-template-columns: minmax(0,1fr); grid-template-rows: max-content max-content; align-content: start; }
 ${page} .kl-music-library { grid-row: 2; }
 ${page} .kl-music-now-card { position: static; grid-row: 1; grid-template-columns: minmax(0,1fr) 210px; gap: 4px 16px; padding: 8px; }
 ${page} .kl-music-artwork { width: 36px; height: 36px; }
 ${page} .kl-music-now-card-copy .kl-music-now-title { font-size: 13px; }
 ${page} .kl-music-seek { grid-column: 1; grid-row: 2; }
 ${page} .kl-music-controls { grid-column: 2; grid-row: 1; }
 ${page} .kl-music-session-options { grid-column: 1/-1; padding-top: 4px; }
 ${page} .kl-music-session-options label { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
 ${page} .kl-music-session-options select { flex: 1; }
 ${page} .kl-music-up-next { display: none; }
 ${page} .kl-music-sleep-status { grid-column: 1/-1; }
 ${page} .kl-music-track-play { padding-block: 2px; }
}

.kl-music-sessions { min-width:0; padding:16px; overflow-wrap:anywhere; }
.kl-music-sessions[hidden] { display:none!important; }
.kl-music-session-header,.kl-music-session-actions { display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
.kl-music-session-header { justify-content:space-between; }
.kl-music-session-note { color:var(--kl-muted,#a9a0b1);font-size:12px;line-height:1.5;margin:8px 0; }
.kl-music-session-card,.kl-music-session-pending { border:1px solid var(--kl-border,#463547);border-radius:12px;padding:14px;margin-top:12px; }
.kl-music-session-volume,.kl-music-session-seek { display:flex;gap:8px;align-items:center;flex-wrap:wrap;min-width:0;margin:12px 0; }
.kl-music-session-seek input { flex:1;min-width:90px;max-width:100%; }
.kl-music-session-volume input { width:100px; }
.kl-music-session-queue { padding-left:22px; }
.kl-music-session-queue li { padding:8px 0; }
.kl-music-session-queue li>span { margin-right:8px; }
.kl-music-session-dialog { box-sizing:border-box;max-height:calc(100dvh - 24px);width:min(680px,calc(100vw - 24px));max-width:calc(100vw - 24px);overflow:auto;border:1px solid var(--kl-border,#463547);border-radius:14px;background:var(--kl-panel,#151216);color:var(--kl-text,#eee7ed);padding:20px; }
.kl-music-session-dialog::backdrop { background:#0009; }
.kl-music-session-dialog fieldset { display:grid;gap:8px;max-height:260px;overflow:auto;margin:12px 0; }
.kl-music-session-dialog label { display:flex;align-items:center;gap:8px; }
.kl-music-session-dialog select { min-width:0;max-width:100%; }
.kl-music-session-dialog pre { white-space:pre-wrap;overflow-wrap:anywhere; }
.kl-music-session-dialog button { margin:4px; }
@container kl-workspace (max-width:600px){.kl-music-sessions{padding:10px}.kl-music-session-header{align-items:flex-start}}
@media(max-width:600px){.kl-music-session-dialog{padding:14px}}
`;
