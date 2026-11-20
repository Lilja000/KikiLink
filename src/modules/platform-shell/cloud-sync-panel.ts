import { notificationModeLabel, type CommunityNotificationMode } from '../../cloud/community-notifications';
import { CloudError, type CloudClient } from "../../cloud/client";
import { CloudSyncQueue, syncErrorMessage, type SyncEntry, type SyncStatus } from "../../cloud/sync-queue";
import { catalogById, PREFERENCE_LEVEL_LABELS } from "../../cloud/preference-model";
import { bindClockText } from "../../core/time-format";
import { element } from "../../utils/dom";
import { kikiIcon } from "../link-chat/icons";
import { ContentDialog } from "../link-chat/content-dialog";

const labels: Record<string, string> = { notifications: "Community notifications", languages: "Languages", utcOffsetMinutes: "UTC offset (minutes)", displayName: "Display name", bio: "Bio", statusMessage: "Status", avatarFrame: "Avatar frame", avatarDecoration: "Avatar decoration", publicTags: "Public tags", profileStyle: "Profile style", profileOutlineColor: "Outline color", profileGradient: "Profile gradient", visible: "Visible profile", avatarId: "Avatar", bannerId: "Banner", activityVisibility: "Album audience", username: "Username", showLegacyBadge: "Show Legacy badge", mode: "Preference audience", profileState: "Profile", primary: "First color", secondary: "Second color", start: "First color", end: "Second color", angle: "Direction", enabled: "Enabled", preset: "Frame", ratings: "Preferences" };
function valueText(value: any, key: string): string {
  if (key === 'notifications' && (value === 'important' || value === 'all')) return notificationModeLabel(value as CommunityNotificationMode);
  if (value === undefined || value === null) return "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ") || "None";
  if (typeof value === "object") return Object.entries(value).map(([k, v]) => `${labels[k] ?? k}: ${valueText(v, k)}`).join(" · ");
  if (["avatarId", "bannerId"].includes(key)) return `Saved image ${String(value).slice(0, 8)}`;
  return String(value);
}

export interface CloudSyncSurface {
  actions: HTMLElement;
  metrics: HTMLElement;
  queue: HTMLElement;
  paused: boolean;
}

/** Device-local queue controls backed by the existing Cloud sync lifecycle. */
export class CloudSyncPanel {
  readonly element = element("section", { className: "kl-cloud-sync" });
  readonly #body = element("div", { className: "kl-cloud-overview" });
  #layout: ((surface: CloudSyncSurface) => HTMLElement[]) | undefined;
  readonly #dialog = new ContentDialog();
  readonly #unsubscribe: () => void;
  readonly #session: () => void;
  #visible = false;
  #closed = false;
  #generation = 0;
  #busy = false;
  #feedback = "";
  #failed = false;
  #aboutOpen = false;
  #filter: SyncStatus | "All" = "All";
  constructor(readonly queue: CloudSyncQueue, readonly client: Pick<CloudClient, "connected" | "subscribe">) {
    this.element.append(this.#body, this.#dialog.element);
    this.#unsubscribe = queue.subscribe(() => this.#render());
    this.#session = client.subscribe(kind => {
      if (kind !== "session" && kind !== "connection") return;
      this.#generation++; this.#feedback = ""; this.#dialog.close(); this.#render();
    });
  }
  show(layout?: (surface: CloudSyncSurface) => HTMLElement[]): void {
    if (this.#closed) return;
    this.#layout = layout; this.#visible = true; this.#render();
  }
  hide(): void { this.#layout = undefined; this.#visible = false; this.#generation++; this.#dialog.close(); this.#body.replaceChildren(); }
  #active(): boolean { return this.#visible && !this.#closed; }
  #note(text: string): HTMLElement { return element("p", { className: "kl-setting-help", text }); }
  #time(time: number): HTMLElement { const node = element("time"); bindClockText(node, time, "full-seen"); return node; }
  #button(text: string, action: () => void, disabled = false): HTMLButtonElement {
    const generation = this.#generation;
    const button = element("button", { type: "button", className: "kl-text-button", text, onClick: () => {
      if (this.#active() && generation === this.#generation && !this.#busy && !this.queue.snapshot().busy && this.element.isConnected && this.element.contains(button)) action();
    } }); button.disabled = disabled || this.#busy || this.queue.snapshot().busy; return button;
  }
  async #run(action: () => Promise<void>, message: string): Promise<void> {
    if (!this.#active() || this.#busy) return;
    const generation = this.#generation; this.#busy = true; this.#feedback = ""; this.#render();
    try { await action(); if (generation === this.#generation) { this.#feedback = message; this.#failed = false; } }
    catch (e) { if (generation === this.#generation) { this.#feedback = syncErrorMessage(e); this.#failed = true; } }
    finally { this.#busy = false; this.#render(); }
  }
  #render(): void {
    if (!this.#active()) return;
    const state = this.queue.snapshot();
    const pause = this.#button(state.paused ? "Resume sync" : "Pause sync",
      () => void this.#run(() => this.queue.setPaused(!state.paused), state.paused ? "Sync resumed. Choose Sync now to send waiting changes." : "Sync paused. New saves will wait on this device."));
    pause.prepend(kikiIcon(state.paused ? "play" : "pause"));
    const sync = this.#button("Sync now", () => void this.#run(() => this.queue.syncNow(), "Queue checked. Failed items and conflicts remain listed for review."),
      state.paused || !this.client.connected || !state.entries.some(i => ["Pending", "Failed"].includes(i.status)));
    sync.classList.add("kl-text-button--primary"); sync.prepend(kikiIcon("refresh"));
    const actions = element("div", { className: "kl-sync-actions" }, pause, sync);
    const metrics = element("ul", { className: "kl-sync-metrics", ariaLabel: "Sync queue counts" },
      ...(["Pending", "Failed", "Conflict"] as const).map(status => element("li", {},
        element("strong", { text: String(state.entries.filter(item => item.status === status).length) }),
        status === "Conflict" ? " need a decision" : ` ${status.toLowerCase()}`)));
    const filter = element("select", { className: "kl-select", ariaLabel: "Sync status" });
    for (const status of ["All", "Pending", "Failed", "Conflict", "Synced", "Cancelled"] as const) {
      const option = element("option", { text: status === "All" ? "All items" : status });
      option.value = status; filter.append(option);
    }
    filter.value = this.#filter;
    filter.addEventListener("change", () => {
      if (!this.#active() || !this.element.contains(filter)) return;
      this.#filter = filter.value as SyncStatus | "All"; this.#render();
      this.#body.querySelector<HTMLSelectElement>(".kl-cloud-queue select")?.focus();
    });
    const queue = element("section", { className: "kl-account-section kl-cloud-queue" },
      element("h3", { text: "Sync queue" }), element("div", { className: "kl-account-toolbar" }, element("label", {}, "Show", filter)));
    if (this.#feedback) { const message = this.#note(this.#feedback); message.setAttribute("role", this.#failed ? "alert" : "status"); queue.append(message); }
    if (state.error) { const error = this.#note(syncErrorMessage(new CloudError(state.error))); error.setAttribute("role", "alert"); queue.append(error); }
    const list = element("div", { className: "kl-sync-list" });
    for (const item of state.entries.filter(i => this.#filter === "All" || i.status === this.#filter)) list.append(this.#item(item, state.paused));
    if (!list.childElementCount) list.append(this.#note("No sync items in this view."));
    const about = element("details", { className: "kl-sync-help" },
      element("summary", { text: "About sync" }),
      this.#note("Profile, preference and community notification saves from this device. Pending values stay in this browser until saved or cancelled. Retries run only when you choose them."),
      this.#note("Cancelling removes only the queued save; it does not undo a change already saved in Cloud. Uploads, messages and other editors keep their own retry controls. Completed entries keep only status, for up to 30 days (latest 100)."),
      this.#button("Refresh queue", () => void this.#run(() => this.queue.refresh(), "Queue refreshed.")));
    about.open = this.#aboutOpen;
    about.addEventListener("toggle", () => { if (about.isConnected) this.#aboutOpen = about.open; });
    queue.append(list);
    this.#body.replaceChildren(...(this.#layout?.({ actions, metrics, queue, paused: state.paused }) ?? [actions, metrics, queue]), about);
  }
  #item(item: SyncEntry, paused: boolean): HTMLElement {
    const card = element("article", { className: "kl-account-section kl-sync-item", ariaLabel: `${item.kind} · ${item.status}` },
      element("span", { className: "kl-cloud-icon" }, kikiIcon(item.status === "Conflict" ? "warning" : item.status === "Failed" ? "offline" : item.status === "Synced" ? "check" : "refresh")));
    card.dataset.status = item.status;
    const copy = element("div", { className: "kl-sync-item-copy" }, element("strong", { text: `${item.kind} changes` }),
      element("div", { className: "kl-sync-item-meta" }, item.kind, element("span", { className: "kl-account-badge", text: item.status }), this.#time(item.time)));
    card.append(copy);
    if (item.targetName) copy.append(this.#note(item.targetName));
    if (item.reason) copy.append(this.#note(item.reason === "version" ? "Cloud has another version. Choose which values to keep." : item.reason === "rejected" ? "Cloud rejected this save. Retry after fixing access, or cancel it and edit again." : "Save could not be confirmed. Retrying checks Cloud before writing."));
    if (item.retryAt) copy.append(this.#note("Retry after"), this.#time(item.retryAt));
    if (item.choice) copy.append(this.#note(item.choice === "local" ? item.status === "Synced" ? "Kept this device’s values." : "Chose this device’s values; save is awaiting confirmation." : "Kept Cloud values; no overwrite was sent."));
    if (["Pending", "Failed", "Conflict"].includes(item.status)) {
      if (item.acknowledged) {
        card.append(this.#note('Cloud confirmed this request. Finish device cleanup without sending it again.'),
          this.#button('Finish sync cleanup', () => void this.#run(() => this.queue.retry(item.id), 'Confirmed request cleared from this device.')));
        return card;
      }
      const cancel = this.#button("Cancel item…", () => {
        const body = element("div", {}, this.#note(`Remove these ${item.kind.toLowerCase()} changes from this device’s queue? This does not undo a server write whose response was lost. Unsaved values in an open editor stay there.`),
          element("div", { className: "kl-setting-tool-buttons" }, this.#button("Keep item", () => this.#dialog.close()),
            this.#button("Cancel queued save", () => { this.#dialog.close(); void this.#run(() => this.queue.cancel(item.id), "Queued save cancelled."); })));
        this.#dialog.show("Cancel queued save?", body);
      });
      card.append(element("div", { className: "kl-setting-tool-buttons" }, item.status === "Conflict"
        ? this.#button("Review conflict", () => void this.#review(item), paused || !this.client.connected)
        : this.#button(item.status === "Failed" ? "Retry save" : "Sync item", () => void this.#run(() => this.queue.retry(item.id), "Cloud confirmed the queued save."), paused || !this.client.connected),
      cancel));
    } else card.append(this.#note("No action needed"));
    return card;
  }
  async #review(item: SyncEntry): Promise<void> {
    const generation = this.#generation;
    await this.#run(async () => {
      const review = await this.queue.review(item.id);
      if (!this.#active() || generation !== this.#generation) return;
      const values = this.queue.comparison(review), body = element("div", {},
        this.#note(item.kind === "Communities" ? `Review the notification default for ${item.targetName || "this community"}. Individual channel choices remain unchanged.` : item.kind === "Profile" ? "Review the whole profile save. Choosing this device can replace the Cloud fields shown below." : "Review the queued preference changes. Unlisted preferences are preserved for partial saves."));
      const table = element("table", { className: "kl-sync-comparison" }, element("thead", {}, element("tr", {}, ...["Field", "This device", "Cloud"].map(text => element("th", { text }))))), rows = element("tbody");
      const add = (key: string, local: unknown, remote: unknown, label = labels[key] ?? key): void => {
        rows.append(element("tr", {}, element("th", { text: label }), element("td", { text: valueText(local, key) }), element("td", { text: valueText(remote, key) })));
      };
      for (const key of new Set([...Object.keys(values.local), ...Object.keys(values.remote)])) {
        if (key !== "ratings") add(key, values.local[key], values.remote[key]);
        else for (const id of new Set([...Object.keys(values.local.ratings), ...Object.keys(values.remote.ratings)])) {
          const level = (v: string) => PREFERENCE_LEVEL_LABELS[v as keyof typeof PREFERENCE_LEVEL_LABELS] ?? v;
          add(id, level(values.local.ratings[id]), level(values.remote.ratings[id]), catalogById.get(id)?.label ?? id);
        }
      }
      table.append(rows); body.append(table);
      const options = element("fieldset", {}, element("legend", { text: "Choose values to keep" }));
      let choice: "local" | "remote" | undefined;
      // Buttons are built after #run completes so the dialog can be used immediately.
      const apply = element("button", { type: "button", className: "kl-text-button kl-text-button--primary", text: "Apply choice" }); apply.disabled = true;
      for (const [value, text] of [["local", "Keep this device’s values"], ["remote", "Keep Cloud values"]] as const) {
        const radio = element("input"); radio.type = "radio"; radio.name = "kl-sync-choice"; radio.value = value;
        radio.addEventListener("change", () => { if (generation === this.#generation && this.#active()) { choice = value; apply.disabled = false; } });
        options.append(element("label", { className: "kl-account-row" }, radio, text));
      }
      apply.addEventListener("click", () => {
        if (!choice || !this.#active() || generation !== this.#generation || this.#busy || this.queue.snapshot().busy || !this.element.isConnected || !this.#dialog.element.open || !this.#dialog.element.contains(apply)) return;
        this.#dialog.close(); void this.#run(() => this.queue.resolve(review, choice!), "Conflict resolved. Reopen an existing editor to load the chosen values.");
      });
      body.append(options, apply); this.#dialog.show("Resolve sync conflict", body);
    }, "Compare both versions before choosing.");
  }
  destroy(): void { this.hide(); this.#closed = true; this.#unsubscribe(); this.#session(); this.#dialog.destroy(); }
}

