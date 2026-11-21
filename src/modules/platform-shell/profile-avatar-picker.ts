import type { CloudProfileEditor } from "../../cloud/profile-editor";
import type { ProfileAvatarEdit } from "../link-chat/image-upload";
import { element } from "../../utils/dom";
import blossom from "../../../design/profile-avatars/blossom.webp";
import goldBlossom from "../../../design/profile-avatars/gold-blossom.webp";
import willow from "../../../design/profile-avatars/willow.webp";
import ember from "../../../design/profile-avatars/ember.webp";
import sage from "../../../design/profile-avatars/sage.webp";
import rose from "../../../design/profile-avatars/rose.webp";
import ash from "../../../design/profile-avatars/ash.webp";

const avatars = [
  { label: "Blossom", image: blossom },
  { label: "Gold Blossom", image: goldBlossom },
  { label: "Willow", image: willow },
  { label: "Ember", image: ember },
  { label: "Sage", image: sage },
  { label: "Rose", image: rose },
  { label: "Ash", image: ash },
];

const backgrounds = [
  { label: "Velvet", colors: ["#3c242a", "#1b1618"] },
  { label: "Ember", colors: ["#4a2927", "#201716"] },
  { label: "Warm gold", colors: ["#473923", "#201c15"] },
  { label: "Charcoal", colors: ["#2c2c32", "#17171c"] },
] as const;
type Background = typeof backgrounds[number];
const backgroundPaint = (background: Background) => `linear-gradient(140deg, ${background.colors[0]}, ${background.colors[1]})`;

/** Presets are ordinary profile images and use the same review/save path as a file. */
export class ProfileAvatarPicker {
  readonly element = element("div", { className: "kl-profile-choice-grid kl-profile-avatar-choices", ariaLabel: "Avatar source" });
  readonly framing = element("section", { className: "kl-profile-avatar-framing" });
  readonly backgrounds = element("section", { className: "kl-profile-avatar-backgrounds" });
  readonly #initial = element("span", { className: "kl-profile-avatar-swatch" });
  readonly #buttons = new Map<string, HTMLButtonElement>();
  readonly #backgroundButtons = new Map<Background, HTMLButtonElement>();
  readonly #draftPresets = new WeakMap<File, string>();
  readonly #crop = element("div", { className: "kl-profile-avatar-crop", ariaLabel: "Avatar position. Drag or use the arrow keys." });
  readonly #photo = element("img", { alt: "" });
  readonly #zoomIn = element("button", { type: "button", className: "kl-text-button", text: "+", ariaLabel: "Zoom in" });
  readonly #zoomOut = element("button", { type: "button", className: "kl-text-button", text: "−", ariaLabel: "Zoom out" });
  #position = { x: 50, y: 50, zoom: 1 };
  #background: Background | undefined;

  constructor(readonly editor: CloudProfileEditor, readonly onChange: () => void) {
    this.element.setAttribute("role", "group");
    this.#initial.setAttribute("aria-hidden", "true");
    this.#add("Initials", this.#initial, () => {
      if (editor.avatarSource === "initials") return;
      const background = this.#background;
      editor.remove("avatar");
      this.#background = background;
      this.onChange();
    });
    for (const { label, image } of avatars) {
      this.#add(label, element("img", { className: "kl-profile-avatar-swatch", src: image, alt: "" }), () => {
        const source = editor.avatarSource;
        if (typeof source !== "string" && this.#draftPresets.get(source) === label) return;
        const bytes = Uint8Array.from(atob(image.slice(image.indexOf(",") + 1)), char => char.charCodeAt(0));
        const file = new File([bytes], `${label.toLowerCase().replaceAll(" ", "-")}.webp`, { type: "image/webp" });
        this.#draftPresets.set(file, label);
        const background = this.#background;
        editor.choose("avatar", file, false);
        this.#background = background;
        this.onChange();
      });
    }
    const center = element("button", { type: "button", className: "kl-text-button", text: "Centre", onClick: () => { this.reset(); onChange(); } });
    this.framing.append(element("div", { className: "kl-profile-avatar-adjust-heading" }, element("h3", { text: "Framing" }), center));
    this.#crop.tabIndex = 0;
    this.#photo.draggable = false;
    this.#crop.append(this.#photo);
    this.framing.append(this.#crop, element("div", { className: "kl-profile-avatar-zoom" }, this.#zoomOut, this.#zoomIn));
    const zoom = (step: number) => {
      this.#position.zoom = Math.min(2, Math.max(1, Math.round((this.#position.zoom + step) * 10) / 10));
      onChange();
    };
    this.#zoomIn.addEventListener("click", () => zoom(.1));
    this.#zoomOut.addEventListener("click", () => zoom(-.1));
    let drag: { pointer: number; x: number; y: number; cropX: number; cropY: number } | undefined;
    this.#crop.addEventListener("pointerdown", event => {
      if (!event.isPrimary || event.button !== 0 || !this.#photo.naturalWidth) return;
      drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY, cropX: this.#position.x, cropY: this.#position.y };
      this.#crop.setPointerCapture(event.pointerId);
    });
    this.#crop.addEventListener("pointermove", event => {
      if (!drag || drag.pointer !== event.pointerId) return;
      const side = this.#crop.getBoundingClientRect().width;
      const scale = this.#position.zoom * side / Math.min(this.#photo.naturalWidth, this.#photo.naturalHeight);
      const shift = (origin: number, distance: number, span: number) => span > .01 ? Math.min(100, Math.max(0, origin - distance / span * 100)) : 50;
      this.#position.x = shift(drag.cropX, event.clientX - drag.x, this.#photo.naturalWidth * scale - side);
      this.#position.y = shift(drag.cropY, event.clientY - drag.y, this.#photo.naturalHeight * scale - side);
      onChange();
    });
    this.#crop.addEventListener("lostpointercapture", () => { drag = undefined; });
    this.#crop.addEventListener("keydown", event => {
      const step = event.shiftKey ? 10 : 2;
      const { x, y } = this.#position;
      if (event.key === "ArrowLeft") this.#position.x = Math.max(0, x - step);
      else if (event.key === "ArrowRight") this.#position.x = Math.min(100, x + step);
      else if (event.key === "ArrowUp") this.#position.y = Math.max(0, y - step);
      else if (event.key === "ArrowDown") this.#position.y = Math.min(100, y + step);
      else return;
      event.preventDefault();
      onChange();
    });
    const palette = element("div", { className: "kl-profile-choice-grid", ariaLabel: "Avatar background colour" });
    palette.setAttribute("role", "group");
    for (const background of backgrounds) {
      const swatch = element("span", { className: "kl-profile-avatar-background-swatch" });
      swatch.style.background = backgroundPaint(background);
      const button = element("button", { type: "button", className: "kl-profile-choice", onClick: () => {
        this.#background = this.#background === background ? undefined : background;
        onChange();
      } }, swatch, element("span", { text: background.label }));
      this.#backgroundButtons.set(background, button);
      palette.append(button);
    }
    this.backgrounds.append(element("h3", { text: "Avatar background" }), palette);
    this.reset();
    this.framing.hidden = this.backgrounds.hidden = true;
  }

  #add(label: string, image: HTMLElement, onClick: () => void): void {
    const button = element("button", { type: "button", className: "kl-profile-choice", onClick }, image, element("span", { text: label }));
    this.#buttons.set(label, button);
    this.element.append(button);
  }

  focusFraming(): void {
    this.#crop.focus();
  }

  reset(): void {
    this.#background = undefined;
    this.#position = { x: 50, y: 50, zoom: 1 };
  }

  get edit(): ProfileAvatarEdit | undefined {
    const source = this.editor.avatarSource;
    const preset = typeof source !== "string" && this.#draftPresets.has(source);
    if ((source === "initials" || preset) && this.#background)
      return { kind: "background", colors: this.#background.colors, initial: this.#initial.textContent ?? "?" };
    if (source === "image" || (typeof source !== "string" && !preset)) {
      const { x, y, zoom } = this.#position;
      if (typeof source !== "string" || x !== 50 || y !== 50 || zoom !== 1) return { kind: "framing", x, y, zoom };
    }
    return undefined;
  }

  update(name: string, preview: HTMLElement): void {
    this.#initial.textContent = Array.from(name.trim())[0]?.toLocaleUpperCase() ?? "?";
    const source = this.editor.avatarSource;
    const selected = source === "initials" ? "Initials" : typeof source !== "string" ? this.#draftPresets.get(source) : undefined;
    for (const [label, button] of this.#buttons) button.setAttribute("aria-pressed", String(label === selected));
    const edit = this.edit;
    this.framing.hidden = source === "initials" || source === "link" || selected !== undefined;
    const photo = !this.framing.hidden && preview.querySelector("img")?.getAttribute("src");
    if (photo && photo.startsWith("blob:")) {
      if (this.#photo.getAttribute("src") !== photo) this.#photo.src = photo;
    } else this.#photo.removeAttribute("src");
    const { x, y, zoom } = this.#position;
    this.#crop.style.setProperty("--kl-avatar-framing-position", `${x}% ${y}%`);
    this.#crop.style.setProperty("--kl-avatar-framing-zoom", String(zoom));
    this.#zoomIn.disabled = zoom >= 2;
    this.#zoomOut.disabled = zoom <= 1;
    this.backgrounds.hidden = selected === undefined;
    for (const [background, button] of this.#backgroundButtons)
      button.setAttribute("aria-pressed", String(this.#background === background));
    preview.dataset.avatarEdit = edit?.kind ?? "";
    if (edit?.kind === "framing") {
      const clipCoordinate = (position: number) => `${position + (50 - position) / edit.zoom}%`;
      preview.style.setProperty("--kl-avatar-framing-position", `${edit.x}% ${edit.y}%`);
      preview.style.setProperty("--kl-avatar-framing-zoom", String(edit.zoom));
      preview.style.setProperty("--kl-avatar-framing-clip", `circle(${50 / edit.zoom}% at ${clipCoordinate(edit.x)} ${clipCoordinate(edit.y)})`);
    }
    if (edit?.kind === "background" && this.#background) {
      preview.style.setProperty("--kl-avatar-backdrop", backgroundPaint(this.#background));
      this.#initial.style.background = backgroundPaint(this.#background);
    } else this.#initial.style.removeProperty("background");
  }
}
