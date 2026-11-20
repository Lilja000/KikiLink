/** Preview-only Music source switcher and private Cloud library. */
export const AUDIO_STYLES = `
.kl-music-page[data-cloud-audio="true"] { grid-template-rows:auto auto minmax(0,1fr); }
.kl-music-sources { display:flex; gap:4px; padding:0 16px 8px; border-bottom:1px solid var(--kl-border); }
.kl-music-sources>.kl-text-button { min-height:34px; color:var(--kl-muted); background:transparent; border-color:transparent; border-radius:8px; }
.kl-music-sources>.kl-text-button[aria-selected="true"] { background:var(--kl-surface-2); color:var(--kl-text); border-color:var(--kl-border); }
.kl-music-device-library { display:grid; grid-template-rows:minmax(0,1fr) auto; min-height:0; min-width:0; overflow:hidden; }
.kl-cloud-audio { min-height:0; min-width:0; display:flex; flex-direction:column; gap:12px; padding:12px 16px; overflow:auto; overscroll-behavior:contain; scrollbar-gutter:stable; }
.kl-cloud-audio [hidden] { display:none!important; }
.kl-cloud-audio-tools { display:flex; gap:8px; align-items:center; flex-shrink:0; }
.kl-cloud-audio-tools>.kl-search { flex:1; width:auto; min-width:0; }
.kl-cloud-audio .kl-text-button { min-height:34px; display:inline-flex; justify-content:center; align-items:center; gap:6px; flex-shrink:0; border-radius:8px; }
.kl-cloud-audio .kl-icon { width:17px; height:17px; flex-shrink:0; }
.kl-cloud-audio .kl-search { height:34px; min-height:34px; border-radius:8px; }
.kl-cloud-audio-privacy { color:var(--kl-muted); font-size:11px; margin:0; }
.kl-cloud-audio-upload { display:grid; grid-template-columns:minmax(120px,1fr) minmax(100px,1fr) auto; gap:8px; align-items:end; padding:12px; border:1px solid var(--kl-border); border-radius:10px; background:var(--kl-surface); flex-shrink:0; }
.kl-cloud-audio-file { display:flex; align-items:center; min-width:0; gap:8px; }
.kl-cloud-audio-filename { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--kl-muted); font-size:11px; min-width:0; }
.kl-cloud-audio-title { display:grid; min-width:0; gap:4px; font-size:11px; color:var(--kl-muted); }
.kl-cloud-audio-title input { width:100%; box-sizing:border-box; }
.kl-cloud-audio-upload-status { grid-column:1/-1; display:flex; gap:8px; align-items:center; flex-wrap:wrap; color:var(--kl-muted); font-size:12px; min-width:0; }
.kl-cloud-audio-upload-status:empty { display:none; }
.kl-cloud-audio-upload-status progress { flex:1; min-width:60px; height:8px; accent-color:var(--kl-accent); }
.kl-cloud-audio-status { display:flex; gap:8px; align-items:center; flex-wrap:wrap; line-height:1.5; font-size:12px; color:var(--kl-muted); }
.kl-cloud-audio-status:empty { display:none; }
.kl-cloud-audio-list { min-width:0; display:flex; flex-direction:column; gap:4px; }
.kl-cloud-audio-track { display:flex; align-items:center; gap:10px; min-width:0; padding:8px; border:1px solid transparent; border-radius:8px; }
.kl-cloud-audio-track:hover { background:var(--kl-surface); }
.kl-cloud-audio-track[data-active="true"] { border-color:var(--kl-border); background:var(--kl-surface); }
.kl-cloud-audio-track-copy { flex:1; min-width:0; display:grid; gap:4px; }
.kl-cloud-audio-track-copy strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; font-weight:600; }
.kl-cloud-audio-track-copy span { color:var(--kl-muted); font-size:11px; }
.kl-cloud-audio-delete { display:flex; align-items:center; gap:6px; flex-wrap:wrap; font-size:11px; }
.kl-cloud-audio-empty { color:var(--kl-muted); font-size:12px; text-align:center; padding:24px 8px; margin:0; }
.kl-cloud-audio-transport { flex-shrink:0; position:sticky; bottom:-12px; display:grid; grid-template-columns:minmax(0,1fr) minmax(240px,1fr); align-items:center; gap:12px; border-top:1px solid var(--kl-border); padding:12px 0; margin-top:auto; background:var(--kl-surface); }
.kl-cloud-audio-transport>strong { font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.kl-cloud-audio-player { display:block; width:100%; max-width:100%; height:36px; color-scheme:dark; }
.kl-cloud-audio button:focus-visible,.kl-music-sources button:focus-visible { outline:2px solid var(--kl-accent); outline-offset:2px; }
.kl-music-sources>.kl-text-button,.kl-cloud-audio-track { transition:background-color 140ms ease,border-color 140ms ease; }
@media(max-width:720px) { .kl-cloud-audio { padding:12px; } .kl-cloud-audio-upload { grid-template-columns:minmax(0,1fr) auto; } .kl-cloud-audio-file { grid-column:1/-1; } .kl-cloud-audio-transport { grid-template-columns:minmax(0,1fr); gap:8px; } .kl-cloud-audio-track:has(.kl-cloud-audio-delete) { flex-wrap:wrap; } .kl-cloud-audio-delete { flex-basis:100%; justify-content:flex-end; } }
@media(max-height:480px) { .kl-music-page[data-cloud-audio="true"]>.kl-feature-page-header { min-height:0; padding:8px 12px; } .kl-music-page[data-cloud-audio="true"]>.kl-feature-page-header .kl-feature-page-eyebrow,.kl-music-page[data-cloud-audio="true"]>.kl-feature-page-header .kl-feature-page-subtitle { display:none; } .kl-music-page[data-cloud-audio="true"]>.kl-feature-page-header .kl-feature-page-title { font-size:16px; } .kl-cloud-audio { gap:8px; padding:8px 12px; } .kl-cloud-audio-transport { padding:8px 0; bottom:-8px; } }
@media(pointer:coarse) { .kl-cloud-audio .kl-text-button,.kl-music-sources>.kl-text-button { min-height:40px; min-width:40px; } .kl-cloud-audio .kl-search { min-height:40px; } }
@media(prefers-reduced-motion:reduce) { .kl-music-sources>.kl-text-button,.kl-cloud-audio-track { transition:none; } }
`;
