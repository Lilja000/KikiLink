/** Dates are a local presentation of saved timestamps, never a history migration. */
export function localDay(timestamp: number): string {
  const d = new Date(timestamp);
  return Number.isFinite(d.getTime()) ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : "";
}

export function syncDateSeparators(container: HTMLElement, selector = "[data-message-time]"): void {
  for (const separator of container.querySelectorAll(":scope > .kl-date-separator")) separator.remove();
  let previous = "";
  // Bounded to the displayed page; this never traverses the stored history.
  for (const row of container.querySelectorAll<HTMLElement>(selector)) {
    const timestamp = Number(row.dataset.messageTime), day = localDay(timestamp);
    row.dataset.day = day;
    if (!day || day === previous) continue;
    previous = day;
    const separator = document.createElement("div");
    separator.className = "kl-date-separator"; separator.setAttribute("role", "separator");
    const date = document.createElement("time"); date.dateTime = new Date(timestamp).toISOString();
    date.textContent = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "numeric" }).format(timestamp);
    separator.setAttribute("aria-label", date.textContent); separator.append(date);
    row.before(separator);
  }
}

export const DATE_SEPARATOR_STYLES = `
.kl-date-separator { display:flex; align-items:center; gap:10px; color:var(--kl-muted, #aaa);
  margin:14px 0 8px; font-size:11px; line-height:1.4; flex:none; clear:both; }
.kl-date-separator::before, .kl-date-separator::after { content:""; flex:1; height:1px;
  background:currentColor; opacity:.18; }
.kl-date-separator time { flex:none; max-width:80%; text-align:center; }
`;
