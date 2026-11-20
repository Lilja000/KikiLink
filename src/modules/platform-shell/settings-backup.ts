import type { SettingsStore } from "../../core/settings";
import { SETTINGS_SOURCE_LIMIT } from "../../core/settings-persistence";
import { element } from "../../utils/dom";
import { fitPanelDialog } from "./panel-dialog-layout";
import { ContentDialog } from "../link-chat/content-dialog";

/** Uses the same checked settings-only import and recovery copies as device ZIP restore. */
export class SettingsBackupActions {
  readonly element = element("div", { className: "kl-settings-backup-actions" });
  readonly #file = element("input", { ariaLabel: "Choose settings backup" });
  readonly #status = element("p", { className: "kl-setting-help" });
  readonly #dialog = new ContentDialog();
  #generation = 0;
  #pickerGeneration: number | undefined;

  constructor(readonly store: SettingsStore, readonly owner: number, readonly current: () => boolean) {
    this.#dialog.element.classList.replace("kl-content-dialog", "kl-settings-backup-dialog");
    this.#file.type = "file";
    this.#file.accept = ".json,application/json";
    this.#file.hidden = true;
    this.#file.addEventListener("change", () => {
      const file = this.#file.files?.[0];
      this.#file.value = "";
      const currentPicker = this.#pickerGeneration === this.#generation;
      this.#pickerGeneration = undefined;
      if (file && currentPicker && this.current()) void this.#review(file);
    });
    const choose = element("button", { type: "button", className: "kl-text-button", text: "Import",
      ariaLabel: "Import settings backup", onClick: () => {
        if (!this.current()) return;
        this.#pickerGeneration = ++this.#generation;
        this.#file.click();
      } });
    this.#status.hidden = true;
    this.element.append(element("button", { type: "button", className: "kl-text-button", text: "Export",
      ariaLabel: "Export settings backup", onClick: () => this.#download() }), choose, this.#file, this.#status, this.#dialog.element);
  }

  #feedback(message: string, error = false): void {
    this.#status.textContent = message;
    this.#status.hidden = !message;
    this.#status.setAttribute("role", error ? "alert" : "status");
  }

  #download(): void {
    if (!this.current()) return;
    try {
      const contents = this.store.persistence.checkedSource() ?? JSON.stringify(this.store.get());
      const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
      const link = element("a");
      link.href = url;
      link.download = `KikiLink-settings-${this.owner}-${new Date().toISOString().slice(0, 10)}.json`;
      link.hidden = true;
      this.element.append(link);
      try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
      this.#feedback("Settings download requested.");
    } catch (error) {
      this.#feedback(error instanceof Error ? error.message : "Settings could not be downloaded.", true);
    }
  }

  async #review(file: File): Promise<void> {
    const generation = ++this.#generation;
    const active = () => generation === this.#generation && this.current();
    try {
      if (file.size > SETTINGS_SOURCE_LIMIT) throw new Error("Choose a settings JSON file up to 2 MiB.");
      const source = await file.text();
      if (!active()) return;
      const review = this.store.reviewImportedSettings(source);
      this.#feedback("");
      const error = element("p", { className: "kl-setting-help" });
      error.setAttribute("role", "alert");
      const cancel = element("button", { type: "button", className: "kl-text-button", text: "Cancel", onClick: () => this.close() });
      const confirm = element("button", { type: "button", className: "kl-text-button kl-text-button--primary", text: "Import settings", onClick: () => {
        if (!active() || !this.#dialog.element.open || confirm.disabled) return;
        try {
          this.store.restoreImportedSettings(review);
          this.close();
          this.#feedback("Settings imported. The original copies are available in Settings recovery.");
        } catch (cause) {
          error.textContent = cause instanceof Error ? cause.message : "Settings could not be imported. Choose the file again.";
          confirm.disabled = true;
        }
      } });
      confirm.disabled = !review.changedSections.length && !review.archivedDataChanged;
      const body = element("div", { className: "kl-settings-restore-confirm" },
        element("div", { className: "kl-settings-restore-copy" },
          element("p", { text: review.changedSections.length ? `Settings to import: ${review.changedSections.join(", ")}.` : "No supported settings will change." }),
          ...(review.archivedDataChanged ? [element("p", { text: "Additional original settings will be kept as inactive recovery data." })] : []),
          element("p", { text: "Your history limits, playlists and sound choices are kept. Automatic rules and AFK auto-reply will be off." }),
          error), element("footer", { className: "kl-dialog-actions" }, cancel, confirm));
      let releaseFit: (() => void) | undefined;
      this.#dialog.show("Import settings?", body, () => { releaseFit?.(); this.store.cancelImportedSettingsReview(review); });
      releaseFit = fitPanelDialog(this.#dialog.element);
      cancel.focus({ preventScroll: true });
    } catch (error) {
      if (active()) this.#feedback(error instanceof Error ? error.message : "Choose a valid KikiLink settings backup.", true);
    }
  }

  close(): void {
    this.#generation++;
    this.#pickerGeneration = undefined;
    this.#file.value = "";
    if (this.#dialog.element.open) this.#dialog.close();
    this.#feedback("");
  }

  destroy(): void { this.close(); this.#dialog.destroy(); }
}
