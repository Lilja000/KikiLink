/** Small typed DOM factory for the social UI. Text is always assigned as text. */
interface Props {
  className?: string; text?: string; title?: string; src?: string; alt?: string;
  tabIndex?: number; type?: string; ariaLabel?: string; ariaHidden?: string;
  role?: string; value?: string; placeholder?: string; maxLength?: number;
  accept?: string; multiple?: boolean; hidden?: boolean; dateTime?: string;
}
export function element<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...children: Array<Node | string | undefined>): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "text") node.textContent = String(value);
    else if (key === "value" && (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement)) node.value = String(value);
    else {
      const attr = ({ className: "class", ariaLabel: "aria-label", ariaHidden: "aria-hidden", tabIndex: "tabindex", maxLength: "maxlength", dateTime: "datetime" } as Record<string, string>)[key] ?? key;
      if (typeof value === "boolean") { if (value) node.setAttribute(attr, ""); }
      else node.setAttribute(attr, String(value));
    }
  }
  for (const child of children) if (child !== undefined) node.append(child);
  return node;
}
