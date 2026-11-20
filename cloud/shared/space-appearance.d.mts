export const SPACE_ICONS: readonly ['moon', 'cup', 'sparkles', 'brush', 'leaf', 'heart', 'globe', 'door', 'home', 'users'];
export const SPACE_COLORS: readonly ['rose', 'lavender', 'amber', 'sage', 'blue'];
export type SpaceIcon = typeof SPACE_ICONS[number];
export type SpaceColor = typeof SPACE_COLORS[number];
export interface SpaceAppearance {icon: SpaceIcon; color: SpaceColor;}
export interface SpaceAppearanceSource {icon?: unknown; color?: unknown; room?: {background?: unknown} | null;}
export function spaceAppearance(value?: SpaceAppearanceSource | null): SpaceAppearance;
