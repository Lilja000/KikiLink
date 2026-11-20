import { samePersonalLetter, type CommunityService, type MailItem } from "../../cloud/community";
import { appendFeedFormattedText } from "../../cloud/feed-spoilers";
import { bindClockText } from "../../core/time-format";
import { element } from "../../utils/dom";
import { fitPanelDialog } from "../platform-shell/panel-dialog-layout";
import type { ContentDialog } from "./content-dialog";

interface ReaderOptions {
  current(): boolean;
  canChat(): boolean;
  openChat(name: string, current: () => boolean): Promise<void>;
  focusOrigin(): HTMLElement;
  closed(): void;
}

export class PersonalMailReader {
  readonly #scroll = element("div", { className: "kl-personal-mail-scroll" });
  readonly #close = element("button", { type: "button", className: "kl-text-button", text: "Close", onClick: () => this.close() });
  readonly #actions = element("div", { className: "kl-cloud-actions kl-personal-mail-actions" }, this.#close);
  readonly #root = element("section", { className: "kl-personal-mail-reader" }, this.#scroll, this.#actions);
  #revision: number;
  #operation = 0;
  #open = false;

  constructor(private readonly community: CommunityService, private readonly mail: MailItem, private readonly dialog: ContentDialog,
    private readonly options: ReaderOptions) {
    this.#revision = community.personalMailRevision;
  }

  show(panel: HTMLElement): void {
    if (!this.options.current() || !this.#hasDetail(this.mail)) return;
    this.options.focusOrigin().focus({ preventScroll: true });
    let release: (() => void) | undefined;
    this.dialog.show(this.mail.mailSubject, this.#root, () => {
      this.#open = false;
      this.#operation++;
      this.#scroll.replaceChildren();
      this.#actions.replaceChildren();
      this.dialog.setTitle("");
      release?.();
      for (const property of ["inset", "max-width", "max-height", "--kl-dialog-viewport-height"]) this.dialog.element.style.removeProperty(property);
      this.options.closed();
      queueMicrotask(() => {
        if (!this.dialog.element.open && this.options.current()) {
          const target = this.options.focusOrigin();
          if (target.isConnected && !target.closest("[hidden], [inert]")) target.focus({ preventScroll: true });
        }
      });
    });
    this.#open = true;
    release = fitPanelDialog(this.dialog.element, { panel });
    this.#render(this.mail);
  }

  close(): void {
    if (!this.#open || !this.dialog.body.contains(this.#root)) return;
    this.dialog.setTitle("");
    this.#scroll.replaceChildren();
    this.#actions.replaceChildren();
    this.dialog.close();
  }

  sync(): void {
    if (!this.#open) return;
    if (!this.options.current() || this.community.personalMailLoaded &&
      !this.community.mailbox.items.some(row => samePersonalLetter(this.mail, row))) { this.close(); return; }
    if (this.#revision !== this.community.personalMailRevision) {
      this.#revision = this.community.personalMailRevision;
      this.dialog.setTitle("Mail");
      this.#scroll.replaceChildren(element("p", { className: "kl-personal-mail-meta", text: "Checking access…" }));
      this.#actions.replaceChildren(this.#close);
      void this.#resolve(false);
    }
  }

  #hasDetail(row: MailItem): row is MailItem & { mailSubject: string; mailBody: string; actor: number } {
    return samePersonalLetter(this.mail, row) && typeof row.mailSubject === "string" && !!row.mailSubject.trim() &&
      typeof row.mailBody === "string" && !!row.mailBody.trim() && !!row.actor;
  }

  #render(row: MailItem & { mailSubject: string; mailBody: string; actor: number }): void {
    this.dialog.setTitle(row.mailSubject);
    const name = row.mailSenderName?.trim() || `Member ${row.actor}`;
    const meta = element("p", { className: "kl-personal-mail-meta" }, `From ${name} · `,
      bindClockText(element("time"), row.createdAt, "long-date-time-with-zone"));
    const body = element("div", { className: "kl-personal-mail-body" });
    appendFeedFormattedText(body, row.mailBody);
    this.#scroll.replaceChildren(meta, body);
    this.#actions.replaceChildren(this.#close);
    if (this.options.canChat()) {
      const chat = element("button", { type: "button", className: "kl-text-button kl-text-button--primary", text: "Open conversation" });
      chat.addEventListener("click", () => {
        if (!chat.disabled && this.#actions.contains(chat)) { chat.disabled = true; void this.#resolve(true); }
      });
      this.#actions.append(chat);
    }
  }

  async #resolve(openChat: boolean): Promise<void> {
    const operation = ++this.#operation, revision = this.#revision;
    const current = () => this.#open && this.dialog.element.open && operation === this.#operation && this.options.current() &&
      revision === this.community.personalMailRevision && this.dialog.body.contains(this.#root);
    if (!current()) { this.sync(); return; }
    try {
      const row = await this.community.resolveMail(this.mail, true);
      if (!current()) { this.sync(); return; }
      if (!this.#hasDetail(row)) { this.close(); return; }
      if (openChat && this.options.canChat()) {
        await this.options.openChat(row.mailSenderName?.trim() || `Member ${row.actor}`, current);
        if (!current()) return;
      }
      this.#render(row);
    } catch { if (current()) this.close(); else this.sync(); }
  }
}
