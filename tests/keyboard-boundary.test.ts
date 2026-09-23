// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { containKikiLinkKeyboard } from "../src/bc/keyboard";

const cleanups: Array<() => void> = [];
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); document.body.replaceChildren(); });

function setup() {
  const host = document.createElement("div");
  const root = host.attachShadow({ mode: "open" });
  const input = document.createElement("textarea"), native = document.createElement("textarea");
  native.id = "InputChat";
  root.append(input); document.body.append(host, native);
  const page = vi.fn((event: Event) => {
    if ((event as KeyboardEvent).key === "Enter") native.focus();
  });
  for (const type of ["keydown", "keypress", "keyup"]) document.addEventListener(type, page);
  cleanups.push(() => { for (const type of ["keydown", "keypress", "keyup"]) document.removeEventListener(type, page); });
  const release = containKikiLinkKeyboard(root); cleanups.push(release);
  return { root, input, native, page, release };
}

function key(target: HTMLElement, type: string, code = "Enter", options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent(type, { key: code === "KeyW" ? "w" : code === "NumpadEnter" ? "Enter" : code,
    code, bubbles: true, composed: true, cancelable: true, ...options });
  target.dispatchEvent(event); return event;
}

describe("KikiLink keyboard boundary", () => {
  it.each(["Enter", "NumpadEnter", "KeyW"])("keeps %s and its release inside the addon without blocking text input", code => {
    const { input, root, page } = setup();
    const editor = vi.fn();
    for (const type of ["keydown", "keypress", "keyup"]) input.addEventListener(type, editor);
    input.focus();
    for (const type of ["keydown", "keypress", "keyup"]) expect(key(input, type, code).defaultPrevented).toBe(false);
    expect(editor).toHaveBeenCalledTimes(3);
    expect(page).not.toHaveBeenCalled();
    expect(root.activeElement).toBe(input);
  });

  it.each(["KeyW", "ArrowUp"])("releases native %s movement after focus moves into KikiLink, even after repeat", code => {
    const { native, input, page } = setup();
    native.focus(); key(native, "keydown", code);
    input.focus(); key(input, "keydown", code, { repeat: true });
    key(input, "keyup", code);
    expect(page.mock.calls.map(([event]) => event.type)).toEqual(["keydown", "keyup"]);
  });

  it("contains a pending Enter release when its original field was removed", () => {
    const { input, native, page } = setup();
    input.focus(); key(input, "keydown"); input.remove();
    key(document.body, "keyup");
    expect(page).not.toHaveBeenCalled();
    native.focus(); key(native, "keydown"); key(native, "keyup");
    expect(page).toHaveBeenCalledTimes(2);
    expect(document.activeElement).toBe(native);
  });

  it("preserves key releases whose press preceded the guard and removes all listeners on teardown", () => {
    const { input, page, release } = setup();
    key(input, "keyup", "KeyW");
    expect(page).toHaveBeenCalledOnce();
    key(input, "keydown");
    release();
    key(input, "keyup");
    expect(page).toHaveBeenCalledTimes(2);
  });

  it("forgets held keys when the window loses focus", () => {
    const { input, native, page } = setup();
    key(input, "keydown"); window.dispatchEvent(new Event("blur"));
    key(native, "keyup");
    expect(page).toHaveBeenCalledOnce();
  });
});
