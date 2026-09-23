import { element } from "../../utils/dom";
/** The Players badge geometry and number formatting, reused on every navigation button. */
export function countBadge(): HTMLSpanElement {
  const badge = element("span", { className: "kl-roster-count" }); badge.hidden = true; return badge;
}
export function updateBadge(badge: HTMLElement, count: number): void {
  const value = Math.max(0, Math.floor(count)); badge.hidden = value === 0; badge.textContent = value > 99 ? "99+" : String(value);
}
