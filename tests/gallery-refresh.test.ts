// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { GalleryBrowser } from "../src/modules/platform-shell/gallery-browser";

it("keeps the empty gallery and its focused action mounted across background reads", () => {
  const grid = document.createElement("div");
  const gallery = new GalleryBrowser(grid, document.createElement("span"), {
    add: vi.fn(), card: vi.fn(), refresh: vi.fn(), remove: vi.fn(), changed: vi.fn(),
  });
  document.body.append(grid, gallery.status);
  try {
    gallery.loading(false);
    expect(gallery.status.textContent).toBe("Loading images…");
    gallery.setItems([], false);
    const add = grid.querySelector("button")!;
    add.focus();
    gallery.loading(false);
    expect(gallery.status.hidden).toBe(true);
    gallery.setItems([], false);
    expect(document.activeElement).toBe(add);
    gallery.loading(true);
    expect(gallery.status.textContent).toBe("Refreshing images…");
    gallery.failed("Could not read images");
    expect(gallery.status.querySelector("button")?.textContent).toBe("Retry");
    gallery.clear();
    gallery.loading(false);
    expect(gallery.status.textContent).toBe("Loading images…");
  } finally {
    gallery.destroy();
    grid.remove();
    gallery.status.remove();
  }
});
