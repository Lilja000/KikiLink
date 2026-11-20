import { kikiIcon } from '../modules/link-chat/icons';
import { fitPanelDialog } from '../modules/platform-shell/panel-dialog-layout';
import { element } from './dom';

/** Native top-layer dialog: browser focus trap, Escape boundary and no document listeners. */
export function moderationDialog(title: string, body: HTMLElement, footer: HTMLElement, cancel: () => void, panel?: HTMLElement): HTMLDialogElement {
  const heading=element('h2',{text:title});heading.id=`kl-mod-dialog-${crypto.randomUUID()}`;
  const dialog=element('dialog',{className:'kl-dialog kl-mod-page kl-moderation-dialog'});
  dialog.setAttribute('aria-labelledby',heading.id);
  const close=element('button',{type:'button',className:'kl-text-button',text:'Close',ariaLabel:'Close dialog'});
  close.addEventListener('click',()=>{if(dialog.isConnected)cancel();});
  close.classList.add('kl-mod-icon');close.replaceChildren(kikiIcon('close'));
  dialog.append(element('header',{className:'kl-dialog-header'},
    element('div',{className:'kl-mod-dialog-heading'},element('span',{className:'kl-mod-eyebrow',text:'KIKILINK',ariaHidden:'true'}),heading),close),body,footer);
  dialog.addEventListener('cancel',e=>{e.preventDefault();e.stopPropagation();cancel();});
  dialog.addEventListener('keydown',e=>{e.stopPropagation();});
  queueMicrotask(()=>{if(!dialog.isConnected)return;if(!dialog.open)dialog.showModal();
    fitPanelDialog(dialog, panel ? { panel } : undefined);
    (dialog.querySelector<HTMLElement>('[autofocus]')??body.querySelector<HTMLElement>('select,textarea,button')??footer.querySelector('button'))?.focus();});
  return dialog;
}
