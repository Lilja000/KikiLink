import { element } from '../../cloud/dom';
import type { CloudProfile } from '../../cloud/types';
import { renderLegacyBadge } from '../../cloud/legacy-badge';
import { isGoldBlossomMember } from '../link-chat/blossom-identity';
import { kikiIcon } from '../link-chat/icons';

/** Public identity is bound to the canonical member, never a supplied role label. */
export function profileIdentityName(name:string,memberNumber:number):HTMLHeadingElement {
  const heading=element('h2',{text:name,title:name});
  heading.dataset.creator=String(isGoldBlossomMember(memberNumber));
  return heading;
}

export function profileIdentityBadges(profile:CloudProfile|undefined,memberNumber:number):HTMLElement {
  const badges=element('div',{className:'kl-addon-profile-badges'});
  if(isGoldBlossomMember(memberNumber))for(const [label,icon] of [['Creator','activities'],['Administrator','shield']] as const){
    const badge=element('span',{className:'kl-addon-profile-admin-badge',ariaLabel:label,title:label,tabIndex:0},kikiIcon(icon,'kl-icon',icon==='activities'));
    badge.setAttribute('role','img');badges.append(badge);
  }
  const legacy=renderLegacyBadge(profile,memberNumber);
  if(legacy)badges.append(legacy);
  return badges;
}

export function profileSectionLocked(className:string,title:string,message:string,action?:HTMLElement):HTMLElement {
  return element('section',{className:`kl-profile-section-locked ${className}`},kikiIcon('lock'),element('h2',{text:title}),
    element('p',{className:'kl-profile-section-note',text:message}),action);
}

export function profilePreferencesLocked(className:string,message:string,action?:HTMLElement):HTMLElement {
  return profileSectionLocked(className,'Preferences are private',message,action);
}
