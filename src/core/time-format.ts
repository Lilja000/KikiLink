import type { TimeFormatPreference } from "./types";

export type ClockDisplayKind =
  | "time"
  | "conversation"
  | "numeric-date-time"
  | "medium-date-time"
  | "full-seen"
  | "long-date-time"
  | "gallery-expiry"
  | "music-stop"
  | "local-clock-title"
  | "muted-time"
  | "muted-date-time";

let currentTimeFormat: TimeFormatPreference = "12-hour";
type DateStyle = "short" | "medium" | "long" | "full";
type FormatterKind = "time" | "numeric" | "seen" | "long" | `date-${DateStyle}`;
// Only eight shapes in two clock formats; avoid constructing an Intl formatter
// for every row in a transcript or a retained tab. Values and DOM stay uncached.
const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(kind: FormatterKind, format: TimeFormatPreference, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${kind}:${format}`;
  let value = formatters.get(key);
  if (!value) { value = new Intl.DateTimeFormat(undefined, options); formatters.set(key, value); }
  return value;
}
// Cached tabs and popovers can be detached from the deck. Weak references keep
// their clocks current without retaining closed views or repainting media.
const clocks = new Set<WeakRef<HTMLElement>>();
const registeredClocks = new WeakSet<HTMLElement>();
let registrations = 0;

function registerClock(target: HTMLElement): void {
  if (registeredClocks.has(target)) return;
  registeredClocks.add(target);
  clocks.add(new WeakRef(target));
  if (++registrations % 256 === 0)
    for (const ref of clocks) if (!ref.deref()) clocks.delete(ref);
}

const dateOnlyFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

function hourOptions(format: TimeFormatPreference): Intl.DateTimeFormatOptions {
  return format === "12-hour"
    ? { hour: "numeric", minute: "2-digit", hour12: true }
    : { hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
}

export function setTimeFormatPreference(format: TimeFormatPreference): void {
  currentTimeFormat = format;
}

export function getTimeFormatPreference(): TimeFormatPreference {
  return currentTimeFormat;
}

export function formatClockTime(
  value: number | Date,
  format: TimeFormatPreference = currentTimeFormat,
): string {
  return formatter("time", format, hourOptions(format)).format(value);
}

export function formatDateTime(
  value: number | Date,
  dateStyle: DateStyle = "medium",
  format: TimeFormatPreference = currentTimeFormat,
): string {
  return formatter(`date-${dateStyle}`, format, {
    dateStyle,
    timeStyle: "short",
    hourCycle: format === "12-hour" ? "h12" : "h23",
  }).format(value);
}

export function formatNumericDateTime(
  value: number | Date,
  format: TimeFormatPreference = currentTimeFormat,
): string {
  return formatter("numeric", format, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    ...hourOptions(format),
  }).format(value);
}

export function formatFullSeenTime(
  value: number | Date,
  format: TimeFormatPreference = currentTimeFormat,
): string {
  return formatter("seen", format, {
    month: "short",
    day: "numeric",
    ...hourOptions(format),
  }).format(value);
}

export function formatLongDateTime(
  value: number | Date,
  format: TimeFormatPreference = currentTimeFormat,
): string {
  return formatter("long", format, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...hourOptions(format),
  }).format(value);
}

export function formatConversationClock(
  timestamp: number,
  format: TimeFormatPreference = currentTimeFormat,
  now = new Date(),
): string {
  const date = new Date(timestamp);
  return date.toDateString() === now.toDateString()
    ? formatClockTime(date, format)
    : dateOnlyFormatter.format(date);
}

function clockText(timestamp: number, kind: ClockDisplayKind): string {
  switch (kind) {
    case "conversation":
      return formatConversationClock(timestamp);
    case "numeric-date-time":
      return formatNumericDateTime(timestamp);
    case "medium-date-time":
      return formatDateTime(timestamp);
    case "full-seen":
      return formatFullSeenTime(timestamp);
    case "long-date-time":
      return formatLongDateTime(timestamp);
    case "gallery-expiry":
      return `Expires ${formatDateTime(timestamp)}`;
    case "music-stop":
      return `Stops at ${formatClockTime(timestamp)}.`;
    case "local-clock-title":
      return `Local time · ${formatLongDateTime(timestamp)}`;
    case "muted-time":
      return `Muted until ${formatClockTime(timestamp)}`;
    case "muted-date-time":
      return `Muted until ${formatNumericDateTime(timestamp)}`;
    default:
      return formatClockTime(timestamp);
  }
}

export function bindClockText(
  target: HTMLElement,
  timestamp: number,
  kind: ClockDisplayKind = "time",
): HTMLElement {
  registerClock(target);
  target.dataset.klClockAt = String(timestamp);
  target.dataset.klClockKind = kind;
  const text = clockText(timestamp, kind);
  if (target.textContent !== text) target.textContent = text;
  if (typeof HTMLTimeElement !== "undefined" && target instanceof HTMLTimeElement)
    target.dateTime = new Date(timestamp).toISOString();
  return target;
}

export function bindClockTitle(target: HTMLElement, timestamp: number, kind: ClockDisplayKind = "numeric-date-time", syncAriaLabel = false): HTMLElement {
  registerClock(target);
  target.dataset.klClockTitleAt = String(timestamp);
  target.dataset.klClockTitleKind = kind;
  target.dataset.klClockTitleAria = String(syncAriaLabel);
  target.title = clockText(timestamp, kind);
  if (syncAriaLabel) target.setAttribute("aria-label", target.title);
  return target;
}

export function clearClockBinding(target: HTMLElement): void {
  delete target.dataset.klClockAt;
  delete target.dataset.klClockKind;
}

export function clearClockTitleBinding(target: HTMLElement): void {
  delete target.dataset.klClockTitleAt;
  delete target.dataset.klClockTitleKind;
  delete target.dataset.klClockTitleAria;
}

export function refreshClockText(
  root: ParentNode,
  format: TimeFormatPreference = currentTimeFormat,
): void {
  setTimeFormatPreference(format);
  const targets = new Set<HTMLElement>(root.querySelectorAll<HTMLElement>("[data-kl-clock-at], [data-kl-clock-title-at]"));
  if (root instanceof HTMLElement) targets.add(root);
  for (const ref of clocks) {
    const target = ref.deref();
    if (target) targets.add(target); else clocks.delete(ref);
  }
  for (const target of targets) {
    const at = Number(target.dataset.klClockAt);
    if (Number.isFinite(at)) bindClockText(target, at, (target.dataset.klClockKind as ClockDisplayKind | undefined) ?? "time");
    const timestamp = Number(target.dataset.klClockTitleAt);
    if (Number.isFinite(timestamp)) bindClockTitle(target, timestamp,
      (target.dataset.klClockTitleKind as ClockDisplayKind | undefined) ?? "numeric-date-time",
      target.dataset.klClockTitleAria === "true");
  }
}
