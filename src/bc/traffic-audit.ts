/** Opt-in, bounded metadata only. Never stores packet bodies, proof tokens or profile text. */
export interface BCTrafficEntry {
  id: number;
  timestamp: number;
  packetType: string;
  destination: number | "room" | "server";
  payloadBytes: number | null;
  reason: string;
  outcome: "submitted" | "threw";
  boundary: "ServerSend" | "socket-outgoing";
  repeatedWithin2s: boolean;
}
let enabled = false;
let reason: string | undefined;
let hookAvailable = false;
let socket: BCServerSocket | undefined;
let detachOutgoing: (() => void) | undefined;
let startedAt = 0;
let total = 0;
let dropped = 0;
const entries: BCTrafficEntry[] = [];
const recent = new Map<number, number>();

export const bcTrafficAudit = {
  start(): void { entries.length = 0; recent.clear(); total = dropped = 0; startedAt = Date.now(); enabled = true; attachOutgoing(); },
  stop(): void { enabled = false; recent.clear(); detachOutgoing?.(); detachOutgoing = undefined; },
  snapshot() { return { enabled, hookAvailable, socketObserverAvailable: detachOutgoing !== undefined, startedAt, total, dropped,
    coverage: "KikiLink-attributed synchronous BC sends; delayed native batching can fall outside attribution",
    byteDefinition: "UTF-8 JSON payload, excluding transport framing/compression", entries: entries.map(entry => ({ ...entry })) }; },
};
export function resetBCTrafficAudit(): void { bcTrafficAudit.stop(); entries.length = 0; total = dropped = startedAt = 0; }
export function setBCTrafficHookAvailable(value: boolean): void { hookAvailable = value; }

/** Socket.IO's passive outgoing observer, when present, also covers native helpers
 * that emit directly instead of calling ServerSend. Never patch socket.emit.
 */
export function setBCTrafficSocket(value: BCServerSocket | undefined): void {
  detachOutgoing?.(); detachOutgoing = undefined; socket = value;
  if (enabled) attachOutgoing();
}
function attachOutgoing(): void {
  if (detachOutgoing || !socket || typeof socket.onAnyOutgoing !== "function" || typeof socket.offAnyOutgoing !== "function") return;
  const connection = socket;
  const listener = (event: string, data: unknown): void => { recordSend(event, data, () => undefined, "socket-outgoing"); };
  try {
    connection.onAnyOutgoing!(listener);
    detachOutgoing = () => { try { connection.offAnyOutgoing!(listener); } catch { /* Revoked socket. */ } };
  } catch { /* Keep the labeled ServerSend fallback when passive observation is unavailable. */ }
}

/** Scope only synchronous calls; never retain a global attribution scope across an await. */
export function withBCNetworkReason<T>(category: string, operation: () => T): T {
  if (!enabled) return operation();
  const previous = reason;
  reason ??= category;
  try { return operation(); } finally { reason = previous; }
}
export function sendBCPacket(category: string, event: string, data: unknown): void {
  withBCNetworkReason(category, () => ServerSend(event, data));
}

/** Called by KikiLink's existing ModSDK ServerSend hook. Never swallows a send. */
export function observeBCSend<T>(event: unknown, data: unknown, send: () => T): T {
  // Prefer the actual outgoing socket event, without counting both boundaries.
  return detachOutgoing ? send() : recordSend(event, data, send, "ServerSend");
}
function recordSend<T>(event: unknown, data: unknown, send: () => T, boundary: BCTrafficEntry["boundary"]): T {
  if (!enabled || !reason || typeof event !== "string") return send();
  let entry: BCTrafficEntry | undefined;
  try {
    const packet = data && typeof data === "object" ? data as Record<string, unknown> : {};
    const body = JSON.stringify(data), timestamp = Date.now();
    const member = packet.Target ?? packet.MemberNumber;
    const destination = Number.isSafeInteger(member) && Number(member) > 0 ? Number(member) : event === "ChatRoomChat" ? "room" : "server";
    let category = reason;
    if (category === "protocol") {
      const wire = packet.Content ?? packet.Message;
      if (typeof wire === "string" && wire.startsWith("KIKILINK/1 ")) {
        const p = JSON.parse(wire.slice(11));
        category = p.t === "pq" ? (p.b ? "room-discovery" : p.p ? "profile-request" : "presence-request") :
          p.t === "ps" ? "presence-response" : p.t === "pc" ? "capability" :
          p.t === "pf" || p.t === "pb" ? "profile-response" : p.t === "ty" ? (p.a ? "typing-refresh" : "typing-stop") :
          p.t === "gm" ? "group-message" : typeof p.t === "string" && p.t.startsWith("g") ? "group-control" : "cloud-auth";
      }
    }
    // A short-lived hash detects repeated payloads without retaining their content.
    let fingerprint = 2166136261;
    for (const char of `${event}\u0000${body}`) fingerprint = Math.imul(fingerprint ^ char.charCodeAt(0), 16777619) >>> 0;
    const previous = recent.get(fingerprint);
    for (const [key, at] of recent) if (timestamp - at > 2000) recent.delete(key);
    if (recent.size >= 256) recent.delete(recent.keys().next().value!);
    recent.set(fingerprint, timestamp);
    entry = { id: ++total, timestamp, packetType: event, destination, payloadBytes: body === undefined ? null : new TextEncoder().encode(body).length,
      reason: category, outcome: "submitted", boundary, repeatedWithin2s: previous !== undefined && timestamp - previous < 2000 };
    if (entries.length >= 2000) { entries.shift(); dropped++; }
    entries.push(entry);
  } catch { /* Inspection must not change transport behavior or expose an unreadable body. */ }
  try { return send(); }
  catch (error) { if (entry) entry.outcome = "threw"; throw error; }
}
