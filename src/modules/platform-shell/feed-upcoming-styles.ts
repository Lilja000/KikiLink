export const FEED_UPCOMING_STYLES = `
.kl-dialog.kl-feed-upcoming-drawer {
  position: fixed; box-sizing: border-box; width: 320px; max-width: 100vw;
  height: var(--kl-dialog-viewport-height, 100dvh); max-height: 100dvh;
  margin: 0 0 0 auto; padding: 0; border: 0; border-left: 1px solid var(--kl-border-strong);
  border-radius: 0; background: var(--kl-surface); color: var(--kl-text); box-shadow: -12px 0 40px #0006;
}
.kl-dialog.kl-feed-upcoming-drawer[open] { display: flex; flex-direction: column; }
.kl-feed-upcoming-drawer::backdrop { background: #030303b8; }
.kl-feed-upcoming-header, .kl-feed-upcoming-actions { display: flex; align-items: center; gap: 8px; }
.kl-feed-upcoming-header {
  flex: none; justify-content: space-between;
  padding: 10px 16px; border-bottom: 1px solid var(--kl-border);
}
.kl-feed-upcoming-header h2 {
  min-width: 0; margin: 0; font-family: var(--kl-title-font, Georgia, serif);
  font-size: 16px; font-weight: 700; line-height: 1.4; overflow-wrap: anywhere;
}
.kl-feed-upcoming-actions { flex: none; }
.kl-feed-upcoming-drawer .kl-feed-upcoming-all-events {
  padding-inline: 8px; min-height: 36px; color: var(--kl-accent); font-size: 11px; white-space: nowrap;
}
.kl-feed-upcoming-drawer .kl-feed-upcoming-close {
  box-sizing: border-box; width: 36px; min-width: 36px; height: 36px; min-height: 36px;
  padding: 0; border: 0; background: transparent; color: var(--kl-muted);
}
.kl-feed-upcoming-drawer .kl-feed-upcoming-close:hover, .kl-feed-upcoming-drawer .kl-feed-upcoming-all-events:hover {
  background: var(--kl-surface-hover); color: var(--kl-text);
}
.kl-feed-upcoming-body {
  min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 12px 16px 20px;
  scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent;
}
.kl-feed-upcoming-body h3 {
  margin: 16px 0 6px; color: var(--kl-muted); font-size: 12px; font-weight: 650; line-height: 1.4;
}
.kl-feed-upcoming-events { padding-bottom: 6px; border-bottom: 1px solid var(--kl-border); }
.kl-feed-upcoming-status { margin: 8px 0; color: var(--kl-muted); font-size: 11px; line-height: 1.7; }
.kl-feed-upcoming-drawer .kl-feed-upcoming-row {
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 10px;
  width: 100%; min-height: 52px; box-sizing: border-box; border: 0; border-radius: 8px;
  padding: 8px 4px; background: transparent; color: var(--kl-text); text-align: start;
}
.kl-feed-upcoming-drawer .kl-feed-upcoming-row:hover { background: var(--kl-surface-hover); }
.kl-feed-upcoming-drawer .kl-feed-upcoming-row:focus-visible { outline: 1px solid var(--kl-accent); outline-offset: -1px; }
.kl-feed-upcoming-row > .kl-icon { width: 14px; height: 14px; color: var(--kl-muted); }
.kl-feed-upcoming-event-icon, .kl-feed-upcoming-row > .kl-cm-emblem {
  width: 34px; height: 34px; border-radius: 8px;
}
.kl-feed-upcoming-event-icon {
  box-sizing: border-box; display: grid; place-items: center;
  border: 1px solid var(--kl-border); background: var(--kl-surface-2); color: var(--kl-gold);
}
.kl-feed-upcoming-event-icon > .kl-icon, .kl-feed-upcoming-row > .kl-cm-emblem > .kl-icon {
  width: 18px; height: 18px;
}
.kl-feed-upcoming-copy { display: flex; min-width: 0; flex-direction: column; align-items: flex-start; gap: 2px; }
.kl-feed-upcoming-copy > strong, .kl-feed-upcoming-copy > small { max-width: 100%; overflow-wrap: anywhere; }
.kl-feed-upcoming-copy > strong { font-size: 12px; font-weight: 650; line-height: 1.4; }
.kl-feed-upcoming-copy > small { color: var(--kl-muted); font-size: 10px; line-height: 1.65; }
.kl-feed-upcoming-copy > .kl-ev-badge { align-items: center; gap: 4px; margin-top: 3px; }
@media (pointer: coarse) {
  .kl-feed-upcoming-drawer .kl-feed-upcoming-close { width: 44px; height: 44px; }
  .kl-feed-upcoming-drawer .kl-feed-upcoming-all-events { min-height: 44px; }
}
`;
