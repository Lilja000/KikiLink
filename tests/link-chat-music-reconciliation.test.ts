// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { BCAdapter } from "../src/bc/adapter";
import { MemoryKeyValueStorage, SettingsStore } from "../src/core/settings";
import { ChatService } from "../src/modules/link-chat/chat-service";
import { LinkChatView } from "../src/modules/link-chat/view";
import { MemoryChatRepository } from "../src/storage/memory-chat-repository";
import type {
  DeviceMusicTrack,
  MusicStore,
} from "../src/storage/device-music-store";

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("LinkChat local music reconciliation", () => {
  it("reconciles replaced settings while protecting a file staged by a batch add", async () => {
    const settings = new SettingsStore(new MemoryKeyValueStorage());
    settings.update((draft) => {
      draft.linkMusic.playlists[0]!.tracks = [{
        id: "old-track",
        title: "Old track",
        source: "local",
        locator: "old-device-blob",
        addedAt: 1,
      }];
    });
    const first = deviceTrack("new-device-one", 2);
    const second = deviceTrack("new-device-two", 3);
    let resolveSecond!: (track: DeviceMusicTrack) => void;
    const secondSave = new Promise<DeviceMusicTrack>((resolve) => {
      resolveSecond = resolve;
    });
    let addCount = 0;
    const reconcile = vi.fn(async (
      _referencedIds: ReadonlySet<string>,
      _protectedIds?: ReadonlySet<string>,
    ) => [] as string[]);
    const musicStore: MusicStore = {
      list: vi.fn(async () => [deviceTrack("old-device-blob", 1)]),
      get: vi.fn(async () => undefined),
      add: vi.fn(async () => {
        addCount += 1;
        return addCount === 1 ? first : await secondSave;
      }),
      delete: vi.fn(async () => undefined),
      reconcile,
      close: vi.fn(),
    };
    const adapter = {
      getMemberName: (memberNumber: number) => `Member ${memberNumber}`,
      getMemberNickname: () => undefined,
      getOwnMemberNumber: () => 999,
      getOwnName: () => "Kiki",
      getKnownContacts: () => [],
      getRoomCharacters: () => [],
      getCurrentRoomName: () => undefined,
      isInChatRoom: () => false,
      canSendBeep: () => true,
      isReady: () => true,
      sendBeep: vi.fn(),
      getRoomAdminSnapshot: () => undefined,
    } as unknown as BCAdapter;
    const view = new LinkChatView(
      adapter,
      new ChatService(new MemoryChatRepository(), settings),
      settings,
      "0.28.1",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      musicStore,
    );

    view.mount();
    await vi.waitFor(() => expect(reconcile).toHaveBeenCalled());
    const initialReferenced = reconcile.mock.calls[0]?.[0];
    expect([...initialReferenced!]).toEqual(["old-device-blob"]);

    const shadow = document.querySelector<HTMLElement>("#kikilink-root")?.shadowRoot;
    const input = shadow?.querySelector<HTMLInputElement>(".kl-music-add input[type=file]");
    const add = shadow?.querySelector<HTMLButtonElement>(".kl-music-add .kl-text-button--primary");
    if (!input || !add) throw new Error("Missing local music controls");
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [
        new File([Uint8Array.of(1)], "one.mp3", { type: "audio/mpeg" }),
        new File([Uint8Array.of(2)], "two.mp3", { type: "audio/mpeg" }),
      ],
    });
    add.click();
    await vi.waitFor(() => expect(musicStore.add).toHaveBeenCalledTimes(2));

    settings.update((draft) => {
      draft.linkMusic.playlists[0]!.tracks = [];
    });
    await vi.waitFor(() => expect(reconcile).toHaveBeenCalledTimes(2));
    const [, protectedIds] = reconcile.mock.calls[1]!;
    expect([...(protectedIds ?? [])]).toEqual([first.id]);

    resolveSecond(second);
    await vi.waitFor(() => {
      expect(settings.get().linkMusic.playlists[0]!.tracks.map((track) => track.locator))
        .toEqual([first.id, second.id]);
    });
    view.destroy();
  });
});

function deviceTrack(id: string, createdAt: number): DeviceMusicTrack {
  return {
    id,
    name: id,
    mimeType: "audio/mpeg",
    roomExtension: "mp3",
    createdAt,
    blob: new Blob([Uint8Array.of(createdAt)], { type: "audio/mpeg" }),
  };
}
