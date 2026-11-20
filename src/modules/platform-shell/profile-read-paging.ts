import { focusedElement } from '../../utils/dom';

export function preserveProfilePagingPosition(button: HTMLButtonElement, next: () => HTMLElement | null | undefined): () => void {
  const active = focusedElement(button);
  const scroller = button.closest<HTMLElement>('.kl-addon-profile-body');
  const scrollTop = scroller?.scrollTop;
  return () => {
    const current = focusedElement(scroller ?? document);
    if (current && current !== document.body && current !== active) return;
    if (active === button) next()?.focus({ preventScroll: true });
    if (scroller?.isConnected && scrollTop !== undefined) scroller.scrollTop = scrollTop;
  };
}
