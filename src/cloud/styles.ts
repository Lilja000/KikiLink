import { APPEARANCE_STYLES } from "../modules/link-chat/appearance-renderer";
import { GROUP_CHAT_STYLES } from "./group-styles";

import { TEXT_FORMAT_STYLES } from "../modules/link-chat/text-format";
import { MENTION_PICKER_STYLES } from './mention-picker';
import { FEED_SPOILER_STYLES } from "./feed-spoilers";
import { FEED_IDENTITY_STYLES } from "./feed-identity-styles";

const FEED_TOUCH_STYLES = `
  .kl-feed-filter .kl-social-button,.kl-feed-poll-editor-option>.kl-social-icon-button,.kl-feed-poll-settings>.kl-social-button,.kl-feed-poll-settings select,.kl-feed-poll-actions>.kl-social-button,.kl-feed-undo>.kl-social-button,.kl-feed-undo>.kl-social-icon-button,.kl-comment-reply-bar>.kl-social-icon-button { min-height:44px; }
  .kl-feed-poll-editor-option { grid-template-columns:minmax(0,1fr) 44px; }
  .kl-feed-poll-editor-option>.kl-social-icon-button,.kl-feed-undo>.kl-social-icon-button,.kl-comment-reply-bar>.kl-social-icon-button { width:44px; height:44px; }
  .kl-feed-attachment-spoiler,.kl-feed-discard,.kl-cloud .kl-comment-spoiler-tool,.kl-cloud .kl-comment-parent { min-height:44px !important; }
  .kl-cloud label.kl-feed-poll-choice,.kl-cloud .kl-feed-check { min-height:44px; }
  .kl-comment-thread { margin-inline-start:6px; padding-inline-start:8px; }
`;

export const CLOUD_STYLES = `
${MENTION_PICKER_STYLES}
${TEXT_FORMAT_STYLES}
${FEED_SPOILER_STYLES}
${FEED_IDENTITY_STYLES}
.kl-cloud { min-width:0; min-height:0; overflow:auto; padding:20px; display:flex; flex-direction:column; gap:16px; }
.kl-cloud[hidden] { display:none !important; }
.kl-cloud-bar,.kl-cloud-actions { display:flex; align-items:center; flex-wrap:wrap; gap:8px; min-width:0; }
.kl-cloud-bar { justify-content:space-between; }
.kl-cloud-body { display:grid; gap:14px; width:100%; max-width:920px; min-width:0; margin-inline:auto; }
.kl-friend-action-review { min-width:0; overflow-wrap:anywhere; }
.kl-roster-page > .kl-friend-action-review { max-height:min(38vh,320px); overflow:auto; flex:0 0 auto; padding:8px 16px; }
.kl-cloud-card { background:var(--kl-surface); border:1px solid var(--kl-border); border-radius:16px; padding:18px; display:grid; gap:12px; min-width:0; overflow-wrap:anywhere; }
.kl-cloud h2,.kl-cloud h3,.kl-cloud-card p { margin:0; }
.kl-cloud p,.kl-cloud-card p { white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.55; }
.kl-cloud small,.kl-cloud-note { color:var(--kl-muted); font-size:var(--kl-type-body); }
.kl-cloud button,.kl-cloud-card button { min-height:44px; max-width:100%; white-space:normal; overflow-wrap:anywhere; }
.kl-cloud button[aria-current="page"] { border-color:var(--kl-gold); color:var(--kl-gold); }
.kl-cloud textarea,.kl-cloud input,.kl-cloud select,.kl-cloud-card input,.kl-cloud-card textarea { color:var(--kl-text); background:var(--kl-input-bg); border:1px solid var(--kl-border); border-radius:9px; padding:10px; box-sizing:border-box; font:inherit; min-width:0; width:100%; }
.kl-cloud textarea { min-height:90px; max-height:300px; resize:vertical; }
.kl-cloud label { display:grid; gap:6px; min-width:0; font-size:var(--kl-type-body); }
.kl-cloud input[type="file"] { min-height:44px; }
.kl-cloud input[type="checkbox"] { width:18px; height:18px; }
.kl-cloud .kl-cloud-check { display:flex; align-items:center; min-height:44px; gap:8px; }
.kl-cloud-status { color:var(--kl-gold); min-width:0; overflow-wrap:anywhere; }
.kl-cloud-status:empty { display:none; }
.kl-cloud-images { display:grid; gap:8px; grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr)); }
.kl-cloud-image { max-width:100%; width:100%; height:auto; max-height:400px; object-fit:contain; border-radius:10px; }
.kl-cloud-avatar { width:72px; height:72px; border-radius:50%; object-fit:cover; justify-self:start; }
.kl-cloud-banner { width:100%; max-height:200px; object-fit:cover; border-radius:12px; }
.kl-cloud-profile { min-width:0; }
.kl-cloud-profile[data-style="garden"] { background:linear-gradient(140deg,var(--kl-surface),#3b282538); }
.kl-cloud-profile[data-style="midnight"] { background:linear-gradient(140deg,var(--kl-surface),#30254838); }
.kl-cloud-message { border-left:2px solid var(--kl-border); padding:8px 12px; display:grid; gap:6px; min-width:0; }
:host([data-density="compact"]) .kl-cloud { padding:14px; gap:12px; }
:host([data-density="super-compact"]) .kl-cloud { padding:10px; gap:10px; }
:host([data-density="super-compact"]) .kl-cloud-card { padding:12px; border-radius:12px; }
.kl-cloud { container-type:inline-size; scroll-behavior:smooth; }
.kl-cloud-body { max-width:1120px; }
.kl-cloud-bar h2 { font-size:clamp(22px,3vw,30px); letter-spacing:-.04em; }
.kl-cloud-bar small { text-transform:uppercase; letter-spacing:.14em; font-size:10px; }
.kl-cloud-tabs { padding-bottom:12px; border-bottom:1px solid var(--kl-border); }
.kl-cloud-card { box-shadow:0 3px 18px #00000008; }
.kl-cloud :is(button,summary,input,textarea):focus-visible,.kl-unified-profile :is(button,input):focus-visible { outline:2px solid var(--kl-gold); outline-offset:3px; }
.kl-cloud :is(button,summary) { -webkit-tap-highlight-color:transparent; }
.kl-cloud :is(button,summary)[disabled] { opacity:.5; cursor:wait; }
.kl-cloud [hidden] { display:none !important; }
.kl-social-button,.kl-social-icon-button { display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:8px 12px; border:1px solid var(--kl-border); border-radius:12px; background:var(--kl-input-bg); color:var(--kl-text); font:inherit; font-size:13px; font-weight:600; cursor:pointer; transition:background .15s,border-color .15s; }
.kl-social-button:hover,.kl-social-icon-button:hover { border-color:var(--kl-gold); background:color-mix(in srgb,var(--kl-gold) 9%,var(--kl-surface)); }
.kl-social-button .kl-icon,.kl-social-icon-button .kl-icon { width:18px; height:18px; flex:none; }
.kl-social-primary { border-color:var(--kl-gold); background:var(--kl-gold); color:#1b1510; }
.kl-social-primary:hover { background:color-mix(in srgb,var(--kl-gold) 85%,white); }
.kl-social-danger { color:#f77988; }
.kl-social-icon-button { width:44px; height:44px; padding:10px; flex:none; }
.kl-social-icon-button>span { position:absolute; width:1px; height:1px; padding:0; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
.kl-social-author { display:flex; align-items:center; gap:10px; min-width:0; }
.kl-cloud .kl-social-avatar { position:relative; width:44px; height:44px; min-width:44px; min-height:44px; padding:0; border:1px solid var(--kl-border); border-radius:50%; overflow:hidden; flex:none; background:linear-gradient(140deg,color-mix(in srgb,var(--kl-gold) 20%,var(--kl-surface)),var(--kl-surface)); color:var(--kl-gold); display:grid; place-items:center; cursor:pointer; }
.kl-social-avatar-media { position:absolute; inset:0; display:grid; place-items:center; border-radius:inherit; overflow:hidden; pointer-events:none; }
.kl-social-avatar-image { width:100%; height:100%; object-fit:cover; }
.kl-social-initials { font-size:15px; font-weight:700; letter-spacing:.02em; }
.kl-cloud-skeleton,.kl-social-avatar-media[data-state="loading"],.kl-cloud-image-wrap[data-state="loading"] { background:color-mix(in srgb,var(--kl-muted) 12%,var(--kl-surface)); }
.kl-cloud-skeleton { display:block; width:100%; height:100%; border-radius:inherit; }
.kl-social-name[data-loading="true"] { width:8ch !important; border-radius:4px; background:color-mix(in srgb,var(--kl-muted) 12%,var(--kl-surface)) !important; }
.kl-cloud-image-wrap[data-state="loading"] { min-height:100px; border-radius:10px; }
.kl-cloud-image-wrap[data-state="loading"]>button { visibility:hidden; }
.kl-cloud-image-wrap[data-state="loading"]::before { content:""; display:block; min-height:inherit; }
.kl-social-avatar-media[data-state="error"] { background:none; }
.kl-social-author-copy { min-width:0; display:grid; gap:2px; }
.kl-social-author-name { display:flex; align-items:center; gap:4px; min-width:0; max-width:100%; width:fit-content; }
.kl-social-author-name .kl-social-name { min-width:0; flex:0 1 auto; }
.kl-feed-administrator { display:inline-flex; align-items:center; justify-content:center; flex:0 0 14px; width:14px; height:14px; color:var(--kl-text); }
.kl-feed-administrator svg { width:14px; height:14px; }
.kl-cloud .kl-social-name { border:0; padding:0; min-height:24px; width:fit-content; max-width:100%; background:none; text-align:start; font:inherit; font-size:14px; line-height:1.4; font-weight:700; color:var(--kl-text); cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.kl-social-name:hover { text-decoration:underline; text-underline-offset:3px; }
.kl-social-meta { display:flex; align-items:center; flex-wrap:wrap; column-gap:7px; color:var(--kl-muted); font-size:11px; line-height:1.4; }
.kl-social-meta time::before { content:'\xB7'; margin-inline-end:7px; }
.kl-social-menu { position:relative; margin-inline-start:auto; flex:none; align-self:start; }
.kl-social-menu>summary,.kl-reaction-picker>summary { display:flex; align-items:center; justify-content:center; width:40px; min-height:44px; padding:0; border:1px solid transparent; border-radius:10px; color:var(--kl-muted); cursor:pointer; list-style:none; }
.kl-social-menu>summary::-webkit-details-marker,.kl-reaction-picker>summary::-webkit-details-marker { display:none; }
.kl-social-menu>summary .kl-icon { width:20px; height:20px; }
.kl-social-menu[open]>summary,.kl-social-menu>summary:hover { background:var(--kl-input-bg); color:var(--kl-text); }
.kl-social-menu-items { position:absolute; inset-inline-end:0; top:calc(100% + 4px); z-index:8; width:min(220px,70vw); display:grid; padding:6px; border:1px solid var(--kl-border); border-radius:14px; background:var(--kl-surface); box-shadow:0 12px 36px #0005; }
.kl-social-menu-items .kl-social-button { justify-content:flex-start; text-align:start; border-color:transparent; background:transparent; }
.kl-social-confirm,.kl-social-editor { display:flex; flex-wrap:wrap; gap:8px; align-items:center; border:1px solid var(--kl-border); padding:12px; border-radius:12px; background:var(--kl-input-bg); }
.kl-social-confirm strong { flex:1 0 100%; font-size:14px; }
.kl-social-editor textarea { flex:1 0 100%; }
.kl-feed-layout { display:grid; grid-template-columns:minmax(0,1fr) 250px; gap:24px; align-items:start; }
.kl-feed-main,.kl-feed-posts { display:grid; gap:16px; min-width:0; }
.kl-feed-layout[data-focused-post="true"] { grid-template-columns:minmax(0,1fr); }
.kl-feed-layout[data-saved="true"] { grid-template-columns:minmax(0,1fr); width:100%; max-width:1000px; margin-inline:auto; }
.kl-saved-intro { display:flex; align-items:center; gap:16px; }
.kl-saved-intro > svg { width:28px; height:28px; flex:none; color:var(--kl-accent); }
.kl-saved-intro h3 { margin:0 0 6px; }
.kl-saved-intro p { margin:0; }
.kl-feed-post[data-featured="true"] { border-color:var(--kl-gold); }
.kl-feed-highlights { display:flex; flex-wrap:wrap; gap:8px; color:var(--kl-gold); font-size:var(--kl-type-xs); font-weight:650; }
.kl-feed-highlights>span { display:inline-flex; align-items:center; gap:5px; }
.kl-feed-highlights .kl-icon { width:13px; height:13px; }
.kl-comment-header { display:flex; align-items:start; gap:8px; min-width:0; }
.kl-comment-header>.kl-social-author { flex:1; min-width:0; }
.kl-highlighted-comment { outline:1px solid var(--kl-gold); outline-offset:2px; }
.kl-reaction-details-dialog { width:min(480px,calc(100vw - 24px)); max-width:calc(100vw - 24px); }
.kl-reaction-details { display:grid; gap:10px; min-width:0; }
.kl-reaction-details-dialog .kl-reaction-details { padding:0; }
.kl-reaction-members { display:grid; gap:12px; max-height:55dvh; overflow:auto; overscroll-behavior:contain; }
.kl-reaction-member { display:flex; align-items:center; justify-content:space-between; gap:12px; min-width:0; }
.kl-reaction-member>.kl-social-author { min-width:0; flex:1; }
.kl-reaction-member-emoji { font-size:22px; flex:none; }
.kl-feed-aside { position:sticky; top:0; display:grid; align-content:start; grid-auto-rows:max-content; gap:16px; min-width:0; min-height:0; max-height:var(--kl-feed-aside-height,70dvh); overflow-y:auto; overscroll-behavior-y:contain; scrollbar-width:thin; }
.kl-feed-aside { mask-image:linear-gradient(to bottom,transparent,#000 var(--kl-feed-aside-fade-top,0px),#000 calc(100% - var(--kl-feed-aside-fade-bottom,0px)),transparent); }
.kl-feed-aside:focus-visible { outline:2px solid var(--kl-gold); outline-offset:3px; }
.kl-feed-self { background:linear-gradient(145deg,color-mix(in srgb,var(--kl-gold) 9%,var(--kl-surface)),var(--kl-surface)); }
.kl-feed-aside h3 { font-size:16px; line-height:1.4; }
.kl-feed-aside .kl-cloud-note { font-size:13px; }
.kl-feed-composer { gap:12px; padding:20px; }
.kl-feed-composer>textarea { border:0; border-radius:0; background:transparent; padding:4px 0; min-height:90px; font-size:16px; line-height:1.6; }
.kl-feed-compose-actions { display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding-top:10px; border-top:1px solid var(--kl-border); }
.kl-feed-compose-tools,.kl-feed-compose-submit { display:flex; align-items:center; gap:6px; min-width:0; }
.kl-feed-compose-tools { flex-wrap:wrap; }
.kl-feed-compose-tools>.kl-social-button { padding:8px 9px; background:transparent; border-color:transparent; }
.kl-feed-compose-tools>.kl-social-button:hover,.kl-feed-compose-tools>.kl-social-button[aria-pressed="true"] { border-color:var(--kl-border); background:var(--kl-input-bg); }
.kl-feed-compose-submit { margin-inline-start:auto; flex:none; gap:10px; }
.kl-composer-count { color:var(--kl-muted); font-size:11px; font-variant-numeric:tabular-nums; white-space:nowrap; }
.kl-feed-compose-hint { font-size:10px !important; line-height:1.5; }
.kl-feed-attachments { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; }
.kl-feed-attachments:empty { display:none; }
.kl-feed-attachment { position:relative; aspect-ratio:1; min-width:0; }
.kl-feed-attachment-image { width:100%; height:100%; overflow:hidden; border-radius:12px; background:var(--kl-input-bg); }
.kl-feed-attachment img { display:block; width:100%; height:100%; object-fit:cover; }
.kl-feed-attachment .kl-social-icon-button { position:absolute; top:4px; right:4px; width:44px; height:44px; min-height:44px; padding:11px; border-color:#ffffff30; border-radius:11px; color:#fff; background:#171323eb; }
.kl-feed-attachment .kl-social-icon-button:hover { border-color:#ffffff80; background:#262031; }
.kl-feed-tools { display:grid; gap:12px; }
.kl-feed-search-form { display:flex; gap:8px; align-items:center; }
.kl-feed-search-form .kl-feed-search { min-height:44px; border-radius:12px; flex:1; }
.kl-feed-filter-row { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
.kl-feed-filter { display:flex; flex-wrap:wrap; gap:2px; max-width:100%; padding:3px; background:var(--kl-input-bg); border:1px solid var(--kl-border); border-radius:14px; }
.kl-feed-filter .kl-social-button { background:transparent; border-color:transparent; min-height:38px; border-radius:10px; }
.kl-feed-filter .kl-social-button[aria-pressed="true"] { background:var(--kl-surface); color:var(--kl-gold); box-shadow:0 1px 5px #0002; }
.kl-feed-results:empty { display:none; }
.kl-feed-results { font-size:12px !important; }
.kl-feed-post { gap:16px; padding:20px; }
.kl-cloud .kl-feed-post > .kl-feed-community { display:inline-flex; align-items:center; align-self:flex-start; gap:5px; min-height:0; max-width:100%; padding:0; border:0; background:transparent; color:var(--kl-muted); font:inherit; font-size:11px; text-align:left; overflow-wrap:anywhere; }
.kl-feed-community .kl-icon { flex:none; width:13px; height:13px; }
.kl-cloud .kl-feed-post > button.kl-feed-community:hover { color:var(--kl-accent); }
.kl-feed-post-header { display:flex; justify-content:space-between; gap:8px; min-width:0; }
.kl-feed-post-header .kl-social-author { flex:1; }
.kl-feed-post-text { font-size:15px; line-height:1.7 !important; word-break:break-word; }
.kl-feed-post-text:empty { display:none; }
.kl-feed-post-text[data-collapsed="true"] { display:-webkit-box; -webkit-line-clamp:7; -webkit-box-orient:vertical; overflow:hidden; }
.kl-feed-action-form { padding:0; border:0; box-shadow:none; background:none; }
.kl-feed-action-form textarea { min-height:120px; max-height:40dvh; resize:vertical; line-height:1.55; }
.kl-feed-action-form .kl-cloud-actions { justify-content:flex-end; }
.kl-feed-action-error { color:var(--kl-danger); font-size:var(--kl-type-body); }
.kl-feed-action-error:empty { display:none; }
.kl-feed-action-dialog :is(button,textarea):focus-visible { outline:2px solid var(--kl-gold); outline-offset:3px; }
.kl-social-edited { font-size:10px !important; margin-top:-8px; }
.kl-feed-media { gap:5px; grid-template-columns:repeat(2,minmax(0,1fr)); border-radius:14px; overflow:hidden; }
.kl-feed-media[data-count="1"] { grid-template-columns:minmax(0,1fr); }
.kl-feed-media[data-count="3"]>:first-child { grid-column:1/-1; }
.kl-feed-media .kl-cloud-image-wrap { min-width:0; display:grid; background:var(--kl-input-bg); }
.kl-feed-media .kl-cloud-image { display:block; border-radius:0; width:100%; height:100%; max-height:480px; object-fit:contain; }
.kl-feed-media-slot { min-width:0; display:grid; background:var(--kl-input-bg); }
.kl-feed-media-slot>.kl-cloud-image-wrap { width:100%; height:100%; }
.kl-feed-spoiler-reveal { width:100%; min-height:150px !important; border:1px dashed var(--kl-border); border-radius:0; color:var(--kl-muted); background:linear-gradient(140deg,var(--kl-input-bg),var(--kl-surface)); }
.kl-feed-media[data-count="1"] .kl-feed-spoiler-reveal { min-height:220px !important; }
.kl-feed-attachment .kl-feed-attachment-spoiler { inset:auto 4px 4px auto; }
.kl-feed-attachment-spoiler .kl-icon { width:20px; height:20px; }
.kl-feed-attachment[data-spoiler="true"] img { filter:blur(6px); }
.kl-feed-attachment[data-spoiler="true"] .kl-feed-attachment-spoiler { border-color:var(--kl-gold); color:#1b1510; background:var(--kl-gold); }
.kl-feed-draft-row { display:flex; justify-content:space-between; gap:8px; align-items:center; min-width:0; }
.kl-feed-draft-status { font-size:10px !important; min-width:0; }
.kl-feed-draft-status[data-error="true"] { color:var(--kl-danger); }
.kl-feed-discard { font-size:10px; min-height:30px !important; flex:none; padding:4px 7px; color:var(--kl-muted); background:none; border-color:transparent; }
.kl-feed-discard .kl-icon { width:12px; height:12px; }
.kl-feed-discard:disabled { visibility:hidden; }
.kl-feed-poll-compose:empty,.kl-feed-edit-media:empty { display:none; }
.kl-feed-poll-compose { display:grid; gap:8px; }
.kl-feed-poll-compose>.kl-social-button { justify-self:start; font-size:11px; background:none; border-color:transparent; color:var(--kl-muted); }
.kl-feed-poll-editor,.kl-feed-poll { display:grid; gap:10px; min-width:0; padding:14px; border:1px solid var(--kl-border); border-radius:12px; background:var(--kl-input-bg); }
.kl-feed-poll h4 { margin:0; font-size:14px; line-height:1.5; font-weight:650; }
.kl-feed-poll-editor-options,.kl-feed-poll-options { display:grid; gap:7px; min-width:0; }
.kl-feed-poll-editor-option { display:grid; grid-template-columns:minmax(0,1fr) 34px; align-items:center; gap:5px; }
.kl-feed-poll-editor-option>.kl-social-icon-button { min-height:34px; width:34px; height:34px; }
.kl-feed-poll-settings,.kl-feed-poll-actions { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
.kl-feed-poll-settings>.kl-social-button,.kl-feed-poll-actions>.kl-social-button { min-height:34px; padding:6px 9px; font-size:11px; }
.kl-feed-poll-actions>.kl-social-primary { min-width:78px; }
.kl-feed-poll-actions>.kl-social-button:not(.kl-social-primary) { border-color:transparent; background:transparent; color:var(--kl-muted); }
.kl-feed-poll-actions>.kl-social-button:not(.kl-social-primary):hover { color:var(--kl-text); background:var(--kl-surface); }
.kl-cloud .kl-feed-poll-settings label,.kl-cloud .kl-feed-check,.kl-cloud-card .kl-feed-check { display:flex; align-items:center; gap:6px; font-size:11px; }
.kl-feed-poll-settings select { width:auto; min-height:34px; padding:4px 6px; font-size:11px; }
.kl-feed-poll-editor>.kl-cloud-note { font-size:10px; }
.kl-cloud label.kl-feed-poll-choice { display:flex; align-items:center; gap:9px; min-height:42px; padding:8px 10px; border:1px solid var(--kl-border); border-radius:9px; cursor:pointer; font-size:13px; background:var(--kl-surface); }
.kl-feed-poll-choice:has(input:checked) { border-color:var(--kl-gold); background:color-mix(in srgb,var(--kl-gold) 7%,var(--kl-surface)); }
.kl-feed-poll-choice input[type="radio"],.kl-feed-poll-choice input[type="checkbox"] { width:16px; height:16px; margin:0; flex:0 0 16px; accent-color:var(--kl-gold); }
.kl-feed-poll-result { position:relative; display:flex; gap:12px; align-items:center; justify-content:space-between; min-height:42px; padding:8px 10px; border:1px solid var(--kl-border); border-radius:9px; overflow:hidden; font-size:13px; background:var(--kl-surface); }
.kl-feed-poll-bar { position:absolute; inset:0 auto 0 0; background:color-mix(in srgb,var(--kl-gold) 12%,transparent); pointer-events:none; }
.kl-feed-poll-option-text,.kl-feed-poll-percent { position:relative; }
.kl-feed-poll-percent { color:var(--kl-muted); flex:none; font-size:11px; font-variant-numeric:tabular-nums; }
.kl-feed-poll-result[data-mine="true"] { border-color:color-mix(in srgb,var(--kl-gold) 65%,var(--kl-border)); }
.kl-feed-poll-meta { display:flex; flex-wrap:wrap; justify-content:space-between; gap:5px; color:var(--kl-muted); font-size:10px; }
.kl-feed-poll-actions:empty { display:none; }
.kl-feed-undo { display:flex; align-items:center; gap:8px; padding:10px 12px; border:1px solid var(--kl-border); background:var(--kl-input-bg); border-radius:12px; font-size:12px; }
.kl-feed-undo>span { flex:1; }
.kl-feed-undo>.kl-social-button { min-height:32px; font-size:11px; }
.kl-feed-undo>.kl-social-icon-button { width:30px; height:30px; min-height:30px; }
.kl-feed-edit-media { display:flex; flex-wrap:wrap; gap:12px; }
.kl-feed-post-actions { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; padding-top:10px; border-top:1px solid var(--kl-border); }
.kl-feed-post-actions>.kl-social-button { border-color:transparent; background:transparent; font-size:12px; color:var(--kl-muted); }
.kl-reactions { display:flex; align-items:center; flex-wrap:wrap; gap:4px; min-width:0; }
.kl-cloud .kl-reaction { display:inline-flex; align-items:center; justify-content:center; gap:5px; min-width:44px; min-height:44px; padding:5px 8px; border:1px solid var(--kl-border); border-radius:22px; font-size:12px; font-weight:600; background:transparent; color:var(--kl-muted); cursor:pointer; }
.kl-reaction>span:first-child { font-size:18px; line-height:1.5; }
.kl-cloud .kl-reaction[aria-pressed="true"] { border-color:var(--kl-gold); background:color-mix(in srgb,var(--kl-gold) 10%,var(--kl-surface)); color:var(--kl-gold); }
.kl-reaction-picker { position:relative; }
.kl-reaction-picker>summary { width:44px; font-size:21px; min-height:44px; border-radius:22px; }
.kl-reaction-picker>summary .kl-icon { width:22px; height:22px; flex:none; }
.kl-reaction-picker>summary:hover,.kl-reaction-picker[open]>summary { color:var(--kl-gold); background:var(--kl-input-bg); }
.kl-reaction-choices { position:absolute; bottom:calc(100% + 8px); inset-inline-start:0; z-index:9; display:grid; grid-template-columns:repeat(4,44px); gap:4px; padding:8px; max-height:min(272px,60dvh); overflow:auto; overscroll-behavior:contain; background:var(--kl-surface); border:1px solid var(--kl-border); border-radius:16px; box-shadow:0 8px 26px #0005; }
.kl-reaction-choices .kl-reaction { width:44px; height:44px; padding:0; border-color:transparent; border-radius:10px; }
.kl-reaction-choices .kl-reaction>span:first-child { font-size:23px; }
.kl-cloud .kl-reaction:hover { background:var(--kl-input-bg); border-color:var(--kl-border); }
.kl-cloud .kl-reaction[aria-pressed="true"]:hover { border-color:var(--kl-gold); }
.kl-cloud-comments { display:grid; gap:14px; padding-top:16px; border-top:1px solid var(--kl-border); }
.kl-comment-list { display:grid; gap:16px; }
.kl-comment-compose { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:end; }
.kl-cloud .kl-comment-compose textarea { min-height:66px; }
.kl-social-comment { display:grid; gap:8px; padding:12px; border-radius:14px; background:var(--kl-input-bg); }
.kl-social-comment>p { padding-inline-start:54px; font-size:14px; }
.kl-comment-actions { display:flex; flex-wrap:wrap; align-items:center; gap:4px; padding-inline-start:48px; }
.kl-comment-actions>.kl-social-button { padding:4px 8px; min-height:36px; font-size:11px; border-color:transparent; background:transparent; }
.kl-comment-thread { display:grid; gap:14px; margin-block-start:14px; margin-inline-start:18px; padding-inline-start:12px; border-inline-start:1px solid var(--kl-border); min-width:0; }
.kl-social-comment[data-reply="true"]>.kl-comment-header .kl-social-avatar { width:30px; height:30px; min-height:30px; flex:0 0 30px; }
.kl-cloud .kl-comment-parent { display:flex; max-width:100%; width:fit-content; padding:3px 6px; margin:4px 0 5px; border:0; background:none; color:var(--kl-muted); font-size:10px; min-height:26px; }
.kl-comment-parent .kl-icon { width:12px; height:12px; }
.kl-comment-reply-bar { display:flex; align-items:center; gap:6px; padding:5px 8px; border-inline-start:2px solid var(--kl-gold); background:var(--kl-input-bg); border-radius:0 7px 7px 0; font-size:11px; color:var(--kl-muted); }
.kl-comment-reply-bar:empty { display:none; }
.kl-comment-reply-bar>span { flex:1; min-width:0; }
.kl-comment-reply-bar>.kl-icon { flex:none; width:13px; height:13px; }
.kl-comment-reply-bar>.kl-social-icon-button { min-height:28px; width:28px; height:28px; }
.kl-cloud .kl-comment-spoiler-tool { justify-self:start; grid-column:1/-1; min-height:28px; padding:3px 6px; font-size:10px; color:var(--kl-muted); background:none; border-color:transparent; }
.kl-feed-empty { display:grid; gap:10px; text-align:center; padding:48px 20px; border:1px dashed var(--kl-border); border-radius:18px; color:var(--kl-muted); }
.kl-feed-empty h3 { color:var(--kl-text); font-size:18px; }
.kl-feed-empty p { font-size:13px; }
.kl-feed-more { justify-self:center; min-width:210px; margin-block:8px 16px; }
.kl-feed-loading { text-align:center; padding:20px; color:var(--kl-muted); font-size:13px; }
.kl-group-list { display:grid; gap:12px; }
.kl-group-list-tools { display:flex; align-items:center; gap:10px; }
.kl-group-tile { display:flex; align-items:center; gap:14px; padding:16px; }
.kl-group-tile-copy { display:grid; flex:1; gap:5px; min-width:0; }
.kl-group-tile-copy h3 { font-size:16px; }
.kl-group-emblem { width:48px; height:48px; border-radius:16px; display:grid; place-items:center; flex:none; color:var(--kl-gold); background:color-mix(in srgb,var(--kl-gold) 10%,var(--kl-input-bg)); }
.kl-group-emblem .kl-icon { width:24px; height:24px; }
.kl-group-create,.kl-group-members { display:block; }
.kl-group-create>summary,.kl-group-members>summary { cursor:pointer; min-height:44px; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:650; color:var(--kl-gold); }
.kl-group-create-content,.kl-group-member-list { display:grid; gap:14px; padding-top:12px; }
.kl-group-migration { display:grid; gap:10px; min-width:0; }
.kl-group-migration:empty { display:none; }
.kl-group-creation-editor { display:grid; gap:10px; min-width:0; overflow-wrap:anywhere; }
.kl-group-creation-editor input { width:100%; min-width:0; }
.kl-group-creation-editor button { min-height:40px; white-space:normal; }
.kl-group-migration>h4 { margin:4px 0 0; }
.kl-group-header { gap:8px; }
.kl-group-heading { display:flex; align-items:center; gap:12px; }
.kl-group-heading>h3 { flex:1; min-width:0; font-size:20px; }
.kl-group-member { display:flex; align-items:center; flex-wrap:wrap; gap:10px; padding:10px 0; border-top:1px solid var(--kl-border); }
.kl-group-member .kl-social-author { flex:1; min-width:140px; }
.kl-group-member .kl-social-button { font-size:12px; }
.kl-group-thread { min-width:0; display:grid; gap:14px; }
.kl-group-load { justify-self:center; }
.kl-group-history { display:grid; gap:18px; min-width:0; }
.kl-group-message { position:relative; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:6px 8px; padding:14px 16px; border-radius:18px; background:var(--kl-surface); border:1px solid var(--kl-border); }
.kl-group-message[data-own="true"] { border-color:color-mix(in srgb,var(--kl-gold) 30%,var(--kl-border)); background:color-mix(in srgb,var(--kl-gold) 4%,var(--kl-surface)); }
.kl-group-message>.kl-social-author { grid-area:1/1; }
.kl-group-message>.kl-social-menu { grid-area:1/2; }
.kl-group-message-text { grid-column:1/-1; padding-inline-start:54px; font-size:14px; }
.kl-group-message>.kl-social-confirm { grid-column:1/-1; }
.kl-group-composer { position:sticky; bottom:-1px; padding:14px; background:var(--kl-surface); border:1px solid var(--kl-border); border-radius:18px; box-shadow:0 -8px 24px #0000000c; display:grid; gap:8px; z-index:2; }
.kl-cloud .kl-group-input { min-height:78px; max-height:180px; border-color:transparent; background:var(--kl-input-bg); line-height:1.6; font-size:14px; }
.kl-group-retained-actions { display:grid; gap:8px; min-width:0; padding:12px; border:1px solid var(--kl-border); border-radius:12px; overflow-wrap:anywhere; }
.kl-group-retained-actions[hidden] { display:none; }
.kl-group-retained-actions textarea { width:100%; min-width:0; box-sizing:border-box; resize:vertical; }
.kl-group-retained-actions button { max-width:100%; white-space:normal; margin:4px; }
.kl-group-compose-actions { display:flex; align-items:center; flex-wrap:wrap; gap:8px; }
.kl-group-compose-actions>small { font-size:10px; }
.kl-group-new { justify-self:center; position:sticky; bottom:178px; z-index:3; box-shadow:0 4px 18px #0003; }
.kl-group-empty { padding:36px 16px; color:var(--kl-muted); text-align:center; font-size:14px; }
.kl-unified-profile { display:grid; gap:10px; padding:16px; border:1px solid var(--kl-border); border-radius:16px; background:linear-gradient(130deg,color-mix(in srgb,var(--kl-gold) 7%,var(--kl-surface)),var(--kl-surface)); }
.kl-unified-visibility { display:flex; align-items:center; gap:8px; font-size:12px; }
.kl-unified-profile input[type="checkbox"] { width:18px; height:18px; }
.kl-profile-sync-status { margin:0; font-size:12px; color:var(--kl-muted); line-height:1.5; }
.kl-unified-preview-image { display:block; width:100%; height:100%; max-height:200px; object-fit:cover; border-radius:inherit; }
.kl-unified-privacy { display:grid; gap:8px; font-size:12px; }
.kl-unified-privacy>summary { cursor:pointer; min-height:36px; }
.kl-cloud-profile { padding:24px; gap:14px; }
.kl-cloud-profile>.kl-cloud-image-wrap:first-child { margin:-24px -24px 0; width:calc(100% + 48px); }
.kl-cloud-profile .kl-cloud-banner { display:block; width:100%; max-height:220px; border-radius:16px 16px 0 0; object-fit:cover; }
.kl-cloud-profile>.kl-addon-profile-avatar { width:88px; height:88px; border:4px solid var(--kl-surface); box-shadow:0 4px 18px #0003; }
.kl-cloud-profile .kl-cloud-avatar { width:100%; height:100%; object-fit:cover; }
.kl-cloud-profile>h3 { font-size:26px; letter-spacing:-.03em; margin:0; }
.kl-cloud-profile>small { font-size:11px; letter-spacing:.08em; }
.kl-cloud-profile>.kl-social-button { justify-self:start; }
.kl-cloud[data-embedded="true"] { width:100%; box-sizing:border-box; height:100%; padding:16px; }
.kl-cloud[data-embedded="true"]>.kl-cloud-bar,.kl-cloud[data-embedded="true"]>.kl-cloud-tabs { display:none; }
.kl-layout[data-cloud-groups="true"]>.kl-main>:not(.kl-cloud) { display:none !important; }
.kl-cloud-group-list { grid-area:chats; overflow:auto; min-width:0; min-height:0; align-content:start; }
.kl-cloud-group-list[hidden],.kl-conversations[hidden],.kl-sidebar-heading-actions>[hidden] { display:none !important; }
.kl-cloud-group-row { display:grid; grid-template-columns:42px minmax(0,1fr) auto; gap:10px; align-items:center; width:100%; box-sizing:border-box; min-height:76px; padding:12px 10px; text-align:start; }
.kl-group-inbox-avatar { position:relative; width:42px; height:42px; font-size:15px; border-radius:14px; flex:none; overflow:visible; }
.kl-group-inbox-avatar .kl-group-inbox-mark { position:absolute; bottom:-4px; right:-4px; width:16px; height:16px; padding:2px; border-radius:50%; background:var(--kl-surface); color:var(--kl-gold); }
.kl-group-inbox-copy { display:grid; gap:5px; min-width:0; }
.kl-group-inbox-copy>strong,.kl-group-inbox-preview { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.kl-group-inbox-copy>strong { font-size:var(--kl-type-body); color:var(--kl-text); }
.kl-group-inbox-preview { font-size:var(--kl-type-sm); color:var(--kl-muted); }
.kl-group-inbox-copy[data-draft="true"] .kl-group-inbox-preview { color:var(--kl-gold); }
.kl-group-inbox-meta { display:grid; justify-items:end; gap:8px; font-size:10px; color:var(--kl-muted); }
.kl-group-unread-dot,.kl-chat-filter[data-unread="true"]::after { display:inline-block; width:7px; height:7px; border-radius:50%; background:var(--kl-gold); }
.kl-chat-filter[data-unread="true"]::after { content:""; margin-inline-start:6px; }
.kl-cloud-group-row[data-active="true"] { background:var(--kl-surface-2); border-color:var(--kl-gold); }
.kl-group-invitation { display:grid; gap:8px; padding:12px; margin-bottom:8px; border:1px solid var(--kl-border); border-radius:12px; overflow-wrap:anywhere; }
.kl-group-invitation small { color:var(--kl-muted); }
.kl-group-invitation .kl-social-button { min-height:40px; padding:6px 10px; }
.kl-group-empty>.kl-icon { width:52px; height:52px; color:var(--kl-gold); margin-bottom:14px; }
.kl-group-empty>.kl-social-button { margin-top:16px; }
.kl-addon-profile-avatar>.kl-cloud-image-wrap { position:absolute; inset:0; display:grid; place-items:center; border-radius:inherit; overflow:hidden; }
.kl-addon-profile-avatar>.kl-cloud-image-wrap[data-state="loading"] { min-height:0; }
.kl-addon-profile-avatar>.kl-cloud-image-wrap>button { font-size:10px; min-height:30px; padding:4px; }
.kl-addon-profile-banner>.kl-cloud-image-wrap { position:absolute; inset:0; display:grid; place-items:center; }
.kl-addon-profile-banner>.kl-cloud-image-wrap>img { width:100%; height:100%; object-fit:cover; }
.kl-feed-discussions h3 { display:flex; gap:8px; align-items:center; }
.kl-feed-discussions h3>.kl-icon { width:18px; height:18px; flex:none; }
.kl-circle-post { display:grid; gap:7px; padding-top:12px; border-top:1px solid var(--kl-border); min-width:0; }
.kl-cloud .kl-circle-post .kl-social-avatar { width:32px; height:32px; min-width:32px; min-height:32px; }
.kl-cloud .kl-circle-post .kl-social-name { font-size:12px; }
.kl-cloud .kl-circle-post-link { display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; text-align:start; font:inherit; font-size:13px; line-height:1.5; border:0; background:none; color:var(--kl-text); padding:0; min-height:32px; cursor:pointer; }
.kl-circle-post-link:hover { color:var(--kl-gold); }
.kl-circle-post>small { font-size:10px; }
.kl-preferences-editor {
  /* Keep the header usable even while closed. The profile body's non-shrinking
     column preserves the full content height when this disclosure is open. */
  min-width:0; min-height:64px; border:1px solid color-mix(in srgb,var(--kl-accent),var(--kl-border) 64%); border-radius:14px;
  background:color-mix(in srgb,var(--kl-accent),transparent 94%); overflow:hidden;
}
.kl-preferences-editor>summary { list-style:none; }
.kl-preferences-editor>summary::-webkit-details-marker { display:none; }
.kl-preferences-summary {
  min-height:62px; display:grid; grid-template-columns:38px minmax(0,1fr) auto 16px; align-items:center; gap:10px;
  padding:9px 12px; color:var(--kl-text); cursor:pointer;
}
.kl-preferences-summary:hover { background:var(--kl-surface-hover); }
.kl-preferences-summary-icon { width:36px; height:36px; display:grid; place-items:center; border:1px solid color-mix(in srgb,var(--kl-accent),transparent 50%); border-radius:11px; color:var(--kl-accent-strong); background:color-mix(in srgb,var(--kl-accent),transparent 89%); }
.kl-preferences-summary-icon .kl-icon { width:18px; height:18px; }
.kl-preferences-summary-copy { min-width:0; display:grid; gap:2px; }
.kl-preferences-summary-copy strong { font-size:var(--kl-type-body); }
.kl-preferences-summary-copy small { overflow:hidden; color:var(--kl-muted); font-size:var(--kl-type-xs); text-overflow:ellipsis; white-space:nowrap; }
.kl-preferences-count { color:var(--kl-gold); font-size:var(--kl-type-xs); font-weight:800; white-space:nowrap; }
.kl-preferences-summary-arrow { width:15px; height:15px; color:var(--kl-muted); transition:transform 140ms ease; }
.kl-preferences-editor[open] .kl-preferences-summary-arrow { transform:rotate(90deg); }
.kl-preferences-body { min-width:0; container-type:inline-size; display:grid; gap:12px; padding:12px; border-top:1px solid var(--kl-border); background:color-mix(in srgb,var(--kl-surface),transparent 5%); }
.kl-preferences-intro { display:flex; align-items:start; justify-content:space-between; gap:14px; }
.kl-preferences-intro>div { min-width:0; }
.kl-preferences-intro strong { font-size:var(--kl-type-md); }
.kl-preferences-intro p { margin:3px 0 0; color:var(--kl-muted); font-size:var(--kl-type-xs); line-height:1.45; }
.kl-preferences-privacy { flex:0 0 min(190px,42%); display:grid; gap:4px; color:var(--kl-muted); font-size:var(--kl-type-xs); }
.kl-preferences-privacy select,.kl-preferences-search { min-width:0; width:100%; min-height:40px; padding:7px 9px; border:1px solid var(--kl-border); border-radius:10px; background:var(--kl-input-bg); color:var(--kl-text); font:inherit; }
.kl-preferences-tools { display:flex; align-items:center; gap:8px; }
.kl-preferences-search { flex:1; }
.kl-preferences-more { margin-inline-start:auto; white-space:nowrap; }
.kl-preferences-content { min-width:0; }
.kl-preference-list { min-width:0; display:grid; gap:6px; }
.kl-preference-list--quick { grid-template-columns:repeat(2,minmax(0,1fr)); }
.kl-preference-row {
  min-width:0; display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:7px; padding:6px;
  border:1px solid var(--kl-border); border-radius:11px; background:var(--kl-surface-2);
}
.kl-preference-row[data-level="love"],.kl-preference-row[data-level="like"] { border-color:color-mix(in srgb,var(--kl-accent),var(--kl-border) 55%); }
.kl-preference-row[data-level="hard_limit"] { border-color:color-mix(in srgb,var(--kl-gold),var(--kl-border) 55%); }
.kl-preference-name { min-width:0; min-height:38px; padding:5px 7px; border:0; border-radius:8px; background:transparent; color:var(--kl-text); font:inherit; font-size:var(--kl-type-sm); font-weight:750; text-align:start; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer; }
.kl-preference-name:hover { background:var(--kl-surface-hover); }
.kl-preference-actions { display:flex; align-items:center; gap:4px; }
.kl-preference-quick,.kl-preference-state { min-height:38px; border:1px solid var(--kl-border); border-radius:9px; background:var(--kl-input-bg); color:var(--kl-muted); cursor:pointer; }
.kl-preference-quick { width:38px; display:grid; place-items:center; padding:0; }
.kl-preference-quick .kl-icon { width:17px; height:17px; }
.kl-preference-quick--dislike[aria-pressed="true"] { border-color:#bb7580; color:#f099a7; background:#bb758018; }
.kl-preference-quick--like[aria-pressed="true"] { border-color:var(--kl-accent); color:color-mix(in srgb,var(--kl-accent),white 25%); background:color-mix(in srgb,var(--kl-accent),transparent 86%); }
.kl-preference-state { min-width:78px; max-width:98px; padding:5px 8px; font:inherit; font-size:var(--kl-type-xs); font-weight:800; white-space:nowrap; }
.kl-preference-row[data-level="love"] .kl-preference-state { color:#ff8fb0; }
.kl-preference-row[data-level="hard_limit"] .kl-preference-state { color:var(--kl-gold); }
.kl-preference-selector { grid-column:1/-1; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:5px; padding-top:6px; border-top:1px solid var(--kl-border); }
.kl-preference-selector button,.kl-compatibility-quick-editor button { min-height:38px; padding:5px 7px; border:1px solid var(--kl-border); border-radius:8px; background:var(--kl-input-bg); color:var(--kl-muted); font:inherit; font-size:var(--kl-type-xs); cursor:pointer; }
.kl-preference-selector button[aria-pressed="true"],.kl-compatibility-quick-editor button[aria-pressed="true"] { border-color:var(--kl-accent); color:var(--kl-text); background:color-mix(in srgb,var(--kl-accent),transparent 84%); }
.kl-preference-selector [data-level="hard_limit"] { color:var(--kl-gold); }
.kl-preference-unset { grid-column:span 2; }
.kl-preference-categories { display:grid; gap:7px; }
.kl-preference-category { border:1px solid var(--kl-border); border-radius:11px; background:var(--kl-surface-2); overflow:hidden; }
.kl-preference-category>summary { min-height:44px; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:7px 11px; cursor:pointer; font-weight:800; }
.kl-preference-category>summary small { color:var(--kl-muted); font-size:var(--kl-type-xs); font-weight:650; }
.kl-preference-category>.kl-preference-list { padding:0 7px 7px; }
.kl-preference-category--edge { border-color:color-mix(in srgb,var(--kl-gold),var(--kl-border) 65%); }
.kl-preference-category--edge>summary { color:var(--kl-gold); }
.kl-preference-search-results { display:grid; gap:9px; }
.kl-preference-search-results h4 { margin:7px 2px 0; color:var(--kl-gold); font-size:var(--kl-type-xs); letter-spacing:.06em; text-transform:uppercase; }
.kl-preferences-status { min-height:18px; margin:0; color:var(--kl-muted); font-size:var(--kl-type-xs); }
.kl-preferences-maintenance { color:var(--kl-muted); font-size:var(--kl-type-xs); }
.kl-preferences-maintenance>summary { min-height:36px; display:flex; align-items:center; cursor:pointer; }
.kl-preferences-maintenance p { margin:0 0 8px; line-height:1.5; }
.kl-preferences-transfer { display:flex; justify-content:flex-end; align-items:center; gap:6px; padding-top:4px; }
.kl-preferences-transfer .kl-text-button,.kl-preferences-status .kl-text-button { min-height:30px; padding:4px 9px; font-size:var(--kl-type-xs); }
.kl-preferences-status .kl-text-button { margin-inline-start:6px; }
.kl-preferences-empty { margin:0; padding:18px; color:var(--kl-muted); text-align:center; }
.kl-preferences-editor--platform { min-height:0; border:0; border-radius:0; background:none; overflow:visible; }
.kl-preferences-editor--platform > summary { display:none; }
.kl-preferences-editor--platform .kl-preferences-body { padding:0; border:0; background:none; }
.kl-preferences-editor--platform .kl-preferences-intro { align-items:center; }
.kl-preferences-editor--platform .kl-preferences-intro strong { font-size:13px; }
.kl-preferences-editor--platform .kl-preferences-intro p { font-size:11px; }
.kl-preferences-editor--platform .kl-preferences-privacy { font-size:12px; }
.kl-preferences-editor--platform .kl-preferences-privacy select { min-height:36px; border-radius:8px; }
.kl-preferences-inline-search { min-width:0; flex:1; display:flex; align-items:center; gap:8px; padding-inline:10px; border:1px solid var(--kl-border); border-radius:8px; background:var(--kl-input-bg); }
.kl-preferences-inline-search:focus-within { border-color:var(--kl-accent); }
.kl-preferences-inline-search > .kl-icon { width:16px; height:16px; flex:none; color:var(--kl-muted); }
.kl-preferences-editor--platform .kl-preferences-search { min-height:34px; padding:0; border:0; border-radius:0; background:none; font-size:12px; }
.kl-preferences-editor--platform .kl-preferences-more { min-height:36px; border-radius:8px; font-size:12px; }
.kl-preferences-editor--platform .kl-preference-list { gap:0; }
.kl-preference-inline-category + .kl-preference-inline-category { margin-top:20px; }
.kl-preference-inline-category > h3 { margin:0 0 6px; font-size:13px; }
.kl-preferences-editor--platform .kl-preference-row { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:12px 0; border:0; border-bottom:1px solid var(--kl-border); border-radius:0; background:none; }
.kl-preferences-editor--platform .kl-preference-row:last-child { border-bottom:0; }
.kl-preference-inline-copy { flex:1; min-width:0; overflow-wrap:anywhere; }
.kl-preference-inline-copy strong { display:block; font-size:12px; font-weight:550; }
.kl-preference-inline-copy > div { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:4px; color:var(--kl-muted); font-size:10px; }
.kl-preference-inline-clear { padding:0; border:0; color:var(--kl-muted); background:none; font:inherit; text-decoration:underline; cursor:pointer; }
.kl-preference-inline { display:grid; grid-auto-flow:column; grid-auto-columns:minmax(0,1fr); flex:0 1 320px; min-width:0; border:1px solid var(--kl-border); border-radius:6px; background:var(--kl-input-bg); }
.kl-preference-inline button { min-width:0; min-height:34px; padding:5px; border:0; border-inline-end:1px solid var(--kl-border); color:var(--kl-muted); background:none; font:inherit; font-size:10px; line-height:1.25; white-space:normal; cursor:pointer; }
.kl-preferences-editor--platform .kl-preference-inline button { font-weight:550; }
.kl-preference-inline button:first-child { border-start-start-radius:5px; border-end-start-radius:5px; }
.kl-preference-inline button:last-child { border:0; border-start-end-radius:5px; border-end-end-radius:5px; }
.kl-preference-inline button:hover { color:var(--kl-text); background:var(--kl-surface-hover); }
.kl-preference-inline button:focus-visible { outline-offset:-2px; }
.kl-preference-inline button[aria-pressed="true"] { color:var(--kl-text); background:color-mix(in srgb,var(--kl-accent),var(--kl-input-bg) 88%); box-shadow:inset 0 -2px var(--kl-accent); }
.kl-preference-inline button[data-level="hard_limit"] { color:var(--kl-gold); }
.kl-preference-inline button[data-level="hard_limit"][aria-pressed="true"] { box-shadow:inset 0 -2px var(--kl-gold); }
.kl-preferences-editor--platform .kl-preference-category { border-radius:8px; background:none; }
.kl-preferences-editor--platform .kl-preference-category > summary { min-height:36px; font-size:12px; font-weight:650; }
.kl-preferences-editor--platform .kl-preference-category > .kl-preference-list { padding:0 11px; }
.kl-preferences-editor--platform .kl-preferences-status:empty { display:none; }
@container (max-width:480px) {
  .kl-preferences-editor--platform .kl-preference-row { flex-direction:column; align-items:stretch; }
  .kl-preference-inline { flex:auto; }
  .kl-preference-inline button { min-height:38px; }
  .kl-preferences-editor--platform .kl-preferences-tools { flex-direction:row; flex-wrap:wrap; }
  .kl-preferences-inline-search { flex:1 1 145px; }
  .kl-preferences-editor--platform .kl-preferences-more { width:auto; }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-preferences-editor--platform .kl-preference-inline button { min-height:40px; }
}
@media (pointer:coarse) {
  .kl-preference-inline button,.kl-preferences-editor--platform .kl-preference-inline button { min-height:44px; }
  .kl-preference-inline-clear { min-height:28px; }
}
.kl-profile-preferences { display:grid; gap:8px; padding:11px 13px; border:1px solid var(--kl-profile-border,var(--kl-border)); border-radius:13px; background:color-mix(in srgb,var(--kl-profile-panel,var(--kl-surface-2)),transparent 7%); }
.kl-profile-preferences-heading { min-height:34px; display:flex; align-items:center; justify-content:space-between; gap:9px; padding:0; border:0; background:transparent; color:var(--kl-profile-text,var(--kl-text)); font:inherit; font-weight:850; text-align:start; }
button.kl-profile-preferences-heading { cursor:pointer; }
.kl-profile-preferences-heading>span { display:flex; align-items:center; gap:7px; }
.kl-profile-preferences-heading .kl-icon { width:15px; height:15px; color:var(--kl-profile-highlight,var(--kl-accent)); }
.kl-profile-preference-group { display:grid; grid-template-columns:74px minmax(0,1fr); align-items:start; gap:8px; }
.kl-profile-preference-group>strong { padding-top:4px; color:var(--kl-profile-muted,var(--kl-muted)); font-size:var(--kl-type-xs); }
.kl-profile-preference-chips { display:flex; flex-wrap:wrap; gap:4px; }
.kl-profile-preference-chips>span { padding:3px 7px; border:1px solid var(--kl-profile-border,var(--kl-border)); border-radius:999px; color:var(--kl-profile-text,var(--kl-text)); background:color-mix(in srgb,var(--kl-profile-panel-strong,var(--kl-input-bg)),transparent 8%); font-size:var(--kl-type-xs); }
.kl-profile-preference-group[data-level="hard_limit"] .kl-profile-preference-chips>span { border-color:color-mix(in srgb,var(--kl-gold),transparent 52%); color:var(--kl-gold); }
.kl-profile-preferences-empty { margin:0; color:var(--kl-profile-muted,var(--kl-muted)); font-size:var(--kl-type-xs); }
.kl-compatibility-details { min-width:0; display:grid; gap:12px; }
.kl-compatibility-details h3,.kl-compatibility-details h4,.kl-compatibility-details p { margin:0; }
.kl-compatibility-count,.kl-compatibility-explanation { color:var(--kl-muted); font-size:var(--kl-type-sm); line-height:1.5; }
.kl-hard-limit-notice { display:grid; grid-template-columns:28px minmax(0,1fr); gap:9px; padding:11px; border:1px solid color-mix(in srgb,var(--kl-gold),transparent 58%); border-radius:12px; background:color-mix(in srgb,var(--kl-gold),transparent 93%); }
.kl-hard-limit-notice>.kl-icon { width:20px; height:20px; color:var(--kl-gold); }
.kl-hard-limit-notice p { margin-top:3px; color:var(--kl-muted); font-size:var(--kl-type-xs); line-height:1.45; }
.kl-compatibility-section { display:grid; gap:6px; }
.kl-compatibility-section>h4 { display:flex; align-items:center; justify-content:space-between; color:var(--kl-gold); font-size:var(--kl-type-sm); }
.kl-compatibility-section>h4 small { color:var(--kl-muted); }
.kl-compatibility-item { min-width:0; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:7px; align-items:center; padding:8px 9px; border:1px solid var(--kl-border); border-radius:10px; background:var(--kl-surface-2); }
.kl-compatibility-item-copy { min-width:0; display:grid; gap:2px; }
.kl-compatibility-item-copy strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:var(--kl-type-sm); }
.kl-compatibility-item-copy span { color:var(--kl-muted); font-size:var(--kl-type-xs); }
.kl-compatibility-edit { min-height:36px; padding:5px 8px; font-size:var(--kl-type-xs); }
.kl-compatibility-quick-editor { grid-column:1/-1; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:5px; padding-top:6px; border-top:1px solid var(--kl-border); }
.kl-mailbox-trigger>.kl-icon { width:17px; height:17px; }
.kl-cloud-group-menu.kl-mailbox-popover { width:min(420px,calc(100vw - 16px)); max-height:min(640px,var(--kl-surface-height,calc(100dvh - 16px))); padding:0!important; overflow:hidden; border-radius:16px!important; background:var(--kl-surface)!important; }
.kl-mailbox-popover[open] { display:flex; flex-direction:column; }
.kl-mailbox-popover > :not(.kl-mailbox-list) { flex-shrink:0; }
.kl-mailbox-header { min-height:56px; display:flex; align-items:center; gap:9px; padding:9px 11px 9px 15px; border-bottom:1px solid var(--kl-border); background:linear-gradient(110deg,color-mix(in srgb,var(--kl-accent),transparent 93%),transparent 55%),var(--kl-surface); }
.kl-mailbox-header>strong { flex:1; font-family:Georgia,"Times New Roman",serif; font-size:var(--kl-type-md); }
/* Same button and glyph as Unread. The group-menu defaults otherwise stretch
   header actions and turn the square grid into a left-aligned flex row. */
.kl-mailbox-header .kl-mailbox-icon-button { width:36px; height:36px; min-width:36px; min-height:36px; padding:0; display:grid; place-items:center; }
.kl-mailbox-header .kl-mailbox-icon-button .kl-icon { width:20px; height:20px; }
.kl-mailbox-icon-button:disabled { opacity:.46; cursor:not-allowed; }
.kl-mailbox-status { min-height:0; margin:0; padding:10px 14px 0; color:var(--kl-muted); font-size:var(--kl-type-xs); }
.kl-mailbox-status:empty { display:none; }
.kl-mailbox-empty { min-height:190px; display:grid; place-items:center; align-content:center; gap:8px; padding:24px; color:var(--kl-muted); text-align:center; }
.kl-mailbox-empty .kl-icon { width:34px; height:34px; color:var(--kl-gold); opacity:.8; }
.kl-mailbox-empty strong { color:var(--kl-text); }
.kl-mailbox-list { min-height:0; flex:1 1 auto; max-height:min(520px,calc(100dvh - 90px)); display:grid; gap:6px; overflow-y:auto; overscroll-behavior:contain; padding:10px; }
.kl-mailbox-item { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:5px 9px; padding:9px; border:1px solid var(--kl-border); border-radius:11px; background:var(--kl-surface-2); }
.kl-mailbox-item[data-unread="true"] { border-color:color-mix(in srgb,var(--kl-accent),var(--kl-border) 58%); background:color-mix(in srgb,var(--kl-accent),transparent 94%); }
.kl-mailbox-item>.kl-text-button:first-child { min-width:0; justify-content:flex-start; border:0; background:transparent; text-align:start; }
.kl-mailbox-item>time { align-self:center; color:var(--kl-muted); font-size:10px; white-space:nowrap; }
.kl-mailbox-item>div { grid-column:1/-1; }
.kl-inbox-mentions { grid-column:1/-1; min-width:0; }
.kl-inbox-mentions>summary { cursor:pointer; padding:8px 2px; color:var(--kl-muted); font-size:var(--kl-type-xs); }
.kl-inbox-mentions>div { display:grid; gap:6px; min-width:0; }
@media(max-width:720px),(pointer:coarse){.kl-mailbox-header .kl-mailbox-icon-button{width:44px;height:44px;min-width:44px;min-height:44px}}
:host([data-density="compact"]) .kl-cloud-group-row { min-height:64px; padding-block:9px; }
:host([data-density="super-compact"]) .kl-cloud-group-row { min-height:58px; grid-template-columns:34px minmax(0,1fr) auto; gap:8px; padding-block:7px; }
:host([data-density="super-compact"]) .kl-group-inbox-avatar { width:34px; height:34px; font-size:12px; }
@container (max-width:780px) {
  .kl-feed-layout { grid-template-columns:minmax(0,1fr); }
  .kl-feed-aside { display:none; }
}
@container (max-width:480px) {
  .kl-feed-composer,.kl-feed-post { padding:14px; border-radius:16px; }
  .kl-feed-main,.kl-feed-posts { gap:12px; }
  .kl-cloud .kl-social-name { font-size:13px; }
  .kl-feed-post-text { font-size:14px; }
  .kl-feed-post-actions { gap:4px; }
  .kl-feed-attachments { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .kl-feed-compose-actions { gap:6px; }
  .kl-feed-compose-tools>.kl-social-button { padding:8px 7px; font-size:12px; gap:5px; }
  .kl-comment-actions { padding-inline-start:0; }
  .kl-social-comment>p { padding-inline-start:0; }
  .kl-group-message-text { padding-inline-start:0; }
  .kl-group-message { padding:12px; }
  .kl-group-compose-actions>small { display:none; }
  .kl-group-create,.kl-group-header { padding:14px; }
  .kl-group-tile { flex-wrap:wrap; }
  .kl-group-composer { padding:10px; }
  .kl-comment-compose { grid-template-columns:minmax(0,1fr); }
  .kl-comment-compose>.kl-social-button { justify-self:end; }
  .kl-reaction-choices { inset-inline-start:auto; inset-inline-end:0; }
  .kl-reactions>.kl-reaction-picker:first-child .kl-reaction-choices { inset-inline-start:0; inset-inline-end:auto; }
  .kl-preference-list--quick { grid-template-columns:minmax(0,1fr); }
  .kl-preferences-intro { display:grid; }
  .kl-preferences-privacy { width:100%; max-width:none; }
  .kl-preferences-tools { align-items:stretch; flex-direction:column; }
  .kl-preferences-more { width:100%; margin:0; }
  .kl-preference-selector { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .kl-preference-unset { grid-column:1/-1; }
  .kl-profile-preference-group { grid-template-columns:minmax(0,1fr); gap:4px; }
  .kl-compatibility-item { grid-template-columns:minmax(0,1fr); }
  .kl-compatibility-edit { justify-self:start; }
  .kl-compatibility-quick-editor { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
@media (prefers-reduced-motion:reduce) {
  .kl-cloud { scroll-behavior:auto; }
  .kl-cloud * { transition:none !important; }
}
@media (max-width: 720px) {
  .kl-feed-layout { grid-template-columns:minmax(0,1fr); }
  .kl-feed-aside { display:none; }
  .kl-cloud { padding:12px; padding-bottom:calc(16px + env(safe-area-inset-bottom)); }
  .kl-cloud-card { padding:12px; }
  .kl-panel[data-cloud="true"] .kl-feature-nav { display:flex; flex-direction:row; overflow-x:auto; overflow-y:hidden; flex-wrap:nowrap; justify-content:flex-start; }
  .kl-panel[data-cloud="true"] .kl-feature-nav .kl-nav-item { flex:0 0 56px; min-width:56px; }
}
@media (max-width: 720px) {
${FEED_TOUCH_STYLES}
}
@media (pointer: coarse) {
${FEED_TOUCH_STYLES}
}
${GROUP_CHAT_STYLES}
${APPEARANCE_STYLES}

.kl-group-management-pending { flex:none; min-width:0; margin:8px; padding:12px; border:1px solid var(--kl-border); border-radius:12px; overflow-wrap:anywhere; }
.kl-group-management-pending[hidden] { display:none; }
.kl-group-management-pending details { min-width:0; padding-block:8px; }
.kl-group-management-pending textarea { display:block; box-sizing:border-box; width:100%; max-width:100%; margin-block:8px; padding:10px; color:var(--kl-text); background:var(--kl-surface-2); border:1px solid var(--kl-border); border-radius:10px; font:inherit; resize:vertical; }
.kl-group-management-pending .kl-setting-tool-buttons { display:flex; gap:6px; flex-wrap:wrap; }
.kl-group-management-pending button { max-width:100%; white-space:normal; overflow-wrap:anywhere; }

.kl-feed-interactions-pending{min-width:0}:is(.kl-feed-interactions-pending,.kl-feed-content-pending) textarea{box-sizing:border-box;width:100%;max-width:100%;resize:vertical}:is(.kl-feed-interactions-pending,.kl-feed-content-pending) .kl-setting-tool-buttons{display:flex;flex-wrap:wrap;gap:.5rem}.kl-feed-interactions-pending button{white-space:normal}

.kl-panel[data-platform-preview] .kl-cloud[data-platform-feed] { padding:20px; scrollbar-width:thin; scrollbar-color:var(--kl-border-strong) transparent; }
.kl-cloud[data-platform-feed] > :is(.kl-cloud-bar,.kl-cloud-tabs) { display:none; }
.kl-cloud[data-platform-feed] > .kl-cloud-body { max-width:960px; }
.kl-feed-layout.kl-platform-feed { --kl-feed-control:36px; --kl-feed-post-control:30px; grid-template-columns:minmax(0,1fr); }
.kl-platform-feed .kl-feed-main { gap:12px; }
.kl-platform-feed .kl-feed-heading { display:flex; align-items:center; justify-content:space-between; min-height:var(--kl-feed-control); margin-block-end:4px; gap:8px; }
.kl-platform-feed .kl-feed-heading h1 { margin:0; font-family:inherit; font-size:20px; line-height:1.3; font-weight:700; letter-spacing:-.3px; }
.kl-platform-feed .kl-feed-heading-actions { display:flex; align-items:center; gap:12px; flex:none; }
.kl-cloud .kl-platform-feed .kl-feed-heading .kl-social-primary { gap:8px; }
.kl-cloud .kl-platform-feed .kl-feed-heading .kl-feed-upcoming { width:var(--kl-feed-control); height:var(--kl-feed-control); min-height:var(--kl-feed-control); padding:0; border-radius:8px; }
.kl-cloud .kl-platform-feed :is(.kl-feed-heading,.kl-feed-compose-footer,.kl-feed-empty-actions) .kl-social-primary { min-height:var(--kl-feed-control); padding:7px 12px; border-radius:8px; border-color:var(--kl-accent); color:white; background:var(--kl-accent); font-size:11px; }
.kl-platform-feed :is(.kl-feed-heading,.kl-feed-compose-footer,.kl-feed-empty-actions) .kl-social-primary:not(:disabled):hover { background:color-mix(in srgb,var(--kl-accent) 86%,white); }
.kl-platform-feed .kl-feed-heading .kl-icon { width:16px; height:16px; }
.kl-platform-feed .kl-feed-tools { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
.kl-platform-feed .kl-feed-search-form { flex:1 1 180px; min-width:0; min-height:var(--kl-feed-control); gap:8px; padding:0 10px; border:1px solid var(--kl-border); border-radius:8px; background:var(--kl-input-bg); }
.kl-platform-feed .kl-feed-search-form:focus-within { border-color:var(--kl-accent); }
.kl-platform-feed .kl-feed-search-form .kl-feed-search { min-height:calc(var(--kl-feed-control) - 2px); padding:0; border:0; border-radius:0; background:transparent; font-size:12px; }
.kl-platform-feed .kl-feed-search-form .kl-feed-search:focus-visible { outline:none; }
.kl-platform-feed .kl-feed-search::-webkit-search-cancel-button { display:none; }
.kl-cloud .kl-platform-feed .kl-feed-search-form > button { display:grid; place-items:center; min-height:30px; width:16px; flex:none; padding:0; border:0; background:transparent; color:var(--kl-muted); cursor:pointer; }
.kl-cloud .kl-platform-feed .kl-feed-search-form > .kl-feed-search-clear { width:30px; margin-inline-end:-6px; border-radius:7px; }
.kl-platform-feed .kl-feed-search-form .kl-icon { width:16px; height:16px; }
.kl-platform-feed .kl-feed-filter-row { flex:0 0 auto; gap:4px; justify-content:flex-start; }
.kl-platform-feed .kl-feed-filter { padding:0; border:0; border-radius:0; background:transparent; gap:4px; }
.kl-cloud .kl-platform-feed .kl-feed-filter .kl-social-button,
.kl-cloud .kl-platform-feed .kl-feed-filter-row > .kl-social-menu > summary { min-height:32px; border-radius:8px; font-size:11px; }
.kl-platform-feed .kl-feed-filter .kl-social-button { padding:4px 9px; color:var(--kl-muted); }
.kl-platform-feed .kl-feed-filter .kl-social-button[aria-pressed="true"],
.kl-platform-feed .kl-feed-more-filter-active > summary { color:var(--kl-text); border-color:color-mix(in srgb,var(--kl-accent) 42%,transparent); background:color-mix(in srgb,var(--kl-accent) 12%,transparent); box-shadow:none; }
.kl-platform-feed .kl-feed-filter-row > .kl-social-menu > summary { width:32px; }
.kl-platform-feed .kl-feed-filter-row > .kl-social-menu > summary > .kl-icon { width:16px; height:16px; }
.kl-cloud .kl-feed-layout.kl-platform-feed .kl-feed-posts { gap:0; border:1px solid var(--kl-border); border-radius:10px; background:var(--kl-surface); }
.kl-platform-feed .kl-feed-posts:empty { display:none; }
.kl-cloud .kl-platform-feed .kl-feed-post { margin:0; padding:16px; gap:8px; border-radius:10px; box-shadow:none; }
.kl-cloud .kl-platform-feed .kl-feed-posts > .kl-feed-post { border:0; border-radius:0; background:transparent; }
.kl-cloud .kl-platform-feed .kl-feed-posts > .kl-feed-post:not(:last-child) { border-block-end:1px solid var(--kl-border); }
.kl-platform-feed .kl-feed-post-header { align-items:center; }
.kl-platform-feed .kl-feed-post-header .kl-social-author { gap:12px; }
.kl-cloud .kl-platform-feed .kl-feed-post-header .kl-social-avatar { width:36px; height:36px; min-width:36px; min-height:36px; }
.kl-platform-feed .kl-feed-post-header .kl-social-initials { font-size:12px; }
.kl-platform-feed .kl-feed-post-header .kl-social-author-copy { display:flex; flex-wrap:wrap; align-items:center; gap:1px 8px; }
.kl-cloud .kl-platform-feed .kl-feed-post-header .kl-social-name { min-height:24px; font-size:12px; font-weight:600; }
.kl-platform-feed .kl-feed-post-header .kl-social-meta { gap:4px 8px; flex:1 1 auto; font-size:10px; line-height:1.7; }
.kl-platform-feed .kl-feed-post-header .kl-social-meta > span:first-child:not(.kl-feed-highlights) { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
.kl-platform-feed .kl-feed-post-header .kl-social-meta time::before { content:none; }
.kl-platform-feed .kl-feed-post-header .kl-social-edited { font-size:inherit; }
.kl-platform-feed .kl-feed-post-header .kl-feed-highlights { gap:4px; font-size:10px; }
.kl-platform-feed .kl-feed-post-header .kl-feed-highlights > span { gap:4px; min-height:20px; padding:2px 6px; border:1px solid var(--kl-border); border-radius:7px; background:var(--kl-surface-2); }
.kl-platform-feed .kl-feed-post-header .kl-feed-highlights .kl-icon { width:11px; height:11px; }
.kl-platform-feed .kl-feed-post-header > .kl-social-menu { align-self:center; }
.kl-platform-feed .kl-feed-post-header > .kl-social-menu > summary { width:32px; min-height:32px; border-radius:8px; }
.kl-platform-feed .kl-feed-post-header > .kl-social-menu > summary .kl-icon { width:16px; height:16px; }
.kl-platform-feed .kl-feed-post-text { font-size:calc(var(--kl-type-body) + 1px); }
.kl-platform-feed .kl-feed-poll { display:block; margin-top:4px; padding:12px; border-radius:8px; background:var(--kl-surface-2); }
.kl-platform-feed .kl-feed-poll > h3 { margin:0; font:600 12px/1.65 var(--kl-font,system-ui); overflow-wrap:anywhere; }
.kl-platform-feed .kl-feed-poll-options { gap:6px; margin-top:10px; }
.kl-cloud .kl-platform-feed :is(.kl-feed-poll-choice,.kl-feed-poll-result) {
  gap:8px; min-height:34px; padding:7px 8px; border-radius:5px; font-size:11px; line-height:1.65; overflow-wrap:anywhere;
}
.kl-cloud .kl-platform-feed label.kl-feed-poll-choice { align-items:flex-start; min-height:35px; }
.kl-platform-feed .kl-feed-poll-choice input:is([type="radio"],[type="checkbox"]) { width:13px; height:13px; min-height:0; flex:0 0 13px; padding:0; margin:3px 0 0; accent-color:var(--kl-accent); }
.kl-cloud .kl-platform-feed .kl-feed-poll-choice:has(input:checked) { border-color:color-mix(in srgb,var(--kl-accent) 48%,var(--kl-border)); background:color-mix(in srgb,var(--kl-accent) 8%,var(--kl-surface)); }
.kl-platform-feed .kl-feed-poll-result { background:transparent; }
.kl-platform-feed .kl-feed-poll-result[data-mine="true"] { border-color:var(--kl-border); }
.kl-platform-feed .kl-feed-poll-bar { background:color-mix(in srgb,var(--kl-accent) 18%,transparent); }
.kl-platform-feed .kl-feed-poll-percent { font-size:10px; font-weight:600; }
.kl-platform-feed .kl-feed-poll-meta { justify-content:flex-start; gap:4px; margin-top:8px; line-height:1.6; }
.kl-platform-feed .kl-feed-poll-meta time::before { content:"· "; }
.kl-platform-feed .kl-feed-poll-actions { gap:6px; margin-top:10px; }
.kl-cloud .kl-platform-feed .kl-feed-poll-actions > button { height:var(--kl-feed-control); min-height:30px; min-width:0; padding:0 12px; border-radius:8px; font-size:10px; }
.kl-cloud .kl-platform-feed .kl-feed-poll-actions > .kl-social-primary { background:var(--kl-accent); border-color:var(--kl-accent); color:white; }
.kl-cloud .kl-platform-feed .kl-feed-poll-actions > button:not(.kl-social-primary) { border-color:var(--kl-border); color:var(--kl-text); }
.kl-platform-feed .kl-feed-poll-closed { padding:2px 6px; border:1px solid var(--kl-border); border-radius:4px; color:var(--kl-muted); font-size:10px; }
.kl-platform-feed .kl-feed-post-actions { justify-content:flex-start; gap:6px; margin-block-start:2px; padding:0; border:0; }
.kl-platform-feed .kl-feed-post-actions > .kl-reactions { display:contents; }
.kl-cloud .kl-platform-feed .kl-feed-post-actions > :is(.kl-post-comments-button,.kl-feed-quick-save),
.kl-cloud .kl-platform-feed .kl-feed-post-actions .kl-reactions > .kl-reaction,
.kl-platform-feed .kl-feed-post-actions .kl-reaction-picker > summary { height:var(--kl-feed-post-control); min-height:var(--kl-feed-post-control); padding:0 8px; border-radius:7px; font-size:11px; }
.kl-platform-feed .kl-feed-post-actions :is(.kl-post-comments-button,.kl-feed-quick-save) > .kl-icon { width:16px; height:16px; }
.kl-cloud .kl-platform-feed .kl-feed-post-actions .kl-reactions > .kl-reaction { min-width:0; background:var(--kl-surface-2); }
.kl-platform-feed .kl-feed-post-actions .kl-reactions > .kl-reaction > span:first-child { font-size:14px; }
.kl-cloud .kl-platform-feed .kl-feed-post-actions .kl-reactions > .kl-reaction[aria-pressed="true"] { color:var(--kl-text); border-color:color-mix(in srgb,var(--kl-accent) 64%,transparent); background:color-mix(in srgb,var(--kl-accent) 14%,var(--kl-surface)); }
.kl-platform-feed .kl-feed-post-actions .kl-reaction-picker > summary { width:36px; padding-inline:6px; }
.kl-platform-feed .kl-feed-post-actions .kl-reaction-picker > summary .kl-icon { width:21px; height:21px; }
.kl-cloud .kl-platform-feed .kl-feed-post-actions > :is(.kl-post-comments-button,.kl-feed-quick-save) { border:1px solid var(--kl-border); background:transparent; color:var(--kl-muted); }
.kl-cloud .kl-platform-feed .kl-feed-quick-save { margin-inline-start:auto; width:34px; }
.kl-cloud .kl-platform-feed .kl-feed-post-actions > .kl-feed-quick-save[aria-pressed="true"] { color:var(--kl-text); border-color:color-mix(in srgb,var(--kl-accent) 48%,var(--kl-border)); background:color-mix(in srgb,var(--kl-accent) 12%,var(--kl-surface)); }
.kl-cloud .kl-platform-feed :is(.kl-feed-search-clear,.kl-post-comments-button,.kl-feed-quick-save,.kl-reaction-picker > summary):hover { color:var(--kl-text); background:var(--kl-surface-hover); }
.kl-platform-feed .kl-feed-posts .kl-feed-empty { justify-items:center; gap:12px; padding:24px 16px; border:0; }
.kl-platform-feed .kl-feed-empty > .kl-icon { width:28px; height:28px; margin-block-end:4px; }
.kl-platform-feed .kl-feed-empty h2 { color:var(--kl-text); font-size:16px; }
.kl-platform-feed .kl-feed-empty p { max-width:340px; font-size:11px; line-height:1.7; }
.kl-platform-feed .kl-feed-empty-actions { display:flex; flex-wrap:wrap; justify-content:center; gap:6px; margin-block-start:4px; }
.kl-cloud .kl-platform-feed .kl-feed-empty-actions > button { min-height:var(--kl-feed-control); padding:7px 12px; border-radius:8px; font-size:11px; }
.kl-platform-feed .kl-feed-empty-actions > button:not(.kl-social-primary) { background:transparent; }
.kl-platform-feed .kl-feed-circle { padding:6px 12px; color:var(--kl-muted); font-size:12px; }
.kl-platform-feed .kl-feed-circle > summary { width:fit-content; padding-block:6px; cursor:pointer; }
.kl-platform-feed .kl-feed-circle .kl-feed-discussions { margin-block-start:6px; }
.kl-platform-feed .kl-feed-circle .kl-feed-discussions > h3 { display:none; }

.kl-platform-feed :is(.kl-feed-post-header,.kl-comment-header) > .kl-social-menu > .kl-social-menu-items {
  box-sizing:border-box; width:230px; max-width:calc(100vw - 16px); top:calc(100% + 6px);
  gap:0; padding:4px; border-radius:10px; background:var(--kl-surface-2); box-shadow:0 8px 24px #0005;
}
.kl-cloud .kl-platform-feed :is(.kl-feed-post-header,.kl-comment-header) > .kl-social-menu .kl-social-menu-items > button {
  box-sizing:border-box; width:100%; min-width:0; min-height:32px; height:auto;
  padding:9px 10px; gap:8px; border:0; border-radius:8px; background:transparent; box-shadow:none;
  font-family:inherit; font-size:11px; font-weight:400; line-height:1.5; color:var(--kl-text);
}
.kl-cloud .kl-platform-feed :is(.kl-feed-post-header,.kl-comment-header) > .kl-social-menu .kl-social-menu-items > button:is(:focus-visible,:hover) {
  background:color-mix(in srgb,var(--kl-gold) 9%,transparent);
}
.kl-platform-feed :is(.kl-feed-post-header,.kl-comment-header) > .kl-social-menu .kl-social-menu-items > button > .kl-icon { flex:none; width:14px; height:14px; color:var(--kl-muted); }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-cloud .kl-platform-feed :is(.kl-feed-post-header,.kl-comment-header) > .kl-social-menu .kl-social-menu-items > button { min-height:40px; }
}
.kl-platform-feed .kl-feed-post-header { position:relative; }
.kl-platform-feed .kl-feed-additional-menu { position:absolute; inset-inline-end:40px; top:0; }
.kl-platform-feed .kl-feed-additional-menu:not([open]):not(:focus-within) > summary { width:1px; min-width:0; height:1px; min-height:0; padding:0; border:0; opacity:0; }
/* Comments keep the live parent post and a separate, fixed action footer. */
.kl-platform-feed .kl-feed-comments-dialog { width:540px; margin:auto; padding:0; overflow:hidden; border-radius:12px; background:var(--kl-surface); }
.kl-platform-feed .kl-feed-comments-dialog[open] { display:flex; flex-direction:column; }
.kl-feed-comments-dialog .kl-dialog-header { flex:none; padding:12px 16px; }
.kl-feed-comments-dialog .kl-dialog-title { font-family:inherit; font-weight:600; font-size:18px; line-height:1.3; }
.kl-feed-comments-dialog .kl-dialog-body { display:flex; flex-direction:column; min-height:0; max-height:inherit; padding:0; gap:0; overflow:hidden; }
.kl-comment-dialog-scroll { min-height:0; min-width:0; overflow:auto; overscroll-behavior:contain; padding:16px; scrollbar-width:thin; }
.kl-comment-placeholder { color:var(--kl-muted); pointer-events:none; }
.kl-cloud .kl-platform-feed .kl-comment-subject { padding:14px; margin:0 0 16px; border:1px solid var(--kl-border); border-radius:10px; }
.kl-comment-subject .kl-feed-post-header > :is(details,.kl-social-menu),
.kl-comment-subject .kl-post-comments-button { display:none; }
.kl-comment-subject-count { font-size:11px; color:var(--kl-muted); }
.kl-feed-comments-dialog .kl-cloud-comments { gap:12px; padding:0; border:0; }
.kl-feed-comments-dialog .kl-comment-list { gap:0; }
.kl-feed-comments-dialog .kl-social-comment { --kl-comment-indent:42px; gap:6px; padding:12px 0; border-radius:0; border-bottom:1px solid var(--kl-border); background:transparent; }
.kl-feed-comments-dialog .kl-social-comment:last-child { border-bottom:0; }
.kl-feed-comments-dialog .kl-comment-header { align-items:start; min-height:38px; }
.kl-feed-comments-dialog .kl-comment-header .kl-social-author { align-items:flex-start; gap:12px; }
.kl-cloud .kl-feed-comments-dialog .kl-comment-header .kl-social-avatar { flex:0 0 30px; width:30px; height:30px; min-width:30px; min-height:30px; }
.kl-feed-comments-dialog .kl-comment-header .kl-social-author-copy { gap:3px; }
.kl-cloud .kl-feed-comments-dialog .kl-comment-header .kl-social-name { min-height:0; padding:0; font-size:11px; line-height:1.5; }
.kl-feed-comments-dialog .kl-comment-header .kl-social-meta { font-size:10px; line-height:17px; }
.kl-feed-comments-dialog .kl-comment-header > .kl-social-menu > summary { width:30px; height:30px; min-height:30px; }
.kl-cloud .kl-feed-comments-dialog .kl-social-comment > :is(p,.kl-comment-actions,.kl-comment-parent) { min-width:0; margin-inline-start:var(--kl-comment-indent); padding-inline-start:0; }
.kl-cloud .kl-feed-comments-dialog .kl-social-comment > p { font-size:12px; line-height:1.7; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-cloud .kl-platform-feed .kl-comment-subject { padding:11px; gap:10px; }
  .kl-feed-comments-dialog .kl-comment-header { min-height:36px; }
  .kl-feed-comments-dialog .kl-comment-header > .kl-social-menu > summary { width:36px; height:36px; min-height:36px; }
}
.kl-feed-comments-dialog .kl-comment-list:empty::after { content:"No comments yet."; font-size:12px; color:var(--kl-muted); }
.kl-feed-comments-dialog .kl-comment-compose { display:grid; grid-template-columns:1fr auto; align-items:center; gap:6px; }
.kl-feed-comments-dialog .kl-comment-compose label,.kl-feed-comments-dialog .kl-comment-compose textarea { grid-column:1/-1; }
.kl-feed-comments-dialog .kl-comment-compose label { font-weight:600; font-size:12px; }
.kl-cloud .kl-feed-comments-dialog .kl-comment-compose textarea { min-height:76px; }
.kl-comment-counter { grid-column:2; grid-row:3; justify-self:end; color:var(--kl-muted); font-size:11px; }
.kl-feed-comments-dialog .kl-comment-spoiler-tool { grid-column:1; grid-row:3; justify-self:start; }
.kl-feed-comments-dialog .kl-comment-dialog-footer { flex:none; width:100%; margin:0; padding:12px 16px; display:flex; justify-content:space-between; gap:8px; border-top:1px solid var(--kl-border); }
.kl-cloud .kl-feed-comments-dialog .kl-comment-dialog-footer > button { min-height:36px; padding:7px 12px; border-radius:7px; }
.kl-feed-comments-dialog .kl-comment-dialog-footer > .kl-social-primary { min-width:85px; }
@media (max-width:700px) {
  .kl-comment-dialog-scroll { padding:12px; }
  .kl-feed-comments-dialog .kl-comment-dialog-footer { padding-block:10px; }
  .kl-cloud .kl-feed-comments-dialog .kl-comment-dialog-footer > button { min-height:40px; }
  .kl-cloud .kl-feed-comments-dialog .kl-comment-compose textarea { font-size:16px; }
}

.kl-platform-feed .kl-feed-compose-dialog { width:min(540px,calc(100vw - 24px)); border-radius:12px; background:var(--kl-surface); }
.kl-feed-compose-dialog .kl-dialog-header { padding:10px 14px; background:var(--kl-surface); }
.kl-feed-compose-dialog .kl-dialog-title { font-family:inherit; font-size:17px; }
.kl-feed-compose-dialog .kl-dialog-body { display:block; padding:12px; }
.kl-cloud .kl-platform-feed .kl-feed-compose-dialog .kl-feed-composer { padding:0; border:0; border-radius:0; background:transparent; box-shadow:none; }
.kl-feed-compose-dialog .kl-feed-compose-field { min-width:0; border:1px solid var(--kl-border); border-radius:9px; background:var(--kl-input-bg); }
.kl-feed-compose-dialog .kl-feed-compose-field:focus-within { border-color:var(--kl-accent); }
.kl-cloud .kl-feed-compose-dialog .kl-feed-compose-field > textarea { display:block; min-height:140px; max-height:280px; padding:12px; border:0; background:transparent; font-size:13px; line-height:1.65; outline:none; }
.kl-feed-compose-dialog .kl-feed-compose-actions { justify-content:space-between; padding:5px 8px; }
.kl-cloud .kl-feed-compose-dialog .kl-feed-compose-tools > button { min-height:32px; padding:4px 8px; font-size:11px; border-radius:6px; }
.kl-feed-compose-dialog .kl-feed-poll-compose:empty,
.kl-feed-compose-dialog .kl-feed-draft-row:has(.kl-feed-draft-status:empty):has(button:disabled) { display:none; }
.kl-feed-compose-dialog .kl-feed-compose-footer { display:flex; justify-content:space-between; gap:8px; padding-top:10px; border-top:1px solid var(--kl-border); }
.kl-cloud .kl-feed-compose-dialog .kl-feed-compose-footer > button { min-height:36px; border-radius:7px; font-size:12px; }
.kl-cloud .kl-feed-compose-dialog .kl-feed-compose-footer > .kl-social-primary { min-width:88px; }
@container kl-panel (max-width:1100px) {
  .kl-panel[data-platform-preview] .kl-cloud[data-platform-feed] { padding:16px; }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-panel[data-platform-preview] .kl-cloud[data-platform-feed] { padding:12px; }
  .kl-feed-layout.kl-platform-feed { --kl-feed-control:40px; --kl-feed-post-control:40px; }
  .kl-platform-feed .kl-feed-heading { margin-block-end:0; }
  .kl-cloud .kl-feed-layout.kl-platform-feed .kl-feed-posts { border-radius:8px; }
  .kl-cloud .kl-platform-feed .kl-feed-post { padding:12px; }
  .kl-platform-feed .kl-feed-post-header .kl-social-author { gap:10px; }
  .kl-platform-feed .kl-feed-post-header .kl-social-meta { flex-basis:100%; }
  .kl-cloud .kl-platform-feed .kl-feed-post-header .kl-social-name { min-height:0; font-size:11px; line-height:1.5; }
  .kl-platform-feed .kl-feed-heading-actions { gap:8px; }
  .kl-platform-feed .kl-feed-post-header .kl-feed-highlights > span { padding-block:1px; line-height:1.4; }
  .kl-platform-feed .kl-feed-post-header > .kl-social-menu > summary { width:36px; min-height:36px; }
  .kl-cloud .kl-platform-feed :is(label.kl-feed-poll-choice,.kl-feed-poll-result) { min-height:40px; padding-block:9px; }
}
@container kl-panel (max-width:420px) {
  .kl-platform-feed .kl-feed-search-form { flex-basis:100%; }
  .kl-platform-feed .kl-feed-filter-row { width:100%; justify-content:space-between; }
  .kl-platform-feed .kl-feed-filter { min-height:40px; align-items:center; gap:3px; padding:2px 1px; }
  .kl-cloud .kl-platform-feed .kl-feed-filter .kl-social-button { min-height:36px; padding:0 7px; }
  .kl-cloud .kl-platform-feed .kl-feed-post-header .kl-social-avatar { width:32px; height:32px; min-width:32px; min-height:32px; }
  .kl-cloud .kl-feed-compose-dialog .kl-feed-compose-field > textarea { min-height:128px; font-size:16px; }
}
@media (pointer:coarse) {
  .kl-cloud .kl-platform-feed .kl-social-menu-items button,
  .kl-cloud .kl-platform-feed :is(.kl-feed-compose-footer,.kl-feed-compose-tools) button { min-height:44px; }
}
@media (max-height:500px) {
  .kl-cloud .kl-feed-compose-dialog .kl-feed-compose-field > textarea { min-height:90px; max-height:160px; }
}
`;
