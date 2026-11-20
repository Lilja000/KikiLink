import { element } from "../../cloud/dom";
import { focusedElement } from "../../utils/dom";
import { kikiIcon } from "../link-chat/icons";
import { fitPanelDialog } from "./panel-dialog-layout";
import {
  matchingDays, matchingSignalTimeZone, renderSignalExpiry, renderSignalPreview, renderSignalPublication, signalWindowHint,
} from "./matching-signal-preview";
import {
  MATCH_INTENTS,
  matchLanguageOptions,
  MATCH_INTERESTS,
  checkedMatchSignal,
  matchInteger,
  matchText,
  type MatchSignal,
  type MatchOwn,
} from "../../../cloud/shared/matching.mjs";
export type MatchExpiry = "keep" | "none" | "1" | "4";
const steps = ["Looking for", "Availability", "Sharing"] as const;
const noteLimit = 180;
export const matchingSignalNeededTitle = "Make your matching signal available";
export function matchingSignalNeededBody(): HTMLElement {
  return element("div", { className: "kl-match-connection-confirm" },
    element("p", { text: "People should be able to see what you are looking for before a connection request. You can keep browsing while your signal is paused." }));
}

export function signalWithExpiry(signal: MatchSignal, expiry: MatchExpiry, serverNow: number, observedAt: number): MatchSignal {
  const expiresAt = expiry === "keep" ? signal.expiresAt : expiry === "none" ? null
    : serverNow + Math.max(0, Date.now() - observedAt) + Number(expiry) * 3600000;
  return checkedMatchSignal({ ...signal, expiresAt });
}

export class MatchingSignalEditor {
  readonly element = element("div", { className: "kl-match-editor" });
  readonly #title = element("h2", { text: "Your matching signal" });
  readonly #body = element("div", { className: "kl-match-dialog-body" });
  readonly #footer = element("footer");
  readonly #close = element("button", { type: "button", className: "kl-icon-button", ariaLabel: "Close dialog" }, kikiIcon("close"));
  #stepHeading: HTMLHeadingElement | undefined;
  #discardReturn: string | undefined;
  #discardScroll = 0;
  readonly draft: MatchSignal;
  #step = 0;
  #expiry: MatchExpiry = "keep";
  #busy = false;
  #error = "";
  #discard = false;
  #held=false;
  hold(){this.#held=true;this.#error="Matching changed after recovery. Keep this original draft for review or discard it before editing the current signal.";this.#draw();}
  #active(node:HTMLElement){return node.isConnected&&(this.options.current?.()??true);}
  #writable(node:HTMLElement){return this.#active(node)&&!this.#busy&&!this.#held&&(this.options.writable?.()??true);}
  readonly #baseline: string;
  readonly #observedAt = Date.now();
  constructor(
    readonly own: MatchOwn,
    readonly options: {
      current?():boolean;
      writable?():boolean;
      save(value: MatchSignal, expiry: MatchExpiry): Promise<void>;
      close(): void;
      privacy(): void;
    },
  ) {
    this.draft = structuredClone(own.signal);
    this.#baseline = JSON.stringify(this.draft);
    this.#title.id = `kl-match-signal-${crypto.randomUUID()}`;
    this.#close.onclick = () => { if (this.#active(this.#close)) this.requestClose(); };
    this.element.append(element("header", { className: "kl-match-dialog-header" },
      element("div", {}, element("span", { className: "kl-match-dialog-eyebrow", text: "KikiLink" }), this.#title), this.#close),
      this.#body, this.#footer);
    this.#draw();
  }
  mount(dialog: HTMLDialogElement): (() => void) | undefined {
    dialog.dataset.layout = "signal-editor";
    dialog.setAttribute("aria-labelledby", this.#title.id);
    dialog.replaceChildren(this.element);
    if (!dialog.open) dialog.showModal();
    const release = fitPanelDialog(dialog);
    this.#stepHeading?.focus({ preventScroll: true });
    return release;
  }
  get dirty(): boolean {
    return (
      JSON.stringify(this.draft) !== this.#baseline || this.#expiry !== "keep"
    );
  }
  #serverNow(): number {
    return this.own.serverNow + Math.max(0, Date.now() - this.#observedAt);
  }
  #button(label: string, fn: () => void) {
    const b = element("button", {
      type: "button",
      className: "kl-text-button",
      text: label,
    });
    b.disabled = this.#busy || (["Save signal", "Continue"].includes(label) &&
      (this.#held || !(this.options.writable?.() ?? true)));
    b.addEventListener("click", () => {
      if (this.#active(b)&&!this.#busy) fn();
    });
    return b;
  }
  #field(label: string, input: HTMLElement) {
    return element(
      "label",
      { className: "kl-match-field" },
      element("span", { text: label }),
      input,
    );
  }
  #select(
    label: string,
    values: readonly string[],
    value: string,
    write: (v: string) => void,
    labels?: string[],
  ) {
    const s = element("select", { ariaLabel: label });
    values.forEach((v, i) =>
      s.append(element("option", { value: v, text: labels?.[i] ?? v })),
    );
    s.value = value;
    s.addEventListener("change", () => {if(this.#writable(s))write(s.value);});
    return this.#field(label, s);
  }
  #choices(
    label: string,
    values: Array<{ id: string; label: string }>,
    selected: string[],
    onChange?: () => void,
  ) {
    const box = element(
      "fieldset",
      { className: "kl-match-choices" },
      element("legend", { text: label }),
    );
    for (const v of values) {
      const input = element("input", { type: "checkbox", ariaLabel: v.label });
      input.checked = selected.includes(v.id);
      input.addEventListener("change", () => {
        if(!this.#writable(input))return;
        const at = selected.indexOf(v.id);
        if (input.checked && at < 0) selected.push(v.id);
        else if (!input.checked && at >= 0) selected.splice(at, 1);
        onChange?.();
      });
      box.append(
        element("label", {}, input, element("span", { text: v.label })),
      );
    }
    return box;
  }
  #input(
    label: string,
    type: string,
    value: string,
    write: (v: string) => void,
    min?: number,
    max?: number,
  ) {
    const input = element("input", { type, ariaLabel: label, value });
    if (min !== undefined) input.min = String(min);
    if (max !== undefined) input.max = String(max);
    input.addEventListener("input", () => {if(this.#writable(input))write(input.value);});
    return this.#field(label, input);
  }
  #toggle(label: string, checked: boolean, write: (v: boolean) => void) {
    const input = element("input", { type: "checkbox", ariaLabel: label });
    input.checked = checked;
    input.addEventListener("change", () => {if(this.#writable(input))write(input.checked);});
    return element(
      "label",
      { className: "kl-match-toggle" },
      input,
      element("span", { text: label }),
    );
  }
  requestClose(): void {
    if (this.#busy) return;
    if (this.#discard) {
      this.#keepEditing();
    } else if (this.dirty) {
      const focused = focusedElement(this.element);
      const label = focused?.getAttribute("aria-label");
      this.#discardReturn = focused === this.#close ? ".kl-match-dialog-header button"
        : focused && label && this.#body.contains(focused) ? `[aria-label="${CSS.escape(label)}"]`
        : undefined;
      this.#discardScroll = this.#body.scrollTop;
      this.#discard = true;
      this.#draw(true);
    } else this.options.close();
  }
  #keepEditing(): void {
    this.#discard = false;
    this.#draw();
    const returnTo = this.#discardReturn && this.element.querySelector<HTMLElement>(this.#discardReturn);
    this.#discardReturn = undefined;
    if (returnTo && !returnTo.matches(":disabled")) {
      this.#body.scrollTop = this.#discardScroll;
      returnTo.focus({ preventScroll: true });
    } else this.#stepHeading?.focus({ preventScroll: true });
  }
  #draw(moveFocus = false) {
    const d = this.draft;
    this.#close.disabled = this.#busy;
    this.#stepHeading = element("h3", { className: "kl-match-signal-step-heading", tabIndex: -1,
      text: this.#discard ? "Discard your unsaved signal changes?" : steps[this.#step]! });
    const alert = this.#error ? element("p", { className: "kl-match-request-error", role: "alert", tabIndex: -1, text: this.#error }) : undefined;
    if (this.#discard) {
      this.#body.replaceChildren(this.#stepHeading, ...(alert ? [alert] : []));
      const discard = this.#button("Discard changes", () => this.options.close());
      discard.classList.add("kl-match-decision-danger");
      this.#footer.replaceChildren(this.#button("Keep editing", () => this.#keepEditing()), discard);
      this.#body.scrollTop = 0;
      if (moveFocus) this.#stepHeading.focus({ preventScroll: true });
      return;
    }
    const progress = element("ol", { className: "kl-match-signal-progress", ariaLabel: "Signal editor progress" },
      ...steps.map((label, index) => {
        const number = element("span", { className: "kl-match-signal-step-number", ariaHidden: "true" },
          index < this.#step ? kikiIcon("check") : String(index + 1));
        const step = element("li", {}, number, label);
        if (index === this.#step) step.setAttribute("aria-current", "step");
        if (index < this.#step) step.classList.add("is-complete");
        return step;
      }));
    const fields = element("fieldset", { className: "kl-match-editor-fields" });
    fields.disabled = this.#busy||this.#held||!(this.options.writable?.()??true);
    this.#body.replaceChildren(progress, this.#stepHeading, fields, ...(alert ? [alert] : []));
    const next = this.#button(this.#step === steps.length - 1 ? "Save signal" : "Continue", () => void this.#advance());
    if (this.#step === 0) {
      const validation = element("div", { className: "kl-match-meta kl-match-signal-validation", role: "status" });
      const counter = element("span", { className: "kl-match-signal-note-count" });
      const noteHint = element("span", { text: "Visible to your selected audience while your signal is available." });
      validation.id = `${this.#title.id}-validation`;
      counter.id = `${this.#title.id}-note-count`;
      noteHint.id = `${this.#title.id}-note-hint`;
      const intents = this.#choices(
        "Looking for",
        MATCH_INTENTS.map((id) => ({ id, label: id })),
        d.intents,
        updateValidation,
      );
      const languages = this.#choices(
        "Languages · choose up to five",
        matchLanguageOptions(d.languages).map((id) => ({ id, label: id })),
        d.languages,
        updateValidation,
      );
      fields.append(
        intents,
        languages,
        this.#choices(
          "Shared interests · optional",
          MATCH_INTERESTS.map((x) => ({ ...x })),
          d.interests,
        ),
      );
      const note = element("textarea", {
        ariaLabel: "A little note",
        maxLength: noteLimit,
        value: d.note,
      });
      note.rows = 3;
      note.addEventListener("input", () => {
        if (!this.#writable(note)) return;
        d.note = note.value;
        updateValidation();
      });
      const durationField = this.#input("Usual session length (minutes)", "number", String(d.duration), value => {
        d.duration = Number(value);
        updateValidation();
      }, 15, 240);
      const duration = durationField.querySelector("input")!;
      for (const control of [intents, languages, duration]) control.setAttribute("aria-describedby", validation.id);
      note.setAttribute("aria-describedby", `${noteHint.id} ${counter.id} ${validation.id}`);
      function updateValidation() {
        const problems = [
          [intents, d.intents.length > 0, "Choose at least one intent."],
          [languages, d.languages.length >= 1 && d.languages.length <= 5, "Choose between one and five languages."],
          [duration, matchInteger(d.duration, 15, 240), "Enter a whole number from 15 to 240 minutes."],
          [note, matchText(d.note, noteLimit), d.note.length > noteLimit
            ? `Keep your note to ${noteLimit} characters or fewer.` : "Remove unsupported characters from your note."],
        ] as const;
        const messages: string[] = [];
        for (const [control, valid, message] of problems) {
          if (valid) control.removeAttribute("aria-invalid");
          else {
            control.setAttribute("aria-invalid", "true");
            messages.push(message);
          }
        }
        const count = `${d.note.length}/${noteLimit}`;
        if (counter.textContent !== count) counter.textContent = count;
        const feedback = messages.join(" ") || "Ready for the next step.";
        if (validation.textContent !== feedback) validation.textContent = feedback;
        next.disabled = fields.disabled || messages.length > 0;
      }
      fields.append(
        element(
          "div",
          { className: "kl-match-form-grid" },
          durationField,
          this.#select(
            "Preferred group size",
            ["One-to-one", "Small group", "Either"],
            d.size,
            (v) => {
              d.size = v as MatchSignal["size"];
            },
          ),
        ),
        this.#field("A little note (optional)", note),
        element("div", { className: "kl-match-meta kl-match-signal-note-meta" }, noteHint, counter),
        validation,
      );
      updateValidation();
    } else if (this.#step === 1) {
      const windowHint = element("p", { className: "kl-match-meta kl-match-signal-window", role: "status" });
      const expiryHint = element("p", { className: "kl-match-meta kl-match-signal-expiry", role: "status" });
      const status = element("p", { className: "kl-match-meta kl-match-signal-availability-status", role: "status" });
      windowHint.id = `${this.#title.id}-window`;
      expiryHint.id = `${this.#title.id}-expiry`;
      status.id = `${this.#title.id}-availability`;
      const updateWindow = () => { windowHint.textContent = signalWindowHint(d); };
      const updateExpiry = () => renderSignalExpiry(expiryHint, this.#expiry, d.expiresAt, this.#serverNow());
      const updateStatus = () => {
        status.textContent = d.availability === "Not looking"
          ? "Your signal will be saved paused. Your days and times stay saved for when you are looking again." : "";
      };
      fields.append(
        element("p", { className: "kl-match-meta", text: "Choose the days and times that work for you." }),
        this.#select(
          "Availability",
          ["Available now", "Planning ahead", "Not looking"],
          d.availability,
          (v) => {
            d.availability = v as MatchSignal["availability"];
            if (v === "Not looking") d.published = false;
            updateStatus();
          },
        ),
        status,
      );
      const days = element(
        "fieldset",
        { className: "kl-match-choices" },
        element("legend", { text: "Usual days" }),
      );
      matchingDays.forEach((label, i) =>
        days.append(
          this.#toggle(label, d.days.includes(i), (checked) => {
            d.days = checked
              ? [...new Set([...d.days, i])]
              : d.days.filter((v) => v !== i);
            updateWindow();
          }),
        ),
      );
      fields.append(
        days,
        element(
          "div",
          { className: "kl-match-form-grid" },
          this.#input("From", "time", d.from, (v) => {
            d.from = v;
            updateWindow();
          }),
          this.#input("Until", "time", d.to, (v) => {
            d.to = v;
            updateWindow();
          }),
          this.#select(
            "Time zone",
            Array.from({ length: 27 }, (_, i) => String(i - 12)),
            String(d.utcOffset),
            (v) => {
              d.utcOffset = Number(v);
              updateWindow();
            },
            Array.from(
              { length: 27 },
              (_, i) => matchingSignalTimeZone(i - 12),
            ),
          ),
          this.#select(
            "Signal expires",
            ["keep", "none", "1", "4"],
            this.#expiry,
            (v) => {
              this.#expiry = v as MatchExpiry;
              updateExpiry();
            },
            [
              "Keep current expiry",
              "Until paused",
              "1 hour from save",
              "4 hours from save",
            ],
          ),
        ),
        windowHint,
        expiryHint,
      );
      days.setAttribute("aria-describedby", windowHint.id);
      for (const control of fields.querySelectorAll('[aria-label="From"], [aria-label="Until"], [aria-label="Time zone"]'))
        control.setAttribute("aria-describedby", windowHint.id);
      fields.querySelector('[aria-label="Signal expires"]')?.setAttribute("aria-describedby", expiryHint.id);
      fields.querySelector('[aria-label="Availability"]')?.setAttribute("aria-describedby", status.id);
      updateWindow();
      updateExpiry();
      updateStatus();
    } else {
      const card = element("article", { className: "kl-match-signal-preview-card" });
      const summary = element("p", { className: "kl-match-meta kl-match-signal-publication", role: "status" });
      const audience = element("p", { className: "kl-match-meta" });
      const updatePreview = () => {
        renderSignalPreview(card, d);
        audience.textContent = d.audience === "Friends" ? "Preview for friends. Profile privacy still applies."
          : "Preview for someone outside your friends list. Profile privacy still applies.";
        renderSignalPublication(summary, d, this.#expiry, this.#serverNow(), this.own.canPublish);
      };
      const use = element("section", {}, element("h3", { text: "Use for my suggestions" }),
        element("p", { className: "kl-match-meta", text: "These choices affect your recommendations." }));
      const share = element("section", {}, element("h3", { text: "What others can see" }),
        element("p", { className: "kl-match-meta", text: "Your profile and Preferences privacy still apply." }));
      fields.append(
        this.#select(
          "Who can see my signal",
          ["Everyone", "Friends"],
          d.audience,
          (v) => {
            d.audience = v as MatchSignal["audience"];
            updatePreview();
          },
        ),
        element("div", { className: "kl-match-signal-sharing" }, use, share),
      );
      for (const [key, label] of Object.entries({
        compatibility: "Compatibility",
        interests: "Shared interests",
        availability: "Shared time",
        connections: "Connections",
      }))
        use.append(
          this.#toggle(label, d.use[key as keyof MatchSignal["use"]], (v) => {
            d.use[key as keyof MatchSignal["use"]] = v;
          }),
        );
      share.append(
        this.#select(
          "Compatibility sharing",
          ["Details", "Score only", "Off"],
          d.share.compatibility,
          (v) => {
            d.share.compatibility = v as MatchSignal["share"]["compatibility"];
            updatePreview();
          },
        ),
      );
      for (const [key, label] of Object.entries({
        interests: "My signal interests",
        availability: "My availability",
        connections: "My shared connections",
      }))
        share.append(
          this.#toggle(
            label,
            d.share[key as "interests" | "availability" | "connections"],
            (v) => {
              d.share[key as "interests" | "availability" | "connections"] = v;
            updatePreview();
            },
          ),
        );
      fields.append(
        element("section", { className: "kl-match-signal-preview" },
          element("h3", { text: "What your audience could see" }), card, audience),
      );
      if (!this.own.canPublish)
        fields.append(
          element("p", {
            role: "status",
            text: "Enable profile discovery and save a visible profile before making your signal available.",
          }),
          this.#button("Open Cloud privacy", this.options.privacy),
        );
      const publish = this.#toggle(
        "Make my signal available",
        d.published,
        (v) => {
          d.published = v;
          updatePreview();
        },
      );
      publish.querySelector("input")!.disabled =
        !d.published &&
        (!this.own.canPublish || d.availability === "Not looking");
      fields.append(
        publish,
        summary,
      );
      updatePreview();
    }
    const previous = this.#step ? this.#button("Back", () => {
      this.#step--;
      if (!this.#held) this.#error = "";
      this.#draw(true);
    }) : this.#button("Cancel", () => this.requestClose());
    next.classList.add("kl-text-button--primary");
    this.#footer.replaceChildren(previous, next);
    if (moveFocus) {
      this.#body.scrollTop = 0;
      this.#stepHeading.focus({ preventScroll: true });
    }
  }
  async #advance(): Promise<void> {
    if (!this.#writable(this.element)) return;
    try {
      checkedMatchSignal(this.draft);
      this.#error = "";
      if (this.#step < steps.length - 1) {
        this.#step++;
        this.#draw(true);
        return;
      }
      this.#busy = true;
      this.#draw();
      await this.options.save(structuredClone(this.draft), this.#expiry);
    } catch (error) {
      this.#error = error instanceof Error ? error.message : "Signal could not be saved.";
    } finally {
      if (this.#busy || this.#error) {
        this.#busy = false;
        this.#draw();
        if (this.#error && this.#active(this.element)) this.#body.querySelector<HTMLElement>('[role="alert"]')?.focus();
      }
    }
  }
}
