import { focusedElement } from '../../utils/dom';

export function pageResult(button: HTMLButtonElement, id: string): HTMLButtonElement {
  button.dataset.pageResult = id;
  return button;
}

/** Continue keyboard browsing at the first new result, including after a replacement page. */
export async function focusPageResults(container: HTMLElement, load: () => Promise<void>, replace = false): Promise<void> {
  const opener = focusedElement(container);
  const pager = 'button.kl-page-action, button[data-page-retry]';
  if (!opener?.matches(':focus-visible') || !opener.matches(pager) || !container.contains(opener)) {
    await load();
    return;
  }
  const results = () => Array.from(container.querySelectorAll<HTMLButtonElement>('button[data-page-result]'));
  const seen = new Set(replace ? [] : results().map(item => item.dataset.pageResult));
  const isCurrentPager = (node: unknown) => node instanceof HTMLElement && container.contains(node) &&
    node.matches(pager) && node.dataset.pageAction === opener.dataset.pageAction;
  let moved = false;
  const onFocus = (event: FocusEvent) => {
    const target = event.composedPath()[0];
    // Some lists preserve focus by rebuilding and refocusing the same pager while loading.
    if (!isCurrentPager(target)) moved = true;
  };
  const doc = container.ownerDocument;
  doc.addEventListener('focusin', onFocus, true);
  try {
    await load();
    if (moved || !container.isConnected || container.closest('[hidden], [inert]')) return;
    const active = focusedElement(container);
    if (active && active !== doc.body && !isCurrentPager(active)) return;
    const root = container.getRootNode();
    if (root instanceof ShadowRoot && doc.activeElement && doc.activeElement !== doc.body && doc.activeElement !== root.host) return;
    const next = results().find(item => !seen.has(item.dataset.pageResult)) ??
      container.querySelector<HTMLElement>('button[data-page-retry]:enabled, [role="alert"] button:enabled, button.kl-page-action:enabled') ??
      container.querySelector<HTMLElement>('.kl-browse-summary, .kl-workshop-results, .kl-explore-empty');
    if (!next || next.closest('[hidden]')) return;
    if (next.tabIndex < 0) next.tabIndex = -1;
    next.focus({ preventScroll: true });
    next.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  } finally {
    doc.removeEventListener('focusin', onFocus, true);
  }
}
