/** Group conversations use the same surfaces, accent and geometry as Direct. */
export const GROUP_CHAT_STYLES = `
.kl-cloud-group-menu { position: fixed; inset: auto; margin: 0; width: min(220px, calc(100vw - 16px)); padding: 8px; border: 1px solid var(--kl-border-strong); border-radius: 12px; background: var(--kl-surface); color: var(--kl-text); box-shadow: 0 12px 40px #0006; }
.kl-cloud-group-menu::backdrop { background: #0002; }
.kl-cloud-group-menu button { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 40px; text-align: left; }
.kl-group-inbox-status svg { width: 13px; height: 13px; color: var(--kl-muted); }
.kl-group-settings-section { min-width: 0; padding-block: 12px; border-top: 1px solid var(--kl-border); display: grid; gap: 10px; }
.kl-group-settings-section h4 { margin: 0; color: var(--kl-text); font-size: var(--kl-type-sm); }
.kl-group-settings-section p { margin: 0; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-group-settings-section .kl-cloud-field { min-width: 0; }
.kl-group-settings-toggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.kl-group-invite-row { display: flex; align-items: end; gap: 8px; flex-wrap: wrap; }
.kl-group-invite-row label { flex: 1; min-width: min(100%, 140px); }
.kl-group-settings-danger { border-color: color-mix(in srgb, var(--kl-accent), transparent 60%); }
.kl-group-settings-danger > button { justify-self: start; }
.kl-group-pin-bar { flex: none; display: flex; align-items: center; gap: 8px; min-width: 0; width: 100%; padding: 8px 14px; border: 0; border-bottom: 1px solid var(--kl-border); color: var(--kl-muted); background: var(--kl-surface-2); cursor: pointer; text-align: left; font: inherit; font-size: var(--kl-type-xs); }
.kl-group-pin-bar > svg { width: 15px; height: 15px; flex: none; color: var(--kl-gold); }
.kl-group-pin-bar > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-group-pin-row { display: flex; align-items: stretch; min-width: 0; flex: none; background: var(--kl-surface-2); border-bottom: 1px solid var(--kl-border); }
.kl-group-pin-row[hidden], .kl-group-pin-remove[hidden] { display: none; }
.kl-group-pin-row .kl-group-pin-bar { flex: 1; width: auto; border-bottom: 0; }
.kl-group-pin-remove { flex: none; align-self: center; margin-inline-end: 4px; }
.kl-group-pin-bar[hidden], .kl-group-pin-status[hidden] { display: none; }
.kl-group-pin-status { flex: none; margin: 0; padding: 6px 14px; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-group-message[data-highlight="true"] .kl-message-bubble { outline: 2px solid var(--kl-gold); outline-offset: 3px; }
@media (pointer: coarse) { .kl-cloud-group-menu button, .kl-group-pin-bar { min-height: 44px; } }
.kl-chat-inbox { grid-area:chats; min-width:0; min-height:0; overflow:auto; }
.kl-chat-inbox>.kl-conversations,.kl-chat-inbox>.kl-cloud-group-list { overflow:visible; height:auto; }
.kl-cloud[data-embedded="true"] { padding:0; gap:0; overflow:hidden; }
.kl-cloud[data-embedded="true"]>.kl-cloud-body { flex:1; min-height:0; max-width:none; display:flex; flex-direction:column; gap:0; overflow:hidden; }
.kl-cloud[data-embedded="true"]>.kl-cloud-status:not(:empty) { padding:10px 14px; flex:none; }
.kl-group-header { display:flex; align-items:center; flex:none; min-width:0; gap:8px; padding:12px 16px; border-bottom:1px solid var(--kl-border); background:var(--kl-surface); }
.kl-cloud .kl-group-identity { display:flex; flex:1; min-width:0; align-items:center; gap:10px; border:0; padding:0; background:transparent; color:var(--kl-text); font:inherit; text-align:start; cursor:pointer; }
.kl-group-header-avatar { position:relative; width:40px; height:40px; border-radius:12px; flex:none; overflow:hidden; background:var(--kl-input-bg); color:var(--kl-gold); }
.kl-group-header-avatar>.kl-icon { width:22px; height:22px; }
.kl-group-identity-copy { display:grid; min-width:0; gap:3px; }
.kl-group-identity-copy>strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:var(--kl-type-body); }
.kl-group-subtitle { color:var(--kl-muted); font-size:var(--kl-type-xs); line-height:1.5; }
.kl-group-avatar-stack { display:flex; align-items:center; flex:none; }
.kl-group-avatar-stack>.kl-social-author { display:block; margin-inline-start:-8px; }
.kl-group-avatar-stack .kl-social-author-copy { display:none; }
.kl-cloud .kl-group-avatar-stack .kl-social-avatar { width:32px; min-width:32px; height:32px; min-height:32px; border:2px solid var(--kl-surface); }
.kl-cloud .kl-group-avatar-more { min-height:36px; border:0; border-radius:50%; background:var(--kl-input-bg); color:var(--kl-muted); font:inherit; font-size:11px; cursor:pointer; }
.kl-group-header .kl-social-icon-button { width:36px; height:36px; min-height:36px; padding:8px; border-radius:10px; }
.kl-group-management { flex:none; max-height:55%; min-height:0; overflow:auto; padding:14px 18px; border-bottom:1px solid var(--kl-border); background:var(--kl-surface); }
.kl-group-management-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.kl-group-management-heading>h3 { font-size:16px; }
.kl-group-settings-actions { display:flex; gap:8px; flex-wrap:wrap; }
.kl-group-thread { display:flex; flex-direction:column; flex:1; min-height:0; min-width:0; gap:0; position:relative; }
.kl-group-history { display:flex; flex-direction:column; flex:1; min-height:0; overflow:auto; gap:12px; padding:18px; overscroll-behavior:contain; overflow-anchor:none; scrollbar-width:thin; scrollbar-color:var(--kl-border-strong) transparent; }
.kl-group-load { align-self:center; flex:none; }
.kl-group-message { position:relative; display:grid; grid-template-columns:36px minmax(0,1fr); grid-template-rows:auto auto; gap:3px 8px; width:100%; max-width:100%; min-width:0; align-self:flex-start; flex:none; padding:0; border:0; border-radius:0; background:transparent; }
.kl-group-message[data-own="true"] { align-self:flex-end; grid-template-columns:0 minmax(0,1fr); column-gap:0; border:0; background:transparent; }
.kl-group-message>.kl-social-author { display:contents; }
.kl-cloud .kl-group-message .kl-social-avatar { grid-area:1/1/3/2; width:36px; min-width:36px; height:36px; min-height:36px; }
.kl-group-message .kl-social-author-copy { grid-area:1/2; display:flex; align-items:baseline; flex-wrap:wrap; gap:4px 8px; }
.kl-group-message .kl-social-meta>span { display:none; }
.kl-group-message .kl-social-meta time::before { content:none; }
.kl-cloud .kl-group-message .kl-social-name { font-size:12px; min-height:22px; }
.kl-group-message .kl-social-meta { font-size:10px; }
.kl-group-message[data-own="true"] .kl-social-avatar { display:none; }
.kl-group-message[data-own="true"] .kl-social-author-copy { justify-content:flex-end; }
.kl-group-message-line { grid-area:2/2; }
.kl-group-message-bubble { min-width:0; padding:10px 13px 8px; border:1px solid color-mix(in srgb,var(--kl-border),var(--kl-accent) 9%); border-radius:17px 17px 17px 5px; background:color-mix(in srgb,var(--kl-surface-2),var(--kl-surface) 18%); }
.kl-group-message[data-own="true"] .kl-group-message-bubble { border-color:color-mix(in srgb,var(--kl-accent),var(--kl-gold) 28%); border-radius:17px 17px 5px 17px; background:color-mix(in srgb,var(--kl-accent),#070708 16%); color:var(--kl-accent-foreground); }
.kl-group-message .kl-group-message-text { padding:0; margin:0; font-size:var(--kl-type-body); line-height:1.55; white-space:pre-wrap; overflow-wrap:anywhere; }
.kl-group-message-menu { position:absolute; z-index:10; display:grid; width:min(240px,calc(100% - 16px)); max-height:calc(100% - 16px); overflow:auto; padding:6px; box-sizing:border-box; border:1px solid var(--kl-border); border-radius:14px; background:var(--kl-surface); box-shadow:0 12px 36px #0005; }
.kl-group-message-menu .kl-social-button { justify-content:flex-start; border-color:transparent; }
.kl-group-message>.kl-social-confirm { grid-column:1/-1; }
.kl-group-composer { position:static; flex:none; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:6px 8px; align-items:start; padding:12px 16px; border:0; border-top:1px solid var(--kl-border); border-radius:0; background:var(--kl-surface); box-shadow:none; }
.kl-group-composer>.kl-composer-reply { grid-column:1/-1; grid-row:1; }
.kl-cloud .kl-group-input { grid-area:2/1; min-height:44px; height:44px; max-height:120px; padding:10px; border:1px solid var(--kl-border); border-radius:10px; resize:vertical; font-size:var(--kl-type-body); line-height:1.5; }
.kl-group-compose-actions { display:contents; }
.kl-group-compose-actions>.kl-social-primary { grid-area:2/2; min-height:44px; background:var(--kl-accent); border-color:var(--kl-accent); color:var(--kl-accent-foreground); border-radius:10px; }
.kl-group-compose-actions>small { grid-area:3/1; font-size:10px; }
.kl-group-compose-actions>.kl-composer-count { grid-area:3/2; font-size:10px; }
.kl-group-typing { flex:none; margin:0; padding:6px 18px; min-width:0; }
.kl-group-new { position:absolute; bottom:110px; align-self:center; z-index:4; }
.kl-group-inbox-avatar>.kl-cloud-image-wrap,.kl-group-header-avatar>.kl-cloud-image-wrap { position:absolute; inset:0; display:grid; border-radius:inherit; overflow:hidden; }
.kl-cloud[data-embedded="true"] .kl-group-create { margin:16px; overflow:auto; }
.kl-group-header .kl-group-back { display:none; }
:host([data-density="compact"]) .kl-cloud[data-embedded="true"],:host([data-density="super-compact"]) .kl-cloud[data-embedded="true"] { padding:0; gap:0; }
:host([data-density="compact"]) .kl-group-history { padding:14px; gap:10px; }
:host([data-density="super-compact"]) .kl-group-history { padding:10px; gap:8px; }
:host([data-density="super-compact"]) .kl-group-header { padding:8px 12px; }
@container (max-width:480px) {
  .kl-group-header { padding:8px; gap:6px; }
  .kl-group-avatar-stack>.kl-social-author { display:none; }
  .kl-group-message { gap:3px 6px; }
  .kl-group-history { padding:12px 8px; }
  .kl-group-composer { padding:10px 8px; }
  .kl-group-management { padding:10px; }
}
@media (max-width:720px) {
  .kl-group-header .kl-group-back { display:inline-flex; }
  .kl-group-header .kl-social-icon-button { min-height:44px; width:44px; height:44px; }
  .kl-group-header { display:grid; grid-template-columns:44px minmax(0,1fr) 44px; gap:4px 6px; }
  .kl-group-identity { grid-area:1/2; }
  .kl-group-back { grid-area:1/1; }
  .kl-group-settings-button { grid-area:1/3; }
  .kl-group-avatar-stack { display:flex; grid-area:2/2; padding-inline-start:8px; }
  .kl-group-avatar-stack>.kl-social-author { display:block; }
  .kl-group-management .kl-group-member { gap:8px; }
}
`;
