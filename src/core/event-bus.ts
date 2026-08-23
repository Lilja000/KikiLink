type Listener<Payload> = (payload: Payload) => void;

export class EventBus<Events extends object> {
  readonly #listeners = new Map<keyof Events, Set<Listener<never>>>();

  on<Key extends keyof Events>(event: Key, listener: Listener<Events[Key]>): () => void {
    let listeners = this.#listeners.get(event);
    if (!listeners) {
      listeners = new Set();
      this.#listeners.set(event, listeners);
    }

    listeners.add(listener as Listener<never>);
    return () => this.off(event, listener);
  }

  once<Key extends keyof Events>(event: Key, listener: Listener<Events[Key]>): () => void {
    const unsubscribe = this.on(event, (payload) => {
      unsubscribe();
      listener(payload);
    });
    return unsubscribe;
  }

  off<Key extends keyof Events>(event: Key, listener: Listener<Events[Key]>): void {
    const listeners = this.#listeners.get(event);
    listeners?.delete(listener as Listener<never>);
    if (listeners?.size === 0) this.#listeners.delete(event);
  }

  emit<Key extends keyof Events>(event: Key, payload: Events[Key]): void {
    const listeners = this.#listeners.get(event);
    if (!listeners) return;

    for (const listener of [...listeners]) {
      try {
        (listener as Listener<Events[Key]>)(payload);
      } catch (error) {
        console.error(`[KikiLink] Event listener failed for ${String(event)}`, error);
      }
    }
  }

  clear(): void {
    this.#listeners.clear();
  }
}
