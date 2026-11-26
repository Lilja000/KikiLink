// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { shareLinkFields } from '../src/modules/platform-shell/share-link-fields';

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

it('selects the full URL on clipboard refusal and ignores a late failure after the dialog closes', async () => {
  const url = 'https://example.test/#kikilink/event/first';
  let open = true;
  const { body, copy } = shareLinkFields('Event link', url, 'Share this event.', () => open);
  const next = document.createElement('button');
  document.body.append(body, next);
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('Clipboard blocked'));
  await copy();
  const input = body.querySelector('input')!;
  expect(write).toHaveBeenCalledWith(url);
  expect(body.querySelector('[role="status"]')?.textContent).toBe('Select and copy the link.');
  expect(document.activeElement).toBe(input);
  expect([input.selectionStart, input.selectionEnd]).toEqual([0, url.length]);

  let decline!: () => void;
  write.mockImplementationOnce(() => new Promise<void>((_, reject) => { decline = reject; }));
  const copying = copy();
  open = false;
  next.focus();
  decline();
  await copying;
  expect(document.activeElement).toBe(next);
});
