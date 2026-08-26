// ==UserScript==
// @name         KikiLink
// @namespace    kikilink.bc
// @version      0.22.1
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
// @grant        GM_xmlhttpRequest
// @connect      catbox.moe
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

  // src/bc/message-content.ts
  var MAX_BEEP_MESSAGE_LENGTH = 1e3;
  var MESSAGE_METADATA_MARKER = "\uF124";
  var MAX_METADATA_LENGTH = 128;
  function cleanBeepMessageContent(value) {
    if (typeof value !== "string") return "";
    const fallback = value.slice(0, MAX_BEEP_MESSAGE_LENGTH);
    const markerIndex = value.lastIndexOf(MESSAGE_METADATA_MARKER);
    if (markerIndex < 0) return fallback;
    const encodedMetadata = value.slice(markerIndex + MESSAGE_METADATA_MARKER.length).trim();
    if (!encodedMetadata || encodedMetadata.length > MAX_METADATA_LENGTH) return fallback;
    try {
      const metadata = JSON.parse(encodedMetadata);
      if (!isMessageMetadata(metadata)) return fallback;
    } catch {
      return fallback;
    }
    return value.slice(0, markerIndex).trimEnd().slice(0, MAX_BEEP_MESSAGE_LENGTH);
  }
  function isMessageMetadata(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const metadata = value;
    const keys = Object.keys(metadata);
    return keys.length === 2 && keys.includes("messageType") && keys.includes("messageColor") && metadata.messageType === "Message" && typeof metadata.messageColor === "string" && /^#[0-9a-f]{6}$/iu.test(metadata.messageColor);
  }

  // src/bc/adapter.ts
  var READY_POLL_MS = 400;
  var ACTIVITY_HOOK_RETRY_MS = 500;
  var CHARACTER_OVERLAY_HOOK_RETRY_MS = 500;
  var SOCKET_REBIND_MS = 2e3;
  var BEEP_LOG_POLL_MS = 1e3;
  var RECENT_INCOMING_TTL_MS = 1e4;
  var RECENT_OUTGOING_TTL_MS = 1e4;
  var OUTGOING_DEDUPE_WINDOW_MS = 250;
  var KIKILINK_BEEP_TYPE = "KikiLink";
  var KIKILINK_PROTOCOL_PREFIX = "KIKILINK/1 ";
  var MAX_PROTOCOL_PAYLOAD = 700;
  var CUSTOM_ACTIVITY_HOOK_COUNT = 6;
  var CHARACTER_OVERLAY_HOOK_NAME = "ChatRoomDrawCharacterStatusIcons";
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
    #recentOutgoing = [];
    #characterOverlayRenderers = /* @__PURE__ */ new Set();
    #customActivityIntegrations = /* @__PURE__ */ new Set();
    #installedActivityHooks = /* @__PURE__ */ new Set();
    #installedOutgoingHooks = /* @__PURE__ */ new Set();
    #resilientHooks = /* @__PURE__ */ new Map();
    #directHookRegistrations = /* @__PURE__ */ new Map();
    #modApi;
    #socket;
    #socketRebindTimer;
    #beepLogTimer;
    #activityHookRetryTimer;
    #characterOverlayHookRetryTimer;
    #characterOverlayHookNames = /* @__PURE__ */ new Set();
    #overlayRenderSignatures = /* @__PURE__ */ new Set();
    #overlayRenderResetQueued = false;
    #beepLogCursor = 0;
    #seenIncomingPayloads = /* @__PURE__ */ new WeakSet();
    #seenRoomProtocolPayloads = /* @__PURE__ */ new WeakSet();
    #stopped = false;
    #ready = false;
    #sendingViaKikiLink = false;
    #hasOnlineFriendSnapshot = false;
    #onlineFriendSignature;
    #compatibilityHooksInitialized = false;
    #roomMessageHookInstalled = false;
    #socketBeepListener = (data) => {
      this.#captureIncomingPayload(data);
    };
    #socketQueryListener = (data) => {
      this.#captureOnlineFriends(data);
    };
    #socketRoomMessageListener = (data) => {
      this.#captureRoomProtocolPayload(data);
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
      this.#beepLogTimer = setInterval(() => {
        this.#ensureOutgoingBeepHooks();
        this.#captureNewBeepLogEntries();
      }, BEEP_LOG_POLL_MS);
      this.#ready = true;
      this.bus.emit("bc:status", { state: "ready" });
      this.bus.emit("bc:ready", { memberNumber: Player.MemberNumber });
      this.#logger.info(`Connected as ${Player.Name} [${Player.MemberNumber}]`);
    }
    stop() {
      this.#stopped = true;
      this.#ready = false;
      this.#onlineFriends.clear();
      this.#nicknameCache.clear();
      this.#recentIncoming.splice(0);
      this.#recentOutgoing.splice(0);
      this.#seenIncomingPayloads = /* @__PURE__ */ new WeakSet();
      this.#seenRoomProtocolPayloads = /* @__PURE__ */ new WeakSet();
      this.#hasOnlineFriendSnapshot = false;
      this.#onlineFriendSignature = void 0;
      if (this.#socketRebindTimer !== void 0) clearInterval(this.#socketRebindTimer);
      if (this.#beepLogTimer !== void 0) clearInterval(this.#beepLogTimer);
      if (this.#activityHookRetryTimer !== void 0) clearInterval(this.#activityHookRetryTimer);
      if (this.#characterOverlayHookRetryTimer !== void 0) {
        clearInterval(this.#characterOverlayHookRetryTimer);
      }
      this.#socketRebindTimer = void 0;
      this.#beepLogTimer = void 0;
      this.#activityHookRetryTimer = void 0;
      this.#characterOverlayHookRetryTimer = void 0;
      this.#detachSocketListeners();
      for (const unhook of this.#unhooks.splice(0).reverse()) unhook();
      this.#modApi?.unload();
      this.#modApi = void 0;
      this.#compatibilityHooksInitialized = false;
      this.#roomMessageHookInstalled = false;
      this.#installedActivityHooks.clear();
      this.#installedOutgoingHooks.clear();
      this.#resilientHooks.clear();
      this.#directHookRegistrations.clear();
      this.#characterOverlayHookNames.clear();
      this.#overlayRenderSignatures.clear();
      this.#overlayRenderResetQueued = false;
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
    registerCharacterOverlay(renderer) {
      this.#characterOverlayRenderers.add(renderer);
      if (this.#compatibilityHooksInitialized) this.#ensureCharacterOverlayHook();
      return () => this.#characterOverlayRenderers.delete(renderer);
    }
    registerCustomActivityIntegration(integration) {
      this.#customActivityIntegrations.add(integration);
      if (this.#compatibilityHooksInitialized) this.#ensureActivityHooks();
      return () => this.#customActivityIntegrations.delete(integration);
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
      if (Array.isArray(Player.FriendList)) return Player.FriendList.includes(memberNumber);
      return Player.FriendNames instanceof Map && Player.FriendNames.has(memberNumber);
    }
    getPlayerRelationships(memberNumber) {
      if (!Number.isSafeInteger(memberNumber) || memberNumber < 0 || typeof Player !== "object" || Player === null) {
        return [];
      }
      const relationships = [];
      if (Player.Ownership?.MemberNumber === memberNumber) relationships.push("owner");
      if (Array.isArray(Player.Lovership) && Player.Lovership.some((relationship) => relationship?.MemberNumber === memberNumber)) {
        relationships.push("lover");
      }
      if (Array.isArray(Player.WhiteList) && Player.WhiteList.includes(memberNumber)) {
        relationships.push("whitelist");
      }
      if (Array.isArray(Player.BlackList) && Player.BlackList.includes(memberNumber)) {
        relationships.push("blacklist");
      }
      if (Array.isArray(Player.GhostList) && Player.GhostList.includes(memberNumber)) {
        relationships.push("ghosted");
      }
      return relationships;
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
      this.#rememberOutgoing(event, "kikilink");
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
    getRoomAdminSnapshot() {
      if (!this.isInChatRoom() || typeof ChatRoomData !== "object" || ChatRoomData === null) {
        return void 0;
      }
      try {
        const admins = Array.isArray(ChatRoomData.Admin) ? ChatRoomData.Admin : [];
        const whitelist = Array.isArray(ChatRoomData.Whitelist) ? ChatRoomData.Whitelist : [];
        const custom = ChatRoomData.Custom;
        return {
          roomName: cleanName(ChatRoomData.Name) ?? "Current room",
          isAdmin: this.#isRoomAdmin(admins),
          customization: {
            imageUrl: cleanName(custom?.ImageURL) ?? "",
            musicUrl: cleanName(custom?.MusicURL) ?? "",
            sizeMode: typeof custom?.SizeMode === "number" && Number.isInteger(custom.SizeMode) && custom.SizeMode >= 1 && custom.SizeMode <= 3 ? custom.SizeMode : 1,
            musicSync: typeof custom?.MusicStart === "number"
          },
          settings: {
            name: cleanName(ChatRoomData.Name) ?? "Current room",
            description: cleanText(ChatRoomData.Description, 200),
            background: cleanText(ChatRoomData.Background, 120),
            limit: boundedInteger(ChatRoomData.Limit, 2, 20, 10),
            game: cleanText(ChatRoomData.Game, 40),
            space: cleanText(ChatRoomData.Space, 20),
            language: cleanText(ChatRoomData.Language, 12),
            visibility: cleanStringArray(ChatRoomData.Visibility, 8, 30),
            access: cleanStringArray(ChatRoomData.Access, 8, 30),
            blockCategory: cleanStringArray(ChatRoomData.BlockCategory, 24, 40),
            admins: cleanMemberNumberArray(admins, 20),
            whitelist: cleanMemberNumberArray(whitelist, 100),
            blacklist: cleanMemberNumberArray(ChatRoomData.Ban, 100),
            custom: {
              imageUrl: cleanText(custom?.ImageURL, 500),
              imageFilter: cleanText(custom?.ImageFilter, 120),
              musicUrl: cleanText(custom?.MusicURL, 500),
              sizeMode: boundedInteger(custom?.SizeMode, 1, 3, 1),
              musicSync: typeof custom?.MusicStart === "number"
            }
          },
          players: this.getRoomCharacters().map((character) => ({
            ...character,
            admin: admins.includes(character.memberNumber),
            whitelisted: whitelist.includes(character.memberNumber)
          }))
        };
      } catch (error) {
        this.#logger.warn("Room administration data was not readable", error);
        return void 0;
      }
    }
    updateRoomCustomization(customization) {
      const snapshot = this.getRoomAdminSnapshot();
      if (!snapshot) throw new Error("Open a Bondage Club chat room first");
      if (!snapshot.isAdmin) throw new Error("Only a room administrator can change room media");
      if (typeof ServerSend !== "function") throw new Error("Bondage Club is still connecting");
      const imageUrl = normalizeRoomMediaUrl(customization.imageUrl, "image");
      const musicUrl = normalizeRoomMediaUrl(customization.musicUrl, "audio");
      const sizeMode = Number.isInteger(customization.sizeMode) ? Math.min(3, Math.max(1, customization.sizeMode)) : 1;
      const room = typeof ChatRoomGetSettings === "function" ? ChatRoomGetSettings(ChatRoomData) : { ...ChatRoomData };
      const custom = {
        ...ChatRoomData?.Custom ?? {},
        SizeMode: sizeMode
      };
      if (customization.musicSync) {
        const existingMusicUrl = cleanName(ChatRoomData?.Custom?.MusicURL);
        const existingMusicStart = ChatRoomData?.Custom?.MusicStart;
        custom.MusicStart = musicUrl === existingMusicUrl && typeof existingMusicStart === "number" && Number.isFinite(existingMusicStart) ? existingMusicStart : typeof CurrentTime === "number" && Number.isFinite(CurrentTime) ? CurrentTime : Date.now();
      } else {
        delete custom.MusicStart;
      }
      if (imageUrl) custom.ImageURL = imageUrl;
      else delete custom.ImageURL;
      if (musicUrl) custom.MusicURL = musicUrl;
      else delete custom.MusicURL;
      room.Custom = custom;
      ServerSend("ChatRoomAdmin", {
        MemberNumber: typeof Player.ID === "number" && Number.isSafeInteger(Player.ID) ? Player.ID : Player.MemberNumber,
        Room: room,
        Action: "Update"
      });
    }
    applyRoomPreset(preset) {
      const snapshot = this.getRoomAdminSnapshot();
      if (!snapshot) throw new Error("Open a Bondage Club chat room first");
      if (!snapshot.isAdmin) throw new Error("Only a room administrator can apply room presets");
      if (typeof ServerSend !== "function") throw new Error("Bondage Club is still connecting");
      const current = ChatRoomData;
      const room = typeof ChatRoomGetSettings === "function" ? ChatRoomGetSettings(current) : { ...current };
      const ownMemberNumber = this.getOwnMemberNumber();
      const admins = cleanMemberNumberArray(preset.admins, 20);
      if (!admins.includes(ownMemberNumber)) admins.unshift(ownMemberNumber);
      room.Name = cleanText(preset.name, 80) || snapshot.roomName;
      room.Description = cleanText(preset.description, 200);
      room.Background = cleanText(preset.background, 120);
      room.Limit = boundedInteger(preset.limit, 2, 20, 10);
      room.Game = cleanText(preset.game, 40);
      room.Space = cleanText(preset.space, 20);
      room.Language = cleanText(preset.language, 12);
      room.Visibility = cleanStringArray(preset.visibility, 8, 30);
      room.Access = cleanStringArray(preset.access, 8, 30);
      room.BlockCategory = cleanStringArray(preset.blockCategory, 24, 40);
      room.Admin = admins;
      room.Whitelist = cleanMemberNumberArray(preset.whitelist, 100);
      room.Ban = cleanMemberNumberArray(preset.blacklist, 100);
      const custom = {
        ...current.Custom ?? {},
        SizeMode: boundedInteger(preset.custom.sizeMode, 1, 3, 1)
      };
      const imageUrl = normalizeRoomMediaUrl(preset.custom.imageUrl, "image");
      const musicUrl = normalizeRoomMediaUrl(preset.custom.musicUrl, "audio");
      if (imageUrl) custom.ImageURL = imageUrl;
      else delete custom.ImageURL;
      if (musicUrl) custom.MusicURL = musicUrl;
      else delete custom.MusicURL;
      const imageFilter = cleanText(preset.custom.imageFilter, 120);
      if (imageFilter) custom.ImageFilter = imageFilter;
      else delete custom.ImageFilter;
      if (preset.custom.musicSync && musicUrl) {
        custom.MusicStart = typeof CurrentTime === "number" && Number.isFinite(CurrentTime) ? CurrentTime : Date.now();
      } else {
        delete custom.MusicStart;
      }
      room.Custom = custom;
      ServerSend("ChatRoomAdmin", {
        MemberNumber: typeof Player.ID === "number" && Number.isSafeInteger(Player.ID) ? Player.ID : Player.MemberNumber,
        Room: room,
        Action: "Update"
      });
    }
    getRoomSearchSpace() {
      let roomSpace;
      try {
        roomSpace = typeof ChatRoomData === "object" && ChatRoomData !== null ? ChatRoomData.Space : void 0;
      } catch {
      }
      if (roomSpace === "" || roomSpace === "X" || roomSpace === "M") {
        return roomSpace;
      }
      try {
        const lastRoomSpace = typeof Player === "object" && Player !== null ? Player.LastChatRoom?.Space : void 0;
        return normalizeRoomSearchSpace(lastRoomSpace);
      } catch {
        return "";
      }
    }
    async searchRooms(query = "", space = this.getRoomSearchSpace()) {
      if (typeof ServerRoomSearch !== "function") {
        throw new Error("Bondage Club's room search is still loading");
      }
      const normalizedQuery = query.trim().slice(0, 40).toLocaleUpperCase();
      const request = {
        Query: normalizedQuery,
        Language: "",
        Space: normalizeRoomSearchSpace(space),
        Game: "",
        FullRooms: true,
        ShowLocked: true,
        SearchDescs: true
      };
      try {
        const search = ServerRoomSearch;
        let response;
        try {
          response = await search(normalizedQuery, request);
        } catch {
          response = await search(request);
        }
        if (response && !Array.isArray(response) && typeof response === "object" && (response.err || response.error)) {
          throw new Error("Room search returned an error");
        }
        const value = Array.isArray(response) ? response : response && typeof response === "object" && Array.isArray(response.value) ? response.value : [];
        return value.map((candidate) => normalizeLobbyRoom(candidate)).filter((candidate) => candidate !== void 0).sort(
          (left, right) => Number(right.friends.length > 0) - Number(left.friends.length > 0) || right.friends.length - left.friends.length || Number(right.canJoin) - Number(left.canJoin) || left.name.localeCompare(right.name)
        );
      } catch (error) {
        this.#logger.warn("Room directory could not be read", error);
        throw new Error("Bondage Club could not refresh the room list");
      }
    }
    joinRoom(name) {
      const roomName = cleanText(name, 80);
      if (!roomName) throw new Error("Choose a room first");
      if (typeof ServerSend !== "function") throw new Error("Bondage Club is still connecting");
      ServerSend("ChatRoomJoin", { Name: roomName });
    }
    runRoomMemberAction(memberNumber, action) {
      const snapshot = this.getRoomAdminSnapshot();
      if (!snapshot) throw new Error("Open a Bondage Club chat room first");
      if (!snapshot.isAdmin) throw new Error("Only a room administrator can manage players");
      if (!snapshot.players.some((player) => player.memberNumber === memberNumber)) {
        throw new Error("This player is no longer in the room");
      }
      if (memberNumber === this.getOwnMemberNumber()) throw new Error("Choose another player");
      if (typeof ServerSend !== "function") throw new Error("Bondage Club is still connecting");
      const nativeAction = {
        kick: "Kick",
        promote: "Promote",
        demote: "Demote",
        whitelist: "Whitelist",
        unwhitelist: "Unwhitelist"
      };
      ServerSend("ChatRoomAdmin", {
        MemberNumber: memberNumber,
        Action: nativeAction[action],
        ...action === "kick" ? { Publish: true } : {}
      });
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
    #isRoomAdmin(admins) {
      try {
        if (typeof ChatRoomPlayerIsAdmin === "function") return ChatRoomPlayerIsAdmin();
      } catch {
      }
      return admins.includes(this.getOwnMemberNumber());
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
      let modApi;
      try {
        modApi = currentModSdk().registerMod(
          {
            name: "KikiLink",
            fullName: "KikiLink",
            version: this.version
          },
          { allowReplace: true }
        );
        this.#modApi = modApi;
      } catch (error) {
        this.#modApi = void 0;
        this.#logger.warn("ModSDK hooks unavailable; direct Bondage Club hooks remain active", error);
      }
      this.#compatibilityHooksInitialized = true;
      if (modApi) {
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
      }
      this.#ensureOutgoingBeepHooks();
      this.#ensureActivityHooks();
      if (this.#activityHookRetryTimer === void 0) {
        this.#activityHookRetryTimer = setInterval(
          () => this.#ensureActivityHooks(),
          ACTIVITY_HOOK_RETRY_MS
        );
      }
      this.#ensureCharacterOverlayHook();
      if (this.#characterOverlayHookRetryTimer === void 0) {
        this.#characterOverlayHookRetryTimer = setInterval(
          () => this.#ensureCharacterOverlayHook(),
          CHARACTER_OVERLAY_HOOK_RETRY_MS
        );
      }
    }
    #ensureOutgoingBeepHooks() {
      if (!this.#compatibilityHooksInitialized) return;
      const name = "ServerSend";
      const existing = this.#resilientHooks.get(name);
      if (this.#installedOutgoingHooks.has(name)) {
        if (!this.#modApi && existing) this.#ensureDirectHook(name, existing);
        return;
      }
      if (typeof ServerSend !== "function") return;
      const hook = (args, next) => {
        const result = next(args);
        if (!this.#sendingViaKikiLink) this.#captureOutgoingServerPacket(args[0], args[1]);
        return result;
      };
      if (this.#installIntegrationHook(name, 0, hook)) {
        this.#installedOutgoingHooks.add(name);
      }
    }
    #ensureCharacterOverlayHook() {
      if (!this.#compatibilityHooksInitialized) return;
      const name = CHARACTER_OVERLAY_HOOK_NAME;
      const existing = this.#resilientHooks.get(name);
      if (this.#characterOverlayHookNames.has(name)) {
        if (!this.#modApi && existing) this.#ensureDirectHook(name, existing);
        return;
      }
      if (typeof ChatRoomDrawCharacterStatusIcons !== "function") return;
      const hook = (args, next) => {
        const result = next(args);
        this.#renderCharacterOverlays(args[0], args[1], args[2], args[3]);
        return result;
      };
      if (this.#installIntegrationHook(name, 10, hook)) {
        this.#characterOverlayHookNames.add(name);
      }
    }
    #ensureActivityHooks() {
      if (!this.#compatibilityHooksInitialized) return;
      this.#ensureRoomMessageHook();
      if (!this.#modApi) {
        for (const name of this.#installedActivityHooks) {
          const hook = this.#resilientHooks.get(name);
          if (hook) this.#ensureDirectHook(name, hook);
        }
      }
      if (this.#installedActivityHooks.size === CUSTOM_ACTIVITY_HOOK_COUNT) return;
      const allowedHook = (args, next) => {
        const activities = next(args);
        if (!Array.isArray(activities)) return activities;
        return this.#extendAllowedActivities(args[0], args[1], activities);
      };
      this.#tryInstallActivityHook(
        "ActivityAllowedForGroup",
        typeof ActivityAllowedForGroup === "function",
        10,
        allowedHook
      );
      const dialogBuildHook = (args, next) => {
        const result = next(args);
        if (!Array.isArray(DialogActivity)) return result;
        const character = args[0];
        const groupName = character?.FocusGroup?.Name;
        if (typeof groupName !== "string") return result;
        const extended = this.#extendAllowedActivities(character, groupName, DialogActivity);
        if (extended === DialogActivity) return result;
        DialogActivity = extended;
        if ((args[1] ?? true) && DialogMenuMode === "activities") {
          try {
            const reload = DialogMenuMapping?.activities?.Reload;
            if (typeof reload === "function") {
              const pending = reload.call(DialogMenuMapping.activities, null, {
                reset: true,
                resetDialogItems: false
              });
              if (pending && typeof pending.catch === "function") {
                void pending.catch(
                  (error) => this.#logger.warn("Native custom activity grid refresh failed", error)
                );
              }
            }
          } catch (error) {
            this.#logger.warn("Native custom activity grid refresh failed", error);
          }
        }
        return result;
      };
      this.#tryInstallActivityHook(
        "DialogBuildActivities",
        typeof DialogBuildActivities === "function",
        -10,
        dialogBuildHook
      );
      const dictionaryHook = (args, next) => {
        const keyword = typeof args[0] === "string" ? args[0] : "";
        for (const integration of [...this.#customActivityIntegrations]) {
          const resolved = this.#callActivityIntegration(
            integration,
            () => integration.resolveText(keyword)
          );
          if (resolved !== void 0) return resolved;
        }
        return next(args);
      };
      this.#tryInstallActivityHook(
        "ActivityDictionaryText",
        typeof ActivityDictionaryText === "function",
        10,
        dictionaryHook
      );
      const runHook = (args, next) => {
        for (const integration of [...this.#customActivityIntegrations]) {
          const handled = this.#callActivityIntegration(
            integration,
            () => integration.run(args[0], args[1], args[2], args[3])
          );
          if (handled) return void 0;
        }
        return next(args);
      };
      this.#tryInstallActivityHook(
        "ActivityRun",
        typeof ActivityRun === "function",
        10,
        runHook
      );
      const activityButtonHook = (args, next) => {
        const itemActivity = args[1];
        const activityName = itemActivity?.Activity?.Name;
        if (typeof activityName === "string") {
          for (const integration of [...this.#customActivityIntegrations]) {
            const image = this.#callActivityIntegration(
              integration,
              () => integration.resolveImage(activityName)
            );
            if (image !== void 0) {
              args[4] = { ...args[4] ?? {}, image };
              break;
            }
          }
        }
        const button = next(args);
        for (const integration of [...this.#customActivityIntegrations]) {
          this.#callActivityIntegration(integration, () => {
            integration.decorateButton(button, itemActivity);
          });
        }
        return button;
      };
      this.#tryInstallActivityHook(
        "ElementButton.CreateForActivity",
        typeof ElementButton === "object" && ElementButton !== null && typeof ElementButton.CreateForActivity === "function",
        10,
        activityButtonHook
      );
      const preferenceHook = (args, next) => {
        const activityName = typeof args[1] === "string" ? args[1] : "";
        for (const integration of [...this.#customActivityIntegrations]) {
          const custom = this.#callActivityIntegration(
            integration,
            () => integration.isCustomActivity?.(activityName) ?? false
          );
          if (custom) return 2;
        }
        return next(args);
      };
      this.#tryInstallActivityHook(
        "PreferenceGetActivityFactor",
        typeof PreferenceGetActivityFactor === "function",
        10,
        preferenceHook
      );
    }
    #tryInstallActivityHook(name, available, priority, hook) {
      if (!available || this.#installedActivityHooks.has(name)) return;
      if (this.#installIntegrationHook(name, priority, hook)) {
        this.#installedActivityHooks.add(name);
      }
    }
    #ensureRoomMessageHook() {
      const name = "ChatRoomMessage";
      if (this.#roomMessageHookInstalled) {
        if (!this.#modApi) {
          const existing = this.#resilientHooks.get(name);
          if (existing) this.#ensureDirectHook(name, existing);
        }
        return;
      }
      if (typeof ChatRoomMessage !== "function") return;
      const hook = (args, next) => {
        this.#captureRoomProtocolPayload(args[0]);
        this.#notifyCustomActivityMessage(args[0]);
        return next(args);
      };
      if (this.#installIntegrationHook(name, 0, hook)) {
        this.#roomMessageHookInstalled = true;
      }
    }
    #renderCharacterOverlays(character, characterX, characterY, zoom) {
      const signature = `${character?.MemberNumber ?? "?"}:${characterX}:${characterY}:${zoom}`;
      if (this.#overlayRenderSignatures.has(signature)) return;
      this.#overlayRenderSignatures.add(signature);
      if (!this.#overlayRenderResetQueued) {
        this.#overlayRenderResetQueued = true;
        queueMicrotask(() => {
          this.#overlayRenderSignatures.clear();
          this.#overlayRenderResetQueued = false;
        });
      }
      for (const renderer of [...this.#characterOverlayRenderers]) {
        try {
          renderer(character, characterX, characterY, zoom);
        } catch (error) {
          this.#logger.warn("Character overlay renderer failed for this frame", error);
        }
      }
    }
    #extendAllowedActivities(character, groupName, activities) {
      let extended = activities;
      for (const integration of [...this.#customActivityIntegrations]) {
        const candidate = this.#callActivityIntegration(
          integration,
          () => integration.extendAllowedActivities?.(character, groupName, extended)
        );
        if (Array.isArray(candidate)) extended = candidate;
      }
      return extended;
    }
    #notifyCustomActivityMessage(message) {
      for (const integration of [...this.#customActivityIntegrations]) {
        this.#callActivityIntegration(integration, () => integration.onRoomMessage(message));
      }
    }
    #callActivityIntegration(integration, call) {
      try {
        return call();
      } catch (error) {
        this.#logger.warn(
          `${integration.constructor.name || "Custom activity integration"} failed for this call`,
          error
        );
        return void 0;
      }
    }
    #installIntegrationHook(name, priority, hook) {
      this.#resilientHooks.set(name, hook);
      const installed = this.#modApi ? this.#tryInstallHook(
        name,
        () => this.#modApi.hookFunction(name, priority, hook)
      ) : this.#ensureDirectHook(name, hook);
      if (!installed) this.#resilientHooks.delete(name);
      return installed;
    }
    #tryInstallHook(name, install) {
      try {
        const sdkUnhook = install();
        this.#unhooks.push(sdkUnhook);
        return true;
      } catch (error) {
        this.#logger.warn(`${name} hook unavailable; retrying after native load`, error);
        return false;
      }
    }
    #ensureDirectHook(name, hook) {
      const existing = this.#directHookRegistrations.get(name);
      if (existing?.isCurrent()) return true;
      const registration = this.#installDirectHook(name, hook);
      if (!registration) return false;
      this.#directHookRegistrations.set(name, registration);
      this.#unhooks.push(registration.unhook);
      this.#logger.info(`${name} live hook installed`);
      return true;
    }
    #installDirectHook(name, hook) {
      const path = name.split(".");
      let context = window;
      for (const key of path.slice(0, -1)) {
        const next = context[key];
        if (!next || typeof next !== "object" && typeof next !== "function") return void 0;
        context = next;
      }
      const property = path.at(-1);
      if (!property) return void 0;
      const original = context[property];
      if (typeof original !== "function") return void 0;
      const adapter = this;
      const wrapper = function(...args) {
        if (adapter.#stopped) return original.apply(this, args);
        return hook(args, (nextArgs) => original.apply(this, nextArgs));
      };
      context[property] = wrapper;
      return {
        isCurrent: () => context[property] === wrapper,
        unhook: () => {
          if (context[property] === wrapper) context[property] = original;
        }
      };
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
        socket.on("ChatRoomMessage", this.#socketRoomMessageListener);
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
        socket.off("ChatRoomMessage", this.#socketRoomMessageListener);
        return;
      }
      socket.removeListener?.("AccountBeep", this.#socketBeepListener);
      socket.removeListener?.("AccountQueryResult", this.#socketQueryListener);
      socket.removeListener?.("ChatRoomMessage", this.#socketRoomMessageListener);
    }
    #captureOutgoingServerPacket(messageType, payload) {
      if (messageType !== "AccountBeep" || !payload || typeof payload !== "object") return;
      try {
        const data = payload;
        if (data.BeepType != null && data.BeepType !== "") return;
        if (!Number.isSafeInteger(data.MemberNumber) || data.MemberNumber < 0) return;
        const event = this.#normalizeOutgoing(
          data.MemberNumber,
          typeof data.Message === "string" ? data.Message : void 0,
          { includeRoom: data.IsSecret === false }
        );
        if (event) this.#captureOutgoing(event, "transport");
      } catch (error) {
        this.#logger.warn("Outgoing AccountBeep metadata was not readable", error);
      }
    }
    #captureRoomProtocolPayload(data) {
      if (!data || typeof data !== "object") return;
      try {
        if (this.#seenRoomProtocolPayloads.has(data)) return;
        this.#seenRoomProtocolPayloads.add(data);
        const protocol = this.#normalizeRoomProtocol(data);
        if (protocol) this.bus.emit("bc:protocol", protocol);
      } catch (error) {
        this.#logger.warn("Hidden KikiLink room packet was not readable", error);
      }
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
        const event = this.#normalizeBeepLogEntry(entry);
        if (!event) continue;
        if (entry.Sent) {
          this.#captureOutgoing(event, "log");
        } else if (!this.#consumeRememberedIncoming(event)) {
          this.bus.emit("beep:received", event);
        }
      }
      this.#pruneRememberedIncoming();
      this.#pruneRememberedOutgoing();
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
        content: cleanBeepMessageContent(entry.Message),
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
    #captureOutgoing(event, source) {
      this.#pruneRememberedOutgoing();
      const fingerprint = outgoingFingerprint(event);
      if (this.#recentOutgoing.some(
        (candidate) => candidate.source !== source && candidate.fingerprint === fingerprint && Math.abs(candidate.sentAt - event.sentAt) <= OUTGOING_DEDUPE_WINDOW_MS
      )) {
        return;
      }
      this.#rememberOutgoing(event, source);
      this.bus.emit("beep:sent", event);
    }
    #rememberOutgoing(event, source) {
      this.#recentOutgoing.push({
        fingerprint: outgoingFingerprint(event),
        sentAt: event.sentAt,
        capturedAt: Date.now(),
        source
      });
      this.#pruneRememberedOutgoing();
    }
    #pruneRememberedOutgoing(now = Date.now()) {
      while (this.#recentOutgoing.length > 0) {
        const first = this.#recentOutgoing[0];
        if (!first || now - first.capturedAt <= RECENT_OUTGOING_TTL_MS) break;
        this.#recentOutgoing.shift();
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
        content: cleanBeepMessageContent(data.Message),
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
        content: cleanBeepMessageContent(message),
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
  function cleanText(value, maxLength) {
    return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/gu, " ").trim().slice(0, maxLength) : "";
  }
  function boundedInteger(value, min, max, fallback) {
    return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
  }
  function cleanStringArray(value, limit, maxLength) {
    if (!Array.isArray(value)) return [];
    const result = /* @__PURE__ */ new Set();
    for (const candidate of value) {
      const text = cleanText(candidate, maxLength);
      if (text) result.add(text);
      if (result.size >= limit) break;
    }
    return [...result];
  }
  function cleanMemberNumberArray(value, limit) {
    if (!Array.isArray(value)) return [];
    const result = /* @__PURE__ */ new Set();
    for (const candidate of value) {
      if (typeof candidate === "number" && Number.isSafeInteger(candidate) && candidate >= 0) {
        result.add(candidate);
      }
      if (result.size >= limit) break;
    }
    return [...result];
  }
  function normalizeLobbyRoom(value) {
    try {
      if (!value || typeof value !== "object") return void 0;
      const name = cleanText(value.Name, 80);
      if (!name) return void 0;
      const friends = [];
      const friendIds = /* @__PURE__ */ new Set();
      if (Array.isArray(value.Friends)) {
        for (const friend of value.Friends.slice(0, 12)) {
          if (!friend || typeof friend !== "object") continue;
          const memberNumber = friend.MemberNumber;
          if (!Number.isSafeInteger(memberNumber) || memberNumber < 0 || friendIds.has(memberNumber)) {
            continue;
          }
          friends.push({
            memberNumber,
            memberName: cleanText(friend.MemberNickname, 80) || cleanText(friend.MemberName, 80) || `Member ${memberNumber}`
          });
          friendIds.add(memberNumber);
        }
      }
      const visibility = cleanStringArray(value.Visibility, 8, 30);
      const access = cleanStringArray(value.Access, 8, 30);
      return {
        name,
        ...cleanText(value.Creator, 80) ? { creator: cleanText(value.Creator, 80) } : {},
        description: cleanText(value.Description, 200),
        language: cleanText(value.Language, 12),
        memberCount: boundedInteger(value.MemberCount, 0, 100, 0),
        memberLimit: boundedInteger(value.MemberLimit, 1, 100, 10),
        canJoin: value.CanJoin === true,
        locked: value.Locked === true || access.length > 0 && !access.includes("All"),
        privateRoom: value.Private === true || visibility.length > 0 && !visibility.includes("All"),
        mapType: cleanText(value.MapType, 40),
        friends
      };
    } catch {
      return void 0;
    }
  }
  function normalizeRoomSearchSpace(value) {
    return value === "X" || value === "M" ? value : "";
  }
  function normalizeRoomMediaUrl(value, kind) {
    const candidate = value.trim();
    if (!candidate) return void 0;
    if (candidate.length > 250) throw new Error("Room media links can be at most 250 characters");
    let url;
    try {
      url = new URL(candidate);
    } catch {
      throw new Error("Enter a valid HTTPS room media link");
    }
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error("Room media must use a public HTTPS link");
    }
    const extension = url.pathname.toLocaleLowerCase();
    const supported = kind === "image" ? /\.(?:jpe?g|png|webp)$/u.test(extension) : /\.(?:mp3|mp4)$/u.test(extension);
    if (!supported) {
      throw new Error(
        kind === "image" ? "Room backgrounds must be JPG, PNG, or WebP files" : "Bondage Club room music links must end in .mp3 or .mp4"
      );
    }
    return url.href;
  }
  function incomingFingerprint(event) {
    return [event.peerNumber, event.content, event.roomName ?? ""].join("");
  }
  function outgoingFingerprint(event) {
    return [event.peerNumber, event.content, event.includeRoom ? 1 : 0].join("");
  }
  function isBondageClubReady() {
    return typeof document !== "undefined" && document.body !== null && typeof Player === "object" && Player !== null && Number.isSafeInteger(Player.MemberNumber) && Player.MemberNumber > 0 && typeof ServerSendBeepMessage === "function";
  }
  function currentModSdk() {
    const sdk = window.bcModSdk;
    if (!sdk || typeof sdk.registerMod !== "function") {
      throw new Error("Bondage Club ModSDK is unavailable");
    }
    return sdk;
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
    async listMedia(limit = 300) {
      const conversations = await this.listConversations();
      const media = /* @__PURE__ */ new Map();
      for (let index = 0; index < conversations.length; index += 8) {
        const messageGroups = await Promise.all(
          conversations.slice(index, index + 8).map(async (conversation) => ({
            conversation,
            messages: await this.getMessages(conversation.peerNumber, 500)
          }))
        );
        for (const { conversation, messages } of messageGroups) {
          for (const message of messages) {
            for (const link of parseMessageLinks(message.content)) {
              if (!link.image) continue;
              const item = {
                url: link.url,
                provider: galleryMediaProvider(link.url),
                peerNumber: conversation.peerNumber,
                peerName: conversationDisplayName(conversation),
                direction: message.direction,
                sentAt: message.sentAt,
                messageId: message.id
              };
              const previous = media.get(item.url);
              if (!previous || previous.sentAt < item.sentAt) media.set(item.url, item);
            }
          }
        }
      }
      return [...media.values()].sort((left, right) => right.sentAt - left.sentAt).slice(0, Math.max(1, Math.min(1e3, limit)));
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
  function galleryMediaProvider(value) {
    try {
      const host = new URL(value).hostname.toLocaleLowerCase();
      if (host === "files.catbox.moe") return "catbox";
      if (host === "litter.catbox.moe") return "litterbox";
    } catch {
    }
    return "other";
  }

  // src/modules/link-activities/custom-activity-library.ts
  var MAX_CUSTOM_ACTIVITIES = 100;
  var DEFAULT_CUSTOM_ACTIVITY_GROUP = "ItemArms";
  var DEFAULT_CUSTOM_ACTIVITY_IMAGE = "Caress";
  var SAFE_ASSET_NAME = /^[A-Za-z][A-Za-z0-9_]{0,79}$/;
  var OLD_STARTER_FINGERPRINTS = /* @__PURE__ */ new Set([
    "sakura bow\0bows gracefully to {target}, as if sakura petals drifted between them.",
    "wolf greeting\0greets {target} with a warm, playful wolfish grin.",
    "inspect knots\0circles {target}, carefully inspecting every knot.",
    "offer hand\0offers {target} a hand with an inviting smile.",
    "moonlit promise\0touches two fingers to their heart, then gestures solemnly toward {target}."
  ]);
  function createCustomActivityId(now = Date.now()) {
    const random = Math.random().toString(36).slice(2, 8);
    return `activity-${now.toString(36)}-${random}`;
  }
  function createBlankCustomActivity(id = createCustomActivityId()) {
    return {
      id,
      name: "",
      targetGroup: DEFAULT_CUSTOM_ACTIVITY_GROUP,
      targetMode: "other",
      template: "{me} touches {target's} arm.",
      image: DEFAULT_CUSTOM_ACTIVITY_IMAGE,
      arousal: 0
    };
  }
  function sanitizeCustomActivities(value) {
    if (!Array.isArray(value)) return [];
    const result = [];
    const usedIds = /* @__PURE__ */ new Set();
    for (const entry of value.slice(0, MAX_CUSTOM_ACTIVITIES)) {
      const activity = sanitizeCustomActivity(entry, result.length);
      if (!activity) continue;
      let id = activity.id;
      let suffix = 2;
      while (usedIds.has(id)) {
        const ending = `-${suffix++}`;
        id = `${activity.id.slice(0, 64 - ending.length)}${ending}`;
      }
      usedIds.add(id);
      result.push({ ...activity, id });
    }
    return result;
  }
  function migrateLegacyCustomActivities(value) {
    const legacy = sanitizeLegacyRoomActivities(value).filter(
      (activity) => activity.pack !== "KikiLink Starter" && !OLD_STARTER_FINGERPRINTS.has(roomActivityFingerprint(activity))
    );
    return sanitizeCustomActivities(
      legacy.map((activity, index) => ({
        id: legacyActivityId(activity, index),
        name: activity.label,
        targetGroup: DEFAULT_CUSTOM_ACTIVITY_GROUP,
        targetMode: "other",
        template: activity.template.replaceAll("{source}", "{me}").replaceAll("{target}", "{target}"),
        image: DEFAULT_CUSTOM_ACTIVITY_IMAGE,
        arousal: 0
      }))
    );
  }
  function sanitizeCustomActivity(value, index) {
    if (!isRecord(value)) return void 0;
    const name = cleanText2(value.name, 40);
    const template = cleanText2(value.template, 500);
    if (!name || !template) return void 0;
    const sourceId = cleanId(value.id) || `activity-${index + 1}`;
    const targetGroup = safeAssetName(value.targetGroup, DEFAULT_CUSTOM_ACTIVITY_GROUP);
    const image = safeAssetName(value.image, DEFAULT_CUSTOM_ACTIVITY_IMAGE);
    return {
      id: sourceId,
      name,
      targetGroup,
      targetMode: value.targetMode === "self" || value.targetMode === "both" ? value.targetMode : "other",
      template,
      image,
      arousal: integerInRange(value.arousal, 0, 20, 0)
    };
  }
  function roomActivityFingerprint(activity) {
    return `${activity.label.trim().toLocaleLowerCase()}\0${activity.template.trim().toLocaleLowerCase()}`;
  }
  function sanitizeLegacyRoomActivities(value) {
    if (!Array.isArray(value)) return [];
    const activities = [];
    for (const entry of value.slice(0, MAX_CUSTOM_ACTIVITIES)) {
      if (!isRecord(entry)) continue;
      const label = cleanText2(entry.label, 32);
      const template = cleanText2(entry.template, 500);
      if (!label || !template) continue;
      activities.push({
        label,
        template,
        category: cleanText2(entry.category, 24) || "Uncategorized",
        pack: cleanText2(entry.pack, 32) || "My Activities",
        favorite: entry.favorite === true
      });
    }
    return activities;
  }
  function legacyActivityId(activity, index) {
    const slug = activity.label.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 36);
    return `legacy-${slug || index + 1}`;
  }
  function cleanText2(value, limit) {
    return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) : "";
  }
  function cleanId(value) {
    if (typeof value !== "string") return "";
    return value.trim().replace(/[^A-Za-z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 64);
  }
  function safeAssetName(value, fallback) {
    return typeof value === "string" && SAFE_ASSET_NAME.test(value) ? value : fallback;
  }
  function integerInRange(value, min, max, fallback) {
    return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
  }
  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  // src/modules/link-reactions/reaction-rules.ts
  var MAX_REACTION_RULES = 20;
  var MAX_REACTION_MEMBERS = 20;
  var MAX_REACTION_COOLDOWN_SECONDS = 3600;
  function createDefaultReactionRule(id) {
    return {
      id,
      label: "Friend joined",
      enabled: true,
      trigger: "room-join",
      scope: "friends",
      memberNumbers: [],
      textMatch: "",
      action: "notice",
      template: "{name} joined {room}.",
      cooldownSeconds: 30
    };
  }
  function sanitizeReactionRules(value) {
    if (!Array.isArray(value)) return [];
    const rules = [];
    const ids = /* @__PURE__ */ new Set();
    for (const [index, entry] of value.slice(0, MAX_REACTION_RULES).entries()) {
      if (!isRecord2(entry)) continue;
      const label = cleanText3(entry.label, 32);
      const template = cleanText3(entry.template, 500);
      if (!label || !template) continue;
      const scope = entry.scope === "friends" || entry.scope === "members" ? entry.scope : "anyone";
      const memberNumbers = sanitizeMemberNumbers(entry.memberNumbers);
      if (scope === "members" && memberNumbers.length === 0) continue;
      const baseId = cleanIdentifier(entry.id) || `reaction-${index + 1}`;
      const id = uniqueId(baseId, ids);
      ids.add(id);
      rules.push({
        id,
        label,
        enabled: entry.enabled !== false,
        trigger: entry.trigger === "room-join" || entry.trigger === "room-leave" || entry.trigger === "friend-online" ? entry.trigger : "beep-received",
        scope,
        memberNumbers,
        textMatch: cleanText3(entry.textMatch, 80),
        action: entry.action === "room-emote" ? "room-emote" : "notice",
        template,
        cooldownSeconds: integerInRange2(
          entry.cooldownSeconds,
          0,
          MAX_REACTION_COOLDOWN_SECONDS,
          30
        )
      });
    }
    return rules;
  }
  function sanitizeMemberNumbers(value) {
    if (!Array.isArray(value)) return [];
    return [
      ...new Set(
        value.filter(
          (memberNumber) => typeof memberNumber === "number" && Number.isSafeInteger(memberNumber) && memberNumber >= 0
        )
      )
    ].slice(0, MAX_REACTION_MEMBERS);
  }
  function uniqueId(base, ids) {
    if (!ids.has(base)) return base;
    for (let suffix = 2; suffix <= MAX_REACTION_RULES + 1; suffix += 1) {
      const candidate = `${base.slice(0, Math.max(1, 47 - suffix.toString().length))}-${suffix}`;
      if (!ids.has(candidate)) return candidate;
    }
    return `reaction-${ids.size + 1}`;
  }
  function cleanIdentifier(value) {
    return typeof value === "string" ? value.trim().toLocaleLowerCase().replace(/[^a-z0-9_-]/gu, "-").slice(0, 48) : "";
  }
  function cleanText3(value, maxLength) {
    return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, maxLength) : "";
  }
  function integerInRange2(value, min, max, fallback) {
    return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
  }
  function isRecord2(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  // src/core/settings.ts
  var DEFAULT_SETTINGS = {
    schemaVersion: 19,
    ui: {
      accent: "#d71932",
      theme: "dark",
      density: "comfortable",
      textScale: "normal",
      homeLayout: "showcase",
      launcherSide: "right",
      launcherOpen: "home",
      launcherPosition: null,
      panelPosition: null,
      roomBadge: {
        enabled: true,
        position: null
      },
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
      imageUploads: {
        enabled: true,
        retention: "24h"
      },
      gallery: {
        saved: [],
        hiddenUrls: []
      },
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
      avatarUrl: "",
      autoIdleMinutes: 10,
      afkAutoReply: {
        enabled: false,
        message: "Hi, I'm AFK. Message me later!"
      }
    },
    linkActivities: {
      enabled: true,
      customActivities: []
    },
    linkRoster: {
      enabled: true,
      trackEncounters: true,
      retentionDays: 365
    },
    linkReactions: {
      quickAlerts: {
        friendOnline: false,
        roomJoin: false
      },
      sounds: {
        enabled: false,
        volume: 65,
        chat: "chime",
        friendOnline: "sparkle",
        roomJoin: "pop"
      },
      enabled: false,
      rules: []
    },
    linkRoom: {
      presets: []
    },
    linkMusic: {
      playlists: [{ id: "main", name: "My playlist", tracks: [] }],
      activePlaylistId: "main",
      repeatMode: "off",
      shuffle: false,
      volume: 70
    }
  };
  var SETTINGS_KEY = "kikilink:settings:v1";
  var SettingsStore = class {
    #settings;
    #storage;
    #listeners = /* @__PURE__ */ new Set();
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
      const settings = this.get();
      this.#notify(settings);
      return settings;
    }
    reset() {
      this.#settings = structuredClone(DEFAULT_SETTINGS);
      try {
        this.#storage.removeItem(SETTINGS_KEY);
      } catch {
      }
      const settings = this.get();
      this.#notify(settings);
      return settings;
    }
    subscribe(listener) {
      this.#listeners.add(listener);
      return () => this.#listeners.delete(listener);
    }
    #notify(settings) {
      for (const listener of [...this.#listeners]) listener(structuredClone(settings));
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
    const source = isRecord3(input) ? input : {};
    const sourceSchema = typeof source.schemaVersion === "number" && Number.isFinite(source.schemaVersion) ? source.schemaVersion : 1;
    const ui = isRecord3(source.ui) ? source.ui : {};
    const linkChat = isRecord3(source.linkChat) ? source.linkChat : {};
    const imageUploads = isRecord3(linkChat.imageUploads) ? linkChat.imageUploads : {};
    const linkPresence = isRecord3(source.linkPresence) ? source.linkPresence : {};
    const linkActivities = isRecord3(source.linkActivities) ? source.linkActivities : {};
    const linkRoster = isRecord3(source.linkRoster) ? source.linkRoster : {};
    const linkReactions = isRecord3(source.linkReactions) ? source.linkReactions : {};
    const linkRoom = isRecord3(source.linkRoom) ? source.linkRoom : {};
    const linkMusic = isRecord3(source.linkMusic) ? source.linkMusic : {};
    return {
      schemaVersion: 19,
      ui: {
        accent: validColor(ui.accent) ? ui.accent : DEFAULT_SETTINGS.ui.accent,
        theme: ui.theme === "light" || ui.theme === "system" || ui.theme === "dark" ? ui.theme : DEFAULT_SETTINGS.ui.theme,
        density: ui.density === "compact" || ui.density === "super-compact" ? ui.density : DEFAULT_SETTINGS.ui.density,
        textScale: ui.textScale === "large" || ui.textScale === "extra-large" ? ui.textScale : DEFAULT_SETTINGS.ui.textScale,
        homeLayout: ui.homeLayout === "compact" ? "compact" : DEFAULT_SETTINGS.ui.homeLayout,
        launcherSide: ui.launcherSide === "left" ? "left" : "right",
        launcherOpen: ui.launcherOpen === "last" || ui.launcherOpen === "chat" ? ui.launcherOpen : DEFAULT_SETTINGS.ui.launcherOpen,
        launcherPosition: sanitizeLauncherPosition(ui.launcherPosition),
        panelPosition: sanitizeLauncherPosition(ui.panelPosition),
        roomBadge: sanitizeRoomBadge(ui.roomBadge, sourceSchema),
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
        retentionDays: integerInRange3(
          linkChat.retentionDays,
          1,
          3650,
          DEFAULT_SETTINGS.linkChat.retentionDays
        ),
        maxMessagesPerConversation: integerInRange3(
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
        imageUploads: sanitizeImageUploads(imageUploads, sourceSchema),
        gallery: sanitizeGallery(linkChat.gallery),
        quickActions: sanitizeQuickActions(linkChat.quickActions)
      },
      linkPresence: {
        enabled: booleanOr(linkPresence.enabled, DEFAULT_SETTINGS.linkPresence.enabled),
        status: linkPresence.status === "idle" || linkPresence.status === "dnd" || linkPresence.status === "offline" ? linkPresence.status : DEFAULT_SETTINGS.linkPresence.status,
        statusMessage: typeof linkPresence.statusMessage === "string" ? linkPresence.statusMessage.trim().slice(0, 80) : DEFAULT_SETTINGS.linkPresence.statusMessage,
        avatarUrl: sanitizeAvatarUrl(linkPresence.avatarUrl),
        autoIdleMinutes: integerInRange3(
          linkPresence.autoIdleMinutes,
          0,
          120,
          DEFAULT_SETTINGS.linkPresence.autoIdleMinutes
        ),
        afkAutoReply: sanitizeAfkAutoReply(linkPresence.afkAutoReply, sourceSchema)
      },
      linkActivities: {
        enabled: sourceSchema < 13 ? true : booleanOr(linkActivities.enabled, DEFAULT_SETTINGS.linkActivities.enabled),
        customActivities: sourceSchema < 13 ? migrateLegacyCustomActivities(linkActivities.activities) : sanitizeCustomActivities(linkActivities.customActivities)
      },
      linkRoster: {
        enabled: booleanOr(linkRoster.enabled, DEFAULT_SETTINGS.linkRoster.enabled),
        trackEncounters: booleanOr(
          linkRoster.trackEncounters,
          DEFAULT_SETTINGS.linkRoster.trackEncounters
        ),
        retentionDays: rosterRetentionDaysOr(linkRoster.retentionDays)
      },
      linkReactions: {
        quickAlerts: sanitizeQuickAlerts(linkReactions.quickAlerts),
        sounds: sanitizeNotificationSounds(linkReactions.sounds),
        enabled: booleanOr(linkReactions.enabled, DEFAULT_SETTINGS.linkReactions.enabled),
        rules: sanitizeReactionRules(linkReactions.rules)
      },
      linkRoom: {
        presets: sanitizeRoomPresets(linkRoom.presets)
      },
      linkMusic: sanitizeMusicSettings(linkMusic)
    };
  }
  function sanitizeRoomPresets(value) {
    if (!Array.isArray(value)) return [];
    const presets = [];
    const ids = /* @__PURE__ */ new Set();
    for (const candidate of value.slice(0, 12)) {
      if (!isRecord3(candidate) || !isRecord3(candidate.room)) continue;
      const id = safeLocalId(candidate.id);
      const label = cleanBoundedText(candidate.label, 60);
      if (!id || !label || ids.has(id)) continue;
      const room = candidate.room;
      const custom = isRecord3(room.custom) ? room.custom : {};
      const savedAt = finiteTimestamp(candidate.savedAt);
      presets.push({
        id,
        label,
        savedAt,
        room: {
          name: cleanBoundedText(room.name, 80),
          description: cleanBoundedText(room.description, 200),
          background: cleanBoundedText(room.background, 120),
          limit: integerInRange3(room.limit, 2, 20, 10),
          game: cleanBoundedText(room.game, 40),
          space: cleanBoundedText(room.space, 20),
          language: cleanBoundedText(room.language, 12),
          visibility: sanitizeShortStringList(room.visibility, 8, 30),
          access: sanitizeShortStringList(room.access, 8, 30),
          blockCategory: sanitizeShortStringList(room.blockCategory, 24, 40),
          admins: sanitizeMemberNumbers2(room.admins, 20),
          whitelist: sanitizeMemberNumbers2(room.whitelist, 100),
          blacklist: sanitizeMemberNumbers2(room.blacklist, 100),
          custom: {
            imageUrl: sanitizeHttpsUrl(custom.imageUrl),
            imageFilter: cleanBoundedText(custom.imageFilter, 120),
            musicUrl: sanitizeHttpsUrl(custom.musicUrl),
            sizeMode: integerInRange3(custom.sizeMode, 1, 3, 1),
            musicSync: booleanOr(custom.musicSync, false)
          }
        }
      });
      ids.add(id);
    }
    return presets.sort((left, right) => right.savedAt - left.savedAt);
  }
  function sanitizeMusicSettings(value) {
    const playlists = [];
    const playlistIds = /* @__PURE__ */ new Set();
    let trackBudget = 100;
    if (Array.isArray(value.playlists)) {
      for (const candidate of value.playlists.slice(0, 8)) {
        if (!isRecord3(candidate)) continue;
        const id = safeLocalId(candidate.id);
        const name = cleanBoundedText(candidate.name, 60);
        if (!id || !name || playlistIds.has(id)) continue;
        const tracks = [];
        const trackIds = /* @__PURE__ */ new Set();
        if (Array.isArray(candidate.tracks)) {
          for (const track of candidate.tracks) {
            if (trackBudget <= 0 || !isRecord3(track)) break;
            const trackId = safeLocalId(track.id);
            const title = cleanBoundedText(track.title, 80);
            const source = track.source === "catbox" || track.source === "local" ? track.source : "url";
            const locator = source === "local" ? safeLocalId(track.locator) : sanitizeAudioUrl(track.locator);
            if (!trackId || !title || !locator || trackIds.has(trackId)) continue;
            tracks.push({
              id: trackId,
              title,
              source,
              locator,
              addedAt: finiteTimestamp(track.addedAt)
            });
            trackIds.add(trackId);
            trackBudget -= 1;
          }
        }
        playlists.push({ id, name, tracks });
        playlistIds.add(id);
      }
    }
    if (playlists.length === 0) playlists.push(structuredClone(DEFAULT_SETTINGS.linkMusic.playlists[0]));
    const requestedActiveId = safeLocalId(value.activePlaylistId);
    const activePlaylistId = playlists.some((playlist) => playlist.id === requestedActiveId) ? requestedActiveId : playlists[0].id;
    return {
      playlists,
      activePlaylistId,
      repeatMode: value.repeatMode === "all" || value.repeatMode === "one" ? value.repeatMode : "off",
      shuffle: booleanOr(value.shuffle, DEFAULT_SETTINGS.linkMusic.shuffle),
      volume: integerInRange3(value.volume, 0, 100, DEFAULT_SETTINGS.linkMusic.volume)
    };
  }
  function sanitizeImageUploads(value, sourceSchema) {
    return {
      // Schema 13 stored Cloudinary credentials. Do not silently reinterpret its enabled switch as
      // consent to upload to a different third-party provider after upgrading.
      enabled: sourceSchema < 14 ? false : booleanOr(value.enabled, DEFAULT_SETTINGS.linkChat.imageUploads.enabled),
      retention: value.retention === "1h" || value.retention === "12h" || value.retention === "24h" || value.retention === "72h" ? value.retention : DEFAULT_SETTINGS.linkChat.imageUploads.retention
    };
  }
  function sanitizeGallery(value) {
    const source = isRecord3(value) ? value : {};
    const hiddenUrls = sanitizeImageUrlList(source.hiddenUrls, 80);
    const hidden = new Set(hiddenUrls);
    const savedByUrl = /* @__PURE__ */ new Map();
    if (Array.isArray(source.saved)) {
      for (const candidate of source.saved.slice(0, 80)) {
        if (!isRecord3(candidate)) continue;
        const url = sanitizeDirectImageUrl(candidate.url);
        if (!url || hidden.has(url) || savedByUrl.has(url)) continue;
        const addedAt = typeof candidate.addedAt === "number" && Number.isFinite(candidate.addedAt) && candidate.addedAt > 0 ? Math.min(Date.now(), Math.round(candidate.addedAt)) : Date.now();
        savedByUrl.set(url, { url, addedAt });
        if (savedByUrl.size >= 40) break;
      }
    }
    return {
      saved: [...savedByUrl.values()].sort((left, right) => right.addedAt - left.addedAt),
      hiddenUrls
    };
  }
  function sanitizeImageUrlList(value, limit) {
    if (!Array.isArray(value)) return [];
    const urls = /* @__PURE__ */ new Set();
    for (const candidate of value) {
      const url = sanitizeDirectImageUrl(candidate);
      if (!url) continue;
      urls.add(url);
      if (urls.size >= limit) break;
    }
    return [...urls];
  }
  function sanitizeDirectImageUrl(value) {
    if (typeof value !== "string" || value.trim().length > 500) return void 0;
    const url = normalizeImageUrl(value);
    return url && url.length <= 500 ? url : void 0;
  }
  function sanitizeAfkAutoReply(value, sourceSchema) {
    const source = isRecord3(value) ? value : {};
    let message = typeof source.message === "string" ? source.message.trim().slice(0, 500) : DEFAULT_SETTINGS.linkPresence.afkAutoReply.message;
    if (sourceSchema < 15 && message === "\u041F\u0440\u0438\u0432\u0435\u0442, \u044F \u0410\u0424\u041A, \u043D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043C\u043D\u0435 \u043F\u043E\u0437\u0436\u0435!") {
      message = DEFAULT_SETTINGS.linkPresence.afkAutoReply.message;
    }
    return {
      enabled: booleanOr(source.enabled, DEFAULT_SETTINGS.linkPresence.afkAutoReply.enabled),
      message: message || DEFAULT_SETTINGS.linkPresence.afkAutoReply.message
    };
  }
  function sanitizeAvatarUrl(value) {
    if (typeof value !== "string" || value.trim().length > 500) return "";
    const normalized = normalizeImageUrl(value);
    return normalized && normalized.length <= 500 ? normalized : "";
  }
  function sanitizeRoomBadge(value, sourceSchema) {
    const source = isRecord3(value) ? value : {};
    return {
      enabled: booleanOr(source.enabled, DEFAULT_SETTINGS.ui.roomBadge.enabled),
      // v15 stored viewport coordinates. They cannot be assigned safely to a character, so the
      // first canvas-native release deliberately returns the flower to its documented icon row.
      position: sourceSchema >= 16 ? sanitizeLauncherPosition(source.position) : null
    };
  }
  function sanitizeQuickAlerts(value) {
    const source = isRecord3(value) ? value : {};
    return {
      friendOnline: booleanOr(
        source.friendOnline,
        DEFAULT_SETTINGS.linkReactions.quickAlerts.friendOnline
      ),
      roomJoin: booleanOr(
        source.roomJoin,
        DEFAULT_SETTINGS.linkReactions.quickAlerts.roomJoin
      )
    };
  }
  function sanitizeNotificationSounds(value) {
    const source = isRecord3(value) ? value : {};
    return {
      enabled: booleanOr(source.enabled, DEFAULT_SETTINGS.linkReactions.sounds.enabled),
      volume: integerInRange3(
        source.volume,
        0,
        100,
        DEFAULT_SETTINGS.linkReactions.sounds.volume
      ),
      chat: notificationSoundOr(source.chat, DEFAULT_SETTINGS.linkReactions.sounds.chat),
      friendOnline: notificationSoundOr(
        source.friendOnline,
        DEFAULT_SETTINGS.linkReactions.sounds.friendOnline
      ),
      roomJoin: notificationSoundOr(
        source.roomJoin,
        DEFAULT_SETTINGS.linkReactions.sounds.roomJoin
      )
    };
  }
  function notificationSoundOr(value, fallback) {
    return value === "sparkle" || value === "pop" || value === "chime" || typeof value === "string" && /^custom:[a-z0-9_-]{1,64}$/iu.test(value) ? value : fallback;
  }
  function sanitizeQuickActions(value) {
    if (value === void 0) return structuredClone(DEFAULT_SETTINGS.linkChat.quickActions);
    if (!Array.isArray(value)) return structuredClone(DEFAULT_SETTINGS.linkChat.quickActions);
    const actions = [];
    for (const entry of value.slice(0, 12)) {
      if (!isRecord3(entry)) continue;
      const label = typeof entry.label === "string" ? entry.label.trim().slice(0, 24) : "";
      const template = typeof entry.template === "string" ? entry.template.trim().slice(0, 500) : "";
      if (label && template) actions.push({ label, template });
    }
    return actions;
  }
  function safeLocalId(value) {
    if (typeof value !== "string") return void 0;
    const id = value.trim().toLocaleLowerCase();
    return /^[a-z0-9_-]{1,64}$/u.test(id) ? id : void 0;
  }
  function cleanBoundedText(value, maxLength) {
    return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/gu, " ").trim().slice(0, maxLength) : "";
  }
  function finiteTimestamp(value) {
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.min(Date.now(), Math.round(value)) : Date.now();
  }
  function sanitizeShortStringList(value, limit, maxLength) {
    if (!Array.isArray(value)) return [];
    const result = /* @__PURE__ */ new Set();
    for (const candidate of value) {
      const text = cleanBoundedText(candidate, maxLength);
      if (text) result.add(text);
      if (result.size >= limit) break;
    }
    return [...result];
  }
  function sanitizeMemberNumbers2(value, limit) {
    if (!Array.isArray(value)) return [];
    const result = /* @__PURE__ */ new Set();
    for (const candidate of value) {
      if (typeof candidate === "number" && Number.isSafeInteger(candidate) && candidate >= 0) {
        result.add(candidate);
      }
      if (result.size >= limit) break;
    }
    return [...result];
  }
  function sanitizeHttpsUrl(value) {
    if (typeof value !== "string" || value.trim().length > 500) return "";
    try {
      const url = new URL(value.trim());
      if (url.protocol !== "https:" || url.username || url.password) return "";
      return url.href.slice(0, 500);
    } catch {
      return "";
    }
  }
  function sanitizeAudioUrl(value) {
    const url = sanitizeHttpsUrl(value);
    if (!url) return void 0;
    try {
      const parsed = new URL(url);
      return /\.(?:aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/iu.test(parsed.pathname) ? url : void 0;
    } catch {
      return void 0;
    }
  }
  function sanitizeLauncherPosition(value) {
    if (!isRecord3(value)) return null;
    if (!finiteNumberInRange(value.x, 0, 1) || !finiteNumberInRange(value.y, 0, 1)) return null;
    return { x: value.x, y: value.y };
  }
  function isRecord3(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function booleanOr(value, fallback) {
    return typeof value === "boolean" ? value : fallback;
  }
  function integerInRange3(value, min, max, fallback) {
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
    return value === "appearance" || value === "navigation" || value === "chat" || value === "players" || value === "activities" || value === "reactions" || value === "about";
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
    if (options.src !== void 0 && node instanceof HTMLImageElement) node.src = options.src;
    if (options.alt !== void 0 && node instanceof HTMLImageElement) node.alt = options.alt;
    if (options.tabIndex !== void 0) node.tabIndex = options.tabIndex;
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
    const debounced = (...args) => {
      if (timer !== void 0) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = void 0;
        callback(...args);
      }, delayMs);
    };
    debounced.cancel = () => {
      if (timer !== void 0) clearTimeout(timer);
      timer = void 0;
    };
    return debounced;
  }

  // design/branding/kikilink-blossom.svg
  var kikilink_blossom_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="KikiLink blossom">%0A  <g fill="%23ef6078" stroke="%235f1b2a" stroke-linejoin="round" stroke-width="3">%0A    <path d="M32 33C24 28 22 18 26 10c2-4 10-4 12 0 4 8 2 18-6 23Z"/>%0A    <path d="M33 32c2-9 9-16 18-15 6 1 8 8 4 13-5 7-14 8-22 2Z"/>%0A    <path d="M34 34c9-2 18 2 21 10 2 6-4 11-10 9-8-3-13-10-11-19Z"/>%0A    <path d="M30 34c-9-2-18 2-21 10-2 6 4 11 10 9 8-3 13-10 11-19Z"/>%0A    <path d="M31 32c-2-9-9-16-18-15-6 1-8 8-4 13 5 7 14 8 22 2Z"/>%0A  </g>%0A  <g fill="none" stroke="%23ffb2bf" stroke-linecap="round" stroke-width="2">%0A    <path d="M30 12c-2 3-2 7-1 10"/>%0A    <path d="M48 21c-4 0-7 2-9 5"/>%0A    <path d="M48 44c-3-2-7-3-10-2"/>%0A  </g>%0A  <circle cx="32" cy="33" r="8" fill="%23f3b63f" stroke="%235f1b2a" stroke-width="3"/>%0A  <circle cx="29.5" cy="30.5" r="2" fill="%23ffe6a1"/>%0A</svg>%0A';

  // src/modules/link-chat/blossom.ts
  var CHARACTER_WIDTH = 500;
  var CHARACTER_HEIGHT = 1e3;
  var BADGE_SIZE = 35;
  var BADGE_OPACITY = 0.78;
  var BADGE_DRAG_THRESHOLD = 5;
  var DEFAULT_ROOM_BADGE_POSITION = Object.freeze({
    x: 0.78,
    y: 0.045
  });
  function resolveRoomBadgePosition(position, frame) {
    const normalized = sanitizePosition(position) ?? DEFAULT_ROOM_BADGE_POSITION;
    const zoom = finitePositive(frame.zoom, 1);
    return {
      left: finiteNumber(frame.x) + normalized.x * CHARACTER_WIDTH * zoom,
      top: finiteNumber(frame.y) + normalized.y * CHARACTER_HEIGHT * zoom,
      size: BADGE_SIZE * zoom
    };
  }
  function normalizeRoomBadgePosition(left, top, frame) {
    const zoom = finitePositive(frame.zoom, 1);
    return {
      x: clamp((finiteNumber(left) - finiteNumber(frame.x)) / (CHARACTER_WIDTH * zoom), 0, 1),
      y: clamp((finiteNumber(top) - finiteNumber(frame.y)) / (CHARACTER_HEIGHT * zoom), 0, 1)
    };
  }
  var RoomBlossomBadge = class {
    #settings;
    #adapter;
    #presence;
    #element = document.createElement("img");
    #fallbackImage = typeof Image === "function" ? new Image() : void 0;
    #config;
    #ownFrame;
    #previewPosition;
    #drag;
    #canvas;
    #previousCursor = "";
    #previousTouchAction = "";
    #settingsUnsubscribe;
    #unregisterOverlay;
    #placementActive = false;
    #mounted = false;
    #destroyed = false;
    #renderer = (character, x, y, zoom) => {
      if (!character || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(zoom)) return;
      const own = character.MemberNumber === this.#adapter.getOwnMemberNumber();
      if (own) {
        this.#ownFrame = { x, y, zoom };
        if (this.#config.enabled && this.#iconsAreVisible()) {
          this.#draw(resolveRoomBadgePosition(this.#config.position, this.#ownFrame));
        }
        this.#syncOwnElement();
        return;
      }
      if (!this.#config.enabled || !this.#iconsAreVisible()) return;
      if (!this.#presence.hasCompatiblePeer(character.MemberNumber)) return;
      const position = resolveRoomBadgePosition(this.#config.position, { x, y, zoom });
      this.#draw(position);
    };
    #handlePointerDown = (event) => {
      if (!this.#placementActive || this.#drag || event.button !== 0 || !this.#ownFrame || !this.#canvas) {
        return;
      }
      const point = eventCanvasPoint(event, this.#canvas);
      if (!point) return;
      const position = resolveRoomBadgePosition(
        this.#previewPosition ?? this.#config.position,
        this.#ownFrame
      );
      this.#drag = {
        pointerId: event.pointerId,
        startCanvasX: point.x,
        startCanvasY: point.y,
        offsetX: point.x - position.left,
        offsetY: point.y - position.top,
        moved: false
      };
      this.#consumePointer(event);
      try {
        this.#element.setPointerCapture(event.pointerId);
      } catch {
      }
    };
    #handlePointerMove = (event) => {
      const drag = this.#drag;
      const frame = this.#ownFrame;
      const canvas = this.#canvas;
      if (!drag || drag.pointerId !== event.pointerId || !frame || !canvas) return;
      const point = eventCanvasPoint(event, canvas);
      if (!point) return;
      if (!drag.moved && Math.hypot(point.x - drag.startCanvasX, point.y - drag.startCanvasY) < BADGE_DRAG_THRESHOLD) {
        return;
      }
      drag.moved = true;
      this.#previewPosition = normalizeRoomBadgePosition(
        point.x - drag.offsetX,
        point.y - drag.offsetY,
        frame
      );
      this.#syncOwnElement();
      this.#consumePointer(event);
    };
    #handlePointerUp = (event) => {
      const drag = this.#drag;
      if (!drag || drag.pointerId !== event.pointerId) return;
      this.#consumePointer(event);
      this.#releasePointer(event.pointerId);
      this.#drag = void 0;
      if (!drag.moved || !this.#previewPosition) return;
      const saved = this.#previewPosition;
      this.#settings.update((draft) => {
        draft.ui.roomBadge.position = saved;
      });
      this.#previewPosition = void 0;
      this.#setPlacement(false);
      this.#syncOwnElement();
    };
    #handlePointerCancel = (event) => {
      if (!this.#drag || this.#drag.pointerId !== event.pointerId) return;
      this.#consumePointer(event);
      this.#releasePointer(event.pointerId);
      this.#drag = void 0;
      this.#previewPosition = void 0;
      this.#syncOwnElement();
    };
    #handleKeyDown = (event) => {
      if (!this.#placementActive || event.key !== "Escape") return;
      event.preventDefault();
      this.cancelPlacement();
    };
    constructor(adapter, settings, presence) {
      this.#adapter = adapter;
      this.#settings = settings;
      this.#presence = presence;
      this.#config = settings.get().ui.roomBadge;
      if (this.#fallbackImage) this.#fallbackImage.src = kikilink_blossom_default;
      this.#element.className = "kl-room-blossom";
      this.#element.src = kikilink_blossom_default;
      this.#element.alt = "";
      this.#element.draggable = false;
      this.#element.hidden = true;
      this.#element.setAttribute("aria-hidden", "true");
      Object.assign(this.#element.style, {
        position: "fixed",
        display: "none",
        pointerEvents: "none",
        opacity: String(BADGE_OPACITY),
        zIndex: "2147483000",
        userSelect: "none",
        touchAction: "none",
        filter: "drop-shadow(0 1px 3px rgba(0, 0, 0, .75))"
      });
      this.#settingsUnsubscribe = settings.subscribe((next) => {
        this.#config = next.ui.roomBadge;
        if (!this.#config.enabled) this.cancelPlacement();
        this.#syncOwnElement();
      });
    }
    mount() {
      if (this.#destroyed || this.#mounted) return;
      this.#mounted = true;
      document.body.append(this.#element);
      if (typeof this.#adapter.registerCharacterOverlay === "function") {
        this.#unregisterOverlay = this.#adapter.registerCharacterOverlay(this.#renderer);
      }
      this.#syncOwnElement();
      window.addEventListener("keydown", this.#handleKeyDown);
    }
    /** Arms a single drag of the flower above the authenticated player's character. */
    beginPlacement() {
      const liveFrame = visibleCharacterFrame(this.#adapter.getOwnMemberNumber());
      if (liveFrame) this.#ownFrame = liveFrame;
      this.#syncOwnElement();
      if (this.#destroyed || !this.#mounted || !this.#config.enabled || typeof this.#adapter.isInChatRoom !== "function" || !this.#adapter.isInChatRoom() || !this.#ownFrame) {
        return false;
      }
      const canvas = mainCanvasElement();
      if (!canvas) return false;
      this.cancelPlacement();
      this.#canvas = canvas;
      this.#setPlacement(true);
      this.#syncOwnElement();
      return true;
    }
    cancelPlacement() {
      this.#releasePointer(this.#drag?.pointerId);
      this.#drag = void 0;
      this.#previewPosition = void 0;
      this.#setPlacement(false);
      this.#syncOwnElement();
    }
    resetPosition() {
      if (this.#destroyed) return;
      this.cancelPlacement();
      this.#settings.update((draft) => {
        draft.ui.roomBadge.position = null;
      });
    }
    destroy() {
      if (this.#destroyed) return;
      this.#destroyed = true;
      this.cancelPlacement();
      window.removeEventListener("keydown", this.#handleKeyDown);
      this.#settingsUnsubscribe?.();
      this.#settingsUnsubscribe = void 0;
      this.#unregisterOverlay?.();
      this.#unregisterOverlay = void 0;
      this.#element.remove();
      this.#ownFrame = void 0;
      this.#mounted = false;
    }
    #draw(position) {
      const context = mainCanvasContext();
      if (!context) return false;
      try {
        if (typeof DrawImageResize === "function") {
          return DrawImageResize(
            kikilink_blossom_default,
            position.left,
            position.top,
            position.size,
            position.size
          );
        } else if (typeof DrawImageCanvas === "function") {
          return DrawImageCanvas(kikilink_blossom_default, context, position.left, position.top, {
            Width: position.size,
            Height: position.size,
            Alpha: BADGE_OPACITY
          });
        } else if (this.#fallbackImage?.complete && this.#fallbackImage.naturalWidth > 0) {
          context.save();
          context.globalAlpha = BADGE_OPACITY;
          context.drawImage(
            this.#fallbackImage,
            position.left,
            position.top,
            position.size,
            position.size
          );
          context.restore();
          return true;
        }
      } catch {
      }
      return false;
    }
    #iconsAreVisible() {
      return typeof ChatRoomHideIconState !== "number" || ChatRoomHideIconState === 0;
    }
    #syncOwnElement() {
      if (this.#destroyed || !this.#mounted) return;
      if (!this.#placementActive) {
        this.#element.hidden = true;
        this.#element.style.display = "none";
        return;
      }
      const inRoom = typeof this.#adapter.isInChatRoom === "function" && this.#adapter.isInChatRoom();
      if (!this.#config.enabled || !this.#iconsAreVisible() || !inRoom) {
        this.#element.hidden = true;
        this.#element.style.display = "none";
        return;
      }
      const liveFrame = visibleCharacterFrame(this.#adapter.getOwnMemberNumber());
      if (liveFrame) this.#ownFrame = liveFrame;
      const frame = this.#ownFrame;
      const canvas = mainCanvasElement();
      if (!frame || !canvas) {
        this.#element.hidden = true;
        this.#element.style.display = "none";
        return;
      }
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || canvas.width <= 0 || canvas.height <= 0) {
        this.#element.hidden = true;
        this.#element.style.display = "none";
        return;
      }
      const position = resolveRoomBadgePosition(
        this.#previewPosition ?? this.#config.position,
        frame
      );
      const scaleX = rect.width / canvas.width;
      const scaleY = rect.height / canvas.height;
      this.#element.hidden = false;
      this.#element.style.display = "block";
      this.#element.style.left = `${rect.left + position.left * scaleX}px`;
      this.#element.style.top = `${rect.top + position.top * scaleY}px`;
      this.#element.style.width = `${position.size * scaleX}px`;
      this.#element.style.height = `${position.size * scaleY}px`;
    }
    #setPlacement(active) {
      if (active === this.#placementActive) return;
      this.#placementActive = active;
      const canvas = this.#canvas;
      if (active && canvas) {
        this.#previousCursor = this.#element.style.cursor;
        this.#previousTouchAction = this.#element.style.touchAction;
        this.#element.style.cursor = "grab";
        this.#element.style.touchAction = "none";
        this.#element.style.pointerEvents = "auto";
        this.#element.style.outline = "1px dashed rgba(255, 135, 153, .9)";
        this.#element.style.outlineOffset = "3px";
        this.#element.addEventListener("pointerdown", this.#handlePointerDown, true);
        window.addEventListener("pointermove", this.#handlePointerMove, true);
        window.addEventListener("pointerup", this.#handlePointerUp, true);
        window.addEventListener("pointercancel", this.#handlePointerCancel, true);
        return;
      }
      this.#element.removeEventListener("pointerdown", this.#handlePointerDown, true);
      this.#element.style.cursor = this.#previousCursor;
      this.#element.style.touchAction = this.#previousTouchAction;
      this.#element.style.pointerEvents = "none";
      this.#element.style.outline = "";
      this.#element.style.outlineOffset = "";
      window.removeEventListener("pointermove", this.#handlePointerMove, true);
      window.removeEventListener("pointerup", this.#handlePointerUp, true);
      window.removeEventListener("pointercancel", this.#handlePointerCancel, true);
      this.#canvas = void 0;
    }
    #consumePointer(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    #releasePointer(pointerId) {
      if (pointerId === void 0) return;
      try {
        if (!this.#element.hasPointerCapture || this.#element.hasPointerCapture(pointerId)) {
          this.#element.releasePointerCapture(pointerId);
        }
      } catch {
      }
    }
  };
  function mainCanvasContext() {
    if (typeof MainCanvas === "undefined" || MainCanvas === null) return void 0;
    if (typeof MainCanvas.drawImage === "function") {
      return MainCanvas;
    }
    return MainCanvas.getContext?.("2d") ?? void 0;
  }
  function mainCanvasElement() {
    const context = mainCanvasContext();
    if (context?.canvas) return context.canvas;
    if (typeof MainCanvas !== "undefined" && typeof MainCanvas.getContext === "function") {
      return MainCanvas;
    }
    const byId = document.getElementById("MainCanvas");
    return byId instanceof HTMLCanvasElement ? byId : void 0;
  }
  function eventCanvasPoint(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return void 0;
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
  }
  function visibleCharacterFrame(memberNumber) {
    if (!Number.isSafeInteger(memberNumber) || typeof ChatRoomCharacterViewLoopCharacters !== "function" || typeof ChatRoomCharacterDrawlist === "undefined" || !Array.isArray(ChatRoomCharacterDrawlist)) {
      return void 0;
    }
    let frame;
    try {
      ChatRoomCharacterViewLoopCharacters((characterIndex, x, y, _space, zoom) => {
        if (ChatRoomCharacterDrawlist[characterIndex]?.MemberNumber !== memberNumber) return;
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(zoom) || zoom <= 0) return;
        frame = { x, y, zoom };
        return true;
      });
    } catch {
      return void 0;
    }
    return frame;
  }
  function sanitizePosition(position) {
    if (!position) return null;
    return {
      x: clamp(Number.isFinite(position.x) ? position.x : DEFAULT_ROOM_BADGE_POSITION.x, 0, 1),
      y: clamp(Number.isFinite(position.y) ? position.y : DEFAULT_ROOM_BADGE_POSITION.y, 0, 1)
    };
  }
  function finiteNumber(value) {
    return Number.isFinite(value) ? value : 0;
  }
  function finitePositive(value, fallback) {
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // src/modules/link-activities/link-activities-service.ts
  var ACTIVITY_PREFIX = "KikiLinkCustom_";
  var ACTION_CONTENT = "KikiLinkCustomActivity";
  var META_TAG = "KikiLinkActivityMeta";
  var NATIVE_AROUSAL_FALLBACK_MARKER = "KikiLinkArousalFallback";
  var MAX_SEEN_NONCES = 120;
  var REGISTRY_MONITOR_INTERVAL_MS = 500;
  var SAFE_ASSET_NAME2 = /^[A-Za-z][A-Za-z0-9_]{0,79}$/;
  var VANILLA_ACTIVITY_IMAGES = [
    "Bite",
    "BrothersHandshake",
    "Caress",
    "Choke",
    "Cuddle",
    "FrenchKiss",
    "GagKiss",
    "GaggedKiss",
    "Grope",
    "HandGag",
    "Inject",
    "Kiss",
    "Lick",
    "MassageFeet",
    "MassageHands",
    "MasturbateFist",
    "MasturbateHand",
    "MoanGag",
    "MoanGagAngry",
    "MoanGagGiggle",
    "MoanGagTalk",
    "MoanGagWhimper",
    "Nod",
    "PenetrateSlow",
    "Pinch",
    "PoliteKiss",
    "Pull",
    "RestHead",
    "SiblingsCheekKiss",
    "SistersHug",
    "Slap",
    "Suck",
    "Tickle"
  ];
  var VANILLA_ACTIVITY_IMAGE_SET = new Set(VANILLA_ACTIVITY_IMAGES);
  var VANILLA_ACTIVITY_IMAGE_ALIASES = {
    Clean: "Caress",
    Pet: "Caress",
    Rub: "Cuddle",
    StruggleArms: "Cuddle",
    StruggleLegs: "Cuddle",
    Wiggle: "Cuddle",
    MoanGagGroan: "GaggedKiss",
    CollarGrab: "Grope",
    TakeCare: "Grope",
    MasturbateFoot: "MassageFeet",
    Step: "MassageFeet",
    Kick: "MassageFeet",
    Sit: "MassageFeet",
    MasturbateTongue: "Lick",
    Whisper: "Kiss",
    PenetrateFast: "PenetrateSlow",
    Spank: "Slap",
    Nibble: "Bite"
  };
  var LinkActivitiesService = class {
    constructor(adapter, settings) {
      this.adapter = adapter;
      this.settings = settings;
    }
    adapter;
    settings;
    #runtimeActivities = /* @__PURE__ */ new Map();
    #injectedActivities = /* @__PURE__ */ new Map();
    #seenNonces = [];
    #bodySlotsCache;
    #registeredActivities;
    #registeredOrdering;
    #registryMonitor;
    #unregister;
    start() {
      if (!this.#unregister) {
        this.#unregister = this.adapter.registerCustomActivityIntegration(this);
      }
      if (this.#registryMonitor === void 0) {
        this.#registryMonitor = setInterval(() => {
          this.#ensureRegistryInjection();
          this.#syncOpenNativeDialog();
        }, REGISTRY_MONITOR_INTERVAL_MS);
      }
      this.syncFromSettings();
    }
    stop() {
      if (this.#registryMonitor !== void 0) {
        clearInterval(this.#registryMonitor);
        this.#registryMonitor = void 0;
      }
      this.#unregister?.();
      this.#unregister = void 0;
      this.#detachFromRegistries();
      this.#runtimeActivities.clear();
      this.#injectedActivities.clear();
      this.#bodySlotsCache = void 0;
      this.#seenNonces.splice(0);
    }
    syncFromSettings() {
      this.#bodySlotsCache = void 0;
      this.#detachFromRegistries();
      this.#runtimeActivities.clear();
      this.#injectedActivities.clear();
      const settings = this.settings?.get();
      if (!settings?.linkActivities.enabled) return;
      const owner = currentMemberNumber(this.adapter);
      for (const definition of settings.linkActivities.customActivities) {
        const runtimeName = runtimeActivityName(owner, definition.id);
        this.#runtimeActivities.set(runtimeName, definition);
      }
      this.#ensureRegistryInjection();
      this.#syncOpenNativeDialog();
    }
    isAvailable() {
      return this.adapter.canSendRoomEmote();
    }
    isCustomActivity(activityName) {
      return this.#runtimeActivities.has(activityName);
    }
    /**
     * Extends the exact list consumed by BC's native DialogActivity grid. The registry injection is
     * still kept for native lookups, while this path makes late-loaded userscripts reliable even if
     * BC or another addon rebuilt/cached the activity list before KikiLink started.
     */
    extendAllowedActivities(character, groupName, activities) {
      if (!Array.isArray(activities) || !SAFE_ASSET_NAME2.test(groupName)) {
        return activities;
      }
      let result = activities;
      const existing = new Set(activities.map((item) => item?.Activity?.Name));
      const selfTarget = character?.MemberNumber === this.adapter.getOwnMemberNumber();
      for (const [runtimeName, definition] of this.#runtimeActivities) {
        if (!activityGroupsMatch(definition.targetGroup, groupName) || existing.has(runtimeName)) {
          continue;
        }
        if (selfTarget && definition.targetMode === "other") continue;
        if (!selfTarget && definition.targetMode === "self") continue;
        if (result === activities) result = [...activities];
        result.push({
          Activity: this.#injectedActivities.get(runtimeName) ?? createNativeActivity(runtimeName, definition),
          Group: groupName
        });
        existing.add(runtimeName);
      }
      return result;
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
    getBodySlots() {
      if (this.#bodySlotsCache) return this.#bodySlotsCache;
      if (typeof AssetGroup === "undefined" || !Array.isArray(AssetGroup) || typeof ActivityFemale3DCG === "undefined" || !Array.isArray(ActivityFemale3DCG)) {
        return fallbackBodySlots();
      }
      const nativeTargets = /* @__PURE__ */ new Set();
      for (const activity of ActivityFemale3DCG) {
        if (!activity.Name.startsWith(ACTIVITY_PREFIX) && Array.isArray(activity.Target)) {
          for (const target of activity.Target) nativeTargets.add(target);
        }
      }
      const slots = AssetGroup.filter(
        (group) => group.Category === "Item" && Array.isArray(group.Zone) && group.Zone.length > 0 && (nativeTargets.size === 0 || nativeTargets.has(group.Name))
      ).map((group) => ({
        name: group.Name,
        label: group.Description || humanizeGroupName(group.Name),
        zones: group.Zone ?? []
      })).sort((left, right) => left.label.localeCompare(right.label));
      if (slots.length === 0) return fallbackBodySlots();
      this.#bodySlotsCache = slots;
      return slots;
    }
    getVanillaImages() {
      return [...VANILLA_ACTIVITY_IMAGES];
    }
    drawPlayer(canvas, selectedGroup, hoveredGroup) {
      const context = canvas.getContext("2d");
      if (!context) return false;
      if (canvas.width !== 250) canvas.width = 250;
      if (canvas.height !== 500) canvas.height = 500;
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (typeof Player !== "object" || Player === null || typeof DrawCharacter !== "function") {
        return false;
      }
      DrawCharacter(Player, 0, 0, 0.5, false, context);
      const slots = [...this.getBodySlots()].sort(
        (left, right) => bodySlotDrawLayer(left.name, selectedGroup, hoveredGroup) - bodySlotDrawLayer(right.name, selectedGroup, hoveredGroup)
      );
      for (const slot of slots) {
        const selected = slot.name === selectedGroup;
        const hovered = !selected && slot.name === hoveredGroup;
        context.fillStyle = selected ? "rgba(215, 25, 50, 0.22)" : hovered ? "rgba(214, 162, 75, 0.12)" : "rgba(255, 255, 255, 0)";
        context.strokeStyle = selected ? "rgba(255, 106, 126, 0.98)" : hovered ? "rgba(224, 185, 112, 0.9)" : "rgba(238, 226, 210, 0.28)";
        context.lineWidth = selected ? 2.25 : hovered ? 1.75 : 1;
        for (const [x, y, width, height] of slot.zones) {
          if (selected || hovered) {
            context.fillRect(x * 0.5, y * 0.5, width * 0.5, height * 0.5);
          }
          context.strokeRect(x * 0.5, y * 0.5, width * 0.5, height * 0.5);
        }
      }
      return true;
    }
    bodySlotAt(x, y) {
      const sourceX = x * 2;
      const sourceY = y * 2;
      let best;
      let bestArea = Number.POSITIVE_INFINITY;
      for (const slot of this.getBodySlots()) {
        for (const [zoneX, zoneY, width, height] of slot.zones) {
          if (sourceX < zoneX || sourceX > zoneX + width || sourceY < zoneY || sourceY > zoneY + height) {
            continue;
          }
          const area = width * height;
          if (area < bestArea) {
            best = slot;
            bestArea = area;
          }
        }
      }
      return best;
    }
    resolveText(keyword) {
      if (keyword.startsWith("Activity")) {
        return this.#runtimeActivities.get(keyword.slice("Activity".length))?.name;
      }
      const runtimeName = [...this.#runtimeActivities.keys()].find((name) => keyword.endsWith(`-${name}`));
      if (!runtimeName) return void 0;
      const definition = this.#runtimeActivities.get(runtimeName);
      if (!definition) return void 0;
      return keyword.startsWith("Label-") ? definition.name : definition.template;
    }
    resolveImage(activityName) {
      const definition = this.#runtimeActivities.get(activityName);
      return definition ? activityImageUrl(definition.image) : void 0;
    }
    run(actor, acted, targetGroup, itemActivity) {
      const activityName = itemActivity?.Activity?.Name;
      if (typeof activityName !== "string") return false;
      const definition = this.#runtimeActivities.get(activityName);
      if (!definition) return false;
      if (!actor || !acted || !targetGroup || !Number.isSafeInteger(actor.MemberNumber) || !Number.isSafeInteger(acted.MemberNumber) || !SAFE_ASSET_NAME2.test(targetGroup.Name) || targetGroup.Name !== definition.targetGroup) {
        return false;
      }
      const text = expandCustomActivityTemplate(definition.template, {
        sourceName: characterName(actor),
        targetName: characterName(acted),
        targetMemberNumber: acted.MemberNumber,
        pronouns: characterPronouns(acted)
      }).slice(0, 1e3);
      if (!text) return true;
      if (typeof ChatRoomPublishCustomAction === "function") {
        const fallbackActivity = canonicalVanillaActivityImage(definition.image);
        const fallbackCount = nativeArousalFallbackCount(definition.arousal);
        const meta = {
          // Version 2 tells older KikiLink clients to ignore the private flat effect and let BC's
          // native fallback run instead. This prevents a 0.20.9 recipient from applying both paths.
          v: 2,
          source: actor.MemberNumber,
          target: acted.MemberNumber,
          group: targetGroup.Name,
          arousal: definition.arousal,
          nonce: createNonce(),
          ...definition.arousal > 0 ? { fallbackActivity, fallbackCount } : {}
        };
        const dictionary = [
          { Tag: "SourceCharacter", Text: characterName(actor), MemberNumber: actor.MemberNumber },
          { Tag: "TargetCharacter", Text: characterName(acted), MemberNumber: acted.MemberNumber },
          { Tag: "FocusAssetGroup", AssetGroupName: targetGroup.Name }
        ];
        if (definition.arousal > 0) {
          dictionary.push(
            { ActivityName: fallbackActivity, [NATIVE_AROUSAL_FALLBACK_MARKER]: true },
            { ActivityCounter: fallbackCount, [NATIVE_AROUSAL_FALLBACK_MARKER]: true }
          );
        }
        dictionary.push(
          { Tag: `MISSING TEXT IN "Interface.csv": ${ACTION_CONTENT}`, Text: text },
          { Tag: META_TAG, Text: JSON.stringify(meta) }
        );
        ChatRoomPublishCustomAction(ACTION_CONTENT, false, dictionary);
      } else {
        this.adapter.sendRoomEmote(text);
      }
      return true;
    }
    decorateButton(button, itemActivity) {
      if (!this.#runtimeActivities.has(itemActivity?.Activity?.Name)) return;
      if (button.querySelector("[data-kikilink-activity-mark]")) return;
      const mark = document.createElement("img");
      mark.src = kikilink_blossom_default;
      mark.alt = "KikiLink custom activity";
      mark.title = "KikiLink custom activity";
      mark.dataset.kikilinkActivityMark = "true";
      Object.assign(mark.style, {
        position: "absolute",
        top: "0px",
        left: "0px",
        width: "12px",
        height: "12px",
        opacity: "0.96",
        pointerEvents: "none",
        filter: "drop-shadow(0 1px 3px rgba(0,0,0,.75))",
        zIndex: "2"
      });
      for (const [property, value] of [
        ["position", "absolute"],
        ["top", "0px"],
        ["left", "0px"],
        ["right", "auto"],
        ["bottom", "auto"],
        ["width", "12px"],
        ["height", "12px"]
      ]) {
        mark.style.setProperty(property, value, "important");
      }
      if (!button.style.position) button.style.position = "relative";
      button.append(mark);
    }
    onRoomMessage(message) {
      const meta = parseActivityMeta(message);
      if (!meta || meta.arousal <= 0 || meta.target !== this.adapter.getOwnMemberNumber()) return;
      if (message.Sender !== meta.source) return;
      if (!dictionaryIdentifies(message.Dictionary, "SourceCharacter", meta.source) || !dictionaryIdentifies(message.Dictionary, "TargetCharacter", meta.target) || !isKnownActivityGroup(meta.group)) {
        return;
      }
      const fingerprint = `${meta.source}:${meta.nonce}`;
      if (this.#seenNonces.includes(fingerprint)) return;
      if (typeof ActivityEffectFlat !== "function") return;
      const player = typeof Player === "object" && Player !== null ? Player : void 0;
      if (!player || player.MemberNumber !== meta.target) return;
      const source = meta.source === player.MemberNumber ? player : typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter) ? ChatRoomCharacter.find((character) => character.MemberNumber === meta.source) : void 0;
      if (!source) return;
      ActivityEffectFlat(source, player, meta.arousal, meta.group, 1);
      this.#seenNonces.push(fingerprint);
      if (this.#seenNonces.length > MAX_SEEN_NONCES) this.#seenNonces.shift();
      removeNativeArousalFallback(message.Dictionary, meta);
    }
    #ensureRegistryInjection() {
      const registry = getNativeActivityRegistry();
      if (!registry) return;
      const registryChanged = registry.activities !== this.#registeredActivities || registry.ordering !== this.#registeredOrdering;
      if (registryChanged) {
        this.#removeFromTrackedRegistry();
        this.#registeredActivities = registry.activities;
        this.#registeredOrdering = registry.ordering;
        this.#injectedActivities.clear();
        this.#bodySlotsCache = void 0;
      }
      if (!nativeActivityRegistryIsLoaded(registry)) {
        removeActivitiesFromRegistry(registry.activities, registry.ordering);
        this.#injectedActivities.clear();
        return;
      }
      if (this.#runtimeActivities.size === 0) {
        removeActivitiesFromRegistry(registry.activities, registry.ordering);
        this.#injectedActivities.clear();
        return;
      }
      if (!registryChanged && this.#registryInjectionIsHealthy(registry)) return;
      removeActivitiesFromRegistry(registry.activities, registry.ordering);
      this.#injectedActivities.clear();
      for (const [runtimeName, definition] of this.#runtimeActivities) {
        const activity = createNativeActivity(runtimeName, definition);
        registry.activities.push(activity);
        registry.ordering.push(runtimeName);
        this.#injectedActivities.set(runtimeName, activity);
      }
      refreshNativeActivityDialog();
    }
    /**
     * Repairs the exact array consumed by the currently open BC activity grid. This path is kept
     * independent from ModSDK and from function replacement so another addon cannot make saved
     * KikiLink activities silently disappear from an already-open native menu.
     */
    #syncOpenNativeDialog() {
      if (typeof DialogMenuMode === "undefined" || DialogMenuMode !== "activities" || typeof DialogActivity === "undefined" || !Array.isArray(DialogActivity)) {
        return;
      }
      let character;
      try {
        character = typeof CharacterGetCurrent === "function" ? CharacterGetCurrent() : typeof CurrentCharacter !== "undefined" ? CurrentCharacter : void 0;
      } catch {
        return;
      }
      const groupName = character?.FocusGroup?.Name;
      if (!character || typeof groupName !== "string") return;
      const extended = this.extendAllowedActivities(character, groupName, DialogActivity);
      if (extended === DialogActivity) return;
      DialogActivity.splice(0, DialogActivity.length, ...extended);
      try {
        const reload = DialogMenuMapping?.activities?.Reload;
        if (typeof reload === "function") {
          const pending = reload.call(DialogMenuMapping.activities, null, {
            reset: true,
            resetDialogItems: false
          });
          if (pending && typeof pending.catch === "function") void pending.catch(() => void 0);
        }
      } catch {
      }
    }
    #registryInjectionIsHealthy(registry) {
      const registeredActivities = registry.activities.filter(
        (activity) => typeof activity?.Name === "string" && activity.Name.startsWith(ACTIVITY_PREFIX)
      );
      const registeredOrdering = registry.ordering.filter(
        (name) => typeof name === "string" && name.startsWith(ACTIVITY_PREFIX)
      );
      if (registeredActivities.length !== this.#runtimeActivities.size || registeredOrdering.length !== this.#runtimeActivities.size || this.#injectedActivities.size !== this.#runtimeActivities.size) {
        return false;
      }
      for (const runtimeName of this.#runtimeActivities.keys()) {
        const injected = this.#injectedActivities.get(runtimeName);
        if (!injected || registeredActivities.filter((activity) => activity === injected).length !== 1 || registeredOrdering.filter((name) => name === runtimeName).length !== 1) {
          return false;
        }
      }
      return true;
    }
    #detachFromRegistries() {
      this.#removeFromTrackedRegistry();
      const current = getNativeActivityRegistry();
      if (current && (current.activities !== this.#registeredActivities || current.ordering !== this.#registeredOrdering)) {
        removeActivitiesFromRegistry(current.activities, current.ordering);
      }
      this.#registeredActivities = void 0;
      this.#registeredOrdering = void 0;
    }
    #removeFromTrackedRegistry() {
      if (this.#registeredActivities && this.#registeredOrdering) {
        removeActivitiesFromRegistry(this.#registeredActivities, this.#registeredOrdering);
      }
    }
  };
  function activityImageUrl(image) {
    return `Assets/Female3DCG/Activity/${canonicalVanillaActivityImage(image)}.png`;
  }
  function canonicalVanillaActivityImage(image) {
    const canonical = VANILLA_ACTIVITY_IMAGE_ALIASES[image] ?? image;
    return VANILLA_ACTIVITY_IMAGE_SET.has(canonical) ? canonical : "Caress";
  }
  function expandCustomActivityTemplate(template, context) {
    const pronouns = context.pronouns ?? { subject: "they", object: "them", possessive: "their" };
    const values = {
      "target's gender": pronouns.possessive,
      "target's": possessiveName(context.targetName),
      their: pronouns.possessive,
      they: pronouns.subject,
      them: pronouns.object,
      source: context.sourceName,
      me: context.sourceName,
      target: context.targetName,
      member: context.targetMemberNumber?.toString() ?? "member"
    };
    return template.trim().replace(
      /\{\s*(target's\s+gender|target's|their|they|them|source|me|target|member)\s*\}/giu,
      (token, key) => values[key.toLocaleLowerCase().replace(/\s+/gu, " ")] ?? token
    );
  }
  function expandActivityTemplate(template, context) {
    const values = {
      source: context.sourceName,
      me: context.sourceName,
      target: context.target.memberName,
      member: context.target.memberNumber.toString()
    };
    return template.trim().replace(
      /\{\s*(source|me|target|member)\s*\}/giu,
      (token, key) => values[key.toLocaleLowerCase()] ?? token
    );
  }
  function parseActivityMeta(message) {
    if (message.Type !== "Action" || message.Content !== ACTION_CONTENT || !Array.isArray(message.Dictionary)) {
      return void 0;
    }
    const entry = message.Dictionary.find(
      (candidate) => isRecord4(candidate) && candidate.Tag === META_TAG && typeof candidate.Text === "string"
    );
    if (!isRecord4(entry) || typeof entry.Text !== "string" || entry.Text.length > 500) return void 0;
    try {
      const parsed = JSON.parse(entry.Text);
      if (!isRecord4(parsed) || parsed.v !== 1 && parsed.v !== 2 || !validMemberNumber(parsed.source) || !validMemberNumber(parsed.target) || !SAFE_ASSET_NAME2.test(typeof parsed.group === "string" ? parsed.group : "") || typeof parsed.arousal !== "number" || !Number.isInteger(parsed.arousal) || parsed.arousal < 0 || parsed.arousal > 20 || typeof parsed.nonce !== "string" || !/^[a-z0-9-]{8,48}$/i.test(parsed.nonce)) {
        return void 0;
      }
      if (parsed.v === 2 && parsed.arousal > 0 && (typeof parsed.fallbackActivity !== "string" || !VANILLA_ACTIVITY_IMAGE_SET.has(parsed.fallbackActivity) || typeof parsed.fallbackCount !== "number" || !Number.isInteger(parsed.fallbackCount) || parsed.fallbackCount < 1 || parsed.fallbackCount > 4)) {
        return void 0;
      }
      return parsed;
    } catch {
      return void 0;
    }
  }
  function nativeArousalFallbackCount(amount) {
    return Math.max(1, Math.min(4, Math.ceil(amount / 5)));
  }
  function isKnownActivityGroup(groupName) {
    if (typeof AssetGroup === "undefined" || !Array.isArray(AssetGroup)) return true;
    return AssetGroup.some(
      (group) => group?.Name === groupName && group.Category === "Item"
    );
  }
  function removeNativeArousalFallback(dictionary, meta) {
    if (!Array.isArray(dictionary) || meta.v !== 2) return;
    for (let index = dictionary.length - 1; index >= 0; index -= 1) {
      const entry = dictionary[index];
      if (!isRecord4(entry)) continue;
      const marked = entry[NATIVE_AROUSAL_FALLBACK_MARKER] === true;
      const matchingActivity = typeof meta.fallbackActivity === "string" && entry.ActivityName === meta.fallbackActivity;
      const matchingCounter = typeof meta.fallbackCount === "number" && entry.ActivityCounter === meta.fallbackCount;
      if (marked || matchingActivity || matchingCounter) dictionary.splice(index, 1);
    }
  }
  function dictionaryIdentifies(dictionary, tag, memberNumber) {
    return Array.isArray(dictionary) && dictionary.some(
      (entry) => isRecord4(entry) && entry.Tag === tag && entry.MemberNumber === memberNumber
    );
  }
  function runtimeActivityName(owner, id) {
    const safe = id.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 36) || "Activity";
    return `${ACTIVITY_PREFIX}${hashString(`${owner}/${id}`)}_${safe}`;
  }
  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }
  function characterName(character) {
    if (typeof CharacterNickname === "function") {
      try {
        const nickname = CharacterNickname(character).trim();
        if (nickname) return nickname;
      } catch {
      }
    }
    return character.Nickname?.trim() || character.Name?.trim() || `Member ${character.MemberNumber}`;
  }
  function characterPronouns(character) {
    const set = character.GetPronouns?.();
    if (set === "SheHer") return { subject: "she", object: "her", possessive: "her" };
    if (set === "HeHim") return { subject: "he", object: "him", possessive: "his" };
    if (set === "ItIt") return { subject: "it", object: "it", possessive: "its" };
    return { subject: "they", object: "them", possessive: "their" };
  }
  function possessiveName(name) {
    return /s$/i.test(name) ? `${name}'` : `${name}'s`;
  }
  function createNonce() {
    const random = Math.random().toString(36).slice(2, 12);
    return `${Date.now().toString(36)}-${random}`;
  }
  function getNativeActivityRegistry() {
    if (typeof ActivityFemale3DCG !== "undefined" && Array.isArray(ActivityFemale3DCG) && typeof ActivityFemale3DCGOrdering !== "undefined" && Array.isArray(ActivityFemale3DCGOrdering)) {
      return { activities: ActivityFemale3DCG, ordering: ActivityFemale3DCGOrdering };
    }
    return void 0;
  }
  function activityGroupsMatch(configuredGroup, focusedGroup) {
    if (configuredGroup === focusedGroup) return true;
    if (typeof AssetGroup === "undefined" || !Array.isArray(AssetGroup)) return false;
    const canonical = (name) => {
      const group = AssetGroup.find((candidate) => candidate?.Name === name);
      return group?.MirrorActivitiesFrom ?? group?.Name ?? name;
    };
    return canonical(configuredGroup) === canonical(focusedGroup);
  }
  function createNativeActivity(runtimeName, definition) {
    return {
      Name: runtimeName,
      ActivityID: typeof GameVersion === "string" && GameVersion === "R121" ? -1 : void 0,
      MaxProgress: 0,
      MaxProgressSelf: 0,
      Prerequisite: [],
      Target: definition.targetMode === "self" ? [] : [definition.targetGroup],
      TargetSelf: definition.targetMode === "self" || definition.targetMode === "both" ? [definition.targetGroup] : []
    };
  }
  function currentMemberNumber(adapter) {
    try {
      const value = adapter.getOwnMemberNumber();
      if (validMemberNumber(value)) return value;
    } catch {
    }
    return typeof Player === "object" && Player !== null && validMemberNumber(Player.MemberNumber) ? Player.MemberNumber : 0;
  }
  function refreshNativeActivityDialog() {
    if (typeof DialogBuildActivities !== "function" || typeof CharacterGetCurrent !== "function" || typeof DialogMenuMode === "undefined" || DialogMenuMode !== "activities") {
      return;
    }
    try {
      const character = CharacterGetCurrent();
      if (character) DialogBuildActivities(character, true);
    } catch {
    }
  }
  function nativeActivityRegistryIsLoaded(registry) {
    const availableNames = new Set(
      registry.activities.map((activity) => activity?.Name).filter(
        (name) => typeof name === "string" && !name.startsWith(ACTIVITY_PREFIX)
      )
    );
    return registry.ordering.some(
      (name) => typeof name === "string" && availableNames.has(name)
    );
  }
  function removeActivitiesFromRegistry(activities, ordering) {
    for (let index = activities.length - 1; index >= 0; index -= 1) {
      const name = activities[index]?.Name;
      if (typeof name === "string" && name.startsWith(ACTIVITY_PREFIX)) activities.splice(index, 1);
    }
    for (let index = ordering.length - 1; index >= 0; index -= 1) {
      const name = ordering[index];
      if (typeof name === "string" && name.startsWith(ACTIVITY_PREFIX)) ordering.splice(index, 1);
    }
  }
  function fallbackBodySlots() {
    return [
      { name: "ItemHead", label: "Head", zones: [[170, 40, 160, 150]] },
      { name: "ItemMouth", label: "Mouth", zones: [[205, 115, 90, 60]] },
      { name: "ItemNeck", label: "Neck", zones: [[190, 190, 120, 70]] },
      { name: "ItemBreast", label: "Breasts", zones: [[145, 245, 210, 150]] },
      { name: "ItemArms", label: "Arms", zones: [[70, 245, 360, 260]] },
      { name: "ItemHands", label: "Hands", zones: [[70, 460, 360, 150]] },
      { name: "ItemTorso", label: "Torso", zones: [[145, 340, 210, 180]] },
      { name: "ItemPelvis", label: "Pelvis", zones: [[145, 500, 210, 130]] },
      { name: "ItemLegs", label: "Legs", zones: [[130, 610, 240, 250]] },
      { name: "ItemFeet", label: "Feet", zones: [[115, 850, 270, 130]] }
    ];
  }
  function bodySlotDrawLayer(groupName, selectedGroup, hoveredGroup) {
    if (groupName === selectedGroup) return 2;
    if (groupName === hoveredGroup) return 1;
    return 0;
  }
  function humanizeGroupName(value) {
    return value.replace(/^Item/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
  }
  function validMemberNumber(value) {
    return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
  }
  function isRecord4(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  // src/modules/link-activities/custom-activities-view.ts
  var TEMPLATE_TOKENS = [
    { token: "{me}", label: "Me" },
    { token: "{target}", label: "Target" },
    { token: "{target's}", label: "Target's" },
    { token: "{target's gender}", label: "Their" }
  ];
  var CustomActivitiesView = class {
    constructor(root, adapter, settings, service, onChanged, showToast) {
      this.root = root;
      this.adapter = adapter;
      this.settings = settings;
      this.service = service;
      this.onChanged = onChanged;
      this.showToast = showToast;
    }
    root;
    adapter;
    settings;
    service;
    onChanged;
    showToast;
    #editingId;
    #hoveredGroup;
    open(activityId) {
      if (activityId) {
        this.#openEditor(activityId);
        return;
      }
      this.#editingId = void 0;
      this.#renderLibrary();
    }
    refresh() {
      if (!this.#editingId) this.#renderLibrary();
    }
    #renderLibrary() {
      this.#editingId = void 0;
      const activities = this.settings.get().linkActivities.customActivities;
      const create = element("button", {
        className: "kl-text-button kl-text-button--primary kl-custom-activity-create",
        type: "button",
        text: "New activity",
        onClick: () => this.#openEditor()
      });
      if (activities.length >= MAX_CUSTOM_ACTIVITIES) create.disabled = true;
      const header = this.#header(
        "Custom Activities",
        "Build personal actions that sit beside Bondage Club's vanilla Activities.",
        create
      );
      const body = element("div", { className: "kl-custom-activities-body" });
      if (activities.length === 0) {
        const blossom = element("img", {
          className: "kl-custom-empty-blossom",
          src: kikilink_blossom_default,
          alt: ""
        });
        body.append(
          element(
            "section",
            { className: "kl-custom-activity-empty" },
            blossom,
            element("h2", { text: "Make an activity your own" }),
            element("p", {
              text: "Choose a body slot, reuse a vanilla picture, and write the action in your words."
            }),
            element("button", {
              className: "kl-text-button kl-text-button--primary",
              type: "button",
              text: "Create first activity",
              onClick: () => this.#openEditor()
            })
          )
        );
      } else {
        const intro = element(
          "div",
          { className: "kl-custom-activity-intro" },
          element("span", {
            text: `${activities.length} custom ${activities.length === 1 ? "activity" : "activities"}`
          }),
          element("span", { text: "Blossom marks them in the native menu" })
        );
        const list = element("div", { className: "kl-custom-activity-list" });
        for (const activity of activities) list.append(this.#activityCard(activity));
        body.append(intro, list);
      }
      this.root.replaceChildren(header, body);
    }
    #activityCard(activity) {
      const vanillaIcon = element("img", {
        className: "kl-custom-activity-vanilla-icon",
        src: activityImageUrl(activity.image),
        alt: ""
      });
      vanillaIcon.loading = "lazy";
      vanillaIcon.decoding = "async";
      const iconWrap = element(
        "div",
        { className: "kl-custom-activity-card-icon" },
        vanillaIcon,
        element("img", {
          className: "kl-custom-activity-blossom",
          src: kikilink_blossom_default,
          alt: "KikiLink"
        })
      );
      const arousal = activity.arousal > 0 ? ` \xB7 Arousal +${activity.arousal}` : "";
      const card = element(
        "button",
        {
          className: "kl-custom-activity-card",
          type: "button",
          ariaLabel: `Edit ${activity.name}`,
          onClick: () => this.#openEditor(activity.id)
        },
        iconWrap,
        element(
          "div",
          { className: "kl-custom-activity-card-copy" },
          element("div", { className: "kl-custom-activity-card-name", text: activity.name }),
          element("div", {
            className: "kl-custom-activity-card-meta",
            text: `${this.#slotLabel(activity.targetGroup)}${arousal}`
          }),
          element("div", {
            className: "kl-custom-activity-card-template",
            text: activity.template
          })
        ),
        element("span", { className: "kl-custom-activity-edit-label", text: "Edit" })
      );
      card.dataset.activityId = activity.id;
      return card;
    }
    #openEditor(activityId) {
      const existing = activityId ? this.settings.get().linkActivities.customActivities.find((activity) => activity.id === activityId) : void 0;
      if (activityId && !existing) {
        this.#renderLibrary();
        return;
      }
      if (!existing && this.settings.get().linkActivities.customActivities.length >= MAX_CUSTOM_ACTIVITIES) {
        this.showToast(`You can keep up to ${MAX_CUSTOM_ACTIVITIES} custom activities.`, "error");
        return;
      }
      const draft = structuredClone(existing ?? createBlankCustomActivity(createCustomActivityId()));
      draft.image = canonicalVanillaActivityImage(draft.image);
      this.#editingId = draft.id;
      this.#hoveredGroup = void 0;
      const back = element("button", {
        className: "kl-text-button kl-custom-activity-back",
        type: "button",
        text: "Back",
        onClick: () => this.#renderLibrary()
      });
      const header = this.#header(
        existing ? "Edit activity" : "New custom activity",
        "Pick where it appears, then give it a clear name and action.",
        back
      );
      const editor = this.#buildEditor(draft, existing !== void 0);
      this.root.replaceChildren(header, editor);
      requestAnimationFrame(() => {
        editor.querySelector('[data-field="name"]')?.focus();
        this.#redrawCharacter(editor, draft.targetGroup);
      });
    }
    #buildEditor(draft, isExisting) {
      const slots = this.service.getBodySlots();
      if (!slots.some((slot) => slot.name === draft.targetGroup) && slots[0]) {
        draft.targetGroup = slots[0].name;
      }
      const canvas = element("canvas", {
        className: "kl-custom-character-canvas",
        ariaLabel: "Your character body slots",
        tabIndex: 0
      });
      const canvasFallback = element("div", {
        className: "kl-custom-character-fallback",
        text: "Your character appears here in Bondage Club."
      });
      const slotSelect = element("select", {
        className: "kl-select kl-custom-slot-select",
        ariaLabel: "Body slot"
      });
      slotSelect.hidden = true;
      slotSelect.tabIndex = -1;
      slotSelect.setAttribute("aria-hidden", "true");
      for (const slot of slots) {
        const option = document.createElement("option");
        option.value = slot.name;
        option.textContent = slot.label;
        slotSelect.append(option);
      }
      slotSelect.value = draft.targetGroup;
      const slotsByName = new Map(slots.map((slot) => [slot.name, slot]));
      const slotButtons = /* @__PURE__ */ new Map();
      const selectedSlotLabel = element("span", {
        className: "kl-custom-slot-current",
        text: slotsByName.get(draft.targetGroup)?.label ?? draft.targetGroup
      });
      const slotSummaryAction = element("span", {
        className: "kl-custom-slot-action",
        text: "Show all"
      });
      const slotSummary = element(
        "summary",
        { className: "kl-custom-slot-summary" },
        selectedSlotLabel,
        slotSummaryAction
      );
      const slotGrid = element("div", {
        className: "kl-custom-slot-grid",
        ariaLabel: "Body slots"
      });
      slotGrid.setAttribute("role", "radiogroup");
      const slotPicker = element(
        "details",
        { className: "kl-custom-slot-picker" },
        slotSummary,
        slotGrid
      );
      let slotButtonsBuilt = false;
      let redrawCharacter = () => void 0;
      const updateSlotSummary = (groupName) => {
        const label = slotsByName.get(groupName)?.label ?? groupName;
        selectedSlotLabel.textContent = label;
        slotSummary.setAttribute(
          "aria-label",
          `Selected body slot: ${label}. ${slotPicker.open ? "Hide" : "Show all"} body slots`
        );
      };
      const selectSlot = (groupName, collapsePicker = false) => {
        if (!slotsByName.has(groupName)) return;
        draft.targetGroup = groupName;
        slotSelect.value = groupName;
        for (const [name2, button] of slotButtons) {
          const selected = name2 === groupName;
          button.dataset.selected = String(selected);
          button.setAttribute("aria-checked", String(selected));
        }
        updateSlotSummary(groupName);
        if (collapsePicker && slotPicker.open) {
          slotPicker.open = false;
          slotSummaryAction.textContent = "Show all";
        }
        redrawCharacter();
      };
      const buildSlotButtons = () => {
        if (slotButtonsBuilt) return;
        slotButtonsBuilt = true;
        const fragment = document.createDocumentFragment();
        for (const slot of slots) {
          const button = element("button", {
            className: "kl-custom-slot-choice",
            type: "button",
            text: slot.label,
            title: slot.label,
            ariaLabel: `Use ${slot.label} body slot`,
            onClick: () => selectSlot(slot.name, true)
          });
          button.dataset.slot = slot.name;
          button.dataset.selected = String(slot.name === draft.targetGroup);
          button.setAttribute("role", "radio");
          button.setAttribute("aria-checked", String(slot.name === draft.targetGroup));
          slotButtons.set(slot.name, button);
          fragment.append(button);
        }
        slotGrid.append(fragment);
      };
      updateSlotSummary(draft.targetGroup);
      slotPicker.addEventListener("toggle", () => {
        slotSummaryAction.textContent = slotPicker.open ? "Hide" : "Show all";
        updateSlotSummary(draft.targetGroup);
        if (slotPicker.open) buildSlotButtons();
      });
      slotSelect.addEventListener("change", () => selectSlot(slotSelect.value));
      const name = element("input", {
        className: "kl-search kl-custom-activity-name",
        ariaLabel: "Activity name"
      });
      name.dataset.field = "name";
      name.placeholder = "e.g. Gentle elbow touch";
      name.maxLength = 40;
      name.value = draft.name;
      const template = element("textarea", {
        className: "kl-custom-activity-template",
        ariaLabel: "Activity text"
      });
      template.placeholder = "{me} touches {target's} arm and {target's gender} elbow.";
      template.maxLength = 500;
      template.value = draft.template;
      const tokenRow = element("div", {
        className: "kl-custom-token-row",
        ariaLabel: "Insert a variable"
      });
      for (const item of TEMPLATE_TOKENS) {
        tokenRow.append(
          element("button", {
            className: "kl-custom-token",
            type: "button",
            text: item.label,
            title: item.token,
            onClick: () => {
              template.setRangeText(
                item.token,
                template.selectionStart,
                template.selectionEnd,
                "end"
              );
              template.focus();
              updatePreview();
            }
          })
        );
      }
      const preview = element("div", { className: "kl-custom-activity-live-preview" });
      const updatePreview = () => {
        preview.textContent = expandCustomActivityTemplate(template.value, {
          sourceName: this.adapter.getOwnName(),
          targetName: "Alex"
        }) || "Your activity preview appears here.";
      };
      template.addEventListener("input", updatePreview);
      updatePreview();
      const imageSearch = element("input", {
        className: "kl-search kl-custom-image-search",
        ariaLabel: "Search vanilla activity pictures"
      });
      imageSearch.type = "search";
      imageSearch.placeholder = "Search vanilla pictures";
      const imageGallery = element("div", {
        className: "kl-custom-image-gallery",
        ariaLabel: "Vanilla activity pictures"
      });
      const imageButtons = /* @__PURE__ */ new Map();
      const noImageMatches = element("div", {
        className: "kl-contact-empty",
        text: "No vanilla pictures match."
      });
      noImageMatches.hidden = true;
      const imageFragment = document.createDocumentFragment();
      const selectImage = (image) => {
        const canonical = canonicalVanillaActivityImage(image);
        if (canonical === draft.image) return;
        const previous = imageButtons.get(draft.image);
        previous?.setAttribute("aria-pressed", "false");
        if (previous) previous.dataset.selected = "false";
        draft.image = canonical;
        const selected = imageButtons.get(canonical);
        selected?.setAttribute("aria-pressed", "true");
        if (selected) selected.dataset.selected = "true";
      };
      for (const image of this.service.getVanillaImages()) {
        const previewImage = element("img", { src: activityImageUrl(image), alt: "" });
        previewImage.loading = "lazy";
        previewImage.decoding = "async";
        const button = element(
          "button",
          {
            className: "kl-custom-image-choice",
            type: "button",
            title: image,
            ariaLabel: `Use ${image} picture`,
            onClick: () => selectImage(image)
          },
          previewImage,
          element("span", { text: humanizeActivityName(image) })
        );
        button.dataset.search = image.toLocaleLowerCase();
        button.dataset.selected = String(image === draft.image);
        button.setAttribute("aria-pressed", String(image === draft.image));
        imageButtons.set(image, button);
        imageFragment.append(button);
      }
      imageGallery.append(imageFragment, noImageMatches);
      const filterImages = () => {
        const query = imageSearch.value.trim().toLocaleLowerCase();
        let visible = 0;
        for (const button of imageButtons.values()) {
          const matches = !query || button.dataset.search?.includes(query) === true;
          button.hidden = !matches;
          if (matches) visible += 1;
        }
        noImageMatches.hidden = visible !== 0;
      };
      let imageFilterFrame;
      imageSearch.addEventListener("input", () => {
        if (imageFilterFrame !== void 0) return;
        imageFilterFrame = requestAnimationFrame(() => {
          imageFilterFrame = void 0;
          if (imageGallery.isConnected) filterImages();
        });
      });
      const arousalToggle = element("input");
      arousalToggle.type = "checkbox";
      arousalToggle.checked = draft.arousal > 0;
      arousalToggle.setAttribute("aria-label", "Trigger arousal");
      const arousalRange = element("input", {
        className: "kl-custom-arousal-range",
        ariaLabel: "Arousal amount"
      });
      arousalRange.type = "range";
      arousalRange.min = "1";
      arousalRange.max = "20";
      arousalRange.step = "1";
      arousalRange.value = String(Math.max(1, draft.arousal || 5));
      const arousalValue = element("output", {
        className: "kl-custom-arousal-value",
        text: `+${arousalRange.value}`
      });
      const arousalOptions = element(
        "div",
        { className: "kl-custom-arousal-options" },
        arousalRange,
        arousalValue
      );
      arousalOptions.hidden = !arousalToggle.checked;
      arousalToggle.addEventListener("change", () => {
        arousalOptions.hidden = !arousalToggle.checked;
      });
      arousalRange.addEventListener("input", () => {
        arousalValue.textContent = `+${arousalRange.value}`;
      });
      const arousalSwitch = element(
        "label",
        { className: "kl-switch" },
        arousalToggle,
        element("span", { className: "kl-switch-track" })
      );
      const targetMode = element("select", {
        className: "kl-select kl-custom-target-mode",
        ariaLabel: "Who can be targeted"
      });
      targetMode.append(
        selectOption("other", "Other characters"),
        selectOption("self", "My character"),
        selectOption("both", "Others and myself")
      );
      targetMode.value = draft.targetMode;
      const advanced = element(
        "details",
        { className: "kl-custom-activity-advanced" },
        element("summary", { text: "Advanced" }),
        this.#field("Who can be targeted", "Choose whether this action can appear on others, yourself, or both.", targetMode)
      );
      const form = element(
        "section",
        { className: "kl-custom-activity-form" },
        this.#field("Activity name", "Short and recognizable in the native menu.", name),
        this.#field(
          "Action text",
          "Tap a variable to insert it. Everyone in the room sees only the finished sentence.",
          template,
          tokenRow
        ),
        element(
          "div",
          { className: "kl-custom-preview-wrap" },
          element("div", { className: "kl-custom-field-label", text: "Preview" }),
          preview
        ),
        this.#field(
          "Vanilla picture",
          "This is the picture shown beside normal Bondage Club activities.",
          imageSearch,
          imageGallery
        ),
        element(
          "div",
          { className: "kl-custom-arousal-row" },
          element(
            "div",
            { className: "kl-custom-arousal-copy" },
            element("div", { className: "kl-custom-field-label", text: "Trigger arousal" }),
            element("div", {
              className: "kl-custom-field-help",
              text: "Off by default. Bondage Club applies this base amount using the recipient's preferences."
            })
          ),
          arousalSwitch,
          arousalOptions
        ),
        advanced
      );
      const characterPane = element(
        "aside",
        { className: "kl-custom-character-pane" },
        element("div", { className: "kl-custom-field-label", text: "Body slot" }),
        element("div", {
          className: "kl-custom-field-help",
          text: "Tap your character or open the compact picker to change it."
        }),
        slotPicker,
        element("div", { className: "kl-custom-character-stage" }, canvas, canvasFallback),
        slotSelect,
        element("div", {
          className: "kl-custom-slot-note",
          text: "The activity will appear next to vanilla actions on this slot."
        })
      );
      let redrawFrame;
      const redraw = () => {
        if (redrawFrame !== void 0) return;
        redrawFrame = requestAnimationFrame(() => {
          redrawFrame = void 0;
          if (!canvas.isConnected) return;
          const drawn = this.service.drawPlayer(canvas, draft.targetGroup, this.#hoveredGroup);
          canvasFallback.hidden = drawn;
        });
      };
      redrawCharacter = redraw;
      canvas.addEventListener("pointermove", (event) => {
        if (event.pointerType && event.pointerType !== "mouse") return;
        const point = canvasPoint(canvas, event);
        const hoveredGroup = this.service.bodySlotAt(point.x, point.y)?.name;
        if (hoveredGroup === this.#hoveredGroup) return;
        this.#hoveredGroup = hoveredGroup;
        redraw();
      });
      canvas.addEventListener("pointerleave", () => {
        if (this.#hoveredGroup === void 0) return;
        this.#hoveredGroup = void 0;
        redraw();
      });
      canvas.addEventListener("click", (event) => {
        const point = canvasPoint(canvas, event);
        const slot = this.service.bodySlotAt(point.x, point.y);
        if (!slot) return;
        selectSlot(slot.name);
      });
      const save = element("button", {
        className: "kl-text-button kl-text-button--primary kl-custom-activity-save",
        type: "button",
        text: "Save activity",
        onClick: () => {
          const activityName = name.value.trim();
          const activityTemplate = template.value.trim();
          if (!activityName || !activityTemplate || !slotSelect.value) {
            this.showToast("Add a name, action text, and body slot before saving.", "error");
            return;
          }
          const saved = {
            id: draft.id,
            name: activityName,
            targetGroup: slotSelect.value,
            targetMode: targetMode.value,
            template: activityTemplate,
            image: canonicalVanillaActivityImage(draft.image),
            arousal: arousalToggle.checked ? Number(arousalRange.value) : 0
          };
          this.settings.update((settingsDraft) => {
            const index = settingsDraft.linkActivities.customActivities.findIndex(
              (activity) => activity.id === saved.id
            );
            if (index >= 0) settingsDraft.linkActivities.customActivities[index] = saved;
            else settingsDraft.linkActivities.customActivities.push(saved);
          });
          this.service.syncFromSettings();
          this.onChanged();
          this.showToast(isExisting ? `${saved.name} updated.` : `${saved.name} added beside vanilla activities.`);
          this.#renderLibrary();
        }
      });
      const cancel = element("button", {
        className: "kl-text-button kl-custom-activity-cancel",
        type: "button",
        text: "Cancel",
        onClick: () => this.#renderLibrary()
      });
      const footerChildren = [];
      if (isExisting) {
        footerChildren.push(
          element("button", {
            className: "kl-text-button kl-text-button--danger kl-custom-activity-delete",
            type: "button",
            text: "Delete",
            onClick: () => {
              if (!window.confirm(`Delete ${draft.name}?`)) return;
              this.settings.update((settingsDraft) => {
                settingsDraft.linkActivities.customActivities = settingsDraft.linkActivities.customActivities.filter(
                  (activity) => activity.id !== draft.id
                );
              });
              this.service.syncFromSettings();
              this.onChanged();
              this.showToast(`${draft.name} deleted.`);
              this.#renderLibrary();
            }
          })
        );
      }
      footerChildren.push(element("span", { className: "kl-custom-editor-spacer" }), cancel, save);
      const footer = element(
        "footer",
        { className: "kl-feature-page-footer kl-custom-activity-footer" },
        ...footerChildren
      );
      return element(
        "div",
        { className: "kl-custom-activity-editor" },
        element("div", { className: "kl-custom-editor-body" }, characterPane, form),
        footer
      );
    }
    #redrawCharacter(editor, selectedGroup) {
      const canvas = editor.querySelector(".kl-custom-character-canvas");
      const fallback = editor.querySelector(".kl-custom-character-fallback");
      if (!canvas) return;
      const drawn = this.service.drawPlayer(canvas, selectedGroup);
      if (fallback) fallback.hidden = drawn;
    }
    #header(title, subtitle, action) {
      return element(
        "header",
        { className: "kl-feature-page-header kl-custom-activity-header" },
        element(
          "div",
          { className: "kl-feature-page-heading" },
          element("div", { className: "kl-feature-page-eyebrow", text: "BLOSSOM STUDIO" }),
          element("h1", { className: "kl-feature-page-title", text: title }),
          element("p", { className: "kl-feature-page-subtitle", text: subtitle })
        ),
        action
      );
    }
    #field(name, help, control, extra) {
      return element(
        "div",
        { className: "kl-custom-field" },
        element("span", { className: "kl-custom-field-label", text: name }),
        element("span", { className: "kl-custom-field-help", text: help }),
        control,
        extra
      );
    }
    #slotLabel(groupName) {
      return this.service.getBodySlots().find((slot) => slot.name === groupName)?.label ?? groupName.replace(/^Item/, "");
    }
  };
  function canvasPoint(canvas, event) {
    const bounds = canvas.getBoundingClientRect();
    const width = bounds.width || canvas.width || 250;
    const height = bounds.height || canvas.height || 500;
    return {
      x: (event.clientX - bounds.left) / width * canvas.width,
      y: (event.clientY - bounds.top) / height * canvas.height
    };
  }
  function selectOption(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }
  function humanizeActivityName(value) {
    return value.replace(/([a-z])([A-Z])/g, "$1 $2");
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
          isFriend: character?.isFriend === true || typeof this.adapter.isKnownFriend === "function" && this.adapter.isKnownFriend(memberNumber),
          relationships: typeof this.adapter.getPlayerRelationships === "function" ? this.adapter.getPlayerRelationships(memberNumber) : []
        };
      }).filter((entry) => scope !== "favorites" || entry.favorite).filter(
        (entry) => !normalizedQuery || entry.displayName.toLocaleLowerCase().includes(normalizedQuery) || entry.memberNumber.toString().includes(normalizedQuery) || entry.note.toLocaleLowerCase().includes(normalizedQuery) || entry.tags.some((tag) => tag.toLocaleLowerCase().includes(normalizedQuery)) || entry.relationships.some((relationship) => relationship.includes(normalizedQuery))
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
    if (!isRecord5(value) || !validMemberNumber2(value.memberNumber)) return void 0;
    const now = Date.now();
    const lastSeenAt = validTime(value.lastSeenAt) ? value.lastSeenAt : 0;
    const firstSeenAt = validTime(value.firstSeenAt) ? Math.min(value.firstSeenAt, lastSeenAt || now) : lastSeenAt;
    const displayName = cleanText4(value.displayName, 80) || `Member ${value.memberNumber}`;
    const note = cleanText4(value.note, 2e3);
    const lastRoomName = cleanText4(value.lastRoomName, 100);
    const encounterCount = typeof value.encounterCount === "number" && Number.isInteger(value.encounterCount) && value.encounterCount >= 0 ? Math.min(value.encounterCount, 1e6) : 0;
    const tags = [];
    if (Array.isArray(value.tags)) {
      const seen = /* @__PURE__ */ new Set();
      for (const rawTag of value.tags.slice(0, 16)) {
        const tag = cleanText4(rawTag, 24);
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
    if (!isRecord5(parsed) || parsed.format !== NOTEBOOK_FORMAT || parsed.version !== NOTEBOOK_VERSION || !Array.isArray(parsed.records)) {
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
  function isRecord5(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function validMemberNumber2(value) {
    return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
  }
  function validTime(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  }
  function cleanText4(value, maxLength) {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
  }

  // src/storage/device-notification-sound-store.ts
  var MAX_NOTIFICATION_SOUND_DURATION_MS = 5e3;
  var MAX_NOTIFICATION_SOUND_BYTES = 10 * 1024 * 1024;
  var DATABASE_VERSION = 1;
  var STORE_NAME = "sounds";
  var METADATA_TIMEOUT_MS = 12e3;
  var DeviceNotificationSoundStore = class {
    constructor(memberNumber) {
      this.memberNumber = memberNumber;
    }
    memberNumber;
    #memory = /* @__PURE__ */ new Map();
    #databasePromise;
    #databaseUnavailable = false;
    async list() {
      const database = await this.#database().catch(() => void 0);
      if (!database) return sortSounds([...this.#memory.values()]);
      const records = await requestResult(
        database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll()
      );
      return sortSounds(records);
    }
    async get(id) {
      if (!validSoundId(id)) return void 0;
      const database = await this.#database().catch(() => void 0);
      if (!database) return this.#memory.get(id);
      return await requestResult(
        database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id)
      );
    }
    async add(file) {
      validateNotificationSoundFile(file);
      const durationMs = await readAudioDurationMs(file);
      if (durationMs > MAX_NOTIFICATION_SOUND_DURATION_MS) {
        throw new Error("Notification sounds can be at most 5 seconds long");
      }
      const record = {
        id: createSoundId(),
        name: cleanSoundName(file.name),
        mimeType: file.type,
        durationMs,
        createdAt: Date.now(),
        blob: file.slice(0, file.size, file.type)
      };
      const database = await this.#database().catch(() => void 0);
      if (!database) {
        this.#memory.set(record.id, record);
        return record;
      }
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(record);
      await transactionDone(transaction);
      return record;
    }
    async delete(id) {
      if (!validSoundId(id)) return;
      this.#memory.delete(id);
      const database = await this.#database().catch(() => void 0);
      if (!database) return;
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(id);
      await transactionDone(transaction);
    }
    close() {
      void this.#databasePromise?.then((database) => database.close()).catch(() => void 0);
      this.#databasePromise = void 0;
    }
    #database() {
      if (this.#databaseUnavailable || typeof indexedDB === "undefined") {
        this.#databaseUnavailable = true;
        return Promise.reject(new Error("IndexedDB is unavailable"));
      }
      this.#databasePromise ??= openDatabase(databaseName(this.memberNumber)).catch((error) => {
        this.#databaseUnavailable = true;
        this.#databasePromise = void 0;
        throw error;
      });
      return this.#databasePromise;
    }
  };
  function validateNotificationSoundFile(file) {
    if (!(file instanceof Blob) || file.size <= 0) throw new Error("Choose a non-empty audio file");
    if (file.size > MAX_NOTIFICATION_SOUND_BYTES) {
      throw new Error("Notification sounds must be smaller than 10 MB");
    }
    const audioMime = file.type.toLocaleLowerCase().startsWith("audio/");
    const audioName = /\.(?:aac|flac|m4a|mp3|oga|ogg|opus|wav|webm)$/iu.test(file.name);
    if (!audioMime && !audioName) {
      throw new Error("Choose an audio file supported by your browser");
    }
  }
  function readAudioDurationMs(file) {
    if (typeof Audio !== "function" || typeof URL.createObjectURL !== "function") {
      return Promise.reject(new Error("This browser cannot inspect local audio files"));
    }
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      const timer = setTimeout(() => finish(void 0, "The audio file took too long to read"), METADATA_TIMEOUT_MS);
      const finish = (duration, error) => {
        clearTimeout(timer);
        audio.removeEventListener("loadedmetadata", loaded);
        audio.removeEventListener("error", failed);
        audio.removeAttribute("src");
        URL.revokeObjectURL(url);
        if (duration !== void 0) resolve(duration);
        else reject(new Error(error ?? "The audio file could not be read"));
      };
      const loaded = () => {
        const milliseconds = Math.round(audio.duration * 1e3);
        if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
          finish(void 0, "The audio file has no readable duration");
          return;
        }
        finish(milliseconds);
      };
      const failed = () => finish(void 0, "This audio format is not supported by your browser");
      audio.addEventListener("loadedmetadata", loaded, { once: true });
      audio.addEventListener("error", failed, { once: true });
      audio.preload = "metadata";
      audio.src = url;
      audio.load();
    });
  }
  function databaseName(memberNumber) {
    const account = Number.isSafeInteger(memberNumber) && memberNumber > 0 ? memberNumber : "guest";
    return `kikilink-device-sounds-${account}`;
  }
  function openDatabase(name) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Unable to open local sound storage"));
      request.onblocked = () => reject(new Error("Local sound storage is blocked by another tab"));
    });
  }
  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Local sound storage request failed"));
    });
  }
  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Local sound storage failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("Local sound storage was cancelled"));
    });
  }
  function sortSounds(sounds) {
    return sounds.sort((left, right) => right.createdAt - left.createdAt || left.name.localeCompare(right.name));
  }
  function createSoundId() {
    const random = typeof crypto === "object" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    return random.toLocaleLowerCase().replace(/[^a-z0-9_-]/gu, "").slice(0, 64);
  }
  function validSoundId(value) {
    return /^[a-z0-9_-]{1,64}$/iu.test(value);
  }
  function cleanSoundName(value) {
    const name = value.replace(/\.[^.]+$/u, "").replace(/[\u0000-\u001f\u007f]/gu, "").trim();
    return (name || "Custom sound").slice(0, 60);
  }

  // src/storage/device-music-store.ts
  var MAX_LOCAL_MUSIC_BYTES = 80 * 1024 * 1024;
  var DATABASE_VERSION2 = 1;
  var STORE_NAME2 = "tracks";
  var DeviceMusicStore = class {
    constructor(memberNumber) {
      this.memberNumber = memberNumber;
    }
    memberNumber;
    #memory = /* @__PURE__ */ new Map();
    #databasePromise;
    #databaseUnavailable = false;
    async list() {
      const database = await this.#database().catch(() => void 0);
      const tracks = database ? await requestResult2(
        database.transaction(STORE_NAME2, "readonly").objectStore(STORE_NAME2).getAll()
      ) : [...this.#memory.values()];
      return tracks.sort((left, right) => right.createdAt - left.createdAt);
    }
    async get(id) {
      if (!validId(id)) return void 0;
      const database = await this.#database().catch(() => void 0);
      if (!database) return this.#memory.get(id);
      return await requestResult2(
        database.transaction(STORE_NAME2, "readonly").objectStore(STORE_NAME2).get(id)
      );
    }
    async add(file) {
      validateMusicFile(file);
      const record = {
        id: createId2(),
        name: cleanName2(file.name),
        mimeType: file.type || "application/octet-stream",
        createdAt: Date.now(),
        blob: file.slice(0, file.size, file.type)
      };
      const database = await this.#database().catch(() => void 0);
      if (!database) {
        this.#memory.set(record.id, record);
        return record;
      }
      const transaction = database.transaction(STORE_NAME2, "readwrite");
      transaction.objectStore(STORE_NAME2).put(record);
      await transactionDone2(transaction);
      return record;
    }
    async delete(id) {
      if (!validId(id)) return;
      this.#memory.delete(id);
      const database = await this.#database().catch(() => void 0);
      if (!database) return;
      const transaction = database.transaction(STORE_NAME2, "readwrite");
      transaction.objectStore(STORE_NAME2).delete(id);
      await transactionDone2(transaction);
    }
    close() {
      void this.#databasePromise?.then((database) => database.close()).catch(() => void 0);
      this.#databasePromise = void 0;
    }
    #database() {
      if (this.#databaseUnavailable || typeof indexedDB === "undefined") {
        this.#databaseUnavailable = true;
        return Promise.reject(new Error("IndexedDB is unavailable"));
      }
      this.#databasePromise ??= openDatabase2(databaseName2(this.memberNumber)).catch((error) => {
        this.#databaseUnavailable = true;
        this.#databasePromise = void 0;
        throw error;
      });
      return this.#databasePromise;
    }
  };
  function validateMusicFile(file) {
    if (!(file instanceof Blob) || file.size <= 0) throw new Error("Choose a non-empty audio file");
    if (file.size > MAX_LOCAL_MUSIC_BYTES) throw new Error("Local tracks must be smaller than 80 MB");
    const supportedMime = file.type.toLocaleLowerCase().startsWith("audio/") || file.type === "video/mp4";
    const supportedName = /\.(?:aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/iu.test(file.name);
    if (!supportedMime && !supportedName) throw new Error("Choose an audio file supported by your browser");
  }
  function databaseName2(memberNumber) {
    const account = Number.isSafeInteger(memberNumber) && memberNumber > 0 ? memberNumber : "guest";
    return `kikilink-device-music-${account}`;
  }
  function openDatabase2(name) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, DATABASE_VERSION2);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME2)) {
          request.result.createObjectStore(STORE_NAME2, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Unable to open local music storage"));
      request.onblocked = () => reject(new Error("Local music storage is blocked by another tab"));
    });
  }
  function requestResult2(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Local music storage request failed"));
    });
  }
  function transactionDone2(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Local music storage failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("Local music storage was cancelled"));
    });
  }
  function createId2() {
    const random = typeof crypto === "object" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    return random.toLocaleLowerCase().replace(/[^a-z0-9_-]/gu, "").slice(0, 64);
  }
  function validId(value) {
    return /^[a-z0-9_-]{1,64}$/iu.test(value);
  }
  function cleanName2(value) {
    const name = value.replace(/\.[^.]+$/u, "").replace(/[\u0000-\u001f\u007f]/gu, " ").trim();
    return (name || "Local track").slice(0, 80);
  }

  // src/modules/link-presence/link-presence-service.ts
  var NATIVE_REFRESH_MS = 3e4;
  var STATUS_CHECK_MS = 15e3;
  var REMOTE_STATUS_TTL_MS = 5 * 6e4;
  var RECENT_PACKET_ONLINE_MS = 9e4;
  var REQUEST_COOLDOWN_MS = 2e4;
  var REQUEST_QUEUE_INTERVAL_MS = 140;
  var MAX_QUEUED_REQUESTS = 60;
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
    #requestQueue = [];
    #queuedRequests = /* @__PURE__ */ new Set();
    #localTyping = /* @__PURE__ */ new Map();
    #remoteTypingUntil = /* @__PURE__ */ new Map();
    #typingExpiryTimers = /* @__PURE__ */ new Map();
    #unsubscribers = [];
    #nativeTimer;
    #statusTimer;
    #requestTimer;
    #lastInteractionAt = Date.now();
    #lastEffectiveStatus = "online";
    #lastRoomName = "";
    #started = false;
    #onInteraction = () => {
      const previous = this.getOwnStatus();
      this.#lastInteractionAt = Date.now();
      const next = this.getOwnStatus();
      if (previous !== next) {
        this.#lastEffectiveStatus = next;
        this.#publishOwnPresence();
        this.#notify(this.adapter.getOwnMemberNumber());
      }
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
      if (this.#requestTimer !== void 0) clearTimeout(this.#requestTimer);
      this.#requestTimer = void 0;
      this.#requestQueue.splice(0);
      this.#queuedRequests.clear();
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
    getOwnAvatarUrl() {
      return this.settings.get().linkPresence.avatarUrl;
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
      this.settings.update((draft) => {
        draft.linkPresence.enabled = enabled;
      });
      this.#lastEffectiveStatus = this.getOwnStatus();
      if (previous && !enabled) this.#publishOwnPresence("offline", true, false);
      else if (enabled) this.#syncRoom(true);
      this.#notify(this.adapter.getOwnMemberNumber());
    }
    setOwnProfile(profile) {
      const previousEnabled = this.settings.get().linkPresence.enabled;
      const next = this.settings.update((draft) => {
        draft.linkPresence.enabled = profile.enabled;
        draft.linkPresence.statusMessage = profile.statusMessage;
        draft.linkPresence.avatarUrl = profile.avatarUrl;
        draft.linkPresence.autoIdleMinutes = profile.autoIdleMinutes;
        draft.linkPresence.afkAutoReply = profile.afkAutoReply;
      }).linkPresence;
      this.#lastEffectiveStatus = this.getOwnStatus();
      if (previousEnabled && !next.enabled) {
        this.#publishOwnPresence("offline", true, false);
      } else if (next.enabled) {
        if (previousEnabled) this.#publishOwnPresence();
        else this.#syncRoom(true);
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
    setOwnAvatarUrl(avatarUrl) {
      this.settings.update((draft) => {
        draft.linkPresence.avatarUrl = avatarUrl;
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
          ...statusMessage ? { statusMessage } : {},
          ...this.getOwnAvatarUrl() ? { avatarUrl: this.getOwnAvatarUrl() } : {}
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
          ...remote.avatarUrl ? { avatarUrl: remote.avatarUrl } : {},
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
      if (!Number.isSafeInteger(memberNumber) || memberNumber < 0 || !this.settings.get().linkPresence.enabled || memberNumber === this.adapter.getOwnMemberNumber()) {
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
        this.#lastRequestAt.set(memberNumber, now);
        return false;
      }
    }
    /**
     * Quietly discovers KikiLink presence for a visible player list without bursting BC's socket.
     * Repeated renders are cheap: queued members and the normal request cooldown are deduplicated.
     */
    requestMany(memberNumbers) {
      if (!this.settings.get().linkPresence.enabled) return 0;
      const ownMemberNumber = this.adapter.getOwnMemberNumber();
      const now = Date.now();
      let added = 0;
      for (const memberNumber of memberNumbers) {
        if (this.#requestQueue.length >= MAX_QUEUED_REQUESTS || !Number.isSafeInteger(memberNumber) || memberNumber < 0 || memberNumber === ownMemberNumber || this.#queuedRequests.has(memberNumber) || now - (this.#lastRequestAt.get(memberNumber) ?? 0) < REQUEST_COOLDOWN_MS) {
          continue;
        }
        this.#requestQueue.push(memberNumber);
        this.#queuedRequests.add(memberNumber);
        added += 1;
      }
      if (this.#requestQueue.length > 0 && this.#requestTimer === void 0) {
        this.#drainRequestQueue();
      }
      return added;
    }
    isTyping(memberNumber, now = Date.now()) {
      return (this.#remoteTypingUntil.get(memberNumber) ?? 0) > now;
    }
    hasCompatiblePeer(memberNumber, now = Date.now()) {
      if (memberNumber === this.adapter.getOwnMemberNumber()) return true;
      const remote = this.#remote.get(memberNumber);
      return remote !== void 0 && now - remote.receivedAt <= REMOTE_STATUS_TTL_MS;
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
    #drainRequestQueue() {
      this.#requestTimer = void 0;
      const memberNumber = this.#requestQueue.shift();
      if (memberNumber === void 0) return;
      this.#queuedRequests.delete(memberNumber);
      this.request(memberNumber);
      if (this.#requestQueue.length > 0) {
        this.#requestTimer = setTimeout(
          () => this.#drainRequestQueue(),
          REQUEST_QUEUE_INTERVAL_MS
        );
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
        ...packet.a ? { avatarUrl: packet.a } : {},
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
        ...config.avatarUrl ? { a: config.avatarUrl } : {},
        u: Date.now(),
        v: this.version
      };
      try {
        this.adapter.sendKikiLinkProtocol(target, JSON.stringify(packet));
      } catch {
      }
    }
    #publishOwnPresence(statusOverride, force = false, includeProfile = true) {
      if (!force && !this.settings.get().linkPresence.enabled) return;
      const config = this.settings.get().linkPresence;
      const packet = {
        t: "ps",
        s: statusOverride ?? this.getOwnStatus(),
        ...includeProfile && config.statusMessage ? { m: config.statusMessage } : {},
        ...includeProfile && config.avatarUrl ? { a: config.avatarUrl } : {},
        u: Date.now(),
        v: this.version
      };
      try {
        this.adapter.broadcastKikiLinkProtocol(JSON.stringify(packet));
      } catch {
      }
    }
    #syncRoom(force) {
      const roomName = this.adapter.isInChatRoom() ? this.adapter.getCurrentRoomName() ?? "?" : "";
      const roomChanged = roomName !== this.#lastRoomName;
      this.#lastRoomName = roomName;
      if (!roomName || !this.settings.get().linkPresence.enabled) return;
      if (force || roomChanged) {
        const query = { t: "pq", i: createId("room").slice(-18), b: 1 };
        this.adapter.broadcastKikiLinkProtocol(JSON.stringify(query));
      }
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
    const normalizedAvatar = "a" in value && typeof value.a === "string" && value.a.length <= 500 ? normalizeImageUrl(value.a) : null;
    const avatar = normalizedAvatar && normalizedAvatar.length <= 500 ? normalizedAvatar : "";
    const requestId = "i" in value && typeof value.i === "string" ? value.i.slice(0, 32) : "";
    return {
      t: "ps",
      ...requestId ? { i: requestId } : {},
      s: value.s,
      ...message ? { m: message } : {},
      ...avatar ? { a: avatar } : {},
      u: value.u,
      v: value.v
    };
  }
  function isPresenceStatus(value) {
    return value === "online" || value === "idle" || value === "dnd" || value === "offline";
  }

  // src/modules/link-reactions/notification-sounds.ts
  var NOTIFICATION_SOUND_LABELS = {
    chime: "Soft chime",
    sparkle: "Sakura sparkle",
    pop: "Gentle pop"
  };
  var NOTIFICATION_SOUND_PATTERNS = {
    chime: [
      { offset: 0, duration: 0.22, frequency: 659.25, gain: 0.055, wave: "sine" },
      { offset: 0.11, duration: 0.32, frequency: 987.77, gain: 0.045, wave: "sine" }
    ],
    sparkle: [
      { offset: 0, duration: 0.13, frequency: 523.25, gain: 0.04, wave: "triangle" },
      { offset: 0.08, duration: 0.15, frequency: 659.25, gain: 0.045, wave: "triangle" },
      { offset: 0.16, duration: 0.2, frequency: 1046.5, gain: 0.04, wave: "sine" }
    ],
    pop: [
      {
        offset: 0,
        duration: 0.11,
        frequency: 330,
        endFrequency: 190,
        gain: 0.06,
        wave: "sine"
      },
      {
        offset: 0.13,
        duration: 0.09,
        frequency: 280,
        endFrequency: 170,
        gain: 0.045,
        wave: "sine"
      }
    ]
  };
  var SOUND_THROTTLE_MS = 350;
  var NotificationSoundService = class {
    constructor(resolveCustomSound) {
      this.resolveCustomSound = resolveCustomSound;
    }
    resolveCustomSound;
    #context;
    #lastPlayedAt = Number.NEGATIVE_INFINITY;
    #customBuffers = /* @__PURE__ */ new Map();
    async unlock() {
      const context = this.#getContext();
      if (!context) return false;
      try {
        if (context.state === "suspended") await context.resume();
        return context.state !== "closed";
      } catch {
        return false;
      }
    }
    async play(choice, nowOrOptions = {}) {
      const options = typeof nowOrOptions === "number" ? { now: nowOrOptions } : nowOrOptions;
      const now = options.now ?? Date.now();
      const volume = normalizedVolume(options.volume);
      if (now - this.#lastPlayedAt < SOUND_THROTTLE_MS) return false;
      if (volume === 0) return false;
      if (!isPreset(choice)) return this.#playCustom(choice.slice("custom:".length), volume, now);
      if (!await this.unlock()) return false;
      const context = this.#context;
      if (!context) return false;
      try {
        const startAt = context.currentTime + 0.01;
        for (const note of NOTIFICATION_SOUND_PATTERNS[choice]) {
          scheduleNote(context, startAt, note, volume / 100);
        }
        this.#lastPlayedAt = now;
        return true;
      } catch {
        return false;
      }
    }
    async destroy() {
      const context = this.#context;
      this.#context = void 0;
      this.#customBuffers.clear();
      if (context && context.state !== "closed") {
        try {
          await context.close();
        } catch {
        }
      }
    }
    #getContext() {
      if (this.#context && this.#context.state !== "closed") return this.#context;
      const scope = globalThis;
      const Constructor = globalThis.AudioContext ?? scope.webkitAudioContext;
      if (!Constructor) return void 0;
      try {
        this.#context = new Constructor();
        return this.#context;
      } catch {
        return void 0;
      }
    }
    async #playCustom(id, volume, now) {
      if (!this.resolveCustomSound || !await this.unlock()) return false;
      const context = this.#context;
      if (!context || typeof context.decodeAudioData !== "function") return false;
      try {
        const buffer = await this.#customBuffer(id, context);
        if (!buffer) return false;
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        gain.gain.setValueAtTime(volume / 100, context.currentTime);
        source.connect(gain);
        gain.connect(context.destination);
        source.start(context.currentTime + 0.01);
        this.#lastPlayedAt = now;
        return true;
      } catch {
        return false;
      }
    }
    #customBuffer(id, context) {
      let pending = this.#customBuffers.get(id);
      if (!pending) {
        pending = this.resolveCustomSound(id).then(
          async (blob) => blob ? context.decodeAudioData(await blob.arrayBuffer()) : void 0
        ).catch(() => void 0);
        this.#customBuffers.set(id, pending);
      }
      return pending;
    }
  };
  function scheduleNote(context, startAt, note, volume) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = startAt + note.offset;
    const end = start + note.duration;
    oscillator.type = note.wave;
    oscillator.frequency.setValueAtTime(note.frequency, start);
    if (note.endFrequency !== void 0) {
      oscillator.frequency.exponentialRampToValueAtTime(note.endFrequency, end);
    }
    gain.gain.setValueAtTime(1e-4, start);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(1e-4, note.gain * volume),
      start + Math.min(0.018, note.duration / 3)
    );
    gain.gain.exponentialRampToValueAtTime(1e-4, end);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }
  function normalizedVolume(value) {
    if (value === void 0) return 100;
    if (!Number.isFinite(value)) return 100;
    return Math.min(100, Math.max(0, value));
  }
  function isPreset(value) {
    return value === "chime" || value === "sparkle" || value === "pop";
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
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.kl-panel[data-dragging="true"] .kl-brand { cursor: grabbing; }

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
.kl-inline-actions { display: flex; flex: 0 0 auto; align-items: center; gap: 7px; flex-wrap: wrap; justify-content: flex-end; }
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
:host([data-density="super-compact"]) .kl-message-row[data-group="start"],
:host([data-density="super-compact"]) .kl-message-row[data-group="middle"] { margin-bottom: 2px; }
:host([data-density="super-compact"]) .kl-message-row[data-group="middle"],
:host([data-density="super-compact"]) .kl-message-row[data-group="end"] { margin-top: 2px; }
:host([data-density="super-compact"]) .kl-message-row[data-direction="incoming"][data-group="start"] .kl-message-bubble { border-radius: 12px 12px 12px 8px; }
:host([data-density="super-compact"]) .kl-message-row[data-direction="incoming"][data-group="middle"] .kl-message-bubble { border-radius: 8px 12px 12px 8px; }
:host([data-density="super-compact"]) .kl-message-row[data-direction="incoming"][data-group="end"] .kl-message-bubble { border-radius: 8px 12px 12px 4px; }
:host([data-density="super-compact"]) .kl-message-row[data-direction="outgoing"][data-group="start"] .kl-message-bubble { border-radius: 12px 12px 8px 12px; }
:host([data-density="super-compact"]) .kl-message-row[data-direction="outgoing"][data-group="middle"] .kl-message-bubble { border-radius: 12px 8px 8px 12px; }
:host([data-density="super-compact"]) .kl-message-row[data-direction="outgoing"][data-group="end"] .kl-message-bubble { border-radius: 12px 8px 4px 12px; }
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
:host([data-density="super-compact"]) .kl-action-template { height: 35px; }
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
.kl-sidebar-heading-actions { display: flex; align-items: center; gap: 6px; }
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
.kl-sidebar-gallery {
  width: auto;
  grid-auto-flow: column;
  gap: 6px;
  padding-inline: 9px;
  color: var(--kl-gold);
  font-size: var(--kl-type-xs);
  font-weight: 820;
}
.kl-sidebar-gallery .kl-icon { width: 16px; height: 16px; }
.kl-search,
.kl-composer-input,
.kl-number-input,
.kl-select,
.kl-action-label,
.kl-action-template,
.kl-reaction-input,
.kl-reaction-name,
.kl-reaction-template,
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
.kl-reaction-input:focus,
.kl-reaction-name:focus,
.kl-reaction-template:focus,
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
  position: relative;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px solid var(--kl-border);
  border-radius: 15px;
  background: var(--kl-avatar-bg);
  overflow: hidden;
  font-weight: 850;
  text-transform: uppercase;
}
.kl-avatar img { width: 100%; height: 100%; display: block; object-fit: cover; }

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
  scroll-behavior: auto;
  overscroll-behavior: contain;
  overflow-anchor: none;
  scrollbar-gutter: stable;
  contain: paint;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
}

.kl-message-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0;
}
.kl-message-row[data-group="start"],
.kl-message-row[data-group="middle"] { margin-bottom: 2px; }
.kl-message-row[data-group="middle"],
.kl-message-row[data-group="end"] { margin-top: 2px; }
.kl-message-row[data-direction="outgoing"] { flex-direction: row-reverse; }
.kl-message-bubble {
  position: relative;
  max-width: min(72%, 540px);
  padding: 10px 13px 8px;
  border: 1px solid color-mix(in srgb, var(--kl-border), var(--kl-accent) 9%);
  border-radius: 17px 17px 17px 5px;
  background: color-mix(in srgb, var(--kl-surface-2), var(--kl-surface) 18%);
  overflow: hidden;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.kl-message-bubble[data-media="true"] { width: min(88%, 720px); max-width: 720px; }
.kl-message-bubble::before {
  content: "";
  position: absolute;
  top: 0;
  right: 13px;
  left: 13px;
  height: 1px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, var(--kl-accent), transparent);
  opacity: 0.24;
  pointer-events: none;
}
.kl-message-row[data-direction="outgoing"] .kl-message-bubble {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 28%);
  border-radius: 17px 17px 5px 17px;
  background: color-mix(in srgb, var(--kl-accent), #070708 16%);
  color: var(--kl-accent-foreground);
}
.kl-message-row[data-direction="outgoing"] .kl-message-bubble::before {
  background: linear-gradient(90deg, transparent, var(--kl-gold), transparent);
  opacity: 0.2;
}
.kl-message-row[data-direction="incoming"][data-group="start"] .kl-message-bubble { border-radius: 17px 17px 17px 9px; }
.kl-message-row[data-direction="incoming"][data-group="middle"] .kl-message-bubble { border-radius: 9px 17px 17px 9px; }
.kl-message-row[data-direction="incoming"][data-group="end"] .kl-message-bubble { border-radius: 9px 17px 17px 5px; }
.kl-message-row[data-direction="outgoing"][data-group="start"] .kl-message-bubble { border-radius: 17px 17px 9px 17px; }
.kl-message-row[data-direction="outgoing"][data-group="middle"] .kl-message-bubble { border-radius: 17px 9px 9px 17px; }
.kl-message-row[data-direction="outgoing"][data-group="end"] .kl-message-bubble { border-radius: 17px 9px 5px 17px; }
.kl-message-row:hover .kl-message-bubble { border-color: color-mix(in srgb, var(--kl-border-strong), var(--kl-accent) 18%); }
.kl-message-meta { display: flex; justify-content: flex-end; gap: 7px; margin-top: 6px; color: var(--kl-meta); font-size: var(--kl-type-xxs); font-weight: 650; letter-spacing: 0.015em; }
.kl-message-row[data-direction="outgoing"] .kl-message-meta { color: color-mix(in srgb, var(--kl-accent-foreground), transparent 32%); }
.kl-message-room { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-load-older { display: flex; justify-content: center; padding: 3px 0 11px; overflow-anchor: none; }
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
  grid-template-rows: auto minmax(0, 1fr) auto;
  border: 1px solid var(--kl-border);
  border-radius: 20px;
  background: var(--kl-panel-art), var(--kl-panel-bg);
  color: var(--kl-text);
  box-shadow: var(--kl-shadow);
}
.kl-dialog[open] { display: grid; }
.kl-dialog::backdrop { background: rgba(0, 0, 0, 0.68); }
.kl-dialog-header { display: flex; align-items: center; gap: 10px; padding: 16px 18px; border-bottom: 1px solid var(--kl-border); background: var(--kl-topbar-bg); }
.kl-dialog-heading { min-width: 0; margin-right: auto; }
.kl-dialog-title { margin-right: auto; font-family: Georgia, "Times New Roman", serif; font-size: var(--kl-type-lg); font-weight: 700; }
.kl-dialog-subtitle { margin-top: 2px; color: var(--kl-muted); font-size: var(--kl-type-xs); letter-spacing: 0.035em; }
.kl-dialog-body { min-height: 0; display: grid; gap: 18px; padding: 18px; overflow: auto; }
.kl-setting-section { display: grid; gap: 14px; }
.kl-setting-section + .kl-setting-section { padding-top: 17px; border-top: 1px solid var(--kl-border); }
.kl-setting-section-title { color: var(--kl-gold); font-size: var(--kl-type-xs); font-weight: 850; letter-spacing: 0.14em; text-transform: uppercase; }
.kl-setting-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.kl-setting-copy { min-width: 0; }
.kl-setting-name { font-weight: 750; }
.kl-setting-help { margin-top: 2px; color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-image-upload-settings-options {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--kl-border);
  border-radius: 13px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 24%);
}
.kl-image-upload-setting-field { min-width: 0; display: grid; gap: 5px; color: var(--kl-muted); font-size: var(--kl-type-xs); font-weight: 750; }
.kl-image-upload-setting-input { width: 100%; min-width: 0; }
.kl-image-upload-privacy { display: flex; align-items: flex-start; gap: 8px; margin: 1px 0 0; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-room-badge-offsets { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 0 0 12px; }
.kl-room-badge-offsets .kl-text-button { grid-column: 1 / -1; justify-self: start; }
.kl-room-badge-advanced[data-disabled="true"] { opacity: 0.52; }
.kl-image-upload-privacy .kl-icon { width: 16px; height: 16px; flex: 0 0 auto; margin-top: 1px; color: var(--kl-gold); }
.kl-inline-link { color: var(--kl-gold); text-underline-offset: 2px; }
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
.kl-dialog-actions { position: relative; z-index: 1; display: flex; flex: 0 0 auto; justify-content: flex-end; gap: 9px; padding: 12px 18px 18px; border-top: 1px solid var(--kl-border); background: var(--kl-panel-bg); }

.kl-action-editor { display: grid; gap: 8px; }
.kl-action-editor-row { display: grid; grid-template-columns: 100px minmax(0, 1fr) 40px; gap: 7px; align-items: center; }
.kl-action-label,
.kl-action-template { width: 100%; height: 40px; min-width: 0; padding: 0 9px; border-radius: 10px; }
.kl-remove-action { width: 40px; height: 40px; color: var(--kl-danger); }
.kl-add-action { justify-self: start; }
.kl-settings-disclosure { overflow: clip; border: 1px solid var(--kl-border); border-radius: 13px; background: color-mix(in srgb, var(--kl-surface-2), transparent 30%); }
.kl-settings-disclosure > summary { min-height: 48px; display: flex; align-items: center; gap: 10px; padding: 9px 12px; color: var(--kl-text); font-weight: 780; cursor: pointer; list-style: none; }
.kl-settings-disclosure > summary::-webkit-details-marker { display: none; }
.kl-settings-disclosure > summary::before { content: ""; width: 8px; height: 8px; flex: 0 0 auto; border-right: 2px solid var(--kl-muted); border-bottom: 2px solid var(--kl-muted); transform: rotate(-45deg); transition: transform 140ms ease; }
.kl-settings-disclosure[open] > summary::before { transform: rotate(45deg); }
.kl-settings-disclosure > summary:hover { background: var(--kl-surface-hover); }
.kl-settings-disclosure > summary:focus-visible { outline: 2px solid color-mix(in srgb, var(--kl-accent), var(--kl-gold) 24%); outline-offset: -2px; }
.kl-disclosure-meta { margin-left: auto; color: var(--kl-meta); font-size: var(--kl-type-xs); font-weight: 650; }
.kl-settings-disclosure > summary .kl-data-tools-count { display: inline; margin: 0 0 0 auto; }
.kl-sound-choices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 0 12px 12px; border-top: 1px solid var(--kl-border); }
.kl-sound-choice { min-width: 0; display: grid; gap: 6px; padding-top: 11px; }
.kl-sound-choice-controls { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; }
.kl-sound-choice .kl-select { width: 100%; min-width: 0; }
.kl-sound-preview { min-width: 58px; padding-inline: 10px; }
.kl-volume-control { min-width: 210px; display: grid; grid-template-columns: minmax(120px, 1fr) 48px; align-items: center; gap: 10px; }
.kl-volume-input { width: 100%; accent-color: var(--kl-accent); cursor: pointer; }
.kl-volume-value { color: var(--kl-gold); font-variant-numeric: tabular-nums; font-weight: 800; text-align: right; }
.kl-custom-sounds-body { display: grid; gap: 10px; padding: 12px; border-top: 1px solid var(--kl-border); }
.kl-custom-sound-list { display: grid; gap: 7px; }
.kl-custom-sound { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 8px; padding: 9px; border: 1px solid var(--kl-border); border-radius: 12px; background: var(--kl-surface-1); }
.kl-custom-sound-copy { min-width: 0; display: grid; gap: 2px; }
.kl-custom-sound-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-custom-sound-copy span,
.kl-custom-sound-empty { color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-reaction-advanced-content { display: grid; gap: 16px; padding: 12px; border-top: 1px solid var(--kl-border); }
.kl-reaction-safety { display: flex; align-items: flex-start; gap: 9px; padding: 11px 12px; border: 1px solid color-mix(in srgb, var(--kl-gold), transparent 68%); border-radius: 12px; background: color-mix(in srgb, var(--kl-gold), transparent 92%); color: var(--kl-muted); font-size: var(--kl-type-sm); line-height: 1.45; }
.kl-reaction-safety-icon { width: 18px; height: 18px; flex: 0 0 auto; margin-top: 1px; color: var(--kl-gold); }
.kl-reaction-rules-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.kl-reaction-rules-heading .kl-data-tools-count { margin-top: 0; }
.kl-reaction-rules-editor { display: grid; gap: 10px; }
.kl-reaction-rule { display: grid; gap: 10px; padding: 11px; border: 1px solid var(--kl-border); border-radius: 13px; background: color-mix(in srgb, var(--kl-surface-2), transparent 24%); }
.kl-reaction-rule-header { min-width: 0; display: grid; grid-template-columns: auto minmax(120px, 1fr) auto; gap: 8px; align-items: center; }
.kl-reaction-rule-enabled { min-height: 40px; display: inline-flex; align-items: center; gap: 6px; padding: 0 9px; border: 1px solid var(--kl-border); border-radius: 10px; background: var(--kl-input-bg); color: var(--kl-muted); font-size: var(--kl-type-sm); font-weight: 750; cursor: pointer; }
.kl-reaction-rule-enabled:has(input:checked) { border-color: color-mix(in srgb, var(--kl-accent), transparent 45%); background: color-mix(in srgb, var(--kl-accent), transparent 88%); color: var(--kl-text); }
.kl-reaction-rule-enabled input { accent-color: var(--kl-accent); }
.kl-reaction-name,
.kl-reaction-input { width: 100%; min-width: 0; height: 40px; padding: 0 9px; border-radius: 10px; }
.kl-reaction-rule-order { display: flex; gap: 4px; }
.kl-reaction-move { width: 36px; height: 40px; font-size: 17px; font-weight: 850; }
.kl-reaction-move--up .kl-icon { transform: rotate(90deg); }
.kl-reaction-move--down .kl-icon { transform: rotate(-90deg); }
.kl-reaction-rule-grid { min-width: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.kl-reaction-field { min-width: 0; display: grid; align-content: start; gap: 4px; }
.kl-reaction-field-label { color: var(--kl-meta); font-size: var(--kl-type-xs); font-weight: 720; }
.kl-reaction-field .kl-select,
.kl-reaction-field .kl-number-input { width: 100%; height: 40px; }
.kl-reaction-field[data-disabled] { opacity: 0.48; }
.kl-reaction-template-field { grid-column: 1 / -1; }
.kl-reaction-template { width: 100%; min-height: 58px; resize: vertical; padding: 8px 9px; border-radius: 10px; line-height: 1.35; }
.kl-reaction-rule-note { color: var(--kl-meta); font-size: var(--kl-type-xs); line-height: 1.4; }
.kl-reaction-rule-note[data-public="true"] { color: color-mix(in srgb, var(--kl-gold), var(--kl-text) 25%); }

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
.kl-roster-entry-name-row { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 6px; min-width: 0; }
.kl-roster-entry-name { overflow: hidden; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.kl-roster-entry-badges,
.kl-roster-detail-badges { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.kl-roster-entry-badges { flex: 0 1 auto; }
.kl-roster-detail-badges { margin-top: 4px; }
.kl-roster-badge {
  padding: 1px 4px;
  border-radius: 999px;
  font-size: var(--kl-type-xxs);
  font-weight: 900;
  letter-spacing: 0.08em;
}
.kl-roster-live { background: rgba(104, 211, 145, 0.14); color: #68d391; }
.kl-roster-friend { background: color-mix(in srgb, var(--kl-gold), transparent 84%); color: var(--kl-gold); }
.kl-roster-relationship--owner { background: color-mix(in srgb, #c795ff, transparent 82%); color: #d7b4ff; }
.kl-roster-relationship--lover { background: color-mix(in srgb, #ff78ae, transparent 82%); color: #ff9fc4; }
.kl-roster-relationship--whitelist { background: color-mix(in srgb, #69b8ff, transparent 83%); color: #8bc9ff; }
.kl-roster-relationship--blacklist,
.kl-roster-relationship--ghosted { background: color-mix(in srgb, var(--kl-danger), transparent 84%); color: #ff8d98; }
.kl-roster-relationship--ghosted { opacity: 0.82; }
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

/* Custom Activities: simple library first, focused body-slot editor second. */
.kl-custom-activity-header .kl-text-button { flex: 0 0 auto; }
.kl-custom-activities-body {
  min-width: 0;
  min-height: 0;
  padding: 18px 22px 24px;
  overflow-y: auto;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-custom-activity-empty {
  min-height: 330px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 10px;
  padding: 34px;
  border: 1px dashed var(--kl-border-strong);
  border-radius: 20px;
  background:
    radial-gradient(circle at 50% 28%, color-mix(in srgb, var(--kl-accent), transparent 88%), transparent 38%),
    color-mix(in srgb, var(--kl-surface), transparent 22%);
  text-align: center;
}
.kl-custom-activity-empty h2 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: 22px; }
.kl-custom-activity-empty p { max-width: 430px; margin: 0 0 7px; color: var(--kl-muted); font-size: var(--kl-type-body); }
.kl-custom-empty-blossom {
  width: 72px;
  height: 72px;
  opacity: 0.88;
  filter: drop-shadow(0 10px 24px color-mix(in srgb, var(--kl-accent), transparent 62%));
}
.kl-custom-activity-intro {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 11px;
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
}
.kl-custom-activity-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.kl-custom-activity-card {
  min-width: 0;
  min-height: 100px;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px 10px 10px;
  border: 1px solid var(--kl-border);
  border-radius: 16px;
  background: linear-gradient(145deg, color-mix(in srgb, var(--kl-surface-2), transparent 4%), var(--kl-surface));
  color: var(--kl-text);
  text-align: left;
  cursor: pointer;
  transition: border-color 140ms ease, transform 140ms ease, background 140ms ease;
}
.kl-custom-activity-card:hover {
  border-color: var(--kl-border-strong);
  background: var(--kl-surface-hover);
  transform: translateY(-1px);
}
.kl-custom-activity-card-icon {
  position: relative;
  width: 72px;
  height: 72px;
  overflow: hidden;
  border: 1px solid var(--kl-border);
  border-radius: 14px;
  background: var(--kl-input-bg);
}
.kl-custom-activity-vanilla-icon { width: 100%; height: 100%; display: block; object-fit: cover; }
.kl-custom-activity-blossom {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 19px;
  height: 19px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.75));
}
.kl-custom-activity-card-copy { min-width: 0; }
.kl-custom-activity-card-name { overflow: hidden; font-size: var(--kl-type-md); font-weight: 850; text-overflow: ellipsis; white-space: nowrap; }
.kl-custom-activity-card-meta { margin-top: 2px; color: var(--kl-gold); font-size: var(--kl-type-xs); }
.kl-custom-activity-card-template { margin-top: 6px; overflow: hidden; color: var(--kl-muted); font-size: var(--kl-type-sm); text-overflow: ellipsis; white-space: nowrap; }
.kl-custom-activity-edit-label { color: var(--kl-meta); font-size: var(--kl-type-xs); font-weight: 800; }

.kl-custom-activity-editor {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  grid-row: 2 / -1;
}
.kl-custom-editor-body {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(230px, 0.72fr) minmax(390px, 1.28fr);
  gap: 16px;
  padding: 16px 20px;
  overflow: hidden;
}
.kl-custom-character-pane,
.kl-custom-activity-form {
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--kl-border);
  border-radius: 17px;
  background: color-mix(in srgb, var(--kl-surface), transparent 12%);
}
.kl-custom-character-pane {
  display: grid;
  grid-template-rows: auto auto auto minmax(190px, 1fr) auto;
  align-content: start;
  gap: 7px;
  padding: 14px;
  overflow-y: auto;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-custom-character-stage {
  position: relative;
  min-height: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--kl-border);
  border-radius: 14px;
  background:
    radial-gradient(ellipse at 50% 42%, color-mix(in srgb, var(--kl-gold), transparent 93%), transparent 62%),
    var(--kl-input-bg);
}
.kl-custom-character-canvas {
  width: auto;
  height: min(100%, 390px);
  max-width: 100%;
  display: block;
  cursor: crosshair;
  touch-action: manipulation;
}
.kl-custom-character-canvas:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: -2px; }
.kl-custom-character-fallback {
  position: absolute;
  inset: auto 16px 16px;
  padding: 8px;
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.62);
  color: #eee5d9;
  font-size: var(--kl-type-xs);
  text-align: center;
  pointer-events: none;
}
.kl-custom-slot-select[hidden] { display: none; }
.kl-custom-slot-picker {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--kl-border);
  border-radius: 11px;
  background: var(--kl-surface-2);
}
.kl-custom-slot-picker > summary {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 10px;
  color: var(--kl-text);
  cursor: pointer;
  list-style: none;
}
.kl-custom-slot-picker > summary::-webkit-details-marker { display: none; }
.kl-custom-slot-picker > summary:hover { background: var(--kl-surface-hover); }
.kl-custom-slot-picker[open] > summary { border-bottom: 1px solid var(--kl-border); }
.kl-custom-slot-current {
  min-width: 0;
  overflow: hidden;
  font-size: var(--kl-type-sm);
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-custom-slot-action {
  flex: 0 0 auto;
  color: var(--kl-gold);
  font-size: var(--kl-type-xxs);
  font-weight: 850;
  text-transform: uppercase;
}
.kl-custom-slot-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  max-height: 154px;
  padding: 6px;
  overflow-y: auto;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-custom-slot-choice {
  min-width: 0;
  min-height: 31px;
  padding: 4px 6px;
  overflow: hidden;
  border: 1px solid var(--kl-border);
  border-radius: 9px;
  background: var(--kl-surface-2);
  color: var(--kl-muted);
  font-size: var(--kl-type-xxs);
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
.kl-custom-slot-choice:hover { border-color: var(--kl-border-strong); color: var(--kl-text); }
.kl-custom-slot-choice[data-selected="true"] {
  border-color: var(--kl-accent);
  background: color-mix(in srgb, var(--kl-accent), transparent 84%);
  color: var(--kl-text);
  box-shadow: inset 0 -2px var(--kl-accent);
}
.kl-custom-slot-choice:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 1px; }
.kl-custom-slot-note { color: var(--kl-meta); font-size: var(--kl-type-xxs); text-align: center; }
.kl-custom-activity-form {
  display: grid;
  align-content: start;
  gap: 15px;
  padding: 16px;
  overflow-y: auto;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-custom-field { min-width: 0; display: grid; gap: 6px; }
.kl-custom-field-label { color: var(--kl-text); font-size: var(--kl-type-sm); font-weight: 850; }
.kl-custom-field-help { color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-custom-activity-name,
.kl-custom-image-search { width: 100%; }
.kl-custom-activity-template {
  width: 100%;
  min-height: 86px;
  padding: 10px 12px;
  border: 1px solid var(--kl-border);
  border-radius: 12px;
  background: var(--kl-input-bg);
  color: var(--kl-text);
  resize: vertical;
  line-height: 1.45;
}
.kl-custom-activity-template:focus { border-color: var(--kl-accent); outline: 0; box-shadow: 0 0 0 3px color-mix(in srgb, var(--kl-accent), transparent 80%); }
.kl-custom-token-row { display: flex; flex-wrap: wrap; gap: 6px; }
.kl-custom-token {
  min-height: 28px;
  padding: 4px 9px;
  border: 1px solid var(--kl-border);
  border-radius: 999px;
  background: var(--kl-surface-2);
  color: var(--kl-gold);
  font-size: var(--kl-type-xs);
  font-weight: 800;
  cursor: pointer;
}
.kl-custom-token:hover { border-color: var(--kl-border-strong); background: var(--kl-surface-hover); }
.kl-custom-preview-wrap { display: grid; gap: 6px; }
.kl-custom-activity-live-preview {
  min-height: 46px;
  padding: 11px 13px;
  border: 1px solid color-mix(in srgb, var(--kl-accent), var(--kl-border) 60%);
  border-radius: 12px;
  background: color-mix(in srgb, var(--kl-accent), transparent 91%);
  overflow-wrap: anywhere;
  color: var(--kl-text);
  font-style: italic;
}
.kl-custom-image-gallery {
  max-height: 210px;
  display: grid;
  grid-template-columns: repeat(4, minmax(74px, 1fr));
  gap: 7px;
  padding: 5px;
  overflow-y: auto;
  border: 1px solid var(--kl-border);
  border-radius: 13px;
  background: var(--kl-input-bg);
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-custom-image-choice {
  min-width: 0;
  padding: 5px;
  display: grid;
  gap: 4px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--kl-muted);
  font-size: var(--kl-type-xxs);
  cursor: pointer;
}
.kl-custom-image-choice[hidden] { display: none; }
.kl-custom-image-choice:hover { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-custom-image-choice[data-selected="true"] {
  border-color: var(--kl-accent);
  background: color-mix(in srgb, var(--kl-accent), transparent 86%);
  color: var(--kl-text);
}
.kl-custom-image-choice img { width: 100%; aspect-ratio: 1; display: block; border-radius: 7px; object-fit: cover; }
.kl-custom-image-choice span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-custom-arousal-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 14px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--kl-border);
  border-radius: 13px;
  background: var(--kl-surface-2);
}
.kl-custom-arousal-copy { min-width: 0; display: grid; gap: 3px; }
.kl-custom-arousal-options { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(0, 1fr) 42px; gap: 10px; align-items: center; }
.kl-custom-arousal-range { width: 100%; accent-color: var(--kl-accent); }
.kl-custom-arousal-value { color: var(--kl-gold); font-size: var(--kl-type-sm); font-weight: 850; text-align: right; }
.kl-custom-activity-advanced {
  padding: 0 12px;
  border: 1px solid var(--kl-border);
  border-radius: 13px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 20%);
}
.kl-custom-activity-advanced summary { padding: 11px 0; color: var(--kl-muted); font-size: var(--kl-type-sm); font-weight: 800; cursor: pointer; }
.kl-custom-activity-advanced[open] { padding-bottom: 12px; }
.kl-custom-target-mode { width: 100%; }
.kl-custom-activity-footer { min-height: 62px; }
.kl-custom-editor-spacer { margin-right: auto; }

@media (max-width: 720px) {
  .kl-custom-activity-list { grid-template-columns: minmax(0, 1fr); }
  .kl-custom-activity-intro span:last-child { display: none; }
  .kl-custom-editor-body {
    display: block;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    -webkit-overflow-scrolling: touch;
  }
  .kl-custom-character-pane {
    grid-template-rows: auto auto auto 380px auto;
    margin-bottom: 12px;
    overflow: visible;
  }
  .kl-custom-slot-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    max-height: 206px;
  }
  .kl-custom-slot-choice { min-height: 44px; padding-inline: 8px; font-size: var(--kl-type-xs); }
  .kl-custom-activity-form { overflow: visible; }
  .kl-custom-image-gallery {
    max-height: none;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
  }
  .kl-custom-image-choice { flex: 0 0 88px; scroll-snap-align: start; }
  .kl-custom-activity-footer { gap: 6px; }
  .kl-custom-activity-footer .kl-text-button {
    min-width: 0;
    flex: 1 1 0;
    padding-inline: 8px;
  }
  .kl-custom-editor-spacer { display: none; }
}

@media (max-width: 420px) {
  .kl-custom-activity-header { align-items: flex-start; }
  .kl-custom-activity-header .kl-feature-page-subtitle { display: none; }
  .kl-custom-activities-body { padding: 12px; }
  .kl-custom-activity-card { grid-template-columns: 62px minmax(0, 1fr); }
  .kl-custom-activity-card-icon { width: 62px; height: 62px; }
  .kl-custom-activity-edit-label { display: none; }
  .kl-custom-editor-body { padding: 10px; }
  .kl-custom-character-pane { grid-template-rows: auto auto auto 360px auto; padding: 12px; }
}

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
.kl-toast.kl-toast--floating {
  position: fixed;
  z-index: 2147483001;
  bottom: max(90px, calc(env(safe-area-inset-bottom) + 78px));
}
.kl-toast--floating[data-side="right"] { right: max(20px, env(safe-area-inset-right)); }
.kl-toast--floating[data-side="left"] { right: auto; left: max(20px, env(safe-area-inset-left)); }
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
  .kl-brand { cursor: default; touch-action: auto; }

  .kl-shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) 64px;
  }
  .kl-workspace { grid-row: 1; }
  .kl-feature-nav {
    grid-row: 2;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
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
  .kl-sidebar-gallery { width: auto; }
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
  .kl-image-upload-settings-options { grid-template-columns: minmax(0, 1fr); }
  .kl-image-upload-privacy { grid-column: 1; }
  .kl-action-editor-row { grid-template-columns: 82px minmax(0, 1fr) 40px; }
  .kl-reaction-rule-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kl-reaction-template-field { grid-column: 1 / -1; }
  .kl-sound-choices { grid-template-columns: minmax(0, 1fr); }
  .kl-feature-page-header { padding: 14px 16px 13px; }
  .kl-feature-page-footer { min-height: 60px; padding: 8px 12px; }
  .kl-room-grid { grid-template-columns: minmax(0, 1fr); padding: 12px; }
  .kl-gallery-grid { grid-template-columns: minmax(0, 1fr); padding: 12px; }
  .kl-gallery-header-actions { width: 100%; }
  .kl-gallery-header-actions .kl-text-button { flex: 1 1 auto; }
  .kl-room-player { grid-template-columns: 40px minmax(0, 1fr); }
  .kl-room-player-actions { grid-column: 1 / -1; justify-content: flex-start; }
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
  .kl-about-facts { grid-template-columns: minmax(0, 1fr); }
  .kl-about-watermark { right: -20%; width: 90%; }
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
  .kl-setting-action-row { align-items: flex-start; flex-direction: column; }
  .kl-inline-actions { width: 100%; justify-content: flex-start; }
  .kl-select { width: 136px; }
  .kl-action-editor-row { grid-template-columns: 72px minmax(0, 1fr) 40px; }
  .kl-reaction-rule-header { grid-template-columns: auto minmax(0, 1fr); }
  .kl-reaction-rule-order { grid-column: 1 / -1; justify-content: flex-end; }
  .kl-reaction-rule-grid { grid-template-columns: minmax(0, 1fr); }
  .kl-reaction-template-field { grid-column: auto; }
  .kl-sound-choice-controls { grid-template-columns: minmax(0, 1fr) 64px; }
  .kl-settings-local-note { display: none; }
  .kl-settings-panel { padding-inline: 12px; }
  .kl-settings-panel-description { margin-bottom: 16px; }
  .kl-settings-panel-body { gap: 14px; }
  .kl-data-tools { align-items: stretch; flex-direction: column; gap: 10px; }
  .kl-data-tools-actions { width: 100%; }
  .kl-data-tools-actions .kl-text-button { min-width: 0; flex: 1; }
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
.kl-profile-avatar-field { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 12px; align-items: center; }
.kl-profile-avatar-preview { width: 64px; height: 64px; border-radius: 20px; font-size: 20px; }
.kl-presence-avatar-url { width: 100%; }
.kl-afk-reply-options { display: grid; gap: 6px; padding: 12px; border: 1px solid var(--kl-border); border-radius: 13px; background: var(--kl-surface-2); }
.kl-afk-reply-options[data-disabled="true"] { opacity: 0.56; }
.kl-afk-reply-message { min-height: 72px; }
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
  padding: 1px 4px;
  background: color-mix(in srgb, #77716c, transparent 84%);
  color: var(--kl-muted);
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
.kl-image-source-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; padding: 4px; border: 1px solid var(--kl-border); border-radius: 13px; background: var(--kl-surface); }
.kl-image-source-tab { min-height: 38px; padding: 7px 10px; border: 0; border-radius: 9px; background: transparent; color: var(--kl-muted); font: inherit; font-weight: 750; cursor: pointer; }
.kl-image-source-tab[data-active="true"] { background: var(--kl-surface-2); color: var(--kl-text); box-shadow: inset 0 -2px var(--kl-accent); }
.kl-image-source-panel { display: grid; gap: 14px; }
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
.kl-image-compose-preview[data-state="loading"] { border-style: solid; border-color: color-mix(in srgb, var(--kl-gold), transparent 42%); }
.kl-image-compose-icon { width: 30px; height: 30px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 9px; background: var(--kl-surface-2); font-weight: 900; }
.kl-image-compose-preview > span:last-child { min-width: 0; display: grid; gap: 2px; }
.kl-image-compose-preview small { overflow: hidden; color: var(--kl-muted); text-overflow: ellipsis; white-space: nowrap; }
.kl-image-upload-note { margin: -4px 0 0; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-image-file-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.kl-image-file-privacy { display: flex; align-items: flex-start; gap: 7px; }
.kl-image-file-privacy .kl-icon { width: 16px; height: 16px; flex: 0 0 auto; margin-top: 1px; color: var(--kl-gold); }
.kl-local-image-thumbnail { width: 54px; height: 54px; flex: 0 0 auto; object-fit: cover; border-radius: 10px; background: #09090a; }
.kl-message-content { line-height: 1.48; white-space: pre-wrap; }
.kl-message-link { color: #efc56c; text-decoration: underline; text-decoration-color: color-mix(in srgb, currentColor, transparent 48%); text-underline-offset: 2px; }
.kl-message-row[data-direction="outgoing"] .kl-message-link { color: var(--kl-accent-foreground); }
.kl-message-media { display: grid; gap: 7px; margin-top: 8px; }
.kl-message-content[data-media-only="true"] .kl-message-media { margin-top: 0; }
.kl-image-card { width: 100%; min-width: 0; max-width: 720px; margin: 0; overflow: hidden; border: 1px solid color-mix(in srgb, var(--kl-border-strong), transparent 12%); border-radius: 12px; background: var(--kl-surface); color: var(--kl-text); }
.kl-image-preview { min-height: 190px; display: grid; place-items: center; align-content: center; gap: 5px; overflow: hidden; padding: 14px; background: #09090a; color: #d8cec0; text-align: center; }
.kl-image-preview[data-state="loading"] { background: linear-gradient(110deg, #101012 30%, #202024 46%, #101012 62%); background-size: 240% 100%; animation: kl-image-loading 1.4s linear infinite; }
.kl-image-preview[data-state="loaded"] { min-height: 0; display: block; padding: 0; background: #09090a; }
.kl-image-preview img { display: block; width: 100%; height: auto; max-height: none; object-fit: contain; border-radius: 0; }
.kl-image-placeholder-icon { width: 25px; height: 25px; color: var(--kl-gold); }
.kl-image-placeholder-title { font-weight: 800; }
.kl-image-placeholder-help { max-width: 230px; color: #9f978d; font-size: var(--kl-type-xs); }
.kl-image-load { margin-top: 6px; }
.kl-image-caption { display: flex; align-items: center; justify-content: space-between; gap: 9px; padding: 7px 9px; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-image-host { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-image-open { flex: 0 0 auto; color: var(--kl-gold); text-decoration: none; }
.kl-gallery-grid {
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  align-content: start;
  gap: 14px;
  padding: 18px;
  overflow: auto;
}
.kl-gallery-header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.kl-gallery-item { min-width: 0; display: grid; align-content: start; gap: 8px; padding: 10px; border: 1px solid var(--kl-border); border-radius: 16px; background: var(--kl-surface-1); }
.kl-gallery-item .kl-image-card { max-width: none; }
.kl-gallery-meta { min-width: 0; display: flex; justify-content: space-between; gap: 10px; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-gallery-meta strong { color: var(--kl-gold); text-transform: capitalize; }
.kl-gallery-meta span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-gallery-actions { display: flex; flex-wrap: wrap; gap: 7px; }
.kl-gallery-remove { margin-left: auto; }
.kl-gallery-empty { grid-column: 1 / -1; place-self: center; display: grid; justify-items: center; gap: 12px; padding: 32px; color: var(--kl-muted); text-align: center; }

.kl-about-card {
  position: relative;
  isolation: isolate;
  min-height: 390px;
  display: grid;
  align-content: start;
  gap: 22px;
  padding: clamp(20px, 4vw, 34px);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--kl-gold), transparent 55%);
  border-radius: 24px;
  background:
    radial-gradient(circle at 92% 10%, color-mix(in srgb, var(--kl-accent), transparent 82%), transparent 35%),
    linear-gradient(145deg, color-mix(in srgb, var(--kl-surface-2), transparent 8%), var(--kl-surface));
}
.kl-about-watermark {
  position: absolute;
  z-index: -1;
  right: -7%;
  bottom: -19%;
  width: min(430px, 68%);
  opacity: 0.075;
  filter: saturate(0.85);
  pointer-events: none;
  user-select: none;
}
.kl-about-brand { display: flex; align-items: center; gap: 16px; }
.kl-about-emblem { width: 66px; height: 66px; flex: 0 0 auto; }
.kl-about-name {
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(25px, 4vw, 34px);
  font-weight: 750;
  letter-spacing: 0.01em;
}
.kl-about-tagline { margin-top: 2px; color: var(--kl-muted); font-size: var(--kl-type-body); }
.kl-about-creator { display: grid; justify-items: start; gap: 2px; }
.kl-about-label { color: var(--kl-gold); font-size: var(--kl-type-xxs); font-weight: 900; letter-spacing: 0.16em; }
.kl-about-creator strong { font-family: Georgia, "Times New Roman", serif; font-size: var(--kl-type-xl); }
.kl-about-creator-number { color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-about-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; margin: 0; }
.kl-about-fact { min-width: 0; padding: 11px 12px; border: 1px solid var(--kl-border); border-radius: 13px; background: color-mix(in srgb, var(--kl-surface), transparent 14%); }
.kl-about-fact dt { color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-about-fact dd { margin: 2px 0 0; overflow-wrap: anywhere; color: var(--kl-text); font-size: var(--kl-type-sm); font-weight: 800; }
.kl-about-links { display: flex; flex-wrap: wrap; gap: 9px; }
.kl-about-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 12px;
  border: 1px solid var(--kl-border-strong);
  border-radius: 999px;
  background: var(--kl-surface-2);
  color: var(--kl-text);
  font-size: var(--kl-type-sm);
  font-weight: 800;
  text-decoration: none;
}
.kl-about-link:hover { border-color: var(--kl-gold); background: var(--kl-surface-hover); }
.kl-about-link--discord { border-color: color-mix(in srgb, #7289da, var(--kl-border) 42%); }
.kl-about-link-icon { width: 14px; height: 14px; color: var(--kl-gold); }
.kl-about-note { max-width: 620px; margin: 0; color: var(--kl-muted); font-size: var(--kl-type-xs); line-height: 1.55; }
.kl-room-page { grid-template-rows: auto auto minmax(0, 1fr); }
.kl-room-admin-status { padding: 10px 20px; border-bottom: 1px solid var(--kl-border); color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-room-admin-status[data-state="admin"] { color: #68d391; }
.kl-room-admin-status[data-state="readonly"] { color: var(--kl-gold); }
.kl-room-grid { min-height: 0; display: grid; grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr); gap: 16px; padding: 18px; overflow: auto; }
.kl-room-media,
.kl-room-players { min-width: 0; align-content: start; display: grid; gap: 12px; padding: 16px; border: 1px solid var(--kl-border); border-radius: 16px; background: var(--kl-surface-1); }
.kl-room-media h2,
.kl-room-players h2 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: var(--kl-type-lg); }
.kl-room-field { display: grid; gap: 6px; color: var(--kl-muted); font-size: var(--kl-type-sm); font-weight: 750; }
.kl-room-media-note { margin: 0; color: var(--kl-muted); font-size: var(--kl-type-xs); line-height: 1.45; }
.kl-room-player-list { display: grid; gap: 8px; }
.kl-room-player { min-width: 0; display: grid; grid-template-columns: 42px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 9px; border: 1px solid var(--kl-border); border-radius: 13px; background: var(--kl-surface); }
.kl-room-player .kl-avatar { width: 42px; height: 42px; border-radius: 11px; }
.kl-room-player-copy { min-width: 0; display: grid; gap: 2px; }
.kl-room-player-copy > strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-room-player-copy > span { color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-room-player-badges { display: flex; flex-wrap: wrap; gap: 4px; }
.kl-room-player-badges span { padding: 2px 5px; border-radius: 999px; background: color-mix(in srgb, var(--kl-gold), transparent 84%); color: var(--kl-gold); font-size: 9px; font-weight: 900; }
.kl-room-player-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }
.kl-room-player-actions .kl-text-button { min-height: 32px; padding: 4px 7px; font-size: var(--kl-type-xs); }

/* Identity and local time stay visible in the top bar without turning it into another toolbar. */
.kl-local-clock {
  flex: 0 0 auto;
  padding: 3px 7px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 45%);
  color: var(--kl-meta);
  font-size: var(--kl-type-xxs);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
}
.kl-presence-trigger {
  position: relative;
  min-width: 142px;
  max-width: 210px;
  min-height: 42px;
  padding: 4px 25px 4px 5px;
  border-radius: 12px;
}
.kl-presence-trigger-avatar { width: 32px; height: 32px; flex: 0 0 auto; border-radius: 9px; font-size: 12px; }
.kl-presence-trigger-label { min-width: 0; display: grid; gap: 0; text-align: left; line-height: 1.15; }
.kl-presence-trigger-name,
.kl-presence-trigger-status { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-presence-trigger-name { color: var(--kl-text); font-size: var(--kl-type-sm); }
.kl-presence-trigger-status { color: var(--kl-muted); font-size: var(--kl-type-xxs); font-weight: 650; }
.kl-presence-trigger > .kl-presence-dot { position: absolute; right: 9px; top: 50%; margin-top: -4px; }
.kl-presence-note {
  display: inline-flex;
  max-width: min(260px, 46vw);
  margin-left: 4px;
  padding: 2px 7px;
  border: 1px solid var(--kl-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 28%);
  color: var(--kl-muted);
}

/* Room is one primary destination; lobbies and presets remain compact subtools inside it. */
.kl-room-subnav {
  display: flex;
  gap: 4px;
  padding: 7px 18px;
  border-bottom: 1px solid var(--kl-border);
  background: color-mix(in srgb, var(--kl-surface), transparent 30%);
}
.kl-room-subnav-button {
  min-height: 34px;
  padding: 5px 13px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--kl-muted);
  font: inherit;
  font-size: var(--kl-type-sm);
  font-weight: 800;
  cursor: pointer;
}
.kl-room-subnav-button:hover { border-color: var(--kl-border); color: var(--kl-text); }
.kl-room-subnav-button[data-active="true"] { border-color: var(--kl-border-strong); background: var(--kl-surface-2); color: var(--kl-text); box-shadow: inset 0 -2px var(--kl-accent); }
.kl-room-content,
.kl-room-subpanel { min-width: 0; min-height: 0; height: 100%; }
.kl-room-content { overflow: hidden; }
.kl-room-current-panel { display: grid; grid-template-rows: auto minmax(0, 1fr); overflow: hidden; }
.kl-lobbies-panel,
.kl-room-presets-panel { overflow-y: auto; padding: 16px 18px 22px; }
.kl-lobby-toolbar,
.kl-room-preset-create { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.kl-lobby-toolbar h2,
.kl-room-preset-create h2 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: var(--kl-type-lg); }
.kl-lobby-search-wrap { width: min(520px, 60%); display: grid; grid-template-columns: 122px minmax(0, 1fr) 42px; gap: 7px; }
.kl-lobby-refresh { width: 42px; height: 42px; }
.kl-lobby-refresh:disabled .kl-icon { animation: kl-spin 900ms linear infinite; }
.kl-room-directory-status { margin-bottom: 9px; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-room-directory-status[data-state="error"] { color: var(--kl-danger); }
.kl-lobby-list,
.kl-room-preset-list { display: grid; gap: 8px; }
.kl-lobby-card {
  display: grid;
  gap: 6px;
  padding: 11px 12px;
  border: 1px solid var(--kl-border);
  border-radius: 13px;
  background: var(--kl-surface);
}
.kl-lobby-card[data-has-friends="true"] { border-color: color-mix(in srgb, var(--kl-gold), transparent 48%); background: color-mix(in srgb, var(--kl-gold), transparent 95%); }
.kl-lobby-card-main { min-width: 0; display: flex; align-items: center; gap: 8px; }
.kl-lobby-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-lobby-count,
.kl-lobby-friend-label { flex: 0 0 auto; padding: 2px 6px; border-radius: 999px; background: var(--kl-surface-2); color: var(--kl-muted); font-size: var(--kl-type-xxs); font-weight: 800; }
.kl-lobby-friend-label { background: color-mix(in srgb, var(--kl-gold), transparent 84%); color: var(--kl-gold); }
.kl-lobby-description { margin: 0; overflow: hidden; color: var(--kl-muted); font-size: var(--kl-type-xs); text-overflow: ellipsis; white-space: nowrap; }
.kl-lobby-card-footer { min-width: 0; display: flex; align-items: center; gap: 9px; }
.kl-lobby-flags { min-width: 0; margin-right: auto; overflow: hidden; color: var(--kl-meta); font-size: var(--kl-type-xxs); text-overflow: ellipsis; white-space: nowrap; }
.kl-lobby-friends { display: flex; flex: 0 0 auto; align-items: center; padding-left: 6px; }
.kl-lobby-friend-avatar { width: 27px; height: 27px; margin-left: -6px; border: 2px solid var(--kl-panel-bg); border-radius: 9px; font-size: 9px; }
.kl-lobby-friend-more { margin-left: 3px; color: var(--kl-muted); font-size: var(--kl-type-xxs); }
.kl-lobby-join { min-height: 32px; padding: 4px 10px; }
.kl-room-preset-create-actions { width: min(420px, 54%); display: flex; gap: 7px; }
.kl-preset-name { min-width: 0; }
.kl-room-preset-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 12px; border: 1px solid var(--kl-border); border-radius: 13px; background: var(--kl-surface); }
.kl-room-preset-copy { min-width: 0; display: grid; gap: 2px; }
.kl-room-preset-copy > strong,
.kl-room-preset-copy > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-room-preset-copy > span,
.kl-room-preset-copy > small { color: var(--kl-muted); }
.kl-room-preset-actions { display: flex; gap: 6px; }

/* Music keeps the deep lacquer/gold KikiLink language while staying dense enough for a queue. */
.kl-music-page { grid-template-rows: auto minmax(0, 1fr) auto; }
.kl-music-body { min-width: 0; min-height: 0; display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(270px, 0.72fr); gap: 14px; padding: 16px; overflow: hidden; }
.kl-music-library,
.kl-music-add,
.kl-music-now-card { min-width: 0; min-height: 0; display: grid; align-content: start; gap: 10px; padding: 13px; border: 1px solid var(--kl-border); border-radius: 15px; background: var(--kl-surface); }
.kl-music-library { grid-template-rows: auto auto minmax(0, 1fr); }
.kl-music-side { min-width: 0; min-height: 0; display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 12px; overflow-y: auto; }
.kl-music-add { overflow: visible; }
.kl-music-add h2 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: var(--kl-type-lg); }
.kl-music-add label,
.kl-music-playlist-toolbar label,
.kl-music-session-options label { display: grid; gap: 5px; color: var(--kl-muted); font-size: var(--kl-type-xs); font-weight: 800; }
.kl-music-playlist-toolbar { display: grid; grid-template-columns: minmax(170px, 1fr) auto; align-items: end; gap: 9px; }
.kl-music-playlist-toolbar label { min-width: 0; flex: 1 1 auto; }
.kl-music-playlist-actions { display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end; }
.kl-music-playlist-actions .kl-text-button { min-height: 34px; padding: 4px 8px; font-size: var(--kl-type-xxs); }
.kl-music-queue-tools { min-width: 0; display: flex; align-items: center; gap: 10px; }
.kl-music-queue-search-wrap { min-width: 0; flex: 1 1 auto; position: relative; }
.kl-music-queue-search-wrap > .kl-icon { position: absolute; left: 10px; top: 50%; width: 16px; height: 16px; color: var(--kl-meta); transform: translateY(-50%); pointer-events: none; }
.kl-music-queue-search { width: 100%; padding-left: 34px; }
.kl-music-queue-summary { flex: 0 0 auto; color: var(--kl-meta); font-size: var(--kl-type-xxs); font-variant-numeric: tabular-nums; }
.kl-music-add-divider { display: flex; align-items: center; gap: 8px; color: var(--kl-meta); font-size: var(--kl-type-xxs); text-transform: uppercase; }
.kl-music-add-divider::before,
.kl-music-add-divider::after { content: ""; height: 1px; flex: 1 1 auto; background: var(--kl-border); }
.kl-music-add-status { min-height: 18px; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-music-queue { min-height: 0; display: grid; align-content: start; gap: 6px; overflow-y: auto; }
.kl-music-track { display: grid; grid-template-columns: 22px 36px minmax(0, 1fr) 34px; gap: 7px; align-items: center; padding: 7px; border: 1px solid transparent; border-radius: 11px; }
.kl-music-track:hover { border-color: var(--kl-border); background: var(--kl-surface-2); }
.kl-music-track[data-active="true"] { border-color: color-mix(in srgb, var(--kl-accent), transparent 48%); background: color-mix(in srgb, var(--kl-accent), transparent 91%); }
.kl-music-track-number { color: var(--kl-meta); font-size: var(--kl-type-xs); text-align: center; }
.kl-music-track-play,
.kl-music-track-menu > summary { width: 34px; height: 34px; border-radius: 9px; }
.kl-music-track-copy { min-width: 0; display: grid; gap: 1px; }
.kl-music-track-copy strong,
.kl-music-track-copy span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-music-track-copy span { color: var(--kl-muted); font-size: var(--kl-type-xxs); }
.kl-music-track-menu { position: relative; color: var(--kl-muted); }
.kl-music-track-menu > summary { display: grid; place-items: center; list-style: none; cursor: pointer; }
.kl-music-track-menu > summary::-webkit-details-marker { display: none; }
.kl-music-track-menu-popover { position: absolute; z-index: 12; right: 0; top: calc(100% + 4px); width: 142px; display: grid; gap: 2px; padding: 5px; border: 1px solid var(--kl-border-strong); border-radius: 11px; background: var(--kl-panel-bg); box-shadow: 0 12px 30px rgba(0, 0, 0, .28); }
.kl-music-track-menu-popover button,
.kl-music-track-menu-popover a { min-height: 31px; display: flex; align-items: center; padding: 5px 8px; border: 0; border-radius: 7px; background: transparent; color: var(--kl-text); font: inherit; font-size: var(--kl-type-xs); text-align: left; text-decoration: none; cursor: pointer; }
.kl-music-track-menu-popover button:hover,
.kl-music-track-menu-popover a:hover { background: var(--kl-surface-2); color: var(--kl-gold); }
.kl-music-track-menu-popover .kl-music-track-delete { color: var(--kl-danger); }
.kl-music-now-card { position: relative; justify-items: center; overflow: hidden; padding: 17px; background: radial-gradient(circle at 50% 36%, color-mix(in srgb, var(--kl-accent), transparent 76%), transparent 43%), linear-gradient(145deg, color-mix(in srgb, var(--kl-surface), #090708 16%), var(--kl-surface)); }
.kl-music-now-card::before { content: "\u7D46"; position: absolute; right: 7px; top: -17px; color: color-mix(in srgb, var(--kl-gold), transparent 93%); font: 700 86px/1 Georgia, serif; pointer-events: none; }
.kl-music-now-eyebrow { position: relative; z-index: 1; color: var(--kl-gold); font-size: var(--kl-type-xxs); font-weight: 900; letter-spacing: .17em; }
.kl-music-artwork { position: relative; width: 112px; height: 112px; display: grid; place-items: center; border: 1px solid color-mix(in srgb, var(--kl-gold), transparent 46%); border-radius: 50%; background: repeating-radial-gradient(circle, #171316 0 3px, #0e0c0d 4px 6px); box-shadow: 0 14px 28px rgba(0, 0, 0, .32), inset 0 0 0 8px rgba(0, 0, 0, .24); }
.kl-music-artwork[data-playing="true"] { animation: kl-music-turntable 8s linear infinite; }
.kl-music-artwork-ring { position: absolute; inset: 15px; border: 1px solid color-mix(in srgb, var(--kl-gold), transparent 65%); border-radius: 50%; }
.kl-music-artwork-center { width: 42px; height: 42px; display: grid; place-items: center; border: 2px solid color-mix(in srgb, var(--kl-gold), transparent 24%); border-radius: 50%; background: var(--kl-accent); color: var(--kl-accent-foreground); }
.kl-music-artwork-center .kl-icon { width: 21px; height: 21px; }
.kl-music-now-card-copy { position: relative; z-index: 1; min-width: 0; width: 100%; display: grid; gap: 3px; text-align: center; }
.kl-music-now-card-copy .kl-music-now-title { font-family: Georgia, "Times New Roman", serif; font-size: var(--kl-type-lg); }
.kl-music-session-options { width: 100%; display: grid; grid-template-columns: minmax(0, .7fr) minmax(0, 1.3fr); gap: 8px; }
.kl-music-rate,
.kl-music-sleep { width: 100%; }
.kl-music-sleep-status { min-height: 16px; color: var(--kl-meta); font-size: var(--kl-type-xxs); text-align: center; }
.kl-music-player { display: grid; grid-template-columns: minmax(180px, 1fr) auto; gap: 14px; align-items: center; padding: 10px 15px; border-top: 1px solid var(--kl-border); background: var(--kl-composer-bg); }
.kl-music-now-title,
.kl-music-now-source { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-music-now-source { color: var(--kl-muted); font-size: var(--kl-type-xxs); }
.kl-music-seek { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; }
.kl-music-progress { width: 100%; accent-color: var(--kl-accent); }
.kl-music-time { color: var(--kl-meta); font-size: var(--kl-type-xxs); font-variant-numeric: tabular-nums; }
.kl-music-controls { display: flex; align-items: center; justify-content: flex-end; gap: 5px; flex-wrap: wrap; }
.kl-music-play { border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 20%); background: var(--kl-accent); color: var(--kl-accent-foreground); }
.kl-music-mode { min-height: 34px; padding: 4px 8px; color: var(--kl-muted); font-size: var(--kl-type-xxs); }
.kl-music-mode[data-active="true"] { border-color: var(--kl-border-strong); color: var(--kl-gold); }
.kl-music-volume { display: grid; grid-template-columns: auto 74px; gap: 5px; align-items: center; color: var(--kl-muted); font-size: var(--kl-type-xxs); }
.kl-music-volume .kl-volume-input { width: 74px; }
@keyframes kl-spin { to { transform: rotate(360deg); } }
@keyframes kl-music-turntable { to { transform: rotate(360deg); } }
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
  .kl-presence-trigger { min-width: 118px; max-width: 150px; min-height: 42px; padding-right: 21px; }
  .kl-presence-trigger-avatar { width: 32px; height: 32px; }
  .kl-presence-trigger > .kl-presence-dot { right: 7px; }
  .kl-presence-options { grid-template-columns: minmax(0, 1fr); }
  .kl-composer-row { grid-template-columns: 44px minmax(0, 1fr) 48px; gap: 7px; }
  .kl-message-side-actions { opacity: 0.66; transform: none; }
  .kl-message-bubble[data-media="true"] { width: 94%; max-width: 94%; }
  .kl-image-card { min-width: 0; }
  .kl-chat-presence .kl-presence-note { display: none; }
  .kl-lobby-toolbar,
  .kl-room-preset-create { align-items: stretch; flex-direction: column; }
  .kl-lobby-search-wrap,
  .kl-room-preset-create-actions { width: 100%; }
  .kl-music-body { grid-template-columns: minmax(0, 1fr); overflow-y: auto; }
  .kl-music-library { min-height: 310px; }
  .kl-music-queue { max-height: 260px; }
  .kl-music-side { overflow: visible; }
  .kl-music-playlist-toolbar { grid-template-columns: minmax(0, 1fr); }
  .kl-music-playlist-actions { justify-content: flex-start; }
  .kl-music-player { grid-template-columns: minmax(0, 1fr); gap: 7px; padding: 9px 12px; }
  .kl-music-controls { justify-content: center; flex-wrap: wrap; }
}

@media (max-width: 410px) {
  .kl-brand-copy { display: none; }
  .kl-local-clock { display: block; margin-left: auto; }
  .kl-presence-trigger { min-width: 96px; max-width: 112px; }
  .kl-presence-trigger-name { font-size: var(--kl-type-xs); }
  .kl-presence-trigger-status { max-width: 54px; }
  .kl-chat-number { display: none; }
  .kl-chat-presence::before { display: none; }
  .kl-profile-more { display: none; }
  .kl-room-subnav { padding-inline: 9px; }
  .kl-room-subnav-button { flex: 1 1 0; padding-inline: 5px; }
  .kl-lobbies-panel,
  .kl-room-presets-panel { padding: 12px; }
  .kl-lobby-search-wrap { grid-template-columns: 104px minmax(0, 1fr) 40px; }
  .kl-music-queue-tools { align-items: stretch; flex-direction: column; gap: 5px; }
  .kl-music-queue-summary { align-self: flex-end; }
  .kl-lobby-card-footer { flex-wrap: wrap; }
  .kl-lobby-flags { flex-basis: 100%; }
  .kl-room-preset-card { grid-template-columns: minmax(0, 1fr); }
  .kl-room-preset-actions { justify-content: flex-end; }
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

  // src/modules/link-chat/image-upload.ts
  var MAX_LOCAL_IMAGE_BYTES = 10 * 1024 * 1024;
  var MAX_LOCAL_IMAGE_EDGE = 2560;
  var MAX_LOCAL_IMAGE_PIXELS = 32e6;
  var MAX_LOCAL_ROOM_AUDIO_BYTES = 20 * 1024 * 1024;
  var MAX_CATBOX_MUSIC_BYTES = 80 * 1024 * 1024;
  var MAX_PREPARED_IMAGE_BYTES = 8 * 1024 * 1024;
  var IMAGE_UPLOAD_TIMEOUT_MS = 6e4;
  var LITTERBOX_UPLOAD_ENDPOINT = "https://litterbox.catbox.moe/resources/internals/api.php";
  var CATBOX_UPLOAD_ENDPOINT = "https://catbox.moe/user/api.php";
  var LitterboxImageUploader = class {
    constructor(request) {
      this.request = request;
    }
    request;
    prepare(file) {
      return prepareLocalImage(file);
    }
    async upload(image, config) {
      const normalizedConfig = normalizeLitterboxUploadConfig(config);
      if (!normalizedConfig) throw new Error("Choose a valid temporary image lifetime");
      validatePreparedImage(image);
      const form = new FormData();
      form.append("reqtype", "fileupload");
      form.append("time", normalizedConfig.retention);
      form.append("fileToUpload", preparedImageFile(image));
      const response = await uploadMultipart(
        LITTERBOX_UPLOAD_ENDPOINT,
        form,
        IMAGE_UPLOAD_TIMEOUT_MS,
        this.request
      );
      if (!response.ok) {
        throw new Error(cleanProviderError(response.body) || `Image host returned HTTP ${response.status}`);
      }
      const directUrl = normalizeImageUrl(response.body.trim());
      if (!directUrl || !isExpectedLitterboxUrl(directUrl)) {
        throw new Error("The temporary image host returned an unexpected link");
      }
      return directUrl;
    }
  };
  async function uploadLocalRoomAudio(file, config, request) {
    const normalizedConfig = normalizeLitterboxUploadConfig(config);
    if (!normalizedConfig) throw new Error("Choose a valid temporary music lifetime");
    if (file.size <= 0) throw new Error("Choose a non-empty audio file");
    if (file.size > MAX_LOCAL_ROOM_AUDIO_BYTES) throw new Error("Choose room music up to 20 MB");
    const extension = roomAudioExtension(file);
    if (!extension) throw new Error("Bondage Club room music must be an MP3 or MP4 file");
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("time", normalizedConfig.retention);
    form.append(
      "fileToUpload",
      new File([file], `kikilink-room-music.${extension}`, {
        type: file.type || `audio/${extension}`,
        lastModified: 0
      })
    );
    const response = await uploadMultipart(
      LITTERBOX_UPLOAD_ENDPOINT,
      form,
      IMAGE_UPLOAD_TIMEOUT_MS,
      request
    );
    if (!response.ok) {
      throw new Error(cleanProviderError(response.body) || `Audio host returned HTTP ${response.status}`);
    }
    const url = normalizeLitterboxAudioUrl(response.body.trim());
    if (!url) throw new Error("The temporary audio host returned an unexpected link");
    return url;
  }
  async function uploadMusicToCatbox(file, request, onProgress) {
    if (file.size <= 0) throw new Error("Choose a non-empty audio file");
    if (file.size > MAX_CATBOX_MUSIC_BYTES) throw new Error("Choose a track up to 80 MB");
    const extension = playlistAudioExtension(file);
    if (!extension) throw new Error("Choose an MP3, MP4, M4A, OGG, WAV, FLAC, AAC, or WebM track");
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append(
      "fileToUpload",
      new File([file], `kikilink-track.${extension}`, {
        type: file.type || "application/octet-stream",
        lastModified: 0
      })
    );
    const response = await uploadMultipart(
      CATBOX_UPLOAD_ENDPOINT,
      form,
      3e5,
      request,
      onProgress
    );
    if (!response.ok) {
      throw new Error(cleanProviderError(response.body) || `Audio host returned HTTP ${response.status}`);
    }
    const url = normalizeCatboxAudioUrl(response.body.trim());
    if (!url) throw new Error("Catbox returned an unexpected track link");
    return url;
  }
  function normalizeLitterboxUploadConfig(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const retention = value.retention;
    return retention === "1h" || retention === "12h" || retention === "24h" || retention === "72h" ? { retention } : null;
  }
  async function prepareLocalImage(file) {
    await validateLocalImageFile(file);
    const decoded = await decodeLocalImage(file);
    try {
      if (decoded.width <= 0 || decoded.height <= 0 || decoded.width * decoded.height > MAX_LOCAL_IMAGE_PIXELS) {
        throw new Error("This image has too many pixels to prepare safely");
      }
      const scale = Math.min(1, MAX_LOCAL_IMAGE_EDGE / Math.max(decoded.width, decoded.height));
      const width = Math.max(1, Math.round(decoded.width * scale));
      const height = Math.max(1, Math.round(decoded.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("Your browser could not prepare this image");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(decoded.source, 0, 0, width, height);
      const blob = await canvasToWebp(canvas);
      if (blob.size > MAX_PREPARED_IMAGE_BYTES) {
        throw new Error("The privacy-prepared image is still larger than 8 MB");
      }
      return { blob, width, height, sourceBytes: file.size };
    } finally {
      decoded.dispose();
    }
  }
  async function validateLocalImageFile(file) {
    if (file.size <= 0) throw new Error("Choose a non-empty image file");
    if (file.size > MAX_LOCAL_IMAGE_BYTES) throw new Error("Choose an image up to 10 MB");
    const detectedType = detectLocalImageType(await file.slice(0, 16).arrayBuffer());
    if (!detectedType) throw new Error("Use a real JPG, PNG, or WebP image");
    if (file.type && file.type.toLocaleLowerCase() !== detectedType) {
      throw new Error("The file contents do not match its image type");
    }
  }
  function detectLocalImageType(header) {
    const bytes = new Uint8Array(header);
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
    if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10) {
      return "image/png";
    }
    if (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) {
      return "image/webp";
    }
    return null;
  }
  async function decodeLocalImage(file) {
    if (typeof globalThis.createImageBitmap === "function") {
      const bitmap = await globalThis.createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close()
      };
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    try {
      await new Promise((resolve, reject) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => reject(new Error("This image could not be decoded")), {
          once: true
        });
        image.src = objectUrl;
      });
      return {
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        dispose: () => URL.revokeObjectURL(objectUrl)
      };
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
  }
  function canvasToWebp(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.type !== "image/webp") {
            reject(new Error("Your browser could not create a privacy-safe WebP image"));
            return;
          }
          resolve(blob);
        },
        "image/webp",
        0.88
      );
    });
  }
  function isExpectedLitterboxUrl(value) {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "litter.catbox.moe" && !url.username && !url.password && !url.search && !url.hash && /^\/[a-z0-9_-]+\.webp$/iu.test(url.pathname);
  }
  function normalizeLitterboxAudioUrl(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.hostname !== "litter.catbox.moe" || url.username || url.password || url.search || url.hash || !/^\/[a-z0-9_-]+\.(?:mp3|mp4)$/iu.test(url.pathname)) {
        return null;
      }
      return url.href;
    } catch {
      return null;
    }
  }
  function roomAudioExtension(file) {
    const named = file.name.toLocaleLowerCase().match(/\.([a-z0-9]+)$/u)?.[1];
    if (named && /^(?:mp3|mp4)$/u.test(named)) return named;
    const mime = file.type.toLocaleLowerCase().split(";", 1)[0];
    const byMime = {
      "audio/mp4": "mp4",
      "audio/mpeg": "mp3",
      "video/mp4": "mp4"
    };
    return mime ? byMime[mime] : void 0;
  }
  function playlistAudioExtension(file) {
    const named = file.name.toLocaleLowerCase().match(/\.(aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/u)?.[1];
    if (named) return named;
    const mime = file.type.toLocaleLowerCase().split(";", 1)[0];
    const byMime = {
      "audio/aac": "aac",
      "audio/flac": "flac",
      "audio/mp4": "m4a",
      "video/mp4": "mp4",
      "audio/mpeg": "mp3",
      "audio/ogg": "ogg",
      "audio/opus": "opus",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
      "audio/webm": "webm"
    };
    return mime ? byMime[mime] : void 0;
  }
  function normalizeCatboxAudioUrl(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.hostname !== "files.catbox.moe" || url.username || url.password || url.search || url.hash || !/^\/[a-z0-9_-]+\.(?:aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/iu.test(url.pathname)) {
        return void 0;
      }
      return url.href;
    } catch {
      return void 0;
    }
  }
  function validatePreparedImage(image) {
    if (image.blob.type !== "image/webp" || image.blob.size <= 0 || image.blob.size > MAX_PREPARED_IMAGE_BYTES || !Number.isSafeInteger(image.width) || image.width <= 0 || !Number.isSafeInteger(image.height) || image.height <= 0) {
      throw new Error("The prepared image is invalid");
    }
  }
  function preparedImageFile(image) {
    return new File([image.blob], "kikilink-image.webp", {
      type: "image/webp",
      lastModified: 0
    });
  }
  async function uploadMultipart(endpoint, form, timeoutMs, request, onProgress) {
    if (request) return uploadMultipartWithFetch(endpoint, form, timeoutMs, request);
    if (typeof GM_xmlhttpRequest === "function") {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "POST",
          url: endpoint,
          data: form,
          anonymous: true,
          timeout: timeoutMs,
          onprogress: (event) => {
            const loaded = Number.isFinite(event.loaded) ? Math.max(0, event.loaded) : 0;
            const total = Number.isFinite(event.total) && (event.total ?? 0) > 0 ? event.total : void 0;
            onProgress?.({
              loaded,
              ...total === void 0 ? {} : { total, percent: Math.min(100, Math.round(loaded / total * 100)) }
            });
          },
          onload: (response) => resolve({
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            body: response.responseText ?? ""
          }),
          onerror: (response) => reject(
            new Error(response.status ? `Upload network request failed with HTTP ${response.status}` : "The upload host could not be reached")
          ),
          onabort: () => reject(new Error("The upload was cancelled")),
          ontimeout: () => reject(new Error("The upload timed out"))
        });
      });
    }
    return uploadMultipartWithFetch(endpoint, form, timeoutMs, globalThis.fetch.bind(globalThis));
  }
  async function uploadMultipartWithFetch(endpoint, form, timeoutMs, request) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await request(endpoint, {
        method: "POST",
        body: form,
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: controller.signal
      });
      return {
        ok: response.ok,
        status: response.status,
        body: await response.text().catch(() => "")
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("The upload timed out");
      }
      if (error instanceof TypeError) {
        throw new Error("The upload was blocked by the browser network policy");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  function cleanProviderError(value) {
    return value.replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, 180);
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
    music: [
      ["path", { d: "M9 18V6.7l10-2v10.8" }],
      ["circle", { cx: "6.4", cy: "18.2", r: "2.6" }],
      ["circle", { cx: "16.4", cy: "15.7", r: "2.6" }],
      ["line", { x1: "9", y1: "10", x2: "19", y2: "8" }]
    ],
    navigation: [
      ["circle", { cx: "12", cy: "12", r: "8.5" }],
      ["path", { d: "m15.7 8.3-2.1 5.3-5.3 2.1 2.1-5.3 5.3-2.1Z" }, true]
    ],
    next: [
      ["path", { d: "m5.5 5 9 7-9 7V5Z" }, true],
      ["line", { x1: "18.5", y1: "5", x2: "18.5", y2: "19" }]
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
    play: [["path", { d: "m7 4.5 12 7.5-12 7.5v-15Z" }, true]],
    pause: [
      ["rect", { x: "6", y: "4.5", width: "4.2", height: "15", rx: "1" }, true],
      ["rect", { x: "13.8", y: "4.5", width: "4.2", height: "15", rx: "1" }, true]
    ],
    previous: [
      ["path", { d: "m18.5 5-9 7 9 7V5Z" }, true],
      ["line", { x1: "5.5", y1: "5", x2: "5.5", y2: "19" }]
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
    reactions: [
      ["path", { d: "M6.2 16.7h11.6l-1.5-2.2V10a4.3 4.3 0 0 0-8.6 0v4.5l-1.5 2.2Z" }],
      ["path", { d: "M10 19a2.3 2.3 0 0 0 4 0" }],
      ["line", { x1: "12", y1: "3.1", x2: "12", y2: "5.2" }]
    ],
    refresh: [
      ["path", { d: "M19.2 8.4A7.7 7.7 0 0 0 5.6 6.2L3.7 8.4" }],
      ["polyline", { points: "3.7 4.7 3.7 8.4 7.5 8.4" }],
      ["path", { d: "M4.8 15.6a7.7 7.7 0 0 0 13.6 2.2l1.9-2.2" }],
      ["polyline", { points: "20.3 19.3 20.3 15.6 16.5 15.6" }]
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

  // design/branding/kikilink-emblem.webp
  var kikilink_emblem_default = "data:image/webp;base64,UklGRo4mAABXRUJQVlA4IIImAACQvgCdASoAAgACPpFInkulpCMlIvPJcLASCWNu4XVRCBw/8ztmOb+6/yHpZ2p/Vf3zzhdfPbfm7c7/+X13f7z1N/2D1Bv1x/X3/J+2/6m/Mn+0v7n+7//zv2t96/+H9QD+5/7PrWfQY/mP/a9ZX/2/u58L39m/7X7re1P///YA///ttdKP14/z3g6/lf+R4t+d74NKssb/iXPB/Xfrt4z8AL29u7YAP07+7ebh+L5weIHwWtAb+c/2f/0+rl/6+bb64/a74Ev2K9NT2M/uR///dg/aYYgFYdkXCkzov0RFwpM6L9ERcKTOi/REXCkzov0RFwpM6L9ERcKTOi/REXCkzov0RFwpM6L9ERcKTOi/REXCkzov0RFtXsRaHq8ap957v1Nn9vNcmdF+iIuFJnRfoiKCp4SqRFz/c9VXGLw9XhgqLWbL8Yx7WcDiYyhLe1SM8PrVqlJnRfoiLhSZ0W7uL+FVab3LX2eWErxBP8hcirrKCNk/Jak+0pM6L9ERcKTJ0GTnkuyKjlKEojAv5ps76H+TWpI2PNuSESWW2DUWf9/jhGrTqNTsi4UmdF+e0NBqzrizrS+qX+WZBFpCWAtCINgBLVH19O6DgAGjWAQGon4fgGOxFGsOyLg3aMHrJewvAD4ivaxQGmb0Fqrjo+/AGkEPQY3HOqtysKfq4dcd1HfiPrwzlzwEXyR+3QmwniX0EaIpEGOTdqlTCOmrvFXIBLXxr6VaYGnz/3OmC5ikph7QCF2wwB+xbnhlwpM6L88MZgDz0D5n9ywov0dzUH+S9MDvSBc8XUW+gjpX5K89qFydeoA4zjCz2bbyzX8OrHVnkmqN2TyZ0X6Ii4MgQiI8+Qhsr6qpMi5WLj7dS85gtk5wDhbnvaYOUgbBp65UXSQnUVXQfgF/41tIGrlw6PSzWjhVxY0CZaMRRrDsiiJFFlaOk+kuevhPqyVmL2FSPBr44sK/ZPD75scblnbdo9YDcqZjgp/jPdEaeBkW19gDcQx0fBdY1OyLhSZ1Q9qfvzfKA78EC9xQfaG85kKsdVgEM5EAVQDY10Bb048OxR6C0dZxRn4IwGUArY+MDU7IuFJnQoNDu00j+iwaq4A4OYl5zDe06B9lT0Kn1UWbp4gjz/eWPOR5dA12g4S7tFLp9z0RFwpM6L86i4TFE4vyrWFFgSB0Vst24BE+UQVOdGrF5kgOl20Mdm2AuOeCJoNIcoWcDpvzTrm7RT7dF+iIuFJk6D51G4DlD1jjhutniLDVDfTPhYKmjRdfblnRDAGrExpM0D2zILdUX9Td0CemhspHHWcIo1h2RcKTJxp4uOBlTZHS0hyY3hKr5fNLf+nF+XAyw9TLgDgPsBKJwgVgMq4raw19Rzov0RFwpM6LgQGuuj7f4AFUg3tyFCeIrYERDuZYzOytFMS9E1y0U/JVo6d8JfdtKTOi/REW4qyOO2C99W5vTYWZ6Zr02p+1fp2RcKTOi+xpskwBYKWeXkgeyiaDWbm4oRfu9WVFWuOvuKwQhWXqDw27aUmccMRilCq6uG0P4zI1/GbKUAUcCkzIoQFYqiG7PTvF16DXKdUXw9Kzo2iC4sgbxK9B1vNX8oj3ygGaEMmNoLABblKVGozTEXCkycNtjQ0hQ0ZPt2QOU5gT2anYo4PwPrOdmHuJlGO2MBY+wHovmIJ8zAIzFnrRM8jnxK66Mv4W+nFP+VgJ06PDTaiI7IuFKdoTLYIAP4AZjRkTP6vjLQ4ezov0RFwinKy1F14IWyxZ5IhNIMpnM+y6FQ4vHoP0riILcLWymlDT5C4srDsi4UmdFwxV7hB3VvrXOUgKzIunKhewGDILH6EU35QcMYy1N3nfhiy06WArzbBu/i0e9TtzV+gCKdGedfRt+lFi5+ABWHZFwpIw91kJgEPvj2559hjc4IhMTUCERcZ/5DN+NL62jsVtJNCX2cNnVcrKOuYZKnMP4AFYdkXCk0JHbWPaPKsDZPAiKNYdkXCkzov0RFwpM6L9ERcKTOi/REXCkzov0RFwpM6L9ERcKTOi/REXCkzov0RFswAA/v+eAAAAAAAAAAAB796tvxxcLOwN3pYhSt6wMw9NP9pv1DxmuzeTgApKBNe9feVQvujwBw6rvrqHTniK2V1SHcjt2jK0SxI2xhtwZ2slREacF5MH925wMdPWi+PSLlwii3UIx5e3yHy4sbMAMjDIbWN8Pgq8ayHpjpkcnbdte4sOz+EbD1b/nkOE+qT+/TOzmRCibb7mNEZvfq8ETU4AE3Nb5fz9i7/CB9gAmJ+R5OZUQ9XlKLG75kOZKqbDnOb11dudElNb6jrFTQNDvHt83rRV4XqL2PB6oasi63bQ/zk3S+n5tBo4TtzSiE/YL4PWJhF2lR7gCf0X0esOtr9WyB8vwvMsEKlmz/RRJlIIKUwmaI7tjlPJaCCNYuceUHnTlR9CI9WACdLCCNw8bnvDUumeDK/7JiasUciIBGbrtT3nMixN5CFJAM9GVKbb1ci4ASv5K+B3HVePooxmhTtLwE+jWlFALBpD7uruDw7/oMel5vrfqMNz33bIWT6f3H9CrI53AO5mKcXLlvQCaDqgP7CD/pv2PfFrDzFCXFTn/omKN+UmsYRq6tYmTlzEDeQa+SuB1v/N1EGcV6OzL76/YINjKTy2BYiIRKuJYgEbeeAvghdRDE9i+N16SAi2umzOtDFOzzcNzlcOvI+troydb1a0TqJtNQm2vaTlb77VhP6HQJpTJF+0SCwnrJE1sz3bQSOixB8ThlOVvkFTFenLqpUfZKBnbrhKUs1YuQYHrnatMBOCnA+exQh0QlYYfkqJeysh9TR1huHE/i98eOKKzX5npnNAHUkAKLrUEnqJjM29G30Gb96FENHyj+2byTLbTMXQyx4OJYYr7lhHBK6CTcYGrJEuRQo4R8zpZAuES1CLZ67DUchGe+YR5RrECfzizFQhqWfEv7PFQyq68cwDPqgyZ+mpQgHnF028FA9Q7WOQ1SZRsWXufn3/vx78dd4wVa3JIfiJWnnDi4FY5Cax5QHCfN7Oy5UP2+LlyvGW2CcLNVamoZH9gsJxOfwAtNoxjwjwPjF0BHypFJYC+4MhLAAA1c0IGPpqvjw0wNRNx1j9MxMQXj7Nt4Ul9J+p48IpIxRw3y0D3ro9SbwZ2dGbab1cGj2JozbJmnv2ogO0HLMJhFOZtWZjb6or3OhZz/lhMQFdYhivoj/55QI2+LMcAKl7jHb0xA//4sn29NxLQ/Xx/kx0Lo63f910HCm3USyzpGLsZKSKo2Z80fIoVxHevpXHqhVWYkInRAPyVuwQ+kGK+W6m3zuyfxk8mNp+BuaV0BnDh+8VWy3PXMsI1PzBVdHOynd+3ZB7DwHxehiyMqiGSRjH6piiOnXs4YjGuoQcF9k8rOodwqNxPw6ctFEhjzp/0m4dy9qFEIhvCaoPxXm1BpFiDib9N8hH1sSJ3zX5j7o+ZLSPCUUMAu35nO+SeBCrz+eazFYB6lp3GxewfNLHbyVgOXiIScGv56NdPsl5U78NuWuH2rztESU5snVm4f4HIETG4FGlrNpxj8MQKjf9Pa8OIK32TWRunoBUII88OB9Prb1Oicr0OPuVS4B9nOmqmwjGmFGJQDIRcIeq3Pnu0ltjQQICZHrZz49Pwu4UAvIsEaNKOtikJ9wRBmmqqQNTIxppjh/U4sNvyh/6DRVmXE4BlZ+XTI+6Ns0ubHBqvTOOHvUd/yLi3Wpo+1WG36ipHV38YhOJ0Fdfn4o/aKXRfeZjy/vlgRdKDiCmqZWbBE18gtm7iCUVIu9fNDfhbi+Px6h3r8JNFGGyRLji6QYZTFnRAmhS+MdjJJ4kM8ucm/3U/folPOiSoiNO7mdy9xKkuQFJF9tOCKdbdaxGcXxtfmMsuLoe/ECuCdTehmhPJyPDZZIWey+RVnGJluMF0FTyJfx736OUH1vW+Bro+R2c1+PROmQMnjR/SPfqsRjfNyhBYx9SwZw6ek/kCAiD5sJ8oAB+0TvZpFKz/5b+HWj36SV9679LbPG0ZLo/Yx9RcvJ/N0mFFotOmRIX7gQTCoeVEjOmIyE+LoXaZm8CgBRfOpkjGny6GOV8nemPgRkZ2ER1VghcL5V29WHYltibCf1bpXUx/sw0qsi3HZoEa+xrMgEeJzpVcqhIezlZLmf9P8ge8FrvkAPlNJt3ubE6cfmf6P+VQNs4pThulmOstu+v5UPycbPjVbS/CHw5SKK8W4g6h7WD2kNGYXYfXLjE52S886aQqjLMbEUYKBme1niknxaJxl7agAGf88+v0Pe6HnCFOcnt4uwVDIhgOTXWgPB/oQBrUdD9NBLVAdnO1/lV4RsDmK2cZudwnhf2abDBqzEBtbN2QTjFUAUZsmeB+kcGJvpXE/AeM7+XJPnPXIY/vXfmF8jbjruH5q5LE49iQA7q10ZA9teApuIWpRVRyQRIX3CojCXPZH8YFf8Ok6AtFji9LQ+K3Tmcm/Uijs0mF9B3lr8vfbT0MjCJ5AhFDxMPdGbzdX1GD+Rt+iWvj93cCl6i5GiFqK9y966SU2JAM1KMnu8upm+3coG9ZWMZBQ6xyfIzMtMvlyN0CnYG/vzYuKdvBCsGr+DztvyDoJLDgf4ctcPndMRQjBuGIN9sOxYIzQTbxSwJv7uzZukWbA95Nf5BOuShs+J56kK9t7V5oNxph7QgFG1f73BdYVO70D/q2EKiwRo4zft2RbkqNduJMecxh88O3rkNqUrrtbVPqCTzklKbzL8Ic71588MTJLg4YmW+Br8SD2WtmQrxx59Kq9IX43LH7VBh1YzXlfcJkPtOrTAIUTMjpJdwqMzUwDCJ5BW8YpdXjVfYH130LPdekyFb1kH07hMQRbJywk7sCBDXvmGxzCwEHhxX8JC43LbH7C1vVW2QrL4/fG1JVwXRwJXJPkIH9OIKV5VonR559dlyxgSYvRL6c2jP+hhuHCMm6pX9maGLEHExUUZGLfnWi9dL0MjX3IzAGAwXGqoZBBahzwdoxn1cE9/0Ao8IWXwudZ4ViAp7rbUsMsZsk2NEdbSZ40+Frz3vfZFWmaRyutVqQrh4zeYSG93pFz4MH4DhBhtrdIX9E0ouXx4K2OUiyskCqcgRlmaRpOsG5SS+ZEEC67tFwR9w4soeDnFoDRanFOvWx4YaCGRVOswzo6dHdy4OEt8nCd6y2SD9/vXokHhY7ciGuarqdkUF8jyntCqdoN7eXS8scpStvJNcYNqpp1tvGteOfsZcbE4YNZWJxWGXcL8qKS7RCSZWXOSQs0gC0P+1IQWG6HZzpQjaGaB83tnx3tKKHSoImO7MDjz8h1DrfZHhxSJsLPRYaocy2uMADUpEmyjqsNUwd8td+Vfsnznlq0MCQ+PH1W2GW8nDLC1Zay/Z78mKI6M7diPrcgEla0pXIbFt/36Aej1eF8stqGIXbbEJ3F8TANhCHwy5dusHYsU+6im3ywxjAltsjjJw6YFYOKD9M4k4Y1sPwu37ROZFdxWmxq7pjkxdUmCgvcKLmx8pJtA3rNhmo3W6zhvFeYpm4hZqDKylCv1y2Wf+Z8iWEDkBbGrrkXj1kQZyvAIe71jZS9gOKPu3ucNKkz5fBA5fAmz/36o7RchKlM+1tR8ylINSbFe/EfPDyJLhzi0k9eNBOU7R3WpjLPyPXlRs4mp+69d4SX6H7qsMVX+go3mJwLmH/eiP74umgxX6iX4MZjQqYTgEJCoMNsxxjo2eUvjTkePpysb5BTW3348BtdYWdBZqg56Yo+bx2ZCi8pstcVsQ8XbYrEZQVYc/U6ajpXdix/mx+dvpd+GsUn+Y/1r3hK868ueXX2xuE82KKDLQkbjE9D7PgS44PuJyOkWs/gMwkxPVsDYPh5IAkys+v2siWRxy9OQtNGSxZTm9E6TNhEfcPTaMXfJ8sqMndzYy5G/V7ECJ14fsDyAPBHRmN5qROjEcetqbPRVAGiwkUKOrzb6L3N0AhXUPInZKyx83Kz3RCzSi440BkmJMNaDi8nh8o4ocZm6d5LT8S8G1mbVDTcyF7HduzNJbuLq/RWdhubsny1HNTi6uFI9sjIjHrUGucPFxg1PTedvCvOzhx8hGynxm+dcoxljEMeKsM4FSATcNo5DkAQrfwxDMs7xiVPT6l2ymyilFU+bYTgRK0zeBkyLGhL4VyyIyhWjiZ9h4BTDkxrCx4EZ2FFhcFq/lj1pNeals8T1qaxwleKYOidfBMUt4MeBK5CYwMigBawJHAqlNZVUjw99bRf07SU2O+RJF128QzFnZaJLlRMnp7Y+yVw42Eh1+2Yv4wwPtX9Flds3NYHAIW82QYvpHRe4f7p5h4tKeD7BSTOaAWjLRjWzHF1vEV0anhJv0RFK89frGb6l2m7KLpdqhYBz+BwuToYwPFaPLXcDkikkyrF23ULn/4uVBy+lnhCNtfZrK9P9+EfbsW7LzrjH8Y6OvZcioRiI1uz4MvxaUSMFi6ooNJjb5yFa/IxqJY/cDCMbIKNAOzBlCcN0ev1ifBxkbvUTCj92ZunQEAFakadBXjC7v66iS0nJHLGHNczOPhdpC4jey7ZLikTW/trdvdjJm32R7YLhQNm8kN3xeKOhR7NNNp7mbDtuTWtmP62y4iJo0NfOAGQmugtKazVEOiAo9/WAgNj1B5/Q1mQ2e1Z3GfxwE3/iaL50ICgEWDxVWJHsxS051O/iYzfMXWvxZ/Ga2hQwGLOveforjH3Yo9dK3qKVBk1o2D8agW5fFIegAAKNKkbnPUXwUXrSNECB14H5ng9sGHMUI4ptstglb4fvqRC0qcq3KTggYSJa/ACo6HixT4Sqj82EWSXMIFxSncZagDML1T7agsZ6hlxZQ5lQd1/SNqXpzieQ4N67jwtXz3X3mm6ueC4Mu5ePqCaG9YU3mLjsqtIowLs1w+3eIyMrpYs0Gozl74sGyAmWPIeJMmn/MJBlqpIbyDd5GvCLBBCzo8DuuthxgxV0wF7MpGIgziEOD6SnDCiA1OvjELONOC01bfaIVH9w6e7vc9xg7rjzWJ/rlHbrc6apVTq/DTZVVrT/BAyQzco7kdS2IIEoXCyXypYsWnoERY62TfnC+rGzcuZtlpMU2T0ZNszXuEFhZvXCZsBTk4meOnYh87ObmbFgLuxvoNgyqLVSxUMstS9wxbIejXTRCElJZGP7gebNekAPqFctiQcAR+lGwGPAZAjnhOHSiDwM8wxKeXppavEn6lRiDg7fX8d18nE/vgJVTfLLeuT1lO82jC6Bu71tfbeFlo9e1zdMwWu2IA5jNrW94OZLfFhWFfEAmI+0kydCnO2l/D+HWI0xHkJzUj+2iPJiVSw6OUTlblivdG25h74bfvFnXZ84Yj+pTelBJpIFr0VKjOyx88gTLghaI3OhlHUaHe1BtpZdf0oQzDxRcSWSQ1XPl+ylicEr+nwPtqM7424nmiBwfn9NbrcqJKNl4mzP2/rtStRpavI+1ZrZaCPLusNCabqei44iRn10ze6MO0srmo51bNmXObtKB0JvvPrw2iRg4XTK3qqdq6FYuGQwcbMNi89g7Q1/kdNnFh9RpfT6YIjNFJ9TSvL45jOzE6LQBjgCfmHsCslbT46vjEGrPI9rq2DvT+VeF0s3GDz7dcprgTG2Hb7qfXbfvTfn4biio2pVhfvCjHiuuMb7Ks2W6TlfqWZuH0GdKrdTE8nY5J+xDKIexPM81NaXPb3QEHpMG8CmfdX5IfgenLAvCqxH13MePgWFvoCcHNYaw+6dmp9MbH0teSdfJPVFf6a73rskzbpIcmvvXvNG4y2YcY1gUWq3gFQdz1pwR8TtlnlJUVxNXBmNflWzqKcnmgn9K7RoRh8i4ZBgsO2rW5wgfXBQtsL6ZCKC4eQEfsUBIDtAZkXwmVoe6FNl3zWCQmICAoCbweH3o3vGFrrrY9in7CvQn2gFHxUkTVgzvVWmBXVgdTIw3qIuyZxfe7V4GazMS8NAtXcdd71XFWiHyAN6gUqP3mUY8RAs6i7iwUHnLOHTxl9sMhYGEBaTy1WAJUMLlumX6ulT8rL9uIFq5BDSVSVlLcw9E9tXDNoLVGItgxPgB3QA5JqSzKKFnWtFKZ17PmZmdtbIm4+XNckX5jIpBkKWzlLl0Nd9nd/0BdznRGt8Eye1waUY2WNWxpqPNcCUnKQW1sdscBXe9i8y317Vp+pE9qjreiOzj0pI/K9KQVp/O/fYcuOoF7VI9EDycMvDNci43dkWml73UZQHlMVwin4SqIcxw7KCoPhrxgcBnfl7+ETnArqPuBUuYJ96JRfjXAQi2++IAncFclwJebvPgU0SG/adKqAEV8Yw6vi+XA8G489vqa183qa9UwmcdOJGY7Eo9CYtWkAceb9jauCwqooFbRTrPOK2SfiN4p/CwRYSd352fNi+LJmT6qHoogHdOBHrOLjfyLNQPWsBV4sflfPUcUPRYq3jOZN14ZTFX+FKX+GPSG17etVLCf0/hmusie99buwxury99BlrkdEeP2TUdeBbgIL4HS94hh8Hw5z+X0uFxzkO7Og8O5mSf/XHPFnFtV+8+s1MbYlUDyRDz8dZMvfPxkbYU93W5Ops+6uo8AZBneinZYx2y/3Xh0KCfVPaZtSYsCp1zdzpeA3TJE5bOLdPcdoAP7nu+X+feppRhFCNc9jaUjIBgkSwu/wd9SlNO7QlPqhTFqxnW0KsGNq3VmtPR+M8WGyRAfVAWwyj4Vrh60CRL4AndyRmIXpzu3xRlxPS3HAsv/xW0zWJoaDUkhSk9tLouAHxvDaVjZUmvi0LRfIzKaqdQdLPWzCZLoGyrEJ16KUsYBCei0LnRt8t7C1VB5hsjoG862ervBePGcXxhQebOd9phOf/6IntcuxrCzkCPt1MMhMVnzF6lw5pMXVeb3x+zsBd+m3Oao1bB6NoEKyrogeqEl1yf+cqPFCvjVsSXmrP7TGf2UgZg1cyeQKePyA7Jcpympf9W7+oAAh3mG0tashm9CToTBNuF151iN/qrFoVblwE91A5pUAY+7YlYWE/4XpjMeHwk69mr/lhENS9rVuZ8fpWxmya+k03kAMvjU04mKV9XE7lz3F2Xc2mGhBaJjrwOr8RDBR12N1NtuiIqzKTUxlmuL1MQ1qRaDjmbsRcbpCLUY3oP6F1kd89aM9RoyzcwyQsyXpEZ3tHrrNhjKP2d6Xs3ImeFwPAJ/NY7ULFisMLpklXhi6gfsg8hsLyMLRYvS5+MXnL06H6NDDToDU7YJgngYJ4r+zUrZ/gFfvsUE7yXVJxnqV0uNLxy1tdbqtXEKZKM8N3OiADVgx/+TYN8X7ao/sPd/Aa3AmflNiauVa+IaaH95XlmrkF/pcBj51XocDZ62n1UcxCcXMVpbFzV9wctxWRMmVPelhixLnsAAK7/02TReledGFpbhLm3OGhNKVOS2NO5cxjP7A7H5k8qqlz9oXek9B8DN1f3VGV2kM5VnSKaX20KGa7+XywSqfZ0V9iFuEr+74CXR0iMOVTfnFmKIt5uPMf6yTgabmbasjBIoX+kU5S5NiULU81lZCW0iOqlZz8D3L7B/F2Mpaybv9D/I2mDVmXRzqoJKb/rCSOi+xeuRoW7Lt5ro5t4US9sjivOdRp7XEV99dJp0A+zvqODoeNGhorUOAOEKVn7YnMm1f4dEUDmxz0LTmxSveVu2CF49Pg36znvGdi2q8kFG/1GTqgsCVRWlvSpTWEKfwSMdEeGXGBDwmQhNeS8UGUWbpJIuKzU5iFmBkWWt+m6NjRQLxuUG3Ez1Qp7ElemqxGQlH7uh6slPzuxjpI+yia25C3iC234pgRPpg2oDg/YvNeXi8LkJ75d5bJhEk0IsTXV8B84PVx2sCcnxKwQ7RwS6Gs0IunnVXjwAE0l0hSmgNT/oeikW8leolUWQTcWnS/iFmzCPMTOecgvYxEBKDgV6Dn7e7ICgh93PAHz6l11Tf43lMzdmkFVMubG/peCPuQwq95j16TwZrJldezh+nmvPr6YsHyzDW3Lr8CUAswBQefDAAIYTEJ1X623+m5cpJNQ++t2CiBCQ8G/8mN+ORWZIhNCkeiXLIPKUgx6Rhlr4bFJePMGbrR3X00kUCwhRsisQMwFWfZmiJqmcsNXm0mX4XiSWxPPnY8SIsfhe6o4a0YHF2IpFFU3Qm6fPN6jVfCBwLu6oTSXk9GSk8plPhmv+a1weyete/yGsnwbOlWM2qsZiKteAPeDVBRPV91W7RHKMS7CiMJjh9qTTaD22CmZJoD3UjLowUJ15Bd0WICgoooJNhSKI03CaaO41LpUSl09TMnRnD5P0CBC2temwBnpzwEpVsn0AnpLCsd6/tDf6R13LMEr4/d3kv5/QrAWgCBAS5tGJIaFdF6dLEutC5GYLMZLgxoMJIzNYBVpZtqfD7gDiec5uOh6qnJINsbCw/PMn6nMkuJEZQ2ThESGmaPRhw7iGAuVvbJpL0uaSxodY5XNPDshcIMY1lAGnPgYMuyJswcyGdrb5jNEhSkV5l9vc7FdtwH5C+RSOSgVQrHioY/8g9byip7wOGBrSr9NUL2xakB1Ij4PxxR3ra0JdfRBZ5VRA6p6KNSI4uEJL5RfxOwprd4MbeL7LOKPjEh+6FIcTGChffNXkeicVK2D+CVhvsjRBOyqgXdpVgf/JdRt0eDcXDwAAvzVzsDZP6eVK1eMKexG+GM9qSzzxRrQoyQqnxtM6Tm583fe1IYsMpD5YPBQY8RwDqjvO3sSnLOz4NzV/lxotANeQWb0qY13msUco1BaYU/XwyvRGUSm7NKr0o9AXKFxwEdDN0limCK3Nrqd+UD+h3VjzUVnkAU/1eLQJq5dh86j5EhjPdPCCF7BCzSNeNsmJ2N6BgTxcMtRBecmGjqKOgUABkcgVa2cLhGhhJiajX4Ngw3Ki37VOCQfETPEtF96lpvAtnij75iHfwZO9FJFy59J7YyAShhN5UWMUUNYPX2dwbqIaHxFW3tGYPvLADK9ebpZadI11v5R+0lVjUUZm6i3EByTNA6N2amS575GM0cVVy4YLX+L101R3iHDxbvNq4pL08xY0RgvLf37UORWkY12g7RpbCFkGnBKv0oglH4cEGjiXVbCr2r6tdjUbUVHJJSAurEqH50t4g+U0JEej0tIHt1EK0XffBEBLBGw+sYteNakOcfi4ZHZN54pdJz7NO5qTq8yNaAvaxK+3brLXBPZhMj8MBSm4PF4oPebRrCsLdAJ85CITi0bVJa9aBPQAH4/VIpSs1IHio03I2g8RxJaaslQrBCgy1cE+QBGYJsXj8GSbJ2aeteIVCp7xciXaZBCQQM7tnL6Gom6ADDwzH9VddP7KlWYjMZNJEtPA0mvA2Bqo780pLdFKwpwnv923jKcoIinR3ycwufUDJSwBCTP5uK1O8uBxJw9Unq/yI9adrDqdcGwuLEL/w1VtE93TYots9+sKqP7NYmCbt8mev7H7ec9O/AzewYgi1YR/hsndhf3nHm0DXMvw5NUaugemY5dYH4L91Tqx3qU3f4RpdKR35STy2SQX6pHMQ9KDdeUd/On/DtZh6EzY9S+GpMeNZqPSkC1Rhtt8HJwGaeWaqyu4uIbB4d0SwqyQxzcLR4XghQs70XND427+c+g7/JFvaOwvlQ/QiT2fiHSAAAAAAcdNPyYL7/VMYHGWA5SBj8sfwFAFSlzQGZ6I8iLX8gt6QBc5EBwAAAALuoPmab5j880EYAJgXxWE+sWnQEgmTREk0Ce2UpX+qS1YUjjgkVkskanKY3BgDyelcC4gUTQXYArKHn8gwOxXyIq9vOqMokZ+uKjvNYqY3VHnMYgVUapOCbfteq+6WdgTW0Q2QbdnfmXpnVigoO2BPqVseaDsW2+B6x0DL8VQEVXLSoy0w0Dv2hDNaVTlJlLt2zRkT1p+I53lwY9VEBC8vmektyj+6xX4f/Vk+yw/ThFnFh3/WR9f6zbjM0/0setPdIDRBXMbzHSp4WE0geYzvdYRbjTxBZ6x7kw0IZBh9APlKFF7T5ksFdo34ALNqteUMcGUBm7A23gBfj7juVSAiXSXtY/DvF21kRh9kT2Fpb2xKRfBMuIs3I1L01FtNTmk9FHitJiEca8KZLyF389avWurwy1jkg8S4sArzFCyi6Ff1lX+dl8GxSu9HFnt+jTSk9CfBYOF0saFvPNrPRxwWo1hXDYnj7EOlUtiT6r60dPO2+mm0IxePW4G/NHoX7OIiES36ME5xUi9HpmS1bRvbm/7o6PyknIXRjayN2yjr4d6PUL2bWt1YrsY4pFqkbb5apqPL7GFbaosdeuRf2rX9BJAeiQDsgLXl9LvNKyCDl80A6OiItUQHhqy6tV1CraskwxmWEeuT3wr7hbNKsrOC2UNE0rhhHJu/qMOT+8V6yn+0c7Er+bMMqFSlt0FZVzoqsucy9V6bJmMuTtcEg3rhJL6tRS/kfW22VNsEPY3VlQzmMtfDTum69Xt+Abaf3/YRy5GjipXbq3eliu1Jkv+8dhWyuFNkSmt1PGkUG/ubMclDQ6MZKWTZusL6qNP94wHZEX/81zfrXdnw7mcXv6nxM6qR5UyIh4wUBBN2PHHg57f/P2SHKStasPgu2HTMljjk/8U1+PG3eu+yWn3cGhyL0jXUTURSyB9az4jo3yCjwTOgNl3zspNgBlbwskQ9lKohhilatd7kJzuluTa19ei5EYXlhf3xoejWQ0uiuBemX9RPWRI/4dVRUTnu+/0QT9lGSUwStP+aJYSQMQC9BPHQr4DcklXLu07Tzn3O18wjxNXwxXf6lLfbHc7hsrFjbEEDvpOUskA/gLpDNFlZD+LctwpxlGqP3imifn3HAwd4H5UMQ41LZYLluTEWO96lcDjHOg1n9tu/Tu/t4v/kr8TLyLWj66yEOoW9esAdnkh1hrpbl2P/smt0Tdyq2nSdgxRnyOzhEkTam/unOX12rmbZGoBW6qqrPy+6OFagUMyOTlU3GEaFcKcgLEhwaHdvErmaNqkB28QC8m7rByFnFCo820AalTK68pBZDRMOcUROfbvM0NoepzR0t7k3w3pw3CWxBYj3W7uyt5iEXoxGWhvDXfkv6zv2UkCNCZahalTQJQE+ZtbD3rMss7laPL3ZmTHntzZFIgGUPJcokf2TFLA8zRaa3aabU8wJoMDY6vlThIyrwAAAAAAAAAAAAAAAA=";

  // src/modules/link-chat/view.ts
  var KIKILINK_CREATOR_MEMBER_NUMBER = 0;
  var LinkChatView = class {
    constructor(adapter, service, settings, version, activities = new LinkActivitiesService(adapter, settings), roster = new LinkRosterService(
      adapter,
      new PeopleRepository(new MemoryKeyValueStorage()),
      settings
    ), presence, imageUploader = new LitterboxImageUploader(), soundStore = new DeviceNotificationSoundStore(
      adapter.getOwnMemberNumber()
    ), musicStore = new DeviceMusicStore(
      adapter.getOwnMemberNumber()
    )) {
      this.adapter = adapter;
      this.service = service;
      this.settings = settings;
      this.version = version;
      this.activities = activities;
      this.roster = roster;
      this.imageUploader = imageUploader;
      this.soundStore = soundStore;
      this.musicStore = musicStore;
      this.presence = presence ?? new LinkPresenceService(adapter, settings, new EventBus(), version);
      this.#roomBadge = new RoomBlossomBadge(adapter, settings, this.presence);
      this.#notificationSounds = new NotificationSoundService(
        async (id) => (await this.soundStore.get(id))?.blob
      );
    }
    adapter;
    service;
    settings;
    version;
    activities;
    roster;
    imageUploader;
    soundStore;
    musicStore;
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
    #roomNavButton = element("button", {
      className: "kl-nav-item kl-room-button",
      type: "button",
      title: "Room tools",
      ariaLabel: "Open room tools"
    });
    #musicNavButton = element("button", {
      className: "kl-nav-item kl-music-button",
      type: "button",
      title: "Music & playlists",
      ariaLabel: "Open music and playlists"
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
    #homeGalleryMetric = element("span", { className: "kl-feature-card-metric" });
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
      title: "Open Custom Activities"
    });
    #homeGalleryCard = element("button", {
      className: "kl-feature-card",
      type: "button",
      title: "Open Media Gallery"
    });
    #conversationList = element("div", { className: "kl-conversations" });
    #galleryButton = element("button", {
      className: "kl-sidebar-new-chat kl-sidebar-gallery",
      type: "button",
      title: "Media gallery",
      ariaLabel: "Open media gallery"
    });
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
      title: "Send an image",
      ariaLabel: "Send an image"
    });
    #quickActions = element("div", { className: "kl-quick-actions" });
    #includeRoom = element("input");
    #counter = element("span", { className: "kl-counter" });
    #galleryPage = element("section", {
      className: "kl-feature-page kl-gallery-page",
      ariaLabel: "Chat media gallery"
    });
    #gallerySubtitle = element("p", { className: "kl-feature-page-subtitle" });
    #galleryGrid = element("div", { className: "kl-gallery-grid" });
    #roomPage = element("section", {
      className: "kl-feature-page kl-room-page",
      ariaLabel: "Room tools"
    });
    #roomAdminStatus = element("div", { className: "kl-room-admin-status" });
    #roomImageUrl = element("input", { className: "kl-search" });
    #roomMusicUrl = element("input", { className: "kl-search" });
    #roomSizeMode = element("select", { className: "kl-select" });
    #roomMusicSync = element("input");
    #roomSaveButton = element("button", {
      className: "kl-text-button kl-text-button--primary",
      type: "button",
      text: "Apply room media"
    });
    #roomPlayers = element("div", { className: "kl-room-player-list" });
    #roomImageFileInput = element("input");
    #roomMusicFileInput = element("input");
    #roomSubnav = element("div", { className: "kl-room-subnav" });
    #roomCurrentPanel = element("div", { className: "kl-room-subpanel kl-room-current-panel" });
    #roomLobbiesPanel = element("div", { className: "kl-room-subpanel kl-lobbies-panel" });
    #roomPresetsPanel = element("div", { className: "kl-room-subpanel kl-room-presets-panel" });
    #lobbyQuery = element("input", { className: "kl-search kl-lobby-search" });
    #lobbySpaceSelect = element("select", {
      className: "kl-select kl-lobby-space",
      ariaLabel: "Lobby space"
    });
    #lobbyRefreshButton = element("button", {
      className: "kl-icon-button kl-lobby-refresh",
      type: "button",
      title: "Refresh room list",
      ariaLabel: "Refresh room list"
    });
    #lobbyStatus = element("div", { className: "kl-room-directory-status" });
    #lobbyList = element("div", { className: "kl-lobby-list" });
    #presetName = element("input", { className: "kl-search kl-preset-name" });
    #saveRoomPresetButton = element("button", {
      className: "kl-text-button kl-text-button--primary",
      type: "button",
      text: "Save current room"
    });
    #roomPresetList = element("div", { className: "kl-room-preset-list" });
    #roomPlaylistSync = element("input");
    #roomPlaylistSyncStatus = element("p", { className: "kl-setting-help kl-room-playlist-sync-status" });
    #musicPage = element("section", {
      className: "kl-feature-page kl-music-page",
      ariaLabel: "Music and playlists"
    });
    #playlistSelect = element("select", { className: "kl-select kl-playlist-select" });
    #newPlaylistButton = element("button", {
      className: "kl-text-button",
      type: "button",
      text: "New playlist"
    });
    #musicTitleInput = element("input", { className: "kl-search" });
    #musicUrlInput = element("input", { className: "kl-search" });
    #musicFileInput = element("input");
    #musicFileMode = element("select", { className: "kl-select" });
    #musicAddButton = element("button", {
      className: "kl-text-button kl-text-button--primary",
      type: "button",
      text: "Add track"
    });
    #musicAddStatus = element("div", { className: "kl-music-add-status" });
    #musicQueue = element("div", { className: "kl-music-queue" });
    #musicQueueSearch = element("input", {
      className: "kl-search kl-music-queue-search",
      ariaLabel: "Search current playlist"
    });
    #musicQueueSummary = element("span", { className: "kl-music-queue-summary" });
    #musicArtwork = element("div", { className: "kl-music-artwork" });
    #musicNowTitle = element("strong", { className: "kl-music-now-title", text: "Nothing playing" });
    #musicNowSource = element("span", { className: "kl-music-now-source", text: "Choose a track" });
    #musicProgress = element("input", { className: "kl-music-progress" });
    #musicTime = element("span", { className: "kl-music-time", text: "0:00 / 0:00" });
    #musicPreviousButton = element("button", {
      className: "kl-icon-button",
      type: "button",
      title: "Previous track",
      ariaLabel: "Previous track"
    });
    #musicPlayButton = element("button", {
      className: "kl-icon-button kl-music-play",
      type: "button",
      title: "Play",
      ariaLabel: "Play"
    });
    #musicNextButton = element("button", {
      className: "kl-icon-button",
      type: "button",
      title: "Next track",
      ariaLabel: "Next track"
    });
    #musicRepeatButton = element("button", {
      className: "kl-text-button kl-music-mode",
      type: "button"
    });
    #musicShuffleButton = element("button", {
      className: "kl-text-button kl-music-mode",
      type: "button",
      text: "Shuffle"
    });
    #musicVolume = element("input", { className: "kl-volume-input" });
    #musicMuteButton = element("button", {
      className: "kl-text-button kl-music-mode",
      type: "button",
      text: "Mute"
    });
    #musicPlaybackRate = element("select", {
      className: "kl-select kl-music-rate",
      ariaLabel: "Playback speed"
    });
    #musicSleepSelect = element("select", {
      className: "kl-select kl-music-sleep",
      ariaLabel: "Sleep timer"
    });
    #musicSleepStatus = element("span", { className: "kl-music-sleep-status" });
    #audio = document.createElement("audio");
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
    #imageUploadsToggle = element("input");
    #imageUploadRetentionSelect = element("select", {
      className: "kl-select"
    });
    #imageUploadSettingsOptions = element("div", {
      className: "kl-image-upload-settings-options"
    });
    #roomBadgeToggle = element("input");
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
    #friendOnlineAlertToggle = element("input");
    #roomJoinAlertToggle = element("input");
    #notificationSoundsToggle = element("input");
    #soundVolumeInput = element("input", { className: "kl-volume-input" });
    #soundVolumeValue = element("output", { className: "kl-volume-value" });
    #customSoundInput = element("input");
    #customSoundList = element("div", { className: "kl-custom-sound-list" });
    #chatSoundSelect = element("select", { className: "kl-select" });
    #friendOnlineSoundSelect = element("select", {
      className: "kl-select"
    });
    #roomJoinSoundSelect = element("select", {
      className: "kl-select"
    });
    #reactionsToggle = element("input");
    #reactionRulesEditor = element("div", { className: "kl-reaction-rules-editor" });
    #reactionRuleCount = element("span", { className: "kl-data-tools-count" });
    #activitiesButton = element("button", {
      className: "kl-nav-item kl-activities-button",
      type: "button",
      title: "Custom Activities",
      ariaLabel: "Open Custom Activities"
    });
    #activitiesPage = element("section", {
      className: "kl-feature-page kl-activities-page",
      ariaLabel: "Custom Activities"
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
    #presenceTriggerAvatar = element("div", { className: "kl-avatar kl-presence-trigger-avatar" });
    #presenceTriggerLabel = element("span", { className: "kl-presence-trigger-label" });
    #presenceTriggerName = element("strong", { className: "kl-presence-trigger-name" });
    #presenceTriggerStatus = element("span", { className: "kl-presence-trigger-status" });
    #localClock = element("time", { className: "kl-local-clock" });
    #presenceDialog = element("dialog", { className: "kl-dialog kl-presence-dialog" });
    #presenceOptions = element("div", { className: "kl-presence-options" });
    #presenceEnabledToggle = element("input");
    #presenceMessage = element("input", { className: "kl-search kl-presence-message" });
    #autoIdleInput = element("input", { className: "kl-number-input" });
    #presenceAvatarUrl = element("input", {
      className: "kl-search kl-presence-avatar-url"
    });
    #presenceAvatarPreview = element("div", { className: "kl-avatar kl-profile-avatar-preview" });
    #afkAutoReplyToggle = element("input");
    #afkAutoReplyMessage = element("textarea", {
      className: "kl-custom-activity-template kl-afk-reply-message"
    });
    #afkAutoReplyOptions = element("div", { className: "kl-afk-reply-options" });
    #imageDialog = element("dialog", { className: "kl-dialog kl-image-dialog" });
    #imageDialogTitle = element("div", { className: "kl-dialog-title" });
    #imageDialogSubtitle = element("div", { className: "kl-dialog-subtitle" });
    #imageUrlInput = element("input", { className: "kl-search kl-image-url" });
    #imagePreview = element("div", { className: "kl-image-compose-preview" });
    #imageLinkTab = element("button", {
      className: "kl-image-source-tab",
      type: "button",
      text: "Image link"
    });
    #imageFileTab = element("button", {
      className: "kl-image-source-tab",
      type: "button",
      text: "Local file"
    });
    #imageLinkPanel = element("div", { className: "kl-image-source-panel" });
    #imageFilePanel = element("div", { className: "kl-image-source-panel" });
    #imageFileInput = element("input");
    #chooseImageFileButton = element("button", {
      className: "kl-text-button kl-image-file-choose",
      type: "button",
      text: "Choose image"
    });
    #localImageStatus = element("div", {
      className: "kl-image-compose-preview kl-local-image-status"
    });
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
    #customActivitiesView;
    #selectedRosterMember;
    #rosterScope = "current";
    #workspaceView = "home";
    #roomSubView = "current";
    #lobbyRooms = [];
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
    #galleryRenderToken = 0;
    #lobbyRenderToken = 0;
    #musicRenderToken = 0;
    #toastTimer;
    #clockTimer;
    #launcherDrag;
    #panelDrag;
    #suppressLauncherClickUntil = 0;
    #presenceUnsubscribe;
    #presenceRenderFrame;
    #pendingPresenceAll = false;
    #pendingPresenceMembers = /* @__PURE__ */ new Set();
    #typingStopTimer;
    #messageRenderLimit = 120;
    #messageRenderPeer;
    #loadingOlderMessages = false;
    #renderedMessageIds = /* @__PURE__ */ new Set();
    #suppressProfileClickUntil = /* @__PURE__ */ new WeakMap();
    #profileMenuToken = 0;
    #aliasTarget;
    #removeChatTarget;
    #imageSourceMode = "link";
    #imageDestination = "chat";
    #preparedLocalImage;
    #localImageObjectUrl;
    #imageUploadBusy = false;
    #imageUploadToken = 0;
    #imagePrepareToken = 0;
    #localImageError;
    #activeTrackId;
    #musicObjectUrl;
    #localMusicTrackIds;
    #localMusicTrackIdsPromise;
    #musicSleepTimer;
    #musicStopAfterTrack = false;
    #roomPlaylistSyncEnabled = false;
    #lastRoomSyncedTrackUrl = "";
    #handleOutsidePointerDown = (event) => {
      if (this.#profileMenu.hidden) return;
      if (event.composedPath().includes(this.#host)) return;
      this.#closeProfileMenu();
    };
    #handleViewportResize = () => {
      this.#positionLauncher();
      this.#positionPanel();
      this.#updateSettingsTabOrientation();
      this.#closeProfileMenu();
    };
    #saveDraft = debounce((peerNumber, peerName, value) => {
      void this.service.setDraft(peerNumber, peerName, value);
    }, 250);
    presence;
    #roomBadge;
    #notificationSounds;
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
      this.#roomBadge.mount();
      this.#positionLauncher();
      this.#positionPanel();
      window.addEventListener("resize", this.#handleViewportResize);
      document.addEventListener("pointerdown", this.#handleOutsidePointerDown);
      this.#presenceUnsubscribe = this.presence.subscribe(
        (memberNumber) => this.#schedulePresenceRender(memberNumber)
      );
      void this.refresh();
    }
    destroy() {
      this.#saveDraft.cancel();
      this.#imageUploadToken += 1;
      this.#imageUploadBusy = false;
      this.#stopLocalTyping();
      if (this.#toastTimer !== void 0) clearTimeout(this.#toastTimer);
      if (this.#clockTimer !== void 0) clearTimeout(this.#clockTimer);
      this.#clockTimer = void 0;
      if (this.#presenceRenderFrame !== void 0) cancelAnimationFrame(this.#presenceRenderFrame);
      this.#presenceRenderFrame = void 0;
      this.#finderDialog.close();
      this.#newChatDialog.close();
      this.#presenceDialog.close();
      this.#imageDialog.close();
      this.#resetLocalImage();
      this.#aliasDialog.close();
      this.#removeChatDialog.close();
      this.#closeProfileMenu();
      window.removeEventListener("resize", this.#handleViewportResize);
      document.removeEventListener("pointerdown", this.#handleOutsidePointerDown);
      this.#presenceUnsubscribe?.();
      this.#presenceUnsubscribe = void 0;
      this.#audio.pause();
      this.#audio.removeAttribute("src");
      this.#clearMusicSleepTimer();
      this.#clearMediaSession();
      this.#releaseMusicObjectUrl();
      this.#roomBadge.destroy();
      this.#host.remove();
      void this.#notificationSounds.destroy();
      this.soundStore.close();
      this.musicStore.close();
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
      if (this.#workspaceView === "room") void this.#renderRoomTools(true);
      if (this.#workspaceView === "music") void this.#renderMusicPage();
    }
    async onMessage(peerNumber, incoming, message) {
      if (incoming && this.presence.getOwnStatus() !== "dnd" && this.settings.get().linkChat.openOnIncoming) {
        await this.openChat(peerNumber, this.adapter.getMemberName(peerNumber));
        return;
      }
      if (this.#activePeer === peerNumber) {
        if (message && this.#messageRenderPeer === peerNumber) this.#appendMessage(message);
        else await this.#renderMessages(peerNumber);
      }
      await this.refresh();
    }
    onReaction(reaction) {
      if (this.presence.getOwnStatus() === "dnd") return;
      this.#toast(
        reaction.action === "room-emote" ? `Reaction \u201C${reaction.ruleLabel}\u201D sent: ${reaction.message}` : reaction.message
      );
    }
    onNotification(notification) {
      if (this.presence.getOwnStatus() === "dnd") return;
      if (notification.showToast) this.#toast(notification.message);
      const sounds = this.settings.get().linkReactions.sounds;
      if (!sounds.enabled) return;
      const preset = notification.kind === "chat" ? sounds.chat : notification.kind === "friend-online" ? sounds.friendOnline : sounds.roomJoin;
      void this.#notificationSounds.play(preset, { volume: sounds.volume });
    }
    async open() {
      const settings = this.settings.get();
      const preference = settings.ui.launcherOpen;
      const requested = preference === "chat" ? "chat" : preference === "last" ? this.#lastWorkspaceView : "home";
      await this.#openPanel(this.#availableWorkspace(requested, settings));
    }
    async #openPanel(view) {
      this.#panel.hidden = false;
      this.#positionPanel();
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
        this.presence.requestMany(result.joined);
      }
      if (this.#workspaceView === "roster" && result.changed) this.#renderRoster();
    }
    async refresh() {
      const [, conversations] = await Promise.all([
        this.#updateUnreadBadge(),
        this.service.listConversations()
      ]);
      await this.#renderConversations(conversations);
      await this.#renderHome(conversations);
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
      brand.setAttribute("title", "Drag to move KikiLink");
      brand.addEventListener("pointerdown", (event) => this.#startPanelDrag(event));
      brand.addEventListener("pointermove", (event) => this.#movePanel(event));
      brand.addEventListener("pointerup", (event) => this.#finishPanelDrag(event));
      brand.addEventListener("pointercancel", (event) => this.#cancelPanelDrag(event));
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
      this.#presenceTriggerLabel.replaceChildren(
        this.#presenceTriggerName,
        this.#presenceTriggerStatus
      );
      this.#presenceTrigger.replaceChildren(
        this.#presenceTriggerAvatar,
        this.#presenceTriggerLabel,
        this.#presenceTriggerDot
      );
      this.#presenceTrigger.addEventListener("click", () => this.#openPresenceDialog());
      this.#renderOwnPresence();
      this.#scheduleClockUpdate();
      const topbar = element(
        "header",
        { className: "kl-topbar" },
        brand,
        this.#contextTitle,
        this.#localClock,
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
      this.#galleryButton.append(
        kikiIcon("image"),
        element("span", { className: "kl-sidebar-gallery-label", text: "Gallery" })
      );
      this.#galleryButton.addEventListener("click", () => void this.#openGallery());
      const newChatButton = element("button", {
        className: "kl-sidebar-new-chat",
        type: "button",
        title: "New Beep chat",
        ariaLabel: "New Beep chat",
        onClick: () => this.#openNewChat()
      }, kikiIcon("plus"));
      const sidebar = element(
        "aside",
        { className: "kl-sidebar" },
        element("div", { className: "kl-search-wrap" }, this.#search),
        element(
          "div",
          { className: "kl-sidebar-heading" },
          element("span", { text: "Recent chats" }),
          element("div", { className: "kl-sidebar-heading-actions" }, this.#galleryButton, newChatButton)
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
      this.#buildGalleryPage();
      this.#buildRoomPage();
      this.#buildMusicPage();
      this.#buildActivitiesPage();
      this.#buildSettingsPage();
      this.#workspace.append(
        this.#home,
        this.#chatLayout,
        this.#galleryPage,
        this.#rosterPage,
        this.#roomPage,
        this.#musicPage,
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
      this.#configureNavButton(this.#roomNavButton, "location", "Room", "room");
      this.#configureNavButton(this.#musicNavButton, "music", "Music", "music");
      this.#configureNavButton(this.#activitiesButton, "activities", "Custom", "activities");
      this.#configureNavButton(this.#settingsNavButton, "settings", "Settings", "settings");
      this.#rosterCount.hidden = true;
      this.#rosterButton.append(this.#rosterCount);
      this.#featureNav.append(
        this.#homeNavButton,
        this.#chatNavButton,
        this.#rosterButton,
        this.#roomNavButton,
        this.#musicNavButton,
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
      if (target === "room") {
        void this.#openRoomTools();
        return;
      }
      if (target === "music") {
        this.#showWorkspace("music");
        void this.#renderMusicPage();
        return;
      }
      if (target === "gallery") {
        void this.#openGallery();
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
        "Custom Activities",
        "Create personal actions that appear beside vanilla Activities.",
        this.#homeActivitiesMetric,
        this.#homeActivitiesAction
      );
      this.#homeActivitiesCard.addEventListener("click", () => this.#activateFeature("activities"));
      this.#fillFeatureCard(
        this.#homeGalleryCard,
        "image",
        "YOUR IMAGE LIBRARY",
        "Gallery",
        "Browse chat images or add a link and local upload directly to your library.",
        this.#homeGalleryMetric,
        element("span", { className: "kl-feature-card-action", text: "Open gallery" })
      );
      this.#homeGalleryCard.addEventListener("click", () => this.#activateFeature("gallery"));
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
          text: "Core tools stay here; Gallery is easy to reach without adding another main tab."
        })
      );
      const cards = element(
        "section",
        { className: "kl-feature-grid", ariaLabel: "KikiLink tools" },
        chatCard,
        this.#homeRosterCard,
        this.#homeActivitiesCard,
        this.#homeGalleryCard,
        settingsCard
      );
      const privacy = element(
        "div",
        { className: "kl-home-privacy" },
        kikiIcon("lock", "kl-home-privacy-icon"),
        element(
          "span",
          {},
          "Account-private by design \xB7 data belongs to this BC MemberNumber; presence is shared only with compatible KikiLink users."
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
      this.#galleryPage.hidden = view !== "gallery";
      this.#rosterPage.hidden = view !== "roster";
      this.#roomPage.hidden = view !== "room";
      this.#musicPage.hidden = view !== "music";
      this.#activitiesPage.hidden = view !== "activities";
      this.#settingsPage.hidden = view !== "settings";
      if (view === "chat" && this.#activePeer === void 0) {
        this.#panel.dataset.mobileView = "list";
      }
      this.#contextTitle.textContent = view === "home" ? "Home" : view === "chat" ? "Chat" : view === "gallery" ? "Media Gallery" : view === "roster" ? "Players" : view === "room" ? "Room Tools" : view === "music" ? "Music" : view === "activities" ? "Custom Activities" : "Settings";
      this.#updateNavigation();
    }
    #updateNavigation() {
      for (const button of this.#featureNav.querySelectorAll(".kl-nav-item")) {
        const active = button.dataset.target === this.#workspaceView || this.#workspaceView === "gallery" && button.dataset.target === "chat";
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
        selectOption2("dark", "Dark lacquer"),
        selectOption2("light", "Light paper"),
        selectOption2("system", "Follow system")
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
        selectOption2("comfortable", "Comfortable"),
        selectOption2("compact", "Compact"),
        selectOption2("super-compact", "Super compact")
      );
      this.#densitySelect.dataset.setting = "density";
      this.#densitySelect.setAttribute("aria-label", "Interface spacing");
      const density = this.#settingRow(
        "Spacing",
        "Comfortable is roomy; Compact fits more; Super compact keeps only the essentials.",
        this.#densitySelect
      );
      this.#textScaleSelect.replaceChildren(
        selectOption2("normal", "Default"),
        selectOption2("large", "Large"),
        selectOption2("extra-large", "Extra large")
      );
      this.#textScaleSelect.dataset.setting = "text-scale";
      this.#textScaleSelect.setAttribute("aria-label", "Text size");
      const textScale = this.#settingRow(
        "Text size",
        "Increase labels and supporting text throughout the deck.",
        this.#textScaleSelect
      );
      this.#homeLayoutSelect.replaceChildren(
        selectOption2("showcase", "Guided"),
        selectOption2("compact", "Focused")
      );
      this.#homeLayoutSelect.dataset.setting = "home-layout";
      this.#homeLayoutSelect.setAttribute("aria-label", "Home style");
      const homeLayout = this.#settingRow(
        "Home style",
        "Guided suggests a useful next step; Focused keeps only the essentials.",
        this.#homeLayoutSelect
      );
      this.#launcherSideSelect.replaceChildren(
        selectOption2("right", "Right"),
        selectOption2("left", "Left")
      );
      this.#launcherSideSelect.dataset.setting = "launcher-side";
      this.#launcherSideSelect.setAttribute("aria-label", "Launcher side");
      const launcherSide = this.#settingRow(
        "Launcher side",
        "Choose its default side. You can still drag the emblem anywhere.",
        this.#launcherSideSelect
      );
      this.#launcherOpenSelect.replaceChildren(
        selectOption2("home", "Link Deck home"),
        selectOption2("last", "Last section"),
        selectOption2("chat", "LinkChat directly")
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
      this.#roomBadgeToggle.type = "checkbox";
      this.#roomBadgeToggle.setAttribute("aria-label", "Show KikiLink Blossom");
      const roomBadgeSwitch = element(
        "label",
        { className: "kl-switch" },
        this.#roomBadgeToggle,
        element("span", { className: "kl-switch-track" })
      );
      const moveRoomBadge = element("button", {
        className: "kl-text-button kl-text-button--primary",
        type: "button",
        text: "Move flower",
        onClick: () => this.#beginRoomBadgePlacement()
      });
      const resetRoomBadge = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Reset flower position",
        onClick: () => this.#resetRoomBadgePosition()
      });
      const roomBadgeSection = element(
        "section",
        { className: "kl-setting-section kl-room-badge-settings" },
        element("div", { className: "kl-setting-section-title", text: "Blossom badge" }),
        this.#settingRow(
          "Show Blossom flower",
          "A small translucent KikiLink mark beside the addon icons above compatible characters.",
          roomBadgeSwitch
        ),
        element(
          "div",
          { className: "kl-setting-action-row" },
          element(
            "div",
            { className: "kl-setting-copy" },
            element("div", { className: "kl-setting-name", text: "Flower position" }),
            element("div", {
              className: "kl-setting-help",
              text: "Choose Move flower while you are in a room, then drag the flower above your character once. Normal gameplay cannot move it."
            })
          ),
          element("div", { className: "kl-inline-actions" }, moveRoomBadge, resetRoomBadge)
        )
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
        "Stored for this BC account; recent history is mirrored to your other devices.",
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
        selectOption2("ask", "Ask before loading"),
        selectOption2("always", "Always show"),
        selectOption2("never", "Links only")
      );
      this.#imagePreviewSelect.setAttribute("aria-label", "Remote image previews");
      const imagePreviews = this.#settingRow(
        "Image previews",
        "Controls images shared in chats. Small KikiLink profile avatars load automatically so player lists stay recognizable.",
        this.#imagePreviewSelect
      );
      this.#imageUploadsToggle.type = "checkbox";
      this.#imageUploadsToggle.setAttribute("aria-label", "Enable temporary local image uploads");
      this.#imageUploadsToggle.addEventListener(
        "change",
        () => this.#renderImageUploadSettingsOptions()
      );
      const imageUploadsSwitch = element(
        "label",
        { className: "kl-switch" },
        this.#imageUploadsToggle,
        element("span", { className: "kl-switch-track" })
      );
      this.#imageUploadRetentionSelect.replaceChildren(
        selectOption2("1h", "1 hour"),
        selectOption2("12h", "12 hours"),
        selectOption2("24h", "24 hours"),
        selectOption2("72h", "3 days")
      );
      this.#imageUploadRetentionSelect.setAttribute("aria-label", "Temporary image lifetime");
      const litterboxLink = element("a", {
        className: "kl-inline-link",
        text: "Litterbox by Catbox"
      });
      litterboxLink.href = "https://litterbox.catbox.moe/";
      litterboxLink.target = "_blank";
      litterboxLink.rel = "noopener noreferrer";
      this.#imageUploadSettingsOptions.append(
        this.#settingRow(
          "Link lifetime",
          "The host removes the temporary file after this period.",
          this.#imageUploadRetentionSelect
        ),
        element(
          "p",
          { className: "kl-image-upload-privacy" },
          kikiIcon("lock"),
          element(
            "span",
            {},
            "Only Upload & send makes a network request. KikiLink removes the filename and metadata, resizes to 2560 px, then sends the public file to ",
            litterboxLink,
            ". Catbox can see your IP and image; expiration cannot remove copies someone already saved."
          )
        )
      );
      const imageUploads = element(
        "section",
        { className: "kl-setting-section kl-image-upload-settings" },
        element("div", {
          className: "kl-setting-section-title",
          text: "Temporary local images"
        }),
        this.#settingRow(
          "Upload local files",
          "Upload through Litterbox without creating an account.",
          imageUploadsSwitch
        ),
        this.#imageUploadSettingsOptions
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
        reducedMotion,
        roomBadgeSection
      );
      const resetLauncher = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Reset launcher position",
        onClick: () => this.#resetLauncherPosition()
      });
      const resetPanel = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Reset window position",
        onClick: () => this.#resetPanelPosition()
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
        ),
        element(
          "div",
          { className: "kl-setting-action-row" },
          element(
            "div",
            { className: "kl-setting-copy" },
            element("div", { className: "kl-setting-name", text: "Window position" }),
            element("div", {
              className: "kl-setting-help",
              text: "Drag the KikiLink title bar on desktop, or return the window to its default corner."
            })
          ),
          resetPanel
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
        "Store the last room, time, and encounter count only for this BC account.",
        rosterTrackingSwitch
      );
      this.#rosterRetentionSelect.replaceChildren(
        selectOption2("30", "30 days"),
        selectOption2("90", "90 days"),
        selectOption2("180", "180 days"),
        selectOption2("365", "1 year"),
        selectOption2("730", "2 years"),
        selectOption2("0", "Keep forever")
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
            text: "Download or merge a manual JSON backup of this account's player notebook."
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
        "Control what the player workspace remembers for this BC account.",
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
        "Keep this account's Beep history useful and under your control.",
        enterToSend,
        typingIndicators,
        imagePreviews,
        imageUploads,
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
      this.#activitiesToggle.setAttribute("aria-label", "Show Custom Activities tab");
      const activitiesEnabled = this.#settingRow(
        "Show Custom Activities tab",
        "Keep your personal activity builder in the KikiLink toolbar.",
        activitiesSwitch
      );
      const openCustomActivities = element("button", {
        className: "kl-text-button kl-text-button--primary",
        type: "button",
        text: "Open Custom Activities",
        onClick: () => this.#openActivities()
      });
      const activitiesSection = this.#createSettingsPanel(
        "activities",
        "Custom Activities",
        "Create personal actions without replacing or cluttering Bondage Club's vanilla Activities.",
        activitiesEnabled,
        element("div", {
          className: "kl-presence-caveat",
          text: "Your account's list starts empty. Blossom marks every custom action in the native menu."
        }),
        openCustomActivities
      );
      this.#friendOnlineAlertToggle.type = "checkbox";
      const friendOnlineSwitch = element(
        "label",
        { className: "kl-switch" },
        this.#friendOnlineAlertToggle,
        element("span", { className: "kl-switch-track" })
      );
      this.#friendOnlineAlertToggle.setAttribute("aria-label", "Friend online alerts");
      const friendOnlineAlerts = this.#settingRow(
        "Friends come online",
        "Show a small local notice when a friend appears online.",
        friendOnlineSwitch
      );
      this.#roomJoinAlertToggle.type = "checkbox";
      const roomJoinSwitch = element(
        "label",
        { className: "kl-switch" },
        this.#roomJoinAlertToggle,
        element("span", { className: "kl-switch-track" })
      );
      this.#roomJoinAlertToggle.setAttribute("aria-label", "Room join alerts");
      const roomJoinAlerts = this.#settingRow(
        "Someone joins your room",
        "Show a small local notice after a player joins the current room.",
        roomJoinSwitch
      );
      this.#notificationSoundsToggle.type = "checkbox";
      const notificationSoundsSwitch = element(
        "label",
        { className: "kl-switch" },
        this.#notificationSoundsToggle,
        element("span", { className: "kl-switch-track" })
      );
      this.#notificationSoundsToggle.setAttribute("aria-label", "Notification sounds");
      this.#notificationSoundsToggle.addEventListener("change", () => {
        if (this.#notificationSoundsToggle.checked) void this.#notificationSounds.unlock();
      });
      const notificationSounds = this.#settingRow(
        "Notification sounds",
        "Use a different gentle sound for chats and the alerts above.",
        notificationSoundsSwitch
      );
      this.#soundVolumeInput.type = "range";
      this.#soundVolumeInput.min = "0";
      this.#soundVolumeInput.max = "100";
      this.#soundVolumeInput.step = "1";
      this.#soundVolumeInput.setAttribute("aria-label", "Alert volume");
      this.#soundVolumeInput.addEventListener("input", () => {
        this.#soundVolumeValue.textContent = `${this.#soundVolumeInput.value}%`;
      });
      const soundVolume = this.#settingRow(
        "Alert volume",
        "Applies to built-in and local custom notification sounds.",
        element(
          "label",
          { className: "kl-volume-control" },
          this.#soundVolumeInput,
          this.#soundVolumeValue
        )
      );
      const soundEntries = Object.entries(NOTIFICATION_SOUND_LABELS);
      for (const select of [
        this.#chatSoundSelect,
        this.#friendOnlineSoundSelect,
        this.#roomJoinSoundSelect
      ]) {
        select.replaceChildren(
          ...soundEntries.map(([value, label]) => selectOption2(value, label))
        );
      }
      this.#chatSoundSelect.setAttribute("aria-label", "Chat notification sound");
      this.#friendOnlineSoundSelect.setAttribute("aria-label", "Friend online sound");
      this.#roomJoinSoundSelect.setAttribute("aria-label", "Room join sound");
      const soundChoice = (label, select) => element(
        "div",
        { className: "kl-sound-choice" },
        element("span", { className: "kl-setting-name", text: label }),
        element(
          "div",
          { className: "kl-sound-choice-controls" },
          select,
          element("button", {
            className: "kl-text-button kl-sound-preview",
            type: "button",
            text: "Play",
            ariaLabel: `Preview ${label.toLocaleLowerCase()} sound`,
            onClick: () => void this.#notificationSounds.play(soundChoiceOr(select.value, "chime"), {
              volume: Number(this.#soundVolumeInput.value)
            })
          })
        )
      );
      const soundChoices = element(
        "details",
        { className: "kl-settings-disclosure kl-sound-settings" },
        element(
          "summary",
          {},
          element("span", { text: "Choose sounds" }),
          element("span", { className: "kl-disclosure-meta", text: "Optional" })
        ),
        element(
          "div",
          { className: "kl-sound-choices" },
          soundChoice("Incoming chat", this.#chatSoundSelect),
          soundChoice("Friend online", this.#friendOnlineSoundSelect),
          soundChoice("Room join", this.#roomJoinSoundSelect)
        )
      );
      this.#customSoundInput.type = "file";
      this.#customSoundInput.accept = "audio/*";
      this.#customSoundInput.hidden = true;
      this.#customSoundInput.addEventListener("change", () => void this.#addCustomSound());
      const addCustomSound = element("button", {
        className: "kl-text-button kl-text-button--primary",
        type: "button",
        text: "Add local sound",
        onClick: () => this.#customSoundInput.click()
      });
      const customSounds = element(
        "details",
        { className: "kl-settings-disclosure kl-custom-sounds" },
        element(
          "summary",
          {},
          element("span", { text: "My sounds" }),
          element("span", { className: "kl-disclosure-meta", text: "Device only" })
        ),
        element(
          "div",
          { className: "kl-custom-sounds-body" },
          element("p", {
            className: "kl-setting-help",
            text: "Audio must be 5 seconds or shorter and under 10 MB. The file stays in this browser and is never synchronized."
          }),
          addCustomSound,
          this.#customSoundInput,
          this.#customSoundList
        )
      );
      this.#reactionsToggle.type = "checkbox";
      const reactionsSwitch = element(
        "label",
        { className: "kl-switch" },
        this.#reactionsToggle,
        element("span", { className: "kl-switch-track" })
      );
      this.#reactionsToggle.setAttribute("aria-label", "Enable advanced reaction rules");
      const reactionsEnabled = this.#settingRow(
        "Enable custom rules",
        "Run your own ordered event rules. Leave this off if the quick alerts are enough.",
        reactionsSwitch
      );
      const addReactionRule = element("button", {
        className: "kl-text-button kl-add-action kl-add-reaction-rule",
        type: "button",
        text: "+ Add event rule",
        onClick: () => this.#addReactionRuleEditorRow()
      });
      const reactionRules = element(
        "section",
        { className: "kl-setting-section kl-setting-editor-section kl-reaction-rules" },
        element(
          "div",
          { className: "kl-reaction-rules-heading" },
          element("div", { className: "kl-setting-section-title", text: "Custom rules" })
        ),
        element("div", {
          className: "kl-setting-help",
          text: "Triggers: incoming Beep, room join/leave, or friend online. Variables: {name}, {member}, {message}, {room}, {me}, {event}."
        }),
        this.#reactionRulesEditor,
        addReactionRule
      );
      const reactionSafety = element(
        "div",
        { className: "kl-reaction-safety" },
        kikiIcon("lock", "kl-reaction-safety-icon"),
        element(
          "span",
          {},
          "Local notices stay private. Public room emotes never expose {message} and keep the 10-second send guard."
        )
      );
      const advancedReactions = element(
        "details",
        { className: "kl-settings-disclosure kl-reaction-advanced" },
        element(
          "summary",
          {},
          element("span", { text: "Advanced" }),
          this.#reactionRuleCount
        ),
        element(
          "div",
          { className: "kl-reaction-advanced-content" },
          reactionsEnabled,
          reactionSafety,
          reactionRules
        )
      );
      const reactionsSection = this.#createSettingsPanel(
        "reactions",
        "Notifications",
        "Turn on only the alerts you want. Everything else stays out of the way.",
        friendOnlineAlerts,
        roomJoinAlerts,
        notificationSounds,
        soundVolume,
        soundChoices,
        customSounds,
        advancedReactions
      );
      const aboutMark = element("img", { className: "kl-about-watermark" });
      aboutMark.src = kikilink_emblem_default;
      aboutMark.alt = "";
      aboutMark.decoding = "async";
      aboutMark.draggable = false;
      const creatorNumber = element(
        "span",
        {
          className: "kl-about-creator-number",
          text: `Member ${KIKILINK_CREATOR_MEMBER_NUMBER}`
        }
      );
      const discord = element("a", {
        className: "kl-about-link kl-about-link--discord",
        text: "Join the KikiLink Discord"
      });
      discord.href = "https://discord.gg/6sgGTnptht";
      discord.target = "_blank";
      discord.rel = "noopener noreferrer nofollow";
      discord.append(kikiIcon("external", "kl-about-link-icon"));
      const repository = element("a", {
        className: "kl-about-link",
        text: "Open source repository"
      });
      repository.href = "https://github.com/Lilja000/KikiLink";
      repository.target = "_blank";
      repository.rel = "noopener noreferrer nofollow";
      repository.append(kikiIcon("external", "kl-about-link-icon"));
      const aboutCard = element(
        "section",
        { className: "kl-about-card" },
        aboutMark,
        element(
          "div",
          { className: "kl-about-brand" },
          this.#emblem("kl-about-emblem"),
          element(
            "div",
            {},
            element("div", { className: "kl-about-name", text: "KikiLink" }),
            element("div", { className: "kl-about-tagline", text: "Personal Link Deck for Bondage Club" })
          )
        ),
        element(
          "div",
          { className: "kl-about-creator" },
          element("span", { className: "kl-about-label", text: "CREATED BY" }),
          element("strong", { text: "Kiki" }),
          creatorNumber
        ),
        element(
          "dl",
          { className: "kl-about-facts" },
          aboutFact("Version", this.version),
          aboutFact("Release channel", "Stable"),
          aboutFact("License", "MIT"),
          aboutFact("Data", "Scoped to your signed-in BC account")
        ),
        element("div", { className: "kl-about-links" }, discord, repository),
        element("p", {
          className: "kl-about-note",
          text: "KikiLink is an independent quality-of-life addon. It keeps account data separate and shares Presence only with compatible KikiLink users."
        })
      );
      const aboutSection = this.#createSettingsPanel(
        "about",
        "About KikiLink",
        "Version, creator, community, and project information.",
        aboutCard
      );
      const panels = element(
        "div",
        { className: "kl-settings-panels" },
        appearanceSection,
        navigationSection,
        chatSection,
        rosterSection,
        activitiesSection,
        reactionsSection,
        aboutSection
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
          text: "Saved to this BC account."
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
        activities: { icon: "activities", label: "Activities" },
        reactions: { icon: "reactions", label: "Alerts" },
        about: { icon: "profile", label: "About" }
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
      const title = element("div", { className: "kl-dialog-title", text: "Your KikiLink profile" });
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
            text: "Avatar, status, quiet DND, and a bounded auto-reply in one place."
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
      this.#autoIdleInput.type = "number";
      this.#autoIdleInput.min = "0";
      this.#autoIdleInput.max = "120";
      this.#autoIdleInput.step = "1";
      this.#autoIdleInput.setAttribute("aria-label", "Minutes before automatic Idle");
      this.#presenceAvatarUrl.type = "url";
      this.#presenceAvatarUrl.maxLength = 500;
      this.#presenceAvatarUrl.placeholder = "https://i.imgur.com/avatar.png";
      this.#presenceAvatarUrl.autocomplete = "off";
      this.#presenceAvatarUrl.spellcheck = false;
      this.#presenceAvatarUrl.setAttribute("aria-label", "Direct profile avatar URL");
      this.#presenceAvatarUrl.addEventListener("input", () => this.#renderOwnAvatarPreview());
      this.#afkAutoReplyToggle.type = "checkbox";
      this.#afkAutoReplyToggle.setAttribute("aria-label", "Send an automatic reply while Idle or DND");
      this.#afkAutoReplyToggle.addEventListener("change", () => this.#renderPresenceDialog());
      const afkAutoReplySwitch = element(
        "label",
        { className: "kl-switch" },
        this.#afkAutoReplyToggle,
        element("span", { className: "kl-switch-track" })
      );
      this.#afkAutoReplyMessage.maxLength = 500;
      this.#afkAutoReplyMessage.placeholder = "Hi, I'm AFK. Message me later!";
      this.#afkAutoReplyOptions.append(
        element("span", { className: "kl-custom-field-label", text: "AFK message" }),
        this.#afkAutoReplyMessage,
        element("span", {
          className: "kl-custom-field-help",
          text: "Sent privately at most once per person during each Idle or DND session; your room is never included."
        })
      );
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
        element(
          "section",
          { className: "kl-profile-avatar-field" },
          this.#presenceAvatarPreview,
          element(
            "label",
            { className: "kl-presence-field" },
            element("span", { className: "kl-presence-field-label", text: "Profile avatar" }),
            this.#presenceAvatarUrl,
            element("span", {
              className: "kl-custom-field-help",
              text: "Use a direct HTTPS JPG, PNG, GIF, WebP, or AVIF link from Imgur, Catbox, or another host. Other players' avatars follow your image-preview privacy setting."
            })
          )
        ),
        this.#settingRow(
          "Automatic Idle",
          "Minutes without a tap or keypress. Enter 0 to disable; maximum 120.",
          element("label", {}, this.#autoIdleInput, " min")
        ),
        this.#settingRow(
          "Reply while Idle / DND",
          "Privately answer new Beeps while you are Idle or in Do not disturb.",
          afkAutoReplySwitch
        ),
        this.#afkAutoReplyOptions,
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
        text: "Save profile",
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
      this.#presenceAvatarUrl.value = config.avatarUrl;
      this.#autoIdleInput.value = config.autoIdleMinutes.toString();
      this.#afkAutoReplyToggle.checked = config.afkAutoReply.enabled;
      this.#afkAutoReplyMessage.value = config.afkAutoReply.message;
      this.#renderOwnAvatarPreview();
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
      this.#afkAutoReplyMessage.disabled = !this.#afkAutoReplyToggle.checked;
      this.#afkAutoReplyOptions.dataset.disabled = String(!this.#afkAutoReplyToggle.checked);
    }
    #savePresencePreferences() {
      const autoIdle = Number(this.#autoIdleInput.value);
      const normalizedAvatarUrl = this.#presenceAvatarUrl.value.trim() ? normalizeImageUrl(this.#presenceAvatarUrl.value) : null;
      if (this.#presenceAvatarUrl.value.trim() && (!normalizedAvatarUrl || normalizedAvatarUrl.length > 500)) {
        this.#presenceAvatarUrl.focus();
        this.#toast("Use a direct HTTPS avatar link up to 500 characters ending in an image extension.", "error");
        return;
      }
      const avatarUrl = normalizedAvatarUrl ?? "";
      if (!Number.isInteger(autoIdle) || autoIdle < 0 || autoIdle > 120) {
        this.#autoIdleInput.focus();
        this.#toast("Automatic Idle must be between 0 and 120 minutes.", "error");
        return;
      }
      if (this.#afkAutoReplyToggle.checked && !this.#afkAutoReplyMessage.value.trim()) {
        this.#afkAutoReplyMessage.focus();
        this.#toast("Add a short AFK auto-reply message.", "error");
        return;
      }
      this.presence.setOwnProfile({
        enabled: this.#presenceEnabledToggle.checked,
        statusMessage: this.#presenceMessage.value,
        avatarUrl,
        autoIdleMinutes: autoIdle,
        afkAutoReply: {
          enabled: this.#afkAutoReplyToggle.checked,
          message: this.#afkAutoReplyMessage.value
        }
      });
      this.#renderOwnPresence();
      this.#presenceDialog.close();
      this.#toast("KikiLink profile saved.");
    }
    #buildImageDialog() {
      this.#imageDialogTitle.textContent = "Send an image";
      this.#imageDialogTitle.id = "kikilink-image-title";
      this.#imageDialog.setAttribute("aria-labelledby", this.#imageDialogTitle.id);
      const header = element(
        "header",
        { className: "kl-dialog-header" },
        element(
          "div",
          { className: "kl-dialog-heading" },
          this.#imageDialogTitle,
          this.#imageDialogSubtitle
        ),
        this.#dialogCloseButton("Close image sender", () => this.#requestCloseImageDialog())
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
      this.#imageLinkTab.id = "kikilink-image-source-link";
      this.#imageLinkTab.setAttribute("role", "tab");
      this.#imageLinkTab.setAttribute("aria-controls", "kikilink-image-link-panel");
      this.#imageLinkTab.addEventListener("click", () => this.#setImageSourceMode("link"));
      this.#imageLinkTab.addEventListener(
        "keydown",
        (event) => this.#handleImageSourceTabKey(event)
      );
      this.#imageFileTab.id = "kikilink-image-source-file";
      this.#imageFileTab.setAttribute("role", "tab");
      this.#imageFileTab.setAttribute("aria-controls", "kikilink-image-file-panel");
      this.#imageFileTab.addEventListener("click", () => this.#setImageSourceMode("file"));
      this.#imageFileTab.addEventListener(
        "keydown",
        (event) => this.#handleImageSourceTabKey(event)
      );
      this.#imageLinkPanel.id = "kikilink-image-link-panel";
      this.#imageLinkPanel.setAttribute("role", "tabpanel");
      this.#imageLinkPanel.setAttribute("aria-labelledby", this.#imageLinkTab.id);
      this.#imageLinkPanel.append(
        element(
          "label",
          { className: "kl-presence-field" },
          element("span", { className: "kl-presence-field-label", text: "Direct HTTPS image link" }),
          this.#imageUrlInput
        ),
        this.#imagePreview,
        element("p", {
          className: "kl-image-upload-note",
          text: "Supported links: JPG, PNG, GIF, WebP, and AVIF."
        })
      );
      this.#imageFilePanel.id = "kikilink-image-file-panel";
      this.#imageFilePanel.setAttribute("role", "tabpanel");
      this.#imageFilePanel.setAttribute("aria-labelledby", this.#imageFileTab.id);
      this.#imageFileInput.type = "file";
      this.#imageFileInput.accept = "image/jpeg,image/png,image/webp";
      this.#imageFileInput.hidden = true;
      this.#imageFileInput.addEventListener("change", () => {
        const file = this.#imageFileInput.files?.[0];
        if (file) void this.#prepareLocalImage(file);
      });
      this.#chooseImageFileButton.addEventListener("click", () => this.#imageFileInput.click());
      const setupUploads = element("button", {
        className: "kl-text-button kl-image-upload-setup",
        type: "button",
        text: "Set up local uploads",
        onClick: () => {
          this.#imageDialog.close();
          this.#openSettings("chat");
          this.#imageUploadsToggle.focus();
        }
      });
      this.#imageFilePanel.append(
        this.#localImageStatus,
        element(
          "div",
          { className: "kl-image-file-actions" },
          this.#chooseImageFileButton,
          setupUploads,
          this.#imageFileInput
        ),
        element(
          "p",
          { className: "kl-image-upload-note kl-image-file-privacy" },
          kikiIcon("lock"),
          element("span", {
            text: "Nothing uploads on selection. KikiLink first removes the filename and metadata; Upload & send creates a public temporary Litterbox link."
          })
        )
      );
      const sourceTabs = element(
        "div",
        { className: "kl-image-source-tabs" },
        this.#imageLinkTab,
        this.#imageFileTab
      );
      sourceTabs.setAttribute("role", "tablist");
      sourceTabs.setAttribute("aria-label", "Image source");
      const body = element(
        "div",
        { className: "kl-dialog-body kl-image-body" },
        sourceTabs,
        this.#imageLinkPanel,
        this.#imageFilePanel
      );
      this.#sendImageButton.addEventListener("click", () => void this.#sendImage());
      this.#imageDialog.addEventListener("cancel", (event) => {
        if (this.#imageUploadBusy) event.preventDefault();
      });
      this.#imageDialog.addEventListener("close", () => {
        if (!this.#imageUploadBusy) this.#resetLocalImage();
      });
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
            onClick: () => this.#requestCloseImageDialog()
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
            " from KikiLink recent chats and delete this chat's account-scoped KikiLink history?"
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
        this.#renderAvatar(this.#chatAvatar, displayName, target.memberNumber);
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
      if (target.memberNumber === this.#activePeer) this.#saveDraft.cancel();
      await this.service.removeConversation(target.memberNumber);
      if (target.memberNumber === this.#activePeer) this.#resetActiveConversation();
      this.#removeChatDialog.close();
      await this.refresh();
      this.#toast(`${target.displayName} removed from recent chats.`);
    }
    #openImageDialog(destination = "chat") {
      if (destination === "chat" && this.#activePeer === void 0) {
        this.#toast("Choose a conversation first.", "error");
        return;
      }
      this.#imageDestination = destination;
      this.#imageDialogTitle.textContent = destination === "gallery" ? "Add to Gallery" : "Send an image";
      this.#imageDialogSubtitle.textContent = destination === "gallery" ? "Save a direct link or upload a privacy-prepared local image without sending a chat." : "A normal Beep link for everyone; an inline preview for KikiLink.";
      this.#resetLocalImage();
      this.#imageUrlInput.value = "";
      this.#renderImageComposePreview();
      this.#setImageSourceMode("link");
      if (!this.#imageDialog.open) this.#imageDialog.showModal();
      this.#imageUrlInput.focus();
    }
    #setImageSourceMode(mode) {
      this.#imageSourceMode = mode;
      const linkActive = mode === "link";
      this.#imageLinkPanel.hidden = !linkActive;
      this.#imageFilePanel.hidden = linkActive;
      this.#imageLinkTab.dataset.active = String(linkActive);
      this.#imageFileTab.dataset.active = String(!linkActive);
      this.#imageLinkTab.setAttribute("aria-selected", String(linkActive));
      this.#imageFileTab.setAttribute("aria-selected", String(!linkActive));
      this.#imageLinkTab.tabIndex = linkActive ? 0 : -1;
      this.#imageFileTab.tabIndex = linkActive ? -1 : 0;
      if (linkActive) this.#renderImageComposePreview();
      else this.#renderLocalImageComposeState();
    }
    #handleImageSourceTabKey(event) {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const mode = event.key === "ArrowLeft" || event.key === "Home" ? "link" : "file";
      this.#setImageSourceMode(mode);
      (mode === "link" ? this.#imageLinkTab : this.#imageFileTab).focus();
    }
    #renderImageComposePreview() {
      const url = normalizeImageUrl(this.#imageUrlInput.value);
      if (this.#imageSourceMode === "link") {
        this.#sendImageButton.textContent = this.#imageDestination === "gallery" ? "Save to Gallery" : "Send image";
        this.#sendImageButton.disabled = !url;
      }
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
          element("strong", { text: this.#imageDestination === "gallery" ? "Ready to save" : "Ready to send" }),
          element("small", { text: `${parsed.hostname}${parsed.pathname}` })
        )
      );
      this.#imagePreview.dataset.state = "ready";
    }
    #renderLocalImageComposeState() {
      const settings = this.settings.get().linkChat.imageUploads;
      const config = settings.enabled ? normalizeLitterboxUploadConfig(settings) : null;
      const setupButton = this.#imageFilePanel.querySelector(
        ".kl-image-upload-setup"
      );
      setupButton?.toggleAttribute("hidden", config !== null);
      this.#chooseImageFileButton.hidden = config === null;
      this.#chooseImageFileButton.disabled = this.#imageUploadBusy;
      this.#chooseImageFileButton.textContent = this.#preparedLocalImage ? "Choose another" : "Choose image";
      this.#sendImageButton.textContent = this.#imageDestination === "gallery" ? "Upload & save" : "Upload & send";
      this.#sendImageButton.disabled = this.#imageUploadBusy || config === null || this.#preparedLocalImage === void 0;
      if (this.#imageUploadBusy) {
        this.#localImageStatus.replaceChildren(
          element("span", { className: "kl-image-compose-icon" }, kikiIcon("image")),
          element(
            "span",
            {},
            element("strong", { text: "Uploading prepared image\u2026" }),
            element("small", { text: "The original local file is not being sent." })
          )
        );
        this.#localImageStatus.dataset.state = "loading";
        return;
      }
      if (!config) {
        this.#localImageStatus.replaceChildren(
          element("span", { className: "kl-image-compose-icon" }, kikiIcon("lock")),
          element(
            "span",
            {},
            element("strong", { text: "Temporary upload is off" }),
            element("small", { text: "Enable Litterbox uploads once in Chat settings." })
          )
        );
        this.#localImageStatus.dataset.state = "empty";
        return;
      }
      if (this.#localImageError) {
        this.#localImageStatus.replaceChildren(
          element("span", { className: "kl-image-compose-icon" }, kikiIcon("warning")),
          element(
            "span",
            {},
            element("strong", { text: "Image not ready" }),
            element("small", { text: this.#localImageError })
          )
        );
        this.#localImageStatus.dataset.state = "error";
        return;
      }
      const prepared = this.#preparedLocalImage;
      if (!prepared) {
        this.#localImageStatus.replaceChildren(
          element("span", { className: "kl-image-compose-icon" }, kikiIcon("image")),
          element(
            "span",
            {},
            element("strong", { text: "Choose a local image" }),
            element("small", { text: "JPG, PNG, or WebP \xB7 up to 10 MB" })
          )
        );
        this.#localImageStatus.dataset.state = "empty";
        return;
      }
      const thumbnail = this.#localImageObjectUrl ? element("img", { className: "kl-local-image-thumbnail", ariaLabel: "Prepared image preview" }) : element("span", { className: "kl-image-compose-icon" }, kikiIcon("check"));
      if (thumbnail instanceof HTMLImageElement && this.#localImageObjectUrl) {
        thumbnail.src = this.#localImageObjectUrl;
        thumbnail.alt = "Prepared local image";
      }
      this.#localImageStatus.replaceChildren(
        thumbnail,
        element(
          "span",
          {},
          element("strong", { text: "Prepared locally" }),
          element("small", {
            text: `${prepared.width} \xD7 ${prepared.height} \xB7 ${formatBytes(prepared.blob.size)} \xB7 metadata removed`
          })
        )
      );
      this.#localImageStatus.dataset.state = "ready";
    }
    async #prepareLocalImage(file) {
      this.#resetLocalImage();
      const token = this.#imagePrepareToken;
      this.#chooseImageFileButton.disabled = true;
      this.#sendImageButton.disabled = true;
      this.#localImageStatus.replaceChildren(
        element("span", { className: "kl-image-compose-icon" }, kikiIcon("image")),
        element(
          "span",
          {},
          element("strong", { text: "Preparing safely\u2026" }),
          element("small", { text: "Removing metadata and the original filename locally." })
        )
      );
      this.#localImageStatus.dataset.state = "loading";
      try {
        const prepared = await this.imageUploader.prepare(file);
        if (token !== this.#imagePrepareToken) return;
        this.#preparedLocalImage = prepared;
        if (typeof URL.createObjectURL === "function") {
          this.#localImageObjectUrl = URL.createObjectURL(prepared.blob);
        }
      } catch (error) {
        if (token !== this.#imagePrepareToken) return;
        this.#localImageError = imageUploadErrorMessage(error);
      } finally {
        if (token === this.#imagePrepareToken) {
          this.#imageFileInput.value = "";
          this.#renderLocalImageComposeState();
        }
      }
    }
    #resetLocalImage() {
      this.#imagePrepareToken += 1;
      this.#preparedLocalImage = void 0;
      this.#localImageError = void 0;
      this.#imageFileInput.value = "";
      if (this.#localImageObjectUrl && typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(this.#localImageObjectUrl);
      }
      this.#localImageObjectUrl = void 0;
    }
    #requestCloseImageDialog() {
      if (this.#imageUploadBusy) {
        this.#toast("Wait for the image upload to finish.", "error");
        return;
      }
      this.#imageDialog.close();
    }
    async #sendImage() {
      if (this.#imageSourceMode === "file") {
        await this.#uploadAndSendLocalImage();
        return;
      }
      const url = normalizeImageUrl(this.#imageUrlInput.value);
      if (!url) {
        this.#renderImageComposePreview();
        return;
      }
      if (this.#imageDestination === "gallery") {
        if (!this.#saveGalleryImage(url)) return;
        this.#imageDialog.close();
        this.#toast("Image saved to your Gallery.");
        return;
      }
      const sent = await this.#sendContent(url, false);
      if (!sent) return;
      this.#imageDialog.close();
      this.#toast("Image link sent.");
    }
    async #uploadAndSendLocalImage() {
      const image = this.#preparedLocalImage;
      const uploadSettings = this.settings.get().linkChat.imageUploads;
      const config = uploadSettings.enabled ? normalizeLitterboxUploadConfig(uploadSettings) : null;
      if (!image || !config || this.#imageUploadBusy) {
        this.#renderLocalImageComposeState();
        return;
      }
      this.#imageUploadBusy = true;
      const token = ++this.#imageUploadToken;
      this.#localImageError = void 0;
      this.#renderLocalImageComposeState();
      try {
        const url = await this.imageUploader.upload(image, config);
        if (token !== this.#imageUploadToken) return;
        this.#imageUrlInput.value = url;
        if (this.#imageDestination === "gallery") {
          this.#imageUploadBusy = false;
          if (!this.#saveGalleryImage(url)) {
            this.#setImageSourceMode("link");
            return;
          }
          this.#toast(`Private details removed; temporary ${config.retention} image saved to Gallery.`);
          this.#imageDialog.close();
          return;
        }
        const sent = await this.#sendContent(url, false);
        if (token !== this.#imageUploadToken) return;
        this.#imageUploadBusy = false;
        if (!sent) {
          this.#setImageSourceMode("link");
          this.#toast("Upload finished. The direct link is kept here so it is not lost.", "error");
          return;
        }
        this.#toast(`Private details removed; temporary ${config.retention} link sent.`);
        this.#imageDialog.close();
      } catch (error) {
        if (token !== this.#imageUploadToken) return;
        this.#imageUploadBusy = false;
        this.#localImageError = imageUploadErrorMessage(error);
        this.#renderLocalImageComposeState();
        this.#toast(this.#localImageError, "error");
      }
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
          id: "destination-room",
          kind: "destination",
          icon: "location",
          category: "Destination",
          title: "Room Tools",
          detail: this.adapter.isInChatRoom() ? "Background, music, players, and roles" : "Enter a room first",
          keywords: "room admin background music kick promote whitelist roles customization lobbies rooms directory refresh presets blacklist access",
          priority: 72,
          action: { kind: "workspace", target: "room" }
        },
        {
          id: "destination-music",
          kind: "destination",
          icon: "music",
          category: "Destination",
          title: "Music & Playlists",
          detail: `${settings.linkMusic.playlists.length} playlists \xB7 local files and Catbox`,
          keywords: "music player playlist songs tracks audio catbox local seek shuffle repeat spotify room sync",
          priority: 71,
          action: { kind: "workspace", target: "music" }
        },
        {
          id: "destination-gallery",
          kind: "destination",
          icon: "image",
          category: "Destination",
          title: "Media Gallery",
          detail: "Images you add directly and media from saved LinkChat conversations",
          keywords: "gallery library add upload images pictures catbox litterbox media all chats",
          priority: 70,
          action: { kind: "workspace", target: "gallery" }
        },
        {
          id: "destination-activities",
          kind: "destination",
          icon: "activities",
          category: "Destination",
          title: "Custom Activities",
          detail: settings.linkActivities.enabled ? `${settings.linkActivities.customActivities.length} custom activities` : "Custom activity builder \xB7 currently off",
          keywords: "custom activity activities vanilla body slot arousal blossom",
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
      settings.linkActivities.customActivities.forEach((activity, index) => {
        results.push({
          id: `activity-${index}`,
          kind: "activity",
          icon: "activities",
          category: "Custom Activity",
          title: activity.name,
          detail: `${activity.targetGroup} \xB7 ${activity.template}`,
          keywords: `custom activity vanilla body slot ${activity.targetGroup} ${activity.image} arousal ${activity.template}`,
          priority: 72,
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
          "destination-room",
          "destination-gallery",
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
    #buildGalleryPage() {
      const addImage = element("button", {
        className: "kl-text-button kl-text-button--primary",
        type: "button",
        text: "Add image",
        onClick: () => this.#openImageDialog("gallery")
      });
      const refresh = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Refresh",
        onClick: () => void this.#renderGallery()
      });
      const header = element(
        "header",
        { className: "kl-feature-page-header" },
        element(
          "div",
          { className: "kl-feature-page-heading" },
          element("div", { className: "kl-feature-page-eyebrow", text: "ALL CHATS" }),
          element("h1", { className: "kl-feature-page-title", text: "Media Gallery" }),
          this.#gallerySubtitle
        ),
        element("div", { className: "kl-gallery-header-actions" }, addImage, refresh)
      );
      this.#galleryPage.append(header, this.#galleryGrid);
    }
    async #openGallery() {
      this.#showWorkspace("gallery");
      await this.#renderGallery();
    }
    async #renderGallery() {
      const token = ++this.#galleryRenderToken;
      this.#galleryGrid.setAttribute("aria-busy", "true");
      this.#galleryGrid.replaceChildren(
        element("div", { className: "kl-gallery-empty", text: "Collecting images from LinkChat\u2026" })
      );
      try {
        const settings = this.settings.get();
        const chatItems = await this.service.listMedia(400);
        if (token !== this.#galleryRenderToken) return;
        const hidden = new Set(settings.linkChat.gallery.hiddenUrls);
        const itemsByUrl = /* @__PURE__ */ new Map();
        for (const saved of settings.linkChat.gallery.saved) {
          if (hidden.has(saved.url)) continue;
          itemsByUrl.set(saved.url, {
            url: saved.url,
            provider: galleryMediaProvider(saved.url),
            sortAt: saved.addedAt,
            saved: true
          });
        }
        for (const chat of chatItems) {
          if (hidden.has(chat.url)) continue;
          const existing = itemsByUrl.get(chat.url);
          itemsByUrl.set(chat.url, {
            url: chat.url,
            provider: chat.provider,
            sortAt: Math.max(existing?.sortAt ?? 0, chat.sentAt),
            saved: existing?.saved ?? false,
            chat
          });
        }
        const items = [...itemsByUrl.values()].sort((left, right) => right.sortAt - left.sortAt).slice(0, 400);
        const savedCount = items.filter((item) => item.saved).length;
        this.#gallerySubtitle.textContent = items.length ? `${items.length} unique image${items.length === 1 ? "" : "s"} from your library and saved chats${savedCount ? ` \xB7 ${savedCount} added directly` : ""}.` : "Images from saved chats and anything you add directly will appear here.";
        if (items.length === 0) {
          this.#galleryGrid.replaceChildren(
            element(
              "div",
              { className: "kl-gallery-empty" },
              element("div", { text: "Your Gallery is empty." }),
              element("button", {
                className: "kl-text-button kl-text-button--primary",
                type: "button",
                text: "Add the first image",
                onClick: () => this.#openImageDialog("gallery")
              })
            )
          );
          return;
        }
        let roomAdmin = false;
        try {
          roomAdmin = this.adapter.getRoomAdminSnapshot()?.isAdmin === true;
        } catch {
        }
        this.#galleryGrid.replaceChildren(
          ...items.map((item) => this.#galleryItem(item, roomAdmin))
        );
      } catch (error) {
        if (token !== this.#galleryRenderToken) return;
        this.#galleryGrid.replaceChildren(
          element("div", {
            className: "kl-gallery-empty",
            text: error instanceof Error ? error.message : "The media gallery could not be loaded."
          })
        );
      } finally {
        if (token === this.#galleryRenderToken) {
          this.#galleryGrid.setAttribute("aria-busy", "false");
        }
      }
    }
    #galleryItem(item, roomAdmin) {
      const actions = element("div", { className: "kl-gallery-actions" });
      if (item.chat) {
        actions.append(element("button", {
          className: "kl-text-button",
          type: "button",
          text: "Open chat",
          onClick: () => void this.openChat(item.chat.peerNumber, item.chat.peerName)
        }));
      }
      if (roomAdmin) {
        actions.append(
          element("button", {
            className: "kl-text-button kl-text-button--primary",
            type: "button",
            text: "Use as room background",
            onClick: () => {
              this.#roomImageUrl.value = item.url;
              void this.#openRoomTools(false);
              this.#toast("Image selected. Review it, then apply the room media.");
            }
          })
        );
      }
      actions.append(
        element("button", {
          className: "kl-text-button kl-text-button--danger kl-gallery-remove",
          type: "button",
          text: "Remove",
          ariaLabel: "Remove image from this Gallery",
          onClick: () => this.#removeGalleryImage(item)
        })
      );
      const card = element(
        "article",
        { className: "kl-gallery-item" },
        this.#imageCard(item.url),
        element(
          "div",
          { className: "kl-gallery-meta" },
          element("strong", { text: item.provider === "other" ? "Image" : item.provider }),
          element("span", {
            text: item.chat ? `${item.chat.direction === "outgoing" ? "Sent to" : "From"} ${item.chat.peerName} \xB7 ${formatMessageTime(item.chat.sentAt)}` : `Added to Gallery \xB7 ${formatMessageTime(item.sortAt)}`
          })
        ),
        actions
      );
      card.dataset.galleryUrl = item.url;
      card.dataset.gallerySource = item.saved ? "library" : "chat";
      return card;
    }
    #saveGalleryImage(value, addedAt = Date.now()) {
      const url = normalizeImageUrl(value);
      if (!url || url.length > 500) {
        this.#toast("Use a direct HTTPS image link ending in a supported image extension.", "error");
        return false;
      }
      this.settings.update((draft) => {
        draft.linkChat.gallery.hiddenUrls = draft.linkChat.gallery.hiddenUrls.filter(
          (hiddenUrl) => hiddenUrl !== url
        );
        draft.linkChat.gallery.saved = [
          { url, addedAt },
          ...draft.linkChat.gallery.saved.filter((saved) => saved.url !== url)
        ];
      });
      this.#renderHomeStatus();
      if (this.#workspaceView === "gallery") void this.#renderGallery();
      return true;
    }
    #removeGalleryImage(item) {
      if (!window.confirm(
        "Remove this image from your KikiLink Gallery? The original chat message and hosted file will not be deleted."
      )) {
        return;
      }
      this.settings.update((draft) => {
        draft.linkChat.gallery.saved = draft.linkChat.gallery.saved.filter(
          (saved) => saved.url !== item.url
        );
        draft.linkChat.gallery.hiddenUrls = [
          item.url,
          ...draft.linkChat.gallery.hiddenUrls.filter((url) => url !== item.url)
        ];
      });
      this.#renderHomeStatus();
      void this.#renderGallery();
      this.#toast("Image removed from this Gallery. Its chat message was left untouched.");
    }
    #buildRoomPage() {
      const refresh = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Refresh room",
        onClick: () => {
          if (this.#roomSubView === "lobbies") void this.#refreshLobbies();
          else if (this.#roomSubView === "presets") this.#renderRoomPresets();
          else void this.#renderRoomTools(true);
        }
      });
      const header = element(
        "header",
        { className: "kl-feature-page-header" },
        element(
          "div",
          { className: "kl-feature-page-heading" },
          element("div", { className: "kl-feature-page-eyebrow", text: "CURRENT ROOM" }),
          element("h1", { className: "kl-feature-page-title", text: "Room Tools" }),
          element("p", {
            className: "kl-feature-page-subtitle",
            text: "Background, music, and native room administration without leaving the Link Deck."
          })
        ),
        refresh
      );
      this.#roomImageUrl.type = "url";
      this.#roomImageUrl.placeholder = "https://\u2026/background.webp";
      this.#roomImageUrl.maxLength = 250;
      this.#roomMusicUrl.type = "url";
      this.#roomMusicUrl.placeholder = "https://\u2026/music.mp3";
      this.#roomMusicUrl.maxLength = 250;
      this.#roomSizeMode.replaceChildren(
        selectOption2("1", "Fill / stretch"),
        selectOption2("2", "Fill & crop (keep ratio)"),
        selectOption2("3", "Show full image (keep ratio)")
      );
      this.#roomMusicSync.type = "checkbox";
      const syncSwitch = element(
        "label",
        { className: "kl-switch" },
        this.#roomMusicSync,
        element("span", { className: "kl-switch-track" })
      );
      this.#roomPlaylistSync.type = "checkbox";
      this.#roomPlaylistSync.addEventListener("change", () => {
        this.#roomPlaylistSyncEnabled = this.#roomPlaylistSync.checked;
        if (this.#roomPlaylistSyncEnabled) void this.#syncPlayingTrackToRoom(true);
        else {
          this.#lastRoomSyncedTrackUrl = "";
          this.#roomPlaylistSyncStatus.textContent = "Playlist follow is off.";
        }
      });
      const playlistSyncSwitch = element(
        "label",
        { className: "kl-switch" },
        this.#roomPlaylistSync,
        element("span", { className: "kl-switch-track" })
      );
      this.#roomImageFileInput.type = "file";
      this.#roomImageFileInput.accept = "image/*";
      this.#roomImageFileInput.hidden = true;
      this.#roomImageFileInput.addEventListener("change", () => void this.#uploadRoomBackground());
      this.#roomMusicFileInput.type = "file";
      this.#roomMusicFileInput.accept = "audio/mpeg,audio/mp4,video/mp4,.mp3,.mp4";
      this.#roomMusicFileInput.hidden = true;
      this.#roomMusicFileInput.addEventListener("change", () => void this.#uploadRoomMusic());
      const gallery = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Choose from gallery",
        onClick: () => void this.#openGallery()
      });
      const upload = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Upload image",
        onClick: () => this.#roomImageFileInput.click()
      });
      const uploadMusic = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Upload music",
        onClick: () => this.#roomMusicFileInput.click()
      });
      this.#roomSaveButton.addEventListener("click", () => this.#saveRoomCustomization());
      const mediaForm = element(
        "section",
        { className: "kl-room-media" },
        element("h2", { text: "Room media" }),
        element(
          "label",
          { className: "kl-room-field" },
          element("span", { text: "Background image" }),
          this.#roomImageUrl
        ),
        element(
          "div",
          { className: "kl-inline-actions" },
          gallery,
          upload,
          this.#roomImageFileInput
        ),
        element(
          "label",
          { className: "kl-room-field" },
          element("span", { text: "Background layout" }),
          this.#roomSizeMode
        ),
        element(
          "label",
          { className: "kl-room-field" },
          element("span", { text: "Music URL" }),
          this.#roomMusicUrl
        ),
        element("div", { className: "kl-inline-actions" }, uploadMusic, this.#roomMusicFileInput),
        this.#settingRow(
          "Synchronize music",
          "Ask compatible BC clients to keep room playback aligned.",
          syncSwitch
        ),
        this.#settingRow(
          "Follow KikiLink playlist",
          "While enabled, each compatible remote track you play becomes the room music. This switch is session-only.",
          playlistSyncSwitch
        ),
        this.#roomPlaylistSyncStatus,
        element("p", {
          className: "kl-room-media-note",
          text: "Uploaded backgrounds and music use your temporary Litterbox lifetime. Images are privacy-prepared; audio is renamed but may retain embedded metadata. For a permanent room, use permanent HTTPS links."
        }),
        this.#roomSaveButton
      );
      const players = element(
        "section",
        { className: "kl-room-players" },
        element("h2", { text: "Players & roles" }),
        element("p", {
          className: "kl-setting-help",
          text: "Kick, Admin, and room Whitelist buttons call Bondage Club's native room commands."
        }),
        this.#roomPlayers
      );
      this.#roomCurrentPanel.append(
        this.#roomAdminStatus,
        element("div", { className: "kl-room-grid" }, mediaForm, players)
      );
      this.#buildLobbyPanel();
      this.#buildRoomPresetsPanel();
      for (const [target, label] of [
        ["current", "Room"],
        ["lobbies", "Lobbies"],
        ["presets", "Presets"]
      ]) {
        const button = element("button", {
          className: "kl-room-subnav-button",
          type: "button",
          text: label,
          onClick: () => this.#showRoomSubView(target)
        });
        button.dataset.roomSubview = target;
        this.#roomSubnav.append(button);
      }
      const content = element(
        "div",
        { className: "kl-room-content" },
        this.#roomCurrentPanel,
        this.#roomLobbiesPanel,
        this.#roomPresetsPanel
      );
      this.#roomPage.append(header, this.#roomSubnav, content);
      this.#showRoomSubView("current", false);
    }
    #showRoomSubView(view, refresh = true) {
      this.#roomSubView = view;
      this.#roomCurrentPanel.hidden = view !== "current";
      this.#roomLobbiesPanel.hidden = view !== "lobbies";
      this.#roomPresetsPanel.hidden = view !== "presets";
      for (const button of this.#roomSubnav.querySelectorAll("button")) {
        button.dataset.active = String(button.dataset.roomSubview === view);
      }
      if (!refresh) return;
      if (view === "current") void this.#renderRoomTools(true);
      else if (view === "lobbies") {
        if (this.#lobbyRooms.length > 0) this.#renderLobbies();
        else void this.#refreshLobbies();
      } else {
        this.#renderRoomPresets();
      }
    }
    #buildLobbyPanel() {
      this.#lobbyQuery.type = "search";
      this.#lobbyQuery.placeholder = "Filter rooms or descriptions";
      this.#lobbyQuery.autocomplete = "off";
      this.#lobbyQuery.addEventListener("input", () => this.#renderLobbies());
      this.#lobbyQuery.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void this.#refreshLobbies();
        }
      });
      this.#lobbyRefreshButton.append(kikiIcon("refresh"));
      this.#lobbyRefreshButton.addEventListener("click", () => void this.#refreshLobbies());
      this.#lobbySpaceSelect.replaceChildren(
        selectOption2("", "\u2640 Female"),
        selectOption2("X", "\u2640\u2642 Mixed"),
        selectOption2("M", "\u2642 Male")
      );
      this.#lobbySpaceSelect.value = typeof this.adapter.getRoomSearchSpace === "function" ? this.adapter.getRoomSearchSpace() : "";
      this.#lobbySpaceSelect.addEventListener("change", () => {
        this.#lobbyRooms = [];
        void this.#refreshLobbies();
      });
      this.#roomLobbiesPanel.append(
        element(
          "div",
          { className: "kl-lobby-toolbar" },
          element(
            "div",
            {},
            element("h2", { text: "Live lobbies" }),
            element("p", {
              className: "kl-setting-help",
              text: "Rooms containing your friends stay at the top. KikiLink refreshes only when you ask."
            })
          ),
          element(
            "div",
            { className: "kl-lobby-search-wrap" },
            this.#lobbySpaceSelect,
            this.#lobbyQuery,
            this.#lobbyRefreshButton
          )
        ),
        this.#lobbyStatus,
        this.#lobbyList
      );
    }
    async #refreshLobbies() {
      const token = ++this.#lobbyRenderToken;
      this.#lobbyRefreshButton.disabled = true;
      this.#lobbyStatus.textContent = "Refreshing Bondage Club rooms\u2026";
      this.#lobbyStatus.dataset.state = "loading";
      try {
        const rooms = await this.adapter.searchRooms(
          this.#lobbyQuery.value,
          this.#lobbySpaceSelect.value
        );
        if (token !== this.#lobbyRenderToken) return;
        this.#lobbyRooms = rooms;
        const friendNumbers = rooms.flatMap((room) => room.friends.map((friend) => friend.memberNumber));
        this.presence.requestMany(friendNumbers);
        this.#renderLobbies();
      } catch (error) {
        if (token !== this.#lobbyRenderToken) return;
        this.#lobbyStatus.textContent = error instanceof Error ? error.message : "The room list could not be refreshed.";
        this.#lobbyStatus.dataset.state = "error";
        this.#lobbyList.replaceChildren();
      } finally {
        if (token === this.#lobbyRenderToken) this.#lobbyRefreshButton.disabled = false;
      }
    }
    #renderLobbies() {
      const filter = this.#lobbyQuery.value.trim().toLocaleLowerCase();
      const rooms = this.#lobbyRooms.filter(
        (room) => !filter || `${room.name}
${room.description}
${room.language}`.toLocaleLowerCase().includes(filter)
      );
      const friendRoomCount = rooms.filter((room) => room.friends.length > 0).length;
      this.#lobbyStatus.textContent = rooms.length === 0 ? `No rooms returned for ${lobbySpaceLabel(this.#lobbySpaceSelect.value)}.` : `${rooms.length} rooms \xB7 ${friendRoomCount} with friends`;
      this.#lobbyStatus.dataset.state = rooms.length > 0 ? "ready" : "empty";
      this.#lobbyList.replaceChildren(...rooms.map((room) => this.#lobbyCard(room)));
    }
    #lobbyCard(room) {
      const friends = element("div", { className: "kl-lobby-friends" });
      if (room.friends.length > 0) {
        for (const friend of room.friends.slice(0, 5)) {
          const avatar = this.#avatar(friend.memberName, friend.memberNumber, "kl-lobby-friend-avatar");
          avatar.title = `${friend.memberName} \xB7 #${friend.memberNumber}`;
          friends.append(avatar);
        }
        if (room.friends.length > 5) {
          friends.append(element("span", { className: "kl-lobby-friend-more", text: `+${room.friends.length - 5}` }));
        }
      }
      const flags = [
        room.language,
        room.creator ? `by ${room.creator}` : "",
        room.mapType,
        room.locked ? "Locked" : "",
        room.privateRoom ? "Private" : ""
      ].filter(Boolean);
      const join = element("button", {
        className: "kl-text-button kl-lobby-join",
        type: "button",
        text: room.canJoin ? "Join" : "Unavailable",
        onClick: () => this.#joinLobby(room)
      });
      join.disabled = !room.canJoin;
      const card = element(
        "article",
        { className: "kl-lobby-card" },
        element(
          "div",
          { className: "kl-lobby-card-main" },
          element("strong", { className: "kl-lobby-name", text: room.name }),
          element("span", {
            className: "kl-lobby-count",
            text: `${room.memberCount}/${room.memberLimit}`
          }),
          room.friends.length > 0 ? element("span", { className: "kl-lobby-friend-label", text: `${room.friends.length} friend${room.friends.length === 1 ? "" : "s"}` }) : null
        ),
        room.description ? element("p", { className: "kl-lobby-description", text: room.description }) : null,
        element(
          "div",
          { className: "kl-lobby-card-footer" },
          element("span", { className: "kl-lobby-flags", text: flags.join(" \xB7 ") || "Public room" }),
          friends,
          join
        )
      );
      card.dataset.hasFriends = String(room.friends.length > 0);
      return card;
    }
    #joinLobby(room) {
      if (this.adapter.isInChatRoom() && typeof confirm === "function" && !confirm(`Leave the current room and join \u201C${room.name}\u201D?`)) {
        return;
      }
      try {
        this.adapter.joinRoom(room.name);
        this.#toast(`Joining ${room.name}\u2026`);
        this.close();
      } catch (error) {
        this.#toast(error instanceof Error ? error.message : "Could not join this room.", "error");
      }
    }
    #buildRoomPresetsPanel() {
      this.#presetName.type = "text";
      this.#presetName.placeholder = "Preset name (for example: Moon Garden)";
      this.#presetName.maxLength = 60;
      this.#saveRoomPresetButton.addEventListener("click", () => this.#saveCurrentRoomPreset());
      this.#roomPresetsPanel.append(
        element(
          "div",
          { className: "kl-room-preset-create" },
          element(
            "div",
            {},
            element("h2", { text: "Room presets" }),
            element("p", {
              className: "kl-setting-help",
              text: "Save the room name, description, BC background, custom media, limits, access, admins, whitelist, and blacklist. Passwords and large map layouts are never copied."
            })
          ),
          element("div", { className: "kl-room-preset-create-actions" }, this.#presetName, this.#saveRoomPresetButton)
        ),
        this.#roomPresetList
      );
    }
    #saveCurrentRoomPreset() {
      const snapshot = this.adapter.getRoomAdminSnapshot();
      if (!snapshot) {
        this.#toast("Enter a chat room before saving a preset.", "error");
        return;
      }
      const label = this.#presetName.value.trim() || snapshot.roomName;
      const preset = {
        id: createLocalId("room"),
        label: label.slice(0, 60),
        savedAt: Date.now(),
        room: structuredClone(snapshot.settings)
      };
      this.settings.update((draft) => {
        draft.linkRoom.presets = [preset, ...draft.linkRoom.presets].slice(0, 12);
      });
      this.#presetName.value = "";
      this.#renderRoomPresets();
      this.#toast(`Saved room preset \u201C${preset.label}\u201D.`);
    }
    #renderRoomPresets() {
      const presets = this.settings.get().linkRoom.presets;
      if (presets.length === 0) {
        this.#roomPresetList.replaceChildren(
          element("div", { className: "kl-gallery-empty", text: "No room presets yet." })
        );
        return;
      }
      this.#roomPresetList.replaceChildren(...presets.map((preset) => this.#roomPresetCard(preset)));
    }
    #roomPresetCard(preset) {
      const detail = [
        `${preset.room.limit} players`,
        preset.room.language || "Any language",
        `${preset.room.admins.length} admins`,
        `${preset.room.whitelist.length} whitelist`,
        `${preset.room.blacklist.length} blacklist`
      ].join(" \xB7 ");
      return element(
        "article",
        { className: "kl-room-preset-card" },
        element(
          "div",
          { className: "kl-room-preset-copy" },
          element("strong", { text: preset.label }),
          element("span", { text: preset.room.name }),
          element("small", { text: detail })
        ),
        element(
          "div",
          { className: "kl-room-preset-actions" },
          element("button", {
            className: "kl-text-button kl-text-button--primary",
            type: "button",
            text: "Apply",
            onClick: () => this.#applyRoomPreset(preset)
          }),
          element("button", {
            className: "kl-icon-button",
            type: "button",
            title: "Delete preset",
            ariaLabel: `Delete ${preset.label}`,
            onClick: () => this.#deleteRoomPreset(preset)
          }, kikiIcon("trash"))
        )
      );
    }
    #applyRoomPreset(preset) {
      if (typeof confirm === "function" && !confirm(`Apply \u201C${preset.label}\u201D to the current room? This updates the live room settings.`)) {
        return;
      }
      try {
        this.adapter.applyRoomPreset(preset.room);
        this.#toast(`Applying room preset \u201C${preset.label}\u201D\u2026`);
        setTimeout(() => void this.#renderRoomTools(true), 700);
      } catch (error) {
        this.#toast(error instanceof Error ? error.message : "The room preset could not be applied.", "error");
      }
    }
    #deleteRoomPreset(preset) {
      if (typeof confirm === "function" && !confirm(`Delete room preset \u201C${preset.label}\u201D?`)) return;
      this.settings.update((draft) => {
        draft.linkRoom.presets = draft.linkRoom.presets.filter((candidate) => candidate.id !== preset.id);
      });
      this.#renderRoomPresets();
    }
    async #openRoomTools(refreshFields = true) {
      this.#showWorkspace("room");
      await this.#renderRoomTools(refreshFields);
    }
    async #renderRoomTools(refreshFields) {
      const snapshot = this.adapter.getRoomAdminSnapshot();
      if (!snapshot) {
        this.#roomAdminStatus.textContent = "Enter a chat room to use Room Tools.";
        this.#roomAdminStatus.dataset.state = "empty";
        this.#roomPlayers.replaceChildren(
          element("div", { className: "kl-gallery-empty", text: "No active room." })
        );
        this.#setRoomControlsEnabled(false);
        this.#roomPlaylistSyncEnabled = false;
        this.#roomPlaylistSync.checked = false;
        this.#roomPlaylistSyncStatus.textContent = "Enter a room to follow the playlist.";
        return;
      }
      this.#roomAdminStatus.textContent = snapshot.isAdmin ? `${snapshot.roomName} \xB7 You are a room administrator` : `${snapshot.roomName} \xB7 View only (administrator rights required to make changes)`;
      this.#roomAdminStatus.dataset.state = snapshot.isAdmin ? "admin" : "readonly";
      this.#setRoomControlsEnabled(snapshot.isAdmin);
      this.#roomPlaylistSync.checked = snapshot.isAdmin && this.#roomPlaylistSyncEnabled;
      this.#roomPlaylistSyncStatus.textContent = snapshot.isAdmin ? this.#roomPlaylistSyncEnabled ? "Following the Music tab. A new compatible track will update this room automatically." : "Playlist follow is off." : "Only a room administrator can make room music follow the playlist.";
      if (!snapshot.isAdmin) this.#roomPlaylistSyncEnabled = false;
      if (refreshFields) {
        this.#roomImageUrl.value = snapshot.customization.imageUrl;
        this.#roomMusicUrl.value = snapshot.customization.musicUrl;
        this.#roomSizeMode.value = snapshot.customization.sizeMode.toString();
        this.#roomMusicSync.checked = snapshot.customization.musicSync;
      }
      this.#roomPlayers.replaceChildren(
        ...snapshot.players.map((player) => this.#roomPlayerRow(player, snapshot.isAdmin))
      );
      this.presence.requestMany(snapshot.players.map((player) => player.memberNumber));
      if (snapshot.players.length === 0) {
        this.#roomPlayers.append(
          element("div", { className: "kl-gallery-empty", text: "No other players are in this room." })
        );
      }
    }
    #setRoomControlsEnabled(enabled) {
      for (const control of [
        this.#roomImageUrl,
        this.#roomMusicUrl,
        this.#roomSizeMode,
        this.#roomMusicSync,
        this.#roomSaveButton,
        this.#roomImageFileInput,
        this.#roomMusicFileInput,
        this.#roomPlaylistSync
      ]) {
        control.disabled = !enabled;
      }
      for (const button of this.#roomPage.querySelectorAll(
        ".kl-room-media .kl-inline-actions button"
      )) {
        button.disabled = !enabled;
      }
    }
    #roomPlayerRow(player, canManage) {
      const presence = this.presence.get(player.memberNumber);
      const actions = element("div", { className: "kl-room-player-actions" });
      if (canManage) {
        actions.append(
          this.#roomActionButton(player, player.admin ? "demote" : "promote", player.admin ? "Remove admin" : "Make admin"),
          this.#roomActionButton(
            player,
            player.whitelisted ? "unwhitelist" : "whitelist",
            player.whitelisted ? "Remove whitelist" : "Whitelist"
          ),
          this.#roomActionButton(player, "kick", "Kick", true)
        );
      }
      const badges = element("div", { className: "kl-room-player-badges" });
      const status = element("span", { text: presenceLabel(presence.status) });
      status.dataset.status = presence.status;
      status.dataset.presenceLabel = "true";
      status.hidden = presence.status === "unknown";
      badges.append(status);
      if (player.admin) badges.append(element("span", { text: "ADMIN" }));
      if (player.whitelisted) badges.append(element("span", { text: "WHITELIST" }));
      const row = element(
        "article",
        { className: "kl-room-player" },
        element(
          "div",
          { className: "kl-avatar-wrap" },
          this.#avatar(player.memberName, player.memberNumber),
          presenceDot(presence.status)
        ),
        element(
          "div",
          { className: "kl-room-player-copy" },
          element("strong", { text: player.memberName }),
          element("span", { text: `#${player.memberNumber}` }),
          badges
        ),
        actions
      );
      row.dataset.memberNumber = player.memberNumber.toString();
      return row;
    }
    #roomActionButton(player, action, label, danger = false) {
      return element("button", {
        className: `kl-text-button${danger ? " kl-text-button--danger" : ""}`,
        type: "button",
        text: label,
        onClick: () => void this.#runRoomMemberAction(player, action)
      });
    }
    async #runRoomMemberAction(player, action) {
      if (action === "kick" && typeof confirm === "function" && !confirm(`Kick ${player.memberName} from the room?`)) {
        return;
      }
      try {
        this.adapter.runRoomMemberAction(player.memberNumber, action);
        this.#toast(`${roomActionPastTense(action)} ${player.memberName}.`);
        setTimeout(() => void this.#renderRoomTools(true), 700);
      } catch (error) {
        this.#toast(error instanceof Error ? error.message : "The room action failed.", "error");
      }
    }
    #saveRoomCustomization() {
      try {
        this.adapter.updateRoomCustomization({
          imageUrl: this.#roomImageUrl.value,
          musicUrl: this.#roomMusicUrl.value,
          sizeMode: Number(this.#roomSizeMode.value),
          musicSync: this.#roomMusicSync.checked
        });
        this.#toast("Room background and music update sent to Bondage Club.");
      } catch (error) {
        this.#toast(error instanceof Error ? error.message : "Room media could not be updated.", "error");
      }
    }
    async #uploadRoomBackground() {
      const file = this.#roomImageFileInput.files?.[0];
      this.#roomImageFileInput.value = "";
      if (!file) return;
      const settings = this.settings.get().linkChat.imageUploads;
      const config = settings.enabled ? normalizeLitterboxUploadConfig(settings) : null;
      if (!config) {
        this.#toast("Enable temporary local image uploads in Chat settings first.", "error");
        this.#openSettings("chat");
        return;
      }
      try {
        this.#roomAdminStatus.textContent = "Preparing and uploading the room background\u2026";
        const prepared = await this.imageUploader.prepare(file);
        const url = await this.imageUploader.upload(prepared, config);
        this.#roomImageUrl.value = url;
        await this.#renderRoomTools(false);
        this.#toast("Background uploaded. Apply room media when ready.");
      } catch (error) {
        this.#toast(
          error instanceof Error ? error.message : "The room background could not be uploaded.",
          "error"
        );
        await this.#renderRoomTools(false);
      }
    }
    async #uploadRoomMusic() {
      const file = this.#roomMusicFileInput.files?.[0];
      this.#roomMusicFileInput.value = "";
      if (!file) return;
      const settings = this.settings.get().linkChat.imageUploads;
      const config = settings.enabled ? normalizeLitterboxUploadConfig(settings) : null;
      if (!config) {
        this.#toast("Enable temporary local uploads in Chat settings first.", "error");
        this.#openSettings("chat");
        return;
      }
      try {
        this.#roomAdminStatus.textContent = "Uploading temporary room music\u2026";
        this.#roomMusicUrl.value = await uploadLocalRoomAudio(file, config);
        await this.#renderRoomTools(false);
        this.#toast("Music uploaded. Apply room media when ready.");
      } catch (error) {
        this.#toast(
          error instanceof Error ? error.message : "The room music could not be uploaded.",
          "error"
        );
        await this.#renderRoomTools(false);
      }
    }
    #buildMusicPage() {
      const header = element(
        "header",
        { className: "kl-feature-page-header" },
        element(
          "div",
          { className: "kl-feature-page-heading" },
          element("div", { className: "kl-feature-page-eyebrow", text: "YOUR MUSIC" }),
          element("h1", { className: "kl-feature-page-title", text: "Music & Playlists" }),
          element("p", {
            className: "kl-feature-page-subtitle",
            text: "A small private player for local files and direct or Catbox tracks."
          })
        ),
        this.#newPlaylistButton
      );
      this.#playlistSelect.addEventListener("change", () => {
        this.settings.update((draft) => {
          draft.linkMusic.activePlaylistId = this.#playlistSelect.value;
        });
        void this.#renderMusicPage();
      });
      this.#newPlaylistButton.addEventListener("click", () => this.#createPlaylist());
      const renamePlaylist = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Rename",
        onClick: () => this.#renameActivePlaylist()
      });
      const duplicatePlaylist = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Duplicate",
        onClick: () => this.#duplicateActivePlaylist()
      });
      const clearPlaylist = element("button", {
        className: "kl-text-button",
        type: "button",
        text: "Clear",
        onClick: () => void this.#clearActivePlaylist()
      });
      const deletePlaylist = element("button", {
        className: "kl-text-button kl-text-button--danger",
        type: "button",
        text: "Delete",
        onClick: () => void this.#deleteActivePlaylist()
      });
      this.#musicTitleInput.type = "text";
      this.#musicTitleInput.placeholder = "Track title (optional)";
      this.#musicTitleInput.maxLength = 80;
      this.#musicUrlInput.type = "url";
      this.#musicUrlInput.placeholder = "https://\u2026/track.mp3";
      this.#musicUrlInput.maxLength = 500;
      this.#musicFileInput.type = "file";
      this.#musicFileInput.accept = "audio/*,video/mp4,.aac,.flac,.m4a,.mp3,.mp4,.oga,.ogg,.opus,.wav,.webm";
      this.#musicFileInput.multiple = true;
      this.#musicFileMode.replaceChildren(
        selectOption2("local", "Keep only on this device"),
        selectOption2("catbox", "Upload permanently to Catbox")
      );
      this.#musicAddButton.addEventListener("click", () => void this.#addMusicTrack());
      this.#musicQueueSearch.type = "search";
      this.#musicQueueSearch.placeholder = "Search this playlist";
      this.#musicQueueSearch.autocomplete = "off";
      this.#musicQueueSearch.addEventListener("input", () => void this.#renderMusicPage());
      const library = element(
        "section",
        { className: "kl-music-library" },
        element(
          "div",
          { className: "kl-music-playlist-toolbar" },
          element("label", {}, element("span", { text: "Playlist" }), this.#playlistSelect),
          element(
            "div",
            { className: "kl-music-playlist-actions" },
            renamePlaylist,
            duplicatePlaylist,
            clearPlaylist,
            deletePlaylist
          )
        ),
        element(
          "div",
          { className: "kl-music-queue-tools" },
          element("div", { className: "kl-music-queue-search-wrap" }, kikiIcon("search"), this.#musicQueueSearch),
          this.#musicQueueSummary
        ),
        this.#musicQueue
      );
      const add = element(
        "section",
        { className: "kl-music-add" },
        element("h2", { text: "Add a track" }),
        element("label", {}, element("span", { text: "Title" }), this.#musicTitleInput),
        element("label", {}, element("span", { text: "Direct HTTPS audio URL" }), this.#musicUrlInput),
        element("div", { className: "kl-music-add-divider", text: "or choose a file" }),
        this.#musicFileInput,
        this.#musicFileMode,
        element("p", {
          className: "kl-setting-help",
          text: "Local files stay in this browser. Catbox files become public bearer links and are not automatically deleted."
        }),
        this.#musicAddStatus,
        this.#musicAddButton
      );
      this.#musicArtwork.replaceChildren(
        element("span", { className: "kl-music-artwork-ring" }),
        element("span", { className: "kl-music-artwork-center" }, kikiIcon("music"))
      );
      this.#musicPlaybackRate.replaceChildren(
        selectOption2("0.75", "0.75\xD7"),
        selectOption2("1", "1\xD7"),
        selectOption2("1.25", "1.25\xD7"),
        selectOption2("1.5", "1.5\xD7"),
        selectOption2("2", "2\xD7")
      );
      this.#musicPlaybackRate.value = "1";
      this.#musicPlaybackRate.addEventListener("change", () => {
        this.#audio.playbackRate = Number(this.#musicPlaybackRate.value) || 1;
      });
      this.#musicSleepSelect.replaceChildren(
        selectOption2("off", "Sleep timer off"),
        selectOption2("end", "After this track"),
        selectOption2("15", "After 15 minutes"),
        selectOption2("30", "After 30 minutes"),
        selectOption2("60", "After 1 hour")
      );
      this.#musicSleepSelect.value = "off";
      this.#musicSleepSelect.addEventListener("change", () => this.#setMusicSleepTimer());
      const nowPlaying = element(
        "section",
        { className: "kl-music-now-card" },
        element("div", { className: "kl-music-now-eyebrow", text: "NOW PLAYING" }),
        this.#musicArtwork,
        element("div", { className: "kl-music-now-card-copy" }, this.#musicNowTitle, this.#musicNowSource),
        element(
          "div",
          { className: "kl-music-session-options" },
          element("label", {}, element("span", { text: "Speed" }), this.#musicPlaybackRate),
          element("label", {}, element("span", { text: "Sleep" }), this.#musicSleepSelect)
        ),
        this.#musicSleepStatus
      );
      this.#musicProgress.type = "range";
      this.#musicProgress.min = "0";
      this.#musicProgress.max = "1000";
      this.#musicProgress.step = "1";
      this.#musicProgress.value = "0";
      this.#musicProgress.addEventListener("input", () => {
        if (!Number.isFinite(this.#audio.duration) || this.#audio.duration <= 0) return;
        this.#audio.currentTime = Number(this.#musicProgress.value) / 1e3 * this.#audio.duration;
        this.#renderMusicProgress();
      });
      this.#musicPreviousButton.append(kikiIcon("previous"));
      this.#musicPlayButton.append(kikiIcon("play"));
      this.#musicNextButton.append(kikiIcon("next"));
      this.#musicPreviousButton.addEventListener("click", () => void this.#previousTrack());
      this.#musicPlayButton.addEventListener("click", () => void this.#toggleMusicPlayback());
      this.#musicNextButton.addEventListener("click", () => void this.#nextTrack(false));
      this.#musicRepeatButton.addEventListener("click", () => this.#cycleMusicRepeat());
      this.#musicShuffleButton.addEventListener("click", () => this.#toggleMusicShuffle());
      this.#musicMuteButton.addEventListener("click", () => {
        this.#audio.muted = !this.#audio.muted;
        this.#renderMusicTransport();
      });
      this.#musicVolume.type = "range";
      this.#musicVolume.min = "0";
      this.#musicVolume.max = "100";
      this.#musicVolume.step = "1";
      this.#musicVolume.addEventListener("input", () => {
        const volume = Math.max(0, Math.min(100, Number(this.#musicVolume.value) || 0));
        this.#audio.volume = volume / 100;
        this.settings.update((draft) => {
          draft.linkMusic.volume = volume;
        });
      });
      this.#audio.preload = "metadata";
      this.#audio.addEventListener("timeupdate", () => this.#renderMusicProgress());
      this.#audio.addEventListener("loadedmetadata", () => this.#renderMusicProgress());
      this.#audio.addEventListener("durationchange", () => this.#renderMusicProgress());
      this.#audio.addEventListener("play", () => {
        this.#renderMusicTransport();
        void this.#syncPlayingTrackToRoom();
      });
      this.#audio.addEventListener("pause", () => this.#renderMusicTransport());
      this.#audio.addEventListener("ended", () => {
        if (this.#musicStopAfterTrack) {
          this.#musicStopAfterTrack = false;
          this.#musicSleepSelect.value = "off";
          this.#musicSleepStatus.textContent = "Stopped after the track.";
          this.#stopMusic();
          return;
        }
        void this.#nextTrack(true);
      });
      this.#audio.addEventListener("error", () => {
        if (this.#activeTrackId) this.#toast("This track could not be played by the browser.", "error");
        this.#renderMusicTransport();
      });
      this.#installMediaSessionHandlers();
      const player = element(
        "footer",
        { className: "kl-music-player" },
        element("div", { className: "kl-music-seek" }, this.#musicProgress, this.#musicTime),
        element(
          "div",
          { className: "kl-music-controls" },
          this.#musicShuffleButton,
          this.#musicPreviousButton,
          this.#musicPlayButton,
          this.#musicNextButton,
          this.#musicRepeatButton,
          this.#musicMuteButton,
          element("label", { className: "kl-music-volume" }, element("span", { text: "Volume" }), this.#musicVolume)
        )
      );
      this.#musicPage.append(
        header,
        element("div", { className: "kl-music-body" }, library, element("div", { className: "kl-music-side" }, nowPlaying, add)),
        player
      );
      void this.#renderMusicPage();
    }
    async #renderMusicPage(forceLocalRefresh = false) {
      const token = ++this.#musicRenderToken;
      const settings = this.settings.get().linkMusic;
      this.#playlistSelect.replaceChildren(
        ...settings.playlists.map((playlist2) => selectOption2(playlist2.id, `${playlist2.name} \xB7 ${playlist2.tracks.length}`))
      );
      this.#playlistSelect.value = settings.activePlaylistId;
      this.#musicVolume.value = settings.volume.toString();
      this.#audio.volume = settings.volume / 100;
      this.#musicRepeatButton.textContent = settings.repeatMode === "one" ? "Repeat one" : settings.repeatMode === "all" ? "Repeat all" : "Repeat off";
      this.#musicRepeatButton.dataset.active = String(settings.repeatMode !== "off");
      this.#musicShuffleButton.dataset.active = String(settings.shuffle);
      const playlist = activePlaylist(settings.playlists, settings.activePlaylistId);
      const localTracks = await this.#getLocalMusicTrackIds(forceLocalRefresh);
      if (token !== this.#musicRenderToken) return;
      const query = this.#musicQueueSearch.value.trim().toLocaleLowerCase();
      const visibleTracks = playlist.tracks.map((track, index) => ({ track, index })).filter(({ track }) => !query || `${track.title}
${track.source}`.toLocaleLowerCase().includes(query));
      this.#musicQueueSummary.textContent = query ? `${visibleTracks.length} of ${playlist.tracks.length} tracks` : `${playlist.tracks.length} track${playlist.tracks.length === 1 ? "" : "s"}`;
      this.#musicQueue.replaceChildren(
        ...visibleTracks.map(({ track, index }) => this.#musicTrackRow(track, index, localTracks))
      );
      if (visibleTracks.length === 0) {
        this.#musicQueue.append(
          element("div", {
            className: "kl-gallery-empty",
            text: playlist.tracks.length === 0 ? "This playlist is empty." : "No matching tracks."
          })
        );
      }
      this.#renderMusicTransport();
    }
    #musicTrackRow(track, index, localTracks) {
      const unavailable = track.source === "local" && !localTracks.has(track.locator);
      const play = element("button", {
        className: "kl-icon-button kl-music-track-play",
        type: "button",
        title: unavailable ? "Local file is unavailable on this device" : `Play ${track.title}`,
        ariaLabel: unavailable ? `${track.title} unavailable` : `Play ${track.title}`,
        onClick: () => void this.#playTrack(track)
      }, kikiIcon(this.#activeTrackId === track.id && !this.#audio.paused ? "pause" : "play"));
      play.disabled = unavailable;
      const menu = element("details", { className: "kl-music-track-menu" });
      const menuToggle = element("summary", {
        className: "kl-icon-button",
        title: `Actions for ${track.title}`,
        ariaLabel: `Actions for ${track.title}`
      }, kikiIcon("more"));
      const actions = element(
        "div",
        { className: "kl-music-track-menu-popover" },
        element("button", {
          type: "button",
          text: "Rename",
          onClick: () => this.#renameMusicTrack(track)
        }),
        element("button", {
          type: "button",
          text: "Move up",
          onClick: () => this.#moveMusicTrack(track, -1)
        }),
        element("button", {
          type: "button",
          text: "Move down",
          onClick: () => this.#moveMusicTrack(track, 1)
        })
      );
      if (track.source !== "local") {
        const original = element("a", { text: "Open original" });
        original.href = track.locator;
        original.target = "_blank";
        original.rel = "noopener noreferrer";
        actions.append(original);
      }
      actions.append(element("button", {
        className: "kl-music-track-delete",
        type: "button",
        text: "Remove",
        onClick: () => void this.#removeMusicTrack(track)
      }));
      menu.append(menuToggle, actions);
      const row = element(
        "article",
        { className: "kl-music-track" },
        element("span", { className: "kl-music-track-number", text: (index + 1).toString() }),
        play,
        element(
          "div",
          { className: "kl-music-track-copy" },
          element("strong", { text: track.title }),
          element("span", {
            text: unavailable ? "Local file missing on this device" : track.source === "local" ? "On this device" : track.source === "catbox" ? "Catbox" : "Direct link"
          })
        ),
        menu
      );
      row.dataset.active = String(this.#activeTrackId === track.id);
      row.dataset.trackId = track.id;
      return row;
    }
    async #addMusicTrack() {
      if (this.#musicAddButton.disabled) return;
      this.#musicAddButton.disabled = true;
      this.#musicAddStatus.textContent = "";
      const staged = [];
      let committed = false;
      try {
        const trackCount = this.settings.get().linkMusic.playlists.reduce(
          (total, playlist) => total + playlist.tracks.length,
          0
        );
        const files = [...this.#musicFileInput.files ?? []];
        const addCount = Math.max(1, files.length);
        if (trackCount + addCount > 100) {
          throw new Error(`You can add ${Math.max(0, 100 - trackCount)} more tracks`);
        }
        if (files.length > 0) {
          for (const [index, file] of files.entries()) {
            let source;
            let locator;
            let fallbackTitle = file.name.replace(/\.[^.]+$/u, "");
            if (this.#musicFileMode.value === "catbox") {
              this.#musicAddStatus.textContent = `Uploading ${index + 1}/${files.length} to Catbox\u2026`;
              locator = await uploadMusicToCatbox(file, void 0, (progress) => {
                const amount = progress.percent === void 0 ? "" : ` \xB7 ${progress.percent}%`;
                this.#musicAddStatus.textContent = `Uploading ${index + 1}/${files.length}${amount}`;
              });
              source = "catbox";
            } else {
              this.#musicAddStatus.textContent = `Saving ${index + 1}/${files.length} on this device\u2026`;
              const localTrackIds = await this.#getLocalMusicTrackIds();
              const stored = await this.musicStore.add(file);
              locator = stored.id;
              fallbackTitle = stored.name.replace(/\.[^.]+$/u, "");
              source = "local";
              localTrackIds.add(stored.id);
            }
            staged.push({
              id: createLocalId("track"),
              title: ((files.length === 1 ? this.#musicTitleInput.value.trim() : "") || fallbackTitle || "Untitled track").slice(0, 80),
              source,
              locator,
              addedAt: Date.now()
            });
          }
        } else {
          const locator = normalizeAudioTrackUrl(this.#musicUrlInput.value);
          staged.push({
            id: createLocalId("track"),
            title: (this.#musicTitleInput.value.trim() || trackTitleFromUrl(locator) || "Untitled track").slice(0, 80),
            source: "url",
            locator,
            addedAt: Date.now()
          });
        }
        this.#appendMusicTracks(staged);
        committed = true;
        this.#musicTitleInput.value = "";
        this.#musicUrlInput.value = "";
        this.#musicFileInput.value = "";
        this.#musicAddStatus.textContent = staged.length === 1 ? `Added \u201C${staged[0].title}\u201D.` : `Added ${staged.length} tracks.`;
        await this.#renderMusicPage();
      } catch (error) {
        const message = error instanceof Error ? error.message : "The track could not be added.";
        if (staged.length > 0 && !committed) {
          this.#appendMusicTracks(staged);
          committed = true;
          this.#musicTitleInput.value = "";
          this.#musicUrlInput.value = "";
          this.#musicFileInput.value = "";
          await this.#renderMusicPage();
          this.#musicAddStatus.textContent = `Added ${staged.length}; stopped because: ${message}`;
        } else {
          this.#musicAddStatus.textContent = message;
        }
        this.#toast(this.#musicAddStatus.textContent, "error");
      } finally {
        this.#musicAddButton.disabled = false;
      }
    }
    #createPlaylist() {
      if (this.settings.get().linkMusic.playlists.length >= 8) {
        this.#toast("KikiLink supports up to 8 playlists.", "error");
        return;
      }
      const value = typeof prompt === "function" ? prompt("Playlist name", "New playlist") : "New playlist";
      const name = value?.trim().slice(0, 60);
      if (!name) return;
      const id = createLocalId("playlist");
      this.settings.update((draft) => {
        draft.linkMusic.playlists.push({ id, name, tracks: [] });
        draft.linkMusic.activePlaylistId = id;
      });
      void this.#renderMusicPage();
    }
    #renameActivePlaylist() {
      const music = this.settings.get().linkMusic;
      const playlist = activePlaylist(music.playlists, music.activePlaylistId);
      const value = typeof prompt === "function" ? prompt("Playlist name", playlist.name) : playlist.name;
      const name = value?.trim().slice(0, 60);
      if (!name || name === playlist.name) return;
      this.settings.update((draft) => {
        activePlaylist(draft.linkMusic.playlists, draft.linkMusic.activePlaylistId).name = name;
      });
      void this.#renderMusicPage();
    }
    #duplicateActivePlaylist() {
      const music = this.settings.get().linkMusic;
      if (music.playlists.length >= 8) {
        this.#toast("KikiLink supports up to 8 playlists.", "error");
        return;
      }
      const playlist = activePlaylist(music.playlists, music.activePlaylistId);
      const total = music.playlists.reduce((count2, candidate) => count2 + candidate.tracks.length, 0);
      if (total + playlist.tracks.length > 100) {
        this.#toast("Duplicating this playlist would exceed 100 saved tracks.", "error");
        return;
      }
      const id = createLocalId("playlist");
      this.settings.update((draft) => {
        const source = activePlaylist(draft.linkMusic.playlists, draft.linkMusic.activePlaylistId);
        draft.linkMusic.playlists.push({
          id,
          name: `${source.name} copy`.slice(0, 60),
          tracks: source.tracks.map((track) => ({ ...track, id: createLocalId("track"), addedAt: Date.now() }))
        });
        draft.linkMusic.activePlaylistId = id;
      });
      void this.#renderMusicPage();
    }
    async #clearActivePlaylist() {
      const music = this.settings.get().linkMusic;
      const playlist = activePlaylist(music.playlists, music.activePlaylistId);
      if (playlist.tracks.length === 0) return;
      if (typeof confirm === "function" && !confirm(`Remove all tracks from \u201C${playlist.name}\u201D?`)) return;
      const removed = [...playlist.tracks];
      if (this.#activeTrackId && removed.some((track) => track.id === this.#activeTrackId)) this.#stopMusic();
      this.settings.update((draft) => {
        activePlaylist(draft.linkMusic.playlists, draft.linkMusic.activePlaylistId).tracks = [];
      });
      await this.#deleteOrphanedLocalTracks(removed);
      await this.#renderMusicPage();
    }
    async #deleteActivePlaylist() {
      const music = this.settings.get().linkMusic;
      const playlist = activePlaylist(music.playlists, music.activePlaylistId);
      if (music.playlists.length <= 1) {
        this.#toast("Keep at least one playlist.", "error");
        return;
      }
      if (typeof confirm === "function" && !confirm(`Delete playlist \u201C${playlist.name}\u201D?`)) return;
      const removed = [...playlist.tracks];
      const removedTrackIds = new Set(removed.map((track) => track.id));
      if (this.#activeTrackId && removedTrackIds.has(this.#activeTrackId)) this.#stopMusic();
      this.settings.update((draft) => {
        draft.linkMusic.playlists = draft.linkMusic.playlists.filter((candidate) => candidate.id !== playlist.id);
        draft.linkMusic.activePlaylistId = draft.linkMusic.playlists[0].id;
      });
      await this.#deleteOrphanedLocalTracks(removed);
      await this.#renderMusicPage();
    }
    async #removeMusicTrack(track) {
      if (this.#activeTrackId === track.id) this.#stopMusic();
      this.settings.update((draft) => {
        const playlist = activePlaylist(draft.linkMusic.playlists, draft.linkMusic.activePlaylistId);
        playlist.tracks = playlist.tracks.filter((candidate) => candidate.id !== track.id);
      });
      await this.#deleteOrphanedLocalTracks([track]);
      await this.#renderMusicPage();
    }
    #renameMusicTrack(track) {
      const value = typeof prompt === "function" ? prompt("Track title", track.title) : track.title;
      const title = value?.trim().slice(0, 80);
      if (!title || title === track.title) return;
      this.settings.update((draft) => {
        const playlist = activePlaylist(draft.linkMusic.playlists, draft.linkMusic.activePlaylistId);
        const saved = playlist.tracks.find((candidate) => candidate.id === track.id);
        if (saved) saved.title = title;
      });
      void this.#renderMusicPage();
    }
    #moveMusicTrack(track, direction) {
      this.settings.update((draft) => {
        const playlist = activePlaylist(draft.linkMusic.playlists, draft.linkMusic.activePlaylistId);
        const index = playlist.tracks.findIndex((candidate) => candidate.id === track.id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= playlist.tracks.length) return;
        const [moved] = playlist.tracks.splice(index, 1);
        if (moved) playlist.tracks.splice(target, 0, moved);
      });
      void this.#renderMusicPage();
    }
    async #playTrack(track) {
      let source;
      if (track.source === "local") {
        const stored = await this.musicStore.get(track.locator);
        if (!stored) {
          this.#toast("This local track is not stored on this device.", "error");
          await this.#renderMusicPage();
          return;
        }
        this.#releaseMusicObjectUrl();
        source = URL.createObjectURL(stored.blob);
        this.#musicObjectUrl = source;
      } else {
        this.#releaseMusicObjectUrl();
        source = track.locator;
      }
      this.#activeTrackId = track.id;
      this.#audio.src = source;
      this.#audio.load();
      try {
        await this.#audio.play();
      } catch (error) {
        this.#toast(error instanceof Error ? error.message : "The browser blocked playback.", "error");
      }
      await this.#renderMusicPage();
    }
    async #toggleMusicPlayback() {
      if (!this.#activeTrackId) {
        const settings = this.settings.get().linkMusic;
        const first = activePlaylist(settings.playlists, settings.activePlaylistId).tracks[0];
        if (first) await this.#playTrack(first);
        return;
      }
      if (this.#audio.paused) {
        try {
          await this.#audio.play();
        } catch (error) {
          this.#toast(error instanceof Error ? error.message : "The browser blocked playback.", "error");
        }
      } else {
        this.#audio.pause();
      }
    }
    async #previousTrack() {
      if (this.#audio.currentTime > 3) {
        this.#audio.currentTime = 0;
        return;
      }
      const settings = this.settings.get().linkMusic;
      const tracks = activePlaylist(settings.playlists, settings.activePlaylistId).tracks;
      if (tracks.length === 0) return;
      const index = tracks.findIndex((track) => track.id === this.#activeTrackId);
      const previous = tracks[(index <= 0 ? tracks.length : index) - 1];
      if (previous) await this.#playTrack(previous);
    }
    async #nextTrack(fromEnded) {
      const settings = this.settings.get().linkMusic;
      const tracks = activePlaylist(settings.playlists, settings.activePlaylistId).tracks;
      if (tracks.length === 0) return;
      if (fromEnded && settings.repeatMode === "one") {
        this.#audio.currentTime = 0;
        await this.#audio.play().catch(() => void 0);
        return;
      }
      const index = tracks.findIndex((track) => track.id === this.#activeTrackId);
      let nextIndex = index + 1;
      if (settings.shuffle && tracks.length > 1) {
        do
          nextIndex = Math.floor(Math.random() * tracks.length);
        while (nextIndex === index);
      } else if (nextIndex >= tracks.length) {
        if (!fromEnded || settings.repeatMode === "all") nextIndex = 0;
        else {
          this.#audio.pause();
          this.#audio.currentTime = 0;
          this.#renderMusicTransport();
          return;
        }
      }
      const next = tracks[Math.max(0, nextIndex)];
      if (next) await this.#playTrack(next);
    }
    #cycleMusicRepeat() {
      this.settings.update((draft) => {
        draft.linkMusic.repeatMode = draft.linkMusic.repeatMode === "off" ? "all" : draft.linkMusic.repeatMode === "all" ? "one" : "off";
      });
      void this.#renderMusicPage();
    }
    #toggleMusicShuffle() {
      this.settings.update((draft) => {
        draft.linkMusic.shuffle = !draft.linkMusic.shuffle;
      });
      void this.#renderMusicPage();
    }
    #renderMusicTransport() {
      const settings = this.settings.get().linkMusic;
      const track = settings.playlists.flatMap((playlist) => playlist.tracks).find((candidate) => candidate.id === this.#activeTrackId);
      this.#musicNowTitle.textContent = track?.title ?? "Nothing playing";
      this.#musicNowSource.textContent = track ? track.source === "local" ? "On this device" : track.source === "catbox" ? "Catbox" : "Direct link" : "Choose a track";
      this.#musicPlayButton.replaceChildren(kikiIcon(track && !this.#audio.paused ? "pause" : "play"));
      this.#musicPlayButton.title = track && !this.#audio.paused ? "Pause" : "Play";
      this.#musicPlayButton.setAttribute("aria-label", this.#musicPlayButton.title);
      this.#musicArtwork.dataset.playing = String(Boolean(track && !this.#audio.paused));
      this.#musicMuteButton.textContent = this.#audio.muted ? "Unmute" : "Mute";
      this.#musicMuteButton.dataset.active = String(this.#audio.muted);
      this.#renderMusicProgress();
      for (const row of this.#musicQueue.querySelectorAll(".kl-music-track")) {
        const button = row.querySelector(".kl-music-track-play");
        if (!button) continue;
        const active = row.dataset.trackId === track?.id;
        row.dataset.active = String(active);
        button.replaceChildren(kikiIcon(active && !this.#audio.paused ? "pause" : "play"));
      }
      this.#updateMediaSession(track);
    }
    #renderMusicProgress() {
      const duration = Number.isFinite(this.#audio.duration) && this.#audio.duration > 0 ? this.#audio.duration : 0;
      const current = Number.isFinite(this.#audio.currentTime) ? this.#audio.currentTime : 0;
      this.#musicProgress.value = duration > 0 ? Math.round(Math.min(1, current / duration) * 1e3).toString() : "0";
      this.#musicProgress.disabled = duration <= 0;
      this.#musicTime.textContent = `${formatAudioTime(current)} / ${formatAudioTime(duration)}`;
      this.#updateMediaSessionPosition(current, duration);
    }
    #stopMusic() {
      this.#audio.pause();
      this.#audio.removeAttribute("src");
      this.#activeTrackId = void 0;
      this.#releaseMusicObjectUrl();
      this.#renderMusicTransport();
    }
    #appendMusicTracks(tracks) {
      if (tracks.length === 0) return;
      this.settings.update((draft) => {
        const playlist = activePlaylist(draft.linkMusic.playlists, draft.linkMusic.activePlaylistId);
        playlist.tracks.push(...tracks);
      });
    }
    async #getLocalMusicTrackIds(force = false) {
      if (!force && this.#localMusicTrackIds) return this.#localMusicTrackIds;
      if (!force && this.#localMusicTrackIdsPromise) return this.#localMusicTrackIdsPromise;
      const load = this.musicStore.list().catch(() => []).then((tracks) => {
        this.#localMusicTrackIds = new Set(tracks.map((track) => track.id));
        return this.#localMusicTrackIds;
      });
      this.#localMusicTrackIdsPromise = load;
      try {
        return await load;
      } finally {
        if (this.#localMusicTrackIdsPromise === load) this.#localMusicTrackIdsPromise = void 0;
      }
    }
    async #deleteOrphanedLocalTracks(tracks) {
      const locators = new Set(
        tracks.filter((track) => track.source === "local").map((track) => track.locator)
      );
      if (locators.size === 0) return;
      const stillUsed = new Set(
        this.settings.get().linkMusic.playlists.flatMap(
          (playlist) => playlist.tracks.filter((track) => track.source === "local").map((track) => track.locator)
        )
      );
      const localTrackIds = await this.#getLocalMusicTrackIds();
      await Promise.all([...locators].filter((locator) => !stillUsed.has(locator)).map(async (locator) => {
        await this.musicStore.delete(locator).catch(() => void 0);
        localTrackIds.delete(locator);
      }));
    }
    #setMusicSleepTimer() {
      this.#clearMusicSleepTimer();
      const value = this.#musicSleepSelect.value;
      if (value === "off") {
        this.#musicSleepStatus.textContent = "";
        return;
      }
      if (value === "end") {
        this.#musicStopAfterTrack = true;
        this.#musicSleepStatus.textContent = "Playback will stop after this track.";
        return;
      }
      const minutes = Number(value);
      if (!Number.isFinite(minutes) || minutes <= 0) return;
      const stopAt = Date.now() + minutes * 6e4;
      this.#musicSleepStatus.textContent = `Stops at ${new Date(stopAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`;
      this.#musicSleepTimer = setTimeout(() => {
        this.#musicSleepTimer = void 0;
        this.#musicSleepSelect.value = "off";
        this.#musicSleepStatus.textContent = "Sleep timer finished.";
        this.#stopMusic();
      }, minutes * 6e4);
    }
    #clearMusicSleepTimer() {
      if (this.#musicSleepTimer !== void 0) clearTimeout(this.#musicSleepTimer);
      this.#musicSleepTimer = void 0;
      this.#musicStopAfterTrack = false;
    }
    #installMediaSessionHandlers() {
      if (!("mediaSession" in navigator)) return;
      const handlers = {
        play: () => void this.#toggleMusicPlayback(),
        pause: () => this.#audio.pause(),
        previoustrack: () => void this.#previousTrack(),
        nexttrack: () => void this.#nextTrack(false),
        seekbackward: (details) => {
          this.#audio.currentTime = Math.max(0, this.#audio.currentTime - (details.seekOffset ?? 10));
        },
        seekforward: (details) => {
          this.#audio.currentTime = Math.min(this.#audio.duration || Infinity, this.#audio.currentTime + (details.seekOffset ?? 10));
        },
        seekto: (details) => {
          if (typeof details.seekTime === "number") this.#audio.currentTime = details.seekTime;
        }
      };
      for (const [action, handler] of Object.entries(handlers)) {
        try {
          navigator.mediaSession.setActionHandler(action, handler);
        } catch {
        }
      }
    }
    #updateMediaSession(track) {
      if (!("mediaSession" in navigator)) return;
      try {
        navigator.mediaSession.playbackState = track ? this.#audio.paused ? "paused" : "playing" : "none";
        if (!track) {
          navigator.mediaSession.metadata = null;
          return;
        }
        if (typeof MediaMetadata === "function") {
          const music = this.settings.get().linkMusic;
          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: "KikiLink",
            album: activePlaylist(music.playlists, music.activePlaylistId).name,
            artwork: [{ src: kikilink_emblem_default, type: "image/webp" }]
          });
        }
      } catch {
      }
    }
    #updateMediaSessionPosition(current, duration) {
      if (!("mediaSession" in navigator) || duration <= 0) return;
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: this.#audio.playbackRate || 1,
          position: Math.max(0, Math.min(current, duration))
        });
      } catch {
      }
    }
    #clearMediaSession() {
      if (!("mediaSession" in navigator)) return;
      for (const action of ["play", "pause", "previoustrack", "nexttrack", "seekbackward", "seekforward", "seekto"]) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
        }
      }
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = "none";
      } catch {
      }
    }
    #releaseMusicObjectUrl() {
      if (!this.#musicObjectUrl) return;
      URL.revokeObjectURL(this.#musicObjectUrl);
      this.#musicObjectUrl = void 0;
    }
    async #syncPlayingTrackToRoom(force = false) {
      if (!this.#roomPlaylistSyncEnabled || !this.#activeTrackId || this.#audio.paused) return;
      const settings = this.settings.get().linkMusic;
      const track = settings.playlists.flatMap((playlist) => playlist.tracks).find((candidate) => candidate.id === this.#activeTrackId);
      const roomUrl = track && track.source !== "local" ? normalizeRoomTrackUrl(track.locator) : void 0;
      if (!roomUrl) {
        this.#roomPlaylistSyncStatus.textContent = "This track is device-only or not an MP3/MP4 URL, so BC cannot use it as room music.";
        if (force) this.#toast(this.#roomPlaylistSyncStatus.textContent, "error");
        return;
      }
      if (!force && roomUrl === this.#lastRoomSyncedTrackUrl) return;
      const snapshot = this.adapter.getRoomAdminSnapshot();
      if (!snapshot?.isAdmin) {
        this.#roomPlaylistSyncEnabled = false;
        this.#roomPlaylistSync.checked = false;
        this.#roomPlaylistSyncStatus.textContent = "Playlist follow stopped because you are not a room administrator.";
        if (force) this.#toast(this.#roomPlaylistSyncStatus.textContent, "error");
        return;
      }
      try {
        this.adapter.updateRoomCustomization({
          ...snapshot.customization,
          musicUrl: roomUrl,
          musicSync: true
        });
        this.#lastRoomSyncedTrackUrl = roomUrl;
        this.#roomMusicUrl.value = roomUrl;
        this.#roomMusicSync.checked = true;
        this.#roomPlaylistSyncStatus.textContent = `Room now follows \u201C${track?.title ?? "current track"}\u201D.`;
      } catch (error) {
        this.#roomPlaylistSyncStatus.textContent = error instanceof Error ? error.message : "The room music could not be updated.";
        if (force) this.#toast(this.#roomPlaylistSyncStatus.textContent, "error");
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
        text: "Notes, tags, favorites, and encounter history belong only to this BC account."
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
        this.presence.requestMany(entries.slice(0, 60).map((entry) => entry.memberNumber));
      }
      const selected = entries.find(
        (entry) => entry.memberNumber === this.#selectedRosterMember
      );
      if (!this.#notebookDirty) this.#renderRosterDetail(selected);
    }
    #rosterEntryButton(entry) {
      const presence = this.presence.get(entry.memberNumber);
      const badges = element("div", { className: "kl-roster-entry-badges" });
      if (entry.present) {
        badges.append(element("span", { className: "kl-roster-badge kl-roster-live", text: "HERE" }));
      }
      const status = element("span", {
        className: "kl-roster-badge kl-roster-presence-label",
        text: presenceLabel(presence.status)
      });
      status.dataset.status = presence.status;
      status.dataset.presenceLabel = "true";
      status.hidden = presence.status === "unknown";
      badges.append(status);
      if (entry.isFriend) {
        badges.append(element("span", { className: "kl-roster-badge kl-roster-friend", text: "FRIEND" }));
      }
      for (const relationship of entry.relationships) {
        badges.append(
          element("span", {
            className: `kl-roster-badge kl-roster-relationship kl-roster-relationship--${relationship}`,
            text: rosterRelationshipLabel(relationship).toUpperCase(),
            title: rosterRelationshipDescription(relationship)
          })
        );
      }
      if (entry.favorite) badges.append(kikiIcon("star", "kl-roster-favorite", true));
      const preview = entry.tags.length ? entry.tags.join(" \xB7 ") : entry.note ? entry.note.replace(/\s+/gu, " ") : entry.lastRoomName || `Member ${entry.memberNumber}`;
      const button = element(
        "button",
        { className: "kl-roster-entry", type: "button" },
        element(
          "div",
          { className: "kl-avatar-wrap" },
          this.#avatar(entry.displayName, entry.memberNumber),
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
      const detailBadges = element("div", { className: "kl-roster-detail-badges" });
      if (entry.present) {
        detailBadges.append(element("span", { className: "kl-roster-badge kl-roster-live", text: "HERE" }));
      }
      if (entry.isFriend) {
        detailBadges.append(element("span", { className: "kl-roster-badge kl-roster-friend", text: "FRIEND" }));
      }
      for (const relationship of entry.relationships) {
        detailBadges.append(
          element("span", {
            className: `kl-roster-badge kl-roster-relationship kl-roster-relationship--${relationship}`,
            text: rosterRelationshipLabel(relationship).toUpperCase(),
            title: rosterRelationshipDescription(relationship)
          })
        );
      }
      const identity = element(
        "div",
        { className: "kl-roster-identity" },
        element(
          "div",
          { className: "kl-avatar-wrap" },
          this.#avatar(entry.displayName, entry.memberNumber, "kl-roster-avatar"),
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
          detailBadges.childElementCount > 0 ? detailBadges : null,
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
      this.#customActivitiesView = new CustomActivitiesView(
        this.#activitiesPage,
        this.adapter,
        this.settings,
        this.activities,
        () => {
          this.#renderHomeStatus();
          void this.#renderHome();
        },
        (message, kind) => this.#toast(message, kind)
      );
      this.#customActivitiesView.open();
    }
    #openActivities(activityIndex) {
      if (!this.settings.get().linkActivities.enabled) {
        this.#openSettings("activities");
        this.#activitiesToggle.focus();
        this.#toast("Turn on the Custom Activities tab to open your activity builder.");
        return;
      }
      this.#showWorkspace("activities");
      const activities = this.settings.get().linkActivities.customActivities;
      this.#selectedActivityIndex = activityIndex !== void 0 && Number.isInteger(activityIndex) && activityIndex >= 0 ? activityIndex : 0;
      this.#customActivitiesView?.open(
        activityIndex === void 0 ? void 0 : activities[this.#selectedActivityIndex]?.id
      );
    }
    #renderActivitiesPage() {
      this.#customActivitiesView?.refresh();
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
    async #renderHome(providedConversations) {
      const ownName = this.adapter.getOwnName().trim();
      const greeting = greetingForCurrentTime();
      this.#homeGreeting.textContent = ownName && ownName.toLocaleLowerCase() !== "me" ? `${greeting}, ${ownName}.` : `${greeting}.`;
      const conversations = providedConversations ?? await this.service.listConversations();
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
      this.#activitiesButton.hidden = !settings.linkActivities.enabled;
      this.#homeActivitiesCard.dataset.available = String(settings.linkActivities.enabled);
      this.#homeActivitiesMetric.textContent = settings.linkActivities.enabled ? settings.linkActivities.customActivities.length > 0 ? `${settings.linkActivities.customActivities.length} custom ${settings.linkActivities.customActivities.length === 1 ? "activity" : "activities"}` : "No custom activities yet" : "Hidden \xB7 tap to enable";
      this.#homeActivitiesAction.textContent = settings.linkActivities.enabled ? "Manage activities" : "Show Custom tab";
      const savedGalleryCount = settings.linkChat.gallery.saved.length;
      this.#homeGalleryMetric.textContent = savedGalleryCount > 0 ? `${savedGalleryCount} saved ${savedGalleryCount === 1 ? "image" : "images"} \xB7 chat media included` : "Chat media plus images you add directly";
      const themeLabel = settings.ui.theme === "light" ? "Light paper" : settings.ui.theme === "system" ? "System theme" : "Dark lacquer";
      const comfortLabel = settings.ui.density === "super-compact" ? "Super compact" : settings.ui.density === "compact" ? "Compact" : "Comfortable";
      this.#homeSettingsMetric.textContent = `${themeLabel} \xB7 ${comfortLabel} \xB7 ${settings.ui.accent.toUpperCase()}`;
    }
    #renderOwnPresence() {
      const enabled = this.settings.get().linkPresence.enabled;
      const ownMemberNumber = this.adapter.getOwnMemberNumber();
      const ownName = this.adapter.getOwnName();
      const snapshot = this.presence.get(ownMemberNumber);
      const label = enabled ? presenceLabel(snapshot.status) : "Presence off";
      this.#presenceTriggerDot.dataset.status = enabled ? snapshot.status : "unknown";
      this.#presenceTriggerName.textContent = ownName;
      this.#presenceTriggerStatus.textContent = snapshot.statusMessage ? `${label} \xB7 ${snapshot.statusMessage}` : label;
      this.#renderAvatar(this.#presenceTriggerAvatar, ownName, ownMemberNumber, snapshot.avatarUrl);
      this.#presenceTrigger.title = snapshot.statusMessage ? `${ownName}: ${label} \xB7 ${snapshot.statusMessage}` : `KikiLink status: ${label}`;
      this.#homePresence.replaceChildren(
        presenceDot(enabled ? snapshot.status : "unknown"),
        element("span", { text: label })
      );
      this.#homePresence.title = this.#presenceTrigger.title;
    }
    #scheduleClockUpdate() {
      if (this.#clockTimer !== void 0) clearTimeout(this.#clockTimer);
      const now = /* @__PURE__ */ new Date();
      this.#localClock.dateTime = now.toISOString();
      this.#localClock.textContent = new Intl.DateTimeFormat(void 0, {
        hour: "2-digit",
        minute: "2-digit"
      }).format(now);
      this.#localClock.title = `Local time \xB7 ${new Intl.DateTimeFormat(void 0, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(now)}`;
      this.#clockTimer = setTimeout(
        () => this.#scheduleClockUpdate(),
        Math.max(1e3, 6e4 - Date.now() % 6e4 + 25)
      );
    }
    #renderActivePresence() {
      this.#chatPresence.replaceChildren();
      this.#chatRoom.replaceChildren();
      if (this.#activePeer === void 0) {
        this.#renderTypingIndicator();
        return;
      }
      const snapshot = this.presence.get(this.#activePeer);
      this.#renderAvatar(this.#chatAvatar, this.#activeName, this.#activePeer);
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
        const avatar = target.querySelector("[data-kikilink-avatar]");
        if (avatar) {
          this.#renderAvatar(
            avatar,
            avatar.dataset.avatarName || this.adapter.getMemberName(memberNumber),
            memberNumber
          );
        }
      }
    }
    async #renderConversations(providedConversations) {
      const query = this.#search.value.trim().toLocaleLowerCase();
      const allConversations = providedConversations ?? await this.service.listConversations();
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
          this.#renderAvatar(this.#chatAvatar, displayName, conversation.peerNumber);
        }
      }
      const conversations = allConversations.filter((conversation) => {
        if (!query) return true;
        return conversationDisplayName(conversation).toLocaleLowerCase().includes(query) || conversation.peerName.toLocaleLowerCase().includes(query) || conversation.peerNumber.toString().includes(query) || conversation.lastMessage.toLocaleLowerCase().includes(query);
      });
      if (conversations.length === 0) {
        this.#conversationList.replaceChildren(
          element("div", {
            className: "kl-empty-copy",
            text: query ? "No matching chats." : "No conversations yet."
          })
        );
        return;
      }
      const fragment = document.createDocumentFragment();
      for (const conversation of conversations) {
        fragment.append(this.#conversationButton(conversation));
      }
      this.#conversationList.replaceChildren(fragment);
      this.presence.requestMany(
        conversations.slice(0, 60).map((conversation) => conversation.peerNumber)
      );
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
          this.#avatar(displayName, conversation.peerNumber),
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
      this.#chatAvatar.dataset.memberNumber = peerNumber.toString();
      this.#renderAvatar(this.#chatAvatar, displayName, peerNumber);
      this.#chatName.textContent = displayName;
      this.#chatNumber.textContent = `Member ${peerNumber}`;
      this.#messageRenderLimit = 120;
      this.#messageRenderPeer = peerNumber;
      this.#loadingOlderMessages = false;
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
      if (visibleMessages.length === 0) {
        this.#messages.replaceChildren(
          element("div", {
            className: "kl-empty-copy",
            text: "No Beeps here yet. Send the first one."
          })
        );
        return;
      }
      const fragment = document.createDocumentFragment();
      if (hasOlder) {
        fragment.append(this.#olderMessagesControl(peerNumber));
      }
      for (const [index, message] of visibleMessages.entries()) {
        this.#renderedMessageIds.add(message.id);
        fragment.append(
          this.#messageNode(
            message,
            messageGroupPosition(
              visibleMessages[index - 1]?.direction,
              message.direction,
              visibleMessages[index + 1]?.direction
            )
          )
        );
      }
      this.#messages.replaceChildren(fragment);
      if (scrollToBottom) {
        this.#messages.scrollTop = this.#messages.scrollHeight;
      }
    }
    async #loadOlderMessages(peerNumber) {
      if (this.#activePeer !== peerNumber || this.#loadingOlderMessages) return;
      this.#loadingOlderMessages = true;
      this.#messages.setAttribute("aria-busy", "true");
      const button = this.#messages.querySelector(".kl-load-older button");
      if (button) button.disabled = true;
      const previousHeight = this.#messages.scrollHeight;
      const previousTop = this.#messages.scrollTop;
      try {
        const nextLimit = this.#messageRenderLimit + 120;
        const messages = await this.service.getMessages(peerNumber, nextLimit + 1);
        if (this.#activePeer !== peerNumber) return;
        const hasOlder = messages.length > nextLimit;
        const visibleMessages = hasOlder ? messages.slice(-nextLimit) : messages;
        const missingMessages = visibleMessages.filter(
          (message) => !this.#renderedMessageIds.has(message.id)
        );
        const currentControl = this.#messages.querySelector(".kl-load-older");
        const fragment = document.createDocumentFragment();
        if (hasOlder) fragment.append(currentControl ?? this.#olderMessagesControl(peerNumber));
        else currentControl?.remove();
        for (const message of missingMessages) {
          this.#renderedMessageIds.add(message.id);
          fragment.append(this.#messageNode(message));
        }
        if (fragment.childNodes.length > 0) this.#messages.prepend(fragment);
        this.#messageRenderLimit = nextLimit;
        this.#syncMessageGrouping();
        this.#messages.scrollTop = previousTop + (this.#messages.scrollHeight - previousHeight);
      } finally {
        this.#loadingOlderMessages = false;
        this.#messages.setAttribute("aria-busy", "false");
        const currentButton = this.#messages.querySelector(
          ".kl-load-older button"
        );
        if (currentButton) currentButton.disabled = false;
      }
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
    #messageNode(message, group = "single") {
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
      if (body.querySelector(".kl-message-media")) bubble.dataset.media = "true";
      const row = element("div", { className: "kl-message-row" }, bubble, actions);
      row.dataset.direction = message.direction;
      row.dataset.group = group;
      row.dataset.messageId = message.id;
      return row;
    }
    #appendMessage(message) {
      if (this.#activePeer !== message.peerNumber || this.#messageRenderPeer !== message.peerNumber || this.#renderedMessageIds.has(message.id)) {
        return;
      }
      const nearBottom = this.#messages.scrollHeight - this.#messages.scrollTop - this.#messages.clientHeight < 96;
      const shouldFollowMessage = message.direction === "outgoing" || nearBottom;
      const previousScrollTop = this.#messages.scrollTop;
      this.#messages.querySelector(".kl-empty-copy")?.remove();
      const previous = this.#messages.querySelector(".kl-message-row:last-child");
      const row = this.#messageNode(message);
      if (previous?.dataset.direction === message.direction) {
        previous.dataset.group = previous.dataset.group === "single" ? "start" : "middle";
        row.dataset.group = "end";
      }
      this.#messages.append(row);
      this.#renderedMessageIds.add(message.id);
      if (this.#renderedMessageIds.size > this.#messageRenderLimit) {
        if (!this.#messages.querySelector(".kl-load-older")) {
          this.#messages.prepend(this.#olderMessagesControl(message.peerNumber));
        }
        const oldest = this.#messages.querySelector(".kl-message-row");
        if (oldest) {
          const heightBeforeRemoval = this.#messages.scrollHeight;
          if (oldest.dataset.messageId) this.#renderedMessageIds.delete(oldest.dataset.messageId);
          oldest.remove();
          this.#repairFirstMessageGrouping();
          if (!shouldFollowMessage) {
            const removedHeight = Math.max(0, heightBeforeRemoval - this.#messages.scrollHeight);
            this.#messages.scrollTop = Math.max(0, previousScrollTop - removedHeight);
          }
        }
      }
      if (shouldFollowMessage) this.#messages.scrollTop = this.#messages.scrollHeight;
    }
    #syncMessageGrouping() {
      const rows = [...this.#messages.querySelectorAll(".kl-message-row")];
      for (const [index, row] of rows.entries()) {
        row.dataset.group = messageGroupPosition(
          rows[index - 1]?.dataset.direction,
          row.dataset.direction,
          rows[index + 1]?.dataset.direction
        );
      }
    }
    #repairFirstMessageGrouping() {
      const first = this.#messages.querySelector(".kl-message-row");
      if (!first) return;
      const next = first.nextElementSibling;
      first.dataset.group = next instanceof HTMLElement && next.classList.contains("kl-message-row") && next.dataset.direction === first.dataset.direction ? "start" : "single";
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
          sent ? "Beep was sent, but KikiLink could not save it to this account's history." : error instanceof Error ? error.message : "Unable to send Beep",
          "error"
        );
        return false;
      }
    }
    #renderMessageBody(message) {
      const content = message.content || "Beep without a message";
      const links = parseMessageLinks(content);
      const previewsEnabled = this.settings.get().linkChat.imagePreviews !== "never";
      const imageUrls = [...new Set(links.filter((link) => link.image).map((link) => link.url))].slice(0, 2);
      const body = element("div", { className: "kl-message-content" });
      let cursor = 0;
      for (const link of links) {
        if (link.start > cursor) body.append(document.createTextNode(content.slice(cursor, link.start)));
        if (link.image && previewsEnabled) {
          cursor = link.end;
          continue;
        }
        const anchor = element("a", { className: "kl-message-link", text: content.slice(link.start, link.end) });
        anchor.href = link.url;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer nofollow";
        anchor.referrerPolicy = "no-referrer";
        body.append(anchor);
        cursor = link.end;
      }
      if (cursor < content.length) body.append(document.createTextNode(content.slice(cursor)));
      if (imageUrls.length === 0 || !previewsEnabled) return body;
      if (!body.textContent?.trim()) {
        body.replaceChildren();
        body.dataset.mediaOnly = "true";
      }
      const media = element("div", { className: "kl-message-media" });
      for (const url of imageUrls) media.append(this.#imageCard(url));
      body.append(media);
      return body;
    }
    #imageCard(url) {
      const parsed = new URL(url);
      const preview = element("div", { className: "kl-image-preview" });
      const open = element("a", { className: "kl-image-open", text: "Show original \u2197" });
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
      const headerPresenceLabel = element("span", { text: presenceLabel(snapshot.status) });
      headerPresenceLabel.dataset.presenceLabel = "true";
      const headerPresence = element(
        "span",
        { title: presenceDescription(snapshot) },
        presenceDot(snapshot.status),
        headerPresenceLabel,
        ` \xB7 #${memberNumber}`
      );
      headerPresence.dataset.presenceDescription = "true";
      const header = element(
        "header",
        { className: "kl-profile-menu-header" },
        element(
          "div",
          { className: "kl-avatar-wrap" },
          this.#avatar(shownName, memberNumber),
          presenceDot(snapshot.status)
        ),
        element(
          "div",
          { className: "kl-profile-menu-identity" },
          element("strong", { text: shownName }),
          headerPresence,
          snapshot.statusMessage ? element("small", { className: "kl-presence-note", text: snapshot.statusMessage }) : null,
          conversation?.localAlias ? element("small", {
            className: "kl-profile-native-name",
            text: `Local nickname \xB7 ${conversation.peerName}`
          }) : null
        )
      );
      header.dataset.memberNumber = memberNumber.toString();
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
          "Deletes only this account's KikiLink history",
          () => this.#openRemoveChatDialog(memberNumber, shownName)
        )
      ) : null;
      this.#profileMenu.replaceChildren(header, primary, organize);
      this.#profileMenu.dataset.memberNumber = memberNumber.toString();
      if (remove) this.#profileMenu.append(remove);
      this.#profileMenu.hidden = false;
      this.#profileMenu.style.left = `${x}px`;
      this.#profileMenu.style.top = `${y}px`;
      const bounds = this.#profileMenu.getBoundingClientRect();
      this.#profileMenu.style.left = `${clamp2(x, 8, Math.max(8, window.innerWidth - bounds.width - 8))}px`;
      this.#profileMenu.style.top = `${clamp2(y, 8, Math.max(8, window.innerHeight - bounds.height - 8))}px`;
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
            this.#avatar(contact.memberName, contact.memberNumber),
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
        button.dataset.memberNumber = contact.memberNumber.toString();
        this.#newChatResults.append(button);
      }
      this.presence.requestMany(contacts.map((contact) => contact.memberNumber));
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
    #renderReactionRuleEditor(rules) {
      this.#reactionRulesEditor.replaceChildren();
      for (const rule of rules) this.#addReactionRuleEditorRow(rule);
      this.#updateReactionRuleCount();
    }
    #addReactionRuleEditorRow(rule = createDefaultReactionRule(createReactionRuleId())) {
      if (this.#reactionRulesEditor.childElementCount >= MAX_REACTION_RULES) {
        this.#toast(`You can keep up to ${MAX_REACTION_RULES} reaction rules.`, "error");
        return;
      }
      const enabled = element("input");
      enabled.type = "checkbox";
      enabled.checked = rule.enabled;
      enabled.dataset.field = "enabled";
      enabled.setAttribute("aria-label", `Enable ${rule.label}`);
      const enabledLabel = element(
        "label",
        { className: "kl-reaction-rule-enabled" },
        enabled,
        element("span", { text: "On" })
      );
      const name = element("input", { className: "kl-reaction-name" });
      name.value = rule.label;
      name.maxLength = 32;
      name.placeholder = "Rule name";
      name.dataset.field = "label";
      name.setAttribute("aria-label", "Reaction rule name");
      const trigger = element("select", { className: "kl-select" });
      trigger.replaceChildren(
        selectOption2("beep-received", "Incoming Beep"),
        selectOption2("room-join", "Player joins room"),
        selectOption2("room-leave", "Player leaves room"),
        selectOption2("friend-online", "Friend comes online")
      );
      trigger.value = rule.trigger;
      trigger.dataset.field = "trigger";
      const scope = element("select", { className: "kl-select" });
      scope.replaceChildren(
        selectOption2("anyone", "Anyone"),
        selectOption2("friends", "Friends only"),
        selectOption2("members", "Specific members")
      );
      scope.value = rule.scope;
      scope.dataset.field = "scope";
      const members = element("input", { className: "kl-reaction-input" });
      members.value = rule.memberNumbers.join(", ");
      members.placeholder = "12345, 67890";
      members.maxLength = 240;
      members.dataset.field = "members";
      const textMatch = element("input", { className: "kl-reaction-input" });
      textMatch.value = rule.textMatch;
      textMatch.placeholder = "Optional words";
      textMatch.maxLength = 80;
      textMatch.dataset.field = "text-match";
      const action = element("select", { className: "kl-select" });
      action.replaceChildren(
        selectOption2("notice", "Local notice"),
        selectOption2("room-emote", "Send room emote")
      );
      action.value = rule.action;
      action.dataset.field = "action";
      const cooldown = element("input", {
        className: "kl-number-input kl-reaction-cooldown"
      });
      cooldown.type = "number";
      cooldown.min = "0";
      cooldown.max = MAX_REACTION_COOLDOWN_SECONDS.toString();
      cooldown.value = rule.cooldownSeconds.toString();
      cooldown.dataset.field = "cooldown";
      const template = element("textarea", {
        className: "kl-reaction-template"
      });
      template.value = rule.template;
      template.maxLength = 500;
      template.rows = 2;
      template.dataset.field = "template";
      const row = element("article", { className: "kl-reaction-rule" });
      row.dataset.ruleId = rule.id;
      const moveUp = element("button", {
        className: "kl-icon-button kl-reaction-move kl-reaction-move--up",
        type: "button",
        title: "Move rule up",
        ariaLabel: `Move ${rule.label} up`,
        onClick: () => {
          const previous = row.previousElementSibling;
          if (previous) this.#reactionRulesEditor.insertBefore(row, previous);
        }
      });
      moveUp.append(kikiIcon("back"));
      const moveDown = element("button", {
        className: "kl-icon-button kl-reaction-move kl-reaction-move--down",
        type: "button",
        title: "Move rule down",
        ariaLabel: `Move ${rule.label} down`,
        onClick: () => {
          const next = row.nextElementSibling;
          if (next) next.after(row);
        }
      });
      moveDown.append(kikiIcon("back"));
      const remove = element("button", {
        className: "kl-icon-button kl-remove-action",
        type: "button",
        title: "Remove reaction rule",
        ariaLabel: `Remove ${rule.label}`,
        onClick: () => {
          row.remove();
          this.#updateReactionRuleCount();
        }
      });
      remove.append(kikiIcon("trash"));
      const note = element("div", { className: "kl-reaction-rule-note" });
      row.append(
        element(
          "header",
          { className: "kl-reaction-rule-header" },
          enabledLabel,
          name,
          element("div", { className: "kl-reaction-rule-order" }, moveUp, moveDown, remove)
        ),
        element(
          "div",
          { className: "kl-reaction-rule-grid" },
          reactionField("When", trigger),
          reactionField("Who", scope),
          reactionField("Member numbers", members, "kl-reaction-members-field"),
          reactionField("Beep contains", textMatch, "kl-reaction-match-field"),
          reactionField("Then", action),
          reactionField("Cooldown (seconds)", cooldown),
          reactionField("Message template", template, "kl-reaction-template-field")
        ),
        note
      );
      trigger.addEventListener("change", () => this.#syncReactionRuleEditorRow(row));
      scope.addEventListener("change", () => this.#syncReactionRuleEditorRow(row));
      action.addEventListener("change", () => this.#syncReactionRuleEditorRow(row));
      this.#reactionRulesEditor.append(row);
      this.#syncReactionRuleEditorRow(row);
      this.#updateReactionRuleCount();
      if (!rule.label) name.focus();
    }
    #syncReactionRuleEditorRow(row) {
      const trigger = row.querySelector('[data-field="trigger"]')?.value;
      const scope = row.querySelector('[data-field="scope"]')?.value;
      const action = row.querySelector('[data-field="action"]')?.value;
      const members = row.querySelector('[data-field="members"]');
      const match = row.querySelector('[data-field="text-match"]');
      const template = row.querySelector('[data-field="template"]');
      if (members) members.disabled = scope !== "members";
      if (match) match.disabled = trigger !== "beep-received";
      row.querySelector(".kl-reaction-members-field")?.toggleAttribute(
        "data-disabled",
        scope !== "members"
      );
      row.querySelector(".kl-reaction-match-field")?.toggleAttribute(
        "data-disabled",
        trigger !== "beep-received"
      );
      if (template) {
        template.placeholder = action === "room-emote" ? "greets {name} as they arrive." : "{name} {event}.";
      }
      const note = row.querySelector(".kl-reaction-rule-note");
      if (note) {
        note.textContent = action === "room-emote" ? "Public room action. Private {message} content is always removed before sending." : "Private KikiLink notice shown beside the launcher when the panel is closed.";
        note.dataset.public = String(action === "room-emote");
      }
    }
    #readReactionRuleEditor() {
      const rules = [];
      const rows = [
        ...this.#reactionRulesEditor.querySelectorAll(".kl-reaction-rule")
      ];
      for (const [index, row] of rows.entries()) {
        const label = row.querySelector('[data-field="label"]')?.value.trim() ?? "";
        const template = row.querySelector('[data-field="template"]')?.value.trim() ?? "";
        if (!label || !template) {
          const control = row.querySelector(
            !label ? '[data-field="label"]' : '[data-field="template"]'
          );
          control?.focus();
          this.#toast(`Complete the name and template for reaction rule ${index + 1}.`, "error");
          return void 0;
        }
        const scopeValue = row.querySelector('[data-field="scope"]')?.value;
        const scope = scopeValue === "friends" || scopeValue === "members" ? scopeValue : "anyone";
        const membersInput = row.querySelector('[data-field="members"]');
        const memberNumbers = scope === "members" ? parseReactionMemberNumbers(membersInput?.value ?? "") : [];
        if (scope === "members" && (!memberNumbers || memberNumbers.length === 0)) {
          membersInput?.focus();
          this.#toast(
            `Enter up to ${MAX_REACTION_MEMBERS} valid member numbers for reaction rule ${index + 1}.`,
            "error"
          );
          return void 0;
        }
        const cooldownInput = row.querySelector('[data-field="cooldown"]');
        const cooldownSeconds = Number(cooldownInput?.value);
        if (!Number.isInteger(cooldownSeconds) || cooldownSeconds < 0 || cooldownSeconds > MAX_REACTION_COOLDOWN_SECONDS) {
          cooldownInput?.focus();
          this.#toast(
            `Reaction cooldown must be between 0 and ${MAX_REACTION_COOLDOWN_SECONDS} seconds.`,
            "error"
          );
          return void 0;
        }
        const triggerValue = row.querySelector('[data-field="trigger"]')?.value;
        const actionValue = row.querySelector('[data-field="action"]')?.value;
        rules.push({
          id: row.dataset.ruleId || createReactionRuleId(),
          label,
          enabled: row.querySelector('[data-field="enabled"]')?.checked === true,
          trigger: triggerValue === "room-join" || triggerValue === "room-leave" || triggerValue === "friend-online" ? triggerValue : "beep-received",
          scope,
          memberNumbers: memberNumbers ?? [],
          textMatch: triggerValue === "beep-received" ? row.querySelector('[data-field="text-match"]')?.value.trim() ?? "" : "",
          action: actionValue === "room-emote" ? "room-emote" : "notice",
          template,
          cooldownSeconds
        });
      }
      return rules;
    }
    #updateReactionRuleCount() {
      const count2 = this.#reactionRulesEditor.childElementCount;
      this.#reactionRuleCount.textContent = count2 === 0 ? "Optional" : `${count2} rule${count2 === 1 ? "" : "s"}`;
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
      this.#imageUploadsToggle.checked = settings.linkChat.imageUploads.enabled;
      this.#imageUploadRetentionSelect.value = settings.linkChat.imageUploads.retention;
      this.#renderImageUploadSettingsOptions();
      this.#roomBadgeToggle.checked = settings.ui.roomBadge.enabled;
      this.#retentionInput.value = settings.linkChat.retentionDays.toString();
      this.#renderQuickActionEditor(settings.linkChat.quickActions);
      this.#rosterEnabledToggle.checked = settings.linkRoster.enabled;
      this.#rosterTrackingToggle.checked = settings.linkRoster.trackEncounters;
      this.#rosterRetentionSelect.value = settings.linkRoster.retentionDays.toString();
      this.#updateNotebookCount();
      this.#activitiesToggle.checked = settings.linkActivities.enabled;
      this.#friendOnlineAlertToggle.checked = settings.linkReactions.quickAlerts.friendOnline;
      this.#roomJoinAlertToggle.checked = settings.linkReactions.quickAlerts.roomJoin;
      this.#notificationSoundsToggle.checked = settings.linkReactions.sounds.enabled;
      this.#soundVolumeInput.value = settings.linkReactions.sounds.volume.toString();
      this.#soundVolumeValue.textContent = `${settings.linkReactions.sounds.volume}%`;
      this.#chatSoundSelect.value = settings.linkReactions.sounds.chat;
      this.#friendOnlineSoundSelect.value = settings.linkReactions.sounds.friendOnline;
      this.#roomJoinSoundSelect.value = settings.linkReactions.sounds.roomJoin;
      void this.#refreshCustomSounds(settings.linkReactions.sounds);
      this.#reactionsToggle.checked = settings.linkReactions.enabled;
      this.#renderReactionRuleEditor(settings.linkReactions.rules);
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
    #renderImageUploadSettingsOptions() {
      const enabled = this.#imageUploadsToggle.checked;
      this.#imageUploadSettingsOptions.hidden = !enabled;
      this.#imageUploadRetentionSelect.disabled = !enabled;
    }
    async #refreshCustomSounds(selected = {
      ...this.settings.get().linkReactions.sounds,
      chat: soundChoiceOr(this.#chatSoundSelect.value, "chime"),
      friendOnline: soundChoiceOr(this.#friendOnlineSoundSelect.value, "sparkle"),
      roomJoin: soundChoiceOr(this.#roomJoinSoundSelect.value, "pop")
    }) {
      let sounds;
      try {
        sounds = await this.soundStore.list();
      } catch {
        sounds = [];
      }
      const builtIns = Object.entries(NOTIFICATION_SOUND_LABELS);
      const available = new Set(sounds.map((sound) => `custom:${sound.id}`));
      const selections = [
        [this.#chatSoundSelect, selected.chat, "chime"],
        [this.#friendOnlineSoundSelect, selected.friendOnline, "sparkle"],
        [this.#roomJoinSoundSelect, selected.roomJoin, "pop"]
      ];
      for (const [select, choice, fallback] of selections) {
        select.replaceChildren(
          ...builtIns.map(([value, label]) => selectOption2(value, label)),
          ...sounds.map((sound) => selectOption2(`custom:${sound.id}`, `My \xB7 ${sound.name}`))
        );
        if (choice.startsWith("custom:") && !available.has(choice)) {
          const unavailable = selectOption2(choice, "Custom sound unavailable on this device");
          unavailable.disabled = true;
          select.append(unavailable);
        }
        select.value = choice || fallback;
      }
      if (sounds.length === 0) {
        this.#customSoundList.replaceChildren(
          element("div", {
            className: "kl-custom-sound-empty",
            text: "No local sounds saved on this device."
          })
        );
        return;
      }
      this.#customSoundList.replaceChildren(
        ...sounds.map(
          (sound) => element(
            "div",
            { className: "kl-custom-sound" },
            element(
              "div",
              { className: "kl-custom-sound-copy" },
              element("strong", { text: sound.name }),
              element("span", { text: `${(sound.durationMs / 1e3).toFixed(1)} s \xB7 local` })
            ),
            element("button", {
              className: "kl-text-button kl-sound-preview",
              type: "button",
              text: "Play",
              onClick: () => void this.#notificationSounds.play(`custom:${sound.id}`, {
                volume: Number(this.#soundVolumeInput.value)
              })
            }),
            element("button", {
              className: "kl-icon-button kl-text-button--danger",
              type: "button",
              title: `Delete ${sound.name}`,
              ariaLabel: `Delete ${sound.name}`,
              onClick: () => void this.#deleteCustomSound(sound)
            }, kikiIcon("trash"))
          )
        )
      );
    }
    async #addCustomSound() {
      const file = this.#customSoundInput.files?.[0];
      this.#customSoundInput.value = "";
      if (!file) return;
      try {
        const sound = await this.soundStore.add(file);
        const current = this.settings.get().linkReactions.sounds;
        await this.#refreshCustomSounds({ ...current, chat: `custom:${sound.id}` });
        this.#chatSoundSelect.value = `custom:${sound.id}`;
        this.#toast(`Saved \u201C${sound.name}\u201D locally. Choose Save changes to use it.`);
      } catch (error) {
        this.#toast(
          error instanceof Error ? error.message : "That local sound could not be saved.",
          "error"
        );
      }
    }
    async #deleteCustomSound(sound) {
      if (typeof confirm === "function" && !confirm(`Delete the local sound \u201C${sound.name}\u201D?`)) return;
      await this.soundStore.delete(sound.id);
      const choice = `custom:${sound.id}`;
      const settings = this.settings.update((draft) => {
        if (draft.linkReactions.sounds.chat === choice) draft.linkReactions.sounds.chat = "chime";
        if (draft.linkReactions.sounds.friendOnline === choice) {
          draft.linkReactions.sounds.friendOnline = "sparkle";
        }
        if (draft.linkReactions.sounds.roomJoin === choice) draft.linkReactions.sounds.roomJoin = "pop";
      });
      await this.#refreshCustomSounds(settings.linkReactions.sounds);
      this.#toast(`Deleted \u201C${sound.name}\u201D from this device.`);
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
      const reactionRules = this.#readReactionRuleEditor();
      if (!reactionRules) return;
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
        draft.ui.roomBadge = {
          enabled: this.#roomBadgeToggle.checked,
          position: currentSettings.ui.roomBadge.position
        };
        draft.ui.reducedMotion = this.#reducedMotionToggle.checked;
        draft.ui.settingsSection = this.#settingsSection;
        draft.linkChat.saveHistory = this.#historyToggle.checked;
        draft.linkChat.enterToSend = this.#enterToSendToggle.checked;
        draft.linkChat.typingIndicators = this.#typingIndicatorsToggle.checked;
        draft.linkChat.imagePreviews = this.#imagePreviewSelect.value === "always" || this.#imagePreviewSelect.value === "never" ? this.#imagePreviewSelect.value : "ask";
        draft.linkChat.imageUploads = {
          enabled: this.#imageUploadsToggle.checked,
          retention: this.#imageUploadRetentionSelect.value === "1h" || this.#imageUploadRetentionSelect.value === "12h" || this.#imageUploadRetentionSelect.value === "72h" ? this.#imageUploadRetentionSelect.value : "24h"
        };
        draft.linkChat.quickActions = this.#readQuickActionEditor();
        draft.linkRoster.enabled = this.#rosterEnabledToggle.checked;
        draft.linkRoster.trackEncounters = this.#rosterTrackingToggle.checked;
        const rosterRetentionDays = Number(this.#rosterRetentionSelect.value);
        if (Number.isInteger(rosterRetentionDays)) {
          draft.linkRoster.retentionDays = rosterRetentionDays;
        }
        draft.linkActivities.enabled = this.#activitiesToggle.checked;
        draft.linkReactions.quickAlerts.friendOnline = this.#friendOnlineAlertToggle.checked;
        draft.linkReactions.quickAlerts.roomJoin = this.#roomJoinAlertToggle.checked;
        draft.linkReactions.sounds.enabled = this.#notificationSoundsToggle.checked;
        draft.linkReactions.sounds.volume = Math.round(Number(this.#soundVolumeInput.value));
        draft.linkReactions.sounds.chat = soundChoiceOr(this.#chatSoundSelect.value, "chime");
        draft.linkReactions.sounds.friendOnline = soundChoiceOr(
          this.#friendOnlineSoundSelect.value,
          "sparkle"
        );
        draft.linkReactions.sounds.roomJoin = soundChoiceOr(
          this.#roomJoinSoundSelect.value,
          "pop"
        );
        draft.linkReactions.enabled = this.#reactionsToggle.checked;
        draft.linkReactions.rules = reactionRules;
        if (Number.isInteger(retentionDays)) draft.linkChat.retentionDays = retentionDays;
      });
      this.#applyTheme(settings);
      this.#schedulePresenceRender();
      this.activities.syncFromSettings();
      if (settings.linkReactions.sounds.enabled) void this.#notificationSounds.unlock();
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
    #resetPanelPosition() {
      this.settings.update((draft) => {
        draft.ui.panelPosition = null;
      });
      this.#positionPanel();
      this.#toast("KikiLink window returned to its default corner.");
    }
    #resetRoomBadgePosition() {
      this.#roomBadge.resetPosition();
      this.#toast("Blossom returned beside the character addon icons.");
    }
    #beginRoomBadgePlacement() {
      if (!this.settings.get().ui.roomBadge.enabled) {
        this.settings.update((draft) => {
          draft.ui.roomBadge.enabled = true;
        });
        this.#roomBadgeToggle.checked = true;
      }
      if (!this.#roomBadge.beginPlacement()) {
        this.#toast("Enter a chat room and wait until your character is visible, then try again.", "error");
        return;
      }
      this.close();
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
      this.#loadingOlderMessages = false;
      this.#renderedMessageIds.clear();
      this.#composer.value = "";
      this.#messages.replaceChildren();
      this.#attachImageButton.disabled = true;
      this.#chat.hidden = true;
      this.#empty.hidden = false;
      this.#panel.dataset.mobileView = "list";
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
      const safeLeft = clamp2(left, 0, maxLeft);
      const safeTop = clamp2(top, 0, maxTop);
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
      const x = maxLeft === 0 ? 0.5 : clamp2(rect.left / maxLeft, 0, 1);
      const y = maxTop === 0 ? 0.5 : clamp2(rect.top / maxTop, 0, 1);
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
    #startPanelDrag(event) {
      if (event.button !== 0 || this.#isMobileLayout()) return;
      const rect = this.#panel.getBoundingClientRect();
      this.#panelDrag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: rect.left,
        startTop: rect.top,
        moved: false
      };
      try {
        event.currentTarget?.setPointerCapture(event.pointerId);
      } catch {
      }
    }
    #movePanel(event) {
      const drag = this.#panelDrag;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(deltaX, deltaY) < 5) return;
      drag.moved = true;
      event.preventDefault();
      this.#panel.dataset.dragging = "true";
      this.#placePanel(drag.startLeft + deltaX, drag.startTop + deltaY);
    }
    #finishPanelDrag(event) {
      const drag = this.#panelDrag;
      if (!drag || drag.pointerId !== event.pointerId) return;
      this.#panelDrag = void 0;
      this.#panel.dataset.dragging = "false";
      try {
        event.currentTarget?.releasePointerCapture(event.pointerId);
      } catch {
      }
      if (drag.moved) this.#savePanelPosition();
    }
    #cancelPanelDrag(event) {
      if (!this.#panelDrag || this.#panelDrag.pointerId !== event.pointerId) return;
      this.#panelDrag = void 0;
      this.#panel.dataset.dragging = "false";
      this.#positionPanel();
    }
    #placePanel(left, top) {
      if (this.#isMobileLayout()) return;
      const rect = this.#panel.getBoundingClientRect();
      const width = rect.width || Math.min(1040, Math.max(320, window.innerWidth - 40));
      const height = rect.height || Math.min(680, Math.max(420, window.innerHeight - 130));
      const margin = 8;
      const maxLeft = Math.max(margin, window.innerWidth - width - margin);
      const maxTop = Math.max(margin, window.innerHeight - height - margin);
      this.#panel.style.left = `${Math.round(clamp2(left, margin, maxLeft))}px`;
      this.#panel.style.top = `${Math.round(clamp2(top, margin, maxTop))}px`;
      this.#panel.style.right = "auto";
      this.#panel.style.bottom = "auto";
    }
    #savePanelPosition() {
      const rect = this.#panel.getBoundingClientRect();
      const margin = 8;
      const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
      const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
      const x = maxLeft === margin ? 0.5 : clamp2((rect.left - margin) / (maxLeft - margin), 0, 1);
      const y = maxTop === margin ? 0.5 : clamp2((rect.top - margin) / (maxTop - margin), 0, 1);
      this.settings.update((draft) => {
        draft.ui.panelPosition = { x, y };
      });
    }
    #positionPanel() {
      const position = this.settings.get().ui.panelPosition;
      if (!position || this.#isMobileLayout()) {
        this.#panel.style.removeProperty("left");
        this.#panel.style.removeProperty("top");
        this.#panel.style.removeProperty("right");
        this.#panel.style.removeProperty("bottom");
        return;
      }
      const rect = this.#panel.getBoundingClientRect();
      const width = rect.width || Math.min(1040, Math.max(320, window.innerWidth - 40));
      const height = rect.height || Math.min(680, Math.max(420, window.innerHeight - 130));
      const margin = 8;
      this.#placePanel(
        margin + position.x * Math.max(0, window.innerWidth - width - margin * 2),
        margin + position.y * Math.max(0, window.innerHeight - height - margin * 2)
      );
    }
    #isMobileLayout() {
      return window.innerWidth <= 720;
    }
    #showConversationList() {
      this.#panel.dataset.mobileView = "list";
      this.#search.focus();
    }
    #emblem(className) {
      const image = element("img", { className: "kl-emblem-image" });
      image.src = kikilink_emblem_default;
      image.alt = "";
      image.decoding = "async";
      image.draggable = false;
      return element("span", { className: `kl-emblem ${className}` }, image);
    }
    #avatar(name, memberNumber, extraClass = "") {
      const avatar = element("div", {
        className: `kl-avatar${extraClass ? ` ${extraClass}` : ""}`
      });
      this.#renderAvatar(avatar, name, memberNumber);
      return avatar;
    }
    #renderAvatar(target, name, memberNumber, explicitUrl) {
      const allowedUrl = explicitUrl ?? this.presence.get(memberNumber).avatarUrl ?? "";
      if (target.dataset.avatarName === name && target.dataset.avatarUrl === allowedUrl && target.childNodes.length > 0) {
        return;
      }
      target.dataset.kikilinkAvatar = "true";
      target.dataset.avatarName = name;
      target.dataset.avatarUrl = allowedUrl;
      target.dataset.avatarMemberNumber = memberNumber.toString();
      target.removeAttribute("aria-label");
      const fallback = () => {
        if (target.dataset.avatarName !== name || target.dataset.avatarUrl !== allowedUrl) return;
        target.replaceChildren(document.createTextNode(avatarText(name)));
        target.dataset.avatarState = "initials";
      };
      fallback();
      if (!allowedUrl) return;
      const image = document.createElement("img");
      image.alt = `${name} profile avatar`;
      image.loading = "lazy";
      image.decoding = "async";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("load", () => {
        if (target.dataset.avatarName !== name || target.dataset.avatarUrl !== allowedUrl) return;
        target.dataset.avatarState = "image";
      }, { once: true });
      image.addEventListener("error", fallback, { once: true });
      target.replaceChildren(image);
      target.dataset.avatarState = "loading";
      image.src = allowedUrl;
    }
    #renderOwnAvatarPreview() {
      const url = normalizeImageUrl(this.#presenceAvatarUrl.value);
      this.#renderAvatar(
        this.#presenceAvatarPreview,
        this.adapter.getOwnName(),
        this.adapter.getOwnMemberNumber(),
        url ?? ""
      );
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
      const surface = this.#newChatDialog.open ? this.#newChatDialog : this.#panel.hidden ? this.#shadow : this.#panel;
      if (surface === this.#shadow) {
        toast.classList.add("kl-toast--floating");
        toast.dataset.side = this.settings.get().ui.launcherSide;
      }
      surface.append(toast);
      if (kind === "info") {
        this.#toastTimer = setTimeout(() => {
          toast.remove();
          this.#toastTimer = void 0;
        }, 5e3);
      }
    }
  };
  function reactionField(label, control, className = "") {
    return element(
      "label",
      { className: `kl-reaction-field${className ? ` ${className}` : ""}` },
      element("span", { className: "kl-reaction-field-label", text: label }),
      control
    );
  }
  function parseReactionMemberNumbers(value) {
    const source = value.trim();
    if (!source) return [];
    const memberNumbers = [];
    for (const token of source.split(/[\s,;]+/u).filter(Boolean)) {
      const normalized = token.replace(/^#/u, "");
      if (!/^\d+$/u.test(normalized)) return void 0;
      const memberNumber = Number(normalized);
      if (!Number.isSafeInteger(memberNumber) || memberNumber < 0) return void 0;
      if (!memberNumbers.includes(memberNumber)) memberNumbers.push(memberNumber);
      if (memberNumbers.length > MAX_REACTION_MEMBERS) return void 0;
    }
    return memberNumbers;
  }
  function createReactionRuleId() {
    const random = typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID().slice(0, 12) : Math.random().toString(36).slice(2, 14);
    return `reaction-${Date.now().toString(36)}-${random}`;
  }
  function soundChoiceOr(value, fallback) {
    return value === "sparkle" || value === "pop" || value === "chime" || /^custom:[a-z0-9_-]{1,64}$/iu.test(value) ? value : fallback;
  }
  function roomActionPastTense(action) {
    if (action === "kick") return "Kicked";
    if (action === "promote") return "Promoted";
    if (action === "demote") return "Removed admin from";
    if (action === "whitelist") return "Whitelisted";
    return "Removed from room whitelist";
  }
  function finderSettingResults() {
    const definitions = [
      {
        section: "appearance",
        title: "Appearance & comfort",
        detail: "Theme, logo comfort, room Blossom position, spacing, text size, and motion",
        keywords: "light dark system color colour blossom addon badge icon position drag reset guided focused density compact super tiny font scale reduced motion"
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
        detail: "Typing, temporary Catbox images, history, retention, and Quick Actions",
        keywords: "beep messages typing indicator realtime image picture preview upload local catbox litterbox temporary privacy enter send newline save storage days clear wave hug boop template afk idle avatar profile"
      },
      {
        section: "players",
        title: "Players & notebook",
        detail: "Roster, encounters, retention, notes, and notebook backup",
        keywords: "people linkroster tracking private data clear whisper profile export import backup json favorites tags retention"
      },
      {
        section: "activities",
        title: "Custom Activities",
        detail: "Body slots, vanilla pictures, action text, and optional arousal",
        keywords: "custom activities blossom body slot image target me gender pronoun arousal advanced"
      },
      {
        section: "reactions",
        title: "Notifications",
        detail: "Friend, room, and chat alerts with optional sounds and advanced rules",
        keywords: "alert sound audio chime sparkle pop linkreactions automation event rule beep join leave online friend notification notice emote advanced cooldown template"
      },
      {
        section: "about",
        title: "About KikiLink",
        detail: "Creator, version, Discord, repository, and license",
        keywords: "about creator kiki member number version discord community github repository license mit"
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
  function aboutFact(label, value) {
    return element(
      "div",
      { className: "kl-about-fact" },
      element("dt", { text: label }),
      element("dd", { text: value })
    );
  }
  function selectOption2(value, label) {
    const option = element("option", { text: label });
    option.value = value;
    return option;
  }
  function activePlaylist(playlists, activeId) {
    const playlist = playlists.find((candidate) => candidate.id === activeId) ?? playlists[0];
    if (!playlist) throw new Error("Create a playlist first");
    return playlist;
  }
  function createLocalId(prefix) {
    const random = typeof crypto === "object" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}-${random}`.toLocaleLowerCase().replace(/[^a-z0-9_-]/gu, "").slice(0, 64);
  }
  function normalizeAudioTrackUrl(value) {
    const candidate = value.trim();
    if (!candidate || candidate.length > 500) throw new Error("Enter a direct HTTPS audio link");
    let url;
    try {
      url = new URL(candidate);
    } catch {
      throw new Error("Enter a valid direct HTTPS audio link");
    }
    if (url.protocol !== "https:" || url.username || url.password || !/\.(?:aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/iu.test(url.pathname)) {
      throw new Error("Use a direct HTTPS audio link ending in a supported audio extension");
    }
    return url.href;
  }
  function normalizeRoomTrackUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password && /\.(?:mp3|mp4)$/iu.test(url.pathname) ? url.href : void 0;
    } catch {
      return void 0;
    }
  }
  function trackTitleFromUrl(value) {
    try {
      const file = new URL(value).pathname.split("/").at(-1) ?? "";
      return decodeURIComponent(file).replace(/\.[^.]+$/u, "").replace(/[_-]+/gu, " ").trim().slice(0, 80);
    } catch {
      return "Untitled track";
    }
  }
  function formatAudioTime(value) {
    const seconds = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
  }
  function lobbySpaceLabel(value) {
    return value === "X" ? "Mixed" : value === "M" ? "Male" : "Female";
  }
  function rosterRelationshipLabel(relationship) {
    if (relationship === "owner") return "Owner";
    if (relationship === "lover") return "Lover";
    if (relationship === "whitelist") return "Whitelist";
    if (relationship === "blacklist") return "Blacklist";
    return "Ghosted";
  }
  function rosterRelationshipDescription(relationship) {
    if (relationship === "owner") return "This player is your current owner";
    if (relationship === "lover") return "This player is in your BC lover list";
    if (relationship === "whitelist") return "This player is on your BC whitelist";
    if (relationship === "blacklist") return "This player is on your BC blacklist";
    return "This player is on your BC ghost list";
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
    if (status === "dnd") return "Silences local alerts and stops chat auto-open";
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
  function messageGroupPosition(previousDirection, direction, nextDirection) {
    const joinsPrevious = direction !== void 0 && previousDirection === direction;
    const joinsNext = direction !== void 0 && nextDirection === direction;
    if (joinsPrevious && joinsNext) return "middle";
    if (joinsPrevious) return "end";
    if (joinsNext) return "start";
    return "single";
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
  function formatBytes(value) {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  function imageUploadErrorMessage(error) {
    const message = error instanceof Error ? error.message.trim() : "Unable to prepare this image";
    return (message || "Unable to prepare this image").slice(0, 180);
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
  function clamp2(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // src/modules/link-chat/afk-auto-reply-service.ts
  var SENDER_COOLDOWN_MS = 30 * 6e4;
  var GLOBAL_WINDOW_MS = 6e4;
  var MAX_REPLIES_PER_WINDOW = 5;
  var MAX_REPLY_LENGTH = 1e3;
  var AfkAutoReplyService = class {
    constructor(adapter, callbacks) {
      this.adapter = adapter;
      this.callbacks = callbacks;
      const clock = callbacks.now;
      this.#now = clock ? () => clock.call(callbacks) : Date.now;
    }
    adapter;
    callbacks;
    #repliedThisIdle = /* @__PURE__ */ new Set();
    #lastReplyAt = /* @__PURE__ */ new Map();
    #recentReplyTimes = [];
    #now;
    #awaySessionStatus;
    syncStatus() {
      try {
        this.#applyStatus(this.callbacks.getStatus());
      } catch {
        this.#applyStatus("online");
      }
    }
    handleIncoming(event) {
      if (event.direction !== "incoming" || !validMemberNumber3(event.peerNumber)) return void 0;
      let status;
      let config;
      try {
        status = this.callbacks.getStatus();
        config = this.callbacks.getConfig();
      } catch {
        return void 0;
      }
      this.#applyStatus(status);
      if (status !== "idle" && status !== "dnd" || config.enabled !== true) return void 0;
      const message = normalizeReplyMessage(config.message);
      if (!message || this.#repliedThisIdle.has(event.peerNumber)) return void 0;
      const now = this.#safeNow();
      this.#prune(now);
      const lastReplyAt = this.#lastReplyAt.get(event.peerNumber);
      if (lastReplyAt !== void 0 && now - lastReplyAt < SENDER_COOLDOWN_MS) return void 0;
      if (this.#recentReplyTimes.length >= MAX_REPLIES_PER_WINDOW) return void 0;
      this.#repliedThisIdle.add(event.peerNumber);
      try {
        const sent = this.adapter.sendBeep(event.peerNumber, message, false);
        this.#lastReplyAt.set(event.peerNumber, now);
        this.#recentReplyTimes.push(now);
        return sent;
      } catch {
        this.#repliedThisIdle.delete(event.peerNumber);
        return void 0;
      }
    }
    reset() {
      this.#awaySessionStatus = void 0;
      this.#repliedThisIdle.clear();
      this.#lastReplyAt.clear();
      this.#recentReplyTimes.splice(0);
    }
    #applyStatus(status) {
      const away = status === "idle" || status === "dnd" ? status : void 0;
      if (away === this.#awaySessionStatus) return;
      this.#awaySessionStatus = away;
      this.#repliedThisIdle.clear();
    }
    #safeNow() {
      const now = this.#now();
      return Number.isFinite(now) && now >= 0 ? now : Date.now();
    }
    #prune(now) {
      while (this.#recentReplyTimes.length > 0 && now - (this.#recentReplyTimes[0] ?? now) >= GLOBAL_WINDOW_MS) {
        this.#recentReplyTimes.shift();
      }
      for (const [memberNumber, repliedAt] of this.#lastReplyAt) {
        if (now - repliedAt >= SENDER_COOLDOWN_MS) this.#lastReplyAt.delete(memberNumber);
      }
    }
  };
  function normalizeReplyMessage(value) {
    if (typeof value !== "string") return "";
    return value.trim().slice(0, MAX_REPLY_LENGTH);
  }
  function validMemberNumber3(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  // src/modules/link-chat/link-chat-module.ts
  var LinkChatModule = class {
    id = "link-chat";
    #logger = new Logger("link-chat");
    #unsubscribers = [];
    #context;
    #service;
    #activities;
    #roster;
    #presence;
    #afkAutoReply;
    #view;
    #rosterTimer;
    isEnabled(settings) {
      return settings.linkChat.enabled;
    }
    start(context) {
      this.#context = context;
      this.#service = new ChatService(context.repository, context.settings);
      this.#activities = new LinkActivitiesService(context.adapter, context.settings);
      this.#activities.start();
      this.#roster = new LinkRosterService(
        context.adapter,
        new PeopleRepository(context.accountStorage),
        context.settings
      );
      this.#presence = new LinkPresenceService(
        context.adapter,
        context.settings,
        context.bus,
        context.version
      );
      this.#presence.start();
      this.#afkAutoReply = new AfkAutoReplyService(context.adapter, {
        getStatus: () => this.#presence?.getOwnStatus() ?? "online",
        getConfig: () => context.settings.get().linkPresence.afkAutoReply
      });
      this.#afkAutoReply.syncStatus();
      this.#unsubscribers.push(
        this.#presence.subscribe(() => this.#afkAutoReply?.syncStatus())
      );
      this.#roster.prune();
      this.#view = new LinkChatView(
        context.adapter,
        this.#service,
        context.settings,
        context.version,
        this.#activities,
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
          this.#activities?.syncFromSettings();
          void this.#importRecentBeeps();
          this.#syncRoster();
        }),
        context.bus.on("beep:received", (event) => void this.#capture(event)),
        context.bus.on("beep:sent", (event) => void this.#capture(event)),
        context.bus.on(
          "link-reactions:notification",
          (event) => this.#view?.onNotification(event)
        ),
        context.bus.on("link-reactions:fired", (event) => this.#view?.onReaction(event))
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
      this.#activities?.stop();
      this.#activities = void 0;
      this.#presence?.stop();
      this.#presence = void 0;
      this.#afkAutoReply?.reset();
      this.#afkAutoReply = void 0;
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
      const automaticReply = event.direction === "incoming" ? this.#afkAutoReply?.handleIncoming(event) : void 0;
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
      if (automaticReply) await this.#capture(automaticReply);
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

  // src/modules/link-reactions/link-reactions-service.ts
  var MIN_ROOM_REACTION_INTERVAL_MS = 1e4;
  var LinkReactionsService = class {
    constructor(adapter, settings) {
      this.adapter = adapter;
      this.settings = settings;
    }
    adapter;
    settings;
    #lastRuleFiredAt = /* @__PURE__ */ new Map();
    #lastRoomEmoteAt = Number.NEGATIVE_INFINITY;
    react(event, now = Date.now()) {
      const settings = this.settings.get().linkReactions;
      if (!settings.enabled) return void 0;
      for (const rule of settings.rules) {
        if (!matchesRule(rule, event)) continue;
        const lastFiredAt = this.#lastRuleFiredAt.get(rule.id) ?? Number.NEGATIVE_INFINITY;
        if (now - lastFiredAt < rule.cooldownSeconds * 1e3) continue;
        const message = expandReactionTemplate(rule, event, this.adapter.getOwnName());
        if (!message) continue;
        if (rule.action === "room-emote") {
          if (now - this.#lastRoomEmoteAt < MIN_ROOM_REACTION_INTERVAL_MS) continue;
          if (!this.adapter.canSendRoomEmote()) continue;
          this.adapter.sendRoomEmote(message);
          this.#lastRoomEmoteAt = now;
        }
        this.#lastRuleFiredAt.set(rule.id, now);
        return {
          ruleId: rule.id,
          ruleLabel: rule.label,
          action: rule.action,
          message,
          event,
          firedAt: now
        };
      }
      return void 0;
    }
  };
  function matchesRule(rule, event) {
    if (!rule.enabled || rule.trigger !== event.trigger) return false;
    if (rule.scope === "friends" && !event.isFriend) return false;
    if (rule.scope === "members" && !rule.memberNumbers.includes(event.memberNumber)) return false;
    if (rule.trigger === "beep-received" && rule.textMatch) {
      return normalizeText(event.content ?? "").includes(normalizeText(rule.textMatch));
    }
    return true;
  }
  function expandReactionTemplate(rule, event, ownName) {
    const eventLabel = event.trigger === "room-join" ? "joined the room" : event.trigger === "room-leave" ? "left the room" : event.trigger === "friend-online" ? "came online" : "sent a Beep";
    const privateMessage = rule.action === "notice" ? cleanValue(event.content) : "";
    return rule.template.replaceAll("{name}", cleanValue(event.memberName)).replaceAll("{member}", event.memberNumber.toString()).replaceAll("{message}", privateMessage).replaceAll("{room}", cleanValue(event.roomName) || "the room").replaceAll("{me}", cleanValue(ownName) || "me").replaceAll("{event}", eventLabel).replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, 1e3);
  }
  function normalizeText(value) {
    return value.trim().toLocaleLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/\s+/gu, " ");
  }
  function cleanValue(value) {
    return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, 500) : "";
  }

  // src/modules/link-reactions/link-reactions-module.ts
  var ROOM_POLL_MS = 2e3;
  var LinkReactionsModule = class {
    id = "link-reactions";
    #logger = new Logger("link-reactions");
    #unsubscribers = [];
    #roomMembers = /* @__PURE__ */ new Map();
    #context;
    #service;
    #roomTimer;
    #roomName;
    #onlineMembers;
    isEnabled(_settings) {
      return true;
    }
    start(context) {
      this.#context = context;
      this.#service = new LinkReactionsService(context.adapter, context.settings);
      this.#unsubscribers.push(
        context.bus.on("bc:ready", () => this.#resetBaselines()),
        context.bus.on("beep:received", (event) => {
          this.#notify(
            "chat",
            `New Beep from ${event.peerName}.`,
            false,
            event.peerNumber,
            event.sentAt
          );
          this.#run({
            trigger: "beep-received",
            memberNumber: event.peerNumber,
            memberName: event.peerName,
            isFriend: context.adapter.isKnownFriend(event.peerNumber),
            occurredAt: event.sentAt,
            content: event.content,
            ...event.roomName ? { roomName: event.roomName } : {}
          });
        }),
        context.bus.on(
          "bc:online-friends",
          ({ friends, receivedAt }) => this.#syncOnlineFriends(friends, receivedAt)
        )
      );
      this.#syncRoom();
      this.#roomTimer = setInterval(() => this.#syncRoom(), ROOM_POLL_MS);
    }
    stop() {
      if (this.#roomTimer !== void 0) clearInterval(this.#roomTimer);
      this.#roomTimer = void 0;
      for (const unsubscribe of this.#unsubscribers.splice(0).reverse()) unsubscribe();
      this.#roomMembers.clear();
      this.#roomName = void 0;
      this.#onlineMembers = void 0;
      this.#service = void 0;
      this.#context = void 0;
    }
    #resetBaselines() {
      this.#roomMembers.clear();
      this.#roomName = void 0;
      this.#onlineMembers = void 0;
      this.#syncRoom();
    }
    #syncRoom() {
      const context = this.#context;
      if (!context) return;
      if (!context.adapter.isInChatRoom()) {
        this.#roomMembers.clear();
        this.#roomName = void 0;
        return;
      }
      const roomName = context.adapter.getCurrentRoomName() ?? "Unnamed room";
      const current = new Map(
        context.adapter.getRoomCharacters().map((character) => [character.memberNumber, character])
      );
      if (this.#roomName !== roomName) {
        this.#roomName = roomName;
        this.#replaceRoomMembers(current);
        return;
      }
      const joined = [...current.values()].filter(
        (character) => !this.#roomMembers.has(character.memberNumber)
      );
      const left = [...this.#roomMembers.values()].filter(
        (character) => !current.has(character.memberNumber)
      );
      this.#replaceRoomMembers(current);
      const occurredAt = Date.now();
      for (const character of joined) {
        const event = roomEvent("room-join", character, roomName, occurredAt);
        this.#notify(
          "room-join",
          `${character.memberName} joined ${roomName}.`,
          true,
          character.memberNumber,
          occurredAt
        );
        this.#run(event);
      }
      for (const character of left) {
        this.#run(roomEvent("room-leave", character, roomName, occurredAt));
      }
    }
    #replaceRoomMembers(current) {
      this.#roomMembers.clear();
      for (const [memberNumber, character] of current) {
        this.#roomMembers.set(memberNumber, character);
      }
    }
    #syncOnlineFriends(friends, occurredAt) {
      const current = new Set(friends.map((friend) => friend.memberNumber));
      const previous = this.#onlineMembers;
      this.#onlineMembers = current;
      if (!previous) return;
      for (const friend of friends) {
        if (previous.has(friend.memberNumber)) continue;
        const event = {
          trigger: "friend-online",
          memberNumber: friend.memberNumber,
          memberName: friend.memberName,
          isFriend: true,
          occurredAt,
          ...friend.roomName ? { roomName: friend.roomName } : {}
        };
        this.#notify(
          "friend-online",
          `${friend.memberName} is online.`,
          true,
          friend.memberNumber,
          occurredAt
        );
        this.#run(event);
      }
    }
    #notify(kind, message, showToast, memberNumber, occurredAt) {
      const context = this.#context;
      if (!context) return;
      const settings = context.settings.get().linkReactions;
      const enabled = kind === "chat" ? settings.sounds.enabled : kind === "friend-online" ? settings.quickAlerts.friendOnline : settings.quickAlerts.roomJoin;
      if (!enabled) return;
      context.bus.emit("link-reactions:notification", {
        kind,
        message,
        showToast,
        memberNumber,
        occurredAt
      });
    }
    #run(event) {
      const context = this.#context;
      const service = this.#service;
      if (!context || !service) return;
      try {
        const fired = service.react(event);
        if (fired) context.bus.emit("link-reactions:fired", fired);
      } catch (error) {
        this.#logger.error("Failed to run a reaction rule", error);
      }
    }
  };
  function roomEvent(trigger, character, roomName, occurredAt) {
    return {
      trigger,
      memberNumber: character.memberNumber,
      memberName: character.memberName,
      isFriend: character.isFriend === true,
      roomName,
      occurredAt
    };
  }

  // src/storage/account-data-storage.ts
  var CLOUD_EXTENSION_KEY = "KikiLink";
  var CLOUD_MIRROR_KEY = "kikilink:cloud-mirror:v1";
  var CLOUD_FORMAT_PREFIX = "KIKILINK/1:";
  var JSON_FORMAT_PREFIX = "JSON:";
  var CLOUD_SYNC_DELAY_MS = 750;
  var MAX_CLOUD_PAYLOAD_CHARS = 12e4;
  var MAX_CLOUD_CONVERSATIONS = 100;
  var MAX_CLOUD_MESSAGES = 600;
  var MAX_CLOUD_MESSAGES_PER_CONVERSATION = 100;
  var AccountKeyValueStorage = class {
    constructor(memberNumber, backing = defaultBackingStorage()) {
      this.backing = backing;
      if (!validMemberNumber4(memberNumber)) throw new Error("A valid BC account is required");
      this.#prefix = `kikilink:account:${memberNumber}:`;
    }
    backing;
    #prefix;
    getItem(key) {
      return this.backing.getItem(this.#key(key));
    }
    setItem(key, value) {
      this.backing.setItem(this.#key(key), value);
    }
    removeItem(key) {
      this.backing.removeItem(this.#key(key));
    }
    #key(key) {
      return `${this.#prefix}${key}`;
    }
  };
  var AccountDataStorage = class {
    constructor(memberNumber, backing) {
      this.memberNumber = memberNumber;
      this.#local = new AccountKeyValueStorage(memberNumber, backing);
      const remote = this.#readRemoteState();
      const mirror = parsePortableState(this.getItem(CLOUD_MIRROR_KEY), memberNumber);
      const selected = newestState(remote, mirror);
      this.#state = selected ?? {
        version: 1,
        owner: memberNumber,
        updatedAt: 0
      };
      if (selected) {
        this.#restorePortableKey(SETTINGS_KEY, selected.settings);
        this.#restorePortableKey(PEOPLE_KEY, selected.people);
        this.#persistMirror();
        if (selected === mirror && (!remote || mirror.updatedAt > remote.updatedAt)) {
          this.#markDirty();
        }
      } else {
        this.#adoptLocalKey(SETTINGS_KEY, "settings");
        this.#adoptLocalKey(PEOPLE_KEY, "people");
        if (this.#state.settings !== void 0 || this.#state.people !== void 0) {
          this.#touch();
          this.#markDirty();
        }
      }
    }
    memberNumber;
    #local;
    #state;
    #repository;
    #syncTimer;
    #flushChain = Promise.resolve();
    #generation = 0;
    #chatDirty = false;
    #destroyed = false;
    getItem(key) {
      try {
        return this.#local.getItem(key);
      } catch {
        return null;
      }
    }
    setItem(key, value) {
      try {
        this.#local.setItem(key, value);
      } catch {
      }
      if (key === SETTINGS_KEY) this.#setPortableValue("settings", value);
      if (key === PEOPLE_KEY) this.#setPortableValue("people", value);
    }
    removeItem(key) {
      try {
        this.#local.removeItem(key);
      } catch {
      }
      if (key === SETTINGS_KEY) this.#removePortableValue("settings");
      if (key === PEOPLE_KEY) this.#removePortableValue("people");
    }
    /** Imports a newer portable snapshot without clearing newer account-local history. */
    async attachChatRepository(repository) {
      this.#repository = repository;
      const chats = this.#state.chats;
      if (!chats) return;
      for (const message of chats.messages) await repository.addMessage(message);
      for (const remoteConversation of chats.conversations) {
        const localConversation = await repository.getConversation(remoteConversation.peerNumber);
        if (!localConversation || remoteConversation.lastMessageAt >= localConversation.lastMessageAt) {
          await repository.putConversation(remoteConversation);
        }
      }
    }
    markChatChanged() {
      if (this.#destroyed) return;
      this.#chatDirty = true;
      this.#markDirty();
    }
    flush() {
      this.#flushChain = this.#flushChain.then(() => this.#flushOnce());
      return this.#flushChain;
    }
    async destroy() {
      if (this.#destroyed) return;
      await this.flush();
      this.#destroyed = true;
      if (this.#syncTimer !== void 0) clearTimeout(this.#syncTimer);
      this.#syncTimer = void 0;
      this.#repository = void 0;
    }
    #setPortableValue(key, raw) {
      try {
        const parsed = JSON.parse(raw);
        if (key === "people" && !Array.isArray(parsed)) return;
        this.#state[key] = parsed;
        this.#touch();
        this.#persistMirror();
        this.#markDirty();
      } catch {
      }
    }
    #removePortableValue(key) {
      delete this.#state[key];
      this.#touch();
      this.#persistMirror();
      this.#markDirty();
    }
    #restorePortableKey(key, value) {
      if (value === void 0) {
        try {
          this.#local.removeItem(key);
        } catch {
        }
        return;
      }
      try {
        this.#local.setItem(key, JSON.stringify(value));
      } catch {
      }
    }
    #adoptLocalKey(key, field) {
      const raw = this.getItem(key);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (field === "people" && !Array.isArray(parsed)) return;
        this.#state[field] = parsed;
      } catch {
      }
    }
    #touch() {
      this.#state.updatedAt = Math.max(Date.now(), this.#state.updatedAt + 1);
    }
    #markDirty() {
      this.#generation += 1;
      if (this.#destroyed) return;
      if (this.#syncTimer !== void 0) clearTimeout(this.#syncTimer);
      this.#syncTimer = setTimeout(() => {
        this.#syncTimer = void 0;
        void this.flush();
      }, CLOUD_SYNC_DELAY_MS);
    }
    async #flushOnce() {
      if (this.#syncTimer !== void 0) clearTimeout(this.#syncTimer);
      this.#syncTimer = void 0;
      if (this.#generation === 0) return;
      const generation = this.#generation;
      if (this.#chatDirty && this.#repository) {
        this.#state.chats = await capturePortableChats(this.#repository);
        this.#chatDirty = false;
        this.#touch();
        this.#persistMirror();
      }
      if (!this.#isCurrentAccount()) return;
      const encoded = encodePortableState(fitPortableState(this.#state));
      if (!encoded || encoded.length > MAX_CLOUD_PAYLOAD_CHARS) {
        console.warn("[KikiLink:storage] Account sync payload is too large; keeping the full local copy");
        return;
      }
      try {
        Player.ExtensionSettings ??= {};
        Player.ExtensionSettings[CLOUD_EXTENSION_KEY] = encoded;
        if (typeof ServerPlayerExtensionSettingsSync !== "function") return;
        ServerPlayerExtensionSettingsSync(CLOUD_EXTENSION_KEY);
        if (generation === this.#generation) this.#generation = 0;
      } catch (error) {
        console.warn("[KikiLink:storage] BC account sync unavailable; local account data is safe", error);
      }
    }
    #persistMirror() {
      try {
        this.#local.setItem(CLOUD_MIRROR_KEY, JSON.stringify(this.#state));
      } catch {
      }
    }
    #readRemoteState() {
      if (!this.#isCurrentAccount() || !Player.ExtensionSettings) return void 0;
      return parsePortableState(Player.ExtensionSettings[CLOUD_EXTENSION_KEY], this.memberNumber);
    }
    #isCurrentAccount() {
      return typeof Player === "object" && Player !== null && Player.MemberNumber === this.memberNumber;
    }
  };
  var AccountSyncedChatRepository = class {
    constructor(repository, account) {
      this.repository = repository;
      this.account = account;
    }
    repository;
    account;
    async addMessage(message) {
      await this.repository.addMessage(message);
      this.account.markChatChanged();
    }
    getMessages(peerNumber, limit) {
      return this.repository.getMessages(peerNumber, limit);
    }
    getConversation(peerNumber) {
      return this.repository.getConversation(peerNumber);
    }
    listConversations() {
      return this.repository.listConversations();
    }
    async putConversation(conversation) {
      await this.repository.putConversation(conversation);
      this.account.markChatChanged();
    }
    async deleteConversation(peerNumber) {
      await this.repository.deleteConversation(peerNumber);
      this.account.markChatChanged();
    }
    async deleteMessagesOlderThan(timestamp) {
      const removed = await this.repository.deleteMessagesOlderThan(timestamp);
      if (removed > 0) this.account.markChatChanged();
      return removed;
    }
    async trimConversation(peerNumber, keepNewest) {
      const removed = await this.repository.trimConversation(peerNumber, keepNewest);
      if (removed > 0) this.account.markChatChanged();
      return removed;
    }
    async clearAll() {
      await this.repository.clearAll();
      this.account.markChatChanged();
    }
    close() {
      this.repository.close();
    }
  };
  function accountChatDatabaseName(memberNumber) {
    if (!validMemberNumber4(memberNumber)) throw new Error("A valid BC account is required");
    return `kikilink-account-${memberNumber}`;
  }
  async function capturePortableChats(repository) {
    const conversations = (await repository.listConversations()).slice(0, MAX_CLOUD_CONVERSATIONS);
    const messages = [];
    for (const conversation of conversations) {
      messages.push(
        ...await repository.getMessages(
          conversation.peerNumber,
          MAX_CLOUD_MESSAGES_PER_CONVERSATION
        )
      );
    }
    messages.sort((left, right) => right.sentAt - left.sentAt);
    return {
      conversations: conversations.map((conversation) => structuredClone(conversation)),
      messages: messages.slice(0, MAX_CLOUD_MESSAGES).sort((left, right) => left.sentAt - right.sentAt).map((message) => structuredClone(message))
    };
  }
  function newestState(remote, mirror) {
    if (!remote) return mirror;
    if (!mirror) return remote;
    return mirror.updatedAt > remote.updatedAt ? mirror : remote;
  }
  function parsePortableState(value, owner) {
    let parsed = value;
    if (typeof value === "string") {
      try {
        if (value.startsWith(CLOUD_FORMAT_PREFIX)) {
          if (typeof LZString !== "object" || typeof LZString.decompressFromBase64 !== "function") {
            return void 0;
          }
          const json = LZString.decompressFromBase64(value.slice(CLOUD_FORMAT_PREFIX.length));
          if (!json) return void 0;
          parsed = JSON.parse(json);
        } else if (value.startsWith(JSON_FORMAT_PREFIX)) {
          parsed = JSON.parse(value.slice(JSON_FORMAT_PREFIX.length));
        } else {
          parsed = JSON.parse(value);
        }
      } catch {
        return void 0;
      }
    }
    if (!isRecord6(parsed) || parsed.version !== 1 || parsed.owner !== owner) return void 0;
    const updatedAt = validTime2(parsed.updatedAt) ? parsed.updatedAt : 0;
    const state = { version: 1, owner, updatedAt };
    if (isRecord6(parsed.settings)) state.settings = structuredClone(parsed.settings);
    if (Array.isArray(parsed.people)) state.people = structuredClone(parsed.people);
    const chats = sanitizePortableChats(parsed.chats);
    if (chats) state.chats = chats;
    return state;
  }
  function sanitizePortableChats(value) {
    if (!isRecord6(value) || !Array.isArray(value.conversations) || !Array.isArray(value.messages)) {
      return void 0;
    }
    const conversations = value.conversations.slice(0, MAX_CLOUD_CONVERSATIONS).map(sanitizeConversation).filter((item) => item !== void 0);
    const allowedPeers = new Set(conversations.map((conversation) => conversation.peerNumber));
    const messages = value.messages.slice(-MAX_CLOUD_MESSAGES).map(sanitizeMessage).filter(
      (item) => item !== void 0 && allowedPeers.has(item.peerNumber)
    );
    return { conversations, messages };
  }
  function sanitizeConversation(value) {
    if (!isRecord6(value) || !validMemberNumber4(value.peerNumber)) return void 0;
    const peerName = cleanText5(value.peerName, 80) || `Member ${value.peerNumber}`;
    const lastDirection = value.lastDirection === "outgoing" ? "outgoing" : "incoming";
    const localAlias = cleanText5(value.localAlias, 80);
    const hiddenAt = validTime2(value.hiddenAt) ? value.hiddenAt : void 0;
    return {
      peerNumber: value.peerNumber,
      peerName,
      ...localAlias ? { localAlias } : {},
      ...hiddenAt !== void 0 ? { hiddenAt } : {},
      lastMessage: cleanText5(value.lastMessage, 1e3),
      lastMessageAt: validTime2(value.lastMessageAt) ? value.lastMessageAt : 0,
      lastDirection,
      unread: integerInRange4(value.unread, 0, 1e5, 0),
      pinned: value.pinned === true,
      draft: cleanText5(value.draft, 1e3)
    };
  }
  function sanitizeMessage(value) {
    if (!isRecord6(value) || !validMemberNumber4(value.peerNumber) || typeof value.id !== "string" || !value.id.trim() || value.id.length > 200 || !validTime2(value.sentAt)) {
      return void 0;
    }
    const roomName = cleanText5(value.roomName, 100);
    return {
      id: value.id,
      direction: value.direction === "outgoing" ? "outgoing" : "incoming",
      peerNumber: value.peerNumber,
      peerName: cleanText5(value.peerName, 80) || `Member ${value.peerNumber}`,
      content: cleanText5(value.content, 1e3),
      sentAt: value.sentAt,
      includeRoom: value.includeRoom === true,
      ...roomName ? { roomName } : {},
      read: value.read === true
    };
  }
  function fitPortableState(state) {
    const fitted = structuredClone(state);
    let encoded = encodePortableState(fitted);
    while (encoded && encoded.length > MAX_CLOUD_PAYLOAD_CHARS && fitted.chats && fitted.chats.messages.length > 0) {
      const remove = Math.max(1, Math.ceil(fitted.chats.messages.length / 5));
      fitted.chats.messages.splice(0, remove);
      encoded = encodePortableState(fitted);
    }
    if (encoded && encoded.length <= MAX_CLOUD_PAYLOAD_CHARS) return fitted;
    if (fitted.chats) {
      delete fitted.chats;
      encoded = encodePortableState(fitted);
    }
    if (encoded && encoded.length <= MAX_CLOUD_PAYLOAD_CHARS) return fitted;
    if (Array.isArray(fitted.people)) {
      fitted.people = prioritizePortablePeople(fitted.people);
      while (fitted.people.length > 0) {
        fitted.people.length = Math.floor(fitted.people.length * 0.8);
        encoded = encodePortableState(fitted);
        if (encoded && encoded.length <= MAX_CLOUD_PAYLOAD_CHARS) return fitted;
      }
      delete fitted.people;
    }
    return fitted;
  }
  function prioritizePortablePeople(values) {
    return [...values].sort((left, right) => personPriority(right) - personPriority(left));
  }
  function personPriority(value) {
    if (!isRecord6(value)) return 0;
    const notebook = value.favorite === true || cleanText5(value.note, 1).length > 0 || Array.isArray(value.tags) && value.tags.length > 0;
    const lastSeen = validTime2(value.lastSeenAt) ? value.lastSeenAt : 0;
    return (notebook ? 10 ** 15 : 0) + lastSeen;
  }
  function encodePortableState(state) {
    try {
      const json = JSON.stringify(state);
      if (typeof LZString === "object" && typeof LZString.compressToBase64 === "function") {
        return `${CLOUD_FORMAT_PREFIX}${LZString.compressToBase64(json)}`;
      }
      return `${JSON_FORMAT_PREFIX}${json}`;
    } catch {
      return void 0;
    }
  }
  function defaultBackingStorage() {
    if (typeof localStorage === "undefined") return new MemoryKeyValueStorage();
    try {
      localStorage.getItem("kikilink:account-storage-probe");
      return localStorage;
    } catch {
      return new MemoryKeyValueStorage();
    }
  }
  function validMemberNumber4(value) {
    return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
  }
  function validTime2(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  }
  function integerInRange4(value, min, max, fallback) {
    return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
  }
  function cleanText5(value, limit) {
    return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) : "";
  }
  function isRecord6(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  // src/storage/indexeddb-chat-repository.ts
  var DATABASE_NAME = "kikilink";
  var DATABASE_VERSION3 = 1;
  var MESSAGE_STORE = "messages";
  var CONVERSATION_STORE = "conversations";
  var PEER_TIME_INDEX = "peer-time";
  var TIME_INDEX = "time";
  var IndexedDbChatRepository = class {
    constructor(databaseName3 = DATABASE_NAME) {
      this.databaseName = databaseName3;
    }
    databaseName;
    #databasePromise;
    async addMessage(message) {
      const database = await this.#database();
      const transaction = database.transaction(MESSAGE_STORE, "readwrite");
      const done = transactionDone3(transaction);
      transaction.objectStore(MESSAGE_STORE).put(message);
      await done;
    }
    async getMessages(peerNumber, limit = 200) {
      const database = await this.#database();
      const transaction = database.transaction(MESSAGE_STORE, "readonly");
      const done = transactionDone3(transaction);
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
      const done = transactionDone3(transaction);
      const value = await requestResult3(
        transaction.objectStore(CONVERSATION_STORE).get(peerNumber)
      );
      await done;
      return value;
    }
    async listConversations() {
      const database = await this.#database();
      const transaction = database.transaction(CONVERSATION_STORE, "readonly");
      const done = transactionDone3(transaction);
      const values = await requestResult3(
        transaction.objectStore(CONVERSATION_STORE).getAll()
      );
      await done;
      return values.sort(sortConversations);
    }
    async putConversation(conversation) {
      const database = await this.#database();
      const transaction = database.transaction(CONVERSATION_STORE, "readwrite");
      const done = transactionDone3(transaction);
      transaction.objectStore(CONVERSATION_STORE).put(conversation);
      await done;
    }
    async deleteConversation(peerNumber) {
      const database = await this.#database();
      const transaction = database.transaction([MESSAGE_STORE, CONVERSATION_STORE], "readwrite");
      const done = transactionDone3(transaction);
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
      const done = transactionDone3(transaction);
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
      const done = transactionDone3(transaction);
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
      const done = transactionDone3(transaction);
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
      this.#databasePromise ??= openDatabase3(this.databaseName);
      return this.#databasePromise;
    }
  };
  function openDatabase3(databaseName3) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName3, DATABASE_VERSION3);
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
  function requestResult3(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("KikiLink storage request failed"));
    });
  }
  function transactionDone3(transaction) {
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
      this.#modules.register(this.#linkReactions);
    }
    version;
    #logger = new Logger("core");
    #bus = new EventBus();
    #adapter;
    #modules = new ModuleRegistry();
    #linkChat = new LinkChatModule();
    #linkReactions = new LinkReactionsModule();
    #settings;
    #repository;
    #accountStorage;
    #adapterStart;
    #accountMonitorTimer;
    #activeMemberNumber;
    #desiredMemberNumber;
    #transitionPromise;
    #versionBadge;
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
      this.#mountVersionBadge();
      await waitForAuthenticatedPlayer(() => this.#started);
      if (!this.#started) return;
      this.#desiredMemberNumber = authenticatedMemberNumber();
      await this.#runAccountTransitions();
      if (!this.#started) return;
      this.#accountMonitorTimer = setInterval(() => this.#monitorAccount(), 250);
    }
    async destroy() {
      if (!this.#started) return;
      this.#started = false;
      if (this.#accountMonitorTimer !== void 0) clearInterval(this.#accountMonitorTimer);
      this.#accountMonitorTimer = void 0;
      this.#desiredMemberNumber = void 0;
      await this.#transitionPromise;
      await this.#deactivateAccount();
      this.#versionBadge?.remove();
      this.#versionBadge = void 0;
      this.#bus.clear();
      this.#logger.info("Stopped");
    }
    #monitorAccount() {
      const memberNumber = authenticatedMemberNumber();
      if (memberNumber === this.#desiredMemberNumber && memberNumber === this.#activeMemberNumber) {
        const host = document.querySelector("#kikilink-root");
        if (host) host.hidden = false;
        return;
      }
      const oldHost = document.querySelector("#kikilink-root");
      if (oldHost) oldHost.hidden = true;
      this.#desiredMemberNumber = memberNumber;
      void this.#runAccountTransitions();
    }
    #runAccountTransitions() {
      if (this.#transitionPromise) return this.#transitionPromise;
      const transition = (async () => {
        while (this.#started && this.#desiredMemberNumber !== this.#activeMemberNumber) {
          const target = this.#desiredMemberNumber;
          await this.#deactivateAccount();
          if (!this.#started || target === void 0) continue;
          if (authenticatedMemberNumber() !== target) continue;
          await this.#activateAccount(target);
        }
      })();
      this.#transitionPromise = transition.finally(() => {
        this.#transitionPromise = void 0;
        if (this.#started && this.#desiredMemberNumber !== this.#activeMemberNumber) {
          void this.#runAccountTransitions();
        }
      });
      return this.#transitionPromise;
    }
    async #activateAccount(memberNumber) {
      const accountStorage = new AccountDataStorage(memberNumber);
      const settings = new SettingsStore(accountStorage);
      const localRepository = typeof indexedDB === "undefined" ? new MemoryChatRepository() : new ResilientChatRepository(
        new IndexedDbChatRepository(accountChatDatabaseName(memberNumber)),
        new MemoryChatRepository()
      );
      await accountStorage.attachChatRepository(localRepository);
      if (!this.#started || this.#desiredMemberNumber !== memberNumber || authenticatedMemberNumber() !== memberNumber) {
        localRepository.close();
        await accountStorage.destroy();
        return;
      }
      const repository = new AccountSyncedChatRepository(localRepository, accountStorage);
      this.#settings = settings;
      this.#repository = repository;
      this.#accountStorage = accountStorage;
      await this.#modules.startAll({
        adapter: this.#adapter,
        bus: this.#bus,
        repository,
        settings,
        accountStorage,
        memberNumber,
        version: this.version
      });
      this.#activeMemberNumber = memberNumber;
      this.#adapterStart = this.#adapter.start().catch((error) => {
        this.#logger.error("Bondage Club connection failed", error);
      });
      const host = document.querySelector("#kikilink-root");
      if (host) host.hidden = false;
      this.#logger.info(`KikiLink ${this.version} ready for account ${memberNumber}`);
    }
    async #deactivateAccount() {
      if (this.#activeMemberNumber === void 0 && !this.#settings && !this.#repository && !this.#accountStorage) {
        return;
      }
      this.#adapter.stop();
      await this.#adapterStart;
      this.#adapterStart = void 0;
      await this.#modules.stopAll();
      await this.#accountStorage?.destroy();
      this.#repository?.close();
      this.#repository = void 0;
      this.#settings = void 0;
      this.#accountStorage = void 0;
      this.#activeMemberNumber = void 0;
    }
    #mountVersionBadge() {
      const existing = document.getElementById("kikilink-version");
      if (existing) existing.remove();
      const badge = document.createElement("span");
      badge.id = "kikilink-version";
      badge.dataset.kikilinkVersion = this.version;
      badge.textContent = this.version;
      badge.setAttribute("aria-hidden", "true");
      Object.assign(badge.style, {
        position: "fixed",
        left: "3px",
        bottom: "2px",
        zIndex: "2147483646",
        color: "#fff",
        opacity: "0.18",
        font: "7px/1 monospace",
        letterSpacing: "0",
        pointerEvents: "none",
        userSelect: "none",
        mixBlendMode: "difference"
      });
      document.body.append(badge);
      this.#versionBadge = badge;
    }
  };
  async function waitForAuthenticatedPlayer(keepWaiting) {
    while (keepWaiting() && authenticatedMemberNumber() === void 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  function authenticatedMemberNumber() {
    if (typeof document === "undefined" || document.body === null || typeof Player !== "object" || Player === null || !Number.isSafeInteger(Player.MemberNumber) || Player.MemberNumber <= 0) {
      return void 0;
    }
    try {
      if (typeof ServerIsLoggedIn === "function") {
        if (!ServerIsLoggedIn()) return void 0;
        if (typeof Player.ExtensionSettings !== "object" || Player.ExtensionSettings === null || Array.isArray(Player.ExtensionSettings)) {
          return void 0;
        }
      }
      return Player.MemberNumber;
    } catch {
      return void 0;
    }
  }

  // src/index.ts
  async function bootstrap() {
    const previous = window.KikiLink;
    if (previous) await previous.destroy();
    const app = new KikiLinkApp("0.22.1");
    window.KikiLink = app.publicApi();
    try {
      await app.start();
    } catch (error) {
      console.error("[KikiLink] Startup failed", error);
    }
  }
  void bootstrap();
})();
