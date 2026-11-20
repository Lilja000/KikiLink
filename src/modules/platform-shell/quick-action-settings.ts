import { element } from "../../utils/dom";
import type { SettingsStore } from "../../core/settings";
import type { QuickAction } from "../../core/types";
import { kikiIcon } from "../link-chat/icons";
import { fitPanelDialog } from "./panel-dialog-layout";

export class QuickActionSettings {
  readonly list = element("div", { className: "kl-settings-quick-list" });
  readonly add = element("button", { type: "button", className: "kl-text-button", text: "Add quick action" });
  readonly status = element("p", { className: "kl-setting-help" });
  readonly dialog = element("dialog", { className: "kl-dialog kl-settings-quick-dialog" });
  #signature = "";
  constructor(readonly store: SettingsStore, readonly active: () => boolean) {
    this.dialog.addEventListener("keydown", event => event.stopPropagation());
    this.add.prepend(kikiIcon("plus"));
    this.add.addEventListener("click", () => this.#open(undefined));
    this.status.hidden = true;
    this.status.setAttribute("role", "status");
    this.refresh();
  }

  refresh(): void {
    const actions = this.store.getSection("linkChat").quickActions;
    const signature = JSON.stringify(actions);
    if (signature === this.#signature) return;
    this.#signature = signature;
    this.add.disabled = actions.length >= 12;
    this.add.title = this.add.disabled ? "Maximum 12 quick actions." : "";
    this.list.replaceChildren();
    actions.forEach((action, index) => {
      const edit = element("button", { type: "button", className: "kl-icon-button", ariaLabel: `Edit ${action.label}`, title: `Edit ${action.label}`,
        onClick: () => { if (this.#signature === signature) this.#open(index); } }, kikiIcon("edit"));
      const remove = element("button", { type: "button", className: "kl-icon-button", ariaLabel: `Delete ${action.label}`, title: `Delete ${action.label}`,
        onClick: () => {
          if (!remove.isConnected || !this.active() || this.dialog.open) return;
          if (this.#commit(signature, items => items.splice(index, 1), this.status))
            this.#focus(index);
        } }, kikiIcon("trash"));
      this.list.append(element("div", { className: "kl-settings-quick-row" }, element("div", {},
        element("strong", { text: action.label }), element("small", { text: action.template, title: action.template })), edit, remove));
    });
    if (!actions.length) this.list.append(element("p", { className: "kl-setting-help", text: "No quick actions." }));
  }

  #focus(index: number): void {
    (this.list.children[index]?.querySelector("button") ?? this.add).focus({ preventScroll: true });
  }

  #commit(baseline: string, change: (actions: QuickAction[]) => void, error: HTMLElement): boolean {
    try {
      this.store.update(draft => {
        if (JSON.stringify(draft.linkChat.quickActions) !== baseline) throw new Error("Quick actions changed. Reopen the editor to review them.");
        change(draft.linkChat.quickActions);
      }, { requirePersistence: true });
    } catch (problem) {
      error.hidden = false;
      error.textContent = problem instanceof Error ? problem.message : "Couldn’t save quick actions on this device.";
      error.setAttribute("role", "alert");
      return false;
    }
    this.status.hidden = true;
    this.status.setAttribute("role", "status");
    this.refresh();
    return true;
  }

  #open(index?: number): void {
    if (!this.active() || !this.add.isConnected || this.dialog.open) return;
    const actions = this.store.getSection("linkChat").quickActions;
    const action = index === undefined ? { label: "", template: "" } : actions[index];
    if (!action || index === undefined && actions.length >= 12) return;
    const baseline = JSON.stringify(actions);
    const title = index === undefined ? "Add quick action" : "Edit quick action";
    this.dialog.setAttribute("aria-label", title);
    const name = element("input", { className: "kl-input", ariaLabel: "Name" });
    name.value = action.label; name.maxLength = 24;
    const message = element("textarea", { className: "kl-textarea", ariaLabel: "Message" });
    message.value = action.template; message.maxLength = 500; message.rows = 3;
    const error = element("p", { className: "kl-setting-help" });
    error.setAttribute("role", "status");
    const dirty = () => name.value !== action.label || message.value !== action.template;
    const edit = element("div", { className: "kl-dialog-body" });
    const footer = element("footer", { className: "kl-dialog-actions" });
    const confirm = element("div", { className: "kl-dialog-body" }); confirm.hidden = true;
    const close = () => {
      if (!dirty()) this.dialog.close();
      else { edit.hidden = true; footer.hidden = true; confirm.hidden = false; keep.focus(); }
    };
    const keep = element("button", { className: "kl-text-button", type: "button", text: "Keep editing", onClick: () => {
      confirm.hidden = true; edit.hidden = false; footer.hidden = false; name.focus();
    } });
    confirm.append(element("p", { text: "Discard your unsaved changes?" }), keep, element("button", { className: "kl-text-button", type: "button", text: "Discard", onClick: () => this.dialog.close() }));
    const save = element("button", { className: "kl-text-button kl-text-button--primary", type: "button", text: "Save", onClick: () => {
      if (!this.active() || !this.dialog.open || confirm.hidden === false || save.disabled) return;
      const change = { label: name.value.trim(), template: message.value.trim() };
      if (this.#commit(baseline, items => { if (index === undefined) items.push(change); else items[index] = change; }, error)) this.dialog.close();
    } });
    const validate = () => {
      const problem = !name.value.trim() ? "Enter a name." : !message.value.trim() ? "Enter some text." : "";
      error.textContent = dirty() ? problem : ""; error.hidden = !error.textContent;
      save.disabled = !dirty() || !!problem;
    };
    name.addEventListener("input", validate); message.addEventListener("input", validate); validate();
    const tokens = element("div", { className: "kl-setting-tool-buttons", ariaLabel: "Insert variable" });
    for (const token of ["{name}", "{member}", "{me}"]) tokens.append(element("button", { type: "button", className: "kl-text-button", text: token, onClick: () => {
      const start = message.selectionStart, end = message.selectionEnd;
      if (message.value.length - end + start + token.length <= message.maxLength) {
        message.setRangeText(token, start, end, "end"); validate();
      }
      message.focus();
    } }));
    edit.append(element("label", {}, "Name", name), element("label", {}, "Message", message), tokens, error);
    footer.append(element("button", { className: "kl-text-button", type: "button", text: "Cancel", onClick: close }), save);
    this.dialog.replaceChildren(element("header", { className: "kl-dialog-header" }, element("h2", { className: "kl-dialog-title", text: title }),
      element("button", { type: "button", className: "kl-icon-button", ariaLabel: "Close editor", onClick: close }, kikiIcon("close"))), edit, confirm, footer);
    this.dialog.oncancel = event => { event.preventDefault(); if (confirm.hidden) close(); else keep.click(); };
    this.dialog.onclick = event => { if (event.target === this.dialog && confirm.hidden) close(); };
    this.dialog.addEventListener("close", () => { if (!this.dialog.open) { this.dialog.replaceChildren(); if (this.active()) this.#focus(index ?? actions.length); } }, { once: true });
    this.dialog.showModal(); fitPanelDialog(this.dialog); name.focus();
  }
}
