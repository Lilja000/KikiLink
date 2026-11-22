// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { ContentDialog } from "../src/modules/link-chat/content-dialog";
import { fitPanelDialog } from "../src/modules/platform-shell/panel-dialog-layout";

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function panelAt(bounds: DOMRect) {
  vi.stubGlobal("visualViewport", undefined);
  const panel = document.createElement("section");
  panel.className = "kl-panel";
  panel.dataset.platformPreview = "true";
  const rect = vi.spyOn(panel, "getBoundingClientRect").mockReturnValue(bounds);
  document.body.append(panel);
  return { panel, rect };
}

it("centers a portal dialog on its panel and refits on resize, without retaining geometry on close", () => {
  const { panel, rect } = panelAt(new DOMRect(340, 200, 600, 450));
  const dialog = new ContentDialog(() => panel);
  document.body.append(dialog.element);
  dialog.element.style.maxWidth = "680px";
  dialog.element.style.top = "5px";
  dialog.show("Avatar", document.createElement("img"));
  expect(dialog.element.style.inset.split(" ").at(-1)).toBe("352px");
  expect(dialog.element.style.inset.split(" ")[0]).toBe("212px");
  expect(dialog.element.style.maxHeight).toBe("426px");
  rect.mockReturnValue(new DOMRect(10, 20, 400, 250));
  window.dispatchEvent(new Event("resize"));
  expect(dialog.element.style.inset.split(" ").at(-1)).toBe("22px");
  expect(dialog.element.style.maxWidth).toBe("376px");
  dialog.close();
  expect(dialog.element.style.top).toBe("5px");
  expect(dialog.element.style.left).toBe("");
  expect(dialog.element.style.maxWidth).toBe("680px");
  expect(dialog.element.style.maxHeight).toBe("");
  dialog.destroy();
});

it("lets an existing full-width sheet override the default fit and leaves detached tools viewport-centered", () => {
  const { panel } = panelAt(new DOMRect(80, 60, 450, 290));
  const dialog = new ContentDialog();
  panel.append(dialog.element);
  let release: (() => void) | undefined;
  dialog.show("People options", document.createElement("section"), () => {
    release?.();
    for (const name of ["inset", "max-width", "max-height", "--kl-dialog-viewport-height"]) dialog.element.style.removeProperty(name);
  });
  release = fitPanelDialog(dialog.element, { panel, layout: () => ({ marginX: 0, marginY: 0 }) });
  expect(dialog.element.style.inset.split(" ").at(-1)).toBe("80px");
  expect(dialog.element.style.maxWidth).toBe("450px");
  dialog.close();
  document.body.append(dialog.element);
  dialog.show("Standalone", document.createElement("section"));
  expect(dialog.element.style.inset).toBe("");
  expect(dialog.element.style.maxWidth).toBe("");
  dialog.destroy();
});
