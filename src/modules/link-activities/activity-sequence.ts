import { withBCNetworkReason } from "../../bc/traffic-audit";
import { publishActivityAppearance, snapshotActivityAppearance } from "./activity-appearance";
import type { CustomActivityEffects, CustomActivityStep } from "../../core/types";
import { sanitizeActivityEffects } from "./activity-effects-definition";
import { transferActivityClothing, wearActivityClothing } from "./activity-clothing";
import {
  appearanceItem, canAffectCharacter, clothingRemovable, currentPlayer,
  expressionAllowed, expressionApiGroup, expressionHasNativeTimer, expressionValue, nativePoses, poseAllowed,
} from "./activity-capabilities";

interface Lease {
  kind: "expression" | "pose";
  key: string;
  before: string | null | undefined;
  expected: string | null | undefined;
  asset?: BCAsset;
  retired: boolean;
}
interface Run {
  actor: BCCharacter;
  target: BCCharacter;
  counterpart: BCCharacter;
  room: string;
  socket: BCServerSocket | undefined;
  effects: CustomActivityEffects;
  leases: Map<string, Lease>;
  step: number;
  phase: "delay" | "duration";
  due: number;
  expires: number;
  expiresWall: number;
}

/** One cancellable timeline, with per-property ownership and bounded lifetime. No wire instructions. */
export class ActivitySequence {
  #active: Run | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #writing = false;
  #detachDisconnect: (() => void) | undefined;
  #skipped = 0;
  get running(): boolean { return !!this.#active; }
  get skipped(): number { return this.#skipped; }

  start(actor: BCCharacter, counterpart: BCCharacter, input: unknown): boolean {
    if (this.#writing) return false;
    this.cancel();
    this.#skipped = 0;
    const effects = sanitizeActivityEffects(input);
    const target = effects?.subject === "target" ? counterpart : actor;
    if (!effects || !this.#inRoom(actor, counterpart) || !canAffectCharacter(actor, target) ||
        typeof CharacterRefresh !== "function" || typeof ChatRoomCharacterUpdate !== "function" ||
        typeof ServerPlayerAppearanceSync !== "function") return false;
    const now = performance.now();
    const lifetime = effects.steps.reduce((sum, step) => sum + step.delayMs + step.durationMs, 0) + 2000;
    const run: Run = { actor, target, counterpart, room: roomKey(), socket: socket(), effects,
      leases: new Map(), step: 0, phase: "delay", due: now + effects.steps[0]!.delayMs,
      expires: now + lifetime, expiresWall: Date.now() + lifetime };
    // Snapshot every affected field before the first delay, not when a later step first uses it.
    for (const step of effects.steps) {
      for (const expression of step.expressions) {
        const key = `expression:${expression.group}`;
        if (run.leases.has(key)) continue;
        const item = appearanceItem(target, expression.group);
        const value = expressionValue(target, expression.group);
        run.leases.set(key, { kind: "expression", key: expression.group, before: value, expected: value,
          ...(item ? { asset: item.Asset } : {}), retired: !item });
      }
    }
    if (effects.steps.some(step => step.poses.length)) {
      // A full-body pose can clear several other categories. Snapshot BC's whole pose record,
      // then own only categories actually changed by our native call.
      const categories = new Set([...nativePoses().map(pose => pose.Category), ...Object.keys(target.ActivePoseMapping ?? {})]);
      for (const category of categories) {
        const value = target.ActivePoseMapping?.[category];
        run.leases.set(`pose:${category}`, { kind: "pose", key: category, before: value, expected: value, retired: false });
      }
    }
    this.#active = run;
    this.#watchDisconnect(run);
    this.#tick(run);
    return true;
  }

  /** Stop/replacement restores only fields still owned by this timeline. Clothes stay removed. */
  cancel(): void {
    const run = this.#active;
    this.#active = undefined;
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#detachDisconnect?.();
    this.#detachDisconnect = undefined;
    if (run) {
      try { this.#restore(run); } catch { /* A revoked native character cannot be safely restored. */ }
    }
  }

  /** Called through shared ModSDK hooks before native/manual/other-addon writes. */
  externalChange(character: BCCharacter, kind: "expression" | "pose" | "appearance", group?: string): void {
    const run = this.#active;
    if (this.#writing || !run || character !== run.target) return;
    for (const lease of run.leases.values()) {
      if (kind === "pose" && lease.kind === "pose") lease.retired = true;
      if (kind === "expression" && lease.kind === "expression" &&
          (!group || lease.key === group || (group === "Eyes" && ["Eyes", "Eyes2"].includes(lease.key)) ||
            (group === "Eyes1" && lease.key === "Eyes"))) lease.retired = true;
      if (kind === "appearance" && (lease.kind === "pose" || !group || lease.key === group)) lease.retired = true;
    }
  }

  #tick(run: Run): void {
    try { this.#advance(run); } catch { this.cancel(); }
  }

  #advance(run: Run): void {
    if (this.#active !== run) return;
    this.#timer = undefined;
    if (!this.#context(run) || performance.now() > run.expires || Date.now() > run.expiresWall) { this.cancel(); return; }
    this.#inspect(run);
    const now = performance.now();
    if (now >= run.due) {
      if (run.phase === "delay") {
        this.#apply(run, run.effects.steps[run.step]!);
        run.phase = "duration";
        run.due = performance.now() + run.effects.steps[run.step]!.durationMs;
      } else {
        run.step++;
        if (run.step >= run.effects.steps.length) {
          this.#active = undefined;
          this.#detachDisconnect?.();
          this.#detachDisconnect = undefined;
          if (run.effects.restore) this.#restore(run);
          return;
        }
        run.phase = "delay";
        run.due = now + run.effects.steps[run.step]!.delayMs;
      }
    }
    if (this.#active === run) this.#timer = setTimeout(() => this.#tick(run), Math.max(0, Math.min(125, run.due - performance.now())));
  }

  #inspect(run: Run): void {
    for (const lease of run.leases.values()) {
      if (lease.retired) continue;
      const value = lease.kind === "expression" ? expressionValue(run.target, lease.key) : run.target.ActivePoseMapping?.[lease.key];
      if (value !== lease.expected || (lease.kind === "expression" && appearanceItem(run.target, lease.key)?.Asset !== lease.asset)) lease.retired = true;
    }
  }

  #apply(run: Run, step: CustomActivityStep): void {
    const before = snapshotActivityAppearance([run.target, run.actor, run.counterpart]);
    let changed = false;
    this.#writing = true;
    try {
      for (const change of step.expressions) {
        const lease = run.leases.get(`expression:${change.group}`);
        // Don't compete with a native timed expression. Its queue remains entirely native-owned.
        if (!lease || lease.retired || expressionHasNativeTimer(run.target, change.group) ||
            !expressionAllowed(run.target, change.group, change.value)) { this.#skipped++; continue; }
        try {
          // No BC timer/null-reset: our timeline owns duration. The documented fromQueue flag
          // applies immediately without creating a native delayed write that could outlive us.
          withBCNetworkReason("expression-change", () => CharacterSetFacialExpression(run.target, expressionApiGroup(change.group), change.value, undefined, undefined, true));
          const actual = expressionValue(run.target, change.group);
          if ((actual ?? null) !== change.value) { lease.retired = true; this.#skipped++; continue; }
          lease.expected = actual;
          changed = true;
        } catch {
          const actual = expressionValue(run.target, change.group);
          if ((actual ?? null) === change.value && appearanceItem(run.target, change.group)?.Asset === lease.asset) {
            lease.expected = actual; changed = true;
          } else lease.retired = true;
          this.#skipped++;
        }
      }
      // One pose per native category; the last selection in a category wins deterministically.
      const poses = new Map<string, string>();
      for (const name of step.poses) {
        const pose = nativePoses().find(candidate => candidate.Name === name);
        if (pose) poses.set(pose.Category, name); else this.#skipped++;
      }
      for (const [category, name] of poses) {
        const lease = run.leases.get(`pose:${category}`);
        if (!lease || [...run.leases.values()].some(candidate => candidate.kind === "pose" && candidate.retired) ||
            !poseAllowed(run.target, name)) { this.#skipped++; continue; }
        try {
          const before = { ...run.target.ActivePoseMapping };
          if (run.target.ActivePoseMapping?.[category] !== name) withBCNetworkReason("pose-change", () => PoseSetActive(run.target, name));
          const actual = run.target.ActivePoseMapping?.[category];
          for (const candidate of run.leases.values()) {
            if (candidate.kind !== "pose") continue;
            const after = run.target.ActivePoseMapping?.[candidate.key];
            if (before[candidate.key] !== after) { candidate.expected = after; changed = true; }
          }
          if (actual !== name) this.#skipped++;
        } catch { lease.retired = true; this.#skipped++; }
      }
      const selected = new Set(step.removeClothing);
      for (const name of selected) {
        if (!clothingRemovable(run.actor, run.target, name, selected)) { this.#skipped++; continue; }
        try {
          withBCNetworkReason("clothing-remove", () => InventoryRemove(run.target, name, false));
          if (appearanceItem(run.target, name)) this.#skipped++; else changed = true;
        } catch {
          // Native/addon hooks can throw after completing removal. Publish that
          // completed change so the local appearance and the room stay in sync.
          if (!appearanceItem(run.target, name)) changed = true;
          this.#skipped++;
        }
      }
      for (const template of step.wearClothing ?? []) {
        if (wearActivityClothing(run.actor, run.target, template)) changed = true;
        else this.#skipped++;
      }
      const changedCharacters = new Set<BCCharacter>(changed ? [run.target] : []);
      for (const slot of step.transferClothing?.slots ?? []) {
        if (transferActivityClothing(run.actor, run.counterpart, slot, step.transferClothing!.direction)) {
          // Both final states already exist. A one-way transfer publishes its
          // recipient first; Swap uses the same batch, once per character.
          const destination = step.transferClothing!.direction === "target-to-self" ? run.actor : run.counterpart;
          const source = destination === run.actor ? run.counterpart : run.actor;
          changedCharacters.add(destination); changedCharacters.add(source);
        } else this.#skipped++;
      }
      const destination = step.transferClothing?.direction === "target-to-self" ? run.actor : run.counterpart;
      const updateOrder = step.transferClothing && changedCharacters.has(destination)
        ? [destination, ...[...changedCharacters].filter(character => character !== destination)] : changedCharacters;
      if (!publishActivityAppearance(updateOrder, before, () => this.#active === run && this.#context(run))) {
        this.#skipped++;
        console.warn("[KikiLink:activities] Appearance update failed; the sequence stopped after a rollback attempt.");
        // A failed commit must not schedule later steps that assume the transfer succeeded.
        for (const lease of run.leases.values()) lease.retired = true;
        this.#active = undefined;
        this.#detachDisconnect?.(); this.#detachDisconnect = undefined;
      }
      // Refresh can apply item-enforced expressions/poses; never claim those as our own writes.
      this.#inspect(run);
    } finally { this.#writing = false; }
  }

  #restore(run: Run): void {
    this.#inspect(run);
    const broadcast = this.#context(run);
    // A departed remote character or another account must never receive delayed changes.
    if (!broadcast && (run.target !== currentPlayer() || run.actor !== currentPlayer())) return;
    let changed = false;
    this.#writing = true;
    try {
      for (const lease of run.leases.values()) {
        if (lease.retired || lease.before === lease.expected) continue;
        if (lease.kind === "expression") {
          if (expressionHasNativeTimer(run.target, lease.key) || !expressionAllowed(run.target, lease.key, lease.before || null)) continue;
          const item = appearanceItem(run.target, lease.key);
          if (!item) continue;
          try {
            if (broadcast) withBCNetworkReason("expression-restore", () => CharacterSetFacialExpression(run.target, expressionApiGroup(lease.key), lease.before || null, undefined, undefined, true));
            // Preserve absence, too. Offline cleanup writes BC's own appearance data and refreshes
            // without pushing, so reconnect cannot replay a stale network update.
            if (lease.before === undefined) {
              if (item.Property) delete item.Property.Expression;
            } else (item.Property ??= {}).Expression = lease.before;
            changed = true;
          } catch { /* Another native restriction can become active between check and write. */ }
        } else {
          const mapping = run.target.ActivePoseMapping;
          if (!mapping || (lease.before != null ? !poseAllowed(run.target, lease.before) :
              (typeof lease.expected === "string" && !poseAllowed(run.target, lease.expected)))) continue;
          // Restore only this category in BC's documented underlying record. Resetting all poses
          // with PoseSetActive(null) would overwrite unrelated manual changes.
          if (typeof lease.before === "string") mapping[lease.key] = lease.before;
          else delete mapping[lease.key];
          changed = true;
        }
      }
      if (changed) this.#refresh(run.target, broadcast);
    } finally { this.#writing = false; }
  }

  #refresh(target: BCCharacter, broadcast: boolean): void {
    try {
      withBCNetworkReason("appearance-restore", () => CharacterRefresh(target, false, true));
      if (broadcast) {
        withBCNetworkReason("appearance-restore", () => ChatRoomCharacterUpdate(target));
        if (target === currentPlayer()) withBCNetworkReason("appearance-save", () => ServerPlayerAppearanceSync());
      }
    } catch { /* Keep BC's native validation authoritative; don't retry a stale write. */ }
  }
  #watchDisconnect(run: Run): void {
    const connection = run.socket;
    if (!connection || typeof connection.on !== "function" ||
        (typeof connection.off !== "function" && typeof connection.removeListener !== "function")) return;
    const disconnected = (): void => { if (this.#active === run) this.cancel(); };
    this.#detachDisconnect = () => {
      try {
        if (connection.off) connection.off("disconnect", disconnected);
        else connection.removeListener?.("disconnect", disconnected);
      } catch { /* The socket can be revoked during logout. */ }
    };
    connection.on("disconnect", disconnected);
  }
  #context(run: Run): boolean {
    return this.#inRoom(run.actor, run.counterpart) && roomKey() === run.room && socket() === run.socket && canAffectCharacter(run.actor, run.target);
  }
  #inRoom(actor: BCCharacter, target: BCCharacter): boolean {
    return actor === currentPlayer() && socket()?.connected !== false && roomKey() !== "" &&
      typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter) &&
      ChatRoomCharacter.includes(actor) && ChatRoomCharacter.includes(target);
  }
}
function roomKey(): string {
  return typeof ChatRoomData === "object" && ChatRoomData !== null && typeof ChatRoomData.Name === "string"
    ? `${ChatRoomData.Space ?? ""}\u0000${ChatRoomData.Name}` : "";
}
function socket(): BCServerSocket | undefined { return typeof ServerSocket === "object" && ServerSocket !== null ? ServerSocket : undefined; }
