/** Game Players uses the directory layout while sharing the live roster and editors. */
export const PLAYERS_STYLES = `
.kl-content-dialog.kl-player-editor-dialog {
  --kl-editor-pad: 16px;
  --kl-editor-bar-pad: 12px 16px;
  --kl-editor-button: 36px;
  --kl-editor-icon: 32px;
  --kl-editor-input-font: 12px;
  width: 540px; border-radius: 12px; background: var(--kl-surface);
}
.kl-player-editor-dialog > .kl-dialog-header { min-height: 0; gap: 12px; padding: var(--kl-editor-bar-pad); background: var(--kl-surface); }
.kl-player-editor-dialog .kl-dialog-title { min-width: 0; font: 700 16px/1.4 var(--kl-font,system-ui); overflow-wrap: anywhere; }
.kl-player-editor-dialog .kl-dialog-title::before { display: block; content: 'KIKILINK'; color: var(--kl-meta); font: 400 10px/1.7 var(--kl-font,system-ui); letter-spacing: .25px; }
.kl-player-editor-dialog .kl-dialog-header > button { flex: none; width: var(--kl-editor-icon); height: var(--kl-editor-icon); min-width: 0; min-height: 0; padding: 0; border: 0; border-radius: 8px; background: transparent; }
.kl-player-editor-dialog > .kl-dialog-body { display: block; min-height: 0; padding: 0; overflow-y: auto; }
.kl-player-notebook-editor { font: 400 12px/1.5 var(--kl-font,system-ui); }
.kl-player-editor-field { display: grid; gap: 6px; padding: var(--kl-editor-pad); }
.kl-player-editor-field > span { font-weight: 600; }
.kl-player-editor-field :is(input,textarea) { width: 100%; box-sizing: border-box; color: var(--kl-text); background: var(--kl-input-bg); border: 1px solid var(--kl-border); border-radius: 8px; padding: 8px 10px; font: 400 var(--kl-editor-input-font)/1.5 var(--kl-font,system-ui); }
.kl-player-editor-field input { min-height: var(--kl-editor-button); }
.kl-player-editor-field textarea { resize: vertical; line-height: 1.6; }
.kl-player-editor-hint { color: var(--kl-muted); font-size: 10px; }
.kl-player-editor-field:has(textarea) .kl-player-editor-hint { text-align: right; font-size: 11px; }
.kl-player-notebook-editor .kl-cloud-status:empty, .kl-player-notebook-editor [hidden] { display: none; }
.kl-player-notebook-editor .kl-cloud-status:not(:empty), .kl-player-editor-discard { margin: 0; padding: var(--kl-editor-pad); }
.kl-player-editor-discard { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.kl-player-notebook-editor > .kl-dialog-actions { min-height: 0; gap: 8px; flex-wrap: wrap; padding: var(--kl-editor-bar-pad); background: var(--kl-input-bg); }
.kl-player-notebook-editor > .kl-dialog-actions button { min-height: var(--kl-editor-button); padding: 0 12px; border-radius: 8px; font: 550 12px/1.5 var(--kl-font,system-ui); }
.kl-player-notebook-editor > .kl-dialog-actions button:first-child { margin-right: auto; background: transparent; }
.kl-player-editor-dialog[data-player-editor-compact="true"] { --kl-editor-pad: 12px; --kl-editor-bar-pad: 10px 12px; --kl-editor-icon: 40px; --kl-editor-button: 40px; --kl-editor-input-font: 16px; }

.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] {
 --kl-players-inset: 20px;
 --kl-players-control: 36px;
 --kl-players-small: 32px;
 width: 100%; max-width: calc(1040px + 2 * var(--kl-players-inset)); margin: 0 auto; background: transparent;
}
.kl-panel[data-platform-preview="true"] .kl-players-room { display: none; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-players-room { display: inline-flex; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] :is(.kl-people-new-chat,.kl-people-add,.kl-people-refresh),
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"][data-detail="false"] > .kl-feature-page-footer { display: none; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] > .kl-feature-page-header {
 gap: 12px; padding: var(--kl-players-inset) var(--kl-players-inset) 0; border: 0; background: transparent;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-feature-page-title {
 margin: 0; font: 700 20px/1.3 var(--kl-font,system-ui);
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-feature-page-subtitle {
 position: absolute; width: 1px; height: 1px; margin: -1px; clip-path: inset(50%); overflow: hidden; white-space: nowrap;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] :is(.kl-players-room,.kl-players-empty-action) {
 align-items: center; justify-content: center; gap: 8px; min-height: var(--kl-players-control); padding: 0 12px;
 border-radius: 8px; background: transparent; font-size: 12px; font-weight: 550;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] > .kl-roster-body {
 padding: 16px var(--kl-players-inset) var(--kl-players-inset);
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-list-pane {
 grid-template-columns: minmax(200px,1fr) auto auto;
 grid-template-rows: auto auto minmax(0,1fr);
 grid-template-areas: "search scopes filters" "context context context" "results results results";
 align-items: center; gap: 0 8px;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-people-search {
 grid-area: search; display: flex; min-width: 0; height: var(--kl-players-control);
 padding: 0 10px; background: var(--kl-input-bg);
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-people-search > .kl-icon {
 display: block; width: 15px; height: 15px; color: var(--kl-meta);
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-people-search > .kl-browse-icon {
 display: inline-flex; min-height: 24px; border-radius: 8px;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-people-search:has(input:placeholder-shown) > .kl-browse-icon {
 display: none;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-people-search > .kl-roster-search {
 flex: 1; width: 0; min-width: 0; min-height: 0; height: 100%; padding: 0; border: 0; border-radius: 0;
 outline: 0; background: transparent; box-shadow: none; font-size: 12px;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-search::-webkit-search-cancel-button { -webkit-appearance: none; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-scopes {
 grid-area: scopes; align-items: center; flex-wrap: wrap; gap: 4px;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-filters {
 grid-area: filters; align-items: center; justify-content: flex-end; gap: 8px;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] [data-people-filter="addon"]:not([aria-pressed="true"]) { display: none; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] [data-people-filter="favorites"] > .kl-icon { display: none; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] :is(.kl-roster-scope,.kl-directory-filter) {
 min-width: 0; min-height: var(--kl-players-small); padding: 0 9px; border: 1px solid transparent;
 border-radius: 8px; background: transparent; color: var(--kl-muted); font: 400 11px/1.3 var(--kl-font,system-ui); white-space: nowrap;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] :is(.kl-roster-scope,.kl-directory-filter):hover {
 background: var(--kl-surface-hover); color: var(--kl-text);
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] :is(.kl-roster-scope[data-active="true"],.kl-directory-filter[aria-pressed="true"]) {
 border-color: var(--kl-nav-selection-border); background: var(--kl-nav-selection-bg); color: var(--kl-text);
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-room-context { grid-area: context; margin-top: 8px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-results {
 grid-area: results; align-self: stretch; margin-top: 16px;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-list { grid-template-columns: minmax(0,1fr); gap: 0; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-entry {
 --kl-player-presence: var(--kl-muted);
 grid-template-columns: 42px minmax(0,1fr) auto; grid-template-rows: auto; gap: 12px; padding: 12px 8px;
 border: 0; border-bottom: 1px solid var(--kl-border); border-radius: 0; background: transparent;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-entry[data-status="online"] { --kl-player-presence: var(--kl-success,#79c49a); }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-entry[data-status="idle"] { --kl-player-presence: var(--kl-gold); }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-entry[data-status="dnd"] { --kl-player-presence: var(--kl-danger); }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-entry[data-in-room="true"] { --kl-player-presence: var(--kl-success,#79c49a); }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-entry:is(:hover,:focus-within) { background: var(--kl-surface-hover); }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-entry-avatar-button { width: 42px; height: 42px; padding: 3px; border: 0; border-radius: 50%; background: transparent; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-entry .kl-avatar { width: 36px; height: 36px; border-radius: 50%; font-size: 14px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-entry-avatar-button .kl-presence-dot { display: none; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-entry-select {
 display: block; min-height: 0; padding: 2px 0; color: var(--kl-text);
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-entry-select:hover { color: var(--kl-accent); }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-entry-name { display: block; font: 600 13px/1.5 var(--kl-font,system-ui); }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-players-meta {
 display: flex; align-items: center; flex-wrap: wrap; gap: 4px 12px; color: var(--kl-muted);
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] :is(.kl-roster-location-button,.kl-people-identity) {
 min-width: 0; min-height: 0; padding: 0; font: 400 11px/1.5 var(--kl-font,system-ui);
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-location-button::before {
 content: ""; display: inline-block; width: 6px; height: 6px; margin: 0 5px 1px 0;
 border-radius: 50%; background: var(--kl-player-presence);
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] :is(.kl-roster-entry-markers,.kl-people-identity):empty { display: none; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-entry-markers svg { width: 13px; height: 13px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-player-tags { margin-top: 4px; gap: 4px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-player-tag {
 max-width: min(140px,100%); border: 1px solid var(--kl-border); border-radius: 6px;
 font-size: 10px; line-height: 1.4; padding: 3px 6px;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-entry-actions {
 grid-column: 3; grid-row: 1; flex-wrap: nowrap; justify-content: flex-end; gap: 8px; margin: 0; padding: 0; border: 0;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] :is(.kl-roster-message,.kl-roster-more) {
 display: inline-flex; align-items: center; justify-content: center; width: var(--kl-players-small); min-width: var(--kl-players-small);
 height: var(--kl-players-small); min-height: var(--kl-players-small); padding: 0;
 border: 0; border-radius: 8px; background: transparent; color: var(--kl-muted);
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] :is(.kl-roster-message,.kl-roster-more,.kl-people-refresh,.kl-players-room,.kl-players-empty-action):hover:not(:disabled) {
 background: var(--kl-surface-hover); color: var(--kl-text);
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] :is(.kl-roster-message,.kl-roster-more) > .kl-icon { width: 16px; height: 16px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-list:empty { display: none; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-results > .kl-roster-empty {
 position: static; align-self: start; display: flex; flex-direction: column; align-items: center; gap: 12px;
 min-height: 0; max-height: 100%; overflow: auto; padding: 32px 16px; pointer-events: auto;
 border: 1px dashed var(--kl-border); border-radius: 10px; background: color-mix(in srgb,var(--kl-surface) 4%,transparent);
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-empty > .kl-icon { width: 28px; height: 28px; flex: none; margin-bottom: 4px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-empty > h2 { margin: 12px 0; font-size: 16px; color: var(--kl-text); }

@container kl-panel (width <= 1100px) {
 .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] { --kl-players-inset: 16px; }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
 .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] {
  --kl-players-inset: 12px; --kl-players-control: 40px; --kl-players-small: 36px;
 }
}
@container kl-people (width <= 650px) {
 .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-list-pane {
  grid-template-columns: auto minmax(0,1fr); grid-template-rows: auto auto auto minmax(0,1fr);
  grid-template-areas: "search search" "scopes filters" "context context" "results results";
 }
 .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] :is(.kl-roster-scopes,.kl-roster-filters) { margin-top: 8px; }
}
@container kl-people (width <= 560px) {
 .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-scopes { padding: 2px 1px; }
 .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-entry { gap: 8px; padding-inline: 0; }
 .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-entry-actions { --kl-players-small: 38px; gap: 4px; }
 .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-player-tag { max-width: min(90px,100%); }
}
@container kl-people (width <= 410px) {
 .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] :is(.kl-roster-scope,.kl-directory-filter) { padding-inline: 6px; }
 .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-filters { gap: 4px; }
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"][data-detail="true"] .kl-roster-list-pane {
 grid-template-columns: minmax(0,1fr); grid-template-rows: auto auto auto auto minmax(0,1fr);
 grid-template-areas: "search" "scopes" "filters" "context" "results";
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"][data-detail="true"] :is(.kl-roster-scopes,.kl-roster-filters) {
 justify-content: flex-start; margin-top: 8px;
}
@container kl-workspace (height <= 400px) {
 .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] > .kl-feature-page-header { padding-top: 8px; }
 .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] > .kl-roster-body { padding-block: 8px; }
 .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-results { margin-top: 8px; }
 .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-results > .kl-roster-empty { padding-block: 12px; }
}
@media (pointer: coarse) {
 .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] .kl-roster-entry-actions { --kl-players-small: 44px; }
}
`;
