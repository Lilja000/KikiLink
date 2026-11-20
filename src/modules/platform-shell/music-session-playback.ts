import type {MusicSession} from '../../../cloud/shared/music-sessions.mjs';
import type {CloudAudioPlayback} from '../../cloud/audio-library';
/** This device only. Playback consent and ticket URLs are never persisted. */
export class MusicSessionPlayback {
 readonly audio:HTMLAudioElement;
 #model:MusicSession|undefined;#sampled=0;#enabled=false;#generation=0;#track='';#expiry=0;#loading=false;#error='';
 constructor(readonly options:{valid():boolean;ticket(session:string,track:string):Promise<CloudAudioPlayback>;refresh():void;changed():void;now?():number;audio?:HTMLAudioElement}){
  this.audio=options.audio??document.createElement('audio');this.audio.preload='none';this.audio.crossOrigin='anonymous';this.audio.volume=.6;
  this.audio.addEventListener('loadedmetadata',()=>{if(this.#enabled)this.align();});
  this.audio.addEventListener('ended',()=>{if(this.#enabled)options.refresh();});
  this.audio.addEventListener('error',()=>{if(this.#enabled&&!this.#loading&&this.#track)this.stop('Audio could not load. Enable audio to try again.');});
 }
 get enabled(){return this.#enabled;}get error(){return this.#error;}
 now(){return this.options.now?.()??performance.now();}
 adopt(model:MusicSession,sampled=this.now()){this.#model=model;this.#sampled=sampled;if(!model.joined||model.state==='ended'){this.stop(model.state==='ended'?'The session has ended.':'Join the session to listen.');return;}if(this.#enabled)void this.sync();}
 async start(){if(!this.options.valid()||!this.#model?.joined||this.#model.state==='ended')throw new Error('Join a current listening session first.');this.#enabled=true;this.#error='';await this.sync();this.options.changed();}
 clearSource(){this.#generation++;this.#loading=false;this.#track='';this.#expiry=0;this.audio.pause();this.audio.removeAttribute('src');this.audio.load();}
 invalidate(){this.#model=undefined;this.clearSource();}
 stop(message=''){this.#enabled=false;this.#error=message;this.clearSource();this.options.changed();}
 target(){const m=this.#model;if(!m)return 0;const t=m.queue?.find(t=>t.id===m.trackId);return Math.min(t?.durationMs??0,(m.positionMs??0)+(m.state==='playing'?Math.max(0,this.now()-this.#sampled):0))/1000;}
 align(){const m=this.#model;if(!m||!this.#enabled||!this.options.valid())return;const target=this.target();if(Number.isFinite(this.audio.duration)&&Math.abs(this.audio.currentTime-target)>.8)this.audio.currentTime=Math.min(this.audio.duration,target);if(m.state!=='playing')this.audio.pause();}
 async sync(){
  const m=this.#model;if(!this.#enabled||!m?.joined||m.state==='ended'||!this.options.valid())return;
  if(this.now()-this.#sampled>12000){this.stop('Connection is out of date. Reconnect and enable audio again.');return;}
  if(!m.trackId){this.stop('No playable track remains.');return;}
  if(this.#loading)return;
  if(this.#track!==m.trackId||this.#expiry<Date.now()+15000){
   this.clearSource();const generation=this.#generation;this.#loading=true;
   try{const ticket=await this.options.ticket(m.id,m.trackId);if(generation!==this.#generation||!this.#enabled||!this.options.valid()||this.#model?.trackId!==m.trackId)return;this.#track=m.trackId;this.#expiry=ticket.expiresAt;this.audio.src=ticket.url;this.audio.load();}
   catch(e){if(generation===this.#generation)this.stop(e instanceof Error?e.message:'Playback unavailable.');return;}
   finally{if(generation===this.#generation)this.#loading=false;}
  }
  this.align();if(this.#model?.state==='playing'&&this.audio.paused){const generation=this.#generation;try{await this.audio.play();}catch{if(generation===this.#generation)this.stop('Your browser needs another tap. Enable audio to listen.');}}
 }
 tick(){if(this.#enabled)void this.sync();}
 destroy(){this.stop();this.#model=undefined;}
}
