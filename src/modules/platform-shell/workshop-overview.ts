import {element} from '../../cloud/dom';
import {WORKSHOP_DESTINATION_TYPES} from '../../core/workshop-destinations';
import {kikiIcon} from '../link-chat/icons';
import {checkedWorkshopRelease,WORKSHOP_PERMISSIONS} from './workshop-installation-model';
import {workshopNote as note,workshopPayloadView,type WorkshopRelease} from './workshop-model';

interface OverviewCapabilities {dependencies:boolean;roomThemes:boolean;communityTemplates:boolean;}
const section=(title:string,...children:Node[])=>element('section',{className:'kl-workshop-section'},element('h2',{text:title}),...children);

/** Both previews and installation review render the same validated permissions. */
export function workshopPermissionList(release:WorkshopRelease,granted?:readonly string[]):HTMLElement {
 const permission=WORKSHOP_PERMISSIONS[release.type];
 const status=granted?(granted.includes(permission.id)
  ?element('span',{className:'kl-workshop-badge',text:'Already allowed'})
  :element('span',{className:'kl-workshop-badge kl-workshop-badge--featured',text:'Requires approval'})):undefined;
 return element('ul',{className:'kl-workshop-permissions'},element('li',{},kikiIcon('shield'),
  element('div',{},element('strong',{},permission.label,status?' ':undefined,status),element('small',{text:permission.description})),
 ));
}

/** Read-only release information. Installing still uses WorkshopInstalled's reviewed plan. */
export function workshopOverview(release:WorkshopRelease,capabilities:OverviewCapabilities):HTMLElement {
 const main=element('div',{className:'kl-workshop-main-column'}),side=element('div',{className:'kl-workshop-side-column'});
 const tags=element('div',{className:'kl-workshop-tags'},...release.tags.map(text=>element('span',{className:'kl-workshop-tag',text})));
 main.append(section('A closer look',note(release.description),tags));
 // Dependencies have their own column, so the content preview does not repeat them.
 const content=workshopPayloadView({...release,deps:[]});content.querySelector('h3')?.remove();
 main.append(section('Try the idea',element('div',{className:'kl-workshop-rich-preview'},
  note(`Previewing v${release.version}. Applying this creation is a separate reviewed action.`),content)));
 let checked:WorkshopRelease|undefined;
 try{checked=checkedWorkshopRelease(release);}catch{}
 const permissions=section('Permissions');
 if(checked)permissions.append(workshopPermissionList(checked));
 else permissions.append(note('Permission details could not be validated for this version.'));
 side.append(permissions);
 const dependencies=section('Dependencies');
 if(release.deps?.length)for(const dependency of release.deps)dependencies.append(element('div',{className:'kl-workshop-dependency'},element('strong',{text:dependency.id}),element('small',{text:`v${dependency.minVersion} or later`})));
 else dependencies.append(note('No other packages required.'));
 side.append(dependencies);
 const missing:string[]=[];
 if(release.deps?.length&&!capabilities.dependencies)missing.push('dependency installation');
 if((WORKSHOP_DESTINATION_TYPES as readonly string[]).includes(release.type)&&!capabilities.roomThemes)missing.push('room, background and interface packages');
 if(release.type==='Community template'&&!capabilities.communityTemplates)missing.push('community templates');
 const compatibility=section('Compatibility');
 compatibility.append(element('span',{className:'kl-workshop-badge',text:!checked?'Unsupported version':missing.length?'Cloud update needed':'Supported package'}),note(!checked?'This version contains data or permissions this addon cannot install.':missing.length?`The connected Cloud service does not yet support ${missing.join(' and ')}.`:'This package format is supported. Installation checks current access, dependencies and your installed versions.'));
 side.append(compatibility);
 return element('div',{className:'kl-workshop-layout'},main,side);
}
