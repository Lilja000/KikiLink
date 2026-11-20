import {audioMetadata,audioPreflight,audioGuard,audioPath,audioBody,audioRead,audioUploadReceipt,audioDeleteReceipt,audioError,type AudioReview} from './audio-generation';
import { CloudClient, CloudError } from "./client";

export interface CloudAudioItem {
  id: string;
  title: string;
  mime: "audio/mpeg";
  bytes: number;
  createdAt: number;
}
export interface CloudAudioCapabilities {
  enabled: boolean;
  maxBytes: number;
  types: readonly string[];
  maxTracks: number;
}
export interface CloudAudioPlayback { url: string; expiresAt: number; }

const MAX_BYTES = 16 * 1024 ** 2;
const MAX_TRACKS = 128;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const disabled = (): CloudAudioCapabilities => ({ enabled: false, maxBytes: MAX_BYTES, types: ["audio/mpeg"], maxTracks: MAX_TRACKS });
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const validItem = (value: unknown): value is CloudAudioItem => record(value) &&
  typeof value.id === "string" && ID.test(value.id) &&
  typeof value.title === "string" && value.title === value.title.trim() && value.title.length > 0 && value.title.length <= 100 &&
  value.mime === "audio/mpeg" && typeof value.bytes === "number" && Number.isSafeInteger(value.bytes) && value.bytes > 0 && value.bytes <= MAX_BYTES &&
  typeof value.createdAt === "number" && Number.isSafeInteger(value.createdAt) && value.createdAt > 0;

/** Personal Cloud music only. No native room sharing, persistence, or automatic requests. */
export class CloudAudioLibrary {
  #capabilities: CloudAudioCapabilities | undefined;
  #review:AudioReview|undefined;
  #deleteAttempts=new WeakMap<AudioReview,Set<string>>();
  get review():AudioReview|undefined{return this.#review;}
  #items: CloudAudioItem[] = [];
  #listeners = new Set<() => void>();
  #generation = 0;
  #loadSequence = 0;
  #mutation = 0;
  #closed = false;
  #uploads = new Set<AbortController>();
  // Weak keys do not retain file bytes after a view discards its File. A retry is
  // explicitly user-driven and reuses the same server mutation identifier.
  #uploadIntents = new WeakMap<Blob, Map<string, {clientId:string;review:AudioReview}>>();
  readonly #unsubscribe: () => void;

  constructor(private readonly client: CloudClient) {
    this.#unsubscribe = client.subscribe(kind => {
      if (kind === "session" || kind === "media-invalidated" ||
        (kind === "connection" && ["idle", "unavailable"].includes(client.connectionState))) this.#invalidate();
    });
  }
  get capabilities(): CloudAudioCapabilities | undefined {
    return this.#capabilities ? { ...this.#capabilities, types: [...this.#capabilities.types] } : undefined;
  }
  get enabled(): boolean { return this.#capabilities?.enabled === true; }
  get items(): readonly CloudAudioItem[] { return this.#items.map(item => ({ ...item })); }
  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  #emit(): void {
    for (const listener of this.#listeners) {
      try { listener(); } catch { /* A view cannot interrupt account cleanup. */ }
    }
  }
  #invalidate(): void {
    this.#generation++;
    this.#capabilities = undefined;this.#review=undefined;
    this.#items = [];
    this.#uploadIntents = new WeakMap();
    for (const controller of this.#uploads) controller.abort();
    this.#emit();
  }
  #check(generation = this.#generation): void {
    if (this.#closed || generation !== this.#generation) throw new CloudError("audio_library_changed");
    if (!this.client.connected) throw new CloudError("authentication_required", 401);
  }
  #requireEnabled(): void {
    this.#check();
    if (!this.enabled) throw new CloudError("audio_unavailable", 404);
  }
  async load(): Promise<readonly CloudAudioItem[]> {
    this.#check();
    const generation = this.#generation, sequence = ++this.#loadSequence, mutation = this.#mutation;
    let capabilities: unknown;
    try { capabilities = await this.client.request("GET", "/v1/audio/capabilities"); }
    catch (error) {
      this.#check(generation);
      if (!(error instanceof CloudError) || error.status !== 404) throw error;
      capabilities = disabled();
    }
    this.#check(generation);
    if (!record(capabilities) || typeof capabilities.enabled !== "boolean" ||
      !Number.isSafeInteger(capabilities.maxBytes) || Number(capabilities.maxBytes) <= 0 || Number(capabilities.maxBytes) > MAX_BYTES ||
      !Number.isSafeInteger(capabilities.maxTracks) || Number(capabilities.maxTracks) <= 0 || Number(capabilities.maxTracks) > MAX_TRACKS ||
      !Array.isArray(capabilities.types) || capabilities.types.length !== 1 || capabilities.types[0] !== "audio/mpeg")
      throw new CloudError("invalid_audio_capabilities");
    const next = capabilities as unknown as CloudAudioCapabilities;
    let items: CloudAudioItem[] = [],review:AudioReview|undefined;
    if (next.enabled) {
      review=await audioMetadata(this.client,()=>!this.#closed&&generation===this.#generation&&sequence===this.#loadSequence);
      let raw:unknown;try{raw=await this.client.request('GET',audioPath('/v1/audio',review));}catch(error){throw audioError(error);}
      audioGuard(this.client,review,()=>!this.#closed&&generation===this.#generation&&sequence===this.#loadSequence);
      const data:unknown=audioRead(raw,review);
      this.#check(generation);
      if (!record(data) || !Array.isArray(data.items) || data.items.length > next.maxTracks ||
        !data.items.every(validItem) || new Set(data.items.map(item => item.id)).size !== data.items.length)
        throw new CloudError("invalid_audio_library");
      items = data.items;
    }
    this.#check(generation);
    if (sequence !== this.#loadSequence || mutation !== this.#mutation) throw new CloudError("audio_library_changed");
    this.#review=review;this.#capabilities = { ...next, types: [...next.types] };
    this.#items = items.map(item => ({ ...item }));
    this.#emit();
    return this.items;
  }
  async upload(file: Blob, title: string, onProgress?: (percent: number) => void, signal?: AbortSignal,original=this.#review): Promise<CloudAudioItem> {
    this.#requireEnabled();
    const name = title.trim();
    if (!name || name.length > 100) throw new CloudError("invalid_audio_title");
    if (!(file instanceof Blob) || !file.size || file.size > this.#capabilities!.maxBytes) throw new CloudError("invalid_audio_size");
    // Some browsers omit MP3's MIME type. The server still validates MPEG frames.
    const namedMp3 = typeof File !== "undefined" && file instanceof File && /\.mp3$/iu.test(file.name);
    if (file.type !== "audio/mpeg" && !(namedMp3 && (!file.type || file.type === "audio/mp3")))
      throw new CloudError("invalid_audio_type");
    if (this.#items.length >= this.#capabilities!.maxTracks) throw new CloudError("audio_limit_reached");
    if (this.#uploads.size) throw new CloudError("audio_upload_in_progress");
    if (signal?.aborted) throw new CloudError("request_cancelled");
    let intents = this.#uploadIntents.get(file);
    if (!intents) { intents = new Map(); this.#uploadIntents.set(file, intents); }
    let intent = intents.get(name);
    if (!intent) {
      if (intents.size >= 8) throw new CloudError("audio_upload_intent_limit");
      if(!original)throw new CloudError('audio_library_changed');
      intent={clientId:crypto.randomUUID(),review:original};
      intents.set(name,intent);
    }
    const {clientId,review}=intent;const controller = new AbortController(), generation = this.#generation;
    const listedReview=this.#review,valid=()=>!this.#closed&&generation===this.#generation&&this.#review===listedReview&&!controller.signal.aborted&&!signal?.aborted;
    this.#uploads.add(controller);
    this.#mutation++;
    try {
      await audioPreflight(this.client,review,valid);
      const item: unknown = await this.client.upload(audioPath(`/v1/audio?title=${encodeURIComponent(name)}&clientId=${clientId}`,review),
        file.type === "audio/mpeg" ? file : file.slice(0, file.size, "audio/mpeg"), {
          signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal,
          ...(onProgress ? { onProgress } : {}),
        });
      this.#check(generation);
      if (controller.signal.aborted || signal?.aborted) throw new CloudError("request_cancelled");
      audioGuard(this.client,review,valid);audioUploadReceipt(item,review,clientId,'library',name,file.size);
      if (!validItem(item)) throw new CloudError("invalid_audio_item");
      intents.delete(name);
      this.#mutation++;
      this.#items = [item, ...this.#items.filter(existing => existing.id !== item.id)].slice(0, this.#capabilities!.maxTracks);
      this.#emit();
      return { ...item };
    } catch(error){throw audioError(error);}finally { this.#uploads.delete(controller); }
  }
  async remove(id:string,review=this.#review):Promise<void>{
    this.#requireEnabled();if(!ID.test(id))throw new CloudError('invalid_audio_id');
    if(!review||review!==this.#review)throw new CloudError('audio_library_changed');
    let attempted=this.#deleteAttempts.get(review);if(!attempted){attempted=new Set();this.#deleteAttempts.set(review,attempted);}
    if(attempted.has(id))throw new Error('Deletion was already sent. Refresh the library and review the track before choosing again.');
    const generation=this.#generation,valid=()=>!this.#closed&&generation===this.#generation&&review===this.#review;
    this.#mutation++;
    try{
      await audioPreflight(this.client,review,valid);const operationId=crypto.randomUUID();
      if(review.source.required)attempted.add(id);
      const result=review.source.required?await this.client.request('DELETE',`/v1/audio/${id}`,{...audioBody(review),operationId}):await this.client.request('DELETE',`/v1/audio/${id}`);
      audioDeleteReceipt(result,review,operationId,id);audioGuard(this.client,review,valid);this.#check(generation);
      this.#mutation++;this.#items=this.#items.filter(item=>item.id!==id);this.#emit();
    }catch(error){throw audioError(error);}
  }
  async playback(id:string):Promise<CloudAudioPlayback>{
    this.#requireEnabled();if(!ID.test(id))throw new CloudError('invalid_audio_id');
    const generation=this.#generation,review=this.#review;if(!review)throw new CloudError('audio_library_changed');
    const result=await requestAudioPlayback(this.client,id,undefined,undefined,review);
    this.#check(generation);audioGuard(this.client,review,()=>review===this.#review);return result;
  }
  destroy(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#unsubscribe();
    this.#invalidate();
    this.#listeners.clear();
  }
}

export async function requestAudioPlayback(client: CloudClient, id: string, path?: string, access?: { current(): boolean; request<T>(method: 'POST', path: string, body: Record<string, unknown>): Promise<T> }, review?:AudioReview): Promise<CloudAudioPlayback> {
    if (!ID.test(id)) throw new CloudError("invalid_audio_id");
    if (access && !access.current()) throw new CloudError("recovery_generation_required", 409);
    if(!access){review??=await audioMetadata(client,()=>true);await audioPreflight(client,review,()=>true);}
    let raw:unknown;
    try{raw=access?await access.request('POST',path??`/v1/audio/${id}/playback`,{}):await client.request('POST',path??`/v1/audio/${id}/playback`,audioBody(review!));}catch(error){throw audioError(error);}
    if(!access){audioGuard(client,review!,()=>true);if(review!.source.required&&(raw as {id?:unknown})?.id!==id)throw new CloudError('invalid_audio_playback');}
    const data=access?raw:audioRead<unknown>(raw,review!);
    if (access && !access.current()) throw new CloudError("recovery_generation_required", 409);
    if (!record(data) || typeof data.url !== "string" || typeof data.expiresAt !== "number" ||
      !Number.isSafeInteger(data.expiresAt) || data.expiresAt <= Date.now() || data.expiresAt > Date.now() + 305000)
      throw new CloudError("invalid_audio_playback");
    let url: URL;
    try { url = new URL(data.url); } catch { throw new CloudError("invalid_audio_playback"); }
    const expected = new URL(`${client.origin}/v1/audio/${id}/content`);
    if (url.protocol !== "https:" || url.origin !== expected.origin || url.pathname !== expected.pathname ||
      url.username || url.password || url.hash || [...url.searchParams.keys()].length !== 1 ||
      !/^[A-Za-z0-9_-]{43}$/u.test(url.searchParams.get("ticket") ?? "") || url.href !== data.url)
      throw new CloudError("invalid_audio_playback");
    return { url: data.url, expiresAt: data.expiresAt };
}
