import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const path = process.env.KIKILINK_BC_SERVER_SOURCE;
describe.skipIf(!path)("Pinned BC R131 native Beep presentation", () => {
  it("keeps KikiLink service Beeps silent in the lobby and room while ordinary Beeps still display", () => {
    const source = readFileSync(path!, "utf8");
    expect(createHash("sha256").update(source).digest("hex")).toBe(
      "f7a5d09b622b027e37cd97ad100030ea4608d32db3ddb3cc316ac7e312d31a70",
    );
    const start = source.indexOf("function ServerAccountBeep(data) {");
    const end = source.indexOf("function ServerSendBeepMessage(", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    for (const screen of ["MainHall", "ChatSearch", "ChatRoom"]) {
      const beep = vi.fn(),
        send = vi.fn();
      const scope = {
        Player: { ChatSettings: { ShowBeepChat: false } },
        CurrentScreen: screen,
        InterfaceTextGet: (s: string) => s,
        FriendListBeepLog: [],
        ServerShowBeep: beep,
        ServerSend: send,
      };
      const receive = runInNewContext(
        source.slice(start, end) + "\nServerAccountBeep",
        scope,
      ) as (data: unknown) => void;
      receive({
        MemberNumber: 909,
        MemberName: "Verifier",
        BeepType: "KikiLink",
        Message: "KIKILINK/1 test",
      });
      expect(beep).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
      expect(scope.FriendListBeepLog).toHaveLength(0);
      receive({
        MemberNumber: 202,
        MemberName: "Friend",
        BeepType: "",
        Message: "Hello",
      });
      expect(beep).toHaveBeenCalledOnce();
      expect(scope.FriendListBeepLog).toHaveLength(1);
    }
  });
});
