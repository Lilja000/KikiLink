import type { CustomActivityDefinition, CustomActivityEffects, CustomActivityStep, CustomActivityTransferDirection } from "../../core/types";
import { element, focusedElement } from "../../utils/dom";
import { blankActivityStep, MAX_SEQUENCE_STEPS, MAX_SEQUENCE_TIME_MS, MAX_STEP_TIME_MS } from "./activity-effects-definition";
import { hiddenActivityChoice, humanize, type ActivityCapabilities, type ExpressionChoice } from "./activity-capabilities";

/** Progressive controls; only native capabilities become selectable options. No scripts or names to type. */
export function activityEffectsEditor(draft: CustomActivityDefinition, capabilities: () => ActivityCapabilities): HTMLElement {
  const effects: CustomActivityEffects = draft.effects ?? { subject: "actor", restore: true, steps: [] };
  const root = element("details", { className: "kl-activity-triggers" }) as HTMLDetailsElement;
  const title = element("summary", { text: "Triggers" });
  const body = element("div", { className: "kl-sequence-editor" });
  root.open = effects.steps.length > 0;
  root.append(title, body);
  const updateDraft = (): void => { draft.effects = effects; };
  const draw = (): void => {
    const caps = capabilities();
    title.textContent = effects.steps.length ? `Triggers · ${effects.steps.length} ${effects.steps.length === 1 ? "step" : "steps"}` : "Triggers · expressions, poses & clothing";
    const subject = select("Apply changes to", [["actor", "My character"], ["target", "Activity target"]], effects.subject);
    subject.addEventListener("change", () => { effects.subject = subject.value === "target" ? "target" : "actor"; updateDraft(); });
    const restore = restoreToggle(effects.restore, checked => { effects.restore = checked; updateDraft(); });
    const total = element("span", { className: "kl-custom-field-help" });
    total.setAttribute("aria-live", "polite");
    const updateTotal = (): void => {
      const seconds = effects.steps.reduce((sum, step) => sum + step.delayMs + step.durationMs, 0) / 1000;
      total.textContent = `${seconds.toFixed(1).replace(/\.0$/, "")} s total${seconds * 1000 > MAX_SEQUENCE_TIME_MS ? " · Maximum 120 s; shorten the sequence before saving" : ""}`;
    };
    const timeline = element("div", { className: "kl-sequence-timeline", ariaLabel: "Sequence order" });
    effects.steps.forEach((_step, index) => timeline.append(element("span", { text: `Step ${index + 1}` })));
    if (effects.restore && effects.steps.length) timeline.append(element("span", { text: "Restore" }));
    const steps = element("div", { className: "kl-sequence-steps" });
    effects.steps.forEach((step, index) => steps.append(stepEditor(step, index, caps, effects, () => { updateDraft(); draw(); }, () => { updateDraft(); updateTotal(); })));
    const add = button("Add step", () => { effects.steps.push(blankActivityStep()); updateDraft(); draw();
      body.querySelector<HTMLDetailsElement>(".kl-sequence-step:last-child")?.focus(); });
    add.classList.add("kl-sequence-add");
    add.disabled = effects.steps.length >= MAX_SEQUENCE_STEPS;
    const refresh = button("Refresh available options", draw);
    refresh.classList.add("kl-sequence-refresh");
    body.replaceChildren(
      field("Apply changes to", subject),
      help("BC permissions apply. Clothing changes stay after the sequence."),
      timeline, steps, element("div", { className: "kl-sequence-toolbar" }, add, total), restore,
      refresh,
    );
    restore.querySelector("input")?.addEventListener("change", () => {
      const marker = timeline.lastElementChild;
      if (!effects.restore && marker?.textContent === "Restore") marker.remove();
      else if (effects.restore && effects.steps.length) timeline.append(element("span", { text: "Restore" }));
    });
    updateTotal();
  };
  root.addEventListener("toggle", () => { if (root.open && !body.childElementCount) draw(); });
  if (root.open) draw();
  return root;
}

function stepEditor(step: CustomActivityStep, index: number, caps: ActivityCapabilities, effects: CustomActivityEffects, redraw: () => void, changed: () => void): HTMLElement {
  const root = element("details", { className: "kl-sequence-step", tabIndex: -1 }) as HTMLDetailsElement;
  root.open = true;
  const summary = element("summary", { text: `Step ${index + 1}` });
  const timing = element("div", { className: "kl-sequence-timing" },
    secondsInput(`Step ${index + 1} delay`, "Delay", step.delayMs, value => { step.delayMs = value; changed(); }),
    secondsInput(`Step ${index + 1} duration`, "Duration", step.durationMs, value => { step.durationMs = value; changed(); }),
  );
  // Retired authoring options disappear when this activity is edited and saved.
  step.expressions = step.expressions.filter(change => !hiddenActivityChoice({ Name: change.group, Description: "" }));
  step.removeClothing = step.removeClothing.filter(name => !hiddenActivityChoice({ Name: name, Description: "" }));
  if (step.wearClothing) step.wearClothing = step.wearClothing.filter(item => !hiddenActivityChoice({ Name: item.Group, Description: "" }));
  const expressionRows = element("div", { className: "kl-sequence-expression-rows" });
  const expressions = section("Expressions & face", expressionRows);
  expressions.open = step.expressions.length > 0;
  const groupsFor = (choice: ExpressionChoice): string[] => choice.name === "Eyes" ? ["Eyes", "Eyes2"] : [choice.name];
  const partsFor = (choice: ExpressionChoice): ExpressionChoice[] => choice.parts ?? [choice];
  const drawExpressions = (focus?: string): void => {
    const active = focusedElement(root);
    const focusedLabel = active && expressionRows.contains(active) ? active.getAttribute("aria-label") : undefined;
    const grid = tileGrid("Expression parameters");
    const settings = element("div", { className: "kl-sequence-expression-settings" });
    for (const choice of caps.expressions) {
      const groups = groupsFor(choice);
      const selected = step.expressions.some(change => groups.includes(change.group));
      const tile = choiceTile(choice.label, selected, () => {
        if (selected) step.expressions = step.expressions.filter(change => !groups.includes(change.group));
        else if (step.expressions.length + partsFor(choice).length <= 16)
          step.expressions.push(...partsFor(choice).map(part => ({ group: part.name, value: null })));
        changed(); drawExpressions(choice.name);
      });
      tile.dataset.choice = choice.name;
      tile.disabled = !selected && step.expressions.length + partsFor(choice).length > 16;
      grid.append(tile);
      if (!selected) continue;
      const parts = partsFor(choice);
      const values = parts.map(part => step.expressions.find(change => change.group === part.name));
      const uniform = values.every(value => value && value.value === values[0]?.value);
      const current = uniform ? values[0]?.value ?? "" : "__saved__";
      const input = select(`Step ${index + 1} ${choice.label}`, choice.values.map(value => [value.value ?? "", value.label]), current);
      input.disabled = step.expressions.filter(change => !groups.includes(change.group)).length + parts.length > 16;
      if (!uniform) input.selectedOptions[0]!.textContent = "Saved expression · choose to replace";
      input.addEventListener("change", () => {
        step.expressions = step.expressions.filter(change => !groups.includes(change.group));
        step.expressions.push(...parts.map(part => ({ group: part.name, value: input.value || null })));
        changed(); drawExpressions();
      });
      const fieldRow = field(choice.label, input);
      settings.append(fieldRow);
    }
    for (const change of step.expressions.filter(change => !caps.expressions.some(choice => partsFor(choice).some(part => part.name === change.group)))) {
      settings.append(button(`${humanize(change.group)} · unavailable · remove`, () => {
        step.expressions = step.expressions.filter(value => value !== change); changed(); drawExpressions();
      }));
    }
    expressionRows.replaceChildren(grid, settings);
    if (!caps.expressions.length) expressionRows.append(help("Expressions are available after BC loads your character and supported face assets."));
    if (focus) [...grid.querySelectorAll<HTMLButtonElement>("button")].find(tile => tile.dataset.choice === focus)?.focus();
    else if (focusedLabel) [...expressionRows.querySelectorAll<HTMLElement>("[aria-label]")].find(input => input.getAttribute("aria-label") === focusedLabel)?.focus();
  };
  drawExpressions();

  const poseRows = element("div", { className: "kl-sequence-options" });
  const poses = section("Body & hands pose", poseRows);
  poses.open = step.poses.length > 0;
  const categories = [...new Set(caps.poses.map(choice => choice.category))];
  const poseTiles = new Map<string, HTMLButtonElement>();
  for (const category of categories) {
    const choices = caps.poses.filter(choice => choice.category === category);
    const grid = tileGrid(humanize(category));
    for (const choice of choices) {
      const tile = choiceTile(choice.label, step.poses.includes(choice.name), () => {
        const selected = step.poses.includes(choice.name);
        step.poses = step.poses.filter(name => {
          const other = caps.poses.find(pose => pose.name === name);
          if (other?.category === category) return false;
          if (!selected && ((category === "BodyFull" && ["BodyUpper", "BodyLower"].includes(other?.category ?? "")) ||
              (["BodyUpper", "BodyLower"].includes(category) && other?.category === "BodyFull"))) return false;
          return true;
        });
        if (!selected) step.poses.push(choice.name);
        for (const [name, button] of poseTiles) button.setAttribute("aria-pressed", String(step.poses.includes(name)));
        changed();
      });
      tile.dataset.pose = choice.name; poseTiles.set(choice.name, tile); grid.append(tile);
    }
    poseRows.append(element("div", { className: "kl-sequence-pose-category" }, element("span", { className: "kl-custom-field-label", text: humanize(category) }), grid));
  }
  for (const missing of step.poses.filter(name => !caps.poses.some(choice => choice.name === name))) {
    poseRows.append(button(`${humanize(missing)} · unavailable · remove`, () => { step.poses = step.poses.filter(name => name !== missing); redraw(); }));
  }
  if (!categories.length) poseRows.append(help("BC has no selectable poses loaded for this character."));

  const clothingRows = tileGrid("Wardrobe slots");
  clothingRows.classList.add("kl-sequence-clothing");
  const mode = select(`Step ${index + 1} clothing action`, [["remove", "Remove"], ["wear", "Wear"], ["transfer", "Transfer"]],
    step.transferClothing?.slots.length ? "transfer" : step.wearClothing?.length ? "wear" : "remove");
  const direction = select(`Step ${index + 1} transfer direction`, [["self-to-target", "Self → Target"], ["target-to-self", "Target → Self"], ["swap", "Swap"]], step.transferClothing?.direction ?? "self-to-target");
  const directionField = field("Direction", direction);
  const clothingNote = help("");
  // A single, wrapping detail line exposes complete names after tap or keyboard focus.
  const detail = element("p", { className: "kl-clothing-selection-detail" });
  detail.hidden = true; detail.setAttribute("role", "status");
  const clothing = section("Clothing", element("div", { className: "kl-sequence-options" },
    field("Action", mode), directionField, clothingNote, clothingRows, detail));
  clothing.open = step.removeClothing.length > 0 || !!step.wearClothing?.length || !!step.transferClothing?.slots.length;
  const selectedSlots = (): string[] => mode.value === "transfer" ? step.transferClothing?.slots ?? [] :
    mode.value === "wear" ? (step.wearClothing ?? []).map(item => item.Group) : step.removeClothing;
  const drawClothing = (): void => {
    clothingRows.replaceChildren();
    const wear = mode.value === "wear", transfer = mode.value === "transfer";
    directionField.hidden = !transfer;
    clothingNote.textContent = transfer ? direction.value === "swap"
      ? "Self ↔ Target · Exchanges current items, including empty slots."
      : "Moves the item worn at execution. BC permissions apply to both characters." :
      wear ? "Select an item worn by your character to save its appearance." : "Select the slots to remove.";
    const selectedNames = selectedSlots();
    for (const choice of caps.clothing) {
      const saved = step.wearClothing?.find(item => item.Group === choice.name);
      const selected = selectedNames.includes(choice.name);
      const secondary = wear && saved ? `Saved: ${humanize(saved.Name)}` : `Currently: ${choice.current ?? "Empty"}`;
      const description = `${choice.label} · Currently: ${choice.current ?? "Empty"}${wear && saved ? ` · Saved: ${humanize(saved.Name)}` : ""}`;
      const tile = choiceTile(choice.label, selected, () => {
        if (transfer) {
          const slots = (step.transferClothing?.slots ?? []).filter(name => name !== choice.name);
          if (!selected && slots.length < 16) slots.push(choice.name);
          step.transferClothing = { direction: direction.value as CustomActivityTransferDirection, slots };
        } else if (wear) {
          step.wearClothing = (step.wearClothing ?? []).filter(item => item.Group !== choice.name);
          if (!selected && choice.template && step.wearClothing.length < 16) step.wearClothing.push(structuredClone(choice.template));
        } else {
          step.removeClothing = step.removeClothing.filter(name => name !== choice.name);
          if (!selected && step.removeClothing.length < 16) step.removeClothing.push(choice.name);
        }
        changed(); drawClothing();
        [...clothingRows.querySelectorAll<HTMLButtonElement>("button")].find(button => button.dataset.slot === choice.name)?.focus();
      });
      tile.setAttribute("aria-label", choice.label);
      tile.title = description;
      tile.replaceChildren(element("strong", { text: choice.label }), element("small", { text: secondary }));
      tile.addEventListener("focus", () => { detail.textContent = description; detail.hidden = false; });
      tile.disabled = !selected && (selectedNames.length >= 16 || (wear && !choice.template));
      if (wear && !selected && !choice.template) tile.title += " · Wear an item, then refresh available options";
      tile.dataset.slot = choice.name; clothingRows.append(tile);
    }
    for (const missing of selectedNames.filter(name => !caps.clothing.some(choice => choice.name === name))) {
      clothingRows.append(button(`${humanize(missing)} · unavailable · remove`, () => {
        step.removeClothing = step.removeClothing.filter(name => name !== missing);
        if (step.wearClothing) step.wearClothing = step.wearClothing.filter(item => item.Group !== missing);
        if (step.transferClothing) step.transferClothing.slots = step.transferClothing.slots.filter(name => name !== missing);
        changed(); drawClothing();
      }));
    }
    if (!caps.clothing.length) clothingRows.append(help("No wardrobe slots loaded."));
  };
  mode.addEventListener("change", () => {
    // A step has one clothing mode. Switching never leaves hidden actions behind.
    if (mode.value !== "remove") step.removeClothing = [];
    if (mode.value !== "wear") delete step.wearClothing;
    if (mode.value !== "transfer") delete step.transferClothing;
    detail.hidden = true; changed(); drawClothing();
  });
  direction.addEventListener("change", () => {
    if (step.transferClothing) step.transferClothing.direction = direction.value as CustomActivityTransferDirection;
    changed(); drawClothing();
  });
  drawClothing();
  const up = button("Move up", () => { [effects.steps[index - 1], effects.steps[index]] = [effects.steps[index]!, effects.steps[index - 1]!]; redraw(); });
  const down = button("Move down", () => { [effects.steps[index], effects.steps[index + 1]] = [effects.steps[index + 1]!, effects.steps[index]!]; redraw(); });
  up.disabled = index === 0; down.disabled = index === effects.steps.length - 1;
  const remove = button("Remove step", () => { effects.steps.splice(index, 1); redraw(); });
  root.append(summary, timing, expressions, poses, clothing, element("div", { className: "kl-sequence-toolbar" }, up, down, remove));
  return root;
}

function tileGrid(label: string): HTMLDivElement {
  const grid = element("div", { className: "kl-activity-choice-grid", ariaLabel: label });
  grid.setAttribute("role", "group"); return grid;
}
function choiceTile(label: string, selected: boolean, click: () => void): HTMLButtonElement {
  const tile = element("button", { className: "kl-activity-choice", type: "button", text: label, onClick: click });
  tile.setAttribute("aria-pressed", String(selected)); return tile;
}
function select(label: string, choices: Array<[string, string]>, value: string): HTMLSelectElement {
  const input = element("select", { className: "kl-select", ariaLabel: label }) as HTMLSelectElement;
  input.append(...choices.map(([name, text]) => option(name, text)));
  preserveUnavailable(input, value);
  return input;
}
function preserveUnavailable(input: HTMLSelectElement, value: string): void {
  if (![...input.options].some(choice => choice.value === value)) {
    const missing = option(value, `${value || "Neutral"} · unavailable`); missing.disabled = true; input.append(missing);
  }
  input.value = value;
}
function option(value: string, label: string): HTMLOptionElement { const option = document.createElement("option"); option.value = value; option.textContent = label; return option; }
function button(text: string, onClick: () => void): HTMLButtonElement { return element("button", { className: "kl-text-button", type: "button", text, onClick }) as HTMLButtonElement; }
function help(text: string): HTMLElement { return element("p", { className: "kl-custom-field-help", text }); }
function field(text: string, input: HTMLElement): HTMLElement { return element("label", { className: "kl-custom-field" }, element("span", { className: "kl-custom-field-label", text }), input); }
function restoreToggle(checked: boolean, change: (checked: boolean) => void): HTMLElement {
  const input = element("input", { ariaLabel: "Restore previous state" }) as HTMLInputElement;
  input.type = "checkbox"; input.checked = checked; input.setAttribute("role", "switch");
  const note = element("small");
  const update = (): void => { note.textContent = input.checked ? "Return to the face and pose from before this activity." : "Keep the final face and pose."; };
  input.addEventListener("change", () => { update(); change(input.checked); }); update();
  return element("label", { className: "kl-sequence-restore" },
    element("span", { className: "kl-sequence-restore-copy" }, element("strong", { text: "Restore previous state" }), note),
    element("span", { className: "kl-switch" }, input, element("span", { className: "kl-switch-track" })));
}
function section(title: string, content: HTMLElement): HTMLDetailsElement { return element("details", { className: "kl-sequence-section" }, element("summary", { text: title }), content) as HTMLDetailsElement; }
function secondsInput(label: string, title: string, initial: number, change: (ms: number) => void): HTMLElement {
  const input = element("input", { className: "kl-custom-arousal-range", ariaLabel: label }) as HTMLInputElement;
  input.type = "range";
  input.min = "0"; input.max = String(MAX_STEP_TIME_MS / 1000); input.step = "0.1";
  input.value = String(Math.max(0, Math.min(MAX_STEP_TIME_MS, initial)) / 1000);
  const value = element("output", { className: "kl-custom-arousal-value" });
  const update = (): void => {
    const seconds = Math.max(0, Math.min(MAX_STEP_TIME_MS / 1000, Number(input.value) || 0));
    value.textContent = `${seconds.toFixed(1).replace(/\.0$/, "")} s`;
    input.setAttribute("aria-valuetext", `${seconds} seconds`); change(Math.round(seconds * 1000));
  };
  input.addEventListener("input", update); input.addEventListener("change", update); update();
  return field(title, element("span", { className: "kl-sequence-slider" }, input, value));
}
