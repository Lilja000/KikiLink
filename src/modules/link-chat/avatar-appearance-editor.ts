import type { AvatarDecoration, AvatarFrame } from "../../core/types";
import { isAvatarFrame, normalizeAvatarDecoration } from "../../core/profile-appearance";
import { element } from "../../utils/dom";

export class AvatarAppearanceEditor {
  readonly element = element("div", { className: "kl-avatar-appearance-controls" });
  readonly primary = element("input", { className: "kl-profile-gradient-color", ariaLabel: "Avatar first color" });
  readonly secondary = element("input", { className: "kl-profile-gradient-color", ariaLabel: "Avatar second color" });
  readonly angle = element("select", { className: "kl-select", ariaLabel: "Avatar gradient direction" });
  readonly #colors = element("div", { className: "kl-avatar-custom-colors" });
  readonly #direction: HTMLLabelElement;
  #preset: AvatarFrame = "blossom";
  #busy = false;
  constructor(readonly mode: HTMLSelectElement, readonly changed: () => void) {
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
    this.#colors.append(
      element("label", { className: "kl-avatar-color-field" }, this.primary, element("span", { text: "First color" })),
      element("label", { className: "kl-avatar-color-field" }, this.secondary, element("span", { text: "Second color" })), this.#direction);
    this.element.append(this.mode, this.#colors);
    this.mode.addEventListener("change", () => {
      if (isAvatarFrame(this.mode.value) && this.mode.value !== "none") this.#preset = this.mode.value;
      this.render(); changed();
    });
    for (const field of [this.primary, this.secondary, this.angle]) field.addEventListener("input", changed);
    this.set(normalizeAvatarDecoration(undefined));
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
  }
}
