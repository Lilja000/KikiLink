import { matchText, type MatchCandidate, type MatchFilters } from '../../../cloud/shared/matching.mjs';
import { MATCH_RESOURCE_KINDS, type MatchResource, type MatchResourceKind } from '../../../cloud/shared/matching-resources.mjs';
import type { CloudClient } from '../../cloud/client';
import { matchingReadAt, type MatchingSource } from './matching-generation';
import { checkedMatchPage } from './matching-model';
import type { MatchingRecovery } from './matching-recovery';
import { checkedResourcePage } from './matching-resources-model';

const finderLimit = 6;

export type MatchingFinderResult =
  | { kind: 'people'; candidate: MatchCandidate }
  | { kind: MatchResourceKind; candidate: MatchResource };

function candidateId(result: MatchingFinderResult): string {
  return result.kind === 'people' ? String(result.candidate.memberNumber) : result.candidate.id;
}

function matchingReadIsCurrent(client: CloudClient, recovery: MatchingRecovery, current: () => boolean): boolean {
  return current() && client.connected && client === recovery.client &&
    client.memberNumber === recovery.owner && client.origin === recovery.origin;
}

async function readMatchingPeople(
  client: CloudClient,
  owner: number,
  source: MatchingSource,
  params: URLSearchParams,
): Promise<MatchCandidate[]> {
  const read = matchingReadAt(client, source);
  const page = checkedMatchPage(await read(`/v1/matching/people?${params}`), owner);
  return page.items.filter(candidate => !candidate.hidden &&
    (candidate.expiresAt === null || candidate.expiresAt > page.serverNow));
}

export async function loadDiscoverMatchingPeople(
  client: CloudClient,
  recovery: MatchingRecovery,
  current: () => boolean,
  blocked: (member: number) => boolean,
  priority: MatchFilters['priority'] = 'balanced',
): Promise<MatchCandidate[] | undefined> {
  const valid = () => matchingReadIsCurrent(client, recovery, current);
  if (!valid()) return;

  try {
    const source = await recovery.gate(valid);
    if (!valid()) return;
    const params = new URLSearchParams({ limit: '3' });
    if (priority !== 'balanced') params.set('priority', priority);
    const candidates = await readMatchingPeople(client, recovery.owner, source, params);
    if (valid()) return candidates.filter(candidate => !blocked(candidate.memberNumber)).slice(0, 3);
  } catch {
    // A missing or outdated catalog has no verified recommendations to show.
  }
}

export async function searchMatching(
  client: CloudClient,
  recovery: MatchingRecovery,
  query: string,
  current: () => boolean,
  blocked: (member: number) => boolean,
): Promise<MatchingFinderResult[]> {
  const valid = () => matchingReadIsCurrent(client, recovery, current);
  const text = query.trim();
  if (!text || !matchText(text, 160) || !valid()) return [];

  const { people, resources } = await recovery.finderSources(valid);
  if (!valid()) return [];
  const params = new URLSearchParams({ query: text, limit: String(finderLimit) });
  const searches: Promise<MatchingFinderResult[]>[] = [];
  if (people) searches.push(readMatchingPeople(client, recovery.owner, people, params)
    .then(candidates => candidates.map(candidate => ({ kind: 'people', candidate }))));
  if (resources) {
    const read = matchingReadAt(client, resources);
    for (const kind of MATCH_RESOURCE_KINDS) {
      searches.push((async () => {
        const page = checkedResourcePage(await read(`/v1/matching/resources/${kind}?${params}`), kind);
        return page.items.filter(candidate => !candidate.hidden &&
          (candidate.endsAt === null || candidate.endsAt > page.serverNow))
          .map(candidate => ({ kind, candidate }));
      })());
    }
  }
  const pages = await Promise.allSettled(searches);
  if (!valid()) return [];
  return pages.flatMap(page => page.status === 'fulfilled' ? page.value : [])
    .filter(row => !blocked(row.kind === 'people' ? row.candidate.memberNumber : row.candidate.host.memberNumber))
    .sort((left, right) => right.candidate.score - left.candidate.score ||
      candidateId(left).localeCompare(candidateId(right)) || left.kind.localeCompare(right.kind))
    .slice(0, finderLimit);
}
