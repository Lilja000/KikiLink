/** Workshop uses the same compact hierarchy as Prototype 17. */
export const workshopStyles=`
.kl-workshop-page{--kl-workshop-inset:20px;container:kl-workshop / inline-size;background:transparent;padding:var(--kl-workshop-inset);font-size:12px;scrollbar-width:thin}
.kl-workshop-page .kl-workshop-heading{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.kl-workshop-page .kl-workshop-heading[hidden]{display:none}
.kl-workshop-page .kl-workshop-heading h1{min-width:0;font-size:20px;line-height:1.3;margin:0;flex:1}
.kl-workshop-page .kl-workshop-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:36px;padding:0 12px;border-radius:8px;background:var(--kl-accent);border-color:var(--kl-accent);color:var(--kl-accent-foreground,#fff8ee);font-weight:650}
.kl-workshop-page .kl-workshop-primary>.kl-icon{flex:none;width:16px;height:16px}
.kl-workshop-page .kl-workshop-primary:not(:disabled):hover{background:var(--kl-accent-hover,var(--kl-accent))}
.kl-workshop-page .kl-workshop-nav{display:flex;gap:4px;border-bottom:1px solid var(--kl-border);margin-bottom:18px;overflow-x:auto;scrollbar-width:none}
.kl-workshop-page .kl-workshop-nav>.kl-text-button{border:0;border-bottom:2px solid transparent;border-radius:0;white-space:nowrap;padding:9px 12px;color:var(--kl-muted)}
.kl-workshop-page .kl-workshop-nav>[aria-current=page]{color:var(--kl-text);border-bottom-color:var(--kl-accent);font-weight:650}
.kl-workshop-page .kl-workshop-menu{position:relative;flex:none;margin:0;padding:0;border:0;background:transparent}
.kl-workshop-page .kl-workshop-menu>summary{width:42px;height:36px;display:grid;place-items:center;list-style:none;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-surface-2)}
.kl-workshop-page .kl-workshop-menu>summary>.kl-icon{width:16px;height:16px}
.kl-workshop-page .kl-workshop-menu>summary::-webkit-details-marker{display:none}
.kl-workshop-page .kl-workshop-menu[open]>summary{background:var(--kl-surface-2)}
.kl-workshop-menu-body{position:absolute;right:0;top:calc(100% + 6px);z-index:5;width:min(280px,80cqw);max-height:min(380px,58dvh);overflow:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:4px;padding:8px;background:var(--kl-surface);border:1px solid var(--kl-border-strong);border-radius:10px;box-shadow:0 8px 24px #0005}
.kl-workshop-menu-body>*{flex:none}
.kl-workshop-page .kl-workshop-menu-body>.kl-text-button{text-align:left;border:0;padding:9px 10px}
.kl-workshop-page .kl-workshop-menu-body>.kl-text-button:hover{background:var(--kl-surface-2)}
.kl-workshop-open-id{display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--kl-border);padding-top:8px}
.kl-workshop-search{display:flex;align-items:center;gap:8px;margin-bottom:12px;min-width:0}
.kl-workshop-search-field{display:flex;align-items:center;gap:8px;flex:1;min-width:0;height:36px;padding:0 10px;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-input-bg,var(--kl-bg))}
.kl-workshop-search-field>input{flex:1;min-width:0;width:0;padding:0;border:0;background:transparent;height:100%;font-size:12px}
.kl-workshop-search-field>input:focus-visible{outline:0}
.kl-workshop-search-field>input::-webkit-search-cancel-button{-webkit-appearance:none}
.kl-workshop-search-field:focus-within{border-color:var(--kl-accent);outline:2px solid color-mix(in srgb,var(--kl-accent) 16%,transparent)}
.kl-workshop-page :is(.kl-workshop-search-submit,.kl-workshop-search-clear){display:grid;place-items:center;flex:none;width:24px;height:24px;min-height:24px;border:0;padding:0;background:transparent}
.kl-workshop-page .kl-workshop-search-submit{width:15px;min-width:15px}
.kl-workshop-page .kl-workshop-search-clear[hidden]{display:none}
.kl-workshop-search-field button>.kl-icon{width:15px;height:15px;color:var(--kl-muted)}
.kl-workshop-search-field button:hover>.kl-icon{color:var(--kl-text)}
.kl-workshop-page .kl-workshop-search>select{min-width:0;max-width:38%;width:166px;height:36px;padding-inline:8px;border-radius:8px;font-size:11px}
.kl-workshop-filter-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;min-height:36px;flex-wrap:wrap}
.kl-workshop-results{margin:0 0 12px;color:var(--kl-muted);font-size:11px;line-height:1.5}
.kl-workshop-scopes,.kl-workshop-sort-controls,.kl-workshop-active-filters{display:flex;align-items:center;flex-wrap:wrap;gap:6px;min-width:0}
.kl-workshop-scopes{gap:4px}
.kl-workshop-sort-controls{margin-inline-start:auto}
.kl-workshop-sort-controls>label{display:flex;align-items:center;gap:6px;color:var(--kl-muted);font-size:11px}
.kl-workshop-page .kl-workshop-scopes>[aria-pressed]{display:inline-flex;align-items:center;justify-content:center;height:32px;min-height:32px;padding:0 9px;border-color:transparent;border-radius:8px;color:var(--kl-muted);font-size:11px}
.kl-workshop-page .kl-workshop-scopes>[aria-pressed=true]{background:color-mix(in srgb,var(--kl-accent) 12%,transparent);border-color:color-mix(in srgb,var(--kl-accent) 58%,var(--kl-muted));color:var(--kl-text)}
.kl-workshop-page .kl-workshop-filter-row select{padding:3px 5px;border-color:transparent;background:transparent;font-size:11px;min-height:36px}
.kl-workshop-collection-field{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 8px;color:var(--kl-muted);font-size:11px}
.kl-workshop-collection-field select{width:auto}
.kl-workshop-active-filters:not(:empty){margin:0 0 12px}
.kl-workshop-page .kl-workshop-active-filters>.kl-text-button{min-height:30px;padding:5px 2px;border:0;color:var(--kl-muted);font-size:11px}
.kl-workshop-page .kl-workshop-active-filters>.kl-text-button:hover{color:var(--kl-text)}
.kl-workshop-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:stretch}
.kl-workshop-page .kl-workshop-grid>.kl-workshop-card{display:flex;flex-direction:column;align-items:stretch;gap:0;margin:0;padding:0;background:var(--kl-surface);min-width:0;overflow:hidden;border:1px solid var(--kl-border);border-radius:10px}
.kl-workshop-page .kl-workshop-grid>.kl-workshop-card:hover{border-color:var(--kl-border-strong)}
.kl-workshop-card-body{display:flex;flex-direction:column;flex:1;min-width:0;padding:12px}
.kl-workshop-card-heading{display:flex;align-items:flex-start;gap:8px;min-width:0}
.kl-workshop-page .kl-workshop-card-heading>.kl-workshop-card-options{display:grid;place-items:center;flex:none;width:32px;height:32px;min-height:32px;padding:0;border-color:transparent;border-radius:8px;color:var(--kl-muted)}
.kl-workshop-card-options>.kl-icon{width:16px;height:16px}
.kl-workshop-page .kl-workshop-card-heading>.kl-workshop-card-options:is(:hover,[aria-expanded=true]){background:var(--kl-surface-hover);color:var(--kl-text)}
.kl-workshop-page .kl-workshop-title{display:block;width:100%;min-width:0;padding:0;border:0;background:transparent;color:var(--kl-text);font:inherit;font-size:13px;font-weight:650;line-height:1.5;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kl-workshop-page button.kl-workshop-title:hover{text-decoration:underline;text-decoration-color:var(--kl-gold,var(--kl-accent));text-underline-offset:3px}
.kl-workshop-author{display:block;margin-top:3px;line-height:1.5;color:var(--kl-muted);font-size:10px}
.kl-workshop-page .kl-workshop-summary{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;min-height:35px;margin:10px 0;overflow:hidden;overflow-wrap:anywhere;color:var(--kl-muted);font-size:12px;line-height:1.75}
.kl-workshop-meta{display:flex;line-height:1.5;align-items:center;flex-wrap:wrap;gap:5px 10px;color:var(--kl-muted);font-size:10px}
.kl-workshop-meta:empty,.kl-workshop-tags:empty{display:none}
.kl-workshop-meta>span{display:inline-flex;align-items:center;gap:4px}
.kl-workshop-meta>span>svg{width:12px;height:12px;color:var(--kl-gold)}
.kl-workshop-tags{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin:10px 0;min-width:0}
.kl-workshop-tag,.kl-workshop-badge{max-width:100%;padding:3px 6px;border:1px solid var(--kl-border);border-radius:5px;font-size:10px;color:var(--kl-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kl-workshop-badge--featured{color:var(--kl-gold,#d6a24b);border-color:#d6a24b38;background:#d6a24b0d}
.kl-workshop-card-footer{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:auto;padding-top:10px;border-top:1px solid var(--kl-border)}
.kl-workshop-page .kl-workshop-card-footer>.kl-text-button{height:32px;min-height:32px;padding:0 12px;border-radius:8px;font-size:11px;font-weight:550}
.kl-workshop-page .kl-workshop-card-footer>:is(.kl-workshop-action-primary,.kl-workshop-action-installed){font-weight:650}
.kl-workshop-page .kl-workshop-card-footer>.kl-workshop-bookmark{padding:0;border-color:transparent;color:var(--kl-muted)}
.kl-workshop-page .kl-workshop-card-footer>.kl-workshop-bookmark:is(:hover,[aria-pressed=true]){background:var(--kl-surface-hover);color:var(--kl-text)}
.kl-workshop-page .kl-workshop-bookmark{display:grid;place-items:center;flex:none;width:32px;height:32px;padding:6px;margin-left:auto}
.kl-workshop-bookmark svg{width:16px;height:16px}.kl-workshop-bookmark[aria-pressed=true]{color:var(--kl-gold,#d6a24b);border-color:#d6a24b38}
.kl-workshop-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.kl-workshop-type-preview{position:relative;display:flex;align-items:center;justify-content:center;flex:none;gap:8px;isolation:isolate;overflow:hidden;height:64px;border-bottom:1px solid var(--kl-border);background:radial-gradient(ellipse at 75% 20%,#d6a24b0e,transparent 62%),linear-gradient(115deg,#24171b,#151416 65%)}
.kl-workshop-type-preview>svg{position:relative;z-index:1;width:24px;height:24px;color:var(--kl-gold,#d6a24b)}
.kl-workshop-type-preview>span{position:relative;z-index:1;font-size:10px;color:var(--kl-text)}
.kl-workshop-type-preview:before,.kl-workshop-type-preview:after{content:"";position:absolute;pointer-events:none}
.kl-workshop-type-preview:before{inset:12px 30%;border:1px solid #d6a24b2b;border-radius:6px;transform:rotate(-5deg);background:#d6a24b06}
.kl-workshop-type-preview:after{width:48px;height:48px;border:1px solid #d6a24b1c;border-radius:50%;right:14%;top:-12px}
.kl-workshop-type-ui-theme:before,.kl-workshop-type-profile-theme:before{inset:12px 25%;border-left:16px solid #792b384d;transform:none;border-radius:5px;box-shadow:inset 0 9px #d6a24b08}
.kl-workshop-type-community-template:before{inset:10px 30%;border-radius:4px;transform:rotate(-3deg);background:repeating-linear-gradient(0deg,transparent 0 9px,#d6a24b12 9px 10px)}
.kl-workshop-type-room-preset:before{top:12px;left:23%;width:18%;height:38px;border-radius:22px 22px 0 0;transform:none;background:#0b0c10}
.kl-workshop-type-room-preset:after{right:20%;top:34px;width:30%;height:18px;border-radius:6px 6px 2px 2px;background:#472830}
.kl-workshop-empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 16px;border:1px dashed var(--kl-border);border-radius:10px;background:#11111308;text-align:center}
.kl-workshop-empty>svg{width:28px;height:28px;margin-bottom:4px;color:var(--kl-muted)}
.kl-workshop-empty h2{font-size:15px;margin:0}
.kl-workshop-empty p{margin:0;color:var(--kl-muted);font-size:11px;line-height:1.7}
.kl-workshop-page .kl-workshop-grid>.kl-workshop-unavailable{padding:12px}
.kl-workshop-path{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;color:var(--kl-muted);font-size:11px}
.kl-workshop-page .kl-workshop-path>button{display:inline-flex;align-items:center;gap:8px;height:36px;min-height:32px;margin:0;padding:0;border:1px solid transparent;background:transparent;color:inherit;font-size:11px;font-weight:550;white-space:nowrap}
.kl-workshop-page .kl-workshop-path>button:hover{color:var(--kl-text);text-decoration:underline}
.kl-workshop-path svg{width:14px;height:14px}
.kl-workshop-detail-header{margin-bottom:16px;padding:16px;border:1px solid var(--kl-border);border-radius:10px;background:var(--kl-surface)}
.kl-workshop-detail-heading{display:flex;align-items:flex-start;gap:12px;min-width:0}
.kl-workshop-heading-copy{flex:1;min-width:0}
.kl-workshop-heading-copy h1{font-size:23px;font-weight:700;line-height:1.3;letter-spacing:-.3px;margin:0;overflow-wrap:anywhere}
.kl-workshop-detail-meta{display:flex;align-items:center;flex-wrap:wrap;gap:5px 10px;margin-top:8px;color:var(--kl-muted);font-size:10px;line-height:1.5;overflow-wrap:anywhere}
.kl-workshop-detail-meta>span{display:inline-flex;align-items:center;gap:4px}
.kl-workshop-detail-meta>.kl-workshop-badge{padding:2px 6px;border-radius:4px;line-height:14px}
.kl-workshop-detail-heading>.kl-workshop-type-preview{width:44px;height:44px;border:1px solid #caae9225;border-radius:9px;background:#312b26;color:#caae92}
.kl-workshop-detail-heading>.kl-workshop-type-preview>svg{width:24px;height:24px;color:inherit}
.kl-workshop-detail-heading>.kl-workshop-type-preview>span,.kl-workshop-detail-heading>.kl-workshop-type-preview::before,.kl-workshop-detail-heading>.kl-workshop-type-preview::after{display:none}
.kl-workshop-page .kl-workshop-detail-summary{margin:12px 0 0;font-size:12px;line-height:1.7;color:var(--kl-muted)}.kl-workshop-detail-actions{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:14px}
.kl-workshop-catalog-actions,.kl-workshop-version-actions{display:flex;align-items:center;flex-wrap:wrap;gap:6px}
.kl-workshop-catalog-actions:empty,.kl-workshop-version-actions:empty,.kl-workshop-detail-actions:not(:has(button)),.kl-workshop-page .kl-workshop-installed:empty{display:none}
.kl-workshop-page .kl-workshop-action-primary,.kl-workshop-page .kl-workshop-action-installed{display:inline-flex;justify-content:center;align-items:center;gap:7px;min-height:36px;font-weight:650}
.kl-workshop-page .kl-workshop-action-primary{background:var(--kl-accent);border-color:var(--kl-accent);color:var(--kl-accent-foreground,#fff8ee)}
.kl-workshop-page .kl-workshop-action-primary:not(:disabled):hover{background:var(--kl-accent-hover,var(--kl-accent))}
.kl-workshop-action-primary>.kl-icon,.kl-workshop-action-installed>.kl-icon{width:16px;height:16px;flex:none}
.kl-workshop-page .kl-workshop-detail-actions button:not(.kl-workshop-bookmark),.kl-workshop-page .kl-workshop-version-actions>button{min-height:36px;padding:0 12px;border-radius:8px;font-size:11px}
.kl-workshop-page .kl-workshop-detail-actions .kl-workshop-bookmark{min-height:32px}
.kl-workshop-detail-tabs{position:sticky;top:0;z-index:3;display:flex;gap:20px;overflow-x:auto;padding-top:8px;border-bottom:1px solid var(--kl-border);margin-bottom:20px;background:var(--kl-bg);scroll-padding-inline:8px;scrollbar-width:thin}
.kl-workshop-page .kl-workshop-detail-tabs>button{flex:none;height:38px;min-height:38px;padding:0 2px 10px;border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent;font-size:12px;font-weight:500;white-space:nowrap;color:var(--kl-muted)}
.kl-workshop-page .kl-workshop-detail-tabs>[aria-selected=true]{border-bottom-color:var(--kl-accent);color:var(--kl-text);font-weight:650}
.kl-workshop-page .kl-workshop-section{padding:14px;margin:0;border:1px solid var(--kl-border);border-radius:10px;background:var(--kl-surface);min-width:0}
.kl-workshop-section h2,.kl-workshop-versions>h2{font-size:13px;margin:0 0 12px}
.kl-workshop-section p{font-size:11px;line-height:1.75;overflow-wrap:anywhere}
.kl-workshop-section h3{font-size:12px}
.kl-workshop-layout{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:12px;min-width:0}
.kl-workshop-main-column,.kl-workshop-side-column{display:flex;flex-direction:column;gap:12px;min-width:0}
.kl-workshop-layout .kl-workshop-tags:empty{display:none}
.kl-workshop-layout .kl-workshop-tags{margin-bottom:0}
.kl-workshop-rich-preview{min-width:0;margin:10px 0 0;padding:12px;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-input-bg,var(--kl-bg));overflow-wrap:anywhere}
.kl-workshop-rich-preview>.kl-profile-section-note{margin:0 0 12px;font-size:10px}
.kl-workshop-rich-preview .kl-workshop-payload{margin:0;border:0;padding:0}
.kl-workshop-rich-preview .kl-workshop-payload>article{padding:10px 0;border-bottom:1px solid var(--kl-border)}
.kl-workshop-rich-preview .kl-workshop-payload>article:last-child{border-bottom:0}
.kl-workshop-rich-preview .kl-workshop-payload>article>strong{font-size:11px;font-weight:550}
.kl-workshop-rich-preview .kl-workshop-payload>article>p{margin:4px 0 0}
.kl-workshop-permissions{padding:0;margin:10px 0;list-style:none}
.kl-workshop-permissions li{display:flex;align-items:flex-start;gap:8px;padding:8px 0;font-size:11px;line-height:1.6}
.kl-workshop-permissions svg{flex:none;width:14px;height:14px;margin-top:2px;color:var(--kl-muted)}
.kl-workshop-permissions strong{display:block;font-size:11px;font-weight:550}
.kl-workshop-permissions small,.kl-workshop-dependency small{display:block;margin-top:3px;font-size:10px;line-height:1.6;color:var(--kl-muted)}
.kl-workshop-dependency{padding:8px 0;border-bottom:1px solid var(--kl-border);overflow-wrap:anywhere}
.kl-workshop-dependency:first-of-type{padding-top:0}
.kl-workshop-dependency:last-child{border-bottom:0;padding-bottom:0}
.kl-workshop-dependency strong{font-size:10px;font-weight:500}
.kl-workshop-page .kl-workshop-creation-menu{position:relative;flex:none;padding:0;margin:0;border:0}
.kl-workshop-creation-menu>summary{display:grid;place-items:center;width:32px;height:32px;list-style:none;border-radius:8px;color:var(--kl-muted)}
.kl-workshop-creation-menu>summary::-webkit-details-marker{display:none}
.kl-workshop-creation-menu>summary svg{width:16px;height:16px}
.kl-workshop-creation-menu:is([open],:hover)>summary{background:var(--kl-surface-2);color:var(--kl-text)}
.kl-workshop-creation-menu-body{position:absolute;right:0;top:calc(100% + 6px);z-index:4;display:grid;gap:0;width:min(230px,80cqw);max-height:min(360px,65dvh);overflow-y:auto;overscroll-behavior:contain;padding:4px;background:var(--kl-surface-2);border:1px solid var(--kl-border-strong);border-radius:10px;box-shadow:0 8px 24px #0005}
.kl-workshop-creation-menu-body>p{font-size:10px;margin:0;padding:5px 8px}
.kl-workshop-page .kl-workshop-creation-menu button{display:block;width:100%;min-height:34px;padding:8px 10px;border:0;border-radius:8px;font-size:11px;text-align:left}
.kl-workshop-page .kl-workshop-creation-menu button:not(:disabled):hover{background:var(--kl-surface-hover)}
.kl-workshop-version-row{display:flex;align-items:flex-start;flex-wrap:wrap;gap:10px;min-width:0;padding:14px 0;border-bottom:1px solid var(--kl-border)}
.kl-workshop-version-row:last-child{border-bottom:0}
.kl-workshop-version-copy{flex:1 1 160px;min-width:0}
.kl-workshop-version-copy>h3{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:0 0 4px}
.kl-workshop-version-copy p{margin:3px 0;overflow-wrap:anywhere}
.kl-workshop-page .kl-workshop-version-row>.kl-workshop-release{flex:0 1 auto;margin:0;padding:0;border-radius:8px;background:transparent}
.kl-workshop-page .kl-workshop-version-row>.kl-workshop-release[open]{flex:1 0 100%;padding:0 12px 12px}
.kl-workshop-release>summary{min-height:34px;padding:8px 12px;color:var(--kl-text);font-size:11px;line-height:18px}
.kl-workshop-release[open]>summary{padding-inline:0}
.kl-workshop-permissions li>div{flex:1;min-width:0;overflow-wrap:anywhere}
.kl-workshop-reviews{min-width:0;padding:14px;border:1px solid var(--kl-border);border-radius:10px;background:var(--kl-surface)}
.kl-workshop-review-heading,.kl-workshop-review-actions,.kl-workshop-review-byline{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-width:0}
.kl-workshop-review-heading{justify-content:space-between;margin-bottom:12px}
.kl-workshop-page .kl-workshop-review-heading h2{margin:0;font-size:13px}
.kl-workshop-page .kl-workshop-review-actions>button{min-height:36px;padding:0 12px;border-radius:8px;font-size:11px}
.kl-workshop-page .kl-workshop-review-actions>.kl-workshop-review-refresh{display:grid;place-items:center;width:36px;padding:0;color:var(--kl-muted)}
.kl-workshop-review-refresh .kl-icon{width:16px;height:16px}
.kl-workshop-page .kl-workshop-review-row{display:flex;align-items:flex-start;gap:10px;min-width:0;padding:14px 0;margin:0;border:0;border-bottom:1px solid var(--kl-border);border-radius:0;background:transparent}
.kl-workshop-page .kl-workshop-review-row:last-child{border-bottom:0}
.kl-workshop-review-avatar{display:grid;place-items:center;flex:none;width:32px;height:32px;border:1px solid #caae9225;border-radius:8px;background:#312b26;color:#caae92}
.kl-workshop-review-avatar .kl-icon{width:17px;height:17px}
.kl-workshop-review-copy{flex:1;min-width:0;overflow-wrap:anywhere}
.kl-workshop-review-byline>strong{font-size:12px;font-weight:550}
.kl-workshop-review-score{color:var(--kl-gold);font-size:11px;white-space:nowrap}
.kl-workshop-review-copy>p{margin:6px 0 0;color:var(--kl-muted);font-size:11px;line-height:1.7}
.kl-workshop-review-copy>small{display:block;margin-top:3px;color:var(--kl-muted);font-size:10px}
.kl-workshop-page .kl-workshop-review-copy>button{min-height:30px;margin-top:4px;padding:0;border:0;font-size:11px;color:var(--kl-muted)}
.kl-workshop-page .kl-workshop-review-copy>button:hover{color:var(--kl-text);text-decoration:underline}
.kl-workshop-review-rating{display:flex;flex-wrap:wrap;gap:4px;margin:12px 0;padding:0;border:0;min-width:0}
.kl-workshop-review-rating>legend{margin-bottom:6px;font-size:12px}
.kl-workshop-review-rating>label{display:grid;place-items:center;width:36px;height:36px;border:1px solid transparent;border-radius:7px;color:var(--kl-muted);cursor:pointer}
.kl-workshop-review-rating>label:has(input:checked){border-color:var(--kl-border);background:var(--kl-surface-2)}
.kl-workshop-review-rating>label:has(input:focus-visible){outline:2px solid var(--kl-accent);outline-offset:2px}
.kl-workshop-review-rating .kl-icon{width:25px;height:25px}
.kl-workshop-review-rating>label:is(:has(input:checked),:has(~label input:checked)){color:var(--kl-gold)}
.kl-workshop-review-rating>label:is(:has(input:checked),:has(~label input:checked)) .kl-icon{fill:currentColor}
.kl-workshop-review-comment{display:grid;gap:8px;font-size:12px}
.kl-workshop-page .kl-workshop-review-comment textarea{width:100%;min-height:104px;max-height:240px;line-height:1.6}
.kl-workshop-install-dialog{position:fixed;inset:0;margin:auto;width:min(540px,calc(100vw - 24px));max-width:100%;max-height:min(calc(100dvh - 24px),var(--kl-visible-dialog-height,100dvh));padding:0;border:1px solid var(--kl-border-strong);border-radius:12px;background:var(--kl-surface);color:var(--kl-text);overflow:hidden;box-shadow:var(--kl-shadow)}
.kl-workshop-install-dialog[open]{display:flex;flex-direction:column}
.kl-workshop-install-dialog::backdrop{background:#030303c4;backdrop-filter:blur(4px)}
.kl-workshop-install-header,.kl-workshop-install-footer{display:flex;align-items:center;flex:none;gap:8px;padding:12px 16px}
.kl-workshop-install-header{justify-content:space-between;gap:12px;border-bottom:1px solid var(--kl-border)}
.kl-workshop-install-header>div{flex:1;min-width:0}
.kl-workshop-install-eyebrow{display:block;color:var(--kl-meta);font-size:10px;line-height:1.7;letter-spacing:.55px}
.kl-workshop-page .kl-workshop-install-header h2{margin:0;font-size:16px;line-height:1.4;overflow-wrap:anywhere}
.kl-workshop-page .kl-workshop-install-header button{display:grid;place-items:center;flex:none;width:32px;height:32px;min-width:0;min-height:0;padding:0;border-color:transparent;border-radius:8px;color:var(--kl-muted)}
.kl-workshop-page .kl-workshop-install-header button:hover{background:var(--kl-surface-hover)}
.kl-workshop-install-header .kl-icon{width:16px;height:16px}
.kl-workshop-install-body{padding:16px;min-height:0;overflow:hidden auto;overscroll-behavior:contain}
.kl-workshop-page .kl-workshop-install-subtitle{margin:0 0 16px;color:var(--kl-muted);font-size:12px;line-height:1.6;overflow-wrap:anywhere}
.kl-workshop-install-list{margin:12px 0}
.kl-workshop-page .kl-workshop-install-row{position:relative;display:grid;gap:8px;min-width:0;margin:0;padding:12px 0;border:0;border-bottom:1px solid var(--kl-border);border-radius:0;background:transparent}
.kl-workshop-page .kl-workshop-install-row:last-child{border-bottom:0}
.kl-workshop-page .kl-workshop-install-row h3{margin:0;font-size:12px;line-height:1.5;overflow-wrap:anywhere}
.kl-workshop-install-row>div>small{display:block;margin-top:4px;color:var(--kl-muted);font-size:11px;line-height:1.6;overflow-wrap:anywhere}
.kl-workshop-install-row .kl-workshop-permissions{margin:0;padding:8px 10px;border:1px solid var(--kl-border);border-radius:7px;background:var(--kl-input-bg)}
.kl-workshop-install-row .kl-workshop-permissions li{padding-block:8px}
.kl-workshop-install-row .kl-workshop-permissions svg{width:14px;height:14px;margin-top:2px;color:var(--kl-muted)}
.kl-workshop-install-row .kl-workshop-permissions strong{line-height:1.6;font-weight:550}
.kl-workshop-install-row .kl-workshop-permissions small{margin-top:3px}
.kl-workshop-install-row .kl-workshop-permissions .kl-workshop-badge{display:inline-block;margin-inline-start:5px;vertical-align:middle;font-size:10px;line-height:1.4;padding:2px 6px}
.kl-workshop-install-row .kl-workshop-permissions .kl-workshop-badge:not(.kl-workshop-badge--featured){padding:0 5px;line-height:1.2}
.kl-workshop-page .kl-workshop-install-preview{position:absolute;right:0;top:10px;max-width:100%;margin:0;padding:0;border:0;color:var(--kl-muted);font-size:11px}
.kl-workshop-install-row>div:first-child{padding-right:38px}
.kl-workshop-page .kl-workshop-install-preview[open]{position:static;padding-top:0}
.kl-workshop-install-preview>summary{display:grid;place-items:center;list-style:none;width:32px;height:32px;border:1px solid var(--kl-border);border-radius:8px;cursor:pointer}
.kl-workshop-install-preview>summary::-webkit-details-marker{display:none}
.kl-workshop-install-preview>summary>.kl-icon{width:16px;height:16px}
.kl-workshop-install-preview[open]>summary{margin-bottom:8px}
.kl-workshop-install-preview .kl-workshop-payload{margin:0}
.kl-workshop-page .kl-workshop-install-consent{align-items:center;gap:10px;margin:0;padding:14px 0;border-bottom:1px solid var(--kl-border);cursor:pointer}
.kl-workshop-install-consent input{width:14px;height:14px;margin:0;padding:0;accent-color:var(--kl-accent)}
.kl-workshop-install-consent span{flex:1;min-width:0}
.kl-workshop-install-consent strong,.kl-workshop-install-consent small{display:block;overflow-wrap:anywhere}
.kl-workshop-install-consent strong{font-size:11px;font-weight:550}
.kl-workshop-install-consent small{margin-top:3px;color:var(--kl-muted);font-size:10px;line-height:1.6}
.kl-workshop-install-footer{justify-content:flex-end;flex-wrap:wrap;border-top:1px solid var(--kl-border);background:var(--kl-input-bg)}
.kl-workshop-install-footer>button:first-child:not(:last-child){margin-inline-end:auto}
.kl-workshop-page .kl-workshop-install-footer>button{min-height:36px;max-width:100%;padding:0 12px;border-radius:8px;font-size:12px;line-height:1.5;font-weight:550;overflow-wrap:anywhere}
.kl-workshop-page .kl-workshop-install-footer>.kl-workshop-action-primary{font-weight:650;color:#fff;border-color:color-mix(in srgb,var(--kl-accent) 58%,var(--kl-muted))}
.kl-workshop-page [role=status]:empty{display:none}
.kl-workshop-draft-shortcuts{display:flex;gap:8px;margin-bottom:14px}
.kl-workshop-page .kl-workshop-secondary-actions{margin-top:10px}
.kl-workshop-page .kl-workshop-secondary-actions .kl-text-button{margin:4px 8px 4px 0}
.kl-workshop-heading:not([hidden])~.kl-workshop-body .kl-workshop-installed-title{display:none}
.kl-workshop-catalog-page,.kl-workshop-library-page,.kl-workshop-installed-library{line-height:1.5}
.kl-workshop-catalog-page .kl-workshop-search>select{background:var(--kl-input-bg)}
.kl-workshop-catalog-page .kl-workshop-tags>:is(.kl-workshop-tag,.kl-workshop-badge){line-height:1.4}
.kl-workshop-page .kl-workshop-installed-library{margin:0}
.kl-workshop-page .kl-workshop-installed-list{display:grid;gap:12px}
.kl-workshop-page .kl-workshop-installed-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0;padding:12px;border-radius:10px;background:var(--kl-surface)}
.kl-workshop-installed-copy{flex:1 1 140px;min-width:0}
.kl-workshop-installed-row h3{margin:0}
.kl-workshop-installed-row p{margin:3px 0 0;font-size:10px;line-height:1.5}
.kl-workshop-page .kl-workshop-installed-row>.kl-workshop-type-preview{width:40px;height:40px;min-height:40px;border:1px solid var(--kl-border);border-radius:8px}
.kl-workshop-installed-row>.kl-workshop-type-preview>span,.kl-workshop-installed-row>.kl-workshop-type-preview::before,.kl-workshop-installed-row>.kl-workshop-type-preview::after{display:none}
.kl-workshop-installed-row>.kl-workshop-type-preview>svg{width:20px;height:20px}
.kl-workshop-library-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0}
.kl-workshop-page .kl-workshop-library-toolbar>.kl-workshop-import-details{margin:0;padding:8px 10px;max-width:100%}
.kl-workshop-page .kl-workshop-update-button,.kl-workshop-page .kl-workshop-installed-actions>.kl-text-button{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 12px;border-radius:8px;font-size:11px}
.kl-workshop-update-button>.kl-icon{width:14px;height:14px}
.kl-workshop-library-toolbar>.kl-profile-section-note{flex:1 1 160px;min-width:0;margin:0}
.kl-workshop-installed-library>.kl-workshop-active-filters:empty{display:none}
.kl-workshop-page .kl-workshop-update-button{height:36px;white-space:nowrap;flex:none;font-weight:550;line-height:1.5}
.kl-workshop-installed-actions{display:flex;align-items:center;flex-wrap:wrap;gap:6px}
.kl-workshop-installed-row[data-enabled]>.kl-workshop-type-preview{background:#302b28;color:#d5c5ac}
.kl-workshop-installed-row[data-enabled=true]>.kl-workshop-type-preview{background:#312b26;color:#caae92;border-color:#caae9225}
.kl-workshop-installed-row[data-enabled]>.kl-workshop-type-preview>svg{width:21px;height:21px;color:inherit}
.kl-workshop-installed-copy>.kl-workshop-badge--update{display:inline-flex;align-items:center;gap:4px;margin-top:6px;padding:2px 6px;line-height:1.4;border-radius:6px;color:var(--kl-gold);border-color:#d6a24b38;background:#d6a24b0d}
.kl-workshop-page .kl-workshop-installed-actions>.kl-text-button{font-size:11px;line-height:1.5;font-weight:550}
.kl-workshop-page .kl-workshop-installed-actions>[aria-pressed=true]{background:color-mix(in srgb,var(--kl-accent) 12%,transparent);border-color:color-mix(in srgb,var(--kl-accent) 58%,var(--kl-muted));color:var(--kl-text)}
.kl-workshop-page .kl-workshop-installed-actions>.kl-workshop-installed-options{display:grid;place-items:center;flex:none;width:32px;height:32px;min-height:32px;padding:0;border-color:transparent;background:transparent;color:var(--kl-muted)}
.kl-workshop-installed-options>.kl-icon{width:16px;height:16px}
.kl-workshop-page .kl-workshop-installed-actions>.kl-workshop-action-primary{color:#fff;border-color:color-mix(in srgb,var(--kl-accent) 58%,var(--kl-muted));font-weight:650}
.kl-workshop-uninstall-dialog .kl-workshop-install-body>p{margin:0;font-size:12px;line-height:1.5}
.kl-workshop-uninstall-dialog .kl-workshop-install-body>.kl-profile-section-note{margin:12px 0;color:var(--kl-meta);font-size:10px;line-height:1.5}
.kl-workshop-page .kl-workshop-danger{color:var(--kl-danger);border-color:color-mix(in srgb,var(--kl-danger) 36%,transparent);background:color-mix(in srgb,var(--kl-danger) 7%,transparent)}
.kl-workshop-import-dialog .kl-workshop-import{display:grid;gap:10px;margin:0}
.kl-workshop-import-dialog .kl-workshop-import p{margin:0;font-size:11px;line-height:1.7}
.kl-workshop-import-dialog .kl-workshop-import input[type=file]{max-width:100%;font-size:12px}
@container kl-panel (width <= 1100px){.kl-workshop-page{--kl-workshop-inset:16px}}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)){
  .kl-workshop-page{--kl-workshop-inset:12px;padding-bottom:20px}
  .kl-workshop-page .kl-workshop-menu>summary{width:40px;height:40px}
  .kl-workshop-page .kl-workshop-heading h1{font-size:18px}
  .kl-workshop-catalog-page .kl-workshop-heading h1{font-size:20px}
  .kl-workshop-catalog-page .kl-workshop-primary{font-size:11px}
  .kl-workshop-catalog-page .kl-workshop-sort-controls select{min-height:40px}
  .kl-workshop-search-field,.kl-workshop-page .kl-workshop-search>select{height:40px}
  .kl-workshop-filter-row{min-height:40px;gap:4px}
  .kl-workshop-page .kl-workshop-scopes>[aria-pressed]{height:36px;min-height:36px;padding-inline:6px}
  .kl-workshop-scopes{gap:3px;padding:2px 1px}
  .kl-workshop-sort-controls{gap:4px}
  .kl-workshop-sort-controls>label{gap:4px}
  .kl-workshop-page .kl-workshop-card-heading>.kl-workshop-card-options{width:44px;height:44px;min-height:44px}
  .kl-workshop-page .kl-workshop-card-footer>.kl-text-button,.kl-workshop-page .kl-workshop-installed-actions>.kl-text-button{height:44px;min-height:44px}
  .kl-workshop-page .kl-workshop-card-footer>.kl-workshop-bookmark{width:44px}
  .kl-workshop-page .kl-workshop-installed-actions>.kl-workshop-installed-options{width:40px;height:40px;min-height:40px}
  .kl-workshop-page .kl-workshop-update-button{height:40px;min-height:40px}
}
@container kl-panel (width <= 700px){
  .kl-workshop-grid{grid-template-columns:minmax(0,1fr)}
  .kl-workshop-page .kl-workshop-search>select{width:128px}
  .kl-workshop-results{height:0;overflow:hidden}
  .kl-workshop-installed-actions{width:100%}
}
@container kl-workshop (max-width:600px){.kl-workshop-layout{grid-template-columns:minmax(0,1fr)}.kl-workshop-page .kl-workshop-nav>.kl-text-button{padding-inline:9px}}
@container kl-workshop (max-width:600px){.kl-workshop-detail-header,.kl-workshop-page .kl-workshop-section{padding:12px}.kl-workshop-heading-copy h1{font-size:21px}.kl-workshop-detail-heading{gap:9px}.kl-workshop-detail-heading>.kl-workshop-type-preview{width:36px;height:36px;border-radius:8px}}
@container kl-workshop (max-width:600px){
  .kl-workshop-detail-heading>.kl-workshop-type-preview>svg{width:20px;height:20px}
  .kl-workshop-page .kl-workshop-detail-actions button:not(.kl-workshop-bookmark){min-height:44px}
  .kl-workshop-page .kl-workshop-detail-actions .kl-workshop-bookmark{width:40px;min-height:40px}
  .kl-workshop-creation-menu>summary{width:40px;height:40px}
  .kl-workshop-rich-preview{padding:10px}
  .kl-workshop-reviews{padding:12px}
  .kl-workshop-review-rating>label{width:40px;height:40px}
}
@container kl-workshop (max-width:450px){.kl-workshop-page .kl-workshop-heading h1{flex-basis:calc(100% - 48px);order:-2}.kl-workshop-page .kl-workshop-menu{order:-1}.kl-workshop-page .kl-workshop-primary{flex-basis:100%;min-height:40px}}
@container kl-panel (width <= 900px) and (height <= 500px){
  .kl-workshop-installed-library>.kl-workshop-results{height:0;overflow:hidden}
  .kl-workshop-library-page .kl-workshop-installed-library>.kl-workshop-results{margin-bottom:8px}
  .kl-workshop-library-page .kl-workshop-installed-library>.kl-workshop-search{margin-bottom:8px}
  .kl-workshop-library-page>.kl-workshop-heading>.kl-workshop-primary{height:40px;min-height:40px}
  .kl-workshop-library-page>.kl-workshop-heading h1{flex:1 1 calc(100% - 56px);order:-2}
  .kl-workshop-library-page>.kl-workshop-heading>.kl-workshop-menu{order:-1;margin-left:auto}
  .kl-workshop-library-page>.kl-workshop-heading>.kl-workshop-menu>summary{width:42px}
  .kl-workshop-page .kl-workshop-heading{margin-bottom:8px}
  .kl-workshop-page .kl-workshop-heading h1,.kl-workshop-heading-copy h1{font-size:20px}
  .kl-workshop-path{margin-bottom:6px}
  .kl-workshop-page .kl-workshop-path>button{height:28px;min-height:28px}
  .kl-workshop-detail-header{margin-bottom:8px;padding:10px 12px}
  .kl-workshop-detail-actions{margin-top:8px}
  .kl-workshop-page .kl-workshop-detail-actions button:not(.kl-workshop-bookmark){min-height:36px}
  .kl-workshop-detail-tabs{padding-top:0;margin-bottom:10px}
  .kl-workshop-page .kl-workshop-detail-tabs>button{height:34px;min-height:34px;padding-bottom:7px}
  .kl-workshop-card>.kl-workshop-type-preview{height:48px}
}
@media(pointer:coarse){.kl-workshop-page .kl-workshop-menu>summary,.kl-workshop-page .kl-workshop-grid .kl-text-button,.kl-workshop-page .kl-workshop-primary{min-height:44px;min-width:44px}}
@media(pointer:coarse){
  .kl-workshop-page .kl-workshop-installed-actions>.kl-text-button,.kl-workshop-page .kl-workshop-update-button,.kl-workshop-page .kl-workshop-scopes>[aria-pressed]{min-height:44px}
  .kl-workshop-page :is(.kl-workshop-search-submit,.kl-workshop-search-clear){width:36px;min-width:36px;min-height:36px}
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)){
  .kl-workshop-install-header,.kl-workshop-install-footer{padding:10px 12px}
  .kl-workshop-install-body{padding:12px}
  .kl-workshop-page .kl-workshop-install-header h2{font-size:15px}
  .kl-workshop-page .kl-workshop-install-header button{width:40px;height:40px}
  .kl-workshop-page .kl-workshop-install-footer>button{min-height:40px}
}
@media (pointer:coarse){
  .kl-workshop-page .kl-workshop-detail-actions button,.kl-workshop-page .kl-workshop-detail-tabs>button,
  .kl-workshop-page .kl-workshop-install-header button,.kl-workshop-page .kl-workshop-install-footer>button{min-height:44px}
  .kl-workshop-page .kl-workshop-install-header button{min-width:44px}
  .kl-workshop-review-rating>label{width:44px;height:44px}
}
/* Installed uses the same empty and consent typography as the prototype. */
.kl-workshop-installed-library>.kl-workshop-empty{font-size:11px;line-height:1.7;color:var(--kl-muted)}
.kl-workshop-installed-library>.kl-workshop-empty h2{font-size:16px;line-height:1.4;color:inherit}
.kl-workshop-installed-library>.kl-workshop-empty>.kl-text-button{height:36px;min-height:36px;margin-top:4px;padding:0 12px;font-size:12px;font-weight:550;line-height:1.7;color:inherit;background:transparent}
.kl-workshop-installed-library>.kl-workshop-empty>.kl-workshop-action-primary{font-weight:650;color:#fff;background:var(--kl-accent);border-color:color-mix(in srgb,var(--kl-accent) 58%,var(--kl-muted))}
.kl-workshop-installed-library>.kl-workshop-active-filters>.kl-text-button{min-height:0;height:auto;padding:5px 0;font-size:11px;font-weight:400;line-height:1.5}
.kl-workshop-installed-library>.kl-workshop-search>select{background:var(--kl-input-bg)}
.kl-workshop-installed .kl-workshop-install-consent small{line-height:1.5}
.kl-workshop-installed .kl-workshop-install-consent input[type=checkbox]{width:16px;height:16px}
.kl-workshop-installed .kl-workshop-install-body{scrollbar-width:thin;scrollbar-color:#514438 transparent}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)){
 .kl-workshop-installed-library>.kl-workshop-empty>.kl-text-button{height:40px;min-height:40px}
}
@container kl-panel (width <= 900px) and (height <= 500px){
 .kl-workshop-installed-library>.kl-workshop-empty{display:grid;grid-template-columns:28px minmax(0,1fr) auto auto;column-gap:12px;row-gap:3px;text-align:left;align-items:center}
 .kl-workshop-installed-library>.kl-workshop-empty>svg{grid-column:1;grid-row:1 / 3;width:24px;height:24px;margin:0}
 .kl-workshop-installed-library>.kl-workshop-empty>h2{grid-column:2;grid-row:1;align-self:end}
 .kl-workshop-installed-library>.kl-workshop-empty>p{grid-column:2;grid-row:2;align-self:start}
 .kl-workshop-installed-library>.kl-workshop-empty>.kl-text-button{grid-column:3;grid-row:1 / 3;margin:0}
 .kl-workshop-installed-library>.kl-workshop-empty>.kl-text-button:last-child{grid-column:4}
}
`;
