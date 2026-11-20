/** Shared Direct/Groups interaction geometry, including touch and composer quotes. */
export const MESSAGE_INTERACTION_STYLES = `
.kl-message-reactions { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 6px; max-width: 100%; }
.kl-message-reactions[hidden] { display: none !important; }
.kl-message-reaction, .kl-message-reaction-picker>summary { box-sizing: border-box; min-width: 30px; min-height: 30px; padding: 3px 7px; border: 1px solid var(--kl-border); border-radius: 12px; background: var(--kl-surface-2); color: var(--kl-text); font: inherit; font-size: 13px; cursor: pointer; }
.kl-message-reaction { font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif; }
.kl-message-reaction[aria-pressed="true"] { border-color: var(--kl-gold); background: color-mix(in srgb, var(--kl-gold) 16%, var(--kl-surface-2)); }
.kl-message-reaction:disabled, .kl-message-reaction-picker>summary[aria-disabled="true"] { opacity: .6; cursor: wait; }
.kl-message-reaction:focus-visible, .kl-message-reaction-picker>summary:focus-visible { outline: 2px solid var(--kl-gold); outline-offset: 2px; }
.kl-message-reaction-picker { max-width: 100%; }
.kl-message-reaction-picker>summary { display: grid; place-items: center; list-style: none; width: 30px; color: var(--kl-muted); }
.kl-message-reaction-picker>summary::-webkit-details-marker { display: none; }
.kl-message-reaction-picker>summary .kl-icon { width: 16px; height: 16px; }
.kl-message-reaction-picker[open] { flex-basis: 100%; }
.kl-message-reaction-choices { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; width: 208px; max-width: 100%; padding-top: 6px; }
.kl-message-reaction-choices .kl-message-reaction { font-size: 19px; min-height: 36px; padding: 4px; }
.kl-message-reaction-error { flex-basis: 100%; font-size: 11px; color: var(--kl-muted); }
@media (pointer: coarse) { .kl-message-reaction, .kl-message-reaction-picker>summary { min-height: 44px; min-width: 44px; } .kl-message-reaction-choices { width: 236px; } }

.kl-message-line { min-width: 0; display: flex; align-items: center; gap: 6px; }
.kl-message-line>.kl-message-bubble { min-width: 0; flex: 0 1 auto; }
.kl-message-line[data-direction="outgoing"] { flex-direction: row-reverse; }
.kl-message-side-actions {
  display: flex;
  flex: 0 0 auto;
  pointer-events: none;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transform: translateX(-3px);
  transition: opacity 120ms ease, transform 120ms ease;
}
.kl-message-interaction[data-direction="outgoing"] .kl-message-side-actions { transform: translateX(3px); }
@media (hover: hover) { .kl-message-interaction:hover .kl-message-side-actions { opacity: 1; pointer-events: auto; transform: translateX(0); } }
.kl-message-interaction[data-actions="true"] .kl-message-side-actions,
.kl-message-interaction:has(:focus-visible) .kl-message-side-actions { opacity: 1; pointer-events: auto; transform: translateX(0); }
.kl-message-interaction .kl-message-action, .kl-composer-reply .kl-message-action {
  width: 29px;
  height: 29px;
  min-height: 29px;
  flex: 0 0 auto;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--kl-muted);
  cursor: pointer;
}
.kl-message-action .kl-icon { width: 15px; height: 15px; }
.kl-message-action:hover { border-color: var(--kl-border); background: var(--kl-surface-2); color: var(--kl-gold); }

.kl-message-reply {
  min-width: 0;
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  margin: -2px 0 7px;
  padding: 0 2px 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--kl-border-strong), transparent 28%);
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
  line-height: 1.3;
  white-space: nowrap;
}
.kl-message-reply-icon { width: 13px; height: 13px; color: var(--kl-gold); }
.kl-message-reply-copy { min-width: 0; display: flex; align-items: baseline; gap: 5px; }
.kl-message-reply-author { flex: 0 1 auto; overflow: hidden; color: var(--kl-gold); text-overflow: ellipsis; white-space: nowrap; }
.kl-message-reply-excerpt { min-width: 0; flex: 1 1 auto; overflow: hidden; color: var(--kl-muted); text-overflow: ellipsis; white-space: nowrap; }
.kl-message-interaction[data-direction="outgoing"] .kl-message-reply { border-bottom-color: color-mix(in srgb, var(--kl-accent-foreground), transparent 70%); }
.kl-message-interaction[data-direction="outgoing"] .kl-message-reply-author,
.kl-message-interaction[data-direction="outgoing"] .kl-message-reply-icon { color: color-mix(in srgb, var(--kl-accent-foreground), var(--kl-gold) 28%); }
.kl-message-interaction[data-direction="outgoing"] .kl-message-reply-excerpt { color: color-mix(in srgb, var(--kl-accent-foreground), transparent 34%); }
.kl-message-action:active { background: var(--kl-surface-2); color: var(--kl-gold); transform: scale(.94); }
.kl-message-action:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 1px; }
.kl-composer-reply { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid var(--kl-border); border-radius: 10px; background: var(--kl-surface-2); }
.kl-composer-reply[hidden] { display: none !important; }
.kl-composer-reply .kl-message-reply { margin: 0; padding: 0; border: 0; }
.kl-composer-reply .kl-message-reply-copy { display: grid; gap: 2px; }
@media (pointer: coarse) {
  .kl-message-interaction .kl-message-action, .kl-composer-reply .kl-message-action { width: 44px; height: 44px; min-height: 44px; }
}
@media (prefers-reduced-motion: reduce) { .kl-message-side-actions { transition: none; } }
:host([data-reduced-motion="true"]) .kl-message-side-actions { transition: none; }
`;
