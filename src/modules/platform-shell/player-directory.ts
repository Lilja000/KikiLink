import type { KeyValueStorage } from "../../core/settings";
import type { PeopleFilters } from "../link-chat/social-directory";

export interface PlayerDirectoryState {
  scope: "current" | "friends" | "known";
  query: string;
  filters: PeopleFilters;
}
const KEY = "kikilink:platform:players:v1";
export function readPlayerDirectory(storage?: KeyValueStorage): PlayerDirectoryState {
  const state: PlayerDirectoryState = { scope: "current", query: "", filters: { favorites: false, online: false, addon: false } };
  try {
    const value = JSON.parse(storage?.getItem(KEY) ?? "null");
    if (!value || typeof value !== "object") return state;
    if (["current", "friends", "known"].includes(value.scope)) state.scope = value.scope;
    if (typeof value.query === "string") state.query = value.query.slice(0, 120);
    for (const key of ["favorites", "online", "addon"] as const) state.filters[key] = value.filters?.[key] === true;
  } catch { /* A malformed preference must not hide the native room roster. */ }
  return state;
}
export function savePlayerDirectory(storage: KeyValueStorage | undefined, state: PlayerDirectoryState): void {
  try { storage?.setItem(KEY, JSON.stringify(state)); }
  catch { /* Filters remain usable in memory if browser storage is unavailable. */ }
}
