import { groupInvitationCountLabel, type MailItem } from "../../cloud/community";
import type { CloudClient } from "../../cloud/client";
import { element } from "../../cloud/dom";
import type { GroupInvitation } from "../../cloud/group-inbox";
import { kikiIcon } from "./icons";

interface PreviewOptions {
  current(): boolean;
  allowImages(): boolean;
  blocked(member: number): boolean;
  name(member: number): string;
  renderAvatar(target: HTMLElement, name: string, member: number): void;
}

const roles = { owner: "Owner", admin: "Admin", member: "Member" } as const;

/** One mounted review owns its roster, thumbnail request and object URL. */
export class GroupInvitationPreview {
  readonly icon = element("span", { className: "kl-group-invitation-review-icon", ariaHidden: "true" }, kikiIcon("users"));
  readonly count = element("span", { className: "kl-group-invitation-count", hidden: true });
  readonly roster = element("ul", { className: "kl-group-invitation-members", hidden: true });
  #rosterKey = "";
  #avatarId: string | undefined;
  #avatarURL: string | undefined;
  #version = 0;

  constructor(private readonly client: CloudClient, private readonly options: PreviewOptions) {}

  update(invite?: GroupInvitation, generation?: string): void {
    if (!invite || !this.#showMembers(invite.members, invite.capacity)) { this.clear(); return; }
    this.count.hidden = false;
    this.count.textContent = `${invite.members.length}/${invite.capacity} members`;
    this.#showAvatar(invite.avatarId, invite.invitedAt, invite.members, (asset, at) => this.client.invitationAvatar(invite.id, asset, at, generation));
  }

  updateHistory(mail: MailItem): void {
    const snapshot = mail.groupInvitationHistoryPreview;
    if (!snapshot || !groupInvitationCountLabel(mail) || !Array.isArray(snapshot.members) ||
      snapshot.members.length !== mail.groupInvitationMemberCount || !this.#showMembers(snapshot.members, mail.groupInvitationCapacity)) {
      this.clear();
      return;
    }
    this.#showAvatar(snapshot.avatarId, mail.groupInvitedAt, snapshot.members, (asset, at) =>
      this.client.historicalInvitationAvatar(mail.id, asset, at, mail.recoveryGeneration));
  }

  #showMembers(members: GroupInvitation["members"], capacity: number | undefined): members is NonNullable<GroupInvitation["members"]> {
    if (!Array.isArray(members) || !members.length || typeof capacity !== "number" || !Number.isSafeInteger(capacity) || members.length > capacity ||
      members.some(member => !Number.isSafeInteger(member?.memberNumber) || member.memberNumber <= 0 ||
        !Object.hasOwn(roles, member.role) || this.options.blocked(member.memberNumber)) ||
      new Set(members.map(member => member.memberNumber)).size !== members.length) return false;
    const rows = members.map(member => ({ ...member, name: this.options.name(member.memberNumber) }));
    const key = JSON.stringify(rows);
    if (key !== this.#rosterKey) {
      this.#rosterKey = key;
      this.roster.replaceChildren(...rows.map(member => {
        const portrait = element("span", { className: "kl-avatar kl-group-invitation-member-avatar", ariaHidden: "true" });
        this.options.renderAvatar(portrait, member.name, member.memberNumber);
        return element("li", {}, portrait, element("strong", { text: member.name }),
          element("span", { className: "kl-group-invitation-role", text: roles[member.role] }));
      }));
    }
    this.roster.hidden = false;
    this.roster.setAttribute("aria-label", "Group members");
    return true;
  }

  #showAvatar(assetId: string | null | undefined, invitedAt: number | undefined,
    members: NonNullable<GroupInvitation["members"]>, load: (asset: string, at: number) => Promise<Blob>): void {
    const asset = this.options.allowImages() && typeof assetId === "string" && assetId ? assetId : undefined;
    if (asset === this.#avatarId) return;
    this.#clearAvatar();
    if (!asset || typeof invitedAt !== "number" || !Number.isSafeInteger(invitedAt) || invitedAt <= 0) return;
    this.#avatarId = asset;
    const version = this.#version;
    const current = () => this.options.current() && version === this.#version && this.options.allowImages() && this.icon.isConnected;
    void load(asset, invitedAt).then(blob => {
      if (!current()) return;
      if (members.some(member => this.options.blocked(member.memberNumber))) { this.clear(); return; }
      this.#avatarURL = URL.createObjectURL(blob);
      const img = element("img", { alt: "", src: this.#avatarURL });
      img.addEventListener("error", () => { if (current()) this.#clearAvatar(); }, { once: true });
      this.icon.replaceChildren(img);
    }).catch(() => { /* Keep the group icon when access or decoding fails. */ });
  }

  clear(): void {
    this.#rosterKey = "";
    this.roster.hidden = true;
    this.roster.removeAttribute("aria-label");
    this.roster.replaceChildren();
    this.count.hidden = true;
    this.count.textContent = "";
    this.#clearAvatar();
  }

  #clearAvatar(): void {
    if (!this.#avatarId) return;
    this.#version++;
    this.#avatarId = undefined;
    this.icon.replaceChildren(kikiIcon("users"));
    if (this.#avatarURL) URL.revokeObjectURL(this.#avatarURL);
    this.#avatarURL = undefined;
  }
}
