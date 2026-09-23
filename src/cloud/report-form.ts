import reasons from "../../cloud/shared/report-reasons.json";
import { element } from "./dom";
import { CloudError, type CloudClient } from "./client";

/** One request identity survives network failures and retries of this form. */
export function reportForm(client: CloudClient, targetType: string, targetId: string,
  structured: boolean, submitted: () => void, dismissed?: () => void): HTMLElement {
  const editor = element("div", { className: "kl-cloud-card kl-report-form" });
  const choices = element("fieldset", { className: "kl-report-reasons" });
  choices.append(element("legend", { text: "Why are you reporting this content?" }));
  const groupName = `report-reason-${crypto.randomUUID()}`;
  for (const reason of reasons) {
    const radio = element("input", { type: "radio", value: reason.id });
    radio.name = groupName;
    choices.append(element("label", { className: "kl-report-reason" }, radio, reason.label));
  }
  const comment = element("textarea", { ariaLabel: "Additional comment" });
  comment.maxLength = 800; comment.placeholder = "Additional comment (optional)";
  const status = element("p", { className: "kl-cloud-status" });
  status.setAttribute("role", "status");
  const submit = element("button", { className: "kl-text-button kl-text-button--primary", type: "button", text: "Submit report" });
  const cancel = element("button", { className: "kl-text-button", type: "button", text: "Cancel" });
  const clientId = crypto.randomUUID();
  let busy = false;
  const selected = () => choices.querySelector<HTMLInputElement>("input:checked")?.value;
  choices.addEventListener("change", () => {
    comment.required = selected() === "other";
    comment.placeholder = comment.required ? "Briefly explain the issue" : "Additional comment (optional)";
    status.textContent = "";
  });
  cancel.addEventListener("click", () => { if (!busy) { if (dismissed) dismissed(); else editor.remove(); } });
  submit.addEventListener("click", () => {
    if (busy) return;
    const reason = reasons.find(r => r.id === selected());
    if (!reason) { status.textContent = "Choose a reason before submitting."; choices.querySelector("input")?.focus(); return; }
    const explanation = comment.value.trim();
    if (reason.id === "other" && explanation.length < 5) {
      status.textContent = "Please briefly explain the issue (at least 5 characters)."; comment.focus(); return;
    }
    busy = true; submit.disabled = cancel.disabled = choices.disabled = comment.disabled = true;
    submit.textContent = "Sending…"; status.textContent = "";
    void client.request<{ id: number }>("POST", "/v1/reports", {
      targetType, targetId, reason: `${reason.label}${explanation ? `: ${explanation}` : reason.label.length < 5 ? " report" : ""}`,
      ...(structured ? { reasonCode: reason.id, clientId } : {}),
    }).then(result => {
      if (!Number.isSafeInteger(result?.id) || result.id <= 0) throw new CloudError("invalid_response");
      editor.replaceChildren(element("p", { text: "Report submitted. Thank you." }));
      if (dismissed) {
        const close = element("button", { className: "kl-text-button", type: "button", text: "Close" });
        close.addEventListener("click", dismissed); editor.append(close); close.focus({ preventScroll: true });
      }
      editor.setAttribute("role", "status"); submitted();
    }).catch(error => {
      const code = error instanceof CloudError ? error.code : "cloud_temporarily_unavailable";
      status.textContent = code === "rate_limited" ? "Too many reports. Please wait before trying again. Your report is kept here."
        : ["authentication_required", "session_expired"].includes(code) ? "Reconnect to Cloud, then retry. Your report is kept here."
        : error instanceof CloudError && error.status === 403 ? "You cannot report this content with the current account."
        : "The report could not be confirmed. Your reason and comment are kept; retry when connected.";
    }).finally(() => {
      busy = false; submit.disabled = cancel.disabled = choices.disabled = comment.disabled = false;
      submit.textContent = "Submit report";
    });
  });
  editor.append(choices, element("label", {}, "Additional comment", comment),
    status, element("div", { className: "kl-cloud-actions" }, submit, cancel));
  return editor;
}
