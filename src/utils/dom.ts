type Child = Node | string | null | undefined | false;

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: {
    className?: string;
    text?: string;
    title?: string;
    src?: string;
    alt?: string;
    tabIndex?: number;
    type?: HTMLButtonElement["type"];
    ariaLabel?: string;
    onClick?: (event: MouseEvent) => void;
  } = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.title !== undefined) node.title = options.title;
  if (options.src !== undefined && node instanceof HTMLImageElement) node.src = options.src;
  if (options.alt !== undefined && node instanceof HTMLImageElement) node.alt = options.alt;
  if (options.tabIndex !== undefined) node.tabIndex = options.tabIndex;
  if (options.type !== undefined && node instanceof HTMLButtonElement) node.type = options.type;
  if (options.ariaLabel !== undefined) node.setAttribute("aria-label", options.ariaLabel);
  if (options.onClick) {
    node.addEventListener("click", (event) => options.onClick?.(event as MouseEvent));
  }

  for (const child of children) {
    if (!child) continue;
    node.append(child instanceof Node ? child : document.createTextNode(child));
  }

  return node;
}

export function debounce<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): ((...args: Args) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: Args): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      callback(...args);
    }, delayMs);
  };
  debounced.cancel = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  return debounced;
}
