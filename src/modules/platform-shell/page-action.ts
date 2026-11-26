import { kikiIcon } from '../link-chat/icons';

type PageAction = 'more' | 'next' | 'previous' | 'older';

/** Preserve the feature's existing button, handlers and disabled state. */
export function pageAction(button: HTMLButtonElement, direction: PageAction = 'more'): HTMLButtonElement {
  if (button.dataset.pageAction === direction) return button;
  button.classList.add('kl-page-action');
  button.dataset.pageAction = direction;
  button.querySelector(':scope > .kl-icon')?.remove();
  const icon = kikiIcon(direction === 'previous' ? 'back' : direction === 'next' ? 'arrow-right' : 'chevron-down');
  if (direction === 'previous') button.prepend(icon);
  else button.append(icon);
  return button;
}

const control = ':host(#kikilink-root) :is(.kl-panel, dialog) button.kl-page-action';

export const PAGE_ACTION_STYLES = `
${control} {
  display: inline-flex;
  box-sizing: border-box;
  flex: 0 1 auto;
  align-items: center;
  justify-content: center;
  justify-self: center;
  align-self: center;
  gap: 6px;
  width: fit-content;
  min-width: min(11em, 100%);
  max-width: 100%;
  height: auto;
  min-height: var(--kl-action-height, 36px);
  padding: 5px 12px;
  border: 1px solid var(--kl-border);
  border-radius: var(--kl-action-radius, 8px);
  background: var(--kl-surface-2);
  color: var(--kl-text);
  box-shadow: none;
  font: 600 var(--kl-type-body, 12px)/1.4 var(--kl-font, system-ui);
  text-align: center;
  text-decoration: none;
  white-space: normal;
  overflow-wrap: anywhere;
  cursor: pointer;
}
${control}[data-page-action="more"] { min-width: min(16.5em, 100%); }
:host(#kikilink-root) :is(.kl-ev-results, .kl-sp-results, .kl-workshop-body, .kl-feed-main,
    .kl-communities-page, .kl-matching-page, .kl-match-resources) button.kl-page-action[data-page-action="more"]:not([hidden]) {
  display: flex;
  margin-inline: auto;
}
:host(#kikilink-root) nav.kl-page-navigation {
  display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 8px;
}
${control}[hidden] { display: none; }
${control} > .kl-icon {
  width: var(--kl-action-icon-size, 16px);
  height: var(--kl-action-icon-size, 16px);
  flex: none; color: currentColor;
}
${control}[data-page-action="older"] > .kl-icon { transform: rotate(180deg); }
${control}:dir(rtl):is([data-page-action="previous"], [data-page-action="next"]) > .kl-icon { transform: scaleX(-1); }
@media (hover: hover) {
  ${control}:enabled:not([aria-disabled="true"]):hover {
    color: var(--kl-text); background: var(--kl-surface-hover); border-color: var(--kl-border-strong);
  }
}
${control}:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 2px; }
${control}:is(:disabled, [aria-disabled="true"]) { opacity: .55; cursor: default; }
@media (forced-colors: active) {
  ${control}:focus-visible { outline-color: Highlight; }
}
`;
