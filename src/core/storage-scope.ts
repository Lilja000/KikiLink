import { KIKILINK_PLATFORM_PREVIEW } from "./distribution";
import type { KeyValueStorage } from "./settings";

/** Stable builds retain exact existing names. No implicit import from release storage. */
export function scopePersistenceName(stableName: string): string {
  return KIKILINK_PLATFORM_PREVIEW ? `kikilink-platform-preview:${stableName}` : stableName;
}

/** For legacy standalone stores only; account storage applies its own scoped prefix. */
export function scopedBrowserStorage(backing: KeyValueStorage): KeyValueStorage {
  if (!KIKILINK_PLATFORM_PREVIEW) return backing;
  return {
    getItem: key => backing.getItem(scopePersistenceName(key)),
    getItemResult: key => backing.getItemResult?.(scopePersistenceName(key)) ?? {
      ok: true, value: backing.getItem(scopePersistenceName(key)),
    },
    setItem: (key, value) => backing.setItem(scopePersistenceName(key), value),
    removeItem: key => backing.removeItem(scopePersistenceName(key)),
  };
}
