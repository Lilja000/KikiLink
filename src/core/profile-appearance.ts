import type { AvatarDecoration, AvatarFrame, ProfileCardStyle, ProfileGradient } from "./types";

export const AVATAR_PRESETS = ["none", "blossom", "rose", "starlight", "laurel", "thorn", "moon", "ribbon", "wings", "lotus", "constellation", "crest"] as const;
export const PROFILE_CARDS = ["classic", "garden", "midnight", "glacier", "sage", "dusty-rose", "amber", "gradient"] as const;
export const DEFAULT_AVATAR_DECORATION: AvatarDecoration = { mode: "none", preset: "blossom", primary: "#d71932", secondary: "#d8b65d", angle: 135 };
export const isAvatarFrame = (value: unknown): value is AvatarFrame => AVATAR_PRESETS.includes(value as AvatarFrame);
export const isProfileCardStyle = (value: unknown): value is ProfileCardStyle => PROFILE_CARDS.includes(value as ProfileCardStyle);
const color = (value: unknown, fallback: string): string => typeof value === "string" && /^#[\da-f]{6}$/iu.test(value) ? value.toLowerCase() : fallback;

export function normalizeAvatarDecoration(value: unknown, legacy?: unknown): AvatarDecoration {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const mode = input.mode === "none" || input.mode === "preset" || input.mode === "solid" || input.mode === "gradient" ? input.mode
    : isAvatarFrame(legacy) && legacy !== "none" ? "preset" : "none";
  return { mode, preset: isAvatarFrame(input.preset) && input.preset !== "none" ? input.preset
    : isAvatarFrame(legacy) && legacy !== "none" ? legacy : DEFAULT_AVATAR_DECORATION.preset,
    primary: color(input.primary, DEFAULT_AVATAR_DECORATION.primary), secondary: color(input.secondary, DEFAULT_AVATAR_DECORATION.secondary),
    angle: typeof input.angle === "number" && Number.isFinite(input.angle) ? ((Math.round(input.angle / 45) * 45 % 360) + 360) % 360 : 135 };
}
export function activeAvatarFrame(value: AvatarDecoration): AvatarFrame { return value.mode === "preset" ? value.preset : "none"; }
export function effectiveProfileStyle(style: unknown, gradient?: ProfileGradient): ProfileCardStyle {
  // Legacy enabled gradients win once, retaining their palette. Preset selection disables them explicitly.
  return gradient?.enabled ? "gradient" : isProfileCardStyle(style) ? style : "classic";
}
export function publicProfileTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((tag): tag is string => typeof tag === "string")
    .map(tag => tag.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu, "").trim().slice(0, 20)).filter(Boolean))].slice(0, 5);
}
