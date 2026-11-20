import {PROFILE_READ_ALBUMS_STYLES} from './profile-read-albums-styles';

export const ALBUMS_STYLES = `
.kl-albums { min-width: 0; padding: 16px; color: var(--kl-text); }
.kl-albums[hidden] { display: none; }
.kl-al-content:has(> .kl-al-heading) { padding: 16px; border: 1px solid var(--kl-border); border-radius: 10px; background: var(--kl-surface); }
.kl-al-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; min-width: 0; }
.kl-al-heading > div { flex: 1 1 210px; min-width: 0; overflow-wrap: anywhere; }
.kl-al-heading h2 { margin: 0; font-size: 13px; }
.kl-al-heading p, .kl-al-note { margin: 4px 0 0; color: var(--kl-muted); font-size: 10px; line-height: 1.7; overflow-wrap: anywhere; }
.kl-al-content > .kl-al-note { margin-top: 12px; }
.kl-al-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; margin-top: 12px; }
.kl-al-grid:empty { display: none; }
.kl-al-card { min-width: 0; overflow: hidden; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg); }
.kl-al-cover { display: grid; place-items: center; position: relative; height: 124px; border-bottom: 1px solid var(--kl-border); background: var(--kl-surface-2); color: var(--kl-muted); }
.kl-al-image { display: grid; place-items: center; width: 100%; height: 100%; min-height: 108px; overflow: hidden; text-align: center; font-size: 11px; }
.kl-al-image > button:has(img) { display: block; width: 100%; height: 100%; padding: 0; border: 0; border-radius: 0; background: transparent; }
.kl-al-image img { display: block; width: 100%; height: 100%; object-fit: cover; }
.kl-al-cover .kl-al-image { min-height: 0; }
.kl-al-cover .kl-al-placeholder, .kl-al-cover .kl-al-cover-reveal {
 display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px;
 width: 100%; height: 100%; min-height: 0; padding: 12px 16px 25px;
 border: 0; border-radius: 0; background: none; color: var(--kl-muted);
 font: 400 10px/1.6 var(--kl-font,system-ui); cursor: pointer;
}
.kl-al-cover .kl-al-placeholder:hover, .kl-al-cover .kl-al-cover-reveal:hover { background: var(--kl-surface-hover); }
.kl-al-cover .kl-icon { width: 26px; height: 26px; flex: none; }
.kl-al-count { position: absolute; right: 8px; bottom: 8px; min-height: 23px; display: inline-flex; align-items: center; padding: 3px 7px; border: 1px solid var(--kl-border); border-radius: 5px; background: #101012ed; color: var(--kl-text); font-size: 10px; line-height: 1.4; pointer-events: none; }
.kl-al-copy { padding: 10px; overflow-wrap: anywhere; }
.kl-al-copy h3 { overflow: hidden; margin: 0; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; line-height: 1.65; }
.kl-al-copy p { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; margin: 5px 0 0; color: var(--kl-muted); font-size: 11px; line-height: 1.7; }
.kl-al-copy small { display: block; margin-top: 7px; color: var(--kl-muted); font-size: 10px; }
.kl-al-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.kl-al-card > .kl-al-actions { padding: 0 10px 10px; gap: 6px; }
.kl-al-card > .kl-al-actions .kl-text-button { min-height: 30px; padding: 5px 8px; font-size: 10px; }
.kl-al-heading > .kl-text-button, .kl-al-card .kl-text-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.kl-al-heading > .kl-text-button { flex: none; min-height: 36px; font-size: 11px; }
.kl-al-heading > .kl-text-button .kl-icon, .kl-al-card > .kl-al-actions .kl-icon { width: 13px; height: 13px; flex: none; }
.kl-al-empty { display: grid; justify-items: start; gap: 8px; padding: 16px 0 4px; color: var(--kl-muted); font-size: 11px; line-height: 1.7; }
.kl-al-empty h3 { margin: 0; color: var(--kl-text); font-size: 12px; }
.kl-al-empty p { max-width: 52ch; margin: 0; overflow-wrap: anywhere; }
.kl-al-empty .kl-icon { width: 24px; height: 24px; }

.kl-al-dialog, .kl-al-view-dialog {
 position: fixed; inset: 0; margin: auto; box-sizing: border-box;
 width: min(540px,calc(100vw - 24px)); max-height: calc(100dvh - 24px);
 padding: 0; overflow: hidden; border: 1px solid var(--kl-border-strong);
 border-radius: 12px; background: var(--kl-panel-bg); color: var(--kl-text); box-shadow: var(--kl-shadow);
}
.kl-al-dialog::backdrop, .kl-al-view-dialog::backdrop { background: #030303b8; }
.kl-al-dialog[open], .kl-al-view-dialog[open], .kl-al-view-content { display: grid; grid-template-rows: auto minmax(0,1fr) auto; min-width: 0; min-height: 0; }
.kl-al-view-dialog[open] { grid-template-rows: minmax(0,1fr); }
.kl-al-view-heading, .kl-al-editor-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; min-height: 64px; padding: 12px 16px; border-bottom: 1px solid var(--kl-border); }
.kl-al-view-heading h2, .kl-al-editor-heading h2 { margin: 0; font: 700 16px/1.4 var(--kl-font,system-ui); overflow-wrap: anywhere; }
.kl-al-kicker { display: block; color: var(--kl-muted); font-size: 9px; line-height: 1; letter-spacing: .09em; text-transform: uppercase; }
.kl-al-view-heading .kl-icon-button, .kl-al-editor-heading .kl-icon-button { flex: none; width: 34px; height: 34px; min-height: 34px; padding: 7px; border-color: transparent; background: transparent; }
.kl-al-view-heading .kl-icon-button:hover, .kl-al-editor-heading .kl-icon-button:hover { background: var(--kl-surface-hover); }
.kl-al-view-body, .kl-al-editor-body { min-width: 0; min-height: 0; overflow: hidden auto; overscroll-behavior: contain; padding: 16px; }
.kl-al-view-description { margin: 0; color: var(--kl-muted); font-size: 12px; line-height: 1.75; white-space: pre-wrap; overflow-wrap: anywhere; }
.kl-al-view-body > .kl-al-note { margin-block: 12px; }
.kl-al-view-actions, .kl-al-editor-actions { min-height: 61px; justify-content: flex-end; padding: 12px 16px; border-top: 1px solid var(--kl-border); background: var(--kl-input-bg); }
.kl-al-view-actions > .kl-text-button, .kl-al-editor-actions > .kl-text-button { min-height: 36px; border-radius: 8px; font-size: 12px; }
.kl-al-view-actions > :first-child:not(:last-child), .kl-al-editor-delete { margin-right: auto; }
.kl-al-photos { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; align-items: start; margin-top: 12px; }
.kl-al-photos:has(> figure:only-child) { grid-template-columns: minmax(0,1fr); }
.kl-al-photos figure { min-width: 0; margin: 0; }
.kl-al-photos .kl-al-image { height: 160px; border: 1px solid var(--kl-border); border-radius: 7px; background: var(--kl-input-bg); }
.kl-al-photos:has(> figure:only-child) .kl-al-image { min-height: 80px; height: auto; max-height: 240px; }
.kl-al-photos:has(> figure:only-child) img { min-height: 80px; max-height: 240px; object-fit: contain; }
.kl-al-photos figcaption { margin-top: 5px; color: var(--kl-muted); font-size: 10px; line-height: 1.65; overflow-wrap: anywhere; white-space: pre-wrap; }

.kl-al-editor-body > .kl-al-note:first-child { margin: 0; line-height: 1.5; }
.kl-al-field { display: grid; gap: 5px; min-width: 0; margin: 0 0 12px; font-size: 12px; }
.kl-al-field input, .kl-al-field textarea { box-sizing: border-box; width: 100%; min-width: 0; min-height: 36px; padding: 7px 10px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-input-bg); color: inherit; font: inherit; }
.kl-al-field textarea { min-height: 88px; max-height: 160px; resize: vertical; }
.kl-al-counter { color: var(--kl-muted); font-size: 10px; line-height: 1.6; text-align: right; }
.kl-al-upload { display: grid; gap: 6px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--kl-border); }
.kl-al-upload > .kl-al-field { margin: 0; }
.kl-al-upload > .kl-al-field > span { display: flex; align-items: center; gap: 6px; color: var(--kl-muted); font-size: 11px; }
.kl-al-upload > .kl-al-field .kl-icon { width: 13px; height: 13px; }
.kl-al-upload input[type=file] { width: auto; max-width: 100%; justify-self: start; min-height: 34px; padding: 0; border-radius: 6px; color: var(--kl-muted); font-size: 10px; line-height: 32px; }
.kl-al-upload input[type=file]::file-selector-button { min-height: 32px; margin-right: 8px; padding: 0 10px; border: 0; border-right: 1px solid var(--kl-border); background: var(--kl-surface-2); color: var(--kl-text); font: 11px var(--kl-font,system-ui); cursor: pointer; }
.kl-al-editor-images { display: grid; gap: 8px; }
.kl-al-editor-images:empty { display: none; }
.kl-al-editor-image { display: grid; grid-template-columns: 52px minmax(0,1fr); gap: 5px 8px; padding: 8px; border: 1px solid var(--kl-border); border-radius: 7px; background: var(--kl-input-bg); }
.kl-al-editor-preview { grid-column: 1; grid-row: 1 / 4; height: 52px; display: grid; place-items: center; overflow: hidden; border: 1px solid var(--kl-border); border-radius: 5px; background: var(--kl-surface-2); color: var(--kl-muted); text-align: center; font-size: 9px; }
.kl-al-editor-preview img { width: 52px; height: 52px; object-fit: cover; }
.kl-al-editor-preview .kl-text-button { min-height: 23px; padding: 0 3px; font-size: 9px; }
.kl-al-editor-image > strong { grid-column: 2; grid-row: 1; color: var(--kl-muted); font-size: 10px; }
.kl-al-editor-image > .kl-al-field { grid-column: 2; grid-row: 2; margin: 0; font-size: 11px; }
.kl-al-editor-image > .kl-al-field input { min-height: 36px; }
.kl-al-editor-image > .kl-al-actions { grid-column: 1 / -1; justify-content: flex-end; gap: 4px; }
.kl-al-editor-image .kl-icon-button { position: relative; width: 30px; height: 30px; min-height: 30px; padding: 7px; border-color: transparent; background: transparent; color: var(--kl-muted); }
.kl-al-editor-image .kl-icon-button:hover { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-al-photo-up .kl-icon { transform: rotate(-90deg); }
.kl-al-photo-down .kl-icon { transform: rotate(90deg); }
.kl-al-spoiler { position: relative; display: inline-flex; align-items: center; gap: 5px; min-height: 30px; padding: 4px 8px; border: 1px solid var(--kl-border); border-radius: 8px; color: var(--kl-muted); font-size: 10px; cursor: pointer; }
.kl-al-spoiler .kl-icon { width: 14px; height: 14px; }
.kl-al-spoiler:has(:checked) { color: var(--kl-gold); border-color: var(--kl-border-strong); }
.kl-al-spoiler:focus-within { outline: 2px solid var(--kl-accent); }
.kl-al-spoiler:has(:disabled) { opacity: .48; cursor: wait; }
.kl-al-status { margin: 0 0 12px; color: var(--kl-muted); font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.kl-al-status:empty { display: none; }
.kl-al-editor-body .kl-al-status { margin: 12px 0 0; }
.kl-al-confirm { margin-top: 12px; padding: 12px; border: 1px solid var(--kl-border-strong); border-radius: 8px; background: var(--kl-surface-2); font-size: 11px; }
.kl-al-confirm h3 { margin: 0; font-size: 13px; }
.kl-al-confirm p { margin: 5px 0 0; }
.kl-al-confirm button { margin: 10px 6px 0 0; }

@media (max-width: 700px), (max-width: 900px) and (max-height: 500px) {
 .kl-albums { padding: 10px; }
 .kl-al-content:has(> .kl-al-heading) { padding: 12px; }
 .kl-al-view-heading, .kl-al-editor-heading, .kl-al-view-actions, .kl-al-editor-actions { padding: 10px 12px; }
 .kl-al-view-heading, .kl-al-editor-heading { min-height: 61px; }
 .kl-al-view-body, .kl-al-editor-body { padding: 12px; }
 .kl-al-view-heading h2, .kl-al-editor-heading h2 { font-size: 15px; }
 .kl-al-view-actions > .kl-text-button, .kl-al-editor-actions > .kl-text-button { min-height: 40px; }
}
@media (max-width: 700px) {
 .kl-al-grid { grid-template-columns: minmax(0,1fr); gap: 10px; }
 .kl-al-cover { height: 138px; }
 .kl-al-card > .kl-al-actions .kl-text-button { min-height: 36px; }
 .kl-al-heading > .kl-text-button { min-height: 38px; }
}
@media (max-width: 520px) {
 .kl-al-photos { grid-template-columns: minmax(0,1fr); }
}
@media (pointer: coarse) {
 .kl-al-heading > .kl-text-button, .kl-al-card > .kl-al-actions .kl-text-button, .kl-al-view-actions > .kl-text-button, .kl-al-editor-actions > .kl-text-button, .kl-al-view-heading .kl-icon-button, .kl-al-editor-heading .kl-icon-button { min-height: 44px; }
 .kl-al-field input:not([type=file]), .kl-al-field textarea { font-size: 16px; }
 .kl-al-editor-image .kl-icon-button, .kl-al-spoiler { min-width: 44px; min-height: 44px; }
}

/* A Space embeds its gallery directly in the detail tab. */
.kl-albums--space { padding: 0; font-size: 12px; line-height: 1.5; }
.kl-albums--space .kl-al-content:has(> .kl-al-heading) { margin-top: 0; padding: 16px; }
.kl-albums--space .kl-al-heading { margin-bottom: 12px; }
.kl-albums--space .kl-al-heading h2 { font-size: 13px; font-weight: 650; line-height: 1.4; letter-spacing: -.2px; }
.kl-albums--space .kl-al-grid { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
.kl-albums--space .kl-al-cover { height: 124px; }
.kl-albums--space .kl-al-copy h3 { font-weight: 650; }
.kl-albums--space .kl-al-count { justify-content: center; }
.kl-albums--space .kl-al-content > .kl-al-note { margin-top: 0; }
.kl-albums--space .kl-al-empty { display: flex; flex-direction: column; align-items: flex-start; }
.kl-albums--space .kl-al-empty h3 { font-size: 13px; font-weight: 650; }
.kl-albums--space .kl-al-content > .kl-al-empty p { font-size: 12px; line-height: 1.75; }
.kl-albums--space .kl-al-heading > .kl-text-button,
.kl-albums--space .kl-al-card > .kl-al-actions .kl-text-button,
.kl-albums--space .kl-al-view-actions > .kl-text-button,
.kl-albums--space .kl-al-editor-actions > .kl-text-button,
.kl-albums--space .kl-al-confirm .kl-text-button { height: 36px; min-height: 34px; padding: 0 12px; border-radius: 8px; font-weight: 550; gap: 8px; }
.kl-albums--space .kl-al-heading > .kl-text-button { font-size: 11px; }
.kl-albums--space .kl-al-heading > .kl-text-button .kl-icon,
.kl-albums--space .kl-al-card > .kl-al-actions .kl-icon { width: 16px; height: 16px; }
.kl-albums--space .kl-al-card > .kl-al-actions .kl-text-button { font-size: 10px; }
.kl-albums--space .kl-al-card > .kl-al-actions .kl-text-button,
.kl-albums--space :is(.kl-al-view-actions,.kl-al-editor-actions,.kl-al-confirm) > .kl-text-button:not(.kl-text-button--primary):not(.kl-text-button--danger) { background: transparent; }
.kl-albums--space .kl-al-card > .kl-al-actions .kl-text-button:hover,
.kl-albums--space :is(.kl-al-view-actions,.kl-al-editor-actions,.kl-al-confirm) > .kl-text-button:not(.kl-text-button--primary):not(.kl-text-button--danger):hover { background: var(--kl-surface-hover); }
.kl-albums--space .kl-al-heading > .kl-text-button--primary,
.kl-albums--space :is(.kl-al-view-actions,.kl-al-editor-actions,.kl-al-confirm) > .kl-text-button--primary { font-weight: 650; box-shadow: none; }
.kl-albums--space :is(.kl-al-dialog,.kl-al-view-dialog) { background: var(--kl-surface); font: 12px/1.5 var(--kl-font,system-ui); }
.kl-albums--space .kl-al-dialog[open] { grid-template-rows: auto minmax(0,1fr) auto auto; }
.kl-albums--space :is(.kl-al-view-heading,.kl-al-editor-heading) { min-height: 0; padding: 12px 16px; background: var(--kl-surface); }
.kl-albums--space :is(.kl-al-view-heading,.kl-al-editor-heading) h2 { font-size: 16px; }
.kl-albums--space .kl-al-kicker { color: var(--kl-faint,var(--kl-muted)); font-size: 10px; line-height: 1.7; letter-spacing: .25px; text-transform: uppercase; }
.kl-albums--space :is(.kl-al-view-heading,.kl-al-editor-heading) .kl-icon-button { width: 32px; height: 32px; min-height: 32px; }
.kl-albums--space :is(.kl-al-view-body,.kl-al-editor-body) { padding: 16px; scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent; }
.kl-albums--space .kl-al-view-body > .kl-al-note { line-height: 1.5; }
.kl-albums--space :is(.kl-al-view-actions,.kl-al-editor-actions) { padding: 12px 16px; }
.kl-albums--space .kl-al-photos { grid-template-columns: repeat(2,minmax(0,1fr)); }
.kl-albums--space .kl-al-field { display: flex; flex-direction: column; gap: 6px; }
.kl-albums--space .kl-al-field > span { font-weight: 550; }
.kl-albums--space .kl-al-field + .kl-al-field { margin-top: 16px; }
.kl-albums--space .kl-al-field input:not([type=file]),
.kl-albums--space .kl-al-field textarea { min-height: 36px; padding: 8px 10px; font-size: 12px; }
.kl-albums--space .kl-al-field textarea { min-height: 88px; line-height: 1.6; }
.kl-albums--space .kl-al-dialog .kl-al-field input:not([type=file]),
.kl-albums--space .kl-al-dialog .kl-al-field textarea { border-radius: 8px; }
.kl-albums--space .kl-al-dialog .kl-al-field :is(input,textarea):focus { border-color: var(--kl-accent-border,var(--kl-border-strong)); }
.kl-albums--space :is(.kl-al-dialog,.kl-al-view-dialog) :is(button,input,textarea):focus-visible { outline: 2px solid var(--kl-focus,color-mix(in srgb,var(--kl-accent) 52%,white)); outline-offset: 3px; }
.kl-albums--space .kl-al-field :is(input,textarea)::placeholder { color: var(--kl-faint,var(--kl-muted)); }
.kl-albums--space .kl-al-counter { margin-top: 4px; text-align: start; }
.kl-albums--space .kl-al-optional { color: var(--kl-muted); }
.kl-albums--space .kl-al-upload { gap: 6px; }
.kl-albums--space .kl-al-upload > .kl-al-field { align-self: start; min-width: 0; margin-bottom: 12px; }
.kl-albums--space .kl-al-upload > .kl-al-field > span { flex-wrap: wrap; font-weight: 400; }
.kl-albums--space .kl-al-upload-limit { color: var(--kl-muted); font-size: 10px; font-weight: 400; }
.kl-albums--space .kl-al-upload > .kl-al-field .kl-icon { width: 16px; height: 16px; }
.kl-albums--space .kl-al-dialog .kl-al-upload input[type=file] { width: auto; max-width: 100%; align-self: start; padding: 0; border-radius: 6px; font: 10px/32px var(--kl-font,system-ui); }
.kl-albums--space .kl-al-upload > .kl-al-note { margin: 0; line-height: 1.65; }
.kl-albums--space .kl-al-editor-images { margin-top: 4px; }
.kl-albums--space .kl-al-editor-image { align-items: start; gap: 4px 8px; }
.kl-albums--space .kl-al-editor-image > strong { font-weight: 400; line-height: 1.6; }
.kl-albums--space .kl-al-editor-image > .kl-al-actions { grid-column: 2; }
.kl-albums--space .kl-al-editor-image > .kl-al-field { font-size: 10px; }
.kl-albums--space .kl-al-editor-image > .kl-al-field > span { display: flex; align-items: center; gap: 4px; color: var(--kl-muted); font-weight: 400; line-height: 1.6; }
.kl-albums--space .kl-al-editor-image > .kl-al-field > span > .kl-al-counter { margin-top: 0; font-size: 11px; line-height: inherit; }
.kl-albums--space .kl-al-editor-image > .kl-al-field input { height: 36px; min-height: 36px; padding: 5px 8px; font-size: 11px; }
.kl-albums--space .kl-al-editor-body .kl-al-status { margin: 0; font-size: 10px; line-height: 1.5; }
.kl-albums--space .kl-al-validation { color: var(--kl-danger); }
.kl-albums--space .kl-al-warning { min-height: 0; max-height: min(45dvh,45cqh); overflow: auto; scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent; }
.kl-albums--space .kl-al-warning:empty { display: none; }
.kl-albums--space .kl-al-warning:not(:empty) { border-top: 1px solid #d6a24b50; }
.kl-albums--space .kl-al-confirm { margin: 10px; border-color: #d6a24b50; background: #302313; color: #edc990; }
.kl-albums--space .kl-al-confirm h3 { font-size: 11px; font-weight: 700; }
.kl-albums--space .kl-al-confirm p { margin-top: 0; }
.kl-albums--space .kl-al-confirm .kl-text-button { margin-top: 10px; font-size: 12px; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
 .kl-albums--space .kl-al-content:has(> .kl-al-heading) { padding: 12px; }
 .kl-albums--space .kl-al-grid { grid-template-columns: minmax(0,1fr); gap: 10px; }
 .kl-albums--space .kl-al-cover { height: 138px; }
 .kl-albums--space .kl-al-heading > .kl-text-button,
 .kl-albums--space .kl-al-card > .kl-al-actions .kl-text-button,
 .kl-albums--space :is(.kl-al-view-actions,.kl-al-editor-actions,.kl-al-confirm) > .kl-text-button { height: 40px; min-height: 40px; }
 .kl-albums--space :is(.kl-al-view-heading,.kl-al-editor-heading,.kl-al-view-actions,.kl-al-editor-actions) { padding: 10px 12px; }
 .kl-albums--space :is(.kl-al-view-heading,.kl-al-editor-heading) .kl-icon-button { width: 40px; min-width: 40px; height: 40px; min-height: 40px; }
 .kl-albums--space :is(.kl-al-view-heading,.kl-al-editor-heading) h2 { font-size: 15px; }
 .kl-albums--space :is(.kl-al-view-body,.kl-al-editor-body) { padding: 12px; }
 .kl-albums--space .kl-al-field input:not([type=file]),
 .kl-albums--space .kl-al-field textarea { min-height: 40px; font-size: 16px; }
 .kl-albums--space .kl-al-field textarea { min-height: 88px; }
 .kl-albums--space .kl-al-dialog .kl-al-upload input[type=file] { min-height: 38px; line-height: 36px; }
 .kl-albums--space .kl-al-upload input[type=file]::file-selector-button { min-height: 36px; }
}
@container kl-panel (width <= 390px) {
 .kl-albums--space .kl-al-photos { grid-template-columns: minmax(0,1fr); }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
 .kl-albums--space .kl-al-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
}
@media (pointer: coarse) {
 .kl-albums--space .kl-al-field input:not([type=file]), .kl-albums--space .kl-al-field textarea { font-size: 16px; }
 .kl-albums--space :is(.kl-al-view-heading,.kl-al-editor-heading) .kl-icon-button { width: 44px; min-width: 44px; height: 44px; min-height: 44px; }
 .kl-albums--space .kl-al-heading > .kl-text-button, .kl-albums--space .kl-al-card > .kl-al-actions .kl-text-button,
 .kl-albums--space :is(.kl-al-view-actions,.kl-al-editor-actions,.kl-al-confirm) > .kl-text-button { min-height: 44px; height: 44px; }
}

/* Populated Space albums use the same media frame and compact editor rows as
   the prototype, while loading/reveal still goes through Cloud permissions. */
.kl-albums--space .kl-al-photos .kl-al-image--inline { min-height: 0; overflow: hidden; }
.kl-albums--space .kl-al-photos .kl-al-image--inline img { object-fit: contain; }
.kl-albums--space .kl-al-photos .kl-al-image--inline > .kl-text-button:has(img),
.kl-albums--space .kl-al-cover .kl-al-image--cover > .kl-text-button:has(img) { display: block; width: 100%; height: 100%; min-width: 0; min-height: 0; padding: 0; border: 0; border-radius: 0; background: transparent; }
.kl-albums--space .kl-al-photos:has(> figure:only-child) .kl-al-image--inline { position: relative; aspect-ratio: 1.6; }
.kl-albums--space .kl-al-photos:has(> figure:only-child) .kl-al-image--inline > button:has(img) { position: absolute; inset: 0; height: 100%; }
.kl-albums--space .kl-al-photos:has(> figure:only-child) .kl-al-image--inline img { height: 100%; min-height: 0; }
.kl-albums--space .kl-al-photos .kl-al-image--consent { height: auto; min-height: 36px; border: 0; border-radius: 0; text-align: start; }
.kl-albums--space .kl-al-photos:has(> figure:only-child) .kl-al-image--consent { aspect-ratio: auto; }
.kl-albums--space .kl-al-photos .kl-al-image-link { display: flex; align-items: center; justify-content: flex-start; gap: 8px; width: 100%; min-height: 36px; padding: 8px 12px; border: 1px solid var(--kl-border); border-radius: 8px; background: var(--kl-surface); color: var(--kl-muted); text-align: left; font-size: 12px; font-weight: 400; }
.kl-albums--space .kl-al-image-link > span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-albums--space .kl-al-image-link > .kl-icon { flex: none; width: 16px; height: 16px; }
.kl-albums--space .kl-al-image-link:hover { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-albums--space .kl-al-photos .kl-al-image-mask { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 100%; min-height: 0; padding: 0; border: 0; border-radius: 0; background: var(--kl-surface-2); color: var(--kl-muted); font-size: 11px; line-height: 1.6; }
.kl-albums--space .kl-al-image-mask > .kl-icon { width: 23px; height: 23px; }
.kl-albums--space .kl-al-editor-images { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.kl-albums--space .kl-al-editor-images:empty { display: none; }
.kl-albums--space .kl-al-upload:has(.kl-al-editor-image) { row-gap: 0; }
.kl-albums--space .kl-al-editor-image { gap: 8px; }
.kl-albums--space .kl-al-editor-image > .kl-al-editor-preview { grid-row: auto; width: 52px; height: 52px; }
.kl-albums--space .kl-al-editor-image > .kl-al-editor-preview img { width: 100%; height: 100%; }
.kl-albums--space .kl-al-editor-fields { min-width: 0; }
.kl-albums--space .kl-al-editor-fields > strong { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 4px; color: var(--kl-muted); font-size: 10px; line-height: 1.6; font-weight: 400; }
.kl-albums--space .kl-al-editor-fields > .kl-al-field { display: block; margin: 0 0 12px; color: var(--kl-muted); font-size: 10px; line-height: 1.6; }
.kl-albums--space .kl-al-editor-fields > .kl-al-field > span { color: var(--kl-muted); font-weight: 400; line-height: 1.6; }
.kl-albums--space .kl-al-editor-fields > .kl-al-field > span > .kl-al-counter { margin: 0; font-size: 11px; line-height: inherit; }
.kl-albums--space .kl-al-dialog .kl-al-editor-fields > .kl-al-field > input { display: block; height: 36px; min-height: 36px; margin-top: 4px; padding: 5px 8px; font-size: 11px; line-height: 1.5; }
.kl-albums--space .kl-al-editor-fields > .kl-al-actions { justify-content: flex-end; gap: 4px; min-width: 0; }
.kl-albums--space .kl-al-editor-image .kl-icon-button { width: 30px; height: 30px; min-width: 30px; min-height: 30px; padding: 0; border: 0; border-radius: 8px; }
.kl-albums--space .kl-al-editor-image .kl-icon-button .kl-icon { width: 17px; height: 17px; }
.kl-albums--space .kl-al-editor-image .kl-al-spoiler { height: 36px; min-height: 34px; padding: 0 12px; gap: 8px; background: transparent; font-size: 12px; font-weight: 550; line-height: 1.5; }
.kl-albums--space .kl-al-editor-image .kl-al-spoiler > .kl-icon { width: 16px; height: 16px; }
.kl-albums--space .kl-al-editor-image .kl-al-spoiler:has(:checked) { background: var(--kl-surface-hover); }
.kl-albums--space .kl-media-viewer[data-presentation="space-album"] { width: min(860px,calc(100vw - 24px)); grid-template-rows: auto minmax(0,1fr) auto; padding: 0; background: var(--kl-surface); font: 12px/1.5 var(--kl-font,system-ui); }
.kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-dialog-header { min-height: 0; padding: 12px 16px; background: var(--kl-surface); }
.kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-kicker { color: var(--kl-faint,var(--kl-muted)); font-size: 10px; line-height: 1.7; letter-spacing: .25px; }
.kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-dialog-header h2 { font-size: 16px; line-height: 1.4; }
.kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-dialog-header > .kl-icon-button { width: 32px; height: 32px; min-width: 32px; min-height: 32px; }
.kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-body { display: flex; flex-direction: column; min-height: 0; overflow: auto; padding: 12px; scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent; }
.kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-stage { flex: 0 1 auto; min-height: 0; overflow: visible; padding: 0; }
.kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-stage img { max-height: calc(var(--kl-dialog-viewport-height,100dvh) - 240px); }
.kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-stage[data-actual="true"] { flex: none; overflow: auto; }
.kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-stage[data-actual="true"] img { max-height: none; }
.kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-caption { width: 100%; margin: 10px 0 0; color: var(--kl-muted); font-size: 12px; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
.kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-detail { display: flex; align-self: center; width: auto; max-width: 100%; margin: 0; padding: 0; font-size: 10px; line-height: 1.5; text-align: start; }
.kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-footer { min-height: 0; padding: 10px 12px; background: var(--kl-input-bg); }
.kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-nav { flex: 1; flex-wrap: wrap; }
.kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-footer .kl-text-button { height: 36px; min-height: 34px; padding: 0 12px; font-size: 12px; font-weight: 550; gap: 8px; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
 .kl-albums--space .kl-al-photos { gap: 6px; }
 .kl-albums--space .kl-al-dialog .kl-al-editor-fields > .kl-al-field > input { min-height: 40px; height: 40px; font-size: 16px; }
 .kl-albums--space .kl-al-editor-image .kl-icon-button { width: 36px; min-width: 36px; height: 36px; min-height: 36px; }
 .kl-albums--space .kl-al-editor-image .kl-al-spoiler { height: 40px; min-height: 36px; }
 .kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-dialog-header { padding: 10px 12px; }
 .kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-dialog-header h2 { font-size: 15px; }
 .kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-dialog-header > .kl-icon-button { width: 40px; min-width: 40px; height: 40px; min-height: 40px; }
 .kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-stage img { max-height: calc(var(--kl-dialog-viewport-height,100dvh) - 230px); }
 .kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-footer .kl-text-button { height: 40px; min-height: 40px; }
}
@container kl-panel (width <= 390px) {
 .kl-albums--space .kl-al-editor-image { grid-template-columns: 44px minmax(0,1fr); }
 .kl-albums--space .kl-al-editor-image > .kl-al-editor-preview { width: 44px; height: 44px; }
 .kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-caption { font-size: 11px; }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
 .kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-dialog-header,
 .kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-footer { padding: 8px 12px; }
 .kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-dialog-header h2 { font-size: 16px; }
 .kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-body { padding: 8px 12px; }
 .kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-stage img { max-height: calc(var(--kl-dialog-viewport-height,100dvh) - 160px); }
 .kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-caption { margin-top: 6px; font-size: 10px; }
}
@media (pointer: coarse) {
 .kl-albums--space .kl-al-editor-image .kl-icon-button,.kl-albums--space .kl-al-editor-image .kl-al-spoiler { min-width: 44px; min-height: 44px; height: 44px; }
 .kl-albums--space .kl-al-dialog .kl-al-editor-fields > .kl-al-field > input { font-size: 16px; }
 .kl-albums--space .kl-media-viewer[data-presentation="space-album"] .kl-media-viewer-footer .kl-text-button { min-height: 44px; height: 44px; }
}
${PROFILE_READ_ALBUMS_STYLES}
`;
