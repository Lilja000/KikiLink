import { ContentDialog } from '../modules/link-chat/content-dialog';
import { kikiIcon } from '../modules/link-chat/icons';
import { fitPanelDialog } from '../modules/platform-shell/panel-dialog-layout';
import { element } from './dom';
import type { CloudGroupInbox, GroupOption } from './group-inbox';
import type { GroupManagementTarget } from './group-management-intent';
import { initials, type SocialUI } from './social-ui';
import { applyAvatarAppearance } from '../modules/link-chat/appearance-renderer';
import type { CloudGroup, CloudMedia } from './types';

type Contact = { memberNumber: number; memberName: string };
type Member = CloudGroup['members'][number];

interface GroupDialogOptions {
  group: CloudGroup;
  action: GroupOption;
  anchor: HTMLElement;
  current(): boolean;
  contacts(): Contact[];
  canUploadAvatar: boolean;
  presence?(member:number): string | undefined;
  refresh(removed: boolean): Promise<void>;
}

export function showGroupOptions(dialog: ContentDialog, inbox: CloudGroupInbox, ui: SocialUI, options: GroupDialogOptions): void {
  const {group, anchor} = options;
  const owner = inbox.client.memberNumber;
  const scope = inbox.muteScope(group);
  const managementSource = inbox.managementSource;
  const current = () => options.current() && inbox.hasMuteScope(scope);
  let layout: HTMLElement | undefined;
  const active = () => dialog.element.open && layout?.parentElement === dialog.body && current();
  const hasOwnerRole = (g: CloudGroup) => g.owner === owner && g.members.some(m => m.memberNumber === owner && m.status === 'active' && m.role === 'owner');
  const error = element('p', {className:'kl-group-option-error',role:'status'});
  const dismiss = () => dialog.close();
  let saving = false;
  const button = (text: string, run: () => void, variant = '') => {
    const b = element('button', {type:'button', className:'kl-text-button '+variant, text});
    b.addEventListener('click', run);
    return b;
  };
  const show = (title: string, content: HTMLElement, actions: HTMLElement[], close = dismiss) => {
    dialog.element.classList.add('kl-group-options-dialog');
    const body = element('section',{className:'kl-group-option-body'},content,error);
    const footer = element('footer',{className:'kl-dialog-actions'}, ...actions);
    let release: (() => void) | undefined;
    layout = element('div',{className:'kl-group-option-layout'},body,footer);
    dialog.show(title,layout, () => { release?.(); }, () => { if (!saving) close(); });
    const panel = anchor.closest<HTMLElement>('.kl-panel');
    if (panel) release = fitPanelDialog(dialog.element, {panel});
  };
  async function fresh(): Promise<CloudGroup> {
    if (!active() || !inbox.canSetMute(scope)) throw new Error('Reconnect and reopen the group to continue.');
    const access = await inbox.historyAccess();
    const latest = await access.request<CloudGroup>('GET', '/v1/groups/'+encodeURIComponent(group.id));
    if (!active() || !access.current() || latest.id !== group.id || latest.conversationId !== group.conversationId ||
      latest.owner !== group.owner || !latest.members.some(m => m.memberNumber === owner && m.status === 'active'))
      throw new Error('The group or your access changed. Reopen the group.');
    return latest;
  }
  const change = async (g:CloudGroup, action: GroupManagementTarget['action'], label:string, data:Record<string,unknown>, memberNumber?:number) => {
    const entry = inbox.management.capture(`${g.id}:options:${action}:${memberNumber ?? ''}`, {
      groupId:g.id, action, label:g.title+' · '+label, membershipVersion:g.membershipVersion,
      ...(memberNumber ? {memberNumber} : {}),
    }, managementSource, data);
    if (entry.intent.pending || entry.intent.held) throw new Error('Review the previous action under Unfinished group changes before continuing.');
    if (!await inbox.management.perform(entry, active)) throw new Error('The change could not be confirmed. Reopen the group to review it.');
  };
  const closeSaved = async (removed:boolean) => {
    if (!active()) return;
    dialog.close();
    await options.refresh(removed);
  };
  const roleLabel = (m:Member) => m.status === 'invited' ? 'Invitation pending' : m.role === 'owner' ? 'Owner' : m.role === 'admin' ? 'Administrator' : 'Member';
  const profile = (m:Member) => {
    if (!active() || ui.options.isBlocked(m.memberNumber)) return;
    dialog.close();
    ui.options.openProfile(m.memberNumber, inbox.client.peekProfile?.(m.memberNumber)?.displayName ?? 'Member '+m.memberNumber);
  };
  const rosterRow = (m: Member, text: string, action: Node, viewProfiles = false) => {
    const author = ui.member(m.memberNumber, undefined, viewProfiles ? undefined : 'label', viewProfiles);
    // The native avatar and name controls open a profile after leaving this modal.
    if (viewProfiles) author.addEventListener('click', event => {
      if (!(event.target instanceof Element) || !event.target.closest('button')) return;
      if (!active() || ui.options.isBlocked(m.memberNumber)) event.stopPropagation();
      else dismiss();
    }, {capture:true});
    const role = element('small',{text});
    author.querySelector('.kl-social-author-copy')?.append(role);
    if (!role.parentElement) author.append(role);
    return element('div',{className:'kl-group-option-member'},author,action);
  };
  const members = () => {
    const list = element('div',{className:'kl-group-option-members'});
    for (const m of group.members) {
      if (ui.options.isBlocked(m.memberNumber) || (m.status === 'invited' && !hasOwnerRole(group))) continue;
      const action = m.memberNumber === owner ? element('span',{className:'kl-group-member-badge',text:'You'}) :
        m.status === 'invited' ? kikiIcon('mail') : button('Profile',() => profile(m),'kl-group-option-profile');
      const presence = m.status === 'active' ? options.presence?.(m.memberNumber) : undefined;
      list.append(rosterRow(m, [roleLabel(m),presence].filter(Boolean).join(' · '), action, true));
    }
    const actions = [button('Close', dismiss)];
    if (hasOwnerRole(group)) actions.push(button('Edit & invite', () => { if (active()) editor(); },'kl-text-button--primary'));
    show('Group members',element('div',{},element('h3',{text:group.title}),list),actions);
  };
  const remove = () => {
    const local = options.action === 'remove-local';
    const label = local ? 'Remove local group' : 'Leave group';
    const message = local
      ? `Remove “${group.title}” from your conversation list on this device? The group, its Cloud history and everyone’s membership are kept.`
      : `Leave “${group.title}”? You will leave this Cloud group and lose access to its conversation.`;
    const submit = button(label, () => {
      if (!active() || saving) return;
      submit.disabled = saving = true; error.textContent = '';
      void (async () => {
        const latest = await fresh();
        if (local) {
          if (!hasOwnerRole(latest)) throw new Error('Only the current group owner can remove this local conversation.');
          inbox.removeLocalGroup(latest,scope);
        } else {
          if (hasOwnerRole(latest)) throw new Error('The group owner cannot leave this way.');
          await change(latest,'remove','Leave group',{},owner);
        }
        await closeSaved(true);
      })().catch(e => { error.textContent = e instanceof Error ? e.message : 'Could not update the group.'; })
        .finally(() => { submit.disabled = saving = false; });
    }, 'kl-group-option-danger');
    show(local ? 'Remove this local group?' : 'Leave group?',element('p',{text:message}), [button('Cancel',() => { if (!saving) dismiss(); }),submit]);
  };
  function editor() {
    if (!hasOwnerRole(group)) return;
    let initialName = group.title;
    let initialAvatar = group.avatarId ?? null;
    let avatar = initialAvatar;
    let upload: File | undefined;
    let previewFile: File | undefined;
    let committedRevision = group.revision;
    let currentMembers = group.members.map(m => ({...m}));
    const drop = new Set<number>(), invite = new Set<number>();
    const name = element('input',{type:'text',value:initialName,maxLength:60,placeholder:'Give your circle a name',ariaLabel:'Group name'});
    const count = element('small'), seats = element('small'), selected = element('small');
    const source = element('input',{type:'file',ariaLabel:'Choose group avatar',accept:'image/png,image/jpeg,image/webp'});
    const chooseAvatar = element('label',{},element('span',{text:'Choose group avatar'}),source);
    const avatarStatus = element('span'), thumbnail = element('span',{className:'kl-group-editor-thumbnail'});
    if (avatar && options.canUploadAvatar) thumbnail.append(ui.options.image(avatar,'Group avatar preview','kl-social-avatar-image',true));
    const removeAvatar = button('Remove avatar', () => { previewFile = upload = undefined; source.value = ''; avatar = null; thumbnail.replaceChildren(); update(); });
    const avatarField = element('div',{className:'kl-group-option-avatar'},thumbnail,avatarStatus,chooseAvatar,removeAvatar,
      element('small',{text:'PNG, JPEG or WebP · up to 2 MiB.'}));
    avatarField.hidden = !options.canUploadAvatar;
    const roster = element('div'), candidates = element('div',{className:'kl-group-option-candidates'}), search = element('input',{type:'search',placeholder:'Name or username',ariaLabel:'Find people to invite'});
    const fields = element('fieldset',{className:'kl-group-option-fields'},
      element('label',{className:'kl-group-option-name'},element('span',{text:'Group name'}),name,count),avatarField,
      element('section',{},element('header',{},element('h3',{text:'Members'}),seats),roster),
      element('section',{},element('header',{},element('h3',{text:'Invite people'}),selected),
        element('div',{className:'kl-group-option-search'},kikiIcon('search'),search),candidates,
        element('small',{text:'Invitations appear in their Inbox. People join after accepting.'})));
    const dirty = () => name.value !== initialName || !!upload || avatar !== initialAvatar || drop.size > 0 || invite.size > 0;
    const occupied = () => currentMembers.length - drop.size + invite.size;
    function update() {
      count.textContent = `${name.value.length}/60`;
      const pending = currentMembers.filter(m => m.status === 'invited' && !drop.has(m.memberNumber)).length;
      seats.textContent = `${currentMembers.filter(m => m.status === 'active' && !drop.has(m.memberNumber)).length}/5` + (pending ? ` · ${pending} pending` : '');
      selected.textContent = invite.size ? `${invite.size} selected` : '';
      avatarStatus.textContent = upload?.name ?? (avatar ? 'Current group avatar' : '');
      removeAvatar.hidden = !avatar && !upload;
      avatarStatus.hidden = !avatarStatus.textContent;
      chooseAvatar.hidden = !removeAvatar.hidden;
      save.disabled = saving || !dirty() || !name.value.trim() || occupied() > 5;
      fields.disabled = saving;
      roster.replaceChildren(...currentMembers.filter(m=>!ui.options.isBlocked(m.memberNumber)).map(m => {
        const removed = drop.has(m.memberNumber);
        const toggle = m.memberNumber === owner ? kikiIcon('shield') : button(removed ? 'Undo' : m.status === 'invited' ? 'Cancel' : 'Remove',() => {
          if (removed) drop.delete(m.memberNumber); else drop.add(m.memberNumber);
          update();
        });
        const row = rosterRow(m, removed ? (m.status === 'invited' ? 'Invitation will be cancelled' : 'Will be removed') : m.memberNumber === owner ? 'Owner · you' : roleLabel(m),toggle);
        row.classList.toggle('kl-group-member-removed', removed);
        return row;
      }));
      renderCandidates();
    }
    function renderCandidates() {
      const query = search.value.trim().toLowerCase();
      const nodes: HTMLElement[] = [];
      const contacts = options.contacts();
      const number = Number(query.replace(/^#/, ''));
      if (Number.isSafeInteger(number) && number > 0 && !contacts.some(c => c.memberNumber === number)) {
        contacts.push({memberNumber:number,memberName:'Member '+number});
      }
      for (const c of contacts) {
        if (c.memberNumber === owner || ui.options.isBlocked(c.memberNumber) || currentMembers.some(m => m.memberNumber === c.memberNumber)) continue;
        const cached = inbox.client.peekProfile?.(c.memberNumber);
        const label = cached?.displayName || c.memberName;
        if (query && ![label,cached?.username ?? '',String(c.memberNumber)].some(t => t.toLowerCase().includes(query))) continue;
        const check = element('input',{type:'checkbox',ariaLabel:label});
        check.checked = invite.has(c.memberNumber); check.disabled = !check.checked && occupied() >= 5;
        check.addEventListener('change', () => { if (check.checked) invite.add(c.memberNumber); else invite.delete(c.memberNumber); update(); });
        const portrait = element('span',{className:'kl-avatar kl-group-candidate-avatar',ariaHidden:'true'},initials(label));
        if (cached) {
          applyAvatarAppearance(portrait, cached);
          if (cached.avatarId) portrait.append(ui.options.image(cached.avatarId, '', 'kl-social-avatar-image', true));
        }
        const identity = element('span',{},element('strong',{text:label}),
          element('small',{text:cached?.username ? '@'+cached.username : '#'+c.memberNumber}));
        nodes.push(element('label',{className:'kl-group-option-candidate'},portrait,identity,check));
      }
      candidates.replaceChildren(...(nodes.length ? nodes : [element('p',{text:'No people match this search.'})]));
    }
    const save = button('Save changes', () => {
      if (!active() || saving || !dirty() || !name.value.trim()) return;
      error.textContent = ''; saving = true; update();
      void (async () => {
        let latest = await fresh();
        if (!hasOwnerRole(latest)) throw new Error('Your owner permission changed. Reopen the group.');
        if (name.value.trim() !== initialName || upload || avatar !== initialAvatar) {
          if (latest.revision !== committedRevision) throw new Error('Group settings changed. Reopen the editor to see the latest version.');
          if (upload) {
            const media = await inbox.client.request<CloudMedia>('POST','/v1/media/avatar',upload);
            if (!active()) return;
            avatar = media.id; upload = undefined;
          }
          const title = name.value.trim();
          await change(latest,'settings','Edit group',{title,revision:committedRevision,...(avatar !== initialAvatar ? {avatarId:avatar} : {})});
          initialName = name.value = title; initialAvatar = avatar; committedRevision++;
        }
        for (const n of [...drop]) {
          latest = await fresh();
          const before = currentMembers.find(m => m.memberNumber === n), after = latest.members.find(m => m.memberNumber === n);
          if (after && (after.status !== before?.status || after.role !== before?.role)) throw new Error('A membership changed. Reopen the group before removing this person.');
          if (after) await change(latest,'remove','Remove member',{},n);
          drop.delete(n); currentMembers = currentMembers.filter(m => m.memberNumber !== n);
        }
        if (invite.size) {
          latest = await fresh();
          const numbers = [...invite].filter(n => !latest.members.some(m => m.memberNumber === n));
          if (numbers.some(n => ui.options.isBlocked(n)) || numbers.length + latest.members.length > 5) throw new Error('Review the selected people and available places.');
          if (numbers.length) await change(latest,'invite','Invite people',{members:numbers});
          invite.clear();
        }
        await closeSaved(false);
      })().catch(e => { error.textContent = e instanceof Error ? e.message : 'Could not confirm the group changes.'; })
        .finally(() => { saving = false; if (active()) update(); });
    }, 'kl-text-button--primary');
    const close = () => {
      if (saving) return;
      if (!dirty()) { dismiss(); return; }
      show('Discard changes?',element('p',{text:'Discard the unsaved changes to this group?'}),[
        button('Keep editing',paint),button('Discard',dismiss,'kl-group-option-danger')],paint);
    };
    function paint() { show('Edit group',fields,[button('Cancel',close),save],close); update(); name.focus({preventScroll:true}); }
    name.addEventListener('input',() => { count.textContent = `${name.value.length}/60`; save.disabled = !dirty() || !name.value.trim() || occupied() > 5; });
    search.addEventListener('input',renderCandidates);
    source.addEventListener('change',() => {
      const file = source.files?.[0]; if (!file) return;
      if (!/^image\/(png|jpeg|webp)$/u.test(file.type) || file.size > 2*1024**2) { error.textContent = 'Choose a PNG, JPEG or WebP up to 2 MiB.'; source.value = ''; return; }
      error.textContent = ''; previewFile = upload = file; thumbnail.replaceChildren(); update();
      const reader = new FileReader();
      reader.onload = () => {
        if (active() && previewFile === file && typeof reader.result === 'string') thumbnail.replaceChildren(element('img',{src:reader.result,alt:'Group avatar preview'}));
      };
      reader.readAsDataURL(file);
    });
    paint();
  }
  if (!current()) return;
  anchor.focus({preventScroll:true});
  if (options.action === 'members') members(); else if (options.action === 'edit') editor(); else remove();
}
