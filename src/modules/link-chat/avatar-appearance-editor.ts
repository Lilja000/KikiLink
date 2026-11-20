import type { AvatarDecoration, AvatarFrame } from "../../core/types";
import { AVATAR_PRESETS, DEFAULT_AVATAR_DECORATION, isAvatarFrame, normalizeAvatarDecoration } from "../../core/profile-appearance";
import { element } from "../../utils/dom";
import { applyAvatarAppearance } from "./appearance-renderer";
import { kikiIcon } from "./icons";

export class AvatarAppearanceEditor {
  readonly element = element("div", { className: "kl-avatar-appearance-controls" });
  readonly primary = element("input", { className: "kl-profile-gradient-color", ariaLabel: "Avatar first color" });
  readonly secondary = element("input", { className: "kl-profile-gradient-color", ariaLabel: "Avatar second color" });
  readonly angle = element("select", { className: "kl-select", ariaLabel: "Avatar gradient direction" });
  readonly #colors = element("div", { className: "kl-avatar-custom-colors" });
  readonly #direction: HTMLLabelElement;
  readonly #modeButtons = new Map<AvatarDecoration["mode"], HTMLButtonElement>();
  readonly #presetButtons = new Map<AvatarFrame, HTMLButtonElement>();
  readonly #samples: HTMLElement[] = [];
  #presetGrid?: HTMLElement;
  #quietPreview?: HTMLElement;
  #resetButton?: HTMLButtonElement;
  #primaryLabel?: HTMLElement;
  #sampleName = "";
  #sampleImage = "";
  #preset: AvatarFrame = "blossom";
  #busy = false;
  constructor(readonly mode: HTMLSelectElement, readonly changed: () => void, platform = false) {
    const option = (value: string, label: string) => { const node = document.createElement("option"); node.value = value; node.textContent = label; return node; };
    this.mode.setAttribute("aria-label", "Avatar decoration");
    this.mode.replaceChildren(...[
      ["none", "None"], ["solid", "Solid color"], ["gradient", "Gradient"],
      ["blossom", "Sakura blossoms"], ["rose", "Scarlet rose ring"], ["starlight", "Violet starlight"],
      ["laurel", "Golden laurel"], ["thorn", "Poison thorns"], ["moon", "Silver moon orbit"],
      ["ribbon", "Jade ribbons"], ["wings", "Silver wings"], ["lotus", "Lotus crown"],
      ["constellation", "Constellation"], ["crest", "Amber crest"],
    ].map(([value, label]) => option(value!, label!)));
    this.primary.type = this.secondary.type = "color";
    for (let value = 0; value < 360; value += 45) this.angle.append(option(String(value), `${value}°`));
    this.#direction = element("label", { className: "kl-avatar-angle-field" }, element("span", { text: "Direction" }), this.angle);
    this.#primaryLabel = element("span", { text: "First color" });
    this.#colors.append(
      element("label", { className: "kl-avatar-color-field" }, this.primary, this.#primaryLabel),
      element("label", { className: "kl-avatar-color-field" }, this.secondary, element("span", { text: "Second color" })), this.#direction);
    this.element.append(this.mode, this.#colors);
    this.mode.addEventListener("change", () => {
      if (isAvatarFrame(this.mode.value) && this.mode.value !== "none") this.#preset = this.mode.value;
      this.render(); changed();
    });
    for (const field of [this.primary, this.secondary, this.angle]) field.addEventListener("input", changed);
    if (platform) this.#buildPlatformControls();
    this.set(normalizeAvatarDecoration(undefined));
  }
  #buildPlatformControls(): void {
    this.element.classList.add("kl-avatar-appearance-platform");
    this.mode.hidden = true;
    const modes = element("div", { className: "kl-profile-appearance-modes", ariaLabel: "Avatar decoration mode" });
    modes.setAttribute("role", "group");
    for (const [value, label] of [["none", "None"], ["solid", "Solid"], ["gradient", "Gradient"], ["preset", "Presets"]] as const) {
      const button = element("button", { type: "button", className: "kl-profile-choice", text: label,
        onClick: () => this.#select(value === "preset" ? this.#preset : value) });
      this.#modeButtons.set(value, button); modes.append(button);
    }
    this.#presetGrid = element("div", { className: "kl-profile-choice-grid kl-profile-decoration-choices", ariaLabel: "Avatar decoration presets" });
    this.#presetGrid.setAttribute("role", "group");
    for (const preset of AVATAR_PRESETS) {
      if (preset === "none") continue;
      const label = preset.charAt(0).toUpperCase() + preset.slice(1);
      const sample = this.#sample({ ...DEFAULT_AVATAR_DECORATION, mode: "preset", preset });
      const button = element("button", { type: "button", className: "kl-profile-choice",
        onClick: () => this.#select(preset) }, sample, element("span", { text: label }));
      this.#presetButtons.set(preset, button); this.#presetGrid.append(button);
    }
    this.#quietPreview = element("div", { className: "kl-profile-decoration-preview" }, this.#sample(DEFAULT_AVATAR_DECORATION));
    this.#resetButton = element("button", { type: "button", className: "kl-text-button kl-profile-image-remove",
      onClick: () => { this.set(DEFAULT_AVATAR_DECORATION); this.changed(); } }, kikiIcon("refresh"), "Reset decoration");
    this.mode.before(modes);
    this.#colors.before(this.#quietPreview, this.#presetGrid);
    this.element.append(element("div", { className: "kl-profile-appearance-actions" }, this.#resetButton));
  }
  #select(value: string): void {
    this.mode.value = value;
    this.mode.dispatchEvent(new Event("change", { bubbles: true }));
  }
  #sample(decoration: AvatarDecoration): HTMLElement {
    const avatar = element("span", { className: "kl-avatar kl-profile-decoration-example" });
    avatar.setAttribute("aria-hidden", "true");
    applyAvatarAppearance(avatar, { avatarDecoration: decoration });
    this.#samples.push(avatar);
    return avatar;
  }
  setSample(name: string, preview: HTMLElement): void {
    if (!this.#quietPreview) return;
    const initial = [...name.trim()][0] || "?";
    const src = preview.querySelector<HTMLImageElement>("img")?.src || "";
    // Reuse already-rendered local media without loading any additional remote image.
    const image = /^(blob:|data:)/u.test(src) ? src : "";
    if (initial === this.#sampleName && image === this.#sampleImage) return;
    this.#sampleName = initial; this.#sampleImage = image;
    for (const sample of this.#samples)
      sample.replaceChildren(image ? element("img", { src: image, alt: "" }) : document.createTextNode(initial.toUpperCase()));
  }
  get(): AvatarDecoration {
    const selection = this.mode.value;
    const preset = isAvatarFrame(selection) && selection !== "none" ? selection : this.#preset;
    return normalizeAvatarDecoration({ mode: isAvatarFrame(selection) && selection !== "none" ? "preset" : selection,
      preset, primary: this.primary.value, secondary: this.secondary.value, angle: Number(this.angle.value) });
  }
  set(value: AvatarDecoration): void { this.#preset = value.preset === "none" ? "blossom" : value.preset; this.mode.value = value.mode === "preset" ? this.#preset : value.mode; this.primary.value = value.primary; this.secondary.value = value.secondary; this.angle.value = String(value.angle); this.render(); }
  disabled(value: boolean): void { this.#busy = value; this.render(); }
  render(): void {
    const custom = this.mode.value === "solid" || this.mode.value === "gradient";
    this.mode.disabled = this.#busy; this.#colors.hidden = !custom;
    for (const control of [this.primary, this.secondary, this.angle]) control.disabled = this.#busy;
    this.secondary.parentElement!.hidden = this.mode.value !== "gradient"; this.#direction.hidden = this.mode.value !== "gradient";
    if (!this.#presetGrid || !this.#quietPreview || !this.#resetButton || !this.#primaryLabel) return;
    const value = this.get();
    this.#primaryLabel.textContent = value.mode === "solid" ? "Ring color" : "First color";
    this.#presetGrid.hidden = value.mode !== "preset";
    this.#quietPreview.hidden = value.mode !== "none";
    this.#resetButton.disabled = this.#busy;
    for (const [mode, button] of this.#modeButtons) {
      button.disabled = this.#busy;
      button.setAttribute("aria-pressed", String(mode === value.mode));
    }
    for (const [preset, button] of this.#presetButtons) {
      button.disabled = this.#busy;
      button.setAttribute("aria-pressed", String(preset === value.preset));
    }
  }
}
