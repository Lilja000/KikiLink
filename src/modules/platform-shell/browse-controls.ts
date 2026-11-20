import { element } from '../../utils/dom';
import { kikiIcon, type KikiLinkIconName } from '../link-chat/icons';
import { fitPanelDialog } from './panel-dialog-layout';

export function iconButton(label: string, icon: KikiLinkIconName, run: () => void): HTMLButtonElement {
  return element('button', { type: 'button', className: 'kl-text-button kl-browse-icon', ariaLabel: label, title: label, onClick: run }, kikiIcon(icon));
}

export function searchField(input: HTMLInputElement, clearLabel = 'Clear search'): HTMLElement {
  return element('div', { className: 'kl-browse-search' }, kikiIcon('search'), input, iconButton(clearLabel, 'close', () => {
    input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus();
  }));
}

interface Field {
  key: string;
  label: string;
  choices?: Array<[string, string]>;
  placeholder?: string;
  maxLength?: number;
  presentation?: 'chips' | 'checkbox';
  description?: string;
}
interface FilterControl {
  field: Field;
  element: HTMLElement;
  read(): string;
  write(value: string): void;
}
interface FilterSheet {
  submitLabel: string;
  description?: string;
}
let filterSheetId = 0;
/** One compact filter sheet; draft choices are applied together, never during a background refresh. */
export class BrowseFilters {
  readonly button: HTMLButtonElement;
  readonly dialog = element('dialog', { className: 'kl-browse-dialog kl-browse-dialog--sheet' });
  readonly #summary = element('p', { className: 'kl-browse-dialog-summary' });
  #values: Record<string, string> = {};
  #returnFocus: HTMLElement | undefined;
  constructor(readonly title: string, readonly fields: Field[], readonly apply: (values: Record<string, string>) => void, readonly sheet: FilterSheet) {
    this.button = element('button', { type: 'button', className: 'kl-text-button kl-browse-filter', onClick: () => this.#open() }, kikiIcon('filter'), element('span', { text: 'Filters' }));
    this.dialog.id = `kl-browse-filter-sheet-${++filterSheetId}`;
    this.button.setAttribute('aria-haspopup', 'dialog'); this.dialog.setAttribute('aria-label', title);
    this.button.setAttribute('aria-controls', this.dialog.id); this.button.setAttribute('aria-expanded', 'false');
    this.#summary.setAttribute('role', 'status');
    this.dialog.addEventListener('keydown', e => e.stopPropagation());
    this.dialog.addEventListener('close', () => {
      if (this.dialog.open) return;
      this.button.setAttribute('aria-expanded', 'false');
      if (this.#returnFocus?.isConnected && !this.#returnFocus.closest('[hidden]')) this.#returnFocus.focus({ preventScroll: true });
      this.#returnFocus = undefined;
    });
  }
  set(values: Record<string, string>, summary = ''): void {
    this.#values = { ...values };
    if (this.#summary.textContent !== summary) this.#summary.textContent = summary;
    this.#summary.hidden = !summary;
    const count = this.fields.filter(f => values[f.key] !== (f.presentation === 'checkbox' ? '0' : f.choices?.[0]?.[0] ?? '') && !!values[f.key]).length;
    this.button.lastElementChild!.textContent = count ? `Filters · ${count}` : 'Filters';
  }
  close(): void { if (this.dialog.open) this.dialog.close(); }
  #control(field: Field): FilterControl {
    const value = this.#values[field.key] ?? field.choices?.[0]?.[0] ?? '';
    if (field.presentation === 'chips' && field.choices) {
      let selected = value;
      const buttons = field.choices.map(([choice, label]) => element('button', {
        type: 'button', className: 'kl-text-button', text: label, onClick: () => write(choice),
      }));
      const write = (choice: string) => {
        selected = choice;
        buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(field.choices?.[index]?.[0] === choice)));
      };
      write(value);
      return { field, element: element('fieldset', { className: 'kl-browse-dialog-chips' }, element('legend', { text: field.label }), element('div', {}, ...buttons)), read: () => selected, write };
    }
    if (field.presentation === 'checkbox') {
      const control = element('input', { ariaLabel: field.label });
      control.type = 'checkbox';
      control.checked = value === '1';
      return { field, element: element('label', { className: 'kl-browse-dialog-check' }, control,
        element('span', {}, element('strong', { text: field.label }), element('small', { text: field.description ?? '' }))),
        read: () => control.checked ? '1' : '0', write: next => { control.checked = next === '1'; } };
    }
    const control = field.choices ? element('select') : element('input');
    if (control instanceof HTMLInputElement) { control.type = 'text'; control.placeholder = field.placeholder ?? ''; control.maxLength = field.maxLength ?? 40; }
    for (const [value, text] of field.choices ?? []) {
      const option = element('option', { text });
      option.value = value;
      control.append(option);
    }
    control.setAttribute('aria-label', field.label);
    control.value = value;
    return { field, element: element('label', {}, element('span', { text: field.label }), control), read: () => control.value.trim(), write: next => { control.value = next; } };
  }
  #open(): void {
    if (this.button.disabled || this.dialog.open || !this.button.isConnected) return;
    this.#returnFocus = this.button;
    const controls = this.fields.map(field => this.#control(field));
    const form = element('form');
    const heading = element('h2', { text: this.title });
    const close = iconButton('Close dialog', 'close', () => this.close());
    form.append(element('header', { className: 'kl-browse-dialog-heading' },
      element('div', {}, element('span', { text: 'KIKILINK' }), heading), close),
    element('div', { className: 'kl-browse-dialog-body' },
      this.sheet.description ? element('p', { className: 'kl-browse-dialog-description', text: this.sheet.description }) : null,
      this.#summary, element('div', { className: 'kl-browse-dialog-fields' }, ...controls.map(control => control.element))));
    const reset = element('button', { type: 'button', className: 'kl-text-button', text: 'Reset filters', onClick: () => {
      if (!this.dialog.open || !form.isConnected) return;
      for (const control of controls) control.write(control.field.choices?.[0]?.[0] ?? '');
    } });
    form.append(element('footer', {}, reset, element('button', { type: 'submit', className: 'kl-text-button kl-text-button--primary', text: this.sheet.submitLabel })));
    form.addEventListener('submit', e => { e.preventDefault(); if (!this.dialog.open || !form.isConnected || this.button.disabled) return; const values = Object.fromEntries(controls.map(control => [control.field.key, control.read()])); this.close(); this.apply(values); });
    this.dialog.replaceChildren(form); this.dialog.showModal();
    this.button.setAttribute('aria-expanded', 'true');
    fitPanelDialog(this.dialog, { layout: (width, height) => width <= 700 || width <= 900 && height <= 500
      ? { marginX: 0, marginY: 0, maxHeight: height - 20 }
      : { marginX: 12, marginY: 12 } });
    (form.querySelector<HTMLElement>('select') ?? form.querySelector<HTMLElement>('[aria-pressed="true"]'))?.focus({ preventScroll: true });
  }
}

export const BROWSE_STYLES = `
.kl-cm-directory-tools,.kl-cm-member-search{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:0 0 16px}.kl-cm-directory-tools label{display:flex;align-items:center;gap:8px;color:var(--kl-muted);font-size:12px}.kl-cm-directory-tools label:first-child{margin-right:auto}.kl-cm-directory-tools select,.kl-cm-member-search select{max-width:100%;border:1px solid var(--kl-border);border-radius:8px;background:var(--kl-surface);color:var(--kl-text);padding:8px;font-size:12px}
.kl-cm-directory-tools button[aria-pressed=true],.kl-cm-member-search button[aria-pressed=true]{background:var(--kl-accent-soft);border-color:var(--kl-accent);color:var(--kl-accent)}
.kl-cm-members{border:1px solid var(--kl-border);border-radius:12px;padding:0 14px;gap:0!important}.kl-cm-members>article{border:0!important;border-bottom:1px solid var(--kl-border)!important;border-radius:0!important;padding:14px 0!important}.kl-cm-members>article:last-child{border-bottom:0!important}.kl-cm-members .kl-cm-member-name{border:0;background:transparent;padding:0!important;min-height:0;text-align:left;font-weight:600}.kl-cm-members>article{position:relative;display:flex;align-items:center;gap:12px}.kl-cm-member-identity{display:flex;align-items:center;gap:12px;min-width:0;flex:1}.kl-cm-member-identity>div{min-width:0;overflow-wrap:anywhere}.kl-cm-member-identity small{display:block;color:var(--kl-muted);font-size:11px}.kl-cm-member-avatar{position:relative;flex:none;width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:var(--kl-surface-2);font-size:12px;font-weight:650}.kl-cm-member-avatar>img,.kl-cm-member-avatar>div{width:100%;height:100%;object-fit:cover;border-radius:inherit;overflow:hidden}.kl-cm-presence{position:absolute;right:-2px;bottom:-2px;width:9px;height:9px;border:2px solid var(--kl-surface);border-radius:50%;background:var(--kl-muted)}.kl-cm-presence--online{background:#39906a}.kl-cm-presence--idle{background:#bb913f}.kl-cm-presence--dnd{background:#bd5971}.kl-cm-presence--unavailable{display:none}
.kl-cm-member-menu{position:relative;flex:none}.kl-cm-member-menu>summary{cursor:pointer;list-style:none;padding:8px;border-radius:8px}.kl-cm-member-menu>summary::-webkit-details-marker{display:none}.kl-cm-member-menu[open]{z-index:2}.kl-cm-member-menu>.kl-cm-actions{position:absolute;right:0;top:100%;width:200px;max-width:calc(100vw - 50px);padding:12px;border:1px solid var(--kl-border);border-radius:10px;background:var(--kl-surface);box-shadow:0 8px 24px #0002}.kl-cm-member-menu select{max-width:100%}
@media(max-width:480px){.kl-cm-member-search>.kl-browse-search{flex-basis:100%}.kl-cm-members>article{gap:7px}.kl-cm-member-avatar{width:32px;height:32px}.kl-cm-member-identity{gap:8px}.kl-cm-members .kl-cm-role{font-size:10px;max-width:90px;overflow-wrap:anywhere}}

:is(.kl-communities-page,.kl-events-page,.kl-spaces-page,.kl-albums) .kl-text-button,.kl-browse-dialog .kl-text-button{font-size:12px;font-weight:600;line-height:1.4;padding:8px 11px;min-height:34px}
.kl-browse-search{display:flex;gap:8px;align-items:center;flex:1;min-width:120px;border:1px solid var(--kl-border);border-radius:var(--kl-explore-radius,8px);padding:0 9px;background:var(--kl-surface)}
:where(.kl-shell:has(> .kl-platform-context[data-area="explore"])) .kl-browse-search{padding-inline:10px;background:var(--kl-input-bg)}
.kl-browse-search>.kl-icon{width:16px;height:16px;flex:none;color:var(--kl-muted)}
:is(.kl-communities-page,.kl-events-page,.kl-spaces-page) .kl-browse-search input{flex:1;min-width:0;border:0!important;background:transparent;padding:10px 0;outline-offset:-2px}
.kl-browse-search:focus-within{outline:2px solid var(--kl-accent);outline-offset:2px}
:is(.kl-communities-page,.kl-events-page,.kl-spaces-page) .kl-browse-search input:focus-visible{outline:0}
.kl-browse-search input::-webkit-search-cancel-button{-webkit-appearance:none}
.kl-browse-search>.kl-browse-icon{background:transparent;border:0}
.kl-browse-search:has(input:placeholder-shown)>.kl-browse-icon{visibility:hidden}
.kl-browse-icon{display:inline-flex;align-items:center;justify-content:center;flex:none;width:34px;height:34px;padding:7px!important}
.kl-browse-icon>.kl-icon{width:16px;height:16px}
.kl-browse-filter{gap:8px;min-height:var(--kl-explore-control,36px);border-radius:var(--kl-explore-radius,8px)}
.kl-browse-filter>.kl-icon{width:16px;height:16px;flex:none}
.kl-browse-dialog{box-sizing:border-box;width:min(440px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;border:1px solid var(--kl-border);border-radius:12px;padding:20px;background:var(--kl-surface);color:var(--kl-text)}
.kl-browse-dialog::backdrop{background:#0009}.kl-browse-dialog h2{font-size:19px;margin:0 0 20px}.kl-browse-dialog label{display:grid;gap:7px;margin:14px 0;font-size:12px}
.kl-browse-dialog :is(input,select){box-sizing:border-box;width:100%;min-width:0;padding:10px;border:1px solid var(--kl-border);border-radius:7px;font:inherit;color:var(--kl-text);background:var(--kl-surface-2)}
.kl-browse-dialog footer{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}.kl-browse-dialog footer>button:first-child{margin-right:auto}
.kl-browse-summary{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;font-size:11px;color:var(--kl-muted);margin:0 0 14px}.kl-browse-context{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:0 24px 12px;color:var(--kl-muted);font-size:12px}.kl-browse-context:empty{display:none}
.kl-browse-dialog :focus-visible{outline:2px solid var(--kl-accent);outline-offset:2px}
.kl-browse-dialog--sheet { position: fixed; inset: 0; width: min(540px, calc(100vw - 24px)); margin: auto; padding: 0; overflow: hidden; border-color: var(--kl-border-strong); font: 12px/1.5 var(--kl-font,system-ui); }
.kl-browse-dialog--sheet::backdrop { background: #030303b8; }
.kl-browse-dialog--sheet[open], .kl-browse-dialog--sheet > form { display: flex; flex-direction: column; min-height: 0; }
.kl-browse-dialog--sheet > form { overflow: hidden; }
.kl-browse-dialog-heading { display: flex; flex: none; align-items: center; justify-content: space-between; gap: 12px; min-height: 61px; padding: 12px 16px; border-bottom: 1px solid var(--kl-border); }
.kl-browse-dialog-heading > div { min-width: 0; flex: 1; }
.kl-browse-dialog-heading > div > span { display: block; color: var(--kl-muted); font-size: 10px; line-height: 1.7; letter-spacing: .25px; }
.kl-browse-dialog-heading > div > h2 { margin: 0; font: 700 16px/1.4 var(--kl-font, system-ui); }
.kl-browse-dialog--sheet .kl-browse-dialog-heading > .kl-browse-icon { flex: none; width: 32px; height: 32px; min-height: 32px; padding: 0 !important; border: 0; border-radius: 8px; color: var(--kl-muted); background: transparent; }
.kl-browse-dialog--sheet .kl-browse-dialog-heading > .kl-browse-icon:hover { color: var(--kl-text); background: var(--kl-surface-hover); }
.kl-browse-dialog-body { min-height: 0; padding: 16px; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent; }
.kl-browse-dialog-description { margin: 0 0 16px; color: var(--kl-muted); font-size: 12px; line-height: 1.6; }
.kl-browse-dialog-summary { margin: 0; color: var(--kl-muted); font-size: 11px; line-height: 1.5; }
.kl-browse-dialog-chips { min-width: 0; margin: 4px 0 8px; padding: 0; border: 0; }
.kl-browse-dialog-chips > legend { margin-bottom: 10px; padding: 0; font-size: 11px; font-weight: 600; }
.kl-browse-dialog-chips > div { display: flex; flex-wrap: wrap; gap: 4px; }
.kl-browse-dialog-chips .kl-text-button { min-height: 32px; padding: 0 9px; border-color: transparent; border-radius: 8px; background: transparent; color: var(--kl-muted); font-size: 11px; font-weight: 500; }
.kl-browse-dialog--sheet .kl-browse-dialog-chips .kl-text-button { min-height: 32px; height: 32px; padding: 0 9px; font-size: 11px; font-weight: 500; line-height: 1.5; }
.kl-browse-dialog-chips .kl-text-button[aria-pressed=true] { color: var(--kl-text); background: var(--kl-accent-soft); border-color: var(--kl-accent-border, var(--kl-accent)); }
.kl-browse-dialog-chips .kl-text-button:hover { color: var(--kl-text); background: var(--kl-surface-hover); }
.kl-browse-dialog-fields > .kl-browse-dialog-check { display: flex; align-items: center; gap: 10px; margin: 0; padding: 14px 0; border-bottom: 1px solid var(--kl-border); cursor: pointer; }
.kl-browse-dialog-check > input[type=checkbox] { flex: none; width: 16px; height: 16px; margin: 0; padding: 0; accent-color: var(--kl-accent); }
.kl-browse-dialog-check strong, .kl-browse-dialog-check small { display: block; }
.kl-browse-dialog-check strong { font-size: 11px; font-weight: 550; }
.kl-browse-dialog-check small { margin-top: 3px; color: var(--kl-muted); font-size: 10px; }
.kl-browse-dialog-fields > label:not(.kl-browse-dialog-check) { gap: 6px; margin: 0; font-size: 12px; font-weight: 550; line-height: 1.5; }
.kl-browse-dialog-fields > label + label:not(.kl-browse-dialog-check) { margin-top: 16px; }
.kl-browse-dialog-fields > label:not(.kl-browse-dialog-check) > :is(input,select) { min-height: 37px; height: 37px; padding: 8px 10px; border-radius: 8px; background: var(--kl-input-bg); font-size: 12px; font-weight: 400; }
.kl-browse-dialog--sheet > form > footer { flex: none; align-items: center; margin: 0; padding: 12px 16px; border-top: 1px solid var(--kl-border); background: var(--kl-input-bg); }
.kl-browse-dialog--sheet > form > footer > .kl-text-button { min-height: 36px; height: 36px; padding: 0 12px; border-radius: 8px; font-size: 12px; font-weight: 550; line-height: 1.5; }
.kl-browse-dialog--sheet > form > footer > .kl-text-button:first-child { background: transparent; }
.kl-browse-dialog--sheet > form > footer > .kl-text-button:first-child:hover { background: var(--kl-surface-hover); }
.kl-browse-dialog--sheet > form > footer > .kl-text-button--primary { border-color: var(--kl-accent-border); box-shadow: none; font-weight: 650; }
@container kl-panel (width <= 700px) or ((width <= 900px) and (height <= 500px)) {
  .kl-browse-dialog--sheet[open] { width: 100vw; margin-block: auto 0; border-radius: 14px 14px 0 0; border-bottom: 0; }
  .kl-browse-dialog-heading, .kl-browse-dialog--sheet > form > footer { padding: 10px 12px; }
  .kl-browse-dialog-heading > div > h2 { font-size: 15px; }
  .kl-browse-dialog--sheet .kl-browse-dialog-heading > .kl-browse-icon { width: 40px; height: 40px; min-height: 40px; }
  .kl-browse-dialog-body { padding: 12px; }
  .kl-browse-dialog--sheet .kl-browse-dialog-chips > div { gap: 3px; padding: 2px 1px; }
  .kl-browse-dialog--sheet .kl-browse-dialog-chips .kl-text-button { min-height: 36px; height: 36px; padding-inline: 8px; }
  .kl-browse-dialog--sheet > form > footer > .kl-text-button { min-height: 40px; }
  .kl-browse-dialog-fields > label:not(.kl-browse-dialog-check) > :is(input,select) { min-height: 42px; height: 42px; }
}
@container kl-panel (width <= 700px) {
  .kl-browse-dialog-heading, .kl-browse-dialog-body, .kl-browse-dialog--sheet > form > footer { padding-inline: 12px; }
  .kl-browse-dialog-chips > div { gap: 3px; padding: 2px 1px; }
  .kl-browse-dialog--sheet .kl-browse-dialog-chips .kl-text-button { padding-inline: 6px; }
  .kl-browse-dialog-fields > label:not(.kl-browse-dialog-check) > :is(input,select) { font-size: 16px; }
}
@media(max-width:700px){.kl-browse-context{padding:0 14px 12px}}
@media(pointer:coarse){.kl-browse-icon{width:44px;height:44px}.kl-browse-dialog button{min-height:44px}}
@media(pointer:coarse){.kl-browse-dialog--sheet .kl-browse-dialog-heading > .kl-browse-icon{width:44px;height:44px;min-height:44px}.kl-browse-dialog--sheet > form > footer > .kl-text-button,.kl-browse-dialog--sheet .kl-browse-dialog-chips .kl-text-button{min-height:44px}}
`;
