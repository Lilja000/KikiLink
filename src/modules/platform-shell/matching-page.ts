import { pageAction } from './page-action';
import { preserveSelectionFocus } from "./browse-focus";
import { markAvatarPresence } from "../link-chat/avatar-presence";
import { ShellActionMenu } from './action-menu';
import { MatchingSearch, matchConnectionsButton, matchEmptySuggestions, matchFilterButton, matchingBrowseSelection, matchOptionsButton, matchOptionsSelector, matchScopeControls, matchSignalBar, matchSignalStatus, matchSuggestionCount, setMatchConnectionsCount, type MatchingBrowseSelection } from './matching-browse-controls';
import { matchingBreakdown } from './matching-breakdown';
import { matchingCatalogError, matchingCatalogLoading, matchingCatalogReadFailed } from './matching-catalog-state';
import { MatchingHideSuggestion } from './matching-hide-suggestion';
import { confirmedHide, hiddenSuggestionNotice, hideSuggestionLabel, matchesConfirmedHide, staleHideMessage, type ConfirmedHide } from './matching-hide-undo';
import { MatchingHiddenSuggestions } from './matching-hidden-suggestions';
import { MatchingInformation, matchingInformationButton } from './matching-information';
import { fitPanelDialog } from './panel-dialog-layout';
import {matchingPendingText,matchingReadAt,sameMatchingSource,MatchingGenerationError,type MatchingSource} from './matching-generation';
import {MatchingResourcesPage} from "./matching-resources-page";
import { CloudError, type CloudClient } from "../../cloud/client";
import { catalogById, PREFERENCE_LEVEL_LABELS, type PreferenceLevel } from "../../cloud/preference-model";
import { bindClockText } from "../../core/time-format";
import type { KeyValueStorage } from "../../core/settings";
import { element } from "../../cloud/dom";
import { kikiIcon } from "../link-chat/icons";
import { focusedElement } from '../../utils/dom';
import {
  DEFAULT_MATCH_FILTERS,
  checkedMatchFilters,
  matchUuid,
  MATCH_INTENTS,
  matchLanguageOptions,
  MATCH_INTERESTS,
  MATCH_STATES,
  type MatchFilters,
  type MatchOwn,
  type MatchCandidate,
  type MatchRequest,
  type MatchChoice,
} from "../../../cloud/shared/matching.mjs";
import { MATCH_RESOURCE_KINDS } from "../../../cloud/shared/matching-resources.mjs";
import {
  checkedMatchOwn,
  checkedMatchCandidate,
  checkedMatchPage,
  checkedMatchRequest,
  checkedMatchRequestSummary,
  checkedMatchRequests,
  checkedMatchChoices,
} from "./matching-model";
import {
  MatchingRecovery,
  type MatchingPending,
  type MatchingLock,
} from "./matching-recovery";
import {
  MatchingSignalEditor,
  matchingSignalNeededBody,
  matchingSignalNeededTitle,
  signalWithExpiry,
  type MatchExpiry,
} from "./matching-signal-editor";
const requestMessageLimit = 240;
const matchingTypes = ["people", "groups", "rooms", "events"] as const;
type MatchingType = (typeof matchingTypes)[number];
type ResourceRecommendation = { kind: Exclude<MatchingType, "people">; id: string; host: number };
type ConnectionDecision = "Accepted" | "Declined" | "Cancelled";
const note = (text: string) =>
  element("p", { className: "kl-match-meta", text });
interface ConnectionDraft {
  target: number;
  intent: string;
  message: string;
  candidate: MatchCandidate;
  own: MatchOwn;
  source: MatchingSource;
}
interface Options {
  current(): boolean;
  blocked(member: number): boolean;
  known?(member: number): boolean;
  profile(member: number, name: string): void;
  canMessage?(member: number): boolean;
  message?(member: number, name: string, current: () => boolean): void | Promise<void>;
  privacy(): void;
  preferences(): void;
  space?(id:string):void;
  event?(id:string):void;
  community?(id:string):void;
  lock?: MatchingLock;
}
export class MatchingPage {
  readonly element = element("section", {
    className: "kl-matching-page",
    ariaLabel: "Matching",
  });
  readonly #body = element("div");
  readonly #types = element("nav", { className: "kl-match-type-tabs", role: "tablist", ariaLabel: "Matching type" });
  readonly #tabIdPrefix = `kl-match-types-${crypto.randomUUID()}`;
  readonly #tabs = new Map<MatchingType, HTMLButtonElement>();
  readonly #results = element("div", { role: "tabpanel", tabIndex: 0 });
  readonly #resources:MatchingResourcesPage;
  readonly #browseStorageKey: string;
  #type: MatchingType = "people";
  readonly #dialog = element("dialog", { className: "kl-match-dialog" });
  readonly #hideSuggestion = new MatchingHideSuggestion();
  #lastHide: ConfirmedHide | undefined;
  readonly #hiddenSuggestions = new MatchingHiddenSuggestions();
  readonly #cardMenu = new ShellActionMenu("explore");
  readonly #optionsMenu = new ShellActionMenu("explore");
  readonly #information = new MatchingInformation(
    () => this.#current() && this.client.connected,
    () => this.#body.querySelector<HTMLButtonElement>(".kl-match-information-toggle")?.focus({ preventScroll: true }),
  );
  readonly #dialogTitleId = `kl-match-title-${crypto.randomUUID()}`;
  #releaseDialogFit: (() => void) | undefined;
  #dialogReturnFocus: string | undefined;
  readonly recovery: MatchingRecovery;
  readonly #unsubscribe: () => void;
  #release: (() => void) | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #visible = false;
  #epoch = 0;
  #token = 0;
  #busy = false;
  #queued = false;
  #refreshAfter = false;
  #supported = false;
  #storageError = "";
  #message = "";
  #catalogState: 'loading' | 'error' | undefined;
  #own: MatchOwn | undefined;
  #openSignalAfterRefresh = false;
  #recommendationAction: { member: number; action: "why" | "connection" } | undefined;
  #recommendationActionMember: number | undefined;
  #resourceRecommendation: ResourceRecommendation | undefined;
  #items: MatchCandidate[] = [];
  #requests: MatchRequest[] = [];
  #next: string | number | null = null;
  #pending: MatchingPending | null = null;
  #page: "people" | "connections" = "people";
  #connectionsOrigin: Exclude<MatchingType, "people"> | undefined;
  #incomingRequestMembers: number[] = [];
  #summaryRevision = 0;
  #summaryQueued = false;
  #summaryTimer: ReturnType<typeof setTimeout> | undefined;
  #filters: MatchFilters = structuredClone(DEFAULT_MATCH_FILTERS);
  readonly #search = new MatchingSearch(
    () => this.#current() && this.#page === "people" && !this.#busy,
    () => void this.refresh(),
  );
  #connectionScope = "all";
  #connectionState = "all";
  #editor: MatchingSignalEditor | undefined;
  #source:MatchingSource={required:false};
  readonly #sources=new WeakMap<object,MatchingSource>();
  readonly #observedAt=new WeakMap<object,number>();
  #editorSource:MatchingSource|undefined;
  #bind<T extends object>(value:T,source=this.#source):T{this.#sources.set(value,source);this.#observedAt.set(value,Date.now());return value;}
  #sourceOf(value:object):MatchingSource{const source=this.#sources.get(value);if(!source)throw new MatchingGenerationError();return source;}
  #read<T>(path:string,source=this.#source):Promise<T>{return matchingReadAt(this.client,source)<T>(path);}
  #requestDraft: ConnectionDraft | undefined;
  constructor(
    readonly client: CloudClient,
    private readonly storage: KeyValueStorage,
    readonly options: Options,
  ) {
    this.recovery = new MatchingRecovery(
      client,
      storage,
      options.current,
      options.lock,
    );
    this.#browseStorageKey = `kikilink:matching-browse:${encodeURIComponent(this.recovery.origin)}:${this.recovery.owner}:v1`;
    this.#resources = new MatchingResourcesPage(client, storage, {
      ...options, navigation: this.#types,
      busyChanged: value => {
        this.#updateTypeTabs(this.#busy || value);
        if (!value && this.#type !== "people" && (this.#recommendationAction || this.#resourceRecommendation)) {
          queueMicrotask(() => this.#prepareRecommendationAction());
        }
      },
      connections: () => this.#openConnections(),
      openEventMatches: () => this.#tabs.get("events")?.click(),
      connectionCount: () => this.#connectionCount(),
      refreshConnectionCount: () => this.#invalidateConnectionSummary(),
      browseChanged: () => this.#saveBrowse(),
    });
    this.#setupTypeTabs();
    this.#restoreBrowse();
    this.#cardMenu.element.dataset.matchCardMenu = "people";
    this.element.append(this.#body,this.#dialog,this.#information.element,this.#resources.element,this.#cardMenu.element,this.#optionsMenu.element,this.#hiddenSuggestions.element,this.#hideSuggestion.element);
    this.#dialog.addEventListener("keydown", event => {
      if (event.key === "Escape") event.stopPropagation();
    });
    this.#dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      if (this.#editor && this.#dialog.contains(this.#editor.element)) this.#editor.requestClose();
      else this.#dialog.close();
    });
    this.#dialog.addEventListener("close", () => {
      if (this.#dialog.open) return;
      const target = this.#dialogReturnFocus;
      const layout = this.#dialog.dataset.layout;
      const connection = layout?.startsWith("request-") || layout?.startsWith("connection-") ||
        layout === "signal-needed" || layout === "signal-editor";
      this.#clearDialogLayout();
      if (target && this.#current()) {
        const opener = this.#body.querySelector<HTMLElement>(target);
        (opener ?? (connection ? this.#body.querySelector<HTMLElement>(matchOptionsSelector) : null))
          ?.focus({ preventScroll: true });
      }
    });
    this.#unsubscribe = client.subscribe((kind) => {
      if (!options.current() || client.memberNumber!==this.recovery.owner || client.origin!==this.recovery.origin) {
        this.#erase();
        return;
      }
      if (this.#recommendationActionMember !== undefined &&
        (kind === `profile:${this.#recommendationActionMember}` || kind === "session" ||
          kind === "connection" && !this.client.connected ||
          ["privacy", "profiles-cleared", "profile-discovery", "relationships"].includes(kind))) {
        this.#clearRecommendationAction();
        if (kind.startsWith("profile:")) this.#invalidate();
      }
      if (this.#resourceRecommendation &&
        (kind === `profile:${this.#resourceRecommendation.host}` ||
          ["matching", "session", "connection", "privacy", "profiles-cleared", "profile-discovery",
            "relationships", "communities", "spaces", "calendar"].includes(kind))) this.#resourceRecommendation = undefined;
      if (kind === "connection") {
        if (!this.client.connected) this.#openSignalAfterRefresh = false;
        this.#invalidateConnectionSummary();
        this.#hiddenSuggestions.close();
        this.#invalidate();
        return;
      }
      if (
        this.#visible &&
        [
          "session",
          "matching",
          "privacy",
          "profiles-cleared",
          "profile-discovery",
          "profile-friends",
          "profile-communities",
          "relationships",
          "communities",
          "ready",
        ].includes(kind)
      ) {
        this.#invalidateConnectionSummary();
        if (kind === "matching") this.#hiddenSuggestions.refresh();
        else this.#hiddenSuggestions.close();
        this.#invalidate();
      }
    });
    this.#draw();
  }
  #restoreBrowse(): void {
    try {
      const stored = this.storage.getItem(this.#browseStorageKey);
      if (!stored) return;
      const { type, filters } = JSON.parse(stored) as { type: MatchingType; filters: unknown };
      if (!matchingTypes.includes(type)) return;
      const applied = checkedMatchFilters(filters);
      if (applied.scope === "hidden") applied.scope = "all";
      this.#filters = applied;
      this.#type = type;
      if (type !== "people") this.#resources.setKind(type, matchingBrowseSelection(applied));
    } catch {
      // Missing or invalid preferences leave the catalog available.
    }
  }
  #saveBrowse(): void {
    if (!this.#visible || this.#page === "connections" || !this.options.current() ||
      this.client.memberNumber !== this.recovery.owner || this.client.origin !== this.recovery.origin) return;
    const type = this.#type;
    const filters = type === "people" ? { ...this.#filters } : { ...this.#filters, ...this.#resources.browseSelection };
    if (filters.scope === "hidden") filters.scope = "all";
    try {
      this.storage.setItem(this.#browseStorageKey, JSON.stringify({ type, filters: checkedMatchFilters(filters) }));
    } catch {
      // Preference storage is optional. Continue applying the current selection.
    }
  }
  #applyBrowse(): void {
    this.#saveBrowse();
    void preserveSelectionFocus(this.#body, () => this.refresh());
  }
  #current = () =>
    this.#visible && this.#type==="people" &&
    this.options.current() &&
    this.client.memberNumber === this.recovery.owner &&
    this.client.origin === this.recovery.origin;
  #valid(epoch = this.#epoch) {
    return () => this.#current() && this.#epoch === epoch;
  }
  #allowed(member: number) {
    try {
      return !this.options.blocked(member);
    } catch {
      return false;
    }
  }
  #erase() {
    this.#search.cancel();
    clearTimeout(this.#timer);
    this.#clearConnectionSummary();
    this.#connectionsOrigin = undefined;
    this.#page = "people";
    this.#lastHide = undefined;
    this.#epoch++;
    this.#token++;
    this.#items = [];
    this.#requests = [];
    this.#own = undefined;
    this.#openSignalAfterRefresh = false;
    this.#clearRecommendationAction();
    this.#next = null;
    this.#editor = undefined;
    this.#editorSource = undefined;
    this.#requestDraft = undefined;
    this.#dialog.close();
    this.#information.close();
    this.#hiddenSuggestions.close();
    this.#hideSuggestion.close();
    this.#dialog.replaceChildren();
    this.#pending = null;
    this.#busy = false;
    this.#catalogState = undefined;
    this.#draw();
  }
  setVisible(value: boolean): void {
    if (this.#visible === value) return;
    this.#visible = value;
    this.#epoch++;
    this.#token++;
    clearTimeout(this.#timer);
    if (value) {
      this.#release = this.client.retainEvents();
      this.#invalidateConnectionSummary();
      if(this.#type==="people")void this.refresh();
      else this.#resources.setVisible(true);
    } else {
      this.#search.cancel();
      this.#clearConnectionSummary();
      this.#lastHide = undefined;
      this.#resources.setVisible(false);
      this.#release?.();
      this.#release = undefined;
      this.#items = [];
      this.#requests = [];
      this.#own = undefined;
      this.#openSignalAfterRefresh = false;
      this.#clearRecommendationAction();
      this.#next = null;
      this.#busy = false;
      this.#catalogState = undefined;
      this.#dialog.close();
      this.#information.close();
      this.#hiddenSuggestions.close();
      this.#hideSuggestion.close();
      if (!this.#editor) this.#dialog.replaceChildren();
      this.#draw();
    }
  }
  openOwnSignal(): void {
    if (this.#type !== "people") {
      this.#resources.openOwnSignal();
      return;
    }
    if (!this.#current() || !this.client.connected || !this.element.isConnected ||
      this.#dialog.open || this.#search.composing) return;
    this.#openSignalAfterRefresh = true;
    if (!this.#busy) void this.refresh();
  }
  get recommendationPriority(): MatchFilters["priority"] {
    return this.#type === "people" && !this.#connectionsOrigin
      ? this.#filters.priority : this.#resources.browseSelection.priority;
  }
  openBrowse(): void {
    if (this.#busy || this.#resources.busy) return;
    this.#clearRecommendationAction();
    const origin = this.#connectionsOrigin;
    this.#connectionsOrigin = undefined;
    this.#page = "people";
    if (origin) this.#switch(origin, undefined, true);
    else if (this.#type !== "people") this.#resources.showBrowse();
    else if (this.#visible) void this.refresh();
  }
  openRecommendation(member: number, action: "why" | "connection"): void {
    if (!Number.isSafeInteger(member) || member <= 0 || member === this.recovery.owner || !this.#allowed(member) ||
      !this.element.isConnected || !this.client.connected || !this.options.current() ||
      this.client.memberNumber !== this.recovery.owner || this.client.origin !== this.recovery.origin ||
      this.#dialog.open || this.#search.composing) return;
    this.#resourceRecommendation = undefined;
    this.#recommendationAction = { member, action };
    this.#recommendationActionMember = member;
    this.#prepareRecommendationAction();
  }
  openResourceRecommendation(kind: ResourceRecommendation["kind"], id: string, host: number): void {
    if (!MATCH_RESOURCE_KINDS.includes(kind) || !matchUuid(id) || !Number.isSafeInteger(host) || host <= 0 ||
      !this.#allowed(host) || !this.element.isConnected || !this.client.connected || !this.options.current() ||
      this.client.memberNumber !== this.recovery.owner || this.client.origin !== this.recovery.origin ||
      this.#dialog.open || this.#search.composing) return;
    this.#clearRecommendationAction();
    this.#resourceRecommendation = { kind, id, host };
    this.#prepareRecommendationAction();
  }
  #clearRecommendationAction(): void {
    this.#recommendationAction = undefined;
    this.#recommendationActionMember = undefined;
    this.#resourceRecommendation = undefined;
  }
  #prepareRecommendationAction(): void {
    if (this.#busy || this.#resources.busy) return;
    const resource = this.#resourceRecommendation;
    if (resource) {
      const origin = this.#connectionsOrigin ?? this.#type;
      const selection = origin === "people" ? matchingBrowseSelection(this.#filters) : this.#resources.browseSelection;
      if (selection.scope === "hidden" && origin !== resource.kind) selection.scope = "all";
      this.#page = "people";
      this.#connectionsOrigin = undefined;
      if (this.#type !== resource.kind) this.#switch(resource.kind, selection, true);
      else this.#resources.showBrowse();
      if (!this.#visible || this.#resources.busy) return;
      this.#resourceRecommendation = undefined;
      this.#resources.openFinderRecommendation(resource.id, resource.host);
      return;
    }
    if (!this.#recommendationAction) return;
    const fromResource = this.#type !== "people" || this.#connectionsOrigin !== undefined;
    const selection = fromResource ? this.#resources.browseSelection : undefined;
    if (selection?.scope === "hidden") selection.scope = "all";
    this.#page = "people";
    this.#connectionsOrigin = undefined;
    if (this.#type !== "people") this.#switch("people", selection);
    else {
      if (selection) Object.assign(this.#filters, selection);
      if (this.#visible) void this.refresh();
    }
  }
  destroy() {
    this.setVisible(false);
    this.#unsubscribe();
    this.#resources.destroy();
    this.#cardMenu.destroy();
    this.#optionsMenu.destroy();
    this.#erase();
    this.#clearDialogLayout();
    this.#dialog.remove();
    this.#information.element.remove();
    this.#hiddenSuggestions.element.remove();
    this.#hideSuggestion.element.remove();
  }
  #connectionCount(): number {
    return this.#incomingRequestMembers.filter(member => this.#allowed(member)).length;
  }
  #updateConnectionBadges(): void {
    const count = this.#connectionCount();
    for (const button of this.element.querySelectorAll<HTMLButtonElement>(".kl-match-connections"))
      setMatchConnectionsCount(button, count);
  }
  #clearConnectionSummary(): void {
    this.#summaryRevision++;
    clearTimeout(this.#summaryTimer);
    this.#incomingRequestMembers = [];
    this.#updateConnectionBadges();
  }
  #summaryCurrent(): boolean {
    return this.#visible && this.client.connected && this.options.current() &&
      this.client.memberNumber === this.recovery.owner && this.client.origin === this.recovery.origin;
  }
  #invalidateConnectionSummary(): void {
    this.#clearConnectionSummary();
    if (!this.#summaryCurrent() || this.#summaryQueued) return;
    this.#summaryQueued = true;
    queueMicrotask(() => {
      this.#summaryQueued = false;
      if (this.#summaryCurrent()) void this.#readConnectionSummary(this.#summaryRevision);
    });
  }
  async #readConnectionSummary(revision: number): Promise<void> {
    const current = () => revision === this.#summaryRevision && this.#summaryCurrent();
    try {
      const { source, requestSummary } = await this.recovery.peopleCapabilities(current);
      if (!current() || !requestSummary) return;
      const summary = checkedMatchRequestSummary(await this.#read("/v1/matching/requests/summary", source), this.recovery.owner);
      if (!current()) return;
      this.#incomingRequestMembers = summary.memberNumbers;
      this.#updateConnectionBadges();
      if (summary.nextExpiresAt !== null) {
        this.#summaryTimer = setTimeout(() => this.#invalidateConnectionSummary(),
          Math.min(2147483647, summary.nextExpiresAt - summary.serverNow));
      }
    } catch {
      // The optional count can be absent while the catalog remains usable.
    }
  }
  #invalidate() {
    if (!this.#visible || this.#type!=="people") return;
    this.#hideSuggestion.close();
    this.#information.close();
    this.#items = [];
    this.#requests = [];
    this.#next = null;
    if (!this.#editor || !this.#dialog.contains(this.#editor.element)) {
      this.#dialog.close();
      this.#dialog.replaceChildren();
    }
    if (this.#search.composing) this.#results.replaceChildren(matchingCatalogLoading());
    this.#draw();
    if (this.#busy || this.#search.composing) {
      this.#refreshAfter = true;
      return;
    }
    this.#busy = true;
    this.#draw();
    if (!this.#queued) {
      this.#queued = true;
      queueMicrotask(() => {
        this.#queued = false;
        if (this.#current()) void this.refresh();
      });
    }
  }
  #readPending() {
    this.#storageError = "";
    try {
      this.#pending = this.recovery.read();
    } catch (e) {
      this.#pending = null;
      this.#storageError =
        e instanceof Error ? e.message : "Saved request unavailable.";
    }
  }
  #button(label: string, fn: () => void, write = false) {
    const b = element("button", {
      type: "button",
      className: "kl-text-button",
      text: label,
    });
    b.addEventListener("click", () => {
      if (
        b.isConnected && this.#current() &&
        !this.#busy &&
        (!write || (!this.#pending && !this.#storageError))
      )
        fn();
    });
    b.dataset.matchWrite = String(write);
    b.disabled =
      this.#busy || (write && !!(this.#pending || this.#storageError));
    return b;
  }
  #select(
    label: string,
    values: readonly string[],
    value: string,
    write: (v: string) => void,
    labels?: readonly string[],
  ) {
    const select = element("select", { ariaLabel: label });
    values.forEach((v, i) =>
      select.append(element("option", { value: v, text: labels?.[i] ?? v })),
    );
    select.value = value;
    select.disabled = this.#busy;
    select.addEventListener("change", () => {
      if (select.isConnected && this.#current() && !this.#busy) write(select.value);
    });
    return select;
  }
  #show(...nodes: Node[]) {
    this.#clearDialogLayout();
    this.#dialog.replaceChildren(...nodes);
    if (!this.#dialog.open) this.#dialog.showModal();
  }
  #clearDialogLayout() {
    this.#releaseDialogFit?.();
    this.#releaseDialogFit = undefined;
    this.#dialogReturnFocus = undefined;
    delete this.#dialog.dataset.layout;
    this.#dialog.removeAttribute("aria-labelledby");
    for (const property of ["inset", "max-width", "max-height", "--kl-dialog-viewport-height"]) this.#dialog.style.removeProperty(property);
  }
  #showDetails(title: string, layout: "filters" | "why" | "request-compose" | "request-review" | "connection-detail" | "connection-decision" | "signal-needed", body: HTMLElement, actions: HTMLElement, returnFocus: string) {
    this.#clearDialogLayout();
    const heading = element("h2", { text: title });
    heading.id = this.#dialogTitleId;
    const close = element("button", { type: "button", className: "kl-icon-button", ariaLabel: "Close dialog" }, kikiIcon("close"));
    close.onclick = () => this.#dialog.close();
    body.classList.add("kl-match-dialog-body");
    this.#dialog.dataset.layout = layout;
    this.#dialog.setAttribute("aria-labelledby", heading.id);
    this.#dialogReturnFocus = returnFocus;
    this.#dialog.replaceChildren(
      element("header", { className: "kl-match-dialog-header" },
        element("div", {}, element("span", { className: "kl-match-dialog-eyebrow", text: "KikiLink" }), heading), close),
      body, actions,
    );
    if (!this.#dialog.open) this.#dialog.showModal();
    this.#releaseDialogFit = fitPanelDialog(this.#dialog, {
      layout: (width, height) => layout === "filters" && width <= 700
        ? { marginX: 0, marginY: 0, maxHeight: height - 20 }
        : { marginX: 12, marginY: 12 },
    });
    (body.querySelector("select") ?? actions.querySelector("button"))?.focus({ preventScroll: true });
  }
  #closeEditor() {
    this.#editor = undefined;
    this.#editorSource = undefined;
    this.#draw();
    this.#dialog.close();
  }
  async refresh(more = false): Promise<void> {
    if (!this.#current()) return;
    if (this.#page === "people") {
      if (this.#search.composing) return;
      if (more && this.#search.pending) return;
      this.#search.consume();
    }
    this.#hideSuggestion.close();
    this.#information.close(false);
    const token = ++this.#token,
      valid = this.#valid(),
      prior = this.#next;
    const searchRevision = this.#search.revision;
    const currentSearch = () => this.#page !== "people" || searchRevision === this.#search.revision;
    const catalog = !more;
    let readingCatalog = false;
    let verifiedOwn: MatchOwn | undefined;
    this.#busy = true;
    this.#message = "";
    this.#catalogState = catalog ? 'loading' : undefined;
    this.#readPending();
    if (!more) {
      this.#items = [];
      this.#requests = [];
      this.#next = null;
    }
    this.#draw();
    try {
      const { source, activeRequests, suggestions } = await this.recovery.peopleCapabilities(valid);
      if (!valid() || token !== this.#token) return;
      if(more&&!sameMatchingSource(source,this.#source))throw new MatchingGenerationError();
      if (!sameMatchingSource(source, this.#source)) {
        this.#hiddenSuggestions.close();
        this.#lastHide = undefined;
      }
      this.#source=source;
      if(this.#editorSource&&!sameMatchingSource(source,this.#editorSource))this.#editor?.hold();
      this.#supported = true;
      const own = checkedMatchOwn(
        await this.#read("/v1/matching/me"),
        this.recovery.owner,
      );
      if (!valid() || token !== this.#token) return;
      this.#own = verifiedOwn = this.#bind(own);
      this.#schedule(own.serverNow);
      let serverNow = own.serverNow;
      if (this.#page === "people") {
        if (!currentSearch()) return;
        const q = new URLSearchParams({
          ...Object.fromEntries(
            Object.entries(this.#filters).map(([k, v]) => [k, String(v)]),
          ),
          limit: "20",
          cursor: more ? String(prior ?? "") : "",
        });
        if (suggestions) q.set("suggestions", "1");
        if (activeRequests) q.set("includeConnection", "1");
        readingCatalog = catalog;
        const result = checkedMatchPage(
          await this.#read("/v1/matching/people?" + q),
          this.recovery.owner,
        );
        readingCatalog = false;
        if (!valid() || token !== this.#token || !currentSearch()) return;
        const rows = result.items.filter((c) => this.#allowed(c.memberNumber) && (this.#filters.scope !== "all" || !this.options.known?.(c.memberNumber))).map(c=>this.#bind(c));
        if (
          more &&
          rows.some((c) =>
            this.#items.some((old) => old.memberNumber === c.memberNumber),
          )
        )
          throw new Error("Suggestions changed. Refresh before continuing.");
        this.#items = [...(more ? this.#items : []), ...rows];
        this.#next = result.nextCursor;
        serverNow = result.serverNow;
      } else {
        readingCatalog = catalog;
        const result = checkedMatchRequests(
          await this.#read(
            `/v1/matching/requests?scope=${this.#connectionScope}&state=${this.#connectionState}&limit=20&cursor=${more ? (prior ?? 0) : 0}`,
          ),
          this.recovery.owner,
        );
        readingCatalog = false;
        if (!valid() || token !== this.#token) return;
        this.#requests = [
          ...(more ? this.#requests : []),
          ...result.items.map((r) => this.#bind(this.#safeRequest(r))),
        ];
        this.#next = result.nextCursor;
        serverNow = result.serverNow;
      }
      this.#schedule(serverNow);
    } catch (e) {
      if (!valid() || token !== this.#token || !currentSearch()) return;
      this.#items = [];
      this.#requests = [];
      this.#next = null;
      if (readingCatalog && matchingCatalogReadFailed(e)) this.#catalogState = 'error';
      else this.#message = e instanceof Error ? e.message : "Matching could not load.";
    } finally {
      if (valid() && token === this.#token) {
        this.#busy = false;
        if (this.#catalogState === 'loading') this.#catalogState = undefined;
        if (this.#openSignalAfterRefresh) this.#readPending();
        this.#draw();
        if (this.#refreshAfter) {
          this.#refreshAfter = false;
          this.#invalidate();
        } else if (this.#resourceRecommendation || this.#recommendationAction && this.#page === "connections") {
          this.#prepareRecommendationAction();
        } else {
          const recommendationAction = this.#recommendationAction;
          this.#recommendationAction = undefined;
          const openSignal = this.#openSignalAfterRefresh;
          this.#openSignalAfterRefresh = false;
          if (verifiedOwn && this.client.connected && this.element.isConnected && !this.#dialog.open) {
            if (recommendationAction) {
              const { member, action } = recommendationAction;
              if (action === "why") void this.#why(member, this.#source, matchOptionsSelector, true);
              else void this.#compose(member, this.#source, matchOptionsSelector, undefined, true);
            } else if (openSignal && !this.#pending && !this.#storageError) this.#openEditor(verifiedOwn);
          }
          this.#search.flush();
        }
      }
    }
  }
  #schedule(now: number) {
    clearTimeout(this.#timer);
    const times = [
      ...this.#items.flatMap((c) => [c.expiresAt, c.activeConnection?.expiresAt]),
      ...this.#requests
        .filter((r) => r.state === "Pending")
        .map((r) => r.expiresAt),
    ].filter((v): v is number => typeof v === "number" && v > now);
    const own = this.#own;
    const expiry = own?.signal.expiresAt;
    const ownDelay = own?.active && typeof expiry === "number" && expiry > own.serverNow
      ? expiry - Math.max(now, own.serverNow + Math.max(0, Date.now() - (this.#observedAt.get(own) ?? Date.now())))
      : Infinity;
    const delay = Math.min(ownDelay, Math.min(...times) - now);
    if (Number.isFinite(delay))
      this.#timer = setTimeout(
        () => this.#invalidate(),
        Math.max(30, Math.min(2147483647, delay + 30)),
      );
  }
  #safeRequest(r: MatchRequest): MatchRequest {
    return r.peer && !this.#allowed(r.peer.memberNumber)
      ? {
          ...r,
          peer: null,
          peerRevision: null,
          intent: null,
          message: null,
          canAccept: false,
        }
      : r;
  }
  #setupTypeTabs(): void {
    this.#results.id = `${this.#tabIdPrefix}-people-results`;
    this.#resources.results.id = `${this.#tabIdPrefix}-resource-results`;
    for (const type of matchingTypes) {
      const panel = type === "people" ? this.#results : this.#resources.results;
      const tab = element("button", {
        type: "button", className: "kl-text-button", role: "tab", text: type[0]!.toUpperCase() + type.slice(1),
      });
      tab.id = `${this.#tabIdPrefix}-${type}`;
      tab.setAttribute("aria-controls", panel.id);
      tab.onclick = () => {
        if (!tab.isConnected || !this.#visible || !this.options.current() ||
          this.client.memberNumber !== this.recovery.owner || this.client.origin !== this.recovery.origin ||
          this.#busy || this.#resources.busy) return;
        this.#clearRecommendationAction();
        const changed = type !== this.#type || this.#page === "connections";
        const origin = this.#connectionsOrigin ?? this.#type;
        const selection = origin === "people" ? matchingBrowseSelection(this.#filters) : this.#resources.browseSelection;
        if (selection.scope === "hidden" && type !== origin) selection.scope = "all";
        if (this.#page === "connections") {
          this.#connectionsOrigin = undefined;
          this.#page = "people";
          if (type === this.#type) {
            Object.assign(this.#filters, selection);
            void this.refresh();
          }
        }
        this.#switch(type, selection);
        if (changed) this.#saveBrowse();
        tab.focus({ preventScroll: true });
      };
      this.#tabs.set(type, tab);
      this.#types.append(tab);
    }
    this.#types.onkeydown = event => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        !(event.target instanceof HTMLButtonElement) || !this.#types.contains(event.target)) return;
      const index = matchingTypes.indexOf(this.#type);
      const last = matchingTypes.length - 1;
      let next: number;
      switch (event.key) {
        case "Home": next = 0; break;
        case "End": next = last; break;
        case "ArrowLeft": next = (index + last) % matchingTypes.length; break;
        case "ArrowRight": next = (index + 1) % matchingTypes.length; break;
        default: return;
      }
      event.preventDefault();
      event.stopPropagation();
      this.#tabs.get(matchingTypes[next]!)?.click();
    };
  }
  #updateTypeTabs(busy: boolean): void {
    for (const [type, tab] of this.#tabs) {
      const selected = type === this.#type;
      tab.tabIndex = selected ? 0 : -1;
      tab.setAttribute("aria-selected", String(selected));
      if (busy && !selected) tab.setAttribute("aria-disabled", "true");
      else tab.removeAttribute("aria-disabled");
    }
    this.#results.setAttribute("aria-labelledby", this.#tabs.get("people")!.id);
    const resourceType = this.#type === "people" ? "groups" : this.#type;
    this.#resources.results.setAttribute("aria-labelledby", this.#tabs.get(resourceType)!.id);
  }
  #switch(type: MatchingType, selection?: MatchingBrowseSelection, browse = false): void {
    if (type === this.#type || this.#busy || this.#resources.busy) return;
    this.#search.cancel();
    this.#openSignalAfterRefresh = false;
    this.#lastHide = undefined;
    this.#type = type;
    this.#epoch++;
    this.#token++;
    this.#items = [];
    this.#requests = [];
    this.#next = null;
    this.#dialog.close();
    this.#information.close();
    this.#hiddenSuggestions.close();
    this.#hideSuggestion.close();
    if (!this.#editor) this.#dialog.replaceChildren();
    this.#body.hidden = type !== "people";
    this.#resources.setVisible(false);
    if (type !== "people") {
      this.#resources.setKind(type, selection);
      if (browse) this.#resources.showBrowse();
      this.#resources.setVisible(this.#visible);
    } else {
      if (selection) Object.assign(this.#filters, selection);
      if (this.#visible) void this.refresh();
    }
    this.#draw();
  }
  #draw() {
    if (this.#search.composing) return;
    const active = focusedElement(this.#body);
    const optionsFocused = !!active && (this.#optionsMenu.element.contains(active) ||
      this.#body.contains(active) && active.matches(matchOptionsSelector));
    const focusedSearch = active instanceof HTMLInputElement &&
      this.#body.contains(active) && active.matches('.kl-match-search input') ? active : undefined;
    this.#cardMenu.close(false);
    this.#optionsMenu.close(false);
    this.#updateTypeTabs(this.#busy || this.#resources.busy);
    this.#results.replaceChildren();
    this.#body.hidden=this.#type!=="people";
    this.element.setAttribute("aria-busy", String(this.#busy));
    if (this.#type !== "people") {
      this.#body.replaceChildren(this.#results);
      return;
    }
    const mySignal = this.#button(this.#editor ? "Resume signal draft" : "My signal",
      () => this.#openEditor(undefined, ".kl-match-my-signal"), true);
    mySignal.classList.add("kl-match-my-signal");
    if (this.#own && !this.#own.active) mySignal.classList.add("kl-text-button--primary");
    const options = matchOptionsButton(this.#optionsMenu, () => this.#current() && this.client.connected && !this.#busy, [
      { label: "My matching signal", icon: "heart", disabled: !this.#own || !!(this.#pending || this.#storageError),
        run: () => this.#openEditor(this.#own, matchOptionsSelector) },
      { label: "Profile preferences", icon: "settings", run: this.options.preferences },
      ...(this.#page === "people" && this.#own
        ? [{ label: "Hidden suggestions", icon: "eye" as const, run: () => this.#openHiddenSuggestions(matchOptionsSelector) }] : []),
      { label: "Refresh", icon: "refresh", separator: true, run: () => {
        this.#invalidateConnectionSummary();
        void this.refresh();
      } },
      { label: "Manage saved & hidden", icon: "bookmark", run: () => void this.#manageChoices() },
    ]);
    const actions = element(
      "div",
      { className: "kl-match-actions" },
      mySignal,
      this.#page === "people"
        ? matchConnectionsButton(this.#button("Connections", () => this.#openConnections()), this.#connectionCount())
        : this.#button("Find matches", () => this.#findMatches()),
      options,
    );
    if (this.#own) actions.append(matchingInformationButton(this.#button("Matching information", () => this.#showInformation())));
    if (this.#requestDraft) {
      const resume = this.#button("Resume connection draft", () => {
        const draft = this.#requestDraft;
        if (draft) void this.#compose(draft.target, draft.source, ".kl-match-resume-request");
      }, true);
      resume.classList.add("kl-match-resume-request");
      actions.append(resume);
    }
    this.#body.replaceChildren(
      element(
        "header",
        { className: "kl-match-header" },
        element("h1", {
          text: this.#page === "people" ? "Matches" : "Connections",
        }),
        actions,
      ),
    );
    if (optionsFocused && this.#current()) options.focus({ preventScroll: true });
    if (this.#pending) {
      const p = this.#pending;
      this.#body.append(
        element(
          "section",
          { className: "kl-match-pending" },
          element("strong", {
            text: p.confirmed
              ? "Confirmed request · finish saving locally"
              : "A Matching request is waiting for recovery",
          }),
          note(
            "Reload and reconnect never send it again. Retry checks the exact saved request; Forget only clears this device’s copy.",
          ),
          element(
            "div",
            { className: "kl-match-actions" },
            this.#button("Review saved request", () => this.#pendingReview(p)),
            this.#button(
              p.confirmed ? "Finish local cleanup" : "Retry saved request",
              () => void this.#retry(p),
            ),
          ),
        ),
      );
    }
    if (this.#storageError)
      this.#body.append(
        element("p", { role: "alert", text: this.#storageError }),
      );
    if (this.#message)
      this.#body.append(element("p", { role: "alert", text: this.#message }));
    if (this.#busy && this.#catalogState !== 'loading')
      this.#body.append(
        element("p", { role: "status", text: "Loading Matching…" }),
      );
    const own = this.#own;
    if (own) {
      const status = matchSignalStatus(own, this.#observedAt.get(own) ?? Date.now());
      const signalAction = this.#button(
        status === "Available" ? "Pause signal" : "Set up my signal",
        () => (status === "Available" ? void this.#pause() : this.#openEditor(own, ".kl-match-signal-action")),
        true,
      );
      signalAction.classList.add("kl-match-signal-action");
      this.#body.append(matchSignalBar(own, status, signalAction, this.#button("Preferences", this.options.preferences)));
    }
    const hide = this.#lastHide;
    if (hide && this.#page === "people" && this.client.connected) {
      this.#body.append(hiddenSuggestionNotice(this.#button("Undo", () => void this.#undoHide(hide), true)));
    }
    this.#body.append(this.#types);
    if (this.#visible && active && this.#types.contains(active)) active.focus({ preventScroll: true });
    if (!this.#supported || !own) {
      this.#body.append(this.#results);
      if (this.#catalogState === 'loading') this.#results.append(matchingCatalogLoading());
      return;
    }
    if (this.#page === "people") {
      const search = element("input", {
        type: "search",
        ariaLabel: "Search shared suggestions",
        placeholder: "Search shared names, interests, places…",
        value: this.#filters.query,
        maxLength: 160,
      });
      const searchControl = this.#search.bind(search, query => {
        if (this.#filters.query === query) return false;
        this.#filters.query = query;
        this.#saveBrowse();
        this.#items = [];
        this.#next = null;
        this.#results.replaceChildren(matchingCatalogLoading());
        return true;
      }, () => {
        if (this.#busy) return;
        if (this.#refreshAfter) {
          this.#refreshAfter = false;
          this.#invalidate();
        } else if (!this.#search.pending) this.#draw();
      });
      const form = element(
        "form",
        { className: "kl-match-toolbar" },
        searchControl,
        matchScopeControls(this.#filters.scope, (scope, label) => this.#button(label, () => this.#setScope(scope))),
        this.#filterButton(),
        this.#select(
          "Sort suggestions",
          ["recommended", "compatibility", "time", "name"],
          this.#filters.sort,
          (v) => {
            this.#filters.sort = v as MatchFilters["sort"];
            this.#applyBrowse();
          },
          ["Recommended", "Compatibility", "Shared time", "Name"],
        ),
      );
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (form.isConnected) this.#search.submit();
      });
      this.#body.append(form, this.#results);
      if (focusedSearch) {
        search.focus({ preventScroll: true });
        search.setSelectionRange(focusedSearch.selectionStart ?? search.value.length,
          focusedSearch.selectionEnd ?? search.value.length, focusedSearch.selectionDirection ?? undefined);
      }
      if (this.#search.pending) { this.#results.append(matchingCatalogLoading()); return; }
      if (this.#drawCatalogState(search)) return;
      const visible = this.#items.filter(c => this.#allowed(c.memberNumber));
      if (!this.#busy && !this.#message)
        this.#results.append(matchSuggestionCount(visible.length, this.#next !== null));
      if (visible.length) this.#results.append(
        element(
          "div",
          { className: "kl-match-grid" },
          ...visible.map(c => this.#card(c)),
        ),
      );
      if (!this.#busy && !this.#message && !visible.length && this.#next === null)
        this.#results.append(
          matchEmptySuggestions(
            this.#button("Reset filters", () => {
              this.#filters = structuredClone(DEFAULT_MATCH_FILTERS);
              search.focus({ preventScroll: true });
              this.#applyBrowse();
            }),
            this.#hiddenButton(".kl-match-empty .kl-match-hidden-trigger"),
          ),
        );
    } else {
      this.#body.append(
        element(
          "div",
          { className: "kl-match-toolbar" },
          element("span", { className: "kl-match-meta", text: "Show" }),
          this.#select(
            "Connection direction",
            ["all", "incoming", "outgoing"],
            this.#connectionScope,
            (v) => {
              this.#connectionScope = v;
              void this.refresh();
            },
            ["All connections", "Incoming", "Outgoing"],
          ),
          this.#select(
            "Connection status",
            ["all", ...MATCH_STATES],
            this.#connectionState,
            (v) => {
              this.#connectionState = v;
              void this.refresh();
            },
            ["Any status", ...MATCH_STATES],
          ),
          note("Pending requests expire after 24 hours."),
        ),
      );
      this.#body.append(this.#results);
      if (this.#drawCatalogState(this.#tabs.get("people")!)) return;
      const list = element("div", { className: "kl-match-connection-list" });
      for (const r of this.#requests) {
        const current = this.#safeRequest(r);
        const card = element(
          "article",
          { className: "kl-match-card kl-match-connection-card" },
          element("div", { className: "kl-match-person" },
            current.peer ? this.#avatar(current.peer.name, current.peer.memberNumber) : element("span", { className: "kl-match-avatar kl-match-avatar--resource", ariaHidden: "true" }, kikiIcon("lock")),
            element("div", {}, element("strong", { text: current.peer?.name ?? "Unavailable connection" }),
              element("p", { className: "kl-match-meta" },
                element("span", { className: "kl-match-connection-direction", text: current.direction }), " · ",
                bindClockText(element("time"), current.updatedAt, "medium-date-time"))),
            element("span", { className: "kl-match-card-tag", text: current.state }),
          ),
          current.peer ? (current.intent ? note(current.intent) : undefined)
            : note("This connection’s profile is no longer available."),
          current.message ? element("p", { className: "kl-match-request-message", text: current.message }) : undefined,
          element("div", { className: "kl-match-connection-actions" }, this.#button(
            "Review connection",
            () => void this.#reviewRequest(r.id, this.#sourceOf(r)),
          )),
        );
        card.dataset.connection = r.id;
        list.append(card);
      }
      this.#results.append(list);
      if (!this.#busy && !this.#message && !this.#requests.length && this.#next === null) {
        const find = this.#button("Find matches", () => this.#findMatches());
        find.classList.add("kl-text-button--primary");
        this.#results.append(
          element("section", { className: "kl-match-empty" }, kikiIcon("heart"),
            element("h2", { text: "No connections in this view" }),
            note("Find a shared interest and create a request when your signal is available."),
            find,
          ),
        );
      }
    }
    if (this.#next !== null)
      this.#results.append(
        pageAction(this.#button(
          this.#page === "people" ? "Load more suggestions" : "Load more connections",
          () => void this.refresh(true),
        )),
      );
  }
  #drawCatalogState(returnFocus: HTMLElement): boolean {
    if (this.#catalogState === 'loading') {
      this.#results.append(matchingCatalogLoading());
      return true;
    }
    if (this.#catalogState === 'error') {
      const error = matchingCatalogError(() => {
        if (!error.isConnected || !this.#current() || this.#busy) return;
        if (error.contains(focusedElement(error) ?? null)) returnFocus.focus({ preventScroll: true });
        void this.refresh();
      });
      this.#results.append(error);
      return true;
    }
    return false;
  }
  #openConnections(): void {
    if (this.#page === "connections" || this.#busy || this.#resources.busy || !this.client.connected) return;
    this.#search.cancel();
    const origin = this.#type;
    this.#connectionsOrigin = origin === "people" ? undefined : origin;
    this.#page = "connections";
    if (origin === "people") void this.refresh();
    else this.#switch("people");
    this.#tabs.get("people")?.focus({ preventScroll: true });
  }
  #findMatches(): void {
    const origin = this.#connectionsOrigin;
    this.#connectionsOrigin = undefined;
    this.#page = "people";
    if (origin) {
      this.#switch(origin);
      this.#resources.focusBrowseSearch();
      return;
    }
    void this.refresh();
    this.#body.querySelector<HTMLInputElement>(".kl-match-search input")?.focus({ preventScroll: true });
  }
  #setScope(scope: MatchFilters["scope"]): void {
    if (scope === this.#filters.scope) return;
    this.#filters.scope = scope;
    this.#applyBrowse();
  }
  #showInformation(): void {
    const own = this.#own;
    if (!own || !this.#supported) return;
    const source = this.#source;
    this.#information.open({
      own,
      signal: this.#button("My signal", () => {
        this.#information.close(false);
        this.#openEditor(own, ".kl-match-information-toggle");
      }, true),
      connections: this.#button("Connections", () => {
        this.#information.close(this.#page === "connections");
        this.#openConnections();
      }),
      hidden: this.#hiddenButton(".kl-match-information-toggle"),
      saved: async () => {
        const choices = checkedMatchChoices(await this.#read("/v1/matching/choices", source), this.recovery.owner);
        if (!this.#current() || !sameMatchingSource(source, this.#source)) return [];
        return choices.flatMap(({ saved, hidden, peer, revision, target }) => {
          if (!saved || hidden || !peer || !this.#allowed(target)) return [];
          const candidate = this.#items.find(row => row.memberNumber === target && row.name === peer.name &&
            row.saved && !row.hidden && row.choiceRevision === revision &&
            sameMatchingSource(source, this.#sourceOf(row)));
          return [{
            title: peer.name,
            icon: "profile" as const,
            avatar: this.#avatar(peer.name, peer.memberNumber),
            reason: candidate?.reasons[0],
            open: () => void this.#why(target, source, ".kl-match-information-toggle"),
          }];
        }).slice(0, 3);
      },
    });
  }
  #filterButton() {
    return matchFilterButton(this.#button("Filters", () => this.#filtersDialog()), this.#filters, DEFAULT_MATCH_FILTERS);
  }
  #avatar(name: string, member: number, status?: string | null) {
    return markAvatarPresence(element("span", { className: "kl-match-avatar", ariaHidden: "true", text: Array.from(name.trim()).slice(0, 2).join("").toUpperCase() }), member, status);
  }
  #card(c: MatchCandidate) {
    const openProfile = () => void this.#openProfile(c);
    const more = element("button", { type: "button", className: "kl-icon-button kl-match-card-options",
      ariaLabel: "Suggestion options", title: "Suggestion options" }, kikiIcon("more"));
    more.setAttribute("aria-haspopup", "menu");
    more.setAttribute("aria-expanded", "false");
    const current = () => more.isConnected && this.#current() && this.client.connected && !this.#busy && this.#allowed(c.memberNumber);
    const run = (action: () => void, write = false) => () => {
      if (current() && (!write || !this.#pending && !this.#storageError)) action();
    };
    more.onclick = () => {
      if (!current()) return;
      const locked = !!(this.#pending || this.#storageError);
      this.#cardMenu.open(more, "Suggestion options", [
        { label: c.saved ? "Remove saved suggestion" : "Save suggestion", icon: "bookmark", disabled: locked,
          run: run(() => void this.#choice(c, !c.saved, c.hidden), true) },
        { label: "Why this suggestion?", icon: "info", run: run(() => void this.#why(c.memberNumber, this.#sourceOf(c))) },
        { label: "View profile", icon: "arrow-right", run: run(openProfile) },
        { label: c.hidden ? "Restore suggestion" : "Hide suggestion", icon: c.hidden ? "eye" : "close", disabled: locked,
          run: run(() => c.hidden ? void this.#choice(c, c.saved, false) : this.#confirmHideSuggestion(c), true) },
      ], undefined, false, false);
    };
    const title = this.#button(c.name, openProfile);
    title.className = "kl-match-name";
    title.title = c.name;
    const existing = c.activeConnection;
    const returnFocus = this.#requestCardOpener(c.memberNumber);
    const request = existing
      ? this.#button(existing.state === "Pending" ? "Request pending" : "Connection",
        () => void this.#reviewRequest(existing.id, this.#sourceOf(c), { target: c.memberNumber, returnFocus }))
      : this.#button("Request connection", () => void this.#compose(c.memberNumber, this.#sourceOf(c)), true);
    request.classList.add("kl-text-button--primary", "kl-match-request-trigger");
    if (!existing && !c.canRequest) {
      request.disabled = true;
      request.title = "This person is currently unavailable for new requests.";
    }
    const why = this.#button("Why this match?", () => void this.#why(c.memberNumber, this.#sourceOf(c),
      `.kl-match-card[data-member="${c.memberNumber}"] .kl-match-card-why`));
    why.classList.add("kl-match-card-why");
    const profile = this.#button("Profile", openProfile);
    profile.classList.add("kl-match-card-link");
    const score = c.compatibility?.score;
    const presence = c.status === "online" ? "Online" : c.status === "idle" ? "Idle" : c.status === "dnd" ? "Do not disturb" : "";
    const card = element("article", { className: "kl-match-card" });
    card.dataset.member = String(c.memberNumber);
    card.append(
      element(
        "div",
        { className: "kl-match-person" },
        this.#avatar(c.name, c.memberNumber, c.status),
        element(
          "div",
          {},
          title,
          element("div", { className: "kl-match-card-meta" },
            presence ? element("span", { text: presence }) : undefined,
            element("span", { text: c.languages.join(" · ") || "Language not shared" }),
            c.saved ? element("span", { className: "kl-match-card-tag", text: "Saved" }) : undefined,
          ),
        ),
        more,
      ),
      ...(c.note ? [element("p", { text: c.note })] : []),
      element("div", { className: "kl-match-metrics" },
        score != null ? element("span", {}, element("strong", { text: `${score}%` }), " compatibility")
          : element("span", { text: "Compatibility unavailable" }),
        element("span", {}, c.availability?.status ?? "Availability not shared"),
        c.overlapMinutes != null ? element("span", { text: `${c.overlapMinutes} min shared weekly time` }) : undefined,
      ),
      element(
        "ul",
        { className: "kl-match-reasons" },
        ...c.reasons.slice(0, 3).map(text => element("li", {}, kikiIcon("check"), element("span", { text }))),
      ),
      element(
        "div",
        { className: "kl-match-actions" },
        ...(c.signalRevision > 0 ? [request] : []),
        why,
        profile,
      ),
    );
    return card;
  }
  async #readCandidate(
    target: number,
    valid: () => boolean,
    source=this.#source,
    fromRecommendation = false,
  ): Promise<MatchCandidate> {
    if (!this.#allowed(target)) throw new Error("This person is unavailable.");
    const capabilities = await this.recovery.peopleCapabilities(valid);
    if (!sameMatchingSource(source, capabilities.source)) throw new MatchingGenerationError();
    const query = new URLSearchParams({ priority: this.#filters.priority });
    if (capabilities.suggestions) query.set("suggestions", "1");
    if (capabilities.activeRequests) query.set("includeConnection", "1");
    const c = checkedMatchCandidate(
      await this.#read(
        `/v1/matching/people/${target}?${query}`, source,
      ),
      this.recovery.owner,
    );
    if (fromRecommendation && c.hidden) throw new CloudError("matching_unavailable", 404);
    if (!valid() || c.memberNumber !== target || !this.#allowed(target) ||
      fromRecommendation && this.#recommendationActionMember !== target)
      throw new Error("The account or suggestion changed.");
    return this.#bind(c,source);
  }
  async #inspect(run: (valid: () => boolean) => Promise<void>) {
    if (!this.#current() || this.#busy) return;
    const valid = this.#valid();
    this.#busy = true;
    this.#message = "";
    this.#draw();
    try {
      await run(valid);
    } catch (e) {
      if (valid())
        this.#message =
          e instanceof Error ? e.message : "This action is unavailable.";
    } finally {
      if (valid()) {
        this.#busy = false;
        this.#readPending();
        for (const el of this.#dialog.querySelectorAll<
          HTMLButtonElement | HTMLSelectElement
        >("button[data-match-write],select"))
          el.disabled =
            el.dataset.matchWrite === "true" &&
            !!(this.#pending || this.#storageError);
        this.#draw();
        if (this.#refreshAfter) {
          this.#refreshAfter = false;
          this.#invalidate();
        } else if (this.#recommendationAction || this.#resourceRecommendation) this.#prepareRecommendationAction();
        else this.#search.flush();
      }
    }
  }
  async #openProfile(c: MatchCandidate) {
    await this.#inspect(async (valid) => {
      const fresh = await this.#readCandidate(c.memberNumber, valid,this.#sourceOf(c));
      if (valid()) this.options.profile(fresh.memberNumber, fresh.name);
    });
  }
  async #why(target: number, source = this.#source,
    returnFocus = `.kl-match-card[data-member="${target}"] .kl-match-card-options`, fromRecommendation = false) {
    await this.#inspect(async (valid) => {
      const c = await this.#readCandidate(target, valid, source, fromRecommendation);
      if (!valid() || this.#refreshAfter) return;
      const body = element("div", {},
        element("div", { className: "kl-match-why-summary" }, this.#avatar(c.name, c.memberNumber, c.status),
          element("div", {}, element("h3", { text: c.name }),
            element("p", {}, element("strong", { text: `${c.score}/100 suggestion score` }), ` · ${c.coverage}% information coverage`),
            c.compatibility?.status === "available"
              ? element("p", {}, element("strong", { text: `${c.compatibility.score}% compatibility` }), " is a separate comparison of shared ratings.")
              : element("p", { text: "Compatibility is unavailable. It is not counted as a zero match." }))),
        note("Ranking points from shared information, not a probability. Missing factors add no points."),
        matchingBreakdown(c.breakdown),
        ...(c.compatibility?.hardLimitConflictCount
          ? [
              note(
                `${c.compatibility.hardLimitConflictCount} shared hard-limit conflicts. A score does not override boundaries.`,
              ),
            ]
          : []),
        ...(c.compatibility?.details.length
          ? [
              element("section", { className: "kl-match-compat-details" },
                element("h3", { text: "Shared preference comparison" }),
                ...c.compatibility.details.map((x) => element("div", { className: "kl-match-rating-row" },
                  element("strong", { text: catalogById.get(x.id)?.label ?? MATCH_INTERESTS.find(item => item.id === x.id)?.label ?? x.id }),
                  element("span", { text: `You: ${PREFERENCE_LEVEL_LABELS[x.yours as PreferenceLevel]}` }),
                  element("span", { text: `Them: ${PREFERENCE_LEVEL_LABELS[x.theirs as PreferenceLevel]}` })))),
            ]
          : c.compatibility?.status === "available" ? [note("Only overall compatibility is shared.")] : []),
      );
      this.#showDetails("Why this suggestion?", "why", body,
        element("footer", {}, this.#button("Close", () => this.#dialog.close())),
        returnFocus);
    });
  }
  #openEditor(own = this.#own, returnFocus?: string) {
    if (!own) return;
    if (!this.#editor){
      this.#editorSource=this.#sourceOf(own);
      this.#editor = new MatchingSignalEditor(own, {
        current:()=>this.#current()&&this.#dialog.open,
        writable:()=>!this.#pending&&!this.#storageError,
        save: (signal, expiry) => this.#saveSignal(signal, expiry),
        close: () => this.#closeEditor(),
        privacy: () => {
          this.#dialog.close();
          this.options.privacy();
        },
      });
    }
    this.#clearDialogLayout();
    this.#dialogReturnFocus = returnFocus ?? ".kl-match-my-signal";
    this.#releaseDialogFit = this.#editor.mount(this.#dialog);
  }
  async #saveSignal(signal: MatchOwn["signal"], expiry: MatchExpiry) {
    const own=this.#editor?.own,source=this.#editorSource;
    if(!own||!source)throw new Error('Reopen the signal editor.');
    const valid=this.#valid();
    const next = signalWithExpiry(signal, expiry, own.serverNow, this.#observedAt.get(own) ?? Date.now());
    await this.#perform(
      "PUT",
      "/v1/matching/me",
      {
        operationId: crypto.randomUUID(),
        revision: own.revision,
        signal: next,
      },
      valid,source,
      "Save your original signal",
    );
    if (valid()) {
      this.#closeEditor();
      await this.refresh();
    }
  }
  async #pause() {
    await this.#inspect(async (valid) => {
      const own=this.#own;
      if (!own || !valid() || matchSignalStatus(own, this.#observedAt.get(own) ?? Date.now()) !== "Available") return;
      await this.#perform(
        "PUT",
        "/v1/matching/me",
        {
          operationId: crypto.randomUUID(),
          revision: own.revision,
          signal: { ...own.signal, published: false },
        },
        valid,this.#sourceOf(own),"Pause your original signal",
      );
    });
    if (this.#current() && !this.#message) await this.refresh();
  }
  async #perform(
    method: "PUT" | "POST",
    path: string,
    body: MatchingPending["body"],
    valid: () => boolean,
    source:MatchingSource,
    label:string,
  ) {
    this.#readPending();
    if (this.#pending || this.#storageError)
      throw new Error("Recover the saved Matching request first.");
    const pending: MatchingPending = {
      format: 3,
      source:structuredClone(source),label:label.slice(0,240),
      method,
      path,
      body:structuredClone(body),
      createdAt: Date.now(),
      confirmed: false,
    };
    await this.recovery.prepare(pending, valid);
    this.#readPending();
    try{await this.recovery.run(pending, valid);}finally{if(valid()){this.#invalidateConnectionSummary();this.#readPending();this.#draw();}}
    return pending;
  }
  async #retry(p: MatchingPending) {
    await this.#inspect(async (valid) => {
      await this.recovery.run(p, valid);
      if (valid()) this.#invalidateConnectionSummary();
      const hide = confirmedHide(p, "/v1/matching/choices/");
      if (valid() && hide && this.#page === "people" && sameMatchingSource(hide.source, this.#source)) this.#lastHide = hide;
      this.#readPending();
      this.#editor = undefined;
      this.#requestDraft = undefined;
      this.#dialog.close();
    });
    if (this.#current() && !this.#message) await this.refresh();
  }
  #pendingReview(p: MatchingPending) {
    this.#show(
      element("h2", { text: "Saved Matching request" }),
      note(
        p.label ? p.label : p.path === "/v1/matching/me"
          ? "Save your signal"
          : p.path.includes("/choices/")
            ? "Update a saved or hidden suggestion"
            : p.path.endsWith("/decision")
              ? `Connection: ${String(p.body.action)}`
              : "Send a connection request",
      ),
      ...(p.format!==1?[element('pre',{className:'kl-match-original',ariaLabel:'Original Matching values',text:matchingPendingText(p.body)})]:[]),
      ...(typeof p.body.message === "string"
        ? [element("p", { text: p.body.message })]
        : []),
      note(
        "A request already sent may have completed. Forget does not cancel a server action.",
      ),
      element(
        "footer",
        {},
        this.#button("Keep saved request", () => this.#dialog.close()),
        ...(!p.confirmed
          ? [
              this.#button("Forget saved request", () =>
                this.#show(
                  element("h2", {
                    text: "Forget this device’s saved request?",
                  }),
                  note(
                    "Refresh Matching afterward. A completed server action stays in effect.",
                  ),
                  this.#button("Cancel", () => this.#dialog.close()),
                  this.#button(
                    "Confirm forget",
                    () =>
                      void this.#inspect(async (valid) => {
                        await this.recovery.forget(p, valid);
                        this.#readPending();
                        this.#editor=undefined;this.#editorSource=undefined;this.#requestDraft=undefined;
                        this.#dialog.close();
                      }),
                  ),
                ),
              ),
            ]
          : []),
      ),
    );
  }
  #confirmHideSuggestion(candidate: MatchCandidate): void {
    const source = this.#sourceOf(candidate);
    const valid = this.#valid();
    const current = () => valid() && this.client.connected && this.#page === "people" && !this.#busy &&
      !candidate.hidden && !this.#pending && !this.#storageError && this.#allowed(candidate.memberNumber) &&
      this.#items.includes(candidate) && sameMatchingSource(source, this.#source);
    if (this.#dialog.open || this.#hiddenSuggestions.element.open) return;
    this.#hideSuggestion.open({
      name: candidate.name,
      current,
      focus: () => {
        if (!valid()) return;
        (this.#body.querySelector<HTMLElement>(`.kl-match-card[data-member="${candidate.memberNumber}"] .kl-match-card-options`) ??
          this.#body.querySelector<HTMLElement>(matchOptionsSelector))?.focus({ preventScroll: true });
      },
      hide: () => void this.#choice(candidate, candidate.saved, true),
    });
  }
  async #choice(c:MatchCandidate, saved: boolean, hidden: boolean) {
    await this.#inspect(async (valid) => {
      const pending = await this.#perform(
        "PUT",
        `/v1/matching/choices/${c.memberNumber}`,
        {
          operationId: crypto.randomUUID(),
          revision: c.choiceRevision,
          saved,
          hidden,
        },
        valid, this.#sourceOf(c), hidden && !c.hidden ? hideSuggestionLabel + c.name : `Update saved / hidden · ${c.name}`,
      );
      const hide = confirmedHide(pending, "/v1/matching/choices/");
      if (valid() && hide) this.#lastHide = hide;
    });
    if (this.#current() && !this.#message) await this.refresh();
  }
  async #undoHide(hide: ConfirmedHide): Promise<void> {
    await this.#inspect(async valid => {
      const current = () => valid() && this.client.connected && this.#lastHide === hide &&
        this.#page === "people" && sameMatchingSource(hide.source, this.#source);
      if (!current()) return;
      const source = await this.recovery.gate(current);
      if (!current()) return;
      if (!sameMatchingSource(hide.source, source)) {
        this.#lastHide = undefined;
        throw new MatchingGenerationError();
      }
      const choices = checkedMatchChoices(await this.#read("/v1/matching/choices", hide.source), this.recovery.owner);
      if (!current()) return;
      const choice = choices.find(row => hide.path === `/v1/matching/choices/${row.target}`);
      if (!matchesConfirmedHide(hide, choice)) {
        this.#lastHide = undefined;
        throw new Error(staleHideMessage);
      }
      try {
        await this.#perform("PUT", hide.path, {
          operationId: crypto.randomUUID(), revision: hide.revision, saved: hide.saved, hidden: false,
        }, current, hide.source, "Undo hide suggestion");
        if (current()) this.#lastHide = undefined;
      } finally {
        if (valid() && this.#pending?.path === hide.path) this.#lastHide = undefined;
      }
    });
    if (this.#current() && !this.#message) await this.refresh();
  }
  #hiddenButton(returnFocus: string): HTMLButtonElement {
    const control = this.#button("Hidden suggestions", () => this.#openHiddenSuggestions(returnFocus));
    control.classList.add("kl-match-hidden-trigger");
    control.setAttribute("aria-haspopup", "dialog");
    return control;
  }
  #openHiddenSuggestions(returnFocus: string): void {
    const source = this.#source;
    const valid = this.#valid();
    const current = () => valid() && this.client.connected && sameMatchingSource(source, this.#source);
    if (!current() || this.#dialog.open || this.#hiddenSuggestions.element.open) return;
    this.#information.close(false);
    this.#hiddenSuggestions.open({
      current,
      focus: () => (this.#body.querySelector<HTMLElement>(returnFocus) ??
        this.#body.querySelector<HTMLElement>(matchOptionsSelector))?.focus({ preventScroll: true }),
      load: async active => {
        if (!sameMatchingSource(source, await this.recovery.gate(active))) throw new MatchingGenerationError();
        const choices = checkedMatchChoices(await this.#read("/v1/matching/choices", source), this.recovery.owner);
        return choices.filter(choice => choice.hidden).map(choice => {
          const title = choice.peer && this.#allowed(choice.target) ? choice.peer.name : "Unavailable suggestion";
          return { key: String(choice.target), title, restore: async () => {
            if (!active() || this.#busy) throw new Error("Matching is updating. Try again.");
            let failure: unknown;
            await this.#inspect(async valid => {
              try {
                await this.#perform("PUT", `/v1/matching/choices/${choice.target}`, {
                  operationId: crypto.randomUUID(), revision: choice.revision, saved: choice.saved, hidden: false,
                }, () => active() && valid(), source, `Restore hidden suggestion · ${title}`);
              } catch (error) { failure = error; }
            });
            if (failure !== undefined) throw failure;
            if (current() && !this.#busy) await this.refresh();
          } };
        });
      },
    });
  }
  async #manageChoices() {
    await this.#inspect(async (valid) => {
      const source=this.#source;
      if(!sameMatchingSource(source,await this.recovery.gate(valid)))throw new MatchingGenerationError();
      const choices = checkedMatchChoices(
        await this.#read("/v1/matching/choices",source),
        this.recovery.owner,
      ).map(c=>this.#bind(c,source));
      if (!valid()) return;
      this.#show(
        element("h2", { text: "Saved & hidden suggestions" }),
        note(
          "Current sharing settings still apply. You can clear a choice even when its person is unavailable.",
        ),
        ...choices
          .filter((c) => c.saved || c.hidden)
          .map((c) =>
            element(
              "article",
              { className: "kl-match-private" },
              element("strong", {
                text:
                  c.peer && this.#allowed(c.target)
                    ? c.peer.name
                    : "Unavailable suggestion",
              }),
              note(
                [c.saved ? "Saved" : "", c.hidden ? "Hidden" : ""]
                  .filter(Boolean)
                  .join(" · "),
              ),
              this.#button(
                "Clear saved & hidden flags",
                () => void this.#clearChoice(c),
                true,
              ),
            ),
          ),
        this.#button("Close", () => this.#dialog.close()),
      );
    });
  }
  async #clearChoice(c: MatchChoice) {
    await this.#inspect(async (valid) => {
      await this.#perform(
        "PUT",
        `/v1/matching/choices/${c.target}`,
        {
          operationId: crypto.randomUUID(),
          revision: c.revision,
          saved: false,
          hidden: false,
        },
        valid,this.#sourceOf(c),`Clear saved / hidden · ${c.peer?.name??"Unavailable suggestion"}`,
      );
      this.#dialog.close();
    });
    if (this.#current() && !this.#message) await this.refresh();
  }
  #filtersDialog(draft = structuredClone(this.#filters)) {
    const form = element("div", { className: "kl-match-form-grid" }),
      field = (label: string, node: HTMLElement) =>
        element(
          "label",
          { className: "kl-match-field" },
          element("span", { text: label }),
          node,
        );
    const choice = (
      key: keyof MatchFilters,
      label: string,
      values: readonly string[],
      labels?: readonly string[],
    ) =>
      form.append(
        field(
          label,
          this.#select(
            label,
            values,
            String(draft[key]),
            (v) => {
              (draft as unknown as Record<string, unknown>)[key] = v;
            },
            labels,
          ),
        ),
      );
    choice("scope", "Suggestion collection", ["all", "saved", "hidden"], ["All", "Saved", "Hidden"]);
    choice(
      "intent",
      "Looking for",
      ["", ...MATCH_INTENTS],
      ["Any intent", ...MATCH_INTENTS],
    );
    const languageOptions = matchLanguageOptions([draft.language]);
    choice(
      "language",
      "Language",
      ["", ...languageOptions],
      ["Any language", ...languageOptions],
    );
    choice(
      "interest",
      "Shared interest",
      ["", ...MATCH_INTERESTS.map((x) => x.id)],
      ["Any interest", ...MATCH_INTERESTS.map((x) => x.label)],
    );
    const communities = new Map(this.#items.flatMap(c => c.communities.map(x => [x.id, x.name] as const)));
    if (draft.community && !communities.has(draft.community)) communities.set(draft.community, "Selected community");
    choice("community", "Shared community", ["", ...communities.keys()], ["Any community", ...communities.values()]);
    choice(
      "timezone",
      "Time zone",
      ["any", "same", "near"],
      ["Any time zone", "Same time zone", "Within two hours"],
    );
    choice(
      "priority",
      "Recommendation priority",
      ["balanced", "compatibility", "time"],
      ["Balanced", "Compatibility", "Shared time"],
    );
    form.append(
      field(
        "Minimum compatibility",
        this.#select(
          "Minimum compatibility",
          ["0", "25", "50", "70", "85"],
          String(draft.minCompatibility),
          (v) => {
            draft.minCompatibility = Number(v);
          },
          ["No minimum", "25%", "50%", "70%", "85%"],
        ),
      ),
    );
    const toggles = element("div", { className: "kl-match-filter-toggles" });
    for (const [key, label] of [
      ["online", "Online now"],
      ["available", "Available now"],
      ["mutual", "Visible mutual connections"],
    ] as const) {
      const input = element("input", { type: "checkbox", ariaLabel: label });
      input.checked = draft[key];
      input.addEventListener("change", () => {
        draft[key] = input.checked;
      });
      toggles.append(
        element(
          "label",
          { className: "kl-match-toggle" },
          input,
          element("span", { text: label }),
        ),
      );
    }
    const apply = this.#button("Apply filters", () => {
      this.#filters = draft;
      this.#dialog.close();
      this.#applyBrowse();
    });
    apply.classList.add("kl-text-button--primary");
    const count = this.#items.filter(candidate => this.#allowed(candidate.memberNumber)).length;
    this.#showDetails("Filter shared suggestions", "filters",
      element("div", {}, note("People · filters use only information shared with you."),
        element("p", { className: "kl-match-filter-count", text: `${count} current ${count === 1 ? "suggestion" : "suggestions"}` }), form, toggles,
        note("Private compatibility, status and schedules stay unknown when a filter requires them.")),
      element(
        "footer",
        {},
        this.#button("Reset filters", () => this.#filtersDialog(structuredClone(DEFAULT_MATCH_FILTERS))),
        this.#button("Cancel", () => this.#dialog.close()), apply,
      ),
      ".kl-match-filter-button",
    );
  }
  #requestCardOpener(target: number): string {
    return `.kl-match-card[data-member="${target}"] .kl-match-request-trigger`;
  }
  async #compose(target: number, source = this.#source,
    returnFocus = this.#requestCardOpener(target),
    reviewedRecipient?: MatchCandidate, fromRecommendation = false): Promise<void> {
    let initialFocus: HTMLElement | undefined;
    await this.#inspect(async valid => {
      let draft = this.#requestDraft?.target === target ? this.#requestDraft : undefined;
      if (this.#requestDraft && !draft) throw new Error("Resume or discard your unsent request before choosing someone else.");
      const previouslyDrafted = !!draft;
      if (!this.#allowed(target)) {
        if (draft) this.#discardConnectionDraft(draft, returnFocus, true);
        else throw new Error("This person is unavailable.");
        return;
      }
      if (!draft) {
        const candidate = await this.#readCandidate(target, valid, source, fromRecommendation);
        if (!valid() || this.#refreshAfter) return;
        if (candidate.activeConnection) {
          await this.#openRequestDetails(candidate.activeConnection.id, source, valid, { target, returnFocus });
          return;
        }
        if (fromRecommendation) {
          this.#readPending();
          if (this.#pending || this.#storageError) throw new Error("Review your saved Matching request before starting a connection.");
        }
        const own = this.#bind(checkedMatchOwn(await this.#read("/v1/matching/me", source), this.recovery.owner), source);
        if (!valid() || this.#refreshAfter || !this.#allowed(target) || fromRecommendation && this.#recommendationActionMember !== target) return;
        if (!candidate.canRequest) throw new Error("This person is not available for connection requests.");
        if (!own.active || own.revision === 0) {
          const keep = this.#button("Keep browsing", () => this.#dialog.close());
          const setup = this.#button("Set up my signal", () => {
            if (this.#dialog.open) this.#openEditor(own, returnFocus);
          }, true);
          setup.classList.add("kl-text-button--primary");
          this.#showDetails(matchingSignalNeededTitle, "signal-needed", matchingSignalNeededBody(),
            element("footer", {}, keep, setup), returnFocus);
          initialFocus = keep;
          return;
        }
        draft = { target, intent: own.signal.intents.find(intent => candidate.intents.includes(intent)) ?? own.signal.intents[0]!,
          message: "", candidate, own, source };
        this.#requestDraft = draft;
      }
      let recipient = reviewedRecipient ?? draft.candidate;
      if (previouslyDrafted && !reviewedRecipient) {
        try {
          recipient = await this.#readCandidate(target, valid, this.#source, fromRecommendation);
        } catch (error) {
          if (valid() && !this.#refreshAfter) {
            if (!this.#allowed(target) || error instanceof CloudError && (error.status === 403 || error.status === 404)) {
              this.#discardConnectionDraft(draft, returnFocus, true);
              return;
            }
            throw error;
          }
          return;
        }
      }
      if (!valid() || this.#refreshAfter || !this.#allowed(target)) return;
      if (recipient.activeConnection) {
        await this.#openRequestDetails(recipient.activeConnection.id, this.#sourceOf(recipient), valid, { target, returnFocus });
        return;
      }
      if (fromRecommendation) {
        this.#readPending();
        if (this.#pending || this.#storageError) throw new Error("Review your saved Matching request before starting a connection.");
      }
      const original = draft;
      const active = () => this.#requestDraft === original && valid() && this.client.connected &&
        !this.#pending && this.#allowed(target) && (!fromRecommendation || this.#recommendationActionMember === target);
      const select = this.#select("Connection intent", original.own.signal.intents, original.intent, value => {
        if (active()) original.intent = value;
      });
      const message = element("textarea", { ariaLabel: "A short introduction", maxLength: requestMessageLimit,
        placeholder: "A little about the conversation you have in mind…", value: original.message });
      message.rows = 3;
      const count = element("small", { className: "kl-match-meta kl-match-request-count" });
      count.id = `${this.#dialogTitleId}-count`;
      message.setAttribute("aria-describedby", count.id);
      const updateCount = () => { count.textContent = `${original.message.length}/${requestMessageLimit} characters`; };
      updateCount();
      message.addEventListener("input", () => {
        if (!message.isConnected || !active() || this.#busy) return;
        original.message = message.value;
        updateCount();
      });
      const review = this.#button("Review request", () => {
        if (!active()) return;
        if (original.message.length > requestMessageLimit) {
          error.textContent = `Use up to ${requestMessageLimit} characters.`;
          message.focus({ preventScroll: true });
          return;
        }
        error.textContent = "";
        this.#showConnectionReview(original, recipient, active, returnFocus);
      }, true);
      review.classList.add("kl-text-button--primary");
      const error = element("p", { className: "kl-match-request-error", role: "alert" });
      initialFocus = select;
      this.#showDetails("Request a connection", "request-compose",
        element("div", { className: "kl-match-request-body" },
          this.#requestRecipient(recipient),
          element("label", { className: "kl-match-field" }, element("span", { text: "Connection intent" }), select),
          element("label", { className: "kl-match-field" }, element("span", { text: "A short introduction · optional" }), message),
          count,
          note("Acceptance does not add a friend or grant chat access."),
          error,
        ),
        element("footer", {},
          this.#button("Cancel", () => this.#dialog.close()),
          this.#button("Discard request draft", () => this.#discardConnectionDraft(original, returnFocus)),
          review,
        ), returnFocus);
    });
    if (this.#dialog.open && initialFocus?.isConnected) initialFocus.focus({ preventScroll: true });
    else this.#focusConnectionDetails();
  }
  #discardConnectionDraft(draft: ConnectionDraft, returnFocus: string, unavailable = false): void {
    this.#showDetails("Discard this unsent connection request?", "request-review",
      element("div", {}, unavailable ? note("The recipient is unavailable.") : undefined,
        note("This will clear your introduction and selected intent.")),
      element("footer", {},
        this.#button("Keep draft", () => this.#dialog.close()),
        this.#button("Confirm discard draft", () => {
          if (this.#requestDraft !== draft) return;
          this.#requestDraft = undefined;
          this.#dialog.close();
          this.#draw();
        })),
      returnFocus);
  }
  #requestRecipient(candidate: MatchCandidate): HTMLElement {
    return element("div", { className: "kl-match-request-target" }, this.#avatar(candidate.name, candidate.memberNumber, candidate.status),
      element("div", {}, element("strong", { text: candidate.name }), note("People")));
  }
  #showConnectionReview(original: ConnectionDraft, recipient: MatchCandidate, active: () => boolean, returnFocus: string): void {
    const { target, candidate, own } = original;
    const error = element("p", { className: "kl-match-request-error", role: "alert" });
    const send = this.#button("Send request", () => {
      if (!active()) return;
      void this.#inspect(async fresh => {
        await this.#perform("POST", "/v1/matching/requests", {
          operationId: crypto.randomUUID(), target, ownRevision: own.revision,
          peerRevision: candidate.signalRevision, intent: original.intent, message: original.message,
        }, fresh, original.source, `Connect with ${candidate.name}`);
        if (!fresh()) return;
        this.#requestDraft = undefined;
        this.#dialog.close();
        this.#page = "connections";
      }).then(() => {
        if (this.#pending) {
          error.textContent = "The request needs recovery. Close this dialog and review the saved request.";
        } else if (this.#message) {
          error.textContent = this.#message;
        } else if (this.#current()) void this.refresh();
      });
    }, true);
    send.classList.add("kl-text-button--primary");
    this.#showDetails("Send this connection request?", "request-review",
      element("div", { className: "kl-match-request-body" },
        this.#requestRecipient(recipient),
        element("p", {}, element("strong", { text: "Connection intent" }), " · ", original.intent),
        original.message ? element("p", { className: "kl-match-request-introduction", text: original.message }) : undefined,
        note("It expires after 24 hours if there is no reply."),
        error,
      ),
      element("footer", {}, this.#button("Back", () => void this.#compose(target, original.source, returnFocus, recipient)), send),
      returnFocus);
  }
  async #reviewRequest(id: string, source = this.#source, opener?: { target: number; returnFocus: string }): Promise<void> {
    await this.#inspect(async valid => {
      if (!sameMatchingSource(source, await this.recovery.gate(valid))) throw new MatchingGenerationError();
      await this.#openRequestDetails(id, source, valid, opener);
    });
    this.#focusConnectionDetails();
  }
  async #openRequestDetails(id: string, source: MatchingSource, valid: () => boolean,
    opener?: { target: number; returnFocus: string }): Promise<void> {
    const request = checkedMatchRequest(await this.#read("/v1/matching/requests/" + id, source), this.recovery.owner);
    if (!valid() || this.#refreshAfter) return;
    if (request.id !== id || opener && (request.peer?.memberNumber !== opener.target || !this.#allowed(opener.target)))
      throw new Error("This connection is unavailable. Refresh Matching to try again.");
    this.#showConnectionDetails(this.#bind(this.#safeRequest(request), source), opener?.returnFocus);
  }
  #focusConnectionDetails(): void {
    if (this.#dialog.open && this.#dialog.dataset.layout === "connection-detail") {
      this.#dialog.querySelector<HTMLButtonElement>("footer button")?.focus({ preventScroll: true });
    }
  }
  async #messageConnection(original: MatchRequest, member: number): Promise<void> {
    const message = this.options.message;
    if (!message) return;
    await this.#inspect(async valid => {
      const source = this.#sourceOf(original);
      const current = () => valid() && !this.#refreshAfter && this.client.connected && this.#dialog.open &&
        this.#dialog.dataset.layout === "connection-detail" && sameMatchingSource(source, this.#source);
      const permitted = () => current() && this.#allowed(member) && this.options.canMessage?.(member) === true;
      if (!permitted()) throw new Error("Messaging is unavailable for this person.");
      if (!sameMatchingSource(source, await this.recovery.gate(current))) throw new MatchingGenerationError();
      if (!current()) return;
      const latest = checkedMatchRequest(await this.#read("/v1/matching/requests/" + original.id, source), this.recovery.owner);
      if (!current()) return;
      if (latest.id !== original.id || latest.state !== "Accepted" || latest.peer?.memberNumber !== member)
        throw new Error("This connection is unavailable. Refresh Matching to try again.");
      if (!permitted()) throw new Error("Messaging is unavailable for this person.");
      await message(member, latest.peer.name, permitted);
      if (current()) this.#dialog.close();
    });
  }
  #showConnectionDetails(original: MatchRequest,
    returnFocus = `.kl-match-connection-card[data-connection="${original.id}"] .kl-match-connection-actions button`,
    focusAction?: ConnectionDecision): void {
    const r = this.#safeRequest(original);
    const actions = element("div", { className: "kl-match-actions kl-match-connection-decisions" });
    let selectedAction: HTMLButtonElement | undefined;
    for (const [action, label, allowed] of [
      ["Accepted", "Accept", r.canAccept],
      ["Declined", "Decline", r.canDecline],
      ["Cancelled", r.state === "Accepted" ? "End connection" : "Cancel request", r.canCancel],
    ] as const) {
      if (!allowed) continue;
      const control = this.#button(label, () => this.#confirmDecision(original, action, returnFocus), true);
      if (action === "Accepted") control.classList.add("kl-text-button--primary");
      if (action === focusAction) selectedAction = control;
      actions.append(control);
    }
    if (r.state === "Accepted" && r.peer) {
      const peer = r.peer;
      if (this.options.message && this.options.canMessage?.(peer.memberNumber)) {
        const message = this.#button("Message", () => void this.#messageConnection(original, peer.memberNumber));
        message.classList.add("kl-text-button--primary");
        message.prepend(kikiIcon("chat"));
        actions.prepend(message);
      }
      actions.append(this.#button("Profile", () => {
        this.#dialog.close();
        if (this.#allowed(peer.memberNumber)) this.options.profile(peer.memberNumber, peer.name);
      }));
      actions.append(this.#button("Find an event", () => {
        if (!this.#dialog.open || this.#dialog.dataset.layout !== "connection-detail" ||
            !this.client.connected || !this.#allowed(peer.memberNumber) ||
            !sameMatchingSource(this.#sourceOf(original), this.#source)) return;
        this.#dialog.close();
        this.#tabs.get("events")?.click();
      }));
    }
    this.#showDetails("Connection details", "connection-detail",
      element("div", { className: "kl-match-request-body kl-match-connection-details" },
        element("div", { className: "kl-match-request-target" },
          r.peer ? this.#avatar(r.peer.name, r.peer.memberNumber) :
            element("span", { className: "kl-match-avatar kl-match-avatar--resource", ariaHidden: "true" }, kikiIcon("lock")),
          element("div", {}, element("strong", { text: r.peer?.name ?? "Unavailable connection" }), note(`${r.direction} · ${r.state}`))),
        element("p", { className: "kl-match-meta kl-match-connection-dates" },
          element("span", {}, "Created ", bindClockText(element("time"), r.createdAt, "medium-date-time")),
          r.state === "Pending" ? element("span", {}, "Expires ", bindClockText(element("time"), r.expiresAt, "medium-date-time")) : undefined),
        r.intent ? element("p", {}, element("strong", { text: "Intent" }), " · ", r.intent) : undefined,
        r.peer ? (r.message ? element("p", { className: "kl-match-request-message", text: r.message }) :
          note("No introduction was added.")) : note("The recipient’s details are unavailable."),
        r.state === "Accepted" ? note("Chat keeps its own consent checks.") : undefined,
        actions.childElementCount ? actions : undefined,
      ),
      element("footer", {}, this.#button("Close", () => this.#dialog.close())), returnFocus);
    selectedAction?.focus({ preventScroll: true });
  }
  #confirmDecision(r: MatchRequest, action: ConnectionDecision, returnFocus: string): void {
    const current = () => {
      if (!this.#current() || !this.client.connected || !sameMatchingSource(this.#sourceOf(r), this.#source)) return;
      const request = this.#safeRequest(r);
      const allowed = action === "Accepted" ? request.canAccept : action === "Declined" ? request.canDecline : request.canCancel;
      return allowed ? request : undefined;
    };
    const request = current();
    if (!request) return;
    const { title, label } = action === "Accepted" ? { title: "Accept this connection?", label: "Confirm accept" } :
      action === "Declined" ? { title: "Decline this request?", label: "Confirm decline" } :
      request.state === "Accepted" ? { title: "End this connection?", label: "Confirm end" } :
        { title: "Cancel this request?", label: "Confirm cancellation" };
    const error = element("p", { className: "kl-match-request-error", role: "alert" });
    const confirm = this.#button(label, () => {
      const reviewed = current();
      if (!reviewed) { this.#dialog.close(); return; }
      void this.#inspect(async valid => {
        await this.#perform("POST", `/v1/matching/requests/${r.id}/decision`, {
          operationId: crypto.randomUUID(), revision: r.revision, action,
          ownRevision: r.ownRevision, peerRevision: r.peerRevision,
        }, valid, this.#sourceOf(r), `${action} · ${reviewed.peer?.name ?? "Original connection"}`);
        if (valid()) this.#dialog.close();
      }).then(() => {
        if (this.#message) error.textContent = this.#message;
        else if (this.#current() && !this.#busy) void this.refresh();
      });
    }, true);
    confirm.classList.add(action === "Accepted" ? "kl-text-button--primary" : "kl-match-decision-danger");
    this.#showDetails(title, "connection-decision",
      element("div", { className: "kl-match-connection-confirm" },
        element("p", {}, element("strong", { text: request.peer?.name ?? "Unavailable connection" })),
        note("This changes only the Matching connection. Friendship and message permissions stay separate."),
        error,
      ),
      element("footer", {}, this.#button("Keep current status", () => this.#showConnectionDetails(r, returnFocus, action)), confirm),
      returnFocus);
  }
}
