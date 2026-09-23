import { element } from "./dom";
import { kikiIcon } from "../modules/link-chat/icons";
import type { CommunityService } from "./community";
import type { BCAdapter } from "../bc/adapter";

/** Shared action states; this component never infers an inbound vanilla request. */
export function renderRelationshipControls(root: HTMLElement, peer: number, service: CommunityService | undefined, adapter: BCAdapter): void {
  if (root.dataset.busy === "true") return;
  const relation = service?.relationships.get(peer), native = (adapter.isKnownFriend?.(peer) ?? false);
  root.replaceChildren(); root.classList.add("kl-relationship-controls");
  const status = element("small", { className: "kl-cloud-status", role: "status" });
  const action = (title: string, work: () => void | Promise<void>, icon: "group-add" | "check" | "close" = "group-add") => {
    const button = element("button", { type: "button", className: "kl-text-button kl-friend-action", text: title });
    button.prepend(kikiIcon(icon));
    button.addEventListener("click", () => {
      if (root.dataset.busy === "true") return;
      root.dataset.busy = "true"; button.textContent = "Sending…";
      for (const control of root.querySelectorAll<HTMLButtonElement>("button")) control.disabled = true;
      void Promise.resolve().then(work).then(() => { root.dataset.busy = "false"; renderRelationshipControls(root, peer, service, adapter); })
        .catch(error => { root.dataset.busy = "false"; renderRelationshipControls(root, peer, service, adapter);
          status.textContent = error instanceof Error ? error.message : "Action could not be confirmed. Retry."; root.append(status); });
    }); return button;
  };
  if (!relation?.supported || !service) {
    const add = action(native ? "BC friend" : "Add to BC friends", () => adapter.setNativeFriend(peer, true)); add.disabled = native;
    add.title = "Native one-sided friend list. Cloud requests are not supported by this contact."; root.append(add); return;
  }
  if (relation.state === "received") {
    root.append(action("Accept", () => service.action(peer, "accept"), "check"), action("Decline", () => service.action(peer, "decline"), "close")); return;
  }
  if (relation.state === "sent" || relation.state === "accepted") {
    const label = relation.state === "sent" ? "Pending Request" : relation.canMessage ? "Friends" : "Friend sync pending";
    const main = element("button", { className: "kl-text-button kl-friend-action", type: "button", text: label }); main.disabled = true; main.prepend(kikiIcon("check"));
    const menu = element("details", { className: "kl-social-menu" }, element("summary", { ariaLabel: "Friend actions", title: "Friend actions" }, kikiIcon("more")));
    const actions = element("div", { className: "kl-social-menu-items" });
    if (!native || relation.nativeSyncRequired) actions.append(action("Retry friend sync", () => service.action(peer, "sync")));
    actions.append(action(relation.state === "sent" ? "Cancel request" : "Remove friend", () => service.action(peer, relation.state === "sent" ? "cancel" : "remove"), "close"));
    menu.append(actions); root.append(main, menu); return;
  }
  root.append(action("Send friend request", () => service.action(peer, "request")));
}
