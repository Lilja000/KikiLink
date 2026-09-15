// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { CloudClient } from "../src/cloud/client";
import { CloudPanel } from "../src/cloud/panel";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import type { CloudPost, CloudProfile } from "../src/cloud/types";

const disposers: Array<() => void> = [];
afterEach(() => {
  for (const d of disposers.splice(0)) d();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
function button(root: ParentNode, label: string): HTMLButtonElement {
  const result = [...root.querySelectorAll("button")].find(
    (b) => b.textContent === label,
  );
  if (!result) throw new Error(`Missing ${label}`);
  return result;
}
async function setup(posts: CloudPost[] = []) {
  const storage = new MemoryKeyValueStorage(),
    settings = new SettingsStore(storage),
    writes: Array<{ path: string; body: unknown }> = [];
  let offline = false;
  const fetchImpl = vi.fn(
    async (url: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(url)).pathname;
      if (path === "/v1/events") return new Response(null, { status: 503 });
      if (offline) throw new TypeError("offline");
      const body =
        typeof init?.body === "string"
          ? (JSON.parse(init.body) as unknown)
          : undefined;
      if (init?.method !== "GET") writes.push({ path, body });
      let value: unknown;
      if (path === "/v1/auth/challenges")
        value = {
          challengeId: crypto.randomUUID(),
          proof: "p".repeat(43),
          exchange: "e".repeat(43),
          verifierMember: 909,
          expiresAt: Date.now() + 180000,
        };
      else if (path === "/v1/auth/exchange")
        value = {
          memberNumber: 101,
          token: "t".repeat(43),
          expiresAt: Date.now() + 3600000,
        };
      else if (path === "/v1/me") value = { moderator: false };
      else if (path === "/v1/feed") value = { items: posts, nextCursor: null };
      else if (path === "/v1/profiles/101")
        return new Response(JSON.stringify({ error: "not_found" }), {
          status: 404,
        });
      else if (
        path === "/v1/blocks" ||
        path === "/v1/groups" ||
        path === "/v1/group-invitations"
      )
        value = { items: [] };
      else value = {};
      return new Response(JSON.stringify(value), {
        headers: { "content-type": "application/json" },
      });
    },
  );
  const client = new CloudClient({
    origin: "https://cloud.example.test",
    memberNumber: 101,
    getMemberNumber: () => 101,
    isBlocked: () => false,
    sendProof: () => {},
    fetchImpl,
  });
  const panel = new CloudPanel(client, {
    settings: () => settings.get(),
    storage,
    ownName: () => "Kiki",
    legacyGroups: () => [],
    isBlocked: () => false,
    openProfile: () => {},
  });
  document.body.append(panel.element);
  disposers.push(() => panel.destroy());
  panel.setVisible(true);
  return {
    panel,
    client,
    writes,
    fetchImpl,
    settings,
    offline: () => {
      offline = true;
    },
  };
}
async function connect(panel: CloudPanel) {
  button(panel.element, "Connect with this BC account").click();
  await vi.waitFor(() =>
    expect(panel.element.querySelector('textarea[aria-label="Share a post"]')).not.toBeNull(),
  );
}
describe("Cloud UI automatic verification and recovery", () => {
  it("releases observers for replaced offscreen images and its cleanup timer on destroy", async () => {
    const observed = new Set<Element>();
    vi.stubGlobal("IntersectionObserver", class {
      observe(node: Element) { observed.add(node); }
      unobserve(node: Element) { observed.delete(node); }
      disconnect() { observed.clear(); }
    });
    const { panel, settings } = await setup();
    try {
      await connect(panel);
      settings.update(s => { s.linkPresence.profileImagePreviews = "always"; });
      vi.useFakeTimers();
      const baseline = vi.getTimerCount();
      for (let i = 0; i < 25; i++) {
        const image = panel.profileImage(`offscreen-${i}`, "avatar");
        panel.element.append(image); image.remove();
      }
      expect(observed.size).toBe(25);
      await vi.advanceTimersByTimeAsync(2100);
      expect(observed.size).toBe(0);
      expect(vi.getTimerCount()).toBeLessThanOrEqual(baseline);
      panel.destroy();
      expect(vi.getTimerCount()).toBe(0);
    } finally { panel.destroy(); vi.useRealTimers(); vi.unstubAllGlobals(); }
  });
  it("keeps a cached Feed image alive while loading images in Groups", async () => {
    const profile: CloudProfile = { memberNumber: 202, displayName: "Person", bio: "", avatarId: null, bannerId: null,
      avatarFrame: "none", profileStyle: "classic", revision: 1, visible: true, updatedAt: 1 };
    const post: CloudPost = { id: 1, author: 202, profile, text: "Photo", mediaIds: ["feed-image"], revision: 1,
      createdAt: 1, updatedAt: 1, commentCount: 0, reactions: { counts: [], mine: null } };
    const { panel, client, settings } = await setup([post]);
    settings.update(s => { s.linkPresence.profileImagePreviews = "ask"; });
    const media = vi.spyOn(client, "media").mockResolvedValue(new Blob(["pixels"], { type: "image/png" }));
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    await connect(panel);
    panel.element.querySelector<HTMLButtonElement>(".kl-feed-post .kl-cloud-image-wrap button")!.click();
    await vi.waitFor(() => expect(panel.element.querySelector(".kl-feed-post img")).not.toBeNull());
    const img = panel.element.querySelector<HTMLImageElement>(".kl-feed-post img")!, source = img.src;
    panel.setVisible(true, "groups");
    await vi.waitFor(() => expect(panel.element.querySelector(".kl-group-create")).not.toBeNull());
    const extra = panel.profileImage("group-avatar", "avatar"); panel.element.append(extra);
    extra.querySelector("button")!.click(); await vi.waitFor(() => expect(extra.querySelector("img")).not.toBeNull());
    expect(revoke.mock.calls.some(([url]) => url === source)).toBe(false);
    panel.setVisible(true, "feed");
    expect(panel.element.querySelector(".kl-feed-post img")).toBe(img); expect(img.src).toBe(source);
    expect(media).toHaveBeenCalledTimes(2);
  });
  it("shows clear data information before any network request and only connects by deliberate action", async () => {
    const { panel, fetchImpl } = await setup();
    expect(panel.element.textContent).toContain("not end-to-end encrypted");
    expect(fetchImpl).not.toHaveBeenCalled();
    await connect(panel);
    expect(panel.client.connected).toBe(true);
  });
  it("retains an unsent Feed draft during API outage and resumes ordinary UI navigation", async () => {
    const { panel, offline } = await setup();
    await connect(panel);
    const draft = panel.element.querySelector("textarea")!;
    draft.value = "Keep my unsent words";
    draft.dispatchEvent(new Event("input"));
    offline();
    button(panel.element, "Post").click();
    await vi.waitFor(() =>
      expect(panel.element.textContent).toContain("temporarily unavailable"),
    );
    expect(draft.value).toBe("Keep my unsent words");
    expect(button(panel.element, "Groups").disabled).toBe(false);
    panel.setVisible(false);
    expect(panel.element.hidden).toBe(true);
  });
  it("leaves native profile data untouched when a Cloud profile draft is prepared", async () => {
    const { panel, settings } = await setup();
    settings.update((s) => {
      s.linkPresence.bio = "Existing biography";
      s.linkPresence.avatarUrl = "https://files.catbox.moe/a.png";
    });
    const before = JSON.stringify(settings.get());
    await connect(panel);
    button(panel.element, "My profile").click();
    await vi.waitFor(() =>
      expect(panel.element.textContent).toContain(
        "Copy existing profile details",
      ),
    );
    button(panel.element, "Copy existing profile details").click();
    expect(panel.element.querySelector("textarea")!.value).toBe(
      "Existing biography",
    );
    expect(JSON.stringify(settings.get())).toBe(before);
  });
  it("renders untrusted profile text as text, refuses unsafe CSS and respects image privacy", async () => {
    const { panel, client, settings } = await setup();
    await connect(panel);
    settings.update((s) => {
      s.linkPresence.profileImagePreviews = "never";
    });
    vi.spyOn(client, "profile").mockResolvedValue({
      memberNumber: 202,
      displayName: "<img src=x onerror=alert(1)>",
      bio: "<script>unsafe()</script>",
      revision: 1,
      visible: true,
      avatarId: crypto.randomUUID(),
      bannerId: null,
      avatarFrame: "none",
      profileStyle: "classic",
      profileOutlineColor: "url(https://evil.test)",
      updatedAt: Date.now(),
    } as CloudProfile);
    const media = vi.spyOn(client, "media");
    const card = await panel.profileCard(202);
    document.body.append(card!);
    expect(card!.querySelector("script")).toBeNull();
    expect(card!.textContent).toContain("<script>");
    expect(card!.style.borderColor).toBe("");
    expect(media).not.toHaveBeenCalled();
    expect(card!.textContent).toContain("hidden by your preview setting");
  });
});
