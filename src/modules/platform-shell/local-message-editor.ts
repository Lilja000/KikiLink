import { element } from "../../utils/dom";
import type { ContentDialog } from "../link-chat/content-dialog";
import { fitPanelDialog } from "./panel-dialog-layout";

export function openLocalMessageEditor(dialog: ContentDialog, panel: HTMLElement, options: {
  mode: "edit" | "delete"; text: string; attachments: boolean;
  current(): boolean; save(value: string | null): Promise<void>; done?(): void; subscribe?(check: () => void): () => void;
}): void {
  const edit = options.mode === "edit";
  const field = element("textarea", { className: "kl-textarea" });
  field.value = options.text; field.maxLength = 2000; field.rows = 5;
  const hint = element("small", { className: "kl-local-message-hint" });
  const status = element("div", { className: "kl-cloud-status" });
  status.setAttribute("role", "status");
  const label = element("label", { className: "kl-local-message-field" }, element("span", { text: "Message" }), field, hint);
  const cancel = element("button", { type: "button", className: "kl-text-button", text: "Cancel", onClick: dismiss });
  const save = element("button", { type: "button", className: "kl-text-button " + (edit ? "kl-text-button--primary" : "kl-text-button--danger"),
    text: edit ? "Save message" : "Delete message", onClick: () => void submit() });
  const content = element("div", { className: "kl-local-message-body" }, edit ? label : element("p", {
    text: "Remove this message from your view on this device. Other participants keep their copy.",
  }), edit && options.attachments ? element("p", { text: "Attachments are kept when you edit this message." }) : null, status);
  const footer = element("footer", { className: "kl-dialog-actions" }, cancel, save);
  const keep = element("button", { type: "button", className: "kl-text-button", text: "Keep editing", onClick: () => {
    discard.hidden = true; footer.hidden = content.hidden = false; field.focus();
  } });
  const discard = element("div", { className: "kl-local-message-body" }, element("strong", { text: "Discard message edits?" }), keep,
    element("button", { type: "button", className: "kl-text-button", text: "Discard", onClick: () => dialog.close() }));
  discard.hidden = true;
  const form = element("div", { className: "kl-local-message-editor" }, content, footer, discard);
  let busy = false;
  function update() {
    hint.textContent = field.value.length + "/2000 · Change the text to enable Save.";
    save.disabled = busy || edit && (field.value.trim() === options.text.trim() || field.value.length > 2000 || !options.attachments && !field.value.trim());
  }
  function dismiss() {
    if (busy) return;
    if (!edit || options.text === field.value || !options.current()) { dialog.close(); return; }
    content.hidden = footer.hidden = true; discard.hidden = false; keep.focus();
  }
  async function submit() {
    if (!form.isConnected || !dialog.element.open || save.disabled || busy) return;
    if (!options.current()) { dialog.close(); return; }
    busy = true; field.disabled = cancel.disabled = true; update();
    try {
      await options.save(edit ? field.value.trim() : null);
      if (form.isConnected && dialog.body.contains(form)) { dialog.close(); options.done?.(); }
    } catch (error) {
      if (form.isConnected) { status.textContent = error instanceof Error ? error.message : "Could not save this local change."; field.focus(); }
    } finally { busy = false; field.disabled = cancel.disabled = false; update(); }
  }
  field.addEventListener("input", update); update();
  let release: (() => void) | undefined, unsubscribe: (() => void) | undefined;
  dialog.show(edit ? "Edit your message" : "Delete this message locally?", form, () => {
    release?.(); unsubscribe?.(); delete dialog.element.dataset.localMessage;
    for (const key of ["inset", "max-width", "max-height", "--kl-dialog-viewport-height"]) dialog.element.style.removeProperty(key);
  }, dismiss);
  dialog.element.dataset.localMessage = "true";
  release = fitPanelDialog(dialog.element, { panel, layout: (width, height) => {
    dialog.element.dataset.localMessage = width <= 700 || width <= 900 && height <= 500 ? "compact" : "desktop";
    return { marginX: 12, marginY: 12 };
  } });
  unsubscribe = options.subscribe?.(() => { if (dialog.body.contains(form) && !options.current()) dialog.close(); });
  (edit ? field : cancel).focus();
}
