import type { AvatarDecoration, AvatarFrame, PresenceSnapshot } from "../../core/types";
import { effectiveProfileStyle, normalizeAvatarDecoration } from "../../core/profile-appearance";

// Static, bundled geometry only. No uploaded SVG, remote graphics, or user-generated markup.
const motifs: Record<Exclude<AvatarFrame, "none">, [string, string]> = {
  blossom: ["#ec92ad", '<g fill="#ec92ad"><circle cx="15" cy="13" r="5"/><circle cx="10" cy="18" r="5"/><circle cx="20" cy="18" r="5"/><circle cx="15" cy="23" r="5"/></g><circle cx="15" cy="18" r="3" fill="#f9d47e"/>'],
  rose: ["#e67789", '<path d="M12 10 23 12 26 23 17 28 8 22Z" fill="#b74661"/><path d="m13 16 7-1 1 7-6 1-2-4 5-1" stroke="#ffc1bf"/><path d="m26 23 6 9M22 29l10 3-1-9"/>'],
  starlight: ["#bcb3e8", '<path d="m15 5 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" fill="#d2c4f1"/><path d="m79 7 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#bcb3e8"/>'],
  laurel: ["#cbbb79", '<path d="M8 67Q-1 36 14 14M8 54l-7-6 8-3M9 39l-6-7 10-3M13 25l-3-8 9-2M91 67q10-31-6-53M91 54l7-6-8-3M90 39l6-7-10-3M86 25l3-8-9-2"/>'],
  thorn: ["#7bb79d", '<path d="M8 69 7 26 17 9M7 53l-6-7 6-1M7 36l6-8-6 1M87 14l7 20-1 25M93 38l6 6-6 3M94 52l-7 6 6 2"/>'],
  moon: ["#c2cbea", '<path d="M24 6a14 14 0 1 0 5 23A16 16 0 0 1 24 6Z" fill="#c2cbea"/><circle cx="84" cy="19" r="2" fill="#d8e3ff"/>'],
  ribbon: ["#8bd1bd", '<path d="M7 19q9-14 20-10l-5 8-6 2-3 9Z" fill="#5b9d8f"/><path d="M73 9q11-4 20 10l-6 9-3-9-6-2Z" fill="#8bd1bd"/>'],
  wings: ["#c5cee0", '<path d="M10 48 1 37l3-22 10 8M90 48l9-11-3-22-10 8M4 25l8 9M3 33l8 9M96 25l-8 9M97 33l-8 9" fill="#506077"/>'],
  lotus: ["#dab3c8", '<path d="M50 9Q33 2 32 12q8 8 18 4Q68 20 68 12q-1-10-18-3M50 16Q39 8 50 1q11 7 0 15Z" fill="#9e708e"/>'],
  constellation: ["#a7cfde", '<path d="m8 28 5-15 17-6M75 7l13 9 5 18"/><g fill="#c3e4ee"><circle cx="8" cy="28" r="3"/><circle cx="13" cy="13" r="3"/><circle cx="30" cy="7" r="3"/><circle cx="75" cy="7" r="3"/><circle cx="88" cy="16" r="3"/><circle cx="93" cy="34" r="3"/></g>'],
  crest: ["#d5be8e", '<path d="M35 8 38 1 50 6 62 1 65 8 60 17H40Z" fill="#80704b"/><path d="m46 10 4-4 4 4-4 4Z" fill="#f4dba6"/>'],
};
const motifUrls = new Map<string, string>();
export function applyAvatarAppearance(target: HTMLElement, source: { avatarFrame?: AvatarFrame; avatarDecoration?: AvatarDecoration }): void {
  const value = normalizeAvatarDecoration(source.avatarDecoration, source.avatarFrame);
  target.dataset.avatarMode = value.mode;
  target.dataset.avatarFrame = value.mode === "preset" ? value.preset : "none";
  target.style.setProperty("--kl-avatar-ring", value.mode === "gradient" ? `linear-gradient(${value.angle}deg,${value.primary},${value.secondary})` : value.primary);
  if (value.mode === "preset") {
    const [tone, shape] = motifs[value.preset === "none" ? "blossom" : value.preset];
    let url = motifUrls.get(value.preset);
    if (!url) { url = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="none" stroke="${tone}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><rect x="7" y="7" width="86" height="86" rx="27"/>${shape}</g></svg>`)}")`; motifUrls.set(value.preset, url); }
    target.style.setProperty("--kl-avatar-motif", url);
  } else target.style.removeProperty("--kl-avatar-motif");
}

const palettes: Record<string, [string, string, string]> = {
  classic: ["#251319", "#392129", "#d8b65d"], garden: ["#10231b", "#183127", "#e2b86b"], midnight: ["#10101d", "#191a2d", "#c3b5ec"],
  glacier: ["#112331", "#1a3344", "#a5d0e6"], sage: ["#222a24", "#323e34", "#bdc9a8"],
  "dusty-rose": ["#2d2028", "#40303a", "#e1b1c4"], amber: ["#2d2419", "#403323", "#e2bd7f"],
};
export function applyProfileAppearance(target: HTMLElement, source: Pick<PresenceSnapshot, "profileStyle" | "profileGradient" | "profileOutlineColor">): void {
  for (const property of Array.from({ length: target.style.length }, (_, i) => target.style.item(i))) if (property.startsWith("--kl-profile-")) target.style.removeProperty(property);
  target.style.removeProperty("background");
  const style = effectiveProfileStyle(source.profileStyle, source.profileGradient);
  target.dataset.profileStyle = style;
  const gradient = style === "gradient" ? source.profileGradient || undefined : undefined;
  const palette = palettes[style] ?? palettes.classic!;
  if (!gradient && ["classic", "garden", "midnight"].includes(style)) {
    delete target.dataset.customGradient;
    if (source.profileOutlineColor) { target.dataset.customOutline = "true"; target.style.setProperty("--kl-profile-outline", source.profileOutlineColor); }
    else delete target.dataset.customOutline;
    return;
  }
  target.dataset.customGradient = String(Boolean(gradient));
  const angle = gradient?.angle ?? 135;
  if (gradient) { target.style.setProperty("--kl-profile-gradient-primary", gradient.primary); target.style.setProperty("--kl-profile-gradient-secondary", gradient.secondary); target.style.setProperty("--kl-profile-gradient-angle", `${angle}deg`); }
  // A dark surface mix keeps light text and every control readable even with two white source colors.
  const bg = gradient ? `linear-gradient(${angle}deg,color-mix(in srgb,${gradient.primary},#0d1017 78%),color-mix(in srgb,${gradient.secondary},#0d1017 78%))` : palette[0];
  // Nested borders need a real color. A gradient is valid as a background but
  // invalid as border-color, which made presence dots lose their dark ring.
  const surface = gradient ? "#171923" : palette[0];
  target.style.setProperty("--kl-profile-bg", surface);
  target.style.setProperty("--kl-profile-status-ring", surface);
  target.style.setProperty("--kl-profile-panel", gradient ? "#20222ccc" : palette[1]);
  target.style.setProperty("--kl-profile-panel-strong", gradient ? "#303340" : palette[1]);
  target.style.setProperty("--kl-profile-text", "#f5f1ef");
  target.style.setProperty("--kl-profile-muted", "#c7c2c8");
  target.style.setProperty("--kl-profile-border", "#bdb2c333");
  target.style.setProperty("--kl-profile-border-strong", "#bdb2c366");
  target.style.setProperty("--kl-profile-highlight", gradient ? `color-mix(in srgb,${gradient.primary},white 65%)` : palette[2]);
  target.style.setProperty("--kl-profile-banner", gradient ? `linear-gradient(${angle}deg,${gradient.primary},${gradient.secondary})` : `linear-gradient(125deg,${palette[1]},${palette[0]})`);
  target.style.setProperty("--kl-profile-outline", source.profileOutlineColor || "#bdb2c366");
  // Override the old selector's background shorthand with the same renderer used by the editor.
  target.style.background = bg;
}

export const APPEARANCE_STYLES = `
[data-avatar-mode]{isolation:isolate;overflow:visible!important;box-shadow:none!important}
[data-avatar-mode]::before{content:none!important}
/* The bundled decoration owns its outline. Suppress the legacy border and
   match the preset's rounded-square silhouette in Feed as well as chat. */
[data-avatar-mode]:not([data-avatar-mode="none"]){border-color:transparent!important}
[data-avatar-mode="preset"]{border-radius:31.4%!important}
[data-avatar-mode]::after{content:"";position:absolute!important;inset:-3px!important;width:auto!important;height:auto!important;transform:none!important;border:0!important;border-radius:inherit;pointer-events:none!important;z-index:4;box-shadow:none!important;background:none!important}
[data-avatar-mode="none"]::after{display:none!important}
[data-avatar-mode="preset"]::after{inset:-8%!important;background:var(--kl-avatar-motif) center / 100% 100% no-repeat!important;border-radius:0!important}
[data-avatar-mode="solid"]::after,[data-avatar-mode="gradient"]::after{padding:2px;background:var(--kl-avatar-ring)!important;-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);mask-composite:exclude}
.kl-social-avatar[data-avatar-mode] .kl-cloud-image,.kl-avatar[data-avatar-mode] .kl-cloud-image{border-radius:inherit;overflow:hidden}
.kl-social-avatar[data-avatar-mode] img{border-radius:inherit}
.kl-avatar-appearance-controls{display:grid;gap:8px;min-width:0}
.kl-avatar-appearance-controls>.kl-select{width:100%;min-width:0}
.kl-avatar-custom-colors{min-width:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
.kl-avatar-custom-colors label{min-width:0;display:grid;grid-template-columns:48px minmax(0,1fr);gap:8px;align-items:center;font-size:var(--kl-type-xs);color:var(--kl-muted)}
.kl-avatar-custom-colors label>span{min-width:0;overflow-wrap:anywhere}
.kl-avatar-custom-colors .kl-avatar-angle-field{grid-column:1/-1;grid-template-columns:minmax(0,1fr) 92px}
.kl-avatar-angle-field .kl-select{width:92px;min-width:0}
.kl-profile-gradient-field[hidden],.kl-avatar-custom-colors[hidden]{display:none!important}
.kl-profile-appearance-preview{--kl-profile-bg:var(--kl-surface);--kl-profile-text:var(--kl-text);--kl-profile-muted:var(--kl-muted);background:var(--kl-profile-bg);padding:15px;border:1px solid var(--kl-profile-outline);border-radius:16px;color:var(--kl-profile-text);min-height:85px}
.kl-profile-appearance-preview small{display:block;color:var(--kl-profile-muted);margin-top:5px}
@media(forced-colors:active){[data-avatar-mode]::after{display:none!important}}
`;
