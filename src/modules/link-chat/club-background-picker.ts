import type { RoomBackground } from "../../bc/room-options";
import { element } from "../../utils/dom";
import { pageAction } from "../platform-shell/page-action";

/** The Club's built-in backgrounds, browsed by name or category. */
export function createClubBackgroundPicker(
  choices: readonly RoomBackground[],
  value: string,
  onSelect: (name: string) => void,
): { element: HTMLElement; setValue(name: string): void } {
  const all = [...choices];
  if (value && !all.some(item => item.name === value)) all.unshift({ name: value, label: value, tags: [] });
  const selected = element("strong");
  const search = element("input", { className: "kl-input", ariaLabel: "Find background" });
  search.placeholder = "Find background…";
  // The same picker is also used inside the Matches setup form.
  search.addEventListener("keydown", event => { if (event.key === "Enter") event.preventDefault(); });
  const category = element("select", { className: "kl-select", ariaLabel: "Background category" });
  const any = element("option", { text: "All categories" });
  any.value = "";
  category.append(any);
  for (const tag of [...new Set(all.flatMap(item => item.tags))].sort()) {
    const option = element("option", { text: tag });
    option.value = tag;
    category.append(option);
  }
  const grid = element("div", { className: "kl-room-background-grid" });
  const count = element("span", { className: "kl-room-media-note" });
  count.setAttribute("role", "status");
  const pageSize = 12;
  let page = 0;
  const previous = pageAction(element("button", { className: "kl-text-button", type: "button", text: "Previous", onClick: () => { page--; draw(); } }), "previous");
  const next = pageAction(element("button", { className: "kl-text-button", type: "button", text: "Next", onClick: () => { page++; draw(); } }), "next");

  function setValue(name: string): void {
    value = name;
    selected.textContent = all.find(item => item.name === value)?.label || value || "No background selected";
    for (const button of grid.querySelectorAll("button")) {
      button.setAttribute("aria-pressed", String(button.dataset.background === value));
    }
  }

  function draw(): void {
    const query = search.value.trim().toLocaleLowerCase();
    const matches = all.filter(item => (!category.value || item.tags.includes(category.value)) &&
      `${item.label} ${item.name}`.toLocaleLowerCase().includes(query));
    const pages = Math.ceil(matches.length / pageSize);
    page = Math.max(0, Math.min(page, pages - 1));
    grid.replaceChildren(...matches.slice(page * pageSize, (page + 1) * pageSize).map(item => {
      const image = element("img", { alt: "" });
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("error", () => { image.hidden = true; });
      image.src = `Backgrounds/${encodeURIComponent(item.name)}.jpg`;
      const button = element("button", {
        className: "kl-activity-choice kl-room-background-choice", type: "button", text: item.label,
        onClick: () => { setValue(item.name); onSelect(item.name); },
      });
      button.dataset.background = item.name;
      button.setAttribute("aria-pressed", String(item.name === value));
      button.prepend(image);
      return button;
    }));
    count.textContent = matches.length ? `${page + 1} / ${pages} · ${matches.length} backgrounds` : "No matching backgrounds";
    previous.disabled = page === 0;
    next.disabled = page + 1 >= pages;
  }

  function filter(): void { page = 0; draw(); }
  search.addEventListener("input", filter);
  category.addEventListener("change", filter);
  draw();
  setValue(value);
  return {
    element: element("div", { className: "kl-club-background-picker kl-sequence-options" }, selected,
      element("div", { className: "kl-room-form-grid" }, search, category), grid,
      element("div", { className: "kl-inline-actions" }, previous, count, next)),
    setValue,
  };
}
