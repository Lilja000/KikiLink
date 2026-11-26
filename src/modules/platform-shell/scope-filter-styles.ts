// Listing scopes share their appearance. The surrounding page still controls
// whether a long row wraps or scrolls and when particular choices are available.
const scopeRow = `:host(#kikilink-root) :is(
  .kl-ev-scopes,
  .kl-cm-tabs:not(.kl-cm-sections),
  .kl-roster-scopes,
  .kl-request-segments,
  .kl-lobby-scopes,
  .kl-sp-directory-controls > .kl-sp-tabs,
  .kl-match-collections,
  .kl-workshop-scopes,
  .kl-feed-filter,
  .kl-inbox-filters,
  .kl-activity-library-scopes,
  .kl-chat-filters
)`;
const scope = `${scopeRow} > button[aria-pressed]`;

export const SCOPE_FILTER_STYLES = `
${scopeRow} {
  gap: 4px;
}

${scope} {
  box-sizing: border-box;
  flex: 0 0 auto;
  width: auto;
  min-width: 44px;
  height: auto;
  min-height: var(--kl-action-square, 32px);
  padding: 3px 10px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--kl-border);
  border-radius: var(--kl-action-radius, 8px);
  background: var(--kl-surface-2);
  color: var(--kl-text);
  box-shadow: none;
  font: 600 var(--kl-type-body, 12px)/1.4 var(--kl-font, system-ui);
  letter-spacing: normal;
  text-transform: none;
  white-space: nowrap;
}

${scope} > svg {
  flex: none;
  width: var(--kl-action-icon-size, 16px);
  height: var(--kl-action-icon-size, 16px);
  color: currentColor;
}

@media (hover: hover) {
  ${scope}:enabled:not([aria-disabled="true"])[aria-pressed="false"]:hover {
    border-color: var(--kl-border-strong);
    background: var(--kl-surface-hover);
    color: var(--kl-text);
  }
}

${scope}[aria-pressed="true"] {
  border-color: var(--kl-nav-selection-border, color-mix(in srgb, var(--kl-accent) 58%, var(--kl-muted)));
  background: color-mix(in srgb, var(--kl-accent) 14%, var(--kl-surface-2));
  color: var(--kl-text);
  box-shadow: inset 0 -2px var(--kl-accent);
}

${scope}:focus-visible {
  outline: 2px solid var(--kl-accent);
  outline-offset: -2px;
}

@media (forced-colors: active) {
  ${scope}[aria-pressed="true"] {
    border-color: Highlight;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  ${scope}:focus-visible { outline-color: Highlight; }
}
`;
