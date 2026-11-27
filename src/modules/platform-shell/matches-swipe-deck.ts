import type { SwipeCard, SwipeSnapshot, SwipeVote } from '../../cloud/matches-swipe';
import { element } from '../../cloud/dom';
import { focusedElement } from '../../utils/dom';
import { kikiIcon, type KikiLinkIconName } from '../link-chat/icons';
import { matchesBackgroundLabel } from './matches-swipe-backgrounds';
import { SwipePortraits } from './matches-swipe-deck-art';
import { attachSwipeGesture, SwipeRain, type SwipeDirection } from './matches-swipe-deck-motion';
import { fitPanelDialog } from './panel-dialog-layout';

type View = 'swipe' | 'mutual';
interface Actions {
  current(): boolean;
  image(card: SwipeCard): Promise<Blob | null>;
  vote(card: SwipeCard, direction: SwipeDirection, operationId: string): Promise<{matched: boolean}>;
  undo(lastVote: SwipeVote): Promise<void>;
  moreMutuals(cursor: number): Promise<{items:SwipeCard[];nextCursor:number|null}>;
  navigate(view: View): void;
}

const icon = (name: KikiLinkIconName) => kikiIcon(name, 'ico');
function button(label:string, classes:string, run:() => void, glyph?:KikiLinkIconName, iconOnly = false) {
  const b = element('button', {type:'button', className:classes, ariaLabel:label}, glyph ? icon(glyph) : undefined, iconOnly ? undefined : label);
  if (iconOnly) b.title = label;
  b.onclick = run;
  return b;
}
function profileMeta(card:SwipeCard) {
  if (!card.languages.length && !card.available) return undefined;
  const languageText = card.languages.join(' · ');
  const label = [languageText, card.available ? 'Open to chat' : ''].filter(Boolean).join(' · ');
  return element('div', {className:'meta'}, icon(languageText ? 'globe' : 'chat'), element('span',{text:label}));
}
function story(card:SwipeCard) {
  if (!card.bio && !card.tags.length) return undefined;
  const tags = card.tags.length ? element('div', {className:'tagset'}, ...card.tags.map(text => element('span', {text}))) : undefined;
  return element('div', {className:'card-story'}, card.bio ? element('p',{className:'bio', text:card.bio}) : undefined, tags);
}
function empty(glyph:KikiLinkIconName, title:string, text:string, ...actions:(HTMLButtonElement|undefined)[]) {
  return element('section', {className:'empty matches-empty'}, element('span',{className:'empty-emblem'},icon(glyph)),
    element('h2',{text:title}), element('p',{text}), element('div',{className:'actions'},...actions));
}

export function createMatchesSwipeDeck(host: HTMLElement, actions: Actions) {
  const content = element('div',{className:'swipe-content'});
  const live = element('p',{className:'sr',role:'status'});
  const error = element('p',{className:'swipe-feedback error',role:'alert',hidden:true});
  const dialog = element('dialog',{className:'swipe-dialog'});
  host.replaceChildren(content,live,error,dialog);
  const life = new AbortController();
  let screenLife = new AbortController();
  const current = () => !life.signal.aborted && actions.current();
  const portraits = new SwipePortraits(card => actions.image(card), current);
  const rain = new SwipeRain();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let state: SwipeSnapshot | undefined;
  let view: View = 'swipe';
  let rendered = '';
  let busy = false;
  let actionToken = 0;
  let picked: number | undefined;
  let retry: {member:number;direction:SwipeDirection;id:string} | undefined;
  let motion: ReturnType<typeof attachSwipeGesture> | undefined;
  let modalTarget: SwipeCard | undefined;
  let restoring: HTMLElement | undefined;
  let fitCleanup: (() => void) | undefined;
  let extraMutuals: SwipeCard[] = [];
  let nextCursor: number|null = null;
  let pageTicket = 0;
  const activeDeck = () => {
    const cards = state?.deck ?? [];
    const first = cards.find(c => c.memberNumber === picked);
    return first && first !== cards[0] ? [first,...cards.filter(c => c !== first)] : cards;
  };
  const listed = () => [...(state?.mutuals ?? []),...extraMutuals];
  const stage = () => content.querySelector<HTMLElement>('.scene');
  function showError(message:string) {
    error.textContent = message;
    error.hidden = false;
  }
  function keepImages() {
    const cards = view === 'mutual' ? listed() : activeDeck().slice(0,2);
    if (modalTarget) cards.push(modalTarget);
    if (state?.self && dialog.open) cards.push(state.self);
    portraits.retain(cards);
  }
  function rainHost() {
    rain.place(dialog.open ? dialog.querySelector<HTMLElement>('.match-duet') : stage() ?? content.querySelector<HTMLElement>('.empty'));
  }
  function closeModal() {
    if (dialog.open) dialog.close();
  }
  dialog.addEventListener('keydown', event => {
    // Shell shortcuts (including Escape and the finder) belong to the underlying page.
    event.stopPropagation();
    if (event.key === 'Escape' && !event.defaultPrevented && !event.isComposing) {
      event.preventDefault();
      closeModal();
    }
  });
  function modal(title:string, body:HTMLElement[], buttons:HTMLButtonElement[], card:SwipeCard, target?:HTMLElement) {
    if (dialog.open || !current()) return;
    restoring = target ?? focusedElement(host);
    modalTarget = card;
    const close = button('Close','iconbtn',closeModal,'close',true);
    dialog.setAttribute('aria-label',title);
    dialog.replaceChildren(element('div',{className:'dialoghead'},element('h2',{text:title}),close),
      ...body,element('div',{className:'dialogbuttons'},...buttons));
    dialog.showModal();
    fitCleanup = fitPanelDialog(dialog);
    (buttons[0] ?? close).focus({preventScroll:true});
    rainHost();
  }
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) closeModal();
  });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    modalTarget = undefined;
    fitCleanup?.();
    dialog.replaceChildren();
    if (!current()) return;
    if (restoring?.isConnected && host.contains(restoring)) restoring.focus({preventScroll:true});
    restoring = undefined;
    keepImages();
    rainHost();
  });
  function celebrate(card: SwipeCard) {
    const mine = state?.self;
    if (!mine || !current() || dialog.open || !listed().some(c => c.memberNumber === card.memberNumber)) return;
    const duet = element('div',{className:'match-duet mini'},
      element('div',{className:'pair-portrait'},portraits.art(mine,'mini',{small:true})),
      element('div',{className:'pair-portrait'},portraits.art(card,'mini',{small:true})),
      element('span',{className:'pair-heart',ariaHidden:'true'},icon('heart')));
    const names = element('div',{className:'pair-names'},element('span',{text:mine.name,title:mine.name}),element('span',{text:card.name,title:card.name}));
    const go = button('Mutual likes','button',() => {
      restoring = undefined;
      closeModal(); actions.navigate('mutual');
      content.querySelector<HTMLButtonElement>(`[data-member="${card.memberNumber}"]`)?.focus({preventScroll:true});
    },'heart');
    const keep = button(view === 'swipe' && activeDeck().length ? 'Keep swiping' : 'Done','button primary',closeModal);
    modal('It’s a match',[duet,names,element('p',{className:'dialog-copy match-copy',text:'You both liked each other.'})],[keep,go],card,
      content.querySelector<HTMLButtonElement>('[data-action="like"], [data-action="mutual"]') ?? undefined);
  }
  function openPerson(card:SwipeCard, trigger:HTMLButtonElement) {
    const body = [element('div',{className:'match-profile-portrait'},portraits.art(card,'mini',{small:true}))];
    const meta = profileMeta(card), about = story(card);
    if (meta || about) body.push(element('div',{className:'details'},meta,about));
    modal(card.name,body,[button('Done','button primary',closeModal)],card,trigger);
  }
  async function more() {
    if (nextCursor === null || !current() || busy) return;
    const cursor = nextCursor;
    const token = ++pageTicket;
    const moreButton = content.querySelector<HTMLButtonElement>('[data-action="more"]');
    if (!moreButton || moreButton.disabled) return;
    moreButton.disabled = true;
    try {
      const result = await actions.moreMutuals(cursor);
      if (!current() || view !== 'mutual' || pageTicket !== token || cursor !== nextCursor) return;
      const seen = new Set(listed().map(c => c.memberNumber));
      const newCards = result.items.filter(c => !seen.has(c.memberNumber));
      extraMutuals.push(...newCards);
      nextCursor = result.nextCursor !== cursor ? result.nextCursor : null;
      error.hidden = true;
      render();
      if (newCards[0]) content.querySelector<HTMLButtonElement>(`[data-member="${newCards[0].memberNumber}"]`)?.focus({preventScroll:true});
    } catch {
      if (current() && token === pageTicket) showError('More mutual likes could not be loaded. Try again.');
    } finally { moreButton.disabled = false; }
  }
  function drawMutuals(snapshot:SwipeSnapshot) {
    const list = listed();
    if (!list.length) {
      const offerUndo = !snapshot.remaining && snapshot.lastVote !== null;
      const back = button(offerUndo ? 'Undo last swipe' : 'Back to swipe','button primary',
        () => { if (offerUndo) void undo(); else actions.navigate('swipe'); },offerUndo ? 'history' : 'back');
      return empty('heart','No mutual likes yet','Players appear here when you both like each other.',back);
    }
    const rows = list.map(card => {
      const tile = element('button',{type:'button',className:'tile',ariaLabel:'View '+card.name+'’s card'},
        portraits.art(card,'mini',{small:true,lazy:true}),
        element('span',{className:'tiletext'},element('strong',{text:card.name}),
          card.languages.length ? element('span',{className:'match-languages',text:card.languages.join(' · ')}) : undefined),
        element('span',{className:'tile-open',ariaHidden:'true'},icon('chevron-down')));
      tile.dataset.member = String(card.memberNumber);
      tile.onclick = () => openPerson(card,tile);
      return tile;
    });
    const grid = element('div',{className:'matches',role:'group',ariaLabel:'Mutual likes'},...rows);
    if (nextCursor === null) return grid;
    const moreButton = button('Show more','button',() => void more(),'chevron-down');
    moreButton.dataset.action = 'more';
    return element('div',{},grid,element('div',{className:'actions'},moreButton));
  }

  function drawSwipe(snapshot:SwipeSnapshot, cards:SwipeCard[]) {
    const [card,next] = cards;
    if (!card) {
      const mutual = button('View mutual likes',snapshot.mutualCount ? 'button primary' : 'button minor',() => actions.navigate('mutual'),'heart');
      mutual.dataset.action = 'mutual';
      const undoButton = snapshot.lastVote ? button('Undo last swipe','button minor',() => void undo(),'history') : undefined;
      return empty('check',snapshot.seen ? 'You’ve seen every card' : 'No cards to show yet',
        snapshot.mutualCount ? `You have ${snapshot.mutualCount} mutual ${snapshot.mutualCount === 1 ? 'like' : 'likes'}.` : 'New cards will appear here when other players share theirs.',mutual,undoButton);
    }
    const behind = next ? portraits.art(next,'swipe-under',{upcoming:true}) : undefined;
    behind?.setAttribute('aria-hidden','true');
    const face = portraits.art(card,'swipe-face');
    face.append(element('span',{className:'flag',ariaHidden:'true'},
      element('span',{className:'swipe-like'},icon('heart'),'Like'),element('span',{className:'swipe-pass'},icon('close'),'Pass')));
    const scene = element('div',{className:'scene swipable',tabIndex:0,ariaLabel:card.name+'’s card. Left arrow to pass, right arrow to like.'},behind,face);
    const position = snapshot.seen + 1, total = snapshot.seen + Math.max(cards.length,snapshot.remaining);
    const parts = Math.min(5,total);
    const track = element('span',{className:'deck-track'});
    for (let i=0;i<parts;i++) track.append(element('i',{className:i < Math.ceil(position*parts/total) ? 'filled' : ''}));
    const label = matchesBackgroundLabel(card.background);
    const portrait = element('div',{className:'portraitBox'},scene,
      element('div',{className:'where'},icon('location'),element('span',{text:label,title:label})));
    const art = element('div',{className:'deck-art'},portrait,element('div',{className:'deck-position',ariaHidden:'true'},track,
      element('span',{className:'deck-number',text:position+' / '+total})));
    const rewind = button('Undo last swipe','button minor undo-button',() => void undo(),'history',true);
    rewind.disabled = !snapshot.lastVote;
    rewind.dataset.action = 'undo';
    const pass = button('Pass','button',() => void vote('pass'),'close');
    const like = button('Like','button primary',() => void vote('like'),'heart');
    for (const [b,dir,arrow,key] of [[pass,'pass','←','ArrowLeft'],[like,'like','→','ArrowRight']] as const) {
      b.dataset.action = dir;
      b.title = b.textContent+' ('+arrow+')';
      b.setAttribute('aria-keyshortcuts',key);
      b.append(element('kbd',{ariaHidden:'true',text:arrow}));
    }
    const about = story(card);
    const side = element('div',{className:about ? 'side' : 'side no-story'},
      element('div',{className:'details card-identity'},element('h2',{className:'name',text:card.name}),profileMeta(card)),
      about,element('div',{className:'decisions'},element('div',{className:'actions'},rewind,pass,like)));
    motion = attachSwipeGesture(scene,d => void vote(d),() => busy || !current(),screenLife.signal);
    return element('section',{className:'panel swipePanel',ariaLabel:card.name},art,side);
  }
  function drawKey() {
    if (!state) return '';
    return view === 'mutual' ? JSON.stringify([view,listed(),nextCursor,!state.remaining,state.lastVote?.id]) :
      JSON.stringify([view,...activeDeck().slice(0,2),state.seen,state.remaining,state.lastVote?.id,activeDeck().length === 0 && state.mutualCount]);
  }
  function render(force = false) {
    if (!state || !current()) return;
    const key = drawKey();
    if (!force && key === rendered) return;
    rendered = key;
    const focused = focusedElement(content);
    const restore = focused && content.contains(focused) ? focused.dataset : undefined;
    screenLife.abort(); screenLife = new AbortController();
    motion = undefined;
    const cards = activeDeck();
    picked = cards[0]?.memberNumber;
    content.replaceChildren(view === 'mutual' ? drawMutuals(state) : drawSwipe(state,cards));
    keepImages();
    rainHost();
    if (restore?.action) content.querySelector<HTMLButtonElement>(`[data-action="${restore.action}"]:enabled`)?.focus({preventScroll:true});
    else if (restore?.member) content.querySelector<HTMLButtonElement>(`[data-member="${restore.member}"]`)?.focus({preventScroll:true});
  }
  function enable(value:boolean) {
    content.setAttribute('aria-busy',String(!value));
    for (const b of content.querySelectorAll('button')) {
      b.disabled = !value || (b.dataset.action === 'undo' && !state?.lastVote);
    }
  }
  function update(snapshot:SwipeSnapshot, nextView:View) {
    if (!current()) return;
    const changedView = view !== nextView;
    if (changedView || snapshot.mutualCount !== state?.mutualCount || snapshot.mutualCursor !== state?.mutualCursor ||
        snapshot.mutuals.some((c,i) => state?.mutuals[i]?.memberNumber !== c.memberNumber)) {
      ++pageTicket;
      extraMutuals = [];
      nextCursor = snapshot.mutualCursor;
    }
    state = snapshot;
    view = nextView;
    if (changedView) {
      error.hidden = true;
      rain.clear();
      restoring = undefined;
      closeModal();
    }
    if (modalTarget && !listed().some(c => c.memberNumber === modalTarget?.memberNumber && c.revision === modalTarget.revision)) closeModal();
    if (changedView || !busy) render();
    if (busy && changedView) enable(false);
  }
  async function vote(direction:SwipeDirection) {
    const card = activeDeck()[0];
    const s = stage();
    if (!state || busy || !current() || view !== 'swipe' || dialog.open || !card || !s) return;
    const token = ++actionToken;
    if (!retry || retry.member !== card.memberNumber || retry.direction !== direction) retry = {member:card.memberNumber, direction,id:crypto.randomUUID()};
    const id = retry.id;
    const focused = focusedElement(content);
    busy = true;
    error.hidden = true;
    enable(false);
    motion?.leave(direction);
    rain.start(direction,s);
    try {
      const [result] = await Promise.all([actions.vote(card,direction,id),
        new Promise<void>(resolve => setTimeout(resolve,reduced.matches ? 0 : 235))]);
      if (!current() || token !== actionToken || !state) return;
      retry = undefined;
      // A slow follow-up read must not show the just-voted card a second time.
      if (state.deck.some(c => c.memberNumber === card.memberNumber)) {
        state = {...state,deck:state.deck.filter(c => c.memberNumber !== card.memberNumber),seen:state.seen+1,remaining:Math.max(0,state.remaining-1),lastVote:null};
      }
      if (result.matched && !state.mutuals.some(c => c.memberNumber === card.memberNumber)) {
        state = {...state,mutuals:[card,...state.mutuals],mutualCount:state.mutualCount+1};
      }
      picked = undefined;
      busy = false;
      render(true);
      if (view !== 'swipe') return;
      content.firstElementChild?.classList.add('swipe-advanced');
      live.textContent = (direction === 'like' ? 'Liked ' : 'Passed ')+card.name;
      if (result.matched) celebrate(card);
      else if (focused && !focused.isConnected) content.querySelector<HTMLButtonElement>(`[data-action="${direction}"],[data-action="mutual"]`)?.focus({preventScroll:true});
    } catch {
      if (!current() || token !== actionToken) return;
      rain.clear(); motion?.reset();
      busy = false;
      render();
      showError('Your swipe could not be confirmed. Try again.');
    } finally { if (current() && token === actionToken) { busy = false; enable(true); } }
  }
  async function undo() {
    const last = state?.lastVote;
    if (!last || busy || !current() || dialog.open) return;
    const token = ++actionToken;
    busy = true;
    error.hidden = true;
    enable(false); rain.clear();
    try {
      await actions.undo(last);
      if (!current() || token !== actionToken) return;
      picked = last.target;
      busy = false;
      if (view !== 'swipe') actions.navigate('swipe');
      render(true);
      live.textContent = 'Last swipe undone';
      content.querySelector<HTMLButtonElement>('[data-action="pass"]')?.focus({preventScroll:true});
    } catch {
      if (!current() || token !== actionToken) return;
      showError('Your last swipe could not be undone. Try again.');
    } finally { if (current() && token === actionToken) {busy = false; enable(true);} }
  }
  document.addEventListener('keydown', event => {
    if (!current() || busy || view !== 'swipe' || dialog.open || !activeDeck().length || event.repeat || event.defaultPrevented ||
        event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    const target = event.composedPath()[0];
    if (!(target instanceof Element) || target.closest('input,textarea,select,[contenteditable="true"],[role="tablist"],dialog')) return;
    const shell = host.closest('.kl-matches-swipe') ?? host;
    if (!shell.contains(target) && target !== document.body && target !== document.documentElement) return;
    if ((host.getRootNode() as Document|ShadowRoot).querySelector('dialog[open]')) return;
    event.preventDefault();
    event.stopPropagation();
    void vote(event.key === 'ArrowRight' ? 'like' : 'pass');
  },{capture:true,signal:life.signal});
  reduced.addEventListener('change',() => {if (reduced.matches) rain.clear();},{signal:life.signal});
  function dispose() {
    ++actionToken; ++pageTicket;
    life.abort();
    screenLife.abort();
    fitCleanup?.();
    closeModal();
    rain.clear();
    portraits.dispose();
    for (const node of [content,live,error,dialog]) node.remove();
  }
  return {update,celebrate,dispose};
}
