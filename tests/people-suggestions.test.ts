// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { MatchingSignalEditor } from '../src/modules/platform-shell/matching-signal-editor';
import type { CloudClient } from '../src/cloud/client';
import { readPeopleDirectory } from '../src/modules/platform-shell/people-directory';
import { checkedMatchCandidate } from '../src/modules/platform-shell/matching-model';
import { DEFAULT_MATCH_SIGNAL, rankMatch } from '../cloud/shared/matching.mjs';

const person = (memberNumber: number) => ({ memberNumber, displayName: 'Person', username: null });
const read = (numbers: number[], day?: number, cursor=0, query='') => {
  const request = vi.fn().mockResolvedValue({items: numbers.map(person), nextCursor: null});
  return { request, page: readPeopleDirectory({request} as unknown as CloudClient, 1, query, 20, cursor, day) };
};

describe('public suggestions', () => {
  it('accepts stable mixed order only for daily recommendations and rejects duplicates', async () => {
    const {request,page} = read([5,10],20500,7);
    expect((await page).items.map(row=>row.memberNumber)).toEqual([5,10]);
    expect(request).toHaveBeenCalledWith('GET','/v1/people?q=&limit=20&cursor=7&suggestions=20500');
    await expect(read([5,5],20500).page).rejects.toThrow('Invalid person');
    await expect(read([5,7],20500,7).page).rejects.toThrow('Invalid person');
    await expect(read([5,10],20500,0,'search').page).rejects.toThrow('Invalid person');
    await expect(read([5,10]).page).rejects.toThrow('Invalid person');
  });

  it('opens a profile recommendation without inventing languages, intents, availability, or connection permissions', () => {
    const candidate = rankMatch({
      memberNumber: 2, name: 'Author', username: null, note: '', intents: [], languages: [],
      interests: [], interestsShared: false, availability: null, size:'Either', status:null, expiresAt:null,
      signalRevision:0, compatibility:null, mutualCount:null, communities:[], connectionsShared:false,
      overlapMinutes:null,saved:false,hidden:false,choiceRevision:0,canRequest:false,
    },DEFAULT_MATCH_SIGNAL);
    expect(checkedMatchCandidate(candidate,1)).toMatchObject({languages:[],intents:[],canRequest:false});
    expect(()=>checkedMatchCandidate({...candidate, canRequest:true},1)).toThrow();
    expect(()=>checkedMatchCandidate({...candidate, signalRevision:1},1)).toThrow();
  });
});

describe('Match availability setup', () => {
  it.each([
    { revision: 0, shared: false, startsChecked: true },
    { revision: 1, shared: false, startsChecked: false },
    { revision: 2, shared: true, startsChecked: true },
  ])('keeps availability explicit in setup at revision $revision', ({ revision, shared, startsChecked }) => {
    const signal = structuredClone(DEFAULT_MATCH_SIGNAL);
    signal.share.availability = shared;
    const save = vi.fn().mockResolvedValue(undefined);
    const editor = new MatchingSignalEditor({ owner: 100, revision, signal, active: false, canPublish: true, serverNow: 1 },
      { save, close: vi.fn(), privacy: vi.fn() });
    document.body.append(editor.element);
    const click = (label: string) => {
      const button = Array.from(editor.element.querySelectorAll('button')).find(control => control.textContent === label);
      expect(button).toBeDefined();
      button!.click();
    };
    try {
      expect(editor.dirty).toBe(false);
      expect(signal.share.availability).toBe(shared);
      click('Continue');
      const share = editor.element.querySelector<HTMLInputElement>('[aria-label="Share my availability"]')!;
      expect(share.checked).toBe(startsChecked);
      share.click();
      click('Continue');
      expect(save).not.toHaveBeenCalled();
      expect(editor.element.querySelector('.kl-match-signal-preview-card')?.textContent?.includes('Availability not shared')).toBe(startsChecked);
      click('Save signal');
      expect(save).toHaveBeenCalledWith(expect.objectContaining({ share: expect.objectContaining({ availability: !startsChecked }) }), 'keep');
    } finally { editor.element.remove(); }
  });
});
