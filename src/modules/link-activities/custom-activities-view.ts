import type { BCAdapter } from "../../bc/adapter";
import type { CustomActivityDefinition, CustomActivityTargetMode } from "../../core/types";
import type { SettingsStore } from "../../core/settings";
import { element } from "../../utils/dom";
import { BLOSSOM_ICON_DATA_URL } from "../link-chat/blossom";
import {
  activityImageUrl,
  expandCustomActivityTemplate,
  LinkActivitiesService,
} from "./link-activities-service";
import {
  createBlankCustomActivity,
  createCustomActivityId,
  MAX_CUSTOM_ACTIVITIES,
} from "./custom-activity-library";

const TEMPLATE_TOKENS = [
  { token: "{me}", label: "Me" },
  { token: "{target}", label: "Target" },
  { token: "{target's}", label: "Target's" },
  { token: "{target's gender}", label: "Their" },
] as const;

export class CustomActivitiesView {
  #editingId: string | undefined;
  #hoveredGroup: string | undefined;

  constructor(
    private readonly root: HTMLElement,
    private readonly adapter: BCAdapter,
    private readonly settings: SettingsStore,
    private readonly service: LinkActivitiesService,
    private readonly onChanged: () => void,
    private readonly showToast: (message: string, kind?: "error") => void,
  ) {}

  open(activityId?: string): void {
    if (activityId) {
      this.#openEditor(activityId);
      return;
    }
    this.#editingId = undefined;
    this.#renderLibrary();
  }

  refresh(): void {
    if (!this.#editingId) this.#renderLibrary();
  }

  #renderLibrary(): void {
    this.#editingId = undefined;
    const activities = this.settings.get().linkActivities.customActivities;
    const create = element("button", {
      className: "kl-text-button kl-text-button--primary kl-custom-activity-create",
      type: "button",
      text: "New activity",
      onClick: () => this.#openEditor(),
    });
    if (activities.length >= MAX_CUSTOM_ACTIVITIES) create.disabled = true;
    const header = this.#header(
      "Custom Activities",
      "Build personal actions that sit beside Bondage Club's vanilla Activities.",
      create,
    );
    const body = element("div", { className: "kl-custom-activities-body" });
    if (activities.length === 0) {
      const blossom = element("img", {
        className: "kl-custom-empty-blossom",
        src: BLOSSOM_ICON_DATA_URL,
        alt: "",
      });
      body.append(
        element(
          "section",
          { className: "kl-custom-activity-empty" },
          blossom,
          element("h2", { text: "Make an activity your own" }),
          element("p", {
            text: "Choose a body slot, reuse a vanilla picture, and write the action in your words.",
          }),
          element("button", {
            className: "kl-text-button kl-text-button--primary",
            type: "button",
            text: "Create first activity",
            onClick: () => this.#openEditor(),
          }),
        ),
      );
    } else {
      const intro = element(
        "div",
        { className: "kl-custom-activity-intro" },
        element("span", {
          text: `${activities.length} custom ${activities.length === 1 ? "activity" : "activities"}`,
        }),
        element("span", { text: "Blossom marks them in the native menu" }),
      );
      const list = element("div", { className: "kl-custom-activity-list" });
      for (const activity of activities) list.append(this.#activityCard(activity));
      body.append(intro, list);
    }
    this.root.replaceChildren(header, body);
  }

  #activityCard(activity: CustomActivityDefinition): HTMLElement {
    const iconWrap = element(
      "div",
      { className: "kl-custom-activity-card-icon" },
      element("img", {
        className: "kl-custom-activity-vanilla-icon",
        src: activityImageUrl(activity.image),
        alt: "",
      }),
      element("img", {
        className: "kl-custom-activity-blossom",
        src: BLOSSOM_ICON_DATA_URL,
        alt: "KikiLink",
      }),
    );
    const arousal = activity.arousal > 0 ? ` · Arousal +${activity.arousal}` : "";
    const card = element(
      "button",
      {
        className: "kl-custom-activity-card",
        type: "button",
        ariaLabel: `Edit ${activity.name}`,
        onClick: () => this.#openEditor(activity.id),
      },
      iconWrap,
      element(
        "div",
        { className: "kl-custom-activity-card-copy" },
        element("div", { className: "kl-custom-activity-card-name", text: activity.name }),
        element("div", {
          className: "kl-custom-activity-card-meta",
          text: `${this.#slotLabel(activity.targetGroup)}${arousal}`,
        }),
        element("div", {
          className: "kl-custom-activity-card-template",
          text: activity.template,
        }),
      ),
      element("span", { className: "kl-custom-activity-edit-label", text: "Edit" }),
    );
    card.dataset.activityId = activity.id;
    return card;
  }

  #openEditor(activityId?: string): void {
    const existing = activityId
      ? this.settings
          .get()
          .linkActivities.customActivities.find((activity) => activity.id === activityId)
      : undefined;
    if (activityId && !existing) {
      this.#renderLibrary();
      return;
    }
    if (!existing && this.settings.get().linkActivities.customActivities.length >= MAX_CUSTOM_ACTIVITIES) {
      this.showToast(`You can keep up to ${MAX_CUSTOM_ACTIVITIES} custom activities.`, "error");
      return;
    }
    const draft = structuredClone(existing ?? createBlankCustomActivity(createCustomActivityId()));
    this.#editingId = draft.id;
    this.#hoveredGroup = undefined;
    const back = element("button", {
      className: "kl-text-button kl-custom-activity-back",
      type: "button",
      text: "Back",
      onClick: () => this.#renderLibrary(),
    });
    const header = this.#header(
      existing ? "Edit activity" : "New custom activity",
      "Pick where it appears, then give it a clear name and action.",
      back,
    );
    const editor = this.#buildEditor(draft, existing !== undefined);
    this.root.replaceChildren(header, editor);
    requestAnimationFrame(() => {
      editor.querySelector<HTMLInputElement>('[data-field="name"]')?.focus();
      this.#redrawCharacter(editor, draft.targetGroup);
    });
  }

  #buildEditor(draft: CustomActivityDefinition, isExisting: boolean): HTMLElement {
    const slots = this.service.getBodySlots();
    if (!slots.some((slot) => slot.name === draft.targetGroup) && slots[0]) {
      draft.targetGroup = slots[0].name;
    }

    const canvas = element("canvas", {
      className: "kl-custom-character-canvas",
      ariaLabel: "Your character body slots",
      tabIndex: 0,
    }) as HTMLCanvasElement;
    const canvasFallback = element("div", {
      className: "kl-custom-character-fallback",
      text: "Your character appears here in Bondage Club.",
    });
    const slotSelect = element("select", {
      className: "kl-select kl-custom-slot-select",
      ariaLabel: "Body slot",
    }) as HTMLSelectElement;
    for (const slot of slots) {
      const option = document.createElement("option");
      option.value = slot.name;
      option.textContent = slot.label;
      slotSelect.append(option);
    }
    slotSelect.value = draft.targetGroup;

    const name = element("input", {
      className: "kl-search kl-custom-activity-name",
      ariaLabel: "Activity name",
    }) as HTMLInputElement;
    name.dataset.field = "name";
    name.placeholder = "e.g. Gentle elbow touch";
    name.maxLength = 40;
    name.value = draft.name;
    const template = element("textarea", {
      className: "kl-custom-activity-template",
      ariaLabel: "Activity text",
    }) as HTMLTextAreaElement;
    template.placeholder = "{me} touches {target's} arm and {target's gender} elbow.";
    template.maxLength = 500;
    template.value = draft.template;
    const tokenRow = element("div", {
      className: "kl-custom-token-row",
      ariaLabel: "Insert a variable",
    });
    for (const item of TEMPLATE_TOKENS) {
      tokenRow.append(
        element("button", {
          className: "kl-custom-token",
          type: "button",
          text: item.label,
          title: item.token,
          onClick: () => {
            template.setRangeText(
              item.token,
              template.selectionStart,
              template.selectionEnd,
              "end",
            );
            template.focus();
            updatePreview();
          },
        }),
      );
    }
    const preview = element("div", { className: "kl-custom-activity-live-preview" });
    const updatePreview = (): void => {
      preview.textContent =
        expandCustomActivityTemplate(template.value, {
          sourceName: this.adapter.getOwnName(),
          targetName: "Alex",
        }) || "Your activity preview appears here.";
    };
    template.addEventListener("input", updatePreview);
    updatePreview();

    const imageSearch = element("input", {
      className: "kl-search kl-custom-image-search",
      ariaLabel: "Search vanilla activity pictures",
    }) as HTMLInputElement;
    imageSearch.type = "search";
    imageSearch.placeholder = "Search vanilla pictures";
    const imageGallery = element("div", {
      className: "kl-custom-image-gallery",
      ariaLabel: "Vanilla activity pictures",
    });
    const renderImages = (): void => {
      const query = imageSearch.value.trim().toLocaleLowerCase();
      imageGallery.replaceChildren();
      const images = this.service
        .getVanillaImages()
        .filter((image) => !query || image.toLocaleLowerCase().includes(query));
      for (const image of images) {
        const button = element(
          "button",
          {
            className: "kl-custom-image-choice",
            type: "button",
            title: image,
            ariaLabel: `Use ${image} picture`,
            onClick: () => {
              draft.image = image;
              renderImages();
            },
          },
          element("img", { src: activityImageUrl(image), alt: "" }),
          element("span", { text: humanizeActivityName(image) }),
        );
        button.dataset.selected = String(image === draft.image);
        button.setAttribute("aria-pressed", String(image === draft.image));
        imageGallery.append(button);
      }
      if (images.length === 0) {
        imageGallery.append(
          element("div", { className: "kl-contact-empty", text: "No vanilla pictures match." }),
        );
      }
    };
    imageSearch.addEventListener("input", renderImages);
    renderImages();

    const arousalToggle = element("input") as HTMLInputElement;
    arousalToggle.type = "checkbox";
    arousalToggle.checked = draft.arousal > 0;
    arousalToggle.setAttribute("aria-label", "Trigger arousal");
    const arousalRange = element("input", {
      className: "kl-custom-arousal-range",
      ariaLabel: "Arousal amount",
    }) as HTMLInputElement;
    arousalRange.type = "range";
    arousalRange.min = "1";
    arousalRange.max = "20";
    arousalRange.step = "1";
    arousalRange.value = String(Math.max(1, draft.arousal || 5));
    const arousalValue = element("output", {
      className: "kl-custom-arousal-value",
      text: `+${arousalRange.value}`,
    });
    const arousalOptions = element(
      "div",
      { className: "kl-custom-arousal-options" },
      arousalRange,
      arousalValue,
    );
    arousalOptions.hidden = !arousalToggle.checked;
    arousalToggle.addEventListener("change", () => {
      arousalOptions.hidden = !arousalToggle.checked;
    });
    arousalRange.addEventListener("input", () => {
      arousalValue.textContent = `+${arousalRange.value}`;
    });
    const arousalSwitch = element(
      "label",
      { className: "kl-switch" },
      arousalToggle,
      element("span", { className: "kl-switch-track" }),
    );

    const targetMode = element("select", {
      className: "kl-select kl-custom-target-mode",
      ariaLabel: "Who can be targeted",
    }) as HTMLSelectElement;
    targetMode.append(
      selectOption("other", "Other characters"),
      selectOption("self", "My character"),
      selectOption("both", "Others and myself"),
    );
    targetMode.value = draft.targetMode;
    const advanced = element(
      "details",
      { className: "kl-custom-activity-advanced" },
      element("summary", { text: "Advanced" }),
      this.#field("Who can be targeted", "Choose whether this action can appear on others, yourself, or both.", targetMode),
    );

    const form = element(
      "section",
      { className: "kl-custom-activity-form" },
      this.#field("Activity name", "Short and recognizable in the native menu.", name),
      this.#field(
        "Action text",
        "Tap a variable to insert it. Everyone in the room sees only the finished sentence.",
        template,
        tokenRow,
      ),
      element(
        "div",
        { className: "kl-custom-preview-wrap" },
        element("div", { className: "kl-custom-field-label", text: "Preview" }),
        preview,
      ),
      this.#field(
        "Vanilla picture",
        "This is the picture shown beside normal Bondage Club activities.",
        imageSearch,
        imageGallery,
      ),
      element(
        "div",
        { className: "kl-custom-arousal-row" },
        element(
          "div",
          { className: "kl-custom-arousal-copy" },
          element("div", { className: "kl-custom-field-label", text: "Trigger arousal" }),
          element("div", {
            className: "kl-custom-field-help",
            text: "Off by default. Bondage Club applies this base amount using the recipient's preferences.",
          }),
        ),
        arousalSwitch,
        arousalOptions,
      ),
      advanced,
    );

    const characterPane = element(
      "aside",
      { className: "kl-custom-character-pane" },
      element("div", { className: "kl-custom-field-label", text: "Body slot" }),
      element("div", {
        className: "kl-custom-field-help",
        text: "Tap your character or choose a slot below.",
      }),
      element("div", { className: "kl-custom-character-stage" }, canvas, canvasFallback),
      slotSelect,
      element("div", {
        className: "kl-custom-slot-note",
        text: "The activity will appear next to vanilla actions on this slot.",
      }),
    );
    const redraw = (): void => {
      const drawn = this.service.drawPlayer(canvas, slotSelect.value, this.#hoveredGroup);
      canvasFallback.hidden = drawn;
    };
    slotSelect.addEventListener("change", redraw);
    canvas.addEventListener("pointermove", (event) => {
      const point = canvasPoint(canvas, event);
      this.#hoveredGroup = this.service.bodySlotAt(point.x, point.y)?.name;
      redraw();
    });
    canvas.addEventListener("pointerleave", () => {
      this.#hoveredGroup = undefined;
      redraw();
    });
    canvas.addEventListener("click", (event) => {
      const point = canvasPoint(canvas, event);
      const slot = this.service.bodySlotAt(point.x, point.y);
      if (!slot) return;
      slotSelect.value = slot.name;
      redraw();
    });

    const save = element("button", {
      className: "kl-text-button kl-text-button--primary",
      type: "button",
      text: "Save activity",
      onClick: () => {
        const activityName = name.value.trim();
        const activityTemplate = template.value.trim();
        if (!activityName || !activityTemplate || !slotSelect.value) {
          this.showToast("Add a name, action text, and body slot before saving.", "error");
          return;
        }
        const saved: CustomActivityDefinition = {
          id: draft.id,
          name: activityName,
          targetGroup: slotSelect.value,
          targetMode: targetMode.value as CustomActivityTargetMode,
          template: activityTemplate,
          image: draft.image,
          arousal: arousalToggle.checked ? Number(arousalRange.value) : 0,
        };
        this.settings.update((settingsDraft) => {
          const index = settingsDraft.linkActivities.customActivities.findIndex(
            (activity) => activity.id === saved.id,
          );
          if (index >= 0) settingsDraft.linkActivities.customActivities[index] = saved;
          else settingsDraft.linkActivities.customActivities.push(saved);
        });
        this.service.syncFromSettings();
        this.onChanged();
        this.showToast(isExisting ? `${saved.name} updated.` : `${saved.name} added beside vanilla activities.`);
        this.#renderLibrary();
      },
    });
    const cancel = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Cancel",
      onClick: () => this.#renderLibrary(),
    });
    const footerChildren: Node[] = [];
    if (isExisting) {
      footerChildren.push(
        element("button", {
          className: "kl-text-button kl-text-button--danger kl-custom-activity-delete",
          type: "button",
          text: "Delete",
          onClick: () => {
            if (!window.confirm(`Delete ${draft.name}?`)) return;
            this.settings.update((settingsDraft) => {
              settingsDraft.linkActivities.customActivities =
                settingsDraft.linkActivities.customActivities.filter(
                  (activity) => activity.id !== draft.id,
                );
            });
            this.service.syncFromSettings();
            this.onChanged();
            this.showToast(`${draft.name} deleted.`);
            this.#renderLibrary();
          },
        }),
      );
    }
    footerChildren.push(element("span", { className: "kl-custom-editor-spacer" }), cancel, save);
    const footer = element(
      "footer",
      { className: "kl-feature-page-footer kl-custom-activity-footer" },
      ...footerChildren,
    );
    return element(
      "div",
      { className: "kl-custom-activity-editor" },
      element("div", { className: "kl-custom-editor-body" }, characterPane, form),
      footer,
    );
  }

  #redrawCharacter(editor: HTMLElement, selectedGroup: string): void {
    const canvas = editor.querySelector<HTMLCanvasElement>(".kl-custom-character-canvas");
    const fallback = editor.querySelector<HTMLElement>(".kl-custom-character-fallback");
    if (!canvas) return;
    const drawn = this.service.drawPlayer(canvas, selectedGroup);
    if (fallback) fallback.hidden = drawn;
  }

  #header(title: string, subtitle: string, action: HTMLElement): HTMLElement {
    return element(
      "header",
      { className: "kl-feature-page-header kl-custom-activity-header" },
      element(
        "div",
        { className: "kl-feature-page-heading" },
        element("div", { className: "kl-feature-page-eyebrow", text: "BLOSSOM STUDIO" }),
        element("h1", { className: "kl-feature-page-title", text: title }),
        element("p", { className: "kl-feature-page-subtitle", text: subtitle }),
      ),
      action,
    );
  }

  #field(name: string, help: string, control: Node, extra?: Node): HTMLElement {
    return element(
      "div",
      { className: "kl-custom-field" },
      element("span", { className: "kl-custom-field-label", text: name }),
      element("span", { className: "kl-custom-field-help", text: help }),
      control,
      extra,
    );
  }

  #slotLabel(groupName: string): string {
    return (
      this.service.getBodySlots().find((slot) => slot.name === groupName)?.label ??
      groupName.replace(/^Item/, "")
    );
  }
}

function canvasPoint(
  canvas: HTMLCanvasElement,
  event: Pick<PointerEvent | MouseEvent, "clientX" | "clientY">,
): { x: number; y: number } {
  const bounds = canvas.getBoundingClientRect();
  const width = bounds.width || canvas.width || 250;
  const height = bounds.height || canvas.height || 500;
  return {
    x: ((event.clientX - bounds.left) / width) * canvas.width,
    y: ((event.clientY - bounds.top) / height) * canvas.height,
  };
}

function selectOption(value: string, label: string): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function humanizeActivityName(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}
