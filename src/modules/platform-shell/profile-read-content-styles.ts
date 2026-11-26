/** Read-only profile bodies share the layout of their Prototype 17.3 rows. */
export const PROFILE_READ_CONTENT_STYLES = `
:is(.kl-profile-events,.kl-profile-activity) {
  min-width: 0;
  padding: 12px;
  border-bottom: 1px solid var(--kl-border);
}
.kl-addon-profile-dialog :is(.kl-profile-events,.kl-profile-activity) { padding: 8px 0; border: 0; }
:is(.kl-profile-events,.kl-profile-activity,.kl-profile-creations):has(> .kl-profile-read-locked) {
  padding: 0;
  border: 0;
  background: none;
}
.kl-profile-read-locked { position: relative; }
.kl-profile-read-locked > .kl-profile-options { position: absolute; inset: 8px 8px auto auto; color: var(--kl-muted); }
:is(.kl-profile-events,.kl-profile-activity,.kl-profile-creations) > .kl-profile-section-heading {
  position: relative;
  min-height: 0;
  padding-inline-end: 32px;
  gap: 10px;
}
:is(.kl-profile-events,.kl-profile-activity,.kl-profile-creations) > .kl-profile-section-heading > h3 {
  min-width: 0;
  color: var(--kl-text);
  font-weight: 650;
  letter-spacing: -.2px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
:is(.kl-profile-events,.kl-profile-activity,.kl-profile-creations) > .kl-profile-section-heading > .kl-profile-options {
  position: absolute;
  inset: -4px 0 auto auto;
  margin: 0;
  color: var(--kl-muted);
}
:is(.kl-profile-events,.kl-profile-activity,.kl-profile-creations) > .kl-profile-section-heading > .kl-profile-options > summary > .kl-icon {
  width: 15px;
  height: 15px;
  stroke-width: 1.65;
}
:is(.kl-profile-events,.kl-profile-activity,.kl-profile-creations) > .kl-text-button { margin-top: 8px; }
.kl-profile-event-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 0;
}
.kl-profile-event-row:not(:has(+ .kl-profile-event-row)),
.kl-profile-activity > .kl-profile-activity-row:not(:has(+ .kl-profile-activity-row)),
.kl-profile-creation-row:not(:has(+ .kl-profile-creation-row)) { border-bottom: 0; }
.kl-profile-event-date {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 40px;
  border: 1px solid var(--kl-border);
  border-radius: 7px;
  color: var(--kl-muted);
  background: var(--kl-surface-2);
}
.kl-profile-event-date > .kl-icon { width: 17px; height: 17px; stroke-width: 1.65; }
.kl-profile-event-copy { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.kl-profile-event-copy > h3 { margin: 0 0 4px; color: var(--kl-text); font-size: 12px; font-weight: 650; line-height: 1.5; }
.kl-profile-event-copy > p { margin: 0; color: var(--kl-muted); font-size: 11px; line-height: 1.65; }
.kl-profile-event-time { display: block; margin-top: 3px; color: var(--kl-muted); font-size: 10px; line-height: 1.5; }
.kl-profile-event-time time { color: inherit; font-size: inherit; }
.kl-profile-event-row > .kl-profile-event-open {
  flex: none;
  height: 36px;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  background: transparent;
  color: var(--kl-text);
  font-size: 11px;
  font-weight: 550;
  line-height: 1.5;
  white-space: nowrap;
}
.kl-profile-event-row > .kl-profile-event-open:hover { background: var(--kl-surface-hover); }
.kl-profile-creations {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--kl-border);
  border-radius: 10px;
  background: var(--kl-surface);
  color: var(--kl-text);
}
.kl-profile-creations > .kl-profile-section-heading { display: block; margin: 0; }
.kl-profile-creations > .kl-profile-section-note { margin-top: 8px; color: var(--kl-muted); font-size: 10px; line-height: 1.75; }
.kl-profile-creation-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  padding: 10px 0;
  border: 0;
  border-bottom: 1px solid var(--kl-border);
  background: none;
  color: var(--kl-text);
  cursor: pointer;
  text-align: left;
}
.kl-profile-creation-emblem {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 44px;
  height: 44px;
  border: 1px solid #caae9225;
  border-radius: 11px;
  background: #312b26;
  color: #caae92;
}
.kl-profile-creation-emblem > .kl-icon { width: 23px; height: 23px; stroke-width: 1.65; }
.kl-profile-creation-row > .kl-icon { width: 15px; height: 15px; color: var(--kl-muted); stroke-width: 1.65; }
.kl-profile-creation-copy { flex: 1; min-width: 0; }
.kl-profile-creation-copy > strong {
  display: block;
  overflow: hidden;
  font-size: 12px;
  font-weight: 550;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-profile-creation-copy > small {
  display: block;
  margin-top: 3px;
  color: var(--kl-muted);
  font-size: 10px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.kl-profile-activity > .kl-profile-activity-row { display: flex; gap: 10px; padding: 12px 0; }
.kl-profile-activity-source {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--kl-border);
  border-radius: 8px;
  color: var(--kl-muted);
  background: var(--kl-surface-2);
  cursor: pointer;
}
.kl-profile-activity-source > .kl-icon { width: 15px; height: 15px; stroke-width: 1.65; }
button.kl-profile-activity-source:hover { border-color: var(--kl-border-strong); background: var(--kl-surface-hover); color: var(--kl-text); }
:is(article.kl-profile-creation-row,span.kl-profile-activity-source) { cursor: default; }
.kl-profile-activity-copy { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.kl-profile-activity-copy > :is(p,time) { display: block; margin: 3px 0 0; color: var(--kl-muted); font-size: 11px; line-height: 1.5; }
:is(.kl-profile-creation-row,.kl-profile-activity-source):focus-visible {
  outline: 2px solid color-mix(in srgb,var(--kl-accent) 52%,white);
  outline-offset: 3px;
}
@media (max-width: 900px) {
  .kl-profile-creation-emblem { width: 38px; height: 38px; border-radius: 10px; }
}
@media (max-width: 700px), (max-width: 900px) and (max-height: 500px) {
  .kl-profile-event-row > .kl-profile-event-open { height: 40px; min-height: 40px; }
  .kl-profile-creation-emblem { width: 44px; height: 44px; }
  .kl-profile-creation-row { min-height: 52px; }
}
@media (max-width: 700px) {
  :is(.kl-profile-events,.kl-profile-activity) { padding-inline: 0; }
  .kl-profile-event-row { flex-wrap: wrap; }
  .kl-profile-event-copy { flex-basis: calc(100% - 48px); }
  .kl-profile-event-row > .kl-profile-event-open { margin-inline-start: 46px; }
  .kl-profile-creations { padding: 12px; }
}
`;
