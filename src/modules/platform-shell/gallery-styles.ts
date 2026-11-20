/** Gallery and explicit image viewing in the isolated platform client. */
export const GALLERY_STYLES = `
.kl-panel[data-platform-preview="true"] .kl-gallery-page {
 --kl-gallery-inset: 20px;
 --kl-gallery-control: 36px;
 grid-template-rows: auto auto auto minmax(0,1fr);
 background: transparent;
}
.kl-panel[data-platform-preview="true"] .kl-gallery-page .kl-feature-page-header { padding: var(--kl-gallery-inset) var(--kl-gallery-inset) 0; border: 0; background: transparent; }
.kl-panel[data-platform-preview="true"] .kl-gallery-page .kl-feature-page-title { margin: 0; font: 700 20px/1.3 var(--kl-font,system-ui); letter-spacing: -.3px; }
.kl-gallery-page .kl-feature-page-subtitle { margin: 4px 0 0; color: var(--kl-muted); font-size: 11px; }
.kl-gallery-page .kl-gallery-header-actions { width: auto; }
.kl-gallery-page .kl-gallery-header-actions .kl-text-button { display: inline-flex; align-items: center; gap: 6px; min-height: var(--kl-gallery-control); padding: 6px 10px; border-radius: 8px; font-size: 12px; }
.kl-gallery-header-actions .kl-icon { width: 14px; height: 14px; flex: none; }
.kl-gallery-toolbar { grid-row: 2; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 16px var(--kl-gallery-inset) 12px; }
.kl-gallery-search { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1 1 180px; height: var(--kl-gallery-control); padding-inline: 10px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg); color: var(--kl-muted); }
.kl-gallery-search:focus-within { border-color: var(--kl-accent); }
.kl-gallery-search .kl-icon { width: 16px; height: 16px; flex: none; }
.kl-gallery-search .kl-input { width: 100%; min-width: 0; height: 100%; min-height: 0; padding: 0; border: 0; border-radius: 0; outline: 0; background: transparent; color: var(--kl-text); font-size: 12px; box-shadow: none; }
.kl-gallery-toolbar select { width: auto; min-width: 0; height: var(--kl-gallery-control); min-height: var(--kl-gallery-control); padding: 0 10px; border-radius: 8px; font-size: 12px; }
.kl-gallery-status { grid-row: 3; display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 0 var(--kl-gallery-inset) 12px; padding: 8px 10px; border: 1px solid var(--kl-border); border-radius: 8px; color: var(--kl-muted); font-size: 12px; overflow-wrap: anywhere; }
.kl-gallery-status[hidden] { display: none; }
.kl-panel[data-platform-preview="true"] .kl-gallery-grid { grid-row: 4; grid-auto-rows: max-content; padding: 0 var(--kl-gallery-inset) var(--kl-gallery-inset); grid-template-columns: repeat(auto-fill,minmax(min(240px,100%),1fr)); gap: 12px; scrollbar-width: thin; }
.kl-panel[data-platform-preview="true"] .kl-gallery-item { display: block; align-self: start; padding: 0; border-radius: 8px; overflow: hidden; background: var(--kl-input-bg); }
.kl-panel[data-platform-preview="true"] .kl-gallery-item .kl-image-card { border: 0; border-bottom: 1px solid var(--kl-border); border-radius: 0; }
.kl-panel[data-platform-preview="true"] .kl-gallery-item .kl-image-preview { height: 160px; min-height: 160px; background: var(--kl-surface-2); }
.kl-panel[data-platform-preview="true"] .kl-gallery-item .kl-image-preview img { height: 100%; width: 100%; object-fit: contain; }
.kl-panel[data-platform-preview="true"] .kl-gallery-meta { display: grid; grid-template-columns: minmax(0,1fr) 32px; column-gap: 8px; padding: 8px 10px; align-items: center; }
.kl-panel[data-platform-preview="true"] .kl-gallery-meta > strong { color: var(--kl-text); font-size: 12px; text-transform: none; }
.kl-panel[data-platform-preview="true"] .kl-gallery-meta > span { grid-column: 1; font-size: 11px; }
.kl-gallery-more { grid-column: 2; grid-row: 1 / 3; width: 32px; height: 32px; min-height: 32px; border-radius: 8px; }
.kl-panel[data-platform-preview="true"] .kl-gallery-actions { padding: 0 10px 10px; }
.kl-panel[data-platform-preview="true"] .kl-gallery-actions[hidden] { display: none; }
.kl-gallery-actions .kl-text-button { min-height: 32px; padding: 4px 8px; border-radius: 8px; font-size: 11px; }
.kl-gallery-grid .kl-gallery-empty { justify-self: stretch; padding: 24px 16px; }
.kl-gallery-grid .kl-gallery-empty > .kl-icon { width: 32px; height: 32px; }
.kl-gallery-grid .kl-gallery-empty > strong { color: var(--kl-text); font-size: 16px; }
.kl-image-view { padding: 2px 4px; font: inherit; border: 0; background: transparent; color: var(--kl-gold); cursor: pointer; }
.kl-image-view:focus-visible { outline: 2px solid var(--kl-accent); }

.kl-dialog.kl-gallery-remove-dialog, .kl-dialog.kl-media-viewer {
 position: fixed; inset: 0; margin: auto; max-height: calc(100dvh - 24px);
 border: 1px solid var(--kl-border-strong); border-radius: 12px; background: var(--kl-panel-bg);
}
.kl-dialog.kl-gallery-remove-dialog::backdrop, .kl-dialog.kl-media-viewer::backdrop { background: #030303b8; }
.kl-dialog.kl-gallery-remove-dialog { width: min(540px,calc(100vw - 24px)); }
.kl-dialog.kl-media-viewer { width: min(860px,calc(100vw - 24px)); grid-template-rows: auto minmax(0,auto) auto auto; }
.kl-dialog.kl-media-viewer:not([data-presentation="space-album"]) { grid-template-rows: auto minmax(0,1fr) auto auto; }
:is(.kl-gallery-remove-dialog,.kl-media-viewer) h2 { margin: 0 auto 0 0; font: 700 16px/1.4 var(--kl-font,system-ui); overflow-wrap: anywhere; }
:is(.kl-gallery-remove-dialog,.kl-media-viewer) .kl-dialog-header { min-height: 61px; padding: 12px 16px; background: transparent; }
:is(.kl-gallery-remove-dialog,.kl-media-viewer) .kl-dialog-header .kl-icon-button { flex: none; width: 34px; height: 34px; min-height: 34px; padding: 7px; }
.kl-gallery-remove-dialog .kl-dialog-body { gap: 8px; padding: 16px; overflow-wrap: anywhere; font-size: 12px; }
.kl-gallery-remove-dialog .kl-dialog-body p { margin: 0; }
.kl-gallery-remove-dialog .kl-dialog-actions { min-height: 61px; justify-content: space-between; padding: 12px 16px; }
.kl-gallery-action-error, .kl-gallery-compose-error { color: var(--kl-danger,#f293a5); font-size: 12px; line-height: 1.5; }
.kl-gallery-action-error:empty, .kl-gallery-compose-error[hidden] { display: none; }
.kl-media-viewer-kicker { display: block; color: var(--kl-muted); font-size: 9px; line-height: 1; letter-spacing: .09em; text-transform: uppercase; }
.kl-media-viewer-stage { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; min-width: 0; min-height: 0; overflow: auto; padding: 12px; text-align: center; }
.kl-media-viewer-stage p { max-width: 600px; overflow-wrap: anywhere; }
.kl-media-viewer-stage img { display: block; min-width: 0; min-height: 0; max-width: 100%; max-height: calc(100dvh - 240px); width: 100%; height: auto; object-fit: contain; border-radius: 6px; background: var(--kl-bg); }
.kl-media-viewer:not([data-presentation="space-album"]) .kl-media-viewer-stage:not([data-actual="true"]) img { max-height: calc(var(--kl-dialog-viewport-height,100dvh) - 240px); }
.kl-media-viewer-stage[data-actual="true"] { display: block; overflow: auto; }
.kl-media-viewer-stage[data-actual="true"] img { width: auto; height: auto; max-width: none; max-height: none; }
.kl-media-viewer-detail { margin: 0; padding: 0 12px 12px; color: var(--kl-muted); font-size: 10px; overflow-wrap: anywhere; }
.kl-media-viewer-footer { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-height: 57px; padding: 10px 12px; border-top: 1px solid var(--kl-border); background: var(--kl-input-bg); }
.kl-media-viewer-nav { display: flex; align-items: center; justify-content: space-between; flex: 1 1 220px; min-width: 0; gap: 8px; color: var(--kl-muted); font-size: 11px; }
.kl-media-viewer-nav > span { flex: 1; text-align: center; }
.kl-media-viewer-nav .kl-text-button, .kl-media-viewer-footer > .kl-text-button { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 6px 9px; border-radius: 8px; font-size: 12px; }
.kl-media-viewer-nav .kl-icon { width: 14px; height: 14px; }
.kl-media-viewer-footer a[hidden] { display: none; }
.kl-cloud-full-image { display: block; padding: 0; border: 0; background: transparent; cursor: zoom-in; max-width: 100%; }
.kl-cloud-full-image:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: -2px; }

@container kl-panel (max-width: 1100px) { .kl-panel[data-platform-preview="true"] .kl-gallery-page { --kl-gallery-inset: 16px; } }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
 .kl-panel[data-platform-preview="true"] .kl-gallery-page { --kl-gallery-inset: 12px; --kl-gallery-control: 40px; }
 .kl-gallery-toolbar { padding-top: 12px; }
}
@container kl-workspace (max-width: 520px) {
 .kl-panel[data-platform-preview="true"] .kl-gallery-page .kl-feature-page-header { gap: 8px; flex-wrap: wrap; }
 .kl-panel[data-platform-preview="true"] .kl-gallery-page .kl-feature-page-heading { flex: 1 0 80px; }
 .kl-gallery-search { flex-basis: 100%; }
 .kl-gallery-toolbar select { flex: 1; }
}
@media (max-width: 520px) {
 .kl-media-viewer-nav { flex-basis: 100%; }
 .kl-media-viewer-footer { gap: 6px; }
 .kl-media-viewer-footer > :last-child { margin-inline-start: auto; }
 .kl-media-viewer-footer a { font-size: 11px; }
}
@media (max-height: 500px) {
 .kl-media-viewer .kl-dialog-header { min-height: 48px; padding: 8px 12px; }
 .kl-media-viewer-footer, .kl-media-viewer-stage { padding: 8px 12px; }
 .kl-media-viewer-stage img { max-height: calc(100dvh - 160px); }
 .kl-media-viewer:not([data-presentation="space-album"]) .kl-media-viewer-stage:not([data-actual="true"]) img { max-height: calc(var(--kl-dialog-viewport-height,100dvh) - 160px); }
 .kl-media-viewer-detail { padding-bottom: 8px; }
}
@media (pointer: coarse) {
 .kl-panel[data-platform-preview="true"] .kl-gallery-page { --kl-gallery-control: 44px; }
 .kl-gallery-more, .kl-gallery-actions .kl-text-button, .kl-media-viewer-footer .kl-text-button { min-height: 44px; }
 .kl-gallery-more { min-width: 44px; }
 .kl-panel[data-platform-preview="true"] .kl-gallery-meta { grid-template-columns: minmax(0,1fr) 44px; }
}
`;
