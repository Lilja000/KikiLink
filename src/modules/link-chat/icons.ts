const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export type KikiLinkIconName =
  | "activities"
  | "appearance"
  | "back"
  | "chat"
  | "check"
  | "close"
  | "copy"
  | "edit"
  | "external"
  | "home"
  | "id"
  | "image"
  | "location"
  | "lock"
  | "more"
  | "music"
  | "navigation"
  | "next"
  | "note"
  | "pin"
  | "play"
  | "pause"
  | "previous"
  | "plus"
  | "profile"
  | "reactions"
  | "refresh"
  | "reply"
  | "search"
  | "send"
  | "settings"
  | "star"
  | "status"
  | "trash"
  | "unread"
  | "users"
  | "warning"
  | "whisper";

type ShapeName = "circle" | "line" | "path" | "polyline" | "rect";
type Shape = readonly [ShapeName, Readonly<Record<string, string>>, fillable?: boolean];

// KikiLink's icons deliberately use the same rounded, slightly asymmetrical line language.
// They are drawn here from simple geometry so the addon owns the set and ships no icon library.
const ICONS: Record<KikiLinkIconName, readonly Shape[]> = {
  activities: [
    ["path", { d: "M12 3.2c.5 3.1 2.1 4.7 5.2 5.2-3.1.5-4.7 2.1-5.2 5.2-.5-3.1-2.1-4.7-5.2-5.2 3.1-.5 4.7-2.1 5.2-5.2Z" }, true],
    ["path", { d: "M18.2 14.2c.25 1.55 1.05 2.35 2.6 2.6-1.55.25-2.35 1.05-2.6 2.6-.25-1.55-1.05-2.35-2.6-2.6 1.55-.25 2.35-1.05 2.6-2.6Z" }, true],
    ["path", { d: "M5.7 14.8c.22 1.35.93 2.06 2.28 2.28-1.35.22-2.06.93-2.28 2.28-.22-1.35-.93-2.06-2.28-2.28 1.35-.22 2.06-.93 2.28-2.28Z" }, true],
  ],
  appearance: [
    ["path", { d: "M12 3.2a8.8 8.8 0 1 0 0 17.6c1.4 0 2.1-.75 2.1-1.62 0-.52-.25-.95-.25-1.52 0-1.1.82-1.72 1.92-1.72h1.38c2.22 0 3.65-1.48 3.65-3.74A8.8 8.8 0 0 0 12 3.2Z" }],
    ["circle", { cx: "7.4", cy: "10.1", r: "0.9" }, true],
    ["circle", { cx: "10.1", cy: "6.9", r: "0.9" }, true],
    ["circle", { cx: "14.2", cy: "6.8", r: "0.9" }, true],
  ],
  back: [
    ["path", { d: "m10.2 5.2-6.8 6.8 6.8 6.8" }],
    ["line", { x1: "4", y1: "12", x2: "20.5", y2: "12" }],
  ],
  chat: [
    ["path", { d: "M4.1 5.2h15.8v10.3H10l-5.3 3.4 1-3.4H4.1V5.2Z" }],
    ["line", { x1: "8", y1: "9.1", x2: "16", y2: "9.1" }],
    ["line", { x1: "8", y1: "12.6", x2: "13.5", y2: "12.6" }],
  ],
  check: [["polyline", { points: "4.5 12.5 9.5 17.2 19.8 6.8" }]],
  close: [
    ["line", { x1: "5.5", y1: "5.5", x2: "18.5", y2: "18.5" }],
    ["line", { x1: "18.5", y1: "5.5", x2: "5.5", y2: "18.5" }],
  ],
  copy: [
    ["rect", { x: "8", y: "7.5", width: "11.5", height: "12", rx: "2.2" }],
    ["path", { d: "M16 7.5V6.7a2.2 2.2 0 0 0-2.2-2.2H6.7a2.2 2.2 0 0 0-2.2 2.2v7.1A2.2 2.2 0 0 0 6.7 16H8" }],
  ],
  edit: [
    ["path", { d: "m5 16.7-.7 3 3-.7L18.8 7.5l-2.3-2.3L5 16.7Z" }],
    ["line", { x1: "14.5", y1: "7.2", x2: "16.8", y2: "9.5" }],
  ],
  external: [
    ["path", { d: "M13 4.5h6.5V11" }],
    ["line", { x1: "19", y1: "5", x2: "11", y2: "13" }],
    ["path", { d: "M10 6H6.5a2 2 0 0 0-2 2v9.5a2 2 0 0 0 2 2H16a2 2 0 0 0 2-2V14" }],
  ],
  home: [
    ["path", { d: "m3.4 10.5 8.6-7 8.6 7" }],
    ["path", { d: "M5.7 9.2v10.3h12.6V9.2" }],
    ["path", { d: "M10 19.5v-5.8h4v5.8" }],
  ],
  id: [
    ["line", { x1: "9", y1: "4.5", x2: "7", y2: "19.5" }],
    ["line", { x1: "17", y1: "4.5", x2: "15", y2: "19.5" }],
    ["line", { x1: "4.5", y1: "9", x2: "19.5", y2: "9" }],
    ["line", { x1: "3.8", y1: "15", x2: "18.8", y2: "15" }],
  ],
  image: [
    ["rect", { x: "3.5", y: "4.5", width: "17", height: "15", rx: "2.6" }],
    ["circle", { cx: "8.4", cy: "9.2", r: "1.45" }],
    ["path", { d: "m5.2 17 4.3-4.4 3.2 3 2.6-2.5 3.5 3.9" }],
  ],
  location: [
    ["path", { d: "M12 21s6.2-5.8 6.2-11A6.2 6.2 0 1 0 5.8 10C5.8 15.2 12 21 12 21Z" }],
    ["circle", { cx: "12", cy: "10", r: "2.1" }],
  ],
  lock: [
    ["rect", { x: "5", y: "10", width: "14", height: "10", rx: "2.3" }],
    ["path", { d: "M8 10V7.5a4 4 0 0 1 8 0V10" }],
    ["line", { x1: "12", y1: "14", x2: "12", y2: "16.5" }],
  ],
  more: [
    ["circle", { cx: "5.3", cy: "12", r: "1" }, true],
    ["circle", { cx: "12", cy: "12", r: "1" }, true],
    ["circle", { cx: "18.7", cy: "12", r: "1" }, true],
  ],
  music: [
    ["path", { d: "M9 18V6.7l10-2v10.8" }],
    ["circle", { cx: "6.4", cy: "18.2", r: "2.6" }],
    ["circle", { cx: "16.4", cy: "15.7", r: "2.6" }],
    ["line", { x1: "9", y1: "10", x2: "19", y2: "8" }],
  ],
  navigation: [
    ["circle", { cx: "12", cy: "12", r: "8.5" }],
    ["path", { d: "m15.7 8.3-2.1 5.3-5.3 2.1 2.1-5.3 5.3-2.1Z" }, true],
  ],
  next: [
    ["path", { d: "m5.5 5 9 7-9 7V5Z" }, true],
    ["line", { x1: "18.5", y1: "5", x2: "18.5", y2: "19" }],
  ],
  note: [
    ["path", { d: "M6 3.8h9.2L19 7.6v12.6H6V3.8Z" }],
    ["path", { d: "M15 3.8v4h4" }],
    ["line", { x1: "9", y1: "12", x2: "16", y2: "12" }],
    ["line", { x1: "9", y1: "15.5", x2: "14", y2: "15.5" }],
  ],
  pin: [
    ["path", { d: "m8 4 8 0-1.5 5 3 3H6.5l3-3L8 4Z" }, true],
    ["line", { x1: "12", y1: "12", x2: "12", y2: "20" }],
  ],
  play: [["path", { d: "m7 4.5 12 7.5-12 7.5v-15Z" }, true]],
  pause: [
    ["rect", { x: "6", y: "4.5", width: "4.2", height: "15", rx: "1" }, true],
    ["rect", { x: "13.8", y: "4.5", width: "4.2", height: "15", rx: "1" }, true],
  ],
  previous: [
    ["path", { d: "m18.5 5-9 7 9 7V5Z" }, true],
    ["line", { x1: "5.5", y1: "5", x2: "5.5", y2: "19" }],
  ],
  plus: [
    ["line", { x1: "12", y1: "4.5", x2: "12", y2: "19.5" }],
    ["line", { x1: "4.5", y1: "12", x2: "19.5", y2: "12" }],
  ],
  profile: [
    ["rect", { x: "3.5", y: "5", width: "17", height: "14", rx: "2.4" }],
    ["circle", { cx: "8.5", cy: "10.2", r: "2.1" }],
    ["path", { d: "M5.8 16c.55-1.75 1.55-2.6 2.7-2.6s2.15.85 2.7 2.6" }],
    ["line", { x1: "14", y1: "9", x2: "18", y2: "9" }],
    ["line", { x1: "14", y1: "13", x2: "18", y2: "13" }],
  ],
  reactions: [
    ["path", { d: "M6.2 16.7h11.6l-1.5-2.2V10a4.3 4.3 0 0 0-8.6 0v4.5l-1.5 2.2Z" }],
    ["path", { d: "M10 19a2.3 2.3 0 0 0 4 0" }],
    ["line", { x1: "12", y1: "3.1", x2: "12", y2: "5.2" }],
  ],
  refresh: [
    ["path", { d: "M19.2 8.4A7.7 7.7 0 0 0 5.6 6.2L3.7 8.4" }],
    ["polyline", { points: "3.7 4.7 3.7 8.4 7.5 8.4" }],
    ["path", { d: "M4.8 15.6a7.7 7.7 0 0 0 13.6 2.2l1.9-2.2" }],
    ["polyline", { points: "20.3 19.3 20.3 15.6 16.5 15.6" }],
  ],
  reply: [
    ["polyline", { points: "9.5 7 4.2 11.7 9.5 16.4" }],
    ["path", { d: "M5 11.7h7.4c4.6 0 7.1 2.25 7.1 6.3" }],
  ],
  search: [
    ["circle", { cx: "10.5", cy: "10.5", r: "6.2" }],
    ["line", { x1: "15.1", y1: "15.1", x2: "20", y2: "20" }],
  ],
  send: [
    ["path", { d: "m3.5 4.2 17 7.8-17 7.8 2.7-6.1L15 12l-8.8-1.7-2.7-6.1Z" }, true],
  ],
  settings: [
    ["line", { x1: "4", y1: "6.5", x2: "20", y2: "6.5" }],
    ["circle", { cx: "9", cy: "6.5", r: "2" }],
    ["line", { x1: "4", y1: "12", x2: "20", y2: "12" }],
    ["circle", { cx: "15", cy: "12", r: "2" }],
    ["line", { x1: "4", y1: "17.5", x2: "20", y2: "17.5" }],
    ["circle", { cx: "11", cy: "17.5", r: "2" }],
  ],
  star: [["path", { d: "m12 3.3 2.65 5.35 5.9.86-4.28 4.16 1.01 5.88L12 16.77l-5.28 2.78 1.01-5.88-4.28-4.16 5.9-.86L12 3.3Z" }, true]],
  status: [
    ["circle", { cx: "12", cy: "12", r: "8" }],
    ["circle", { cx: "12", cy: "12", r: "2.4" }, true],
  ],
  trash: [
    ["path", { d: "M5.5 7h13l-1 13h-11l-1-13Z" }],
    ["line", { x1: "4", y1: "7", x2: "20", y2: "7" }],
    ["path", { d: "M9 7V4.5h6V7" }],
    ["line", { x1: "10", y1: "10.5", x2: "10.5", y2: "17" }],
    ["line", { x1: "14", y1: "10.5", x2: "13.5", y2: "17" }],
  ],
  unread: [
    ["circle", { cx: "12", cy: "12", r: "8" }],
    ["circle", { cx: "12", cy: "12", r: "2.2" }, true],
  ],
  users: [
    ["circle", { cx: "9", cy: "8.5", r: "3" }],
    ["path", { d: "M3.8 19c.65-3.7 2.35-5.4 5.2-5.4s4.55 1.7 5.2 5.4" }],
    ["path", { d: "M15.1 6.2a2.8 2.8 0 0 1 0 5.3" }],
    ["path", { d: "M16 14c2.35.35 3.65 1.95 4.2 5" }],
  ],
  warning: [
    ["path", { d: "M12 3.5 21 20H3L12 3.5Z" }],
    ["line", { x1: "12", y1: "9", x2: "12", y2: "14" }],
    ["circle", { cx: "12", cy: "17", r: "0.8" }, true],
  ],
  whisper: [
    ["path", { d: "M4 5.5h16v10H9.8L5 18.8l.8-3.3H4v-10Z" }],
    ["path", { d: "M8 11.8c1.1-1.7 2.35-2.55 4-2.55s2.9.85 4 2.55" }],
  ],
};

export function kikiIcon(
  name: KikiLinkIconName,
  className = "kl-icon",
  filled = false,
): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", className === "kl-icon" ? className : `kl-icon ${className}`);
  if (filled) svg.dataset.filled = "true";

  for (const [shapeName, attributes, fillable] of ICONS[name]) {
    const shape = document.createElementNS(SVG_NAMESPACE, shapeName);
    for (const [attribute, value] of Object.entries(attributes)) {
      shape.setAttribute(attribute, value);
    }
    if (fillable) shape.classList.add("kl-icon-fill");
    svg.append(shape);
  }
  return svg;
}
