import {audioMetadata,audioPreflight,audioExpected,audioGuard,audioPath,audioUploadReceipt,audioError,AudioGenerationError,type AudioReview} from './audio-generation';
import { element } from "./dom";
import { CloudClient, CloudError } from "./client";
import { kikiIcon } from "../modules/link-chat/icons";
import { requestAudioPlayback } from "./audio-library";

const ID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u;
const LIMIT = 16 * 1024 ** 2;
interface Player { node: HTMLElement; stop(): void; }

/** Explicit uploads and playback, pinned to one Cloud account. No automatic downloads. */
export class MessageAudio {
  #players = new Set<Player>();
  #observer: MutationObserver;
  #unsubscribe: () => void;
  #closeDialog: (() => void) | undefined;
  #closed = false;
  #epoch = 0;
  constructor(readonly client: CloudClient, readonly root: HTMLElement | ShadowRoot) {
    this.#observer = new MutationObserver(() => {
      for (const p of this.#players) if (!p.node.isConnected) { p.stop(); this.#players.delete(p); }
    });
    this.#observer.observe(root, { childList: true, subtree: true });
    this.#unsubscribe = client.subscribe(kind => {
      if (["session", "media-invalidated", "relationships"].includes(kind) || (kind === "connection" && !client.connected)) {
        this.#epoch++; this.pausePlayback(); this.#closeDialog?.();
      }
    });
  }
  pausePlayback(): void { for (const p of this.#players) p.stop(); this.#players.clear(); }
  pause(): void { this.pausePlayback(); this.#closeDialog?.(); }
  destroy(): void { this.#closed = true; this.#epoch++; this.pause(); this.#observer.disconnect(); this.#unsubscribe(); }

  open(destination: string, attach: (id: string) => Promise<void> | void, send = false, originalGeneration?:string): void {
    if (this.#closed || !this.client.connected) return;
    this.#closeDialog?.();
    const dialog = element("dialog", { className: "kl-dialog kl-audio-upload", ariaLabel: "Attach MP3" });
    const input = element("input", { type: "file", accept: "audio/mpeg,audio/mp3,.mp3", ariaLabel: "Choose MP3" });
    const status = element("p", { role: "status", className: "kl-audio-upload-status", text: "MP3 · up to 16 MiB" });
    const upload = element("button", { type: "button", className: "kl-social-button kl-social-primary", text: send ? "Upload & send" : "Attach MP3" });
    const cancel = element("button", { type: "button", className: "kl-social-button", text: "Cancel" });
    let file: File | undefined, clientId = "", asset: string | undefined, controller: AbortController | undefined;
    let handedOff = false, closed = false;
    const epoch = this.#epoch;
    const close = () => {
      if (closed) return;
      closed = true; controller?.abort(); file = undefined; asset = undefined;
      if (dialog.open) dialog.close(); dialog.remove();
      if (this.#closeDialog === close) this.#closeDialog = undefined;
    };
    this.#closeDialog = close;
    const valid=()=>!closed&&!this.#closed&&epoch===this.#epoch;
    const reviewTask=audioMetadata(this.client,valid);void reviewTask.catch(()=>{});
    upload.disabled = true;
    input.addEventListener("change", () => {
      file = input.files?.[0]; asset = undefined; clientId = crypto.randomUUID();
      const valid = file && file.size > 0 && file.size <= LIMIT && (file.type === "audio/mpeg" || /\.mp3$/iu.test(file.name) && ["", "audio/mp3"].includes(file.type));
      upload.disabled = !valid;
      status.textContent = valid ? `${file!.name} · ${(file!.size / 1024 ** 2).toFixed(1)} MiB` : "Choose an MP3 up to 16 MiB.";
    });
    const abortOrClose = () => {
      if (handedOff) return;
      if (controller) { controller.abort(); status.textContent = "Upload cancelled. Retry keeps the same upload."; }
      else close();
    };
    cancel.addEventListener("click", abortOrClose);
    dialog.addEventListener("cancel", event => { event.preventDefault(); abortOrClose(); });
    dialog.addEventListener("close", close);
    upload.addEventListener("click", () => { void (async () => {
      if (!file || controller || handedOff || closed || this.#closed) return;
      controller = new AbortController(); const signal = controller.signal;
      input.disabled = upload.disabled = true;
      try {
        const review=await reviewTask;audioExpected(review,originalGeneration);await audioPreflight(this.client,review,()=>valid()&&!signal.aborted);
        if (!asset) {
          status.textContent = "Uploading privately… 0%";
          const result = await this.client.upload<{ id: string }>(audioPath(`/v1/audio?purpose=message&title=Audio%20message&clientId=${clientId}`,review),
            file.slice(0, file.size, "audio/mpeg"), { signal, onProgress: percent => { if (!signal.aborted && !closed) status.textContent = `Uploading privately… ${percent}%`; } });
          if (closed || signal.aborted || epoch !== this.#epoch) return;
          audioGuard(this.client,review,valid);audioUploadReceipt(result,review,clientId,'message','Audio message',file.size);
          if (!ID.test(result.id)) throw new CloudError("invalid_audio_item");
          asset = result.id;
        }
        if (closed || signal.aborted || epoch !== this.#epoch || this.#closed) return;
        await audioPreflight(this.client,review,()=>valid()&&!signal.aborted);
        // Once the queue/draft owns the attachment, cancelling cannot retract it.
        handedOff = true; cancel.disabled = true; status.textContent = "Saving attachment…";
        await attach(asset); close();
      } catch (error) {
        handedOff = false;error=audioError(error);
        if (!closed && !signal.aborted) status.textContent = error instanceof AudioGenerationError?error.message:error instanceof CloudError && ["storage_quota", "storage_capacity"].includes(error.code)
          ? "Cloud storage is full. Remove unused files or try later."
          : error instanceof CloudError && ["invalid_audio", "audio_type"].includes(error.code)
            ? "This file is not a supported MP3. Choose another file."
            : asset ? "Could not attach. Retry uses this uploaded file." : "Upload was not confirmed. Retry or choose another MP3.";
      } finally {
        controller = undefined;
        if (!closed) { upload.disabled = false; input.disabled = !!asset; cancel.disabled = false; }
      }
    })(); });
    dialog.append(element("div", { className: "kl-dialog-title", text: "Attach MP3" }),
      element("p", { className: "kl-dialog-subtitle", text: destination }), input, status,
      element("div", { className: "kl-audio-upload-actions" }, cancel, upload));
    this.root.append(dialog); dialog.showModal();
  }

  render(id: string, playbackPath?: string, access?: Parameters<typeof requestAudioPlayback>[3], originalGeneration?:string): HTMLElement {
    const node = element("div", { className: "kl-message-audio" });
    const play = element("button", { type: "button", className: "kl-social-button", text: "Play MP3" });
    play.prepend(kikiIcon("play"));
    const audio = element("audio", { ariaLabel: "Audio message", hidden: true });
    audio.controls = true; audio.preload = "none"; audio.crossOrigin = "anonymous";
    const status = element("span", { role: "status", className: "kl-audio-playback-status" });
    node.append(play, audio, status);
    let expiresAt = 0, sequence = 0, pending = false, review:AudioReview|undefined;
    const player: Player = { node, stop: () => {
      sequence++; pending = false; expiresAt = 0; audio.pause(); audio.removeAttribute("src"); audio.load(); audio.hidden = true; play.hidden = false; play.disabled = false;
    } };
    const load = async (position = 0, resume = true) => {
      if (pending || this.#closed || !node.isConnected || !ID.test(id) || access && !access.current()) return;
      this.pausePlayback(); this.#players.add(player);
      const active = ++sequence, epoch = this.#epoch;
      pending = true; play.disabled = true; status.textContent = "Loading…";
      try {
        if(!access){review??=await audioMetadata(this.client,()=>!this.#closed&&node.isConnected&&epoch===this.#epoch&&sequence===active);audioExpected(review,originalGeneration);}
        const ticket=await requestAudioPlayback(this.client,id,playbackPath,access,review);
        if (this.#closed || !node.isConnected || epoch !== this.#epoch || sequence !== active) return;
        expiresAt = ticket.expiresAt; audio.src = ticket.url; audio.hidden = false; play.hidden = true;
        if (position > 0) audio.addEventListener("loadedmetadata", () => {
          if (sequence === active && Number.isFinite(audio.duration)) audio.currentTime = Math.min(position, audio.duration);
        }, { once: true });
        audio.load();
        if (resume) await audio.play();
        status.textContent = "";
      } catch(error) {
        if (sequence === active && node.isConnected) { player.stop(); status.textContent = audioError(error) instanceof AudioGenerationError?(audioError(error) as Error).message:"Audio unavailable. Retry playback."; }
      } finally { if (sequence === active) { pending = false; play.disabled = false; } }
    };
    play.addEventListener("click", () => { void load(); });
    const renew = () => { if (!pending && audio.src && expiresAt <= Date.now() + 1000) { const position = audio.currentTime, resume = !audio.paused; void load(position, resume); } };
    audio.addEventListener("play", renew); audio.addEventListener("seeking", renew);
    audio.addEventListener("error", () => { if (!pending && audio.getAttribute("src")) { player.stop(); status.textContent = "Audio unavailable. Retry playback."; } });
    return node;
  }
}

export const MESSAGE_AUDIO_STYLES = `
.kl-composer-row:has(> .kl-attach-audio:not([hidden])) { grid-template-columns:auto auto minmax(0,1fr) auto; }
.kl-attach-audio { width:44px; height:44px; border-radius:13px; color:var(--kl-gold); }
.kl-message-audio { display:flex; flex-direction:column; gap:6px; width:280px; max-width:100%; min-width:0; margin:6px 0; }
.kl-message-audio audio { display:block; width:100%; min-width:0; max-width:100%; height:40px; color-scheme:dark; }
.kl-message-audio [hidden] { display:none!important; }
.kl-message-audio button { align-self:flex-start; display:flex; align-items:center; gap:7px; }
.kl-audio-playback-status { font-size:11px; opacity:.75; overflow-wrap:anywhere; }
.kl-audio-upload { width:min(380px,calc(100vw - 24px)); max-height:calc(100dvh - 24px); overflow:auto; padding:18px; box-sizing:border-box; }
.kl-audio-upload input { max-width:100%; min-width:0; width:100%; }
.kl-audio-upload-status { font-size:12px; overflow-wrap:anywhere; }
.kl-audio-upload-actions { display:flex; justify-content:flex-end; gap:8px; }
.kl-audio-draft { display:flex; align-items:center; gap:8px; padding:4px 0; font-size:12px; }
`;
