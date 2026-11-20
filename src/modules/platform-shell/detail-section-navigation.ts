/** Keep a newly selected detail section in view without scrolling the game page. */
export function revealDetailSection(tab: HTMLButtonElement, tabs: HTMLElement, scroll: HTMLElement, alignVertically = true): void {
  if (tab.disabled) return;
  tab.focus({ preventScroll: true });
  const tabBounds = tab.getBoundingClientRect();
  const barBounds = tabs.getBoundingClientRect();
  const before = tabBounds.left - barBounds.left - 4;
  const after = tabBounds.right - barBounds.right + 4;
  if (before < 0) tabs.scrollLeft += before;
  else if (after > 0) tabs.scrollLeft += after;

  const panel = alignVertically ? scroll.closest('.kl-panel')?.getBoundingClientRect() : undefined;
  if (panel && panel.width <= 900 && panel.height <= 500) {
    scroll.scrollTop += Math.max(0, barBounds.top - scroll.getBoundingClientRect().top);
  }
}
