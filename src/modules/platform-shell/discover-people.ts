import { matchObject, matchText, matchUuid } from '../../../cloud/shared/matching.mjs';
import { CloudError, type CloudClient } from '../../cloud/client';
import { profileMetadata, profilePath, profileRead } from '../../cloud/profile-generation';
import { isPeopleUsername, readPeopleDirectory } from './people-directory';

export interface DiscoverPerson {
  memberNumber: number;
  name: string;
  avatarId: string | null;
  status: string | null;
  username: string | null;
}

const previewLimit = 3;

/** Discover starts with shared identities, then reads viewer-authorized profile fields. */
export async function loadDiscoverPeople(
  client: CloudClient,
  current: () => boolean,
  blocked: (member: number) => boolean,
): Promise<DiscoverPerson[] | undefined> {
  const owner = client.memberNumber;
  const origin = client.origin;
  const valid = () => client.connected && client.memberNumber === owner && client.origin === origin && current();
  const inaccessible = (member: number) => client.isProfileBlocked(member) || blocked(member);
  try {
    if (!valid()) return;
    const { features, source } = await profileMetadata(client, valid);
    if (!valid() || features.profileDiscovery !== true) return;
    const page = await readPeopleDirectory(client, owner, '', previewLimit, 0, features.peopleSuggestions === true ? Math.floor(Date.now() / 86400000) : undefined);
    if (!valid()) return;
    const people = await Promise.all(page.items.map(async ({ memberNumber }): Promise<DiscoverPerson | undefined> => {
      if (!valid() || inaccessible(memberNumber)) return;
      const path = profilePath(`/v1/profiles/${memberNumber}`, source);
      let response: unknown;
      try {
        response = await client.request('GET', path);
      } catch (error) {
        if (error instanceof CloudError && (error.status === 403 || error.status === 404)) return;
        throw error;
      }
      if (!valid() || inaccessible(memberNumber)) return;
      const profile = profileRead(response, source);
      if (!matchObject(profile) || profile.memberNumber !== memberNumber || profile.visible !== true ||
        (profile.isDefault !== undefined && profile.isDefault !== false) ||
        !matchText(profile.displayName, 80) || !profile.displayName.trim()) return;
      const aboutVisible = profile.aboutHidden === undefined || profile.aboutHidden === false;
      return {
        memberNumber,
        name: profile.displayName,
        avatarId: matchUuid(profile.avatarId) ? profile.avatarId : null,
        status: aboutVisible && matchText(profile.statusMessage, 80) ? profile.statusMessage.trim() || null : null,
        username: isPeopleUsername(profile.username) ? profile.username : null,
      };
    }));
    if (valid()) return people.filter((row): row is DiscoverPerson => row !== undefined && !inaccessible(row.memberNumber));
  } catch {
    // Keep navigation available when discovery or the profile source cannot be verified.
  }
}
