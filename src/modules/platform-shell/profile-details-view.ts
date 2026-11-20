import { element } from '../../cloud/dom';
import type { CloudProfile } from '../../cloud/types';
import { validProfileLanguages, validProfileOffset, profileLocalTime } from '../../cloud/profile-details-model';
const joinedFormat=new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});
export function appendProfileDetails(target:HTMLElement,profile:CloudProfile|undefined):void {
  if(profile?.aboutHidden){target.append(element('dt',{text:'About details'}),element('dd',{text:'Private or not shared with you.'}));return;}
  const supported=!!profile&&validProfileLanguages(profile.languages)&&validProfileOffset(profile.utcOffsetMinutes)&&Object.hasOwn(profile,'joinedAt'),missing=profile?.isDefault?'Not shared':'Not available';
  target.append(element('dt',{text:'Languages'}),element('dd',{text:supported?profile.languages!.join(', ')||'Not shared':missing}));
  const clock=element('dd',{text:missing});
  if(supported){clock.textContent=profile.utcOffsetMinutes===null?'Not shared':profileLocalTime(profile.utcOffsetMinutes!);if(profile.utcOffsetMinutes!==null)clock.dataset.profileUtcOffset=String(profile.utcOffsetMinutes);}
  const joined=profile?.joinedAt;
  target.append(element('dt',{text:'Local time'}),clock,element('dt',{text:'Joined KikiLink',title:'First registration of this account in KikiLink Cloud.'}),element('dd',{text:supported&&Number.isSafeInteger(joined)&&joined!>0&&joined!<=Date.now()?joinedFormat.format(joined!):missing,title:'Based on the first Cloud registration, not the first addon installation.'}));
}
