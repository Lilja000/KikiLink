/** Consume the submitted prefix, retaining appended typing or a replacement draft. */
export function remainingDraftAfterSend(current: string, submitted: string): string {
  return submitted && current.startsWith(submitted) ? current.slice(submitted.length) : current;
}
