// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { ContentDialog } from "../src/modules/link-chat/content-dialog";
import { pickMatchesBackground } from "../src/modules/platform-shell/matches-background-gallery";
import type { DeviceGalleryImage } from "../src/storage/device-gallery-store";

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });
const saved = (url: string) => ({ url, addedAt: 1 });
function open() {
  const dialog = new ContentDialog();
  document.body.append(dialog.element);
  return dialog;
}

it("selects an eligible saved link and makes no thumbnail requests to external hosts", async () => {
  const dialog = open();
  const valid = "https://gallery.example/forest.webp";
  const hidden = "https://gallery.example/hidden.png";
  const pending = pickMatchesBackground(dialog, {list: async () => []}, [
    saved(valid), saved(hidden), saved("https://gallery.example/song.mp3"),
    { ...saved("https://gallery.example/expired.jpg"), expiresAt: 1 },
  ], [hidden], new AbortController().signal);
  expect(dialog.body.querySelectorAll(".kl-room-background-choice")).toHaveLength(1);
  expect(dialog.body.querySelector("img")).toBeNull();
  dialog.body.querySelector<HTMLButtonElement>(".kl-room-background-choice")!.click();
  expect(await pending).toBe(valid);
});

it("releases visible local previews on cancel and never uploads a device image just by opening the gallery", async () => {
  const dialog = open();
  let complete!: (value: DeviceGalleryImage[]) => void;
  const image: DeviceGalleryImage = { id: "one", name:"Forest", createdAt:2, width:16, height:9,
    mimeType:"image/webp", blob:new Blob(["image"], {type:"image/webp"}) };
  const controller = new AbortController();
  const revoke = vi.spyOn(URL, "revokeObjectURL");
  const pending = pickMatchesBackground(dialog, {list: () => new Promise(done => { complete = done; })}, [], [], controller.signal);
  complete([image]);
  await vi.waitFor(() => expect(dialog.body.querySelector("img")).toBeTruthy());
  const url = dialog.body.querySelector("img")!.src;
  controller.abort();
  expect(await pending).toBeNull();
  expect(revoke).toHaveBeenCalledWith(url);
});
