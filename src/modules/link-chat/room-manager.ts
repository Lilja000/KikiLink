import { createClubBackgroundPicker } from "./club-background-picker";
import type { BCRoomAdminSnapshot } from "../../bc/adapter";
import { roomOptions, type RoomChoice, type RoomRoleChoice } from "../../bc/room-options";
import type { RoomPresetData } from "../../core/types";
import { element } from "../../utils/dom";
import { kikiIcon } from "./icons";

/** A room settings draft stays stable during presence updates and native refreshes. */
export class RoomManager {
  readonly root = element("section", { className: "kl-room-manager" });
  #room: RoomPresetData | undefined;
  #snapshot: BCRoomAdminSnapshot | undefined;
  #dirty = false;
  #busy = false;
  #status = element("p", { className: "kl-room-manager-status" });
  #generation = 0;
  #authorize: (() => Promise<void>) | undefined;
  constructor(private readonly apply: (room: RoomPresetData, authorize?: () => Promise<void>) => Promise<void>, private readonly ownNumber: () => number) {
    this.#status.setAttribute("role", "status");
  }
  update(snapshot: BCRoomAdminSnapshot | undefined, force = false): void {
    const changedRoom = this.#snapshot?.roomName !== snapshot?.roomName || this.#snapshot?.settings?.space !== snapshot?.settings?.space;
    const changedPermission = this.#snapshot?.isAdmin !== snapshot?.isAdmin;
    this.#snapshot = snapshot;
    if (!snapshot) { this.#authorize=undefined; this.#generation++; this.#busy = false; this.#dirty = false; this.#room = undefined; this.root.replaceChildren(); return; }
    if (changedRoom) { this.#authorize=undefined; this.#generation++; this.#busy = false; this.#status.textContent = ""; }
    if (changedRoom || !this.#room || (force && !this.#dirty && !this.#busy)) {
      this.#room = structuredClone(snapshot.settings); this.#dirty = false; this.#draw();
    } else if (changedPermission) this.#draw();
  }
  get hasDraft(): boolean { return this.#dirty || this.#busy; }
  loadPrepared(room: RoomPresetData, label: string, authorize: () => Promise<void>): void {
    if(this.hasDraft)throw new Error("Finish or reset your existing room settings draft first.");
    this.load(room,label);this.#authorize=authorize;
  }
  load(room: RoomPresetData, label: string): void {
    this.#authorize=undefined;
    this.#generation++; this.#busy = false;
    this.#room = structuredClone(room);
    // Legacy presets did not save maps. Keep the current map instead of clearing it.
    if (!this.#room.mapData && this.#snapshot?.settings.mapData)
      this.#room.mapData = structuredClone(this.#snapshot.settings.mapData);
    this.#dirty = true; this.#draw();
    this.#status.textContent = `Loaded “${label}”. Apply to update this room.`;
    this.root.querySelector<HTMLInputElement>("input")?.focus();
  }
  destroy(): void { this.#generation++; }
  #draw(): void {
    const room = this.#room, snapshot = this.#snapshot;
    if (!room || !snapshot) return;
    const options = roomOptions();
    const changed = (): void => { this.#dirty = true; this.#status.textContent = "Unsaved changes"; };
    const input = (label: string, value: string, max: number, write: (value: string) => void, multiline = false): HTMLElement => {
      const control = multiline ? element("textarea", { className: "kl-input", ariaLabel: label }) : element("input", { className: "kl-input", ariaLabel: label });
      control.value = value; control.maxLength = max;
      control.addEventListener("input", () => { write(control.value); changed(); });
      return field(label, control);
    };
    const selectField = (label: string, choices: RoomChoice[], value: string, write: (value: string) => void): HTMLElement => {
      const select = makeSelect(label, choices, value);
      select.addEventListener("change", () => { write(select.value); changed(); }); return field(label, select);
    };
    const size = element("input", { ariaLabel: "Room size", className: "kl-custom-arousal-range" });
    size.type = "range"; size.min = "2"; size.max = "50"; size.step = "1"; size.value = String(room.limit);
    const sizeValue = element("output", { text: `${room.limit} people` });
    size.addEventListener("input", () => { room.limit = Number(size.value); sizeValue.textContent = `${room.limit} people`; changed(); });
    const basics = element("div", { className: "kl-room-form-grid" },
      input("Room name", room.name, 80, value => { room.name = value; }),
      selectField("Language", options.languages, room.language || "EN", value => { room.language = value; }),
      selectField("Game", options.games, room.game, value => { room.game = value; }),
      selectField("Room type", options.types, room.mapData?.Type ?? "Never", value => { room.mapData = { ...(room.mapData ?? {}), Type: value as "Never" | "Always" | "Hybrid" }; }),
      field("Size", element("div", { className: "kl-room-size-control" }, size, sizeValue)),
      selectField("Room space", [{ value: "", label: "Female" }, { value: "X", label: "Mixed" }, { value: "M", label: "Male" }], room.space, value => { room.space = value; }));
    const access = roleSelect("Access", options.access, room.access, value => { room.access = value; changed(); });
    const visibility = roleSelect("Visibility", options.visibility, room.visibility, value => { room.visibility = value; changed(); });
    const locked = element("input", { ariaLabel: "Room locked" }); locked.type = "checkbox";
    locked.checked = !room.access.includes("All"); locked.setAttribute("role", "switch");
    let previousAccess = [...room.access];
    locked.addEventListener("change", () => {
      if (!locked.checked) { previousAccess = [...room.access]; room.access = ["All"]; }
      else room.access = previousAccess.length && !previousAccess.includes("All") ? [...previousAccess] : ["Admin"];
      access.value = JSON.stringify([...room.access].sort()); changed();
    });
    access.addEventListener("change", () => { locked.checked = !room.access.includes("All"); });
    const blocks = element("div", { className: "kl-activity-choice-grid", ariaLabel: "Blocked categories" });
    for (const value of [...new Set([...options.blocks, ...room.blockCategory])]) {
      const button = tile(value === "SciFi" ? "Sci-fi" : value, room.blockCategory.includes(value), () => {
        room.blockCategory = room.blockCategory.includes(value) ? room.blockCategory.filter(name => name !== value) : [...room.blockCategory, value];
        button.setAttribute("aria-pressed", String(room.blockCategory.includes(value))); changed();
      }); blocks.append(button);
    }
    const lists = element("div", { className: "kl-room-members-editors" });
    for (const [key, label, max] of [["whitelist", "Whitelist", 100], ["blacklist", "Blacklist", 100], ["admins", "Administrators", 20]] as const)
      lists.append(this.#members(label, room[key], max, values => { room[key] = values; changed(); }, key === "admins"));
    const submit = element("button", { className: "kl-text-button kl-text-button--primary", type: "button", text: this.#busy ? "Applying…" : "Apply room settings" });
    submit.addEventListener("click", () => { void this.#submit(); });
    const reset = element("button", { className: "kl-text-button", type: "button", text: "Reset changes", onClick: () => {
      if (!this.#snapshot) return;
      this.#authorize=undefined; this.#room = structuredClone(this.#snapshot.settings); this.#dirty = false; this.#status.textContent = ""; this.#draw();
    } });
    const form = element("fieldset", { className: "kl-room-manager-fields" },
      basics, element("p", { className: "kl-setting-help", text: "Saved plans support 2–50 places. Applying uses the loaded BC client’s limit and current room occupancy." }), input("Description", room.description, 300, value => { room.description = value; }, true),
      disclosure("Access & visibility", element("div", { className: "kl-sequence-options" },
        element("div", { className: "kl-room-form-grid" }, field("Access", access), field("Visibility", visibility)),
        element("label", { className: "kl-sequence-restore" }, element("span", { text: "Locked" }),
          element("span", { className: "kl-switch" }, locked, element("span", { className: "kl-switch-track" })))), true),
      disclosure("Background", createClubBackgroundPicker(options.backgrounds, room.background, name => {
        room.background = name;
        room.custom.imageUrl = "";
        room.custom.imageFilter = "";
        changed();
      }).element, true),
      disclosure("Block categories", blocks, room.blockCategory.length > 0),
      disclosure("People & permissions", lists, true),
      element("div", { className: "kl-inline-actions" }, submit, reset));
    form.disabled = !snapshot.isAdmin || this.#busy;
    this.root.replaceChildren(element("h2", { text: "Room settings" }), form, this.#status);
  }
  #members(label: string, initial: number[], max: number, write: (values: number[]) => void, admins: boolean): HTMLElement {
    let values = [...initial];
    const input = element("input", { className: "kl-input", ariaLabel: `${label} member number` });
    input.inputMode = "numeric"; input.placeholder = "Member number";
    const hint = element("span", { className: "kl-room-media-note" }); hint.setAttribute("role", "status");
    const chips = element("div", { className: "kl-room-member-chips" });
    const names = new Map(this.#snapshot?.players.map(person => [person.memberNumber, person.memberName]));
    const draw = (): void => {
      chips.replaceChildren(...values.map(member => {
        const remove = element("button", { className: "kl-room-member-chip", type: "button", ariaLabel: `Remove ${member} from ${label}`, onClick: () => {
          values = values.filter(value => value !== member); write([...values]); draw();
        } }, element("span", { text: `${names.get(member) ?? "Member"} #${member}` }), kikiIcon("close"));
        if (admins && member === this.ownNumber()) { remove.disabled = true; remove.title = "Keep yourself as administrator"; }
        return remove;
      }));
      if (!values.length) chips.append(element("small", { className: "kl-room-media-note", text: "No members added" }));
    };
    const add = (): void => {
      const tokens = input.value.trim().split(/[\s,;]+/u);
      if (!tokens.length || tokens.some(token => !/^\d{1,10}$/u.test(token) || !Number.isSafeInteger(Number(token)) || Number(token) <= 0)) { hint.textContent = "Enter a valid member number."; return; }
      const next = [...new Set([...values, ...tokens.map(Number)])];
      if (next.length > max) { hint.textContent = `Up to ${max} members.`; return; }
      values = next; write([...values]); input.value = ""; hint.textContent = ""; draw();
    };
    input.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); add(); } });
    const present = makeSelect(`Add present member to ${label}`, [{ value: "", label: "Choose someone in the room…" },
      ...(this.#snapshot?.players ?? []).map(person => ({ value: String(person.memberNumber), label: `${person.memberName} #${person.memberNumber}` }))], "");
    present.addEventListener("change", () => { if (!present.value) return; input.value = present.value; add(); present.value = ""; });
    draw();
    return element("section", { className: "kl-room-member-editor" }, element("h3", { text: label }), present,
      element("div", { className: "kl-room-member-add" }, input, element("button", { className: "kl-text-button", type: "button", text: "Add", onClick: add })), chips, hint);
  }
  async #submit(): Promise<void> {
    if (!this.#room || !this.#snapshot?.isAdmin || this.#busy) return;
    const generation = ++this.#generation;
    this.#busy = true; this.#draw(); this.#status.textContent = "Waiting for Bondage Club…";
    try {
      await this.apply(structuredClone(this.#room), this.#authorize);
      if (generation !== this.#generation) return;
      this.#authorize=undefined; this.#dirty = false; this.#status.textContent = "Room settings applied.";
    } catch (error) {
      if (generation !== this.#generation) return;
      this.#status.textContent = error instanceof Error ? error.message : "Room settings could not be applied.";
    } finally { if (generation === this.#generation) { this.#busy = false; this.#draw(); } }
  }
}

function field(label: string, control: HTMLElement): HTMLElement { return element("label", { className: "kl-room-field" }, element("span", { text: label }), control); }
function disclosure(label: string, content: HTMLElement, open = false): HTMLDetailsElement {
  const root = element("details", { className: "kl-room-settings-disclosure" }, element("summary", { text: label }), content); root.open = open; return root;
}
function tile(label: string, selected: boolean, click: () => void): HTMLButtonElement {
  const button = element("button", { className: "kl-activity-choice", type: "button", text: label, onClick: click });
  button.setAttribute("aria-pressed", String(selected)); return button;
}
function makeSelect(label: string, options: RoomChoice[], value: string): HTMLSelectElement {
  const input = element("select", { className: "kl-select", ariaLabel: label });
  for (const item of options) { const option = element("option", { text: item.label }); option.value = item.value; input.append(option); }
  if (!options.some(item => item.value === value)) { const option = element("option", { text: value || "Current" }); option.value = value; input.append(option); }
  input.value = value; return input;
}
function roleSelect(label: string, choices: RoomRoleChoice[], value: string[], changed: (value: string[]) => void): HTMLSelectElement {
  const input = makeSelect(label, choices.map(choice => ({ value: JSON.stringify([...choice.value].sort()), label: choice.label })), JSON.stringify([...value].sort()));
  input.addEventListener("change", () => changed(JSON.parse(input.value) as string[])); return input;
}
