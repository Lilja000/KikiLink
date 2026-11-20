/** Dates are a local presentation of saved timestamps, never a history migration. */
export function localDay(timestamp: number): string {
  const d = new Date(timestamp);
  return Number.isFinite(d.getTime()) ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : "";
}

const fullDate = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "numeric" });
const compactDate = new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric" });

export function syncDateSeparators(
  container: HTMLElement,
  selector = "[data-message-time]",
  display: "full" | "compact" = "full",
): void {
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
    date.title = fullDate.format(timestamp);
    date.textContent = display === "compact" ? compactDate.format(timestamp) : date.title;
    separator.setAttribute("aria-label", date.title); separator.append(date);
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
