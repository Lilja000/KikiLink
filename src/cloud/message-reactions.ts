import { markMemberAvatar } from "../modules/link-chat/avatar-presence";
import {GroupMutationIntent,type GroupMutationSource} from './group-mutation-intent';
import {ChannelMutationIntent,type ChannelMutationSource} from './channel-mutation-intent';
import { CloudError, type CloudClient } from "./client";
import { element } from "./dom";
import { kikiIcon } from "../modules/link-chat/icons";
import { ContentDialog } from "../modules/link-chat/content-dialog";
import { fitPanelDialog } from "../modules/platform-shell/panel-dialog-layout";
import { ShellActionMenu } from "../modules/platform-shell/action-menu";
import reactions from "../../cloud/shared/feed-reactions.json";

let pickerSerial = 0;
const blossom = { id: "blossom", emoji: "🌸", label: "Blossom" };
const catalog = new Map([...reactions, blossom].map(item => [item.id, item]));
const chatChoices = ["heart", "sparkles", "blossom", "laugh", "clap", "hug"].map(id => catalog.get(id)!);
type ReactionWrite = { reaction: string | null; selected?: boolean; revision: number; recoveryGeneration?: string };
interface Reactor { memberNumber: number; displayName: string; reactions: string[] }

export type MessageReactionState = { available: false } | {
  available: true; revision: number; counts: Array<{ reaction: string; count: number }>; mine: string | null; mineReactions?: string[]; reactors?: Reactor[]; recoveryGeneration?: string; messageId?: string;
};
interface Binding {
  id: string; root: HTMLElement; state?: MessageReactionState; generation?: string; pending: boolean;
  retry?: ReactionWrite; error?: string;
}

/** Ephemeral, account-pinned view state. Never writes reactions into local chat history. */
export class MessageReactions {
  #bindings = new Set<Binding>();
  #epoch = 0;
  #closed = false;
  #active = true;
  #task: Promise<void> | undefined;
  #again = false;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #unsubscribe: () => void;
  readonly #picker: ShellActionMenu | undefined;
  #pickerBinding: Binding | undefined;
  #pickerToken = 0;
  #details: ContentDialog | undefined;
  readonly #outside = (event: Event) => {
    for (const binding of this.#bindings) {
      const menu = binding.root.querySelector("details");
      if (menu && !event.composedPath().includes(menu)) menu.open = false;
    }
  };
  readonly #visible = () => { if (document.visibilityState !== "hidden") this.schedule(); };
  constructor(readonly client: CloudClient, readonly container: HTMLElement,
    readonly options: { base: string; kind: "group" | "direct" | "channel"; enabled(): boolean; canReact?(): boolean; choices?(): boolean; generation?(): string | undefined; isBlocked?(member: number): boolean; platformChat?: boolean; group?:{groupId:string;conversationId:string;label:string;source:GroupMutationSource;actions:Map<string,GroupMutationIntent>;changed?():void}; channel?:{communityId:string;channelId:string;label:string;source:ChannelMutationSource;actions:Map<string,ChannelMutationIntent>;changed?():void} }) {
    this.#picker = options.platformChat ? new ShellActionMenu() : undefined;
    if (this.#picker) {
      this.#picker.element.id = `kl-message-reaction-menu-${++pickerSerial}`;
      this.#picker.element.classList.add("kl-message-reaction-menu");
      this.#picker.element.addEventListener("click", event => {
        if (!this.#picker?.element.open) event.stopImmediatePropagation();
      }, true);
    }
    this.#unsubscribe = client.subscribe(kind => {
      if (["communities", "session", "profiles-cleared", "relationships", "groups", "message-reactions", "direct-reactions"].includes(kind)) this.#details?.close();
      if (["communities", "session", "profiles-cleared", "relationships", "groups"].includes(kind)) {
        this.#epoch++;
        for (const b of this.#bindings) { delete b.state; delete b.retry; delete b.error; b.pending = false; this.#render(b); }
      }
      if (["session", "ready", "profiles-cleared", "relationships", "groups", options.kind === "channel" ? "channel-messages" : options.kind === "group" ? "message-reactions" : "direct-reactions"].includes(kind)) this.schedule();
    });
    document.addEventListener("pointerdown", this.#outside, true);
    document.addEventListener("visibilitychange", this.#visible);
  }
  attach(id: string, host: HTMLElement): void {
    if (this.#closed || host.querySelector(".kl-message-reactions")) return;
    const root = element("div", { className: "kl-message-reactions", ariaLabel: "Message reactions", hidden: true });
    const binding: Binding = { id, root, pending: false };
    this.#bindings.add(binding); host.append(root); this.schedule();
  }
  #multiple(): boolean { return !!this.options.platformChat && !!this.options.choices?.() && this.options.kind !== "channel"; }
  #selected(state: Extract<MessageReactionState, { available: true }>, id: string): boolean {
    return this.#multiple() && Array.isArray(state.mineReactions) ? state.mineReactions.includes(id) : state.mine === id;
  }
  #toggle(b: Binding, state: Extract<MessageReactionState, { available: true }>, reaction: string): void {
    const selected = this.#selected(state, reaction);
    if (this.#multiple() && Array.isArray(state.mineReactions)) {
      const generation = b.generation;
      if (generation !== this.options.generation?.()) { this.schedule(); return; }
      void this.#set(b, { reaction, selected: !selected, revision: state.revision, ...(generation ? { recoveryGeneration: generation } : {}) });
    } else void this.#set(b, { reaction: selected ? null : reaction, revision: state.revision });
  }
  participants(id: string, host: HTMLElement): Reactor[] | undefined {
    if (!this.#multiple() || this.#closed || !this.#active || !this.client.connected || !this.options.enabled() || !this.container.contains(host)) return;
    const bound = [...this.#bindings].find(binding => binding.id === id && host.contains(binding.root));
    if (!bound || bound.error || this.#multiple() && bound.generation !== this.options.generation?.()) return;
    const state = bound.state;
    if (!state?.available || !Array.isArray(state.reactors)) return;
    return state.reactors.filter(row => Number.isSafeInteger(row.memberNumber) && row.memberNumber > 0 && !this.options.isBlocked?.(row.memberNumber) && Array.isArray(row.reactions))
      .map(row => ({ memberNumber: row.memberNumber, displayName: row.displayName || `Member ${row.memberNumber}`, reactions: row.reactions.map(id => catalog.get(id)?.emoji).filter((emoji): emoji is string => !!emoji) }));
  }
  showParticipants(id: string, host: HTMLElement, openProfile: (member: number, name: string) => void): void {
    const people = this.participants(id, host);
    if (!people) return;
    const dialog = this.#details ??= new ContentDialog();
    const list = element("div", { className: "kl-thread-reactors" });
    for (const person of people) {
      const name = element("button", { className: "kl-social-name", type: "button", text: person.displayName });
      name.addEventListener("click", () => {
        if (!this.participants(id, host)?.some(row => row.memberNumber === person.memberNumber)) { dialog.close(); return; }
        dialog.close(); openProfile(person.memberNumber, person.displayName);
      });
      list.append(element("div", { className: "kl-thread-reactor" }, markMemberAvatar(element("span", { className: "kl-avatar", text: [...person.displayName][0] ?? "?" }), person.memberNumber, person.displayName), name, element("span", { text: person.reactions.join(" ") })));
    }
    if (!people.length) list.append(element("p", { text: "No visible reactions yet." }));
    const close = element("button", { type: "button", className: "kl-text-button", text: "Close" });
    close.addEventListener("click", () => dialog.close());
    const root = host.getRootNode();
    (host.closest(".kl-panel") ?? (root instanceof ShadowRoot ? root : document.body)).append(dialog.element);
    const observer = new MutationObserver(() => { if (!this.container.contains(host) || !this.participants(id, host)) dialog.close(); });
    observer.observe(this.container, { childList: true, subtree: true });
    dialog.show("Who reacted", element("section", {}, list, element("footer", { className: "kl-dialog-actions" }, close)), () => observer.disconnect());
    fitPanelDialog(dialog.element);
  }
  directParticipants(id: string, host: HTMLElement): { mine: string | null; peer: string | null } | undefined {
    if (this.options.kind !== "direct" || this.#closed || !this.#active || !this.client.connected || !this.options.enabled()) return;
    const bound = [...this.#bindings].find(binding => binding.id === id && host.contains(binding.root));
    if (!bound || bound.error || this.#multiple() && bound.generation !== this.options.generation?.()) return;
    const state = bound.state;
    if (!state?.available) return;
    const peer = state.counts.find(row => row.count > (row.reaction === state.mine ? 1 : 0))?.reaction;
    const emoji = (id: string | null | undefined) => reactions.find(entry => entry.id === id)?.emoji ?? null;
    return { mine: emoji(state.mine), peer: emoji(peer) };
  }
  refreshControls(): void {
    for (const binding of this.#bindings) if (this.container.contains(binding.root)) this.#render(binding);
  }
  schedule(): void {
    if (this.#timer !== undefined || this.#closed || !this.#active) return;
    this.#timer = setTimeout(() => { this.#timer = undefined; void this.refresh(); }, 60);
  }
  pause(): void {
    this.#active = false; this.#epoch++; clearTimeout(this.#timer); this.#timer = undefined;
    this.#closePicker(); this.#details?.close();
    for (const b of this.#bindings) if (b.pending) { b.pending = false; delete b.state; this.#render(b); }
  }
  resume(): void { this.#active = true; this.schedule(); }
  destroy(): void {
    this.pause(); this.#closed = true; this.#unsubscribe(); this.#bindings.clear();
    this.#details?.destroy(); this.#picker?.destroy();
    document.removeEventListener("pointerdown", this.#outside, true);
    document.removeEventListener("visibilitychange", this.#visible);
  }
  async refresh(): Promise<void> {
    if (this.#closed || !this.#active || !this.options.enabled() || !this.client.connected || document.visibilityState === "hidden") return;
    if (this.#task) { this.#again = true; return this.#task; }
    for (const b of this.#bindings) if (!this.container.contains(b.root)) {
      if (this.#pickerBinding === b) this.#closePicker();
      this.#bindings.delete(b);
    }
    const ids = [...new Set([...this.#bindings].map(b => b.id))];
    if (!ids.length) return;
    const epoch = this.#epoch;
    const task = (async () => {
      try {
        for (let i = 0; i < ids.length; i += 200) {
          const generation = this.#multiple() ? this.options.generation?.() : undefined;
          const channel=this.options.channel,data={ids:ids.slice(i,i+200), ...(this.#multiple() ? { choices: true } : {}), ...(generation ? { recoveryGeneration: generation } : {})},path=`${this.options.base}/reactions/query`;
          const group=this.options.group;
          const result=group?await new GroupMutationIntent(this.client,{kind:'query',path,groupId:group.groupId,conversationId:group.conversationId},group.source).send<{items:Array<MessageReactionState&{messageId:string}>}>(data,()=>epoch===this.#epoch&&!this.#closed&&this.#active&&this.options.enabled()):channel?await new ChannelMutationIntent(this.client,{kind:'query',path,communityId:channel.communityId,channelId:channel.channelId},channel.source).send<{items:Array<MessageReactionState&{messageId:string}>}>(data,()=>epoch===this.#epoch&&!this.#closed&&this.#active&&this.options.enabled()):await this.client.request<{items:Array<MessageReactionState&{messageId:string}>}>('POST',path,data);
          if(!result)return;
          if (generation && (generation !== this.options.generation?.() || (result as { recoveryGeneration?: string }).recoveryGeneration !== generation)) throw new CloudError("recovery_generation_changed");
          if (epoch !== this.#epoch || this.#closed || !this.#active) return;
          for (const { messageId, ...state } of result.items) for (const b of this.#bindings) {
            if (b.id !== messageId || b.pending || !this.container.contains(b.root)) continue;
            // A read begun before a confirmed write cannot replace its newer count.
            if (state.available && b.state?.available && state.revision < b.state.revision) continue;
            const unchanged = JSON.stringify(b.state) === JSON.stringify(state) && !b.error;
            b.state = state; if (generation) b.generation = generation; else delete b.generation;
            if (!state.available) { delete b.retry; delete b.error; }
            else if (!b.retry) delete b.error;
            if (!unchanged) this.#render(b);
          }
        }
      } catch {
        if (epoch !== this.#epoch || this.#closed) return;
        this.#details?.close();
        for (const b of this.#bindings) if (!b.pending && !b.retry) {
          b.error = "Reactions unavailable. Retry when connected."; this.#render(b);
        }
      }
    })().finally(() => {
      if (this.#task === task) this.#task = undefined;
      if (this.#again) { this.#again = false; this.schedule(); }
    });
    this.#task = task; return task;
  }
  async #set(b: Binding, intent: ReactionWrite): Promise<void> {
    if (intent.recoveryGeneration && intent.recoveryGeneration !== this.options.generation?.()) return;
    if (this.options.canReact?.() === false || b.pending || !b.state?.available || this.#closed || !this.#active || !this.options.enabled() || !this.container.contains(b.root)) return;
    const epoch = this.#epoch;
    b.pending = true; delete b.error; delete b.retry; this.#render(b);
    try {
      const channel=this.options.channel,group=this.options.group,path=`${this.options.base}/messages/${b.id}/reaction`;
      let action:ChannelMutationIntent|GroupMutationIntent|undefined=channel?.actions.get(path)??group?.actions.get(path);
      if(group&&!action){action=new GroupMutationIntent(this.client,{kind:'reaction',path,groupId:group.groupId,conversationId:group.conversationId,messageId:b.id,label:group.label},group.source);group.actions.set(path,action);}
      if(channel&&!action){action=new ChannelMutationIntent(this.client,{kind:'reaction',path,communityId:channel.communityId,channelId:channel.channelId,messageId:b.id,label:channel.label},channel.source);channel.actions.set(path,action);}
      const state=action?await action.send<MessageReactionState>(intent,()=>epoch===this.#epoch&&!this.#closed&&this.#active&&this.options.enabled()&&this.container.contains(b.root)):await this.client.request<MessageReactionState>('PUT',path,intent);
      if(!state)return;
      if (intent.selected !== undefined && (!state.available || !Array.isArray(state.mineReactions) || !intent.reaction || state.mineReactions.includes(intent.reaction) !== intent.selected ||
        intent.recoveryGeneration && (intent.recoveryGeneration !== this.options.generation?.() || state.recoveryGeneration !== intent.recoveryGeneration || state.messageId !== b.id))) throw new CloudError("reaction_changed");
      if (epoch !== this.#epoch || this.#closed || !this.container.contains(b.root)) return;
      b.state = state;if(channel)channel.actions.delete(path);if(group)group.actions.delete(path);
    } catch (error) {
      if (epoch !== this.#epoch || this.#closed || !this.container.contains(b.root)) return;
      if(this.options.group){b.error=this.options.group.actions.get(`${this.options.base}/messages/${b.id}/reaction`)?.notice??'Reaction not confirmed.';}
      else if(this.options.channel){b.error=this.options.channel.actions.get(`${this.options.base}/messages/${b.id}/reaction`)?.notice??'Reaction not confirmed.';}
      else if (error instanceof CloudError && [403, 404].includes(error.status)) b.state = { available: false };
      else if (error instanceof CloudError && error.code === "reaction_changed") {
        b.error = "Reactions changed. Choose again."; this.schedule();
      } else {
        // Keep the original set/remove intent, never reinterpret Retry as a toggle.
        b.retry = intent; b.error = "Reaction not confirmed.";
      }
    } finally {
      if (epoch === this.#epoch && !this.#closed) { b.pending = false; this.#render(b); this.schedule(); this.options.channel?.changed?.(); }
      this.options.group?.changed?.();
    }
  }
  #closePicker(restoreFocus = false): void {
    this.#pickerToken++; this.#picker?.close(restoreFocus); this.#picker?.element.replaceChildren(); this.#pickerBinding = undefined;
  }
  #openPicker(b: Binding, anchor: HTMLButtonElement): void {
    const picker = this.#picker, state = b.state;
    if (this.options.canReact?.() === false || !picker || !state?.available || b.pending || anchor.disabled || !this.#active || this.#closed || !this.client.connected || !this.options.enabled() || !this.container.contains(b.root)) return;
    if (picker.element.open && this.#pickerBinding === b) { this.#closePicker(true); return; }
    this.#closePicker(); this.#pickerBinding = b;
    const token = this.#pickerToken, epoch = this.#epoch;
    const current = () => token === this.#pickerToken && epoch === this.#epoch && this.#pickerBinding === b &&
      anchor.isConnected && b.state?.available && b.state.revision === state.revision;
    const root = anchor.getRootNode();
    const host = anchor.closest(".kl-panel") ?? anchor.closest(".kl-cloud") ?? (root instanceof ShadowRoot ? root : anchor.ownerDocument.body);
    host.append(picker.element);
    const options = this.#multiple() && Array.isArray(state.mineReactions) ? chatChoices : reactions;
    picker.open(anchor, "Choose a reaction", options.map(r => ({
      label: r.emoji, checked: this.#selected(state, r.id),
      run: () => {
        if (!current()) return;
        this.#toggle(b, state, r.id);
      },
    })), undefined, true, false);
    [...picker.element.querySelectorAll<HTMLButtonElement>("button")].forEach((button, index) => {
      button.classList.add("kl-message-reaction-choice");
      button.setAttribute("aria-label", options[index]!.label); button.title = options[index]!.label;
      button.addEventListener("click", event => {
        if (!current() || !picker.element.open) { event.preventDefault(); event.stopImmediatePropagation(); }
      }, true);
    });
  }
  #render(b: Binding): void {
    const state = b.state,action=this.options.channel?.actions.get(`${this.options.base}/messages/${b.id}/reaction`)??this.options.group?.actions.get(`${this.options.base}/messages/${b.id}/reaction`);
    if(action?.pending||action?.held)b.error=action.notice||'Reaction not confirmed.';
    b.root.hidden = !this.options.enabled() || state?.available === false || (!state && !b.error);
    const active = b.root.getRootNode() instanceof ShadowRoot ? (b.root.getRootNode() as ShadowRoot).activeElement : document.activeElement;
    const focused = b.root.contains(active), label = active?.getAttribute("aria-label");
    const popupOpen = this.#pickerBinding === b && this.#picker?.element.open;
    const readOnly = this.options.canReact?.() === false;
    const keepPopup = !readOnly && popupOpen && !b.root.hidden && state?.available && !b.pending && !action?.pending && !action?.held && this.#active && !this.#closed && this.client.connected;
    const popupLabel = keepPopup && this.#picker?.element.contains(active) ? active?.getAttribute("aria-label") : undefined;
    // A changed source must invalidate detached choices. Valid new snapshots
    // can reopen with fresh revision-bound choices and preserve keyboard focus.
    if (this.#pickerBinding === b) this.#closePicker();
    const wasOpen = !b.pending && !!b.root.querySelector("details")?.open;
    b.root.replaceChildren();
    if (b.root.hidden) return;
    const button = (label: string, text: string, run: () => void) => {
      const node = element("button", { type: "button", className: "kl-message-reaction", text, title: label, ariaLabel: label });
      node.disabled = readOnly || b.pending||!!action?.pending||!!action?.held; node.addEventListener("click", ()=>{if(node.isConnected&&!node.disabled)run();}); return node;
    };
    let popupTrigger: HTMLButtonElement | undefined;
    if (state?.available) {
      for (const { reaction, count } of state.counts) {
        const emoji = catalog.get(reaction); if (!emoji) continue;
        const selected = this.#selected(state, reaction);
        const chip = button(`${emoji.label}: ${count}${selected ? ", your reaction" : ""}`, `${emoji.emoji} ${count}`, () => { this.#toggle(b, state, reaction); });
        if (this.options.platformChat) chip.replaceChildren(
          element("span", { className: "kl-message-reaction-emoji", text: emoji.emoji, ariaHidden: "true" }),
          element("span", { text: String(count) }));
        chip.setAttribute("aria-pressed", String(selected)); b.root.append(chip);
      }
      if (this.#picker) {
        const trigger = element("button", { type: "button", className: "kl-message-reaction-trigger", title: "Add reaction", ariaLabel: "Add reaction" }, kikiIcon("add-reaction"));
        trigger.disabled = readOnly || b.pending || !!action?.pending || !!action?.held;
        trigger.setAttribute("aria-haspopup", "menu"); trigger.setAttribute("aria-expanded", "false");
        trigger.addEventListener("click", () => this.#openPicker(b, trigger)); b.root.append(trigger);
        popupTrigger = trigger;
      } else {
      const menu = element("details", { className: "kl-message-reaction-picker" });
      const summary = element("summary", { title: "Add reaction", ariaLabel: "Add reaction" }, kikiIcon("emoji"));
      summary.addEventListener("click", event => { if (readOnly || b.pending||action?.pending||action?.held) event.preventDefault(); });
      summary.setAttribute("aria-disabled", String(readOnly || b.pending||!!action?.pending||!!action?.held));
      const choices = element("div", { className: "kl-message-reaction-choices", role: "group", ariaLabel: "Choose a reaction" });
      for (const r of reactions) {
        const choice = button(r.label, r.emoji, () => { this.#toggle(b, state, r.id); });
        choice.setAttribute("aria-pressed", String(state.mine === r.id)); choices.append(choice);
      }
      menu.addEventListener("keydown", event => { if (event.key === "Escape") { event.preventDefault(); menu.open = false; summary.focus(); } });
      menu.addEventListener("toggle", () => { if (menu.open) choices.scrollIntoView?.({ block: "nearest" }); });
      menu.open = wasOpen; menu.append(summary, choices); b.root.append(menu);
      }
    }
    if(b.error){
      b.root.append(element('span',{className:'kl-message-reaction-error',role:'status',text:b.error}));
      if(!action?.held){const retry=button('Retry reaction','Retry',()=>{if(action?.pending)void this.#set(b,action.pending as {reaction:string|null;revision:number});else if(b.retry)void this.#set(b,b.retry);else void this.refresh();});retry.disabled=b.pending||!!action?.busy;b.root.append(retry);}
    }
    b.root.setAttribute("aria-busy", String(b.pending));
    if (keepPopup && popupTrigger) {
      this.#openPicker(b, popupTrigger);
      if (popupLabel) [...this.#picker!.element.querySelectorAll<HTMLElement>("button")].find(node => node.getAttribute("aria-label") === popupLabel)?.focus({ preventScroll: true });
    } else if (focused) ([...b.root.querySelectorAll<HTMLElement>("button,summary")].find(node => !b.pending && node.getAttribute("aria-label") === label) ?? b.root.querySelector<HTMLElement>("summary"))?.focus({ preventScroll: true });
  }
}
