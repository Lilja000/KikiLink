import type { LinkMessage } from "../../core/types";

export type MessageReceiptState = "sent" | "read";

// The transport keeps recipient delivery separate from server acceptance.
// Both confirmed states show one check; only a read receipt shows two.
export function directReceiptState(delivery: LinkMessage["delivery"]): MessageReceiptState | undefined {
  if (delivery === "read") return "read";
  if (delivery === "sent" || delivery === "delivered") return "sent";
  return undefined;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function checkPath(path: string, className: string): SVGPathElement {
  const node = document.createElementNS(SVG_NS, "path");
  node.setAttribute("d", path);
  node.setAttribute("class", className);
  return node;
}

export function messageReceiptIndicator(
  state?: MessageReceiptState,
  readLabel = "Read",
): HTMLSpanElement {
  const indicator = document.createElement("span");
  indicator.className = "kl-message-receipt";
  const svg = document.createElementNS(SVG_NS, "svg");
  // Fit the strokes to the clock's cap height without changing the stamp slot.
  svg.setAttribute("viewBox", "0 1 20 10");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  // Narrow both checks and their spacing by 10% around the shared trailing
  // tip. Keep the height and the shorter entry stroke on the second read check.
  svg.append(
    checkPath("M5.3 6.7 8 10 14.03 1.6", "kl-message-receipt-left"),
    checkPath("M10.07 6.7 12.77 10 18.8 1.6", "kl-message-receipt-right"),
    checkPath("M11.6 8.7 12.77 10 18.8 1.6", "kl-message-receipt-read-right"),
  );
  indicator.append(svg);
  updateMessageReceipt(indicator, state, readLabel);
  return indicator;
}

export function updateMessageReceipt(
  indicator: HTMLElement,
  state?: MessageReceiptState,
  readLabel = "Read",
): void {
  indicator.dataset.state = state ?? "pending";
  if (!state) {
    indicator.setAttribute("aria-hidden", "true");
    indicator.removeAttribute("role");
    indicator.removeAttribute("aria-label");
    indicator.removeAttribute("title");
    return;
  }
  const label = state === "read" ? readLabel : "Sent to Cloud";
  indicator.removeAttribute("aria-hidden");
  indicator.setAttribute("role", "img");
  indicator.setAttribute("aria-label", label);
  indicator.title = label;
}
