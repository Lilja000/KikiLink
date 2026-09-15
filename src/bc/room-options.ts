/** Choices come from the loaded BC client; the fallbacks are the inspected r131 wire enums. */
export interface RoomChoice { value: string; label: string }
export interface RoomRoleChoice { value: string[]; label: string }
export interface RoomBackground { name: string; label: string; tags: string[] }
export function roomOptions(): { games: RoomChoice[]; languages: RoomChoice[]; types: RoomChoice[]; blocks: string[]; access: RoomRoleChoice[]; visibility: RoomRoleChoice[]; backgrounds: RoomBackground[] } {
  const titles: Record<string, string> = { "": "None", ClubCard: "Club Cards", MagicBattle: "Magic Battle",
    Never: "Classic room", Hybrid: "Classic + map", Always: "Map room", PUBLIC: "Public", ADMIN_WHITELIST: "Admins & whitelist", ADMIN: "Admins only", UNLISTED: "Unlisted" };
  const choices = (values: readonly string[]): RoomChoice[] => [...new Set(values)].map(value => ({ value, label: titles[value] ?? value }));
  const roles = (values: unknown, labels: unknown, unlisted: boolean): RoomRoleChoice[] => {
    if (Array.isArray(values) && Array.isArray(labels) && values.length === labels.length && values.length &&
      values.every(value => Array.isArray(value) && value.every(role => ["All", "Admin", "Whitelist"].includes(role))))
      return values.map((value, index) => ({ value: [...value], label: titles[String(labels[index])] ?? String(labels[index]) }));
    return [{ value: ["All"], label: "Public" }, { value: ["Admin", "Whitelist"], label: "Admins & whitelist" },
      { value: ["Admin"], label: "Admins only" }, ...(unlisted ? [{ value: [], label: "Unlisted" }] : [])];
  };
  let backgrounds: RoomBackground[] = [];
  try {
    if (typeof BackgroundsList !== "undefined" && Array.isArray(BackgroundsList))
      backgrounds = BackgroundsList.filter(item => item && typeof item.Name === "string")
        .map(item => ({ name: item.Name, label: typeof BackgroundsTextGet === "function" ? BackgroundsTextGet(item.Name) : item.Name,
          tags: Array.isArray(item.Tag) ? [...item.Tag] : [] }));
    else if (typeof ChatAdminBackgroundList !== "undefined" && Array.isArray(ChatAdminBackgroundList))
      backgrounds = ChatAdminBackgroundList.map(name => ({ name, label: name, tags: [] }));
  } catch { /* A native screen refresh may temporarily make its catalog unavailable. */ }
  return {
    games: choices(typeof ChatAdminGameList !== "undefined" && Array.isArray(ChatAdminGameList) ? ChatAdminGameList : ["", "ClubCard", "LARP", "MagicBattle", "GGTS", "Prison"]),
    languages: choices(typeof ServerChatRoomSupportedLanguages !== "undefined" && Array.isArray(ServerChatRoomSupportedLanguages)
      ? ServerChatRoomSupportedLanguages : ["EN", "DE", "FR", "ES", "CN", "RU", "UA"]).map(choice => ({ ...choice,
        label: ({ EN: "English", DE: "Deutsch", FR: "Français", ES: "Español", CN: "中文", RU: "Русский", UA: "Українська" } as Record<string, string>)[choice.value] ?? choice.label })),
    types: choices(typeof ChatRoomMapViewTypeList !== "undefined" && Array.isArray(ChatRoomMapViewTypeList) ? ChatRoomMapViewTypeList : ["Never", "Hybrid", "Always"]),
    blocks: ["Medical", "Extreme", "Pony", "SciFi", "ABDL", "Fantasy", "Smoking", "Leashing", "Photos", "Arousal"],
    access: roles(typeof ChatAdminAccessModeValues === "undefined" ? undefined : ChatAdminAccessModeValues,
      typeof ChatAdminAccessModeLabels === "undefined" ? undefined : ChatAdminAccessModeLabels, false),
    visibility: roles(typeof ChatAdminVisibilityModeValues === "undefined" ? undefined : ChatAdminVisibilityModeValues,
      typeof ChatAdminVisibilityModeLabels === "undefined" ? undefined : ChatAdminVisibilityModeLabels, true),
    backgrounds,
  };
}
