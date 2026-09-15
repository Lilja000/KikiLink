// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { InteractiveList } from "../src/utils/interactive-list";

afterEach(() => { vi.useRealTimers(); document.body.replaceChildren(); });
describe("Interactive directory rows", () => {
  it("patches live labels but defers ordering and removal until the pointer leaves", () => {
    const root = document.createElement("div"); document.body.append(root);
    const list = new InteractiveList(root, (item: { id: string; label: string }) => item.id,
      (item) => { const row = document.createElement("button"); row.textContent = item.label; return row; },
      (row, item) => { row.textContent = item.label; });
    list.render([{ id: "a", label: "A online" }, { id: "b", label: "B offline" }]);
    const a = root.children[0]; const b = root.children[1];
    root.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }));
    list.render([{ id: "b", label: "B online" }, { id: "a", label: "A offline" }]);
    expect(root.children[0]).toBe(a); expect(b?.textContent).toBe("B online");
    root.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }));
    expect(root.children[0]).toBe(b);
    root.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }));
    list.render([{ id: "a", label: "A offline" }]);
    expect(root.children).toHaveLength(2);
    root.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }));
    expect(root.children).toHaveLength(1); expect(root.children[0]).toBe(a);
    list.destroy();
  });

  it("keeps keyboard focus and scroll, allows deliberate filters, and cancels a pending touch on destroy", async () => {
    vi.useFakeTimers();
    const root = document.createElement("div"); document.body.append(root);
    const list = new InteractiveList(root, (id: string) => id,
      (id) => { const row = document.createElement("button"); row.textContent = id; return row; }, () => undefined);
    list.render(["a", "b", "c"]);
    const b = root.children[1] as HTMLButtonElement;
    b.focus(); root.scrollTop = 80;
    list.render(["c", "b", "a"]);
    expect(root.children[0]?.textContent).toBe("a");
    list.render(["b"], true);
    expect(root.children[0]).toBe(b); expect(document.activeElement).toBe(b); expect(root.scrollTop).toBe(80);
    b.blur(); await Promise.resolve();
    root.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch" }));
    document.dispatchEvent(new PointerEvent("pointerup", { pointerType: "touch" }));
    list.render(["c", "b"]);
    expect(root.children).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(701);
    expect(root.children[0]?.textContent).toBe("c");
    root.dispatchEvent(new Event("scroll"));
    list.render(["a"]);
    list.destroy();
    await vi.advanceTimersByTimeAsync(701);
    expect(root.children[0]?.textContent).toBe("c");
  });
});
