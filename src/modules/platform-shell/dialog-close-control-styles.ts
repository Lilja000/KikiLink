// Dialog headers use the same close glyph. Search clear and removal actions live
// inside fields or rows, outside this header-button contract.
const dialogClose = `:host(#kikilink-root) :is(
  :is(dialog, [role="dialog"])
    :is(header, .kl-dialog-header, .kl-feed-upcoming-actions, .kl-launcher-menu-heading) >
    button[aria-label]:has(> svg[data-icon="close"]:only-child),
  .kl-group-management-heading > button.kl-social-icon-button:has(> svg[data-icon="close"])
)`;

export const DIALOG_CLOSE_CONTROL_STYLES = `
${dialogClose} {
  box-sizing: border-box;
  flex: none;
  width: var(--kl-action-square); min-width: var(--kl-action-square);
  height: var(--kl-action-square); min-height: var(--kl-action-square);
  align-items: center; justify-content: center;
  padding: 0 !important;
  border: 1px solid var(--kl-border);
  border-radius: var(--kl-action-radius);
  background: var(--kl-surface-2); color: var(--kl-text); box-shadow: none;
  cursor: pointer;
}
${dialogClose} > svg {
  display: block; flex: none; margin: auto;
  width: var(--kl-action-icon-size); height: var(--kl-action-icon-size);
  color: inherit; stroke-width: 1.65;
}
${dialogClose}:is(:hover, :focus-visible, :active):not(:disabled, [aria-disabled="true"]) {
  background: var(--kl-surface-hover); border-color: var(--kl-border-strong);
}
${dialogClose}:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 2px; }
${dialogClose}:is(:disabled, [aria-disabled="true"]) { color: var(--kl-muted); cursor: default; }
`;
