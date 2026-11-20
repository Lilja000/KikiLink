import { CloudError, type CloudClient } from './client';
import { downloadChatFile } from './chat-file-download';
import { ChatFileBatchSource, type ChatFileCandidate } from '../storage/chat-file-batch-source';
import { ChatFileArchiveImporter, ChatFileSaveUncertainError } from '../storage/chat-file-archive-import';
import { CHAT_FILE_LIMIT, CHAT_FILE_TOTAL, makeChatFile } from '../storage/chat-file-model';
import type { ChatImportRules } from '../storage/chat-import-model';

export const CHAT_FILE_BATCH_LIMIT = 100;
export interface ChatFileBatchReview {
  readonly found: number; readonly queued: number; readonly images: number; readonly audio: number;
  readonly alreadySaved: number; readonly remaining: number; readonly excludedMessages: number;
  readonly stored: number; readonly storedBytes: number;
}
export interface ChatFileBatchResult {
  saved: number; kept: number; unavailable: number; changed: number; tooLarge: number; bytes: number;
  remaining: number; unconfirmed: number;
  reason: 'complete'|'batch-limit'|'capacity'|'cancelled'|'connection'|'rate-limit'|'uncertain'|'error';
  message: string;
}
export interface ChatFileBatchContext {
  rules(): ChatImportRules;
  client(): CloudClient | undefined;
  historyGuard(peer: number): () => boolean;
}

/** Explicit, sequential capture. No durable job, retries, Cloud history paging or playback. */
export class ChatFileBatchSaver {
  #pending: {review:ChatFileBatchReview;rules:ChatImportRules;signature:string;candidates:ChatFileCandidate[]} | undefined;
  #attempted = new Set<string>();
  #busy = false;
  #reviewGeneration = 0;
  constructor(readonly owner: number, readonly context: ChatFileBatchContext,
    readonly source = new ChatFileBatchSource(owner), readonly storage = new ChatFileArchiveImporter(owner)) {}
  cancelReview(): void { ++this.#reviewGeneration; this.#pending = undefined; }
  async review(current: () => boolean, signal: AbortSignal, restart = true): Promise<ChatFileBatchReview> {
    if (this.#busy) throw new Error('Stop the current file save before reviewing another batch.');
    this.cancelReview(); if (restart) this.#attempted.clear();
    const rules = structuredClone(this.context.rules()), signature = JSON.stringify(rules), generation = this.#reviewGeneration;
    const active = () => { try { return generation === this.#reviewGeneration && current() && !signal.aborted && JSON.stringify(this.context.rules()) === signature; } catch { return false; } };
    if (!active()) throw new Error('The account or history policy changed. Review again.');
    const snapshot = await this.source.snapshot(rules,active,signal), inventory = await this.storage.inventory(active,signal);
    if (!active()) throw new Error('The account or history policy changed. Review again.');
    const saved = new Set(inventory.files.map(file => file.id)), missing = snapshot.candidates.filter(file => !saved.has(file.id) && !this.#attempted.has(file.id));
    const candidates = missing.slice(0,CHAT_FILE_BATCH_LIMIT);
    const review = Object.freeze({found:snapshot.candidates.length,queued:candidates.length,images:candidates.filter(c => c.kind === 'image').length,
      audio:candidates.filter(c => c.kind === 'audio').length,alreadySaved:snapshot.candidates.filter(c => saved.has(c.id)).length,
      remaining:missing.length-candidates.length,excludedMessages:snapshot.excluded,stored:inventory.files.length,storedBytes:inventory.bytes});
    this.#pending = {review,rules,signature,candidates}; return review;
  }
  async save(review: ChatFileBatchReview, current: () => boolean, signal: AbortSignal, progress: (result: Readonly<ChatFileBatchResult>) => void = () => {}): Promise<ChatFileBatchResult> {
    const pending = this.#pending; this.cancelReview();
    if (this.#busy || !pending || pending.review !== review || !review.queued) throw new Error('This file review expired. Review the files again.');
    const result: ChatFileBatchResult = {saved:0,kept:0,unavailable:0,changed:0,tooLarge:0,bytes:0,remaining:review.queued+review.remaining,unconfirmed:0,reason:'complete',message:''};
    const controller = new AbortController(), combined = AbortSignal.any([signal,controller.signal]);
    const client = this.context.client(); let invalidated = false;
    const valid = () => { try { return current() && !combined.aborted && !invalidated && JSON.stringify(this.context.rules()) === pending.signature &&
      this.context.client() === client && !!client?.connected && client.memberNumber === this.owner; } catch { return false; } };
    const report = () => progress(Object.freeze({...result}));
    const complete = (candidate: ChatFileCandidate, kind: 'saved'|'kept'|'unavailable'|'changed'|'tooLarge') => { result[kind]++; result.remaining--; this.#attempted.add(candidate.id); report(); };
    const stop = (reason: ChatFileBatchResult['reason'], message: string) => { result.reason = reason; result.message = message; };
    if (!valid()) { stop(signal.aborted || !current() ? 'cancelled' : 'connection','Connect with this account and review the files again.'); return result; }
    this.#busy = true;
    const unsubscribe = client!.subscribe(event => { if (['session','media-invalidated','relationships'].includes(event) || event === 'connection' && !client!.connected) { invalidated = true; controller.abort(); } });
    try {
      for (const candidate of pending.candidates) {
        let peerCurrent = () => true;
        try {
          if (!valid()) { stop('cancelled','Saving stopped. Confirmed files are kept.'); break; }
          const witness = await this.source.witness(candidate,pending.rules,valid,combined);
          if (!witness) { complete(candidate,'changed'); continue; }
          peerCurrent = this.context.historyGuard(witness.peer);
          const fileCurrent = () => valid() && peerCurrent();
          if (await this.storage.get(candidate.id,fileCurrent,combined)) { complete(candidate,'kept'); continue; }
          const inventory = await this.storage.inventory(fileCurrent,combined);
          if (inventory.files.length >= CHAT_FILE_LIMIT || inventory.bytes >= CHAT_FILE_TOTAL) { stop('capacity','Offline storage is full. Existing files were kept.'); break; }
          const blob = await downloadChatFile(client!,this.owner,candidate.kind,candidate.assetId,fileCurrent,combined);
          if (!fileCurrent()) throw new Error('The chat changed while downloading.');
          if (blob.size > CHAT_FILE_TOTAL-inventory.bytes) { complete(candidate,'tooLarge'); continue; }
          const check = () => { if (!fileCurrent()) throw new Error('Saving cancelled.'); };
          const file = await makeChatFile(candidate.kind,candidate.assetId,blob,check,combined);
          const fresh = await this.source.witness({...candidate,sources:[witness]},pending.rules,fileCurrent,combined);
          if (!fresh) { complete(candidate,'changed'); continue; }
          const added = await this.storage.save(file,fileCurrent,combined);
          if (added) result.bytes += file.blob.size;
          complete(candidate,added ? 'saved' : 'kept');
        } catch(e) {
          if (e instanceof ChatFileSaveUncertainError) { result.unconfirmed++; stop('uncertain','A file may have been saved but could not be confirmed. Review again to check it before retrying.'); break; }
          if (!valid()) { stop('cancelled','Saving stopped because the account, connection or history changed. Confirmed files are kept.'); break; }
          if (!peerCurrent()) { complete(candidate,'changed'); continue; }
          if (e instanceof CloudError && [403,404,410].includes(e.status)) { complete(candidate,'unavailable'); continue; }
          if (e instanceof CloudError && e.status === 429) { stop('rate-limit','Cloud asked to slow down. Wait before reviewing another batch.'); break; }
          if (e instanceof CloudError || e instanceof TypeError) { stop('connection','Cloud could not finish the download. Check the connection, then review again.'); break; }
          stop('error',e instanceof Error ? e.message : 'The file could not be safely saved. Review again before retrying.'); break;
        }
      }
      if (result.reason === 'complete') { result.reason = result.remaining ? 'batch-limit' : 'complete'; result.message = result.remaining ? 'This batch finished. Review the remaining files to continue.' : 'Review finished. Include saved files in your next device ZIP.'; }
      report(); return Object.freeze({...result});
    } finally { unsubscribe(); controller.abort(); this.#busy = false; }
  }
}
