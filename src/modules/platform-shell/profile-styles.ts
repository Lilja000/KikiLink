import { PROFILE_READ_SOCIAL_STYLES } from './profile-read-social-styles';
import { PROFILE_READ_CONTENT_STYLES } from './profile-read-content-styles';

/** Platform profile page, visitor overlay and the existing profile editor. */
export const PROFILE_STYLES = `

.kl-presence-dialog, .kl-addon-profile-dialog { width: min(660px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); border-radius: 14px; }
.kl-presence-dialog .kl-dialog-header, .kl-addon-profile-dialog .kl-dialog-header { padding: 12px 16px; }
.kl-presence-dialog .kl-dialog-subtitle, .kl-addon-profile-dialog .kl-dialog-subtitle { display: none; }
.kl-presence-dialog .kl-dialog-actions { padding: 10px 16px; }
.kl-presence-body { padding: 12px; gap: 12px; overflow-x: hidden; }
.kl-platform-profile-hero.kl-profile-appearance-preview { display: block; padding: 0; min-height: 0; overflow: hidden; border: 1px solid var(--kl-profile-outline,var(--kl-border)); border-radius: 12px; }
.kl-platform-profile-hero .kl-profile-banner-preview { height: clamp(90px, 22vw, 150px); min-height: 0; aspect-ratio: auto; border: 0; border-radius: 0; background: var(--kl-profile-banner); }
.kl-platform-profile-identity { display: grid; grid-template-columns: 76px minmax(0, 1fr); align-items: center; gap: 14px; padding: 16px; }
.kl-platform-profile-identity .kl-profile-avatar-preview { width: 72px; height: 72px; border-radius: 50%; }
.kl-platform-profile-identity > div { min-width: 0; }
.kl-platform-profile-identity .kl-search { width: 100%; font-size: 18px; font-weight: 700; }
.kl-platform-profile-member { display: block; margin-top: 5px; color: var(--kl-profile-muted, var(--kl-muted)); font-size: 11px; }
.kl-platform-profile-sections { min-width: 0; }
.kl-platform-profile-tabs { display: flex; gap: 4px; overflow-x: auto; padding: 2px 0 8px; border-bottom: 1px solid var(--kl-border); scrollbar-width: thin; }
.kl-platform-profile-tabs > button { flex: 0 0 auto; min-height: 36px; padding: 7px 10px; border: 1px solid transparent; border-radius: 7px; color: var(--kl-muted); background: transparent; font: inherit; font-size: 12px; cursor: pointer; }
.kl-platform-profile-tabs > button[aria-selected="true"] { color: var(--kl-text); border-color: var(--kl-border); background: var(--kl-surface-2); }
.kl-platform-profile-tabs > button:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: -2px; }
.kl-platform-profile-section { display: grid; gap: 14px; min-width: 0; padding: 14px 2px 4px; }
.kl-platform-profile-section[hidden] { display: none; }
.kl-username-field[hidden], .kl-username-field .kl-profile-field-required[hidden] { display: none; }
.kl-username-field .kl-search { width: 100%; min-width: 0; }
.kl-username-field .kl-custom-field-help { overflow-wrap: anywhere; }
.kl-platform-profile-section .kl-profile-avatar-field { display: block; }
.kl-platform-profile-section .kl-profile-customization-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.kl-platform-profile-section .kl-profile-customization-card { min-width: 0; padding: 12px; border-radius: 9px; }
.kl-platform-profile-section .kl-presence-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.kl-presence-dialog .kl-unified-profile { gap: 8px; padding: 0; border: 0; }
.kl-presence-dialog .kl-profile-sync-status { margin: 0; font-size: 12px; }
.kl-addon-profile-body { padding: 12px; }
.kl-addon-profile-card { border-radius: 12px; --kl-profile-banner-height: clamp(90px, 22vw, 150px); }
.kl-addon-profile-hero { grid-template-columns: 84px minmax(0, 1fr); gap: 14px; padding: calc(var(--kl-profile-banner-height) + 16px) 16px 16px; }
.kl-addon-profile-avatar-shell { width: 80px; height: 80px; padding: 3px; border-radius: 50%; }
.kl-addon-profile-avatar { width: 72px; height: 72px; border-radius: 50%; font-size: 22px; }
.kl-addon-profile-identity { padding-top: 0; min-width: 0; }
.kl-addon-profile-identity h2 { font-size: 20px; overflow-wrap: anywhere; }
.kl-addon-profile-username { margin: 3px 0 0; font-size: 11px; color: var(--kl-profile-muted, var(--kl-muted)); overflow-wrap: anywhere; }
.kl-addon-profile-facts { margin: 0 16px 12px; padding: 0; gap: 8px; }
.kl-addon-profile-bio, .kl-addon-profile-private { margin: 0 16px 12px; padding: 12px; border-radius: 8px; }
.kl-addon-profile-actions { padding: 0 16px 16px; gap: 8px; }
.kl-platform-profile-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.kl-platform-profile-tags > span { padding: 3px 7px; border: 1px solid var(--kl-profile-border); border-radius: 5px; font-size: 11px; overflow-wrap: anywhere; }
@media (max-width: 540px) {
  .kl-platform-profile-identity { grid-template-columns: 60px minmax(0, 1fr); gap: 12px; padding: 14px; }
  .kl-platform-profile-identity .kl-profile-avatar-preview { width: 56px; height: 56px; }
  .kl-platform-profile-identity .kl-search { font-size: 16px; }
  .kl-platform-profile-section .kl-profile-customization-grid { grid-template-columns: minmax(0, 1fr); }
  .kl-addon-profile-hero { grid-template-columns: 64px minmax(0, 1fr); gap: 12px; padding: calc(var(--kl-profile-banner-height) + 14px) 14px 14px; }
  .kl-addon-profile-avatar-shell { width: 60px; height: 60px; }
  .kl-addon-profile-avatar { width: 52px; height: 52px; }
  .kl-addon-profile-facts { grid-template-columns: minmax(0, 1fr); margin-inline: 14px; }
  .kl-addon-profile-bio, .kl-addon-profile-private { margin-inline: 14px; }
  .kl-addon-profile-actions { padding-inline: 14px; }
}
@media (max-height: 480px) {
  .kl-presence-dialog, .kl-addon-profile-dialog { max-height: calc(100dvh - 16px); }
  .kl-presence-dialog .kl-dialog-header, .kl-presence-dialog .kl-dialog-actions { padding-block: 8px; }
  .kl-platform-profile-hero .kl-profile-banner-preview { height: 70px; }
  .kl-addon-profile-card { --kl-profile-banner-height: 70px; }
}

/* The shared profile sheet sits over the current workspace. */
.kl-addon-profile-dialog[open] { position:fixed;inset:0;margin:auto;display:flex;flex-direction:column;width:680px;max-width:calc(100vw - 32px);max-height:min(760px,calc(100dvh - 32px));min-height:0;overflow:hidden;border:1px solid var(--kl-border-strong);border-radius:12px;background:var(--kl-surface);box-shadow:0 20px 64px #0009;font-size:12px;line-height:1.5;container:kl-profile-sheet / inline-size; }
.kl-addon-profile-dialog::backdrop { background:#0009; }
.kl-addon-profile-dialog .kl-addon-profile-dialog-header { position:absolute;top:8px;inset-inline-end:10px;z-index:8;padding:0;border:0;background:transparent; }
.kl-addon-profile-dialog-header > button { width:36px;height:36px;min-height:36px;padding:0;border-radius:8px;border:1px solid var(--kl-border-strong);background:var(--kl-panel-bg);color:var(--kl-muted); }
.kl-addon-profile-dialog-header > button:hover { background:var(--kl-surface-hover);color:var(--kl-text); }
.kl-addon-profile-dialog-header > button > .kl-icon { width:16px;height:16px;stroke-width:1.65; }
.kl-addon-profile-dialog-header .kl-dialog-heading { position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%); }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
 .kl-addon-profile-dialog[open] { border-radius:10px; }
}
.kl-addon-profile-body { padding:16px;flex:1;min-height:0;scrollbar-gutter:auto; }
.kl-addon-profile-card { --kl-profile-banner-height:120px;border-radius:8px;box-shadow:none;overflow:visible; }
.kl-addon-profile-hero { grid-template-columns:64px minmax(0,1fr);gap:12px;padding:calc(var(--kl-profile-banner-height) + 16px) 12px 12px; }
.kl-addon-profile-banner { border-radius:8px 8px 0 0; }
.kl-addon-profile-avatar-shell { width:64px;height:64px;padding:0;border:0;box-shadow:none;background:transparent; }
.kl-addon-profile-avatar { width:64px;height:64px; }
.kl-addon-profile-avatar>.kl-cloud-image-wrap>img { width:100%;height:100%;object-fit:cover;border-radius:inherit; }
.kl-addon-profile-avatar-shell>.kl-presence-dot { width:13px;height:13px;border-width:2px;right:0;bottom:0; }
.kl-addon-profile-identity h2 { display:block;overflow:visible;-webkit-line-clamp:unset;white-space:normal;font-family:inherit;font-size:19px;line-height:1.3;margin:0; }
.kl-addon-profile-member,.kl-addon-profile-username { font-size:11px;margin:2px 0 0; }
.kl-addon-profile-badges { gap:4px;margin-top:5px;min-height:0; }
.kl-addon-profile-badges:empty { display:none; }
.kl-addon-profile-badges .kl-legacy-profile-badge { width:24px;height:24px;padding:2px;border:0;background:transparent; }
.kl-addon-profile-admin-badge { display:inline-grid;place-items:center;flex:none;width:24px;height:24px;border-radius:5px;color:var(--kl-gold); }
.kl-addon-profile-admin-badge > .kl-icon { width:18px;height:18px;stroke-width:1.65; }
.kl-addon-profile-admin-badge:is(:hover,:focus-visible) { background:var(--kl-surface-hover); }
.kl-addon-profile-admin-badge:focus-visible { outline:2px solid var(--kl-accent);outline-offset:2px; }
.kl-addon-profile-status { font-size:11px;gap:6px;margin-top:6px; }
.kl-addon-profile-status-control { justify-self:start;max-width:100%;min-height:30px;margin:4px 0 0 -6px;padding:4px 6px;border:1px solid transparent;border-radius:6px;background:transparent;font:inherit;font-size:11px;text-align:left;cursor:pointer; }
.kl-addon-profile-status-control:hover { border-color:var(--kl-profile-border);background:var(--kl-surface-hover); }
.kl-addon-profile-status-control:focus-visible { outline:2px solid var(--kl-accent);outline-offset:2px; }
.kl-addon-profile-status-primary { display:inline-flex;align-items:center;gap:6px;flex:none;color:var(--kl-profile-text); }
.kl-addon-profile-status-control > .kl-addon-profile-custom-status { overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.kl-addon-profile-status-chevron { width:6px;height:6px;flex:none;margin:0 3px 3px 1px;border:solid currentColor;border-width:0 1px 1px 0;transform:rotate(45deg); }
.kl-addon-profile-actions { display:flex;flex-wrap:wrap;padding:0 12px 10px;align-items:center;gap:8px; }
.kl-addon-profile-actions>.kl-addon-profile-action { width:auto;flex:1 1 100px;min-height:36px;font-size:11px; }
.kl-addon-profile-actions>.kl-relationship-controls { width:auto;flex:1 1 130px;min-width:0; }
.kl-addon-profile-actions .kl-friend-action { min-width:0;flex:1;min-height:36px;font-size:11px;padding:6px 8px; }
.kl-addon-profile-actions .kl-relationship-controls>.kl-social-menu>summary { width:28px;min-height:36px; }
.kl-addon-profile-actions>.kl-profile-edit-link:first-child { margin-right:auto; }
.kl-profile-edit-link { border:0;background:transparent;color:var(--kl-profile-text,var(--kl-text));font:inherit;font-size:11px;cursor:pointer;padding:6px 2px;min-height:32px; }
.kl-profile-edit-link:hover { text-decoration:underline; }
.kl-profile-edit-link:focus-visible,.kl-profile-options>summary:focus-visible { outline:2px solid var(--kl-accent);outline-offset:2px; }
.kl-profile-options { position:relative;margin-left:auto; }
.kl-profile-options>summary { list-style:none;cursor:pointer;display:grid;place-items:center;min-width:34px;min-height:34px;border-radius:6px; }
.kl-profile-options>summary::-webkit-details-marker { display:none; }
.kl-profile-options-menu { position:absolute;right:0;top:100%;z-index:7;display:grid;gap:4px;min-width:180px;padding:8px;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-panel-bg);box-shadow:0 10px 28px #0008; }
.kl-addon-profile-actions .kl-profile-options-menu { width:230px;max-width:calc(100vw - 32px);min-width:0;padding:4px;gap:0;border-color:var(--kl-border-strong);background:var(--kl-surface); }
.kl-dialog.kl-content-dialog.kl-local-restriction-dialog { position:fixed;margin:auto;width:540px;height:max-content;min-height:223px;padding:0;border-radius:10px; }
.kl-local-restriction-dialog .kl-dialog-title::before { content:"KIKILINK";display:block;color:var(--kl-muted);font-size:9px;letter-spacing:.1em; }
.kl-local-restriction-dialog .kl-dialog-body { display:flex;flex:1;padding:0; }
@media (max-width:700px), (max-width:900px) and (max-height:500px) { .kl-dialog.kl-content-dialog.kl-local-restriction-dialog { min-height:230px; } }
.kl-local-restriction-dialog .kl-dialog-header { padding:12px 16px;background:var(--kl-surface); }
.kl-local-restriction-dialog .kl-dialog-title { font-family:inherit;font-weight:600;font-size:16px;line-height:1.4; }
.kl-local-restriction-dialog .kl-dialog-header > button { border-color:transparent;background:transparent; }
.kl-local-restriction { display:flex;flex:1;flex-direction:column;gap:8px;font-size:12px;line-height:1.5; }
.kl-local-restriction p { margin:0;padding:0 16px; }
.kl-local-restriction p:first-child { margin-top:16px; }
.kl-local-restriction p + p { color:var(--kl-muted); }
.kl-local-restriction footer { display:flex;justify-content:space-between;gap:8px;margin-top:auto;padding:12px 16px;border-top:1px solid var(--kl-border); }
@media (max-width:700px), (max-width:900px) and (max-height:500px) {
  .kl-local-restriction-dialog .kl-dialog-header { padding-block:10px; }
  .kl-local-restriction footer { padding-block:8px; }
  .kl-local-restriction p:first-child { margin-top:12px; }
}
.kl-local-restriction .kl-local-restrict-confirm { border-color:var(--kl-danger);color:var(--kl-danger); }
.kl-profile-menu-heading { display:grid;gap:3px;padding:9px 10px;border-bottom:1px solid var(--kl-border);font-size:11px; }
.kl-profile-menu-heading small { color:var(--kl-muted);font-size:10px; }
.kl-addon-profile-actions .kl-profile-options-menu > button { display:flex;align-items:center;gap:8px;min-height:34px;border:0;border-radius:5px;background:transparent;color:var(--kl-text);font:inherit;font-size:12px; }
.kl-addon-profile-actions .kl-profile-options-menu > button:hover { background:var(--kl-surface-hover); }
.kl-profile-options-menu > button > .kl-icon { width:14px;height:14px;flex:none; }
.kl-profile-options-menu .kl-addon-profile-action { width:100%; }
.kl-profile-options:not([open]) > .kl-profile-options-menu { display:none; }
.kl-profile-options-menu > button { width:100%;text-align:left;white-space:normal;min-height:36px;padding:8px 10px; }
.kl-profile-options-menu > .kl-profile-view-as-control { display:grid;gap:6px;padding:8px 10px;border-top:1px solid var(--kl-border);font-size:11px; }
.kl-profile-options-menu > .kl-profile-view-as-control select { max-width:100%;color:var(--kl-text);background:var(--kl-surface);border:1px solid var(--kl-border);border-radius:5px;padding:6px; }
.kl-profile-section-heading > .kl-profile-options { flex:0 0 auto; }
.kl-profile-section-heading .kl-profile-options > summary { min-width:28px;min-height:28px; }
.kl-profile-appearance-sections > .kl-platform-profile-tabs { display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;padding:0 0 10px; }
.kl-profile-appearance-sections > .kl-platform-profile-tabs > button { padding-inline:4px; }
.kl-profile-appearance-sections .kl-profile-customization-card { border:0;background:none;padding:0;border-radius:0; }
.kl-profile-appearance-sections .kl-platform-profile-section { padding-top:10px; }
.kl-unified-profile:empty,.kl-profile-sync-status:empty { display:none; }
.kl-profile-timezone-field { display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:12px; }
.kl-profile-timezone-field > select { width:auto;min-width:140px;max-width:65%; }
/* Prototype17 profile editor: the real controls use the same four-tab shell,
   five-part appearance editor and bounded draft/saved preview. */
.kl-presence-dialog { width:min(820px,calc(100vw - 24px));max-width:100%;height:min(700px,calc(100dvh - 32px));max-height:calc(100dvh - 32px);border-radius:12px; }
.kl-panel[data-platform-preview="true"] :is(.kl-presence-dialog,.kl-unsaved-dialog) { position:fixed;inset:0;margin:auto; }
.kl-presence-dialog .kl-dialog-header { flex:none;padding:12px 16px; }
.kl-presence-dialog .kl-dialog-title { font-size:16px; }
.kl-presence-dialog .kl-presence-body { flex:1;padding:16px;gap:14px;scrollbar-gutter:stable; }
.kl-presence-dialog .kl-presence-body:has([data-profile-section="appearance"]:not([hidden])) { padding-bottom:16px; }
.kl-presence-dialog .kl-dialog-actions { flex:none;flex-wrap:wrap;gap:8px;padding:12px 16px; }
.kl-dialog-action-spacer { flex:1;min-width:0; }
.kl-profile-save-hint { min-width:0;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.kl-presence-body > .kl-platform-profile-sections > .kl-platform-profile-tabs { align-items:stretch;gap:4px;overflow-x:auto;margin:-16px -16px 16px;padding:8px 14px;border-bottom:1px solid var(--kl-border);background:var(--kl-input-bg); }
.kl-presence-body > .kl-platform-profile-sections > .kl-platform-profile-tabs > button { flex:none;min-height:32px;padding:0 9px;border:1px solid transparent;border-radius:6px;color:var(--kl-muted);background:transparent;font-size:11px;white-space:nowrap; }
.kl-presence-body > .kl-platform-profile-sections > .kl-platform-profile-tabs > button:hover { color:var(--kl-text);background:var(--kl-surface-hover); }
.kl-presence-body > .kl-platform-profile-sections > .kl-platform-profile-tabs > button[aria-selected="true"] { color:var(--kl-text);border-color:color-mix(in srgb,var(--kl-accent) 38%,transparent);background:color-mix(in srgb,var(--kl-accent) 12%,var(--kl-surface-2)); }
.kl-presence-body > .kl-platform-profile-sections > .kl-platform-profile-section { padding:0; }
.kl-presence-body [data-profile-section="about"] { grid-template-columns:repeat(2,minmax(0,1fr));gap:14px; }
.kl-presence-body [data-profile-section="about"] > * { grid-column:1 / -1;min-width:0; }
.kl-presence-body [data-profile-section="about"] > :is(.kl-profile-display-name,.kl-username-field,.kl-profile-details-editor,.kl-profile-tags-field) { grid-column:auto; }
.kl-presence-body [data-profile-section="about"]:has(.kl-username-field[hidden]) > .kl-profile-display-name { grid-column:1 / -1; }
.kl-profile-display-name .kl-search { width:100%;min-width:0; }
.kl-profile-language-picker { grid-column:1 / -1; }
.kl-profile-presence-controls { grid-column:1 / -1;border:1px solid var(--kl-border);border-radius:8px; }
.kl-profile-presence-controls > summary { padding:12px;cursor:pointer;font-size:12px;font-weight:600; }
.kl-profile-presence-controls > div { display:grid;gap:14px;padding:0 12px 12px;min-width:0; }
.kl-profile-presence-controls:not([open]) > div { display:none; }
.kl-profile-presence-controls .kl-profile-timezone-field { display:grid;gap:6px; }
.kl-profile-appearance-workspace { display:grid;grid-template-columns:minmax(0,.86fr) minmax(0,1.2fr);gap:16px;align-items:start;min-width:0;font-size:var(--kl-type-body);line-height:1.5; }
.kl-profile-preview-column,.kl-profile-appearance-sections { min-width:0; }
.kl-profile-preview-column { position:sticky;top:0; }
.kl-profile-preview-heading { display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:32px;margin-bottom:8px; }
.kl-profile-preview-heading > span { display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600; }
.kl-profile-preview-heading > span > .kl-icon { width:14px;height:14px;color:var(--kl-gold); }
.kl-profile-preview-heading > .kl-profile-preview-toggle { display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:30px;height:30px;padding:4px 8px;border-radius:8px;font-size:10px;font-weight:550;color:var(--kl-muted);white-space:nowrap; }
.kl-profile-preview-heading > .kl-profile-preview-toggle:not(:hover) { background:transparent; }
.kl-profile-preview-toggle > .kl-profile-preview-chevron { flex:none;width:16px;height:16px;color:var(--kl-gold);stroke-width:2;transition:transform 150ms ease; }
.kl-profile-preview-toggle[aria-expanded="true"] > .kl-profile-preview-chevron { transform:rotate(180deg); }
.kl-profile-preview-compare { display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:3px;margin-bottom:8px;border:1px solid var(--kl-border);border-radius:7px;background:var(--kl-input-bg); }
.kl-profile-preview-choice { min-width:0;min-height:32px;height:30px;padding:4px 8px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--kl-muted);font:inherit;font-size:11px;font-weight:550;cursor:pointer; }
.kl-profile-preview-choice:hover { color:var(--kl-text);background:var(--kl-surface-hover); }
.kl-profile-preview-choice.active,.kl-profile-preview-choice[aria-pressed="true"] { color:var(--kl-text);border-color:var(--kl-border-strong);background:var(--kl-surface-2); }
.kl-profile-preview-caption { padding:10px 0 0;color:var(--kl-muted);font-size:10px; }
.kl-profile-draft-preview-host,.kl-profile-saved-preview-host { min-width:0; }
.kl-profile-preview-content[hidden],.kl-profile-draft-preview-host[hidden],.kl-profile-saved-preview-host[hidden] { display:none; }
.kl-profile-appearance-workspace[data-preview-collapsed="true"] { grid-template-columns:minmax(0,1fr); }
.kl-profile-appearance-workspace[data-preview-collapsed="true"] .kl-profile-preview-column { position:static; }
.kl-profile-appearance-workspace[data-preview-collapsed="true"] .kl-profile-preview-heading { margin-bottom:0; }
.kl-presence-dialog .kl-platform-profile-hero { border-radius:9px; }
.kl-presence-dialog .kl-platform-profile-hero .kl-profile-banner-preview { height:94px;min-height:94px; }
.kl-presence-dialog .kl-platform-profile-identity { grid-template-columns:62px minmax(0,1fr);padding:16px 14px 12px;gap:12px; }
.kl-presence-dialog .kl-platform-profile-identity .kl-profile-avatar-preview { width:62px;height:62px;font-size:24px;font-weight:600;line-height:normal; }
.kl-presence-dialog .kl-platform-profile-identity .kl-profile-avatar-preview[data-avatar-mode="none"] { border:1px solid var(--kl-border-strong); }
.kl-profile-editor-name { display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:19px;line-height:1.3; }
.kl-profile-appearance-preview .kl-profile-editor-name { font-weight:600;line-height:normal; }
.kl-profile-editor-identity-copy { min-width:0; }
.kl-profile-editor-identity-name { display:flex;align-items:center;gap:5px;min-width:0; }
.kl-profile-editor-identity-name .kl-addon-profile-admin-badge { flex:none;width:14px;height:14px;padding:0;color:var(--kl-gold); }
.kl-profile-editor-identity-name .kl-addon-profile-admin-badge .kl-icon { width:14px;height:14px; }
.kl-profile-editor-name[data-creator="true"] { color:var(--kl-gold); }
@media not (forced-colors:active) {
  .kl-profile-editor-name[data-creator="true"] {
    background:linear-gradient(100deg,#ed2844,#df654c 35%,#d8b65d 73%,#c4a354);
    background-clip:text;color:transparent;
  }
}
.kl-presence-dialog .kl-platform-profile-member { max-width:100%;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.kl-profile-appearance-preview .kl-platform-profile-member { line-height:1.5; }
.kl-profile-editor-badges { display:flex;flex-wrap:wrap;gap:4px;margin-top:5px; }
.kl-profile-editor-badges:empty { display:none; }
.kl-profile-editor-status { display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere;margin:8px 0 0;color:var(--kl-profile-meta,var(--kl-muted));font-size:11px;line-height:1.5; }
.kl-profile-appearance-sections > .kl-platform-profile-tabs { display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px;padding:4px;margin:0 0 16px;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-input-bg); }
.kl-profile-appearance-sections > .kl-platform-profile-tabs > button { display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-width:0;min-height:47px;height:47px;padding:5px 3px;border:1px solid transparent;border-radius:5px;color:var(--kl-muted);background:transparent;font-size:10px;font-weight:550;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.kl-profile-appearance-sections > .kl-platform-profile-tabs > button > .kl-icon { flex:none;width:14px;height:14px; }
.kl-profile-appearance-sections > .kl-platform-profile-tabs > button > span { max-width:100%;overflow:hidden;text-overflow:ellipsis; }
.kl-profile-appearance-sections > .kl-platform-profile-tabs > button:hover { color:var(--kl-text);background:var(--kl-surface-hover); }
.kl-profile-appearance-sections > .kl-platform-profile-tabs > button[aria-selected="true"] { color:var(--kl-text);border-color:var(--kl-border-strong);background:var(--kl-surface-2); }
.kl-profile-appearance-sections .kl-platform-profile-section { padding:0; }
.kl-profile-appearance-sections .kl-profile-customization-card { gap:12px;padding:0;border:0;border-radius:0;background:none; }
.kl-profile-appearance-sections .kl-profile-customization-heading strong { font-size:13px; }
.kl-profile-appearance-sections .kl-profile-banner-field:not(.kl-profile-banner-upload-editor) { padding:12px;border-radius:8px;background:var(--kl-input-bg); }
@media(max-width:700px) {
  .kl-presence-dialog { width:calc(100vw - 24px);height:calc(100dvh - 16px);max-height:calc(100dvh - 16px); }
  .kl-presence-dialog .kl-presence-body { padding:12px; }
  .kl-presence-dialog .kl-dialog-header,.kl-presence-dialog .kl-dialog-actions { padding:10px 12px; }
  .kl-presence-body > .kl-platform-profile-sections > .kl-platform-profile-tabs { margin:-12px -12px 12px;padding:8px 10px; }
  .kl-presence-body > .kl-platform-profile-sections > .kl-platform-profile-tabs > button { min-height:38px; }
  .kl-presence-body [data-profile-section="about"] { grid-template-columns:minmax(0,1fr); }
  .kl-profile-language-picker > legend { min-height:18px; }
  .kl-profile-language-picker .kl-profile-language-options { margin-bottom:14px; }
  .kl-profile-appearance-workspace { grid-template-columns:minmax(0,1fr);gap:12px; }
  .kl-profile-preview-column { position:static;padding:8px 10px;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-input-bg); }
  .kl-profile-preview-heading > .kl-profile-preview-toggle { min-height:40px;height:40px; }
  .kl-presence-dialog .kl-platform-profile-hero .kl-profile-banner-preview { height:72px;min-height:72px; }
  .kl-presence-dialog .kl-platform-profile-identity { grid-template-columns:46px minmax(0,1fr);padding:16px 12px 12px; }
  .kl-presence-dialog .kl-platform-profile-identity .kl-profile-avatar-preview { width:46px;height:46px;font-size:20px; }
  .kl-profile-editor-name { font-size:17px; }
  .kl-profile-editor-status { -webkit-line-clamp:1;margin-top:4px; }
  .kl-profile-appearance-sections > .kl-platform-profile-tabs { grid-template-columns:.85fr .9fr .75fr 1.35fr .95fr;gap:2px;padding:3px;margin-bottom:12px; }
  .kl-profile-appearance-sections > .kl-platform-profile-tabs > button { gap:3px;min-height:48px;height:48px;padding-inline:1px;font-size:10px;white-space:normal;line-height:1.2; }
  .kl-profile-save-hint { flex:1 1 80px;max-width:115px;font-size:10px;white-space:normal;line-height:1.4; }
  .kl-dialog-action-spacer { display:none; }
}
@media(max-height:500px) {
  .kl-presence-dialog { height:calc(100dvh - 16px);max-height:calc(100dvh - 16px); }
}
@media(min-width:701px) and (max-width:900px) and (max-height:500px) {
  .kl-presence-dialog .kl-presence-body { padding:12px; }
  .kl-presence-body > .kl-platform-profile-sections > .kl-platform-profile-tabs { margin:-12px -12px 12px;padding:8px 10px; }
  .kl-presence-body > .kl-platform-profile-sections > .kl-platform-profile-tabs > button { min-height:38px; }
  .kl-profile-preview-heading > span { line-height:1.5; }
  .kl-profile-preview-heading > .kl-profile-preview-toggle { min-height:40px;height:40px; }
  .kl-profile-appearance-sections > .kl-platform-profile-tabs { margin-bottom:8px; }
  .kl-presence-dialog .kl-platform-profile-identity { grid-template-columns:44px minmax(0,1fr);padding-inline:12px; }
  .kl-presence-dialog .kl-platform-profile-identity .kl-profile-avatar-preview { width:44px;height:44px;font-size:19px; }
  .kl-profile-editor-name { font-size:16px; }
  .kl-profile-editor-status { -webkit-line-clamp:1; }
}
@media(max-height:500px) and (min-width:701px) {
  .kl-profile-appearance-workspace { grid-template-columns:minmax(0,.78fr) minmax(0,1.3fr);gap:14px; }
  .kl-profile-appearance-sections > .kl-platform-profile-tabs > button { min-height:44px;height:44px; }
  .kl-profile-preview-heading { align-items:flex-start;flex-direction:column; }
}
.kl-profile-appearance-workspace[data-preview-collapsed="true"] { grid-template-columns:minmax(0,1fr); }
.kl-profile-appearance-workspace[data-preview-collapsed="true"] .kl-profile-preview-heading { align-items:center;flex-direction:row;margin-bottom:0; }
@media(prefers-reduced-motion:reduce) {
  .kl-profile-preview-chevron,.kl-profile-appearance-sections > .kl-platform-profile-tabs > button { transition:none; }
}
.kl-addon-profile-actions > .kl-addon-profile-action--primary:first-child { flex:0 1 auto;min-width:120px; }
@media(max-width:540px) { .kl-addon-profile-actions > .kl-addon-profile-action--primary:first-child { flex:1 1 auto; }.kl-profile-options-menu { max-width:calc(100vw - 64px); } }

.kl-addon-profile-facts { grid-template-columns:repeat(3,minmax(0,1fr));margin:0 12px;border-top:1px solid var(--kl-profile-border);border-bottom:1px solid var(--kl-profile-border);gap:8px; }
.kl-addon-profile-fact { padding:10px 0;border:0;border-radius:0;background:transparent;min-width:0; }
.kl-addon-profile-fact>span { font-size:10px;text-transform:none;letter-spacing:normal; }
.kl-addon-profile-fact strong { font-size:11px;overflow-wrap:anywhere; }
.kl-addon-profile-fact-value strong { white-space:normal;overflow:visible;min-width:0; }
.kl-profile-location>strong { white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere; }
.kl-profile-location .kl-text-button { font-size:11px;line-height:1.2;padding:6px 4px;white-space:normal;max-width:100%; }
.kl-addon-profile-card>.kl-platform-profile-sections { padding:0 12px 12px; }
.kl-addon-profile-card .kl-platform-profile-tabs { padding:4px 0 0;gap:16px; }
.kl-addon-profile-card .kl-platform-profile-tabs>button { min-height:38px;padding:6px 0;border:0;border-radius:0;font-size:11px;color:var(--kl-profile-muted); }
.kl-addon-profile-card .kl-platform-profile-tabs>button[aria-selected="true"] { border-bottom:2px solid var(--kl-accent);background:none;color:var(--kl-profile-text); }
.kl-addon-profile-card .kl-platform-profile-section { padding:8px 0 0; }
.kl-profile-overview { display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:16px; }
.kl-profile-overview-section { padding:8px 0;min-width:0; }
.kl-profile-overview-section .kl-platform-profile-tags { gap:5px; }
.kl-profile-overview-section .kl-platform-profile-tags:empty { display:none; }
.kl-profile-overview-section .kl-platform-profile-tags > span { padding:3px 6px;border-radius:4px;font-size:10px;line-height:1.3;color:var(--kl-profile-muted);background:#d6a24b07; }
.kl-profile-section-heading { display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:32px;margin-bottom:8px; }
.kl-profile-section-heading h3 { margin:0;font-size:13px;line-height:1.35; }
.kl-profile-section-note { font-size:12px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--kl-profile-muted,var(--kl-muted));margin:0; }
.kl-profile-matching-signal,.kl-profile-matching-common-ground { margin-top:12px;padding:14px;border:1px solid var(--kl-profile-border,var(--kl-border));border-radius:8px;background:var(--kl-profile-bg,var(--kl-surface)); }
:is(.kl-profile-matching-signal,.kl-profile-matching-common-ground)[hidden] { display:none; }
:is(.kl-profile-matching-signal,.kl-profile-matching-common-ground) .kl-profile-section-heading { flex-wrap:wrap;margin-bottom:12px; }
.kl-profile-matching-signal .kl-profile-section-note { font-size:11px;line-height:1.7; }
:is(.kl-profile-matching-signal,.kl-profile-matching-common-ground) .kl-text-button { flex:none;font-size:11px; }
.kl-profile-matching-actions { display:flex;flex-wrap:wrap;gap:8px;margin-top:12px; }
.kl-profile-matching-common-ground .kl-match-reasons { margin-bottom:0;overflow-wrap:anywhere; }
.kl-profile-overview .kl-profile-communities .kl-profile-section-heading > .kl-text-button { flex:none;min-height:32px;padding:0;border:0;background:none;font-size:11px;font-weight:400; }
.kl-profile-overview .kl-profile-communities .kl-profile-section-heading > .kl-text-button:hover { text-decoration:underline; }
.kl-profile-details { display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;font-size:11px;line-height:1.6;margin:0; }
.kl-profile-details dt { color:var(--kl-profile-muted); }.kl-profile-details dd { margin:0;overflow-wrap:anywhere; }
.kl-addon-profile-card .kl-addon-profile-private { margin:0;padding:8px 0;border:0;background:none; }
.kl-profile-preferences.kl-profile-ratings { min-width:0;padding:8px 0 0;border:0;border-radius:0;background:none; }
.kl-profile-ratings[hidden],.kl-profile-ratings > [role="status"]:empty { display:none; }
.kl-profile-ratings .kl-profile-edit-link { display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:4px 10px;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-input-bg);font-size:12px;text-decoration:none; }
.kl-profile-ratings .kl-profile-edit-link:hover { background:var(--kl-surface-hover); }
.kl-profile-ratings .kl-profile-edit-link .kl-icon { width:14px;height:14px; }
.kl-profile-preference-filters { display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px; }
.kl-profile-preference-filters input { flex:1;min-width:0;width:100%;height:100%;min-height:0;padding:0;border:0;background:none;color:var(--kl-text);font:inherit;font-size:12px; }
.kl-profile-preference-filters > .kl-browse-search { flex:1 1 180px;height:36px;min-height:36px;padding:0 10px;background:var(--kl-input-bg); }
.kl-profile-preference-filters > .kl-browse-search > .kl-icon { width:15px;height:15px;stroke-width:1.65;color:var(--kl-meta); }
.kl-profile-preference-filters > .kl-browse-search > .kl-browse-icon { width:24px;height:24px;min-height:24px;padding:0!important;border:0;border-radius:8px;background:transparent; }
.kl-profile-preference-filters > .kl-browse-search:has(input:placeholder-shown) > .kl-browse-icon { display:none; }
.kl-profile-preference-filters select { min-width:0;max-width:100%;height:36px;padding:8px 10px;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-input-bg);color:var(--kl-text);font:inherit;font-size:11px; }
@media(max-width:700px), (max-width:900px) and (max-height:500px) {
  .kl-profile-preference-filters > .kl-browse-search,.kl-profile-preference-filters select { height:40px;min-height:40px; }
  .kl-profile-preference-filters > .kl-browse-search > .kl-browse-icon { width:36px;height:36px;min-height:36px; }
}
@media(pointer:coarse) {
  .kl-profile-preference-filters > .kl-browse-search { height:auto;min-height:46px; }
  .kl-profile-preference-filters > .kl-browse-search > .kl-browse-icon { width:44px;height:44px;min-height:44px; }
}
.kl-profile-rating-group { margin-bottom:16px; }
.kl-profile-rating-group:last-child { margin-bottom:0; }
.kl-profile-rating-group > h3 { margin:0 0 4px;font-size:13px; }
.kl-profile-rating { display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 0;border-bottom:1px solid var(--kl-border);font-size:12px;line-height:1.5; }
.kl-profile-rating:last-child { border-bottom:0; }
.kl-profile-rating > strong { min-width:0;font-weight:550;overflow-wrap:anywhere; }
.kl-profile-rating-value { flex:none;font-size:11px; }
.kl-profile-rating--hard_limit,.kl-profile-rating--hate { color:var(--kl-danger); }
.kl-profile-ratings-empty { display:grid;justify-items:center;gap:8px;padding:24px 12px;text-align:center; }
.kl-profile-ratings-empty > .kl-icon { width:24px;height:24px;color:var(--kl-muted); }
.kl-content-dialog:has(:is(.kl-profile-compatibility,.kl-people-friend-confirm)) { width:min(540px,calc(100vw - 24px));border-radius:12px;background:var(--kl-surface); }
.kl-content-dialog[open]:has(:is(.kl-profile-compatibility,.kl-people-friend-confirm)) { border-color:var(--kl-border-strong);box-shadow:0 8px 24px #0005; }
.kl-content-dialog:has(:is(.kl-profile-compatibility,.kl-people-friend-confirm)) .kl-dialog-header { min-height:61px;padding:12px 16px;gap:12px;background:var(--kl-surface); }
.kl-content-dialog:has(:is(.kl-profile-compatibility,.kl-people-friend-confirm)) .kl-dialog-title { flex:1;min-width:0;font:700 16px/1.4 var(--kl-font,system-ui); }
.kl-content-dialog:has(:is(.kl-profile-compatibility,.kl-people-friend-confirm)) .kl-dialog-title::before { content:'KIKILINK';display:block;color:var(--kl-text-faint,rgba(245,238,227,.58));font:400 10px/1.7 var(--kl-font,system-ui);letter-spacing:.25px; }
.kl-content-dialog:has(:is(.kl-profile-compatibility,.kl-people-friend-confirm)) .kl-dialog-header > .kl-icon-button { flex:none;width:32px;min-width:32px;height:32px;min-height:32px;padding:0;border:0;border-radius:8px;color:var(--kl-muted);background:transparent; }
.kl-content-dialog:has(:is(.kl-profile-compatibility,.kl-people-friend-confirm)) .kl-dialog-header > .kl-icon-button:hover { color:var(--kl-text);background:var(--kl-surface-hover); }
.kl-content-dialog:has(:is(.kl-profile-compatibility,.kl-people-friend-confirm)) .kl-dialog-header > .kl-icon-button > .kl-icon { width:16px;height:16px;stroke-width:1.65; }
.kl-content-dialog:has(:is(.kl-profile-compatibility,.kl-people-friend-confirm)) .kl-dialog-body { padding:0;overflow:hidden; }
.kl-profile-compatibility { display:grid;grid-template-rows:minmax(0,1fr) auto;min-height:0;min-width:0; }
.kl-profile-compatibility > .kl-compatibility-details { min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#514438 transparent;align-content:start;padding:16px; }
.kl-profile-compatibility-footer { display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:61px;padding:12px 16px;border-top:1px solid var(--kl-border);background:var(--kl-input-bg); }
.kl-profile-compatibility-footer .kl-text-button { height:36px;min-height:36px;padding:0 12px;border-radius:8px;color:var(--kl-text);background:transparent;font-size:12px;font-weight:550;line-height:1.5; }
.kl-profile-compatibility-footer .kl-text-button--primary { color:#fff;background:var(--kl-accent);border-color:color-mix(in srgb,var(--kl-accent) 58%,var(--kl-muted));font-weight:650; }
.kl-compatibility-score { display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:4px 0 0; }
.kl-compatibility-score > .kl-icon { width:24px;height:24px;color:var(--kl-danger); }
.kl-profile-compatibility .kl-compatibility-score > .kl-icon[data-icon="heart"] { stroke-width:1.65; }
.kl-compatibility-score > strong { font:700 32px/1.1 var(--kl-title-font,var(--kl-font,system-ui)); }
.kl-compatibility-score > span { flex-basis:100%;color:var(--kl-muted);font-size:11px;line-height:1.5; }
.kl-compatibility-categories { min-width:0;padding:16px;border:1px solid var(--kl-border);border-radius:10px;background:var(--kl-surface); }
.kl-compatibility-category { display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 0;border-bottom:1px solid var(--kl-border);font-size:12px;line-height:1.5; }
.kl-compatibility-category:last-child { border-bottom:0; }
.kl-compatibility-category strong { font-weight:550; }
.kl-compatibility-category small { display:block;margin-top:3px;color:var(--kl-muted);font-size:10px; }
.kl-profile-compatibility :is(.kl-compatibility-count,.kl-compatibility-explanation) { font-size:11px;line-height:1.65; }
.kl-profile-compatibility .kl-compatibility-explanation { color:var(--kl-text-faint,rgba(245,238,227,.58));font-size:10px;line-height:1.5; }
.kl-compatibility-shared-ratings > summary { min-height:36px;padding:8px 0;color:var(--kl-muted);font-size:11px;cursor:pointer; }
.kl-compatibility-shared-ratings > summary:hover { color:var(--kl-text); }
.kl-compatibility-shared-groups { display:grid;gap:12px;padding-block-start:8px; }
.kl-profile-compatibility .kl-compatibility-item { padding:10px 0;border:0;border-bottom:1px solid var(--kl-border);border-radius:0;background:none; }
.kl-profile-compatibility .kl-compatibility-item:last-child { border-bottom:0; }
@media(max-width:700px), (max-width:900px) and (max-height:500px) {
  .kl-content-dialog:has(:is(.kl-profile-compatibility,.kl-people-friend-confirm)) .kl-dialog-header { padding:10px 12px; }
  .kl-content-dialog:has(:is(.kl-profile-compatibility,.kl-people-friend-confirm)) .kl-dialog-title { font-size:15px; }
  .kl-content-dialog:has(:is(.kl-profile-compatibility,.kl-people-friend-confirm)) .kl-dialog-header > .kl-icon-button { width:40px;min-width:40px;height:40px;min-height:40px; }
  .kl-profile-compatibility > .kl-compatibility-details { padding:12px; }
  .kl-profile-compatibility-footer { padding:10px 12px; }
  .kl-profile-compatibility-footer .kl-text-button { height:40px;min-height:40px; }
}
@media(pointer:coarse) {
  .kl-content-dialog:has(:is(.kl-profile-compatibility,.kl-people-friend-confirm)) .kl-dialog-header > .kl-icon-button { width:44px;min-width:44px;height:44px;min-height:44px; }
  .kl-profile-compatibility-footer .kl-text-button { height:44px;min-height:44px; }
}
@media(max-width:700px) {
  .kl-compatibility-categories { padding:14px; }
}
@media(max-width:700px) { .kl-profile-overview { grid-template-columns:minmax(0,1fr);gap:4px; }.kl-addon-profile-card { --kl-profile-banner-height:96px; }.kl-addon-profile-hero { grid-template-columns:56px minmax(0,1fr);padding-top:calc(var(--kl-profile-banner-height) + 12px); }.kl-addon-profile-avatar-shell,.kl-addon-profile-avatar { width:56px;height:56px; }.kl-addon-profile-identity h2 { font-size:18px; }.kl-profile-section-heading { min-height:28px; }.kl-addon-profile-dialog[open] { width:calc(100vw - 16px);max-height:calc(100dvh - 16px); }.kl-addon-profile-body { padding:12px; }.kl-addon-profile-fact .kl-icon { display:none; }.kl-addon-profile-fact-value { grid-template-columns:minmax(0,1fr) auto;gap:4px; } }
@media(max-height:480px) { .kl-addon-profile-dialog[open] { max-height:calc(100dvh - 16px); }.kl-addon-profile-card { --kl-profile-banner-height:76px; } }

/* Prototype17: the owner page uses the final 72px banner and separate
   hero/tabs/overview surfaces; visitors use the 120px overlay variant above. */
.kl-profile-summary { min-width:0; }
@media not (forced-colors:active) {
  .kl-addon-profile-card[data-custom-gradient="true"] .kl-profile-summary {
    /* Use one gradient across the banner and details, with a scrim behind text. */
    background-image:linear-gradient(to bottom,transparent var(--kl-profile-banner-height),var(--kl-profile-gradient-shade) var(--kl-profile-banner-height)),var(--kl-profile-banner);
  }
  .kl-addon-profile-card[data-custom-gradient="true"] .kl-addon-profile-banner[data-banner-state="default"] { background:transparent; }
}
.kl-addon-profile-banner::after { inset:auto auto 0 0;width:160px;height:1px;opacity:1;background:var(--kl-accent-rule,linear-gradient(90deg,var(--kl-accent),transparent)); }
.kl-addon-profile-banner:has(img)::after { display:none; }
.kl-addon-profile-hero > .kl-addon-profile-actions { grid-column:1 / -1;padding:2px 0 0; }
.kl-addon-profile-handle { display:flex;align-items:baseline;flex-wrap:wrap;gap:0 5px;min-width:0; }
.kl-addon-profile-handle > span { margin:0; }
.kl-addon-profile-handle > .kl-addon-profile-username + .kl-addon-profile-member::before { content:"·";margin-inline-end:5px; }
.kl-own-profile-page { height:100%;min-width:0;min-height:0;overflow:hidden;background:transparent; }
.kl-own-profile-page[hidden] { display:none!important; }
.kl-own-profile-page > .kl-addon-profile-body { height:100%;box-sizing:border-box;padding:24px;overflow-y:auto;overflow-x:hidden; }
.kl-own-profile-page .kl-addon-profile-card { width:100%;max-width:1040px;box-sizing:border-box;margin-inline:auto;--kl-profile-banner-height:72px;border:0;border-radius:0;background:transparent;box-shadow:none; }
.kl-own-profile-page .kl-profile-summary { margin-bottom:16px;border:1px solid var(--kl-profile-outline,var(--kl-profile-border));border-radius:10px;background:var(--kl-profile-bg); }
.kl-own-profile-page .kl-addon-profile-banner { border-radius:9px 9px 0 0; }
.kl-own-profile-page .kl-addon-profile-hero { grid-template-columns:64px minmax(0,1fr) auto;align-items:center;padding:calc(var(--kl-profile-banner-height) + 16px) 16px 16px;gap:12px; }
.kl-own-profile-page .kl-addon-profile-avatar-shell,.kl-own-profile-page .kl-addon-profile-avatar { width:64px;height:64px;border-radius:50%; }
.kl-own-profile-page .kl-addon-profile-identity h2 { font-family:var(--kl-title-font,inherit);font-size:20px;line-height:1.3;letter-spacing:-.3px; }
.kl-own-profile-page .kl-addon-profile-hero > .kl-addon-profile-actions { grid-column:auto;justify-content:flex-end;flex-wrap:nowrap;padding:0;gap:6px; }
.kl-own-profile-page .kl-addon-profile-actions > .kl-addon-profile-action--primary:first-child { min-width:0;min-height:34px;height:34px;font-size:11px; }
.kl-own-profile-page .kl-addon-profile-facts { margin:0 16px 4px;border:0;border-top:1px solid var(--kl-profile-border);border-radius:0;gap:0;overflow:hidden; }
.kl-own-profile-page .kl-addon-profile-fact { padding:12px 8px;background:transparent; }
.kl-own-profile-page .kl-addon-profile-fact + .kl-addon-profile-fact { border-left:0; }
.kl-own-profile-page .kl-addon-profile-fact strong { font-size:12px;font-weight:550; }
.kl-own-profile-page .kl-addon-profile-card > .kl-platform-profile-sections { padding:0; }
.kl-own-profile-page .kl-addon-profile-card .kl-platform-profile-tabs { position:sticky;top:-24px;z-index:4;gap:20px;padding-top:8px;margin-bottom:16px;background:var(--kl-panel-bg); }
.kl-own-profile-page .kl-addon-profile-card .kl-platform-profile-section { padding:0; }
.kl-own-profile-page .kl-profile-overview { grid-template-columns:minmax(0,1.45fr) minmax(0,1fr);gap:12px;align-items:stretch; }
.kl-own-profile-page .kl-profile-overview > section { min-width:0;padding:12px;border:0;border-bottom:1px solid var(--kl-border);border-radius:0;background:transparent; }
.kl-own-profile-page .kl-profile-overview .kl-profile-section-heading { min-height:32px;margin-bottom:8px; }
.kl-own-profile-page .kl-profile-overview .kl-profile-section-heading h3 { font-size:13px; }
.kl-own-profile-page .kl-profile-overview-section > .kl-profile-section-note { line-height:1.65; }
.kl-own-profile-page .kl-profile-overview-section .kl-profile-details { gap:10px 12px; }
.kl-profile-details dd { text-align:right; }
@container kl-panel (width <= 1250px) {
  .kl-own-profile-page > .kl-addon-profile-body { padding:20px; }
  .kl-own-profile-page .kl-addon-profile-card .kl-platform-profile-tabs { top:-20px; }
}
@container kl-panel (width <= 900px) {
  .kl-own-profile-page .kl-addon-profile-hero { grid-template-columns:64px minmax(0,1fr); }
  .kl-own-profile-page .kl-addon-profile-hero > .kl-addon-profile-actions { grid-column:1 / -1;justify-content:flex-start; }
}
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-own-profile-page > .kl-addon-profile-body { padding:16px 16px 24px; }
  .kl-own-profile-page .kl-profile-overview { grid-template-columns:minmax(0,1fr); }
  .kl-own-profile-page .kl-addon-profile-card .kl-platform-profile-tabs { top:-16px;margin-bottom:12px; }
}
@container kl-panel (width <= 700px) {
  .kl-own-profile-page .kl-addon-profile-hero { grid-template-columns:52px minmax(0,1fr);padding:calc(var(--kl-profile-banner-height) + 12px) 12px 12px; }
  .kl-own-profile-page .kl-addon-profile-avatar-shell,.kl-own-profile-page .kl-addon-profile-avatar { width:52px;height:52px; }
  .kl-own-profile-page .kl-addon-profile-identity h2 { font-size:18px; }
  .kl-own-profile-page .kl-addon-profile-actions { gap:8px; }
  .kl-own-profile-page .kl-addon-profile-actions > .kl-addon-profile-action--primary:first-child { min-height:40px;height:40px;flex:0 1 auto; }
  .kl-own-profile-page .kl-addon-profile-facts { margin-inline:12px; }
  .kl-own-profile-page .kl-addon-profile-fact { padding:10px 4px; }
  .kl-own-profile-page .kl-addon-profile-fact strong { font-size:11px; }
  .kl-own-profile-page .kl-profile-overview { gap:8px; }
  .kl-own-profile-page .kl-profile-overview > section { padding:12px 0; }
  .kl-own-profile-page .kl-profile-overview .kl-profile-section-heading { min-height:28px; }
  .kl-own-profile-page .kl-addon-profile-card .kl-platform-profile-tabs { gap:18px; }
  .kl-own-profile-page .kl-addon-profile-card .kl-platform-profile-tabs > button { min-height:42px; }
}
@container kl-panel (width <= 900px) and (height <= 500px) {
  .kl-own-profile-page > .kl-addon-profile-body { padding:12px 20px 24px; }
  .kl-own-profile-page .kl-addon-profile-hero { grid-template-columns:auto minmax(0,1fr) auto; }
  .kl-own-profile-page .kl-addon-profile-hero > .kl-addon-profile-actions { grid-column:auto; }
  .kl-own-profile-page .kl-addon-profile-card .kl-platform-profile-tabs { top:-12px; }
}

.kl-profile-activity-row { display:grid;gap:8px;padding:14px 0;border-bottom:1px solid var(--kl-border);overflow-wrap:anywhere; }
.kl-profile-activity-row p { margin:0;white-space:pre-wrap; }
.kl-profile-activity-row time { color:var(--kl-muted);font-size:11px; }
.kl-profile-activity-row button { justify-self:start; }
.kl-profile-details-editor { display:grid;gap:12px;min-width:0; }
.kl-profile-details-editor > .kl-profile-section-note:empty { display:none; }
.kl-profile-language-picker { min-width:0;margin:0;padding:0;border:0; }
.kl-profile-language-options { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 12px;margin:8px 0; }
.kl-profile-language-options label { display:flex;align-items:center;gap:6px;min-height:32px;min-width:0;font-size:11px;overflow-wrap:anywhere; }
.kl-profile-language-options input { flex:0 0 16px;width:16px;height:16px;margin:0;padding:0; }

.kl-presence-dialog { background:var(--kl-surface);border-color:var(--kl-border-strong); }
.kl-presence-dialog .kl-dialog-header { min-height:64.4px;gap:12px;background:var(--kl-surface); }
.kl-presence-dialog .kl-dialog-heading { flex:1;min-width:0;margin:0; }
.kl-presence-dialog .kl-dialog-title { font-family:inherit;font-weight:700;line-height:1.4;letter-spacing:-.2px;overflow-wrap:anywhere;margin:0; }
.kl-profile-editor-brand { display:block;color:var(--kl-meta);text-transform:uppercase;font-size:10px;line-height:1.7;letter-spacing:.25px; }
.kl-presence-dialog .kl-dialog-header > .kl-icon-button { flex:none;width:32px;min-width:32px;height:32px;min-height:32px;padding:0;color:var(--kl-muted);background:none;border:0; }
.kl-presence-dialog .kl-dialog-header > .kl-icon-button .kl-icon { width:16px;height:16px;stroke-width:1.65; }
.kl-presence-dialog .kl-dialog-header > .kl-icon-button:hover { color:var(--kl-text);background:var(--kl-surface-hover); }
.kl-presence-dialog .kl-presence-body { scrollbar-color:var(--kl-border-strong) transparent;scrollbar-width:thin;overscroll-behavior:contain; }
.kl-presence-dialog .kl-dialog-actions { display:flex;align-items:center;justify-content:flex-end;background:var(--kl-input-bg); }
.kl-presence-dialog .kl-dialog-actions > button { display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 12px;border-radius:8px;font-size:var(--kl-type-body);font-weight:550;line-height:1.5; }
.kl-presence-dialog .kl-dialog-actions > button:first-child { margin-inline-end:auto; }
.kl-presence-dialog .kl-dialog-actions > .kl-text-button--primary { font-weight:650; }
.kl-presence-dialog .kl-dialog-actions > button:first-child:not(:hover) { background:transparent; }
.kl-presence-dialog .kl-profile-save-hint { color:var(--kl-meta);line-height:1.5; }
.kl-presence-body > .kl-platform-profile-sections > .kl-platform-profile-tabs { background:var(--kl-input-bg); }
.kl-presence-body > .kl-platform-profile-sections > .kl-platform-profile-tabs > button { display:inline-flex;align-items:center;justify-content:center;min-height:36px;background:var(--kl-surface-2);font-weight:550;line-height:1.5; }
.kl-presence-body > .kl-platform-profile-sections > .kl-platform-profile-tabs > button:hover { background:var(--kl-surface-hover); }
.kl-presence-dialog .kl-unified-profile { background:none; }
.kl-presence-dialog .kl-presence-field-label { font-size:var(--kl-type-body);font-weight:550;line-height:1.5; }
.kl-presence-dialog :is(.kl-profile-display-name,.kl-username-field,.kl-profile-about-field,.kl-profile-tags-field) { align-content:start;gap:6px; }
.kl-presence-dialog :is(.kl-profile-display-name,.kl-username-field,.kl-profile-tags-field) .kl-search { height:36px;min-height:36px;padding-inline:10px;font-size:var(--kl-type-body);border-radius:7px; }
.kl-profile-field-required { color:var(--kl-muted);font:inherit; }
.kl-profile-about-field .kl-profile-bio-input { min-height:88px;max-height:none;padding:8px 10px;font-size:var(--kl-type-body);line-height:1.6;border-radius:7px; }
.kl-profile-field-meta { display:flex;align-items:flex-start;justify-content:space-between;gap:12px;min-height:15px; }
.kl-profile-field-meta > .kl-custom-field-help { min-width:0;font-size:10px;line-height:1.3; }
.kl-profile-field-counter { flex:none;margin-inline-start:auto;color:var(--kl-muted);font-size:var(--kl-type-xs);line-height:1.25;white-space:nowrap; }
.kl-profile-language-picker > legend { margin-bottom:6px;padding:0;font-size:12px;font-weight:550; }
.kl-profile-language-options input { accent-color:var(--kl-accent); }
@media (max-width:620px) {
  .kl-profile-language-options { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .kl-profile-language-options label { min-height:36px; }
  .kl-presence-dialog :is(.kl-profile-display-name,.kl-username-field,.kl-profile-tags-field) .kl-search { height:40px;min-height:40px;font-size:16px; }
  .kl-profile-about-field .kl-profile-bio-input { font-size:16px; }
}
.kl-presence-dialog .kl-platform-profile-section .kl-profile-avatar-field { display:grid;grid-template-columns:minmax(0,1fr);align-items:stretch;gap:16px; }
.kl-profile-choice-grid { display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;min-width:0; }
.kl-profile-choice { position:relative;display:grid;justify-items:center;align-content:center;gap:5px;min-width:0;min-height:86px;padding:6px 3px;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-input-bg);color:var(--kl-text);font:inherit;font-size:var(--kl-type-xs);line-height:1.25;overflow-wrap:anywhere;cursor:pointer; }
.kl-profile-choice:hover { background:var(--kl-surface-hover); }
.kl-profile-choice:disabled { cursor:default;opacity:.65; }
.kl-profile-choice[aria-pressed="true"] { border-color:var(--kl-accent);background:color-mix(in srgb,var(--kl-accent) 7%,var(--kl-input-bg)); }
.kl-profile-choice[aria-pressed="true"]::after { content:"✓";position:absolute;inset:4px 4px auto auto;display:grid;place-items:center;width:13px;height:13px;border-radius:50%;background:var(--kl-accent);color:var(--kl-accent-foreground);font-size:9px;font-weight:700; }
.kl-profile-avatar-swatch { display:grid;place-items:center;width:42px;height:42px;object-fit:cover;border:1px solid var(--kl-border-strong);border-radius:50%;background:var(--kl-avatar-bg);color:#f5eee3;font-size:16px; }
.kl-profile-avatar-choices .kl-profile-avatar-swatch { margin-block:4px;font-size:18px;font-weight:600; }
.kl-profile-avatar-framing,.kl-profile-avatar-backgrounds { display:grid;gap:12px;min-width:0; }
.kl-profile-avatar-framing { gap:8px;padding-block-start:12px;border-top:1px solid var(--kl-border); }
.kl-profile-avatar-adjust-heading { display:flex;align-items:center;justify-content:space-between;gap:8px; }
.kl-profile-avatar-adjust-heading h3,.kl-profile-avatar-backgrounds h3 { margin:0;font-size:var(--kl-type-body);line-height:1.4; }
.kl-profile-avatar-adjust-heading .kl-text-button { padding:4px 0;border:0;background:none;color:var(--kl-muted); }
.kl-profile-avatar-adjust-heading .kl-text-button:hover { color:var(--kl-text);text-decoration:underline; }
.kl-profile-avatar-crop { width:min(164px,100%);aspect-ratio:1;justify-self:center;overflow:hidden;border-radius:50%;background:var(--kl-avatar-bg);box-shadow:0 0 0 1px var(--kl-border-strong);touch-action:none;user-select:none;cursor:grab; }
.kl-profile-avatar-crop:active { cursor:grabbing; }
.kl-profile-avatar-crop img { display:block;width:100%;height:100%;object-fit:cover;object-position:var(--kl-avatar-framing-position);transform-origin:var(--kl-avatar-framing-position);transform:scale(var(--kl-avatar-framing-zoom));pointer-events:none; }
.kl-profile-avatar-zoom { display:flex;justify-content:center;gap:8px; }
.kl-profile-avatar-zoom button { min-width:36px;min-height:36px; }
.kl-profile-avatar-choices .kl-profile-choice,.kl-profile-avatar-backgrounds .kl-profile-choice { gap:7px;padding:8px 4px;border-radius:8px;background:var(--kl-surface);color:var(--kl-muted);font-weight:550;line-height:1.3;text-align:center; }
.kl-profile-avatar-choices .kl-profile-choice { min-height:88px; }
.kl-profile-avatar-choices .kl-profile-choice > span:last-child { max-width:100%; }
.kl-profile-avatar-backgrounds .kl-profile-choice { min-height:65px; }
.kl-profile-avatar-field .kl-profile-choice:hover { border-color:var(--kl-border-strong);background:var(--kl-surface-hover);color:var(--kl-text); }
.kl-profile-avatar-field .kl-profile-choice[aria-pressed="true"] { border-color:var(--kl-accent);background:color-mix(in srgb,var(--kl-gold) 4%,var(--kl-surface));color:var(--kl-text); }
.kl-profile-avatar-background-swatch { width:28px;height:28px;border:1px solid var(--kl-border);border-radius:50%; }
.kl-profile-avatar-preview[data-avatar-edit="background"] { background:var(--kl-avatar-backdrop);color:#f5eee3; }
.kl-profile-avatar-preview[data-avatar-edit="background"] > img { transform:scale(.86); }
.kl-profile-avatar-preview[data-avatar-edit="framing"] > img {
  border-radius:0!important;
  object-position:var(--kl-avatar-framing-position);
  transform-origin:var(--kl-avatar-framing-position);
  transform:scale(var(--kl-avatar-framing-zoom));
  clip-path:var(--kl-avatar-framing-clip);
}
.kl-profile-style-swatch { position:relative;display:block;width:100%;height:36px;padding:17px 5px 3px;overflow:hidden;border:1px solid #ffffff10;border-radius:4px;background:var(--kl-swatch-first); }
.kl-profile-style-swatch::before { position:absolute;inset:0 0 auto;height:14px;content:"";background:linear-gradient(120deg,var(--kl-swatch-last),var(--kl-swatch-first)); }
.kl-profile-style-swatch i { position:absolute;top:10px;left:5px;width:10px;height:10px;border:1px solid #f5eee355;border-radius:50%;background:var(--kl-swatch-last); }
.kl-profile-style-swatch b { display:block;width:65%;height:2px;margin:4px 0 0 14px;border-radius:1px;background:#f5eee355; }
.kl-profile-style-swatch b + b { width:45%;background:#f5eee32a; }
.kl-profile-appearance-sections :is(.kl-profile-style-choices,.kl-profile-decoration-choices,.kl-profile-appearance-modes) .kl-profile-choice { gap:7px;padding:8px 5px;border-radius:8px;background:var(--kl-surface);color:var(--kl-muted);font-weight:550;line-height:1.3;text-align:center; }
.kl-profile-appearance-sections :is(.kl-profile-style-choices,.kl-profile-decoration-choices,.kl-profile-appearance-modes) .kl-profile-choice:hover { border-color:var(--kl-border-strong);background:var(--kl-surface-hover);color:var(--kl-text); }
.kl-profile-appearance-sections :is(.kl-profile-style-choices,.kl-profile-decoration-choices,.kl-profile-appearance-modes) .kl-profile-choice[aria-pressed="true"] { border-color:var(--kl-accent);background:color-mix(in srgb,var(--kl-gold) 4%,var(--kl-surface));color:var(--kl-text); }
.kl-profile-appearance-sections .kl-profile-style-choices .kl-profile-choice { min-height:78px;padding-top:7px; }
.kl-profile-style-choices + .kl-profile-style-select[hidden] { display:none; }
.kl-profile-appearance-sections .kl-profile-gradient-field,.kl-profile-appearance-sections .kl-profile-outline-field { padding:12px 0 0;border:0;border-top:1px solid var(--kl-border);border-radius:0;background:none; }
.kl-profile-gradient-field > strong { margin-bottom:2px;font-size:var(--kl-type-sm); }
.kl-profile-appearance-sections :is(.kl-profile-gradient-controls,.kl-avatar-custom-colors) > label:not([hidden]):has(input[type="color"]) { display:flex;flex-direction:column-reverse;align-items:stretch;gap:5px; }
.kl-profile-appearance-sections :is(.kl-profile-gradient-controls,.kl-avatar-custom-colors) input[type="color"] { width:100%;height:34px;border-radius:6px; }
.kl-profile-appearance-sections input[type="color"]::-webkit-color-swatch-wrapper { padding:0; }
.kl-profile-appearance-sections input[type="color"]::-webkit-color-swatch { border:0;border-radius:3px; }
.kl-profile-outline-toggle { display:flex;align-items:center;gap:10px;min-height:32px;font-size:var(--kl-type-sm);font-weight:550;cursor:pointer; }
.kl-profile-outline-toggle input { margin:0;accent-color:var(--kl-accent); }
.kl-profile-outline-field > .kl-profile-outline-controls { justify-content:space-between;min-height:34px;color:var(--kl-muted);font-size:var(--kl-type-sm); }
.kl-profile-outline-field > .kl-profile-outline-controls[hidden] { display:none; }
.kl-avatar-appearance-platform > select[hidden],.kl-avatar-appearance-platform [hidden] { display:none; }
.kl-profile-appearance-modes { display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px; }
.kl-profile-appearance-sections .kl-profile-appearance-modes .kl-profile-choice { min-height:36px;padding:6px 17px 6px 7px;font-size:var(--kl-type-sm); }
.kl-profile-appearance-modes .kl-profile-choice[aria-pressed="true"]::after { inset:50% 4px auto auto;width:11px;height:11px;transform:translateY(-50%);font-size:8px; }
.kl-avatar-appearance-platform { gap:12px; }
.kl-avatar-appearance-platform .kl-avatar-custom-colors { gap:12px;padding-top:12px;border-top:1px solid var(--kl-border); }
.kl-avatar-appearance-platform .kl-avatar-custom-colors:has(.kl-avatar-color-field[hidden]) { grid-template-columns:minmax(0,1fr); }
.kl-profile-decoration-preview { display:flex;align-items:center;min-height:100px;padding:12px;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-input-bg); }
.kl-profile-decoration-preview .kl-profile-decoration-example { width:48px;height:48px;font-size:22px; }
.kl-profile-appearance-sections .kl-profile-decoration-choices .kl-profile-choice { min-height:92px;padding:12px 5px 8px;gap:9px; }
.kl-profile-decoration-example { position:relative;width:40px;height:40px;min-width:0;min-height:0;font-size:17px; }
.kl-profile-decoration-example > img { width:100%;height:100%;object-fit:cover; }
.kl-profile-image-upload { display:flex;align-items:center;flex-wrap:wrap;gap:10px;padding:10px;border:1px solid var(--kl-border-strong);border-radius:8px;background:var(--kl-input-bg); }
.kl-profile-image-upload > div { flex:1 1 150px;min-width:0; }
.kl-profile-image-upload strong,.kl-profile-image-upload small { display:block; }
.kl-profile-image-upload strong { font-size:var(--kl-type-sm); }
.kl-profile-image-upload small { color:var(--kl-muted);font-size:var(--kl-type-xs);margin-top:2px; }
.kl-profile-image-upload > button { display:inline-flex;align-items:center;gap:6px;min-height:36px;height:36px;padding-inline:11px;border-radius:8px;font-size:var(--kl-type-sm);font-weight:550; }
.kl-profile-image-upload > button .kl-icon { width:13px;height:13px; }
.kl-profile-image-link { min-width:0;color:var(--kl-muted); }
.kl-profile-image-link > summary { display:list-item;padding:5px 0;min-height:32px;cursor:pointer;font-size:var(--kl-type-sm); }
.kl-profile-image-link > label { margin-top:6px; }
.kl-presence-dialog .kl-platform-profile-section .kl-profile-banner-upload-editor { display:grid;grid-template-columns:minmax(0,1fr);gap:12px;padding:0;border:0;border-radius:0;background:none; }
.kl-profile-banner-source { display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;min-height:58px;padding:10px;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-surface); }
.kl-profile-banner-source small,.kl-profile-banner-source strong { display:block; }
.kl-profile-banner-source small { color:var(--kl-muted);font-size:var(--kl-type-xs);margin-bottom:3px; }
.kl-profile-banner-source strong { font-size:var(--kl-type-sm); }
.kl-profile-banner-source > button { min-height:36px; }
.kl-profile-banner-source > button[hidden] { display:none; }
.kl-profile-banner-upload-editor p { margin:0; }
.kl-profile-banner-upload-editor [role="status"]:empty { display:none; }
:is(.kl-profile-avatar-actions,.kl-profile-appearance-actions) { display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:6px 10px;padding-top:8px;border-top:1px solid var(--kl-border); }
:is(.kl-profile-avatar-actions,.kl-profile-appearance-actions) > .kl-profile-image-link[open] { flex:1 1 100%; }
:is(.kl-profile-avatar-actions,.kl-profile-appearance-actions) .kl-profile-image-link > summary { min-height:36px;padding-block:9px;font-size:var(--kl-type-xs); }
:is(.kl-profile-avatar-actions,.kl-profile-appearance-actions) > .kl-profile-image-remove { justify-self:start;display:inline-flex;align-items:center;gap:5px;min-height:36px;padding:4px 0;border:0;background:none;color:var(--kl-muted);font-size:var(--kl-type-xs); }
:is(.kl-profile-avatar-actions,.kl-profile-appearance-actions) > .kl-profile-image-remove > .kl-icon { width:12px;height:12px; }
:is(.kl-profile-avatar-actions,.kl-profile-appearance-actions) > .kl-profile-image-remove:hover:not(:disabled) { color:var(--kl-text);text-decoration:underline; }
.kl-profile-appearance-sections .kl-legacy-badge-field { display:grid;gap:12px;padding:0;border:0;background:none; }
.kl-profile-appearance-sections .kl-legacy-badge-field[hidden],.kl-legacy-badge-toggle[hidden] { display:none; }
.kl-legacy-badge-card { display:flex;align-items:center;gap:16px;padding:16px;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-surface-2); }
.kl-legacy-badge-card .kl-legacy-badge-emblem { background:var(--kl-surface); }
.kl-legacy-badge-copy > p { margin:0 0 4px;color:var(--kl-muted);font-size:var(--kl-type-sm); }
.kl-legacy-badge-earned { display:flex;align-items:center;gap:5px;color:var(--kl-gold);font-size:var(--kl-type-sm); }
.kl-legacy-badge-earned > .kl-icon { width:12px;height:12px;flex:none; }
.kl-legacy-badge-field[data-eligible="false"] .kl-legacy-badge-earned { color:var(--kl-muted); }
.kl-legacy-badge-field[data-eligible="false"] .kl-legacy-badge-emblem { opacity:.5; }
.kl-legacy-badge-field > .kl-legacy-badge-toggle { min-height:36px;margin:0;font-size:var(--kl-type-sm);font-weight:550; }
@media(max-width:700px) {
  .kl-profile-image-upload > button { min-height:40px;height:40px; }
  .kl-profile-style-choices,.kl-profile-decoration-choices { gap:7px; }
  .kl-profile-decoration-choices { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .kl-profile-appearance-sections .kl-profile-appearance-modes .kl-profile-choice { min-height:38px;font-size:var(--kl-type-xs); }
  .kl-legacy-badge-card { gap:12px;padding:12px; }
  .kl-legacy-badge-card .kl-legacy-badge-emblem { width:52px;height:52px; }
  .kl-legacy-badge-card .kl-legacy-badge-mark { width:34px;height:34px; }
}
@media(max-height:500px) and (max-width:900px) {
  .kl-profile-appearance-sections .kl-profile-decoration-choices .kl-profile-choice { min-height:74px;padding-top:8px;gap:6px; }
  .kl-profile-decoration-choices .kl-profile-decoration-example { width:32px;height:32px;font-size:16px; }
}
.kl-presence-dialog [data-profile-section="privacy"] > .kl-presence-field .kl-select { width:100%;min-height:40px; }
.kl-presence-dialog [data-profile-section="privacy"] > .kl-presence-field[hidden] { display:none; }
.kl-profile-visibility-card { display:grid;gap:5px;padding:12px;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-input-bg); }
.kl-profile-visibility-option { display:flex;align-items:center;gap:8px;min-height:28px;font-size:var(--kl-type-body);font-weight:650; }
.kl-profile-visibility-option input { accent-color:var(--kl-accent); }
.kl-profile-visibility-card > p { margin:0; }
.kl-profile-visibility-card > button { justify-self:start; }
.kl-profile-privacy-inline { display:grid;gap:10px;min-width:0; }
.kl-profile-privacy-inline:empty,.kl-profile-privacy-inline [role="status"]:empty { display:none; }
.kl-profile-privacy-inline > p { margin:0; }
.kl-profile-privacy-inline > button { justify-self:start; }
.kl-profile-privacy-audiences { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:14px; }
.kl-profile-privacy-audience { display:grid;gap:5px;min-width:0;font-size:var(--kl-type-sm);font-weight:650; }
.kl-profile-privacy-audience .kl-select { width:100%;max-width:none;min-height:38px; }
.kl-profile-privacy-audience small,.kl-profile-privacy-toggle small { display:block;color:var(--kl-muted);font-size:var(--kl-type-xs);font-weight:400;line-height:1.4; }
.kl-profile-privacy-visibility { display:grid;padding:0 12px;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-input-bg); }
.kl-profile-privacy-toggle { display:flex;align-items:flex-start;gap:10px;min-height:44px;padding:10px 0;font-size:var(--kl-type-sm); }
.kl-profile-privacy-toggle + .kl-profile-privacy-toggle { border-top:1px solid var(--kl-border); }
.kl-profile-privacy-toggle input { flex:none;margin:2px 0 0;accent-color:var(--kl-accent); }
.kl-profile-privacy-toggle strong { display:block;margin-bottom:2px; }
.kl-profile-privacy-preferences { display:grid;gap:5px;min-width:0; }
.kl-profile-privacy-preferences .kl-preferences-status { margin:0; }
.kl-profile-privacy-preferences .kl-preferences-status:empty { display:none; }
.kl-profile-privacy-inline .kl-profile-privacy-audience { gap:6px;font-size:12px;font-weight:550;line-height:1.5; }
.kl-profile-privacy-inline .kl-profile-privacy-audience .kl-select { height:36px;min-height:36px;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:400; }
.kl-profile-privacy-inline .kl-profile-privacy-audience .kl-select:focus { border-color:var(--kl-accent-border,color-mix(in srgb,var(--kl-accent) 58%,var(--kl-muted)));box-shadow:none; }
.kl-profile-privacy-inline .kl-profile-privacy-audience .kl-select:focus-visible { outline:2px solid var(--kl-focus,color-mix(in srgb,var(--kl-accent) 52%,white));outline-offset:3px; }
.kl-profile-privacy-inline .kl-profile-privacy-visibility { padding:16px;border-radius:10px;background:var(--kl-surface); }
.kl-profile-privacy-inline .kl-profile-privacy-toggle { align-items:center;padding:14px 0;border-top:0;border-bottom:1px solid var(--kl-border);font-size:12px;line-height:1.5; }
.kl-profile-privacy-inline .kl-profile-privacy-toggle > span { flex:1;min-width:0; }
.kl-profile-privacy-inline .kl-profile-privacy-toggle strong { margin:0;font-size:11px;font-weight:550;line-height:1.5; }
.kl-profile-privacy-inline .kl-profile-privacy-toggle small { margin-top:3px;font-size:10px;line-height:1.5; }
.kl-profile-privacy-inline .kl-profile-privacy-toggle input { width:16px;height:16px;flex:0 0 16px;margin:0; }
@media(max-width:700px), (max-width:900px) and (max-height:500px) {
  .kl-profile-privacy-inline .kl-profile-privacy-audience .kl-select { height:40px;min-height:40px;padding:6px 10px;font-size:16px; }
}
@media(max-width:700px) {
  .kl-profile-privacy-audiences { grid-template-columns:minmax(0,1fr); }
  .kl-profile-privacy-inline .kl-profile-privacy-visibility { padding:14px; }
}
/* View as keeps the owner and read-only preview on the same profile path. */
.kl-profile-view-as { width:100%;max-width:1040px;min-width:0;margin-inline:auto; }
.kl-profile-view-as-heading,.kl-profile-view-as-controls { display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:10px;min-width:0;min-height:46px;margin:0;padding:8px 0;color:var(--kl-muted);font-size:11px;line-height:1.5; }
:is(.kl-profile-view-as-heading,.kl-profile-view-as-controls) .kl-profile-view-as-control > .kl-icon { width:18px;height:18px;stroke-width:1.65; }
:is(.kl-profile-view-as-heading,.kl-profile-view-as-controls) .kl-profile-view-as-control { display:flex;align-items:center;gap:6px;min-width:0;color:var(--kl-muted);font-size:11px;font-weight:400;line-height:1.5; }
:is(.kl-profile-view-as-heading,.kl-profile-view-as-controls) .kl-profile-view-as-control select { width:auto;max-width:100%;height:36px;min-height:36px;border:1px solid var(--kl-border);border-radius:8px;color:var(--kl-muted);background:var(--kl-surface);padding:4px 8px;font:inherit;font-size:11px;line-height:normal;cursor:pointer;box-shadow:none; }
:is(.kl-profile-view-as-heading,.kl-profile-view-as-controls) select:focus { border-color:color-mix(in srgb,var(--kl-accent) 58%,var(--kl-muted));box-shadow:none; }
:is(.kl-profile-view-as-heading,.kl-profile-view-as-controls) :is(select,button):focus-visible { outline:2px solid color-mix(in srgb,var(--kl-accent) 52%,white);outline-offset:3px; }
.kl-addon-profile-dialog :is(.kl-profile-view-as-heading,.kl-profile-view-as-controls) { padding-inline:var(--kl-profile-sheet-padding) 58px; }
.kl-addon-profile-dialog :is(.kl-profile-view-as-notice,.kl-profile-view-as-extra) { margin-inline:var(--kl-profile-sheet-padding); }
.kl-profile-view-as-notice { display:flex;align-items:flex-start;gap:8px;min-width:0;margin:0 0 16px;padding:10px 12px;border:1px solid #d6a24b38;border-radius:7px;background:#d6a24b0b;color:#d7be9a;font-size:11px;line-height:1.5;overflow-wrap:anywhere; }
.kl-profile-view-as-notice > .kl-icon { flex:none;width:15px;height:15px;margin-top:1px;stroke-width:1.65; }
.kl-profile-view-as-notice > span { min-width:0; }
:is(.kl-profile-view-as-notice,.kl-profile-view-as-locked,.kl-profile-section-locked) > .kl-text-button { display:inline-flex;align-items:center;justify-content:center;flex:none;gap:8px;height:36px;min-height:32px;padding:0 12px;border:1px solid var(--kl-border);border-radius:8px;background:transparent;color:inherit;font-size:12px;font-weight:550;line-height:1.5;white-space:nowrap;transition:background 150ms ease,border-color 150ms ease; }
:is(.kl-profile-view-as-notice,.kl-profile-view-as-locked,.kl-profile-section-locked) > .kl-text-button:hover { border-color:var(--kl-border-strong);background:var(--kl-surface-hover); }
:is(.kl-profile-view-as-notice,.kl-profile-view-as-locked,.kl-profile-section-locked) > .kl-text-button:active { transform:none; }
:is(.kl-profile-view-as-notice,.kl-profile-view-as-locked,.kl-profile-section-locked) > .kl-text-button:focus-visible { outline:2px solid color-mix(in srgb,var(--kl-accent) 52%,white);outline-offset:3px; }
.kl-profile-view-as-extra { display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;min-width:0;margin-top:12px;padding:10px 12px;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-surface);color:var(--kl-muted);font-size:11px;line-height:1.5; }
.kl-profile-view-as-extra > .kl-profile-section-note { flex:1 1 280px;min-width:0;margin:0; }
.kl-profile-view-as-extra > .kl-text-button { flex:none;min-height:36px;padding:6px 10px;border-radius:8px;background:transparent;font-size:11px;font-weight:550; }
.kl-profile-view-as-extra > .kl-text-button:focus-visible { outline:2px solid color-mix(in srgb,var(--kl-accent) 52%,white);outline-offset:3px; }
.kl-profile-view-as-preferences { min-width:0;padding:8px 0 0; }
.kl-profile-view-as-preferences:has(> .kl-profile-view-as-locked) { padding:0; }
.kl-profile-preferences.kl-profile-ratings:has(.kl-profile-preferences-locked) { padding:0; }
.kl-profile-preferences-retry { display:flex;justify-content:center;margin-top:12px; }
.kl-profile-preferences-retry > .kl-text-button { min-height:36px;padding:6px 12px;border-radius:8px;background:transparent;color:var(--kl-text);font-size:12px;font-weight:550;line-height:1.5; }
.kl-profile-preferences-retry > .kl-text-button:focus-visible { outline:2px solid color-mix(in srgb,var(--kl-accent) 52%,white);outline-offset:3px; }
:is(.kl-profile-view-as-locked,.kl-profile-section-locked) { display:flex;align-items:center;flex-direction:column;gap:12px;min-width:0;padding:32px 20px;border:1px solid var(--kl-border);border-radius:10px;background:var(--kl-surface);color:var(--kl-text);text-align:center; }
:is(.kl-profile-view-as-locked,.kl-profile-section-locked) > .kl-icon { flex:none;width:24px;height:24px;color:var(--kl-muted);stroke-width:1.65; }
:is(.kl-profile-view-as-locked,.kl-profile-section-locked) > :is(h2,h3) { margin:0;color:var(--kl-text);font-size:15px;font-weight:650;line-height:1.4;letter-spacing:-.2px; }
:is(.kl-profile-view-as-locked,.kl-profile-section-locked) > .kl-profile-section-note { margin:0;color:var(--kl-muted);font-size:12px;line-height:1.75; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  :is(.kl-profile-view-as-notice,.kl-profile-view-as-locked,.kl-profile-section-locked) > .kl-text-button { height:40px;min-height:40px; }
  .kl-profile-view-as-extra > .kl-text-button { min-height:40px; }
  .kl-profile-preferences-retry > .kl-text-button { min-height:40px; }
  .kl-addon-profile-dialog .kl-addon-profile-card .kl-platform-profile-tabs { padding-bottom:1px; }
}
@container kl-panel (width <= 700px) {
  :is(.kl-profile-view-as-heading,.kl-profile-view-as-controls) .kl-profile-view-as-control select { max-width:95px; }
}
@media(pointer:coarse) {
  :is(.kl-profile-view-as-heading,.kl-profile-view-as-controls) .kl-profile-view-as-control select,:is(.kl-profile-view-as-notice,.kl-profile-view-as-locked,.kl-profile-section-locked) > .kl-text-button { height:44px;min-height:44px; }
  .kl-addon-profile-dialog[open] .kl-addon-profile-card .kl-platform-profile-tabs > button { height:44px;min-height:44px; }
  .kl-profile-view-as-extra > .kl-text-button { min-height:44px; }
  .kl-profile-preferences-retry > .kl-text-button { min-height:44px; }
}
.kl-own-profile-page .kl-addon-profile-action--primary { display:inline-flex;align-items:center;justify-content:center;gap:6px; }
.kl-own-profile-page .kl-addon-profile-action--primary > .kl-icon { width:13px;height:13px; }
.kl-own-profile-page .kl-addon-profile-facts { grid-template-columns:repeat(3,minmax(0,1fr));padding:0; }
.kl-own-profile-page .kl-addon-profile-fact { grid-column:auto;min-height:54px;align-content:center;border:0;border-radius:0; }
.kl-own-profile-page .kl-addon-profile-fact > span { font-size:var(--kl-type-xxs);font-weight:500;letter-spacing:0;text-transform:none; }
.kl-profile-location { position:relative;padding-inline-end:36px!important; }
.kl-profile-location > strong { display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.kl-profile-location > .kl-profile-location-refresh { position:absolute;inset:auto 0 auto auto;align-self:center;width:34px;height:36px;min-width:34px;min-height:36px;padding:0;border:0;background:transparent; }
.kl-profile-location > .kl-profile-location-refresh .kl-icon { display:block;width:13px;height:13px;color:var(--kl-profile-highlight); }

@media(max-width:700px) {
  .kl-presence-dialog .kl-dialog-header { min-height:61px; }
  .kl-presence-dialog .kl-profile-save-hint { line-height:1.4; }
  .kl-presence-dialog .kl-dialog-header > .kl-icon-button { width:40px;min-width:40px;height:40px;min-height:40px; }
  .kl-profile-avatar-choices,.kl-profile-avatar-backgrounds .kl-profile-choice-grid { gap:7px; }
  .kl-profile-avatar-choices .kl-profile-choice { min-height:84px; }
}
@media(max-width:700px), (max-width:900px) and (max-height:500px) {
  .kl-presence-dialog .kl-dialog-actions > button,
  .kl-presence-body > .kl-platform-profile-sections > .kl-platform-profile-tabs > button { min-height:40px; }
  .kl-profile-preview-choice { height:40px; }
}
@media(min-width:701px) and (max-height:500px) {
  .kl-presence-dialog:has([data-profile-section="appearance"]:not([hidden])) .kl-dialog-header { min-height:0;padding:10px 16px; }
  .kl-presence-dialog:has([data-profile-section="appearance"]:not([hidden])) .kl-profile-editor-brand { display:none; }
  .kl-presence-dialog:has([data-profile-section="appearance"]:not([hidden])) .kl-dialog-actions { padding-block:8px; }
  .kl-presence-body:has([data-profile-section="appearance"]:not([hidden])) > .kl-platform-profile-sections > .kl-platform-profile-tabs { margin-bottom:10px;padding-block:4px; }
}
@media(min-width:901px) and (max-height:500px) {
  .kl-presence-body:has([data-profile-section="appearance"]:not([hidden])) > .kl-platform-profile-sections > .kl-platform-profile-tabs > button { min-height:30px; }
}
@media(min-width:701px) and (max-width:900px) and (max-height:500px) {
  .kl-presence-dialog .kl-dialog-header { min-height:61px;padding:10px 12px; }
  .kl-presence-dialog .kl-dialog-header > .kl-icon-button { width:40px;min-width:40px;height:40px;min-height:40px; }
  .kl-presence-dialog .kl-dialog-actions { padding:10px 12px; }
}
@container kl-panel (width <= 700px) {
  .kl-own-profile-page .kl-profile-summary { margin-bottom:0; }
  .kl-own-profile-page .kl-addon-profile-hero { grid-template-columns:56px minmax(0,1fr);padding-bottom:8px; }
  .kl-own-profile-page .kl-addon-profile-avatar-shell,.kl-own-profile-page .kl-addon-profile-avatar { width:56px;height:56px; }
  .kl-own-profile-page .kl-addon-profile-actions > .kl-addon-profile-action--primary:first-child { flex:1; }
  .kl-own-profile-page .kl-profile-options > summary { min-height:40px; }
  .kl-own-profile-page .kl-addon-profile-card .kl-platform-profile-tabs { padding-top:4px;margin-bottom:8px; }
}

/* Read profile overlay */
.kl-addon-profile-dialog { --kl-profile-sheet-padding:16px;--kl-profile-header-padding:12px; }
.kl-addon-profile-dialog > .kl-addon-profile-body { min-width:0;padding:0 0 16px;overflow-x:hidden;overflow-y:auto;scrollbar-width:thin; }
.kl-addon-profile-dialog .kl-addon-profile-card[data-profile-owner] { width:100%;min-width:0;background:transparent;border:0;box-shadow:none;isolation:auto; }
.kl-addon-profile-dialog .kl-addon-profile-card { font-size:12px;line-height:1.5; }
.kl-addon-profile-dialog .kl-profile-summary { margin-inline:0;background-color:var(--kl-profile-bg); }
.kl-addon-profile-dialog .kl-addon-profile-card[data-custom-outline="true"] .kl-profile-summary { outline:1px solid var(--kl-profile-outline);outline-offset:-1px; }
.kl-addon-profile-dialog .kl-addon-profile-hero { gap:8px 12px;align-items:center;padding-inline:var(--kl-profile-header-padding);padding-bottom:12px; }
.kl-addon-profile-dialog .kl-addon-profile-banner { border-bottom:0;border-radius:0; }
.kl-addon-profile-dialog [data-profile-style="classic"] .kl-addon-profile-banner[data-banner-state="default"],
.kl-presence-dialog .kl-profile-appearance-preview[data-profile-style="classic"] .kl-profile-banner-preview[data-banner-state="default"] {
  background:var(--kl-panel-art),radial-gradient(circle 90px at calc(84% - 90px) -28px,transparent 98.8%,#d6a24b24 99%,#d6a24b24 100%,transparent 100.2%),linear-gradient(110deg,#291318,#151214 66%,#211b13);
}
.kl-addon-profile-dialog .kl-addon-profile-banner[data-banner-state="default"]::before,
.kl-presence-dialog .kl-profile-banner-preview[data-banner-state="default"]::before { content:"✦";position:absolute;right:16px;bottom:12px;color:color-mix(in srgb,var(--kl-gold),transparent 55%);font-size:18px; }
.kl-addon-profile-dialog .kl-addon-profile-identity { display:block;padding:0; }
.kl-addon-profile-dialog .kl-addon-profile-avatar { border:1px solid var(--kl-border-strong);font-size:26px;font-weight:600;line-height:normal; }
.kl-addon-profile-dialog .kl-addon-profile-identity h2 { width:fit-content;max-width:100%;letter-spacing:-.3px; }
.kl-addon-profile-dialog .kl-addon-profile-identity h2[data-creator="true"] { color:var(--kl-gold); }
@media not (forced-colors:active) {
  .kl-addon-profile-dialog .kl-addon-profile-identity h2[data-creator="true"] { background-image:var(--kl-creator-gradient,linear-gradient(100deg,#ed2844 0%,#df654c 35%,#d8b65d 73%,#c4a354 100%));background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent; }
}
@media (forced-colors:active) {
  .kl-addon-profile-dialog .kl-addon-profile-identity h2[data-creator="true"] { background:none;color:ButtonText;-webkit-text-fill-color:ButtonText; }
}
.kl-addon-profile-dialog .kl-addon-profile-handle { margin-top:2px; }
.kl-addon-profile-dialog .kl-addon-profile-status { width:fit-content; }
.kl-addon-profile-dialog .kl-addon-profile-hero > .kl-addon-profile-actions { grid-column:1 / -1;justify-content:flex-start;padding:0; }
.kl-addon-profile-dialog .kl-addon-profile-actions > .kl-addon-profile-action { display:inline-flex;flex:0 1 auto;align-items:center;justify-content:center;gap:6px;width:auto;min-width:0;min-height:34px;height:34px;padding:0 10px;border-radius:8px; }
.kl-addon-profile-dialog .kl-addon-profile-action > .kl-icon { width:14px;height:14px; }
.kl-addon-profile-dialog .kl-addon-profile-actions > .kl-relationship-controls { flex:0 1 auto; }
.kl-addon-profile-dialog .kl-addon-profile-actions .kl-friend-action,
.kl-addon-profile-dialog .kl-addon-profile-actions .kl-relationship-controls > .kl-social-menu > summary { min-height:34px;height:34px; }
.kl-addon-profile-dialog .kl-addon-profile-copy { margin-inline-start:auto; }
.kl-addon-profile-dialog [data-profile-owner="true"] .kl-addon-profile-copy { margin-inline-start:0; }
.kl-addon-profile-dialog .kl-addon-profile-actions > .kl-profile-options { margin-inline-start:0; }
.kl-addon-profile-dialog .kl-addon-profile-copy,
.kl-addon-profile-dialog .kl-addon-profile-actions > .kl-profile-options > summary { width:34px;min-width:34px;height:34px;min-height:34px;padding:0;border-radius:8px; }
.kl-addon-profile-dialog .kl-addon-profile-copy > .kl-icon,
.kl-addon-profile-dialog .kl-addon-profile-actions > .kl-profile-options > summary > .kl-icon { width:14px;height:14px; }
.kl-addon-profile-dialog .kl-addon-profile-facts { margin:0 var(--kl-profile-header-padding);padding:0;border-bottom:0;gap:0; }
.kl-addon-profile-card[data-profile-owner] .kl-addon-profile-fact { grid-template-columns:12px minmax(0,1fr);column-gap:6px; }
.kl-addon-profile-card[data-profile-owner] .kl-addon-profile-fact > :is(span,strong,.kl-addon-profile-fact-value) { grid-column:2; }
.kl-addon-profile-card[data-profile-owner] .kl-addon-profile-fact > .kl-icon { grid-area:1 / 1 / 3;align-self:center;width:12px;height:12px;color:var(--kl-profile-muted); }
.kl-addon-profile-card[data-profile-owner] .kl-addon-profile-fact-value { grid-template-columns:minmax(0,1fr) auto;gap:6px; }
.kl-addon-profile-card[data-profile-owner] .kl-addon-profile-fact-value > .kl-icon { display:block;width:12px;height:12px;color:var(--kl-profile-muted); }
.kl-addon-profile-dialog .kl-addon-profile-fact { min-height:54px;padding:10px 6px;grid-column:auto; }
.kl-addon-profile-dialog .kl-addon-profile-fact:first-child { padding-inline-start:0; }
.kl-addon-profile-dialog .kl-addon-profile-fact:last-child { padding-inline-end:0; }
.kl-addon-profile-dialog .kl-addon-profile-fact > span { font-weight:500; }
.kl-addon-profile-dialog .kl-addon-profile-fact strong { font-weight:550;white-space:normal;overflow-wrap:anywhere; }
.kl-addon-profile-dialog .kl-addon-profile-card > .kl-platform-profile-sections { padding:0 var(--kl-profile-sheet-padding); }
.kl-addon-profile-dialog .kl-addon-profile-card .kl-platform-profile-tabs { position:sticky;top:0;z-index:4;flex-wrap:nowrap;gap:16px;overflow-x:auto;scrollbar-width:none;background:var(--kl-surface); }
.kl-addon-profile-dialog .kl-addon-profile-card .kl-platform-profile-tabs > button { flex:none;position:relative;height:38px;min-height:auto;padding:0 2px 10px;border:0;font-weight:500;line-height:1.5; }
.kl-addon-profile-dialog .kl-addon-profile-card .kl-platform-profile-tabs > button[aria-selected="true"]::after { content:"";position:absolute;inset:auto 0 0;height:2px;border-radius:2px;background:var(--kl-accent); }
.kl-addon-profile-dialog .kl-profile-overview { align-items:stretch; }
.kl-addon-profile-dialog .kl-profile-overview > section { padding:8px 0;min-width:0; }
.kl-addon-profile-dialog .kl-platform-profile-tags:empty { display:none; }
.kl-addon-profile-dialog [data-profile-owner="true"] .kl-addon-profile-hero > .kl-addon-profile-actions { margin-top:2px; }
.kl-addon-profile-dialog [data-profile-owner="true"] .kl-addon-profile-facts { grid-auto-rows:auto; }
.kl-addon-profile-dialog [data-profile-owner="true"] .kl-addon-profile-fact { min-height:0;row-gap:4px;line-height:1.5; }
.kl-addon-profile-dialog [data-profile-owner="true"] .kl-addon-profile-fact strong[title] { overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.kl-addon-profile-dialog [data-profile-owner="true"] .kl-profile-overview .kl-profile-section-heading h3 { font-weight:650;letter-spacing:-.2px; }
.kl-addon-profile-dialog [data-profile-owner="true"] .kl-profile-overview .kl-platform-profile-tags > span { line-height:1.4;background:transparent; }
.kl-addon-profile-dialog [data-profile-owner="true"] .kl-profile-overview .kl-profile-details { line-height:1.5; }
@container kl-profile-sheet (width <= 540px) {
  .kl-addon-profile-dialog [data-profile-owner="true"] .kl-profile-overview .kl-profile-section-heading > button { min-height:28px;padding-block:0; }
  .kl-addon-profile-dialog .kl-addon-profile-card { --kl-profile-banner-height:96px;--kl-profile-sheet-padding:12px;--kl-profile-header-padding:10px; }
  .kl-addon-profile-dialog .kl-addon-profile-hero { padding-bottom:10px; }
  .kl-addon-profile-dialog .kl-addon-profile-hero { grid-template-columns:56px minmax(0,1fr);gap:8px 10px; }
  .kl-addon-profile-dialog :is(.kl-addon-profile-avatar-shell,.kl-addon-profile-avatar) { width:56px;height:56px; }
  .kl-addon-profile-dialog .kl-addon-profile-avatar { font-size:20px; }
  .kl-addon-profile-dialog .kl-addon-profile-status-control { min-height:36px;flex-wrap:wrap;gap:4px 6px; }
  .kl-addon-profile-dialog .kl-addon-profile-actions { display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 34px 34px;gap:6px; }
  .kl-addon-profile-dialog [data-profile-owner="true"] .kl-addon-profile-actions { grid-template-columns:minmax(0,1fr) 34px 34px; }
  .kl-addon-profile-dialog .kl-addon-profile-actions :is(.kl-addon-profile-action,.kl-friend-action,.kl-addon-profile-copy),
  .kl-addon-profile-dialog .kl-addon-profile-actions :is(.kl-profile-options,.kl-social-menu) > summary { height:40px;min-height:40px; }
  .kl-addon-profile-dialog .kl-addon-profile-actions > .kl-addon-profile-action { grid-column:auto;width:100%;margin-inline-end:0;padding-inline:6px; }
  .kl-addon-profile-dialog .kl-addon-profile-copy { margin:0; }
  .kl-addon-profile-card[data-profile-owner] .kl-addon-profile-fact { grid-template-columns:minmax(0,1fr); }
  .kl-addon-profile-card[data-profile-owner] .kl-addon-profile-fact > :is(span,strong,.kl-addon-profile-fact-value) { grid-column:1; }
  .kl-addon-profile-card[data-profile-owner] .kl-addon-profile-fact > .kl-icon { display:none; }
  .kl-addon-profile-dialog .kl-addon-profile-fact { padding-inline:4px; }
  .kl-addon-profile-dialog .kl-addon-profile-fact > span { font-size:9px; }
  .kl-addon-profile-dialog .kl-addon-profile-fact strong { font-size:10px; }
  .kl-addon-profile-dialog .kl-profile-location { padding-inline-end:16px!important; }
  .kl-addon-profile-dialog .kl-profile-location > .kl-profile-location-refresh { width:16px;min-width:16px; }
  .kl-addon-profile-dialog .kl-profile-location > .kl-profile-location-refresh .kl-icon { width:10px;height:10px; }
}
@media (max-height:600px) {
  .kl-addon-profile-dialog .kl-addon-profile-card { --kl-profile-banner-height:clamp(60px,14dvh,84px); }
  .kl-addon-profile-dialog .kl-addon-profile-hero { padding-block-start:calc(var(--kl-profile-banner-height) + 8px); }
  .kl-addon-profile-dialog .kl-addon-profile-avatar { font-size:18px; }
  .kl-addon-profile-dialog .kl-addon-profile-fact { min-height:44px;padding-block:6px; }
  @container kl-profile-sheet (width > 540px) {
    .kl-addon-profile-dialog .kl-addon-profile-hero { grid-template-columns:64px minmax(0,1fr) fit-content(50%); }
    .kl-addon-profile-dialog .kl-addon-profile-hero > .kl-addon-profile-actions { grid-column:auto;justify-content:flex-end; }
  }
}
${PROFILE_READ_SOCIAL_STYLES}
${PROFILE_READ_CONTENT_STYLES}

.kl-presence-dialog[data-quick-status="true"] { width:min(420px,calc(100% - 24px));height:fit-content; }
.kl-presence-dialog[data-quick-status="true"] :is(.kl-platform-profile-tabs,.kl-profile-editor-brand,.kl-profile-presence-controls > summary,.kl-profile-save-hint),
.kl-presence-dialog[data-quick-status="true"] [data-profile-section="about"] > :not(.kl-profile-presence-controls),
.kl-presence-dialog[data-quick-status="true"] .kl-profile-presence-controls > div > :not(.kl-presence-options,.kl-status-note-field,.kl-status-sharing-row),
.kl-presence-dialog[data-quick-status="true"] .kl-status-sharing-row:has(input:checked) { display:none; }
.kl-presence-dialog[data-quick-status="true"] .kl-profile-presence-controls { border:0;padding:0; }
.kl-presence-dialog[data-quick-status="true"] .kl-profile-presence-controls > div { padding:0; }
.kl-own-profile-page > .kl-addon-profile-body { padding-inline:0; }
.kl-own-profile-page .kl-addon-profile-card { max-width:none; }
.kl-own-profile-page .kl-addon-profile-card > .kl-platform-profile-sections { padding-inline:var(--kl-profile-header-padding,16px); }
`;
