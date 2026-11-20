import { CloudError } from './client';
import { element } from './dom';
import type { CloudProfile } from './types';
import { LEGACY_PROFILE_LANGUAGE, PROFILE_LANGUAGES, profileOffsetLabel, validProfileLanguages, validProfileOffset, type ProfileDetailsValue } from './profile-details-model';

export class ProfileDetailsField {
  readonly element=element('section',{className:'kl-profile-details-editor'});
  readonly offset=element('select',{className:'kl-select',ariaLabel:'Profile time zone'});
  readonly languages=new Map<string,HTMLInputElement>();
  readonly #status=element('p',{className:'kl-profile-section-note',role:'status'});
  readonly #fieldset=element('fieldset',{className:'kl-profile-language-picker',hidden:true},element('legend', {}, 'Languages ', element('small', { className: 'kl-profile-field-required', text: '(up to 6)' })));
  #supported=false; #locked=true;
  constructor(readonly enabled=true){
    this.element.hidden=!enabled;
    const options=element('div',{className:'kl-profile-language-options',role:'group',ariaLabel:'Languages · up to 6'});
    for (const language of [...PROFILE_LANGUAGES, LEGACY_PROFILE_LANGUAGE]) {
      const input = element('input', { type: 'checkbox', ariaLabel: language });
      this.languages.set(language, input);
      input.addEventListener('change', () => this.#render());
      options.append(element('label', { hidden: language === LEGACY_PROFILE_LANGUAGE }, input, language));
    }
    this.#fieldset.append(options);this.offset.append(element('option',{value:'',text:'Not shared'}));
    for(let offset=-720;offset<=840;offset+=15)this.offset.append(element('option',{value:String(offset),text:profileOffsetLabel(offset)}));
    this.element.append(this.#fieldset,element('label',{className:'kl-profile-timezone-field'},'Time zone',this.offset),element('p',{className:'kl-custom-field-help',text:'Shown with your About details. Update the UTC offset when your clocks change.'}),this.#status);this.lock(true);
  }
  hydrate(profile:CloudProfile|undefined):void {
    this.#supported=this.enabled&&!!profile&&validProfileLanguages(profile.languages)&&validProfileOffset(profile.utcOffsetMinutes);
    for(const[language,input]of this.languages)input.checked=this.#supported&&profile!.languages!.includes(language);
    const legacy = this.languages.get(LEGACY_PROFILE_LANGUAGE)!;
    legacy.parentElement!.hidden = !legacy.checked;
    this.offset.value=this.#supported&&profile!.utcOffsetMinutes!==null?String(profile!.utcOffsetMinutes):'';this.lock(this.#locked);this.#render();
  }
  lock(locked:boolean):void {this.#locked=locked;for(const input of this.languages.values())input.disabled=locked||!this.#supported;this.offset.disabled=locked||!this.#supported;}
  snapshot():ProfileDetailsValue {return{languages:[...this.languages].filter(([,input])=>input.checked).map(([language])=>language),utcOffsetMinutes:this.offset.value===''?null:Number(this.offset.value)};}
  capture():ProfileDetailsValue|undefined {
    if(!this.#supported)return;const value=this.snapshot();
    if(!validProfileLanguages(value.languages)||!validProfileOffset(value.utcOffsetMinutes))throw new CloudError('invalid_profile_details',400);
    return value;
  }
  #render():void {this.#fieldset.hidden=!this.#supported;this.#status.textContent=this.#supported?this.snapshot().languages.length>6?'Choose up to 6 languages.':'':'Languages and time zone are not available on this Cloud server yet.';}
}
