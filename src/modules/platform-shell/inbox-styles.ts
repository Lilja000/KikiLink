/** Only opted-in Inbox surfaces; stable Mailbox remains on its existing styles. */
export const INBOX_STYLES = `
.kl-inbox-surface { --kl-inbox-search-height:36px; --kl-inbox-tool-size:32px; --kl-inbox-inset:20px; }
.kl-inbox-page { min-width:0; min-height:0; width:100%; height:100%; padding:var(--kl-inbox-inset) var(--kl-inbox-inset) 20px; box-sizing:border-box; overflow-y:auto; overscroll-behavior:contain; scrollbar-width:thin; scrollbar-color:var(--kl-border-strong) transparent; scrollbar-gutter:stable; background:transparent; }
.kl-inbox-page[hidden] { display:none!important; }
.kl-inbox-page > :is(.kl-mailbox-header,.kl-inbox-toolbar,.kl-mailbox-status,.kl-mailbox-list) { max-width:920px; margin-inline:auto; }
.kl-inbox-surface .kl-mailbox-header { min-height:48px; gap:0; padding:6px 12px; background:var(--kl-topbar-bg); }
.kl-inbox-surface .kl-mailbox-header>strong { min-width:0; display:flex; align-items:center; gap:8px; font-family:inherit; font-size:13px; font-weight:600; }
.kl-inbox-surface .kl-mailbox-header .kl-roster-count { position:static; min-width:18px; height:18px; border:0; padding:0 5px; background:var(--kl-accent); color:var(--kl-accent-foreground); font-size:var(--kl-type-xs); }
.kl-inbox-page.kl-inbox-surface .kl-mailbox-header { min-height:var(--kl-inbox-search-height); gap:6px; margin-bottom:12px; padding:0; border:0; background:none; }
.kl-inbox-page .kl-mailbox-header>h1 { flex:1; min-width:0; margin:0; font-size:var(--kl-type-xl); font-weight:700; letter-spacing:-.3px; line-height:1.3; }
.kl-inbox-toolbar { flex:none; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:8px 12px; margin-bottom:12px; }
.kl-inbox-search { flex:1 1 220px; max-width:320px; min-width:0; min-height:var(--kl-inbox-search-height); display:flex; align-items:center; gap:8px; padding-inline:10px; border:1px solid var(--kl-border); border-radius:8px; background:var(--kl-input-bg); color:var(--kl-meta); }
.kl-inbox-search:focus-within { border-color:var(--kl-accent); outline:2px solid color-mix(in srgb,var(--kl-accent) 12%,transparent); outline-offset:0; }
.kl-inbox-search>.kl-icon { width:15px; height:15px; flex:none; }
.kl-inbox-search>input { min-width:0; flex:1; min-height:0; padding:0; border:0; outline:0; background:transparent; color:var(--kl-text); font:inherit; font-size:var(--kl-type-body); }
.kl-inbox-search>input::placeholder { color:var(--kl-muted); }
.kl-inbox-search>.kl-browse-icon { width:24px; height:24px; min-height:24px; padding:0!important; }
.kl-inbox-search:has(input:placeholder-shown)>.kl-browse-icon { display:none; }
.kl-inbox-mail-tools { display:flex; flex:1 1 100%; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px 16px; padding-top:4px; }
.kl-inbox-mail-tools :is(label,.kl-text-button) { min-height:32px; font-size:11px; }
.kl-inbox-mail-tools label { display:inline-flex; align-items:center; gap:6px; color:var(--kl-muted); }
.kl-inbox-page .kl-mailbox-item[data-inbox-kind="mail"]:has(>:nth-child(3)) { grid-template-columns:minmax(0,1fr) auto auto; }
.kl-inbox-filters { display:flex; flex:0 1 auto; align-items:center; gap:4px; min-width:0; }
.kl-inbox-filters[hidden] { display:none; }
.kl-inbox-surface .kl-inbox-filters>.kl-text-button { flex:none; width:auto; min-width:0; min-height:var(--kl-inbox-tool-size); padding:0 12px; border:1px solid transparent; border-radius:8px; color:var(--kl-muted); background:transparent; font-size:var(--kl-type-sm); font-weight:400; white-space:nowrap; }
.kl-inbox-surface .kl-inbox-filters>.kl-text-button:hover { color:var(--kl-text); background:var(--kl-surface-hover); }
.kl-inbox-surface .kl-inbox-filters>.kl-text-button[aria-pressed="true"] { color:var(--kl-text); border-color:color-mix(in srgb,var(--kl-accent) 58%,var(--kl-muted)); background:color-mix(in srgb,var(--kl-accent) 12%,transparent); }
.kl-inbox-surface .kl-mailbox-status { display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding:6px 12px; }
.kl-inbox-page .kl-mailbox-status { padding:0 0 8px; }
.kl-inbox-page .kl-mailbox-status.kl-sr-only { padding:0; }
.kl-inbox-surface .kl-mailbox-status:empty { display:none; }
.kl-inbox-surface .kl-mailbox-list { display:flex; flex-direction:column; gap:8px; padding:0; scrollbar-width:thin; scrollbar-color:var(--kl-border-strong) transparent; }
.kl-inbox-page .kl-mailbox-list { max-height:none; overflow:visible; }
@media (hover: hover) and (pointer: fine) {
  @container kl-panel (width > 900px) and (height > 500px) {
    .kl-inbox-page { display:flex; flex-direction:column; overflow:hidden; scrollbar-gutter:auto; }
    .kl-inbox-page > :is(.kl-mailbox-header,.kl-inbox-toolbar,.kl-mailbox-status,.kl-mailbox-list) { width:100%; }
    .kl-inbox-page > :is(.kl-mailbox-header,.kl-mailbox-status) { flex:none; }
    .kl-inbox-page > .kl-mailbox-list { flex:1 1 auto; min-height:0; overflow-y:auto; overscroll-behavior:contain; scrollbar-gutter:stable; }
  }
}
.kl-inbox-rows { flex:none; min-width:0; }
.kl-inbox-page .kl-inbox-rows,.kl-inbox-page .kl-mailbox-empty { border:1px solid var(--kl-border); border-radius:10px; background:var(--kl-surface); }
.kl-inbox-surface .kl-mailbox-item { min-width:0; grid-template-columns:minmax(0,1fr) auto; align-items:start; gap:0 8px; padding:12px; border:0; border-bottom:1px solid var(--kl-border); border-radius:0; background:transparent; }
.kl-inbox-rows>.kl-mailbox-item:first-child { border-radius:9px 9px 0 0; }
.kl-inbox-rows>.kl-mailbox-item:last-child { border-bottom:0; border-radius:0 0 9px 9px; }
.kl-inbox-rows>.kl-mailbox-item:only-child { border-radius:9px; }
.kl-inbox-surface .kl-mailbox-item[data-unread="true"] { background:color-mix(in srgb,var(--kl-accent) 4%,transparent); }
.kl-inbox-surface .kl-mailbox-item>.kl-inbox-item-open { display:flex; align-items:flex-start; gap:12px; min-width:0; width:100%; min-height:42px; padding:0; border-radius:6px; line-height:1.5; white-space:normal; }
.kl-inbox-item-icon { flex:0 0 36px; width:36px; height:36px; margin-top:2px; display:grid; place-items:center; border:1px solid var(--kl-border); border-radius:50%; background:var(--kl-surface-2); color:var(--kl-muted); font-size:12px; }
.kl-inbox-item-icon.kl-avatar { width:36px; height:36px; border-radius:50%; background:var(--kl-avatar-bg); color:var(--kl-text); }
.kl-inbox-item-icon>.kl-icon { width:17px; height:17px; }
.kl-inbox-copy { display:grid; flex:1; gap:4px; min-width:0; padding-top:1px; }
.kl-inbox-title { display:flex; align-items:center; gap:8px; min-width:0; }
.kl-inbox-title>strong { flex:1; min-width:0; color:var(--kl-text); font-size:12px; font-weight:600; overflow-wrap:anywhere; }
.kl-inbox-item-open:hover .kl-inbox-title>strong { color:var(--kl-accent-hover,var(--kl-accent)); }
.kl-inbox-unread-dot { flex:none; width:8px; height:8px; border-radius:50%; background:var(--kl-accent); }
.kl-inbox-preview { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; color:var(--kl-muted); font-size:var(--kl-type-body); overflow-wrap:anywhere; }
.kl-inbox-meta { display:flex; flex-wrap:wrap; align-items:center; gap:4px 12px; min-width:0; color:var(--kl-muted); font-size:var(--kl-type-xs); }
.kl-inbox-meta>time { flex:none; font-variant-numeric:tabular-nums; }
.kl-inbox-meta>.kl-inbox-muted { color:var(--kl-meta); }
.kl-inbox-source { display:inline-flex; align-items:center; gap:4px; min-width:0; max-width:100%; }
.kl-inbox-source>.kl-icon { width:12px; height:12px; flex:none; }
.kl-inbox-source>span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.kl-inbox-surface :is(.kl-mailbox-header,.kl-mailbox-item)>.kl-mailbox-icon-button { display:grid; place-items:center; width:var(--kl-inbox-tool-size); height:var(--kl-inbox-tool-size); min-width:var(--kl-inbox-tool-size); min-height:var(--kl-inbox-tool-size); padding:0; border:0; border-radius:8px; background:transparent; color:var(--kl-muted); }
.kl-inbox-surface .kl-mailbox-item>.kl-mailbox-icon-button { margin-top:-2px; }
.kl-inbox-surface .kl-mailbox-icon-button:hover:not(:disabled),.kl-inbox-surface .kl-mailbox-icon-button[aria-expanded="true"] { color:var(--kl-text); background:var(--kl-surface-hover); }
.kl-inbox-surface .kl-mailbox-icon-button[data-inbox-filtered="true"] { color:var(--kl-accent); }
.kl-inbox-surface :is(.kl-mailbox-header,.kl-mailbox-item)>.kl-mailbox-icon-button>.kl-icon { width:16px; height:16px; }
.kl-inbox-surface .kl-inbox-invitation-actions { display:flex; flex-wrap:wrap; gap:8px; padding-top:8px; padding-inline-start:48px; }
.kl-inbox-surface .kl-inbox-invitation-actions>.kl-text-button { display:inline-flex; align-items:center; justify-content:center; width:auto; gap:6px; min-height:var(--kl-inbox-tool-size); padding:5px 12px; border-radius:8px; background:transparent; font-size:var(--kl-type-sm); }
.kl-inbox-surface .kl-inbox-invitation-actions>.kl-text-button:first-child { color:var(--kl-accent-foreground); background:var(--kl-accent); border-color:var(--kl-accent); }
.kl-inbox-invitation-actions>.kl-text-button:disabled { opacity:.55; }
.kl-inbox-invitation-actions .kl-icon { width:15px; height:15px; }
.kl-inbox-mentions { padding-inline-start:48px; }
.kl-inbox-page .kl-mailbox-empty { flex:none; min-height:200px; gap:12px; padding:32px 16px; }
.kl-inbox-page .kl-mailbox-empty>.kl-icon { width:28px; height:28px; color:var(--kl-muted); opacity:1; }
.kl-inbox-page .kl-mailbox-empty>h2 { margin:0; color:var(--kl-text); font-size:var(--kl-type-md); }
.kl-inbox-load-error>.kl-inbox-load-diagnostic { max-width:50ch; margin:0; overflow-wrap:anywhere; font-size:var(--kl-type-body); line-height:1.5; }
.kl-inbox-page .kl-inbox-load-error>.kl-text-button { min-height:var(--kl-inbox-tool-size); padding-inline:12px; color:var(--kl-accent-foreground); background:var(--kl-accent); border-color:var(--kl-accent); }
.kl-inbox-page .kl-inbox-load-error>.kl-text-button:hover:not(:disabled) { background:var(--kl-accent-hover,var(--kl-accent)); }
.kl-inbox-loading { padding:0 12px; }
.kl-inbox-skeleton { display:flex; align-items:flex-start; gap:12px; padding:16px 0; border-bottom:1px solid var(--kl-border); }
.kl-inbox-skeleton:last-child { border-bottom:0; }
.kl-inbox-skeleton span { display:block; height:11px; border-radius:5px; background:var(--kl-surface-2); }
.kl-inbox-skeleton>span { flex:none; width:36px; height:36px; border-radius:50%; }
.kl-inbox-skeleton>div { display:grid; flex:1; gap:8px; padding-top:2px; }
.kl-inbox-skeleton>div>span:first-child { width:48%; }
.kl-inbox-surface button:focus-visible { outline:2px solid var(--kl-accent); outline-offset:-2px; }
.kl-inbox-surface .kl-mailbox-item,.kl-inbox-filters>.kl-text-button { transition:background-color 140ms ease,border-color 140ms ease; }
.kl-cloud-group-menu.kl-mailbox-popover.kl-inbox-surface { width:min(372px,calc(100vw - 16px)); border-radius:10px!important; background:var(--kl-surface-2)!important; box-shadow:0 8px 24px #0005; }
.kl-mailbox-popover.kl-inbox-surface::backdrop { background:transparent; }
.kl-inbox-toast-host { display:contents; }
.kl-inbox-toast-host>.kl-toast { right:12px; bottom:12px; max-width:calc(100% - 24px); }
.kl-mailbox-popover.kl-inbox-surface>.kl-inbox-filters { padding:6px 12px; border-bottom:1px solid var(--kl-border); overflow-x:auto; scrollbar-width:thin; }
.kl-mailbox-popover.kl-inbox-surface>.kl-mailbox-list { max-height:min(480px,calc(100dvh - 118px)); scrollbar-gutter:stable; }
.kl-mailbox-popover.kl-inbox-surface .kl-mailbox-item { gap:0 4px; }
.kl-mailbox-popover.kl-inbox-surface .kl-mailbox-item>.kl-inbox-item-open { gap:10px; }
.kl-mailbox-popover .kl-inbox-item-icon { flex-basis:32px; width:32px; height:32px; }
.kl-mailbox-popover :is(.kl-inbox-title>strong,.kl-inbox-preview) { font-size:var(--kl-type-sm); }
.kl-mailbox-popover .kl-inbox-meta { gap:3px 8px; }
.kl-mailbox-popover.kl-inbox-surface .kl-mailbox-item>.kl-mailbox-icon-button { --kl-inbox-tool-size:28px; }
.kl-mailbox-popover.kl-inbox-surface .kl-inbox-invitation-actions,.kl-mailbox-popover .kl-inbox-mentions { padding-inline-start:42px; }
.kl-mailbox-popover.kl-inbox-surface .kl-mailbox-empty { min-height:0; padding:28px 12px; font-size:var(--kl-type-body); }
.kl-mailbox-popover.kl-inbox-surface .kl-mailbox-empty strong { color:inherit; font-weight:400; }
.kl-inbox-footer { padding:4px; border-top:1px solid var(--kl-border); }
.kl-inbox-surface .kl-inbox-footer>.kl-text-button { min-height:36px; justify-content:center; gap:8px; border:0; border-radius:8px; color:var(--kl-text); background:transparent; font-size:var(--kl-type-sm); }
.kl-inbox-surface .kl-inbox-footer>.kl-text-button:hover { background:var(--kl-surface-hover); }
.kl-inbox-footer>.kl-text-button>.kl-icon { order:1; width:15px; height:15px; }
@container kl-panel (700px < width <= 1100px) {
  .kl-inbox-page { --kl-inbox-inset:16px; }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-inbox-page { --kl-inbox-search-height:40px; --kl-inbox-tool-size:36px; --kl-inbox-inset:12px; scrollbar-gutter:auto; }
  .kl-inbox-toolbar { gap:8px; }
  .kl-inbox-search { flex-basis:100%; max-width:none; }
  .kl-inbox-toolbar>.kl-inbox-filters { flex:1 1 100%; overflow-x:auto; scrollbar-width:none; }
  .kl-inbox-surface .kl-inbox-toolbar .kl-inbox-filters>.kl-text-button { flex:1 0 auto; padding-inline:9px; }
  .kl-inbox-page.kl-inbox-surface .kl-mailbox-item { gap:0 4px; padding:12px 10px; }
  .kl-inbox-page.kl-inbox-surface .kl-mailbox-item>.kl-inbox-item-open { gap:10px; }
  .kl-inbox-page .kl-inbox-item-icon { flex-basis:32px; width:32px; height:32px; }
  .kl-inbox-page.kl-inbox-surface .kl-inbox-invitation-actions,.kl-inbox-page .kl-inbox-mentions { padding-inline-start:42px; }
}
@container kl-panel (700px < width <= 900px) and (height <= 500px) {
  .kl-inbox-page { display:grid; grid-template-columns:176px minmax(0,1fr); align-content:start; align-items:start; gap:8px 12px; }
  .kl-inbox-page.kl-inbox-surface .kl-mailbox-header { grid-column:1; grid-row:1; margin:0; }
  .kl-inbox-page .kl-mailbox-header>h1 { font-size:calc(var(--kl-type-xl) - 2px); }
  .kl-inbox-page>.kl-inbox-toolbar { grid-column:2; grid-row:1; margin:0; gap:6px; }
  .kl-inbox-toolbar>.kl-inbox-search { flex:1 1 130px; max-width:200px; }
  .kl-inbox-toolbar>.kl-inbox-filters { flex:0 1 auto; }
  .kl-inbox-page>:is(.kl-mailbox-status,.kl-mailbox-list) { width:100%; grid-column:1 / -1; }
}
@media (max-width:700px) {
  .kl-mailbox-popover.kl-inbox-surface { --kl-inbox-tool-size:36px; }
  .kl-mailbox-popover.kl-inbox-surface .kl-mailbox-header { padding:4px 10px; }
  .kl-mailbox-popover.kl-inbox-surface .kl-mailbox-item>.kl-mailbox-icon-button { --kl-inbox-tool-size:36px; }
  .kl-inbox-surface .kl-inbox-footer>.kl-text-button { min-height:40px; }
}
@media (pointer:coarse) {
  .kl-inbox-surface,.kl-mailbox-popover.kl-inbox-surface { --kl-inbox-search-height:44px; --kl-inbox-tool-size:44px; }
  .kl-inbox-search>input { font-size:max(16px,var(--kl-type-body)); }
  .kl-mailbox-popover.kl-inbox-surface .kl-mailbox-item>.kl-mailbox-icon-button { --kl-inbox-tool-size:44px; }
}
@media (prefers-reduced-motion:reduce) { .kl-inbox-surface .kl-mailbox-item,.kl-inbox-filters>.kl-text-button { transition:none; } }
`;
