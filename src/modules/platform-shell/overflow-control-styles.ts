// The SVG identity is shared by component-built and native <details> triggers.
// SocialUI's icon button also carries a visually hidden label.
const overflowControl = `:host(#kikilink-root) :is(
  :is(button, summary):has(> svg[data-icon="more"]:only-child),
  button.kl-social-icon-button:has(> svg[data-icon="more"])
):not([role^="menuitem"])`;

export const OVERFLOW_CONTROL_STYLES = `
${overflowControl} {
  box-sizing: border-box;
  flex: 0 0 auto;
  width: var(--kl-action-square); min-width: var(--kl-action-square); max-width: var(--kl-action-square);
  height: var(--kl-action-square); min-height: var(--kl-action-square); max-height: var(--kl-action-square);
  padding: 0 !important; gap: 0;
  align-items: center; justify-content: center; align-content: center; text-align: center;
  border: 1px solid var(--kl-border); border-radius: var(--kl-action-radius);
  background: var(--kl-surface-2); color: var(--kl-text); box-shadow: none;
  list-style: none; cursor: pointer;
}
${overflowControl}::-webkit-details-marker { display: none; }
${overflowControl} > svg[data-icon="more"] {
  display: block; flex: none; margin: auto;
  width: var(--kl-action-icon-size); height: var(--kl-action-icon-size);
  color: inherit; fill: currentColor; stroke-width: 1.5; opacity: 1;
}
${overflowControl}:is(:hover, :focus-visible, :active, [aria-expanded=true], details[open] > summary):not(:disabled, [aria-disabled=true]) {
  color: var(--kl-text); border-color: var(--kl-border-strong); background: var(--kl-surface-hover);
}
${overflowControl}:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 2px; }
${overflowControl}:is(:disabled, [aria-disabled=true]) { color: var(--kl-muted); cursor: default; }
`;
