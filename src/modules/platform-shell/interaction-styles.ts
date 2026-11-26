// Limit the search treatment to list filters. Text-labelled submit actions keep
// their normal button presentation.
const searchField = ':host(#kikilink-root) :is(.kl-browse-search, .kl-match-search, .kl-workshop-search-field, .kl-platform-feed .kl-feed-search-form, .kl-mod-search)';
const searchButton = `${searchField} > button:has(> svg:only-child)`;
const fieldInput = `${searchField} > input`;
const fieldIcon = `${searchField} > svg[data-icon="search"]`;
const filters = ':host(#kikilink-root) :is(.kl-browse-filter, .kl-match-filter-button, .kl-people-filter-toggle)';
const catalogDetails = ':host(#kikilink-root) button.kl-catalog-details';
const catalogBack = ':host(#kikilink-root) :is(.kl-cm-heading, .kl-workshop-path, .kl-ev-path, .kl-sp-path) button:has(> svg[data-icon="back"])';

export const INTERACTION_STYLES = `
:host {
  --kl-action-icon-size: 16px;
  --kl-action-radius: 8px;
  --kl-action-square: 32px;
  --kl-action-height: 36px;
  --kl-search-action-size: 30px;
}
@media (pointer: coarse) {
  :host {
    --kl-action-square: 44px;
    --kl-action-height: 44px;
    --kl-search-action-size: 42px;
  }
}

${filters} {
  box-sizing: border-box;
  justify-content: center;
  align-items: center;
  gap: 6px;
  min-width: min(84px, 100%);
  min-height: var(--kl-action-height);
  padding: 0 10px;
  border: 1px solid var(--kl-border);
  border-radius: var(--kl-action-radius);
  background: var(--kl-surface-2);
  color: var(--kl-text);
  font: 600 var(--kl-type-body, 12px)/1.4 var(--kl-font, system-ui);
}
${filters}:not(:disabled):hover { background: var(--kl-surface-hover); }
${filters}:is([aria-expanded="true"], [data-active="true"]) {
  background: var(--kl-accent-soft);
  border-color: var(--kl-accent);
}
${filters}:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 2px; }

${catalogDetails} {
  box-sizing: border-box;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: var(--kl-action-square); min-height: var(--kl-action-square); padding: 0 10px;
  border: 1px solid var(--kl-border); border-radius: var(--kl-action-radius);
  background: transparent; color: var(--kl-text);
  font-size: var(--kl-type-sm, 11px); font-weight: 550; line-height: 1.5;
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  ${catalogDetails} { min-height: 44px; }
}
@media (hover: hover) {
  ${catalogDetails}:enabled:hover { background: var(--kl-surface-hover); border-color: var(--kl-border-strong); }
  ${catalogBack}:enabled:hover { color: var(--kl-text); text-decoration: underline; }
}
${catalogBack} {
  box-sizing: border-box;
  display: inline-flex; align-items: center; justify-content: flex-start; gap: 6px;
  height: var(--kl-action-height); min-height: var(--kl-action-height); padding: 0;
  border: 0; border-radius: var(--kl-action-radius); background: transparent; color: var(--kl-muted);
  font-size: var(--kl-type-body, 12px); font-weight: 550; line-height: 1.5;
}
${catalogDetails}:focus-visible, ${catalogBack}:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 2px; }
${catalogDetails} > .kl-icon, ${catalogBack} > .kl-icon {
  flex: none; width: var(--kl-action-icon-size); height: var(--kl-action-icon-size);
}

${searchField} {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  min-width: 0;
  height: var(--kl-action-height);
  min-height: var(--kl-action-height);
  padding: 0 3px;
  gap: 4px;
  border: 1px solid var(--kl-border);
  border-radius: var(--kl-action-radius);
  background: var(--kl-input-bg, var(--kl-surface));
}
/* Reserve the same horizontal space for a passive glyph and a submit button. */
${fieldIcon} {
  position: static;
  flex: none;
  width: var(--kl-action-icon-size);
  height: var(--kl-action-icon-size);
  margin-inline: calc((var(--kl-search-action-size) - var(--kl-action-icon-size)) / 2);
  color: var(--kl-muted);
  stroke-width: 1.8;
  transform: none;
  pointer-events: none;
}
${fieldInput} {
  box-sizing: border-box;
  flex: 1;
  min-width: 0;
  width: 0;
  height: 100%;
  min-height: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  outline: 0;
  box-shadow: none;
  color: var(--kl-text);
  background: transparent;
  font: 400 var(--kl-type-body, 12px)/1.4 var(--kl-font, system-ui);
}
${fieldInput}::placeholder { color: var(--kl-muted); opacity: 1; }
${fieldInput}:focus-visible { outline: 0; box-shadow: none; }
${searchField}[hidden] { display: none; }
:host(#kikilink-root) .kl-new-chat-body > .kl-new-chat-search-field { flex: none; }
:host(#kikilink-root) .kl-cloud-audio-tools > .kl-cloud-audio-search { flex: 1; }
@container kl-workspace (max-width: 345px) {
  :host(#kikilink-root) :is(.kl-cm-search, .kl-ev-toolbar, .kl-sp-toolbar) { flex-wrap: wrap; }
  :host(#kikilink-root) :is(.kl-cm-search, .kl-ev-toolbar, .kl-sp-toolbar) > .kl-browse-search { flex-basis: 100%; }
  :host(#kikilink-root) .kl-rooms-panel .kl-lobby-search-wrap { grid-template-columns: minmax(0, 1fr) var(--kl-action-height); }
  :host(#kikilink-root) .kl-rooms-panel .kl-lobby-search-wrap > .kl-lobby-space { grid-area: 1 / 1 / auto / -1; }
  :host(#kikilink-root) .kl-rooms-panel .kl-lobby-search-wrap > .kl-browse-search { grid-area: 2 / 1; }
  :host(#kikilink-root) .kl-rooms-panel .kl-lobby-search-wrap > .kl-lobby-refresh { grid-area: 2 / 2; }
}
@media (pointer: coarse) {
  ${fieldInput} { font-size: max(16px, var(--kl-type-body, 12px)); }
}
${searchField}:focus-within { border-color: var(--kl-accent); outline: 0; }
${searchField}:has(> input:focus-visible) { outline: 2px solid var(--kl-accent); outline-offset: 1px; }
@media (forced-colors: active) {
  ${searchField}:has(> input:focus-visible) { outline-color: Highlight; }
}
${searchButton} {
  box-sizing: border-box;
  flex: none;
  width: var(--kl-search-action-size);
  min-width: var(--kl-search-action-size);
  height: var(--kl-search-action-size);
  min-height: var(--kl-search-action-size);
  margin-inline: 0;
  padding: 0 !important;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--kl-muted);
  cursor: pointer;
}
${searchButton} > svg[data-icon="search"] { stroke-width: 1.8; }
${searchButton}:not(:disabled):is(:hover, :focus-visible) {
  background: var(--kl-surface-hover);
  color: var(--kl-text);
}
${searchButton}:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: -2px; }
${searchButton} > svg, ${filters} > svg {
  flex: none;
  width: var(--kl-action-icon-size);
  height: var(--kl-action-icon-size);
  color: inherit;
}
`;
