// Only list toolbars use this treatment. All selects retain their native popup,
// keyboard navigation, option grouping and high-contrast fallback.
const toolbarSelect = `:host(#kikilink-root) :is(
  .kl-ev-sort > select, .kl-cm-sort > select, .kl-people-sort > select, .kl-sp-sort > select,
  .kl-workshop-sort-controls select, .kl-workshop-search > select, .kl-match-toolbar > select,
  .kl-gallery-toolbar > select, .kl-profile-preference-filters > select,
  .kl-cm-manager-toolbar > select, .kl-cm-member-search > select, .kl-mod-toolbar > select,
  select.kl-playlist-select, select.kl-lobby-space, select.kl-new-chat-sort, select.kl-new-chat-filter,
  select.kl-session-filter, select.kl-audit-filter
)`;

export const TOOLBAR_SELECT_STYLES = `
${toolbarSelect} {
  appearance: none;
  box-sizing: border-box;
  max-width: 100%; height: var(--kl-action-height); min-height: var(--kl-action-height);
  padding: 0; padding-inline: 10px 28px;
  border: 1px solid var(--kl-border); border-radius: var(--kl-action-radius);
  color: var(--kl-text); background-color: var(--kl-surface-2);
  font-family: inherit; font-size: var(--kl-type-body, 12px); font-weight: 500; line-height: 1.35;
  cursor: pointer; text-overflow: ellipsis;
  background-image: linear-gradient(45deg, transparent 38%, var(--kl-muted) 42% 58%, transparent 62%),
                    linear-gradient(-45deg, transparent 38%, var(--kl-muted) 42% 58%, transparent 62%);
  background-repeat: no-repeat; background-size: 5px 5px;
  background-position: right 15px center, right 10px center;
}
${toolbarSelect}:dir(rtl) { background-position: left 10px center, left 15px center; }
${toolbarSelect}:hover:not(:disabled) { background-color: var(--kl-surface-hover); border-color: var(--kl-border-strong); }
${toolbarSelect}:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 2px; }
${toolbarSelect}:disabled { color: var(--kl-muted); cursor: default; }
${toolbarSelect} option { color: var(--kl-text); background-color: var(--kl-surface); }
:host(#kikilink-root) .kl-mod-toolbar > select { width: auto; }
:host(#kikilink-root) .kl-workshop-search > select { width: auto; max-width: 100%; flex: 0 1 auto; }
:host(#kikilink-root) .kl-gallery-toolbar > select { flex: 0 1 auto; }
@container kl-workspace (max-width: 500px) {
  :host(#kikilink-root) .kl-workshop-search { flex-wrap: wrap; }
  :host(#kikilink-root) .kl-workshop-search-field { flex: 1 1 130px; }
  :host(#kikilink-root) .kl-workshop-search > select { flex-shrink: 0; }
}
@media (max-width: 520px) {
  :host(#kikilink-root) .kl-contact-controls { display: flex; flex-wrap: wrap; }
  :host(#kikilink-root) .kl-contact-controls > select { flex: 1 0 auto; width: auto; min-width: 0; }
}
@media (forced-colors: active) {
  ${toolbarSelect} { appearance: auto; background-image: none; padding-inline-end: 4px; }
}
`;
