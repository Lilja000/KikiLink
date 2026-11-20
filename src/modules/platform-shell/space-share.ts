const destinationId = /^[A-Za-z0-9_-]{1,64}$/u;
type SharedDestination = 'space' | 'community' | 'profile';

/** Identifiers stay in the fragment; a shared link never chooses a Cloud account. */
function destinationShareUrl(destination: SharedDestination, base: string, id: string, cloud: string): string {
  const url = new URL(base), origin = new URL(cloud);
  if (!destinationId.test(id) || !['http:', 'https:'].includes(url.protocol) ||
    !['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash)
    throw new Error(`Invalid ${destination === 'space' ? 'Space' : destination} link`);
  url.username = ''; url.password = ''; url.search = '';
  url.hash = `kikilink/${destination}/${id}?cloud=${encodeURIComponent(cloud)}`;
  return url.href;
}

function sharedDestinationId(destination: SharedDestination, hash: string, cloud: string): string | undefined {
  const match = /^#kikilink\/(space|community|profile)\/([A-Za-z0-9_-]{1,64})\?cloud=([^&]+)$/u.exec(hash);
  if (match?.[1] !== destination) return;
  try { if (decodeURIComponent(match[3]!) === cloud) return match[2]; } catch { /* Malformed fragments are unrelated routes. */ }
  return;
}

export const spaceShareUrl = (base: string, id: string, cloud: string): string => destinationShareUrl('space', base, id, cloud);
export const sharedSpaceId = (hash: string, cloud: string): string | undefined => sharedDestinationId('space', hash, cloud);
export const communityShareUrl = (base: string, id: string, cloud: string): string => destinationShareUrl('community', base, id, cloud);
export const sharedCommunityId = (hash: string, cloud: string): string | undefined => sharedDestinationId('community', hash, cloud);

export function profileShareUrl(base: string, member: number, cloud: string): string {
  if (!Number.isSafeInteger(member) || member <= 0) throw new Error('Invalid profile link');
  return destinationShareUrl('profile', base, String(member), cloud);
}
export function sharedProfileMember(hash: string, cloud: string): number | undefined {
  const id = sharedDestinationId('profile', hash, cloud);
  if (!id || !/^[1-9]\d*$/u.test(id)) return;
  const member = Number(id);
  return Number.isSafeInteger(member) ? member : undefined;
}
