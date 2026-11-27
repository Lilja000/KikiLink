import { normalizeMatchesBackgroundUrl } from "../../../cloud/shared/matches-background.mjs";
import type { SavedGalleryImage } from "../../core/types";
import type { DeviceGalleryImage, GalleryStore } from "../../storage/device-gallery-store";
import { element } from "../../utils/dom";
import type { ContentDialog } from "../link-chat/content-dialog";
import { pageAction } from "./page-action";

type Choice = { label: string; url: string; time: number } | { label: string; image: DeviceGalleryImage; time: number };

/** Pick from the owner's saved links and device gallery without leaving the card editor. */
export function pickMatchesBackground(
  dialog: ContentDialog, store: Pick<GalleryStore, "list">, saved: readonly SavedGalleryImage[],
  hidden: readonly string[], signal: AbortSignal,
): Promise<File | string | null> {
  if (signal.aborted) return Promise.resolve(null);
  const now = Date.now();
  const blocked = new Set(hidden);
  const choices: Choice[] = [];
  for (const entry of saved) {
    if (blocked.has(entry.url) || (entry.expiresAt !== undefined && entry.expiresAt <= now)) continue;
    const url = normalizeMatchesBackgroundUrl(entry.url);
    if (!url) continue;
    const target = new URL(url);
    choices.push({ label: target.hostname + target.pathname, url, time: entry.addedAt });
  }
  const grid = element("div", { className: "kl-room-background-grid" });
  const note = element("p", { className: "kl-room-media-note" });
  note.setAttribute("role", "status");
  const previous = pageAction(element("button", { type: "button", className: "kl-text-button", text: "Previous" }), "previous");
  const next = pageAction(element("button", { type: "button", className: "kl-text-button", text: "Next" }), "next");
  const nav = element("nav", { className: "kl-page-navigation", ariaLabel: "Gallery pages" }, previous, next);
  const body = element("div", {}, grid, note, nav);
  let offset = 0;
  const urls: string[] = [];
  const releaseImages = () => { for (const url of urls.splice(0)) URL.revokeObjectURL(url); };
  return new Promise(resolve => {
    let choice: File | string | null = null;
    let closed = false;
    let loading = true;
    let readFailed = false;
    const close = () => { if (!closed) dialog.close(); };
    function draw() {
      releaseImages();
      const visible = choices.slice(offset, offset + 12);
      grid.replaceChildren(...visible.map(item => {
        const button = element("button", { type: "button", className: "kl-activity-choice kl-room-background-choice" });
        if ("image" in item) {
          const url = URL.createObjectURL(item.image.blob);
          urls.push(url);
          const preview = element("img", { alt: "", src: url });
          preview.decoding = "async"; preview.loading = "lazy";
          button.append(preview, element("span", { text: "Share & use · " + item.label }));
          button.onclick = () => {
            if (signal.aborted || closed) return;
            choice = new File([item.image.blob], item.label + ".webp", { type: item.image.mimeType });
            close();
          };
        } else {
          button.textContent = item.label;
          button.title = item.url;
          button.onclick = () => {
            if (signal.aborted || closed) return;
            choice = item.url;
            close();
          };
        }
        return button;
      }));
      previous.disabled = offset === 0;
      next.disabled = offset + 12 >= choices.length;
      nav.hidden = choices.length <= 12;
      note.textContent = visible.length ? `${offset + 1}–${offset + visible.length} of ${choices.length}` :
        loading ? "Loading images…" : readFailed ? "Device gallery could not be opened." : "No saved backgrounds yet.";
    }
    previous.onclick = () => { offset = Math.max(0, offset - 12); draw(); };
    next.onclick = () => { if (offset + 12 < choices.length) { offset += 12; draw(); } };
    dialog.show("Choose from gallery", body, () => {
      closed = true;
      signal.removeEventListener("abort", close);
      releaseImages();
      resolve(signal.aborted ? null : choice);
    });
    signal.addEventListener("abort", close, { once: true });
    draw();
    void store.list().then(images => {
      if (closed) return;
      for (const image of images) choices.push({ label: image.name, image, time: image.createdAt });
    }).catch(() => { readFailed = true; }).finally(() => {
      if (closed) return;
      loading = false;
      choices.sort((a, b) => b.time - a.time);
      draw();
    });
  });
}
