import {ModerationGeneration,ModerationGenerationError,moderationGenerationConflict} from './moderation-generation';
import {captureReportSource,type ReportSource} from './report-source';
import reasons from "../../cloud/shared/report-reasons.json";
import { element } from "./dom";
import { CloudError, type CloudClient } from "./client";

/** One request identity survives network failures and retries of this form. */
export function reportForm(client: CloudClient, targetType: string, targetId: string,
  structured: boolean, submitted: (id: number) => void, dismissed?: () => void, endpoint = "/v1/reports",
  options: { source?: ReportSource | (()=>ReportSource|undefined) | undefined; sourceKey?: string; compact?: boolean; presentation?: 'channel-message'; current?: () => boolean; target?: () => string | undefined; unavailable?: () => void; state?: (value: { busy: boolean; pending: boolean; dirty: boolean }) => void } = {}): HTMLElement {
  const editor = element("div", { className: "kl-cloud-card kl-report-form" });
  const choices = element("fieldset", { className: "kl-report-reasons" });
  choices.append(element("legend", { text: "Why are you reporting this content?" }));
  const groupName = `report-reason-${crypto.randomUUID()}`;
  for (const reason of reasons) {
    const radio = element("input", { type: "radio", value: reason.id });
    radio.name = groupName;
    choices.append(element("label", { className: "kl-report-reason" }, radio, reason.label));
  }
  const reasonSelect = element("select", { ariaLabel: "Reason (required)" }, element("option", { value: "", text: "Choose a concern" }));
  for (const reason of reasons) reasonSelect.append(element("option", { value: reason.id, text: reason.label }));
  if (options.compact) { editor.classList.add('kl-report-form--compact'); choices.replaceChildren(element('legend', { text: 'Reason (required)' }), reasonSelect); }
  const optionalPlaceholder = options.compact
    ? "Add context that would help someone review the concern." : "Additional comment (optional)";
  const spaceReason = structured && targetType === 'space';
  const commentLimit = spaceReason ? 1000 : 800;
  const comment = element("textarea", { ariaLabel: options.compact ? "What happened?" : "Additional comment",
    maxLength: commentLimit, placeholder: optionalPlaceholder });
  const guided = options.presentation === 'channel-message';
  if(spaceReason || guided)comment.rows=5;
  const commentLabel = element('span', { text: options.compact ? 'What happened? (optional)' : 'Additional comment' });
  const counter = element('small', { className: 'kl-report-counter', text: `0/${commentLimit}` });
  const status = element("p", { className: "kl-cloud-status" });
  status.setAttribute("role", "status");
  if (guided) {
    status.id = `kl-report-guidance-${crypto.randomUUID()}`;
    status.setAttribute('aria-live', 'polite');
    reasonSelect.setAttribute('aria-describedby', status.id);
    comment.setAttribute('aria-describedby', status.id);
  }
  const submit = element("button", { className: "kl-text-button kl-text-button--primary", type: "button", text: "Submit report" });
  const cancel = element("button", { className: "kl-text-button", type: "button", text: "Cancel" });
  const clientId = crypto.randomUUID(),owner=client.memberNumber,origin=client.origin;
  const recovery=new ModerationGeneration(client,'reportCreationRecoveryGeneration');
  // A BC member number is an external account identity, not a reused database sequence.
  // Profile actions may be supplied by another surface: anchor them when this form opens.
  const profileSource=targetType==='profile'&&!options.source?client.request('GET','/v1/me').then(me=>captureReportSource(client,me)).catch(()=>undefined):undefined;
  let source:ReportSource|undefined,held=false;
  let busy = false;
  let complete = false;
  let pending: Record<string, unknown> | undefined;
  const current = () => editor.isConnected && client.memberNumber===owner && client.origin===origin && (options.current?.() ?? true);
  const selected = () => options.compact ? reasonSelect.value : choices.querySelector<HTMLInputElement>("input:checked")?.value;
  const notify = () => {
    counter.textContent = `${comment.value.length}/${commentLimit}`;
    if (guided && !pending && !complete) {
      const concern = reasons.some(reason => reason.id === selected());
      const valid = concern && (selected() !== 'other' || comment.value.trim().length >= 5) && comment.value.length <= commentLimit;
      submit.disabled = busy || held || !valid;
      status.dataset.valid = String(valid);
      const guidance = !concern ? 'Choose the concern that best describes your report.'
        : comment.value.length > commentLimit ? `Keep the report details within ${commentLimit} characters.`
        : !valid ? 'Please briefly explain the issue (at least 5 characters).' : 'Ready for the next step.';
      status.replaceChildren(valid ? element('span', {text:guidance}) : element('ul', {},element('li', {text:guidance})));
    }
    options.state?.({ busy, pending: !!pending, dirty: !complete && (!!selected() || !!comment.value) });
  };
  comment.addEventListener('input', notify);
  choices.addEventListener("change", () => {
    comment.required = selected() === "other";
    comment.placeholder = comment.required ? "Briefly explain the issue" : optionalPlaceholder;
    if(options.compact)commentLabel.textContent = comment.required ? 'What happened? (required)' : 'What happened? (optional)';
    status.textContent = "";
    notify();
  });
  cancel.addEventListener("click", () => { if (cancel.isConnected && current() && !busy) { if (dismissed) dismissed(); else editor.remove(); } });
  submit.addEventListener("click", () => {
    if (busy || complete || held || !submit.isConnected || !current()) return;
    const target = pending?.targetId ?? (options.target ? options.target() : targetId);
    if (!target) { status.textContent = 'Choose a community before submitting.'; return; }
    const reason = reasons.find(r => r.id === selected());
    if (!reason) { status.textContent = "Choose a reason before submitting."; choices.querySelector<HTMLElement>("select,input")?.focus(); return; }
    const explanation = comment.value.trim();
    if ((spaceReason || guided) && explanation.length > commentLimit) {
      status.textContent = `Keep the comment within ${commentLimit} characters.`; comment.focus(); return;
    }
    if (reason.id === "other" && explanation.length < 5) {
      status.textContent = "Please briefly explain the issue (at least 5 characters)."; comment.focus(); return;
    }
    busy = true; submit.disabled = cancel.disabled = choices.disabled = comment.disabled = true;
    submit.textContent = "Sending…"; status.textContent = "";
    if(guided)delete status.dataset.valid;
    if(!pending)source=typeof options.source==='function'?options.source():options.source;
    pending ??= {
      ...(options.sourceKey ? {sourceKey:options.sourceKey} : {}),
      targetType, targetId: target, reason: spaceReason ? explanation || reason.label : `${reason.label}${explanation ? `: ${explanation}` : reason.label.length < 5 ? " report" : ""}`,
      ...(structured ? { reasonCode: reason.id, clientId } : {}),
    };
    notify();
    const intent=pending;
    void (async()=>{
      if(profileSource&&!source)source=await profileSource;
      if(!client.connected)throw new CloudError('cloud_temporarily_unavailable');
      if(source&&!source.current())throw new ModerationGenerationError();
      const me=await client.request<{memberNumber?:number;directRecovery?:{generation?:unknown;restored?:unknown}}>('GET','/v1/me');
      if(!current()||me?.memberNumber!==undefined&&me.memberNumber!==owner)throw new ModerationGenerationError();
      recovery.accept(me);const access=recovery.capture();
      if(source?.generation&&me.directRecovery?.generation!==source.generation||!access.generation&&me.directRecovery?.restored===true||access.generation&&access.generation!==source?.generation||source&&!source.current())throw new ModerationGenerationError();
      const result=await access.request<{id:number}>('POST',endpoint,intent);
      if(source&&!source.current())throw new ModerationGenerationError();
      return result;
    })().then(result => {
      if (!current()) return;
      if (!Number.isSafeInteger(result?.id) || result.id <= 0) throw new CloudError("invalid_response");
      editor.replaceChildren(element("p", { text: "Report submitted. Thank you." }));
      if (dismissed) {
        const close = element("button", { className: "kl-text-button", type: "button", text: "Close" });
        close.addEventListener("click", ()=>{if(current()&&close.isConnected)dismissed();}); editor.append(close); close.focus({ preventScroll: true });
      }
      complete = true; pending = undefined;
      editor.setAttribute("role", "status"); submitted(result.id);
    }).catch(error => {
      if (!current()) return;
      // Keep every attempted identity frozen, including definitive errors; closing starts a new intent.
      if(moderationGenerationConflict(error) && (client.connected || error instanceof CloudError))held=true;
      const code = error instanceof CloudError ? error.code : "cloud_temporarily_unavailable";
      if (error instanceof CloudError && [403,404].includes(error.status)) options.unavailable?.();
      status.textContent = held ? "This content belongs to an earlier or unverified database state. Your reason and comment are kept here. Close this form and refresh the content before starting a new report." : ["rate_limited", "report_limit"].includes(code) ? "Too many reports. Please wait before trying again. Your report is kept here."
        : ["authentication_required", "session_expired"].includes(code) ? "Reconnect to Cloud, then retry. Your report is kept here."
        : code === "reported_content_changed" ? `This content changed. Close this report and refresh the ${['creation','review'].includes(targetType)?'creation':'content'} before reporting again.`
        : error instanceof CloudError && error.status === 403 ? "You cannot report this content with the current account."
        : error instanceof CloudError && error.status === 404 ? "This content is no longer available to report."
        : "The report could not be confirmed. Your reason and comment are kept; retry when connected.";
    }).finally(() => {
      // A retained dialog may be closed while its POST is in flight. Keep the
      // original pending body retryable without confirming a hidden result.
      if (!editor.isConnected || client.memberNumber!==owner || client.origin!==origin) return;
      busy = false; submit.disabled = held; cancel.disabled = false; choices.disabled = !!pending; comment.disabled=false;comment.readOnly=!!pending;
      submit.textContent = "Submit report";
      notify();
    });
  });
  editor.append(choices, element("label", {}, commentLabel, comment), ...(options.compact ? [counter] : []),
    status, element("div", { className: "kl-cloud-actions" }, ...(options.compact ? [cancel, submit] : [submit, cancel])));
  if(guided){
    const detailsMeta = element('div', {className:'kl-report-details-meta'},
      element('small', {className:'kl-report-details-hint',text:'Use clear details. This text is included in your report.'}));
    counter.before(detailsMeta); detailsMeta.append(counter);
    // Dialog state listeners can refer to the fully constructed dialog.
    queueMicrotask(notify);
  }
  return editor;
}
