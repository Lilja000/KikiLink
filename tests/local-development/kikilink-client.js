// Three synthetic accounts, isolated by the same storage namespace as the real addon.
const member = Number(new URL(location.href).searchParams.get('member'));
const fixtures = new Map([[910001, ['Kiki', '']], [910002, ['Reina', 'Moon Garden']], [910003, ['Mina', 'Lounge']]]);
const [name, room] = fixtures.get(member);
const friends = member === 910001 ? [910002, 910003] : [910001];
document.getElementById('identity').textContent = `${name} · ${room || 'Lobby'}`;
window.Player = { MemberNumber: member, Name: name, Nickname: name, ExtensionSettings: {}, FriendList: friends, FriendNames: new Map(friends.map((id) => [id, fixtures.get(id)[0]])), BlackList: [], GhostList: [], WhiteList: [] };
window.CurrentScreen = room ? 'ChatRoom' : 'ChatSearch';
window.ChatRoomData = room ? { Name: room, Space: 'MainHall', Visibility: ['All'], Admin: [member] } : null;
window.ChatRoomCharacter = room ? [Player] : [];
window.ChatRoomCharacterDrawlist = ChatRoomCharacter;
window.CurrentCharacter = null;
window.GameVersion = 'R131';
// FUSAM's automatic UI hooks await vanilla load. The harness calls its real localdev entry explicitly.
window.GameReadyState = { load: new Promise(() => {}) };
window.CommonIsObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
window.ServerIsLoggedIn = () => true;
window.ServerPlayerIsInChatRoom = () => Boolean(room);
window.ServerPlayerExtensionSettingsSync = () => {};
window.ServerAccountBeep = () => {};
window.ServerAccountQueryResult = () => {};
window.ChatRoomMessage = () => {};
window.ServerSendBeepMessage = (target, message) => ServerSend('AccountBeep', { MemberNumber: target, Message: message, BeepType: '' });
window.FriendListBeepLog = [];
window.AssetGroup = [];
window.ActivityFemale3DCG = [];
window.ServerSend = (event, data) => {
  if (event === 'AccountQuery' && data.Query === 'OnlineFriends') parent.postMessage({ type: 'friends' }, location.origin);
  else if (event === 'AccountBeep' || event === 'ChatRoomChat') parent.postMessage({ type: 'packet', data }, location.origin);
};
window.addEventListener('message', (event) => {
  if (event.origin !== location.origin || event.source !== parent) return;
  if (event.data.type === 'beep') ServerAccountBeep(event.data.data);
  if (event.data.type === 'refresh-friends') parent.postMessage({ type: 'friends' }, location.origin);
  if (event.data.type === 'friends-result') {
    ServerAccountQueryResult({ Query: 'OnlineFriends', Result: event.data.friends.map((p) => ({ Type: 'Friend', MemberNumber: p.id, MemberName: p.name, MemberNickname: p.name, ChatRoomName: p.room, ChatRoomSpace: 'MainHall', Private: false })) });
  }
});
document.getElementById('inject-beep').onclick = () => {
  const sender = friends[0];
  ServerAccountBeep({ MemberNumber: sender, MemberName: fixtures.get(sender)[0], Message: 'A fresh test message ' + new Date().toLocaleTimeString(), BeepType: '' });
};
