/** Reveal the selected button within its strip, preserving focus and page scroll. */
export function revealHorizontalTab(tab: HTMLElement, tabs: HTMLElement, margin = 0): void {
  if (!tabs.clientWidth || tabs.scrollWidth <= tabs.clientWidth) return;
  const tabBounds = tab.getBoundingClientRect();
  const barBounds = tabs.getBoundingClientRect();
  const before = tabBounds.left - barBounds.left - margin;
  const after = tabBounds.right - barBounds.right + margin;
  if (before < 0) tabs.scrollLeft += before;
  else if (after > 0) tabs.scrollLeft += after;
}

/** Keep a newly selected detail section in view without scrolling the game page. */
export function revealDetailSection(tab: HTMLButtonElement, tabs: HTMLElement, scroll: HTMLElement, alignVertically = true): void {
  if (tab.disabled) return;
  tab.focus({ preventScroll: true });
  revealHorizontalTab(tab, tabs, 4);

  const panel = alignVertically ? scroll.closest('.kl-panel')?.getBoundingClientRect() : undefined;
  if (panel && panel.width <= 900 && panel.height <= 500) {
    scroll.scrollTop += Math.max(0, tabs.getBoundingClientRect().top - scroll.getBoundingClientRect().top);
  }
}
