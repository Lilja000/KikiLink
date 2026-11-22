import type { CloudClient } from '../../cloud/client';

export interface PeopleDirectoryPerson { memberNumber: number; displayName: string; username: string | null; }
interface Page { items: PeopleDirectoryPerson[]; nextCursor: number | null; }

export function isPeopleUsername(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9_]{3,24}$/u.test(value);
}

export async function readPeopleDirectory(
  client: CloudClient,
  owner: number,
  query: string,
  limit: number,
  cursor: number,
  suggestions?: number,
): Promise<Page> {
  const order = suggestions && !query ? `&suggestions=${suggestions}` : '';
  const seen = new Set<number>([cursor]);
  const page = await client.request<Page>('GET', `/v1/people?q=${encodeURIComponent(query)}&limit=${limit}&cursor=${cursor}${order}`);
  if (!page || !Array.isArray(page.items) || page.items.length > limit ||
    (page.nextCursor !== null && (!Number.isSafeInteger(page.nextCursor) || page.nextCursor <= 0 ||
      page.nextCursor !== page.items.at(-1)?.memberNumber))) throw new Error('Invalid people');
  let previous = cursor || Infinity;
  for (const person of page.items) {
    if (!person || !Number.isSafeInteger(person.memberNumber) || person.memberNumber <= 0 ||
      person.memberNumber === owner || seen.has(person.memberNumber) || !order && person.memberNumber >= previous ||
      typeof person.displayName !== 'string' || !person.displayName || person.displayName.length > 80 ||
      (person.username !== null && !isPeopleUsername(person.username))) throw new Error('Invalid person');
    seen.add(person.memberNumber);
    previous = person.memberNumber;
  }
  return page;
}

/** Revalidate the pages the reader has already opened without dropping them between requests. */
export async function readPeopleDirectoryPages(
  client: CloudClient, owner: number, query: string, cursor: number,
  pages: number, suggestions: number | undefined, current: () => boolean,
): Promise<Page | undefined> {
  const items: PeopleDirectoryPerson[] = [];
  const seen = new Set<number>();
  let next: number | null = cursor;
  for (let i = 0; i < pages && next !== null; i++) {
    const page = await readPeopleDirectory(client, owner, query, 20, next, suggestions);
    if (!current()) return;
    for (const person of page.items) {
      if (seen.has(person.memberNumber)) throw new Error('Directory changed');
      items.push(person);
      seen.add(person.memberNumber);
    }
    next = page.nextCursor;
  }
  return { items, nextCursor: next };
}
