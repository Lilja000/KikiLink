// Match action rows explicitly. Cards, media playback/navigation and toolbars can
// also have footers inside a dialog and keep their own controls.
const row = `:host(#kikilink-root) dialog :is(
  footer.kl-dialog-actions, footer.kl-dialog-footer, footer.kl-mod-dialog-footer,
  footer.kl-mod-dialog-footer > .kl-cloud-actions,
  footer.kl-feed-compose-footer, footer.kl-profile-compatibility-footer,
  footer.kl-room-leave-footer, footer.kl-explore-share-footer, footer.kl-sp-info-footer,
  footer.kl-sp-actions, footer.kl-ev-dialog-footer, footer.kl-workshop-install-footer,
  footer.kl-al-editor-actions, footer.kl-al-view-actions, .kl-custom-activity-footer,
  .kl-browse-dialog > footer:not([class]), .kl-browse-dialog--sheet > form > footer,
  .kl-room-dialog > footer:not([class]), .kl-match-dialog > footer:not([class]),
  .kl-cm-manager-dialog > form > footer, .kl-cm-design-create footer,
  .kl-local-restriction-dialog footer:not([class])
)`;
const button = `${row} > :is(button.kl-text-button, button.kl-social-button)`;
const primary = ':is(.kl-text-button--primary, .kl-social-primary)';
const danger = `:is(.kl-text-button--danger, .kl-social-danger, .kl-ev-danger, .kl-group-option-danger,
  .kl-match-decision-danger, .kl-session-danger, .kl-sp-membership-danger, .kl-workshop-danger)`;

export const DIALOG_ACTION_STYLES = `
${row} {
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
${button} {
  display: inline-flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: min(64px, 100%);
  max-width: 100%;
  width: auto;
  height: auto;
  min-height: var(--kl-action-height);
  padding: 5px 12px;
  border: 1px solid var(--kl-border);
  border-radius: var(--kl-action-radius);
  color: var(--kl-text);
  background: transparent;
  box-shadow: none;
  font: 550 var(--kl-type-body, 12px)/1.4 var(--kl-font, system-ui);
  white-space: normal;
  overflow-wrap: anywhere;
  text-align: center;
}
${button}[hidden] { display: none; }
${button} > svg { flex: none; width: var(--kl-action-icon-size); height: var(--kl-action-icon-size); }
${button}${primary} {
  color: var(--kl-accent-foreground);
  background: var(--kl-accent);
  border-color: var(--kl-accent);
  font-weight: 650;
}
${button}${danger} {
  color: var(--kl-danger);
  background: color-mix(in srgb, var(--kl-danger) 7%, transparent);
  border-color: color-mix(in srgb, var(--kl-danger) 36%, var(--kl-border));
  font-weight: 650;
}
@media (hover: hover) {
  ${button}:enabled:not([aria-disabled="true"]):hover { background: var(--kl-surface-hover); border-color: var(--kl-border-strong); }
  ${button}${primary}:enabled:not([aria-disabled="true"]):hover {
    background: color-mix(in srgb, var(--kl-accent) 90%, var(--kl-accent-foreground));
    border-color: var(--kl-accent);
  }
  ${button}${danger}:enabled:not([aria-disabled="true"]):hover {
    background: color-mix(in srgb, var(--kl-danger) 14%, var(--kl-surface));
    border-color: var(--kl-danger);
  }
}
${button}:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 2px; }
${button}:is(:disabled, [aria-disabled="true"]) { opacity: .55; }
@media (forced-colors: active) {
  ${button}:focus-visible { outline-color: Highlight; }
  ${button}${primary}, ${button}${danger} { border-color: ButtonText; }
}
`;
