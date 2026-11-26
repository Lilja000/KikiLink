export const PROFILE_READ_SOCIAL_STYLES = `
.kl-profile-friend-list,.kl-profile-community-list { display:grid;gap:0;min-width:0; }
.kl-addon-profile-card :is(.kl-profile-friend-row,.kl-profile-community-row) {
  display:flex;align-items:center;gap:10px;width:100%;min-width:0;
  padding:10px 0;border:0;border-bottom:1px solid var(--kl-border);border-radius:0;
  background:transparent;text-align:left;line-height:1.5;cursor:pointer;
}
.kl-addon-profile-card :is(.kl-profile-friend-row,.kl-profile-community-row):last-child { border-bottom:0; }
.kl-addon-profile-card :is(.kl-profile-friend-row,.kl-profile-community-row):focus-visible {
  outline:2px solid color-mix(in srgb,var(--kl-accent) 52%,white);outline-offset:3px;
}
.kl-addon-profile-card .kl-profile-row-copy { flex:1;min-width:0;text-align:left; }
.kl-addon-profile-card .kl-profile-row-copy strong {
  display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:550;
}
.kl-addon-profile-card .kl-profile-row-copy small { display:block;margin-top:3px;color:var(--kl-muted);font-size:10px;overflow-wrap:anywhere; }
.kl-addon-profile-card .kl-profile-community-row .kl-profile-row-copy small { overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.kl-addon-profile-card button:is(.kl-profile-friend-row,.kl-profile-community-row):hover .kl-profile-row-copy strong {
  color:color-mix(in srgb,var(--kl-accent),white 12%);
}
.kl-addon-profile-card :is(.kl-profile-friend-row,.kl-profile-community-row) > .kl-icon {
  width:13px;height:13px;color:var(--kl-muted);stroke-width:1.65;
}
.kl-addon-profile-card .kl-profile-friend-avatar {
  display:inline-grid;place-items:center;flex:none;width:36px;height:36px;
  border:1px solid var(--kl-border-strong);border-radius:50%;background:var(--kl-avatar-bg);color:var(--kl-text);
  font-family:var(--kl-title-font,inherit);font-size:13px;font-weight:600;
}
.kl-addon-profile-card .kl-profile-community-row > .kl-cm-emblem {
  width:32px;height:32px;border-radius:8px;border-color:color-mix(in srgb,var(--cm-ink) 14.51%,transparent);
}
.kl-addon-profile-card .kl-profile-community-row > .kl-cm-emblem > .kl-icon { width:17px;height:17px;stroke-width:1.65; }
.kl-own-profile-page .kl-platform-profile-section > .kl-profile-communities:not(:has(> .kl-profile-view-as-locked)) {
  padding:12px;border-bottom:1px solid var(--kl-border);
}
.kl-profile-communities .kl-profile-section-heading { flex-wrap:wrap;gap:10px; }
.kl-profile-communities .kl-profile-communities-explore { margin-inline-start: auto; }
.kl-profile-communities .kl-profile-communities-explore + .kl-profile-options { margin-inline-start:0; }
:is(.kl-profile-friends,.kl-profile-communities) > .kl-text-button { margin-top:8px; }
.kl-addon-profile-dialog .kl-addon-profile-card :is(.kl-profile-friend-row,.kl-profile-community-row) { gap:8px;padding:8px 0; }
.kl-addon-profile-dialog .kl-profile-overview :is(.kl-profile-friend-row,.kl-profile-community-row):hover { background:transparent; }
.kl-addon-profile-dialog .kl-addon-profile-card .kl-profile-friend-avatar { flex:none;width:30px;height:30px; }
.kl-addon-profile-card article.kl-profile-community-row { cursor:default; }
@media (max-width:700px) {
  .kl-addon-profile-card :is(.kl-profile-friend-row,.kl-profile-community-row) { min-height:48px; }
  .kl-addon-profile-dialog .kl-addon-profile-card :is(.kl-profile-friend-row,.kl-profile-community-row) { min-height:44px; }
  .kl-own-profile-page .kl-platform-profile-section > .kl-profile-communities:not(:has(> .kl-profile-view-as-locked)) { padding-inline:0; }
}
`;
