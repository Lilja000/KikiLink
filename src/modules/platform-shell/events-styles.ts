export const EVENTS_STYLES = `
.kl-events-page[data-embedded=true]{height:auto;overflow:visible;scrollbar-gutter:auto}
.kl-events-page[data-embedded=true] > :is(.kl-ev-heading,.kl-browse-context,.kl-ev-toolbar,.kl-ev-tabs,.kl-ev-active-filters){display:none}
.kl-events-page[data-embedded=true] > .kl-ev-results{padding:0}
.kl-events-page[data-embedded=true] > .kl-ev-status{padding:0}
.kl-events-page[data-embedded=true] .kl-ev-grid{grid-template-columns:minmax(0,1fr)}
.kl-events-page[data-embedded=true] .kl-ev-empty > .kl-icon{margin-bottom:4px}
.kl-events-page[data-embedded=true] .kl-ev-empty > h2{font-weight:650;line-height:1.4;letter-spacing:-.2px}
.kl-events-page[data-embedded=true] .kl-ev-empty > .kl-text-button{padding:0 12px;font-weight:550;line-height:1.5}
@container kl-panel (width > 700px) and (width <= 900px) and (height <= 500px){
  .kl-events-page[data-embedded=true] .kl-ev-empty > .kl-icon{margin-bottom:0}
}


.kl-ev-outline ol{list-style:none;padding:0;margin:0}.kl-ev-outline li{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--kl-border)}.kl-ev-outline li:last-child{border:0}.kl-ev-outline time{color:var(--kl-muted)}.kl-ev-outline li>span{overflow-wrap:anywhere}.kl-ev-discard-report{border-top:1px solid var(--kl-border);margin-top:12px;padding-top:12px}

.kl-events-page{height:100%;min-width:0;overflow:auto;scrollbar-gutter:stable;background:transparent}.kl-events-page[hidden]{display:none!important}
.kl-ev-heading,.kl-ev-toolbar,.kl-ev-actions,.kl-ev-meta,.kl-ev-tabs{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.kl-ev-heading{padding:20px 24px 14px;justify-content:space-between}.kl-ev-heading h1{margin:0;font-size:24px;font-weight:600}.kl-ev-heading>div{display:flex;gap:8px;align-items:center}.kl-ev-toolbar{padding:0 24px 12px}.kl-ev-toolbar>.kl-ev-search{flex:1;min-width:150px}
.kl-events-page input,.kl-events-page select,.kl-events-page textarea,.kl-ev-dialog input,.kl-ev-dialog select,.kl-ev-dialog textarea{min-width:0;box-sizing:border-box;border:1px solid var(--kl-border);border-radius:7px;background:var(--kl-input-bg);color:var(--kl-text);padding:9px;font:inherit;max-width:100%}
.kl-ev-toolbar select{max-width:170px}.kl-ev-tabs{padding:0 24px 14px}.kl-ev-tabs .kl-text-button[aria-pressed=true],.kl-ev-actions .kl-text-button[aria-pressed=true]{background:color-mix(in srgb,var(--kl-accent) 12%,var(--kl-surface));color:var(--kl-accent);border-color:var(--kl-border)}
.kl-ev-results{padding:0 24px 24px;min-width:0}.kl-ev-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.kl-ev-card,.kl-ev-panel{border:1px solid var(--kl-border);border-radius:10px;background:var(--kl-surface);padding:16px;min-width:0}.kl-ev-card{display:flex;flex-direction:column;gap:12px}.kl-ev-card-top{display:flex;align-items:flex-start;gap:12px}.kl-ev-card-top>div:last-child{min-width:0;flex:1}.kl-ev-card h2{font-size:15px;line-height:1.4;margin:5px 0}.kl-ev-title{border:0;background:none;color:var(--kl-text);text-align:left;font:inherit;font-weight:600;padding:0;cursor:pointer;overflow-wrap:anywhere}.kl-ev-datebox{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none;width:44px;min-height:50px;box-sizing:border-box;padding:5px 4px;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-surface-2);color:var(--kl-muted);line-height:1.2}.kl-ev-datebox strong{font-size:var(--kl-type-xl);font-weight:600;line-height:1.1}.kl-ev-datebox span{font-size:var(--kl-type-xxs);margin-bottom:2px;letter-spacing:.5px;text-transform:uppercase}.kl-ev-datebox small{font-size:var(--kl-type-xxs);margin-top:3px;color:var(--kl-muted)}
.kl-ev-card p{margin:0;font-size:12px;line-height:1.6;color:var(--kl-muted);overflow-wrap:anywhere}.kl-ev-card>.kl-ev-description{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;flex:1}.kl-ev-meta{color:var(--kl-muted);font-size:11px;line-height:1.6}.kl-ev-meta>span{display:inline-flex;gap:5px;align-items:center}.kl-ev-meta .kl-icon{width:13px;height:13px}.kl-ev-card .kl-ev-actions{margin-top:auto;padding-top:10px;border-top:1px solid var(--kl-border)}.kl-ev-actions>.kl-ev-save{margin-left:auto}
.kl-ev-badge{display:inline-flex;padding:3px 7px;border:1px solid var(--kl-border);border-radius:5px;font-size:10px;color:var(--kl-muted);line-height:1.4}.kl-ev-status{padding:10px 24px;color:var(--kl-muted);font-size:12px}.kl-ev-original{box-sizing:border-box;max-width:100%;max-height:240px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;padding:12px;border:1px solid var(--kl-border);border-radius:8px;color:var(--kl-text);font:inherit}.kl-ev-status>button{margin:4px 6px 4px 0}.kl-ev-status:empty{display:none}.kl-ev-status[data-error=true]{color:var(--kl-accent)}.kl-ev-empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 16px;text-align:center;color:var(--kl-muted);border:1px dashed var(--kl-border);border-radius:10px;background:transparent}.kl-ev-empty>.kl-icon{width:28px;height:28px}.kl-ev-empty h2{margin:0;font-size:16px;color:var(--kl-text)}.kl-ev-empty p{max-width:340px;margin:0 auto;font-size:11px;line-height:1.7}
.kl-ev-detail{display:flex;flex-direction:column;gap:12px}.kl-ev-detail h1{font-size:24px;line-height:1.3;margin:6px 0;overflow-wrap:anywhere}.kl-ev-detail h2{font-size:14px;margin:0 0 12px}.kl-ev-detail p{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6}.kl-ev-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;padding:20px 0}.kl-ev-facts>div{display:flex;flex-direction:column;gap:6px;min-width:0;overflow-wrap:anywhere}.kl-ev-facts small{color:var(--kl-muted)}.kl-ev-detail-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:12px}.kl-ev-guests{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.kl-ev-person{display:flex;gap:8px;align-items:center;text-align:left;white-space:normal}.kl-ev-row{display:flex;gap:12px;align-items:center;margin-bottom:8px}.kl-ev-row>div{flex:1;min-width:0}.kl-ev-row h2{font-size:14px;margin:3px 0}.kl-ev-agenda-day{font-size:13px;margin:16px 0 8px;color:var(--kl-muted)}
.kl-ev-form { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; }
.kl-ev-form label { display: flex; flex-direction: column; min-width: 0; font-size: 12px; }
.kl-ev-form .wide { grid-column: 1/-1; }
.kl-ev-form textarea { resize: vertical; }
.kl-ev-form-error { color: var(--kl-danger); font-size: 12px; line-height: 1.5; }
.kl-ev-review { display: flex; flex-direction: column; }
.kl-ev-review p { margin: 0; }
.kl-ev-review small { color: var(--kl-muted); }
.kl-events-page button:focus-visible,.kl-events-page input:focus-visible,.kl-events-page select:focus-visible,.kl-ev-dialog :is(button,input,select,textarea):focus-visible{outline:2px solid var(--kl-accent);outline-offset:2px}
@container kl-workspace (max-width:650px){.kl-ev-heading{padding:16px 14px}.kl-ev-heading h1{font-size:21px}.kl-ev-toolbar,.kl-ev-tabs{padding:0 14px 12px}.kl-ev-results{padding:0 14px 16px}.kl-ev-status{padding:8px 14px}.kl-ev-toolbar select{flex:1;max-width:100%}.kl-ev-panel{padding:14px}.kl-ev-row{flex-wrap:wrap}}
@media(pointer:coarse){.kl-events-page button,.kl-ev-dialog button{min-height:44px}}

.kl-events-page .kl-text-button,.kl-ev-dialog .kl-text-button{display:inline-flex;align-items:center;justify-content:center;gap:6px}.kl-events-page .kl-text-button>.kl-icon,.kl-ev-dialog .kl-text-button>.kl-icon{width:15px;height:15px;flex:none}
/* Prototype 17 event hierarchy: date, title/host, facts, compact RSVP footer. */
.kl-ev-card{display:grid;grid-template-columns:44px minmax(0,1fr) 24px;grid-template-rows:auto auto auto auto auto 1fr auto;column-gap:10px;row-gap:0;padding:14px;transition:border-color .16s ease}
.kl-ev-card:hover{border-color:var(--kl-border-strong)}.kl-ev-card>.kl-ev-datebox{grid-column:1;grid-row:1/4;width:44px;min-height:50px;align-self:start}
.kl-ev-card>h2{grid-column:2;grid-row:1;margin:0 0 3px;font-size:var(--kl-type-md);line-height:1.4}.kl-ev-card>.kl-ev-host-line{grid-column:2;grid-row:2;margin:0 0 4px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--kl-muted);font-size:var(--kl-type-xs)}
.kl-ev-host-line .kl-text-button,.kl-ev-profile-link,.kl-ev-detail-host .kl-text-button{padding:0!important;border:0;background:transparent;min-height:0!important;font-size:inherit;line-height:inherit;text-align:left;color:inherit;white-space:inherit}.kl-ev-host-line .kl-text-button:hover,.kl-ev-profile-link:hover,.kl-ev-detail-host .kl-text-button:hover{color:var(--kl-accent);text-decoration:underline}
.kl-ev-card>.kl-ev-card-category{grid-column:2;grid-row:3;font-size:10px;gap:4px 8px}.kl-ev-card>.kl-ev-menu{grid-column:3;grid-row:1/3;align-self:start;justify-self:end;margin:-5px -5px 0 0}
.kl-ev-card>.kl-ev-description{grid-column:1/-1;grid-row:4;-webkit-line-clamp:2;min-height:34px;margin:12px 0 10px;font-size:var(--kl-type-sm);line-height:1.55}.kl-ev-card-facts{grid-column:1/-1;grid-row:5;gap:5px 10px;font-size:var(--kl-type-xs)}.kl-ev-tags{grid-column:1/-1;grid-row:6;display:flex;flex-wrap:wrap;gap:4px;margin:0 0 12px}.kl-ev-card>.kl-ev-actions{grid-column:1/-1;grid-row:7;margin:0}.kl-ev-card .kl-text-button{min-height:32px;font-size:11px;padding:7px 10px}.kl-ev-save{width:34px;flex:none;padding:7px!important;justify-content:center;position:relative}.kl-ev-save>.kl-icon{width:16px;height:16px}
.kl-ev-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.kl-ev-menu{position:relative;flex:none}
.kl-ev-sort{display:flex;align-items:center;gap:8px;color:var(--kl-muted);font-size:11px}.kl-ev-sort select{padding:6px}.kl-ev-layout{align-items:center;flex-wrap:wrap}.kl-ev-active-filters{flex-basis:100%;display:flex;gap:6px;align-items:center;flex-wrap:wrap}.kl-ev-empty>.kl-text-button{margin:4px auto 0}
.kl-ev-card-top>div{flex:1;min-width:0}.kl-ev-detail-host{display:flex;gap:4px 12px;flex-wrap:wrap;color:var(--kl-muted);font-size:12px}.kl-ev-detail-host .kl-text-button{white-space:normal}.kl-ev-detail-tabs{display:flex;gap:20px;border-bottom:1px solid var(--kl-border)}.kl-ev-detail-tabs>.kl-text-button{border:0;border-bottom:2px solid transparent;border-radius:0;background:none;padding:10px 2px!important;color:var(--kl-muted)}.kl-ev-detail-tabs>[aria-selected=true]{color:var(--kl-accent);border-bottom-color:var(--kl-accent)}
.kl-ev-main-column,.kl-ev-side-column{display:flex;flex-direction:column;gap:12px}.kl-ev-detail-grid ul{padding-left:18px;margin:0;color:var(--kl-muted);font-size:12px;line-height:1.8}.kl-ev-guests{margin-top:16px}.kl-ev-person{display:flex;padding:12px 0;border-bottom:1px solid var(--kl-border);gap:10px;align-items:center;min-width:0}.kl-ev-person>div{min-width:0;flex:1}.kl-ev-person>div>small{display:block;font-size:11px;color:var(--kl-muted);margin-top:3px;overflow-wrap:anywhere}.kl-ev-person>.kl-ev-badge{margin-left:auto}.kl-ev-person .kl-ev-profile-link{font-size:12px!important;overflow-wrap:anywhere;white-space:normal}.kl-ev-avatar{width:36px;height:36px;flex:none;display:grid;place-items:center;border-radius:50%;background:var(--kl-surface-2);font-size:12px;font-weight:600;overflow:hidden}.kl-ev-avatar>img,.kl-ev-avatar>div{width:100%;height:100%;object-fit:cover;border-radius:inherit}.kl-ev-avatar img{max-width:100%;height:100%;object-fit:cover}.kl-ev-private-person{font-size:12px;overflow-wrap:anywhere}
.kl-ev-row{padding:10px 14px;gap:12px}.kl-ev-row>.kl-ev-row-open{display:flex;flex:1;gap:12px;min-width:0;align-items:center;text-align:left;border:0;background:none;color:var(--kl-text);padding:0;font:inherit;cursor:pointer}.kl-ev-row-copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}.kl-ev-row-copy>strong{font-size:var(--kl-type-body)}.kl-ev-row-copy>small{font-size:var(--kl-type-xs);color:var(--kl-muted)}.kl-ev-row-open>.kl-icon{width:16px;flex:none}.kl-ev-row .kl-ev-save{display:none}
.kl-ev-schedule-preview{margin-top:14px;border:1px solid var(--kl-border);border-radius:7px;padding:10px 12px;font-size:11px;line-height:1.6;background:var(--kl-input-bg);color:var(--kl-muted);overflow-wrap:anywhere}.kl-ev-review-edit{display:flex;gap:8px;flex-wrap:wrap}.kl-ev-form label>small{align-self:flex-end}
.kl-events-page summary:focus-visible{outline:2px solid var(--kl-accent);outline-offset:2px}
@container kl-workspace (max-width:650px){.kl-ev-heading>div{min-width:0;flex-wrap:wrap}.kl-ev-row{flex-wrap:wrap}.kl-ev-row>.kl-ev-row-open{flex-basis:100%}.kl-ev-detail-grid{gap:12px}}
@media(pointer:coarse){.kl-ev-card .kl-text-button{min-height:40px}.kl-ev-profile-link{min-height:0!important}.kl-ev-save{width:40px}}
@media(prefers-reduced-motion:reduce){.kl-ev-card{transition:none}}
/* Prototype17 layout switch and date-led agenda. */
@container kl-panel (width > 700px) and (width <= 1150px){.kl-ev-card{padding:12px}}
@container kl-panel (width <= 700px){.kl-ev-grid{grid-template-columns:minmax(0,1fr)}}
.kl-ev-layout>.kl-text-button{min-height:28px;padding:4px 9px;font-size:var(--kl-type-sm);border-color:transparent;border-radius:5px}
.kl-ev-layout>.kl-text-button[aria-pressed=true]{border-color:var(--kl-border);background:var(--kl-surface-hover);color:var(--kl-text)}
.kl-ev-row-open>.kl-ev-datebox{width:36px;min-height:42px;border-radius:7px}.kl-ev-row-open>.kl-ev-datebox>strong{font-size:var(--kl-type-lg)}.kl-ev-row-open>.kl-ev-datebox>small{display:none}
@container kl-workspace (max-width:650px){.kl-ev-layout>.kl-text-button{min-height:36px}.kl-ev-card .kl-text-button{min-height:40px}}
@media(pointer:coarse){.kl-ev-layout>.kl-text-button{min-height:40px}}
/* Prototype17 loading/error states. */
.kl-ev-loading[aria-busy=true]{pointer-events:none}.kl-ev-skeleton-card{box-sizing:border-box;min-height:230px;padding:16px;border:1px solid var(--kl-border);border-radius:10px;background:var(--kl-surface);overflow:hidden}.kl-ev-skeleton{position:relative;overflow:hidden;height:11px;margin:0 0 12px;border-radius:5px;background:var(--kl-surface-2)}.kl-ev-skeleton::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--kl-accent) 7%,transparent),transparent);transform:translateX(-100%);animation:kl-ev-shimmer 1.7s ease-in-out infinite}.kl-ev-skeleton--avatar{width:42px;height:42px;margin-bottom:18px;border-radius:10px}.kl-ev-skeleton--short{width:48%}.kl-ev-skeleton--medium{width:75%}
@keyframes kl-ev-shimmer{to{transform:translateX(100%)}}
.kl-ev-catalog-loading .kl-ev-skeleton--medium { width:100%; }
.kl-ev-catalog-loading .kl-ev-skeleton::after { background:linear-gradient(90deg,transparent,#d6a24b0a,transparent); }
@container kl-workspace (width > 560px) and (width <= 900px) and (height <= 400px){.kl-ev-empty{display:grid;grid-template-columns:28px minmax(0,1fr) auto;column-gap:12px;row-gap:3px;padding:12px 16px;text-align:left;align-items:center}.kl-ev-empty>.kl-icon{grid-column:1;grid-row:1/3;width:24px;height:24px}.kl-ev-empty>h2{grid-column:2;grid-row:1;align-self:end}.kl-ev-empty>p{grid-column:2;grid-row:2;max-width:none;margin:0;align-self:start}.kl-ev-empty>.kl-text-button{grid-column:3;grid-row:1/3;margin:0}}
@media(prefers-reduced-motion:reduce){.kl-ev-skeleton::after{animation:none}}

/* Events uses the Explore controls while retaining its two-way layout switch. */
.kl-events-page {
  --kl-ev-inset: var(--kl-explore-inset, 20px);
  --kl-ev-control: var(--kl-explore-control, 36px);
  --kl-ev-small: var(--kl-explore-small, 32px);
  --kl-ev-radius: var(--kl-explore-radius, 8px);
  --kl-ev-active-bg: var(--kl-explore-active-bg, color-mix(in srgb, var(--kl-accent) 12%, transparent));
  --kl-ev-active-border: var(--kl-explore-active-border, color-mix(in srgb, var(--kl-accent) 58%, var(--kl-muted)));
  scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent; scrollbar-gutter: auto;
}
.kl-ev-heading { gap: 12px; padding: var(--kl-ev-inset) var(--kl-ev-inset) 16px; }
.kl-ev-heading h1 { font-size: var(--kl-type-xl); font-weight: 700; line-height: 1.3; letter-spacing: -.3px; }
.kl-events-page:has(> .kl-ev-heading.kl-ev-path) { padding-top: 20px; }
.kl-ev-heading.kl-ev-path { padding: 0; margin: 0 var(--kl-ev-inset) 12px; }
.kl-ev-toolbar, .kl-ev-tabs { padding: 0 var(--kl-ev-inset) 12px; }
.kl-ev-tabs { justify-content: space-between; padding-bottom: 8px; }
.kl-ev-results { padding: 0 var(--kl-ev-inset) var(--kl-ev-inset); }
.kl-ev-results > .kl-browse-summary { margin: 0 0 12px; gap: 12px; }
.kl-events-page[data-layout=cards] > .kl-ev-results > .kl-browse-summary { line-height: 1.5; }
.kl-events-page > :is(.kl-browse-context,.kl-ev-status) { padding-inline: var(--kl-ev-inset); }
.kl-events-page :is(.kl-ev-heading,.kl-ev-toolbar) .kl-text-button { min-height: var(--kl-ev-control); padding: 0 12px; gap: 8px; border-radius: var(--kl-ev-radius); font-weight: 550; }
.kl-events-page :is(.kl-ev-heading,.kl-ev-toolbar) .kl-text-button > .kl-icon { width: 16px; height: 16px; }
.kl-events-page .kl-ev-heading .kl-text-button--primary { font-weight: 650; box-shadow: none; border-color: var(--kl-ev-active-border); }
.kl-events-page .kl-ev-path .kl-ev-back-link { min-height: var(--kl-ev-control); padding: 0; gap: 6px; border: 0; background: transparent; color: var(--kl-muted); font-size: var(--kl-type-body); line-height: 1.5; }
.kl-events-page .kl-ev-path .kl-ev-back-link:hover { color: var(--kl-text); text-decoration: underline; }
.kl-events-page .kl-ev-heading > div > .kl-browse-icon,
.kl-events-page .kl-ev-detail-tools .kl-ev-icon-action { width: var(--kl-ev-small); min-height: var(--kl-ev-small); height: var(--kl-ev-small); padding: 0; border: 0; border-radius: var(--kl-ev-radius); background: transparent; color: var(--kl-muted); }
.kl-events-page :is(.kl-ev-heading > div > .kl-browse-icon,.kl-ev-detail-tools .kl-ev-icon-action):hover { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-events-page .kl-ev-toolbar .kl-browse-search { height: var(--kl-ev-control); min-height: var(--kl-ev-control); padding: 0 10px; border-radius: var(--kl-ev-radius); background: var(--kl-input-bg); }
.kl-events-page .kl-ev-toolbar .kl-browse-search > .kl-icon { width: 15px; height: 15px; color: var(--kl-meta); }
.kl-events-page .kl-ev-toolbar .kl-browse-search input { height: 100%; padding: 0; }
.kl-events-page .kl-ev-toolbar .kl-browse-search > .kl-browse-icon { width: 24px; height: 24px; min-height: 24px; }
.kl-events-page .kl-ev-toolbar > .kl-ev-context-action { position: relative; flex: none; width: max(42px, var(--kl-ev-control)); padding: 0; }
.kl-ev-scopes, .kl-ev-layout-tools { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.kl-ev-layout-tools { margin-left: auto; gap: 8px; }
.kl-events-page .kl-ev-scopes .kl-text-button {
  min-height: var(--kl-ev-small); padding: 0 9px; border: 1px solid transparent; border-radius: var(--kl-ev-radius);
  background: transparent; color: var(--kl-muted); font-size: var(--kl-type-sm); font-weight: 400;
}
.kl-events-page .kl-ev-scopes .kl-text-button:hover { color: var(--kl-text); background: var(--kl-surface-hover); }
.kl-events-page .kl-ev-scopes .kl-text-button[aria-pressed=true] {
  background: var(--kl-ev-active-bg); border-color: var(--kl-ev-active-border); color: var(--kl-text);
}
.kl-ev-layout { display: inline-flex; align-items: center; flex-wrap: nowrap; gap: 2px; padding: 2px; border: 1px solid var(--kl-border); border-radius: 7px; background: var(--kl-input-bg); }
.kl-events-page .kl-ev-layout > .kl-text-button { min-height: 28px; padding: 4px 9px; gap: 5px; background: transparent; color: var(--kl-muted); font-weight: 550; white-space: nowrap; }
.kl-events-page .kl-ev-layout > .kl-text-button > .kl-icon { width: 13px; height: 13px; }
.kl-events-page .kl-ev-layout > .kl-text-button[aria-pressed=true] { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-ev-sort { gap: 6px; }
.kl-events-page .kl-ev-sort select { min-height: var(--kl-ev-control); padding: 3px 5px; border-color: transparent; background: transparent; font-size: inherit; }
.kl-ev-active-filters { margin: 0 var(--kl-ev-inset) 12px; }
.kl-ev-active-filters:empty { display: none; }
.kl-events-page .kl-ev-active-filters > .kl-text-button { min-height: 0; padding: 5px 2px; border: 0; background: transparent; color: var(--kl-muted); font-size: var(--kl-type-sm); font-weight: 550; line-height: 1.5; }
.kl-events-page .kl-ev-active-filters > .kl-text-button:hover { color: var(--kl-text); text-decoration: underline; }
.kl-ev-card, .kl-ev-panel { border-radius: var(--kl-explore-card-radius, 10px); }
.kl-ev-card > h2 { display: grid; min-width: 0; }
.kl-ev-card .kl-ev-title { display: block; width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-weight: 650; }
.kl-ev-card .kl-ev-title:hover { text-decoration: underline var(--kl-accent); text-underline-offset: 3px; }
.kl-ev-card > .kl-ev-host-line { line-height: 1.5; }
.kl-ev-card > .kl-ev-host-line > :is(.kl-text-button,.kl-ev-private-person) { display: block; font-size: inherit; font-weight: 400; line-height: inherit; }
.kl-ev-card > .kl-ev-card-category, .kl-ev-card-facts { line-height: 1.5; }
.kl-ev-card-category > span:first-child { color: var(--kl-text); font-size: var(--kl-type-sm); }
.kl-ev-card-category .kl-ev-visibility { gap: 4px; }
.kl-ev-visibility > .kl-icon { width: 11px; height: 11px; }
.kl-ev-card-facts { margin: 0 0 9px; }
.kl-ev-card-facts > span { gap: 4px; }
.kl-ev-card-facts .kl-icon { width: 12px; height: 12px; }
.kl-ev-tags:empty { margin: 0 0 12px; }
.kl-ev-tag, .kl-ev-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; max-width: 100%; border: 1px solid var(--kl-border); border-radius: 4px; color: var(--kl-muted); font-size: var(--kl-type-xs); line-height: 1.5; white-space: nowrap; }
.kl-ev-tag { display: inline-block; padding: 3px 6px; background: color-mix(in srgb, var(--kl-gold) 3%, transparent); line-height: 1.3; overflow: hidden; text-overflow: ellipsis; }
.kl-ev-badge > .kl-icon { width: 11px; height: 11px; flex: none; }
.kl-ev-badge[data-tone=gold] { color: var(--kl-gold); border-color: color-mix(in srgb, var(--kl-gold) 19%, transparent); background: color-mix(in srgb, var(--kl-gold) 4%, transparent); }
.kl-ev-badge[data-tone=danger] { color: var(--kl-danger); border-color: color-mix(in srgb, var(--kl-danger) 30%, transparent); }
.kl-ev-badge[data-tone=live] { color: var(--kl-success, #79c49a); border-color: color-mix(in srgb, var(--kl-success, #79c49a) 30%, transparent); }
.kl-ev-menu-trigger {
  display: flex; align-items: center; justify-content: center; padding: 0; border: 0;
  width: var(--kl-ev-small); height: var(--kl-ev-small); border-radius: var(--kl-ev-radius);
  color: var(--kl-muted); background: transparent; cursor: pointer;
}
.kl-ev-menu-trigger > .kl-icon { width: 16px; height: 16px; }
.kl-ev-menu-trigger:is(:hover,[aria-expanded="true"]) { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-ev-menu-trigger:disabled { opacity: .5; cursor: default; }
.kl-events-page > .kl-explore-action-menu { line-height: 1.5; }
.kl-events-page > .kl-explore-action-menu > .kl-shell-menu-item { min-height: 32px; }
.kl-events-page > .kl-explore-action-menu > .kl-shell-menu-item > .kl-icon { stroke-width: 1.65; }
.kl-events-page > .kl-explore-action-menu > .kl-shell-menu-item:hover { background: #d6a24b16; outline: none; }
.kl-events-page > .kl-explore-action-menu > .kl-shell-menu-item:focus-visible {
  background: #d6a24b16; outline: 2px solid var(--kl-focus, color-mix(in srgb, var(--kl-accent) 52%, white)); outline-offset: 3px;
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-events-page > .kl-explore-action-menu > .kl-shell-menu-item { min-height: 40px; }
}
.kl-ev-card { --kl-ev-card-action-size: 32px; }
.kl-ev-card .kl-ev-tags > :is(.kl-ev-badge,.kl-ev-tag) { font-size: 10px; line-height: 1.4; border-radius: 6px; background: transparent; }
.kl-ev-card .kl-ev-tags > .kl-ev-badge[data-tone=gold] { border-color: color-mix(in srgb, var(--kl-gold) 30%, transparent); background: color-mix(in srgb, var(--kl-gold) 5%, transparent); }
.kl-ev-card > .kl-ev-menu { margin: -4px -5px 0 0; }
.kl-ev-card > .kl-ev-menu-trigger { width: var(--kl-ev-card-action-size); height: var(--kl-ev-card-action-size); }
.kl-ev-card > .kl-ev-actions { gap: 8px; min-width: 0; }
.kl-ev-card > .kl-ev-actions > .kl-ev-meta { flex: 1; min-width: 0; font-size: 10px; line-height: 1.5; }
.kl-ev-card > .kl-ev-actions > .kl-text-button {
  flex: none; height: var(--kl-ev-card-action-size); min-height: var(--kl-ev-card-action-size);
  padding: 0 12px; gap: 8px; line-height: 1.5; white-space: nowrap;
}
.kl-events-page .kl-ev-card > .kl-ev-actions > .kl-text-button > .kl-icon { width: 16px; height: 16px; }
.kl-events-page .kl-ev-card > .kl-ev-actions > .kl-ev-save { width: var(--kl-ev-card-action-size); min-height: var(--kl-ev-card-action-size); padding: 0 !important; }
.kl-events-page .kl-ev-card > .kl-ev-actions > .kl-ev-save[aria-pressed=false] { border-color: transparent; color: var(--kl-muted); }
.kl-events-page .kl-ev-card > .kl-ev-actions > .kl-ev-save[aria-pressed=false]:hover:not(:disabled) { color: var(--kl-text); }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-ev-card { --kl-ev-card-action-size: 40px; }
}
@media (pointer: coarse) { .kl-ev-card { --kl-ev-card-action-size: 44px; } }
@media (pointer: coarse) { .kl-ev-menu-trigger { min-width: 44px; min-height: 44px; } }
.kl-events-page .kl-ev-actions > .kl-text-button { border-radius: var(--kl-ev-radius); font-weight: 550; }
.kl-events-page .kl-ev-actions > .kl-text-button:not(.kl-text-button--primary) { background: transparent; }
.kl-events-page .kl-ev-actions > .kl-text-button:not(.kl-text-button--primary):hover { background: var(--kl-surface-hover); }
.kl-events-page .kl-ev-actions > .kl-text-button[aria-pressed=true] { background: var(--kl-ev-active-bg); border-color: var(--kl-ev-active-border); color: var(--kl-text); }
.kl-events-page .kl-ev-actions > .kl-text-button--primary { border-color: var(--kl-ev-active-border); box-shadow: none; font-weight: 650; }
.kl-events-page .kl-ev-actions > .kl-ev-save { width: var(--kl-ev-small); min-height: var(--kl-ev-small); }
.kl-ev-agenda { display: grid; gap: 20px; }
.kl-ev-agenda-day { margin: 0; }
.kl-ev-agenda-day > h2 {
  display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 0 0 8px;
  color: var(--kl-muted); font-size: var(--kl-type-sm); font-weight: 550;
}
.kl-ev-agenda-rows { padding: 2px 14px; border: 1px solid var(--kl-border); border-radius: 9px; background: var(--kl-surface); }
.kl-ev-agenda-rows .kl-ev-row { min-width: 0; min-height: 68px; padding: 10px 0; margin: 0; border-bottom: 1px solid var(--kl-border); }
.kl-ev-agenda-rows .kl-ev-row:last-child { border-bottom: 0; }
.kl-ev-row > .kl-ev-row-open { gap: 10px; }
.kl-ev-row-copy { gap: 3px; }
.kl-ev-row-copy > .kl-ev-title { font-weight: 550; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kl-ev-row-end { display: flex; flex: none; flex-direction: column; align-items: flex-end; gap: 5px; }
.kl-ev-row-end > .kl-icon { width: 13px; height: 13px; color: var(--kl-muted); }
.kl-ev-row > .kl-ev-row-controls { flex: none; display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
.kl-ev-row-controls .kl-ev-actions { gap: 6px; }
.kl-events-page .kl-ev-row-controls .kl-text-button { min-height: 32px; padding: 4px 9px; font-size: var(--kl-type-sm); }
.kl-ev-detail { gap: 0; font-size: var(--kl-type-body); line-height: 1.5; }
.kl-ev-detail-header { padding: 16px; margin-bottom: 16px; }
.kl-ev-detail .kl-ev-card-top > .kl-ev-heading-copy { flex: 1; min-width: 0; }
.kl-ev-detail .kl-ev-card-top > .kl-ev-detail-tools { display: flex; align-items: center; flex: none; gap: 2px; }
.kl-ev-detail-tools .kl-ev-menu-trigger { width: 32px; height: 32px; min-height: 32px; }
.kl-ev-detail-badges { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; }
.kl-ev-detail h1 { font-size: 23px; line-height: 1.3; letter-spacing: -.3px; margin: 0; }
.kl-ev-detail-host { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; margin-top: 6px; font-size: 12px; line-height: 1.75; }
.kl-ev-detail-host .kl-ev-profile-link { font-size: 10px; line-height: 1.5; }
.kl-ev-detail-tabs { align-items: flex-end; overflow-x: auto; scrollbar-width: thin; padding-top: 8px; margin-bottom: 20px; background: var(--kl-bg); }
.kl-events-page .kl-ev-detail-tabs > .kl-text-button { flex: none; height: 38px; min-height: 38px; padding: 0 2px 10px !important; font-size: var(--kl-type-body); font-weight: 500; }
.kl-events-page .kl-ev-detail-tabs > [aria-selected=true] { color: var(--kl-text); border-bottom-color: var(--kl-accent); }
.kl-ev-detail-notice { font-size: 11px; }
.kl-ev-detail-notice > span { min-width: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
.kl-ev-detail-notice strong { font-weight: 600; }
.kl-ev-detail-error > p { overflow-wrap: anywhere; }
.kl-events-page :is(.kl-ev-detail-error,.kl-ev-catalog-error) > .kl-text-button { gap: 8px; }
.kl-events-page :is(.kl-ev-detail-error,.kl-ev-catalog-error) > .kl-text-button > .kl-icon { width: 16px; height: 16px; }
.kl-ev-detail [role=tabpanel] .kl-ev-panel { padding: 14px; }
.kl-ev-detail [role=tabpanel] h2 { margin: 0 0 10px; font-size: calc(var(--kl-type-body) + 1px); font-weight: 650; line-height: 1.4; letter-spacing: -.2px; }
.kl-ev-section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.kl-ev-detail .kl-ev-section-heading { align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
.kl-ev-detail .kl-ev-section-heading > div { flex: 1; min-width: 0; }
.kl-ev-detail [role=tabpanel] .kl-ev-section-heading h2 { margin: 0 0 10px; }
.kl-ev-detail .kl-ev-section-heading > .kl-icon { width: 15px; height: 15px; }
.kl-ev-section-heading > .kl-icon { width: 14px; height: 14px; color: var(--kl-muted); }
.kl-ev-detail [role=tabpanel] .kl-ev-section-note { margin-top: 8px; font-size: 10px; color: var(--kl-muted); }
.kl-ev-room-title { display: block; font-size: var(--kl-type-body); font-weight: 550; overflow-wrap: anywhere; }
.kl-ev-side-column li + li { margin-top: 6px; }
.kl-ev-side-column .kl-ev-panel > .kl-text-button { margin-top: 10px; }
.kl-events-page .kl-ev-place > .kl-ev-place-link {
  min-height: var(--kl-explore-control, 36px); padding: 0 12px; gap: 8px;
  border-radius: var(--kl-explore-radius, 8px); font-size: var(--kl-type-body); font-weight: 550; background: transparent;
}
.kl-events-page .kl-ev-place-link > .kl-icon { width: 16px; height: 16px; }
.kl-ev-detail [role=tabpanel] .kl-ev-place-status:empty { margin: 0; }
.kl-ev-detail [role=tabpanel] .kl-ev-place-status { color: var(--kl-accent); }
.kl-events-page .kl-ev-side-column .kl-ev-community-link {
  min-height: 0; padding: 0; border: 0; background: transparent; font-size: 11px; font-weight: 400; line-height: 1.5;
}
.kl-events-page .kl-ev-side-column .kl-ev-community-link:hover { color: var(--kl-accent); text-decoration: underline; }
@media (pointer: coarse) { .kl-events-page .kl-ev-place > .kl-ev-place-link { min-height: 44px; } }
.kl-ev-detail [role=tabpanel] p { margin: 0; color: var(--kl-muted); font-size: var(--kl-type-sm); line-height: 1.75; }
.kl-ev-detail-grid ul { margin: 0; padding-left: 16px; font-size: var(--kl-type-sm); line-height: 1.7; }
.kl-ev-detail [role=tabpanel] p + p { margin-top: 10px; }
.kl-ev-detail [role=tabpanel] .kl-ev-tags { margin: 12px 0 0; }
.kl-ev-guests { gap: 0 16px; margin-top: 0; }
.kl-ev-guest-search { height: var(--kl-ev-control); min-height: var(--kl-ev-control); margin-bottom: 8px; }
.kl-events-page .kl-ev-detail .kl-ev-guest-search input { height: 100%; padding: 0; }
.kl-ev-detail [role=tabpanel] .kl-ev-section-empty { padding: 12px 0; color: var(--kl-muted); font-size: var(--kl-type-sm); line-height: 1.75; }
.kl-ev-guests-error { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px 16px; padding: 12px 0; }
.kl-ev-guests-error h3 { margin: 0 0 4px; font-size: var(--kl-type-body); font-weight: 600; line-height: 1.4; }
.kl-ev-guests-error > .kl-text-button { flex: none; }
.kl-ev-person { padding: 10px 0; }
.kl-ev-person .kl-ev-profile-link { display: block; min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--kl-type-body) !important; font-weight: 550; line-height: 1.4; }
.kl-ev-person > div > small { font-size: var(--kl-type-xs); line-height: 1.5; }
.kl-ev-detail :is(.kl-ev-tag,.kl-ev-badge) { line-height: 1.4; }
.kl-ev-avatar { width: 32px; height: 32px; font-size: 13px; line-height: normal; }
.kl-ev-person > .kl-ev-badge { font-size: var(--kl-type-xxs); border-radius: 6px; }
.kl-ev-person > .kl-ev-badge[data-tone=gold] { border-color: color-mix(in srgb,var(--kl-gold) 30%,transparent); background: color-mix(in srgb,var(--kl-gold) 5%,transparent); }
.kl-ev-outline time { width: 48px; flex: none; font-size: var(--kl-type-xs); font-weight: 500; }
.kl-ev-outline li > span { min-width: 0; font-size: var(--kl-type-sm); }
.kl-ev-detail-header .kl-ev-card-top > .kl-ev-datebox { width: 52px; min-height: 60px; }
.kl-ev-detail-header .kl-ev-facts {
  gap: 0; margin-top: 14px; padding: 0; border: 1px solid var(--kl-border);
  border-radius: 8px; background: var(--kl-input-bg);
}
.kl-ev-detail-header .kl-ev-facts > div {
  display: flex; flex-direction: row; align-items: flex-start; gap: 8px; min-width: 0; padding: 10px 12px;
}
.kl-ev-detail-header .kl-ev-facts > div + div { border-left: 1px solid var(--kl-border); }
.kl-ev-detail-header .kl-ev-facts .kl-icon { width: 12px; height: 12px; margin-top: 2px; flex: none; color: var(--kl-muted); }
.kl-ev-fact-copy { flex: 1; min-width: 0; }
.kl-ev-fact-copy > :is(small,strong,span) { display: block; }
.kl-ev-fact-copy > :is(small,span) { font-size: var(--kl-type-xs); color: var(--kl-muted); }
.kl-ev-fact-copy > small { margin-bottom: 4px; }
.kl-ev-fact-copy > strong { font-size: var(--kl-type-sm); font-weight: 550; }
.kl-ev-fact-copy > span { margin-top: 3px; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-ev-detail-actions { --kl-ev-detail-save-size: var(--kl-ev-small); margin-top: 14px; gap: 6px; }
.kl-events-page .kl-ev-detail-actions > .kl-text-button {
  flex: none; min-height: var(--kl-ev-control); padding: 0 12px; gap: 8px;
  font-size: 11px; line-height: 1.5; white-space: nowrap;
}
.kl-events-page .kl-ev-detail-actions > .kl-text-button > .kl-icon { width: 16px; height: 16px; }
.kl-events-page .kl-ev-detail-actions > .kl-ev-detail-context {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: max(42px, var(--kl-ev-control)); padding: 0;
}
.kl-ev-detail-action-spacer { flex: 1; min-width: 0; }
.kl-events-page .kl-ev-detail-actions > .kl-ev-save {
  width: var(--kl-ev-detail-save-size); height: var(--kl-ev-detail-save-size);
  min-height: var(--kl-ev-detail-save-size); margin-left: 0;
}
@container kl-workspace (width > 650px) {
  .kl-ev-toolbar { padding-bottom: 16px; }
  .kl-events-page[data-layout=cards] > .kl-ev-toolbar { padding-bottom: 12px; }
  .kl-ev-tabs { padding-bottom: 14px; }
}
@container kl-workspace (max-width: 650px) {
  .kl-events-page { --kl-ev-inset: var(--kl-explore-inset, 12px); }
  .kl-ev-heading { padding-bottom: 12px; }
  .kl-ev-heading:has(h1) > div:first-child { flex: 1 0 max-content; }
  .kl-ev-heading:has(h1) > div:last-child { margin-left: auto; }
  .kl-ev-layout-tools { margin-left: 0; flex-basis: 100%; }
  .kl-events-page .kl-ev-layout > .kl-text-button, .kl-events-page .kl-ev-scopes .kl-text-button { min-height: 36px; }
  .kl-ev-agenda-rows { padding-inline: 12px; }
  .kl-ev-agenda-rows .kl-ev-row { gap: 6px; }
  .kl-ev-row > .kl-ev-row-controls { flex: 1 0 100%; justify-content: flex-start; padding-inline-start: 46px; }
  .kl-ev-row-controls > .kl-ev-menu { margin-inline-start: auto; }
}
@container kl-panel (width > 700px) and (width <= 1150px) {
  .kl-ev-detail-header { padding: 14px; }
}
@container kl-panel (width <= 700px) {
  .kl-events-page > .kl-ev-heading:not(.kl-ev-path) { align-items: flex-start; gap: 10px; }
  .kl-events-page > .kl-ev-heading:not(.kl-ev-path) > div > .kl-text-button--primary {
    min-height: 40px; padding-inline: 10px; font-size: 11px; line-height: 1.5;
  }
  .kl-events-page > .kl-ev-heading:not(.kl-ev-path) > div > .kl-browse-icon { width: 40px; min-height: 40px; height: 40px; }
  .kl-events-page[data-layout=cards] > .kl-ev-heading:not(.kl-ev-path) { padding-bottom: 16px; }
  .kl-events-page[data-layout=cards] .kl-ev-scopes { padding: 2px 1px; }
  .kl-events-page:has(> .kl-ev-heading.kl-ev-path) { padding-top: 12px; }
  .kl-ev-facts, .kl-ev-detail-grid, .kl-ev-guests { grid-template-columns: minmax(0,1fr); }
  .kl-ev-detail-header { padding: 12px; }
  .kl-ev-detail-header .kl-ev-card-top { position: relative; gap: 10px; }
  .kl-ev-detail-header .kl-ev-card-top > .kl-ev-datebox { width: 40px; min-height: 52px; }
  .kl-ev-detail .kl-ev-detail-tools { position: absolute; top: -3px; right: -4px; }
  .kl-ev-detail-badges { min-height: 40px; align-content: flex-start; padding-right: 76px; }
  .kl-ev-detail h1 { font-size: 20px; }
  .kl-ev-detail-tabs { gap: 18px; margin-bottom: 16px; }
  .kl-events-page .kl-ev-detail-tabs > .kl-text-button { height: 40px; min-height: 40px; }
  .kl-ev-detail-host .kl-ev-profile-link { min-height: 24px !important; }
  .kl-ev-detail-header .kl-ev-facts > div { padding: 8px 10px; }
  .kl-ev-detail-header .kl-ev-facts > div + div { border-left: 0; border-top: 1px solid var(--kl-border); }
  .kl-ev-fact-copy { display: grid; grid-template-columns: 90px minmax(0,1fr); gap: 2px 8px; }
  .kl-ev-fact-copy > small { grid-row: 1/3; align-self: center; margin: 0; }
  .kl-ev-fact-copy > :is(strong,span) { grid-column: 2; text-align: right; margin: 0; }
  .kl-ev-detail [role=tabpanel] .kl-ev-panel { padding: 12px; }
  .kl-events-page .kl-ev-detail-actions > .kl-ev-detail-reminder-button { width: 40px; padding-inline: 0; gap: 0; font-size: 0; }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-ev-detail-actions { --kl-ev-detail-save-size: var(--kl-ev-control); }
  .kl-events-page .kl-ev-detail-tools .kl-ev-icon-action, .kl-ev-detail-tools .kl-ev-menu-trigger { width: 40px; height: 40px; min-height: 40px; }
}
@container kl-panel (width > 700px) and (width <= 1100px) {
  .kl-events-page { --kl-ev-inset: var(--kl-explore-inset, 16px); }
  .kl-events-page:has(> .kl-ev-heading.kl-ev-path) { padding-top: 16px; }
}
@container kl-panel (width > 700px) and (width <= 900px) and (height <= 500px) {
  .kl-events-page[data-layout=cards] > :is(.kl-ev-heading:not(.kl-ev-path),.kl-ev-toolbar) { padding-bottom: 8px; }
  .kl-events-page[data-layout=cards] > .kl-ev-results > .kl-browse-summary { margin-bottom: 8px; }
  .kl-events-page:has(> .kl-ev-heading.kl-ev-path) { padding-top: 12px; }
  .kl-ev-heading.kl-ev-path { margin-bottom: 6px; }
  .kl-ev-detail-header { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 8px 12px; padding: 10px 12px; margin-bottom: 8px; }
  .kl-ev-detail-header > .kl-ev-card-top { grid-column: 1; grid-row: 1; }
  .kl-ev-detail-header .kl-ev-card-top > .kl-ev-datebox { width: 36px; min-height: 40px; }
  .kl-ev-detail-header .kl-ev-datebox > small { display: none; }
  .kl-ev-detail h1 { font-size: 20px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .kl-ev-detail-badges { margin-bottom: 3px; }
  .kl-ev-detail-badges > :is(.kl-ev-badge,.kl-ev-tag) { padding-block: 1px; font-size: 9px; }
  .kl-ev-detail-host { margin-top: 3px; }
  .kl-ev-detail-header .kl-ev-facts { grid-column: 1/-1; margin-top: 0; }
  .kl-ev-detail-header .kl-ev-facts > div { padding: 5px 10px; }
  .kl-ev-detail-actions { grid-column: 2; grid-row: 1; margin-top: 0; flex-wrap: nowrap; }
  .kl-ev-fact-copy { display: grid; grid-template-columns: auto minmax(0,1fr); align-items: baseline; gap: 2px 8px; }
  .kl-ev-fact-copy > small { grid-column: 1; grid-row: 1; margin: 0; font-size: 9px; }
  .kl-ev-fact-copy > strong { grid-column: 2; grid-row: 1; }
  .kl-ev-fact-copy > span { grid-column: 1/-1; grid-row: 2; margin-top: 0; }
  .kl-ev-detail-tabs { padding-top: 0; margin-bottom: 10px; }
  .kl-events-page .kl-ev-detail-tabs > .kl-text-button { height: 34px; min-height: 34px; padding-bottom: 7px !important; }
}

.kl-ev-dialog {
  position: fixed; box-sizing: border-box; width: min(540px,calc(100vw - 24px)); max-height: calc(100dvh - 24px);
  overflow: hidden; padding: 0; border: 1px solid var(--kl-border-strong); border-radius: 12px;
  background: var(--kl-surface); color: var(--kl-text); font-size: 12px; line-height: 1.5; box-shadow: var(--kl-shadow);
}
.kl-ev-dialog::backdrop { background: #030303b8; }
.kl-ev-dialog p { line-height: 1.5; overflow-wrap: anywhere; }
.kl-ev-dialog[open] { display: flex; flex-direction: column; }
.kl-ev-plans-drawer {
  width: 320px; height: var(--kl-dialog-viewport-height, 100dvh); max-width: 100%; max-height: 100dvh;
  margin: 0 0 0 auto; border-width: 0 0 0 1px; border-radius: 0;
  background: var(--kl-surface); box-shadow: -12px 0 40px #0006;
}
.kl-ev-plans-drawer > .kl-ev-dialog-header { background: var(--kl-topbar-bg); }
.kl-ev-dialog-body.kl-ev-plans-body { padding: 16px; }
.kl-ev-plans-body > header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 12px; color: var(--kl-muted); }
.kl-ev-plans-body > header h2 { margin: 0; font-size: 11px; line-height: 1.4; }
.kl-ev-plans-body > header .kl-icon { width: 14px; height: 14px; }
.kl-ev-plans-body > h3 { margin: 0 0 8px; font-size: 12px; }
.kl-ev-plan-detail .kl-ev-plan-note { margin: 0; color: var(--kl-muted); font-size: 10px; line-height: 1.5; }
.kl-ev-plan-detail > .kl-ev-badge { margin-top: 10px; font-size: 10px; line-height: 1.4; }
.kl-ev-plan-detail > hr { height: 1px; margin: 20px 0; border: 0; background: var(--kl-border); }
.kl-ev-plan-actions { display: flex; flex-direction: column; gap: 8px; margin-block: 14px; }
.kl-events-page .kl-ev-plan-actions > .kl-text-button {
  display: flex; align-items: center; justify-content: flex-start; gap: 8px; width: 100%;
  min-height: var(--kl-ev-control); padding: 0 12px; border-radius: var(--kl-ev-radius); background: transparent;
  color: var(--kl-muted); font-size: 11px; font-weight: 550; line-height: 1.5;
}
.kl-events-page .kl-ev-plan-actions > .kl-text-button:hover:not(:disabled) { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-ev-plan-actions .kl-icon { width: 16px; height: 16px; flex: none; }
.kl-ev-plans-results > p { margin: 0; font-size: 11px; color: var(--kl-muted); }
.kl-ev-plans-results > .kl-ev-row-open {
  display: flex; align-items: center; gap: 10px; width: 100%; min-width: 0; padding: 10px 0;
  border: 0; border-bottom: 1px solid var(--kl-border); background: transparent;
  color: var(--kl-text); text-align: left; font: inherit; cursor: pointer;
}
.kl-ev-plans-results .kl-ev-row-copy > strong { font-size: 11px; }
.kl-ev-plans-results .kl-ev-row-open:hover .kl-ev-title { color: var(--kl-gold); }
.kl-ev-plans-results .kl-ev-row-end { display: none; }
.kl-ev-plans-body .kl-text-button.kl-ev-plans-link {
  min-height: 0; padding: 0; margin-top: 12px; border: 0; background: none;
  color: var(--kl-muted); font-size: 11px; font-weight: 400;
}
.kl-ev-plans-body .kl-ev-plans-link:hover { color: var(--kl-text); text-decoration: underline; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-ev-plans-drawer > .kl-ev-dialog-header { padding: 10px 12px; }
  .kl-ev-plans-drawer > .kl-ev-dialog-header h2 { font-size: 15px; }
  .kl-ev-dialog-body.kl-ev-plans-body { padding: 12px; }
}
@container kl-panel (width <= 700px) {
  .kl-ev-plans-results > .kl-ev-row-open { display: grid; grid-template-columns: 36px minmax(0,1fr) 16px; gap: 4px 10px; }
  .kl-ev-plans-results .kl-ev-datebox { grid-column: 1; grid-row: 1 / 3; }
  .kl-ev-plans-results .kl-ev-row-copy { grid-column: 2; grid-row: 1; }
}
@media(pointer:coarse) {
  .kl-ev-plans-body .kl-text-button.kl-ev-plans-link,
  .kl-events-page .kl-ev-plan-actions > .kl-text-button { min-height: 44px; }
  .kl-events-page .kl-ev-detail-actions > .kl-ev-detail-context { min-width: 44px; min-height: 44px; }
}
.kl-ev-editor-dialog {
  width: min(620px, calc(100vw - 24px));
  box-shadow: 0 8px 24px #0005;
  -webkit-font-smoothing: antialiased;
  --kl-ev-editor-focus-border: color-mix(in srgb, var(--kl-accent) 58%, var(--kl-muted));
}
.kl-ev-dialog-header, .kl-ev-dialog-footer { flex: none; display: flex; align-items: center; gap: 8px; min-height: 61px; padding: 12px 16px; }
.kl-ev-dialog-header { justify-content: space-between; border-bottom: 1px solid var(--kl-border); }
.kl-ev-dialog-header > div { flex: 1; min-width: 0; }
.kl-ev-dialog-header h2 { margin: 0; font-size: 16px; line-height: 1.4; overflow-wrap: anywhere; }
.kl-ev-dialog-eyebrow { display: block; margin-bottom: 3px; color: var(--kl-muted); font-size: 10px; line-height: 1.4; letter-spacing: .07em; }
.kl-ev-dialog-close { flex: none; display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: 7px; background: none; color: var(--kl-muted); cursor: pointer; }
.kl-ev-dialog-close:hover { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-ev-dialog-close > .kl-icon { width: 16px; height: 16px; }
.kl-ev-dialog-body { --kl-ev-dialog-inset: 16px; min-height: 0; padding: var(--kl-ev-dialog-inset); overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent; }
.kl-ev-dialog-body > p { margin: 0; font-size: 12px; }
.kl-ev-dialog-body > p + p:not(:empty), .kl-ev-dialog-field { margin-top: 10px; }
.kl-ev-dialog-body > p:empty { display: none; }
.kl-ev-dialog-note, .kl-ev-dialog-body > .kl-ev-dialog-note { color: var(--kl-muted); font-size: 10px; }
.kl-ev-dialog-body > .kl-ev-withdraw-note { color: var(--kl-muted); font-size: 12px; }
.kl-ev-dialog-field { display: grid; gap: 6px; font-size: 12px; }
.kl-ev-dialog-footer { justify-content: flex-end; flex-wrap: wrap; border-top: 1px solid var(--kl-border); background: var(--kl-input-bg); }
.kl-ev-dialog-footer > :first-child:not(:last-child) { margin-inline-end: auto; }
.kl-ev-dialog .kl-ev-dialog-footer .kl-text-button { min-height: 36px; padding: 0 12px; font-size: 11px; font-weight: 550; border-radius: 7px; }
.kl-ev-dialog-footer .kl-ev-danger { color: var(--kl-danger); border-color: color-mix(in srgb,var(--kl-danger) 35%,var(--kl-border)); background: color-mix(in srgb,var(--kl-danger) 7%,var(--kl-input-bg)); }
.kl-ev-editor-dialog .kl-icon { stroke-width: 1.65; }
.kl-ev-editor-dialog .kl-ev-dialog-header { gap: 12px; background: var(--kl-surface); }
.kl-ev-editor-dialog .kl-ev-dialog-close { padding: 0; border-radius: 8px; }
.kl-ev-editor-dialog .kl-ev-dialog-footer > .kl-text-button,
.kl-ev-editor-dialog .kl-ev-review-edit > .kl-text-button { gap: 8px; border-radius: 8px; font-size: 12px; line-height: 1.5; font-weight: 550; }
.kl-ev-editor-dialog .kl-ev-dialog-footer > .kl-ev-back { background: transparent; }
.kl-ev-editor-dialog .kl-ev-dialog-footer > .kl-text-button--primary {
  font-weight: 650; background: var(--kl-accent); border-color: var(--kl-ev-editor-focus-border); box-shadow: none;
}
.kl-ev-editor-dialog :is(.kl-ev-dialog-footer,.kl-ev-warning-card) .kl-text-button--primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--kl-accent), white 12%); border-color: var(--kl-ev-editor-focus-border);
}
.kl-ev-editor-dialog .kl-ev-dialog-footer > .kl-text-button--primary .kl-icon { order: 1; }
.kl-ev-editor-dialog .kl-ev-dialog-footer .kl-text-button > .kl-icon { width: 16px; height: 16px; }
.kl-ev-editor-dialog :is(button,summary,input,select,textarea):focus-visible { outline: 2px solid color-mix(in srgb, var(--kl-accent) 52%, white); outline-offset: 3px; }
.kl-ev-editor-dialog .kl-ev-form :is(input,select,textarea):focus { border-color: var(--kl-ev-editor-focus-border); }
.kl-ev-editor-warning {
  flex: none; max-height: 45dvh; overflow: auto; border-top: 1px solid #d6a24b50;
}
.kl-ev-warning-card {
  margin: 10px; padding: 12px; border: 1px solid #d6a24b50; border-radius: 8px;
  color: #edc990; background: #302313; font-size: 11px; line-height: 1.5;
}
.kl-ev-warning-card > p { margin: 0; }
.kl-ev-warning-card > .kl-ev-warning-actions { margin: 10px 0 0; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.kl-ev-warning-card .kl-text-button {
  min-height: 36px; gap: 8px; padding: 0 12px; border-radius: 8px; font-size: 12px; line-height: 1.5; font-weight: 550;
}
.kl-ev-warning-card .kl-text-button--primary { border-color: var(--kl-ev-editor-focus-border); box-shadow: none; font-weight: 650; }
.kl-ev-editor-dialog .kl-ev-warning-card .kl-text-button.kl-ev-danger { color: var(--kl-danger); background: color-mix(in srgb, var(--kl-danger) 7%, transparent); border-color: color-mix(in srgb, var(--kl-danger) 36%, transparent); }
.kl-ev-dialog .kl-ev-steps { display: flex; align-items: center; gap: 8px; margin: -20px -20px 20px; padding: 14px 20px; border-bottom: 1px solid var(--kl-border); list-style: none; }
.kl-ev-dialog .kl-ev-steps li { display: flex; align-items: center; justify-content: center; gap: 6px; flex: 1; min-width: 0; font-size: 10px; color: var(--kl-meta); }
.kl-ev-dialog .kl-ev-steps li > span { flex: none; display: grid; place-items: center; width: 20px; height: 20px; border: 1px solid var(--kl-border); border-radius: 50%; }
.kl-ev-dialog .kl-ev-steps li > span > svg { width: 11px; height: 11px; }
.kl-ev-dialog .kl-ev-steps li[aria-current=step] { color: var(--kl-text); }
.kl-ev-dialog .kl-ev-steps li[aria-current=step] > span { border-color: var(--kl-ev-editor-focus-border); background: color-mix(in srgb, var(--kl-accent) 12%, transparent); }
.kl-ev-dialog .kl-ev-steps li[data-complete] { color: var(--kl-success, #79c49a); }
.kl-ev-editor-content { display: flow-root; min-width: 0; margin: 0; padding: 0; border: 0; }
.kl-ev-editor-content > p { margin: 0; }
.kl-ev-editor-content > p:empty { display: none; }
.kl-ev-editor-content > .kl-ev-editor-intro { margin: 6px 0 0; color: var(--kl-muted); font-size: 12px; line-height: 1.6; }
.kl-ev-editor-dialog .kl-ev-form > label { gap: 6px; line-height: 1.5; }
.kl-ev-editor-dialog .kl-ev-form > label > span { font-weight: 550; }
.kl-ev-editor-dialog .kl-ev-form > label > .kl-ev-meta { font-size: 10px; line-height: 1.5; }
.kl-ev-editor-dialog .kl-ev-form :is(input, select, textarea) { width: 100%; min-height: 36px; padding: 8px 10px; border-radius: 8px; font-size: 12px; }
.kl-ev-editor-dialog .kl-ev-form textarea { min-height: 88px; }
.kl-ev-basics .kl-ev-required { color: var(--kl-muted); }
.kl-ev-editor-dialog .kl-ev-basics :is(input,select) { height: 36px; }
.kl-ev-editor-dialog .kl-ev-form :is(input,textarea)::placeholder { color: var(--kl-meta); }
.kl-ev-editor-dialog .kl-ev-basics textarea { font-family: "KikiLink Emoji", var(--kl-font, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif); line-height: 1.6; }
.kl-ev-editor-dialog .kl-ev-basics [data-count] { color: var(--kl-meta); }
.kl-ev-basics :is(.kl-ev-basics-language,.kl-ev-editor-host) { min-width: 0; display: grid; align-content: start; gap: 6px; }
.kl-ev-basics :is(.kl-ev-basics-language,.kl-ev-editor-host) label { gap: 6px; line-height: 1.5; }
.kl-ev-basics :is(.kl-ev-basics-language,.kl-ev-editor-host) label > span { font-weight: 550; }
.kl-ev-basics label[hidden] { display: none; }
.kl-ev-basics > label:has(select) { padding-bottom: 21px; }
.kl-ev-field-meta { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; min-height: 15px; }
.kl-ev-field-meta > [data-count] { flex: none; margin-left: auto; font-size: 10px; line-height: 1.5; }
.kl-ev-inline-error { min-height: 15px; color: var(--kl-danger); font-size: 10px; line-height: 1.5; overflow-wrap: anywhere; }
.kl-ev-editor-dialog .kl-ev-basics [aria-invalid=true] { border-color: var(--kl-danger); }
.kl-ev-editor-dialog .kl-text-button:disabled { opacity: .46; cursor: not-allowed; }
.kl-ev-host-note, .kl-ev-editor-tags { color: var(--kl-meta); font-size: 10px; line-height: 1.5; }
.kl-ev-editor-host { padding-bottom: 21px; }
.kl-ev-editor-host:has(details) { padding-bottom: 0; }
.kl-ev-editor-tags > summary { width: fit-content; cursor: pointer; }
.kl-ev-editor-tags[open] > label { margin-top: 6px; }

.kl-ev-clock-note, .kl-ev-detail-notice { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 16px; padding: 10px 12px; border: 1px solid #d6a24b38; border-radius: 7px; background: #d6a24b0b; color: #d7be9a; }
:is(.kl-ev-clock-note,.kl-ev-detail-notice) > .kl-icon { width: 15px; height: 15px; margin-top: 1px; flex: none; }
.kl-ev-clock-note { font-size: 11px; line-height: 1.5; }
.kl-ev-clock-note strong { font-weight: 600; }
.kl-ev-editor-dialog .kl-ev-schedule > label,
.kl-ev-schedule-room { padding-bottom: 21px; }
.kl-ev-schedule-room:has(details) { padding-bottom: 0; }
.kl-ev-schedule-room { min-width: 0; display: grid; align-content: start; gap: 6px; }
.kl-ev-schedule-room label { gap: 6px; line-height: 1.5; }
.kl-ev-schedule-room label > span { font-weight: 550; }
.kl-ev-editor-dialog .kl-ev-schedule :is(input,select) { height: 36px; }
.kl-ev-schedule-unit, .kl-ev-schedule-zone { color: var(--kl-muted); }
.kl-ev-schedule .kl-ev-field-note, .kl-ev-schedule-extras { align-self: start; color: var(--kl-text-faint,rgba(245,238,227,.58)); font-size: 10px; line-height: 1.5; }
.kl-ev-schedule-extras > summary { width: fit-content; cursor: pointer; }
.kl-ev-schedule-extras[open] > :not(summary) { margin-top: 8px; }
.kl-ev-schedule-extras > small { display: block; }
.kl-ev-schedule-preview > .kl-icon { display: inline-block; width: 18px; height: 18px; vertical-align: middle; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-ev-editor-dialog .kl-ev-schedule :is(input,select,textarea) { font-size: 16px; line-height: 1.5; }
}
.kl-ev-editor-dialog .kl-ev-form:has(.kl-ev-review) { row-gap: 0; }
.kl-ev-review-edit { margin: 16px 0 12px; }
.kl-ev-review-edit .kl-text-button { min-height: 36px; padding: 0 12px; border-radius: 8px; background: transparent; font-size: 12px; }
.kl-ev-review-note { margin: 0; color: var(--kl-meta); font-size: 10px; line-height: 1.5; }
.kl-ev-review { gap: 16px; }
.kl-ev-review-card { padding: 16px; }
.kl-ev-review-title { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.kl-ev-review-title > span:first-child { flex: none; display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid var(--kl-border); border-radius: 11px; background: #351c22; color: #dd9ba4; border-color: #dd9ba425; }
.kl-ev-review-title > span:first-child > .kl-icon { width: 20px; height: 20px; }
.kl-ev-review-title > div { flex: 1; min-width: 0; }
.kl-ev-review-title h3 { margin: 0; overflow-wrap: anywhere; font-size: 16px; font-weight: 650; line-height: 1.4; }
.kl-ev-review-title > div > small { display: block; margin-top: 4px; font-size: 11px; line-height: 1.6; }
.kl-ev-review-title > .kl-ev-badge { line-height: 1.4; }
.kl-ev-review-card > p { font-size: 12px; line-height: 1.7; }
.kl-ev-review-tags { display: flex; flex-wrap: wrap; gap: 4px; min-height: 19px; margin: 12px 0; }
.kl-ev-review-tags > .kl-ev-tag { line-height: 1.4; background: transparent; }
.kl-ev-review-details { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1.3fr); gap: 10px 16px; margin: 0; font-size: 11px; }
.kl-ev-review-details > dt { color: var(--kl-muted); }
.kl-ev-review-details > dd { min-width: 0; margin: 0; text-align: right; overflow-wrap: anywhere; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-ev-dialog-body { --kl-ev-dialog-inset: 12px; }
  .kl-ev-dialog-header, .kl-ev-dialog-footer { padding: 10px 12px; }
  .kl-ev-dialog-header h2 { font-size: 15px; }
  .kl-ev-dialog-close { width: 40px; height: 40px; }
  .kl-ev-editor-dialog .kl-ev-dialog-close, .kl-ev-warning-card .kl-text-button { min-height: 40px; }
  .kl-ev-dialog .kl-ev-dialog-footer .kl-text-button { min-height: 40px; }
  .kl-ev-editor-dialog .kl-ev-form :is(input,select) { height: 40px; min-height: 40px; padding-block: 6px; }
  .kl-ev-editor-dialog .kl-ev-basics :is(input,select,textarea) { font-size: 16px; }
}
@container kl-panel (width <= 700px) {
  .kl-ev-editor-dialog .kl-ev-form { grid-template-columns: minmax(0,1fr); }
  .kl-ev-review-title { display: grid; grid-template-columns: 36px minmax(0,1fr); gap: 6px 10px; }
  .kl-ev-review-title > span:first-child { width: 36px; height: 36px; }
  .kl-ev-review-title > span:first-child > .kl-icon { width: 19px; height: 19px; }
  .kl-ev-review-title > div { grid-column: 2; grid-row: 1; }
  .kl-ev-review-title > .kl-ev-badge { grid-column: 2; grid-row: 2; justify-self: start; }
  .kl-ev-review-title h3 { font-size: 15px; }
  .kl-ev-review-details { gap: 10px; }
  .kl-ev-review-edit .kl-text-button { min-height: 40px; }
  .kl-ev-review-card { padding: 12px; }
  .kl-ev-dialog .kl-ev-steps { padding: 12px 16px; }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-ev-dialog .kl-ev-steps { margin: -16px -16px 16px; }
  .kl-ev-review-tags { margin-bottom: 14px; }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-ev-dialog .kl-ev-steps { margin-bottom: 12px; padding: 8px 16px; }
  .kl-ev-clock-note { margin-bottom: 10px; padding: 8px 10px; }
}
@media (pointer: coarse) {
  .kl-events-page .kl-ev-heading > div > .kl-browse-icon,
  .kl-events-page .kl-ev-detail-tools .kl-ev-icon-action,
  .kl-events-page .kl-ev-detail-tools .kl-ev-menu-trigger,
  .kl-events-page .kl-ev-actions > .kl-ev-save { width: 44px; min-height: 44px; }
  .kl-events-page .kl-ev-toolbar > .kl-ev-context-action { min-width: 44px; }
  .kl-events-page :is(.kl-ev-heading,.kl-ev-toolbar,.kl-ev-card,.kl-ev-actions) .kl-text-button:not(.kl-browse-icon) { min-height: 44px; }
  .kl-events-page .kl-ev-layout > .kl-text-button,
  .kl-events-page .kl-ev-scopes .kl-text-button,
  .kl-events-page .kl-ev-row-controls .kl-text-button { min-height: 44px; }
}
`;
