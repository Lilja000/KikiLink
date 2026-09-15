import { EventEmitter } from "node:events";
import { io } from "socket.io-client";
import { attachCloudVerifier } from "./bc-adapter.mjs";
import { prepareBeepRecipients } from "./beep-recipients.mjs";
import { PublicRecipients } from "./public-recipients.mjs";

/** Dedicated BC account; only login and its bounded native receive permissions.
 * Login fields/events follow the pinned BC client and the existing Runner.
 * Terminal rejections never trigger automatic login retries.
 */
export class VerifierConnection extends EventEmitter {
  constructor(
    config,
    {
      socketFactory = io,
      fetchImpl = fetch,
      now = Date.now,
      schedule = setTimeout,
      cancel = clearTimeout,
      random = Math.random,
    } = {},
  ) {
    super();
    this.config = config;
    this.clock = { now, schedule, cancel, random };
    this.fetchImpl = fetchImpl;
    this.state = "stopped";
    this.stopped = true;
    this.member = null;
    this.failures = 0;
    this.suspendedReason = null;
    this.socket = socketFactory(config.serverUrl, {
      autoConnect: false,
      forceNew: true,
      reconnection: false,
      transports: ["websocket"],
      timeout: 15_000,
      rejectUnauthorized: true,
      extraHeaders: { Origin: config.origin },
      transportOptions: { websocket: { maxPayload: 2 * 1024 * 1024 } },
    });
    this.socket.on("connect", () => this.connected());
    this.socket.on("LoginQueue", () => {
      if (!this.stopped && this.state === "authenticating")
        this.change("queued");
      // Queue packets never extend the fixed 90-second authentication deadline.
    });
    this.socket.on("LoginResponse", (data) => this.login(data));
    this.socket.on("ForceDisconnect", () => this.suspend("server_disconnect"));
    this.socket.on("connect_error", () => this.retry());
    this.socket.on("disconnect", (reason) => {
      if (this.stopped || this.retryTimer) return;
      if (reason === "io server disconnect") this.suspend("server_disconnect");
      else this.retry();
    });
  }

  change(state) {
    if (this.state === state) return;
    this.state = state;
    this.emit("state", state);
  }

  clearSession() {
    this.member = null;
    this.recipients?.stop();
    this.recipients = null;
    this.detach?.();
    this.detach = null;
    this.clock.cancel(this.loginTimer);
    this.loginTimer = null;
  }

  connected() {
    if (this.stopped || !this.socket.connected || this.member !== null) return;
    this.clearSession();
    this.change("authenticating");
    if (this.stopped) return;
    this.loginTimer = this.clock.schedule(
      () => this.suspend("login_timeout"),
      90_000,
    );
    this.socket.emit("AccountLogin", {
      AccountName: this.config.username,
      Password: this.config.password,
    });
  }

  login(data) {
    if (this.stopped || !this.socket.connected) return;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      this.suspend("login_rejected");
      return;
    }
    if (
      data.MemberNumber !== this.config.member ||
      typeof data.AccountName !== "string" ||
      data.AccountName.toLowerCase() !== this.config.username.toLowerCase()
    ) {
      this.suspend("identity_mismatch");
      return;
    }
    if (
      typeof data.ID !== "string" ||
      !data.ID ||
      typeof data.Name !== "string" ||
      !data.Name
    ) {
      this.suspend("protocol_error");
      return;
    }
    if (this.member === this.config.member) return; // Duplicate response, no duplicate listeners.
    if (!["authenticating", "queued"].includes(this.state)) return;
    this.clock.cancel(this.loginTimer);
    this.loginTimer = null;
    this.member = this.config.member;
    try {
      if (this.config.mode === "production") {
        this.recipients = new PublicRecipients(this.socket, data, this.config, {
          fetchImpl: this.fetchImpl, schedule: this.clock.schedule, cancel: this.clock.cancel,
          diagnostic: (code) => this.emit("diagnostic", code),
        });
      } else if (prepareBeepRecipients(this.socket, data, this.config))
        this.emit("diagnostic", "verifier_receive_permissions_prepared");
    } catch {
      this.suspend("beep_permissions_refused");
      return;
    }
    this.onlineSince = this.clock.now();
    this.detach = attachCloudVerifier(this.socket, {
      expectedVerifierMember: this.config.member,
      allowedMembers: this.config.allowedMembers,
      mode: this.config.mode ?? "staging",
      canReceive: (number) => this.recipients?.canReceive(number) === true,
      getAuthenticatedMemberNumber: () => this.member,
      endpoint: this.config.endpoint,
      secret: this.config.secret,
      fetchImpl: this.fetchImpl,
      diagnostic: (code) => this.emit("diagnostic", code),
    });
    this.recipients?.start();
    this.change("online");
  }

  retry() {
    if (this.stopped || this.retryTimer) return;
    if (this.member !== null && this.clock.now() - this.onlineSince >= 300_000)
      this.failures = 0;
    this.clearSession();
    if (++this.failures >= 5) {
      this.suspend("retry_budget_exhausted");
      return;
    }
    const delay =
      Math.min(60_000, 2000 * 2 ** (this.failures - 1)) *
      (0.75 + this.clock.random() * 0.5);
    this.retryTimer = this.clock.schedule(() => {
      this.retryTimer = null;
      if (!this.stopped) {
        this.change("connecting");
        if (!this.stopped) this.socket.connect();
      }
    }, delay);
    this.socket.disconnect();
    this.change("reconnecting");
  }

  suspend(reason) {
    if (this.stopped) return;
    this.suspendedReason = reason;
    this.stop("suspended");
    this.emit("suspended", reason);
  }

  start() {
    if (!this.stopped || this.suspendedReason) return false;
    this.stopped = false;
    this.change("connecting");
    if (!this.stopped) this.socket.connect();
    return true;
  }

  stop(state = "stopped") {
    this.stopped = true;
    this.clearSession();
    this.clock.cancel(this.retryTimer);
    this.retryTimer = null;
    this.socket.disconnect();
    this.change(state);
  }
}
