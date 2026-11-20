import { element } from "../../utils/dom";
import { fitPanelDialog } from "../platform-shell/panel-dialog-layout";
import type { ContentDialog } from "./content-dialog";

interface Position {
  x: number;
  y: number;
}

interface PositionEditor {
  title: string;
  position: Position;
  icon: Node;
  note: string;
  windowMarker?: boolean;
  placeInRoom: (() => void) | undefined;
  save(position: Position): void;
}

export function openLayoutPositionEditor(dialog: ContentDialog, panel: HTMLElement, options: PositionEditor): void {
  // Keep an untouched coordinate at its stored precision, including positions set by dragging.
  const draft = { ...options.position };
  const marker = element("span", { className: options.windowMarker ? "kl-position-marker kl-position-window" : "kl-position-marker" }, options.icon);
  const controls = element("div", { className: "kl-position-controls" });
  for (const axis of ["x", "y"] as const) {
    const label = axis === "x" ? "Horizontal" : "Vertical";
    const property = axis === "x" ? "left" : "top";
    const slider = element("input", { ariaLabel: label });
    slider.type = "range";
    slider.min = "0";
    slider.max = "100";
    slider.step = "0.5";
    slider.value = String(draft[axis] * 100);
    marker.style[property] = draft[axis] * 100 + "%";
    slider.addEventListener("input", () => {
      draft[axis] = slider.valueAsNumber / 100;
      marker.style[property] = slider.value + "%";
    });
    controls.append(element("label", {}, label, slider));
  }
  const error = element("p", { className: "kl-setting-help" });
  error.setAttribute("role", "alert");
  const cancel = element("button", { type: "button", className: "kl-text-button", text: "Cancel", onClick: () => dialog.close() });
  const save = element("button", { type: "button", className: "kl-text-button kl-text-button--primary", text: "Save position", onClick: () => {
    if (!dialog.element.open || !dialog.body.contains(save)) return;
    try { options.save(draft); }
    catch { error.textContent = "Couldn’t save on this device. Free some browser storage and retry."; return; }
    dialog.close();
  } });
  const place = options.placeInRoom;
  const body = element("div", { className: "kl-position-editor" },
    element("div", { className: "kl-position-fields" },
      element("div", { className: "kl-position-preview", ariaLabel: "Game canvas preview" },
        element("small", { text: "Game canvas preview" }),
        element("div", { className: options.windowMarker ? "kl-position-travel kl-position-travel-window" : "kl-position-travel" }, marker)),
      controls, element("p", { className: "kl-setting-help", text: options.note }), error),
    element("footer", { className: "kl-dialog-actions" },
      place ? element("button", { type: "button", className: "kl-text-button", text: "Place in room", onClick: () => { dialog.close(); place(); } }) : null,
      cancel, save));
  let release: (() => void) | undefined;
  dialog.show(options.title, body, () => {
    release?.();
    for (const property of ["inset", "max-width", "max-height", "--kl-dialog-viewport-height"]) dialog.element.style.removeProperty(property);
  });
  release = fitPanelDialog(dialog.element, { panel });
}
