import {checkedMatchGroup,MATCH_RESOURCE_KINDS} from '../../../cloud/shared/matching-resources.mjs';
import type { KeyValueStorage } from "../../core/settings";
import type { CloudClient } from "../../cloud/client";
import {checkedMatchingSource,matchingGroupSource,matchingPeopleSource,matchingResourceMutation,matchingAction,sameMatchingSource,MatchingGenerationError,type MatchingSource} from './matching-generation';
import {
  checkedMatchSignal,
  MATCH_INTENTS,
  matchExact as exact,
  matchInteger as int,
  matchText as text,
  matchUuid as uuid,
} from "../../../cloud/shared/matching.mjs";
export interface MatchingPending {
  format: 1 | 2 | 3;
  method: "PUT" | "POST";
  path: string;
  body: Record<string, unknown> & { operationId: string };
  createdAt: number;
  confirmed: boolean;
  source?: MatchingSource;
  label?: string;
}
export type MatchingLock = (
  key: string,
  run: () => Promise<void>,
) => Promise<unknown>;
export function checkedMatchingPending(v: unknown): MatchingPending {
  const fail = (): never => {
    throw new Error(
      "The saved Matching request contains unsupported data. It has been kept unchanged.",
    );
  };
  if (
    !exact(v, ["format", "method", "path", "body", "createdAt", "confirmed",...[2,3].includes((v as MatchingPending)?.format)?['source','label']:[]]) ||
    (v.format !== 1 && v.format !== 2 && v.format !== 3) ||
    typeof v.confirmed !== "boolean" ||
    !int(v.createdAt, 1, 8640000000000000) ||
    typeof v.path !== "string" ||
    !["PUT", "POST"].includes(String(v.method))
  )
    return fail();
  if(v.format===2||v.format===3){
    if((v.format===2)!==matchingResourceMutation(v.path)||!text(v.label,240))return fail();
    checkedMatchingSource(v.source);
  }
  const b = v.body,
    choice = /^\/v1\/matching\/choices\/([1-9]\d*)$/.exec(v.path),
    decision = /^\/v1\/matching\/requests\/([^/]+)\/decision$/.exec(v.path);
  const resourceChoice=/^\/v1\/matching\/resource-choices\/(groups|rooms|events)\/([^/]+)$/.exec(v.path), groupSave=/^\/v1\/matching\/groups\/([^/]+)$/.exec(v.path), groupDecision=/^\/v1\/matching\/group-requests\/([^/]+)\/decision$/.exec(v.path);
  if(v.path==='/v1/matching/groups'&&v.method==='POST'){if(!exact(b,['operationId','group']))return fail();checkedMatchGroup(b.group);}
  else if(groupSave&&uuid(groupSave[1])&&v.method==='PUT'){if(!exact(b,['operationId','revision','group'])||!int(b.revision,1))return fail();checkedMatchGroup(b.group);}
  else if(resourceChoice&&uuid(resourceChoice[2])&&v.method==='PUT'){if(!MATCH_RESOURCE_KINDS.includes(resourceChoice[1] as 'groups')||!exact(b,['operationId','revision','saved','hidden'])||!int(b.revision)||typeof b.saved!=='boolean'||typeof b.hidden!=='boolean')return fail();}
  else if(v.path==='/v1/matching/group-requests'&&v.method==='POST'){if(!exact(b,['operationId','groupId','groupRevision','senderRevision','intent','message'])||!uuid(b.groupId)||!int(b.groupRevision,1)||!int(b.senderRevision,1)||!MATCH_INTENTS.includes(String(b.intent))||!text(b.message,240))return fail();}
  else if(groupDecision&&uuid(groupDecision[1])&&v.method==='POST'){if(!exact(b,['operationId','revision','action','groupRevision','senderRevision'])||!int(b.revision,1)||!['Accepted','Declined','Cancelled'].includes(String(b.action))||b.groupRevision!==null&&!int(b.groupRevision,1)||b.senderRevision!==null&&!int(b.senderRevision,1)||b.action==='Accepted'&&(b.groupRevision===null||b.senderRevision===null))return fail();}
  else if (v.path === "/v1/matching/me" && v.method === "PUT") {
    if (!exact(b, ["operationId", "revision", "signal"]) || !int(b.revision))
      return fail();
    checkedMatchSignal(b.signal);
  } else if (choice && v.method === "PUT") {
    if (
      !int(Number(choice[1]), 1) ||
      !exact(b, ["operationId", "revision", "saved", "hidden"]) ||
      !int(b.revision) ||
      typeof b.saved !== "boolean" ||
      typeof b.hidden !== "boolean"
    )
      return fail();
  } else if (v.path === "/v1/matching/requests" && v.method === "POST") {
    if (
      !exact(b, [
        "operationId",
        "target",
        "ownRevision",
        "peerRevision",
        "intent",
        "message",
      ]) ||
      !int(b.target, 1) ||
      !int(b.ownRevision, 1) ||
      !int(b.peerRevision, 1) ||
      !MATCH_INTENTS.includes(String(b.intent)) ||
      !text(b.message, 240)
    )
      return fail();
  } else if (decision && uuid(decision[1]) && v.method === "POST") {
    if (
      !exact(b, [
        "operationId",
        "revision",
        "action",
        "ownRevision",
        "peerRevision",
      ]) ||
      !int(b.revision, 1) ||
      !["Accepted", "Declined", "Cancelled"].includes(String(b.action)) ||
      !int(b.ownRevision) ||
      (b.peerRevision !== null && !int(b.peerRevision, 1)) ||
      (b.action === "Accepted" &&
        (b.peerRevision === null || b.ownRevision === 0))
    )
      return fail();
  } else return fail();
  if (
    !exact(b, Object.keys(b as object)) ||
    !uuid(b.operationId) ||
    JSON.stringify(v).length > 16384
  )
    return fail();
  return structuredClone(v) as unknown as MatchingPending;
}
const equal = (a: MatchingPending, b: MatchingPending) =>
  JSON.stringify({ ...a, confirmed: false }) ===
  JSON.stringify({ ...b, confirmed: false });
const knownReceipts=new WeakMap<CloudClient,Map<string,string>>();
const fingerprint=(v:MatchingPending)=>JSON.stringify({...v,confirmed:false});
/** Durable, explicit retry; refresh/reconnect never send a saved mutation. */
export class MatchingRecovery {
  readonly owner: number;
  readonly origin: string;
  readonly key: string;
  constructor(
    readonly client: CloudClient,
    readonly storage: KeyValueStorage,
    readonly current: () => boolean,
    readonly lock?: MatchingLock,
  ) {
    this.owner = client.memberNumber;
    this.origin = client.origin;
    if (!int(this.owner, 1) || !this.origin)
      throw new Error("Connect to a Cloud account first.");
    this.key = `kikilink:matching-recovery:${encodeURIComponent(this.origin)}:${this.owner}:v1`;
  }
  #guard(valid: () => boolean): void {
    if (
      !this.current() ||
      !valid() ||
      this.client.memberNumber !== this.owner ||
      this.client.origin !== this.origin
    )
      throw new Error(
        "Your account or Matching view changed. The saved request is kept.",
      );
  }
  async gate(valid: () => boolean, resources = false): Promise<MatchingSource> {
    const me = await this.#capabilities(valid, resources);
    return resources ? matchingGroupSource(me) : matchingPeopleSource(me);
  }
  async peopleCapabilities(valid: () => boolean): Promise<{ source: MatchingSource; activeRequests: boolean; requestSummary: boolean; suggestions: boolean }> {
    const me = await this.#capabilities(valid, false);
    return {
      source: matchingPeopleSource(me),
      suggestions: me.features?.peopleSuggestions === true,
      activeRequests: me.features?.matchingPeopleActiveRequests === true,
      requestSummary: me.features?.matchingPeopleRequestSummary === true,
    };
  }
  async resourceSources(valid: () => boolean): Promise<{ people: MatchingSource; resources: MatchingSource }> {
    const me = await this.#capabilities(valid, true);
    return { people: matchingPeopleSource(me), resources: matchingGroupSource(me) };
  }
  async finderSources(valid: () => boolean): Promise<{
    people: MatchingSource | undefined;
    resources: MatchingSource | undefined;
  }> {
    const me = await this.#capabilities(valid, false);
    let people: MatchingSource | undefined;
    let resources: MatchingSource | undefined;
    try { people = matchingPeopleSource(me); }
    catch { /* A catalog without a verified source stays unavailable. */ }
    if (me.features?.matchingResources === true) {
      try { resources = matchingGroupSource(me); }
      catch { /* Resource source validation is independent of People. */ }
    }
    return { people, resources };
  }
  async #capabilities(valid: () => boolean, resources: boolean) {
    this.#guard(valid);
    if (!this.client.connected) throw new Error("Reconnect to use Matching.");
    const me = await this.client.request<{
      memberNumber: number;
      features?: { matchingPeople?: boolean; matchingResources?: boolean; matchingPeopleActiveRequests?: boolean; peopleSuggestions?: boolean; matchingPeopleRequestSummary?: boolean };
    }>("GET", "/v1/me");
    this.#guard(valid);
    if (me.memberNumber !== this.owner || me.features?.matchingPeople !== true || resources && me.features?.matchingResources !== true)
      throw new Error(
        "Matching needs the pending Cloud update. Your saved request is kept.",
      );
    return me;
  }
  #raw():string|null {
    this.#guard(() => true);
    let raw: string | null;
    try {
      const r = this.storage.getItemResult?.(this.key);
      if (r && !r.ok) throw new Error();
      raw = r ? r.value : this.storage.getItem(this.key);
    } catch {
      throw new Error(
        "The saved Matching request could not be read. Nothing has been replaced.",
      );
    }
    return raw;
  }
  read(): MatchingPending | null {
    const raw=this.#raw();
    if (raw === null || raw === "null") return null;
    if (raw.length > 16384)
      throw new Error(
        "The saved Matching request is too large. It has been kept.",
      );
    return checkedMatchingPending(JSON.parse(raw));
  }
  #write(v: MatchingPending | null, valid: () => boolean, expected?:string|null): void {
    this.#guard(valid);
    if(expected!==undefined&&this.#raw()!==expected)throw new Error('The saved request changed in another tab. Nothing has been replaced.');
    const raw = JSON.stringify(v);
    try {
      this.storage.setItem(this.key, raw);
      const r = this.storage.getItemResult?.(this.key);
      if (r ? !r.ok || r.value !== raw : this.storage.getItem(this.key) !== raw)
        throw new Error();
    } catch {
      throw new Error(
        "Saving the request on this device could not be confirmed. Reopen Matching to check it.",
      );
    }
  }
  async #locked(run: () => Promise<void>): Promise<void> {
    if (this.lock) await this.lock(this.key, run);
    else if (globalThis.navigator?.locks)
      await navigator.locks.request(this.key, run);
    else
      throw new Error(
        "This browser needs Web Locks to save Matching requests safely.",
      );
  }
  async prepare(value: MatchingPending, valid: () => boolean): Promise<void> {
    const next = checkedMatchingPending(value);
    if (next.confirmed)
      throw new Error("A new request cannot already be confirmed.");
    await this.#locked(async () => {
      this.#guard(valid);
      const old = this.read();
      if (old) {
        if (!equal(old, next))
          throw new Error("Recover the pending Matching request first.");
        return;
      }
      this.#write(next, valid, this.#raw());
    });
  }
  async run(value: MatchingPending, valid: () => boolean): Promise<void> {
    const expected = checkedMatchingPending(value);
    await this.#locked(async () => {
      this.#guard(valid);
      let raw=this.#raw();
      const pending = this.read();
      if (!pending || !equal(pending, expected))
        throw new Error(
          "The saved request changed in another tab. Reopen Matching.",
        );
      const known=knownReceipts.get(this.client)??new Map<string,string>();knownReceipts.set(this.client,known);
      if (!pending.confirmed && known.get(this.key)!==fingerprint(pending)) {
        const resource=matchingResourceMutation(pending.path),source=await this.gate(valid,resource);
        if((pending.format===1?(source.required||source.restored):!pending.source||!sameMatchingSource(pending.source,source)||source.restored&&!source.required))throw new MatchingGenerationError();
        if(this.#raw()!==raw)throw new Error('The saved request changed in another tab. Reopen Matching.');
        const receipt = await this.client.request<unknown>(
          pending.method,
          pending.path,
          {...pending.body,...pending.source?.required?{recoveryGeneration:pending.source.generation}:{}},
        );
        this.#guard(pending.format!==1?()=>true:valid);
        const create = ["/v1/matching/requests","/v1/matching/groups","/v1/matching/group-requests"].includes(pending.path),
          resourceId =
            pending.path.includes("/resource-choices/") ? pending.path.split("/").slice(-2).join(":") :
            pending.path === "/v1/matching/me"
              ? "signal"
              : create
                ? pending.body.operationId
                : pending.path.includes("/choices/")
                  ? pending.path.split("/").at(-1)
                  : pending.path.split("/")[4];
        if (
          !exact(receipt, ["operationId", "resourceId", "revision",...pending.source?.required?['applied','action','recoveryGeneration',...matchingAction(pending.path).endsWith('-decision')?['decision']:[]]:[]]) ||
          receipt.operationId !== pending.body.operationId ||
          receipt.resourceId !== resourceId ||
          receipt.revision !== (create ? 1 : Number(pending.body.revision) + 1) ||
          pending.source?.required&&(receipt.applied!==true||receipt.action!==matchingAction(pending.path)||receipt.recoveryGeneration!==pending.source.generation||matchingAction(pending.path).endsWith('-decision')&&receipt.decision!==pending.body.action)
        )
          throw new Error(
            "The result could not be confirmed. Retry the saved request to check it.",
          );
        if(pending.format!==1)known.set(this.key,fingerprint(pending));
      }
      if(!pending.confirmed){this.#write({...pending,confirmed:true},pending.format!==1?()=>true:valid,raw);raw=JSON.stringify({...pending,confirmed:true});}
      if(!valid())return;
      this.#write(null, valid, raw);known.delete(this.key);
    });
  }
  async forget(value: MatchingPending, valid: () => boolean): Promise<void> {
    const expected = checkedMatchingPending(value);
    await this.#locked(async () => {
      this.#guard(valid);
      const pending = this.read();
      if (!pending || !equal(pending, expected) || pending.confirmed)
        throw new Error(
          "The saved request changed or is already confirmed. Reopen Matching.",
        );
      if(knownReceipts.get(this.client)?.get(this.key)===fingerprint(pending))throw new Error('This request is already confirmed. Finish local cleanup instead.');
      this.#write(null, valid, this.#raw());
    });
  }
}
