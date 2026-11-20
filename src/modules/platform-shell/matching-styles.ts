export const MATCHING_STYLES = `
.kl-matching-host { height: 100%; min-width: 0; min-height: 0; overflow: hidden; }
.kl-matching-page {
  box-sizing: border-box;
  min-width: 0;
  height: 100%;
  padding: var(--kl-explore-inset, 20px);
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--kl-border-strong) transparent;
  background: transparent;
  color: var(--kl-text);
}

/* Prototype17 keeps the matching categories in the same quiet tab row used by
   Explore. The shared shell supplies the charcoal/crimson/gold backdrop. */
.kl-match-type-tabs {
  position: sticky;
  top: calc(0px - var(--kl-explore-inset, 20px));
  z-index: 3;
  display: flex;
  align-items: stretch;
  gap: 20px;
  min-width: 0;
  margin-bottom: 12px;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--kl-border-strong) transparent;
  border-bottom: 1px solid var(--kl-border);
  background: var(--kl-bg);
}
.kl-matching-page .kl-match-type-tabs > .kl-text-button {
  position: relative;
  flex: 0 0 auto;
  min-height: 38px;
  padding: 0 2px 9px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--kl-muted);
  font-size: 12px;
  font-weight: 500;
}
.kl-matching-page .kl-match-type-tabs > .kl-text-button:hover { color: var(--kl-text); background: transparent; }
.kl-matching-page .kl-match-type-tabs > .kl-text-button:focus-visible { outline-offset: -2px; }
.kl-matching-page .kl-match-type-tabs > .kl-text-button[aria-disabled="true"] { color: var(--kl-muted); cursor: wait; }
.kl-match-type-tabs > .kl-text-button[aria-selected="true"] { color: var(--kl-text); }
.kl-match-type-tabs > .kl-text-button[aria-selected="true"]::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  border-radius: 2px;
  background: var(--kl-accent);
}

.kl-match-header,
.kl-match-toolbar,
.kl-match-actions,
.kl-match-signal { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; }
.kl-match-header { justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.kl-match-header h1 { min-width: 0; margin: 0; font-size: var(--kl-type-xl, 20px); line-height: 1.3; letter-spacing: -.3px; }
.kl-match-header > .kl-match-actions { justify-content: flex-end; gap: 6px; }
.kl-match-header .kl-match-connections { display: inline-flex; align-items: center; gap: 8px; }
.kl-match-connections-count { display: inline-flex; padding: 2px 6px; border: 1px solid var(--kl-border); border-radius: 6px; color: var(--kl-muted); font-size: 10px; line-height: 1.4; white-space: nowrap; }
.kl-match-meta { color: var(--kl-muted); font-size: 10px; line-height: 1.6; overflow-wrap: anywhere; }
.kl-match-hide-notice {
  display: flex; align-items: center; flex-wrap: wrap; gap: 6px 12px;
  margin: 0 0 12px; padding: 6px 10px; border: 1px solid var(--kl-border);
  border-radius: var(--kl-explore-card-radius, 10px); background: var(--kl-surface);
  color: var(--kl-muted); font-size: 11px;
}
.kl-match-hide-notice > span { flex: 1; min-width: 0; }
.kl-matching-page .kl-text-button,
.kl-match-dialog .kl-text-button { min-height: var(--kl-explore-control, 36px); padding: 6px 12px; border-radius: var(--kl-explore-radius, 8px); font-size: 11px; font-weight: 550; line-height: 1.4; }
.kl-matching-page .kl-text-button:where(:not(.kl-text-button--primary, .kl-text-button--danger)) { background: transparent; }
.kl-matching-page .kl-text-button:where(:not(.kl-text-button--primary, .kl-text-button--danger)):hover { background: var(--kl-surface-hover); }
.kl-matching-page .kl-match-header .kl-match-options { width: var(--kl-explore-small, 32px); min-width: var(--kl-explore-small, 32px); height: var(--kl-explore-small, 32px); min-height: var(--kl-explore-small, 32px); padding: 0; border: 1px solid var(--kl-border); border-radius: var(--kl-explore-radius, 8px); color: var(--kl-muted); }
.kl-matching-page .kl-match-header .kl-match-options:hover { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-matching-page .kl-match-header .kl-match-information-toggle {
  display: grid; place-items: center; flex: none; width: 42px; padding: 0;
}
.kl-match-information-toggle > svg { width: 16px; height: 16px; }

.kl-match-signal {
  padding: 10px 12px;
  margin-bottom: 12px;
  border: 1px solid color-mix(in srgb, var(--kl-gold) 22%, transparent);
  border-radius: 7px;
  background: color-mix(in srgb, var(--kl-gold) 4%, transparent);
  color: color-mix(in srgb, var(--kl-gold), var(--kl-text) 55%);
}
.kl-match-signal > div:first-child { flex: 1 1 140px; min-width: 0; }
.kl-match-signal strong { display: block; font-size: 11px; line-height: 1.5; }
.kl-match-signal p { margin: 3px 0 0; }
.kl-matching-page .kl-match-signal .kl-match-link { min-height: 0; padding: 0; border: 0; color: var(--kl-muted); }
.kl-matching-page .kl-match-signal .kl-match-link:hover { color: var(--kl-text); background: transparent; text-decoration: underline; }

.kl-match-toolbar { margin-bottom: 12px; }
.kl-match-search {
  display: flex;
  align-items: center;
  flex: 1 1 170px;
  min-width: 0;
  height: var(--kl-explore-control, 36px);
  padding-inline: 4px 8px;
  border: 1px solid var(--kl-border);
  border-radius: var(--kl-explore-radius, 8px);
  background: var(--kl-input-bg);
}
.kl-match-search-button { display: grid; place-items: center; flex: none; width: 24px; height: 24px; padding: 0; border: 0; border-radius: var(--kl-explore-radius, 8px); background: transparent; color: var(--kl-muted); cursor: pointer; }
.kl-match-search-button:hover { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-match-search-button > svg, .kl-match-filter-button > svg { width: var(--kl-explore-icon, 16px); height: var(--kl-explore-icon, 16px); }
.kl-match-search:focus-within { border-color: var(--kl-explore-active-border, var(--kl-border-strong)); }
.kl-match-search > input[type="search"] { flex: 1; width: 0; min-width: 0; height: 100%; padding: 0 4px; border: 0; background: transparent; color: var(--kl-text); font: inherit; font-size: 12px; outline: none; }
.kl-match-search > input[type="search"]::-webkit-search-cancel-button,
.kl-match-search > input:placeholder-shown + .kl-match-search-clear { display: none; }
.kl-match-filter-button { display: inline-flex; align-items: center; gap: 8px; }
.kl-match-collections { display: flex; flex-wrap: wrap; gap: 6px; }
.kl-matching-page .kl-match-collections > .kl-text-button { min-height: var(--kl-explore-small, 32px); padding: 0 9px; border-color: transparent; color: var(--kl-muted); }
.kl-matching-page .kl-match-collections > .kl-text-button[aria-pressed="true"] { background: var(--kl-explore-active-bg, color-mix(in srgb, var(--kl-accent) 12%, transparent)); border-color: var(--kl-explore-active-border, var(--kl-border-strong)); color: var(--kl-text); }
.kl-match-toolbar select,
.kl-match-dialog :is(input:not([type="checkbox"]), select, textarea) {
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--kl-border);
  border-radius: var(--kl-explore-radius, 8px);
  background: var(--kl-input-bg);
  color: var(--kl-text);
  font: inherit;
}
.kl-match-toolbar select { min-height: var(--kl-explore-control, 36px); padding-inline: 8px; font-size: 11px; }
.kl-match-results { margin: 0 0 12px; color: var(--kl-muted); font-size: 10px; line-height: 1.5; }
.kl-match-empty { display: grid; place-items: center; gap: 8px; border: 1px solid var(--kl-border); border-radius: var(--kl-explore-card-radius, 10px); padding: 28px 12px; background: var(--kl-surface); text-align: center; }
.kl-match-empty > svg { width: 24px; height: 24px; color: var(--kl-muted); }
.kl-match-empty :is(h2, p) { margin: 0; }
.kl-match-empty > h2 { font-size: 14px; }
.kl-match-empty > .kl-match-actions { justify-content: center; }

.kl-match-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; min-width: 0; }
.kl-match-skeleton-card {
  box-sizing: border-box;
  height: 230px;
  padding: 16px;
  border: 1px solid var(--kl-border);
  border-radius: var(--kl-explore-card-radius, 10px);
  overflow: hidden;
  background: var(--kl-surface);
}
.kl-match-skeleton { position: relative; overflow: hidden; height: 11px; margin-bottom: 12px; border-radius: 5px; background: var(--kl-surface-2); }
.kl-match-skeleton--short { width: 48%; }
.kl-match-skeleton::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, #d6a24b0a, transparent);
  transform: translateX(-100%);
  animation: kl-match-shimmer 1.7s ease-in-out infinite;
}
@keyframes kl-match-shimmer { to { transform: translateX(100%); } }
@media (prefers-reduced-motion: reduce) { .kl-match-skeleton::after { animation: none; } }
.kl-match-catalog-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 16px;
  border: 1px dashed var(--kl-border);
  border-radius: var(--kl-explore-card-radius, 10px);
  background: #11111308;
  text-align: center;
}
.kl-match-catalog-error > svg { width: 28px; height: 28px; color: var(--kl-muted); }
.kl-match-catalog-error > h2 { margin: 0; font-size: 16px; }
.kl-match-catalog-error > p { max-width: 340px; margin: 0; color: var(--kl-muted); font-size: 11px; line-height: 1.7; }
.kl-match-catalog-error > .kl-text-button { margin-top: 4px; }
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-match-catalog-error { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; column-gap: 12px; row-gap: 3px; text-align: left; }
  .kl-panel .kl-match-catalog-error > .kl-icon { grid-column: 1; grid-row: 1 / 3; width: 24px; height: 24px; margin: 0; }
  .kl-panel .kl-match-catalog-error > .kl-text-button { justify-self: end; margin: 0; }
}
.kl-match-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--kl-border);
  border-radius: var(--kl-explore-card-radius, 10px);
  background: var(--kl-surface);
  transition: border-color var(--kl-transition), background var(--kl-transition);
}
.kl-match-card:hover { border-color: var(--kl-border-strong); }
.kl-match-card :is(p, li, strong, button) { overflow-wrap: anywhere; }
.kl-match-person { display: flex; align-items: center; gap: 10px; min-width: 0; }
.kl-match-person > div { flex: 1; min-width: 0; }
.kl-match-grid > .kl-match-card { --kl-match-card-control: 32px; }
.kl-matching-page .kl-match-person > button.kl-match-card-options {
  flex: none; width: var(--kl-match-card-control, 32px); min-width: var(--kl-match-card-control, 32px);
  height: var(--kl-match-card-control, 32px); min-height: var(--kl-match-card-control, 32px); padding: 0;
  border: 0; border-radius: var(--kl-explore-radius, 8px); background: transparent; color: var(--kl-muted);
}
.kl-matching-page .kl-match-person > button.kl-match-card-options:is(:hover,[aria-expanded="true"]) { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-match-person > .kl-match-card-options > .kl-icon { width: 16px; height: 16px; }
.kl-match-avatar {
  width: 40px;
  height: 40px;
  flex: none;
  display: grid;
  place-items: center;
  border: 1px solid var(--kl-border);
  border-radius: 50%;
  background: var(--kl-avatar-bg);
  color: var(--kl-gold);
  font-size: 11px;
  font-weight: 650;
}
.kl-match-grid > .kl-match-card .kl-match-avatar { width: 36px; height: 36px; border-color: var(--kl-border-strong); color: var(--kl-text); font-size: 13px; font-weight: 600; line-height: 1; }
.kl-match-person .kl-match-resource-title { min-width: 0; margin: 0; }
.kl-match-person .kl-match-name {
  display: block;
  max-width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: transparent;
  color: var(--kl-text);
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.5;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-match-person button.kl-match-name:hover { text-decoration: underline; text-decoration-color: var(--kl-gold); text-underline-offset: 3px; }
.kl-match-card-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 7px; min-width: 0; margin-top: 4px; color: var(--kl-muted); font-size: 10px; line-height: 1.5; overflow-wrap: anywhere; }
.kl-match-card-tag { display: inline-flex; align-items: center; padding: 2px 6px; border: 1px solid var(--kl-border); border-radius: 4px; color: var(--kl-muted); font-size: 10px; line-height: 1.5; white-space: nowrap; }
.kl-match-card > p:not(.kl-match-meta) {
  display: -webkit-box;
  min-height: 37px;
  margin: 10px 0;
  overflow: hidden;
  color: var(--kl-muted);
  font-size: 11px;
  line-height: 1.7;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.kl-match-resources .kl-match-grid > .kl-match-card > p { font-size: 12px; line-height: 1.75; }
.kl-match-card > .kl-match-meta { margin: 0 0 8px; font-size: 10px; }
.kl-match-metrics { display: flex; flex-wrap: wrap; align-items: center; gap: 7px 12px; min-width: 0; margin: 8px 0; color: var(--kl-muted); font-size: 10px; line-height: 1.5; overflow-wrap: anywhere; }
.kl-match-metrics > span { display: inline-flex; align-items: center; gap: 4px; min-width: 0; max-width: 100%; }
.kl-match-metrics strong { color: var(--kl-text); font-size: 11px; font-weight: 550; }
.kl-match-metrics svg, .kl-match-reasons svg { width: 12px; height: 12px; flex: none; }
.kl-match-reasons { display: flex; flex-direction: column; gap: 5px; min-width: 0; margin: 4px 0 12px; padding: 0; list-style: none; }
.kl-match-reasons > li { display: flex; align-items: flex-start; gap: 6px; color: var(--kl-muted); font-size: 11px; line-height: 1.6; }
.kl-match-reasons > li > svg { margin-top: 3px; color: var(--kl-meta); }
.kl-match-reasons > li > span { min-width: 0; }
.kl-match-card > .kl-match-actions {
  gap: 6px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--kl-border);
}
.kl-matching-page .kl-match-grid > .kl-match-card > .kl-match-actions > .kl-text-button { height: var(--kl-match-card-control); min-height: var(--kl-match-card-control); padding: 0 12px; line-height: 1.5; }
.kl-matching-page .kl-match-grid > .kl-match-card > .kl-match-actions > .kl-text-button--primary { border-color: var(--kl-explore-active-border, var(--kl-border-strong)); box-shadow: none; font-weight: 650; }
.kl-matching-page .kl-match-grid > .kl-match-card > .kl-match-actions > .kl-match-card-link { height: auto; min-height: 0; padding: 0; border: 0; font-weight: 400; }
.kl-matching-page .kl-match-grid > .kl-match-card > .kl-match-actions > .kl-match-card-link:hover { background: transparent; text-decoration: underline; }
.kl-match-card details > summary { margin: 0; cursor: pointer; color: var(--kl-muted); font-size: 12px; }
.kl-match-card details .kl-match-actions { margin-top: 8px; }
.kl-match-connection-list { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.kl-match-connection-card > .kl-match-person strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.kl-match-connection-card > .kl-match-person .kl-match-meta { margin: 4px 0 0; }
.kl-match-connection-card > .kl-match-meta { margin: 10px 0 0; }
.kl-match-connection-card > .kl-match-request-message { display: block; min-height: 0; margin: 12px 0 0; padding: 10px 12px; border: 1px solid var(--kl-border); border-radius: 7px; background: var(--kl-input-bg); white-space: pre-line; }
.kl-match-connection-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }

.kl-match-pending { padding: 12px; margin-bottom: 12px; border: 1px solid var(--kl-gold); border-radius: 8px; background: color-mix(in srgb, var(--kl-gold), transparent 93%); }
.kl-match-pending p { margin: 4px 0 10px; }

.kl-match-dialog {
  box-sizing: border-box;
  width: min(720px, calc(100vw - 24px));
  max-height: calc(100dvh - 24px);
  overflow: auto;
  padding: 20px;
  border: 1px solid var(--kl-border-strong);
  border-radius: 12px;
  background: var(--kl-panel-art), var(--kl-panel-bg);
  color: var(--kl-text);
}
.kl-match-dialog::backdrop { background: #0009; }
.kl-match-dialog h2 { margin: 0 0 12px; font-size: 20px; }
.kl-match-dialog h3 { margin: 20px 0 10px; font-size: 13px; }
.kl-match-dialog[data-layout][open] { display: flex; flex-direction: column; }
.kl-match-dialog[data-layout] { position: fixed; inset: 0; width: min(540px, calc(100vw - 24px)); margin: auto; padding: 0; overflow: hidden; background: var(--kl-surface); font-size: 12px; line-height: 1.5; }
.kl-match-dialog[data-layout]::backdrop { background: #030303b8; }
.kl-match-dialog-header { display: flex; justify-content: space-between; align-items: center; flex: none; gap: 12px; min-height: 61px; padding: 12px 16px; border-bottom: 1px solid var(--kl-border); }
.kl-match-dialog-eyebrow { display: block; margin-bottom: 3px; color: var(--kl-muted); font-size: 10px; line-height: 1.4; letter-spacing: .07em; text-transform: uppercase; }
.kl-match-dialog .kl-match-dialog-header h2 { margin: 0; font-size: 16px; line-height: 1.4; overflow-wrap: anywhere; }
.kl-match-dialog-header > .kl-icon-button { flex: none; width: 32px; min-width: 32px; height: 32px; min-height: 32px; }
.kl-match-dialog-body { min-height: 0; padding: 16px; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent; }
.kl-match-dialog[data-layout] > footer { flex: none; align-items: center; min-height: 61px; margin: 0; padding: 12px 16px; border-top: 1px solid var(--kl-border); background: var(--kl-input-bg); }
.kl-match-request-target { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; min-width: 0; }
.kl-match-request-target > .kl-match-avatar { flex: none; }
.kl-match-request-target strong { font-size: 14px; overflow-wrap: anywhere; }
.kl-match-request-target .kl-match-meta { margin: 0; }
.kl-match-group-details .kl-match-request-target { align-items: flex-start; }
.kl-match-dialog .kl-match-group-details h3 { margin: 0; font-size: 14px; overflow-wrap: anywhere; }
.kl-match-group-details .kl-match-request-target p:not(.kl-match-meta) { margin: 4px 0 0; overflow-wrap: anywhere; }
.kl-match-group-links { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.kl-match-group-links > .kl-text-button { font-size: 11px; }
.kl-match-request-body > .kl-match-field { gap: 6px; }
.kl-match-request-body > .kl-match-field textarea { width: 100%; }
.kl-match-request-count { display: block; margin: -6px 0 12px; }
.kl-match-request-introduction { white-space: pre-wrap; overflow-wrap: anywhere; }
.kl-match-request-error { color: var(--kl-danger); }
.kl-match-request-error:empty { display: none; }
.kl-match-connection-dates { display: flex; gap: 4px 14px; flex-wrap: wrap; }
.kl-match-connection-details > .kl-match-request-message { margin: 12px 0; padding: 10px 12px; border: 1px solid var(--kl-border); border-radius: 7px; background: var(--kl-input-bg); white-space: pre-wrap; overflow-wrap: anywhere; }
.kl-match-connection-decisions { margin-top: 16px; }
.kl-match-connection-confirm > p { margin: 0; overflow-wrap: anywhere; }
.kl-match-connection-confirm > p + p { margin-top: 12px; }
.kl-match-hide-body > p { margin: 0; overflow-wrap: anywhere; }
.kl-match-hide-body > .kl-match-meta { margin-top: 12px; }
.kl-match-dialog :is(.kl-match-hide-confirm,.kl-match-decision-danger) { color: var(--kl-danger, var(--kl-accent)); border-color: color-mix(in srgb, var(--kl-danger, var(--kl-accent)) 36%, transparent); background: color-mix(in srgb, var(--kl-danger, var(--kl-accent)) 7%, transparent); }
.kl-match-dialog :is(.kl-match-hide-confirm,.kl-match-decision-danger):hover { background: color-mix(in srgb, var(--kl-danger, var(--kl-accent)) 15%, transparent); }
.kl-match-hidden-body > .kl-match-meta:first-child { margin: 0 0 12px; }
.kl-match-hidden-list { display: grid; gap: 8px; }
.kl-match-hidden-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--kl-border); }
.kl-match-hidden-row > strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.kl-match-hidden-row > button { flex: none; }
.kl-match-hidden-status { margin: 8px 0 0; }
.kl-match-hidden-status:empty { display: none; }
.kl-match-dialog[data-layout="information"] {
  width: min(320px, 100vw); height: 100%; max-height: 100dvh; margin: 0 0 0 auto;
  border-width: 0 0 0 1px; border-radius: 0; box-shadow: -12px 0 40px #0006;
}
.kl-match-dialog[data-layout="information"] .kl-match-dialog-header > .kl-icon-button {
  box-sizing: border-box; width: 32px; height: 32px; min-height: 32px; padding: 0;
  border: 0; border-radius: 7px; background: none; color: var(--kl-muted);
}
.kl-match-dialog[data-layout="information"] .kl-match-dialog-header > .kl-icon-button:hover {
  background: var(--kl-surface-hover); color: var(--kl-text);
}
.kl-match-dialog[data-layout="information"] .kl-match-dialog-header > .kl-icon-button > .kl-icon { width: 16px; height: 16px; }
.kl-match-information > header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; color: var(--kl-muted); }
.kl-match-information > header > svg { width: 14px; height: 14px; }
.kl-match-dialog .kl-match-information h3 { margin: 16px 0 8px; font-size: 12px; }
.kl-match-dialog .kl-match-information > header h3 { margin: 0; font-size: 11px; }
.kl-match-information p { margin: 0; color: var(--kl-muted); font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; }
.kl-match-information p + p { margin-top: 4px; }
.kl-match-information > .kl-match-actions, .kl-match-information > .kl-match-link { margin-top: 12px; }
.kl-match-information hr { height: 1px; margin: 16px 8px; border: 0; background: var(--kl-border); }
.kl-match-information .kl-match-link { min-height: 24px; padding: 0; border: 0; background: none; color: var(--kl-muted); }
.kl-match-information .kl-match-link:hover { background: none; color: var(--kl-text); text-decoration: underline; }
.kl-match-dialog .kl-match-information-row {
  display: flex; width: 100%; min-width: 0; align-items: center; gap: 12px; margin-bottom: 8px; padding: 10px 12px;
  background: var(--kl-surface); text-align: left;
}
.kl-match-dialog .kl-match-information-row:hover { background: var(--kl-surface-hover); }
.kl-match-information-row .kl-match-avatar { width: 32px; height: 32px; }
.kl-match-information-copy { display: grid; gap: 2px; flex: 1; min-width: 0; }
.kl-match-information-copy > strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.kl-match-information-copy > small { overflow-wrap: anywhere; color: var(--kl-muted); font-size: 11px; line-height: 1.4; }
.kl-match-information-row > svg { width: 16px; height: 16px; flex: none; color: var(--kl-muted); }
.kl-match-dialog:is([data-layout="why"], [data-layout="resource-why"]) > footer > button:first-child { margin-right: 0; }
.kl-match-dialog[data-layout="filters"] .kl-match-form-grid { gap: 14px; }
.kl-match-dialog[data-layout="filters"] .kl-match-field { gap: 6px; margin: 0; font-weight: 550; }
.kl-match-dialog[data-layout="filters"] .kl-match-field select { height: 36px; font-size: 11px; }
.kl-match-dialog[data-layout="filters"] .kl-match-dialog-body > .kl-match-meta:first-child { margin: 0 0 16px; font-size: 12px; line-height: 1.7; }
.kl-match-filter-count { margin: 12px 0; color: var(--kl-muted); font-size: 10px; line-height: 1.4; }
.kl-match-filter-toggles .kl-match-toggle { min-height: 44px; margin: 0; border-bottom: 1px solid var(--kl-border); font-size: 11px; }
.kl-match-filter-toggles + .kl-match-meta { margin: 12px 0 0; line-height: 1.7; }
.kl-match-why-summary { display: flex; align-items: flex-start; gap: 12px; min-width: 0; margin: 0 0 14px; padding: 12px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg); }
.kl-match-why-summary > div { flex: 1; min-width: 0; }
.kl-match-dialog .kl-match-why-summary h3 { margin: 0 0 6px; font-size: 14px; font-weight: 650; overflow-wrap: anywhere; }
.kl-match-why-summary .kl-match-avatar { width: 36px; height: 36px; font-size: 13px; font-weight: 600; line-height: normal; }
.kl-match-why-summary p { margin: 6px 0 0; color: var(--kl-muted); font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; }
.kl-match-why-summary .kl-match-avatar--resource .kl-icon { width: 16px; height: 16px; }
.kl-match-dialog .kl-match-why-profile { font-size: 11px; }
.kl-match-dialog:is([data-layout="why"], [data-layout="resource-why"]) .kl-match-breakdown { margin-block: 12px; }
.kl-match-dialog:is([data-layout="why"], [data-layout="resource-why"]) .kl-match-breakdown article { min-width: 0; font-size: 11px; }
.kl-match-dialog:is([data-layout="why"], [data-layout="resource-why"]) .kl-match-breakdown article > div { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 5px 12px; min-width: 0; font-size: 11px; }
.kl-match-dialog:is([data-layout="why"], [data-layout="resource-why"]) .kl-match-breakdown article strong { min-width: 0; font-size: 11px; font-weight: 550; }
.kl-match-dialog:is([data-layout="why"], [data-layout="resource-why"]) .kl-match-breakdown article > div > span { color: var(--kl-muted); font-size: 10px; font-variant-numeric: tabular-nums; }
.kl-match-dialog:is([data-layout="why"], [data-layout="resource-why"]) .kl-match-breakdown article > p { margin: 6px 0 0; color: var(--kl-muted); font-size: 10px; line-height: 1.7; overflow-wrap: anywhere; }
.kl-match-dialog:is([data-layout="why"], [data-layout="resource-why"]) .kl-match-dialog-body > .kl-match-meta { margin: 12px 0; color: var(--kl-meta); line-height: 1.5; }
.kl-match-compat-details { min-width: 0; margin-top: 16px; }
.kl-match-dialog .kl-match-compat-details h3 { margin: 0 0 8px; font-size: 12px; font-weight: 650; }
.kl-match-rating-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; min-width: 0; padding: 10px 0; border-bottom: 1px solid var(--kl-border); font-size: 11px; }
.kl-match-rating-row > :first-child { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.kl-match-editor-fields { min-width: 0; margin: 0; padding: 0; border: 0; }
.kl-match-dialog[data-layout="signal-editor"] { width: min(720px, calc(100vw - 24px)); }
.kl-match-dialog[data-layout="signal-editor"] > .kl-match-editor {
  display: flex; flex-direction: column; min-height: 0; min-width: 0;
}
.kl-match-dialog[data-layout="signal-editor"] footer {
  flex: none; align-items: center; min-height: 61px; margin: 0; padding: 12px 16px;
  border-top: 1px solid var(--kl-border); background: var(--kl-input-bg);
}
.kl-match-signal-progress {
  display: flex; align-items: center; gap: 8px 16px; flex-wrap: wrap;
  margin: -16px -16px 16px; padding: 14px 16px; list-style: none;
  border-bottom: 1px solid var(--kl-border); color: var(--kl-muted); font-size: 11px;
}
.kl-match-signal-progress > li { display: flex; align-items: center; gap: 6px; }
.kl-match-signal-progress > li[aria-current="step"] { color: var(--kl-text); font-weight: 650; }
.kl-match-signal-step-number {
  display: grid; place-items: center; flex: none; width: 20px; height: 20px;
  border: 1px solid var(--kl-border); border-radius: 50%; font-variant-numeric: tabular-nums;
}
.kl-match-signal-progress :is([aria-current="step"], .is-complete) .kl-match-signal-step-number {
  color: var(--kl-gold); border-color: var(--kl-gold);
}
.kl-match-signal-step-number > .kl-icon { width: 12px; height: 12px; }
.kl-match-dialog .kl-match-signal-step-heading { margin: 0 0 16px; }
.kl-match-dialog .kl-match-signal-step-heading:focus { outline: none; }
.kl-match-signal-sharing {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-block: 16px;
}
.kl-match-signal-sharing > section, .kl-match-signal-preview-card {
  min-width: 0; padding: 12px; border: 1px solid var(--kl-border);
  border-radius: 8px; background: var(--kl-input-bg);
}
.kl-match-dialog .kl-match-signal-sharing h3,
.kl-match-dialog .kl-match-signal-preview h3 { margin: 0 0 8px; }
.kl-match-signal-sharing > section > .kl-match-toggle:last-child { margin-bottom: 0; }
.kl-match-signal-preview-card { padding: 14px; }
.kl-match-signal-preview-card > header,
.kl-match-signal-preview-meta,
.kl-match-signal-preview-tags { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px 12px; min-width: 0; }
.kl-match-signal-preview-card > header { justify-content: space-between; }
.kl-match-signal-preview-card > header > span,
.kl-match-signal-preview-meta { color: var(--kl-muted); font-size: 11px; }
.kl-match-signal-preview-meta > span { min-width: 0; overflow-wrap: anywhere; }
.kl-match-signal-preview-tags { margin: 10px 0; padding: 0; list-style: none; gap: 6px; }
.kl-match-signal-preview-tags > li {
  max-width: 100%; padding: 2px 6px; border: 1px solid var(--kl-border);
  border-radius: 4px; font-size: 10px; overflow-wrap: anywhere;
}
.kl-match-signal-preview-note { margin: 10px 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.kl-match-signal-publication { min-height: 1.6em; }
.kl-match-signal-note-meta { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px 12px; }
.kl-match-signal-note-count { flex: none; margin-inline-start: auto; font-variant-numeric: tabular-nums; }
.kl-match-signal-validation { margin-top: 12px; }
.kl-match-editor :is(input, textarea)[aria-invalid="true"] { border-color: var(--kl-danger, var(--kl-accent)); }
.kl-match-signal-availability-status:not(:empty) {
  padding: 8px 10px; border: 1px solid var(--kl-border);
  border-radius: 8px; background: var(--kl-input-bg);
}
.kl-match-signal-availability-status:empty { margin: 0; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-match-dialog[data-layout="signal-editor"] footer { padding: 10px 12px; gap: 6px; }
  .kl-match-dialog[data-layout="signal-editor"] footer > button { min-height: 40px; }
  .kl-match-signal-progress { margin: -12px -12px 12px; padding: 12px; }
}
@container kl-panel (width <= 700px) {
  .kl-match-editor :is(.kl-match-form-grid, .kl-match-signal-sharing) { grid-template-columns: minmax(0, 1fr); }
}
.kl-match-field { display: grid; gap: 7px; min-width: 0; margin: 12px 0; font-size: 12px; }
.kl-match-field textarea { min-height: 84px; resize: vertical; }
.kl-match-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 14px; }
.kl-match-choices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 0 0 14px; padding: 12px 0 16px; border: 0; border-bottom: 1px solid var(--kl-border); }
.kl-match-choices legend { font-size: 13px; font-weight: 650; }
.kl-match-choices label,
.kl-match-toggle { display: flex; align-items: center; gap: 9px; font-size: 12px; line-height: 1.6; }
.kl-match-toggle { margin: 12px 0; }
.kl-match-toggle input,
.kl-match-choices input { min-width: 16px; min-height: 16px; flex: none; accent-color: var(--kl-accent); }
.kl-match-dialog footer { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
.kl-match-dialog footer > button:first-child { margin-right: auto; }
.kl-match-breakdown { display: grid; gap: 8px; }
.kl-match-breakdown article { padding: 10px 12px; border: 1px solid var(--kl-border); border-radius: 7px; background: var(--kl-input-bg); }
.kl-match-breakdown p { margin: 5px 0 0; }
.kl-match-private { padding: 10px 12px; margin-bottom: 10px; border: 1px solid var(--kl-border); border-radius: 7px; background: var(--kl-input-bg); }
.kl-match-status:empty { display: none; }
.kl-match-card:focus-within,
.kl-match-dialog :focus-visible { outline: 2px solid var(--kl-gold); outline-offset: 3px; }
.kl-match-original { box-sizing: border-box; max-width: 100%; max-height: 240px; overflow: auto; padding: 10px 12px; border: 1px solid var(--kl-border); border-radius: 7px; background: var(--kl-input-bg); font: inherit; font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; white-space: pre-wrap; }

@container kl-panel (max-width: 700px) {
  .kl-matching-page { padding: 12px 12px 20px; }
  .kl-match-header { flex-direction: column; align-items: flex-start; gap: 10px; }
  .kl-match-header > .kl-match-actions { justify-content: flex-start; }
  .kl-match-search, .kl-match-signal > div:first-child { flex-basis: 100%; }
  .kl-match-toolbar select { flex: 1 1 auto; }
  .kl-match-type-tabs { justify-content: space-between; gap: 12px; }
  .kl-match-card { padding: 12px; }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-match-grid { grid-template-columns: minmax(0, 1fr); }
  .kl-match-grid > .kl-match-card { --kl-match-card-control: 44px; }
  .kl-matching-page .kl-match-type-tabs > .kl-text-button { min-height: 40px; }
  .kl-match-dialog[data-layout="filters"] .kl-match-field select { height: 40px; }
  .kl-match-dialog[data-layout] .kl-match-dialog-header h2 { font-size: 15px; }
  .kl-match-dialog[data-layout] :is(.kl-match-dialog-header, footer) { padding: 10px 12px; }
  .kl-match-dialog[data-layout="information"] .kl-match-dialog-header > .kl-icon-button { width: 40px; height: 40px; }
  .kl-match-dialog[data-layout] .kl-match-dialog-body { padding: 12px; }
  .kl-match-dialog[data-layout] > footer .kl-text-button { min-height: 40px; }
}
@container kl-panel (width <= 700px) {
  .kl-match-dialog[data-layout="filters"] { width: 100%; margin-bottom: 0; border-bottom: 0; border-radius: 14px 14px 0 0; }
  .kl-match-dialog[data-layout="filters"] .kl-match-form-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 700px) {
  .kl-match-form-grid { grid-template-columns: minmax(0, 1fr); }
  .kl-match-dialog { padding: 16px; }
}
@container kl-workspace (max-height: 400px) {
  .kl-matching-page { padding-block: 12px; }
  .kl-match-header { margin-bottom: 8px; }
}
@media (pointer: coarse) {
  .kl-match-grid > .kl-match-card { --kl-match-card-control: 44px; }
  .kl-matching-page .kl-match-grid > .kl-match-card > .kl-match-actions > .kl-match-card-link { min-height: 44px; }
  .kl-match-dialog[data-layout="information"] .kl-match-dialog-header > .kl-icon-button { min-width: 44px; min-height: 44px; }
  .kl-matching-page .kl-text-button,
  .kl-matching-page .kl-match-type-tabs > .kl-text-button,
  .kl-matching-page .kl-match-collections > .kl-text-button,
  .kl-matching-page .kl-match-card > .kl-match-actions > .kl-text-button,
  .kl-match-dialog .kl-text-button { min-height: 44px; }
  .kl-matching-page .kl-match-header .kl-match-options,
  .kl-matching-page .kl-match-header .kl-match-information-toggle { min-width: 44px; min-height: 44px; }
  .kl-match-choices label,
  .kl-match-toggle { min-height: 36px; }
}
`;
