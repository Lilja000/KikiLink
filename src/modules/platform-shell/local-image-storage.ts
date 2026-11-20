import type {GalleryStore} from "../../storage/device-gallery-store";
import type {SavedDeviceFile, SavedDeviceFiles} from "../../storage/saved-device-files";
import {element} from "../../utils/dom";
import type {ContentDialog} from "../link-chat/content-dialog";

/** Device Gallery items are intentionally saved. Only orphaned Feed attachments can be cleared. */
export function openLocalImages(
  dialog: ContentDialog, gallery: Pick<GalleryStore, "list">, files: Pick<SavedDeviceFiles, "list" | "remove">,
  accountCurrent: () => boolean, openGallery: () => void,
): void {
  if (!accountCurrent()) return;
  const controller = new AbortController();
  dialog.element.classList.add("kl-local-images-dialog");
  const body = element("div", {className: "kl-local-image-storage"});
  const fields = element("div", {className: "kl-local-image-fields"});
  const current = () => !controller.signal.aborted && dialog.element.open && body.isConnected && accountCurrent();
  const status = element("p", {className: "kl-setting-help"});
  const details = element("dl", {className: "kl-profile-details"});
  const actions = element("footer", {className: "kl-dialog-actions"});
  const close = () => dialog.close();
  const button = (label: string, action: () => void, primary = false) => element("button", {
    type: "button", className: "kl-text-button" + (primary ? " kl-text-button--primary" : ""), text: label,
    onClick: () => { if (current()) action(); },
  });
  const galleryButton = button("Open device Gallery", () => { close(); openGallery(); });
  const closeButton = button("Close", close, true);
  const metric = (label: string, value: string) => details.append(element("dt", {text: label}), element("dd", {text: value}));
  let unused: SavedDeviceFile[] = [];

  async function read(): Promise<void> {
    dialog.setTitle("Local images");
    unused = [];
    details.replaceChildren();
    status.setAttribute("role", "status");
    status.textContent = "Checking images on this device…";
    galleryButton.hidden = false;
    actions.replaceChildren(closeButton);
    const [local, feed] = await Promise.allSettled([gallery.list(), files.list(current, controller.signal, ["feed"])]);
    if (!current()) return;
    const attachments = feed.status === "fulfilled" ? feed.value.filter(item => item.kind === "feed" && item.mimeType.startsWith("image/")) : [];
    if (local.status === "rejected" || feed.status === "rejected") {
      status.setAttribute("role", "alert");
      if (local.status === "fulfilled") metric("Device Gallery images", String(local.value.length));
      if (feed.status === "fulfilled") metric("Saved Feed images", String(attachments.length));
      status.textContent = local.status === "rejected" && feed.status === "rejected" ? "Image storage could not be read." :
        local.status === "rejected" ? "Device Gallery could not be read." : "Saved Feed images could not be checked.";
      actions.replaceChildren(button("Retry", () => { void read(); }), closeButton);
      return;
    }
    unused = attachments.filter(item => !item.inUse && !item.held);
    const bytes = local.value.reduce((n, image) => n + image.blob.size, 0) + attachments.reduce((n, item) => n + item.bytes, 0);
    metric("Local images", String(local.value.length + attachments.length));
    metric("Image storage", (bytes / 1048576).toFixed(2) + " MiB");
    metric("Unused images", String(unused.length));
    const cleanup = button("Clear unused images", confirmCleanup);
    cleanup.disabled = !unused.length;
    status.textContent = "Includes device Gallery images and saved Feed attachments. Gallery items, drafts and files held for recovery are kept.";
    actions.replaceChildren(cleanup, closeButton);
  }

  function confirmCleanup(): void {
    dialog.setTitle("Clear unused images?");
    details.replaceChildren();
    galleryButton.hidden = true;
    const count = unused.length;
    const keep = button("Keep images", () => { void read(); });
    const confirm = button("Clear unused images", () => { void remove(); });
    confirm.classList.add("kl-text-button--danger");
    status.textContent = `Permanently remove ${count} unused Feed ${count === 1 ? "image" : "images"} from this device?`;
    actions.replaceChildren(keep, confirm);
    keep.focus();
  }

  async function remove(): Promise<void> {
    const selected = unused;
    unused = [];
    actions.replaceChildren();
    let removed = 0;
    try {
      for (const item of selected) {
        if (!current()) return;
        status.textContent = `Removing unused images… ${removed} of ${selected.length}`;
        await files.remove(item, current, controller.signal);
        removed++;
      }
      if (current()) await read();
    } catch {
      if (!current()) return;
      status.setAttribute("role", "alert");
      status.textContent = `Removed ${removed} of ${selected.length}. Review current files before continuing.`;
      actions.replaceChildren(button("Review images", () => { void read(); }), closeButton);
    }
  }

  fields.append(details, status, galleryButton);
  body.append(fields, actions);
  dialog.show("Local images", body, () => controller.abort());
  void read();
}
