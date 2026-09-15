import { element } from "./dom";
import { CloudClient, CloudError } from "./client";
import type { CloudMedia, CloudProfile } from "./types";
import type { KikiLinkSettings } from "../core/types";
import type { KeyValueStorage } from "../core/settings";
import { readProfileImage } from "./profile-image";
import { normalizeImageUrl } from "../modules/link-chat/media";
import { syncInitialProfile } from "./profile-sync";

export interface ProfileEditorFields {
  bio: HTMLTextAreaElement;
  statusMessage?: HTMLInputElement;
  avatarUrl: HTMLInputElement; bannerUrl: HTMLInputElement;
  avatarPreview: HTMLElement; bannerPreview: HTMLElement;
  frame: HTMLSelectElement; style: HTMLSelectElement;
  outlineEnabled: HTMLInputElement; outlineColor: HTMLInputElement;
  gradientEnabled: HTMLInputElement; gradientPrimary: HTMLInputElement; gradientSecondary: HTMLInputElement;
  save: HTMLButtonElement;
  renderPreviews?(): void;
}

/** Cloud storage behind the existing profile/status dialog, never a second editor. */
export class CloudProfileEditor {
  readonly element = element("section", { className: "kl-unified-profile" });
  readonly name = element("input", { className: "kl-search", ariaLabel: "KikiLink display name", maxLength: 80 });
  readonly status = element("p", { className: "kl-profile-sync-status", role: "status" });
  readonly visible = element("input", { type: "checkbox", ariaLabel: "Visible KikiLink profile" });
  #current: CloudProfile | undefined;
  #fields: ProfileEditorFields | undefined;
  #files = new Map<"avatar" | "banner", File>();
  #removed = new Set<"avatar" | "banner">();
  #previewUrls = new Map<string, string>();
  #uploads = new WeakMap<File, string>();
  #urlUploads = new Map<string, string>();
  #generation = 0;
  #open = false;
  #busy = false;
  #load: Promise<void> = Promise.resolve();
  #loadError: unknown;
  #unsubscribe: () => void;
  #avatar: { id: string; url: string } | undefined;
  #avatarTask: { id: string; promise: Promise<string> } | undefined;
  #appearanceMigrated = false;
  #automaticRetry: ReturnType<typeof setTimeout> | undefined;
  #automaticAttempts = 0;
  #destroyed = false;

  constructor(readonly client: CloudClient, readonly settings: () => KikiLinkSettings,
    readonly ownName: () => string, readonly onUpdated: (profile: CloudProfile | undefined) => void,
    readonly storage?: KeyValueStorage, readonly automaticSync = false) {
    try { this.#appearanceMigrated = storage?.getItem(`kikilink:profile-appearance:${client.memberNumber}:v1`) === "1"; } catch { /* Keep the old local appearance until the first save. */ }
    this.visible.checked = true;
    const connect = element("button", { type: "button", className: "kl-text-button", text: "Connect profile" });
    connect.addEventListener("click", () => {
      connect.disabled = true;
      void client.connect().then(() => this.#reload(true)).catch(() => { this.status.textContent = "Could not connect. Your profile draft is kept."; })
        .finally(() => { connect.disabled = false; });
    });
    this.element.append(element("label", { className: "kl-presence-field" },
      element("span", { className: "kl-presence-field-label", text: "Display name" }), this.name),
      element("label", { className: "kl-unified-visibility" }, this.visible, "Visible to KikiLink users"), this.status, connect, this.#privacy());
    this.#unsubscribe = client.subscribe(kind => {
      if (kind !== "session") return;
      connect.hidden = client.connected;
      if (!client.connected) {
        clearTimeout(this.#automaticRetry); this.#automaticAttempts = 0;
        this.#generation++; this.#current = undefined; this.#uploads = new WeakMap(); this.#urlUploads.clear(); this.#files.clear(); this.#removed.clear();
        this.#busy = false; this.#setDisabled(false); this.#releasePreviews(); this.onUpdated(undefined);
        if (this.#avatar) URL.revokeObjectURL(this.#avatar.url); this.#avatar = undefined; this.#avatarTask = undefined;
        if (this.#open) this.status.textContent = "Profile disconnected. Connect again to save changes.";
      }
      else if (!this.#open) this.#loadAutomatically();
    });
    connect.hidden = client.connected;
    if (automaticSync && client.connected) this.#loadAutomatically();
  }
  #loadAutomatically(): void {
    if (this.#destroyed) return;
    clearTimeout(this.#automaticRetry);
    void this.#reload(false).then(() => { this.#automaticAttempts = 0; }).catch(() => {
      if (!this.#destroyed && this.automaticSync && this.client.connected && !this.#open && this.#automaticAttempts++ < 2)
        this.#automaticRetry = setTimeout(() => this.#loadAutomatically(), 30000);
    });
  }
  get current(): CloudProfile | undefined { return this.client.connected ? this.#current : undefined; }
  get busy(): boolean { return this.#busy; }
  get preserveLegacyAppearance(): boolean { return !this.#appearanceMigrated; }
  #recordAppearance(): void {
    this.#appearanceMigrated = true;
    try { this.storage?.setItem(`kikilink:profile-appearance:${this.client.memberNumber}:v1`, "1"); } catch { /* The in-session marker still prevents a reset. */ }
  }
  keepControlsLocked(): void { if (this.#busy) this.#setDisabled(true); }
  sourceChanged(kind: "avatar" | "banner"): void {
    if (!this.#open || this.#busy) return;
    this.#files.delete(kind); this.#removed.delete(kind);
    const old = this.#previewUrls.get(kind); if (old) URL.revokeObjectURL(old); this.#previewUrls.delete(kind);
  }
  restorePreview(kind: "avatar" | "banner"): boolean {
    if (!this.#open || !this.#fields || this.#removed.has(kind)) return false;
    const source = kind === "avatar" ? this.#fields.avatarUrl : this.#fields.bannerUrl;
    if (source.value.trim()) return false;
    const target = kind === "avatar" ? this.#fields.avatarPreview : this.#fields.bannerPreview;
    const id = kind === "avatar" ? this.#current?.avatarId : this.#current?.bannerId;
    const url = this.#previewUrls.get(kind) ?? (id ? this.#previewUrls.get(`stored:${id}`) : undefined);
    if (!url) {
      if (id) target.replaceChildren(element("span", { className: "kl-cloud-skeleton", ariaHidden: "true" }));
      return Boolean(id);
    }
    if (target.querySelector<HTMLImageElement>("img")?.src === url) return true;
    target.replaceChildren(element("img", { src: url, alt: "Your profile image", className: "kl-unified-preview-image" })); return true;
  }
  #privacy(): HTMLElement {
    const body = element("div", { className: "kl-unified-privacy" });
    const details = element("details", { className: "kl-unified-privacy" }, element("summary", { text: "Privacy & blocked accounts" }), body);
    const action = (label: string, work: () => Promise<void>) => {
      const button = element("button", { type: "button", className: "kl-text-button", text: label });
      button.addEventListener("click", () => {
        if (this.#busy) return;
        button.disabled = true;
        void work().catch(() => { this.status.textContent = "Could not complete this action. Try again."; }).finally(() => { button.disabled = false; });
      }); return button;
    };
    details.addEventListener("toggle", () => {
      if (!details.open) return;
      body.replaceChildren();
      if (!this.client.connected) { body.textContent = "Connect your profile to manage privacy."; return; }
      const generation = this.#generation;
      void this.client.request<{ items: Array<{ memberNumber: number }> }>("GET", "/v1/blocks").then(result => {
        if (generation !== this.#generation || !this.#open || !details.open) return;
        for (const block of result.items) {
          const button = action(`Unblock #${block.memberNumber}`, async () => { await this.client.request("DELETE", `/v1/blocks/${block.memberNumber}`); button.remove(); });
          body.append(button);
        }
        if (!result.items.length) body.append(element("p", { text: "No blocked accounts in KikiLink Cloud." }));
        const remove = action("Remove saved profile", async () => {
          if (body.querySelector(".kl-profile-delete-confirm")) return;
          const confirmation = element("div", { className: "kl-profile-delete-confirm" },
            element("p", { text: "Remove your saved name, bio, avatar and banner? Your posts and groups remain." }));
          confirmation.append(action("Cancel", async () => { confirmation.remove(); }), action("Remove profile", async () => {
            await this.client.request("DELETE", "/v1/profiles/me"); this.#current = undefined; this.onUpdated(undefined);
            this.#files.clear(); this.#removed.clear(); this.#releasePreviews(); this.name.value = this.ownName();
            if (this.#fields) { this.#fields.bio.value = ""; this.#fields.avatarUrl.value = ""; this.#fields.bannerUrl.value = "";
              this.#fields.avatarPreview.replaceChildren(); this.#fields.bannerPreview.replaceChildren(); }
            this.status.textContent = "Saved profile removed."; confirmation.remove();
          })); body.append(confirmation);
        }); body.append(remove);
      }).catch(() => { if (generation === this.#generation) body.textContent = "Privacy settings could not load. Close this section and open it to retry."; });
    });
    return details;
  }
  paintAvatar(target: HTMLElement): void {
    const id = this.current?.avatarId;
    if (!id) return;
    target.dataset.cloudAvatar = id;
    target.dataset.avatarFrame = this.current?.avatarFrame ?? "none";
    const paint = (url: string) => {
      if (target.querySelector<HTMLImageElement>("img")?.src === url) return;
      if (target.isConnected && this.current?.avatarId === id && target.dataset.cloudAvatar === id)
        target.replaceChildren(element("img", { src: url, alt: this.current.displayName, className: "kl-unified-preview-image" }));
    };
    if (this.#avatar?.id === id) { paint(this.#avatar.url); return; }
    if (!target.querySelector("img")) target.replaceChildren(element("span", { className: "kl-cloud-skeleton", ariaHidden: "true" }));
    const task = this.#avatarTask?.id === id ? this.#avatarTask.promise : this.client.media(id).then(async blob => {
      if (this.current?.avatarId !== id) throw new Error("profile_changed");
      const url = URL.createObjectURL(blob);
      const image = element("img", { src: url });
      try { if (typeof image.decode === "function") await image.decode(); }
      catch (error) { URL.revokeObjectURL(url); throw error; }
      if (!this.client.connected || this.current?.avatarId !== id) { URL.revokeObjectURL(url); throw new Error("profile_changed"); }
      if (this.#avatar) URL.revokeObjectURL(this.#avatar.url);
      this.#avatar = { id, url }; return url;
    });
    this.#avatarTask = { id, promise: task };
    void task.then(paint).catch(() => {}).finally(() => { if (this.#avatarTask?.promise === task) this.#avatarTask = undefined; });
  }

  open(fields: ProfileEditorFields): void {
    clearTimeout(this.#automaticRetry);
    this.close(); this.#open = true; this.#fields = fields;
    this.name.value = this.current?.displayName ?? this.ownName();
    this.#loadError = undefined;
    if (this.client.connected) {
      this.#load = this.#reload(true).catch(error => { this.#loadError = error; this.status.textContent = "Profile could not load. Close and reopen to retry; nothing was overwritten."; });
    } else this.status.textContent = "Connect to keep your name, avatar and banner together across devices.";
  }
  async #reload(hydrate: boolean): Promise<void> {
    const generation = this.#generation;
    if (hydrate) { this.#busy = true; this.#setDisabled(true); this.status.textContent = "Loading your profile…"; }
    try {
      let profile: CloudProfile | undefined;
      try { profile = await this.client.profile(this.client.memberNumber, true); }
      catch (error) { if (!(error instanceof CloudError && error.status === 404)) throw error; }
      if (generation !== this.#generation || !this.client.connected) return;
      if (this.automaticSync) {
        profile = await syncInitialProfile(this.client, this.settings(), this.ownName(), profile, this.storage,
          () => generation === this.#generation && this.client.connected);
        if (generation !== this.#generation || !this.client.connected) return;
      }
      if (profile?.isDefault) profile = undefined;
      if (profile && (profile.avatarFrame !== "none" || profile.profileStyle !== "classic" || profile.profileOutlineColor || profile.profileGradient)) this.#recordAppearance();
      this.#current = profile; this.onUpdated(profile);
      if (!hydrate || !this.#open || !this.#fields) return;
      const fields = this.#fields;
      if (profile) {
        this.name.value = profile.displayName; this.visible.checked = profile.visible;
        fields.bio.value = profile.bio;
        if (fields.statusMessage && profile.statusMessage !== undefined) fields.statusMessage.value = profile.statusMessage;
        // The foundation's empty default appearance must not erase a decorated
        // pre-Cloud KikiLink profile. The existing editor uploads it on Save.
        const emptyAppearance = profile.avatarFrame === "none" && profile.profileStyle === "classic" && !profile.profileOutlineColor && !profile.profileGradient;
        if (!emptyAppearance || this.#appearanceMigrated) {
          fields.frame.value = profile.avatarFrame; fields.style.value = profile.profileStyle;
          fields.outlineEnabled.checked = Boolean(profile.profileOutlineColor); fields.outlineColor.value = profile.profileOutlineColor ?? "#d71932";
          fields.gradientEnabled.checked = Boolean(profile.profileGradient);
          if (profile.profileGradient) { fields.gradientPrimary.value = profile.profileGradient.start; fields.gradientSecondary.value = profile.profileGradient.end; }
        }
        fields.avatarPreview.dataset.avatarFrame = fields.frame.value;
        if (profile.avatarId) { fields.avatarUrl.value = ""; fields.avatarUrl.placeholder = "Avatar saved in KikiLink"; void this.#showStored(profile.avatarId, fields.avatarPreview, generation); }
        if (profile.bannerId) { fields.bannerUrl.value = ""; fields.bannerUrl.placeholder = "Banner saved in KikiLink"; void this.#showStored(profile.bannerId, fields.bannerPreview, generation); }
        fields.renderPreviews?.();
      }
      this.status.textContent = "One profile. Save here to update your name, images and appearance everywhere in KikiLink.";
    } finally { if (generation === this.#generation && hydrate) { this.#busy = false; this.#setDisabled(false); } }
  }
  #setDisabled(value: boolean): void {
    if (!this.#fields) return;
    for (const control of [this.name, this.visible, ...(this.#fields.statusMessage ? [this.#fields.statusMessage] : []), this.#fields.bio, this.#fields.avatarUrl, this.#fields.bannerUrl, this.#fields.frame, this.#fields.style,
      this.#fields.outlineEnabled, this.#fields.outlineColor, this.#fields.gradientEnabled, this.#fields.gradientPrimary, this.#fields.gradientSecondary, this.#fields.save]) control.disabled = value;
  }
  async #showStored(id: string, target: HTMLElement, generation: number): Promise<void> {
    const key = `stored:${id}`;
    const cached = this.#previewUrls.get(key);
    if (cached) {
      target.replaceChildren(element("img", { src: cached, alt: "Your profile image", className: "kl-unified-preview-image" }));
      return;
    }
    if (!target.querySelector("img")) target.replaceChildren(element("span", { className: "kl-cloud-skeleton", ariaHidden: "true" }));
    try {
      const blob = await this.client.media(id);
      if (!this.#open || generation !== this.#generation || !target.isConnected) return;
      const kind = target === this.#fields?.avatarPreview ? "avatar" : "banner";
      if (this.#files.has(kind) || this.#removed.has(kind) || (kind === "avatar" ? this.#fields?.avatarUrl.value : this.#fields?.bannerUrl.value)) return;
      const url = URL.createObjectURL(blob);
      const image = element("img", { src: url, alt: "Your profile image", className: "kl-unified-preview-image" });
      try { if (typeof image.decode === "function") await image.decode(); }
      catch (error) { URL.revokeObjectURL(url); throw error; }
      if (!this.#open || generation !== this.#generation || !this.client.connected || this.#files.has(kind) || this.#removed.has(kind) || (kind === "avatar" ? this.#fields?.avatarUrl.value : this.#fields?.bannerUrl.value)) { URL.revokeObjectURL(url); return; }
      const old = this.#previewUrls.get(key); if (old) URL.revokeObjectURL(old);
      for (const [stored, previous] of this.#previewUrls) {
        if (stored.startsWith("stored:") && stored !== `stored:${this.#current?.avatarId}` && stored !== `stored:${this.#current?.bannerId}`) {
          URL.revokeObjectURL(previous); this.#previewUrls.delete(stored);
        }
      }
      this.#previewUrls.set(key, url); target.replaceChildren(image);
    } catch { /* The stored media ID remains unchanged even when its preview fails. */ }
  }
  choose(kind: "avatar" | "banner", file: File): void {
    if (!this.#open || this.#busy || !this.#fields) return;
    const max = (kind === "avatar" ? 2 : 5) * 1024 ** 2;
    if (!/^image\/(png|jpeg|webp)$/u.test(file.type) || file.size > max) {
      this.status.textContent = `Choose PNG, JPEG or WebP, up to ${kind === "avatar" ? 2 : 5} MiB.`; return;
    }
    this.#files.set(kind, file); this.#removed.delete(kind);
    const url = URL.createObjectURL(file), old = this.#previewUrls.get(kind);
    if (old) URL.revokeObjectURL(old);
    this.#previewUrls.set(kind, url);
    const target = kind === "avatar" ? this.#fields.avatarPreview : this.#fields.bannerPreview;
    target.replaceChildren(element("img", { src: url, alt: file.name, className: "kl-unified-preview-image" }));
    (kind === "avatar" ? this.#fields.avatarUrl : this.#fields.bannerUrl).value = "";
    this.status.textContent = `${kind === "avatar" ? "Avatar" : "Banner"} selected. Save profile to upload it.`;
  }
  remove(kind: "avatar" | "banner"): void {
    if (this.#busy || !this.#fields) return;
    this.#files.delete(kind); this.#removed.add(kind);
    (kind === "avatar" ? this.#fields.avatarUrl : this.#fields.bannerUrl).value = "";
    (kind === "avatar" ? this.#fields.avatarPreview : this.#fields.bannerPreview).replaceChildren();
    this.status.textContent = `${kind === "avatar" ? "Avatar" : "Banner"} will be removed when you save.`;
  }
  async save(): Promise<void> {
    await this.#load;
    if (this.#loadError) throw new CloudError("profile_load_failed");
    if (!this.client.connected || !this.#fields) throw new CloudError("authentication_required");
    if (this.#busy) throw new CloudError("profile_save_busy");
    const fields = this.#fields, generation = this.#generation;
    const name = this.name.value.trim();
    if (!name || name.length > 80) throw new CloudError("invalid_display_name");
    const input = {
      displayName: name, bio: fields.bio.value,
      avatarFrame: fields.frame.value, profileStyle: fields.style.value,
      visible: this.visible.checked, revision: this.#current?.revision ?? 0,
      ...(fields.outlineEnabled.checked ? { profileOutlineColor: fields.outlineColor.value } : {}),
      ...(fields.gradientEnabled.checked ? { profileGradient: { start: fields.gradientPrimary.value, end: fields.gradientSecondary.value } } : {}),
    };
    const urls = { avatar: fields.avatarUrl.value, banner: fields.bannerUrl.value };
    this.#busy = true; this.#setDisabled(true); this.status.textContent = "Saving your profile…";
    try {
      const ids = { avatarId: this.#current?.avatarId ?? null, bannerId: this.#current?.bannerId ?? null };
      for (const kind of ["avatar", "banner"] as const) {
        const key = kind === "avatar" ? "avatarId" : "bannerId";
        if (this.#removed.has(kind)) { ids[key] = null; continue; }
        const file = this.#files.get(kind);
        if (file) {
          let id = this.#uploads.get(file);
          if (!id) { id = (await this.client.request<CloudMedia>("POST", `/v1/media/${kind}`, file)).id; this.#uploads.set(file, id); }
          ids[key] = id;
        } else if (urls[kind].trim()) {
          const url = normalizeImageUrl(urls[kind]);
          if (!url) throw new CloudError("invalid_image_url");
          const keyForUrl = `${kind}:${url}`;
          let id = this.#urlUploads.get(keyForUrl);
          if (!id) { const image = await readProfileImage(url, kind); id = (await this.client.request<CloudMedia>("POST", `/v1/media/${kind}`, image)).id; this.#urlUploads.set(keyForUrl, id); }
          ids[key] = id;
        }
      }
      const features = fields.statusMessage || this.automaticSync
        ? (await this.client.request<{features?: {fullProfile?: boolean}}>("GET", "/v1/me"))?.features : undefined;
      const profile = await this.client.request<CloudProfile>("PUT", "/v1/profiles/me", { ...input, ...ids,
        ...(features?.fullProfile ? { statusMessage: fields.statusMessage?.value ?? this.settings().linkPresence.statusMessage } : {}) });
      if (generation !== this.#generation) return;
      this.#recordAppearance(); this.#current = profile; this.onUpdated(profile);
      this.status.textContent = "Profile saved.";
    } finally { if (generation === this.#generation) { this.#busy = false; this.#setDisabled(false); } }
  }
  #releasePreviews(keepStored = false): void {
    for (const [key, url] of this.#previewUrls) {
      if (keepStored && (key === `stored:${this.#current?.avatarId}` || key === `stored:${this.#current?.bannerId}`)) continue;
      URL.revokeObjectURL(url); this.#previewUrls.delete(key);
    }
  }
  close(): void { this.#generation++; this.#open = false; this.#busy = false; this.#files.clear(); this.#removed.clear(); this.#urlUploads.clear(); this.#releasePreviews(true); this.#fields = undefined; }
  destroy(): void { this.#destroyed = true; clearTimeout(this.#automaticRetry); this.close(); this.#releasePreviews(); this.#current = undefined; if (this.#avatar) URL.revokeObjectURL(this.#avatar.url); this.#avatar = undefined; this.#unsubscribe(); }
}
