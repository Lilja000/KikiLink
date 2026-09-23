// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import { effectiveProfileStyle, normalizeAvatarDecoration, PROFILE_CARDS, AVATAR_PRESETS } from "../src/core/profile-appearance";
import { applyAvatarAppearance, applyProfileAppearance } from "../src/modules/link-chat/appearance-renderer";
import { AvatarAppearanceEditor } from "../src/modules/link-chat/avatar-appearance-editor";
import { serializePresencePacket } from "../src/modules/link-presence/link-presence-service";

it("migrates conflicting gradients deterministically and retains inactive color palettes", () => {
  const settings = new SettingsStore(new MemoryKeyValueStorage());
  settings.update(draft => { draft.linkPresence.profileStyle = "garden"; draft.linkPresence.profileGradient = { enabled: true, primary: "#abcdef", secondary: "#654321" }; });
  expect(settings.getSection("linkPresence").profileStyle).toBe("gradient");
  settings.update(draft => { draft.linkPresence.profileStyle = "amber"; draft.linkPresence.profileGradient.enabled = false; });
  expect(settings.getSection("linkPresence").profileGradient.primary).toBe("#abcdef");
  expect(effectiveProfileStyle("amber", settings.getSection("linkPresence").profileGradient)).toBe("amber");
  expect(normalizeAvatarDecoration({ mode: "solid", primary: "url(evil)", angle: -360 }, "moon")).toMatchObject({ mode: "solid", preset: "moon", angle: 0, primary: "#d71932" });
});
it("keeps the previous decoration through mutually exclusive custom modes and leaves profile background independent", () => {
  const presets = document.createElement("select"); for (const id of AVATAR_PRESETS) { const option = document.createElement("option"); option.value = id; presets.append(option); }
  const editor = new AvatarAppearanceEditor(presets, () => {}); editor.set(normalizeAvatarDecoration(undefined, "moon"));
  expect(editor.mode.value).toBe("moon");
  expect(editor.element.querySelectorAll("select")).toHaveLength(2);
  expect(editor.element.textContent).not.toContain("Presets");
  editor.mode.value = "solid"; editor.mode.dispatchEvent(new Event("change")); expect(presets.disabled).toBe(false);
  editor.primary.value = "#112233"; editor.mode.value = "gradient"; editor.mode.dispatchEvent(new Event("change"));
  expect(editor.get()).toMatchObject({ mode: "gradient", preset: "moon", primary: "#112233" });
  editor.mode.value = "moon"; editor.mode.dispatchEvent(new Event("change"));
  expect(editor.get()).toMatchObject({ mode: "preset", preset: "moon", primary: "#112233" });
  expect(editor.element.querySelector("button")).toBeNull();
  editor.disabled(true); expect(editor.mode.disabled).toBe(true);
  editor.disabled(false); expect(editor.mode.disabled).toBe(false);
  const avatar = document.createElement("div"), card = document.createElement("div");
  for (const style of PROFILE_CARDS) for (const mode of ["none", "preset", "solid", "gradient"] as const) {
    const decoration = { ...editor.get(), mode };
    applyAvatarAppearance(avatar, { avatarDecoration: decoration });
    applyProfileAppearance(card, { profileStyle: style, profileGradient: { enabled: style === "gradient", primary: "#ffffff", secondary: "#000000" } });
    expect(avatar.dataset.avatarMode).toBe(mode); expect(card.dataset.profileStyle).toBe(style);
    expect(card.style.getPropertyValue("--kl-avatar-ring")).toBe(""); expect(avatar.style.getPropertyValue("--kl-profile-bg")).toBe("");
  }
});
it("keeps appearance and public tags bounded in presence while private ratings cannot enter the packet", () => {
  const wire = serializePresencePacket({ t: "ps", s: "online", u: 1, v: "0.30.0", j: normalizeAvatarDecoration({ mode: "gradient" }), k: ["Public tag"], f: "none", c: "glacier" });
  expect(new TextEncoder().encode(wire).length).toBeLessThanOrEqual(700);
  expect(JSON.parse(wire)).toMatchObject({ j: { mode: "gradient" }, k: ["Public tag"], c: "glacier" });
  const avatar = document.createElement("div");
  for (const preset of AVATAR_PRESETS) { applyAvatarAppearance(avatar, { avatarFrame: preset }); expect(avatar.dataset.avatarFrame).toBe(preset); }
});
it("keeps a solid nested surface while painting a custom card gradient", () => {
  const card = document.createElement("div");
  applyProfileAppearance(card, {
    profileStyle: "gradient",
    profileGradient: { enabled: true, primary: "#8a1538", secondary: "#2a9d8f", angle: 225 },
  });
  expect(card.style.background).toContain("linear-gradient(225deg");
  expect(card.style.getPropertyValue("--kl-profile-bg")).toBe("#171923");
  expect(card.style.getPropertyValue("--kl-profile-status-ring")).toBe("#171923");
  expect(card.style.getPropertyValue("--kl-profile-bg")).not.toContain("gradient");
});
