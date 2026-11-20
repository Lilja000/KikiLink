import { element } from "../../utils/dom";
import { ContentDialog } from "../link-chat/content-dialog";
import { fitPanelDialog } from "./panel-dialog-layout";

interface PinPreview { author: string; text: string }

export function openConversationContext(dialog: ContentDialog, panel: HTMLElement, options: {
  current(): boolean;
  topic?: { name: string; description: string; actionLabel: string; open(): void; pins(): Promise<PinPreview[]> };
  settings(): void;
  subscribe?(check: () => void): () => void;
}): void {
  if (!options.current()) return;
  const body = element("section", { className: "kl-thread-context" });
  const active = () => dialog.element.open && dialog.body.contains(body);
  const go = (action: () => void) => { if (active() && options.current()) { dialog.close(); action(); } };
  const pins = element("div");
  const topic = options.topic;
  if (topic) body.append(element("h3", { text: topic.name }), element("p", { text: topic.description }),
    element("button", { type: "button", className: "kl-text-button", text: topic.actionLabel, onClick: () => go(topic.open) }),
    element("hr"), element("h3", { text: "Pinned messages" }), pins);
  body.append(element("button", { type: "button", className: "kl-thread-settings", text: "Messaging settings", onClick: () => go(options.settings) }));
  let cleanup: (() => void) | undefined, unsubscribe: (() => void) | undefined;
  dialog.show("Your conversations", body, () => {
    cleanup?.(); unsubscribe?.(); delete dialog.element.dataset.chatContextNarrow;
    for (const name of ["inset", "max-width", "max-height", "--kl-dialog-viewport-height"]) dialog.element.style.removeProperty(name);
  });
  cleanup = fitPanelDialog(dialog.element, { panel, layout: (width, height) => {
    dialog.element.toggleAttribute("data-chat-context-narrow", width <= 700 || width <= 900 && height <= 500);
    return { marginX: 0, marginY: 0 };
  } });
  const check = () => { if (active() && !options.current()) dialog.close(); };
  unsubscribe = options.subscribe?.(check);
  if (!topic) return;
  pins.textContent = "Loading…";
  void topic.pins().then(rows => {
    check(); if (!active()) return;
    pins.replaceChildren(...(rows.length ? rows.map(row => element("article", { className: "kl-thread-context-pin" },
      element("strong", { text: row.author }), element("p", { text: row.text }))) : [element("p", { text: "No pinned messages" })]));
  }).catch(() => { check(); if (active()) pins.textContent = "Could not load pinned messages."; });
}
