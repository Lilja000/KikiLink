import { openSync, fstatSync, ftruncateSync, writeFileSync, fsyncSync, closeSync, renameSync, constants } from "node:fs";
import { join } from "node:path";
import { readPrivateFile } from "./config.mjs";

const MAX_MEMBERS = 64, POLL_MS = 2000;
const numbers = (value, max) => Array.isArray(value) && value.length <= max &&
  value.every((n) => Number.isSafeInteger(n) && n > 0);
const same = (a, b) => a.size === b.size && [...a].every((n) => b.has(n));

function readManaged(config) {
  let data;
  try { data = JSON.parse(readPrivateFile(join(config.stateDir, "beep-recipients.json"))); }
  catch (error) { if (error.code === "ENOENT") return new Set(); throw error; }
  if (!data || Object.keys(data).sort().join() !== "members,verifier" ||
    data.verifier !== config.member || !numbers(data.members, 2 * MAX_MEMBERS) || data.members.includes(config.member))
    throw new Error("receive_state_invalid");
  return new Set(data.members);
}

function writeManaged(config, members) {
  const candidate = join(config.stateDir, "beep-recipients.tmp");
  const fd = openSync(candidate, constants.O_WRONLY | constants.O_CREAT |
    constants.O_NOFOLLOW | constants.O_NONBLOCK, 0o600);
  try {
    const info = fstatSync(fd);
    if (!info.isFile() || info.uid !== process.getuid() || info.mode & 0o077)
      throw new Error("receive_state_invalid");
    ftruncateSync(fd, 0);
    writeFileSync(fd, JSON.stringify({ verifier: config.member, members: [...members] }));
    fsyncSync(fd);
  } finally { closeSync(fd); }
  renameSync(candidate, join(config.stateDir, "beep-recipients.json"));
  const directory = openSync(config.stateDir, "r");
  try { fsyncSync(directory); } finally { closeSync(directory); }
}

/** Extends the already used native AccountUpdate/FriendList path. Only the
 * dedicated service's temporary receive entries are managed; existing friends,
 * explicit blocks, player lists, room state and gameplay remain untouched. */
export class PublicRecipients {
  constructor(socket, login, config, { fetchImpl = fetch, schedule = setTimeout,
    cancel = clearTimeout, diagnostic = () => {} } = {}) {
    if (config.mode !== "production" || login.MemberNumber !== config.member || !socket.connected)
      throw new Error("receive_identity_refused");
    const lists = [login.FriendList, login.BlackList, login.GhostList].map((list) => list === undefined ? [] : list);
    if (lists.some((list) => !numbers(list, 5000))) throw new Error("receive_lists_invalid");
    Object.assign(this, { socket, config, fetchImpl, schedule, cancel, diagnostic });
    const recorded = readManaged(config);
    this.blocked = new Set([...lists[1], ...lists[2]]);
    this.current = new Set(lists[0]);
    // A crash journal includes both sides of one native update. The new login
    // supplies the authoritative side; discard absent entries before journaling
    // again, so repeated interrupted starts cannot grow the journal indefinitely.
    this.managed = new Set([...recorded].filter((number) => this.current.has(number)));
    if (this.managed.size > MAX_MEMBERS) throw new Error("receive_state_invalid");
    this.checkpointNeeded = !same(recorded, this.managed);
    this.baseline = new Set(lists[0].filter((n) => !this.managed.has(n)));
    for (const number of config.receiveMembers)
      if (!this.blocked.has(number)) this.baseline.add(number);
    if (this.baseline.size > 5000) throw new Error("receive_friends_limit");
    this.allowed = new Set();
    this.stopped = true;
    this.endpoint = new URL("/enrollment", config.endpoint).href;
  }
  reconcile(members) {
    if (!numbers(members, MAX_MEMBERS) || members.includes(this.config.member))
      throw new Error("receive_members_invalid");
    const next = new Set(this.baseline), accepted = new Set();
    for (const number of members) {
      if (this.blocked.has(number) || (!next.has(number) && next.size >= 5000)) continue;
      next.add(number);
      accepted.add(number);
    }
    const managed = new Set([...next].filter((number) => !this.baseline.has(number)));
    const changed = !same(next, this.current);
    if (changed) {
      if (!this.socket.connected || this.stopped) throw new Error("receive_disconnected");
      // Persist ownership before the native send. A crash on either side of the
      // send leaves enough information to remove only our entries next login.
      writeManaged(this.config, new Set([...this.managed, ...managed]));
      this.socket.emit("AccountUpdate", { FriendList: [...next] });
      this.current = next;
    }
    if (changed || this.checkpointNeeded || !same(managed, this.managed)) writeManaged(this.config, managed);
    this.checkpointNeeded = false;
    this.managed = managed;
    return { accepted, changed };
  }
  async request(method, body) {
    const controller = new AbortController();
    this.controller = controller;
    const timer = this.schedule(() => controller.abort(), 3000);
    try {
      const response = await this.fetchImpl(this.endpoint, {
        method, redirect: "error", signal: controller.signal,
        headers: { Authorization: `Bearer ${this.config.secret}`,
          ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        throw new Error("receive_api_unavailable");
      }
      const reader = response.body.getReader();
      let text = "", size = 0;
      const decoder = new TextDecoder();
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > 4096) throw new Error("receive_api_invalid");
          text += decoder.decode(chunk.value, { stream: true });
        }
        text += decoder.decode();
      } finally { await reader.cancel().catch(() => {}); }
      return JSON.parse(text);
    } finally {
      this.cancel(timer);
      if (this.controller === controller) this.controller = undefined;
    }
  }
  async poll() {
    if (this.stopped || this.polling) return;
    this.polling = true;
    try {
      const data = await this.request("GET");
      if (this.stopped) return;
      if (!data || Object.keys(data).sort().join() !== "members,snapshot" ||
        !/^[a-f0-9-]{36}$/i.test(data.snapshot) || !numbers(data.members, MAX_MEMBERS))
        throw new Error("receive_api_invalid");
      const { accepted, changed } = this.reconcile(data.members);
      this.allowed = accepted;
      // The existing emit path does not wait for an acknowledgement. Allow a
      // short settling interval before the browser sends its proof; verification
      // still requires actual native receipt, never this preparation marker.
      if (changed) await new Promise((resolve) => {
        this.settleResolve = resolve;
        this.settleTimer = this.schedule(resolve, 500);
      });
      this.settleResolve = undefined;
      if (this.stopped) return;
      const result = await this.request("POST", { snapshot: data.snapshot, members: [...accepted] });
      if (!result || result.prepared !== true) throw new Error("receive_api_invalid");
      this.failed = false;
    } catch {
      this.allowed.clear();
      if (!this.stopped) {
        try { this.reconcile([]); } catch { /* Retry cleanup on next authenticated login. */ }
        if (!this.failed) this.diagnostic("public_receive_unavailable");
        this.failed = true;
      }
    } finally {
      this.polling = false;
      if (!this.stopped) this.timer = this.schedule(() => { void this.poll(); }, POLL_MS);
    }
  }
  start() {
    if (!this.stopped) return;
    this.stopped = false;
    void this.poll();
  }
  canReceive(number) {
    // Existing DevTest clients send immediately and do not know proof-ready.
    // Retain their already configured native receive path, with block checks.
    return !this.stopped && !this.blocked.has(number) &&
      (this.allowed.has(number) || (this.config.allowedMembers.has(number) && this.current.has(number)));
  }
  stop() {
    this.stopped = true;
    this.allowed.clear();
    this.cancel(this.timer);
    this.cancel(this.settleTimer);
    this.settleResolve?.();
    this.settleResolve = undefined;
    this.controller?.abort();
  }
}
