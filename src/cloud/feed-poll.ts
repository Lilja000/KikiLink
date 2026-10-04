import { element } from "./dom";
import { SocialUI } from "./social-ui";
import type { CloudPoll, CloudPollDraft } from "./types";
import { bindClockTitle } from "../core/time-format";

/** The editor lives in the normal composer, using its existing fields/buttons. */
export function pollEditor(ui: SocialUI, draft: CloudPollDraft, changed: () => void): HTMLElement {
  const root = element("section", { className: "kl-feed-poll-editor", ariaLabel: "Create poll" });
  const question = element("input", { value: draft.question, maxLength: 200, placeholder: "Ask your circle a question…", ariaLabel: "Poll question" });
  question.addEventListener("input", () => { draft.question = question.value; changed(); });
  const choices = element("div", { className: "kl-feed-poll-editor-options" });
  const renderChoices = () => {
    choices.replaceChildren();
    draft.options.forEach((value, index) => {
      const input = element("input", { value, maxLength: 100, placeholder: `Option ${index + 1}`, ariaLabel: `Poll option ${index + 1}` });
      input.addEventListener("input", () => { draft.options[index] = input.value; changed(); });
      const remove = ui.button(`Remove option ${index + 1}`, () => { if (draft.options.length <= 2) return; draft.options.splice(index, 1); renderChoices(); changed(); choices.querySelectorAll<HTMLInputElement>("input")[Math.min(index, draft.options.length - 1)]?.focus(); }, "close", "kl-social-icon-button");
      remove.disabled = draft.options.length <= 2;
      choices.append(element("div", { className: "kl-feed-poll-editor-option" }, input, remove));
    });
    add.disabled = draft.options.length >= 6;
  };
  const add = ui.button("Add option", () => {
    if (draft.options.length >= 6) return;
    draft.options.push(""); renderChoices(); changed(); choices.querySelector<HTMLInputElement>("div:last-child input")?.focus();
  }, "plus");
  const multiple = element("input", { type: "checkbox", ariaLabel: "Allow multiple answers" });
  multiple.checked = draft.multiple;
  multiple.addEventListener("change", () => { draft.multiple = multiple.checked; changed(); });
  const duration = element("select", { ariaLabel: "Poll duration" });
  const durations = [[1, "1 hour"], [12, "12 hours"], [24, "1 day"], [72, "3 days"], [168, "7 days"]] as const;
  for (const [hours, title] of durations) duration.append(element("option", { value: String(hours), text: title }));
  const remaining = Math.max(0, draft.closesAt - Date.now()) / 3_600_000;
  duration.value = String(durations.reduce((nearest, item) => Math.abs(item[0] - remaining) < Math.abs(nearest[0] - remaining) ? item : nearest)[0]);
  duration.addEventListener("change", () => { draft.closesAt = Date.now() + Number(duration.value) * 3_600_000; changed(); });
  const deadline = element("p", { className: "kl-cloud-note kl-feed-poll-deadline" });
  const updateDeadline = () => {
    const expired = draft.closesAt < Date.now() + 5 * 60_000;
    deadline.textContent = expired ? "This draft’s poll deadline has passed or is too close. Set a new deadline before posting." : `Closes ${new Date(draft.closesAt).toLocaleString()}`;
    reset.hidden = !expired;
  };
  const reset = ui.button("Reset poll deadline", () => { draft.closesAt = Date.now() + Number(duration.value) * 3_600_000; updateDeadline(); changed(); }, "refresh");
  duration.addEventListener("change", updateDeadline);
  root.append(question, choices, element("div", { className: "kl-feed-poll-settings" }, add,
    element("label", {}, "Ends in ", duration), element("label", { className: "kl-feed-check" }, multiple, "Multiple answers")),
  deadline, reset, element("p", { className: "kl-cloud-note", text: "2–6 answers · Votes are private · Polls cannot be edited after posting." }));
  renderChoices(); updateDeadline(); return root;
}

export function validPollDraft(draft: CloudPollDraft | null | undefined): boolean {
  if (!draft) return true;
  const choices = draft.options.map(option => option.trim());
  return Boolean(draft.question.trim() && choices.length >= 2 && choices.length <= 6 && choices.every(Boolean)
    && new Set(choices.map(choice => choice.normalize("NFKC").toLowerCase())).size === choices.length
    && draft.closesAt >= Date.now() + 5 * 60_000 && draft.closesAt <= Date.now() + 7 * 86_400_000);
}

/** Patch only poll state; never replace the surrounding post, image or composer. */
export class FeedPollView {
  readonly element = element("section", { className: "kl-feed-poll", ariaLabel: "Poll" });
  #poll: CloudPoll;
  #selected: Set<number>;
  #busy = false;
  #results = false;
  #editing = false;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #snapshot = "";
  #destroyed = false;
  constructor(readonly ui: SocialUI, poll: CloudPoll, readonly vote: (ids: number[]) => Promise<void>) {
    this.#poll = poll; this.#selected = new Set(poll.myVotes); this.#render();
  }
  destroy(): void { this.#destroyed = true; clearTimeout(this.#timer); }
  update(poll: CloudPoll): void {
    if (this.#destroyed) return;
    const changed = JSON.stringify(poll) !== JSON.stringify(this.#poll);
    if (!changed) return;
    const previousVotes = JSON.stringify(this.#poll.myVotes);
    const choicesUnchanged = JSON.stringify(this.#poll.options.map(({ id, text }) => [id, text])) === JSON.stringify(poll.options.map(({ id, text }) => [id, text]));
    this.#poll = poll;
    if (JSON.stringify(poll.myVotes) !== previousVotes) { this.#selected = new Set(poll.myVotes); this.#editing = false; }
    if (!this.#busy && !poll.closed && poll.closesAt > Date.now() && !this.#results && (!poll.myVotes.length || this.#editing) && choicesUnchanged && JSON.stringify(poll.myVotes) === previousVotes && this.element.querySelector("input")) {
      const meta = this.element.querySelector(".kl-feed-poll-meta > span");
      if (meta) meta.textContent = `${poll.totalVoters} ${poll.totalVoters === 1 ? "voter" : "voters"}${poll.multiple ? " · Multiple answers" : ""}`;
      this.#snapshot = ""; return;
    }
    if (!this.#busy) this.#render();
  }
  #render(): void {
    if (this.#destroyed) return;
    clearTimeout(this.#timer);
    const poll = this.#poll, closed = poll.closed || poll.closesAt <= Date.now();
    const results = closed || this.#results || (poll.myVotes.length > 0 && !this.#editing);
    const snapshot = JSON.stringify([poll, [...this.#selected], this.#busy, results, this.#editing, closed]);
    if (snapshot === this.#snapshot) return;
    this.#snapshot = snapshot;
    const active = (this.element.getRootNode() as Document | ShadowRoot).activeElement;
    const ownedFocus = active instanceof HTMLElement && this.element.contains(active);
    const activeLabel = ownedFocus ? active.getAttribute("aria-label") : undefined;
    const question = element("h4", { text: poll.question });
    const choices = element("div", { className: "kl-feed-poll-options", role: "group", ariaLabel: poll.multiple ? "Choose one or more answers" : "Choose one answer" });
    const vote = this.ui.button(poll.myVotes.length ? "Update vote" : "Vote", async () => {
      if (this.#busy || !this.#selected.size || this.#poll.closesAt <= Date.now()) return;
      this.#busy = true; this.#render();
      try { await this.vote([...this.#selected]); this.#editing = false; }
      finally { this.#busy = false; this.#snapshot = ""; this.#render(); }
    }, undefined, "kl-social-button kl-social-primary", false);
    vote.disabled = this.#busy || !this.#selected.size;
    for (const option of poll.options) {
      if (results) {
        const percent = poll.totalVoters ? Math.round(option.votes / poll.totalVoters * 100) : 0;
        const row = element("div", { className: "kl-feed-poll-result" });
        row.dataset.mine = String(poll.myVotes.includes(option.id));
        const bar = element("span", { className: "kl-feed-poll-bar", ariaHidden: "true" });
        bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        row.append(bar, element("span", { className: "kl-feed-poll-option-text", text: `${poll.myVotes.includes(option.id) ? "✓ " : ""}${option.text}` }),
          element("span", { className: "kl-feed-poll-percent", text: `${percent}%`, title: `${option.votes} votes` }));
        choices.append(row);
      } else {
        const input = element("input", { type: poll.multiple ? "checkbox" : "radio", ariaLabel: option.text });
        input.name = `poll-${this.element.dataset.pollId ?? (this.element.dataset.pollId = crypto.randomUUID())}`;
        input.checked = this.#selected.has(option.id); input.disabled = this.#busy;
        input.addEventListener("change", () => {
          if (!poll.multiple) this.#selected.clear();
          if (input.checked) this.#selected.add(option.id); else this.#selected.delete(option.id);
          vote.disabled = this.#busy || !this.#selected.size;
        });
        choices.append(element("label", { className: "kl-feed-poll-choice" }, input, element("span", { text: option.text })));
      }
    }
    const actions = element("div", { className: "kl-feed-poll-actions" });
    if (!closed) {
      if (!results) actions.append(vote);
      if (results && poll.myVotes.length) actions.append(this.ui.button("Change vote", () => { this.#editing = true; this.#results = false; this.#render(); }, "edit"));
      else actions.append(this.ui.button(results ? "Back to voting" : "View results", () => { this.#results = !results; this.#render(); }));
      if (poll.myVotes.length) actions.append(this.ui.button("Remove vote", async () => {
        if (this.#busy) return;
        this.#busy = true; this.#render();
        try { await this.vote([]); this.#selected.clear(); this.#editing = false; }
        finally { this.#busy = false; this.#snapshot = ""; this.#render(); }
      }, undefined, "kl-social-button", false));
      for (const button of actions.querySelectorAll("button")) if (this.#busy) button.disabled = true;
    }
    const end = bindClockTitle(element("time", { dateTime: new Date(poll.closesAt).toISOString(), text: closed ? "Closed" : "Ends " + new Date(poll.closesAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) }), poll.closesAt);
    const meta = element("div", { className: "kl-feed-poll-meta" }, element("span", { text: `${poll.totalVoters} ${poll.totalVoters === 1 ? "voter" : "voters"}${poll.multiple ? " · Multiple answers" : ""}` }), end);
    this.element.replaceChildren(question, choices, meta, actions);
    if (ownedFocus) {
      const target = [...this.element.querySelectorAll<HTMLElement>("button,input")].find(control => control.getAttribute("aria-label") === activeLabel && !(control as HTMLButtonElement).disabled)
        ?? this.element.querySelector<HTMLElement>("button:not(:disabled),input:not(:disabled)");
      if (target) target.focus({ preventScroll: true });
      else { question.tabIndex = -1; question.focus({ preventScroll: true }); }
    }
    this.element.setAttribute("aria-busy", String(this.#busy));
    if (!closed) this.#timer = setTimeout(() => { this.#snapshot = ""; this.#render(); }, Math.min(2_147_483_647, Math.max(1, poll.closesAt - Date.now() + 1)));
  }
}
