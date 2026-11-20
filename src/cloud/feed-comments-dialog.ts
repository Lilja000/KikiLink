import { ContentDialog } from "../modules/link-chat/content-dialog";
import { fitPanelDialog } from "../modules/platform-shell/panel-dialog-layout";
import { element } from "./dom";

/** Keep one live copy of the post so its media, poll, and reactions keep their state. */
export class FeedCommentsDialog {
  readonly dialog = new ContentDialog();
  readonly subject = element("article", { className: "kl-cloud-card kl-comment-subject" });
  readonly count = element("span", { className: "kl-comment-subject-count" });
  constructor(readonly card: HTMLElement, comments: HTMLElement, closed: () => void) {
    const trigger = card.querySelector<HTMLButtonElement>(".kl-post-comments-button");
    const placeholder = element("div", { className: "kl-comment-placeholder", ariaHidden: "true" },
      element("strong", { text: card.querySelector(".kl-social-name")?.textContent ?? "" }),
      element("p", { text: card.querySelector(".kl-feed-post-text")?.textContent ?? "" }));
    placeholder.style.minHeight = `${card.getBoundingClientRect().height}px`;
    const scroll = element("div", { className: "kl-comment-dialog-scroll" }, this.subject, comments);
    const shell = this.dialog.element;
    shell.classList.add("kl-feed-comments-dialog");
    for (const node of [...card.childNodes]) this.subject.append(node);
    trigger?.after(this.count);
    card.append(placeholder, shell);
    let fit: (() => void) | undefined;
    const observer = new MutationObserver(() => { if (!card.isConnected) this.close(); });
    const surface = card.closest(".kl-feed-layout");
    if (surface) observer.observe(surface, { childList: true, subtree: true });
    this.dialog.show("Comments", scroll, () => {
      observer.disconnect(); fit?.(); closed();
      this.count.remove();
      shell.remove(); placeholder.remove();
      card.append(...this.subject.childNodes);
      trigger?.setAttribute("aria-expanded", "false");
    }, undefined, trigger ?? undefined);
    fit = fitPanelDialog(shell);
  }
  close(): void { this.dialog.close(); }
}
