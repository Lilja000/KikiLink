import { ShellActionMenu } from './action-menu';
import {SafetyActivity} from './safety-activity';
import {AccountControlIntent, AccountControlGenerationError, AccountControlUnconfirmedError, sameAccountControlSource, captureAccountControl, accountControlPath, accountControlRead, type AccountControlReview} from '../../cloud/account-control-generation';
import { DirectRetentionPanel } from "./direct-retention-panel";
import { ProfilePrivacyPanel } from "./profile-privacy-panel";
import { PreferencePrivacyPanel } from "./preference-privacy-panel";
import type { CloudClient } from "../../cloud/client";
import type { CloudProfile } from "../../cloud/types";
import { bindClockText } from "../../core/time-format";
import { element } from "../../utils/dom";
import { ContentDialog } from "../link-chat/content-dialog";
import { kikiIcon } from "../link-chat/icons";
import { ACCOUNT_ACTIONS, AccountActivity, type AccountActivityEntry, type AccountActivityKind } from "./account-activity";
import { fitPanelDialog } from "./panel-dialog-layout";
import type { CloudSyncQueue } from "../../cloud/sync-queue";
import { CloudSyncPanel, type CloudSyncSurface } from "./cloud-sync-panel";

export type AccountSettingsPage = "cloud" | "sessions" | "privacy" | "audit";
export const ACCOUNT_SETTINGS_PAGES: AccountSettingsPage[] = ["cloud", "sessions", "privacy", "audit"];
type Client = Pick<CloudClient, "origin" | "memberNumber" | "connected" | "connectionState" | "subscribe" | "request" | "connect" | "logout"> & Partial<Pick<CloudClient,"rememberBlock">>;
interface Me { memberNumber: number; expiresAt?: number; apiVersion?: number; features?: Record<string, unknown>; }
interface AccountSession {
  kind: "device" | "session"; id: string; origin: string; createdAt: number;
  lastSignInAt: number; expiresAt: number; activeSessions: number; current: boolean;
}
function sessionList(value: unknown, owner: number): AccountSession[] {
  const data = value as { memberNumber?: number; items?: AccountSession[] };
  if (!data || data.memberNumber !== owner || !Array.isArray(data.items) || data.items.length > 10) throw new Error("Invalid session list");
  const seen = new Set<string>();
  for (const item of data.items) {
    if (!item || !["device", "session"].includes(item.kind) || typeof item.id !== "string" ||
      !(item.kind === "device" ? /^[a-f0-9-]{36}$/ : /^[a-f0-9]{32}$/).test(item.id) ||
      typeof item.origin !== "string" || item.origin.length > 300 || !/^https?:\/\//.test(item.origin) ||
      ![item.createdAt, item.lastSignInAt, item.expiresAt].every(n => Number.isSafeInteger(n) && n > 0) ||
      !Number.isSafeInteger(item.activeSessions) || item.activeSessions < 0 || item.activeSessions > 5 || typeof item.current !== "boolean" ||
      seen.has(`${item.kind}:${item.id}`)) throw new Error("Invalid session list");
    seen.add(`${item.kind}:${item.id}`);
  }
  if (data.items.filter(item => item.current).length !== 1) throw new Error("Invalid current session");
  return data.items;
}

/** Real account data behind the Settings pages; prototype sample queues/devices are never copied. */
export class AccountSettings {
  readonly element = element("div", { className: "kl-account-settings" });
  readonly #body = element("div", { className: "kl-account-body" });
  readonly #dialog = new ContentDialog();
  readonly #unsubscribe: () => void;
  readonly #morePrivacy = element("details", { className: "kl-privacy-more" });
  readonly #privacyActions = element("div");
  readonly #privacyPanel: ProfilePrivacyPanel | undefined;
  readonly #directRetention: DirectRetentionPanel | undefined;
  readonly #preferencePrivacy: PreferencePrivacyPanel | undefined;
  readonly #syncPanel: CloudSyncPanel | undefined;
  #page: AccountSettingsPage = "cloud";
  #visible = false;
  #destroyed = false;
  #generation = 0;
  #viewVersion = 0;
  #review: AccountControlReview | undefined;
  #busy = false;
  #feedback = "";
  #failed = false;
  #kind: AccountActivityKind | undefined;
  #me: Me | undefined;
  #profile: CloudProfile | undefined;
  #blocks: number[] = [];
  #sessions: AccountSession[] | undefined;
  #sessionFilter = "Active";
  #revokedSessions: AccountSession[] = [];
  #sessionSource: AccountControlReview | undefined;
  readonly #sessionMenu = new ShellActionMenu("explore");
  #checkedAt = 0;
  #auditTimer:ReturnType<typeof setInterval>|undefined;
  constructor(readonly client: Client | undefined, readonly activity: AccountActivity, readonly options: {
    navigate(page: AccountSettingsPage | "moderation" | "my-reports"): void;
    nativeHidden?(): { blacklist: readonly number[] | undefined; ghostList: readonly number[] | undefined } | undefined;
    editPrivacy(): void;
    editPreferences(): void;
    syncQueue?: CloudSyncQueue;
  }) {
    this.#directRetention = client ? new DirectRetentionPanel(client, activity) : undefined;
    this.#preferencePrivacy = client ? new PreferencePrivacyPanel(client, activity, options.editPreferences) : undefined;
    this.#privacyPanel = client && this.#preferencePrivacy ? new ProfilePrivacyPanel(client, activity, undefined, {
      preferenceAudience: this.#preferencePrivacy.audienceBadge, preferenceEditor: this.#preferencePrivacy.audienceEditor, moreActions: this.#privacyActions,
    }) : undefined;
    this.#syncPanel = options.syncQueue && client ? new CloudSyncPanel(options.syncQueue, client) : undefined;
    this.element.append(this.#body, this.#dialog.element, this.#sessionMenu.element);
    this.#unsubscribe = client?.subscribe(kind => {
      if (!["session", "connection", "profiles-cleared", "communities", "reports", `profile:${activity.owner}`].includes(kind)) return;
      if(activity instanceof SafetyActivity)activity.invalidateAccess();
      this.#generation++; this.#review=undefined; this.#me = undefined; this.#profile = undefined; this.#blocks = []; this.#sessions = undefined;
      if (kind === "session" || kind === "connection") this.#clearSessionHistory();
      if (this.#page === "sessions" || kind === "session" || kind === "connection") this.#dialog.close();
      if (this.#visible) this.#render();
      if (this.#visible && !this.#busy) void this.refresh();
    }) ?? (() => {});
  }
  show(page: AccountSettingsPage): void {
    if (this.#destroyed || (this.#visible && this.#page === page)) return;
    this.#clearSessionHistory();
    this.#morePrivacy.open = false;
    this.#viewVersion++;this.#review=undefined;this.#dialog.close(); this.#page = page; this.#visible = true; this.#feedback = ""; this.#failed = false;
    clearInterval(this.#auditTimer);if(page==='audit'&&this.activity instanceof SafetyActivity)this.#auditTimer=setInterval(()=>{if(!this.#busy)void this.refresh();},20_000);
    void this.refresh();
  }
  hide(): void {
    if (!this.#visible) return;
    clearInterval(this.#auditTimer);if(this.activity instanceof SafetyActivity)this.activity.invalidateAccess();
    this.#clearSessionHistory(); this.#sessionMenu.close(false);
    this.#visible = false; this.#viewVersion++;this.#review=undefined;this.#generation++; this.#dialog.close(); this.#body.replaceChildren();
    this.#syncPanel?.hide(); this.#privacyPanel?.hide();
    this.#preferencePrivacy?.hide(); this.#directRetention?.hide();
    this.#me = undefined; this.#profile = undefined; this.#blocks = []; this.#sessions = undefined;
  }
  #active(): boolean { return this.#visible && !this.#destroyed && (!this.client || this.client.memberNumber === this.activity.owner); }
  #button(text: string, action: () => void, primary = false): HTMLButtonElement {
    const generation=this.#generation,origin=this.client?.origin;
    const b = element("button", { type: "button", className: `kl-text-button${primary ? " kl-text-button--primary" : ""}`, text,
      onClick: () => { if (b.isConnected&&generation===this.#generation&&origin===this.client?.origin&&this.#active() && !this.#busy) action(); } });
    b.disabled = this.#busy; return b;
  }
  #section(title: string, ...nodes: Node[]): HTMLElement {
    return element("section", { className: "kl-account-section" }, element("h3", { text: title }), ...nodes);
  }
  #note(text: string): HTMLElement { return element("p", { className: "kl-setting-help", text }); }
  #time(time: number): HTMLElement { const node = element("time"); bindClockText(node, time, "full-seen"); return node; }
  #confirm(title: string, message: string | HTMLElement, label: string, action: () => void): void {
    if (this.#page === "sessions") {
      this.#sessionModal(title, typeof message === "string" ? element("p", {text: message}) : message, "Cancel", label, () => {
        this.#dialog.close();
        action();
      });
      return;
    }
    const body = element("div", {}, element("p", {}, message), element("div", { className: "kl-setting-tool-buttons" },
      this.#button("Cancel", () => this.#dialog.close()), this.#button(label, () => { this.#dialog.close(); action(); }, true)));
    this.#dialog.show(title, body);
  }
  #links(): HTMLElement {
    return element("div", { className: "kl-setting-tool-buttons" }, ...([['sessions', 'Sessions'], ['privacy', 'Privacy'], ['audit', 'Activity log']] as const)
      .map(([page, label]) => this.#button(label, () => this.options.navigate(page))));
  }
  #status(): HTMLElement {
    const connected = this.client?.connected;
    const pending = ["connecting", "verifying"].includes(this.client?.connectionState ?? "");
    return element("div", { className: "kl-account-status" }, kikiIcon(connected ? "check" : "globe"),
      element("div", {}, element("strong", { text: connected ? "Connected to Cloud" : pending ? "Connecting…" : "Cloud disconnected" }),
        connected && this.#me && this.#checkedAt
          ? element("p", { className: "kl-setting-help" }, "Last checked ", this.#time(this.#checkedAt))
          : this.#note(`BC Member #${this.activity.owner}`)));
  }
  #render(): void {
    if (this.#page !== "privacy" || !this.client?.connected) this.#privacyPanel?.hide();
    if (this.#page !== "privacy" || !this.client?.connected || !this.#me) this.#preferencePrivacy?.hide();
    if (this.#page !== "privacy" || !this.client?.connected || !this.#me) this.#directRetention?.hide();
    this.#sessionMenu.close(false);
    this.#body.replaceChildren();
    if (this.#page !== "cloud" || !this.#active()) this.#syncPanel?.hide();
    if (!this.#active()) return;
    if (this.#feedback) { const msg = element("p", { className: "kl-account-feedback", text: this.#feedback }); msg.setAttribute("role", this.#failed ? "alert" : "status"); this.#body.append(msg); }
    if (this.#page === "audit") { this.#renderAudit(); return; }
    if (this.#page === "privacy") this.#renderPrivacyHeading();
    if (this.#page === "sessions") this.#renderSessionsHeading();
    if (this.#page === "cloud") {
      if (this.#syncPanel) {
        this.#syncPanel.show(surface => this.#cloudLayout(surface));
        this.#body.append(this.#syncPanel.element);
      } else this.#body.append(element("div", { className: "kl-cloud-overview" }, ...this.#cloudLayout()));
      return;
    }
    if (!this.client) {
      this.#body.append(this.#section("Cloud", this.#note("Cloud is not configured in this build."), this.#links()));
      if (this.#page === "privacy") this.#body.append(this.#hiddenPeople());
      return;
    }
    if (!this.client.connected) this.#body.append(this.#status());
    if (!this.client.connected) {
      this.#body.append(this.#section("Connect your account", this.#note("Use your current BC identity. Your BC password and native room chat are not uploaded."),
        this.#button("Connect with this BC account", () => void this.#run("connect"), true)), this.#links());
      if (this.#page === "privacy") this.#body.append(this.#hiddenPeople());
      return;
    }
    if (this.#page === "sessions") this.#renderSessions();
    if (this.#page === "privacy") this.#renderPrivacy();
  }
  #cloudLayout(sync?: CloudSyncSurface): HTMLElement[] {
    const info = this.#button("", () => this.#cloudInfo());
    info.classList.add("kl-audit-info-button");
    info.setAttribute("aria-label", "Settings information");
    info.setAttribute("aria-haspopup", "dialog"); info.append(kikiIcon("info"));
    const actions = sync?.actions ?? element("div");
    actions.classList.add("kl-audit-actions"); actions.append(info);
    const header = element("header", { className: "kl-audit-heading kl-cloud-heading" }, element("h2", { text: "Cloud" }), actions);
    if (!this.client) return [header, this.#section("Connection unavailable", this.#note("Cloud is not configured in this build."), this.#links())];

    const connecting = ["connecting", "verifying"].includes(this.client.connectionState);
    const connected = this.client.connected;
    const statusTitle = connected ? sync?.paused ? "Sync paused" : "Connected to Cloud" : connecting ? "Connecting…" : "Cloud disconnected";
    const checked = connected && this.#me && this.#checkedAt
      ? element("p", { className: "kl-setting-help" }, "Last checked ", this.#time(this.#checkedAt))
      : this.#note(connected ? "Account details not loaded." : "Account details are unavailable offline.");
    const status = element("section", { className: "kl-account-section kl-cloud-status" },
      element("div", { className: "kl-cloud-status-heading" },
        element("span", { className: "kl-cloud-icon" }, kikiIcon(!connected ? "offline" : sync?.paused ? "pause" : "check")),
        element("div", { className: "kl-cloud-status-copy" }, element("h3", { text: statusTitle }), checked),
        this.#button("Diagnostics", () => this.#diagnostics())), sync?.metrics);
    status.dataset.state = connected ? sync?.paused ? "paused" : "connected" : "offline";
    const flag = (key: string) => this.#me?.features?.[key];
    const statusLabel = (value: unknown) => value === true ? "Available" : value === false ? "Unavailable" : "Not checked";
    const row = (label: string, value: string) => element("div", { className: "kl-cloud-service-row" }, element("strong", { text: label }), element("span", {text: value}));
    const profile = flag("fullProfile"), preferences = flag("preferences"), direct = flag("directMessages");
    const serviceStatus = connected ? this.#me ? "Connected" : "Checking" : "Disconnected";
    const services = this.#section("Services", element("div", { className: "kl-cloud-services" },
      row("Profile & preferences", profile === preferences ? statusLabel(profile) : `Profile: ${statusLabel(profile)} · Preferences: ${statusLabel(preferences)}`),
      row("Communities", statusLabel(flag("communities"))),
      row("Messages & authentication", direct === true && connected ? "Available" : direct === undefined && !this.#me ? serviceStatus : `Messages: ${statusLabel(direct)} · Account: ${serviceStatus}`)));
    const grid = element("div", { className: "kl-account-grid kl-cloud-grid" }, services, this.#section("Your controls", this.#links()));
    const entries = this.activity.list("Sync").slice(0, 5);
    const recent = this.#section("Recent sync activity", ...entries.map(entry => element("div", {className: "kl-sync-history-row"},
      element("span", {text: ACCOUNT_ACTIONS[entry.action][1]}), this.#time(entry.time))));
    if (!entries.length) recent.append(this.#note("No sync activity."));
    const nodes = [header];
    if (!connected) nodes.push(this.#section("Connect your account", this.#note("Connect with your current BC identity."),
      this.#button("Connect with this BC account", () => void this.#run("connect"), true)));
    nodes.push(status, grid);
    if (sync) nodes.push(sync.queue);
    nodes.push(recent);
    return nodes;
  }
  #cloudInfo(): void {
    const content = element("div", {className: "kl-audit-info"}, this.#note("Cloud sync keeps profile, preference and community notification saves on this device until they are confirmed."),
      this.#note("Uploads and messages have their own retry controls."));
    if (this.#me) content.append(this.#note(`Photo albums: ${this.#me.features?.albums === true ? "Available" : this.#me.features?.albums === false ? "Unavailable" : "Not checked"}`));
    content.append(this.#recent("Connection"));
    if (this.client?.connected) content.append(this.#button("Disconnect this device…", () => this.#confirmDisconnect()));
    this.#showAccountDialog("Account & trust", content, true);
  }
  #clearSessionHistory(): void {
    this.#revokedSessions = []; this.#sessionSource = undefined; this.#sessionFilter = "Active";
  }
  #sessionLabel(s: AccountSession): string {
    return s.current ? "Current device" : `${s.kind === "device" ? "Remembered device" : "Temporary session"} · ${s.id.slice(0, 8)}`;
  }
  #sessionDialogButton(label: string, action: () => void): HTMLButtonElement {
    const button = this.#button(label, () => {
      button.focus({preventScroll: true});
      action();
    });
    button.setAttribute("aria-haspopup", "dialog");
    return button;
  }
  #sessionControls(): HTMLElement {
    return element("div", { className: "kl-setting-tool-buttons" },
      this.#button("Refresh sessions", () => { this.#dialog.close(); void this.refresh(); }),
      this.#button("Disconnect this device…", () => this.#confirmDisconnect()),
      this.#button("Sign out on all devices…", () => this.#confirm("Sign out everywhere?", "End every KikiLink Cloud session and revoke remembered devices? You can reconnect with your BC account.", "Sign out everywhere", () => void this.#run("all"))));
  }
  #sessionModal(title: string, content: HTMLElement, dismissLabel: string, actionLabel: string, action?: () => void): void {
    const dismiss = this.#button(dismissLabel, () => this.#dialog.close());
    const footer = element("footer", {className: "kl-dialog-actions"}, dismiss);
    if (action) {
      const danger = this.#button(actionLabel, action);
      danger.classList.add("kl-session-danger");
      footer.append(danger);
    }
    const body = element("div", {className: "kl-session-modal-body"}, content);
    if (content.tagName === "DL") {
      body.tabIndex = 0;
      body.setAttribute("role", "region");
      body.setAttribute("aria-label", "Device information");
    }
    this.#showAccountDialog(title, element("div", {className: "kl-session-modal"}, body, footer));
    dismiss.focus({preventScroll: true});
  }
  #renderSessionsHeading(): void {
    const others = this.#sessions?.filter(s => !s.current) ?? [];
    const revoke = this.#sessionDialogButton("Revoke other sessions…", () => {
      this.#confirm("Revoke other sessions?", `Revoke Cloud access for ${others.length === 1 ? "the other listed device or session" : `these ${others.length} other devices or sessions`}? This device stays connected.`,
        "Revoke other sessions", () => void this.#revoke(others));
    });
    revoke.disabled ||= !others.length;
    const info = this.#sessionDialogButton("", () => {
      const content = element("div", { className: "kl-audit-info" }, this.#note("Cloud lists remembered devices and temporary sessions for this account."));
      if (this.#me?.expiresAt) content.append(element("p", { className: "kl-setting-help" }, "Current access expires ", this.#time(this.#me.expiresAt)));
      if (this.#me && this.client?.connected) content.append(this.#sessionControls());
      this.#showAccountDialog("Account & trust", content, true);
    });
    info.classList.add("kl-audit-info-button"); info.setAttribute("aria-label", "Settings information"); info.append(kikiIcon("info"));
    this.#body.prepend(element("header", { className: "kl-audit-heading kl-sessions-heading" },
      element("h2", {text: "Sessions"}), element("div", {className: "kl-audit-actions"}, revoke, info)));
  }
  #sessionCard(s: AccountSession, revoked: boolean): HTMLElement {
    const label = this.#sessionLabel(s);
    const kind = s.kind === "device" ? "Remembered device" : "Temporary session";
    const status = s.current ? "This device" : revoked ? "Revoked" : s.activeSessions ? "Active" : "Remembered";
    const badge = element("span", {className: "kl-account-badge", text: status});
    if (s.current) badge.dataset.current = "true";
    const copy = element("div", {className: "kl-session-copy"}, element("strong", {text: label}),
      element("div", {className: "kl-session-metrics"}, element("span", {text: kind}), element("span", {text: new URL(s.origin).host}), badge),
      element("p", {}, "Last sign-in ", this.#time(s.lastSignInAt)));
    const icon = element("span", {className: "kl-session-icon"}, kikiIcon(s.current ? "profile" : "globe"));
    if (s.current) icon.dataset.current = "true";
    const confirm = () => this.#confirm(s.kind === "device" ? "Sign out this device?" : "Revoke this session?", element("p", {}, element("strong", {text: label}),
      s.kind === "device" ? " will lose its remembered access and all its Cloud sessions." : " will lose access to this Cloud session.",
      " Your current device stays connected."), s.kind === "device" ? "Sign out device" : "Revoke session", () => void this.#revoke([s]));
    const details = () => {
      const accessFields = element("dl", {className: "kl-session-access-fields"});
      for (const [name, value] of [
        ["Active sessions", String(revoked ? 0 : s.activeSessions)], ["Created", this.#time(s.createdAt)],
        [revoked ? "Previous expiry" : "Access expires", this.#time(s.expiresAt)],
      ] as const) accessFields.append(element("dt", {text: name}), element("dd", {}, value));
      const access = element("details", {}, element("summary", {text: kind, ariaLabel: `${kind}, access information`}), accessFields);
      const list = element("dl", {className: "kl-session-details"});
      for (const [name, value] of [
        ["Device label", label], ["Access", access], ["Site", s.origin],
        ["Status", s.current ? "Current device · protected" : status], ["Last sign-in", this.#time(s.lastSignInAt)],
      ] as const) list.append(element("dt", {text: name}), element("dd", {}, value));
      this.#sessionModal("Session details", list, "Close", "Revoke…", s.current || revoked ? undefined : confirm);
    };
    const menu = this.#button("", () => this.#sessionMenu.open(menu, "Session options", [
      {label: "Session details", icon: "info", run: details},
      ...(!s.current && !revoked ? [{label: "Revoke…", icon: "logout" as const, run: confirm}] : []),
    ]));
    menu.className = "kl-icon-button kl-session-menu"; menu.setAttribute("aria-label", "Session options"); menu.setAttribute("aria-haspopup", "menu");
    menu.setAttribute("aria-expanded", "false"); menu.append(kikiIcon("more"));
    return element("article", {className: "kl-account-session", ariaLabel: label}, icon, copy, element("div", {className: "kl-session-actions"},
      s.current ? element("span", {text: "Protected current session"}) : !revoked ? this.#sessionDialogButton("Revoke…", confirm) : null, menu));
  }
  #renderSessions(): void {
    const inventory = this.#section("Your devices");
    inventory.classList.add("kl-sessions-inventory");
    if (this.#sessions) {
      const sessions = [...this.#sessions].sort((a, b) => Number(b.current) - Number(a.current));
      const revoked = this.#revokedSessions;
      const filter = element("select", {className: "kl-select kl-session-filter"});
      filter.id = "kl-session-filter";
      const show = element("label", {text: "Show"}); show.htmlFor = filter.id;
      for (const name of ["Active", "Revoked", "All sessions"]) filter.append(element("option", {text: name}));
      filter.value = this.#sessionFilter; filter.disabled = this.#busy;
      filter.addEventListener("change", () => {
        if (!this.#active() || !filter.isConnected || this.#busy) return;
        this.#sessionFilter = filter.value;
        this.#render(); this.#body.querySelector<HTMLSelectElement>(".kl-session-filter")?.focus({preventScroll: true});
      });
      const activeCount = sessions.filter(s => s.activeSessions > 0).length;
      const remembered = sessions.length - activeCount;
      const toolbar = element("div", {className: "kl-session-toolbar"},
        show, filter, element("span", {text:
          `${activeCount} active${remembered ? ` · ${remembered} remembered` : ""} · ${revoked.length} revoked here`}));
      const list = element("div", {className: "kl-account-session-list"});
      if (this.#sessionFilter !== "Revoked") for (const s of sessions) list.append(this.#sessionCard(s, false));
      if (this.#sessionFilter !== "Active") for (const s of revoked) list.append(this.#sessionCard(s, true));
      if (!list.children.length) list.append(this.#note("No sessions revoked during this visit."));
      inventory.append(this.#note("Remembered devices and temporary sessions on Cloud."), toolbar, list);
      if (sessions.every(s => s.current) && this.#sessionFilter !== "Revoked") inventory.append(this.#note("No other active Cloud devices or sessions."));
    } else if (this.#me) {
      inventory.append(this.#note("This server does not support individual device management yet."));
      if (this.#me.expiresAt) inventory.append(element("p", {className: "kl-setting-help"}, "Current access expires ", this.#time(this.#me.expiresAt)));
      inventory.append(this.#sessionControls());
    } else inventory.append(this.#note("Device list not loaded."));
    const history = this.#section("Recent session activity");
    history.classList.add("kl-sessions-history");
    const entries = this.activity.list("Session").slice(0, 5);
    for (const entry of entries) history.append(element("div", {className: "kl-session-history-row"},
      element("span", {text: ACCOUNT_ACTIONS[entry.action][1]}), this.#time(entry.time)));
    if (!entries.length) history.append(this.#note("No session activity."));
    this.#body.append(inventory, history);
  }
  async #revoke(targets: readonly AccountSession[]): Promise<void> {
    if (!this.client?.connected || !this.#active() || this.#busy || this.#page !== "sessions" || !targets.length ||
        this.#me?.features?.accountSessions !== true || targets.some(s => s.current || !this.#sessions?.includes(s))) return;
    const review = this.#review;
    if (!review) return;
    const generation = ++this.#generation;
    this.#busy = true; this.#feedback = ""; this.#failed = false; this.#render();
    const current = () => this.#active() && generation === this.#generation && !!this.client?.connected && this.client.origin === review.origin && this.#page === "sessions";
    let confirmed = 0;
    try {
      for (const s of targets) {
        const intent = new AccountControlIntent(this.client, review, {action: "session-revoke", kind: s.kind, id: s.id});
        await intent.run(current);
        if (!current()) return;
        this.#revokedSessions.unshift(s);
        this.activity.record("session_revoked"); confirmed++;
      }
      this.#feedback = targets.length === 1 ? "Selected Cloud access signed out. This device stays connected." : `${confirmed} Cloud access entries revoked. This device stays connected.`;
    } catch(error) {
      if (!current()) return;
      this.activity.record("session_revoke_unconfirmed"); this.#failed = true;
      const message = error instanceof AccountControlGenerationError || error instanceof AccountControlUnconfirmedError ? error.message
        : "Sign-out could not be confirmed. Check the refreshed list; if the device remains, you can try again.";
      this.#feedback = confirmed ? `${confirmed} revoked before the request stopped. ${message}` : message;
    } finally {
      this.#busy = false;
      if (current()) {
        const refresh = this.refresh();
        const refreshing = this.#generation;
        await refresh;
        const active = document.activeElement;
        const root = this.element.getRootNode();
        if (this.#active() && this.#generation === refreshing && (!active || active === document.body ||
          (root instanceof ShadowRoot && active === root.host && !root.activeElement))) {
          this.#body.querySelector<HTMLElement>(".kl-session-filter, [role=alert] button")?.focus({preventScroll: true});
        }
      }
      else if (this.#active()) { this.#feedback = ""; await this.refresh(); }
    }
  }
  #confirmDisconnect(): void {
    this.#confirm("Disconnect this device?", "Pause automatic Cloud connection on this device. Your saved profile, posts and conversations stay in Cloud.", "Disconnect", () => void this.#run("disconnect"));
  }
  #renderPrivacyHeading(): void {
    const edit = this.#me?.features?.profilePrivacy === true && this.#privacyPanel
      ? this.#privacyPanel.headerButton(this.#busy) : this.#button("Edit privacy", this.options.editPrivacy, true);
    if (!this.#me || !this.client?.connected || this.#busy) edit.disabled = true;
    const info = this.#button("", () => this.#showAccountDialog("Privacy", element("div", { className: "kl-audit-info" },
      this.#note("Choose what your KikiLink profile shares. Cloud blocks and native BC lists are managed separately."),
      this.#note("Each photo album has its own audience. Use Additional privacy settings for album defaults and direct history.")), true));
    info.classList.add("kl-audit-info-button");
    info.setAttribute("aria-label", "Settings information");
    info.setAttribute("aria-haspopup", "dialog");
    info.append(kikiIcon("info"));
    this.#body.prepend(element("header", { className: "kl-audit-heading kl-privacy-heading" }, element("h2", { text: "Privacy" }),
      element("div", { className: "kl-audit-actions" }, edit, info)));
  }
  #hiddenPeople(): HTMLElement {
    const hidden = this.#section("Hidden people");
    const native = this.options.nativeHidden?.();
    const blocked = new Set(this.#blocks), blacklisted = new Set(native?.blacklist), ghosted = new Set(native?.ghostList);
    const members = new Set([...blocked, ...blacklisted, ...ghosted]);
    for (const member of members) {
      if (!Number.isSafeInteger(member) || member <= 0 || member === this.activity.owner) continue;
      const labels = [blocked.has(member) && "Cloud block", blacklisted.has(member) && "BC blacklist", ghosted.has(member) && "BC ghost list"].filter(Boolean).join(" · ");
      hidden.append(element("div", { className: "kl-account-row" },
        element("div", {}, element("strong", { text: `Member #${member}` }), this.#note(labels)),
        blocked.has(member) ? this.#button(`Unblock #${member}…`, () => this.#confirm("Unblock this account?",
          `Allow Member #${member} to interact with you in KikiLink Cloud again? Native BC relationships stay unchanged.`, "Unblock", () => void this.#run("unblock", member))) : null));
    }
    if (!this.#profile) hidden.append(this.#note("Cloud blocks have not been loaded."));
    else if (!this.#blocks.length && !blacklisted.size && !ghosted.size)
      hidden.append(this.#note(native?.blacklist && native.ghostList ? "No blocked or ghosted people." : "No blocked accounts in KikiLink Cloud."));
    if (blacklisted.size || ghosted.size) hidden.append(this.#note("Manage the BC blacklist and ghost list in Bondage Club."));
    return hidden;
  }
  #renderPrivacy(): void {
    const p = this.#profile;
    if (this.#me && this.#privacyPanel) {
      const features = this.#me.features;
      this.#privacyPanel.show(features?.profilePrivacy === true, features?.profileCommunities === true, features?.profileDiscovery === true, features?.profileLocation === true, features?.profileActivity === true);
      this.#body.append(this.#privacyPanel.element);
    }
    if (this.#me?.features?.preferences === true) this.#body.append(element("div", { className: "kl-privacy-notice" },
      kikiIcon("eye"), element("span", { text: "Private preferences are excluded from compatibility scores." })));
    this.#body.append(this.#hiddenPeople());
    this.#morePrivacy.replaceChildren(element("summary", { text: "Additional privacy settings" }), this.#privacyActions,
      element("div", { className: "kl-account-grid" },
        this.#section("Profile visibility", element("div", { className: "kl-account-row" }, element("strong", { text: "Visible KikiLink profile" }),
          element("span", { className: "kl-account-badge", text: p ? p.isDefault ? "No saved profile" : p.visible ? "Shared" : "Hidden" : "Not checked" })),
          this.#button("Edit profile visibility", this.options.editPrivacy)),
        this.#section("Photo albums", element("div", { className: "kl-account-row" }, element("strong", { text: "Default audience" }),
          element("span", { className: "kl-account-badge", text: p?.activityVisibility ? ({ everyone: "Everyone", friends: "Friends", private: "Only me" }[p.activityVisibility]) : "Not checked" })),
          this.#note("Each album also has its own audience."), this.#button("Edit album privacy", this.options.editPrivacy))));
    if (this.#me && this.#preferencePrivacy) {
      this.#preferencePrivacy.show(this.#me.features?.preferences === true); this.#morePrivacy.append(this.#preferencePrivacy.element);
    }
    if (this.#me && this.#directRetention) {
      this.#directRetention.show(this.#me.features?.directRetention === true); this.#morePrivacy.append(this.#directRetention.element);
    }
    this.#body.append(this.#morePrivacy);
  }
  #diagnostics(): void {
    const queue = this.options.syncQueue?.snapshot();
    const apiVersion = this.#me?.apiVersion;
    const services = Object.fromEntries(["fullProfile", "preferences", "communities", "directMessages", "albums"].map(key => {
      const value = this.#me?.features?.[key];
      return [key, typeof value === "boolean" ? value : null];
    }));
    const data = { connected: this.client?.connected ?? false, connectionState: this.client?.connectionState ?? "unconfigured",
      apiVersion: Number.isSafeInteger(apiVersion) ? apiVersion : null, services,
      localActivityEntries: this.activity.list().length, localActivityPersisted: !this.activity.volatile,
      ...(queue ? { sync: { paused: queue.paused, storageAvailable: !queue.error, counts: Object.fromEntries(["Pending", "Failed", "Conflict"].map(status => [status, queue.entries.filter(i => i.status === status).length])) } } : {}) };
    const json = JSON.stringify(data, null, 2);
    const download = element("a", { className: "kl-text-button kl-text-button--primary", text: "Download JSON" });
    download.href = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
    download.download = "KikiLink-cloud-diagnostics.json";
    this.#showAccountDialog("Cloud diagnostics", element("div", {}, this.#note("Status counts only. Account identifiers, tokens, messages and report contents are excluded."),
      element("pre", { className: "kl-account-diagnostics", text: json }), element("footer", {className: "kl-dialog-actions"},
        this.#button("Close", () => this.#dialog.close()), download)));
  }
  #entries(entries: readonly AccountActivityEntry[]): HTMLElement {
    const list = element("div", { className: "kl-account-activity" });
    if (!entries.length) list.append(this.#note("No recorded actions in this view."));
    for (const entry of entries) list.append(element("article", { className: "kl-account-log-row" }, kikiIcon(["Report", "Moderation"].includes(ACCOUNT_ACTIONS[entry.action][0]) ? "flag" : ACCOUNT_ACTIONS[entry.action][0] === "Privacy" ? "eye" : ACCOUNT_ACTIONS[entry.action][0] === "Session" ? "profile" : "refresh"),
      element("div", {}, element("strong", { text: ACCOUNT_ACTIONS[entry.action][1] }), this.#note(ACCOUNT_ACTIONS[entry.action][0])), this.#time(entry.time)));
    return list;
  }
  #recent(kind: AccountActivityKind): HTMLElement { return this.#section(`Recent ${kind.toLowerCase()} activity`, this.#entries(this.activity.list(kind).slice(0, 5))); }
  #showAccountDialog(title: string, content: HTMLElement, drawer = false): void {
    const dialog = this.#dialog.element;
    let releaseFit: ReturnType<typeof fitPanelDialog>;
    const keepEscapeInDialog = (event: KeyboardEvent) => { if (event.key === "Escape") event.stopPropagation(); };
    this.#dialog.show(title, content, () => {
      releaseFit?.();
      dialog.removeEventListener("keydown", keepEscapeInDialog);
      for (const property of ["inset", "max-width", "max-height"]) dialog.style.removeProperty(property);
    });
    dialog.addEventListener("keydown", keepEscapeInDialog);
    releaseFit = fitPanelDialog(dialog, drawer ? { layout: () => ({ marginX: 0, marginY: 0 }) } : undefined);
  }
  #openAuditInfo(): void {
    const links = [ ["privacy", "Privacy"], ["my-reports", "My reports"], ["moderation", "Moderation history"] ] as const;
    const actions = links.map(([page, label]) => element("button", { type: "button", className: "kl-text-button", text: label, onClick: () => {
      if (!this.#active() || this.#page !== "audit") return;
      this.#dialog.close();
      this.options.navigate(page);
    } }));
    this.#showAccountDialog("Account & trust", element("div", { className: "kl-audit-info" },
      this.#note("Explicit account actions on this device. Showing up to 100 recent entries from 30 days. Moderation requires current access; archived history is protected."),
      element("div", { className: "kl-setting-tool-buttons" }, ...actions)), true);
  }
  #renderAudit(): void {
    const clearableVisibleIds = () => {
      const visible = this.activity.list(this.#kind).slice(0, 100);
      const allowed = new Set((this.activity instanceof SafetyActivity ? this.activity.clearable(this.#kind) : visible).map(e => e.id));
      return new Set(visible.filter(e => allowed.has(e.id)).map(e => e.id));
    };
    const entries = this.activity.list(this.#kind).slice(0, 100);
    const filter = element("select", { className: "kl-select kl-audit-filter", ariaLabel: "Activity kind" });
    const filterLabel = element("label", { text: "Kind" }, filter);
    const changeKind = (kind?: AccountActivityKind) => {
      if (!this.#active()) return;
      this.#kind = kind;
      this.#render();
      this.#body.querySelector<HTMLSelectElement>(".kl-audit-filter")?.focus();
    };
    for (const kind of ["All", "Connection", "Session", "Privacy", "Sync", "Report", "Moderation"] as const) { const opt = element("option", { text: kind }); opt.value = kind; filter.append(opt); }
    filter.value = this.#kind ?? "All";
    filter.addEventListener("change", () => changeKind(filter.value === "All" ? undefined : filter.value as AccountActivityKind));
    const clear = this.#button("Clear visible entries…", () => {
      const ids = clearableVisibleIds();
      if (!ids.size) return;
      const cancel = this.#button("Cancel", () => this.#dialog.close());
      const confirm = this.#button("Clear entries", () => {
        this.#dialog.close();
        if(this.activity instanceof SafetyActivity){void this.#clearSafety(ids);return;}
        try { this.#feedback = this.activity.clear(ids) ? "Visible entries cleared. A Privacy entry records this action." : "The selected entries are no longer in this log."; this.#failed = false; }
        catch { this.#feedback = "Couldn’t save the cleared log. Your entries are kept; free some browser storage and retry."; this.#failed = true; }
        this.#render();
      });
      confirm.classList.add("kl-audit-confirm-clear");
      this.#showAccountDialog("Clear visible activity?", element("div", { className: "kl-audit-confirm" },
        element("p", { text: `Remove ${ids.size} entries from this device? Archived, out-of-scope and new entries stay. Server history stays. A generic “Audit cleared” entry remains.` }),
        element("footer", { className: "kl-dialog-actions" }, cancel, confirm)));
      cancel.focus();
    }); clear.disabled = !clearableVisibleIds().size || this.#busy;
    const info = this.#button("", () => this.#openAuditInfo());
    info.classList.add("kl-audit-info-button");
    info.setAttribute("aria-label", "Settings information");
    info.setAttribute("aria-haspopup", "dialog");
    info.append(kikiIcon("info"));
    const header = element("header", { className: "kl-audit-heading" }, element("h2", { text: "Activity log" }),
      element("div", { className: "kl-audit-actions" }, clear, info));
    this.#body.prepend(header);
    if (this.activity.volatile) {
      const notice = element("p", { className: "kl-account-feedback", text: "Some actions could not be saved in this browser. Existing stored activity is kept." });
      notice.setAttribute("role", "status");
      header.after(notice);
    }
    this.#body.append(element("div", { className: "kl-audit-toolbar" }, filterLabel,
      element("span", { className: "kl-audit-count", text: `${entries.length} visible ${entries.length === 1 ? "entry" : "entries"} · latest 100 shown` })),
      entries.length ? this.#entries(entries) : element("section", { className: "kl-audit-empty" }, kikiIcon("shield"),
        element("h3", { text: "No visible actions in this view" }), this.#note("No recorded actions match this kind. Try another kind or make an explicit local change."),
        this.#button("Show all kinds", () => changeKind())));
  }
  async #clearSafety(ids:ReadonlySet<string>):Promise<void>{
    const activity=this.activity;if(!(activity instanceof SafetyActivity))return;
    const version=this.#viewVersion,generation=this.#generation,origin=this.client?.origin;
    const current=()=>this.#active()&&this.#viewVersion===version&&this.#generation===generation&&this.client?.origin===origin;
    this.#busy=true;this.#render();
    try{await activity.refreshAccess(current);if(!current())return;
      this.#feedback=activity.clear(ids)?'Eligible selected entries cleared. Archived and out-of-scope history is kept. A Privacy entry records this action.':'No selected entries can be cleared with current access.';this.#failed=false;
    }catch{if(current()){this.#feedback='Couldn’t save the cleared log. Your entries are kept.';this.#failed=true;}}
    finally{this.#busy=false;if(this.#active())this.#render();}
  }
  async refresh(): Promise<void> {
    if (!this.#active()||this.#busy) return;
    if(this.activity instanceof SafetyActivity)this.activity.invalidateAccess();
    const generation = ++this.#generation, page = this.#page;
    this.#review=undefined;this.#me = undefined; this.#profile = undefined; this.#blocks = []; this.#sessions = undefined; this.#render();
    if(page==='audit'&&this.activity instanceof SafetyActivity){
      await this.activity.refreshAccess(()=>this.#active()&&this.#generation===generation&&this.#page==='audit');
      if(this.#active()&&this.#generation===generation)this.#render();return;
    }
    if (!this.client?.connected || page === "audit" || this.#busy) return;
    const origin=this.client.origin;
    const current = () => this.#active() && generation === this.#generation && this.client?.connected&&this.client.origin===origin;
    try {
      const me = await this.client.request<Me>("GET", "/v1/me");
      if (!current()) return;
      if (me.memberNumber !== this.activity.owner) throw new Error("Account changed");
      const review=captureAccountControl(this.client,me);
      if (page === "sessions" && me.features?.accountSessions === true) {
        const sessions = accountControlRead(await this.client.request<unknown>("GET",accountControlPath('/v1/account/sessions',review)),review);
        if (!current()) return;
        this.#sessions = sessionList(sessions, this.activity.owner);
        const previous = this.#sessionSource;
        if (previous?.origin !== review.origin || !sameAccountControlSource(previous.source, review.source)) this.#clearSessionHistory();
        this.#sessionSource = review;
        this.#revokedSessions = this.#revokedSessions.filter(old => !this.#sessions!.some(s => s.kind === old.kind && s.id === old.id));
      }
      if (page === "privacy") {
        const [profile, blocks] = await Promise.all([
          this.client.request<CloudProfile>("GET", `/v1/profiles/${this.activity.owner}`),
          this.client.request('GET',accountControlPath('/v1/blocks',review)).then(value=>accountControlRead<{items:Array<{memberNumber:number}>}>(value,review)),
        ]);
        if (!current()) return;
        if (profile.memberNumber !== this.activity.owner || !Array.isArray(blocks.items)) throw new Error("Account changed");
        this.#profile = profile;
        this.#blocks = [...new Set(blocks.items.map(b => b.memberNumber).filter(n => Number.isSafeInteger(n) && n > 0))].slice(0, 1000);
      }
      if (page === "sessions" && !this.#sessions) this.#clearSessionHistory();
      this.#review=review;this.#me = me; this.#checkedAt = Date.now(); this.#render();
    } catch {
      if (!current()) return;
      this.#clearSessionHistory();
      this.#review=undefined;this.#me = undefined; this.#profile = undefined; this.#blocks = []; this.#sessions = undefined; this.#render();
      const error = element("div", { className: "kl-account-feedback" }, element("p", { text: "Account details could not load. Nothing was changed." }), this.#button("Retry account details", () => void this.refresh()));
      error.setAttribute("role", "alert"); this.#body.prepend(error);
    }
  }
  async #run(kind: "connect" | "disconnect" | "all" | "unblock", member?: number): Promise<void> {
    if (!this.client || !this.#active() || this.#busy) return;
    if (kind !== "connect" && !this.client.connected) return;
    if (kind === "unblock" && (!member || !this.#blocks.includes(member))) return;
    const review=this.#review;if(kind!=='connect'&&!review)return;
    const intent=kind==='unblock'?new AccountControlIntent(this.client,review!,{action:'unblock',member:member!}):undefined;
    const page=this.#page,view=this.#viewVersion,owner=this.client.memberNumber,origin=this.client.origin;
    const current=()=>this.#active()&&view===this.#viewVersion&&page===this.#page&&this.client?.memberNumber===owner&&this.client.origin===origin;
    this.#busy = true; this.#feedback = ""; this.#failed = false; this.#render();
    try {
      if (kind === "connect") await this.client.connect();
      else if (kind === "unblock") await intent!.run(current);
      else await this.client.logout(kind === "all",review);
      if (!current()) return;
      this.activity.record(kind === "connect" ? "connected" : kind === "unblock" ? "account_unblocked" : kind === "all" ? "signed_out_all" : "disconnected");
      this.#feedback = kind === "connect" ? "Cloud connected." : kind === "unblock" ? "Account unblocked." : kind === "all" ? "Signed out on all devices." : "This device is disconnected.";
      if(kind==='unblock')this.client.rememberBlock?.(member!,false);
    } catch(error) {
      if (!current()) return;
      if (kind !== "unblock") this.activity.record(kind === "connect" ? "connection_failed" : kind === "all" ? "sign_out_all_unconfirmed" : "disconnect_unconfirmed");
      this.#failed = true;
      this.#feedback = error instanceof AccountControlGenerationError||error instanceof AccountControlUnconfirmedError ? error.message : kind === "connect" ? "Cloud connection failed. Try again." : kind === "unblock" ? "Unblock could not be confirmed. Refresh the list before retrying." : "This device is disconnected. Server sign-out could not be confirmed.";
    } finally {
      this.#busy = false;
      if (!current()) this.#feedback = "";
      if (this.#active()) await this.refresh();
    }
  }
  destroy(): void { this.hide(); this.#destroyed = true; this.#generation++; this.#unsubscribe(); this.#syncPanel?.destroy(); this.#privacyPanel?.destroy(); this.#preferencePrivacy?.destroy(); this.#directRetention?.destroy(); this.#sessionMenu.destroy(); this.#dialog.destroy(); }
}
