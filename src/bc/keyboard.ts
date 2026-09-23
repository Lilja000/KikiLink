/** Shadow-DOM inputs appear to BC as the host, not as its native InputChat. */
export function isKikiLinkInputEvent(event: unknown): boolean {
  const host = document.getElementById("kikilink-root");
  if (!host || host.hidden || !host.isConnected) return false;
  const path = event instanceof Event ? event.composedPath() : [];
  const target = path.includes(host) ? path[0] : document.activeElement === host ? host.shadowRoot?.activeElement : undefined;
  if (!(target instanceof HTMLElement)) return false;
  for (let node: HTMLElement | null = target; node && node !== host; node = node.parentElement) {
    if (node.hidden || node.style.display === "none" || node.style.visibility === "hidden" ||
      node instanceof HTMLDialogElement && !node.open) return false;
  }
  return true;
}

/** Keep addon input out of page/addon shortcuts without swallowing native key releases. */
export function containKikiLinkKeyboard(root: ShadowRoot): () => void {
  const doc = root.ownerDocument;
  const nativeKeys = new Set<string>();
  const localKeys = new Set<string>();
  const localReleases = new WeakSet<Event>();
  const inside = (event: Event) => event.composedPath().includes(root);
  const key = (event: KeyboardEvent) => event.code || event.key;
  const down = (event: KeyboardEvent) => {
    const id = key(event);
    // Repeats must not reassign a key pressed in BC after focus enters KikiLink.
    if (id && !nativeKeys.has(id) && !localKeys.has(id)) {
      (inside(event) ? localKeys : nativeKeys).add(id);
    }
  };
  const up = (event: KeyboardEvent) => {
    const id = key(event);
    nativeKeys.delete(id);
    const local = localKeys.delete(id);
    if (local) {
      localReleases.add(event);
      // A submit/close can remove the original field before keyup. Its release
      // still belongs to KikiLink, even if the browser now targets the page.
      if (!inside(event)) event.stopPropagation();
    }
  };
  const contain = (event: Event) => {
    if (event.type !== "keyup" || localReleases.has(event)) event.stopPropagation();
  };
  const reset = () => { nativeKeys.clear(); localKeys.clear(); };
  doc.addEventListener("keydown", down, true);
  doc.addEventListener("keyup", up, true);
  doc.defaultView?.addEventListener("blur", reset);
  for (const type of ["keydown", "keypress", "keyup"]) root.addEventListener(type, contain);
  return () => {
    doc.removeEventListener("keydown", down, true);
    doc.removeEventListener("keyup", up, true);
    doc.defaultView?.removeEventListener("blur", reset);
    for (const type of ["keydown", "keypress", "keyup"]) root.removeEventListener(type, contain);
    reset();
  };
}
