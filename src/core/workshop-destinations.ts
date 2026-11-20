/** Data-only Workshop destinations. No CSS, URLs or executable package content. */
export interface WorkshopRoomPayload { name: string; description: string; background: string; capacity: number; restoreOnOpen?: boolean; }
export interface WorkshopBackgroundPayload { background: string; primary: string; secondary: string; }
export interface WorkshopUIPayload { primary: string; secondary: string; accent: string; density: 'Compact' | 'Comfortable'; }
export interface WorkshopPalette { packageId: string; version: string; label: string; primary: string; secondary: string; }
export const WORKSHOP_DESTINATION_TYPES = ['Room preset', 'Background', 'UI theme'] as const;
export const workshopColor = (v: unknown): v is string => typeof v === 'string' && /^#[a-f0-9]{6}$/i.test(v);
export const workshopBackground = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9 _'-]{0,119}$/.test(v);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).length === allowed.length && Object.keys(v).every(key => allowed.includes(key));
const text = (v: unknown, min: number, max: number) => typeof v === 'string' && v.trim().length >= min && v.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(v);
export function checkedWorkshopDestination(type: string, value: unknown): void {
  if (!object(value)) throw new Error('Invalid package content.');
  if (type === 'Room preset' && keys(value, ['name', 'description', 'background', 'capacity', ...(Object.hasOwn(value, 'restoreOnOpen') ? ['restoreOnOpen'] : [])]) && (value.restoreOnOpen === undefined || typeof value.restoreOnOpen === 'boolean') && text(value.name, 3, 64) && text(value.description, 0, 400) && workshopBackground(value.background) && Number.isInteger(value.capacity) && Number(value.capacity) >= 2 && Number(value.capacity) <= 50) return;
  if (type === 'Background' && keys(value, ['background', 'primary', 'secondary']) && workshopBackground(value.background) && workshopColor(value.primary) && workshopColor(value.secondary)) return;
  if (type === 'UI theme' && keys(value, ['primary', 'secondary', 'accent', 'density']) && [value.primary, value.secondary, value.accent].every(workshopColor) && ['Compact', 'Comfortable'].includes(String(value.density))) return;
  throw new Error('Invalid room, background or interface package content.');
}
export function workshopPaletteReadable(value: Pick<WorkshopUIPayload, 'primary' | 'secondary' | 'accent'>): boolean {
  const luminance = (hex: string) => {
    if (!workshopColor(hex)) return 1;
    const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
    return .2126 * rgb[0]! + .7152 * rgb[1]! + .0722 * rgb[2]!;
  };
  return [value.primary, value.secondary, value.accent].every(workshopColor) && luminance(value.primary) < .12 && luminance(value.secondary) < .16 && luminance(value.accent) > .035;
}
