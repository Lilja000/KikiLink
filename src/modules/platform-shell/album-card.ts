import { element } from '../../cloud/dom';
import type { Album } from './albums-panel';

/** Shared album preview card for the live collection and audience projection. */
export function albumCard(album:Pick<Album,'title'|'description'|'refs'>,preview:HTMLElement,audience:string,...actions:HTMLElement[]):HTMLElement {
  const count=album.refs.length;
  const cover=element('div',{className:'kl-al-cover'},preview,element('span',{className:'kl-al-count',text:`${count} ${count===1?'image':'images'}`}));
  const copy=element('div',{className:'kl-al-copy'},element('h3',{text:album.title,title:album.title}),
    element('p',{text:album.description||'A little collection of moments.'}),element('small',{text:audience}));
  return element('article',{className:'kl-al-card'},cover,copy,element('div',{className:'kl-al-actions'},...actions));
}
