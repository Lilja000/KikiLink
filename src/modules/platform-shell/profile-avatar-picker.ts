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
  readonly #ranges: readonly [HTMLInputElement, HTMLInputElement, HTMLInputElement];
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
    const range = (label: string, min: number, max: number, step: number, value: number): HTMLInputElement => {
      const control = element("input", { ariaLabel: label });
      control.type = "range"; control.min = String(min); control.max = String(max);
      control.step = String(step); control.defaultValue = String(value);
      const output = element("output");
      control.addEventListener("input", () => { this.#updateRange(control); onChange(); });
      this.framing.append(element("label", { className: "kl-profile-avatar-range" },
        element("span", { text: label }), output, control));
      return control;
    };
    this.#ranges = [range("Horizontal position", 0, 100, 1, 50), range("Vertical position", 0, 100, 1, 50), range("Zoom", 1, 2, 0.05, 1)];
    this.framing.append(element("p", { className: "kl-custom-field-help", text: "Saving keeps the framed square as your new avatar." }));
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

  #updateRange(input: HTMLInputElement): void {
    const output = input.previousElementSibling;
    if (output) output.textContent = input.min === "1" ? `${input.valueAsNumber.toFixed(2)}×` : `${input.value}%`;
  }

  reset(): void {
    this.#background = undefined;
    for (const range of this.#ranges) {
      range.value = range.defaultValue;
      this.#updateRange(range);
    }
  }

  get edit(): ProfileAvatarEdit | undefined {
    const source = this.editor.avatarSource;
    const preset = typeof source !== "string" && this.#draftPresets.has(source);
    if ((source === "initials" || preset) && this.#background)
      return { kind: "background", colors: this.#background.colors, initial: this.#initial.textContent ?? "?" };
    if (source === "image" || (typeof source !== "string" && !preset)) {
      const [horizontal, vertical, magnification] = this.#ranges;
      const x = horizontal.valueAsNumber, y = vertical.valueAsNumber, zoom = magnification.valueAsNumber;
      if (x !== 50 || y !== 50 || zoom !== 1) return { kind: "framing", x, y, zoom };
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
