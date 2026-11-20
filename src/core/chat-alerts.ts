import type { ChatTabAlerts, TabAlerts } from "./types";

/** Source switches override the old shared choice. Tab-wide timed mutes always take priority. */
export function chatAlertMode(policy: ChatTabAlerts, source: "direct" | "groups" | "channel", now = Date.now()): TabAlerts["mode"] {
  if (policy.mutedUntil === -1 || policy.mutedUntil > now) return "off";
  return chatAlertPreference(policy, source);
}

export function chatAlertPreference(policy: ChatTabAlerts, source: "direct" | "groups" | "channel"): TabAlerts["mode"] {
  const override = source === "channel" ? undefined : policy[source];
  if (override !== undefined) return override ? "all" : "off";
  return source === "direct" && policy.mode === "personal" ? "all" : policy.mode;
}
