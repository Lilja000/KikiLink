/** BC r131 ServerChatRoomMapData. Encoded fields stay opaque, without lossy re-encoding. */
export interface RoomMapData {
  Type: "Always" | "Hybrid" | "Never";
  Tiles?: string;
  Objects?: string;
  Effects?: string;
  Fog?: boolean;
}

export function copyRoomMap(value: unknown): RoomMapData | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const map = value as Record<string, unknown>;
  if (!["Always", "Hybrid", "Never"].includes(String(map.Type))) return undefined;
  const copy: RoomMapData = { Type: map.Type as RoomMapData["Type"] };
  let length = 0;
  for (const key of ["Tiles", "Objects", "Effects"] as const) {
    if (map[key] === undefined) continue;
    if (typeof map[key] !== "string") return undefined;
    length += map[key].length;
    if (length > 524_288) return undefined;
    copy[key] = map[key];
  }
  if (map.Fog !== undefined) {
    if (typeof map.Fog !== "boolean") return undefined;
    copy.Fog = map.Fog;
  }
  return copy;
}
