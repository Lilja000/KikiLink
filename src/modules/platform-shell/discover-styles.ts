export const DISCOVER_STYLES = `
.kl-discover-page {
  box-sizing: border-box; height: 100%; min-width: 0; overflow: auto;
  scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent;
  padding: var(--kl-explore-inset, 20px); color: var(--kl-text);
}
.kl-discover-page[hidden], .kl-discover-page [hidden] { display: none; }
.kl-discover-heading, .kl-discover-heading-actions, .kl-discover-section > header {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; min-width: 0;
}
.kl-discover-heading { margin-bottom: 16px; gap: 12px; }
.kl-discover-heading-actions { gap: 12px; }
.kl-discover-heading h1 { flex: 1; min-width: 0; margin: 0; font-size: var(--kl-type-xl, 20px); line-height: 1.3; letter-spacing: -.3px; }
.kl-discover-heading-actions .kl-text-button {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 12px;
  min-height: var(--kl-explore-control, 36px); border-radius: var(--kl-explore-radius, 8px);
  font-size: var(--kl-type-body, 12px); font-weight: 550; line-height: 1.5;
}
.kl-discover-heading-actions .kl-text-button--primary {
  font-weight: 650; box-shadow: none;
}
.kl-discover-heading-actions svg { width: 16px; height: 16px; }
.kl-discover-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;
}
.kl-discover-grid:has(> [hidden]) { grid-template-columns: minmax(0, 1fr); }
.kl-discover-section {
  box-sizing: border-box; min-width: 0; padding: 14px; border: 1px solid var(--kl-border);
  border-radius: var(--kl-explore-card-radius, 10px); background: var(--kl-surface);
}
.kl-discover-page > :is(.kl-discover-grid, .kl-discover-section) { margin-bottom: 12px; }
.kl-discover-section > header { margin: -4px 0 8px; }
.kl-discover-section > header h2 { min-width: 0; margin: 0; font-size: 13px; line-height: 1.4; letter-spacing: -.2px; font-weight: 650; }
.kl-discover-section > header .kl-discover-link { flex: 0 1 11em; margin-inline-start: auto; }
.kl-discover-row {
  display: flex; align-items: center; gap: 10px; width: 100%; min-width: 0; padding: 10px 0;
  border: 0; border-bottom: 1px solid var(--kl-border); background: transparent; color: var(--kl-text);
  font: inherit; text-align: left; cursor: pointer;
}
.kl-discover-row:not(.kl-discover-community, .kl-discover-person, .kl-discover-match):last-child { border-bottom: 0; }
.kl-discover-row:hover .kl-discover-row-copy > strong { text-decoration: underline; }
.kl-discover-row > svg { flex: none; width: 13px; height: 13px; color: var(--kl-muted); }
.kl-discover-community > .kl-cm-emblem { width: 32px; height: 32px; border-radius: 8px; }
.kl-discover-community > .kl-cm-emblem > .kl-icon { width: 17px; height: 17px; }
.kl-discover-community:hover .kl-discover-row-copy > strong, .kl-discover-person:hover .kl-discover-row-copy > strong {
  color: var(--kl-text); text-decoration: none;
}
.kl-discover-person-avatar {
  position: relative; display: grid; place-items: center; box-sizing: border-box; flex: none;
  width: 32px; height: 32px; border: 1px solid var(--kl-border-strong); border-radius: 50%;
  background: var(--kl-avatar-bg); color: var(--kl-text); font-size: 13px; font-weight: 600;
}
.kl-discover-person-avatar > .kl-social-avatar-media:not([data-state="ready"]) { visibility: hidden; }
.kl-discover-person-avatar:has(> .kl-social-avatar-media[data-state="ready"]) > .kl-discover-person-initial { visibility: hidden; }
.kl-discover-joined {
  flex: none; padding: 2px 6px; border: 1px solid var(--kl-border); border-radius: 4px;
  color: var(--kl-muted); font-size: 9px; line-height: 1.4; white-space: nowrap;
}
.kl-discover-match {
  gap: 12px; padding: 14px; margin-bottom: 8px; border: 1px solid var(--kl-border);
  border-radius: 8px; background: var(--kl-surface);
}
.kl-discover-match:hover { background: var(--kl-surface-hover); border-color: var(--kl-border-strong); }
.kl-discover-match:hover .kl-discover-row-copy > strong { text-decoration: none; }
.kl-discover-match > .kl-match-avatar {
  width: 36px; height: 36px; border-color: var(--kl-border-strong); color: var(--kl-text); font-size: 13px; font-weight: 600;
}
.kl-discover-match > svg { width: 20px; height: 20px; }
.kl-discover-row-copy { flex: 1; min-width: 0; }
.kl-discover-row-copy > strong, .kl-discover-row-copy > time, .kl-discover-row-copy > small {
  display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.kl-discover-row-copy > strong { font-size: 12px; font-weight: 550; line-height: 1.4; }
.kl-discover-row-copy > time, .kl-discover-row-copy > small {
  color: var(--kl-muted); font-size: 10px; line-height: 1.5;
}
.kl-discover-row-copy > small { margin-top: 3px; }
.kl-discover-row:not(.kl-discover-match) .kl-discover-row-copy > small {
  white-space: normal; overflow-wrap: anywhere;
}
.kl-discover-event:hover .kl-discover-event-copy > strong { color: var(--kl-text); text-decoration: none; }
.kl-discover-event .kl-ev-badge { line-height: 1.4; }
.kl-discover-room > svg { width: 14px; height: 14px; }
.kl-discover-workshop-row > svg { width: 15px; height: 15px; }
.kl-discover-workshop-row > .kl-cm-emblem { border-color: color-mix(in srgb, var(--cm-ink) 14.5%, transparent); }
.kl-discover-room:hover .kl-discover-row-copy > strong, .kl-discover-workshop-row:hover .kl-discover-row-copy > strong { text-decoration: none; }
.kl-discover-date {
  display: flex; flex: none; flex-direction: column; align-items: center; justify-content: center;
  box-sizing: border-box; width: 36px; min-height: 42px; padding: 5px 4px; line-height: 1.2;
  border: 1px solid var(--kl-border); border-radius: 7px; background: var(--kl-surface-2); color: var(--kl-muted);
}
.kl-discover-date > small { font-size: 9px; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 2px; }
.kl-discover-date > strong { font-size: 17px; line-height: 1.1; font-weight: 600; }
.kl-discover-event-skeleton { cursor: default; }
.kl-discover-event-skeleton .kl-ev-skeleton { display: block; margin: 0; }
.kl-discover-event-skeleton-date { flex: none; width: 36px; height: 42px; border-radius: 7px; }
.kl-discover-event-skeleton-copy { display: grid; flex: 1; gap: 6px; min-width: 0; max-width: 270px; }
.kl-discover-upcoming-error {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;
  padding: 8px 0; color: var(--kl-text); font-size: 12px;
}
.kl-discover-upcoming-error > p { display: flex; align-items: center; gap: 8px; margin: 0; min-width: 0; }
.kl-discover-upcoming-error > p > svg { width: 16px; height: 16px; flex: none; color: var(--kl-muted); }
.kl-discover-upcoming-error > button { min-height: 32px; padding: 0 12px; font-size: 11px; }
.kl-discover-empty, .kl-discover-note > p { margin: 0; color: var(--kl-muted); font-size: 11px; line-height: 1.7; }
.kl-discover-empty { padding: 12px 0; }
.kl-discover-note {
  display: flex; align-items: center; gap: 10px; margin-top: 16px; padding: 12px 0;
  border-top: 1px solid var(--kl-border); color: var(--kl-muted);
}
.kl-discover-note > svg { flex: none; width: 17px; height: 17px; }
.kl-discover-note > p { flex: 1; min-width: 0; }
.kl-discover-note strong { display: block; color: var(--kl-text); font-weight: 550; }
.kl-discover-note > .kl-section-link { flex: none; }
@container kl-panel (max-width: 700px) {
  .kl-discover-heading { align-items: flex-start; gap: 10px; }
  .kl-discover-heading-actions { gap: 10px; }
  .kl-discover-heading .kl-text-button { padding-inline: 10px; font-size: 11px; }
  .kl-discover-person, .kl-discover-community { min-height: 52px; }
  .kl-discover-grid { grid-template-columns: minmax(0, 1fr); }
  .kl-discover-section { padding: 12px; }
  .kl-discover-matching { padding: 14px; }
  .kl-discover-event { display: grid; grid-template-columns: 36px minmax(0, 1fr) 16px; gap: 4px 10px; }
  .kl-discover-event > .kl-discover-date { grid-column: 1; grid-row: 1 / 3; }
  .kl-discover-event > .kl-discover-event-copy { grid-column: 2; grid-row: 1; }
  .kl-discover-event > .kl-ev-row-end { display: contents; }
  .kl-discover-event .kl-ev-badge { grid-column: 2; grid-row: 2; justify-self: start; white-space: normal; }
  .kl-discover-event .kl-ev-row-end > svg { grid-column: 3; grid-row: 1 / 3; }
  .kl-discover-note { flex-wrap: wrap; }
  .kl-discover-note > .kl-text-button { margin-left: 27px; }
}
@container kl-panel (max-width: 900px) {
  .kl-discover-workshop-row > .kl-cm-emblem { width: 38px; height: 38px; border-radius: 10px; }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-discover-page { padding-bottom: 20px; }
  .kl-discover-workshop-row { min-height: 52px; }
  .kl-discover-workshop-row > .kl-cm-emblem { width: 44px; height: 44px; }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-discover-heading { margin-bottom: 8px; }
}
@container kl-workspace (max-width: 500px) {
  .kl-discover-heading-actions .kl-discover-plans-toggle { min-width: 40px; padding-inline: 0; }
  .kl-discover-plans-toggle > span { display: none; }
}
`;
