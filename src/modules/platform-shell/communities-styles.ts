export const COMMUNITIES_STYLES = `
.kl-communities-page {height:100%;min-width:0;overflow:auto;background:transparent;scrollbar-gutter:stable;scrollbar-width:thin;scrollbar-color:var(--kl-border-strong) transparent;}
.kl-communities-page[hidden]{display:none!important}
.kl-cm-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 24px;border-bottom:1px solid var(--kl-border)}
.kl-cm-heading>h1{flex:1;min-width:0}.kl-cm-heading>.kl-text-button{flex-shrink:0;font-size:12px}.kl-cm-heading>[data-community-action=back]{margin-right:auto}
.kl-cm-overview{display:flex;flex-wrap:wrap;align-items:center;gap:12px}.kl-cm-overview>p{margin:0}.kl-cm-overview>.kl-cm-actions{margin-left:auto}.kl-cm-overview details[open]{flex-basis:100%}
.kl-cm-heading h1{font-size:24px;line-height:1.3;margin:0}.kl-cm-heading p{color:var(--kl-muted);margin:0;overflow-wrap:anywhere}
.kl-cm-body{padding:20px 24px;display:flex;flex-direction:column;gap:12px;min-width:0}.kl-cm-body h2{font-size:16px;margin:0}.kl-cm-body p{line-height:1.5}
.kl-cm-tabs,.kl-cm-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.kl-cm-tabs{padding-bottom:12px;border-bottom:1px solid var(--kl-border)}
.kl-cm-tabs [aria-pressed=true]{background:var(--kl-surface-2);color:var(--kl-accent);border-color:var(--kl-border)}
.kl-cm-body>.kl-text-button{align-self:flex-start}.kl-cm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr));gap:12px}
.kl-cm-card{display:flex;flex-direction:column;gap:12px;border:1px solid var(--kl-border);border-radius:10px;padding:16px;min-width:0;background:var(--kl-surface)}
.kl-cm-card-top{display:flex;gap:10px;align-items:center}.kl-cm-card-top>.kl-icon{width:44px;height:44px;padding:10px;border:1px solid var(--kl-border);border-radius:11px;background:var(--kl-surface-2);color:var(--kl-accent);flex-shrink:0}
.kl-cm-card h2,.kl-cm-card p{overflow-wrap:anywhere;margin:0}.kl-cm-card small,.kl-cm-meta,.kl-cm-thread small{color:var(--kl-muted)}
.kl-cm-empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 16px;text-align:center;color:var(--kl-muted);border:1px dashed var(--kl-border);border-radius:10px;background:#11111308}.kl-cm-status,.kl-cm-confirm{padding:12px;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-surface-2)}
.kl-cm-messages{display:flex;flex-direction:column;gap:8px;max-height:420px;overflow:auto}
.kl-cm-message{padding:10px;border-bottom:1px solid var(--kl-border);overflow-wrap:anywhere}.kl-cm-message>div{display:flex;gap:8px;flex-wrap:wrap}.kl-cm-message time{font-size:11px;color:var(--kl-muted)}.kl-cm-message p{white-space:pre-wrap;margin:6px 0}
.kl-cm-retained-action{min-width:0;margin:10px 0;overflow-wrap:anywhere}.kl-cm-retained-action summary{cursor:pointer;font-weight:600}.kl-cm-retained-action textarea{display:block;width:100%;min-height:70px;resize:vertical;margin:8px 0}.kl-cm-retained-action button{margin:4px 6px 4px 0}
.kl-cm-editor{padding:20px;border:1px solid var(--kl-border);border-radius:10px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;background:var(--kl-surface-2)}
.kl-cm-editor h2,.kl-cm-editor-source,.kl-cm-editor>.kl-cm-discard,.kl-cm-editor>.kl-cm-actions,.kl-cm-form-error{grid-column:1/-1}.kl-cm-editor label{display:flex;flex-direction:column;gap:7px;min-width:0}.kl-cm-editor textarea{min-height:85px;resize:vertical}
.kl-communities-page input,.kl-communities-page select,.kl-communities-page textarea{max-width:100%;box-sizing:border-box;color:var(--kl-text);background:var(--kl-input-bg);border:1px solid var(--kl-border);border-radius:7px;padding:9px;font:inherit}
.kl-cm-rows{display:flex;flex-direction:column;gap:8px}.kl-cm-rows article{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:14px;border:1px solid var(--kl-border);border-radius:8px}.kl-cm-rows small{display:block;color:var(--kl-muted);margin-top:4px}
.kl-communities-page button:focus-visible,.kl-communities-page input:focus-visible,.kl-communities-page select:focus-visible,.kl-communities-page textarea:focus-visible{outline:2px solid var(--kl-accent);outline-offset:2px}
@container kl-workspace (max-width:650px){.kl-cm-heading{padding:16px 14px;gap:8px}.kl-cm-overview>.kl-cm-actions{margin-left:0}.kl-cm-body{padding:14px}.kl-cm-heading h1{font-size:20px}.kl-cm-editor{grid-template-columns:minmax(0,1fr);padding:14px}}
@media(pointer:coarse){.kl-communities-page button{min-height:44px}}

.kl-cm-compose{display:flex;flex-direction:column;gap:8px}.kl-cm-compose>small{color:var(--kl-muted)}
.kl-cm-message{display:flex;gap:9px;align-items:flex-start;padding:6px 0;border:0;max-width:90%;align-self:flex-start}
.kl-cm-message>.kl-cm-bubble{display:block;min-width:0;padding:10px 12px;border:1px solid var(--kl-border);border-radius:4px 12px 12px;background:var(--kl-surface-2)}
.kl-cm-message--self{align-self:flex-end;flex-direction:row-reverse}.kl-cm-message--self>.kl-cm-bubble{border-radius:12px 4px 12px 12px;background:color-mix(in srgb,var(--kl-accent) 8%,var(--kl-surface))}
.kl-cm-avatar{display:grid;place-items:center;flex:none;width:30px;height:30px;border-radius:50%;background:color-mix(in srgb,var(--kl-accent) 14%,var(--kl-surface));font-size:10px;color:var(--kl-accent)}
.kl-cm-message-meta{display:flex;align-items:baseline;flex-wrap:wrap;gap:8px}.kl-cm-author{padding:0;border:0;color:var(--kl-text);font:inherit;font-size:12px;font-weight:600;background:none;cursor:pointer;text-align:left;overflow-wrap:anywhere}
.kl-cm-bubble>.kl-text-button{font-size:11px;padding:3px 6px;min-height:24px;color:var(--kl-muted)}
.kl-cm-bubble .kl-message-media{display:grid;gap:6px;max-width:330px}.kl-cm-bubble .kl-cloud-image{max-width:100%;max-height:260px;object-fit:contain;border-radius:8px}
.kl-cm-message[data-highlight=true]>.kl-cm-bubble{border-color:var(--kl-accent);box-shadow:0 0 0 1px var(--kl-accent)}
.kl-cm-composer textarea:disabled{opacity:.7}.kl-cm-compose>.kl-cm-actions{font-size:12px}.kl-cm-compose>.kl-cm-actions button{display:flex;gap:6px;align-items:center}
@container kl-workspace (max-width:650px){.kl-cm-message{max-width:100%}.kl-cm-avatar{width:25px;height:25px}.kl-cm-message>.kl-cm-bubble{padding:8px 10px}.kl-cm-author{font-size:11px}}

.kl-cm-moderation{display:flex;flex-direction:column;gap:12px;min-width:0}.kl-cm-report-detail{display:flex;flex-direction:column;gap:12px;padding:18px;border:1px solid var(--kl-border);border-radius:12px;background:var(--kl-surface-2);min-width:0}
.kl-cm-report-detail p,.kl-cm-report-detail blockquote,.kl-cm-moderation article{overflow-wrap:anywhere}.kl-cm-report-detail blockquote{white-space:pre-wrap;border-left:3px solid var(--kl-accent);padding:12px;margin:0;background:var(--kl-surface);border-radius:4px}.kl-cm-report-detail label{display:flex;flex-direction:column;gap:8px}.kl-cm-report-detail textarea{min-height:90px;width:100%;resize:vertical}.kl-cm-report-detail .kl-cloud-image{max-width:100%;max-height:300px;object-fit:contain}.kl-cm-report-detail .kl-message-media{max-width:400px}
.kl-cm-dialog{width:min(460px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;box-sizing:border-box;padding:20px}.kl-cm-dialog h2{font-size:18px;margin:0 0 12px}.kl-cm-dialog textarea{width:100%;min-height:90px;resize:vertical}.kl-cm-dialog p{line-height:1.5}.kl-cm-dialog .kl-report-reasons{display:grid;gap:9px;border:0;padding:12px 0}.kl-cm-dialog .kl-report-reason{display:flex;gap:10px;align-items:center}.kl-cm-dialog .kl-report-form{padding:0}.kl-cm-dialog .kl-report-reason input{width:auto}.kl-cm-dialog .kl-cm-actions{justify-content:flex-end}

.kl-cm-heading{border:0;padding:20px 24px 14px}.kl-cm-body{padding-top:0;gap:14px}
.kl-cm-search{display:flex;gap:8px;align-items:center}.kl-cm-search>.kl-text-button{display:flex;align-items:center;gap:6px;flex:none}
.kl-cm-card{padding:12px;gap:12px;transition:border-color .16s ease,background .16s ease}.kl-cm-card:hover{border-color:var(--kl-border-strong);background:var(--kl-surface-2)}.kl-cm-card-top>div{min-width:0}.kl-cm-card h2{font-size:14px;line-height:1.4}.kl-cm-card h2 button{border:0!important;padding:0!important;background:none!important;font:inherit;text-align:left;white-space:normal;overflow-wrap:anywhere}
.kl-cm-card>.kl-cm-card-description{font-size:var(--kl-type-body);line-height:1.6;color:var(--kl-muted);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;min-height:38px}.kl-cm-card>.kl-cm-meta{display:flex;gap:6px;align-items:center;font-size:11px}.kl-cm-card>.kl-cm-meta>.kl-icon{width:14px;height:14px}
.kl-cm-card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;border-top:1px solid var(--kl-border);padding-top:12px}
.kl-cm-hero{padding:0 0 12px}.kl-cm-identity{display:flex;align-items:center;gap:12px}.kl-cm-identity>div{min-width:0;flex:1}.kl-cm-identity>.kl-icon{width:46px;height:46px;flex:none;box-sizing:border-box;padding:11px;border:1px solid var(--kl-border);border-radius:11px;background:color-mix(in srgb,var(--kl-accent) 10%,var(--kl-surface));color:var(--kl-accent)}
.kl-cm-identity h1{font-size:var(--kl-type-xl);letter-spacing:-.3px;margin:0 0 4px;line-height:1.4;overflow-wrap:anywhere}.kl-cm-identity p{margin:0;font-size:11px}.kl-cm-hero>p{font-size:var(--kl-type-body);margin:10px 0 0;max-width:76ch;color:var(--kl-muted);line-height:1.6;overflow-wrap:anywhere}.kl-cm-role{font-size:10px;color:var(--kl-gold,#d6a24b);border:1px solid var(--kl-border);padding:4px 7px;border-radius:5px}
.kl-cm-management{border:1px solid var(--kl-border);border-radius:8px;padding:12px;background:var(--kl-surface-2)}.kl-cm-management[hidden]{display:none!important}
.kl-cm-sections{flex-wrap:nowrap;overflow-x:auto;gap:20px;padding:0;border-bottom:1px solid var(--kl-border)}.kl-cm-sections>.kl-text-button{flex:none;white-space:nowrap;border:0;border-bottom:2px solid transparent;border-radius:0;padding:12px 4px;background:none;color:var(--kl-muted);font-weight:500}.kl-cm-sections>.kl-text-button[aria-pressed=true]{background:none;border-bottom-color:var(--kl-accent);color:var(--kl-text)}
.kl-cm-overview-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,260px);align-items:start;gap:24px}.kl-cm-overview-main{display:flex;flex-direction:column;gap:24px;min-width:0}
.kl-cm-panel{min-width:0;border:1px solid var(--kl-border);border-radius:10px;padding:16px;background:var(--kl-surface)}.kl-cm-panel>header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.kl-cm-panel h2{font-size:13px;margin:0 0 10px}.kl-cm-panel>header h2{margin:0}.kl-cm-panel p,.kl-cm-panel li{font-size:12px;line-height:1.6;overflow-wrap:anywhere}.kl-cm-panel ol{padding-left:20px;color:var(--kl-muted)}.kl-cm-panel>button{display:block;margin:6px 0;text-align:left}
.kl-cm-preview-row{display:flex;gap:10px;padding:12px 0;border-top:1px solid var(--kl-border)}.kl-cm-preview-row>.kl-icon{width:22px;height:22px;flex:none;color:var(--kl-gold,#d6a24b)}.kl-cm-preview-row>div{min-width:0;flex:1}.kl-cm-preview-row button{border:0;padding:0;background:none;text-align:left;white-space:normal;overflow-wrap:anywhere}.kl-cm-preview-row small{display:block;color:var(--kl-muted);font-size:10px;margin-top:5px}.kl-cm-preview-row p{margin:8px 0 0;color:var(--kl-muted)}
.kl-cm-facts{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px 18px;font-size:12px}.kl-cm-facts dt{color:var(--kl-muted)}.kl-cm-facts dd{margin:0;overflow-wrap:anywhere}.kl-cm-empty>.kl-icon{width:28px;height:28px}.kl-cm-empty h2{font-size:16px;line-height:1.4;font-weight:650;letter-spacing:-.2px;margin:0;color:var(--kl-text)}.kl-cm-empty p{max-width:340px;margin:0 auto;font-size:11px;line-height:1.7}.kl-cm-empty>.kl-text-button{margin-top:4px}
@container kl-workspace (max-width:650px){.kl-cm-heading{padding:16px 14px}.kl-cm-overview-grid{grid-template-columns:minmax(0,1fr)}.kl-cm-panel{padding:14px}.kl-cm-card{padding:12px}.kl-cm-heading h1{font-size:calc(var(--kl-type-xl) + 3px)}}

.kl-cm-emblem{display:inline-flex;align-items:center;justify-content:center;flex:none!important;box-sizing:border-box;width:44px;height:44px;border:1px solid var(--cm-ink);border-color:color-mix(in srgb,var(--cm-ink) 20%,transparent);border-radius:11px;background:var(--cm-bg);color:var(--cm-ink)}
.kl-cm-emblem>.kl-icon{width:23px;height:23px}.kl-cm-identity>.kl-cm-emblem{width:48px;height:48px;border-radius:10px}.kl-cm-identity>.kl-cm-emblem>.kl-icon{width:24px;height:24px}
.kl-cm-color-rose{--cm-bg:#351c22;--cm-ink:#dd9ba4}.kl-cm-color-lavender{--cm-bg:#29223d;--cm-ink:#b09ed8}.kl-cm-color-amber{--cm-bg:#312b26;--cm-ink:#caae92}.kl-cm-color-blue{--cm-bg:#1b2c3b;--cm-ink:#8fbad6}.kl-cm-color-sage{--cm-bg:#21332f;--cm-ink:#98bba8}
.kl-cm-tags{display:flex;gap:6px;flex-wrap:wrap}.kl-cm-tags:empty{display:none}.kl-cm-tags>span{font-size:10px;border:1px solid var(--kl-border);border-radius:5px;padding:3px 7px;color:var(--kl-muted);overflow-wrap:anywhere;max-width:100%;box-sizing:border-box}.kl-cm-hero>.kl-cm-tags{margin:12px 0}
.kl-cm-announcement{border-left:2px solid var(--kl-gold,#d6a24b);padding:12px 16px}.kl-cm-announcement header h2{display:flex;align-items:center;gap:6px}.kl-cm-announcement h2>.kl-icon{width:13px;height:13px}.kl-cm-announcement-copy{white-space:pre-wrap;overflow-wrap:anywhere;margin:0}
.kl-cm-design-dialog{box-sizing:border-box;width:min(620px,calc(100vw - 24px));max-height:calc(100dvh - 24px);padding:0;border:1px solid var(--kl-border);border-radius:12px;background:var(--kl-surface);color:var(--kl-text);overflow:hidden;font-size:12px}
.kl-cm-design-dialog::backdrop{background:#0009}.kl-cm-design-dialog form{display:flex;flex-direction:column;max-height:calc(100dvh - 28px)}.kl-cm-design-dialog header,.kl-cm-design-dialog footer{display:flex;align-items:center;gap:10px;padding:16px 20px;flex:none;background:var(--kl-surface)}.kl-cm-design-dialog header{border-bottom:1px solid var(--kl-border)}.kl-cm-design-dialog header h2{flex:1;font-size:19px;margin:0}.kl-cm-design-dialog footer{border-top:1px solid var(--kl-border)}.kl-cm-design-dialog footer>button:last-child{margin-left:auto}
.kl-cm-design-body{padding:20px;overflow:auto;min-height:0}.kl-cm-design-fields{display:grid;gap:16px}.kl-cm-design-fields label{display:flex;flex-direction:column;gap:7px;min-width:0}.kl-cm-design-fields input,.kl-cm-design-fields textarea,.kl-cm-design-fields select{width:100%;max-width:100%;font-size:12px}.kl-cm-design-fields textarea{resize:vertical;min-height:75px}.kl-cm-field-note{color:var(--kl-muted);font-size:10px;line-height:1.5}.kl-cm-design-fields h3{font-size:14px;margin:0}.kl-cm-design-fields p,.kl-cm-design-fields li{line-height:1.6;overflow-wrap:anywhere}
.kl-cm-steps{list-style:none;display:flex;justify-content:space-between;gap:8px;padding:0 0 18px;margin:0 0 18px;border-bottom:1px solid var(--kl-border);color:var(--kl-muted);font-size:11px}.kl-cm-steps [aria-current]{color:var(--kl-text);font-weight:600}
.kl-cm-choices{border:0;padding:0;display:flex;gap:8px;flex-wrap:wrap;margin:0}.kl-cm-choices legend{padding:0;margin-bottom:10px}.kl-cm-choices>button{padding:0!important;border:0!important;background:none;min-width:44px;min-height:44px;border-radius:11px}.kl-cm-choices>button[aria-pressed=true]{outline:2px solid var(--kl-accent);outline-offset:2px}.kl-cm-colors>button{background:var(--cm-bg);font-size:20px;min-width:36px;min-height:36px;width:36px;height:36px}
.kl-cm-review{padding:16px;border:1px solid var(--kl-border);border-radius:10px;background:var(--kl-surface-2)}.kl-cm-review small{display:block;margin-top:5px;color:var(--kl-muted)}.kl-cm-review p{margin:12px 0}.kl-cm-design-error,.kl-cm-conflict,.kl-cm-discard{border:1px solid var(--kl-border);border-radius:8px;padding:12px;line-height:1.5;overflow-wrap:anywhere}.kl-cm-design-error{color:var(--kl-accent)}.kl-cm-conflict>button,.kl-cm-discard>button{margin:8px 8px 0 0}.kl-cm-discard{margin:0 20px 16px;max-height:35dvh;overflow:auto}.kl-cm-discard h3,.kl-cm-conflict h3{font-size:14px;margin:0}.kl-cm-conflict summary{cursor:pointer;margin:12px 0}.kl-cm-conflict details .kl-cm-review h3{overflow-wrap:anywhere}
.kl-cm-design-dialog :focus-visible{outline:2px solid var(--kl-accent);outline-offset:2px}.kl-cm-design-dialog button{font-size:12px;font-weight:600;min-height:34px;padding:8px 11px}
@media(pointer:coarse){.kl-cm-design-dialog button{min-height:44px}.kl-cm-colors>button{width:44px;height:44px}}
@media(max-width:700px){.kl-cm-design-dialog header,.kl-cm-design-dialog footer{padding:12px 14px}.kl-cm-design-body{padding:16px 14px}.kl-cm-design-dialog header h2{font-size:18px}.kl-cm-discard{margin:0 14px 12px}.kl-cm-emblem{width:40px;height:40px}}
.kl-cm-design-dialog { position: fixed; inset: 0; margin: auto; }
.kl-cm-design-dialog[open] { display: flex; flex-direction: column; }
.kl-cm-design-dialog > form { min-height: 0; max-height: inherit; }
.kl-cm-design-dialog header { justify-content: space-between; }
.kl-cm-design-title { min-width: 0; }
.kl-cm-design-title > span { display: block; margin-bottom: 2px; color: var(--kl-muted); font-size: 9px; letter-spacing: .06em; }
.kl-cm-manager-dialog {
  width: min(640px, calc(100vw - 24px));
  border-color: var(--kl-border-strong);
  box-shadow: var(--kl-shadow);
}
.kl-cm-manager-dialog::backdrop { background: #030303c4; backdrop-filter: blur(4px); }
.kl-cm-manager-dialog > form > header { gap: 12px; padding: 14px 16px; background: var(--kl-topbar-bg); }
.kl-cm-manager-dialog .kl-cm-design-title > span { margin: 0; font-size: 10px; line-height: 1.7; letter-spacing: .25px; }
.kl-cm-manager-dialog > form > header h2 {
  font-family: var(--kl-title-font, inherit); font-size: 19px; font-weight: 700; line-height: 1.35;
}
.kl-cm-manager-dialog > form > header .kl-browse-icon {
  flex: none; width: 32px; height: 32px; min-height: 32px; padding: 0; border: 0; border-radius: 8px; background: transparent;
}
.kl-cm-manager-dialog > form > header .kl-browse-icon:hover { background: var(--kl-surface-hover); }
.kl-cm-manager-dialog .kl-cm-design-body {
  padding: 16px; min-width: 0; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain;
  scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent;
}
.kl-cm-manager-dialog > form > footer {
  flex-wrap: wrap; gap: 8px; min-height: 61px; padding: 12px 16px; background: var(--kl-input-bg);
}
.kl-cm-manager-dialog > form > footer > button {
  min-height: 36px; max-width: 100%; padding: 0 12px; border-radius: 8px; font-size: 12px; font-weight: 550;
}
.kl-cm-manager-dialog > form > footer > .kl-text-button--primary { font-weight: 650; }
.kl-cm-manager-dialog > form > footer > button:disabled { cursor: default; }
.kl-cm-invitations-dialog .kl-browse-search:has(input:placeholder-shown) > .kl-browse-icon { display: none; }
.kl-cm-invitations-dialog .kl-cm-manager-row-copy { flex: 1; }
.kl-cm-invitation-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 6px; }
.kl-cm-invitations-list > .kl-text-button { align-self: flex-start; margin-top: 8px; }
.kl-cm-invitations-list > .kl-text-button[aria-disabled=true] { opacity: .6; cursor: default; }
.kl-cm-invitations-status { padding: 20px 8px; color: var(--kl-muted); text-align: center; }
.kl-cm-invitations-status h3 { margin: 0; color: var(--kl-text); font-size: 12px; line-height: 1.5; }
.kl-cm-invitations-status p { margin: 6px 0 0; font-size: 11px; line-height: 1.65; }
.kl-cm-invitations-status > button { margin-top: 12px; }
.kl-cm-manager-summary {
  display: flex; align-items: flex-start; gap: 12px; min-width: 0; padding: 12px; margin-bottom: 12px;
  border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg);
}
.kl-cm-manager-summary > div { flex: 1; min-width: 0; }
.kl-cm-manager-summary strong { display: block; font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.kl-cm-manager-summary small { display: block; margin-top: 5px; color: var(--kl-muted); font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; }
.kl-cm-manager-summary .kl-cm-role {
  flex: none; margin-top: 2px; padding: 2px 6px; border-radius: 6px; color: var(--kl-gold);
  border-color: color-mix(in srgb, var(--kl-gold) 30%, transparent); background: transparent; font-size: 10px; line-height: 1.4;
}
.kl-cm-manager-nav {
  display: flex; flex-wrap: nowrap; gap: 16px; min-width: 0; margin: 0 0 16px; padding: 0 2px 1px;
  overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: thin; border-bottom: 1px solid var(--kl-border);
}
.kl-cm-manager-nav > .kl-text-button {
  position: relative; flex: none; height: 36px; min-height: 0; padding: 0 1px 9px; border: 0; border-radius: 0;
  background: transparent; color: var(--kl-muted); font-size: 11px; font-weight: 500; white-space: nowrap;
}
.kl-cm-manager-nav > .kl-text-button:hover, .kl-cm-manager-nav > [aria-current] { color: var(--kl-text); }
.kl-cm-manager-nav > [aria-current]::after {
  position: absolute; inset: auto 0 0; height: 2px; border-radius: 2px; background: var(--kl-accent); content: '';
}
.kl-cm-manager-nav > .kl-text-button:focus-visible { outline-offset: -2px; }
.kl-cm-manager-panel { min-width: 0; gap: 12px; }
.kl-cm-manager-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 12px; }
.kl-cm-manager-panel label { gap: 6px; }
.kl-cm-manager-panel .kl-cm-field-label { font-size: 12px; font-weight: 550; line-height: 1.6; overflow-wrap: anywhere; }
.kl-cm-manager-panel :is(input:not([type=checkbox]), select, textarea) {
  padding: 8px 10px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg);
  color: var(--kl-text); font-size: 12px; line-height: 1.6;
}
.kl-cm-manager-panel :is(input:not([type=checkbox]), select) { min-height: 36px; }
.kl-cm-manager-panel textarea { min-height: 88px; }
.kl-cm-manager-panel .kl-cm-field-note { line-height: 1.7; overflow-wrap: anywhere; }
.kl-cm-manager-panel .kl-cm-manager-count { align-self: end; }
.kl-cm-manager-panel .kl-cm-manager-discovery {
  flex-direction: row; align-items: flex-start; gap: 10px; padding: 14px 0;
  border-bottom: 1px solid var(--kl-border); cursor: pointer;
}
.kl-cm-manager-discovery > input { flex: none; width: 16px; height: 16px; margin: 3px 0 0; accent-color: var(--kl-accent); }
.kl-cm-manager-discovery > span { flex: 1; min-width: 0; }
.kl-cm-manager-discovery strong { display: block; font-size: 11px; font-weight: 550; }
.kl-cm-manager-discovery small { display: block; margin-top: 3px; color: var(--kl-muted); font-size: 10px; line-height: 1.7; }
.kl-cm-manager-status { margin: 0; }
.kl-cm-manager-customization { padding-top: 12px; border-top: 1px solid var(--kl-border); color: var(--kl-muted); font-size: 11px; }
.kl-cm-manager-customization > summary { cursor: pointer; }
.kl-cm-manager-roster { display: flex; flex-direction: column; gap: 12px; }
.kl-cm-manager-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.kl-cm-manager-toolbar > .kl-browse-search {
  display: flex; align-items: center; flex: 1 1 180px; gap: 8px; min-width: 0; min-height: 36px;
  padding-inline: 10px 5px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg);
}
.kl-cm-manager-roster .kl-cm-manager-toolbar > .kl-browse-search > input {
  flex: 1; min-width: 0; min-height: 0; padding: 0; border: 0; background: transparent;
}
.kl-cm-manager-toolbar .kl-browse-search > .kl-icon { flex: none; width: 15px; height: 15px; color: var(--kl-muted); }
.kl-cm-manager-toolbar .kl-browse-search > .kl-browse-icon {
  flex: none; width: 24px; height: 24px; min-height: 24px; padding: 0;
}
.kl-cm-manager-toolbar > select { min-width: 0; max-width: 100%; }
.kl-cm-manager-dialog .kl-cm-manager-roster .kl-text-button:not(.kl-browse-icon) {
  min-height: 32px; max-width: 100%; padding: 4px 9px; border-radius: 8px;
  font-size: 11px; font-weight: 550; line-height: 1.5; white-space: normal; overflow-wrap: anywhere;
}
.kl-cm-manager-toolbar > .kl-text-button[aria-pressed=true] { border-color: var(--kl-border-strong); color: var(--kl-accent); }
.kl-cm-manager-note { margin: 0; color: var(--kl-muted); font-size: 11px; line-height: 1.75; overflow-wrap: anywhere; }
.kl-cm-manager-list { display: flex; flex-direction: column; min-width: 0; }
.kl-cm-manager-list-title, .kl-cm-manager-invite h3 { margin: 0; font-size: 13px; font-weight: 650; line-height: 1.55; }
.kl-cm-manager-row {
  display: flex; align-items: center; gap: 10px; min-width: 0; padding: 12px 0;
  border-bottom: 1px solid var(--kl-border);
}
.kl-cm-manager-row:last-child { border-bottom: 0; }
.kl-cm-manager-person { display: flex; align-items: center; flex: 1; gap: 9px; min-width: 0; }
.kl-cm-manager-avatar {
  display: grid; place-items: center; flex: none; width: 32px; height: 32px; overflow: hidden;
  border: 1px solid var(--kl-border); border-radius: 50%; background: var(--kl-avatar-bg);
  color: var(--kl-muted); font-size: 10px;
}
.kl-cm-manager-avatar > *, .kl-cm-manager-avatar img { display: block; width: 100%; height: 100%; object-fit: cover; }
.kl-cm-manager-row-copy { min-width: 0; overflow-wrap: anywhere; }
.kl-cm-manager-row-copy > strong { display: block; font-size: 12px; font-weight: 600; line-height: 1.55; }
.kl-cm-manager-row-copy > :is(small, time) { display: block; margin-top: 3px; color: var(--kl-muted); font-size: 10px; line-height: 1.65; }
.kl-cm-manager-row-actions {
  display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 6px; min-width: 0;
  flex: 0 1 auto; max-width: 62%;
}
.kl-cm-manager-roster[data-community-manager-panel=members] .kl-cm-manager-row-actions { max-width: 68%; }
.kl-cm-manager-row-actions select { min-width: 0; max-width: 100%; min-height: 32px; padding-block: 4px; }
.kl-cm-manager-row-actions > .kl-cm-role { flex: none; max-width: 100%; }
.kl-cm-manager-invite {
  display: flex; flex-direction: column; gap: 12px; min-width: 0; padding: 14px;
  border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg);
}
.kl-cm-manager-invite > label { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.kl-cm-manager-invite > label > span { font-size: 12px; font-weight: 550; line-height: 1.6; }
.kl-cm-manager-invite > label > input { width: 100%; min-width: 0; }
.kl-cm-manager-roster > .kl-text-button, .kl-cm-manager-invite > .kl-text-button { align-self: flex-start; }
.kl-cm-manager-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 0; padding: 24px 12px;
  border: 1px dashed var(--kl-border); border-radius: 8px; text-align: center;
}
.kl-cm-manager-empty > .kl-icon { width: 25px; height: 25px; color: var(--kl-muted); }
.kl-cm-manager-empty > h3 { margin: 0; font-size: 13px; line-height: 1.6; }
.kl-cm-manager-empty > p { max-width: 46ch; margin: 0; color: var(--kl-muted); font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; }
.kl-cm-lifecycle-panel { display: flex; flex-direction: column; gap: 12px; }
.kl-cm-lifecycle-panel > .kl-text-button { align-self: flex-start; max-width: 100%; white-space: normal; }
.kl-cm-lifecycle-panel[data-community-archive-state=archived] > .kl-text-button { align-self: stretch; min-height: 36px; }
.kl-cm-lifecycle-field { display: flex; flex-direction: column; min-width: 0; }
.kl-cm-lifecycle-field > :is(input, select) { box-sizing: border-box; width: 100%; min-width: 0; }
.kl-cm-lifecycle-field > input[readonly] { color: var(--kl-muted); }
.kl-cm-lifecycle-notice {
  display: flex; align-items: flex-start; gap: 8px; min-width: 0; padding: 10px 12px; border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--kl-gold) 22%, transparent);
  background: color-mix(in srgb, var(--kl-gold) 4%, transparent);
  color: color-mix(in srgb, var(--kl-gold) 45%, var(--kl-text)); font-size: 11px; line-height: 1.75;
}
.kl-cm-lifecycle-notice > .kl-icon { flex: 0 0 15px; width: 15px; height: 15px; margin-top: 1px; }
.kl-cm-lifecycle-notice > span { min-width: 0; overflow-wrap: anywhere; }
.kl-cm-lifecycle-notice strong { font-weight: 600; }
.kl-cm-lifecycle-warning { padding: 12px; border-color: var(--kl-border-strong); background: var(--kl-input-bg); color: var(--kl-muted); }
.kl-cm-lifecycle-warning strong { color: var(--kl-text); }
.kl-cm-lifecycle-checklist { margin: 0; padding-left: 18px; color: var(--kl-muted); font-size: 11px; line-height: 1.75; }
.kl-cm-lifecycle-checklist > li { overflow-wrap: anywhere; }
.kl-cm-lifecycle-checklist > li + li { margin-top: 5px; }
.kl-cm-lifecycle-meta {
  display: flex; flex-wrap: wrap; gap: 12px 20px; min-width: 0; margin: 0; padding: 12px;
  border: 1px solid var(--kl-border); border-radius: 7px; background: var(--kl-input-bg);
}
.kl-cm-lifecycle-meta > div { flex: 1 1 130px; min-width: 0; }
.kl-cm-lifecycle-meta dt { color: var(--kl-muted); font-size: 10px; line-height: 1.7; }
.kl-cm-lifecycle-meta dd { margin: 3px 0 0; color: var(--kl-text); font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.kl-cm-lifecycle-error { margin: 0; color: var(--kl-danger); font-size: 11px; line-height: 1.65; overflow-wrap: anywhere; }
.kl-cm-lifecycle-review { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.kl-cm-lifecycle-review > p { margin: 0; line-height: 1.75; overflow-wrap: anywhere; }
.kl-community-management-dialog:has(.kl-cm-lifecycle-review) { width: min(640px, calc(100vw - 24px)); }
.kl-moderation-dialog.kl-cm-leave-dialog {
  width:min(640px,calc(100vw - 24px)); font:12px/1.5 var(--kl-font,system-ui);
}
.kl-cm-leave-dialog.kl-moderation-dialog.kl-mod-page > .kl-dialog-header {
  min-height:0; padding:var(--kl-cm-leave-header-padding,14px) 16px;
}
.kl-cm-leave-dialog > .kl-dialog-header h2 { font-size:19px; line-height:1.35; letter-spacing:-.2px; }
.kl-cm-leave-dialog .kl-mod-eyebrow { color:var(--kl-text-faint,rgba(245,238,227,.58)); }
.kl-cm-leave-dialog > .kl-dialog-header .kl-mod-icon { padding:0; border:0; border-radius:8px; }
.kl-cm-leave-dialog .kl-cm-leave-copy > p { margin:0; font-size:11px; line-height:1.75; overflow-wrap:anywhere; }
.kl-cm-leave-dialog .kl-cm-leave-copy > p + p { margin-top:12px; }
.kl-cm-leave-dialog > .kl-mod-dialog-body > .kl-mod-note:empty { display:none; }
.kl-cm-leave-dialog > .kl-mod-dialog-body > .kl-mod-note:not(:empty) { margin:12px 0 0; }
.kl-cm-leave-dialog.kl-moderation-dialog.kl-mod-page > .kl-mod-dialog-footer {
  min-height:0; padding:var(--kl-cm-leave-footer-padding,12px) 16px;
}
.kl-cm-leave-dialog.kl-moderation-dialog .kl-mod-dialog-footer > .kl-text-button {
  height:36px; min-height:36px; padding:0 12px; border-radius:8px; font:550 12px/1.5 var(--kl-font,system-ui);
}
.kl-cm-leave-dialog.kl-moderation-dialog .kl-mod-dialog-footer > .kl-text-button--danger {
  color:var(--kl-danger); background:color-mix(in srgb,var(--kl-danger) 7%,transparent);
  border-color:color-mix(in srgb,var(--kl-danger) 36%,transparent);
}
.kl-cm-leave-dialog.kl-moderation-dialog .kl-mod-dialog-footer > .kl-text-button--danger:hover:not(:disabled) {
  background:var(--kl-surface-hover); border-color:var(--kl-border-strong);
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-cm-leave-dialog { --kl-cm-leave-header-padding:12px; --kl-cm-leave-footer-padding:10px; }
  .kl-cm-leave-dialog > .kl-dialog-header h2 { font-size:18px; }
  .kl-cm-leave-dialog > .kl-dialog-header .kl-mod-icon { width:40px; height:40px; min-width:40px; min-height:40px; }
  .kl-cm-leave-dialog.kl-moderation-dialog > .kl-mod-dialog-body { padding:14px 16px; }
  .kl-cm-leave-dialog.kl-moderation-dialog .kl-mod-dialog-footer > .kl-text-button { height:40px; min-height:40px; font-size:11px; }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-cm-leave-dialog { --kl-cm-leave-header-padding:8px; --kl-cm-leave-footer-padding:8px; }
  .kl-cm-leave-dialog > .kl-dialog-header h2 { font-size:17px; }
  .kl-cm-leave-dialog.kl-moderation-dialog > .kl-mod-dialog-body { padding-block:10px; }
}
.kl-communities-page:has(.kl-cm-manager-review[open]) > .kl-cm-manager-dialog[open] { visibility:hidden; }
.kl-communities-page:has(.kl-cm-manager-review[open]) > .kl-cm-manager-dialog[open]::backdrop { background:transparent; }
.kl-moderation-dialog.kl-cm-manager-review { width:min(640px,calc(100vw - 24px)); }
.kl-cm-manager-review > .kl-mod-dialog-body { font:400 12px/1.5 var(--kl-font,system-ui); }
.kl-cm-manager-review > .kl-mod-dialog-body > p { margin:0; }
.kl-cm-manager-review > .kl-mod-dialog-body > p:first-child { font-size:11px; line-height:1.75; }
.kl-cm-manager-review .kl-mod-dialog-body > label.kl-cm-review-role { margin:12px 0; font-weight:600; }
.kl-cm-manager-review .kl-mod-dialog-body .kl-cm-review-role select { height:auto; min-height:36px; padding:8px 10px; }
.kl-cm-manager-review .kl-cm-lifecycle-review { gap:12px; }
.kl-cm-manager-review .kl-cm-lifecycle-review > p { font-size:11px; }
.kl-cm-manager-review .kl-mod-dialog-body .kl-cm-manager-note { font-size:10px; line-height:1.7; }
.kl-cm-lifecycle-panel > .kl-cm-lifecycle-notice:not(.kl-cm-lifecycle-warning) { line-height:1.5; }
.kl-cm-lifecycle-panel > .kl-cm-manager-note { font-size:10px; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-cm-manager-review .kl-mod-dialog-body .kl-cm-review-role select { min-height:40px; font-size:16px; }
}
@media (min-width: 901px) {
  .kl-cm-manager-panel :is(input:not([type=checkbox]), select) { padding-block: 7px; }
}
@media (max-width: 900px) {
  .kl-cm-manager-panel :is(input:not([type=checkbox]), select, textarea) { font-size: 16px; line-height: 1.5; }
}
@container kl-panel (width <= 700px) {
  .kl-cm-manager-dialog > form > header { padding-block: 12px; }
  .kl-cm-manager-dialog > form > header h2 { font-size: 18px; }
  .kl-cm-manager-dialog .kl-cm-design-body { padding-block: 14px; }
  .kl-cm-manager-dialog > form > footer { padding-block: 10px; }
  .kl-cm-manager-dialog > form > footer > button { min-height: 40px; font-size: 11px; }
  .kl-cm-manager-nav { gap: 18px; margin-bottom: 12px; }
  .kl-cm-manager-nav > .kl-text-button { height: 40px; padding-bottom: 10px; font-size: 12px; }
  .kl-cm-manager-panel :is(input:not([type=checkbox]), select, textarea) { font-size: 16px; line-height: 1.5; }
  .kl-cm-manager-panel :is(input:not([type=checkbox]), select) { min-height: 40px; }
  .kl-cm-manager-toolbar > .kl-browse-search { min-height: 40px; }
  .kl-cm-invitations-dialog .kl-browse-search input { font-size: 16px; }
  .kl-cm-manager-dialog .kl-cm-manager-roster .kl-text-button:not(.kl-browse-icon) { min-height: 38px; }
  .kl-cm-lifecycle-panel[data-community-archive-state=archived] > .kl-text-button { min-height: 40px; }
}
@container kl-panel (width <= 480px) {
  .kl-cm-manager-summary { gap: 10px; }
  .kl-cm-manager-nav { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px 8px; padding: 0 0 4px; }
  .kl-cm-manager-nav > .kl-text-button { width: 100%; height: 36px; padding-bottom: 8px; font-size: 11px; }
  .kl-cm-manager-grid { grid-template-columns: minmax(0, 1fr); }
  .kl-cm-manager-toolbar > .kl-browse-search { flex-basis: 100%; }
  .kl-cm-manager-row { flex-wrap: wrap; gap: 8px; }
  .kl-cm-manager-person { flex: 1 1 180px; }
  .kl-cm-invitations-dialog .kl-cm-manager-row-copy { flex-basis: 170px; }
  .kl-cm-invitation-actions { flex-basis: 100%; justify-content: flex-start; }
  .kl-cm-manager-roster .kl-cm-manager-row-actions,
  .kl-cm-manager-roster[data-community-manager-panel=members] .kl-cm-manager-row-actions {
    flex-basis: 100%; max-width: 100%; justify-content: flex-start;
  }
}
@media (max-width: 900px) and (max-height: 500px) {
  .kl-cm-manager-dialog > form > header, .kl-cm-manager-dialog > form > footer { min-height: 57px; padding-block: 8px; }
  .kl-cm-manager-dialog > form > header h2 { font-size: 17px; }
  .kl-cm-manager-dialog .kl-cm-design-body { padding-block: 10px; }
  .kl-cm-manager-nav { margin-bottom: 10px; gap: 20px; }
  .kl-cm-manager-nav > .kl-text-button { height: 36px; padding-bottom: 8px; }
  .kl-cm-manager-panel { gap: 10px; }
  .kl-cm-manager-summary { padding: 8px 10px; gap: 8px; margin-bottom: 8px; }
  .kl-cm-manager-summary > div { display: flex; align-items: baseline; flex-wrap: wrap; gap: 3px 10px; }
  .kl-cm-manager-summary strong { font-size: 11px; }
  .kl-cm-manager-summary small { margin-top: 0; font-size: 10px; }
  .kl-cm-manager-summary .kl-cm-role { margin-top: 0; }
}
.kl-cm-design-create { --kl-cm-editor-faint: var(--kl-text-faint, #7e7468); width: min(540px, calc(100vw - 24px)); font-size: 12px; line-height: 1.5; border-color: var(--kl-border-strong); }
.kl-cm-design-create::backdrop { background: #030303b8; }
.kl-cm-design-create .kl-cm-design-body { padding: 16px; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent; }
.kl-cm-design-create header, .kl-cm-design-create footer { min-height: 61px; padding: 12px 16px; gap: 12px; }
.kl-cm-design-create .kl-cm-design-title > span { margin: 0; color: var(--kl-cm-editor-faint); font-size: 10px; line-height: 1.7; letter-spacing: .25px; }
.kl-cm-design-create header h2 { margin: 0; font-size: 16px; line-height: 1.4; letter-spacing: -.2px; }
.kl-cm-design-create header > .kl-browse-icon { flex: none; width: 32px; height: 32px; min-height: 32px; padding: 0 !important; border: 0; border-radius: 8px; background: transparent; }
.kl-cm-design-create footer { gap: 8px; flex-wrap: wrap; background: var(--kl-input-bg); }
.kl-cm-design-create footer button { height: 36px; min-height: 36px; padding: 0 12px; border-radius: 8px; font-size: 12px; font-weight: 550; }
.kl-cm-design-create footer .kl-text-button--primary { font-weight: 650; }
.kl-cm-design-create footer button:has(> .kl-icon) { display: flex; align-items: center; gap: 8px; }
.kl-cm-design-create footer button > .kl-icon { width: 16px; height: 16px; }
.kl-cm-step-count { margin-right: auto; color: var(--kl-muted); font-size: 10px; }
.kl-cm-steps { align-items: center; margin: 0 0 14px; padding: 14px 20px; }
.kl-cm-design-create .kl-cm-steps { margin: -16px -16px 16px; }
.kl-cm-steps > li { display: flex; flex: 1; align-items: center; justify-content: center; gap: 6px; font-size: 10px; }
.kl-cm-design-create .kl-cm-steps > li[aria-current] { color: var(--kl-text); font-weight: 400; }
.kl-cm-steps > li > span { display: grid; place-items: center; flex: none; width: 20px; height: 20px; border: 1px solid var(--kl-border); border-radius: 50%; }
.kl-cm-steps > li > span > .kl-icon { width: 11px; height: 11px; }
.kl-cm-steps > li[aria-current] > span { background: var(--kl-accent-soft); border-color: var(--kl-accent-border, var(--kl-accent)); }
.kl-cm-steps > .kl-cm-step-done { color: var(--kl-success); }
.kl-cm-design-create .kl-cm-design-fields { display: block; min-width: 0; }
.kl-cm-design-create .kl-cm-form-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; min-width: 0; }
.kl-cm-design-create .kl-cm-form-grid > .wide { grid-column: 1/-1; }
.kl-cm-design-create .kl-cm-design-fields label { gap: 6px; margin: 0; font-size: 12px; line-height: 1.5; }
.kl-cm-design-create .kl-cm-field-label { font-size: 12px; font-weight: 550; }
.kl-cm-design-create .kl-cm-design-fields :is(input:not([type=checkbox]):not([type=radio]),select,textarea) { padding: 8px 10px; border-radius: 8px; background: var(--kl-input-bg); font-size: 12px; line-height: 1.5; }
.kl-cm-design-create .kl-cm-design-fields :is(input:not([type=checkbox]):not([type=radio]),select) { min-height: 36px; }
.kl-cm-design-create .kl-cm-design-fields textarea { min-height: 88px; line-height: 1.6; }
.kl-cm-design-create .kl-cm-design-fields ::placeholder, .kl-cm-design-create .kl-cm-field-note { color: var(--kl-cm-editor-faint); }
.kl-cm-design-create .kl-cm-field-meta { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; min-height: 15px; }
.kl-cm-design-create .kl-cm-field-meta > .kl-cm-field-note { margin-left: auto; white-space: nowrap; }
.kl-cm-design-create .kl-cm-icon-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.kl-cm-design-create .kl-cm-icon-field > .kl-cm-choices { padding-bottom: 4px; }
.kl-cm-design-create .kl-cm-icon-field > .kl-cm-choices > legend { margin-bottom: 8px; font-size: 12px; font-weight: 550; line-height: 1.5; }
.kl-cm-design-create .kl-cm-choices > button[aria-pressed=true] { outline-width: 1px; }
.kl-cm-design-create .kl-cm-color-options { min-width: 0; color: var(--kl-muted); font-size: 10px; line-height: 1.5; }
.kl-cm-design-create .kl-cm-color-options > summary { cursor: pointer; }
.kl-cm-design-create .kl-cm-color-options > .kl-cm-colors { margin-top: 10px; }
.kl-cm-design-create .kl-cm-access-options { min-width: 0; margin: 0; padding: 0; border: 0; }
.kl-cm-design-create .kl-cm-access-options > legend { margin-bottom: 10px; padding: 0; font-size: 11px; font-weight: 600; }
.kl-cm-design-create .kl-cm-design-fields .kl-cm-access-option { position: relative; display: flex; flex-direction: row; align-items: flex-start; gap: 10px; margin-bottom: 8px; padding: 12px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg); cursor: pointer; }
.kl-cm-design-create .kl-cm-access-option:has(input:checked) { border-color: var(--kl-accent-border); background: var(--kl-accent-soft); }
.kl-cm-design-create .kl-cm-access-option > input { flex: none; width: 16px; height: 16px; margin: 3px 0 0; padding: 0; accent-color: var(--kl-accent); }
.kl-cm-design-create .kl-cm-access-option > .kl-icon { flex: none; width: 18px; height: 18px; }
.kl-cm-design-create .kl-cm-access-copy { min-width: 0; }
.kl-cm-design-create .kl-cm-access-copy strong { display: block; font-size: 12px; font-weight: 550; }
.kl-cm-design-create .kl-cm-access-copy small { display: block; margin-top: 3px; color: var(--kl-muted); font-size: 10px; }
.kl-cm-design-create .kl-cm-design-fields .kl-cm-discover-field { display: flex; flex-direction: row; align-items: center; gap: 10px; padding: 14px 0; border-bottom: 1px solid var(--kl-border); cursor: pointer; }
.kl-cm-design-create .kl-cm-discover-field > input { flex: none; width: 16px; height: 16px; margin: 0; padding: 0; accent-color: var(--kl-accent); }
.kl-cm-design-create .kl-cm-discover-field > span { flex: 1; min-width: 0; }
.kl-cm-design-create .kl-cm-discover-field strong { display: block; font-size: 11px; font-weight: 550; }
.kl-cm-design-create .kl-cm-discover-field small { display: block; margin-top: 3px; color: var(--kl-muted); font-size: 10px; }
.kl-cm-design-create .kl-cm-discover-field + label { margin-top: 16px; }
.kl-cm-design-create .kl-cm-additional-settings { min-width: 0; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--kl-border); color: var(--kl-muted); font-size: 11px; }
.kl-cm-design-create .kl-cm-additional-settings > summary { cursor: pointer; }
.kl-cm-design-create .kl-cm-extra-fields { display: grid; gap: 14px; margin-top: 14px; color: var(--kl-text); }
.kl-cm-design-create .kl-cm-review { margin: 16px 0; padding: 16px; border-radius: 10px; background: var(--kl-surface-2); }
.kl-cm-design-create .kl-cm-review > .kl-cm-card-top { margin-bottom: 12px; }
.kl-cm-design-create .kl-cm-review .kl-cm-emblem, .kl-cm-design-create .kl-cm-choices:not(.kl-cm-colors) > button > .kl-cm-emblem { width: 44px; height: 44px; }
.kl-cm-design-create .kl-cm-review .kl-cm-card-top > div { flex: 1; min-width: 0; }
.kl-cm-design-create .kl-cm-review h3 { font-size: 13px; font-weight: 650; line-height: 1.5; overflow-wrap: anywhere; }
.kl-cm-design-create .kl-cm-review .kl-cm-card-top small { display: inline-flex; align-items: center; gap: 4px; margin: 0; color: var(--kl-muted); font-size: 10px; }
.kl-cm-design-create .kl-cm-review small > .kl-icon { width: 11px; height: 11px; }
.kl-cm-design-create .kl-cm-review .kl-cm-role--gold { flex: none; padding: 2px 6px; border-radius: 6px; color: var(--kl-gold); border-color: color-mix(in srgb,var(--kl-gold) 30%,transparent); background: color-mix(in srgb,var(--kl-gold) 5%,transparent); font-size: 10px; line-height: 1.4; }
.kl-cm-design-create .kl-cm-review > p { margin: 0; color: var(--kl-muted); font-size: 11px; line-height: 1.65; }
.kl-cm-design-create .kl-cm-review .kl-cm-tags { gap: 4px; min-height: 19px; margin: 12px 0 0; }
.kl-cm-design-create .kl-cm-review .kl-cm-tags > span { padding: 3px 6px; border-radius: 6px; background: transparent; font-size: 10px; line-height: 1.4; }
.kl-cm-design-create .kl-cm-review-settings { display: grid; grid-template-columns: auto minmax(0,1fr); gap: 12px; margin: 16px 0; font-size: 11px; }
.kl-cm-design-create .kl-cm-review-note { display: flex; justify-content: space-between; gap: 8px; margin: 12px 0; color: var(--kl-cm-editor-faint); font-size: 10px; line-height: 1.5; }
.kl-cm-design-create .kl-cm-review-settings > dt { color: var(--kl-cm-editor-faint); font-size: 10px; }
.kl-cm-design-create .kl-cm-review-settings > dd { margin: 2px 0 0; text-align: right; overflow-wrap: anywhere; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-cm-design-create .kl-cm-design-body { padding: 12px; }
  .kl-cm-design-create header, .kl-cm-design-create footer { padding: 10px 12px; }
  .kl-cm-design-create header h2 { font-size: 15px; }
  .kl-cm-design-create header > .kl-browse-icon { width: 40px; height: 40px; min-height: 40px; }
  .kl-cm-design-create footer button { height: 40px; min-height: 40px; }
  .kl-cm-design-create .kl-cm-steps { margin: -12px -12px 12px; }
  .kl-cm-design-create .kl-cm-design-fields :is(input:not([type=checkbox]):not([type=radio]),select,textarea) { font-size: 16px; }
}
@container kl-panel (width <= 700px) {
  .kl-cm-design-create .kl-cm-form-grid { grid-template-columns: minmax(0,1fr); }
  .kl-cm-design-create .kl-cm-steps { padding: 12px 16px; }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-cm-design-create .kl-cm-steps { padding-block: 8px; }
}

/* Prototype17 final community overview (5716–5785): a quiet side column. */
.kl-cm-body:has(>.kl-cm-hero){box-sizing:border-box;width:100%;max-width:1088px;margin-inline:auto}
.kl-cm-card-description,.kl-cm-panel p,.kl-cm-panel li{font-size:var(--kl-type-body)}
.kl-cm-card h2{font-size:var(--kl-type-md)}.kl-cm-card>.kl-cm-meta{font-size:var(--kl-type-sm)}
.kl-cm-announcement{border-radius:8px}.kl-cm-announcement header{margin-bottom:6px}.kl-cm-announcement header h2{font-size:var(--kl-type-body);color:var(--kl-gold)}
@container kl-workspace (max-width:650px){.kl-cm-grid{grid-template-columns:minmax(0,1fr)}.kl-cm-sections{gap:16px}.kl-cm-announcement{padding:12px}}
/* Prototype17 list/loading/error states. */
.kl-cm-loading[aria-busy=true]{pointer-events:none}.kl-cm-skeleton-card{box-sizing:border-box;min-height:216px;padding:16px;border:1px solid var(--kl-border);border-radius:10px;background:var(--kl-surface);overflow:hidden}.kl-cm-skeleton{position:relative;overflow:hidden;height:11px;margin:0 0 12px;border-radius:5px;background:var(--kl-surface-2)}.kl-cm-skeleton::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--kl-accent) 7%,transparent),transparent);transform:translateX(-100%);animation:kl-cm-shimmer 1.7s ease-in-out infinite}.kl-cm-skeleton--avatar{width:42px;height:42px;margin-bottom:18px;border-radius:10px}.kl-cm-skeleton--short{width:48%}.kl-cm-skeleton--medium{width:75%}
@keyframes kl-cm-shimmer{to{transform:translateX(100%)}}
@container kl-workspace (width > 560px) and (width <= 900px) and (height <= 400px){.kl-cm-empty{display:grid;grid-template-columns:28px minmax(0,1fr) auto;column-gap:12px;row-gap:3px;padding:12px 16px;text-align:left;align-items:center}.kl-cm-empty>.kl-icon{grid-column:1;grid-row:1/3;width:24px;height:24px}.kl-cm-empty>h2{grid-column:2;grid-row:1;align-self:end}.kl-cm-empty>p{grid-column:2;grid-row:2;max-width:none;margin:0;align-self:start}.kl-cm-empty>.kl-text-button{grid-column:3;grid-row:1/3;margin:0}}
@media(prefers-reduced-motion:reduce){.kl-cm-card{transition:none}}
@media(prefers-reduced-motion:reduce){.kl-cm-skeleton::after{animation:none}}
.kl-cm-catalog-loading .kl-cm-skeleton-card { height: 230px; }
.kl-cm-catalog-loading .kl-cm-skeleton--avatar { border-radius: 50%; }
.kl-cm-catalog-loading .kl-cm-skeleton::after { background: linear-gradient(90deg, transparent, #d6a24b0a, transparent); }

/* Explore directory follows the shared controls and spacing in Prototype 17.3. */
.kl-cm-heading { padding: var(--kl-explore-inset, 20px) var(--kl-explore-inset, 20px) 16px; flex-wrap: wrap; }
.kl-cm-heading h1 { font-size: var(--kl-type-xl); letter-spacing: -.3px; }
.kl-cm-heading-actions, .kl-cm-list-controls, .kl-cm-quick-filters, .kl-cm-card-actions {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0;
}
.kl-cm-heading-actions { margin-left: auto; justify-content: flex-end; }
.kl-communities-page :is(.kl-cm-heading, .kl-cm-search, .kl-cm-hero > .kl-cm-actions) .kl-text-button {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; white-space: nowrap;
  min-height: var(--kl-explore-control, 36px); padding: 0 12px; border-radius: var(--kl-explore-radius, 8px);
  font-size: var(--kl-type-body); font-weight: 550;
}
.kl-communities-page :is(.kl-cm-heading, .kl-cm-search, .kl-cm-hero > .kl-cm-actions) .kl-text-button > .kl-icon {
  flex: none; width: 16px; height: 16px;
}
.kl-communities-page .kl-cm-heading [data-community-action=back] {
  min-height: 32px; padding-inline: 2px; gap: 6px; background: transparent; border-color: transparent;
  color: var(--kl-muted); font-size: var(--kl-type-sm);
}
.kl-communities-page .kl-cm-heading [data-community-action=back] > .kl-icon { width: 14px; height: 14px; }
.kl-communities-page .kl-cm-heading [data-community-action=back]:hover { color: var(--kl-text); }
.kl-cm-heading-actions :is([data-community-action=scope-invites], [data-community-action=invites]) { background: transparent; }
.kl-cm-heading-actions [aria-pressed=true] {
  color: var(--kl-text); border-color: var(--kl-explore-active-border, var(--kl-border-strong));
  background: var(--kl-explore-active-bg, color-mix(in srgb, var(--kl-accent) 12%, transparent));
}
.kl-cm-body:has(> .kl-cm-search) { padding-inline: var(--kl-explore-inset, 20px); gap: 0; }
.kl-communities-page [data-view="directory"] .kl-cm-empty > .kl-text-button { min-height: var(--kl-explore-control, 36px); border-radius: 8px; padding-block: 0; }
.kl-communities-page .kl-cm-directory-error > .kl-text-button { display: inline-flex; align-items: center; gap: 8px; }
.kl-communities-page .kl-cm-directory-error > .kl-text-button > .kl-icon { width: 16px; height: 16px; }
.kl-communities-page [data-view="directory"] .kl-cm-empty > .kl-icon { margin-bottom: 4px; }
@container kl-workspace (width > 560px) and (width <= 900px) and (height <= 400px) {
  .kl-communities-page [data-view="directory"] .kl-cm-empty > .kl-icon { margin-bottom: 0; }
}
.kl-cm-search { margin-bottom: 12px; }
.kl-communities-page .kl-cm-search > .kl-browse-search {
  min-height: var(--kl-explore-control, 36px); min-width: 0; padding-inline: 10px;
  border-radius: var(--kl-explore-radius, 8px); background: var(--kl-input-bg);
}
.kl-communities-page .kl-cm-search > .kl-browse-search > input {
  min-height: 0; height: calc(var(--kl-explore-control, 36px) - 2px); padding-block: 0;
  font-size: var(--kl-type-body);
}
.kl-communities-page .kl-cm-search > .kl-browse-search > .kl-browse-icon {
  width: 24px; height: 24px; min-height: 24px; padding: 0 !important; background: transparent;
}
.kl-communities-page .kl-cm-search > .kl-browse-icon { width: max(42px, var(--kl-explore-control, 36px)); }
.kl-dialog.kl-cm-context-drawer {
  position: fixed; box-sizing: border-box; width: 320px; max-width: 100vw;
  height: var(--kl-dialog-viewport-height, 100dvh); max-height: 100dvh;
  margin: 0 0 0 auto; border: 0; border-left: 1px solid var(--kl-border-strong); border-radius: 0;
  background: var(--kl-surface); box-shadow: -12px 0 40px #0006;
}
.kl-dialog.kl-cm-context-drawer[open] { display: flex; flex-direction: column; }
.kl-cm-context-drawer::backdrop { background: #030303b8; }
.kl-cm-context-header {
  flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 16px; border-bottom: 1px solid var(--kl-border);
}
.kl-cm-context-header h2 {
  margin: 0; font-family: var(--kl-title-font, Georgia, serif); font-size: 16px;
  font-weight: 700; line-height: 1.4; overflow-wrap: anywhere;
}
.kl-cm-context-eyebrow { display: block; color: var(--kl-meta); font-size: 10px; line-height: 1.7; letter-spacing: .25px; }
.kl-cm-context-header > .kl-browse-icon {
  display: grid; place-items: center; flex: none; box-sizing: border-box;
  width: 32px; min-width: 32px; height: 32px; min-height: 32px; padding: 0;
  border: 0; background: none; color: var(--kl-muted);
}
.kl-cm-context-header > .kl-browse-icon:hover { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-cm-context-body {
  min-height: 0; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain;
  padding: 16px; scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent;
}
.kl-cm-context-section-heading {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  min-height: 18px; margin-bottom: 12px;
}
.kl-cm-context-section-heading h3 {
  margin: 0; color: var(--kl-muted); font-size: 10px; font-weight: 600;
  line-height: 1.4; letter-spacing: .7px; text-transform: uppercase;
}
.kl-cm-context-section-heading > .kl-icon { width: 16px; height: 16px; color: var(--kl-muted); }
.kl-cm-context-online { color: var(--kl-success, #79c49a); font-size: 10px; line-height: 1.5; }
.kl-cm-context-section-heading:has(+ .kl-cm-context-event) > .kl-icon { width: 18px; height: 18px; color: var(--kl-text); }
.kl-cm-context-section-heading:has(> .kl-cm-context-online) { min-height: 0; }
.kl-cm-context-event { padding-bottom: 24px; margin-bottom: 24px; border-bottom: 1px solid var(--kl-border); }
.kl-cm-context-event p, .kl-cm-context-body ul { margin: 0; color: var(--kl-muted); font-size: 11px; line-height: 1.7; }
.kl-cm-context-event p, .kl-cm-context-event h4 { overflow-wrap: anywhere; }
.kl-cm-context-event > .kl-cm-context-eyebrow { color: var(--kl-text-faint, rgba(245,238,227,.58)); }
.kl-cm-context-event-row { display: flex; align-items: center; gap: 10px; margin: 12px 0; }
.kl-cm-context-event-copy { min-width: 0; }
.kl-cm-context-event-row h4 { margin: 8px 0 4px; font-size: 12px; font-weight: 650; line-height: 1.5; }
.kl-cm-context-date {
  display: flex; flex-direction: column; align-items: center; flex: none; box-sizing: border-box;
  width: 40px; padding: 6px 4px; border: 1px solid var(--kl-border); border-radius: 7px;
  background: var(--kl-surface-2); color: var(--kl-muted); font-size: 10px; line-height: 1.5; letter-spacing: .2px;
}
.kl-cm-context-date > strong { font-size: 18px; font-weight: 550; line-height: 1.2; }
.kl-cm-context-date > span { font-size: 8px; text-transform: uppercase; }
.kl-cm-context-event > .kl-text-button {
  display: flex; align-items: center; justify-content: center; gap: 8px; box-sizing: border-box;
  width: 100%; height: var(--kl-explore-control, 36px); min-height: var(--kl-explore-control, 36px);
  margin-top: 16px; padding: 0 12px; border-radius: var(--kl-explore-radius, 8px);
  background: transparent; font-size: 12px; font-weight: 550; line-height: 1.5;
}
.kl-cm-context-event > .kl-text-button:hover { background: var(--kl-surface-hover); }
.kl-cm-context-event > .kl-text-button > .kl-icon { flex: none; width: 16px; height: 16px; }
.kl-cm-context-friends { display: flex; align-items: center; padding-block: 4px; }
.kl-cm-context-friends:empty { display: none; }
.kl-cm-context-avatar {
  position: relative; display: grid; place-items: center; box-sizing: border-box;
  width: 29px; height: 29px; margin-right: -6px; border: 2px solid var(--kl-surface);
  border-radius: 50%; background: var(--kl-surface-2); color: var(--kl-gold); font-size: 10px;
}
.kl-cm-context-avatar > i {
  position: absolute; inset: auto -1px -1px auto; width: 8px; height: 8px;
  border: 1px solid var(--kl-surface); border-radius: 50%; background: var(--kl-success, #79c49a);
}
.kl-cm-context-avatar > :not(i) { width: 100%; height: 100%; border-radius: inherit; object-fit: cover; overflow: hidden; }
.kl-cm-context-body .kl-cm-context-link {
  display: inline-flex; align-items: center; gap: 4px; padding: 0; border: 0;
  min-height: 0; background: none; color: var(--kl-muted); font-size: 11px; font-weight: 400; line-height: 1.5;
}
.kl-cm-context-body .kl-cm-context-link:hover { background: none; color: var(--kl-text); text-decoration: underline; }
.kl-cm-context-body .kl-cm-context-link > .kl-icon { width: 12px; height: 12px; }
.kl-cm-context-body > .kl-cm-context-link { margin-top: 24px; }
.kl-cm-context-body > hr { margin: 24px 8px; height: 1px; border: 0; background: var(--kl-border); }
.kl-cm-context-body :is(ul,ol) { margin: 0; padding-left: 16px; color: var(--kl-muted); font-size: 11px; line-height: 1.7; }
.kl-cm-context-body li { padding: 3px 0 3px 2px; }
.kl-cm-context-body > :is(.kl-cm-context-members-section, .kl-cm-context-rules-section) { font-size: var(--kl-type-body, 12px); line-height: 1.5; }
.kl-cm-context-members-section + hr { margin-block: 16px; }
.kl-cm-context-members-section > .kl-cm-context-friends:empty { display: flex; }
.kl-cm-context-members-section .kl-cm-context-avatar { height: 29px; border-radius: 50%; font-weight: 600; line-height: 1.5; }
.kl-cm-context-members-section .kl-cm-context-avatar:not(:has(> :not(i))) {
  color: light-dark(var(--kl-muted), #dac7a8); background: light-dark(var(--kl-surface-2), #332c25);
}
.kl-cm-context-members-section .kl-cm-context-avatar > i { bottom: 0; width: 7px; height: 7px; border-width: 2px; }
.kl-cm-context-members-section .kl-cm-context-avatar.kl-cm-context-avatar-more {
  color: var(--kl-muted); background: light-dark(var(--kl-surface-2), #272522); font-weight: 400;
}
.kl-cm-context-body :is(.kl-cm-context-members-section, .kl-cm-context-rules-section) > .kl-cm-context-link {
  gap: 8px; border-radius: var(--kl-explore-radius, 8px); color: var(--kl-text);
}
.kl-cm-context-members-section > .kl-cm-context-link > .kl-icon { width: 16px; height: 16px; stroke-width: 1.65; }
.kl-cm-context-rules-section > .kl-cm-context-section-heading > .kl-icon { width: 18px; height: 18px; color: var(--kl-text); stroke-width: 1.65; }
.kl-cm-context-rules-section > ul { list-style: disc; }
.kl-cm-context-about h3 { margin: 0; font-size: 15px; line-height: 1.4; }
.kl-cm-context-body .kl-cm-context-empty, .kl-cm-context-about p { margin: 0; color: var(--kl-muted); font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; }
.kl-cm-context-about > :not(:first-child) { margin-top: 8px; }
.kl-cm-context-about:has(.kl-cm-context-membership) > :not(:first-child) { margin-top: 12px; }
.kl-cm-context-about:has(.kl-cm-context-membership) > p {
  color: var(--kl-text-faint, rgba(245,238,227,.58)); font-size: 10px; line-height: 1.5;
}
.kl-communities-page .kl-cm-context-about .kl-cm-context-membership {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: var(--kl-explore-control, 36px); padding: 0 12px; border-radius: var(--kl-explore-radius, 8px);
  font-size: var(--kl-type-body, 12px); font-weight: 550; line-height: 1.5;
}
.kl-communities-page .kl-cm-context-about .kl-cm-context-membership:not(.kl-cm-membership-trigger) { background: var(--kl-surface-2); }
.kl-communities-page .kl-cm-context-about .kl-cm-context-membership:hover:not(:disabled) { background: var(--kl-surface-hover); }
.kl-cm-context-membership > .kl-icon { flex: none; width: 16px; height: 16px; }
.kl-cm-context-invite-note { flex-basis: 100%; }
.kl-cm-context-invite-note:empty { position: absolute; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-cm-context-header { padding: 10px 12px; }
  .kl-cm-context-header h2 { font-size: 15px; }
  .kl-cm-context-header > .kl-browse-icon { width: 40px; min-width: 40px; height: 40px; min-height: 40px; }
  .kl-cm-context-body { padding: 12px; }
}
@media (pointer: coarse) {
  .kl-cm-context-header > .kl-browse-icon { min-width: 44px; min-height: 44px; }
  .kl-cm-context-event > .kl-text-button,
  .kl-cm-context-body .kl-cm-context-link { min-height: 44px; }
  .kl-communities-page .kl-cm-search > [data-community-action=context] { min-width: 44px; }
}
.kl-cm-list-controls { justify-content: space-between; margin-bottom: 8px; }
.kl-cm-tabs:not(.kl-cm-sections) { padding: 0; gap: 4px; border: 0; }
.kl-communities-page :is(.kl-cm-tabs:not(.kl-cm-sections), .kl-cm-quick-filters) .kl-text-button {
  display: inline-flex; align-items: center; justify-content: center; flex: none; gap: 5px;
  min-height: var(--kl-explore-small, 32px); padding: 0 9px; border: 1px solid transparent;
  border-radius: var(--kl-explore-radius, 8px); background: transparent; color: var(--kl-muted);
  font-size: var(--kl-type-sm); font-weight: 400; white-space: nowrap;
}
.kl-communities-page :is(.kl-cm-tabs:not(.kl-cm-sections), .kl-cm-quick-filters) .kl-text-button > .kl-icon {
  flex: none; width: 11px; height: 11px;
}
.kl-cm-sort { margin-left: auto; display: flex; align-items: center; gap: 6px; color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-cm-sort select { min-height: var(--kl-explore-control, 36px); padding: 3px 5px; border-color: transparent; background: transparent; }
.kl-cm-quick-filters { gap: 6px; margin-bottom: 12px; }
.kl-communities-page .kl-cm-quick-filters .kl-text-button { border-color: var(--kl-border); background: var(--kl-input-bg); }
.kl-communities-page :is(.kl-cm-tabs:not(.kl-cm-sections), .kl-cm-quick-filters) .kl-text-button[aria-pressed=true] {
  background: var(--kl-explore-active-bg, color-mix(in srgb, var(--kl-accent) 12%, transparent));
  border-color: var(--kl-explore-active-border, var(--kl-border-strong)); color: var(--kl-text);
}
.kl-communities-page :is(.kl-cm-tabs:not(.kl-cm-sections), .kl-cm-quick-filters) .kl-text-button:hover:not(:disabled):not([aria-pressed=true]) {
  background: var(--kl-surface-hover); color: var(--kl-text);
}
.kl-cm-active-filters { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.kl-communities-page .kl-cm-active-filters .kl-text-button {
  display: inline-flex; align-items: center; gap: 6px; min-height: 28px; max-width: 100%; padding: 3px 8px;
  min-width: 0; border-radius: 6px; background: var(--kl-surface-2); color: var(--kl-text);
  font-size: var(--kl-type-sm); line-height: 1.5; font-weight: 400;
}
.kl-cm-active-filters .kl-text-button > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-cm-active-filters .kl-icon { width: 12px; height: 12px; flex: none; color: var(--kl-muted); }
.kl-communities-page .kl-cm-active-filters [data-community-action=clear-filters] {
  min-height: 0; height: auto; padding: 5px 0; border: 0; border-radius: 8px; background: transparent;
  font-size: 11px; line-height: 1.5; font-weight: 400;
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-communities-page .kl-cm-active-filters [data-community-action^=remove-filter] { min-height: 32px; }
}
.kl-cm-body > .kl-browse-summary { margin: 0 0 12px; font-size: var(--kl-type-sm); line-height: 1.5; }
.kl-cm-card, .kl-cm-skeleton-card { border-radius: var(--kl-explore-card-radius, 10px); }
.kl-cm-card { line-height: 1.5; }
.kl-cm-card .kl-icon { stroke-width: 1.65; }
.kl-cm-card-top > .kl-cm-emblem { border-color: color-mix(in srgb, var(--cm-ink) 14.5%, transparent); }
.kl-cm-card--archived .kl-cm-emblem { filter: saturate(.65); }
.kl-cm-card-top { min-width: 0; }
.kl-cm-card-name { flex: 1; }
.kl-communities-page .kl-cm-card-name h2 { font-size: calc(var(--kl-type-body) + 1px); font-weight: 650; line-height: 1.5; }
.kl-communities-page .kl-cm-card-name h2 button {
  display: block; max-width: 100%; min-height: 0; font: inherit;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.kl-communities-page .kl-cm-card-top .kl-cm-more {
  align-self: flex-start; width: 22px; height: 24px; min-height: 24px; margin: -4px -5px 0 0;
  padding: 0 !important; border-color: transparent; border-radius: var(--kl-explore-radius, 8px);
  background: transparent; color: var(--kl-muted);
}
.kl-communities-page .kl-cm-more:is(:hover,[aria-expanded=true]):not(:disabled) { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-cm-visibility, .kl-cm-access, .kl-cm-card-facts, .kl-cm-card-facts > span, .kl-cm-event-hint, .kl-cm-membership {
  display: inline-flex; align-items: center; gap: 4px; min-width: 0; color: var(--kl-muted);
}
.kl-cm-visibility, .kl-cm-event-hint { font-size: var(--kl-type-xs); }
.kl-cm-membership { font-size: var(--kl-type-sm); }
.kl-cm-membership--joined > .kl-icon { color: var(--kl-success, #78b88d); }
.kl-cm-staff { display: inline-flex; color: var(--kl-gold); }
:is(.kl-cm-visibility, .kl-cm-card-facts, .kl-cm-event-hint, .kl-cm-membership) .kl-icon { flex: none; width: 12px; height: 12px; }
.kl-cm-card-name .kl-cm-visibility .kl-icon { width: 11px; height: 11px; }
.kl-cm-card-name .kl-cm-staff { margin-left: 2px; }
.kl-cm-card .kl-cm-event-hint { gap: 5px; }
.kl-cm-card-facts { font-size: var(--kl-type-sm); flex-wrap: wrap; gap: 4px 10px; margin-top: auto; }
.kl-cm-card > .kl-cm-card-facts { gap: 10px; }
.kl-cm-card-online::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: var(--kl-success, #78b88d); }
.kl-cm-card-online--quiet::before { background: #928a80; }
.kl-cm-card > .kl-cm-tags { min-height: 19px; gap: 4px; }
.kl-cm-card > .kl-cm-tags > span {
  line-height: 1.4; padding: 3px 6px; border-radius: 6px; background: transparent;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.kl-cm-card > .kl-cm-tags:empty { display: block; }
.kl-cm-card-footer { flex-wrap: wrap; margin-top: 0; }
.kl-cm-card-actions { margin-left: auto; justify-content: flex-end; }
.kl-communities-page .kl-cm-card-actions .kl-text-button {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; white-space: nowrap;
  height: 32px; min-height: 32px; padding: 0 10px; border-radius: var(--kl-explore-radius, 8px);
  font-size: var(--kl-type-sm); font-weight: 550; line-height: 1.5;
}
.kl-communities-page .kl-cm-card-actions .kl-text-button--primary { box-shadow: none; border-color: var(--kl-explore-active-border, var(--kl-border)); }
.kl-communities-page .kl-cm-card-actions .kl-cm-card-details,
.kl-communities-page .kl-cm-membership-trigger { background: transparent; }
.kl-communities-page .kl-cm-membership-trigger--joined { color: var(--kl-muted); }
.kl-communities-page .kl-cm-detail-membership { line-height: 1.5; }
.kl-communities-page .kl-cm-membership-trigger:hover:not(:disabled),
.kl-communities-page .kl-cm-membership-trigger[aria-expanded=true] { background: var(--kl-surface-hover); }
.kl-cm-membership-menu > .kl-shell-menu-heading { color: var(--kl-muted); line-height: 1.5; }
.kl-cm-membership-menu > .kl-shell-menu-heading > strong { font-weight: 400; }
.kl-cm-card-actions > .kl-text-button > .kl-icon { width: 16px; height: 16px; flex: none; }
@container kl-panel (width <= 900px) {
  .kl-cm-card > .kl-cm-card-facts { gap: 7px; }
  .kl-cm-card-top > .kl-cm-emblem { width: 38px; height: 38px; border-radius: 10px; }
  .kl-communities-page .kl-cm-card-name h2 { font-size: var(--kl-type-body); }
}
.kl-communities-page:has(> [data-view]:not([data-view=directory], [data-view=channels]) > .kl-cm-body > .kl-cm-hero) { scrollbar-gutter: auto; }
.kl-cm-identity-title { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 8px; min-width: 0; }
.kl-cm-identity-title > h1 { max-width: 100%; margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-cm-identity-title > .kl-cm-role { display: inline-flex; align-items: center; gap: 4px; margin-bottom: 6px; color: var(--kl-muted); padding: 2px 6px; border-radius: 6px; line-height: 1.4; white-space: nowrap; }
.kl-cm-identity-title > .kl-cm-role--gold { color: var(--kl-gold); border-color: color-mix(in srgb, var(--kl-gold) 30%, transparent); background: color-mix(in srgb, var(--kl-gold) 5%, transparent); }
.kl-cm-identity-title > .kl-cm-role .kl-icon { width: 11px; height: 11px; }
.kl-cm-identity .kl-cm-card-facts { display: flex; margin: 0; gap: 10px; font-size: 11px; line-height: 1.5; }
.kl-cm-hero > .kl-cm-actions { margin-top: 12px; }
.kl-cm-joined {
  display: inline-flex; align-items: center; gap: 8px; padding: 0 12px;
  min-height: var(--kl-explore-control, 36px); border: 1px solid var(--kl-border);
  border-radius: var(--kl-explore-radius, 8px); color: var(--kl-muted); font-size: var(--kl-type-body); font-weight: 550;
}
.kl-cm-joined > .kl-icon { width: 16px; height: 16px; }
.kl-communities-page .kl-cm-hero > .kl-cm-actions > [data-community-action=manage] { background: transparent; }
.kl-communities-page .kl-cm-hero > .kl-cm-actions > :is(.kl-cm-more, [data-community-action=detail-context]) {
  flex: none; width: var(--kl-cm-hero-icon-width, 32px);
  height: var(--kl-cm-hero-icon-height, 32px); min-height: var(--kl-cm-hero-icon-height, 32px);
  padding: 0 !important; border: 0; background: transparent; color: var(--kl-muted);
}
.kl-communities-page .kl-cm-hero > .kl-cm-actions > :is(.kl-cm-more, [data-community-action=detail-context]):hover:not(:disabled),
.kl-communities-page .kl-cm-hero > .kl-cm-actions > .kl-cm-more[aria-expanded=true],
.kl-communities-page .kl-cm-hero > .kl-cm-actions > [data-community-action=manage]:hover:not(:disabled) {
  background: var(--kl-surface-hover); color: var(--kl-text);
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-cm-hero { --kl-cm-hero-icon-width: 40px; --kl-cm-hero-icon-height: 40px; }
  .kl-cm-identity-title > h1 { font-size: calc(var(--kl-type-xl) - 1px); }
  .kl-cm-identity .kl-cm-card-facts { gap: 8px; font-size: 10px; }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-cm-hero { --kl-cm-hero-icon-height: 36px; }
  .kl-cm-identity-title { gap: 6px; }
  .kl-cm-identity-title > .kl-cm-role { margin-bottom: 2px; }
}
@media (pointer: coarse) {
  .kl-cm-hero { --kl-cm-hero-icon-width: 44px; --kl-cm-hero-icon-height: 44px; }
}
.kl-cm-tab-count { color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-cm-overview-content { display: grid; gap: 16px; min-width: 0; }
.kl-cm-overview-content :is(.kl-cm-overview-main, .kl-cm-overview-side) > .kl-cm-panel {
  padding: 0; border: 0; border-radius: 0; background: transparent;
}
.kl-cm-overview-content .kl-cm-panel > header { gap: 12px; margin-bottom: 10px; }
.kl-cm-overview-content .kl-cm-announcement > header { margin-bottom: 6px; }
.kl-cm-overview-content .kl-cm-announcement-copy { line-height: 1.65; }
.kl-cm-pulse {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; padding-bottom: 16px;
  border-bottom: 1px solid var(--kl-border); color: var(--kl-muted); font-size: var(--kl-type-body);
}
.kl-cm-pulse-online { display: inline-flex; align-items: center; gap: 4px; }
.kl-cm-pulse strong { color: var(--kl-text); font-weight: 600; }
.kl-cm-pulse-events { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; font-size: var(--kl-type-sm); }
.kl-cm-pulse-events > .kl-icon { width: 14px; height: 14px; }
.kl-cm-overview-side { display: grid; gap: 24px; min-width: 0; padding-left: 20px; border-left: 1px solid var(--kl-border); }
.kl-cm-overview-grid:not(:has(.kl-cm-overview-side)) { grid-template-columns: minmax(0, 1fr); }
.kl-communities-page .kl-text-button.kl-cm-subtle {
  border: 0; background: transparent; padding: 0; min-height: 0;
  font-size: var(--kl-type-sm); font-weight: 400; text-align: left; color: var(--kl-muted);
}
.kl-communities-page .kl-text-button.kl-cm-subtle:hover { color: var(--kl-text); text-decoration: underline; }
.kl-communities-page .kl-cm-pulse > .kl-cm-subtle { display: inline-flex; align-items: center; min-height: 30px; }
.kl-cm-event-preview > header:has(.kl-cm-event-preview-actions) { flex-wrap: wrap; }
.kl-cm-event-preview-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; margin-left: auto; }
.kl-communities-page .kl-text-button:is(.kl-cm-create-event, .kl-cm-create-space) {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: var(--kl-explore-control, 36px); min-height: var(--kl-explore-small, 32px);
  padding: 0 12px; border-radius: var(--kl-explore-radius, 8px);
  background: transparent; font-size: 12px; font-weight: 550; white-space: nowrap;
}
.kl-communities-page .kl-cm-create-event > .kl-icon { width: 16px; height: 16px; }
.kl-communities-page :is(.kl-cm-create-event, .kl-cm-create-space):hover:not(:disabled):not([aria-disabled=true]) {
  background: var(--kl-surface-hover); border-color: var(--kl-border-strong);
}
:is(.kl-cm-create-event, .kl-cm-create-space)[aria-disabled=true] { opacity: .6; cursor: default; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-communities-page .kl-text-button:is(.kl-cm-create-event, .kl-cm-create-space) { height: 40px; min-height: 40px; }
}
@media (pointer: coarse) {
  .kl-communities-page .kl-text-button:is(.kl-cm-create-event, .kl-cm-create-space) { height: 44px; min-height: 44px; }
}
.kl-cm-event-card { grid-template-columns: 44px minmax(0, 1fr); }
.kl-cm-event-card + .kl-cm-event-card { margin-top: 12px; }
.kl-cm-event-card > h3 {
  display: grid; grid-column: 2; grid-row: 1; min-width: 0;
  margin: 0 0 3px; font-size: var(--kl-type-md); line-height: 1.4;
}
.kl-cm-event-card > h3 > span { overflow-wrap: anywhere; }
.kl-cm-event-card > .kl-ev-actions { justify-content: flex-end; }
.kl-communities-page .kl-cm-event-card > .kl-ev-actions > .kl-text-button {
  display: inline-flex; align-items: center; background: transparent;
}
.kl-cm-event-card > .kl-ev-actions > .kl-text-button > .kl-icon { width: 16px; height: 16px; }
.kl-communities-page .kl-cm-preview-row > div > .kl-text-button {
  min-height: 0; padding: 0; text-align: left;
}
.kl-cm-space-icon {
  display: inline-flex; align-items: center; justify-content: center; flex: none; border: 1px solid var(--kl-border);
  border-radius: var(--kl-explore-radius, 8px); background: var(--kl-surface-2); color: var(--kl-muted);
  width: 32px; height: 32px;
}
.kl-cm-space-icon > .kl-icon { width: 16px; height: 16px; }
.kl-cm-overview-side .kl-cm-preview-row { padding-top: 8px; border: 0; }
.kl-cm-overview-side .kl-cm-preview-row p { margin-top: 5px; }
.kl-cm-preview-empty { padding: 20px 8px; text-align: center; color: var(--kl-muted); font-size: 11px; line-height: 1.5; }
.kl-cm-preview-empty > h3 { margin: 0 0 6px; font-size: 12px; font-weight: 500; }
.kl-cm-panel .kl-cm-preview-empty > p { margin: 0; font-size: 11px; line-height: 1.5; }
.kl-communities-page .kl-cm-panel > .kl-cm-overview-channel {
  display: flex; align-items: center; width: 100%; gap: 10px; min-height: 44px; margin: 0;
  padding: 8px 0; border: 0; border-bottom: 1px solid var(--kl-border); border-radius: 0;
  background: transparent; text-align: left;
}
.kl-communities-page .kl-cm-panel > .kl-cm-overview-channel:last-child { border-bottom: 0; }
.kl-communities-page .kl-cm-panel > .kl-cm-overview-channel:hover { background: var(--kl-surface-hover); }
.kl-cm-overview-channel > .kl-icon { width: 16px; height: 16px; flex: none; color: var(--kl-muted); }
.kl-cm-overview-channel > span:first-of-type { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.kl-cm-overview-channel small { display: block; color: var(--kl-muted); font-size: var(--kl-type-sm); font-weight: 400; }
.kl-cm-about-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 12px; }
.kl-cm-about-grid > :is(section:first-child, .kl-cm-about-actions) { grid-column: 1 / -1; }
.kl-cm-about-grid .kl-cm-panel { padding: 16px; }
.kl-cm-about-grid .kl-cm-panel > h2 { margin: 0; font-size: 15px; line-height: 1.4; font-weight: 650; letter-spacing: -.2px; }
.kl-cm-about-grid .kl-cm-panel > p { margin: 12px 0 0; color: var(--kl-muted); font-size: 12px; line-height: 1.75; overflow-wrap: anywhere; }
.kl-cm-about-grid .kl-cm-panel > ol { margin: 12px 0 0; padding-left: 16px; color: var(--kl-muted); }
.kl-cm-about-grid .kl-cm-panel > ol > li { padding: 3px 0 3px 2px; font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; }
.kl-cm-about-grid .kl-cm-facts { gap: 12px; margin: 12px 0 0; font-size: 11px; line-height: 1.5; }
.kl-cm-about-grid .kl-cm-facts > dt { color: var(--kl-text-faint, #7e7468); }
.kl-cm-about-grid .kl-cm-facts > dd { color: var(--kl-muted); text-align: right; }
.kl-cm-about-grid .kl-cm-tags { margin-top: 16px; }
.kl-cm-about-grid .kl-cm-tags > span { line-height: 1.4; padding-inline: 6px; border-radius: 6px; }
.kl-cm-about-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.kl-communities-page .kl-cm-about-actions > .kl-text-button {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: var(--kl-explore-control, 36px); padding: 0 12px;
  border-radius: var(--kl-explore-radius, 8px); background: transparent;
  font-size: var(--kl-type-body, 12px); line-height: 1.5; font-weight: 550;
}
.kl-cm-about-actions > .kl-text-button > .kl-icon { flex: none; width: 16px; height: 16px; }
.kl-communities-page .kl-cm-about-actions > .kl-text-button:hover:not(:disabled, [aria-disabled="true"]) { background: var(--kl-surface-hover); }
.kl-communities-page .kl-cm-about-actions > .kl-text-button:is(:disabled, [aria-disabled="true"]) {
  border-color: var(--kl-border); background: transparent; opacity: .46; cursor: wait; transform: none;
}
.kl-cm-access-state { padding: 20px 8px; color: var(--kl-muted); text-align: center; font-size: 11px; line-height: 1.5; }
.kl-cm-access-state > h2 { margin: 0 0 6px; font-size: 12px; font-weight: 500; }
.kl-cm-access-state > p { margin: 0; }
.kl-communities-page:has(> :is([data-view="about"], [data-view="directory"], [data-view="active"])) { scrollbar-gutter: auto; }
.kl-communities-page .kl-cm-member-search { flex-wrap: nowrap; margin-bottom: 12px; }
.kl-communities-page .kl-cm-member-search > .kl-browse-search { flex: 1 1 0; min-width: 0; padding-inline: 10px; background: var(--kl-input-bg); border-radius: 8px; }
.kl-communities-page .kl-cm-member-search > .kl-browse-search > input { height: calc(var(--kl-explore-control, 36px) - 2px); min-height: 0; padding-block: 0; font-size: 12px; }
.kl-communities-page .kl-cm-member-search > .kl-browse-search > .kl-browse-icon { width: 24px; height: 24px; min-height: 24px; padding: 0 !important; }
.kl-communities-page .kl-cm-member-search > select { min-height: var(--kl-explore-control, 36px); padding: 8px 10px; font-size: 12px; line-height: 1.5; background: var(--kl-input-bg); }
.kl-communities-page .kl-cm-member-search > .kl-text-button { min-height: var(--kl-explore-control, 36px); padding: 0 10px; border-radius: 8px; white-space: nowrap; }
.kl-cm-member-summary { margin: 0 0 12px; color: var(--kl-muted); font-size: 11px; }
.kl-communities-page .kl-cm-members--directory { padding: 16px; border-radius: 10px; background: var(--kl-surface); }
.kl-communities-page .kl-cm-members--directory > article { flex-wrap: nowrap; gap: 9px; padding: 10px 0 !important; }
.kl-cm-members--directory .kl-cm-member-identity { gap: 9px; font-size: 12px; line-height: 1.5; }
.kl-cm-members--directory .kl-cm-member-avatar { width: 30px; height: 30px; border: 1px solid var(--kl-border); border-radius: 50%; background: #332c25; color: #dac7a8; font-size: 10px; font-weight: 600; }
.kl-cm-member-avatar > .kl-social-avatar-media { position:absolute;inset:0;display:block;overflow:hidden;border-radius:inherit; }
.kl-cm-member-avatar > .kl-social-avatar-media > img { display:block;width:100%;height:100%;max-height:none;object-fit:cover; }
.kl-cm-member-avatar > .kl-social-avatar-media:not([data-state="ready"]) { visibility:hidden; }
.kl-cm-member-avatar > .kl-cm-presence--unavailable { display:block; }
.kl-cm-members--directory .kl-cm-presence { width: 7px; height: 7px; right: -1px; bottom: 0; }
.kl-communities-page .kl-cm-members--directory .kl-cm-member-name { display: block; min-height: 0; font-size: 11px; line-height: 1.5; font-weight: 550; }
.kl-cm-members--directory .kl-cm-member-name:hover:is(button) { text-decoration: underline; }
.kl-cm-members--directory .kl-cm-member-identity small { display: inline; margin: 0; color: var(--kl-muted); font-size: 10px; }
.kl-cm-members--directory .kl-cm-role { flex: none; padding: 2px 6px; color: var(--kl-muted); border-radius: 4px; font-size: 10px; line-height: 1.5; }
.kl-cm-members--directory .kl-cm-role--gold { color: var(--kl-gold); border-color: color-mix(in srgb, var(--kl-gold) 30%, transparent); background: color-mix(in srgb, var(--kl-gold) 5%, transparent); }
.kl-cm-members--directory .kl-cm-member-options-trigger {
  display: grid; place-items: center; flex: none; width: 24px; height: 28px; min-height: 28px;
  padding: 0 !important; border: 0; border-radius: 7px; background: transparent; color: var(--kl-muted);
}
.kl-cm-members--directory .kl-cm-member-options-trigger:is(:hover,[aria-expanded=true]),
.kl-cm-member-menu > summary:hover { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-cm-members--directory .kl-cm-member-options-trigger:focus-visible,
.kl-cm-member-menu > summary:focus-visible { outline: 2px solid var(--kl-accent); }
.kl-cm-member-options-trigger > .kl-icon, .kl-cm-member-menu > summary > .kl-icon { width: 16px; height: 16px; }
.kl-cm-member-options > .kl-shell-menu-heading { color: var(--kl-muted); }
.kl-cm-member-options > .kl-shell-menu-heading > strong { font-weight: 400; }
.kl-cm-member-empty { padding: 20px 8px; color: var(--kl-muted); text-align: center; }
.kl-cm-member-empty > h3 { margin: 0 0 6px; color: var(--kl-text); font-size: 12px; line-height: 1.5; font-weight: 500; }
.kl-cm-member-empty > p { margin: 0; font-size: 12px; line-height: 1.75; }
.kl-communities-page .kl-cm-sections > .kl-text-button { min-height: 38px; padding: 0 2px 10px; }
.kl-communities-page > div:not([data-view=directory], [data-view=channels]) > .kl-cm-heading { padding-bottom: 14px; }
.kl-communities-page > div:not([data-view=directory], [data-view=channels]) > .kl-cm-body {
  max-width: calc(1040px + 2 * var(--kl-explore-inset, 20px)); padding-inline: var(--kl-explore-inset, 20px); gap: 0;
}
.kl-communities-page > div:not([data-view=directory], [data-view=channels]) > .kl-cm-body > :is(.kl-cm-sections, .kl-cm-management, .kl-cm-status, .kl-cm-confirm) {
  margin-bottom: 16px;
}
@container kl-panel (width <= 1100px) {
  .kl-cm-overview-grid { grid-template-columns: minmax(0, 1fr); gap: 20px; }
  .kl-cm-overview-side { border-left: 0; border-top: 1px solid var(--kl-border); padding: 16px 0 0; }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-communities-page > div:not([data-view=directory], [data-view=channels]) > .kl-cm-heading { padding-bottom: 8px; }
  .kl-communities-page .kl-cm-sections > .kl-text-button { height: 40px; min-height: 40px; font-size: 12px; line-height: 1.5; }
  .kl-cm-members--directory .kl-cm-member-options-trigger { width: 40px; height: 40px; min-height: 40px; }
  .kl-communities-page > div:not([data-view=directory], [data-view=channels]) > .kl-cm-body > .kl-cm-sections { margin-bottom: 12px; }
  .kl-cm-about-grid { grid-template-columns: minmax(0, 1fr); }
  .kl-cm-overview-content > .kl-cm-announcement { padding: 12px; }
  .kl-cm-pulse { padding-bottom: 12px; }
  .kl-cm-pulse-events { flex-basis: 100%; margin-left: 0; }
  .kl-communities-page .kl-cm-overview-content .kl-cm-panel > header > .kl-cm-subtle {
    display: inline-flex; align-items: center; min-height: 36px;
  }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-communities-page .kl-cm-sections > .kl-text-button { height: 34px; min-height: 34px; padding-bottom: 7px; }
  .kl-communities-page > div:not([data-view=directory], [data-view=channels]) > .kl-cm-heading { padding-bottom: 4px; }
}
@container kl-panel (width <= 700px) {
  .kl-communities-page .kl-cm-members--directory { padding: 14px; }
  .kl-cm-about-grid .kl-cm-panel { padding: 14px; }
}
@container kl-workspace (max-width: 650px) {
  .kl-cm-heading { padding: 12px 12px 10px; }
  .kl-cm-body:has(> .kl-cm-search) { padding-inline: 12px; }
  .kl-communities-page .kl-cm-heading-actions .kl-text-button { padding-inline: 7px; font-size: var(--kl-type-sm); }
  .kl-communities-page .kl-cm-heading-actions .kl-browse-icon { width: 34px; }
  .kl-cm-tabs:not(.kl-cm-sections) {
    flex-basis: 100%; max-width: 100%; flex-wrap: nowrap; overflow-x: auto; overscroll-behavior-inline: contain;
    padding: 2px 1px; scrollbar-width: none;
  }
  .kl-communities-page .kl-cm-tabs:not(.kl-cm-sections) .kl-text-button { flex: none; min-height: 36px; padding-inline: 8px; }
  .kl-cm-quick-filters { display: none; }
  .kl-communities-page .kl-cm-member-search { flex-wrap: wrap; }
  .kl-communities-page .kl-cm-member-search > .kl-browse-search { flex-basis: min(100%, 120px); }
  .kl-communities-page .kl-cm-member-search > .kl-text-button { font-size: 11px; }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-cm-card-top > .kl-cm-emblem { width: 44px; height: 44px; }
  .kl-communities-page .kl-cm-card-name h2 { font-size: calc(var(--kl-type-body) + 1px); }
  .kl-communities-page .kl-cm-card-top .kl-cm-more { width: 40px; height: 40px; min-height: 40px; margin: -5px -8px 0 0; }
  .kl-cm-card > .kl-cm-tags { margin-bottom: 2px; }
  .kl-cm-card-actions { gap: 6px; }
  .kl-communities-page .kl-cm-card-actions .kl-text-button { height: 40px; min-height: 40px; }
  .kl-communities-page [data-view=directory] > .kl-cm-heading { padding-bottom: 12px; }
  .kl-communities-page [data-view=directory] .kl-cm-heading-actions { gap: 6px; }
  .kl-communities-page [data-view=directory] .kl-cm-heading-actions .kl-text-button { padding-inline: 9px; font-size: var(--kl-type-sm); }
  .kl-communities-page [data-view=directory] .kl-cm-list-controls { gap: 4px; }
  .kl-communities-page [data-view=directory] .kl-cm-list-controls > .kl-cm-tabs {
    flex-wrap: nowrap; max-width: 100%; gap: 3px; padding: 2px 1px;
    overflow-x: auto; overscroll-behavior-inline: contain; scrollbar-width: none;
  }
  .kl-communities-page [data-view=directory] .kl-cm-quick-filters { display: none; }
  .kl-communities-page [data-view=directory] .kl-cm-grid { grid-template-columns: minmax(0, 1fr); }
  .kl-communities-page [data-view=directory] .kl-cm-body:has(> .kl-cm-grid) > .kl-browse-summary:not(.kl-cm-catalog-summary) { height: 0; overflow: hidden; }
}
@container kl-panel (width <= 480px) {
  .kl-communities-page [data-view=directory] > .kl-cm-heading:has([data-community-action=create]) { gap: 12px; }
  .kl-communities-page [data-view=directory] > .kl-cm-heading:has([data-community-action=create]) > h1 { flex-basis: 100%; }
  .kl-communities-page [data-view=directory] > .kl-cm-heading:has([data-community-action=create]) > .kl-cm-heading-actions {
    display: grid; width: 100%; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; margin-left: 0;
  }
  .kl-communities-page [data-view=directory] .kl-cm-list-controls .kl-text-button { padding-inline: 6px; }
}
@container kl-panel (width > 700px) and (width <= 900px) and (height <= 500px) {
  .kl-communities-page [data-view=directory] .kl-cm-search { margin-bottom: 8px; }
  .kl-communities-page [data-view=directory] .kl-cm-body > .kl-browse-summary { margin-bottom: 8px; }
  .kl-communities-page [data-view=directory] .kl-cm-list-controls .kl-text-button { padding-inline: 8px; }
}
@media (pointer: coarse) {
  .kl-communities-page .kl-cm-heading-actions .kl-browse-icon { width: 44px; }
  .kl-communities-page .kl-cm-heading-actions .kl-text-button,
  .kl-communities-page .kl-cm-tabs:not(.kl-cm-sections) .kl-text-button,
  .kl-communities-page .kl-cm-quick-filters .kl-text-button,
  .kl-communities-page .kl-cm-card-actions .kl-text-button { min-height: 44px; }
  .kl-communities-page .kl-cm-card-top .kl-cm-more { width: 44px; height: 44px; min-height: 44px; }
  .kl-cm-members--directory .kl-cm-member-options-trigger { width: 44px; height: 44px; min-height: 44px; }
  .kl-communities-page .kl-text-button.kl-cm-subtle { min-height: 36px; }
}

.kl-communities-page:has(.kl-cm-channel-layout) { scrollbar-gutter: auto; }
.kl-communities-page > div:has(> .kl-cm-body > .kl-cm-channel-layout) {
  display: flex; flex-direction: column; height: 100%;
}
.kl-cm-body:has(> .kl-cm-channel-layout) { flex: 1; min-height: 0; padding-bottom: 14px; }
@media (hover: hover) and (pointer: fine) {
  @container kl-workspace (min-width: 720px) {
    .kl-cm-body:has(> .kl-cm-channel-layout) > .kl-cm-hero {
      display: grid; grid-template-columns: minmax(0, 1fr) fit-content(48%);
      align-items: center; gap: 6px 16px; padding-bottom: 0;
    }
    .kl-cm-body:has(> .kl-cm-channel-layout) > .kl-cm-hero > .kl-cm-identity { min-width: 0; }
    .kl-cm-body:has(> .kl-cm-channel-layout) > .kl-cm-hero > .kl-cm-actions {
      grid-column: 2; grid-row: 1; justify-content: flex-end; margin: 0;
    }
    .kl-cm-body:has(> .kl-cm-channel-layout) > .kl-cm-hero > p {
      grid-column: 1 / -1; margin: 0;
    }
    .kl-cm-body:has(> .kl-cm-channel-layout) > .kl-cm-hero > p:empty { display: none; }
    .kl-cm-sections .kl-cm-tab-count { margin-inline-start: 4px; }
  }
}
.kl-communities-page > div:has(.kl-cm-channel-layout) > .kl-cm-heading { padding-block: 12px 6px; }
.kl-communities-page > div:has(.kl-cm-channel-layout) > .kl-cm-heading > [data-community-action=back] {
  min-height: 32px; padding: 0 2px; font-size: 11px;
}
.kl-communities-page > div:has([data-community-action=refresh-channel]) > .kl-cm-heading > .kl-cm-heading-actions {
  display: none;
}
.kl-cm-body:has(> .kl-cm-channel-layout) > .kl-cm-sections {
  background: var(--kl-bg);
}
.kl-communities-page .kl-cm-body:has(> .kl-cm-channel-layout) .kl-cm-sections > .kl-text-button {
  position: relative; min-height: 38px; padding: 0 2px 10px; border: 0; border-radius: 0; font-weight: 500;
}
.kl-cm-body:has(> .kl-cm-channel-layout) .kl-cm-sections > [aria-pressed=true]::after {
  position: absolute; content: ''; inset: auto 0 0; height: 2px; border-radius: 2px;
  background: var(--kl-accent);
}
.kl-communities-page > div:has(> .kl-cm-body > .kl-cm-channel-layout) > .kl-cm-heading,
.kl-cm-body:has(> .kl-cm-channel-layout) > :not(.kl-cm-channel-layout) { flex-shrink: 0; }
.kl-cm-channel-layout {
  --kl-channel-action-size: 36px;
  --kl-channel-action-width: 36px;
  --kl-channel-avatar-size: 36px;
  --kl-channel-reaction-size: 26px;
  display: grid; grid-template-columns: minmax(164px,208px) minmax(0,1fr);
  flex: 1; min-width: 0; min-height: min(190px, 48cqh);
}
.kl-cm-channel-layout[data-channel-directory-state] {
  display: flex; flex-direction: column; min-height: 0;
}
.kl-cm-channel-directory-loading {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;
  min-height: 0; overflow-y: auto; overscroll-behavior: contain;
}
.kl-cm-channel-directory-loading > .kl-cm-skeleton-card { height: 230px; }
.kl-cm-channel-directory-loading .kl-cm-skeleton::after {
  background: linear-gradient(90deg, transparent, #d6a24b0a, transparent);
}
.kl-cm-channel-layout > .kl-cm-channel-directory-empty {
  display: flex; padding: 24px 16px; min-height: 0;
  text-align: center; overflow-y: auto; overscroll-behavior: contain;
}
.kl-cm-channel-directory-empty > * { flex: none; }
.kl-cm-channel-layout > .kl-cm-channel-directory-empty > .kl-icon { width: 28px; height: 28px; margin-bottom: 4px; }
.kl-cm-channel-directory-empty > h3 { margin: 0; color: var(--kl-text); font-size: 13px; font-weight: 650; line-height: 1.5; }
.kl-cm-channel-layout > .kl-cm-channel-directory-empty > p { align-self: auto; max-width: 340px; margin: 0; }
.kl-cm-channel-layout > .kl-cm-channel-directory-empty > .kl-text-button { margin-top: 4px; }
.kl-cm-channel-list, .kl-cm-thread {
  display: flex; flex-direction: column; min-width: 0; min-height: 0;
  border: 1px solid var(--kl-border); overflow: hidden;
}
.kl-cm-channel-list { border-radius: 8px 0 0 8px; border-right: 0; background: var(--kl-surface); }
.kl-cm-thread { border-radius: 0 8px 8px 0; background: var(--kl-bg); }
.kl-cm-channel-search {
  display: flex; align-items: center; gap: 6px; flex: none; min-width: 0;
  padding: 10px; border-bottom: 1px solid var(--kl-border);
}
.kl-cm-channel-search .kl-browse-search { min-width: 0; min-height: 34px; padding-inline: 7px; gap: 5px; background: var(--kl-input-bg); }
.kl-communities-page .kl-cm-channel-search .kl-browse-search input { font-size: 11px; padding-block: 5px; }
.kl-cm-channel-search .kl-browse-search > .kl-browse-icon { width: 24px; min-height: 28px; padding: 2px; }
.kl-cm-channel-search .kl-browse-search > .kl-icon { width: 14px; height: 14px; }
.kl-cm-channel-rows { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 6px; }
.kl-cm-channel-filter-empty { padding: 16px 8px; text-align: center; }
.kl-cm-channel-filter-empty > h3 { margin: 0 0 6px; color: var(--kl-text); font-size: 12px; font-weight: 500; }
.kl-cm-channel-filter-empty > p { margin: 7px 0 0; color: var(--kl-muted); font-size: 10px; line-height: 1.7; }
.kl-cm-channel-list .kl-cm-channel-row {
  display: flex; align-items: flex-start; gap: 8px; width: 100%; min-width: 0; min-height: 34px;
  margin: 0 0 4px; padding: 10px 8px; text-align: left; color: var(--kl-text);
  border: 1px solid transparent; border-radius: 7px; background: transparent; cursor: pointer;
}
.kl-cm-channel-row:last-child { margin-bottom: 0; }
.kl-cm-channel-list .kl-cm-channel-row:hover { background: var(--kl-surface-hover); }
.kl-cm-channel-list .kl-cm-channel-row[aria-current=page] {
  background: color-mix(in srgb, var(--kl-accent) 9%, transparent);
  border-color: color-mix(in srgb, var(--kl-accent) 28%, transparent);
}
.kl-cm-channel-row > .kl-icon { flex: none; width: 15px; height: 15px; margin-top: 1px; color: var(--kl-muted); }
.kl-cm-channel-copy { flex: 1; min-width: 0; }
.kl-cm-channel-copy strong, .kl-cm-channel-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-cm-channel-copy strong { font-size: 12px; font-weight: 550; }
.kl-cm-channel-copy small { margin-top: 4px; color: var(--kl-muted); font-size: 10px; line-height: 1.6; }
.kl-cm-channel-badges { display: flex; align-items: center; flex-wrap: wrap; gap: 3px 5px; color: var(--kl-muted); font-size: 10px; }
.kl-cm-channel-copy > .kl-cm-channel-badges { margin-top: 4px; }
.kl-cm-channel-badges:empty { display: none; }
.kl-cm-channel-badges > span { display: inline-flex; align-items: center; gap: 3px; }
.kl-cm-channel-badges .kl-icon { width: 11px; height: 11px; }
.kl-cm-channel-unread { padding-inline: 5px; border-radius: 9px; background: var(--kl-accent); color: var(--kl-accent-foreground); }
.kl-cm-channel-list > [data-community-action=new-channel] {
  display: flex; align-items: center; justify-content: center; gap: 6px; margin: 6px; flex: none;
  border-radius: 6px; font-size: var(--kl-type-sm);
}
.kl-cm-channel-list > [data-community-action=new-channel] > .kl-icon { width: 14px; height: 14px; }
.kl-cm-channel-header {
  display: flex; align-items: center; gap: 8px; min-width: 0; min-height: 58px;
  flex: none; padding: 8px 12px; box-sizing: border-box;
  border-bottom: 1px solid var(--kl-border); background: var(--kl-surface);
}
.kl-cm-channel-header > .kl-icon { flex: none; width: 16px; height: 16px; color: var(--kl-muted); }
.kl-cm-channel-title { flex: 1; min-width: 0; }
.kl-cm-channel-title h2, .kl-cm-channel-title p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-cm-channel-title h2 { font-size: 12px; }
.kl-cm-channel-title p { margin: 3px 0 0; color: var(--kl-muted); font-size: 10px; line-height: 1.6; }
.kl-cm-channel-layout :is(.kl-cm-channel-header, .kl-cm-channel-search, .kl-cm-composer) > .kl-browse-icon,
.kl-cm-channel-layout :is(.kl-cm-channel-header, .kl-cm-composer) > .kl-icon-button {
  flex: none; width: var(--kl-channel-action-width); min-width: var(--kl-channel-action-width);
  height: var(--kl-channel-action-size); min-height: var(--kl-channel-action-size); padding: 5px; border-radius: 7px;
}
.kl-cm-channel-layout :is(.kl-cm-channel-header, .kl-cm-channel-search, .kl-cm-composer) > button > .kl-icon { width: 17px; height: 17px; }
.kl-cm-channel-header > :is(.kl-cm-channel-options, .kl-cm-channel-members),
.kl-cm-composer > :is([data-community-action=attach-images], [data-community-action=attach-audio]) {
  background: transparent; border-color: transparent; color: var(--kl-muted);
}
.kl-cm-channel-header > :is(.kl-cm-channel-options, .kl-cm-channel-members):hover,
.kl-cm-composer > :is([data-community-action=attach-images], [data-community-action=attach-audio]):hover {
  background: var(--kl-surface-hover); color: var(--kl-text);
}
.kl-cm-channel-header > .kl-cm-channel-back { display: none; }
.kl-cm-channel-options-dialog[open] {
  display: flex; flex-direction: column; gap: 8px; width: min(320px,calc(100vw - 32px));
  padding: 16px; box-sizing: border-box; overflow: auto; background: var(--kl-surface);
}
.kl-cm-channel-options-dialog h2 { margin: 0 0 4px; overflow-wrap: anywhere; }
.kl-cm-channel-options-dialog .kl-cm-actions { align-items: stretch; flex-direction: column; }
.kl-cm-channel-options-dialog .kl-cm-actions > button { text-align: left; }
#kl-community-channel-menu[open] { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 4px; width: 196px; }
#kl-community-channel-menu .kl-shell-menu-heading { grid-column: 1/-1; }
#kl-community-channel-menu .kl-shell-menu-item { justify-content: center; min-height: 40px; padding: 4px; font-size: 21px; }
#kl-community-channel-menu .kl-shell-menu-item svg { display: none; }
.kl-cm-thread > .kl-cm-messages {
  flex: 1; min-height: 0; max-height: none; gap: 0; padding: 12px 8px;
  overscroll-behavior: contain; overflow-x: hidden; scroll-padding: 12px; scrollbar-gutter: stable;
}
.kl-cm-thread > .kl-cm-empty { margin: auto 12px; }
.kl-cm-thread > .kl-text-button { align-self: flex-start; margin: 4px 8px 0; min-height: 28px; }
.kl-cm-thread > p:not(.kl-cm-empty), .kl-cm-thread > .kl-cm-status { margin: 0; padding: 8px 12px; color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-cm-thread > .kl-cm-messages > .kl-date-separator { flex: none; gap: 12px; margin: 12px 4px 4px; font-size: 10px; }
.kl-cm-thread > .kl-cm-messages > .kl-date-separator::before,
.kl-cm-thread > .kl-cm-messages > .kl-date-separator::after { background: var(--kl-border); opacity: 1; }
.kl-cm-thread > .kl-cm-messages > .kl-date-separator:first-child { margin-top: 0; }
.kl-cm-thread > .kl-cm-messages > .kl-cm-message {
  position: relative; display: grid; grid-template-columns: var(--kl-channel-avatar-size) minmax(0,1fr);
  flex: none; gap: 10px; min-width: 0; width: fit-content; max-width: min(92%,680px);
  margin-top: 12px; padding: 5px 6px; border-radius: 6px; box-sizing: border-box;
}
.kl-cm-thread > .kl-cm-messages > .kl-cm-message--self { grid-template-columns: minmax(0,1fr) var(--kl-channel-avatar-size); }
.kl-cm-thread > .kl-cm-messages > .kl-cm-message:hover, .kl-cm-thread > .kl-cm-messages > .kl-cm-message:focus-within {
  background: color-mix(in srgb, var(--kl-text) 3%, transparent);
}
.kl-cm-thread > .kl-cm-messages > .kl-cm-message[data-grouped=true] { margin-top: 0; padding-block: 2px; }
.kl-cm-thread > .kl-cm-messages .kl-cm-avatar {
  position: relative; display: grid; place-items: center; width: calc(var(--kl-channel-avatar-size) - 4px);
  height: calc(var(--kl-channel-avatar-size) - 4px); margin: 2px; grid-column: 1; grid-row: 1;
}
.kl-cm-thread > .kl-cm-messages .kl-cm-avatar > .kl-cm-author-face {
  position:relative; overflow:hidden;
  display: grid; place-items: center; width: 100%; height: 100%; min-height: 0; padding: 0;
  border: 0; border-radius: inherit; background: transparent; color: inherit; font: inherit; cursor: pointer;
}
.kl-cm-author-initials { display:grid; place-items:center; }
.kl-cm-author-initials > .kl-icon { width:15px; height:15px; }
.kl-cm-author-face > .kl-social-avatar-media:not([data-state="ready"]) { visibility:hidden; }
.kl-cm-thread > .kl-cm-messages .kl-cm-avatar img { position:absolute; inset:0; display:block; width:100%; height:100%; object-fit:cover; border-radius:inherit; }
.kl-cm-thread > .kl-cm-messages .kl-cm-message--self > .kl-cm-avatar { grid-column: 2; }
.kl-cm-thread > .kl-cm-messages .kl-cm-message > .kl-cm-bubble {
  grid-column: 2; grid-row: 1; padding: 6px 10px; border: 0; border-radius: 10px;
  background: color-mix(in srgb, var(--kl-text) 5%, var(--kl-surface));
}
.kl-cm-thread > .kl-cm-messages .kl-cm-message--self > .kl-cm-bubble {
  grid-column: 1; padding: 6px 10px; border-radius: 10px;
  background: color-mix(in srgb, var(--kl-accent) 8%, var(--kl-surface));
}
.kl-cm-thread > .kl-cm-messages .kl-cm-message[data-grouped=true] > .kl-cm-bubble { padding-block: 5px; }
.kl-cm-thread > .kl-cm-messages .kl-cm-message-meta { align-items: center; gap: 2px 8px; min-width: 0; min-height: 24px; }
.kl-cm-thread > .kl-cm-messages .kl-cm-message--self .kl-cm-message-meta { justify-content: flex-end; }
.kl-cm-thread > .kl-cm-messages .kl-cm-author { min-height: 22px; font-size: 12px; }
.kl-cm-thread > .kl-cm-messages .kl-cm-author:hover { text-decoration: underline; text-underline-offset: 3px; }
.kl-cm-thread > .kl-cm-messages .kl-cm-message time { font-size: 10px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.kl-cm-thread > .kl-cm-messages .kl-cm-message[data-grouped=true] .kl-cm-message-meta:not(:has(.kl-cm-message-menu[open])) { min-height: 0; height: 0; }
.kl-cm-thread > .kl-cm-messages .kl-cm-message[data-grouped=true] time {
  position: absolute; top: 6px; left: 2px; width: calc(var(--kl-channel-avatar-size) + 2px);
  font-size: 8px; text-align: center; opacity: 0; pointer-events: none;
}
.kl-cm-thread > .kl-cm-messages .kl-cm-message--self[data-grouped=true] time { left: auto; right: 2px; }
.kl-cm-thread > .kl-cm-messages .kl-cm-message[data-grouped=true]:is(:hover, :focus-within) time { opacity: 1; }
.kl-cm-thread > .kl-cm-messages .kl-cm-bubble > p { margin: 0; font-size: 13px; line-height: 1.65; }
.kl-cm-message-options {
  position: absolute; top: 1px; right: 4px; z-index: 1; opacity: 0; pointer-events: none;
  display: grid; place-items: center; width: 28px; min-height: 28px; height: 28px; padding: 4px;
  border: 1px solid transparent; border-radius: 6px; box-sizing: border-box; cursor: pointer;
  color: var(--kl-muted); list-style: none;
}
.kl-cm-message-options:hover, .kl-cm-message-menu[open] > .kl-cm-message-options {
  background: var(--kl-surface-hover); border-color: var(--kl-border); color: var(--kl-text);
}
.kl-cm-message-options::-webkit-details-marker { display: none; }
.kl-cm-message-options:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 2px; }
.kl-cm-message-options > .kl-icon { width: 15px; height: 15px; }
.kl-cm-message--self .kl-cm-message-options { left: 4px; right: auto; }
.kl-cm-message:is(:hover, :focus-within) .kl-cm-message-options, .kl-cm-message-menu[open] .kl-cm-message-options { opacity: 1; pointer-events: auto; }
.kl-cm-message-menu { flex-basis: 0; }
.kl-cm-message-menu[open] { flex-basis: 100%; }
.kl-cm-message-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 4px 0; }
.kl-cm-message-actions > .kl-text-button { padding: 4px 6px; min-height: 28px; font-size: var(--kl-type-xs); }
.kl-cm-message .kl-message-reactions { margin-top: 4px; }
.kl-cm-message--self .kl-message-reactions { justify-content: flex-end; }
.kl-cm-message .kl-message-reactions > .kl-message-reaction {
  min-width: 36px; min-height: var(--kl-channel-reaction-size); padding: 2px 7px;
  border-radius: 6px; background: var(--kl-surface); font-size: 11px;
}
.kl-cm-message .kl-message-reactions > .kl-message-reaction[aria-pressed=true] {
  border-color: color-mix(in srgb, var(--kl-accent) 65%, var(--kl-border));
  background: color-mix(in srgb, var(--kl-accent) 16%, var(--kl-surface));
}
.kl-cm-message .kl-message-reaction-picker > summary {
  width: 28px; min-height: var(--kl-channel-reaction-size); min-width: 28px; padding: 3px;
  border-color: transparent; border-radius: 6px; background: transparent;
}
.kl-cm-message .kl-message-reactions:has(> .kl-message-reaction-picker:only-child:not([open])) {
  height: 0; margin: 0;
}
.kl-cm-message .kl-message-reaction-picker:where(:only-child:not([open])) > summary {
  position: absolute; top: 1px; right: 34px; opacity: 0; pointer-events: none; z-index: 1;
}
.kl-cm-message--self .kl-message-reaction-picker:where(:only-child:not([open])) > summary { right: auto; left: 34px; }
.kl-cm-message:is(:hover, :focus-within) .kl-message-reaction-picker > summary {
  opacity: 1; pointer-events: auto;
}
.kl-cm-message .kl-message-reaction-picker > summary:hover,
.kl-cm-message .kl-message-reaction-picker[open] > summary {
  background: var(--kl-surface-hover); border-color: var(--kl-border); color: var(--kl-text);
}
.kl-cm-thread > .kl-cm-compose {
  flex: none; max-height: 52%; box-sizing: border-box; margin: 0; padding: 8px; overflow-y: auto;
  overscroll-behavior: contain; border-top: 1px solid var(--kl-border); background: var(--kl-surface);
}
.kl-cm-composer {
  display: flex; align-items: flex-end; gap: 4px; min-width: 0; padding: 4px;
  border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg);
}
.kl-cm-composer:focus-within { border-color: var(--kl-border-strong); }
.kl-communities-page .kl-cm-composer > textarea {
  flex: 1; display: block; width: 0; min-width: 0; min-height: var(--kl-channel-action-size); max-height: 128px;
  margin: 0; padding: 7px 4px; border: 0; border-radius: 0; background: transparent;
  font-size: 13px; line-height: 22px; resize: none; overflow-y: auto;
}
.kl-cm-composer > textarea:focus-visible { outline: none; }
.kl-cm-compose > p { margin: 0; font-size: var(--kl-type-sm); }

@container kl-workspace (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-cm-channel-layout {
    grid-template-columns: minmax(0,1fr); --kl-channel-avatar-size: 32px;
    --kl-channel-action-size: 40px; --kl-channel-reaction-size: 32px;
  }
  .kl-cm-channel-directory-loading { grid-template-columns: minmax(0, 1fr); }
  .kl-cm-channel-layout[data-channel-open=true] > .kl-cm-channel-list,
  .kl-cm-channel-layout[data-channel-open=false] > .kl-cm-thread { display: none; }
  .kl-cm-channel-list, .kl-cm-thread { border: 1px solid var(--kl-border); border-radius: 8px; }
  .kl-cm-channel-header { gap: 6px; padding: 6px 8px; }
  .kl-cm-channel-header > .kl-cm-channel-back { display: grid; place-items: center; }
  .kl-cm-body:has(> .kl-cm-channel-layout[data-channel-open=true]) > .kl-cm-hero { display: none; }
  .kl-cm-body:has(> .kl-cm-channel-layout) { padding-inline: 12px; gap: 8px; }
  .kl-cm-channel-list .kl-cm-channel-row { min-height: 56px; padding-block: 12px; }
  .kl-cm-channel-copy small { font-size: 11px; }
  .kl-cm-channel-search .kl-browse-search { min-height: 40px; }
  .kl-cm-thread > .kl-cm-messages { padding: 10px 4px; }
  .kl-cm-thread > .kl-cm-messages > .kl-cm-message { max-width: 100%; gap: 8px; padding-inline: 4px; }
  .kl-cm-thread > .kl-cm-compose { padding: 6px; }
  .kl-cm-composer { gap: 0; padding: 2px; }
  .kl-communities-page .kl-cm-composer > textarea { padding-block: 8px; font-size: 16px; }
  .kl-cm-message-options { width: 36px; height: 36px; min-height: 36px; right: 1px; opacity: 1; pointer-events: auto; }
  .kl-cm-message--self .kl-cm-message-options { left: 1px; }
  .kl-cm-thread > .kl-cm-messages .kl-cm-message:not(.kl-cm-message--self):has(.kl-cm-message-options) .kl-cm-message-meta {
    padding-right: 22px;
  }
  .kl-cm-thread > .kl-cm-messages .kl-cm-message:not(.kl-cm-message--self)[data-grouped=true]:has(.kl-cm-message-options) > .kl-cm-bubble {
    padding-right: 34px;
  }
  .kl-cm-thread > .kl-cm-messages .kl-cm-message--self:has(.kl-cm-message-options) > .kl-cm-bubble {
    padding-right: 8px; padding-left: 34px;
  }
  .kl-cm-message .kl-message-reaction-picker:where(:only-child:not([open])) > summary { top: 37px; right: 1px; }
  .kl-cm-message--self .kl-message-reaction-picker:where(:only-child:not([open])) > summary { right: auto; left: 1px; }
  .kl-cm-message[data-grouped=true] .kl-message-reaction-picker:where(:only-child:not([open])) > summary {
    top: 1px; left: 4px; right: auto;
  }
  .kl-cm-message--self[data-grouped=true] .kl-message-reaction-picker:where(:only-child:not([open])) > summary {
    left: auto; right: 4px;
  }
}
@container kl-workspace (width <= 700px) and (height > 500px) {
  .kl-cm-body:has(> .kl-cm-channel-layout) { padding-inline: 11px; }
}
@container kl-workspace (width <= 900px) and (height <= 500px) {
  .kl-cm-channel-layout { --kl-channel-action-size: 36px; }
  .kl-cm-body:has(> .kl-cm-channel-layout) { padding-bottom: 8px; gap: 6px; }
  .kl-communities-page > div:has(.kl-cm-channel-layout[data-channel-open=true]) > .kl-cm-heading,
  .kl-cm-body:has(> .kl-cm-channel-layout) > .kl-cm-hero,
  .kl-cm-body:has(> .kl-cm-channel-layout[data-channel-open=true]) > .kl-cm-sections { display: none; }
  .kl-communities-page .kl-cm-body:has(> .kl-cm-channel-layout) .kl-cm-sections > .kl-text-button {
    min-height: 28px; padding-block: 4px;
  }
  .kl-cm-body:has(> .kl-cm-channel-layout[data-channel-open=true]) { padding-top: 6px; }
  .kl-cm-channel-header { min-height: 42px; padding-block: 3px; }
  .kl-cm-channel-title p { display: none; }
  .kl-cm-thread > .kl-cm-compose { max-height: 46%; padding: 4px; }
  .kl-communities-page .kl-cm-composer > textarea { padding-block: 7px; max-height: 76px; font-size: 13px; }
}
@media (pointer: coarse) {
  .kl-cm-channel-list .kl-cm-channel-row { min-height: 56px; }
  .kl-cm-message-options { width: 36px; min-height: 36px; height: 36px; opacity: 1; pointer-events: auto; }
  .kl-cm-message .kl-message-reaction-picker:where(:only-child:not([open])) > summary {
    top: 36px; left: 4px; right: auto; opacity: 1; pointer-events: auto;
  }
  .kl-cm-message--self .kl-message-reaction-picker:where(:only-child:not([open])) > summary { left: auto; right: 4px; }
  .kl-cm-message[data-grouped=true] .kl-message-reaction-picker:where(:only-child:not([open])) > summary { top: 1px; }
}
`;
