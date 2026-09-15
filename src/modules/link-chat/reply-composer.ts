import { element } from "../../utils/dom";
import { kikiIcon } from "./icons";
import { formatInlineReplyPrefix, parseBoundedReplyPrefix, type InlineReplyContext } from "./message-reply";

/** A quote is plain, bounded text, never an authenticated author or a navigation target. */
export function replyPreview(reply: Pick<InlineReplyContext, "author" | "excerpt">): HTMLDivElement {
  const context = element("div", { className: "kl-message-reply",
    ariaLabel: `Reply to ${reply.author}: ${reply.excerpt}`, title: `${reply.author}: ${reply.excerpt}` },
    kikiIcon("reply", "kl-message-reply-icon"),
    element("span", { className: "kl-message-reply-copy" },
      element("strong", { className: "kl-message-reply-author", text: reply.author }),
      element("span", { className: "kl-message-reply-excerpt", text: reply.excerpt })),
  );
  context.setAttribute("role", "note");
  return context;
}

/** Shared reply state. Drafts and messages retain Direct's backwards-compatible wire format. */
export class ReplyComposer {
  readonly element = element("div", { className: "kl-composer-reply", ariaLabel: "Reply preview" });
  readonly #lifetime = new AbortController();
  #prefix = "";

  constructor(readonly input: HTMLTextAreaElement, readonly limit: number) {
    this.element.setAttribute("role", "group");
    input.addEventListener("keydown", event => {
      if (event.key !== "Escape" || event.isComposing || !this.#prefix || input.disabled) return;
      event.preventDefault(); event.stopPropagation(); this.cancel();
    }, { signal: this.#lifetime.signal });
    this.load(input.value);
  }
  get value(): string { return this.#prefix + this.input.value; }
  get hasContent(): boolean { return this.input.value.trim().length > 0; }
  load(value: string): void {
    const reply = parseBoundedReplyPrefix(value);
    this.#prefix = reply ? value.slice(0, value.length - reply.content.length) : "";
    this.input.value = reply?.content ?? value;
    this.#render();
  }
  replyTo(author: string, content: string): void {
    if (this.input.disabled) return;
    const prefix = formatInlineReplyPrefix(author, content);
    if (prefix.length + this.input.value.length > this.limit) {
      throw new Error(`That reply would exceed the ${this.limit}-character message limit.`);
    }
    this.#prefix = prefix; this.#render(); this.#changed();
  }
  cancel(): void {
    if (this.input.disabled || !this.#prefix) return;
    this.#prefix = ""; this.#render(); this.#changed();
  }
  #render(): void {
    this.input.maxLength = Math.max(0, this.limit - this.#prefix.length);
    const reply = parseBoundedReplyPrefix(this.#prefix);
    this.element.hidden = !reply;
    this.element.replaceChildren();
    if (!reply) return;
    this.element.append(replyPreview(reply), element("button", { className: "kl-message-action kl-reply-cancel",
      type: "button", title: "Cancel reply", ariaLabel: "Cancel reply", onClick: () => this.cancel() }, kikiIcon("close")));
  }
  #changed(): void {
    this.input.dispatchEvent(new Event("input", { bubbles: true }));
    this.input.focus(); this.input.setSelectionRange(this.input.value.length, this.input.value.length);
  }
  destroy(): void { this.#lifetime.abort(); this.element.remove(); this.#prefix = ""; }
}
