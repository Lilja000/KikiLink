/**
 * Returns Bondage Club's real page global.
 *
 * KikiLink needs GM_xmlhttpRequest for its optional upload bridge. On Firefox that grant can put
 * the userscript in a JavaScript sandbox even though the DOM UI still mounts normally. Echo, WCE,
 * and BCX execute their room hooks in the page realm; unsafeWindow is the userscript-manager
 * supported route to that same realm without giving up the narrowly scoped uploader grant.
 */
export function getBCPageWindow(): Window & Record<string, any> {
  try {
    if (typeof unsafeWindow === "object" && unsafeWindow !== null) {
      return unsafeWindow as Window & Record<string, any>;
    }
  } catch {
    // A manager can deny unsafeWindow. Direct page injection remains the safe fallback.
  }
  return window as Window & Record<string, any>;
}

/**
 * Mirrors only the BC surface used by KikiLink into the current userscript world.
 *
 * Live getters and setters are deliberate: BC and other addons replace functions and arrays during
 * login, screen changes, and hot reloads. A copied snapshot would silently become stale and make
 * the room Blossom disappear again while the DOM interface continued to work.
 */
export function installBCPageContextBridge(): Window & Record<string, any> {
  const page = getBCPageWindow();
  const locals = new Set<Record<string, any>>([
    globalThis as Record<string, any>,
    window as Window & Record<string, any>,
  ]);

  for (const local of locals) {
    if (local === page) continue;
    for (const name of BC_PAGE_GLOBALS) {
      try {
        const descriptor = Object.getOwnPropertyDescriptor(local, name);
        if (descriptor && descriptor.configurable === false) continue;
        Object.defineProperty(local, name, {
          configurable: true,
          enumerable: descriptor?.enumerable ?? false,
          get: () => page[name],
          set: (value) => {
            page[name] = value;
          },
        });
      } catch {
        // One protected browser property must not block the remaining BC bridge.
      }
    }
  }
  return page;
}

const BC_PAGE_GLOBALS = [
  "ActivityAllowedForGroup",
  "ActivityDictionaryText",
  "ActivityEffectFlat",
  "ActivityFemale3DCG",
  "ActivityFemale3DCGOrdering",
  "ActivityRun",
  "AssetGroup",
  "bcModSdk",
  "CharacterGetCurrent",
  "CharacterNickname",
  "ChatRoomCharacter",
  "ChatRoomCharacterDrawlist",
  "ChatRoomCharacterViewDrawOverlay",
  "ChatRoomCharacterViewLoopCharacters",
  "ChatRoomData",
  "ChatRoomDrawCharacterStatusIcons",
  "ChatRoomGetSettings",
  "ChatRoomHideIconState",
  "ChatRoomMessage",
  "ChatRoomPlayerIsAdmin",
  "ChatRoomPublishCustomAction",
  "ChatRoomSendEmote",
  "ChatRoomSetTarget",
  "CurrentCharacter",
  "CurrentScreen",
  "CurrentTime",
  "DialogActivity",
  "DialogBuildActivities",
  "DialogLeave",
  "DialogMenuMapping",
  "DialogMenuMode",
  "DrawCharacter",
  "DrawImageCanvas",
  "DrawImageResize",
  "ElementButton",
  "FriendListBeepLog",
  "FriendListLoadFriendList",
  "GameVersion",
  "InformationSheetLoadCharacter",
  "LZString",
  "MainCanvas",
  "Player",
  "PreferenceGetActivityFactor",
  "ServerAccountBeep",
  "ServerAccountQueryResult",
  "ServerIsLoggedIn",
  "ServerPlayerExtensionSettingsSync",
  "ServerPlayerIsInChatRoom",
  "ServerRoomSearch",
  "ServerSend",
  "ServerSendBeepMessage",
  "ServerSocket",
] as const;
