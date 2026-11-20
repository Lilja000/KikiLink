import { element } from '../../utils/dom';
import { kikiIcon } from '../link-chat/icons';

export const COMMUNITY_ICONS = ['users','moon','cup','brush','leaf'] as const;
export const COMMUNITY_COLORS = ['rose','lavender','amber','blue','sage'] as const;
export interface CommunityDesign { icon?: string; color?: string; tags?: string[]; announcement?: string | null }
export function communityIcon(value: CommunityDesign): HTMLElement {
  const icon = COMMUNITY_ICONS.find(x => x === value.icon) ?? 'users';
  const color = COMMUNITY_COLORS.find(x => x === value.color) ?? 'rose';
  const node = element('span', { className:`kl-cm-emblem kl-cm-color-${color}` }, kikiIcon(icon));
  node.setAttribute('aria-hidden','true'); return node;
}
export function communityTags(tags: string[] = []): HTMLElement {
  return element('div',{className:'kl-cm-tags'},...tags.slice(0,3).map(text=>element('span',{text})));
}
