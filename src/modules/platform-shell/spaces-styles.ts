export const SPACES_STYLES = `
.kl-sp-directory-note{margin:0 0 14px;color:var(--kl-muted);font-size:11px;line-height:1.6;overflow-wrap:anywhere}.kl-sp-toolbar>select{width:auto;max-width:150px;font-size:12px}.kl-sp-directory-room{min-height:25px}
.kl-spaces-page{height:100%;min-width:0;overflow:auto;scrollbar-gutter:stable;background:transparent}.kl-spaces-page[hidden]{display:none!important}
.kl-spaces-page .kl-text-button,.kl-sp-dialog .kl-text-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:normal}
.kl-sp-heading,.kl-sp-actions,.kl-sp-meta,.kl-sp-tabs,.kl-sp-toolbar,.kl-sp-member,.kl-sp-preset{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.kl-sp-heading{padding:20px 24px 14px;justify-content:space-between}.kl-sp-heading h1{font-size:24px;line-height:1.3;margin:0}.kl-sp-heading p{color:var(--kl-muted);font-size:12px;margin:4px 0}.kl-sp-eyebrow{font-size:9px;letter-spacing:1.5px;color:var(--kl-muted)}
.kl-sp-toolbar{padding:0 24px 14px}.kl-sp-toolbar .kl-browse-search{flex:1;min-width:100px}.kl-sp-tabs{padding:0 24px 14px}.kl-sp-tabs button[aria-pressed=true],.kl-sp-actions button[aria-pressed=true]{background:color-mix(in srgb,var(--kl-accent) 12%,var(--kl-surface));color:var(--kl-accent);border-color:var(--kl-border)}
.kl-spaces-page :is(input,select,textarea),.kl-sp-dialog :is(input,select,textarea){box-sizing:border-box;min-width:0;max-width:100%;border:1px solid var(--kl-border);border-radius:7px;padding:9px;background:var(--kl-input-bg);color:var(--kl-text);font:inherit}
.kl-sp-results{padding:0 24px 24px}.kl-sp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.kl-sp-card,.kl-sp-panel{min-width:0;border:1px solid var(--kl-border);border-radius:10px;background:var(--kl-surface)}.kl-sp-card{overflow:hidden;display:flex;flex-direction:column}.kl-sp-card-body{display:flex;flex-direction:column;gap:10px;padding:12px;flex:1}.kl-sp-card h2{font-size:calc(var(--kl-type-body) + 1px);line-height:1.4;margin:0}.kl-sp-title{border:0;background:none;color:var(--kl-text);font:inherit;font-weight:600;text-align:left;padding:0;cursor:pointer;overflow-wrap:anywhere}
.kl-sp-meta{font-size:var(--kl-type-xs);line-height:1.6;color:var(--kl-muted)}.kl-sp-badge{display:inline-flex;border:1px solid var(--kl-border);border-radius:5px;padding:3px 7px;font-size:10px;color:var(--kl-muted);line-height:1.3}
.kl-sp-description{margin:0;line-height:1.6;color:var(--kl-muted);font-size:var(--kl-type-sm);min-height:36px;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.kl-sp-card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;padding-top:10px;border-top:1px solid var(--kl-border);font-size:11px;color:var(--kl-muted)}
.kl-sp-status{padding:10px 24px;color:var(--kl-muted);font-size:12px}.kl-sp-status:has(textarea){display:flex;flex-wrap:wrap;gap:8px;max-height:min(360px,50dvh);overflow:auto;overflow-wrap:anywhere;border-bottom:1px solid var(--kl-border)}.kl-sp-status:has(textarea)>p,.kl-sp-status:has(textarea)>strong{flex-basis:100%;margin:0}.kl-sp-status textarea,.kl-sp-dialog textarea[readonly],.kl-workshop-space-review textarea[readonly]{box-sizing:border-box;width:100%;min-width:0;resize:vertical;color:var(--kl-text);background:var(--kl-input-bg);border:1px solid var(--kl-border);border-radius:6px;padding:8px}.kl-sp-status:empty{display:none}.kl-sp-status[data-error=true],.kl-sp-error{color:var(--kl-accent)}.kl-sp-empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 16px;text-align:center;color:var(--kl-muted);border:1px dashed var(--kl-border);border-radius:10px;background:transparent}.kl-sp-empty>.kl-icon{width:28px;height:28px}.kl-sp-empty h2{margin:0;font-size:16px;color:var(--kl-text)}.kl-sp-empty p{max-width:340px;margin:0 auto;font-size:11px;line-height:1.7}.kl-sp-empty>.kl-text-button{margin-top:4px}
.kl-sp-detail{display:flex;flex-direction:column;gap:14px}.kl-sp-detail>button{align-self:flex-start}.kl-sp-detail .kl-sp-tabs{padding:0}.kl-sp-panel{padding:14px}.kl-sp-panel h1{font-size:23px;line-height:1.3;margin:10px 0;overflow-wrap:anywhere}.kl-sp-panel h2{font-size:calc(var(--kl-type-body) + 1px);margin:0 0 14px}.kl-sp-panel h3{font-size:14px}.kl-sp-panel p,.kl-sp-panel li{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.7}.kl-sp-panel li{margin:8px 0}.kl-sp-panel ol{padding-left:20px}.kl-sp-hero{padding:0;overflow:visible}.kl-sp-hero .kl-sp-cover{height:180px}.kl-sp-hero-body{padding:22px}.kl-sp-hero-body>.kl-sp-actions{margin-top:18px}.kl-sp-detail-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:12px}.kl-sp-member{padding:12px 0;border-bottom:1px solid var(--kl-border)}.kl-sp-member>button:first-child{margin-right:auto;text-align:left}.kl-sp-member .kl-text-button{white-space:normal}.kl-sp-audit{display:grid;grid-template-columns:150px minmax(0,1fr);gap:12px;padding:12px 0;border-bottom:1px solid var(--kl-border);font-size:11px;overflow-wrap:anywhere}.kl-sp-audit time{color:var(--kl-muted)}
.kl-sp-dialog{box-sizing:border-box;width:min(640px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;border:1px solid var(--kl-border);border-radius:12px;padding:22px;background:var(--kl-surface);color:var(--kl-text)}.kl-sp-dialog::backdrop{background:#0009}.kl-sp-dialog h2{font-size:21px;margin:0 0 20px}.kl-sp-dialog p{line-height:1.6;overflow-wrap:anywhere}.kl-sp-dialog label{display:flex;flex-direction:column;gap:7px;font-size:12px;min-width:0}.kl-sp-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.kl-sp-form .wide{grid-column:1/-1}.kl-sp-form textarea{min-height:90px;resize:vertical}.kl-sp-steps{display:flex;gap:8px;list-style:none;padding:0;margin:0 0 20px}.kl-sp-steps li{flex:1;font-size:11px;color:var(--kl-muted);padding-bottom:9px;border-bottom:2px solid var(--kl-border)}.kl-sp-steps li[aria-current=step]{color:var(--kl-accent);border-color:var(--kl-accent)}.kl-sp-dialog>.kl-sp-actions{margin-top:18px;justify-content:flex-end}.kl-sp-dialog>.kl-sp-actions>button:first-child{margin-right:auto}.kl-sp-preset{padding:10px;border:1px solid var(--kl-border);border-radius:7px;font-size:12px}.kl-sp-preset>span{flex:1;overflow-wrap:anywhere}.kl-sp-review{white-space:pre-wrap;overflow-wrap:anywhere}.kl-sp-error{font-size:12px}
.kl-spaces-page :is(button,input,select):focus-visible,.kl-sp-dialog :is(button,input,select,textarea):focus-visible{outline:2px solid var(--kl-accent);outline-offset:2px}
.kl-sp-dialog:has(.kl-sp-room-creation){background:linear-gradient(var(--kl-surface),var(--kl-surface)),var(--kl-bg)}
.kl-sp-room-creation fieldset{min-width:0;border:0;padding:0;margin:0}.kl-sp-room-creation select{width:100%;max-width:none}.kl-sp-room-creation>.kl-sp-actions{margin-top:18px;justify-content:flex-end}.kl-sp-room-creation>.kl-sp-actions>button:first-child{margin-right:auto}
@container kl-workspace (max-width:650px){.kl-sp-heading{padding:18px 14px}.kl-sp-heading h1{font-size:23px}.kl-sp-heading>.kl-sp-actions{width:auto}.kl-sp-toolbar,.kl-sp-tabs{padding:0 14px 12px}.kl-sp-toolbar .kl-browse-search{width:auto}.kl-sp-results{padding:0 14px 18px}.kl-sp-status{padding:10px 14px}.kl-sp-grid,.kl-sp-detail-grid{grid-template-columns:minmax(0,1fr)}.kl-sp-panel,.kl-sp-hero-body{padding:12px}.kl-sp-hero{padding:0}.kl-sp-panel h1{font-size:24px}.kl-sp-audit{grid-template-columns:minmax(0,1fr);gap:4px}.kl-sp-member>button:first-child{width:100%}}
@media(max-width:700px){.kl-sp-form{grid-template-columns:minmax(0,1fr)}.kl-sp-dialog{padding:16px}}
@media(pointer:coarse){.kl-spaces-page button,.kl-sp-dialog button{min-height:44px}}

.kl-sp-tabs{gap:7px}.kl-sp-tabs>.kl-text-button{font-weight:500}.kl-sp-detail>.kl-sp-tabs{flex-wrap:nowrap;overflow-x:auto;border-bottom:1px solid var(--kl-border);padding:0}.kl-sp-detail>.kl-sp-tabs>.kl-text-button{flex:none;border:0;border-bottom:2px solid transparent;border-radius:0;background:none;padding:12px 4px;color:var(--kl-muted)}.kl-sp-detail>.kl-sp-tabs>.kl-text-button[aria-selected=true]{border-bottom-color:var(--kl-accent);color:var(--kl-text)}.kl-sp-hero-body{padding:16px}
/* Prototype17 room illustration is local CSS, independent from shell colours. */
.kl-sp-card{transition:border-color .16s ease}.kl-sp-card:hover{border-color:var(--kl-border-strong)}.kl-sp-card-heading{display:flex;align-items:center;gap:9px;min-width:0}.kl-sp-card-heading-icon{display:grid;place-items:center;flex:none;width:32px;height:32px;box-sizing:border-box;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-surface-2);color:var(--kl-accent)}.kl-sp-card-heading-icon>.kl-icon{width:17px;height:17px}.kl-sp-card-heading-copy{min-width:0;flex:1}.kl-sp-card-heading-copy h2{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kl-sp-card-heading-copy small{display:block;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--kl-muted);font-size:var(--kl-type-xs)}.kl-sp-card-tags{display:flex;align-items:center;flex-wrap:wrap;gap:5px}.kl-sp-card-open{display:inline-flex;align-items:center;gap:6px}.kl-sp-card-save{position:relative;width:34px;flex:none;padding:7px!important}.kl-sp-card-save>span{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.kl-sp-cover{height:76px;box-sizing:border-box;position:relative;--sp-wall:#21181b;--sp-floor:#121113;--sp-furniture:#4c2931;--sp-frame:#735845;display:block;isolation:isolate;overflow:hidden;border-bottom:1px solid var(--kl-border);background:linear-gradient(180deg,transparent 68%,var(--sp-floor) 68%),radial-gradient(ellipse at 72% 10%,rgba(214,162,75,.075),transparent 65%),var(--sp-wall)}
.kl-sp-cover[data-tone="1"]{--sp-wall:#28231e;--sp-floor:#171512;--sp-furniture:#57432f;--sp-frame:#806b4d}
.kl-sp-cover[data-tone="2"]{--sp-wall:#18241e;--sp-floor:#101814;--sp-furniture:#345542;--sp-frame:#55715a}
.kl-sp-cover[data-tone="3"]{--sp-wall:#202024;--sp-floor:#131315;--sp-furniture:#564737;--sp-frame:#75624c}
.kl-sp-cover::before{content:"";position:absolute;left:11%;top:13%;width:24%;height:54%;border:1px solid var(--sp-frame);border-radius:36px 36px 2px 2px;background:linear-gradient(90deg,transparent calc(50% - .5px),var(--sp-frame) 50%,transparent calc(50% + .5px)),linear-gradient(0deg,transparent 46%,var(--sp-frame) 47%,transparent 49%),#12141b}
.kl-sp-cover::after{content:"";position:absolute;right:10%;bottom:12%;width:39%;height:29%;border:1px solid #c2a47825;border-radius:7px 7px 3px 3px;background:var(--sp-furniture);box-shadow:inset 0 -6px #0002,0 6px 0 -4px #80684b60}
.kl-sp-cover[data-tone="1"]::before{border-radius:2px;width:30%;background-color:#1a2220}.kl-sp-cover[data-tone="1"]::after{border-radius:50%;height:14%;bottom:24%;width:35%;box-shadow:0 15px 0 -5px #80684b90}
.kl-sp-cover[data-tone="2"]::before{left:15%;top:15%;width:21%;height:62%;border-radius:50% 50% 3px 3px;background:radial-gradient(circle at 55% 23%,#d6a24b20 0 11%,transparent 13%),linear-gradient(90deg,#203c2b,#122017)}.kl-sp-cover[data-tone="2"]::after{right:12%;bottom:23%;width:19%;height:32%;border:0;border-radius:50%;background:color-mix(in srgb,var(--sp-furniture) 65%,#21382c);box-shadow:-17px 5px 0 -3px #345841,18px 7px 0 -5px #496342,0 14px 0 -7px #6a5037}
.kl-sp-cover[data-tone="3"]::before{top:19%;left:13%;width:22%;height:42%;border-radius:1px;transform:rotate(-4deg);border-width:3px;background:linear-gradient(145deg,#54313c 40%,#ad956239 41% 58%,#273a39 59%)}.kl-sp-cover[data-tone="3"]::after{width:43%;height:15%;bottom:24%;border-radius:2px;box-shadow:0 11px 0 -5px #80684b80}
.kl-sp-cover[data-tone="theatre"] {
  --sp-wall:#25151a; --sp-floor:#100d10; --sp-furniture:#482630;
  background:linear-gradient(180deg,transparent 73%,var(--sp-floor) 73%),linear-gradient(90deg,#3f1e29,#27161b 19%,transparent 25% 75%,#27161b 81%,#3f1e29),var(--sp-wall);
}
.kl-sp-cover[data-tone="theatre"]::before { left:35%;top:0;width:30%;height:75%;border:0;border-radius:0;clip-path:polygon(40% 0,60% 0,100% 100%,0 100%);background:linear-gradient(180deg,#d6a24b25,#d6a24b03); }
.kl-sp-cover[data-tone="theatre"]::after { left:18%;right:auto;width:64%;height:10%;bottom:14%;border-radius:50%;background:var(--sp-furniture);box-shadow:0 4px 0 #291d24; }
.kl-sp-cover[data-tone="night"] { --sp-wall:#191b25;--sp-floor:#101116;--sp-furniture:#303746;--sp-frame:#626477; }
.kl-sp-cover[data-tone="night"]::before { background:radial-gradient(circle at 65% 23%,#d5c8a950 0 10%,transparent 12%),linear-gradient(90deg,transparent 48%,#626477 50%,transparent 52%),#101522; }
.kl-sp-cover[data-tone="locked"] { background:repeating-linear-gradient(135deg,var(--kl-surface-2) 0 12px,var(--kl-surface) 12px 24px); }
.kl-sp-cover[data-tone="locked"]::before, .kl-sp-cover[data-tone="locked"]::after { content:none; }
.kl-sp-cover-art { position:absolute;inset:0; }
.kl-sp-cover-art::after {
  content:"";position:absolute;right:16%;top:12%;width:9%;height:17%;border-radius:50% 50% 15% 15%;
  background:#d6a24b20;border:1px solid #d6a24b25;box-shadow:0 15px 0 -5px #d6a24b30;
}

.kl-sp-card-footer{flex-wrap:wrap;gap:6px}.kl-sp-card-footer .kl-text-button{min-height:32px;font-size:var(--kl-type-sm)}
.kl-sp-directory-room > span, .kl-sp-detail-meta > span { display:inline-flex;align-items:center;gap:4px; }
.kl-sp-directory-room .kl-icon, .kl-sp-detail-meta .kl-icon, .kl-sp-room-badge > .kl-icon { width:11px;height:11px;flex:none; }
.kl-sp-room-badge { align-items:center;gap:4px;white-space:nowrap; }
.kl-sp-room-badge[data-status="open"] { color:var(--kl-success,#7ac49a);border-color:#7ac49a45; }
.kl-sp-room-badge[data-status="full"] { color:var(--kl-gold); }
.kl-sp-detail > button { min-height:32px;padding-inline:0;background:none;border-color:transparent;color:var(--kl-muted);font-size:11px; }
.kl-sp-detail-heading { display:flex;align-items:flex-start;gap:12px;min-width:0; }
.kl-sp-detail-heading > .kl-sp-card-heading-icon { width:48px;height:48px;border-radius:12px; }
.kl-sp-detail-heading > .kl-sp-card-heading-icon > .kl-icon { width:25px;height:25px; }
.kl-sp-detail-copy { min-width:0;flex:1; }
.kl-sp-detail-copy h1 { margin:0 0 6px; }
.kl-sp-detail-description { margin:12px 0 8px;color:var(--kl-muted); }
.kl-sp-hero-body > .kl-sp-detail-actions { margin-top:14px;gap:6px; }
.kl-sp-detail-actions > .kl-text-button { min-height:34px;font-size:11px; }
.kl-sp-detail-actions > .kl-sp-card-save { margin-inline-start:auto; }
.kl-sp-room-summary > p { margin:8px 0 12px;color:var(--kl-muted); }
.kl-sp-overview-context { grid-column:1/-1; }
.kl-sp-room-detail { display:grid;gap:12px;min-width:0; }
.kl-sp-room-card { padding:0;overflow:hidden; }
.kl-sp-room-card > .kl-sp-cover { height:140px; }
.kl-sp-room-info { padding:14px;min-width:0; }
.kl-sp-room-heading { display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px; }
.kl-sp-room-heading > div { flex:1;min-width:0; }
.kl-sp-room-heading h2 { margin:0;font-weight:650;line-height:1.4;letter-spacing:-.2px;overflow-wrap:anywhere; }
.kl-sp-room-info p { font-size:11px;color:var(--kl-muted);margin:6px 0 0; }
.kl-sp-room-actions { margin-top:12px; }
.kl-spaces-page .kl-sp-room-actions > .kl-text-button {
  min-height:36px;padding:0 12px;gap:8px;border-radius:8px;font-size:11px;font-weight:550;line-height:1.5;
}
.kl-sp-room-actions .kl-icon { width:16px;height:16px;flex:none; }
.kl-spaces-page .kl-sp-room-actions > .kl-text-button--primary {
  min-inline-size:min(158px, 100%);border-color:var(--kl-explore-active-border,var(--kl-border));font-weight:650;box-shadow:none;
}
.kl-spaces-page .kl-sp-room-actions > .kl-text-button:not(.kl-text-button--primary):where(:not(:hover),:disabled) { background:transparent; }
.kl-spaces-page .kl-sp-room-actions > .kl-text-button:disabled { cursor:not-allowed; }
.kl-sp-room-facts { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:12px 0 0;overflow:hidden;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-input-bg); }
.kl-sp-room-facts > div { min-width:0;padding:9px 10px;overflow-wrap:anywhere; }
.kl-sp-room-facts > div + div { border-inline-start:1px solid var(--kl-border); }
.kl-sp-room-facts dt { color:var(--kl-muted);font-size:10px; }
.kl-sp-room-facts dd { margin:3px 0 0;font-size:11px;font-weight:600; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-spaces-page .kl-sp-room-actions > .kl-text-button { min-height:44px; }
  .kl-sp-room-facts > div { padding-inline:8px; }
}
.kl-sp-saved-presets:empty { display:none; }
.kl-sp-saved-presets > .kl-sp-preset + .kl-sp-preset { margin-top:8px; }
.kl-sp-preset-copy { flex:1;min-width:0; }
.kl-sp-preset-copy > p { margin:3px 0 0;color:var(--kl-muted);font-size:11px; }
.kl-spaces-page { scrollbar-gutter:auto; scrollbar-width:thin; scrollbar-color:var(--kl-border-strong) transparent; }
.kl-spaces-page > :is(.kl-sp-heading,.kl-sp-toolbar,.kl-sp-directory-controls,.kl-sp-active-filters,.kl-browse-context,.kl-sp-status,.kl-sp-results) { padding-inline:var(--kl-explore-inset,20px); }
.kl-spaces-page > .kl-sp-toolbar { padding-bottom:12px; }
.kl-spaces-page > .kl-sp-toolbar > .kl-browse-search { height:var(--kl-explore-control,36px); }
.kl-spaces-page > .kl-sp-toolbar > .kl-browse-search input { height:100%; min-height:0; padding-block:0; }
.kl-sp-toolbar > .kl-browse-search > .kl-browse-icon { width:24px; height:24px; min-height:0; padding:4px!important; }
.kl-sp-directory-controls { display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; padding:0 20px 8px; }
.kl-sp-directory-controls > .kl-sp-tabs { padding:0; gap:4px; }
.kl-sp-directory-controls .kl-sp-tabs > .kl-text-button { padding:0 9px; min-height:var(--kl-explore-small,32px); border:1px solid transparent; border-radius:var(--kl-explore-radius,8px); color:var(--kl-muted); background:transparent; font-size:11px; font-weight:500; }
.kl-sp-directory-controls .kl-sp-tabs > .kl-text-button:hover { color:var(--kl-text); background:var(--kl-surface-hover); }
.kl-sp-directory-controls .kl-sp-tabs > .kl-text-button[aria-pressed="true"] { color:var(--kl-text); background:var(--kl-explore-active-bg,var(--kl-surface-2)); border-color:var(--kl-explore-active-border,var(--kl-accent)); }
.kl-sp-active-filters { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:12px; }
.kl-sp-active-filters:empty { display:none; }
.kl-spaces-page > .kl-sp-active-filters > .kl-text-button { min-height:0; padding:5px 2px; border:0; color:var(--kl-muted); background:transparent; font-size:11px; font-weight:400; }
.kl-spaces-page > .kl-sp-active-filters > .kl-text-button:hover { color:var(--kl-text); }
.kl-spaces-page[data-directory="true"] > .kl-sp-active-filters > .kl-text-button { padding-inline:0; color:var(--kl-text); line-height:1.5; }
.kl-spaces-page[data-directory="true"] > .kl-sp-active-filters > .kl-text-button:hover { text-decoration:underline; }
.kl-sp-sort-tools,.kl-sp-sort { display:flex; align-items:center; gap:6px; color:var(--kl-muted); font-size:11px; }
.kl-spaces-page[data-directory="true"] .kl-sp-sort-tools { margin-inline-start:auto; }
.kl-sp-sort > select { height:var(--kl-explore-control,36px); padding:3px 5px; border-color:transparent; background:transparent; font-size:11px; }
.kl-sp-sort-tools > .kl-browse-icon { min-height:var(--kl-explore-control,36px); width:var(--kl-explore-control,36px); height:var(--kl-explore-control,36px); border-radius:var(--kl-explore-radius,8px); }
.kl-sp-directory-summary { margin-bottom:12px; align-items:baseline; line-height:1.5; }
.kl-sp-directory-summary .kl-sp-directory-note { margin:0; line-height:inherit; }
.kl-sp-card,.kl-sp-panel { border-radius:var(--kl-explore-card-radius,10px); }
.kl-sp-card-body { gap:0; }
.kl-sp-card-heading { margin-bottom:8px; }
.kl-sp-card-heading h2 { font-size:13px; }
.kl-sp-card-heading .kl-sp-title { display:block;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:650;line-height:1.5; }
.kl-sp-card-heading .kl-sp-title:hover { text-decoration:underline;text-decoration-color:var(--kl-gold);text-underline-offset:3px; }
.kl-sp-card-heading-copy small { margin-top:3px;font-size:10px;line-height:1.5; }
.kl-spaces-page .kl-sp-card-heading > .kl-browse-icon {
  flex:none;width:var(--kl-sp-card-menu-size,30px);height:var(--kl-sp-card-menu-size,30px);min-height:var(--kl-sp-card-menu-size,30px);
  padding:0!important;border:0;border-radius:8px;background:transparent;color:var(--kl-muted);
}
.kl-spaces-page .kl-sp-card-heading > .kl-browse-icon:is(:hover,[aria-expanded=true]) { background:var(--kl-surface-hover);color:var(--kl-text); }
.kl-sp-card-body .kl-sp-description { margin:0 0 10px; font-size:11px; }
.kl-sp-card-body .kl-sp-meta { min-height:0;margin-bottom:10px;gap:5px 10px;line-height:1.5; }
.kl-sp-card-body .kl-sp-meta .kl-icon { width:12px;height:12px; }
.kl-sp-card-body .kl-sp-room-badge > .kl-icon { width:11px;height:11px; }
.kl-sp-card-body .kl-sp-card-tags { margin-bottom:10px;gap:4px; }
.kl-sp-badge { border-radius:6px; padding:2px 6px; line-height:1.4; }
.kl-sp-card-tags > .kl-sp-badge { padding:3px 6px; }
.kl-sp-card-body .kl-sp-card-tags > .kl-sp-badge:not(.kl-sp-role-badge) {
  max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;
}
.kl-sp-card-body .kl-sp-card-tags > .kl-sp-role-badge { padding:2px 6px; }
.kl-spaces-page .kl-sp-card-footer > .kl-text-button {
  height:var(--kl-sp-card-action-size,32px);min-height:var(--kl-sp-card-action-size,32px);
  padding:0 12px;gap:8px;border-radius:var(--kl-explore-radius,8px);font-size:11px;font-weight:550;
}
.kl-spaces-page .kl-sp-card-footer > .kl-sp-card-open { background:transparent; }
.kl-spaces-page .kl-sp-card-footer > .kl-sp-card-open:hover:not(:disabled) { background:var(--kl-surface-hover); }
.kl-sp-card-footer .kl-icon { width:16px;height:16px; }
.kl-sp-card-open > .kl-icon { order:1; }
.kl-spaces-page .kl-sp-card-footer > .kl-sp-card-save {
  width:var(--kl-sp-card-action-size,32px);border:0;background:transparent;color:var(--kl-muted);padding:0!important;
}
.kl-spaces-page .kl-sp-card-footer > .kl-sp-card-save:hover:not(:disabled) { background:var(--kl-surface-hover); }
.kl-sp-card-footer > .kl-sp-card-save[aria-pressed="true"] { color:var(--kl-accent); }
@container kl-panel (width<=700px) or ((width<=900px) and (height<=500px)) {
  .kl-sp-card { --kl-sp-card-menu-size:44px;--kl-sp-card-action-size:44px; }
}
@media(pointer:coarse){.kl-sp-card { --kl-sp-card-menu-size:44px;--kl-sp-card-action-size:44px; }}
.kl-sp-path { display:flex; gap:8px; justify-content:space-between; align-items:center; }
.kl-sp-path > .kl-text-button:not(.kl-browse-icon) { min-height:32px; padding-inline:0; border-color:transparent; color:var(--kl-muted); background:transparent; font-size:11px; }
.kl-sp-detail > .kl-sp-tabs { gap:20px; }
.kl-sp-detail > .kl-sp-tabs > .kl-text-button { min-height:38px; padding:0 2px 10px; border-radius:0; font-size:12px; font-weight:500; }
.kl-sp-detail-copy h1 { font:700 20px/1.3 var(--kl-font,system-ui); letter-spacing:-.3px; }
@container kl-panel (width > 700px) and (height > 500px) {
  .kl-sp-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .kl-sp-detail-grid { grid-template-columns:minmax(0,1.4fr) minmax(0,1fr); }
}
@container kl-workspace (max-width:480px) {
  .kl-spaces-page[data-directory="false"] .kl-sp-sort-tools { flex:1; justify-content:flex-end; }
}
@container kl-panel (width<=700px) {
  .kl-spaces-page[data-directory="true"] .kl-sp-directory-controls { gap:4px; }
  .kl-spaces-page[data-directory="true"] .kl-sp-directory-controls > .kl-sp-tabs { gap:3px; padding:2px 1px; }
  .kl-spaces-page[data-directory="true"] .kl-sp-directory-controls .kl-sp-tabs > .kl-text-button { padding-inline:6px; }
  .kl-spaces-page[data-directory="true"] .kl-sp-directory-controls .kl-sp-tabs > [data-scope="invites"] { padding-inline:3px; }
}
@container kl-panel (width<=700px) or ((width<=900px) and (height<=500px)) {
  .kl-spaces-page[data-directory="true"] .kl-sp-directory-summary > span:only-child {
    position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap;
  }
}
@container kl-panel (width>700px) and (width<=900px) and (height<=500px) {
  .kl-spaces-page[data-directory="true"] > .kl-sp-toolbar { padding-bottom:8px; }
  .kl-spaces-page[data-directory="true"] .kl-sp-directory-summary { margin-bottom:8px; }
}
@media (pointer:coarse) {
  .kl-sp-directory-controls .kl-text-button,.kl-sp-card-footer > .kl-text-button { min-height:44px; }
  .kl-sp-card-footer > .kl-sp-card-save { width:44px; }
}
/* Prototype17 list/loading/error states. */
.kl-sp-loading[aria-busy=true]{pointer-events:none}.kl-sp-skeleton-card{box-sizing:border-box;min-height:230px;padding:16px;border:1px solid var(--kl-border);border-radius:10px;background:var(--kl-surface);overflow:hidden}.kl-sp-skeleton{position:relative;overflow:hidden;height:11px;margin:0 0 12px;border-radius:5px;background:var(--kl-surface-2)}.kl-sp-skeleton::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--kl-accent) 7%,transparent),transparent);transform:translateX(-100%);animation:kl-sp-shimmer 1.7s ease-in-out infinite}.kl-sp-skeleton--short{width:48%}.kl-sp-skeleton--medium{width:75%}
@keyframes kl-sp-shimmer{to{transform:translateX(100%)}}
.kl-sp-catalog-loading .kl-sp-skeleton::after { background:linear-gradient(90deg,transparent,#d6a24b0a,transparent); }
@container kl-workspace (width > 560px) and (width <= 900px) and (height <= 400px){.kl-sp-card>.kl-sp-cover{height:52px}.kl-sp-room-card>.kl-sp-cover{height:92px}.kl-sp-empty{display:grid;grid-template-columns:28px minmax(0,1fr) auto;column-gap:12px;row-gap:3px;padding:12px 16px;text-align:left;align-items:center}.kl-sp-empty>.kl-icon{grid-column:1;grid-row:1/3;width:24px;height:24px}.kl-sp-empty>h2{grid-column:2;grid-row:1;align-self:end}.kl-sp-empty>p{grid-column:2;grid-row:2;max-width:none;margin:0;align-self:start}.kl-sp-empty>.kl-text-button{grid-column:3;grid-row:1/3;margin:0}}
@media(max-height:500px){.kl-sp-dialog{padding:14px}.kl-sp-dialog h2{margin-bottom:12px}.kl-sp-steps{margin-bottom:12px}.kl-sp-form{gap:10px}.kl-sp-dialog>.kl-sp-actions{margin-top:12px}}
@container kl-workspace (max-width:650px){.kl-sp-card-footer .kl-text-button{min-height:36px}.kl-sp-room-card{padding:0}.kl-sp-detail-copy h1{font-size:20px}.kl-sp-room-card>.kl-sp-cover{height:108px}}
@media(pointer:coarse){.kl-sp-card-footer .kl-text-button,.kl-sp-detail-actions .kl-text-button,.kl-spaces-page .kl-sp-room-actions > .kl-text-button,.kl-sp-detail>button{min-height:44px}.kl-sp-card-save{width:44px}}
@media(prefers-reduced-motion:reduce){.kl-sp-card{transition:none}}
@media(prefers-reduced-motion:reduce){.kl-sp-skeleton::after{animation:none}}

.kl-sp-detail-section h2,.kl-sp-room-heading h2 { font-size:13px; }
.kl-sp-detail-section p { font-size:11px;line-height:1.75; }
.kl-sp-detail-section ol { margin-block:0; }
.kl-sp-detail-section li { font-size:11px; }
@container kl-panel (width <= 700px) {
  .kl-sp-hero-body,.kl-sp-detail-section,.kl-sp-room-info { padding:12px; }
  .kl-sp-detail-heading { gap:10px; }
  .kl-sp-detail-heading > .kl-sp-card-heading-icon { width:40px;height:40px;border-radius:10px; }
  .kl-sp-detail-copy h1 { font-size:21px; }
  .kl-sp-hero-body > .kl-sp-detail-actions { margin-top:10px; }
  .kl-sp-room-card > .kl-sp-cover { height:112px; }
}
@container kl-panel (width > 700px) and (width <= 900px) and (height <= 500px) {
  .kl-sp-hero-body { padding:10px 12px; }
  .kl-sp-detail-heading { gap:10px; }
  .kl-sp-detail-heading > .kl-sp-card-heading-icon { width:36px;height:36px;border-radius:9px; }
  .kl-sp-detail-heading > .kl-sp-card-heading-icon > .kl-icon { width:19px;height:19px; }
  .kl-sp-hero-body > .kl-sp-detail-actions { margin-top:8px; }
  .kl-sp-detail > .kl-sp-tabs > .kl-text-button { min-height:34px;padding-bottom:7px; }
  .kl-sp-room-card > .kl-sp-cover { height:76px; }
}


/* Space details use the prototype's page rhythm independently of directory chrome. */
.kl-rooms-directory:has(.kl-spaces-page:not([hidden])[data-detail="true"]) { grid-template-rows:minmax(0,1fr); }
.kl-rooms-directory:has(.kl-spaces-page:not([hidden])[data-detail="true"]) > :is(.kl-rooms-heading,.kl-rooms-modes) { display:none; }
.kl-spaces-page[data-detail="true"] > .kl-sp-results { padding-top:var(--kl-explore-inset,20px); }
.kl-sp-detail { --kl-sp-detail-title:23px;--kl-sp-detail-padding:16px;--kl-sp-detail-header-bottom:16px;--kl-sp-detail-path-bottom:12px;--kl-sp-detail-tab-top:8px;--kl-sp-detail-tab-height:38px;--kl-sp-detail-tab-bottom:20px;display:flex;gap:0;font-size:12px;line-height:1.5; }
.kl-sp-detail-panel { min-width:0; }
.kl-sp-detail-panel:focus-visible { outline:2px solid var(--kl-accent); outline-offset:2px; }
.kl-sp-detail > .kl-sp-path { margin-bottom:var(--kl-sp-detail-path-bottom); }
.kl-sp-detail > .kl-sp-hero { margin-bottom:var(--kl-sp-detail-header-bottom); }
.kl-sp-detail > .kl-sp-access { padding:24px; text-align:center; }
.kl-sp-access > .kl-icon { display:inline-block; width:24px; height:24px; margin-bottom:12px; vertical-align:middle; color:var(--kl-muted); }
.kl-sp-detail .kl-sp-access > h2 { margin:0; font-size:15px; font-weight:650; line-height:1.4; letter-spacing:-.2px; }
.kl-sp-detail .kl-sp-access > p { max-width:420px; margin:8px auto 14px; color:var(--kl-muted); font-size:11px; line-height:1.7; }
.kl-spaces-page .kl-sp-access > .kl-text-button { min-height:var(--kl-explore-control,36px); margin:4px; padding:0 12px; border-radius:8px; font-size:12px; font-weight:550; line-height:1.5; }
.kl-spaces-page .kl-sp-access > .kl-text-button--primary { border-color:var(--kl-explore-active-border,var(--kl-border)); font-weight:650; box-shadow:none; }
@container kl-panel (width <= 700px) { .kl-sp-detail > .kl-sp-access { padding:12px; } }
@container kl-panel (width <= 900px) and (height <= 500px) { .kl-sp-detail > .kl-sp-access { padding:16px; } }
@container kl-panel (width > 700px) and (width <= 900px) and (height <= 500px) { .kl-sp-detail > .kl-sp-access { margin-top:4px; } }
@media (pointer:coarse) { .kl-spaces-page .kl-sp-access > .kl-text-button { min-height:44px; } }
.kl-sp-detail .kl-sp-hero-body { padding:var(--kl-sp-detail-padding); }
.kl-sp-detail-copy h1 { margin:0;font:700 var(--kl-sp-detail-title)/1.3 var(--kl-font,system-ui);letter-spacing:-.3px; }
.kl-sp-detail-meta { margin-top:7px;gap:5px 10px;font-size:10px;line-height:1.5; }
.kl-sp-detail-meta .kl-icon { width:12px;height:12px; }
.kl-sp-role-badge--gold { color:var(--kl-gold);border-color:color-mix(in srgb,var(--kl-gold) 30%,transparent);background:color-mix(in srgb,var(--kl-gold) 5%,transparent); }
.kl-sp-detail-meta > .kl-sp-role-badge .kl-icon { width:11px;height:11px; }
.kl-sp-detail-description { margin:12px 0 0;font-size:12px;line-height:1.75!important; }
.kl-sp-detail > .kl-sp-tabs { padding:var(--kl-sp-detail-tab-top) 0 0;margin-bottom:var(--kl-sp-detail-tab-bottom);background:var(--kl-bg); }
.kl-sp-detail > .kl-sp-tabs > .kl-text-button { height:var(--kl-sp-detail-tab-height);min-height:var(--kl-sp-detail-tab-height);white-space:nowrap; }
.kl-sp-section-heading { display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:12px; }
.kl-sp-panel .kl-sp-section-heading h2 { min-width:0;margin:0;font-size:13px;font-weight:650;line-height:1.4;letter-spacing:-.2px; }
.kl-sp-detail .kl-sp-section-heading > .kl-text-button,
.kl-sp-preset-actions > .kl-text-button:not(.kl-sp-save-current-room) { min-height:0;height:auto;margin:0;padding:0;border:0;background:none;font-size:11px;font-weight:400;line-height:1.5;white-space:nowrap;color:var(--kl-muted); }
.kl-sp-detail .kl-sp-section-heading > .kl-sp-announcement-edit { color:var(--kl-text); }
.kl-sp-detail .kl-sp-section-heading > .kl-sp-announcement-edit:hover:not(:disabled) { background:none; text-decoration:underline; }
.kl-sp-detail-section > p { margin:0;font-size:11px;line-height:1.75;color:var(--kl-muted); }
.kl-sp-detail-section > .kl-sp-badge + p { margin-top:8px; }
.kl-sp-detail-section > p + .kl-text-button { margin-top:12px; }
.kl-sp-detail-section .kl-sp-small-empty,.kl-sp-saved-presets .kl-sp-small-empty { margin:0;padding:16px 0;font-size:11px;line-height:1.7; }
.kl-sp-activity { display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--kl-border); }
.kl-sp-activity:last-child { border-bottom:0; }
.kl-sp-activity > div { min-width:0; }
.kl-sp-activity p { margin:0;font-size:11px;line-height:1.75;color:var(--kl-muted); }
.kl-sp-activity small { display:block;margin-top:3px;color:var(--kl-muted);font-size:10px; }
.kl-sp-activity-dot { flex:none;width:5px;height:5px;margin-top:7px;border-radius:50%;background:var(--kl-gold); }
.kl-sp-room-facts { margin:12px 0; }
.kl-sp-room-facts dt { display:block;margin-bottom:4px; }
.kl-sp-room-facts dd { margin:0;font-weight:550;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.kl-sp-saved-presets .kl-sp-preset { gap:10px;border-radius:8px;background:var(--kl-input-bg); }
.kl-sp-saved-presets .kl-sp-preset-copy > strong { display:block;font-size:12px;font-weight:550;line-height:1.4; }
.kl-sp-saved-presets .kl-sp-preset-copy > p { margin-top:3px;font-size:10px;line-height:1.5; }
.kl-sp-saved-presets .kl-sp-preset > .kl-sp-card-heading-icon { width:32px;height:32px;border-radius:8px; }
.kl-sp-preset-actions { justify-content:flex-end; }
.kl-spaces-page .kl-sp-preset-actions > .kl-sp-save-current-room {
  height:var(--kl-explore-control,36px); min-height:36px; padding:0 12px; gap:8px; border-radius:8px;
  background:transparent; font-size:12px; font-weight:550; white-space:nowrap;
}
.kl-sp-save-current-room > .kl-icon { width:16px; height:16px; flex:none; }
.kl-spaces-page .kl-sp-preset-actions > .kl-sp-save-current-room:hover:not(:disabled) { background:var(--kl-surface-hover); }
@container kl-panel (width <= 700px) {
  .kl-sp-detail { --kl-sp-detail-title:21px;--kl-sp-detail-padding:12px;--kl-sp-detail-tab-height:40px;--kl-sp-detail-tab-bottom:16px; }
  .kl-sp-detail > .kl-sp-tabs { scrollbar-width:none; }
  .kl-sp-detail > .kl-sp-tabs::-webkit-scrollbar { display:none; }
}
@container kl-panel (width > 700px) and (width <= 900px) and (height <= 500px) {
  .kl-sp-detail { --kl-sp-detail-title:20px;--kl-sp-detail-padding:10px 12px;--kl-sp-detail-header-bottom:8px;--kl-sp-detail-path-bottom:6px;--kl-sp-detail-tab-top:0px;--kl-sp-detail-tab-height:34px;--kl-sp-detail-tab-bottom:10px; }
  .kl-sp-path > .kl-text-button:not(.kl-browse-icon) { min-height:28px;height:28px; }
}

.kl-sp-dialog { position:fixed;font:12px/1.5 var(--kl-font,system-ui); }
.kl-room-dialog,.kl-sp-dialog:has(.kl-sp-editor, > .kl-sp-membership-confirm-body, > .kl-sp-quick-editor) {
  --kl-room-dialog-pad:16px;
  position:fixed;width:min(540px,calc(100vw - 24px));margin:auto;padding:0;overflow:hidden;
}
.kl-sp-dialog:has(.kl-sp-editor) { width:min(620px,calc(100vw - 24px)); }
.kl-room-dialog[open],.kl-sp-dialog:has(.kl-sp-editor, > .kl-sp-membership-confirm-body, > .kl-sp-quick-editor)[open] { display:flex;flex-direction:column; }
.kl-room-dialog-heading {
  display:flex;align-items:center;justify-content:space-between;gap:10px;flex:none;
  padding:12px var(--kl-room-dialog-pad);border-bottom:1px solid var(--kl-border);background:var(--kl-surface);
}
.kl-room-dialog-heading > div { min-width:0; }
.kl-room-dialog-heading .kl-sp-eyebrow { display:block;line-height:17px; }
.kl-room-dialog .kl-room-dialog-heading h2,.kl-sp-dialog .kl-room-dialog-heading h2 {
  margin:0;font:700 16px/1.4 var(--kl-font,system-ui);overflow-wrap:anywhere;
}
.kl-room-dialog-body { min-height:0;min-width:0;padding:var(--kl-room-dialog-pad);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--kl-border-strong) transparent; }
.kl-room-dialog > footer,.kl-sp-dialog > footer.kl-sp-actions {
  display:flex;flex:none;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin:0;
  padding:12px var(--kl-room-dialog-pad);border-top:1px solid var(--kl-border);background:var(--kl-input-bg);
}
.kl-room-dialog > footer > button:first-child,.kl-sp-dialog > footer.kl-sp-actions > button:first-child { margin-inline-end:auto; }
.kl-room-dialog > footer > .kl-text-button,.kl-sp-dialog > footer.kl-sp-actions > .kl-text-button { min-height:36px;font-size:11px; }
.kl-lobby-filter-dialog.kl-room-dialog label { display:grid;gap:6px;margin:0;font-size:12px;font-weight:550;line-height:1.5; }
.kl-lobby-filter-dialog.kl-room-dialog label + label { margin-top:16px; }
.kl-lobby-filter-dialog.kl-room-dialog select { height:37px;padding:8px 10px;border-radius:8px;background:var(--kl-input-bg);font-size:12px;font-weight:400; }
.kl-lobby-filter-dialog.kl-room-dialog [role="status"] { margin:0;color:var(--kl-muted);font-size:11px;line-height:1.5; }
.kl-sp-editor > .kl-sp-steps {
  margin:calc(-1 * (var(--kl-room-dialog-pad) + 4px)) calc(-1 * (var(--kl-room-dialog-pad) + 4px)) calc(var(--kl-room-dialog-pad) + 4px);
  padding:14px 20px;border-bottom:1px solid var(--kl-border);
}
.kl-sp-editor .kl-sp-steps li { display:flex;align-items:center;justify-content:center;gap:6px;padding:0;border:0;font-size:10px; }
.kl-sp-editor .kl-sp-steps li > span { display:grid;place-items:center;flex:none;width:20px;height:20px;border:1px solid var(--kl-border);border-radius:50%; }
.kl-sp-editor .kl-sp-steps li[aria-current="step"] { color:var(--kl-text); }
.kl-sp-editor .kl-sp-steps li[aria-current="step"] > span { background:var(--kl-accent-soft);border-color:var(--kl-accent-border); }
.kl-sp-editor .kl-sp-steps li.kl-sp-step-complete { color:var(--kl-success,#7ac49a); }
.kl-sp-editor .kl-sp-steps li svg { width:11px;height:11px; }
.kl-sp-editor .kl-sp-form label { gap:6px;font-size:12px;line-height:1.5; }
.kl-sp-editor .kl-sp-form :is(input,select,textarea) { border-radius:8px; }
.kl-sp-editor .kl-sp-form :is(input:not([type="checkbox"]),select) { width:100%;height:36px;padding:8px 10px;font-size:12px; }
.kl-sp-editor .kl-sp-form textarea { width:100%;min-height:88px;padding:8px 10px;font-size:12px; }
.kl-sp-editor .kl-sp-form .kl-sp-check-field { display:flex;flex-direction:row;align-items:center;gap:10px;padding:14px 0;border-bottom:1px solid var(--kl-border);cursor:pointer; }
.kl-sp-editor .kl-sp-form .kl-sp-check-field > input { appearance:auto;flex:none;width:13px;height:13px;min-height:0;padding:0;margin:0;accent-color:var(--kl-accent); }
.kl-sp-check-field > span { flex:1;min-width:0; }
.kl-sp-check-field strong { display:block;font-size:11px;font-weight:550; }
.kl-sp-check-field small { display:block;margin-top:3px;color:var(--kl-muted);font-size:10px; }
.kl-sp-extra-settings { min-width:0;border-top:1px solid var(--kl-border);padding-top:12px;font-size:11px; }
.kl-sp-extra-settings > summary { cursor:pointer;color:var(--kl-muted); }
.kl-sp-extra-content { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px; }
.kl-sp-editor .kl-sp-review { white-space:normal; }
.kl-sp-review-card { padding:0;margin-bottom:16px;overflow:hidden;border:1px solid var(--kl-border);border-radius:10px;background:var(--kl-surface); }
.kl-sp-review-card > .kl-sp-cover { width:100%;height:84px; }
.kl-sp-review-card > .kl-sp-cover > .kl-icon { position:absolute;left:8px;bottom:8px;z-index:1;width:13px;height:13px;color:var(--kl-gold); }
.kl-sp-review-body { min-width:0;padding:14px; }
.kl-sp-review-heading { display:flex;align-items:center;flex-wrap:wrap;gap:8px; }
.kl-sp-review-heading h3 { flex:1 1 160px;min-width:0;margin:0;font-size:16px;font-weight:650;line-height:1.4;overflow-wrap:anywhere; }
.kl-sp-review-body > small { display:block;margin-top:6px;color:var(--kl-muted);font-size:11px;overflow-wrap:anywhere; }
.kl-sp-dialog .kl-sp-review-body p { margin:8px 0 0;color:var(--kl-muted);font-size:12px;line-height:1.7;overflow-wrap:anywhere; }
.kl-sp-review-body > .kl-sp-card-tags { margin-top:10px; }
.kl-sp-review-details { display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:10px 16px;margin:0;font-size:11px; }
.kl-sp-review-details dt { color:var(--kl-muted); }
.kl-sp-review-details dd { min-width:0;margin:0;text-align:right;overflow-wrap:anywhere; }
.kl-sp-review-rules { margin-top:16px;border-top:1px solid var(--kl-border);padding-top:12px;font-size:11px;line-height:1.7; }
.kl-sp-review-rules > summary { cursor:pointer;color:var(--kl-text); }
.kl-sp-review-rules ol { margin:8px 0 0;padding-left:20px;color:var(--kl-muted);overflow-wrap:anywhere; }
.kl-sp-dialog .kl-sp-review-welcome { margin:14px 0 0;color:var(--kl-muted);font-size:11px;line-height:1.7;overflow-wrap:anywhere; }
.kl-sp-review-welcome strong { color:var(--kl-text);font-weight:550; }
.kl-sp-review-actions { display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 12px; }
.kl-sp-review-actions > .kl-text-button { min-height:36px;font-size:11px; }
.kl-sp-dialog .kl-sp-review-note { margin:0;color:var(--kl-muted);font-size:10px;line-height:1.5; }
.kl-sp-field-meta,.kl-sp-field-note { min-height:15px;color:var(--kl-muted);font-size:10px;line-height:1.5; }
.kl-sp-field-count { text-align:end; }
.kl-sp-editor .kl-sp-error:empty { display:none; }
.kl-sp-step-hint { color:var(--kl-muted);font-size:10px; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-room-dialog,.kl-sp-dialog:has(.kl-sp-editor, > .kl-sp-membership-confirm-body, > .kl-sp-quick-editor) { --kl-room-dialog-pad:12px; }
  .kl-room-dialog-heading,.kl-room-dialog > footer,.kl-sp-dialog > footer.kl-sp-actions { padding-block:10px; }
  .kl-room-dialog .kl-room-dialog-heading h2,.kl-sp-dialog .kl-room-dialog-heading h2 { font-size:15px; }
  .kl-room-dialog > footer > .kl-text-button,.kl-sp-dialog > footer.kl-sp-actions > .kl-text-button,.kl-lobby-filter-dialog.kl-room-dialog select,.kl-sp-editor .kl-sp-form :is(input:not([type="checkbox"]),select) { min-height:40px; }
  .kl-lobby-filter-dialog.kl-room-dialog select { height:42px;font-size:16px; }
  .kl-sp-editor .kl-sp-form :is(input:not([type="checkbox"]),select) { padding-block:6px; }
  .kl-sp-editor > .kl-sp-steps { padding:12px 16px; }
}
@container kl-panel (width <= 700px) {
  .kl-room-dialog[open] { width:100vw;margin-block:auto 0;border-radius:14px 14px 0 0;border-bottom:0; }
  .kl-sp-editor .kl-sp-form,.kl-sp-extra-content { grid-template-columns:minmax(0,1fr); }
  .kl-sp-review-body { padding:12px; }
  .kl-sp-review-heading h3 { font-size:15px; }
  .kl-sp-review-details { gap:10px; }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-sp-editor > .kl-sp-steps { margin-bottom:12px;padding:8px 16px; }
  .kl-sp-review-card > .kl-sp-cover { height:60px; }
}

.kl-explore-filter-dialog { border-color:var(--kl-border-strong);font:12px/1.5 var(--kl-font,system-ui); }
.kl-explore-filter-dialog::backdrop { background:#030303b8; }
.kl-explore-filter-dialog .kl-room-dialog-heading { gap:12px; }
.kl-explore-filter-dialog .kl-room-dialog-heading > div { flex:1; }
.kl-explore-filter-dialog .kl-sp-eyebrow { font-size:10px;line-height:1.7;letter-spacing:.25px; }
.kl-explore-filter-dialog .kl-room-dialog-heading > .kl-browse-icon {
  width:32px;height:32px;min-height:32px;padding:0!important;border:0;border-radius:8px;background:transparent;color:var(--kl-muted);
}
.kl-explore-filter-dialog .kl-room-dialog-heading > .kl-browse-icon:hover { background:var(--kl-surface-hover);color:var(--kl-text); }
.kl-explore-filter-dialog > footer > .kl-text-button { height:36px;padding:0 12px;border-radius:8px;font-size:12px;line-height:1.5;font-weight:550; }
.kl-explore-filter-dialog > footer > .kl-text-button:first-child { background:transparent; }
.kl-explore-filter-dialog > footer > .kl-text-button:first-child:hover { background:var(--kl-surface-hover); }
.kl-explore-filter-dialog > footer > .kl-text-button--primary { border-color:var(--kl-accent-border);box-shadow:none;font-weight:650; }
.kl-people-filter-count { margin:0;color:var(--kl-muted);font-size:11px;line-height:1.5; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-explore-filter-dialog[open] { width:100vw;margin-block:auto 0;border-radius:14px 14px 0 0;border-bottom:0; }
  .kl-explore-filter-dialog .kl-room-dialog-heading > .kl-browse-icon { width:40px;height:40px;min-height:40px; }
  .kl-explore-filter-dialog > footer > .kl-text-button { height:40px;min-height:40px; }
}
@container kl-panel (width <= 700px) {
  .kl-people-filter-dialog .kl-browse-dialog-chips .kl-text-button { padding-inline:6px; }
}
@media(pointer:coarse) {
  .kl-explore-filter-dialog .kl-room-dialog-heading > .kl-browse-icon { width:44px;height:44px;min-height:44px; }
  .kl-explore-filter-dialog > footer > .kl-text-button,.kl-people-filter-dialog .kl-browse-dialog-chips .kl-text-button { min-height:44px; }
}

/* Space identity and actions follow the same shared header on every device. */
.kl-sp-card-heading-icon[data-color=rose]{background:#351c22;color:#dd9ba4;border-color:#dd9ba425}
.kl-sp-card-heading-icon[data-color=amber]{background:#312b26;color:#caae92;border-color:#caae9225}
.kl-sp-card-heading-icon[data-color=blue]{background:#1b2c3b;color:#8fbad6;border-color:#8fbad625}
.kl-sp-card-heading-icon[data-color=sage]{background:#21332f;color:#98bba8;border-color:#98bba825}
.kl-sp-card-heading-icon[data-color=lavender]{background:#29223d;color:#b09ed8;border-color:#b09ed825}
.kl-sp-header-actions{display:flex;align-items:center;gap:2px;flex:none}
.kl-spaces-page .kl-sp-detail .kl-sp-header-actions>.kl-browse-icon{width:32px;height:32px;min-height:32px;border:0;background:transparent;color:var(--kl-muted);border-radius:8px}
.kl-spaces-page .kl-sp-detail .kl-sp-header-actions>.kl-browse-icon:is(:hover,[aria-expanded=true]){background:var(--kl-surface-hover);color:var(--kl-text)}
.kl-sp-detail-actions>.kl-sp-grow{flex:1}
.kl-sp-detail-actions>.kl-sp-card-save{margin:0}
.kl-sp-detail-actions>.kl-sp-joined{background:transparent;color:var(--kl-muted);border-color:var(--kl-border)}
.kl-spaces-page :is(.kl-sp-detail-actions,.kl-sp-access) > .kl-sp-membership-trigger {
  padding:0 12px; gap:8px; border-radius:8px; font-weight:550; line-height:1.5;
}
.kl-spaces-page .kl-sp-detail-actions > .kl-sp-membership-trigger { font-size:11px; }
.kl-spaces-page .kl-sp-access > .kl-sp-membership-trigger { height:var(--kl-explore-control,36px); }
.kl-sp-membership-trigger > .kl-icon { width:16px; height:16px; flex:none; }
.kl-sp-dialog:has(> :is(.kl-sp-membership-confirm-body,.kl-sp-quick-editor)) { border-color:var(--kl-border-strong); }
.kl-sp-dialog:has(> :is(.kl-sp-membership-confirm-body,.kl-sp-quick-editor))::backdrop { background:#030303b8; }
.kl-sp-dialog:has(> :is(.kl-sp-membership-confirm-body,.kl-sp-quick-editor)) > .kl-room-dialog-heading > .kl-browse-icon {
  width:32px; height:32px; min-height:32px; padding:0!important; border:0; border-radius:8px; background:transparent; color:var(--kl-muted);
}
.kl-sp-dialog:has(> :is(.kl-sp-membership-confirm-body,.kl-sp-quick-editor)) > .kl-room-dialog-heading > .kl-browse-icon:hover { background:var(--kl-surface-hover); color:var(--kl-text); }
.kl-sp-membership-confirm-body > p { margin:0; line-height:1.5; }
.kl-sp-membership-confirm-body > .kl-sp-field-note { margin:10px 0 12px; line-height:1.7; }
.kl-sp-dialog:has(> :is(.kl-sp-preset-confirm-body,.kl-sp-room-entry-body,.kl-sp-room-check-body)) { box-shadow:var(--kl-shadow,0 20px 70px #0009); }
:is(.kl-sp-preset-confirm-body,.kl-sp-room-entry-body) > p + p { margin-top:10px; }
:is(.kl-sp-preset-confirm-body,.kl-sp-room-entry-body) > p.kl-sp-field-note { margin-block:12px; }
.kl-sp-room-check-result > p { margin:0; line-height:1.5; }
.kl-sp-room-check-result > .kl-sp-field-note { margin-block:12px; }
.kl-sp-room-check-body + footer .kl-text-button[hidden] { display:none; }
.kl-sp-saved-presets .kl-sp-preset > button[data-room-preset-id] { background:transparent; }
.kl-sp-saved-presets .kl-sp-preset > button[data-room-preset-id]:hover:not(:disabled) { background:var(--kl-surface-hover); }
.kl-sp-dialog > :is(.kl-sp-membership-confirm-footer,.kl-sp-quick-footer) > .kl-text-button {
  height:36px; padding:0 12px; border-radius:8px; font-size:12px; line-height:1.5; font-weight:550;
}
:is(.kl-sp-membership-confirm-footer,.kl-sp-quick-footer) > .kl-text-button:first-child { background:transparent; }
:is(.kl-sp-membership-confirm-footer,.kl-sp-quick-footer) > .kl-text-button:first-child:hover { background:var(--kl-surface-hover); }
.kl-sp-membership-confirm-footer > .kl-sp-membership-danger {
  color:var(--kl-danger); background:color-mix(in srgb,var(--kl-danger) 7%,transparent); border-color:color-mix(in srgb,var(--kl-danger) 36%,transparent);
}
.kl-sp-dialog :is(.kl-sp-preset-editor input,.kl-sp-room-setup-body select) { width:100%; min-height:var(--kl-explore-control,36px); padding:8px 10px; border-radius:8px; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-sp-dialog:has(> :is(.kl-sp-membership-confirm-body,.kl-sp-quick-editor)) > .kl-room-dialog-heading > .kl-browse-icon {
    width:40px; height:40px; min-height:40px;
  }
  .kl-sp-dialog > :is(.kl-sp-membership-confirm-footer,.kl-sp-quick-footer) > .kl-text-button,
  .kl-spaces-page .kl-sp-preset-actions > .kl-sp-save-current-room { min-height:40px; height:40px; }
  .kl-sp-dialog .kl-sp-announcement-editor textarea { font-size:16px; }
  .kl-sp-dialog :is(.kl-sp-preset-editor input,.kl-sp-room-setup-body select) { min-height:40px; font-size:16px; }
}
.kl-sp-dialog:has(> .kl-sp-quick-editor) { box-shadow:var(--kl-shadow,0 20px 70px #0009); }
.kl-sp-dialog .kl-sp-quick-editor label { gap:6px; }
.kl-sp-quick-editor label > span { font-size:12px; font-weight:550; }
.kl-sp-dialog .kl-sp-announcement-editor textarea {
  width:100%; min-height:88px; padding:8px 10px; line-height:1.6; resize:vertical;
}
.kl-sp-preset-editor .kl-sp-preset-preview { margin:12px 0; }
.kl-sp-preset-editor p.kl-sp-field-note { margin:0; line-height:1.5; }
.kl-sp-room-setup-preview { margin-top:12px; }
.kl-sp-room-setup-preview p { margin:3px 0 0; color:var(--kl-muted); }
.kl-sp-room-setup-body > p { margin:12px 0 0; }
.kl-sp-preset-editor label > .kl-sp-field-note { color:var(--kl-danger); }
.kl-sp-quick-editor > .kl-sp-error:empty { display:none; }
.kl-sp-announcement-current { margin-top:12px; color:var(--kl-muted); }
.kl-sp-announcement-current > p { margin:4px 0 0; white-space:pre-wrap; }
@media (pointer:coarse) {
  .kl-sp-dialog > footer.kl-sp-quick-footer > .kl-text-button,
  .kl-sp-dialog:has(> .kl-sp-quick-editor) > .kl-room-dialog-heading > .kl-browse-icon,
  .kl-spaces-page .kl-sp-preset-actions > .kl-sp-save-current-room { min-height:44px; }
  .kl-sp-dialog:has(> .kl-sp-quick-editor) > .kl-room-dialog-heading > .kl-browse-icon { min-width:44px; }
}
.kl-sp-detail-actions>.kl-browse-icon{width:32px;height:32px;min-height:32px;padding:0;border:0;background:transparent;color:var(--kl-muted)}
.kl-sp-detail-actions>.kl-browse-icon>.kl-icon{width:16px;height:16px}
.kl-spaces-page .kl-sp-detail .kl-sp-detail-section>.kl-sp-event-row{display:flex;align-items:center;justify-content:flex-start;gap:10px;width:100%;min-width:0;min-height:0;padding:10px 0;border:0;border-bottom:1px solid var(--kl-border);border-radius:0;background:none;text-align:left;font-weight:400}
.kl-spaces-page .kl-sp-detail .kl-sp-detail-section>.kl-sp-event-row:last-child{border-bottom:0}
.kl-sp-event-row>.kl-icon{width:14px;height:14px;flex:none;color:var(--kl-muted)}
.kl-sp-event-icon{display:grid;place-items:center;box-sizing:border-box;flex:none;width:32px;height:32px;border:1px solid #caae9225;border-radius:8px;background:#312b26;color:#caae92}
.kl-sp-event-icon>.kl-icon{width:17px;height:17px}
.kl-sp-row-copy{min-width:0;flex:1}
.kl-sp-row-copy>strong{display:block;min-width:0;font-size:12px;font-weight:550;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kl-sp-row-copy>small{display:block;margin-top:3px;color:var(--kl-muted);font-size:10px;font-weight:400;line-height:1.5;overflow-wrap:anywhere}
.kl-sp-info-dialog{width:min(540px,calc(100vw - 24px));padding:0;overflow:hidden}
.kl-sp-info-dialog[open]{display:flex;flex-direction:column}
.kl-sp-info-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--kl-border);flex:none}
.kl-sp-info-heading h2{margin:0;font-size:16px;line-height:1.4}
.kl-sp-info-body{padding:16px;overflow:auto;min-height:0}
.kl-sp-info-body p{margin:0 0 12px;color:var(--kl-muted);font-size:12px;line-height:1.75}
.kl-sp-info-body label{gap:8px}.kl-sp-info-body input{width:100%}
.kl-sp-info-footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 16px;border-top:1px solid var(--kl-border);flex:none}
.kl-sp-info-footer>.kl-text-button{min-height:36px}
.kl-sp-context>h2{margin:0 0 12px;font-size:11px;color:var(--kl-muted)}
.kl-sp-context>h3{font-size:12px;margin:0 0 8px}.kl-sp-context-divider{height:1px;flex:none;background:var(--kl-border);margin:16px 8px}
.kl-sp-context>.kl-text-button{display:flex;width:100%;justify-content:flex-start;margin:8px 0;font-size:11px}
.kl-sp-saved-context{font-size:11px;color:var(--kl-muted)}
.kl-sp-info-dialog .kl-sp-context .kl-sp-saved-context>.kl-sp-saved-row{display:flex;align-items:center;width:100%;min-width:0;min-height:0;height:auto;gap:10px;justify-content:flex-start;margin:0;padding:10px 0;border:0;border-bottom:1px solid var(--kl-border);border-radius:0;background:none;text-align:left;font-size:12px;font-weight:400;line-height:1.5}
.kl-sp-saved-row>.kl-sp-card-heading-icon{flex:none;width:32px;height:32px;border-radius:8px}
.kl-sp-saved-row>.kl-sp-card-heading-icon>.kl-icon{width:17px;height:17px}
.kl-sp-saved-row>.kl-icon{flex:none;width:14px;height:14px;color:var(--kl-muted)}
.kl-sp-context .kl-sp-row-copy>strong{font-size:11px}

@container kl-panel (width<=700px){
 .kl-sp-detail-heading{flex-wrap:wrap;gap:10px}
 .kl-sp-detail-copy{flex-basis:calc(100% - 50px)}
 .kl-sp-header-actions{margin-left:50px}
 .kl-sp-detail-actions>.kl-text-button{height:44px;min-height:44px}
 .kl-sp-detail-actions>.kl-browse-icon{width:40px;height:40px;min-height:40px}
 .kl-sp-detail-actions>.kl-browse-icon[aria-label="Space information"]{flex:none;width:42px;height:44px;min-height:44px}
}
@container kl-panel (width<=700px) or ((width<=900px) and (height<=500px)) {
 .kl-spaces-page .kl-sp-detail .kl-sp-header-actions>.kl-browse-icon{width:44px;height:44px;min-height:44px}
}
@container kl-panel (width>700px) and (width<=900px) and (height<=500px){.kl-sp-detail-actions>.kl-text-button{height:36px;min-height:36px}}
.kl-sp-detail-section>.kl-text-button>.kl-icon[data-icon=arrow-right]{order:1}
.kl-sp-event-row>.kl-icon{order:0!important}

.kl-sp-context-drawer{width:320px;max-width:min(100%,360px);height:100%;margin:0 0 0 auto;border-radius:0;border-top:0;border-bottom:0;border-right:0;border-left:1px solid var(--kl-border-strong);background:var(--kl-panel,var(--kl-surface));box-shadow:-12px 0 40px #0006}
.kl-sp-context-drawer > .kl-sp-info-heading > .kl-browse-icon {
 width:var(--kl-sp-context-close,32px); min-width:var(--kl-sp-context-close,32px);
 height:var(--kl-sp-context-close,32px); min-height:var(--kl-sp-context-close,32px); padding:0!important;
}
.kl-sp-context-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px}
.kl-sp-context-heading h2{margin:0;font-size:11px;color:var(--kl-muted)}
.kl-sp-context-heading>.kl-icon{width:14px;height:14px;color:var(--kl-muted)}
.kl-sp-context>.kl-sp-event-row{font-weight:400;padding:10px 0;background:none;border:0;border-bottom:1px solid var(--kl-border)}

.kl-sp-info-heading>.kl-browse-icon{width:32px;height:32px;min-height:32px;border:0;background:none;color:var(--kl-muted)}
.kl-sp-info-heading .kl-sp-eyebrow{display:block;margin-bottom:3px;font-size:10px;line-height:1.4;letter-spacing:.07em}
.kl-sp-info-dialog .kl-sp-context>.kl-text-button{justify-content:flex-start;min-height:36px;font-size:11px;font-weight:550;background:none}
.kl-sp-info-dialog .kl-sp-context>.kl-text-button:has(.kl-icon){width:auto}
@container kl-panel (height<=500px){.kl-sp-info-heading{padding:10px 12px}.kl-sp-info-heading h2{font-size:15px}.kl-sp-info-body{padding:12px}}

.kl-sp-about-facts{display:flex;flex-direction:column;gap:10px;margin:16px 0;font-size:11px;line-height:1.5}
.kl-sp-about-facts>div{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.kl-sp-about-facts dt{flex:none;color:var(--kl-muted)}
.kl-sp-about-facts dd{min-width:0;margin:0;text-align:right;overflow-wrap:anywhere}
.kl-spaces-page .kl-sp-about-facts dd .kl-text-button{min-height:0;height:auto;padding:0;border:0;background:none;color:var(--kl-muted);font:inherit;white-space:normal;text-align:right}
.kl-sp-detail-section > .kl-sp-about-rules { margin:0; padding-inline-start:16px; color:var(--kl-muted); font-size:11px; line-height:1.7; overflow-wrap:anywhere; }
.kl-sp-about-rules > li { margin:0; padding:3px 0 3px 2px; }
.kl-sp-detail-grid>.kl-sp-note-section{grid-column:1/-1}
.kl-sp-note-section .kl-sp-note-help{margin-top:8px;font-size:10px;color:var(--kl-meta)}
.kl-sp-note-section .kl-sp-note-copy{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;line-height:1.75}
.kl-sp-note-editor>p:first-child{font-size:10px;line-height:1.5;margin:12px 0;color:var(--kl-meta)}
.kl-sp-note-editor label{gap:6px}
.kl-sp-note-editor label>span{font-size:12px;font-weight:550}
.kl-sp-note-editor textarea{width:100%;min-height:120px;padding:8px 10px;border-radius:8px;resize:vertical;line-height:1.6}
.kl-sp-info-dialog:has(.kl-sp-note-editor) .kl-sp-info-footer{justify-content:space-between}
.kl-sp-info-dialog:has(.kl-sp-note-editor){outline:none}
@container kl-panel (width<=700px){
  .kl-sp-info-dialog:has(.kl-sp-note-editor) .kl-sp-info-heading{padding:10px 12px}
  .kl-sp-info-dialog:has(.kl-sp-note-editor) .kl-sp-info-body{padding:12px}
  .kl-sp-info-dialog:has(.kl-sp-note-editor) .kl-sp-info-footer{padding:10px 12px}
  .kl-sp-note-editor textarea{font-size:16px}
}
.kl-sp-note-editor>small{display:block;margin-top:6px;color:var(--kl-meta);font-size:10px;line-height:1.5}
.kl-sp-note-editor .kl-sp-note-error:empty{display:none}
.kl-sp-note-editor .kl-sp-note-error{margin:12px 0;color:var(--kl-muted);font-size:11px;line-height:1.6}
.kl-sp-report-dialog,.kl-sp-report-dialog .kl-mod-dialog-body{font-size:12px;line-height:1.5}
.kl-sp-report-dialog .kl-mod-dialog-body :is(select,textarea){padding:8px 10px;font-size:12px}
.kl-sp-report-dialog .kl-mod-dialog-body textarea{min-height:120px;line-height:1.6}
@container kl-panel (width<=700px){.kl-sp-report-dialog .kl-mod-dialog-body :is(select,textarea){font-size:16px}}
.kl-sp-note-latest{white-space:pre-wrap;padding:12px;border:1px solid var(--kl-border);border-radius:8px}
.kl-sp-note-discard-area{flex:none;max-height:45dvh;overflow:auto;border-top:1px solid #d6a24b50}
.kl-sp-note-discard{padding:12px;margin:10px;border:1px solid #d6a24b50;border-radius:8px;background:#302313;color:#edc990;font-size:11px;line-height:1.5}
.kl-sp-note-discard p{margin:0;color:inherit;font-size:11px;line-height:1.5}
.kl-sp-note-discard-actions{display:flex;align-items:center;gap:8px;min-width:0;margin-top:10px}
.kl-sp-note-discard-actions>.kl-text-button:not(.kl-text-button--primary){border-color:#ff8b8b55;background:#ff8b8b14;color:#ff9b9b}
.kl-sp-info-dialog :is(button,input,textarea):focus-visible{outline:2px solid var(--kl-focus,color-mix(in srgb,var(--kl-accent) 52%,white));outline-offset:3px}
.kl-sp-context p{color:var(--kl-muted);font-size:11px;line-height:1.7}
.kl-sp-context-actions{display:flex;flex-direction:column;gap:8px;margin:14px 0}
.kl-sp-info-dialog .kl-sp-context-actions>.kl-text-button{width:100%;justify-content:flex-start;font-size:11px;font-weight:550;background:none}
.kl-sp-info-dialog .kl-sp-context-actions>.kl-sp-event-row{display:flex;align-items:center;gap:10px;min-width:0;min-height:0;padding:10px 0;border:0;border-bottom:1px solid var(--kl-border);border-radius:0;background:none;text-align:left;font-size:12px;font-weight:400}
.kl-sp-info-dialog .kl-sp-context-actions>.kl-sp-event-row:last-child{border-bottom:0}
.kl-sp-info-dialog .kl-sp-context>.kl-text-button{width:auto;margin:0;min-height:36px;justify-content:flex-start}
.kl-sp-info-dialog .kl-sp-context>.kl-sp-context-history{padding:0;border:0;background:none;min-height:0;height:auto;font-size:11px;font-weight:400;line-height:1.5;color:var(--kl-muted)}
.kl-sp-context-heading h2{line-height:1.4;font-weight:650;letter-spacing:-.2px}
.kl-sp-context-heading+.kl-sp-context-room-note{margin:0;font-size:11px;line-height:1.7}
.kl-sp-saved-context{line-height:1.7}
.kl-sp-saved-context>p{margin:0}
.kl-sp-saved-context>.kl-text-button:not(.kl-sp-saved-row){margin-top:8px;font-size:11px}
.kl-sp-saved-context:empty{display:none}
@container kl-panel (width<=700px){
 .kl-sp-context-drawer .kl-sp-info-heading{padding:10px 12px}
 .kl-sp-context-drawer .kl-sp-info-body{padding:12px}
}
@container kl-panel (width<=700px) or ((width<=900px) and (height<=500px)){
 .kl-sp-context-drawer{--kl-sp-context-close:40px}
 .kl-sp-info-dialog .kl-sp-context>.kl-text-button:not(.kl-sp-context-history){min-height:40px}
 .kl-sp-info-heading>.kl-browse-icon{width:40px;height:40px;min-height:40px;padding:0}
}
@media (pointer:coarse){.kl-sp-context-drawer{--kl-sp-context-close:44px}}

.kl-spaces-page .kl-sp-note-section .kl-sp-section-heading>.kl-text-button{min-height:var(--kl-explore-control,36px);height:var(--kl-explore-control,36px);padding:0 12px;border:1px solid var(--kl-border);border-radius:8px;background:transparent;font-size:11px;font-weight:550;line-height:1.5}
.kl-sp-note-section .kl-sp-note-copy{margin-top:10px}

.kl-sp-member-search-row{display:flex;align-items:center;gap:8px;margin-bottom:12px;min-width:0}
.kl-spaces-page .kl-sp-member-search-row>.kl-browse-search{flex:1;min-width:0;height:36px;min-height:36px;padding-inline:10px;border-radius:8px;background:var(--kl-input-bg)}
.kl-sp-member-search-row>.kl-browse-search>.kl-icon{width:15px;height:15px;color:var(--kl-meta)}
.kl-spaces-page .kl-sp-member-search-row input{min-width:0;height:100%;min-height:0;padding:0;font-size:12px}
.kl-sp-member-search-row>.kl-browse-search:has(input:placeholder-shown)>.kl-browse-icon{display:none}
.kl-spaces-page .kl-sp-member-search-row>.kl-browse-search>.kl-browse-icon{width:24px;min-width:24px;height:24px;min-height:24px;padding:0!important}
.kl-spaces-page .kl-sp-member-search-row>select{flex:none;min-width:0;width:128px;height:36px;min-height:36px;padding:0 8px;border-radius:8px;font-size:11px}
.kl-sp-member-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}
.kl-sp-member-row{display:flex;align-items:center;gap:8px;min-width:0;padding:10px 0;border-bottom:1px solid var(--kl-border)}
.kl-spaces-page .kl-sp-members .kl-sp-member-profile{display:flex;align-items:center;justify-content:flex-start;gap:8px;flex:1;min-width:0;min-height:0;padding:2px;border:0;border-radius:4px;background:transparent;text-align:left;font-weight:400}
.kl-sp-member-profile>.kl-sp-member-avatar{flex:none;width:32px;height:32px;min-width:32px;min-height:32px;border:1px solid var(--kl-border-strong);border-radius:50%;overflow:hidden;font:600 13px var(--kl-font,system-ui)}
.kl-sp-member-profile>span.kl-sp-member-avatar{display:flex;align-items:center;justify-content:center;background:var(--kl-avatar-bg);border:1px solid var(--kl-border-strong);color:var(--kl-text);font:600 13px var(--kl-font,system-ui)}
.kl-sp-members .kl-sp-member-avatar>:is(.kl-addon-badge,.kl-presence-dot){display:none}
.kl-sp-member-profile .kl-sp-row-copy{flex:1;min-width:0}
.kl-sp-member-profile .kl-sp-row-copy>small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kl-sp-member-row>.kl-sp-member-role{flex:none;padding:2px 6px;border-radius:6px;font-size:9px;line-height:1.4;font-weight:400;white-space:nowrap}
.kl-spaces-page .kl-sp-members .kl-sp-member-more,.kl-spaces-page .kl-sp-members .kl-sp-section-heading>.kl-sp-members-manage{flex:none;min-width:32px;width:32px;min-height:32px;height:32px;padding:0;border:0;border-radius:8px;background:transparent;color:var(--kl-muted)}
.kl-spaces-page .kl-sp-members .kl-sp-member-more:is(:hover,[aria-expanded=true]){background:var(--kl-surface-hover);color:var(--kl-text)}
.kl-sp-member-options > .kl-shell-menu-heading{color:var(--kl-muted)}
.kl-sp-member-options > .kl-shell-menu-heading > strong{font-weight:400}
.kl-sp-member-options > .kl-shell-menu-item[data-danger=true],.kl-sp-member-options > .kl-shell-menu-item[data-danger=true] > .kl-icon{color:var(--kl-danger)}
.kl-sp-members>.kl-sp-section-heading{position:relative;flex-wrap:nowrap;padding-right:40px}
.kl-spaces-page .kl-sp-members .kl-sp-section-heading>.kl-sp-members-manage{position:absolute;right:0;top:50%;transform:translateY(-50%)}
.kl-sp-member-more .kl-icon,.kl-sp-members-manage .kl-icon{width:16px;height:16px}
.kl-sp-member-grid>.kl-sp-small-empty{grid-column:1/-1;margin:0}
.kl-sp-members .kl-sp-member-search-note{margin:10px 0 0;color:var(--kl-muted);font-size:10px;line-height:1.6}
.kl-sp-members-body>.kl-text-button,.kl-sp-audit-panel>.kl-text-button{margin-top:12px}
.kl-sp-audit-panel>.kl-sp-audit-help{margin:0 0 8px;color:var(--kl-muted);font-size:10px;line-height:1.6}
.kl-sp-audit-panel>.kl-sp-small-empty{margin:12px 0 0}
@container kl-panel (width<=700px){.kl-sp-member-grid{grid-template-columns:minmax(0,1fr)}}
@container kl-panel (width<=700px) or ((width<=900px) and (height<=500px)){
 .kl-spaces-page .kl-sp-members .kl-sp-member-more{min-width:44px;width:44px;min-height:44px;height:44px}
 .kl-sp-member-row{min-height:52px}
 .kl-spaces-page .kl-sp-member-search-row>.kl-browse-search{height:40px;min-height:40px}
 .kl-spaces-page .kl-sp-member-search-row>select{height:40px;min-height:40px}
 .kl-spaces-page .kl-sp-members .kl-sp-section-heading>.kl-sp-members-manage{width:40px;min-width:40px;height:40px;min-height:40px}
}
@container kl-panel (width>700px) and (width<=900px) and (height<=500px){.kl-sp-member-search-row{margin-bottom:8px}}
`;
