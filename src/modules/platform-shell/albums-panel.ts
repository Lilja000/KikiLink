import {kikiIcon} from '../link-chat/icons';
import {element as makeElement} from '../../cloud/dom';
type Props=NonNullable<Parameters<typeof makeElement>[1]>&{disabled?:boolean;checked?:boolean;rows?:number;loading?:string;onClick?:()=>void};
function element<K extends keyof HTMLElementTagNameMap>(tag:K,props:Props={},...children:Array<Node|string|undefined>):HTMLElementTagNameMap[K]{
 const {onClick,...rest}=props,node=makeElement(tag,rest,...children);if(onClick)node.addEventListener('click',onClick);return node;
}
import {CloudClient,CloudError} from '../../cloud/client';
import {AlbumGenerationError,albumSource,requireAlbumSource,albumMetadata,albumPath,albumRead,albumBody,albumReceipt,reviewAlbum,type AlbumSource} from '../../cloud/album-generation';
import type {CloudMedia} from '../../cloud/types';
import {MediaViewer,type MediaViewerItem} from './media-viewer';
import {fitPanelDialog} from './panel-dialog-layout';
import {profileSectionLocked} from './profile-visibility-view';
import {albumCard} from './album-card';
export interface AlbumRef {id:string;caption:string;spoiler:boolean}
export interface Album {id:string;contextType:'profile'|'space';contextId:string;title:string;description:string;refs:AlbumRef[];revision:number;canManage:boolean;visibility:string}
interface Collection {contextType:'profile'|'space';contextId:string;title:string;canManage:boolean;visibility:string;items:Album[];limit:number}
interface Draft {source:AlbumSource;owner:number;origin:string;held?:boolean;album?:Album|undefined;title:string;description:string;refs:AlbumRef[];baseline:string;error:string;conflict?:Album|undefined}
interface Pending {method:'POST'|'PUT';path:string;body:Record<string,unknown>;remove:boolean}
interface Options {current():boolean;policy?(): 'always'|'ask'|'never'}
type AlbumOpener = 'cover'|'action';
const BASE='/v1/albums';
const message=(e:unknown):string=>{
 if(e instanceof AlbumGenerationError||e instanceof CloudError&&e.code==='recovery_generation_required')return new AlbumGenerationError().message;
 if(!(e instanceof CloudError))return 'The result is not confirmed. Retry the same request.';
 const errors:Record<string,string>={revision_conflict:'This album changed on another device. Review the latest version.',album_context_limit:'This collection already has 8 albums.',album_owner_limit:'You already created 40 albums.',invalid_album_media:'An image is unavailable. Remove it and add it again.',space_archived:'This space is archived. Changes are paused.',album_manager_required:'You no longer manage this collection.',image_size_limit:'Choose a JPEG, PNG or WebP up to 5 MB.',image_type:'Choose a JPEG, PNG or WebP image.',storage_quota:'Your image storage is full.',uploads_busy:'Another image is processing. Try again shortly.'};
 return errors[e.code]??(e.status===401?'Reconnect to Cloud to continue.':e.status===403||e.status===404?'These albums are no longer shared with you.':'Could not complete this request. Try again.');
};
const fingerprint=(d:Pick<Draft,'title'|'description'|'refs'>):string=>JSON.stringify([d.title,d.description,d.refs]);
/** Server-backed collection. Private bytes are never represented as public URLs. */
export class AlbumsPanel {
 readonly element=element('section',{className:'kl-albums',ariaLabel:'Photo albums',hidden:true});
 readonly #content=element('div',{className:'kl-al-content'});
 readonly #status=element('p',{className:'kl-al-status',role:'status'});
 readonly #dialog=element('dialog',{className:'kl-al-dialog',ariaLabel:'Album editor'});
 readonly #viewer=new MediaViewer();
 readonly #albumDialog=element('dialog',{className:'kl-al-view-dialog',ariaLabel:'Photo album'});
 readonly #albumContent=element('div',{className:'kl-al-view-content'});
 readonly #unsubscribe:()=>void;
 #type:'profile'|'space'='profile';#key='';#visible=false;#destroyed=false;#epoch=0;#request=0;#renderId=0;
 #collection:Collection|undefined;#selected:string|undefined;#draft:Draft|undefined;#pending:Pending|undefined;
 #profileReturn:{opener:AlbumOpener;scroller:HTMLElement|null;scrollTop:number}|undefined;
 #profileUnavailable=false;
 #busy=false;#uploading=false;#uploadId=0;#error='';#supported=false;#revealed=new Set<string>();#urls=new Set<string>();#editorUrls=new Set<string>();#editorRender=0;
 #source:AlbumSource|undefined;#owner:number;#origin:string;
 #previewPolicy:'always'|'ask'|'never';#mediaInvalidated=false;
 #timer:ReturnType<typeof setInterval>|undefined;#release:(()=>void)|undefined;
 constructor(readonly client:CloudClient,readonly options:Options){
  this.#owner=client.memberNumber;this.#origin=client.origin;this.#previewPolicy=this.#policy();
  this.#albumDialog.append(this.#albumContent);
  this.element.append(this.#status,this.#content,this.#albumDialog,this.#dialog,this.#viewer.element);
  this.#albumDialog.addEventListener('cancel',e=>{e.preventDefault();this.#closeAlbum();});
  this.#albumDialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();this.#closeAlbum();}});
  this.#dialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();const confirm=this.#dialog.querySelector('.kl-al-confirm');if(confirm){confirm.remove();this.#dialog.querySelector<HTMLElement>('[aria-label="Album title"]')?.focus();}else this.#closeEditor();}});
  this.#viewer.element.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.#viewer.close();}});
  this.#dialog.addEventListener('cancel',e=>{e.preventDefault();this.#closeEditor();});
  this.#unsubscribe=client.subscribe(kind=>{
   if(kind==='session'||!options.current()){
    this.#owner=client.memberNumber;this.#origin=client.origin;this.#epoch++;this.#request++;
    this.#draft=undefined;this.#pending=undefined;this.#busy=false;this.#uploading=false;
    if(this.#type==='profile'){this.#selected=undefined;this.#profileReturn=undefined;}
    this.#clear();
   }
   if(kind==='media-invalidated'){this.#concealMedia();this.#mediaInvalidated=true;}
   if(this.#visible&&(['session','ready','albums','spaces','communities','relationships','profiles-cleared','media-invalidated'].includes(kind)||kind===`profile:${this.#key}`))void this.refresh();
  });
 }
 get dirty():boolean{return !!this.#draft&&(fingerprint(this.#draft)!==this.#draft.baseline||this.#uploading||!!this.#pending);}
 notifyPolicyChanged():void{
  const policy=this.#policy();if(policy===this.#previewPolicy)return;this.#previewPolicy=policy;
  this.#concealMedia();if(!this.#valid()||this.#mediaInvalidated)return;
  this.#render();this.#refreshEditorPreviews();
 }
 open(type:'profile'|'space',key:string):void{
  if(type!==this.#type||key!==this.#key){
   this.#epoch++;this.#request++;this.#uploadId++;this.#draft=undefined;this.#pending=undefined;
   this.#busy=false;this.#uploading=false;this.#selected=undefined;this.#profileReturn=undefined;this.#clear();
  }
  this.#type=type;this.#key=key;
  this.element.classList.toggle('kl-albums--space',type==='space');
  this.element.classList.toggle('kl-albums--profile',type==='profile');
  this.setVisible(true);
 }
 setVisible(visible:boolean):void{
  this.element.hidden=!visible;if(this.#visible===visible||this.#destroyed)return;this.#visible=visible;
  if(visible){this.#release=this.client.retainEvents();this.#timer=setInterval(()=>void this.refresh(),30000);void this.refresh();}
  else{this.#request++;this.#release?.();this.#release=undefined;clearInterval(this.#timer);this.#clear();}
 }
 destroy():void{this.setVisible(false);this.#destroyed=true;this.#epoch++;this.#unsubscribe();this.#draft=undefined;this.#pending=undefined;this.#viewer.destroy();this.element.replaceChildren();}
 #valid(epoch=this.#epoch):boolean{return this.client.memberNumber===this.#owner&&this.client.origin===this.#origin&&!this.#destroyed&&this.#visible&&this.options.current()&&this.client.connected&&epoch===this.#epoch;}
 #releaseImages():void{this.#renderId++;for(const url of this.#urls)URL.revokeObjectURL(url);this.#urls.clear();}
 #releaseEditorImages():void{this.#editorRender++;for(const url of this.#editorUrls)URL.revokeObjectURL(url);this.#editorUrls.clear();}
 #concealMedia():void{
  this.#releaseEditorImages();this.#releaseImages();this.#viewer.close();this.#revealed.clear();
  for(const box of this.element.querySelectorAll<HTMLElement>('.kl-al-image,.kl-al-editor-preview'))box.replaceChildren(document.createTextNode(this.#policy()==='never'?'Images are disabled in your preview settings.':'Image preview'));
 }
 #refreshEditorPreviews():void{
  const draft=this.#draft;if(!draft||!this.#activeDraft(draft))return;this.#releaseEditorImages();
  for(const row of this.#dialog.querySelectorAll<HTMLElement>('.kl-al-editor-image')){
   const ref=draft.refs.find(ref=>ref.id===row.dataset.mediaId),preview=row.querySelector('.kl-al-editor-preview');
   if(ref&&preview)preview.replaceWith(this.#editorPreview(ref,draft));
  }
 }
 #clear():void{
  this.#releaseEditorImages();this.#releaseImages();this.#viewer.close();this.#collection=undefined;this.#revealed.clear();
  if(this.#type==='profile'){this.#profileUnavailable=false;this.#error='';this.#status.replaceChildren();}
  this.#content.replaceChildren();this.#albumDialog.close();this.#albumContent.replaceChildren();if(this.#dialog.open)this.#dialog.close();this.#dialog.replaceChildren();
 }
 #button(label:string,action:()=>void,primary=false):HTMLButtonElement{const button=element('button',{type:'button',text:label,className:`kl-text-button${primary?' kl-text-button--primary':''}`,disabled:this.#busy||this.#uploading||!!this.#pending,onClick:()=>{if(button.isConnected&&this.element.contains(button)&&!button.disabled&&this.#valid()&&(!button.closest('dialog')||(button.closest('dialog') as HTMLDialogElement).open))action();}});return button;}
 #sameDraft(d:Draft,epoch=this.#epoch):boolean{return !this.#destroyed&&this.options.current()&&epoch===this.#epoch&&this.#draft===d&&this.client.memberNumber===d.owner&&this.client.origin===d.origin;}
 #activeDraft(d:Draft):boolean{return this.#sameDraft(d)&&this.#valid()&&this.#dialog.open&&this.#dialog.isConnected;}
 #media(id:string,source:AlbumSource|undefined):Promise<Blob>{return this.client.media(id,undefined,{fresh:true,...source?.required?{recoveryGeneration:source.generation!}:{}});}
 async refresh():Promise<void>{
  this.notifyPolicyChanged();if(!this.#visible||this.#busy||!this.#key)return;const request=++this.#request,epoch=this.#epoch;
  this.element.setAttribute('aria-busy','true');
  try{
   if(!this.client.connected)throw new CloudError('not_connected',401);
   const me=await this.client.request<{memberNumber:number;features?:{albums?:boolean}}>('GET','/v1/me');
   if(!this.#valid(epoch)||request!==this.#request)return;if(me.memberNumber!==this.#owner)throw new Error('Cloud account changed.');this.#supported=!!me.features?.albums;
   if(!this.#supported){this.#clear();this.#status.textContent='Albums will be available after the server update.';return;}
   const source=albumSource(me);if(this.#draft)requireAlbumSource(this.#draft.source,source);
   const value=await this.client.request('GET',albumPath(`${BASE}?contextType=${this.#type}&contextId=${encodeURIComponent(this.#key)}`,source));
   const next=albumRead(value,source) as Collection;
   if(!this.#valid(epoch)||request!==this.#request)return;
   const unchanged=JSON.stringify(next)===JSON.stringify(this.#collection);this.#collection=next;this.#source=source;this.#error='';this.#profileUnavailable=false;
   if(this.#selected&&!next.items.some(a=>a.id===this.#selected)){this.#selected=undefined;this.#profileReturn=undefined;this.#viewer.close();}
   if(this.#draft&&!this.#pending&&(!next.canManage||this.#draft.album&&!next.items.some(a=>a.id===this.#draft!.album!.id))){this.#draft=undefined;this.#pending=undefined;this.#dialog.close();this.#dialog.replaceChildren();}
   if(!unchanged||this.#mediaInvalidated){this.#mediaInvalidated=false;this.#revealed.clear();this.#render();this.#refreshEditorPreviews();}else this.#status.textContent='';
   if(this.#draft&&!this.#dialog.open)this.#paintEditor();
   this.#viewer.refresh();
  }catch(e){
   if(!this.#valid(epoch)||request!==this.#request)return;
   this.#clear();this.#error=message(e);
   this.#profileUnavailable=this.#type==='profile'&&e instanceof CloudError&&[403,404].includes(e.status);
   if(this.#profileUnavailable){this.#selected=undefined;this.#profileReturn=undefined;}
   if(e instanceof AlbumGenerationError||e instanceof CloudError&&e.code==='recovery_generation_required'){
    if(this.#draft){this.#draft.held=true;this.#draft.error=this.#error;this.#paintEditor();}
   }else if(e instanceof CloudError&&[401,403,404].includes(e.status)){this.#draft=undefined;this.#pending=undefined;}
   this.#render();
  }
  finally{if(request===this.#request)this.element.setAttribute('aria-busy','false');}
 }
 #policy(): 'always'|'ask'|'never'{return this.options.policy?.()??'ask';}
 #visibleRefs(album:Album):AlbumRef[]{return this.#policy()==='never'?[]:album.refs.filter(r=>!r.spoiler&&this.#policy()==='always'||this.#revealed.has(r.id));}
 #render():void{
  this.#releaseImages();this.#status.replaceChildren();
  if(this.#error){
   if(!this.#profileUnavailable)this.#status.append(this.#error);
   this.#status.append(this.#button('Retry loading',()=>void this.refresh()));
  }
  if(this.#profileUnavailable){
   this.#content.replaceChildren(profileSectionLocked('kl-al-private','Albums are unavailable',this.#error));
   return;
  }
  const c=this.#collection;this.#content.replaceChildren();if(!c)return;
  const heading=element('header',{className:'kl-al-heading'},element('div',{},element('h2',{text:this.#type==='space'?'Space albums':'Photo albums'}),element('p',{text:this.#type==='space'?'A shared collection for this Space. Its access settings apply.':`Album audience · ${c.visibility==='everyone'?'Everyone':c.visibility==='friends'?'Friends':'Only me'}.`})));
  if(c.canManage){const create=this.#button('Create album',()=>this.#edit(),true);create.prepend(kikiIcon('plus'));create.disabled ||= c.items.length>=c.limit;heading.append(create);}
  this.#content.append(heading);
  const album=c.items.find(a=>a.id===this.#selected);
  this.#albumContent.replaceChildren();
  if(album&&!this.#draft){
   const close=this.#button('Close album viewer',()=>this.#closeAlbum());
   close.className='kl-icon-button';close.setAttribute('aria-label','Close album viewer');close.replaceChildren(kikiIcon('close'));
   const head=element('header',{className:'kl-al-view-heading'},element('div',{},element('span',{className:'kl-al-kicker',text:this.#type==='space'?'KIKILINK':'KikiLink'}),element('h2',{text:album.title})),close);
   const body=element('div',{className:'kl-al-view-body'},element('p',{className:'kl-al-view-description',text:album.description||'A little collection of moments.'}));
   if(album.refs.length){
    const grid=element('div',{className:'kl-al-photos'});
    for(const r of album.refs)grid.append(element('figure',{},this.#image(r,album),r.caption?element('figcaption',{text:r.caption}):undefined));
    body.append(grid);
   }else body.append(element('div',{className:'kl-al-empty'},
    element('h3',{text:'This album is waiting for its first image'}),
    element('p',{text:this.#type==='space'||album.canManage?'Edit the album to add photos from your device.':'Photos will appear here when they are added.'})));
   body.append(element('p',{className:'kl-al-note',text:this.#type==='space'?'Visibility follows this Space’s access settings. Images are saved in KikiLink Cloud.':'Visibility follows the profile’s album audience.'}));
   const footer=element('footer',{className:'kl-al-actions kl-al-view-actions'});
   if(album.canManage)footer.append(this.#button('Edit album',()=>this.#edit(album),true));
   const finish=this.#button('Close',()=>this.#closeAlbum());
   if(this.#type==='profile')finish.setAttribute('aria-label','Close album');
   footer.append(finish);
   this.#albumContent.append(head,body,footer);
   if(!this.#albumDialog.open){
    this.#albumDialog.showModal();
    fitPanelDialog(this.#albumDialog);
    footer.querySelector('button')?.focus();
   }
  }else this.#albumDialog.close();
  {
   const grid=element('div',{className:'kl-al-grid'});for(const a of c.items){
    let preview:HTMLElement;
    if(a.refs[0])preview=this.#image(a.refs[0],a,true);
    else {const empty=this.#albumButton(a,'cover');empty.className='kl-al-placeholder';empty.replaceChildren(kikiIcon('image'),element('span',{text:'Add your first image'}));preview=empty;}
    const actions=[this.#albumButton(a,'action')];
    if(a.canManage){const edit=this.#button('Edit',()=>this.#edit(a));edit.prepend(kikiIcon('edit'));actions.push(edit);}
    const card=albumCard(a,preview,this.#type==='space'?'Follows Space access':'Follows profile album audience',...actions);
    card.dataset.albumId=a.id;grid.append(card);
   }this.#content.append(grid);
   if(!c.items.length)this.#content.append(element('div',{className:'kl-al-empty'},kikiIcon('image'),element('h3',{text:'No photo albums yet'}),element('p',{text:c.canManage?'Create an album, then add images, captions and little details.':'Photos shared here will appear as albums.'})));
  }
  this.#content.append(element('p',{className:'kl-al-note',text:`${c.items.length}/${c.limit} albums in this collection. Images are saved in KikiLink Cloud.`}));
 }
 async openItem(id:string):Promise<void>{
  const epoch=this.#epoch;await this.refresh();if(!this.#valid(epoch))return;
  if(!this.#collection)return;
  if(this.#collection.items.some(a=>a.id===id))this.#openAlbum(id);
  else this.#status.textContent='This album is no longer available.';
 }
 #albumButton(album:Album,opener:AlbumOpener):HTMLButtonElement{
  const label=opener==='cover'?`Open ${album.title}`:'Open album';
  const button=this.#button(label,()=>this.#openAlbum(album.id,opener));
  if(this.#type==='profile'){
   button.dataset.albumOpener=opener;
   if(opener==='cover')button.setAttribute('aria-label',label);
  }
  return button;
 }
 #openAlbum(id:string,opener?:AlbumOpener):void{
  if(this.#type==='profile'){
   const scroller=this.element.closest<HTMLElement>('.kl-addon-profile-body');
   this.#profileReturn=opener?{opener,scroller,scrollTop:scroller?.scrollTop??0}:undefined;
  }
  this.#selected=id;this.#render();
 }
 #closeAlbum():void{
  const id=this.#selected,returnTo=this.#profileReturn;
  this.#selected=undefined;this.#profileReturn=undefined;this.#viewer.close();this.#render();
  const card=[...this.#content.querySelectorAll<HTMLElement>('[data-album-id]')].find(n=>n.dataset.albumId===id);
  if(this.#type==='space'){card?.querySelector<HTMLElement>('button')?.focus();return;}
  const target=card?.querySelector<HTMLElement>(`[data-album-opener="${returnTo?.opener??'action'}"]`)
   ??card?.querySelector<HTMLElement>('[data-album-opener="action"]');
  target?.focus({preventScroll:true});
  if(returnTo?.scroller?.isConnected)returnTo.scroller.scrollTop=returnTo.scrollTop;
 }
 #image(ref:AlbumRef,album:Album,cover=false):HTMLElement{
  const space=this.#type==='space',policy=this.#policy();
  const box=element('div',{className:`kl-al-image${space?(cover?' kl-al-image--cover':' kl-al-image--inline'):''}`}),open=()=>this.#showImage(album,ref.id);
  if(policy==='never'){box.classList.add('kl-al-image--consent');box.textContent='Images are disabled in your preview settings.';return box;}
  if(this.#mediaInvalidated){box.textContent='Loading image…';return box;}
  if(space&&cover&&ref.spoiler){
   const hidden=this.#button(`Open ${album.title}`,()=>this.#openAlbum(album.id));hidden.className='kl-al-placeholder';hidden.setAttribute('aria-label',`Open ${album.title}`);hidden.replaceChildren(kikiIcon('eye-off'),element('span',{text:'Hidden image'}));box.append(hidden);return box;
  }
  if(!this.#visibleRefs(album).some(r=>r.id===ref.id)){
   const reveal=this.#button(ref.spoiler?'Reveal hidden image':'Show image',()=>{this.#revealed.add(ref.id);this.#render();});
   if(cover){reveal.classList.add('kl-al-cover-reveal');reveal.prepend(kikiIcon(ref.spoiler?'eye-off':'image'));}
   else if(space&&policy==='ask'){
    box.classList.add('kl-al-image--consent');reveal.classList.add('kl-al-image-link');reveal.setAttribute('aria-label',ref.spoiler?'Reveal hidden image':'Show image');
    reveal.replaceChildren(kikiIcon('image'),element('span',{text:ref.spoiler?'Spoiler image':ref.caption||album.title}),kikiIcon('eye'));
   }else if(space){
    box.classList.add('kl-al-image--concealed');reveal.classList.add('kl-al-image-mask');reveal.setAttribute('aria-label','Reveal hidden image');reveal.replaceChildren(kikiIcon('eye'),element('strong',{text:'Spoiler image'}));
   }
   box.append(reveal);return box;
  }
  const epoch=this.#epoch,render=this.#renderId;
  const profileCover=!space&&cover?this.#albumButton(album,'cover'):undefined;
  if(profileCover){profileCover.classList.add('kl-al-placeholder');profileCover.textContent='Loading image…';box.append(profileCover);}
  else box.textContent='Loading image…';
  void this.#media(ref.id,this.#source).then(blob=>{
   if(!this.#valid(epoch)||render!==this.#renderId||this.#policy()!==policy||!this.#visibleRefs(album).some(r=>r.id===ref.id)||!this.#collection?.items.some(a=>a.id===album.id&&a.refs.some(r=>r.id===ref.id)))return;
   const url=URL.createObjectURL(blob);this.#urls.add(url);const img=element('img',{alt:ref.caption||album.title,loading:'lazy'});
   if(space&&!cover&&album.refs.length===1)img.addEventListener('load',()=>{
    if(!this.#valid(epoch)||render!==this.#renderId||this.#policy()!==policy||!img.isConnected||box.querySelector('img')!==img||!this.#visibleRefs(album).some(r=>r.id===ref.id)||!img.naturalWidth||!img.naturalHeight)return;
    box.style.aspectRatio=String(Math.max(.5,Math.min(3,img.naturalWidth/img.naturalHeight)));
   },{once:true});
   const b=profileCover??this.#button(cover?`Open ${album.title}`:'View image',()=>{
    if(cover){this.#openAlbum(album.id);return;}
    if(!space)b.focus({preventScroll:true});
    open();
   });
   b.classList.remove('kl-al-placeholder');b.replaceChildren(img);b.setAttribute('aria-label',cover?`Open ${album.title}`:'View image');
   if(!profileCover)box.replaceChildren(b);
   img.src=url;
  }).catch(()=>{if(this.#valid(epoch)&&render===this.#renderId){box.replaceChildren(document.createTextNode('Image unavailable'),this.#button('Retry image',()=>this.#render()));this.#viewer.close();}});
  return box;
 }
 #showImage(album:Album,id:string):void{
  if(this.#mediaInvalidated)return;
  const epoch=this.#epoch,source=this.#source;
  this.#viewer.show(()=>{
   const a=this.#valid(epoch)?this.#collection?.items.find(x=>x.id===album.id):undefined;if(!a)return [];
   return this.#visibleRefs(a).map((ref):MediaViewerItem=>({id:ref.id,title:this.#type==='space'?a.title:ref.caption||a.title,...this.#type==='space'?{caption:ref.caption}:{},detail:this.#type==='space'?'Image saved in KikiLink Cloud.':a.title,load:async signal=>{
    const fresh=(await reviewAlbum<Album>(this.client,`${BASE}/${a.id}`,()=>this.#valid(epoch),source)).value;
    if(signal.aborted||!this.#valid(epoch)||!fresh.refs.some(r=>r.id===ref.id&&(!r.spoiler||this.#revealed.has(r.id))))throw new Error('Image no longer available.');
    const blob=await this.#media(ref.id,source);const current=(await reviewAlbum<Album>(this.client,`${BASE}/${a.id}`,()=>this.#valid(epoch),source)).value;if(signal.aborted||!this.#valid(epoch)||this.#policy()==='never'||!current.refs.some(r=>r.id===ref.id&&(!r.spoiler||this.#revealed.has(r.id))))throw new Error('Image no longer available.');
    const url=URL.createObjectURL(blob);return {url,release:()=>URL.revokeObjectURL(url)};
   }}));
  },id,this.#type==='space'?'space-album':undefined);
 }
 #edit(album?:Album):void{
  if(!this.#source||!this.#collection?.canManage||this.#pending||!this.#valid())return;this.#viewer.close();this.#albumDialog.close();
  const draft:Draft={source:this.#source,owner:this.#owner,origin:this.#origin,album,title:album?.title??'',description:album?.description??'',refs:structuredClone(album?.refs??[]),baseline:'',error:''};draft.baseline=fingerprint(draft);this.#draft=draft;this.#paintEditor();
 }
 #field(label:string,value:string,max:number,change:(value:string)=>void,multiline=false,placeholder?:string):HTMLElement{
  const input=multiline?element('textarea',{ariaLabel:label,maxLength:max,rows:3}):element('input',{ariaLabel:label,maxLength:max});input.value=value;
  if(placeholder)input.placeholder=placeholder;
  input.disabled=this.#busy||this.#uploading||!!this.#pending;const draft=this.#draft,counter=element('small',{className:'kl-al-counter',text:`${value.length}/${max}`});
  input.addEventListener('input',()=>{if(this.#draft!==draft||!this.#valid()||!input.isConnected)return;change(input.value);counter.textContent=`${input.value.length}/${max}`;});
  return element('label',{className:'kl-al-field'},element('span',{text:label}),input,counter);
 }
 #paintEditor(focusImage?:number,focusAction?:'up'|'down'|'remove'):void{
  const d=this.#draft;if(!d||!this.#valid())return;this.#releaseEditorImages();this.#dialog.replaceChildren();
  const space=this.#type==='space';
  const status=element('p',{role:'status',className:`kl-al-status${space&&!d.error&&!d.title.trim()?' kl-al-validation':''}`,text:d.error||(space&&!d.title.trim()?'Give your album a title.':'')});
  const heading=element('header',{className:'kl-al-editor-heading'},
   element('div',{},element('span',{className:'kl-al-kicker',text:space?'KIKILINK':'KikiLink'}),element('h2',{text:d.album?'Edit photo album':'Create photo album'})),
   element('button',{type:'button',className:'kl-icon-button',ariaLabel:'Close album editor',onClick:()=>{if(this.#activeDraft(d))this.#closeEditor();}},kikiIcon('close')));
  const title=this.#field('Album title',d.title,64,v=>{d.title=v;save.disabled=!v.trim()||this.#busy||this.#uploading||!!this.#pending||!!d.conflict;if(space){status.textContent=d.error||(!v.trim()?'Give your album a title.':'');status.classList.toggle('kl-al-validation',!d.error&&!v.trim());}},false,space?'An autumn evening':undefined);
  if(space)title.querySelector('input')!.required=true;
  const description=this.#field('Description',d.description,600,v=>{d.description=v;},true,space?'A few words about this collection…':undefined);
  if(space)description.querySelector('span')!.append(' ',element('span',{className:'kl-al-optional',text:'(optional)'}));
  const body=element('div',{className:'kl-al-editor-body'},
   element('p',{className:'kl-al-note',text:space?`${this.#collection?.title??'Space gallery'} · Follows Space access`:'Follows profile album audience'}),title,description);
  const list=element('div',{className:'kl-al-editor-images'});
  for(const [i,r] of d.refs.entries()){
   const spoiler=element('input',{className:'kl-sr-only',type:'checkbox',ariaLabel:`Hide image ${i+1}`,checked:r.spoiler,disabled:this.#busy||this.#uploading||!!this.#pending});
   const spoilerLabel=element('span',{text:r.spoiler?'Spoiler on':'Spoiler off'});
   spoiler.addEventListener('change',()=>{if(this.#draft===d&&this.#valid()&&spoiler.isConnected){r.spoiler=spoiler.checked;spoilerLabel.textContent=r.spoiler?'Spoiler on':'Spoiler off';this.#refreshEditorPreviews();}});
   const up=this.#button('Move up',()=>{if(this.#draft!==d||!this.#valid()||!up.isConnected)return;[d.refs[i-1],d.refs[i]]=[d.refs[i]!,d.refs[i-1]!];this.#paintEditor(i-1,'up');});up.disabled ||= i===0;
   const down=this.#button('Move down',()=>{if(this.#draft!==d||!this.#valid()||!down.isConnected)return;[d.refs[i],d.refs[i+1]]=[d.refs[i+1]!,d.refs[i]!];this.#paintEditor(i+1,'down');});down.disabled ||= i===d.refs.length-1;
   const remove=this.#button('Remove image',()=>{if(this.#draft!==d||!this.#valid())return;d.refs.splice(i,1);this.#paintEditor(Math.min(i,d.refs.length-1),'remove');});
   for(const [button,label,icon,kind] of [[up,'Move up','arrow-right','up'],[down,'Move down','arrow-right','down'],[remove,'Remove image','close','remove']] as const){
    button.title=label;button.className=`kl-icon-button kl-al-photo-${kind}`;
    button.replaceChildren(kikiIcon(icon),element('span',{className:'kl-sr-only',text:label}));
   }
   const preview=this.#editorPreview(r,d);
   const caption=this.#field(`Caption ${i+1}`,r.caption,200,v=>{r.caption=v;});
   if(space){const label=caption.querySelector('span')!,counter=caption.querySelector('small')!;label.textContent='Caption';label.append(' ',counter);}
   const name=element('strong',{text:i===0?'Image 1 · Cover':`Image ${i+1}`}),actions=element('div',{className:'kl-al-actions'},up,down,element('label',{className:'kl-al-spoiler'},spoiler,kikiIcon(space?'eye':'eye-off'),spoilerLabel),remove);
   const row=element('div',{className:'kl-al-editor-image'},preview,...space?[element('div',{className:'kl-al-editor-fields'},name,caption,actions)]:[name,caption,actions]);row.dataset.mediaId=r.id;list.append(row);
  }
  const input=element('input',{type:'file',accept:'image/jpeg,image/png,image/webp',multiple:true,ariaLabel:'Add photos'});input.disabled=this.#busy||this.#uploading||!!this.#pending||d.refs.length>=20;
  input.addEventListener('change',()=>{const files=Array.from(input.files??[]);input.value='';if(this.#activeDraft(d)&&input.isConnected&&this.#dialog.contains(input))void this.#upload(files,d);});
  const uploadLabel=element('span',{},kikiIcon('image'),space?'Images ':`Add photos · ${d.refs.length}/20`,space?element('small',{text:`${d.refs.length}/20`}):undefined);
  if(space){const hint=element('small',{className:'kl-al-upload-limit',text:'JPEG, PNG or WebP · up to 5 MB each.'});hint.id=`kl-album-image-help-${crypto.randomUUID()}`;input.setAttribute('aria-describedby',hint.id);uploadLabel.append(hint);}
  body.append(element('section',{className:'kl-al-upload'},
   element('label',{className:'kl-al-field'},uploadLabel,input),
   space?undefined:element('p',{className:'kl-al-note',text:'JPEG, PNG or WebP, up to 5 MB each.'}),list),status);
  const save=this.#button(d.album?'Save album':'Create album',()=>this.#save(),true);save.disabled ||= !d.title.trim()||!!d.conflict;
  const actions=element('footer',{className:'kl-al-actions kl-al-editor-actions'},this.#button('Cancel',()=>this.#closeEditor()),save);
  if(d.album){const remove=this.#button('Delete album',()=>this.#confirmDelete());remove.classList.add('kl-text-button--danger','kl-al-editor-delete');actions.prepend(remove);}
  if(this.#pending){const retry=element('button',{type:'button',className:'kl-text-button',text:'Retry save',disabled:this.#busy,onClick:()=>{if(this.#activeDraft(d)&&retry.isConnected&&this.#dialog.contains(retry))void this.#send();}});actions.append(retry);}
  if(d.conflict){const fresh=d.conflict;body.append(element('p',{text:`Latest version: ${fresh.title}`}),this.#button('Use latest version',()=>this.#edit(fresh)),this.#button('Keep my draft',()=>{d.album=fresh;d.conflict=undefined;d.error='';this.#paintEditor();}));}
  if(d.held){const review=element('button',{type:'button',className:'kl-text-button',text:'Discard draft and review',disabled:this.#busy,onClick:()=>{if(!this.#activeDraft(d)||!review.isConnected)return;this.#confirm('Review the current collection?','This discards this local album draft and forgets its pending request. It does not undo a change already saved in Cloud.','Discard draft and review',()=>{if(this.#draft!==d)return;this.#draft=undefined;this.#pending=undefined;this.#dialog.close();this.#clear();void this.refresh();});}});actions.append(review);}
  this.#dialog.append(heading,body,actions);
  if(space)this.#dialog.append(element('div',{className:'kl-al-warning'}));
  if(!this.#dialog.open){
   this.#dialog.showModal();
   fitPanelDialog(this.#dialog);
   title.querySelector('input')?.focus();
  }
  if(focusImage!==undefined){
   const row=this.#dialog.querySelectorAll<HTMLElement>('.kl-al-editor-image')[focusImage],action=space&&focusAction?row?.querySelector<HTMLButtonElement>(`.kl-al-photo-${focusAction}:not(:disabled)`):undefined;
   (action??row?.querySelector<HTMLInputElement>(`[aria-label="Caption ${focusImage+1}"]`)??(space?input:undefined))?.focus();
  }
 }
 #editorPreview(ref:AlbumRef,draft:Draft):HTMLElement{
  const preview=element('div',{className:'kl-al-editor-preview',text:ref.spoiler?'Hidden image':'Image preview'});
  if(draft.held||this.#mediaInvalidated||ref.spoiler||this.#policy()==='never')return preview;
  const policy=this.#policy(),load=()=>{if(!this.#sameDraft(draft)||!this.#valid()||this.#policy()!==policy||ref.spoiler)return;const epoch=this.#epoch,render=this.#editorRender;preview.textContent='Loading…';void this.#media(ref.id,draft.source).then(blob=>{
   if(!this.#valid(epoch)||render!==this.#editorRender||this.#draft!==draft||this.#policy()!==policy||ref.spoiler)return;
   const url=URL.createObjectURL(blob);this.#editorUrls.add(url);preview.replaceChildren(element('img',{src:url,alt:ref.caption||'Album image'}));
  }).catch(()=>{if(this.#valid(epoch)&&render===this.#editorRender){preview.replaceChildren(document.createTextNode('Image unavailable'),this.#button('Retry preview',load));}});};
  if(this.#policy()==='always')load();else preview.append(this.#button('Preview',load));return preview;
 }
 async #upload(files:File[],draft:Draft):Promise<void>{
  if(!files.length||this.#busy||this.#uploading||this.#pending||!this.#activeDraft(draft))return;
  if(draft.refs.length+files.length>20){draft.error='An album can contain up to 20 images. Choose fewer photos.';this.#paintEditor();return;}
  if(files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||!f.size||f.size>5*1024**2)){draft.error='Choose JPEG, PNG or WebP images up to 5 MB each.';this.#paintEditor();return;}
  const epoch=this.#epoch,uploadId=++this.#uploadId;this.#uploading=true;draft.error='Uploading photos…';this.#paintEditor();
  try{for(const file of files){const valid=()=>this.#activeDraft(draft)&&epoch===this.#epoch&&uploadId===this.#uploadId;const fresh=await albumMetadata(this.client,valid);requireAlbumSource(draft.source,fresh);if(!valid())return;const raw=await this.client.request('POST',albumPath(`/v1/album-images/${this.#type}/${encodeURIComponent(this.#key)}`,draft.source),file);if(!valid())return;const asset=albumRead(raw,draft.source) as CloudMedia;if(!asset||typeof asset.id!=='string'||draft.source.required&&(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(asset.id)||asset.kind!=='feed'||![asset.bytes,asset.width,asset.height].every(v=>Number.isSafeInteger(v)&&v>0)))throw new Error('Image upload was not confirmed.');draft.refs.push({id:asset.id,caption:'',spoiler:false});}draft.error='Photos uploaded. Save the album to keep them.';}
  catch(e){if(this.#sameDraft(draft,epoch)){draft.error=message(e);if(e instanceof AlbumGenerationError||e instanceof CloudError&&e.code==='recovery_generation_required')draft.held=true;}}
  finally{if(epoch===this.#epoch&&uploadId===this.#uploadId){this.#uploading=false;if(this.#valid(epoch)&&this.#draft===draft)this.#paintEditor();}}
 }
 #closeEditor():void{
  const d=this.#draft;if(!d||this.#busy||this.#pending)return;
  if(this.dirty){this.#confirm('Discard these album changes?',this.#type==='space'?`${this.#uploading?'The image import will be cancelled. ':''}Your unsaved album details and image changes will be lost.`:'Unsaved details and image changes will be lost.','Discard changes',()=>{this.#uploadId++;this.#uploading=false;this.#draft=undefined;this.#releaseEditorImages();this.#dialog.close();this.#dialog.replaceChildren();this.#render();});return;}
  this.#draft=undefined;this.#releaseEditorImages();this.#dialog.close();this.#dialog.replaceChildren();this.#render();
 }
 #confirm(title:string,copy:string,label:string,action:()=>void):void{
  const area=element('div',{className:'kl-al-confirm',role:'alert'},element('h3',{text:title}),element('p',{text:copy}));
  area.append(element('button',{type:'button',className:`kl-text-button${this.#type==='space'&&label==='Discard changes'?' kl-text-button--primary':''}`,text:'Keep editing',onClick:()=>{area.remove();this.#dialog.querySelector<HTMLElement>('[aria-label="Album title"]')?.focus();}}),element('button',{type:'button',className:'kl-text-button kl-text-button--danger',text:label,onClick:()=>{if(area.isConnected&&this.#valid())action();}}));this.#dialog.querySelector('.kl-al-confirm')?.remove();this.#dialog.querySelector(this.#type==='space'?'.kl-al-warning':'.kl-al-editor-body')?.append(area);area.querySelector('button')?.focus();
 }
 #confirmDelete():void{const d=this.#draft,a=d?.album;if(!a||!d||!this.#activeDraft(d))return;this.#confirm('Delete this album?','The album and its captions will be removed. Photos used by other albums stay available.','Delete permanently',()=>{if(this.#draft!==d||!this.#activeDraft(d))return;this.#pending={method:'POST',path:`${BASE}/${a.id}/delete`,body:{operationId:crypto.randomUUID(),revision:a.revision},remove:true};void this.#send();});}
 #save():void{
  const d=this.#draft;if(!d||!this.#activeDraft(d)||!d.title.trim()||d.conflict||this.#busy||this.#uploading||this.#pending)return;
  this.#pending={method:d.album?'PUT':'POST',path:d.album?`${BASE}/${d.album.id}`:BASE,body:structuredClone({operationId:crypto.randomUUID(),...(d.album?{revision:d.album.revision}:{contextType:this.#type,contextId:this.#key}),title:d.title.trim(),description:d.description,refs:d.refs}),remove:false};void this.#send();
 }
 async #send():Promise<void>{
  const pending=this.#pending,d=this.#draft;if(!pending||!d||this.#busy||!this.#activeDraft(d))return;const epoch=this.#epoch;this.#busy=true;d.error='Saving…';this.#paintEditor();
  const valid=()=>this.#activeDraft(d)&&this.#pending===pending&&epoch===this.#epoch;
  try{
   const fresh=await albumMetadata(this.client,valid);requireAlbumSource(d.source,fresh);if(!valid())return;
   const raw=await this.client.request(pending.method,pending.path,albumBody(pending.body,d.source));
   if(!this.#sameDraft(d,epoch)||this.#pending!==pending)return;
   const result=albumReceipt(raw,d.source,d.owner,pending.body.operationId as string,pending.remove?'delete':d.album?'save':'create',d.album?.id,(d.album?.revision??0)+1);
   this.#pending=undefined;this.#draft=undefined;this.#selected=pending.remove?undefined:result.albumId;this.#releaseEditorImages();this.#dialog.close();this.#dialog.replaceChildren();
  }catch(e){
   if(!this.#sameDraft(d,epoch)||this.#pending!==pending)return;d.error=message(e);
   if(e instanceof AlbumGenerationError||e instanceof CloudError&&e.code==='recovery_generation_required'){d.held=true;}
   else if(e instanceof CloudError&&e.status>=400&&e.status<500){
    if(e.code==='revision_conflict'&&d.album){
     try{const fresh=await reviewAlbum<Album>(this.client,`${BASE}/${d.album.id}`,valid,d.source);if(!valid())return;d.conflict=fresh.value;this.#pending=undefined;}
     catch(error){if(this.#sameDraft(d,epoch)){d.error=message(error);if(error instanceof AlbumGenerationError||error instanceof CloudError&&error.code==='recovery_generation_required')d.held=true;}}
    }else if(!['operation_conflict'].includes(e.code))this.#pending=undefined;
    if([401,403,404].includes(e.status)){this.#draft=undefined;this.#pending=undefined;this.#clear();}
   }
  }finally{if(epoch===this.#epoch){this.#busy=false;if(this.#valid(epoch)){this.#render();if(this.#draft)this.#paintEditor();await this.refresh();}}}
 }
}
