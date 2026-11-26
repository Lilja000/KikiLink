// The shell uses native details, anchored dialogs, and a few inline menus.
// Share the visual rules while leaving positioning, focus and dismissal to each owner.
const shellList = '.kl-shell-menu:not(.kl-message-reaction-menu, #kl-community-channel-menu)';
const listSurfaces = [
  shellList, '.kl-cloud-group-menu:not(.kl-mailbox-popover)', '.kl-group-message-menu',
  '.kl-social-menu-items', '.kl-profile-options-menu', '.kl-music-playlist-actions',
  '.kl-music-track-menu-popover', '.kl-workshop-menu-body', '.kl-workshop-creation-menu-body',
  '.kl-cm-member-menu > .kl-cm-actions', '.kl-cm-message-menu > .kl-cm-message-actions',
];
const richSurfaces = ['.kl-profile-menu', '.kl-group-menu', '.kl-launcher-menu'];

// Match the actual shadow host so historical per-screen rules cannot change the
// same action's geometry. :where keeps the list of supported owners extensible.
const host = ':host(#kikilink-root)';
const surface = `${host} :where(${[...listSurfaces, ...richSurfaces].join(', ')})`;
const rowOwners = [...listSurfaces, '.kl-profile-menu-group', '.kl-group-menu-section', '.kl-launcher-menu'];
const row = `${host} :where(${rowOwners.join(', ')}) > :is(button, a[href]):not([hidden])`;

export const ACTION_MENU_STYLES = `
${surface} {
  --kl-menu-row-height: var(--kl-action-height, 36px);
  box-sizing: border-box;
  gap: 0;
  padding: 4px;
  border: 1px solid var(--kl-border-strong);
  border-radius: 10px;
  background: var(--kl-surface);
  color: var(--kl-text);
  box-shadow: 0 8px 24px #0005;
  font-family: var(--kl-font, system-ui);
}
${host} :where(${shellList}, .kl-cloud-group-menu:not(.kl-mailbox-popover), .kl-social-menu-items,
  .kl-profile-options-menu, .kl-workshop-creation-menu-body, .kl-cm-member-menu > .kl-cm-actions,
  .kl-music-playlist-actions, .kl-music-track-menu-popover) {
  width: min(230px, calc(100vw - 16px));
}
${host} .kl-group-message-menu { width: min(230px, calc(100% - 16px)); }
${host} .kl-cm-message-menu > .kl-cm-message-actions { flex-direction: column; align-items: stretch; max-width: 100%; }
${host} .kl-launcher-menu { padding: 12px; }

${row} {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  min-width: 0;
  height: auto;
  min-height: var(--kl-menu-row-height);
  padding: 6px 10px;
  gap: 8px;
  border: 0;
  border-radius: var(--kl-action-radius, 8px);
  background: transparent;
  box-shadow: none;
  color: var(--kl-menu-ink, var(--kl-text));
  font: 500 var(--kl-type-body,12px)/1.4 var(--kl-font,system-ui);
  text-align: start;
  text-decoration: none;
  white-space: normal;
  overflow-wrap: anywhere;
  cursor: pointer;
}
${row} > :where(svg, .kl-profile-menu-icon),
${host} .kl-profile-menu-icon > svg {
  width: var(--kl-action-icon-size, 16px);
  height: var(--kl-action-icon-size, 16px);
  flex: none;
  color: var(--kl-menu-ink, var(--kl-muted));
}
${host} .kl-music-move-up-icon { transform: rotate(180deg); }
${row} .kl-profile-menu-label { font: inherit; }
${row} .kl-profile-menu-copy { flex: 1; }
${row}:where([data-danger="true"], .kl-social-danger, .kl-danger, .kl-text-button--danger,
  .kl-group-menu-action--danger, .kl-profile-menu-group--danger > button, .kl-music-track-delete,
  [data-community-action^="delete-"]) {
  --kl-menu-ink: var(--kl-danger);
}
${row}:where([aria-checked="true"], [aria-pressed="true"]) {
  background: color-mix(in srgb, var(--kl-accent) 9%, var(--kl-surface));
}
${row}:enabled:hover, ${row}:any-link:hover, ${row}:focus-visible {
  background: var(--kl-surface-hover);
  color: var(--kl-menu-ink, var(--kl-text));
}
${row}:hover:not(:focus-visible) { outline: none; }
${row}:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: -2px; }
${row}:disabled { opacity: .5; cursor: not-allowed; }

${host} :where(.kl-shell-menu-heading, .kl-profile-options-menu > .kl-profile-menu-heading) {
  margin: 0 0 4px;
  padding: 6px 10px 8px;
  color: var(--kl-muted);
  border-bottom: 1px solid var(--kl-border);
  font: 500 var(--kl-type-sm,11px)/1.4 var(--kl-font,system-ui);
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  ${surface} { --kl-menu-row-height: 40px; }
}
@media (pointer: coarse) {
  ${surface} { --kl-menu-row-height: 44px; }
}
@media (forced-colors: active) {
  ${surface} { background: Canvas; color: CanvasText; border-color: CanvasText; box-shadow: none; }
  ${row}:focus-visible { outline-color: Highlight; }
}
`;
