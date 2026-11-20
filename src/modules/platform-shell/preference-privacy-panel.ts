import {reviewOwnerSettings, writeOwnerSettings, OwnerSettingsGenerationError, type OwnerSettingsSource} from '../../cloud/owner-settings-generation';
import type { CloudClient } from "../../cloud/client";
import { PREFERENCE_MODE_LABELS, PREFERENCE_MODE_HELP, type PreferenceMode } from "../../cloud/preference-model";
import { element } from "../../cloud/dom";
import { ContentDialog } from "../link-chat/content-dialog";
import type { AccountActivity } from "./account-activity";

type Client = Pick<CloudClient, "memberNumber" | "origin" | "connected" | "request" | "subscribe">;
interface Audience { mode: PreferenceMode; revision: number; }
// Read only the canonical audience and revision. Never retain ratings in Settings.
function checked(value: unknown): Audience {
  const data = value as Audience;
  if (!data || typeof data.mode !== "string" || !Object.hasOwn(PREFERENCE_MODE_LABELS, data.mode) || !Number.isSafeInteger(data.revision) || data.revision < 0)
    throw new Error("Invalid preference audience");
  return { mode: data.mode, revision: data.revision };
}

/** Audience changes are acknowledged directly, outside the saved ratings queue. */
export class PreferencePrivacyPanel {
  readonly element = element("section", { className: "kl-account-section" });
  readonly audienceBadge = element("span", { className: "kl-account-badge", text: "Not checked" });
  readonly audienceEditor = this.#button("Not checked", () => {
    if (!this.audienceEditor.isConnected || !this.#active() || this.#busy || !this.#value) return;
    this.audienceEditor.after(this.#dialog.element);
    this.#edit();
  });
  readonly #dialog = new ContentDialog();
  readonly #unsubscribe: () => void;
  readonly #origin: string;
  #source: OwnerSettingsSource | undefined;
  #visible = false;
  #enabled = false;
  #generation = 0;
  #busy = false;
  #value: Audience | undefined;
  #message = "";
  constructor(readonly client: Client, readonly activity: AccountActivity, readonly editRatings: () => void) {
    this.#origin = client.origin;
    this.audienceEditor.disabled = true;
    this.audienceEditor.setAttribute("aria-haspopup", "dialog");
    this.audienceEditor.setAttribute("aria-label", "Edit preferences and compatibility audience");
    this.#dialog.element.addEventListener("close", () => {
      if (this.#visible && !this.#dialog.element.open && !this.element.contains(this.#dialog.element)) this.element.append(this.#dialog.element);
    });
    this.#unsubscribe = client.subscribe(kind => {
      if (["session", "connection"].includes(kind)) this.hide();
      else if (["preferences", "ready"].includes(kind) && this.#active() && !this.#busy && !this.#dialog.element.open) void this.refresh();
    });
  }
  #active(): boolean { return this.#visible && this.#enabled && this.client.connected && this.client.memberNumber === this.activity.owner && this.client.origin === this.#origin; }
  #button(text: string, action: () => void): HTMLButtonElement {
    const button = element("button", { type: "button", className: "kl-text-button", text });
    button.addEventListener("click", action); return button;
  }
  #note(text: string): HTMLElement { return element("p", { className: "kl-setting-help", text }); }
  show(enabled: boolean): void {
    if (this.#visible && this.#enabled === enabled) return;
    this.hide(); this.#visible = true; this.#enabled = enabled; this.#message = "";
    if (enabled) void this.refresh(); else this.#render();
  }
  hide(): void {
    this.#visible = false; this.#generation++; this.#busy = false; this.#value = undefined; this.#source = undefined; this.#message = "";
    this.audienceEditor.disabled = true;
    this.audienceEditor.textContent = this.audienceBadge.textContent = "Not checked";
    this.#dialog.close(); this.element.replaceChildren();
  }
  destroy(): void { this.hide(); this.#unsubscribe(); this.#dialog.destroy(); }
  #render(): void {
    this.audienceEditor.disabled = this.#busy || !this.#active() || !this.#value;
    this.audienceEditor.textContent = this.audienceBadge.textContent = this.#value ? PREFERENCE_MODE_LABELS[this.#value.mode] : this.#busy ? "Loading…" : this.#enabled ? "Not checked" : "Unavailable";
    this.element.replaceChildren(element("h3", { text: "Preferences" }));
    if (!this.#enabled) { this.element.append(this.#note("Preferences are not available on this Cloud server.")); return; }
    this.element.append(this.#note("Choose who can see your Cloud preference ratings and compare compatibility. Preferences never grant consent."));
    if (this.#value) {
      this.element.append(element("div", { className: "kl-account-row" }, element("strong", { text: "Preference audience" }),
        element("span", { text: PREFERENCE_MODE_LABELS[this.#value.mode] })), this.#note(PREFERENCE_MODE_HELP[this.#value.mode]));
      const edit = this.#button("Edit preference privacy", () => this.#edit()); edit.disabled = this.#busy; this.element.append(edit);
    }
    if (this.#message) this.element.append(element("p", { className: "kl-setting-help", role: "status", text: this.#message }));
    const reload = this.#button("Reload preference privacy", () => { this.#dialog.close(); void this.refresh(); }); reload.disabled = this.#busy;
    const ratings = this.#button("Manage preferences", () => { if (this.#active() && !this.#busy) this.editRatings(); }); ratings.disabled = this.#busy;
    this.element.append(element("div", { className: "kl-setting-tool-buttons" }, reload, ratings), this.#dialog.element);
  }
  async refresh(): Promise<void> {
    if (!this.#active() || this.#busy) return;
    const generation = ++this.#generation;
    this.#busy = true; this.#value = undefined; this.#message = "Loading preference privacy…"; this.#render();
    try {
      const review = await reviewOwnerSettings<unknown>(this.client, "/v1/preferences/me", () => this.#active() && generation === this.#generation);
      const value = checked(review.value);
      if (!this.#active() || generation !== this.#generation) return;
      this.#value = value; this.#source = review.source; this.#message = "";
    } catch {
      if (!this.#active() || generation !== this.#generation) return;
      this.#message = "Preference privacy could not load. Nothing was changed.";
    } finally {
      if (this.#active() && generation === this.#generation) { this.#busy = false; this.#render(); }
    }
  }
  #edit(): void {
    if (!this.#active() || this.#busy || !this.#value) return;
    const baseline = { ...this.#value }, source = this.#source, generation = this.#generation;
    const select = element("select", { className: "kl-select", ariaLabel: "Preference audience" });
    for (const [value, text] of Object.entries(PREFERENCE_MODE_LABELS)) select.append(element("option", { value, text }));
    select.value = baseline.mode;
    const help = this.#note(PREFERENCE_MODE_HELP[baseline.mode]); help.id = `kl-preference-audience-${crypto.randomUUID()}`;
    select.setAttribute("aria-describedby", help.id);
    const status = element("p", { className: "kl-setting-help", role: "status" });
    let failed = false;
    const dirty = () => select.value !== baseline.mode && Object.hasOwn(PREFERENCE_MODE_LABELS, select.value);
    const save = this.#button("Save preference privacy", () => void submit()); save.disabled = true;
    select.addEventListener("change", () => {
      help.textContent = PREFERENCE_MODE_HELP[select.value as PreferenceMode] ?? "";
      save.disabled = failed || this.#busy || !dirty();
    });
    const reload = this.#button("Reload current audience", () => { this.#dialog.close(); void this.refresh(); }); reload.hidden = true;
    const cancel = this.#button("Cancel", () => this.#dialog.close());
    const current = () => this.#active() && generation === this.#generation && this.element.isConnected && this.#dialog.element.open && this.#dialog.element.contains(save);
    const submit = async () => {
      if (!current() || this.#busy || failed || !dirty()) return;
      const mode = select.value as PreferenceMode;
      this.#busy = true; save.disabled = true; select.disabled = true; cancel.disabled = true; status.textContent = "Saving preference privacy…";
      try {
        const value = checked(await writeOwnerSettings<unknown>(this.client, "PATCH", "/v1/preferences/me", { mode, updates: {}, revision: baseline.revision }, source, "preferences-patch", current, false));
        if (!current()) return;
        if (value.mode !== mode || value.revision !== baseline.revision + 1) throw new Error("Unconfirmed audience");
        this.#value = value; this.#message = "Preference privacy saved. Your ratings were kept.";
        this.activity.record("preference_privacy_saved"); this.#dialog.close();
      } catch (error) {
        if (!current()) return;
        failed = true; this.#value = undefined; reload.hidden = false;
        status.textContent = error instanceof OwnerSettingsGenerationError ? error.message : (error as { status?: number })?.status === 409
          ? "Preferences changed on another device or in another editor. Reload the current audience and choose again."
          : "Save was not confirmed. Reload the current audience to check what Cloud saved. No automatic retry will be sent.";
        this.#message = status.textContent;
      } finally {
        if (this.#active() && generation === this.#generation) { this.#busy = false; cancel.disabled = false; if (!failed) this.#render(); }
      }
    };
    this.#dialog.show("Edit preference privacy", element("div", {}, element("label", { className: "kl-preference-audience" }, "Preference audience", select), help,
      this.#note("This changes the audience without changing your ratings. Pending edits in another editor or the Cloud queue may need conflict review."),
      status, element("div", { className: "kl-setting-tool-buttons" }, cancel, save, reload)), () => {
      if (failed && this.#visible) queueMicrotask(() => { if (this.#visible) this.#render(); });
    });
  }
}
