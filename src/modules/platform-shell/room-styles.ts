/** Included only in the isolated platform client. */
export const ROOM_STYLES = `
.kl-rooms-directory { height:100%; min-width:0; min-height:0; display:grid; grid-template-rows:auto auto minmax(0,1fr); overflow:hidden; background:transparent; }
.kl-rooms-directory[hidden], .kl-rooms-panel[hidden] { display:none!important; }
.kl-rooms-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:var(--kl-explore-inset,20px) var(--kl-explore-inset,20px) 16px; overflow:hidden; scrollbar-gutter:stable; scrollbar-width:thin; }
.kl-rooms-heading h1 { flex:1; min-width:0; margin:0; font:700 20px/1.3 var(--kl-font,system-ui); letter-spacing:-.3px; }
.kl-rooms-directory .kl-text-button { display:inline-flex; align-items:center; justify-content:center; gap:8px; font-size:12px; padding:6px 12px; min-height:var(--kl-explore-control,36px); border-radius:var(--kl-explore-radius,8px); white-space:normal; }
.kl-rooms-heading > button > .kl-icon { width:16px; height:16px; }
.kl-rooms-heading > .kl-text-button--primary { font-weight:650; box-shadow:none; border-color:var(--kl-explore-active-border,var(--kl-border)); }
.kl-rooms-heading>.kl-rooms-context{flex:none;width:max(42px,var(--kl-explore-control,36px));height:var(--kl-explore-control,36px);min-height:var(--kl-explore-control,36px);padding:0!important;background:var(--kl-surface-2)}
.kl-rooms-heading>.kl-rooms-context:hover:not(:disabled){background:var(--kl-surface-hover);border-color:var(--kl-border-strong)}
.kl-rooms-heading>.kl-rooms-context[hidden]{display:none}
.kl-rooms-heading .kl-icon,.kl-room-history .kl-icon{stroke-width:1.65}
.kl-rooms-modes { display:flex; overflow-x:auto; gap:20px; margin:0 var(--kl-explore-inset,20px) 12px; border-bottom:1px solid var(--kl-border); background:var(--kl-bg); }
.kl-rooms-modes button { position:relative; flex:none; height:38px; border:0; padding:0 2px 10px; background:transparent; color:var(--kl-muted); font:500 12px var(--kl-font,system-ui); cursor:pointer; }
.kl-rooms-modes button:hover,.kl-rooms-modes button[aria-selected="true"] { color:var(--kl-text); }
.kl-rooms-modes button[aria-selected="true"]::after { content:""; position:absolute; inset:auto 0 0; height:2px; border-radius:2px; background:var(--kl-accent); }
.kl-rooms-directory :focus-visible { outline:2px solid var(--kl-accent); outline-offset:2px; }
.kl-rooms-panel { height:100%; min-width:0; min-height:0; overflow:hidden; }
.kl-panel[data-platform-preview="true"] .kl-rooms-panel .kl-lobbies-panel { padding:0 var(--kl-explore-inset,20px) var(--kl-explore-inset,20px); }
.kl-rooms-directory .kl-sp-heading { padding-top:0; padding-bottom:10px; justify-content:flex-end; }
.kl-room-history { height:100%; overflow:auto; padding:0 var(--kl-explore-inset,20px) var(--kl-explore-inset,20px); box-sizing:border-box; }
.kl-rooms-panel .kl-lobbies-panel,.kl-room-history { scrollbar-width:thin; scrollbar-color:var(--kl-border-strong) transparent; }
.kl-room-history-toolbar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.kl-room-history-toolbar > .kl-browse-search { flex-basis:100%;height:var(--kl-explore-control,36px); }
.kl-room-history .kl-browse-search:has(input:placeholder-shown)>.kl-browse-icon{display:none}
.kl-room-history .kl-browse-search input { flex:1; min-width:0; border:0; color:var(--kl-text); background:transparent; font:inherit; padding:0; }
.kl-room-history .kl-browse-search input:focus-visible { outline:0; }
.kl-room-history .kl-browse-search>.kl-icon{width:15px;height:15px;color:var(--kl-meta)}
.kl-room-history-help, .kl-room-history-status { color:var(--kl-muted); font-size:11px; line-height:1.5; }
.kl-room-history-results { border:1px solid var(--kl-border); border-radius:10px; overflow:hidden; background:var(--kl-surface); }
.kl-room-history-results:has(>.kl-room-history-empty) { border:0; }
.kl-room-history-row { display:flex; gap:12px; align-items:center; padding:14px; border-bottom:1px solid var(--kl-border); }
.kl-room-history-row:last-child { border-bottom:0; }
.kl-room-history-row > .kl-icon { flex:none; width:36px; height:36px; padding:8px; border-radius:9px; color:var(--kl-accent); background:var(--kl-surface-2); }
.kl-room-history-copy { display:grid; gap:5px; min-width:0; flex:1; overflow-wrap:anywhere; }
.kl-room-history-copy strong { font-size:calc(var(--kl-type-body) + 1px); }.kl-room-history-copy small { font-size:var(--kl-type-sm); color:var(--kl-muted); }
.kl-room-history-row > button { flex:none; }
.kl-room-history-empty { display:flex; flex-direction:column; align-items:center; text-align:center; gap:12px; padding:24px 16px; border:1px dashed var(--kl-border); border-radius:10px; background:#11111308; }
.kl-room-history-empty > .kl-icon { width:28px; height:28px; color:var(--kl-muted); }
.kl-room-history-empty h2 { margin:0; font-size:16px; }.kl-room-history-empty p { max-width:340px; margin:0 auto; color:var(--kl-muted); font-size:11px; line-height:1.7; }
.kl-room-history-empty>.kl-text-button{margin-top:4px}
.kl-room-history-loading { display:grid; gap:0; border:1px solid var(--kl-border); border-radius:10px; overflow:hidden; background:var(--kl-surface); }
.kl-room-history-skeleton { display:grid; grid-template-columns:36px minmax(0,1fr); align-items:center; gap:12px; min-height:64px; padding:12px 14px; border-bottom:1px solid var(--kl-border); }
.kl-room-history-skeleton:last-child { border-bottom:0; }.kl-room-history-skeleton-icon,.kl-room-history-skeleton-line { position:relative; overflow:hidden; border-radius:5px; background:var(--kl-surface-2); }.kl-room-history-skeleton-icon { width:36px; height:36px; border-radius:9px; }.kl-room-history-skeleton-copy { display:grid; gap:8px; }.kl-room-history-skeleton-line { width:72%; height:10px; }.kl-room-history-skeleton-line:last-child { width:44%; }.kl-room-history-skeleton-icon::after,.kl-room-history-skeleton-line::after { content:""; position:absolute; inset:0; background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--kl-accent) 7%,transparent),transparent); transform:translateX(-100%); animation:kl-room-history-shimmer 1.7s ease-in-out infinite; }
@keyframes kl-room-history-shimmer { to { transform:translateX(100%); } }
.kl-room-history-actions { display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap; margin-top:20px; }
@container kl-workspace (max-width:650px) {
 .kl-room-history-row { gap:8px; padding:12px 10px; }
 .kl-room-history-row > .kl-icon { width:30px; height:30px; padding:6px; }
}
@media(pointer:coarse) { .kl-rooms-directory .kl-text-button,.kl-rooms-modes button { min-height:44px; } }
@container kl-workspace (max-width:480px) {
 .kl-room-history-toolbar > .kl-browse-search { min-width:min(125px,100%); }
}
@container kl-workspace (width > 560px) and (width <= 900px) and (height <= 400px) {
 .kl-room-history-empty { display:grid; grid-template-columns:28px minmax(0,1fr) auto; column-gap:12px; row-gap:3px; padding:12px 16px; text-align:left; align-items:center; }
 .kl-room-history-empty > .kl-icon { grid-column:1; grid-row:1 / 3; width:24px; height:24px; }.kl-room-history-empty > h2 { grid-column:2; grid-row:1; align-self:end; }.kl-room-history-empty > p { grid-column:2; grid-row:2; max-width:none; margin:0; align-self:start; }.kl-room-history-empty > .kl-text-button { grid-column:3; grid-row:1 / 3; margin:0; }
}
.kl-panel[data-platform-preview="true"] .kl-room-page { --kl-room-inset:20px; --kl-room-control:36px; grid-template-rows:auto minmax(0,1fr); }
.kl-panel[data-platform-preview="true"] .kl-room-subnav { display: none; }
.kl-panel[data-platform-preview="true"] .kl-room-page > .kl-feature-page-header { gap:12px; padding:var(--kl-room-inset) var(--kl-room-inset) 0; border:0; }
.kl-panel[data-platform-preview="true"] .kl-room-page .kl-feature-page-title { margin:0; font:700 20px/1.3 var(--kl-font,system-ui); }
.kl-panel[data-platform-preview="true"] :is(.kl-room-page, .kl-room-current-panel) .kl-text-button {
 display:inline-flex; align-items:center; justify-content:center; gap:8px;
 min-height:var(--kl-room-control); padding:0 12px; border-radius:8px; font-size:12px;
}
.kl-panel[data-platform-preview="true"] .kl-room-page:not([data-room-subview="current"]) .kl-room-page-browse,
.kl-panel[data-platform-preview="true"] .kl-room-page[data-room-subview="current"] .kl-room-page-refresh { display:none; }
:is(.kl-room-page, .kl-room-current-panel) .kl-text-button > .kl-icon { width:16px; height:16px; flex:none; }
:is(.kl-room-page, .kl-room-current-panel) .kl-text-button:not(.kl-text-button--primary) { background:transparent; }
:is(.kl-room-page, .kl-room-current-panel) .kl-text-button:not(.kl-text-button--primary):hover { background:var(--kl-surface-hover); }
.kl-panel[data-platform-preview="true"] .kl-room-current-panel {
 display:block; overflow-y:auto; padding:0 var(--kl-room-inset) 20px;
 scrollbar-width:thin; scrollbar-color:var(--kl-border-strong) transparent;
}
.kl-rooms-panel .kl-room-current-panel { --kl-room-inset:var(--kl-explore-inset,20px); --kl-room-control:var(--kl-explore-control,36px); height:100%; box-sizing:border-box; }
.kl-room-overview { max-width:1040px; margin:0 auto; min-width:0; }
.kl-room-overview-card { padding:16px; border:1px solid var(--kl-border); border-radius:10px; background:var(--kl-surface); }
.kl-room-overview-card h2 { margin:0 0 4px; font:700 16px/1.5 var(--kl-font,system-ui); overflow-wrap:anywhere; }
.kl-room-overview-card[data-empty="true"] {
 display:flex; flex-direction:column; align-items:center; gap:12px;
 padding:32px 16px; border-style:dashed; background:transparent; text-align:center;
}
.kl-room-overview-card[data-empty="true"] > .kl-icon { width:28px; height:28px; margin-bottom:4px; color:var(--kl-muted); }
.kl-room-overview-card[data-empty="true"] > h2 { margin:12px 0; }
.kl-room-overview-card[data-empty="true"] > button { margin-top:4px; }
.kl-room-overview-identity { display: flex; align-items: center; gap: 12px; min-width: 0; }
.kl-room-overview-emblem {
 display:grid; place-items:center; flex:none; width:44px; height:44px; border:1px solid #dd9ba425;
 border-radius:11px; background:#351c22; color:#dd9ba4;
}
.kl-room-overview-emblem > .kl-icon { width:23px; height:23px; }
.kl-room-overview-identity > div { min-width: 0; }
.kl-room-overview-meta,.kl-room-player-meta {
 display:flex; align-items:center; flex-wrap:wrap; gap:4px 12px; color:var(--kl-muted); font-size:11px; line-height:1.5;
}
.kl-room-overview-description { margin:12px 0; color:var(--kl-muted); white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.5; font-size:13px; }
.kl-room-overview-actions, .kl-room-players-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.kl-room-overview-actions { margin-top:16px; }
.kl-room-overview-card > .kl-room-media-note { display:block; margin-top:8px; }
.kl-room-players-heading { margin-top:20px; }
.kl-room-players-heading h2 { flex:1; margin:0; font:700 13px/1.5 var(--kl-font,system-ui); }
.kl-room-overview-players { display: grid; gap: 0; }
.kl-room-player.kl-room-player--compact {
 display:flex; gap:12px; align-items:center; border:0; border-bottom:1px solid var(--kl-border);
 border-radius:0; background:transparent; padding:12px 8px;
}
.kl-room-player.kl-room-player--compact:hover { background:var(--kl-surface-hover); }
.kl-room-player--compact .kl-room-player-copy { flex:1; display:block; min-width:0; }
.kl-room-player--compact .kl-room-player-name {
 display:block; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
 border:0; padding:2px 0; background:transparent; font-size:13px; font-weight:600; text-align:left; cursor:pointer;
}
.kl-room-player--compact .kl-room-player-name:hover { color:var(--kl-accent); }
.kl-room-player--compact .kl-room-player-actions { gap:8px; flex:none; flex-wrap:nowrap; }
.kl-room-player--compact .kl-room-player-avatar-button { display:flex; flex:none; width:auto; height:auto; padding:3px; border-radius:50%; }
.kl-room-player--compact .kl-avatar { width:36px; height:36px; border-radius:50%; }
.kl-room-player--compact .kl-room-player-badges span { padding:0; color:inherit; background:transparent; font-size:inherit; font-weight:inherit; }
.kl-room-player--compact .kl-icon-button { width:32px; height:32px; min-height:32px; border-radius:8px; }
.kl-room-overview-empty { margin:0; padding:16px 8px; color:var(--kl-muted); font-size:12px; }
.kl-room-leave-button:not(:disabled) { color: var(--kl-danger, #f293a5); }
.kl-room-leave-status { margin: 0; color: var(--kl-muted); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.kl-room-leave-status[data-state="error"] { color: var(--kl-danger, #f293a5); }
.kl-room-leave-status[hidden] { display: none; }
.kl-room-leave-dialog, .kl-room-settings-dialog { position: fixed; inset: 0; margin: auto; }
.kl-room-leave-dialog { width: min(540px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); grid-template-rows: auto minmax(0, 1fr) auto; border-radius: 12px; }
.kl-room-leave-dialog .kl-dialog-header { min-height: 61px; padding: 10px 12px; background: transparent; }
.kl-room-leave-heading { flex: 1; min-width: 0; }
.kl-room-leave-heading > span { color: var(--kl-muted); font-size: 9px; line-height: 1; letter-spacing: .09em; text-transform: uppercase; }
.kl-room-leave-dialog h2 { margin: 0; font: 700 16px var(--kl-font, system-ui); }
.kl-room-leave-body { padding: 12px; min-height: 0; overflow-y: auto; overflow-wrap: anywhere; font-size: 12px; }
.kl-room-leave-body > p { margin: 0; }
.kl-room-leave-body > p + p:not([hidden]) { margin-top: 12px; }
.kl-room-leave-footer { display: flex; justify-content: space-between; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--kl-border); }
.kl-panel[data-platform-preview="true"] .kl-lobbies-panel { padding:16px 20px 24px; }
.kl-panel[data-platform-preview="true"] .kl-room-presets-panel { padding:16px var(--kl-room-inset) 20px; scrollbar-width:thin; }
.kl-panel[data-platform-preview="true"] .kl-lobby-search-wrap { width: 100%; }
.kl-panel[data-platform-preview="true"] .kl-lobby-card { border-radius: 10px; padding: 12px; transition: border-color .14s ease; }
.kl-panel[data-platform-preview="true"] .kl-lobby-card:hover { border-color: var(--kl-border-strong); }
.kl-panel[data-platform-preview="true"] .kl-lobby-name { font-size: 13px; }
.kl-panel[data-platform-preview="true"] .kl-lobby-friend-avatar { border-radius: 50%; }
.kl-panel[data-platform-preview="true"] .kl-room-preset-create { align-items: stretch; flex-direction: column; }
.kl-panel[data-platform-preview="true"] .kl-room-preset-create h2 { display: none; }
.kl-panel[data-platform-preview="true"] .kl-room-preset-create-actions { width: 100%; }
.kl-preset-field-heading { display:none; }
@media (hover:hover) and (pointer:fine) {
 @container kl-panel (min-width:901px) {
  .kl-preset-field-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .kl-preset-field-heading label { font-weight:600; }
  .kl-preset-field-heading .kl-text-button { background:transparent; color:var(--kl-muted); }
  .kl-preset-field-heading:has([aria-expanded="false"]) + .kl-setting-help { display:none; }
  .kl-room-preset-create-actions > .kl-preset-name { flex:1; min-width:0; }
  .kl-room-preset-create-actions > .kl-preset-name:not(:focus)::placeholder { color:transparent; }
  .kl-room-preset-create-actions > button { flex:none; white-space:nowrap; }
 }
}
.kl-panel[data-platform-preview="true"] .kl-room-preset-card { border-radius:10px; }
.kl-panel[data-platform-preview="true"] .kl-room-preset-create-actions > input { min-height:var(--kl-room-control); border-radius:8px; }
.kl-panel[data-platform-preview="true"] .kl-room-preset-copy > small { overflow-wrap: anywhere; font-size: 11px; }
.kl-room-settings-dialog { width: min(760px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); grid-template-rows: auto auto auto minmax(0, 1fr); border-radius: 12px; }
.kl-room-settings-dialog .kl-dialog-header { padding: 12px 16px; }
.kl-room-settings-dialog .kl-dialog-header h2 { margin: 0 auto 0 0; font: 700 16px var(--kl-font, system-ui); }
.kl-room-settings-dialog .kl-room-admin-status { padding: 9px 16px; margin: 0; border-radius: 0; font-size: 12px; overflow-wrap: anywhere; }
.kl-room-settings-tabs { display: flex; gap: 4px; padding: 4px 12px; border-bottom: 1px solid var(--kl-border); }
.kl-room-settings-tab { border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--kl-muted); padding: 10px; font: 600 12px var(--kl-font, system-ui); cursor: pointer; }
.kl-room-settings-tab[aria-selected="true"] { color: var(--kl-text); border-color: var(--kl-accent); }
.kl-room-settings-tab:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: -2px; }
.kl-room-settings-body { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 14px 16px; }
.kl-room-settings-panel { min-width: 0; }
.kl-room-settings-panel[hidden] { display: none; }
.kl-room-settings-dialog :is(.kl-room-manager,.kl-room-media,.kl-room-players) { border: 0; padding: 0; border-radius: 0; background: transparent; }
.kl-room-settings-dialog :is(.kl-room-manager,.kl-room-media,.kl-room-players) > h2 { display: none; }
.kl-room-settings-dialog .kl-room-media :is(input:not([type="checkbox"]),select) { min-width: 0; width: 100%; }
.kl-room-settings-dialog .kl-room-player .kl-avatar { border-radius: 50%; }
.kl-room-settings-dialog .kl-room-player-actions { flex-wrap: wrap; }
.kl-room-settings-dialog .kl-room-manager .kl-inline-actions { position: sticky; bottom: -14px; padding: 10px 0; background: var(--kl-panel-bg); z-index: 1; }
@container kl-panel (width <= 1100px) {
 .kl-panel[data-platform-preview="true"] .kl-room-page { --kl-room-inset:16px; }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
 .kl-panel[data-platform-preview="true"] .kl-room-page { --kl-room-inset:12px; --kl-room-control:40px; }
}
@container kl-panel (width <= 560px) {
 .kl-room-overview-card { padding:12px; }
 .kl-room-overview-emblem { width:38px; height:38px; border-radius:10px; }
 .kl-room-player.kl-room-player--compact { gap:8px; padding:12px 0; }
 .kl-room-player--compact .kl-room-player-actions { gap:4px; }
 .kl-room-player--compact .kl-icon-button { width:38px; height:38px; min-height:38px; }
}
@container kl-workspace (max-width:650px) {
 .kl-panel[data-platform-preview="true"] .kl-lobbies-panel { padding:12px 14px 20px; }
}
@media (pointer:coarse) {
 .kl-panel[data-platform-preview="true"] .kl-room-page { --kl-room-control:44px; }
 .kl-room-player--compact .kl-icon-button { width:44px; height:44px; min-height:44px; }
}
@media (max-width: 720px) {
 .kl-room-settings-dialog .kl-room-player { grid-template-columns: 40px minmax(0, 1fr); }
 .kl-room-settings-dialog .kl-room-player-actions { grid-column: 1 / -1; justify-content: flex-start; }
 .kl-room-settings-dialog .kl-setting-row { flex-wrap: wrap; }
 .kl-room-settings-dialog .kl-setting-copy { flex: 1 1 180px; }
}
@media (max-height: 480px) {
 .kl-room-settings-dialog .kl-dialog-header { padding-block: 6px; }
 .kl-room-settings-dialog .kl-room-admin-status { padding-block: 5px; }
 .kl-room-settings-tab { padding-block: 7px; }
}
.kl-rooms-panel .kl-lobby-toolbar { margin-bottom:8px; }
.kl-rooms-panel .kl-lobby-search-wrap { grid-template-columns:minmax(88px,110px) minmax(0,1fr) var(--kl-explore-control,36px); gap:8px; align-items:center; }
.kl-rooms-panel .kl-lobby-search-wrap > .kl-lobby-space { grid-area:1 / 1; height:var(--kl-explore-control,36px); min-height:0; border-radius:var(--kl-explore-radius,8px); background:var(--kl-input-bg); font-size:12px; }
.kl-rooms-panel .kl-lobby-search-wrap > .kl-browse-search { grid-area:1 / 2; min-width:0; height:var(--kl-explore-control,36px); }
.kl-rooms-panel :is(.kl-lobby-search-wrap,.kl-room-history-toolbar) .kl-browse-search > .kl-browse-icon { width:24px; height:24px; min-height:0; padding:4px!important; }
.kl-rooms-panel .kl-lobby-search-wrap input { flex:1; width:0; min-width:0; min-height:0; height:100%; padding:0; border:0; border-radius:0; outline:none; background:transparent; font-size:12px; }
.kl-rooms-panel .kl-browse-search:has(input:placeholder-shown) > .kl-browse-icon { display:none; }
.kl-rooms-panel .kl-lobby-search-wrap > .kl-lobby-refresh { grid-area:1 / 3; }
.kl-rooms-panel .kl-lobby-filters { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:4px; }
.kl-lobby-scopes { display:flex; gap:4px; align-items:center; flex-wrap:wrap; }
.kl-rooms-panel .kl-lobby-scopes .kl-directory-filter { min-height:var(--kl-explore-small,32px); padding:0 9px; border:1px solid transparent; border-radius:var(--kl-explore-radius,8px); background:transparent; color:var(--kl-muted); font-size:11px; font-weight:500; }
.kl-rooms-panel .kl-lobby-scopes .kl-directory-filter:hover { color:var(--kl-text); background:var(--kl-surface-hover); }
.kl-rooms-panel .kl-lobby-scopes .kl-directory-filter[aria-pressed="true"] { color:var(--kl-text); border-color:var(--kl-explore-active-border,var(--kl-accent)); background:var(--kl-explore-active-bg,var(--kl-surface-2)); }
.kl-rooms-panel .kl-room-directory-status { display:flex; min-height:30px; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; margin:0 0 12px; font-size:11px; }
.kl-rooms-panel .kl-room-directory-status > span + span { font-size:10px; }
.kl-rooms-panel .kl-lobby-empty[hidden] { display:none; }
.kl-rooms-panel .kl-current-room-summary { margin:12px 0 0; }
.kl-rooms-panel .kl-lobby-card:is([data-current],[data-has-friends],[data-favorite]) { display:block; min-width:0; padding:12px; border-color:var(--kl-border); border-radius:var(--kl-explore-card-radius,10px); background:var(--kl-surface); box-shadow:none; }
.kl-rooms-panel .kl-lobby-card[data-current="true"], .kl-rooms-panel .kl-lobby-card:hover { border-color:var(--kl-border-strong); }
.kl-rooms-panel .kl-lobby-card .kl-lobby-card-main { display:flex; gap:10px; align-items:center; }
.kl-lobby-emblem { display:grid; flex:none; place-items:center; width:36px; height:36px; border:1px solid var(--kl-border); border-radius:8px; background:color-mix(in srgb,var(--kl-gold) 9%,var(--kl-surface-2)); color:var(--kl-gold); }
.kl-lobby-emblem > .kl-icon { width:18px; height:18px; }
.kl-lobby-copy { min-width:0; flex:1; }
.kl-lobby-copy > .kl-lobby-name { display:block; width:100%; min-height:0; padding:0; border:0; background:transparent; color:var(--kl-text); line-height:1.5; text-align:left; font-weight:650; }
.kl-lobby-copy > .kl-lobby-name:hover { text-decoration:underline; text-decoration-color:var(--kl-gold); text-underline-offset:3px; }
.kl-lobby-preview p { margin:0 0 14px; white-space:pre-wrap; overflow-wrap:anywhere; }
.kl-lobby-preview dl { display:grid; grid-template-columns:auto minmax(0,1fr); gap:8px 16px; margin:0; }
.kl-lobby-preview dt { color:var(--kl-muted); }
.kl-lobby-preview dd { margin:0; overflow-wrap:anywhere; }
.kl-lobby-meta, .kl-lobby-meta .kl-lobby-flags { display:flex; align-items:center; flex-wrap:wrap; gap:3px 10px; color:var(--kl-muted); font-size:11px; line-height:1.5; }
.kl-lobby-meta { margin-top:2px; }
.kl-lobby-meta .kl-lobby-flags > span, .kl-lobby-meta .kl-lobby-current { display:inline-flex; align-items:center; gap:4px; max-width:100%; white-space:normal; overflow-wrap:anywhere; }
.kl-lobby-meta .kl-icon { flex:none; width:12px; height:12px; }
.kl-lobby-meta .kl-lobby-current { min-height:0; padding:0; border:0; border-radius:0; background:transparent; color:var(--kl-accent); font-size:11px; font-weight:550; }
.kl-rooms-panel .kl-lobby-count { padding:0; border-radius:0; background:transparent; color:var(--kl-text); font-size:12px; font-weight:400; font-variant-numeric:tabular-nums; white-space:nowrap; }
.kl-rooms-panel .kl-lobby-count > span { color:var(--kl-muted); }
.kl-rooms-panel .kl-lobby-indicators { --kl-lobby-indicator-size:var(--kl-explore-control,36px); align-self:center; margin-left:0; }
.kl-rooms-panel .kl-lobby-indicators > .kl-lobby-favorite { top:0; width:var(--kl-lobby-indicator-size); height:var(--kl-lobby-indicator-size); padding:0; border:0; border-radius:var(--kl-explore-radius,8px); background:transparent; color:var(--kl-muted); }
.kl-rooms-panel .kl-lobby-indicators > .kl-lobby-favorite[aria-pressed="true"] { color:var(--kl-gold); }
.kl-rooms-panel .kl-lobby-indicators > .kl-lobby-favorite:hover { background:var(--kl-surface-hover); }
.kl-rooms-panel .kl-lobby-indicators > .kl-lobby-favorite[aria-pressed="false"]:hover { color:var(--kl-text); }
.kl-rooms-panel .kl-lobby-description { width:calc(100% - 46px); margin:8px 0 8px 46px; color:var(--kl-muted); font-size:12px; line-height:1.55; white-space:normal; overflow-wrap:anywhere; }
.kl-rooms-panel .kl-current-room-summary .kl-lobby-description { display:block; }
.kl-rooms-panel .kl-lobby-card-footer { display:flex; gap:12px; justify-content:space-between; padding-left:46px; }
.kl-rooms-panel .kl-lobby-card-footer > :is(.kl-lobby-join,.kl-room-manage) { flex:none; min-width:76px; margin-left:auto; padding-block:0; font-weight:550; white-space:nowrap; }
.kl-rooms-panel .kl-lobby-card-footer > .kl-lobby-join { border-color:var(--kl-explore-active-border,var(--kl-border)); font-weight:650; box-shadow:none; }
.kl-rooms-panel .kl-lobby-card-footer > .kl-room-manage { background:transparent; }
.kl-rooms-panel .kl-lobby-card-footer > .kl-room-manage:hover { background:var(--kl-surface-hover); }
.kl-rooms-panel .kl-room-people-button { min-width:0; min-height:var(--kl-explore-control,36px); gap:8px; padding:0; border:0; border-radius:0; font-size:11px; flex-wrap:wrap; }
.kl-rooms-panel .kl-room-people-button:hover { background:transparent; }
.kl-rooms-panel .kl-lobby-friends { gap:0; padding:0; }
.kl-rooms-panel .kl-lobby-friend-profile { display:grid; flex:none; place-items:center; width:var(--kl-explore-control,36px); height:var(--kl-explore-control,36px); padding:4px; border:0; border-radius:50%; background:transparent; }
.kl-rooms-panel .kl-lobby-friend-profile + .kl-lobby-friend-profile { margin-left:-8px; }
.kl-rooms-panel .kl-lobby-friend-profile:focus-visible { position:relative; z-index:1; }
.kl-rooms-panel .kl-lobby-friend-avatar { flex:none; width:28px; height:28px; margin:0; border-color:var(--kl-surface); font-size:10px; }
.kl-rooms-panel .kl-room-people-label { min-width:0; min-height:var(--kl-explore-control,36px); padding:0; border:0; background:transparent; color:var(--kl-muted); font-size:11px; }
.kl-rooms-panel .kl-room-people-label:hover:enabled { color:var(--kl-text); text-decoration:underline; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
 .kl-rooms-panel .kl-lobby-search-wrap { grid-template-columns:96px minmax(0,1fr) var(--kl-explore-control,40px); }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
 .kl-rooms-panel .kl-room-directory-status { margin-bottom:8px; }
}
@container kl-panel (min-width:1150px) { .kl-rooms-panel .kl-lobby-list { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (hover: hover) and (pointer: fine) {
 @container kl-panel (min-width:1150px) {
  .kl-rooms-panel .kl-lobby-list > .kl-lobby-card { display:flex; flex-direction:column; gap:0; }
  .kl-lobby-list .kl-lobby-copy > .kl-lobby-name { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; white-space:normal; overflow-wrap:anywhere; }
  .kl-lobby-list .kl-lobby-card-footer { margin-top:auto; }
 }
}
@container kl-workspace (max-width:520px) {
 .kl-rooms-heading { padding-bottom:16px; }
 .kl-rooms-heading h1 { font-size:20px; }
}
@container kl-panel (width <= 430px) {
 .kl-rooms-panel .kl-lobby-card:is([data-current],[data-has-friends],[data-favorite]) { padding:10px; }
 .kl-rooms-panel .kl-lobby-card .kl-lobby-card-main { gap:8px; }
 .kl-lobby-emblem { display:none; }
 .kl-rooms-panel .kl-lobby-description { width:100%; margin-inline:0; }
 .kl-rooms-panel .kl-lobby-card-footer { padding-left:0; }
}
@media(pointer:coarse) {
 .kl-rooms-heading > .kl-rooms-context { min-width:44px; min-height:44px; }
 .kl-rooms-panel .kl-lobby-search-wrap { grid-template-columns:minmax(72px,96px) minmax(0,1fr) 44px; }
 .kl-rooms-panel .kl-lobby-indicators { --kl-lobby-indicator-size:44px; }
 .kl-rooms-panel .kl-lobby-scopes .kl-directory-filter, .kl-rooms-panel .kl-lobby-card-footer :is(.kl-text-button,.kl-room-people-label) { min-height:44px; }
 .kl-rooms-panel .kl-lobby-friend-profile { width:44px; height:44px; }
}
@media(prefers-reduced-motion:reduce){.kl-panel[data-platform-preview="true"] .kl-lobby-card{transition:none}}
@media(prefers-reduced-motion:reduce){.kl-room-history-skeleton-icon::after,.kl-room-history-skeleton-line::after{animation:none}}

/* The existing device history uses the prototype's compact Space rows. */
.kl-room-history{font-size:12px;line-height:1.5}
.kl-room-history-status{display:flex;align-items:center;gap:12px;margin:12px 0;min-height:16.5px}
@container kl-panel (width<=700px){
 .kl-rooms-heading>.kl-text-button:not(.kl-rooms-context){font-size:11px;padding-inline:10px}
 .kl-rooms-heading>.kl-rooms-context{width:var(--kl-explore-control,40px)}
 .kl-rooms-modes{gap:18px}
 .kl-rooms-modes button{height:40px}
 .kl-room-history-status[data-count-only="true"]{min-height:0}
 .kl-room-history-status[data-count-only="true"]>.kl-room-history-count{display:none}
}
@container kl-panel (width<=700px) or ((width<=900px) and (height<=500px)){
 .kl-rooms-heading{gap:8px}
}
@container kl-panel (width>700px) and (width<=900px) and (height<=500px){
 .kl-rooms-heading{padding-bottom:8px}
 .kl-rooms-modes{margin-bottom:8px}
 .kl-rooms-modes button{height:32px;padding-bottom:6px}
 .kl-room-history-status{margin:8px 0}
}
.kl-room-history-results{padding:16px}
.kl-room-history-results:has(>.kl-room-history-empty){padding:0;background:transparent}
.kl-room-history-results>.kl-room-history-row{min-width:0;gap:12px;padding:12px 0}
.kl-room-history-icon{display:inline-flex;align-items:center;justify-content:center;flex:none;box-sizing:border-box;width:44px;height:44px;border:1px solid var(--kl-border);border-radius:11px;background:#351c22;color:#dd9ba4}
.kl-room-history-icon>.kl-icon{width:23px;height:23px}
.kl-room-history-icon[data-color=rose]{background:#351c22;color:#dd9ba4;border-color:#dd9ba425}
.kl-room-history-icon[data-color=amber]{background:#312b26;color:#caae92;border-color:#caae9225}
.kl-room-history-icon[data-color=sage]{background:#21332f;color:#98bba8;border-color:#98bba825}
.kl-room-history-icon[data-color=blue]{background:#1b2c3b;color:#8fbad6;border-color:#8fbad625}
.kl-room-history-icon[data-color=lavender]{background:#29223d;color:#b09ed8;border-color:#b09ed825}
.kl-room-history-copy{display:block;min-width:0;flex:1}
.kl-room-history-copy>strong{display:block;font-size:12px;line-height:1.4;font-weight:550;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.kl-room-history-copy>small{display:block;margin-top:3px;color:var(--kl-muted);font-size:10px;line-height:1.5}
.kl-rooms-directory .kl-room-history-row>.kl-text-button{font-size:11px;font-weight:550}
.kl-room-history-empty>.kl-icon{margin-bottom:4px}
.kl-room-history-empty h2{font-weight:650;line-height:1.4;letter-spacing:-.2px}
@container kl-panel (width<=700px){
 .kl-room-history-results{padding:14px}
 .kl-room-history-results>.kl-room-history-row{flex-wrap:wrap;gap:6px 10px}
 .kl-room-history-copy{flex-basis:calc(100% - 60px)}
 .kl-room-history-row>.kl-text-button{margin-left:auto}
}
@container kl-panel (width>700px) and (width<=900px) and (height<=500px){.kl-room-history-empty>.kl-icon{margin:0}}
`;
