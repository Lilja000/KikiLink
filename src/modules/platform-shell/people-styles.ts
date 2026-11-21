/** People and requests share the real roster, notes and relationship actions. */
export const PEOPLE_STYLES = `
.kl-directory-feed-footer:not([hidden]) { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px; padding-block: 6px; }
.kl-people-hidden-list:not([hidden]) { display: grid; align-content: start; gap: 8px; overflow: auto; }
.kl-hidden-person { display: flex; gap: 12px; align-items: center; justify-content: space-between; padding: 12px; border: 1px solid var(--kl-border); border-radius: 10px; background: var(--kl-surface); }
.kl-hidden-person small { display: block; color: var(--kl-muted); }
.kl-people-discovery { width: min(600px, calc(100vw - 24px)); }
.kl-people-discovery-search { display: flex; gap: 8px; flex-wrap: wrap; }
.kl-people-discovery-search > input { min-width: 0; flex: 1 1 180px; padding: 10px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-surface); color: var(--kl-text); font: inherit; }
.kl-people-discovery-results { display: grid; gap: 8px; margin-block: 12px; }
.kl-people-discovery-person { display: flex; flex-direction: column; align-items: flex-start; width: 100%; min-width: 0; text-align: left; white-space: normal; overflow-wrap: anywhere; }
.kl-people-discovery-person > span { color: var(--kl-muted); font-size: 11px; }

.kl-panel[data-platform-preview="true"] .kl-roster-page { grid-template-rows: auto auto minmax(0, 1fr) auto; background: transparent; }
.kl-panel[data-platform-preview="true"] .kl-roster-page > .kl-roster-body { grid-row: 3; padding: 10px 16px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page > .kl-feature-page-footer { grid-row: 4; padding: 8px 16px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page .kl-feature-page-heading { min-width: 0; }
.kl-panel[data-platform-preview="true"] .kl-roster-page .kl-feature-page-subtitle { font-size: 11px; }
.kl-panel[data-platform-preview="true"] .kl-roster-list-pane { gap: 8px; }
.kl-panel[data-platform-preview="true"] .kl-roster-scopes { display: flex; padding: 0; border: 0; background: transparent; gap: 6px; }
.kl-panel[data-platform-preview="true"] .kl-roster-scope { flex: 0 0 auto; min-width: 80px; border-radius: 7px; }
.kl-panel[data-platform-preview="true"] .kl-roster-scope[data-active="true"] { color: var(--kl-text); background: var(--kl-surface-2); box-shadow: none; }
.kl-panel[data-platform-preview="true"] .kl-roster-filters .kl-directory-filter,
.kl-panel[data-platform-preview="true"] .kl-request-segments .kl-directory-filter { border-radius: 7px; }
.kl-panel[data-platform-preview="true"] .kl-roster-list {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: max-content;
  align-content: start; gap: 12px; padding: 0; border: 0; border-radius: 0; background: transparent;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-detail="true"] .kl-roster-list { grid-template-columns: minmax(0, 1fr); }
.kl-panel[data-platform-preview="true"] .kl-players-toolbar.kl-cloud-actions { display: flex; width: auto; flex: 0 0 auto; margin-left: auto; }
.kl-panel[data-platform-preview="true"] .kl-players-toolbar .kl-text-button { width: auto; white-space: nowrap; }
.kl-panel[data-platform-preview="true"] .kl-roster-entry {
  grid-template-columns: 36px minmax(0, 1fr); grid-template-rows: auto auto; align-items: center;
  padding: 16px; border: 1px solid var(--kl-border); border-radius: 10px;
  background: var(--kl-surface); box-shadow: none;
}
.kl-panel[data-platform-preview="true"] .kl-roster-entry:hover,
.kl-panel[data-platform-preview="true"] .kl-roster-entry:focus-within { border-color: var(--kl-border-strong); background: var(--kl-surface-2); }
.kl-panel[data-platform-preview="true"] .kl-roster-entry[data-selected="true"] { background: var(--kl-surface-2); border-color: var(--kl-gold); }
.kl-panel[data-platform-preview="true"] .kl-roster-entry .kl-avatar { width: 36px; height: 36px; border-radius: 50%; }
.kl-panel[data-platform-preview="true"] .kl-roster-entry-name { font-size: 13px; font-weight: 600; line-height: 1.4; }
.kl-panel[data-platform-preview="true"] .kl-roster-entry-select { padding: 0; }
.kl-panel[data-platform-preview="true"] .kl-roster-location-button { line-height: 1.4; font-size: 11px; }
.kl-panel[data-platform-preview="true"] .kl-people-identity { display: block; color: var(--kl-muted); font-size: 10px; line-height: 1.4; overflow-wrap: anywhere; }
.kl-panel[data-platform-preview="true"] .kl-roster-message { width: 36px; height: 36px; padding: 8px; }
.kl-panel[data-platform-preview="true"] .kl-roster-message > .kl-icon { width: 16px; height: 16px; }
.kl-panel[data-platform-preview="true"] .kl-roster-entry-actions {
  grid-column: 1 / -1; grid-row: 2; justify-content: flex-end; margin-top: 10px; padding-top: 10px;
  border-top: 1px solid var(--kl-border);
}
.kl-panel[data-platform-preview="true"] .kl-request-actions {
  grid-column: 1 / -1; grid-row: 2; display: flex; flex-wrap: wrap; align-items: center;
  justify-content: flex-end; gap: 6px; max-width: none; margin-top: 10px; padding-top: 10px;
  border-top: 1px solid var(--kl-border);
}
.kl-panel[data-platform-preview="true"] .kl-request-actions .kl-friend-action {
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  min-width: 0; min-height: 36px; padding: 6px 10px; font-size: 12px;
}
.kl-panel[data-platform-preview="true"] .kl-request-actions .kl-friend-action > .kl-icon { flex: none; width: 14px; height: 14px; }
.kl-panel[data-platform-preview="true"] .kl-request-actions .kl-cloud-status { flex-basis: 100%; max-width: 220px; overflow-wrap: anywhere; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-player-tags { display: none; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-roster-list-pane { grid-template-rows: auto auto auto minmax(0, 1fr); gap: 0 8px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-friend-navigation { grid-row: 3; margin: 16px 0 8px; padding: 0; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-roster-results { grid-row: 4; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="players"] :is(.kl-people-matches,.kl-people-own,.kl-people-options,.kl-people-result-summary,.kl-people-sort,.kl-people-filter-toggle,.kl-people-view-profile),
.kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) :is(.kl-people-new-chat,.kl-people-add,.kl-people-refresh),
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] :is(.kl-people-sort,.kl-people-filter-toggle,.kl-people-result-summary,.kl-people-view-profile),
.kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"])[data-detail="false"] > .kl-feature-page-footer { display: none; }
.kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) > .kl-feature-page-header {
  gap: 12px; padding: var(--kl-explore-inset,20px) var(--kl-explore-inset,20px) 16px;
  border: 0; background: transparent;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) > .kl-roster-body {
  padding: 0 var(--kl-explore-inset,20px) var(--kl-explore-inset,20px);
}
@container kl-panel (min-width: 701px) {
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] > .kl-feature-page-header {
    scrollbar-gutter: stable; scrollbar-width: thin;
  }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] > .kl-feature-page-header { overflow: hidden; }
}
.kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) .kl-feature-page-title {
  font-family: inherit; font-size: var(--kl-type-xl,20px); line-height: 1.3; font-weight: 700; letter-spacing: -.3px; margin: 0;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] > .kl-feature-page-footer {
  min-height: 0; background: transparent; border: 0;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-list-pane {
  grid-template-columns: minmax(0,1fr) auto; grid-template-rows: auto auto auto auto auto minmax(0,1fr); gap: 0 8px;
}
.kl-people-search-row { grid-area: 1 / 1 / auto / -1; display: flex; gap: 8px; min-width: 0; align-items: center; margin-bottom: 12px; }
.kl-roster-page[data-people-view="players"] :is(.kl-people-search-row,.kl-people-search,.kl-people-card-actions) { display: contents; }
.kl-roster-page[data-people-view="players"] .kl-people-search > :not(input),
.kl-roster-page[data-people-view="players"] .kl-roster-message > span { display: none; }
.kl-roster-page[data-people-view="players"] .kl-roster-search::-webkit-search-cancel-button { -webkit-appearance: auto; }
.kl-roster-page[data-people-view="players"] .kl-roster-more { order: 1; }
.kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) .kl-people-search.kl-browse-search {
  min-width: 0; height: var(--kl-explore-control,36px); padding: 0 10px;
  border-radius: var(--kl-explore-radius,8px); background: var(--kl-input-bg);
}
.kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) .kl-people-search > .kl-roster-search {
  flex: 1; width: 0; min-width: 0; min-height: 0; height: 100%; padding: 0;
  background: transparent; border: 0; border-radius: 0; box-shadow: none; outline: none;
}
.kl-people-search > .kl-browse-icon {
  width: 24px; height: 24px; min-height: 24px; padding: 4px !important;
}
.kl-people-search:focus-within {
  border-color: var(--kl-explore-active-border,var(--kl-accent)); outline-offset: 0;
  outline-color: var(--kl-explore-active-bg,color-mix(in srgb,var(--kl-accent) 12%,transparent));
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-scopes { grid-area: 2 / 1; margin-bottom: 8px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-people-sort { grid-area: 2 / 2; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] :is(.kl-roster-filters,.kl-roster-room-context) { grid-column: 1 / -1; margin-bottom: 8px; }
.kl-people-result-summary { grid-area: 5 / 1 / auto / -1; min-width: 0; }
.kl-people-active-filters { display: flex; align-items: center; margin-bottom: 12px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-people-results-line {
  display: flex; justify-content: space-between; align-items: center;
  min-height: 16px; margin-bottom: 12px; color: var(--kl-muted); font-size: var(--kl-type-sm,11px); line-height: 1.5;
}
.kl-people-clear-filters { padding: 5px 0; border: 0; background: transparent; color: var(--kl-text); font-size: 11px; line-height: 1.5; cursor: pointer; }
.kl-people-clear-filters:hover { color: var(--kl-text); text-decoration: underline; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-results { grid-area: 6 / 1 / auto / -1; }
.kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) .kl-roster-scopes { gap: 4px; align-items: center; flex-wrap: wrap; }
.kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) .kl-roster-scope {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 0;
  min-height: var(--kl-explore-small,32px); padding: 0 9px; border-color: transparent;
  border-radius: var(--kl-explore-radius,8px); font-size: var(--kl-type-sm,11px); font-weight: 400;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) .kl-roster-scope[data-active="true"],
.kl-panel[data-platform-preview="true"] .kl-people-filter-toggle:is([aria-expanded="true"],[data-active="true"]),
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-filters .kl-directory-filter[aria-pressed="true"] {
  border-color: var(--kl-explore-active-border,var(--kl-accent));
  background: var(--kl-explore-active-bg,color-mix(in srgb,var(--kl-accent) 12%,transparent)); color: var(--kl-text);
}
.kl-people-sort { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; color: var(--kl-muted); font-size: var(--kl-type-sm,11px); white-space: nowrap; }
.kl-people-sort > select { min-height: var(--kl-explore-control,36px); max-width: 100%; padding: 3px 5px; border: 1px solid transparent; border-radius: var(--kl-explore-radius,8px); background: transparent; color: var(--kl-text); font: inherit; }
.kl-people-sort > select:focus-visible { outline: 2px solid var(--kl-explore-active-border,var(--kl-accent)); outline-offset: 1px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) .kl-players-toolbar { gap: 12px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) :is(.kl-people-matches,.kl-people-own,.kl-people-filter-toggle) {
  display: inline-flex; align-items: center; gap: 8px; min-height: var(--kl-explore-control,36px); padding: 0 12px;
  border-radius: var(--kl-explore-radius,8px); font-size: var(--kl-type-body,12px); font-weight: 550;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) :is(.kl-people-matches,.kl-people-own,.kl-people-options) { background: transparent; }
.kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) .kl-people-options {
  width: var(--kl-explore-control,36px); height: var(--kl-explore-control,36px); min-height: var(--kl-explore-control,36px);
  border-color: transparent; border-radius: var(--kl-explore-radius,8px);
}
.kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) .kl-players-toolbar > button:hover:not(:disabled) { background: var(--kl-surface-hover); }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-people-filter-toggle { display: none; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-people-filter-toggle .kl-icon { width: 16px; height: 16px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-entry {
  --kl-people-action-size: 32px;
  grid-template-columns: 36px minmax(0,1fr) auto; grid-template-rows: auto auto 1fr; gap: 0 10px; align-items: start;
  padding: 16px;
  border-radius: var(--kl-explore-card-radius,10px);
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-entry-copy,
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-entry-actions { display: contents; }
.kl-roster-page[data-people-view="people"] .kl-roster-entry-avatar-button {
  grid-area: 1 / 1; align-self: center; width: 36px; height: 36px; border-radius: 50%;
}
.kl-roster-page[data-people-view="people"] .kl-roster-entry-avatar-button .kl-avatar { border: 1px solid var(--kl-border-strong); }
.kl-roster-page[data-people-view="people"] .kl-roster-entry-avatar-button .kl-presence-dot {
  right: 2px; bottom: 2px; width: 9px; height: 9px; border: 2px solid var(--kl-surface); box-shadow: none;
}
.kl-roster-page[data-people-view="people"] .kl-people-card-identity { grid-area: 1 / 2; align-self: center; min-width: 0; }
.kl-roster-page[data-people-view="people"] .kl-roster-entry-select { width: 100%; min-height: 0; line-height: 1.5; }
.kl-roster-page[data-people-view="people"] .kl-roster-entry-select:hover { text-decoration: underline; }
.kl-roster-page[data-people-view="people"] .kl-roster-entry-name { flex: 1; }
.kl-roster-page[data-people-view="people"] .kl-roster-entry-markers:empty { display: none; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] :is(.kl-roster-entry-name,.kl-people-identity) {
  line-height: 1.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-people-identity { font-size: 11px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-people-card-details {
  grid-column: 1 / -1; display: flex; flex-direction: column; min-width: 0; margin-top: 12px;
}
.kl-people-card-presence { display: flex; align-items: center; gap: 5px; margin: 0 0 8px; color: var(--kl-muted); font-size: 11px; line-height: 1.5; }
.kl-people-card-presence .kl-presence-dot { position: static; width: 5px; height: 5px; border: 0; box-shadow: none; }
.kl-people-card-status { min-height: 38px; margin: 0 0 12px; color: var(--kl-muted); font-size: var(--kl-type-body,12px); line-height: 1.6; overflow-wrap: anywhere; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-people-card-status:not([hidden]) { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.kl-people-card-languages { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin: 12px 0; color: var(--kl-muted); font-size: 10px; line-height: 1.5; }
.kl-people-card-languages > .kl-icon { width: 12px; height: 12px; flex: none; }
.kl-roster-page[data-people-view="people"] .kl-player-tags { display: flex; flex-wrap: wrap; gap: 5px; margin: 0; }
.kl-roster-page[data-people-view="people"] .kl-player-tag {
  display: inline-block; min-width: 0; max-width: 100%; padding: 3px 6px; border: 1px solid var(--kl-border);
  border-radius: 6px; color: var(--kl-muted); background: transparent; font-size: 10px; line-height: 1.4;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-more {
  grid-area: 1 / 3; align-self: center; width: 26px; min-width: 26px; height: 28px; min-height: 28px; padding: 0;
  background: transparent; border-color: transparent; border-radius: var(--kl-explore-radius,8px);
}
.kl-roster-page[data-people-view="people"] .kl-roster-more > .kl-icon { width: 16px; height: 16px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-more:is(:hover,[aria-expanded="true"]) { background: var(--kl-surface-hover); }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-people-card-actions {
  grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;
  align-self: end; padding-top: 12px; border-top: 1px solid var(--kl-border);
}
.kl-roster-page[data-people-view="people"] .kl-people-card-actions > :is(.kl-roster-message,.kl-roster-join) { display: none; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-people-card-actions :is(.kl-people-view-profile,.kl-people-card-friend > .kl-friend-action,.kl-people-card-friend > details > summary) {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: auto; height: var(--kl-people-action-size);
  min-width: 0; min-height: var(--kl-people-action-size); padding: 0 12px; border: 1px solid var(--kl-border);
  border-radius: var(--kl-explore-radius,8px); font-size: 11px; font-weight: 550; line-height: 1.5; white-space: nowrap;
}
.kl-roster-page[data-people-view="people"] .kl-people-card-friend { max-width: 100%; }
.kl-roster-page[data-people-view="people"] .kl-people-card-friend > :is(details,button.kl-people-friend-trigger) { color: var(--kl-text); }
.kl-roster-page[data-people-view="people"] .kl-people-card-friend :is(details > summary,.kl-people-friend-trigger) { background: var(--kl-surface-2); }
.kl-roster-page[data-people-view="people"] .kl-people-card-friend > details > summary > .kl-icon,
.kl-roster-page[data-people-view="people"] .kl-people-card-friend > .kl-friend-action > .kl-icon { width: 16px; height: 16px; }
.kl-roster-page[data-people-view="people"] .kl-people-card-friend .kl-social-menu-items { inset-inline-start: 0; inset-inline-end: auto; width: max-content; max-width: min(220px,70vw); }
.kl-roster-page[data-people-view="people"] .kl-people-card-friend .kl-social-menu:not([open]) > .kl-social-menu-items { display: none; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-people-card-friend > .kl-people-friend-primary {
  border-color: var(--kl-explore-active-border,var(--kl-accent)); background: var(--kl-accent);
  color: var(--kl-accent-foreground,#fff8ee); font-weight: 650;
}
.kl-roster-page[data-people-view="people"] .kl-people-card-friend > .kl-people-friend-primary:hover:not(:disabled) { background: var(--kl-accent-hover,var(--kl-accent)); }
.kl-people-friend-menu > .kl-shell-menu-heading { color: var(--kl-muted); line-height: 1.5; }
.kl-people-friend-menu > .kl-shell-menu-heading > strong { font-weight: 400; }
.kl-content-dialog:has(.kl-people-friend-confirm) { position: fixed; inset: 0; margin: auto; }
.kl-people-friend-confirm { min-height: 0; overflow: auto; overscroll-behavior: contain; }
.kl-people-friend-confirm > p { margin: 0; padding: 16px; color: var(--kl-text); font-size: 12px; line-height: 1.5; }
.kl-people-friend-confirm > footer { gap: 8px; flex-wrap: wrap; padding: 12px 16px; background: var(--kl-input-bg); }
.kl-people-friend-confirm > footer > :first-child { margin-inline-end: auto; }
.kl-people-friend-confirm > footer > .kl-text-button { height: 36px; min-height: 36px; padding: 0 12px; border-radius: 8px; font-size: 12px; font-weight: 550; line-height: 1.5; }
.kl-people-friend-confirm > footer > .kl-text-button:first-child { background: transparent; }
.kl-people-friend-confirm > footer > .kl-text-button--danger { background: color-mix(in srgb,var(--kl-danger) 7%,transparent); border-color: color-mix(in srgb,var(--kl-danger) 36%,transparent); }
@media (max-width:700px), (max-width:900px) and (max-height:500px) {
  .kl-people-friend-confirm > p { padding: 12px; }
  .kl-people-friend-confirm > footer { padding: 10px 12px; }
  .kl-people-friend-confirm > footer > .kl-text-button { height: 40px; min-height: 40px; }
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-people-view-profile { margin-inline-start: auto; background: transparent; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-request-segments {
  display: flex; gap: 8px; padding: 0; border: 0; background: transparent;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-request-segments .kl-directory-filter {
  flex: 0 0 auto; gap: 8px; width: auto; min-height: var(--kl-explore-control,36px); padding: 0 12px;
  font-size: var(--kl-type-body,12px); font-weight: 550; border-color: var(--kl-border); border-radius: var(--kl-explore-radius,8px); background: transparent; color: var(--kl-text);
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-request-segments .kl-directory-filter[aria-pressed="true"] {
  border-color: var(--kl-explore-active-border,var(--kl-accent));
  background: var(--kl-explore-active-bg,color-mix(in srgb,var(--kl-accent) 12%,transparent));
}
.kl-request-segments .kl-roster-count, .kl-roster-scope[data-scope="requests"] > .kl-roster-count {
  position: static; background: var(--kl-accent); color: var(--kl-accent-foreground,#fff8ee);
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-roster-list {
  grid-template-columns: minmax(0,1fr); gap: 0; height: auto; max-height: 100%; align-self: start;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-roster-list:not(:empty) {
  border: 1px solid var(--kl-border); border-radius: var(--kl-explore-card-radius,10px);
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-roster-entry {
  grid-template-columns: 36px minmax(0,1fr) auto; grid-template-rows: auto; gap: 12px;
  padding: 12px; border: 0; border-radius: 0; background: var(--kl-surface);
}
.kl-roster-page[data-people-view="requests"] :is(.kl-people-card-details,.kl-roster-entry-markers,.kl-roster-entry .kl-presence-dot) { display: none; }
.kl-roster-page[data-people-view="requests"] .kl-roster-entry-select { min-height: 0; }
.kl-roster-page[data-people-view="requests"] .kl-roster-entry-select:hover { color: var(--kl-accent-hover,var(--kl-accent)); }
.kl-roster-page[data-people-view="requests"] .kl-roster-entry-avatar-button { width: 36px; height: 36px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-roster-entry-name { font-size: 12px; font-weight: 550; }
.kl-roster-page[data-people-view="requests"] .kl-people-identity { margin-top: 3px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-roster-entry + .kl-roster-entry { border-top: 1px solid var(--kl-border); }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-request-actions {
  grid-column: 3; grid-row: 1; margin: 0; padding: 0; border: 0; gap: 8px;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-friend-action {
  gap: 8px; padding-inline: 12px; font-weight: 550;
}
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-friend-accept { font-weight: 650; }
.kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-friend-action .kl-icon { width: 16px; height: 16px; }
.kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) .kl-roster-empty:not(:empty,.kl-people-no-match) {
  inset: 0 0 auto; min-height: 0; padding: 24px 16px; border: 1px dashed var(--kl-border);
  border-radius: var(--kl-explore-card-radius,10px);
}
.kl-roster-results > .kl-people-no-match { position: static; min-height: 0; pointer-events: auto; }
.kl-roster-results:has(> .kl-people-no-match) { display: block; overflow-y: auto; scrollbar-width: thin; }
.kl-roster-results:has(> .kl-people-no-match) > .kl-roster-list:empty { display: none; }
.kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) .kl-roster-empty h2 { color: var(--kl-text); }
.kl-panel[data-platform-preview="true"] .kl-people-no-match > p { font-size: 12px; line-height: 1.65; }
@container kl-panel (width > 900px) or (height > 500px) {
  .kl-panel[data-platform-preview="true"] .kl-people-no-match { gap: 10px; }
  .kl-panel[data-platform-preview="true"] .kl-people-no-match > .kl-icon { width: 26px; height: 26px; }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-roster-results > .kl-people-no-match { justify-items: stretch; }
}
.kl-panel[data-platform-preview="true"] .kl-request-actions .kl-friend-accept {
  background: var(--kl-accent); border-color: var(--kl-accent); color: var(--kl-accent-foreground,#fff8ee);
}
.kl-panel[data-platform-preview="true"] .kl-request-actions .kl-friend-accept:not(:disabled):hover { background: var(--kl-accent-hover,var(--kl-accent)); }
.kl-people-status { display: flex; align-items: center; gap: 10px; margin: 0 16px; padding: 8px 10px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-surface); color: var(--kl-muted); font-size: 12px; }
.kl-people-status > span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.kl-people-status > button { flex: 0 0 auto; }
.kl-panel[data-platform-preview="true"] .kl-people-refresh { flex: 0 0 auto; }
@container kl-people (max-width: 560px) {
  .kl-panel[data-platform-preview="true"] .kl-roster-list { grid-template-columns: minmax(0, 1fr); }
  .kl-panel[data-platform-preview="true"] .kl-roster-entry-actions { grid-column: 1 / -1; grid-row: 2; }
  .kl-panel[data-platform-preview="true"] .kl-request-actions { grid-column: 1 / -1; grid-row: 2; justify-content: flex-start; max-width: none; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page .kl-feature-page-header { flex-wrap: nowrap; }
  .kl-panel[data-platform-preview="true"] .kl-players-toolbar { gap: 6px; flex-wrap: nowrap; }
  .kl-panel[data-platform-preview="true"] .kl-people-new-chat { font-size: 0; gap: 0; padding: 8px; }
  .kl-panel[data-platform-preview="true"] .kl-people-new-chat > .kl-icon { width: 16px; height: 16px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-roster-entry { grid-template-columns: 38px minmax(0,1fr); gap: 10px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-request-actions { grid-column: 2; grid-row: 2; }
  .kl-panel[data-platform-preview="true"] .kl-request-actions > .kl-friend-action { flex: 1; min-height: 40px; }
}
@container kl-people (max-width: 680px) {
  .kl-panel[data-platform-preview="true"] .kl-roster-page > .kl-roster-body { padding: 8px 10px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page > .kl-feature-page-footer { padding: 6px 12px; font-size: 10px; }
  .kl-panel[data-platform-preview="true"] .kl-people-add { padding: 6px 8px; font-size: 11px; }
  .kl-people-status { margin: 0 10px; }
}
@container kl-people (max-width: 350px) {
  .kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) :is(.kl-people-matches,.kl-people-own) { padding-inline: 8px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) :is(.kl-people-matches,.kl-people-own) > span { display: none; }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-entry {
    --kl-people-action-size: 40px; padding: 14px;
  }
  .kl-roster-page[data-people-view="people"] .kl-roster-entry-select { min-height: var(--kl-people-action-size); }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-more {
    width: var(--kl-people-action-size); min-width: var(--kl-people-action-size);
    height: var(--kl-people-action-size); min-height: var(--kl-people-action-size);
  }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-people-result-summary:has(.kl-people-active-filters[hidden], + .kl-roster-results > .kl-people-no-match) .kl-people-results-line { min-height: 0; }
  .kl-roster-page[data-people-view="people"] .kl-people-result-summary:has(.kl-people-active-filters[hidden], + .kl-roster-results > .kl-people-no-match) [role="status"] {
    position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap;
  }
}
@container kl-panel (width <= 700px) {
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-list { grid-template-columns: minmax(0, 1fr); }
  .kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) .kl-players-toolbar { gap: 8px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) .kl-players-toolbar :is(.kl-people-matches,.kl-people-own) { font-size: 11px; padding-inline: 10px; min-height: 40px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-list-pane {
    grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto auto auto auto auto minmax(0, 1fr);
  }
  .kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) .kl-roster-scopes {
    padding: 2px 1px; gap: 3px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none;
  }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-scopes { margin-bottom: 4px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page:is([data-people-view="people"],[data-people-view="requests"]) .kl-roster-scope { padding-inline: 6px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-people-sort { grid-area: 3 / 1; justify-self: end; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-filters { grid-row: 4; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-room-context { grid-row: 5; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-people-result-summary { grid-row: 6; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-results { grid-row: 7; }
}
@container kl-workspace (max-height: 400px) {
  .kl-panel[data-platform-preview="true"] .kl-roster-page > .kl-roster-body { padding: 6px 12px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-list-pane { gap: 4px 8px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page:not([data-people-view="people"]) .kl-roster-entry { padding-block: 6px; }
  .kl-people-status { padding: 4px 8px; font-size: 11px; }
  .kl-panel[data-platform-preview="true"] .kl-people-status > button { min-height: 28px; padding: 3px 8px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] > .kl-feature-page-header { padding-block: 8px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] :is(.kl-people-search-row,.kl-people-results-line) { margin-bottom: 6px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] :is(.kl-people-search-row,.kl-people-results-line) { margin-bottom: 8px; }
}
@container kl-workspace (width > 560px) and (height <= 400px) {
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-friend-navigation { grid-column: 2; grid-row: 1; margin: 0 0 6px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-people-search-row { grid-column: 1; }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-roster-list-pane { grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto auto minmax(0, 1fr); }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] .kl-roster-results { grid-column: 1 / -1; grid-row: 3; }
}
@media (pointer: coarse) {
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-entry { --kl-people-action-size: 44px; }
  .kl-roster-page[data-people-view="people"] .kl-roster-entry-select { min-height: var(--kl-people-action-size); }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] .kl-roster-more {
    width: var(--kl-people-action-size); min-width: var(--kl-people-action-size);
    height: var(--kl-people-action-size); min-height: var(--kl-people-action-size);
  }
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="people"] :is(.kl-people-matches,.kl-people-own,.kl-people-filter-toggle,.kl-people-view-profile,.kl-roster-scope),
  .kl-panel[data-platform-preview="true"] .kl-roster-page[data-people-view="requests"] :is(.kl-request-segments .kl-directory-filter,.kl-roster-scope) { min-width: 44px; min-height: 44px; }
  .kl-panel[data-platform-preview="true"] .kl-roster-entry-actions :is(.kl-roster-message,.kl-roster-more) { width: 44px; height: 44px; min-height: 44px; }
  .kl-panel[data-platform-preview="true"] .kl-request-actions .kl-friend-action { min-height: 44px; }
}
`;
