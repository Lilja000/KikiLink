import type { SwipeCard } from '../../cloud/matches-swipe';
import { element } from '../../cloud/dom';
import { matchesBackgroundUrl } from './matches-swipe-backgrounds';

type Entry = {promise: Promise<string | null>; url?: string};

function initial(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join('') || '•';
}
export function portraitKey(card: SwipeCard) {
  return `${card.memberNumber}/${card.imageVersion ?? ''}`;
}

/** Only keep the images which this view is actually displaying or about to reveal. */
export class SwipePortraits {
  private readonly entries = new Map<string, Entry>();
  private readonly lazy = new Map<Element, () => void>();
  private readonly failed = new Map<HTMLElement, {retryAt:number; load:()=>void}>();
  private readonly observer: IntersectionObserver | undefined;

  constructor(private readonly load: (card:SwipeCard) => Promise<Blob|null>, private readonly current: () => boolean) {
    this.observer = typeof IntersectionObserver !== 'function' ? undefined : new IntersectionObserver(records => {
      for (const record of records) {
        if (!record.isIntersecting) continue;
        this.observer?.unobserve(record.target);
        this.lazy.get(record.target)?.();
        this.lazy.delete(record.target);
      }
    }, {rootMargin:'160px'});
  }

  private picture(card: SwipeCard): Promise<string|null> {
    const key = portraitKey(card);
    const cached = this.entries.get(key);
    if (cached) return cached.promise;
    const entry: Entry = {promise: this.load(card).then(blob => {
      if (this.entries.get(key) !== entry || !this.current()) return null;
      if (!blob) { this.entries.delete(key); return null; }
      return entry.url = URL.createObjectURL(blob);
    }).catch(() => { if (this.entries.get(key) === entry) this.entries.delete(key); return null; })};
    this.entries.set(key, entry);
    return entry.promise;
  }

  art(card: SwipeCard, wrap: string, options: {small?:boolean; upcoming?:boolean; lazy?:boolean} = {}) {
    const layer = element('div', {className:wrap});
    const bg = element('img', {className:options.small ? 'thumbbg' : 'bg', alt:'', src:matchesBackgroundUrl(card.background)});
    bg.draggable = false;
    const fallback = element('div', {className:'missing-look match-monogram', ariaHidden:'true'}, element('span',{text:initial(card.name)}));
    layer.append(bg, fallback);
    if (!card.imageVersion) return layer;
    const key = portraitKey(card);
    const retry = () => {
      if (layer.isConnected && this.current()) this.failed.set(layer, {retryAt:Date.now()+5000, load:attach});
    };
    const paint = (url: string) => {
      const image = element('img', {className:options.upcoming ? 'upcoming-figure' : 'figure', alt: options.upcoming ? '' : card.name + '’s card image'});
      image.draggable = false;
      image.onerror = () => {
        image.replaceWith(fallback);
        if (this.entries.get(key)?.url === url) {
          this.entries.delete(key);
          URL.revokeObjectURL(url);
        }
        retry();
      };
      image.src = url;
      fallback.replaceWith(image);
    };
    const attach = () => {
      void this.picture(card).then(url => {
        if (!this.current() || !layer.isConnected) return;
        if (url) paint(url);
        else retry();
      });
    };
    const cached = this.entries.get(key)?.url;
    if (cached) paint(cached);
    else if (options.lazy && this.observer) {
      this.lazy.set(layer, attach);
      this.observer.observe(layer);
    } else attach();
    return layer;
  }

  retain(cards: SwipeCard[]) {
    const keys = new Set(cards.map(portraitKey));
    for (const [key,entry] of this.entries) if (!keys.has(key)) {
      this.entries.delete(key);
      if (entry.url) URL.revokeObjectURL(entry.url);
    }
    for (const target of this.lazy.keys()) if (!target.isConnected) {
      this.lazy.delete(target);
      this.observer?.unobserve(target);
    }
    for (const layer of this.failed.keys()) if (!layer.isConnected) this.failed.delete(layer);
  }

  retryFailed() {
    for (const [layer, entry] of this.failed) {
      if (!layer.isConnected) { this.failed.delete(layer); continue; }
      if (Date.now() < entry.retryAt) continue;
      this.failed.delete(layer);
      entry.load();
    }
  }

  dispose() { this.retain([]); this.observer?.disconnect(); this.lazy.clear(); this.failed.clear(); }
}
