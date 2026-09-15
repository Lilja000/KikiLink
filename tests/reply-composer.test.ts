// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReplyComposer, replyPreview } from "../src/modules/link-chat/reply-composer";
import { formatInlineReplyPrefix, parseInlineReplyContext } from "../src/modules/link-chat/message-reply";
import { copyMessageText, messageActions, shouldSendMessage } from "../src/modules/link-chat/message-controls";
import { MessageInteraction } from "../src/modules/link-chat/message-interaction";

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });
describe.each([1000, 4000])("shared replies with %i-character transport", limit => {
  it("keeps the answer editable, replaces quotes, cancels with Escape and round-trips a persisted draft", () => {
    const input = document.createElement("textarea"); input.value = "My draft";
    const composer = new ReplyComposer(input, limit); document.body.append(composer.element, input);
    const update = vi.fn(); input.addEventListener("input", update);
    composer.replyTo("Snowy", "Hello\nthere");
    expect(input.value).toBe("My draft"); expect(input.maxLength).toBe(limit - formatInlineReplyPrefix("Snowy", "Hello there").length);
    composer.replyTo("Kiki", "> Reply to Snowy: Hello there\nEarlier answer");
    expect(composer.value).toBe("> Reply to Kiki: Earlier answer\nMy draft");
    const saved = composer.value; composer.load("Another chat"); expect(composer.element.hidden).toBe(true);
    composer.load(saved); expect(input.value).toBe("My draft"); expect(composer.element.hidden).toBe(false);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(composer.value).toBe("My draft"); expect(input.maxLength).toBe(limit); expect(composer.element.hidden).toBe(true);
    expect(update).toHaveBeenCalledTimes(3); composer.destroy();
  });
  it("keeps a failed or oversized reply intact, prevents quote-only sending and protects in-flight sends", () => {
    const input = document.createElement("textarea"), composer = new ReplyComposer(input, limit);
    composer.replyTo("Kiki", "A".repeat(2000)); expect(composer.hasContent).toBe(false);
    const pending = composer.value; input.value = "x".repeat(input.maxLength); expect(composer.value.length).toBe(limit);
    expect(() => composer.replyTo("A much longer author", "B".repeat(2000))).toThrow("message limit");
    expect(composer.value).toBe(pending + input.value);
    input.disabled = true; composer.cancel(); composer.replyTo("Other", "Text"); expect(composer.value.startsWith(pending)).toBe(true);
    input.disabled = false; composer.element.querySelector<HTMLButtonElement>("button")!.click();
    expect(composer.value).toBe(input.value); expect(composer.element.hidden).toBe(true); composer.destroy();
  });
});
it("renders text-only excerpts without source assumptions, warning labels or executable links", () => {
  const text = formatInlineReplyPrefix('<img src=x onerror="bad()">', "https://example.com/ <script>bad()</script>") + "Reply";
  const card = replyPreview(parseInlineReplyContext(text)!);
  expect(card.querySelectorAll("img,script,a,button")).toHaveLength(0);
  expect(card.textContent).toContain('<img src=x onerror="bad()">');
  expect(card.outerHTML).not.toMatch(/unverified quote|Quoted as/i);
  expect(card.getAttribute("role")).toBe("note");
});
it("uses identical action markup and tap/keyboard behavior for both conversation structures", () => {
  const root = document.createElement("div"), history = document.createElement("div"); root.append(history); document.body.append(root);
  const controls = new MessageInteraction(root, history);
  for (const group of [false, true]) {
    const row = document.createElement("article"), line = document.createElement("div"), bubble = document.createElement("div");
    row.className = "kl-message-interaction"; row.dataset.actionable = "true"; bubble.className = "kl-message-bubble"; bubble.tabIndex = 0;
    const actions = messageActions(vi.fn(), async () => {}, vi.fn());
    if (group) { line.append(bubble, actions); row.append(line); } else row.append(bubble, actions);
    history.append(row); bubble.click(); expect(row.dataset.actions).toBe("true");
    bubble.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(document.activeElement).toBe(actions.firstElementChild);
    history.dispatchEvent(new Event("scroll")); expect(row.dataset.actions).toBeUndefined();
  }
  expect(history.children[0]!.querySelector(".kl-message-side-actions")!.outerHTML)
    .toBe(history.children[1]!.querySelector(".kl-message-side-actions")!.outerHTML);
  controls.destroy();
});
it("copies the complete message and shares success/failure feedback", async () => {
  const error = vi.fn(), write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  const message = "> Reply to Snowy: A quote\n" + "Long body ".repeat(300);
  const actions = messageActions(vi.fn(), () => copyMessageText(message), error); document.body.append(actions);
  const copy = actions.querySelector<HTMLButtonElement>('[aria-label="Copy message"]')!;
  copy.click(); await vi.waitFor(() => expect(copy.disabled).toBe(false));
  expect(write).toHaveBeenCalledWith(message); expect(copy.title).toBe("Message copied");
  write.mockRejectedValueOnce(new Error("Blocked")); copy.click(); await vi.waitFor(() => expect(error).toHaveBeenCalledTimes(1));
});
it("keeps Direct and Groups keyboard modifiers and IME handling identical", () => {
  const send = (options: KeyboardEventInit, enter = true) => shouldSendMessage(new KeyboardEvent("keydown", { key: "Enter", ...options }), enter);
  expect(send({})).toBe(true); expect(send({}, false)).toBe(false);
  expect(send({ shiftKey: true })).toBe(false); expect(send({ altKey: true })).toBe(false);
  expect(send({ ctrlKey: true, shiftKey: true }, false)).toBe(true); expect(send({ metaKey: true }, false)).toBe(true);
  expect(send({ ctrlKey: true, isComposing: true })).toBe(false);
});
