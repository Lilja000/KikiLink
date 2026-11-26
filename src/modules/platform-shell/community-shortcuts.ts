import {communityManagementRead} from '../../cloud/moderation-generation';
import type { CloudClient } from "../../cloud/client";
import { element } from "../../utils/dom";
import { kikiIcon } from "../link-chat/icons";
import { communityIcon, type CommunityDesign } from "./community-design";

interface Shortcut extends CommunityDesign { id: string; name: string; membership: string; archived: boolean; memberCount: number; onlineCount?: number | null; }

/** A bounded, account-pinned list. Opening a shortcut rechecks access in CommunitiesPage. */
export class CommunityShortcuts {
  readonly element = element("section", { className: "kl-shell-communities", ariaLabel: "Your communities" });
  #visible = false;
  #destroyed = false;
  #token = 0;
  #supported = false;
  #release: (() => void) | undefined;
  readonly #unsubscribe: () => void;
  constructor(private readonly client: CloudClient, private readonly current: () => boolean,
    private readonly open: (id: string) => void, private readonly onCreate?: () => void) {
    this.element.hidden = true;
    this.#unsubscribe = client.subscribe(kind => {
      if (["session", "connection", "disconnected", "communities", "blocks", "ready", "connected", "reconnected"].includes(kind)) {
        ++this.#token; this.#supported = false; this.element.replaceChildren();
        if (this.#visible) void this.refresh();
      }
    });
  }
  setVisible(visible: boolean): void {
    if (visible === this.#visible || this.#destroyed) return;
    this.#visible = visible; this.element.hidden = !visible;
    if (visible) { this.#release = this.client.retainEvents(); void this.refresh(); }
    else { ++this.#token; this.#supported = false; this.#release?.(); this.#release = undefined; this.element.replaceChildren(); }
  }
  get canCreate(): boolean { return !!this.onCreate && this.#supported && this.#valid(this.#token); }
  create(): void { if (this.canCreate) this.onCreate!(); }
  #valid(token: number): boolean { return !this.#destroyed && this.#visible && token === this.#token && this.client.connected && this.current(); }
  async refresh(): Promise<void> {
    const token = ++this.#token; this.#supported = false; this.element.replaceChildren();
    if (!this.#valid(token)) return;
    const heading = element("h3", { text: "Your communities" });
    const create = () => {
      if (this.canCreate) this.element.append(element("button", { type: "button", className: "kl-shell-community-create", onClick: () => { if (this.#valid(token)) this.create(); } },
        kikiIcon("plus"), element("span", { text: "Create a community" })));
    };
    try {
      const me = await this.client.request<{ features?: { communities?: boolean } }>("GET", "/v1/me");
      if (!this.#valid(token) || !me.features?.communities) return;
      this.#supported = true;
      const page = await communityManagementRead(this.client,me).request<{ items: Shortcut[] }>("GET", "/v1/communities?scope=mine&limit=5&cursor=0");
      if (!this.#valid(token)) return;
      this.element.append(heading);
      const items = page.items.filter(item => item.membership === "active" && !item.archived).slice(0, 5);
      for (const item of items) {
        const button = element("button", { className: "kl-shell-community", type: "button", title: item.name, onClick: () => { if (this.#valid(token)) this.open(item.id); } }, communityIcon(item),
          element("span", {}, element("strong", { text: item.name }), element("small", { text: typeof item.onlineCount === "number" ? `${item.onlineCount} online` : `${item.memberCount} ${item.memberCount === 1 ? "member" : "members"}` })));
        button.dataset.community = item.id; this.element.append(button);
      }
      if (!items.length) this.element.append(element("p", { text: "Communities you join appear here." }));
      create();
    } catch {
      if (!this.#valid(token)) return;
      this.element.replaceChildren(heading, element("p", { text: "Could not load your communities." }),
        element("button", { type: "button", className: "kl-shell-community-retry", text: "Retry", onClick: () => { if (this.#valid(token)) void this.refresh(); } }));
      create();
    }
  }
  destroy(): void { this.setVisible(false); this.#destroyed = true; this.#unsubscribe(); this.element.remove(); }
}
