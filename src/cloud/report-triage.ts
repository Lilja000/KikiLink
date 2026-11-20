import { element } from './dom';

export interface TriageReport { id: number; status: string; reviewState?: string; assignedTo?: number | null; priority?: 'standard' | 'high'; revision?: number }
export type TriageChange = { action: 'assign' | 'unassign' } | { action: 'priority'; priority: 'standard' | 'high' };
export type TriageRequest = TriageChange & { operationId: string; revision: number };
export const reportStatus = (r: TriageReport): string => ({ open: 'Open', in_review: 'In review', dismissed: 'Dismissed', resolved: 'Resolved', removed: 'Content removed', unavailable: 'Content unavailable' }[r.reviewState ?? r.status] ?? r.status);
export const assignedLabel = (r: TriageReport, actor: number | null | undefined): string => r.assignedTo == null ? 'Unassigned' : r.assignedTo === actor ? 'Assigned to you' : `Assigned to #${r.assignedTo}`;

/** The host owns request lifecycle, revision conflicts, retry identity and access cleanup. */
export function triageControls(r: TriageReport, options: {
  actor: number | null | undefined; disabled: boolean; pending: boolean; decision?: HTMLElement | undefined;
  button(label: string, run: () => void): HTMLButtonElement;
  change(input: TriageChange): void; retry(): void;
}): HTMLElement {
  const section = element('section', { className: options.decision ? 'kl-mod-triage kl-mod-case-actions' : 'kl-mod-triage', ariaLabel: 'Report assignment and priority' });
  const assignment = element('p', { className: 'kl-mod-note', text: assignedLabel(r, options.actor) });
  if (!options.decision || options.pending) section.append(assignment);
  if (options.pending) { section.append(element('p', { role: 'status', text: 'Change not confirmed. Retry sends the same change.' }), options.button('Retry change', options.retry)); return section; }
  const actions = element('div', { className: 'kl-mod-actions' }); section.append(actions);
  if (options.decision && r.assignedTo === options.actor) actions.append(assignment);
  if (r.assignedTo !== options.actor) actions.append(options.button(r.assignedTo == null ? 'Assign to me' : 'Reassign to me', () => options.change({ action: 'assign' })));
  if (options.decision) actions.append(options.decision);
  const management = element('div', { className: 'kl-mod-actions' });
  if (r.assignedTo != null) (options.decision ? management : actions).append(options.button('Clear assignment', () => options.change({ action: 'unassign' })));
  const select = element('select', { ariaLabel: 'Report priority' });
  for (const [value, text] of [['standard', 'Standard'], ['high', 'High']]) {
    const option = element('option', { value: value!, text: text! }); option.selected = value === r.priority; select.append(option);
  }
  select.disabled = options.disabled;
  const save = options.button('Save priority', () => options.change({ action: 'priority', priority: select.value as 'standard' | 'high' }));
  save.disabled = true;
  select.addEventListener('change', () => { save.disabled = options.disabled || select.value === r.priority; });
  management.append(element('label', {}, element('span', { text: 'Priority' }), select), save);
  section.append(management);
  return section;
}

export const triageFilterOptions = [
  ['state', 'Review status', [['active', 'Open & in review'], ['unassigned', 'Open'], ['in_review', 'In review']]],
  ['priority', 'Priority filter', [['all', 'Any priority'], ['standard', 'Standard'], ['high', 'High']]],
  ['assignment', 'Assignment filter', [['all', 'Anyone'], ['mine', 'Assigned to me'], ['unassigned', 'Unassigned']]],
] as const;
