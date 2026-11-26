import { searchField } from "./browse-controls";
import {AudioGenerationError,type AudioReview} from '../../cloud/audio-generation';
import type { CloudAudioLibrary } from "../../cloud/audio-library";
import { element, focusedElement } from "../../utils/dom";
import { kikiIcon } from "../link-chat/icons";

/** Private Cloud media stays inside this player; signed URLs never enter room music or settings. */
export class CloudAudioPanel {
  readonly element = element("section", { className: "kl-cloud-audio", ariaLabel: "Private Cloud music library" });
  readonly #audio = document.createElement("audio");
  readonly #search = element("input", { className: "kl-search", ariaLabel: "Search Cloud music" });
  readonly #file = document.createElement("input");
  readonly #title = element("input", { className: "kl-search", ariaLabel: "Track title" });
  readonly #fileName = element("span", { className: "kl-cloud-audio-filename", text: "MP3" });
  readonly #list = element("div", { className: "kl-cloud-audio-list" });
  readonly #status = element("div", { className: "kl-cloud-audio-status" });
  readonly #uploadStatus = element("div", { className: "kl-cloud-audio-upload-status" });
  readonly #progress = element("progress", { ariaLabel: "Audio upload progress" });
  readonly #progressText = element("span");
  readonly #cancel = this.#button("cancel-upload", "Cancel", () => this.#cancelUpload(true));
  readonly #form = element("form", { className: "kl-cloud-audio-upload" });
  readonly #current = element("strong", { text: "Choose a track" });
  readonly #player = element("footer", { className: "kl-cloud-audio-transport" });
  readonly #choose = this.#button("choose", "Choose MP3", () => this.#file.click());
  readonly #upload = this.#button("upload", "Upload", () => void this.#uploadFile());
  readonly #add = this.#button("new-upload", "Upload MP3", () => {
    this.#uploadExpanded = !this.#uploadExpanded;
    this.#render();
    if (this.#uploadExpanded) this.#file.click();
  });
  readonly #unsubscribe: () => void;
  #fileValue: File | undefined;
  #fileReview:AudioReview|undefined;
  #deleteReview:AudioReview|undefined;
  #uploadController: AbortController | undefined;
  #uploadEpoch = 0;
  #uploadProgress = 0;
  #uploadExpanded = false;
  #visible = false;
  #destroyed = false;
  #loading = false;
  #loaded = false;
  #error = "";
  #playingId: string | undefined;
  #playReview:AudioReview|undefined;
  #expiresAt = 0;
  #playEpoch = 0;
  #playLoading = false;
  #refreshUsed = false;
  #pendingSeek: number | undefined;
  #deleteId: string | undefined;
  #deleting = new Set<string>();

  constructor(readonly library: CloudAudioLibrary) {
    this.element.hidden = true;
    this.#search.type = "search";
    this.#search.placeholder = "Search your music";
    this.#search.autocomplete = "off";
    this.#search.dataset.audioField = "search";
    this.#search.addEventListener("input", () => this.#renderList());
    this.#file.type = "file";
    this.#file.accept = ".mp3,audio/mpeg";
    this.#file.hidden = true;
    this.#file.addEventListener("cancel", () => {
      if (!this.#fileValue) { this.#uploadExpanded = false; this.#render(); }
    });
    this.#file.addEventListener("change", () => {
      this.#fileValue = this.#file.files?.[0];this.#fileReview=this.library.review;
      this.#uploadExpanded = Boolean(this.#fileValue);
      this.#form.hidden = !this.#uploadExpanded;
      this.#uploadStatus.replaceChildren();
      this.#fileName.textContent = this.#fileValue?.name ?? "MP3";
      this.#fileName.title = this.#fileValue?.name ?? "";
      if (this.#fileValue && !this.#title.value.trim()) this.#title.value = this.#fileValue.name.replace(/\.mp3$/i, "").slice(0, 100);
      this.#updateUpload();
    });
    this.#title.type = "text";
    this.#title.placeholder = "Track title";
    this.#title.maxLength = 100;
    this.#title.dataset.audioField = "title";
    this.#title.addEventListener("input", () => { this.#updateUpload(); });
    this.#upload.classList.add("kl-text-button--primary");
    this.#add.classList.add("kl-text-button--primary");
    this.#add.setAttribute("aria-expanded", "false");
    this.#form.addEventListener("submit", event => { event.preventDefault(); void this.#uploadFile(); });
    this.#form.addEventListener("keydown", event => {
      if (event.key !== "Escape" || this.#uploadController) return;
      event.preventDefault(); event.stopPropagation();
      this.#uploadExpanded = false; this.#render(); this.#add.focus();
    });
    this.#form.append(element("div", { className: "kl-cloud-audio-file" }, this.#choose, this.#fileName), this.#file,
      element("label", { className: "kl-cloud-audio-title" }, element("span", { text: "Title" }), this.#title), this.#upload, this.#uploadStatus);
    this.#status.setAttribute("role", "status");
    this.#status.setAttribute("aria-live", "polite");
    this.#uploadStatus.setAttribute("role", "status");
    this.#audio.className = "kl-cloud-audio-player";
    this.#audio.controls = true;
    this.#audio.crossOrigin = "anonymous";
    this.#audio.preload = "metadata";
    this.#audio.setAttribute("aria-label", "Cloud music playback");
    this.#audio.addEventListener("play", () => {
      if (!this.#visible || !this.library.enabled) { this.#audio.pause(); return; }
      if (this.#expiresAt <= Date.now() + 5000 && !this.#playLoading) {
        const time = this.#audio.currentTime;
        this.#audio.pause();
        void this.#renew(time, true);
      }
      this.#renderList();
    });
    this.#audio.addEventListener("pause", () => this.#renderList());
    this.#audio.addEventListener("ended", () => this.#renderList());
    this.#audio.addEventListener("seeking", () => {
      if (!this.#visible || this.#playLoading || this.#expiresAt > Date.now() + 5000) return;
      const playing = !this.#audio.paused;
      const time = this.#audio.currentTime;
      this.#audio.pause();
      void this.#renew(time, playing);
    });
    this.#audio.addEventListener("loadedmetadata", () => {
      if (this.#pendingSeek !== undefined) {
        const time = this.#pendingSeek;
        this.#pendingSeek = undefined;
        this.#audio.currentTime = Number.isFinite(this.#audio.duration) ? Math.min(time, this.#audio.duration) : time;
      }
    });
    this.#audio.addEventListener("error", () => {
      if (!this.#playingId || !this.#visible || this.#playLoading || !this.#audio.hasAttribute("src")) return;
      if (!this.#refreshUsed) {
        this.#refreshUsed = true;
        void this.#renew(this.#audio.currentTime, true);
      } else {
        this.#error = "This track could not be played. Try playing it again.";
        this.#audio.pause();
        this.#render();
      }
    });
    this.#player.hidden = true;
    this.#player.append(this.#current, this.#audio);
    this.element.append(
      element("div", { className: "kl-cloud-audio-tools" }, searchField(this.#search, "Clear Cloud music search", { className: "kl-cloud-audio-search" }), this.#add,
        this.#button("reload", "Refresh", () => void this.#load(), "refresh")),
      element("p", { className: "kl-cloud-audio-privacy", text: "Private · saved until you delete" }),
      this.#form, this.#status, this.#list, this.#player,
    );
    this.#unsubscribe = library.subscribe(() => {
      if (!library.enabled || (this.#playingId && (this.#playReview!==library.review || !library.items.some(item => item.id === this.#playingId)))) this.#clearPlayback();
      if (!library.capabilities) {
        this.#loaded = false;
        this.#cancelUpload(false);
        this.#fileValue = undefined;
        this.#uploadExpanded = false;
        this.#file.value = "";
        this.#title.value = "";
        this.#fileName.textContent = "MP3";
        this.#uploadStatus.replaceChildren();
        this.#deleteId = undefined;
        this.#search.value = "";
      }
      this.#render();
    });
    this.#render();
  }

  setVisible(visible: boolean): void {
    if (this.#destroyed) return;
    this.#visible = visible;
    this.element.hidden = !visible;
    if (!visible) {
      this.#playEpoch += 1;
      this.#playLoading = false;
      this.#audio.pause();
    } else if (!this.#loaded && !this.#loading) void this.#load();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#visible = false;
    this.#unsubscribe();
    this.#cancelUpload(false);
    this.#clearPlayback();
    this.#fileValue = undefined;
    this.#file.value = "";
    this.library.destroy();
    this.element.remove();
  }

  #button(action: string, label: string, handler: () => void, icon?: "refresh" | "play" | "pause" | "close"): HTMLButtonElement {
    const button = element("button", { className: "kl-text-button", type: "button", ariaLabel: label, title: label, onClick:()=>{if(button.isConnected&&this.#visible&&!this.#destroyed)handler();} });
    button.dataset.audioAction = action;
    if (icon) button.append(kikiIcon(icon));
    else button.textContent = label;
    return button;
  }

  async #load(): Promise<void> {
    if (this.#loading || this.#destroyed) return;
    this.#loading = true;
    this.#error = "";
    this.#render();
    try {
      await this.library.load();
      if (!this.#destroyed) this.#loaded = true;
    } catch (error) {
      if (!this.#destroyed) this.#error = this.#errorText(error, "Your music could not be loaded. Try again.");
    } finally {
      this.#loading = false;
      if (!this.#destroyed) this.#render();
    }
  }

  #updateUpload(): void {
    const busy = Boolean(this.#uploadController);
    this.#choose.disabled = busy;
    this.#add.disabled = busy || !this.library.enabled;
    this.#add.setAttribute("aria-expanded", String(this.#uploadExpanded));
    this.#title.disabled = busy;
    this.#upload.disabled = busy || !this.library.enabled || !this.#fileValue || !this.#title.value.trim();
  }

  async #uploadFile(): Promise<void> {
    const file = this.#fileValue;
    if (this.#destroyed || this.#uploadController || !this.library.enabled || !file || !this.#title.value.trim()) return;
    if (file.size > (this.library.capabilities?.maxBytes ?? 0)) {
      this.#uploadStatus.textContent = `Choose an MP3 smaller than ${Math.floor((this.library.capabilities?.maxBytes ?? 0) / 1048576)} MB.`;
      return;
    }
    const epoch = ++this.#uploadEpoch;
    const controller = new AbortController();
    this.#uploadController = controller;
    this.#uploadProgress = 0;
    this.#renderUploadProgress();
    this.#updateUpload();
    try {
      await this.library.upload(file, this.#title.value.trim(), percent => {
        if (this.#destroyed || epoch !== this.#uploadEpoch) return;
        this.#uploadProgress = percent;
        this.#renderUploadProgress();
      }, controller.signal,this.#fileReview);
      if (this.#destroyed || epoch !== this.#uploadEpoch) return;
      this.#fileValue = undefined;
      this.#file.value = "";
      this.#title.value = "";
      this.#fileName.textContent = "MP3";
      this.#uploadStatus.replaceChildren(element("span", { text: "Saved to your private library." }),
        this.#button("done-upload", "Done", () => { this.#uploadExpanded = false; this.#render(); this.#add.focus(); }));
    } catch (error) {
      if (this.#destroyed || epoch !== this.#uploadEpoch || controller.signal.aborted) return;
      this.#uploadStatus.replaceChildren(element("span", { text: this.#errorText(error, "Upload failed. Your file is ready to retry.") }),
        this.#button("retry-upload", "Retry", () => void this.#uploadFile()));
    } finally {
      if (epoch === this.#uploadEpoch) this.#uploadController = undefined;
      if (!this.#destroyed) this.#updateUpload();
    }
  }

  #renderUploadProgress(): void {
    this.#progress.max = 100;
    this.#progress.value = this.#uploadProgress;
    this.#progressText.textContent = `${Math.round(this.#uploadProgress)}%`;
    if (this.#progress.parentElement !== this.#uploadStatus)
      this.#uploadStatus.replaceChildren(this.#progress, this.#progressText, this.#cancel);
  }

  #cancelUpload(showStatus: boolean): void {
    this.#uploadEpoch += 1;
    this.#uploadController?.abort();
    this.#uploadController = undefined;
    if (showStatus) {
      this.#uploadStatus.replaceChildren(element("span", { text: "Upload stopped. Refresh to check whether it was saved." }),
        this.#button("retry-upload", "Retry", () => void this.#uploadFile()));
      void this.#load();
    }
    this.#updateUpload();
  }

  async #toggle(id: string): Promise<void> {
    if (!this.#visible || !this.library.enabled || this.#destroyed) return;
    if (this.#playingId === id && !this.#audio.paused) { this.#audio.pause(); return; }
    this.#error = "";
    this.#refreshUsed = false;
    if (this.#playingId !== id) {
      this.#clearPlayback();
      this.#playingId = id;
      this.#playReview=this.library.review;
    }
    if (this.#expiresAt <= Date.now() + 5000 || !this.#audio.hasAttribute("src")) await this.#renew(this.#audio.currentTime, true);
    else {
      const epoch = this.#playEpoch;
      try { await this.#audio.play(); }
      catch { if (epoch === this.#playEpoch && this.#visible) this.#error = "Playback could not start. Press play to try again."; }
      this.#render();
    }
  }

  async #renew(time: number, play: boolean): Promise<void> {
    const id = this.#playingId;
    if (!id || this.#destroyed || !this.#visible || !this.library.enabled || this.#playLoading) return;
    const epoch = ++this.#playEpoch;
    this.#playLoading = true;
    this.#audio.pause();
    this.#renderList();
    try {
      const source = await this.library.playback(id);
      if (epoch !== this.#playEpoch || this.#destroyed || !this.#visible || !this.library.enabled || !this.library.items.some(item => item.id === id)) return;
      this.#expiresAt = source.expiresAt;
      this.#pendingSeek = Math.max(0, time || 0);
      this.#audio.src = source.url;
      this.#audio.load();
      this.#current.textContent = this.library.items.find(item => item.id === id)?.title ?? "Music";
      this.#player.hidden = false;
      if (play) await this.#audio.play();
      if (!this.#visible || !this.library.enabled) this.#audio.pause();
    } catch (error) {
      if (epoch === this.#playEpoch && !this.#destroyed) {if(error instanceof AudioGenerationError)this.#clearPlayback();this.#error = this.#errorText(error, "Playback could not start. Press play to try again.");}
    } finally {
      if (epoch === this.#playEpoch) this.#playLoading = false;
      if (!this.#destroyed) this.#render();
    }
  }

  #clearPlayback(): void {
    this.#playEpoch += 1;
    this.#playingId = undefined;
    this.#playReview=undefined;
    this.#expiresAt = 0;
    this.#playLoading = false;
    this.#pendingSeek = undefined;
    this.#audio.pause();
    this.#audio.removeAttribute("src");
    this.#audio.load();
    this.#player.hidden = true;
    this.#current.textContent = "Choose a track";
  }

  async #remove(id: string): Promise<void> {
    if (this.#deleting.has(id) || !this.library.enabled || this.#destroyed) return;
    this.#deleting.add(id);
    this.#error = "";
    const review=this.#deleteReview,current=()=>!this.#destroyed&&this.#visible&&this.library.review===review;
    this.#renderList();
    try {
      if(review)await this.library.remove(id,review);else await this.library.remove(id);
      if(!current())return;
      if (this.#playingId === id) this.#clearPlayback();
      this.#deleteId = undefined;
    } catch (error) {
      if (current()) this.#error = this.#errorText(error, "This track could not be deleted. Try again.");
    } finally {
      this.#deleting.delete(id);
      if (!this.#destroyed) this.#render();
    }
  }

  #render(): void {
    if (this.#destroyed) return;
    this.element.setAttribute("aria-busy", String(this.#loading));
    this.#form.hidden = !this.library.enabled || !this.#uploadExpanded;
    this.#add.hidden = !this.library.enabled;
    this.#search.disabled = !this.library.enabled;
    this.#status.replaceChildren();
    if (this.#error) this.#status.append(element("span", { text: this.#error }), this.#button("retry", "Refresh", () => void this.#load()));
    else if (this.#loading) this.#status.textContent = "Loading your music…";
    else if (!this.library.enabled) this.#status.textContent = "Cloud music is not available on this server. Your device library is still available.";
    this.#updateUpload();
    this.#renderList();
  }

  #renderList(): void {
    if (this.#destroyed) return;
    const focused = focusedElement(this.#list);
    const action = focused?.dataset.audioAction;
    const focusedId = focused?.closest<HTMLElement>("[data-audio-id]")?.dataset.audioId;
    const query = this.#search.value.trim().toLocaleLowerCase();
    const items = this.library.enabled ? this.library.items.filter(item => item.title.toLocaleLowerCase().includes(query)) : [];
    this.#list.replaceChildren();
    if (!items.length && this.library.enabled && !this.#loading) this.#list.append(element("p", {
      className: "kl-cloud-audio-empty", text: query ? "No matching tracks." : "Your music, on every device. Upload your first MP3.",
    }));
    for (const item of items) {
      const row = element("article", { className: "kl-cloud-audio-track" });
      row.dataset.audioId = item.id;
      const active = this.#playingId === item.id;
      const play = this.#button("play", active && !this.#audio.paused ? `Pause ${item.title}` : `Play ${item.title}`, () => void this.#toggle(item.id), active && !this.#audio.paused ? "pause" : "play");
      play.disabled = active && this.#playLoading;
      row.dataset.active = String(active);
      row.append(play, element("div", { className: "kl-cloud-audio-track-copy" }, element("strong", { text: item.title, title: item.title }),
        element("span", { text: `${item.bytes < 1048576 ? `${Math.max(1, Math.round(item.bytes / 1024))} KB` : `${(item.bytes / 1048576).toFixed(1)} MB`} · MP3` })));
      if (this.#deleteId === item.id) {
        const confirm = this.#button("confirm-delete", "Delete", () => void this.#remove(item.id));
        confirm.classList.add("kl-text-button--danger");
        confirm.disabled = this.#deleting.has(item.id);
        const cancel = this.#button("cancel-delete", "Keep", () => { this.#deleteId = undefined; this.#renderList(); });
        cancel.disabled = this.#deleting.has(item.id);
        row.append(element("div", { className: "kl-cloud-audio-delete" }, element("span", { text: "Delete permanently?" }), cancel, confirm));
      } else row.append(this.#button("delete", `Delete ${item.title}`, () => {
        this.#deleteId = item.id;this.#deleteReview=this.library.review;
        this.#renderList();
        this.#list.querySelector<HTMLButtonElement>(`[data-audio-action="cancel-delete"]`)?.focus();
      }, "close"));
      this.#list.append(row);
    }
    if (action && focusedId) {
      const row = [...this.#list.querySelectorAll<HTMLElement>("[data-audio-id]")].find(item => item.dataset.audioId === focusedId);
      const previous = row?.querySelector<HTMLButtonElement>(`[data-audio-action="${action}"]`);
      const fallback = row?.querySelector<HTMLButtonElement>('[data-audio-action="delete"], [data-audio-action="play"]')
        ?? this.#list.querySelector<HTMLButtonElement>('[data-audio-action="play"]') ?? this.#search;
      (previous && !previous.disabled ? previous : fallback).focus();
    }
  }

  #errorText(error: unknown, fallback: string): string {
    if(error instanceof AudioGenerationError)return error.message;
    if(error instanceof Error&&error.message.startsWith('Deletion was already sent.'))return error.message;
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (["session_changed", "session_required", "unauthorized", "authentication_required", "audio_library_changed"].includes(code)) return "Reconnect to Cloud to use your private music.";
    if (["audio_disabled", "audio_unavailable", "not_found"].includes(code)) return "Cloud music is not available on this server.";
    if (["audio_quota_exceeded", "quota_exceeded", "audio_limit_reached"].includes(code)) return "Your library is full. Delete a track before uploading another.";
    if (["invalid_audio", "unsupported_media_type", "invalid_media_type", "invalid_audio_type"].includes(code)) return "Choose a valid MP3 audio file.";
    if (["media_too_large", "file_too_large", "audio_too_large", "invalid_audio_size"].includes(code)) return "This file is too large for your Cloud library.";
    if (code === "invalid_audio_title") return "Enter a track title of up to 100 characters.";
    if (code === "audio_upload_pending") return "The previous upload is still finishing. Refresh shortly.";
    if (code === "audio_upload_conflict") return "Choose the file again before retrying.";
    if (code === "audio_upload_in_progress") return "The previous upload is still stopping. Try again in a moment.";
    if (code === "rate_limited") return "Please wait a moment, then try again.";
    return fallback;
  }
}
