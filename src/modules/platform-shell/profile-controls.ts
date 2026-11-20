import { element } from '../../cloud/dom';
import { kikiIcon } from '../link-chat/icons';

/** Secondary controls stay next to their content without crowding the profile. */
export function profileOptions(label: string, ...controls: HTMLElement[]): HTMLDetailsElement {
  const details = element('details', { className: 'kl-profile-options' });
  const summary = element('summary', { ariaLabel: label, title: label }, kikiIcon('more'));
  const menu = element('div', { className: 'kl-profile-options-menu' }, ...controls);
  details.append(summary, menu);
  details.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !details.open) return;
    event.preventDefault(); event.stopPropagation(); details.open = false; summary.focus();
  });
  menu.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('button')) details.open = false;
  });
  details.addEventListener('focusout', () => {
    queueMicrotask(() => {
      const active = (details.getRootNode() as Document | ShadowRoot).activeElement;
      if (details.isConnected && !details.contains(active)) details.open = false;
    });
  });
  return details;
}
