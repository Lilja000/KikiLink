// Runs as the fixture page's normal script, never injected into a live BC page.
// This is deliberately synthetic: only the actual addon, FUSAM loader, WebCrypto,
// IndexedDB and local Cloud API are under test. No native account is logged in.
import { IndexedDbCloudDeviceStore } from '../../src/cloud/device-key.ts';

const status = document.querySelector('#status');
const start = document.querySelector('#start');
const stop = document.querySelector('#stop');
const output = document.querySelector('#result');
const nativeFetch = window.fetch.bind(window);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function request(path, body) {
  const response = await nativeFetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'X-KikiLink-Fixture': '1', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`fixture_http_${response.status}`);
  return response.json();
}
async function until(check, label, timeout = 12000) {
  const end = performance.now() + timeout;
  while (performance.now() < end) {
    const value = await check();
    if (value) return value;
    await sleep(100);
  }
  throw new Error(label);
}
function requireThat(value, label) { if (!value) throw new Error(label); }

let meta, saved, saveKey, store, loggedIn = false;
function persist() { sessionStorage.setItem(saveKey, JSON.stringify(saved)); }
function passed(name) {
  if (!saved.checks.includes(name)) saved.checks.push(name);
  persist();
  const item = document.createElement('li');
  item.textContent = name;
  item.className = 'pass';
  document.querySelector('#checks').append(item);
}
async function finish(result, error) {
  saved.phase = 'complete';
  persist();
  const report = await request('/fixture/report', { result, checks: saved.checks, ...(error ? { error } : {}) });
  status.textContent = report.result === 'passed' ? 'Проверка пройдена.' : 'Проверка не пройдена.';
  status.className = report.result === 'passed' ? 'pass' : 'fail';
  output.textContent = JSON.stringify(report, null, 2);
  stop.disabled = false;
}

function installNativeFixture() {
  window.Player = { Name: 'Browser fixture', Nickname: 'Browser fixture', ExtensionSettings: {}, FriendList: [], FriendNames: new Map(), BlackList: [], GhostList: [], WhiteList: [] };
  window.CurrentScreen = 'Login';
  window.ChatRoomData = null;
  window.ChatRoomCharacter = [];
  window.ChatRoomCharacterDrawlist = [];
  window.CurrentCharacter = null;
  window.GameVersion = 'R131';
  window.GameReadyState = { load: new Promise(() => {}) };
  window.CommonIsObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  window.ServerIsLoggedIn = () => loggedIn;
  window.ServerPlayerIsInChatRoom = () => false;
  window.ServerPlayerExtensionSettingsSync = () => {};
  window.ServerAccountBeep = () => {};
  window.ServerAccountQueryResult = () => {};
  window.ChatRoomMessage = () => {};
  window.ServerSendBeepMessage = () => {};
  window.FriendListBeepLog = [];
  window.AssetGroup = [];
  window.ActivityFemale3DCG = [];
  window.ServerSend = (event, data) => {
    if (event === 'AccountQuery' && data.Query === 'OnlineFriends') {
      queueMicrotask(() => ServerAccountQueryResult({ Query: 'OnlineFriends', Result: [] }));
    } else if (event === 'AccountBeep') {
      // Sender is fixed by this local synthetic transport, not a real BC claim.
      void request('/fixture/proof', { event, data, screen: CurrentScreen }).catch(() => {
        status.textContent = 'Ошибка локальной доставки подтверждения.';
      });
    } else if (event === 'ChatRoomJoin' || event === 'ChatRoomCreate') {
      throw new Error('unexpected_room_operation');
    }
  };
  window.fetch = (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.origin === meta.cloudOrigin) {
      return nativeFetch(`/fixture/api${url.pathname}${url.search}`, {
        ...init, headers: { ...init?.headers, 'X-KikiLink-Fixture': '1' },
      });
    }
    if (url.origin !== location.origin) throw new Error('fixture_external_network_refused');
    return nativeFetch(input, init);
  };
}
async function loadAddon() {
  installNativeFixture();
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/fusam-entry.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('fusam_entry_failed'));
    document.head.append(script);
  });
  await window.loadLocalAddon();
  requireThat(window.KikiLink, 'addon_public_api_missing');
  await sleep(350);
}
function login() {
  Player.MemberNumber = meta.member;
  CurrentScreen = 'ChatSearch';
  loggedIn = true;
}
const state = () => request('/fixture/state');
const device = () => store.load();
const root = () => document.querySelector('#kikilink-root')?.shadowRoot;

async function run() {
  start.disabled = true;
  status.textContent = 'Проверка входа в лобби…';
  await loadAddon();
  if (saved.phase === 'initial') {
    requireThat((await state()).authRequests === 0, 'authentication_before_native_login');
    passed('no_authentication_before_login');
    login();
    await until(async () => (await state()).enrollments === 1, 'automatic_lobby_enrollment_timeout');
    const key = await until(async () => { const k = await device(); return k?.device ? k : null; }, 'device_not_persisted');
    requireThat(CurrentScreen === 'ChatSearch' && ChatRoomData === null, 'left_lobby');
    requireThat((await state()).proofs === 1, 'unexpected_initial_proof_count');
    passed('fusam_automatic_lobby_enrollment');
    requireThat(!key.privateKey.extractable, 'private_key_extractable');
    let exportRejected = false;
    try { await crypto.subtle.exportKey('jwk', key.privateKey); } catch { exportRejected = true; }
    requireThat(exportRejected, 'private_key_export_succeeded');
    passed('nonextractable_key_in_indexeddb');
    const otherMember = new IndexedDbCloudDeviceStore(meta.cloudOrigin, meta.member + 1);
    const otherCloud = new IndexedDbCloudDeviceStore(`https://other-${meta.run}.example.invalid`, meta.member);
    requireThat(await otherMember.load() === undefined && await otherCloud.load() === undefined, 'device_namespace_leak');
    passed('account_and_cloud_origin_isolation');
    saved.publicKey = JSON.stringify(key.publicKey);
    saved.phase = 'resume';
    persist();
    status.textContent = 'Первый вход пройден. Перезагрузка для проверки ключа…';
    location.reload();
  } else if (saved.phase === 'resume') {
    status.textContent = 'Повторный вход после полной перезагрузки…';
    login();
    await until(async () => (await state()).resumes === 1, 'device_resume_timeout');
    const key = await until(async () => { const k = await device(); return k?.device ? k : null; }, 'reloaded_device_missing');
    requireThat(JSON.stringify(key.publicKey) === saved.publicKey, 'key_changed_after_reload');
    requireThat((await state()).proofs === 1, 'second_beep_after_reload');
    passed('reload_resumes_with_same_key_without_beep');
    requireThat((await request('/fixture/replay', {})).denied, 'device_exchange_replay_accepted');
    passed('device_exchange_replay_denied');
    await until(() => root(), 'addon_mount_timeout');
    await window.KikiLink.open();
    const cloud = await until(() => root().querySelector('[data-target="cloud"]'), 'cloud_navigation_missing');
    cloud.click();
    const disconnect = await until(() => [...root().querySelectorAll('button')].find(button => button.textContent === 'Disconnect'), 'disconnect_button_missing');
    disconnect.click();
    await until(async () => (await device()) === 'paused', 'disconnect_pause_not_saved');
    const revoked = await request('/fixture/revoked', {});
    requireThat(revoked.denied, 'disconnected_credentials_still_valid');
    passed('disconnect_revokes_device_and_sessions');
    saved.authRequests = (await state()).authRequests;
    saved.phase = 'paused';
    persist();
    location.reload();
  } else if (saved.phase === 'paused') {
    status.textContent = 'Проверка отключения после перезагрузки…';
    login();
    await until(() => root(), 'paused_addon_mount_timeout');
    await sleep(2300);
    requireThat(await device() === 'paused', 'pause_marker_lost');
    const s = await state();
    requireThat(s.authRequests === saved.authRequests && s.proofs === 1 && s.activeDevices === 0 && s.activeSessions === 0, 'automatic_login_after_disconnect');
    passed('disconnect_survives_reload_without_authentication');
    await finish('passed');
  }
}

try {
  meta = await request('/fixture/meta');
  saveKey = `KikiLink.browserFixture.${meta.run}`;
  saved = JSON.parse(sessionStorage.getItem(saveKey) || 'null') || { phase: 'initial', checks: [] };
  store = new IndexedDbCloudDeviceStore(meta.cloudOrigin, meta.member);
  for (const check of [...saved.checks]) passed(check);
  const query = new URL(location.href).searchParams;
  if (query.get('fusam') !== `${location.origin}/KikiLink.fusam.js` || query.get('fusamType') !== 'script') {
    throw new Error('use_the_launcher_url');
  }
  start.onclick = () => void run().catch(error => finish('failed', String(error.message).replace(/[^a-z0-9_]/gi, '_').slice(0, 100)));
  stop.onclick = async () => {
    stop.disabled = true;
    try {
      await window.KikiLink?.destroy();
      await store.pause();
      sessionStorage.removeItem(saveKey);
    } finally {
      // A browser storage failure must not prevent disposal of the local API.
      await request('/fixture/stop', {});
      status.textContent = 'Тестовый сервер остановлен. Отчёт сохранён.';
    }
  };
  if (saved.phase === 'complete') {
    output.textContent = JSON.stringify(await request('/fixture/report'), null, 2);
    status.textContent = 'Этот запуск завершён. Для нового теста перезапустите сервер.';
    stop.disabled = false;
  } else if (saved.phase !== 'initial') {
    await run().catch(error => finish('failed', String(error.message).replace(/[^a-z0-9_]/gi, '_').slice(0, 100)));
  } else {
    start.disabled = false;
    status.textContent = 'Готово. Настоящий браузер выполнит проверку после нажатия кнопки.';
  }
} catch (error) {
  status.textContent = `Не удалось подготовить проверку: ${String(error.message).replace(/[^a-z0-9_]/gi, '_').slice(0, 100)}`;
  status.className = 'fail';
}
