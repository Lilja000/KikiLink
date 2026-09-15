import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { prepareBeepRecipients } from "../verifier/beep-recipients.mjs";
import { attachCloudVerifier } from "../verifier/bc-adapter.mjs";

const config = {
  member: 909,
  allowedMembers: new Set([101, 202]),
  receiveMembers: new Set([101]),
};
test("Receive preparation changes only the service list and preserves existing friendships", () => {
  const sent = [],
    socket = { connected: true, emit: (...args) => sent.push(args) };
  const login = {
    MemberNumber: 909,
    FriendList: [303],
    BlackList: [],
    GhostList: [],
  };
  assert.equal(prepareBeepRecipients(socket, login, config), true);
  assert.deepEqual(sent, [["AccountUpdate", { FriendList: [303, 101] }]]);
  assert.deepEqual(login.FriendList, [303]);
  assert.equal(
    prepareBeepRecipients(socket, { ...login, FriendList: [303, 101] }, config),
    false,
  );
});
test("Receive preparation never unblocks a sender or changes a different account", () => {
  const socket = {
    connected: true,
    emit: () => {
      throw new Error("must not emit");
    },
  };
  const login = {
    MemberNumber: 909,
    FriendList: [],
    BlackList: [],
    GhostList: [],
  };
  for (const data of [
    { ...login, MemberNumber: 101 },
    { ...login, BlackList: [101] },
    { ...login, GhostList: [101] },
    { ...login, FriendList: null },
  ])
    assert.throws(
      () => prepareBeepRecipients(socket, data, config),
      /beep_permissions_refused/,
    );
  assert.throws(
    () =>
      prepareBeepRecipients(socket, login, {
        ...config,
        receiveMembers: new Set([606]),
      }),
    /beep_permissions_refused/,
  );
  assert.equal(
    prepareBeepRecipients(socket, login, {
      ...config,
      receiveMembers: new Set(),
    }),
    false,
  );
});
test("Native omitted lists are empty without losing explicit blocks or accepting malformed lists", () => {
  for (const lists of [ {}, { FriendList: [303] }, { GhostList: [404] }, { BlackList: [404] } ]) {
    const sent = [];
    const socket = { connected: true, emit: (...args) => sent.push(args) };
    const login = { MemberNumber: 909, ...lists };
    const original = structuredClone(login);
    assert.equal(prepareBeepRecipients(socket, login, config), true);
    assert.deepEqual(sent, [["AccountUpdate", { FriendList: [...(lists.FriendList ?? []), 101] }]]);
    assert.deepEqual(login, original);
  }
  for (const lists of [
    { BlackList: [101] }, { GhostList: [101] },
    { BlackList: null }, { GhostList: "101" }, { FriendList: {} },
    { BlackList: ["101"] }, { GhostList: [0] },
  ]) {
    let emitted = false;
    const socket = { connected: true, emit: () => { emitted = true; } };
    assert.throws(() => prepareBeepRecipients(socket, { MemberNumber: 909, ...lists }, config),
      /beep_permissions_refused/);
    assert.equal(emitted, false);
  }
});
test("Proof diagnostics distinguish receipt, rejection and backend refusal without recording payloads", async () => {
  const socket = new EventEmitter(),
    codes = [];
  socket.connected = true;
  const detach = attachCloudVerifier(socket, {
    expectedVerifierMember: 909,
    allowedMembers: new Set([101]),
    getAuthenticatedMemberNumber: () => 909,
    endpoint: "http://127.0.0.1:8792/verify",
    secret: "s".repeat(43),
    diagnostic: (code) => codes.push(code),
    fetchImpl: async () => new Response(null, { status: 403 }),
  });
  const data = {
    MemberNumber: 101,
    BeepType: "KikiLink",
    Message:
      "KIKILINK/1 " +
      JSON.stringify({
        t: "cloud-verify",
        v: 1,
        challengeId: crypto.randomUUID(),
        proof: "p".repeat(43),
      }),
  };
  socket.emit("AccountBeep", data);
  socket.emit("AccountBeep", data);
  await new Promise(setImmediate);
  assert.deepEqual(codes, [
    "native_beep_received",
    "native_proof_received",
    "proof_api_rejected",
  ]);
  assert.ok(!JSON.stringify(codes).includes(data.Message));
  detach();
});
