import { APPEARANCE_STYLES } from "../modules/link-chat/appearance-renderer";
import { GROUP_CHAT_STYLES } from "./group-styles";

import { TEXT_FORMAT_STYLES } from "../modules/link-chat/text-format";

export const CLOUD_STYLES = `
${TEXT_FORMAT_STYLES}
.kl-cloud { min-width:0; min-height:0; overflow:auto; padding:20px; display:flex; flex-direction:column; gap:16px; }
.kl-cloud[hidden] { display:none !important; }
.kl-cloud-bar,.kl-cloud-actions { display:flex; align-items:center; flex-wrap:wrap; gap:8px; min-width:0; }
.kl-cloud-bar { justify-content:space-between; }
.kl-cloud-body { display:grid; gap:14px; width:100%; max-width:920px; min-width:0; margin-inline:auto; }
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
.kl-feed-aside { position:sticky; top:0; display:grid; gap:16px; min-width:0; }
.kl-feed-self { background:linear-gradient(145deg,color-mix(in srgb,var(--kl-gold) 9%,var(--kl-surface)),var(--kl-surface)); }
.kl-feed-aside h3 { font-size:16px; line-height:1.4; }
.kl-feed-aside .kl-cloud-note { font-size:13px; }
.kl-feed-composer { gap:12px; padding:20px; }
.kl-feed-composer>textarea { border:0; border-radius:0; background:transparent; padding:4px 0; min-height:90px; font-size:16px; line-height:1.6; }
.kl-feed-compose-actions { display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding-top:10px; border-top:1px solid var(--kl-border); }
.kl-composer-count { margin-inline-start:auto; color:var(--kl-muted); font-size:11px; font-variant-numeric:tabular-nums; }
.kl-feed-compose-hint { font-size:10px !important; line-height:1.5; }
.kl-feed-attachments { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; }
.kl-feed-attachments:empty { display:none; }
.kl-feed-attachment { position:relative; aspect-ratio:1; }
.kl-feed-attachment img { width:100%; height:100%; object-fit:cover; border-radius:10px; }
.kl-feed-attachment .kl-social-icon-button { position:absolute; top:2px; right:2px; width:32px; height:32px; min-height:32px; color:white; background:#171717d9; }
.kl-feed-tools { display:grid; gap:12px; }
.kl-feed-search-form { display:flex; gap:8px; align-items:center; }
.kl-feed-search-form .kl-feed-search { min-height:44px; border-radius:12px; flex:1; }
.kl-feed-filter-row { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
.kl-feed-filter { display:flex; padding:3px; background:var(--kl-input-bg); border:1px solid var(--kl-border); border-radius:14px; }
.kl-feed-filter .kl-social-button { background:transparent; border-color:transparent; min-height:38px; border-radius:10px; }
.kl-feed-filter .kl-social-button[aria-pressed="true"] { background:var(--kl-surface); color:var(--kl-gold); box-shadow:0 1px 5px #0002; }
.kl-feed-results:empty { display:none; }
.kl-feed-results { font-size:12px !important; }
.kl-feed-post { gap:16px; padding:20px; }
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
.kl-reaction-choices { position:absolute; bottom:calc(100% + 8px); inset-inline-start:0; z-index:9; display:grid; grid-template-columns:repeat(4,44px); gap:4px; padding:8px; background:var(--kl-surface); border:1px solid var(--kl-border); border-radius:18px; box-shadow:0 8px 26px #0005; }
.kl-reaction-choices .kl-reaction { border-color:transparent; min-height:44px; }
.kl-cloud-comments { display:grid; gap:14px; padding-top:16px; border-top:1px solid var(--kl-border); }
.kl-comment-list { display:grid; gap:16px; }
.kl-comment-compose { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:end; }
.kl-cloud .kl-comment-compose textarea { min-height:66px; }
.kl-social-comment { display:grid; gap:8px; padding:12px; border-radius:14px; background:var(--kl-input-bg); }
.kl-social-comment>p { padding-inline-start:54px; font-size:14px; }
.kl-comment-actions { display:flex; flex-wrap:wrap; align-items:center; gap:4px; padding-inline-start:48px; }
.kl-comment-actions>.kl-social-button { padding:4px 8px; min-height:36px; font-size:11px; border-color:transparent; background:transparent; }
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
${GROUP_CHAT_STYLES}
${APPEARANCE_STYLES}
`;
