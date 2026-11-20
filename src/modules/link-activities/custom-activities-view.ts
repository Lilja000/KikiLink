import type { BCAdapter } from "../../bc/adapter";
import type { CustomActivityDefinition, CustomActivityTargetMode } from "../../core/types";
import type { KeyValueStorage, SettingsStore } from "../../core/settings";
import { element } from "../../utils/dom";
import { kikiIcon } from "../link-chat/icons";
import { ContentDialog } from "../link-chat/content-dialog";
import { ActivityEditorDialog } from "../platform-shell/activity-dialog";
import { ShellActionMenu } from "../platform-shell/action-menu";
import { fitPanelDialog } from "../platform-shell/panel-dialog-layout";
import { activityExport, MAX_ACTIVITY_IMPORT_BYTES, mergeActivityImport, readActivityImport } from "./activity-transfer";
import { BLOSSOM_ICON_DATA_URL } from "../link-chat/blossom";
import { activityEffectsEditor } from "./activity-effects-editor";
import { MAX_SEQUENCE_TIME_MS, sanitizeActivityEffects } from "./activity-effects-definition";
import {
  activityImageUrl,
  canonicalVanillaActivityImage,
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
const ACTIVITY_SCOPES = [["all", "All"], ["mine", "My activities"], ["workshop", "Workshop"]] as const;
const ACTIVITY_EDITOR_PICTURES = ["Nod", "BrothersHandshake", "Cuddle", "Caress", "MassageHands"] as const;
type ActivityScope = typeof ACTIVITY_SCOPES[number][0];

// Workshop copies already have stable IDs. Use them without adding persisted fields.
const fromWorkshop = (activity: CustomActivityDefinition): boolean => /^wk-[0-9a-f]{32}-\d+$/.test(activity.id);

export class CustomActivitiesView {
  #editingId: string | undefined;
  #hoveredGroup: string | undefined;
  #editorDialog: ActivityEditorDialog | undefined;
  #readDraft: (() => string) | undefined;
  #draftBaseline = "";
  #draftExisting = false;
  #libraryBuilt = false;
  #librarySignature = "";
  #workshopTitles: Promise<ReadonlyMap<string, string>> | undefined;
  #scope: ActivityScope = "all";
  #importGeneration = 0;
  #destroyed = false;
  readonly #details = new ContentDialog();
  readonly #libraryMenu = new ShellActionMenu();
  readonly #query = element("input", { className: "kl-search kl-activity-search", ariaLabel: "Search activities" });
  readonly #results = element("div", { className: "kl-custom-activity-list" });
  readonly #count = element("span", { className: "kl-activity-count" });
  readonly #scopes = element("div", { className: "kl-activity-library-scopes", ariaLabel: "Activity source" });
  readonly #status = element("div", { className: "kl-activity-status" });
  readonly #resume = element("button", { className: "kl-text-button kl-activity-resume", type: "button", text: "Resume editing" });
  readonly #stop = element("button", { className: "kl-text-button kl-sequence-stop", type: "button", text: "Stop active sequence" });
  readonly #downloadUrls = new Set<string>();

  constructor(
    private readonly root: HTMLElement,
    private readonly adapter: BCAdapter,
    private readonly settings: SettingsStore,
    private readonly service: LinkActivitiesService,
    private readonly onChanged: () => void,
    private readonly showToast: (message: string, kind?: "error") => void,
    private readonly platform?: { storage?: KeyValueStorage | undefined; openWorkshop: () => void; workshopTitles?: () => Promise<ReadonlyMap<string, string>> | undefined },
  ) {
    if (platform) {
      this.#query.type = "search"; this.#query.placeholder = "Search activities"; this.#query.maxLength = 120;
      this.#query.autocomplete = "off";
      try {
        this.#query.value = platform.storage?.getItem("kikilink:platform:activities-query:v1")?.slice(0, 120) ?? "";
        const savedScope = platform.storage?.getItem("kikilink:platform:activities-scope:v1");
        if (savedScope === "mine" || savedScope === "workshop") this.#scope = savedScope;
      } catch { /* Session search remains available. */ }
      this.#query.addEventListener("input", () => this.#changeLibraryFilter(this.#scope));
      this.#libraryMenu.element.id = "kl-activity-library-menu";
      this.#libraryMenu.element.classList.add("kl-activity-options-menu");
      this.#details.element.classList.add("kl-activity-details-dialog");
      this.#details.element.addEventListener("keydown", event => event.stopPropagation());
      this.#scopes.setAttribute("role", "group");
      for (const [scope, label] of ACTIVITY_SCOPES) {
        const button = element("button", { className: "kl-text-button", type: "button", text: label,
          onClick: () => this.#changeLibraryFilter(scope) });
        button.dataset.scope = scope; this.#scopes.append(button);
      }
      this.#resume.addEventListener("click", () => this.#editorDialog?.show());
      this.#stop.addEventListener("click", () => { this.service.stopSequence(); this.#renderLibrary(); this.showToast("Sequence stopped. Unchanged temporary states restored."); });
      this.#status.setAttribute("role", "status"); this.#status.hidden = true;
    }
  }

  open(activityId?: string): void {
    if (this.#destroyed) return;
    if (activityId) {
      this.#openEditor(activityId);
      return;
    }
    if (!this.platform) this.#editingId = undefined;
    this.#renderLibrary();
  }

  refresh(): void {
    if (!this.#destroyed && (this.platform || !this.#editingId)) this.#renderLibrary();
  }

  suspend(): void {
    if (this.#workshopTitles) { this.#workshopTitles = undefined; this.#librarySignature = ""; }
    this.#importGeneration++; this.#libraryMenu.close(false); this.#editorDialog?.close(); this.#details.close();
  }
  destroy(): void {
    this.#destroyed = true; this.#importGeneration++; this.#editorDialog?.destroy(); this.#details.close(); this.#details.destroy(); this.#libraryMenu.destroy();
    for (const url of this.#downloadUrls) URL.revokeObjectURL(url); this.#downloadUrls.clear();
  }

  #renderLibrary(): void {
    if (this.platform) { this.#renderPlatformLibrary(); return; }
    this.#editingId = undefined;
    const activities = this.settings.getSection("linkActivities").customActivities;
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
    if (this.service.sequenceRunning) body.append(element("button", {
      className: "kl-text-button kl-sequence-stop", type: "button", text: "Stop active sequence",
      onClick: () => { this.service.stopSequence(); this.showToast("Sequence stopped. Unchanged temporary states restored."); this.#renderLibrary(); },
    }));
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

  #renderPlatformLibrary(): void {
    const activities = this.settings.getSection("linkActivities").customActivities;
    if (!this.#libraryBuilt) {
      this.#libraryBuilt = true;
      const create = element("button", { className: "kl-text-button kl-text-button--primary kl-custom-activity-create", type: "button", onClick: () => this.#openEditor() }, kikiIcon("plus"), "New activity");
      const header = this.#header("Custom activities", "", element("div", { className: "kl-activity-header-actions" }, this.#resume, create));
      const file = element("input", { ariaLabel: "Import activity file" }); file.type = "file"; file.accept = ".json,application/json"; file.hidden = true;
      file.addEventListener("change", () => { const selected = file.files?.[0]; file.value = ""; if (selected) void this.#importFile(selected); });
      const options = element("button", { className: "kl-icon-button kl-activity-library-options", type: "button", ariaLabel: "Activity library options", onClick: () =>
        this.#libraryMenu.open(options, "Activity library", [
          { label: "Import JSON", icon: "arrow-right", run: () => file.click() },
          { label: "Export library", icon: "archive", disabled: !this.settings.getSection("linkActivities").customActivities.length, run: () => this.#export() },
          { label: "Find activity packs", icon: "brush", run: () => this.platform?.openWorkshop() },
        ], undefined, true) }, kikiIcon("more"));
      options.setAttribute("aria-haspopup", "menu"); options.setAttribute("aria-expanded", "false");
      const toolbar = element("div", { className: "kl-activity-library-toolbar" },
        element("div", { className: "kl-activity-search-field" }, kikiIcon("search"), this.#query),
        element("div", { className: "kl-activity-library-actions" },
          element("button", { className: "kl-text-button kl-activity-import", type: "button", onClick: () => file.click() }, kikiIcon("arrow-right"), "Import"),
          element("button", { className: "kl-text-button", type: "button", onClick: () => this.platform?.openWorkshop() }, kikiIcon("brush"), "Workshop"), options), file);
      this.root.replaceChildren(element("div", { className: "kl-activity-library" }, header, toolbar, this.#status,
        element("div", { className: "kl-activity-library-meta" }, this.#scopes, this.#count, this.#stop), this.#results),
        this.#details.element, this.#libraryMenu.element);
    }
    this.#resume.hidden = !this.#editorDialog;
    this.root.querySelector<HTMLButtonElement>(".kl-custom-activity-create")!.disabled = activities.length >= MAX_CUSTOM_ACTIVITIES;
    this.#stop.hidden = !this.service.sequenceRunning;
    const signature = JSON.stringify([activities, this.#query.value, this.#scope]);
    if (signature === this.#librarySignature) return;
    this.#librarySignature = signature;
    this.#libraryMenu.close(false);
    for (const button of this.#scopes.querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.scope === this.#scope));
    const query = this.#query.value.trim().toLocaleLowerCase();
    const shown = activities.filter(value => (this.#scope === "all" || fromWorkshop(value) === (this.#scope === "workshop"))
      && `${value.name} ${value.template} ${this.#slotLabel(value.targetGroup)}${fromWorkshop(value) ? " Workshop" : ""}`.toLocaleLowerCase().includes(query));
    this.#count.textContent = shown.length === activities.length ? `${activities.length} ${activities.length === 1 ? "activity" : "activities"}` : `${shown.length} of ${activities.length}`;
    this.#results.replaceChildren(...shown.map(activity => this.#platformCard(activity)));
    if (!shown.length) {
      const filtered = Boolean(query || this.#scope !== "all");
      const emptyWorkshop = this.#scope === "workshop" && !query;
      this.#results.append(element("section", { className: "kl-custom-activity-empty" }, kikiIcon("activities"),
        element("h2", { text: emptyWorkshop ? "No activity packs yet" : filtered ? "No activities match" : "Make an activity your own" }),
        element("p", { text: filtered ? "Try another search or clear your filters." : "Choose a body slot, reuse a vanilla picture, and write the action in your words." }),
        element("div", { className: "kl-activity-empty-actions" },
          element("button", { className: filtered ? "kl-text-button" : "kl-text-button kl-text-button--primary", type: "button", text: filtered ? "Clear filters" : "Create activity", onClick: () => {
            if (filtered) { this.#query.value = ""; this.#changeLibraryFilter("all"); this.#query.focus(); } else this.#openEditor();
          } }),
          !filtered || this.#scope === "workshop" ? element("button", { className: "kl-text-button", type: "button", text: "Browse Workshop", onClick: () => this.platform?.openWorkshop() }) : undefined)));
    }
  }

  #changeLibraryFilter(scope: ActivityScope): void {
    this.#scope = scope;
    this.#renderLibrary();
    try {
      this.platform?.storage?.setItem("kikilink:platform:activities-query:v1", this.#query.value);
      this.platform?.storage?.setItem("kikilink:platform:activities-scope:v1", scope);
    } catch { /* Retain current filters in memory. */ }
  }

  #platformCard(activity: CustomActivityDefinition): HTMLElement {
    const card = element("article", { className: "kl-custom-activity-card" }); card.dataset.activityId = activity.id;
    const icon = element("img", { className: "kl-custom-activity-vanilla-icon", src: activityImageUrl(activity.image), alt: "" }); icon.loading = "lazy"; icon.decoding = "async";
    const menu = element("button", { className: "kl-icon-button kl-activity-more", type: "button", ariaLabel: `Actions for ${activity.name}`, onClick: () =>
      this.#libraryMenu.open(menu, "Activity actions", [
        { label: "Edit", icon: "edit", run: () => this.#openEditor(activity.id) },
        { label: "Duplicate", icon: "copy", disabled: this.settings.getSection("linkActivities").customActivities.length >= MAX_CUSTOM_ACTIVITIES, run: () => this.#clone(activity.id) },
        { label: "Export JSON", icon: "archive", run: () => this.#export(activity.id) },
        { label: "Delete", icon: "trash", run: () => this.#deleteActivity(activity.id) },
      ], undefined, true) }, kikiIcon("more"));
    menu.setAttribute("aria-haspopup", "menu"); menu.setAttribute("aria-expanded", "false");
    const mode = activity.targetMode === "self" ? "My character" : activity.targetMode === "both" ? "Anyone" : "Other characters";
    const workshop = fromWorkshop(activity);
    const source = document.createTextNode(workshop ? "Workshop" : mode);
    const origin = element("span", { className: "kl-activity-target-label", title: source.data }, kikiIcon(workshop ? "brush" : "profile"), source);
    if (workshop) {
      const titles = this.#workshopTitles ??= this.platform?.workshopTitles?.()?.catch(() => new Map<string, string>());
      void titles?.then(names => {
        const title = names.get(activity.id);
        if (title && !this.#destroyed && titles === this.#workshopTitles) { source.data = title; origin.title = title; }
      });
    }
    const steps = activity.effects?.steps.length ?? 0;
    card.append(element("div", { className: "kl-activity-card-heading" }, element("span", { className: "kl-custom-activity-card-icon" }, icon),
      element("div", { className: "kl-custom-activity-card-copy" },
        element("button", { className: "kl-custom-activity-card-name", type: "button", text: activity.name, title: activity.name, onClick: () => this.#openEditor(activity.id) }),
        element("div", { className: "kl-custom-activity-card-meta" },
          element("span", { text: this.#slotLabel(activity.targetGroup) }),
          activity.arousal ? element("span", { text: `Arousal +${activity.arousal}` }) : undefined,
          steps ? element("span", { text: `${steps} ${steps === 1 ? "step" : "steps"}` }) : undefined)), menu),
      element("p", { className: "kl-custom-activity-card-template", text: this.#previewText(activity) }),
      element("div", { className: "kl-activity-card-footer" }, origin,
        element("div", { className: "kl-custom-activity-card-actions" },
          element("button", { className: "kl-text-button", type: "button", ariaLabel: `Preview ${activity.name}`, onClick: () => this.#showDetails(activity.name, element("section", { className: "kl-activity-preview" },
            element("div", { className: "kl-activity-preview-meta", text: `${this.#slotLabel(activity.targetGroup)} · ${mode}` }),
            element("p", { className: "kl-custom-activity-live-preview", text: this.#previewText(activity) }), element("small", { text: "Text preview. Game actions run from the native Activities menu." }))) }, kikiIcon("play"), "Preview"),
          element("button", { className: "kl-text-button", type: "button", ariaLabel: `Edit ${activity.name}`, onClick: () => this.#openEditor(activity.id) }, kikiIcon("edit"), "Edit"))));
    return card;
  }

  #previewText(activity: CustomActivityDefinition): string {
    return expandCustomActivityTemplate(activity.template, { sourceName: this.adapter.getOwnName(), targetName: activity.targetMode === "self" ? this.adapter.getOwnName() : "Alex" });
  }

  #showDetails(title: string, content: Node, cleanup?: () => void): void {
    const wasOpen = this.#details.element.open;
    this.#details.show(title, content, cleanup);
    if (!wasOpen) fitPanelDialog(this.#details.element);
  }

  #export(activityId?: string): void {
    try {
      const values = this.settings.getSection("linkActivities").customActivities.filter(value => !activityId || value.id === activityId);
      if (!values.length) throw new Error("No activities to export.");
      const url = URL.createObjectURL(new Blob([activityExport(values)], { type: "application/json" })); this.#downloadUrls.add(url);
      const link = element("a"); link.href = url; link.download = activityId ? "KikiLink-activity.json" : "KikiLink-activities.json"; this.root.append(link); link.click(); link.remove();
      window.setTimeout(() => { URL.revokeObjectURL(url); this.#downloadUrls.delete(url); }, 1000);
    } catch (error) { this.#libraryError(error, "Could not export activities."); }
  }

  async #importFile(file: File): Promise<void> {
    const generation = ++this.#importGeneration; this.#status.hidden = true;
    try {
      if (file.size > MAX_ACTIVITY_IMPORT_BYTES) throw new Error("Activity files must be smaller than 2 MiB.");
      const imported = readActivityImport(await file.text());
      if (this.#destroyed || generation !== this.#importGeneration) return;
      const preview = mergeActivityImport(this.settings.getSection("linkActivities").customActivities, imported);
      const error = element("p", { className: "kl-activity-error" }); error.hidden = true; error.setAttribute("role", "alert");
      const confirm = element("button", { className: "kl-text-button kl-text-button--primary", type: "button", text: "Import activities", onClick: () => {
        if (this.#destroyed || generation !== this.#importGeneration) return;
        try {
          let added = 0;
          this.settings.update(draft => { const merged = mergeActivityImport(draft.linkActivities.customActivities, imported); added = merged.added; draft.linkActivities.customActivities = merged.activities; }, { requirePersistence: true });
          this.service.syncFromSettings(); this.onChanged(); this.#details.close(); this.#query.value = ""; this.#changeLibraryFilter("all"); this.showToast(`${added} activities imported.`);
        } catch (failure) { error.textContent = failure instanceof Error ? failure.message : "Import could not be saved. Try again."; error.hidden = false; }
      } });
      this.#showDetails("Import activities", element("div", { className: "kl-activity-import-review" },
        element("p", { text: `${preview.added} to add · ${preview.skipped} already present${preview.renamed ? ` · ${preview.renamed} ID conflicts saved as separate activities` : ""}` }),
        element("p", { text: "Your existing activities stay in the library." }), error, confirm), () => { if (generation === this.#importGeneration) this.#importGeneration++; });
    } catch (error) { if (!this.#destroyed && generation === this.#importGeneration) this.#libraryError(error, "Could not import activities."); }
  }

  #libraryError(error: unknown, fallback: string): void { this.#status.textContent = error instanceof Error ? error.message : fallback; this.#status.hidden = false; }

  #actionError(message: string): void {
    if (!this.platform) { this.showToast(message, "error"); return; }
    const error = this.#editorDialog?.element.open ? this.#editorDialog.element.querySelector<HTMLElement>(".kl-activity-error") : undefined;
    if (error) { error.textContent = message; error.hidden = false; }
    else this.#libraryError(new Error(message), message);
  }

  #finishEditor(): void {
    this.#editorDialog?.destroy(); this.#editorDialog = undefined; this.#readDraft = undefined; this.#editingId = undefined; this.#renderLibrary();
    this.root.querySelector<HTMLButtonElement>(".kl-custom-activity-create")?.focus();
  }

  #deleteActivity(activityId: string): void {
    const activity = this.settings.getSection("linkActivities").customActivities.find(value => value.id === activityId);
    if (!activity) return;
    if (this.platform) {
      const error = element("p", { className: "kl-activity-error" });
      error.hidden = true;
      error.setAttribute("role", "alert");
      const keep = element("button", { className: "kl-text-button", type: "button", text: "Keep activity", onClick: () => this.#details.close() });
      const confirm = element("button", { className: "kl-text-button kl-text-button--danger", type: "button", text: "Delete activity", onClick: () => {
        if (!this.#details.element.open) return;
        this.#removeActivity(activity, message => { error.textContent = message; error.hidden = false; });
      } });
      this.#showDetails("Delete activity?", element("div", { className: "kl-activity-delete-review" },
        element("p", {}, "Delete ", element("strong", { text: activity.name }), " from your library?"), error,
        element("div", { className: "kl-activity-confirm-actions" }, keep, confirm)));
      keep.focus();
    } else if (window.confirm(`Delete ${activity.name}?`)) {
      this.#removeActivity(activity, message => this.#actionError(message));
    }
  }

  #removeActivity(activity: CustomActivityDefinition, onError: (message: string) => void): void {
    try {
      this.settings.update(draft => { draft.linkActivities.customActivities = draft.linkActivities.customActivities.filter(value => value.id !== activity.id); }, { requirePersistence: true });
      if (this.platform) this.#details.close();
      this.service.syncFromSettings(); this.onChanged(); if (this.#editingId === activity.id) this.#finishEditor(); else this.#renderLibrary(); this.showToast(`${activity.name} deleted.`);
    } catch (error) { onError(error instanceof Error ? error.message : "Could not delete activity."); }
  }

  #activityCard(activity: CustomActivityDefinition): HTMLElement {
    const vanillaIcon = element("img", {
      className: "kl-custom-activity-vanilla-icon",
      src: activityImageUrl(activity.image),
      alt: "",
    });
    vanillaIcon.loading = "lazy";
    vanillaIcon.decoding = "async";
    const iconWrap = element(
      "div",
      { className: "kl-custom-activity-card-icon" },
      vanillaIcon,
      element("img", {
        className: "kl-custom-activity-blossom",
        src: BLOSSOM_ICON_DATA_URL,
        alt: "KikiLink",
      }),
    );
    const arousal = activity.arousal > 0 ? ` · Arousal +${activity.arousal}` : "";
    const card = element(
      "article",
      { className: "kl-custom-activity-card" },
      iconWrap,
      element(
        "div",
        { className: "kl-custom-activity-card-copy" },
        element("div", { className: "kl-custom-activity-card-name", text: activity.name }),
        element("div", {
          className: "kl-custom-activity-card-meta",
          text: `${this.#slotLabel(activity.targetGroup)}${arousal}${activity.effects ? ` · ${activity.effects.steps.length} steps` : ""}`,
        }),
        element("div", {
          className: "kl-custom-activity-card-template",
          text: activity.template,
        }),
      ),
      element("div", { className: "kl-custom-activity-card-actions" },
        element("button", { className: "kl-text-button", type: "button", text: "Edit", ariaLabel: `Edit ${activity.name}`, onClick: () => this.#openEditor(activity.id) }),
        element("button", { className: "kl-text-button", type: "button", text: "Clone", ariaLabel: `Clone ${activity.name}`, onClick: () => this.#clone(activity.id) })),
    );
    card.dataset.activityId = activity.id;
    return card;
  }

  #clone(activityId: string): void {
    if (this.platform && this.#editorDialog && this.#readDraft?.() !== this.#draftBaseline) {
      this.#editorDialog.show(); this.#actionError("Save or discard the current draft before duplicating another activity."); return;
    }
    try {
      const id = createCustomActivityId();
      this.settings.update(draft => {
        const source = draft.linkActivities.customActivities.find(activity => activity.id === activityId);
        if (!source) throw new Error("Activity is no longer available.");
        if (draft.linkActivities.customActivities.length >= MAX_CUSTOM_ACTIVITIES) throw new Error(`You can keep up to ${MAX_CUSTOM_ACTIVITIES} activities.`);
        const copy = structuredClone(source);
        copy.id = id;
        copy.name = `${source.name.slice(0, 33)} (copy)`;
        draft.linkActivities.customActivities.push(copy);
      }, { requirePersistence: true });
      this.service.syncFromSettings(); this.onChanged(); this.#openEditor(id);
      this.showToast("Activity cloned.");
    } catch (error) { this.#actionError(error instanceof Error ? error.message : "Could not clone activity."); }
  }

  #openEditor(activityId?: string): void {
    if (this.platform) {
      this.#renderLibrary();
      if (this.#editorDialog) {
        if (activityId === this.#editingId || (!activityId && !this.#draftExisting)) { this.#editorDialog.show(); return; }
        if (this.#readDraft?.() !== this.#draftBaseline) {
          this.#editorDialog.show(); this.#actionError("Save or discard the current draft before editing another activity."); return;
        }
        this.#editorDialog.destroy(); this.#editorDialog = undefined;
      }
    }
    const existing = activityId
      ? this.settings
          .getSection("linkActivities")
          .customActivities.find((activity) => activity.id === activityId)
      : undefined;
    if (activityId && !existing) {
      this.#renderLibrary();
      return;
    }
    if (!existing && this.settings.getSection("linkActivities").customActivities.length >= MAX_CUSTOM_ACTIVITIES) {
      this.#actionError(`You can keep up to ${MAX_CUSTOM_ACTIVITIES} custom activities.`);
      return;
    }
    const draft = structuredClone(existing ?? createBlankCustomActivity(createCustomActivityId()));
    if (!this.platform) draft.image = canonicalVanillaActivityImage(draft.image);
    this.#editingId = draft.id;
    this.#draftExisting = Boolean(existing);
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
    if (this.platform) {
      this.root.append(editor); this.#draftBaseline = this.#readDraft?.() ?? ""; this.#resume.hidden = false; this.#editorDialog?.show();
    } else this.root.replaceChildren(header, editor);
    requestAnimationFrame(() => {
      if (!editor.isConnected || this.#destroyed || (this.platform && !this.#editorDialog?.element.open)) return;
      editor.querySelector<HTMLInputElement>('[data-field="name"]')?.focus();
      this.#redrawCharacter(editor, draft.targetGroup);
    });
  }

  #buildEditor(draft: CustomActivityDefinition, isExisting: boolean): HTMLElement {
    const sourceSignature = isExisting ? JSON.stringify(this.settings.getSection("linkActivities").customActivities.find(value => value.id === draft.id)) : undefined;
    const slots = [...this.service.getBodySlots()];
    if (!slots.some((slot) => slot.name === draft.targetGroup) && slots[0]) {
      if (this.platform) slots.unshift({ name: draft.targetGroup, label: `${draft.targetGroup} · saved slot`, zones: [] });
      else draft.targetGroup = slots[0].name;
    }

    const canvas = element("canvas", {
      className: "kl-custom-character-canvas",
      ariaLabel: "Your character body slots",
      tabIndex: -1,
    }) as HTMLCanvasElement;
    const canvasFallback = element("div", {
      className: "kl-custom-character-fallback",
      text: "Your character appears here in Bondage Club.",
    });
    const slotSelect = element("select", {
      className: "kl-select kl-custom-slot-select",
      ariaLabel: "Body slot",
    }) as HTMLSelectElement;
    // Kept as a hidden compatibility/form control; the visible picker is the radio grid below.
    slotSelect.hidden = true;
    slotSelect.tabIndex = -1;
    slotSelect.setAttribute("aria-hidden", "true");
    for (const slot of slots) {
      const option = document.createElement("option");
      option.value = slot.name;
      option.textContent = slot.label;
      slotSelect.append(option);
    }
    slotSelect.value = draft.targetGroup;
    const slotsByName = new Map(slots.map((slot) => [slot.name, slot]));
    const slotButtons = new Map<string, HTMLButtonElement>();
    const selectedSlotLabel = element("span", {
      className: "kl-custom-slot-current",
      text: slotsByName.get(draft.targetGroup)?.label ?? draft.targetGroup,
    });
    const slotSummaryAction = element("span", {
      className: "kl-custom-slot-action",
      text: "Show all",
    });
    const slotSummary = element(
      "summary",
      { className: "kl-custom-slot-summary" },
      selectedSlotLabel,
      slotSummaryAction,
    );
    const slotGrid = element("div", {
      className: "kl-custom-slot-grid",
      ariaLabel: "Body slots",
    });
    slotGrid.setAttribute("role", "radiogroup");
    const slotPicker = element(
      "details",
      { className: "kl-custom-slot-picker" },
      slotSummary,
      slotGrid,
    ) as HTMLDetailsElement;
    let slotButtonsBuilt = false;
    let redrawCharacter = (): void => undefined;
    const updateSlotSummary = (groupName: string): void => {
      const label = slotsByName.get(groupName)?.label ?? groupName;
      selectedSlotLabel.textContent = label;
      slotSummary.setAttribute(
        "aria-label",
        `Selected body slot: ${label}. ${slotPicker.open ? "Hide" : "Show all"} body slots`,
      );
    };
    const selectSlot = (groupName: string, collapsePicker = false): void => {
      if (!slotsByName.has(groupName)) return;
      draft.targetGroup = groupName;
      slotSelect.value = groupName;
      for (const [name, button] of slotButtons) {
        const selected = name === groupName;
        button.dataset.selected = String(selected);
        button.setAttribute("aria-checked", String(selected));
      }
      updateSlotSummary(groupName);
      if (collapsePicker && slotPicker.open) {
        slotPicker.open = false;
        slotSummaryAction.textContent = "Show all";
        slotSummary.focus();
      }
      redrawCharacter();
    };
    const buildSlotButtons = (): void => {
      if (slotButtonsBuilt) return;
      slotButtonsBuilt = true;
      const fragment = document.createDocumentFragment();
      for (const slot of slots) {
        const button = element("button", {
          className: "kl-custom-slot-choice",
          type: "button",
          text: slot.label,
          title: slot.label,
          ariaLabel: `Use ${slot.label} body slot`,
          onClick: () => selectSlot(slot.name, true),
        });
        button.dataset.slot = slot.name;
        button.dataset.selected = String(slot.name === draft.targetGroup);
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", String(slot.name === draft.targetGroup));
        button.addEventListener("keydown", event => {
          const choices = [...slotButtons.values()], index = choices.indexOf(button);
          const next = event.key === "ArrowRight" || event.key === "ArrowDown" ? (index + 1) % choices.length : event.key === "ArrowLeft" || event.key === "ArrowUp" ? (index + choices.length - 1) % choices.length : undefined;
          if (next === undefined) return; event.preventDefault(); const target = choices[next]!; selectSlot(target.dataset.slot!); target.focus();
        });
        slotButtons.set(slot.name, button);
        fragment.append(button);
      }
      slotGrid.append(fragment);
    };
    updateSlotSummary(draft.targetGroup);
    slotPicker.addEventListener("toggle", () => {
      slotSummaryAction.textContent = slotPicker.open ? "Hide" : "Show all";
      updateSlotSummary(draft.targetGroup);
      if (slotPicker.open) buildSlotButtons();
    });
    slotSelect.addEventListener("change", () => selectSlot(slotSelect.value));

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
            if (template.value.length - (template.selectionEnd - template.selectionStart) + item.token.length > template.maxLength) return;
            template.setRangeText(
              item.token,
              template.selectionStart,
              template.selectionEnd,
              "end",
            );
            template.focus();
            template.dispatchEvent(new Event("input", { bubbles: true }));
          },
        }),
      );
    }
    const preview = element("div", { className: "kl-custom-activity-live-preview" });
    let previewTarget: CustomActivityTargetMode = draft.targetMode;
    const updatePreview = (): void => {
      preview.textContent =
        expandCustomActivityTemplate(template.value, {
          sourceName: this.adapter.getOwnName(),
          targetName: previewTarget === "self" ? this.adapter.getOwnName() : "Alex",
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
    const imageButtons = new Map<string, HTMLButtonElement>();
    const quickPictures = new Map<string, HTMLButtonElement>();
    const previewIcon = this.platform ? element("img", { className: "kl-activity-preview-icon", src: activityImageUrl(draft.image), alt: "" }) : undefined;
    const noImageMatches = element("div", {
      className: "kl-contact-empty",
      text: "No vanilla pictures match.",
    });
    noImageMatches.hidden = true;
    const imageFragment = document.createDocumentFragment();
    const selectImage = (image: string): void => {
      if (image === draft.image) return;
      const canonical = canonicalVanillaActivityImage(image);
      if (canonical === draft.image) return;
      for (const button of [imageButtons.get(draft.image), quickPictures.get(draft.image)]) {
        if (!button) continue;
        button.setAttribute("aria-pressed", "false");
        button.dataset.selected = "false";
      }
      draft.image = canonical;
      for (const button of [imageButtons.get(canonical), quickPictures.get(canonical)]) {
        if (!button) continue;
        button.setAttribute("aria-pressed", "true");
        button.dataset.selected = "true";
      }
      if (previewIcon) previewIcon.src = activityImageUrl(canonical);
    };
    const images = this.service.getVanillaImages();
    if (this.platform && !images.includes(draft.image)) images.unshift(draft.image);
    for (const image of images) {
      const previewImage = element("img", { src: activityImageUrl(image), alt: "" });
      previewImage.loading = "lazy";
      previewImage.decoding = "async";
      const button = element(
        "button",
        {
          className: "kl-custom-image-choice",
          type: "button",
          title: image,
          ariaLabel: `Use ${image} picture`,
          onClick: () => selectImage(image),
        },
        previewImage,
        element("span", { text: `${humanizeActivityName(image)}${canonicalVanillaActivityImage(image) !== image ? " · saved" : ""}` }),
      );
      button.dataset.search = image.toLocaleLowerCase();
      button.dataset.selected = String(image === draft.image);
      button.setAttribute("aria-pressed", String(image === draft.image));
      imageButtons.set(image, button);
      imageFragment.append(button);
    }
    imageGallery.append(imageFragment, noImageMatches);
    const filterImages = (): void => {
      const query = imageSearch.value.trim().toLocaleLowerCase();
      let visible = 0;
      for (const button of imageButtons.values()) {
        const matches = !query || button.dataset.search?.includes(query) === true;
        button.hidden = !matches;
        if (matches) visible += 1;
      }
      noImageMatches.hidden = visible !== 0;
    };
    let imageFilterFrame: number | undefined;
    imageSearch.addEventListener("input", () => {
      if (imageFilterFrame !== undefined) return;
      imageFilterFrame = requestAnimationFrame(() => {
        imageFilterFrame = undefined;
        if (imageGallery.isConnected) filterImages();
      });
    });

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
    targetMode.addEventListener("change", () => { previewTarget = targetMode.value as CustomActivityTargetMode; updatePreview(); });
    const effectsEditor = activityEffectsEditor(draft, () => this.service.getEffectCapabilities(), { preserveUnavailable: Boolean(this.platform) });
    const nameField = this.#field("Activity name", "", name);
    const textField = this.platform
      ? this.#field("Action text", "", element("div", { className: "kl-activity-action-input" }, template, tokenRow))
      : this.#field("Action text", "Tap a variable to insert it.", template, tokenRow);
    const previewField = element("div", { className: "kl-custom-preview-wrap" },
      element("div", { className: "kl-custom-field-label", text: "Preview" }),
      previewIcon ? element("div", { className: "kl-activity-preview-box" }, previewIcon, preview) : preview);
    const pictureField = this.#field("Vanilla picture", "", imageSearch, imageGallery);
    const targetField = this.#field("Who can be targeted", "", targetMode);
    const arousalField = element("div", { className: "kl-custom-arousal-row" },
      element("div", { className: "kl-custom-arousal-copy" },
        element("div", { className: "kl-custom-field-label", text: "Trigger arousal" }),
        element("div", { className: "kl-custom-field-help", text: "Uses the recipient’s BC preferences." })),
      arousalSwitch, arousalOptions,
    );
    const form = element("section", { className: "kl-custom-activity-form" },
      nameField, textField, previewField, pictureField, arousalField, targetField, effectsEditor);

    const characterStage = element(
      "div",
      {
        className: "kl-custom-character-stage",
        ariaLabel:
          "Scrollable character body map. Scroll for lower slots or use Show all for keyboard selection.",
        tabIndex: 0,
      },
      canvas,
      canvasFallback,
    );
    characterStage.setAttribute("role", "region");
    const characterPane = element(
      "aside",
      { className: "kl-custom-character-pane" },
      element("div", { className: "kl-custom-field-label", text: "Body slot" }),
      element("div", {
        className: "kl-custom-field-help",
        text: this.platform ? "Tap a body slot on your character to change it." : "Tap your character or open the compact picker to change it.",
      }),
      slotPicker,
      characterStage,
      slotSelect,
      element("div", {
        className: "kl-custom-slot-note",
        text: "The activity will appear next to vanilla actions on this slot.",
      }),
    );
    let redrawFrame: number | undefined;
    const redraw = (): void => {
      if (redrawFrame !== undefined) return;
      redrawFrame = requestAnimationFrame(() => {
        redrawFrame = undefined;
        if (!canvas.isConnected) return;
        const drawn = this.service.drawPlayer(canvas, draft.targetGroup, this.#hoveredGroup);
        canvasFallback.hidden = drawn;
      });
    };
    redrawCharacter = redraw;
    canvas.addEventListener("pointermove", (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      const point = canvasPoint(canvas, event);
      const hoveredGroup = this.service.bodySlotAt(point.x, point.y)?.name;
      if (hoveredGroup === this.#hoveredGroup) return;
      this.#hoveredGroup = hoveredGroup;
      redraw();
    });
    canvas.addEventListener("pointerleave", () => {
      if (this.#hoveredGroup === undefined) return;
      this.#hoveredGroup = undefined;
      redraw();
    });
    canvas.addEventListener("click", (event) => {
      const point = canvasPoint(canvas, event);
      const slot = this.service.bodySlotAt(point.x, point.y);
      if (!slot) return;
      selectSlot(slot.name);
    });
    const error = element("div", { className: "kl-activity-error" }); error.hidden = true; error.setAttribute("role", "alert");
    const reportError = (message: string, control?: HTMLElement): void => {
      if (this.platform) { error.textContent = message; error.hidden = false; if (control) { control.setAttribute("aria-invalid", "true"); this.#editorDialog?.reveal(control); } }
      else this.showToast(message, "error");
    };
    for (const control of [name, template]) control.addEventListener("input", () => { control.removeAttribute("aria-invalid"); error.hidden = true; });
    const collect = (): CustomActivityDefinition => ({ ...draft, name: name.value.trim(), template: template.value.trim(), targetGroup: slotSelect.value,
      targetMode: targetMode.value as CustomActivityTargetMode, arousal: arousalToggle.checked ? Number(arousalRange.value) : 0 });
    this.#readDraft = () => JSON.stringify(collect());
    const save = element("button", {
      className: "kl-text-button kl-text-button--primary kl-custom-activity-save",
      type: "button",
      text: "Save activity",
      onClick: () => {
        const activityName = name.value.trim();
        const activityTemplate = template.value.trim();
        if (!activityName || !activityTemplate || !slotSelect.value) {
          reportError("Add a name, action text, and body slot before saving.", !activityName ? name : !activityTemplate ? template : this.platform ? slotGrid : slotSummary);
          return;
        }
        if (activityName.length > 40 || activityTemplate.length > 500) {
          reportError("Keep the name within 40 characters and the action text within 500.", activityName.length > 40 ? name : template); return;
        }
        if ((draft.effects?.steps.reduce((sum, step) => sum + step.delayMs + step.durationMs, 0) ?? 0) > MAX_SEQUENCE_TIME_MS) {
          reportError("Keep the sequence within 120 seconds before saving.", effectsEditor.querySelector<HTMLElement>("summary")!);
          return;
        }
        const effects = sanitizeActivityEffects(draft.effects);
        if (this.platform && draft.effects?.steps.length && !effects) {
          reportError("Choose an expression, pose or clothing action in at least one step.", effectsEditor.querySelector<HTMLElement>("summary")!); return;
        }
        const saved: CustomActivityDefinition = {
          id: draft.id,
          name: activityName,
          targetGroup: slotSelect.value,
          targetMode: targetMode.value as CustomActivityTargetMode,
          template: activityTemplate,
          image: this.platform ? draft.image : canonicalVanillaActivityImage(draft.image),
          arousal: arousalToggle.checked ? Number(arousalRange.value) : 0,
          ...(effects ? { effects } : {}),
        };
        try {
        this.settings.update((settingsDraft) => {
          const index = settingsDraft.linkActivities.customActivities.findIndex(
            (activity) => activity.id === saved.id,
          );
          if (isExisting && index < 0) throw new Error("This activity was removed while you were editing. Your draft is still available here.");
          if (this.platform && isExisting && JSON.stringify(settingsDraft.linkActivities.customActivities[index]) !== sourceSignature) throw new Error("This activity changed while you were editing. Your draft is still open; discard it to reopen the latest saved version.");
          if (index >= 0) settingsDraft.linkActivities.customActivities[index] = saved;
          else {
            if (settingsDraft.linkActivities.customActivities.length >= MAX_CUSTOM_ACTIVITIES) throw new Error(`You can keep up to ${MAX_CUSTOM_ACTIVITIES} activities.`);
            settingsDraft.linkActivities.customActivities.push(saved);
          }
        }, { requirePersistence: true });
        this.service.syncFromSettings();
        this.onChanged();
        this.showToast(isExisting ? `${saved.name} updated.` : `${saved.name} added beside vanilla activities.`);
        if (this.platform) { this.#query.value = ""; this.#changeLibraryFilter("all"); this.#finishEditor(); }
        else this.#renderLibrary();
        } catch (failure) { reportError(failure instanceof Error ? failure.message : "Could not save activity. Try again."); }
      },
    });
    const cancel = element("button", {
      className: "kl-text-button kl-custom-activity-cancel",
      type: "button",
      text: this.platform ? "Discard changes" : "Cancel",
      onClick: () => this.platform ? this.#finishEditor() : this.#renderLibrary(),
    });
    const footerChildren: Node[] = [];
    if (isExisting) {
      footerChildren.push(
        element("button", {
          className: "kl-text-button kl-text-button--danger kl-custom-activity-delete",
          type: "button",
          text: "Delete",
          onClick: () => {
            this.#deleteActivity(draft.id);
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
    if (this.platform) {
      for (const [field, control] of [[nameField, name], [textField, template]] as const) {
        const count = element("output");
        count.setAttribute("aria-live", "off");
        const updateCount = () => { count.value = `${control.value.length}/${control.maxLength}`; };
        updateCount();
        control.addEventListener("input", updateCount);
        field.prepend(element("div", { className: "kl-activity-field-counter" }, field.firstElementChild, count));
      }
      const targetChoices = element("div", { className: "kl-activity-target-choices", ariaLabel: "Who can be targeted" });
      targetChoices.setAttribute("role", "group");
      for (const [value, label] of [["other", "Others"], ["self", "My character"], ["both", "Anyone"]] as const) {
        const choice = element("button", { className: "kl-text-button", type: "button", text: label, onClick: () => {
          targetMode.value = value;
          targetMode.dispatchEvent(new Event("change"));
        } });
        choice.dataset.value = value;
        targetChoices.append(choice);
      }
      const updateTargetChoices = () => {
        for (const choice of targetChoices.children) choice.setAttribute("aria-pressed", String(choice.getAttribute("data-value") === targetMode.value));
      };
      targetMode.addEventListener("change", updateTargetChoices);
      updateTargetChoices();
      targetMode.hidden = true;
      targetField.append(targetChoices);
      buildSlotButtons();
      slotGrid.tabIndex = -1;
      const pictureChoices = element("div", { className: "kl-activity-picture-choices", ariaLabel: "Suggested vanilla pictures" });
      pictureChoices.setAttribute("role", "group");
      for (const image of new Set([...ACTIVITY_EDITOR_PICTURES.filter(value => images.includes(value)), draft.image])) {
        const choice = element("button", { className: "kl-text-button", type: "button", title: image, onClick: () => selectImage(image) },
          element("img", { src: activityImageUrl(image), alt: "" }), element("span", { text: humanizeActivityName(image) }));
        choice.setAttribute("aria-pressed", String(image === draft.image));
        quickPictures.set(image, choice);
        pictureChoices.append(choice);
      }
      const browsePictures = element("button", { className: "kl-text-button kl-activity-browse-pictures", type: "button", text: "Browse vanilla pictures", onClick: () => this.#editorDialog?.reveal(imageSearch) });
      const visuals = element("div", { className: "kl-activity-visuals" }, characterPane, pictureField);
      const triggers = element("div", { className: "kl-activity-trigger-panel" }, effectsEditor);
      form.classList.add("kl-activity-details");
      form.replaceChildren(nameField, element("div", { className: "kl-activity-editor-content" },
        element("div", { className: "kl-activity-editor-writing" }, textField, previewField, this.#field("Picture", "", pictureChoices, browsePictures)),
        element("div", { className: "kl-activity-editor-settings" }, targetField, this.#field("Body slot", "", slotGrid), arousalField)));
      footer.prepend(error);
      this.#editorDialog = new ActivityEditorDialog(isExisting ? "Edit activity" : "New activity", [
        { name: "Activity", content: form }, { name: "Body & picture", content: visuals }, { name: "Triggers", content: triggers },
      ], footer, () => { if (!this.#destroyed) this.#renderLibrary(); });
      this.#editorDialog.element.addEventListener("keydown", event => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.isComposing) { event.preventDefault(); save.click(); }
      });
      return this.#editorDialog.element;
    }
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
      help ? element("span", { className: "kl-custom-field-help", text: help }) : undefined,
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
