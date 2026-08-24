// ==UserScript==
// @name         KikiLink
// @namespace    kikilink.bc
// @version      0.14.0
// @description  A polished social and interaction addon for Bondage Club.
// @author       KikiLink contributors
// @license      MIT
// @homepageURL  https://github.com/Lilja000/KikiLink
// @supportURL   https://github.com/Lilja000/KikiLink/issues
// @downloadURL  https://raw.githubusercontent.com/Lilja000/KikiLink/main/dist/KikiLink.user.js
// @updateURL    https://raw.githubusercontent.com/Lilja000/KikiLink/main/dist/KikiLink.user.js
// @match        https://*.bondageprojects.elementfx.com/*
// @match        https://*.bondageprojects.com/*
// @match        https://*.bondage-europe.com/*
// @match        https://*.bondage-asia.com/*
// @run-at       document-end
// @inject-into  page
// @sandbox      raw
// @grant        none
// ==/UserScript==
"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/bondage-club-mod-sdk/dist/bcmodsdk.js
  var require_bcmodsdk = __commonJS({
    "node_modules/bondage-club-mod-sdk/dist/bcmodsdk.js"(exports) {
      var bcModSdk = (function() {
        "use strict";
        const o = "1.2.0";
        function e(o2) {
          alert("Mod ERROR:\n" + o2);
          const e2 = new Error(o2);
          throw console.error(e2), e2;
        }
        const t = new TextEncoder();
        function n(o2) {
          return !!o2 && "object" == typeof o2 && !Array.isArray(o2);
        }
        function r(o2) {
          const e2 = /* @__PURE__ */ new Set();
          return o2.filter(((o3) => !e2.has(o3) && e2.add(o3)));
        }
        const i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Set();
        function c(o2) {
          a.has(o2) || (a.add(o2), console.warn(o2));
        }
        function s(o2) {
          const e2 = [], t2 = /* @__PURE__ */ new Map(), n2 = /* @__PURE__ */ new Set();
          for (const r3 of f.values()) {
            const i3 = r3.patching.get(o2.name);
            if (i3) {
              e2.push(...i3.hooks);
              for (const [e3, a2] of i3.patches.entries()) t2.has(e3) && t2.get(e3) !== a2 && c(`ModSDK: Mod '${r3.name}' is patching function ${o2.name} with same pattern that is already applied by different mod, but with different pattern:
Pattern:
${e3}
Patch1:
${t2.get(e3) || ""}
Patch2:
${a2}`), t2.set(e3, a2), n2.add(r3.name);
            }
          }
          e2.sort(((o3, e3) => e3.priority - o3.priority));
          const r2 = (function(o3, e3) {
            if (0 === e3.size) return o3;
            let t3 = o3.toString().replaceAll("\r\n", "\n");
            for (const [n3, r3] of e3.entries()) t3.includes(n3) || c(`ModSDK: Patching ${o3.name}: Patch ${n3} not applied`), t3 = t3.replaceAll(n3, r3);
            return (0, eval)(`(${t3})`);
          })(o2.original, t2);
          let i2 = function(e3) {
            var t3, i3;
            const a2 = null === (i3 = (t3 = m.errorReporterHooks).hookChainExit) || void 0 === i3 ? void 0 : i3.call(t3, o2.name, n2), c2 = r2.apply(this, e3);
            return null == a2 || a2(), c2;
          };
          for (let t3 = e2.length - 1; t3 >= 0; t3--) {
            const n3 = e2[t3], r3 = i2;
            i2 = function(e3) {
              var t4, i3;
              const a2 = null === (i3 = (t4 = m.errorReporterHooks).hookEnter) || void 0 === i3 ? void 0 : i3.call(t4, o2.name, n3.mod), c2 = n3.hook.apply(this, [e3, (o3) => {
                if (1 !== arguments.length || !Array.isArray(e3)) throw new Error(`Mod ${n3.mod} failed to call next hook: Expected args to be array, got ${typeof o3}`);
                return r3.call(this, o3);
              }]);
              return null == a2 || a2(), c2;
            };
          }
          return { hooks: e2, patches: t2, patchesSources: n2, enter: i2, final: r2 };
        }
        function l(o2, e2 = false) {
          let r2 = i.get(o2);
          if (r2) e2 && (r2.precomputed = s(r2));
          else {
            let e3 = window;
            const a2 = o2.split(".");
            for (let t2 = 0; t2 < a2.length - 1; t2++) if (e3 = e3[a2[t2]], !n(e3)) throw new Error(`ModSDK: Function ${o2} to be patched not found; ${a2.slice(0, t2 + 1).join(".")} is not object`);
            const c2 = e3[a2[a2.length - 1]];
            if ("function" != typeof c2) throw new Error(`ModSDK: Function ${o2} to be patched not found`);
            const l2 = (function(o3) {
              let e4 = -1;
              for (const n2 of t.encode(o3)) {
                let o4 = 255 & (e4 ^ n2);
                for (let e5 = 0; e5 < 8; e5++) o4 = 1 & o4 ? -306674912 ^ o4 >>> 1 : o4 >>> 1;
                e4 = e4 >>> 8 ^ o4;
              }
              return ((-1 ^ e4) >>> 0).toString(16).padStart(8, "0").toUpperCase();
            })(c2.toString().replaceAll("\r\n", "\n")), d2 = { name: o2, original: c2, originalHash: l2 };
            r2 = Object.assign(Object.assign({}, d2), { precomputed: s(d2), router: () => {
            }, context: e3, contextProperty: a2[a2.length - 1] }), r2.router = /* @__PURE__ */ (function(o3) {
              return function(...e4) {
                return o3.precomputed.enter.apply(this, [e4]);
              };
            })(r2), i.set(o2, r2), e3[r2.contextProperty] = r2.router;
          }
          return r2;
        }
        function d() {
          for (const o2 of i.values()) o2.precomputed = s(o2);
        }
        function p() {
          const o2 = /* @__PURE__ */ new Map();
          for (const [e2, t2] of i) o2.set(e2, { name: e2, original: t2.original, originalHash: t2.originalHash, sdkEntrypoint: t2.router, currentEntrypoint: t2.context[t2.contextProperty], hookedByMods: r(t2.precomputed.hooks.map(((o3) => o3.mod))), patchedByMods: Array.from(t2.precomputed.patchesSources) });
          return o2;
        }
        const f = /* @__PURE__ */ new Map();
        function u(o2) {
          f.get(o2.name) !== o2 && e(`Failed to unload mod '${o2.name}': Not registered`), f.delete(o2.name), o2.loaded = false, d();
        }
        function g(o2, t2) {
          o2 && "object" == typeof o2 || e("Failed to register mod: Expected info object, got " + typeof o2), "string" == typeof o2.name && o2.name || e("Failed to register mod: Expected name to be non-empty string, got " + typeof o2.name);
          let r2 = `'${o2.name}'`;
          "string" == typeof o2.fullName && o2.fullName || e(`Failed to register mod ${r2}: Expected fullName to be non-empty string, got ${typeof o2.fullName}`), r2 = `'${o2.fullName} (${o2.name})'`, "string" != typeof o2.version && e(`Failed to register mod ${r2}: Expected version to be string, got ${typeof o2.version}`), o2.repository || (o2.repository = void 0), void 0 !== o2.repository && "string" != typeof o2.repository && e(`Failed to register mod ${r2}: Expected repository to be undefined or string, got ${typeof o2.version}`), null == t2 && (t2 = {}), t2 && "object" == typeof t2 || e(`Failed to register mod ${r2}: Expected options to be undefined or object, got ${typeof t2}`);
          const i2 = true === t2.allowReplace, a2 = f.get(o2.name);
          a2 && (a2.allowReplace && i2 || e(`Refusing to load mod ${r2}: it is already loaded and doesn't allow being replaced.
Was the mod loaded multiple times?`), u(a2));
          const c2 = (o3) => {
            let e2 = g2.patching.get(o3.name);
            return e2 || (e2 = { hooks: [], patches: /* @__PURE__ */ new Map() }, g2.patching.set(o3.name, e2)), e2;
          }, s2 = (o3, t3) => (...n2) => {
            var i3, a3;
            const c3 = null === (a3 = (i3 = m.errorReporterHooks).apiEndpointEnter) || void 0 === a3 ? void 0 : a3.call(i3, o3, g2.name);
            g2.loaded || e(`Mod ${r2} attempted to call SDK function after being unloaded`);
            const s3 = t3(...n2);
            return null == c3 || c3(), s3;
          }, p2 = { unload: s2("unload", (() => u(g2))), hookFunction: s2("hookFunction", ((o3, t3, n2) => {
            "string" == typeof o3 && o3 || e(`Mod ${r2} failed to patch a function: Expected function name string, got ${typeof o3}`);
            const i3 = l(o3), a3 = c2(i3);
            "number" != typeof t3 && e(`Mod ${r2} failed to hook function '${o3}': Expected priority number, got ${typeof t3}`), "function" != typeof n2 && e(`Mod ${r2} failed to hook function '${o3}': Expected hook function, got ${typeof n2}`);
            const s3 = { mod: g2.name, priority: t3, hook: n2 };
            return a3.hooks.push(s3), d(), () => {
              const o4 = a3.hooks.indexOf(s3);
              o4 >= 0 && (a3.hooks.splice(o4, 1), d());
            };
          })), patchFunction: s2("patchFunction", ((o3, t3) => {
            "string" == typeof o3 && o3 || e(`Mod ${r2} failed to patch a function: Expected function name string, got ${typeof o3}`);
            const i3 = l(o3), a3 = c2(i3);
            n(t3) || e(`Mod ${r2} failed to patch function '${o3}': Expected patches object, got ${typeof t3}`);
            for (const [n2, i4] of Object.entries(t3)) "string" == typeof i4 ? a3.patches.set(n2, i4) : null === i4 ? a3.patches.delete(n2) : e(`Mod ${r2} failed to patch function '${o3}': Invalid format of patch '${n2}'`);
            d();
          })), removePatches: s2("removePatches", ((o3) => {
            "string" == typeof o3 && o3 || e(`Mod ${r2} failed to patch a function: Expected function name string, got ${typeof o3}`);
            const t3 = l(o3);
            c2(t3).patches.clear(), d();
          })), callOriginal: s2("callOriginal", ((o3, t3, n2) => {
            "string" == typeof o3 && o3 || e(`Mod ${r2} failed to call a function: Expected function name string, got ${typeof o3}`);
            const i3 = l(o3);
            return Array.isArray(t3) || e(`Mod ${r2} failed to call a function: Expected args array, got ${typeof t3}`), i3.original.apply(null != n2 ? n2 : globalThis, t3);
          })), getOriginalHash: s2("getOriginalHash", ((o3) => {
            "string" == typeof o3 && o3 || e(`Mod ${r2} failed to get hash: Expected function name string, got ${typeof o3}`);
            return l(o3).originalHash;
          })) }, g2 = { name: o2.name, fullName: o2.fullName, version: o2.version, repository: o2.repository, allowReplace: i2, api: p2, loaded: true, patching: /* @__PURE__ */ new Map() };
          return f.set(o2.name, g2), Object.freeze(p2);
        }
        function h() {
          const o2 = [];
          for (const e2 of f.values()) o2.push({ name: e2.name, fullName: e2.fullName, version: e2.version, repository: e2.repository });
          return o2;
        }
        let m;
        const y = void 0 === window.bcModSdk ? window.bcModSdk = (function() {
          const e2 = { version: o, apiVersion: 1, registerMod: g, getModsInfo: h, getPatchingInfo: p, errorReporterHooks: Object.seal({ apiEndpointEnter: null, hookEnter: null, hookChainExit: null }) };
          return m = e2, Object.freeze(e2);
        })() : (n(window.bcModSdk) || e("Failed to init Mod SDK: Name already in use"), 1 !== window.bcModSdk.apiVersion && e(`Failed to init Mod SDK: Different version already loaded ('1.2.0' vs '${window.bcModSdk.version}')`), window.bcModSdk.version !== o && alert(`Mod SDK warning: Loading different but compatible versions ('1.2.0' vs '${window.bcModSdk.version}')
One of mods you are using is using an old version of SDK. It will work for now but please inform author to update`), window.bcModSdk);
        return "undefined" != typeof exports && (Object.defineProperty(exports, "__esModule", { value: true }), exports.default = y), y;
      })();
    }
  });

  // src/bc/adapter.ts
  var import_bondage_club_mod_sdk = __toESM(require_bcmodsdk(), 1);

  // src/core/logger.ts
  var Logger = class {
    constructor(scope, minimumLevel = "info") {
      this.scope = scope;
      this.minimumLevel = minimumLevel;
    }
    scope;
    minimumLevel;
    debug(message, ...details) {
      this.#write("debug", message, details);
    }
    info(message, ...details) {
      this.#write("info", message, details);
    }
    warn(message, ...details) {
      this.#write("warn", message, details);
    }
    error(message, ...details) {
      this.#write("error", message, details);
    }
    #write(level, message, details) {
      const levels = ["debug", "info", "warn", "error"];
      if (levels.indexOf(level) < levels.indexOf(this.minimumLevel)) return;
      const method = level === "debug" ? "debug" : level;
      console[method](`[KikiLink:${this.scope}] ${message}`, ...details);
    }
  };

  // src/bc/adapter.ts
  var READY_POLL_MS = 400;
  var SOCKET_REBIND_MS = 2e3;
  var BEEP_LOG_POLL_MS = 1e3;
  var RECENT_INCOMING_TTL_MS = 1e4;
  var KIKILINK_BEEP_TYPE = "KikiLink";
  var KIKILINK_PROTOCOL_PREFIX = "KIKILINK/1 ";
  var MAX_PROTOCOL_PAYLOAD = 700;
  var BCAdapter = class {
    constructor(bus, version) {
      this.bus = bus;
      this.version = version;
    }
    bus;
    version;
    #logger = new Logger("bc");
    #unhooks = [];
    #nicknameCache = /* @__PURE__ */ new Map();
    #onlineFriends = /* @__PURE__ */ new Map();
    #recentIncoming = [];
    #modApi;
    #socket;
    #socketRebindTimer;
    #beepLogTimer;
    #beepLogCursor = 0;
    #seenIncomingPayloads = /* @__PURE__ */ new WeakSet();
    #stopped = false;
    #ready = false;
    #sendingViaKikiLink = false;
    #hasOnlineFriendSnapshot = false;
    #onlineFriendSignature;
    #socketBeepListener = (data) => {
      this.#captureIncomingPayload(data);
    };
    #socketQueryListener = (data) => {
      this.#captureOnlineFriends(data);
    };
    async start() {
      this.#stopped = false;
      this.bus.emit("bc:status", { state: "connecting" });
      await this.#waitUntilReady();
      if (this.#stopped) return;
      this.#initializeBeepLogCursor();
      this.#attachSocketListeners();
      this.#installCompatibilityHooks();
      this.#socketRebindTimer = setInterval(
        () => this.#attachSocketListeners(),
        SOCKET_REBIND_MS
      );
      this.#beepLogTimer = setInterval(() => this.#captureNewBeepLogEntries(), BEEP_LOG_POLL_MS);
      this.#ready = true;
      this.bus.emit("bc:status", { state: "ready" });
      this.bus.emit("bc:ready", { memberNumber: Player.MemberNumber });
      this.#logger.info(`Connected as ${Player.Name} [${Player.MemberNumber}]`);
    }
    stop() {
      this.#stopped = true;
      this.#ready = false;
      this.#onlineFriends.clear();
      this.#recentIncoming.splice(0);
      this.#seenIncomingPayloads = /* @__PURE__ */ new WeakSet();
      this.#hasOnlineFriendSnapshot = false;
      this.#onlineFriendSignature = void 0;
      if (this.#socketRebindTimer !== void 0) clearInterval(this.#socketRebindTimer);
      if (this.#beepLogTimer !== void 0) clearInterval(this.#beepLogTimer);
      this.#socketRebindTimer = void 0;
      this.#beepLogTimer = void 0;
      this.#detachSocketListeners();
      for (const unhook of this.#unhooks.splice(0).reverse()) unhook();
      this.#modApi?.unload();
      this.#modApi = void 0;
    }
    isReady() {
      return this.#ready;
    }
    canSendBeep() {
      return typeof ServerSendBeepMessage === "function";
    }
    canUseKikiLinkProtocol() {
      return typeof ServerSend === "function";
    }
    refreshOnlineFriends() {
      if (typeof ServerSend !== "function" || !this.#ready) return false;
      ServerSend("AccountQuery", { Query: "OnlineFriends" });
      return true;
    }
    getOnlineFriends() {
      return [...this.#onlineFriends.values()].map((friend) => ({ ...friend }));
    }
    hasOnlineFriendSnapshot() {
      return this.#hasOnlineFriendSnapshot;
    }
    isKnownFriend(memberNumber) {
      if (typeof Player !== "object" || Player === null) return false;
      return Player.FriendNames instanceof Map && Player.FriendNames.has(memberNumber) || Array.isArray(Player.FriendList) && Player.FriendList.includes(memberNumber);
    }
    isMemberInCurrentRoom(memberNumber) {
      return this.isInChatRoom() && this.#findRoomCharacter(memberNumber) !== void 0;
    }
    sendKikiLinkProtocol(target, payload) {
      if (!Number.isSafeInteger(target) || target < 0) {
        throw new Error("A valid non-negative member number is required");
      }
      const wire = protocolWire(payload);
      if (typeof ServerSend !== "function") {
        throw new Error("The KikiLink compatibility channel is still loading");
      }
      if (this.isInChatRoom() && this.#findRoomCharacter(target)) {
        ServerSend("ChatRoomChat", {
          Type: "Hidden",
          Content: wire,
          Target: target
        });
        return "room";
      }
      ServerSend("AccountBeep", {
        MemberNumber: target,
        BeepType: KIKILINK_BEEP_TYPE,
        Message: wire,
        IsSecret: true
      });
      return "beep";
    }
    broadcastKikiLinkProtocol(payload) {
      if (!this.isInChatRoom() || typeof ServerSend !== "function") return false;
      ServerSend("ChatRoomChat", {
        Type: "Hidden",
        Content: protocolWire(payload)
      });
      return true;
    }
    sendBeep(target, content, includeRoom) {
      if (!Number.isSafeInteger(target) || target < 0) {
        throw new Error("A valid non-negative member number is required");
      }
      const message = content.trim();
      if (!message) throw new Error("A Beep message cannot be empty");
      if (message.length > 1e3) throw new Error("A Beep message cannot exceed 1000 characters");
      if (typeof ServerSendBeepMessage !== "function") {
        throw new Error("KikiLink is still connecting to Bondage Club");
      }
      const event = this.#normalizeOutgoing(target, message, { includeRoom });
      if (!event) throw new Error("Unable to prepare this Beep");
      this.#sendingViaKikiLink = true;
      try {
        ServerSendBeepMessage(target, message, { includeRoom });
      } finally {
        this.#sendingViaKikiLink = false;
      }
      return event;
    }
    getMemberName(memberNumber) {
      const nickname = this.getMemberNickname(memberNumber);
      if (nickname) return nickname;
      if (typeof Player !== "object" || Player === null) return `Member ${memberNumber}`;
      return Player.FriendNames?.get(memberNumber) ?? `Member ${memberNumber}`;
    }
    getMemberNickname(memberNumber) {
      if (typeof Player === "object" && Player !== null && Player.MemberNumber === memberNumber) {
        const ownNickname = cleanName(Player.Nickname);
        if (ownNickname) this.#nicknameCache.set(memberNumber, ownNickname);
        else this.#nicknameCache.delete(memberNumber);
      }
      if (typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter)) {
        const character = ChatRoomCharacter.find((candidate) => candidate.MemberNumber === memberNumber);
        const nickname = cleanName(character?.Nickname);
        if (nickname) this.#nicknameCache.set(memberNumber, nickname);
        else if (character) this.#nicknameCache.delete(memberNumber);
      }
      return this.#nicknameCache.get(memberNumber);
    }
    getOwnMemberNumber() {
      if (typeof Player !== "object" || Player === null) return -1;
      return Number.isSafeInteger(Player.MemberNumber) ? Player.MemberNumber : -1;
    }
    getOwnName() {
      if (typeof Player !== "object" || Player === null) return "me";
      return cleanName(Player.Nickname) ?? cleanName(Player.Name) ?? "me";
    }
    isInChatRoom() {
      if (typeof ServerPlayerIsInChatRoom === "function") {
        return ServerPlayerIsInChatRoom();
      }
      return typeof CurrentScreen === "string" && CurrentScreen === "ChatRoom" && typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter);
    }
    canSendRoomEmote() {
      return this.isInChatRoom() && typeof ChatRoomSendEmote === "function";
    }
    getRoomCharacters() {
      if (!this.isInChatRoom()) return [];
      const ownMemberNumber = this.getOwnMemberNumber();
      return ChatRoomCharacter.filter(
        (character) => Number.isSafeInteger(character.MemberNumber) && character.MemberNumber !== ownMemberNumber
      ).map((character) => {
        const accountName = cleanName(character.Name);
        return {
          memberNumber: character.MemberNumber,
          memberName: this.getMemberNickname(character.MemberNumber) ?? accountName ?? `Member ${character.MemberNumber}`,
          ...accountName !== void 0 ? { accountName } : {},
          isFriend: this.isKnownFriend(character.MemberNumber)
        };
      }).sort((left, right) => left.memberName.localeCompare(right.memberName));
    }
    sendRoomEmote(content) {
      const message = content.trim();
      if (!message) throw new Error("An activity cannot be empty");
      if (message.length > 1e3) {
        throw new Error("An activity cannot exceed 1000 characters after variables are expanded");
      }
      if (!this.isInChatRoom()) throw new Error("Open a Bondage Club chat room first");
      if (typeof ChatRoomSendEmote !== "function") {
        throw new Error("The Bondage Club room chat is still loading");
      }
      ChatRoomSendEmote(message);
    }
    getCurrentRoomName() {
      if (!this.isInChatRoom()) return void 0;
      if (typeof ChatRoomData === "undefined" || ChatRoomData === null) return void 0;
      return cleanName(ChatRoomData.Name);
    }
    startWhisper(memberNumber) {
      if (!this.isInChatRoom()) throw new Error("Open a Bondage Club chat room first");
      if (!this.#findRoomCharacter(memberNumber)) {
        throw new Error("This player is no longer in the room");
      }
      if (typeof ChatRoomSetTarget !== "function") {
        throw new Error("The native Whisper control is still loading");
      }
      ChatRoomSetTarget(memberNumber);
      const input = document.getElementById("InputChat");
      if (input instanceof HTMLElement) input.focus();
    }
    openProfile(memberNumber) {
      if (!this.isInChatRoom()) throw new Error("Profiles can be opened from a chat room");
      const character = this.#findRoomCharacter(memberNumber);
      if (!character) throw new Error("This player is no longer in the room");
      if (typeof InformationSheetLoadCharacter !== "function") {
        throw new Error("The native profile screen is still loading");
      }
      InformationSheetLoadCharacter(character);
    }
    #findRoomCharacter(memberNumber) {
      if (typeof ChatRoomCharacter === "undefined" || !Array.isArray(ChatRoomCharacter)) {
        return void 0;
      }
      return ChatRoomCharacter.find((character) => character.MemberNumber === memberNumber);
    }
    getKnownContacts() {
      const contacts = /* @__PURE__ */ new Map();
      if (typeof Player === "object" && Player !== null && Player.FriendNames instanceof Map) {
        for (const [memberNumber, memberName] of Player.FriendNames) {
          if (Number.isSafeInteger(memberNumber) && cleanName(memberName)) {
            contacts.set(memberNumber, this.getMemberNickname(memberNumber) ?? memberName.trim());
          }
        }
      }
      if (typeof Player === "object" && Player !== null && Array.isArray(Player.FriendList)) {
        for (const memberNumber of Player.FriendList) {
          if (!Number.isSafeInteger(memberNumber)) continue;
          contacts.set(memberNumber, this.getMemberName(memberNumber));
        }
      }
      if (typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter)) {
        for (const character of ChatRoomCharacter) {
          if (!Number.isSafeInteger(character.MemberNumber) || character.MemberNumber === this.getOwnMemberNumber()) {
            continue;
          }
          contacts.set(
            character.MemberNumber,
            this.getMemberNickname(character.MemberNumber) ?? cleanName(character.Name) ?? `Member ${character.MemberNumber}`
          );
        }
      }
      for (const friend of this.#onlineFriends.values()) {
        contacts.set(
          friend.memberNumber,
          this.getMemberNickname(friend.memberNumber) ?? friend.memberName
        );
      }
      return [...contacts.entries()].map(([memberNumber, memberName]) => ({ memberNumber, memberName })).sort((left, right) => left.memberName.localeCompare(right.memberName));
    }
    getRecentBeeps(limit = 100) {
      if (typeof FriendListBeepLog === "undefined" || !Array.isArray(FriendListBeepLog)) return [];
      return FriendListBeepLog.slice(-Math.max(0, limit)).map((entry) => this.#normalizeBeepLogEntry(entry)).filter((event) => event !== null).sort((left, right) => left.sentAt - right.sentAt);
    }
    #installCompatibilityHooks() {
      try {
        this.#modApi = import_bondage_club_mod_sdk.default.registerMod(
          {
            name: "KikiLink",
            fullName: "KikiLink",
            version: this.version
          },
          { allowReplace: true }
        );
      } catch (error) {
        this.#logger.warn("ModSDK hooks unavailable; using direct Bondage Club events", error);
        return;
      }
      const modApi = this.#modApi;
      this.#tryInstallHook(
        "ServerAccountBeep",
        () => modApi.hookFunction("ServerAccountBeep", 0, (args, next) => {
          this.#captureIncomingPayload(args[0]);
          return next(args);
        })
      );
      if (typeof ServerAccountQueryResult === "function") {
        this.#tryInstallHook(
          "ServerAccountQueryResult",
          () => modApi.hookFunction("ServerAccountQueryResult", 0, (args, next) => {
            this.#captureOnlineFriends(args[0]);
            return next(args);
          })
        );
      }
      if (typeof FriendListLoadFriendList === "function") {
        this.#tryInstallHook(
          "FriendListLoadFriendList",
          () => modApi.hookFunction("FriendListLoadFriendList", 0, (args, next) => {
            this.#captureOnlineFriends(args[0]);
            return next(args);
          })
        );
      }
      if (typeof ChatRoomMessage === "function") {
        this.#tryInstallHook(
          "ChatRoomMessage",
          () => modApi.hookFunction("ChatRoomMessage", 0, (args, next) => {
            const protocol = this.#normalizeRoomProtocol(args[0]);
            if (protocol) this.bus.emit("bc:protocol", protocol);
            return next(args);
          })
        );
      }
      this.#tryInstallHook(
        "ServerSendBeepMessage",
        () => modApi.hookFunction("ServerSendBeepMessage", 0, (args, next) => {
          const result = next(args);
          if (this.#sendingViaKikiLink) return result;
          const [target, message, options] = args;
          const event = this.#normalizeOutgoing(target, message, options);
          if (event) this.bus.emit("beep:sent", event);
          return result;
        })
      );
    }
    #tryInstallHook(name, install) {
      try {
        this.#unhooks.push(install());
      } catch (error) {
        this.#logger.warn(`${name} hook unavailable; keeping native fallback`, error);
      }
    }
    #attachSocketListeners() {
      const socket = typeof ServerSocket === "object" && ServerSocket !== null ? ServerSocket : void 0;
      if (socket === this.#socket) return;
      this.#detachSocketListeners();
      if (!socket || typeof socket.on !== "function") return;
      this.#socket = socket;
      try {
        socket.on("AccountBeep", this.#socketBeepListener);
        socket.on("AccountQueryResult", this.#socketQueryListener);
        if (this.#ready) this.refreshOnlineFriends();
      } catch (error) {
        this.#detachSocketListeners();
        this.#logger.warn("Direct Bondage Club socket listeners unavailable", error);
      }
    }
    #detachSocketListeners() {
      const socket = this.#socket;
      this.#socket = void 0;
      if (!socket) return;
      if (typeof socket.off === "function") {
        socket.off("AccountBeep", this.#socketBeepListener);
        socket.off("AccountQueryResult", this.#socketQueryListener);
        return;
      }
      socket.removeListener?.("AccountBeep", this.#socketBeepListener);
      socket.removeListener?.("AccountQueryResult", this.#socketQueryListener);
    }
    #captureIncomingPayload(data) {
      if (!data || typeof data !== "object" || Array.isArray(data)) return;
      if (this.#seenIncomingPayloads.has(data)) return;
      this.#seenIncomingPayloads.add(data);
      const protocol = this.#normalizeBeepProtocol(data);
      if (protocol) this.bus.emit("bc:protocol", protocol);
      const event = this.#normalizeIncoming(data);
      if (!event) return;
      this.#rememberIncoming(event);
      this.bus.emit("beep:received", event);
    }
    #initializeBeepLogCursor() {
      this.#beepLogCursor = typeof FriendListBeepLog !== "undefined" && Array.isArray(FriendListBeepLog) ? FriendListBeepLog.length : 0;
    }
    #captureNewBeepLogEntries() {
      if (typeof FriendListBeepLog === "undefined" || !Array.isArray(FriendListBeepLog)) return;
      if (FriendListBeepLog.length < this.#beepLogCursor) this.#beepLogCursor = 0;
      const entries = FriendListBeepLog.slice(this.#beepLogCursor);
      this.#beepLogCursor = FriendListBeepLog.length;
      for (const entry of entries) {
        if (entry.Sent) continue;
        const event = this.#normalizeBeepLogEntry(entry);
        if (!event || this.#consumeRememberedIncoming(event)) continue;
        this.bus.emit("beep:received", event);
      }
      this.#pruneRememberedIncoming();
    }
    #normalizeBeepLogEntry(entry) {
      if (!entry || !Number.isSafeInteger(entry.MemberNumber)) return null;
      const timestamp = new Date(entry.Time).getTime();
      const sentAt = Number.isFinite(timestamp) ? timestamp : Date.now();
      const roomName = cleanName(entry.ChatRoomName);
      return {
        direction: entry.Sent ? "outgoing" : "incoming",
        peerNumber: entry.MemberNumber,
        peerName: this.getMemberNickname(entry.MemberNumber) ?? cleanName(entry.MemberName) ?? `Member ${entry.MemberNumber}`,
        content: typeof entry.Message === "string" ? entry.Message.slice(0, 1e3) : "",
        sentAt,
        includeRoom: roomName !== void 0,
        ...roomName !== void 0 ? { roomName } : {}
      };
    }
    #rememberIncoming(event) {
      this.#recentIncoming.push({
        fingerprint: incomingFingerprint(event),
        capturedAt: event.sentAt
      });
      this.#pruneRememberedIncoming();
    }
    #consumeRememberedIncoming(event) {
      const fingerprint = incomingFingerprint(event);
      const index = this.#recentIncoming.findIndex(
        (candidate) => candidate.fingerprint === fingerprint && Math.abs(candidate.capturedAt - event.sentAt) <= RECENT_INCOMING_TTL_MS
      );
      if (index < 0) return false;
      this.#recentIncoming.splice(index, 1);
      return true;
    }
    #pruneRememberedIncoming(now = Date.now()) {
      while (this.#recentIncoming.length > 0) {
        const first = this.#recentIncoming[0];
        if (!first || now - first.capturedAt <= RECENT_INCOMING_TTL_MS) break;
        this.#recentIncoming.shift();
      }
    }
    #normalizeIncoming(data) {
      if (!data || data.BeepType != null && data.BeepType !== "") return null;
      if (!Number.isSafeInteger(data.MemberNumber) || typeof data.MemberName !== "string") return null;
      const roomName = typeof data.ChatRoomName === "string" ? data.ChatRoomName : void 0;
      return {
        direction: "incoming",
        peerNumber: data.MemberNumber,
        peerName: this.getMemberNickname(data.MemberNumber) ?? data.MemberName,
        content: typeof data.Message === "string" ? data.Message.slice(0, 1e3) : "",
        sentAt: Date.now(),
        includeRoom: roomName !== void 0,
        ...roomName !== void 0 ? { roomName } : {}
      };
    }
    #normalizeBeepProtocol(data) {
      if (!data || data.BeepType !== KIKILINK_BEEP_TYPE || !Number.isSafeInteger(data.MemberNumber) || typeof data.Message !== "string" || !data.Message.startsWith(KIKILINK_PROTOCOL_PREFIX)) {
        return null;
      }
      const payload = data.Message.slice(KIKILINK_PROTOCOL_PREFIX.length);
      if (!payload || payload.length > MAX_PROTOCOL_PAYLOAD) return null;
      return { senderNumber: data.MemberNumber, payload, channel: "beep" };
    }
    #normalizeRoomProtocol(data) {
      if (!data || data.Type !== "Hidden" || typeof data.Sender !== "number" || !Number.isSafeInteger(data.Sender) || data.Sender === this.getOwnMemberNumber() || typeof data.Content !== "string" || !data.Content.startsWith(KIKILINK_PROTOCOL_PREFIX)) {
        return null;
      }
      const payload = data.Content.slice(KIKILINK_PROTOCOL_PREFIX.length);
      if (!payload || payload.length > MAX_PROTOCOL_PAYLOAD) return null;
      return { senderNumber: data.Sender, payload, channel: "room" };
    }
    #captureOnlineFriends(data) {
      const result = Array.isArray(data) ? data : data && data.Query === "OnlineFriends" && Array.isArray(data.Result) ? data.Result : void 0;
      if (!result) return;
      const friends = result.map((entry) => {
        if (!entry || typeof entry !== "object" || !("MemberNumber" in entry) || !Number.isSafeInteger(entry.MemberNumber) || !("MemberName" in entry) || typeof entry.MemberName !== "string") {
          return null;
        }
        const nickname = "MemberNickname" in entry ? cleanName(entry.MemberNickname) : void 0;
        if (nickname) this.#nicknameCache.set(entry.MemberNumber, nickname);
        const roomName = "ChatRoomName" in entry ? cleanName(entry.ChatRoomName) : void 0;
        const roomSpace = "ChatRoomSpace" in entry ? cleanName(entry.ChatRoomSpace) : void 0;
        return {
          memberNumber: entry.MemberNumber,
          memberName: nickname ?? (entry.MemberName.trim() || `Member ${entry.MemberNumber}`),
          privateRoom: "Private" in entry && entry.Private === true,
          ...roomName ? { roomName } : {},
          ...roomSpace ? { roomSpace } : {}
        };
      }).filter((entry) => entry !== null);
      const signature = friends.map(
        (friend) => [
          friend.memberNumber,
          friend.memberName,
          friend.roomName ?? "",
          friend.roomSpace ?? "",
          friend.privateRoom ? 1 : 0
        ].join("")
      ).sort().join("");
      this.#onlineFriends.clear();
      for (const friend of friends) this.#onlineFriends.set(friend.memberNumber, friend);
      this.#hasOnlineFriendSnapshot = true;
      if (signature === this.#onlineFriendSignature) return;
      this.#onlineFriendSignature = signature;
      this.bus.emit("bc:online-friends", { friends: this.getOnlineFriends(), receivedAt: Date.now() });
    }
    #normalizeOutgoing(target, message, options) {
      if (!Number.isSafeInteger(target) || target < 0) return null;
      const includeRoom = options?.includeRoom === true;
      const roomName = includeRoom && typeof ChatRoomData?.Name === "string" ? ChatRoomData.Name : void 0;
      return {
        direction: "outgoing",
        peerNumber: target,
        peerName: this.getMemberName(target),
        content: message ?? "",
        sentAt: Date.now(),
        includeRoom,
        ...roomName !== void 0 ? { roomName } : {}
      };
    }
    async #waitUntilReady() {
      while (!this.#stopped && !isBondageClubReady()) {
        await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS));
      }
    }
  };
  function protocolWire(payload) {
    const value = payload.trim();
    if (!value || value.length > MAX_PROTOCOL_PAYLOAD) {
      throw new Error(`KikiLink protocol payload must be 1-${MAX_PROTOCOL_PAYLOAD} characters`);
    }
    return `${KIKILINK_PROTOCOL_PREFIX}${value}`;
  }
  function cleanName(value) {
    if (typeof value !== "string") return void 0;
    const name = value.trim();
    return name || void 0;
  }
  function incomingFingerprint(event) {
    return [event.peerNumber, event.content, event.roomName ?? ""].join("");
  }
  function isBondageClubReady() {
    return typeof document !== "undefined" && document.body !== null && typeof Player === "object" && Player !== null && Number.isSafeInteger(Player.MemberNumber) && Player.MemberNumber > 0 && typeof ServerSendBeepMessage === "function";
  }

  // src/storage/memory-chat-repository.ts
  var MemoryChatRepository = class {
    #messages = /* @__PURE__ */ new Map();
    #conversations = /* @__PURE__ */ new Map();
    async addMessage(message) {
      this.#messages.set(message.id, structuredClone(message));
    }
    async getMessages(peerNumber, limit = 200) {
      return [...this.#messages.values()].filter((message) => message.peerNumber === peerNumber).sort((left, right) => left.sentAt - right.sentAt).slice(-limit).map((message) => structuredClone(message));
    }
    async getConversation(peerNumber) {
      const conversation = this.#conversations.get(peerNumber);
      return conversation ? structuredClone(conversation) : void 0;
    }
    async listConversations() {
      return [...this.#conversations.values()].sort(sortConversations).map((conversation) => structuredClone(conversation));
    }
    async putConversation(conversation) {
      this.#conversations.set(conversation.peerNumber, structuredClone(conversation));
    }
    async deleteConversation(peerNumber) {
      this.#conversations.delete(peerNumber);
      for (const [id, message] of this.#messages) {
        if (message.peerNumber === peerNumber) this.#messages.delete(id);
      }
    }
    async deleteMessagesOlderThan(timestamp) {
      let removed = 0;
      for (const [id, message] of this.#messages) {
        if (message.sentAt >= timestamp) continue;
        this.#messages.delete(id);
        removed += 1;
      }
      return removed;
    }
    async trimConversation(peerNumber, keepNewest) {
      const messages = [...this.#messages.values()].filter((message) => message.peerNumber === peerNumber).sort((left, right) => right.sentAt - left.sentAt);
      let removed = 0;
      for (const message of messages.slice(keepNewest)) {
        this.#messages.delete(message.id);
        removed += 1;
      }
      return removed;
    }
    async clearAll() {
      this.#messages.clear();
      this.#conversations.clear();
    }
    close() {
    }
  };
  function sortConversations(left, right) {
    if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
    return right.lastMessageAt - left.lastMessageAt;
  }

  // src/utils/id.ts
  var fallbackCounter = 0;
  function createId(prefix = "kl") {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}_${crypto.randomUUID()}`;
    }
    fallbackCounter += 1;
    return `${prefix}_${Date.now().toString(36)}_${fallbackCounter.toString(36)}`;
  }

  // src/modules/link-chat/chat-service.ts
  var DAY_MS = 24 * 60 * 60 * 1e3;
  var ChatService = class {
    constructor(repository, settings) {
      this.repository = repository;
      this.settings = settings;
    }
    repository;
    settings;
    #ephemeralMessages = /* @__PURE__ */ new Map();
    #ephemeralConversations = /* @__PURE__ */ new Map();
    async capture(event, activeConversation) {
      const message = {
        ...event,
        id: createId("beep"),
        read: event.direction === "outgoing" || activeConversation
      };
      const previous = await this.#getStoredConversation(event.peerNumber);
      const conversation = {
        peerNumber: event.peerNumber,
        peerName: preferredPeerName(previous?.peerName, event.peerName, event.peerNumber),
        ...previous?.localAlias ? { localAlias: previous.localAlias } : {},
        lastMessage: event.content,
        lastMessageAt: event.sentAt,
        lastDirection: event.direction,
        unread: event.direction === "incoming" && !activeConversation ? (previous?.unread ?? 0) + 1 : 0,
        pinned: previous?.pinned ?? false,
        draft: previous?.draft ?? ""
      };
      const config = this.settings.get().linkChat;
      if (config.saveHistory) {
        await this.repository.addMessage(message);
        await this.repository.putConversation(conversation);
        await this.repository.trimConversation(event.peerNumber, config.maxMessagesPerConversation);
      } else {
        const messages = this.#ephemeralMessages.get(event.peerNumber) ?? [];
        messages.push(message);
        this.#ephemeralMessages.set(
          event.peerNumber,
          messages.slice(-config.maxMessagesPerConversation)
        );
        this.#ephemeralConversations.set(event.peerNumber, conversation);
      }
      return message;
    }
    async captureRecent(event) {
      const stored = await this.#getStoredConversation(event.peerNumber);
      if (stored?.hiddenAt !== void 0 && event.sentAt <= stored.hiddenAt) return false;
      const messages = await this.getMessages(event.peerNumber, 500);
      const duplicate = messages.some(
        (message) => message.direction === event.direction && message.content === event.content && message.roomName === event.roomName && Math.abs(message.sentAt - event.sentAt) <= 2e3
      );
      if (duplicate) return false;
      await this.capture(event, true);
      return true;
    }
    async ensureConversation(peerNumber, peerName) {
      const existing = await this.#getStoredConversation(peerNumber);
      if (existing && existing.hiddenAt === void 0) return existing;
      const conversation = {
        peerNumber,
        peerName,
        lastMessage: "",
        lastMessageAt: 0,
        lastDirection: "incoming",
        unread: 0,
        pinned: false,
        draft: ""
      };
      await this.#saveConversation(conversation);
      return conversation;
    }
    async getConversation(peerNumber) {
      const conversation = await this.#getStoredConversation(peerNumber);
      return conversation?.hiddenAt === void 0 ? conversation : void 0;
    }
    async #getStoredConversation(peerNumber) {
      const ephemeral = this.#ephemeralConversations.get(peerNumber);
      return ephemeral ? structuredClone(ephemeral) : this.repository.getConversation(peerNumber);
    }
    async listConversations() {
      const persisted = await this.repository.listConversations();
      const merged = new Map(persisted.map((conversation) => [conversation.peerNumber, conversation]));
      for (const conversation of this.#ephemeralConversations.values()) {
        merged.set(conversation.peerNumber, structuredClone(conversation));
      }
      return [...merged.values()].filter((conversation) => conversation.hiddenAt === void 0).sort(sortConversations);
    }
    async getMessages(peerNumber, limit = 300) {
      const persisted = await this.repository.getMessages(peerNumber, limit);
      const ephemeral = this.#ephemeralMessages.get(peerNumber) ?? [];
      return [...persisted, ...ephemeral].sort((left, right) => left.sentAt - right.sentAt).slice(-limit);
    }
    async markRead(peerNumber) {
      const conversation = await this.getConversation(peerNumber);
      if (!conversation || conversation.unread === 0) return;
      await this.#saveConversation({ ...conversation, unread: 0 });
    }
    async markUnread(peerNumber) {
      const conversation = await this.getConversation(peerNumber);
      if (!conversation || conversation.unread > 0) return;
      await this.#saveConversation({ ...conversation, unread: 1 });
    }
    async setPeerName(peerNumber, peerName) {
      const name = peerName.trim();
      if (!name) return;
      const conversation = await this.getConversation(peerNumber);
      if (!conversation || conversation.peerName === name) return;
      await this.#saveConversation({ ...conversation, peerName: name });
    }
    async setLocalAlias(peerNumber, value) {
      const conversation = await this.getConversation(peerNumber);
      if (!conversation) return void 0;
      const localAlias = normalizeLocalAlias(value);
      if (conversation.localAlias === localAlias) return localAlias;
      const updated = { ...conversation };
      if (localAlias) updated.localAlias = localAlias;
      else delete updated.localAlias;
      await this.#saveConversation(updated);
      return localAlias;
    }
    async removeConversation(peerNumber) {
      const previous = await this.#getStoredConversation(peerNumber);
      this.#ephemeralMessages.delete(peerNumber);
      this.#ephemeralConversations.delete(peerNumber);
      await this.repository.deleteConversation(peerNumber);
      if (!previous) return;
      await this.#saveConversation({
        peerNumber,
        peerName: previous.peerName,
        hiddenAt: Date.now(),
        lastMessage: "",
        lastMessageAt: 0,
        lastDirection: "incoming",
        unread: 0,
        pinned: false,
        draft: ""
      });
    }
    async setDraft(peerNumber, peerName, draft) {
      const conversation = await this.getConversation(peerNumber) ?? await this.ensureConversation(peerNumber, peerName);
      await this.#saveConversation({ ...conversation, draft });
    }
    async togglePinned(peerNumber) {
      const conversation = await this.getConversation(peerNumber);
      if (!conversation) return false;
      const pinned = !conversation.pinned;
      await this.#saveConversation({ ...conversation, pinned });
      return pinned;
    }
    async totalUnread() {
      const conversations = await this.listConversations();
      return conversations.reduce((total, conversation) => total + conversation.unread, 0);
    }
    async prune() {
      const config = this.settings.get().linkChat;
      if (!config.saveHistory) return 0;
      return this.repository.deleteMessagesOlderThan(Date.now() - config.retentionDays * DAY_MS);
    }
    async clearHistory() {
      await this.repository.clearAll();
      this.#ephemeralMessages.clear();
      this.#ephemeralConversations.clear();
    }
    async #saveConversation(conversation) {
      if (this.settings.get().linkChat.saveHistory) {
        await this.repository.putConversation(conversation);
        this.#ephemeralConversations.delete(conversation.peerNumber);
      } else {
        this.#ephemeralConversations.set(conversation.peerNumber, structuredClone(conversation));
      }
    }
  };
  function conversationDisplayName(conversation) {
    return conversation.localAlias?.trim() || conversation.peerName;
  }
  function preferredPeerName(previousName, eventName, peerNumber) {
    const fallback = `Member ${peerNumber}`;
    const previous = previousName?.trim();
    const incoming = eventName.trim();
    if (previous && previous !== fallback) return previous;
    return incoming || previous || fallback;
  }
  function normalizeLocalAlias(value) {
    const alias = value.replace(/[\u0000-\u001f\u007f]/gu, "").replace(/\s+/gu, " ").trim().slice(0, 40);
    return alias || void 0;
  }

  // src/modules/link-activities/activity-library.ts
  var MAX_ROOM_ACTIVITIES = 100;
  var ACTIVITY_LIBRARY_FORMAT = "kikilink-activity-library";
  var ACTIVITY_LIBRARY_VERSION = 1;
  var ACTIVITY_PACK_PRESETS = [
    {
      id: "kikilink-starter",
      name: "KikiLink Starter",
      description: "The five original KikiLink room activities.",
      activities: [
        roomActivity(
          "Sakura bow",
          "bows gracefully to {target}, as if sakura petals drifted between them.",
          "Greetings",
          "KikiLink Starter",
          true
        ),
        roomActivity(
          "Wolf greeting",
          "greets {target} with a warm, playful wolfish grin.",
          "Greetings",
          "KikiLink Starter",
          true
        ),
        roomActivity(
          "Inspect knots",
          "circles {target}, carefully inspecting every knot.",
          "Scene",
          "KikiLink Starter"
        ),
        roomActivity(
          "Offer hand",
          "offers {target} a hand with an inviting smile.",
          "Care",
          "KikiLink Starter"
        ),
        roomActivity(
          "Moonlit promise",
          "touches two fingers to their heart, then gestures solemnly toward {target}.",
          "Roleplay",
          "KikiLink Starter"
        )
      ]
    },
    {
      id: "social-gestures",
      name: "Social Gestures",
      description: "Warm greetings and small social flourishes for a busy room.",
      activities: [
        roomActivity("Friendly wave", "waves warmly to {target}.", "Greetings", "Social Gestures"),
        roomActivity(
          "Playful wink",
          "gives {target} a quick, playful wink.",
          "Greetings",
          "Social Gestures"
        ),
        roomActivity(
          "Formal curtsey",
          "offers {target} a graceful, carefully measured curtsey.",
          "Greetings",
          "Social Gestures"
        ),
        roomActivity(
          "Welcome smile",
          "welcomes {target} with a bright, reassuring smile.",
          "Care",
          "Social Gestures"
        ),
        roomActivity(
          "Quiet toast",
          "raises an imaginary glass toward {target} in a quiet toast.",
          "Roleplay",
          "Social Gestures"
        )
      ]
    },
    {
      id: "scene-flourishes",
      name: "Scene Flourishes",
      description: "Reusable movements for adding atmosphere without changing game state.",
      activities: [
        roomActivity(
          "Check comfort",
          "pauses beside {target}, carefully checking that everything still looks comfortable.",
          "Care",
          "Scene Flourishes"
        ),
        roomActivity(
          "Stand guard",
          "takes position beside {target}, watching the room attentively.",
          "Scene",
          "Scene Flourishes"
        ),
        roomActivity(
          "Slow circle",
          "walks a slow circle around {target}, studying their expression.",
          "Scene",
          "Scene Flourishes"
        ),
        roomActivity(
          "Measured nod",
          "meets {target}'s gaze and gives a slow, deliberate nod.",
          "Roleplay",
          "Scene Flourishes"
        ),
        roomActivity(
          "Quiet reassurance",
          "leans closer to {target} and offers a few quiet words of reassurance.",
          "Care",
          "Scene Flourishes"
        )
      ]
    }
  ];
  function sanitizeRoomActivities(value) {
    if (!Array.isArray(value)) return [];
    const activities = [];
    for (const entry of value.slice(0, MAX_ROOM_ACTIVITIES)) {
      const activity = sanitizeRoomActivity(entry);
      if (activity) activities.push(activity);
    }
    return activities;
  }
  function migrateLegacyRoomActivities(value) {
    const starterActivities = ACTIVITY_PACK_PRESETS[0]?.activities ?? [];
    return sanitizeRoomActivities(value).map((activity) => {
      const starter = starterActivities.find(
        (candidate) => activityFingerprint(candidate) === activityFingerprint(activity)
      );
      return starter ? {
        ...activity,
        category: starter.category,
        pack: starter.pack,
        favorite: activity.favorite || starter.favorite
      } : activity;
    });
  }
  function exportActivityLibrary(activities, exportedAt = Date.now()) {
    return {
      format: ACTIVITY_LIBRARY_FORMAT,
      version: ACTIVITY_LIBRARY_VERSION,
      exportedAt,
      activities: sanitizeRoomActivities(activities)
    };
  }
  function importActivityLibrary(value, existing) {
    const parsed = parseActivityLibrary(value);
    return mergeActivities(existing, parsed.activities);
  }
  function installActivityPack(existing, packId) {
    const pack = ACTIVITY_PACK_PRESETS.find((candidate) => candidate.id === packId);
    if (!pack) throw new Error("That KikiLink activity pack is not available.");
    return mergeActivities(existing, pack.activities);
  }
  function mergeActivities(existing, candidates) {
    const activities = sanitizeRoomActivities(existing);
    const fingerprints = new Map(
      activities.map((activity, index) => [activityFingerprint(activity), index])
    );
    let imported = 0;
    let duplicates = 0;
    let skipped = Math.max(0, candidates.length - MAX_ROOM_ACTIVITIES);
    for (const candidate of candidates.slice(0, MAX_ROOM_ACTIVITIES)) {
      const activity = sanitizeRoomActivity(candidate);
      if (!activity) {
        skipped += 1;
        continue;
      }
      const fingerprint = activityFingerprint(activity);
      const existingIndex = fingerprints.get(fingerprint);
      if (existingIndex !== void 0) {
        const current = activities[existingIndex];
        if (current) current.favorite ||= activity.favorite;
        duplicates += 1;
        continue;
      }
      if (activities.length >= MAX_ROOM_ACTIVITIES) {
        skipped += 1;
        continue;
      }
      fingerprints.set(fingerprint, activities.length);
      activities.push(activity);
      imported += 1;
    }
    return { activities, imported, duplicates, skipped };
  }
  function parseActivityLibrary(value) {
    let parsed = value;
    if (typeof value === "string") {
      try {
        parsed = JSON.parse(value);
      } catch {
        throw new Error("This file is not valid JSON.");
      }
    }
    if (!isRecord(parsed) || parsed.format !== ACTIVITY_LIBRARY_FORMAT || parsed.version !== ACTIVITY_LIBRARY_VERSION || !Array.isArray(parsed.activities)) {
      throw new Error("This is not a KikiLink activity library backup.");
    }
    return { activities: parsed.activities };
  }
  function sanitizeRoomActivity(value) {
    if (!isRecord(value)) return void 0;
    const label = cleanText(value.label, 32);
    const template = cleanText(value.template, 500);
    if (!label || !template) return void 0;
    return {
      label,
      template,
      category: cleanText(value.category, 24) || "Uncategorized",
      pack: cleanText(value.pack, 32) || "My Activities",
      favorite: value.favorite === true
    };
  }
  function activityFingerprint(activity) {
    return `${activity.label.trim().toLocaleLowerCase()}\0${activity.template.trim().toLocaleLowerCase()}`;
  }
  function roomActivity(label, template, category, pack, favorite = false) {
    return { label, template, category, pack, favorite };
  }
  function cleanText(value, maxLength) {
    return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, maxLength) : "";
  }
  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  // src/core/settings.ts
  var DEFAULT_SETTINGS = {
    schemaVersion: 9,
    ui: {
      accent: "#d71932",
      theme: "dark",
      density: "comfortable",
      textScale: "normal",
      homeLayout: "showcase",
      launcherSide: "right",
      launcherOpen: "home",
      launcherPosition: null,
      reducedMotion: false,
      settingsSection: "appearance"
    },
    linkChat: {
      enabled: true,
      saveHistory: true,
      includeRoomByDefault: false,
      retentionDays: 90,
      maxMessagesPerConversation: 500,
      openOnIncoming: false,
      enterToSend: true,
      typingIndicators: true,
      imagePreviews: "ask",
      quickActions: [
        { label: "Wave", template: "*waves to {name}*" },
        { label: "Hug", template: "*hugs {name} warmly*" },
        { label: "Boop", template: "*gently boops {name}*" }
      ]
    },
    linkPresence: {
      enabled: true,
      status: "online",
      statusMessage: "",
      autoIdleMinutes: 10
    },
    linkActivities: {
      enabled: false,
      activities: structuredClone(ACTIVITY_PACK_PRESETS[0]?.activities ?? [])
    },
    linkRoster: {
      enabled: true,
      trackEncounters: true,
      retentionDays: 365
    }
  };
  var SETTINGS_KEY = "kikilink:settings:v1";
  var SettingsStore = class {
    #settings;
    #storage;
    constructor(storage) {
      this.#storage = storage ?? getDefaultStorage();
      this.#settings = this.#load();
    }
    get() {
      return structuredClone(this.#settings);
    }
    update(mutator) {
      const draft = this.get();
      mutator(draft);
      this.#settings = sanitizeSettings(draft);
      try {
        this.#storage.setItem(SETTINGS_KEY, JSON.stringify(this.#settings));
      } catch {
      }
      return this.get();
    }
    reset() {
      this.#settings = structuredClone(DEFAULT_SETTINGS);
      try {
        this.#storage.removeItem(SETTINGS_KEY);
      } catch {
      }
      return this.get();
    }
    #load() {
      let raw = null;
      try {
        raw = this.#storage.getItem(SETTINGS_KEY);
      } catch {
        return structuredClone(DEFAULT_SETTINGS);
      }
      if (!raw) return structuredClone(DEFAULT_SETTINGS);
      try {
        return sanitizeSettings(JSON.parse(raw));
      } catch {
        return structuredClone(DEFAULT_SETTINGS);
      }
    }
  };
  var MemoryKeyValueStorage = class {
    #values = /* @__PURE__ */ new Map();
    getItem(key) {
      return this.#values.get(key) ?? null;
    }
    setItem(key, value) {
      this.#values.set(key, value);
    }
    removeItem(key) {
      this.#values.delete(key);
    }
  };
  function sanitizeSettings(input) {
    const source = isRecord2(input) ? input : {};
    const sourceSchema = typeof source.schemaVersion === "number" && Number.isFinite(source.schemaVersion) ? source.schemaVersion : 1;
    const ui = isRecord2(source.ui) ? source.ui : {};
    const linkChat = isRecord2(source.linkChat) ? source.linkChat : {};
    const linkPresence = isRecord2(source.linkPresence) ? source.linkPresence : {};
    const linkActivities = isRecord2(source.linkActivities) ? source.linkActivities : {};
    const linkRoster = isRecord2(source.linkRoster) ? source.linkRoster : {};
    return {
      schemaVersion: 9,
      ui: {
        accent: validColor(ui.accent) ? ui.accent : DEFAULT_SETTINGS.ui.accent,
        theme: ui.theme === "light" || ui.theme === "system" || ui.theme === "dark" ? ui.theme : DEFAULT_SETTINGS.ui.theme,
        density: ui.density === "compact" || ui.density === "super-compact" ? ui.density : DEFAULT_SETTINGS.ui.density,
        textScale: ui.textScale === "large" || ui.textScale === "extra-large" ? ui.textScale : DEFAULT_SETTINGS.ui.textScale,
        homeLayout: ui.homeLayout === "compact" ? "compact" : DEFAULT_SETTINGS.ui.homeLayout,
        launcherSide: ui.launcherSide === "left" ? "left" : "right",
        launcherOpen: ui.launcherOpen === "last" || ui.launcherOpen === "chat" ? ui.launcherOpen : DEFAULT_SETTINGS.ui.launcherOpen,
        launcherPosition: sanitizeLauncherPosition(ui.launcherPosition),
        reducedMotion: booleanOr(ui.reducedMotion, DEFAULT_SETTINGS.ui.reducedMotion),
        settingsSection: isSettingsSection(ui.settingsSection) ? ui.settingsSection : DEFAULT_SETTINGS.ui.settingsSection
      },
      linkChat: {
        enabled: booleanOr(linkChat.enabled, DEFAULT_SETTINGS.linkChat.enabled),
        saveHistory: booleanOr(linkChat.saveHistory, DEFAULT_SETTINGS.linkChat.saveHistory),
        includeRoomByDefault: booleanOr(
          linkChat.includeRoomByDefault,
          DEFAULT_SETTINGS.linkChat.includeRoomByDefault
        ),
        retentionDays: integerInRange(
          linkChat.retentionDays,
          1,
          3650,
          DEFAULT_SETTINGS.linkChat.retentionDays
        ),
        maxMessagesPerConversation: integerInRange(
          linkChat.maxMessagesPerConversation,
          50,
          5e3,
          DEFAULT_SETTINGS.linkChat.maxMessagesPerConversation
        ),
        openOnIncoming: booleanOr(
          linkChat.openOnIncoming,
          DEFAULT_SETTINGS.linkChat.openOnIncoming
        ),
        enterToSend: booleanOr(linkChat.enterToSend, DEFAULT_SETTINGS.linkChat.enterToSend),
        typingIndicators: booleanOr(
          linkChat.typingIndicators,
          DEFAULT_SETTINGS.linkChat.typingIndicators
        ),
        imagePreviews: linkChat.imagePreviews === "always" || linkChat.imagePreviews === "never" ? linkChat.imagePreviews : DEFAULT_SETTINGS.linkChat.imagePreviews,
        quickActions: sanitizeQuickActions(linkChat.quickActions)
      },
      linkPresence: {
        enabled: booleanOr(linkPresence.enabled, DEFAULT_SETTINGS.linkPresence.enabled),
        status: linkPresence.status === "idle" || linkPresence.status === "dnd" || linkPresence.status === "offline" ? linkPresence.status : DEFAULT_SETTINGS.linkPresence.status,
        statusMessage: typeof linkPresence.statusMessage === "string" ? linkPresence.statusMessage.trim().slice(0, 80) : DEFAULT_SETTINGS.linkPresence.statusMessage,
        autoIdleMinutes: integerInRange(
          linkPresence.autoIdleMinutes,
          0,
          120,
          DEFAULT_SETTINGS.linkPresence.autoIdleMinutes
        )
      },
      linkActivities: {
        enabled: sourceSchema === 2 ? false : booleanOr(linkActivities.enabled, DEFAULT_SETTINGS.linkActivities.enabled),
        activities: linkActivities.activities === void 0 ? structuredClone(DEFAULT_SETTINGS.linkActivities.activities) : Array.isArray(linkActivities.activities) ? sourceSchema < 9 ? migrateLegacyRoomActivities(linkActivities.activities) : sanitizeRoomActivities(linkActivities.activities) : structuredClone(DEFAULT_SETTINGS.linkActivities.activities)
      },
      linkRoster: {
        enabled: booleanOr(linkRoster.enabled, DEFAULT_SETTINGS.linkRoster.enabled),
        trackEncounters: booleanOr(
          linkRoster.trackEncounters,
          DEFAULT_SETTINGS.linkRoster.trackEncounters
        ),
        retentionDays: rosterRetentionDaysOr(linkRoster.retentionDays)
      }
    };
  }
  function sanitizeQuickActions(value) {
    if (value === void 0) return structuredClone(DEFAULT_SETTINGS.linkChat.quickActions);
    if (!Array.isArray(value)) return structuredClone(DEFAULT_SETTINGS.linkChat.quickActions);
    const actions = [];
    for (const entry of value.slice(0, 12)) {
      if (!isRecord2(entry)) continue;
      const label = typeof entry.label === "string" ? entry.label.trim().slice(0, 24) : "";
      const template = typeof entry.template === "string" ? entry.template.trim().slice(0, 500) : "";
      if (label && template) actions.push({ label, template });
    }
    return actions;
  }
  function sanitizeLauncherPosition(value) {
    if (!isRecord2(value)) return null;
    if (!finiteNumberInRange(value.x, 0, 1) || !finiteNumberInRange(value.y, 0, 1)) return null;
    return { x: value.x, y: value.y };
  }
  function isRecord2(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function booleanOr(value, fallback) {
    return typeof value === "boolean" ? value : fallback;
  }
  function integerInRange(value, min, max, fallback) {
    return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
  }
  function rosterRetentionDaysOr(value) {
    return value === 0 || value === 30 || value === 90 || value === 180 || value === 365 || value === 730 ? value : DEFAULT_SETTINGS.linkRoster.retentionDays;
  }
  function finiteNumberInRange(value, min, max) {
    return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
  }
  function validColor(value) {
    return typeof value === "string" && /^#[0-9a-f]{6}$/iu.test(value);
  }
  function isSettingsSection(value) {
    return value === "appearance" || value === "navigation" || value === "chat" || value === "players" || value === "activities";
  }
  function getDefaultStorage() {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.getItem("kikilink:storage-probe");
        return localStorage;
      }
    } catch {
    }
    return new MemoryKeyValueStorage();
  }

  // src/core/event-bus.ts
  var EventBus = class {
    #listeners = /* @__PURE__ */ new Map();
    on(event, listener) {
      let listeners = this.#listeners.get(event);
      if (!listeners) {
        listeners = /* @__PURE__ */ new Set();
        this.#listeners.set(event, listeners);
      }
      listeners.add(listener);
      return () => this.off(event, listener);
    }
    once(event, listener) {
      const unsubscribe = this.on(event, (payload) => {
        unsubscribe();
        listener(payload);
      });
      return unsubscribe;
    }
    off(event, listener) {
      const listeners = this.#listeners.get(event);
      listeners?.delete(listener);
      if (listeners?.size === 0) this.#listeners.delete(event);
    }
    emit(event, payload) {
      const listeners = this.#listeners.get(event);
      if (!listeners) return;
      for (const listener of [...listeners]) {
        try {
          listener(payload);
        } catch (error) {
          console.error(`[KikiLink] Event listener failed for ${String(event)}`, error);
        }
      }
    }
    clear() {
      this.#listeners.clear();
    }
  };

  // src/utils/dom.ts
  function element(tag, options = {}, ...children) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== void 0) node.textContent = options.text;
    if (options.title !== void 0) node.title = options.title;
    if (options.type !== void 0 && node instanceof HTMLButtonElement) node.type = options.type;
    if (options.ariaLabel !== void 0) node.setAttribute("aria-label", options.ariaLabel);
    if (options.onClick) {
      node.addEventListener("click", (event) => options.onClick?.(event));
    }
    for (const child of children) {
      if (!child) continue;
      node.append(child instanceof Node ? child : document.createTextNode(child));
    }
    return node;
  }
  function debounce(callback, delayMs) {
    let timer;
    return (...args) => {
      if (timer !== void 0) clearTimeout(timer);
      timer = setTimeout(() => callback(...args), delayMs);
    };
  }

  // src/modules/link-activities/link-activities-service.ts
  var LinkActivitiesService = class {
    constructor(adapter) {
      this.adapter = adapter;
    }
    adapter;
    isAvailable() {
      return this.adapter.canSendRoomEmote();
    }
    getTargets() {
      return this.adapter.getRoomCharacters();
    }
    preview(activity, target) {
      return expandActivityTemplate(activity.template, {
        sourceName: this.adapter.getOwnName(),
        target
      });
    }
    perform(activity, target) {
      const liveTarget = this.getTargets().find(
        (candidate) => candidate.memberNumber === target.memberNumber
      );
      if (!liveTarget) throw new Error(`${target.memberName} is no longer in this room`);
      const content = this.preview(activity, liveTarget);
      this.adapter.sendRoomEmote(content);
      return content;
    }
  };
  function expandActivityTemplate(template, context) {
    return template.trim().replaceAll("{source}", context.sourceName).replaceAll("{target}", context.target.memberName).replaceAll("{member}", context.target.memberNumber.toString());
  }

  // src/modules/link-roster/link-roster-service.ts
  var HEARTBEAT_MS = 3e4;
  var LinkRosterService = class {
    constructor(adapter, repository, settings) {
      this.adapter = adapter;
      this.repository = repository;
      this.settings = settings;
    }
    adapter;
    repository;
    settings;
    #present = /* @__PURE__ */ new Map();
    #roomName = "";
    #lastHeartbeatAt = 0;
    sync(now = Date.now()) {
      if (!this.adapter.isInChatRoom()) {
        const left2 = [...this.#present.keys()];
        this.#present.clear();
        this.#roomName = "";
        return { changed: left2.length > 0, presentCount: 0, joined: [], left: left2 };
      }
      const roomName = this.adapter.getCurrentRoomName() ?? "Unnamed room";
      const roomChanged = roomName !== this.#roomName;
      if (roomChanged) this.#present.clear();
      this.#roomName = roomName;
      const current = this.adapter.getRoomCharacters();
      const currentNumbers = new Set(current.map((character) => character.memberNumber));
      const joined = current.filter((character) => !this.#present.has(character.memberNumber)).map((character) => character.memberNumber);
      const left = [...this.#present.keys()].filter((memberNumber) => !currentNumbers.has(memberNumber));
      const heartbeat = now - this.#lastHeartbeatAt >= HEARTBEAT_MS;
      const tracking = this.settings.get().linkRoster.trackEncounters;
      const updates = [];
      if (tracking) {
        for (const character of current) {
          const existing = this.repository.get(character.memberNumber);
          const isNewEncounter = !this.#present.has(character.memberNumber);
          const nameChanged = existing?.displayName !== character.memberName;
          if (!existing || isNewEncounter || nameChanged || heartbeat) {
            updates.push(
              mergeObservedPerson(existing, character, roomName, now, isNewEncounter)
            );
          }
        }
        for (const memberNumber of left) {
          const existing = this.repository.get(memberNumber);
          const previous = this.#present.get(memberNumber);
          if (existing && previous) {
            updates.push({ ...existing, displayName: previous.memberName, lastSeenAt: now });
          }
        }
        if (updates.length > 0) this.repository.putMany(updates);
      }
      this.#present.clear();
      for (const character of current) this.#present.set(character.memberNumber, character);
      if (heartbeat) this.#lastHeartbeatAt = now;
      if (heartbeat) this.prune(now);
      return {
        changed: roomChanged || joined.length > 0 || left.length > 0,
        presentCount: current.length,
        joined,
        left
      };
    }
    observePerson(memberNumber, displayName, now = Date.now()) {
      if (!Number.isSafeInteger(memberNumber) || memberNumber < 0) return;
      const existing = this.repository.get(memberNumber);
      this.repository.put({
        ...existing ?? emptyPerson(memberNumber, displayName),
        displayName: displayName.trim() || existing?.displayName || `Member ${memberNumber}`,
        firstSeenAt: existing?.firstSeenAt || now,
        lastSeenAt: Math.max(existing?.lastSeenAt ?? 0, now)
      });
    }
    list(scope, query = "") {
      const normalizedQuery = query.trim().toLocaleLowerCase();
      const records = new Map(
        this.repository.list().map((record) => [record.memberNumber, record])
      );
      const current = new Map(
        this.adapter.getRoomCharacters().map((character) => [character.memberNumber, character])
      );
      const memberNumbers = scope === "current" ? [...current.keys()] : [.../* @__PURE__ */ new Set([...records.keys(), ...current.keys()])];
      return memberNumbers.map((memberNumber) => {
        const character = current.get(memberNumber);
        const record = records.get(memberNumber) ?? emptyPerson(memberNumber, character?.memberName ?? `Member ${memberNumber}`);
        return {
          ...record,
          displayName: character?.memberName ?? record.displayName,
          present: character !== void 0,
          isFriend: character?.isFriend === true
        };
      }).filter((entry) => scope !== "favorites" || entry.favorite).filter(
        (entry) => !normalizedQuery || entry.displayName.toLocaleLowerCase().includes(normalizedQuery) || entry.memberNumber.toString().includes(normalizedQuery) || entry.note.toLocaleLowerCase().includes(normalizedQuery) || entry.tags.some((tag) => tag.toLocaleLowerCase().includes(normalizedQuery))
      ).sort(compareRosterEntries);
    }
    get(memberNumber, fallbackName) {
      return this.repository.get(memberNumber) ?? emptyPerson(memberNumber, fallbackName?.trim() || `Member ${memberNumber}`);
    }
    saveNotebook(memberNumber, displayName, note, tags) {
      const existing = this.get(memberNumber, displayName);
      return this.repository.put({
        ...existing,
        displayName: displayName.trim() || existing.displayName,
        note: note.trim().slice(0, 2e3),
        tags
      });
    }
    toggleFavorite(memberNumber, displayName) {
      const existing = this.get(memberNumber, displayName);
      return this.repository.put({
        ...existing,
        displayName: displayName.trim() || existing.displayName,
        favorite: !existing.favorite
      });
    }
    notebookCount() {
      return this.repository.count();
    }
    exportNotebook(exportedAt = Date.now()) {
      return this.repository.exportBackup(exportedAt);
    }
    importNotebook(value) {
      return this.repository.importBackup(value);
    }
    prune(now = Date.now()) {
      return this.repository.pruneEncounterHistory(
        this.settings.get().linkRoster.retentionDays,
        now
      );
    }
    clear() {
      this.repository.clear();
    }
  };
  function mergeObservedPerson(existing, character, roomName, now, newEncounter) {
    const base = existing ?? emptyPerson(character.memberNumber, character.memberName);
    return {
      ...base,
      displayName: character.memberName,
      firstSeenAt: base.firstSeenAt || now,
      lastSeenAt: now,
      lastRoomName: roomName,
      encounterCount: base.encounterCount + (newEncounter ? 1 : 0)
    };
  }
  function emptyPerson(memberNumber, displayName) {
    return {
      memberNumber,
      displayName,
      favorite: false,
      note: "",
      tags: [],
      firstSeenAt: 0,
      lastSeenAt: 0,
      lastRoomName: "",
      encounterCount: 0
    };
  }
  function compareRosterEntries(left, right) {
    if (left.present !== right.present) return left.present ? -1 : 1;
    if (left.favorite !== right.favorite) return left.favorite ? -1 : 1;
    if (left.isFriend !== right.isFriend) return left.isFriend ? -1 : 1;
    if (left.lastSeenAt !== right.lastSeenAt) return right.lastSeenAt - left.lastSeenAt;
    return left.displayName.localeCompare(right.displayName);
  }

  // src/storage/people-repository.ts
  var PEOPLE_KEY = "kikilink:people:v1";
  var MAX_PEOPLE = 2e3;
  var NOTEBOOK_FORMAT = "kikilink-player-notebook";
  var NOTEBOOK_VERSION = 1;
  var PeopleRepository = class {
    constructor(storage = getDefaultStorage2()) {
      this.storage = storage;
      this.#load();
    }
    storage;
    #records = /* @__PURE__ */ new Map();
    get(memberNumber) {
      const record = this.#records.get(memberNumber);
      return record ? structuredClone(record) : void 0;
    }
    list() {
      return [...this.#records.values()].map((record) => structuredClone(record)).sort((left, right) => right.lastSeenAt - left.lastSeenAt);
    }
    count() {
      return this.#records.size;
    }
    put(record) {
      const sanitized = sanitizePerson(record);
      if (!sanitized) throw new Error("Invalid player record");
      this.#records.set(sanitized.memberNumber, sanitized);
      this.#prune();
      this.#persist();
      return structuredClone(sanitized);
    }
    putMany(records) {
      for (const record of records) {
        const sanitized = sanitizePerson(record);
        if (sanitized) this.#records.set(sanitized.memberNumber, sanitized);
      }
      this.#prune();
      this.#persist();
    }
    exportBackup(exportedAt = Date.now()) {
      return {
        format: NOTEBOOK_FORMAT,
        version: NOTEBOOK_VERSION,
        exportedAt,
        records: this.list()
      };
    }
    importBackup(value) {
      const backup = parseBackup(value);
      const imported = /* @__PURE__ */ new Map();
      let skipped = Math.max(0, backup.records.length - MAX_PEOPLE);
      for (const candidate of backup.records.slice(0, MAX_PEOPLE)) {
        const record = sanitizePerson(candidate);
        if (!record) {
          skipped += 1;
          continue;
        }
        imported.set(record.memberNumber, record);
      }
      for (const record of imported.values()) {
        const existing = this.#records.get(record.memberNumber);
        this.#records.set(record.memberNumber, existing ? mergePeople(existing, record) : record);
      }
      this.#prune();
      this.#persist();
      return { imported: imported.size, skipped, total: this.#records.size };
    }
    pruneEncounterHistory(retentionDays, now = Date.now()) {
      if (!Number.isInteger(retentionDays) || retentionDays <= 0) return 0;
      const cutoff = now - retentionDays * 24 * 60 * 60 * 1e3;
      let removed = 0;
      for (const record of this.#records.values()) {
        const protectedNotebook = record.favorite || record.note.length > 0 || record.tags.length > 0;
        if (protectedNotebook || record.lastSeenAt <= 0 || record.lastSeenAt >= cutoff) continue;
        this.#records.delete(record.memberNumber);
        removed += 1;
      }
      if (removed > 0) this.#persist();
      return removed;
    }
    clear() {
      this.#records.clear();
      try {
        this.storage.removeItem(PEOPLE_KEY);
      } catch {
      }
    }
    #load() {
      let raw = null;
      try {
        raw = this.storage.getItem(PEOPLE_KEY);
      } catch {
        return;
      }
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        for (const value of parsed.slice(0, MAX_PEOPLE)) {
          const record = sanitizePerson(value);
          if (record) this.#records.set(record.memberNumber, record);
        }
      } catch {
      }
    }
    #persist() {
      try {
        this.storage.setItem(PEOPLE_KEY, JSON.stringify(this.list()));
      } catch {
      }
    }
    #prune() {
      if (this.#records.size <= MAX_PEOPLE) return;
      const removable = [...this.#records.values()].filter((record) => !record.favorite && !record.note && record.tags.length === 0).sort((left, right) => left.lastSeenAt - right.lastSeenAt);
      for (const record of removable) {
        if (this.#records.size <= MAX_PEOPLE) break;
        this.#records.delete(record.memberNumber);
      }
      if (this.#records.size <= MAX_PEOPLE) return;
      const oldestRemaining = [...this.#records.values()].sort(
        (left, right) => left.lastSeenAt - right.lastSeenAt
      );
      for (const record of oldestRemaining) {
        if (this.#records.size <= MAX_PEOPLE) break;
        this.#records.delete(record.memberNumber);
      }
    }
  };
  function sanitizePerson(value) {
    if (!isRecord3(value) || !validMemberNumber(value.memberNumber)) return void 0;
    const now = Date.now();
    const lastSeenAt = validTime(value.lastSeenAt) ? value.lastSeenAt : 0;
    const firstSeenAt = validTime(value.firstSeenAt) ? Math.min(value.firstSeenAt, lastSeenAt || now) : lastSeenAt;
    const displayName = cleanText2(value.displayName, 80) || `Member ${value.memberNumber}`;
    const note = cleanText2(value.note, 2e3);
    const lastRoomName = cleanText2(value.lastRoomName, 100);
    const encounterCount = typeof value.encounterCount === "number" && Number.isInteger(value.encounterCount) && value.encounterCount >= 0 ? Math.min(value.encounterCount, 1e6) : 0;
    const tags = [];
    if (Array.isArray(value.tags)) {
      const seen = /* @__PURE__ */ new Set();
      for (const rawTag of value.tags.slice(0, 16)) {
        const tag = cleanText2(rawTag, 24);
        const key = tag.toLocaleLowerCase();
        if (!tag || seen.has(key)) continue;
        seen.add(key);
        tags.push(tag);
        if (tags.length >= 8) break;
      }
    }
    return {
      memberNumber: value.memberNumber,
      displayName,
      favorite: value.favorite === true,
      note,
      tags,
      firstSeenAt,
      lastSeenAt,
      lastRoomName,
      encounterCount
    };
  }
  function parseBackup(value) {
    let parsed = value;
    if (typeof value === "string") {
      try {
        parsed = JSON.parse(value);
      } catch {
        throw new Error("This file is not valid JSON.");
      }
    }
    if (!isRecord3(parsed) || parsed.format !== NOTEBOOK_FORMAT || parsed.version !== NOTEBOOK_VERSION || !Array.isArray(parsed.records)) {
      throw new Error("This is not a KikiLink player notebook backup.");
    }
    return { records: parsed.records };
  }
  function mergePeople(existing, imported) {
    const importedIsNewer = imported.lastSeenAt > existing.lastSeenAt;
    return {
      memberNumber: existing.memberNumber,
      displayName: importedIsNewer ? imported.displayName : existing.displayName,
      favorite: existing.favorite || imported.favorite,
      note: existing.note || imported.note,
      tags: mergeTags(existing.tags, imported.tags),
      firstSeenAt: earliestPositive(existing.firstSeenAt, imported.firstSeenAt),
      lastSeenAt: Math.max(existing.lastSeenAt, imported.lastSeenAt),
      lastRoomName: (importedIsNewer ? imported.lastRoomName : existing.lastRoomName) || existing.lastRoomName || imported.lastRoomName,
      encounterCount: Math.max(existing.encounterCount, imported.encounterCount)
    };
  }
  function mergeTags(existing, imported) {
    const merged = [];
    const seen = /* @__PURE__ */ new Set();
    for (const tag of [...existing, ...imported]) {
      const key = tag.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(tag);
      if (merged.length >= 8) break;
    }
    return merged;
  }
  function earliestPositive(left, right) {
    if (left <= 0) return right;
    if (right <= 0) return left;
    return Math.min(left, right);
  }
  function getDefaultStorage2() {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.getItem("kikilink:people-storage-probe");
        return localStorage;
      }
    } catch {
    }
    return new MemoryKeyValueStorage();
  }
  function isRecord3(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function validMemberNumber(value) {
    return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
  }
  function validTime(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  }
  function cleanText2(value, maxLength) {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
  }

  // src/modules/link-presence/link-presence-service.ts
  var NATIVE_REFRESH_MS = 3e4;
  var STATUS_CHECK_MS = 15e3;
  var REMOTE_STATUS_TTL_MS = 5 * 6e4;
  var RECENT_PACKET_ONLINE_MS = 9e4;
  var REQUEST_COOLDOWN_MS = 2e4;
  var RESPONSE_COOLDOWN_MS = 5e3;
  var TYPING_REFRESH_MS = 1800;
  var TYPING_TTL_MS = 5500;
  var LinkPresenceService = class {
    constructor(adapter, settings, bus, version) {
      this.adapter = adapter;
      this.settings = settings;
      this.bus = bus;
      this.version = version;
    }
    adapter;
    settings;
    bus;
    version;
    #remote = /* @__PURE__ */ new Map();
    #listeners = /* @__PURE__ */ new Set();
    #lastRequestAt = /* @__PURE__ */ new Map();
    #lastResponseAt = /* @__PURE__ */ new Map();
    #localTyping = /* @__PURE__ */ new Map();
    #remoteTypingUntil = /* @__PURE__ */ new Map();
    #typingExpiryTimers = /* @__PURE__ */ new Map();
    #unsubscribers = [];
    #nativeTimer;
    #statusTimer;
    #lastInteractionAt = Date.now();
    #lastEffectiveStatus = "online";
    #lastRoomName = "";
    #started = false;
    #onInteraction = () => {
      const previous = this.getOwnStatus();
      this.#lastInteractionAt = Date.now();
      const next = this.getOwnStatus();
      if (previous !== next) this.#publishOwnPresence();
    };
    #onVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        this.#onInteraction();
        this.adapter.refreshOnlineFriends();
        this.#syncRoom(true);
      }
    };
    start() {
      if (this.#started) return;
      this.#started = true;
      this.#lastEffectiveStatus = this.getOwnStatus();
      this.#unsubscribers.push(
        this.bus.on("bc:protocol", (event) => this.#receive(event.senderNumber, event.payload)),
        this.bus.on("bc:online-friends", () => this.#notify()),
        this.bus.on("bc:ready", () => {
          this.adapter.refreshOnlineFriends();
          this.#syncRoom(true);
        })
      );
      if (typeof window !== "undefined") {
        window.addEventListener("pointerdown", this.#onInteraction, { passive: true });
        window.addEventListener("keydown", this.#onInteraction, { passive: true });
      }
      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", this.#onVisibilityChange);
      }
      this.#nativeTimer = setInterval(() => {
        if (typeof document === "undefined" || document.visibilityState === "visible") {
          this.adapter.refreshOnlineFriends();
        }
        this.#syncRoom(false);
        this.#prune();
      }, NATIVE_REFRESH_MS);
      this.#statusTimer = setInterval(() => this.#checkOwnStatus(), STATUS_CHECK_MS);
      this.adapter.refreshOnlineFriends();
      this.#syncRoom(true);
    }
    stop() {
      if (!this.#started) return;
      for (const memberNumber of this.#localTyping.keys()) {
        this.setTyping(memberNumber, false, true);
      }
      this.#started = false;
      if (this.#nativeTimer !== void 0) clearInterval(this.#nativeTimer);
      if (this.#statusTimer !== void 0) clearInterval(this.#statusTimer);
      this.#nativeTimer = void 0;
      this.#statusTimer = void 0;
      for (const unsubscribe of this.#unsubscribers.splice(0).reverse()) unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("pointerdown", this.#onInteraction);
        window.removeEventListener("keydown", this.#onInteraction);
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", this.#onVisibilityChange);
      }
      this.#listeners.clear();
      this.#remote.clear();
      this.#localTyping.clear();
      this.#remoteTypingUntil.clear();
      for (const timer of this.#typingExpiryTimers.values()) clearTimeout(timer);
      this.#typingExpiryTimers.clear();
    }
    subscribe(listener) {
      this.#listeners.add(listener);
      return () => this.#listeners.delete(listener);
    }
    getOwnStatus() {
      const config = this.settings.get().linkPresence;
      if (config.status !== "online" || config.autoIdleMinutes === 0) return config.status;
      return Date.now() - this.#lastInteractionAt >= config.autoIdleMinutes * 6e4 ? "idle" : "online";
    }
    getOwnStatusMessage() {
      return this.settings.get().linkPresence.statusMessage;
    }
    setOwnStatus(status) {
      this.settings.update((draft) => {
        draft.linkPresence.status = status;
      });
      this.#lastInteractionAt = Date.now();
      this.#lastEffectiveStatus = this.getOwnStatus();
      this.#publishOwnPresence();
      this.#notify(this.adapter.getOwnMemberNumber());
    }
    setEnabled(enabled) {
      const previous = this.settings.get().linkPresence.enabled;
      if (previous === enabled) return;
      if (previous && !enabled) this.#publishOwnPresence("offline", true);
      this.settings.update((draft) => {
        draft.linkPresence.enabled = enabled;
      });
      if (enabled) {
        this.#syncRoom(true);
        this.#publishOwnPresence();
      }
      this.#notify(this.adapter.getOwnMemberNumber());
    }
    setOwnStatusMessage(statusMessage) {
      this.settings.update((draft) => {
        draft.linkPresence.statusMessage = statusMessage;
      });
      this.#publishOwnPresence();
      this.#notify(this.adapter.getOwnMemberNumber());
    }
    get(memberNumber, now = Date.now()) {
      if (memberNumber === this.adapter.getOwnMemberNumber()) {
        const statusMessage = this.getOwnStatusMessage();
        return {
          memberNumber,
          status: this.getOwnStatus(),
          source: "kikilink",
          updatedAt: now,
          ...statusMessage ? { statusMessage } : {}
        };
      }
      const remote = this.#remote.get(memberNumber);
      const inRoom = typeof this.adapter.isMemberInCurrentRoom === "function" && this.adapter.isMemberInCurrentRoom(memberNumber);
      const currentRoomName = inRoom && typeof this.adapter.getCurrentRoomName === "function" ? this.adapter.getCurrentRoomName() : void 0;
      const onlineFriend = typeof this.adapter.getOnlineFriends === "function" ? this.adapter.getOnlineFriends().find((friend) => friend.memberNumber === memberNumber) : void 0;
      const observableRoomName = onlineFriend?.roomName ?? currentRoomName;
      if (remote && now - remote.receivedAt <= REMOTE_STATUS_TTL_MS && (remote.status === "offline" || inRoom || onlineFriend || now - remote.receivedAt <= RECENT_PACKET_ONLINE_MS)) {
        return {
          memberNumber,
          status: remote.status,
          source: "kikilink",
          updatedAt: remote.remoteUpdatedAt,
          ...remote.statusMessage ? { statusMessage: remote.statusMessage } : {},
          ...observableRoomName ? { roomName: observableRoomName } : {}
        };
      }
      if (inRoom) {
        return {
          memberNumber,
          status: "online",
          source: "room",
          updatedAt: now,
          ...currentRoomName ? { roomName: currentRoomName } : {}
        };
      }
      if (onlineFriend) {
        return {
          memberNumber,
          status: "online",
          source: "friend-list",
          updatedAt: now,
          ...onlineFriend.roomName ? { roomName: onlineFriend.roomName } : {}
        };
      }
      if (typeof this.adapter.hasOnlineFriendSnapshot === "function" && typeof this.adapter.isKnownFriend === "function" && this.adapter.hasOnlineFriendSnapshot() && this.adapter.isKnownFriend(memberNumber)) {
        return { memberNumber, status: "offline", source: "friend-list", updatedAt: now };
      }
      return { memberNumber, status: "unknown", source: "unknown", updatedAt: 0 };
    }
    request(memberNumber, force = false) {
      if (!this.settings.get().linkPresence.enabled || memberNumber === this.adapter.getOwnMemberNumber()) {
        return false;
      }
      const now = Date.now();
      if (!force && now - (this.#lastRequestAt.get(memberNumber) ?? 0) < REQUEST_COOLDOWN_MS) {
        return false;
      }
      const packet = { t: "pq", i: createId("p").slice(-18) };
      try {
        this.adapter.sendKikiLinkProtocol(memberNumber, JSON.stringify(packet));
        this.#lastRequestAt.set(memberNumber, now);
        return true;
      } catch {
        return false;
      }
    }
    isTyping(memberNumber, now = Date.now()) {
      return (this.#remoteTypingUntil.get(memberNumber) ?? 0) > now;
    }
    setTyping(memberNumber, active, force = false) {
      if (!Number.isSafeInteger(memberNumber) || memberNumber < 0 || memberNumber === this.adapter.getOwnMemberNumber()) {
        return false;
      }
      if (!this.settings.get().linkChat.typingIndicators && !(force && !active)) return false;
      const previous = this.#localTyping.get(memberNumber);
      const now = Date.now();
      if (active && previous && now - previous.sentAt < TYPING_REFRESH_MS) return false;
      if (!active && !previous) return false;
      if (!active) this.#localTyping.delete(memberNumber);
      const packet = { t: "ty", a: active ? 1 : 0 };
      try {
        this.adapter.sendKikiLinkProtocol(memberNumber, JSON.stringify(packet));
        if (active) this.#localTyping.set(memberNumber, { active: true, sentAt: now });
        return true;
      } catch {
        return false;
      }
    }
    #receive(senderNumber, payload) {
      if (senderNumber === this.adapter.getOwnMemberNumber()) return;
      const packet = parsePresencePacket(payload);
      if (!packet) return;
      if (packet.t === "ty") {
        if (!this.settings.get().linkChat.typingIndicators) return;
        this.#receiveTyping(senderNumber, packet.a === 1);
        return;
      }
      if (!this.settings.get().linkPresence.enabled) return;
      if (packet.t === "pq") {
        const now = Date.now();
        if (now - (this.#lastResponseAt.get(senderNumber) ?? 0) < RESPONSE_COOLDOWN_MS) return;
        this.#lastResponseAt.set(senderNumber, now);
        this.#sendPresence(senderNumber, packet.i);
        return;
      }
      const receivedAt = Date.now();
      this.#remote.set(senderNumber, {
        status: packet.s,
        ...packet.m ? { statusMessage: packet.m } : {},
        receivedAt,
        remoteUpdatedAt: Math.abs(packet.u - receivedAt) <= 24 * 60 * 6e4 ? packet.u : receivedAt
      });
      this.#notify(senderNumber);
    }
    #receiveTyping(senderNumber, active) {
      const previousTimer = this.#typingExpiryTimers.get(senderNumber);
      if (previousTimer !== void 0) clearTimeout(previousTimer);
      this.#typingExpiryTimers.delete(senderNumber);
      if (!active) {
        const changed = this.#remoteTypingUntil.delete(senderNumber);
        if (changed) this.#notify(senderNumber);
        return;
      }
      const expiresAt = Date.now() + TYPING_TTL_MS;
      this.#remoteTypingUntil.set(senderNumber, expiresAt);
      this.#typingExpiryTimers.set(
        senderNumber,
        setTimeout(() => {
          this.#typingExpiryTimers.delete(senderNumber);
          if ((this.#remoteTypingUntil.get(senderNumber) ?? 0) > Date.now()) return;
          if (this.#remoteTypingUntil.delete(senderNumber)) this.#notify(senderNumber);
        }, TYPING_TTL_MS + 25)
      );
      this.#notify(senderNumber);
    }
    #sendPresence(target, requestId) {
      const config = this.settings.get().linkPresence;
      const packet = {
        t: "ps",
        ...requestId ? { i: requestId } : {},
        s: this.getOwnStatus(),
        ...config.statusMessage ? { m: config.statusMessage } : {},
        u: Date.now(),
        v: this.version
      };
      try {
        this.adapter.sendKikiLinkProtocol(target, JSON.stringify(packet));
      } catch {
      }
    }
    #publishOwnPresence(statusOverride, force = false) {
      if (!force && !this.settings.get().linkPresence.enabled) return;
      const config = this.settings.get().linkPresence;
      const packet = {
        t: "ps",
        s: statusOverride ?? this.getOwnStatus(),
        ...config.statusMessage ? { m: config.statusMessage } : {},
        u: Date.now(),
        v: this.version
      };
      this.adapter.broadcastKikiLinkProtocol(JSON.stringify(packet));
    }
    #syncRoom(force) {
      const roomName = this.adapter.isInChatRoom() ? this.adapter.getCurrentRoomName() ?? "?" : "";
      if (!force && roomName === this.#lastRoomName) return;
      this.#lastRoomName = roomName;
      if (!roomName || !this.settings.get().linkPresence.enabled) return;
      const query = { t: "pq", i: createId("room").slice(-18), b: 1 };
      this.adapter.broadcastKikiLinkProtocol(JSON.stringify(query));
      this.#publishOwnPresence();
    }
    #checkOwnStatus() {
      const effective = this.getOwnStatus();
      if (effective === this.#lastEffectiveStatus) return;
      this.#lastEffectiveStatus = effective;
      this.#publishOwnPresence();
      this.#notify(this.adapter.getOwnMemberNumber());
    }
    #prune(now = Date.now()) {
      for (const [memberNumber, remote] of this.#remote) {
        if (now - remote.receivedAt <= REMOTE_STATUS_TTL_MS) continue;
        this.#remote.delete(memberNumber);
        this.#notify(memberNumber);
      }
    }
    #notify(memberNumber) {
      for (const listener of [...this.#listeners]) listener(memberNumber);
    }
  };
  function parsePresencePacket(payload) {
    let value;
    try {
      value = JSON.parse(payload);
    } catch {
      return null;
    }
    if (!value || typeof value !== "object" || !("t" in value)) return null;
    if (value.t === "pq") {
      if (!("i" in value) || typeof value.i !== "string" || value.i.length < 1 || value.i.length > 32) {
        return null;
      }
      return { t: "pq", i: value.i, ..."b" in value && value.b === 1 ? { b: 1 } : {} };
    }
    if (value.t === "ty") {
      if (!("a" in value) || value.a !== 0 && value.a !== 1) return null;
      return { t: "ty", a: value.a };
    }
    if (value.t !== "ps" || !("s" in value) || !isPresenceStatus(value.s) || !("u" in value) || typeof value.u !== "number" || !Number.isFinite(value.u) || !("v" in value) || typeof value.v !== "string" || value.v.length > 24) {
      return null;
    }
    const message = "m" in value && typeof value.m === "string" ? value.m.trim().slice(0, 80) : "";
    const requestId = "i" in value && typeof value.i === "string" ? value.i.slice(0, 32) : "";
    return {
      t: "ps",
      ...requestId ? { i: requestId } : {},
      s: value.s,
      ...message ? { m: message } : {},
      u: value.u,
      v: value.v
    };
  }
  function isPresenceStatus(value) {
    return value === "online" || value === "idle" || value === "dnd" || value === "offline";
  }

  // src/modules/link-chat/styles.ts
  var LINK_CHAT_STYLES = `
:host {
  --kl-accent: #d71932;
  --kl-accent-strong: #f13749;
  --kl-accent-foreground: #fff8ee;
  --kl-type-xxs: 9px;
  --kl-type-xs: 10px;
  --kl-type-sm: 11px;
  --kl-type-body: 12px;
  --kl-type-md: 14px;
  --kl-type-lg: 17px;
  --kl-type-xl: 20px;
  --kl-gold: #d6a24b;
  --kl-bg: #070708;
  --kl-panel-bg: rgba(8, 8, 9, 0.985);
  --kl-surface: #111113;
  --kl-surface-2: #19191c;
  --kl-surface-hover: #252427;
  --kl-input-bg: #101012;
  --kl-border: rgba(214, 162, 75, 0.18);
  --kl-border-strong: rgba(214, 162, 75, 0.42);
  --kl-text: #f5eee3;
  --kl-muted: #a89e91;
  --kl-meta: rgba(245, 238, 227, 0.58);
  --kl-danger: #ff8da0;
  --kl-sidebar-bg: rgba(255, 255, 255, 0.012);
  --kl-composer-bg: rgba(8, 8, 9, 0.94);
  --kl-topbar-bg: linear-gradient(180deg, rgba(214, 162, 75, 0.055), transparent);
  --kl-avatar-bg: linear-gradient(145deg, #302b28, #151416);
  --kl-panel-art:
    radial-gradient(circle at 78% 8%, rgba(215, 25, 50, 0.10), transparent 34%),
    radial-gradient(circle at 22% 120%, rgba(214, 162, 75, 0.055), transparent 40%);
  --kl-shadow: 0 26px 80px rgba(0, 0, 0, 0.68);
  color: var(--kl-text);
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 14px;
  line-height: 1.4;
}

:host([data-text-scale="large"]) {
  --kl-type-xxs: 10px;
  --kl-type-xs: 11px;
  --kl-type-sm: 12px;
  --kl-type-body: 13px;
  --kl-type-md: 15px;
  --kl-type-lg: 19px;
  --kl-type-xl: 22px;
  font-size: 15px;
}

:host([data-text-scale="extra-large"]) {
  --kl-type-xxs: 11px;
  --kl-type-xs: 12px;
  --kl-type-sm: 13px;
  --kl-type-body: 14px;
  --kl-type-md: 16px;
  --kl-type-lg: 20px;
  --kl-type-xl: 24px;
  font-size: 16px;
}

:host([data-theme="light"]) {
  --kl-accent-strong: #c9152e;
  --kl-gold: #ad7624;
  --kl-bg: #e9dcc2;
  --kl-panel-bg: rgba(244, 235, 214, 0.985);
  --kl-surface: rgba(250, 244, 229, 0.88);
  --kl-surface-2: #e8d9ba;
  --kl-surface-hover: #ddc79d;
  --kl-input-bg: rgba(255, 250, 238, 0.92);
  --kl-border: rgba(79, 49, 24, 0.18);
  --kl-border-strong: rgba(173, 118, 36, 0.48);
  --kl-text: #211611;
  --kl-muted: #756354;
  --kl-meta: rgba(51, 35, 26, 0.58);
  --kl-danger: #a8172c;
  --kl-sidebar-bg: rgba(103, 69, 35, 0.035);
  --kl-composer-bg: rgba(238, 225, 198, 0.92);
  --kl-topbar-bg: linear-gradient(180deg, rgba(255, 252, 242, 0.62), rgba(211, 188, 147, 0.12));
  --kl-avatar-bg: linear-gradient(145deg, #ead9b6, #cfb98f);
  --kl-panel-art:
    repeating-linear-gradient(7deg, rgba(93, 62, 31, 0.020) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(97deg, rgba(255, 255, 255, 0.10) 0 1px, transparent 1px 11px),
    radial-gradient(circle at 80% 4%, rgba(153, 27, 35, 0.07), transparent 28%),
    radial-gradient(circle at 12% 100%, rgba(81, 52, 29, 0.07), transparent 36%);
  --kl-shadow: 0 26px 72px rgba(50, 31, 17, 0.34);
  color-scheme: light;
}

@media (prefers-color-scheme: light) {
  :host([data-theme="system"]) {
    --kl-accent-strong: #c9152e;
    --kl-gold: #ad7624;
    --kl-bg: #e9dcc2;
    --kl-panel-bg: rgba(244, 235, 214, 0.985);
    --kl-surface: rgba(250, 244, 229, 0.88);
    --kl-surface-2: #e8d9ba;
    --kl-surface-hover: #ddc79d;
    --kl-input-bg: rgba(255, 250, 238, 0.92);
    --kl-border: rgba(79, 49, 24, 0.18);
    --kl-border-strong: rgba(173, 118, 36, 0.48);
    --kl-text: #211611;
    --kl-muted: #756354;
    --kl-meta: rgba(51, 35, 26, 0.58);
    --kl-danger: #a8172c;
    --kl-sidebar-bg: rgba(103, 69, 35, 0.035);
    --kl-composer-bg: rgba(238, 225, 198, 0.92);
    --kl-topbar-bg: linear-gradient(180deg, rgba(255, 252, 242, 0.62), rgba(211, 188, 147, 0.12));
    --kl-avatar-bg: linear-gradient(145deg, #ead9b6, #cfb98f);
    --kl-panel-art:
      repeating-linear-gradient(7deg, rgba(93, 62, 31, 0.020) 0 1px, transparent 1px 7px),
      repeating-linear-gradient(97deg, rgba(255, 255, 255, 0.10) 0 1px, transparent 1px 11px),
      radial-gradient(circle at 80% 4%, rgba(153, 27, 35, 0.07), transparent 28%),
      radial-gradient(circle at 12% 100%, rgba(81, 52, 29, 0.07), transparent 36%);
    --kl-shadow: 0 26px 72px rgba(50, 31, 17, 0.34);
    color-scheme: light;
  }
}

* { box-sizing: border-box; }
[hidden] { display: none !important; }

.kl-icon {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  display: block;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}
.kl-icon[data-filled="true"] .kl-icon-fill { fill: currentColor; }
.kl-icon-button .kl-icon { width: 18px; height: 18px; }

button,
input,
textarea,
select {
  font: inherit;
}

button { color: inherit; }

.kl-emblem {
  position: relative;
  display: block;
  overflow: hidden;
  background: #020203;
}

.kl-emblem-image {
  position: absolute;
  top: 0;
  left: 50%;
  width: 156%;
  height: auto;
  max-width: none;
  transform: translateX(-50%);
  pointer-events: none;
  user-select: none;
}

.kl-launcher {
  position: fixed;
  z-index: 2147483000;
  bottom: max(20px, env(safe-area-inset-bottom));
  width: 58px;
  height: 58px;
  padding: 0;
  border: 1px solid var(--kl-border-strong);
  border-radius: 19px;
  background: #030304;
  box-shadow:
    0 14px 38px color-mix(in srgb, var(--kl-accent), transparent 62%),
    0 0 0 1px rgba(0, 0, 0, 0.75),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  cursor: pointer;
  touch-action: none;
  user-select: none;
  transition: transform 160ms ease, filter 160ms ease, border-color 160ms ease;
}

.kl-launcher[data-side="right"] { right: max(20px, env(safe-area-inset-right)); }
.kl-launcher[data-side="left"] { left: max(20px, env(safe-area-inset-left)); }
.kl-launcher:hover { border-color: var(--kl-gold); filter: brightness(1.08); transform: translateY(-2px); }
.kl-launcher:active { transform: translateY(0) scale(0.97); }
.kl-launcher[data-dragging="true"] { cursor: grabbing; filter: brightness(1.1); transform: scale(1.03); transition: none; }

.kl-launcher-emblem {
  position: absolute;
  inset: 3px;
  border-radius: 15px;
}

.kl-badge {
  position: absolute;
  z-index: 2;
  top: -7px;
  right: -7px;
  min-width: 23px;
  height: 23px;
  padding: 0 6px;
  display: grid;
  place-items: center;
  border: 2px solid var(--kl-bg);
  border-radius: 999px;
  background: #f3e5cb;
  color: #9f1028;
  font-size: 11px;
  font-weight: 900;
}

.kl-panel {
  position: fixed;
  z-index: 2147482999;
  right: max(20px, env(safe-area-inset-right));
  bottom: max(90px, calc(env(safe-area-inset-bottom) + 78px));
  width: min(1040px, calc(100vw - 40px));
  height: min(680px, calc(100vh - 130px));
  min-height: 420px;
  display: grid;
  grid-template-rows: 64px minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--kl-border);
  border-radius: 24px;
  background: var(--kl-panel-art), var(--kl-panel-bg);
  box-shadow: var(--kl-shadow);
  contain: layout paint style;
  isolation: isolate;
  transform-origin: bottom right;
  animation: kl-enter 160ms ease-out;
}

.kl-panel::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.045);
  pointer-events: none;
}

.kl-panel[data-side="left"] {
  left: max(20px, env(safe-area-inset-left));
  right: auto;
  transform-origin: bottom left;
}

@keyframes kl-enter {
  from { opacity: 0; transform: translateY(10px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.kl-topbar {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px 0 18px;
  border-bottom: 1px solid var(--kl-border);
  background: var(--kl-topbar-bg);
}

.kl-topbar::after {
  content: "";
  position: absolute;
  left: 18px;
  bottom: -1px;
  width: 70px;
  height: 1px;
  background: linear-gradient(90deg, var(--kl-accent), var(--kl-gold), transparent);
}

.kl-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  margin-right: auto;
}

.kl-brand-emblem {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border: 1px solid var(--kl-border-strong);
  border-radius: 12px;
  box-shadow: 0 5px 16px rgba(0, 0, 0, 0.24);
}

.kl-brand-copy { min-width: 0; }
.kl-brand-title {
  overflow: hidden;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.075em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}
.kl-brand-subtitle { display: flex; align-items: center; gap: 8px; color: var(--kl-muted); font-size: var(--kl-type-sm); letter-spacing: 0.02em; }
.kl-topbar-context {
  margin-right: 2px;
  color: var(--kl-gold);
  font-size: var(--kl-type-xs);
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.kl-topbar-settings { display: none; }
.kl-finder-trigger {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 8px 6px 10px;
  color: var(--kl-muted);
  font-size: var(--kl-type-sm);
}
.kl-finder-trigger:hover { color: var(--kl-text); }
.kl-finder-trigger-icon { width: 18px; height: 18px; color: var(--kl-gold); }
.kl-finder-trigger-label { font-weight: 800; }
.kl-finder-shortcut,
.kl-finder-keys kbd {
  padding: 2px 5px;
  border: 1px solid var(--kl-border);
  border-bottom-color: var(--kl-border-strong);
  border-radius: 5px;
  background: var(--kl-input-bg);
  color: var(--kl-meta);
  font-family: inherit;
  font-size: var(--kl-type-xxs);
  font-weight: 780;
  line-height: 1.35;
  white-space: nowrap;
}
.kl-topbar-settings[aria-current="page"] {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 24%);
  background: color-mix(in srgb, var(--kl-accent), transparent 84%);
}
.kl-connection { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.kl-connection-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--kl-gold); box-shadow: 0 0 0 3px color-mix(in srgb, var(--kl-gold), transparent 84%); }
.kl-connection[data-state="ready"] .kl-connection-dot { background: #68d391; box-shadow: 0 0 0 3px rgba(104, 211, 145, 0.16); }
.kl-connection[data-state="error"] .kl-connection-dot { background: var(--kl-danger); box-shadow: 0 0 0 3px color-mix(in srgb, var(--kl-danger), transparent 84%); }

.kl-icon-button,
.kl-text-button {
  border: 1px solid var(--kl-border);
  background: var(--kl-surface-2);
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease, transform 140ms ease;
}

.kl-icon-button {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 11px;
  font-size: 17px;
}

.kl-roster-button { position: relative; }
.kl-roster-count {
  position: absolute;
  top: 4px;
  right: 7px;
  min-width: 19px;
  height: 19px;
  display: grid;
  place-items: center;
  padding: 0 5px;
  border: 2px solid var(--kl-bg);
  border-radius: 999px;
  background: var(--kl-gold);
  color: #1b1005;
  font-size: 9px;
  font-weight: 900;
}

.kl-text-button {
  min-height: 40px;
  padding: 7px 12px;
  border-radius: 11px;
  font-weight: 750;
}

.kl-icon-button:hover,
.kl-text-button:hover {
  border-color: var(--kl-border-strong);
  background: var(--kl-surface-hover);
}
.kl-icon-button:active,
.kl-text-button:active { transform: scale(0.96); }
.kl-icon-button:disabled,
.kl-text-button:disabled { opacity: 0.48; cursor: wait; transform: none; }
.kl-text-button--danger { color: var(--kl-danger); }
.kl-text-button--primary {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 24%);
  background: var(--kl-accent);
  color: var(--kl-accent-foreground);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.13);
}
.kl-text-button--primary:hover { background: color-mix(in srgb, var(--kl-accent), var(--kl-accent-foreground) 10%); }

.kl-shell {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
}

.kl-feature-nav {
  position: relative;
  z-index: 2;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 14px 9px;
  border-right: 1px solid var(--kl-border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--kl-accent), transparent 94%), transparent 45%),
    var(--kl-sidebar-bg);
}

.kl-nav-item {
  position: relative;
  width: 100%;
  min-height: 62px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 7px 4px;
  border: 1px solid transparent;
  border-radius: 15px;
  background: transparent;
  color: var(--kl-muted);
  cursor: pointer;
  transition: color 140ms ease, border-color 140ms ease, background 140ms ease, transform 140ms ease;
}

.kl-nav-item:hover {
  border-color: var(--kl-border);
  background: var(--kl-surface-2);
  color: var(--kl-text);
}
.kl-nav-item:active { transform: scale(0.97); }
.kl-nav-item[data-active="true"] {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 22%);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--kl-accent), transparent 82%), transparent),
    var(--kl-surface-2);
  color: var(--kl-text);
  box-shadow: inset 3px 0 var(--kl-accent);
}
.kl-nav-item[data-available="false"] .kl-nav-icon { opacity: 0.48; }
.kl-nav-icon { width: 20px; height: 20px; }
.kl-nav-label {
  max-width: 100%;
  overflow: hidden;
  font-size: var(--kl-type-xs);
  font-weight: 820;
  letter-spacing: 0.035em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-nav-item[data-target="settings"] { margin-top: auto; }

.kl-workspace {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  contain: layout paint;
}
.kl-workspace > .kl-layout,
.kl-workspace > .kl-home,
.kl-workspace > .kl-feature-page,
.kl-workspace > .kl-settings-page { height: 100%; }

.kl-feature-page,
.kl-settings-page {
  min-width: 0;
  min-height: 0;
  background:
    radial-gradient(circle at 92% 0%, color-mix(in srgb, var(--kl-accent), transparent 91%), transparent 32%),
    transparent;
}

.kl-feature-page {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.kl-feature-page-header {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 19px 24px 17px;
  border-bottom: 1px solid var(--kl-border);
  background: color-mix(in srgb, var(--kl-surface), transparent 42%);
}
.kl-feature-page-heading { min-width: 0; margin-right: auto; }
.kl-feature-page-eyebrow {
  color: var(--kl-gold);
  font-size: var(--kl-type-xxs);
  font-weight: 900;
  letter-spacing: 0.16em;
}
.kl-feature-page-title {
  margin: 2px 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: var(--kl-type-xl);
  line-height: 1.15;
}
.kl-feature-page-subtitle {
  margin: 3px 0 0;
  color: var(--kl-muted);
  font-size: var(--kl-type-sm);
}
.kl-feature-page-footer {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  padding: 11px 20px;
  border-top: 1px solid var(--kl-border);
  background: var(--kl-composer-bg);
}
.kl-feature-page-footnote { margin-right: auto; color: var(--kl-muted); font-size: var(--kl-type-xs); }

.kl-settings-page {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
}
.kl-settings-layout {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
}
.kl-settings-tabs {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 15px 11px;
  overflow-y: auto;
  border-right: 1px solid var(--kl-border);
  background: var(--kl-sidebar-bg);
}
.kl-settings-tab {
  width: 100%;
  min-height: 46px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 11px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: var(--kl-muted);
  text-align: left;
  cursor: pointer;
}
.kl-settings-tab:hover { border-color: var(--kl-border); background: var(--kl-surface-2); color: var(--kl-text); }
.kl-settings-tab[data-active="true"] {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 22%);
  background: color-mix(in srgb, var(--kl-accent), transparent 87%);
  color: var(--kl-text);
  box-shadow: inset 3px 0 var(--kl-accent);
}
.kl-settings-tab-icon {
  width: 25px;
  height: 18px;
  padding-inline: 3px;
  color: var(--kl-gold);
}
.kl-settings-panels { min-width: 0; min-height: 0; overflow: hidden; }
.kl-settings-panel {
  height: 100%;
  overflow-y: auto;
  padding: 24px clamp(22px, 4vw, 42px) 34px;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-settings-panel-title {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: var(--kl-type-xl);
}
.kl-settings-panel-description {
  max-width: 680px;
  margin: 5px 0 22px;
  color: var(--kl-muted);
  font-size: var(--kl-type-body);
}
.kl-settings-panel-body { display: grid; gap: 18px; }
.kl-settings-actions {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  padding: 11px 20px;
  border-top: 1px solid var(--kl-border);
  background: var(--kl-composer-bg);
}
.kl-settings-local-note { margin-right: auto; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-setting-action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.kl-data-tools {
  position: relative;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px 15px 14px 17px;
  overflow: hidden;
  border: 1px solid var(--kl-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 18%);
}
.kl-data-tools::before {
  content: "";
  position: absolute;
  inset: 10px auto 10px 0;
  width: 2px;
  border-radius: 999px;
  background: linear-gradient(var(--kl-accent), var(--kl-gold));
}
.kl-data-tools-copy { min-width: 0; margin-right: auto; }
.kl-data-tools-title { font-weight: 780; }
.kl-data-tools-count { display: block; margin-top: 5px; color: var(--kl-meta); font-size: var(--kl-type-xs); }
.kl-data-tools-actions { display: flex; align-items: center; gap: 7px; flex: 0 0 auto; }
.kl-data-tools-actions .kl-text-button { min-width: 76px; }
.kl-activity-data-actions { max-width: 520px; flex-wrap: wrap; justify-content: flex-end; }
.kl-activity-pack-select { width: 170px; }

.kl-home {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: clamp(20px, 3vw, 34px);
  background:
    radial-gradient(circle at 88% 3%, color-mix(in srgb, var(--kl-accent), transparent 82%), transparent 30%),
    radial-gradient(circle at 12% 105%, color-mix(in srgb, var(--kl-gold), transparent 91%), transparent 34%);
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}

.kl-home-hero {
  position: relative;
  min-height: 214px;
  display: grid;
  grid-template-columns: minmax(230px, 0.82fr) minmax(330px, 1.18fr);
  align-items: center;
  gap: clamp(20px, 3vw, 34px);
  margin-bottom: 22px;
  padding: 25px 28px;
  overflow: hidden;
  border: 1px solid var(--kl-border);
  border-radius: 24px;
  background:
    linear-gradient(125deg, color-mix(in srgb, var(--kl-accent), transparent 88%), transparent 46%),
    color-mix(in srgb, var(--kl-surface), transparent 8%);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.035);
}
.kl-home-hero::before {
  content: "";
  position: absolute;
  left: 28px;
  bottom: 0;
  width: 180px;
  height: 1px;
  background: linear-gradient(90deg, var(--kl-accent), var(--kl-gold), transparent);
}
.kl-home-hero-copy { position: relative; z-index: 2; min-width: 0; }
.kl-home-eyebrow,
.kl-feature-card-kicker,
.kl-home-next-kicker {
  color: var(--kl-gold);
  font-size: var(--kl-type-xxs);
  font-weight: 900;
  letter-spacing: 0.16em;
}
.kl-home-title {
  margin: 6px 0 4px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(25px, 3.2vw, 38px);
  font-weight: 650;
  letter-spacing: -0.025em;
}
.kl-home-lead { max-width: 590px; margin: 0; color: var(--kl-muted); font-size: var(--kl-type-body); }
.kl-home-statuses { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
.kl-home-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 30px;
  padding: 5px 10px;
  border: 1px solid var(--kl-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 18%);
  font-size: var(--kl-type-xs);
}
.kl-home-status-label { color: var(--kl-muted); }
.kl-home-status-value { font-weight: 780; }
.kl-home-status-value[data-state="ready"] { color: #68d391; }
.kl-home-status-value[data-state="error"] { color: var(--kl-danger); }
.kl-home-mark {
  position: absolute;
  left: 23%;
  bottom: -28px;
  width: 128px;
  height: 128px;
  opacity: 0.13;
  pointer-events: none;
  transform: rotate(-8deg);
}
.kl-home-emblem {
  position: absolute;
  inset: 14px;
  z-index: 1;
  border: 1px solid var(--kl-border-strong);
  border-radius: 38px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
  transform: rotate(3deg);
}
.kl-home-orbit {
  position: absolute;
  inset: 0;
  border: 1px solid color-mix(in srgb, var(--kl-gold), transparent 52%);
  border-radius: 50%;
  transform: rotate(-18deg) scaleY(0.62);
}
.kl-home-orbit::after {
  content: "";
  position: absolute;
  top: 44%;
  right: -4px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--kl-accent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--kl-accent), transparent 28%);
}

.kl-home-next {
  position: relative;
  z-index: 2;
  min-width: 0;
  align-self: stretch;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 13px 15px;
  padding: 20px;
  border: 1px solid color-mix(in srgb, var(--kl-accent), var(--kl-gold) 26%);
  border-radius: 19px;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--kl-accent), transparent 80%), transparent 68%),
    color-mix(in srgb, var(--kl-surface-2), transparent 5%);
  box-shadow: 0 16px 35px rgba(0, 0, 0, 0.12);
}
.kl-home-next-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--kl-gold), transparent 36%);
  border-radius: 15px;
  background: color-mix(in srgb, var(--kl-surface), transparent 7%);
  color: var(--kl-gold);
  font-size: 22px;
  font-weight: 850;
}
.kl-home-next-copy { min-width: 0; }
.kl-home-next-title {
  margin: 4px 0 3px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(20px, 2.3vw, 27px);
  line-height: 1.12;
}
.kl-home-next-description {
  max-width: 480px;
  margin: 0;
  color: var(--kl-muted);
  font-size: var(--kl-type-sm);
}
.kl-home-next-footer {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--kl-border);
}
.kl-home-next-meta {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: var(--kl-meta);
  font-size: var(--kl-type-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-home-next-button { flex: 0 0 auto; }

.kl-home-section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 18px;
  margin: 0 2px 10px;
}
.kl-home-section-heading h2 {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: var(--kl-type-xl);
}
.kl-home-section-heading p {
  margin: 0;
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
  text-align: right;
}

.kl-feature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.kl-feature-card {
  position: relative;
  min-width: 0;
  min-height: 150px;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 11px 14px;
  padding: 18px;
  overflow: hidden;
  border: 1px solid var(--kl-border);
  border-radius: 19px;
  background: var(--kl-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 150ms ease, border-color 150ms ease, background 150ms ease;
}
.kl-feature-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--kl-accent), transparent 91%), transparent 38%);
  pointer-events: none;
}
.kl-feature-card:hover {
  border-color: var(--kl-border-strong);
  background: var(--kl-surface-hover);
  transform: translateY(-2px);
}
.kl-feature-card:active { transform: translateY(0) scale(0.99); }
.kl-feature-card--primary {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 24%);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--kl-accent), transparent 82%), transparent 64%),
    var(--kl-surface);
}
.kl-feature-card[data-available="false"] { border-style: dashed; }
.kl-feature-card-icon {
  position: relative;
  z-index: 1;
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border: 1px solid var(--kl-border-strong);
  border-radius: 15px;
  background: var(--kl-surface-2);
  color: var(--kl-gold);
  padding: 12px;
}
.kl-feature-card-copy {
  position: relative;
  z-index: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.kl-feature-card-title {
  margin-top: 3px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 19px;
  font-weight: 700;
}
.kl-feature-card-description { margin-top: 5px; color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-feature-card-footer {
  position: relative;
  z-index: 1;
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--kl-border);
}
.kl-feature-card-metric {
  min-width: 0;
  overflow: hidden;
  color: var(--kl-meta);
  font-size: var(--kl-type-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-feature-card-action {
  flex: 0 0 auto;
  margin-left: auto;
  color: var(--kl-gold);
  font-size: var(--kl-type-xs);
  font-weight: 820;
  white-space: nowrap;
}
.kl-feature-card-action::after { content: " \u2192"; }
.kl-home-privacy {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 8px 2px;
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
  text-align: center;
}
.kl-home-privacy-icon { width: 17px; height: 17px; color: var(--kl-gold); }

:host([data-home-layout="compact"]) .kl-home-hero {
  min-height: 0;
  grid-template-columns: minmax(0, 1fr);
  margin-bottom: 12px;
  padding-block: 18px;
}
:host([data-home-layout="compact"]) .kl-home-mark,
:host([data-home-layout="compact"]) .kl-home-next,
:host([data-home-layout="compact"]) .kl-home-lead,
:host([data-home-layout="compact"]) .kl-home-section-description,
:host([data-home-layout="compact"]) .kl-feature-card-description { display: none; }
:host([data-home-layout="compact"]) .kl-feature-card {
  min-height: 112px;
  grid-template-rows: minmax(0, 1fr) auto;
}

:host([data-density="compact"]) .kl-feature-nav { gap: 4px; padding-block: 9px; }
:host([data-density="compact"]) .kl-nav-item { min-height: 52px; }
:host([data-density="compact"]) .kl-home { padding: 18px; }
:host([data-density="compact"]) .kl-home-hero { min-height: 176px; margin-bottom: 14px; padding: 19px 22px; }
:host([data-density="compact"]) .kl-home-next { padding: 15px; }
:host([data-density="compact"]) .kl-feature-card { min-height: 126px; padding: 14px; }
:host([data-density="compact"]) .kl-conversation { padding-block: 7px; }
:host([data-density="compact"]) .kl-settings-panel { padding-top: 18px; }
:host([data-density="compact"]) .kl-settings-panel-body { gap: 13px; }

:host([data-density="super-compact"]) .kl-panel {
  width: min(920px, calc(100vw - 40px));
  height: min(600px, calc(100vh - 130px));
  min-height: 380px;
  grid-template-rows: 52px minmax(0, 1fr);
  border-radius: 20px;
  background: var(--kl-panel-bg);
}
:host([data-density="super-compact"]) .kl-topbar { gap: 7px; padding-inline: 12px; }
:host([data-density="super-compact"]) .kl-brand { gap: 7px; }
:host([data-density="super-compact"]) .kl-brand-emblem { width: 32px; height: 32px; border-radius: 10px; }
:host([data-density="super-compact"]) .kl-brand-subtitle,
:host([data-density="super-compact"]) .kl-feature-page-eyebrow,
:host([data-density="super-compact"]) .kl-feature-page-subtitle,
:host([data-density="super-compact"]) .kl-settings-panel-description,
:host([data-density="super-compact"]) .kl-home-lead,
:host([data-density="super-compact"]) .kl-home-mark,
:host([data-density="super-compact"]) .kl-home-section-description,
:host([data-density="super-compact"]) .kl-feature-card-description,
:host([data-density="super-compact"]) .kl-home-privacy { display: none; }
:host([data-density="super-compact"]) .kl-finder-trigger { min-height: 34px; padding-block: 4px; }
:host([data-density="super-compact"]) .kl-icon-button { width: 34px; height: 34px; border-radius: 9px; }
:host([data-density="super-compact"]) .kl-text-button { min-height: 34px; padding: 5px 10px; border-radius: 9px; }
:host([data-density="super-compact"]) .kl-shell { grid-template-columns: 72px minmax(0, 1fr); }
:host([data-density="super-compact"]) .kl-feature-nav { gap: 3px; padding: 7px 6px; }
:host([data-density="super-compact"]) .kl-nav-item { min-height: 46px; gap: 2px; padding: 4px 2px; border-radius: 11px; }
:host([data-density="super-compact"]) .kl-nav-icon { font-size: 18px; }
:host([data-density="super-compact"]) .kl-feature-page,
:host([data-density="super-compact"]) .kl-settings-page,
:host([data-density="super-compact"]) .kl-main { background: transparent; }
:host([data-density="super-compact"]) .kl-feature-page-header { gap: 10px; padding: 10px 16px; }
:host([data-density="super-compact"]) .kl-feature-page-title { margin-top: 0; font-size: var(--kl-type-lg); }
:host([data-density="super-compact"]) .kl-feature-page-footer { min-height: 50px; padding: 7px 12px; }
:host([data-density="super-compact"]) .kl-home { padding: 11px; background: transparent; }
:host([data-density="super-compact"]) .kl-home-hero {
  min-height: 130px;
  gap: 14px;
  margin-bottom: 10px;
  padding: 13px 16px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--kl-surface), transparent 5%);
}
:host([data-density="super-compact"]) .kl-home-title { margin-block: 2px; font-size: clamp(22px, 2.7vw, 30px); }
:host([data-density="super-compact"]) .kl-home-statuses { gap: 5px; margin-top: 9px; }
:host([data-density="super-compact"]) .kl-home-status { min-height: 25px; padding: 3px 8px; }
:host([data-density="super-compact"]) .kl-home-next {
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 8px 10px;
  padding: 11px;
  border-radius: 14px;
  box-shadow: none;
}
:host([data-density="super-compact"]) .kl-home-next-icon { width: 38px; height: 38px; border-radius: 11px; font-size: 18px; }
:host([data-density="super-compact"]) .kl-home-next-title { margin-top: 1px; font-size: var(--kl-type-lg); }
:host([data-density="super-compact"]) .kl-home-next-description { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
:host([data-density="super-compact"]) .kl-home-next-footer { gap: 8px; padding-top: 7px; }
:host([data-density="super-compact"]) .kl-home-section-heading { margin-bottom: 6px; }
:host([data-density="super-compact"]) .kl-home-section-heading h2 { font-size: var(--kl-type-lg); }
:host([data-density="super-compact"]) .kl-feature-grid { gap: 7px; }
:host([data-density="super-compact"]) .kl-feature-card {
  min-height: 84px;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 6px 9px;
  padding: 9px 10px;
  border-radius: 13px;
}
:host([data-density="super-compact"]) .kl-feature-card-icon { width: 36px; height: 36px; border-radius: 10px; font-size: 17px; }
:host([data-density="super-compact"]) .kl-feature-card-title { margin-top: 0; font-size: var(--kl-type-md); }
:host([data-density="super-compact"]) .kl-feature-card-footer { gap: 7px; padding-top: 5px; }
:host([data-density="super-compact"]) .kl-layout { grid-template-columns: 270px minmax(0, 1fr); }
:host([data-density="super-compact"]) .kl-search-wrap { padding: 8px; }
:host([data-density="super-compact"]) .kl-sidebar-heading { padding: 0 8px 5px 10px; }
:host([data-density="super-compact"]) .kl-search { height: 36px; border-radius: 9px; }
:host([data-density="super-compact"]) .kl-sidebar-new-chat { width: 32px; height: 32px; }
:host([data-density="super-compact"]) .kl-conversations { padding-inline: 5px; }
:host([data-density="super-compact"]) .kl-conversation {
  grid-template-columns: 36px minmax(0, 1fr) auto;
  gap: 8px;
  padding: 5px 7px;
  border-radius: 10px;
}
:host([data-density="super-compact"]) .kl-conversation .kl-avatar { width: 36px; height: 36px; border-radius: 10px; }
:host([data-density="super-compact"]) .kl-conversation-side { gap: 2px; }
:host([data-density="super-compact"]) .kl-chat { grid-template-rows: 50px minmax(0, 1fr) auto; }
:host([data-density="super-compact"]) .kl-chat-header { gap: 8px; padding-inline: 10px; }
:host([data-density="super-compact"]) .kl-chat-header .kl-avatar { width: 36px; height: 36px; border-radius: 10px; }
:host([data-density="super-compact"]) .kl-messages { padding: 10px 12px; }
:host([data-density="super-compact"]) .kl-message-row { margin-block: 4px; }
:host([data-density="super-compact"]) .kl-message-bubble { padding: 7px 9px 6px; border-radius: 12px 12px 12px 4px; box-shadow: none; }
:host([data-density="super-compact"]) .kl-message-row[data-direction="outgoing"] .kl-message-bubble { border-radius: 12px 12px 4px 12px; }
:host([data-density="super-compact"]) .kl-message-meta { margin-top: 3px; }
:host([data-density="super-compact"]) .kl-composer { padding: 7px 9px 8px; }
:host([data-density="super-compact"]) .kl-quick-actions { gap: 5px; margin-bottom: 5px; padding-bottom: 2px; }
:host([data-density="super-compact"]) .kl-action-chip { min-height: 30px; padding: 3px 8px; }
:host([data-density="super-compact"]) .kl-composer-row { gap: 7px; }
:host([data-density="super-compact"]) .kl-composer-input { min-height: 38px; padding: 8px 10px; border-radius: 10px; }
:host([data-density="super-compact"]) .kl-send { height: 38px; min-width: 64px; }
:host([data-density="super-compact"]) .kl-composer-options { margin-top: 4px; }
:host([data-density="super-compact"]) .kl-settings-layout { grid-template-columns: 160px minmax(0, 1fr); }
:host([data-density="super-compact"]) .kl-settings-tabs { gap: 3px; padding: 8px 7px; }
:host([data-density="super-compact"]) .kl-settings-tab { min-height: 38px; gap: 7px; padding: 5px 8px; border-radius: 9px; }
:host([data-density="super-compact"]) .kl-settings-panel { padding: 13px 20px 20px; }
:host([data-density="super-compact"]) .kl-settings-panel-body { gap: 10px; }
:host([data-density="super-compact"]) .kl-settings-actions { min-height: 50px; padding: 7px 12px; }
:host([data-density="super-compact"]) .kl-setting-section { gap: 9px; }
:host([data-density="super-compact"]) .kl-setting-row,
:host([data-density="super-compact"]) .kl-setting-action-row { gap: 13px; }
:host([data-density="super-compact"]) .kl-select,
:host([data-density="super-compact"]) .kl-number-input,
:host([data-density="super-compact"]) .kl-color-input { height: 36px; }
:host([data-density="super-compact"]) .kl-color-swatch { width: 27px; height: 27px; }
:host([data-density="super-compact"]) .kl-switch { height: 36px; }
:host([data-density="super-compact"]) .kl-switch-track { inset-block: 5px; }
:host([data-density="super-compact"]) .kl-action-label,
:host([data-density="super-compact"]) .kl-action-template,
:host([data-density="super-compact"]) .kl-activity-meta { height: 35px; }
:host([data-density="super-compact"]) .kl-data-tools { gap: 12px; padding: 10px 11px 10px 14px; border-radius: 11px; }
:host([data-density="super-compact"]) .kl-roster-body { gap: 9px; padding: 10px; }
:host([data-density="super-compact"]) .kl-roster-list-pane { gap: 6px; }
:host([data-density="super-compact"]) .kl-roster-scope { min-height: 34px; }
:host([data-density="super-compact"]) .kl-roster-entry { grid-template-columns: 35px minmax(0, 1fr) auto; gap: 7px; padding: 5px; border-radius: 9px; }
:host([data-density="super-compact"]) .kl-roster-entry .kl-avatar { width: 35px; height: 35px; border-radius: 9px; }
:host([data-density="super-compact"]) .kl-roster-detail { padding: 10px; border-radius: 12px; }
:host([data-density="super-compact"]) .kl-roster-quick-actions,
:host([data-density="super-compact"]) .kl-roster-stats { margin-top: 9px; }
:host([data-density="super-compact"]) .kl-roster-notebook { gap: 7px; margin-top: 9px; padding-top: 9px; }
:host([data-density="super-compact"]) .kl-roster-note { min-height: 86px; }
:host([data-density="super-compact"]) .kl-activities-body { gap: 8px; padding: 10px 14px; }
:host([data-density="super-compact"]) .kl-activity-studio { gap: 9px; }
:host([data-density="super-compact"]) .kl-activity-target { padding: 5px; }
:host([data-density="super-compact"]) .kl-activity-card-main { padding: 7px 9px; border-radius: 9px; }
:host([data-density="super-compact"]) .kl-activity-preview { min-height: 40px; padding: 9px 11px; }

.kl-layout {
  position: relative;
  z-index: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 310px minmax(0, 1fr);
}

.kl-sidebar {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  border-right: 1px solid var(--kl-border);
  background: var(--kl-sidebar-bg);
}

.kl-search-wrap { padding: 14px; }
.kl-sidebar-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 13px 8px 16px;
  color: var(--kl-gold);
  font-size: var(--kl-type-xs);
  font-weight: 850;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.kl-sidebar-new-chat {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--kl-border);
  border-radius: 8px;
  background: var(--kl-surface-2);
  color: var(--kl-text);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}
.kl-sidebar-new-chat:hover {
  border-color: var(--kl-border-strong);
  background: var(--kl-surface-hover);
}
.kl-search,
.kl-composer-input,
.kl-number-input,
.kl-select,
.kl-action-label,
.kl-action-template,
.kl-activity-meta,
.kl-roster-note,
.kl-roster-tags {
  border: 1px solid var(--kl-border);
  outline: none;
  background: var(--kl-input-bg);
  color: var(--kl-text);
  transition: border-color 140ms ease, box-shadow 140ms ease;
}

.kl-search,
.kl-composer-input { width: 100%; }

.kl-search {
  height: 44px;
  padding: 0 13px;
  border-radius: 12px;
}

.kl-search:focus,
.kl-composer-input:focus,
.kl-number-input:focus,
.kl-select:focus,
.kl-action-label:focus,
.kl-action-template:focus,
.kl-activity-meta:focus,
.kl-roster-note:focus,
.kl-roster-tags:focus {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 30%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--kl-accent), transparent 78%);
}

.kl-conversations {
  min-height: 0;
  overflow: auto;
  padding: 0 8px 12px;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
  overscroll-behavior: contain;
  contain: layout paint;
}

.kl-conversation {
  width: 100%;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 11px;
  align-items: center;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 15px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.kl-conversation:hover { background: color-mix(in srgb, var(--kl-surface-hover), transparent 34%); }
.kl-conversation[data-active="true"] {
  border-color: color-mix(in srgb, var(--kl-accent), transparent 56%);
  background: color-mix(in srgb, var(--kl-accent), transparent 88%);
}

.kl-avatar {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px solid var(--kl-border);
  border-radius: 15px;
  background: var(--kl-avatar-bg);
  font-weight: 850;
  text-transform: uppercase;
}

.kl-conversation-main { min-width: 0; }
.kl-conversation-name-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
.kl-conversation-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 750; }
.kl-pin { width: 13px; height: 13px; color: var(--kl-gold); }
.kl-conversation-preview { overflow: hidden; color: var(--kl-muted); font-size: var(--kl-type-body); text-overflow: ellipsis; white-space: nowrap; }
.kl-conversation-side { align-self: stretch; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 5px; }
.kl-time { color: var(--kl-muted); font-size: var(--kl-type-xs); white-space: nowrap; }
.kl-unread {
  min-width: 19px;
  height: 19px;
  display: grid;
  place-items: center;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--kl-accent);
  color: var(--kl-accent-foreground);
  font-size: var(--kl-type-xs);
  font-weight: 850;
}

.kl-main {
  min-width: 0;
  min-height: 0;
  display: grid;
  background: radial-gradient(circle at 78% 4%, color-mix(in srgb, var(--kl-accent), transparent 93%), transparent 39%);
}

.kl-empty {
  place-self: center;
  width: min(340px, 80%);
  text-align: center;
}

.kl-empty-mark {
  width: 76px;
  height: 76px;
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
  border: 1px solid var(--kl-border-strong);
  border-radius: 50%;
  background:
    radial-gradient(circle at center, color-mix(in srgb, var(--kl-accent), transparent 18%) 0 32%, transparent 33%),
    var(--kl-surface);
  color: var(--kl-gold);
  font-size: 30px;
  font-weight: 900;
}

.kl-empty-title { margin: 0 0 7px; font-family: Georgia, "Times New Roman", serif; font-size: var(--kl-type-xl); font-weight: 700; }
.kl-empty-copy { margin: 0 0 18px; color: var(--kl-muted); }

.kl-chat {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: 62px minmax(0, 1fr) auto;
}

.kl-chat-header {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 16px;
  border-bottom: 1px solid var(--kl-border);
}

.kl-back { display: none; }
.kl-chat-person { min-width: 0; margin-right: auto; }
.kl-chat-name { overflow: hidden; font-size: var(--kl-type-md); font-weight: 850; text-overflow: ellipsis; white-space: nowrap; }
.kl-chat-number { color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-chat-room {
  min-width: 0;
  max-width: min(220px, 31vw);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--kl-gold);
  font-size: var(--kl-type-sm);
}
.kl-chat-room::before { content: "\xB7"; color: var(--kl-meta); }
.kl-chat-room-icon { width: 14px; height: 14px; flex: 0 0 auto; }
.kl-chat-room-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.kl-messages {
  min-height: 0;
  overflow-y: auto;
  padding: 18px;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
  overscroll-behavior: contain;
  contain: layout paint;
}

.kl-message-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 7px 0;
  content-visibility: auto;
  contain-intrinsic-size: auto 64px;
}
.kl-message-row[data-direction="outgoing"] { flex-direction: row-reverse; }
.kl-message-bubble {
  max-width: min(72%, 540px);
  padding: 10px 12px 8px;
  border: 1px solid var(--kl-border);
  border-radius: 16px 16px 16px 5px;
  background: var(--kl-surface-2);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.kl-message-row[data-direction="outgoing"] .kl-message-bubble {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 22%);
  border-radius: 16px 16px 5px 16px;
  background: var(--kl-accent);
  color: var(--kl-accent-foreground);
}
.kl-message-meta { display: flex; justify-content: flex-end; gap: 7px; margin-top: 5px; color: var(--kl-meta); font-size: var(--kl-type-xxs); }
.kl-message-row[data-direction="outgoing"] .kl-message-meta { color: color-mix(in srgb, var(--kl-accent-foreground), transparent 32%); }
.kl-message-room { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-load-older { display: flex; justify-content: center; padding: 3px 0 11px; }
.kl-load-older .kl-text-button { min-height: 34px; }

.kl-composer {
  padding: 12px 14px 14px;
  border-top: 1px solid var(--kl-border);
  background: var(--kl-composer-bg);
}

.kl-typing-indicator {
  min-height: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: -4px 2px 6px;
  color: var(--kl-muted);
  font-size: var(--kl-type-sm);
}
.kl-typing-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-typing-dots { display: inline-flex; align-items: center; gap: 3px; }
.kl-typing-dots i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--kl-gold);
  animation: kl-typing-dot 1.15s ease-in-out infinite;
}
.kl-typing-dots i:nth-child(2) { animation-delay: 120ms; }
.kl-typing-dots i:nth-child(3) { animation-delay: 240ms; }
@keyframes kl-typing-dot {
  0%, 60%, 100% { opacity: 0.35; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-2px); }
}

.kl-quick-actions {
  display: flex;
  gap: 7px;
  margin: 0 0 9px;
  overflow-x: auto;
  padding: 1px 1px 4px;
  scrollbar-width: thin;
  scrollbar-color: var(--kl-border-strong) transparent;
}
.kl-action-chip {
  min-height: 36px;
  flex: 0 0 auto;
  padding: 4px 10px;
  border: 1px solid var(--kl-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 8%);
  color: var(--kl-text);
  font-size: var(--kl-type-sm);
  font-weight: 750;
  cursor: pointer;
}
.kl-action-chip:hover { border-color: var(--kl-border-strong); background: var(--kl-surface-hover); }

.kl-composer-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: end; }
.kl-composer-input {
  min-height: 44px;
  max-height: 120px;
  padding: 11px 13px;
  resize: none;
  border-radius: 14px;
}
.kl-send { min-width: 82px; height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
.kl-send .kl-icon { width: 16px; height: 16px; }
.kl-composer-options { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 8px; color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-check { min-height: 32px; display: inline-flex; align-items: center; gap: 7px; cursor: pointer; }
.kl-check input { accent-color: var(--kl-accent); }
.kl-counter[data-over="true"] { color: var(--kl-danger); font-weight: 750; }

.kl-dialog {
  width: min(460px, calc(100vw - 32px));
  max-height: min(760px, calc(100vh - 32px));
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--kl-border);
  border-radius: 20px;
  background: var(--kl-panel-art), var(--kl-panel-bg);
  color: var(--kl-text);
  box-shadow: var(--kl-shadow);
}
.kl-dialog::backdrop { background: rgba(0, 0, 0, 0.68); }
.kl-dialog-header { display: flex; align-items: center; gap: 10px; padding: 16px 18px; border-bottom: 1px solid var(--kl-border); background: var(--kl-topbar-bg); }
.kl-dialog-heading { min-width: 0; margin-right: auto; }
.kl-dialog-title { margin-right: auto; font-family: Georgia, "Times New Roman", serif; font-size: var(--kl-type-lg); font-weight: 700; }
.kl-dialog-subtitle { margin-top: 2px; color: var(--kl-muted); font-size: var(--kl-type-xs); letter-spacing: 0.035em; }
.kl-dialog-body { display: grid; gap: 18px; max-height: calc(100vh - 170px); padding: 18px; overflow: auto; }
.kl-setting-section { display: grid; gap: 14px; }
.kl-setting-section + .kl-setting-section { padding-top: 17px; border-top: 1px solid var(--kl-border); }
.kl-setting-section-title { color: var(--kl-gold); font-size: var(--kl-type-xs); font-weight: 850; letter-spacing: 0.14em; text-transform: uppercase; }
.kl-setting-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.kl-setting-copy { min-width: 0; }
.kl-setting-name { font-weight: 750; }
.kl-setting-help { margin-top: 2px; color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-number-input { width: 90px; height: 44px; padding: 0 10px; border-radius: 11px; }
.kl-select { width: 156px; height: 44px; padding: 0 10px; border-radius: 11px; }
.kl-color-control { display: flex; align-items: center; gap: 8px; }
.kl-color-presets { display: flex; align-items: center; gap: 5px; }
.kl-color-swatch {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 2px solid var(--kl-surface);
  border-radius: 50%;
  outline: 1px solid var(--kl-border);
  background: var(--kl-swatch);
  cursor: pointer;
}
.kl-color-swatch:hover { outline-color: var(--kl-border-strong); transform: scale(1.08); }
.kl-color-swatch[data-selected="true"] {
  outline: 2px solid var(--kl-text);
  outline-offset: 2px;
}
.kl-color-input {
  width: 46px;
  height: 44px;
  padding: 3px;
  border: 1px solid var(--kl-border);
  border-radius: 10px;
  background: var(--kl-input-bg);
  cursor: pointer;
}
.kl-switch { width: 48px; height: 44px; position: relative; flex: 0 0 auto; }
.kl-switch input { position: absolute; opacity: 0; pointer-events: none; }
.kl-switch-track { position: absolute; inset: 9px 0; border: 1px solid var(--kl-border); border-radius: 999px; background: var(--kl-surface-hover); cursor: pointer; transition: background 140ms ease; }
.kl-switch-track::after { content: ""; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff8eb; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.24); transition: transform 140ms ease; }
.kl-switch input:checked + .kl-switch-track { background: var(--kl-accent); }
.kl-switch input:checked + .kl-switch-track::after { background: var(--kl-accent-foreground); transform: translateX(22px); }
.kl-dialog-actions { display: flex; justify-content: flex-end; gap: 9px; padding: 0 18px 18px; }

.kl-action-editor { display: grid; gap: 8px; }
.kl-action-editor-row { display: grid; grid-template-columns: 100px minmax(0, 1fr) 40px; gap: 7px; align-items: center; }
.kl-action-label,
.kl-action-template,
.kl-activity-meta { width: 100%; height: 40px; min-width: 0; padding: 0 9px; border-radius: 10px; }
.kl-remove-action { width: 40px; height: 40px; color: var(--kl-danger); }
.kl-add-action { justify-self: start; }
.kl-activity-editor-row { grid-template-columns: minmax(0, 1fr) 42px 40px; align-items: start; padding: 8px; border: 1px solid var(--kl-border); border-radius: 12px; background: color-mix(in srgb, var(--kl-surface-2), transparent 28%); }
.kl-activity-editor-fields { min-width: 0; display: grid; grid-template-columns: minmax(120px, 1fr) minmax(100px, 0.7fr) minmax(120px, 0.85fr); gap: 7px; }
.kl-activity-editor-fields .kl-action-template { grid-column: 1 / -1; }
.kl-activity-editor-favorite { width: 40px; height: 40px; position: relative; display: grid; place-items: center; border: 1px solid var(--kl-border); border-radius: 10px; background: var(--kl-input-bg); color: var(--kl-muted); cursor: pointer; }
.kl-activity-editor-favorite input { position: absolute; opacity: 0; pointer-events: none; }
.kl-activity-editor-favorite:has(input:checked) { border-color: color-mix(in srgb, var(--kl-gold), transparent 25%); background: color-mix(in srgb, var(--kl-gold), transparent 84%); color: var(--kl-gold); }
.kl-activity-editor-favorite:focus-within { box-shadow: 0 0 0 3px color-mix(in srgb, var(--kl-accent), transparent 78%); }

.kl-new-chat-dialog { width: min(480px, calc(100vw - 32px)); }
.kl-new-chat-body { gap: 12px; }
.kl-new-chat-query { flex: 0 0 auto; }
.kl-contact-heading { color: var(--kl-gold); font-size: var(--kl-type-xs); font-weight: 850; letter-spacing: 0.14em; text-transform: uppercase; }
.kl-contact-results { min-height: 120px; max-height: min(430px, calc(100vh - 300px)); overflow-y: auto; }
.kl-contact {
  width: 100%;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 11px;
  align-items: center;
  padding: 9px;
  border: 1px solid transparent;
  border-radius: 13px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.kl-contact:hover { border-color: var(--kl-border); background: var(--kl-surface-hover); }
.kl-contact .kl-avatar { width: 42px; height: 42px; border-radius: 13px; }
.kl-contact-copy { min-width: 0; }
.kl-contact-name { overflow: hidden; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.kl-contact-number,
.kl-contact-empty { color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-contact-empty { padding: 18px 8px; text-align: center; }

.kl-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.kl-finder-dialog { width: min(680px, calc(100vw - 32px)); }
.kl-finder-body {
  position: relative;
  min-height: 360px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  padding: 16px;
}
.kl-finder-input-wrap { position: relative; }
.kl-finder-search-icon {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 15px;
  color: var(--kl-gold);
  width: 21px;
  height: 21px;
  pointer-events: none;
  transform: translateY(-50%);
}
.kl-finder-query {
  width: 100%;
  height: 52px;
  padding: 0 42px;
  border: 1px solid var(--kl-border-strong);
  border-radius: 15px;
  background: var(--kl-input-bg);
  color: var(--kl-text);
  font-size: var(--kl-type-body);
  outline: none;
}
.kl-finder-query:focus {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 30%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--kl-accent), transparent 78%);
}
.kl-finder-results {
  min-height: 260px;
  max-height: min(480px, calc(100vh - 240px));
  display: grid;
  align-content: start;
  gap: 4px;
  overflow-y: auto;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-finder-result {
  width: 100%;
  min-width: 0;
  min-height: 64px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 11px;
  align-items: center;
  padding: 9px 10px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.kl-finder-result:hover,
.kl-finder-result[data-selected="true"] {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 25%);
  background: color-mix(in srgb, var(--kl-accent), transparent 87%);
}
.kl-finder-result-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid var(--kl-border);
  border-radius: 13px;
  background: var(--kl-surface-2);
  color: var(--kl-gold);
}
.kl-finder-result-symbol { width: 20px; height: 20px; }
.kl-finder-result-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.kl-finder-result-title {
  overflow: hidden;
  font-weight: 820;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-finder-result-detail {
  overflow: hidden;
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-finder-result-category {
  padding: 3px 7px;
  border: 1px solid var(--kl-border);
  border-radius: 999px;
  color: var(--kl-meta);
  font-size: var(--kl-type-xxs);
  font-weight: 850;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}
.kl-finder-loading,
.kl-finder-empty {
  min-height: 220px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 5px;
  padding: 24px;
  color: var(--kl-muted);
  font-size: var(--kl-type-sm);
  text-align: center;
}
.kl-finder-empty-title { color: var(--kl-text); font-size: var(--kl-type-body); font-weight: 820; }
.kl-finder-footer {
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 16px;
  border-top: 1px solid var(--kl-border);
  background: var(--kl-topbar-bg);
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
}
.kl-finder-keys { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }

.kl-roster-body {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(280px, 0.78fr) minmax(360px, 1.22fr);
  gap: 14px;
  padding: 18px;
  overflow: hidden;
}
.kl-roster-list-pane {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 9px;
}
.kl-roster-scopes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  padding: 4px;
  border: 1px solid var(--kl-border);
  border-radius: 12px;
  background: var(--kl-input-bg);
}
.kl-roster-scope {
  min-height: 40px;
  padding: 4px 7px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
  font-weight: 800;
  cursor: pointer;
}
.kl-roster-scope:hover { color: var(--kl-text); background: var(--kl-surface-hover); }
.kl-roster-scope[data-active="true"] {
  border-color: var(--kl-border-strong);
  background: var(--kl-surface-2);
  color: var(--kl-text);
}
.kl-roster-list {
  min-height: 0;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid var(--kl-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--kl-input-bg), transparent 18%);
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
  overscroll-behavior: contain;
  contain: layout paint;
}
.kl-roster-empty,
.kl-roster-detail-empty {
  display: grid;
  min-height: 160px;
  place-items: center;
  padding: 18px;
  color: var(--kl-muted);
  font-size: var(--kl-type-body);
  text-align: center;
}
.kl-roster-entry {
  width: 100%;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 13px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.kl-roster-entry:hover { background: var(--kl-surface-hover); }
.kl-roster-entry[data-selected="true"] {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 28%);
  background: color-mix(in srgb, var(--kl-accent), transparent 87%);
}
.kl-roster-entry .kl-avatar { width: 42px; height: 42px; border-radius: 13px; }
.kl-roster-entry-copy { min-width: 0; }
.kl-roster-entry-name-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
.kl-roster-entry-name { overflow: hidden; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.kl-roster-entry-badges { display: flex; align-items: center; gap: 4px; flex: 0 0 auto; }
.kl-roster-live,
.kl-roster-friend {
  padding: 1px 4px;
  border-radius: 999px;
  font-size: var(--kl-type-xxs);
  font-weight: 900;
  letter-spacing: 0.08em;
}
.kl-roster-live { background: rgba(104, 211, 145, 0.14); color: #68d391; }
.kl-roster-friend { background: color-mix(in srgb, var(--kl-gold), transparent 84%); color: var(--kl-gold); }
.kl-roster-favorite { width: 13px; height: 13px; color: var(--kl-gold); }
.kl-roster-entry-preview {
  overflow: hidden;
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-roster-entry-time { color: var(--kl-muted); font-size: var(--kl-type-xxs); }
.kl-roster-detail {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 15px;
  border: 1px solid var(--kl-border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--kl-surface), transparent 12%);
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-roster-identity { display: grid; grid-template-columns: 54px minmax(0, 1fr) auto; gap: 12px; align-items: center; }
.kl-roster-avatar { width: 54px; height: 54px; border-radius: 17px; font-size: 17px; }
.kl-roster-identity-copy { min-width: 0; }
.kl-roster-name { overflow: hidden; font-family: Georgia, "Times New Roman", serif; font-size: 19px; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.kl-roster-number { color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-roster-star { color: var(--kl-gold); font-size: 20px; }
.kl-roster-quick-actions { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; margin-top: 15px; }
.kl-roster-quick-actions .kl-text-button { min-width: 0; padding-inline: 7px; font-size: var(--kl-type-sm); }
.kl-roster-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; margin-top: 15px; }
.kl-roster-stat { min-width: 0; padding: 9px 10px; border: 1px solid var(--kl-border); border-radius: 11px; background: var(--kl-surface-2); }
.kl-roster-stat-label { color: var(--kl-muted); font-size: var(--kl-type-xxs); font-weight: 850; letter-spacing: 0.08em; text-transform: uppercase; }
.kl-roster-stat-value { margin-top: 3px; overflow: hidden; font-size: var(--kl-type-sm); font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.kl-roster-notebook { display: grid; gap: 10px; margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--kl-border); }
.kl-roster-field-label { display: grid; gap: 5px; color: var(--kl-gold); font-size: var(--kl-type-xxs); font-weight: 850; letter-spacing: 0.09em; text-transform: uppercase; }
.kl-roster-note,
.kl-roster-tags { width: 100%; min-width: 0; padding: 9px 11px; border-radius: 11px; text-transform: none; }
.kl-roster-tags { height: 38px; }
.kl-roster-note { min-height: 120px; max-height: 230px; resize: vertical; line-height: 1.45; }
.kl-roster-note-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
.kl-roster-note-actions .kl-setting-help { margin-right: auto; }
.kl-roster-privacy { align-self: center; margin-right: auto; color: var(--kl-muted); font-size: var(--kl-type-xs); }

.kl-activities-body {
  min-width: 0;
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 13px;
  padding: 18px 22px;
  overflow-y: auto;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-activity-status {
  padding: 9px 11px;
  border: 1px solid var(--kl-border);
  border-radius: 11px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 20%);
  color: var(--kl-muted);
  font-size: var(--kl-type-sm);
}
.kl-activity-status[data-kind="ready"] { color: #68d391; }
.kl-activity-status[data-kind="error"] { color: var(--kl-danger); }
.kl-activity-studio {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(220px, 0.82fr) minmax(260px, 1.18fr);
  gap: 14px;
}
.kl-activity-pane { min-width: 0; display: grid; align-content: start; gap: 9px; }
.kl-activity-pane-title {
  color: var(--kl-gold);
  font-size: var(--kl-type-xs);
  font-weight: 850;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.kl-activity-library-controls { display: grid; grid-template-columns: minmax(0, 1fr) minmax(145px, 0.65fr); gap: 7px; }
.kl-activity-filter { width: 100%; }
.kl-activity-targets,
.kl-activity-library {
  min-height: 180px;
  max-height: min(330px, calc(100vh - 390px));
  overflow-y: auto;
  padding: 4px;
  border: 1px solid var(--kl-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--kl-input-bg), transparent 20%);
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-activity-target {
  width: 100%;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  padding: 7px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.kl-activity-target:hover { background: var(--kl-surface-hover); }
.kl-activity-target[data-selected="true"] {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 28%);
  background: color-mix(in srgb, var(--kl-accent), transparent 87%);
}
.kl-activity-target .kl-avatar { width: 40px; height: 40px; border-radius: 12px; }
.kl-activity-library { display: grid; align-content: start; gap: 7px; }
.kl-activity-card {
  position: relative;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 38px;
  gap: 4px;
  border: 1px solid var(--kl-border);
  border-radius: 12px;
  background: var(--kl-surface-2);
  overflow: hidden;
}
.kl-activity-card-main {
  min-width: 0;
  padding: 10px 11px;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.kl-activity-card:hover { border-color: var(--kl-border-strong); }
.kl-activity-card-main:hover { background: var(--kl-surface-hover); }
.kl-activity-card-main[data-selected="true"] {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 32%);
  background: color-mix(in srgb, var(--kl-accent), transparent 84%);
  box-shadow: inset 3px 0 var(--kl-accent);
}
.kl-activity-card-heading { min-width: 0; display: flex; align-items: baseline; gap: 8px; }
.kl-activity-card-label { font-weight: 800; }
.kl-activity-card-meta { min-width: 0; overflow: hidden; color: var(--kl-meta); font-size: var(--kl-type-xs); text-overflow: ellipsis; white-space: nowrap; }
.kl-activity-card-template {
  margin-top: 3px;
  overflow: hidden;
  color: var(--kl-muted);
  font-size: var(--kl-type-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-activity-favorite { width: 34px; height: 34px; align-self: center; color: var(--kl-muted); }
.kl-activity-favorite[data-active="true"] { color: var(--kl-gold); }
.kl-activity-preview-wrap { display: grid; gap: 7px; }
.kl-activity-preview {
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid var(--kl-border-strong);
  border-radius: 13px;
  background: linear-gradient(145deg, color-mix(in srgb, var(--kl-accent), transparent 91%), var(--kl-surface));
  overflow-wrap: anywhere;
  font-style: italic;
}
.kl-activity-actions .kl-feature-page-footnote { margin-right: auto; }

.kl-toast {
  position: absolute;
  z-index: 3;
  right: 16px;
  bottom: 16px;
  max-width: 320px;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 8px 13px;
  border: 1px solid var(--kl-border-strong);
  border-radius: 12px;
  background: var(--kl-surface-hover);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.28);
  font-size: var(--kl-type-body);
  animation: kl-enter 140ms ease-out;
}
.kl-toast[data-kind="error"] { border-color: color-mix(in srgb, var(--kl-danger), transparent 44%); color: var(--kl-danger); }
.kl-toast-message { min-width: 0; overflow-wrap: anywhere; }
.kl-toast-dismiss {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.kl-toast-dismiss:hover { background: color-mix(in srgb, var(--kl-surface-2), transparent 8%); }

button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--kl-accent), var(--kl-gold) 28%);
  outline-offset: 2px;
}
.kl-switch input:focus-visible + .kl-switch-track {
  outline: 2px solid color-mix(in srgb, var(--kl-accent), var(--kl-gold) 28%);
  outline-offset: 2px;
}

@media (max-width: 720px) {
  .kl-panel,
  .kl-panel[data-side="left"] {
    inset:
      max(8px, env(safe-area-inset-top))
      max(8px, env(safe-area-inset-right))
      max(8px, env(safe-area-inset-bottom))
      max(8px, env(safe-area-inset-left));
    width: auto;
    height: auto;
    min-height: 0;
    border-radius: 20px;
  }

  .kl-shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) 64px;
  }
  .kl-workspace { grid-row: 1; }
  .kl-feature-nav {
    grid-row: 2;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
    padding: 5px 7px calc(5px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--kl-border);
    border-right: 0;
    background: var(--kl-composer-bg);
  }
  .kl-nav-item {
    min-width: 0;
    min-height: 51px;
    gap: 2px;
    padding: 4px 2px;
    border-radius: 12px;
  }
  .kl-nav-item[data-target="settings"] { display: none; }
  .kl-nav-item[data-active="true"] { box-shadow: inset 0 -3px var(--kl-accent); }
  .kl-nav-icon { font-size: 18px; }
  .kl-nav-label { font-size: var(--kl-type-xs); }
  .kl-roster-count { top: 1px; right: calc(50% - 25px); }
  .kl-home { padding: 18px; }
  .kl-home-hero {
    min-height: 0;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    padding: 21px;
    border-radius: 19px;
  }
  .kl-home-mark { left: auto; right: 24px; bottom: auto; top: 18px; width: 110px; height: 110px; }
  .kl-home-emblem { inset: 11px; border-radius: 28px; }
  .kl-home-title { font-size: clamp(23px, 7vw, 31px); }
  .kl-home-section-heading { align-items: flex-start; flex-direction: column; gap: 2px; }
  .kl-home-section-heading p { text-align: left; }
  .kl-feature-card { min-height: 142px; padding: 15px; }
  .kl-layout { grid-template-columns: minmax(0, 1fr); }
  .kl-sidebar { width: auto; border-right: 0; }
  .kl-panel[data-mobile-view="list"] .kl-main { display: none; }
  .kl-panel[data-mobile-view="chat"] .kl-sidebar { display: none; }
  .kl-panel[data-mobile-view="chat"] .kl-main { display: grid; }
  .kl-back { display: grid; }
  .kl-icon-button { width: 44px; height: 44px; }
  .kl-text-button { min-height: 44px; }
  .kl-sidebar-new-chat { width: 44px; height: 44px; }
  .kl-action-chip { min-height: 40px; }
  .kl-search-wrap { padding: 12px; }
  .kl-conversation { grid-template-columns: 44px minmax(0, 1fr) auto; gap: 10px; padding: 10px; }
  .kl-brand-subtitle { display: none; }
  .kl-topbar { padding-left: 12px; }
  .kl-finder-trigger { width: 44px; min-height: 44px; justify-content: center; padding: 0; }
  .kl-finder-trigger-label,
  .kl-finder-shortcut { display: none; }
  .kl-topbar-settings { display: grid; }
  .kl-topbar .kl-icon-button { width: 44px; height: 44px; }
  .kl-chat-header { padding: 0 12px; }
  .kl-messages { padding: 14px 12px; }
  .kl-message-bubble { max-width: 88%; }
  .kl-composer { padding: 10px 10px calc(10px + env(safe-area-inset-bottom)); }
  .kl-composer-row { grid-template-columns: minmax(0, 1fr) 48px; }
  .kl-send { min-width: 48px; width: 48px; }
  .kl-send-label { display: none; }
  .kl-setting-row { gap: 14px; }
  .kl-setting-help { max-width: 230px; }
  .kl-action-editor-row { grid-template-columns: 82px minmax(0, 1fr) 40px; }
  .kl-activity-editor-row { grid-template-columns: minmax(0, 1fr) 44px 44px; }
  .kl-activity-editor-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kl-activity-editor-fields .kl-action-template { grid-column: 1 / -1; }
  .kl-feature-page-header { padding: 14px 16px 13px; }
  .kl-feature-page-footer { min-height: 60px; padding: 8px 12px; }
  .kl-activities-body { padding: 14px; }
  .kl-activity-studio { grid-template-columns: minmax(0, 1fr); }
  .kl-activity-targets,
  .kl-activity-library { min-height: 130px; max-height: 190px; }
  .kl-roster-body {
    min-height: 0;
    grid-template-columns: minmax(0, 1fr);
    padding: 12px;
    overflow-y: auto;
  }
  .kl-roster-list-pane { min-height: 270px; }
  .kl-roster-list { max-height: 235px; }
  .kl-roster-detail { overflow: visible; }
  .kl-roster-privacy { display: none; }
  .kl-settings-layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }
  .kl-settings-tabs {
    flex-direction: row;
    gap: 5px;
    padding: 7px 9px;
    overflow-x: auto;
    overflow-y: hidden;
    border-right: 0;
    border-bottom: 1px solid var(--kl-border);
    scrollbar-width: thin;
  }
  .kl-settings-tab {
    width: auto;
    min-height: 44px;
    flex: 0 0 auto;
    padding-inline: 11px;
  }
  .kl-settings-tab[data-active="true"] { box-shadow: inset 0 -3px var(--kl-accent); }
  .kl-settings-panel { padding: 18px 18px 28px; }
  .kl-settings-actions { min-height: 60px; padding: 8px 12px; }
  .kl-toast { right: 12px; bottom: 76px; max-width: calc(100% - 24px); }
  .kl-finder-dialog {
    width: calc(100vw - 16px);
    max-height: calc(100vh - 16px);
    border-radius: 17px;
  }
  .kl-finder-body { min-height: 300px; padding: 12px; }
  .kl-finder-results { min-height: 210px; max-height: calc(100vh - 230px); }
  .kl-finder-footer { padding-inline: 12px; }
}

@media (max-width: 420px) {
  .kl-brand-title { font-size: 14px; }
  .kl-brand-emblem { width: 34px; height: 34px; }
  .kl-topbar { gap: 7px; padding-right: 10px; }
  .kl-topbar-context { display: none; }
  .kl-icon-button { width: 44px; height: 44px; }
  .kl-home { padding: 12px; }
  .kl-home-hero { min-height: 0; grid-template-columns: minmax(0, 1fr); margin-bottom: 10px; padding: 18px; }
  .kl-home-mark { display: none; }
  .kl-home-next { grid-template-columns: 42px minmax(0, 1fr); gap: 11px; padding: 14px; }
  .kl-home-next-icon { width: 42px; height: 42px; border-radius: 13px; font-size: 19px; }
  .kl-home-next-footer { align-items: stretch; flex-direction: column; }
  .kl-home-next-button { width: 100%; }
  .kl-home-lead { font-size: var(--kl-type-sm); }
  .kl-home-statuses { margin-top: 13px; }
  .kl-home-status { max-width: 100%; }
  .kl-home-status-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .kl-feature-grid { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .kl-feature-card { min-height: 126px; grid-template-columns: 42px minmax(0, 1fr); padding: 13px; }
  .kl-feature-card-icon { width: 42px; height: 42px; border-radius: 13px; font-size: 19px; }
  .kl-feature-card-title { font-size: var(--kl-type-lg); }
  .kl-home-privacy { padding-bottom: 8px; }
  .kl-color-control { align-items: flex-end; flex-direction: column; }
  .kl-conversation-side { max-width: 44px; }
  .kl-setting-row { align-items: flex-start; }
  .kl-setting-action-row { align-items: flex-start; }
  .kl-select { width: 136px; }
  .kl-action-editor-row { grid-template-columns: 72px minmax(0, 1fr) 40px; }
  .kl-activity-editor-row { grid-template-columns: minmax(0, 1fr) 44px 44px; }
  .kl-activity-editor-fields { grid-template-columns: minmax(0, 1fr); }
  .kl-activity-editor-fields .kl-action-template { grid-column: auto; }
  .kl-activity-library-controls { grid-template-columns: minmax(0, 1fr); }
  .kl-activity-library-controls .kl-activity-filter { width: 100%; }
  .kl-activity-card { grid-template-columns: minmax(0, 1fr) 44px; }
  .kl-activity-favorite { width: 44px; height: 44px; }
  .kl-activity-actions { flex-wrap: wrap; }
  .kl-activity-actions .kl-feature-page-footnote { width: 100%; margin-right: 0; }
  .kl-settings-local-note { display: none; }
  .kl-settings-panel { padding-inline: 12px; }
  .kl-settings-panel-description { margin-bottom: 16px; }
  .kl-settings-panel-body { gap: 14px; }
  .kl-data-tools { align-items: stretch; flex-direction: column; gap: 10px; }
  .kl-data-tools-actions { width: 100%; }
  .kl-data-tools-actions .kl-text-button { min-width: 0; flex: 1; }
  .kl-activity-data-actions .kl-activity-pack-select { width: 100%; flex: 1 0 100%; }
  .kl-feature-page-subtitle { max-width: 260px; }
  .kl-roster-quick-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kl-roster-stats { grid-template-columns: minmax(0, 1fr); }
  .kl-roster-stat-value { white-space: normal; }
  .kl-finder-dialog .kl-dialog-header { padding-inline: 14px; }
  .kl-finder-query { height: 48px; padding-inline: 40px 12px; }
  .kl-finder-result { grid-template-columns: 38px minmax(0, 1fr) auto; gap: 9px; padding: 8px; }
  .kl-finder-result-icon { width: 38px; height: 38px; border-radius: 12px; }
  .kl-finder-result-category { max-width: 82px; overflow: hidden; text-overflow: ellipsis; }
  .kl-finder-footer > span:first-child { display: none; }
  .kl-finder-footer { justify-content: center; }
}

@media (max-width: 720px) {
  :host([data-density="super-compact"]) .kl-panel,
  :host([data-density="super-compact"]) .kl-panel[data-side="left"] {
    inset:
      max(8px, env(safe-area-inset-top))
      max(8px, env(safe-area-inset-right))
      max(8px, env(safe-area-inset-bottom))
      max(8px, env(safe-area-inset-left));
    width: auto;
    height: auto;
    min-height: 0;
  }
  :host([data-density="super-compact"]) .kl-shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) 60px;
  }
  :host([data-density="super-compact"]) .kl-layout { grid-template-columns: minmax(0, 1fr); }
  :host([data-density="super-compact"]) .kl-settings-layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }
  :host([data-density="super-compact"]) .kl-home { padding: 9px; }
  :host([data-density="super-compact"]) .kl-home-hero { min-height: 0; gap: 10px; margin-bottom: 7px; padding: 12px; border-radius: 14px; }
  :host([data-density="super-compact"]) .kl-home-next { padding: 9px; }
  :host([data-density="super-compact"]) .kl-home-next-description { display: none; }
  :host([data-density="super-compact"]) .kl-feature-grid { gap: 6px; }
  :host([data-density="super-compact"]) .kl-feature-card { min-height: 76px; padding: 9px; border-radius: 12px; }
  :host([data-density="super-compact"]) .kl-feature-page-header { padding: 9px 12px; }
  :host([data-density="super-compact"]) .kl-settings-panel { padding: 12px 12px 20px; }
  :host([data-density="super-compact"]) .kl-settings-panel-body { gap: 10px; }
  :host([data-density="super-compact"]) .kl-settings-tab { min-height: 44px; }
  :host([data-density="super-compact"]) .kl-roster-body { padding: 9px; }
  :host([data-density="super-compact"]) .kl-activities-body { padding: 9px; }
  :host([data-density="super-compact"]) .kl-icon-button { width: 44px; height: 44px; }
  :host([data-density="super-compact"]) .kl-text-button { min-height: 44px; }
  :host([data-density="super-compact"]) .kl-search,
  :host([data-density="super-compact"]) .kl-select,
  :host([data-density="super-compact"]) .kl-number-input,
  :host([data-density="super-compact"]) .kl-color-input { height: 44px; }
}

/* KikiLink presence, media, and contextual chat tools */
.kl-presence-dot {
  width: 9px;
  height: 9px;
  flex: 0 0 auto;
  display: inline-block;
  border: 2px solid var(--kl-panel-bg);
  border-radius: 999px;
  background: #6e6a66;
  box-shadow: 0 0 0 1px color-mix(in srgb, currentColor, transparent 62%);
}
.kl-presence-dot[data-status="online"] { background: #39c884; color: #39c884; }
.kl-presence-dot[data-status="idle"] { background: #e6ad45; color: #e6ad45; }
.kl-presence-dot[data-status="dnd"] { background: #e55365; color: #e55365; }
.kl-presence-dot[data-status="offline"],
.kl-presence-dot[data-status="unknown"] { background: #77716c; color: #77716c; }
.kl-avatar-wrap { position: relative; width: fit-content; flex: 0 0 auto; }
.kl-avatar-wrap > .kl-presence-dot {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 13px;
  height: 13px;
  border-width: 3px;
}
.kl-presence-trigger {
  min-width: 0;
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  border: 1px solid var(--kl-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 18%);
  color: var(--kl-muted);
  font-size: var(--kl-type-sm);
  font-weight: 760;
  cursor: pointer;
}
.kl-presence-trigger:hover { border-color: var(--kl-border-strong); color: var(--kl-text); }
.kl-home-presence {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.kl-presence-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.kl-presence-option {
  min-width: 0;
  min-height: 72px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 11px;
  border: 1px solid var(--kl-border);
  border-radius: 14px;
  background: var(--kl-surface);
  color: var(--kl-text);
  text-align: left;
  cursor: pointer;
}
.kl-presence-option:hover { border-color: var(--kl-border-strong); background: var(--kl-surface-2); }
.kl-presence-option[data-active="true"] {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 24%);
  background: color-mix(in srgb, var(--kl-accent), transparent 90%);
}
.kl-presence-option > .kl-presence-dot { width: 13px; height: 13px; border: 0; }
.kl-presence-option-copy { min-width: 0; display: grid; gap: 2px; }
.kl-presence-option-title { font-weight: 820; }
.kl-presence-option-help { color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-presence-option-check { opacity: 0; color: var(--kl-gold); font-weight: 900; }
.kl-presence-option[data-active="true"] .kl-presence-option-check { opacity: 1; }
.kl-presence-field { display: grid; gap: 7px; }
.kl-presence-field-label { font-size: var(--kl-type-sm); font-weight: 800; }
.kl-presence-message { width: 100%; }
.kl-presence-caveat {
  display: flex;
  gap: 9px;
  padding: 10px 11px;
  border: 1px solid var(--kl-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--kl-gold), transparent 94%);
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
}
.kl-chat-subline { min-width: 0; display: flex; align-items: center; gap: 9px; }
.kl-chat-presence,
.kl-roster-detail-presence {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--kl-muted);
  font-size: var(--kl-type-sm);
}
.kl-chat-presence::before { content: "\xB7"; color: var(--kl-meta); }
.kl-presence-note { min-width: 0; overflow: hidden; color: var(--kl-muted); text-overflow: ellipsis; white-space: nowrap; }
.kl-roster-detail-presence { margin-top: 3px; }
.kl-roster-presence-label {
  padding: 2px 5px;
  border-radius: 999px;
  background: color-mix(in srgb, #77716c, transparent 84%);
  color: var(--kl-muted);
  font-size: var(--kl-type-xxs);
  font-weight: 850;
}
.kl-roster-presence-label[data-status="online"] { background: color-mix(in srgb, #39c884, transparent 84%); color: #58d99a; }
.kl-roster-presence-label[data-status="idle"] { background: color-mix(in srgb, #e6ad45, transparent 84%); color: #efbf67; }
.kl-roster-presence-label[data-status="dnd"] { background: color-mix(in srgb, #e55365, transparent 84%); color: #ff8795; }
.kl-roster-presence-label[data-status="offline"] { opacity: 0.72; }
.kl-profile-more { font-size: 11px; letter-spacing: -1px; }
.kl-profile-menu-target { -webkit-touch-callout: none; }
.kl-profile-menu {
  position: fixed;
  z-index: 2147483100;
  width: min(300px, calc(100vw - 16px));
  max-height: min(560px, calc(100vh - 16px));
  overflow: auto;
  padding: 7px;
  border: 1px solid var(--kl-border-strong);
  border-radius: 17px;
  background: var(--kl-panel-art), var(--kl-panel-bg);
  color: var(--kl-text);
  box-shadow: 0 20px 58px rgba(0, 0, 0, 0.58);
}
.kl-profile-menu-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 11px;
  align-items: center;
  padding: 9px 9px 11px;
  border-bottom: 1px solid var(--kl-border);
}
.kl-profile-menu-header .kl-avatar { width: 40px; height: 40px; border-radius: 13px; }
.kl-profile-menu-identity { min-width: 0; display: grid; gap: 2px; }
.kl-profile-menu-identity > strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-profile-menu-identity > span { display: flex; align-items: center; gap: 5px; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-profile-native-name { overflow: hidden; color: var(--kl-muted); font-size: var(--kl-type-xxs); text-overflow: ellipsis; white-space: nowrap; }
.kl-profile-menu-group { display: grid; gap: 2px; padding: 6px 0; }
.kl-profile-menu-group + .kl-profile-menu-group { border-top: 1px solid var(--kl-border); }
.kl-profile-menu-action {
  width: 100%;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  padding: 7px 8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--kl-text);
  text-align: left;
  cursor: pointer;
}
.kl-profile-menu-action:hover { background: var(--kl-surface-2); }
.kl-profile-menu-action:disabled { opacity: 0.42; cursor: not-allowed; }
.kl-profile-menu-icon { display: grid; place-items: center; color: var(--kl-gold); }
.kl-profile-action-icon { width: 17px; height: 17px; }
.kl-profile-menu-group--danger .kl-profile-menu-action,
.kl-profile-menu-group--danger .kl-profile-menu-icon { color: var(--kl-danger); }
.kl-profile-menu-copy { min-width: 0; display: grid; gap: 1px; }
.kl-profile-menu-label { font-size: var(--kl-type-body); font-weight: 780; }
.kl-profile-menu-help { overflow: hidden; color: var(--kl-muted); font-size: var(--kl-type-xxs); text-overflow: ellipsis; white-space: nowrap; }
.kl-composer-row { grid-template-columns: auto minmax(0, 1fr) auto; }
.kl-attach-image { width: 44px; height: 44px; border-radius: 13px; color: var(--kl-gold); }
.kl-image-compose-preview {
  min-height: 62px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px;
  border: 1px dashed var(--kl-border-strong);
  border-radius: 13px;
  background: var(--kl-surface);
  color: var(--kl-muted);
}
.kl-image-compose-preview[data-state="ready"] { border-style: solid; border-color: color-mix(in srgb, #39c884, transparent 36%); }
.kl-image-compose-preview[data-state="error"] { border-style: solid; border-color: color-mix(in srgb, var(--kl-danger), transparent 38%); color: var(--kl-danger); }
.kl-image-compose-icon { width: 30px; height: 30px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 9px; background: var(--kl-surface-2); font-weight: 900; }
.kl-image-compose-preview > span:last-child { min-width: 0; display: grid; gap: 2px; }
.kl-image-compose-preview small { overflow: hidden; color: var(--kl-muted); text-overflow: ellipsis; white-space: nowrap; }
.kl-image-upload-note { margin: -4px 0 0; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-message-content { white-space: pre-wrap; }
.kl-message-link { color: #efc56c; text-decoration: underline; text-decoration-color: color-mix(in srgb, currentColor, transparent 48%); text-underline-offset: 2px; }
.kl-message-row[data-direction="outgoing"] .kl-message-link { color: var(--kl-accent-foreground); }
.kl-message-media { display: grid; gap: 7px; margin-top: 8px; }
.kl-image-card { min-width: 210px; margin: 0; overflow: hidden; border: 1px solid color-mix(in srgb, var(--kl-border-strong), transparent 12%); border-radius: 12px; background: var(--kl-surface); color: var(--kl-text); }
.kl-image-preview { min-height: 150px; display: grid; place-items: center; align-content: center; gap: 5px; padding: 14px; background: #09090a; color: #d8cec0; text-align: center; }
.kl-image-preview[data-state="loading"] { background: linear-gradient(110deg, #101012 30%, #202024 46%, #101012 62%); background-size: 240% 100%; animation: kl-image-loading 1.4s linear infinite; }
.kl-image-preview img { display: block; width: 100%; max-height: 340px; object-fit: contain; border-radius: 6px; }
.kl-image-placeholder-icon { width: 25px; height: 25px; color: var(--kl-gold); }
.kl-image-placeholder-title { font-weight: 800; }
.kl-image-placeholder-help { max-width: 230px; color: #9f978d; font-size: var(--kl-type-xs); }
.kl-image-load { margin-top: 6px; }
.kl-image-caption { display: flex; align-items: center; justify-content: space-between; gap: 9px; padding: 7px 9px; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-image-host { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-image-open { flex: 0 0 auto; color: var(--kl-gold); text-decoration: none; }
@keyframes kl-image-loading { to { background-position: -240% 0; } }
.kl-message-side-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transform: translateX(-3px);
  transition: opacity 120ms ease, transform 120ms ease;
}
.kl-message-row[data-direction="outgoing"] .kl-message-side-actions { transform: translateX(3px); }
.kl-message-row:hover .kl-message-side-actions,
.kl-message-row:focus-within .kl-message-side-actions { opacity: 1; transform: translateX(0); }
.kl-message-action {
  width: 29px;
  height: 29px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--kl-muted);
  cursor: pointer;
}
.kl-message-action .kl-icon { width: 15px; height: 15px; }
.kl-message-action:hover { border-color: var(--kl-border); background: var(--kl-surface-2); color: var(--kl-gold); }

.kl-alias-dialog { width: min(500px, calc(100vw - 32px)); }
.kl-alias-body { display: grid; gap: 15px; }
.kl-local-only-note { display: flex; align-items: flex-start; gap: 9px; margin: 0; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-local-only-note .kl-icon { width: 17px; height: 17px; margin-top: 1px; color: var(--kl-gold); }
.kl-dialog-actions-spacer { flex: 1 1 auto; }
.kl-remove-chat-dialog { width: min(480px, calc(100vw - 32px)); }
.kl-remove-chat-body { display: grid; justify-items: center; gap: 10px; padding-block: 24px; text-align: center; }
.kl-remove-chat-body p { margin: 0; }
.kl-remove-chat-icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 15px; background: color-mix(in srgb, var(--kl-danger), transparent 88%); color: var(--kl-danger); }
.kl-remove-chat-icon .kl-icon { width: 23px; height: 23px; }
.kl-remove-chat-safe { max-width: 360px; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-text-button--danger { border-color: color-mix(in srgb, var(--kl-danger), transparent 50%); background: color-mix(in srgb, var(--kl-danger), transparent 90%); }

@media (max-width: 720px) {
  .kl-presence-trigger { width: 38px; min-height: 38px; justify-content: center; padding: 0; }
  .kl-presence-trigger-label { display: none; }
  .kl-presence-options { grid-template-columns: minmax(0, 1fr); }
  .kl-composer-row { grid-template-columns: 44px minmax(0, 1fr) 48px; gap: 7px; }
  .kl-message-side-actions { opacity: 0.66; transform: none; }
  .kl-image-card { min-width: min(210px, 64vw); }
  .kl-chat-presence .kl-presence-note { display: none; }
}

@media (max-width: 410px) {
  .kl-chat-number { display: none; }
  .kl-chat-presence::before { display: none; }
  .kl-profile-more { display: none; }
}

:host([data-reduced-motion="true"]) *,
:host([data-reduced-motion="true"]) *::before,
:host([data-reduced-motion="true"]) *::after {
  animation-duration: 1ms !important;
  transition-duration: 1ms !important;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }
}
`;

  // src/modules/link-chat/media.ts
  var URL_PATTERN = /https:\/\/[^\s<>"'[\]]+/giu;
  var IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|webp)$/iu;
  var TRAILING_PUNCTUATION = /[),.;!?\]}]+$/u;
  function parseMessageLinks(message) {
    const links = [];
    for (const match of message.matchAll(URL_PATTERN)) {
      if (match.index === void 0) continue;
      const candidate = trimTrailingPunctuation(match[0]);
      const url = normalizeHttpsUrl(candidate);
      if (!url) continue;
      links.push({
        start: match.index,
        end: match.index + candidate.length,
        url,
        image: isDirectImageUrl(url)
      });
    }
    return links;
  }
  function normalizeImageUrl(value) {
    const direct = normalizeHttpsUrl(value.trim());
    if (direct && isDirectImageUrl(direct)) return direct;
    for (const match of value.matchAll(URL_PATTERN)) {
      const url = normalizeHttpsUrl(trimTrailingPunctuation(match[0]));
      if (url && isDirectImageUrl(url)) return url;
    }
    return null;
  }
  function isDirectImageUrl(value) {
    const url = normalizeHttpsUrl(value);
    if (!url) return false;
    return IMAGE_EXTENSION.test(new URL(url).pathname);
  }
  function normalizeHttpsUrl(value) {
    if (!value || value.length > 900) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password || !url.hostname) return null;
      return url.href;
    } catch {
      return null;
    }
  }
  function trimTrailingPunctuation(value) {
    let candidate = value;
    while (TRAILING_PUNCTUATION.test(candidate)) {
      const final = candidate.at(-1);
      if (final === ")" && count(candidate, "(") >= count(candidate, ")")) break;
      if (final === "]" && count(candidate, "[") >= count(candidate, "]")) break;
      if (final === "}" && count(candidate, "{") >= count(candidate, "}")) break;
      candidate = candidate.slice(0, -1);
    }
    return candidate;
  }
  function count(value, character) {
    return [...value].filter((candidate) => candidate === character).length;
  }

  // src/modules/link-chat/icons.ts
  var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  var ICONS = {
    activities: [
      ["path", { d: "M12 3.2c.5 3.1 2.1 4.7 5.2 5.2-3.1.5-4.7 2.1-5.2 5.2-.5-3.1-2.1-4.7-5.2-5.2 3.1-.5 4.7-2.1 5.2-5.2Z" }, true],
      ["path", { d: "M18.2 14.2c.25 1.55 1.05 2.35 2.6 2.6-1.55.25-2.35 1.05-2.6 2.6-.25-1.55-1.05-2.35-2.6-2.6 1.55-.25 2.35-1.05 2.6-2.6Z" }, true],
      ["path", { d: "M5.7 14.8c.22 1.35.93 2.06 2.28 2.28-1.35.22-2.06.93-2.28 2.28-.22-1.35-.93-2.06-2.28-2.28 1.35-.22 2.06-.93 2.28-2.28Z" }, true]
    ],
    appearance: [
      ["path", { d: "M12 3.2a8.8 8.8 0 1 0 0 17.6c1.4 0 2.1-.75 2.1-1.62 0-.52-.25-.95-.25-1.52 0-1.1.82-1.72 1.92-1.72h1.38c2.22 0 3.65-1.48 3.65-3.74A8.8 8.8 0 0 0 12 3.2Z" }],
      ["circle", { cx: "7.4", cy: "10.1", r: "0.9" }, true],
      ["circle", { cx: "10.1", cy: "6.9", r: "0.9" }, true],
      ["circle", { cx: "14.2", cy: "6.8", r: "0.9" }, true]
    ],
    back: [
      ["path", { d: "m10.2 5.2-6.8 6.8 6.8 6.8" }],
      ["line", { x1: "4", y1: "12", x2: "20.5", y2: "12" }]
    ],
    chat: [
      ["path", { d: "M4.1 5.2h15.8v10.3H10l-5.3 3.4 1-3.4H4.1V5.2Z" }],
      ["line", { x1: "8", y1: "9.1", x2: "16", y2: "9.1" }],
      ["line", { x1: "8", y1: "12.6", x2: "13.5", y2: "12.6" }]
    ],
    check: [["polyline", { points: "4.5 12.5 9.5 17.2 19.8 6.8" }]],
    close: [
      ["line", { x1: "5.5", y1: "5.5", x2: "18.5", y2: "18.5" }],
      ["line", { x1: "18.5", y1: "5.5", x2: "5.5", y2: "18.5" }]
    ],
    copy: [
      ["rect", { x: "8", y: "7.5", width: "11.5", height: "12", rx: "2.2" }],
      ["path", { d: "M16 7.5V6.7a2.2 2.2 0 0 0-2.2-2.2H6.7a2.2 2.2 0 0 0-2.2 2.2v7.1A2.2 2.2 0 0 0 6.7 16H8" }]
    ],
    edit: [
      ["path", { d: "m5 16.7-.7 3 3-.7L18.8 7.5l-2.3-2.3L5 16.7Z" }],
      ["line", { x1: "14.5", y1: "7.2", x2: "16.8", y2: "9.5" }]
    ],
    external: [
      ["path", { d: "M13 4.5h6.5V11" }],
      ["line", { x1: "19", y1: "5", x2: "11", y2: "13" }],
      ["path", { d: "M10 6H6.5a2 2 0 0 0-2 2v9.5a2 2 0 0 0 2 2H16a2 2 0 0 0 2-2V14" }]
    ],
    home: [
      ["path", { d: "m3.4 10.5 8.6-7 8.6 7" }],
      ["path", { d: "M5.7 9.2v10.3h12.6V9.2" }],
      ["path", { d: "M10 19.5v-5.8h4v5.8" }]
    ],
    id: [
      ["line", { x1: "9", y1: "4.5", x2: "7", y2: "19.5" }],
      ["line", { x1: "17", y1: "4.5", x2: "15", y2: "19.5" }],
      ["line", { x1: "4.5", y1: "9", x2: "19.5", y2: "9" }],
      ["line", { x1: "3.8", y1: "15", x2: "18.8", y2: "15" }]
    ],
    image: [
      ["rect", { x: "3.5", y: "4.5", width: "17", height: "15", rx: "2.6" }],
      ["circle", { cx: "8.4", cy: "9.2", r: "1.45" }],
      ["path", { d: "m5.2 17 4.3-4.4 3.2 3 2.6-2.5 3.5 3.9" }]
    ],
    location: [
      ["path", { d: "M12 21s6.2-5.8 6.2-11A6.2 6.2 0 1 0 5.8 10C5.8 15.2 12 21 12 21Z" }],
      ["circle", { cx: "12", cy: "10", r: "2.1" }]
    ],
    lock: [
      ["rect", { x: "5", y: "10", width: "14", height: "10", rx: "2.3" }],
      ["path", { d: "M8 10V7.5a4 4 0 0 1 8 0V10" }],
      ["line", { x1: "12", y1: "14", x2: "12", y2: "16.5" }]
    ],
    more: [
      ["circle", { cx: "5.3", cy: "12", r: "1" }, true],
      ["circle", { cx: "12", cy: "12", r: "1" }, true],
      ["circle", { cx: "18.7", cy: "12", r: "1" }, true]
    ],
    navigation: [
      ["circle", { cx: "12", cy: "12", r: "8.5" }],
      ["path", { d: "m15.7 8.3-2.1 5.3-5.3 2.1 2.1-5.3 5.3-2.1Z" }, true]
    ],
    note: [
      ["path", { d: "M6 3.8h9.2L19 7.6v12.6H6V3.8Z" }],
      ["path", { d: "M15 3.8v4h4" }],
      ["line", { x1: "9", y1: "12", x2: "16", y2: "12" }],
      ["line", { x1: "9", y1: "15.5", x2: "14", y2: "15.5" }]
    ],
    pin: [
      ["path", { d: "m8 4 8 0-1.5 5 3 3H6.5l3-3L8 4Z" }, true],
      ["line", { x1: "12", y1: "12", x2: "12", y2: "20" }]
    ],
    plus: [
      ["line", { x1: "12", y1: "4.5", x2: "12", y2: "19.5" }],
      ["line", { x1: "4.5", y1: "12", x2: "19.5", y2: "12" }]
    ],
    profile: [
      ["rect", { x: "3.5", y: "5", width: "17", height: "14", rx: "2.4" }],
      ["circle", { cx: "8.5", cy: "10.2", r: "2.1" }],
      ["path", { d: "M5.8 16c.55-1.75 1.55-2.6 2.7-2.6s2.15.85 2.7 2.6" }],
      ["line", { x1: "14", y1: "9", x2: "18", y2: "9" }],
      ["line", { x1: "14", y1: "13", x2: "18", y2: "13" }]
    ],
    reply: [
      ["polyline", { points: "9.5 7 4.2 11.7 9.5 16.4" }],
      ["path", { d: "M5 11.7h7.4c4.6 0 7.1 2.25 7.1 6.3" }]
    ],
    search: [
      ["circle", { cx: "10.5", cy: "10.5", r: "6.2" }],
      ["line", { x1: "15.1", y1: "15.1", x2: "20", y2: "20" }]
    ],
    send: [
      ["path", { d: "m3.5 4.2 17 7.8-17 7.8 2.7-6.1L15 12l-8.8-1.7-2.7-6.1Z" }, true]
    ],
    settings: [
      ["line", { x1: "4", y1: "6.5", x2: "20", y2: "6.5" }],
      ["circle", { cx: "9", cy: "6.5", r: "2" }],
      ["line", { x1: "4", y1: "12", x2: "20", y2: "12" }],
      ["circle", { cx: "15", cy: "12", r: "2" }],
      ["line", { x1: "4", y1: "17.5", x2: "20", y2: "17.5" }],
      ["circle", { cx: "11", cy: "17.5", r: "2" }]
    ],
    star: [["path", { d: "m12 3.3 2.65 5.35 5.9.86-4.28 4.16 1.01 5.88L12 16.77l-5.28 2.78 1.01-5.88-4.28-4.16 5.9-.86L12 3.3Z" }, true]],
    status: [
      ["circle", { cx: "12", cy: "12", r: "8" }],
      ["circle", { cx: "12", cy: "12", r: "2.4" }, true]
    ],
    trash: [
      ["path", { d: "M5.5 7h13l-1 13h-11l-1-13Z" }],
      ["line", { x1: "4", y1: "7", x2: "20", y2: "7" }],
      ["path", { d: "M9 7V4.5h6V7" }],
      ["line", { x1: "10", y1: "10.5", x2: "10.5", y2: "17" }],
      ["line", { x1: "14", y1: "10.5", x2: "13.5", y2: "17" }]
    ],
    unread: [
      ["circle", { cx: "12", cy: "12", r: "8" }],
      ["circle", { cx: "12", cy: "12", r: "2.2" }, true]
    ],
    users: [
      ["circle", { cx: "9", cy: "8.5", r: "3" }],
      ["path", { d: "M3.8 19c.65-3.7 2.35-5.4 5.2-5.4s4.55 1.7 5.2 5.4" }],
      ["path", { d: "M15.1 6.2a2.8 2.8 0 0 1 0 5.3" }],
      ["path", { d: "M16 14c2.35.35 3.65 1.95 4.2 5" }]
    ],
    warning: [
      ["path", { d: "M12 3.5 21 20H3L12 3.5Z" }],
      ["line", { x1: "12", y1: "9", x2: "12", y2: "14" }],
      ["circle", { cx: "12", cy: "17", r: "0.8" }, true]
    ],
    whisper: [
      ["path", { d: "M4 5.5h16v10H9.8L5 18.8l.8-3.3H4v-10Z" }],
      ["path", { d: "M8 11.8c1.1-1.7 2.35-2.55 4-2.55s2.9.85 4 2.55" }]
    ]
  };
  function kikiIcon(name, className = "kl-icon", filled = false) {
    const svg = document.createElementNS(SVG_NAMESPACE, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("class", className === "kl-icon" ? className : `kl-icon ${className}`);
    if (filled) svg.dataset.filled = "true";
    for (const [shapeName, attributes, fillable] of ICONS[name]) {
      const shape = document.createElementNS(SVG_NAMESPACE, shapeName);
      for (const [attribute, value] of Object.entries(attributes)) {
        shape.setAttribute(attribute, value);
      }
      if (fillable) shape.classList.add("kl-icon-fill");
      svg.append(shape);
    }
    return svg;
  }

  // design/references/3929.png
  var __default = "data:image/png;base64,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";

  // src/modules/link-chat/view.ts
  var LinkChatView = class {
    constructor(adapter, service, settings, version, activities = new LinkActivitiesService(adapter), roster = new LinkRosterService(
      adapter,
      new PeopleRepository(new MemoryKeyValueStorage()),
      settings
    ), presence) {
      this.adapter = adapter;
      this.service = service;
      this.settings = settings;
      this.version = version;
      this.activities = activities;
      this.roster = roster;
      this.presence = presence ?? new LinkPresenceService(adapter, settings, new EventBus(), version);
    }
    adapter;
    service;
    settings;
    version;
    activities;
    roster;
    #host = document.createElement("div");
    #shadow = this.#host.attachShadow({ mode: "open" });
    #launcher = element("button", {
      className: "kl-launcher",
      type: "button",
      title: "Open KikiLink",
      ariaLabel: "Open KikiLink"
    });
    #badge = element("span", { className: "kl-badge" });
    #connection = element("span", { className: "kl-connection" });
    #connectionDot = element("span", { className: "kl-connection-dot" });
    #connectionText = element("span", { className: "kl-connection-text" });
    #panel = element("section", {
      className: "kl-panel",
      ariaLabel: "KikiLink Link Deck"
    });
    #featureNav = element("nav", {
      className: "kl-feature-nav",
      ariaLabel: "KikiLink features"
    });
    #workspace = element("div", { className: "kl-workspace" });
    #home = element("section", { className: "kl-home" });
    #chatLayout = element("div", { className: "kl-layout" });
    #contextTitle = element("div", { className: "kl-topbar-context", text: "Home" });
    #finderTrigger = element("button", {
      className: "kl-text-button kl-finder-trigger",
      type: "button",
      title: "Find anything in KikiLink (Ctrl+K)",
      ariaLabel: "Find chats, players, activities, and settings"
    });
    #topbarSettingsButton = element("button", {
      className: "kl-icon-button kl-topbar-settings",
      type: "button",
      title: "KikiLink settings",
      ariaLabel: "Open KikiLink settings"
    });
    #homeNavButton = element("button", {
      className: "kl-nav-item",
      type: "button",
      title: "Home",
      ariaLabel: "Open KikiLink home"
    });
    #chatNavButton = element("button", {
      className: "kl-nav-item",
      type: "button",
      title: "LinkChat",
      ariaLabel: "Open LinkChat"
    });
    #settingsNavButton = element("button", {
      className: "kl-nav-item",
      type: "button",
      title: "KikiLink settings",
      ariaLabel: "Open KikiLink settings"
    });
    #homeGreeting = element("h1", { className: "kl-home-title" });
    #homeActionIcon = element("span", { className: "kl-home-next-icon" });
    #homeActionTitle = element("h2", { className: "kl-home-next-title" });
    #homeActionDescription = element("p", { className: "kl-home-next-description" });
    #homeActionMeta = element("span", { className: "kl-home-next-meta" });
    #homeActionButton = element("button", {
      className: "kl-text-button kl-text-button--primary kl-home-next-button",
      type: "button"
    });
    #homeConnection = element("span", { className: "kl-home-status-value" });
    #homeRoom = element("span", { className: "kl-home-status-value" });
    #homePresence = element("button", {
      className: "kl-home-status-value kl-home-presence",
      type: "button",
      title: "Change your KikiLink status"
    });
    #homeChatMetric = element("span", { className: "kl-feature-card-metric" });
    #homeRosterMetric = element("span", { className: "kl-feature-card-metric" });
    #homeActivitiesMetric = element("span", { className: "kl-feature-card-metric" });
    #homeSettingsMetric = element("span", { className: "kl-feature-card-metric" });
    #homeRosterAction = element("span", { className: "kl-feature-card-action" });
    #homeActivitiesAction = element("span", { className: "kl-feature-card-action" });
    #homeRosterCard = element("button", {
      className: "kl-feature-card",
      type: "button",
      title: "Open LinkRoster"
    });
    #homeActivitiesCard = element("button", {
      className: "kl-feature-card",
      type: "button",
      title: "Open LinkActivities"
    });
    #conversationList = element("div", { className: "kl-conversations" });
    #search = element("input", { className: "kl-search" });
    #empty = element("div", { className: "kl-empty" });
    #chat = element("section", { className: "kl-chat" });
    #chatAvatar = element("div", { className: "kl-avatar" });
    #chatName = element("div", { className: "kl-chat-name" });
    #chatNumber = element("div", { className: "kl-chat-number" });
    #chatPresence = element("div", { className: "kl-chat-presence" });
    #chatRoom = element("div", { className: "kl-chat-room" });
    #pinButton = element("button", {
      className: "kl-icon-button",
      type: "button",
      title: "Pin conversation",
      ariaLabel: "Pin conversation"
    });
    #profileButton = element("button", {
      className: "kl-icon-button kl-profile-more",
      type: "button",
      title: "Player actions",
      ariaLabel: "Open player actions"
    });
    #messages = element("div", { className: "kl-messages" });
    #typingIndicator = element("div", {
      className: "kl-typing-indicator",
      ariaLabel: "Typing status"
    });
    #composer = element("textarea", { className: "kl-composer-input" });
    #sendButton = element("button", {
      className: "kl-text-button kl-text-button--primary kl-send",
      type: "button",
      text: "Send"
    });
    #attachImageButton = element("button", {
      className: "kl-icon-button kl-attach-image",
      type: "button",
      title: "Send an image link",
      ariaLabel: "Send an image link"
    });
    #quickActions = element("div", { className: "kl-quick-actions" });
    #includeRoom = element("input");
    #counter = element("span", { className: "kl-counter" });
    #settingsPage = element("section", {
      className: "kl-settings-page",
      ariaLabel: "KikiLink settings"
    });
    #settingsTabs = element("div", { className: "kl-settings-tabs" });
    #settingsPanels = /* @__PURE__ */ new Map();
    #historyToggle = element("input");
    #enterToSendToggle = element("input");
    #typingIndicatorsToggle = element("input");
    #imagePreviewSelect = element("select", { className: "kl-select" });
    #retentionInput = element("input", { className: "kl-number-input" });
    #saveSettingsButton = element("button", {
      className: "kl-text-button kl-text-button--primary",
      type: "button",
      text: "Save changes"
    });
    #themeSelect = element("select", { className: "kl-select" });
    #accentInput = element("input", { className: "kl-color-input" });
    #densitySelect = element("select", { className: "kl-select" });
    #textScaleSelect = element("select", { className: "kl-select" });
    #homeLayoutSelect = element("select", { className: "kl-select" });
    #launcherSideSelect = element("select", {
      className: "kl-select"
    });
    #launcherOpenSelect = element("select", {
      className: "kl-select"
    });
    #reducedMotionToggle = element("input");
    #quickActionsEditor = element("div", { className: "kl-action-editor" });
    #rosterEnabledToggle = element("input");
    #rosterTrackingToggle = element("input");
    #rosterRetentionSelect = element("select", {
      className: "kl-select"
    });
    #notebookFileInput = element("input");
    #notebookCount = element("span", { className: "kl-data-tools-count" });
    #rosterButton = element("button", {
      className: "kl-nav-item kl-roster-button",
      type: "button",
      title: "LinkRoster",
      ariaLabel: "Open LinkRoster"
    });
    #rosterCount = element("span", { className: "kl-roster-count" });
    #rosterPage = element("section", {
      className: "kl-feature-page kl-roster-page",
      ariaLabel: "LinkRoster players"
    });
    #rosterSubtitle = element("p", { className: "kl-feature-page-subtitle" });
    #rosterScopes = element("div", { className: "kl-roster-scopes" });
    #rosterSearch = element("input", {
      className: "kl-search kl-roster-search"
    });
    #rosterList = element("div", { className: "kl-roster-list" });
    #rosterDetail = element("section", { className: "kl-roster-detail" });
    #rosterNote = element("textarea", {
      className: "kl-roster-note"
    });
    #rosterTags = element("input", {
      className: "kl-roster-tags"
    });
    #saveNotebookButton = element("button", {
      className: "kl-text-button kl-text-button--primary kl-save-notebook",
      type: "button",
      text: "Save note"
    });
    #activitiesToggle = element("input");
    #activitiesEditor = element("div", {
      className: "kl-action-editor kl-activities-editor"
    });
    #activityFileInput = element("input");
    #activityPackSelect = element("select", {
      className: "kl-select kl-activity-pack-select"
    });
    #activityCount = element("span", { className: "kl-data-tools-count" });
    #activitiesButton = element("button", {
      className: "kl-nav-item kl-activities-button",
      type: "button",
      title: "LinkActivities",
      ariaLabel: "Open LinkActivities"
    });
    #activitiesPage = element("section", {
      className: "kl-feature-page kl-activities-page",
      ariaLabel: "LinkActivities"
    });
    #activityTargetQuery = element("input", {
      className: "kl-search kl-activity-target-query"
    });
    #activityTargetResults = element("div", { className: "kl-activity-targets" });
    #activityQuery = element("input", {
      className: "kl-search kl-activity-query"
    });
    #activityFilter = element("select", {
      className: "kl-select kl-activity-filter"
    });
    #activityLibrary = element("div", { className: "kl-activity-library" });
    #activityStatus = element("div", { className: "kl-activity-status" });
    #activityPreview = element("div", { className: "kl-activity-preview" });
    #performActivityButton = element("button", {
      className: "kl-text-button kl-text-button--primary kl-perform-activity",
      type: "button",
      text: "Perform"
    });
    #newChatDialog = element("dialog", { className: "kl-dialog kl-new-chat-dialog" });
    #newChatQuery = element("input", { className: "kl-search kl-new-chat-query" });
    #newChatResults = element("div", { className: "kl-contact-results" });
    #finderDialog = element("dialog", { className: "kl-dialog kl-finder-dialog" });
    #finderQuery = element("input", { className: "kl-finder-query" });
    #finderResults = element("div", { className: "kl-finder-results" });
    #finderStatus = element("div", { className: "kl-sr-only" });
    #presenceTrigger = element("button", {
      className: "kl-presence-trigger",
      type: "button",
      title: "Change KikiLink status",
      ariaLabel: "Change KikiLink status"
    });
    #presenceTriggerDot = element("span", { className: "kl-presence-dot" });
    #presenceTriggerLabel = element("span", { className: "kl-presence-trigger-label" });
    #presenceDialog = element("dialog", { className: "kl-dialog kl-presence-dialog" });
    #presenceOptions = element("div", { className: "kl-presence-options" });
    #presenceEnabledToggle = element("input");
    #presenceMessage = element("input", { className: "kl-search kl-presence-message" });
    #autoIdleSelect = element("select", { className: "kl-select" });
    #imageDialog = element("dialog", { className: "kl-dialog kl-image-dialog" });
    #imageUrlInput = element("input", { className: "kl-search kl-image-url" });
    #imagePreview = element("div", { className: "kl-image-compose-preview" });
    #sendImageButton = element("button", {
      className: "kl-text-button kl-text-button--primary",
      type: "button",
      text: "Send image"
    });
    #profileMenu = element("div", { className: "kl-profile-menu" });
    #aliasDialog = element("dialog", { className: "kl-dialog kl-alias-dialog" });
    #aliasInput = element("input", { className: "kl-search kl-alias-input" });
    #saveAliasButton = element("button", {
      className: "kl-text-button kl-text-button--primary",
      type: "button",
      text: "Save nickname"
    });
    #clearAliasButton = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "Use native nickname"
    });
    #removeChatDialog = element("dialog", { className: "kl-dialog kl-remove-chat-dialog" });
    #removeChatName = element("strong", { className: "kl-remove-chat-name" });
    #removeChatButton = element("button", {
      className: "kl-text-button kl-text-button--danger",
      type: "button",
      text: "Remove chat"
    });
    #backButton = element("button", {
      className: "kl-icon-button kl-back",
      type: "button",
      title: "Back to conversations",
      ariaLabel: "Back to conversations"
    });
    #activePeer;
    #activeName = "";
    #activeNativeName = "";
    #selectedActivityIndex = 0;
    #selectedActivityTarget;
    #selectedRosterMember;
    #rosterScope = "current";
    #workspaceView = "home";
    #lastWorkspaceView = "home";
    #settingsReturnView = "home";
    #settingsSection = "appearance";
    #presentCount = 0;
    #unreadCount = 0;
    #notebookDirty = false;
    #mounted = false;
    #connectionState = "connecting";
    #homeAction = { kind: "new-chat" };
    #finderCatalog = [];
    #visibleFinderResults = [];
    #finderSelectedIndex = 0;
    #finderRenderToken = 0;
    #toastTimer;
    #launcherDrag;
    #suppressLauncherClickUntil = 0;
    #presenceUnsubscribe;
    #presenceRenderFrame;
    #pendingPresenceAll = false;
    #pendingPresenceMembers = /* @__PURE__ */ new Set();
    #typingStopTimer;
    #messageRenderLimit = 120;
    #messageRenderPeer;
    #renderedMessageIds = /* @__PURE__ */ new Set();
    #suppressProfileClickUntil = /* @__PURE__ */ new WeakMap();
    #profileMenuToken = 0;
    #aliasTarget;
    #removeChatTarget;
    #handleOutsidePointerDown = (event) => {
      if (this.#profileMenu.hidden) return;
      if (event.composedPath().includes(this.#host)) return;
      this.#closeProfileMenu();
    };
    #handleViewportResize = () => {
      this.#positionLauncher();
      this.#updateSettingsTabOrientation();
      this.#closeProfileMenu();
    };
    #saveDraft = debounce((peerNumber, peerName, value) => {
      void this.service.setDraft(peerNumber, peerName, value);
    }, 250);
    presence;
    mount() {
      if (this.#mounted) return;
      this.#mounted = true;
      this.#host.id = "kikilink-root";
      const style = document.createElement("style");
      style.textContent = LINK_CHAT_STYLES;
      this.#applyTheme(this.settings.get());
      this.#buildLauncher();
      this.#buildPanel();
      this.#buildNewChatDialog();
      this.#buildFinderDialog();
      this.#buildPresenceDialog();
      this.#buildImageDialog();
      this.#buildAliasDialog();
      this.#buildRemoveChatDialog();
      this.#profileMenu.hidden = true;
      this.#profileMenu.setAttribute("role", "menu");
      this.#profileMenu.setAttribute("aria-label", "Player actions");
      this.#shadow.append(
        style,
        this.#launcher,
        this.#panel,
        this.#newChatDialog,
        this.#finderDialog,
        this.#presenceDialog,
        this.#imageDialog,
        this.#aliasDialog,
        this.#removeChatDialog,
        this.#profileMenu
      );
      document.body.append(this.#host);
      this.#positionLauncher();
      window.addEventListener("resize", this.#handleViewportResize);
      document.addEventListener("pointerdown", this.#handleOutsidePointerDown);
      this.#presenceUnsubscribe = this.presence.subscribe(
        (memberNumber) => this.#schedulePresenceRender(memberNumber)
      );
      void this.refresh();
    }
    destroy() {
      this.#stopLocalTyping();
      if (this.#toastTimer !== void 0) clearTimeout(this.#toastTimer);
      if (this.#presenceRenderFrame !== void 0) cancelAnimationFrame(this.#presenceRenderFrame);
      this.#presenceRenderFrame = void 0;
      this.#finderDialog.close();
      this.#newChatDialog.close();
      this.#presenceDialog.close();
      this.#imageDialog.close();
      this.#aliasDialog.close();
      this.#removeChatDialog.close();
      this.#closeProfileMenu();
      window.removeEventListener("resize", this.#handleViewportResize);
      document.removeEventListener("pointerdown", this.#handleOutsidePointerDown);
      this.#presenceUnsubscribe?.();
      this.#presenceUnsubscribe = void 0;
      this.#host.remove();
      this.#mounted = false;
    }
    isActiveConversation(peerNumber) {
      return !this.#panel.hidden && this.#workspaceView === "chat" && this.#activePeer === peerNumber;
    }
    setConnectionState(state, message) {
      this.#connectionState = state;
      this.#connection.dataset.state = state;
      this.#connectionText.textContent = state === "ready" ? "Connected" : state === "error" ? "Connection error" : "Connecting";
      this.#connection.title = message ?? this.#connectionText.textContent ?? "";
      this.#homeConnection.textContent = this.#connectionText.textContent;
      this.#homeConnection.dataset.state = state;
      const canSend = this.adapter.canSendBeep();
      this.#sendButton.disabled = !canSend;
      this.#attachImageButton.disabled = !canSend || this.#activePeer === void 0;
      this.#composer.placeholder = canSend ? "Write a Beep\u2026" : "Connecting to Bondage Club\u2026";
      if (this.#newChatDialog.open) this.#renderKnownContacts();
      if (this.#workspaceView === "activities") this.#renderActivitiesPage();
      if (this.#workspaceView === "roster") this.#renderRoster();
    }
    async onMessage(peerNumber, incoming, message) {
      if (incoming && this.settings.get().linkChat.openOnIncoming) {
        await this.openChat(peerNumber, this.adapter.getMemberName(peerNumber));
        return;
      }
      await this.refresh();
      if (this.#activePeer === peerNumber) {
        if (message && this.#messageRenderPeer === peerNumber) this.#appendMessage(message);
        else await this.#renderMessages(peerNumber);
      }
    }
    async open() {
      const settings = this.settings.get();
      const preference = settings.ui.launcherOpen;
      const requested = preference === "chat" ? "chat" : preference === "last" ? this.#lastWorkspaceView : "home";
      await this.#openPanel(this.#availableWorkspace(requested, settings));
    }
    async #openPanel(view) {
      this.#panel.hidden = false;
      this.#launcher.setAttribute("aria-expanded", "true");
      this.#showWorkspace(view);
      await this.refresh();
    }
    close() {
      this.#stopLocalTyping();
      if (this.#finderDialog.open) this.#finderDialog.close();
      if (this.#newChatDialog.open) this.#newChatDialog.close();
      if (this.#presenceDialog.open) this.#presenceDialog.close();
      if (this.#imageDialog.open) this.#imageDialog.close();
      if (this.#aliasDialog.open) this.#aliasDialog.close();
      if (this.#removeChatDialog.open) this.#removeChatDialog.close();
      this.#closeProfileMenu();
      this.#panel.hidden = true;
      this.#launcher.setAttribute("aria-expanded", "false");
    }
    #availableWorkspace(view, settings = this.settings.get()) {
      if (view === "roster" && !settings.linkRoster.enabled) return "home";
      if (view === "activities" && !settings.linkActivities.enabled) return "home";
      return view;
    }
    async openChat(memberNumber, memberName) {
      const existing = await this.service.getConversation(memberNumber);
      const name = this.adapter.getMemberNickname(memberNumber) || existing?.peerName || memberName?.trim() || this.adapter.getMemberName(memberNumber);
      await this.service.ensureConversation(memberNumber, name);
      await this.#openPanel("chat");
      await this.#selectConversation(memberNumber, name);
    }
    openActivities() {
      void this.#openPanel(this.#workspaceView).then(() => this.#openActivities());
    }
    openRoster() {
      void this.#openPanel(this.#workspaceView).then(() => this.#openRoster());
    }
    onRosterSync(result) {
      const countChanged = this.#presentCount !== result.presentCount;
      this.#presentCount = result.presentCount;
      this.#rosterCount.hidden = result.presentCount === 0;
      this.#rosterCount.textContent = result.presentCount > 99 ? "99+" : result.presentCount.toString();
      this.#rosterButton.title = result.presentCount ? `LinkRoster \xB7 ${result.presentCount} in room` : "LinkRoster";
      if (countChanged || result.changed) {
        this.#renderHomeStatus();
        void this.#renderHome();
      }
      if (result.changed) {
        for (const memberNumber of /* @__PURE__ */ new Set([...result.joined, ...result.left])) {
          this.#schedulePresenceRender(memberNumber);
        }
      }
      if (this.#workspaceView === "roster" && result.changed) this.#renderRoster();
    }
    async refresh() {
      await this.#updateUnreadBadge();
      await Promise.all([this.#renderConversations(), this.#renderHome()]);
    }
    #buildLauncher() {
      this.#badge.hidden = true;
      this.#launcher.append(this.#emblem("kl-launcher-emblem"), this.#badge);
      this.#launcher.setAttribute("aria-expanded", "false");
      this.#launcher.addEventListener("click", () => {
        if (Date.now() < this.#suppressLauncherClickUntil) return;
        if (this.#panel.hidden) void this.open();
        else this.close();
      });
      this.#launcher.addEventListener("pointerdown", (event) => this.#startLauncherDrag(event));
      this.#launcher.addEventListener("pointermove", (event) => this.#moveLauncher(event));
      this.#launcher.addEventListener("pointerup", (event) => this.#finishLauncherDrag(event));
      this.#launcher.addEventListener("pointercancel", (event) => this.#cancelLauncherDrag(event));
    }
    #buildPanel() {
      this.#panel.hidden = true;
      this.#panel.id = "kikilink-panel";
      this.#panel.setAttribute("role", "region");
      this.#launcher.setAttribute("aria-controls", this.#panel.id);
      this.#panel.dataset.mobileView = "list";
      this.#panel.dataset.workspace = "home";
      this.#connection.append(this.#connectionDot, this.#connectionText);
      this.setConnectionState(this.adapter.isReady() ? "ready" : "connecting");
      const brand = element(
        "div",
        { className: "kl-brand" },
        this.#emblem("kl-brand-emblem"),
        element(
          "div",
          { className: "kl-brand-copy" },
          element("div", { className: "kl-brand-title", text: "KikiLink" }),
          element(
            "div",
            { className: "kl-brand-subtitle" },
            `Personal Link Deck \xB7 v${this.version}`,
            this.#connection
          )
        )
      );
      const close = element("button", {
        className: "kl-icon-button",
        type: "button",
        title: "Close KikiLink",
        ariaLabel: "Close KikiLink",
        onClick: () => this.close()
      });
      close.append(kikiIcon("close"));
      this.#topbarSettingsButton.append(kikiIcon("settings"));
      this.#topbarSettingsButton.addEventListener("click", () => this.#openSettings());
      this.#finderTrigger.replaceChildren(
        kikiIcon("search", "kl-finder-trigger-icon"),
        element("span", { className: "kl-finder-trigger-label", text: "Find" }),
        element("kbd", { className: "kl-finder-shortcut", text: "Ctrl K" })
      );
      this.#finderTrigger.setAttribute("aria-keyshortcuts", "Control+K Meta+K");
      this.#finderTrigger.addEventListener("click", () => this.#openFinder());
      this.#presenceTrigger.replaceChildren(this.#presenceTriggerDot, this.#presenceTriggerLabel);
      this.#presenceTrigger.addEventListener("click", () => this.#openPresenceDialog());
      this.#renderOwnPresence();
      const topbar = element(
        "header",
        { className: "kl-topbar" },
        brand,
        this.#contextTitle,
        this.#presenceTrigger,
        this.#finderTrigger,
        this.#topbarSettingsButton,
        close
      );
      this.#buildFeatureNavigation();
      this.#buildHome();
      this.#search.type = "search";
      this.#search.placeholder = "Search chats";
      this.#search.autocomplete = "off";
      this.#search.addEventListener("input", () => void this.#renderConversations());
      const sidebar = element(
        "aside",
        { className: "kl-sidebar" },
        element("div", { className: "kl-search-wrap" }, this.#search),
        element(
          "div",
          { className: "kl-sidebar-heading" },
          element("span", { text: "Recent chats" }),
          element("button", {
            className: "kl-sidebar-new-chat",
            type: "button",
            title: "New Beep chat",
            ariaLabel: "New Beep chat",
            onClick: () => this.#openNewChat()
          }, kikiIcon("plus"))
        ),
        this.#conversationList
      );
      this.#empty.append(
        element("div", { className: "kl-empty-mark" }, kikiIcon("chat")),
        element("h2", { className: "kl-empty-title", text: "Your Beeps, connected" }),
        element("p", {
          className: "kl-empty-copy",
          text: "Choose a conversation or start a new one by member number."
        }),
        element("button", {
          className: "kl-text-button kl-text-button--primary",
          type: "button",
          text: "New chat",
          onClick: () => this.#openNewChat()
        })
      );
      this.#buildChat();
      const main = element("main", { className: "kl-main" }, this.#empty, this.#chat);
      this.#chatLayout.append(sidebar, main);
      this.#buildRosterPage();
      this.#buildActivitiesPage();
      this.#buildSettingsPage();
      this.#workspace.append(
        this.#home,
        this.#chatLayout,
        this.#rosterPage,
        this.#activitiesPage,
        this.#settingsPage
      );
      const shell = element("div", { className: "kl-shell" }, this.#featureNav, this.#workspace);
      this.#panel.append(topbar, shell);
      this.#showWorkspace("home", false);
      this.#panel.addEventListener("keydown", (event) => {
        const target = event.target;
        const editing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target instanceof HTMLElement && target.isContentEditable;
        if (event.key.toLocaleLowerCase() === "k" && (event.ctrlKey || event.metaKey) && !editing) {
          event.preventDefault();
          this.#openFinder();
          return;
        }
        if (event.key === "Escape" && !this.#profileMenu.hidden) {
          this.#closeProfileMenu();
          return;
        }
        if (event.key === "Escape" && !this.#newChatDialog.open && !this.#finderDialog.open && !this.#presenceDialog.open && !this.#imageDialog.open && !this.#aliasDialog.open && !this.#removeChatDialog.open) {
          this.close();
        }
      });
      this.#shadow.addEventListener("pointerdown", (event) => {
        if (this.#profileMenu.hidden || event.composedPath().includes(this.#profileMenu)) return;
        this.#closeProfileMenu();
      });
    }
    #buildFeatureNavigation() {
      this.#configureNavButton(this.#homeNavButton, "home", "Home", "home");
      this.#configureNavButton(this.#chatNavButton, "chat", "Chat", "chat");
      this.#configureNavButton(this.#rosterButton, "users", "Players", "roster");
      this.#configureNavButton(this.#activitiesButton, "activities", "Activities", "activities");
      this.#configureNavButton(this.#settingsNavButton, "settings", "Settings", "settings");
      this.#rosterCount.hidden = true;
      this.#rosterButton.append(this.#rosterCount);
      this.#featureNav.append(
        this.#homeNavButton,
        this.#chatNavButton,
        this.#rosterButton,
        this.#activitiesButton,
        this.#settingsNavButton
      );
    }
    #configureNavButton(button, icon, label, target) {
      button.dataset.target = target;
      button.replaceChildren(
        kikiIcon(icon, "kl-nav-icon"),
        element("span", { className: "kl-nav-label", text: label })
      );
      button.addEventListener("click", () => this.#activateFeature(target));
    }
    #activateFeature(target) {
      if (target === "home" || target === "chat") {
        this.#showWorkspace(target);
        void this.refresh();
        return;
      }
      if (target === "roster") {
        this.#openRoster();
        return;
      }
      if (target === "activities") {
        this.#openActivities();
        return;
      }
      this.#openSettings();
    }
    #buildHome() {
      this.#homePresence.addEventListener("click", () => this.#openPresenceDialog());
      this.#homeActionTitle.id = "kikilink-home-next-title";
      this.#homeActionButton.addEventListener("click", () => void this.#runHomeAction());
      const nextStep = element(
        "section",
        { className: "kl-home-next", ariaLabel: "Suggested next step" },
        this.#homeActionIcon,
        element(
          "div",
          { className: "kl-home-next-copy" },
          element("div", { className: "kl-home-next-kicker", text: "SUGGESTED NEXT STEP" }),
          this.#homeActionTitle,
          this.#homeActionDescription
        ),
        element(
          "div",
          { className: "kl-home-next-footer" },
          this.#homeActionMeta,
          this.#homeActionButton
        )
      );
      nextStep.setAttribute("aria-labelledby", this.#homeActionTitle.id);
      const homeMark = element(
        "div",
        { className: "kl-home-mark" },
        this.#emblem("kl-home-emblem"),
        element("span", { className: "kl-home-orbit" })
      );
      homeMark.setAttribute("aria-hidden", "true");
      const hero = element(
        "header",
        { className: "kl-home-hero" },
        element(
          "div",
          { className: "kl-home-hero-copy" },
          element("div", { className: "kl-home-eyebrow", text: "KIKILINK HOME" }),
          this.#homeGreeting,
          element("p", {
            className: "kl-home-lead",
            text: "Your Beeps and room tools, organized around what you want to do next."
          }),
          element(
            "div",
            { className: "kl-home-statuses" },
            this.#homeStatus("Connection", this.#homeConnection),
            this.#homeStatus("My status", this.#homePresence),
            this.#homeStatus("Current room", this.#homeRoom)
          )
        ),
        nextStep,
        homeMark
      );
      const chatCard = element("button", {
        className: "kl-feature-card kl-feature-card--primary",
        type: "button",
        title: "Open LinkChat",
        onClick: () => this.#activateFeature("chat")
      });
      this.#fillFeatureCard(
        chatCard,
        "chat",
        "START OR CONTINUE",
        "Chat",
        "Read recent Beeps, find conversations, and send a message.",
        this.#homeChatMetric,
        element("span", { className: "kl-feature-card-action", text: "Open Chat" })
      );
      this.#fillFeatureCard(
        this.#homeRosterCard,
        "users",
        "SEE WHO IS HERE",
        "Players",
        "Find people in the room, Whisper, and keep private notes.",
        this.#homeRosterMetric,
        this.#homeRosterAction
      );
      this.#homeRosterCard.addEventListener("click", () => this.#activateFeature("roster"));
      this.#fillFeatureCard(
        this.#homeActivitiesCard,
        "activities",
        "EXPRESS YOURSELF",
        "Activities",
        "Choose a reusable room emote and preview it before sending.",
        this.#homeActivitiesMetric,
        this.#homeActivitiesAction
      );
      this.#homeActivitiesCard.addEventListener("click", () => this.#activateFeature("activities"));
      const settingsCard = element("button", {
        className: "kl-feature-card",
        type: "button",
        title: "KikiLink settings",
        onClick: () => this.#activateFeature("settings")
      });
      this.#fillFeatureCard(
        settingsCard,
        "settings",
        "MAKE IT YOURS",
        "Settings",
        "Adjust the look, comfort, launcher, privacy, and optional tools.",
        this.#homeSettingsMetric,
        element("span", { className: "kl-feature-card-action", text: "Customize" })
      );
      const sectionHeading = element(
        "div",
        { className: "kl-home-section-heading" },
        element("h2", { text: "Choose a tool" }),
        element("p", {
          className: "kl-home-section-description",
          text: "Four clear destinations. Home always brings you back here."
        })
      );
      const cards = element(
        "section",
        { className: "kl-feature-grid", ariaLabel: "KikiLink tools" },
        chatCard,
        this.#homeRosterCard,
        this.#homeActivitiesCard,
        settingsCard
      );
      const privacy = element(
        "div",
        { className: "kl-home-privacy" },
        kikiIcon("lock", "kl-home-privacy-icon"),
        element(
          "span",
          {},
          "Private by design \xB7 history and notes stay in this browser; presence is shared only with compatible KikiLink users."
        )
      );
      this.#home.append(hero, sectionHeading, cards, privacy);
    }
    #homeStatus(label, value) {
      return element(
        "div",
        { className: "kl-home-status" },
        element("span", { className: "kl-home-status-label", text: label }),
        value
      );
    }
    #fillFeatureCard(card, icon, kicker, title, description, metric, action) {
      card.replaceChildren(
        kikiIcon(icon, "kl-feature-card-icon"),
        element(
          "span",
          { className: "kl-feature-card-copy" },
          element("span", { className: "kl-feature-card-kicker", text: kicker }),
          element("span", { className: "kl-feature-card-title", text: title }),
          element("span", { className: "kl-feature-card-description", text: description })
        ),
        element(
          "span",
          { className: "kl-feature-card-footer" },
          metric,
          action
        )
      );
    }
    async #runHomeAction() {
      const action = this.#homeAction;
      if (action.kind === "new-chat") {
        this.#openNewChat();
        return;
      }
      if (action.kind === "chat") {
        if (action.peerNumber !== void 0) {
          await this.openChat(action.peerNumber, action.peerName);
        } else {
          this.#activateFeature("chat");
        }
        return;
      }
      this.#activateFeature(action.kind);
    }
    #showWorkspace(view, remember = true) {
      if (this.#workspaceView === "roster" && view !== "roster") this.#saveNotebook(false);
      this.#workspaceView = view;
      if (remember && view !== "settings") this.#lastWorkspaceView = view;
      this.#panel.dataset.workspace = view;
      this.#home.hidden = view !== "home";
      this.#chatLayout.hidden = view !== "chat";
      this.#rosterPage.hidden = view !== "roster";
      this.#activitiesPage.hidden = view !== "activities";
      this.#settingsPage.hidden = view !== "settings";
      if (view === "chat" && this.#activePeer === void 0) {
        this.#panel.dataset.mobileView = "list";
      }
      this.#contextTitle.textContent = view === "home" ? "Home" : view === "chat" ? "Chat" : view === "roster" ? "Players" : view === "activities" ? "Activities" : "Settings";
      this.#updateNavigation();
    }
    #updateNavigation() {
      for (const button of this.#featureNav.querySelectorAll(".kl-nav-item")) {
        const active = button.dataset.target === this.#workspaceView;
        button.dataset.active = String(active);
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      }
      if (this.#workspaceView === "settings") {
        this.#topbarSettingsButton.setAttribute("aria-current", "page");
      } else {
        this.#topbarSettingsButton.removeAttribute("aria-current");
      }
    }
    #buildChat() {
      this.#chat.hidden = true;
      this.#backButton.append(kikiIcon("back"));
      this.#backButton.addEventListener("click", () => this.#showConversationList());
      this.#renderPinButton(false);
      this.#pinButton.addEventListener("click", () => void this.#togglePin());
      this.#profileButton.append(kikiIcon("more"));
      this.#attachImageButton.append(kikiIcon("image"));
      this.#sendButton.replaceChildren(
        kikiIcon("send"),
        element("span", { className: "kl-send-label", text: "Send" })
      );
      const person = element(
        "div",
        { className: "kl-chat-person" },
        this.#chatName,
        element(
          "div",
          { className: "kl-chat-subline" },
          this.#chatNumber,
          this.#chatPresence,
          this.#chatRoom
        )
      );
      const header = element(
        "header",
        { className: "kl-chat-header" },
        this.#backButton,
        this.#chatAvatar,
        person,
        this.#pinButton,
        this.#profileButton
      );
      this.#profileButton.addEventListener("click", () => {
        if (this.#activePeer === void 0) return;
        const bounds = this.#profileButton.getBoundingClientRect();
        void this.#openProfileMenu(
          this.#activePeer,
          this.#activeName,
          bounds.right,
          bounds.bottom + 6
        );
      });
      this.#bindProfileMenu(
        this.#chatAvatar,
        () => this.#activePeer === void 0 ? void 0 : { memberNumber: this.#activePeer, displayName: this.#activeName }
      );
      this.#bindProfileMenu(
        person,
        () => this.#activePeer === void 0 ? void 0 : { memberNumber: this.#activePeer, displayName: this.#activeName }
      );
      this.#composer.maxLength = 1e3;
      this.#composer.rows = 1;
      this.#composer.addEventListener("input", () => {
        this.#resizeComposer();
        this.#updateCounter();
        if (this.#activePeer !== void 0) {
          this.#saveDraft(this.#activePeer, this.#activeNativeName, this.#composer.value);
          this.#updateLocalTyping();
        }
      });
      this.#composer.addEventListener("blur", () => this.#stopLocalTyping());
      this.#composer.addEventListener("keydown", (event) => {
        const enterToSend = this.settings.get().linkChat.enterToSend;
        if (event.key === "Enter" && !event.isComposing && (event.ctrlKey || event.metaKey || enterToSend && !event.shiftKey && !event.altKey)) {
          event.preventDefault();
          void this.#send();
        }
      });
      this.#sendButton.addEventListener("click", () => void this.#send());
      this.#attachImageButton.addEventListener("click", () => this.#openImageDialog());
      this.#includeRoom.type = "checkbox";
      this.#includeRoom.addEventListener("change", () => {
        this.settings.update((draft) => {
          draft.linkChat.includeRoomByDefault = this.#includeRoom.checked;
        });
      });
      const options = element(
        "div",
        { className: "kl-composer-options" },
        element("label", { className: "kl-check" }, this.#includeRoom, "Share current room"),
        this.#counter
      );
      const composer = element(
        "footer",
        { className: "kl-composer" },
        this.#typingIndicator,
        this.#quickActions,
        element(
          "div",
          { className: "kl-composer-row" },
          this.#attachImageButton,
          this.#composer,
          this.#sendButton
        ),
        options
      );
      this.#typingIndicator.hidden = true;
      this.#typingIndicator.setAttribute("role", "status");
      this.#typingIndicator.setAttribute("aria-live", "polite");
      this.#chat.append(header, this.#messages, composer);
      this.#renderQuickActions();
      this.#updateCounter();
    }
    #buildSettingsPage() {
      const header = element(
        "header",
        { className: "kl-feature-page-header" },
        element(
          "div",
          { className: "kl-feature-page-heading" },
          element("div", { className: "kl-feature-page-eyebrow", text: "MAKE IT YOURS" }),
          element("h1", { className: "kl-feature-page-title", text: "Settings" }),
          element("p", {
            className: "kl-feature-page-subtitle",
            text: "Tune KikiLink for your screen, habits, and comfort without changing the game."
          })
        )
      );
      this.#themeSelect.replaceChildren(
        selectOption("dark", "Dark lacquer"),
        selectOption("light", "Light paper"),
        selectOption("system", "Follow system")
      );
      this.#themeSelect.dataset.setting = "theme";
      this.#themeSelect.setAttribute("aria-label", "Theme");
      const theme = this.#settingRow(
        "Theme",
        "Lacquer black, warm paper, or your system theme.",
        this.#themeSelect
      );
      this.#accentInput.type = "color";
      this.#accentInput.dataset.setting = "accent";
      this.#accentInput.setAttribute("aria-label", "Custom accent color");
      const accentPresets = element("div", { className: "kl-color-presets" });
      for (const [color, label] of [
        ["#d71932", "Crimson"],
        ["#b63a67", "Sakura"],
        ["#ad7624", "Gold"],
        ["#7557c8", "Violet"],
        ["#247f7a", "Jade"]
      ]) {
        const swatch = element("button", {
          className: "kl-color-swatch",
          type: "button",
          title: label,
          ariaLabel: `Use ${label} accent`,
          onClick: () => {
            this.#accentInput.value = color;
            this.#updateAccentPresets();
          }
        });
        swatch.dataset.color = color;
        swatch.setAttribute("aria-pressed", "false");
        swatch.style.setProperty("--kl-swatch", color);
        accentPresets.append(swatch);
      }
      this.#accentInput.addEventListener("input", () => this.#updateAccentPresets());
      const accent = this.#settingRow(
        "Accent color",
        "Choose a preset or any color that feels like yours.",
        element("div", { className: "kl-color-control" }, accentPresets, this.#accentInput)
      );
      this.#densitySelect.replaceChildren(
        selectOption("comfortable", "Comfortable"),
        selectOption("compact", "Compact"),
        selectOption("super-compact", "Super compact")
      );
      this.#densitySelect.dataset.setting = "density";
      this.#densitySelect.setAttribute("aria-label", "Interface spacing");
      const density = this.#settingRow(
        "Spacing",
        "Comfortable is roomy; Compact fits more; Super compact keeps only the essentials.",
        this.#densitySelect
      );
      this.#textScaleSelect.replaceChildren(
        selectOption("normal", "Default"),
        selectOption("large", "Large"),
        selectOption("extra-large", "Extra large")
      );
      this.#textScaleSelect.dataset.setting = "text-scale";
      this.#textScaleSelect.setAttribute("aria-label", "Text size");
      const textScale = this.#settingRow(
        "Text size",
        "Increase labels and supporting text throughout the deck.",
        this.#textScaleSelect
      );
      this.#homeLayoutSelect.replaceChildren(
        selectOption("showcase", "Guided"),
        selectOption("compact", "Focused")
      );
      this.#homeLayoutSelect.dataset.setting = "home-layout";
      this.#homeLayoutSelect.setAttribute("aria-label", "Home style");
      const homeLayout = this.#settingRow(
        "Home style",
        "Guided suggests a useful next step; Focused keeps only the essentials.",
        this.#homeLayoutSelect
      );
      this.#launcherSideSelect.replaceChildren(
        selectOption("right", "Right"),
        selectOption("left", "Left")
      );
      this.#launcherSideSelect.dataset.setting = "launcher-side";
      this.#launcherSideSelect.setAttribute("aria-label", "Launcher side");
      const launcherSide = this.#settingRow(
        "Launcher side",
        "Choose its default side. You can still drag the emblem anywhere.",
        this.#launcherSideSelect
      );
      this.#launcherOpenSelect.replaceChildren(
        selectOption("home", "Link Deck home"),
        selectOption("last", "Last section"),
        selectOption("chat", "LinkChat directly")
      );
      this.#launcherOpenSelect.dataset.setting = "launcher-open";
      this.#launcherOpenSelect.setAttribute("aria-label", "Launcher opens");
      const launcherOpen = this.#settingRow(
        "Launcher opens",
        "Choose what happens when you tap the floating emblem.",
        this.#launcherOpenSelect
      );
      this.#reducedMotionToggle.type = "checkbox";
      const reducedMotionSwitch = element(
        "label",
        { className: "kl-switch" },
        this.#reducedMotionToggle,
        element("span", { className: "kl-switch-track" })
      );
      this.#reducedMotionToggle.setAttribute("aria-label", "Reduced motion");
      const reducedMotion = this.#settingRow(
        "Reduced motion",
        "Disable panel and control animations.",
        reducedMotionSwitch
      );
      this.#historyToggle.type = "checkbox";
      const historySwitch = element(
        "label",
        { className: "kl-switch" },
        this.#historyToggle,
        element("span", { className: "kl-switch-track" })
      );
      this.#historyToggle.setAttribute("aria-label", "Save message history");
      const history = this.#settingRow(
        "Save message history",
        "Stored only in this browser profile.",
        historySwitch
      );
      this.#enterToSendToggle.type = "checkbox";
      const enterToSendSwitch = element(
        "label",
        { className: "kl-switch" },
        this.#enterToSendToggle,
        element("span", { className: "kl-switch-track" })
      );
      this.#enterToSendToggle.setAttribute("aria-label", "Send messages with Enter");
      const enterToSend = this.#settingRow(
        "Enter sends",
        "Press Enter to send and Shift+Enter for a new line. Ctrl+Enter always sends.",
        enterToSendSwitch
      );
      this.#typingIndicatorsToggle.type = "checkbox";
      const typingIndicatorsSwitch = element(
        "label",
        { className: "kl-switch" },
        this.#typingIndicatorsToggle,
        element("span", { className: "kl-switch-track" })
      );
      this.#typingIndicatorsToggle.setAttribute("aria-label", "Share typing indicators");
      const typingIndicators = this.#settingRow(
        "Typing indicators",
        "Show and share a short-lived typing signal only with compatible KikiLink users.",
        typingIndicatorsSwitch
      );
      this.#imagePreviewSelect.replaceChildren(
        selectOption("ask", "Ask before loading"),
        selectOption("always", "Always show"),
        selectOption("never", "Links only")
      );
      this.#imagePreviewSelect.setAttribute("aria-label", "Remote image previews");
      const imagePreviews = this.#settingRow(
        "Image previews",
        "Remote hosts can see your IP when an image loads. Ask first is the privacy-friendly default.",
        this.#imagePreviewSelect
      );
      this.#retentionInput.type = "number";
      this.#retentionInput.min = "1";
      this.#retentionInput.max = "3650";
      this.#retentionInput.dataset.setting = "retention-days";
      this.#retentionInput.setAttribute("aria-label", "Message retention in days");
      const retention = this.#settingRow(
        "Retention",
        "Automatically remove older messages.",
        element("label", {}, this.#retentionInput, " days")
      );
      const clearHistory = element("button", {
        className: "kl-text-button kl-text-button--danger",
        type: "button",
        text: "Clear all LinkChat history",
        onClick: () => void this.#clearHistory()
      });
      const appearanceSection = this.#createSettingsPanel(
        "appearance",
        "Appearance & comfort",
        "Choose a look and reading density that stays comfortable during long sessions.",
        theme,
        accent,
        density,
        textScale,
        homeLayout,
        reducedMotion
      );
      const resetLauncher = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Reset launcher position",
        onClick: () => this.#resetLauncherPosition()
      });
      const navigationSection = this.#createSettingsPanel(
        "navigation",
        "Navigation & launcher",
        "Decide where KikiLink lives and what you see first.",
        launcherOpen,
        launcherSide,
        element(
          "div",
          { className: "kl-setting-action-row" },
          element(
            "div",
            { className: "kl-setting-copy" },
            element("div", { className: "kl-setting-name", text: "Launcher position" }),
            element("div", {
              className: "kl-setting-help",
              text: "A button alternative to dragging: return the emblem to its safe corner."
            })
          ),
          resetLauncher
        )
      );
      this.#rosterEnabledToggle.type = "checkbox";
      const rosterEnabledSwitch = element(
        "label",
        { className: "kl-switch" },
        this.#rosterEnabledToggle,
        element("span", { className: "kl-switch-track" })
      );
      this.#rosterEnabledToggle.setAttribute("aria-label", "Enable LinkRoster");
      const rosterEnabled = this.#settingRow(
        "Enable LinkRoster",
        "Room roster, quick player actions, favorites, and private notes.",
        rosterEnabledSwitch
      );
      this.#rosterTrackingToggle.type = "checkbox";
      const rosterTrackingSwitch = element(
        "label",
        { className: "kl-switch" },
        this.#rosterTrackingToggle,
        element("span", { className: "kl-switch-track" })
      );
      this.#rosterTrackingToggle.setAttribute("aria-label", "Remember player encounters");
      const rosterTracking = this.#settingRow(
        "Remember encounters",
        "Store the last room, time, and encounter count only in this browser.",
        rosterTrackingSwitch
      );
      this.#rosterRetentionSelect.replaceChildren(
        selectOption("30", "30 days"),
        selectOption("90", "90 days"),
        selectOption("180", "180 days"),
        selectOption("365", "1 year"),
        selectOption("730", "2 years"),
        selectOption("0", "Keep forever")
      );
      this.#rosterRetentionSelect.dataset.setting = "roster-retention";
      this.#rosterRetentionSelect.setAttribute("aria-label", "Player encounter retention");
      const rosterRetention = this.#settingRow(
        "Forget old encounters",
        "Applies only to players without notes, tags, or a favorite. Notebook entries stay safe.",
        this.#rosterRetentionSelect
      );
      this.#notebookFileInput.type = "file";
      this.#notebookFileInput.accept = ".json,application/json";
      this.#notebookFileInput.hidden = true;
      this.#notebookFileInput.addEventListener("change", () => void this.#importNotebookFile());
      const exportNotebook = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Export",
        ariaLabel: "Export player notebook backup",
        onClick: () => this.#exportNotebook()
      });
      const importNotebook = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Import",
        ariaLabel: "Import player notebook backup",
        onClick: () => this.#notebookFileInput.click()
      });
      const notebookTools = element(
        "section",
        { className: "kl-data-tools" },
        element(
          "div",
          { className: "kl-data-tools-copy" },
          element("div", { className: "kl-data-tools-title", text: "Notebook backup" }),
          element("div", {
            className: "kl-setting-help",
            text: "Move private notes, tags, favorites, and encounter history between browsers."
          }),
          this.#notebookCount
        ),
        element(
          "div",
          { className: "kl-data-tools-actions" },
          exportNotebook,
          importNotebook,
          this.#notebookFileInput
        )
      );
      const clearPeople = element("button", {
        className: "kl-text-button kl-text-button--danger",
        type: "button",
        text: "Clear player notes & encounter history",
        onClick: () => this.#clearPeople()
      });
      const rosterSection = this.#createSettingsPanel(
        "players",
        "Players & private notebook",
        "Control what the player workspace remembers in this browser.",
        rosterEnabled,
        rosterTracking,
        rosterRetention,
        notebookTools,
        clearPeople
      );
      const addQuickAction = element("button", {
        className: "kl-text-button kl-add-action",
        type: "button",
        text: "+ Add quick action",
        onClick: () => this.#addQuickActionEditorRow()
      });
      const quickActionsSection = element(
        "section",
        { className: "kl-setting-section kl-setting-editor-section" },
        element("div", { className: "kl-setting-section-title", text: "Quick actions" }),
        element("div", {
          className: "kl-setting-help",
          text: "Insert reusable actions into a Beep. Variables: {name}, {member}, {me}."
        }),
        this.#quickActionsEditor,
        addQuickAction
      );
      const chatSection = this.#createSettingsPanel(
        "chat",
        "Chat, history & privacy",
        "Keep Beep history useful, local, and under your control.",
        enterToSend,
        typingIndicators,
        imagePreviews,
        history,
        retention,
        quickActionsSection,
        clearHistory
      );
      this.#activitiesToggle.type = "checkbox";
      const activitiesSwitch = element(
        "label",
        { className: "kl-switch" },
        this.#activitiesToggle,
        element("span", { className: "kl-switch-track" })
      );
      this.#activitiesToggle.setAttribute("aria-label", "Enable LinkActivities");
      const activitiesEnabled = this.#settingRow(
        "Show Activity Studio shortcut",
        "Optional room-emote studio. Disabled by default to keep the toolbar focused.",
        activitiesSwitch
      );
      const addActivity = element("button", {
        className: "kl-text-button kl-add-action",
        type: "button",
        text: "+ Add room activity",
        onClick: () => this.#addActivityEditorRow()
      });
      this.#activityFileInput.type = "file";
      this.#activityFileInput.accept = ".json,application/json";
      this.#activityFileInput.hidden = true;
      this.#activityFileInput.addEventListener("change", () => void this.#importActivityFile());
      this.#activityPackSelect.replaceChildren(
        ...ACTIVITY_PACK_PRESETS.map((pack) => selectOption(pack.id, pack.name))
      );
      this.#activityPackSelect.setAttribute("aria-label", "Built-in activity pack");
      const installPack = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Add pack",
        ariaLabel: "Add selected built-in activity pack",
        onClick: () => this.#installActivityPack()
      });
      const exportActivities = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Export",
        ariaLabel: "Export activity library",
        onClick: () => this.#exportActivities()
      });
      const importActivities = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Import",
        ariaLabel: "Import activity library",
        onClick: () => this.#activityFileInput.click()
      });
      const activityTools = element(
        "section",
        { className: "kl-data-tools kl-activity-data-tools" },
        element(
          "div",
          { className: "kl-data-tools-copy" },
          element("div", { className: "kl-data-tools-title", text: "Activity packs & backup" }),
          element("div", {
            className: "kl-setting-help",
            text: "Add a built-in pack or move categories, favorites, and custom activities between browsers."
          }),
          this.#activityCount
        ),
        element(
          "div",
          { className: "kl-data-tools-actions kl-activity-data-actions" },
          this.#activityPackSelect,
          installPack,
          exportActivities,
          importActivities,
          this.#activityFileInput
        )
      );
      const activitiesSection = this.#createSettingsPanel(
        "activities",
        "Activities library",
        "Keep reusable room emotes close without crowding the deck when you do not need them.",
        activitiesEnabled,
        element("div", {
          className: "kl-setting-help",
          text: "Create room emotes visible to everyone. Variables: {target}, {member}, {source}."
        }),
        activityTools,
        this.#activitiesEditor,
        addActivity
      );
      const panels = element(
        "div",
        { className: "kl-settings-panels" },
        appearanceSection,
        navigationSection,
        chatSection,
        rosterSection,
        activitiesSection
      );
      this.#saveSettingsButton.addEventListener("click", () => this.#saveSettings());
      const cancel = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Discard",
        onClick: () => this.#cancelSettings()
      });
      const actions = element(
        "footer",
        { className: "kl-settings-actions" },
        element("span", {
          className: "kl-settings-local-note",
          text: "Preferences stay in this browser."
        }),
        cancel,
        this.#saveSettingsButton
      );
      this.#settingsPage.append(
        header,
        element("div", { className: "kl-settings-layout" }, this.#settingsTabs, panels),
        actions
      );
      this.#updateSettingsTabOrientation();
    }
    #createSettingsPanel(section, title, description, ...children) {
      const tabId = `kikilink-settings-tab-${section}`;
      const panelId = `kikilink-settings-panel-${section}`;
      const labels = {
        appearance: { icon: "appearance", label: "Appearance" },
        navigation: { icon: "navigation", label: "Navigation" },
        chat: { icon: "chat", label: "Chat" },
        players: { icon: "users", label: "Players" },
        activities: { icon: "activities", label: "Activities" }
      };
      const tab = element(
        "button",
        { className: "kl-settings-tab", type: "button" },
        kikiIcon(labels[section].icon, "kl-settings-tab-icon"),
        element("span", { text: labels[section].label })
      );
      tab.id = tabId;
      tab.dataset.section = section;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panelId);
      tab.setAttribute("aria-selected", "false");
      tab.tabIndex = -1;
      tab.addEventListener("click", () => this.#showSettingsSection(section, true));
      tab.addEventListener("keydown", (event) => this.#handleSettingsTabKey(event));
      this.#settingsTabs.setAttribute("role", "tablist");
      this.#settingsTabs.setAttribute("aria-label", "Settings categories");
      this.#settingsTabs.append(tab);
      const panel = element(
        "section",
        { className: "kl-settings-panel" },
        element("h2", { className: "kl-settings-panel-title", text: title }),
        element("p", { className: "kl-settings-panel-description", text: description }),
        element("div", { className: "kl-settings-panel-body" }, ...children)
      );
      panel.id = panelId;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tabId);
      panel.hidden = true;
      this.#settingsPanels.set(section, panel);
      return panel;
    }
    #handleSettingsTabKey(event) {
      if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        return;
      }
      const tabs = [...this.#settingsTabs.querySelectorAll(".kl-settings-tab")];
      const current = tabs.indexOf(event.currentTarget);
      if (current < 0) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next]?.focus();
      const section = tabs[next]?.dataset.section;
      if (section) this.#showSettingsSection(section, true);
    }
    #updateSettingsTabOrientation() {
      this.#settingsTabs.setAttribute(
        "aria-orientation",
        window.matchMedia?.("(max-width: 720px)").matches ? "horizontal" : "vertical"
      );
    }
    #buildNewChatDialog() {
      const title = element("div", { className: "kl-dialog-title", text: "New Beep chat" });
      title.id = "kikilink-new-chat-title";
      this.#newChatDialog.setAttribute("aria-labelledby", title.id);
      const close = element("button", {
        className: "kl-icon-button",
        type: "button",
        title: "Close",
        ariaLabel: "Close new chat",
        onClick: () => this.#newChatDialog.close()
      });
      close.append(kikiIcon("close"));
      const header = element(
        "header",
        { className: "kl-dialog-header" },
        title,
        close
      );
      this.#newChatQuery.type = "search";
      this.#newChatQuery.placeholder = "Search name or enter member number";
      this.#newChatQuery.autocomplete = "off";
      this.#newChatQuery.addEventListener("input", () => this.#renderKnownContacts());
      this.#newChatQuery.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        void this.#submitNewChat();
      });
      const body = element(
        "div",
        { className: "kl-dialog-body kl-new-chat-body" },
        this.#newChatQuery,
        element("div", { className: "kl-contact-heading", text: "Known contacts" }),
        this.#newChatResults
      );
      const open = element("button", {
        className: "kl-text-button kl-text-button--primary",
        type: "button",
        text: "Open chat",
        onClick: () => void this.#submitNewChat()
      });
      const cancel = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Cancel",
        onClick: () => this.#newChatDialog.close()
      });
      this.#newChatDialog.append(
        header,
        body,
        element("footer", { className: "kl-dialog-actions" }, cancel, open)
      );
    }
    #buildFinderDialog() {
      const title = element("div", { className: "kl-dialog-title", text: "Find anything" });
      title.id = "kikilink-finder-title";
      this.#finderDialog.setAttribute("aria-labelledby", title.id);
      const close = element("button", {
        className: "kl-icon-button",
        type: "button",
        title: "Close",
        ariaLabel: "Close LinkFinder",
        onClick: () => this.#finderDialog.close()
      });
      close.append(kikiIcon("close"));
      const header = element(
        "header",
        { className: "kl-dialog-header" },
        element(
          "div",
          { className: "kl-dialog-heading" },
          title,
          element("div", {
            className: "kl-dialog-subtitle",
            text: "Jump to a chat, player, activity, or setting."
          })
        ),
        close
      );
      this.#finderResults.id = "kikilink-finder-results";
      this.#finderResults.setAttribute("role", "listbox");
      this.#finderResults.setAttribute("aria-label", "KikiLink search results");
      this.#finderQuery.type = "search";
      this.#finderQuery.placeholder = "Search chats, players, activities, settings\u2026";
      this.#finderQuery.autocomplete = "off";
      this.#finderQuery.spellcheck = false;
      this.#finderQuery.setAttribute("role", "combobox");
      this.#finderQuery.setAttribute("aria-label", "Find anything in KikiLink");
      this.#finderQuery.setAttribute("aria-autocomplete", "list");
      this.#finderQuery.setAttribute("aria-controls", this.#finderResults.id);
      this.#finderQuery.setAttribute("aria-expanded", "false");
      this.#finderQuery.addEventListener("input", () => this.#renderFinderResults());
      this.#finderQuery.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          this.#moveFinderSelection(event.key === "ArrowDown" ? 1 : -1);
          return;
        }
        if (event.key === "Enter" && this.#visibleFinderResults.length > 0) {
          event.preventDefault();
          void this.#chooseFinderResult(this.#finderSelectedIndex);
        }
      });
      this.#finderStatus.setAttribute("role", "status");
      this.#finderStatus.setAttribute("aria-live", "polite");
      this.#finderDialog.addEventListener("close", () => {
        this.#finderRenderToken += 1;
        this.#finderQuery.setAttribute("aria-expanded", "false");
        this.#finderQuery.removeAttribute("aria-activedescendant");
      });
      const searchIcon = kikiIcon("search", "kl-finder-search-icon");
      searchIcon.setAttribute("aria-hidden", "true");
      const body = element(
        "div",
        { className: "kl-finder-body" },
        element("div", { className: "kl-finder-input-wrap" }, searchIcon, this.#finderQuery),
        this.#finderStatus,
        this.#finderResults
      );
      const footer = element(
        "footer",
        { className: "kl-finder-footer" },
        element("span", { text: "Results stay in this browser" }),
        element(
          "span",
          { className: "kl-finder-keys" },
          element("kbd", { text: "\u2191\u2193" }),
          " navigate ",
          element("kbd", { text: "Enter" }),
          " open ",
          element("kbd", { text: "Esc" }),
          " close"
        )
      );
      this.#finderDialog.append(header, body, footer);
    }
    #buildPresenceDialog() {
      const title = element("div", { className: "kl-dialog-title", text: "Your KikiLink status" });
      title.id = "kikilink-presence-title";
      this.#presenceDialog.setAttribute("aria-labelledby", title.id);
      const close = element("button", {
        className: "kl-icon-button",
        type: "button",
        title: "Close",
        ariaLabel: "Close status menu",
        onClick: () => this.#presenceDialog.close()
      });
      close.append(kikiIcon("close"));
      const header = element(
        "header",
        { className: "kl-dialog-header" },
        element(
          "div",
          { className: "kl-dialog-heading" },
          title,
          element("div", {
            className: "kl-dialog-subtitle",
            text: "Visible to compatible KikiLink users you meet or contact."
          })
        ),
        close
      );
      this.#presenceEnabledToggle.type = "checkbox";
      this.#presenceEnabledToggle.setAttribute("aria-label", "Share KikiLink presence");
      this.#presenceEnabledToggle.addEventListener("change", () => this.#renderPresenceDialog());
      const presenceEnabledSwitch = element(
        "label",
        { className: "kl-switch" },
        this.#presenceEnabledToggle,
        element("span", { className: "kl-switch-track" })
      );
      for (const status of ["online", "idle", "dnd", "offline"]) {
        const option = element(
          "button",
          { className: "kl-presence-option", type: "button" },
          presenceDot(status),
          element(
            "span",
            { className: "kl-presence-option-copy" },
            element("span", { className: "kl-presence-option-title", text: presenceLabel(status) }),
            element("span", { className: "kl-presence-option-help", text: presenceHelp(status) })
          ),
          element("span", { className: "kl-presence-option-check", text: "\u2713" })
        );
        option.dataset.status = status;
        option.addEventListener("click", () => {
          this.presence.setOwnStatus(status);
          this.#renderOwnPresence();
          this.#renderPresenceDialog();
        });
        this.#presenceOptions.append(option);
      }
      this.#presenceMessage.type = "text";
      this.#presenceMessage.maxLength = 80;
      this.#presenceMessage.placeholder = "Optional: roleplaying, busy, open to chat\u2026";
      this.#presenceMessage.autocomplete = "off";
      this.#autoIdleSelect.replaceChildren(
        selectOption("0", "Never"),
        selectOption("5", "After 5 minutes"),
        selectOption("10", "After 10 minutes"),
        selectOption("15", "After 15 minutes"),
        selectOption("30", "After 30 minutes"),
        selectOption("60", "After 1 hour")
      );
      this.#autoIdleSelect.setAttribute("aria-label", "Automatic idle delay");
      const body = element(
        "div",
        { className: "kl-dialog-body kl-presence-body" },
        this.#settingRow(
          "Share presence",
          "Answer compatible KikiLink status requests and announce inside your current room.",
          presenceEnabledSwitch
        ),
        this.#presenceOptions,
        element(
          "label",
          { className: "kl-presence-field" },
          element("span", { className: "kl-presence-field-label", text: "Status note" }),
          this.#presenceMessage
        ),
        this.#settingRow(
          "Automatic Idle",
          "Only applies while your selected status is Online.",
          this.#autoIdleSelect
        ),
        element(
          "div",
          { className: "kl-presence-caveat" },
          kikiIcon("lock"),
          "Appear Offline changes KikiLink only. Bondage Club can still show your native online state."
        )
      );
      const save = element("button", {
        className: "kl-text-button kl-text-button--primary",
        type: "button",
        text: "Save status",
        onClick: () => this.#savePresencePreferences()
      });
      this.#presenceDialog.append(
        header,
        body,
        element(
          "footer",
          { className: "kl-dialog-actions" },
          element("button", {
            className: "kl-text-button",
            type: "button",
            text: "Close",
            onClick: () => this.#presenceDialog.close()
          }),
          save
        )
      );
    }
    #openPresenceDialog() {
      const config = this.settings.get().linkPresence;
      this.#presenceEnabledToggle.checked = config.enabled;
      this.#presenceMessage.value = config.statusMessage;
      this.#autoIdleSelect.value = config.autoIdleMinutes.toString();
      this.#renderPresenceDialog();
      if (!this.#presenceDialog.open) this.#presenceDialog.showModal();
      this.#presenceOptions.querySelector('[data-active="true"]')?.focus();
    }
    #renderPresenceDialog() {
      const selected = this.settings.get().linkPresence.status;
      const enabled = this.#presenceEnabledToggle.checked;
      for (const option of this.#presenceOptions.querySelectorAll(
        ".kl-presence-option"
      )) {
        const active = option.dataset.status === selected;
        option.dataset.active = String(active);
        option.setAttribute("aria-pressed", String(active));
        option.disabled = !enabled;
      }
      this.#presenceMessage.disabled = !enabled;
      this.#autoIdleSelect.disabled = !enabled;
    }
    #savePresencePreferences() {
      const autoIdle = Number(this.#autoIdleSelect.value);
      this.settings.update((draft) => {
        draft.linkPresence.autoIdleMinutes = Number.isInteger(autoIdle) ? autoIdle : 10;
      });
      this.presence.setEnabled(this.#presenceEnabledToggle.checked);
      this.presence.setOwnStatusMessage(this.#presenceMessage.value);
      this.#renderOwnPresence();
      this.#presenceDialog.close();
      this.#toast("KikiLink status saved.");
    }
    #buildImageDialog() {
      const title = element("div", { className: "kl-dialog-title", text: "Send an image" });
      title.id = "kikilink-image-title";
      this.#imageDialog.setAttribute("aria-labelledby", title.id);
      const header = element(
        "header",
        { className: "kl-dialog-header" },
        element(
          "div",
          { className: "kl-dialog-heading" },
          title,
          element("div", {
            className: "kl-dialog-subtitle",
            text: "A normal Beep link for everyone; an inline preview for KikiLink."
          })
        ),
        this.#dialogCloseButton("Close image sender", () => this.#imageDialog.close())
      );
      this.#imageUrlInput.type = "url";
      this.#imageUrlInput.maxLength = 900;
      this.#imageUrlInput.placeholder = "https://example.com/image.webp";
      this.#imageUrlInput.autocomplete = "off";
      this.#imageUrlInput.spellcheck = false;
      this.#imageUrlInput.addEventListener("input", () => this.#renderImageComposePreview());
      this.#imageUrlInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        void this.#sendImage();
      });
      const body = element(
        "div",
        { className: "kl-dialog-body kl-image-body" },
        element(
          "label",
          { className: "kl-presence-field" },
          element("span", { className: "kl-presence-field-label", text: "Direct HTTPS image link" }),
          this.#imageUrlInput
        ),
        this.#imagePreview,
        element("p", {
          className: "kl-image-upload-note",
          text: "Supported: JPG, PNG, GIF, WebP, and AVIF. Local file upload needs a privacy-reviewed media service and is not silently sent through Beeps."
        })
      );
      this.#sendImageButton.addEventListener("click", () => void this.#sendImage());
      this.#imageDialog.append(
        header,
        body,
        element(
          "footer",
          { className: "kl-dialog-actions" },
          element("button", {
            className: "kl-text-button",
            type: "button",
            text: "Cancel",
            onClick: () => this.#imageDialog.close()
          }),
          this.#sendImageButton
        )
      );
    }
    #buildAliasDialog() {
      const title = element("div", { className: "kl-dialog-title", text: "Local nickname" });
      title.id = "kikilink-alias-title";
      this.#aliasDialog.setAttribute("aria-labelledby", title.id);
      this.#aliasInput.type = "text";
      this.#aliasInput.maxLength = 40;
      this.#aliasInput.autocomplete = "off";
      this.#aliasInput.spellcheck = false;
      this.#aliasInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || event.isComposing) return;
        event.preventDefault();
        void this.#saveLocalAlias(this.#aliasInput.value);
      });
      this.#saveAliasButton.addEventListener(
        "click",
        () => void this.#saveLocalAlias(this.#aliasInput.value)
      );
      this.#clearAliasButton.addEventListener("click", () => void this.#saveLocalAlias(""));
      this.#aliasDialog.addEventListener("close", () => {
        this.#aliasTarget = void 0;
      });
      this.#aliasDialog.append(
        element(
          "header",
          { className: "kl-dialog-header" },
          element(
            "div",
            { className: "kl-dialog-heading" },
            title,
            element("div", {
              className: "kl-dialog-subtitle",
              text: "A private label for this KikiLink chat. It is never sent to anyone."
            })
          ),
          this.#dialogCloseButton("Close local nickname", () => this.#aliasDialog.close())
        ),
        element(
          "div",
          { className: "kl-dialog-body kl-alias-body" },
          element(
            "label",
            { className: "kl-presence-field" },
            element("span", { className: "kl-presence-field-label", text: "Nickname you will see" }),
            this.#aliasInput
          ),
          element(
            "p",
            { className: "kl-local-only-note" },
            kikiIcon("lock"),
            element("span", {
              text: "Bondage Club names, outgoing messages, and the other player's addon stay unchanged."
            })
          )
        ),
        element(
          "footer",
          { className: "kl-dialog-actions kl-alias-actions" },
          this.#clearAliasButton,
          element("span", { className: "kl-dialog-actions-spacer" }),
          element("button", {
            className: "kl-text-button",
            type: "button",
            text: "Cancel",
            onClick: () => this.#aliasDialog.close()
          }),
          this.#saveAliasButton
        )
      );
    }
    #buildRemoveChatDialog() {
      const title = element("div", { className: "kl-dialog-title", text: "Remove recent chat?" });
      title.id = "kikilink-remove-chat-title";
      this.#removeChatDialog.setAttribute("aria-labelledby", title.id);
      this.#removeChatDialog.addEventListener("close", () => {
        this.#removeChatTarget = void 0;
      });
      this.#removeChatButton.addEventListener("click", () => void this.#confirmRemoveChat());
      this.#removeChatDialog.append(
        element(
          "header",
          { className: "kl-dialog-header" },
          element("div", { className: "kl-dialog-heading" }, title),
          this.#dialogCloseButton(
            "Close remove chat confirmation",
            () => this.#removeChatDialog.close()
          )
        ),
        element(
          "div",
          { className: "kl-dialog-body kl-remove-chat-body" },
          element("div", { className: "kl-remove-chat-icon" }, kikiIcon("trash")),
          element(
            "p",
            {},
            "Remove ",
            this.#removeChatName,
            " from KikiLink recent chats and delete this chat's local KikiLink history?"
          ),
          element("p", {
            className: "kl-remove-chat-safe",
            text: "This does not unfriend them and does not change Bondage Club's native Beep log."
          })
        ),
        element(
          "footer",
          { className: "kl-dialog-actions" },
          element("button", {
            className: "kl-text-button",
            type: "button",
            text: "Keep chat",
            onClick: () => this.#removeChatDialog.close()
          }),
          this.#removeChatButton
        )
      );
    }
    #openAliasDialog(conversation) {
      this.#aliasTarget = {
        memberNumber: conversation.peerNumber,
        nativeName: conversation.peerName
      };
      this.#aliasInput.value = conversation.localAlias ?? "";
      this.#aliasInput.placeholder = conversation.peerName;
      this.#clearAliasButton.hidden = !conversation.localAlias;
      if (!this.#aliasDialog.open) this.#aliasDialog.showModal();
      this.#aliasInput.focus();
      this.#aliasInput.select();
    }
    async #saveLocalAlias(value) {
      const target = this.#aliasTarget;
      if (!target) return;
      const alias = await this.service.setLocalAlias(target.memberNumber, value);
      const conversation = await this.service.getConversation(target.memberNumber);
      if (!conversation) {
        this.#aliasDialog.close();
        return;
      }
      if (target.memberNumber === this.#activePeer) {
        const displayName = conversationDisplayName(conversation);
        this.#activeName = displayName;
        this.#activeNativeName = conversation.peerName;
        this.#chatName.textContent = displayName;
        this.#chatAvatar.textContent = avatarText(displayName);
        this.#renderTypingIndicator();
      }
      this.#aliasDialog.close();
      await this.refresh();
      this.#toast(alias ? `Local nickname set to ${alias}.` : "Using the native nickname again.");
    }
    #openRemoveChatDialog(memberNumber, displayName) {
      this.#removeChatTarget = { memberNumber, displayName };
      this.#removeChatName.textContent = displayName;
      if (!this.#removeChatDialog.open) this.#removeChatDialog.showModal();
      this.#removeChatButton.focus();
    }
    async #confirmRemoveChat() {
      const target = this.#removeChatTarget;
      if (!target) return;
      await this.service.removeConversation(target.memberNumber);
      if (target.memberNumber === this.#activePeer) this.#resetActiveConversation();
      this.#removeChatDialog.close();
      await this.refresh();
      this.#toast(`${target.displayName} removed from recent chats.`);
    }
    #openImageDialog() {
      if (this.#activePeer === void 0) {
        this.#toast("Choose a conversation first.", "error");
        return;
      }
      this.#imageUrlInput.value = "";
      this.#renderImageComposePreview();
      if (!this.#imageDialog.open) this.#imageDialog.showModal();
      this.#imageUrlInput.focus();
    }
    #renderImageComposePreview() {
      const url = normalizeImageUrl(this.#imageUrlInput.value);
      this.#sendImageButton.disabled = !url;
      if (!this.#imageUrlInput.value.trim()) {
        this.#imagePreview.replaceChildren(
          element("span", { className: "kl-image-compose-icon" }, kikiIcon("image")),
          element("span", { text: "Paste a direct image link to check it." })
        );
        this.#imagePreview.dataset.state = "empty";
        return;
      }
      if (!url) {
        this.#imagePreview.replaceChildren(
          element("span", { className: "kl-image-compose-icon" }, kikiIcon("warning")),
          element("span", { text: "Use a direct HTTPS link ending in a supported image extension." })
        );
        this.#imagePreview.dataset.state = "error";
        return;
      }
      const parsed = new URL(url);
      this.#imagePreview.replaceChildren(
        element("span", { className: "kl-image-compose-icon" }, kikiIcon("check")),
        element(
          "span",
          {},
          element("strong", { text: "Ready to send" }),
          element("small", { text: `${parsed.hostname}${parsed.pathname}` })
        )
      );
      this.#imagePreview.dataset.state = "ready";
    }
    async #sendImage() {
      const url = normalizeImageUrl(this.#imageUrlInput.value);
      if (!url) {
        this.#renderImageComposePreview();
        return;
      }
      const sent = await this.#sendContent(url, false);
      if (!sent) return;
      this.#imageDialog.close();
      this.#toast("Image link sent.");
    }
    async #openFinder() {
      this.#finderQuery.value = "";
      this.#finderCatalog = [];
      this.#visibleFinderResults = [];
      this.#finderSelectedIndex = 0;
      this.#finderResults.replaceChildren(
        element("div", { className: "kl-finder-loading", text: "Gathering your shortcuts\u2026" })
      );
      if (!this.#finderDialog.open) this.#finderDialog.showModal();
      this.#finderQuery.setAttribute("aria-expanded", "true");
      this.#finderQuery.focus();
      const token = ++this.#finderRenderToken;
      const catalog = await this.#buildFinderCatalog();
      if (token !== this.#finderRenderToken || !this.#finderDialog.open) return;
      this.#finderCatalog = catalog;
      this.#renderFinderResults();
    }
    async #buildFinderCatalog() {
      const settings = this.settings.get();
      const conversations = await this.service.listConversations();
      const unread = conversations.reduce((count2, conversation) => count2 + conversation.unread, 0);
      const currentRoomCount = this.adapter.getRoomCharacters().length;
      const results = [
        {
          id: "destination-home",
          kind: "destination",
          icon: "home",
          category: "Destination",
          title: "Home",
          detail: "Overview and your suggested next step",
          keywords: "start link deck overview dashboard",
          priority: 52,
          action: { kind: "workspace", target: "home" }
        },
        {
          id: "destination-chat",
          kind: "destination",
          icon: "chat",
          category: "Destination",
          title: "Chat",
          detail: unread > 0 ? `${unread} unread ${unread === 1 ? "Beep" : "Beeps"}` : "Recent Beep conversations",
          keywords: "beep message messages conversation conversations linkchat",
          priority: 76 + Math.min(unread, 20),
          action: { kind: "workspace", target: "chat" }
        },
        {
          id: "new-chat",
          kind: "destination",
          icon: "plus",
          category: "Action",
          title: "Start a new chat",
          detail: "Choose a contact or enter a member number",
          keywords: "new beep contact member number send message",
          priority: 92,
          action: { kind: "new-chat" }
        },
        {
          id: "change-status",
          kind: "destination",
          icon: "status",
          category: "Action",
          title: "Change my status",
          detail: settings.linkPresence.enabled ? presenceLabel(this.presence.get(this.adapter.getOwnMemberNumber()).status) : "Presence sharing is off",
          keywords: "presence status online idle away dnd do not disturb offline invisible note",
          priority: 84,
          action: { kind: "presence" }
        },
        {
          id: "destination-players",
          kind: "destination",
          icon: "users",
          category: "Destination",
          title: "Players",
          detail: settings.linkRoster.enabled ? `${currentRoomCount} ${currentRoomCount === 1 ? "person" : "people"} here now` : "Optional player notebook \xB7 currently off",
          keywords: "roster people room notes tags favorites whisper profile linkroster",
          priority: 74,
          action: { kind: "workspace", target: "roster" }
        },
        {
          id: "destination-activities",
          kind: "destination",
          icon: "activities",
          category: "Destination",
          title: "Activities",
          detail: settings.linkActivities.enabled ? `${settings.linkActivities.activities.length} saved activities` : "Optional room actions \xB7 currently off",
          keywords: "activity activities emote room roleplay studio linkactivities",
          priority: 68,
          action: { kind: "workspace", target: "activities" }
        },
        {
          id: "destination-settings",
          kind: "destination",
          icon: "settings",
          category: "Destination",
          title: "Settings",
          detail: "Customize KikiLink",
          keywords: "preferences customize configuration options",
          priority: 62,
          action: { kind: "workspace", target: "settings" }
        }
      ];
      for (const conversation of conversations) {
        const details = [
          "Chat",
          `#${conversation.peerNumber}`,
          conversation.unread > 0 ? `${conversation.unread} unread` : "",
          conversation.lastMessageAt > 0 ? formatRelativeTime(conversation.lastMessageAt) : ""
        ].filter(Boolean);
        results.push({
          id: `conversation-${conversation.peerNumber}`,
          kind: "conversation",
          icon: "chat",
          category: "Chat",
          title: conversationDisplayName(conversation),
          detail: details.join(" \xB7 "),
          keywords: `${conversation.peerNumber} beep message conversation ${conversation.lastMessage}`,
          priority: 120 + Math.min(conversation.unread * 8, 40) + (conversation.pinned ? 12 : 0),
          action: {
            kind: "conversation",
            peerNumber: conversation.peerNumber,
            peerName: conversation.peerName
          }
        });
      }
      const rosterEntries = this.roster.list("known");
      const knownPeople = new Set(rosterEntries.map((entry) => entry.memberNumber));
      for (const entry of rosterEntries) {
        const details = [
          entry.present ? "Here now" : "Player",
          `#${entry.memberNumber}`,
          entry.favorite ? "Favorite" : "",
          entry.tags.slice(0, 2).join(" \xB7 ")
        ].filter(Boolean);
        results.push({
          id: `player-${entry.memberNumber}`,
          kind: "player",
          icon: entry.favorite ? "star" : "users",
          category: entry.present ? "In room" : "Player",
          title: entry.displayName,
          detail: details.join(" \xB7 "),
          keywords: `${entry.memberNumber} ${entry.note} ${entry.tags.join(" ")} ${entry.lastRoomName} roster player`,
          priority: 104 + (entry.present ? 24 : 0) + (entry.favorite ? 12 : 0),
          action: { kind: "player", memberNumber: entry.memberNumber }
        });
      }
      const conversationNumbers = new Set(conversations.map((conversation) => conversation.peerNumber));
      for (const contact of this.adapter.getKnownContacts()) {
        if (knownPeople.has(contact.memberNumber) || conversationNumbers.has(contact.memberNumber)) continue;
        results.push({
          id: `contact-${contact.memberNumber}`,
          kind: "conversation",
          icon: "chat",
          category: "Contact",
          title: contact.memberName,
          detail: `Known contact \xB7 #${contact.memberNumber}`,
          keywords: `${contact.memberNumber} contact friend beep new chat`,
          priority: 90,
          action: {
            kind: "conversation",
            peerNumber: contact.memberNumber,
            peerName: contact.memberName
          }
        });
      }
      settings.linkActivities.activities.forEach((activity, index) => {
        results.push({
          id: `activity-${index}`,
          kind: "activity",
          icon: activity.favorite ? "star" : "activities",
          category: `Activity \xB7 ${activity.category}`,
          title: activity.label,
          detail: `${activity.pack} \xB7 ${activity.template}`,
          keywords: `activity emote room action ${activity.category} ${activity.pack} ${activity.favorite ? "favorite starred" : ""} ${activity.template}`,
          priority: 72 + (activity.favorite ? 18 : 0),
          action: { kind: "activity", index }
        });
      });
      for (const setting of finderSettingResults()) results.push(setting);
      return results;
    }
    #renderFinderResults() {
      const query = normalizeFinderText(this.#finderQuery.value);
      let results;
      if (!query) {
        const featuredConversation = this.#finderCatalog.filter((result) => result.kind === "conversation" && result.id.startsWith("conversation-")).sort((left, right) => right.priority - left.priority)[0];
        const suggestedIds = [
          featuredConversation?.id,
          "new-chat",
          featuredConversation ? void 0 : "destination-chat",
          "destination-players",
          "destination-activities",
          "destination-settings"
        ].filter((id) => Boolean(id));
        results = suggestedIds.map((id) => this.#finderCatalog.find((result) => result.id === id)).filter((result) => result !== void 0);
      } else {
        results = rankFinderResults(this.#finderCatalog, query);
        const directNumber = Number(query.replace(/^#/u, ""));
        const hasDirectConversation = results.some(
          (result) => result.action.kind === "conversation" && result.action.peerNumber === directNumber
        );
        if (/^#?\d+$/u.test(query) && Number.isSafeInteger(directNumber) && directNumber >= 0 && directNumber !== this.adapter.getOwnMemberNumber() && !hasDirectConversation) {
          results.unshift({
            id: `direct-${directNumber}`,
            kind: "conversation",
            icon: "plus",
            category: "Action",
            title: `Start chat with #${directNumber}`,
            detail: this.adapter.getMemberName(directNumber),
            keywords: query,
            priority: 1e3,
            action: {
              kind: "conversation",
              peerNumber: directNumber,
              peerName: this.adapter.getMemberName(directNumber)
            }
          });
        }
        results = results.slice(0, 12);
      }
      this.#visibleFinderResults = results;
      this.#finderSelectedIndex = 0;
      this.#finderResults.replaceChildren();
      if (results.length === 0) {
        this.#finderResults.append(
          element(
            "div",
            { className: "kl-finder-empty" },
            element("div", { className: "kl-finder-empty-title", text: "Nothing matches yet" }),
            element("div", {
              text: "Try a name, member number, feature, activity, or setting."
            })
          )
        );
        this.#finderStatus.textContent = "No KikiLink results found";
        this.#finderQuery.removeAttribute("aria-activedescendant");
        return;
      }
      results.forEach((result, index) => {
        const resultIcon = element(
          "span",
          { className: "kl-finder-result-icon" },
          kikiIcon(result.icon, "kl-finder-result-symbol", result.icon === "star")
        );
        const option = element(
          "button",
          { className: "kl-finder-result", type: "button" },
          resultIcon,
          element(
            "span",
            { className: "kl-finder-result-copy" },
            element("span", { className: "kl-finder-result-title", text: result.title }),
            element("span", { className: "kl-finder-result-detail", text: result.detail })
          ),
          element("span", { className: "kl-finder-result-category", text: result.category })
        );
        option.id = `kikilink-finder-option-${index}`;
        option.dataset.finderKind = result.kind;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", String(index === 0));
        option.tabIndex = -1;
        option.addEventListener("pointermove", () => this.#setFinderSelection(index, false));
        option.addEventListener("click", () => void this.#chooseFinderResult(index));
        this.#finderResults.append(option);
      });
      this.#finderStatus.textContent = `${results.length} ${results.length === 1 ? "result" : "results"} available`;
      this.#setFinderSelection(0, false);
    }
    #moveFinderSelection(delta) {
      if (this.#visibleFinderResults.length === 0) return;
      const next = (this.#finderSelectedIndex + delta + this.#visibleFinderResults.length) % this.#visibleFinderResults.length;
      this.#setFinderSelection(next, true);
    }
    #setFinderSelection(index, scroll) {
      if (index < 0 || index >= this.#visibleFinderResults.length) return;
      this.#finderSelectedIndex = index;
      const options = [...this.#finderResults.querySelectorAll('[role="option"]')];
      options.forEach((option, candidate) => {
        option.dataset.selected = String(candidate === index);
        option.setAttribute("aria-selected", String(candidate === index));
      });
      const selected = options[index];
      if (!selected) return;
      this.#finderQuery.setAttribute("aria-activedescendant", selected.id);
      if (scroll) selected.scrollIntoView?.({ block: "nearest" });
    }
    async #chooseFinderResult(index) {
      const result = this.#visibleFinderResults[index];
      if (!result) return;
      this.#finderDialog.close();
      const action = result.action;
      if (action.kind === "workspace") {
        this.#activateFeature(action.target);
      } else if (action.kind === "new-chat") {
        this.#openNewChat();
      } else if (action.kind === "presence") {
        this.#openPresenceDialog();
      } else if (action.kind === "conversation") {
        await this.openChat(action.peerNumber, action.peerName);
      } else if (action.kind === "player") {
        this.#openRoster(action.memberNumber);
      } else if (action.kind === "activity") {
        this.#openActivities(action.index);
      } else {
        this.#openSettings(action.section);
      }
    }
    #buildRosterPage() {
      const header = element(
        "header",
        { className: "kl-feature-page-header" },
        element(
          "div",
          { className: "kl-feature-page-heading" },
          element("div", { className: "kl-feature-page-eyebrow", text: "PEOPLE" }),
          element("h1", { className: "kl-feature-page-title", text: "Players" }),
          this.#rosterSubtitle
        ),
        element("button", {
          className: "kl-text-button",
          type: "button",
          text: "New chat",
          onClick: () => this.#openNewChat()
        })
      );
      for (const [scope, label] of [
        ["current", "In room"],
        ["known", "Known"],
        ["favorites", "Favorites"]
      ]) {
        const button = element("button", {
          className: "kl-roster-scope",
          type: "button",
          text: label
        });
        button.dataset.scope = scope;
        button.addEventListener("click", () => {
          this.#saveNotebook(false);
          this.#rosterScope = scope;
          this.#selectedRosterMember = void 0;
          this.#renderRoster();
        });
        this.#rosterScopes.append(button);
      }
      this.#rosterSearch.type = "search";
      this.#rosterSearch.placeholder = "Search name, number, tag, or note";
      this.#rosterSearch.autocomplete = "off";
      this.#rosterSearch.addEventListener("input", () => this.#renderRoster());
      const listPane = element(
        "section",
        { className: "kl-roster-list-pane" },
        this.#rosterScopes,
        this.#rosterSearch,
        this.#rosterList
      );
      const body = element(
        "div",
        { className: "kl-roster-body" },
        listPane,
        this.#rosterDetail
      );
      const privacy = element("div", {
        className: "kl-roster-privacy",
        text: "Notes, tags, favorites, and encounter history stay in this browser profile."
      });
      const footer = element("footer", { className: "kl-feature-page-footer" }, privacy);
      this.#saveNotebookButton.addEventListener("click", () => this.#saveNotebook(true));
      this.#rosterNote.maxLength = 2e3;
      this.#rosterNote.rows = 7;
      this.#rosterNote.placeholder = "Private note about this player\u2026";
      this.#rosterNote.addEventListener("input", () => {
        this.#notebookDirty = true;
        this.#saveNotebookButton.disabled = false;
      });
      this.#rosterNote.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          this.#saveNotebook(true);
        }
      });
      this.#rosterTags.maxLength = 200;
      this.#rosterTags.placeholder = "friend, roleplay, trusted";
      this.#rosterTags.addEventListener("input", () => {
        this.#notebookDirty = true;
        this.#saveNotebookButton.disabled = false;
      });
      this.#rosterPage.append(header, body, footer);
    }
    #openRoster(memberNumber) {
      if (!this.settings.get().linkRoster.enabled) {
        this.#openSettings("players");
        this.#rosterEnabledToggle.focus();
        this.#toast("Enable LinkRoster here to add it back to your deck.");
        return;
      }
      this.#showWorkspace("roster");
      this.roster.sync();
      this.#rosterSearch.value = "";
      const selectedEntry = memberNumber === void 0 ? void 0 : this.roster.list("known").find((entry) => entry.memberNumber === memberNumber);
      this.#rosterScope = selectedEntry?.present === true ? "current" : memberNumber !== void 0 ? "known" : this.adapter.isInChatRoom() ? "current" : "known";
      this.#selectedRosterMember = memberNumber;
      this.#notebookDirty = false;
      this.#renderRoster();
      if (memberNumber !== void 0) {
        this.#rosterList.querySelector(`[data-member-number="${memberNumber}"]`)?.focus();
      } else {
        this.#rosterSearch.focus();
      }
    }
    #renderRoster() {
      const roomName = this.adapter.getCurrentRoomName();
      this.#rosterSubtitle.textContent = roomName ? `${roomName} \xB7 private player notebook` : "Private player notebook";
      for (const button of this.#rosterScopes.querySelectorAll(
        ".kl-roster-scope"
      )) {
        button.dataset.active = String(button.dataset.scope === this.#rosterScope);
      }
      const entries = this.roster.list(this.#rosterScope, this.#rosterSearch.value);
      if (!entries.some((entry) => entry.memberNumber === this.#selectedRosterMember)) {
        this.#selectedRosterMember = entries[0]?.memberNumber;
        this.#notebookDirty = false;
      }
      this.#rosterList.replaceChildren();
      if (entries.length === 0) {
        this.#rosterList.append(
          element("div", {
            className: "kl-roster-empty",
            text: this.#rosterScope === "current" && !this.adapter.isInChatRoom() ? "Join a chat room to see its roster." : this.#rosterScope === "favorites" ? "No favorite players yet. Use the star on any player." : this.#rosterSearch.value ? "No players match this search." : "No players recorded yet."
          })
        );
      } else {
        for (const entry of entries) this.#rosterList.append(this.#rosterEntryButton(entry));
      }
      const selected = entries.find(
        (entry) => entry.memberNumber === this.#selectedRosterMember
      );
      if (!this.#notebookDirty) this.#renderRosterDetail(selected);
    }
    #rosterEntryButton(entry) {
      const presence = this.presence.get(entry.memberNumber);
      const badges = element("div", { className: "kl-roster-entry-badges" });
      if (entry.present) badges.append(element("span", { className: "kl-roster-live", text: "HERE" }));
      const status = element("span", {
        className: "kl-roster-presence-label",
        text: presenceLabel(presence.status)
      });
      status.dataset.status = presence.status;
      status.dataset.presenceLabel = "true";
      status.hidden = presence.status === "unknown";
      badges.append(status);
      if (entry.isFriend) badges.append(element("span", { className: "kl-roster-friend", text: "FRIEND" }));
      if (entry.favorite) badges.append(kikiIcon("star", "kl-roster-favorite", true));
      const preview = entry.tags.length ? entry.tags.join(" \xB7 ") : entry.note ? entry.note.replace(/\s+/gu, " ") : entry.lastRoomName || `Member ${entry.memberNumber}`;
      const button = element(
        "button",
        { className: "kl-roster-entry", type: "button" },
        element(
          "div",
          { className: "kl-avatar-wrap" },
          element("div", { className: "kl-avatar", text: avatarText(entry.displayName) }),
          presenceDot(presence.status)
        ),
        element(
          "div",
          { className: "kl-roster-entry-copy" },
          element(
            "div",
            { className: "kl-roster-entry-name-row" },
            element("span", { className: "kl-roster-entry-name", text: entry.displayName }),
            badges
          ),
          element("div", { className: "kl-roster-entry-preview", text: preview })
        ),
        element("span", {
          className: "kl-roster-entry-time",
          text: entry.present ? "now" : formatRelativeTime(entry.lastSeenAt)
        })
      );
      button.dataset.selected = String(entry.memberNumber === this.#selectedRosterMember);
      button.dataset.memberNumber = entry.memberNumber.toString();
      button.addEventListener("click", () => {
        if (entry.memberNumber === this.#selectedRosterMember) return;
        this.#saveNotebook(false);
        this.#selectedRosterMember = entry.memberNumber;
        this.#notebookDirty = false;
        this.#renderRoster();
      });
      this.#bindProfileMenu(button, () => ({
        memberNumber: entry.memberNumber,
        displayName: entry.displayName
      }));
      return button;
    }
    #renderRosterDetail(entry) {
      this.#rosterDetail.replaceChildren();
      if (!entry) {
        this.#rosterDetail.append(
          element("div", {
            className: "kl-roster-detail-empty",
            text: "Select a player to open quick actions and private notes."
          })
        );
        return;
      }
      const favorite = element("button", {
        className: "kl-icon-button kl-roster-star",
        type: "button",
        title: entry.favorite ? "Remove from favorites" : "Add to favorites",
        ariaLabel: entry.favorite ? "Remove from favorites" : "Add to favorites",
        onClick: () => {
          this.#saveNotebook(false);
          this.roster.toggleFavorite(entry.memberNumber, entry.displayName);
          this.#notebookDirty = false;
          this.#renderRoster();
        }
      });
      favorite.append(kikiIcon("star", "kl-favorite-icon", entry.favorite));
      const presence = this.presence.get(entry.memberNumber);
      const identity = element(
        "div",
        { className: "kl-roster-identity" },
        element(
          "div",
          { className: "kl-avatar-wrap" },
          element("div", { className: "kl-avatar kl-roster-avatar", text: avatarText(entry.displayName) }),
          presenceDot(presence.status)
        ),
        element(
          "div",
          { className: "kl-roster-identity-copy" },
          element("div", { className: "kl-roster-name", text: entry.displayName }),
          element("div", {
            className: "kl-roster-number",
            text: `Member ${entry.memberNumber}${entry.present ? " \xB7 in this room" : ""}`
          }),
          element(
            "div",
            { className: "kl-roster-detail-presence", title: presenceDescription(presence) },
            presenceDot(presence.status),
            element("span", { text: presenceLabel(presence.status) }),
            presence.statusMessage ? element("span", { className: "kl-presence-note", text: presence.statusMessage }) : null
          )
        ),
        favorite
      );
      identity.dataset.memberNumber = entry.memberNumber.toString();
      const detailPresence = identity.querySelector(".kl-roster-detail-presence");
      if (detailPresence) detailPresence.dataset.presenceDescription = "true";
      const detailPresenceLabel = detailPresence?.querySelector("span:not(.kl-presence-dot)");
      if (detailPresenceLabel) detailPresenceLabel.dataset.presenceLabel = "true";
      const whisper = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Whisper",
        title: entry.present ? "Set native Whisper target" : "Player is not in this room",
        onClick: () => this.#startRosterWhisper(entry)
      });
      whisper.disabled = !entry.present;
      const beep = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Beep",
        onClick: () => void this.#openRosterBeep(entry)
      });
      const profile = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Profile",
        title: entry.present ? "Open native profile" : "Player is not in this room",
        onClick: () => this.#openRosterProfile(entry)
      });
      profile.disabled = !entry.present;
      const copy = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Copy ID",
        onClick: () => void this.#copyRosterMemberNumber(entry.memberNumber)
      });
      const quickActions = element(
        "div",
        { className: "kl-roster-quick-actions" },
        whisper,
        beep,
        profile,
        copy
      );
      const stats = element(
        "div",
        { className: "kl-roster-stats" },
        this.#rosterStat("Last seen", entry.present ? "Now" : formatFullSeenTime(entry.lastSeenAt)),
        this.#rosterStat("Last room", entry.lastRoomName || "Not recorded"),
        this.#rosterStat("Encounters", entry.encounterCount.toString())
      );
      this.#rosterTags.value = entry.tags.join(", ");
      this.#rosterNote.value = entry.note;
      this.#saveNotebookButton.disabled = true;
      const notebook = element(
        "div",
        { className: "kl-roster-notebook" },
        element("label", { className: "kl-roster-field-label" }, "Tags", this.#rosterTags),
        element("label", { className: "kl-roster-field-label" }, "Private note", this.#rosterNote),
        element(
          "div",
          { className: "kl-roster-note-actions" },
          element("span", { className: "kl-setting-help", text: "Ctrl+Enter to save" }),
          this.#saveNotebookButton
        )
      );
      this.#rosterDetail.append(identity, quickActions, stats, notebook);
      this.#bindProfileMenu(identity, () => ({
        memberNumber: entry.memberNumber,
        displayName: entry.displayName
      }));
      this.presence.request(entry.memberNumber);
    }
    #rosterStat(label, value) {
      return element(
        "div",
        { className: "kl-roster-stat" },
        element("div", { className: "kl-roster-stat-label", text: label }),
        element("div", { className: "kl-roster-stat-value", text: value })
      );
    }
    #saveNotebook(showToast) {
      if (!this.#notebookDirty || this.#selectedRosterMember === void 0) return;
      const entry = this.roster.list("known").find((candidate) => candidate.memberNumber === this.#selectedRosterMember);
      const displayName = entry?.displayName ?? this.adapter.getMemberName(this.#selectedRosterMember);
      const tags = this.#rosterTags.value.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
      this.roster.saveNotebook(
        this.#selectedRosterMember,
        displayName,
        this.#rosterNote.value,
        tags
      );
      this.#notebookDirty = false;
      this.#saveNotebookButton.disabled = true;
      if (showToast) this.#toast("Private player note saved.");
      this.#renderRoster();
    }
    #startRosterWhisper(entry) {
      this.#saveNotebook(false);
      try {
        this.adapter.startWhisper(entry.memberNumber);
        this.close();
      } catch (error) {
        this.#toast(error instanceof Error ? error.message : "Unable to start Whisper", "error");
        this.#renderRoster();
      }
    }
    async #openRosterBeep(entry) {
      this.#saveNotebook(false);
      await this.openChat(entry.memberNumber, entry.displayName);
    }
    #openRosterProfile(entry) {
      this.#saveNotebook(false);
      try {
        this.adapter.openProfile(entry.memberNumber);
        this.close();
      } catch (error) {
        this.#toast(error instanceof Error ? error.message : "Unable to open profile", "error");
        this.#renderRoster();
      }
    }
    async #copyRosterMemberNumber(memberNumber) {
      try {
        await copyText(memberNumber.toString());
        this.#toast(`Member ${memberNumber} copied.`);
      } catch {
        this.#toast("The browser blocked clipboard access.", "error");
      }
    }
    #buildActivitiesPage() {
      const header = element(
        "header",
        { className: "kl-feature-page-header" },
        element(
          "div",
          { className: "kl-feature-page-heading" },
          element("div", { className: "kl-feature-page-eyebrow", text: "ROOM TOOLS" }),
          element("h1", { className: "kl-feature-page-title", text: "Activities" }),
          element("p", {
            className: "kl-feature-page-subtitle",
            text: "Choose a person, preview your emote, then send it through the native room chat."
          })
        )
      );
      this.#activityTargetQuery.type = "search";
      this.#activityTargetQuery.placeholder = "Search room characters";
      this.#activityTargetQuery.autocomplete = "off";
      this.#activityTargetQuery.setAttribute("aria-label", "Search room characters");
      this.#activityTargetQuery.addEventListener("input", () => this.#renderActivitiesPage());
      this.#activityQuery.type = "search";
      this.#activityQuery.placeholder = "Search activities";
      this.#activityQuery.autocomplete = "off";
      this.#activityQuery.setAttribute("aria-label", "Search activity library");
      this.#activityQuery.addEventListener("input", () => this.#renderActivitiesPage());
      this.#activityFilter.setAttribute("aria-label", "Filter activity library");
      this.#activityFilter.addEventListener("change", () => this.#renderActivitiesPage());
      this.#activityStatus.setAttribute("role", "status");
      this.#activityStatus.setAttribute("aria-live", "polite");
      const targetPane = element(
        "section",
        { className: "kl-activity-pane" },
        element("div", { className: "kl-activity-pane-title", text: "Choose target" }),
        this.#activityTargetQuery,
        this.#activityTargetResults
      );
      const libraryPane = element(
        "section",
        { className: "kl-activity-pane" },
        element("div", { className: "kl-activity-pane-title", text: "Choose activity" }),
        element(
          "div",
          { className: "kl-activity-library-controls" },
          this.#activityQuery,
          this.#activityFilter
        ),
        this.#activityLibrary
      );
      const studio = element("div", { className: "kl-activity-studio" }, targetPane, libraryPane);
      const preview = element(
        "section",
        { className: "kl-activity-preview-wrap" },
        element("div", { className: "kl-activity-pane-title", text: "Room preview" }),
        this.#activityPreview
      );
      const body = element(
        "div",
        { className: "kl-activities-body" },
        this.#activityStatus,
        studio,
        preview
      );
      const edit = element("button", {
        className: "kl-text-button kl-edit-activities",
        type: "button",
        text: "Edit activities",
        onClick: () => this.#openSettings("activities")
      });
      this.#performActivityButton.addEventListener("click", () => this.#performActivity());
      const actions = element(
        "footer",
        { className: "kl-feature-page-footer kl-activity-actions" },
        element("span", {
          className: "kl-feature-page-footnote",
          text: "Other players see a standard Bondage Club emote."
        }),
        edit,
        this.#performActivityButton
      );
      this.#activitiesPage.append(header, body, actions);
    }
    #openActivities(activityIndex) {
      if (!this.settings.get().linkActivities.enabled) {
        this.#openSettings("activities");
        this.#activitiesToggle.focus();
        this.#toast("Activity Studio is optional. Enable its shortcut here when you want it.");
        return;
      }
      this.#showWorkspace("activities");
      if (activityIndex !== void 0 && Number.isInteger(activityIndex) && activityIndex >= 0) {
        this.#selectedActivityIndex = activityIndex;
      }
      this.#activityTargetQuery.value = "";
      this.#activityQuery.value = "";
      this.#activityFilter.value = "all";
      const targets = this.activities.getTargets();
      const preferredTarget = targets.find(
        (target) => target.memberNumber === this.#selectedActivityTarget?.memberNumber
      ) ?? targets.find((target) => target.memberNumber === this.#activePeer);
      this.#selectedActivityTarget = preferredTarget ?? targets[0];
      const activityCount = this.settings.get().linkActivities.activities.length;
      if (this.#selectedActivityIndex >= activityCount) this.#selectedActivityIndex = 0;
      this.#renderActivitiesPage();
      if (activityIndex !== void 0) {
        this.#activityLibrary.querySelector(`[data-activity-index="${this.#selectedActivityIndex}"]`)?.focus();
      } else {
        this.#activityTargetQuery.focus();
      }
    }
    #renderActivitiesPage() {
      const targets = this.activities.getTargets();
      const currentTarget = targets.find(
        (target2) => target2.memberNumber === this.#selectedActivityTarget?.memberNumber
      );
      this.#selectedActivityTarget = currentTarget;
      const query = this.#activityTargetQuery.value.trim().toLocaleLowerCase();
      const visibleTargets = targets.filter(
        (target2) => !query || target2.memberName.toLocaleLowerCase().includes(query) || target2.memberNumber.toString().includes(query)
      );
      this.#activityTargetResults.replaceChildren();
      if (visibleTargets.length === 0) {
        this.#activityTargetResults.append(
          element("div", {
            className: "kl-contact-empty",
            text: targets.length === 0 ? "No other characters are available." : "No matching characters."
          })
        );
      } else {
        for (const target2 of visibleTargets) {
          const button = element(
            "button",
            { className: "kl-activity-target", type: "button" },
            element("div", { className: "kl-avatar", text: avatarText(target2.memberName) }),
            element(
              "div",
              { className: "kl-contact-copy" },
              element("div", { className: "kl-contact-name", text: target2.memberName }),
              element("div", {
                className: "kl-contact-number",
                text: `Member ${target2.memberNumber}`
              })
            )
          );
          button.dataset.selected = String(
            target2.memberNumber === this.#selectedActivityTarget?.memberNumber
          );
          button.addEventListener("click", () => {
            this.#selectedActivityTarget = target2;
            this.#renderActivitiesPage();
          });
          this.#activityTargetResults.append(button);
        }
      }
      const roomActivities = this.settings.get().linkActivities.activities;
      this.#syncActivityFilter(roomActivities);
      const activityQuery = normalizeFinderText(this.#activityQuery.value);
      const activityFilter = this.#activityFilter.value || "all";
      const visibleActivities = roomActivities.map((activity2, index) => ({ activity: activity2, index })).filter(({ activity: activity2 }) => {
        if (activityQuery && !normalizeFinderText(
          `${activity2.label} ${activity2.template} ${activity2.category} ${activity2.pack}`
        ).includes(activityQuery)) {
          return false;
        }
        if (activityFilter === "favorites") return activity2.favorite;
        if (activityFilter.startsWith("category:")) {
          return activity2.category === activityFilter.slice("category:".length);
        }
        if (activityFilter.startsWith("pack:")) {
          return activity2.pack === activityFilter.slice("pack:".length);
        }
        return true;
      }).sort(
        (left, right) => Number(right.activity.favorite) - Number(left.activity.favorite) || left.activity.label.localeCompare(right.activity.label)
      );
      if (!visibleActivities.some(({ index }) => index === this.#selectedActivityIndex)) {
        this.#selectedActivityIndex = visibleActivities[0]?.index ?? 0;
      }
      this.#activityLibrary.replaceChildren();
      if (roomActivities.length === 0) {
        this.#activityLibrary.append(
          element("div", {
            className: "kl-contact-empty",
            text: "Your activity library is empty. Choose Edit activities to create one."
          })
        );
      } else if (visibleActivities.length === 0) {
        this.#activityLibrary.append(
          element("div", {
            className: "kl-contact-empty",
            text: "No activities match this search or filter."
          })
        );
      } else {
        for (const { activity: activity2, index } of visibleActivities) {
          const select = element(
            "button",
            { className: "kl-activity-card-main", type: "button" },
            element(
              "div",
              { className: "kl-activity-card-heading" },
              element("div", { className: "kl-activity-card-label", text: activity2.label }),
              element("div", {
                className: "kl-activity-card-meta",
                text: `${activity2.category} \xB7 ${activity2.pack}`
              })
            ),
            element("div", { className: "kl-activity-card-template", text: activity2.template })
          );
          select.dataset.selected = String(index === this.#selectedActivityIndex);
          select.setAttribute("aria-pressed", String(index === this.#selectedActivityIndex));
          select.dataset.activityIndex = index.toString();
          select.addEventListener("click", () => {
            this.#selectedActivityIndex = index;
            this.#renderActivitiesPage();
          });
          const favorite = element("button", {
            className: "kl-icon-button kl-activity-favorite",
            type: "button",
            title: activity2.favorite ? "Remove from favorite activities" : "Add to favorite activities",
            ariaLabel: activity2.favorite ? `Remove ${activity2.label} from favorites` : `Add ${activity2.label} to favorites`
          });
          favorite.dataset.active = String(activity2.favorite);
          favorite.setAttribute("aria-pressed", String(activity2.favorite));
          favorite.append(kikiIcon("star", "kl-icon", activity2.favorite));
          favorite.addEventListener("click", () => this.#toggleActivityFavorite(index));
          const card = element("div", { className: "kl-activity-card" }, select, favorite);
          card.dataset.favorite = String(activity2.favorite);
          this.#activityLibrary.append(card);
        }
      }
      const activity = roomActivities[this.#selectedActivityIndex];
      const target = this.#selectedActivityTarget;
      if (!this.adapter.isInChatRoom()) {
        this.#activityStatus.textContent = "Open Activity Studio while you are inside a chat room.";
        this.#activityStatus.dataset.kind = "error";
      } else if (!this.activities.isAvailable()) {
        this.#activityStatus.textContent = "The native room chat is still loading.";
        this.#activityStatus.dataset.kind = "error";
      } else {
        this.#activityStatus.textContent = `${targets.length} ${targets.length === 1 ? "target" : "targets"} available in this room.`;
        this.#activityStatus.dataset.kind = "ready";
      }
      if (activity && target) {
        this.#activityPreview.textContent = `${this.adapter.getOwnName()} ${this.activities.preview(activity, target)}`;
      } else {
        this.#activityPreview.textContent = activity ? "Choose a character to preview this activity." : "Create an activity in KikiLink settings first.";
      }
      this.#performActivityButton.disabled = !activity || !target || !this.activities.isAvailable();
    }
    #syncActivityFilter(activities) {
      const current = this.#activityFilter.value || "all";
      const categories = [...new Set(activities.map((activity) => activity.category))].sort(
        (left, right) => left.localeCompare(right)
      );
      const packs = [...new Set(activities.map((activity) => activity.pack))].sort(
        (left, right) => left.localeCompare(right)
      );
      this.#activityFilter.replaceChildren(
        selectOption("all", "All activities"),
        selectOption("favorites", "Favorites"),
        ...categories.map((category) => selectOption(`category:${category}`, `Category: ${category}`)),
        ...packs.map((pack) => selectOption(`pack:${pack}`, `Pack: ${pack}`))
      );
      this.#activityFilter.value = [...this.#activityFilter.options].some(
        (option) => option.value === current
      ) ? current : "all";
    }
    #toggleActivityFavorite(index) {
      const settings = this.settings.update((draft) => {
        const activity2 = draft.linkActivities.activities[index];
        if (activity2) activity2.favorite = !activity2.favorite;
      });
      const activity = settings.linkActivities.activities[index];
      if (!activity) return;
      this.#renderActivitiesPage();
      this.#toast(activity.favorite ? `${activity.label} added to favorites.` : `${activity.label} removed from favorites.`);
    }
    #performActivity() {
      const activity = this.settings.get().linkActivities.activities[this.#selectedActivityIndex];
      const target = this.#selectedActivityTarget;
      if (!activity || !target) return;
      try {
        this.activities.perform(activity, target);
        this.#toast(`${activity.label} sent to the room.`);
      } catch (error) {
        this.#renderActivitiesPage();
        this.#toast(error instanceof Error ? error.message : "Unable to perform this activity", "error");
      }
    }
    #settingRow(name, help, control) {
      return element(
        "div",
        { className: "kl-setting-row" },
        element(
          "div",
          { className: "kl-setting-copy" },
          element("div", { className: "kl-setting-name", text: name }),
          element("div", { className: "kl-setting-help", text: help })
        ),
        control
      );
    }
    #dialogCloseButton(ariaLabel, onClick) {
      const button = element("button", {
        className: "kl-icon-button",
        type: "button",
        title: "Close",
        ariaLabel,
        onClick
      });
      button.append(kikiIcon("close"));
      return button;
    }
    async #renderHome() {
      const ownName = this.adapter.getOwnName().trim();
      const greeting = greetingForCurrentTime();
      this.#homeGreeting.textContent = ownName && ownName.toLocaleLowerCase() !== "me" ? `${greeting}, ${ownName}.` : `${greeting}.`;
      const conversations = await this.service.listConversations();
      const onlineFriendCount = typeof this.adapter.getOnlineFriends === "function" ? this.adapter.getOnlineFriends().length : 0;
      const recent = [...conversations].sort(
        (left, right) => right.lastMessageAt - left.lastMessageAt
      )[0];
      if (this.#unreadCount > 0) {
        this.#homeChatMetric.textContent = `${this.#unreadCount} unread \xB7 ${conversations.length} chats`;
      } else if (recent && recent.lastMessageAt > 0) {
        this.#homeChatMetric.textContent = `Last with ${conversationDisplayName(recent)} \xB7 ${formatRelativeTime(recent.lastMessageAt)}`;
      } else if (conversations.length > 0) {
        this.#homeChatMetric.textContent = `${conversations.length} saved ${conversations.length === 1 ? "chat" : "chats"}`;
      } else if (onlineFriendCount > 0) {
        this.#homeChatMetric.textContent = `${onlineFriendCount} ${onlineFriendCount === 1 ? "friend" : "friends"} online`;
      } else {
        this.#homeChatMetric.textContent = "Start your first Beep chat";
      }
      this.#renderHomeStatus();
      this.#renderHomeAction(conversations, recent);
    }
    #renderHomeAction(conversations, recent) {
      const unread = conversations.find((conversation) => conversation.unread > 0);
      const settings = this.settings.get();
      const inRoom = typeof this.adapter.isInChatRoom === "function" && this.adapter.isInChatRoom();
      const roomName = typeof this.adapter.getCurrentRoomName === "function" ? this.adapter.getCurrentRoomName()?.trim() : void 0;
      this.#homeActionButton.disabled = false;
      if (unread) {
        const total = Math.max(
          this.#unreadCount,
          conversations.reduce((count2, conversation) => count2 + conversation.unread, 0)
        );
        this.#homeAction = {
          kind: "chat",
          peerNumber: unread.peerNumber,
          peerName: unread.peerName
        };
        this.#homeActionIcon.replaceChildren(kikiIcon("chat"));
        this.#homeActionTitle.textContent = `${total} unread ${total === 1 ? "Beep" : "Beeps"}`;
        this.#homeActionDescription.textContent = total === unread.unread ? `Open the conversation with ${conversationDisplayName(unread)} and continue when you are ready.` : `Start with ${conversationDisplayName(unread)}, then work through the rest at your pace.`;
        this.#homeActionMeta.textContent = total === unread.unread ? `From ${conversationDisplayName(unread)}` : "Across recent chats";
        this.#homeActionButton.textContent = total === 1 ? "Read message" : "Read messages";
      } else if (conversations.length === 0) {
        this.#homeAction = { kind: "new-chat" };
        this.#homeActionIcon.replaceChildren(kikiIcon("plus"));
        this.#homeActionTitle.textContent = "Start your first chat";
        this.#homeActionDescription.textContent = "Choose someone you know or enter a member number. KikiLink keeps the conversation together.";
        this.#homeActionMeta.textContent = "Takes only a moment";
        this.#homeActionButton.textContent = "Start a chat";
      } else if (settings.linkRoster.enabled && inRoom && this.#presentCount > 0) {
        this.#homeAction = { kind: "roster" };
        this.#homeActionIcon.replaceChildren(kikiIcon("users"));
        this.#homeActionTitle.textContent = roomName ? `See who is in ${roomName}` : "See who is here";
        this.#homeActionDescription.textContent = "Open Players to Whisper, Beep, view a profile, or add a private note.";
        this.#homeActionMeta.textContent = `${this.#presentCount} ${this.#presentCount === 1 ? "person" : "people"} here now`;
        this.#homeActionButton.textContent = "View players";
      } else if (recent) {
        this.#homeAction = {
          kind: "chat",
          peerNumber: recent.peerNumber,
          peerName: recent.peerName
        };
        this.#homeActionIcon.replaceChildren(kikiIcon("chat"));
        this.#homeActionTitle.textContent = `Continue with ${conversationDisplayName(recent)}`;
        this.#homeActionDescription.textContent = "Pick up your most recent Beep conversation.";
        this.#homeActionMeta.textContent = recent.lastMessageAt > 0 ? formatRelativeTime(recent.lastMessageAt) : "Conversation ready";
        this.#homeActionButton.textContent = "Open chat";
      } else {
        this.#homeAction = { kind: "chat" };
        this.#homeActionIcon.replaceChildren(kikiIcon("chat"));
        this.#homeActionTitle.textContent = "Open your chats";
        this.#homeActionDescription.textContent = "Find a conversation or start a new Beep.";
        this.#homeActionMeta.textContent = "Recent chats are kept together";
        this.#homeActionButton.textContent = "Open Chat";
      }
      this.#homeActionButton.dataset.action = this.#homeAction.kind;
    }
    #renderHomeStatus() {
      const settings = this.settings.get();
      const inRoom = typeof this.adapter.isInChatRoom === "function" && this.adapter.isInChatRoom();
      const roomName = typeof this.adapter.getCurrentRoomName === "function" ? this.adapter.getCurrentRoomName() : void 0;
      this.#homeConnection.textContent = this.#connectionText.textContent || "Connecting";
      this.#homeConnection.dataset.state = this.#connectionState;
      this.#homeRoom.textContent = roomName || (inRoom ? "Unnamed room" : "Not in a chat room");
      this.#renderOwnPresence();
      this.#rosterButton.dataset.available = String(settings.linkRoster.enabled);
      this.#homeRosterCard.dataset.available = String(settings.linkRoster.enabled);
      this.#homeRosterMetric.textContent = settings.linkRoster.enabled ? this.#presentCount > 0 ? `${this.#presentCount} ${this.#presentCount === 1 ? "person" : "people"} here now` : inRoom ? "No other players in this room" : "Open while you are in a room" : "Disabled \xB7 tap to enable";
      this.#homeRosterAction.textContent = settings.linkRoster.enabled ? "View players" : "Turn on Players";
      this.#activitiesButton.dataset.available = String(settings.linkActivities.enabled);
      this.#homeActivitiesCard.dataset.available = String(settings.linkActivities.enabled);
      this.#homeActivitiesMetric.textContent = settings.linkActivities.enabled ? `${settings.linkActivities.activities.length} saved ${settings.linkActivities.activities.length === 1 ? "activity" : "activities"}` : "Optional \xB7 tap to enable";
      this.#homeActivitiesAction.textContent = settings.linkActivities.enabled ? "Choose activity" : "Turn on Activities";
      const themeLabel = settings.ui.theme === "light" ? "Light paper" : settings.ui.theme === "system" ? "System theme" : "Dark lacquer";
      const comfortLabel = settings.ui.density === "super-compact" ? "Super compact" : settings.ui.density === "compact" ? "Compact" : "Comfortable";
      this.#homeSettingsMetric.textContent = `${themeLabel} \xB7 ${comfortLabel} \xB7 ${settings.ui.accent.toUpperCase()}`;
    }
    #renderOwnPresence() {
      const enabled = this.settings.get().linkPresence.enabled;
      const snapshot = this.presence.get(this.adapter.getOwnMemberNumber());
      const label = enabled ? presenceLabel(snapshot.status) : "Presence off";
      this.#presenceTriggerDot.dataset.status = enabled ? snapshot.status : "unknown";
      this.#presenceTriggerLabel.textContent = label;
      this.#presenceTrigger.title = snapshot.statusMessage ? `${label} \xB7 ${snapshot.statusMessage}` : `KikiLink status: ${label}`;
      this.#homePresence.replaceChildren(
        presenceDot(enabled ? snapshot.status : "unknown"),
        element("span", { text: label })
      );
      this.#homePresence.title = this.#presenceTrigger.title;
    }
    #renderActivePresence() {
      this.#chatPresence.replaceChildren();
      this.#chatRoom.replaceChildren();
      if (this.#activePeer === void 0) {
        this.#renderTypingIndicator();
        return;
      }
      const snapshot = this.presence.get(this.#activePeer);
      this.#chatPresence.append(
        presenceDot(snapshot.status),
        element("span", { text: presenceLabel(snapshot.status) })
      );
      if (snapshot.statusMessage) {
        this.#chatPresence.append(
          element("span", { className: "kl-presence-note", text: snapshot.statusMessage })
        );
      }
      if (snapshot.roomName) {
        this.#chatRoom.replaceChildren(
          kikiIcon("location", "kl-chat-room-icon"),
          element("span", { className: "kl-chat-room-name", text: snapshot.roomName })
        );
        this.#chatRoom.hidden = false;
        this.#chatRoom.title = `Current room: ${snapshot.roomName}`;
      } else {
        this.#chatRoom.hidden = true;
        this.#chatRoom.removeAttribute("title");
      }
      this.#chatPresence.title = presenceDescription(snapshot);
      this.#renderTypingIndicator();
    }
    #renderTypingIndicator() {
      const typing = this.settings.get().linkChat.typingIndicators && this.#activePeer !== void 0 && this.presence.isTyping(this.#activePeer);
      this.#typingIndicator.hidden = !typing;
      if (!typing) {
        this.#typingIndicator.replaceChildren();
        return;
      }
      this.#typingIndicator.replaceChildren(
        element("span", { className: "kl-typing-name", text: `${this.#activeName} is typing` }),
        element(
          "span",
          { className: "kl-typing-dots", ariaLabel: "" },
          element("i"),
          element("i"),
          element("i")
        )
      );
    }
    #updateLocalTyping() {
      if (this.#typingStopTimer !== void 0) clearTimeout(this.#typingStopTimer);
      this.#typingStopTimer = void 0;
      if (this.#activePeer === void 0 || !this.#composer.value.trim()) {
        this.#stopLocalTyping();
        return;
      }
      this.presence.setTyping(this.#activePeer, true);
      this.#typingStopTimer = setTimeout(() => {
        this.#typingStopTimer = void 0;
        if (this.#activePeer !== void 0) this.presence.setTyping(this.#activePeer, false, true);
      }, 2400);
    }
    #stopLocalTyping() {
      if (this.#typingStopTimer !== void 0) clearTimeout(this.#typingStopTimer);
      this.#typingStopTimer = void 0;
      if (this.#activePeer !== void 0) this.presence.setTyping(this.#activePeer, false, true);
    }
    #schedulePresenceRender(memberNumber) {
      if (memberNumber === void 0) this.#pendingPresenceAll = true;
      else this.#pendingPresenceMembers.add(memberNumber);
      if (this.#presenceRenderFrame !== void 0) return;
      this.#presenceRenderFrame = requestAnimationFrame(() => {
        this.#presenceRenderFrame = void 0;
        const updateAll = this.#pendingPresenceAll;
        const members = [...this.#pendingPresenceMembers];
        this.#pendingPresenceAll = false;
        this.#pendingPresenceMembers.clear();
        this.#updateVisiblePresence(updateAll ? void 0 : members);
        if (updateAll || this.#activePeer !== void 0 && members.includes(this.#activePeer)) {
          this.#renderActivePresence();
        }
        const ownMemberNumber = this.adapter.getOwnMemberNumber();
        if (updateAll || members.includes(ownMemberNumber)) this.#renderHomeStatus();
        if (updateAll) void this.#renderHome();
      });
    }
    #updateVisiblePresence(memberNumbers) {
      const filter = memberNumbers ? new Set(memberNumbers) : void 0;
      for (const target of this.#shadow.querySelectorAll("[data-member-number]")) {
        const memberNumber = Number(target.dataset.memberNumber);
        if (!Number.isSafeInteger(memberNumber) || filter && !filter.has(memberNumber)) continue;
        const snapshot = this.presence.get(memberNumber);
        for (const dot of target.querySelectorAll(".kl-presence-dot")) {
          dot.dataset.status = snapshot.status;
        }
        for (const label of target.querySelectorAll("[data-presence-label]")) {
          label.textContent = presenceLabel(snapshot.status);
          label.dataset.status = snapshot.status;
          label.hidden = snapshot.status === "unknown";
        }
        const description = target.querySelector("[data-presence-description]");
        if (description) description.title = presenceDescription(snapshot);
      }
    }
    async #renderConversations() {
      const query = this.#search.value.trim().toLocaleLowerCase();
      const allConversations = await this.service.listConversations();
      for (const conversation of allConversations) {
        const nickname = this.adapter.getMemberNickname(conversation.peerNumber);
        if (nickname && nickname !== conversation.peerName) {
          conversation.peerName = nickname;
          void this.service.setPeerName(conversation.peerNumber, nickname);
        }
        if (conversation.peerNumber === this.#activePeer) {
          const displayName = conversationDisplayName(conversation);
          this.#activeName = displayName;
          this.#activeNativeName = conversation.peerName;
          this.#chatName.textContent = displayName;
          this.#chatAvatar.textContent = avatarText(displayName);
        }
      }
      const conversations = allConversations.filter((conversation) => {
        if (!query) return true;
        return conversationDisplayName(conversation).toLocaleLowerCase().includes(query) || conversation.peerName.toLocaleLowerCase().includes(query) || conversation.peerNumber.toString().includes(query) || conversation.lastMessage.toLocaleLowerCase().includes(query);
      });
      this.#conversationList.replaceChildren();
      if (conversations.length === 0) {
        this.#conversationList.append(
          element("div", {
            className: "kl-empty-copy",
            text: query ? "No matching chats." : "No conversations yet."
          })
        );
        return;
      }
      for (const conversation of conversations) {
        this.#conversationList.append(this.#conversationButton(conversation));
      }
    }
    #conversationButton(conversation) {
      const presence = this.presence.get(conversation.peerNumber);
      const displayName = conversationDisplayName(conversation);
      const nameRow = element(
        "div",
        { className: "kl-conversation-name-row" },
        element("span", { className: "kl-conversation-name", text: displayName }),
        conversation.pinned ? kikiIcon("pin", "kl-pin", true) : null
      );
      const prefix = conversation.lastDirection === "outgoing" ? "You: " : "";
      const previewText = messagePreview(conversation.lastMessage);
      const preview = previewText ? `${prefix}${previewText}` : `Member ${conversation.peerNumber}`;
      const main = element(
        "div",
        { className: "kl-conversation-main" },
        nameRow,
        element("div", { className: "kl-conversation-preview", text: preview })
      );
      const side = element(
        "div",
        { className: "kl-conversation-side" },
        element("span", {
          className: "kl-time",
          text: conversation.lastMessageAt > 0 ? formatConversationTime(conversation.lastMessageAt) : ""
        }),
        conversation.unread > 0 ? element("span", {
          className: "kl-unread",
          text: conversation.unread > 99 ? "99+" : conversation.unread.toString()
        }) : null
      );
      const button = element(
        "button",
        { className: "kl-conversation", type: "button" },
        element(
          "div",
          { className: "kl-avatar-wrap" },
          element("div", { className: "kl-avatar", text: avatarText(displayName) }),
          presenceDot(presence.status)
        ),
        main,
        side
      );
      button.dataset.memberNumber = conversation.peerNumber.toString();
      button.dataset.active = String(conversation.peerNumber === this.#activePeer);
      button.addEventListener(
        "click",
        () => void this.#selectConversation(conversation.peerNumber, conversation.peerName)
      );
      this.#bindProfileMenu(button, () => ({
        memberNumber: conversation.peerNumber,
        displayName
      }));
      return button;
    }
    async #selectConversation(peerNumber, peerName) {
      if (this.#activePeer !== void 0 && this.#activePeer !== peerNumber) {
        this.#stopLocalTyping();
      }
      const nativeName = this.adapter.getMemberNickname(peerNumber) ?? peerName;
      const conversation = await this.service.ensureConversation(peerNumber, nativeName);
      if (nativeName !== conversation.peerName) {
        await this.service.setPeerName(peerNumber, nativeName);
        conversation.peerName = nativeName;
      }
      const displayName = conversationDisplayName(conversation);
      this.#activePeer = peerNumber;
      this.#activeName = displayName;
      this.#activeNativeName = nativeName;
      this.#panel.dataset.mobileView = "chat";
      await this.service.markRead(peerNumber);
      this.#empty.hidden = true;
      this.#chat.hidden = false;
      this.#chatAvatar.textContent = avatarText(displayName);
      this.#chatName.textContent = displayName;
      this.#chatNumber.textContent = `Member ${peerNumber}`;
      this.#messageRenderLimit = 120;
      this.#messageRenderPeer = peerNumber;
      this.#renderedMessageIds.clear();
      this.#renderActivePresence();
      this.presence.request(peerNumber);
      this.#renderPinButton(conversation.pinned);
      this.#composer.value = conversation.draft;
      this.#includeRoom.checked = this.settings.get().linkChat.includeRoomByDefault;
      this.#attachImageButton.disabled = !this.adapter.canSendBeep();
      this.#resizeComposer();
      this.#updateCounter();
      await Promise.all([this.#renderMessages(peerNumber), this.refresh()]);
      this.#composer.focus();
    }
    async #renderMessages(peerNumber, scrollToBottom = true) {
      const messages = await this.service.getMessages(peerNumber, this.#messageRenderLimit + 1);
      if (this.#activePeer !== peerNumber) return;
      const hasOlder = messages.length > this.#messageRenderLimit;
      const visibleMessages = hasOlder ? messages.slice(-this.#messageRenderLimit) : messages;
      this.#messageRenderPeer = peerNumber;
      this.#renderedMessageIds.clear();
      this.#messages.replaceChildren();
      if (visibleMessages.length === 0) {
        this.#messages.append(
          element("div", {
            className: "kl-empty-copy",
            text: "No Beeps here yet. Send the first one."
          })
        );
        return;
      }
      if (hasOlder) {
        this.#messages.append(this.#olderMessagesControl(peerNumber));
      }
      for (const message of visibleMessages) {
        this.#renderedMessageIds.add(message.id);
        this.#messages.append(this.#messageNode(message));
      }
      if (scrollToBottom) {
        requestAnimationFrame(() => {
          this.#messages.scrollTop = this.#messages.scrollHeight;
        });
      }
    }
    async #loadOlderMessages(peerNumber) {
      if (this.#activePeer !== peerNumber) return;
      const previousHeight = this.#messages.scrollHeight;
      const previousTop = this.#messages.scrollTop;
      this.#messageRenderLimit += 120;
      await this.#renderMessages(peerNumber, false);
      requestAnimationFrame(() => {
        this.#messages.scrollTop = previousTop + (this.#messages.scrollHeight - previousHeight);
      });
    }
    #olderMessagesControl(peerNumber) {
      return element(
        "div",
        { className: "kl-load-older" },
        element("button", {
          className: "kl-text-button",
          type: "button",
          text: "Load earlier messages",
          onClick: () => void this.#loadOlderMessages(peerNumber)
        })
      );
    }
    #messageNode(message) {
      const body = this.#renderMessageBody(message);
      const actions = element(
        "div",
        { className: "kl-message-side-actions" },
        element("button", {
          className: "kl-message-action",
          type: "button",
          title: "Quote this message in your reply",
          ariaLabel: "Reply to message",
          onClick: () => this.#replyToMessage(message)
        }, kikiIcon("reply")),
        element("button", {
          className: "kl-message-action",
          type: "button",
          title: "Copy message",
          ariaLabel: "Copy message",
          onClick: () => void this.#copyMessage(message.content)
        }, kikiIcon("copy"))
      );
      const meta = element(
        "div",
        { className: "kl-message-meta" },
        message.roomName ? element("span", { className: "kl-message-room", text: message.roomName }) : null,
        element("time", { text: formatMessageTime(message.sentAt) })
      );
      const bubble = element("div", { className: "kl-message-bubble" }, body, meta);
      const row = element("div", { className: "kl-message-row" }, bubble, actions);
      row.dataset.direction = message.direction;
      row.dataset.messageId = message.id;
      return row;
    }
    #appendMessage(message) {
      if (this.#activePeer !== message.peerNumber || this.#messageRenderPeer !== message.peerNumber || this.#renderedMessageIds.has(message.id)) {
        return;
      }
      const nearBottom = this.#messages.scrollHeight - this.#messages.scrollTop - this.#messages.clientHeight < 96;
      this.#messages.querySelector(".kl-empty-copy")?.remove();
      this.#messages.append(this.#messageNode(message));
      this.#renderedMessageIds.add(message.id);
      const rows = this.#messages.querySelectorAll(".kl-message-row");
      if (rows.length > this.#messageRenderLimit) {
        if (!this.#messages.querySelector(".kl-load-older")) {
          this.#messages.prepend(this.#olderMessagesControl(message.peerNumber));
        }
        const oldest = rows[0];
        if (oldest) {
          if (oldest.dataset.messageId) this.#renderedMessageIds.delete(oldest.dataset.messageId);
          oldest.remove();
        }
      }
      if (message.direction === "outgoing" || nearBottom) {
        requestAnimationFrame(() => {
          this.#messages.scrollTop = this.#messages.scrollHeight;
        });
      }
    }
    async #send() {
      const message = this.#composer.value.trim();
      if (!message) return;
      await this.#sendContent(message, true);
    }
    async #sendContent(message, clearComposer) {
      if (this.#activePeer === void 0) return false;
      let sent = false;
      try {
        const event = this.adapter.sendBeep(
          this.#activePeer,
          message,
          this.#includeRoom.checked
        );
        sent = true;
        const storedMessage = await this.service.capture(event, true);
        this.#stopLocalTyping();
        if (clearComposer) {
          this.#composer.value = "";
          await this.service.setDraft(this.#activePeer, this.#activeNativeName, "");
          this.#resizeComposer();
          this.#updateCounter();
        }
        await this.onMessage(this.#activePeer, false, storedMessage);
        if (clearComposer) this.#composer.focus();
        return true;
      } catch (error) {
        this.#toast(
          sent ? "Beep was sent, but KikiLink could not save it to local history." : error instanceof Error ? error.message : "Unable to send Beep",
          "error"
        );
        return false;
      }
    }
    #renderMessageBody(message) {
      const content = message.content || "Beep without a message";
      const links = parseMessageLinks(content);
      const body = element("div", { className: "kl-message-content" });
      let cursor = 0;
      for (const link of links) {
        if (link.start > cursor) body.append(document.createTextNode(content.slice(cursor, link.start)));
        const anchor = element("a", { className: "kl-message-link", text: content.slice(link.start, link.end) });
        anchor.href = link.url;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer nofollow";
        anchor.referrerPolicy = "no-referrer";
        body.append(anchor);
        cursor = link.end;
      }
      if (cursor < content.length) body.append(document.createTextNode(content.slice(cursor)));
      const imageUrls = [...new Set(links.filter((link) => link.image).map((link) => link.url))].slice(0, 2);
      if (imageUrls.length === 0 || this.settings.get().linkChat.imagePreviews === "never") return body;
      const media = element("div", { className: "kl-message-media" });
      for (const url of imageUrls) media.append(this.#imageCard(url));
      body.append(media);
      return body;
    }
    #imageCard(url) {
      const parsed = new URL(url);
      const preview = element("div", { className: "kl-image-preview" });
      const open = element("a", { className: "kl-image-open", text: "Open original \u2197" });
      open.href = url;
      open.target = "_blank";
      open.rel = "noopener noreferrer nofollow";
      open.referrerPolicy = "no-referrer";
      const card = element(
        "figure",
        { className: "kl-image-card" },
        preview,
        element(
          "figcaption",
          { className: "kl-image-caption" },
          element("span", { className: "kl-image-host", text: parsed.hostname }),
          open
        )
      );
      if (this.settings.get().linkChat.imagePreviews === "always") {
        this.#loadRemoteImage(preview, url);
      } else {
        preview.append(
          kikiIcon("image", "kl-image-placeholder-icon"),
          element("span", { className: "kl-image-placeholder-title", text: "Remote image" }),
          element("span", {
            className: "kl-image-placeholder-help",
            text: "Load it only when you trust this host."
          }),
          element("button", {
            className: "kl-text-button kl-image-load",
            type: "button",
            text: "Show image",
            onClick: () => this.#loadRemoteImage(preview, url)
          })
        );
      }
      return card;
    }
    #loadRemoteImage(preview, url) {
      const image = document.createElement("img");
      image.alt = "Image shared in LinkChat";
      image.loading = "lazy";
      image.decoding = "async";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("load", () => {
        preview.dataset.state = "loaded";
      });
      image.addEventListener("error", () => {
        preview.dataset.state = "error";
        preview.replaceChildren(
          element("span", { className: "kl-image-placeholder-icon", text: "!" }),
          element("span", { text: "This image could not be loaded. You can still open the original link." })
        );
      });
      preview.dataset.state = "loading";
      preview.replaceChildren(image);
      image.src = url;
    }
    #replyToMessage(message) {
      const author = message.direction === "incoming" ? this.#activeNativeName : this.adapter.getOwnName();
      const excerpt = message.content.replace(/\s+/gu, " ").trim().slice(0, 180) || "Beep";
      const quote = `> ${author}: ${excerpt}
`;
      const separator = this.#composer.value && !this.#composer.value.endsWith("\n") ? "\n" : "";
      if (this.#composer.value.length + separator.length + quote.length > 1e3) {
        this.#toast("That reply would exceed the 1000 character Beep limit.", "error");
        return;
      }
      this.#composer.value += `${separator}${quote}`;
      this.#composer.dispatchEvent(new Event("input", { bubbles: true }));
      this.#composer.focus();
      this.#composer.setSelectionRange(this.#composer.value.length, this.#composer.value.length);
    }
    async #copyMessage(content) {
      try {
        await copyText(content);
        this.#toast("Message copied.");
      } catch {
        this.#toast("The browser blocked clipboard access.", "error");
      }
    }
    async #togglePin() {
      if (this.#activePeer === void 0) return;
      const pinned = await this.service.togglePinned(this.#activePeer);
      this.#renderPinButton(pinned);
      await this.#renderConversations();
    }
    #renderPinButton(pinned) {
      this.#pinButton.replaceChildren(kikiIcon("pin", "kl-pin-button-icon", pinned));
      this.#pinButton.title = pinned ? "Unpin conversation" : "Pin conversation";
      this.#pinButton.setAttribute(
        "aria-label",
        pinned ? "Unpin conversation" : "Pin conversation"
      );
      this.#pinButton.setAttribute("aria-pressed", String(pinned));
    }
    #bindProfileMenu(target, profile) {
      if (!(target instanceof HTMLButtonElement)) {
        target.tabIndex = 0;
        target.setAttribute("role", "button");
      }
      target.classList.add("kl-profile-menu-target");
      const existingTitle = target.title.trim();
      target.title = existingTitle ? `${existingTitle} \xB7 Right-click or hold for actions` : "Right-click or hold for player actions";
      target.addEventListener("contextmenu", (event) => {
        const value = profile();
        if (!value) return;
        event.preventDefault();
        event.stopPropagation();
        void this.#openProfileMenu(value.memberNumber, value.displayName, event.clientX, event.clientY);
      });
      target.addEventListener("keydown", (event) => {
        if (event.key !== "ContextMenu" && !(event.key === "F10" && event.shiftKey)) return;
        const value = profile();
        if (!value) return;
        event.preventDefault();
        const bounds = target.getBoundingClientRect();
        void this.#openProfileMenu(
          value.memberNumber,
          value.displayName,
          bounds.left + bounds.width / 2,
          bounds.top + Math.min(bounds.height, 44)
        );
      });
      let timer;
      let startX = 0;
      let startY = 0;
      const cancel = () => {
        if (timer !== void 0) clearTimeout(timer);
        timer = void 0;
      };
      target.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" || event.button !== 0) return;
        const value = profile();
        if (!value) return;
        startX = event.clientX;
        startY = event.clientY;
        cancel();
        timer = setTimeout(() => {
          timer = void 0;
          this.#suppressProfileClickUntil.set(target, Date.now() + 700);
          void this.#openProfileMenu(value.memberNumber, value.displayName, startX, startY);
        }, 520);
      });
      target.addEventListener("pointermove", (event) => {
        if (timer === void 0) return;
        if (Math.hypot(event.clientX - startX, event.clientY - startY) > 9) cancel();
      });
      target.addEventListener("pointerup", cancel);
      target.addEventListener("pointercancel", cancel);
      target.addEventListener(
        "click",
        (event) => {
          if (Date.now() >= (this.#suppressProfileClickUntil.get(target) ?? 0)) return;
          event.preventDefault();
          event.stopImmediatePropagation();
        },
        true
      );
    }
    async #openProfileMenu(memberNumber, displayName, x, y) {
      const token = ++this.#profileMenuToken;
      this.presence.request(memberNumber);
      const [conversation] = await Promise.all([this.service.getConversation(memberNumber)]);
      if (token !== this.#profileMenuToken) return;
      const nativeName = conversation?.peerName ?? displayName;
      const shownName = conversation ? conversationDisplayName(conversation) : displayName;
      const snapshot = this.presence.get(memberNumber);
      const rosterEntry = this.roster.get(memberNumber, nativeName);
      const inRoom = this.adapter.isMemberInCurrentRoom(memberNumber);
      const header = element(
        "header",
        { className: "kl-profile-menu-header" },
        element(
          "div",
          { className: "kl-avatar-wrap" },
          element("div", { className: "kl-avatar", text: avatarText(shownName) }),
          presenceDot(snapshot.status)
        ),
        element(
          "div",
          { className: "kl-profile-menu-identity" },
          element("strong", { text: shownName }),
          element(
            "span",
            { title: presenceDescription(snapshot) },
            presenceDot(snapshot.status),
            `${presenceLabel(snapshot.status)} \xB7 #${memberNumber}`
          ),
          snapshot.statusMessage ? element("small", { className: "kl-presence-note", text: snapshot.statusMessage }) : null,
          conversation?.localAlias ? element("small", {
            className: "kl-profile-native-name",
            text: `Local nickname \xB7 ${conversation.peerName}`
          }) : null
        )
      );
      const primary = element(
        "div",
        { className: "kl-profile-menu-group" },
        this.#profileMenuAction("chat", "Message", "Open LinkChat", () => {
          void this.openChat(memberNumber, nativeName);
        }),
        this.#profileMenuAction(
          "whisper",
          "Whisper",
          inRoom ? "Set native Whisper target" : "Available while this player is in your room",
          () => {
            try {
              this.adapter.startWhisper(memberNumber);
              this.close();
            } catch (error) {
              this.#toast(error instanceof Error ? error.message : "Unable to start Whisper", "error");
            }
          },
          !inRoom
        ),
        this.#profileMenuAction(
          "profile",
          "Native profile",
          inRoom ? "Open the Bondage Club profile" : "Available while this player is in your room",
          () => {
            try {
              this.adapter.openProfile(memberNumber);
              this.close();
            } catch (error) {
              this.#toast(error instanceof Error ? error.message : "Unable to open profile", "error");
            }
          },
          !inRoom
        )
      );
      const organize = element(
        "div",
        { className: "kl-profile-menu-group" },
        this.#profileMenuAction(
          "star",
          rosterEntry.favorite ? "Remove favorite" : "Add favorite",
          "Saved in your private player notebook",
          () => {
            this.roster.toggleFavorite(memberNumber, nativeName);
            this.#renderRoster();
            void this.#renderHome();
            this.#toast(rosterEntry.favorite ? "Removed from favorites." : "Added to favorites.");
          },
          false,
          rosterEntry.favorite
        ),
        this.#profileMenuAction("note", "Player note", "Open private notes and tags", () => {
          this.#openRoster(memberNumber);
        }),
        conversation ? this.#profileMenuAction(
          "edit",
          conversation.localAlias ? "Edit local nickname" : "Set local nickname",
          conversation.localAlias ? `Only you see \u201C${conversation.localAlias}\u201D` : "Cosmetic and visible only to you",
          () => this.#openAliasDialog(conversation)
        ) : null,
        conversation ? this.#profileMenuAction(
          "pin",
          conversation.pinned ? "Unpin chat" : "Pin chat",
          "Organize your recent chats",
          () => void this.#toggleConversationPin(memberNumber),
          false,
          conversation.pinned
        ) : null,
        conversation ? this.#profileMenuAction("unread", "Mark unread", "Keep this chat in your unread queue", () => {
          void this.#markConversationUnread(memberNumber);
        }) : null,
        this.#profileMenuAction("id", "Copy member ID", `Copy ${memberNumber}`, () => {
          void this.#copyRosterMemberNumber(memberNumber);
        })
      );
      const remove = conversation ? element(
        "div",
        { className: "kl-profile-menu-group kl-profile-menu-group--danger" },
        this.#profileMenuAction(
          "trash",
          "Remove from recent chats",
          "Deletes only this local KikiLink history",
          () => this.#openRemoveChatDialog(memberNumber, shownName)
        )
      ) : null;
      this.#profileMenu.replaceChildren(header, primary, organize);
      if (remove) this.#profileMenu.append(remove);
      this.#profileMenu.hidden = false;
      this.#profileMenu.style.left = `${x}px`;
      this.#profileMenu.style.top = `${y}px`;
      const bounds = this.#profileMenu.getBoundingClientRect();
      this.#profileMenu.style.left = `${clamp(x, 8, Math.max(8, window.innerWidth - bounds.width - 8))}px`;
      this.#profileMenu.style.top = `${clamp(y, 8, Math.max(8, window.innerHeight - bounds.height - 8))}px`;
      this.#profileMenu.querySelector(".kl-profile-menu-action:not(:disabled)")?.focus();
    }
    #profileMenuAction(icon, label, help, action, disabled = false, filled = false) {
      const button = element(
        "button",
        { className: "kl-profile-menu-action", type: "button" },
        element("span", { className: "kl-profile-menu-icon" }, kikiIcon(icon, "kl-profile-action-icon", filled)),
        element(
          "span",
          { className: "kl-profile-menu-copy" },
          element("span", { className: "kl-profile-menu-label", text: label }),
          element("span", { className: "kl-profile-menu-help", text: help })
        )
      );
      button.setAttribute("role", "menuitem");
      button.disabled = disabled;
      button.addEventListener("click", () => {
        this.#closeProfileMenu();
        action();
      });
      return button;
    }
    #closeProfileMenu() {
      this.#profileMenuToken += 1;
      this.#profileMenu.hidden = true;
      this.#profileMenu.replaceChildren();
    }
    async #toggleConversationPin(memberNumber) {
      const pinned = await this.service.togglePinned(memberNumber);
      if (memberNumber === this.#activePeer) {
        this.#renderPinButton(pinned);
      }
      await this.#renderConversations();
      this.#toast(pinned ? "Chat pinned." : "Chat unpinned.");
    }
    async #markConversationUnread(memberNumber) {
      await this.service.markUnread(memberNumber);
      await this.refresh();
      this.#toast("Chat marked unread.");
    }
    #openNewChat() {
      this.#newChatQuery.value = "";
      this.#renderKnownContacts();
      if (!this.#newChatDialog.open) this.#newChatDialog.showModal();
      this.#newChatQuery.focus();
    }
    async #submitNewChat() {
      const query = this.#newChatQuery.value.trim();
      const memberNumber = Number(query.replace(/^#/u, ""));
      if (!Number.isSafeInteger(memberNumber) || memberNumber < 0) {
        const exactContact = this.adapter.getKnownContacts().find((contact) => contact.memberName.toLocaleLowerCase() === query.toLocaleLowerCase());
        if (exactContact) {
          this.#newChatDialog.close();
          await this.openChat(exactContact.memberNumber, exactContact.memberName);
          return;
        }
        this.#toast("Choose a contact or enter a valid member number.", "error");
        return;
      }
      if (memberNumber === this.adapter.getOwnMemberNumber()) {
        this.#toast("You cannot Beep yourself.", "error");
        return;
      }
      this.#newChatDialog.close();
      await this.openChat(memberNumber, this.adapter.getMemberName(memberNumber));
    }
    #renderKnownContacts() {
      const query = this.#newChatQuery.value.trim().toLocaleLowerCase();
      const contacts = this.adapter.getKnownContacts().filter(
        (contact) => !query || contact.memberName.toLocaleLowerCase().includes(query) || contact.memberNumber.toString().includes(query)
      ).slice(0, 40);
      this.#newChatResults.replaceChildren();
      if (contacts.length === 0) {
        this.#newChatResults.append(
          element("div", {
            className: "kl-contact-empty",
            text: this.#connectionState === "ready" ? "No matching known contacts. You can still enter a member number." : "Contacts will appear after KikiLink connects to the game."
          })
        );
        return;
      }
      for (const contact of contacts) {
        const presence = this.presence.get(contact.memberNumber);
        const button = element(
          "button",
          { className: "kl-contact", type: "button" },
          element(
            "div",
            { className: "kl-avatar-wrap" },
            element("div", { className: "kl-avatar", text: avatarText(contact.memberName) }),
            presenceDot(presence.status)
          ),
          element(
            "div",
            { className: "kl-contact-copy" },
            element("div", { className: "kl-contact-name", text: contact.memberName }),
            element("div", { className: "kl-contact-number", text: `Member ${contact.memberNumber}` })
          )
        );
        button.addEventListener("click", () => {
          this.#newChatDialog.close();
          void this.openChat(contact.memberNumber, contact.memberName);
        });
        this.#bindProfileMenu(button, () => ({
          memberNumber: contact.memberNumber,
          displayName: contact.memberName
        }));
        this.#newChatResults.append(button);
      }
    }
    #renderQuickActions() {
      const actions = this.settings.get().linkChat.quickActions;
      this.#quickActions.replaceChildren();
      this.#quickActions.hidden = actions.length === 0;
      for (const action of actions) {
        this.#quickActions.append(
          element("button", {
            className: "kl-action-chip",
            type: "button",
            text: action.label,
            title: action.template,
            onClick: () => this.#insertQuickAction(action)
          })
        );
      }
    }
    #insertQuickAction(action) {
      if (this.#activePeer === void 0) return;
      const expanded = action.template.replaceAll("{name}", this.#activeNativeName).replaceAll("{member}", this.#activePeer.toString()).replaceAll("{me}", this.adapter.getOwnName());
      const current = this.#composer.value.trimEnd();
      const next = current ? `${current}
${expanded}` : expanded;
      if (next.length > 1e3) {
        this.#toast("This action would exceed the 1000 character Beep limit.", "error");
        return;
      }
      this.#composer.value = next;
      this.#composer.dispatchEvent(new Event("input", { bubbles: true }));
      this.#composer.focus();
    }
    #renderQuickActionEditor(actions) {
      this.#quickActionsEditor.replaceChildren();
      for (const action of actions) this.#addQuickActionEditorRow(action);
    }
    #addQuickActionEditorRow(action = { label: "", template: "" }) {
      if (this.#quickActionsEditor.childElementCount >= 12) {
        this.#toast("You can keep up to 12 quick actions.", "error");
        return;
      }
      const label = element("input", { className: "kl-action-label" });
      label.placeholder = "Label";
      label.maxLength = 24;
      label.value = action.label;
      label.dataset.field = "label";
      const template = element("input", { className: "kl-action-template" });
      template.placeholder = "Action text";
      template.maxLength = 500;
      template.value = action.template;
      template.dataset.field = "template";
      const remove = element("button", {
        className: "kl-icon-button kl-remove-action",
        type: "button",
        title: "Remove action",
        ariaLabel: "Remove quick action"
      });
      remove.append(kikiIcon("trash"));
      const row = element("div", { className: "kl-action-editor-row" }, label, template, remove);
      remove.addEventListener("click", () => row.remove());
      this.#quickActionsEditor.append(row);
      if (!action.label && !action.template) label.focus();
    }
    #readQuickActionEditor() {
      return [...this.#quickActionsEditor.querySelectorAll(".kl-action-editor-row")].map((row) => ({
        label: row.querySelector('[data-field="label"]')?.value.trim() ?? "",
        template: row.querySelector('[data-field="template"]')?.value.trim() ?? ""
      })).filter((action) => action.label && action.template);
    }
    #renderActivityEditor(activities) {
      this.#activitiesEditor.replaceChildren();
      for (const activity of activities) this.#addActivityEditorRow(activity);
      this.#updateActivityEditorCount();
    }
    #addActivityEditorRow(activity = {
      label: "",
      template: "",
      category: "Custom",
      pack: "My Activities",
      favorite: false
    }) {
      if (this.#activitiesEditor.childElementCount >= MAX_ROOM_ACTIVITIES) {
        this.#toast(`You can keep up to ${MAX_ROOM_ACTIVITIES} room activities.`, "error");
        return;
      }
      const label = element("input", { className: "kl-action-label" });
      label.placeholder = "Label";
      label.maxLength = 32;
      label.value = activity.label;
      label.dataset.field = "label";
      const category = element("input", { className: "kl-activity-meta" });
      category.placeholder = "Category";
      category.maxLength = 24;
      category.value = activity.category;
      category.dataset.field = "category";
      const pack = element("input", { className: "kl-activity-meta" });
      pack.placeholder = "Pack";
      pack.maxLength = 32;
      pack.value = activity.pack;
      pack.dataset.field = "pack";
      const template = element("input", { className: "kl-action-template" });
      template.placeholder = "Room emote text";
      template.maxLength = 500;
      template.value = activity.template;
      template.dataset.field = "template";
      const favorite = element("input");
      favorite.type = "checkbox";
      favorite.checked = activity.favorite;
      favorite.dataset.field = "favorite";
      const favoriteLabel = element(
        "label",
        {
          className: "kl-activity-editor-favorite",
          title: "Favorite activity",
          ariaLabel: `Favorite ${activity.label || "new activity"}`
        },
        favorite,
        kikiIcon("star")
      );
      const remove = element("button", {
        className: "kl-icon-button kl-remove-action",
        type: "button",
        title: "Remove activity",
        ariaLabel: "Remove room activity"
      });
      remove.append(kikiIcon("trash"));
      const row = element(
        "div",
        { className: "kl-action-editor-row kl-activity-editor-row" },
        element(
          "div",
          { className: "kl-activity-editor-fields" },
          label,
          category,
          pack,
          template
        ),
        favoriteLabel,
        remove
      );
      remove.addEventListener("click", () => {
        row.remove();
        this.#updateActivityEditorCount();
      });
      this.#activitiesEditor.append(row);
      this.#updateActivityEditorCount();
      if (!activity.label && !activity.template) label.focus();
    }
    #readActivityEditor() {
      return [...this.#activitiesEditor.querySelectorAll(".kl-activity-editor-row")].map((row) => ({
        label: row.querySelector('[data-field="label"]')?.value.trim() ?? "",
        template: row.querySelector('[data-field="template"]')?.value.trim() ?? "",
        category: row.querySelector('[data-field="category"]')?.value.trim() || "Uncategorized",
        pack: row.querySelector('[data-field="pack"]')?.value.trim() || "My Activities",
        favorite: row.querySelector('[data-field="favorite"]')?.checked === true
      })).filter((activity) => activity.label && activity.template);
    }
    #updateActivityEditorCount() {
      const count2 = this.#activitiesEditor.childElementCount;
      this.#activityCount.textContent = `${count2}/${MAX_ROOM_ACTIVITIES} activities \xB7 JSON stays local`;
    }
    #openSettings(section) {
      const settings = this.settings.get();
      if (this.#workspaceView !== "settings") this.#settingsReturnView = this.#workspaceView;
      this.#themeSelect.value = settings.ui.theme;
      this.#accentInput.value = settings.ui.accent;
      this.#updateAccentPresets();
      this.#densitySelect.value = settings.ui.density;
      this.#textScaleSelect.value = settings.ui.textScale;
      this.#homeLayoutSelect.value = settings.ui.homeLayout;
      this.#launcherSideSelect.value = settings.ui.launcherSide;
      this.#launcherOpenSelect.value = settings.ui.launcherOpen;
      this.#reducedMotionToggle.checked = settings.ui.reducedMotion;
      this.#historyToggle.checked = settings.linkChat.saveHistory;
      this.#enterToSendToggle.checked = settings.linkChat.enterToSend;
      this.#typingIndicatorsToggle.checked = settings.linkChat.typingIndicators;
      this.#imagePreviewSelect.value = settings.linkChat.imagePreviews;
      this.#retentionInput.value = settings.linkChat.retentionDays.toString();
      this.#renderQuickActionEditor(settings.linkChat.quickActions);
      this.#rosterEnabledToggle.checked = settings.linkRoster.enabled;
      this.#rosterTrackingToggle.checked = settings.linkRoster.trackEncounters;
      this.#rosterRetentionSelect.value = settings.linkRoster.retentionDays.toString();
      this.#updateNotebookCount();
      this.#activitiesToggle.checked = settings.linkActivities.enabled;
      this.#renderActivityEditor(settings.linkActivities.activities);
      this.#showWorkspace("settings", false);
      this.#showSettingsSection(section ?? settings.ui.settingsSection, false);
      this.#settingsTabs.querySelector(`[data-section="${this.#settingsSection}"]`)?.focus();
    }
    #showSettingsSection(section, remember) {
      this.#settingsSection = section;
      for (const [candidate, panel] of this.#settingsPanels) {
        panel.hidden = candidate !== section;
      }
      for (const tab of this.#settingsTabs.querySelectorAll(".kl-settings-tab")) {
        const selected = tab.dataset.section === section;
        tab.dataset.active = String(selected);
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
      }
      if (remember && this.settings.get().ui.settingsSection !== section) {
        this.settings.update((draft) => {
          draft.ui.settingsSection = section;
        });
      }
    }
    #updateAccentPresets() {
      for (const swatch of this.#settingsPage.querySelectorAll(".kl-color-swatch")) {
        const selected = swatch.dataset.color === this.#accentInput.value.toLocaleLowerCase();
        swatch.dataset.selected = String(selected);
        swatch.setAttribute("aria-pressed", String(selected));
      }
    }
    #cancelSettings() {
      this.#showWorkspace(this.#availableWorkspace(this.#settingsReturnView));
    }
    #saveSettings() {
      const retentionDays = Number(this.#retentionInput.value);
      const currentSettings = this.settings.get();
      const launcherSide = this.#launcherSideSelect.value === "left" ? "left" : "right";
      const settings = this.settings.update((draft) => {
        draft.ui.theme = this.#themeSelect.value === "light" || this.#themeSelect.value === "system" ? this.#themeSelect.value : "dark";
        draft.ui.accent = this.#accentInput.value;
        draft.ui.density = this.#densitySelect.value === "compact" || this.#densitySelect.value === "super-compact" ? this.#densitySelect.value : "comfortable";
        draft.ui.textScale = this.#textScaleSelect.value === "large" || this.#textScaleSelect.value === "extra-large" ? this.#textScaleSelect.value : "normal";
        draft.ui.homeLayout = this.#homeLayoutSelect.value === "compact" ? "compact" : "showcase";
        draft.ui.launcherSide = launcherSide;
        draft.ui.launcherOpen = this.#launcherOpenSelect.value === "last" || this.#launcherOpenSelect.value === "chat" ? this.#launcherOpenSelect.value : "home";
        if (launcherSide !== currentSettings.ui.launcherSide) draft.ui.launcherPosition = null;
        draft.ui.reducedMotion = this.#reducedMotionToggle.checked;
        draft.ui.settingsSection = this.#settingsSection;
        draft.linkChat.saveHistory = this.#historyToggle.checked;
        draft.linkChat.enterToSend = this.#enterToSendToggle.checked;
        draft.linkChat.typingIndicators = this.#typingIndicatorsToggle.checked;
        draft.linkChat.imagePreviews = this.#imagePreviewSelect.value === "always" || this.#imagePreviewSelect.value === "never" ? this.#imagePreviewSelect.value : "ask";
        draft.linkChat.quickActions = this.#readQuickActionEditor();
        draft.linkRoster.enabled = this.#rosterEnabledToggle.checked;
        draft.linkRoster.trackEncounters = this.#rosterTrackingToggle.checked;
        const rosterRetentionDays = Number(this.#rosterRetentionSelect.value);
        if (Number.isInteger(rosterRetentionDays)) {
          draft.linkRoster.retentionDays = rosterRetentionDays;
        }
        draft.linkActivities.enabled = this.#activitiesToggle.checked;
        draft.linkActivities.activities = this.#readActivityEditor();
        if (Number.isInteger(retentionDays)) draft.linkChat.retentionDays = retentionDays;
      });
      this.#applyTheme(settings);
      if (!settings.linkChat.typingIndicators) this.#stopLocalTyping();
      const removedPlayers = this.roster.prune();
      this.#updateNotebookCount();
      this.#renderQuickActions();
      if (this.#activePeer !== void 0) void this.#renderMessages(this.#activePeer);
      this.#renderActivePresence();
      this.#renderHomeStatus();
      void this.#renderHome();
      this.#showWorkspace(this.#availableWorkspace(this.#settingsReturnView, settings));
      void this.service.prune();
      this.#toast(
        removedPlayers > 0 ? `Settings saved. Forgot ${removedPlayers} old encounter${removedPlayers === 1 ? "" : "s"}.` : "Settings saved."
      );
    }
    #resetLauncherPosition() {
      const settings = this.settings.update((draft) => {
        draft.ui.launcherPosition = null;
      });
      this.#applyTheme(settings);
      this.#toast("Launcher returned to its default corner.");
    }
    async #clearHistory() {
      if (!window.confirm("Clear all KikiLink Beep history and conversation drafts?")) return;
      await this.service.clearHistory();
      this.#resetActiveConversation();
      await this.refresh();
      this.#toast("LinkChat history cleared.");
    }
    #resetActiveConversation() {
      this.#stopLocalTyping();
      this.#activePeer = void 0;
      this.#activeName = "";
      this.#activeNativeName = "";
      this.#messageRenderPeer = void 0;
      this.#renderedMessageIds.clear();
      this.#composer.value = "";
      this.#messages.replaceChildren();
      this.#attachImageButton.disabled = true;
      this.#chat.hidden = true;
      this.#empty.hidden = false;
      this.#panel.dataset.mobileView = "list";
    }
    #installActivityPack() {
      try {
        const currentActivities = this.#readCompleteActivityEditor();
        if (!currentActivities) return;
        const pack = ACTIVITY_PACK_PRESETS.find(
          (candidate) => candidate.id === this.#activityPackSelect.value
        );
        const result = installActivityPack(currentActivities, this.#activityPackSelect.value);
        this.#renderActivityEditor(result.activities);
        if (result.imported === 0) {
          this.#toast(`${pack?.name ?? "That pack"} is already in your activity library.`);
          return;
        }
        const duplicateNote = result.duplicates > 0 ? ` ${result.duplicates} existing activities were kept.` : "";
        this.#toast(
          `Added ${result.imported} ${result.imported === 1 ? "activity" : "activities"} from ${pack?.name ?? "the pack"}.${duplicateNote} Choose Save changes to keep them.`
        );
      } catch (error) {
        this.#toast(error instanceof Error ? error.message : "Could not add that activity pack.", "error");
      }
    }
    #exportActivities() {
      if (typeof URL.createObjectURL !== "function") {
        this.#toast("This browser cannot create an activity library download.", "error");
        return;
      }
      const activities = this.#readCompleteActivityEditor();
      if (!activities) return;
      const backup = exportActivityLibrary(activities);
      if (backup.activities.length === 0) {
        this.#toast("Add at least one complete activity before exporting.", "error");
        return;
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `KikiLink-activity-library-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
      anchor.hidden = true;
      this.#shadow.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      this.#toast(
        `Exported ${backup.activities.length} ${backup.activities.length === 1 ? "activity" : "activities"} with packs and favorites.`
      );
    }
    async #importActivityFile() {
      const file = this.#activityFileInput.files?.[0];
      this.#activityFileInput.value = "";
      if (!file) return;
      if (file.size > 1e6) {
        this.#toast("That activity library is larger than the 1 MB safety limit.", "error");
        return;
      }
      if (!window.confirm(
        "Merge this KikiLink activity library with the current editor? Existing activities and favorites will be preserved."
      )) {
        return;
      }
      try {
        const currentActivities = this.#readCompleteActivityEditor();
        if (!currentActivities) return;
        const result = importActivityLibrary(await file.text(), currentActivities);
        this.#renderActivityEditor(result.activities);
        const details = [
          result.duplicates > 0 ? `${result.duplicates} duplicate${result.duplicates === 1 ? "" : "s"} kept` : "",
          result.skipped > 0 ? `${result.skipped} invalid or excess entr${result.skipped === 1 ? "y" : "ies"} skipped` : ""
        ].filter(Boolean);
        this.#toast(
          `Imported ${result.imported} ${result.imported === 1 ? "activity" : "activities"}.${details.length > 0 ? ` ${details.join(" \xB7 ")}.` : ""} Choose Save changes to keep them.`
        );
      } catch (error) {
        this.#toast(error instanceof Error ? error.message : "Could not import that activity library.", "error");
      }
    }
    #readCompleteActivityEditor() {
      const activities = this.#readActivityEditor();
      if (activities.length !== this.#activitiesEditor.childElementCount) {
        this.#toast("Finish or remove incomplete activities before using packs or backups.", "error");
        return void 0;
      }
      return activities;
    }
    #exportNotebook() {
      if (typeof URL.createObjectURL !== "function") {
        this.#toast("This browser cannot create a notebook download.", "error");
        return;
      }
      const backup = this.roster.exportNotebook();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `KikiLink-player-notebook-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
      anchor.hidden = true;
      this.#shadow.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      this.#toast(
        backup.records.length === 1 ? "Exported 1 player to a local JSON backup." : `Exported ${backup.records.length} players to a local JSON backup.`
      );
    }
    async #importNotebookFile() {
      const file = this.#notebookFileInput.files?.[0];
      this.#notebookFileInput.value = "";
      if (!file) return;
      if (file.size > 2e6) {
        this.#toast("That notebook backup is larger than the 2 MB safety limit.", "error");
        return;
      }
      if (!window.confirm(
        "Merge this KikiLink backup with the current player notebook? Existing notes, tags, and favorites will be preserved."
      )) {
        return;
      }
      try {
        const result = this.roster.importNotebook(await file.text());
        const removed = this.roster.prune();
        this.#updateNotebookCount();
        this.#selectedRosterMember = void 0;
        this.#notebookDirty = false;
        if (this.#workspaceView === "roster") this.#renderRoster();
        void this.#renderHome();
        const skipped = result.skipped > 0 ? ` ${result.skipped} invalid entr${result.skipped === 1 ? "y was" : "ies were"} skipped.` : "";
        const expired = removed > 0 ? ` ${removed} expired encounter${removed === 1 ? " was" : "s were"} omitted.` : "";
        this.#toast(`Merged ${result.imported} player${result.imported === 1 ? "" : "s"}.${skipped}${expired}`);
      } catch (error) {
        this.#toast(error instanceof Error ? error.message : "Could not import that notebook.", "error");
      }
    }
    #updateNotebookCount() {
      const count2 = this.roster.notebookCount();
      this.#notebookCount.textContent = `${count2} saved player${count2 === 1 ? "" : "s"} \xB7 JSON stays local`;
    }
    #clearPeople() {
      if (!window.confirm("Clear all KikiLink player notes, tags, favorites, and encounter history?")) {
        return;
      }
      this.roster.clear();
      this.#selectedRosterMember = void 0;
      this.#notebookDirty = false;
      this.#updateNotebookCount();
      if (this.#workspaceView === "roster") this.#renderRoster();
      void this.#renderHome();
      this.#toast("LinkRoster notebook cleared.");
    }
    async #updateUnreadBadge() {
      const unread = await this.service.totalUnread();
      this.#unreadCount = unread;
      this.#badge.hidden = unread === 0;
      this.#badge.textContent = unread > 99 ? "99+" : unread.toString();
    }
    #resizeComposer() {
      this.#composer.style.height = "auto";
      this.#composer.style.height = `${Math.min(this.#composer.scrollHeight, 120)}px`;
    }
    #updateCounter() {
      const count2 = this.#composer.value.length;
      this.#counter.textContent = `${count2}/1000 \xB7 Ctrl+Enter`;
      this.#counter.dataset.over = String(count2 > 1e3);
    }
    #applyTheme(settings) {
      this.#host.style.setProperty("--kl-accent", settings.ui.accent);
      this.#host.style.setProperty("--kl-accent-strong", settings.ui.accent);
      this.#host.style.setProperty("--kl-accent-foreground", readableForeground(settings.ui.accent));
      this.#host.dataset.theme = settings.ui.theme;
      this.#host.dataset.density = settings.ui.density;
      this.#host.dataset.textScale = settings.ui.textScale;
      this.#host.dataset.homeLayout = settings.ui.homeLayout;
      this.#host.dataset.reducedMotion = String(settings.ui.reducedMotion);
      this.#launcher.dataset.side = settings.ui.launcherSide;
      this.#panel.dataset.side = settings.ui.launcherSide;
      if (this.#host.isConnected) this.#positionLauncher();
    }
    #startLauncherDrag(event) {
      if (event.button !== 0) return;
      const rect = this.#launcher.getBoundingClientRect();
      this.#launcherDrag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: rect.left,
        startTop: rect.top,
        moved: false
      };
      try {
        this.#launcher.setPointerCapture(event.pointerId);
      } catch {
      }
    }
    #moveLauncher(event) {
      const drag = this.#launcherDrag;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(deltaX, deltaY) < 5) return;
      drag.moved = true;
      event.preventDefault();
      this.#launcher.dataset.dragging = "true";
      this.#placeLauncher(drag.startLeft + deltaX, drag.startTop + deltaY);
    }
    #finishLauncherDrag(event) {
      const drag = this.#launcherDrag;
      if (!drag || drag.pointerId !== event.pointerId) return;
      this.#launcherDrag = void 0;
      this.#launcher.dataset.dragging = "false";
      try {
        this.#launcher.releasePointerCapture(event.pointerId);
      } catch {
      }
      if (!drag.moved) return;
      this.#saveLauncherPosition();
      this.#suppressLauncherClickUntil = Date.now() + 500;
    }
    #cancelLauncherDrag(event) {
      if (!this.#launcherDrag || this.#launcherDrag.pointerId !== event.pointerId) return;
      this.#launcherDrag = void 0;
      this.#launcher.dataset.dragging = "false";
      this.#positionLauncher();
    }
    #placeLauncher(left, top) {
      const width = this.#launcher.offsetWidth || 58;
      const height = this.#launcher.offsetHeight || 58;
      const maxLeft = Math.max(0, window.innerWidth - width);
      const maxTop = Math.max(0, window.innerHeight - height);
      const safeLeft = clamp(left, 0, maxLeft);
      const safeTop = clamp(top, 0, maxTop);
      const side = safeLeft + width / 2 < window.innerWidth / 2 ? "left" : "right";
      this.#launcher.style.left = `${Math.round(safeLeft)}px`;
      this.#launcher.style.top = `${Math.round(safeTop)}px`;
      this.#launcher.style.right = "auto";
      this.#launcher.style.bottom = "auto";
      this.#launcher.dataset.side = side;
      this.#panel.dataset.side = side;
    }
    #saveLauncherPosition() {
      const rect = this.#launcher.getBoundingClientRect();
      const maxLeft = Math.max(0, window.innerWidth - rect.width);
      const maxTop = Math.max(0, window.innerHeight - rect.height);
      const x = maxLeft === 0 ? 0.5 : clamp(rect.left / maxLeft, 0, 1);
      const y = maxTop === 0 ? 0.5 : clamp(rect.top / maxTop, 0, 1);
      const launcherSide = rect.left + rect.width / 2 < window.innerWidth / 2 ? "left" : "right";
      this.settings.update((draft) => {
        draft.ui.launcherPosition = { x, y };
        draft.ui.launcherSide = launcherSide;
      });
    }
    #positionLauncher() {
      const ui = this.settings.get().ui;
      if (!ui.launcherPosition) {
        this.#launcher.style.removeProperty("left");
        this.#launcher.style.removeProperty("top");
        this.#launcher.style.removeProperty("right");
        this.#launcher.style.removeProperty("bottom");
        this.#launcher.dataset.side = ui.launcherSide;
        this.#panel.dataset.side = ui.launcherSide;
        return;
      }
      const width = this.#launcher.offsetWidth || 58;
      const height = this.#launcher.offsetHeight || 58;
      this.#placeLauncher(
        ui.launcherPosition.x * Math.max(0, window.innerWidth - width),
        ui.launcherPosition.y * Math.max(0, window.innerHeight - height)
      );
    }
    #showConversationList() {
      this.#panel.dataset.mobileView = "list";
      this.#search.focus();
    }
    #emblem(className) {
      const image = element("img", { className: "kl-emblem-image" });
      image.src = __default;
      image.alt = "";
      image.decoding = "async";
      image.draggable = false;
      return element("span", { className: `kl-emblem ${className}` }, image);
    }
    #toast(message, kind = "info") {
      if (this.#toastTimer !== void 0) clearTimeout(this.#toastTimer);
      this.#toastTimer = void 0;
      this.#shadow.querySelector(".kl-toast")?.remove();
      const toast = element(
        "div",
        { className: "kl-toast" },
        element("span", { className: "kl-toast-message", text: message })
      );
      toast.dataset.kind = kind;
      toast.setAttribute("role", kind === "error" ? "alert" : "status");
      toast.setAttribute("aria-live", kind === "error" ? "assertive" : "polite");
      toast.setAttribute("aria-atomic", "true");
      const dismiss = element("button", {
        className: "kl-toast-dismiss",
        type: "button",
        title: "Dismiss message",
        ariaLabel: "Dismiss message",
        onClick: () => {
          if (this.#toastTimer !== void 0) clearTimeout(this.#toastTimer);
          this.#toastTimer = void 0;
          toast.remove();
        }
      });
      dismiss.append(kikiIcon("close"));
      toast.append(dismiss);
      const surface = this.#newChatDialog.open ? this.#newChatDialog : this.#panel;
      surface.append(toast);
      if (kind === "info") {
        this.#toastTimer = setTimeout(() => {
          toast.remove();
          this.#toastTimer = void 0;
        }, 5e3);
      }
    }
  };
  function finderSettingResults() {
    const definitions = [
      {
        section: "appearance",
        title: "Appearance & comfort",
        detail: "Theme, accent, Super compact spacing, text size, Home style, and motion",
        keywords: "light dark system color colour guided focused density compact super tiny font scale reduced motion"
      },
      {
        section: "navigation",
        title: "Navigation & launcher",
        detail: "Opening destination, side, and launcher position",
        keywords: "home last chat left right drag reset emblem start screen"
      },
      {
        section: "chat",
        title: "Chat & history",
        detail: "Typing, images, Enter-to-send, history, retention, and Quick Actions",
        keywords: "beep messages typing indicator realtime image picture preview privacy enter send newline save storage days clear wave hug boop template"
      },
      {
        section: "players",
        title: "Players & notebook",
        detail: "Roster, encounters, retention, notes, and notebook backup",
        keywords: "people linkroster tracking private data clear whisper profile export import backup json favorites tags retention"
      },
      {
        section: "activities",
        title: "Activities & templates",
        detail: "Activity Studio, packs, categories, favorites, and backup",
        keywords: "linkactivities action roleplay target source member edit enable pack category favorite starred export import backup json"
      }
    ];
    return definitions.map((definition, index) => ({
      id: `setting-${definition.section}`,
      kind: "setting",
      icon: "settings",
      category: "Settings",
      title: definition.title,
      detail: definition.detail,
      keywords: definition.keywords,
      priority: 58 - index,
      action: { kind: "setting", section: definition.section }
    }));
  }
  function normalizeFinderText(value) {
    return value.trim().toLocaleLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/\s+/gu, " ");
  }
  function rankFinderResults(catalog, query) {
    const terms = query.split(" ").filter(Boolean);
    return catalog.map((result) => {
      const title = normalizeFinderText(result.title);
      const detail = normalizeFinderText(result.detail);
      const category = normalizeFinderText(result.category);
      const haystack = `${title} ${detail} ${category} ${normalizeFinderText(result.keywords)}`;
      if (!terms.every((term) => haystack.includes(term))) return void 0;
      let score = result.priority;
      if (title === query) score += 1e3;
      else if (title.startsWith(query)) score += 650;
      else if (title.includes(query)) score += 360;
      if (category === query) score += 220;
      else if (category.startsWith(query)) score += 90;
      if (detail.startsWith(query)) score += 80;
      for (const term of terms) {
        if (title.split(" ").some((word) => word.startsWith(term))) score += 35;
      }
      return { result, score };
    }).filter((entry) => entry !== void 0).sort(
      (left, right) => right.score - left.score || left.result.title.localeCompare(right.result.title)
    ).map((entry) => entry.result);
  }
  function selectOption(value, label) {
    const option = element("option", { text: label });
    option.value = value;
    return option;
  }
  function presenceLabel(status) {
    if (status === "online") return "Online";
    if (status === "idle") return "Idle";
    if (status === "dnd") return "Do not disturb";
    if (status === "offline") return "Offline";
    return "Status unavailable";
  }
  function presenceHelp(status) {
    if (status === "online") return "Available and ready to chat";
    if (status === "idle") return "Away for a little while";
    if (status === "dnd") return "Busy and may reply later";
    return "Appear offline inside KikiLink";
  }
  function presenceDot(status) {
    const dot = element("span", { className: "kl-presence-dot" });
    dot.dataset.status = status;
    dot.setAttribute("aria-hidden", "true");
    return dot;
  }
  function presenceDescription(snapshot) {
    const label = presenceLabel(snapshot.status);
    const source = snapshot.source === "kikilink" ? "shared by KikiLink" : snapshot.source === "room" ? "currently in your room" : snapshot.source === "friend-list" ? "Bondage Club friend list" : "not available for this player";
    return snapshot.statusMessage ? `${label} \xB7 ${snapshot.statusMessage} \xB7 ${source}` : `${label} \xB7 ${source}`;
  }
  function messagePreview(content) {
    const trimmed = content.trim();
    const image = parseMessageLinks(trimmed).find(
      (link) => link.image && link.start === 0 && link.end === trimmed.length
    );
    return image ? "Image" : content;
  }
  function avatarText(name) {
    const trimmed = name.trim();
    return trimmed ? [...trimmed][0]?.toLocaleUpperCase() ?? "?" : "?";
  }
  function formatConversationTime(timestamp) {
    const date = new Date(timestamp);
    const now = /* @__PURE__ */ new Date();
    if (date.toDateString() === now.toDateString()) {
      return new Intl.DateTimeFormat(void 0, { hour: "2-digit", minute: "2-digit" }).format(date);
    }
    return new Intl.DateTimeFormat(void 0, { month: "short", day: "numeric" }).format(date);
  }
  function formatMessageTime(timestamp) {
    return new Intl.DateTimeFormat(void 0, { hour: "2-digit", minute: "2-digit" }).format(
      new Date(timestamp)
    );
  }
  function formatRelativeTime(timestamp) {
    if (!timestamp) return "\u2014";
    const elapsed = Math.max(0, Date.now() - timestamp);
    const minutes = Math.floor(elapsed / 6e4);
    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    return new Intl.DateTimeFormat(void 0, { month: "short", day: "numeric" }).format(
      new Date(timestamp)
    );
  }
  function greetingForCurrentTime() {
    const hour = (/* @__PURE__ */ new Date()).getHours();
    if (hour < 5) return "Still awake";
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }
  function formatFullSeenTime(timestamp) {
    if (!timestamp) return "Not recorded";
    return new Intl.DateTimeFormat(void 0, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(timestamp));
  }
  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Clipboard unavailable");
  }
  function readableForeground(background) {
    const channels = [1, 3, 5].map((index) => Number.parseInt(background.slice(index, index + 2), 16));
    const luminance = relativeLuminance(channels);
    const darkContrast = (luminance + 0.05) / 0.057;
    const lightContrast = 1.044 / (luminance + 0.05);
    return darkContrast >= lightContrast ? "#17100d" : "#fff8ee";
  }
  function relativeLuminance(channels) {
    const [red = 0, green = 0, blue = 0] = channels.map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return red * 0.2126 + green * 0.7152 + blue * 0.0722;
  }
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // src/modules/link-chat/link-chat-module.ts
  var LinkChatModule = class {
    id = "link-chat";
    #logger = new Logger("link-chat");
    #unsubscribers = [];
    #context;
    #service;
    #roster;
    #presence;
    #view;
    #rosterTimer;
    isEnabled(settings) {
      return settings.linkChat.enabled;
    }
    start(context) {
      this.#context = context;
      this.#service = new ChatService(context.repository, context.settings);
      const activities = new LinkActivitiesService(context.adapter);
      this.#roster = new LinkRosterService(
        context.adapter,
        new PeopleRepository(),
        context.settings
      );
      this.#presence = new LinkPresenceService(
        context.adapter,
        context.settings,
        context.bus,
        context.version
      );
      this.#presence.start();
      this.#roster.prune();
      this.#view = new LinkChatView(
        context.adapter,
        this.#service,
        context.settings,
        context.version,
        activities,
        this.#roster,
        this.#presence
      );
      this.#view.mount();
      this.#unsubscribers.push(
        context.bus.on(
          "bc:status",
          ({ state, message }) => this.#view?.setConnectionState(state, message)
        ),
        context.bus.on("bc:ready", () => {
          void this.#importRecentBeeps();
          this.#syncRoster();
        }),
        context.bus.on("beep:received", (event) => void this.#capture(event)),
        context.bus.on("beep:sent", (event) => void this.#capture(event))
      );
      this.#view.setConnectionState(context.adapter.isReady() ? "ready" : "connecting");
      void this.#service.prune();
      this.#syncRoster();
      this.#rosterTimer = setInterval(() => this.#syncRoster(), 2e3);
    }
    stop() {
      if (this.#rosterTimer !== void 0) clearInterval(this.#rosterTimer);
      this.#rosterTimer = void 0;
      for (const unsubscribe of this.#unsubscribers.splice(0).reverse()) unsubscribe();
      this.#view?.destroy();
      this.#view = void 0;
      this.#presence?.stop();
      this.#presence = void 0;
      this.#service = void 0;
      this.#roster = void 0;
      this.#context = void 0;
    }
    open() {
      void this.#view?.open();
    }
    close() {
      this.#view?.close();
    }
    openChat(memberNumber, memberName) {
      void this.#view?.openChat(memberNumber, memberName);
    }
    openRoster() {
      this.#view?.openRoster();
    }
    openActivities() {
      this.#view?.openActivities();
    }
    async #capture(event) {
      if (!this.#service || !this.#view || !this.#context) return;
      try {
        if (this.#context.settings.get().linkRoster.enabled) {
          this.#roster?.observePerson(event.peerNumber, event.peerName, event.sentAt);
        }
        const active = this.#view.isActiveConversation(event.peerNumber);
        const message = await this.#service.capture(event, active);
        await this.#view.onMessage(event.peerNumber, event.direction === "incoming", message);
        this.#context.bus.emit("link-chat:updated", { peerNumber: event.peerNumber });
      } catch (error) {
        this.#logger.error("Failed to capture a Beep", error);
      }
    }
    #syncRoster() {
      if (!this.#roster || !this.#view || !this.#context) return;
      if (!this.#context.settings.get().linkRoster.enabled) {
        this.#view.onRosterSync({ changed: false, presentCount: 0, joined: [], left: [] });
        return;
      }
      try {
        this.#view.onRosterSync(this.#roster.sync());
      } catch (error) {
        this.#logger.error("Failed to synchronize LinkRoster", error);
      }
    }
    async #importRecentBeeps() {
      if (!this.#service || !this.#view || !this.#context) return;
      try {
        for (const event of this.#context.adapter.getRecentBeeps()) {
          if (this.#context.settings.get().linkRoster.enabled) {
            this.#roster?.observePerson(event.peerNumber, event.peerName, event.sentAt);
          }
          await this.#service.captureRecent(event);
          const nickname = this.#context.adapter.getMemberNickname(event.peerNumber);
          if (nickname) await this.#service.setPeerName(event.peerNumber, nickname);
        }
        await this.#view.refresh();
      } catch (error) {
        this.#logger.error("Failed to import recent Beeps", error);
      }
    }
  };

  // src/storage/indexeddb-chat-repository.ts
  var DATABASE_NAME = "kikilink";
  var DATABASE_VERSION = 1;
  var MESSAGE_STORE = "messages";
  var CONVERSATION_STORE = "conversations";
  var PEER_TIME_INDEX = "peer-time";
  var TIME_INDEX = "time";
  var IndexedDbChatRepository = class {
    #databasePromise;
    async addMessage(message) {
      const database = await this.#database();
      const transaction = database.transaction(MESSAGE_STORE, "readwrite");
      const done = transactionDone(transaction);
      transaction.objectStore(MESSAGE_STORE).put(message);
      await done;
    }
    async getMessages(peerNumber, limit = 200) {
      const database = await this.#database();
      const transaction = database.transaction(MESSAGE_STORE, "readonly");
      const done = transactionDone(transaction);
      const index = transaction.objectStore(MESSAGE_STORE).index(PEER_TIME_INDEX);
      const range = IDBKeyRange.bound([peerNumber, 0], [peerNumber, Number.MAX_SAFE_INTEGER]);
      const messages = [];
      await iterateCursor(index.openCursor(range, "prev"), (cursor) => {
        messages.push(cursor.value);
        return messages.length < limit;
      });
      await done;
      return messages.reverse();
    }
    async getConversation(peerNumber) {
      const database = await this.#database();
      const transaction = database.transaction(CONVERSATION_STORE, "readonly");
      const done = transactionDone(transaction);
      const value = await requestResult(
        transaction.objectStore(CONVERSATION_STORE).get(peerNumber)
      );
      await done;
      return value;
    }
    async listConversations() {
      const database = await this.#database();
      const transaction = database.transaction(CONVERSATION_STORE, "readonly");
      const done = transactionDone(transaction);
      const values = await requestResult(
        transaction.objectStore(CONVERSATION_STORE).getAll()
      );
      await done;
      return values.sort(sortConversations);
    }
    async putConversation(conversation) {
      const database = await this.#database();
      const transaction = database.transaction(CONVERSATION_STORE, "readwrite");
      const done = transactionDone(transaction);
      transaction.objectStore(CONVERSATION_STORE).put(conversation);
      await done;
    }
    async deleteConversation(peerNumber) {
      const database = await this.#database();
      const transaction = database.transaction([MESSAGE_STORE, CONVERSATION_STORE], "readwrite");
      const done = transactionDone(transaction);
      transaction.objectStore(CONVERSATION_STORE).delete(peerNumber);
      const index = transaction.objectStore(MESSAGE_STORE).index(PEER_TIME_INDEX);
      const range = IDBKeyRange.bound([peerNumber, 0], [peerNumber, Number.MAX_SAFE_INTEGER]);
      await iterateCursor(index.openCursor(range), (cursor) => {
        cursor.delete();
        return true;
      });
      await done;
    }
    async deleteMessagesOlderThan(timestamp) {
      const database = await this.#database();
      const transaction = database.transaction(MESSAGE_STORE, "readwrite");
      const done = transactionDone(transaction);
      const index = transaction.objectStore(MESSAGE_STORE).index(TIME_INDEX);
      const range = IDBKeyRange.upperBound(timestamp, true);
      let removed = 0;
      await iterateCursor(index.openCursor(range), (cursor) => {
        cursor.delete();
        removed += 1;
        return true;
      });
      await done;
      return removed;
    }
    async trimConversation(peerNumber, keepNewest) {
      const database = await this.#database();
      const transaction = database.transaction(MESSAGE_STORE, "readwrite");
      const done = transactionDone(transaction);
      const index = transaction.objectStore(MESSAGE_STORE).index(PEER_TIME_INDEX);
      const range = IDBKeyRange.bound([peerNumber, 0], [peerNumber, Number.MAX_SAFE_INTEGER]);
      let visited = 0;
      let removed = 0;
      await iterateCursor(index.openCursor(range, "prev"), (cursor) => {
        visited += 1;
        if (visited > keepNewest) {
          cursor.delete();
          removed += 1;
        }
        return true;
      });
      await done;
      return removed;
    }
    async clearAll() {
      const database = await this.#database();
      const transaction = database.transaction([MESSAGE_STORE, CONVERSATION_STORE], "readwrite");
      const done = transactionDone(transaction);
      transaction.objectStore(MESSAGE_STORE).clear();
      transaction.objectStore(CONVERSATION_STORE).clear();
      await done;
    }
    close() {
      if (!this.#databasePromise) return;
      void this.#databasePromise.then((database) => database.close());
      this.#databasePromise = void 0;
    }
    #database() {
      this.#databasePromise ??= openDatabase();
      return this.#databasePromise;
    }
  };
  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onerror = () => reject(request.error ?? new Error("Unable to open KikiLink storage"));
      request.onblocked = () => reject(new Error("KikiLink storage upgrade is blocked"));
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(MESSAGE_STORE)) {
          const messages = database.createObjectStore(MESSAGE_STORE, { keyPath: "id" });
          messages.createIndex(PEER_TIME_INDEX, ["peerNumber", "sentAt"], { unique: false });
          messages.createIndex(TIME_INDEX, "sentAt", { unique: false });
        }
        if (!database.objectStoreNames.contains(CONVERSATION_STORE)) {
          database.createObjectStore(CONVERSATION_STORE, { keyPath: "peerNumber" });
        }
      };
      request.onsuccess = () => resolve(request.result);
    });
  }
  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("KikiLink storage request failed"));
    });
  }
  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? new Error("KikiLink transaction aborted"));
      transaction.onerror = () => reject(transaction.error ?? new Error("KikiLink transaction failed"));
    });
  }
  function iterateCursor(request, visitor) {
    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error ?? new Error("KikiLink cursor failed"));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || !visitor(cursor)) {
          resolve();
          return;
        }
        cursor.continue();
      };
    });
  }

  // src/storage/resilient-chat-repository.ts
  var ResilientChatRepository = class {
    constructor(primary, fallback) {
      this.primary = primary;
      this.fallback = fallback;
    }
    primary;
    fallback;
    #usingFallback = false;
    addMessage(message) {
      return this.#run((repository) => repository.addMessage(message));
    }
    getMessages(peerNumber, limit) {
      return this.#run((repository) => repository.getMessages(peerNumber, limit));
    }
    getConversation(peerNumber) {
      return this.#run((repository) => repository.getConversation(peerNumber));
    }
    listConversations() {
      return this.#run((repository) => repository.listConversations());
    }
    putConversation(conversation) {
      return this.#run((repository) => repository.putConversation(conversation));
    }
    deleteConversation(peerNumber) {
      return this.#run((repository) => repository.deleteConversation(peerNumber));
    }
    deleteMessagesOlderThan(timestamp) {
      return this.#run((repository) => repository.deleteMessagesOlderThan(timestamp));
    }
    trimConversation(peerNumber, keepNewest) {
      return this.#run((repository) => repository.trimConversation(peerNumber, keepNewest));
    }
    clearAll() {
      return this.#run((repository) => repository.clearAll());
    }
    close() {
      this.primary.close();
      this.fallback.close();
    }
    async #run(operation) {
      if (this.#usingFallback) return operation(this.fallback);
      try {
        return await operation(this.primary);
      } catch (error) {
        this.#usingFallback = true;
        this.primary.close();
        console.warn("[KikiLink:storage] IndexedDB unavailable; using session-only memory storage", error);
        return operation(this.fallback);
      }
    }
  };

  // src/core/module-registry.ts
  var ModuleRegistry = class {
    #modules = /* @__PURE__ */ new Map();
    #started = /* @__PURE__ */ new Set();
    #logger = new Logger("modules");
    register(module) {
      if (this.#modules.has(module.id)) {
        throw new Error(`Module '${module.id}' is already registered`);
      }
      this.#modules.set(module.id, module);
    }
    async startAll(context) {
      for (const module of this.#modules.values()) {
        if (!module.isEnabled(context.settings.get())) continue;
        try {
          await module.start(context);
          this.#started.add(module.id);
          this.#logger.info(`Started ${module.id}`);
        } catch (error) {
          this.#logger.error(`Failed to start ${module.id}`, error);
        }
      }
    }
    async stopAll() {
      const startedModules = [...this.#started].reverse();
      for (const id of startedModules) {
        const module = this.#modules.get(id);
        if (!module) continue;
        try {
          await module.stop();
        } catch (error) {
          this.#logger.error(`Failed to stop ${id}`, error);
        }
      }
      this.#started.clear();
    }
  };

  // src/core/kikilink.ts
  var KikiLinkApp = class {
    constructor(version) {
      this.version = version;
      this.#adapter = new BCAdapter(this.#bus, version);
      this.#modules.register(this.#linkChat);
    }
    version;
    #logger = new Logger("core");
    #bus = new EventBus();
    #settings = new SettingsStore();
    #repository = typeof indexedDB === "undefined" ? new MemoryChatRepository() : new ResilientChatRepository(new IndexedDbChatRepository(), new MemoryChatRepository());
    #adapter;
    #modules = new ModuleRegistry();
    #linkChat = new LinkChatModule();
    #adapterStart;
    #started = false;
    publicApi() {
      return {
        name: "KikiLink",
        open: () => this.#linkChat.open(),
        openChat: (memberNumber, memberName) => this.#linkChat.openChat(memberNumber, memberName),
        openRoster: () => this.#linkChat.openRoster(),
        openActivities: () => this.#linkChat.openActivities(),
        close: () => this.#linkChat.close(),
        getVersion: () => this.version,
        destroy: () => this.destroy()
      };
    }
    async start() {
      if (this.#started) return;
      this.#started = true;
      await waitForDocumentBody();
      if (!this.#started) return;
      await this.#modules.startAll({
        adapter: this.#adapter,
        bus: this.#bus,
        repository: this.#repository,
        settings: this.#settings,
        version: this.version
      });
      this.#adapterStart = this.#adapter.start().catch((error) => {
        this.#logger.error("Bondage Club connection failed", error);
      });
      this.#logger.info(`KikiLink ${this.version} interface is ready`);
    }
    async destroy() {
      if (!this.#started) return;
      this.#started = false;
      this.#adapter.stop();
      await this.#adapterStart;
      this.#adapterStart = void 0;
      await this.#modules.stopAll();
      this.#repository.close();
      this.#bus.clear();
      this.#logger.info("Stopped");
    }
  };
  async function waitForDocumentBody() {
    while (typeof document === "undefined" || document.body === null) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  // src/index.ts
  async function bootstrap() {
    const previous = window.KikiLink;
    if (previous) await previous.destroy();
    const app = new KikiLinkApp("0.14.0");
    window.KikiLink = app.publicApi();
    try {
      await app.start();
    } catch (error) {
      console.error("[KikiLink] Startup failed", error);
    }
  }
  void bootstrap();
})();
