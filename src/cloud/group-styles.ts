/** Group conversations use the same surfaces, accent and geometry as Direct. */
export const GROUP_CHAT_STYLES = `
.kl-group-attachments { display:flex; flex-wrap:wrap; gap:8px; min-width:0; }
.kl-group-attachment { position:relative; width:68px; height:68px; flex:0 0 68px; border:1px solid var(--kl-border); border-radius:10px; overflow:hidden; }
.kl-group-attachment .kl-cloud-image { width:100%; height:100%; min-height:0; margin:0; }
.kl-group-attachment .kl-cloud-image-wrap { display:block; width:100%; height:100%; min-height:0; }
.kl-group-attachment img { width:100%; height:100%; object-fit:cover; }
.kl-group-attachment > button { position:absolute; inset:2px 2px auto auto; min-width:24px; min-height:24px; padding:3px; background:var(--kl-surface); border:1px solid var(--kl-border); border-radius:50%; }
.kl-group-upload { display:flex; align-items:center; flex-wrap:wrap; gap:6px; min-width:0; }
.kl-group-upload:has(.kl-group-upload-status:empty):has(button[hidden]+button[hidden]) { display:none; }
.kl-group-upload-status { font-size:var(--kl-type-xs); color:var(--kl-muted); overflow-wrap:anywhere; }
.kl-group-message-images { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr)); gap:6px; max-width:420px; min-width:0; }
.kl-group-message-images .kl-cloud-image { margin:0; min-width:0; max-width:100%; max-height:280px; border-radius:8px; overflow:hidden; }
.kl-group-message-images img { display:block; width:100%; max-height:280px; object-fit:contain; }
.kl-cloud-group-menu { position: fixed; inset: auto; margin: 0; width: min(220px, calc(100vw - 16px)); max-width:var(--kl-surface-width,calc(100vw - 16px)); max-height:var(--kl-surface-height,calc(100dvh - 16px)); overflow:auto; padding: 8px; border: 1px solid var(--kl-border-strong); border-radius: 12px; background: var(--kl-surface); color: var(--kl-text); box-shadow: 0 12px 40px #0006; }
.kl-cloud-group-menu::backdrop { background: #0002; }
.kl-cloud-group-menu button:not(.kl-mailbox-icon-button) { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 40px; text-align: left; }
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
.kl-group-header { display:flex; align-items:center; flex:none; min-width:0; gap:8px; padding:10px 12px; min-height:62px; border-bottom:1px solid var(--kl-border); background:var(--kl-topbar-bg); }
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
.kl-group-history-tools { position:relative; flex:none; align-self:flex-end; margin:2px 8px; color:var(--kl-muted); font-size:var(--kl-type-sm); }
.kl-group-history-tools>summary { cursor:pointer; min-height:30px; padding:6px 8px; border-radius:6px; }
.kl-group-history-tools>summary:hover,.kl-group-history-tools[open]>summary { background:var(--kl-surface-hover); color:var(--kl-text); }
.kl-group-history-actions { position:absolute; z-index:8; inset-inline-end:0; top:100%; display:grid; min-width:190px; max-width:calc(100vw - 32px); max-height:180px; overflow:auto; padding:5px; border:1px solid var(--kl-border); border-radius:8px; background:var(--kl-surface); box-shadow:var(--kl-shadow); }
.kl-group-history-actions>.kl-text-button { min-height:34px; justify-content:flex-start; text-align:left; white-space:normal; }
.kl-group-history { display:flex; flex-direction:column; flex:1; min-height:0; overflow:auto; gap:10px; padding:12px; overscroll-behavior:contain; overflow-anchor:none; scrollbar-width:thin; scrollbar-color:var(--kl-border-strong) transparent; }
.kl-group-load { align-self:center; flex:none; }
.kl-group-message { position:relative; display:grid; grid-template-columns:36px minmax(0,1fr); grid-template-rows:auto auto; gap:3px 8px; width:100%; max-width:100%; min-width:0; align-self:flex-start; flex:none; padding:0; border:0; border-radius:0; background:transparent; }
.kl-group-message[data-own="true"] { align-self:flex-end; grid-template-columns:0 minmax(0,1fr); column-gap:0; border:0; background:transparent; }
.kl-group-message>.kl-social-author { display:contents; }
.kl-cloud .kl-group-message .kl-social-avatar { grid-area:1/1/3/2; width:36px; min-width:36px; height:36px; min-height:36px; }
.kl-group-message .kl-social-author-copy { grid-area:1/2; display:flex; align-items:baseline; flex-wrap:wrap; gap:4px 8px; }
.kl-group-message .kl-social-meta>span:not(.kl-message-stamp) { display:none; }
.kl-group-message .kl-social-meta time::before { content:none; }
.kl-cloud .kl-group-message .kl-social-name { font-size:12px; min-height:22px; }
.kl-group-message .kl-social-meta { font-size:10px; }
.kl-group-message .kl-social-meta .kl-message-stamp { display:inline-grid; }
.kl-group-message[data-own="true"] .kl-social-meta { color:color-mix(in srgb,var(--kl-accent-foreground),transparent 32%); }
.kl-group-message[data-own="true"] .kl-social-avatar { display:none; }
.kl-group-message[data-own="true"] .kl-social-author-copy { justify-content:flex-end; }
.kl-group-message-line { grid-area:2/2; min-width:0; width:min(88%,480px); justify-self:start; }
.kl-group-message[data-own="true"] .kl-group-message-line { justify-self:end; }
.kl-group-message-bubble { min-width:0; max-width:100%; padding:8px 10px 5px; border:1px solid var(--kl-border); border-radius:9px 9px 9px 3px; background:var(--kl-panel-raised); }
.kl-group-message[data-own="true"] .kl-group-message-bubble { border-color:#d719323d; border-radius:9px 9px 3px 9px; background:#d7193217; color:var(--kl-accent-foreground); }
.kl-group-message .kl-group-message-text { padding:0; margin:0; font-size:var(--kl-type-body); line-height:1.55; white-space:pre-wrap; overflow-wrap:anywhere; }
.kl-group-message-menu { position:absolute; z-index:10; display:grid; width:min(240px,calc(100% - 16px)); max-height:calc(100% - 16px); overflow:auto; padding:6px; box-sizing:border-box; border:1px solid var(--kl-border); border-radius:14px; background:var(--kl-surface); box-shadow:0 12px 36px #0005; }
.kl-group-message-menu .kl-social-button { justify-content:flex-start; border-color:transparent; }
.kl-group-message>.kl-social-confirm { grid-column:1/-1; }
.kl-group-composer { position:static; flex:none; display:flex; flex-direction:column; gap:8px; padding:10px 12px; border:0; border-top:1px solid var(--kl-border); border-radius:0; background:var(--kl-panel); box-shadow:none; }
.kl-group-compose-main { display:flex; align-items:stretch; gap:8px; min-width:0; }
.kl-group-compose-main>.kl-social-icon-button { width:40px; flex:none; }
.kl-cloud .kl-group-input { flex:1; min-width:0; min-height:58px; height:58px; max-height:120px; padding:8px 10px; border:1px solid var(--kl-border); border-radius:7px; resize:vertical; font-size:var(--kl-type-body); line-height:1.6; }
.kl-group-compose-actions { display:flex; justify-content:space-between; gap:8px; }
.kl-group-compose-main>.kl-social-primary { flex:none; min-height:44px; background:var(--kl-accent); border-color:var(--kl-accent); color:var(--kl-accent-foreground); border-radius:10px; }
.kl-group-compose-actions>small,.kl-group-compose-actions>.kl-composer-count { font-size:10px; }
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

.kl-content-dialog.kl-group-options-dialog { width:540px; background:var(--kl-surface); padding:0; overflow:hidden; border-radius:12px; margin:auto; }
.kl-content-dialog.kl-group-options-dialog::backdrop { background:#030303b8; }
.kl-content-dialog.kl-group-options-dialog[open] { display:flex; flex-direction:column; }
.kl-group-options-dialog > .kl-dialog-header { flex:none; row-gap:0; column-gap:12px; padding:12px 16px; display:grid; grid-template-columns:minmax(0,1fr) auto; background:var(--kl-surface); }
.kl-group-options-dialog > .kl-dialog-header::before { content:'KIKILINK'; grid-area:1 / 1; font:400 10px/1.7 var(--kl-font,system-ui); color:color-mix(in srgb,var(--kl-text) 58%,transparent); letter-spacing:.25px; }
.kl-group-options-dialog .kl-dialog-title { grid-area:2 / 1; font:700 16px/1.4 var(--kl-font,system-ui); }
.kl-content-dialog.kl-group-options-dialog > .kl-dialog-header > .kl-icon-button { grid-area:1 / 2 / 3 / 3; width:32px; height:32px; min-width:32px; min-height:32px; padding:0; color:var(--kl-muted); background:transparent; border:0; }
.kl-content-dialog.kl-group-options-dialog > .kl-dialog-header > .kl-icon-button svg { width:16px; height:16px; }
.kl-group-options-dialog > .kl-dialog-body { display:flex; flex-direction:column; min-height:0; padding:0; overflow:hidden; }
.kl-group-option-layout { min-height:0; display:flex; flex-direction:column; }
.kl-group-option-body { min-height:0; overflow:auto; overscroll-behavior:contain; padding:16px; color:var(--kl-text); font-size:12px; line-height:1.5; }
.kl-group-option-body p { margin:0; } .kl-group-option-body h3 { margin:0; font-size:13px; font-weight:650; }
.kl-group-option-layout > .kl-dialog-actions { flex:none; flex-wrap:wrap; display:flex; align-items:center; gap:8px; justify-content:flex-end; padding:12px 16px; border-top:1px solid var(--kl-border); background:var(--kl-input-bg); }
.kl-group-option-layout > .kl-dialog-actions > :first-child:not(:last-child) { margin-right:auto; }
.kl-group-option-body .kl-group-option-error:not(:empty) { margin-top:10px; color:var(--kl-danger,var(--kl-text)); }
.kl-group-option-member,.kl-group-option-candidate { min-height:48px; display:flex; align-items:center; gap:8px; padding:7px 0; border-bottom:1px solid var(--kl-border); }
.kl-group-option-member > .kl-social-author { flex:1; min-width:0; }
.kl-group-option-member .kl-social-meta { display:none; }
.kl-group-options-dialog small { display:block; color:var(--kl-muted); font-size:11px; }
.kl-group-option-member > svg { width:16px; height:16px; color:var(--kl-gold); }
.kl-group-option-members { margin-top:12px; }
.kl-group-option-members .kl-group-option-member { min-height:0; padding:10px 0; gap:9px; }
.kl-group-option-members .kl-group-option-member:last-child { border-bottom:0; }
.kl-group-option-member .kl-social-author { gap:9px; }
.kl-group-option-member .kl-social-avatar { flex:none; width:32px; height:32px; min-width:32px; min-height:32px; padding:0; border:1px solid var(--kl-border-strong); }
.kl-group-option-member .kl-social-initials { font-size:10px; }
.kl-group-option-member .kl-social-author-copy { display:block; flex:1; font-weight:700; }
.kl-group-option-member .kl-social-author-name { display:inline-flex; vertical-align:middle; gap:5px; font-weight:700; }
.kl-group-option-member .kl-feed-administrator { flex:0 0 13px; width:13px; height:15px; }
.kl-group-option-member .kl-feed-administrator svg { width:13px; height:13px; }
.kl-group-option-member .kl-social-name { min-height:0; padding:0; border:0; color:inherit; background:none; font:inherit; font-weight:700; text-align:start; overflow-wrap:anywhere; }
.kl-group-option-member small { margin-top:3px; font-size:10px; font-weight:400; line-height:1.6; }
.kl-group-member-badge { font-size:10px; line-height:1.4; color:var(--kl-muted); padding:2px 6px; border:1px solid var(--kl-border); border-radius:4px; }
.kl-content-dialog.kl-group-options-dialog .kl-group-option-profile { flex:none; min-height:0; height:auto; padding:0; color:inherit; background:none; border:0; font:inherit; font-size:11px; }
.kl-group-option-profile:hover { text-decoration:underline; }
.kl-content-dialog.kl-group-options-dialog .kl-dialog-actions > .kl-text-button { min-height:36px; height:36px; padding:0 12px; border:1px solid var(--kl-border); border-radius:8px; font:650 12px/1.5 var(--kl-font,system-ui); }
.kl-content-dialog.kl-group-options-dialog .kl-dialog-actions > .kl-text-button:first-child { background:transparent; }
.kl-content-dialog.kl-group-options-dialog .kl-dialog-actions > .kl-text-button--primary { border-color:color-mix(in srgb,var(--kl-accent) 58%,var(--kl-muted)); }
.kl-content-dialog.kl-group-options-dialog .kl-dialog-actions > .kl-group-option-danger { color:var(--kl-danger,#ff8da0); border-color:color-mix(in srgb,var(--kl-danger,#ff8da0) 36%,transparent); background:color-mix(in srgb,var(--kl-danger,#ff8da0) 7%,transparent); }
.kl-content-dialog.kl-group-options-dialog {border:1px solid var(--kl-border-strong,var(--kl-border));}
.kl-group-option-fields { border:0; margin:0; padding:0; min-width:0; }
.kl-group-option-fields label,.kl-group-option-fields strong { font-size:12px; }
.kl-group-option-name { display:grid; gap:6px; }
.kl-group-option-name > span { font-weight:550; }
.kl-group-option-name input { padding:8px 10px; background:var(--kl-input-bg); color:var(--kl-text); border:1px solid var(--kl-border); border-radius:7px; font:inherit; }
.kl-group-option-name input:focus-visible,.kl-group-option-search:focus-within { outline:2px solid color-mix(in srgb,var(--kl-accent) 48%,var(--kl-text)); outline-offset:2px; border-color:color-mix(in srgb,var(--kl-accent) 58%,var(--kl-muted)); }
.kl-group-option-fields > .kl-group-option-name > small,.kl-group-option-avatar > small,.kl-group-option-fields section > small,.kl-group-option-fields section header small { font-size:10px; line-height:1.5; color:color-mix(in srgb,var(--kl-text) 58%,transparent); }
.kl-group-option-avatar > small,.kl-group-option-fields section > small { margin-top:8px; }
.kl-group-option-fields input:not([type=checkbox]) { box-sizing:border-box; width:100%; min-width:0; }
.kl-group-option-avatar { background:var(--kl-input-bg); margin-top:12px; padding:12px; border:1px solid var(--kl-border); border-radius:10px; }
.kl-group-option-avatar[hidden],.kl-group-option-avatar [hidden],.kl-group-editor-thumbnail:empty { display:none; }
.kl-group-option-avatar label:not([hidden]) { display:grid; gap:8px; }
.kl-group-option-avatar input[type=file] { height:auto; min-height:34px; padding:0; border:0; background:transparent; color:var(--kl-muted); font:inherit; font-size:11px; line-height:34px; }
.kl-group-option-avatar input::file-selector-button { height:34px; margin-right:8px; padding:0 12px; color:var(--kl-text); background:var(--kl-surface-2); border:1px solid var(--kl-border-strong); border-radius:8px; font:inherit; cursor:pointer; }
.kl-group-editor-thumbnail:not(:empty) { display:block; position:relative; width:56px; height:56px; overflow:hidden; border-radius:50%; }
.kl-group-editor-thumbnail img { width:56px; height:56px; border-radius:50%; object-fit:cover; }
.kl-group-option-fields section { margin-top:16px; padding-top:16px; border-top:1px solid var(--kl-border); }
.kl-group-option-fields section header { display:flex; align-items:baseline; justify-content:space-between; gap:12px; margin-bottom:8px; }
.kl-group-option-fields section header h3 { font-size:12px; }
.kl-group-option-fields .kl-group-option-member { padding:8px 0; gap:8px; }
.kl-group-option-fields .kl-social-author { gap:8px; }
.kl-group-option-fields .kl-social-author-name { display:flex; }
.kl-group-option-fields .kl-social-name:hover { text-decoration:none; }
.kl-group-option-fields .kl-group-option-member:last-child { border-bottom:0; }
.kl-group-option-fields .kl-group-option-member > svg { box-sizing:content-box; padding:5px; }
.kl-group-option-fields .kl-group-option-member .kl-text-button { flex:none; min-height:36px; height:36px; padding:0 12px; border:1px solid var(--kl-border); border-radius:8px; background:transparent; font-family:inherit; line-height:1.5; font-size:11px; font-weight:550; }
.kl-group-member-removed .kl-social-name { color:var(--kl-muted); text-decoration:line-through; }
.kl-group-option-search { min-width:0; display:flex; align-items:center; gap:8px; height:36px; padding:0 10px; border:1px solid var(--kl-border); border-radius:7px; background:var(--kl-input-bg); }
.kl-group-option-search svg { flex:none; width:15px; height:15px; color:var(--kl-muted); }
.kl-group-option-search input { align-self:stretch; padding:0; border:0; outline:0; color:var(--kl-text); background:transparent; font:inherit; }
.kl-group-option-candidates { max-height:220px; margin-top:8px; overflow:auto; overscroll-behavior:contain; scrollbar-gutter:stable; }
.kl-group-option-candidate { min-height:52px; gap:8px; padding:8px; margin:2px 0; border:1px solid transparent; border-radius:8px; cursor:pointer; }
.kl-group-option-candidate:hover { background:var(--kl-surface-hover); }
.kl-group-option-candidate:has(input:checked) { background:color-mix(in srgb,var(--kl-accent) 8%,var(--kl-surface)); border-color:color-mix(in srgb,var(--kl-accent) 42%,var(--kl-border)); }
.kl-group-option-candidate > .kl-group-candidate-avatar { overflow:hidden; position:relative; flex:0 0 32px; width:32px; min-width:32px; height:32px; min-height:32px; padding:0; display:grid; place-items:center; border-radius:50%; border:1px solid var(--kl-border-strong); font-size:10px; font-weight:600; }
.kl-group-option-candidate > span:nth-child(2) { flex:1; min-width:0; }
.kl-group-option-candidate strong,.kl-group-option-candidate small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.kl-group-option-candidate strong { font-weight:550; }
.kl-group-option-candidate small { margin-top:1px; font-size:10px; line-height:1.7; }
.kl-group-option-candidate input { margin:0; flex:0 0 16px; width:16px; height:16px; }
.kl-group-option-candidates > p { margin:12px 8px; color:var(--kl-muted); }
@media (max-width:600px) {
 .kl-group-option-candidates { max-height:200px; }
 .kl-group-option-candidate { min-height:56px; }
}
@media (max-height:500px) { .kl-group-option-candidates { max-height:150px; } }
.kl-cloud-group-menu.kl-chat-options-menu button[role=menuitem] { min-height:34px; height:34.5px; gap:8px; padding:9px 10px; }
.kl-cloud-group-menu.kl-chat-options-menu button[role=menuitem] > svg.kl-icon { width:14px; height:14px; }
@media (max-width:700px), (max-width:900px) and (max-height:500px), (pointer:coarse) {
 .kl-cloud-group-menu.kl-chat-options-menu button[role=menuitem] { min-height:40px; height:40px; }
 .kl-group-option-body { padding:12px; }
 .kl-group-option-name input { font-size:16px; }
 .kl-group-option-search,.kl-group-option-fields .kl-group-option-member .kl-text-button { min-height:40px; height:40px; }
 .kl-group-options-dialog .kl-dialog-title { font-size:15px; }
 .kl-content-dialog.kl-group-options-dialog > .kl-dialog-header > .kl-icon-button { width:40px; height:40px; min-width:40px; min-height:40px; }
 .kl-content-dialog.kl-group-options-dialog .kl-dialog-actions > .kl-text-button { min-height:40px; height:40px; }
 .kl-group-options-dialog > .kl-dialog-header,.kl-group-option-layout > .kl-dialog-actions { padding:10px 12px; }
}
`;
