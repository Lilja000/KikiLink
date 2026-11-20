import type { KikiLinkSettings } from "../../core/types";
import type { SettingsStore } from "../../core/settings";
import { element } from "../../utils/dom";

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type Value = string | number | boolean;
export interface InlineSetting {
  refresh(): void;
  reset(): void;
  defaults(draft: KikiLinkSettings, defaults: KikiLinkSettings): void;
}
let sequence = 0;

/** Save one field against the latest settings; incomplete input never commits other fields. */
export function inlineSetting<T extends Value>(options: {
  control: Control; store: SettingsStore; read: (settings: KikiLinkSettings) => T;
  write: (settings: KikiLinkSettings, value: T) => void;
  active: () => boolean; after?: (settings: KikiLinkSettings) => void; render?: () => void; restoreDefault?: boolean;
}): InlineSetting {
  const { control, store, read, write, active, after } = options;
  const numeric = control instanceof HTMLInputElement && ["number", "range"].includes(control.type);
  const checkbox = control instanceof HTMLInputElement && control.type === "checkbox";
  const row = control.closest<HTMLElement>(".kl-setting-row") ?? control.parentElement!;
  const message = element("span");
  const error = element("div", { className: "kl-inline-setting-error" }, message);
  error.id = `kl-inline-setting-error-${++sequence}`; error.hidden = true; error.setAttribute("role", "alert");
  const description = control.getAttribute("aria-describedby");
  control.setAttribute("aria-describedby", [description, error.id].filter(Boolean).join(" "));
  let dirty = false;
  const showValue = (value: T) => {
    if (checkbox) (control as HTMLInputElement).checked = Boolean(value);
    else {
      if (control instanceof HTMLSelectElement && ![...control.options].some(o => o.value === String(value))) {
        const unavailable = element("option", { text: "Unavailable on this device" }); unavailable.value = String(value); unavailable.disabled = true; control.append(unavailable);
      }
      control.value = String(value);
    }
    options.render?.();
  };
  const clear = () => { error.hidden = true; control.removeAttribute("aria-invalid"); };
  const restore = () => { dirty = false; clear(); showValue(read(store.get())); };
  const fail = (text: string) => { message.textContent = text; error.hidden = false; control.setAttribute("aria-invalid", "true"); };
  const commit = () => {
    if (!active() || !control.isConnected || control.disabled) return;
    dirty = true;
    if (numeric && (!control.value.trim() || !Number.isInteger(Number(control.value)) || !control.checkValidity())) {
      fail(`Enter a whole number from ${(control as HTMLInputElement).min} to ${(control as HTMLInputElement).max}.`); return;
    }
    if (control instanceof HTMLSelectElement && ![...control.options].some(o => o.value === control.value && !o.disabled)) return;
    if (control instanceof HTMLTextAreaElement && control.required && !control.value.trim()) { fail(control.title || "Enter some text."); return; }
    if (!numeric && !control.checkValidity()) { fail(control.title || "Enter a valid value."); return; }
    const value = (checkbox ? (control as HTMLInputElement).checked : numeric ? Number(control.value) : control.value) as T;
    let saved: KikiLinkSettings;
    try { saved = store.update(draft => write(draft, value), { requirePersistence: true }); }
    catch { fail(store.persistence.status().message || "Couldn’t save on this device. Free some browser storage and retry."); return; }
    dirty = false; clear(); showValue(read(saved)); after?.(saved);
  };
  error.append(element("button", { type: "button", className: "kl-text-button", text: "Retry", onClick: commit }),
    element("button", { type: "button", className: "kl-text-button", text: "Revert", onClick: () => { if (active()) restore(); } }));
  row.append(error);
  control.addEventListener("input", () => { if (active()) dirty = true; });
  control.addEventListener("change", commit);
  control.addEventListener("keydown", event => {
    if ((event as KeyboardEvent).key === "Enter" && !(event as KeyboardEvent).isComposing && control instanceof HTMLInputElement && numeric) {
      event.preventDefault(); event.stopPropagation(); commit();
    }
  });
  return { refresh: () => { if (!dirty) showValue(read(store.get())); }, reset: restore,
    defaults: (draft, defaults) => { if (options.restoreDefault !== false) write(draft, read(defaults)); } };
}
