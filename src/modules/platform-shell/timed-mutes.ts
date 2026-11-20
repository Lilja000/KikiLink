import { bindClockText, formatNumericDateTime } from "../../core/time-format";
import { element, focusedElement } from "../../utils/dom";
import { ContentDialog } from "../link-chat/content-dialog";
import { conversationMuted, MUTE_DURATIONS, muteDescription } from "../link-chat/conversation-mute";
import { fitPanelDialog } from "./panel-dialog-layout";

export interface ActiveMute {
  key: string;
  label: string;
  until: number;
  unavailable?: string;
  edit?(back: () => void): void;
  unmute(): void | Promise<void>;
}

export interface MuteListPosition {
  key: string;
  index: number;
  scroll: number;
}

function muteButton(label: string, action: () => void, primary = false): HTMLButtonElement {
  return element("button", { type: "button", className: "kl-text-button" + (primary ? " kl-text-button--primary" : ""),
    text: label, onClick: action });
}

function showMuteModal(dialog: ContentDialog, title: string, content: HTMLElement, footer: HTMLElement,
  panel: HTMLElement | undefined, cleanup: () => void, dismiss?: () => void) {
  const shell = element("div", { className: "kl-timed-mute-modal" }, content, footer);
  let release: (() => void) | undefined;
  const containKeys = (event: KeyboardEvent) => event.stopPropagation();
  dialog.show(title, shell, () => {
    release?.();
    delete dialog.element.dataset.timedLayout;
    dialog.element.removeEventListener("keydown", containKeys);
    for (const key of ["inset", "max-width", "max-height", "--kl-dialog-viewport-height"]) dialog.element.style.removeProperty(key);
    cleanup();
  }, dismiss);
  dialog.element.addEventListener("keydown", containKeys);
  release = fitPanelDialog(dialog.element, {
    ...(panel ? { panel } : {}),
    layout: (width, height) => {
      dialog.element.dataset.timedLayout = width <= 600 ? "narrow" : width <= 900 && height <= 480 ? "landscape" : width <= 700 || width <= 900 && height <= 500 ? "compact" : "desktop";
      return { marginX: 12, marginY: 12 };
    },
  });
}

/** Uses the same mute records as the channel, conversation and area menus. */
export function openTimedMutes(dialog: ContentDialog, options: {
  panel?: HTMLElement;
  items(): ActiveMute[];
  areas: Array<{ label: string; edit(back: () => void): void }>;
  current(): boolean;
  close(): void;
  returnTo(position: MuteListPosition): void;
}, position?: MuteListPosition): () => void {
  const list = element("div", { className: "kl-timed-mutes-list" });
  list.setAttribute("role", "region");
  const status = element("p", { className: "kl-cloud-status" });
  status.setAttribute("role", "status");
  const body = element("section", { className: "kl-timed-mutes kl-timed-mute-body" });
  const active = () => options.current() && dialog.element.open && dialog.body.contains(body);
  const back = (key: string, index: number) => {
    const saved = { key, index, scroll: body.scrollTop };
    return () => { if (options.current()) options.returnTo(saved); else dialog.close(); };
  };
  const actions = element("div", { className: "kl-timed-mutes-actions" });
  for (const area of options.areas) {
    const key = "area:" + area.label;
    const button = muteButton("Mute " + area.label, () => { if (active()) area.edit(back(key, 0)); });
    button.dataset.muteArea = key;
    actions.append(button);
  }
  body.append(element("p", { text: "Pause notices for a whole area, a conversation, or a channel. Messages and their unread status are kept." }),
    list, actions, element("p", { text: "Use a conversation or channel menu to mute just that place. Permanent alert preferences remain separate." }), status);
  const footer = element("footer", { className: "kl-dialog-actions" }, muteButton("Close", () => dialog.close()));
  let signature: string | undefined;

  function focusRow(key: string, index: number, label: string) {
    const rows = [...list.querySelectorAll<HTMLElement>("[data-mute-key]")];
    const same = rows.find(row => row.dataset.muteKey === key);
    const area = [...actions.querySelectorAll("button")].find(item => item.dataset.muteArea === key);
    const nearest = rows[Math.min(index, rows.length - 1)];
    const target = [...same?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []].find(item => item.textContent === label)
      ?? area ?? nearest?.querySelector<HTMLButtonElement>("button:not(:disabled)") ?? actions.querySelector("button");
    target?.focus({ preventScroll: true });
  }

  let pendingFocus: { key: string; index: number } | undefined;
  function refresh() {
    if (!dialog.element.open || !dialog.body.contains(body)) return;
    if (!options.current()) { dialog.close(); return; }
    const rows = options.items().filter(row => conversationMuted(row.until)).sort((a, b) => a.label.localeCompare(b.label));
    const next = JSON.stringify(rows.map(row => [row.key, row.label, row.until, row.unavailable]));
    if (next === signature) return;
    signature = next;
    const focused = focusedElement(list);
    const oldRow = focused?.closest<HTMLElement>("[data-mute-key]");
    const oldIndex = oldRow ? [...list.children].indexOf(oldRow) : -1;
    const content = document.createDocumentFragment();
    for (const [index, row] of rows.entries()) {
      const expiry = element("p", { className: "kl-timed-expiry", text: "Muted until you turn it back on" });
      if (row.until > 0) bindClockText(expiry, row.until, "muted-date-time");
      const remove = muteButton("Unmute", () => {
        if (!active() || !list.contains(remove) || remove.disabled) return;
        if (focusedElement(list) === remove) pendingFocus = { key: row.key, index };
        status.textContent = "";
        remove.disabled = true;
        void Promise.resolve().then(() => {
          if (active() && list.contains(remove)) return row.unmute();
        }).then(refresh).catch(error => {
          if (active()) status.textContent = error instanceof Error ? error.message : "Could not remove this mute.";
        }).finally(() => {
          if (remove.isConnected) {
            remove.disabled = Boolean(row.unavailable);
            if (pendingFocus?.key === row.key && !focusedElement(list)?.closest("dialog")) remove.focus({ preventScroll: true });
          }
          pendingFocus = undefined;
        });
      });
      remove.disabled = Boolean(row.unavailable);
      remove.title = row.unavailable ?? "";
      const edit = row.edit;
      const rowElement = element("div", { className: "kl-timed-mutes-row" },
        element("div", {}, element("strong", { text: row.label }), expiry),
        element("div", { className: "kl-timed-mutes-actions" }, edit ? muteButton("Open", () => {
          if (active() && list.contains(rowElement)) edit(back(row.key, index));
        }) : undefined, remove));
      rowElement.dataset.muteKey = row.key;
      content.append(rowElement);
    }
    if (!rows.length) content.append(element("div", { className: "kl-timed-mutes-empty" },
      element("h3", { text: "No active mutes" }), element("p", { text: "Notifications follow your saved alert preferences." })));
    list.setAttribute("aria-label", `Active timed mutes (${rows.length})`);
    list.replaceChildren(content);
    if (oldRow?.dataset.muteKey) focusRow(oldRow.dataset.muteKey, oldIndex, focused?.textContent ?? "");
    else if (pendingFocus && !focused?.closest("dialog")) focusRow(pendingFocus.key, pendingFocus.index, "Unmute");
  }
  showMuteModal(dialog, "Timed mutes", body, footer, options.panel, options.close);
  refresh();
  if (position) {
    body.scrollTop = position.scroll;
    focusRow(position.key, position.index, "Open");
  }
  return refresh;
}

const durationHints: Record<typeof MUTE_DURATIONS[number][0], string> = {
  "15 minutes": "A short break.",
  "1 hour": "Time to focus on something else.",
  "8 hours": "A quieter part of your day.",
  "24 hours": "Notifications return tomorrow.",
  "Until I turn it back on": "Unmute here or in Settings → Alerts.",
};

export function openTimedMuteEditor(dialog: ContentDialog, options: {
  panel?: HTMLElement;
  label: string;
  until(): number;
  current(): boolean;
  save(until: number): void | Promise<void>;
  unavailable?(): string | undefined;
  close?(): void;
  done?(): void;
}): () => void {
  let duration: number = MUTE_DURATIONS[1][1];
  let busy = false;
  const body = element("section", { className: "kl-timed-mute-editor kl-timed-mute-body" });
  const active = () => dialog.element.open && dialog.body.contains(body) && options.current();
  const done = () => { if (options.done && options.current()) options.done(); else dialog.close(); };
  const status = element("p", { className: "kl-timed-status" });
  status.setAttribute("role", "status");
  const availability = element("div", { className: "kl-timed-warning" });
  availability.setAttribute("role", "status");
  const preview = element("p", { className: "kl-timed-expiry" });
  preview.setAttribute("aria-live", "polite");
  const choices = element("fieldset", { className: "kl-timed-duration-list" }, element("legend", { text: "How long would you like a break?" }));
  const updatePreview = () => {
    preview.textContent = duration < 0 ? "Starts when you save. You can unmute at any time."
      : `If saved now, ends ${formatNumericDateTime(Date.now() + duration)}.`;
  };
  for (const [name, value] of MUTE_DURATIONS) {
    const input = element("input"); input.type = "radio"; input.name = "kl-timed-duration"; input.value = String(value);
    input.checked = value === duration;
    input.addEventListener("change", () => {
      if (!active() || busy || !input.checked) return;
      duration = value; updatePreview();
    });
    choices.append(element("label", {}, input, element("span", {}, element("strong", { text: name }), element("small", { text: durationHints[name] }))));
  }
  const message = element("p", { className: "kl-cloud-status" });
  message.setAttribute("role", "status");
  body.append(element("p", { className: "kl-timed-scope" }, element("strong", { text: options.label })), status, availability, choices, preview,
    element("p", { text: "Only notifications and badges are quieted. Messages remain available and unread counts are kept. Your other alert settings stay unchanged." }), message);
  const footer = element("footer", { className: "kl-dialog-actions" });
  const keep = muteButton("Keep editing", () => {
    warning.hidden = true; controls.hidden = false; body.inert = false;
    choices.querySelector<HTMLInputElement>("input:checked")?.focus({ preventScroll: true });
  }, true);
  const warning = element("div", { className: "kl-timed-discard" }, element("strong", { text: "Discard this mute selection?" }),
    element("p", { text: "Your saved notification settings stay as they are." }), keep, muteButton("Discard selection", () => { if (!busy) done(); }));
  warning.setAttribute("role", "alert"); warning.hidden = true;
  const dismiss = () => {
    if (busy) return;
    if (!active() || duration === MUTE_DURATIONS[1][1]) { done(); return; }
    warning.hidden = false; controls.hidden = true; body.inert = true; keep.focus({ preventScroll: true });
  };
  const submit = async (until: number) => {
    if (!active() || busy || options.unavailable?.() || !warning.hidden || (until === 0 && !conversationMuted(options.until()))) return;
    busy = true; message.textContent = ""; refresh();
    try { await options.save(until); if (active()) done(); }
    catch (error) { if (active()) message.textContent = error instanceof Error ? error.message : "Could not update notification mute."; }
    finally { busy = false; refresh(); }
  };
  const cancel = muteButton("Cancel", dismiss);
  const unmute = muteButton("Unmute now", () => void submit(0));
  const save = muteButton("Save mute", () => void submit(duration < 0 ? duration : Date.now() + duration), true);
  const controls = element("div", { className: "kl-timed-controls" }, cancel, unmute, save);
  footer.append(controls, warning);
  let previouslyMuted = conversationMuted(options.until());
  function refresh() {
    if (!dialog.element.open || !dialog.body.contains(body)) return;
    if (!options.current()) { dialog.close(); return; }
    const until = options.until();
    const muted = conversationMuted(until);
    const reason = options.unavailable?.();
    status.textContent = muted ? muteDescription(until) : "Not muted";
    availability.hidden = !reason; availability.textContent = reason ?? "";
    previouslyMuted ||= muted;
    unmute.hidden = !previouslyMuted;
    unmute.textContent = muted ? "Unmute now" : "Mute expired";
    unmute.disabled = busy || !muted || Boolean(reason);
    save.disabled = busy || Boolean(reason);
    choices.disabled = busy || Boolean(reason);
    cancel.disabled = busy;
    updatePreview();
  }
  showMuteModal(dialog, "Mute notifications", body, footer, options.panel, () => options.close?.(), dismiss);
  refresh();
  choices.querySelector<HTMLInputElement>("input:checked:not(:disabled)")?.focus({ preventScroll: true });
  return refresh;
}
