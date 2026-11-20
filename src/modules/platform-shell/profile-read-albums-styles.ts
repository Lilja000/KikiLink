export const PROFILE_READ_ALBUMS_STYLES = `
.kl-addon-profile-card .kl-albums--profile { padding: 0; }
.kl-albums--profile { font-size: 12px; line-height: 1.5; }
.kl-addon-profile-dialog .kl-albums--profile .kl-al-content:has(> .kl-al-heading) { margin-top: 16px; }
.kl-albums--profile .kl-al-content:has(> .kl-al-heading) { padding: 16px; }
.kl-albums--profile .kl-al-heading h2 { font-size: 15px; font-weight: 650; line-height: 1.4; letter-spacing: -.2px; }
.kl-albums--profile .kl-al-grid { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
.kl-albums--profile .kl-al-cover { height: 124px; }
.kl-albums--profile .kl-al-count { justify-content: center; }
.kl-albums--profile .kl-al-copy h3 { font-weight: 650; }
.kl-albums--profile .kl-al-content > .kl-al-note { margin-top: 0; }
.kl-albums--profile .kl-al-empty { display: flex; flex-direction: column; align-items: flex-start; }
.kl-albums--profile .kl-al-empty h3 { font-size: 13px; font-weight: 650; }
.kl-albums--profile .kl-al-content > .kl-al-empty p { font-size: 12px; line-height: 1.75; }
.kl-albums--profile > .kl-al-status:not(:empty) { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.kl-albums--profile :is(.kl-al-content,.kl-al-view-dialog) .kl-icon { stroke-width: 1.65; }
.kl-albums--profile :is(.kl-al-heading,.kl-al-card > .kl-al-actions,.kl-al-view-actions) > .kl-text-button {
 display: inline-flex; align-items: center; justify-content: center; gap: 8px;
 height: 36px; min-height: 32px; padding: 0 12px; border-radius: 8px;
 font-weight: 550; line-height: 1.5; white-space: nowrap;
}
.kl-albums--profile .kl-al-heading > .kl-text-button { font-size: 11px; }
.kl-albums--profile .kl-al-card > .kl-al-actions > .kl-text-button { font-size: 10px; }
.kl-albums--profile :is(.kl-al-heading,.kl-al-card > .kl-al-actions) > .kl-text-button .kl-icon { width: 16px; height: 16px; }
.kl-albums--profile :is(.kl-al-heading,.kl-al-view-actions) > .kl-text-button--primary { font-weight: 650; box-shadow: none; }
.kl-albums--profile :is(.kl-al-card > .kl-al-actions,.kl-al-view-actions) > .kl-text-button:not(.kl-text-button--primary) { background: transparent; }
.kl-albums--profile :is(.kl-al-card > .kl-al-actions,.kl-al-view-actions) > .kl-text-button:not(.kl-text-button--primary):hover { background: var(--kl-surface-hover); }
.kl-albums--profile :is(.kl-al-content,.kl-al-view-dialog) button:focus-visible {
 outline: 2px solid color-mix(in srgb,var(--kl-accent) 52%,white); outline-offset: 3px;
}
.kl-albums--profile .kl-al-cover :is(.kl-al-placeholder,.kl-al-image > button):focus-visible { outline-offset: -3px; }

.kl-albums--profile .kl-al-view-dialog { background: var(--kl-surface); font: inherit; }
.kl-albums--profile .kl-al-view-heading { min-height: 0; padding: 12px 16px; }
.kl-albums--profile .kl-al-view-heading h2 { font-size: 16px; font-weight: 700; line-height: 1.4; letter-spacing: -.2px; }
.kl-albums--profile .kl-al-view-heading .kl-al-kicker { color: var(--kl-meta); font-size: 10px; line-height: 1.7; letter-spacing: .25px; }
.kl-albums--profile .kl-al-view-heading .kl-icon-button {
 width: 32px; height: 32px; min-width: 32px; min-height: 32px; padding: 0; border: 0; border-radius: 8px; color: var(--kl-muted);
}
.kl-albums--profile .kl-al-view-heading .kl-icon-button:hover { color: var(--kl-text); }
.kl-albums--profile .kl-al-view-heading .kl-icon-button .kl-icon { width: 16px; height: 16px; }
.kl-albums--profile .kl-al-view-body { padding: 16px; scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent; }
.kl-albums--profile .kl-al-view-body > .kl-al-note { color: var(--kl-meta); line-height: 1.5; }
.kl-albums--profile .kl-al-view-actions { min-height: 0; padding: 12px 16px; }
.kl-albums--profile .kl-al-view-actions > .kl-text-button:not(.kl-text-button--primary) { color: var(--kl-muted); }
.kl-albums--profile .kl-al-view-actions > .kl-text-button:not(.kl-text-button--primary):hover { color: var(--kl-text); }
.kl-albums--profile .kl-al-photos:has(> figure:not(:only-child)) { grid-template-columns: repeat(2,minmax(0,1fr)); }
.kl-albums--profile .kl-al-photos .kl-al-image:has(> button:hover) { border-color: var(--kl-border-strong); }
.kl-albums--profile .kl-al-photos .kl-al-image > button:has(img):focus-visible { outline-offset: -3px; }
.kl-albums--profile .kl-al-photos:has(> figure:only-child) img { height: auto; }
.kl-profile-view-as .kl-al-image .kl-cloud-image-wrap {
 display: grid; place-items: center; width: 100%; height: 100%; min-width: 0; min-height: 0; overflow: hidden;
}
.kl-profile-view-as .kl-al-image .kl-cloud-full-image { width: 100%; height: 100%; }
.kl-profile-view-as .kl-al-cover .kl-al-image img.kl-cloud-image { height: 100%; max-height: none; object-fit: cover; }
.kl-profile-view-as .kl-al-photos .kl-al-image img.kl-cloud-image { max-height: 100%; object-fit: contain; }

@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
 .kl-albums--profile .kl-al-content:has(> .kl-al-heading) { padding: 12px; }
 .kl-albums--profile .kl-al-grid { grid-template-columns: minmax(0,1fr); gap: 10px; }
 .kl-albums--profile .kl-al-cover { height: 138px; }
 .kl-albums--profile :is(.kl-al-heading,.kl-al-card > .kl-al-actions,.kl-al-view-actions) > .kl-text-button { height: 40px; min-height: 40px; }
 .kl-albums--profile :is(.kl-al-view-heading,.kl-al-view-actions) { padding: 10px 12px; }
 .kl-albums--profile .kl-al-view-heading h2 { font-size: 15px; }
 .kl-albums--profile .kl-al-view-heading .kl-icon-button { width: 40px; height: 40px; min-width: 40px; min-height: 40px; }
 .kl-albums--profile .kl-al-view-body { padding: 12px; }
 .kl-albums--profile .kl-al-photos { gap: 6px; }
 .kl-albums--profile .kl-al-photos .kl-al-image { height: 130px; }
}
@container kl-panel (width <= 390px) {
 .kl-albums--profile .kl-al-photos:has(> figure:not(:only-child)) { grid-template-columns: minmax(0,1fr); }
}
@container kl-panel (width > 700px) and (width <= 900px) and (height <= 500px) {
 .kl-albums--profile .kl-al-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
}
@media (pointer: coarse) {
 .kl-albums--profile :is(.kl-al-heading,.kl-al-card > .kl-al-actions,.kl-al-view-actions) > .kl-text-button,
 .kl-albums--profile .kl-al-view-heading .kl-icon-button { min-height: 44px; }
 .kl-albums--profile .kl-al-view-heading .kl-icon-button { min-width: 44px; }
}
`;
