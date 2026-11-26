import { element } from '../../utils/dom';
import { kikiIcon } from '../link-chat/icons';

/** Retain the owner's action guards while giving an individual filter a visible remove action. */
export function removableFilter(button: HTMLButtonElement, label: string): HTMLButtonElement {
  button.classList.add('kl-applied-filter');
  const actionLabel = `Remove ${label} filter`;
  button.setAttribute('aria-label', actionLabel);
  button.title = actionLabel;
  button.replaceChildren(element('span', { text: label }), kikiIcon('close'));
  return button;
}

const filterRow = ':host(#kikilink-root) :is(.kl-cm-active-filters,.kl-sp-active-filters,.kl-ev-active-filters,.kl-lobby-filter-summary,.kl-workshop-active-filters,.kl-people-active-filters)';
const action = `${filterRow} > button`;

export const APPLIED_FILTER_STYLES = `
${filterRow} { align-items: center; gap: 6px; flex-wrap: wrap; }
${action} {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  box-sizing: border-box; min-width: 0; max-width: 100%; height: auto;
  min-height: var(--kl-action-square); padding: 3px 10px;
  border: 1px solid var(--kl-border); border-radius: var(--kl-action-radius);
  color: var(--kl-text); background: var(--kl-surface-2);
  font: 600 var(--kl-type-body, 12px)/1.4 var(--kl-font,system-ui);
  cursor: pointer; text-decoration: none;
}
${action}[hidden] { display: none; }
${action}.kl-applied-filter { background: var(--kl-surface); font-weight: 500; }
${action}.kl-applied-filter > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${action}.kl-applied-filter > svg { flex: none; width: 14px; height: 14px; color: var(--kl-muted); }
${action}:enabled:hover, ${action}:focus-visible { border-color: var(--kl-border-strong); background: var(--kl-surface-hover); text-decoration: none; }
${action}:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 2px; }
`;
