import { element } from './dom';
import { CloudError, type CloudClient } from './client';
import type { KeyValueStorage } from '../core/settings';
import type { GroupConversation } from '../modules/link-chat/group-chat-service';
import { GroupMigrationRecovery, checkedGroupMigration, type GroupMigrationLock, type GroupMigrationPending } from './group-migration';
import {GroupCreationRecoveryError,sameGroupCreationSource,type GroupCreationSource} from './group-creation-intent';

interface Options {
  client: Pick<CloudClient, 'memberNumber' | 'origin' | 'connected' | 'request'>;
  storage: KeyValueStorage;
  groups: GroupConversation[];
  current(): boolean;
  isBlocked(member: number): boolean;
  open(groupId: string,generation?:string): Promise<void>;
  source?:GroupCreationSource;
  sourceCurrent?():GroupCreationSource;
  refresh?():Promise<void>;
  lock?: GroupMigrationLock;
}
/** An explicit review/retry surface. Construction and redraws only read local state. */
export function groupMigrationView(options: Options): HTMLElement {
  const root = element('section', { className: 'kl-group-migration', ariaLabel: 'Existing group migration' });
  const recovery = new GroupMigrationRecovery(options.client, options.storage, options.current, options.isBlocked, options.lock);
  const groups = options.groups.filter(g => g.protocolVersion === 2 && g.creatorNumber === recovery.owner).slice(0, 20).map(g=>({...g,memberNumbers:[...g.memberNumbers]}));
  let busy = false, error = '', review: GroupMigrationPending | null = null, revision=0, rejectedSource=false;
  const current=()=>options.current()&&root.isConnected;
  const valid=(pending:GroupMigrationPending)=>()=>current()&&(!pending.source||!options.sourceCurrent||sameGroupCreationSource(pending.source,options.sourceCurrent()));
  const open=async(id:string,generation?:string)=>{if(current())await(generation?options.open(id,generation):options.open(id));};
  const note = (text: string) => element('p', { className: 'kl-cloud-note', text });
  const run = async (action: () => Promise<void>) => {
    if (!current() || busy) return;
    busy = true; error = ''; render();
    try { await action(); }
    catch (e) {
      if (!options.current()) return;
      if(e instanceof GroupCreationRecoveryError)rejectedSource=true;
      const known: Record<string, string> = {
        legacy_migration_unavailable: 'This group was already created, but it is deleted or your membership is no longer active. A second group was not created.',
        legacy_migration_ambiguous: 'Older migrations point to several Cloud groups. A new group was not created. Review your existing Cloud groups.',
        legacy_migration_changed: 'This local group differs from its original Cloud migration. A second group was not created. Open the existing group from your group list.',
        not_found: 'This Cloud group is unavailable or you no longer have access. Its saved destination is kept.',
        rate_limited: 'The request limit was reached. Wait before retrying this saved request.',
      };
      error = e instanceof CloudError ? known[e.code] ?? 'Cloud could not confirm the migration. The saved request is kept; retry when connected.' :
        e instanceof Error ? e.message : 'The migration could not be confirmed. The saved request is kept.';
    } finally { if (options.current()) { busy = false; render(); } }
  };
  const button = (text: string, action: () => Promise<void>, disabled=false) => {
    const b = element('button', { type: 'button', className: 'kl-text-button', text });
    const token=revision;b.disabled = busy||disabled; b.addEventListener('click', () => {if(token===revision)void run(action);}); return b;
  };
  const render = () => {
    revision++;root.replaceChildren();
    let state;
    try { state = recovery.read(); }
    catch (e) { root.append(element('p', { role: 'alert', text: e instanceof Error ? e.message : 'Saved group migrations could not be read.' })); return; }
    if (!groups.length && !state.pending && !Object.keys(state.groups).length) return;
    root.append(element('h3', { text: 'Bring an existing group to Cloud' }),
      note('Creates invitations for the same people. Original group and history stay intact. Everyone must first register with Cloud and accept their invitation.'));
    if (error) root.append(element('p', { role: 'alert', text: error }));
    if (busy) root.append(element('p', { role: 'status', text: 'Checking the saved migration…' }));
    if (state.pending) {
      const pending = state.pending;
      const sourceNow=options.sourceCurrent?.()??options.source;
      const held=rejectedSource||!!sourceNow&&(pending.source?!sameGroupCreationSource(pending.source,sourceNow):sourceNow.required);
      if(held)root.append(note('This saved migration belongs to an earlier or unknown Cloud state. Its original details are kept; dismiss it before starting a new request.'));
      root.append(element('h4', { text: `Saved migration: ${pending.body.title}` }),
        note(`Invite Member Numbers: ${pending.body.members.join(', ')}. The result may be unknown. Retry sends this exact saved request.`),
        button('Retry saved migration', async () => { const id = await recovery.run(pending, valid(pending)); await open(id,pending.source?.generation); },held),
        note('Dismissing removes only this device’s saved request. It does not undo a Cloud group or its invitations.'),
        button('Dismiss saved migration', async () => { await recovery.forget(pending, current); review = null;await options.refresh?.(); }));
      return;
    }
    for (const legacyId of Object.keys(state.groups)) {
      const title = groups.find(g => g.groupId === legacyId)?.title ?? 'migrated group';
      root.append(button(`Open Cloud: ${title}`, async () => {const result=await recovery.destination(legacyId,current);await open(result.groupId,result.generation);}));
    }
    if (review) {
      const pending = review;
      root.append(element('h4', { text: `Review migration: ${pending.body.title}` }),
        note(`Invite Member Numbers: ${pending.body.members.join(', ')}. This creates one separate Cloud group; it does not import messages or grant BC room access.`),
        button('Create Cloud invitations', async () => {
          await recovery.prepare(pending, valid(pending)); review = null;
          const id = await recovery.run(pending, valid(pending)); await open(id,pending.source?.generation);
        }), button('Cancel migration review', async () => { review = null;await options.refresh?.(); }));
    } else for (const group of groups) {
      if (state.groups[group.groupId]) continue;
      root.append(button(`Review ${group.title}`, async () => {
        review = checkedGroupMigration({ body: { legacyId: group.groupId, title: group.title,
          members: group.memberNumbers.filter(n => n !== recovery.owner) }, createdAt: Date.now(),
          ...options.source?{source:{...options.source},...options.source.required?{operationId:crypto.randomUUID()}:{}}:{}}, recovery.owner);
      }));
    }
  };
  render(); return root;
}
