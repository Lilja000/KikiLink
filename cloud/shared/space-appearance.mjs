// Space identity follows the prototype's fixed icon/color presets. It stays
// independent from subsequent changes to a linked native room's background.
export const SPACE_ICONS = Object.freeze(['moon', 'cup', 'sparkles', 'brush', 'leaf', 'heart', 'globe', 'door', 'home', 'users']);
export const SPACE_COLORS = Object.freeze(['rose', 'lavender', 'amber', 'sage', 'blue']);
const themes = Object.freeze({
  lounge: ['cup', 'amber'],
  garden: ['leaf', 'sage'],
  studio: ['brush', 'blue'],
  theatre: ['sparkles', 'lavender'],
});

/** Old Cloud records have no stored identity; only derive from a room already
 * available to this viewer. Explicit metadata always takes precedence. */
export function spaceAppearance(value = {}) {
  const background = typeof value?.room?.background === 'string' ? value.room.background.trim().toLowerCase() : '';
  const [icon, color] = Object.hasOwn(themes, background) ? themes[background] : ['door', 'rose'];
  return {
    icon: SPACE_ICONS.includes(value?.icon) ? value.icon : icon,
    color: SPACE_COLORS.includes(value?.color) ? value.color : color,
  };
}
