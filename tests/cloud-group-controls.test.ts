// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { CloudGroupThread } from "../src/cloud/group-thread";
import { SocialUI } from "../src/cloud/social-ui";
import { CloudError, type CloudClient } from "../src/cloud/client";
import type { CloudGroup, CloudMessage } from "../src/cloud/types";

const disposers: Array<() => void> = [];
afterEach(() => { for (const dispose of disposers.splice(0)) dispose(); document.body.replaceChildren(); vi.useRealTimers(); vi.restoreAllMocks(); });
async function setup(pins = false) {
  const group: CloudGroup = { id: "g", title: "Friends", owner: 101, conversationId: "c", revision: 1, membershipVersion: 1, keyVersion: 1, createdAt: 1, legacyId: null, members: [{ memberNumber: 101, role: "owner", status: "active" }] };
  const messages = [202, 101].map((sender, i): CloudMessage => ({ id: `m${i}`, conversationId: "c", sequence: i + 1, sender, text: i ? "My reply" : "Hello there", clientId: `id${i}`, schemaVersion: 1, encryption: "server-aes-256-gcm", membershipVersion: 1, keyVersion: 1, createdAt: 1, deletedAt: null }));
  const request = vi.fn(async (method: string, _path?: string): Promise<unknown> => method === "GET" ? { items: messages, nextCursor: null } : {});
  const client = { memberNumber: 101, connected: true, request, subscribe: () => () => {}, profile: async (memberNumber: number) => ({ memberNumber, displayName: memberNumber === 101 ? "Kiki" : "Snowy", avatarId: null, avatarFrame: "none" }) } as unknown as CloudClient;
  const errors: unknown[] = [], report = vi.fn();
  const ui = new SocialUI({ client, run: async action => { try { await action(); } catch (error) { errors.push(error); } }, image: () => document.createElement("div"), openProfile: vi.fn(), isBlocked: () => false });
  const draft = { text: "Draft", clientId: "draft-id" };
  const thread = new CloudGroupThread(ui, group, draft, { enterToSend: () => true, membershipChanged: vi.fn(), report, groupPins: pins, readUntil: vi.fn() });
  document.body.append(thread.element); await thread.loadOlder();
  disposers.push(() => { thread.stop(); ui.destroy(); });
  const bubbles = [...thread.element.querySelectorAll<HTMLElement>(".kl-group-message-bubble")];
  const menu = thread.element.querySelector<HTMLElement>(".kl-group-message-menu")!;
  return { thread, bubbles, menu, draft, request, report, errors, group, messages, ui };
}
const button = (root: ParentNode, label: string) => root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

it("shares a pin, loads its original with context, retains the reply draft, and handles deletion", async () => {
  const { thread, group, messages, bubbles, menu, request, draft } = await setup(true);
  const pinned: CloudMessage = { ...messages[0]!, id: "older", sequence: 30, text: "A long original message ".repeat(60) };
  let deleted = false;
  request.mockImplementation(async (method: string, path?: string) => {
    if (method === "PUT") return { pinRevision: 1, pinnedMessage: pinned };
    if (path?.endsWith("/messages/older")) { if (deleted) throw new CloudError("unavailable", 404); return pinned; }
    if (path?.includes("cursor=31")) return { items: [pinned], nextCursor: null };
    if (path === "/v1/groups/g") return group;
    return { items: messages, nextCursor: null };
  });
  bubbles[0]!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
  button(menu, "Pin message").click();
  await vi.waitFor(() => expect(thread.element.querySelector<HTMLElement>(".kl-group-pin-row")!.hidden).toBe(false));
  const bar = thread.element.querySelector<HTMLButtonElement>(".kl-group-pin-bar")!; bar.click();
  await vi.waitFor(() => expect(thread.element.querySelector('[data-message-id="older"][data-highlight="true"]')).not.toBeNull());
  expect(draft.text).toBe("Draft");
  thread.element.querySelector(".kl-group-history")!.dispatchEvent(new Event("scroll"));
  expect(thread.options.readUntil).not.toHaveBeenCalled();
  expect(thread.element.querySelector<HTMLElement>(".kl-group-new")!.hidden).toBe(false);
  deleted = true; bar.click();
  await vi.waitFor(() => expect(thread.element.querySelector(".kl-group-pin-status")!.textContent).toContain("no longer available"));
  expect(button(thread.element, "Unpin message").hidden).toBe(false);
  thread.element.querySelector<HTMLButtonElement>(".kl-group-new")!.click();
  await vi.waitFor(() => expect(thread.element.querySelector('[data-message-id="m0"]')).not.toBeNull());
  expect(draft.text).toBe("Draft");
});

it("does not offer pin actions to ordinary members or on servers without the feature", async () => {
  const member = await setup(true); member.group.members[0]!.role = "member";
  const legacy = await setup();
  for (const current of [member, legacy]) {
    current.bubbles[0]!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    expect(button(current.menu, "Pin message")).toBeNull();
  }
});

it("reveals one message's quick actions on tap, quotes a reply and copies the full original message", async () => {
  const { thread, bubbles, draft, errors } = await setup();
  const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  expect(thread.element.querySelector(".kl-social-menu")).toBeNull();
  expect(thread.element.querySelector("[data-actions]")).toBeNull();
  bubbles[0]!.click(); expect(bubbles[0]!.closest<HTMLElement>(".kl-group-message")?.dataset.actions).toBe("true");
  bubbles[1]!.click(); expect(bubbles[0]!.closest<HTMLElement>(".kl-group-message")?.dataset.actions).toBeUndefined();
  expect(bubbles[1]!.closest<HTMLElement>(".kl-group-message")?.dataset.actions).toBe("true");
  button(bubbles[0]!.parentElement!, "Reply to message").click();
  expect(draft.text).toBe("> Reply to Snowy: Hello there\nDraft");
  button(bubbles[1]!.parentElement!, "Reply to message").click();
  expect(draft.text).toBe("> Reply to Kiki: My reply\nDraft");
  button(bubbles[0]!.parentElement!, "Copy message").click();
  await vi.waitFor(() => expect(write).toHaveBeenCalledWith("Hello there")); expect(errors).toEqual([]);
});

it("opens safety actions by context menu and keyboard, preserving ownership permissions and focus", async () => {
  const { bubbles, menu, report } = await setup();
  bubbles[0]!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
  expect(menu.hidden).toBe(false); expect(button(menu, "Delete message")).not.toBeNull();
  expect(button(menu, "Block in Cloud")).not.toBeNull(); button(menu, "Report").click();
  expect(report).toHaveBeenCalledWith(bubbles[0]!.closest(".kl-group-message"), "m0"); expect(menu.hidden).toBe(true);
  bubbles[1]!.dispatchEvent(new KeyboardEvent("keydown", { key: "F10", shiftKey: true, bubbles: true }));
  expect(menu.hidden).toBe(false); expect(button(menu, "Report")).toBeNull();
  menu.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  expect(menu.hidden).toBe(true); expect(document.activeElement).toBe(bubbles[1]);
});

it("cancels long press on scrolling, movement and pause, and suppresses the click after a completed hold", async () => {
  const { thread, bubbles, menu } = await setup(); vi.useFakeTimers();
  const down = () => bubbles[0]!.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch", button: 0, clientX: 10, clientY: 10, bubbles: true }));
  down(); bubbles[0]!.dispatchEvent(new PointerEvent("pointermove", { pointerType: "touch", clientX: 10, clientY: 35, bubbles: true }));
  await vi.advanceTimersByTimeAsync(600); expect(menu.hidden).toBe(true);
  down(); thread.element.querySelector(".kl-group-history")!.dispatchEvent(new Event("scroll"));
  await vi.advanceTimersByTimeAsync(600); expect(menu.hidden).toBe(true);
  down(); thread.pause(); await vi.advanceTimersByTimeAsync(600); expect(menu.hidden).toBe(true);
  thread.resume(); down(); await vi.advanceTimersByTimeAsync(550); expect(menu.hidden).toBe(false);
  bubbles[0]!.click(); expect(menu.hidden).toBe(false); expect(bubbles[0]!.closest<HTMLElement>(".kl-group-message")?.dataset.actions).toBeUndefined();
  thread.stop(); expect(thread.element.querySelector(".kl-group-message-menu")).toBeNull();
});

it("sends the shared quote format, cancels cleanly and retains an excerpt when the original is removed", async () => {
  const { thread, bubbles, draft, request, group, messages } = await setup();
  const composer = thread.element.querySelector<HTMLTextAreaElement>("textarea")!;
  button(bubbles[0]!.parentElement!, "Reply to message").click();
  expect(composer.value).toBe("Draft"); expect(thread.element.querySelector(".kl-composer-reply .kl-message-reply-author")!.textContent).toBe("Snowy");
  button(thread.element, "Cancel reply").click(); expect(draft.text).toBe("Draft");
  expect(thread.element.querySelector<HTMLElement>(".kl-composer-reply")!.hidden).toBe(true);
  button(bubbles[0]!.parentElement!, "Reply to message").click();
  composer.value = "Answer " + "long ".repeat(300); composer.dispatchEvent(new Event("input"));
  const text = draft.text;
  request.mockImplementation(async (method: string, path?: string) => {
    if (method === "POST") return { ...messages[1]!, id: "sent", sequence: 3, text };
    if (path === "/v1/groups/g") return group;
    return { items: [], removedIds: ["m0"], nextCursor: null };
  });
  await thread.send();
  expect(request).toHaveBeenCalledWith("POST", "/v1/conversations/c/messages", expect.objectContaining({ text }));
  expect(text.startsWith("> Reply to Snowy: Hello there\nAnswer")).toBe(true);
  const sent = thread.element.querySelector<HTMLElement>('[data-message-id="sent"]')!;
  expect(sent.querySelector(".kl-message-reply-author")!.textContent).toBe("Snowy");
  expect(sent.querySelector(".kl-message-reply-excerpt")!.textContent).toBe("Hello there");
  expect(bubbles[0]!.textContent).toBe("Message removed");
  expect(bubbles[0]!.parentElement!.querySelector(".kl-message-side-actions")).toBeNull();
  expect(thread.element.textContent).not.toMatch(/unverified quote/i); expect(draft.text).toBe("");
  expect(thread.element.querySelector<HTMLElement>(".kl-composer-reply")!.hidden).toBe(true);
});

it("retains a reply after a failed send and clears the same paused/resumed draft after success", async () => {
  const { thread, bubbles, draft, request, group, messages } = await setup();
  button(bubbles[0]!.parentElement!, "Reply to message").click(); const saved = draft.text;
  request.mockRejectedValueOnce(new Error("Offline")); await expect(thread.send()).rejects.toThrow("Offline");
  expect(draft.text).toBe(saved); expect(thread.element.querySelector<HTMLElement>(".kl-composer-reply")!.hidden).toBe(false);
  let resolve!: (message: unknown) => void;
  request.mockImplementation(async (method: string, path?: string) => method === "POST" ? new Promise(done => { resolve = done; }) : path === "/v1/groups/g" ? group : { items: [], nextCursor: null });
  const pending = thread.send(); thread.pause(); thread.resume();
  resolve({ ...messages[1]!, id: "sent", sequence: 3, text: saved }); await pending;
  expect(draft.text).toBe(""); expect(thread.element.querySelector<HTMLTextAreaElement>("textarea")!.value).toBe("");
  expect(thread.element.querySelector<HTMLElement>(".kl-composer-reply")!.hidden).toBe(true);
});

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function typeDraft(thread: CloudGroupThread, text: string): HTMLTextAreaElement {
  const input = thread.element.querySelector<HTMLTextAreaElement>("textarea")!;
  input.value = text; input.dispatchEvent(new Event("input")); return input;
}

it.each(["Draft", "Draft with more text", "An edited beginning"])("detaches a slow submission immediately and preserves the next draft: %s", async next => {
  const { thread, draft, request, group, messages } = await setup();
  const post = deferred<CloudMessage>();
  request.mockImplementation(async (method: string, path?: string) => method === "POST" ? post.promise : path === "/v1/groups/g" ? group : { items: [], nextCursor: null });
  const pending = thread.send();
  const input = thread.element.querySelector<HTMLTextAreaElement>("textarea")!;
  expect(input.value).toBe(""); expect(draft.text).toBe("");
  expect(thread.element.querySelector(".kl-composer-count")!.textContent).toBe("0 / 4000");
  expect(document.activeElement).toBe(input);
  expect(draft.clientId).not.toBe("draft-id");
  const nextClientId = draft.clientId;
  typeDraft(thread, next); input.setSelectionRange(1, 3);
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  await thread.send();
  expect(request.mock.calls.filter(([method]) => method === "POST")).toHaveLength(1);
  const elsewhere = document.createElement("button"); document.body.append(elsewhere); elsewhere.focus();
  post.resolve({ ...messages[1]!, id: "sent", sequence: 3, text: "Draft" }); await pending;
  expect(input.value).toBe(next); expect(draft.text).toBe(next);
  expect(input.selectionStart).toBe(1); expect(input.selectionEnd).toBe(3);
  expect(document.activeElement).toBe(elsewhere);
  request.mockImplementation(async (method: string, path?: string) => method === "POST" ? { ...messages[1]!, id: "next", sequence: 4, text: next } : path === "/v1/groups/g" ? group : { items: [], nextCursor: null });
  await thread.send();
  expect(request).toHaveBeenCalledWith("POST", "/v1/conversations/c/messages", expect.objectContaining({ text: next, clientId: nextClientId }));
});

it("restores an untouched failed submission and retries with its original id", async () => {
  const { thread, draft, request, group, messages } = await setup();
  request.mockRejectedValueOnce(new Error("Response lost"));
  await expect(thread.send()).rejects.toThrow("Response lost");
  expect(draft).toEqual({ text: "Draft", clientId: "draft-id" });
  expect(button(thread.element, "Retry")).not.toBeNull();
  request.mockImplementation(async (method: string, path?: string) => method === "POST" ? { ...messages[1]!, id: "sent", sequence: 3, text: "Draft" } : path === "/v1/groups/g" ? group : { items: [], nextCursor: null });
  button(thread.element, "Retry").click();
  await vi.waitFor(() => expect(thread.element.querySelector('[data-message-id="sent"]')).not.toBeNull());
  const posts = request.mock.calls.filter(([method]) => method === "POST");
  expect(posts).toHaveLength(2);
  for (const call of posts) expect(call).toEqual(["POST", "/v1/conversations/c/messages", expect.objectContaining({ text: "Draft", clientId: "draft-id" })]);
  expect(draft.text).toBe(""); expect(button(thread.element, "Retry")).toBeNull();
});

it("keeps a failed message separate from a newer draft and retries it without consuming that draft", async () => {
  const { thread, draft, request, group, messages } = await setup();
  const post = deferred<CloudMessage>();
  request.mockImplementation(async (method: string, path?: string) => method === "POST" ? post.promise : path === "/v1/groups/g" ? group : { items: [], nextCursor: null });
  const pending = thread.send(); const failed = expect(pending).rejects.toThrow("Offline");
  const nextId = draft.clientId, input = typeDraft(thread, "Next message");
  post.reject(new Error("Offline")); await failed;
  expect(input.value).toBe("Next message"); expect(draft).toEqual({ text: "Next message", clientId: nextId });
  expect(thread.element.textContent).toContain("Message not confirmed: Draft");
  const retry = deferred<CloudMessage>();
  request.mockImplementation(async (method: string, path?: string) => method === "POST" ? retry.promise : path === "/v1/groups/g" ? group : { items: [], nextCursor: null });
  button(thread.element, "Retry").click();
  expect(input.value).toBe("Next message");
  expect(request).toHaveBeenLastCalledWith("POST", "/v1/conversations/c/messages", expect.objectContaining({ text: "Draft", clientId: "draft-id" }));
  typeDraft(thread, "Next message updated");
  retry.resolve({ ...messages[1]!, id: "sent", sequence: 3, text: "Draft" });
  await vi.waitFor(() => expect(button(thread.element, "Retry")).toBeNull());
  expect(draft.text).toBe("Next message updated"); expect(draft.clientId).toBe(nextId);
  request.mockImplementation(async (method: string, path?: string) => method === "POST" ? { ...messages[1]!, id: "next", sequence: 4, text: draft.text } : path === "/v1/groups/g" ? group : { items: [], nextCursor: null });
  await thread.send();
  expect(request).toHaveBeenCalledWith("POST", "/v1/conversations/c/messages", expect.objectContaining({ text: "Next message updated", clientId: nextId }));
  expect(nextId).not.toBe("draft-id");
});

it("does not restore a failed submission over a draft that was typed and deliberately cleared", async () => {
  const { thread, draft, request } = await setup();
  const post = deferred<CloudMessage>(); request.mockImplementation(async () => post.promise);
  const pending = thread.send(), failed = expect(pending).rejects.toThrow("Offline");
  typeDraft(thread, "Changed my mind"); typeDraft(thread, "");
  post.reject(new Error("Offline")); await failed;
  expect(draft.text).toBe(""); expect(draft.clientId).not.toBe("draft-id");
  expect(button(thread.element, "Retry")).not.toBeNull();
});

it("allocates a distinct id when an unconfirmed restored message is edited", async () => {
  const { thread, draft, request, group, messages } = await setup();
  request.mockRejectedValueOnce(new Error("Response lost")); await expect(thread.send()).rejects.toThrow("Response lost");
  typeDraft(thread, "Draft edited"); const editedId = draft.clientId;
  expect(editedId).not.toBe("draft-id");
  request.mockImplementation(async (method: string, path?: string) => method === "POST" ? { ...messages[1]!, id: "edited", sequence: 3, text: "Draft edited" } : path === "/v1/groups/g" ? group : { items: [], nextCursor: null });
  await thread.send();
  expect(request).toHaveBeenCalledWith("POST", "/v1/conversations/c/messages", expect.objectContaining({ text: "Draft edited", clientId: editedId }));
  expect(button(thread.element, "Retry")).not.toBeNull();
  button(thread.element, "Retry").click();
  await vi.waitFor(() => expect(button(thread.element, "Retry")).toBeNull());
  expect(request).toHaveBeenCalledWith("POST", "/v1/conversations/c/messages", expect.objectContaining({ text: "Draft", clientId: "draft-id" }));
});

it("retains pending ownership and an original retry through thread recreation", async () => {
  const { thread, draft, request, group, messages, ui } = await setup();
  const post = deferred<CloudMessage>();
  request.mockImplementation(async (method: string, path?: string) => method === "POST" ? post.promise : path === "/v1/groups/g" ? group : { items: [], nextCursor: null });
  const pending = thread.send(), failed = expect(pending).rejects.toThrow("Offline");
  thread.stop(); thread.element.remove();
  const replacement = new CloudGroupThread(ui, group, draft, thread.options);
  document.body.append(replacement.element); disposers.push(() => replacement.stop());
  expect(replacement.element.querySelector<HTMLTextAreaElement>("textarea")!.value).toBe("");
  typeDraft(replacement, "New message"); await replacement.send();
  expect(request.mock.calls.filter(([method]) => method === "POST")).toHaveLength(1);
  post.reject(new Error("Offline")); await failed;
  expect(draft.text).toBe("New message"); expect(button(replacement.element, "Retry")).not.toBeNull();
  replacement.pause(); replacement.resume();
  request.mockImplementation(async (method: string, path?: string) => method === "POST" ? { ...messages[1]!, id: "sent", sequence: 3, text: "Draft" } : path === "/v1/groups/g" ? group : { items: [], nextCursor: null });
  button(replacement.element, "Retry").click();
  await vi.waitFor(() => expect(button(replacement.element, "Retry")).toBeNull());
  expect(draft.text).toBe("New message");
  expect(request).toHaveBeenCalledWith("POST", "/v1/conversations/c/messages", expect.objectContaining({ text: "Draft", clientId: "draft-id" }));
});

it("restores an untouched failed submission in a replacement thread", async () => {
  const { thread, draft, request, group, ui } = await setup();
  const post = deferred<CloudMessage>(); request.mockImplementation(async () => post.promise);
  const pending = thread.send(), failed = expect(pending).rejects.toThrow("Offline");
  thread.stop(); thread.element.remove();
  const replacement = new CloudGroupThread(ui, group, draft, thread.options);
  document.body.append(replacement.element); disposers.push(() => replacement.stop());
  post.reject(new Error("Offline")); await failed;
  expect(draft).toEqual({ text: "Draft", clientId: "draft-id" });
  expect(replacement.element.querySelector<HTMLTextAreaElement>("textarea")!.value).toBe("Draft");
  expect(button(replacement.element, "Send").disabled).toBe(false);
});

it("does not restore or offer a retry after an accepted message's history refresh fails", async () => {
  const { thread, draft, request, messages } = await setup();
  request.mockImplementation(async (method: string) => {
    if (method === "POST") return { ...messages[1]!, id: "sent", sequence: 3, text: "Draft" };
    throw new Error("History unavailable");
  });
  await expect(thread.send()).rejects.toThrow("History unavailable");
  expect(draft.text).toBe(""); expect(button(thread.element, "Retry")).toBeNull();
  expect(thread.element.querySelector('[data-message-id="sent"]')).not.toBeNull();
  await thread.send(); expect(request.mock.calls.filter(([method]) => method === "POST")).toHaveLength(1);
});

it("stops offering retries without changing an untouched restored draft's id", async () => {
  const { thread, draft, request, group, messages } = await setup();
  request.mockRejectedValueOnce(new Error("Response lost")); await expect(thread.send()).rejects.toThrow("Response lost");
  button(thread.element, "Stop retrying").click();
  expect(button(thread.element, "Retry")).toBeNull(); expect(draft).toEqual({ text: "Draft", clientId: "draft-id" });
  request.mockImplementation(async (method: string, path?: string) => method === "POST" ? { ...messages[1]!, id: "sent", sequence: 3, text: "Draft" } : path === "/v1/groups/g" ? group : { items: [], nextCursor: null });
  await thread.send();
  expect(request).toHaveBeenCalledWith("POST", "/v1/conversations/c/messages", expect.objectContaining({ text: "Draft", clientId: "draft-id" }));
});

it("uses a new id after editing a restored draft whose retry was dismissed", async () => {
  const { thread, draft, request } = await setup();
  request.mockRejectedValueOnce(new Error("Response lost")); await expect(thread.send()).rejects.toThrow("Response lost");
  button(thread.element, "Stop retrying").click(); typeDraft(thread, "Edited after dismissal");
  expect(draft.clientId).not.toBe("draft-id"); expect(button(thread.element, "Retry")).toBeNull();
});

it("keeps multiple unconfirmed messages behind one bounded recovery row and preserves the active draft", async () => {
  const { thread, draft, request } = await setup();
  request.mockRejectedValue(new Error("Offline"));
  await expect(thread.send()).rejects.toThrow("Offline");
  typeDraft(thread, "Second message"); await expect(thread.send()).rejects.toThrow("Offline");
  typeDraft(thread, "Newest draft"); const nextId = draft.clientId;
  expect(thread.element.querySelectorAll('button[aria-label="Retry"]')).toHaveLength(1);
  expect(thread.element.textContent).toContain("2 messages not confirmed: Draft");
  button(thread.element, "Stop retrying").click();
  expect(thread.element.textContent).toContain("Message not confirmed: Second message");
  expect(draft).toEqual({ text: "Newest draft", clientId: nextId });
  button(thread.element, "Stop retrying").click();
  expect(button(thread.element, "Retry")).toBeNull(); expect(draft).toEqual({ text: "Newest draft", clientId: nextId });
});

it("does not strand or restore accepted sends when the draft preview observer throws", async () => {
  const { thread, draft, request, group, messages } = await setup();
  const observerError = new Error("Inbox rendering failed");
  thread.options.draftChanged = () => { throw observerError; };
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  request.mockImplementation(async (method: string, path?: string) => method === "POST" ? { ...messages[1]!, id: "sent", sequence: 3, text: "Draft" } : path === "/v1/groups/g" ? group : { items: [], nextCursor: null });
  const pending = thread.send();
  expect(draft.text).toBe(""); expect(thread.element.querySelector<HTMLTextAreaElement>("textarea")!.value).toBe("");
  await pending;
  expect(thread.element.querySelector('[data-message-id="sent"]')).not.toBeNull();
  expect(button(thread.element, "Retry")).toBeNull();
  typeDraft(thread, "Next message"); expect(button(thread.element, "Send").disabled).toBe(false);
  await thread.send(); expect(request.mock.calls.filter(([method]) => method === "POST")).toHaveLength(2);
  expect(logged).toHaveBeenCalledWith("[KikiLink:cloud-group] Draft observer failed", observerError);
});

it("retains a failed submission and releases pending ownership when its draft observer throws", async () => {
  const { thread, draft, request, group, messages } = await setup();
  thread.options.draftChanged = () => { throw new Error("Inbox rendering failed"); };
  vi.spyOn(console, "error").mockImplementation(() => {});
  request.mockRejectedValueOnce(new Error("Network unavailable"));
  await expect(thread.send()).rejects.toThrow("Network unavailable");
  expect(draft).toEqual({ text: "Draft", clientId: "draft-id" });
  expect(button(thread.element, "Send").disabled).toBe(false);
  expect(button(thread.element, "Retry").disabled).toBe(false);
  request.mockImplementation(async (method: string, path?: string) => method === "POST" ? { ...messages[1]!, id: "sent", sequence: 3, text: "Draft" } : path === "/v1/groups/g" ? group : { items: [], nextCursor: null });
  await thread.send(); expect(draft.text).toBe(""); expect(button(thread.element, "Retry")).toBeNull();
  const posts = request.mock.calls.filter(([method]) => method === "POST");
  expect(posts).toHaveLength(2);
  for (const call of posts) expect(call).toEqual(["POST", "/v1/conversations/c/messages", expect.objectContaining({ text: "Draft", clientId: "draft-id" })]);
});
