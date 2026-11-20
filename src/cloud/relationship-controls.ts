import { element } from "./dom";
import { kikiIcon } from "../modules/link-chat/icons";
import type { CommunityService } from "./community";
import type { BCAdapter } from "../bc/adapter";
import type { RelationshipAction } from "./relationship-intent";

export interface DirectoryFriendship {
  requested: boolean;
  disabled: boolean;
  change: () => void;
  retrySync?: () => void;
}
export interface RelationshipControlOptions {
  requestRow?: boolean;
  cloudOnly?: boolean;
  directoryCard?: boolean;
  directoryMenu?: (trigger: HTMLButtonElement, friendship: DirectoryFriendship) => void;
  review?: () => void;
  onSettled?: (error?: unknown) => void;
}
const visible = (root: HTMLElement): boolean => root.isConnected && !root.closest('[hidden],dialog:not([open])');
const labels: Record<RelationshipAction,string> = { request:'Send friend request', accept:'Accept friend request', decline:'Decline friend request', cancel:'Cancel friend request', sync:'Sync BC friend', remove:'Remove friend' };
/** Explicit review survives row removal and reload; no automatic resend. */
export function renderFriendActionQueue(root:HTMLElement,service:CommunityService|undefined,peer?:number):void {
  if(root.dataset.busy==='true')return;
  const entries=(service?.friendActions?.()??[]).filter(e=>peer===undefined||e.memberNumber===peer),error=service?.friendActionError;
  root.replaceChildren();root.hidden=!entries.length&&!error;root.classList.add('kl-friend-action-review');
  if(root.hidden||!service)return;
  root.append(element('strong',{text:'Saved friend actions'}));
  if(error)root.append(element('p',{role:'status',text:error}));
  for(const entry of entries){
    const held=service.friendActionHeld(entry.memberNumber),busy=service.friendActionBusy(entry.memberNumber);
    const row=element('div',{className:'kl-cloud-card'}),status=element('p',{role:'status',text:held?'This saved action cannot continue. Discard it, then review current friend details before making a new choice.':entry.receipt||entry.syncReceipt?'Cloud confirmed this action. Finish checking the friend state and BC sync.':'The original action is saved. Retry to confirm its result.'});
    row.append(element('span',{text:`${labels[entry.action]} · Member #${entry.memberNumber}`}),status);
    const retry=element('button',{type:'button',className:'kl-text-button',text:'Retry saved action'}),discard=element('button',{type:'button',className:'kl-text-button',text:'Discard saved action'});
    retry.disabled=held||busy||!service.client.connected;discard.disabled=busy;
    retry.addEventListener('click',()=>{
      if(!visible(root)||root.dataset.busy==='true')return;
      root.dataset.busy='true';retry.disabled=discard.disabled=true;let failure='';
      void service.retryFriendAction(entry.memberNumber,()=>visible(root)).catch(e=>{failure=e instanceof Error?e.message:'Could not confirm this action.';}).finally(()=>{root.dataset.busy='false';renderFriendActionQueue(root,service,peer);if(failure&&visible(root))root.append(element('p',{role:'status',text:failure}));});
    });
    discard.addEventListener('click',()=>{
      if(!visible(root)||root.dataset.busy==='true')return;
      if(discard.dataset.confirm!=='true'){discard.dataset.confirm='true';discard.textContent='Confirm discard';status.textContent='This removes the saved action from this device. It does not undo changes already made in Cloud or BC.';return;}
      try{service.discardFriendAction(entry.memberNumber);renderFriendActionQueue(root,service,peer);}catch(e){status.textContent=e instanceof Error?e.message:'Could not discard this action.';}
    });
    row.append(element('div',{className:'kl-cloud-actions'},retry,discard));root.append(row);
  }
}
const rendered = new WeakMap<HTMLElement, string>();
const callbacks = new WeakMap<HTMLElement, RelationshipControlOptions>();
/** Shared action states; this component never infers an inbound vanilla request. */
export function renderRelationshipControls(root: HTMLElement, peer: number, service: CommunityService | undefined, adapter: BCAdapter, options?: RelationshipControlOptions): void {
  if (options) callbacks.set(root, options);
  if (root.dataset.busy === "true" || root.querySelector('[data-busy="true"]')) return;
  const cardOptions = callbacks.get(root);
  const directoryCard = cardOptions?.directoryCard === true;
  const relation = service?.relationships.get(peer), native = (adapter.isKnownFriend?.(peer) ?? false);
  const saved=service?.friendActions?.().find(e=>e.memberNumber===peer);
  const signature = JSON.stringify([peer, relation, service?.friendSource, service?.friendReadError, saved, service?.friendActionHeld?.(peer), service?.friendActionBusy?.(peer), native, service?.client.connected]);
  if (rendered.get(root) === signature && root.childElementCount) return;
  rendered.set(root, signature);
  root.replaceChildren(); root.classList.add("kl-relationship-controls");
  const status = element("small", { className: "kl-cloud-status", role: "status" });
  const start = (button: HTMLButtonElement, work: () => void | Promise<void>) => {
    if (root.dataset.busy === "true" || !visible(root)) return;
    root.dataset.busy = "true"; button.textContent = "Sending…";
    for (const control of root.querySelectorAll<HTMLButtonElement>("button")) control.disabled = true;
    const finish = (error?: unknown) => {
      const focused = root.contains(root.getRootNode() instanceof ShadowRoot ? (root.getRootNode() as ShadowRoot).activeElement : document.activeElement);
      root.dataset.busy = "false"; rendered.delete(root); renderRelationshipControls(root, peer, service, adapter);
      if (error) { status.textContent = error instanceof Error ? error.message : "Action could not be confirmed. Retry."; root.append(status); }
      if (focused && root.isConnected) root.querySelector<HTMLElement>("button:not(:disabled),summary")?.focus({ preventScroll: true });
      callbacks.get(root)?.onSettled?.(error);
    };
    void Promise.resolve().then(() => { if(visible(root)) return work(); }).then(() => finish(), error => finish(error));
  };
  const action = (title: string, work: () => void | Promise<void>, icon: "group-add" | "check" | "close" | "direct-add" | null = "group-add") => {
    const button = element("button", { type: "button", className: "kl-text-button kl-friend-action", text: title });
    if (icon) button.prepend(kikiIcon(icon));
    button.disabled = Boolean(relation?.supported && service && !service.client.connected);
    button.addEventListener("click", () => start(button, work));
    return button;
  };
  if (directoryCard && (saved || service?.friendReadError || service?.supported && !relation)) {
    const review = element('button', { type:'button', className:'kl-text-button kl-friend-action',
      text:saved ? 'Review friend action' : native ? 'BC friend' : 'Add friend' });
    if (!saved) {
      review.prepend(kikiIcon(native ? 'check' : 'direct-add'));
      if (!native) review.classList.add('kl-people-friend-primary');
    }
    review.addEventListener('click', () => { if (visible(root)) callbacks.get(root)?.review?.(); });
    root.append(review);
    return;
  }
  if(saved){const queue=element('div');root.append(queue);renderFriendActionQueue(queue,service,peer);return;}
  if(service?.friendReadError||service?.friendSource?.required&&!relation){root.append(element('small',{role:'status',text:service.friendReadError||'Load current friend details before choosing an action.'}));return;}
  const observed=relation?{memberNumber:peer,revision:relation.revision,state:relation.state,...relation.friendSource?{friendSource:Object.freeze({...relation.friendSource})}:{}}:undefined;
  const perform=(kind:RelationshipAction):Promise<void>=>observed?.friendSource?.required?service!.action(peer,kind,observed,()=>visible(root)):service!.action(peer,kind);
  if (!relation?.supported || !service) {
    if (cardOptions?.cloudOnly) return;
    const add = action(native ? "BC friend" : directoryCard ? "Add friend" : "Add to BC friends", () => adapter.setNativeFriend(peer, true), native && directoryCard ? "check" : directoryCard ? "direct-add" : "group-add"); add.disabled = native;
    if (directoryCard && !native) add.classList.add('kl-people-friend-primary');
    add.title = "Native one-sided friend list. Cloud requests are not supported by this contact."; root.append(add); return;
  }
  if (relation.state === "received") {
    const accept = action(directoryCard ? "Accept request" : "Accept", () => perform("accept"), "check");
    if (directoryCard) { accept.classList.add('kl-people-friend-primary'); root.append(accept); return; }
    if (callbacks.get(root)?.requestRow) accept.classList.add("kl-friend-accept");
    root.append(accept, action("Decline", () => perform("decline"), cardOptions?.requestRow ? null : "close")); return;
  }
  if (relation.state === "sent" || relation.state === "accepted") {
    const sent = relation.state === "sent", inlineCancel = sent && callbacks.get(root)?.requestRow;
    const label = relation.state === "sent" ? "Pending Request" : relation.canMessage ? "Friends" : "Friend sync pending";
    const needsSync = !native || relation.nativeSyncRequired;
    if (directoryCard && cardOptions?.directoryMenu) {
      const trigger = element('button', { type: 'button', className: 'kl-text-button kl-friend-action kl-people-friend-trigger' },
        kikiIcon(sent ? 'clock' : 'check'), sent ? 'Requested' : label, kikiIcon('chevron-down'));
      trigger.setAttribute('aria-haspopup', 'menu');
      trigger.setAttribute('aria-expanded', 'false');
      const run = (kind: 'sync' | 'cancel' | 'remove') => {
        const current = service.relationships.get(peer);
        if (!trigger.isConnected || !service.client.connected || !observed || !current?.supported ||
          current.state !== observed.state || current.revision !== observed.revision ||
          current.friendSource?.required !== observed.friendSource?.required ||
          current.friendSource?.generation !== observed.friendSource?.generation) return;
        start(trigger, () => perform(kind));
      };
      trigger.addEventListener('click', () => {
        if (!visible(root) || trigger.disabled) return;
        callbacks.get(root)?.directoryMenu?.(trigger, {
          requested: sent, disabled: !service.client.connected,
          change: () => run(sent ? 'cancel' : 'remove'),
          ...(needsSync ? { retrySync: () => run('sync') } : {}),
        });
      });
      root.append(trigger);
      return;
    }
    const main = element("button", { className: "kl-text-button kl-friend-action", type: "button", text: label }); main.disabled = true; main.prepend(kikiIcon("check"));
    const menu = element("details", { className: "kl-social-menu" }, element("summary", { ariaLabel: "Friend actions", title: "Friend actions" }, kikiIcon("more")));
    const actions = element("div", { className: "kl-social-menu-items" });
    if (needsSync) actions.append(action("Retry friend sync", () => perform("sync")));
    const remove = action(sent ? "Cancel request" : "Remove friend", () => perform(sent ? "cancel" : "remove"), inlineCancel ? null : "close");
    if (!inlineCancel) actions.append(remove);
    if (directoryCard) {
      const summary = menu.querySelector('summary')!;
      summary.classList.add('kl-text-button', 'kl-friend-action');
      summary.removeAttribute('aria-label'); summary.removeAttribute('title');
      summary.replaceChildren(kikiIcon(sent ? 'clock' : 'check'), sent ? 'Requested' : label, kikiIcon('chevron-down'));
      menu.addEventListener('keydown', event => {
        if (!menu.open || event.key !== 'Escape') return;
        event.preventDefault(); event.stopPropagation(); menu.open = false; summary.focus();
      });
      menu.append(actions); root.append(menu); return;
    }
    root.append(inlineCancel ? remove : main);
    if (actions.childElementCount) { menu.append(actions); root.append(menu); }
    return;
  }
  const request = action(directoryCard ? 'Add friend' : 'Send friend request', () => perform('request'), directoryCard ? 'direct-add' : 'group-add');
  if (directoryCard) request.classList.add('kl-people-friend-primary');
  root.append(request);
}
