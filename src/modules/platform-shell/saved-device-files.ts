import {SavedDeviceFiles,type SavedDeviceFile,type SavedFileReferences} from '../../storage/saved-device-files';
import {AccountKeyValueStorage} from '../../storage/account-data-storage';
import {FEED_DRAFT_METADATA_KEY,parseMetadata,metadataFiles} from '../../cloud/feed-draft-metadata';
import type {SettingsStore} from '../../core/settings';
import {element,focusedElement} from '../../utils/dom';

export function savedDeviceFileReferences(owner:number,settings:SettingsStore):SavedFileReferences {
 const baseline=settings.musicImportSnapshot(),music=new Set<string>();
 for(const playlist of JSON.parse(baseline.canonical).linkMusic.playlists)for(const track of playlist.tracks)if(track.source==='local')music.add(track.locator);
 const raw=new AccountKeyValueStorage(owner).getItem(FEED_DRAFT_METADATA_KEY),draft=parseMetadata(raw);
 return {token:JSON.stringify([baseline.canonical,baseline.saved,raw]),music,feed:new Set(draft?metadataFiles(draft).map(f=>f.id):[])};
}
export class SavedDeviceFilesPanel {
 readonly element=element('section',{className:'kl-setting-group',ariaLabel:'Saved device files'});
 readonly #dialog=element('dialog',{className:'kl-dialog kl-cm-dialog',ariaLabel:'Saved device files'});
 readonly #body=element('div',{className:'kl-dialog-body'});
 readonly #status=element('p',{className:'kl-setting-help'});
 readonly #rows=element('div',{className:'kl-saved-file-list'});
 readonly #refresh:HTMLButtonElement;
 readonly #store:SavedDeviceFiles;
 #controller:AbortController|undefined;#epoch=0;#closed=false;#busy=false;#files:SavedDeviceFile[]=[];#page=0;#focus:HTMLElement|undefined;#urls=new Set<string>();
 constructor(readonly owner:number,settings:SettingsStore,readonly current:()=>boolean,readonly beforeOpen:()=>void,repository?:SavedDeviceFiles){
  this.#store=repository??new SavedDeviceFiles(owner,()=>savedDeviceFileReferences(owner,settings));
  this.#status.setAttribute('role','status');
  this.#refresh=this.#button('Refresh saved files',()=>void this.#load());
  this.#dialog.append(element('style',{text:'.kl-saved-file-list{display:flex;flex-direction:column;gap:12px;min-width:0}.kl-saved-file-list>.kl-setting-group{margin:0;padding:12px;border:1px solid var(--kl-border);border-radius:12px;min-width:0;overflow-wrap:anywhere}.kl-saved-file-list p{margin:6px 0}'}),element('header',{className:'kl-dialog-header'},element('h2',{text:'Saved device files'})),this.#body,
   element('footer',{className:'kl-dialog-footer'},this.#refresh,this.#button('Close saved files',()=>this.close())));
  this.#body.append(element('p',{className:'kl-setting-help',text:'Music and Feed files stay on this device when their links are removed. Download a copy before removing a file permanently. Files in use or in an unfinished import are protected.'}),this.#status,this.#rows);
  this.#dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
  this.element.append(element('h3',{text:'Saved device files'}),element('p',{className:'kl-setting-help',text:'Review music and Feed images kept on this device, including files without a current playlist or draft link.'}),this.#button('Review saved files',()=>this.open()),this.#dialog);
 }
 #valid(epoch=this.#epoch):boolean{return !this.#closed&&this.current()&&this.#dialog.open&&epoch===this.#epoch&&!this.#controller?.signal.aborted;}
 #button(text:string,run:()=>void,disabled=false):HTMLButtonElement{const button=element('button',{type:'button',className:'kl-text-button',text,onClick:()=>{if(!this.#closed&&this.current())run();}});button.disabled=disabled;return button;}
 open():void{if(this.#closed||!this.current())return;this.beforeOpen();this.#focus=focusedElement(this.element);this.#dialog.showModal();this.#page=0;void this.#load();}
 close():void{this.#epoch++;this.#controller?.abort();this.#controller=undefined;this.#busy=false;this.#files=[];this.#rows.replaceChildren();for(const url of this.#urls)URL.revokeObjectURL(url);this.#urls.clear();if(this.#dialog.open)this.#dialog.close();if(this.#focus?.isConnected)this.#focus.focus({preventScroll:true});this.#focus=undefined;}
 destroy():void{this.close();this.#closed=true;this.element.remove();}
 async #load():Promise<void>{
  if(!this.#valid()||this.#busy)return;this.#controller?.abort();this.#controller=new AbortController();const epoch=++this.#epoch;this.#busy=true;this.#refresh.disabled=true;this.#files=[];this.#rows.replaceChildren();this.#status.setAttribute('role','status');this.#status.textContent='Checking saved files…';
  try{const files=await this.#store.list(()=>this.#valid(epoch),this.#controller.signal);if(!this.#valid(epoch))return;this.#files=files;this.#render();}
  catch(e){if(this.#valid(epoch)){this.#status.setAttribute('role','alert');this.#status.textContent=e instanceof Error?e.message:'Saved files could not be read.';}}
  finally{if(epoch===this.#epoch){this.#busy=false;this.#refresh.disabled=false;}}
 }
 #render():void{
  const pages=Math.max(1,Math.ceil(this.#files.length/20));this.#page=Math.min(this.#page,pages-1);this.#rows.replaceChildren();
  this.#status.textContent=`${this.#files.length} files · ${(this.#files.reduce((n,f)=>n+f.bytes,0)/1048576).toFixed(1)} MiB · ${this.#files.filter(f=>!f.inUse&&!f.held).length} without a current link.`;
  if(!this.#files.length){this.#rows.append(element('p',{text:'No saved music or Feed files on this device.'}));return;}
  if(pages>1)this.#rows.append(element('div',{className:'kl-setting-tool-buttons'},this.#button('Previous file page',()=>{this.#page--;this.#render();},this.#page===0),element('span',{text:`Page ${this.#page+1} of ${pages}`}),this.#button('Next file page',()=>{this.#page++;this.#render();},this.#page+1===pages)));
  for(const item of this.#files.slice(this.#page*20,this.#page*20+20)){
   const row=element('section',{className:'kl-setting-group'},element('strong',{text:item.name}),element('p',{className:'kl-setting-help',text:`${item.kind==='music'?'Music':'Feed image'} · ${(item.bytes/1024).toFixed(1)} KiB · ${item.held?'Protected by an unfinished import':item.inUse?'Currently in use':'No current link'}`}));
   row.append(element('div',{className:'kl-setting-tool-buttons'},this.#button('Download file',()=>this.#download(item)),this.#button('Remove file…',()=>this.#confirm(item),item.inUse||item.held)));this.#rows.append(row);
  }
 }
 #download(item:SavedDeviceFile):void{
  if(!this.#valid()||this.#busy)return;
  try{
   const blob=this.#store.download(item,()=>this.#valid(),this.#controller!.signal),url=URL.createObjectURL(blob),a=element('a');this.#urls.add(url);
   const name=item.name.replace(/[\\/\u0000-\u001f\u007f]/g,'_').slice(0,100)||'saved-file';
   const extension:Record<string,string>={'audio/mpeg':'mp3','audio/ogg':'ogg','audio/mp4':'m4a','video/mp4':'mp4','audio/wav':'wav','image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
   a.download=/\.[a-z0-9]{1,5}$/i.test(name)?name:`${name}.${extension[item.mimeType]??'bin'}`;a.href=url;a.hidden=true;this.#dialog.append(a);
   try{a.click();}finally{a.remove();setTimeout(()=>{URL.revokeObjectURL(url);this.#urls.delete(url);},1000);}
  }catch(e){this.#status.setAttribute('role','alert');this.#status.textContent=e instanceof Error?e.message:'The file could not be downloaded.';}
 }
 #confirm(item:SavedDeviceFile):void{
  if(!this.#valid()||this.#busy)return;this.#render();
  // Render a single confirmation for the selected record; other files remain untouched.
  const confirmation=element('section',{className:'kl-setting-group'},element('strong',{text:`Remove ${item.name}?`}),element('p',{className:'kl-setting-help',text:'Keep a download or device backup first. This removes only the saved file, not playlists, draft text or recovery copies.'}),element('div',{className:'kl-setting-tool-buttons'},this.#button('Cancel removal',()=>this.#render()),this.#button('Remove file permanently',()=>void this.#remove(item))));
  this.#rows.prepend(confirmation);confirmation.tabIndex=-1;confirmation.focus();
 }
 async #remove(item:SavedDeviceFile):Promise<void>{
  if(!this.#valid()||this.#busy)return;const epoch=this.#epoch;this.#busy=true;this.#refresh.disabled=true;this.#rows.replaceChildren();this.#status.textContent='Checking this file before removal…';this.#status.setAttribute('role','status');
  try{await this.#store.remove(item,()=>this.#valid(epoch),this.#controller!.signal);if(!this.#valid(epoch))return;this.#busy=false;await this.#load();}
  catch(e){if(this.#valid(epoch)){this.#status.setAttribute('role','alert');this.#status.textContent=e instanceof Error?e.message:'Removal could not be confirmed. Refresh saved files before retrying.';}}
  finally{if(epoch===this.#epoch){this.#busy=false;this.#refresh.disabled=false;}}
 }
}
