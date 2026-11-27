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

/** Opt an initials-only person chip into the shared, visibility-gated portrait renderer.
 * Keep scoped status and fallback content on the outer chip while a photo is loading. */
export function markMemberAvatar<T extends HTMLElement>(avatar: T, member: number, name: string, shared?: string | null): T {
  markAvatarPresence(avatar, member, shared);
  if (!Number.isSafeInteger(member) || member <= 0) return avatar;
  const current = avatar.querySelector<HTMLElement>(":scope > [data-portrait-member]");
  if (current?.dataset.portraitMember === String(member) && current.dataset.portraitName === name) return avatar;
  const layer = document.createElement("span");
  layer.dataset.portraitMember = String(member);
  layer.dataset.portraitName = name;
  layer.setAttribute("aria-hidden", "true");
  if (current) current.replaceWith(layer);
  else avatar.append(layer);
  return avatar;
}
