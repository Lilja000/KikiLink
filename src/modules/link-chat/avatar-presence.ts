/** A supplied directory status carries the viewer's privacy restrictions. Only
 * avatars without a directory status may use locally visible BC presence. */
export function markAvatarPresence<T extends HTMLElement>(avatar: T, member: number, shared?: string | null): T {
  if (shared === undefined) avatar.dataset.presencePeer = String(member);
  else delete avatar.dataset.presencePeer;
  const value = shared?.trim().toLowerCase();
  avatar.dataset.avatarPresence = value === "online" ? "online" : value === "idle" || value === "away" ? "idle"
    : value === "dnd" || value === "do not disturb" ? "dnd" : value === "offline" ? "offline" : "unknown";
  return avatar;
}
