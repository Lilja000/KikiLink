import { element } from "../../utils/dom";
import { kikiIcon } from "./icons";

/** The same controls and clipboard path for native Direct and Cloud group messages. */
export function messageActions(reply: () => void, copy: () => Promise<void>, onError: (error: unknown) => void): HTMLDivElement {
  const actions = element("div", { className: "kl-message-side-actions", ariaLabel: "Message actions" });
  actions.setAttribute("role", "group");
  const copyButton = element("button", { className: "kl-message-action", type: "button", title: "Copy message",
    ariaLabel: "Copy message", onClick: () => {
      copyButton.disabled = true;
      copyButton.title = "Copy message"; copyButton.replaceChildren(kikiIcon("copy"));
      void copy().then(() => {
        copyButton.title = "Message copied";
        copyButton.replaceChildren(kikiIcon("check"));
      }).catch(onError).finally(() => { copyButton.disabled = false; });
    } }, kikiIcon("copy"));
  actions.append(
    element("button", { className: "kl-message-action", type: "button", title: "Quote this message in your reply",
      ariaLabel: "Reply to message", onClick: reply }, kikiIcon("reply")),
    copyButton,
  );
  return actions;
}

export async function copyMessageText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return; }
  const focus = document.activeElement?.shadowRoot?.activeElement ?? document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = value; textarea.style.position = "fixed"; textarea.style.opacity = "0";
  document.body.append(textarea);
  try {
    textarea.select();
    if (!document.execCommand("copy")) throw new Error("Clipboard unavailable");
  } finally { textarea.remove(); if (focus instanceof HTMLElement) focus.focus({ preventScroll: true }); }
}

export function shouldSendMessage(event: KeyboardEvent, enterToSend: boolean): boolean {
  return event.key === "Enter" && !event.isComposing &&
    (event.ctrlKey || event.metaKey || (enterToSend && !event.shiftKey && !event.altKey));
}
