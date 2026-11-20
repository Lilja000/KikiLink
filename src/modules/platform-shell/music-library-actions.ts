import type { SettingsStore } from "../../core/settings";
import type { MusicPlaylist, MusicTrack } from "../../core/types";
import { element, focusedElement } from "../../utils/dom";
import { kikiIcon } from "../link-chat/icons";
import { fitPanelDialog } from "./panel-dialog-layout";

/** Closing keeps the supplied form alive; its owner decides when to discard it. */
export class MusicDialog {
  readonly element = element("dialog", { className: "kl-dialog kl-music-dialog" });
  readonly body = element("div", { className: "kl-dialog-body" });
  readonly title = element("h2", { className: "kl-dialog-title" });
  #returnFocus: HTMLElement | undefined;
  constructor(label: string, onClose = () => {}) {
    this.title.textContent = label; this.title.id = `kl-music-dialog-${crypto.randomUUID()}`;
    this.element.setAttribute("aria-labelledby", this.title.id);
    this.element.append(element("header", { className: "kl-dialog-header" }, this.title,
      element("button", { className: "kl-icon-button", type: "button", ariaLabel: "Close music dialog", title: "Keep draft and close", onClick: () => this.close() }, kikiIcon("close"))), this.body);
    this.element.addEventListener("keydown", event => { if (event.key === "Escape") event.stopPropagation(); });
    this.element.addEventListener("cancel", event => { event.preventDefault(); this.close(); });
    this.element.addEventListener("close", () => { onClose(); if (this.#returnFocus?.isConnected) this.#returnFocus.focus({ preventScroll: true }); this.#returnFocus = undefined; });
  }
  show(): void {
    if (this.element.open) return;
    this.#returnFocus = focusedElement(this.element);
    this.element.showModal();
    fitPanelDialog(this.element);
  }
  close(): void { if (this.element.open) this.element.close(); }
  destroy(): void { this.#returnFocus = undefined; this.close(); this.element.remove(); }
}

type Editor = "new" | "playlist" | "track" | "copy" | "clear" | "delete";
export class MusicLibraryActions {
  readonly resume = element("button", { className: "kl-text-button kl-music-resume", type: "button", text: "Resume editing" });
  readonly dialog = new MusicDialog("Playlist", () => { this.resume.hidden = !this.#dirty?.(); });
  readonly status = element("div", { className: "kl-music-library-status" });
  #dirty: (() => boolean) | undefined;
  #error: HTMLElement | undefined;
  constructor(private readonly settings: SettingsStore, private readonly hooks: {
    refresh: () => void; removed: (tracks: MusicTrack[]) => Promise<void>; busy: () => boolean;
  }) {
    this.dialog.element.classList.add("kl-music-editor-dialog");
    this.resume.hidden = true; this.resume.addEventListener("click", () => this.dialog.show());
    this.status.hidden = true; this.status.setAttribute("role", "status");
  }
  suspend(): void { this.dialog.close(); }
  get hasDraft(): boolean { return Boolean(this.#dirty?.()); }
  destroy(): void { this.dialog.destroy(); }
  error(message: string): void {
    const target = this.dialog.element.open && this.#error ? this.#error : this.status;
    target.textContent = message; target.hidden = false;
  }
  #write(change: (draft: ReturnType<SettingsStore["get"]>) => void): boolean {
    try { this.settings.update(change, { requirePersistence: true }); this.status.hidden = true; this.hooks.refresh(); return true; }
    catch (error) { this.error(error instanceof Error ? error.message : "Changes could not be saved. Try again."); return false; }
  }
  #playlist(id: string, values = this.settings.getSection("linkMusic").playlists): MusicPlaylist {
    const found = values.find(value => value.id === id);
    if (!found) throw new Error("This playlist was removed. Choose another playlist."); return found;
  }
  #count(values = this.settings.getSection("linkMusic").playlists): number { return values.reduce((sum, p) => sum + p.tracks.length, 0); }
  #finish(): void { this.#dirty = undefined; this.resume.hidden = true; this.dialog.close(); }
  edit(kind: Editor, playlistId: string, trackId?: string): void {
    if (this.#dirty?.()) { this.dialog.show(); this.error("Save or discard the current draft first."); return; }
    const playlists = this.settings.getSection("linkMusic").playlists;
    const playlist = playlists.find(p => p.id === playlistId), track = playlist?.tracks.find(t => t.id === trackId);
    if (!playlist || ((kind === "track" || kind === "copy") && !track)) { this.error("This item is no longer available."); return; }
    const initial = kind === "playlist" ? playlist.name : kind === "track" ? track!.title : "";
    const input = element("input", { className: "kl-search", ariaLabel: kind === "track" ? "Track title" : "Playlist name" });
    input.value = initial; input.maxLength = kind === "track" ? 80 : 60; input.autocomplete = "off";
    const target = element("select", { className: "kl-select", ariaLabel: "Destination playlist" });
    const option = (value: string, text: string): HTMLOptionElement => { const node = element("option", { text }); node.value = value; return node; };
    target.append(option("", "Choose a playlist"), ...playlists.filter(p => p.id !== playlistId && !p.tracks.some(t => t.source === track?.source && t.locator === track?.locator))
      .map(p => option(p.id, p.name)));
    const destructive = kind === "clear" || kind === "delete";
    this.#dirty = () => !destructive && (kind === "copy" ? Boolean(target.value) : input.value !== initial);
    const error = element("p", { className: "kl-music-form-error" }); error.hidden = true; error.setAttribute("role", "alert"); this.#error = error;
    const title = { new: "New playlist", playlist: "Rename playlist", track: "Rename track", copy: "Add to playlist", clear: "Clear playlist?", delete: "Delete playlist?" }[kind];
    this.dialog.title.textContent = title;
    const form = element("form", { className: "kl-music-form" });
    const submit = element("button", { className: `kl-text-button ${destructive ? "kl-text-button--danger" : "kl-text-button--primary"}`, type: "submit", text: kind === "new" ? "Create playlist" : kind === "copy" ? "Add track" : destructive ? `${kind === "clear" ? "Clear" : "Delete"} playlist` : "Save" });
    const sourceSnapshot = destructive ? JSON.stringify(playlist) : initial;
    const fields = element("div", { className: "kl-music-form-fields" },
      destructive
        ? element("p", { text: `“${playlist.name}” will ${kind === "clear" ? "lose all its tracks" : "be removed"}. Saved audio files stay on this device. Manage them in Settings → Data & about → Saved device files.` })
        : element("label", {}, element("span", { text: kind === "copy" ? "Playlist" : kind === "track" ? "Track title" : "Playlist name" }), kind === "copy" ? target : input),
      error);
    form.append(fields,
      element("footer", { className: "kl-music-form-actions" }, element("button", { className: "kl-text-button", type: "button", text: destructive ? "Cancel" : "Discard changes", onClick: () => this.#finish() }), submit));
    form.addEventListener("submit", event => {
      event.preventDefault(); error.hidden = true;
      if (this.hooks.busy()) { this.error("Wait for the current audio import to finish."); return; }
      const value = kind === "copy" ? target.value : input.value.trim();
      if (!destructive && (!value || (kind !== "copy" && value.length > input.maxLength))) { this.error(kind === "copy" ? "Choose a playlist." : "Enter a name within the character limit."); (kind === "copy" ? target : input).focus(); return; }
      let removed: MusicTrack[] = [];
      if (!this.#write(draft => {
        const music = draft.linkMusic, saved = this.#playlist(playlistId, music.playlists);
        if (kind === "new") {
          if (music.playlists.length >= 8) throw new Error("You can keep up to 8 playlists.");
          const id = crypto.randomUUID(); music.playlists.push({ id, name: value, tracks: [] }); music.activePlaylistId = id;
        } else if (kind === "playlist") {
          if (saved.name !== sourceSnapshot) throw new Error("This playlist changed. Discard this draft to reopen the latest version."); saved.name = value;
        } else if (kind === "track" || kind === "copy") {
          const current = saved.tracks.find(t => t.id === trackId); if (!current) throw new Error("This track was removed.");
          if (kind === "track") { if (current.title !== sourceSnapshot) throw new Error("This track changed. Discard this draft to reopen it."); current.title = value; }
          else {
            const destination = this.#playlist(value, music.playlists);
            if (destination.tracks.some(t => t.source === current.source && t.locator === current.locator)) throw new Error("This track is already in that playlist.");
            if (this.#count(music.playlists) >= 100) throw new Error("You can keep up to 100 saved tracks.");
            destination.tracks.push({ ...current, id: crypto.randomUUID(), addedAt: Date.now() });
          }
        } else {
          if (JSON.stringify(saved) !== sourceSnapshot) throw new Error("This playlist changed. Close and review it again before removing tracks.");
          if (kind === "delete" && music.playlists.length === 1) throw new Error("Keep at least one playlist.");
          removed = [...saved.tracks];
          if (kind === "clear") saved.tracks = [];
          else { music.playlists = music.playlists.filter(p => p.id !== playlistId); if (music.activePlaylistId === playlistId) music.activePlaylistId = music.playlists[0]!.id; }
        }
      })) return;
      this.#finish(); if (removed.length) void this.hooks.removed(removed).catch(e => this.error(e instanceof Error ? e.message : "Could not clean up audio files."));
    });
    this.dialog.body.replaceChildren(form); this.dialog.show(); (destructive ? form.querySelector<HTMLButtonElement>('button[type="button"]')! : kind === "copy" ? target : input).focus();
  }
  duplicate(playlistId: string): void {
    if (this.hooks.busy()) { this.error("Wait for the current audio import to finish."); return; }
    this.#write(draft => {
      const music = draft.linkMusic, source = this.#playlist(playlistId, music.playlists);
      if (music.playlists.length >= 8 || this.#count(music.playlists) + source.tracks.length > 100) throw new Error("Duplicating would exceed 8 playlists or 100 saved tracks.");
      const id = crypto.randomUUID(); music.playlists.push({ id, name: `${source.name.slice(0, 55)} copy`, tracks: source.tracks.map(t => ({ ...t, id: crypto.randomUUID(), addedAt: Date.now() })) }); music.activePlaylistId = id;
    });
  }
  move(playlistId: string, trackId: string, direction: number): void {
    this.#write(draft => { const tracks = this.#playlist(playlistId, draft.linkMusic.playlists).tracks, at = tracks.findIndex(t => t.id === trackId), next = at + direction;
      if (at < 0 || next < 0 || next >= tracks.length) return; [tracks[at], tracks[next]] = [tracks[next]!, tracks[at]!]; });
  }
  remove(playlistId: string, trackId: string): void {
    let removed: MusicTrack[] = [];
    if (this.#write(draft => { const p = this.#playlist(playlistId, draft.linkMusic.playlists); removed = p.tracks.filter(t => t.id === trackId); p.tracks = p.tracks.filter(t => t.id !== trackId); })) {
      void this.hooks.removed(removed).catch(e => this.error(e instanceof Error ? e.message : "Could not clean up audio files."));
    }
  }
}
