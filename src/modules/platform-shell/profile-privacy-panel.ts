import {reviewOwnerSettings, writeOwnerSettings, OwnerSettingsGenerationError, type OwnerSettingsSource} from '../../cloud/owner-settings-generation';
import type { CloudClient } from "../../cloud/client";
import { element } from "../../utils/dom";
import { ContentDialog } from "../link-chat/content-dialog";
import type { AccountActivity } from "./account-activity";
import { fitPanelDialog } from "./panel-dialog-layout";

type Client = Pick<CloudClient, "memberNumber" | "origin" | "connected" | "request" | "subscribe">;
interface InlinePrivacyOptions { current(): boolean; changed(): void; preferenceVisibility?: HTMLElement; }
interface SettingsPrivacyOptions {
  preferenceAudience: HTMLElement;
  preferenceEditor: HTMLButtonElement;
  moreActions: HTMLElement;
}
interface Privacy { memberNumber: number; showOnline: boolean; about: "everyone" | "friends" | "private"; communities?: "everyone" | "friends" | "private"; discoverable?: boolean; showLocation?: boolean; activity?: "everyone" | "friends" | "private"; revision: number; }
const audiences = { everyone: "Everyone", friends: "Friends", private: "Only me" } as const;
function checked(value: Privacy, owner: number, communities: boolean, discovery: boolean, location: boolean, activity: boolean): Privacy {
  if (!value || value.memberNumber !== owner || typeof value.showOnline !== "boolean" ||
    !Object.hasOwn(audiences, value.about) || (communities && !Object.hasOwn(audiences, value.communities ?? "")) || (discovery && typeof value.discoverable !== "boolean") || (location && typeof value.showLocation !== "boolean") || (activity && !Object.hasOwn(audiences, value.activity ?? "")) || !Number.isSafeInteger(value.revision) || value.revision < 0) throw new Error("Invalid privacy");
  return value;
}

/** Restrictive privacy edits need a fresh server acknowledgement, never a silent retry. */
export class ProfilePrivacyPanel {
  readonly element = element("section", { className: "kl-account-section" });
  readonly #editButton = this.#button("Edit privacy", () => {
    if (this.element.isConnected && !this.#parentBusy) this.#edit();
  });
  #parentBusy = false;
  readonly #dialog = new ContentDialog();
  readonly #unsubscribe: () => void;
  readonly #origin: string;
  #source: OwnerSettingsSource | undefined;
  #visible = false;
  #enabled = false;
  #communities = false;
  #discovery = false;
  #location = false;
  #recentActivity = false;
  #generation = 0;
  #busy = false;
  #value: Privacy | undefined;
  #message = "";
  #inlineDraft: { dirty(): boolean; submit(): Promise<boolean> } | undefined;
  constructor(readonly client: Client, readonly activity: AccountActivity, readonly inline?: InlinePrivacyOptions, readonly settings?: SettingsPrivacyOptions) {
    this.#origin = client.origin;
    this.#editButton.classList.add("kl-text-button--primary");
    this.#editButton.disabled = true;
    if (inline) {
      this.element.className = "kl-profile-privacy-inline";
      this.element.setAttribute("aria-label", "Cloud profile privacy");
      if (inline.preferenceVisibility) this.element.append(inline.preferenceVisibility);
    } else {
      this.element.classList.add("kl-settings-privacy-summary");
      this.#dialog.element.classList.add("kl-settings-privacy-dialog");
      this.#dialog.element.addEventListener("keydown", event => {
        if (event.key === "Escape") event.stopPropagation();
      });
    }
    this.#unsubscribe = client.subscribe(kind => {
      if (["session", "connection"].includes(kind)) {
        if (this.inline) {
          // Review a new baseline after an auth change. Never replay a draft
          // across a lost session. A routine token refresh keeps the same owner.
          if (this.#active()) return;
          if (this.#visible) {
            const hadDraft = this.dirty;
            this.hide();
            if (hadDraft && this.inline.current()) this.element.append(this.#status("Cloud connection changed. Reopen Privacy to review your choices before saving."));
          }
          return;
        }
        this.hide();
      } else if (kind === "privacy" && this.#visible && !this.#busy && !this.dirty && !this.#dialog.element.open) void this.refresh();
    });
  }
  headerButton(parentBusy: boolean): HTMLButtonElement {
    this.#parentBusy = parentBusy;
    this.#editButton.disabled = parentBusy || this.#busy || !this.#active() || !this.#value;
    return this.#editButton;
  }
  get dirty(): boolean { return this.#inlineDraft?.dirty() ?? false; }
  get saving(): boolean { return this.#busy && this.#inlineDraft !== undefined; }
  async saveDraft(): Promise<boolean> { return this.#inlineDraft?.dirty() ? this.#inlineDraft.submit() : true; }
  #active(): boolean { return this.#visible && this.#enabled && this.client.connected && this.client.memberNumber === this.activity.owner && this.client.origin === this.#origin && (this.inline?.current() ?? true); }
  #button(label: string, action: () => void): HTMLButtonElement {
    return element("button", { type: "button", className: "kl-text-button", text: label, onClick: action });
  }
  #note(text: string): HTMLElement { return element("p", { className: "kl-setting-help", text }); }
  #status(text: string): HTMLElement { const note = this.#note(text); note.setAttribute("role", "status"); return note; }
  show(enabled: boolean, communities = false, discovery = false, location = false, activity = false): void {
    if (this.#visible && this.#enabled === enabled && this.#communities === communities && this.#discovery === discovery && this.#location === location && this.#recentActivity === activity) return;
    this.hide(); this.#visible = true; this.#enabled = enabled; this.#communities = communities; this.#discovery = discovery; this.#location = location; this.#recentActivity = activity;
    if (enabled && this.#active()) void this.refresh(); else this.#render();
  }
  hide(): void {
    this.#editButton.disabled = true;
    this.#visible = false; this.#generation++; this.#busy = false; this.#value = undefined; this.#source = undefined; this.#inlineDraft = undefined; this.#message = "";
    this.#dialog.close();
    this.settings?.moreActions.replaceChildren();
    this.element.replaceChildren();
    if (this.inline?.preferenceVisibility) this.element.append(this.inline.preferenceVisibility);
    this.inline?.changed();
  }
  destroy(): void { this.hide(); this.#unsubscribe(); this.#dialog.destroy(); }
  #render(): void {
    this.headerButton(this.#parentBusy);
    this.#inlineDraft = undefined;
    if (this.inline) {
      this.element.replaceChildren();
      if (!this.client.connected) this.element.append(this.#note("Reconnect to KikiLink Cloud to review privacy."));
      else if (!this.#enabled) this.element.append(this.#note("More privacy controls require a Cloud update."));
      else if (this.#value) this.#edit();
      if (this.inline.preferenceVisibility && !this.element.contains(this.inline.preferenceVisibility))
        this.element.append(this.inline.preferenceVisibility);
      if (this.#message) this.element.append(this.#status(this.#message));
      if (this.#active() && !this.#value && !this.#busy) this.element.append(this.#button("Reload privacy", () => void this.refresh()));
      this.inline.changed();
      return;
    }
    this.element.replaceChildren();
    this.settings?.moreActions.replaceChildren();
    if (!this.#enabled) {
      this.element.append(this.#note("This Cloud server does not yet support About me audiences and online status privacy.")); return;
    }
    const actions = element("div", { className: "kl-setting-tool-buttons" });
    if (this.#value) {
      const value = this.#value;
      const row = (label: string, hint: string, badge: string | HTMLElement) => element("div", { className: "kl-account-row" },
        element("div", {}, element("strong", { text: label }), this.#note(hint)),
        typeof badge === "string" ? element("span", { className: "kl-account-badge", text: badge }) : badge);
      const heading = (label: string, editLabel: string, onEdit: () => void) => element("header", { className: "kl-privacy-card-heading" },
        element("h3", { text: label }), this.#button(editLabel, onEdit));
      this.element.append(element("div", { className: "kl-account-grid" },
        element("section", { className: "kl-account-section" },
          heading("Your visibility", "Edit visibility", () => this.#edit()),
          this.#discovery ? row("Profile discovery", "Let people find your profile in People search. Direct links still work.", value.discoverable ? "Shared" : "Hidden") : null,
          row("Online status", "Share your online status. Invisible status remains hidden.", value.showOnline ? "Shared" : "Hidden"),
          this.#location ? row("Current room", "Show your current public room on your profile while you are online.", value.showLocation ? "Shared" : "Hidden") : null),
        element("section", { className: "kl-account-section" },
          heading("Who can see your profile details", "Edit audiences", () => this.#edit()),
          row("About me", "Your biography, tags and shared profile information.", audiences[value.about]),
          this.settings ? row("Preferences & compatibility", "Who can view your preference ratings and compare compatibility.", this.settings.preferenceAudience) : null,
          this.#communities && value.communities ? row("Community membership", "Who can see the communities listed on your profile.", audiences[value.communities]) : null,
          this.#recentActivity && value.activity ? row("Profile activity", "Who can see the recent activity shown on your profile.", audiences[value.activity]) : null)));
      actions.append(this.#button("Edit Cloud privacy", () => this.#edit()));
    }
    if (this.#message) this.element.append(this.#status(this.#message));
    const reload = this.#button("Reload privacy", () => { this.#dialog.close(); void this.refresh(); });
    reload.disabled = this.#busy;
    actions.prepend(reload);
    (this.settings && this.#value ? this.settings.moreActions : this.element).append(actions);
    this.element.append(this.#dialog.element);
  }
  async refresh(): Promise<void> {
    if (!this.#active() || this.#busy) return;
    const generation = ++this.#generation;
    this.#busy = true; this.#value = undefined; this.#message = "Loading privacy…"; this.#render();
    try {
      const review = await reviewOwnerSettings<Privacy>(this.client, "/v1/privacy/me", () => this.#active() && generation === this.#generation);
      const value = checked(review.value, this.activity.owner, this.#communities, this.#discovery, this.#location, this.#recentActivity);
      if (!this.#active() || generation !== this.#generation) return;
      this.#value = value; this.#source = review.source; this.#message = "";
    } catch {
      if (!this.#active() || generation !== this.#generation) return;
      this.#message = "Privacy could not load. Nothing was changed.";
    } finally {
      if (this.#active() && generation === this.#generation) { this.#busy = false; this.#render(); }
    }
  }
  #edit(): void {
    if (!this.#active() || this.#busy || !this.#value) return;
    const baseline = { ...this.#value }, source = this.#source, generation = this.#generation;
    const online = element("input", { ariaLabel: "Share online status in Cloud" }); online.type = "checkbox"; online.checked = baseline.showOnline;
    const about = element("select", { className: "kl-select", ariaLabel: "About me audience" });
    for (const [value, label] of Object.entries(audiences)) { const option = element("option", { text: label }); option.value = value; about.append(option); }
    about.value = baseline.about;
    const communities = element("select", { className: "kl-select", ariaLabel: "Profile communities audience" });
    for (const [value, label] of Object.entries(audiences)) { const option = element("option", { text: label }); option.value = value; communities.append(option); }
    communities.value = baseline.communities ?? "private";
    const discoverable = element("input", { ariaLabel: "Appear in People search" }); discoverable.type = "checkbox"; discoverable.checked = baseline.discoverable === true;
    const location = element("input", { ariaLabel: "Show current room" }); location.type = "checkbox"; location.checked = baseline.showLocation === true;
    const recentActivity = element("select", { className: "kl-select", ariaLabel: "Profile activity audience" });
    for (const [value, label] of Object.entries(audiences)) { const option = element("option", { text: label }); option.value = value; recentActivity.append(option); }
    recentActivity.value = baseline.activity ?? "private";
    const status = this.#status("");
    let failed = false;
    const dirty = () => online.checked !== baseline.showOnline || about.value !== baseline.about || this.#communities && communities.value !== baseline.communities || this.#discovery && discoverable.checked !== baseline.discoverable || this.#location && location.checked !== baseline.showLocation || this.#recentActivity && recentActivity.value !== baseline.activity;
    const save = this.#button(this.settings ? "Save privacy" : "Save Cloud privacy", () => void submit()); save.disabled = true;
    const update = () => { save.disabled = failed || this.#busy || !dirty(); this.inline?.changed(); };
    online.addEventListener("change", update); about.addEventListener("change", update); communities.addEventListener("change", update); discoverable.addEventListener("change", update); location.addEventListener("change", update); recentActivity.addEventListener("change", update);
    const reload = this.#button("Reload current choices", () => { this.#dialog.close(); void this.refresh(); }); reload.hidden = true;
    const cancel = this.#button("Cancel", () => this.#dialog.close());
    const reviewed = () => this.#active() && generation === this.#generation;
    const current = () => reviewed() && this.element.isConnected && (this.inline ? this.element.contains(status) : this.#dialog.element.open && this.#dialog.element.contains(save));
    const submit = async (): Promise<boolean> => {
      if (!current() || this.#busy || failed || !dirty()) return false;
      this.#busy = true; save.disabled = true; online.disabled = true; about.disabled = true; communities.disabled = true; discoverable.disabled = true; location.disabled = true; recentActivity.disabled = true; cancel.disabled = true;
      status.textContent = "Saving privacy…";
      this.inline?.changed();
      const patch = { revision: baseline.revision,
        ...(online.checked !== baseline.showOnline ? { showOnline: online.checked } : {}),
        ...(about.value !== baseline.about ? { about: about.value as Privacy["about"] } : {}),
        ...(this.#communities && communities.value !== baseline.communities ? { communities: communities.value as Privacy["communities"] } : {}),
        ...(this.#discovery && discoverable.checked !== baseline.discoverable ? { discoverable: discoverable.checked } : {}),
        ...(this.#location && location.checked !== baseline.showLocation ? { showLocation: location.checked } : {}),
        ...(this.#recentActivity && recentActivity.value !== baseline.activity ? { activity: recentActivity.value as Privacy["activity"] } : {}) };
      try {
        // CloudClient invalidates the profile cache before returning the ACK;
        // AccountSettings can detach this panel while rebuilding that summary.
        const value = checked(await writeOwnerSettings<Privacy>(this.client, "PATCH", "/v1/privacy/me", patch, source, "privacy-patch", current, true, reviewed), this.activity.owner, this.#communities, this.#discovery, this.#location, this.#recentActivity);
        if (!reviewed()) return false;
        if (value.revision !== baseline.revision + 1 || (patch.showOnline !== undefined && value.showOnline !== patch.showOnline) ||
          (patch.about !== undefined && value.about !== patch.about) || (patch.communities !== undefined && value.communities !== patch.communities) || (patch.discoverable !== undefined && value.discoverable !== patch.discoverable) || (patch.showLocation !== undefined && value.showLocation !== patch.showLocation) || (patch.activity !== undefined && value.activity !== patch.activity)) throw new Error("Unconfirmed privacy");
        this.#value = value; this.#message = "Cloud privacy saved."; this.activity.record("profile_privacy_saved"); this.#dialog.close();
        return true;
      } catch (error) {
        if (!reviewed()) return false;
        failed = true; this.#value = undefined; reload.hidden = false;
        status.textContent = error instanceof OwnerSettingsGenerationError ? error.message : (error as { status?: number })?.status === 409
          ? "Privacy changed on another device. Reload current choices and review them before saving again."
          : "Save was not confirmed. Reload current choices to check whether Cloud saved them. No automatic retry will be sent.";
        this.#message = status.textContent;
        return false;
      } finally {
        if (this.#active() && generation === this.#generation) {
          this.#busy = false; cancel.disabled = false;
          if (!failed || !this.inline && !this.#dialog.element.open) this.#render();
          else this.inline?.changed();
        }
      }
    };
    if (this.inline) {
      const field = (title: string, select: HTMLSelectElement, help: string) => {
        select.setAttribute("aria-label", title);
        return element("label", { className: "kl-profile-privacy-audience" }, title, select, element("small", { text: help }));
      };
      const toggle = (title: string, input: HTMLInputElement, help: string) => {
        input.setAttribute("aria-label", title);
        return element("label", { className: "kl-profile-privacy-toggle" }, input,
          element("span", {}, element("strong", { text: title }), element("small", { text: help })));
      };
      this.#inlineDraft = { dirty, submit };
      this.element.append(element("div", { className: "kl-profile-privacy-audiences" },
        field("About & personal details", about, "Applies to your bio, tags, custom status and mutual friends. Name and avatar have separate visibility."),
        this.inline.preferenceVisibility,
        ...(this.#communities ? [field("Communities", communities, "Private and unlisted communities still require shared membership.")] : []),
        ...(this.#recentActivity ? [field("Activity, events, creations & albums", recentActivity, "Each item keeps its own access rules, including individual albums.")] : [])),
        element("div", { className: "kl-profile-privacy-visibility" },
          toggle("Show online status", online, "Let people see your KikiLink Cloud presence. Invisible status stays hidden."),
          ...(this.#location ? [toggle("Show current room", location, "Share your public room while online. Native BC visibility is separate.")] : []),
          ...(this.#discovery ? [toggle("Appear in People search", discoverable, "Let people discover this profile. Direct profile links still work.")] : [])),
        status, reload);
      return;
    }
    const toggle = (label: string, input: HTMLInputElement, help: string) =>
      element("label", { className: "kl-profile-privacy-toggle" }, input,
        element("span", {}, element("strong", { text: label }), element("small", { text: help })));
    const audience = (label: string, select: HTMLSelectElement, help: string) =>
      element("label", { className: "kl-profile-privacy-audience" }, label, select, element("small", { text: help }));
    save.classList.add("kl-text-button--primary");
    this.#dialog.show("Edit profile privacy", element("div", { className: "kl-settings-privacy-editor" },
      element("div", { className: "kl-settings-privacy-fields" },
        element("fieldset", {}, element("legend", { text: "Visibility" }),
          this.#discovery ? toggle("Profile discovery", discoverable, "Let people find your profile in People search. Direct profile links still work when discovery is off.") : null,
          toggle("Online status", online, "Share availability and typing signals in KikiLink Cloud. Invisible status stays hidden."),
          this.#location ? toggle("Current room", location, "Show your public room while you are online. Private rooms stay hidden.") : null),
        element("fieldset", {}, element("legend", { text: "Profile audiences" }),
          element("div", { className: "kl-profile-privacy-audiences" },
            audience("About me", about, "Your biography, tags, custom status and mutual friends. Friends means a confirmed Cloud friendship."),
            this.settings ? element("div", { className: "kl-profile-privacy-audience" }, "Preferences & compatibility", this.settings.preferenceEditor,
              element("small", { text: "Edit who can view your ratings and compare compatibility. This audience is saved separately." })) : null,
            this.#communities ? audience("Community membership", communities, "Who can see your memberships. Private and unlisted communities are visible only to shared members.") : null,
            this.#recentActivity ? audience("Profile activity", recentActivity, "Who can see the recent activity on your profile. Posts, events, albums and creations keep their own access rules.") : null)),
        status),
      element("footer", { className: "kl-setting-tool-buttons" }, cancel, save, reload)), () => {
      if (failed && this.#visible) queueMicrotask(() => { if (this.#visible) this.#render(); });
    });
    fitPanelDialog(this.#dialog.element);
  }
}
