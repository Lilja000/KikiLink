/** A drag that starts inside a native dialog can end in a click targeted at its backdrop. */
export function onDialogBackdropClick(dialog: HTMLDialogElement, dismiss: () => void, signal?: AbortSignal): void {
  let pressedOutside = false;
  const onBackdrop = (event: MouseEvent) => {
    if (!dialog.open || event.target !== dialog) return false;
    const { left, right, top, bottom } = dialog.getBoundingClientRect();
    return event.clientX < left || event.clientX >= right || event.clientY < top || event.clientY >= bottom;
  };
  const options = signal ? { signal } : {};
  const reset = () => { pressedOutside = false; };
  dialog.addEventListener("pointerdown", event => {
    pressedOutside = event.isPrimary && event.button === 0 && onBackdrop(event);
  }, { ...options, capture: true });
  dialog.addEventListener("pointercancel", reset, options);
  dialog.addEventListener("close", reset, options);
  dialog.addEventListener("click", event => {
    const shouldDismiss = pressedOutside && event.button === 0 && onBackdrop(event);
    reset();
    if (shouldDismiss) dismiss();
  }, options);
}
