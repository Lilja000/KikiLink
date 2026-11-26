import { kikiIcon } from '../link-chat/icons';

/** A compact navigation action leading from a preview to its full section. */
export function sectionLink(button: HTMLButtonElement): HTMLButtonElement {
  button.classList.add('kl-section-link');
  button.append(kikiIcon('arrow-right'));
  return button;
}

export const SECTION_LINK_STYLES = `
:host(#kikilink-root) :is(.kl-panel, dialog) button.kl-text-button.kl-section-link {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: fit-content;
  min-width: min(11em, 100%);
  max-width: 100%;
  height: auto;
  min-height: var(--kl-action-square, 32px);
  padding: 4px 9px;
  border: 1px solid var(--kl-border);
  border-radius: var(--kl-action-radius, 8px);
  background: var(--kl-surface-2);
  color: var(--kl-text);
  box-shadow: none;
  font-family: var(--kl-font, system-ui);
  font-size: var(--kl-type-body, 12px);
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
  text-decoration: none;
  white-space: normal;
}
:host(#kikilink-root) :is(.kl-panel, dialog) button.kl-section-link > .kl-icon {
  flex: none; width: var(--kl-action-icon-size, 16px); height: var(--kl-action-icon-size, 16px); color: currentColor;
}
@media (hover: hover) {
  :host(#kikilink-root) :is(.kl-panel, dialog) button.kl-section-link:enabled:hover {
    background: var(--kl-surface-hover);
    border-color: var(--kl-border-strong);
    color: var(--kl-text);
    text-decoration: none;
  }
}
:host(#kikilink-root) :is(.kl-panel, dialog) button.kl-section-link:focus-visible {
  outline: 2px solid var(--kl-accent); outline-offset: 2px;
}
:host(#kikilink-root) :is(.kl-panel, dialog) button.kl-section-link[hidden] { display: none; }
`;
