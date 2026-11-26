import { element } from '../../cloud/dom';

export function shareLinkFields(label: string, url: string, description: string, current: () => boolean) {
  const input = element('input', { ariaLabel: label, value: url });
  input.readOnly = true;
  const status = element('p', { role: 'status' });
  const body = element('div', { className: 'kl-explore-share-body' },
    element('p', { text: description }), element('label', {}, element('span', { text: label }), input), status);
  const select = () => {
    if (!input.isConnected || !current()) return;
    input.focus({ preventScroll: true });
    input.select();
  };
  const copy = async () => {
    if (!input.isConnected || !current()) return;
    try {
      await navigator.clipboard.writeText(url);
      if (input.isConnected && current()) status.textContent = 'Link copied.';
    } catch {
      if (!input.isConnected || !current()) return;
      status.textContent = 'Select and copy the link.';
      select();
    }
  };
  return { body, copy, select };
}
