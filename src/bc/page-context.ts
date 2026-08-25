/**
 * Returns Bondage Club's real page global.
 *
 * KikiLink deliberately requests a JavaScript sandbox so `unsafeWindow` remains available even
 * when the page CSP blocks normal main-world injection. The KikiLink UI can mount in that sandbox,
 * while every bare BC global is otherwise missing. That exact split makes the launcher appear
 * while Blossom and native Custom Activities both silently fail.
 */
export function getBCPageWindow(): Window & Record<string, any> {
  try {
    if (typeof unsafeWindow === "object" && unsafeWindow !== null) {
      return unsafeWindow as Window & Record<string, any>;
    }
  } catch {
    // Access can be denied by a userscript manager; the main-world window remains the safe fallback.
  }
  return window as Window & Record<string, any>;
}

/**
 * Mirrors the small, explicit BC surface used by KikiLink into the current userscript world.
 * Getters and setters are intentional: BC replaces several arrays/functions during login and
 * screen reloads, and KikiLink must always observe the newest page value rather than a stale copy.
 */
export function installBCPageContextBridge(): Window & Record<string, any> {
  const page = getBCPageWindow();
  // In Chromium userscript sandboxes `globalThis` can be distinct from the DOM-facing `window`
  // proxy. Bare identifiers resolve on the former, while some bundled libraries use the latter.
  // Bridge both surfaces so neither integration depends on a manager-specific global layout.
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
        // One protected property must not prevent the remaining BC surface from being bridged.
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
  "CharacterGetCurrent",
  "CharacterNickname",
  "ChatRoomCharacter",
  "ChatRoomCharacterDrawlist",
  "ChatRoomCharacterViewDrawOverlay",
  "ChatRoomCharacterViewLoopCharacters",
  "ChatRoomData",
  "ChatRoomDrawCharacterStatusIcons",
  "ChatRoomHideIconState",
  "ChatRoomMessage",
  "ChatRoomPublishCustomAction",
  "ChatRoomSendEmote",
  "ChatRoomSetTarget",
  "CurrentCharacter",
  "CurrentScreen",
  "DialogActivity",
  "DialogBuildActivities",
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
  "ServerSend",
  "ServerSendBeepMessage",
  "ServerSocket",
  "bcModSdk",
] as const;
