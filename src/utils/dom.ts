type Child = Node | string | null | undefined | false;

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: {
    className?: string;
    text?: string;
    title?: string;
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
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Args) => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delayMs);
  };
}
