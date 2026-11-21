import { markAvatarPresence } from "../modules/link-chat/avatar-presence";
import { element } from './dom';
import type { CloudClient } from './client';
import type { CloudProfile } from './types';

export interface MentionQuery { start: number; end: number; query: string }
export interface MentionScope { key: string; members: readonly number[]; exact?: boolean; channelBase?: string }
type Candidate = Pick<CloudProfile, 'memberNumber' | 'displayName'> & { username: string };
type Field = HTMLTextAreaElement;

/** The incomplete token at the caret, excluding the same literal contexts as server mentions. */
export function mentionQuery(value: string, caret: number, selectionEnd = caret): MentionQuery | undefined {
  if (caret !== selectionEnd || caret < 0 || caret > value.length) return;
  const before = value.slice(0, caret), match = before.match(/(^|[^\p{L}\p{N}\p{M}_@/\\])@([A-Za-z0-9_]{0,24})$/u);
  if (!match) return;
  const start = caret - match[2]!.length - 1;
  const tail = value.slice(caret).match(/^[A-Za-z0-9_]*/u)![0];
  const end = caret + tail.length;
  if (end - start > 25 || /^[\p{L}\p{N}\p{M}_]/u.test(value.slice(end))) return;
  if (/^[ \t]*>/u.test(value.slice(value.lastIndexOf('\n', start) + 1, start))) return;
  if ([...value.matchAll(/https?:\/\/[^\s<>]+|www\.[^\s<>]+|`+[^`]*`+/gi)].some(m => start >= m.index && start < m.index + m[0].length)) return;
  // An unfinished code span/fence should not offer mentions either.
  if ((value.slice(0, start).match(/`+/g)?.length ?? 0) % 2) return;
  return { start, end, query: match[2]!.toLowerCase() };
}

/** At most 40 already-known IDs, three reads in flight, six visible results. No directory scan. */
export async function mentionCandidates(client: CloudClient, scope: MentionScope, query: string,
  blocked: (member: number) => boolean, current: () => boolean): Promise<Candidate[]> {
  const allowed = (member: number) => member !== client.memberNumber && Number.isSafeInteger(member) && member > 0 &&
    !blocked(member) && !client.isProfileBlocked?.(member);
  if (scope.channelBase) {
    try { const result = await client.request<{items:Candidate[]}>('GET', `${scope.channelBase}/mention-candidates?q=${encodeURIComponent(query)}`);
      return current() ? result.items.filter(p=>allowed(p.memberNumber)).slice(0,6) : [];
    } catch { return []; }
  }
  const members = [...new Set(scope.members)].filter(allowed).slice(0, 40);
  const results = new Map<number, Candidate>();
  const add = (p: CloudProfile) => {
    if (current() && allowed(p.memberNumber) && p.visible && p.username && /^[a-z0-9_]{3,24}$/.test(p.username) &&
      (p.username.startsWith(query) || p.displayName.toLocaleLowerCase().includes(query)))
      results.set(p.memberNumber, { memberNumber: p.memberNumber, displayName: p.displayName, username: p.username });
  };
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(3, members.length) }, async () => {
    while (current() && index < members.length) {
      const member = members[index++]!;
      try { add(await client.profile(member)); } catch { /* Missing/hidden profiles are not suggestions. */ }
    }
  }));
  if (scope.exact && query.length >= 3 && current() && ![...results.values()].some(p => p.username === query)) {
    try {
      const target = await client.request<{ memberNumber: number; username: string }>('GET', `/v1/usernames/resolve/${encodeURIComponent(query)}`);
      if (current() && target.username === query && allowed(target.memberNumber)) {
        const profile = await client.profile(target.memberNumber, true);
        if (profile.username === target.username) add(profile);
      }
    } catch { /* Exact unknown names remain plain text; never enumerate names. */ }
  }
  return [...results.values()].sort((a, b) => Number(b.username === query) - Number(a.username === query) ||
    Number(b.username.startsWith(query)) - Number(a.username.startsWith(query)) || a.username.localeCompare(b.username)).slice(0, 6);
}

/** One popup per surface. Detached editors are weakly held and do not retain per-field requests. */
export class MentionPicker {
  readonly #popup = element('div', { className: 'kl-mention-picker', hidden: true });
  readonly #list = element('div', { role: 'listbox', ariaLabel: 'Username suggestions' });
  readonly #status = element('div', { className: 'kl-mention-picker-status', role: 'status' });
  readonly #fields = new Set<WeakRef<Field>>();
  readonly #scopes = new WeakMap<Field, () => MentionScope | undefined>();
  readonly #unsubscribe: () => void;
  #field: Field | undefined;
  #query: MentionQuery | undefined;
  #scope: MentionScope | undefined;
  #value = '';
  #results: Candidate[] = [];
  #selected = 0;
  #version = 0;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #running = false;
  #again = false;
  #destroyed = false;
  #selecting = false;
  #inserting = false;
  constructor(readonly client: CloudClient, readonly blocked: (member: number) => boolean) {
    this.#list.id = `kl-mentions-${crypto.randomUUID()}`;
    this.#popup.append(this.#list, this.#status);
    this.#popup.addEventListener('pointerdown', event => event.preventDefault());
    this.#unsubscribe = client.subscribe(kind => {
      if (kind === 'session' || kind === 'profiles-cleared') this.close();
    });
  }
  bind(field: Field, scope: () => MentionScope | undefined): void {
    if (this.#scopes.has(field)) return;
    this.#scopes.set(field, scope); this.#fields.add(new WeakRef(field));
    for (const ref of this.#fields) if (!ref.deref()) this.#fields.delete(ref);
    field.addEventListener('input', this.#input);
    field.addEventListener('click', this.#input);
    field.addEventListener('keyup', this.#caret);
    field.addEventListener('keydown', this.#key, true);
    field.addEventListener('blur', this.#blur);
    field.addEventListener('compositionstart', this.#composition);
  }
  readonly #composition = () => this.close();
  readonly #blur = () => this.close();
  readonly #caret = (event: KeyboardEvent) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) this.#input(event); };
  readonly #input = (event: Event) => {
    if (this.#inserting) return;
    if (event instanceof InputEvent && event.isComposing) { this.close(); return; }
    const field = event.currentTarget as Field, scope = this.#scopes.get(field)?.();
    const query = mentionQuery(field.value, field.selectionStart, field.selectionEnd);
    if (this.#destroyed || !this.client.connected || !scope || !query || field.disabled || field.readOnly) { this.close(); return; }
    if (this.#field === field && this.#value === field.value && this.#query?.start === query.start && this.#query?.query === query.query && this.#scope?.key === scope.key) return;
    this.close(); this.#field = field; this.#scope = scope; this.#query = query; this.#value = field.value;
    this.#timer = setTimeout(() => { this.#timer = undefined; void this.#search(); }, 160);
  };
  #current(version: number): boolean {
    const field = this.#field, scope = field && this.#scopes.get(field)?.();
    return !this.#destroyed && this.client.connected && version === this.#version && !!field?.isConnected &&
      !field.disabled && !field.readOnly && !field.closest('[hidden]') && (field.getRootNode() as Document | ShadowRoot).activeElement === field && scope?.key === this.#scope?.key &&
      field.value === this.#value && field.selectionStart === field.selectionEnd &&
      field.selectionStart === this.#query!.start + this.#query!.query.length + 1;
  }
  async #search(): Promise<void> {
    if (this.#running) { this.#again = true; return; }
    const version = this.#version;
    if (!this.#current(version)) return;
    this.#running = true; this.#again = false;
    this.#show(); this.#status.textContent = 'Finding usernames…';
    try {
      const results = await mentionCandidates(this.client, this.#scope!, this.#query!.query, this.blocked, () => this.#current(version));
      if (!this.#current(version)) { if (version === this.#version) this.close(); return; }
      this.#results = results; this.#selected = 0; this.#list.replaceChildren();
      this.#status.textContent = results.length ? '' : 'No matching username'; this.#status.hidden = results.length > 0;
      for (const [index, person] of results.entries()) {
        const row = element('button', { type: 'button', role: 'option', tabIndex: -1, className: 'kl-mention-option' },
          markAvatarPresence(element('span', { className: 'kl-mention-avatar', ariaHidden: 'true', text: Array.from(person.displayName || person.username).slice(0, 2).join('').toUpperCase() }), person.memberNumber),
          element('span', { className: 'kl-mention-copy' }, element('strong', { text: person.displayName }), element('small', { text: `@${person.username}` })));
        row.id = `${this.#list.id}-${index}`; row.dataset.member = String(person.memberNumber);
        row.addEventListener('click', () => { void this.#choose(index); });
        row.addEventListener('pointermove', () => { if (this.#selected !== index) { this.#selected = index; this.#highlight(); } });
        this.#list.append(row);
      }
      this.#highlight(); this.#position();
    } finally {
      this.#running = false;
      if (this.#again && this.#field) { this.#again = false; void this.#search(); }
    }
  }
  #show(): void {
    const field = this.#field!;
    const bounds = field.getBoundingClientRect(), viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0, bottom = top + (viewport?.height ?? window.innerHeight);
    if (bounds.top < top + 8 || bounds.bottom > bottom - 8) field.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    const root = field.getRootNode();
    (field.closest('dialog') ?? (root instanceof ShadowRoot ? root : document.body)).append(this.#popup);
    this.#popup.hidden = false; this.#status.hidden = false;
    field.setAttribute('aria-autocomplete', 'list'); field.setAttribute('aria-expanded', 'true'); field.setAttribute('aria-controls', this.#list.id);
    window.addEventListener('resize', this.#position); window.addEventListener('scroll', this.#position, true);
    window.visualViewport?.addEventListener('resize', this.#position); window.visualViewport?.addEventListener('scroll', this.#position);
    this.#position();
  }
  readonly #position = () => {
    if (!this.#field || this.#popup.hidden) return;
    if (!this.#current(this.#version)) { this.close(); return; }
    const rect = this.#field.getBoundingClientRect(), vp = window.visualViewport;
    const left = vp?.offsetLeft ?? 0, top = vp?.offsetTop ?? 0, width = vp?.width ?? window.innerWidth, height = vp?.height ?? window.innerHeight;
    const popupWidth = Math.min(Math.max(rect.width, 240), 360, width - 16);
    const above = rect.top - top - 8, below = top + height - rect.bottom - 8;
    const up = below < 220 && above > below;
    const available = Math.min(264, Math.max(0, up ? above : below));
    this.#popup.style.width = `${popupWidth}px`; this.#popup.style.maxHeight = `${available}px`;
    this.#popup.style.left = `${Math.max(left + 8, Math.min(rect.left, left + width - popupWidth - 8))}px`;
    const measured = Math.min(available, this.#popup.scrollHeight);
    const y = up ? rect.top - measured - 6 : rect.bottom + 6;
    this.#popup.style.top = `${Math.max(top + 8, Math.min(y, top + height - measured - 8))}px`;
  };
  #highlight(): void {
    for (const [index, row] of [...this.#list.children].entries()) row.setAttribute('aria-selected', String(index === this.#selected));
    const selected = this.#list.children[this.#selected];
    if (selected instanceof HTMLElement) {
      this.#field?.setAttribute('aria-activedescendant', selected.id);
      if (selected.offsetTop < this.#popup.scrollTop) this.#popup.scrollTop = selected.offsetTop;
      else if (selected.offsetTop + selected.offsetHeight > this.#popup.scrollTop + this.#popup.clientHeight)
        this.#popup.scrollTop = selected.offsetTop + selected.offsetHeight - this.#popup.clientHeight;
    }
    else this.#field?.removeAttribute('aria-activedescendant');
  }
  readonly #key = (event: KeyboardEvent) => {
    if (event.currentTarget !== this.#field || event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); this.close(); return; }
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) { if (event.key === 'Enter' || event.key === 'Tab') this.close(); return; }
    if (!this.#popup.hidden && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(event.key)) {
      if (!this.#results.length && !this.#running && !this.#selecting) { this.close(); return; }
      if (!this.#results.length || this.#selecting) {
        if (event.key === 'Enter') { event.preventDefault(); event.stopImmediatePropagation(); }
        if (event.key === 'Tab') this.close();
        return;
      }
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.key === 'Enter' || event.key === 'Tab') { void this.#choose(this.#selected); return; }
      this.#selected = (this.#selected + (event.key === 'ArrowDown' ? 1 : -1) + this.#results.length) % this.#results.length; this.#highlight();
    }
  };
  async #choose(index: number): Promise<void> {
    const selected = this.#results[index], field = this.#field, query = this.#query, version = this.#version;
    if (!selected || !field || !query || this.#selecting || !this.#current(version)) return;
    this.#selecting = true;
    this.#popup.setAttribute('aria-busy', 'true');
    try {
      // A cached suggestion may have been renamed or blocked since it was drawn.
      const resolved = await this.client.request<{ memberNumber: number; username: string }>('GET', `/v1/usernames/resolve/${encodeURIComponent(selected.username)}`);
      const scope = this.#scopes.get(field)?.();
      if (!this.#current(version)) { if (version === this.#version) this.close(); return; }
      const available = scope?.channelBase ? (await this.client.request<{items:Candidate[]}>('GET', `${scope.channelBase}/mention-candidates?q=${encodeURIComponent(selected.username)}`)).items.some(p=>p.memberNumber===selected.memberNumber&&p.username===selected.username) : true;
      if (!this.#current(version)) return;
      if (!available || resolved.memberNumber !== selected.memberNumber || resolved.username !== selected.username ||
        this.blocked(selected.memberNumber) || this.client.isProfileBlocked?.(selected.memberNumber) ||
        (!scope?.exact && !scope?.channelBase && !scope?.members.includes(selected.memberNumber))) {
        if (this.#current(version)) { this.#list.replaceChildren(); this.#status.hidden = false; this.#status.textContent = 'Username changed. Type again to refresh.'; this.#results = []; this.#highlight(); }
        return;
      }
      const tail = field.value.slice(query.end);
      const insertion = `@${selected.username}${!tail || !/^[\s.,!?;:)\]}]/u.test(tail) ? ' ' : ''}`;
      if (field.maxLength >= 0 && field.value.length - (query.end - query.start) + insertion.length > field.maxLength) {
        this.#status.hidden = false; this.#status.textContent = 'Not enough room for this username.'; return;
      }
      this.close(); field.focus({ preventScroll: true });
      field.setRangeText(insertion, query.start, query.end, 'end');
      field.setSelectionRange(query.start + insertion.length, query.start + insertion.length);
      this.#inserting = true;
      try { field.dispatchEvent(new Event('input', { bubbles: true })); } finally { this.#inserting = false; }
    } catch {
      if (this.#current(version)) { this.#list.replaceChildren(); this.#results = []; this.#highlight(); this.#status.hidden = false; this.#status.textContent = 'Username unavailable. Your draft is unchanged.'; }
    } finally { if (this.#version === version) { this.#selecting = false; this.#popup.removeAttribute('aria-busy'); } }
  }
  close(): void {
    this.#version++; clearTimeout(this.#timer); this.#timer = undefined; this.#again = false;
    for (const name of ['aria-autocomplete', 'aria-expanded', 'aria-controls', 'aria-activedescendant']) this.#field?.removeAttribute(name);
    this.#field = undefined; this.#scope = undefined; this.#query = undefined; this.#results = []; this.#selecting = false;
    this.#popup.hidden = true; this.#popup.removeAttribute('aria-busy'); this.#popup.remove(); this.#list.replaceChildren();
    window.removeEventListener('resize', this.#position); window.removeEventListener('scroll', this.#position, true);
    window.visualViewport?.removeEventListener('resize', this.#position); window.visualViewport?.removeEventListener('scroll', this.#position);
  }
  destroy(): void {
    this.#destroyed = true; this.close(); this.#unsubscribe();
    for (const ref of this.#fields) {
      const field = ref.deref(); if (!field) continue;
      field.removeEventListener('input', this.#input); field.removeEventListener('click', this.#input);
      field.removeEventListener('keyup', this.#caret); field.removeEventListener('keydown', this.#key, true);
      field.removeEventListener('blur', this.#blur); field.removeEventListener('compositionstart', this.#composition);
    }
    this.#fields.clear();
  }
}

export const MENTION_PICKER_STYLES = `
.kl-mention-picker { position:fixed; z-index:2147483101; box-sizing:border-box; padding:5px; border:1px solid var(--kl-border); border-radius:12px; background:linear-gradient(var(--kl-panel-bg,#151416),var(--kl-panel-bg,#151416)),#151416; color:var(--kl-text,#f2ece8); box-shadow:0 8px 24px #0006; overflow:auto; overscroll-behavior:contain; font:13px/1.35 var(--kl-font,system-ui,sans-serif); }
.kl-mention-picker[hidden] { display:none!important; }
.kl-mention-picker .kl-mention-option { display:flex; align-items:center; gap:9px; width:100%; min-height:46px; padding:6px 9px; border:0; border-radius:7px; background:transparent; color:inherit; text-align:left; font:inherit; cursor:pointer; }
.kl-mention-picker .kl-mention-option[aria-selected="true"],.kl-mention-picker .kl-mention-option:hover { background:color-mix(in srgb,var(--kl-accent),transparent 88%); }
.kl-mention-avatar { display:grid; place-items:center; flex:none; width:30px; height:30px; border-radius:50%; background:color-mix(in srgb,var(--kl-accent),transparent 85%); color:var(--kl-text,#f2ece8); font-size:10px; font-weight:700; }
.kl-mention-copy { display:grid; min-width:0; gap:1px; }
.kl-mention-copy strong,.kl-mention-copy small { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.kl-mention-copy strong { font-size:13px; font-weight:600; }
.kl-mention-copy small { font-size:11px; color:var(--kl-muted,#aaa29a); }
.kl-mention-picker-status { padding:8px 9px; font-size:12px; color:var(--kl-muted,#aaa29a); }
`;
