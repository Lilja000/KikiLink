import { element } from "./dom";
import { kikiIcon, type KikiLinkIconName } from "../modules/link-chat/icons";
import type { CloudClient } from "./client";
import type { CloudPost } from "./types";

export const REACTIONS = [
  ["heart", "❤️", "Love"], ["like", "👍", "Like"], ["dislike", "👎", "Dislike"],
  ["laugh", "😂", "Laugh"], ["support", "🫶", "Support"],
  ["wow", "😮", "Wow"], ["sad", "😢", "Sad"],
] as const;
export type Reaction = typeof REACTIONS[number][0];
export type Author = CloudPost["profile"];
export interface SocialUIOptions {
  client: CloudClient;
  run(action: () => Promise<unknown> | void, button?: HTMLButtonElement): Promise<void>;
  image(id: string, alt: string, className?: string, passive?: boolean): HTMLElement;
  openProfile(member: number, name: string): void;
  isBlocked(member: number): boolean;
}

export class SocialUI {
  readonly #authors = new Set<WeakRef<HTMLElement>>();
  readonly #states = new WeakMap<HTMLElement, { profile: Author; avatar: HTMLButtonElement; name: HTMLButtonElement; openMembers?: () => void }>();
  readonly #unsubscribe: () => void;
  constructor(readonly options: SocialUIOptions) {
    this.#unsubscribe = options.client.subscribe(kind => {
      if (kind.startsWith("profile:")) {
        const member = Number(kind.slice(8));
        const profile = options.client.peekProfile?.(member);
        this.refreshAuthor(profile ?? this.#default(member));
      } else if (kind === "profiles-cleared") {
        for (const ref of this.#authors) {
          const root = ref.deref(); if (!root) { this.#authors.delete(ref); continue; }
          if (this.#blocked(Number(root.dataset.cloudMember))) root.hidden = true;
        }
      }
    });
  }
  destroy(): void { this.#unsubscribe(); this.#authors.clear(); }
  #blocked(member: number): boolean { return this.options.isBlocked(member) || (this.options.client.isProfileBlocked?.(member) ?? false); }
  #default(member: number): Author { return { memberNumber: member, displayName: `Member ${member}`, avatarId: null, avatarFrame: "none" }; }
  button(label: string, action: () => Promise<unknown> | void, icon?: KikiLinkIconName, className = "kl-social-button"): HTMLButtonElement {
    const button = element("button", { type: "button", className, title: label, ariaLabel: label },
      ...(icon ? [kikiIcon(icon)] : []), element("span", { text: label }));
    button.addEventListener("click", () => void this.options.run(action, button));
    return button;
  }
  author(profile: Author, at?: number, openMembers?: () => void): HTMLElement {
    const open = () => { if (openMembers) openMembers(); else if (!this.#blocked(profile.memberNumber)) this.options.openProfile(profile.memberNumber, this.#states.get(root)?.profile.displayName ?? profile.displayName); };
    const avatar = this.button(openMembers ? "Show group members" : `Open ${profile.displayName}'s profile`, open, undefined, "kl-social-avatar kl-avatar");
    const name = this.button(profile.displayName, open, undefined, "kl-social-name");
    const copy = element("div", { className: "kl-social-author-copy" }, name,
      element("div", { className: "kl-social-meta" }, element("span", { text: `#${profile.memberNumber}` }), ...(at === undefined ? [] : [timeLabel(at)])));
    const root = element("div", { className: "kl-social-author" }, avatar, copy);
    root.dataset.cloudMember = String(profile.memberNumber);
    if (at !== undefined) root.dataset.at = String(at);
    this.#states.set(root, { profile, avatar, name, ...(openMembers ? { openMembers } : {}) });
    this.#authors.add(new WeakRef(root));
    while (this.#authors.size > 1000) this.#authors.delete(this.#authors.values().next().value!);
    this.updateAuthor(root, profile);
    return root;
  }
  updateAuthor(root: HTMLElement, profile: Author, loading = false): void {
    const state = this.#states.get(root); if (!state) return;
    state.profile = profile;
    const { avatar, name } = state;
    root.hidden = this.#blocked(profile.memberNumber);
    root.setAttribute("aria-busy", String(loading));
    name.querySelector("span")!.textContent = loading ? "\u00a0" : profile.displayName;
    name.dataset.loading = String(loading);
    name.title = loading ? "Loading profile" : profile.displayName;
    name.setAttribute("aria-label", name.title);
    avatar.title = state.openMembers ? "Show group members" : `Open ${profile.displayName}'s profile`;
    avatar.setAttribute("aria-label", avatar.title);
    avatar.dataset.avatarFrame = profile.avatarFrame;
    const key = loading ? "loading" : profile.avatarId || `initials:${profile.displayName}`;
    if (avatar.dataset.content === key) return;
    avatar.dataset.content = key;
    const fallback = () => {
      if (avatar.dataset.content !== key || avatar.querySelector(".kl-social-initials")) return;
      avatar.append(element("span", { className: "kl-social-initials", text: initials(profile.displayName) }));
    };
    if (loading) avatar.replaceChildren(element("span", { className: "kl-cloud-skeleton", ariaHidden: "true" }));
    else if (profile.avatarId) {
      const media = this.options.image(profile.avatarId, "Profile avatar", "kl-social-avatar-image", true);
      avatar.replaceChildren(media);
      if (media.dataset.state === "hidden" || media.dataset.state === "error") fallback();
      media.addEventListener("cloud-image-error", fallback, { once: true });
    } else { avatar.replaceChildren(); fallback(); }
  }
  refreshAuthor(profile: Author): void {
    for (const ref of this.#authors) {
      const root = ref.deref(); if (!root) { this.#authors.delete(ref); continue; }
      if (Number(root.dataset.cloudMember) === profile.memberNumber) this.updateAuthor(root, profile);
    }
  }
  member(member: number, at?: number, openMembers?: () => void): HTMLElement {
    const cached = this.options.client.peekProfile?.(member);
    const root = this.author(cached ?? this.#default(member), at, openMembers);
    if (!cached) this.updateAuthor(root, this.#default(member), true);
    if (!this.#blocked(member)) void this.options.client.profile(member).then(p => {
      if (!this.options.client.connected || this.#blocked(member)) return;
      this.updateAuthor(root, p);
    }).catch(() => {
      if (!cached) this.updateAuthor(root, this.#default(member));
    });
    return root;
  }
  menu(label: string, actions: HTMLElement[]): HTMLElement {
    const details = element("details", { className: "kl-social-menu" });
    const summary = element("summary", { title: label, ariaLabel: label }, kikiIcon("more"));
    details.append(summary, element("div", { className: "kl-social-menu-items" }, ...actions));
    details.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.stopPropagation(); details.open = false; summary.focus(); }
    });
    details.addEventListener("focusout", () => queueMicrotask(() => {
      if (!details.contains(details.getRootNode() instanceof ShadowRoot ? (details.getRootNode() as ShadowRoot).activeElement : document.activeElement)) details.open = false;
    }));
    for (const action of actions) action.addEventListener("click", () => { details.open = false; });
    return details;
  }
  confirm(container: HTMLElement, title: string, action: () => Promise<unknown>, label = "Delete"): void {
    container.querySelector(".kl-social-confirm")?.remove();
    const box = element("div", { className: "kl-social-confirm", role: "group", ariaLabel: title });
    box.append(element("strong", { text: title }),
      this.button("Cancel", () => box.remove()),
      this.button(label, async () => { await action(); box.remove(); }, "check", "kl-social-button kl-social-danger"));
    container.append(box);
    box.querySelector<HTMLButtonElement>("button")?.focus();
  }
}

export function initials(name: string): string {
  return name.trim().split(/\s+/u).slice(0, 2).map(word => [...word][0] ?? "").join("").toLocaleUpperCase() || "?";
}
export function timeLabel(at: number): HTMLElement {
  const date = new Date(at), elapsed = Math.max(0, Date.now() - at);
  const text = elapsed < 60000 ? "Just now" : elapsed < 3600000 ? `${Math.floor(elapsed / 60000)}m` : elapsed < 86400000 ? `${Math.floor(elapsed / 3600000)}h` : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return element("time", { dateTime: date.toISOString(), text, title: date.toLocaleString() });
}
