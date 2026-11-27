import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, MemoryKeyValueStorage } from "../src/core/settings";
import type { CommunityService, MailItem } from "../src/cloud/community";
import { NotificationCenter, type AlertEvent } from "../src/cloud/notifications";

function mutual(id: number): MailItem {
  return { id, kind: "swipe_mutual", actor: 202, targetType: "swipe_match", targetId: String(id),
    mailSenderName: "Fenny", read: false, pending: false, count: 1, createdAt: Date.now(), updatedAt: Date.now() };
}

describe("mutual likes in the notification center", () => {
  it("catches up offline in the bell, alerts once on live delivery and respects quiet and withdrawn notices", () => {
    const first = mutual(1), second = mutual(2);
    const listeners = new Set<() => void>();
    const community = {
      client: { memberNumber: 101, origin: "https://cloud.test", connected: true, subscribe: () => () => {} },
      adapter: { getMemberName: () => "" },
      mailboxLoaded: true, mailbox: { items: [first] }, feedUnread: 0, subscribe(listener: () => void) {
        listeners.add(listener); return () => listeners.delete(listener);
      },
    };
    const update = (items: MailItem[]) => { community.mailbox.items = items; listeners.forEach(listener => listener()); };
    const deliver = vi.fn<(event: AlertEvent, current: () => boolean) => void>();
    let quiet = false, blocked = false;
    const center = new NotificationCenter(community as unknown as CommunityService, new MemoryKeyValueStorage(), {
      current: () => true, blocked: () => blocked, active: () => false, quiet: () => quiet,
      settings: () => DEFAULT_SETTINGS, groupMuted: () => false, directMuted: async () => false,
      openChat: async () => {}, readChat: async () => {}, refreshChats: async () => {}, deliver,
    });
    try {
      expect(center.snapshot.total).toBe(1);
      expect(deliver).not.toHaveBeenCalled();
      update([second, first]);
      update([second, first]);
      expect(deliver).toHaveBeenCalledTimes(1);
      const [event, stillValid] = deliver.mock.calls[0]!;
      expect(event).toMatchObject({ category: "social", actor: 202, text: "You and Fenny liked each other" });
      expect(stillValid()).toBe(true);
      update([first]);
      expect(stillValid()).toBe(false);
      quiet = true;
      update([mutual(3), first]);
      expect(deliver).toHaveBeenCalledTimes(1);
      blocked = true;
      center.update();
      expect(center.snapshot.total).toBe(0);
      expect(center.snapshot.mail).toEqual([]);
    } finally { center.destroy(); }
  });
});
