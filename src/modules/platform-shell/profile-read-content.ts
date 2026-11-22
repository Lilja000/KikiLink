import { focusedElement, reconcileChildren } from '../../utils/dom';

/** Keep the open section's controls and rows mounted across Cloud reads. */
export class ProfileReadContent {
  readonly #nodes = new Map<string, { value: string; node: HTMLElement }>();

  node<T extends HTMLElement>(key: string, value: string, create: () => T): T {
    const previous = this.#nodes.get(key);
    if (previous?.value === value) return previous.node as T;
    const node = create();
    this.#nodes.set(key, { value, node });
    return node;
  }

  clear(): void { this.#nodes.clear(); }

  show(root: HTMLElement, children: HTMLElement[], list?: HTMLElement, rows: HTMLElement[] = []): void {
    const active = focusedElement(root);
    const inside = active && root.contains(active);
    const id = active?.dataset.memberNumber ?? active?.dataset.communityId;
    if (list) reconcileChildren(list, rows);
    reconcileChildren(root, children);
    for (const [key, { node }] of this.#nodes) if (!root.contains(node)) this.#nodes.delete(key);
    if (inside && focusedElement(root) !== active) {
      const next = root.contains(active) ? active : id && rows.find(row => (row.dataset.memberNumber ?? row.dataset.communityId) === id);
      if (next) next.focus({ preventScroll: true });
    }
  }
}
