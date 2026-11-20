import {captureAccountControl, AccountControlGenerationError, type AccountControlReview} from '../../cloud/account-control-generation';
import type { CloudClient } from "../../cloud/client";
import { bindClockText } from "../../core/time-format";
import { element } from "../../utils/dom";

type AccountClient = Pick<CloudClient, "origin" | "memberNumber" | "connected" | "connectionState" | "subscribe" | "request" | "connect" | "logout">;

/** Uses the existing account endpoints; never invents a list of devices or roles. */
export class CloudAccountSettings {
  readonly element = element("div", { className: "kl-settings-cloud" });
  #generation = 0;
  #destroyed = false;
  #busy = false;
  #confirmAll = false;
  #review:AccountControlReview|undefined;
  #pendingReview:AccountControlReview|undefined;
  #feedback = "";
  #failed = false;
  readonly #unsubscribe: () => void;
  constructor(readonly client: AccountClient, readonly openReports: () => void) {
    this.#unsubscribe = client.subscribe(kind => {
      if (kind !== "session" && kind !== "connection") return;
      this.#generation++;this.#review=undefined;this.#pendingReview=undefined;this.#confirmAll=false;
      if (!this.#busy) void this.refresh();
    });
  }
  #button(label: string, action: () => void): HTMLButtonElement {
    const owner=this.client.memberNumber,origin=this.client.origin;
    const button = element("button", { type: "button", className: "kl-text-button", text: label, onClick:()=>{if(button.isConnected&&!this.#destroyed&&!this.#busy&&owner===this.client.memberNumber&&origin===this.client.origin)action();} });
    button.disabled = this.#busy;
    return button;
  }
  async #run(kind: "connect" | "disconnect" | "all"): Promise<void> {
    if (this.#busy || this.#destroyed) return;
    const review=kind==='all'?this.#pendingReview:this.#review;if(kind!=='connect'&&!review)return;
    const owner=this.client.memberNumber,origin=this.client.origin,current=()=>!this.#destroyed&&owner===this.client.memberNumber&&origin===this.client.origin;
    this.#busy = true; this.#feedback = ""; this.#failed = false; this.#generation++;
    for (const button of this.element.querySelectorAll("button")) button.disabled = true;
    try {
      if (kind === "connect") await this.client.connect();
      else await this.client.logout(kind === "all",review);
      if(!current())return;
      this.#feedback = kind === "connect" ? "Cloud connected." : kind === "all" ? "Signed out on all devices." : "This device is disconnected.";
    } catch(error) {
      if(!current())return;
      this.#failed = true;
      this.#feedback = error instanceof AccountControlGenerationError?error.message:kind === "connect" ? "Cloud connection failed. Try again." : "This device is disconnected. Server sign-out could not be confirmed.";
    } finally {
      this.#busy = false; this.#confirmAll = false;this.#pendingReview=undefined;
      if (!this.#destroyed) await this.refresh();
    }
  }
  async refresh(): Promise<void> {
    if (this.#destroyed) return;
    const generation = ++this.#generation,owner=this.client.memberNumber,origin=this.client.origin;
    const connected = this.client.connected;
    const status = element("p", { text: this.#feedback || (connected ? "Connected" : ["connecting", "verifying"].includes(this.client.connectionState) ? "Connecting with your BC account…" : "Cloud is disconnected.") });
    status.setAttribute("role", this.#failed ? "alert" : "status");
    const account = element("section", {}, element("h3", { text: "Cloud" }),
      element("p", { className: "kl-setting-help", text: this.client.origin }),
      element("p", { text: `BC Member #${this.client.memberNumber}` }), status);
    this.element.replaceChildren(account);
    if (!connected) {
      account.append(element("p", { className: "kl-setting-help", text: "Connect with your current BC identity. Your BC password and native room chat are not uploaded." }),
        this.#button("Connect with this BC account", () => void this.#run("connect")));
      return;
    }
    const sessions = element("section", {}, element("h3", { text: "Sessions" }),
      element("p", { className: "kl-setting-help", text: "Disconnect pauses automatic connection on this device. Signing out everywhere also revokes your other Cloud sessions and remembered devices." }));
    const actions = element("div", { className: "kl-setting-tool-buttons" },
      this.#button("Disconnect this device", () => void this.#run("disconnect")),
      this.#button("Sign out on all devices", () => {if(!this.#review)return;this.#pendingReview=this.#review;this.#confirmAll = true; void this.refresh(); }));
    sessions.append(actions); this.element.append(sessions);
    if (this.#confirmAll) sessions.append(element("div", { className: "kl-settings-confirm" },
      element("p", { text: "Sign out of KikiLink Cloud on every device? You can reconnect with your BC account." }),
      this.#button("Cancel sign-out", () => { this.#confirmAll = false;this.#pendingReview=undefined;void this.refresh(); }),
      this.#button("Confirm sign out everywhere", () => void this.#run("all"))));
    const access = element("section", {}, element("h3", { text: "Moderation" }), element("p", { text: "Checking access…" }));
    this.element.append(access);
    try {
      const me = await this.client.request<{ memberNumber: number; expiresAt?: number; moderator?: boolean }>("GET", "/v1/me");
      if (this.#destroyed || generation !== this.#generation || !this.client.connected||this.client.memberNumber!==owner||this.client.origin!==origin) return;
      if (me.memberNumber !== this.client.memberNumber) throw new Error("Account changed");
      this.#review=captureAccountControl(this.client,me);
      if (Number.isFinite(me.expiresAt)) {
        const expiry = element("p", { className: "kl-setting-help" }, "Current access expires: ");
        const time = element("span"); bindClockText(time, me.expiresAt!, "full-seen"); expiry.append(time); sessions.prepend(expiry);
      }
      access.replaceChildren(element("h3", { text: "Moderation" }),
        element("p", { className: "kl-setting-help", text: me.moderator ? "Your account has moderator access. Report actions are checked by the server." : "Use the Report action on a post or message to send it for review. Only moderators can open the reports queue." }));
      if (me.moderator) access.append(this.#button("Open reports", this.openReports));
    } catch {
      if (this.#destroyed || generation !== this.#generation) return;
      this.#review=undefined;this.#pendingReview=undefined;this.#confirmAll=false;
      access.replaceChildren(element("p", { text: "Account details could not load." }), this.#button("Retry account details", () => void this.refresh()));
    }
  }
  destroy(): void { this.#destroyed = true; this.#generation++; this.#unsubscribe(); }
}
