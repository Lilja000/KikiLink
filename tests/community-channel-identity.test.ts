// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { CloudClient, CloudError } from "../src/cloud/client";
import { CommunitiesPage } from "../src/modules/platform-shell/communities-page";

it("resolves a channel author's shared identity once and drops it in place when access ends", async () => {
  const origin = "https://cloud.example.test", actor = 60421;
  const community = { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "Garden", membership: "active",
    role: "member", revision: 1, access: "public", rules: [], icon: "leaf", color: "sage", memberCount: 2 };
  const channel = { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", name: "general", revision: 1, canPost: false };
  const cloud = new CloudClient({ origin, memberNumber: 123, getMemberNumber: () => 123,
    isBlocked: () => false, sendProof: vi.fn(), fetchImpl: vi.fn() });
  vi.spyOn(cloud, "connected", "get").mockReturnValue(true);
  let allowed = true;
  const request = vi.spyOn(cloud, "request").mockImplementation(async (_method, path) => {
    const route = new URL(path, origin).pathname;
    if (route === "/v1/me") return { memberNumber: 123, features: { communities: true } };
    if (route === `/v1/communities/${community.id}`) return community;
    if (route.endsWith("/channels")) return { items: [channel] };
    if (route.endsWith("/messages")) return { items: [1, 2].map(sequence => ({
      author: actor, sequence, id: String(sequence), text: "Hello", createdAt: 1000 * sequence
    })), nextCursor: null };
    if (route === `/v1/profiles/${actor}`) {
      if (!allowed) throw new CloudError("not_found", 404);
      return { memberNumber: actor, displayName: "Willow", avatarId: "willow-photo", visible: true };
    }
    throw new CloudError("not_found", 404);
  });
  const page = new CommunitiesPage(cloud, {
    current: () => true, name: id => `Member ${id}`, openProfile: () => {},
    avatar: id => { const image = document.createElement("img"); image.alt = id; return image; },
  });
  try {
    document.body.append(page.element);
    page.open(community.id, channel.id);
    const author = () => page.element.querySelector<HTMLButtonElement>(".kl-cm-author");
    await vi.waitFor(() => expect(author()?.textContent).toBe("Willow"));
    const button = author()!;
    expect(request.mock.calls.filter(([, path]) => path === `/v1/profiles/${actor}`)).toHaveLength(1);
    expect(page.element.querySelector('.kl-cm-author-face img[alt="willow-photo"]')).not.toBeNull();
    expect(page.element.querySelector('[data-grouped="true"]')?.getAttribute("aria-label")).toBe("Message from Willow");
    allowed = false;
    await expect(cloud.profile(actor, true)).rejects.toThrow();
    expect(author()).toBe(button);
    expect(button.textContent).toBe("Member");
    expect(page.element.querySelector(".kl-cm-author-face img")).toBeNull();
    expect(page.element.querySelector(".kl-cm-author-initials svg")).not.toBeNull();
  } finally { page.destroy(); cloud.destroy(); page.element.remove(); }
});
