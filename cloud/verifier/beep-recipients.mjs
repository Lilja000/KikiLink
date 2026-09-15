/** Configure only the dedicated verifier's own receive permissions.
 * The player's friend/block lists and room are never changed.
 */
function refuse(code) {
  const error = new Error("beep_permissions_refused");
  error.code = code;
  throw error;
}

export function prepareBeepRecipients(socket, login, config) {
  const recipients = config.receiveMembers;
  if (!recipients?.size) return false;
  if (
    login.MemberNumber !== config.member ||
    !socket.connected ||
    recipients.size > 100 ||
    [...recipients].some(
      (n) => !config.allowedMembers.has(n) || n === config.member,
    )
  )
    refuse("receive_identity_refused");
  // Native Login.js initializes omitted online lists as empty. Keep rejecting
  // malformed values that are actually present, and preserve explicit blocks.
  const lists = [login.FriendList, login.BlackList, login.GhostList].map(
    (list) => list === undefined ? [] : list,
  );
  if (
    lists.some(
      (list) =>
        !Array.isArray(list) ||
        list.length > 5000 ||
        list.some((n) => !Number.isSafeInteger(n) || n < 1),
    )
  )
    refuse("receive_lists_invalid");
  const [friends, blocked, ghosted] = lists;
  if (
    [...recipients].some(
      (n) => blocked.includes(n) || ghosted.includes(n),
    )
  )
    refuse("receive_sender_blocked");
  const next = [...new Set([...friends, ...recipients])];
  if (next.length > 5000) refuse("receive_friends_limit");
  if (next.length === friends.length) return false;
  socket.emit("AccountUpdate", { FriendList: next });
  return true;
}
