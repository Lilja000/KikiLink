export const workshopEditorStyles=`
.kl-workshop-page .kl-workshop-editor {
  position: fixed;
  inset: 0;
  margin: auto;
  width: 660px;
  max-width: calc(100vw - 24px);
  max-height: min(calc(100dvh - 24px), var(--kl-visible-dialog-height, 100dvh));
  padding: 0;
  border: 1px solid var(--kl-border-strong);
  border-radius: 12px;
  background: var(--kl-surface);
  color: var(--kl-text);
  box-shadow: var(--kl-shadow);
  overflow: hidden;
}
.kl-workshop-editor[open] { display: flex; flex-direction: column; }
.kl-workshop-editor::backdrop { background: #030303b8; }
.kl-workshop-editor-header, .kl-workshop-editor-footer {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
}
.kl-workshop-editor-header {
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--kl-border);
}
.kl-workshop-editor-header small { display: block; color: var(--kl-meta); font-size: 10px; line-height: 1.7; letter-spacing: .25px; }
.kl-workshop-page .kl-workshop-editor-header h2 { margin: 0; font-size: 16px; line-height: 1.4; overflow-wrap: anywhere; }
.kl-workshop-page .kl-workshop-editor-close {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  min-height: 0;
  padding: 0;
  border-color: transparent;
}
.kl-workshop-page .kl-workshop-editor-close:hover { background: var(--kl-surface-hover); }
.kl-workshop-editor-close svg { width: 16px; height: 16px; }
.kl-workshop-editor-body { min-height: 0; padding: 16px; overflow: hidden auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent; }
.kl-workshop-editor-steps {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -16px -16px 16px;
  padding: 14px 20px;
  list-style: none;
  border-bottom: 1px solid var(--kl-border);
}
.kl-workshop-editor-steps li {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  color: var(--kl-muted);
  font-size: 10px;
  line-height: 1.4;
}
.kl-workshop-editor-step-marker {
  display: grid;
  place-items: center;
  flex: none;
  width: 20px;
  height: 20px;
  border: 1px solid var(--kl-border);
  border-radius: 50%;
}
.kl-workshop-editor-step-marker svg { width: 11px; height: 11px; }
.kl-workshop-editor-steps li[aria-current="step"] { color: var(--kl-text); }
.kl-workshop-editor-steps li[aria-current="step"] span {
  border-color: color-mix(in srgb, var(--kl-accent) 38%, var(--kl-border));
  background: color-mix(in srgb, var(--kl-accent) 10%, var(--kl-surface));
}
.kl-workshop-editor-steps li[data-complete] { color: var(--kl-success); }
.kl-workshop-editor-intro { margin: 0 0 16px; color: var(--kl-muted); font-size: 12px; line-height: 1.6; }
.kl-workshop-editor-notices:not(:has([role="status"]:not(:empty))) { display: none; }
.kl-workshop-editor-notices p { margin: 0 0 12px; color: var(--kl-muted); font-size: 11px; line-height: 1.6; }
.kl-workshop-editor .kl-workshop-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.kl-workshop-editor .kl-workshop-fields :is(h3,fieldset,p,.kl-workshop-editor-wide,.kl-workshop-editor-review) { grid-column: 1 / -1; }
.kl-workshop-editor .kl-workshop-fields > h3 { margin: 0; font-size: 14px; }
.kl-workshop-editor .kl-workshop-fields > p { margin: 0; color: var(--kl-muted); font-size: 11px; line-height: 1.6; }
.kl-workshop-editor .kl-workshop-fields label { gap: 6px; color: var(--kl-text); font-size: 12px; line-height: 1.5; }
.kl-workshop-page .kl-workshop-editor label > :is(input:not([type="checkbox"]), select, textarea) {
  width: 100%;
  min-height: 36px;
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--kl-input-bg);
  color: var(--kl-text);
  font-size: 12px;
}
.kl-workshop-page .kl-workshop-editor label > textarea { min-height: 88px; }
.kl-workshop-editor-counter { align-self: flex-end; color: var(--kl-muted); font-size: 10px; }
.kl-workshop-editor-field-hint { color: var(--kl-muted); font-size: 10px; line-height: 1.7; }
.kl-workshop-editor .kl-workshop-fields > .kl-workshop-editor-type-field {
  display: block;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.kl-workshop-editor-type-field legend { margin-bottom: 8px; padding: 0; font-size: 12px; }
.kl-workshop-editor-types { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.kl-workshop-page .kl-workshop-editor-types > button {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) 14px;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--kl-input-bg);
  font-size: 11px;
  font-weight: 550;
  line-height: 1.4;
  text-align: start;
  overflow-wrap: anywhere;
}
.kl-workshop-page .kl-workshop-editor-types > button:hover { background: var(--kl-surface-hover); }
.kl-workshop-page .kl-workshop-editor-types > button[aria-pressed="true"] {
  border-color: color-mix(in srgb, var(--kl-accent) 58%, var(--kl-border));
  background: color-mix(in srgb, var(--kl-accent) 12%, var(--kl-surface));
}
.kl-workshop-editor-types > button > svg { width: 18px; height: 18px; color: var(--kl-muted); }
.kl-workshop-editor-type-check { display: grid; place-items: center; color: var(--kl-gold); }
.kl-workshop-editor-type-check svg { width: 14px; height: 14px; }
.kl-workshop-editor-review { min-width: 0; padding: 14px; border: 1px solid var(--kl-border); border-radius: 10px; background: var(--kl-surface); }
.kl-workshop-editor-review-head { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; align-items: center; gap: 10px; }
.kl-workshop-editor-review-head > .kl-workshop-type-preview { width: 40px; height: 40px; margin: 0; border-radius: 8px; }
.kl-workshop-editor-review-head > .kl-workshop-type-preview > span { display: none; }
.kl-workshop-editor-review-head > .kl-workshop-type-preview > svg { width: 18px; height: 18px; }
.kl-workshop-editor-review-head h3 { margin: 0; }
.kl-workshop-editor-review-head p { margin: 3px 0 0; color: var(--kl-muted); }
.kl-workshop-editor-footer { flex-wrap: wrap; border-top: 1px solid var(--kl-border); background: var(--kl-input-bg); }
.kl-workshop-page .kl-workshop-editor-footer > button, .kl-workshop-page .kl-workshop-editor-warning button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  max-width: 100%;
  min-height: 36px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
}
.kl-workshop-editor-footer button > svg { width: 15px; height: 15px; }
.kl-workshop-page .kl-workshop-editor-footer > .kl-workshop-editor-primary { margin-inline-start: auto; background: var(--kl-accent); border-color: var(--kl-accent); color: var(--kl-accent-foreground); font-weight: 650; }
.kl-workshop-editor-count { margin-inline-start: auto; color: var(--kl-muted); font-size: 10px; }
.kl-workshop-editor-autosave { flex: 1 1 112px; min-width: 0; }
.kl-workshop-editor-autosave p { margin: 0; color: var(--kl-muted); font-size: 10px; line-height: 1.5; }
.kl-workshop-editor-warning { flex: none; max-height: 30%; overflow: auto; padding: 8px 12px; border-top: 1px solid var(--kl-border); background: var(--kl-surface-2); }
.kl-workshop-editor-warning p { margin: 0 0 8px; }
.kl-workshop-editor-warning-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.kl-workshop-editor-error { color: var(--kl-danger); }
.kl-workshop-editor-warning:empty, .kl-workshop-editor-error:empty { display: none; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-workshop-editor-header, .kl-workshop-editor-footer { padding: 10px 12px; }
  .kl-workshop-editor-body { padding: 12px; }
  .kl-workshop-editor-steps { margin: -12px -12px 12px; padding: 12px; }
  .kl-workshop-page .kl-workshop-editor-header h2 { font-size: 15px; }
  .kl-workshop-page .kl-workshop-editor-close { width: 40px; height: 40px; }
  .kl-workshop-page .kl-workshop-editor label > :is(input:not([type="checkbox"]), select, textarea) { min-height: 40px; font-size: 16px; }
  .kl-workshop-page .kl-workshop-editor-footer > button { min-height: 40px; padding-inline: 9px; }
  .kl-workshop-editor-count { display: none; }
}
@container kl-panel (width <= 600px) {
  .kl-workshop-editor .kl-workshop-fields { grid-template-columns: minmax(0, 1fr); }
  .kl-workshop-editor-autosave { flex-basis: 100%; order: -1; }
}
@container kl-panel (width <= 480px) {
  .kl-workshop-page .kl-workshop-editor-types > button { min-height: 54px; gap: 8px; padding: 8px; }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-workshop-editor-steps { padding-block: 8px; }
}
@media (pointer: coarse) {
  .kl-workshop-page .kl-workshop-editor-close { width: 44px; height: 44px; }
  .kl-workshop-page .kl-workshop-editor-footer > button, .kl-workshop-page .kl-workshop-editor-warning button { min-height: 44px; }
}
`;
