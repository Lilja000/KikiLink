/*!
 * KikiLink 0.29.0
 * Copyright (c) 2026 KikiLink contributors
 * MIT licensed: https://github.com/Lilja000/KikiLink
 */
/*!
 * KikiLink includes bondage-club-mod-sdk 1.2.0.
 *
 * MIT License
 *
 * Copyright (c) 2022 Jomshir98
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
"use strict";(()=>{var Dd=Object.create;var Xo=Object.defineProperty;var Gd=Object.getOwnPropertyDescriptor;var Bd=Object.getOwnPropertyNames;var Ud=Object.getPrototypeOf,Fd=Object.prototype.hasOwnProperty;var Hd=(r,e)=>()=>{try{return e||r((e={exports:{}}).exports,e),e.exports}catch(t){throw e=0,t}};var $d=(r,e,t,i)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of Bd(e))!Fd.call(r,n)&&n!==t&&Xo(r,n,{get:()=>e[n],enumerable:!(i=Gd(e,n))||i.enumerable});return r};var Kd=(r,e,t)=>(t=r!=null?Dd(Ud(r)):{},$d(e||!r||!r.__esModule?Xo(t,"default",{value:r,enumerable:!0}):t,r));var Yo=Hd($i=>{var Tg=(function(){"use strict";let r="1.2.0";function e(b){alert(`Mod ERROR:
`+b);let N=new Error(b);throw console.error(N),N}let t=new TextEncoder;function i(b){return!!b&&typeof b=="object"&&!Array.isArray(b)}function n(b){let N=new Set;return b.filter((k=>!N.has(k)&&N.add(k)))}let o=new Map,a=new Set;function l(b){a.has(b)||(a.add(b),console.warn(b))}function d(b){let N=[],k=new Map,C=new Set;for(let T of h.values()){let D=T.patching.get(b.name);if(D){N.push(...D.hooks);for(let[_,M]of D.patches.entries())k.has(_)&&k.get(_)!==M&&l(`ModSDK: Mod '${T.name}' is patching function ${b.name} with same pattern that is already applied by different mod, but with different pattern:
Pattern:
${_}
Patch1:
${k.get(_)||""}
Patch2:
${M}`),k.set(_,M),C.add(T.name)}}N.sort(((T,D)=>D.priority-T.priority));let I=(function(T,D){if(D.size===0)return T;let _=T.toString().replaceAll(`\r
`,`
`);for(let[M,B]of D.entries())_.includes(M)||l(`ModSDK: Patching ${T.name}: Patch ${M} not applied`),_=_.replaceAll(M,B);return(0,eval)(`(${_})`)})(b.original,k),G=function(T){var D,_;let M=(_=(D=g.errorReporterHooks).hookChainExit)===null||_===void 0?void 0:_.call(D,b.name,C),B=I.apply(this,T);return M?.(),B};for(let T=N.length-1;T>=0;T--){let D=N[T],_=G;G=function(M){var B,z;let Y=(z=(B=g.errorReporterHooks).hookEnter)===null||z===void 0?void 0:z.call(B,b.name,D.mod),J=D.hook.apply(this,[M,j=>{if(arguments.length!==1||!Array.isArray(M))throw new Error(`Mod ${D.mod} failed to call next hook: Expected args to be array, got ${typeof j}`);return _.call(this,j)}]);return Y?.(),J}}return{hooks:N,patches:k,patchesSources:C,enter:G,final:I}}function c(b,N=!1){let k=o.get(b);if(k)N&&(k.precomputed=d(k));else{let C=window,I=b.split(".");for(let _=0;_<I.length-1;_++)if(C=C[I[_]],!i(C))throw new Error(`ModSDK: Function ${b} to be patched not found; ${I.slice(0,_+1).join(".")} is not object`);let G=C[I[I.length-1]];if(typeof G!="function")throw new Error(`ModSDK: Function ${b} to be patched not found`);let T=(function(_){let M=-1;for(let B of t.encode(_)){let z=255&(M^B);for(let Y=0;Y<8;Y++)z=1&z?-306674912^z>>>1:z>>>1;M=M>>>8^z}return((-1^M)>>>0).toString(16).padStart(8,"0").toUpperCase()})(G.toString().replaceAll(`\r
`,`
`)),D={name:b,original:G,originalHash:T};k=Object.assign(Object.assign({},D),{precomputed:d(D),router:()=>{},context:C,contextProperty:I[I.length-1]}),k.router=(function(_){return function(...M){return _.precomputed.enter.apply(this,[M])}})(k),o.set(b,k),C[k.contextProperty]=k.router}return k}function u(){for(let b of o.values())b.precomputed=d(b)}function p(){let b=new Map;for(let[N,k]of o)b.set(N,{name:N,original:k.original,originalHash:k.originalHash,sdkEntrypoint:k.router,currentEntrypoint:k.context[k.contextProperty],hookedByMods:n(k.precomputed.hooks.map((C=>C.mod))),patchedByMods:Array.from(k.precomputed.patchesSources)});return b}let h=new Map;function m(b){h.get(b.name)!==b&&e(`Failed to unload mod '${b.name}': Not registered`),h.delete(b.name),b.loaded=!1,u()}function f(b,N){b&&typeof b=="object"||e("Failed to register mod: Expected info object, got "+typeof b),typeof b.name=="string"&&b.name||e("Failed to register mod: Expected name to be non-empty string, got "+typeof b.name);let k=`'${b.name}'`;typeof b.fullName=="string"&&b.fullName||e(`Failed to register mod ${k}: Expected fullName to be non-empty string, got ${typeof b.fullName}`),k=`'${b.fullName} (${b.name})'`,typeof b.version!="string"&&e(`Failed to register mod ${k}: Expected version to be string, got ${typeof b.version}`),b.repository||(b.repository=void 0),b.repository!==void 0&&typeof b.repository!="string"&&e(`Failed to register mod ${k}: Expected repository to be undefined or string, got ${typeof b.version}`),N==null&&(N={}),N&&typeof N=="object"||e(`Failed to register mod ${k}: Expected options to be undefined or object, got ${typeof N}`);let C=N.allowReplace===!0,I=h.get(b.name);I&&(I.allowReplace&&C||e(`Refusing to load mod ${k}: it is already loaded and doesn't allow being replaced.
Was the mod loaded multiple times?`),m(I));let G=M=>{let B=_.patching.get(M.name);return B||(B={hooks:[],patches:new Map},_.patching.set(M.name,B)),B},T=(M,B)=>(...z)=>{var Y,J;let j=(J=(Y=g.errorReporterHooks).apiEndpointEnter)===null||J===void 0?void 0:J.call(Y,M,_.name);_.loaded||e(`Mod ${k} attempted to call SDK function after being unloaded`);let Q=B(...z);return j?.(),Q},D={unload:T("unload",(()=>m(_))),hookFunction:T("hookFunction",((M,B,z)=>{typeof M=="string"&&M||e(`Mod ${k} failed to patch a function: Expected function name string, got ${typeof M}`);let Y=c(M),J=G(Y);typeof B!="number"&&e(`Mod ${k} failed to hook function '${M}': Expected priority number, got ${typeof B}`),typeof z!="function"&&e(`Mod ${k} failed to hook function '${M}': Expected hook function, got ${typeof z}`);let j={mod:_.name,priority:B,hook:z};return J.hooks.push(j),u(),()=>{let Q=J.hooks.indexOf(j);Q>=0&&(J.hooks.splice(Q,1),u())}})),patchFunction:T("patchFunction",((M,B)=>{typeof M=="string"&&M||e(`Mod ${k} failed to patch a function: Expected function name string, got ${typeof M}`);let z=c(M),Y=G(z);i(B)||e(`Mod ${k} failed to patch function '${M}': Expected patches object, got ${typeof B}`);for(let[J,j]of Object.entries(B))typeof j=="string"?Y.patches.set(J,j):j===null?Y.patches.delete(J):e(`Mod ${k} failed to patch function '${M}': Invalid format of patch '${J}'`);u()})),removePatches:T("removePatches",(M=>{typeof M=="string"&&M||e(`Mod ${k} failed to patch a function: Expected function name string, got ${typeof M}`);let B=c(M);G(B).patches.clear(),u()})),callOriginal:T("callOriginal",((M,B,z)=>{typeof M=="string"&&M||e(`Mod ${k} failed to call a function: Expected function name string, got ${typeof M}`);let Y=c(M);return Array.isArray(B)||e(`Mod ${k} failed to call a function: Expected args array, got ${typeof B}`),Y.original.apply(z??globalThis,B)})),getOriginalHash:T("getOriginalHash",(M=>(typeof M=="string"&&M||e(`Mod ${k} failed to get hash: Expected function name string, got ${typeof M}`),c(M).originalHash)))},_={name:b.name,fullName:b.fullName,version:b.version,repository:b.repository,allowReplace:C,api:D,loaded:!0,patching:new Map};return h.set(b.name,_),Object.freeze(D)}function y(){let b=[];for(let N of h.values())b.push({name:N.name,fullName:N.fullName,version:N.version,repository:N.repository});return b}let g,x=window.bcModSdk===void 0?window.bcModSdk=(function(){let b={version:r,apiVersion:1,registerMod:f,getModsInfo:y,getPatchingInfo:p,errorReporterHooks:Object.seal({apiEndpointEnter:null,hookEnter:null,hookChainExit:null})};return g=b,Object.freeze(b)})():(i(window.bcModSdk)||e("Failed to init Mod SDK: Name already in use"),window.bcModSdk.apiVersion!==1&&e(`Failed to init Mod SDK: Different version already loaded ('1.2.0' vs '${window.bcModSdk.version}')`),window.bcModSdk.version!==r&&alert(`Mod SDK warning: Loading different but compatible versions ('1.2.0' vs '${window.bcModSdk.version}')
One of mods you are using is using an old version of SDK. It will work for now but please inform author to update`),window.bcModSdk);return typeof $i<"u"&&(Object.defineProperty($i,"__esModule",{value:!0}),$i.default=x),x})()});var Gg=Kd(Yo(),1);var fe=class{constructor(e,t="info"){this.scope=e;this.minimumLevel=t}scope;minimumLevel;debug(e,...t){this.#e("debug",e,t)}info(e,...t){this.#e("info",e,t)}warn(e,...t){this.#e("warn",e,t)}error(e,...t){this.#e("error",e,t)}#e(e,t,i){let n=["debug","info","warn","error"];if(n.indexOf(e)<n.indexOf(this.minimumLevel))return;console[e==="debug"?"debug":e](`[KikiLink:${this.scope}] ${t}`,...i)}};var zd=/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu,jd=["\\u2063LikoMAT:([a-zA-Z-]{1,32})(?::tr)?\\u2063","\\u2063LikoMAT:([a-zA-Z-]{1,32})(?::tr)?","LikoMAT:([a-zA-Z-]{1,32})(?::tr)?\\u2063"].map(r=>new RegExp(`${r}[ \\t\\r\\n]*$`,"u"));function ue(r){if(typeof r!="string")return"";let e=r;for(let t=0;t<4;t+=1){let i=Vd(e);if(i!==e){e=i;continue}let n=qd(e);if(n!==e){e=n;continue}break}return e.replace(zd,"").slice(0,1e3)}function Vd(r){for(let e of jd){let t=e.exec(r);if(t?.index!==void 0)return r.slice(0,t.index)}return r}function qd(r){let e=r.lastIndexOf("\uF124");if(e<0)return r;let t=r.slice(e+1).trim();if(!t||t.length>128)return r;try{let i=JSON.parse(t);return Wd(i)?r.slice(0,e).trimEnd():r}catch{return r}}function Wd(r){if(!r||typeof r!="object"||Array.isArray(r))return!1;let e=r,t=Object.keys(e),i=t.includes("messageColor");return(t.length===1||t.length===2)&&t.includes("messageType")&&(t.length===1||i)&&(e.messageType==="Message"||e.messageType==="Emote"||e.messageType==="Action")&&(!i||typeof e.messageColor=="string"&&/^#[0-9a-f]{6}$/iu.test(e.messageColor))}var Xd=400,Yd=500,Jd=2e3,Qd=1e3,Jo=1e4,Zd=1e4,ec=250,Qo="KikiLink",pi="KIKILINK/1 ",zi=700,tc=6,ic="ChatRoomDrawCharacterStatusIcons",rc=35e3,nc=8e3,oc=8e3,ac=7e3,sc=100;function fn(r){let e=!1;return(t,i)=>{if(e)return i(t);e=!0;try{return r(t,i)}finally{e=!1}}}var ji=class{constructor(e,t){this.bus=e;this.version=t}bus;version;#e=new fe("bc");#t=[];#i=new Map;#r=new Map;#a=[];#c=[];#l=new Set;#o=new Set;#s=new Set;#p=new Set;#g;#d;#u;#h;#m;#y=new Set;#v=0;#L=new WeakSet;#S=new WeakSet;#C=!1;#E=!1;#R=!1;#A=!1;#I;#M=!1;#w=!1;#G=!1;#_=!1;#O;#U;#X;#x;#ce=e=>{this.#f(e)};#D=e=>{this.#Ee(e)};#re=e=>{this.#fe(e)};async start(){this.#C=!1,this.bus.emit("bc:status",{state:"connecting"}),await this.#gt(),!this.#C&&(this.#Se(),this.#W(),this.#ye(),this.#u=setInterval(()=>this.#W(),Jd),this.#h=setInterval(()=>{this.#Q(),this.#T()},Qd),this.#E=!0,this.bus.emit("bc:status",{state:"ready"}),this.bus.emit("bc:ready",{memberNumber:Player.MemberNumber}),this.#e.info("Connected to the authenticated BC session"))}stop(){this.#C=!0,this.#E=!1,this.#X?.abort(),this.#X=void 0,this.#O=void 0,this.#U=void 0,this.#x=void 0,this.#r.clear(),this.#i.clear(),this.#a.splice(0),this.#c.splice(0),this.#L=new WeakSet,this.#S=new WeakSet,this.#A=!1,this.#I=void 0,this.#u!==void 0&&clearInterval(this.#u),this.#h!==void 0&&clearInterval(this.#h),this.#m!==void 0&&clearInterval(this.#m),this.#u=void 0,this.#h=void 0,this.#m=void 0,this.#Y();for(let e of this.#t.splice(0).reverse())try{e()}catch(t){this.#e.warn("A stale ModSDK hook could not be removed cleanly",t)}try{this.#g?.unload()}catch(e){this.#e.warn("ModSDK unload did not finish cleanly",e)}this.#g=void 0,this.#M=!1,this.#w=!1,this.#s.clear(),this.#p.clear(),this.#y.clear()}isReady(){return this.#E}canSendBeep(){return typeof ServerSendBeepMessage=="function"}canUseKikiLinkProtocol(){return typeof ServerSend=="function"}registerCharacterOverlay(e){return this.#l.add(e),this.#M&&this.#ue(),()=>this.#l.delete(e)}registerCustomActivityIntegration(e){return this.#o.add(e),this.#M&&this.#z(),()=>this.#o.delete(e)}refreshOnlineFriends(){return typeof ServerSend!="function"||!this.#E?!1:(ServerSend("AccountQuery",{Query:"OnlineFriends"}),!0)}getOnlineFriends(){return[...this.#r.values()].map(e=>({...e}))}getOnlineFriend(e){let t=this.#r.get(e);return t?{...t}:void 0}hasOnlineFriendSnapshot(){return this.#A}isKnownFriend(e){return typeof Player!="object"||Player===null?!1:Array.isArray(Player.FriendList)?Player.FriendList.includes(e):Player.FriendNames instanceof Map&&Player.FriendNames.has(e)}getPlayerRelationships(e){if(!Number.isSafeInteger(e)||e<0)return[];let t=[];if(typeof Player=="object"&&Player!==null)Player.Ownership?.MemberNumber===e&&t.push("owner"),(this.#he(e)?.Ownership?.MemberNumber===Player.MemberNumber||this.#r.get(e)?.relationship==="sub")&&t.push("sub"),(Array.isArray(Player.Lovership)&&Player.Lovership.some(n=>n?.MemberNumber===e)||this.#r.get(e)?.relationship==="lover")&&t.push("lover"),Array.isArray(Player.WhiteList)&&Player.WhiteList.includes(e)&&t.push("whitelist"),Array.isArray(Player.BlackList)&&Player.BlackList.includes(e)&&t.push("blacklist"),Array.isArray(Player.GhostList)&&Player.GhostList.includes(e)&&t.push("ghosted");else{let i=this.#r.get(e)?.relationship;i&&t.push(i)}return t}isMemberInCurrentRoom(e){return this.isInChatRoom()&&this.#he(e)!==void 0}sendKikiLinkProtocol(e,t){if(!Number.isSafeInteger(e)||e<0)throw new Error("A valid non-negative member number is required");let i=Zo(t);if(typeof ServerSend!="function")throw new Error("The KikiLink compatibility channel is still loading");return this.isInChatRoom()&&this.#he(e)?(ServerSend("ChatRoomChat",{Type:"Hidden",Content:i,Target:e}),"room"):(ServerSend("AccountBeep",{MemberNumber:e,BeepType:Qo,Message:i,IsSecret:!0}),"beep")}broadcastKikiLinkProtocol(e){return!this.isInChatRoom()||typeof ServerSend!="function"?!1:(ServerSend("ChatRoomChat",{Type:"Hidden",Content:Zo(e)}),!0)}sendBeep(e,t,i){if(!Number.isSafeInteger(e)||e<0)throw new Error("A valid non-negative member number is required");let n=t.trim();if(!n)throw new Error("A Beep message cannot be empty");if(n.length>1e3)throw new Error("A Beep message cannot exceed 1000 characters");if(typeof ServerSendBeepMessage!="function")throw new Error("KikiLink is still connecting to Bondage Club");let o=this.#V(e,n,{includeRoom:i});if(!o)throw new Error("Unable to prepare this Beep");this.#Ct(o,"kikilink"),this.#R=!0;try{ServerSendBeepMessage(e,n,{includeRoom:i})}finally{this.#R=!1}return o}getMemberName(e){let t=this.getMemberNickname(e);return t||(typeof Player!="object"||Player===null?`Member ${e}`:Player.FriendNames?.get(e)??`Member ${e}`)}getMemberNickname(e){if(typeof Player=="object"&&Player!==null&&Player.MemberNumber===e){let t=re(Player.Nickname);t?this.#i.set(e,t):this.#i.delete(e)}if(typeof ChatRoomCharacter<"u"&&Array.isArray(ChatRoomCharacter)){let t=ChatRoomCharacter.find(n=>n.MemberNumber===e),i=re(t?.Nickname);i?this.#i.set(e,i):t&&this.#i.delete(e)}return this.#i.get(e)}getOwnMemberNumber(){try{return typeof Player!="object"||Player===null?-1:Number.isSafeInteger(Player.MemberNumber)?Player.MemberNumber:-1}catch{return-1}}getOwnName(){try{return typeof Player!="object"||Player===null?"me":re(Player.Nickname)??re(Player.Name)??"me"}catch{return"me"}}isInChatRoom(){try{if(typeof ServerPlayerIsInChatRoom=="function"){let e=ServerPlayerIsInChatRoom();return this.#G=!1,e}}catch(e){this.#G||(this.#e.warn("Bondage Club's room membership state was not readable",e),this.#G=!0)}try{return typeof CurrentScreen=="string"&&CurrentScreen==="ChatRoom"&&typeof ChatRoomCharacter<"u"&&Array.isArray(ChatRoomCharacter)}catch(e){return this.#G||(this.#e.warn("Bondage Club's fallback room state was not readable",e),this.#G=!0),!1}}canSendRoomEmote(){return this.isInChatRoom()&&typeof ChatRoomSendEmote=="function"}getRoomCharacters(){if(!this.isInChatRoom())return[];let e=this.getOwnMemberNumber();return ChatRoomCharacter.filter(t=>Number.isSafeInteger(t.MemberNumber)&&t.MemberNumber!==e).map(t=>{let i=re(t.Name);return{memberNumber:t.MemberNumber,memberName:this.getMemberNickname(t.MemberNumber)??i??`Member ${t.MemberNumber}`,...i!==void 0?{accountName:i}:{},isFriend:this.isKnownFriend(t.MemberNumber)}}).sort((t,i)=>t.memberName.localeCompare(i.memberName))}sendRoomEmote(e){let t=e.trim();if(!t)throw new Error("An activity cannot be empty");if(t.length>1e3)throw new Error("An activity cannot exceed 1000 characters after variables are expanded");if(!this.isInChatRoom())throw new Error("Open a Bondage Club chat room first");if(typeof ChatRoomSendEmote!="function")throw new Error("The Bondage Club room chat is still loading");ChatRoomSendEmote(t)}getCurrentRoomName(){try{if(!this.isInChatRoom()||typeof ChatRoomData>"u"||ChatRoomData===null)return;let e=re(ChatRoomData.Name);return this.#_=!1,e}catch(e){this.#_||(this.#e.warn("Bondage Club's current room name was not readable",e),this.#_=!0);return}}getCurrentLobbyRoom(){try{if(!this.isInChatRoom()||typeof ChatRoomData!="object"||ChatRoomData===null)return;let e=re(ChatRoomData.Name);if(!e)return;let t=this.getRoomCharacters(),i=t.filter(a=>a.isFriend).map(a=>({memberNumber:a.memberNumber,memberName:a.memberName})),n=Te(ChatRoomData.Visibility,8,30),o=Te(ChatRoomData.Access,8,30);return{name:e,description:K(ChatRoomData.Description,500),language:K(ChatRoomData.Language,24),memberCount:Array.isArray(ChatRoomCharacter)?ChatRoomCharacter.length:t.length+1,memberLimit:Number.isSafeInteger(ChatRoomData.Limit)&&Number(ChatRoomData.Limit)>0?Number(ChatRoomData.Limit):Math.max(t.length+1,1),canJoin:!0,locked:o.length>0&&!o.includes("All"),privateRoom:n.length>0&&!n.includes("All"),mapType:typeof ChatRoomData.MapData=="object"&&ChatRoomData.MapData!==null?oa("map"):"",friends:i}}catch(e){this.#e.warn("Current room summary was not readable during a native refresh",e);return}}getRoomAdminSnapshot(){if(!(!this.isInChatRoom()||typeof ChatRoomData!="object"||ChatRoomData===null))try{let e=Array.isArray(ChatRoomData.Admin)?ChatRoomData.Admin:[],t=Array.isArray(ChatRoomData.Whitelist)?ChatRoomData.Whitelist:[],i=ChatRoomData.Custom;return{roomName:re(ChatRoomData.Name)??"Current room",isAdmin:this.#me(e),customization:{imageUrl:re(i?.ImageURL)??"",musicUrl:re(i?.MusicURL)??"",sizeMode:typeof i?.SizeMode=="number"&&Number.isInteger(i.SizeMode)&&i.SizeMode>=1&&i.SizeMode<=3?i.SizeMode:1,musicSync:typeof i?.MusicStart=="number"},settings:{name:re(ChatRoomData.Name)??"Current room",description:K(ChatRoomData.Description,200),background:K(ChatRoomData.Background,120),limit:Pt(ChatRoomData.Limit,2,20,10),game:K(ChatRoomData.Game,40),space:K(ChatRoomData.Space,20),language:K(ChatRoomData.Language,12),visibility:Te(ChatRoomData.Visibility,8,30),access:Te(ChatRoomData.Access,8,30),blockCategory:Te(ChatRoomData.BlockCategory,24,40),admins:Et(e,20),whitelist:Et(t,100),blacklist:Et(ChatRoomData.Ban,100),custom:{imageUrl:K(i?.ImageURL,500),imageFilter:K(i?.ImageFilter,120),musicUrl:K(i?.MusicURL,500),sizeMode:Pt(i?.SizeMode,1,3,1),musicSync:typeof i?.MusicStart=="number"}},players:this.getRoomCharacters().map(n=>({...n,admin:e.includes(n.memberNumber),whitelisted:t.includes(n.memberNumber)}))}}catch(e){this.#e.warn("Room administration data was not readable",e);return}}updateRoomCustomization(e){let t=this.getRoomAdminSnapshot();if(!t)throw new Error("Open a Bondage Club chat room first");if(!t.isAdmin)throw new Error("Only a room administrator can change room media");if(typeof ServerSend!="function")throw new Error("Bondage Club is still connecting");let i=Ki(e.imageUrl,"image"),n=Ki(e.musicUrl,"audio"),o=Number.isInteger(e.sizeMode)?Math.min(3,Math.max(1,e.sizeMode)):1,a=typeof ChatRoomGetSettings=="function"?ChatRoomGetSettings(ChatRoomData):{...ChatRoomData},l={...ChatRoomData?.Custom??{},SizeMode:o};if(e.musicSync){let d=re(ChatRoomData?.Custom?.MusicURL),c=ChatRoomData?.Custom?.MusicStart;l.MusicStart=n===d&&typeof c=="number"&&Number.isFinite(c)?c:typeof CurrentTime=="number"&&Number.isFinite(CurrentTime)?CurrentTime:Date.now()}else delete l.MusicStart;i?l.ImageURL=i:delete l.ImageURL,n?l.MusicURL=n:delete l.MusicURL,a.Custom=l,ServerSend("ChatRoomAdmin",{MemberNumber:typeof Player.ID=="number"&&Number.isSafeInteger(Player.ID)?Player.ID:Player.MemberNumber,Room:a,Action:"Update"})}applyRoomPreset(e){let t=this.getRoomAdminSnapshot();if(!t)throw new Error("Open a Bondage Club chat room first");if(!t.isAdmin)throw new Error("Only a room administrator can apply room presets");if(typeof ServerSend!="function")throw new Error("Bondage Club is still connecting");let i=ChatRoomData,n=typeof ChatRoomGetSettings=="function"?ChatRoomGetSettings(i):{...i},o=this.getOwnMemberNumber(),a=Et(e.admins,20);a.includes(o)||a.unshift(o),n.Name=K(e.name,80)||t.roomName,n.Description=K(e.description,200),n.Background=K(e.background,120),n.Limit=Pt(e.limit,2,20,10),n.Game=K(e.game,40),n.Space=K(e.space,20),n.Language=K(e.language,12),n.Visibility=Te(e.visibility,8,30),n.Access=Te(e.access,8,30),n.BlockCategory=Te(e.blockCategory,24,40),n.Admin=a,n.Whitelist=Et(e.whitelist,100),n.Ban=Et(e.blacklist,100);let l={...i.Custom??{},SizeMode:Pt(e.custom.sizeMode,1,3,1)},d=Ki(e.custom.imageUrl,"image"),c=Ki(e.custom.musicUrl,"audio");d?l.ImageURL=d:delete l.ImageURL,c?l.MusicURL=c:delete l.MusicURL;let u=K(e.custom.imageFilter,120);u?l.ImageFilter=u:delete l.ImageFilter,e.custom.musicSync&&c?l.MusicStart=typeof CurrentTime=="number"&&Number.isFinite(CurrentTime)?CurrentTime:Date.now():delete l.MusicStart,n.Custom=l,ServerSend("ChatRoomAdmin",{MemberNumber:typeof Player.ID=="number"&&Number.isSafeInteger(Player.ID)?Player.ID:Player.MemberNumber,Room:n,Action:"Update"})}getRoomSearchSpace(){let e;try{e=typeof ChatRoomData=="object"&&ChatRoomData!==null?ChatRoomData.Space:void 0}catch{}if(e===""||e==="X"||e==="M")return e;try{let t=typeof Player=="object"&&Player!==null?Player.LastChatRoom?.Space:void 0;return ta(t)}catch{return""}}async searchRooms(e="",t=this.getRoomSearchSpace()){if(typeof ServerRoomSearch!="function")throw new Error("Bondage Club's room search is still loading");let i=e.trim().slice(0,40).toLocaleUpperCase(),n={Query:i,Language:"",Space:ta(t),Game:"",FullRooms:!0,ShowLocked:!0,SearchDescs:!0};try{let o=ServerRoomSearch,a;try{a=await o(i,n)}catch{a=await o(n)}if(a&&!Array.isArray(a)&&typeof a=="object"&&(a.err||a.error))throw new Error("Room search returned an error");return(Array.isArray(a)?a:a&&typeof a=="object"&&Array.isArray(a.value)?a.value:[]).map(d=>cc(d)).filter(d=>d!==void 0).sort((d,c)=>+(c.friends.length>0)-+(d.friends.length>0)||c.friends.length-d.friends.length||Number(c.canJoin)-Number(d.canJoin)||d.name.localeCompare(c.name)).slice(0,500)}catch(o){throw this.#e.warn("Room directory could not be read",o),new Error("Bondage Club could not refresh the room list")}}joinRoom(e){let t=K(e,80);if(!t)return Promise.reject(new Error("Choose a room first"));let i=Xe(t);if(this.#O)return this.#U===i?this.#O:Promise.reject(new Error(`Already joining another room. Wait for that join to finish before choosing \u201C${t}\u201D.`));let n=this.#x;if(n)return n.targetKey===i?n.promise:Promise.reject(new Error("Bondage Club is still finishing the previous room join. Wait a moment before choosing another room."));if(typeof ServerSend!="function")return Promise.reject(new Error("Bondage Club is still connecting"));let o=this.getCurrentRoomName();if(o&&Xe(o)===i)return Promise.resolve();let a=new AbortController;this.#X=a,this.#U=i;let d=this.#Oe(t,a).finally(()=>{this.#X===a&&(this.#O=void 0,this.#U=void 0,this.#x?.controller!==a&&(this.#X=void 0))});return this.#O=d,d}async#Oe(e,t){let i=t.signal;if(ui(i),this.isInChatRoom()){let n=!1;try{n=typeof ChatRoomIsLeavingSlowly=="function"&&ChatRoomIsLeavingSlowly()}catch(o){this.#e.warn("Bondage Club's slow-leave state was not readable",o)}if(!n){if(typeof ChatRoomCanLeave!="function"||typeof ChatRoomAttemptLeave!="function")throw new Error("Leave this room with Bondage Club first, then try joining again");let o=!1;try{o=ChatRoomCanLeave()}catch(a){this.#e.warn("Bondage Club could not check whether the room can be left",a)}if(!o)throw new Error("Bondage Club currently prevents you from leaving this room");ChatRoomAttemptLeave()}}if(await bn(()=>!this.isInChatRoom()&&(typeof ChatRoomData>"u"||ChatRoomData===null),rc,"Leaving the current room did not finish. The join was cancelled safely.",i),ui(i),typeof ServerRoomJoin=="function"){let n;try{let a=Promise.resolve().then(()=>ServerRoomJoin(e));n=await lc(a,nc,i)}catch(a){throw ui(i),new Error(ea(a))}if(ui(i),n===na){if(this.isInChatRoom()&&Xe(this.getCurrentRoomName()??"")===Xe(e))return;throw this.#De(e,t),new Error("Bondage Club timed out while joining that room")}let o=dc(n);if(o!==void 0)throw new Error(ea(o))}else typeof ChatSearchJoin=="function"?ChatSearchJoin(e):ServerSend("ChatRoomJoin",{Name:e});try{await bn(()=>this.isInChatRoom()&&Xe(this.getCurrentRoomName()??"")===Xe(e),oc,`Bondage Club did not finish loading \u201C${e}\u201D`,i)}catch(n){throw ui(i),this.#De(e,t),n}}#De(e,t){let i=Xe(e),n=bn(()=>this.isInChatRoom()&&Xe(this.getCurrentRoomName()??"")===i,ac,`Bondage Club still did not finish loading \u201C${e}\u201D`,t.signal),o={controller:t,targetKey:i,promise:n};this.#x=o,n.catch(()=>{}).finally(()=>{this.#x===o&&(this.#x=void 0,this.#X===t&&(this.#X=void 0))})}runRoomMemberAction(e,t){let i=this.getRoomAdminSnapshot();if(!i)throw new Error("Open a Bondage Club chat room first");if(!i.isAdmin)throw new Error("Only a room administrator can manage players");if(!i.players.some(o=>o.memberNumber===e))throw new Error("This player is no longer in the room");if(e===this.getOwnMemberNumber())throw new Error("Choose another player");if(typeof ServerSend!="function")throw new Error("Bondage Club is still connecting");let n={kick:"Kick",promote:"Promote",demote:"Demote",whitelist:"Whitelist",unwhitelist:"Unwhitelist"};ServerSend("ChatRoomAdmin",{MemberNumber:e,Action:n[t],...t==="kick"?{Publish:!0}:{}})}startWhisper(e){if(!this.isInChatRoom())throw new Error("Open a Bondage Club chat room first");if(!this.#he(e))throw new Error("This player is no longer in the room");if(typeof ChatRoomSetTarget!="function")throw new Error("The native Whisper control is still loading");ChatRoomSetTarget(e);let t=document.getElementById("InputChat");t instanceof HTMLElement&&t.focus()}openProfile(e){if(!this.isInChatRoom())throw new Error("Profiles can be opened from a chat room");let t=this.#he(e);if(!t)throw new Error("This player is no longer in the room");if(typeof InformationSheetLoadCharacter!="function")throw new Error("The native profile screen is still loading");InformationSheetLoadCharacter(t)}#he(e){if(!(typeof ChatRoomCharacter>"u"||!Array.isArray(ChatRoomCharacter)))return ChatRoomCharacter.find(t=>t.MemberNumber===e)}#me(e){try{if(typeof ChatRoomPlayerIsAdmin=="function")return ChatRoomPlayerIsAdmin()}catch{}return e.includes(this.getOwnMemberNumber())}getKnownContacts(){let e=new Map;if(typeof Player=="object"&&Player!==null&&Player.FriendNames instanceof Map)for(let[t,i]of Player.FriendNames)Number.isSafeInteger(t)&&re(i)&&e.set(t,this.getMemberNickname(t)??i.trim());if(typeof Player=="object"&&Player!==null&&Array.isArray(Player.FriendList))for(let t of Player.FriendList)Number.isSafeInteger(t)&&e.set(t,this.getMemberName(t));if(typeof ChatRoomCharacter<"u"&&Array.isArray(ChatRoomCharacter))for(let t of ChatRoomCharacter)!Number.isSafeInteger(t.MemberNumber)||t.MemberNumber===this.getOwnMemberNumber()||e.set(t.MemberNumber,this.getMemberNickname(t.MemberNumber)??re(t.Name)??`Member ${t.MemberNumber}`);for(let t of this.#r.values())e.set(t.memberNumber,this.getMemberNickname(t.memberNumber)??t.memberName);return[...e.entries()].map(([t,i])=>({memberNumber:t,memberName:i})).sort((t,i)=>t.memberName.localeCompare(i.memberName))}getRecentBeeps(e=100){if(typeof FriendListBeepLog>"u"||!Array.isArray(FriendListBeepLog))return[];let t=[];for(let i of FriendListBeepLog.slice(-Math.max(0,e)))try{let n=this.#b(i);n&&t.push(n)}catch(n){this.#e.warn("A recent native Beep log entry was not readable",n)}return t.sort((i,n)=>i.sentAt-n.sentAt)}#ye(){let e;try{e=pc().registerMod({name:"KikiLink",fullName:"KikiLink",version:this.version},{allowReplace:!0}),this.#g=e}catch(t){this.#g=void 0,this.#e.warn("ModSDK registration unavailable; shared game hooks stay untouched",t)}this.#M=!0,e&&(this.#Me("ServerAccountBeep",()=>e.hookFunction("ServerAccountBeep",0,(t,i)=>(this.#f(t[0]),i(t)))),typeof ServerAccountQueryResult=="function"&&this.#Me("ServerAccountQueryResult",()=>e.hookFunction("ServerAccountQueryResult",0,(t,i)=>(this.#Ee(t[0]),i(t)))),typeof FriendListLoadFriendList=="function"&&this.#Me("FriendListLoadFriendList",()=>e.hookFunction("FriendListLoadFriendList",0,(t,i)=>(this.#Ee(t[0]),i(t))))),this.#Q(),this.#z(),this.#ue(),this.#m===void 0&&(this.#m=setInterval(()=>{this.#z(),this.#ue()},Yd))}#Q(){if(!this.#M)return;let e="ServerSend";if(this.#p.has(e)||typeof ServerSend!="function")return;let t=(i,n)=>{let o=n(i);return this.#R||this.#ge(i[0],i[1]),o};this.#Ge(e,0,t)&&this.#p.add(e)}#ue(){if(!this.#M)return;let e=ic;if(this.#y.has(e)||typeof ChatRoomDrawCharacterStatusIcons!="function")return;let t=(i,n)=>{let o=n(i);return this.#ee(i[0],i[1],i[2],i[3]),o};this.#Ge(e,10,t)&&this.#y.add(e)}#z(){if(!this.#M||(this.#oe(),this.#s.size===tc))return;let e=(l,d)=>{let c=d(l);return Array.isArray(c)?this.#H(l[0],l[1],c):c};this.#F("ActivityAllowedForGroup",typeof ActivityAllowedForGroup=="function",10,e);let t=(l,d)=>{let c=d(l);if(!Array.isArray(DialogActivity))return c;let u=l[0],p=u?.FocusGroup?.Name;if(typeof p!="string")return c;let h=this.#H(u,p,DialogActivity);if(h===DialogActivity)return c;if(DialogActivity=h,(l[1]??!0)&&DialogMenuMode==="activities")try{let m=DialogMenuMapping?.activities?.Reload;if(typeof m=="function"){let f=m.call(DialogMenuMapping.activities,null,{reset:!0,resetDialogItems:!1});f&&typeof f.catch=="function"&&f.catch(y=>this.#e.warn("Native custom activity grid refresh failed",y))}}catch(m){this.#e.warn("Native custom activity grid refresh failed",m)}return c};this.#F("DialogBuildActivities",typeof DialogBuildActivities=="function",-10,t);let i=fn((l,d)=>{let c=typeof l[0]=="string"?l[0]:"";for(let u of[...this.#o]){let p=this.#j(u,()=>u.resolveText(c));if(p!==void 0)return p}return d(l)});this.#F("ActivityDictionaryText",typeof ActivityDictionaryText=="function",10,i);let n=fn((l,d)=>{for(let c of[...this.#o])if(this.#j(c,()=>c.run(l[0],l[1],l[2],l[3])))return;return d(l)});this.#F("ActivityRun",typeof ActivityRun=="function",10,n);let o=fn((l,d)=>{let c=l[1],u=c?.Activity?.Name;if(typeof u=="string")for(let h of[...this.#o]){let m=this.#j(h,()=>h.resolveImage(u));if(m!==void 0){l[4]={...l[4]??{},image:m};break}}let p=d(l);for(let h of[...this.#o])this.#j(h,()=>{h.decorateButton(p,c)});return p});this.#F("ElementButton.CreateForActivity",typeof ElementButton=="object"&&ElementButton!==null&&typeof ElementButton.CreateForActivity=="function",10,o);let a=(l,d)=>{let c=typeof l[1]=="string"?l[1]:"";for(let u of[...this.#o])if(this.#j(u,()=>u.isCustomActivity?.(c)??!1))return 2;return d(l)};this.#F("PreferenceGetActivityFactor",typeof PreferenceGetActivityFactor=="function",10,a)}#F(e,t,i,n){!t||this.#s.has(e)||this.#Ge(e,i,n)&&this.#s.add(e)}#oe(){let e="ChatRoomMessage";if(this.#w||typeof ChatRoomMessage!="function")return;let t=(i,n)=>(this.#fe(i[0]),this.#te(i[0]),n(i));this.#Ge(e,0,t)&&(this.#w=!0)}#ee(e,t,i,n){for(let o of this.#l)try{o(e,t,i,n)}catch(a){this.#e.warn("Character overlay renderer failed for this frame",a)}}#H(e,t,i){let n=i;for(let o of[...this.#o]){let a=this.#j(o,()=>o.extendAllowedActivities?.(e,t,n));Array.isArray(a)&&(n=a)}return n}#te(e){for(let t of[...this.#o])this.#j(t,()=>t.onRoomMessage(e))}#j(e,t){try{return t()}catch(i){this.#e.warn(`${e.constructor.name||"Custom activity integration"} failed for this call`,i);return}}#Ge(e,t,i){let n=this.#g;return n?this.#Me(e,()=>n.hookFunction(e,t,i)):!1}#Me(e,t){try{let i=t();return this.#t.push(i),!0}catch(i){return this.#e.warn(`${e} hook unavailable; retrying after native load`,i),!1}}#W(){try{let e=typeof ServerSocket=="object"&&ServerSocket!==null?ServerSocket:void 0;if(e===this.#d||(this.#Y(),!e||typeof e.on!="function"))return;this.#d=e,e.on("AccountBeep",this.#ce),e.on("AccountQueryResult",this.#D),e.on("ChatRoomMessage",this.#re),this.#E&&this.refreshOnlineFriends()}catch(e){this.#Y(),this.#e.warn("Direct Bondage Club socket listeners unavailable",e)}}#Y(){let e=this.#d;if(this.#d=void 0,!e)return;let t=(i,n,o)=>{try{let a=e[i];return typeof a!="function"?!1:(a.call(e,n,o),!0)}catch(a){return this.#e.warn(`Could not detach the ${n} listener with socket.${i}`,a),!1}};for(let[i,n]of[["AccountBeep",this.#ce],["AccountQueryResult",this.#D],["ChatRoomMessage",this.#re]])t("off",i,n)||t("removeListener",i,n)}#ge(e,t){if(!(e!=="AccountBeep"||!t||typeof t!="object"))try{let i=t;if(i.BeepType!=null&&i.BeepType!==""||!Number.isSafeInteger(i.MemberNumber)||i.MemberNumber<0)return;let n=this.#V(i.MemberNumber,typeof i.Message=="string"?i.Message:void 0,{includeRoom:i.IsSecret===!1});n&&this.#Le(n,"transport")}catch(i){this.#e.warn("Outgoing AccountBeep metadata was not readable",i)}}#fe(e){if(!(!e||typeof e!="object"))try{if(this.#S.has(e))return;this.#S.add(e);let t=this.#ve(e);t&&this.bus.emit("bc:protocol",t)}catch(t){this.#e.warn("Hidden KikiLink room packet was not readable",t)}}#f(e){try{if(!e||typeof e!="object"||Array.isArray(e)||this.#L.has(e))return;this.#L.add(e);let t=this.#Yt(e);t&&this.bus.emit("bc:protocol",t);let i=this.#Be(e);if(!i)return;this.#Je(i),this.bus.emit("beep:received",i)}catch(t){this.#e.warn("Incoming AccountBeep metadata was not readable",t)}}#Se(){this.#v=typeof FriendListBeepLog<"u"&&Array.isArray(FriendListBeepLog)?FriendListBeepLog.length:0}#T(){if(typeof FriendListBeepLog>"u"||!Array.isArray(FriendListBeepLog))return;FriendListBeepLog.length<this.#v&&(this.#v=0);let e=FriendListBeepLog.slice(this.#v);this.#v=FriendListBeepLog.length;for(let t of e)try{let i=this.#b(t);if(!i)continue;t.Sent?this.#Le(i,"log"):this.#Re(i)||this.bus.emit("beep:received",i)}catch(i){this.#e.warn("A native Beep log entry was not readable",i)}this.#$(),this.#at()}#b(e){if(!e||!Number.isSafeInteger(e.MemberNumber))return null;let t=new Date(e.Time).getTime(),i=Number.isFinite(t)?t:Date.now(),n=re(e.ChatRoomName);return{direction:e.Sent?"outgoing":"incoming",peerNumber:e.MemberNumber,peerName:this.getMemberNickname(e.MemberNumber)??re(e.MemberName)??`Member ${e.MemberNumber}`,content:ue(e.Message),sentAt:i,includeRoom:n!==void 0,...n!==void 0?{roomName:n}:{}}}#Je(e){this.#a.push({fingerprint:ia(e),capturedAt:e.sentAt}),this.#$()}#Re(e){let t=ia(e),i=this.#a.findIndex(n=>n.fingerprint===t&&Math.abs(n.capturedAt-e.sentAt)<=Jo);return i<0?!1:(this.#a.splice(i,1),!0)}#$(e=Date.now()){for(;this.#a.length>0;){let t=this.#a[0];if(!t||e-t.capturedAt<=Jo)break;this.#a.shift()}}#Le(e,t){this.#at();let i=ra(e);this.#c.some(n=>n.source!==t&&n.fingerprint===i&&Math.abs(n.sentAt-e.sentAt)<=ec)||(this.#Ct(e,t),this.bus.emit("beep:sent",e))}#Ct(e,t){this.#c.push({fingerprint:ra(e),sentAt:e.sentAt,capturedAt:Date.now(),source:t}),this.#at()}#at(e=Date.now()){for(;this.#c.length>0;){let t=this.#c[0];if(!t||e-t.capturedAt<=Zd)break;this.#c.shift()}}#Be(e){if(!e||e.BeepType!=null&&e.BeepType!==""||!Number.isSafeInteger(e.MemberNumber)||typeof e.MemberName!="string")return null;let t=typeof e.ChatRoomName=="string"?e.ChatRoomName:void 0;return{direction:"incoming",peerNumber:e.MemberNumber,peerName:this.getMemberNickname(e.MemberNumber)??e.MemberName,content:ue(e.Message),sentAt:Date.now(),includeRoom:t!==void 0,...t!==void 0?{roomName:t}:{}}}#Yt(e){if(!e||e.BeepType!==Qo||!Number.isSafeInteger(e.MemberNumber)||typeof e.Message!="string"||!e.Message.startsWith(pi))return null;let t=e.Message.slice(pi.length);return!t||t.length>zi?null:{senderNumber:e.MemberNumber,payload:t,channel:"beep"}}#ve(e){if(!e||e.Type!=="Hidden"||typeof e.Sender!="number"||!Number.isSafeInteger(e.Sender)||e.Sender===this.getOwnMemberNumber()||typeof e.Content!="string"||!e.Content.startsWith(pi))return null;let t=e.Content.slice(pi.length);return!t||t.length>zi?null:{senderNumber:e.Sender,payload:t,channel:"room"}}#Ee(e){try{let t=Array.isArray(e)?e:e&&e.Query==="OnlineFriends"&&Array.isArray(e.Result)?e.Result:void 0;if(!t)return;let i=[];for(let o of t)try{if(!o||typeof o!="object"||!("MemberNumber"in o)||!Number.isSafeInteger(o.MemberNumber)||!("MemberName"in o)||typeof o.MemberName!="string")continue;let a="MemberNickname"in o?re(o.MemberNickname):void 0;a&&this.#i.set(o.MemberNumber,a);let l="ChatRoomName"in o?re(o.ChatRoomName):void 0,d="ChatRoomSpace"in o?re(o.ChatRoomSpace):void 0,c=o.Type==="Submissive"?"sub":o.Type==="Lover"?"lover":void 0;i.push({memberNumber:o.MemberNumber,memberName:a??(o.MemberName.trim()||`Member ${o.MemberNumber}`),privateRoom:"Private"in o&&o.Private===!0,...l?{roomName:l}:{},...d?{roomSpace:d}:{},...c?{relationship:c}:{}})}catch(a){this.#e.warn("An online friend entry was not readable",a)}let n=i.map(o=>[o.memberNumber,o.memberName,o.roomName??"",o.roomSpace??"",o.privateRoom?1:0,o.relationship??""].join("")).sort().join("");this.#r.clear();for(let o of i)this.#r.set(o.memberNumber,o);if(this.#A=!0,n===this.#I)return;this.#I=n,this.bus.emit("bc:online-friends",{friends:this.getOnlineFriends(),receivedAt:Date.now()})}catch(t){this.#e.warn("Online friend metadata was not readable",t)}}#V(e,t,i){if(!Number.isSafeInteger(e)||e<0)return null;let n=i?.includeRoom===!0,o=n&&typeof ChatRoomData?.Name=="string"?ChatRoomData.Name:void 0;return{direction:"outgoing",peerNumber:e,peerName:this.getMemberName(e),content:ue(t),sentAt:Date.now(),includeRoom:n,...o!==void 0?{roomName:o}:{}}}async#gt(){for(;!this.#C&&!uc();)await new Promise(e=>setTimeout(e,Xd))}};function Zo(r){let e=r.trim();if(!e||e.length>zi)throw new Error(`KikiLink protocol payload must be 1-${zi} characters`);return`${pi}${e}`}function Xe(r){return r.replace(/\s+/gu," ").trim().toLocaleLowerCase()}var na=Symbol("room-join-response-timed-out");function lc(r,e,t){return new Promise((i,n)=>{let o=!1,a,l=c=>{o||(o=!0,a!==void 0&&clearTimeout(a),t.removeEventListener("abort",d),c.type==="error"?n(c.error):i(c.value))},d=()=>l({type:"error",error:kn()});r.then(c=>l({type:"value",value:c}),c=>l({type:"error",error:c})),t.addEventListener("abort",d,{once:!0}),a=setTimeout(()=>l({type:"value",value:na}),e),t.aborted&&d()})}function bn(r,e,t,i){return new Promise((n,o)=>{let a=Date.now(),l,d=!1,c=h=>{d||(d=!0,l!==void 0&&clearTimeout(l),i?.removeEventListener("abort",u),h?o(h):n())},u=()=>c(kn()),p=()=>{if(i?.aborted){u();return}try{if(r()){c();return}}catch{}if(Date.now()-a>=e){c(new Error(t));return}l=setTimeout(p,sc)};i?.addEventListener("abort",u,{once:!0}),p()})}function ui(r){if(r.aborted)throw kn()}function kn(){return new Error("Room join was cancelled because KikiLink stopped")}function ea(r){let e=(()=>{if(typeof r=="string")return r;if(r&&typeof r=="object")try{let i=r;if(typeof i.message=="string")return i.message;if(typeof i.name=="string")return i.name;if(typeof i.error=="string")return i.error;if(typeof i.err=="string")return i.err}catch{}return""})(),t=e.toLocaleLowerCase();return t.includes("full")?"That room is full":t.includes("lock")?"That room is locked":t.includes("ban")||t.includes("kick")?"Bondage Club does not allow this account to join that room":t.includes("find")||t.includes("exist")?"That room is no longer available":t.includes("timeout")?"Bondage Club timed out while joining that room":t.includes("progress")?"Another Bondage Club room join is already in progress":e?`Bondage Club could not join the room: ${e}`:"Bondage Club could not join that room"}function dc(r){if(!(!r||typeof r!="object"))try{let e=r.ok,t=r.error,i=r.err;return e===!1?t??(i!==!1&&i!=null?i:r):t??(i===!0?r:e!==!0&&i!==!1&&i!=null?i:void 0)}catch(e){return e}}function re(r){return typeof r!="string"?void 0:r.trim()||void 0}function K(r,e){return typeof r=="string"?r.replace(/[\u0000-\u001f\u007f]/gu," ").trim().slice(0,e):""}function Pt(r,e,t,i){return typeof r=="number"&&Number.isInteger(r)&&r>=e&&r<=t?r:i}function Te(r,e,t){if(!Array.isArray(r))return[];let i=new Set;for(let n of r){let o=K(n,t);if(o&&i.add(o),i.size>=e)break}return[...i]}function Et(r,e){if(!Array.isArray(r))return[];let t=new Set;for(let i of r)if(typeof i=="number"&&Number.isSafeInteger(i)&&i>=0&&t.add(i),t.size>=e)break;return[...t]}function cc(r){try{if(!r||typeof r!="object")return;let e=K(r.Name,80);if(!e)return;let t=[],i=new Set;if(Array.isArray(r.Friends))for(let a of r.Friends.slice(0,12)){if(!a||typeof a!="object")continue;let l=a.MemberNumber;!Number.isSafeInteger(l)||l<0||i.has(l)||(t.push({memberNumber:l,memberName:K(a.MemberNickname,80)||K(a.MemberName,80)||`Member ${l}`}),i.add(l))}let n=Te(r.Visibility,8,30),o=Te(r.Access,8,30);return{name:e,...K(r.Creator,80)?{creator:K(r.Creator,80)}:{},description:K(r.Description,200),language:K(r.Language,12),memberCount:Pt(r.MemberCount,0,100,0),memberLimit:Pt(r.MemberLimit,1,100,10),canJoin:r.CanJoin===!0,locked:r.Locked===!0||o.length>0&&!o.includes("All"),privateRoom:r.Private===!0||n.length>0&&!n.includes("All"),mapType:oa(r.MapType),friends:t}}catch{return}}function oa(r){let e=K(r,40);return e.toLocaleLowerCase()==="map"?"Always":e}function ta(r){return r==="X"||r==="M"?r:""}function Ki(r,e){let t=r.trim();if(!t)return;if(t.length>250)throw new Error("Room media links can be at most 250 characters");let i;try{i=new URL(t)}catch{throw new Error("Enter a valid HTTPS room media link")}if(i.protocol!=="https:"||i.username||i.password)throw new Error("Room media must use a public HTTPS link");let n=i.pathname.toLocaleLowerCase();if(!(e==="image"?/\.(?:jpe?g|png|webp)$/u.test(n):/\.(?:mp3|mp4)$/u.test(n)))throw new Error(e==="image"?"Room backgrounds must be JPG, PNG, or WebP files":"Bondage Club room music links must end in .mp3 or .mp4");return i.href}function ia(r){return[r.peerNumber,r.content,r.roomName??""].join("")}function ra(r){return[r.peerNumber,r.content,r.includeRoom?1:0].join("")}function uc(){return typeof document<"u"&&document.body!==null&&typeof Player=="object"&&Player!==null&&Number.isSafeInteger(Player.MemberNumber)&&Player.MemberNumber>0&&typeof ServerSendBeepMessage=="function"}function pc(){let r=window.bcModSdk;if(!r||typeof r.registerMod!="function")throw new Error("Bondage Club ModSDK is unavailable");return r}var hi=class{#e=new Map;#t=new Map;async addMessage(e){this.#e.set(e.id,structuredClone(e))}async getMessages(e,t=200){return[...this.#e.values()].filter(i=>i.peerNumber===e).sort((i,n)=>i.sentAt-n.sentAt).slice(-t).map(i=>structuredClone(i))}async getConversation(e){let t=this.#t.get(e);return t?structuredClone(t):void 0}async listConversations(){return[...this.#t.values()].sort(mi).map(e=>structuredClone(e))}async putConversation(e){this.#t.set(e.peerNumber,structuredClone(e))}async deleteConversation(e){this.#t.delete(e);for(let[t,i]of this.#e)i.peerNumber===e&&this.#e.delete(t)}async deleteMessagesOlderThan(e){let t=0;for(let[i,n]of this.#e)n.sentAt>=e||(this.#e.delete(i),t+=1);return t}async deleteMessagesForConversationAtOrBefore(e,t){let i=0;for(let[n,o]of this.#e)o.peerNumber!==e||o.sentAt>t||(this.#e.delete(n),i+=1);return i}async trimConversation(e,t){let i=[...this.#e.values()].filter(o=>o.peerNumber===e).sort((o,a)=>a.sentAt-o.sentAt),n=0;for(let o of i.slice(t))this.#e.delete(o.id),n+=1;return n}async clearAll(){this.#e.clear(),this.#t.clear()}close(){}};function mi(r,e){return r.pinned!==e.pinned?r.pinned?-1:1:e.lastMessageAt-r.lastMessageAt}var aa=0;function yn(r="kl"){let e=globalThis.crypto;if(typeof e?.randomUUID=="function")return`${r}_${e.randomUUID()}`;if(typeof e?.getRandomValues=="function"){let t=e.getRandomValues(new Uint8Array(16));t[6]=(t[6]??0)&15|64,t[8]=(t[8]??0)&63|128;let i=[...t].map(n=>n.toString(16).padStart(2,"0")).join("");return`${r}_${i.slice(0,8)}-${i.slice(8,12)}-${i.slice(12,16)}-${i.slice(16,20)}-${i.slice(20)}`}throw new Error("Secure random ID generation is unavailable")}function gi(r="kl"){try{return yn(r)}catch{}return aa+=1,`${r}_${Date.now().toString(36)}_${aa.toString(36)}`}var sa=/https:\/\/[^\s<>"'[\]]+/giu,hc=/\.(?:gif|jpe?g|png|webp)$/iu,mc=/[),.;!?\]}]+$/u;function Tt(r){let e=[];for(let t of r.matchAll(sa)){if(t.index===void 0)continue;let i=la(t[0]),n=Vi(i);n&&e.push({start:t.index,end:t.index+i.length,url:n,image:vn(n)})}return e}function V(r){let e=Vi(r.trim());if(e&&vn(e))return e;for(let t of r.matchAll(sa)){let i=Vi(la(t[0]));if(i&&vn(i))return i}return null}function vn(r){let e=Vi(r);return e?hc.test(new URL(e).pathname):!1}function Vi(r){if(!r||r.length>900)return null;try{let e=new URL(r);return e.protocol!=="https:"||e.username||e.password||!e.hostname?null:e.href}catch{return null}}function la(r){let e=r;for(;mc.test(e);){let t=e.at(-1);if(t===")"&&It(e,"(")>=It(e,")")||t==="]"&&It(e,"[")>=It(e,"]")||t==="}"&&It(e,"{")>=It(e,"}"))break;e=e.slice(0,-1)}return e}function It(r,e){return[...r].filter(t=>t===e).length}var gc=1440*60*1e3,Wi=class{constructor(e,t){this.repository=e;this.settings=t}repository;settings;#e=new Map;#t=new Map;#i=new Map;#r=Promise.resolve();async capture(e,t){let i=da(e);return this.#p(i.peerNumber,()=>this.#a(i,t))}async#a(e,t){let i={...e,id:gi("beep"),read:e.direction==="outgoing"||t},n=await this.#l(e.peerNumber),o={peerNumber:e.peerNumber,peerName:fc(n?.peerName,e.peerName,e.peerNumber),...n?.localAlias?{localAlias:n.localAlias}:{},lastMessage:e.content,lastMessageAt:e.sentAt,lastDirection:e.direction,unread:e.direction==="incoming"&&!t?(n?.unread??0)+1:0,pinned:n?.pinned??!1,draft:n?.draft??""},a=this.settings.get().linkChat;if(a.saveHistory)await this.repository.addMessage(i),await this.repository.putConversation(o),await this.repository.trimConversation(e.peerNumber,a.maxMessagesPerConversation);else{let l=this.#e.get(e.peerNumber)??[];l.push(i),this.#e.set(e.peerNumber,l.slice(-a.maxMessagesPerConversation)),this.#t.set(e.peerNumber,o)}return i}async captureRecent(e){let t=da(e);return this.#p(t.peerNumber,async()=>{let i=await this.#l(t.peerNumber);return i?.hiddenAt!==void 0&&t.sentAt<=i.hiddenAt||(await this.#o(t.peerNumber,500)).some(a=>a.direction===t.direction&&a.content===t.content&&a.roomName===t.roomName&&Math.abs(a.sentAt-t.sentAt)<=2e3)?!1:(await this.#a(t,!0),!0)})}async ensureConversation(e,t){return this.#p(e,()=>this.#c(e,t))}async#c(e,t){let i=await this.#l(e);if(i&&i.hiddenAt===void 0)return i;let n={peerNumber:e,peerName:t,lastMessage:"",lastMessageAt:0,lastDirection:"incoming",unread:0,pinned:!1,draft:""};return await this.#d(n),n}async getConversation(e){return this.#p(e,async()=>{let t=await this.#l(e);return t?.hiddenAt===void 0?t:void 0})}async#l(e){let t=this.#t.get(e);if(t){let n=qi(t);return n!==t&&this.#t.set(e,n),structuredClone(n)}let i=await this.repository.getConversation(e);return i?this.#u(i):void 0}async listConversations(){let e=await this.repository.listConversations(),t=await Promise.all(e.map(n=>{let o=qi(n);return o===n?n:this.#p(n.peerNumber,async()=>{let a=await this.repository.getConversation(n.peerNumber);return a?this.#u(a):o})})),i=new Map(t.map(n=>[n.peerNumber,n]));for(let n of this.#t.values()){let o=qi(n);o!==n&&this.#t.set(n.peerNumber,o),i.set(o.peerNumber,structuredClone(o))}return[...i.values()].filter(n=>n.hiddenAt===void 0).sort(mi)}async getMessages(e,t=300){return this.#p(e,()=>this.#o(e,t))}async#o(e,t=300){let i=await this.repository.getMessages(e,t),n=this.#e.get(e)??[],o=await Promise.all(i.map(l=>this.#h(l))),a=n.map(ca);return a.some((l,d)=>l!==n[d])&&this.#e.set(e,a),[...o,...a].sort((l,d)=>l.sentAt-d.sentAt).slice(-t)}async listMedia(e=300){let t=await this.listConversations(),i=new Map;for(let n=0;n<t.length;n+=8){let o=await Promise.all(t.slice(n,n+8).map(async a=>({conversation:a,messages:await this.getMessages(a.peerNumber,500)})));for(let{conversation:a,messages:l}of o)for(let d of l)for(let c of Tt(d.content)){if(!c.image)continue;let u={url:c.url,provider:Xi(c.url),peerNumber:a.peerNumber,peerName:oe(a),direction:d.direction,sentAt:d.sentAt,messageId:d.id},p=i.get(u.url);(!p||p.sentAt<u.sentAt)&&i.set(u.url,u)}}return[...i.values()].sort((n,o)=>o.sentAt-n.sentAt).slice(0,Math.max(1,Math.min(1e3,e)))}async markRead(e){await this.#p(e,async()=>{let t=await this.#s(e);!t||t.unread===0||await this.#d({...t,unread:0})})}async markUnread(e){await this.#p(e,async()=>{let t=await this.#s(e);!t||t.unread>0||await this.#d({...t,unread:1})})}async setPeerName(e,t){let i=t.trim();i&&await this.#p(e,async()=>{let n=await this.#s(e);!n||n.peerName===i||await this.#d({...n,peerName:i})})}async setLocalAlias(e,t){let i=bc(t);return this.#p(e,async()=>{let n=await this.#s(e);if(!n)return;if(n.localAlias===i)return i;let o={...n};return i?o.localAlias=i:delete o.localAlias,await this.#d(o),i})}async removeConversation(e){await this.#p(e,async()=>{let t=await this.#l(e);this.#e.delete(e),this.#t.delete(e),await this.repository.deleteConversation(e),t&&await this.#d({peerNumber:e,peerName:t.peerName,hiddenAt:Date.now(),lastMessage:"",lastMessageAt:0,lastDirection:"incoming",unread:0,pinned:!1,draft:""})})}async setDraft(e,t,i){await this.#p(e,async()=>{let n=await this.#s(e)??await this.#c(e,t);await this.#d({...n,draft:i})})}async togglePinned(e){return this.#p(e,async()=>{let t=await this.#s(e);if(!t)return!1;let i=!t.pinned;return await this.#d({...t,pinned:i}),i})}async totalUnread(){return(await this.listConversations()).reduce((t,i)=>t+i.unread,0)}async prune(){let e=this.settings.get().linkChat;if(!e.saveHistory)return 0;let t=Date.now()-e.retentionDays*gc;return this.#g(async()=>{let i=await this.repository.deleteMessagesOlderThan(t);for(let n of await this.repository.listConversations()){if(n.lastMessageAt>=t)continue;let o=await this.repository.getMessages(n.peerNumber,e.maxMessagesPerConversation),a=o.at(-1);await this.repository.putConversation(a?{...n,peerName:a.peerName||n.peerName,lastMessage:a.content,lastMessageAt:a.sentAt,lastDirection:a.direction,unread:o.filter(l=>l.direction==="incoming"&&!l.read).length}:{...n,lastMessage:"",lastMessageAt:0,lastDirection:"incoming",unread:0})}return i})}async clearHistory(){return this.#g(async()=>{try{return this.repository.clearAllDurably?await this.repository.clearAllDurably():await this.repository.clearAll().then(()=>!0)}finally{this.#e.clear(),this.#t.clear()}})}async#s(e){let t=await this.#l(e);return t?.hiddenAt===void 0?t:void 0}#p(e,t){let i=this.#r,n=this.#i.get(e)??Promise.resolve(),o=Promise.all([i,n]).then(()=>t()),a=o.then(()=>{},()=>{});return this.#i.set(e,a),a.then(()=>{this.#i.get(e)===a&&this.#i.delete(e)}),o}#g(e){let t=this.#r,i=[...this.#i.values()],n=Promise.all([t,...i]).then(()=>e()),o=n.then(()=>{},()=>{});return this.#r=o,o.then(()=>{this.#r===o&&(this.#r=Promise.resolve())}),n}async#d(e){this.settings.get().linkChat.saveHistory?(await this.repository.putConversation(e),this.#t.delete(e.peerNumber)):this.#t.set(e.peerNumber,structuredClone(e))}async#u(e){let t=qi(e);if(t===e)return e;try{await this.repository.putConversation(t)}catch{}return t}async#h(e){let t=ca(e);if(t===e)return e;try{await this.repository.addMessage(t)}catch{}return t}};function oe(r){return r.localAlias?.trim()||r.peerName}function fc(r,e,t){let i=`Member ${t}`,n=r?.trim(),o=e.trim();return n&&n!==i?n:o||n||i}function bc(r){return r.replace(/[\u0000-\u001f\u007f]/gu,"").replace(/\s+/gu," ").trim().slice(0,40)||void 0}function da(r){let e=ue(r.content);return e===r.content?r:{...r,content:e}}function qi(r){let e=ue(r.lastMessage);return e===r.lastMessage?r:{...r,lastMessage:e}}function ca(r){let e=ue(r.content);return e===r.content?r:{...r,content:e}}function Xi(r){try{let e=new URL(r).hostname.toLocaleLowerCase();if(e==="files.catbox.moe")return"catbox";if(e==="litter.catbox.moe")return"litterbox"}catch{}return"other"}var xn="ItemArms",wn="Caress",kc=/^[A-Za-z][A-Za-z0-9_]{0,79}$/,yc=new Set(["sakura bow\0bows gracefully to {target}, as if sakura petals drifted between them.","wolf greeting\0greets {target} with a warm, playful wolfish grin.","inspect knots\0circles {target}, carefully inspecting every knot.","offer hand\0offers {target} a hand with an inviting smile.","moonlit promise\0touches two fingers to their heart, then gestures solemnly toward {target}."]);function An(r=Date.now()){let e=Math.random().toString(36).slice(2,8);return`activity-${r.toString(36)}-${e}`}function pa(r=An()){return{id:r,name:"",targetGroup:xn,targetMode:"other",template:"{me} touches {target's} arm.",image:wn,arousal:0}}function Nn(r){if(!Array.isArray(r))return[];let e=[],t=new Set;for(let i of r.slice(0,100)){let n=vc(i,e.length);if(!n)continue;let o=n.id,a=2;for(;t.has(o);){let l=`-${a++}`;o=`${n.id.slice(0,64-l.length)}${l}`}t.add(o),e.push({...n,id:o})}return e}function ha(r){let e=wc(r).filter(t=>t.pack!=="KikiLink Starter"&&!yc.has(xc(t)));return Nn(e.map((t,i)=>({id:Ac(t,i),name:t.label,targetGroup:xn,targetMode:"other",template:t.template.replaceAll("{source}","{me}").replaceAll("{target}","{target}"),image:wn,arousal:0})))}function vc(r,e){if(!ma(r))return;let t=_t(r.name,40),i=_t(r.template,500);if(!t||!i)return;let n=Nc(r.id)||`activity-${e+1}`,o=ua(r.targetGroup,xn),a=ua(r.image,wn);return{id:n,name:t,targetGroup:o,targetMode:r.targetMode==="self"||r.targetMode==="both"?r.targetMode:"other",template:i,image:a,arousal:Cc(r.arousal,0,20,0)}}function xc(r){return`${r.label.trim().toLocaleLowerCase()}\0${r.template.trim().toLocaleLowerCase()}`}function wc(r){if(!Array.isArray(r))return[];let e=[];for(let t of r.slice(0,100)){if(!ma(t))continue;let i=_t(t.label,32),n=_t(t.template,500);!i||!n||e.push({label:i,template:n,category:_t(t.category,24)||"Uncategorized",pack:_t(t.pack,32)||"My Activities",favorite:t.favorite===!0})}return e}function Ac(r,e){return`legacy-${r.label.toLocaleLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,36)||e+1}`}function _t(r,e){return typeof r=="string"?r.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,e):""}function Nc(r){return typeof r!="string"?"":r.trim().replace(/[^A-Za-z0-9_-]/g,"-").replace(/-+/g,"-").slice(0,64)}function ua(r,e){return typeof r=="string"&&kc.test(r)?r:e}function Cc(r,e,t,i){return typeof r=="number"&&Number.isInteger(r)&&r>=e&&r<=t?r:i}function ma(r){return typeof r=="object"&&r!==null&&!Array.isArray(r)}function ga(r){return{id:r,label:"Friend joined",enabled:!0,trigger:"room-join",scope:"friends",memberNumbers:[],textMatch:"",action:"notice",template:"{name} joined {room}.",cooldownSeconds:30}}function fa(r){if(!Array.isArray(r))return[];let e=[],t=new Set;for(let[i,n]of r.slice(0,20).entries()){if(!Ec(n))continue;let o=Cn(n.label,32),a=Cn(n.template,500);if(!o||!a)continue;let l=n.scope==="friends"||n.scope==="members"?n.scope:"anyone",d=Mc(n.memberNumbers);if(l==="members"&&d.length===0)continue;let c=Rc(n.id)||`reaction-${i+1}`,u=Sc(c,t);t.add(u),e.push({id:u,label:o,enabled:n.enabled!==!1,trigger:n.trigger==="room-join"||n.trigger==="room-leave"||n.trigger==="friend-online"?n.trigger:"beep-received",scope:l,memberNumbers:d,textMatch:Cn(n.textMatch,80),action:n.action==="room-emote"?"room-emote":"notice",template:a,cooldownSeconds:Lc(n.cooldownSeconds,0,3600,30)})}return e}function Mc(r){return Array.isArray(r)?[...new Set(r.filter(e=>typeof e=="number"&&Number.isSafeInteger(e)&&e>=0))].slice(0,20):[]}function Sc(r,e){if(!e.has(r))return r;for(let t=2;t<=21;t+=1){let i=`${r.slice(0,Math.max(1,47-t.toString().length))}-${t}`;if(!e.has(i))return i}return`reaction-${e.size+1}`}function Rc(r){return typeof r=="string"?r.trim().toLocaleLowerCase().replace(/[^a-z0-9_-]/gu,"-").slice(0,48):""}function Cn(r,e){return typeof r=="string"?r.replace(/[\u0000-\u001f\u007f]/gu," ").replace(/\s+/gu," ").trim().slice(0,e):""}function Lc(r,e,t,i){return typeof r=="number"&&Number.isInteger(r)&&r>=e&&r<=t?r:i}function Ec(r){return typeof r=="object"&&r!==null&&!Array.isArray(r)}var R={schemaVersion:28,ui:{accent:"#d71932",theme:"dark",density:"comfortable",textScale:"normal",homeLayout:"showcase",launcherSide:"right",launcherOpen:"home",launcherPosition:null,panelPosition:null,roomBadge:{enabled:!0,position:null},reducedMotion:!1,settingsSection:"appearance"},linkChat:{enabled:!0,saveHistory:!0,includeRoomByDefault:!1,retentionDays:90,maxMessagesPerConversation:500,openOnIncoming:!1,enterToSend:!0,typingIndicators:!0,imagePreviews:"ask",imageUploads:{enabled:!0,retention:"24h"},gallery:{saved:[],hiddenUrls:[]},quickActions:[{label:"Wave",template:"*waves to {name}*"},{label:"Hug",template:"*hugs {name} warmly*"},{label:"Boop",template:"*gently boops {name}*"}]},linkPresence:{enabled:!0,status:"online",statusMessage:"",bio:"",profileImagePreviews:"ask",avatarUrl:"",bannerUrl:"",avatarFrame:"none",profileStyle:"classic",profileOutlineColor:"",profileGradient:{enabled:!1,primary:"#d71932",secondary:"#d8b65d"},autoIdleMinutes:10,afkAutoReply:{enabled:!1,message:"Hi, I'm AFK. Message me later!"}},linkActivities:{enabled:!0,customActivities:[]},linkRoster:{enabled:!0,trackEncounters:!0,retentionDays:365},linkReactions:{quickAlerts:{friendOnline:!1,roomJoin:!1},sounds:{enabled:!1,volume:65,chat:"chime",friendOnline:"sparkle",roomJoin:"pop"},enabled:!1,rules:[]},linkRoom:{presets:[],favoriteRoomNames:[]},linkMusic:{playlists:[{id:"main",name:"My playlist",tracks:[]}],activePlaylistId:"main",repeatMode:"off",shuffle:!1,volume:70}},Re="kikilink:settings:v1",Yi=class{#e;#t;#i=new Set;constructor(e){this.#t=e??Wc(),this.#e=this.#a()}get(){return structuredClone(this.#e)}update(e){let t=this.get();e(t),this.#e=ba(t);try{this.#t.setItem(Re,JSON.stringify(this.#e))}catch{}let i=this.get();return this.#r(i),i}reset(){this.#e=structuredClone(R);try{this.#t.removeItem(Re)}catch{}let e=this.get();return this.#r(e),e}subscribe(e){return this.#i.add(e),()=>this.#i.delete(e)}#r(e){for(let t of[...this.#i])t(structuredClone(e))}#a(){let e=null;try{e=this.#t.getItem(Re)}catch{return structuredClone(R)}if(!e)return structuredClone(R);try{let t=ba(JSON.parse(e)),i=JSON.stringify(t);if(i!==e)try{this.#t.setItem(Re,i)}catch{}return t}catch{return structuredClone(R)}}},be=class{#e=new Map;getItem(e){return this.#e.get(e)??null}getItemResult(e){try{return{ok:!0,value:this.getItem(e)}}catch{return{ok:!1}}}setItem(e,t){this.#e.set(e,t)}removeItem(e){this.#e.delete(e)}};function ba(r){let e=q(r)?r:{},t=typeof e.schemaVersion=="number"&&Number.isFinite(e.schemaVersion)?e.schemaVersion:1,i=q(e.ui)?e.ui:{},n=q(e.linkChat)?e.linkChat:{},o=q(n.imageUploads)?n.imageUploads:{},a=q(e.linkPresence)?e.linkPresence:{},l=q(e.linkActivities)?e.linkActivities:{},d=q(e.linkRoster)?e.linkRoster:{},c=q(e.linkReactions)?e.linkReactions:{},u=q(e.linkRoom)?e.linkRoom:{},p=q(e.linkMusic)?e.linkMusic:{};return{schemaVersion:28,ui:{accent:wa(i.accent)?i.accent:R.ui.accent,theme:i.theme==="light"||i.theme==="system"||i.theme==="dark"?i.theme:R.ui.theme,density:i.density==="compact"||i.density==="super-compact"?i.density:R.ui.density,textScale:i.textScale==="large"||i.textScale==="extra-large"?i.textScale:R.ui.textScale,homeLayout:i.homeLayout==="compact"?"compact":R.ui.homeLayout,launcherSide:i.launcherSide==="left"?"left":"right",launcherOpen:i.launcherOpen==="last"||i.launcherOpen==="chat"?i.launcherOpen:R.ui.launcherOpen,launcherPosition:Pn(i.launcherPosition),panelPosition:Pn(i.panelPosition),roomBadge:Fc(i.roomBadge,t),reducedMotion:Z(i.reducedMotion,R.ui.reducedMotion),settingsSection:qc(i.settingsSection)?i.settingsSection:R.ui.settingsSection},linkChat:{enabled:Z(n.enabled,R.linkChat.enabled),saveHistory:Z(n.saveHistory,R.linkChat.saveHistory),includeRoomByDefault:Z(n.includeRoomByDefault,R.linkChat.includeRoomByDefault),retentionDays:dt(n.retentionDays,1,3650,R.linkChat.retentionDays),maxMessagesPerConversation:dt(n.maxMessagesPerConversation,50,5e3,R.linkChat.maxMessagesPerConversation),openOnIncoming:Z(n.openOnIncoming,R.linkChat.openOnIncoming),enterToSend:Z(n.enterToSend,R.linkChat.enterToSend),typingIndicators:Z(n.typingIndicators,R.linkChat.typingIndicators),imagePreviews:n.imagePreviews==="always"||n.imagePreviews==="never"?n.imagePreviews:R.linkChat.imagePreviews,imageUploads:_c(o,t),gallery:Dc(n.gallery),quickActions:Kc(n.quickActions)},linkPresence:{enabled:Z(a.enabled,R.linkPresence.enabled),status:a.status==="idle"||a.status==="dnd"||a.status==="offline"?a.status:R.linkPresence.status,statusMessage:typeof a.statusMessage=="string"?me(a.statusMessage,80):R.linkPresence.statusMessage,bio:typeof a.bio=="string"?zc(a.bio):R.linkPresence.bio,profileImagePreviews:t<=27?"ask":a.profileImagePreviews==="always"||a.profileImagePreviews==="ask"||a.profileImagePreviews==="never"?a.profileImagePreviews:R.linkPresence.profileImagePreviews,avatarUrl:ka(a.avatarUrl),bannerUrl:ka(a.bannerUrl),avatarFrame:a.avatarFrame==="blossom"||a.avatarFrame==="rose"||a.avatarFrame==="starlight"||a.avatarFrame==="laurel"||a.avatarFrame==="thorn"||a.avatarFrame==="moon"||a.avatarFrame==="ribbon"?a.avatarFrame:R.linkPresence.avatarFrame,profileStyle:a.profileStyle==="garden"||a.profileStyle==="midnight"?a.profileStyle:R.linkPresence.profileStyle,profileOutlineColor:Ln(a.profileOutlineColor),profileGradient:Uc(a.profileGradient),autoIdleMinutes:dt(a.autoIdleMinutes,0,120,R.linkPresence.autoIdleMinutes),afkAutoReply:Bc(a.afkAutoReply,t)},linkActivities:{enabled:t<13?!0:Z(l.enabled,R.linkActivities.enabled),customActivities:t<13?ha(l.activities):Nn(l.customActivities)},linkRoster:{enabled:Z(d.enabled,R.linkRoster.enabled),trackEncounters:Z(d.trackEncounters,R.linkRoster.trackEncounters),retentionDays:Vc(d.retentionDays)},linkReactions:{quickAlerts:Hc(c.quickAlerts),sounds:$c(c.sounds),enabled:Z(c.enabled,R.linkReactions.enabled),rules:fa(c.rules)},linkRoom:{presets:Ic(u.presets),favoriteRoomNames:Pc(u.favoriteRoomNames)},linkMusic:Tc(p,t)}}function Pc(r){if(!Array.isArray(r))return[];let e=[],t=new Set;for(let i of r){let n=me(i,80),o=n.replace(/\s+/gu," ").toLocaleLowerCase();if(!(!n||t.has(o))&&(t.add(o),e.push(n),e.length>=50))break}return e}function Ic(r){if(!Array.isArray(r))return[];let e=[],t=new Set;for(let i of r.slice(0,12)){if(!q(i)||!q(i.room))continue;let n=fi(i.id),o=me(i.label,60);if(!n||!o||t.has(n))continue;let a=i.room,l=q(a.custom)?a.custom:{},d=xa(i.savedAt);e.push({id:n,label:o,savedAt:d,room:{name:me(a.name,80),description:me(a.description,200),background:me(a.background,120),limit:dt(a.limit,2,20,10),game:me(a.game,40),space:me(a.space,20),language:me(a.language,12),visibility:Sn(a.visibility,8,30),access:Sn(a.access,8,30),blockCategory:Sn(a.blockCategory,24,40),admins:Rn(a.admins,20),whitelist:Rn(a.whitelist,100),blacklist:Rn(a.blacklist,100),custom:{imageUrl:En(l.imageUrl),imageFilter:me(l.imageFilter,120),musicUrl:En(l.musicUrl),sizeMode:dt(l.sizeMode,1,3,1),musicSync:Z(l.musicSync,!1)}}}),t.add(n)}return e.sort((i,n)=>n.savedAt-i.savedAt)}function Tc(r,e){let t=[],i=new Set,n=100;if(Array.isArray(r.playlists))for(let l of r.playlists.slice(0,8)){if(!q(l))continue;let d=fi(l.id),c=me(l.name,60);if(!d||!c||i.has(d))continue;let u=[],p=new Set;if(Array.isArray(l.tracks))for(let h of l.tracks){if(n<=0||!q(h))break;let m=fi(h.id),f=me(h.title,80),y=h.source==="local"?"local":h.source==="catbox"||h.source==="hosted"||e<20&&typeof h.source=="string"&&h.source!=="url"?"catbox":"url",g=y==="local"?fi(h.locator):jc(h.locator);!m||!f||!g||p.has(m)||(u.push({id:m,title:f,source:y,locator:g,addedAt:xa(h.addedAt)}),p.add(m),n-=1)}t.push({id:d,name:c,tracks:u}),i.add(d)}t.length===0&&t.push(structuredClone(R.linkMusic.playlists[0]));let o=fi(r.activePlaylistId),a=t.some(l=>l.id===o)?o:t[0].id;return{playlists:t,activePlaylistId:a,repeatMode:r.repeatMode==="all"||r.repeatMode==="one"?r.repeatMode:"off",shuffle:Z(r.shuffle,R.linkMusic.shuffle),volume:dt(r.volume,0,100,R.linkMusic.volume)}}function _c(r,e){return{enabled:e<14?!1:Z(r.enabled,R.linkChat.imageUploads.enabled),retention:Oc(r.retention)}}function Oc(r){return r==="1h"||r==="12h"||r==="24h"||r==="72h"?r:r==="1d"?"24h":r==="3d"||r==="7d"||r==="30d"?"72h":R.linkChat.imageUploads.retention}function Dc(r){let e=q(r)?r:{},t=Gc(e.hiddenUrls,80),i=new Set(t),n=new Map;if(Array.isArray(e.saved))for(let o of e.saved.slice(0,80)){if(!q(o))continue;let a=va(o.url);if(!a||i.has(a)||n.has(a))continue;let l=typeof o.addedAt=="number"&&Number.isFinite(o.addedAt)&&o.addedAt>0?Math.min(Date.now(),Math.round(o.addedAt)):Date.now(),d=typeof o.expiresAt=="number"&&Number.isFinite(o.expiresAt)&&o.expiresAt>l&&o.expiresAt<=864e13?Math.round(o.expiresAt):void 0;if(n.set(a,{url:a,addedAt:l,...d===void 0?{}:{expiresAt:d}}),n.size>=40)break}return{saved:[...n.values()].sort((o,a)=>a.addedAt-o.addedAt),hiddenUrls:t}}function Gc(r,e){if(!Array.isArray(r))return[];let t=new Set;for(let i of r){let n=va(i);if(n&&(t.add(n),t.size>=e))break}return[...t]}function va(r){if(typeof r!="string"||r.trim().length>500)return;let e=V(r);return e&&e.length<=500?e:void 0}function Bc(r,e){let t=q(r)?r:{},i=typeof t.message=="string"?t.message.trim().slice(0,500):R.linkPresence.afkAutoReply.message;return e<15&&i==="\u041F\u0440\u0438\u0432\u0435\u0442, \u044F \u0410\u0424\u041A, \u043D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043C\u043D\u0435 \u043F\u043E\u0437\u0436\u0435!"&&(i=R.linkPresence.afkAutoReply.message),{enabled:Z(t.enabled,R.linkPresence.afkAutoReply.enabled),message:i||R.linkPresence.afkAutoReply.message}}function ka(r){if(typeof r!="string")return"";let e=r.trim();if(!e||e.length>500)return"";let t;try{t=new URL(e)}catch{return""}let i=V(e);return i&&i===t.href&&i.length<=500?i:""}function Ln(r){return wa(r)?r.toLowerCase():""}function Uc(r){if(!q(r))return structuredClone(R.linkPresence.profileGradient);let e=Ln(r.primary),t=Ln(r.secondary),i=!!(e&&t);return{enabled:r.enabled===!0&&i,primary:i?e:R.linkPresence.profileGradient.primary,secondary:i?t:R.linkPresence.profileGradient.secondary}}function Fc(r,e){let t=q(r)?r:{};return{enabled:Z(t.enabled,R.ui.roomBadge.enabled),position:e>=16?Pn(t.position):null}}function Hc(r){let e=q(r)?r:{};return{friendOnline:Z(e.friendOnline,R.linkReactions.quickAlerts.friendOnline),roomJoin:Z(e.roomJoin,R.linkReactions.quickAlerts.roomJoin)}}function $c(r){let e=q(r)?r:{};return{enabled:Z(e.enabled,R.linkReactions.sounds.enabled),volume:dt(e.volume,0,100,R.linkReactions.sounds.volume),chat:Mn(e.chat,R.linkReactions.sounds.chat),friendOnline:Mn(e.friendOnline,R.linkReactions.sounds.friendOnline),roomJoin:Mn(e.roomJoin,R.linkReactions.sounds.roomJoin)}}function Mn(r,e){return r==="sparkle"||r==="pop"||r==="chime"||typeof r=="string"&&/^custom:[a-z0-9_-]{1,64}$/iu.test(r)?r:e}function Kc(r){if(r===void 0||!Array.isArray(r))return structuredClone(R.linkChat.quickActions);let e=[];for(let t of r.slice(0,12)){if(!q(t))continue;let i=typeof t.label=="string"?t.label.trim().slice(0,24):"",n=typeof t.template=="string"?t.template.trim().slice(0,500):"";i&&n&&e.push({label:i,template:n})}return e}function fi(r){if(typeof r!="string")return;let e=r.trim().toLocaleLowerCase();return/^[a-z0-9_-]{1,64}$/u.test(e)?e:void 0}function me(r,e){return typeof r=="string"?r.replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu," ").replace(/\s+/gu," ").trim().slice(0,e):""}function zc(r){return[...r.replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu," ").replace(/\s+/gu," ").trim()].slice(0,160).join("")}function xa(r){return typeof r=="number"&&Number.isFinite(r)&&r>0?Math.min(Date.now(),Math.round(r)):Date.now()}function Sn(r,e,t){if(!Array.isArray(r))return[];let i=new Set;for(let n of r){let o=me(n,t);if(o&&i.add(o),i.size>=e)break}return[...i]}function Rn(r,e){if(!Array.isArray(r))return[];let t=new Set;for(let i of r)if(typeof i=="number"&&Number.isSafeInteger(i)&&i>=0&&t.add(i),t.size>=e)break;return[...t]}function En(r){if(typeof r!="string"||r.trim().length>500)return"";try{let e=new URL(r.trim());return e.protocol!=="https:"||e.username||e.password?"":e.href.slice(0,500)}catch{return""}}function jc(r){let e=En(r);if(e)try{let t=new URL(e);return/\.(?:aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/iu.test(t.pathname)?e:void 0}catch{return}}function Pn(r){return!q(r)||!ya(r.x,0,1)||!ya(r.y,0,1)?null:{x:r.x,y:r.y}}function q(r){return typeof r=="object"&&r!==null&&!Array.isArray(r)}function Z(r,e){return typeof r=="boolean"?r:e}function dt(r,e,t,i){return typeof r=="number"&&Number.isInteger(r)&&r>=e&&r<=t?r:i}function Vc(r){return r===0||r===30||r===90||r===180||r===365||r===730?r:R.linkRoster.retentionDays}function ya(r,e,t){return typeof r=="number"&&Number.isFinite(r)&&r>=e&&r<=t}function wa(r){return typeof r=="string"&&/^#[0-9a-f]{6}$/iu.test(r)}function qc(r){return r==="appearance"||r==="navigation"||r==="chat"||r==="players"||r==="activities"||r==="reactions"||r==="about"}function Wc(){try{if(typeof localStorage<"u")return localStorage.getItem("kikilink:storage-probe"),localStorage}catch{}return new be}var Ot=class{#e=new Map;on(e,t){let i=this.#e.get(e);return i||(i=new Set,this.#e.set(e,i)),i.add(t),()=>this.off(e,t)}once(e,t){let i=this.on(e,n=>{i(),t(n)});return i}off(e,t){let i=this.#e.get(e);i?.delete(t),i?.size===0&&this.#e.delete(e)}emit(e,t){let i=this.#e.get(e);if(i)for(let n of[...i])try{n(t)}catch(o){console.error(`[KikiLink] Event listener failed for ${String(e)}`,o)}}clear(){this.#e.clear()}};var Xc="fusam",bi=Xc==="fusam"?"fusam":"userscript";function pe(){return bi!=="fusam"}var Yc="https://raw.githubusercontent.com/Lilja000/KikiLink/main/package.json",Ma="https://raw.githubusercontent.com/Lilja000/KikiLink/main/dist/KikiLink.user.js",Jc=4e3,Qc=8*1024,Zc=256,eu=256,tu=["bondageprojects.elementfx.com","bondageprojects.com","bondage-europe.com","bondageeurope.com","bondage-asia.com"],iu=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/u,In=/^\d+$/u;async function Sa(r,e={}){try{if(bi==="fusam")return;let t=Na(r);if(!t)return;let i=Object.hasOwn(e,"hostname")?e.hostname??void 0:nu();if(!i||!ru(i))return;let n=Object.hasOwn(e,"fetchImpl")?e.fetchImpl??void 0:ou();if(!n||typeof AbortController!="function")return;let o=Aa(e.timeoutMs,Jc),a=Aa(e.maxResponseBytes,Qc),l=new AbortController,d=Date.now()+o,c=!1,u,p=(async()=>{let m=await n(Yc,{method:"GET",mode:"cors",credentials:"omit",cache:"no-store",redirect:"error",referrerPolicy:"no-referrer",headers:{Accept:"application/json"},signal:l.signal});if(c){await Ji(m);return}if(!m.ok){await Ji(m);return}let f=await au(m,a,l.signal,d);if(c||f===void 0)return;let y=lu(f),g=y===void 0?void 0:Na(y);return g&&du(g,t)>0?y:void 0})().catch(()=>{}),h=new Promise(m=>{u=setTimeout(()=>{c=!0,l.abort(),m(void 0)},o)});try{return await Promise.race([p,h])}finally{u!==void 0&&clearTimeout(u)}}catch{return}}function ru(r){if(r.length===0||r.length>254)return!1;let e=r.toLowerCase().replace(/\.$/u,"");return!/^[a-z0-9.-]+$/u.test(e)||e.includes("..")?!1:tu.some(t=>e===t||e.endsWith(`.${t}`))}function nu(){try{return typeof location=="object"&&typeof location.hostname=="string"?location.hostname:void 0}catch{return}}function ou(){try{return typeof globalThis.fetch!="function"?void 0:(r,e)=>globalThis.fetch(r,e)}catch{return}}function Aa(r,e){return typeof r=="number"&&Number.isSafeInteger(r)&&r>0?Math.min(r,e):e}async function au(r,e,t,i){let n=r.headers.get("content-length");if(n!==null&&!su(n,e)){await Ji(r);return}let o=r.body?.getReader();if(!o){await Ji(r);return}let a=[],l=0,d=0,c=()=>{o.cancel().catch(()=>{})};t.addEventListener("abort",c,{once:!0});try{for(;!t.aborted;){if(Date.now()>=i||d>=eu){await o.cancel();return}d+=1;let{done:h,value:m}=await o.read();if(Date.now()>=i){await o.cancel();return}if(h)break;if(!(m instanceof Uint8Array)){await o.cancel();return}if(l+=m.byteLength,l>e){await o.cancel();return}a.push(m)}if(t.aborted)return;let u=new Uint8Array(l),p=0;for(let h of a)u.set(h,p),p+=h.byteLength;return new TextDecoder("utf-8",{fatal:!0}).decode(u)}catch{try{await o.cancel()}catch{}return}finally{t.removeEventListener("abort",c);try{o.releaseLock()}catch{}}}function su(r,e){if(!/^(?:0|[1-9]\d*)$/u.test(r))return!1;let t=String(e);return r.length<t.length||r.length===t.length&&r<=t}async function Ji(r){try{await r.body?.cancel()}catch{}}function lu(r){let e=JSON.parse(r);if(typeof e!="object"||e===null||Array.isArray(e)||!Object.hasOwn(e,"version"))return;let t=e.version;return typeof t=="string"?t:void 0}function Na(r){if(r.length===0||r.length>Zc)return;let e=iu.exec(r);if(!e)return;let t=e[1],i=e[2],n=e[3];if(t===void 0||i===void 0||n===void 0)return;let o=e[4]?.split(".")??[];if(!o.some(a=>In.test(a)&&a.length>1&&a.startsWith("0")))return{core:[t,i,n],prerelease:o}}function du(r,e){for(let i=0;i<r.core.length;i+=1){let n=r.core[i],o=e.core[i];if(n===void 0||o===void 0)return 0;let a=Ca(n,o);if(a!==0)return a}if(r.prerelease.length===0)return e.prerelease.length===0?0:1;if(e.prerelease.length===0)return-1;let t=Math.max(r.prerelease.length,e.prerelease.length);for(let i=0;i<t;i+=1){let n=r.prerelease[i],o=e.prerelease[i];if(n===void 0)return-1;if(o===void 0)return 1;if(n===o)continue;let a=In.test(n),l=In.test(o);return a&&l?Ca(n,o):a!==l?a?-1:1:n<o?-1:1}return 0}function Ca(r,e){return r.length!==e.length?r.length<e.length?-1:1:r===e?0:r<e?-1:1}function s(r,e={},...t){let i=document.createElement(r);e.className&&(i.className=e.className),e.text!==void 0&&(i.textContent=e.text),e.title!==void 0&&(i.title=e.title),e.src!==void 0&&i instanceof HTMLImageElement&&(i.src=e.src),e.alt!==void 0&&i instanceof HTMLImageElement&&(i.alt=e.alt),e.tabIndex!==void 0&&(i.tabIndex=e.tabIndex),e.type!==void 0&&i instanceof HTMLButtonElement&&(i.type=e.type),e.ariaLabel!==void 0&&i.setAttribute("aria-label",e.ariaLabel),e.onClick&&i.addEventListener("click",n=>e.onClick?.(n));for(let n of t)n&&i.append(n instanceof Node?n:document.createTextNode(n));return i}var _e='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="KikiLink blossom">%0A  <g fill="%23ef6078" stroke="%235f1b2a" stroke-linejoin="round" stroke-width="3">%0A    <path d="M32 33C24 28 22 18 26 10c2-4 10-4 12 0 4 8 2 18-6 23Z"/>%0A    <path d="M33 32c2-9 9-16 18-15 6 1 8 8 4 13-5 7-14 8-22 2Z"/>%0A    <path d="M34 34c9-2 18 2 21 10 2 6-4 11-10 9-8-3-13-10-11-19Z"/>%0A    <path d="M30 34c-9-2-18 2-21 10-2 6 4 11 10 9 8-3 13-10 11-19Z"/>%0A    <path d="M31 32c-2-9-9-16-18-15-6 1-8 8-4 13 5 7 14 8 22 2Z"/>%0A  </g>%0A  <g fill="none" stroke="%23ffb2bf" stroke-linecap="round" stroke-width="2">%0A    <path d="M30 12c-2 3-2 7-1 10"/>%0A    <path d="M48 21c-4 0-7 2-9 5"/>%0A    <path d="M48 44c-3-2-7-3-10-2"/>%0A  </g>%0A  <circle cx="32" cy="33" r="8" fill="%23f3b63f" stroke="%235f1b2a" stroke-width="3"/>%0A  <circle cx="29.5" cy="30.5" r="2" fill="%23ffe6a1"/>%0A</svg>%0A';var Ia=500,Ta=1e3,uu=35,er=.78,pu=5,hu=64,mu=["M32 33C24 28 22 18 26 10c2-4 10-4 12 0 4 8 2 18-6 23Z","M33 32c2-9 9-16 18-15 6 1 8 8 4 13-5 7-14 8-22 2Z","M34 34c9-2 18 2 21 10 2 6-4 11-10 9-8-3-13-10-11-19Z","M30 34c-9-2-18 2-21 10-2 6 4 11 10 9 8-3 13-10 11-19Z","M31 32c-2-9-9-16-18-15-6 1-8 8-4 13 5 7 14 8 22 2Z"],gu=["M30 12c-2 3-2 7-1 10","M48 21c-4 0-7 2-9 5","M48 44c-3-2-7-3-10-2"],Qi,Ra=Object.freeze({x:.84,y:.045});function Zi(r,e){let t=ki(r&&Number.isFinite(r.x)?r.x:Ra.x,0,1),i=ki(r&&Number.isFinite(r.y)?r.y:Ra.y,0,1),n=Oa(e.zoom,1);return{left:Dt(e.x)+t*Ia*n,top:Dt(e.y)+i*Ta*n,size:uu*n}}function fu(r,e,t){let i=Oa(t.zoom,1);return{x:ki((Dt(r)-Dt(t.x))/(Ia*i),0,1),y:ki((Dt(e)-Dt(t.y))/(Ta*i),0,1)}}var tr=class{#e;#t;#i;#r=document.createElement("img");#a=typeof Image=="function"?new Image:void 0;#c;#l;#o;#s;#p;#g="";#d="";#u;#h;#m=!1;#y=!1;#v=!1;#L=(e,t,i,n)=>{if(!e||!Number.isFinite(t)||!Number.isFinite(i)||!Number.isFinite(n))return;if(e.MemberNumber===this.#t.getOwnMemberNumber()){this.#l?(this.#l.x=t,this.#l.y=i,this.#l.zoom=n):this.#l={x:t,y:i,zoom:n},this.#c.enabled&&this.#M()&&this.#I(Zi(this.#c.position,this.#l)),this.#m&&this.#w();return}if(!this.#c.enabled||!this.#M()||!this.#i.hasCompatiblePeer(e.MemberNumber))return;let a=Zi(this.#c.position,{x:t,y:i,zoom:n});this.#I(a)};#S=e=>{if(!this.#m||this.#s||e.button!==0||!this.#l||!this.#p)return;let t=Ea(e,this.#p);if(!t)return;let i=Zi(this.#o??this.#c.position,this.#l);this.#s={pointerId:e.pointerId,startCanvasX:t.x,startCanvasY:t.y,offsetX:t.x-i.left,offsetY:t.y-i.top,moved:!1},this.#_(e);try{this.#r.setPointerCapture(e.pointerId)}catch{}};#C=e=>{let t=this.#s,i=this.#l,n=this.#p;if(!t||t.pointerId!==e.pointerId||!i||!n)return;let o=Ea(e,n);o&&(!t.moved&&Math.hypot(o.x-t.startCanvasX,o.y-t.startCanvasY)<pu||(t.moved=!0,this.#o=fu(o.x-t.offsetX,o.y-t.offsetY,i),this.#w(),this.#_(e)))};#E=e=>{let t=this.#s;if(!t||t.pointerId!==e.pointerId||(this.#_(e),this.#O(e.pointerId),this.#s=void 0,!t.moved||!this.#o))return;let i=this.#o;this.#e.update(n=>{n.ui.roomBadge.position=i}),this.#o=void 0,this.#G(!1),this.#w()};#R=e=>{!this.#s||this.#s.pointerId!==e.pointerId||(this.#_(e),this.#O(e.pointerId),this.#s=void 0,this.#o=void 0,this.#w())};#A=e=>{!this.#m||e.key!=="Escape"||(e.preventDefault(),this.cancelPlacement())};constructor(e,t,i){this.#t=e,this.#e=t,this.#i=i,this.#c=t.get().ui.roomBadge,this.#a&&(this.#a.src=_e),this.#r.className="kl-room-blossom",this.#r.src=_e,this.#r.alt="",this.#r.draggable=!1,this.#r.hidden=!0,this.#r.setAttribute("aria-hidden","true"),Object.assign(this.#r.style,{position:"fixed",display:"none",pointerEvents:"none",opacity:String(er),zIndex:"2147483000",userSelect:"none",touchAction:"none",filter:"drop-shadow(0 1px 3px rgba(0, 0, 0, .75))"}),this.#u=t.subscribe(n=>{this.#c=n.ui.roomBadge,this.#c.enabled||this.cancelPlacement(),this.#w()})}mount(){this.#v||this.#y||(this.#y=!0,document.body.append(this.#r),typeof this.#t.registerCharacterOverlay=="function"&&(this.#h=this.#t.registerCharacterOverlay(this.#L)),this.#w(),window.addEventListener("keydown",this.#A))}beginPlacement(){let e=Pa(this.#t.getOwnMemberNumber());if(e&&(this.#l=e),this.#w(),this.#v||!this.#y||!this.#c.enabled||typeof this.#t.isInChatRoom!="function"||!this.#t.isInChatRoom()||!this.#l)return!1;let t=La();return t?(this.cancelPlacement(),this.#p=t,this.#G(!0),this.#w(),!0):!1}cancelPlacement(){this.#O(this.#s?.pointerId),this.#s=void 0,this.#o=void 0,this.#G(!1),this.#w()}resetPosition(){this.#v||(this.cancelPlacement(),this.#e.update(e=>{e.ui.roomBadge.position=null}))}destroy(){this.#v||(this.#v=!0,this.cancelPlacement(),window.removeEventListener("keydown",this.#A),this.#u?.(),this.#u=void 0,this.#h?.(),this.#h=void 0,this.#r.remove(),this.#l=void 0,this.#y=!1)}#I(e){if(typeof DrawImageResize=="function")try{if(DrawImageResize(_e,e.left,e.top,e.size,e.size))return!0}catch{}let t=_a();if(!t)return!1;try{if(typeof DrawImageCanvas=="function"&&DrawImageCanvas(_e,t,e.left,e.top,{Width:e.size,Height:e.size,Alpha:er})||bu(t,e))return!0;if(this.#a?.complete&&this.#a.naturalWidth>0)return t.save(),t.globalAlpha=er,t.drawImage(this.#a,e.left,e.top,e.size,e.size),t.restore(),!0}catch{}return!1}#M(){return typeof ChatRoomHideIconState!="number"||ChatRoomHideIconState===0}#w(){if(this.#v||!this.#y)return;if(!this.#m){this.#r.hidden=!0,this.#r.style.display="none";return}let e=typeof this.#t.isInChatRoom=="function"&&this.#t.isInChatRoom();if(!this.#c.enabled||!this.#M()||!e){this.#r.hidden=!0,this.#r.style.display="none";return}let t=Pa(this.#t.getOwnMemberNumber());t&&(this.#l=t);let i=this.#l,n=La();if(!i||!n){this.#r.hidden=!0,this.#r.style.display="none";return}let o=n.getBoundingClientRect();if(o.width<=0||o.height<=0||n.width<=0||n.height<=0){this.#r.hidden=!0,this.#r.style.display="none";return}let a=Zi(this.#o??this.#c.position,i),l=o.width/n.width,d=o.height/n.height;this.#r.hidden=!1,this.#r.style.display="block",this.#r.style.left=`${o.left+a.left*l}px`,this.#r.style.top=`${o.top+a.top*d}px`,this.#r.style.width=`${a.size*l}px`,this.#r.style.height=`${a.size*d}px`}#G(e){if(e===this.#m)return;this.#m=e;let t=this.#p;if(e&&t){this.#g=this.#r.style.cursor,this.#d=this.#r.style.touchAction,this.#r.style.cursor="grab",this.#r.style.touchAction="none",this.#r.style.pointerEvents="auto",this.#r.style.outline="1px dashed rgba(255, 135, 153, .9)",this.#r.style.outlineOffset="3px",this.#r.addEventListener("pointerdown",this.#S,!0),window.addEventListener("pointermove",this.#C,!0),window.addEventListener("pointerup",this.#E,!0),window.addEventListener("pointercancel",this.#R,!0);return}this.#r.removeEventListener("pointerdown",this.#S,!0),this.#r.style.cursor=this.#g,this.#r.style.touchAction=this.#d,this.#r.style.pointerEvents="none",this.#r.style.outline="",this.#r.style.outlineOffset="",window.removeEventListener("pointermove",this.#C,!0),window.removeEventListener("pointerup",this.#E,!0),window.removeEventListener("pointercancel",this.#R,!0),this.#p=void 0}#_(e){e.preventDefault(),e.stopImmediatePropagation()}#O(e){if(e!==void 0)try{(!this.#r.hasPointerCapture||this.#r.hasPointerCapture(e))&&this.#r.releasePointerCapture(e)}catch{}}};function bu(r,e){let t=ku();if(!t)return!1;let i=!1;try{r.save(),i=!0,r.translate(e.left,e.top);let n=e.size/hu;r.scale(n,n),r.globalAlpha=ki(r.globalAlpha*er,0,1),r.lineJoin="round",r.lineCap="round",r.lineWidth=3,r.shadowColor="rgba(0, 0, 0, .55)",r.shadowBlur=2,r.shadowOffsetY=1,r.fillStyle="#ef6078",r.strokeStyle="#5f1b2a";for(let o of t.petals)r.fill(o),r.stroke(o);r.shadowColor="transparent",r.shadowBlur=0,r.shadowOffsetY=0,r.strokeStyle="#ffb2bf",r.lineWidth=2;for(let o of t.highlights)r.stroke(o);return r.beginPath(),r.arc(32,33,8,0,Math.PI*2),r.fillStyle="#f3b63f",r.fill(),r.strokeStyle="#5f1b2a",r.lineWidth=3,r.stroke(),r.beginPath(),r.arc(29.5,30.5,2,0,Math.PI*2),r.fillStyle="#ffe6a1",r.fill(),!0}catch{return!1}finally{if(i)try{r.restore()}catch{}}}function ku(){if(Qi)return Qi;if(typeof Path2D!="function")return null;try{Qi={petals:mu.map(r=>new Path2D(r)),highlights:gu.map(r=>new Path2D(r))}}catch{return null}return Qi}function _a(){if(!(typeof MainCanvas>"u"||MainCanvas===null))return typeof MainCanvas.drawImage=="function"?MainCanvas:MainCanvas.getContext?.("2d")??void 0}function La(){let r=_a();if(r?.canvas)return r.canvas;if(typeof MainCanvas<"u"&&typeof MainCanvas.getContext=="function")return MainCanvas;let e=document.getElementById("MainCanvas");return e instanceof HTMLCanvasElement?e:void 0}function Ea(r,e){let t=e.getBoundingClientRect();if(!(t.width<=0||t.height<=0))return{x:(r.clientX-t.left)*(e.width/t.width),y:(r.clientY-t.top)*(e.height/t.height)}}function Pa(r){if(!Number.isSafeInteger(r)||typeof ChatRoomCharacterViewLoopCharacters!="function"||typeof ChatRoomCharacterDrawlist>"u"||!Array.isArray(ChatRoomCharacterDrawlist))return;let e;try{ChatRoomCharacterViewLoopCharacters((t,i,n,o,a)=>{if(ChatRoomCharacterDrawlist[t]?.MemberNumber===r&&!(!Number.isFinite(i)||!Number.isFinite(n)||!Number.isFinite(a)||a<=0))return e={x:i,y:n,zoom:a},!0})}catch{return}return e}function Dt(r){return Number.isFinite(r)?r:0}function Oa(r,e){return Number.isFinite(r)&&r>0?r:e}function ki(r,e,t){return Math.min(t,Math.max(e,r))}var ct="KikiLinkCustom_",_n="KikiLinkCustomActivity",Ha="KikiLinkActivityMeta",On="KikiLinkArousalFallback",yu=120,vu=5,xu=1e4,wu=120,Au=500,Dn=/^[A-Za-z][A-Za-z0-9_]{0,79}$/,Nu=12,Cu=18,Mu=720,$a=["Bite","BrothersHandshake","Caress","Choke","Cuddle","FrenchKiss","GagKiss","GaggedKiss","Grope","HandGag","Inject","Kiss","Lick","MassageFeet","MassageHands","MasturbateFist","MasturbateHand","MoanGag","MoanGagAngry","MoanGagGiggle","MoanGagTalk","MoanGagWhimper","Nod","PenetrateSlow","Pinch","PoliteKiss","Pull","RestHead","SiblingsCheekKiss","SistersHug","Slap","Suck","Tickle"],Ka=new Set($a),Su={Clean:"Caress",Pet:"Caress",Rub:"Cuddle",StruggleArms:"Cuddle",StruggleLegs:"Cuddle",Wiggle:"Cuddle",MoanGagGroan:"GaggedKiss",CollarGrab:"Grope",TakeCare:"Grope",MasturbateFoot:"MassageFeet",Step:"MassageFeet",Kick:"MassageFeet",Sit:"MassageFeet",MasturbateTongue:"Lick",Whisper:"Kiss",PenetrateFast:"PenetrateSlow",Spank:"Slap",Nibble:"Bite"},Gt=class{constructor(e,t){this.adapter=e;this.settings=t}adapter;settings;#e=new Map;#t=new Map;#i=[];#r=new Map;#a;#c;#l;#o;#s;#p=!1;#g;#d=e=>{let t=e.target;if(!t||typeof t.closest!="function")return;let i=t.closest('button.dialog-grid-button[name^="KikiLinkCustom_"]');if(!i||i.disabled||i.getAttribute("aria-disabled")==="true")return;let n=i.getAttribute("name")??"",o=this.#e.get(n);if(!o)return;let a;try{a=typeof CharacterGetCurrent=="function"?CharacterGetCurrent():typeof CurrentCharacter<"u"?CurrentCharacter:void 0}catch{return}let l=typeof Player=="object"&&Player!==null?Player:void 0,d=a?.FocusGroup;if(!l||!a||!d)return;let c=d.Name,u=Number.parseInt(i.dataset.index??"",10),p=typeof DialogActivity<"u"&&Array.isArray(DialogActivity)&&Number.isSafeInteger(u)?DialogActivity[u]:void 0,h=p?.Activity?.Name===n?p:{Activity:this.#t.get(n)??rr(n,o),Group:c};if(this.run(l,a,d,h)&&(e.preventDefault(),e.stopImmediatePropagation(),typeof CurrentScreen=="string"&&CurrentScreen==="ChatRoom"&&typeof DialogLeave=="function"))try{DialogLeave()}catch{}};start(){this.#g||(this.#g=this.adapter.registerCustomActivityIntegration(this)),this.#o===void 0&&(this.#o=setInterval(()=>{this.#v(),this.#m(),this.#y()},Au)),this.#v(),this.syncFromSettings()}stop(){this.#o!==void 0&&(clearInterval(this.#o),this.#o=void 0),this.#s?.disconnect(),this.#s=void 0,this.#p&&typeof document<"u"&&(document.removeEventListener("click",this.#d,!0),this.#p=!1),this.#g?.(),this.#g=void 0,this.#C(),this.#e.clear(),this.#t.clear(),this.#a=void 0,this.#i.splice(0),this.#r.clear()}syncFromSettings(){this.#a=void 0,this.#C(),this.#e.clear(),this.#t.clear();let e=this.settings?.get();if(!e?.linkActivities.enabled)return;let t=Bu(this.adapter);for(let i of e.linkActivities.customActivities){let n=Tu(t,i.id);this.#e.set(n,i)}this.#m(),this.#y()}isAvailable(){return this.adapter.canSendRoomEmote()}isCustomActivity(e){return this.#e.has(e)}extendAllowedActivities(e,t,i){if(!Array.isArray(i)||!Dn.test(t))return i;let n=i,o=new Set(i.map(l=>l?.Activity?.Name)),a=e?.MemberNumber===this.adapter.getOwnMemberNumber();for(let[l,d]of this.#e)!Ba(d.targetGroup,t)||o.has(l)||a&&d.targetMode==="other"||!a&&d.targetMode==="self"||(n===i&&(n=[...i]),n.push({Activity:this.#t.get(l)??rr(l,d),Group:t}),o.add(l));return n}getTargets(){return this.adapter.getRoomCharacters()}preview(e,t){return Lu(e.template,{sourceName:this.adapter.getOwnName(),target:t})}perform(e,t){let i=this.getTargets().find(o=>o.memberNumber===t.memberNumber);if(!i)throw new Error(`${t.memberName} is no longer in this room`);let n=this.preview(e,i);return this.adapter.sendRoomEmote(n),n}getBodySlots(){if(this.#a)return this.#a;if(typeof AssetGroup>"u"||!Array.isArray(AssetGroup)||typeof ActivityFemale3DCG>"u"||!Array.isArray(ActivityFemale3DCG))return Ua();let e=new Set;for(let i of ActivityFemale3DCG)if(!i.Name.startsWith(ct)&&Array.isArray(i.Target))for(let n of i.Target)e.add(n);let t=AssetGroup.filter(i=>i.Category==="Item"&&Array.isArray(i.Zone)&&i.Zone.length>0&&(e.size===0||e.has(i.Name))).map(i=>({name:i.Name,label:i.Description||Hu(i.Name),zones:i.Zone??[]})).sort((i,n)=>i.label.localeCompare(n.label));return t.length===0?Ua():(this.#a=t,t)}getVanillaImages(){return[...$a]}drawPlayer(e,t,i){let n=e.getContext("2d");if(!n||(e.width!==250&&(e.width=250),e.height!==500&&(e.height=500),n.clearRect(0,0,e.width,e.height),typeof Player!="object"||Player===null||typeof DrawCharacter!="function"))return!1;DrawCharacter(Player,0,0,.5,!1,n);let o=[...this.getBodySlots()].sort((a,l)=>Fa(a.name,t,i)-Fa(l.name,t,i));for(let a of o){let l=a.name===t,d=!l&&a.name===i;n.fillStyle=l?"rgba(215, 25, 50, 0.22)":d?"rgba(214, 162, 75, 0.12)":"rgba(255, 255, 255, 0)",n.strokeStyle=l?"rgba(255, 106, 126, 0.98)":d?"rgba(224, 185, 112, 0.9)":"rgba(238, 226, 210, 0.28)",n.lineWidth=l?2.25:d?1.75:1;for(let[c,u,p,h]of a.zones)(l||d)&&n.fillRect(c*.5,u*.5,p*.5,h*.5),n.strokeRect(c*.5,u*.5,p*.5,h*.5)}return!0}bodySlotAt(e,t){let i=e*2,n=t*2,o,a=Number.POSITIVE_INFINITY;for(let l of this.getBodySlots())for(let[d,c,u,p]of l.zones){if(i<d||i>d+u||n<c||n>c+p)continue;let h=u*p;h<a&&(o=l,a=h)}return o}resolveText(e){if(e.startsWith("Activity"))return this.#e.get(e.slice(8))?.name;let t=[...this.#e.keys()].find(n=>e.endsWith(`-${n}`));if(!t)return;let i=this.#e.get(t);if(i)return e.startsWith("Label-")?i.name:i.template}resolveImage(e){let t=this.#e.get(e);return t?xi(t.image):void 0}run(e,t,i,n){let o=n?.Activity?.Name;if(typeof o!="string")return!1;let a=this.#e.get(o);if(!a||!e||!t||!i||!Number.isSafeInteger(e.MemberNumber)||!Number.isSafeInteger(t.MemberNumber)||!Dn.test(i.Name)||!Ba(a.targetGroup,i.Name))return!1;let l=Gn(a.template,{sourceName:ir(e),targetName:ir(t),targetMemberNumber:t.MemberNumber,pronouns:Ou(t)}).slice(0,1e3);if(!l)return!0;if(typeof ChatRoomPublishCustomAction=="function"){let d=Bt(a.image),c=Pu(a.arousal),u={v:2,source:e.MemberNumber,target:t.MemberNumber,group:i.Name,arousal:a.arousal,nonce:Gu(),...a.arousal>0?{fallbackActivity:d,fallbackCount:c}:{}},p=[{Tag:"SourceCharacter",Text:ir(e),MemberNumber:e.MemberNumber},{Tag:"TargetCharacter",Text:ir(t),MemberNumber:t.MemberNumber},{Tag:"FocusAssetGroup",AssetGroupName:i.Name}];a.arousal>0&&p.push({ActivityName:d,[On]:!0},{ActivityCounter:c,[On]:!0}),p.push({Tag:`MISSING TEXT IN "Interface.csv": ${_n}`,Text:l},{Tag:Ha,Text:JSON.stringify(u)}),ChatRoomPublishCustomAction(_n,!1,p)}else this.adapter.sendRoomEmote(l);return!0}decorateButton(e,t){if(!this.#e.has(t?.Activity?.Name)||e.querySelector("[data-kikilink-activity-mark]"))return;let i=`${Ru(globalThis.innerWidth)}px`,n=document.createElement("img");n.src=_e,n.alt="KikiLink custom activity",n.title="KikiLink custom activity",n.dataset.kikilinkActivityMark="true",Object.assign(n.style,{position:"absolute",top:"0px",left:"0px",width:i,height:i,opacity:"0.96",pointerEvents:"none",filter:"drop-shadow(0 1px 3px rgba(0,0,0,.75))",zIndex:"2"});for(let[o,a]of[["position","absolute"],["top","0px"],["left","0px"],["right","auto"],["bottom","auto"],["width",i],["height",i]])n.style.setProperty(o,a,"important");e.style.position||(e.style.position="relative"),e.append(n)}onRoomMessage(e){if(this.settings&&!this.settings.get().linkActivities.enabled)return;let t=Eu(e);if(!t||t.arousal<=0||t.target!==this.adapter.getOwnMemberNumber()||e.Sender!==t.source||!Da(e.Dictionary,"SourceCharacter",t.source)||!Da(e.Dictionary,"TargetCharacter",t.target)||!Iu(t.group))return;let i=`${t.source}:${t.nonce}`;if(this.#i.includes(i)){Tn(e.Dictionary,t);return}if(typeof ActivityEffectFlat!="function")return;let n=typeof Player=="object"&&Player!==null?Player:void 0;if(!n||n.MemberNumber!==t.target)return;let o=t.source===n.MemberNumber?n:typeof ChatRoomCharacter<"u"&&Array.isArray(ChatRoomCharacter)?ChatRoomCharacter.find(a=>a.MemberNumber===t.source):void 0;if(o){if(this.#u(i),!this.#h(t.source,Date.now())){Tn(e.Dictionary,t);return}ActivityEffectFlat(o,n,t.arousal,t.group,1),Tn(e.Dictionary,t)}}#u(e){this.#i.push(e),this.#i.length>yu&&this.#i.shift()}#h(e,t){let i=this.#r.get(e);if(i&&t>=i.windowStartedAt&&t-i.windowStartedAt<xu)return i.lastSeenAt=t,i.count>=vu?!1:(i.count+=1,!0);if(!i&&this.#r.size>=wu){let n,o=Number.POSITIVE_INFINITY;for(let[a,l]of this.#r)l.lastSeenAt>=o||(n=a,o=l.lastSeenAt);n!==void 0&&this.#r.delete(n)}return this.#r.set(e,{windowStartedAt:t,count:1,lastSeenAt:t}),!0}#m(){let e=Ga();if(!e)return;let t=e.activities!==this.#c||e.ordering!==this.#l;if(t&&(this.#E(),this.#c=e.activities,this.#l=e.ordering,this.#t.clear(),this.#a=void 0),!Fu(e)){yi(e.activities,e.ordering),this.#t.clear();return}if(this.#e.size===0){yi(e.activities,e.ordering),this.#t.clear();return}if(!(!t&&this.#S(e))){yi(e.activities,e.ordering),this.#t.clear();for(let[i,n]of this.#e){let o=rr(i,n);e.activities.push(o),e.ordering.push(i),this.#t.set(i,o)}Uu()}}#y(){if(this.#L(),typeof DialogMenuMode>"u"||DialogMenuMode!=="activities"||typeof DialogActivity>"u"||!Array.isArray(DialogActivity))return;let e;try{e=typeof CharacterGetCurrent=="function"?CharacterGetCurrent():typeof CurrentCharacter<"u"?CurrentCharacter:void 0}catch{return}let t=e?.FocusGroup?.Name;if(!e||typeof t!="string")return;let i=this.extendAllowedActivities(e,t,DialogActivity);if(i!==DialogActivity){DialogActivity.splice(0,DialogActivity.length,...i);try{let n=DialogMenuMapping?.activities?.Reload;if(typeof n=="function"){let o=n.call(DialogMenuMapping.activities,null,{reset:!0,resetDialogItems:!1});o&&typeof o.catch=="function"&&o.catch(()=>{})}}catch{}this.#L()}}#v(){typeof document>"u"||(this.#p||(document.addEventListener("click",this.#d,!0),this.#p=!0),!(this.#s||!document.body||typeof MutationObserver!="function")&&(this.#s=new MutationObserver(()=>{this.#L()}),this.#s.observe(document.body,{childList:!0,subtree:!0}),this.#L()))}#L(){if(!(typeof document>"u"||this.#e.size===0))for(let e of document.querySelectorAll('button.dialog-grid-button[name^="KikiLinkCustom_"]')){let t=e.getAttribute("name")??"",i=this.#e.get(t);if(!i)continue;let n=e.querySelector("img.button-image");n||(n=document.createElement("img"),n.className="button-image",e.prepend(n));let o=xi(i.image);n.getAttribute("src")!==o&&n.setAttribute("src",o),n.alt=i.name;let a=e.querySelector(".button-label");a||(a=document.createElement("span"),a.className="button-label",e.append(a)),a.textContent!==i.name&&(a.textContent=i.name),this.decorateButton(e,{Activity:this.#t.get(t)??rr(t,i),Group:e.dataset.group||i.targetGroup})}}#S(e){let t=e.activities.filter(n=>typeof n?.Name=="string"&&n.Name.startsWith(ct)),i=e.ordering.filter(n=>typeof n=="string"&&n.startsWith(ct));if(t.length!==this.#e.size||i.length!==this.#e.size||this.#t.size!==this.#e.size)return!1;for(let n of this.#e.keys()){let o=this.#t.get(n);if(!o||t.filter(a=>a===o).length!==1||i.filter(a=>a===n).length!==1)return!1}return!0}#C(){this.#E();let e=Ga();e&&(e.activities!==this.#c||e.ordering!==this.#l)&&yi(e.activities,e.ordering),this.#c=void 0,this.#l=void 0}#E(){this.#c&&this.#l&&yi(this.#c,this.#l)}};function Ru(r){return Number.isFinite(r)&&r<=Mu?Nu:Cu}function xi(r){return`./Assets/Female3DCG/Activity/${Bt(r)}.png`}function Bt(r){let e=Su[r]??r;return Ka.has(e)?e:"Caress"}function Gn(r,e){let t=e.pronouns??{subject:"they",object:"them",possessive:"their"},i={"target's gender":t.possessive,"target's":Du(e.targetName),their:t.possessive,they:t.subject,them:t.object,source:e.sourceName,me:e.sourceName,target:e.targetName,member:e.targetMemberNumber?.toString()??"member"};return r.trim().replace(/\{\s*(target's\s+gender|target's|their|they|them|source|me|target|member)\s*\}/giu,(n,o)=>i[o.toLocaleLowerCase().replace(/\s+/gu," ")]??n)}function Lu(r,e){let t={source:e.sourceName,me:e.sourceName,target:e.target.memberName,member:e.target.memberNumber.toString()};return r.trim().replace(/\{\s*(source|me|target|member)\s*\}/giu,(i,n)=>t[n.toLocaleLowerCase()]??i)}function Eu(r){if(r.Type!=="Action"||r.Content!==_n||!Array.isArray(r.Dictionary))return;let e=r.Dictionary.find(t=>vi(t)&&t.Tag===Ha&&typeof t.Text=="string");if(!(!vi(e)||typeof e.Text!="string"||e.Text.length>500))try{let t=JSON.parse(e.Text);return!vi(t)||t.v!==1&&t.v!==2||!nr(t.source)||!nr(t.target)||!Dn.test(typeof t.group=="string"?t.group:"")||typeof t.arousal!="number"||!Number.isInteger(t.arousal)||t.arousal<0||t.arousal>20||typeof t.nonce!="string"||!/^[a-z0-9-]{8,48}$/i.test(t.nonce)||t.v===2&&t.arousal>0&&(typeof t.fallbackActivity!="string"||!Ka.has(t.fallbackActivity)||typeof t.fallbackCount!="number"||!Number.isInteger(t.fallbackCount)||t.fallbackCount<1||t.fallbackCount>4)?void 0:t}catch{return}}function Pu(r){return Math.max(1,Math.min(4,Math.ceil(r/5)))}function Iu(r){return typeof AssetGroup>"u"||!Array.isArray(AssetGroup)?!0:AssetGroup.some(e=>e?.Name===r&&e.Category==="Item")}function Tn(r,e){if(!(!Array.isArray(r)||e.v!==2))for(let t=r.length-1;t>=0;t-=1){let i=r[t];if(!vi(i))continue;let n=i[On]===!0,o=typeof e.fallbackActivity=="string"&&i.ActivityName===e.fallbackActivity,a=typeof e.fallbackCount=="number"&&i.ActivityCounter===e.fallbackCount;(n||o||a)&&r.splice(t,1)}}function Da(r,e,t){return Array.isArray(r)&&r.some(i=>vi(i)&&i.Tag===e&&i.MemberNumber===t)}function Tu(r,e){let t=e.replace(/[^A-Za-z0-9_]/g,"_").slice(0,36)||"Activity";return`${ct}${_u(`${r}/${e}`)}_${t}`}function _u(r){let e=2166136261;for(let t=0;t<r.length;t+=1)e^=r.charCodeAt(t),e=Math.imul(e,16777619);return(e>>>0).toString(36)}function ir(r){if(typeof CharacterNickname=="function")try{let e=CharacterNickname(r).trim();if(e)return e}catch{}return r.Nickname?.trim()||r.Name?.trim()||`Member ${r.MemberNumber}`}function Ou(r){let e=r.GetPronouns?.();return e==="SheHer"?{subject:"she",object:"her",possessive:"her"}:e==="HeHim"?{subject:"he",object:"him",possessive:"his"}:e==="ItIt"?{subject:"it",object:"it",possessive:"its"}:{subject:"they",object:"them",possessive:"their"}}function Du(r){return/s$/i.test(r)?`${r}'`:`${r}'s`}function Gu(){let r=Math.random().toString(36).slice(2,12);return`${Date.now().toString(36)}-${r}`}function Ga(){if(typeof ActivityFemale3DCG<"u"&&Array.isArray(ActivityFemale3DCG)&&typeof ActivityFemale3DCGOrdering<"u"&&Array.isArray(ActivityFemale3DCGOrdering))return{activities:ActivityFemale3DCG,ordering:ActivityFemale3DCGOrdering}}function Ba(r,e){if(r===e)return!0;if(typeof AssetGroup>"u"||!Array.isArray(AssetGroup))return!1;let t=i=>{let n=AssetGroup.find(o=>o?.Name===i);return n?.MirrorActivitiesFrom??n?.Name??i};return t(r)===t(e)}function rr(r,e){return{Name:r,ActivityID:typeof GameVersion=="string"&&GameVersion==="R121"?-1:void 0,MaxProgress:0,MaxProgressSelf:0,Prerequisite:[],Target:e.targetMode==="self"?[]:[e.targetGroup],TargetSelf:e.targetMode==="self"||e.targetMode==="both"?[e.targetGroup]:[]}}function Bu(r){try{let e=r.getOwnMemberNumber();if(nr(e))return e}catch{}return typeof Player=="object"&&Player!==null&&nr(Player.MemberNumber)?Player.MemberNumber:0}function Uu(){if(!(typeof DialogBuildActivities!="function"||typeof CharacterGetCurrent!="function"||typeof DialogMenuMode>"u"||DialogMenuMode!=="activities"))try{let r=CharacterGetCurrent();r&&DialogBuildActivities(r,!0)}catch{}}function Fu(r){let e=new Set(r.activities.map(t=>t?.Name).filter(t=>typeof t=="string"&&!t.startsWith(ct)));return r.ordering.some(t=>typeof t=="string"&&e.has(t))}function yi(r,e){for(let t=r.length-1;t>=0;t-=1){let i=r[t]?.Name;typeof i=="string"&&i.startsWith(ct)&&r.splice(t,1)}for(let t=e.length-1;t>=0;t-=1){let i=e[t];typeof i=="string"&&i.startsWith(ct)&&e.splice(t,1)}}function Ua(){return[{name:"ItemHead",label:"Head",zones:[[170,40,160,150]]},{name:"ItemMouth",label:"Mouth",zones:[[205,115,90,60]]},{name:"ItemNeck",label:"Neck",zones:[[190,190,120,70]]},{name:"ItemBreast",label:"Breasts",zones:[[145,245,210,150]]},{name:"ItemArms",label:"Arms",zones:[[70,245,360,260]]},{name:"ItemHands",label:"Hands",zones:[[70,460,360,150]]},{name:"ItemTorso",label:"Torso",zones:[[145,340,210,180]]},{name:"ItemPelvis",label:"Pelvis",zones:[[145,500,210,130]]},{name:"ItemLegs",label:"Legs",zones:[[130,610,240,250]]},{name:"ItemFeet",label:"Feet",zones:[[115,850,270,130]]}]}function Fa(r,e,t){return r===e?2:r===t?1:0}function Hu(r){return r.replace(/^Item/,"").replace(/([a-z])([A-Z])/g,"$1 $2")}function nr(r){return typeof r=="number"&&Number.isSafeInteger(r)&&r>0}function vi(r){return typeof r=="object"&&r!==null&&!Array.isArray(r)}var $u=[{token:"{me}",label:"Me"},{token:"{target}",label:"Target"},{token:"{target's}",label:"Target's"},{token:"{target's gender}",label:"Their"}],or=class{constructor(e,t,i,n,o,a){this.root=e;this.adapter=t;this.settings=i;this.service=n;this.onChanged=o;this.showToast=a}root;adapter;settings;service;onChanged;showToast;#e;#t;open(e){if(e){this.#a(e);return}this.#e=void 0,this.#i()}refresh(){this.#e||this.#i()}#i(){this.#e=void 0;let e=this.settings.get().linkActivities.customActivities,t=s("button",{className:"kl-text-button kl-text-button--primary kl-custom-activity-create",type:"button",text:"New activity",onClick:()=>this.#a()});e.length>=100&&(t.disabled=!0);let i=this.#o("Custom Activities","Build personal actions that sit beside Bondage Club's vanilla Activities.",t),n=s("div",{className:"kl-custom-activities-body"});if(e.length===0){let o=s("img",{className:"kl-custom-empty-blossom",src:_e,alt:""});n.append(s("section",{className:"kl-custom-activity-empty"},o,s("h2",{text:"Make an activity your own"}),s("p",{text:"Choose a body slot, reuse a vanilla picture, and write the action in your words."}),s("button",{className:"kl-text-button kl-text-button--primary",type:"button",text:"Create first activity",onClick:()=>this.#a()})))}else{let o=s("div",{className:"kl-custom-activity-intro"},s("span",{text:`${e.length} custom ${e.length===1?"activity":"activities"}`}),s("span",{text:"Blossom marks them in the native menu"})),a=s("div",{className:"kl-custom-activity-list"});for(let l of e)a.append(this.#r(l));n.append(o,a)}this.root.replaceChildren(i,n)}#r(e){let t=s("img",{className:"kl-custom-activity-vanilla-icon",src:xi(e.image),alt:""});t.loading="lazy",t.decoding="async";let i=s("div",{className:"kl-custom-activity-card-icon"},t,s("img",{className:"kl-custom-activity-blossom",src:_e,alt:"KikiLink"})),n=e.arousal>0?` \xB7 Arousal +${e.arousal}`:"",o=s("button",{className:"kl-custom-activity-card",type:"button",ariaLabel:`Edit ${e.name}`,onClick:()=>this.#a(e.id)},i,s("div",{className:"kl-custom-activity-card-copy"},s("div",{className:"kl-custom-activity-card-name",text:e.name}),s("div",{className:"kl-custom-activity-card-meta",text:`${this.#p(e.targetGroup)}${n}`}),s("div",{className:"kl-custom-activity-card-template",text:e.template})),s("span",{className:"kl-custom-activity-edit-label",text:"Edit"}));return o.dataset.activityId=e.id,o}#a(e){let t=e?this.settings.get().linkActivities.customActivities.find(l=>l.id===e):void 0;if(e&&!t){this.#i();return}if(!t&&this.settings.get().linkActivities.customActivities.length>=100){this.showToast(`You can keep up to ${100} custom activities.`,"error");return}let i=structuredClone(t??pa(An()));i.image=Bt(i.image),this.#e=i.id,this.#t=void 0;let n=s("button",{className:"kl-text-button kl-custom-activity-back",type:"button",text:"Back",onClick:()=>this.#i()}),o=this.#o(t?"Edit activity":"New custom activity","Pick where it appears, then give it a clear name and action.",n),a=this.#c(i,t!==void 0);this.root.replaceChildren(o,a),requestAnimationFrame(()=>{a.querySelector('[data-field="name"]')?.focus(),this.#l(a,i.targetGroup)})}#c(e,t){let i=this.service.getBodySlots();!i.some(L=>L.name===e.targetGroup)&&i[0]&&(e.targetGroup=i[0].name);let n=s("canvas",{className:"kl-custom-character-canvas",ariaLabel:"Your character body slots",tabIndex:-1}),o=s("div",{className:"kl-custom-character-fallback",text:"Your character appears here in Bondage Club."}),a=s("select",{className:"kl-select kl-custom-slot-select",ariaLabel:"Body slot"});a.hidden=!0,a.tabIndex=-1,a.setAttribute("aria-hidden","true");for(let L of i){let O=document.createElement("option");O.value=L.name,O.textContent=L.label,a.append(O)}a.value=e.targetGroup;let l=new Map(i.map(L=>[L.name,L])),d=new Map,c=s("span",{className:"kl-custom-slot-current",text:l.get(e.targetGroup)?.label??e.targetGroup}),u=s("span",{className:"kl-custom-slot-action",text:"Show all"}),p=s("summary",{className:"kl-custom-slot-summary"},c,u),h=s("div",{className:"kl-custom-slot-grid",ariaLabel:"Body slots"});h.setAttribute("role","radiogroup");let m=s("details",{className:"kl-custom-slot-picker"},p,h),f=!1,y=()=>{},g=L=>{let O=l.get(L)?.label??L;c.textContent=O,p.setAttribute("aria-label",`Selected body slot: ${O}. ${m.open?"Hide":"Show all"} body slots`)},x=(L,O=!1)=>{if(l.has(L)){e.targetGroup=L,a.value=L;for(let[U,de]of d){let st=U===L;de.dataset.selected=String(st),de.setAttribute("aria-checked",String(st))}g(L),O&&m.open&&(m.open=!1,u.textContent="Show all"),y()}},b=()=>{if(f)return;f=!0;let L=document.createDocumentFragment();for(let O of i){let U=s("button",{className:"kl-custom-slot-choice",type:"button",text:O.label,title:O.label,ariaLabel:`Use ${O.label} body slot`,onClick:()=>x(O.name,!0)});U.dataset.slot=O.name,U.dataset.selected=String(O.name===e.targetGroup),U.setAttribute("role","radio"),U.setAttribute("aria-checked",String(O.name===e.targetGroup)),d.set(O.name,U),L.append(U)}h.append(L)};g(e.targetGroup),m.addEventListener("toggle",()=>{u.textContent=m.open?"Hide":"Show all",g(e.targetGroup),m.open&&b()}),a.addEventListener("change",()=>x(a.value));let N=s("input",{className:"kl-search kl-custom-activity-name",ariaLabel:"Activity name"});N.dataset.field="name",N.placeholder="e.g. Gentle elbow touch",N.maxLength=40,N.value=e.name;let k=s("textarea",{className:"kl-custom-activity-template",ariaLabel:"Activity text"});k.placeholder="{me} touches {target's} arm and {target's gender} elbow.",k.maxLength=500,k.value=e.template;let C=s("div",{className:"kl-custom-token-row",ariaLabel:"Insert a variable"});for(let L of $u)C.append(s("button",{className:"kl-custom-token",type:"button",text:L.label,title:L.token,onClick:()=>{k.setRangeText(L.token,k.selectionStart,k.selectionEnd,"end"),k.focus(),G()}}));let I=s("div",{className:"kl-custom-activity-live-preview"}),G=()=>{I.textContent=Gn(k.value,{sourceName:this.adapter.getOwnName(),targetName:"Alex"})||"Your activity preview appears here."};k.addEventListener("input",G),G();let T=s("input",{className:"kl-search kl-custom-image-search",ariaLabel:"Search vanilla activity pictures"});T.type="search",T.placeholder="Search vanilla pictures";let D=s("div",{className:"kl-custom-image-gallery",ariaLabel:"Vanilla activity pictures"}),_=new Map,M=s("div",{className:"kl-contact-empty",text:"No vanilla pictures match."});M.hidden=!0;let B=document.createDocumentFragment(),z=L=>{let O=Bt(L);if(O===e.image)return;let U=_.get(e.image);U?.setAttribute("aria-pressed","false"),U&&(U.dataset.selected="false"),e.image=O;let de=_.get(O);de?.setAttribute("aria-pressed","true"),de&&(de.dataset.selected="true")};for(let L of this.service.getVanillaImages()){let O=s("img",{src:xi(L),alt:""});O.loading="lazy",O.decoding="async";let U=s("button",{className:"kl-custom-image-choice",type:"button",title:L,ariaLabel:`Use ${L} picture`,onClick:()=>z(L)},O,s("span",{text:Ku(L)}));U.dataset.search=L.toLocaleLowerCase(),U.dataset.selected=String(L===e.image),U.setAttribute("aria-pressed",String(L===e.image)),_.set(L,U),B.append(U)}D.append(B,M);let Y=()=>{let L=T.value.trim().toLocaleLowerCase(),O=0;for(let U of _.values()){let de=!L||U.dataset.search?.includes(L)===!0;U.hidden=!de,de&&(O+=1)}M.hidden=O!==0},J;T.addEventListener("input",()=>{J===void 0&&(J=requestAnimationFrame(()=>{J=void 0,D.isConnected&&Y()}))});let j=s("input");j.type="checkbox",j.checked=e.arousal>0,j.setAttribute("aria-label","Trigger arousal");let Q=s("input",{className:"kl-custom-arousal-range",ariaLabel:"Arousal amount"});Q.type="range",Q.min="1",Q.max="20",Q.step="1",Q.value=String(Math.max(1,e.arousal||5));let St=s("output",{className:"kl-custom-arousal-value",text:`+${Q.value}`}),nt=s("div",{className:"kl-custom-arousal-options"},Q,St);nt.hidden=!j.checked,j.addEventListener("change",()=>{nt.hidden=!j.checked}),Q.addEventListener("input",()=>{St.textContent=`+${Q.value}`});let ce=s("label",{className:"kl-switch"},j,s("span",{className:"kl-switch-track"})),$e=s("select",{className:"kl-select kl-custom-target-mode",ariaLabel:"Who can be targeted"});$e.append(Un("other","Other characters"),Un("self","My character"),Un("both","Others and myself")),$e.value=e.targetMode;let ot=s("details",{className:"kl-custom-activity-advanced"},s("summary",{text:"Advanced"}),this.#s("Who can be targeted","Choose whether this action can appear on others, yourself, or both.",$e)),at=s("section",{className:"kl-custom-activity-form"},this.#s("Activity name","Short and recognizable in the native menu.",N),this.#s("Action text","Tap a variable to insert it. Everyone in the room sees only the finished sentence.",k,C),s("div",{className:"kl-custom-preview-wrap"},s("div",{className:"kl-custom-field-label",text:"Preview"}),I),this.#s("Vanilla picture","This is the picture shown beside normal Bondage Club activities.",T,D),s("div",{className:"kl-custom-arousal-row"},s("div",{className:"kl-custom-arousal-copy"},s("div",{className:"kl-custom-field-label",text:"Trigger arousal"}),s("div",{className:"kl-custom-field-help",text:"Off by default. Bondage Club applies this base amount using the recipient's preferences."})),ce,nt),ot),ie=s("div",{className:"kl-custom-character-stage",ariaLabel:"Scrollable character body map. Scroll for lower slots or use Show all for keyboard selection.",tabIndex:0},n,o);ie.setAttribute("role","region");let Rt=s("aside",{className:"kl-custom-character-pane"},s("div",{className:"kl-custom-field-label",text:"Body slot"}),s("div",{className:"kl-custom-field-help",text:"Tap your character or open the compact picker to change it."}),m,ie,a,s("div",{className:"kl-custom-slot-note",text:"The activity will appear next to vanilla actions on this slot."})),oi,ai=()=>{oi===void 0&&(oi=requestAnimationFrame(()=>{if(oi=void 0,!n.isConnected)return;let L=this.service.drawPlayer(n,e.targetGroup,this.#t);o.hidden=L}))};y=ai,n.addEventListener("pointermove",L=>{if(L.pointerType&&L.pointerType!=="mouse")return;let O=za(n,L),U=this.service.bodySlotAt(O.x,O.y)?.name;U!==this.#t&&(this.#t=U,ai())}),n.addEventListener("pointerleave",()=>{this.#t!==void 0&&(this.#t=void 0,ai())}),n.addEventListener("click",L=>{let O=za(n,L),U=this.service.bodySlotAt(O.x,O.y);U&&x(U.name)});let un=s("button",{className:"kl-text-button kl-text-button--primary kl-custom-activity-save",type:"button",text:"Save activity",onClick:()=>{let L=N.value.trim(),O=k.value.trim();if(!L||!O||!a.value){this.showToast("Add a name, action text, and body slot before saving.","error");return}let U={id:e.id,name:L,targetGroup:a.value,targetMode:$e.value,template:O,image:Bt(e.image),arousal:j.checked?Number(Q.value):0};this.settings.update(de=>{let st=de.linkActivities.customActivities.findIndex(mn=>mn.id===U.id);st>=0?de.linkActivities.customActivities[st]=U:de.linkActivities.customActivities.push(U)}),this.service.syncFromSettings(),this.onChanged(),this.showToast(t?`${U.name} updated.`:`${U.name} added beside vanilla activities.`),this.#i()}}),pn=s("button",{className:"kl-text-button kl-custom-activity-cancel",type:"button",text:"Cancel",onClick:()=>this.#i()}),si=[];t&&si.push(s("button",{className:"kl-text-button kl-text-button--danger kl-custom-activity-delete",type:"button",text:"Delete",onClick:()=>{window.confirm(`Delete ${e.name}?`)&&(this.settings.update(L=>{L.linkActivities.customActivities=L.linkActivities.customActivities.filter(O=>O.id!==e.id)}),this.service.syncFromSettings(),this.onChanged(),this.showToast(`${e.name} deleted.`),this.#i())}})),si.push(s("span",{className:"kl-custom-editor-spacer"}),pn,un);let hn=s("footer",{className:"kl-feature-page-footer kl-custom-activity-footer"},...si);return s("div",{className:"kl-custom-activity-editor"},s("div",{className:"kl-custom-editor-body"},Rt,at),hn)}#l(e,t){let i=e.querySelector(".kl-custom-character-canvas"),n=e.querySelector(".kl-custom-character-fallback");if(!i)return;let o=this.service.drawPlayer(i,t);n&&(n.hidden=o)}#o(e,t,i){return s("header",{className:"kl-feature-page-header kl-custom-activity-header"},s("div",{className:"kl-feature-page-heading"},s("div",{className:"kl-feature-page-eyebrow",text:"BLOSSOM STUDIO"}),s("h1",{className:"kl-feature-page-title",text:e}),s("p",{className:"kl-feature-page-subtitle",text:t})),i)}#s(e,t,i,n){return s("div",{className:"kl-custom-field"},s("span",{className:"kl-custom-field-label",text:e}),s("span",{className:"kl-custom-field-help",text:t}),i,n)}#p(e){return this.service.getBodySlots().find(t=>t.name===e)?.label??e.replace(/^Item/,"")}};function za(r,e){let t=r.getBoundingClientRect(),i=t.width||r.width||250,n=t.height||r.height||500;return{x:(e.clientX-t.left)/i*r.width,y:(e.clientY-t.top)/n*r.height}}function Un(r,e){let t=document.createElement("option");return t.value=r,t.textContent=e,t}function Ku(r){return r.replace(/([a-z])([A-Z])/g,"$1 $2")}var Ut=class{constructor(e,t,i){this.adapter=e;this.repository=t;this.settings=i}adapter;repository;settings;#e=new Map;#t="";#i=0;sync(e=Date.now()){if(!this.adapter.isInChatRoom()){let p=[...this.#e.keys()];return this.#e.clear(),this.#t="",{changed:p.length>0,presentCount:0,joined:[],left:p}}let t=this.adapter.getCurrentRoomName()??"Unnamed room",i=t!==this.#t;i&&this.#e.clear(),this.#t=t;let n=this.adapter.getRoomCharacters(),o=new Set(n.map(p=>p.memberNumber)),a=n.filter(p=>!this.#e.has(p.memberNumber)).map(p=>p.memberNumber),l=[...this.#e.keys()].filter(p=>!o.has(p)),d=e-this.#i>=3e5,c=this.settings.get().linkRoster.trackEncounters,u=[];if(c){for(let p of n){let h=this.repository.get(p.memberNumber),m=!this.#e.has(p.memberNumber),f=h?.displayName!==p.memberName;(!h||m||f||d)&&u.push(zu(h,p,t,e,m))}for(let p of l){let h=this.repository.get(p),m=this.#e.get(p);h&&m&&u.push({...h,displayName:m.memberName,lastSeenAt:e})}u.length>0&&this.repository.putMany(u)}this.#e.clear();for(let p of n)this.#e.set(p.memberNumber,p);return d&&(this.#i=e),d&&this.prune(e),{changed:i||a.length>0||l.length>0,presentCount:n.length,joined:a,left:l}}observePerson(e,t,i=Date.now()){if(!Number.isSafeInteger(e)||e<0)return;let n=this.repository.get(e);this.repository.put({...n??ar(e,t),displayName:t.trim()||n?.displayName||`Member ${e}`,firstSeenAt:n?.firstSeenAt||i,lastSeenAt:Math.max(n?.lastSeenAt??0,i)})}list(e,t=""){let i=t.trim().toLocaleLowerCase(),n=new Map(this.repository.list().map(l=>[l.memberNumber,l])),o=new Map(this.adapter.getRoomCharacters().map(l=>[l.memberNumber,l]));return(e==="current"?[...o.keys()]:[...new Set([...n.keys(),...o.keys()])]).map(l=>{let d=o.get(l),c=n.get(l)??ar(l,d?.memberName??`Member ${l}`);return{...c,displayName:d?.memberName??c.displayName,present:d!==void 0,isFriend:d?.isFriend===!0||typeof this.adapter.isKnownFriend=="function"&&this.adapter.isKnownFriend(l),relationships:typeof this.adapter.getPlayerRelationships=="function"?this.adapter.getPlayerRelationships(l):[]}}).filter(l=>e!=="favorites"||l.favorite).filter(l=>!i||l.displayName.toLocaleLowerCase().includes(i)||l.memberNumber.toString().includes(i)||l.note.toLocaleLowerCase().includes(i)||l.tags.some(d=>d.toLocaleLowerCase().includes(i))||l.relationships.some(d=>d.includes(i))).sort(ju)}get(e,t){return this.repository.get(e)??ar(e,t?.trim()||`Member ${e}`)}saveNotebook(e,t,i,n){let o=this.get(e,t);return this.repository.put({...o,displayName:t.trim()||o.displayName,note:i.trim().slice(0,2e3),tags:n})}toggleFavorite(e,t){let i=this.get(e,t);return this.repository.put({...i,displayName:t.trim()||i.displayName,favorite:!i.favorite})}notebookCount(){return this.repository.count()}exportNotebook(e=Date.now()){return this.repository.exportBackup(e)}importNotebook(e){return this.repository.importBackup(e)}prune(e=Date.now()){return this.repository.pruneEncounterHistory(this.settings.get().linkRoster.retentionDays,e)}clear(){this.repository.clear()}};function zu(r,e,t,i,n){let o=r??ar(e.memberNumber,e.memberName);return{...o,displayName:e.memberName,firstSeenAt:o.firstSeenAt||i,lastSeenAt:i,lastRoomName:t,encounterCount:o.encounterCount+(n?1:0)}}function ar(r,e){return{memberNumber:r,displayName:e,favorite:!1,note:"",tags:[],firstSeenAt:0,lastSeenAt:0,lastRoomName:"",encounterCount:0}}function ju(r,e){return r.present!==e.present?r.present?-1:1:r.favorite!==e.favorite?r.favorite?-1:1:r.isFriend!==e.isFriend?r.isFriend?-1:1:r.lastSeenAt!==e.lastSeenAt?e.lastSeenAt-r.lastSeenAt:r.displayName.localeCompare(e.displayName)}var Oe="kikilink:people:v1",ut=2e3,Va="kikilink-player-notebook",qa=1,Ft=class{constructor(e=Yu()){this.storage=e;this.#t()}storage;#e=new Map;get(e){let t=this.#e.get(e);return t?structuredClone(t):void 0}list(){return[...this.#e.values()].map(e=>structuredClone(e)).sort((e,t)=>t.lastSeenAt-e.lastSeenAt)}count(){return this.#e.size}put(e){let t=sr(e);if(!t)throw new Error("Invalid player record");return this.#e.set(t.memberNumber,t),this.#r(),this.#i(),structuredClone(t)}putMany(e){for(let t of e){let i=sr(t);i&&this.#e.set(i.memberNumber,i)}this.#r(),this.#i()}exportBackup(e=Date.now()){return{format:Va,version:qa,exportedAt:e,records:this.list()}}importBackup(e){let t=Vu(e),i=new Map,n=Math.max(0,t.records.length-ut);for(let o of t.records.slice(0,ut)){let a=sr(o);if(!a){n+=1;continue}i.set(a.memberNumber,a)}for(let o of i.values()){let a=this.#e.get(o.memberNumber);this.#e.set(o.memberNumber,a?qu(a,o):o)}return this.#r(),this.#i(),{imported:i.size,skipped:n,total:this.#e.size}}pruneEncounterHistory(e,t=Date.now()){if(!Number.isInteger(e)||e<=0)return 0;let i=t-e*24*60*60*1e3,n=0;for(let o of this.#e.values())o.favorite||o.note.length>0||o.tags.length>0||o.lastSeenAt<=0||o.lastSeenAt>=i||(this.#e.delete(o.memberNumber),n+=1);return n>0&&this.#i(),n}clear(){this.#e.clear();try{this.storage.removeItem(Oe)}catch{}}#t(){let e=null;try{e=this.storage.getItem(Oe)}catch{return}if(e)try{let t=JSON.parse(e);if(!Array.isArray(t))return;for(let n of t.slice(0,ut)){let o=sr(n);o&&this.#e.set(o.memberNumber,o)}this.#r(),JSON.stringify(this.list())!==e&&this.#i()}catch{}}#i(){try{this.storage.setItem(Oe,JSON.stringify(this.list()))}catch{}}#r(){if(this.#e.size<=ut)return;let e=[...this.#e.values()].filter(i=>!i.favorite&&!i.note&&i.tags.length===0).sort((i,n)=>i.lastSeenAt-n.lastSeenAt);for(let i of e){if(this.#e.size<=ut)break;this.#e.delete(i.memberNumber)}if(this.#e.size<=ut)return;let t=[...this.#e.values()].sort((i,n)=>i.lastSeenAt-n.lastSeenAt);for(let i of t){if(this.#e.size<=ut)break;this.#e.delete(i.memberNumber)}}};function sr(r){if(!Wa(r)||!Ju(r.memberNumber))return;let e=Date.now(),t=ja(r.lastSeenAt)?r.lastSeenAt:0,i=ja(r.firstSeenAt)?Math.min(r.firstSeenAt,t||e):t,n=lr(r.displayName,80)||`Member ${r.memberNumber}`,o=lr(r.note,2e3),a=lr(r.lastRoomName,100),l=typeof r.encounterCount=="number"&&Number.isInteger(r.encounterCount)&&r.encounterCount>=0?Math.min(r.encounterCount,1e6):0,d=[];if(Array.isArray(r.tags)){let c=new Set;for(let u of r.tags.slice(0,16)){let p=lr(u,24),h=p.toLocaleLowerCase();if(!(!p||c.has(h))&&(c.add(h),d.push(p),d.length>=8))break}}return{memberNumber:r.memberNumber,displayName:n,favorite:r.favorite===!0,note:o,tags:d,firstSeenAt:i,lastSeenAt:t,lastRoomName:a,encounterCount:l}}function Vu(r){let e=r;if(typeof r=="string")try{e=JSON.parse(r)}catch{throw new Error("This file is not valid JSON.")}if(!Wa(e)||e.format!==Va||e.version!==qa||!Array.isArray(e.records))throw new Error("This is not a KikiLink player notebook backup.");return{records:e.records}}function qu(r,e){let t=e.lastSeenAt>r.lastSeenAt;return{memberNumber:r.memberNumber,displayName:t?e.displayName:r.displayName,favorite:r.favorite||e.favorite,note:r.note||e.note,tags:Wu(r.tags,e.tags),firstSeenAt:Xu(r.firstSeenAt,e.firstSeenAt),lastSeenAt:Math.max(r.lastSeenAt,e.lastSeenAt),lastRoomName:(t?e.lastRoomName:r.lastRoomName)||r.lastRoomName||e.lastRoomName,encounterCount:Math.max(r.encounterCount,e.encounterCount)}}function Wu(r,e){let t=[],i=new Set;for(let n of[...r,...e]){let o=n.toLocaleLowerCase();if(!i.has(o)&&(i.add(o),t.push(n),t.length>=8))break}return t}function Xu(r,e){return r<=0?e:e<=0?r:Math.min(r,e)}function Yu(){try{if(typeof localStorage<"u")return localStorage.getItem("kikilink:people-storage-probe"),localStorage}catch{}return new be}function Wa(r){return typeof r=="object"&&r!==null&&!Array.isArray(r)}function Ju(r){return typeof r=="number"&&Number.isSafeInteger(r)&&r>=0}function ja(r){return typeof r=="number"&&Number.isFinite(r)&&r>=0}function lr(r,e){return typeof r=="string"?r.trim().slice(0,e):""}var De="sounds";var dr=class{constructor(e){this.memberNumber=e}memberNumber;#e=new Map;#t;#i=!1;async list(){let e=await this.#r().catch(()=>{});if(!e)return Qa([...this.#e.values()]);let t=await Fn(e.transaction(De,"readonly").objectStore(De).getAll());return Qa(t)}async get(e){if(!Za(e))return;let t=await this.#r().catch(()=>{});return t?await Fn(t.transaction(De,"readonly").objectStore(De).get(e)):this.#e.get(e)}async add(e){Qu(e);let t=await Zu(e);if(t>5e3)throw new Error("Notification sounds can be at most 5 seconds long");let i={id:ip(),name:rp(e.name),mimeType:e.type,durationMs:t,createdAt:Date.now(),blob:e.slice(0,e.size,e.type)},n=await this.#r().catch(()=>{});if(!n)return Xa(this.#e.size,Ja(this.#e.values()),i.blob.size),this.#e.set(i.id,i),i;let o=n.transaction(De,"readwrite"),a=o.objectStore(De),l=await Fn(a.getAll());return Xa(l.length,Ja(l),i.blob.size),a.put(i),await Ya(o),i}async delete(e){if(!Za(e))return;this.#e.delete(e);let t=await this.#r().catch(()=>{});if(!t)return;let i=t.transaction(De,"readwrite");i.objectStore(De).delete(e),await Ya(i)}close(){this.#t?.then(e=>e.close()).catch(()=>{}),this.#t=void 0}#r(){return this.#i||typeof indexedDB>"u"?(this.#i=!0,Promise.reject(new Error("IndexedDB is unavailable"))):(this.#t??=tp(ep(this.memberNumber)).catch(e=>{throw this.#i=!0,this.#t=void 0,e}),this.#t)}};function Qu(r){if(!(r instanceof Blob)||r.size<=0)throw new Error("Choose a non-empty audio file");if(r.size>10485760)throw new Error("Notification sounds must be smaller than 10 MB");let e=r.type.toLocaleLowerCase().startsWith("audio/"),t=/\.(?:aac|flac|m4a|mp3|oga|ogg|opus|wav|webm)$/iu.test(r.name);if(!e&&!t)throw new Error("Choose an audio file supported by your browser")}function Xa(r,e,t){if(r>=24)throw new Error("This device can hold up to 24 custom sounds");if(e+t>41943040)throw new Error("Custom sounds can use up to 40 MB on this device")}function Zu(r){return typeof Audio!="function"||typeof URL.createObjectURL!="function"?Promise.reject(new Error("This browser cannot inspect local audio files")):new Promise((e,t)=>{let i=new Audio,n=URL.createObjectURL(r),o=setTimeout(()=>a(void 0,"The audio file took too long to read"),12e3),a=(c,u)=>{clearTimeout(o),i.removeEventListener("loadedmetadata",l),i.removeEventListener("error",d),i.removeAttribute("src"),URL.revokeObjectURL(n),c!==void 0?e(c):t(new Error(u??"The audio file could not be read"))},l=()=>{let c=Math.round(i.duration*1e3);if(!Number.isFinite(c)||c<=0){a(void 0,"The audio file has no readable duration");return}a(c)},d=()=>a(void 0,"This audio format is not supported by your browser");i.addEventListener("loadedmetadata",l,{once:!0}),i.addEventListener("error",d,{once:!0}),i.preload="metadata",i.src=n,i.load()})}function ep(r){return`kikilink-device-sounds-${Number.isSafeInteger(r)&&r>0?r:"guest"}`}function tp(r){return new Promise((e,t)=>{let i=indexedDB.open(r,1);i.onupgradeneeded=()=>{let n=i.result;n.objectStoreNames.contains(De)||n.createObjectStore(De,{keyPath:"id"})},i.onsuccess=()=>e(i.result),i.onerror=()=>t(i.error??new Error("Unable to open local sound storage")),i.onblocked=()=>t(new Error("Local sound storage is blocked by another tab"))})}function Fn(r){return new Promise((e,t)=>{r.onsuccess=()=>e(r.result),r.onerror=()=>t(r.error??new Error("Local sound storage request failed"))})}function Ya(r){return new Promise((e,t)=>{r.oncomplete=()=>e(),r.onerror=()=>t(r.error??new Error("Local sound storage failed")),r.onabort=()=>t(r.error??new Error("Local sound storage was cancelled"))})}function Ja(r){let e=0;for(let t of r)t.blob instanceof Blob&&(e+=t.blob.size);return e}function Qa(r){return r.sort((e,t)=>t.createdAt-e.createdAt||e.name.localeCompare(t.name))}function ip(){return(typeof crypto=="object"&&typeof crypto.randomUUID=="function"?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`).toLocaleLowerCase().replace(/[^a-z0-9_-]/gu,"").slice(0,64)}function Za(r){return/^[a-z0-9_-]{1,64}$/iu.test(r)}function rp(r){return(r.replace(/\.[^.]+$/u,"").replace(/[\u0000-\u001f\u007f]/gu,"").trim()||"Custom sound").slice(0,60)}var ke="tracks",cr=class{constructor(e){this.memberNumber=e}memberNumber;#e=new Map;#t=new Set;#i;#r=!1;async list(){let e=await this.#a().catch(()=>{});return(e?await Hn(e.transaction(ke,"readonly").objectStore(ke).getAll()):[...this.#e.values()]).sort((i,n)=>n.createdAt-i.createdAt)}async get(e){if(!$n(e))return;let t=await this.#a().catch(()=>{});return t?await Hn(t.transaction(ke,"readonly").objectStore(ke).get(e)):this.#e.get(e)}async add(e){np(e);let t=cp(e),i={id:lp(),name:dp(e.name),mimeType:e.type||"application/octet-stream",...t?{roomExtension:t}:{},createdAt:Date.now(),blob:e.slice(0,e.size,e.type)};this.#t.add(i.id);try{let n=await this.#a().catch(()=>{});if(!n)return es(this.#e.size,is(this.#e.values()),i.blob.size),this.#e.set(i.id,i),i;let o=n.transaction(ke,"readwrite"),a=o.objectStore(ke),l=await Hn(a.getAll());return es(l.length,is(l),i.blob.size),a.put(i),await ts(o),i}catch(n){throw this.#t.delete(i.id),n}}async delete(e){if(!$n(e))return;this.#t.delete(e),this.#e.delete(e);let t=await this.#a().catch(()=>{});if(!t)return;let i=t.transaction(ke,"readwrite");i.objectStore(ke).delete(e),await ts(i)}async reconcile(e,t=new Set){let i=new Set([...e,...t,...this.#t].filter(o=>$n(o))),n=await this.#a().catch(()=>{});if(!n){let o=[];for(let a of this.#e.keys())i.has(a)||(this.#e.delete(a),o.push(a));return o}return await sp(n,i)}releaseStaged(e){for(let t of e)this.#t.delete(t)}close(){this.#t.clear(),this.#i?.then(e=>e.close()).catch(()=>{}),this.#i=void 0}#a(){return this.#r||typeof indexedDB>"u"?(this.#r=!0,Promise.reject(new Error("IndexedDB is unavailable"))):(this.#i??=ap(op(this.memberNumber)).catch(e=>{throw this.#r=!0,this.#i=void 0,e}),this.#i)}};function np(r){if(!(r instanceof Blob)||r.size<=0)throw new Error("Choose a non-empty audio file");if(r.size>83886080)throw new Error("Local tracks must be smaller than 80 MB");let e=r.type.toLocaleLowerCase().startsWith("audio/")||r.type==="video/mp4",t=/\.(?:aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/iu.test(r.name);if(!e&&!t)throw new Error("Choose an audio file supported by your browser")}function es(r,e,t){if(r>=100)throw new Error("This device can hold up to 100 local tracks");if(e+t>536870912)throw new Error("Local tracks can use up to 512 MB on this device")}function op(r){return`kikilink-device-music-${Number.isSafeInteger(r)&&r>0?r:"guest"}`}function ap(r){return new Promise((e,t)=>{let i=indexedDB.open(r,1);i.onupgradeneeded=()=>{i.result.objectStoreNames.contains(ke)||i.result.createObjectStore(ke,{keyPath:"id"})},i.onsuccess=()=>e(i.result),i.onerror=()=>t(i.error??new Error("Unable to open local music storage")),i.onblocked=()=>t(new Error("Local music storage is blocked by another tab"))})}function Hn(r){return new Promise((e,t)=>{r.onsuccess=()=>e(r.result),r.onerror=()=>t(r.error??new Error("Local music storage request failed"))})}function ts(r){return new Promise((e,t)=>{r.oncomplete=()=>e(),r.onerror=()=>t(r.error??new Error("Local music storage failed")),r.onabort=()=>t(r.error??new Error("Local music storage was cancelled"))})}function sp(r,e){return new Promise((t,i)=>{let n=r.transaction(ke,"readwrite"),o=n.objectStore(ke),a=o.getAllKeys(),l=[];a.onsuccess=()=>{for(let d of a.result){let c=typeof d=="string"?d:"";c&&e.has(c)||(o.delete(d),c&&l.push(c))}},a.onerror=()=>i(a.error??new Error("Local music storage request failed")),n.oncomplete=()=>t(l),n.onerror=()=>i(n.error??new Error("Local music storage failed")),n.onabort=()=>i(n.error??new Error("Local music storage was cancelled"))})}function is(r){let e=0;for(let t of r)t.blob instanceof Blob&&(e+=t.blob.size);return e}function lp(){return(typeof crypto=="object"&&typeof crypto.randomUUID=="function"?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`).toLocaleLowerCase().replace(/[^a-z0-9_-]/gu,"").slice(0,64)}function $n(r){return/^[a-z0-9_-]{1,64}$/iu.test(r)}function dp(r){return(r.replace(/\.[^.]+$/u,"").replace(/[\u0000-\u001f\u007f]/gu," ").trim()||"Local track").slice(0,80)}function cp(r){let e=r.name.toLocaleLowerCase().match(/\.(mp3|mp4)$/u)?.[1];if(e==="mp3"||e==="mp4")return e;let t=r.type.toLocaleLowerCase().split(";",1)[0];if(t==="audio/mpeg")return"mp3";if(t==="audio/mp4"||t==="video/mp4")return"mp4"}var ye="images",ur=class{constructor(e){this.memberNumber=e}memberNumber;#e;#t;async list(){let e=await this.#i();return(await Kn(e.transaction(ye,"readonly").objectStore(ye).getAll())).sort((i,n)=>n.createdAt-i.createdAt)}async get(e){if(!ns(e))return;let t=await this.#i();return await Kn(t.transaction(ye,"readonly").objectStore(ye).get(e))}async add(e){up(e),this.#t??=pp(),await this.#t;let t=await this.#i();if(await Kn(t.transaction(ye,"readonly").objectStore(ye).count())>=80)throw new Error("Your device Gallery can hold up to 80 images");let n={id:gp(),name:"KikiLink image",mimeType:"image/webp",width:e.width,height:e.height,createdAt:Date.now(),blob:e.blob.slice(0,e.blob.size,"image/webp")},o=t.transaction(ye,"readwrite");return o.objectStore(ye).put(n),await rs(o),n}async delete(e){if(!ns(e))return;let i=(await this.#i()).transaction(ye,"readwrite");i.objectStore(ye).delete(e),await rs(i)}close(){this.#e?.then(e=>e.close()).catch(()=>{}),this.#e=void 0}#i(){return typeof indexedDB>"u"?Promise.reject(new Error("Permanent Gallery storage is unavailable in this browser")):(this.#e??=mp(hp(this.memberNumber)).catch(e=>{throw this.#e=void 0,e}),this.#e)}};function up(r){if(!(r.blob instanceof Blob)||r.blob.type!=="image/webp")throw new Error("Only privacy-prepared WebP images can be stored in Gallery");if(r.blob.size<=0||r.blob.size>8388608)throw new Error("The prepared Gallery image must be smaller than 8 MB");if(!Number.isSafeInteger(r.width)||r.width<=0||!Number.isSafeInteger(r.height)||r.height<=0)throw new Error("The prepared Gallery image has invalid dimensions")}async function pp(){try{let r=navigator.storage;return r?typeof r.persisted=="function"&&await r.persisted()?!0:typeof r.persist=="function"?await r.persist():!1:!1}catch{return!1}}function hp(r){return`kikilink-device-gallery-${Number.isSafeInteger(r)&&r>0?r:"guest"}`}function mp(r){return new Promise((e,t)=>{let i=indexedDB.open(r,1);i.onupgradeneeded=()=>{i.result.objectStoreNames.contains(ye)||i.result.createObjectStore(ye,{keyPath:"id"})},i.onsuccess=()=>e(i.result),i.onerror=()=>t(i.error??new Error("Unable to open permanent Gallery storage")),i.onblocked=()=>t(new Error("Gallery storage is blocked by another tab"))})}function Kn(r){return new Promise((e,t)=>{r.onsuccess=()=>e(r.result),r.onerror=()=>t(r.error??new Error("Gallery storage request failed"))})}function rs(r){return new Promise((e,t)=>{r.oncomplete=()=>e(),r.onerror=()=>t(r.error??new Error("Gallery storage failed")),r.onabort=()=>t(r.error??new Error("Gallery storage was cancelled"))})}function gp(){return(typeof crypto=="object"&&typeof crypto.randomUUID=="function"?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`).toLocaleLowerCase().replace(/[^a-z0-9_-]/gu,"").slice(0,64)}function ns(r){return/^[a-z0-9_-]{1,64}$/iu.test(r)}var fp=3e4,bp=2*6e4,kp=15e3,ne=5*6e4,yp=9e4,vp=2e4,zn=15*6e4,xp=2e3,os=140,wp=60,Ap=500,as=500,ss=1e4,Np=8,Cp=12,Mp=1024,Sp=5e3,Rp=2e3,Lp=1800,ls=5500,Ai=700,Ep=160,Pp=15*6e4,wi=3,zt=class{constructor(e,t,i,n,o,a){this.adapter=e;this.settings=t;this.bus=i;this.version=n;this.profileCache=o;let l=this.#T(),d=a!==void 0,c=Ht(a)?a:void 0;this.#A=d?c:l,this.#D=this.#A===void 0||d&&l!==void 0&&l!==c}adapter;settings;bus;version;profileCache;#e=new Map;#t=new Map;#i=new Map;#r=new Map;#a=new Map;#c=new Set;#l=new Map;#o=new Map;#s=new Map;#p=new Map;#g=new Map;#d=new Map;#u=[];#h=new Set;#m=new Set;#y=new Map;#v=new Map;#L=new Map;#S=new Map;#C=new Map;#E=new Map;#R=[];#A;#I;#M;#w;#G=Date.now();#_="online";#O="";#U=0;#X;#x=0;#ce=!1;#D=!1;#re=()=>{if(!this.#b())return;let e=this.getOwnStatus();this.#G=Date.now();let t=this.getOwnStatus();e!==t&&(this.#_=t,this.#W(),this.#f(this.#Re()))};#Oe=()=>{this.#b()&&typeof document<"u"&&document.visibilityState==="visible"&&(this.#re(),this.#$(),this.#Y(!0))};start(){if(this.#ce||this.#D||this.#A===void 0)return;let e=this.#b();this.#D||(this.#ce=!0,this.#_=e?this.#Se():"offline",this.#R.push(this.bus.on("bc:protocol",t=>this.#he(t.senderNumber,t.payload)),this.bus.on("bc:online-friends",({friends:t})=>{if(!this.#b())return;let i=new Set,n=[];for(let o of t.slice(0,Ap)){let a=o.memberNumber;!Ht(a)||a===this.#A||i.has(a)||(i.add(a),this.#m.has(a)||n.push(a))}this.#m.clear();for(let o of i)this.#m.add(o);this.requestMany(n),this.#f()}),this.bus.on("bc:ready",()=>{this.#$(),this.#Y(!0)})),typeof window<"u"&&(window.addEventListener("pointerdown",this.#re,{passive:!0}),window.addEventListener("keydown",this.#re,{passive:!0})),typeof document<"u"&&document.addEventListener("visibilitychange",this.#Oe),this.#I=setInterval(()=>{(typeof document>"u"||document.visibilityState==="visible")&&this.#$(),this.#Y(!1),this.#fe()},fp),this.#M=setInterval(()=>this.#ge(),kp),this.#$(),this.#Y(!0))}stop(){if(this.#w!==void 0&&clearTimeout(this.#w),this.#w=void 0,this.#u.splice(0),this.#h.clear(),this.#m.clear(),!!this.#ce){for(let e of this.#y.keys())this.setTyping(e,!1,!0);this.#ce=!1,this.#I!==void 0&&clearInterval(this.#I),this.#M!==void 0&&clearInterval(this.#M),this.#I=void 0,this.#M=void 0;for(let e of this.#R.splice(0).reverse())e();typeof window<"u"&&(window.removeEventListener("pointerdown",this.#re),window.removeEventListener("keydown",this.#re)),typeof document<"u"&&document.removeEventListener("visibilitychange",this.#Oe),this.#c.clear(),this.#e.clear(),this.#t.clear(),this.#i.clear(),this.#r.clear(),this.#a.clear(),this.#s.clear(),this.#g.clear(),this.#d.clear(),this.#y.clear(),this.#v.clear();for(let e of this.#L.values())clearTimeout(e);this.#L.clear(),this.#S.clear(),this.#C.clear(),this.#E.clear(),this.#X=void 0,this.#x=0}}subscribe(e){return this.#b(),this.#D?()=>{}:(this.#c.add(e),()=>this.#c.delete(e))}getOwnStatus(){return this.#b()?this.#Se():"offline"}getOwnStatusMessage(){return this.#b()?this.settings.get().linkPresence.statusMessage:""}getOwnAvatarUrl(){return this.#b()?this.settings.get().linkPresence.avatarUrl:""}getOwnBannerUrl(){return this.#b()?this.settings.get().linkPresence.bannerUrl:""}getOwnBio(){return this.#b()?this.settings.get().linkPresence.bio:""}getOwnProfileOutlineColor(){return this.#b()?this.settings.get().linkPresence.profileOutlineColor:""}getOwnProfileGradient(){if(!this.#b())return;let e=this.settings.get().linkPresence.profileGradient;return e.enabled?e:void 0}hasCachedProfile(e,t=Date.now()){return!this.#b()||!this.settings.get().linkPresence.enabled||!Ht(e)||e!==this.#A&&this.#H(e)?!1:this.#F(e,t)!==void 0}setOwnStatus(e){this.#b()&&(this.settings.update(t=>{t.linkPresence.status=e}),this.#G=Date.now(),this.#_=this.getOwnStatus(),this.#W(),this.#f(this.#Re()))}setEnabled(e){if(!this.#b())return;let t=this.settings.get().linkPresence.enabled;if(t===e)return;this.settings.update(n=>{n.linkPresence.enabled=e}),this.#_=this.getOwnStatus();let i=!1;t&&!e?(this.#W("offline",!0,!1),i=this.#z(),this.#d.clear()):e&&this.#Y(!0),this.#f(t&&!e||i?void 0:this.#Re())}setOwnProfile(e){if(!this.#b())return;let t=this.settings.get().linkPresence.enabled,i=this.settings.update(o=>{o.linkPresence.enabled=e.enabled,o.linkPresence.statusMessage=e.statusMessage,e.bio!==void 0&&(o.linkPresence.bio=e.bio),o.linkPresence.avatarUrl=e.avatarUrl,o.linkPresence.bannerUrl=e.bannerUrl,e.avatarFrame&&(o.linkPresence.avatarFrame=e.avatarFrame),e.profileStyle&&(o.linkPresence.profileStyle=e.profileStyle),o.linkPresence.profileOutlineColor=e.profileOutlineColor,e.profileGradient&&(o.linkPresence.profileGradient=e.profileGradient),o.linkPresence.autoIdleMinutes=e.autoIdleMinutes,o.linkPresence.afkAutoReply=e.afkAutoReply}).linkPresence;this.#_=this.getOwnStatus();let n=!1;t&&!i.enabled?(this.#W("offline",!0,!1),n=this.#z(),this.#d.clear()):i.enabled&&(t?this.#W():this.#Y(!0)),this.#f(t&&!i.enabled||n?void 0:this.#Re())}setOwnStatusMessage(e){this.#b()&&(this.settings.update(t=>{t.linkPresence.statusMessage=e}),this.#W(),this.#f(this.#Re()))}setOwnAvatarUrl(e){this.#b()&&(this.settings.update(t=>{t.linkPresence.avatarUrl=e}),this.#W(),this.#f(this.#Re()))}get(e,t=Date.now()){if(!this.#b())return{memberNumber:e,status:"unknown",source:"unknown",updatedAt:0};if(e===this.#A){let m=this.settings.get().linkPresence;return{memberNumber:e,status:this.#Se(),source:"kikilink",updatedAt:t,...m.statusMessage?{statusMessage:m.statusMessage}:{},...m.bio?{bio:m.bio}:{},...m.avatarUrl?{avatarUrl:m.avatarUrl}:{},...m.bannerUrl?{bannerUrl:m.bannerUrl}:{},avatarFrame:m.avatarFrame,profileStyle:m.profileStyle,...m.profileOutlineColor?{profileOutlineColor:m.profileOutlineColor}:{},...m.profileGradient.enabled?{profileGradient:m.profileGradient}:{},addonVersion:this.version}}if(!Ht(e)||this.#H(e))return{memberNumber:e,status:"unknown",source:"unknown",updatedAt:0};let i=this.settings.get().linkPresence.enabled?this.#F(e,t):void 0,n=this.#e.get(e),o=this.#t.get(e),a=!1;try{a=typeof this.adapter.isMemberInCurrentRoom=="function"&&this.adapter.isMemberInCurrentRoom(e)}catch{}let l;if(a)try{let m=typeof this.adapter.getCurrentRoomName=="function"?this.adapter.getCurrentRoomName():void 0;typeof m=="string"&&m.trim()&&(l=m)}catch{}let d=!1,c;try{let m=typeof this.adapter.getOnlineFriend=="function"?this.adapter.getOnlineFriend(e):typeof this.adapter.getOnlineFriends=="function"?this.adapter.getOnlineFriends().find(f=>f.memberNumber===e):void 0;if(m){if(m.memberNumber!==e)throw new Error("Mismatched friend record");typeof m.roomName=="string"&&m.roomName.trim()&&(c=m.roomName),d=!0}}catch{}let u=c??l,p=o&&t-o.receivedAt<=ne?o:void 0;if(n&&t-n.receivedAt<=ne&&(n.status==="offline"||a||d||t-n.receivedAt<=yp)){let m=!p&&i&&hs(i);return{memberNumber:e,status:n.status,source:"kikilink",updatedAt:n.remoteUpdatedAt,...n.statusMessage?{statusMessage:n.statusMessage}:{},...n.avatarUrl?{avatarUrl:n.avatarUrl}:{},...n.avatarFrame?{avatarFrame:n.avatarFrame}:{},...n.profileStyle?{profileStyle:n.profileStyle}:{},...p?ps(p):us(i,!0),...n.addonVersion?{addonVersion:n.addonVersion}:{},...u?{roomName:u}:{},...m?{profileFromCache:!0,profileSyncedAt:i.richSyncedAt}:{}}}if(a){let m=this.#a.get(e)??i?.addonVersion;return{memberNumber:e,status:"online",source:"room",updatedAt:t,...l?{roomName:l}:{},...pr(i,p),...m?{addonVersion:m}:{}}}if(d){let m=this.#a.get(e)??i?.addonVersion;return{memberNumber:e,status:"online",source:"friend-list",updatedAt:t,...c?{roomName:c}:{},...pr(i,p),...m?{addonVersion:m}:{}}}let h=!1;try{h=typeof this.adapter.hasOnlineFriendSnapshot=="function"&&typeof this.adapter.isKnownFriend=="function"&&this.adapter.hasOnlineFriendSnapshot()&&this.adapter.isKnownFriend(e)}catch{}return h?{memberNumber:e,status:"offline",source:"friend-list",updatedAt:t,...pr(i,p)}:{memberNumber:e,status:"unknown",source:"unknown",updatedAt:0,...pr(i,p)}}request(e,t=!1,i=!1){if(!this.#b()||!Number.isSafeInteger(e)||e<=0||e===this.#A||this.#H(e))return!1;let n=i&&this.settings.get().linkPresence.enabled;i&&!n&&this.#d.delete(e);let o=Date.now(),a=n?this.#s.get(e):t?this.#o.get(e):this.#l.get(e),l=n||t?xp:vp;if(a!==void 0&&o-a<l)return!1;let d=gi("p").slice(-18),c={t:"pq",i:d,...n?{p:1,e:1,d:1}:{}};if(this.#l.set(e,o),t&&!n&&this.#o.set(e,o),n&&(this.#s.set(e,o),this.#d.set(e,{id:d,requestedAt:o,expectsBio:!0})),!this.#b())return n&&this.#d.get(e)?.id===d&&this.#d.delete(e),!1;try{return this.adapter.sendKikiLinkProtocol(e,JSON.stringify(c)),!0}catch{return n&&this.#d.get(e)?.id===d&&this.#d.delete(e),!1}}requestMany(e){if(!this.#b())return 0;let t=this.#A,i=Date.now(),n=0;for(let o of e)this.#u.length>=wp||!Number.isSafeInteger(o)||o<=0||o===t||this.hasCompatiblePeer(o,i)||this.#h.has(o)||i-(this.#l.get(o)??0)<zn||!this.#ee(o)||(this.#u.push(o),this.#h.add(o),n+=1);return this.#u.length>0&&this.#w===void 0&&this.#De(),n}isTyping(e,t=Date.now()){return this.#b()?(this.#v.get(e)??0)>t:!1}hasCompatiblePeer(e,t=Date.now()){if(!this.#b())return!1;if(e===this.#A)return!0;let i=this.#i.get(e);return i!==void 0&&t-i<=ne}hasGroupChatPeer(e,t=Date.now()){if(!this.#b())return!1;if(e===this.#A)return!0;let i=this.#r.get(e);return i!==void 0&&t-i.seenAt<=ne}hasGroupRelayPeer(e,t=Date.now()){if(!this.#b())return!1;if(e===this.#A)return!0;let i=this.#r.get(e);return i!==void 0&&i.version>=2&&t-i.seenAt<=ne}hasGroupManagedPeer(e,t=Date.now()){if(!this.#b())return!1;if(e===this.#A)return!0;let i=this.#r.get(e);return i?.version===wi&&t-i.seenAt<=ne}setTyping(e,t,i=!1){if(!this.#b()||!Number.isSafeInteger(e)||e<=0||e===this.#A||this.#H(e)||!this.settings.get().linkChat.typingIndicators&&!(i&&!t))return!1;let n=this.#y.get(e),o=Date.now();if(t&&n&&o-n.sentAt<Lp||!t&&!n)return!1;t||this.#y.delete(e);let a={t:"ty",a:t?1:0};if(!this.#b())return!1;try{return this.adapter.sendKikiLinkProtocol(e,JSON.stringify(a)),t&&this.#y.set(e,{active:!0,sentAt:o}),!0}catch{return!1}}#De(){if(this.#w=void 0,!this.#b()){!this.#D&&this.#u.length>0&&(this.#w=setTimeout(()=>this.#De(),os));return}let e=!1;for(;this.#u.length>0&&!e;){let t=this.#u.shift();if(t===void 0)break;this.#h.delete(t);let i=Date.now();!Ht(t)||t===this.#A||this.hasCompatiblePeer(t,i)||i-(this.#l.get(t)??0)<zn||!this.#ee(t)||(e=this.request(t))}this.#u.length>0&&(this.#w=setTimeout(()=>this.#De(),os))}#he(e,t){if(!this.#b()||!Ht(e)||e===this.#A||this.#H(e))return;let i=Op(t);if(!i)return;let n=Date.now();if((i.t==="ps"||i.t==="ty")&&!this.#me(e,i.t,n)||i.t==="ps"&&this.#ye(e,i.u,n))return;this.#Q(e,n);let o=this.hasCompatiblePeer(e,n);if(this.#i.set(e,n),i.t==="ty"){if(!this.settings.get().linkChat.typingIndicators){o||this.#f(e);return}this.#ue(e,i.a===1);return}if(i.t==="pq"){o||this.#f(e);let l=this.#p.get(e);(l===void 0||n-l>=Sp)&&(this.#p.set(e,n),this.settings.get().linkPresence.enabled?this.#j(e,i.i):this.#Me(e));let d=this.#g.get(e);i.p===1&&this.settings.get().linkPresence.enabled&&(d===void 0||n-d>=Rp)&&(this.#g.set(e,n),this.#Ge(e,i.i,i.e===1,i.d===1));return}if(i.t==="pc"){this.#a.set(e,i.v),i.g!==void 0&&this.#r.set(e,{seenAt:n,version:i.g}),o||this.#f(e);return}if(i.t==="pf"){if(!this.settings.get().linkPresence.enabled){this.#d.delete(e),o||this.#f(e);return}let l=this.#d.get(e);if(!l||l.id!==i.i||n-l.requestedAt>ne){o||this.#f(e);return}if(l.detailsReceived)return;l.detailsReceived=!0,(!l.expectsBio||l.bioReceived)&&this.#d.delete(e);let d=this.#t.get(e);this.#t.set(e,{...i.h?{bannerUrl:i.h}:{},...l.bioReceived&&d?.bio?{bio:d.bio}:{},...i.o?{profileOutlineColor:i.o}:{},...i.x&&i.y?{profileGradient:{enabled:!0,primary:i.x,secondary:i.y}}:{},receivedAt:n}),this.#oe(e,n,!0),this.#f(e);return}if(i.t==="pb"){if(!this.settings.get().linkPresence.enabled){this.#d.delete(e),o||this.#f(e);return}let l=this.#d.get(e);if(!l||!l.expectsBio||l.id!==i.i||n-l.requestedAt>ne){o||this.#f(e);return}if(l.bioReceived)return;l.bioReceived=!0,l.detailsReceived&&this.#d.delete(e);let d=this.#t.get(e);this.#t.set(e,{...d?.bannerUrl?{bannerUrl:d.bannerUrl}:{},...i.b?{bio:i.b}:{},...d?.profileOutlineColor?{profileOutlineColor:d.profileOutlineColor}:{},...d?.profileGradient?{profileGradient:d.profileGradient}:{},receivedAt:n}),this.#oe(e,n,!0),this.#f(e);return}i.g!==void 0&&this.#r.set(e,{seenAt:n,version:i.g}),this.#a.set(e,i.v),this.#E.delete(e),this.#E.set(e,{sourceUpdatedAt:i.u,receivedAt:n});let a=i.s==="offline"&&i.m===void 0&&i.a===void 0&&i.f===void 0&&i.c===void 0;if(a&&this.#d.delete(e),!this.settings.get().linkPresence.enabled){a&&this.profileCache?.remove(e),o||this.#f(e);return}this.#e.set(e,{status:i.s,...i.m?{statusMessage:i.m}:{},...i.a?{avatarUrl:i.a}:{},...i.f?{avatarFrame:i.f}:{},...i.c?{profileStyle:i.c}:{},addonVersion:i.v,receivedAt:n,remoteUpdatedAt:Math.abs(i.u-n)<=1440*6e4?i.u:n}),a?(this.#t.delete(e),this.profileCache?.remove(e)):this.#oe(e,n),this.#f(e)}#me(e,t,i){let n=this.#X;(n===void 0||i<n||i-n>=ss)&&(this.#X=i,this.#x=0);let o=this.#C.get(e);if(o&&(i<o.windowStartedAt||i-o.windowStartedAt>=ss)&&(o={windowStartedAt:i,presencePackets:0,typingPackets:0}),(t==="ps"?o?.presencePackets??0:o?.typingPackets??0)>=(t==="ps"?Np:Cp)||this.#x>=Mp)return!1;if(!o){for(;this.#C.size>=as;){let d=this.#C.keys().next().value;if(d===void 0)break;this.#C.delete(d)}o={windowStartedAt:i,presencePackets:0,typingPackets:0}}return t==="ps"?o.presencePackets+=1:o.typingPackets+=1,this.#C.delete(e),this.#C.set(e,o),this.#x+=1,!0}#ye(e,t,i){let n=this.#E.get(e);return n!==void 0&&i-n.receivedAt<=ne&&t<n.sourceUpdatedAt}#Q(e,t){if(this.#S.has(e))this.#S.delete(e);else for(;this.#S.size>=as;){let i=this.#S.keys().next().value;if(i===void 0)break;this.#te(i)}this.#S.set(e,t)}#ue(e,t){let i=this.#L.get(e);if(i!==void 0&&clearTimeout(i),this.#L.delete(e),!t){this.#v.delete(e)&&this.#f(e);return}let n=Date.now()+ls;this.#v.set(e,n),this.#L.set(e,setTimeout(()=>{if(this.#L.delete(e),!this.#b()){this.#v.delete(e);return}(this.#v.get(e)??0)>Date.now()||this.#v.delete(e)&&this.#f(e)},ls+25)),this.#f(e)}#z(){let e=this.#e.size>0||this.#t.size>0;return this.#e.clear(),this.#t.clear(),e}#F(e,t=Date.now()){try{return this.profileCache?.get(e,t)}catch{return}}#oe(e,t,i=!1){if(!this.profileCache)return;let n=this.#e.get(e),o=this.#t.get(e),a;try{a=this.profileCache.peek(e,t)}catch{}if(!n&&!a&&!o)return;let l=a?.displayName??`Member ${e}`;try{l=$t(this.adapter.getMemberName(e),80)||l}catch{}let d=n?.addonVersion??this.#a.get(e)??a?.addonVersion,c={memberNumber:e,displayName:l,...n?.avatarUrl?{avatarUrl:n.avatarUrl}:!n&&a?.avatarUrl?{avatarUrl:a.avatarUrl}:{},...n?.avatarFrame?{avatarFrame:n.avatarFrame}:!n&&a?.avatarFrame?{avatarFrame:a.avatarFrame}:{},...n?.profileStyle?{profileStyle:n.profileStyle}:!n&&a?.profileStyle?{profileStyle:a.profileStyle}:{},...o?o.bannerUrl?{bannerUrl:o.bannerUrl}:{}:a?.bannerUrl?{bannerUrl:a.bannerUrl}:{},...o?o.bio?{bio:o.bio}:{}:a?.bio?{bio:a.bio}:{},...o?o.profileOutlineColor?{profileOutlineColor:o.profileOutlineColor}:{}:a?.profileOutlineColor?{profileOutlineColor:a.profileOutlineColor}:{},...o?o.profileGradient?{profileGradient:o.profileGradient}:{}:a?.profileGradient?{profileGradient:a.profileGradient}:{},...o?Tp(o)?{richSyncedAt:o.receivedAt}:{}:a?.richSyncedAt!==void 0?{richSyncedAt:a.richSyncedAt}:{},...a?.profileRevision?{profileRevision:a.profileRevision}:{},...d?{addonVersion:d}:{}};if(!(!i&&a&&_p(c,a)&&t-a.syncedAt<Pp))try{this.profileCache.upsert(c,t)}catch{}}#ee(e){try{if(typeof this.adapter.isMemberInCurrentRoom=="function"&&this.adapter.isMemberInCurrentRoom(e))return!0}catch{}try{return typeof this.adapter.getOnlineFriend=="function"?this.adapter.getOnlineFriend(e)?.memberNumber===e:typeof this.adapter.getOnlineFriends=="function"&&this.adapter.getOnlineFriends().some(t=>t.memberNumber===e)}catch{return!1}}#H(e){let t=!0,i=this.adapter.getPlayerRelationships;if(typeof i=="function")try{let n=i.call(this.adapter,e);Array.isArray(n)&&(t=n.some(o=>{let a=String(o).toLowerCase();return a==="blacklist"||a==="blacklisted"||a==="ghost"||a==="ghosted"}))}catch{}return t&&this.#te(e),t}#te(e){let t=!1;t=this.#e.delete(e)||t,t=this.#t.delete(e)||t,t=this.#i.delete(e)||t,t=this.#r.delete(e)||t,t=this.#a.delete(e)||t,t=this.#d.delete(e)||t,t=this.#y.delete(e)||t,t=this.#v.delete(e)||t,t=this.#l.delete(e)||t,t=this.#o.delete(e)||t,t=this.#s.delete(e)||t,t=this.#p.delete(e)||t,t=this.#g.delete(e)||t,t=this.#h.delete(e)||t,t=this.#m.delete(e)||t,t=this.#S.delete(e)||t,t=this.#C.delete(e)||t,t=this.#E.delete(e)||t;let i=this.#u.length;for(let o=this.#u.length-1;o>=0;o-=1)this.#u[o]===e&&this.#u.splice(o,1);t=this.#u.length!==i||t;let n=this.#L.get(e);n!==void 0&&(clearTimeout(n),this.#L.delete(e),t=!0);try{t=(this.profileCache?.remove(e)??!1)||t}catch{}t&&this.#f(e)}#j(e,t){if(!this.#b())return;let i=this.settings.get().linkPresence,n={t:"ps",...t?{i:t}:{},s:this.getOwnStatus(),...i.statusMessage?{m:i.statusMessage}:{},...i.avatarUrl?{a:i.avatarUrl}:{},f:i.avatarFrame,c:i.profileStyle,u:Date.now(),v:this.version,g:wi};try{if(!this.#b())return;this.adapter.sendKikiLinkProtocol(e,ds(n))}catch{}}#Ge(e,t,i,n){if(!this.#b())return;let o=this.settings.get().linkPresence,a={t:"pf",i:t,...o.bannerUrl?{h:o.bannerUrl}:{},...o.profileOutlineColor?{o:o.profileOutlineColor}:{},...i&&o.profileGradient.enabled?{x:o.profileGradient.primary,y:o.profileGradient.secondary}:{}};try{if(!this.#b())return;n&&this.adapter.sendKikiLinkProtocol(e,Gp({t:"pb",i:t,...o.bio?{b:o.bio}:{}})),this.adapter.sendKikiLinkProtocol(e,Dp(a))}catch{}}#Me(e){if(!this.#b())return;let t=JSON.stringify({t:"pc",v:this.version,g:wi});try{if(!this.#b())return;e===void 0?this.adapter.broadcastKikiLinkProtocol(t):this.adapter.sendKikiLinkProtocol(e,t)}catch{}}#W(e,t=!1,i=!0){if(!this.#b()||!t&&!this.settings.get().linkPresence.enabled)return;let n=this.settings.get().linkPresence,o={t:"ps",s:e??this.getOwnStatus(),...i&&n.statusMessage?{m:n.statusMessage}:{},...i&&n.avatarUrl?{a:n.avatarUrl}:{},...i?{f:n.avatarFrame,c:n.profileStyle}:{},u:Date.now(),v:this.version,g:wi};try{if(!this.#b())return;this.adapter.broadcastKikiLinkProtocol(ds(o))}catch{}}#Y(e){if(!this.#b())return;let t="";try{t=this.adapter.isInChatRoom()?this.adapter.getCurrentRoomName()??"?":""}catch{return}let i=t!==this.#O;if(this.#O=t,!t)return;if(e||i){if(!this.#b())return;let o={t:"pq",i:gi("room").slice(-18),b:1};try{this.adapter.broadcastKikiLinkProtocol(JSON.stringify(o))}catch{}}if(this.settings.get().linkPresence.enabled){this.#W();return}let n=Date.now();(e||i||n-this.#U>=bp)&&(this.#U=n,this.#Me())}#ge(){if(!this.#b())return;let e=this.#Se();e!==this.#_&&(this.#_=e,this.#W(),this.#f(this.#Re()))}#fe(e=Date.now()){if(!this.#b())return;let t=new Set;for(let[i,n]of this.#e)e-n.receivedAt<=ne||(this.#e.delete(i),t.add(i));for(let[i,n]of this.#t)e-n.receivedAt<=ne||(this.#t.delete(i),t.add(i));for(let[i,n]of this.#i)e-n<=ne||(this.#i.delete(i),this.#r.delete(i),this.#a.delete(i),t.add(i));for(let[i,n]of this.#r)e-n.seenAt<=ne||this.#r.delete(i);for(let[i,n]of this.#l)e-n>zn&&this.#l.delete(i);for(let[i,n]of this.#o)e-n>ne&&this.#o.delete(i);for(let[i,n]of this.#s)e-n>ne&&this.#s.delete(i);for(let[i,n]of this.#p)e-n>ne&&this.#p.delete(i);for(let[i,n]of this.#g)e-n>ne&&this.#g.delete(i);for(let[i,n]of this.#d)e-n.requestedAt>ne&&this.#d.delete(i);for(let[i,n]of this.#S)e-n<=ne||(this.#S.delete(i),this.#C.delete(i),this.#E.delete(i));try{this.profileCache?.prune(e)}catch{}for(let i of t)this.#f(i)}#f(e){for(let t of[...this.#c])try{t(e)}catch{}}#Se(){let e=this.settings.get().linkPresence;return e.status!=="online"||e.autoIdleMinutes===0?e.status:Date.now()-this.#G>=e.autoIdleMinutes*6e4?"idle":"online"}#T(){try{let e=this.adapter.getOwnMemberNumber();return Number.isSafeInteger(e)&&e>0?e:void 0}catch{return}}#b(){if(this.#D||this.#A===void 0)return!1;let e=this.#T();return e===void 0?!1:e!==this.#A?(this.#Je(),!1):!0}#Je(){if(!this.#D){this.#D=!0,this.#ce=!1,this.#w!==void 0&&clearTimeout(this.#w),this.#I!==void 0&&clearInterval(this.#I),this.#M!==void 0&&clearInterval(this.#M),this.#w=void 0,this.#I=void 0,this.#M=void 0,this.#u.splice(0),this.#h.clear(),this.#m.clear();for(let e of this.#R.splice(0).reverse())e();typeof window<"u"&&(window.removeEventListener("pointerdown",this.#re),window.removeEventListener("keydown",this.#re)),typeof document<"u"&&document.removeEventListener("visibilitychange",this.#Oe),this.#e.clear(),this.#t.clear(),this.#i.clear(),this.#r.clear(),this.#a.clear(),this.#l.clear(),this.#o.clear(),this.#s.clear(),this.#p.clear(),this.#g.clear(),this.#d.clear(),this.#y.clear(),this.#v.clear();for(let e of this.#L.values())clearTimeout(e);this.#L.clear(),this.#S.clear(),this.#C.clear(),this.#E.clear(),this.#X=void 0,this.#x=0,this.#O="",this.#U=0,this.#_="offline",this.#f(),this.#c.clear()}}#Re(){return this.#b()?this.#A??-1:-1}#$(){if(this.#b())try{this.adapter.refreshOnlineFriends()}catch{}}};function us(r,e=!1){if(!r||e&&!hs(r))return{};let t=e?r.richSyncedAt:r.syncedAt;return{...!e&&r.avatarUrl?{avatarUrl:r.avatarUrl}:{},...!e&&r.avatarFrame?{avatarFrame:r.avatarFrame}:{},...!e&&r.profileStyle?{profileStyle:r.profileStyle}:{},...r.bannerUrl?{bannerUrl:r.bannerUrl}:{},...r.bio?{bio:r.bio}:{},...r.profileOutlineColor?{profileOutlineColor:r.profileOutlineColor}:{},...r.profileGradient?{profileGradient:r.profileGradient}:{},...!e&&r.addonVersion?{addonVersion:r.addonVersion}:{},profileFromCache:!0,...t!==void 0?{profileSyncedAt:t}:{}}}function Ip(r){return!r||!(r.avatarUrl||r.avatarFrame||r.profileStyle||r.addonVersion)?{}:{...r.avatarUrl?{avatarUrl:r.avatarUrl}:{},...r.avatarFrame?{avatarFrame:r.avatarFrame}:{},...r.profileStyle?{profileStyle:r.profileStyle}:{},...r.addonVersion?{addonVersion:r.addonVersion}:{},profileFromCache:!0,profileSyncedAt:r.syncedAt}}function ps(r){return{...r.bannerUrl?{bannerUrl:r.bannerUrl}:{},...r.bio?{bio:r.bio}:{},...r.profileOutlineColor?{profileOutlineColor:r.profileOutlineColor}:{},...r.profileGradient?{profileGradient:r.profileGradient}:{}}}function pr(r,e){return e?{...Ip(r),...ps(e)}:us(r)}function hs(r){return!!(r.bannerUrl||r.bio||r.profileOutlineColor||r.profileGradient)}function Tp(r){return!!(r.bannerUrl||r.bio||r.profileOutlineColor||r.profileGradient)}function _p(r,e){return r.memberNumber===e.memberNumber&&r.displayName===e.displayName&&r.avatarUrl===e.avatarUrl&&r.avatarFrame===e.avatarFrame&&r.profileStyle===e.profileStyle&&r.bannerUrl===e.bannerUrl&&r.bio===e.bio&&r.profileOutlineColor===e.profileOutlineColor&&r.richSyncedAt===e.richSyncedAt&&r.profileRevision===e.profileRevision&&r.addonVersion===e.addonVersion&&r.profileGradient?.enabled===e.profileGradient?.enabled&&r.profileGradient?.primary===e.profileGradient?.primary&&r.profileGradient?.secondary===e.profileGradient?.secondary}function Op(r){if(r.length>Ai||mr(r)>Ai)return null;let e;try{e=JSON.parse(r)}catch{return null}if(!e||typeof e!="object"||!("t"in e))return null;if(e.t==="pq")return!("i"in e)||!pt(e.i)?null:{t:"pq",i:e.i,..."b"in e&&e.b===1?{b:1}:{},..."p"in e&&e.p===1?{p:1}:{},..."e"in e&&e.e===1?{e:1}:{},..."d"in e&&e.d===1?{d:1}:{}};if(e.t==="ty")return!("a"in e)||e.a!==0&&e.a!==1?null:{t:"ty",a:e.a};if(e.t==="pc"){if(!("v"in e)||typeof e.v!="string"||e.v.length<1||e.v.length>24)return null;let d=$t(e.v,24);return d?{t:"pc",v:d,..."g"in e&&jn(e.g)?{g:e.g}:{}}:null}if(e.t==="pf"){if(!cs(e,["t","i","h","o","x","y"])||!("i"in e)||!pt(e.i))return null;let d="h"in e?hr(e.h):"";if("h"in e&&!d)return null;let c="o"in e?Kt(e.o):"";if("o"in e&&!c)return null;let u="x"in e,p="y"in e;if(u!==p)return null;let h="x"in e?Kt(e.x):"",m="y"in e?Kt(e.y):"";return u&&!h||p&&!m?null:{t:"pf",i:e.i,...d?{h:d}:{},...c?{o:c}:{},...h&&m?{x:h,y:m}:{}}}if(e.t==="pb"){if(!cs(e,["t","i","b"])||!("i"in e)||!pt(e.i))return null;let d="b"in e?gs(e.b):"";return"b"in e&&!d?null:{t:"pb",i:e.i,...d?{b:d}:{}}}if(e.t!=="ps"||!("s"in e)||!ks(e.s)||!("u"in e)||typeof e.u!="number"||!Number.isSafeInteger(e.u)||e.u<0||!("v"in e)||typeof e.v!="string"||e.v.length<1||e.v.length>24)return null;let t="m"in e&&typeof e.m=="string"?$t(e.m,80):"",i="a"in e?hr(e.a):"",n="i"in e&&pt(e.i)?e.i:"",o="f"in e&&fs(e.f)?e.f:void 0,a="c"in e&&bs(e.c)?e.c:void 0,l=$t(e.v,24);return l?{t:"ps",...n?{i:n}:{},s:e.s,...t?{m:t}:{},...i?{a:i}:{},...o?{f:o}:{},...a?{c:a}:{},u:e.u,v:l,..."g"in e&&jn(e.g)?{g:e.g}:{}}:null}var ms=/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu;function $t(r,e){return r.replace(ms," ").replace(/\s+/gu," ").trim().slice(0,e)}function gs(r){return typeof r!="string"?"":[...r.replace(ms," ").replace(/\s+/gu," ").trim()].slice(0,Ep).join("")}function ds(r){if(!ks(r.s)||!Number.isFinite(r.u))throw new Error("Invalid required presence fields");let e=$t(r.v,24);if(!e)throw new Error("Invalid presence version");let t=r.m===void 0?"":$t(r.m,80),i=r.a===void 0?"":hr(r.a),n={t:"ps",...r.i!==void 0&&pt(r.i)?{i:r.i}:{},s:r.s,...t?{m:t}:{},...i?{a:i}:{},...r.f!==void 0&&fs(r.f)?{f:r.f}:{},...r.c!==void 0&&bs(r.c)?{c:r.c}:{},u:r.u,v:e,...r.g!==void 0&&jn(r.g)?{g:r.g}:{}},o=JSON.stringify(n);for(let a of["a","m","f","c","i"]){if(mr(o)<=Ai)return o;delete n[a],o=JSON.stringify(n)}return o}function Dp(r){if(!pt(r.i))throw new Error("Invalid profile-details request ID");let e=r.h===void 0?"":hr(r.h);if(r.h!==void 0&&!e)throw new Error("Invalid profile banner URL");let t=r.o===void 0?"":Kt(r.o);if(r.o!==void 0&&!t)throw new Error("Invalid profile outline color");let i=r.x!==void 0,n=r.y!==void 0;if(i!==n)throw new Error("Profile gradient colors must be sent together");let o=i?Kt(r.x):"",a=n?Kt(r.y):"";if(i&&!o||n&&!a)throw new Error("Invalid profile gradient color");let l={t:"pf",i:r.i,...e?{h:e}:{},...t?{o:t}:{},...o&&a?{x:o,y:a}:{}},d=JSON.stringify(l);for(let c of[["h"],["x","y"],["o"]]){if(mr(d)<=Ai)return d;for(let u of c)delete l[u];d=JSON.stringify(l)}return d}function Gp(r){if(!pt(r.i))throw new Error("Invalid profile-bio request ID");let e=r.b===void 0?"":gs(r.b);if(r.b!==void 0&&!e)throw new Error("Invalid profile bio");let t=JSON.stringify({t:"pb",i:r.i,...e?{b:e}:{}});if(mr(t)>Ai)throw new Error("Profile bio exceeds the protocol limit");return t}function fs(r){return r==="none"||r==="blossom"||r==="rose"||r==="starlight"||r==="laurel"||r==="thorn"||r==="moon"||r==="ribbon"}function bs(r){return r==="classic"||r==="garden"||r==="midnight"}function ks(r){return r==="online"||r==="idle"||r==="dnd"||r==="offline"}function jn(r){return r===1||r===2||r===wi}function Ht(r){return typeof r=="number"&&Number.isSafeInteger(r)&&r>0}function hr(r){if(typeof r!="string")return"";let e=r.trim();if(!e||e.length>500)return"";let t;try{t=new URL(e)}catch{return""}let i=V(e);return i&&i===t.href&&i.length<=500?i:""}function Kt(r){return typeof r=="string"&&/^#[0-9a-f]{6}$/iu.test(r)?r.toLowerCase():""}function pt(r){return typeof r=="string"&&/^[a-z0-9_-]{1,32}$/iu.test(r)}function cs(r,e){return Object.keys(r).every(i=>e.includes(i))}function mr(r){return new TextEncoder().encode(r).byteLength}var Vn={chime:"Soft chime",sparkle:"Sakura sparkle",pop:"Gentle pop"},Bp={chime:[{offset:0,duration:.22,frequency:659.25,gain:.055,wave:"sine"},{offset:.11,duration:.32,frequency:987.77,gain:.045,wave:"sine"}],sparkle:[{offset:0,duration:.13,frequency:523.25,gain:.04,wave:"triangle"},{offset:.08,duration:.15,frequency:659.25,gain:.045,wave:"triangle"},{offset:.16,duration:.2,frequency:1046.5,gain:.04,wave:"sine"}],pop:[{offset:0,duration:.11,frequency:330,endFrequency:190,gain:.06,wave:"sine"},{offset:.13,duration:.09,frequency:280,endFrequency:170,gain:.045,wave:"sine"}]},Up=350,gr=class{constructor(e){this.resolveCustomSound=e}resolveCustomSound;#e;#t=Number.NEGATIVE_INFINITY;#i=new Map;async unlock(){let e=this.#r();if(!e)return!1;try{return e.state==="suspended"&&await e.resume(),e.state!=="closed"}catch{return!1}}async play(e,t={}){let i=typeof t=="number"?{now:t}:t,n=i.now??Date.now(),o=Hp(i.volume);if(n-this.#t<Up||o===0)return!1;if(!$p(e))return this.#a(e.slice(7),o,n);if(!await this.unlock())return!1;let a=this.#e;if(!a)return!1;try{let l=a.currentTime+.01;for(let d of Bp[e])Fp(a,l,d,o/100);return this.#t=n,!0}catch{return!1}}async destroy(){let e=this.#e;if(this.#e=void 0,this.#i.clear(),e&&e.state!=="closed")try{await e.close()}catch{}}#r(){if(this.#e&&this.#e.state!=="closed")return this.#e;let e=globalThis,t=globalThis.AudioContext??e.webkitAudioContext;if(t)try{return this.#e=new t,this.#e}catch{return}}async#a(e,t,i){if(!this.resolveCustomSound||!await this.unlock())return!1;let n=this.#e;if(!n||typeof n.decodeAudioData!="function")return!1;try{let o=await this.#c(e,n);if(!o)return!1;let a=n.createBufferSource(),l=n.createGain();return a.buffer=o,l.gain.setValueAtTime(t/100,n.currentTime),a.connect(l),l.connect(n.destination),a.start(n.currentTime+.01),this.#t=i,!0}catch{return!1}}#c(e,t){let i=this.#i.get(e);return i||(i=this.resolveCustomSound(e).then(async n=>n?t.decodeAudioData(await n.arrayBuffer()):void 0).catch(()=>{}),this.#i.set(e,i)),i}};function Fp(r,e,t,i){let n=r.createOscillator(),o=r.createGain(),a=e+t.offset,l=a+t.duration;n.type=t.wave,n.frequency.setValueAtTime(t.frequency,a),t.endFrequency!==void 0&&n.frequency.exponentialRampToValueAtTime(t.endFrequency,l),o.gain.setValueAtTime(1e-4,a),o.gain.exponentialRampToValueAtTime(Math.max(1e-4,t.gain*i),a+Math.min(.018,t.duration/3)),o.gain.exponentialRampToValueAtTime(1e-4,l),n.connect(o),o.connect(r.destination),n.start(a),n.stop(l+.02)}function Hp(r){return r===void 0||!Number.isFinite(r)?100:Math.min(100,Math.max(0,r))}function $p(r){return r==="chime"||r==="sparkle"||r==="pop"}var ys=`
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
  cursor: grab;
  touch-action: none;
  user-select: none;
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
  margin-right: 0;
  cursor: grab;
}
.kl-topbar-drag-space { min-width: 12px; align-self: stretch; flex: 1 1 72px; cursor: grab; }
.kl-panel[data-dragging="true"] .kl-topbar,
.kl-panel[data-dragging="true"] .kl-brand,
.kl-panel[data-dragging="true"] .kl-topbar-drag-space { cursor: grabbing; }
.kl-topbar button,
.kl-topbar a { user-select: auto; }

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
.kl-news-trigger {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  padding: 5px 9px;
  color: var(--kl-muted);
  font-size: var(--kl-type-sm);
  font-weight: 800;
}
.kl-news-trigger:hover { color: var(--kl-text); }
.kl-news-trigger[aria-current="page"] {
  border-color: color-mix(in srgb, var(--kl-gold), transparent 42%);
  background: color-mix(in srgb, var(--kl-gold), transparent 88%);
  color: var(--kl-gold);
}
.kl-news-trigger-icon { width: 17px; height: 17px; }
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

.kl-news-page { grid-template-rows: auto minmax(0, 1fr); }
.kl-news-changelog-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--kl-gold);
  text-decoration: none;
}
.kl-news-feed {
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 0;
  padding: 20px clamp(16px, 3vw, 34px) 34px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.kl-news-release {
  min-width: 0;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
}
.kl-news-release-rail { position: relative; display: flex; justify-content: center; }
.kl-news-release-rail::after {
  content: "";
  position: absolute;
  top: 17px;
  bottom: -1px;
  width: 1px;
  background: linear-gradient(var(--kl-border-strong), var(--kl-border));
}
.kl-news-release:last-child .kl-news-release-rail::after { display: none; }
.kl-news-release-dot {
  position: relative;
  z-index: 1;
  width: 10px;
  height: 10px;
  margin-top: 14px;
  border: 2px solid var(--kl-panel-bg);
  border-radius: 50%;
  background: var(--kl-muted);
  box-shadow: 0 0 0 1px var(--kl-border-strong);
}
.kl-news-release[data-current="true"] .kl-news-release-dot {
  background: var(--kl-gold);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--kl-gold), transparent 84%);
}
.kl-news-release-card {
  min-width: 0;
  display: grid;
  gap: 8px;
  margin: 0 0 14px 8px;
  padding: 16px 18px;
  border: 1px solid var(--kl-border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--kl-surface), transparent 10%);
}
.kl-news-release[data-current="true"] .kl-news-release-card {
  border-color: color-mix(in srgb, var(--kl-gold), transparent 50%);
  background:
    radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--kl-gold), transparent 88%), transparent 35%),
    var(--kl-surface);
}
.kl-news-release-meta { display: flex; align-items: center; gap: 7px; }
.kl-news-version { color: var(--kl-gold); font-size: var(--kl-type-xs); font-weight: 900; letter-spacing: 0.08em; }
.kl-news-current { padding: 2px 6px; border-radius: 999px; background: color-mix(in srgb, var(--kl-gold), transparent 82%); color: var(--kl-gold); font-size: var(--kl-type-xxs); font-weight: 900; text-transform: uppercase; }
.kl-news-date { margin-left: auto; color: var(--kl-meta); font-size: var(--kl-type-xxs); font-variant-numeric: tabular-nums; }
.kl-news-release-card h2 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: var(--kl-type-lg); }
.kl-news-summary { margin: 0; color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-news-highlights { display: grid; gap: 6px; margin: 2px 0 0; padding: 0; list-style: none; }
.kl-news-highlights li { display: grid; grid-template-columns: 7px minmax(0, 1fr); gap: 8px; color: var(--kl-text); font-size: var(--kl-type-sm); }
.kl-news-highlights li::before { content: ""; width: 5px; height: 5px; margin-top: 6px; border-radius: 50%; background: var(--kl-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--kl-accent), transparent 86%); }

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
.kl-home-update {
  min-width: 0;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  margin: -9px 2px 18px;
  padding: 11px 12px;
  border: 1px solid color-mix(in srgb, var(--kl-gold), var(--kl-border) 55%);
  border-radius: 14px;
  background: color-mix(in srgb, var(--kl-gold), transparent 93%);
}
.kl-home-update[hidden] { display: none; }
.kl-home-update-icon {
  width: 38px;
  height: 38px;
  padding: 9px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--kl-gold), transparent 86%);
  color: var(--kl-gold);
}
.kl-home-update-copy { min-width: 0; display: grid; gap: 2px; }
.kl-home-update-title { overflow-wrap: anywhere; }
.kl-home-update-copy > span { color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-home-update-button { flex: 0 0 auto; text-decoration: none; }

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
:host([data-density="super-compact"]) .kl-sidebar-heading { padding: 2px 8px 7px 10px; }
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
:host([data-density="super-compact"]) .kl-group-conversation.kl-conversation { grid-template-columns: 36px minmax(0, 1fr) auto; }
:host([data-density="super-compact"]) .kl-group-conversation-avatar { width: 36px; height: 36px; border-radius: 10px; }
:host([data-density="super-compact"]) .kl-group-conversation-avatar-inner { border-radius: 6px; }
:host([data-density="super-compact"]) .kl-group-conversation-mark { right: -2px; bottom: -2px; width: 17px; height: 17px; border-width: 2px; }
:host([data-density="super-compact"]) .kl-group-conversation-mark .kl-icon { width: 9px; height: 9px; }
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
:host([data-density="super-compact"]) .kl-roster-entry { grid-template-columns: 35px minmax(0, 1fr); gap: 7px; padding: 5px; border-radius: 9px; }
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
  grid-template-areas:
    "search"
    "heading"
    "chats";
  grid-template-rows: auto auto minmax(0, 1fr);
  border-right: 1px solid var(--kl-border);
  background: var(--kl-sidebar-bg);
}

.kl-search-wrap { grid-area: search; padding: 14px; }
.kl-sidebar > .kl-sidebar-heading { grid-area: heading; }
.kl-sidebar > .kl-conversations { grid-area: chats; }
.kl-sidebar-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 13px 10px 16px;
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
.kl-sidebar-new-group .kl-icon { width: 17px; height: 17px; }
.kl-toolbar-group-button {
  --kl-group-tool: #829bb7;
  border-color: color-mix(in srgb, var(--kl-group-tool), var(--kl-border) 72%);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--kl-group-tool), transparent 90%), transparent),
    var(--kl-surface-2);
  color: color-mix(in srgb, var(--kl-group-tool) 58%, var(--kl-text));
}
.kl-toolbar-group-button:hover {
  border-color: color-mix(in srgb, var(--kl-group-tool), var(--kl-border-strong) 48%);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--kl-group-tool), transparent 84%), transparent),
    var(--kl-surface-hover);
  color: var(--kl-text);
}
.kl-toolbar-group-button .kl-icon { width: 17px; height: 17px; }
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
.kl-roster-tags,
.kl-profile-bio-input {
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
.kl-roster-tags:focus,
.kl-profile-bio-input:focus {
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
.kl-group-conversation.kl-conversation { grid-template-columns: 48px minmax(0, 1fr) auto; }

.kl-group-conversation-avatar {
  --kl-group-outline: var(--kl-gold);
  position: relative;
  z-index: 0;
  width: 48px;
  height: 48px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 2px;
  padding: 3px;
  border: 2px solid var(--kl-group-outline);
  border-radius: 16px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 8%);
  overflow: visible;
  isolation: isolate;
}
.kl-group-conversation-avatar-inner {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-area: 1 / 1 / -1 / -1;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 2px;
  border-radius: 11px;
  overflow: hidden;
}
.kl-group-conversation-avatar-inner[data-custom-avatar] {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  place-items: center;
  color: var(--kl-text);
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
}
.kl-group-conversation-avatar-inner > img { width: 100%; height: 100%; display: block; object-fit: cover; }
.kl-group-conversation-avatar-item {
  min-width: 0;
  min-height: 0;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: var(--kl-avatar-bg);
  overflow: hidden;
  font-size: 8px;
  font-weight: 850;
  text-transform: uppercase;
}
.kl-group-conversation-avatar[data-avatar-count="1"] .kl-group-conversation-avatar-item {
  grid-area: 1 / 1 / 3 / 3;
  font-size: 11px;
}
.kl-group-conversation-avatar[data-avatar-count="2"] .kl-group-conversation-avatar-item {
  grid-row: 1 / -1;
  font-size: 10px;
}
.kl-group-conversation-avatar-item:nth-child(3) { grid-column: 1 / -1; }
.kl-group-conversation-avatar-item img { width: 100%; height: 100%; object-fit: cover; }
.kl-group-conversation-mark {
  position: absolute;
  z-index: 6;
  right: -3px;
  bottom: -3px;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border: 3px solid var(--kl-sidebar-bg);
  border-radius: 999px;
  background: var(--kl-gold);
  color: #17100a;
  box-shadow: 0 2px 6px rgba(0, 0, 0, .34);
  pointer-events: none;
}
.kl-group-conversation-mark .kl-icon { width: 11px; height: 11px; stroke-width: 2.2; }
.kl-conversation-kind {
  flex: 0 0 auto;
  padding: 1px 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--kl-gold), transparent 82%);
  color: var(--kl-gold);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .06em;
}
.kl-conversation-preview[data-draft="true"] {
  color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 28%);
  font-style: italic;
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
.kl-avatar-button {
  min-width: 0;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 15px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.kl-avatar-button:hover .kl-avatar { border-color: var(--kl-border-strong); filter: brightness(1.08); }
.kl-avatar-button:focus-visible { outline: 2px solid var(--kl-gold); outline-offset: 2px; }
.kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame="blossom"] {
  border-color: #e97c94;
  box-shadow: inset 0 0 0 2px rgba(255, 211, 220, 0.72), 0 0 0 1px rgba(183, 23, 57, 0.25);
}
.kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame="rose"] {
  border-color: #ff5a68;
  box-shadow: inset 0 0 0 2px rgba(112, 7, 24, 0.78), 0 0 0 1px rgba(255, 51, 76, 0.34);
}
.kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame="starlight"] {
  border-color: #b8a8ff;
  box-shadow: inset 0 0 0 2px rgba(119, 105, 222, 0.68), 0 0 0 1px rgba(208, 194, 255, 0.30);
}
.kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame="laurel"] {
  border-color: #d8b65d;
  box-shadow: inset 0 0 0 2px rgba(37, 105, 65, 0.78), 0 0 0 1px rgba(221, 188, 100, 0.34);
}
.kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame="thorn"] {
  border-color: #51d6a0;
  box-shadow: inset 0 0 0 2px rgba(5, 35, 26, 0.88), 0 0 0 1px rgba(45, 201, 143, 0.34);
}
.kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame="moon"] {
  border-color: #b9c7ff;
  box-shadow: inset 0 0 0 2px rgba(62, 68, 142, 0.76), 0 0 8px rgba(133, 154, 255, 0.24);
}
.kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame="ribbon"] {
  border-color: #62e0c2;
  box-shadow: inset 0 0 0 2px rgba(7, 63, 54, 0.78), 0 0 0 1px rgba(78, 224, 194, 0.34);
}
.kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame="laurel"]::after,
.kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame="thorn"]::after,
.kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame="moon"]::after,
.kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame="ribbon"]::after {
  content: "";
  position: absolute;
  z-index: 2;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}
.kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame="laurel"]::after {
  background:
    radial-gradient(ellipse at 10% 22%, #e5c66f 0 2px, transparent 3px),
    radial-gradient(ellipse at 15% 72%, #76a467 0 2px, transparent 3px),
    radial-gradient(ellipse at 87% 18%, #a8c279 0 2px, transparent 3px);
}
.kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame="thorn"]::after {
  background:
    conic-gradient(from 18deg at 9% 18%, transparent 0 38%, #62e6ad 40% 55%, transparent 57%),
    conic-gradient(from 210deg at 87% 18%, transparent 0 40%, #126b4d 42% 57%, transparent 59%),
    conic-gradient(from 110deg at 14% 82%, transparent 0 42%, #2dbb82 44% 58%, transparent 60%);
}
.kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame="moon"]::after {
  background:
    radial-gradient(circle at 16% 17%, transparent 0 4px, #eef1ff 5px 7px, transparent 8px),
    radial-gradient(circle at 84% 20%, #dff7ff 0 1px, transparent 2px),
    radial-gradient(circle at 18% 76%, #b9c7ff 0 1px, transparent 2px);
}
.kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame="ribbon"]::after {
  background:
    linear-gradient(135deg, rgba(102, 232, 202, 0.90) 0 7%, transparent 7% 100%),
    radial-gradient(ellipse at 88% 18%, #9ff5e2 0 3px, transparent 4px),
    radial-gradient(ellipse at 13% 75%, #2fb796 0 2px, transparent 3px);
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
.kl-message-reply {
  min-width: 0;
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  margin: -2px 0 7px;
  padding: 0 2px 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--kl-border-strong), transparent 28%);
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
  line-height: 1.3;
  white-space: nowrap;
}
.kl-message-reply-icon { width: 13px; height: 13px; color: var(--kl-gold); }
.kl-message-reply-copy { min-width: 0; display: flex; align-items: baseline; gap: 5px; }
.kl-message-reply-author { flex: 0 1 auto; overflow: hidden; color: var(--kl-gold); text-overflow: ellipsis; white-space: nowrap; }
.kl-message-reply-excerpt { min-width: 0; flex: 1 1 auto; overflow: hidden; color: var(--kl-muted); text-overflow: ellipsis; white-space: nowrap; }
.kl-message-reply-warning { flex: 0 0 auto; color: var(--kl-warning, #f0b35a); font-size: 9px; text-transform: uppercase; }
.kl-message-row[data-direction="outgoing"] .kl-message-reply { border-bottom-color: color-mix(in srgb, var(--kl-accent-foreground), transparent 70%); }
.kl-message-row[data-direction="outgoing"] .kl-message-reply-author,
.kl-message-row[data-direction="outgoing"] .kl-message-reply-icon { color: color-mix(in srgb, var(--kl-accent-foreground), var(--kl-gold) 28%); }
.kl-message-row[data-direction="outgoing"] .kl-message-reply-excerpt { color: color-mix(in srgb, var(--kl-accent-foreground), transparent 34%); }
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
.kl-contact-toolbar { min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.kl-contact-controls { min-width: 0; display: flex; align-items: center; gap: 6px; }
.kl-contact-controls .kl-select { width: auto; min-width: 112px; height: 36px; padding-inline: 8px 28px; font-size: var(--kl-type-xs); }
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
.kl-contact-meta { display: flex; align-items: center; gap: 7px; }
.kl-contact-number,
.kl-contact-empty { color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-contact-native-state { color: var(--kl-meta); font-size: var(--kl-type-xs); }
.kl-contact-native-state::before { content: "\xB7"; margin-right: 7px; }
.kl-contact[data-native-state="online"] .kl-contact-native-state,
.kl-contact[data-native-state="room"] .kl-contact-native-state { color: #68d391; }
.kl-contact[data-native-state="room"] { border-color: color-mix(in srgb, var(--kl-accent), transparent 78%); }
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
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 13px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: default;
}
.kl-roster-entry:hover { background: var(--kl-surface-hover); }
.kl-roster-entry:focus-within { background: color-mix(in srgb, var(--kl-surface-hover), transparent 18%); }
.kl-roster-entry[data-selected="true"] {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 28%);
  background: color-mix(in srgb, var(--kl-accent), transparent 87%);
}
.kl-roster-entry .kl-avatar { width: 42px; height: 42px; border-radius: 13px; }
.kl-roster-entry-select {
  min-width: 0;
  align-self: stretch;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.kl-roster-entry-select:focus-visible { border-radius: 8px; box-shadow: 0 0 0 2px var(--kl-gold); }
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
  place-items: start center;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  border: 1px solid var(--kl-border);
  border-radius: 14px;
  background:
    radial-gradient(ellipse at 50% 42%, color-mix(in srgb, var(--kl-gold), transparent 93%), transparent 62%),
    var(--kl-input-bg);
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
}
.kl-custom-character-canvas {
  width: min(100%, 250px);
  height: auto;
  max-width: 100%;
  display: block;
  cursor: crosshair;
  touch-action: pan-y;
}
.kl-custom-character-stage:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: -2px; }
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
  .kl-custom-character-stage {
    place-items: center;
    overflow-y: hidden;
    touch-action: manipulation;
  }
  .kl-custom-character-canvas {
    width: auto;
    height: min(100%, 390px);
    touch-action: manipulation;
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
  .kl-topbar { cursor: default; touch-action: auto; }
  .kl-brand,
  .kl-topbar-drag-space { cursor: default; }

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
  .kl-home-update { grid-template-columns: 36px minmax(0, 1fr); margin-top: 0; }
  .kl-home-update-button { grid-column: 1 / -1; width: 100%; }
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
  .kl-news-trigger { width: 44px; min-height: 44px; justify-content: center; padding: 0; }
  .kl-news-trigger-label { display: none; }
  .kl-topbar-context { display: none; }
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
  .kl-news-feed { padding: 14px 12px 24px; }
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
  .kl-topbar { gap: 5px; padding-inline: 8px; }
  .kl-topbar-context { display: none; }
  .kl-contact-toolbar { align-items: stretch; flex-direction: column; }
  .kl-contact-controls { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kl-contact-controls .kl-select { width: 100%; min-width: 0; }
  .kl-gallery-storage-options { grid-template-columns: minmax(0, 1fr); }
  .kl-gallery-storage-choice { min-height: 64px; }
  .kl-gallery-retention-field { grid-column: 1; }
  .kl-news-release { grid-template-columns: 18px minmax(0, 1fr); }
  .kl-news-release-card { margin-left: 5px; padding: 13px; }
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
  z-index: 10;
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
.kl-profile-bio-input {
  width: 100%;
  min-height: 74px;
  max-height: 140px;
  padding: 10px 12px;
  border-radius: 12px;
  resize: vertical;
  line-height: 1.45;
}
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
.kl-profile-menu-target {
  cursor: pointer;
  -webkit-touch-callout: none;
}
.kl-profile-menu-target.kl-avatar {
  transition: border-color 140ms ease, box-shadow 140ms ease, filter 140ms ease, transform 140ms ease;
}
.kl-profile-menu-target.kl-avatar:hover {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 34%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--kl-accent), transparent 82%);
  filter: brightness(1.06);
  transform: translateY(-1px);
}
.kl-profile-menu-target:not(button):focus-visible {
  outline: 2px solid var(--kl-gold);
  outline-offset: 3px;
}
.kl-profile-menu-layer::backdrop { background: transparent; }
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
.kl-profile-style-fields {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.kl-profile-style-fields .kl-select { width: 100%; min-width: 0; }
.kl-profile-banner-field,
.kl-profile-outline-field,
.kl-profile-gradient-field {
  min-width: 0;
  display: grid;
  gap: 9px;
  padding: 12px;
  border: 1px solid var(--kl-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 10%);
}
.kl-profile-gradient-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}
.kl-profile-gradient-controls > label {
  min-width: 0;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
}
.kl-profile-gradient-color {
  width: 48px;
  height: 40px;
  padding: 3px;
  border: 1px solid var(--kl-border-strong);
  border-radius: 11px;
  background: var(--kl-input-bg);
  cursor: pointer;
}
.kl-profile-banner-preview {
  position: relative;
  min-width: 0;
  width: 100%;
  aspect-ratio: 3 / 1;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--kl-border-strong);
  border-radius: 12px;
  background:
    radial-gradient(circle at 78% 12%, color-mix(in srgb, var(--kl-accent), transparent 62%), transparent 25%),
    linear-gradient(125deg, var(--kl-surface-hover), var(--kl-surface));
  color: var(--kl-muted);
  text-align: center;
}
.kl-profile-banner-preview::after {
  content: "";
  position: absolute;
  z-index: 2;
  inset: 0;
  background: linear-gradient(to bottom, transparent 52%, rgba(0, 0, 0, 0.22));
  pointer-events: none;
}
.kl-profile-banner-preview img {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;
}
.kl-profile-banner-preview[data-banner-state="loading"]::before,
.kl-addon-profile-banner[data-banner-state="loading"]::before {
  content: "";
  position: absolute;
  z-index: 1;
  inset: 0;
  background: linear-gradient(105deg, transparent 25%, rgba(255, 255, 255, 0.18) 42%, transparent 60%);
  background-size: 240% 100%;
  animation: kl-image-loading 1.25s linear infinite;
  pointer-events: none;
}
.kl-profile-banner-preview[data-banner-state="error"] {
  border-color: color-mix(in srgb, var(--kl-danger), transparent 34%);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--kl-danger), transparent 91%), transparent),
    var(--kl-surface-2);
}
.kl-profile-banner-actions {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}
.kl-profile-banner-actions > :first-child { flex: 1 1 180px; min-width: 0; }
.kl-profile-banner-status {
  min-height: 18px;
  margin: 0;
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
  overflow-wrap: anywhere;
}
.kl-profile-banner-status[data-tone="success"] { color: var(--kl-success); }
.kl-profile-banner-status[data-tone="warning"] { color: var(--kl-gold); }
.kl-profile-banner-status[data-tone="error"] { color: var(--kl-danger); }
.kl-profile-outline-controls {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 9px;
}
.kl-profile-outline-controls input[type="color"] {
  width: 48px;
  height: 40px;
  flex: 0 0 auto;
  padding: 3px;
  border: 1px solid var(--kl-border-strong);
  border-radius: 11px;
  background: var(--kl-input-bg);
  cursor: pointer;
}
.kl-profile-outline-controls input[type="text"] { flex: 1 1 128px; min-width: 0; }
.kl-profile-outline-controls .kl-text-button { flex: 0 0 auto; }
.kl-addon-profile-dialog {
  width: min(640px, calc(100vw - 32px));
  max-height: min(820px, calc(100vh - 32px));
  grid-template-rows: auto minmax(0, 1fr);
}
.kl-addon-profile-dialog-header { position: relative; z-index: 2; }
.kl-addon-profile-body {
  min-height: 0;
  overflow: auto;
  padding: 16px;
  overscroll-behavior: contain;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-addon-profile-loading {
  min-height: 260px;
  display: grid;
  place-items: center;
  padding: 24px;
  color: var(--kl-muted);
  font-weight: 750;
  text-align: center;
}
.kl-addon-profile-unavailable {
  max-width: 480px;
  margin: 0 auto;
  line-height: 1.55;
  text-wrap: balance;
}
.kl-addon-profile-card {
  --kl-profile-bg: var(--kl-surface);
  --kl-profile-panel: var(--kl-surface-2);
  --kl-profile-panel-strong: var(--kl-surface-hover);
  --kl-profile-text: var(--kl-text);
  --kl-profile-muted: var(--kl-muted);
  --kl-profile-border: var(--kl-border);
  --kl-profile-border-strong: var(--kl-border-strong);
  --kl-profile-outline: var(--kl-profile-border-strong);
  --kl-profile-highlight: var(--kl-gold);
  --kl-profile-banner-height: clamp(112px, calc((100vw - 64px) / 3), 200px);
  --kl-profile-banner:
    radial-gradient(circle at 78% 14%, color-mix(in srgb, var(--kl-accent), white 14%) 0 5%, transparent 21%),
    linear-gradient(120deg, color-mix(in srgb, var(--kl-accent), #18070b 34%), color-mix(in srgb, var(--kl-gold), #251706 54%));
  position: relative;
  overflow: hidden;
  border: 1px solid var(--kl-profile-outline, var(--kl-profile-border-strong));
  border-radius: 24px;
  background: var(--kl-profile-bg);
  color: var(--kl-profile-text);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.30);
  isolation: isolate;
}
.kl-addon-profile-card[data-profile-outline]:not([data-profile-outline=""]),
.kl-addon-profile-card[data-custom-outline="true"] {
  border-color: var(--kl-profile-outline, var(--kl-profile-border-strong));
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.30),
    0 0 0 2px color-mix(in srgb, var(--kl-profile-outline, var(--kl-profile-border-strong)), transparent 34%),
    0 0 24px color-mix(in srgb, var(--kl-profile-outline, var(--kl-profile-border-strong)), transparent 74%);
}
.kl-addon-profile-card[data-profile-style="garden"] {
  --kl-profile-bg: #10231b;
  --kl-profile-panel: #183127;
  --kl-profile-panel-strong: #214435;
  --kl-profile-text: #f3f5e8;
  --kl-profile-muted: #b8cab9;
  --kl-profile-border: rgba(190, 218, 172, 0.20);
  --kl-profile-border-strong: rgba(217, 177, 105, 0.46);
  --kl-profile-highlight: #e2b86b;
  --kl-profile-banner:
    radial-gradient(circle at 14% 115%, rgba(244, 193, 108, 0.42) 0 9%, transparent 28%),
    radial-gradient(circle at 88% -8%, rgba(227, 113, 131, 0.46) 0 12%, transparent 34%),
    linear-gradient(125deg, #29513a 0%, #173b2c 46%, #612a36 100%);
}
.kl-addon-profile-card[data-profile-style="midnight"] {
  --kl-profile-bg: #10101d;
  --kl-profile-panel: #191a2d;
  --kl-profile-panel-strong: #242542;
  --kl-profile-text: #f5f2ff;
  --kl-profile-muted: #bdb8d3;
  --kl-profile-border: rgba(193, 185, 243, 0.18);
  --kl-profile-border-strong: rgba(181, 166, 255, 0.42);
  --kl-profile-highlight: #d7b7ff;
  --kl-profile-banner:
    radial-gradient(circle at 16% 24%, rgba(255, 225, 149, 0.75) 0 1px, transparent 2px),
    radial-gradient(circle at 71% 34%, rgba(224, 214, 255, 0.72) 0 1px, transparent 2px),
    radial-gradient(circle at 88% 14%, rgba(190, 171, 255, 0.40) 0 7%, transparent 25%),
    linear-gradient(128deg, #24204b, #11162d 58%, #322045);
}
.kl-addon-profile-card[data-custom-gradient="true"] {
  --kl-profile-gradient-primary-safe: color-mix(
    in srgb,
    var(--kl-profile-gradient-primary),
    var(--kl-profile-gradient-tone) 62%
  );
  --kl-profile-gradient-secondary-safe: color-mix(
    in srgb,
    var(--kl-profile-gradient-secondary),
    var(--kl-profile-gradient-tone) 62%
  );
  --kl-profile-bg: color-mix(
    in srgb,
    var(--kl-profile-gradient-primary-safe) 50%,
    var(--kl-profile-gradient-secondary-safe)
  );
  --kl-profile-panel: color-mix(
    in srgb,
    var(--kl-profile-bg),
    var(--kl-profile-gradient-tone) 24%
  );
  --kl-profile-panel-strong: color-mix(
    in srgb,
    var(--kl-profile-bg),
    var(--kl-profile-gradient-tone) 34%
  );
  --kl-profile-muted: color-mix(in srgb, var(--kl-profile-text), transparent 28%);
  --kl-profile-border: color-mix(in srgb, var(--kl-profile-text), transparent 78%);
  --kl-profile-border-strong: color-mix(in srgb, var(--kl-profile-text), transparent 60%);
  --kl-profile-highlight: var(--kl-profile-text);
  --kl-profile-banner: linear-gradient(
    125deg,
    var(--kl-profile-gradient-primary-safe),
    var(--kl-profile-gradient-secondary-safe)
  );
  background: linear-gradient(
    145deg,
    var(--kl-profile-gradient-primary-safe),
    var(--kl-profile-gradient-secondary-safe)
  );
}
.kl-addon-profile-hero {
  position: relative;
  min-width: 0;
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
  padding: calc(var(--kl-profile-banner-height) - 46px) 22px 22px;
}
.kl-addon-profile-banner {
  position: absolute;
  z-index: 0;
  inset: 0 0 auto;
  height: var(--kl-profile-banner-height);
  overflow: hidden;
  background: var(--kl-profile-banner);
  border-bottom: 1px solid var(--kl-profile-border);
}
.kl-addon-profile-banner > img,
.kl-addon-profile-banner-image {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;
}
.kl-addon-profile-banner::after {
  content: "";
  position: absolute;
  z-index: 2;
  inset: 0;
  opacity: 0.42;
  background:
    linear-gradient(to bottom, transparent 45%, color-mix(in srgb, var(--kl-profile-bg), transparent 68%) 100%),
    linear-gradient(115deg, transparent 0 52%, rgba(255, 255, 255, 0.13) 52% 53%, transparent 53% 100%),
    repeating-linear-gradient(90deg, transparent 0 34px, rgba(255, 255, 255, 0.035) 34px 35px);
  pointer-events: none;
}
.kl-addon-profile-avatar-shell {
  position: relative;
  z-index: 3;
  width: 108px;
  height: 108px;
  display: grid;
  place-items: center;
  padding: 6px;
  border: 1px solid var(--kl-profile-border-strong);
  border-radius: 34px;
  background: var(--kl-profile-bg);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.30);
}
.kl-addon-profile-avatar {
  width: 94px;
  height: 94px;
  border: 2px solid var(--kl-profile-bg);
  border-radius: 28px;
  background: var(--kl-avatar-bg);
  color: var(--kl-profile-text);
  font-size: 24px;
}
.kl-addon-profile-avatar-shell > .kl-presence-dot {
  position: absolute;
  z-index: 10;
  right: -1px;
  bottom: -1px;
  width: 20px;
  height: 20px;
  border: 4px solid var(--kl-profile-bg);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--kl-profile-text), transparent 72%),
    0 2px 7px rgba(0, 0, 0, 0.38);
}
.kl-addon-profile-avatar-shell[data-frame="blossom"] {
  border-color: rgba(255, 205, 215, 0.72);
  background:
    repeating-conic-gradient(from 8deg, #f8c8d2 0 8deg, #c91f42 8deg 14deg, transparent 14deg 24deg),
    var(--kl-profile-bg);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.30), 0 0 0 3px rgba(215, 25, 50, 0.14);
}
.kl-addon-profile-avatar-shell[data-frame="rose"] {
  border-color: rgba(255, 105, 116, 0.82);
  background:
    conic-gradient(from 35deg, #570817, #ff4358, #8f0c25, #ff7a82, #570817),
    var(--kl-profile-bg);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.30), 0 0 0 3px rgba(255, 54, 79, 0.16);
}
.kl-addon-profile-avatar-shell[data-frame="starlight"] {
  border-color: rgba(214, 203, 255, 0.76);
  background:
    conic-gradient(from 18deg, #6655dd, #d3a8ff, #765ee8, #eadcff, #6655dd),
    var(--kl-profile-bg);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.30), 0 0 18px rgba(150, 128, 255, 0.30);
}
.kl-addon-profile-avatar-shell[data-frame="laurel"] {
  border-color: rgba(229, 199, 111, 0.78);
  background:
    conic-gradient(from 12deg, #274f36, #d7b75d, #3e744c, #ead17e, #274f36),
    var(--kl-profile-bg);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.30), 0 0 0 3px rgba(96, 142, 80, 0.15);
}
.kl-addon-profile-avatar-shell[data-frame="thorn"] {
  border-color: rgba(87, 226, 168, 0.82);
  background:
    repeating-conic-gradient(from 8deg, #031c14 0 11deg, #2fc18a 11deg 16deg, #010c08 16deg 25deg),
    var(--kl-profile-bg);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.34), 0 0 0 3px rgba(45, 202, 143, 0.17);
}
.kl-addon-profile-avatar-shell[data-frame="moon"] {
  border-color: rgba(200, 209, 255, 0.82);
  background:
    conic-gradient(from 30deg, #293063, #9facf2, #303b83, #e8f5ff, #293063),
    var(--kl-profile-bg);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.30), 0 0 21px rgba(122, 143, 255, 0.34);
}
.kl-addon-profile-avatar-shell[data-frame="ribbon"] {
  border-color: rgba(105, 235, 205, 0.84);
  background:
    conic-gradient(from 45deg, #075446, #64e2c4, #1c9a7d, #063b32, #a3f4e2, #075446),
    var(--kl-profile-bg);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.30), 0 0 0 3px rgba(52, 206, 169, 0.16);
}
.kl-addon-profile-avatar-shell[data-frame="blossom"]::after,
.kl-addon-profile-avatar-shell[data-frame="rose"]::after,
.kl-addon-profile-avatar-shell[data-frame="starlight"]::after,
.kl-addon-profile-avatar-shell[data-frame="laurel"]::after,
.kl-addon-profile-avatar-shell[data-frame="thorn"]::after,
.kl-addon-profile-avatar-shell[data-frame="moon"]::after,
.kl-addon-profile-avatar-shell[data-frame="ribbon"]::after {
  position: absolute;
  z-index: 4;
  pointer-events: none;
}
.kl-addon-profile-avatar-shell[data-frame="blossom"]::after {
  content: "";
  inset: -8px;
  background:
    radial-gradient(circle at 9% 10%, #ffd7df 0 4px, transparent 5px),
    radial-gradient(circle at 91% 22%, #f2a8b8 0 4px, transparent 5px),
    radial-gradient(circle at 62% 94%, #c91f42 0 4px, transparent 5px),
    radial-gradient(circle at 16% 78%, #f5bdc9 0 3px, transparent 4px);
}
.kl-addon-profile-avatar-shell[data-frame="rose"]::after {
  content: "";
  inset: -7px;
  background:
    radial-gradient(ellipse at 92% 52%, #ff7380 0 5px, transparent 6px),
    radial-gradient(ellipse at 12% 24%, #b92848 0 5px, transparent 6px),
    radial-gradient(ellipse at 77% 4%, #ffc2c8 0 3px, transparent 4px);
}
.kl-addon-profile-avatar-shell[data-frame="starlight"]::after {
  content: "";
  inset: -8px;
  background:
    radial-gradient(circle at 91% 9%, #f4eaff 0 3px, transparent 4px),
    radial-gradient(circle at 10% 34%, #d7c8ff 0 3px, transparent 4px),
    radial-gradient(circle at 58% 94%, #9fc5ff 0 3px, transparent 4px),
    radial-gradient(circle at 24% 89%, #fff 0 2px, transparent 3px);
}
.kl-addon-profile-avatar-shell[data-frame="laurel"]::after {
  content: "";
  inset: -8px;
  background:
    radial-gradient(ellipse at 7% 19%, #83ad70 0 3px, transparent 4px),
    radial-gradient(ellipse at 10% 47%, #d7b75d 0 4px, transparent 5px),
    radial-gradient(ellipse at 18% 82%, #6b9b63 0 4px, transparent 5px),
    radial-gradient(ellipse at 91% 27%, #e7cb7b 0 4px, transparent 5px),
    radial-gradient(ellipse at 82% 4%, #7da269 0 3px, transparent 4px);
}
.kl-addon-profile-avatar-shell[data-frame="thorn"]::after {
  content: "";
  inset: -8px;
  background:
    conic-gradient(from 14deg at 7% 16%, transparent 0 40%, #65e9b0 42% 55%, transparent 57%),
    conic-gradient(from 194deg at 93% 24%, transparent 0 40%, #0d6246 42% 57%, transparent 59%),
    conic-gradient(from 92deg at 12% 78%, transparent 0 40%, #27ae79 42% 57%, transparent 59%),
    conic-gradient(from 272deg at 63% 96%, transparent 0 40%, #45cf96 42% 57%, transparent 59%);
}
.kl-addon-profile-avatar-shell[data-frame="moon"]::after {
  content: "";
  inset: -8px;
  background:
    radial-gradient(circle at 8% 18%, transparent 0 7px, #edf0ff 8px 11px, transparent 12px),
    radial-gradient(circle at 89% 20%, #dcf4ff 0 3px, transparent 4px),
    radial-gradient(circle at 14% 66%, #b9c7ff 0 2px, transparent 3px),
    radial-gradient(circle at 61% 96%, #fff 0 2px, transparent 3px);
}
.kl-addon-profile-avatar-shell[data-frame="ribbon"]::after {
  content: "";
  inset: -8px;
  background:
    linear-gradient(135deg, #69e4c7 0 7%, transparent 7% 100%),
    radial-gradient(ellipse at 92% 22%, #a4f5e2 0 5px, transparent 6px),
    radial-gradient(ellipse at 12% 71%, #2fb594 0 4px, transparent 5px),
    radial-gradient(ellipse at 60% 96%, #6bdbc0 0 3px, transparent 4px);
}
.kl-addon-profile-identity {
  position: relative;
  z-index: 1;
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 5px;
  padding-right: 12px;
  /* The hero itself starts 46px above the banner edge; 56px keeps copy 10px below it. */
  padding-top: 56px;
}
.kl-addon-profile-identity h2 {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  margin: 0;
  display: -webkit-box;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(22px, 4vw, 28px);
  line-height: 1.08;
  word-break: break-word;
}
.kl-addon-profile-native-name,
.kl-addon-profile-member { margin: 0; color: var(--kl-profile-muted); font-size: var(--kl-type-xs); }
.kl-addon-profile-badges { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 3px; }
.kl-addon-profile-badge {
  display: inline-flex;
  align-items: center;
  min-height: 21px;
  padding: 2px 7px;
  border: 1px solid color-mix(in srgb, var(--kl-profile-highlight), transparent 50%);
  border-radius: 999px;
  background: color-mix(in srgb, var(--kl-profile-highlight), transparent 86%);
  color: var(--kl-profile-highlight);
  font-size: var(--kl-type-xxs);
  font-weight: 850;
  letter-spacing: 0.06em;
}
.kl-addon-profile-badge--owner { border-color: color-mix(in srgb, #a855f7, transparent 55%); background: color-mix(in srgb, #a855f7, transparent 84%); color: color-mix(in srgb, #a855f7 68%, var(--kl-profile-text)); }
.kl-addon-profile-badge--saved { border-color: var(--kl-profile-border-strong); background: color-mix(in srgb, var(--kl-profile-muted), transparent 88%); color: var(--kl-profile-muted); }
.kl-addon-profile-badge--sub { border-color: color-mix(in srgb, #299de0, transparent 55%); background: color-mix(in srgb, #299de0, transparent 84%); color: color-mix(in srgb, #299de0 68%, var(--kl-profile-text)); }
.kl-addon-profile-badge--lover { border-color: color-mix(in srgb, #e44386, transparent 54%); background: color-mix(in srgb, #e44386, transparent 84%); color: color-mix(in srgb, #e44386 68%, var(--kl-profile-text)); }
.kl-addon-profile-badge--whitelist { border-color: color-mix(in srgb, #258bd0, transparent 55%); background: color-mix(in srgb, #258bd0, transparent 84%); color: color-mix(in srgb, #258bd0 68%, var(--kl-profile-text)); }
.kl-addon-profile-badge--blacklist,
.kl-addon-profile-badge--ghosted { border-color: color-mix(in srgb, #d53b4d, transparent 54%); background: color-mix(in srgb, #d53b4d, transparent 84%); color: color-mix(in srgb, #d53b4d 68%, var(--kl-profile-text)); }
.kl-addon-profile-status {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 7px;
  margin-top: 4px;
  color: var(--kl-profile-muted);
  font-size: var(--kl-type-sm);
}
.kl-addon-profile-status > .kl-presence-dot { border-color: var(--kl-profile-bg); }
.kl-addon-profile-status > strong { color: var(--kl-profile-text); }
.kl-addon-profile-custom-status { min-width: 0; overflow-wrap: anywhere; }
.kl-addon-profile-show-avatar,
.kl-addon-profile-show-banner { width: fit-content; min-height: 32px; margin-top: 4px; padding: 4px 9px; }
.kl-addon-profile-avatar-note,
.kl-addon-profile-banner-note { display: block; margin-top: 4px; color: var(--kl-profile-muted); font-size: var(--kl-type-xxs); }
.kl-addon-profile-bio {
  display: grid;
  gap: 5px;
  margin: 0 22px 16px;
  padding: 11px 13px;
  border: 1px solid var(--kl-profile-border);
  border-radius: 13px;
  background: var(--kl-profile-panel);
}
.kl-addon-profile-bio-label {
  color: var(--kl-profile-muted);
  font-size: var(--kl-type-xxs);
  font-weight: 850;
  letter-spacing: 0.08em;
}
.kl-addon-profile-bio p {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--kl-profile-text);
  line-height: 1.45;
}
.kl-addon-profile-facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 0 22px 18px;
}
.kl-addon-profile-fact {
  min-width: 0;
  min-height: 63px;
  display: grid;
  align-content: center;
  gap: 3px;
  padding: 10px 12px;
  border: 1px solid var(--kl-profile-border);
  border-radius: 13px;
  background: var(--kl-profile-panel);
}
.kl-addon-profile-fact > span {
  color: var(--kl-profile-muted);
  font-size: var(--kl-type-xxs);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.kl-addon-profile-fact > strong { overflow-wrap: anywhere; font-size: var(--kl-type-sm); }
.kl-addon-profile-private {
  display: grid;
  gap: 6px;
  margin: 0 22px 18px;
  padding: 12px;
  border: 1px dashed var(--kl-profile-border-strong);
  border-radius: 14px;
  background: color-mix(in srgb, var(--kl-profile-panel), transparent 12%);
}
.kl-addon-profile-private p { margin: 0; overflow-wrap: anywhere; color: var(--kl-profile-muted); font-size: var(--kl-type-xs); }
.kl-addon-profile-section-title { display: flex; align-items: center; gap: 7px; color: var(--kl-profile-highlight); font-size: var(--kl-type-sm); }
.kl-addon-profile-section-title .kl-icon { width: 16px; height: 16px; }
.kl-addon-profile-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
  padding: 0 22px 22px;
}
.kl-addon-profile-action {
  width: 100%;
  min-width: 0;
  min-height: 42px;
  padding-inline: 10px;
  overflow-wrap: anywhere;
}
.kl-addon-profile-action--primary { grid-column: span 2; }
.kl-addon-profile-action:disabled { opacity: 0.48; cursor: not-allowed; }
.kl-addon-profile-card[data-profile-style="garden"] .kl-addon-profile-action:not(.kl-text-button--primary),
.kl-addon-profile-card[data-profile-style="midnight"] .kl-addon-profile-action:not(.kl-text-button--primary) {
  border-color: var(--kl-profile-border);
  background: var(--kl-profile-panel);
  color: var(--kl-profile-text);
}
.kl-addon-profile-card[data-profile-style="garden"] .kl-addon-profile-action:not(.kl-text-button--primary):hover,
.kl-addon-profile-card[data-profile-style="midnight"] .kl-addon-profile-action:not(.kl-text-button--primary):hover {
  background: var(--kl-profile-panel-strong);
}
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
.kl-gallery-storage-options {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
  margin: 0;
  padding: 0;
  border: 0;
}
.kl-gallery-storage-options[hidden] { display: none; }
.kl-gallery-storage-options legend { grid-column: 1 / -1; margin-bottom: 1px; color: var(--kl-gold); font-size: var(--kl-type-xs); font-weight: 850; letter-spacing: 0.08em; }
.kl-gallery-storage-choice {
  position: relative;
  min-width: 0;
  min-height: 84px;
  display: grid;
  grid-template-columns: 25px minmax(0, 1fr);
  gap: 7px;
  align-items: start;
  padding: 10px;
  border: 1px solid var(--kl-border);
  border-radius: 12px;
  background: var(--kl-surface);
  cursor: pointer;
}
.kl-gallery-storage-choice:hover { border-color: var(--kl-border-strong); background: var(--kl-surface-2); }
.kl-gallery-storage-choice[data-active="true"] { border-color: color-mix(in srgb, var(--kl-gold), transparent 38%); background: color-mix(in srgb, var(--kl-gold), transparent 90%); box-shadow: inset 0 -2px var(--kl-gold); }
.kl-gallery-storage-choice input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.kl-gallery-storage-choice:has(input:focus-visible) { outline: 2px solid color-mix(in srgb, var(--kl-accent), var(--kl-gold) 28%); outline-offset: 2px; }
.kl-gallery-storage-icon { width: 25px; height: 25px; display: grid; place-items: center; border-radius: 8px; background: var(--kl-surface-2); color: var(--kl-gold); }
.kl-gallery-storage-icon .kl-icon { width: 15px; height: 15px; }
.kl-gallery-storage-copy { min-width: 0; display: grid; gap: 2px; }
.kl-gallery-storage-copy strong { font-size: var(--kl-type-sm); }
.kl-gallery-storage-copy small { color: var(--kl-muted); font-size: var(--kl-type-xxs); line-height: 1.35; }
.kl-gallery-retention-field { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 10px; border: 1px solid var(--kl-border); border-radius: 11px; background: var(--kl-input-bg); color: var(--kl-muted); font-size: var(--kl-type-xs); font-weight: 750; }
.kl-gallery-retention-field[hidden] { display: none; }
.kl-gallery-retention { width: 138px; height: 36px; }
.kl-image-file-privacy { display: flex; align-items: flex-start; gap: 7px; }
.kl-image-file-privacy-icon { width: 16px; height: 16px; flex: 0 0 auto; display: grid; place-items: center; margin-top: 1px; color: var(--kl-gold); }
.kl-image-file-privacy-icon .kl-icon { width: 16px; height: 16px; }
.kl-local-image-thumbnail { width: 54px; height: 54px; flex: 0 0 auto; object-fit: cover; border-radius: 10px; background: #09090a; }
.kl-message-content { line-height: 1.48; unicode-bidi: plaintext; white-space: pre-wrap; }
.kl-message-action-text { font-style: italic; }
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
.kl-room-player-avatar-button { border-radius: 11px; }
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
.kl-presence-trigger > .kl-presence-dot { position: absolute; z-index: 10; right: 9px; top: 50%; margin-top: -4px; }
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
.kl-lobby-card[data-has-friends="true"] { border-color: color-mix(in srgb, var(--kl-accent), transparent 42%); background: color-mix(in srgb, var(--kl-accent), transparent 94%); }
.kl-lobby-card[data-favorite="true"] { border-color: color-mix(in srgb, var(--kl-gold), transparent 36%); background: color-mix(in srgb, var(--kl-gold), transparent 92%); box-shadow: inset 3px 0 color-mix(in srgb, var(--kl-gold), transparent 12%); }
.kl-lobby-card[data-current="true"] { border-color: color-mix(in srgb, var(--kl-success), transparent 30%); box-shadow: inset 3px 0 color-mix(in srgb, var(--kl-success), transparent 8%); }
.kl-lobby-card-main { min-width: 0; display: flex; align-items: center; gap: 8px; }
.kl-lobby-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-lobby-count,
.kl-lobby-friend-label { flex: 0 0 auto; padding: 2px 6px; border-radius: 999px; background: var(--kl-surface-2); color: var(--kl-muted); font-size: var(--kl-type-xxs); font-weight: 800; }
.kl-lobby-friend-label { background: color-mix(in srgb, var(--kl-accent), transparent 84%); color: color-mix(in srgb, var(--kl-accent-strong), white 18%); }
.kl-lobby-favorite { width: 30px; height: 30px; margin-left: auto; border-color: transparent; background: transparent; color: var(--kl-muted); }
.kl-lobby-favorite:hover,
.kl-lobby-favorite[aria-pressed="true"] { border-color: color-mix(in srgb, var(--kl-gold), transparent 55%); background: color-mix(in srgb, var(--kl-gold), transparent 86%); color: var(--kl-gold); }
.kl-lobby-favorite-icon { width: 16px; height: 16px; }
.kl-lobby-description { margin: 0; overflow: hidden; color: var(--kl-muted); font-size: var(--kl-type-xs); text-overflow: ellipsis; white-space: nowrap; }
.kl-lobby-card-footer { min-width: 0; display: flex; align-items: center; gap: 9px; }
.kl-lobby-flags { min-width: 0; margin-right: auto; overflow: hidden; color: var(--kl-meta); font-size: var(--kl-type-xxs); text-overflow: ellipsis; white-space: nowrap; }
.kl-lobby-friends { display: flex; flex: 0 0 auto; align-items: center; padding-left: 6px; }
.kl-lobby-friend-avatar { width: 27px; height: 27px; margin-left: -6px; border: 2px solid var(--kl-panel-bg); border-radius: 9px; font-size: 9px; }
.kl-lobby-friend-more { margin-left: 3px; color: var(--kl-muted); font-size: var(--kl-type-xxs); }
.kl-lobby-join { min-height: 32px; padding: 4px 10px; }
.kl-lobby-current { flex: 0 0 auto; min-height: 32px; display: inline-flex; align-items: center; padding: 4px 10px; border: 1px solid color-mix(in srgb, var(--kl-success), transparent 48%); border-radius: 9px; background: color-mix(in srgb, var(--kl-success), transparent 88%); color: var(--kl-success); font-size: var(--kl-type-xs); font-weight: 800; }
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
.kl-music-add input[type="file"] { min-width: 0; width: 100%; max-width: 100%; overflow: hidden; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-music-add input[type="file"]::file-selector-button { min-height: 34px; margin-right: 8px; padding: 5px 9px; border: 1px solid var(--kl-border); border-radius: 9px; background: var(--kl-surface-2); color: var(--kl-text); font: inherit; cursor: pointer; }
.kl-music-add label,
.kl-music-playlist-toolbar label,
.kl-music-session-options label { display: grid; gap: 5px; color: var(--kl-muted); font-size: var(--kl-type-xs); font-weight: 800; }
.kl-music-playlist-toolbar { position: relative; z-index: 3; display: grid; grid-template-columns: minmax(170px, 1fr) auto; align-items: end; gap: 9px; }
.kl-music-playlist-toolbar label { min-width: 0; flex: 1 1 auto; }
.kl-music-playlist-menu { position: relative; align-self: end; }
.kl-music-playlist-menu > summary { min-height: 38px; display: flex; align-items: center; list-style: none; cursor: pointer; }
.kl-music-playlist-menu > summary::-webkit-details-marker { display: none; }
.kl-music-playlist-actions { position: absolute; z-index: 18; right: 0; top: calc(100% + 5px); width: 150px; display: grid; gap: 3px; padding: 6px; border: 1px solid var(--kl-border-strong); border-radius: 12px; background: var(--kl-panel-bg); box-shadow: 0 14px 34px rgba(0, 0, 0, .35); }
.kl-music-playlist-actions .kl-text-button { width: 100%; min-height: 34px; justify-content: flex-start; padding: 5px 9px; font-size: var(--kl-type-xs); }
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
.kl-music-track-menu-popover { position: absolute; z-index: 12; right: 0; top: calc(100% + 4px); width: 190px; display: grid; gap: 2px; padding: 5px; border: 1px solid var(--kl-border-strong); border-radius: 11px; background: var(--kl-panel-bg); box-shadow: 0 12px 30px rgba(0, 0, 0, .28); }
.kl-music-track-menu-popover button,
.kl-music-track-menu-popover a { min-height: 31px; display: flex; align-items: center; padding: 5px 8px; border: 0; border-radius: 7px; background: transparent; color: var(--kl-text); font: inherit; font-size: var(--kl-type-xs); text-align: left; text-decoration: none; cursor: pointer; }
.kl-music-track-menu-popover button:hover,
.kl-music-track-menu-popover a:hover { background: var(--kl-surface-2); color: var(--kl-gold); }
.kl-music-track-menu-popover .kl-music-track-room { color: var(--kl-gold); }
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

/* Group chats are deliberately separated from direct Beeps in both navigation and content. */
.kl-group-sidebar {
  min-width: 0;
  min-height: 118px;
  max-height: min(38%, 300px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  padding: 9px 8px 10px;
  border-block: 1px solid color-mix(in srgb, var(--kl-gold), var(--kl-border) 68%);
  background:
    linear-gradient(105deg, color-mix(in srgb, var(--kl-accent), transparent 91%), transparent 46%),
    color-mix(in srgb, var(--kl-sidebar-bg), var(--kl-surface-2) 26%);
  box-shadow: inset 3px 0 color-mix(in srgb, var(--kl-accent), var(--kl-gold) 35%);
}
.kl-group-sidebar[data-has-unread="true"] {
  background:
    linear-gradient(105deg, color-mix(in srgb, var(--kl-accent), transparent 84%), transparent 58%),
    color-mix(in srgb, var(--kl-sidebar-bg), var(--kl-surface-2) 30%);
}
.kl-group-sidebar-header {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 3px 8px 8px;
}
.kl-group-sidebar-summary { min-width: 0; display: flex; align-items: center; gap: 6px; }
.kl-group-sidebar-title {
  margin: 0;
  color: var(--kl-gold);
  font-size: var(--kl-type-sm);
  font-weight: 850;
  letter-spacing: .11em;
  text-transform: uppercase;
}
.kl-group-sidebar-title::before {
  content: "";
  width: 7px;
  height: 7px;
  display: inline-block;
  margin-right: 7px;
  border-radius: 2px;
  background: linear-gradient(135deg, var(--kl-accent), var(--kl-gold));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--kl-accent), transparent 84%);
  transform: rotate(45deg);
}
.kl-group-sidebar-count {
  min-width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  padding-inline: 5px;
  border: 1px solid var(--kl-border);
  border-radius: 999px;
  background: var(--kl-surface-2);
  color: var(--kl-muted);
  font-size: 10px;
  font-weight: 850;
  font-variant-numeric: tabular-nums;
}
.kl-group-sidebar-unread {
  min-width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  padding-inline: 5px;
  border-radius: 999px;
  background: var(--kl-accent);
  color: var(--kl-accent-foreground);
  font-size: 10px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--kl-accent), transparent 78%);
}
.kl-group-new,
.kl-group-pin,
.kl-group-remove,
.kl-group-pane-close,
.kl-group-send,
.kl-group-dialog button {
  min-height: 36px;
  padding: 6px 11px;
  border: 1px solid var(--kl-border);
  border-radius: 10px;
  background: var(--kl-surface-2);
  color: var(--kl-text);
  font: inherit;
  font-size: var(--kl-type-xs);
  font-weight: 760;
  cursor: pointer;
}
.kl-group-new {
  min-height: 32px;
  padding: 4px 10px;
  border-color: color-mix(in srgb, var(--kl-gold), transparent 58%);
  background: color-mix(in srgb, var(--kl-gold), transparent 91%);
  color: var(--kl-gold);
}
.kl-group-new:hover,
.kl-group-pin:hover,
.kl-group-pane-close:hover,
.kl-group-dialog button:hover { border-color: var(--kl-border-strong); background: var(--kl-surface-hover); }
.kl-group-remove { color: var(--kl-danger); }
.kl-group-remove:hover { border-color: color-mix(in srgb, var(--kl-danger), transparent 45%); background: color-mix(in srgb, var(--kl-danger), transparent 90%); }
.kl-group-list { min-height: 0; display: grid; align-content: start; gap: 5px; overflow-y: auto; scrollbar-width: thin; }
.kl-group-list-empty { grid-row: 2; align-self: center; margin: 4px 8px 8px; color: var(--kl-muted); font-size: var(--kl-type-xs); text-align: center; }
.kl-group-list-entry { min-width: 0; }
.kl-group-list-item {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  padding: 8px 9px 8px 7px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: var(--kl-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.kl-group-list-item:hover { border-color: var(--kl-border); background: var(--kl-surface-hover); }
.kl-group-list-item[data-has-unread="true"] {
  border-color: color-mix(in srgb, var(--kl-accent), transparent 70%);
  background: color-mix(in srgb, var(--kl-accent), transparent 94%);
}
.kl-group-list-item[data-active="true"] { border-color: color-mix(in srgb, var(--kl-gold), transparent 52%); background: color-mix(in srgb, var(--kl-gold), transparent 90%); }
.kl-group-list-copy { min-width: 0; display: grid; gap: 3px; }
.kl-group-list-topline { min-width: 0; display: flex; align-items: center; gap: 6px; }
.kl-group-list-name { min-width: 0; flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--kl-type-body); font-weight: 780; }
.kl-group-list-badges { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 4px; }
.kl-group-list-pinned { color: var(--kl-gold); font-size: 9px; font-weight: 850; text-transform: uppercase; }
.kl-group-list-unread { min-width: 18px; height: 18px; display: grid; place-items: center; padding-inline: 4px; border-radius: 999px; background: var(--kl-accent); color: var(--kl-accent-foreground); font-size: 10px; font-weight: 850; }
.kl-group-list-preview { overflow: hidden; color: var(--kl-muted); font-size: var(--kl-type-xs); text-overflow: ellipsis; white-space: nowrap; }
.kl-group-list-preview[data-draft="true"] { color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 26%); font-style: italic; }
.kl-group-avatar-stack {
  position: relative;
  width: 62px;
  min-width: 0;
  height: 36px;
  display: flex;
  align-items: center;
  padding-left: 1px;
  isolation: isolate;
}
.kl-group-avatar-stack-item {
  position: relative;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  display: grid;
  place-items: center;
  margin-left: -11px;
  border: 2px solid var(--kl-sidebar-bg);
  border-radius: 10px;
  overflow: visible;
  background: var(--kl-avatar-bg);
  color: var(--kl-text);
  font-size: 10px;
  font-weight: 850;
  text-transform: uppercase;
  box-shadow: 0 3px 9px rgba(0, 0, 0, 0.24);
}
.kl-group-avatar-stack-item:first-child { z-index: 3; margin-left: 0; }
.kl-group-avatar-stack-item:nth-child(2) { z-index: 2; }
.kl-group-avatar-stack-item:nth-child(3) { z-index: 1; }
.kl-group-avatar-stack-item img { width: 100%; height: 100%; display: block; object-fit: cover; }
.kl-group-avatar-stack-item > .kl-presence-dot {
  position: absolute;
  z-index: 10;
  right: -1px;
  bottom: -1px;
  width: 9px;
  height: 9px;
  border-width: 2px;
}
.kl-group-avatar-stack-item .kl-group-member-avatar,
.kl-group-avatar-stack-item.kl-group-member-avatar {
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: inherit;
  font-size: 10px;
  box-shadow: none;
}
.kl-group-avatar-stack-more {
  position: absolute;
  z-index: 4;
  right: -3px;
  bottom: -2px;
  min-width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  margin-left: 0;
  padding-inline: 4px;
  border: 2px solid var(--kl-sidebar-bg);
  border-radius: 999px;
  background: var(--kl-surface-hover);
  color: var(--kl-gold);
  font-size: 9px;
  font-weight: 900;
}

.kl-group-pane {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  background:
    radial-gradient(circle at 12% 0, color-mix(in srgb, var(--kl-accent), transparent 94%), transparent 32%),
    var(--kl-panel-bg);
}
.kl-group-pane-header {
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 8px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--kl-gold), var(--kl-border) 72%);
  background:
    linear-gradient(105deg, color-mix(in srgb, var(--kl-accent), transparent 90%), transparent 48%),
    color-mix(in srgb, var(--kl-surface), transparent 7%);
}
.kl-group-header-avatar {
  --kl-group-outline: var(--kl-gold);
  position: relative;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 2px solid var(--kl-group-outline);
  border-radius: 14px;
  overflow: hidden;
  background: var(--kl-avatar-bg);
  color: var(--kl-text);
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
  isolation: isolate;
}
.kl-group-header-avatar > img,
.kl-group-header-avatar .kl-group-avatar-image { width: 100%; height: 100%; display: block; object-fit: cover; }
.kl-group-header-avatar .kl-group-member-avatar { width: 100%; height: 100%; border: 0; border-radius: inherit; }
.kl-group-pane-heading { min-width: 0; flex: 1 1 auto; display: grid; gap: 1px; }
.kl-group-pane-header .kl-group-pane-heading {
  grid-template-areas:
    "title participants"
    "summary participants";
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 8px;
  align-items: center;
}
.kl-group-pane-header .kl-group-pane-eyebrow { display: none; }
.kl-group-pane-header .kl-group-pane-title-row { grid-area: title; }
.kl-group-pane-header .kl-group-member-summary { grid-area: summary; }
.kl-group-pane-header .kl-group-participant-strip {
  grid-area: participants;
  flex-wrap: nowrap;
  overflow: visible;
  padding: 3px;
}
.kl-group-pane-header .kl-group-participant-item:nth-child(n + 4) { display: none; }
.kl-group-pane-eyebrow {
  color: var(--kl-gold);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .15em;
  text-transform: uppercase;
}
.kl-group-pane-title { margin: 0; overflow: hidden; font-family: Georgia, "Times New Roman", serif; font-size: var(--kl-type-md); font-weight: 850; text-overflow: ellipsis; white-space: nowrap; }
.kl-group-member-summary { margin: 0; overflow: hidden; color: var(--kl-muted); font-size: var(--kl-type-xs); text-overflow: ellipsis; white-space: nowrap; }
.kl-group-participant-strip {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  overflow: visible;
  padding: 2px;
}
.kl-group-participant-item { position: relative; flex: 0 0 auto; }
.kl-group-member-target {
  position: relative;
  min-width: 0;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: default;
}
button.kl-group-member-target { cursor: pointer; }
button.kl-group-member-target:hover .kl-group-member-avatar {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 34%);
  filter: brightness(1.07);
  transform: translateY(-1px);
}
button.kl-group-member-target:focus-visible {
  outline: 2px solid var(--kl-gold);
  outline-offset: 2px;
}
.kl-group-member-avatar {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  font-size: 11px;
  transition: border-color 140ms ease, filter 140ms ease, transform 140ms ease;
}
.kl-group-member-presence {
  position: absolute;
  z-index: 10;
  right: -2px;
  bottom: -2px;
  width: 12px;
  height: 12px;
  border-width: 3px;
}
.kl-group-participant .kl-group-member-avatar { width: 34px; height: 34px; border-radius: 11px; }
.kl-group-pane-actions { min-width: 0; display: flex; align-items: center; justify-content: flex-end; gap: 5px; }
.kl-group-pane-menu,
.kl-group-menu-trigger,
.kl-group-pane-menu-trigger {
  width: 34px;
  height: 34px;
  min-height: 34px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--kl-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 14%);
  color: var(--kl-muted);
  cursor: pointer;
}
.kl-group-pane-menu:hover,
.kl-group-menu-trigger:hover,
.kl-group-pane-menu-trigger:hover { border-color: var(--kl-border-strong); background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-group-pane-menu .kl-icon,
.kl-group-menu-trigger .kl-icon,
.kl-group-pane-menu-trigger .kl-icon { width: 17px; height: 17px; }
.kl-group-pane-title-row { min-width: 0; display: flex; align-items: center; gap: 7px; }
.kl-group-pane-title-row .kl-group-pane-title { min-width: 0; }
.kl-group-creator-badge {
  flex: 0 0 auto;
  padding: 2px 6px;
  border: 1px solid color-mix(in srgb, var(--kl-gold), transparent 52%);
  border-radius: 999px;
  background: color-mix(in srgb, var(--kl-gold), transparent 88%);
  color: var(--kl-gold);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .07em;
  text-transform: uppercase;
}
.kl-group-transcript { min-height: 0; display: grid; grid-template-rows: auto minmax(0, 1fr); overflow: hidden; }
.kl-group-load-older {
  width: fit-content;
  min-height: 34px;
  justify-self: center;
  margin: 9px 10px 0;
  padding: 5px 11px;
  border: 1px solid var(--kl-border);
  border-radius: 999px;
  background: var(--kl-surface-2);
  color: var(--kl-muted);
  font: inherit;
  font-size: var(--kl-type-xs);
  font-weight: 760;
  cursor: pointer;
}
.kl-group-load-older:hover { border-color: var(--kl-border-strong); background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-group-message-log { min-height: 0; display: grid; align-content: start; gap: 10px; overflow-y: auto; padding: 14px 18px 18px; overscroll-behavior: contain; scrollbar-width: thin; }
.kl-group-message-empty { place-self: center; color: var(--kl-muted); text-align: center; }
.kl-group-message {
  width: fit-content;
  max-width: min(72%, 540px);
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  grid-template-areas:
    "profile meta"
    "profile content";
  column-gap: 7px;
  row-gap: 2px;
  justify-self: start;
  padding: 8px 11px 7px 8px;
  border: 1px solid var(--kl-border);
  border-radius: 7px 16px 16px;
  background: var(--kl-message-in);
  box-shadow: 0 4px 13px rgba(0, 0, 0, 0.09);
}
.kl-group-message[data-direction="outgoing"] { justify-self: end; border-color: color-mix(in srgb, var(--kl-accent), transparent 56%); border-radius: 15px 6px 15px 15px; background: var(--kl-message-out); }
.kl-group-message-profile { grid-area: profile; align-self: start; }
.kl-group-message-profile .kl-group-member-avatar { width: 30px; height: 30px; border-radius: 10px; font-size: 10px; }
.kl-group-message-profile--large { width: 30px; height: 30px; }
.kl-group-message-avatar,
.kl-group-message-profile--large .kl-group-member-avatar { width: 30px; height: 30px; border-radius: 10px; font-size: 10px; }
.kl-group-message-meta { grid-area: meta; min-width: 0; display: flex; align-items: baseline; gap: 8px; }
.kl-group-message-author { min-width: 0; flex: 1 1 auto; overflow: hidden; color: var(--kl-gold); font-size: var(--kl-type-xs); text-overflow: ellipsis; white-space: nowrap; }
.kl-group-message-relay-warning { min-width: 0; color: var(--kl-warning, #f0b35a); font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-group-message-time { flex: 0 0 auto; color: var(--kl-meta); font-size: 10px; }
.kl-group-message-content { grid-area: content; min-width: 0; margin: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
.kl-group-composer-area { position: relative; }
.kl-group-composer-label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
.kl-group-title-input,
.kl-group-contact-search {
  width: 100%;
  border: 1px solid var(--kl-border);
  border-radius: 11px;
  outline: none;
  background: var(--kl-input-bg);
  color: var(--kl-text);
  font: inherit;
}
.kl-group-title-input:focus,
.kl-group-contact-search:focus { border-color: var(--kl-border-strong); box-shadow: 0 0 0 3px color-mix(in srgb, var(--kl-accent), transparent 78%); }
.kl-group-composer-row { min-width: 0; grid-template-columns: auto minmax(0, 1fr) auto; }
.kl-group-composer-footer { justify-content: flex-end; }
.kl-group-composer-counter { color: var(--kl-muted); font-size: var(--kl-type-xs); font-variant-numeric: tabular-nums; }
.kl-group-composer-counter[data-near-limit="true"] { color: var(--kl-gold); }
.kl-group-feedback { min-height: 0; margin: 0; padding: 5px 14px 7px; color: var(--kl-muted); font-size: var(--kl-type-xs); background: var(--kl-composer-bg); }
.kl-group-feedback:empty { display: none; }
.kl-group-feedback[data-tone="warning"] { color: var(--kl-gold); }
.kl-group-feedback[data-tone="error"] { color: var(--kl-danger); }
.kl-group-feedback[data-tone="success"] { color: var(--kl-success); }

.kl-group-menu-layer {
  position: fixed;
  z-index: 2147483099;
  inset: 0;
  width: 100vw;
  max-width: none;
  height: 100vh;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: visible;
  background: transparent;
  color: var(--kl-text);
}
.kl-group-menu-layer::backdrop { background: transparent; }
.kl-group-menu {
  position: fixed;
  z-index: 2147483100;
  width: min(310px, calc(100vw - 16px));
  max-height: min(590px, calc(100vh - 16px));
  overflow: auto;
  padding: 7px;
  border: 1px solid var(--kl-border-strong);
  border-radius: 17px;
  background: var(--kl-panel-art), var(--kl-panel-bg);
  color: var(--kl-text);
  box-shadow: 0 20px 58px rgba(0, 0, 0, .58);
  scrollbar-width: thin;
}
.kl-group-menu-header {
  min-width: 0;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 8px 10px;
  border-bottom: 1px solid var(--kl-border);
}
.kl-group-menu-header .kl-group-header-avatar { width: 44px; height: 44px; border-radius: 14px; }
.kl-group-menu-copy { min-width: 0; flex: 1 1 auto; display: grid; gap: 2px; }
.kl-group-menu-title { overflow: hidden; font-weight: 820; text-overflow: ellipsis; white-space: nowrap; }
.kl-group-menu-meta { overflow: hidden; color: var(--kl-muted); font-size: var(--kl-type-xs); text-overflow: ellipsis; white-space: nowrap; }
.kl-group-menu-section { display: grid; gap: 2px; padding: 6px 0; }
.kl-group-menu-section + .kl-group-menu-section { border-top: 1px solid var(--kl-border); }
.kl-group-menu-action {
  width: 100%;
  min-height: 39px;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 7px 8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--kl-text);
  font: inherit;
  font-size: var(--kl-type-sm);
  font-weight: 740;
  text-align: left;
  cursor: pointer;
}
.kl-group-menu-action:hover { background: var(--kl-surface-2); }
.kl-group-menu-action:disabled { opacity: .44; cursor: not-allowed; }
.kl-group-menu-action .kl-icon { width: 17px; height: 17px; color: var(--kl-gold); }
.kl-group-menu-action-label { min-width: 0; flex: 1 1 auto; }
.kl-group-menu-action--danger,
.kl-group-menu-action--danger .kl-icon { color: var(--kl-danger); }

.kl-group-dialog {
  width: min(560px, calc(100vw - 24px));
  max-height: min(760px, calc(100vh - 24px));
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--kl-border-strong);
  border-radius: 20px;
  background: var(--kl-panel-bg);
  color: var(--kl-text);
  box-shadow: 0 24px 70px rgba(0, 0, 0, .55);
}
.kl-group-dialog::backdrop { background: rgba(0, 0, 0, .66); backdrop-filter: blur(3px); }
.kl-group-dialog-title { margin: 0; padding: 17px 18px 10px; font-family: Georgia, "Times New Roman", serif; font-size: var(--kl-type-lg); }
.kl-group-dialog-body { min-height: 180px; max-height: min(520px, calc(100vh - 220px)); display: grid; align-content: start; gap: 10px; overflow-y: auto; padding: 8px 18px 16px; }
.kl-group-dialog-label { display: grid; gap: 5px; color: var(--kl-muted); font-size: var(--kl-type-xs); font-weight: 720; }
.kl-group-title-input,
.kl-group-contact-search { height: 42px; padding: 0 11px; }
.kl-group-dialog-help,
.kl-group-selection-status,
.kl-group-dialog-feedback,
.kl-group-confirm-count,
.kl-group-confirm-notice { margin: 0; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-group-contact-list { display: grid; gap: 10px; }
.kl-group-contact-empty { margin: 16px 0; color: var(--kl-muted); text-align: center; }
.kl-group-contact-item {
  min-width: 0;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  padding: 7px 9px;
  border: 1px solid var(--kl-border);
  border-radius: 13px;
  background: var(--kl-surface-2);
  transition: border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease;
}
.kl-group-contact-item:hover { border-color: var(--kl-border-strong); background: var(--kl-surface-hover); }
.kl-group-contact-item:focus-within {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 28%);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--kl-accent), transparent 78%);
}
.kl-group-contact-item[data-selected="true"] {
  border-color: color-mix(in srgb, var(--kl-gold), transparent 36%);
  background: color-mix(in srgb, var(--kl-gold), transparent 90%);
}
.kl-group-dialog .kl-group-contact-profile {
  width: 48px;
  height: 48px;
  min-height: 48px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  overflow: visible;
}
.kl-group-contact-profile .kl-group-member-avatar { width: 42px; height: 42px; border-radius: 13px; }
.kl-group-dialog .kl-group-contact {
  width: 100%;
  min-width: 0;
  min-height: 48px;
  display: grid;
  align-content: center;
  gap: 2px;
  padding: 5px 2px;
  border: 0;
  border-radius: 0;
  background: transparent;
  text-align: left;
}
.kl-group-dialog .kl-group-contact-profile:hover,
.kl-group-dialog .kl-group-contact:hover { border-color: transparent; background: transparent; }
.kl-group-dialog .kl-group-contact-profile:focus-visible,
.kl-group-dialog .kl-group-contact:focus-visible { outline: none; }
.kl-group-contact[aria-pressed="true"] { color: var(--kl-text); }
.kl-group-contact-name { font-weight: 780; }
.kl-group-contact-detail { color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-group-confirm-summary { margin: 4px 0 0; font-size: var(--kl-type-md); font-weight: 820; overflow-wrap: anywhere; }
.kl-group-confirm-members { display: grid; gap: 7px; margin: 2px 0; padding: 0; list-style: none; }
.kl-group-confirm-member {
  min-width: 0;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  padding: 6px 8px;
  border: 1px solid var(--kl-border);
  border-radius: 12px;
  background: var(--kl-surface-2);
  overflow-wrap: anywhere;
}
.kl-group-confirm-profile {
  position: relative;
  width: 40px;
  min-width: 40px;
  height: 40px;
  min-height: 40px !important;
  align-self: center;
  overflow: visible;
}
.kl-group-confirm-profile .kl-group-member-avatar {
  position: absolute;
  inset: 2px;
  width: 36px;
  height: 36px;
  margin: 0;
  border-radius: 12px;
  transform: none;
}
button.kl-group-confirm-profile:hover .kl-group-member-avatar { transform: none; }
.kl-group-confirm-member-copy { min-width: 0; }
.kl-group-confirm-notice { padding: 10px; border: 1px solid var(--kl-border); border-radius: 11px; background: var(--kl-surface-2); }
.kl-group-dialog-feedback { min-height: 22px; padding: 0 18px 5px; }
.kl-group-dialog-feedback[data-tone="error"] { color: var(--kl-danger); }
.kl-group-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 10px 18px 16px; border-top: 1px solid var(--kl-border); }
.kl-group-dialog-confirm,
.kl-group-dialog-review { border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 20%) !important; background: var(--kl-accent) !important; color: var(--kl-accent-foreground) !important; }
.kl-group-sidebar button:disabled,
.kl-group-pane button:disabled,
.kl-group-dialog button:disabled { opacity: .48; cursor: not-allowed; }
.kl-group-sidebar button:focus-visible,
.kl-group-pane button:focus-visible,
.kl-group-dialog button:focus-visible { outline: 2px solid var(--kl-gold); outline-offset: 2px; }

.kl-group-details-dialog {
  width: min(590px, calc(100vw - 24px));
  max-height: min(760px, calc(100vh - 24px));
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--kl-border-strong);
  border-radius: 20px;
  background: var(--kl-panel-bg);
  color: var(--kl-text);
  box-shadow: 0 24px 70px rgba(0, 0, 0, .55);
}
.kl-group-details-dialog::backdrop { background: rgba(0, 0, 0, .66); backdrop-filter: blur(3px); }
.kl-group-details-title { margin: 0; padding: 16px 18px 10px; overflow-wrap: anywhere; font-family: Georgia, "Times New Roman", serif; font-size: var(--kl-type-lg); line-height: 1.16; }
.kl-group-details-body {
  min-height: 180px;
  max-height: min(570px, calc(100vh - 180px));
  display: grid;
  align-content: start;
  gap: 14px;
  overflow-y: auto;
  padding: 8px 18px 18px;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
.kl-group-details-summary {
  min-width: 0;
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 11px;
  border: 1px solid var(--kl-border);
  border-radius: 15px;
  background: var(--kl-surface-2);
}
.kl-group-details-avatar {
  --kl-group-outline: var(--kl-gold);
  position: relative;
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  border: 2px solid var(--kl-group-outline);
  border-radius: 20px;
  overflow: hidden;
  background: var(--kl-avatar-bg);
  color: var(--kl-text);
  font-size: 16px;
  font-weight: 850;
  text-transform: uppercase;
  isolation: isolate;
}
.kl-group-details-avatar > img,
.kl-group-details-avatar .kl-group-avatar-image { width: 100%; height: 100%; display: block; object-fit: cover; }
.kl-group-details-avatar .kl-group-member-avatar { width: 100%; height: 100%; border: 0; border-radius: inherit; }
.kl-group-details-copy { min-width: 0; display: grid; gap: 4px; }
.kl-group-details-copy > strong { overflow-wrap: anywhere; font-size: var(--kl-type-md); }
.kl-group-details-copy > span { color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-group-details-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 10px 18px 16px; border-top: 1px solid var(--kl-border); }
.kl-group-details-actions button,
.kl-group-manage-save,
.kl-group-manage-reset-outline,
.kl-group-manage-kick,
.kl-group-manage-add-button {
  min-height: 36px;
  padding: 6px 11px;
  border: 1px solid var(--kl-border);
  border-radius: 10px;
  background: var(--kl-surface-2);
  color: var(--kl-text);
  font: inherit;
  font-size: var(--kl-type-xs);
  font-weight: 760;
  cursor: pointer;
}
.kl-group-details-actions button:hover,
.kl-group-manage-save:hover,
.kl-group-manage-reset-outline:hover,
.kl-group-manage-add-button:hover { border-color: var(--kl-border-strong); background: var(--kl-surface-hover); }
.kl-group-manage-save { display: inline-flex; align-items: center; justify-content: center; }
.kl-group-manage-notice {
  margin: 0;
  padding: 9px 10px;
  border: 1px solid color-mix(in srgb, var(--kl-gold), transparent 66%);
  border-radius: 11px;
  background: color-mix(in srgb, var(--kl-gold), transparent 93%);
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
}
.kl-group-manage-fields { min-width: 0; display: grid; gap: 11px; }
.kl-group-manage-field {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--kl-border);
  border-radius: 13px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 28%);
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
  font-weight: 740;
}
.kl-group-manage-field > .kl-group-dialog-label,
.kl-group-manage-field > input,
.kl-group-manage-field > .kl-group-manage-upload-help,
.kl-group-manage-field > .kl-group-manage-outline-row { grid-column: 1 / -1; }
.kl-group-manage-upload-help { margin: 2px 0; line-height: 1.4; }
.kl-group-manage-field > .kl-group-menu-action,
.kl-group-manage-field > .kl-group-manage-save {
  width: 100%;
  min-height: 34px;
  justify-content: center;
  padding: 5px 8px;
  border: 1px solid var(--kl-border);
  background: var(--kl-surface-2);
}
.kl-group-manage-field > .kl-group-menu-action:hover,
.kl-group-manage-field > .kl-group-manage-save:hover { border-color: var(--kl-border-strong); background: var(--kl-surface-hover); }
.kl-group-manage-field > .kl-group-menu-action:only-of-type,
.kl-group-manage-field > .kl-group-manage-save:only-of-type { grid-column: 3; }
.kl-group-manage-title,
.kl-group-manage-avatar-url,
.kl-group-manage-add-select {
  width: 100%;
  min-width: 0;
  height: 40px;
  padding: 0 10px;
  border: 1px solid var(--kl-border);
  border-radius: 10px;
  outline: none;
  background: var(--kl-input-bg);
  color: var(--kl-text);
  font: inherit;
}
.kl-group-manage-title:focus,
.kl-group-manage-avatar-url:focus,
.kl-group-manage-add-select:focus { border-color: var(--kl-border-strong); box-shadow: 0 0 0 3px color-mix(in srgb, var(--kl-accent), transparent 78%); }
.kl-group-manage-outline-row { min-width: 0; display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 8px; align-items: center; }
.kl-group-manage-outline { width: 44px; height: 40px; padding: 3px; border: 1px solid var(--kl-border); border-radius: 10px; background: var(--kl-input-bg); cursor: pointer; }
.kl-group-manage-members { display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }
.kl-group-manage-members > .kl-group-menu-title { margin: 0 0 2px; font-size: var(--kl-type-sm); }
.kl-group-manage-member {
  min-width: 0;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  padding: 7px 8px;
  border: 1px solid var(--kl-border);
  border-radius: 12px;
  background: var(--kl-surface-2);
}
.kl-group-manage-member .kl-group-member-avatar { width: 38px; height: 38px; border-radius: 12px; }
.kl-group-manage-member-copy { min-width: 0; display: grid; gap: 2px; }
.kl-group-manage-member-copy > strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-group-manage-member-copy > span { color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-group-manage-member-role {
  width: fit-content;
  padding: 1px 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--kl-gold), transparent 86%);
  color: var(--kl-gold);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .06em;
  text-transform: uppercase;
}
.kl-group-manage-kick { color: var(--kl-danger); }
.kl-group-manage-kick:hover { border-color: color-mix(in srgb, var(--kl-danger), transparent 46%); background: color-mix(in srgb, var(--kl-danger), transparent 90%); }
.kl-group-manage-add { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: end; }
.kl-group-manage-add-button { min-width: 74px; }
.kl-group-details-dialog button:disabled { opacity: .46; cursor: not-allowed; }
.kl-group-details-dialog button:focus-visible { outline: 2px solid var(--kl-gold); outline-offset: 2px; }
.kl-group-manage-notice[data-tone="error"] { border-color: color-mix(in srgb, var(--kl-danger), transparent 60%); background: color-mix(in srgb, var(--kl-danger), transparent 92%); color: var(--kl-danger); }
.kl-group-manage-notice[data-tone="success"] { border-color: color-mix(in srgb, var(--kl-success), transparent 62%); background: color-mix(in srgb, var(--kl-success), transparent 93%); color: var(--kl-success); }

@media (max-width: 900px) {
  .kl-music-body { grid-template-columns: minmax(0, 1fr); overflow-y: auto; overscroll-behavior: contain; }
  .kl-music-library { min-height: 300px; }
  .kl-music-queue { max-height: 250px; }
  .kl-music-side { overflow: visible; }
  .kl-music-player { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .kl-music-controls { justify-content: center; }
}

@media (max-width: 720px) {
  .kl-presence-trigger { min-width: 118px; max-width: 150px; min-height: 42px; padding-right: 21px; }
  .kl-presence-trigger-avatar { width: 32px; height: 32px; }
  .kl-presence-trigger > .kl-presence-dot { right: 7px; }
  .kl-presence-options { grid-template-columns: minmax(0, 1fr); }
  .kl-addon-profile-dialog {
    width: calc(100vw - 16px);
    max-height: calc(100vh - 16px);
    border-radius: 18px;
  }
  .kl-addon-profile-body { padding: 10px; }
  .kl-addon-profile-card { border-radius: 20px; }
  .kl-addon-profile-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kl-addon-profile-actions { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .kl-addon-profile-action { min-height: 44px; }
  .kl-group-sidebar { min-height: 150px; max-height: 42%; }
  .kl-group-new,
  .kl-group-pin,
  .kl-group-remove,
  .kl-group-pane-close,
  .kl-group-send,
  .kl-group-dialog button { min-height: 44px; }
  .kl-group-pane-header { grid-template-columns: 38px minmax(0, 1fr) auto; padding: 7px 10px; }
  .kl-group-header-avatar { width: 38px; height: 38px; border-radius: 12px; }
  .kl-group-pane-menu,
  .kl-group-menu-trigger,
  .kl-group-pane-menu-trigger { width: 40px; height: 40px; min-height: 40px; }
  .kl-group-pane-heading { width: 100%; }
  .kl-group-pane-header .kl-group-pane-heading {
    grid-template-areas: "title" "summary";
    grid-template-columns: minmax(0, 1fr);
  }
  .kl-group-pane-header .kl-group-participant-strip { display: none; }
  .kl-group-pane-actions { justify-content: flex-end; }
  .kl-group-message-log { padding: 13px 11px; }
  .kl-group-message { width: fit-content; max-width: 88%; }
  .kl-group-composer-area { padding: 10px 10px calc(10px + env(safe-area-inset-bottom)); }
  .kl-group-dialog { width: calc(100vw - 12px); max-height: calc(100vh - 12px); border-radius: 16px; }
  .kl-group-dialog-body { max-height: calc(100vh - 200px); padding-inline: 13px; }
  .kl-group-dialog-title { padding-inline: 13px; }
  .kl-group-dialog-actions { padding: 9px 13px 13px; }
  .kl-group-details-dialog { width: calc(100vw - 12px); max-height: calc(100vh - 12px); border-radius: 16px; }
  .kl-group-details-title { padding-inline: 13px; }
  .kl-group-details-body { max-height: calc(100vh - 170px); padding-inline: 13px; }
  .kl-group-details-actions { padding: 9px 13px 13px; }
  .kl-group-details-actions button,
  .kl-group-manage-save,
  .kl-group-manage-reset-outline,
  .kl-group-manage-kick,
  .kl-group-manage-add-button { min-height: 44px; }
  .kl-group-manage-outline-row { grid-template-columns: 44px minmax(0, 1fr); }
  .kl-group-manage-reset-outline { grid-column: 1 / -1; }
  .kl-composer-row { grid-template-columns: 44px minmax(0, 1fr) 48px; gap: 7px; }
  .kl-message-side-actions { opacity: 0.66; transform: none; }
  .kl-message-bubble[data-media="true"] { width: 94%; max-width: 94%; }
  .kl-image-card { min-width: 0; }
  .kl-chat-presence .kl-presence-note { display: none; }
  .kl-lobby-toolbar,
  .kl-room-preset-create { align-items: stretch; flex-direction: column; }
  .kl-lobby-search-wrap,
  .kl-room-preset-create-actions { width: 100%; }
  .kl-lobby-favorite { width: 44px; height: 44px; }
  .kl-lobby-join,
  .kl-lobby-current { min-height: 44px; padding-block: 8px; }
  .kl-music-body { padding: 11px; gap: 10px; }
  .kl-music-library { min-height: 310px; }
  .kl-music-queue { max-height: 260px; }
  .kl-music-playlist-toolbar { grid-template-columns: minmax(0, 1fr) auto; }
  .kl-music-player { gap: 7px; padding: 9px 12px; }
  .kl-music-controls { justify-content: center; flex-wrap: wrap; }
}

@media (max-width: 560px) {
  .kl-brand-copy,
  .kl-local-clock,
  .kl-topbar-drag-space,
  .kl-presence-trigger-label { display: none; }
  .kl-presence-trigger {
    width: 44px;
    min-width: 44px;
    max-width: 44px;
    padding: 5px;
  }
  .kl-presence-trigger > .kl-presence-dot {
    right: 4px;
    top: auto;
    bottom: 4px;
    margin: 0;
  }
}

@media (max-width: 410px) {
  .kl-brand-copy { display: none; }
  .kl-local-clock { display: none; }
  .kl-presence-trigger { width: 44px; min-width: 44px; max-width: 44px; }
  .kl-presence-trigger-name { font-size: var(--kl-type-xs); }
  .kl-presence-trigger-status { max-width: 54px; }
  .kl-chat-number { display: none; }
  .kl-chat-presence::before { display: none; }
  .kl-profile-more { display: none; }
  .kl-profile-style-fields { grid-template-columns: minmax(0, 1fr); }
  .kl-profile-style-fields .kl-select { width: 100%; }
  .kl-profile-banner-actions { align-items: stretch; flex-direction: column; }
  .kl-profile-banner-actions > :first-child { width: 100%; flex-basis: auto; }
  .kl-profile-outline-controls { align-items: stretch; }
  .kl-profile-outline-controls input[type="text"] { flex-basis: calc(100% - 57px); }
  .kl-addon-profile-dialog-header .kl-dialog-subtitle { display: none; }
  .kl-addon-profile-hero {
    grid-template-columns: 84px minmax(0, 1fr);
    gap: 12px;
    padding: calc(var(--kl-profile-banner-height) - 40px) 14px 15px;
  }
  .kl-addon-profile-avatar-shell { width: 84px; height: 84px; padding: 5px; border-radius: 28px; }
  .kl-addon-profile-avatar { width: 72px; height: 72px; border-radius: 23px; font-size: 20px; }
  .kl-addon-profile-avatar-shell > .kl-presence-dot { z-index: 10; right: -1px; bottom: -1px; width: 18px; height: 18px; }
  /* Mobile hero starts 40px above the banner edge; keep the same 10px text inset. */
  .kl-addon-profile-identity { gap: 4px; padding-top: 50px; padding-right: 16px; }
  .kl-addon-profile-identity h2 { font-size: 21px; }
  .kl-addon-profile-bio { margin: 0 14px 14px; padding: 10px; }
  .kl-addon-profile-facts { gap: 7px; padding: 0 14px 14px; }
  .kl-addon-profile-fact { min-height: 60px; padding: 9px; }
  .kl-addon-profile-private { margin: 0 14px 14px; padding: 10px; }
  .kl-addon-profile-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 0 14px 14px; }
  .kl-addon-profile-action--primary,
  .kl-addon-profile-action:last-child:nth-child(odd) { grid-column: 1 / -1; }
  .kl-room-subnav { padding-inline: 9px; }
  .kl-group-details-summary { grid-template-columns: 52px minmax(0, 1fr); gap: 9px; padding: 9px; }
  .kl-group-details-avatar { width: 52px; height: 52px; border-radius: 17px; }
  .kl-group-manage-field { grid-template-columns: minmax(0, 1fr); }
  .kl-group-manage-field > .kl-group-dialog-label,
  .kl-group-manage-field > input,
  .kl-group-manage-field > .kl-group-manage-outline-row,
  .kl-group-manage-field > .kl-group-menu-action,
  .kl-group-manage-field > .kl-group-manage-save,
  .kl-group-manage-field > .kl-group-menu-action:only-of-type,
  .kl-group-manage-field > .kl-group-manage-save:only-of-type { grid-column: 1; }
  .kl-group-manage-member { grid-template-columns: 38px minmax(0, 1fr); }
  .kl-group-manage-member .kl-group-member-avatar { width: 36px; height: 36px; }
  .kl-group-manage-kick { grid-column: 2; justify-self: start; }
  .kl-group-manage-add { grid-template-columns: minmax(0, 1fr); }
  .kl-group-manage-add-button { width: 100%; }
  .kl-room-subnav-button { flex: 1 1 0; padding-inline: 5px; }
  .kl-lobbies-panel,
  .kl-room-presets-panel { padding: 12px; }
  .kl-lobby-search-wrap { grid-template-columns: 104px minmax(0, 1fr) 44px; }
  .kl-music-queue-tools { align-items: stretch; flex-direction: column; gap: 5px; }
  .kl-music-queue-summary { align-self: flex-end; }
  .kl-music-session-options { grid-template-columns: minmax(0, 1fr); }
  .kl-music-volume { flex-basis: 100%; grid-template-columns: auto minmax(100px, 1fr); }
  .kl-music-volume .kl-volume-input { width: 100%; }
  .kl-lobby-card-footer { flex-wrap: wrap; }
  .kl-lobby-flags { flex-basis: 100%; }
  .kl-room-preset-card { grid-template-columns: minmax(0, 1fr); }
  .kl-room-preset-actions { justify-content: flex-end; }
}

@media (max-width: 370px) {
  .kl-topbar-drag-space { display: none; }
  .kl-presence-trigger { width: 44px; min-width: 44px; max-width: 44px; padding: 5px; }
  .kl-presence-trigger-label { display: none; }
  .kl-presence-trigger > .kl-presence-dot { right: 4px; top: auto; bottom: 4px; margin: 0; }
  .kl-addon-profile-facts { grid-template-columns: minmax(0, 1fr); }
  .kl-group-list-item { gap: 7px; }
}

@media (forced-colors: active) {
  .kl-addon-profile-card,
  .kl-addon-profile-card[data-custom-gradient="true"],
  .kl-addon-profile-fact,
  .kl-addon-profile-private,
  .kl-addon-profile-action,
  .kl-addon-profile-badge,
  .kl-profile-banner-field,
  .kl-profile-banner-preview,
  .kl-profile-outline-field,
  .kl-profile-gradient-field {
    border-color: CanvasText;
    background: Canvas;
    color: CanvasText;
    box-shadow: none;
  }
  .kl-addon-profile-banner { border-color: CanvasText; background: Highlight; }
  .kl-addon-profile-banner::after,
  .kl-addon-profile-banner[data-banner-state="loading"]::before,
  .kl-addon-profile-avatar-shell::after,
  .kl-profile-banner-preview::after,
  .kl-profile-banner-preview[data-banner-state="loading"]::before,
  .kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame]::after { display: none; }
  .kl-addon-profile-avatar-shell { border: 3px solid Highlight; background: Canvas; box-shadow: none; }
  .kl-addon-profile-avatar-shell > .kl-presence-dot { border-color: Canvas; }
  .kl-avatar:not(.kl-addon-profile-avatar)[data-avatar-frame] { border-color: Highlight; box-shadow: inset 0 0 0 1px Highlight; }
  .kl-group-sidebar,
  .kl-group-list-item,
  .kl-group-message,
  .kl-group-dialog,
  .kl-group-details-dialog,
  .kl-group-details-summary,
  .kl-group-details-avatar,
  .kl-group-manage-field,
  .kl-group-manage-member,
  .kl-group-menu,
  .kl-group-contact-item,
  .kl-group-contact,
  .kl-group-confirm-member,
  .kl-group-load-older,
  .kl-group-avatar-stack-item,
  .kl-group-avatar-stack-more { border-color: CanvasText; background: Canvas; color: CanvasText; box-shadow: none; }
  .kl-group-sidebar { border-inline-start: 3px solid Highlight; }
  .kl-group-sidebar-title::before,
  .kl-group-sidebar-unread,
  .kl-group-list-unread { background: Highlight; color: HighlightText; box-shadow: none; }
  .kl-group-creator-badge,
  .kl-group-manage-member-role { border: 1px solid Highlight; background: Canvas; color: Highlight; }
  .kl-group-contact-item[data-selected="true"] { border-color: Highlight; }
  .kl-group-member-target:focus-visible,
  .kl-profile-menu-target:not(button):focus-visible { outline-color: Highlight; }
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
`;var Ni="> Reply to ";var Kp=Ni.length+64+2+180;function fr(r){let e=ws(r);return e&&e.content.trim().length>0?e:void 0}function xs(r){return ws(r)?.content??r}function ws(r){let e=r.indexOf(`
`);if(e<0||e>Kp)return;let t=r.slice(0,e);if(t.includes("\r")||!t.startsWith(Ni))return;let i=t.indexOf(": ",Ni.length);if(i<0)return;let n=t.slice(Ni.length,i),o=t.slice(i+2),a=r.slice(e+1);if(!(n.length===0||n.length>64||o.length===0||o.length>180||Ns(n)!==n||Cs(o)!==o))return{author:n,excerpt:o,content:a}}function As(r,e){let t=vs(Ns(r),64)||"Unknown",n=fr(e)?.content??e,o=vs(Cs(n),180)||"Beep";return`${Ni}${t}: ${o}
`}function Ns(r){return r.replace(/[:\r\n]+/gu," ").replace(/\s+/gu," ").trim()}function Cs(r){return r.replace(/\s+/gu," ").trim()}function vs(r,e){let t=r.slice(0,e),i=t.charCodeAt(t.length-1);return i>=55296&&i<=56319?t.slice(0,-1):t}function zp(r,e=[]){if(r.length===0)return[];let t=Ss(r.length,e),i=[],n=0,o=0,a=d=>{let c=r.indexOf("*",d);for(;c>=0;){for(;(t[n]?.end??Number.POSITIVE_INFINITY)<=c;)n+=1;let u=t[n];if(u&&c>=u.start&&c<u.end){c=r.indexOf("*",u.end);continue}return c}return-1};for(;o<r.length;){let d=a(o);if(d<0)break;let c=a(d+1);if(c<0)break;let u=c+1;c>d+1&&r.slice(d+1,c).trim()&&i.push({start:d,end:u}),o=u}if(i.length===0)return[{start:0,end:r.length,action:!1}];let l=[];o=0;for(let d of i)d.start>o&&l.push({start:o,end:d.start,action:!1}),l.push({...d,action:!0}),o=d.end;return o<r.length&&l.push({start:o,end:r.length,action:!1}),l}function Ms(r,e,t=[],i){if(!e)return;let n=r.ownerDocument;if(!n)return;let o=Ss(e.length,t),a=zp(e,o),l=0;for(let d of a){let c=d.action?n.createElement("em"):r;d.action&&(c.className="kl-message-action-text");let u=d.start;for(;(o[l]?.end??Number.POSITIVE_INFINITY)<=d.start;)l+=1;for(;l<o.length&&o[l].start<d.end;){let p=o[l];if(p.start<d.start||p.end>d.end)break;p.start>u&&c.appendChild(n.createTextNode(e.slice(u,p.start)));let h=i?.(p.source);h?c.appendChild(h):i||c.appendChild(n.createTextNode(e.slice(p.start,p.end))),u=p.end,l+=1}u<d.end&&c.appendChild(n.createTextNode(e.slice(u,d.end))),d.action&&r.appendChild(c)}}function Ss(r,e){let t=[];for(let i of[...e].sort((n,o)=>n.start-o.start)){if(!Number.isInteger(i.start)||!Number.isInteger(i.end))continue;let n=Math.max(0,i.start),o=Math.min(r,i.end);n>=o||n<(t.at(-1)?.end??0)||t.push({start:n,end:o,source:i})}return t}var jp=new Set(["image/gif","image/jpeg","image/png","image/webp"]),H=class extends Error{constructor(t,i,n){super(i,n);this.code=t}code;name="RemoteImageLoadError"},yr=class{#e;#t;#i;#r;#a;#c;#l;#o;#s;#p;#g;#d;#u;#h;#m=new Map;#y=new Set;#v=new Map;#L=new Set;#S=[];#C=[];#E=new Set;#R=0;#A=0;#I=0;#M=0;#w=!1;constructor(e={}){this.#a=ve(e.maxImageBytes??5242880,1,5242880,"maxImageBytes"),this.#c=ve(e.maxImageDimension??4096,1,4096,"maxImageDimension"),this.#l=ve(e.maxImagePixels??8388608,1,8388608,"maxImagePixels"),this.#o=ve(e.maxAnimationFrames??240,1,240,"maxAnimationFrames"),this.#s=ve(e.maxAnimationPixels??67108864,1,67108864,"maxAnimationPixels"),this.#p=ve(e.maxAnimationPixelsPerSecond??33554432,1,33554432,"maxAnimationPixelsPerSecond"),this.#i=ve(e.maxCacheEntries??24,1,512,"maxCacheEntries"),this.#r=ve(e.maxCacheBytes??41943040,this.#a,512*1024*1024,"maxCacheBytes"),this.#g=ve(e.maxConcurrentRequests??4,1,4,"maxConcurrentRequests"),this.#d=ve(e.maxConcurrentDecodes??4,1,4,"maxConcurrentDecodes"),this.#u=ve(e.maxInFlightRequests??32,this.#g,32,"maxInFlightRequests"),this.#h=ve(e.requestTimeoutMs??15e3,100,3e4,"requestTimeoutMs"),this.#e=Object.hasOwn(e,"fetchImpl")?e.fetchImpl??void 0:lh(),this.#t=Object.hasOwn(e,"objectUrls")?e.objectUrls??void 0:dh()}load(e,t){return this.#G(e,t,!1)}loadLease(e,t){return this.#G(e,t,!0)}#G(e,t,i){if(this.#w)return Promise.reject(jt());if(!this.#e||!this.#t||typeof AbortController!="function")return Promise.reject(new H("unsupported","This browser cannot safely load remote images"));if(t?.aborted)return Promise.reject(ee());if(!i&&this.#E.size>=this.#u)return Promise.reject(new H("overloaded","Too many raw remote-image URLs are waiting to be delivered"));let n;try{n=Ps(e)}catch(d){return Promise.reject(d)}let o=this.#m.get(n);if(o)return this.#m.delete(n),this.#m.set(n,o),i?this.#me(o,t):this.#De(o);if(this.#M>=this.#u*2)return Promise.reject(new H("overloaded","Too many remote-image consumers are already waiting"));let a=this.#v.get(n);if(!a){if(this.#L.size>=this.#u)return Promise.reject(new H("overloaded","Too many remote images are already waiting to load"));a=this.#_(n),this.#v.set(n,a),this.#L.add(a),this.#S.push(a)}if(a.consumers>=this.#u)return Promise.reject(new H("overloaded","Too many consumers are already waiting for this remote image"));let l=this.#re(a,t,i);return this.#O(),l}destroy(){if(!this.#w){this.#w=!0;for(let e of this.#L)clearTimeout(e.timeout),e.controller.abort(),e.state="done",e.requestSlotHeld=!1,e.settled||(e.settled=!0,e.reject(ee()));this.#v.clear(),this.#L.clear(),this.#S.length=0,this.#A=0,this.#M=0;for(let e of this.#C)e.settled||(e.settled=!0,clearTimeout(e.timeout),e.signal&&e.onAbort&&e.signal.removeEventListener("abort",e.onAbort),e.reject(jt()));this.#C.length=0,this.#I=0;for(let e of this.#E)clearTimeout(e);this.#E.clear();for(let e of[...this.#y])this.#H(e);this.#m.clear(),this.#R=0}}#_(e){let t,i,n=new Promise((a,l)=>{t=a,i=l}),o;return o={key:e,controller:new AbortController,promise:n,resolve:t,reject:i,consumers:0,settled:!1,state:"queued",requestSlotHeld:!1,timeout:setTimeout(()=>{o.controller.abort(),this.#U(o,void 0,new H("timeout","The remote image request timed out"))},this.#h)},o}#O(){if(!this.#w)for(;this.#A<this.#g&&this.#S.length>0;){let e=this.#S.shift();if(!(!e||e.state!=="queued")){if(e.consumers===0||e.controller.signal.aborted){this.#U(e,void 0,ee());continue}e.state="active",e.requestSlotHeld=!0,this.#A+=1,this.#ce(e).then(t=>{this.#U(e,t),this.#x(e)},t=>{this.#U(e,void 0,t),this.#x(e)})}}}#U(e,t,i){e.state!=="done"&&(clearTimeout(e.timeout),e.state="done",this.#L.delete(e),this.#v.get(e.key)===e&&this.#v.delete(e.key),e.settled||(e.settled=!0,i!==void 0?e.reject(i):t!==void 0?e.resolve(t):e.reject(new H("response","The image request had no result"))),this.#O())}#X(e){e.requestSlotHeld&&(e.requestSlotHeld=!1,this.#A=Math.max(0,this.#A-1),this.#O())}#x(e){let t=e.networkSettled;if(!t){this.#X(e);return}t.then(()=>this.#X(e))}async#ce(e){let t=this.#t;if(!t)throw new H("unsupported","Object URLs are unavailable");let{signal:i}=e.controller,n=await this.#D(e,i);if(i.aborted||this.#w||(Wp(n.bytes,n.mime,this.#c,this.#l,this.#o,this.#s,this.#p),i.aborted||this.#w))throw ee();let o;try{o=t.create(n.blob)}catch(l){throw new H("unsupported","The browser could not create a local image URL",{cause:l})}if(!o)throw new H("unsupported","The browser returned an invalid local image URL");if(i.aborted||this.#w)throw this.#te(o),ee();let a={objectUrl:o,size:n.size,leases:e.consumers,resident:!1,revoked:!1};return e.image=a,this.#y.add(a),this.#Oe(e.key,a),a}async#D(e,t){let i=this.#e;if(!i)throw new H("unsupported","Fetch is unavailable");let n;try{let l=i(e.key,{method:"GET",mode:"cors",credentials:"omit",referrerPolicy:"no-referrer",redirect:"error",signal:t});e.networkSettled=l.then(async d=>{t.aborted&&await mt(d)},()=>{}),n=await kr(l,t)}catch(l){throw t.aborted||ch(l)?ee():new H("network","The remote image request failed",{cause:l})}if(t.aborted)throw await mt(n),ee();if(!n.ok)throw await mt(n),new H("response",`The image host returned HTTP ${n.status}`);try{Ps(n.url)}catch(l){throw await mt(n),l}let o=ah(n.headers.get("content-type"));if(!o)throw await mt(n),new H("mime","The response is not a supported image type");let a;try{a=sh(n.headers.get("content-length"))}catch(l){throw await mt(n),l}if(a!==void 0&&a>this.#a)throw await mt(n),br(this.#a);return Vp(n,o,this.#a,t)}#re(e,t,i){return e.consumers+=1,this.#M+=1,e.image&&!e.image.revoked&&(e.image.leases+=1),new Promise((n,o)=>{let a=!1,l=i,d=!0,c=()=>{d&&(d=!1,e.image&&this.#oe(e.image))},u=h=>{e.consumers=Math.max(0,e.consumers-1),this.#M=Math.max(0,this.#M-1),h&&e.consumers===0&&!e.settled&&(e.controller.abort(),this.#U(e,void 0,ee()))},p=()=>{a||(a=!0,t?.removeEventListener("abort",p),l=!1,c(),u(!0),o(ee()))};if(t?.addEventListener("abort",p,{once:!0}),t?.aborted){p();return}e.promise.then(h=>{if(!a){if(!l){a=!0,t?.removeEventListener("abort",p),u(!1),this.#w||h.revoked?(c(),o(jt())):(n(h.objectUrl),this.#he(c));return}this.#ye(t).then(m=>{if(a){m();return}if(a=!0,t?.removeEventListener("abort",p),this.#w||h.revoked){m(),l=!1,c(),u(!1),o(jt());return}l=!1,d=!1,u(!1),n(this.#F(h,!0,m))},m=>{a||(a=!0,t?.removeEventListener("abort",p),l=!1,c(),u(!1),o(m))})}},h=>{a||(a=!0,t?.removeEventListener("abort",p),l=!1,c(),u(!1),o(h))})})}#Oe(e,t){let i=this.#m.get(e);for(i&&(this.#m.delete(e),this.#R-=i.size,this.#ee(i)),t.resident=!0,this.#m.set(e,t),this.#R+=t.size;this.#m.size>this.#i||this.#R>this.#r;){let n=this.#m.keys().next().value;if(n===void 0)break;let o=this.#m.get(n);this.#m.delete(n),o&&(this.#R-=o.size,this.#ee(o))}}#De(e){return this.#E.size>=this.#u?Promise.reject(new H("overloaded","Too many cached remote images are waiting to be delivered")):(e.leases+=1,new Promise(t=>{t(e.objectUrl),this.#he(()=>this.#oe(e))}))}#he(e){let t=setTimeout(()=>{this.#E.delete(t),e()},0);this.#E.add(t)}async#me(e,t){e.leases+=1;try{let i=await this.#ye(t);if(t?.aborted)throw i(),ee();if(this.#w||e.revoked)throw i(),jt();return this.#F(e,!0,i)}catch(i){throw this.#oe(e),i}}#ye(e){return this.#w?Promise.reject(jt()):e?.aborted?Promise.reject(ee()):this.#I<this.#d?(this.#I+=1,Promise.resolve(this.#z())):this.#C.length>=this.#u?Promise.reject(new H("overloaded","Too many remote images are already waiting for a browser decode")):new Promise((t,i)=>{let n;if(n={resolve:t,reject:i,settled:!1,timeout:setTimeout(()=>{this.#Q(n,new H("timeout","The remote image waited too long for a browser decode"))},this.#h)},e){let o=()=>this.#Q(n,ee());if(n.signal=e,n.onAbort=o,e.addEventListener("abort",o,{once:!0}),e.aborted){o();return}}this.#C.push(n)})}#Q(e,t){if(e.settled)return;e.settled=!0,clearTimeout(e.timeout),e.signal&&e.onAbort&&e.signal.removeEventListener("abort",e.onAbort);let i=this.#C.indexOf(e);i>=0&&this.#C.splice(i,1),e.reject(t)}#ue(){if(!this.#w)for(;this.#I<this.#d&&this.#C.length>0;){let e=this.#C.shift();if(!(!e||e.settled)){if(e.signal?.aborted){this.#Q(e,ee());continue}e.settled=!0,clearTimeout(e.timeout),e.signal&&e.onAbort&&e.signal.removeEventListener("abort",e.onAbort),this.#I+=1,e.resolve(this.#z())}}}#z(){let e=!1;return()=>{e||(e=!0,this.#I=Math.max(0,this.#I-1),this.#ue())}}#F(e,t,i){t||(e.leases+=1);let n=!1;return{url:e.objectUrl,release:()=>{n||(n=!0,this.#oe(e),i())}}}#oe(e){e.leases=Math.max(0,e.leases-1),!e.resident&&e.leases===0&&this.#H(e)}#ee(e){e.resident=!1,e.leases===0&&this.#H(e)}#H(e){e.revoked||(e.revoked=!0,this.#y.delete(e),this.#te(e.objectUrl))}#te(e){try{this.#t?.revoke(e)}catch{}}};async function Vp(r,e,t,i){let n=r.body?.getReader();if(!n){if(typeof r.blob!="function")throw new H("response","The image response has no readable body");let c=await kr(r.blob(),i);if(i.aborted)throw ee();if(c.size>t)throw br(t);let u=new Uint8Array(await kr(c.arrayBuffer(),i));if(i.aborted)throw ee();if(u.byteLength!==c.size||u.byteLength>t)throw br(t);return{blob:c.type===e?c:Rs(u,e),bytes:u,mime:e,size:u.byteLength}}let o=[],a=0,l=!1;try{for(;;){if(i.aborted)throw ee();let c=await kr(n.read(),i);if(c.done){l=!0;break}let u=c.value;if(a+=u.byteLength,a>t)throw br(t);let p=new Uint8Array(u.byteLength);p.set(u),o.push(p)}}finally{if(!l)try{await n.cancel()}catch{}n.releaseLock()}if(i.aborted)throw ee();let d=qp(o,a);return{blob:Rs(d,e),bytes:d,mime:e,size:a}}function Rs(r,e){let t=new ArrayBuffer(r.byteLength);return new Uint8Array(t).set(r),new Blob([t],{type:e})}function qp(r,e){let t=new Uint8Array(e),i=0;for(let n of r)t.set(n,i),i+=n.byteLength;if(i!==e)throw S("The image response changed while it was being read");return t}function Wp(r,e,t,i,n,o,a){let l=0,d=0,c=(p,h,m)=>{if(!Number.isSafeInteger(p)||!Number.isSafeInteger(h)||p<=0||h<=0)throw S(`The ${m} has invalid dimensions`);if(p>t||h>t||p>Math.floor(i/h))throw new H("dimensions",`Remote image dimensions cannot exceed ${t}px or ${i} pixels`)},u={dimensions:c,animationFrame:(p,h,m,f)=>{c(p,h,m);let y=p*h;if(!Number.isFinite(f)||f<20)throw new H("dimensions","Remote animation frame delays must be at least 20ms");if(l>=n||y>o-d||y>Math.floor(a*f/1e3))throw new H("dimensions","Remote animations exceed the safe frame, decoded-pixel, or playback-rate budget");l+=1,d+=y},declaredAnimationFrames:(p,h,m,f)=>{if(!Number.isSafeInteger(p)||p<=0)throw S(`The ${h} has an invalid frame count`);let y=m!==void 0&&f!==void 0?m*f:0;if(p>n||y>0&&p>Math.floor(o/y))throw new H("dimensions",`Remote animations cannot exceed ${n} frames`)}};switch(e){case"image/png":Xp(r,u);break;case"image/gif":Jp(r,u);break;case"image/jpeg":Qp(r,c);break;case"image/webp":eh(r,u);break;default:throw S("The image type cannot be inspected safely")}}function Xp(r,e){let t=[137,80,78,71,13,10,26,10];if(!Xn(r,0,t))throw S("The PNG signature is invalid");let i=t.length,n=0,o=0,a=!1,l=!1,d=!1,c,u=0,p=0;for(;i<r.byteLength;){if(++p>4096)throw S("The PNG has too many chunks");te(r,i,12,"PNG chunk");let h=Ye(r,i),m=i+8,y=m+h+4;if(!Number.isSafeInteger(y)||y>r.byteLength)throw S("A PNG chunk is truncated");let g=Yn(r,i+4,4);if(!a&&g!=="IHDR")throw S("The PNG header must be the first chunk");if(g==="IHDR"){if(a||h!==13)throw S("The PNG header is malformed");n=Ye(r,m),o=Ye(r,m+4),e.dimensions(n,o,"PNG canvas");let x=P(r,m+8),b=P(r,m+9);if(!Yp(b).includes(x)||P(r,m+10)!==0||P(r,m+11)!==0||P(r,m+12)>1)throw S("The PNG header uses unsupported encoding fields");a=!0}else if(g==="acTL"){if(!a||h!==8||l||c!==void 0)throw S("The animated PNG control header is malformed");c=Ye(r,m),e.declaredAnimationFrames(c,"animated PNG",n,o)}else if(g==="fcTL"){if(!a||h!==26||c===void 0)throw S("The animated PNG frame header is malformed");let x=Ye(r,m+4),b=Ye(r,m+8),N=Ye(r,m+12),k=Ye(r,m+16),C=Ci(r,m+20),I=Ci(r,m+22)||100,G=C*1e3/I;e.dimensions(x,b,"animated PNG frame"),c>1&&e.animationFrame(n,o,"animated PNG composited frame",G),Wn(N,k,x,b,n,o,"animated PNG frame"),u+=1}else if(g==="IDAT")l=!0;else if(g==="IEND"){if(h!==0||!l||y!==r.byteLength)throw S("The PNG end marker is malformed");d=!0}if(i=y,d)break}if(!a||!d)throw S("The PNG image is incomplete");if(c!==void 0&&u!==c)throw S("The animated PNG frame count does not match its control header")}function Yp(r){switch(r){case 0:return[1,2,4,8,16];case 2:return[8,16];case 3:return[1,2,4,8];case 4:case 6:return[8,16];default:return[]}}function Jp(r,e){let t=qn(r,0,6);if(t!=="GIF87a"&&t!=="GIF89a")throw S("The GIF signature is invalid");te(r,0,13,"GIF logical screen descriptor");let i=Ke(r,6),n=Ke(r,8);e.dimensions(i,n,"GIF canvas");let o=P(r,10),a=13;(o&128)!==0&&(a+=3*(1<<(o&7)+1),te(r,0,a,"GIF global color table"));let l=0,d=[],c=0,u=!1,p=0;for(;a<r.byteLength;){if(++p>4096)throw S("The GIF has too many blocks");let h=P(r,a);if(h===59){if(a+1!==r.byteLength)throw S("The GIF has data after its trailer");u=!0;break}if(h===33){if(te(r,a,2,"GIF extension"),P(r,a+1)===249){if(te(r,a,8,"GIF graphics control extension"),P(r,a+2)!==4||P(r,a+7)!==0)throw S("The GIF graphics control extension is malformed");c=Ke(r,a+4)*10,a+=8}else a=Ls(r,a+2);continue}if(h!==44)throw S("The GIF block stream is malformed");te(r,a,10,"GIF image descriptor");let m=Ke(r,a+1),f=Ke(r,a+3),y=Ke(r,a+5),g=Ke(r,a+7);e.dimensions(y,g,"GIF frame"),Wn(m,f,y,g,i,n,"GIF frame");let x=P(r,a+9);a+=10,(x&128)!==0&&(a+=3*(1<<(x&7)+1),te(r,0,a,"GIF local color table")),te(r,a,1,"GIF LZW header");let b=P(r,a);if(b<2||b>8)throw S("The GIF LZW header is malformed");a=Ls(r,a+1),l+=1,e.declaredAnimationFrames(l,"GIF"),d.push(c),c=0}if(!u||l===0)throw S("The GIF image is incomplete");if(l>1)for(let h of d)e.animationFrame(i,n,"GIF composited frame",h)}function Ls(r,e){let t=e,i=0;for(;;){if(++i>4096)throw S("The GIF extension has too many data blocks");te(r,t,1,"GIF data block");let n=P(r,t);if(t+=1,n===0)return t;te(r,t,n,"GIF data block"),t+=n}}function Qp(r,e){if(!Xn(r,0,[255,216]))throw S("The JPEG signature is invalid");let t=2,i=0,n=!1,o=!1,a=!1;for(;t<r.byteLength;){if(a){for(;t<r.byteLength;){if(P(r,t)!==255){t+=1;continue}let u=t;for(;P(r,t)===255;)t+=1;te(r,t,1,"JPEG entropy marker");let p=P(r,t);if(p===0||p>=208&&p<=215){t+=1;continue}t=u,a=!1;break}if(a)break;continue}if(++i>4096)throw S("The JPEG has too many marker segments");if(P(r,t)!==255)throw S("The JPEG marker stream is malformed");for(;P(r,t)===255;)t+=1;te(r,t,1,"JPEG marker");let l=P(r,t);if(t+=1,l===217){if(!n||!o||t!==r.byteLength)throw S("The JPEG end marker is malformed");return}if(l===0||l===216)throw S("The JPEG marker stream is malformed");if(l===1||l>=208&&l<=215)throw S("A standalone JPEG marker appears outside entropy data");te(r,t,2,"JPEG segment length");let d=Ci(r,t);if(d<2)throw S("A JPEG segment has an invalid length");let c=t+d;if(c>r.byteLength)throw S("A JPEG segment is truncated");if(Zp(l)){if(n||d<8)throw S("The JPEG has a duplicate or truncated frame header");let u=P(r,t+2),p=Ci(r,t+3),h=Ci(r,t+5),m=P(r,t+7);if(u!==8&&u!==12||m<1||m>4||d!==8+m*3)throw S("The JPEG frame header is malformed");e(h,p,"JPEG frame"),n=!0}else if(l===218){let u=P(r,t+2);if(!n||u<1||u>4||d!==6+u*2)throw S("The JPEG scan header is malformed");o=!0,a=!0}t=c}throw S("The JPEG marker stream is incomplete")}function Zp(r){return r>=192&&r<=207&&r!==196&&r!==200&&r!==204}function eh(r,e){if(qn(r,0,4)!=="RIFF"||qn(r,8,4)!=="WEBP")throw S("The WebP signature is invalid");if(te(r,0,12,"WebP RIFF header"),Jn(r,4)+8!==r.byteLength)throw S("The WebP RIFF size is invalid");let t,i=0,n=0,o=0,a=!1,l=12,d=0;for(;l<r.byteLength;){if(++d>4096)throw S("The WebP has too many chunks");let u=Is(r,l,r.byteLength);if(u.type==="VP8X"){if(l!==12||t||u.length!==10)throw S("The WebP extended header is malformed");if((P(r,u.dataStart)&193)!==0||P(r,u.dataStart+1)!==0||P(r,u.dataStart+2)!==0||P(r,u.dataStart+3)!==0)throw S("The WebP extended header uses reserved fields");i=P(r,u.dataStart),t={width:ht(r,u.dataStart+4)+1,height:ht(r,u.dataStart+7)+1},e.dimensions(t.width,t.height,"WebP canvas")}else if(u.type==="VP8 "){let p=Ts(r,u.dataStart,u.dataEnd);e.dimensions(p.width,p.height,"WebP VP8 frame"),Es(t,p),n+=1}else if(u.type==="VP8L"){let p=_s(r,u.dataStart,u.dataEnd);e.dimensions(p.width,p.height,"WebP lossless frame"),Es(t,p),n+=1}else if(u.type==="ANIM"){if(!t||u.length!==6||a)throw S("The animated WebP control chunk is malformed");a=!0}else if(u.type==="ANMF"){if(!t||(i&2)===0||u.length<16)throw S("The animated WebP frame header is malformed");let p=ht(r,u.dataStart)*2,h=ht(r,u.dataStart+3)*2,m=ht(r,u.dataStart+6)+1,f=ht(r,u.dataStart+9)+1,y=ht(r,u.dataStart+12);e.dimensions(m,f,"animated WebP frame"),e.animationFrame(t.width,t.height,"animated WebP composited frame",y),Wn(p,h,m,f,t.width,t.height,"animated WebP frame");let g=th(r,u.dataStart+16,u.dataEnd,e.dimensions);if(!g)throw S("The animated WebP frame has no image payload");if(g.width!==m||g.height!==f)throw S("The animated WebP payload dimensions do not match its frame");o+=1}l=u.next}if(l!==r.byteLength)throw S("The WebP image is incomplete");let c=(i&2)!==0;if(o>0){if(!c||!a||n!==0)throw S("The animated WebP chunk structure is inconsistent")}else if(c||a||n!==1)throw S("The WebP image payload is incomplete or ambiguous")}function Es(r,e){if(r&&(r.width!==e.width||r.height!==e.height))throw S("The WebP payload dimensions do not match its canvas")}function Is(r,e,t){Qn(r,e,8,t,"WebP chunk header");let i=Yn(r,e,4),n=Jn(r,e+4),o=e+8,a=o+n,l=a+(n&1);if(!Number.isSafeInteger(l)||l>t)throw S("A WebP chunk is truncated");if((n&1)!==0&&P(r,a)!==0)throw S("A WebP chunk has invalid padding");return{type:i,length:n,dataStart:o,dataEnd:a,next:l}}function th(r,e,t,i){let n=e,o,a=0;for(;n<t;){if(++a>32)throw S("A WebP frame has too many chunks");let l=Is(r,n,t);if(l.type==="VP8 "){if(o)throw S("A WebP frame has multiple image payloads");o=Ts(r,l.dataStart,l.dataEnd),i(o.width,o.height,"animated WebP VP8 payload")}else if(l.type==="VP8L"){if(o)throw S("A WebP frame has multiple image payloads");o=_s(r,l.dataStart,l.dataEnd),i(o.width,o.height,"animated WebP lossless payload")}else if(l.type!=="ALPH")throw S("An animated WebP frame contains an invalid chunk");n=l.next}if(n!==t)throw S("The animated WebP frame payload is malformed");return o}function Ts(r,e,t){if(Qn(r,e,10,t,"WebP VP8 frame header"),(P(r,e)&1)!==0||!Xn(r,e+3,[157,1,42]))throw S("The WebP VP8 key-frame header is invalid");return{width:Ke(r,e+6)&16383,height:Ke(r,e+8)&16383}}function _s(r,e,t){if(Qn(r,e,5,t,"WebP lossless frame header"),P(r,e)!==47)throw S("The WebP lossless signature is invalid");let i=Jn(r,e+1);if(i>>>29)throw S("The WebP lossless version is unsupported");return{width:(i&16383)+1,height:(i>>>14&16383)+1}}function Wn(r,e,t,i,n,o,a){if(r>n||e>o||t>n-r||i>o-e)throw S(`The ${a} lies outside its canvas`)}function Xn(r,e,t){return vr(r,e,t.length)?t.every((i,n)=>P(r,e+n)===i):!1}function qn(r,e,t){return vr(r,e,t)?Yn(r,e,t):void 0}function Yn(r,e,t){te(r,e,t,"image header");let i="";for(let n=0;n<t;n+=1)i+=String.fromCharCode(P(r,e+n));return i}function P(r,e){return r[e]??-1}function Ci(r,e){return te(r,e,2,"image header"),P(r,e)*256+P(r,e+1)}function Ke(r,e){return te(r,e,2,"image header"),P(r,e)+P(r,e+1)*256}function ht(r,e){return te(r,e,3,"image header"),P(r,e)+P(r,e+1)*256+P(r,e+2)*65536}function Ye(r,e){return te(r,e,4,"image header"),P(r,e)*16777216+P(r,e+1)*65536+P(r,e+2)*256+P(r,e+3)}function Jn(r,e){return te(r,e,4,"image header"),P(r,e)+P(r,e+1)*256+P(r,e+2)*65536+P(r,e+3)*16777216}function vr(r,e,t){return Number.isSafeInteger(e)&&Number.isSafeInteger(t)&&e>=0&&t>=0&&e<=r.byteLength-t}function te(r,e,t,i){if(!vr(r,e,t))throw S(`The ${i} is truncated`)}function Qn(r,e,t,i,n){if(e>i||t>i-e||!vr(r,e,t))throw S(`The ${n} is truncated`)}function S(r){return new H("response",r)}function Ps(r){if(typeof r!="string"||!r||r.length>4096)throw new H("invalid-url","Use a valid HTTPS image URL");let e;try{e=new URL(r)}catch(t){throw new H("invalid-url","Use a valid HTTPS image URL",{cause:t})}if(e.protocol!=="https:"||!e.hostname||e.username||e.password)throw new H("invalid-url","Remote images must use HTTPS without embedded credentials");if(ih(e.hostname))throw new H("invalid-url","Remote images cannot use local, private, or reserved network addresses");return e.hash="",e.href}function ih(r){let e=r.toLocaleLowerCase().replace(/^\[|\]$/gu,"").replace(/\.+$/gu,"");return e==="localhost"||e.endsWith(".localhost")?!0:rh(e)?nh(e):e.includes(":")?oh(e):!1}function rh(r){let e=r.split(".");return e.length===4&&e.every(t=>/^\d{1,3}$/u.test(t))}function nh(r){let e=r.split(".").map(Number);if(e.length!==4||e.some(o=>o<0||o>255))return!0;let[t=0,i=0,n=0]=e;return t===0||t===10||t===127||t===100&&i>=64&&i<=127||t===169&&i===254||t===172&&i>=16&&i<=31||t===192&&i===0&&n===0||t===192&&i===0&&n===2||t===192&&i===168||t===198&&(i===18||i===19)||t===198&&i===51&&n===100||t===203&&i===0&&n===113||t>=224}function oh(r){let[e="",t=""]=r.split(":",2),i=Number.parseInt(e,16),n=t?Number.parseInt(t,16):0;return!Number.isFinite(i)||i<8192||i>16383||!Number.isFinite(n)?!0:i===8193&&(n<=511||n===3512)||i===8194||i===16383&&n<=4095}function ah(r){let e=r?.split(";",1)[0]?.trim().toLocaleLowerCase();return e&&jp.has(e)?e:void 0}function sh(r){if(r===null)return;let e=r.trim();if(!/^\d+$/u.test(e))throw new H("response","The image host returned an invalid size header");let t=Number(e);if(!Number.isSafeInteger(t))throw new H("response","The image host returned an invalid size header");return t}async function mt(r){try{await r.body?.cancel()}catch{}}function br(r){return new H("too-large",`Remote images cannot exceed ${Math.floor(r/(1024*1024))||r} ${r>=1024*1024?"MiB":"bytes"}`)}function lh(){return typeof globalThis.fetch=="function"?globalThis.fetch.bind(globalThis):void 0}function dh(){let r=globalThis.URL;if(!(typeof r!="function"||typeof r.createObjectURL!="function"||typeof r.revokeObjectURL!="function"))return{create:e=>r.createObjectURL(e),revoke:e=>r.revokeObjectURL(e)}}function ve(r,e,t,i){if(!Number.isSafeInteger(r)||r<e||r>t)throw new RangeError(`${i} must be an integer between ${e} and ${t}`);return r}function ch(r){return r instanceof Error&&r.name==="AbortError"}function jt(){return new H("destroyed","The remote image loader has been destroyed")}function kr(r,e){return e.aborted?Promise.reject(ee()):new Promise((t,i)=>{let n=!1,o=()=>{n||(n=!0,i(ee()))};e.addEventListener("abort",o,{once:!0}),r.then(a=>{n||(n=!0,e.removeEventListener("abort",o),t(a))},a=>{n||(n=!0,e.removeEventListener("abort",o),i(a))})})}function ee(){if(typeof DOMException=="function")return new DOMException("The remote image request was cancelled","AbortError");let r=new Error("The remote image request was cancelled");return r.name="AbortError",r}var uh=10*1024*1024,ph=2560,eo=32e6,xr=1200,wr=400,to=2*1024*1024,hh=20*1024*1024,mh=80*1024*1024,Bs=8*1024*1024,gh=240,fh=64*1024*1024,bh=[.88,.76,.64,.52,.4],Us=6e4,kh=18e4,Os=4*1024,yh=128,vh=new Set([500,502,503,504]),io="https://litterbox.catbox.moe/resources/internals/api.php",Fs="",ro="Long-lived Catbox uploads are unavailable in FUSAM. Use a temporary upload or install KikiLink as a userscript.";var Ar=class{constructor(e){this.request=e}request;prepare(e){return xh(e)}async upload(e,t,i){let n=Le(t);if(!n)throw new Error("Choose a valid temporary image lifetime");Ys(e);let o=new FormData;o.append("reqtype","fileupload"),o.append("time",n.retention),o.append("fileToUpload",Js(e));let a=await Cr(io,o,Us,this.request,void 0,i);if(!a.ok)throw new Error(Mr("Litterbox",a));let l=V(a.body.trim());if(!l||!Ph(l))throw new Error("The temporary image host returned an unexpected link");return l}};async function Hs(r,e,t,i){throw new Error(ro)}async function no(r,e,t,i){let n=Le(e);if(!n)throw new Error("Choose a valid temporary music lifetime");if(r.size<=0)throw new Error("Choose a non-empty audio file");if(r.size>hh)throw new Error("Choose room music up to 20 MB");let o=_h(r);if(!o)throw new Error("Bondage Club room music must be an MP3 or MP4 file");let a=new FormData;a.append("reqtype","fileupload"),a.append("time",n.retention),a.append("fileToUpload",new File([r],`kikilink-room-music.${o}`,{type:r.type||`audio/${o}`,lastModified:0}));let l=await Cr(io,a,Us,t,void 0,i);if(!l.ok)throw new Error(Mr("Litterbox",l));let d=Th(l.body.trim());if(!d)throw new Error("The temporary audio host returned an unexpected link");return d}async function $s(r,e,t,i){throw new Error(ro)}function Le(r){if(!r||typeof r!="object"||Array.isArray(r))return null;let e=r.retention;return e==="1h"||e==="12h"||e==="24h"||e==="72h"?{retention:e}:null}async function xh(r){await zs(r);let e=await Ws(r);try{if(e.width<=0||e.height<=0||e.width*e.height>eo)throw new Error("This image has too many pixels to prepare safely");let t=Math.min(1,ph/Math.max(e.width,e.height)),i=Math.max(1,Math.round(e.width*t)),n=Math.max(1,Math.round(e.height*t)),o=document.createElement("canvas");o.width=i,o.height=n;let a=o.getContext("2d",{alpha:!0});if(!a)throw new Error("Your browser could not prepare this image");a.imageSmoothingEnabled=!0,a.imageSmoothingQuality="high",a.drawImage(e.source,0,0,i,n);let l=await Lh(o);if(l.size>Bs)throw new Error("The privacy-prepared image is still larger than 8 MB");return{blob:l,width:i,height:n,sourceBytes:r.size}}finally{e.dispose()}}async function Ks(r){await zs(r);let e=await Ws(r);try{if(!Number.isSafeInteger(e.width)||!Number.isSafeInteger(e.height)||e.width<=0||e.height<=0||e.width*e.height>eo)throw new Error("This image has too many pixels to prepare safely");let t=document.createElement("canvas");t.width=xr,t.height=wr;let i=t.getContext("2d",{alpha:!0});if(!i)throw new Error("Your browser could not prepare this image");i.imageSmoothingEnabled=!0,i.imageSmoothingQuality="high";let n=xr/wr,o=e.width/e.height,a=0,l=0,d=e.width,c=e.height;return o>n?(d=e.height*n,a=(e.width-d)/2):o<n&&(c=e.width/n,l=(e.height-c)/2),i.drawImage(e.source,a,l,d,c,0,0,xr,wr),{blob:await Eh(t,to),width:xr,height:wr,sourceBytes:r.size}}finally{e.dispose()}}async function zs(r){if(r.size<=0)throw new Error("Choose a non-empty image file");if(r.size>uh)throw new Error("Choose an image up to 10 MB");let e=await r.arrayBuffer(),t=wh(e);if(!t)throw new Error("Use a real JPG, PNG, or WebP image");let i=r.type.toLocaleLowerCase();if(i&&i!==t&&!(t==="image/png"&&i==="image/apng"))throw new Error("The file contents do not match its image type");Ah(new Uint8Array(e),t)}function wh(r){let e=new Uint8Array(r);return e[0]===255&&e[1]===216&&e[2]===255?"image/jpeg":e[0]===137&&e[1]===80&&e[2]===78&&e[3]===71&&e[4]===13&&e[5]===10&&e[6]===26&&e[7]===10?"image/png":e[0]===82&&e[1]===73&&e[2]===70&&e[3]===70&&e[8]===87&&e[9]===69&&e[10]===66&&e[11]===80?"image/webp":null}function Ah(r,e){if(e==="image/png"){Nh(r);return}if(e==="image/jpeg"){Ch(r);return}Sh(r)}function Nh(r){if(!ae(r,8,25)||ze(r,8)!==13||qt(r,12,4)!=="IHDR")throw E();let e=ze(r,16),t=ze(r,20);gt(e,t);let i=8,n=0,o,a=0;for(;i<r.byteLength;){if(++n>4096||!ae(r,i,12))throw E();let l=ze(r,i),d=i+8,c=d+l+4;if(!Number.isSafeInteger(c)||c>r.byteLength)throw E();let u=qt(r,i+4,4);if(i===8&&(u!=="IHDR"||l!==13)||i!==8&&u==="IHDR")throw E();if(u==="acTL"){if(l!==8||o!==void 0)throw E();o=ze(r,d),qs(o,e,t)}else if(u==="fcTL"){if(o===void 0||l!==26)throw E();let p=ze(r,d+4),h=ze(r,d+8),m=ze(r,d+12),f=ze(r,d+16);if(gt(p,h),m>e||f>t||p>e-m||h>t-f||(a+=1,a>o))throw E()}i=c}if(o!==void 0&&a!==o)throw E()}function Ch(r){if(!ae(r,0,4)||r[0]!==255||r[1]!==216)throw E();let e=2,t=0,i=!1,n=!1,o=!1;for(;e<r.byteLength;){if(o){for(;e<r.byteLength;){if(r[e]!==255){e+=1;continue}let c=e;for(;e<r.byteLength&&r[e]===255;)e+=1;if(!ae(r,e,1))throw E();let u=r[e]??-1;if(u===0||u>=208&&u<=215){e+=1;continue}e=c,o=!1;break}if(o)break;continue}if(++t>4096||r[e]!==255)throw E();for(;e<r.byteLength&&r[e]===255;)e+=1;if(!ae(r,e,1))throw E();let a=r[e]??-1;if(e+=1,a===217){if(!i||!n||e!==r.byteLength)throw E();return}if(a===0||a===216||a===1||a>=208&&a<=215||!ae(r,e,2))throw E();let l=Zn(r,e),d=e+l;if(l<2||d>r.byteLength)throw E();if(Mh(a)){if(i||l<8)throw E();gt(Zn(r,e+5),Zn(r,e+3)),i=!0}else if(a===218){let c=r[e+2]??0;if(!i||c<1||l!==6+c*2)throw E();n=!0,o=!0}e=d}throw E()}function Mh(r){return r>=192&&r<=207&&r!==196&&r!==200&&r!==204}function Sh(r){if(!ae(r,0,12)||qt(r,0,4)!=="RIFF"||qt(r,8,4)!=="WEBP"||Nr(r,4)+8!==r.byteLength)throw E();let e=12,t=0,i=!1,n,o=0,a=0;for(;e<r.byteLength;){if(++t>4096||!ae(r,e,8))throw E();let l=qt(r,e,4),d=Nr(r,e+4),c=e+8,u=c+d,p=u+(d&1);if(!Number.isSafeInteger(p)||p>r.byteLength)throw E();if(l==="VP8X"){if(e!==12||n||d!==10)throw E();n={width:Vt(r,c+4)+1,height:Vt(r,c+7)+1},gt(n.width,n.height),i=!0}else if(l==="VP8 "){let h=js(r,c,u);if(Ds(n,h),o+=1,o>1)throw E();i=!0}else if(l==="VP8L"){let h=Vs(r,c,u);if(Ds(n,h),o+=1,o>1)throw E();i=!0}else if(l==="ANMF"){if(!n||d<16)throw E();let h=Vt(r,c)*2,m=Vt(r,c+3)*2,f={width:Vt(r,c+6)+1,height:Vt(r,c+9)+1};if(gt(f.width,f.height),h>n.width||m>n.height||f.width>n.width-h||f.height>n.height-m)throw E();let y=Rh(r,c+16,u);if(y.width!==f.width||y.height!==f.height)throw E();a+=1,qs(a,n.width,n.height),i=!0}e=p}if(!i||e!==r.byteLength||(a>0?o!==0:o!==1))throw E()}function Rh(r,e,t){let i=e,n=0,o;for(;i<t;){if(++n>4096||i>t-8||!ae(r,i,8))throw E();let a=qt(r,i,4),l=Nr(r,i+4),d=i+8,c=d+l,u=c+(l&1);if(!Number.isSafeInteger(u)||u>t)throw E();if(a==="VP8 "){if(o)throw E();o=js(r,d,c)}else if(a==="VP8L"){if(o)throw E();o=Vs(r,d,c)}i=u}if(!o||i!==t)throw E();return o}function js(r,e,t){if(e>t-10||!ae(r,e,10)||r[e+3]!==157||r[e+4]!==1||r[e+5]!==42)throw E();let i={width:Gs(r,e+6)&16383,height:Gs(r,e+8)&16383};return gt(i.width,i.height),i}function Vs(r,e,t){if(e>t-5||!ae(r,e,5)||r[e]!==47)throw E();let i=Nr(r,e+1);if(i>>>29)throw E();let n={width:(i&16383)+1,height:(i>>>14&16383)+1};return gt(n.width,n.height),n}function Ds(r,e){if(r&&(r.width!==e.width||r.height!==e.height))throw E()}function gt(r,e){let t=r*e;if(!Number.isSafeInteger(r)||!Number.isSafeInteger(e)||r<=0||e<=0||!Number.isSafeInteger(t)||t>eo)throw new Error("This image has too many pixels to prepare safely")}function qs(r,e,t){let i=r*e*t;if(!Number.isSafeInteger(r)||r<1||r>gh||!Number.isSafeInteger(i)||i>fh)throw new Error("This animated image is too complex to prepare safely")}function ae(r,e,t){return Number.isSafeInteger(e)&&Number.isSafeInteger(t)&&e>=0&&t>=0&&e<=r.byteLength-t}function qt(r,e,t){if(!ae(r,e,t))throw E();let i="";for(let n=0;n<t;n+=1)i+=String.fromCharCode(r[e+n]??0);return i}function Zn(r,e){if(!ae(r,e,2))throw E();return(r[e]??0)*256+(r[e+1]??0)}function Gs(r,e){if(!ae(r,e,2))throw E();return(r[e]??0)+(r[e+1]??0)*256}function Vt(r,e){if(!ae(r,e,3))throw E();return(r[e]??0)+(r[e+1]??0)*256+(r[e+2]??0)*65536}function ze(r,e){if(!ae(r,e,4))throw E();return(r[e]??0)*16777216+(r[e+1]??0)*65536+(r[e+2]??0)*256+(r[e+3]??0)}function Nr(r,e){if(!ae(r,e,4))throw E();return(r[e]??0)+(r[e+1]??0)*256+(r[e+2]??0)*65536+(r[e+3]??0)*16777216}function E(){return new Error("This image header could not be inspected safely")}async function Ws(r){if(typeof globalThis.createImageBitmap=="function"){let i=await globalThis.createImageBitmap(r,{imageOrientation:"from-image"});return{source:i,width:i.width,height:i.height,dispose:()=>i.close()}}let e=URL.createObjectURL(r),t=new Image;t.decoding="async";try{return await new Promise((i,n)=>{t.addEventListener("load",()=>i(),{once:!0}),t.addEventListener("error",()=>n(new Error("This image could not be decoded")),{once:!0}),t.src=e}),{source:t,width:t.naturalWidth,height:t.naturalHeight,dispose:()=>URL.revokeObjectURL(e)}}catch(i){throw URL.revokeObjectURL(e),i}}function Lh(r){return Xs(r,.88)}async function Eh(r,e){for(let t of bh){let i=await Xs(r,t);if(i.size<=0)throw new Error("Your browser could not create a privacy-safe WebP image");if(i.size<=e)return i}throw new Error("The privacy-prepared profile banner is still larger than 2 MB")}function Xs(r,e){return new Promise((t,i)=>{r.toBlob(n=>{if(!n||n.type!=="image/webp"){i(new Error("Your browser could not create a privacy-safe WebP image"));return}t(n)},"image/webp",e)})}function Ph(r){let e=new URL(r);return e.protocol==="https:"&&e.hostname==="litter.catbox.moe"&&!e.username&&!e.password&&!e.search&&!e.hash&&/^\/[a-z0-9_-]+\.webp$/iu.test(e.pathname)}function Ih(r){let e=new URL(r);return e.protocol==="https:"&&e.hostname==="files.catbox.moe"&&!e.username&&!e.password&&!e.search&&!e.hash&&/^\/[a-z0-9_-]+\.webp$/iu.test(e.pathname)}function Th(r){try{let e=new URL(r);return e.protocol!=="https:"||e.hostname!=="litter.catbox.moe"||e.username||e.password||e.search||e.hash||!/^\/[a-z0-9_-]+\.(?:mp3|mp4)$/iu.test(e.pathname)?null:e.href}catch{return null}}function _h(r){let e=r.name.toLocaleLowerCase().match(/\.([a-z0-9]+)$/u)?.[1];if(e&&/^(?:mp3|mp4)$/u.test(e))return e;let t=r.type.toLocaleLowerCase().split(";",1)[0];return t?{"audio/mp4":"mp4","audio/mpeg":"mp3","video/mp4":"mp4"}[t]:void 0}function Oh(r){let e=r.name.toLocaleLowerCase().match(/\.(aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/u)?.[1];if(e)return e;let t=r.type.toLocaleLowerCase().split(";",1)[0];return t?{"audio/aac":"aac","audio/flac":"flac","audio/mp4":"m4a","video/mp4":"mp4","audio/mpeg":"mp3","audio/ogg":"ogg","audio/opus":"opus","audio/wav":"wav","audio/x-wav":"wav","audio/webm":"webm"}[t]:void 0}function Dh(r){try{let e=new URL(r);return e.protocol!=="https:"||e.hostname!=="files.catbox.moe"||e.username||e.password||e.search||e.hash||!/^\/[a-z0-9_-]+\.(?:aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/iu.test(e.pathname)?void 0:e.href}catch{return}}function Ys(r){if(r.blob.type!=="image/webp"||r.blob.size<=0||r.blob.size>Bs||!Number.isSafeInteger(r.width)||r.width<=0||!Number.isSafeInteger(r.height)||r.height<=0)throw new Error("The prepared image is invalid")}function Js(r){return new File([r.blob],"kikilink-image.webp",{type:"image/webp",lastModified:0})}async function Cr(r,e,t,i,n,o){return Gh(r,e,t,i,n,o)}async function Gh(r,e,t,i,n,o){if(o?.aborted)throw new Error("The upload was cancelled");{if(r!==io)throw new Error(ro);let a=Uh();if(!a)throw new Error("The temporary upload service is unavailable in this browser");return Bh(r,e,t,a,o)}}async function Bh(r,e,t,i,n){if(n?.aborted)throw new Error("The upload was cancelled");let o=new AbortController,a=!1,l=()=>o.abort();n?.addEventListener("abort",l,{once:!0});let d=setTimeout(()=>{a=!0,o.abort()},t);try{let c=await i(r,{method:"POST",body:e,mode:"cors",credentials:"omit",cache:"no-store",redirect:"error",referrerPolicy:"no-referrer",signal:o.signal}),u=await Fh(c,o.signal);if(a)throw new Error("The upload timed out");if(n?.aborted)throw new Error("The upload was cancelled");return{ok:c.ok,status:c.status,body:u}}catch(c){throw a?new Error("The upload timed out"):n?.aborted?new Error("The upload was cancelled"):c instanceof DOMException&&c.name==="AbortError"?new Error("The upload was cancelled"):c instanceof TypeError?new Error("The upload was blocked by the browser network policy"):c}finally{clearTimeout(d),n?.removeEventListener("abort",l)}}function Uh(){try{return typeof globalThis.fetch!="function"?void 0:(r,e)=>globalThis.fetch(r,e)}catch{return}}async function Fh(r,e){let t=r.headers.get("content-length");if(t!==null&&/^\d+$/u.test(t)&&Number(t)>Os)return await r.body?.cancel().catch(()=>{}),"";let i=r.body?.getReader();if(!i)return"";let n=[],o=0,a=0,l=!1,d=()=>{i.cancel().catch(()=>{})};e.addEventListener("abort",d,{once:!0});try{for(;!e.aborted&&a<yh;){a+=1;let{done:p,value:h}=await i.read();if(p){l=!0;break}if(!(h instanceof Uint8Array))return await i.cancel(),"";if(o+=h.byteLength,o>Os)return await i.cancel(),"";n.push(h)}if(e.aborted||!l)return await i.cancel().catch(()=>{}),"";let c=new Uint8Array(o),u=0;for(let p of n)c.set(p,u),u+=p.byteLength;return new TextDecoder("utf-8",{fatal:!0}).decode(c)}catch{return await i.cancel().catch(()=>{}),""}finally{e.removeEventListener("abort",d);try{i.releaseLock()}catch{}}}function Hh(r){return/<(?:!doctype|html|head|body|meta|title)\b/iu.test(r)?"":r.replace(/[\u0000-\u001f\u007f]/gu," ").replace(/\s+/gu," ").trim().slice(0,180)}function Mr(r,e){return vh.has(e.status)?`${r} is temporarily unavailable (HTTP ${e.status}). Try again in a moment.`:Hh(e.body)||`${r} returned HTTP ${e.status}`}var Qs="http://www.w3.org/2000/svg",$h={activities:[["path",{d:"M12 3.2c.5 3.1 2.1 4.7 5.2 5.2-3.1.5-4.7 2.1-5.2 5.2-.5-3.1-2.1-4.7-5.2-5.2 3.1-.5 4.7-2.1 5.2-5.2Z"},!0],["path",{d:"M18.2 14.2c.25 1.55 1.05 2.35 2.6 2.6-1.55.25-2.35 1.05-2.6 2.6-.25-1.55-1.05-2.35-2.6-2.6 1.55-.25 2.35-1.05 2.6-2.6Z"},!0],["path",{d:"M5.7 14.8c.22 1.35.93 2.06 2.28 2.28-1.35.22-2.06.93-2.28 2.28-.22-1.35-.93-2.06-2.28-2.28 1.35-.22 2.06-.93 2.28-2.28Z"},!0]],appearance:[["path",{d:"M12 3.2a8.8 8.8 0 1 0 0 17.6c1.4 0 2.1-.75 2.1-1.62 0-.52-.25-.95-.25-1.52 0-1.1.82-1.72 1.92-1.72h1.38c2.22 0 3.65-1.48 3.65-3.74A8.8 8.8 0 0 0 12 3.2Z"}],["circle",{cx:"7.4",cy:"10.1",r:"0.9"},!0],["circle",{cx:"10.1",cy:"6.9",r:"0.9"},!0],["circle",{cx:"14.2",cy:"6.8",r:"0.9"},!0]],back:[["path",{d:"m10.2 5.2-6.8 6.8 6.8 6.8"}],["line",{x1:"4",y1:"12",x2:"20.5",y2:"12"}]],chat:[["path",{d:"M4.1 5.2h15.8v10.3H10l-5.3 3.4 1-3.4H4.1V5.2Z"}],["line",{x1:"8",y1:"9.1",x2:"16",y2:"9.1"}],["line",{x1:"8",y1:"12.6",x2:"13.5",y2:"12.6"}]],check:[["polyline",{points:"4.5 12.5 9.5 17.2 19.8 6.8"}]],close:[["line",{x1:"5.5",y1:"5.5",x2:"18.5",y2:"18.5"}],["line",{x1:"18.5",y1:"5.5",x2:"5.5",y2:"18.5"}]],copy:[["rect",{x:"8",y:"7.5",width:"11.5",height:"12",rx:"2.2"}],["path",{d:"M16 7.5V6.7a2.2 2.2 0 0 0-2.2-2.2H6.7a2.2 2.2 0 0 0-2.2 2.2v7.1A2.2 2.2 0 0 0 6.7 16H8"}]],edit:[["path",{d:"m5 16.7-.7 3 3-.7L18.8 7.5l-2.3-2.3L5 16.7Z"}],["line",{x1:"14.5",y1:"7.2",x2:"16.8",y2:"9.5"}]],external:[["path",{d:"M13 4.5h6.5V11"}],["line",{x1:"19",y1:"5",x2:"11",y2:"13"}],["path",{d:"M10 6H6.5a2 2 0 0 0-2 2v9.5a2 2 0 0 0 2 2H16a2 2 0 0 0 2-2V14"}]],home:[["path",{d:"m3.4 10.5 8.6-7 8.6 7"}],["path",{d:"M5.7 9.2v10.3h12.6V9.2"}],["path",{d:"M10 19.5v-5.8h4v5.8"}]],id:[["line",{x1:"9",y1:"4.5",x2:"7",y2:"19.5"}],["line",{x1:"17",y1:"4.5",x2:"15",y2:"19.5"}],["line",{x1:"4.5",y1:"9",x2:"19.5",y2:"9"}],["line",{x1:"3.8",y1:"15",x2:"18.8",y2:"15"}]],image:[["rect",{x:"3.5",y:"4.5",width:"17",height:"15",rx:"2.6"}],["circle",{cx:"8.4",cy:"9.2",r:"1.45"}],["path",{d:"m5.2 17 4.3-4.4 3.2 3 2.6-2.5 3.5 3.9"}]],location:[["path",{d:"M12 21s6.2-5.8 6.2-11A6.2 6.2 0 1 0 5.8 10C5.8 15.2 12 21 12 21Z"}],["circle",{cx:"12",cy:"10",r:"2.1"}]],lock:[["rect",{x:"5",y:"10",width:"14",height:"10",rx:"2.3"}],["path",{d:"M8 10V7.5a4 4 0 0 1 8 0V10"}],["line",{x1:"12",y1:"14",x2:"12",y2:"16.5"}]],more:[["circle",{cx:"5.3",cy:"12",r:"1"},!0],["circle",{cx:"12",cy:"12",r:"1"},!0],["circle",{cx:"18.7",cy:"12",r:"1"},!0]],music:[["path",{d:"M9 18V6.7l10-2v10.8"}],["circle",{cx:"6.4",cy:"18.2",r:"2.6"}],["circle",{cx:"16.4",cy:"15.7",r:"2.6"}],["line",{x1:"9",y1:"10",x2:"19",y2:"8"}]],navigation:[["circle",{cx:"12",cy:"12",r:"8.5"}],["path",{d:"m15.7 8.3-2.1 5.3-5.3 2.1 2.1-5.3 5.3-2.1Z"},!0]],next:[["path",{d:"m5.5 5 9 7-9 7V5Z"},!0],["line",{x1:"18.5",y1:"5",x2:"18.5",y2:"19"}]],note:[["path",{d:"M6 3.8h9.2L19 7.6v12.6H6V3.8Z"}],["path",{d:"M15 3.8v4h4"}],["line",{x1:"9",y1:"12",x2:"16",y2:"12"}],["line",{x1:"9",y1:"15.5",x2:"14",y2:"15.5"}]],pin:[["path",{d:"m8 4 8 0-1.5 5 3 3H6.5l3-3L8 4Z"},!0],["line",{x1:"12",y1:"12",x2:"12",y2:"20"}]],play:[["path",{d:"m7 4.5 12 7.5-12 7.5v-15Z"},!0]],pause:[["rect",{x:"6",y:"4.5",width:"4.2",height:"15",rx:"1"},!0],["rect",{x:"13.8",y:"4.5",width:"4.2",height:"15",rx:"1"},!0]],previous:[["path",{d:"m18.5 5-9 7 9 7V5Z"},!0],["line",{x1:"5.5",y1:"5",x2:"5.5",y2:"19"}]],plus:[["line",{x1:"12",y1:"4.5",x2:"12",y2:"19.5"}],["line",{x1:"4.5",y1:"12",x2:"19.5",y2:"12"}]],profile:[["rect",{x:"3.5",y:"5",width:"17",height:"14",rx:"2.4"}],["circle",{cx:"8.5",cy:"10.2",r:"2.1"}],["path",{d:"M5.8 16c.55-1.75 1.55-2.6 2.7-2.6s2.15.85 2.7 2.6"}],["line",{x1:"14",y1:"9",x2:"18",y2:"9"}],["line",{x1:"14",y1:"13",x2:"18",y2:"13"}]],reactions:[["path",{d:"M6.2 16.7h11.6l-1.5-2.2V10a4.3 4.3 0 0 0-8.6 0v4.5l-1.5 2.2Z"}],["path",{d:"M10 19a2.3 2.3 0 0 0 4 0"}],["line",{x1:"12",y1:"3.1",x2:"12",y2:"5.2"}]],refresh:[["path",{d:"M19.2 8.4A7.7 7.7 0 0 0 5.6 6.2L3.7 8.4"}],["polyline",{points:"3.7 4.7 3.7 8.4 7.5 8.4"}],["path",{d:"M4.8 15.6a7.7 7.7 0 0 0 13.6 2.2l1.9-2.2"}],["polyline",{points:"20.3 19.3 20.3 15.6 16.5 15.6"}]],reply:[["polyline",{points:"9.5 7 4.2 11.7 9.5 16.4"}],["path",{d:"M5 11.7h7.4c4.6 0 7.1 2.25 7.1 6.3"}]],search:[["circle",{cx:"10.5",cy:"10.5",r:"6.2"}],["line",{x1:"15.1",y1:"15.1",x2:"20",y2:"20"}]],send:[["path",{d:"m3.5 4.2 17 7.8-17 7.8 2.7-6.1L15 12l-8.8-1.7-2.7-6.1Z"},!0]],settings:[["line",{x1:"4",y1:"6.5",x2:"20",y2:"6.5"}],["circle",{cx:"9",cy:"6.5",r:"2"}],["line",{x1:"4",y1:"12",x2:"20",y2:"12"}],["circle",{cx:"15",cy:"12",r:"2"}],["line",{x1:"4",y1:"17.5",x2:"20",y2:"17.5"}],["circle",{cx:"11",cy:"17.5",r:"2"}]],star:[["path",{d:"m12 3.3 2.65 5.35 5.9.86-4.28 4.16 1.01 5.88L12 16.77l-5.28 2.78 1.01-5.88-4.28-4.16 5.9-.86L12 3.3Z"},!0]],status:[["circle",{cx:"12",cy:"12",r:"8"}],["circle",{cx:"12",cy:"12",r:"2.4"},!0]],trash:[["path",{d:"M5.5 7h13l-1 13h-11l-1-13Z"}],["line",{x1:"4",y1:"7",x2:"20",y2:"7"}],["path",{d:"M9 7V4.5h6V7"}],["line",{x1:"10",y1:"10.5",x2:"10.5",y2:"17"}],["line",{x1:"14",y1:"10.5",x2:"13.5",y2:"17"}]],unread:[["circle",{cx:"12",cy:"12",r:"8"}],["circle",{cx:"12",cy:"12",r:"2.2"},!0]],users:[["circle",{cx:"9",cy:"8.5",r:"3"}],["path",{d:"M3.8 19c.65-3.7 2.35-5.4 5.2-5.4s4.55 1.7 5.2 5.4"}],["path",{d:"M15.1 6.2a2.8 2.8 0 0 1 0 5.3"}],["path",{d:"M16 14c2.35.35 3.65 1.95 4.2 5"}]],warning:[["path",{d:"M12 3.5 21 20H3L12 3.5Z"}],["line",{x1:"12",y1:"9",x2:"12",y2:"14"}],["circle",{cx:"12",cy:"17",r:"0.8"},!0]],whisper:[["path",{d:"M4 5.5h16v10H9.8L5 18.8l.8-3.3H4v-10Z"}],["path",{d:"M8 11.8c1.1-1.7 2.35-2.55 4-2.55s2.9.85 4 2.55"}]]};function w(r,e="kl-icon",t=!1){let i=document.createElementNS(Qs,"svg");i.setAttribute("viewBox","0 0 24 24"),i.setAttribute("aria-hidden","true"),i.setAttribute("focusable","false"),i.setAttribute("class",e==="kl-icon"?e:`kl-icon ${e}`),t&&(i.dataset.filled="true");for(let[n,o,a]of $h[r]){let l=document.createElementNS(Qs,n);for(let[d,c]of Object.entries(o))l.setAttribute(d,c);a&&l.classList.add("kl-icon-fill"),i.append(l)}return i}var Zs=[{version:"0.29.0",date:"2026-08-30",title:"FUSAM release and privacy hardening",summary:"KikiLink now has a dedicated FUSAM build, consent-first remote profile art, durable history controls, and tighter protocol and device-storage bounds.",highlights:["Install through FUSAM with a purpose-built page-realm bundle; temporary Litterbox uploads remain available, while privileged Catbox uploads and standalone update checks stay disabled there.","Choose before loading remote profile art by default, with clearer disclosure that an image host can observe the viewer's IP address and request time.","Keep direct-message deletion, clearing, and retention effective across account-data synchronization, and apply group history and retention settings to durable content.","Resist replay and flooding more predictably through bounded presence, typing, and activity processing, unverified quote and relay labels, and immediate account-switch shutdown.","Prevent runaway device media with aggregate storage quotas, transactional checks, and orphan cleanup."]},{version:"0.28.1",date:"2026-08-29",title:"Quiet updates, clearer actions",summary:"Update discovery stays local, chat actions read naturally, and Custom Activities are easier to recognize and edit on desktop.",highlights:["Keep update discovery inside Home: KikiLink no longer sends addon-authored update Beeps to other players, while the bounded local check and Update button remain.","Read matched *action* spans in italics across direct and group chats without changing unmatched text or the guarded link, image, and Reply paths.","Recognize native Custom Activity cards through an 18 px desktop Blossom marker while mobile keeps its compact 12 px size.","Scroll the keyboard-accessible desktop character map to reach lower body slots; the established mobile creator layout remains unchanged."]},{version:"0.28.0",date:"2026-08-29",title:"Smoother groups, visible profiles",summary:"Group conversations now feel like direct chats, profile art is visible by default, and updates are easier to discover without adding background polling.",highlights:["Upload profile banners and managed-group avatars to public Catbox again: the authenticated bridge now works across isolated userscript realms without a separate permission ritual.","Use a compact direct-chat-sized group composer, aligned confirmation avatars, larger group identities, and a real inline Reply context instead of duplicated quote text.","See profile avatars, banners, and group art by default under a dedicated Players preference while chat-message previews keep their separate privacy setting.","Add a short optional bio to your KikiProfile; it travels only in a negotiated, targeted profile request and is sanitized, bounded, and cached like other saved details.","Find an official Update button on Home only when a newer strict release is available through one bounded check with no polling."]},{version:"0.27.0",date:"2026-08-29",title:"Groups you can truly manage",summary:"Creator-managed groups gain identity, membership, images, and a compact menu, with faster chat rendering and a repaired banner uploader.",highlights:["Rename your managed group, upload a clearly labeled public Catbox avatar, choose its outline, add compatible people, or kick non-owners while the group stays within 3\u20135 members.","Right-click, use the keyboard menu key, or hold a group for one compact action menu; the shorter header leaves more room for chat.","Send guarded HTTPS or privacy-prepared local images to groups and find them later in the shared lazy Gallery.","Keep older fixed-member groups as honest legacy records, with an explicit creator-only conversion before any management rights exist.","Upload Catbox profile banners without the fetch-mode hang, with authenticated bridge acceptance, one total deadline, and deterministic cancellation.","Enjoy keyed chat rows, origin-safe replay checks, visibility-bounded remote images, safer drafts and peer switching, larger group avatars, and repaired profile/contact spacing."]},{version:"0.26.0",date:"2026-08-29",title:"Cleaner chats and profiles that last",summary:"Direct and group chats now share one clear list, while profile themes, uploads, and saved public cards become more dependable.",highlights:["Find direct and group conversations in one chronological searchable list, with unmistakable GROUP badges and no nested header scrollbar.","Read clean direct messages across WCE and LikoMAT, including old saved previews, without stripping ordinary lookalike text.","Cancel a stuck profile-banner upload for real and see progress while it runs; transport timers and active slots now clean up deterministically.","Choose two strict colors for a contrast-aware profile gradient, negotiated only with compatible profile requests.","Open saved voluntary public profiles immediately, with honest SAVED PROFILE or SAVED DETAILS labels and bounded route-aware refresh instead of global polling.","Open KikiLink profiles directly from Room and Players avatars, with safer long-name spacing and distinctly recolored existing decorations."]},{version:"0.25.0",date:"2026-08-29",title:"Group clarity and expressive profiles",summary:"Group chats are easier to follow, while profile banners and decorations gain careful privacy controls.",highlights:["Find groups in their own prominent searchable section, with aggregate unread, avatar stacks, clickable participants and message authors, and incremental history loading.","Reach non-friend group members across rooms through a bounded one-hop creator relay when a direct BC route is unavailable; relay remains online-only, rate-bounded, best-effort, and unconfirmed.","Use creator-supplied display names without weakening identity checks: authenticated MemberNumbers remain authoritative.","Upload a privacy-prepared 1200\xD7400 WebP profile banner to public Catbox storage, then view remote banners under Ask first, Always show, or Links only.","Choose a strict HEX profile outline plus Golden laurel, Crimson thorns, Moonlit orbit, or Silk ribbons, with corrected status-dot layering and clearly clickable avatars.","Keep expanded profile details bounded and on demand under settings schema 25, without changing the proven Blossom hook."]},{version:"0.24.0",date:"2026-08-29",title:"Group chats and addon profiles",summary:"Small-group conversations, richer profiles, and safer room navigation arrive together.",highlights:["Create a separate addon group with 2\u20134 group-compatible KikiLink friends (3\u20135 people total) and a fixed, clearly confirmed participant list.","Accept incoming groups only from known BC friends, with coalesced local saves and visible storage-retry feedback.","Keep your current room first in Lobbies through directory omissions, filters, and refresh failures, with a Current room badge and a native leave-then-join flow.","Open a compatible player's KikiLink profile from their avatar or action menu, with optional decorations and an Only visible to you notes, tags, room, and encounter section.","Keep profile-avatar loading under Ask first, Always show, or Links only privacy control, with bounded and cancellable requests.","Benefit from tighter packet validation, bounded account data, and more resilient storage without changing the proven Blossom hook."]},{version:"0.23.0",date:"2026-08-27",title:"Rooms, contacts, and Gallery control",summary:"A quality-of-life release focused on finding people and places faster.",highlights:["Favorite live room names, keep them first, and distinguish favorites from rooms with friends.","Filter new chats to online or in-room contacts, then sort online-first or A\u2013Z.","Choose private device storage, Catbox without automatic expiry, or expiring Litterbox when adding a Gallery file.","Recognize your BC submissives with the missing Sub relationship tag.","Move KikiLink from any empty part of the desktop top bar without stealing clicks from controls."]},{version:"0.22.12",date:"2026-08-27",title:"Blossom compatibility hardening",summary:"The room Blossom now has a stable home beneath Echo's skirt icon.",highlights:["Show the Blossom only for confirmed KikiLink users, even when Presence sharing is disabled.","Keep native room drawing lightweight and avoid cross-realm Firefox permission failures.","Preserve custom Blossom positions while improving the default addon-icon stack."]},{version:"0.22.0",date:"2026-08-26",title:"Music and room workflows",summary:"Playlists, durable Catbox tracks, and room tools became one cohesive workspace.",highlights:["Build playlists from links, local files, and long-lived Catbox uploads.","Synchronize compatible tracks with room music and keep temporary room uploads explicit.","Save reusable room presets without copying passwords or oversized map data."]}];var Wt="kikilink:group-chats:v1",yt=700,et=60,je=30,vt=5,Qt=3,Xt=500,el=5,Kh=15e3,tl=60,zh=250,jh=300,Vh=1800,qh=60,Wh=210,Xh=15e3,mo=40,il=450,Lr=3,Er=3e3,Yh=5,rl=5,Ri=512,Jh=1e3,Li=3e3,Qh=128,nl=10*6e4,ol=12,Zh=500,al=20,em=250,sl=12,tm=5e3,im=6e4,rm=3e4,nm=360*6e4,ll=10080*6e4,lo=36,Ei=je*(vt-1),_r=64,Or=64,xl=5*6e4,om=864e13,wl=/^group_[a-z0-9_-]{8,58}$/u,Al=/^group2_([1-9][0-9]{0,15})_([a-z0-9_-]{8,31})$/u,am=/^ge_[a-z0-9_-]{8,40}$/u,Nl=/^gmsg_[a-z0-9_-]{8,57}$/u,Zt="\0",bt=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u,go=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu,sm=JSON.stringify({t:"gm",v:1,g:"g".repeat(_r),i:"i".repeat(Or),c:"",u:Number.MAX_SAFE_INTEGER}).length,lm=JSON.stringify({t:"gr",v:1,g:"g".repeat(_r),o:Number.MAX_SAFE_INTEGER,i:"i".repeat(Or),c:"",u:Number.MAX_SAFE_INTEGER}).length,co=Math.floor((yt-sm)/2),Ne=Math.floor((yt-lm)/2),dm=vo(JSON.stringify({t:"gr",v:2,g:`group2_${Number.MAX_SAFE_INTEGER}_${"g".repeat(31)}`,e:`ge_${"e".repeat(40)}`,o:Number.MAX_SAFE_INTEGER,i:"i".repeat(Or),c:"",u:Number.MAX_SAFE_INTEGER})),Be=Math.floor((yt-dm)/2),fo=Ne,Ir=class{constructor(e,t,i={}){this.transport=e;this.storage=t;this.#h=i.now??Date.now,this.#m=i.idFactory??(o=>yn(o)),this.#y=i.hasManagedPeer,this.#v=i.shouldPersistHistory??(()=>!0),this.#L=vl(i.persistenceDelayMs,0,5e3,jh);let n=this.transport.getOwnMemberNumber();if(!X(n))throw new Error("A valid local BC account is required");this.#S=n,this.#nt(),this.#ei()||(this.#w=!0,this.#Te()),this.#ge()}transport;storage;#e=new Map;#t=new Map;#i=new Map;#r=new Map;#a=new Map;#c=new Map;#l=new Map;#o=new Map;#s=[];#p=new Map;#g=new Map;#d=new Set;#u=new Map;#h;#m;#y;#v;#L;#S;#C=!1;#E;#R;#A;#I=0;#M;#w=!1;#G=!1;#_=!1;#O=!1;#U=!1;#X;subscribe(e){return this.#O||this.#U?()=>{}:(this.#d.add(e),()=>this.#d.delete(e))}getPersistenceState(){return{degraded:this.#G,pendingChanges:this.#w}}listGroups(){return this.#He()?[...this.#e.values()].sort(hl).map(e=>$(e)):[]}getGroup(e){if(!this.#He())return;let t=this.#e.get(e);return t?$(t):void 0}getMessages(e,t=Xt){if(!this.#He())return[];let i=vl(t,1,Xt,Xt);return(this.#t.get(e)??[]).slice(-i).map(n=>structuredClone(n))}totalUnread(){if(!this.#He())return 0;let e=0;for(let t of this.#e.values())e+=t.unread;return e}async createGroup(e,t=""){return this.#Ie(),this.#xe("$groups",()=>{if(this.#ie(),this.#e.size>=je)throw new Error(`KikiLink can keep up to ${je} group chats`);let i=this.#B(),n=oo([i,...e]);cl(n);for(let m of n)if(m!==i){if(!this.#ft(m))throw new Error(`Member ${m} must be a known BC friend`);if(this.#Pe(m,!0))throw new Error(`Member ${m} is blocked or ghosted`)}let o=this.#yi("group",m=>this.#e.has(m)||this.#r.has(m)),a=F(this.#h),l=this.#Fe(n),d=kt(t)||pl(n,l,i),c={groupId:o,title:d,creatorNumber:i,memberNumbers:n,memberNames:l,createdAt:a,updatedAt:a,lastMessage:"",lastMessageAt:0,unread:0,pinned:!1,draft:"",protocolVersion:1,stateRevision:0,appearanceRevision:0,memberNamesRevision:0,avatarUrl:"",outlineColor:""},p=xe({t:"gi",v:1,g:o,m:n,n:d,u:a});this.#e.set(o,c),this.#t.set(o,[]),this.#i.set(o,new Set),this.#Z(),this.#q({kind:"group-added",groupId:o,group:$(c),incoming:!1});let h=this.#ue(c,p);return this.#oe(c,h.handedOffTo),this.#V(c,h.handedOffTo,a),{group:$(c),...h}})}async createManagedGroup(e,t=""){return this.#Ie(),this.#xe("$groups",()=>{if(this.#ie(),this.#e.size>=je)throw new Error(`KikiLink can keep up to ${je} group chats`);let i=this.#B(),n=oo([i,...e]);cl(n),this.#Tt(n,i);let o=F(this.#h),a=this.#Fe(n),l={groupId:this.#bt(i),title:kt(t)||pl(n,a,i),creatorNumber:i,memberNumbers:n,memberNames:a,createdAt:o,updatedAt:o,lastMessage:"",lastMessageAt:0,unread:0,pinned:!1,draft:"",protocolVersion:2,epochId:this.#st(),stateRevision:1,appearanceRevision:1,memberNamesRevision:1,avatarUrl:"",outlineColor:""};this.#kt(),this.#e.set(l.groupId,l),this.#t.set(l.groupId,[]),this.#i.set(l.groupId,new Set),this.#lt(()=>{this.#e.delete(l.groupId),this.#t.delete(l.groupId),this.#i.delete(l.groupId)}),this.#q({kind:"group-added",groupId:l.groupId,group:$(l),incoming:!1});let d=this.#ee(l,"");return d.handedOffTo.length>0&&(this.#H(l,d.handedOffTo),this.#te(l,d.handedOffTo),this.#V(l,d.handedOffTo,o)),{group:$(l),...d}})}async convertLegacyGroup(e){return this.#Ie(),this.#xe(e,()=>{this.#ie();let t=this.#be(e);if(this.#Qt(t),t.protocolVersion!==1)return{group:$(t),handedOffTo:[],failed:[]};this.#Tt(t.memberNumbers,t.creatorNumber);let i=F(this.#h),n={...$(t),groupId:this.#bt(t.creatorNumber),protocolVersion:2,epochId:this.#st(),stateRevision:1,appearanceRevision:1,memberNamesRevision:1,avatarUrl:t.avatarUrl||"",outlineColor:t.outlineColor||"",updatedAt:i};this.#kt();let o=this.#t.get(e)??[],a=this.#i.get(e)??new Set,l=o.map(u=>({...structuredClone(u),groupId:n.groupId}));this.#e.delete(e),this.#t.delete(e),this.#i.delete(e),this.#o.delete(e),this.#Le(e),this.#g.delete(e),this.#f(e);let d=this.#a.get(e);this.#a.delete(e),d&&this.#a.set(n.groupId,d),this.#r.set(e,{removedAt:i,kind:"local"}),this.#e.set(n.groupId,n),this.#t.set(n.groupId,l),this.#i.set(n.groupId,new Set(l.map(he))),this.#Ke(),this.#lt(()=>{this.#e.delete(n.groupId),this.#t.delete(n.groupId),this.#i.delete(n.groupId),this.#a.delete(n.groupId),this.#e.set(e,t),this.#t.set(e,o),this.#i.set(e,a),d&&this.#a.set(e,d),this.#r.delete(e)}),this.#q({kind:"group-removed",groupId:e}),this.#q({kind:"group-added",groupId:n.groupId,group:$(n),incoming:!1});let c=this.#ee(n,e);return c.handedOffTo.length>0&&(this.#H(n,c.handedOffTo),this.#te(n,c.handedOffTo),this.#V(n,c.handedOffTo,i)),{group:$(n),...c}})}async renameGroup(e,t){return this.#ki(e,i=>{let n=kt(t);if(!n)throw new Error("A group name cannot be empty");if(n===i.title)return!1;let o=Si(i.stateRevision);return i.title=n,i.stateRevision=o,!0},"state")}async setGroupAvatar(e,t){return this.#ki(e,i=>{let n=ko(t);if(t.trim()&&!n)throw new Error("Choose a direct HTTPS image link up to 450 characters");if(n===i.avatarUrl)return!1;let o=Si(i.appearanceRevision);return i.avatarUrl=n,i.appearanceRevision=o,!0},"appearance")}async setGroupOutlineColor(e,t){return this.#ki(e,i=>{let n=yo(t);if(t.trim()&&!n)throw new Error("Choose a valid six-digit HEX group outline color");if(n===i.outlineColor)return!1;let o=Si(i.appearanceRevision);return i.outlineColor=n,i.appearanceRevision=o,!0},"appearance")}async addMember(e,t){return this.#Ie(),this.#xe(e,()=>{this.#ie();let i=this.#ke(e);if(!X(t))throw new Error("Choose a valid BC member");if(i.memberNumbers.includes(t))throw new Error("This member is already in the group");if(i.memberNumbers.length>=vt)throw new Error(`A group chat can have at most ${vt} members`);let n=oo([...i.memberNumbers,t]);this.#Tt(n,i.creatorNumber);let o=this.#st(i.epochId),a=Si(i.stateRevision),l={...i.memberNames,[t]:this.#rt(t)};this.#kt();let d=$(i),c=Pr(e,t),u=this.#c.get(c);i.memberNumbers=n,i.memberNames=l,i.epochId=o,i.stateRevision=a,i.memberNamesRevision=i.stateRevision,i.updatedAt=F(this.#h),this.#c.delete(c),this.#lt(()=>{this.#e.set(e,d),u&&this.#c.set(c,u)}),this.#ge(!0),this.#o.delete(i.groupId),this.#Le(i.groupId),this.#q({kind:"group-updated",groupId:e,group:$(i)});let p=this.#ee(i,"");return p.handedOffTo.length>0&&(this.#H(i,p.handedOffTo),this.#te(i,p.handedOffTo),this.#V(i,p.handedOffTo,i.updatedAt)),this.#Y(i.groupId),{group:$(i),...p}})}async kickMember(e,t){return this.#Ie(),this.#xe(e,()=>{this.#ie();let i=this.#ke(e);if(!i.memberNumbers.includes(t))throw new Error("This member is no longer in the group");if(t===i.creatorNumber)throw new Error("The group owner cannot be kicked");if(i.memberNumbers.length-1<Qt)throw new Error(`A group chat needs at least ${Qt} members`);let n=i.epochId,o=Si(i.stateRevision),a=this.#st(n),l=i.memberNumbers.filter(f=>f!==t),d={...i.memberNames};delete d[t],this.#kt();let c=$(i),u=new Map([...this.#c].map(([f,y])=>[f,structuredClone(y)]));i.memberNumbers=l,i.memberNames=d,i.epochId=a,i.stateRevision=o,i.memberNamesRevision=o,i.updatedAt=F(this.#h);let p=this.#Ge(i,t,n,o);this.#lt(()=>{this.#e.set(e,c),this.#c.clear();for(let[f,y]of u)this.#c.set(f,y)}),this.#o.delete(i.groupId),this.#Le(i.groupId),this.#q({kind:"group-updated",groupId:e,group:$(i)});let h=this.#ee(i,"");h.handedOffTo.length>0&&(this.#H(i,h.handedOffTo),this.#te(i,h.handedOffTo),this.#V(i,h.handedOffTo,i.updatedAt));let m=this.#Me(p);return m.handedOffTo.length>0&&h.handedOffTo.push(t),h.failed.push(...m.failed),this.#Y(i.groupId),{group:$(i),...h}})}getMessageMaxContent(e){return this.getGroup(e)?.protocolVersion===2?Be:Ne}async receiveProtocol(e,t){if(this.#O||this.#U||!this.#He()||!this.#Hi()||!X(e.senderNumber)||e.senderNumber===this.#B()||this.#Pe(e.senderNumber,!0))return!1;let i=Cl(e.payload);return!i||!this.#gt(e.senderNumber,i.t)?!1:this.#xe(i.g,()=>this.#He()?i.v===2?i.t==="gs"?this.#D(e.senderNumber,i):i.t==="ga"?this.#re(e.senderNumber,i):i.t==="gx"?this.#De(e.senderNumber,i):i.t==="gn"?this.#Oe(e.senderNumber,i):i.t==="gr"?this.#me(e.senderNumber,i,t):this.#he(e.senderNumber,i,t):i.t==="gi"?this.#x(e.senderNumber,i):i.t==="gn"?this.#ce(e.senderNumber,i):i.t==="gr"?this.#me(e.senderNumber,i,t):this.#he(e.senderNumber,i,t):!1)}async sendMessage(e,t){return this.#Ie(),this.#xe(e,()=>{this.#ie();let i=this.#be(e),n=ei(t);if(!n)throw new Error("A group message cannot be empty");let o=i.protocolVersion===2?Be:Ne;if(n.length>o)throw new Error(`A group message cannot exceed ${o} characters`);let a=this.#B(),l=this.#yi("gmsg",m=>this.#it(e,a,m)),d=F(this.#h),c={id:l,groupId:e,senderNumber:a,senderName:this.#rt(a),direction:"outgoing",content:n,sentAt:d,read:!0},u;try{u=i.protocolVersion===2?xe({t:"gm",v:2,g:e,e:i.epochId,i:l,c:n,u:d}):xe({t:"gm",v:1,g:e,i:l,c:n,u:d})}catch(m){throw i.protocolVersion!==2?m:new Error("This message is too large after safe UTF-8 encoding; shorten it")}this.#Ee(i,a,d),this.#Y(i.groupId);let p=this.#z(i,u),h=p.handedOffTo.length>0;return h&&(this.#ye(i,c),this.#Z(),this.#q({kind:"message",groupId:e,message:structuredClone(c),incoming:!1})),{message:structuredClone(c),persisted:h,...p}})}async markRead(e){this.#Ie(),await this.#xe(e,()=>{this.#ie();let t=this.#e.get(e);if(!t||t.unread===0)return;let i=this.#t.get(e)??[];for(let n of i)n.direction==="incoming"&&(n.read=!0);t.unread=0,t.updatedAt=F(this.#h),this.#Z(),this.#q({kind:"group-updated",groupId:e,group:$(t)})})}async setDraft(e,t){return this.#Ie(),this.#xe(e,()=>{this.#ie();let i=this.#be(e),n=Ll(t,i.protocolVersion===2?Be:fo);return n===i.draft||(i.draft=n,i.updatedAt=F(this.#h),this.#Z(!1),this.#q({kind:"group-updated",groupId:e,group:$(i)})),n})}async togglePinned(e){return this.#Ie(),this.#xe(e,()=>{this.#ie();let t=this.#be(e);return t.pinned=!t.pinned,t.updatedAt=F(this.#h),this.#Z(),this.#q({kind:"group-updated",groupId:e,group:$(t)}),t.pinned})}async removeGroup(e){return this.#Ie(),this.#xe(e,()=>(this.#ie(),this.#e.delete(e)?(this.#t.delete(e),this.#i.delete(e),this.#a.delete(e),this.#o.delete(e),this.#Le(e),this.#g.delete(e),this.#f(e),this.#ge(!0),this.#r.set(e,{removedAt:F(this.#h),kind:"local"}),this.#Ke(),this.#Zt(),this.#ae(),this.#Te(),this.#q({kind:"group-removed",groupId:e}),!0):!1))}async clear(){this.#Ie(!0),await this.#$e(),this.#ie(),this.#e.clear(),this.#t.clear(),this.#i.clear(),this.#r.clear(),this.#a.clear(),this.#c.clear(),this.#l.clear(),this.#o.clear(),this.#Ct(),this.#fe(),this.#g.clear(),this.#ae(),this.#w=!0,this.#_=!1;let e=this.#_t();return this.#q({kind:"cleared"}),e}async prune(e){if(this.#Ie(),!Number.isFinite(e)||e<0)return 0;await this.#$e(),this.#ie();let t=0;for(let[i,n]of this.#t){let o=n.filter(d=>d.sentAt>=e);if(t+=n.length-o.length,o.length===n.length)continue;let a=F(this.#h);for(let d of n)d.sentAt<e&&this.#Ue(i,d.senderNumber,d.id,a);this.#t.set(i,o),this.#i.set(i,new Set(o.map(he)));let l=this.#e.get(i);l&&this.#Q(l,o)}return t>0&&(this.#Zt(),this.#ae(),this.#Te()),t}async applyHistoryPolicy(e){return this.#Ie(),this.#ei()?(await this.prune(e),this.getPersistenceState()):(await this.#$e(),this.#ie(),this.#Zt(),this.#ae(),this.#Te(),this.getPersistenceState())}async flush(){return this.#ae(),await this.#$e(),this.#ae(),this.#Te(),this.getPersistenceState()}flushNow(){return this.#ae(),this.#Te(),this.getPersistenceState()}destroy(){return this.#X?this.#X:(this.#O=!0,this.#ae(),this.#Ct(),this.#fe(),this.#X=(async()=>(await this.#$e(),this.#Te(),this.#d.clear(),this.#U=!0,this.getPersistenceState()))(),this.#X)}#x(e,t){if(this.#r.has(t.g)||!t.m.includes(this.#B())||!t.m.includes(e)||!this.#bi(e))return!1;for(let d of t.m)if(d!==this.#B()&&this.#Pe(d,!0))return!1;let i=this.#e.get(t.g);if(i)return i.creatorNumber===e&&Yt(i.memberNumbers,t.m);if(this.#e.size>=je-rl)return!1;let n=F(this.#h),o=Mi(t.u,n),a=this.#Fe(t.m),l={groupId:t.g,title:t.n,creatorNumber:e,memberNumbers:[...t.m],memberNames:a,createdAt:o,updatedAt:n,lastMessage:"",lastMessageAt:0,unread:0,pinned:!1,draft:"",protocolVersion:1,stateRevision:0,appearanceRevision:0,memberNamesRevision:0,avatarUrl:"",outlineColor:""};return this.#e.set(t.g,l),this.#t.set(t.g,[]),this.#i.set(t.g,new Set),this.#Z(),this.#q({kind:"group-added",groupId:t.g,group:$(l),incoming:!0}),!0}#ce(e,t){let i=this.#e.get(t.g);if(!i||i.protocolVersion!==1||e!==i.creatorNumber||Math.abs(t.u-i.createdAt)>xl||!Yt(i.memberNumbers,t.d.map(([o])=>o)))return!1;let n=Object.fromEntries(t.d.map(([o,a])=>[o,a]));return ul(i.memberNames,n,i.memberNumbers)||(i.memberNames=n,i.updatedAt=F(this.#h),this.#Z(),this.#q({kind:"group-updated",groupId:i.groupId,group:$(i)})),!0}#D(e,t){if(e!==t.o||Pe(t.g)!==t.o)return!1;let i=this.#B();if(!t.m.includes(i)||!t.m.includes(t.o))return!1;for(let b of t.m)if(b!==i&&this.#Pe(b,!0))return!1;let n=this.#r.get(t.g),o=!1;if(n){if(n.kind==="local"||n.creatorNumber!==t.o||t.r<=(n.stateRevision??0)||t.e===n.epochId||!this.#bi(e))return!1;o=!0}let a=this.#e.get(t.g);if(a){if(a.protocolVersion!==2||a.creatorNumber!==e||t.p!==""||t.r<a.stateRevision)return!1;if(t.r===a.stateRevision)return t.e===a.epochId&&t.n===a.title&&Yt(t.m,a.memberNumbers);let b=!Yt(t.m,a.memberNumbers);if(b&&t.e===a.epochId)return!1;try{this.#kt()}catch{return!1}let N=$(a);a.memberNumbers=[...t.m],a.memberNames=this.#Ze(a.memberNames,t.m),a.title=t.n,a.epochId=t.e,a.stateRevision=t.r,a.memberNamesRevision=0,a.updatedAt=F(this.#h);try{this.#lt(()=>{this.#e.set(a.groupId,N)})}catch{return!1}return b&&(this.#o.delete(a.groupId),this.#Le(a.groupId)),this.#q({kind:"group-updated",groupId:a.groupId,group:$(a)}),!0}if(!this.#bi(e))return!1;let l=t.p?this.#e.get(t.p):void 0,d=!!(l&&l.protocolVersion===1&&l.creatorNumber===e&&Yt(l.memberNumbers,t.m));if(t.p&&!d||!d&&([...this.#e.values()].filter(N=>N.protocolVersion===2&&N.creatorNumber===e&&N.creatorNumber!==i).length>=Yh||this.#e.size>=je-rl))return!1;let c=F(this.#h),u=Mi(t.u,c),p={groupId:t.g,title:t.n,creatorNumber:t.o,memberNumbers:[...t.m],memberNames:this.#Fe(t.m),createdAt:u,updatedAt:c,lastMessage:"",lastMessageAt:0,unread:0,pinned:l?.pinned??!1,draft:l?.draft??"",protocolVersion:2,epochId:t.e,stateRevision:t.r,appearanceRevision:0,memberNamesRevision:0,avatarUrl:l?.avatarUrl??"",outlineColor:l?.outlineColor??""},h=[];try{this.#kt()}catch{return!1}let m=new Map([...this.#r].map(([b,N])=>[b,structuredClone(N)])),f=l?this.#t.get(l.groupId)??[]:[],y=l?this.#i.get(l.groupId)??new Set:new Set,g=l?this.#a.get(l.groupId):void 0,x=this.#a.get(p.groupId);d&&l&&(h=f.map(b=>({...structuredClone(b),groupId:p.groupId})),this.#e.delete(l.groupId),this.#t.delete(l.groupId),this.#i.delete(l.groupId),this.#a.delete(l.groupId),g&&this.#a.set(p.groupId,g),this.#r.set(l.groupId,{removedAt:c,kind:"local"})),o&&this.#r.delete(t.g),this.#e.set(p.groupId,p),this.#t.set(p.groupId,h),this.#i.set(p.groupId,new Set(h.map(he))),this.#Q(p,h),this.#Ke();try{this.#lt(()=>{this.#e.delete(p.groupId),this.#t.delete(p.groupId),this.#i.delete(p.groupId),this.#a.delete(p.groupId),this.#r.clear();for(let[b,N]of m)this.#r.set(b,N);d&&l&&(this.#e.set(l.groupId,l),this.#t.set(l.groupId,f),this.#i.set(l.groupId,y),g&&this.#a.set(l.groupId,g)),x&&this.#a.set(p.groupId,x)})}catch{return!1}return d&&l&&(this.#o.delete(l.groupId),this.#Le(l.groupId),this.#g.delete(l.groupId),this.#q({kind:"group-removed",groupId:l.groupId})),this.#q({kind:"group-added",groupId:p.groupId,group:$(p),incoming:!0}),!0}#re(e,t){let i=this.#e.get(t.g);return!i||i.protocolVersion!==2||e!==t.o||t.o!==i.creatorNumber||t.e!==i.epochId||Pe(t.g)!==t.o||t.r<i.appearanceRevision?!1:t.r===i.appearanceRevision?t.a===i.avatarUrl&&t.c===i.outlineColor:(i.avatarUrl=t.a,i.outlineColor=t.c,i.appearanceRevision=t.r,i.updatedAt=F(this.#h),this.#Z(),this.#q({kind:"group-updated",groupId:i.groupId,group:$(i)}),!0)}#Oe(e,t){let i=this.#e.get(t.g);if(!i||i.protocolVersion!==2||e!==t.o||t.o!==i.creatorNumber||t.e!==i.epochId||t.r!==i.stateRevision||!Yt(i.memberNumbers,t.d.map(([o])=>o)))return!1;let n=Object.fromEntries(t.d.map(([o,a])=>[o,a]));return t.r<i.memberNamesRevision?!1:t.r===i.memberNamesRevision?ul(i.memberNames,n,i.memberNumbers):(i.memberNames=n,i.memberNamesRevision=t.r,i.updatedAt=F(this.#h),this.#Z(),this.#q({kind:"group-updated",groupId:i.groupId,group:$(i)}),!0)}#De(e,t){let i=this.#e.get(t.g);if(!i||i.protocolVersion!==2||e!==t.o||t.o!==i.creatorNumber||Pe(t.g)!==t.o||t.e!==i.epochId||t.r<=i.stateRevision)return!1;try{this.#kt()}catch{return!1}let n=F(this.#h),o=this.#t.get(i.groupId)??[],a=this.#i.get(i.groupId)??new Set,l=this.#a.get(i.groupId),d=new Map([...this.#r].map(([c,u])=>[c,structuredClone(u)]));this.#e.delete(i.groupId),this.#t.delete(i.groupId),this.#i.delete(i.groupId),this.#a.delete(i.groupId),this.#r.set(i.groupId,{removedAt:n,kind:"revoked",creatorNumber:i.creatorNumber,epochId:i.epochId,stateRevision:t.r}),this.#Ke();try{this.#lt(()=>{this.#r.clear();for(let[c,u]of d)this.#r.set(c,u);this.#e.set(i.groupId,i),this.#t.set(i.groupId,o),this.#i.set(i.groupId,a),l&&this.#a.set(i.groupId,l)})}catch{return!1}return this.#o.delete(i.groupId),this.#Le(i.groupId),this.#g.delete(i.groupId),this.#q({kind:"group-removed",groupId:i.groupId}),!0}#he(e,t,i){let n=this.#e.get(t.g);if(!n||n.protocolVersion!==t.v||t.v===2&&t.e!==n.epochId||!n.memberNumbers.includes(e)||this.#it(t.g,e,t.i)||!this.#Qe(t.g,e))return!1;let o=F(this.#h),a={id:t.i,groupId:t.g,senderNumber:e,senderName:this.#Jt(n,e),direction:"incoming",content:t.c,sentAt:Mi(t.u,o),read:i===t.g};return n.memberNames={...n.memberNames,[e]:a.senderName},this.#ye(n,a),this.#Z(),this.#q({kind:"message",groupId:t.g,message:structuredClone(a),incoming:!0}),this.#B()===n.creatorNumber&&e!==n.creatorNumber&&t.c.length<=(t.v===2?Be:Ne)&&this.#Je(n,e,t),!0}#me(e,t,i){let n=this.#e.get(t.g),o=this.#B();if(!n||n.protocolVersion!==t.v||t.v===2&&t.e!==n.epochId||e!==n.creatorNumber||o===n.creatorNumber||t.o===n.creatorNumber||t.o===o||!n.memberNumbers.includes(t.o)||this.#Pe(t.o,!0)||this.#it(t.g,t.o,t.i)||!this.#Qe(t.g,t.o))return!1;let a=F(this.#h),l={id:t.i,groupId:t.g,senderNumber:t.o,senderName:this.#Jt(n,t.o),direction:"incoming",content:t.c,sentAt:Mi(t.u,a),read:i===t.g,relayedByCreator:e};return this.#ye(n,l),this.#Z(),this.#q({kind:"message",groupId:t.g,message:structuredClone(l),incoming:!0}),!0}#ye(e,t){let i=this.#t.get(e.groupId)??[],n=this.#i.get(e.groupId)??new Set;if(i.push(t),n.add(he(t)),i.sort(Rr),i.length>Xt){let o=i.splice(0,i.length-Xt),a=F(this.#h);for(let l of o)n.delete(he(l)),this.#Ue(e.groupId,l.senderNumber,l.id,a)}this.#t.set(e.groupId,i),this.#i.set(e.groupId,n),this.#Q(e,i),this.#Dt()}#Q(e,t){let i=t.at(-1);e.lastMessage=i?.content??"",e.lastMessageAt=i?.sentAt??0,i?e.lastSenderNumber=i.senderNumber:delete e.lastSenderNumber,e.unread=t.reduce((n,o)=>n+ +(o.direction==="incoming"&&!o.read),0),e.updatedAt=F(this.#h)}#ue(e,t,i=e.memberNumbers){let n=this.#B(),o=[],a=[];for(let l of i)if(!(l===n||!e.memberNumbers.includes(l))){if(this.#Pe(l,!0)){a.push({memberNumber:l,message:"Member is blocked or ghosted"});continue}if(!this.#F(l)){a.push({memberNumber:l,message:"No same-room or known-friend route is available"});continue}try{this.transport.sendKikiLinkProtocol(l,t),o.push(l)}catch(d){a.push({memberNumber:l,message:d instanceof Error?d.message:"KikiLink packet could not be sent"})}}return{handedOffTo:o,failed:a}}#z(e,t){let i=this.#B(),n=[],o=[],a=new Set;for(let m of e.memberNumbers)m!==i&&this.#Pe(m,!0)&&a.add(m);let l=i!==e.creatorNumber&&[...a].some(m=>m!==e.creatorNumber);for(let m of e.memberNumbers)if(m!==i){if(a.has(m)){o.push({memberNumber:m,message:"Member is blocked or ghosted"});continue}if(m===e.creatorNumber&&l){o.push({memberNumber:m,message:"Creator relay is disabled while another group member is blocked or ghosted"});continue}if(this.#F(m))try{this.transport.sendKikiLinkProtocol(m,t),n.push(m)}catch(f){o.push({memberNumber:m,message:f instanceof Error?f.message:"KikiLink packet could not be sent"})}}let d=new Set(n),u=i!==e.creatorNumber&&d.has(e.creatorNumber)?e.memberNumbers.filter(m=>m!==i&&m!==e.creatorNumber&&!a.has(m)&&!d.has(m)):[],p=new Set([...n,...u]),h=e.memberNumbers.filter(m=>m!==i&&!p.has(m));for(let m of h)o.some(f=>f.memberNumber===m)||o.push({memberNumber:m,message:m===e.creatorNumber?"The group creator is unavailable for relay":"No direct route is available and the group creator could not relay"});return{handedOffTo:n,failed:o,...u.length>0?{relayViaCreator:e.creatorNumber,relayTargets:u}:{},unreachable:h}}#F(e){try{if(this.transport.isMemberInCurrentRoom?.(e)===!0)return!0}catch{}try{return this.transport.isKnownFriend?.(e)===!0}catch{return!1}}#oe(e,t){if(e.protocolVersion!==1||e.creatorNumber!==this.#B()||t.length===0)return;let i;try{i=xe({t:"gn",v:1,g:e.groupId,d:e.memberNumbers.map(n=>[n,uo(e.memberNames[n],n)]),u:e.createdAt})}catch{return}for(let n of t)try{this.transport.sendKikiLinkProtocol(n,i)}catch{}}#ee(e,t,i=e.memberNumbers){let n=xe(this.#T(e,t));return this.#ue(e,n,i)}#H(e,t){if(e.protocolVersion!==2||e.creatorNumber!==this.#B()||t.length===0)return;let i;try{i=xe(this.#b(e))}catch{return}this.#j(t,i)}#te(e,t){if(e.protocolVersion!==2||e.creatorNumber!==this.#B()||t.length===0)return;let i;for(let n=mo;n>=1;n-=1)try{i=xe({t:"gn",v:2,g:e.groupId,o:e.creatorNumber,e:e.epochId,r:e.stateRevision,d:e.memberNumbers.map(o=>[o,uo(e.memberNames[o],o,n)]),u:e.createdAt});break}catch{}i&&this.#j(t,i)}#j(e,t){for(let i of e)try{this.transport.sendKikiLinkProtocol(i,t)}catch{}}#Ge(e,t,i,n){let o=F(this.#h),a={groupId:e.groupId,creatorNumber:e.creatorNumber,targetNumber:t,epochId:i,stateRevision:n,createdAt:e.createdAt,queuedAt:o,lastAttemptAt:0,attempts:0},l=Pr(e.groupId,t);return this.#c.set(l,a),this.#Se(),l}#Me(e){let t=this.#c.get(e);if(!t)return{handedOffTo:[],failed:[]};let i=F(this.#h);t.lastAttemptAt=i,t.attempts+=1;let n=this.#W(t);return n.handedOffTo.length>0&&this.#c.delete(e),this.#Z(),this.#ge(!0),n}#W(e){let t=e.targetNumber;if(this.#Pe(t,!0))return{handedOffTo:[],failed:[{memberNumber:t,message:"Member is blocked or ghosted"}]};if(!this.#F(t))return{handedOffTo:[],failed:[{memberNumber:t,message:"No same-room or known-friend route is available"}]};let i=xe({t:"gx",v:2,g:e.groupId,o:e.creatorNumber,e:e.epochId,r:e.stateRevision,u:e.createdAt});try{return this.transport.sendKikiLinkProtocol(t,i),{handedOffTo:[t],failed:[]}}catch(n){return{handedOffTo:[],failed:[{memberNumber:t,message:n instanceof Error?n.message:"KikiLink packet could not be sent"}]}}}#Y(e){if(this.#O||this.#U||!this.#He()){this.#fe();return}let t=F(this.#h),i=!1;for(let[n,o]of this.#c)if(!(e!==void 0&&o.groupId!==e)){if(t>=o.queuedAt&&(t-o.queuedAt>=ll||o.attempts>=lo)){this.#c.delete(n),i=!0;continue}t<o.lastAttemptAt||t-o.lastAttemptAt<yl(o.attempts)||(o.lastAttemptAt=t,o.attempts+=1,i=!0,this.#W(o).handedOffTo.length>0&&this.#c.delete(n))}i&&this.#Z(),this.#ge(!0)}#ge(e=!1){if(e&&this.#fe(),this.#M!==void 0||this.#O||this.#U||this.#c.size===0)return;let t=F(this.#h),i=Number.POSITIVE_INFINITY;for(let o of this.#c.values()){let a=o.queuedAt+ll,l=o.attempts>=lo?t:Math.min(a,(o.lastAttemptAt||o.queuedAt)+yl(o.attempts));i=Math.min(i,l)}let n=Math.max(0,Math.min(i-t,2147483647));this.#M=setTimeout(()=>{this.#M=void 0,this.#Y()},n)}#fe(){this.#M!==void 0&&clearTimeout(this.#M),this.#M=void 0}#f(e){for(let[t,i]of this.#c)i.groupId===e&&this.#c.delete(t)}#Se(){if(this.#c.size<=Ei)return;let e=[...this.#c.entries()].sort((t,i)=>t[1].createdAt-i[1].createdAt).slice(0,this.#c.size-Ei);for(let[t]of e)this.#c.delete(t)}#T(e,t){if(e.protocolVersion!==2||!e.epochId)throw new Error("This group does not support managed state");return{t:"gs",v:2,g:e.groupId,o:e.creatorNumber,e:e.epochId,r:e.stateRevision,m:[...e.memberNumbers],n:e.title,p:t,u:e.createdAt}}#b(e){if(e.protocolVersion!==2)throw new Error("This group does not support managed appearance");return{t:"ga",v:2,g:e.groupId,o:e.creatorNumber,e:e.epochId,r:e.appearanceRevision,a:e.avatarUrl,c:e.outlineColor,u:e.createdAt}}#Je(e,t,i){if(this.#O||this.#U||this.#B()!==e.creatorNumber||t===e.creatorNumber)return;let n;try{n=i.v===2?xe({t:"gr",v:2,g:i.g,e:i.e,o:t,i:i.i,c:i.c,u:i.u}):xe({t:"gr",v:1,g:i.g,o:t,i:i.i,c:i.c,u:i.u})}catch{return}let o=F(this.#h);this.#Be(o);for(let a of e.memberNumbers)a===e.creatorNumber||a===t||this.#Pe(a,!0)||!this.#F(a)||this.#Yt({groupId:e.groupId,...i.v===2?{epochId:i.e}:{},originNumber:t,targetNumber:a,payload:n,expiresAt:o+Xh});this.#Re()}#Re(){this.#O||this.#U||this.#A!==void 0||this.#s.length===0||(this.#A=setTimeout(()=>{this.#A=void 0,this.#$()},Wh))}#$(){if(this.#O||this.#U||!this.#He()){this.#Ct();return}let e=F(this.#h);for(;this.#s.length>0;){let t=this.#ve();if(!t||t.expiresAt<=e)continue;let i=this.#e.get(t.groupId);if(!(!i||i.epochId!==t.epochId||i.creatorNumber!==this.#B()||!i.memberNumbers.includes(t.originNumber)||!i.memberNumbers.includes(t.targetNumber)||t.originNumber===i.creatorNumber||t.targetNumber===i.creatorNumber||t.targetNumber===t.originNumber||this.#Pe(t.originNumber,!0)||this.#Pe(t.targetNumber,!0)||!this.#F(t.targetNumber))){try{this.transport.sendKikiLinkProtocol(t.targetNumber,t.payload)}catch{}break}}this.#Re()}#Le(e){for(let t=this.#s.length-1;t>=0;t-=1)this.#s[t]?.groupId===e&&this.#at(t);this.#s.length===0&&this.#A!==void 0&&(clearTimeout(this.#A),this.#A=void 0)}#Ct(){this.#A!==void 0&&clearTimeout(this.#A),this.#A=void 0,this.#s.splice(0),this.#p.clear(),this.#I=0}#at(e){let[t]=this.#s.splice(e,1);if(!t)return;if(this.#s.length===0)return this.#p.clear(),this.#I=0,t;let i=Je(t);return this.#s.some(n=>Je(n)===i)||this.#p.delete(i),t}#Be(e){for(let t=this.#s.length-1;t>=0;t-=1){let i=this.#s[t];i&&i.expiresAt<=e&&this.#at(t)}}#Yt(e){if(this.#s.length<qh)return this.#s.push(e),!0;let t=new Map;for(let a of this.#s){let l=Je(a);t.set(l,(t.get(l)??0)+1)}let i=Je(e),n=t.get(i)??0,o=0;for(let a of t.values())o=Math.max(o,a);if(o<=n)return!1;for(let a=this.#s.length-1;a>=0;a-=1){let l=this.#s[a];if(!(!l||t.get(Je(l))!==o))return this.#at(a),this.#s.push(e),!0}return!1}#ve(){let e=-1,t=Number.POSITIVE_INFINITY,i=new Set;for(let a=0;a<this.#s.length;a+=1){let l=this.#s[a];if(!l)continue;let d=Je(l);if(i.has(d))continue;i.add(d);let c=this.#p.get(d)??-1;c<t&&(e=a,t=c)}if(e<0)return;let n=this.#at(e);if(!n)return;if(this.#s.length===0)return n;this.#I>=Number.MAX_SAFE_INTEGER-1&&(this.#p.clear(),this.#I=0),this.#I+=1;let o=Je(n);return this.#s.some(a=>Je(a)===o)&&this.#p.set(o,this.#I),n}#Ee(e,t,i){if(e.creatorNumber!==t)return;let n=this.#g.get(e.groupId),o=e.memberNumbers.filter(l=>{if(l===t)return!1;let d=n?.get(l);return d===void 0||i<d||i-d>=im});if(o.length===0)return;let a=e.protocolVersion===2?this.#ee(e,"",o):this.#ue(e,xe({t:"gi",v:1,g:e.groupId,m:[...e.memberNumbers],n:e.title,u:e.createdAt}),o);a.handedOffTo.length>0&&(e.protocolVersion===2?(this.#H(e,a.handedOffTo),this.#te(e,a.handedOffTo)):this.#oe(e,a.handedOffTo),this.#V(e,a.handedOffTo,i))}#V(e,t,i){let n=this.#g.get(e.groupId);n||(n=new Map,this.#g.set(e.groupId,n));let o=new Set(e.memberNumbers);for(let a of n.keys())o.has(a)||n.delete(a);for(let a of t)a!==this.#B()&&o.has(a)&&n.set(a,i);n.size===0&&this.#g.delete(e.groupId)}#gt(e,t){let i=F(this.#h);this.#kr(i);let n=this.#l.get(e);return n||(this.#l.size>=Qh&&this.#Fi(),n={lastSeenAt:i,invites:{tokens:el,refilledAt:i},metadata:{tokens:sl,refilledAt:i},messages:{tokens:tl,refilledAt:i}},this.#l.set(e,n)),n.lastSeenAt=Math.max(n.lastSeenAt,i),t==="gi"||t==="gs"||t==="gx"?so(n.invites,el,Kh,i):t==="ga"||t==="gn"?so(n.metadata,sl,tm,i):so(n.messages,tl,zh,i)}#Qe(e,t){let i=F(this.#h);for(let[a,l]of this.#o)i>=l.lastSeenAt&&i-l.lastSeenAt>nl&&this.#o.delete(a);let n=this.#o.get(e);n||(n={lastSeenAt:i,aggregate:{tokens:al,refilledAt:i},origins:new Map},this.#o.set(e,n)),n.lastSeenAt=Math.max(n.lastSeenAt,i);let o=n.origins.get(t);return o||(o={tokens:ol,refilledAt:i},n.origins.set(t,o)),po(n.aggregate,al,em,i),po(o,ol,Zh,i),n.aggregate.tokens<1||o.tokens<1?!1:(n.aggregate.tokens-=1,o.tokens-=1,!0)}#kr(e){for(let[t,i]of this.#l)e>=i.lastSeenAt&&e-i.lastSeenAt>nl&&this.#l.delete(t)}#Fi(){let e,t=Number.POSITIVE_INFINITY;for(let[i,n]of this.#l)n.lastSeenAt<t&&(e=i,t=n.lastSeenAt);e!==void 0&&this.#l.delete(e)}#it(e,t,i){let n=he(t,i),o=this.#a.get(e);return o?.has(n)||o?.has(ao(i))?!0:this.#i.get(e)?.has(n)===!0}#Ue(e,t,i,n){let o=this.#a.get(e);o||(o=new Map,this.#a.set(e,o));let a=t===void 0?ao(i):he(t,i);if(!o.has(a)){for(o.set(a,n);o.size>Jh;){let l=um(o);if(!l)break;o.delete(l)}this.#It()}}#It(){let e=0;for(let i of this.#a.values())e+=i.size;if(e<=Li)return;let t=[...this.#a.entries()].flatMap(([i,n])=>[...n].flatMap(([o,a])=>{let l=gl(o);return l?[{groupId:i,...l,seenAt:a,identity:o}]:[]}));t.sort(ml);for(let i of t.slice(0,e-Li)){let n=this.#a.get(i.groupId);n?.delete(i.identity),n?.size===0&&this.#a.delete(i.groupId)}}#bi(e){return this.#ft(e)}#ft(e){try{return this.transport.isKnownFriend?.(e)===!0}catch{return!1}}#Pe(e,t=!0){let i=this.transport.getPlayerRelationships;if(typeof i!="function")return t;try{let n=i.call(this.transport,e);return Array.isArray(n)?n.some(o=>o==="blacklist"||o==="blacklisted"||o==="ghost"||o==="ghosted"):t}catch{return t}}#Fe(e){let t={};for(let i of e)t[i]=this.#rt(i);return t}#rt(e){try{return Jt(this.transport.getMemberName(e),e)}catch{return`Member ${e}`}}#Jt(e,t){let i=`Member ${t}`,n=this.#rt(t);return n!==i?n:Jt(e.memberNames[t],t)}#B(){return this.#S}#He(){if(this.#C)return!1;try{let e=this.transport.getOwnMemberNumber();if(e===this.#S)return!0;X(e)&&(this.#C=!0)}catch{}return!1}#ie(){if(!this.#He())throw new Error("This group chat service belongs to a different BC account")}#Ie(e=!1){if(this.#O||this.#U)throw new Error("This group chat service has been closed");if(this.#ie(),!e&&!this.#Hi())throw new Error("Group chat storage is unavailable or unsupported; retry after storage recovers or clear group history")}#Hi(){return!this.#_||this.#Mt()}#be(e){let t=this.#e.get(e);if(!t)throw new Error("This group chat is no longer available");return t}#ke(e){let t=this.#be(e);if(this.#Qt(t),t.protocolVersion!==2||!t.epochId)throw new Error("Convert this legacy group before using owner controls");return t}#Qt(e){if(e.creatorNumber!==this.#B())throw new Error("Only the group owner can make this change")}#Tt(e,t){for(let i of e){if(i===t)continue;if(!this.#ft(i))throw new Error(`Member ${i} must be a known BC friend`);if(this.#Pe(i,!0))throw new Error(`Member ${i} is blocked or ghosted`);let n=!1;try{n=this.#y?.(i)===!0}catch{n=!1}if(!n)throw new Error(`Member ${i} needs managed group support (g3)`)}}async#ki(e,t,i){return this.#Ie(),this.#xe(e,()=>{this.#ie();let n=this.#ke(e);this.#kt();let o=$(n);if(!t(n))return{group:$(n),handedOffTo:[],failed:[]};n.updatedAt=F(this.#h),this.#lt(()=>{this.#e.set(e,o)}),this.#q({kind:"group-updated",groupId:e,group:$(n)});let a=i==="state"?this.#ee(n,""):this.#ue(n,xe(this.#b(n)));return i==="state"&&a.handedOffTo.length>0&&this.#V(n,a.handedOffTo,n.updatedAt),this.#Y(n.groupId),{group:$(n),...a}})}#bt(e){for(let t=0;t<5;t+=1){let i=kl(this.#m("group"),31),n=`group2_${e}_${i}`;if(xt(n)&&!this.#e.has(n)&&!this.#r.has(n))return n}throw new Error("KikiLink could not create a creator-bound group identifier")}#st(e){for(let t=0;t<5;t+=1){let i=`ge_${kl(this.#m("group"),40)}`;if(Ge(i)&&i!==e)return i}throw new Error("KikiLink could not create a unique group generation")}#Ze(e,t){let i={};for(let n of t)i[n]=Jt(e[n],n),i[n]===`Member ${n}`&&(i[n]=this.#rt(n));return i}#yi(e,t){let i=e==="group"?wl:Nl;for(let n=0;n<5;n+=1){let o=this.#m(e);if(i.test(o)&&!t(o))return o}throw new Error("KikiLink could not create a unique group identifier")}#xe(e,t){let n=(this.#u.get(e)??Promise.resolve()).catch(()=>{}).then(t),o=n.then(()=>{},()=>{});return this.#u.set(e,o),o.finally(()=>{this.#u.get(e)===o&&this.#u.delete(e)}),n}async#$e(){for(;this.#u.size>0;)await Promise.allSettled([...this.#u.values()])}#q(e){if(this.#He())for(let t of[...this.#d])try{t(structuredClone(e))}catch(i){console.error("[KikiLink:group-chat] Update listener failed",i)}}#Z(e=!0){this.#Zt(),!(this.#O||this.#U)&&(this.#E!==void 0&&clearTimeout(this.#E),this.#E=setTimeout(()=>{this.#vi()},this.#L),!(!e||this.#R!==void 0)&&(this.#R=setTimeout(()=>{this.#vi()},Vh)))}#kt(){if(this.#ae(),!this.#Te())throw new Error("The managed group change could not be saved safely; retry when storage recovers")}#lt(e){if(this.#Zt(),this.#ae(),!this.#Te())throw e(),this.#Z(),new Error("The managed group change could not be saved safely; no packet was sent")}#Zt(){this.#w=!0}#vi(){this.#ae(),this.#Te()}#ae(){this.#E!==void 0&&clearTimeout(this.#E),this.#R!==void 0&&clearTimeout(this.#R),this.#E=void 0,this.#R=void 0}#Te(){if(this.#_&&!this.#Mt())return!1;if(!this.#w)return this.#Ot(!1),!0;this.#Dt(),this.#It();let e;try{e=JSON.stringify(this.#xi()),this.storage.setItem(Wt,e);let t=Sr(this.storage,Wt);if(!t.ok||t.value!==e)throw new Error("Browser storage did not retain the group state")}catch{return this.#Ot(!0),!1}return this.#w=!1,this.#Ot(!1),!0}#_t(){try{this.storage.removeItem(Wt);let e=Sr(this.storage,Wt);if(!e.ok||e.value!==null)throw new Error("Browser storage did not remove the group state");return this.#w=!1,this.#Ot(!1),!0}catch{return this.#Te()}}#Mt(){let e=Sr(this.storage,Wt);if(!e.ok)return!1;if(e.value){let t=dl(e.value,this.#S);if(!t)return!1;this.#St(t),this.#ge(!0)}return this.#_=!1,this.#Ot(!1),!0}#Ot(e){this.#G!==e&&(this.#G=e,this.#q({kind:"persistence",state:this.getPersistenceState()}))}#xi(){let e=this.#ei(),t=[...this.#e.values()].sort(hl).map(o=>{let a=$(o);return e||(a.draft="",a.lastMessage="",a.lastMessageAt=0,a.unread=0,delete a.lastSenderNumber),a}),i=e?[]:[...this.#t.entries()].flatMap(([o,a])=>a.map(l=>({groupId:o,originNumber:l.senderNumber,messageId:l.id,seenAt:F(this.#h)})));return{version:Lr,groups:t,messages:e?[...this.#t.values()].flat().sort(Rr).map(o=>structuredClone(o)):[],tombstones:[...this.#r].map(([o,a])=>({groupId:o,...structuredClone(a)})).sort((o,a)=>a.removedAt-o.removedAt).slice(0,Ri),messageTombstones:[...[...this.#a.entries()].flatMap(([o,a])=>[...a].flatMap(([l,d])=>{let c=gl(l);return c?[{groupId:o,...c,seenAt:d}]:[]})),...i].sort(ml).slice(-Li),pendingRevocations:[...this.#c.values()].map(o=>structuredClone(o)).sort((o,a)=>o.createdAt-a.createdAt).slice(-Ei)}}#ei(){try{return this.#v()!==!1}catch{return!1}}#nt(){let e=Sr(this.storage,Wt);if(!e.ok){this.#_=!0,this.#G=!0;return}let t=e.value;if(!t)return;let i=dl(t,this.#S);if(!i){this.#_=!0,this.#G=!0;return}this.#St(i)}#St(e){this.#e.clear(),this.#t.clear(),this.#i.clear(),this.#r.clear(),this.#a.clear(),this.#c.clear(),this.#g.clear();let t=this.#S,i=e.groups;for(let a of i){if(this.#e.size>=je)break;let l=Ml(a,t);!l||this.#e.has(l.groupId)||(this.#e.set(l.groupId,l),this.#t.set(l.groupId,[]),this.#i.set(l.groupId,new Set))}for(let a of e.messageTombstones.slice(-Li))!Ae(a)||!this.#e.has(typeof a.groupId=="string"?a.groupId:"")||!Ze(a.messageId)||!we(a.seenAt)||this.#Ue(a.groupId,a.originNumber,a.messageId,a.seenAt);let n=new Map,o=e.messages.slice(-Er);for(let a of o){let l=Ae(a)&&typeof a.groupId=="string"?a.groupId:"",d=this.#e.get(l);if(!d)continue;let c=Sl(a,d,t);if(!c)continue;let u=n.get(d.groupId)??new Set,p=he(c);if(u.has(p))continue;u.add(p),n.set(d.groupId,u);let h=this.#t.get(d.groupId)??[];if(h.push(c),h.sort(Rr),h.length>Xt){let m=h.shift();m&&this.#Ue(d.groupId,m.senderNumber,m.id,Mi(m.sentAt,F(this.#h)))}this.#t.set(d.groupId,h),this.#i.set(d.groupId,new Set(h.map(he)))}for(let[a,l]of this.#t){let d=this.#a.get(a);if(d){for(let c of l)d.delete(he(c)),d.delete(ao(c.id));d.size===0&&this.#a.delete(a)}}for(let a of this.#e.values())this.#Q(a,this.#t.get(a.groupId)??[]);for(let a of e.pendingRevocations.slice(-Ei))this.#c.set(Pr(a.groupId,a.targetNumber),structuredClone(a));for(let a of e.tombstones.slice(0,Ri))!Ae(a)||!Tr(a.groupId)||!we(a.removedAt)||this.#e.has(a.groupId)||this.#r.set(a.groupId,{removedAt:a.removedAt,kind:a.kind,...a.creatorNumber===void 0?{}:{creatorNumber:a.creatorNumber},...a.epochId===void 0?{}:{epochId:a.epochId},...a.stateRevision===void 0?{}:{stateRevision:a.stateRevision}});this.#Dt(),this.#It()}#Dt(){let e=0;for(let a of this.#t.values())e+=a.length;if(e<=Er)return;let i=[...this.#t.entries()].flatMap(([a,l])=>l.map(d=>({groupId:a,message:d}))).sort((a,l)=>Rr(a.message,l.message)).slice(0,e-Er),n=new Map,o=F(this.#h);for(let a of i){let l=n.get(a.groupId)??new Set;l.add(he(a.message)),n.set(a.groupId,l),this.#Ue(a.groupId,a.message.senderNumber,a.message.id,o)}for(let[a,l]of n){let d=(this.#t.get(a)??[]).filter(u=>!l.has(he(u)));this.#t.set(a,d),this.#i.set(a,new Set(d.map(he)));let c=this.#e.get(a);c&&this.#Q(c,d)}}#Ke(){if(this.#r.size<=Ri)return;let e=[...this.#r.entries()].sort((t,i)=>i[1].removedAt-t[1].removedAt).slice(0,Ri);this.#r.clear();for(let[t,i]of e)this.#r.set(t,i)}};function Sr(r,e){try{let t=r.getItemResult?.(e);if(t!==void 0)return t.ok===!1||typeof t.value=="string"||t.value===null?t:{ok:!1};let i=r.getItem(e);return typeof i=="string"||i===null?{ok:!0,value:i}:{ok:!1}}catch{return{ok:!1}}}function dl(r,e){let t;try{t=JSON.parse(r)}catch{return}if(!Ae(t)||t.version!==1&&t.version!==2&&t.version!==Lr||!Array.isArray(t.groups)||!Array.isArray(t.messages)||!Array.isArray(t.tombstones)||!Array.isArray(t.messageTombstones)||t.version!==1&&t.pendingRevocations!==void 0&&!Array.isArray(t.pendingRevocations)||t.groups.length>je||t.messages.length>Er||t.tombstones.length>Ri||t.messageTombstones.length>Li||Array.isArray(t.pendingRevocations)&&t.pendingRevocations.length>Ei)return;let i=t.version===1,n=t.version===Lr,o=t,a=!i&&Array.isArray(t.pendingRevocations)?t.pendingRevocations:[],l=[],d=new Map;for(let k of o.groups){let C=Ml(k,e,i);if(!C||d.has(C.groupId))return;l.push(C),d.set(C.groupId,C)}let c=[],u=new Set,p=new Set;for(let k of o.messages){let C=Ae(k)&&typeof k.groupId=="string"?k.groupId:"",I=d.get(C);if(!I)return;let G=Sl(k,I,e);if(!G)return;let T=fl(G.groupId,G.senderNumber,G.id),D=bl(G.groupId,G.id);if(u.has(T)||!n&&p.has(D))return;u.add(T),p.add(D),c.push(G)}let h=[],m=new Set;for(let k of o.tombstones){if(!Ae(k)||!Tr(k.groupId)||!we(k.removedAt)||d.has(k.groupId)||m.has(k.groupId))return;let C=k,I=C.groupId,G=C.removedAt;if(m.add(I),i){h.push({groupId:I,removedAt:G,kind:"local"});continue}if(C.kind!=="local"&&C.kind!=="revoked")return;if(C.kind==="local"){h.push({groupId:I,removedAt:G,kind:"local"});continue}if(!xt(C.groupId)||!X(C.creatorNumber)||C.creatorNumber!==Pe(C.groupId)||!Ge(C.epochId)||!ft(C.stateRevision))return;h.push({groupId:I,removedAt:G,kind:"revoked",creatorNumber:C.creatorNumber,epochId:C.epochId,stateRevision:C.stateRevision})}let f=[],y=new Set,g=new Set,x=new Set;for(let k of o.messageTombstones){if(!Ae(k)||!Tr(k.groupId)||!d.has(k.groupId)||!Ze(k.messageId)||!we(k.seenAt))return;let C=n&&k.originNumber!==void 0?k.originNumber:void 0;if(!n&&k.originNumber!==void 0||C!==void 0&&!X(C))return;let I=k.groupId,G=k.messageId,T=bl(I,G);if(C===void 0){if(p.has(T)||x.has(T))return;g.add(T)}else{let D=fl(I,C,G);if(u.has(D)||y.has(D)||g.has(T))return;y.add(D)}x.add(T),f.push({groupId:I,...C===void 0?{}:{originNumber:C},messageId:G,seenAt:k.seenAt})}let b=[],N=new Set;for(let k of a){if(!Ae(k)||!Ee(k,["groupId","creatorNumber","targetNumber","epochId","stateRevision","createdAt","queuedAt","lastAttemptAt","attempts"])||!xt(k.groupId)||!X(k.creatorNumber)||k.creatorNumber!==e||k.creatorNumber!==Pe(k.groupId)||!X(k.targetNumber)||k.targetNumber===k.creatorNumber||!Ge(k.epochId)||!ft(k.stateRevision)||!we(k.createdAt)||!we(k.queuedAt)||!we(k.lastAttemptAt)||typeof k.attempts!="number"||!Number.isSafeInteger(k.attempts)||k.attempts<0||k.attempts>lo)return;let C=d.get(k.groupId);if(!C||C.protocolVersion!==2||C.creatorNumber!==e||k.createdAt!==C.createdAt||k.epochId===C.epochId||k.stateRevision>C.stateRevision)return;let I=Pr(k.groupId,k.targetNumber);if(N.has(I))return;N.add(I),b.push({groupId:k.groupId,creatorNumber:k.creatorNumber,targetNumber:k.targetNumber,epochId:k.epochId,stateRevision:k.stateRevision,createdAt:k.createdAt,queuedAt:k.queuedAt,lastAttemptAt:k.lastAttemptAt,attempts:k.attempts})}return{version:Lr,groups:l,messages:c,tombstones:h,messageTombstones:f,pendingRevocations:b}}function Cl(r){if(typeof r!="string"||r.length<1||r.length>yt)return null;let e;try{e=JSON.parse(r)}catch{return null}if(!Ae(e)||!we(e.u))return null;if(e.v===2)return vo(r)>yt?null:cm(e);if(e.v!==1||!Dr(e.g))return null;if(e.t==="gi"){if(!Ee(e,["t","v","g","m","n","u"])||typeof e.n!="string"||e.n.length<1||e.n.length>et||bt.test(e.n)||Qe(e.n))return null;let t=bo(e.m),i=kt(e.n);return!t||!i?null:{t:"gi",v:1,g:e.g,m:t,n:i,u:e.u}}if(e.t==="gm"){if(!Ee(e,["t","v","g","i","c","u"])||!Ze(e.i)||typeof e.c!="string"||e.c.length<1||e.c.length>co||bt.test(e.c)||Qe(e.c))return null;let t=ei(e.c);return!t||t.length>co?null:{t:"gm",v:1,g:e.g,i:e.i,c:t,u:e.u}}if(e.t==="gr"){if(!Ee(e,["t","v","g","o","i","c","u"])||!X(e.o)||!Ze(e.i)||typeof e.c!="string"||e.c.length<1||e.c.length>Ne||bt.test(e.c)||Qe(e.c))return null;let t=ei(e.c);return!t||t.length>Ne?null:{t:"gr",v:1,g:e.g,o:e.o,i:e.i,c:t,u:e.u}}if(e.t==="gn"){if(!Ee(e,["t","v","g","d","u"]))return null;let t=Rl(e.d);return t?{t:"gn",v:1,g:e.g,d:t,u:e.u}:null}return null}function xe(r){let e=JSON.stringify(r);if(!Cl(e)||e.length>yt||r.v===2&&vo(e)>yt)throw new Error("KikiLink group packet exceeds its safe transport bounds");return e}function cm(r){if(!xt(r.g)||Pe(r.g)===void 0)return null;if(r.t==="gs"){if(!Ee(r,["t","v","g","o","e","r","m","n","p","u"]))return null;let e=bo(r.m),t=kt(r.n);return!X(r.o)||r.o!==Pe(r.g)||!Ge(r.e)||!ft(r.r)||!e||!e.includes(r.o)||typeof r.n!="string"||t!==r.n||r.p!==""&&!Dr(r.p)?null:{t:"gs",v:2,g:r.g,o:r.o,e:r.e,r:r.r,m:e,n:t,p:r.p,u:r.u}}if(r.t==="ga")return!Ee(r,["t","v","g","o","e","r","a","c","u"])||!X(r.o)||r.o!==Pe(r.g)||!Ge(r.e)||!ft(r.r)||typeof r.a!="string"||ko(r.a)!==r.a||typeof r.c!="string"||yo(r.c)!==r.c?null:{t:"ga",v:2,g:r.g,o:r.o,e:r.e,r:r.r,a:r.a,c:r.c,u:r.u};if(r.t==="gn"){if(!Ee(r,["t","v","g","o","e","r","d","u"]))return null;let e=Rl(r.d);return!X(r.o)||r.o!==Pe(r.g)||!Ge(r.e)||!ft(r.r)||!e?null:{t:"gn",v:2,g:r.g,o:r.o,e:r.e,r:r.r,d:e,u:r.u}}if(r.t==="gx")return!Ee(r,["t","v","g","o","e","r","u"])||!X(r.o)||r.o!==Pe(r.g)||!Ge(r.e)||!ft(r.r)?null:{t:"gx",v:2,g:r.g,o:r.o,e:r.e,r:r.r,u:r.u};if(r.t==="gm"){if(!Ee(r,["t","v","g","e","i","c","u"])||!Ge(r.e)||!Ze(r.i)||typeof r.c!="string"||r.c.length<1||r.c.length>Be||bt.test(r.c)||Qe(r.c))return null;let e=ei(r.c);return!e||e.length>Be?null:{t:"gm",v:2,g:r.g,e:r.e,i:r.i,c:e,u:r.u}}if(r.t==="gr"){if(!Ee(r,["t","v","g","e","o","i","c","u"])||!Ge(r.e)||!X(r.o)||!Ze(r.i)||typeof r.c!="string"||r.c.length<1||r.c.length>Be||bt.test(r.c)||Qe(r.c))return null;let e=ei(r.c);return!e||e.length>Be?null:{t:"gr",v:2,g:r.g,e:r.e,o:r.o,i:r.i,c:e,u:r.u}}return null}function Ml(r,e,t=!1){if(!Ae(r)||!Tr(r.groupId)||!X(r.creatorNumber))return;let i=bo(r.memberNumbers),n=kt(r.title);if(!i||!n||!i.includes(e)||!i.includes(r.creatorNumber)||!we(r.createdAt))return;let o=t?1:r.protocolVersion===1||r.protocolVersion===2?r.protocolVersion:void 0;if(o===void 0)return;let a=o===2&&Ge(r.epochId)?r.epochId:void 0,l=o===2&&ft(r.stateRevision)?r.stateRevision:o===1&&(t||r.stateRevision===0)?0:void 0,d=o===2&&ho(r.appearanceRevision)?r.appearanceRevision:o===1&&(t||r.appearanceRevision===0)?0:void 0,c=o===2&&ho(r.memberNamesRevision)&&r.memberNamesRevision<=(l??-1)?r.memberNamesRevision:o===1&&(t||r.memberNamesRevision===0)?0:void 0;if(l===void 0||d===void 0||c===void 0||o===2&&(a===void 0||!xt(r.groupId)||Pe(r.groupId)!==r.creatorNumber)||o===1&&!Dr(r.groupId))return;let u=t?"":ko(r.avatarUrl),p=t?"":yo(r.outlineColor);if(!t&&(typeof r.avatarUrl!="string"||u!==r.avatarUrl||typeof r.outlineColor!="string"||p!==r.outlineColor))return;let h={},m=Ae(r.memberNames)?r.memberNames:{};for(let y of i)h[y]=Jt(m[y],y);let f=we(r.updatedAt)?r.updatedAt:r.createdAt;return{groupId:r.groupId,title:n,creatorNumber:r.creatorNumber,memberNumbers:i,memberNames:h,createdAt:r.createdAt,updatedAt:f,lastMessage:"",lastMessageAt:0,unread:0,pinned:r.pinned===!0,draft:Ll(r.draft,o===2?Be:fo),protocolVersion:o,...a?{epochId:a}:{},stateRevision:l,appearanceRevision:d,memberNamesRevision:c,avatarUrl:u,outlineColor:p}}function Sl(r,e,t){if(!Ae(r)||!Ze(r.id)||r.groupId!==e.groupId||!X(r.senderNumber)||typeof r.content!="string"||!we(r.sentAt)||bt.test(r.content)||Qe(r.content))return;let i=ei(r.content),n=e.protocolVersion===2?Be:co;if(!i||i.length>n||e.protocolVersion===1&&!e.memberNumbers.includes(r.senderNumber))return;let o=r.senderNumber===t?"outgoing":"incoming";return{id:r.id,groupId:e.groupId,senderNumber:r.senderNumber,senderName:Jt(r.senderName,r.senderNumber),direction:o,content:i,sentAt:r.sentAt,read:o==="outgoing"||r.read===!0,...r.relayedByCreator===e.creatorNumber&&r.senderNumber!==e.creatorNumber?{relayedByCreator:e.creatorNumber}:{}}}function oo(r){let e=new Set;for(let t of r){if(!X(t))throw new Error("Group members need valid BC member numbers");e.add(t)}return[...e].sort((t,i)=>t-i)}function bo(r){if(!Array.isArray(r)||r.length<Qt||r.length>vt)return;let e=[];for(let t of r){if(!X(t))return;let i=e.at(-1);if(i!==void 0&&i>=t)return;e.push(t)}return e}function cl(r){if(r.length<Qt||r.length>vt)throw new Error(`A group chat needs ${Qt}-${vt} total members`)}function Yt(r,e){return r.length===e.length&&r.every((t,i)=>t===e[i])}function Rl(r){if(!Array.isArray(r)||r.length<Qt||r.length>vt)return;let e=[];for(let t of r){if(!Array.isArray(t)||t.length!==2)return;let[i,n]=t;if(!X(i)||typeof n!="string"||n.length<1||n.length>mo||bt.test(n)||Qe(n)||uo(n,i)!==n)return;let o=e.at(-1)?.[0];if(o!==void 0&&o>=i)return;e.push([i,n])}return e}function ul(r,e,t){return t.every(i=>r[i]===e[i])}function kt(r){if(typeof r!="string"||Qe(r))return"";let e=r.replace(go," ").replace(/\s+/gu," ").trim();return Gr(e,et)}function ei(r){return r.replace(/\r\n?/gu,`
`).trim()}function Ll(r,e=fo){if(typeof r!="string")return"";let t=r.replace(/\r\n?/gu,`
`).replace(go," ");return Gr(t,e)}function Jt(r,e){if(typeof r!="string")return`Member ${e}`;let t=r.replace(go," ").replace(/\s+/gu," ").trim();return Gr(t,80)||`Member ${e}`}function uo(r,e,t=mo){let i=Jt(r,e);return Gr(i,t)}function pl(r,e,t){let i=r.filter(n=>n!==t).map(n=>e[n]??`Member ${n}`);return kt(`Group with ${i.join(", ")}`)||"Group chat"}function hl(r,e){return r.pinned!==e.pinned?r.pinned?-1:1:(e.lastMessageAt||e.createdAt)-(r.lastMessageAt||r.createdAt)}function Rr(r,e){return r.sentAt-e.sentAt||r.id.localeCompare(e.id)||r.senderNumber-e.senderNumber}function ml(r,e){return r.seenAt-e.seenAt||r.groupId.localeCompare(e.groupId)||r.messageId.localeCompare(e.messageId)||(r.originNumber??-1)-(e.originNumber??-1)}function um(r){let e,t=Number.POSITIVE_INFINITY;for(let[i,n]of r)(n<t||n===t&&(e===void 0||i<e))&&(e=i,t=n);return e}function he(r,e){let t=typeof r=="number"?r:r.senderNumber,i=typeof r=="number"?e:r.id;return`${t}${Zt}${i??""}`}function ao(r){return`*${Zt}${r}`}function gl(r){let e=r.indexOf(Zt);if(e<=0)return;let t=r.slice(0,e),i=r.slice(e+Zt.length);if(!Ze(i))return;if(t==="*")return{messageId:i};let n=Number(t);return X(n)?{originNumber:n,messageId:i}:void 0}function fl(r,e,t){return`${r}${Zt}${he(e,t)}`}function bl(r,e){return`${r}${Zt}${e}`}function so(r,e,t,i){return po(r,e,t,i),r.tokens<1?!1:(r.tokens-=1,!0)}function po(r,e,t,i){if(i>=r.refilledAt){let n=i-r.refilledAt;r.tokens=Math.min(e,r.tokens+n/t),r.refilledAt=i}}function $(r){return{...structuredClone(r),memberNumbers:[...r.memberNumbers],memberNames:{...r.memberNames}}}function Mi(r,e){return r>e?e:e-r<=xl?r:e}function F(r){let e=r();return we(e)?Math.round(e):Date.now()}function Tr(r){return Dr(r)||xt(r)}function Dr(r){return typeof r=="string"&&r.length<=_r&&wl.test(r)}function xt(r){if(typeof r!="string"||r.length>_r)return!1;let e=Al.exec(r);if(!e)return!1;let t=Number(e[1]);return X(t)&&String(t)===e[1]}function Pe(r){if(!xt(r))return;let e=Al.exec(r),t=Number(e?.[1]);return X(t)?t:void 0}function Ge(r){return typeof r=="string"&&am.test(r)}function Ze(r){return typeof r=="string"&&r.length<=Or&&Nl.test(r)}function X(r){return typeof r=="number"&&Number.isSafeInteger(r)&&r>0}function we(r){return typeof r=="number"&&Number.isFinite(r)&&r>=0&&r<=om}function ft(r){return typeof r=="number"&&Number.isSafeInteger(r)&&r>0}function ho(r){return typeof r=="number"&&Number.isSafeInteger(r)&&r>=0}function Si(r){if(!ho(r)||r>=Number.MAX_SAFE_INTEGER)throw new Error("This group has reached its safe update limit");return r+1}function ko(r){if(typeof r!="string")return"";let e=r.trim();if(!e||e.length>il)return"";let t=V(e);return t&&t.length<=il?t:""}function yo(r){if(typeof r!="string")return"";let e=r.trim().toLocaleLowerCase();return e&&/^#[0-9a-f]{6}$/u.test(e)?e:""}function kl(r,e){return r.toLocaleLowerCase().replace(/^group_/u,"").replace(/[^a-z0-9_-]+/gu,"_").replace(/^_+|_+$/gu,"").slice(0,e)}function Pr(r,e){return`${r}\0${e}`}function Je(r){return`${r.groupId}\0${r.originNumber}`}function yl(r){let e=Math.max(0,Math.min(r-1,20));return Math.min(rm*2**e,nm)}function vo(r){return new TextEncoder().encode(r).byteLength}function vl(r,e,t,i){return typeof r=="number"&&Number.isInteger(r)&&r>=e&&r<=t?r:i}function Ee(r,e){let t=Object.keys(r).sort(),i=[...e].sort();return t.length===i.length&&t.every((n,o)=>n===i[o])}function Qe(r){for(let e=0;e<r.length;e+=1){let t=r.charCodeAt(e);if(t>=55296&&t<=56319){let i=r.charCodeAt(e+1);if(!(i>=56320&&i<=57343))return!0;e+=1}else if(t>=56320&&t<=57343)return!0}return!1}function Gr(r,e){let t=r.slice(0,e),i=t.charCodeAt(t.length-1);return i>=55296&&i<=56319?t.slice(0,-1):t}function Ae(r){return typeof r=="object"&&r!==null&&!Array.isArray(r)}var pm=2,xo=4,hm=180,Br=120,wo=100,mm=3,gm=5,fm=3,bm=520,El=9,km=700,Ur=class{constructor(e,t,i,n={}){this.adapter=e;this.service=t;this.presence=i;this.options=n;this.newGroupButton=W("kl-group-new","New group","Create a group chat"),this.newGroupButton.title="Create a group chat with 2\u20134 KikiLink friends",this.newGroupButton.addEventListener("click",()=>this.openNewGroupDialog());let o=v("h2","kl-group-sidebar-title","Groups");this.#i=v("span","kl-group-sidebar-count","0"),this.#i.setAttribute("aria-label","0 group chats"),this.#r=v("span","kl-group-sidebar-unread","0"),this.#r.hidden=!0,this.#r.setAttribute("aria-label","0 unread group messages");let a=v("div","kl-group-sidebar-summary");a.append(o,this.#i,this.#r);let l=v("div","kl-group-sidebar-header");l.append(a,this.newGroupButton),this.#e=v("div","kl-group-list"),this.#e.setAttribute("role","list"),this.#e.setAttribute("aria-label","Group conversations"),this.#t=v("p","kl-group-list-empty","No group chats yet. Create one with 2\u20134 managed-group-compatible KikiLink contacts."),this.sidebarSection=v("section","kl-group-sidebar"),this.sidebarSection.setAttribute("aria-label","Group chats"),this.sidebarSection.append(l,this.#e,this.#t),this.#c=v("div","kl-group-header-avatar","G"),this.#c.setAttribute("aria-hidden","true"),this.#a=v("h2","kl-group-pane-title","Group chat"),this.#l=v("span","kl-group-creator-badge","Creator"),this.#l.title="You created this group",this.#l.hidden=!0;let d=v("div","kl-group-pane-title-row");d.append(this.#a,this.#l),this.#o=v("p","kl-group-member-summary"),this.#s=v("div","kl-group-participant-strip"),this.#s.setAttribute("role","list"),this.#s.setAttribute("aria-label","Group members");let c=v("div","kl-group-pane-heading");c.append(v("span","kl-group-pane-eyebrow","Group chat"),d,this.#o,this.#s),this.#v=W("kl-group-pane-menu kl-group-pane-menu-trigger","","Group actions"),this.#v.title="Group actions",this.#v.append(w("more")),this.#v.addEventListener("click",()=>{let g=this.#x;g&&this.openGroupActionMenu(g,this.#v)});let u=v("header","kl-group-pane-header");u.append(this.#c,c,this.#v),this.#d=v("div","kl-group-message-log"),this.#d.id=Ve("kl-group-message-log"),this.#d.setAttribute("role","log"),this.#d.setAttribute("aria-live","polite"),this.#d.setAttribute("aria-relevant","additions text"),this.#d.tabIndex=0,this.#g=W("kl-group-load-older","Load older messages","Load older group messages"),this.#g.setAttribute("aria-controls",this.#d.id),this.#g.hidden=!0,this.#g.addEventListener("click",()=>this.#Ie()),this.#p=v("div","kl-group-transcript"),this.#p.append(this.#g,this.#d);let p=v("label","kl-group-composer-label","Message the group");this.#u=document.createElement("textarea"),this.#u.className="kl-composer-input kl-group-composer",this.#u.id=Ve("kl-group-composer"),this.#u.maxLength=Ne,this.#u.rows=1,this.#u.placeholder="Write a group message\u2026",this.#u.setAttribute("aria-label","Message the group"),p.htmlFor=this.#u.id,this.#u.addEventListener("input",()=>this.#Hi()),this.#u.addEventListener("keydown",g=>{if(g.key!=="Enter"||g.isComposing)return;let x=g.ctrlKey||g.metaKey,b=vm(this.options.getEnterToSend,!0);!x&&(!b||g.shiftKey||g.altKey)||(g.preventDefault(),this.#yi())}),this.#h=v("span","kl-counter kl-group-composer-counter",`0/${Ne}`),this.#h.setAttribute("aria-live","polite"),this.#m=W("kl-text-button kl-text-button--primary kl-send kl-group-send","","Send group message"),this.#m.append(w("send"),v("span","kl-send-label","Send")),this.#m.disabled=!0,this.#m.addEventListener("click",()=>{this.#yi()}),this.#y=W("kl-icon-button kl-attach-image kl-group-composer-attach","","Attach an image to this group"),this.#y.title="Attach image",this.#y.append(w("image")),this.#y.addEventListener("click",()=>{this.#Tt()});let h=v("div","kl-composer-row kl-group-composer-row");h.append(this.#y,this.#u,this.#m);let m=v("div","kl-composer-options kl-group-composer-footer");m.append(this.#h);let f=v("footer","kl-composer kl-group-composer-area");f.append(p,h,m),this.#L=v("p","kl-group-feedback"),this.#L.setAttribute("role","status"),this.#L.setAttribute("aria-live","polite"),this.chatPane=v("section","kl-group-pane"),this.chatPane.setAttribute("aria-label","Group chat conversation"),this.chatPane.hidden=!0,this.chatPane.append(u,this.#p,f,this.#L),this.#S=v("h2","kl-group-dialog-title","New group chat"),this.#S.id=Ve("kl-group-dialog-title"),this.#C=v("div","kl-group-dialog-body"),this.#R=v("p","kl-group-dialog-feedback"),this.#R.setAttribute("role","status"),this.#R.setAttribute("aria-live","polite"),this.#E=v("div","kl-group-dialog-actions"),this.newGroupDialog=document.createElement("dialog"),this.newGroupDialog.className="kl-group-dialog",this.newGroupDialog.setAttribute("aria-labelledby",this.#S.id),this.newGroupDialog.append(this.#S,this.#C,this.#R,this.#E),this.newGroupDialog.addEventListener("cancel",g=>{this.#me&&g.preventDefault()}),this.newGroupDialog.addEventListener("close",()=>{this.#me||this.#nt()}),this.#A=v("div","kl-group-menu"),this.#A.setAttribute("role","menu"),this.#A.setAttribute("aria-label","Group actions"),this.#A.addEventListener("keydown",g=>this.#Je(g)),this.groupActionMenuLayer=document.createElement("dialog"),this.groupActionMenuLayer.className="kl-group-menu-layer",this.groupActionMenuLayer.setAttribute("aria-label","Group actions"),this.groupActionMenuLayer.append(this.#A),this.groupActionMenuLayer.addEventListener("cancel",g=>{g.preventDefault(),this.#$(!0)}),this.groupActionMenuLayer.addEventListener("pointerdown",g=>{g.target===this.groupActionMenuLayer&&this.#$(!0)}),this.#I=v("h2","kl-group-details-title","Group details"),this.#I.id=Ve("kl-group-details-title"),this.#M=v("div","kl-group-details-body"),this.#w=v("div","kl-group-details-actions"),this.groupDetailsDialog=document.createElement("dialog"),this.groupDetailsDialog.className="kl-group-details-dialog",this.groupDetailsDialog.setAttribute("aria-labelledby",this.#I.id),this.groupDetailsDialog.append(this.#I,this.#M,this.#w),this.groupDetailsDialog.addEventListener("cancel",g=>{g.preventDefault(),!this.#ue&&this.#V(!0)}),this.#G=this.service.subscribe(g=>this.#kt(g)),this.#_=this.presence.subscribe(g=>this.#lt(g)),this.refresh();let y=this.service.getPersistenceState();y.degraded&&this.#Ki(!0,y.pendingChanges)}adapter;service;presence;options;sidebarSection;chatPane;newGroupDialog;groupActionMenuLayer;groupDetailsDialog;newGroupButton;#e;#t;#i;#r;#a;#c;#l;#o;#s;#p;#g;#d;#u;#h;#m;#y;#v;#L;#S;#C;#E;#R;#A;#I;#M;#w;#G;#_;#O=new WeakMap;#U=new Set;#X=new WeakMap;#x;#ce=[];#D=new Set;#re="select";#Oe="";#De="";#he="";#me=!1;#ye=!1;#Q=!1;#ue=!1;#z=!1;#F;#oe;#ee;#H=Br;#te;#j;#Ge;#Me;#W;#Y;#ge;#fe=0;get nodes(){return{sidebarSection:this.sidebarSection,chatPane:this.chatPane,newGroupDialog:this.newGroupDialog,groupActionMenuLayer:this.groupActionMenuLayer,groupDetailsDialog:this.groupDetailsDialog}}get activeGroupId(){return this.#x}bindGroupActionTarget(e,t){this.#f(e);for(let g of this.#U)g.deref()||this.#U.delete(g);let i=new WeakRef(e),n=typeof t=="function"?t:()=>t,o,a,l=()=>{o!==void 0&&clearTimeout(o),o=void 0,a=void 0},d=(g,x)=>{let b=n();b&&this.openGroupActionMenu(b,e,g,x)},c=g=>{n()&&(g.preventDefault(),g.stopPropagation(),l(),d(g.clientX,g.clientY))},u=g=>{g.key!=="ContextMenu"&&!(g.key==="F10"&&g.shiftKey)||n()&&(g.preventDefault(),g.stopPropagation(),d())},p=g=>{if(g.pointerType!=="touch"&&g.pointerType!=="pen"||!n())return;l(),a={x:g.clientX,y:g.clientY};let x=g.clientX,b=g.clientY;o=setTimeout(()=>{o=void 0,this.#X.set(e,Date.now()+km),d(x,b)},bm)},h=g=>{a&&(Math.abs(g.clientX-a.x)>El||Math.abs(g.clientY-a.y)>El)&&l()},m=g=>{(this.#X.get(e)??0)<=Date.now()||(this.#X.delete(e),g.preventDefault(),g.stopImmediatePropagation())};e.addEventListener("contextmenu",c),e.addEventListener("keydown",u),e.addEventListener("pointerdown",p),e.addEventListener("pointermove",h),e.addEventListener("pointerup",l),e.addEventListener("pointercancel",l),e.addEventListener("dragstart",l),e.addEventListener("click",m,!0);let f=!0,y=()=>{f&&(f=!1,l(),e.removeEventListener("contextmenu",c),e.removeEventListener("keydown",u),e.removeEventListener("pointerdown",p),e.removeEventListener("pointermove",h),e.removeEventListener("pointerup",l),e.removeEventListener("pointercancel",l),e.removeEventListener("dragstart",l),e.removeEventListener("click",m,!0),this.#O.get(e)?.cleanup===y&&(this.#O.delete(e),this.#U.delete(i)))};return this.#O.set(e,{cleanup:y,reference:i}),this.#U.add(i),y}openGroupActionMenu(e,t,i,n){if(this.#z)return!1;let o=this.service.getGroup(e);return o?(this.#Se(),this.groupDetailsDialog.open&&this.#V(!1),this.groupActionMenuLayer.open&&this.#$(!1),this.#Ge=e,this.#Me=t,this.#T(o),Pl(this.groupActionMenuLayer),this.#Re(t,i,n),this.#A.querySelector("button[role='menuitem']:not(:disabled)")?.focus(),!0):!1}openGroupDetails(e,t){if(this.#z)return!1;let i=this.service.getGroup(e);return i?(this.#Se(),this.groupDetailsDialog.open&&this.#V(!1),this.#W=e,this.#Y=t,this.#ge=void 0,this.#Le(i),Pl(this.groupDetailsDialog),this.groupDetailsDialog.querySelector("input:not(:disabled), select:not(:disabled), button:not(:disabled)")?.focus(),!0):!1}setSearchQuery(e){let t=e.trim().toLocaleLowerCase();t!==this.#he&&(this.#he=t,this.#z||this.#Qe())}openNewGroupDialog(){if(!(this.#z||this.#me)){this.#nt(),this.#ce=this.#Ke();try{this.presence.requestMany(this.#ce.filter(e=>this.#N(e.memberNumber)).map(e=>e.memberNumber))}catch{}if(this.#Te(),!this.newGroupDialog.open)try{this.newGroupDialog.showModal()}catch{this.newGroupDialog.setAttribute("open","")}}}async activate(e){if(this.#z)return!1;if(!this.service.getGroup(e))return this.#ne({tone:"error",message:"This group chat is no longer available."}),!1;let i=this.#x!==e;i&&this.#Ze(),this.#x=e,i&&(this.#te=void 0,this.#j=void 0,this.#H=Br),this.chatPane.hidden=!1,this.#$i(),this.#B(i,!0),this.options.onActivate?.(e);try{await this.service.markRead(e)}catch{}return this.#x!==e?!1:this.service.getGroup(e)?(this.#Qe(),this.#B(!1,!1),this.#u.focus(),!0):(this.#Z(!1),!1)}closeActive(){this.#Z(!0)}handleHostClose(){if(!this.#z){if(this.#fe+=1,this.#vi(),this.newGroupDialog.open)try{this.newGroupDialog.close()}catch{this.newGroupDialog.removeAttribute("open")}this.#me||this.#nt(),this.#$(!1),this.#V(!1)}}async markVisibleActiveRead(){let e=this.#x;if(!(this.#z||!e||this.chatPane.hidden)){try{await this.service.markRead(e)}catch{return}this.#x===e&&(this.#Qe(),this.#B(!1,!1))}}refresh(){if(!this.#z){if(this.#Qe(),this.#x){let e=this.#ee?.groupId===this.#x;this.#B(!this.#bt()&&!e,!1)}if(this.newGroupDialog.open&&this.#re==="select"&&(this.#ce=this.#Ke(),this.#_t()),this.groupDetailsDialog.open&&this.#W){let e=this.service.getGroup(this.#W);e?this.#Le(e):this.#V(!0)}}}flushPendingDraft(){return this.#Ze()}destroy(){if(!this.#z){this.#Ze(),this.#z=!0,this.#fe+=1,this.#vi(),this.#G(),this.#_();try{this.newGroupDialog.open&&this.newGroupDialog.close()}catch{this.newGroupDialog.removeAttribute("open")}this.#$(!1),this.#V(!1);for(let e of[...this.#U]){let t=e.deref();t&&this.#f(t)}this.#U.clear(),this.sidebarSection.remove(),this.chatPane.remove(),this.newGroupDialog.remove(),this.groupActionMenuLayer.remove(),this.groupDetailsDialog.remove()}}#f(e){this.#O.get(e)?.cleanup()}#Se(){let e=this.newGroupDialog.parentNode??this.chatPane.parentNode??document.body;this.groupActionMenuLayer.parentNode||e.appendChild(this.groupActionMenuLayer),this.groupDetailsDialog.parentNode||e.appendChild(this.groupDetailsDialog)}#T(e){let t=v("div","kl-group-menu-header"),i=v("div","kl-group-header-avatar");i.setAttribute("aria-hidden","true"),this.#It(i,e);let n=v("div","kl-group-menu-copy");n.append(v("strong","kl-group-menu-title",e.title),v("span","kl-group-menu-meta",`${e.memberNumbers.length} members \xB7 ${e.protocolVersion===2?"Managed group":"Legacy group"}`)),t.append(i,n);let o=v("div","kl-group-menu-section");o.append(this.#b(this.#Gt(e)&&e.protocolVersion===2?"Manage group":"Group details","details",()=>{let d=this.#Me;this.#$(!1),this.openGroupDetails(e.groupId,d)})),this.options.onAttachImage&&o.append(this.#b("Attach image","attach-image",()=>{let d=this.#Me??this.#v;this.#$(!1),this.#ki(e.groupId,d)}));let a=!1;try{a=this.options.canRevealGroupAvatar?.(structuredClone(e))===!0}catch{a=!1}this.options.onRevealGroupAvatar&&a&&o.append(this.#b("Show group avatar","show-avatar",()=>{let d=this.#Me;this.#$(!1);try{this.options.onRevealGroupAvatar?.(e.groupId)}catch{this.#ne({tone:"error",message:"The group avatar could not be revealed safely.",groupId:e.groupId})}this.#gt(d)})),o.append(this.#b(e.pinned?"Unpin group":"Pin group","toggle-pin",()=>{this.#$(!0),this.#$e(e.groupId)})),e.groupId===this.#x&&o.append(this.#b("Close chat","close",()=>{this.#$(!1),this.closeActive()}));let l=v("div","kl-group-menu-section");l.append(this.#b("Remove from this device","remove",()=>{this.#$(!0),this.#q(e.groupId)},!0)),this.#A.replaceChildren(t,o,l)}#b(e,t,i,n=!1){let o=W(n?"kl-group-menu-action kl-group-menu-action--danger":"kl-group-menu-action","");o.dataset.groupAction=t,o.setAttribute("role","menuitem"),o.disabled=this.#Q;let a=t==="attach-image"||t==="show-avatar"?"image":t==="toggle-pin"?"pin":t==="close"?"close":t==="remove"?"trash":"settings";return o.append(w(a),v("span","kl-group-menu-action-label",e)),o.addEventListener("click",i),o}#Je(e){if(e.key==="Escape"){e.preventDefault(),e.stopPropagation(),this.#$(!0);return}let t=[...this.#A.querySelectorAll("button[role='menuitem']:not(:disabled)")];if(t.length===0)return;let i=t.indexOf(e.target),n=-1;e.key==="ArrowDown"?n=i<0?0:(i+1)%t.length:e.key==="ArrowUp"?n=i<0?t.length-1:(i-1+t.length)%t.length:e.key==="Home"?n=0:e.key==="End"&&(n=t.length-1),!(n<0)&&(e.preventDefault(),t[n]?.focus())}#Re(e,t,i){let n=e?.getBoundingClientRect(),o=Number.isFinite(t)&&t!==void 0?t:n?.left??8,a=Number.isFinite(i)&&i!==void 0?i:(n?.bottom??8)+4,l=Math.max(0,globalThis.innerWidth??0),d=Math.max(0,globalThis.innerHeight??0),c=this.#A.offsetWidth||244,u=this.#A.offsetHeight||260,p=Math.max(8,Math.min(o,Math.max(8,l-c-8))),h=Math.max(8,Math.min(a,Math.max(8,d-u-8)));this.#A.style.left=`${p}px`,this.#A.style.top=`${h}px`}#$(e){let t=e?this.#Me:void 0;this.#Ge=void 0,this.#Me=void 0,Il(this.groupActionMenuLayer),e&&this.#gt(t)}#Le(e){let t=JSON.stringify([e.groupId,e.title,e.creatorNumber,e.protocolVersion,e.epochId,e.stateRevision,e.appearanceRevision,e.memberNamesRevision,e.avatarUrl,e.outlineColor,e.memberNumbers]);if(this.#ge===t)return;this.#ge=t;let i=this.#Gt(e),n=e.protocolVersion===2;this.#I.textContent=i&&n?`Manage ${e.title}`:`Group details \xB7 ${e.title}`;let o=v("section","kl-group-details-summary"),a=v("div","kl-group-details-avatar");a.setAttribute("aria-hidden","true"),this.#It(a,e);let l=this.#et(e,e.creatorNumber),d=v("div","kl-group-details-copy");d.append(v("strong","kl-group-menu-title",e.title),v("span","kl-group-menu-meta",`${e.memberNumbers.length} members \xB7 Creator: ${l} (#${e.creatorNumber})`)),o.append(a,d);let c=v("p","kl-group-manage-notice");c.setAttribute("role","status"),c.setAttribute("aria-live","polite"),i?n?c.textContent="You created this group. Changes are accepted only from your authenticated BC identity and distributed by the group service.":c.textContent="This is a legacy group. Its details are read-only until you upgrade it to the managed group protocol.":c.textContent=`Only ${l}, the group creator, can change its name, avatar, color, or membership.`;let u=document.createDocumentFragment();u.append(o,c),i&&n?u.append(this.#Ct(e,c)):u.append(this.#at(e,!1,c)),this.#M.replaceChildren(u);let p=document.createDocumentFragment();if(i&&!n){let m=W("kl-group-details-button","Upgrade to managed group");m.dataset.groupDetailsAction="convert",m.addEventListener("click",()=>{this.#ve(e.groupId,()=>this.options.onConvertLegacyGroup?this.options.onConvertLegacyGroup(e.groupId):this.service.convertLegacyGroup(e.groupId),"Group upgraded to the managed protocol.")}),p.append(m)}let h=W("kl-group-details-button","Close","Close group details");h.dataset.groupDetailsAction="close",h.addEventListener("click",()=>this.#V(!0)),p.append(h),this.#w.replaceChildren(p),this.#ue&&this.#Ee(!0)}#Ct(e,t){let i=v("div","kl-group-manage-fields"),n=v("div","kl-group-manage-field"),o=v("label","kl-group-dialog-label","Group name"),a=document.createElement("input");a.className="kl-group-manage-title",a.type="text",a.maxLength=et,a.value=e.title,a.id=Ve("kl-group-manage-title"),o.htmlFor=a.id;let l=W("kl-group-manage-save","Save name");l.dataset.groupDetailsAction="rename",l.addEventListener("click",()=>{let N=Co(a.value,et).trim();if(!N){t.textContent="A group name cannot be empty.",t.dataset.tone="error",a.focus();return}this.#ve(e.groupId,()=>this.options.onRenameGroup?this.options.onRenameGroup(e.groupId,N):this.service.renameGroup(e.groupId,N),"Group name updated.")}),n.append(o,a,l);let d=v("div","kl-group-manage-field"),c=v("label","kl-group-dialog-label","Group avatar link"),u=document.createElement("input");u.className="kl-group-manage-avatar-url",u.type="url",u.maxLength=450,u.value=e.avatarUrl,u.placeholder="https://\u2026 direct image link",u.id=Ve("kl-group-manage-avatar"),c.htmlFor=u.id;let p=W("kl-group-manage-save","Save avatar");p.dataset.groupDetailsAction="set-avatar",p.addEventListener("click",()=>{this.#ve(e.groupId,()=>this.options.onSetGroupAvatar?this.options.onSetGroupAvatar(e.groupId,u.value.trim()):this.service.setGroupAvatar(e.groupId,u.value.trim()),u.value.trim()?"Group avatar updated.":"Group avatar cleared.")});let h=W("kl-group-manage-save","Clear avatar");if(h.dataset.groupDetailsAction="clear-avatar",h.disabled=!e.avatarUrl,h.addEventListener("click",()=>{this.#ve(e.groupId,()=>this.options.onSetGroupAvatar?this.options.onSetGroupAvatar(e.groupId,""):this.service.setGroupAvatar(e.groupId,""),"Group avatar cleared.")}),d.append(c,u,p,h),this.options.onPickGroupAvatar){let N=v("p","kl-group-dialog-help kl-group-manage-upload-help","Local files are metadata-stripped, prepared as WebP, then uploaded to a public long-lived Catbox link."),k=W("kl-group-manage-save","Choose & upload to Catbox");k.dataset.groupDetailsAction="pick-avatar",k.title="Prepare this image and upload it publicly to Catbox",k.addEventListener("click",()=>{this.#Yt(e.groupId,k)}),d.append(N,k)}let m=v("div","kl-group-manage-field"),f=v("label","kl-group-dialog-label","Avatar outline color"),y=v("div","kl-group-manage-outline-row"),g=document.createElement("input");g.className="kl-group-manage-outline",g.type="color",g.value=Ol(e.outlineColor)??"#c89b3c",g.id=Ve("kl-group-manage-outline"),f.htmlFor=g.id;let x=W("kl-group-manage-save kl-group-manage-outline-save","Save color");x.dataset.groupDetailsAction="set-outline",x.addEventListener("click",()=>{this.#ve(e.groupId,()=>this.options.onSetGroupOutlineColor?this.options.onSetGroupOutlineColor(e.groupId,g.value):this.service.setGroupOutlineColor(e.groupId,g.value),"Group outline color updated.")});let b=W("kl-group-manage-reset-outline","Use default");return b.dataset.groupDetailsAction="reset-outline",b.disabled=!e.outlineColor,b.addEventListener("click",()=>{this.#ve(e.groupId,()=>this.options.onSetGroupOutlineColor?this.options.onSetGroupOutlineColor(e.groupId,""):this.service.setGroupOutlineColor(e.groupId,""),"Group outline color reset.")}),y.append(g,x,b),m.append(f,y),i.append(n,d,m,this.#at(e,!0,t)),i}#at(e,t,i){let n=v("section","kl-group-manage-members");n.append(v("h3","kl-group-menu-title","Members"));for(let o of e.memberNumbers){let a={memberNumber:o,memberName:this.#et(e,o)},l=v("div","kl-group-manage-member");l.dataset.memberNumber=String(o);let d=v("div","kl-group-manage-member-copy");if(d.append(v("strong","kl-group-contact-name",a.memberName),v("span","kl-group-contact-detail",`#${o}`)),o===e.creatorNumber&&d.append(v("span","kl-group-manage-member-role kl-group-creator-badge","Creator")),l.append(this.#ft(a,"kl-group-manage-member-profile"),d),t&&o!==e.creatorNumber){let c=W("kl-group-manage-kick","Kick",`Remove ${a.memberName} from group`);c.dataset.groupDetailsAction="kick",c.disabled=e.memberNumbers.length<=fm,c.addEventListener("click",()=>{this.#Be(e,a,i)}),l.append(c)}n.append(l)}if(t){let o=v("div","kl-group-manage-add"),a=document.createElement("select");a.className="kl-group-manage-add-select",a.setAttribute("aria-label","Friend to add to group");let l=this.#Ke().filter(u=>!e.memberNumbers.includes(u.memberNumber)&&this.#ti(u.memberNumber)),d=document.createElement("option");d.value="",d.textContent=l.length>0?"Choose a managed-group-compatible friend":"No compatible friends available",a.append(d);for(let u of l){let p=document.createElement("option");p.value=String(u.memberNumber),p.textContent=`${u.memberName} (#${u.memberNumber})`,a.append(p)}let c=W("kl-group-manage-add-button","Add member");c.dataset.groupDetailsAction="add",c.disabled=l.length===0||e.memberNumbers.length>=gm,c.addEventListener("click",()=>{let u=Number(a.value),p=l.find(h=>h.memberNumber===u);if(!p){i.textContent="Choose a friend to add first.",i.dataset.tone="error",a.focus();return}this.#ve(e.groupId,()=>this.options.onAddGroupMember?this.options.onAddGroupMember(e.groupId,p.memberNumber):this.service.addMember(e.groupId,p.memberNumber),`${p.memberName} was added to the group.`)}),o.append(a,c),n.append(o)}return n}async#Be(e,t,i){let n=!1;try{n=this.options.confirmKickMember?await this.options.confirmKickMember(e,t):typeof window<"u"&&window.confirm(`Remove ${t.memberName} from \u201C${e.title}\u201D?`)}catch{n=!1}if(!n){i.textContent="Member removal cancelled.";return}await this.#ve(e.groupId,()=>this.options.onKickGroupMember?this.options.onKickGroupMember(e.groupId,t.memberNumber):this.service.kickMember(e.groupId,t.memberNumber),`${t.memberName} was removed from the group.`)}async#Yt(e,t){let i=this.options.onPickGroupAvatar;if(!(!i||!this.service.getGroup(e)))try{await i(e,t)}catch(n){this.#ne({tone:"error",message:wt(n,"The group avatar picker could not be opened."),groupId:e})}}async#ve(e,t,i,n=!0){if(this.#ue)return;let o=this.#fe,a=this.#x===e,l=this.#Y;this.#ue=!0,this.#Ee(!0);let d=this.#M.querySelector(".kl-group-manage-notice");d&&(d.textContent="Saving group changes\u2026",d.dataset.tone="info");try{let c=await t();if(o!==this.#fe||this.#z)return;let u=c&&typeof c=="object"?c:void 0,p=u?.group;p&&p.groupId!==e&&(this.#W=p.groupId,a&&await this.activate(p.groupId));let h=u?.failed??[];if(n){let y=h.length>0?`${i} ${h.length} local delivery handoff${Ue(h.length)} failed.`:i;this.#ne({tone:h.length>0?"warning":"success",message:y,groupId:p?.groupId??e,...u?{handedOffTo:[...u.handedOffTo],failed:h.map(x=>({...x}))}:{}});let g=this.#M.querySelector(".kl-group-manage-notice");g&&(g.textContent=y,g.dataset.tone=h.length>0?"warning":"success")}let m=p?.groupId??e,f=this.service.getGroup(m);f&&!this.#z&&(this.groupDetailsDialog.open?this.#W===m&&this.#Le(f):this.openGroupDetails(m,l))}catch(c){if(o!==this.#fe||this.#z)return;let u=wt(c,"The group could not be updated."),p=this.#M.querySelector(".kl-group-manage-notice");p&&(p.textContent=u,p.dataset.tone="error"),this.#ne({tone:"error",message:u,groupId:e})}finally{this.#ue=!1,this.#Ee(!1)}}#Ee(e){for(let t of this.groupDetailsDialog.querySelectorAll("button, input, select"))e?(t.dataset.disabledBeforeBusy===void 0&&(t.dataset.disabledBeforeBusy=String(t.disabled)),t.disabled=!0):t.dataset.disabledBeforeBusy!==void 0&&(t.disabled=t.dataset.disabledBeforeBusy==="true",delete t.dataset.disabledBeforeBusy)}#V(e){let t=e?this.#Y:void 0;this.#W=void 0,this.#Y=void 0,this.#ge=void 0,Il(this.groupDetailsDialog),e&&this.#gt(t)}#gt(e){if(e?.isConnected){e.focus();return}if(this.#x&&!this.chatPane.hidden&&this.#v.isConnected){this.#v.focus();return}this.newGroupButton.isConnected&&this.newGroupButton.focus()}#Qe(){if(this.options.renderSidebar===!1)return;let e=this.service.listGroups(),t=e.reduce((d,c)=>d+c.unread,0);this.sidebarSection.dataset.groupCount=String(e.length),this.sidebarSection.dataset.unread=String(t),this.sidebarSection.dataset.hasUnread=String(t>0),this.#i.textContent=String(e.length),this.#i.setAttribute("aria-label",`${e.length} group chat${Ue(e.length)}`),this.#r.hidden=t===0,this.#r.textContent=t>99?"99+":String(t),this.#r.setAttribute("aria-label",`${t} unread group message${Ue(t)}`);let i=e.filter(d=>this.#it(d)),n=this.#e.getRootNode(),o=n.activeElement instanceof HTMLElement&&this.#e.contains(n.activeElement)?n.activeElement.dataset.groupId:void 0,a=new Map;for(let d of this.#e.querySelectorAll(".kl-group-list-entry")){let c=d.querySelector("[data-group-id]")?.dataset.groupId;c&&a.set(c,d)}this.#t.hidden=i.length>0,this.#t.textContent=this.#he?"No group chats match this search.":"No group chats yet. Create one with 2\u20134 managed-group-compatible KikiLink contacts.";let l=document.createDocumentFragment();for(let d of i){let c=a.get(d.groupId)??this.#kr();a.delete(d.groupId),this.#Fi(c,d),l.append(c)}for(let d of a.values()){let c=d.querySelector("[data-group-id]");c&&this.#f(c)}this.#e.replaceChildren(l),o&&this.#e.querySelector(`[data-group-id="${CSS.escape(o)}"]`)?.focus()}#kr(){let e=W("kl-group-list-item","");e.addEventListener("click",()=>{let i=e.dataset.groupId;i&&this.activate(i)}),this.bindGroupActionTarget(e,()=>e.dataset.groupId);let t=v("div","kl-group-list-entry");return t.setAttribute("role","listitem"),t.append(e),t}#Fi(e,t){let i=e.querySelector(".kl-group-list-item");if(!i)return;i.dataset.groupId=t.groupId,i.dataset.active=String(t.groupId===this.#x),i.dataset.unread=String(t.unread),i.dataset.hasUnread=String(t.unread>0),t.groupId===this.#x?i.setAttribute("aria-current","true"):i.removeAttribute("aria-current");let n=t.unread>0?`, ${t.unread} unread`:"",o=t.pinned?", pinned":"";i.setAttribute("aria-label",`${t.title}, ${t.memberNumbers.length} members${o}${n}`);let a=this.#Ue(t,i.querySelector(".kl-group-avatar-stack")??void 0),l=v("span","kl-group-list-name",t.title),d=v("span","kl-group-list-badges");if(t.pinned){let m=v("span","kl-group-list-pinned","Pinned");m.title="Pinned group",d.append(m)}if(t.unread>0){let m=v("span","kl-group-list-unread",String(t.unread));m.setAttribute("aria-label",`${t.unread} unread messages`),d.append(m)}let c=v("span","kl-group-list-topline");c.append(l,d);let u=v("span","kl-group-list-preview",t.draft?`Draft: ${t.draft}`:t.lastMessage?this.#Jt(t):`${t.memberNumbers.length} members`);t.draft&&(u.dataset.draft="true");let p=v("span","kl-group-list-copy");p.append(c,u);let h=i.querySelector(".kl-group-list-copy");h?h.replaceWith(p):i.append(p),a.parentElement!==i&&i.prepend(a)}#it(e){return this.#he?[e.title,e.lastMessage,...e.memberNumbers.map(i=>String(i)),...e.memberNumbers.map(i=>this.#et(e,i))].some(i=>i.toLocaleLowerCase().includes(this.#he)):!0}#Ue(e,t){let i=t??v("span","kl-group-avatar-stack");i.setAttribute("aria-hidden","true");let n=this.#ii(),o=e.memberNumbers.filter(c=>c!==n),a=(o.length>0?o:e.memberNumbers).slice(0,mm),l=JSON.stringify(a.map(c=>[c,this.#et(e,c)]));if(i.dataset.members===l)return i;i.dataset.members=l,i.replaceChildren();for(let c of a){let u={memberNumber:c,memberName:this.#et(e,c)},p=v("span","kl-group-avatar-stack-item");this.#rt(p,u),p.append(this.#Pe(u),this.#Fe(c)),i.append(p)}let d=o.length-a.length;return d>0&&i.append(v("span","kl-group-avatar-stack-more",`+${d}`)),i}#It(e,t){let i=JSON.stringify([t.groupId,t.appearanceRevision,t.avatarUrl,t.outlineColor,t.title]);if(e.dataset.groupAvatarSignature===i)return;e.dataset.groupAvatarSignature=i,e.dataset.groupId=t.groupId,e.dataset.hasAvatar=String(!!t.avatarUrl),e.textContent=Pi(t.title);let n=Ol(t.outlineColor);n?e.style.setProperty("--kl-group-outline",n):e.style.removeProperty("--kl-group-outline");try{this.options.renderGroupAvatar?.(e,structuredClone(t))}catch{e.textContent=Pi(t.title)}}#bi(e){let t=e.memberNumbers.map(o=>({memberNumber:o,memberName:this.#et(e,o)})),i=JSON.stringify(t);if(this.#s.dataset.members===i)return;this.#s.dataset.members=i;let n=document.createDocumentFragment();for(let o of t){let a=v("span","kl-group-participant-item");a.setAttribute("role","listitem"),a.dataset.creator=String(o.memberNumber===e.creatorNumber),a.append(this.#ft(o,"kl-group-participant")),n.append(a)}this.#s.replaceChildren(n)}#ft(e,t){let i=typeof this.options.bindMemberProfileTarget=="function",n=No(this.#yr(e.memberNumber)),o=`kl-group-member-target ${t}`,a=i?W(o,"",`Open KikiLink profile for ${e.memberName}, ${n}`):v("span",o);if(this.#rt(a,e),a.title=i?`${e.memberName} \xB7 ${n} \xB7 Open profile`:`${e.memberName} \xB7 ${n}`,a.append(this.#Pe(e),this.#Fe(e.memberNumber)),a instanceof HTMLButtonElement)try{this.options.bindMemberProfileTarget?.(a,{...e})}catch{a.disabled=!0,a.title=`${e.memberName} \xB7 Profile actions are temporarily unavailable`}return a}#Pe(e){let t=v("span","kl-avatar kl-group-member-avatar",Pi(e.memberName));t.dataset.groupMemberAvatar="true";try{this.options.renderMemberAvatar?.(t,{...e})}catch{t.textContent=Pi(e.memberName)}return t}#Fe(e){let t=v("span","kl-presence-dot kl-group-member-presence");return t.dataset.status=this.#yr(e)?.status??"unknown",t.setAttribute("aria-hidden","true"),t}#rt(e,t){e.dataset.groupMemberPresentation="true",e.dataset.groupMemberNumber=String(t.memberNumber),e.dataset.groupMemberName=t.memberName}#Jt(e){let t=this.#ii(),i=t!==void 0&&e.lastSenderNumber===t?"You":e.lastSenderNumber===void 0?"":this.#et(e,e.lastSenderNumber),n=i?`${i}: `:"",o=Math.max(0,72-n.length),a=e.lastMessage.length>o?`${e.lastMessage.slice(0,Math.max(0,o-1))}\u2026`:e.lastMessage;return`${n}${a}`}#B(e,t=!0){let i=this.#x;if(!i){this.chatPane.hidden=!0;return}let n=this.service.getGroup(i);if(!n){this.#Z(!0);return}this.chatPane.hidden=!1,this.chatPane.setAttribute("aria-label",`Group chat: ${n.title}`),this.#a.textContent=n.title;let o=this.#ii();this.#l.hidden=o!==n.creatorNumber,this.#It(this.#c,n);let a=this.#et(n,n.creatorNumber);this.#o.textContent=`${n.memberNumbers.length} members \xB7 Created by ${a}`,this.#bi(n),this.#v.disabled=this.#Q,this.#v.setAttribute("aria-label",`Actions for ${n.title}`),t&&this.#He(n);let l=this.#Qt(n.groupId);this.#u.maxLength=l,e&&(this.#u.value=n.draft.slice(0,l)),this.#be()}#He(e){let t=this.#te!==e.groupId,i=!t&&this.#j!==e.memberNamesRevision,n=this.#d.scrollTop,a=!(this.#d.childElementCount>0)||this.#d.scrollHeight-this.#d.scrollTop-this.#d.clientHeight<48;t&&(this.#te=e.groupId,this.#H=Br),(t||i)&&(this.#j=e.memberNamesRevision,this.#d.replaceChildren(),this.#d.scrollTop=0);let l=t||a,d=this.service.getMessages(e.groupId),c=Math.max(0,d.length-this.#H),u=d.slice(-this.#H);if(this.#g.hidden=c===0,this.#g.textContent=c>0?`Load older messages (${Math.min(c,wo)})`:"Load older messages",this.#g.setAttribute("aria-label",c>0?`Load ${Math.min(c,wo)} older group messages`:"No older group messages"),d.length===0){this.#d.querySelector(".kl-group-message-empty")||this.#d.replaceChildren(v("p","kl-group-message-empty","No messages yet. Say hello to the group."));return}this.#d.querySelector(".kl-group-message-empty")?.remove();let p=new Map;for(let g of this.#d.querySelectorAll("[data-message-key]")){let x=g.dataset.messageKey;x&&p.set(x,g)}let h=u.map(Ao),m=[...p.keys()],f=m.length<=h.length&&m.every((g,x)=>h[x]===g),y=m.length<=h.length&&m.every((g,x)=>h[h.length-m.length+x]===g);if(f){let g=document.createDocumentFragment();for(let x of u.slice(m.length))g.append(this.#ie(e,x));this.#d.append(g)}else if(y){let g=this.#d.scrollHeight,x=h.length-m.length,b=document.createDocumentFragment();for(let N of u.slice(0,x))b.append(this.#ie(e,N));this.#d.insertBefore(b,this.#d.firstChild),this.#d.scrollTop+=this.#d.scrollHeight-g}else{let g=new Set(h);for(let[b,N]of p)g.has(b)||N.remove();let x=document.createDocumentFragment();for(let b of u)x.append(p.get(Ao(b))??this.#ie(e,b));this.#d.replaceChildren(x)}l?this.#d.scrollTop=this.#d.scrollHeight:i&&(this.#d.scrollTop=n)}#ie(e,t){let i=v("article","kl-group-message");i.dataset.direction=t.direction,i.dataset.messageId=t.id,i.dataset.messageKey=Ao(t),i.dataset.groupMemberNumber=String(t.senderNumber);let n=this.#et(e,t.senderNumber),o=t.relayedByCreator===e.creatorNumber,a=t.direction==="outgoing"?"You":o?`Claimed ${n}`:n,l=this.#ft({memberNumber:t.senderNumber,memberName:n},"kl-group-message-profile");l.classList.add("kl-group-message-profile--large"),l.querySelector("[data-group-member-avatar='true']")?.classList.add("kl-group-message-avatar");let d=v("strong","kl-group-message-author",a),c=document.createElement("time");c.className="kl-group-message-time",c.dateTime=new Date(t.sentAt).toISOString(),c.textContent=ym(t.sentAt);let u=v("header","kl-group-message-meta");if(u.append(d),o){let m=this.#et(e,e.creatorNumber),f=v("span","kl-group-message-relay-warning",`Relayed by ${m} \xB7 original sender unverified`);f.title="The group creator delivered this relay; KikiLink cannot verify who originally wrote it.",u.append(f)}u.append(c);let p=v("div","kl-group-message-content"),h=!1;if(this.options.renderMessageBody)try{let m=this.options.renderMessageBody({...t});m&&(p.append(m),h=!0)}catch{}return h||(p.textContent=t.content),i.append(l,u,p),i}#Ie(){let e=this.#x;if(!e||this.#g.hidden)return;let t=this.service.getGroup(e);t&&(this.#H=Math.min(this.service.getMessages(e).length,this.#H+wo),this.#He(t),this.#g.hidden?this.#d.focus():this.#g.focus())}#Hi(){if(!this.#x)return;let e=this.#Qt(this.#x);this.#u.value.length>e&&(this.#u.value=this.#u.value.slice(0,e)),this.#be(),this.#st(this.#x,this.#u.value)}#be(){this.#ke();let e=this.#u.value.length,t=this.#x?this.#Qt(this.#x):Ne;this.#h.textContent=`${e}/${t}`,this.#h.dataset.nearLimit=String(e>=t-20),this.#m.disabled=this.#ye||!this.#x||this.#u.value.trim().length===0,this.#u.disabled=this.#ye||!this.#x,this.#y.disabled=this.#ye||!this.#x||!this.options.onAttachImage}#ke(){this.#u.style.height="auto",this.#u.style.height=`${Math.min(this.#u.scrollHeight,120)}px`}#Qt(e){try{let t=this.service.getMessageMaxContent(e);return Number.isSafeInteger(t)&&t>0?t:Ne}catch{return Ne}}#Tt(){let e=this.#x;return e?this.#ki(e,this.#y):Promise.resolve()}async#ki(e,t){if(!(!this.options.onAttachImage||!this.service.getGroup(e)))try{await this.options.onAttachImage(e,t)}catch(i){this.#ne({tone:"error",message:wt(i,"The image composer could not be opened."),groupId:e})}}#bt(){return this.#u.getRootNode().activeElement===this.#u}#st(e,t){this.#ee={groupId:e,value:t},this.#F!==void 0&&clearTimeout(this.#F),this.#F=setTimeout(()=>{this.#F=void 0,this.#Ze()},hm)}#Ze(){this.#F!==void 0&&clearTimeout(this.#F),this.#F=void 0;let e=this.#ee;return this.#ee=void 0,e?this.service.setDraft(e.groupId,e.value).then(()=>{}).catch(()=>{}):Promise.resolve()}async#yi(){let e=this.#x,t=this.#u.value;if(!(!e||this.#ye||!t.trim())){this.#Ze(),this.#ye=!0,this.#be(),this.#$i();try{let i=await this.service.sendMessage(e,t);i.persisted&&(await this.service.setDraft(e,""),this.#x===e&&(this.#u.value="",this.#B(!1,!1))),this.#x===e&&this.#xe(e,i)}catch(i){this.#x===e&&this.#ne({tone:"error",message:wt(i,"The group message could not be sent."),groupId:e})}finally{this.#ye=!1,this.#be(),this.#x===e&&this.#u.focus()}}}#xe(e,t){let i=t.relayTargets??[],n=t.unreachable??[],o={groupId:e,handedOffTo:[...t.handedOffTo],failed:t.failed.map(d=>({...d})),...t.relayViaCreator===void 0?{}:{relayViaCreator:t.relayViaCreator},...i.length===0?{}:{relayTargets:[...i]},...n.length===0?{}:{unreachable:[...n]}};if(!t.persisted){this.#ne({tone:"error",message:n.length>0?`Message not sent. ${n.length} group member${Ue(n.length)} had no direct or creator-relay route.`:"Message not sent. KikiLink could not hand it to Bondage Club for any group member.",...o});return}let a=`${t.handedOffTo.length} direct local handoff${Ue(t.handedOffTo.length)}`,l=i.length>0&&t.relayViaCreator!==void 0?` ${i.length} non-friend or out-of-room participant${Ue(i.length)} routed via the group creator (#${t.relayViaCreator}); the creator must be online with KikiLink active.`:"";if(n.length>0){this.#ne({tone:"warning",message:`Message saved after ${a}.${l} ${n.length} participant${Ue(n.length)} remain${n.length===1?"s":""} unreachable. Delivery is not confirmed.`.replace(/\s+/gu," "),...o});return}this.#ne({tone:"success",message:`Message saved after ${a}.${l} Delivery is not confirmed.`.replace(/\s+/gu," "),...o})}async#$e(e){let t=e??this.#x;if(!(!t||this.#Q)){this.#Q=!0,this.#B(!1,!1);try{let i=await this.service.togglePinned(t);this.#ne({tone:"success",message:i?"Group pinned.":"Group unpinned.",groupId:t})}catch(i){this.#ne({tone:"error",message:wt(i,"The group could not be updated."),groupId:t})}finally{this.#Q=!1,this.refresh()}}}async#q(e){let t=e??this.#x,i=t?this.service.getGroup(t):void 0;if(!(!t||!i||this.#Q||!(this.options.confirmRemove?await this.options.confirmRemove(i):typeof window<"u"&&window.confirm(`Remove \u201C${i.title}\u201D from KikiLink?`))||!this.service.getGroup(t))){this.#Q=!0,this.#B(!1,!1);try{let o=await this.service.removeGroup(t),a=!this.service.getPersistenceState().pendingChanges;o&&this.#x===t&&this.#Z(!0),this.#ne({tone:o&&a?"success":"warning",message:o?a?"Group removed from this device.":"Group removed for this session, but browser storage did not retain the change. It may reappear after reload; KikiLink will retry.":"This group was already removed.",groupId:t})}catch(o){this.#ne({tone:"error",message:wt(o,"The group could not be removed."),groupId:t})}finally{this.#Q=!1,this.refresh()}}}#Z(e){let t=this.#x;if(!t)return;this.#Ge===t&&this.#$(!1),this.#Ze(),this.#x=void 0,this.#te=void 0,this.#j=void 0,this.#H=Br,this.chatPane.hidden=!0,this.#s.replaceChildren(),delete this.#s.dataset.members,this.#g.hidden=!0,this.#d.replaceChildren(),this.#u.value="",this.#be(),this.#Qe(),e&&this.options.onClose?.(),([...this.#e.querySelectorAll("[data-group-id]")].find(n=>n.dataset.groupId===t)??this.newGroupButton).focus()}#kt(e){if(!this.#z){if(e.kind==="persistence"){this.#Ki(e.state.degraded,e.state.pendingChanges);return}if(this.#Qe(),e.kind==="group-removed"&&(this.#Ge===e.groupId&&this.#$(!0),this.#W===e.groupId&&this.#V(!0)),e.kind==="cleared"){this.#$(!0),this.#V(!0),this.#Z(!0);return}if(e.kind==="group-removed"&&e.groupId===this.#x){this.#Z(!0);return}if(e.kind==="group-updated"&&this.groupDetailsDialog.open&&this.#W===e.groupId){let t=this.service.getGroup(e.groupId);t&&this.#Le(t)}!("groupId"in e)||e.groupId!==this.#x||(e.kind==="message"?this.#B(!1,!0):e.kind==="group-updated"&&this.#B(!1,this.#j!==e.group.memberNamesRevision))}}#lt(e){this.#z||(this.#ae(e),this.newGroupDialog.open&&this.#Zt())}#Zt(){this.#oe===void 0&&(this.#oe=requestAnimationFrame(()=>{this.#oe=void 0,!(this.#z||!this.newGroupDialog.open||this.#re!=="select")&&(this.#ce=this.#Ke(),this.#_t())}))}#vi(){this.#oe!==void 0&&cancelAnimationFrame(this.#oe),this.#oe=void 0}#ae(e){let t=e===void 0?"[data-group-member-presentation='true']":`[data-group-member-presentation='true'][data-group-member-number="${CSS.escape(String(e))}"]`;for(let i of[...this.sidebarSection.querySelectorAll(t),...this.chatPane.querySelectorAll(t),...this.newGroupDialog.querySelectorAll(t),...this.groupDetailsDialog.querySelectorAll(t)]){let n=Number(i.dataset.groupMemberNumber);if(!Number.isSafeInteger(n)||n<=0)continue;let o=i.dataset.groupMemberName?.trim()||`Member ${n}`,a={memberNumber:n,memberName:o},l=i.querySelector("[data-group-member-avatar='true']");if(l)try{this.options.renderMemberAvatar?.(l,{...a})}catch{l.textContent=Pi(o)}let d=this.#yr(n),c=No(d);for(let u of i.querySelectorAll(".kl-group-member-presence"))u.dataset.status=d?.status??"unknown";i instanceof HTMLButtonElement?(i.setAttribute("aria-label",`Open KikiLink profile for ${o}, ${c}`),i.title=`${o} \xB7 ${c} \xB7 Open profile`):i.title=`${o} \xB7 ${c}`}}#Te(){this.#re="select",this.#S.textContent="New group chat",this.#R.textContent="",this.#R.dataset.tone="";let e=v("label","kl-group-dialog-label","Group title (optional)"),t=document.createElement("input");t.className="kl-group-title-input",t.type="text",t.maxLength=et,t.value=this.#Oe,t.placeholder="Weekend crew",t.id=Ve("kl-group-title"),e.htmlFor=t.id,t.addEventListener("input",()=>{this.#Oe=Co(t.value,et)});let i=v("label","kl-group-dialog-label","Find a KikiLink contact"),n=document.createElement("input");n.className="kl-group-contact-search",n.type="search",n.value=this.#De,n.placeholder="Name or member number",n.id=Ve("kl-group-contact-search"),i.htmlFor=n.id,n.addEventListener("input",()=>{this.#De=n.value,this.#_t()});let o=v("p","kl-group-dialog-help","Choose 2\u20134 friends with current managed-group support. Your group will have 3\u20135 members including you. Compatibility is checked again before sending."),a=v("p","kl-group-selection-status");a.setAttribute("aria-live","polite");let l=v("div","kl-group-contact-list");l.setAttribute("role","list"),l.dataset.contactList="true",this.#C.replaceChildren(e,t,i,n,o,a,l);let d=W("kl-group-dialog-cancel","Cancel");d.addEventListener("click",()=>this.#ei());let c=W("kl-group-dialog-review","Review group");c.dataset.review="true",c.addEventListener("click",()=>{this.#St()&&this.#Mt()}),this.#E.replaceChildren(d,c),this.#_t()}#_t(){if(this.#re!=="select")return;let e=this.#C.querySelector("[data-contact-list='true']"),t=this.#C.querySelector(".kl-group-selection-status"),i=this.#E.querySelector("[data-review='true']");if(!e||!t||!i)return;let n=this.#ce.filter(h=>this.#ti(h.memberNumber)),o=new Set(n.map(h=>h.memberNumber));for(let h of[...this.#D])o.has(h)||this.#D.delete(h);let a=this.#De.trim().toLocaleLowerCase();if(a){let h=this.#ce.filter(m=>this.#N(m.memberNumber)&&(m.memberName.toLocaleLowerCase().includes(a)||String(m.memberNumber).includes(a))).slice(0,8);for(let m of h)try{this.presence.request(m.memberNumber)}catch{break}}let l=n.filter(h=>!a||h.memberName.toLocaleLowerCase().includes(a)||String(h.memberNumber).includes(a)),d=e.getRootNode(),c=d.activeElement instanceof HTMLElement&&e.contains(d.activeElement)?d.activeElement:void 0,u=c?.dataset.memberNumber??c?.dataset.groupMemberNumber,p=c?.classList.contains("kl-group-contact-profile")===!0;if(e.replaceChildren(),l.length===0){let h=n.length===0?"No managed-group-compatible contacts detected yet. Keep this window open while KikiLink checks current versions.":"No managed-group-compatible contacts match this search.";e.append(v("p","kl-group-contact-empty",h))}else for(let h of l){let m=this.#D.has(h.memberNumber),f={memberNumber:h.memberNumber,memberName:h.memberName},y=W("kl-group-contact","");y.dataset.memberNumber=String(h.memberNumber),y.setAttribute("aria-pressed",String(m)),y.disabled=!m&&this.#D.size>=xo;let g=v("span","kl-group-contact-name",h.memberName),x=v("span","kl-group-contact-detail",`#${h.memberNumber} \xB7 ${No(this.#yr(h.memberNumber))}`);y.append(g,x),y.addEventListener("click",()=>{this.#D.has(h.memberNumber)?this.#D.delete(h.memberNumber):this.#D.size<xo&&this.#D.add(h.memberNumber),this.#_t()});let b=v("div","kl-group-contact-item");b.setAttribute("role","listitem"),b.dataset.selected=String(m),b.append(this.#ft(f,"kl-group-contact-profile"),y),e.append(b)}t.textContent=`${this.#D.size} of 2\u20134 contacts selected`,i.disabled=!this.#St(),u&&e.querySelector(p?`.kl-group-contact-profile[data-group-member-number="${CSS.escape(u)}"]`:`[data-member-number="${CSS.escape(u)}"]`)?.focus()}#Mt(){if(!this.#St()){this.#Te();return}this.#re="confirm",this.#S.textContent="Confirm group chat",this.#R.textContent="";let e=this.#Dt(),t=this.#Oe.trim()||xm(e),i=v("p","kl-group-confirm-summary",t),n=v("p","kl-group-confirm-count",`${e.length+1} members including you`),o=v("ul","kl-group-confirm-members");for(let c of e){let u={memberNumber:c.memberNumber,memberName:c.memberName},p=v("li","kl-group-confirm-member");p.append(this.#ft(u,"kl-group-confirm-profile"),v("span","kl-group-confirm-member-copy",`${c.memberName} (#${c.memberNumber})`)),o.append(p)}let a=v("p","kl-group-confirm-notice","No invitations have been sent yet. Confirming will send one private KikiLink packet to each selected member.");this.#C.replaceChildren(i,n,o,a);let l=W("kl-group-dialog-back","Back");l.addEventListener("click",()=>this.#Te());let d=W("kl-group-dialog-confirm","Create & send invitations");d.dataset.confirmCreate="true",d.addEventListener("click",()=>{this.#Ot()}),this.#E.replaceChildren(l,d)}async#Ot(){if(!(this.#me||this.#re!=="confirm")){if(!this.#St()){this.#R.textContent="One or more contacts are no longer detected. Please review the selection again.",this.#R.dataset.tone="error",this.#Te();return}this.#me=!0,this.#xi(!0),this.#R.textContent="Creating group and handing invitations to Bondage Club\u2026",this.#R.dataset.tone="info";try{let e=await this.service.createManagedGroup([...this.#D],this.#Oe);if(this.#me=!1,this.#ei(),await this.activate(e.group.groupId),e.failed.length>0){let t=e.handedOffTo.length>0?`Group created. Handed ${e.handedOffTo.length} invitation${Ue(e.handedOffTo.length)} to the local Bondage Club client; ${e.failed.length} local handoff${Ue(e.failed.length)} failed.`:"Group created locally, but no invitation could be handed to Bondage Club.";this.#ne({tone:e.handedOffTo.length>0?"warning":"error",message:t,groupId:e.group.groupId,handedOffTo:[...e.handedOffTo],failed:e.failed.map(i=>({...i}))})}else this.#ne({tone:"success",message:`Group created. Handed ${e.handedOffTo.length} invitation${Ue(e.handedOffTo.length)} to the local Bondage Club client. Delivery is not confirmed.`,groupId:e.group.groupId,handedOffTo:[...e.handedOffTo],failed:[]})}catch(e){this.#me=!1,this.#xi(!1),this.#R.textContent=wt(e,"The group could not be created."),this.#R.dataset.tone="error"}}}#xi(e){for(let t of this.newGroupDialog.querySelectorAll("button, input"))(t instanceof HTMLButtonElement||t instanceof HTMLInputElement)&&(t.disabled=e)}#ei(){if(!this.#me)try{this.newGroupDialog.close()}catch{this.newGroupDialog.removeAttribute("open"),this.#nt()}}#nt(){this.#vi(),this.#D.clear(),this.#re="select",this.#Oe="",this.#De="",this.#me=!1,this.#R.textContent="",this.#R.dataset.tone="",this.#C.replaceChildren(),this.#E.replaceChildren()}#St(){return this.#D.size<pm||this.#D.size>xo?!1:[...this.#D].every(e=>this.#ti(e))}#Dt(){let e=this.#D;return this.#ce.filter(t=>e.has(t.memberNumber))}#Ke(){let e=this.#ii();if(e===void 0)return[];let t=new Map;try{for(let i of this.adapter.getKnownContacts()){if(!Number.isSafeInteger(i.memberNumber)||i.memberNumber<=0||i.memberNumber===e)continue;let n=i.memberName.trim()||`Member ${i.memberNumber}`;t.set(i.memberNumber,{memberNumber:i.memberNumber,memberName:n})}}catch{return[]}return[...t.values()].sort((i,n)=>i.memberName.localeCompare(n.memberName)||i.memberNumber-n.memberNumber)}#ti(e){try{return this.#N(e)&&this.presence.hasGroupChatPeer(e)&&typeof this.presence.hasGroupManagedPeer=="function"&&this.presence.hasGroupManagedPeer(e)}catch{return!1}}#N(e){try{return this.adapter.isKnownFriend(e)}catch{return!1}}#ii(){try{let e=this.adapter.getOwnMemberNumber();return Number.isSafeInteger(e)&&e>0?e:void 0}catch{return}}#Gt(e){let t=this.#ii();return t!==void 0&&t===e.creatorNumber}#yr(e){try{return this.presence.get(e)}catch{return}}#et(e,t){let i=e.memberNames[String(t)]?.trim();if(i)return i;try{return this.adapter.getMemberName(t).trim()||`Member ${t}`}catch{return`Member ${t}`}}#$i(){this.#L.textContent="",this.#L.dataset.tone=""}#Ki(e,t){this.#ne({tone:e?"warning":"success",message:e?t?"Group changes are available for this session, but browser storage did not save them. KikiLink will retry.":"Group chat storage could not be read safely. Changes are paused to protect saved groups; KikiLink will retry.":"Group chat storage recovered. Pending changes were saved.",...this.#x?{groupId:this.#x}:{}})}#ne(e){this.#L.textContent=e.message,this.#L.dataset.tone=e.tone,this.options.onFeedback?.(e)}};function v(r,e,t){let i=document.createElement(r);return i.className=e,t!==void 0&&(i.textContent=t),i}function W(r,e,t){let i=v("button",r,e);return i.type="button",t&&i.setAttribute("aria-label",t),i}function Pl(r){if(!r.open)try{r.showModal()}catch{r.setAttribute("open","")}}function Il(r){if(r.open)try{r.close()}catch{r.removeAttribute("open")}}var Tl=0;function Ve(r){return Tl+=1,`${r}-${Tl}`}var _l;function Ao(r){return`${r.senderNumber}:${r.id}`}function ym(r){try{return _l??=new Intl.DateTimeFormat(void 0,{hour:"2-digit",minute:"2-digit"}),_l.format(new Date(r))}catch{return""}}function Ol(r){let e=r.trim();return/^#[\da-f]{6}$/iu.test(e)?e:void 0}function No(r){switch(r?.status){case"online":return"online";case"idle":return"idle";case"dnd":return"do not disturb";case"offline":return"offline";default:return"KikiLink detected"}}function Pi(r){let e=r.trim();return e?[...e][0]?.toLocaleUpperCase()??"?":"?"}function vm(r,e){if(!r)return e;try{return r()}catch{return e}}function xm(r){let t=`Group with ${[...r].sort((i,n)=>i.memberNumber-n.memberNumber).map(i=>i.memberName).join(", ")}`.replace(/\s+/gu," ").trim();return Co(t,et)||"Group chat"}function Co(r,e){let t=r.slice(0,e),i=t.charCodeAt(t.length-1);return i>=55296&&i<=56319?t.slice(0,-1):t}function Ue(r){return r===1?"":"s"}function wt(r,e){return r instanceof Error&&r.message.trim()?r.message:e}var Fr="data:image/webp;base64,UklGRo4mAABXRUJQVlA4IIImAACQvgCdASoAAgACPpFInkulpCMlIvPJcLASCWNu4XVRCBw/8ztmOb+6/yHpZ2p/Vf3zzhdfPbfm7c7/+X13f7z1N/2D1Bv1x/X3/J+2/6m/Mn+0v7n+7//zv2t96/+H9QD+5/7PrWfQY/mP/a9ZX/2/u58L39m/7X7re1P///YA///ttdKP14/z3g6/lf+R4t+d74NKssb/iXPB/Xfrt4z8AL29u7YAP07+7ebh+L5weIHwWtAb+c/2f/0+rl/6+bb64/a74Ev2K9NT2M/uR///dg/aYYgFYdkXCkzov0RFwpM6L9ERcKTOi/REXCkzov0RFwpM6L9ERcKTOi/REXCkzov0RFwpM6L9ERcKTOi/REXCkzov0RFtXsRaHq8ap957v1Nn9vNcmdF+iIuFJnRfoiKCp4SqRFz/c9VXGLw9XhgqLWbL8Yx7WcDiYyhLe1SM8PrVqlJnRfoiLhSZ0W7uL+FVab3LX2eWErxBP8hcirrKCNk/Jak+0pM6L9ERcKTJ0GTnkuyKjlKEojAv5ps76H+TWpI2PNuSESWW2DUWf9/jhGrTqNTsi4UmdF+e0NBqzrizrS+qX+WZBFpCWAtCINgBLVH19O6DgAGjWAQGon4fgGOxFGsOyLg3aMHrJewvAD4ivaxQGmb0Fqrjo+/AGkEPQY3HOqtysKfq4dcd1HfiPrwzlzwEXyR+3QmwniX0EaIpEGOTdqlTCOmrvFXIBLXxr6VaYGnz/3OmC5ikph7QCF2wwB+xbnhlwpM6L88MZgDz0D5n9ywov0dzUH+S9MDvSBc8XUW+gjpX5K89qFydeoA4zjCz2bbyzX8OrHVnkmqN2TyZ0X6Ii4MgQiI8+Qhsr6qpMi5WLj7dS85gtk5wDhbnvaYOUgbBp65UXSQnUVXQfgF/41tIGrlw6PSzWjhVxY0CZaMRRrDsiiJFFlaOk+kuevhPqyVmL2FSPBr44sK/ZPD75scblnbdo9YDcqZjgp/jPdEaeBkW19gDcQx0fBdY1OyLhSZ1Q9qfvzfKA78EC9xQfaG85kKsdVgEM5EAVQDY10Bb048OxR6C0dZxRn4IwGUArY+MDU7IuFJnQoNDu00j+iwaq4A4OYl5zDe06B9lT0Kn1UWbp4gjz/eWPOR5dA12g4S7tFLp9z0RFwpM6L86i4TFE4vyrWFFgSB0Vst24BE+UQVOdGrF5kgOl20Mdm2AuOeCJoNIcoWcDpvzTrm7RT7dF+iIuFJk6D51G4DlD1jjhutniLDVDfTPhYKmjRdfblnRDAGrExpM0D2zILdUX9Td0CemhspHHWcIo1h2RcKTJxp4uOBlTZHS0hyY3hKr5fNLf+nF+XAyw9TLgDgPsBKJwgVgMq4raw19Rzov0RFwpM6LgQGuuj7f4AFUg3tyFCeIrYERDuZYzOytFMS9E1y0U/JVo6d8JfdtKTOi/REW4qyOO2C99W5vTYWZ6Zr02p+1fp2RcKTOi+xpskwBYKWeXkgeyiaDWbm4oRfu9WVFWuOvuKwQhWXqDw27aUmccMRilCq6uG0P4zI1/GbKUAUcCkzIoQFYqiG7PTvF16DXKdUXw9Kzo2iC4sgbxK9B1vNX8oj3ygGaEMmNoLABblKVGozTEXCkycNtjQ0hQ0ZPt2QOU5gT2anYo4PwPrOdmHuJlGO2MBY+wHovmIJ8zAIzFnrRM8jnxK66Mv4W+nFP+VgJ06PDTaiI7IuFKdoTLYIAP4AZjRkTP6vjLQ4ezov0RFwinKy1F14IWyxZ5IhNIMpnM+y6FQ4vHoP0riILcLWymlDT5C4srDsi4UmdFwxV7hB3VvrXOUgKzIunKhewGDILH6EU35QcMYy1N3nfhiy06WArzbBu/i0e9TtzV+gCKdGedfRt+lFi5+ABWHZFwpIw91kJgEPvj2559hjc4IhMTUCERcZ/5DN+NL62jsVtJNCX2cNnVcrKOuYZKnMP4AFYdkXCk0JHbWPaPKsDZPAiKNYdkXCkzov0RFwpM6L9ERcKTOi/REXCkzov0RFwpM6L9ERcKTOi/REXCkzov0RFswAA/v+eAAAAAAAAAAAB796tvxxcLOwN3pYhSt6wMw9NP9pv1DxmuzeTgApKBNe9feVQvujwBw6rvrqHTniK2V1SHcjt2jK0SxI2xhtwZ2slREacF5MH925wMdPWi+PSLlwii3UIx5e3yHy4sbMAMjDIbWN8Pgq8ayHpjpkcnbdte4sOz+EbD1b/nkOE+qT+/TOzmRCibb7mNEZvfq8ETU4AE3Nb5fz9i7/CB9gAmJ+R5OZUQ9XlKLG75kOZKqbDnOb11dudElNb6jrFTQNDvHt83rRV4XqL2PB6oasi63bQ/zk3S+n5tBo4TtzSiE/YL4PWJhF2lR7gCf0X0esOtr9WyB8vwvMsEKlmz/RRJlIIKUwmaI7tjlPJaCCNYuceUHnTlR9CI9WACdLCCNw8bnvDUumeDK/7JiasUciIBGbrtT3nMixN5CFJAM9GVKbb1ci4ASv5K+B3HVePooxmhTtLwE+jWlFALBpD7uruDw7/oMel5vrfqMNz33bIWT6f3H9CrI53AO5mKcXLlvQCaDqgP7CD/pv2PfFrDzFCXFTn/omKN+UmsYRq6tYmTlzEDeQa+SuB1v/N1EGcV6OzL76/YINjKTy2BYiIRKuJYgEbeeAvghdRDE9i+N16SAi2umzOtDFOzzcNzlcOvI+troydb1a0TqJtNQm2vaTlb77VhP6HQJpTJF+0SCwnrJE1sz3bQSOixB8ThlOVvkFTFenLqpUfZKBnbrhKUs1YuQYHrnatMBOCnA+exQh0QlYYfkqJeysh9TR1huHE/i98eOKKzX5npnNAHUkAKLrUEnqJjM29G30Gb96FENHyj+2byTLbTMXQyx4OJYYr7lhHBK6CTcYGrJEuRQo4R8zpZAuES1CLZ67DUchGe+YR5RrECfzizFQhqWfEv7PFQyq68cwDPqgyZ+mpQgHnF028FA9Q7WOQ1SZRsWXufn3/vx78dd4wVa3JIfiJWnnDi4FY5Cax5QHCfN7Oy5UP2+LlyvGW2CcLNVamoZH9gsJxOfwAtNoxjwjwPjF0BHypFJYC+4MhLAAA1c0IGPpqvjw0wNRNx1j9MxMQXj7Nt4Ul9J+p48IpIxRw3y0D3ro9SbwZ2dGbab1cGj2JozbJmnv2ogO0HLMJhFOZtWZjb6or3OhZz/lhMQFdYhivoj/55QI2+LMcAKl7jHb0xA//4sn29NxLQ/Xx/kx0Lo63f910HCm3USyzpGLsZKSKo2Z80fIoVxHevpXHqhVWYkInRAPyVuwQ+kGK+W6m3zuyfxk8mNp+BuaV0BnDh+8VWy3PXMsI1PzBVdHOynd+3ZB7DwHxehiyMqiGSRjH6piiOnXs4YjGuoQcF9k8rOodwqNxPw6ctFEhjzp/0m4dy9qFEIhvCaoPxXm1BpFiDib9N8hH1sSJ3zX5j7o+ZLSPCUUMAu35nO+SeBCrz+eazFYB6lp3GxewfNLHbyVgOXiIScGv56NdPsl5U78NuWuH2rztESU5snVm4f4HIETG4FGlrNpxj8MQKjf9Pa8OIK32TWRunoBUII88OB9Prb1Oicr0OPuVS4B9nOmqmwjGmFGJQDIRcIeq3Pnu0ltjQQICZHrZz49Pwu4UAvIsEaNKOtikJ9wRBmmqqQNTIxppjh/U4sNvyh/6DRVmXE4BlZ+XTI+6Ns0ubHBqvTOOHvUd/yLi3Wpo+1WG36ipHV38YhOJ0Fdfn4o/aKXRfeZjy/vlgRdKDiCmqZWbBE18gtm7iCUVIu9fNDfhbi+Px6h3r8JNFGGyRLji6QYZTFnRAmhS+MdjJJ4kM8ucm/3U/folPOiSoiNO7mdy9xKkuQFJF9tOCKdbdaxGcXxtfmMsuLoe/ECuCdTehmhPJyPDZZIWey+RVnGJluMF0FTyJfx736OUH1vW+Bro+R2c1+PROmQMnjR/SPfqsRjfNyhBYx9SwZw6ek/kCAiD5sJ8oAB+0TvZpFKz/5b+HWj36SV9679LbPG0ZLo/Yx9RcvJ/N0mFFotOmRIX7gQTCoeVEjOmIyE+LoXaZm8CgBRfOpkjGny6GOV8nemPgRkZ2ER1VghcL5V29WHYltibCf1bpXUx/sw0qsi3HZoEa+xrMgEeJzpVcqhIezlZLmf9P8ge8FrvkAPlNJt3ubE6cfmf6P+VQNs4pThulmOstu+v5UPycbPjVbS/CHw5SKK8W4g6h7WD2kNGYXYfXLjE52S886aQqjLMbEUYKBme1niknxaJxl7agAGf88+v0Pe6HnCFOcnt4uwVDIhgOTXWgPB/oQBrUdD9NBLVAdnO1/lV4RsDmK2cZudwnhf2abDBqzEBtbN2QTjFUAUZsmeB+kcGJvpXE/AeM7+XJPnPXIY/vXfmF8jbjruH5q5LE49iQA7q10ZA9teApuIWpRVRyQRIX3CojCXPZH8YFf8Ok6AtFji9LQ+K3Tmcm/Uijs0mF9B3lr8vfbT0MjCJ5AhFDxMPdGbzdX1GD+Rt+iWvj93cCl6i5GiFqK9y966SU2JAM1KMnu8upm+3coG9ZWMZBQ6xyfIzMtMvlyN0CnYG/vzYuKdvBCsGr+DztvyDoJLDgf4ctcPndMRQjBuGIN9sOxYIzQTbxSwJv7uzZukWbA95Nf5BOuShs+J56kK9t7V5oNxph7QgFG1f73BdYVO70D/q2EKiwRo4zft2RbkqNduJMecxh88O3rkNqUrrtbVPqCTzklKbzL8Ic71588MTJLg4YmW+Br8SD2WtmQrxx59Kq9IX43LH7VBh1YzXlfcJkPtOrTAIUTMjpJdwqMzUwDCJ5BW8YpdXjVfYH130LPdekyFb1kH07hMQRbJywk7sCBDXvmGxzCwEHhxX8JC43LbH7C1vVW2QrL4/fG1JVwXRwJXJPkIH9OIKV5VonR559dlyxgSYvRL6c2jP+hhuHCMm6pX9maGLEHExUUZGLfnWi9dL0MjX3IzAGAwXGqoZBBahzwdoxn1cE9/0Ao8IWXwudZ4ViAp7rbUsMsZsk2NEdbSZ40+Frz3vfZFWmaRyutVqQrh4zeYSG93pFz4MH4DhBhtrdIX9E0ouXx4K2OUiyskCqcgRlmaRpOsG5SS+ZEEC67tFwR9w4soeDnFoDRanFOvWx4YaCGRVOswzo6dHdy4OEt8nCd6y2SD9/vXokHhY7ciGuarqdkUF8jyntCqdoN7eXS8scpStvJNcYNqpp1tvGteOfsZcbE4YNZWJxWGXcL8qKS7RCSZWXOSQs0gC0P+1IQWG6HZzpQjaGaB83tnx3tKKHSoImO7MDjz8h1DrfZHhxSJsLPRYaocy2uMADUpEmyjqsNUwd8td+Vfsnznlq0MCQ+PH1W2GW8nDLC1Zay/Z78mKI6M7diPrcgEla0pXIbFt/36Aej1eF8stqGIXbbEJ3F8TANhCHwy5dusHYsU+6im3ywxjAltsjjJw6YFYOKD9M4k4Y1sPwu37ROZFdxWmxq7pjkxdUmCgvcKLmx8pJtA3rNhmo3W6zhvFeYpm4hZqDKylCv1y2Wf+Z8iWEDkBbGrrkXj1kQZyvAIe71jZS9gOKPu3ucNKkz5fBA5fAmz/36o7RchKlM+1tR8ylINSbFe/EfPDyJLhzi0k9eNBOU7R3WpjLPyPXlRs4mp+69d4SX6H7qsMVX+go3mJwLmH/eiP74umgxX6iX4MZjQqYTgEJCoMNsxxjo2eUvjTkePpysb5BTW3348BtdYWdBZqg56Yo+bx2ZCi8pstcVsQ8XbYrEZQVYc/U6ajpXdix/mx+dvpd+GsUn+Y/1r3hK868ueXX2xuE82KKDLQkbjE9D7PgS44PuJyOkWs/gMwkxPVsDYPh5IAkys+v2siWRxy9OQtNGSxZTm9E6TNhEfcPTaMXfJ8sqMndzYy5G/V7ECJ14fsDyAPBHRmN5qROjEcetqbPRVAGiwkUKOrzb6L3N0AhXUPInZKyx83Kz3RCzSi440BkmJMNaDi8nh8o4ocZm6d5LT8S8G1mbVDTcyF7HduzNJbuLq/RWdhubsny1HNTi6uFI9sjIjHrUGucPFxg1PTedvCvOzhx8hGynxm+dcoxljEMeKsM4FSATcNo5DkAQrfwxDMs7xiVPT6l2ymyilFU+bYTgRK0zeBkyLGhL4VyyIyhWjiZ9h4BTDkxrCx4EZ2FFhcFq/lj1pNeals8T1qaxwleKYOidfBMUt4MeBK5CYwMigBawJHAqlNZVUjw99bRf07SU2O+RJF128QzFnZaJLlRMnp7Y+yVw42Eh1+2Yv4wwPtX9Flds3NYHAIW82QYvpHRe4f7p5h4tKeD7BSTOaAWjLRjWzHF1vEV0anhJv0RFK89frGb6l2m7KLpdqhYBz+BwuToYwPFaPLXcDkikkyrF23ULn/4uVBy+lnhCNtfZrK9P9+EfbsW7LzrjH8Y6OvZcioRiI1uz4MvxaUSMFi6ooNJjb5yFa/IxqJY/cDCMbIKNAOzBlCcN0ev1ifBxkbvUTCj92ZunQEAFakadBXjC7v66iS0nJHLGHNczOPhdpC4jey7ZLikTW/trdvdjJm32R7YLhQNm8kN3xeKOhR7NNNp7mbDtuTWtmP62y4iJo0NfOAGQmugtKazVEOiAo9/WAgNj1B5/Q1mQ2e1Z3GfxwE3/iaL50ICgEWDxVWJHsxS051O/iYzfMXWvxZ/Ga2hQwGLOveforjH3Yo9dK3qKVBk1o2D8agW5fFIegAAKNKkbnPUXwUXrSNECB14H5ng9sGHMUI4ptstglb4fvqRC0qcq3KTggYSJa/ACo6HixT4Sqj82EWSXMIFxSncZagDML1T7agsZ6hlxZQ5lQd1/SNqXpzieQ4N67jwtXz3X3mm6ueC4Mu5ePqCaG9YU3mLjsqtIowLs1w+3eIyMrpYs0Gozl74sGyAmWPIeJMmn/MJBlqpIbyDd5GvCLBBCzo8DuuthxgxV0wF7MpGIgziEOD6SnDCiA1OvjELONOC01bfaIVH9w6e7vc9xg7rjzWJ/rlHbrc6apVTq/DTZVVrT/BAyQzco7kdS2IIEoXCyXypYsWnoERY62TfnC+rGzcuZtlpMU2T0ZNszXuEFhZvXCZsBTk4meOnYh87ObmbFgLuxvoNgyqLVSxUMstS9wxbIejXTRCElJZGP7gebNekAPqFctiQcAR+lGwGPAZAjnhOHSiDwM8wxKeXppavEn6lRiDg7fX8d18nE/vgJVTfLLeuT1lO82jC6Bu71tfbeFlo9e1zdMwWu2IA5jNrW94OZLfFhWFfEAmI+0kydCnO2l/D+HWI0xHkJzUj+2iPJiVSw6OUTlblivdG25h74bfvFnXZ84Yj+pTelBJpIFr0VKjOyx88gTLghaI3OhlHUaHe1BtpZdf0oQzDxRcSWSQ1XPl+ylicEr+nwPtqM7424nmiBwfn9NbrcqJKNl4mzP2/rtStRpavI+1ZrZaCPLusNCabqei44iRn10ze6MO0srmo51bNmXObtKB0JvvPrw2iRg4XTK3qqdq6FYuGQwcbMNi89g7Q1/kdNnFh9RpfT6YIjNFJ9TSvL45jOzE6LQBjgCfmHsCslbT46vjEGrPI9rq2DvT+VeF0s3GDz7dcprgTG2Hb7qfXbfvTfn4biio2pVhfvCjHiuuMb7Ks2W6TlfqWZuH0GdKrdTE8nY5J+xDKIexPM81NaXPb3QEHpMG8CmfdX5IfgenLAvCqxH13MePgWFvoCcHNYaw+6dmp9MbH0teSdfJPVFf6a73rskzbpIcmvvXvNG4y2YcY1gUWq3gFQdz1pwR8TtlnlJUVxNXBmNflWzqKcnmgn9K7RoRh8i4ZBgsO2rW5wgfXBQtsL6ZCKC4eQEfsUBIDtAZkXwmVoe6FNl3zWCQmICAoCbweH3o3vGFrrrY9in7CvQn2gFHxUkTVgzvVWmBXVgdTIw3qIuyZxfe7V4GazMS8NAtXcdd71XFWiHyAN6gUqP3mUY8RAs6i7iwUHnLOHTxl9sMhYGEBaTy1WAJUMLlumX6ulT8rL9uIFq5BDSVSVlLcw9E9tXDNoLVGItgxPgB3QA5JqSzKKFnWtFKZ17PmZmdtbIm4+XNckX5jIpBkKWzlLl0Nd9nd/0BdznRGt8Eye1waUY2WNWxpqPNcCUnKQW1sdscBXe9i8y317Vp+pE9qjreiOzj0pI/K9KQVp/O/fYcuOoF7VI9EDycMvDNci43dkWml73UZQHlMVwin4SqIcxw7KCoPhrxgcBnfl7+ETnArqPuBUuYJ96JRfjXAQi2++IAncFclwJebvPgU0SG/adKqAEV8Yw6vi+XA8G489vqa183qa9UwmcdOJGY7Eo9CYtWkAceb9jauCwqooFbRTrPOK2SfiN4p/CwRYSd352fNi+LJmT6qHoogHdOBHrOLjfyLNQPWsBV4sflfPUcUPRYq3jOZN14ZTFX+FKX+GPSG17etVLCf0/hmusie99buwxury99BlrkdEeP2TUdeBbgIL4HS94hh8Hw5z+X0uFxzkO7Og8O5mSf/XHPFnFtV+8+s1MbYlUDyRDz8dZMvfPxkbYU93W5Ops+6uo8AZBneinZYx2y/3Xh0KCfVPaZtSYsCp1zdzpeA3TJE5bOLdPcdoAP7nu+X+feppRhFCNc9jaUjIBgkSwu/wd9SlNO7QlPqhTFqxnW0KsGNq3VmtPR+M8WGyRAfVAWwyj4Vrh60CRL4AndyRmIXpzu3xRlxPS3HAsv/xW0zWJoaDUkhSk9tLouAHxvDaVjZUmvi0LRfIzKaqdQdLPWzCZLoGyrEJ16KUsYBCei0LnRt8t7C1VB5hsjoG862ervBePGcXxhQebOd9phOf/6IntcuxrCzkCPt1MMhMVnzF6lw5pMXVeb3x+zsBd+m3Oao1bB6NoEKyrogeqEl1yf+cqPFCvjVsSXmrP7TGf2UgZg1cyeQKePyA7Jcpympf9W7+oAAh3mG0tashm9CToTBNuF151iN/qrFoVblwE91A5pUAY+7YlYWE/4XpjMeHwk69mr/lhENS9rVuZ8fpWxmya+k03kAMvjU04mKV9XE7lz3F2Xc2mGhBaJjrwOr8RDBR12N1NtuiIqzKTUxlmuL1MQ1qRaDjmbsRcbpCLUY3oP6F1kd89aM9RoyzcwyQsyXpEZ3tHrrNhjKP2d6Xs3ImeFwPAJ/NY7ULFisMLpklXhi6gfsg8hsLyMLRYvS5+MXnL06H6NDDToDU7YJgngYJ4r+zUrZ/gFfvsUE7yXVJxnqV0uNLxy1tdbqtXEKZKM8N3OiADVgx/+TYN8X7ao/sPd/Aa3AmflNiauVa+IaaH95XlmrkF/pcBj51XocDZ62n1UcxCcXMVpbFzV9wctxWRMmVPelhixLnsAAK7/02TReledGFpbhLm3OGhNKVOS2NO5cxjP7A7H5k8qqlz9oXek9B8DN1f3VGV2kM5VnSKaX20KGa7+XywSqfZ0V9iFuEr+74CXR0iMOVTfnFmKIt5uPMf6yTgabmbasjBIoX+kU5S5NiULU81lZCW0iOqlZz8D3L7B/F2Mpaybv9D/I2mDVmXRzqoJKb/rCSOi+xeuRoW7Lt5ro5t4US9sjivOdRp7XEV99dJp0A+zvqODoeNGhorUOAOEKVn7YnMm1f4dEUDmxz0LTmxSveVu2CF49Pg36znvGdi2q8kFG/1GTqgsCVRWlvSpTWEKfwSMdEeGXGBDwmQhNeS8UGUWbpJIuKzU5iFmBkWWt+m6NjRQLxuUG3Ez1Qp7ElemqxGQlH7uh6slPzuxjpI+yia25C3iC234pgRPpg2oDg/YvNeXi8LkJ75d5bJhEk0IsTXV8B84PVx2sCcnxKwQ7RwS6Gs0IunnVXjwAE0l0hSmgNT/oeikW8leolUWQTcWnS/iFmzCPMTOecgvYxEBKDgV6Dn7e7ICgh93PAHz6l11Tf43lMzdmkFVMubG/peCPuQwq95j16TwZrJldezh+nmvPr6YsHyzDW3Lr8CUAswBQefDAAIYTEJ1X623+m5cpJNQ++t2CiBCQ8G/8mN+ORWZIhNCkeiXLIPKUgx6Rhlr4bFJePMGbrR3X00kUCwhRsisQMwFWfZmiJqmcsNXm0mX4XiSWxPPnY8SIsfhe6o4a0YHF2IpFFU3Qm6fPN6jVfCBwLu6oTSXk9GSk8plPhmv+a1weyete/yGsnwbOlWM2qsZiKteAPeDVBRPV91W7RHKMS7CiMJjh9qTTaD22CmZJoD3UjLowUJ15Bd0WICgoooJNhSKI03CaaO41LpUSl09TMnRnD5P0CBC2temwBnpzwEpVsn0AnpLCsd6/tDf6R13LMEr4/d3kv5/QrAWgCBAS5tGJIaFdF6dLEutC5GYLMZLgxoMJIzNYBVpZtqfD7gDiec5uOh6qnJINsbCw/PMn6nMkuJEZQ2ThESGmaPRhw7iGAuVvbJpL0uaSxodY5XNPDshcIMY1lAGnPgYMuyJswcyGdrb5jNEhSkV5l9vc7FdtwH5C+RSOSgVQrHioY/8g9byip7wOGBrSr9NUL2xakB1Ij4PxxR3ra0JdfRBZ5VRA6p6KNSI4uEJL5RfxOwprd4MbeL7LOKPjEh+6FIcTGChffNXkeicVK2D+CVhvsjRBOyqgXdpVgf/JdRt0eDcXDwAAvzVzsDZP6eVK1eMKexG+GM9qSzzxRrQoyQqnxtM6Tm583fe1IYsMpD5YPBQY8RwDqjvO3sSnLOz4NzV/lxotANeQWb0qY13msUco1BaYU/XwyvRGUSm7NKr0o9AXKFxwEdDN0limCK3Nrqd+UD+h3VjzUVnkAU/1eLQJq5dh86j5EhjPdPCCF7BCzSNeNsmJ2N6BgTxcMtRBecmGjqKOgUABkcgVa2cLhGhhJiajX4Ngw3Ki37VOCQfETPEtF96lpvAtnij75iHfwZO9FJFy59J7YyAShhN5UWMUUNYPX2dwbqIaHxFW3tGYPvLADK9ebpZadI11v5R+0lVjUUZm6i3EByTNA6N2amS575GM0cVVy4YLX+L101R3iHDxbvNq4pL08xY0RgvLf37UORWkY12g7RpbCFkGnBKv0oglH4cEGjiXVbCr2r6tdjUbUVHJJSAurEqH50t4g+U0JEej0tIHt1EK0XffBEBLBGw+sYteNakOcfi4ZHZN54pdJz7NO5qTq8yNaAvaxK+3brLXBPZhMj8MBSm4PF4oPebRrCsLdAJ85CITi0bVJa9aBPQAH4/VIpSs1IHio03I2g8RxJaaslQrBCgy1cE+QBGYJsXj8GSbJ2aeteIVCp7xciXaZBCQQM7tnL6Gom6ADDwzH9VddP7KlWYjMZNJEtPA0mvA2Bqo780pLdFKwpwnv923jKcoIinR3ycwufUDJSwBCTP5uK1O8uBxJw9Unq/yI9adrDqdcGwuLEL/w1VtE93TYots9+sKqP7NYmCbt8mev7H7ec9O/AzewYgi1YR/hsndhf3nHm0DXMvw5NUaugemY5dYH4L91Tqx3qU3f4RpdKR35STy2SQX6pHMQ9KDdeUd/On/DtZh6EzY9S+GpMeNZqPSkC1Rhtt8HJwGaeWaqyu4uIbB4d0SwqyQxzcLR4XghQs70XND427+c+g7/JFvaOwvlQ/QiT2fiHSAAAAAAcdNPyYL7/VMYHGWA5SBj8sfwFAFSlzQGZ6I8iLX8gt6QBc5EBwAAAALuoPmab5j880EYAJgXxWE+sWnQEgmTREk0Ce2UpX+qS1YUjjgkVkskanKY3BgDyelcC4gUTQXYArKHn8gwOxXyIq9vOqMokZ+uKjvNYqY3VHnMYgVUapOCbfteq+6WdgTW0Q2QbdnfmXpnVigoO2BPqVseaDsW2+B6x0DL8VQEVXLSoy0w0Dv2hDNaVTlJlLt2zRkT1p+I53lwY9VEBC8vmektyj+6xX4f/Vk+yw/ThFnFh3/WR9f6zbjM0/0setPdIDRBXMbzHSp4WE0geYzvdYRbjTxBZ6x7kw0IZBh9APlKFF7T5ksFdo34ALNqteUMcGUBm7A23gBfj7juVSAiXSXtY/DvF21kRh9kT2Fpb2xKRfBMuIs3I1L01FtNTmk9FHitJiEca8KZLyF389avWurwy1jkg8S4sArzFCyi6Ff1lX+dl8GxSu9HFnt+jTSk9CfBYOF0saFvPNrPRxwWo1hXDYnj7EOlUtiT6r60dPO2+mm0IxePW4G/NHoX7OIiES36ME5xUi9HpmS1bRvbm/7o6PyknIXRjayN2yjr4d6PUL2bWt1YrsY4pFqkbb5apqPL7GFbaosdeuRf2rX9BJAeiQDsgLXl9LvNKyCDl80A6OiItUQHhqy6tV1CraskwxmWEeuT3wr7hbNKsrOC2UNE0rhhHJu/qMOT+8V6yn+0c7Er+bMMqFSlt0FZVzoqsucy9V6bJmMuTtcEg3rhJL6tRS/kfW22VNsEPY3VlQzmMtfDTum69Xt+Abaf3/YRy5GjipXbq3eliu1Jkv+8dhWyuFNkSmt1PGkUG/ubMclDQ6MZKWTZusL6qNP94wHZEX/81zfrXdnw7mcXv6nxM6qR5UyIh4wUBBN2PHHg57f/P2SHKStasPgu2HTMljjk/8U1+PG3eu+yWn3cGhyL0jXUTURSyB9az4jo3yCjwTOgNl3zspNgBlbwskQ9lKohhilatd7kJzuluTa19ei5EYXlhf3xoejWQ0uiuBemX9RPWRI/4dVRUTnu+/0QT9lGSUwStP+aJYSQMQC9BPHQr4DcklXLu07Tzn3O18wjxNXwxXf6lLfbHc7hsrFjbEEDvpOUskA/gLpDNFlZD+LctwpxlGqP3imifn3HAwd4H5UMQ41LZYLluTEWO96lcDjHOg1n9tu/Tu/t4v/kr8TLyLWj66yEOoW9esAdnkh1hrpbl2P/smt0Tdyq2nSdgxRnyOzhEkTam/unOX12rmbZGoBW6qqrPy+6OFagUMyOTlU3GEaFcKcgLEhwaHdvErmaNqkB28QC8m7rByFnFCo820AalTK68pBZDRMOcUROfbvM0NoepzR0t7k3w3pw3CWxBYj3W7uyt5iEXoxGWhvDXfkv6zv2UkCNCZahalTQJQE+ZtbD3rMss7laPL3ZmTHntzZFIgGUPJcokf2TFLA8zRaa3aabU8wJoMDY6vlThIyrwAAAAAAAAAAAAAAAA=";var Am=4,Gl=12,Nm=6,Cm=12,Ce="data-kl-remote-image-track",Po=new Intl.DateTimeFormat(void 0,{hour:"2-digit",minute:"2-digit"}),Yl=new Intl.DateTimeFormat(void 0,{month:"short",day:"numeric"}),Mm=new Intl.DateTimeFormat(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),Sm=new Intl.DateTimeFormat(void 0,{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}),Rm={home:"Home",news:"News",chat:"Chat",gallery:"Media Gallery",roster:"Players",room:"Room Tools",music:"Music",activities:"Custom Activities",settings:"Settings"},qr=class{constructor(e,t,i,n,o=new Gt(e,i),a=new Ut(e,new Ft(new be),i),l,d=new Ar,c=new dr(e.getOwnMemberNumber()),u=new cr(e.getOwnMemberNumber()),p=new ur(e.getOwnMemberNumber()),h=(f,y,g)=>Hs(f,void 0,y,g),m=new yr){this.adapter=e;this.service=t;this.settings=i;this.version=n;this.activities=o;this.roster=a;this.imageUploader=d;this.soundStore=c;this.musicStore=u;this.galleryStore=p;this.catboxImageUpload=h;this.remoteImageLoader=m;this.presence=l??new zt(e,i,new Ot,n),this.#po=new tr(e,i,this.presence),this.#hr=new gr(async f=>(await this.soundStore.get(f))?.blob),this.#Ae.hidden=!0,this.#Ae.setAttribute("role","menu"),this.#Ae.setAttribute("aria-label","Player actions"),this.#vt.setAttribute("aria-label","Player actions"),Object.assign(this.#vt.style,{position:"fixed",inset:"0",width:"100vw",height:"100vh",maxWidth:"none",maxHeight:"none",margin:"0",padding:"0",border:"0",background:"transparent",overflow:"visible",zIndex:"2147483099"}),this.#vt.append(this.#Ae),this.#vt.addEventListener("cancel",f=>{f.preventDefault(),this.#gi()}),this.#vt.addEventListener("pointerdown",f=>{f.target===this.#vt&&this.#gi()}),this.#Ht.type="file",this.#Ht.accept="image/jpeg,image/png,image/webp",this.#Ht.hidden=!0,this.#Ht.addEventListener("change",()=>{this.#jd()}),this.#Ht.addEventListener("cancel",()=>{this.#go(!0)})}adapter;service;settings;version;activities;roster;imageUploader;soundStore;musicStore;galleryStore;catboxImageUpload;remoteImageLoader;#e=document.createElement("div");#t=this.#e.attachShadow({mode:"open"});#i=s("button",{className:"kl-launcher",type:"button",title:"Open KikiLink",ariaLabel:"Open KikiLink"});#r=s("span",{className:"kl-badge"});#a=s("span",{className:"kl-connection"});#c=s("span",{className:"kl-connection-dot"});#l=s("span",{className:"kl-connection-text"});#o=s("section",{className:"kl-panel",ariaLabel:"KikiLink Link Deck"});#s=s("nav",{className:"kl-feature-nav",ariaLabel:"KikiLink features"});#p=s("div",{className:"kl-workspace"});#g=s("section",{className:"kl-home"});#d=s("section",{className:"kl-feature-page kl-news-page",ariaLabel:"KikiLink news and changelog"});#u=s("div",{className:"kl-layout"});#h=s("div",{className:"kl-topbar-context",text:"Home"});#m=s("button",{className:"kl-text-button kl-news-trigger",type:"button",title:"KikiLink news and changelog",ariaLabel:"Open KikiLink news and changelog"});#y=s("button",{className:"kl-text-button kl-finder-trigger",type:"button",title:"Find anything in KikiLink (Ctrl+K)",ariaLabel:"Find chats, players, activities, and settings"});#v=s("button",{className:"kl-icon-button kl-topbar-settings",type:"button",title:"KikiLink settings",ariaLabel:"Open KikiLink settings"});#L=s("button",{className:"kl-nav-item",type:"button",title:"Home",ariaLabel:"Open KikiLink home"});#S=s("button",{className:"kl-nav-item",type:"button",title:"LinkChat",ariaLabel:"Open LinkChat"});#C=s("button",{className:"kl-nav-item kl-room-button",type:"button",title:"Room tools",ariaLabel:"Open room tools"});#E=s("button",{className:"kl-nav-item kl-music-button",type:"button",title:"Music & playlists",ariaLabel:"Open music and playlists"});#R=s("button",{className:"kl-nav-item",type:"button",title:"KikiLink settings",ariaLabel:"Open KikiLink settings"});#A=s("h1",{className:"kl-home-title"});#I=s("span",{className:"kl-home-next-icon"});#M=s("h2",{className:"kl-home-next-title"});#w=s("p",{className:"kl-home-next-description"});#G=s("span",{className:"kl-home-next-meta"});#_=s("button",{className:"kl-text-button kl-text-button--primary kl-home-next-button",type:"button"});#O=s("span",{className:"kl-home-status-value"});#U=s("span",{className:"kl-home-status-value"});#X=s("button",{className:"kl-home-status-value kl-home-presence",type:"button",title:"Change your KikiLink status"});#x=s("aside",{className:"kl-home-update"});#ce=s("strong",{className:"kl-home-update-title"});#D=s("span",{className:"kl-feature-card-metric"});#re=s("span",{className:"kl-feature-card-metric"});#Oe=s("span",{className:"kl-feature-card-metric"});#De=s("span",{className:"kl-feature-card-metric"});#he=s("span",{className:"kl-feature-card-metric"});#me=s("span",{className:"kl-feature-card-action"});#ye=s("span",{className:"kl-feature-card-action"});#Q=s("button",{className:"kl-feature-card",type:"button",title:"Open LinkRoster"});#ue=s("button",{className:"kl-feature-card",type:"button",title:"Open Custom Activities"});#z=s("button",{className:"kl-feature-card",type:"button",title:"Open Media Gallery"});#F=s("div",{className:"kl-conversations"});#oe=s("button",{className:"kl-sidebar-new-chat kl-sidebar-gallery",type:"button",title:"Media gallery",ariaLabel:"Open media gallery"});#ee=s("input",{className:"kl-search"});#H=s("div",{className:"kl-empty"});#te=s("section",{className:"kl-chat"});#j=s("div",{className:"kl-avatar"});#Ge=s("div",{className:"kl-chat-name"});#Me=s("div",{className:"kl-chat-number"});#W=s("div",{className:"kl-chat-presence"});#Y=s("div",{className:"kl-chat-room"});#ge=s("button",{className:"kl-icon-button",type:"button",title:"Pin conversation",ariaLabel:"Pin conversation"});#fe=s("button",{className:"kl-icon-button kl-profile-more",type:"button",title:"Player actions",ariaLabel:"Open player actions"});#f=s("div",{className:"kl-messages"});#Se=s("div",{className:"kl-typing-indicator",ariaLabel:"Typing status"});#T=s("textarea",{className:"kl-composer-input"});#b=s("button",{className:"kl-text-button kl-text-button--primary kl-send",type:"button",text:"Send"});#Je=s("button",{className:"kl-icon-button kl-attach-image",type:"button",title:"Send an image",ariaLabel:"Send an image"});#Re=s("div",{className:"kl-quick-actions"});#$=s("input");#Le=s("span",{className:"kl-counter"});#Ct=s("section",{className:"kl-feature-page kl-gallery-page",ariaLabel:"Chat media gallery"});#at=s("p",{className:"kl-feature-page-subtitle"});#Be=s("div",{className:"kl-gallery-grid"});#Yt=s("section",{className:"kl-feature-page kl-room-page",ariaLabel:"Room tools"});#ve=s("div",{className:"kl-room-admin-status"});#Ee=s("input",{className:"kl-search"});#V=s("input",{className:"kl-search"});#gt=s("select",{className:"kl-select"});#Qe=s("input");#kr=s("button",{className:"kl-text-button kl-text-button--primary",type:"button",text:"Apply room media"});#Fi=s("div",{className:"kl-room-player-list"});#it=s("input");#Ue=s("input");#It=s("div",{className:"kl-room-subnav"});#bi=s("div",{className:"kl-room-subpanel kl-room-current-panel"});#ft=s("div",{className:"kl-room-subpanel kl-lobbies-panel"});#Pe=s("div",{className:"kl-room-subpanel kl-room-presets-panel"});#Fe=s("input",{className:"kl-search kl-lobby-search"});#rt=s("select",{className:"kl-select kl-lobby-space",ariaLabel:"Lobby space"});#Jt=s("button",{className:"kl-icon-button kl-lobby-refresh",type:"button",title:"Refresh room list",ariaLabel:"Refresh room list"});#B=s("div",{className:"kl-room-directory-status"});#He=s("div",{className:"kl-lobby-list"});#ie=s("input",{className:"kl-search kl-preset-name"});#Ie=s("button",{className:"kl-text-button kl-text-button--primary",type:"button",text:"Save current room"});#Hi=s("div",{className:"kl-room-preset-list"});#be=s("input");#ke=s("p",{className:"kl-setting-help kl-room-playlist-sync-status"});#Qt=s("section",{className:"kl-feature-page kl-music-page",ariaLabel:"Music and playlists"});#Tt=s("select",{className:"kl-select kl-playlist-select"});#ki=s("button",{className:"kl-text-button",type:"button",text:"New playlist"});#bt=s("input",{className:"kl-search"});#st=s("input",{className:"kl-search"});#Ze=s("input");#yi=s("select",{className:"kl-select kl-music-file-mode"});#xe=s("button",{className:"kl-text-button kl-text-button--primary",type:"button",text:"Add track"});#$e=s("div",{className:"kl-music-add-status"});#q=s("div",{className:"kl-music-queue"});#Z=s("input",{className:"kl-search kl-music-queue-search",ariaLabel:"Search current playlist"});#kt=s("span",{className:"kl-music-queue-summary"});#lt=s("div",{className:"kl-music-artwork"});#Zt=s("strong",{className:"kl-music-now-title",text:"Nothing playing"});#vi=s("span",{className:"kl-music-now-source",text:"Choose a track"});#ae=s("input",{className:"kl-music-progress"});#Te=s("span",{className:"kl-music-time",text:"0:00 / 0:00"});#_t=s("button",{className:"kl-icon-button",type:"button",title:"Previous track",ariaLabel:"Previous track"});#Mt=s("button",{className:"kl-icon-button kl-music-play",type:"button",title:"Play",ariaLabel:"Play"});#Ot=s("button",{className:"kl-icon-button",type:"button",title:"Next track",ariaLabel:"Next track"});#xi=s("button",{className:"kl-text-button kl-music-mode",type:"button"});#ei=s("button",{className:"kl-text-button kl-music-mode",type:"button",text:"Shuffle"});#nt=s("input",{className:"kl-volume-input"});#St=s("button",{className:"kl-text-button kl-music-mode",type:"button",text:"Mute"});#Dt=s("select",{className:"kl-select kl-music-rate",ariaLabel:"Playback speed"});#Ke=s("select",{className:"kl-select kl-music-sleep",ariaLabel:"Sleep timer"});#ti=s("span",{className:"kl-music-sleep-status"});#N=document.createElement("audio");#ii=s("section",{className:"kl-settings-page",ariaLabel:"KikiLink settings"});#Gt=s("div",{className:"kl-settings-tabs"});#yr=new Map;#et=s("input");#$i=s("input");#Ki=s("input");#ne=s("select",{className:"kl-select"});#vr=s("select",{className:"kl-select"});#zi=s("input");#wi=s("select",{className:"kl-select"});#fa=s("div",{className:"kl-image-upload-settings-options"});#Yr=s("input");#ji=s("input",{className:"kl-number-input"});#Ws=s("button",{className:"kl-text-button kl-text-button--primary",type:"button",text:"Save changes"});#Vi=s("select",{className:"kl-select"});#Ai=s("input",{className:"kl-color-input"});#qi=s("select",{className:"kl-select"});#Wi=s("select",{className:"kl-select"});#Jr=s("select",{className:"kl-select"});#Qr=s("select",{className:"kl-select"});#Xi=s("select",{className:"kl-select"});#_n=s("input");#On=s("div",{className:"kl-action-editor"});#Zr=s("input");#Dn=s("input");#en=s("select",{className:"kl-select"});#Yi=s("input");#Xs=s("span",{className:"kl-data-tools-count"});#Gn=s("button",{className:"kl-nav-item kl-roster-button",type:"button",title:"LinkRoster",ariaLabel:"Open LinkRoster"});#Co=s("span",{className:"kl-roster-count"});#ba=s("section",{className:"kl-feature-page kl-roster-page",ariaLabel:"LinkRoster players"});#Ys=s("p",{className:"kl-feature-page-subtitle"});#ka=s("div",{className:"kl-roster-scopes"});#Ni=s("input",{className:"kl-search kl-roster-search"});#Bn=s("div",{className:"kl-roster-list"});#Mo=s("section",{className:"kl-roster-detail"});#Ji=s("textarea",{className:"kl-roster-note"});#tn=s("input",{className:"kl-roster-tags"});#in=s("button",{className:"kl-text-button kl-text-button--primary kl-save-notebook",type:"button",text:"Save note"});#rn=s("input");#Un=s("input");#Fn=s("input");#xr=s("input");#Rt=s("input",{className:"kl-volume-input"});#ya=s("output",{className:"kl-volume-value"});#Qi=s("input");#va=s("div",{className:"kl-custom-sound-list"});#Zi=s("select",{className:"kl-select"});#wr=s("select",{className:"kl-select"});#Ar=s("select",{className:"kl-select"});#Hn=s("input");#Nr=s("div",{className:"kl-reaction-rules-editor"});#Js=s("span",{className:"kl-data-tools-count"});#So=s("button",{className:"kl-nav-item kl-activities-button",type:"button",title:"Custom Activities",ariaLabel:"Open Custom Activities"});#xa=s("section",{className:"kl-feature-page kl-activities-page",ariaLabel:"Custom Activities"});#ze=s("dialog",{className:"kl-dialog kl-new-chat-dialog"});#ri=s("input",{className:"kl-search kl-new-chat-query"});#$n=s("select",{className:"kl-select kl-new-chat-filter",ariaLabel:"Filter known contacts"});#Kn=s("select",{className:"kl-select kl-new-chat-sort",ariaLabel:"Sort known contacts"});#Ro=s("div",{className:"kl-contact-results"});#dt=s("dialog",{className:"kl-dialog kl-finder-dialog"});#we=s("input",{className:"kl-finder-query"});#Bt=s("div",{className:"kl-finder-results"});#nn=s("div",{className:"kl-sr-only"});#zn=s("button",{className:"kl-presence-trigger",type:"button",title:"Change KikiLink status",ariaLabel:"Change KikiLink status"});#Qs=s("span",{className:"kl-presence-dot"});#Zs=s("div",{className:"kl-avatar kl-presence-trigger-avatar"});#el=s("span",{className:"kl-presence-trigger-label"});#tl=s("strong",{className:"kl-presence-trigger-name"});#il=s("span",{className:"kl-presence-trigger-status"});#jn=s("time",{className:"kl-local-clock"});#je=s("dialog",{className:"kl-dialog kl-presence-dialog"});#Lo=s("div",{className:"kl-presence-options"});#Cr=s("input");#er=s("input",{className:"kl-search kl-presence-message"});#Ci=s("textarea",{className:"kl-profile-bio-input"});#Mi=s("input",{className:"kl-number-input"});#ct=s("input",{className:"kl-search kl-presence-avatar-url"});#wa=s("div",{className:"kl-avatar kl-profile-avatar-preview"});#Mr=s("select",{className:"kl-select kl-profile-frame-select",ariaLabel:"Avatar decoration"});#Eo=s("select",{className:"kl-select kl-profile-style-select",ariaLabel:"Profile card style"});#ni=s("input");#Si=s("input",{className:"kl-profile-gradient-color"});#tr=s("input",{className:"kl-profile-gradient-color"});#Ve=s("input",{className:"kl-search kl-presence-banner-url"});#Sr=s("div",{className:"kl-profile-banner-preview"});#ir=s("input");#Vn=s("button",{className:"kl-text-button",type:"button",text:"Upload banner"});#Aa=s("button",{className:"kl-text-button",type:"button",text:"Remove"});#qe=s("span",{className:"kl-profile-banner-status"});#Ri=s("input");#rr=s("input",{className:"kl-profile-outline-color"});#Na=s("button",{className:"kl-text-button kl-text-button--primary",type:"button",text:"Save profile"});#Li=s("input");#nr=s("textarea",{className:"kl-custom-activity-template kl-afk-reply-message"});#Ca=s("div",{className:"kl-afk-reply-options"});#We=s("dialog",{className:"kl-dialog kl-image-dialog"});#qn=s("div",{className:"kl-dialog-title"});#rl=s("div",{className:"kl-dialog-subtitle"});#ut=s("input",{className:"kl-search kl-image-url"});#Rr=s("div",{className:"kl-image-compose-preview"});#Ut=s("button",{className:"kl-image-source-tab",type:"button",text:"Image link"});#Ft=s("button",{className:"kl-image-source-tab",type:"button",text:"Local file"});#on=s("div",{className:"kl-image-source-panel"});#Lr=s("div",{className:"kl-image-source-panel"});#Ei=s("input");#an=s("button",{className:"kl-text-button kl-image-file-choose",type:"button",text:"Choose image"});#yt=s("div",{className:"kl-image-compose-preview kl-local-image-status"});#sn=s("fieldset",{className:"kl-gallery-storage-options"});#Er=s("select",{className:"kl-select kl-gallery-retention",ariaLabel:"Litterbox image lifetime"});#Ma=s("label",{className:"kl-gallery-retention-field"});#Sa=s("span",{className:"kl-image-file-privacy-icon"});#nl=s("span");#Pr=s("button",{className:"kl-text-button kl-text-button--primary",type:"button",text:"Send image"});#Ht=s("input",{className:"kl-group-avatar-file-input",ariaLabel:"Choose a group avatar image"});#Ae=s("div",{className:"kl-profile-menu"});#vt=s("dialog",{className:"kl-profile-menu-layer"});#se=s("dialog",{className:"kl-dialog kl-addon-profile-dialog"});#ln=s("div",{className:"kl-addon-profile-body"});#pt=s("dialog",{className:"kl-dialog kl-alias-dialog"});#Lt=s("input",{className:"kl-search kl-alias-input"});#ol=s("button",{className:"kl-text-button kl-text-button--primary",type:"button",text:"Save nickname"});#Ra=s("button",{className:"kl-text-button",type:"button",text:"Use native nickname"});#xt=s("dialog",{className:"kl-dialog kl-remove-chat-dialog"});#al=s("strong",{className:"kl-remove-chat-name"});#La=s("button",{className:"kl-text-button kl-text-button--danger",type:"button",text:"Remove chat"});#Ea=s("button",{className:"kl-icon-button kl-back",type:"button",title:"Back to conversations",ariaLabel:"Back to conversations"});#k;#$t="";#Pi="";#sl=0;#Po;#ht;#dn="current";#le="home";#Pa="current";#Wn=[];#ll="home";#Ia="home";#Ta="appearance";#or=0;#_a=0;#Kt=!1;#P=!1;#Oa=0;#Da="connecting";#Ii={kind:"new-chat"};#Xn=[];#ar=[];#Yn=0;#Io=0;#Jn=0;#To=0;#Qn=!1;#dl=0;#oi;#cn;#Ir;#Ga=0;#sr;#Ba=0;#ai;#un=!1;#pn;#Tr;#lr;#cl=0;#Ua;#Fa;#tt;#J;#_o;#Oo=new Map;#wt=0;#zt=!1;#si;#hn;#Do=0;#mn;#Go=!1;#Zn;#Ha=0;#gn;#Bo=!1;#Uo=new Set;#jt;#_r=120;#eo;#to=!1;#li=new Set;#Fo=new WeakMap;#Or=new Set;#Dr=new Map;#Gr=new Map;#Br=new Map;#Ti=new Map;#fn=new Set;#Vt=new Map;#Et=new Map;#_i=new Map;#dr=new Map;#di=[];#bn=new Set;#Ne;#Ho=0;#$a=!1;#kn;#ul=new MutationObserver(e=>this.#ru(e));#pl=new WeakMap;#io=new Set;#Oi=new Set;#cr=new Set;#Ka=0;#za;#ro=0;#ur=0;#no="";#At;#ja;#Va;#qa;#Wa;#$o="link";#pr="chat";#Xa;#Ya="device";#yn;#Ur;#de=!1;#oo=0;#ot;#ao=0;#qt;#Fr=!1;#so;#lo;#Xe=!1;#Di=0;#Hr;#Ja=0;#Ko;#vn;#Qa=new Set;#hl=0;#Ye;#zo;#do;#co;#Za="";#es=new Set;#uo;#jo=!1;#ci=!1;#ts="";#xn=new Map;#wn=new Map;#ml=e=>{this.#Ae.hidden||e.composedPath().includes(this.#e)||this.#gi()};#gl=()=>{this.#ma(),this.#No(),this.#bl(),this.#gi()};presence;#po;#hr;attachGroupChatService(e){if(this.#P)throw new Error("Attach group chats before mounting KikiLink");this.#_o?.();let t=this.#J;t&&(this.#ta(),this.#hi(t.sidebarSection),this.#hi(t.chatPane),this.#hi(t.newGroupDialog),this.#hi(t.groupActionMenuLayer),this.#hi(t.groupDetailsDialog),t.destroy()),this.#tt=e;let i=new Ur(this.adapter,e,this.presence,{onActivate:()=>{this.#wt+=1,this.#xo(this.#k),this.#fr(),this.#H.hidden=!0,this.#te.hidden=!0,i.chatPane.hidden=!1,this.#o.dataset.mobileView="chat",this.#Wr(),this.#pa(!1)},onClose:()=>{this.#te.hidden=this.#k===void 0,this.#H.hidden=this.#k!==void 0,this.#o.dataset.mobileView="list",this.#Wr(),this.#pa(!1)},onFeedback:n=>this.#gd(n),confirmRemove:n=>typeof window<"u"&&window.confirm(`Remove \u201C${n.title}\u201D from this account's KikiLink groups?`),renderMemberAvatar:(n,o)=>{this.#Nt(n,o.memberName,o.memberNumber)},bindMemberProfileTarget:(n,o)=>{this.#mi(n,()=>({memberNumber:o.memberNumber,displayName:o.memberName})),n.addEventListener("click",a=>{a.stopPropagation(),this.#zr(o.memberNumber,o.memberName,n)})},getEnterToSend:()=>this.settings.get().linkChat.enterToSend,onRenameGroup:(n,o)=>e.renameGroup(n,o),onSetGroupAvatar:(n,o)=>e.setGroupAvatar(n,o),onSetGroupOutlineColor:(n,o)=>e.setGroupOutlineColor(n,o),onAddGroupMember:(n,o)=>e.addMember(n,o),onKickGroupMember:(n,o)=>e.kickMember(n,o),onConvertLegacyGroup:n=>e.convertLegacyGroup(n),...pe()?{onPickGroupAvatar:(n,o)=>this.#zd(n,o)}:{},onAttachImage:n=>this.#Vo("group",n),renderMessageBody:n=>this.#Zl(n.content||"Group message without text","kl-message-content"),renderGroupAvatar:(n,o)=>this.#Vc(n,o),canRevealGroupAvatar:n=>this.#Xl(n),onRevealGroupAvatar:n=>this.#qc(n),confirmKickMember:(n,o)=>typeof window<"u"&&window.confirm(`Remove ${o.memberName} from \u201C${n.title}\u201D?`),renderSidebar:!1});this.#J=i,this.#_o=e.subscribe(n=>this.#fd(n))}flushGroupStateForPageHide(){let e=this.#tt;if(!e)return;(this.#J?.flushPendingDraft()??Promise.resolve()).then(()=>e.flushNow(),()=>e.flushNow())}getActiveGroupId(){let e=this.#J;if(!(!this.#P||this.#o.hidden||this.#le!=="chat"||this.#u.hidden||!e||e.chatPane.hidden))return e.activeGroupId}mount(){if(this.#P)return;this.#P=!0,this.#e.id="kikilink-root";let e=document.createElement("style");e.textContent=ys,this.#zs(this.settings.get()),this.#bd(),this.#kd(),this.#Rd(),this.#Ld(),this.#Ed(),this.#Pd(),this.#Dd(),this.#Gd(),this.#Bd(),this.#t.append(e,this.#i,this.#o,this.#ze,this.#dt,this.#je,this.#se,this.#We,this.#Ht,this.#pt,this.#xt,this.#vt),this.#J&&this.#t.append(this.#J.newGroupDialog,this.#J.groupActionMenuLayer,this.#J.groupDetailsDialog),document.body.append(this.#e),this.#ul.observe(this.#t,{childList:!0,subtree:!0}),this.#Zc(),this.#po.mount(),this.#ma(),this.#No(),window.addEventListener("resize",this.#gl),document.addEventListener("pointerdown",this.#ml),this.#Ua=this.presence.subscribe(t=>this.#ea(t)),this.#Za=Ul(this.settings.get()),this.#Fa=this.settings.subscribe(t=>{let i=Ul(t);i!==this.#Za&&(this.#Za=i,this.#ys(t))}),this.#ys(this.settings.get()),this.refresh()}destroy(){this.#P=!1,this.#Oa+=1,this.#wt+=1,this.#cs(),this.#ur+=1,this.#Bs(),this.#xo(),this.#wl(),this.#zt=!1,this.#Sl(),this.#Di+=1,this.#Cn(),this.#Xe=!1,this.#fr(),this.#oi!==void 0&&clearTimeout(this.#oi),this.#cn!==void 0&&clearTimeout(this.#cn),this.#cn=void 0,this.#Ir!==void 0&&clearTimeout(this.#Ir),this.#Ir=void 0,this.#hs(),this.#gs(!0),this.#fs(),this.#mn!==void 0&&cancelAnimationFrame(this.#mn),this.#Do+=1,this.#mn=void 0,this.#Go=!1,this.#Zn=void 0,this.#gn!==void 0&&cancelAnimationFrame(this.#gn),this.#gn=void 0,this.#Bo=!1,this.#Uo.clear(),this.#kn!==void 0&&cancelAnimationFrame(this.#kn),this.#kn=void 0,this.#bn.clear(),this.#dt.close(),this.#ze.close(),this.#je.close(),this.#se.close(),this.#At=void 0,this.#no="",this.#Oi.clear(),this.#cr.clear(),this.#ul.disconnect(),this.#Ne?.disconnect(),this.#Ne=void 0,this.#od(),this.#We.close(),this.#Sn(),this.#pt.close(),this.#xt.close(),this.#gi(),window.removeEventListener("resize",this.#gl),document.removeEventListener("pointerdown",this.#ml),this.#Ua?.(),this.#Ua=void 0,this.#Fa?.(),this.#Fa=void 0,this.#_o?.(),this.#_o=void 0,this.#J?.destroy(),this.#ta(),this.#J=void 0,this.#tt=void 0,this.#N.pause(),this.#N.removeAttribute("src"),this.#$l(),this.#Pc(),this.#Yo(),this.#xn.clear(),this.#wn.clear(),this.#ds(),this.#po.destroy(),this.#e.remove(),this.#hr.destroy(),this.soundStore.close(),this.musicStore.close(),this.galleryStore.close(),this.remoteImageLoader.destroy()}isActiveConversation(e){return!this.#o.hidden&&this.#le==="chat"&&!this.#u.hidden&&!this.#te.hidden&&this.getActiveGroupId()===void 0&&this.#k===e}setConnectionState(e,t){this.#Da=e,this.#a.dataset.state=e,this.#l.textContent=e==="ready"?"Connected":e==="error"?"Connection error":"Connecting",this.#a.title=t??this.#l.textContent??"",this.#O.textContent=this.#l.textContent,this.#O.dataset.state=e;let i=this.adapter.canSendBeep();this.#b.disabled=!i||this.#zt,this.#Je.disabled=!i||this.#zt||this.#k===void 0,this.#T.disabled=!i||this.#zt,this.#T.placeholder=i?"Write a Beep\u2026":"Connecting to Bondage Club\u2026",this.#ze.open&&this.#Ao(),this.#le==="activities"&&this.#Uc(),this.#le==="roster"&&this.#mt(),this.#le==="room"&&this.#Gi(!0),this.#le==="music"&&this.#_e()}async onMessage(e,t,i){if(t&&this.presence.getOwnStatus()!=="dnd"&&this.settings.get().linkChat.openOnIncoming){await this.openChat(e,this.adapter.getMemberName(e));return}this.#k===e&&(i&&this.#eo===e?this.#Xc(i):await this.#Rs(e)),await this.refresh()}onReaction(e){this.presence.getOwnStatus()!=="dnd"&&this.#n(e.action==="room-emote"?`Reaction \u201C${e.ruleLabel}\u201D sent: ${e.message}`:e.message)}onNotification(e){if(this.presence.getOwnStatus()==="dnd")return;e.showToast&&this.#n(e.message);let t=this.settings.get().linkReactions.sounds;if(!t.enabled)return;let i=e.kind==="chat"?t.chat:e.kind==="friend-online"?t.friendOnline:t.roomJoin;this.#hr.play(i,{volume:t.volume})}#gd(e){this.#P&&(e.tone==="error"?this.#n(e.message,"error"):e.tone==="warning"&&this.#n(e.message))}#fl(e){this.#P&&(this.#Go||=e,this.#mn===void 0&&(this.#mn=requestAnimationFrame(()=>{this.#mn=void 0;let t=this.#Go;this.#Go=!1;let i=t?void 0:this.#Zn;this.#Wr(i)})))}#fd(e){if(!this.#P||(e.kind!=="persistence"&&this.#fl(!1),this.#pa(!1),this.#le==="home"&&this.#Ui(this.#Zn),this.presence.getOwnStatus()==="dnd"))return;if(e.kind==="group-added"&&e.incoming){this.#n(`${e.group.title} was added to your group chats.`);return}if(e.kind!=="message"||!e.incoming||this.getActiveGroupId()===e.groupId)return;let i=this.#tt?.getGroup(e.groupId)?.title??"Group chat";this.#n(`${i} \xB7 ${e.message.senderName}: ${$r(e.message.content)}`);let n=this.settings.get().linkReactions.sounds;n.enabled&&this.#hr.play(n.chat,{volume:n.volume})}async open(){let e=this.settings.get(),t=e.ui.launcherOpen,i=t==="chat"?"chat":t==="last"?this.#ll:"home";await this.#An(this.#is(i,e))}async#An(e){this.#o.hidden=!1,this.#No(),this.#i.setAttribute("aria-expanded","true"),this.#Pt(e),await this.refresh()}close(){this.#Cn(),this.#wl(),this.#Sn(),this.#Sl(),this.#hs(),this.#gs(!1),this.#fs(),this.#wt+=1,this.#ur+=1,this.#Bs(),this.#fr(),this.#dt.open&&this.#dt.close(),this.#ze.open&&this.#ze.close(),this.#je.open&&this.#je.close(),this.#se.open&&this.#se.close(),this.#We.open&&this.#We.close(),this.#pt.open&&this.#pt.close(),this.#xt.open&&this.#xt.close(),this.#J?.handleHostClose(),this.#gi(),this.#cs(),this.#od(),this.#o.hidden=!0,this.#i.setAttribute("aria-expanded","false")}#is(e,t=this.settings.get()){return e==="roster"&&!t.linkRoster.enabled||e==="activities"&&!t.linkActivities.enabled?"home":e}async openChat(e,t){let i=++this.#wt;this.#J?.activeGroupId&&this.#J.closeActive();let n=await this.service.getConversation(e);if(i!==this.#wt)return;let o=this.adapter.getMemberNickname(e)||n?.peerName||t?.trim()||this.adapter.getMemberName(e);await this.service.ensureConversation(e,o),i===this.#wt&&(await this.#An("chat"),i===this.#wt&&await this.#Yl(e,o,i))}openActivities(){this.#An(this.#le).then(()=>this.#Jo())}openRoster(){this.#An(this.#le).then(()=>this.#vo())}onRosterSync(e){let t=this.#or!==e.presentCount;if(this.#or=e.presentCount,this.#Co.hidden=e.presentCount===0,this.#Co.textContent=e.presentCount>99?"99+":e.presentCount.toString(),this.#Gn.title=e.presentCount?`LinkRoster \xB7 ${e.presentCount} in room`:"LinkRoster",(t||e.changed)&&(this.#gr(),this.#Ui()),e.changed){for(let i of new Set([...e.joined,...e.left]))this.#ea(i);this.presence.requestMany(e.joined)}this.#le==="roster"&&e.changed&&this.#mt()}async refresh(){if(!this.#P)return;let e=await this.service.listConversations();this.#P&&(this.#Wl(e),await this.#pa(!1),await this.#Wr(e),this.#P&&(this.#J?.refresh(),await this.#Ui(e)))}#bd(){this.#r.hidden=!0,this.#i.append(this.#ga("kl-launcher-emblem"),this.#r),this.#i.setAttribute("aria-expanded","false"),this.#i.addEventListener("click",()=>{Date.now()<this.#cl||(this.#o.hidden?this.open():this.close())}),this.#i.addEventListener("pointerdown",e=>this.#Ru(e)),this.#i.addEventListener("pointermove",e=>this.#Lu(e)),this.#i.addEventListener("pointerup",e=>this.#Eu(e)),this.#i.addEventListener("pointercancel",e=>this.#Pu(e))}#kd(){this.#o.hidden=!0,this.#o.id="kikilink-panel",this.#o.setAttribute("role","region"),this.#i.setAttribute("aria-controls",this.#o.id),this.#o.dataset.mobileView="list",this.#o.dataset.workspace="home",this.#a.append(this.#c,this.#l),this.setConnectionState(this.adapter.isReady()?"ready":"connecting");let e=s("div",{className:"kl-brand"},this.#ga("kl-brand-emblem"),s("div",{className:"kl-brand-copy"},s("div",{className:"kl-brand-title",text:"KikiLink"}),s("div",{className:"kl-brand-subtitle"},`Personal Link Deck \xB7 v${this.version}`,this.#a)));e.setAttribute("title","Drag to move KikiLink");let t=s("button",{className:"kl-icon-button",type:"button",title:"Close KikiLink",ariaLabel:"Close KikiLink",onClick:()=>this.close()});t.append(w("close")),this.#v.append(w("settings")),this.#v.addEventListener("click",()=>this.#fi()),this.#y.replaceChildren(w("search","kl-finder-trigger-icon"),s("span",{className:"kl-finder-trigger-label",text:"Find"}),s("kbd",{className:"kl-finder-shortcut",text:"Ctrl K"})),this.#y.setAttribute("aria-keyshortcuts","Control+K Meta+K"),this.#y.addEventListener("click",()=>this.#Rl()),this.#m.replaceChildren(w("note","kl-news-trigger-icon"),s("span",{className:"kl-news-trigger-label",text:"News"})),this.#m.addEventListener("click",()=>this.#ui("news")),this.#el.replaceChildren(this.#tl,this.#il),this.#zn.replaceChildren(this.#Zs,this.#el,this.#Qs),this.#zn.addEventListener("click",()=>this.#os()),this.#Zo(),this.#Vl(),this.#h.dataset.noPanelDrag="true",this.#jn.dataset.noPanelDrag="true";let i=s("div",{className:"kl-topbar-drag-space",ariaLabel:"Drag to move KikiLink"}),n=s("header",{className:"kl-topbar"},e,this.#m,i,this.#h,this.#jn,this.#zn,this.#y,this.#v,t);n.addEventListener("pointerdown",u=>this.#Tu(u)),n.addEventListener("pointermove",u=>this.#_u(u)),n.addEventListener("pointerup",u=>this.#Ou(u)),n.addEventListener("pointercancel",u=>this.#Du(u)),this.#yd(),this.#xd(),this.#vd(),this.#ee.type="search",this.#ee.placeholder="Search direct and group chats",this.#ee.autocomplete="off",this.#ee.addEventListener("input",()=>{this.#Wr()}),this.#oe.append(w("image"),s("span",{className:"kl-sidebar-gallery-label",text:"Gallery"})),this.#oe.addEventListener("click",()=>{this.#ls()});let o=s("button",{className:"kl-sidebar-new-chat",type:"button",title:"New Beep chat",ariaLabel:"New Beep chat",onClick:()=>this.#wo()},w("plus")),a=this.#J?.newGroupButton;a&&(a.classList.add("kl-sidebar-new-chat","kl-sidebar-new-group","kl-toolbar-group-button"),a.title="Create group chat (3\u20135 people)",a.setAttribute("aria-label","Create group chat with 3\u20135 people"),a.replaceChildren(w("users")));let l=s("aside",{className:"kl-sidebar"},s("div",{className:"kl-search-wrap"},this.#ee),s("div",{className:"kl-sidebar-heading"},s("span",{text:"Chats"}),s("div",{className:"kl-sidebar-heading-actions"},this.#oe,a,o)),this.#F);this.#H.append(s("div",{className:"kl-empty-mark"},w("chat")),s("h2",{className:"kl-empty-title",text:"Your Beeps, connected"}),s("p",{className:"kl-empty-copy",text:"Choose a conversation or start a new one by member number."}),s("button",{className:"kl-text-button kl-text-button--primary",type:"button",text:"New chat",onClick:()=>this.#wo()})),this.#Cd();let d=s("main",{className:"kl-main"},this.#H,this.#te,this.#J?.chatPane);this.#u.append(l,d),this.#Ic(),this.#Wd(),this.#Zd(),this.#mc(),this.#Bc(),this.#Md(),this.#p.append(this.#g,this.#d,this.#u,this.#Ct,this.#ba,this.#Yt,this.#Qt,this.#xa,this.#ii);let c=s("div",{className:"kl-shell"},this.#s,this.#p);this.#o.append(n,c),this.#Pt("home",!1),this.#o.addEventListener("keydown",u=>{let p=u.target,h=p instanceof HTMLInputElement||p instanceof HTMLTextAreaElement||p instanceof HTMLSelectElement||p instanceof HTMLElement&&p.isContentEditable;if(u.key.toLocaleLowerCase()==="k"&&(u.ctrlKey||u.metaKey)&&!h){u.preventDefault(),this.#Rl();return}if(u.key==="Escape"&&!this.#Ae.hidden){this.#gi();return}u.key==="Escape"&&!this.#ze.open&&!this.#dt.open&&!this.#je.open&&!this.#se.open&&!this.#We.open&&!this.#pt.open&&!this.#xt.open&&this.close()}),this.#t.addEventListener("pointerdown",u=>{this.#Ae.hidden||u.composedPath().includes(this.#Ae)||this.#gi()})}#yd(){this.#$r(this.#L,"home","Home","home"),this.#$r(this.#S,"chat","Chat","chat"),this.#$r(this.#Gn,"users","Players","roster"),this.#$r(this.#C,"location","Room","room"),this.#$r(this.#E,"music","Music","music"),this.#$r(this.#So,"activities","Custom","activities"),this.#$r(this.#R,"settings","Settings","settings"),this.#Co.hidden=!0,this.#Gn.append(this.#Co),this.#s.append(this.#L,this.#S,this.#Gn,this.#C,this.#E,this.#So,this.#R)}#$r(e,t,i,n){e.dataset.target=n,e.replaceChildren(w(t,"kl-nav-icon"),s("span",{className:"kl-nav-label",text:i})),e.addEventListener("click",()=>this.#ui(n))}#ui(e){if(e==="home"||e==="chat"||e==="news"){this.#Pt(e),e!=="news"&&this.refresh();return}if(e==="roster"){this.#vo();return}if(e==="activities"){this.#Jo();return}if(e==="room"){this.#us();return}if(e==="music"){this.#Pt("music"),this.#_e();return}if(e==="gallery"){this.#ls();return}this.#fi()}#vd(){let e=s("a",{className:"kl-text-button kl-news-changelog-link",text:"Full changelog"});e.href="https://github.com/Lilja000/KikiLink/blob/main/CHANGELOG.md",e.target="_blank",e.rel="noopener noreferrer";let t=s("header",{className:"kl-feature-page-header"},s("div",{className:"kl-feature-page-heading"},s("div",{className:"kl-feature-page-eyebrow",text:"KIKILINK JOURNAL"}),s("h1",{className:"kl-feature-page-title",text:"News"}),s("p",{className:"kl-feature-page-subtitle",text:"New features, important fixes, and the details behind each release."})),e),i=Zs.map(n=>{let o=n.version===this.version,a=s("time",{className:"kl-news-date",text:n.date});a.dateTime=n.date;let l=s("article",{className:"kl-news-release"},s("div",{className:"kl-news-release-rail"},s("span",{className:"kl-news-release-dot"})),s("div",{className:"kl-news-release-card"},s("div",{className:"kl-news-release-meta"},s("span",{className:"kl-news-version",text:`v${n.version}`}),o?s("span",{className:"kl-news-current",text:"Current"}):null,a),s("h2",{text:n.title}),s("p",{className:"kl-news-summary",text:n.summary}),s("ul",{className:"kl-news-highlights"},...n.highlights.map(d=>s("li",{},s("span",{text:d}))))));return l.dataset.version=n.version,l.dataset.current=String(o),l});this.#d.append(t,s("div",{className:"kl-news-feed"},...i))}#xd(){this.#X.addEventListener("click",()=>this.#os()),this.#M.id="kikilink-home-next-title",this.#_.addEventListener("click",()=>{this.#Ad()});let e=s("section",{className:"kl-home-next",ariaLabel:"Suggested next step"},this.#I,s("div",{className:"kl-home-next-copy"},s("div",{className:"kl-home-next-kicker",text:"SUGGESTED NEXT STEP"}),this.#M,this.#w),s("div",{className:"kl-home-next-footer"},this.#G,this.#_));e.setAttribute("aria-labelledby",this.#M.id);let t=s("div",{className:"kl-home-mark"},this.#ga("kl-home-emblem"),s("span",{className:"kl-home-orbit"}));t.setAttribute("aria-hidden","true");let i=s("header",{className:"kl-home-hero"},s("div",{className:"kl-home-hero-copy"},s("div",{className:"kl-home-eyebrow",text:"KIKILINK HOME"}),this.#A,s("p",{className:"kl-home-lead",text:"Your Beeps and room tools, organized around what you want to do next."}),s("div",{className:"kl-home-statuses"},this.#rs("Connection",this.#O),this.#rs("My status",this.#X),this.#rs("Current room",this.#U))),e,t),n=s("button",{className:"kl-feature-card kl-feature-card--primary",type:"button",title:"Open LinkChat",onClick:()=>this.#ui("chat")});this.#ho(n,"chat","START OR CONTINUE","Chat","Read recent Beeps, find conversations, and send a message.",this.#D,s("span",{className:"kl-feature-card-action",text:"Open Chat"})),this.#ho(this.#Q,"users","SEE WHO IS HERE","Players","Find people in the room, Whisper, and keep private notes.",this.#re,this.#me),this.#Q.addEventListener("click",()=>this.#ui("roster")),this.#ho(this.#ue,"activities","EXPRESS YOURSELF","Custom Activities","Create personal actions that appear beside vanilla Activities.",this.#Oe,this.#ye),this.#ue.addEventListener("click",()=>this.#ui("activities")),this.#ho(this.#z,"image","YOUR IMAGE LIBRARY","Gallery","Browse chat images or add a link and local upload directly to your library.",this.#De,s("span",{className:"kl-feature-card-action",text:"Open gallery"})),this.#z.addEventListener("click",()=>this.#ui("gallery"));let o=s("button",{className:"kl-feature-card",type:"button",title:"KikiLink settings",onClick:()=>this.#ui("settings")});this.#ho(o,"settings","MAKE IT YOURS","Settings","Adjust the look, comfort, launcher, privacy, and optional tools.",this.#he,s("span",{className:"kl-feature-card-action",text:"Customize"}));let a=s("div",{className:"kl-home-section-heading"},s("h2",{text:"Choose a tool"}),s("p",{className:"kl-home-section-description",text:"Core tools stay here; Gallery is easy to reach without adding another main tab."})),l=s("section",{className:"kl-feature-grid",ariaLabel:"KikiLink tools"},n,this.#Q,this.#ue,this.#z,o),d=s("div",{className:"kl-home-privacy"},w("lock","kl-home-privacy-icon"),s("span",{},"Account-private by design \xB7 data belongs to this BC MemberNumber; presence is shared only with compatible KikiLink users.")),c=s("a",{className:"kl-text-button kl-text-button--primary kl-home-update-button",text:"Update KikiLink"});c.href=Ma,c.target="_blank",c.rel="noopener noreferrer",this.#x.hidden=!0,this.#x.setAttribute("aria-live","polite"),this.#x.replaceChildren(w("refresh","kl-home-update-icon"),s("div",{className:"kl-home-update-copy"},this.#ce,s("span",{text:"Install the official userscript, then reload Bondage Club."})),c),this.#g.append(i,this.#x,a,l,d),bi!=="fusam"&&this.#wd()}async#wd(){let e=++this.#Oa,t=await Sa(this.version);!this.#P||e!==this.#Oa||!t||(this.#ce.textContent=`KikiLink ${t} is available`,this.#x.hidden=!1)}#rs(e,t){return s("div",{className:"kl-home-status"},s("span",{className:"kl-home-status-label",text:e}),t)}#ho(e,t,i,n,o,a,l){e.replaceChildren(w(t,"kl-feature-card-icon"),s("span",{className:"kl-feature-card-copy"},s("span",{className:"kl-feature-card-kicker",text:i}),s("span",{className:"kl-feature-card-title",text:n}),s("span",{className:"kl-feature-card-description",text:o})),s("span",{className:"kl-feature-card-footer"},a,l))}async#Ad(){let e=this.#Ii;if(e.kind==="new-chat"){this.#wo();return}if(e.kind==="chat"){e.peerNumber!==void 0?await this.openChat(e.peerNumber,e.peerName):this.#ui("chat");return}if(e.kind==="group"){await this.#An("chat"),await this.#J?.activate(e.groupId);return}this.#ui(e.kind)}#Pt(e,t=!0){this.#le==="roster"&&e!=="roster"&&this.#Bi(!1),this.#le==="gallery"&&e!=="gallery"&&this.#cs(),this.#le=e,t&&e!=="settings"&&(this.#ll=e),this.#o.dataset.workspace=e,this.#g.hidden=e!=="home",this.#d.hidden=e!=="news",this.#u.hidden=e!=="chat",this.#Ct.hidden=e!=="gallery",this.#ba.hidden=e!=="roster",this.#Yt.hidden=e!=="room",this.#Qt.hidden=e!=="music",this.#xa.hidden=e!=="activities",this.#ii.hidden=e!=="settings",e==="chat"&&this.#J?.activeGroupId&&this.#J.markVisibleActiveRead(),e==="chat"&&this.#k===void 0&&(this.#o.dataset.mobileView="list"),this.#h.textContent=Rm[e],this.#Nd()}#Nd(){for(let e of this.#s.querySelectorAll(".kl-nav-item")){let t=e.dataset.target===this.#le||this.#le==="gallery"&&e.dataset.target==="chat";e.dataset.active=String(t),t?e.setAttribute("aria-current","page"):e.removeAttribute("aria-current")}this.#le==="settings"?this.#v.setAttribute("aria-current","page"):this.#v.removeAttribute("aria-current"),this.#le==="news"?this.#m.setAttribute("aria-current","page"):this.#m.removeAttribute("aria-current")}#Cd(){this.#te.hidden=!0,this.#Ea.append(w("back")),this.#Ea.addEventListener("click",()=>this.#Bu()),this.#aa(!1),this.#ge.addEventListener("click",()=>{this.#su()}),this.#fe.append(w("more")),this.#Je.append(w("image")),this.#b.replaceChildren(w("send"),s("span",{className:"kl-send-label",text:"Send"}));let e=s("div",{className:"kl-chat-person"},this.#Ge,s("div",{className:"kl-chat-subline"},this.#Me,this.#W,this.#Y)),t=s("header",{className:"kl-chat-header"},this.#Ea,this.#j,e,this.#ge,this.#fe);this.#fe.addEventListener("click",()=>{if(this.#k===void 0)return;let o=this.#fe.getBoundingClientRect();this.#sa(this.#k,this.#$t,o.right,o.bottom+6,this.#fe)}),this.#mi(this.#j,()=>this.#k===void 0?void 0:{memberNumber:this.#k,displayName:this.#$t}),this.#j.addEventListener("click",()=>{this.#k!==void 0&&this.#zr(this.#k,this.#$t)}),this.#j.addEventListener("keydown",o=>{o.key!=="Enter"&&o.key!==" "||this.#k===void 0||(o.preventDefault(),this.#zr(this.#k,this.#$t))}),this.#mi(e,()=>this.#k===void 0?void 0:{memberNumber:this.#k,displayName:this.#$t}),this.#T.maxLength=1e3,this.#T.rows=1,this.#T.addEventListener("input",()=>{this.#Ks(),this.#ha(),this.#k!==void 0&&(this.#ql(this.#k,this.#Pi,this.#T.value),this.#Hc())}),this.#T.addEventListener("blur",()=>this.#fr()),this.#T.addEventListener("keydown",o=>{let a=this.settings.get().linkChat.enterToSend;o.key==="Enter"&&!o.isComposing&&(o.ctrlKey||o.metaKey||a&&!o.shiftKey&&!o.altKey)&&(o.preventDefault(),this.#Jl())}),this.#b.addEventListener("click",()=>{this.#Jl()}),this.#Je.addEventListener("click",()=>this.#Vo()),this.#$.type="checkbox",this.#$.addEventListener("change",()=>{this.settings.update(o=>{o.linkChat.includeRoomByDefault=this.#$.checked})});let i=s("div",{className:"kl-composer-options"},s("label",{className:"kl-check"},this.#$,"Share current room"),this.#Le),n=s("footer",{className:"kl-composer"},this.#Se,this.#Re,s("div",{className:"kl-composer-row"},this.#Je,this.#T,this.#b),i);this.#Se.hidden=!0,this.#Se.setAttribute("role","status"),this.#Se.setAttribute("aria-live","polite"),this.#te.append(t,this.#f,n),this.#sd(),this.#ha()}#Md(){let e=s("header",{className:"kl-feature-page-header"},s("div",{className:"kl-feature-page-heading"},s("div",{className:"kl-feature-page-eyebrow",text:"MAKE IT YOURS"}),s("h1",{className:"kl-feature-page-title",text:"Settings"}),s("p",{className:"kl-feature-page-subtitle",text:"Tune KikiLink for your screen, habits, and comfort without changing the game."})));this.#Vi.replaceChildren(A("dark","Dark lacquer"),A("light","Light paper"),A("system","Follow system")),this.#Vi.dataset.setting="theme",this.#Vi.setAttribute("aria-label","Theme");let t=this.#K("Theme","Lacquer black, warm paper, or your system theme.",this.#Vi);this.#Ai.type="color",this.#Ai.dataset.setting="accent",this.#Ai.setAttribute("aria-label","Custom accent color");let i=s("div",{className:"kl-color-presets"});for(let[We,lt]of[["#d71932","Crimson"],["#b63a67","Sakura"],["#ad7624","Gold"],["#7557c8","Violet"],["#247f7a","Jade"]]){let Lt=s("button",{className:"kl-color-swatch",type:"button",title:lt,ariaLabel:`Use ${lt} accent`,onClick:()=>{this.#Ai.value=We,this.#$s()}});Lt.dataset.color=We,Lt.setAttribute("aria-pressed","false"),Lt.style.setProperty("--kl-swatch",We),i.append(Lt)}this.#Ai.addEventListener("input",()=>this.#$s());let n=this.#K("Accent color","Choose a preset or any color that feels like yours.",s("div",{className:"kl-color-control"},i,this.#Ai));this.#qi.replaceChildren(A("comfortable","Comfortable"),A("compact","Compact"),A("super-compact","Super compact")),this.#qi.dataset.setting="density",this.#qi.setAttribute("aria-label","Interface spacing");let o=this.#K("Spacing","Comfortable is roomy; Compact fits more; Super compact keeps only the essentials.",this.#qi);this.#Wi.replaceChildren(A("normal","Default"),A("large","Large"),A("extra-large","Extra large")),this.#Wi.dataset.setting="text-scale",this.#Wi.setAttribute("aria-label","Text size");let a=this.#K("Text size","Increase labels and supporting text throughout the deck.",this.#Wi);this.#Jr.replaceChildren(A("showcase","Guided"),A("compact","Focused")),this.#Jr.dataset.setting="home-layout",this.#Jr.setAttribute("aria-label","Home style");let l=this.#K("Home style","Guided suggests a useful next step; Focused keeps only the essentials.",this.#Jr);this.#Qr.replaceChildren(A("right","Right"),A("left","Left")),this.#Qr.dataset.setting="launcher-side",this.#Qr.setAttribute("aria-label","Launcher side");let d=this.#K("Launcher side","Choose its default side. You can still drag the emblem anywhere.",this.#Qr);this.#Xi.replaceChildren(A("home","Link Deck home"),A("last","Last section"),A("chat","LinkChat directly")),this.#Xi.dataset.setting="launcher-open",this.#Xi.setAttribute("aria-label","Launcher opens");let c=this.#K("Launcher opens","Choose what happens when you tap the floating emblem.",this.#Xi);this.#_n.type="checkbox";let u=s("label",{className:"kl-switch"},this.#_n,s("span",{className:"kl-switch-track"}));this.#_n.setAttribute("aria-label","Reduced motion");let p=this.#K("Reduced motion","Disable panel and control animations.",u);this.#Yr.type="checkbox",this.#Yr.setAttribute("aria-label","Show KikiLink Blossom");let h=s("label",{className:"kl-switch"},this.#Yr,s("span",{className:"kl-switch-track"})),m=s("button",{className:"kl-text-button kl-text-button--primary",type:"button",text:"Move flower",onClick:()=>this.#Au()}),f=s("button",{className:"kl-text-button",type:"button",text:"Reset flower position",onClick:()=>this.#wu()}),y=s("section",{className:"kl-setting-section kl-room-badge-settings"},s("div",{className:"kl-setting-section-title",text:"Blossom badge"}),this.#K("Show Blossom flower","A small translucent KikiLink mark beside the addon icons above compatible characters.",h),s("div",{className:"kl-setting-action-row"},s("div",{className:"kl-setting-copy"},s("div",{className:"kl-setting-name",text:"Flower position"}),s("div",{className:"kl-setting-help",text:"Choose Move flower while you are in a room, then drag the flower above your character once. Normal gameplay cannot move it."})),s("div",{className:"kl-inline-actions"},m,f)));this.#et.type="checkbox";let g=s("label",{className:"kl-switch"},this.#et,s("span",{className:"kl-switch-track"}));this.#et.setAttribute("aria-label","Save message history");let x=this.#K("Save message history","Stored for this BC account; recent history is mirrored to your other devices.",g);this.#$i.type="checkbox";let b=s("label",{className:"kl-switch"},this.#$i,s("span",{className:"kl-switch-track"}));this.#$i.setAttribute("aria-label","Send messages with Enter");let N=this.#K("Enter sends","Press Enter to send and Shift+Enter for a new line. Ctrl+Enter always sends.",b);this.#Ki.type="checkbox";let k=s("label",{className:"kl-switch"},this.#Ki,s("span",{className:"kl-switch-track"}));this.#Ki.setAttribute("aria-label","Share typing indicators");let C=this.#K("Typing indicators","Show and share a short-lived typing signal only with compatible KikiLink users.",k);this.#ne.replaceChildren(A("ask","Ask before loading"),A("always","Always show"),A("never","Links only")),this.#ne.setAttribute("aria-label","Remote image previews");let I=this.#K("Chat image previews","Controls remote images inside direct and group messages. Ask keeps a placeholder until you explicitly load the image.",this.#ne);this.#vr.replaceChildren(A("ask","Ask before loading"),A("always","Always show"),A("never","Links only")),this.#vr.setAttribute("aria-label","Profile image previews");let G=this.#K("Profile avatars & banners","Ask is the privacy-first default. Loading remote art reveals your IP and request time to its host; Always show opts into that automatically.",this.#vr);this.#zi.type="checkbox",this.#zi.setAttribute("aria-label","Enable temporary Litterbox sharing"),this.#zi.addEventListener("change",()=>this.#cd());let T=s("label",{className:"kl-switch"},this.#zi,s("span",{className:"kl-switch-track"}));this.#wi.replaceChildren(A("1h","1 hour"),A("12h","12 hours"),A("24h","24 hours"),A("72h","3 days")),this.#wi.setAttribute("aria-label","Temporary file lifetime");let D=s("a",{className:"kl-inline-link",text:"Litterbox by Catbox"});D.href="https://litterbox.catbox.moe/",D.target="_blank",D.rel="noopener noreferrer",this.#fa.append(this.#K("Temporary link lifetime","Litterbox removes shared chat images and room media after this period.",this.#wi),s("p",{className:"kl-image-upload-privacy"},w("lock"),s("span",{},"Only an explicit Share or Upload action makes a network request. KikiLink replaces the filename; images are resized and stripped of metadata before the public file is sent to ",D,". Audio may retain embedded metadata. Expiration cannot remove copies another person already saved. Manual Gallery files stay on this device and are never uploaded automatically.")));let _=s("section",{className:"kl-setting-section kl-image-upload-settings"},s("div",{className:"kl-setting-section-title",text:"Temporary file sharing"}),this.#K("Share local files","Create expiring public links through Litterbox without an account.",T),this.#fa);this.#ji.type="number",this.#ji.min="1",this.#ji.max="3650",this.#ji.dataset.setting="retention-days",this.#ji.setAttribute("aria-label","Message retention in days");let M=this.#K("Retention","Automatically remove older messages.",s("label",{},this.#ji," days")),B=s("button",{className:"kl-text-button kl-text-button--danger",type:"button",text:"Clear all LinkChat history",onClick:()=>{this.#Nu()}}),z=this.#Kr("appearance","Appearance & comfort","Choose a look and reading density that stays comfortable during long sessions.",t,n,o,a,l,p,y),Y=s("button",{className:"kl-text-button",type:"button",text:"Reset launcher position",onClick:()=>this.#vu()}),J=s("button",{className:"kl-text-button",type:"button",text:"Reset window position",onClick:()=>this.#xu()}),j=this.#Kr("navigation","Navigation & launcher","Decide where KikiLink lives and what you see first.",c,d,s("div",{className:"kl-setting-action-row"},s("div",{className:"kl-setting-copy"},s("div",{className:"kl-setting-name",text:"Launcher position"}),s("div",{className:"kl-setting-help",text:"A button alternative to dragging: return the emblem to its safe corner."})),Y),s("div",{className:"kl-setting-action-row"},s("div",{className:"kl-setting-copy"},s("div",{className:"kl-setting-name",text:"Window position"}),s("div",{className:"kl-setting-help",text:"Drag the KikiLink title bar on desktop, or return the window to its default corner."})),J));this.#Zr.type="checkbox";let Q=s("label",{className:"kl-switch"},this.#Zr,s("span",{className:"kl-switch-track"}));this.#Zr.setAttribute("aria-label","Enable LinkRoster");let St=this.#K("Enable LinkRoster","Room roster, quick player actions, favorites, and private notes.",Q);this.#Dn.type="checkbox";let nt=s("label",{className:"kl-switch"},this.#Dn,s("span",{className:"kl-switch-track"}));this.#Dn.setAttribute("aria-label","Remember player encounters");let ce=this.#K("Remember encounters","Store the last room, time, and encounter count only for this BC account.",nt);this.#en.replaceChildren(A("30","30 days"),A("90","90 days"),A("180","180 days"),A("365","1 year"),A("730","2 years"),A("0","Keep forever")),this.#en.dataset.setting="roster-retention",this.#en.setAttribute("aria-label","Player encounter retention");let $e=this.#K("Forget old encounters","Applies only to players without notes, tags, or a favorite. Notebook entries stay safe.",this.#en);this.#Yi.type="file",this.#Yi.accept=".json,application/json",this.#Yi.hidden=!0,this.#Yi.addEventListener("change",()=>{this.#Mu()});let ot=s("button",{className:"kl-text-button",type:"button",text:"Export",ariaLabel:"Export player notebook backup",onClick:()=>this.#Cu()}),at=s("button",{className:"kl-text-button",type:"button",text:"Import",ariaLabel:"Import player notebook backup",onClick:()=>this.#Yi.click()}),ie=s("section",{className:"kl-data-tools"},s("div",{className:"kl-data-tools-copy"},s("div",{className:"kl-data-tools-title",text:"Notebook backup"}),s("div",{className:"kl-setting-help",text:"Download or merge a manual JSON backup of this account's player notebook."}),this.#Xs),s("div",{className:"kl-data-tools-actions"},ot,at,this.#Yi)),Rt=s("button",{className:"kl-text-button kl-text-button--danger",type:"button",text:"Clear player notes & encounter history",onClick:()=>this.#Su()}),oi=this.#Kr("players","Players & private notebook","Control what the player workspace remembers for this BC account.",St,ce,G,$e,ie,Rt),ai=s("button",{className:"kl-text-button kl-add-action",type:"button",text:"+ Add quick action",onClick:()=>this.#ld()}),un=s("section",{className:"kl-setting-section kl-setting-editor-section"},s("div",{className:"kl-setting-section-title",text:"Quick actions"}),s("div",{className:"kl-setting-help",text:"Insert reusable actions into a Beep. Variables: {name}, {member}, {me}."}),this.#On,ai),pn=this.#Kr("chat","Chat, history & privacy","Keep this account's Beep history useful and under your control.",N,C,I,_,x,M,un,B);this.#rn.type="checkbox";let si=s("label",{className:"kl-switch"},this.#rn,s("span",{className:"kl-switch-track"}));this.#rn.setAttribute("aria-label","Show Custom Activities tab");let hn=this.#K("Show Custom Activities tab","Keep your personal activity builder in the KikiLink toolbar.",si),L=s("button",{className:"kl-text-button kl-text-button--primary",type:"button",text:"Open Custom Activities",onClick:()=>this.#Jo()}),O=this.#Kr("activities","Custom Activities","Create personal actions without replacing or cluttering Bondage Club's vanilla Activities.",hn,s("div",{className:"kl-presence-caveat",text:"Your account's list starts empty. Blossom marks every custom action in the native menu."}),L);this.#Un.type="checkbox";let U=s("label",{className:"kl-switch"},this.#Un,s("span",{className:"kl-switch-track"}));this.#Un.setAttribute("aria-label","Friend online alerts");let de=this.#K("Friends come online","Show a small local notice when a friend appears online.",U);this.#Fn.type="checkbox";let st=s("label",{className:"kl-switch"},this.#Fn,s("span",{className:"kl-switch-track"}));this.#Fn.setAttribute("aria-label","Room join alerts");let mn=this.#K("Someone joins your room","Show a small local notice after a player joins the current room.",st);this.#xr.type="checkbox";let bd=s("label",{className:"kl-switch"},this.#xr,s("span",{className:"kl-switch-track"}));this.#xr.setAttribute("aria-label","Notification sounds"),this.#xr.addEventListener("change",()=>{this.#xr.checked&&this.#hr.unlock()});let kd=this.#K("Notification sounds","Use a different gentle sound for chats and the alerts above.",bd);this.#Rt.type="range",this.#Rt.min="0",this.#Rt.max="100",this.#Rt.step="1",this.#Rt.setAttribute("aria-label","Alert volume"),this.#Rt.addEventListener("input",()=>{this.#ya.textContent=`${this.#Rt.value}%`});let yd=this.#K("Alert volume","Applies to built-in and local custom notification sounds.",s("label",{className:"kl-volume-control"},this.#Rt,this.#ya)),vd=Object.entries(Vn);for(let We of[this.#Zi,this.#wr,this.#Ar])We.replaceChildren(...vd.map(([lt,Lt])=>A(lt,Lt)));this.#Zi.setAttribute("aria-label","Chat notification sound"),this.#wr.setAttribute("aria-label","Friend online sound"),this.#Ar.setAttribute("aria-label","Room join sound");let gn=(We,lt)=>s("div",{className:"kl-sound-choice"},s("span",{className:"kl-setting-name",text:We}),s("div",{className:"kl-sound-choice-controls"},lt,s("button",{className:"kl-text-button kl-sound-preview",type:"button",text:"Play",ariaLabel:`Preview ${We.toLocaleLowerCase()} sound`,onClick:()=>{this.#hr.play(Nt(lt.value,"chime"),{volume:Number(this.#Rt.value)})}}))),xd=s("details",{className:"kl-settings-disclosure kl-sound-settings"},s("summary",{},s("span",{text:"Choose sounds"}),s("span",{className:"kl-disclosure-meta",text:"Optional"})),s("div",{className:"kl-sound-choices"},gn("Incoming chat",this.#Zi),gn("Friend online",this.#wr),gn("Room join",this.#Ar)));this.#Qi.type="file",this.#Qi.accept="audio/*",this.#Qi.hidden=!0,this.#Qi.addEventListener("change",()=>{this.#fu()});let wd=s("button",{className:"kl-text-button kl-text-button--primary",type:"button",text:"Add local sound",onClick:()=>this.#Qi.click()}),Ad=s("details",{className:"kl-settings-disclosure kl-custom-sounds"},s("summary",{},s("span",{text:"My sounds"}),s("span",{className:"kl-disclosure-meta",text:"Device only"})),s("div",{className:"kl-custom-sounds-body"},s("p",{className:"kl-setting-help",text:"Audio must be 5 seconds or shorter and under 10 MB. The file stays in this browser and is never synchronized."}),wd,this.#Qi,this.#va));this.#Hn.type="checkbox";let Nd=s("label",{className:"kl-switch"},this.#Hn,s("span",{className:"kl-switch-track"}));this.#Hn.setAttribute("aria-label","Enable advanced reaction rules");let Cd=this.#K("Enable custom rules","Run your own ordered event rules. Leave this off if the quick alerts are enough.",Nd),Md=s("button",{className:"kl-text-button kl-add-action kl-add-reaction-rule",type:"button",text:"+ Add event rule",onClick:()=>this.#dd()}),Sd=s("section",{className:"kl-setting-section kl-setting-editor-section kl-reaction-rules"},s("div",{className:"kl-reaction-rules-heading"},s("div",{className:"kl-setting-section-title",text:"Custom rules"})),s("div",{className:"kl-setting-help",text:"Triggers: incoming Beep, room join/leave, or friend online. Variables: {name}, {member}, {message}, {room}, {me}, {event}."}),this.#Nr,Md),Rd=s("div",{className:"kl-reaction-safety"},w("lock","kl-reaction-safety-icon"),s("span",{},"Local notices stay private. Public room emotes never expose {message} and keep the 10-second send guard.")),Ld=s("details",{className:"kl-settings-disclosure kl-reaction-advanced"},s("summary",{},s("span",{text:"Advanced"}),this.#Js),s("div",{className:"kl-reaction-advanced-content"},Cd,Rd,Sd)),Ed=this.#Kr("reactions","Notifications","Turn on only the alerts you want. Everything else stays out of the way.",de,mn,kd,yd,xd,Ad,Ld),li=s("img",{className:"kl-about-watermark"});li.src=Fr,li.alt="",li.decoding="async",li.draggable=!1;let di=s("a",{className:"kl-about-link kl-about-link--discord",text:"Join the KikiLink Discord"});di.href="https://discord.gg/6sgGTnptht",di.target="_blank",di.rel="noopener noreferrer nofollow",di.append(w("external","kl-about-link-icon"));let ci=s("a",{className:"kl-about-link",text:"Open source repository"});ci.href="https://github.com/Lilja000/KikiLink",ci.target="_blank",ci.rel="noopener noreferrer nofollow",ci.append(w("external","kl-about-link-icon"));let Pd=s("section",{className:"kl-about-card"},li,s("div",{className:"kl-about-brand"},this.#ga("kl-about-emblem"),s("div",{},s("div",{className:"kl-about-name",text:"KikiLink"}),s("div",{className:"kl-about-tagline",text:"Personal Link Deck for Bondage Club"}))),s("div",{className:"kl-about-creator"},s("span",{className:"kl-about-label",text:"CREATED BY"}),s("strong",{text:"Kiki"})),s("dl",{className:"kl-about-facts"},Hr("Version",this.version),Hr("Release channel","Stable"),Hr("License","MIT"),Hr("Data","Account-scoped; see Privacy")),s("div",{className:"kl-about-links"},di,ci),s("p",{className:"kl-about-note",text:"KikiLink is an independent quality-of-life addon. Account scoping prevents accidental mix-ups; co-installed page addons share the same browser trust boundary."})),Id=this.#Kr("about","About KikiLink","Version, creator, community, and project information.",Pd),Td=s("div",{className:"kl-settings-panels"},z,j,pn,oi,O,Ed,Id);this.#Ws.addEventListener("click",()=>this.#yu());let _d=s("button",{className:"kl-text-button",type:"button",text:"Discard",onClick:()=>this.#ku()}),Od=s("footer",{className:"kl-settings-actions"},s("span",{className:"kl-settings-local-note",text:"Saved to this BC account."}),_d,this.#Ws);this.#ii.append(e,s("div",{className:"kl-settings-layout"},this.#Gt,Td),Od),this.#bl()}#Kr(e,t,i,...n){let o=`kikilink-settings-tab-${e}`,a=`kikilink-settings-panel-${e}`,l={appearance:{icon:"appearance",label:"Appearance"},navigation:{icon:"navigation",label:"Navigation"},chat:{icon:"chat",label:"Chat"},players:{icon:"users",label:"Players"},activities:{icon:"activities",label:"Activities"},reactions:{icon:"reactions",label:"Alerts"},about:{icon:"profile",label:"About"}},d=s("button",{className:"kl-settings-tab",type:"button"},w(l[e].icon,"kl-settings-tab-icon"),s("span",{text:l[e].label}));d.id=o,d.dataset.section=e,d.setAttribute("role","tab"),d.setAttribute("aria-controls",a),d.setAttribute("aria-selected","false"),d.tabIndex=-1,d.addEventListener("click",()=>this.#Fs(e,!0)),d.addEventListener("keydown",u=>this.#Sd(u)),this.#Gt.setAttribute("role","tablist"),this.#Gt.setAttribute("aria-label","Settings categories"),this.#Gt.append(d);let c=s("section",{className:"kl-settings-panel"},s("h2",{className:"kl-settings-panel-title",text:t}),s("p",{className:"kl-settings-panel-description",text:i}),s("div",{className:"kl-settings-panel-body"},...n));return c.id=a,c.setAttribute("role","tabpanel"),c.setAttribute("aria-labelledby",o),c.hidden=!0,this.#yr.set(e,c),c}#Sd(e){if(!["ArrowDown","ArrowUp","ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;let t=[...this.#Gt.querySelectorAll(".kl-settings-tab")],i=t.indexOf(e.currentTarget);if(i<0)return;e.preventDefault();let n=e.key==="Home"?0:e.key==="End"?t.length-1:(i+(e.key==="ArrowDown"||e.key==="ArrowRight"?1:-1)+t.length)%t.length;t[n]?.focus();let o=t[n]?.dataset.section;o&&this.#Fs(o,!0)}#bl(){this.#Gt.setAttribute("aria-orientation",window.matchMedia?.("(max-width: 720px)").matches?"horizontal":"vertical")}#Rd(){let e=s("div",{className:"kl-dialog-title",text:"New Beep chat"});e.id="kikilink-new-chat-title",this.#ze.setAttribute("aria-labelledby",e.id);let t=s("button",{className:"kl-icon-button",type:"button",title:"Close",ariaLabel:"Close new chat",onClick:()=>this.#ze.close()});t.append(w("close"));let i=s("header",{className:"kl-dialog-header"},e,t);this.#ri.type="search",this.#ri.placeholder="Search name or enter member number",this.#ri.autocomplete="off",this.#ri.addEventListener("input",()=>this.#Ao()),this.#ri.addEventListener("keydown",l=>{l.key==="Enter"&&(l.preventDefault(),this.#ad())}),this.#$n.replaceChildren(A("all","All contacts"),A("online","Online only"),A("room","In this room")),this.#$n.value="all",this.#$n.addEventListener("change",()=>this.#Ao()),this.#Kn.replaceChildren(A("online","Online first"),A("alphabetical","A\u2013Z")),this.#Kn.value="online",this.#Kn.addEventListener("change",()=>this.#Ao());let n=s("div",{className:"kl-dialog-body kl-new-chat-body"},this.#ri,s("div",{className:"kl-contact-toolbar"},s("div",{className:"kl-contact-heading",text:"Known contacts"}),s("div",{className:"kl-contact-controls"},this.#$n,this.#Kn)),this.#Ro),o=s("button",{className:"kl-text-button kl-text-button--primary",type:"button",text:"Open chat",onClick:()=>{this.#ad()}}),a=s("button",{className:"kl-text-button",type:"button",text:"Cancel",onClick:()=>this.#ze.close()});this.#ze.append(i,n,s("footer",{className:"kl-dialog-actions"},a,o))}#Ld(){let e=s("div",{className:"kl-dialog-title",text:"Find anything"});e.id="kikilink-finder-title",this.#dt.setAttribute("aria-labelledby",e.id);let t=s("button",{className:"kl-icon-button",type:"button",title:"Close",ariaLabel:"Close LinkFinder",onClick:()=>this.#dt.close()});t.append(w("close"));let i=s("header",{className:"kl-dialog-header"},s("div",{className:"kl-dialog-heading"},e,s("div",{className:"kl-dialog-subtitle",text:"Jump to a chat, player, activity, or setting."})),t);this.#Bt.id="kikilink-finder-results",this.#Bt.setAttribute("role","listbox"),this.#Bt.setAttribute("aria-label","KikiLink search results"),this.#we.type="search",this.#we.placeholder="Search chats, players, activities, settings\u2026",this.#we.autocomplete="off",this.#we.spellcheck=!1,this.#we.setAttribute("role","combobox"),this.#we.setAttribute("aria-label","Find anything in KikiLink"),this.#we.setAttribute("aria-autocomplete","list"),this.#we.setAttribute("aria-controls",this.#Bt.id),this.#we.setAttribute("aria-expanded","false"),this.#we.addEventListener("input",()=>this.#Ll()),this.#we.addEventListener("keydown",l=>{if(l.key==="ArrowDown"||l.key==="ArrowUp"){l.preventDefault(),this.#qd(l.key==="ArrowDown"?1:-1);return}l.key==="Enter"&&this.#ar.length>0&&(l.preventDefault(),this.#El(this.#Yn))}),this.#nn.setAttribute("role","status"),this.#nn.setAttribute("aria-live","polite"),this.#dt.addEventListener("close",()=>{this.#Io+=1,this.#we.setAttribute("aria-expanded","false"),this.#we.removeAttribute("aria-activedescendant")});let n=w("search","kl-finder-search-icon");n.setAttribute("aria-hidden","true");let o=s("div",{className:"kl-finder-body"},s("div",{className:"kl-finder-input-wrap"},n,this.#we),this.#nn,this.#Bt),a=s("footer",{className:"kl-finder-footer"},s("span",{text:"Results stay in this browser"}),s("span",{className:"kl-finder-keys"},s("kbd",{text:"\u2191\u2193"})," navigate ",s("kbd",{text:"Enter"})," open ",s("kbd",{text:"Esc"})," close"));this.#dt.append(i,o,a)}#Ed(){let e=s("div",{className:"kl-dialog-title",text:"Your KikiLink profile"});e.id="kikilink-presence-title",this.#je.setAttribute("aria-labelledby",e.id);let t=s("button",{className:"kl-icon-button",type:"button",title:"Close",ariaLabel:"Close status menu",onClick:()=>this.#kl()});t.append(w("close"));let i=s("header",{className:"kl-dialog-header"},s("div",{className:"kl-dialog-heading"},e,s("div",{className:"kl-dialog-subtitle",text:"Avatar, status, quiet DND, and a bounded auto-reply in one place."})),t);this.#Cr.type="checkbox",this.#Cr.setAttribute("aria-label","Share KikiLink presence"),this.#Cr.addEventListener("change",()=>this.#pi());let n=s("label",{className:"kl-switch"},this.#Cr,s("span",{className:"kl-switch-track"}));for(let l of["online","idle","dnd","offline"]){let d=s("button",{className:"kl-presence-option",type:"button"},ge(l),s("span",{className:"kl-presence-option-copy"},s("span",{className:"kl-presence-option-title",text:Ie(l)}),s("span",{className:"kl-presence-option-help",text:Gm(l)})),s("span",{className:"kl-presence-option-check",text:"\u2713"}));d.dataset.status=l,d.addEventListener("click",()=>{this.presence.setOwnStatus(l),this.#Zo(),this.#pi()}),this.#Lo.append(d)}this.#er.type="text",this.#er.maxLength=80,this.#er.placeholder="Optional: roleplaying, busy, open to chat\u2026",this.#er.autocomplete="off",this.#Ci.maxLength=160,this.#Ci.rows=3,this.#Ci.placeholder="A little about you\u2026",this.#Ci.autocomplete="off",this.#Ci.setAttribute("aria-label","Public KikiLink profile bio"),this.#Mi.type="number",this.#Mi.min="0",this.#Mi.max="120",this.#Mi.step="1",this.#Mi.setAttribute("aria-label","Minutes before automatic Idle"),this.#ct.type="url",this.#ct.maxLength=500,this.#ct.placeholder="https://i.imgur.com/avatar.png",this.#ct.autocomplete="off",this.#ct.spellcheck=!1,this.#ct.setAttribute("aria-label","Direct profile avatar URL"),this.#ct.addEventListener("input",()=>this.#qs()),this.#Mr.replaceChildren(A("none","None"),A("blossom","Sakura blossoms"),A("rose","Scarlet rose ring"),A("starlight","Violet starlight"),A("laurel","Golden laurel"),A("thorn","Poison thorns"),A("moon","Silver moon orbit"),A("ribbon","Jade ribbons")),this.#Mr.addEventListener("change",()=>this.#qs()),this.#Eo.replaceChildren(A("classic","Classic"),A("garden","Garden"),A("midnight","Midnight")),this.#ni.type="checkbox",this.#ni.setAttribute("aria-label","Use a two-color profile gradient"),this.#Si.type="color",this.#Si.setAttribute("aria-label","First profile gradient color"),this.#tr.type="color",this.#tr.setAttribute("aria-label","Second profile gradient color"),this.#ni.addEventListener("change",()=>{this.#pi(),this.#Xr()}),this.#Si.addEventListener("input",()=>this.#Xr()),this.#tr.addEventListener("input",()=>this.#Xr()),this.#Ve.type="url",this.#Ve.maxLength=500,this.#Ve.placeholder="https://files.catbox.moe/banner.webp",this.#Ve.autocomplete="off",this.#Ve.spellcheck=!1,this.#Ve.setAttribute("aria-label","Direct profile banner URL"),this.#qe.setAttribute("role","status"),this.#qe.setAttribute("aria-live","polite"),this.#Ve.addEventListener("input",()=>this.#Xr()),this.#ir.type="file",this.#ir.accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",this.#ir.hidden=!0,this.#Vn.addEventListener("click",()=>{if(this.#Xe){this.#Cn(),this.#pi();return}this.#ir.click()}),this.#ir.addEventListener("change",()=>{let l=this.#ir.files?.[0];this.#ir.value="",l&&this.#Od(l)}),this.#Aa.addEventListener("click",()=>{this.#Xe||(this.#Ve.value="",this.#qe.textContent="Banner removed from this profile draft.",this.#qe.dataset.tone="warning",this.#Xr())}),this.#Ri.type="checkbox",this.#Ri.setAttribute("aria-label","Use a custom profile outline color"),this.#Ri.addEventListener("change",()=>this.#pi()),this.#rr.type="color",this.#rr.value="#d71932",this.#rr.setAttribute("aria-label","Profile outline color"),this.#Li.type="checkbox",this.#Li.setAttribute("aria-label","Send an automatic reply while Idle or DND"),this.#Li.addEventListener("change",()=>this.#pi());let o=s("label",{className:"kl-switch"},this.#Li,s("span",{className:"kl-switch-track"}));this.#nr.maxLength=500,this.#nr.placeholder="Hi, I'm AFK. Message me later!",this.#Ca.append(s("span",{className:"kl-custom-field-label",text:"AFK message"}),this.#nr,s("span",{className:"kl-custom-field-help",text:"Sent privately at most once per person during each Idle or DND session; your room is never included."}));let a=s("div",{className:"kl-dialog-body kl-presence-body"},this.#K("Share presence","Answer compatible KikiLink status requests and announce inside your current room.",n),this.#Lo,s("label",{className:"kl-presence-field"},s("span",{className:"kl-presence-field-label",text:"Status note"}),this.#er),s("label",{className:"kl-presence-field"},s("span",{className:"kl-presence-field-label",text:"Bio"}),this.#Ci,s("span",{className:"kl-custom-field-help",text:"Up to 160 characters. Shared only when another compatible user opens your KikiProfile."})),s("section",{className:"kl-profile-avatar-field"},this.#wa,s("label",{className:"kl-presence-field"},s("span",{className:"kl-presence-field-label",text:"Profile avatar"}),this.#ct,s("span",{className:"kl-custom-field-help",text:"Use a direct HTTPS JPG, PNG, GIF, or WebP link from a trusted host. Other players' avatars follow your image-preview privacy setting."}))),s("div",{className:"kl-profile-style-fields"},s("label",{className:"kl-presence-field"},s("span",{className:"kl-presence-field-label",text:"Avatar decoration"}),this.#Mr),s("label",{className:"kl-presence-field"},s("span",{className:"kl-presence-field-label",text:"Profile card"}),this.#Eo)),s("section",{className:"kl-profile-gradient-field"},this.#K("Two-color profile gradient","Blend two safe HEX colors across your profile card, similar to Discord profile themes.",s("label",{className:"kl-switch"},this.#ni,s("span",{className:"kl-switch-track"}))),s("div",{className:"kl-profile-gradient-controls"},s("label",{},this.#Si,s("span",{text:"First color"})),s("label",{},this.#tr,s("span",{text:"Second color"})))),s("section",{className:"kl-profile-banner-field"},s("div",{className:"kl-presence-field-label",text:"Profile banner"}),this.#Sr,s("label",{className:"kl-presence-field"},s("span",{className:"kl-sr-only",text:"Direct profile banner URL"}),this.#Ve),s("div",{className:"kl-profile-banner-actions"},this.#Vn,this.#Aa,this.#ir),s("span",{className:"kl-custom-field-help",text:"Recommended: 1200 \xD7 400 px (3:1). Keep faces and text near the center because narrow cards crop the sides."}),s("span",{className:"kl-custom-field-help",text:pe()?"Upload converts the file to a metadata-free WebP and stores it on public, long-lived Catbox. Removing it here does not delete the old public file.":"FUSAM cannot upload to Catbox safely. Paste a direct HTTPS banner link instead."}),this.#qe),s("div",{className:"kl-profile-outline-field"},this.#K("Custom profile outline","Draw the whole profile card in any chosen color. Only a safe six-digit HEX color is shared.",s("label",{className:"kl-switch"},this.#Ri,s("span",{className:"kl-switch-track"}))),s("div",{className:"kl-profile-outline-controls"},this.#rr,s("span",{text:"Outline color"}))),this.#K("Automatic Idle","Minutes without a tap or keypress. Enter 0 to disable; maximum 120.",s("label",{},this.#Mi," min")),this.#K("Reply while Idle / DND","Privately answer new Beeps while you are Idle or in Do not disturb.",o),this.#Ca,s("div",{className:"kl-presence-caveat"},w("lock"),"Appear Offline changes KikiLink only. Bondage Club can still show your native online state."));this.#Na.addEventListener("click",()=>this.#_d()),this.#je.append(i,a,s("footer",{className:"kl-dialog-actions"},s("button",{className:"kl-text-button",type:"button",text:"Close",onClick:()=>this.#kl()}),this.#Na)),this.#je.addEventListener("cancel",()=>{this.#Xe&&this.#Cn()}),this.#je.addEventListener("close",()=>{this.#Cn(),this.#Di+=1,this.#Xe=!1,this.#qe.textContent="",this.#qe.dataset.tone="",this.#hi(this.#Sr),this.#pi()})}#Pd(){let e=s("div",{className:"kl-dialog-title",text:"KikiLink profile"});e.id="kikilink-addon-profile-title",this.#se.setAttribute("aria-labelledby",e.id);let t=()=>this.#se.close();this.#se.append(s("header",{className:"kl-dialog-header kl-addon-profile-dialog-header"},s("div",{className:"kl-dialog-heading"},e,s("div",{className:"kl-dialog-subtitle",text:"Voluntary addon profile plus facts visible to your Bondage Club account."})),this.#Qo("Close KikiLink profile",t)),this.#ln),this.#se.addEventListener("close",()=>{let i=this.#ja,n=this.#Va;this.#hi(this.#ln),this.#ln.replaceChildren(),this.#At=void 0,this.#ro+=1,this.#ur+=1,this.#no="",this.#ja=void 0,this.#Va=void 0,this.#P&&this.#Id(i,n)?.focus()})}#Id(e,t){if(Ct(e))return e;if(t!==void 0){let n=CSS.escape(String(t)),o=Bm(e);if(o){let d=this.#t.querySelector(`.kl-profile-menu-target.${o}[data-group-member-number="${n}"]`)??void 0;if(Ct(d))return d}let a=[...this.#t.querySelectorAll(`.kl-profile-menu-target[data-group-member-number="${n}"], .kl-profile-menu-target[data-member-number="${n}"], [data-member-number="${n}"] .kl-profile-menu-target`)].find(Ct);if(a)return a;if(this.#k===t&&Ct(this.#j))return this.#j}let i=this.#J?.newGroupDialog;return i?.open?[...i.querySelectorAll("input, button, [tabindex]")].find(Ct):Ct(this.#i)?this.#i:void 0}async#zr(e,t,i){if(!Number.isSafeInteger(e)||e<=0||!this.#P||this.#o.hidden)return;let n=++this.#ur;this.#ro+=1;let o=this.#t.activeElement;if(this.#ja=i?.isConnected===!0?i:o instanceof HTMLElement?o:void 0,this.#Va=e,this.#At=void 0,this.#no="",this.#ln.replaceChildren(s("div",{className:"kl-addon-profile-loading",text:"Checking KikiLink profile\u2026"})),!this.#se.open)try{this.#se.showModal()}catch{if(!this.#se.isConnected)return;this.#se.setAttribute("open","")}let a=!1;try{a=e===this.adapter.getOwnMemberNumber()}catch{}if(!a)try{this.presence.request(e,!0,!0)}catch{}let l=!1;try{l=!a&&this.presence.hasCachedProfile(e)}catch{}if(l){this.#At={memberNumber:e,displayName:t},await this.#Nn(),n===this.#ur&&this.#P&&!this.#o.hidden&&this.#se.open&&this.#At?.memberNumber===e&&this.#se.querySelector(".kl-addon-profile-action--primary")?.focus();return}let d=a;try{d||=this.presence.hasCompatiblePeer(e)}catch{}if(d||(d=await this.#Td(e,n)),!(n!==this.#ur||!this.#P||this.#o.hidden||!this.#se.open)){if(!d){this.#ln.replaceChildren(s("div",{className:"kl-addon-profile-loading kl-addon-profile-unavailable",text:"No saved KikiLink profile is available yet. The player may be offline or unreachable. Profiles refresh only when someone is in your room or is a reachable online Bondage Club friend."}));return}this.#At={memberNumber:e,displayName:t},await this.#Nn(),!(n!==this.#ur||!this.#P||this.#o.hidden||!this.#se.open||this.#At?.memberNumber!==e)&&this.#se.querySelector(".kl-addon-profile-action--primary")?.focus()}}#Td(e,t){return new Promise(i=>{let n=!1,o,a=c=>{n||(n=!0,o!==void 0&&clearTimeout(o),d(),i(c))},l=()=>{if(t!==this.#ur||!this.#P||this.#o.hidden)return!1;try{return this.presence.hasCompatiblePeer(e)}catch{return!1}},d=this.presence.subscribe(c=>{c!==void 0&&c!==e||l()&&a(!0)});if(l()){a(!0);return}o=setTimeout(()=>a(l()),1600)})}async#Nn(){let e=this.#At;if(!e)return;let t=++this.#ro,i;try{i=await this.service.getConversation(e.memberNumber)}catch{t===this.#ro&&this.#P&&this.#At?.memberNumber===e.memberNumber&&(this.#se.open&&this.#se.close(),this.#n("This KikiLink profile could not be read right now.","error"));return}if(t!==this.#ro||this.#At?.memberNumber!==e.memberNumber)return;let n=`Member ${e.memberNumber}`;try{n=this.adapter.getMemberName(e.memberNumber)}catch{}let o=i?.peerName||e.displayName||n,a=i?oe(i):o,l=this.presence.get(e.memberNumber);this.#no=$l(l);let d=this.roster.get(e.memberNumber,o),c=[],u=!1,p=!1,h="";try{c=typeof this.adapter.getPlayerRelationships=="function"?this.adapter.getPlayerRelationships(e.memberNumber):[]}catch{}try{u=typeof this.adapter.isMemberInCurrentRoom=="function"?this.adapter.isMemberInCurrentRoom(e.memberNumber):!1,u&&typeof this.adapter.getCurrentRoomName=="function"&&(h=this.adapter.getCurrentRoomName()??"")}catch{}try{p=typeof this.adapter.isKnownFriend=="function"?this.adapter.isKnownFriend(e.memberNumber):!1}catch{}let m=l.profileStyle??"classic",f=l.avatarFrame??"none",y=s("div",{className:"kl-avatar kl-addon-profile-avatar"});y.dataset.avatarFrame=f,this.#Nt(y,a,e.memberNumber);let g=s("div",{className:"kl-addon-profile-avatar-shell"},y,ge(l.status));g.dataset.frame=f;let x=s("div",{className:"kl-addon-profile-badges"});if(x.append(s("span",{className:"kl-addon-profile-badge",text:"KIKILINK"})),l.profileFromCache){let ie=l.source==="kikilink";x.append(s("span",{className:"kl-addon-profile-badge kl-addon-profile-badge--saved",text:ie?"SAVED DETAILS":"SAVED PROFILE",title:ie?"Live KikiLink status with last-saved optional profile details":"Last profile voluntarily shared with this Bondage Club account"}))}p&&x.append(s("span",{className:"kl-addon-profile-badge",text:"FRIEND"}));for(let ie of c)x.append(s("span",{className:`kl-addon-profile-badge kl-addon-profile-badge--${ie}`,text:So(ie).toUpperCase(),title:Ro(ie)}));let b=this.settings.get().linkPresence.profileImagePreviews,N=!!(l.avatarUrl&&this.#Oi.has(Kr(e.memberNumber,l.avatarUrl))),k=!!l.avatarUrl&&(b==="never"||b==="ask"&&!N),C=k&&b==="ask"?s("button",{className:"kl-text-button kl-addon-profile-show-avatar",type:"button",text:"Show profile avatar",onClick:()=>{l.avatarUrl&&this.#md(e.memberNumber,l.avatarUrl),this.#ea(e.memberNumber),this.#Nn()}}):k&&b==="never"?s("span",{className:"kl-addon-profile-avatar-note",text:"Avatar hidden by Links only privacy setting"}):null,I=!!(l.bannerUrl&&this.#cr.has(Eo(e.memberNumber,l.bannerUrl))),G=!!l.bannerUrl&&(b==="never"||b==="ask"&&!I),T=G&&b==="ask"?s("button",{className:"kl-text-button kl-addon-profile-show-banner",type:"button",text:"Show profile banner",onClick:()=>{l.bannerUrl&&this.#Uu(e.memberNumber,l.bannerUrl),this.#Nn()}}):G&&b==="never"?s("span",{className:"kl-addon-profile-banner-note",text:"Banner hidden by Links only privacy setting"}):null,D=s("div",{className:"kl-addon-profile-status",title:Ii(l)},ge(l.status),s("strong",{text:Ie(l.status)}),l.statusMessage?s("span",{className:"kl-addon-profile-custom-status",text:l.statusMessage}):null);D.dataset.presenceDescription="true";let _=s("div",{className:"kl-addon-profile-banner"}),M=s("section",{className:"kl-addon-profile-hero"},_,g,s("div",{className:"kl-addon-profile-identity"},s("h2",{text:a,title:a}),i?.localAlias?s("p",{className:"kl-addon-profile-native-name",text:`Bondage Club name \xB7 ${o}`}):null,s("p",{className:"kl-addon-profile-member",text:`Member #${e.memberNumber}`}),x,D,C,T)),B=s("div",{className:"kl-addon-profile-facts"},this.#ns("Current room",l.roomName||(u?h||"Current room":"Unavailable")),this.#ns("KikiLink",l.profileFromCache&&l.profileSyncedAt?l.source==="kikilink"?`${l.addonVersion?`Live v${l.addonVersion}`:"Live"} \xB7 details saved ${jr(l.profileSyncedAt)}`:`Saved \xB7 ${jr(l.profileSyncedAt)}`:l.addonVersion?`v${l.addonVersion}`:"Detected"),this.#ns("Last seen",u?"Now":d.lastSeenAt?jr(d.lastSeenAt):"Not recorded")),z=l.bio?s("section",{className:"kl-addon-profile-bio"},s("span",{className:"kl-addon-profile-bio-label",text:"BIO"}),s("p",{text:l.bio})):null,Y=s("section",{className:"kl-addon-profile-private"},s("div",{className:"kl-addon-profile-section-title"},w("lock"),s("strong",{text:"Only visible to you"})),s("p",{text:`Private note \xB7 ${d.note||"No private note saved"}`}),s("p",{text:`Private tags \xB7 ${d.tags.length>0?d.tags.join(" \xB7 "):"No private tags saved"}`}),s("p",{text:`Last recorded room \xB7 ${d.lastRoomName||"Not recorded"}`}),s("p",{text:`Encounter count \xB7 ${d.encounterCount?d.encounterCount.toString():"Not recorded"}`})),J=s("button",{className:"kl-text-button kl-text-button--primary kl-addon-profile-action kl-addon-profile-action--primary",type:"button",text:"Message",onClick:()=>{this.#se.close(),this.#In(()=>this.openChat(e.memberNumber,o),"LinkChat could not be opened.")}}),j=s("button",{className:"kl-text-button kl-addon-profile-action",type:"button",text:"Whisper",onClick:()=>{try{this.adapter.startWhisper(e.memberNumber),this.#se.close(),this.close()}catch(ie){this.#n(ie instanceof Error?ie.message:"Unable to start Whisper","error")}}});j.disabled=!u;let Q=s("button",{className:"kl-text-button kl-addon-profile-action",type:"button",text:"Native profile",onClick:()=>{try{this.adapter.openProfile(e.memberNumber),this.#se.close(),this.close()}catch(ie){this.#n(ie instanceof Error?ie.message:"Unable to open profile","error")}}});Q.disabled=!u;let St=s("button",{className:"kl-text-button kl-addon-profile-action",type:"button",text:d.favorite?"Unfavorite":"Favorite",onClick:()=>{this.roster.toggleFavorite(e.memberNumber,o),this.#Nn(),this.#mt()}}),nt=s("button",{className:"kl-text-button kl-addon-profile-action",type:"button",text:"Private note",onClick:()=>{this.#se.close(),this.#vo(e.memberNumber)}}),ce=s("article",{className:"kl-addon-profile-card"},M,z,B,Y,s("div",{className:"kl-addon-profile-actions"},J,j,Q,St,nt));ce.dataset.profileStyle=m,ce.dataset.memberNumber=e.memberNumber.toString();let $e=tt(l.profileOutlineColor??"");$e&&(ce.dataset.customOutline="true",ce.style.setProperty("--kl-profile-outline",$e));let ot=tt(l.profileGradient?.primary??""),at=tt(l.profileGradient?.secondary??"");if(l.profileGradient?.enabled&&ot&&at){let ie=Um(ot,at),Rt=Wl(ie);ce.dataset.customGradient="true",ce.style.setProperty("--kl-profile-gradient-primary",ot),ce.style.setProperty("--kl-profile-gradient-secondary",at),ce.style.setProperty("--kl-profile-gradient-tone",Rt==="#fff8ee"?"#000000":"#ffffff"),ce.style.setProperty("--kl-profile-text",Rt)}this.#ln.replaceChildren(ce),this.#Vs(_,a,e.memberNumber,l.bannerUrl??"")}#ns(e,t){return s("div",{className:"kl-addon-profile-fact"},s("span",{text:e}),s("strong",{text:t}))}#os(){let e=this.settings.get().linkPresence;this.#Cr.checked=e.enabled,this.#er.value=e.statusMessage,this.#Ci.value=e.bio,this.#ct.value=e.avatarUrl,this.#Mr.value=e.avatarFrame,this.#Eo.value=e.profileStyle,this.#ni.checked=e.profileGradient.enabled,this.#Si.value=e.profileGradient.primary,this.#tr.value=e.profileGradient.secondary,this.#Ve.value=e.bannerUrl,this.#Ri.checked=!!e.profileOutlineColor,this.#rr.value=e.profileOutlineColor||this.settings.get().ui.accent,this.#qe.textContent="",this.#qe.dataset.tone="",this.#Mi.value=e.autoIdleMinutes.toString(),this.#Li.checked=e.afkAutoReply.enabled,this.#nr.value=e.afkAutoReply.message,this.#qs(),this.#Xr(),this.#pi(),this.#je.open||this.#je.showModal(),this.#Lo.querySelector('[data-active="true"]')?.focus()}#kl(){this.#Cn(),this.#je.close()}#pi(){let e=this.settings.get().linkPresence.status,t=this.#Cr.checked;for(let n of this.#Lo.querySelectorAll(".kl-presence-option")){let o=n.dataset.status===e;n.dataset.active=String(o),n.setAttribute("aria-pressed",String(o)),n.disabled=!t}this.#er.disabled=!t,this.#Ci.disabled=!t,this.#Ve.disabled=this.#Xe;let i=pe();this.#Vn.textContent=i?this.#Xe?this.#Hr?.signal.aborted?"Cancelling\u2026":"Cancel upload":"Upload banner":"Catbox unavailable in FUSAM",this.#Vn.disabled=!i||this.#Xe&&this.#Hr?.signal.aborted===!0,this.#Vn.title=i?"Prepare and upload a public Catbox banner":"FUSAM cannot access Catbox's non-CORS upload API",this.#Aa.disabled=this.#Xe,this.#Ri.disabled=this.#Xe,this.#rr.disabled=this.#Xe||!this.#Ri.checked,this.#Si.disabled=!this.#ni.checked,this.#tr.disabled=!this.#ni.checked,this.#Na.disabled=this.#Xe,this.#nr.disabled=!this.#Li.checked,this.#Ca.dataset.disabled=String(!this.#Li.checked)}#_d(){if(this.#Xe){this.#n("Wait for the profile banner upload to finish.","error");return}let e=Number(this.#Mi.value),t=this.#ct.value.trim()?V(this.#ct.value):null;if(this.#ct.value.trim()&&(!t||t.length>500)){this.#ct.focus(),this.#n("Use a direct HTTPS avatar link up to 500 characters ending in an image extension.","error");return}let i=t??"",n=this.#Ve.value.trim()?V(this.#Ve.value):null;if(this.#Ve.value.trim()&&(!n||n.length>500)){this.#Ve.focus(),this.#n("Use a direct HTTPS banner link up to 500 characters ending in an image extension.","error");return}let o=n??"",a=this.#Ri.checked?tt(this.#rr.value):"";if(this.#Ri.checked&&!a){this.#rr.focus(),this.#n("Choose a valid six-digit profile outline color.","error");return}let l=tt(this.#Si.value),d=tt(this.#tr.value);if(this.#ni.checked&&(!l||!d)){this.#Si.focus(),this.#n("Choose two valid six-digit profile gradient colors.","error");return}if(!Number.isInteger(e)||e<0||e>120){this.#Mi.focus(),this.#n("Automatic Idle must be between 0 and 120 minutes.","error");return}if(this.#Li.checked&&!this.#nr.value.trim()){this.#nr.focus(),this.#n("Add a short AFK auto-reply message.","error");return}this.presence.setOwnProfile({enabled:this.#Cr.checked,statusMessage:this.#er.value,bio:this.#Ci.value,avatarUrl:i,avatarFrame:this.#Mr.value,profileStyle:this.#Eo.value,bannerUrl:o,profileOutlineColor:a,profileGradient:{enabled:this.#ni.checked,primary:l||this.settings.get().linkPresence.profileGradient.primary,secondary:d||this.settings.get().linkPresence.profileGradient.secondary},autoIdleMinutes:e,afkAutoReply:{enabled:this.#Li.checked,message:this.#nr.value}}),this.#Zo(),this.#je.close(),this.#n("KikiLink profile saved.")}async#Od(e){if(!pe()){this.#n("Catbox uploads are unavailable in FUSAM. Paste a direct HTTPS link instead.","error");return}if(this.#Xe||!this.#je.open)return;let t=++this.#Di,i=new AbortController,n;this.#Hr=i,this.#Xe=!0,this.#Ja=Date.now(),this.#Ko=void 0,this.#qe.textContent="Preparing locally and removing image metadata\u2026",this.#qe.dataset.tone="",this.#pi();try{let o=await Ks(e);if(o.blob.size>to)throw new Error("The prepared profile banner is larger than 2 MB");if(t!==this.#Di||!this.#je.open)return;this.#qe.textContent="Uploading to public Catbox storage\u2026",this.#Ja=Date.now(),n=setInterval(()=>{t!==this.#Di||i.signal.aborted||this.#yl()},1e3),this.#vn=n;let a=await this.catboxImageUpload(o,d=>{t!==this.#Di||i.signal.aborted||(d.percent!==void 0&&(this.#Ko=d.percent),this.#yl())},i.signal);if(t!==this.#Di||!this.#P||!this.#je.open)return;let l=V(a);if(!l||l.length>500)throw new Error("Catbox returned an invalid profile banner link");this.#Ve.value=l,this.#qe.textContent="Banner uploaded. Save profile to share it.",this.#qe.dataset.tone="success",this.#Xr()}catch(o){if(t!==this.#Di||!this.#je.open)return;let a=o instanceof Error?o.message:"Profile banner upload failed",l=a==="The upload was cancelled";this.#qe.textContent=l?"Banner upload cancelled. Your profile was not changed.":a,this.#qe.dataset.tone=l?"warning":"error",l||this.#n(a,"error")}finally{n!==void 0&&clearInterval(n),this.#vn===n&&(this.#vn=void 0),this.#Hr===i&&(this.#Hr=void 0),t===this.#Di&&(this.#Xe=!1,this.#pi())}}#yl(){if(!this.#Xe||this.#Hr?.signal.aborted)return;let e=Math.max(0,Math.floor((Date.now()-this.#Ja)/1e3));this.#qe.textContent=this.#Ko===void 0?`Uploading to public Catbox storage\u2026 ${e}s`:`Uploading to public Catbox storage\u2026 ${this.#Ko}% \xB7 ${e}s`}#Cn(){this.#Hr?.abort(),this.#vn!==void 0&&(clearInterval(this.#vn),this.#vn=void 0)}#Dd(){this.#qn.textContent="Send an image",this.#qn.id="kikilink-image-title",this.#We.setAttribute("aria-labelledby",this.#qn.id);let e=s("header",{className:"kl-dialog-header"},s("div",{className:"kl-dialog-heading"},this.#qn,this.#rl),this.#Qo("Close image sender",()=>this.#Al()));this.#ut.type="url",this.#ut.maxLength=900,this.#ut.placeholder="https://example.com/image.webp",this.#ut.autocomplete="off",this.#ut.spellcheck=!1,this.#ut.addEventListener("input",()=>this.#Mn()),this.#ut.addEventListener("keydown",a=>{a.key==="Enter"&&(a.preventDefault(),this.#Nl())}),this.#Ut.id="kikilink-image-source-link",this.#Ut.setAttribute("role","tab"),this.#Ut.setAttribute("aria-controls","kikilink-image-link-panel"),this.#Ut.addEventListener("click",()=>this.#mo("link")),this.#Ut.addEventListener("keydown",a=>this.#xl(a)),this.#Ft.id="kikilink-image-source-file",this.#Ft.setAttribute("role","tab"),this.#Ft.setAttribute("aria-controls","kikilink-image-file-panel"),this.#Ft.addEventListener("click",()=>this.#mo("file")),this.#Ft.addEventListener("keydown",a=>this.#xl(a)),this.#on.id="kikilink-image-link-panel",this.#on.setAttribute("role","tabpanel"),this.#on.setAttribute("aria-labelledby",this.#Ut.id),this.#on.append(s("label",{className:"kl-presence-field"},s("span",{className:"kl-presence-field-label",text:"Direct HTTPS image link"}),this.#ut),this.#Rr,s("p",{className:"kl-image-upload-note",text:"Supported links: JPG, PNG, GIF, and WebP."})),this.#Lr.id="kikilink-image-file-panel",this.#Lr.setAttribute("role","tabpanel"),this.#Lr.setAttribute("aria-labelledby",this.#Ft.id),this.#Ei.type="file",this.#Ei.accept="image/jpeg,image/png,image/webp",this.#Ei.hidden=!0,this.#Ei.addEventListener("change",()=>{let a=this.#Ei.files?.[0];a&&this.#$d(a)}),this.#an.addEventListener("click",()=>this.#Ei.click()),this.#Er.replaceChildren(A("1h","1 hour"),A("12h","12 hours"),A("24h","24 hours"),A("72h","72 hours")),this.#Er.value=this.settings.get().linkChat.imageUploads.retention,this.#Er.addEventListener("change",()=>this.#Wt()),this.#Ma.append(s("span",{text:"Litterbox lifetime"}),this.#Er);let t=[["device","lock","This device","Private \xB7 stays until you delete it"],["catbox","star","Catbox","Public link \xB7 no automatic expiry"],["litterbox","status","Litterbox","Public link \xB7 expires automatically"]].map(([a,l,d,c])=>{let u=s("input"),p=a==="catbox"&&!pe();u.type="radio",u.name="kikilink-gallery-storage",u.value=a,u.checked=a==="device",u.disabled=p,u.addEventListener("change",()=>{u.checked&&this.#vl(a)});let h=s("label",{className:"kl-gallery-storage-choice"},u,s("span",{className:"kl-gallery-storage-icon"},w(l)),s("span",{className:"kl-gallery-storage-copy"},s("strong",{text:d}),s("small",{text:p?"Unavailable in FUSAM \xB7 use a direct link":c})));return h.dataset.storage=a,h});this.#sn.append(s("legend",{text:"Store this Gallery image"}),...t,this.#Ma),this.#sn.hidden=!0,this.#Sa.append(w("lock"));let i=s("button",{className:"kl-text-button kl-image-upload-setup",type:"button",text:"Set up local uploads",onClick:()=>{this.#We.close(),this.#fi("chat"),this.#zi.focus()}});this.#Lr.append(this.#yt,s("div",{className:"kl-image-file-actions"},this.#an,i,this.#Ei),this.#sn,s("p",{className:"kl-image-upload-note kl-image-file-privacy"},this.#Sa,this.#nl));let n=s("div",{className:"kl-image-source-tabs"},this.#Ut,this.#Ft);n.setAttribute("role","tablist"),n.setAttribute("aria-label","Image source");let o=s("div",{className:"kl-dialog-body kl-image-body"},n,this.#on,this.#Lr);this.#Pr.addEventListener("click",()=>{this.#Nl()}),this.#We.addEventListener("cancel",a=>{this.#de&&a.preventDefault()}),this.#We.addEventListener("close",()=>{this.#de||this.#Sn()}),this.#We.append(e,o,s("footer",{className:"kl-dialog-actions"},s("button",{className:"kl-text-button",type:"button",text:"Cancel",onClick:()=>this.#Al()}),this.#Pr))}#Gd(){let e=s("div",{className:"kl-dialog-title",text:"Local nickname"});e.id="kikilink-alias-title",this.#pt.setAttribute("aria-labelledby",e.id),this.#Lt.type="text",this.#Lt.maxLength=40,this.#Lt.autocomplete="off",this.#Lt.spellcheck=!1,this.#Lt.addEventListener("keydown",t=>{t.key!=="Enter"||t.isComposing||(t.preventDefault(),this.#as(this.#Lt.value))}),this.#ol.addEventListener("click",()=>{this.#as(this.#Lt.value)}),this.#Ra.addEventListener("click",()=>{this.#as("")}),this.#pt.addEventListener("close",()=>{this.#qa=void 0}),this.#pt.append(s("header",{className:"kl-dialog-header"},s("div",{className:"kl-dialog-heading"},e,s("div",{className:"kl-dialog-subtitle",text:"A private label for this KikiLink chat. It is never sent to anyone."})),this.#Qo("Close local nickname",()=>this.#pt.close())),s("div",{className:"kl-dialog-body kl-alias-body"},s("label",{className:"kl-presence-field"},s("span",{className:"kl-presence-field-label",text:"Nickname you will see"}),this.#Lt),s("p",{className:"kl-local-only-note"},w("lock"),s("span",{text:"Bondage Club names, outgoing messages, and the other player's addon stay unchanged."}))),s("footer",{className:"kl-dialog-actions kl-alias-actions"},this.#Ra,s("span",{className:"kl-dialog-actions-spacer"}),s("button",{className:"kl-text-button",type:"button",text:"Cancel",onClick:()=>this.#pt.close()}),this.#ol))}#Bd(){let e=s("div",{className:"kl-dialog-title",text:"Remove recent chat?"});e.id="kikilink-remove-chat-title",this.#xt.setAttribute("aria-labelledby",e.id),this.#xt.addEventListener("close",()=>{this.#Wa=void 0}),this.#La.addEventListener("click",()=>{this.#Hd()}),this.#xt.append(s("header",{className:"kl-dialog-header"},s("div",{className:"kl-dialog-heading"},e),this.#Qo("Close remove chat confirmation",()=>this.#xt.close())),s("div",{className:"kl-dialog-body kl-remove-chat-body"},s("div",{className:"kl-remove-chat-icon"},w("trash")),s("p",{},"Remove ",this.#al," from KikiLink recent chats and delete this chat's account-scoped KikiLink history?"),s("p",{className:"kl-remove-chat-safe",text:"This does not unfriend them and does not change Bondage Club's native Beep log."})),s("footer",{className:"kl-dialog-actions"},s("button",{className:"kl-text-button",type:"button",text:"Keep chat",onClick:()=>this.#xt.close()}),this.#La))}#Ud(e){this.#qa={memberNumber:e.peerNumber,nativeName:e.peerName},this.#Lt.value=e.localAlias??"",this.#Lt.placeholder=e.peerName,this.#Ra.hidden=!e.localAlias,this.#pt.open||this.#pt.showModal(),this.#Lt.focus(),this.#Lt.select()}async#as(e){let t=this.#qa;if(!t)return;let i=await this.service.setLocalAlias(t.memberNumber,e),n=await this.service.getConversation(t.memberNumber);if(!n){this.#pt.close();return}if(t.memberNumber===this.#k){let o=oe(n);this.#$t=o,this.#Pi=n.peerName,this.#Ge.textContent=o,this.#Nt(this.#j,o,t.memberNumber),this.#Ns()}this.#pt.close(),await this.refresh(),this.#n(i?`Local nickname set to ${i}.`:"Using the native nickname again.")}#Fd(e,t){this.#Wa={memberNumber:e,displayName:t},this.#al.textContent=t,this.#xt.open||this.#xt.showModal(),this.#La.focus()}async#Hd(){let e=this.#Wa;e&&(e.memberNumber===this.#k&&this.#Cs(e.memberNumber),await this.service.removeConversation(e.memberNumber),e.memberNumber===this.#k&&this.#ud(),this.#xt.close(),await this.refresh(),this.#n(`${e.displayName} removed from recent chats.`))}#Vo(e="chat",t){if(e==="chat"&&this.#k===void 0){this.#n("Choose a conversation first.","error");return}if(e==="group"){let i=t?this.#tt?.getGroup(t):void 0;if(!i){this.#n("This group chat is no longer available.","error");return}this.#Xa=i.groupId}else this.#Xa=void 0;this.#pr=e,this.#qn.textContent=e==="gallery"?"Add to Gallery":"Send an image",this.#rl.textContent=e==="gallery"?pe()?"Save a direct link, keep a prepared file private, or upload it to Catbox/Litterbox.":"Save a direct link, keep a prepared file private, or use expiring Litterbox storage.":e==="group"?"Share a direct image link with every current group member.":"A normal Beep link for everyone; an inline preview for KikiLink.",this.#sn.hidden=e!=="gallery",this.#vl("device"),this.#Sn(),this.#ut.value="",this.#Mn(),this.#mo("link"),this.#We.open||this.#We.showModal(),this.#ut.focus()}#mo(e){this.#$o=e;let t=e==="link";this.#on.hidden=!t,this.#Lr.hidden=t,this.#Ut.dataset.active=String(t),this.#Ft.dataset.active=String(!t),this.#Ut.setAttribute("aria-selected",String(t)),this.#Ft.setAttribute("aria-selected",String(!t)),this.#Ut.tabIndex=t?0:-1,this.#Ft.tabIndex=t?-1:0,t?this.#Mn():this.#Wt()}#vl(e){e==="catbox"&&!pe()&&(e="device"),this.#Ya=e;for(let t of this.#sn.querySelectorAll("input[type='radio']"))t.checked=t.value===e,t.closest(".kl-gallery-storage-choice").dataset.active=String(t.checked);this.#Ma.hidden=e!=="litterbox",this.#Sa.replaceChildren(w(this.#pr!=="gallery"||e==="device"?"lock":"external")),this.#nl.textContent=this.#pr!=="gallery"?"Nothing uploads on selection. KikiLink removes the filename and metadata first; only Upload & send creates an expiring Litterbox link.":e==="device"?"Nothing uploads. The prepared image stays privately in this browser until you delete it.":e==="catbox"?"Nothing uploads on selection. Saving creates a public Catbox link without an automatic expiry.":"Nothing uploads on selection. Saving creates a public Litterbox link for the lifetime you choose.",this.#$o==="file"&&this.#Wt()}#xl(e){if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;e.preventDefault();let t=e.key==="ArrowLeft"||e.key==="Home"?"link":"file";this.#mo(t),(t==="link"?this.#Ut:this.#Ft).focus()}#Mn(){let e=V(this.#ut.value);if(this.#$o==="link"&&(this.#Pr.textContent=this.#pr==="gallery"?"Save to Gallery":"Send image",this.#Pr.disabled=this.#de||!e),!this.#ut.value.trim()){this.#Rr.replaceChildren(s("span",{className:"kl-image-compose-icon"},w("image")),s("span",{text:"Paste a direct image link to check it."})),this.#Rr.dataset.state="empty";return}if(!e){this.#Rr.replaceChildren(s("span",{className:"kl-image-compose-icon"},w("warning")),s("span",{text:"Use a direct HTTPS link ending in a supported image extension."})),this.#Rr.dataset.state="error";return}let t=new URL(e);this.#Rr.replaceChildren(s("span",{className:"kl-image-compose-icon"},w("check")),s("span",{},s("strong",{text:this.#pr==="gallery"?"Ready to save":"Ready to send"}),s("small",{text:`${t.hostname}${t.pathname}`}))),this.#Rr.dataset.state="ready"}#Wt(){let e=this.settings.get().linkChat.imageUploads,t=e.enabled?Le(e):null,i=this.#pr==="gallery",n=this.#Ya;this.#Lr.querySelector(".kl-image-upload-setup")?.toggleAttribute("hidden",i||t!==null),this.#an.hidden=!i&&t===null,this.#an.disabled=this.#de;for(let d of this.#sn.querySelectorAll("input[type='radio']"))d.disabled=this.#de||d.value==="catbox"&&!pe();if(this.#Er.disabled=this.#de,this.#an.textContent=this.#yn?"Choose another":"Choose image",this.#Pr.textContent=i?n==="device"?"Save on this device":n==="catbox"?"Upload to Catbox":"Upload to Litterbox":"Upload & send",this.#Pr.disabled=this.#de||!i&&t===null||this.#yn===void 0,this.#de){this.#yt.replaceChildren(s("span",{className:"kl-image-compose-icon"},w("image")),s("span",{},s("strong",{text:i?n==="device"?"Saving to this device\u2026":`Uploading to ${n==="catbox"?"Catbox":"Litterbox"}\u2026`:"Uploading prepared image\u2026"}),s("small",{text:i&&n==="device"?"The prepared copy stays inside this browser.":"Only the privacy-prepared WebP is being sent; the original file stays local."}))),this.#yt.dataset.state="loading";return}if(!t&&!i){this.#yt.replaceChildren(s("span",{className:"kl-image-compose-icon"},w("lock")),s("span",{},s("strong",{text:"Temporary upload is off"}),s("small",{text:"Enable Litterbox sharing once in Chat settings."}))),this.#yt.dataset.state="empty";return}if(this.#qt){this.#yt.replaceChildren(s("span",{className:"kl-image-compose-icon"},w("warning")),s("span",{},s("strong",{text:"Image not ready"}),s("small",{text:this.#qt}))),this.#yt.dataset.state="error";return}let a=this.#yn;if(!a){this.#yt.replaceChildren(s("span",{className:"kl-image-compose-icon"},w("image")),s("span",{},s("strong",{text:"Choose a local image"}),s("small",{text:"JPG, PNG, or WebP \xB7 up to 10 MB"}))),this.#yt.dataset.state="empty";return}let l=this.#Ur?s("img",{className:"kl-local-image-thumbnail",ariaLabel:"Prepared image preview"}):s("span",{className:"kl-image-compose-icon"},w("check"));l instanceof HTMLImageElement&&this.#Ur&&(l.src=this.#Ur,l.alt="Prepared local image"),this.#yt.replaceChildren(l,s("span",{},s("strong",{text:i?n==="device"?"Ready for private device storage":n==="catbox"?"Ready for Catbox with no automatic expiry":`Ready for ${ii(this.#Er.value)} Litterbox storage`:"Prepared locally"}),s("small",{text:`${a.width} \xD7 ${a.height} \xB7 ${jl(a.blob.size)} \xB7 metadata removed`}))),this.#yt.dataset.state="ready"}async#$d(e){this.#Sn();let t=this.#ao;this.#an.disabled=!0,this.#Pr.disabled=!0,this.#yt.replaceChildren(s("span",{className:"kl-image-compose-icon"},w("image")),s("span",{},s("strong",{text:"Preparing safely\u2026"}),s("small",{text:"Removing metadata and the original filename locally."}))),this.#yt.dataset.state="loading";try{let i=await this.imageUploader.prepare(e);if(t!==this.#ao)return;this.#yn=i,typeof URL.createObjectURL=="function"&&(this.#Ur=URL.createObjectURL(i.blob))}catch(i){if(t!==this.#ao)return;this.#qt=Vr(i)}finally{t===this.#ao&&(this.#Ei.value="",this.#Wt())}}#Sn(){this.#ao+=1,this.#yn=void 0,this.#qt=void 0,this.#Ei.value="",this.#Ur&&typeof URL.revokeObjectURL=="function"&&URL.revokeObjectURL(this.#Ur),this.#Ur=void 0}#wl(){this.#oo+=1,this.#ot?.abort(),this.#ot=void 0,this.#de=!1}#Al(){if(this.#de){this.#n("Wait for the image upload to finish.","error");return}this.#We.close()}async#Nl(){if(this.#de)return;if(this.#$o==="file"){await this.#Kd();return}let e=V(this.#ut.value);if(!e){this.#Mn();return}let t=this.#Cl();if(!t)return;let i=++this.#oo,n=new AbortController;this.#ot=n,this.#de=!0,this.#Mn();try{if(t.kind==="gallery"){if(!this.#Pl(e))return}else if(!await this.#Ml(e,t))return;if(!this.#Rn(i,n))return;this.#de=!1,this.#ot=void 0,this.#We.close(),this.#n(t.kind==="gallery"?"Image saved to your Gallery.":t.kind==="group"?"Image shared with the group.":"Image link sent.")}finally{this.#ot===n&&(this.#ot=void 0,this.#de=!1,this.#We.open&&this.#Mn())}}#Cl(){if(this.#pr==="gallery")return{kind:"gallery"};if(this.#pr==="group"){let e=this.#Xa;if(!e||!this.#tt?.getGroup(e)){this.#n("This group chat is no longer available.","error");return}return{kind:"group",groupId:e}}if(this.#k===void 0){this.#n("Choose a conversation first.","error");return}return{kind:"chat",peerNumber:this.#k,peerName:this.#Pi,includeRoom:this.#$.checked}}#Rn(e,t){return this.#P&&e===this.#oo&&this.#ot===t&&!t.signal.aborted}async#Kd(){let e=this.#yn,t=this.#Cl();if(!t)return;if(t.kind==="gallery"){if(!e||this.#de){this.#Wt();return}let l=this.#Ya,d=l==="litterbox"?Le({retention:this.#Er.value}):null;if(l==="litterbox"&&!d){this.#qt="Choose a valid temporary image lifetime",this.#Wt();return}this.#de=!0;let c=++this.#oo,u=new AbortController;this.#ot=u,this.#qt=void 0,this.#Wt();try{let p;if(l==="device"?await this.galleryStore.add({blob:e.blob,width:e.width,height:e.height}):l==="catbox"?p=await this.catboxImageUpload(e,void 0,u.signal):p=await this.imageUploader.upload(e,d,u.signal),!this.#Rn(c,u))return;let h=Date.now(),m=d?h+Vl(d.retention):void 0;if(p&&!this.#Pl(p,h,!1,m))throw new Error("The image host returned a link KikiLink could not save");this.#de=!1,this.#ot=void 0,this.#We.close(),this.#Sn(),await this.#Ln(),this.#n(l==="device"?"Image saved permanently on this device. Nothing was uploaded.":l==="catbox"?"Image uploaded to Catbox and saved to Gallery without an automatic expiry.":`Image uploaded to Litterbox and saved for ${ii(d.retention)}.`)}catch(p){if(!this.#Rn(c,u))return;this.#de=!1,this.#qt=Vr(p),this.#Wt(),this.#n(this.#qt,"error")}finally{this.#ot===u&&(this.#ot=void 0,this.#de=!1)}return}let i=this.settings.get().linkChat.imageUploads,n=i.enabled?Le(i):null;if(!e||!n||this.#de){this.#Wt();return}this.#de=!0;let o=++this.#oo,a=new AbortController;this.#ot=a,this.#qt=void 0,this.#Wt();try{let l=await this.imageUploader.upload(e,n,a.signal);if(!this.#Rn(o,a))return;this.#ut.value=l;let d=await this.#Ml(l,t);if(!this.#Rn(o,a))return;if(this.#de=!1,!d){this.#mo("link"),this.#n("Upload finished. The direct link is kept here so it is not lost.","error");return}this.#n(`Private details removed; ${ii(n.retention)} link sent.`),this.#ot=void 0,this.#We.close()}catch(l){if(!this.#Rn(o,a))return;this.#de=!1,this.#qt=Vr(l),this.#Wt(),this.#n(this.#qt,"error")}finally{this.#ot===a&&(this.#ot=void 0,this.#de=!1)}}async#Ml(e,t){if(t.kind==="chat")return this.#Ql(e,!1,t);let i=t.groupId,n=this.#tt;if(!i||!n?.getGroup(i))return this.#n("The group changed while the image was being prepared. The link was not sent.","error"),!1;try{let o=await n.sendMessage(i,e);if(!o.persisted)return this.#n("The image was not handed to any current group member.","error"),!1;let a=o.unreachable?.length??0;return a>0&&this.#n(`Image saved in the group; ${a} member${a===1?" is":"s are"} currently unreachable.`),!0}catch(o){return this.#n(o instanceof Error&&o.message.trim()?o.message:"The image could not be sent to this group.","error"),!1}}#zd(e,t){if(!pe()){this.#n("Catbox uploads are unavailable in FUSAM. Use a direct HTTPS avatar link.","error");return}if(this.#Fr){this.#n("Another group avatar is already uploading.","error");return}let i=this.#tt?.getGroup(e);if(!i||i.protocolVersion!==2||i.creatorNumber!==this.adapter.getOwnMemberNumber()){this.#n("Only the creator of a managed group can change its avatar.","error");return}this.#so={groupId:e,returnFocus:t},this.#Ht.value="",this.#Ht.click()}#go(e){if(this.#Fr&&e)return;let t=this.#so;this.#so=void 0,this.#Ht.value="",e&&t?.returnFocus.isConnected&&t.returnFocus.focus({preventScroll:!0})}#Sl(){this.#lo?.abort(),this.#lo=void 0,this.#go(!1),this.#Fr=!1}async#jd(){let e=this.#so,t=this.#Ht.files?.[0];if(this.#Ht.value="",!e||!t||this.#Fr){this.#Fr||this.#go(!0);return}let i=this.#tt,n=i?.getGroup(e.groupId),o;try{o=this.adapter.getOwnMemberNumber()}catch{this.#n("Your current BC identity could not be verified for this upload.","error"),this.#go(!0);return}if(!i||!n||n.protocolVersion!==2||n.creatorNumber!==o){this.#n("This group can no longer accept an avatar change.","error"),this.#go(!0);return}let a=n.avatarUrl;this.#Fr=!0;let l=new AbortController;this.#lo=l;let d=-10;try{this.#n("Preparing the group avatar locally\u2026");let c=await this.imageUploader.prepare(t);if(l.signal.aborted)return;this.#n(`Prepared ${jl(c.blob.size)}; waiting for Catbox\u2026`);let u=await this.catboxImageUpload(c,h=>{let m=h.percent===void 0?void 0:Math.max(0,Math.min(100,Math.round(h.percent)));m===void 0||m<d+10||(d=m,this.#n(`Uploading group avatar to Catbox\u2026 ${m}%`))},l.signal);if(l.signal.aborted)return;let p=i.getGroup(e.groupId);if(!p||p.protocolVersion!==2||p.creatorNumber!==o||this.adapter.getOwnMemberNumber()!==o)throw new Error("The group changed before the avatar upload finished");if(p.avatarUrl!==a)throw new Error("The group avatar changed while this upload was running. The newer avatar was kept.");await i.setGroupAvatar(e.groupId,u),this.#n("Group avatar uploaded and shared with current members.")}catch(c){l.signal.aborted||this.#n(Vr(c),"error")}finally{this.#lo===l&&(this.#lo=void 0,this.#Fr=!1,this.#so=void 0),!l.signal.aborted&&e.returnFocus.isConnected&&e.returnFocus.focus({preventScroll:!0})}}async#Rl(){this.#we.value="",this.#Xn=[],this.#ar=[],this.#Yn=0,this.#Bt.replaceChildren(s("div",{className:"kl-finder-loading",text:"Gathering your shortcuts\u2026"})),this.#dt.open||this.#dt.showModal(),this.#we.setAttribute("aria-expanded","true"),this.#we.focus();let e=++this.#Io,t;try{t=await this.#Vd()}catch{if(e!==this.#Io||!this.#dt.open)return;this.#Bt.replaceChildren(s("div",{className:"kl-finder-empty kl-finder-error",text:"KikiLink shortcuts could not be gathered right now. Try again shortly."})),this.#nn.textContent="Shortcuts temporarily unavailable";return}e!==this.#Io||!this.#dt.open||(this.#Xn=t,this.#Ll())}async#Vd(){let e=this.settings.get(),t=await this.service.listConversations(),i=t.reduce((c,u)=>c+u.unread,0),n=this.adapter.getRoomCharacters().length,o=[{id:"destination-home",kind:"destination",icon:"home",category:"Destination",title:"Home",detail:"Overview and your suggested next step",keywords:"start link deck overview dashboard",priority:52,action:{kind:"workspace",target:"home"}},{id:"destination-news",kind:"destination",icon:"note",category:"Destination",title:"News & changelog",detail:`What is new in KikiLink v${this.version}`,keywords:"news changelog release update version features fixes latest",priority:66,action:{kind:"workspace",target:"news"}},{id:"destination-chat",kind:"destination",icon:"chat",category:"Destination",title:"Chat",detail:i>0?`${i} unread ${i===1?"Beep":"Beeps"}`:"Recent Beep conversations",keywords:"beep message messages conversation conversations linkchat",priority:76+Math.min(i,20),action:{kind:"workspace",target:"chat"}},{id:"new-chat",kind:"destination",icon:"plus",category:"Action",title:"Start a new chat",detail:"Choose a contact or enter a member number",keywords:"new beep contact member number send message",priority:92,action:{kind:"new-chat"}},{id:"change-status",kind:"destination",icon:"status",category:"Action",title:"Change my status",detail:e.linkPresence.enabled?Ie(this.presence.get(this.adapter.getOwnMemberNumber()).status):"Presence sharing is off",keywords:"presence status online idle away dnd do not disturb offline invisible note",priority:84,action:{kind:"presence"}},{id:"destination-players",kind:"destination",icon:"users",category:"Destination",title:"Players",detail:e.linkRoster.enabled?`${n} ${n===1?"person":"people"} here now`:"Optional player notebook \xB7 currently off",keywords:"roster people room notes tags favorites whisper profile linkroster",priority:74,action:{kind:"workspace",target:"roster"}},{id:"destination-room",kind:"destination",icon:"location",category:"Destination",title:"Room Tools",detail:this.adapter.isInChatRoom()?"Background, music, players, and roles":"Enter a room first",keywords:"room admin background music kick promote whitelist roles customization lobbies rooms directory refresh presets blacklist access",priority:72,action:{kind:"workspace",target:"room"}},{id:"destination-music",kind:"destination",icon:"music",category:"Destination",title:"Music & Playlists",detail:`${e.linkMusic.playlists.length} playlists \xB7 local and shared files`,keywords:"music player playlist songs tracks audio hosted local seek shuffle repeat room sync",priority:71,action:{kind:"workspace",target:"music"}},{id:"destination-gallery",kind:"destination",icon:"image",category:"Destination",title:"Media Gallery",detail:"Images you add directly and media from saved LinkChat conversations",keywords:"gallery library add upload images pictures device litterbox catbox media all chats",priority:70,action:{kind:"workspace",target:"gallery"}},{id:"destination-activities",kind:"destination",icon:"activities",category:"Destination",title:"Custom Activities",detail:e.linkActivities.enabled?`${e.linkActivities.customActivities.length} custom activities`:"Custom activity builder \xB7 currently off",keywords:"custom activity activities vanilla body slot arousal blossom",priority:68,action:{kind:"workspace",target:"activities"}},{id:"destination-settings",kind:"destination",icon:"settings",category:"Destination",title:"Settings",detail:"Customize KikiLink",keywords:"preferences customize configuration options",priority:62,action:{kind:"workspace",target:"settings"}}];for(let c of t){let u=["Chat",`#${c.peerNumber}`,c.unread>0?`${c.unread} unread`:"",c.lastMessageAt>0?_i(c.lastMessageAt):""].filter(Boolean);o.push({id:`conversation-${c.peerNumber}`,kind:"conversation",icon:"chat",category:"Chat",title:oe(c),detail:u.join(" \xB7 "),keywords:`${c.peerNumber} beep message conversation ${c.lastMessage}`,priority:120+Math.min(c.unread*8,40)+(c.pinned?12:0),action:{kind:"conversation",peerNumber:c.peerNumber,peerName:c.peerName}})}let a=this.roster.list("known"),l=new Set(a.map(c=>c.memberNumber));for(let c of a){let u=[c.present?"Here now":"Player",`#${c.memberNumber}`,c.favorite?"Favorite":"",c.tags.slice(0,2).join(" \xB7 ")].filter(Boolean);o.push({id:`player-${c.memberNumber}`,kind:"player",icon:c.favorite?"star":"users",category:c.present?"In room":"Player",title:c.displayName,detail:u.join(" \xB7 "),keywords:`${c.memberNumber} ${c.note} ${c.tags.join(" ")} ${c.lastRoomName} roster player`,priority:104+(c.present?24:0)+(c.favorite?12:0),action:{kind:"player",memberNumber:c.memberNumber}})}let d=new Set(t.map(c=>c.peerNumber));try{for(let c of this.adapter.getKnownContacts())l.has(c.memberNumber)||d.has(c.memberNumber)||o.push({id:`contact-${c.memberNumber}`,kind:"conversation",icon:"chat",category:"Contact",title:c.memberName,detail:`Known contact \xB7 #${c.memberNumber}`,keywords:`${c.memberNumber} contact friend beep new chat`,priority:90,action:{kind:"conversation",peerNumber:c.memberNumber,peerName:c.memberName}})}catch{}e.linkActivities.customActivities.forEach((c,u)=>{o.push({id:`activity-${u}`,kind:"activity",icon:"activities",category:"Custom Activity",title:c.name,detail:`${c.targetGroup} \xB7 ${c.template}`,keywords:`custom activity vanilla body slot ${c.targetGroup} ${c.image} arousal ${c.template}`,priority:72,action:{kind:"activity",index:u}})});for(let c of Pm())o.push(c);return o}#Ll(){let e=Oi(this.#we.value),t;if(e){t=Im(this.#Xn,e);let i=Number(e.replace(/^#/u,"")),n=t.some(a=>a.action.kind==="conversation"&&a.action.peerNumber===i),o=-1;try{o=this.adapter.getOwnMemberNumber()}catch{}if(/^#?\d+$/u.test(e)&&Number.isSafeInteger(i)&&i>0&&Number.isSafeInteger(o)&&o>0&&i!==o&&!n){let a=`Member ${i}`;try{a=this.adapter.getMemberName(i)}catch{}t.unshift({id:`direct-${i}`,kind:"conversation",icon:"plus",category:"Action",title:`Start chat with #${i}`,detail:a,keywords:e,priority:1e3,action:{kind:"conversation",peerNumber:i,peerName:a}})}t=t.slice(0,12)}else{let i=this.#Xn.filter(o=>o.kind==="conversation"&&o.id.startsWith("conversation-")).sort((o,a)=>a.priority-o.priority)[0];t=[i?.id,"new-chat",i?void 0:"destination-chat","destination-players","destination-room","destination-gallery","destination-activities","destination-settings"].filter(o=>!!o).map(o=>this.#Xn.find(a=>a.id===o)).filter(o=>o!==void 0)}if(this.#ar=t,this.#Yn=0,this.#Bt.replaceChildren(),t.length===0){this.#Bt.append(s("div",{className:"kl-finder-empty"},s("div",{className:"kl-finder-empty-title",text:"Nothing matches yet"}),s("div",{text:"Try a name, member number, feature, activity, or setting."}))),this.#nn.textContent="No KikiLink results found",this.#we.removeAttribute("aria-activedescendant");return}t.forEach((i,n)=>{let o=s("span",{className:"kl-finder-result-icon"},w(i.icon,"kl-finder-result-symbol",i.icon==="star")),a=s("button",{className:"kl-finder-result",type:"button"},o,s("span",{className:"kl-finder-result-copy"},s("span",{className:"kl-finder-result-title",text:i.title}),s("span",{className:"kl-finder-result-detail",text:i.detail})),s("span",{className:"kl-finder-result-category",text:i.category}));a.id=`kikilink-finder-option-${n}`,a.dataset.finderKind=i.kind,a.setAttribute("role","option"),a.setAttribute("aria-selected",String(n===0)),a.tabIndex=-1,a.addEventListener("pointermove",()=>this.#ss(n,!1)),a.addEventListener("click",()=>{this.#El(n)}),this.#Bt.append(a)}),this.#nn.textContent=`${t.length} ${t.length===1?"result":"results"} available`,this.#ss(0,!1)}#qd(e){if(this.#ar.length===0)return;let t=(this.#Yn+e+this.#ar.length)%this.#ar.length;this.#ss(t,!0)}#ss(e,t){if(e<0||e>=this.#ar.length)return;this.#Yn=e;let i=[...this.#Bt.querySelectorAll('[role="option"]')];i.forEach((o,a)=>{o.dataset.selected=String(a===e),o.setAttribute("aria-selected",String(a===e))});let n=i[e];n&&(this.#we.setAttribute("aria-activedescendant",n.id),t&&n.scrollIntoView?.({block:"nearest"}))}async#El(e){let t=this.#ar[e];if(!t)return;this.#dt.close();let i=t.action;i.kind==="workspace"?this.#ui(i.target):i.kind==="new-chat"?this.#wo():i.kind==="presence"?this.#os():i.kind==="conversation"?await this.openChat(i.peerNumber,i.peerName):i.kind==="player"?this.#vo(i.memberNumber):i.kind==="activity"?this.#Jo(i.index):this.#fi(i.section)}#Wd(){let e=s("button",{className:"kl-text-button kl-text-button--primary",type:"button",text:"Add image",onClick:()=>this.#Vo("gallery")}),t=s("button",{className:"kl-text-button",type:"button",text:"Refresh",onClick:()=>{this.#Ln()}}),i=s("header",{className:"kl-feature-page-header"},s("div",{className:"kl-feature-page-heading"},s("div",{className:"kl-feature-page-eyebrow",text:"ALL CHATS"}),s("h1",{className:"kl-feature-page-title",text:"Media Gallery"}),this.#at),s("div",{className:"kl-gallery-header-actions"},e,t));this.#Ct.append(i,this.#Be)}async#ls(){this.#Pt("gallery"),await this.#Ln()}async#Ln(){let e=++this.#Jn;this.#hi(this.#Be),this.#ds(),this.#Be.setAttribute("aria-busy","true"),this.#Be.replaceChildren(s("div",{className:"kl-gallery-empty",text:"Collecting images from LinkChat\u2026"}));try{let t=this.settings.get(),i=this.#Yd(400),[n,o]=await Promise.all([this.service.listMedia(400),this.galleryStore.list().then(g=>({ok:!0,images:g}),()=>({ok:!1,images:[]}))]);if(e!==this.#Jn)return;let a=o.images;o.ok&&(this.#hl=a.length);let l=o.ok?void 0:s("div",{className:"kl-gallery-empty kl-gallery-storage-error"},s("strong",{text:"Device Gallery could not be read."}),s("span",{text:"Refresh to try again; no local files were changed."})),d=new Set(t.linkChat.gallery.hiddenUrls),c=Date.now(),u=t.linkChat.gallery.saved.filter(g=>g.expiresAt!==void 0&&g.expiresAt<=c).map(g=>g.url);if(u.length>0){let g=new Set(u);for(let x of g)d.add(x);this.settings.update(x=>{x.linkChat.gallery.saved=x.linkChat.gallery.saved.filter(b=>!g.has(b.url)),x.linkChat.gallery.hiddenUrls=[...g,...x.linkChat.gallery.hiddenUrls.filter(b=>!g.has(b))]})}let p=new Map;for(let g of t.linkChat.gallery.saved)d.has(g.url)||g.expiresAt!==void 0&&g.expiresAt<=c||p.set(g.url,{url:g.url,provider:Xi(g.url),sortAt:g.addedAt,saved:!0,...g.expiresAt===void 0?{}:{expiresAt:g.expiresAt}});for(let g of n){if(d.has(g.url))continue;let x=p.get(g.url);p.set(g.url,{url:g.url,provider:g.provider,sortAt:Math.max(x?.sortAt??0,g.sentAt),saved:x?.saved??!1,chat:g})}for(let g of i){if(d.has(g.url))continue;let x=p.get(g.url);x&&x.sortAt>g.sortAt||p.set(g.url,{...g,saved:x?.saved??!1})}let m=[...a.map(g=>{let x=URL.createObjectURL(g.blob);return this.#Qa.add(x),{url:x,provider:"device",sortAt:g.createdAt,saved:!0,localId:g.id}}),...p.values()].sort((g,x)=>x.sortAt-g.sortAt).slice(0,400),f=m.filter(g=>g.saved).length;if(this.#at.textContent=m.length?`${m.length} unique image${m.length===1?"":"s"} from your library and saved chats${f?` \xB7 ${f} added directly`:""}. Device files are private; Catbox and Litterbox entries use public links.`:"Images from saved chats and anything you add directly will appear here. Choose private device storage, Catbox, or expiring Litterbox for local files.",this.#gr(),m.length===0){if(l){this.#Be.replaceChildren(l);return}this.#Be.replaceChildren(s("div",{className:"kl-gallery-empty"},s("div",{text:"Your Gallery is empty."}),s("button",{className:"kl-text-button kl-text-button--primary",type:"button",text:"Add the first image",onClick:()=>this.#Vo("gallery")})));return}let y=!1;try{y=this.adapter.getRoomAdminSnapshot()?.isAdmin===!0}catch{}this.#Be.replaceChildren(...l?[l]:[],...m.map(g=>this.#Xd(g,y)))}catch(t){if(e!==this.#Jn)return;this.#Be.replaceChildren(s("div",{className:"kl-gallery-empty",text:t instanceof Error?t.message:"The media gallery could not be loaded."}))}finally{e===this.#Jn&&this.#Be.setAttribute("aria-busy","false")}}#Xd(e,t){let i=s("div",{className:"kl-gallery-actions"});e.chat&&i.append(s("button",{className:"kl-text-button",type:"button",text:"Open chat",onClick:()=>this.#In(()=>this.openChat(e.chat.peerNumber,e.chat.peerName),"LinkChat could not be opened.")})),e.group&&i.append(s("button",{className:"kl-text-button",type:"button",text:"Open group",onClick:()=>this.#In(async()=>{if(await this.#An("chat"),!await this.#J?.activate(e.group.groupId))throw new Error("This group chat is no longer available.")},"The group chat could not be opened.")})),t&&i.append(s("button",{className:"kl-text-button kl-text-button--primary",type:"button",text:e.localId?"Share & use as background":"Use as room background",onClick:()=>e.localId?void this.#Qd(e):this.#In(()=>this.#Il(e.url),"Room Tools could not be opened.")})),i.append(s("button",{className:"kl-text-button kl-text-button--danger kl-gallery-remove",type:"button",text:"Remove",ariaLabel:"Remove image from this Gallery",onClick:()=>{this.#Jd(e)}}));let n=s("article",{className:"kl-gallery-item"},this.#ed(e.url,e.localId!==void 0),s("div",{className:"kl-gallery-meta"},s("strong",{text:e.provider==="device"?"On this device":e.provider==="catbox"?"Catbox":e.provider==="litterbox"?"Litterbox":"Image"}),s("span",{text:e.chat?`${e.chat.direction==="outgoing"?"Sent to":"From"} ${e.chat.peerName} \xB7 ${Ti(e.chat.sentAt)}`:e.group?`${e.group.direction==="outgoing"?"Sent in":`From ${e.group.senderName} in`} ${e.group.groupTitle} \xB7 ${Ti(e.group.sentAt)}`:e.localId?`Stored permanently on this device \xB7 ${Ti(e.sortAt)}`:`Added to Gallery \xB7 ${Ti(e.sortAt)}${e.expiresAt?` \xB7 ${Hm(e.expiresAt)}`:""}`})),i);return e.localId?n.dataset.galleryId=e.localId:n.dataset.galleryUrl=e.url,n.dataset.gallerySource=e.saved?"library":e.group?"group":"chat",n}#Yd(e){let t=this.#tt;if(!t||e<=0)return[];let i=[];for(let n of t.listGroups())for(let o of t.getMessages(n.groupId))for(let a of Tt(o.content))a.image&&i.push({url:a.url,provider:Xi(a.url),sortAt:o.sentAt,saved:!1,group:{groupId:n.groupId,groupTitle:n.title,senderName:o.senderName,direction:o.direction,sentAt:o.sentAt}});return i.sort((n,o)=>o.sortAt-n.sortAt).slice(0,e)}#Pl(e,t=Date.now(),i=!0,n){let o=V(e);return!o||o.length>500?(this.#n("Use a direct HTTPS image link ending in a supported image extension.","error"),!1):(this.settings.update(a=>{a.linkChat.gallery.hiddenUrls=a.linkChat.gallery.hiddenUrls.filter(l=>l!==o),a.linkChat.gallery.saved=[{url:o,addedAt:t,...n===void 0?{}:{expiresAt:n}},...a.linkChat.gallery.saved.filter(l=>l.url!==o)]}),this.#gr(),i&&this.#le==="gallery"&&this.#Ln(),!0)}async#Jd(e){if(e.localId){if(!window.confirm("Delete this image permanently from this device Gallery?"))return;try{await this.galleryStore.delete(e.localId),await this.#Ln(),this.#n("Image permanently deleted from this device Gallery.")}catch(t){this.#n(t instanceof Error?t.message:"The local image could not be deleted.","error")}return}window.confirm("Remove this image from your KikiLink Gallery? The original chat message and hosted file will not be deleted.")&&(this.settings.update(t=>{t.linkChat.gallery.saved=t.linkChat.gallery.saved.filter(i=>i.url!==e.url),t.linkChat.gallery.hiddenUrls=[e.url,...t.linkChat.gallery.hiddenUrls.filter(i=>i!==e.url)]}),this.#gr(),this.#Ln(),this.#n("Image removed from this Gallery. Its chat message was left untouched."))}async#Il(e){let t=this.#le;this.#Ee.value=e;try{await this.#us(!1)}catch(i){throw this.#P&&this.#le==="room"&&this.#Pt(t),i}this.#P&&this.#n("Image selected. Review it, then apply the room media.")}async#Qd(e){if(!e.localId)return;let t=this.settings.get().linkChat.imageUploads,i=t.enabled?Le(t):null;if(!i){this.#n("Enable shared uploads in Chat settings first.","error"),this.#fi("chat");return}let{token:n,controller:o}=this.#Dl();try{let a=await this.galleryStore.get(e.localId);if(!this.#Vr(n,o))return;if(!a)throw new Error("This device image is no longer available");this.#n(`Sharing the image for ${ii(i.retention)}\u2026`);let l=await this.imageUploader.upload({blob:a.blob,width:a.width,height:a.height,sourceBytes:a.blob.size},i,o.signal);if(!this.#Vr(n,o))return;await this.#Il(l)}catch(a){if(!this.#Vr(n,o))return;this.#n(a instanceof Error?a.message:"The image could not be shared.","error")}finally{this.#sr===o&&(this.#sr=void 0)}}#ds(){if(typeof URL.revokeObjectURL=="function")for(let e of this.#Qa)URL.revokeObjectURL(e);this.#Qa.clear()}#cs(){this.#Jn+=1,this.#hi(this.#Be),this.#ds(),this.#Be.setAttribute("aria-busy","false")}#Zd(){let e=s("button",{className:"kl-text-button",type:"button",text:"Refresh room",onClick:()=>{this.#Pa==="lobbies"?this.#fo():this.#Pa==="presets"?this.#qo():this.#Gi(!0)}}),t=s("header",{className:"kl-feature-page-header"},s("div",{className:"kl-feature-page-heading"},s("div",{className:"kl-feature-page-eyebrow",text:"CURRENT ROOM"}),s("h1",{className:"kl-feature-page-title",text:"Room Tools"}),s("p",{className:"kl-feature-page-subtitle",text:"Background, music, and native room administration without leaving the Link Deck."})),e);this.#Ee.type="url",this.#Ee.placeholder="https://\u2026/background.webp",this.#Ee.maxLength=250,this.#V.type="url",this.#V.placeholder="https://\u2026/music.mp3",this.#V.maxLength=250,this.#gt.replaceChildren(A("1","Fill / stretch"),A("2","Fill & crop (keep ratio)"),A("3","Show full image (keep ratio)")),this.#Qe.type="checkbox";let i=s("label",{className:"kl-switch"},this.#Qe,s("span",{className:"kl-switch-track"}));this.#be.type="checkbox",this.#be.addEventListener("change",()=>{this.#ci=this.#be.checked,this.#ci?(this.#ke.textContent="Playlist follow is on. Play a compatible Music track to update the room.",this.#zl(!0)):(this.#ts="",this.#ke.textContent="Playlist follow is off.")});let n=s("label",{className:"kl-switch"},this.#be,s("span",{className:"kl-switch-track"}));this.#it.type="file",this.#it.accept="image/*",this.#it.hidden=!0,this.#it.addEventListener("change",()=>{this.#pc()}),this.#Ue.type="file",this.#Ue.accept="audio/mpeg,audio/mp4,video/mp4,.mp3,.mp4",this.#Ue.hidden=!0,this.#Ue.addEventListener("change",()=>{this.#hc()});let o=s("button",{className:"kl-text-button",type:"button",text:"Choose from gallery",onClick:()=>{this.#ls()}}),a=s("button",{className:"kl-text-button",type:"button",text:"Upload image",onClick:()=>this.#it.click()}),l=s("button",{className:"kl-text-button",type:"button",text:"Upload music",onClick:()=>this.#Ue.click()});this.#kr.addEventListener("click",()=>this.#uc());let d=s("section",{className:"kl-room-media"},s("h2",{text:"Room media"}),s("label",{className:"kl-room-field"},s("span",{text:"Background image"}),this.#Ee),s("div",{className:"kl-inline-actions"},o,a,this.#it),s("label",{className:"kl-room-field"},s("span",{text:"Background layout"}),this.#gt),s("label",{className:"kl-room-field"},s("span",{text:"Music URL"}),this.#V),s("div",{className:"kl-inline-actions"},l,this.#Ue),this.#K("Synchronize music","Ask compatible BC clients to keep room playback aligned.",i),this.#K("Follow KikiLink playlist","While enabled, each compatible MP3/MP4 track you play becomes the room music. Device tracks are shared temporarily when first needed. This switch is session-only.",n),this.#ke,s("p",{className:"kl-room-media-note",text:"Uploaded backgrounds and room music use your temporary Litterbox lifetime. Images are privacy-prepared; audio is renamed but may retain embedded metadata. For a long-lived room, use a durable HTTPS link you control."}),this.#kr),c=s("section",{className:"kl-room-players"},s("h2",{text:"Players & roles"}),s("p",{className:"kl-setting-help",text:"Kick, Admin, and room Whitelist buttons call Bondage Club's native room commands."}),this.#Fi);this.#bi.append(this.#ve,s("div",{className:"kl-room-grid"},d,c)),this.#ec(),this.#nc();for(let[p,h]of[["current","Room"],["lobbies","Lobbies"],["presets","Presets"]]){let m=s("button",{className:"kl-room-subnav-button",type:"button",text:h,onClick:()=>this.#Tl(p)});m.dataset.roomSubview=p,this.#It.append(m)}let u=s("div",{className:"kl-room-content"},this.#bi,this.#ft,this.#Pe);this.#Yt.append(t,this.#It,u),this.#Tl("current",!1)}#Tl(e,t=!0){this.#Pa=e,this.#bi.hidden=e!=="current",this.#ft.hidden=e!=="lobbies",this.#Pe.hidden=e!=="presets";for(let i of this.#It.querySelectorAll("button"))i.dataset.active=String(i.dataset.roomSubview===e);t&&(e==="current"?this.#Gi(!0):e==="lobbies"?(this.#jr(),this.#Wn.length===0&&this.#fo()):this.#qo())}#ec(){this.#Fe.type="search",this.#Fe.placeholder="Filter rooms or descriptions",this.#Fe.setAttribute("aria-label","Filter lobby rooms"),this.#Fe.autocomplete="off",this.#Fe.addEventListener("input",()=>this.#jr()),this.#Fe.addEventListener("keydown",e=>{e.key==="Enter"&&(e.preventDefault(),this.#fo())}),this.#Jt.append(w("refresh")),this.#Jt.addEventListener("click",()=>{this.#fo()}),this.#rt.replaceChildren(A("","\u2640 Female"),A("X","\u2640\u2642 Mixed"),A("M","\u2642 Male")),this.#rt.value=typeof this.adapter.getRoomSearchSpace=="function"?this.adapter.getRoomSearchSpace():"",this.#rt.addEventListener("change",()=>{this.#Wn=[],this.#fo()}),this.#ft.append(s("div",{className:"kl-lobby-toolbar"},s("div",{},s("h2",{text:"Live lobbies"}),s("p",{className:"kl-setting-help",text:"Favorite room names come first in gold; rooms with friends follow in your accent color. KikiLink refreshes only when you ask."})),s("div",{className:"kl-lobby-search-wrap"},this.#rt,this.#Fe,this.#Jt)),this.#B,this.#He)}async#fo(){let e=++this.#To;this.#Jt.disabled=!0,this.#B.textContent="Refreshing Bondage Club rooms\u2026",this.#B.dataset.state="loading";try{let t=await this.adapter.searchRooms(this.#Fe.value,this.#rt.value);if(e!==this.#To)return;this.#Wn=t;let i=t.flatMap(n=>n.friends.map(o=>o.memberNumber));this.presence.requestMany(i),this.#jr()}catch(t){if(e!==this.#To)return;let i=t instanceof Error?t.message:"The room list could not be refreshed.";this.#Wn=[],this.#jr();let n=this.#He.querySelector('[data-current="true"]')!==null;this.#B.textContent=n?`${i} \xB7 Your current room is still shown.`:i,this.#B.dataset.state="error"}finally{e===this.#To&&(this.#Jt.disabled=!1)}}#jr(){let e=this.#Fe.value.trim().toLocaleLowerCase(),t=new Set(this.settings.get().linkRoom.favoriteRoomNames.map(qe)),i="",n="";try{i=(this.adapter.getCurrentRoomName()??"").trim(),n=qe(i)}catch{}let o=this.#Wn.slice(0,500);try{let c=typeof this.adapter.getCurrentLobbyRoom=="function"?this.adapter.getCurrentLobbyRoom():void 0;if(c){let u=qe(c.name);n||(n=u),n&&!o.some(p=>qe(p.name)===n)&&(o=[c,...o])}}catch{}if(n&&i&&!o.some(c=>qe(c.name)===n)){let c=1;try{c=Math.max(1,this.adapter.getRoomCharacters().length+1)}catch{}o=[{name:i,description:"Live room details are temporarily unavailable.",language:"",memberCount:c,memberLimit:c,canJoin:!1,locked:!1,privateRoom:!1,mapType:"",friends:[]},...o]}let a=o.map((c,u)=>({room:c,index:u,favorite:t.has(qe(c.name)),current:!!n&&qe(c.name)===n})).filter(({room:c,current:u})=>u||!e||`${c.name}
${c.description}
${c.language}`.toLocaleLowerCase().includes(e)).sort((c,u)=>{let p=c.current?3:c.favorite?2:c.room.friends.length>0?1:0;return(u.current?3:u.favorite?2:u.room.friends.length>0?1:0)-p||c.index-u.index}),l=a.filter(({room:c})=>c.friends.length>0).length,d=a.filter(({favorite:c})=>c).length;this.#B.textContent=a.length===0?`No rooms returned for ${Om(this.#rt.value)}.`:`${a.length} rooms \xB7 ${d} favorite${d===1?"":"s"} \xB7 ${l} with friends`,this.#B.dataset.state=a.length>0?"ready":"empty",this.#He.replaceChildren(...a.map(({room:c,favorite:u,current:p})=>this.#tc(c,u,p)))}#tc(e,t,i){let n=s("div",{className:"kl-lobby-friends"});if(e.friends.length>0){for(let c of e.friends.slice(0,5)){let u=this.#Tn(c.memberName,c.memberNumber,"kl-lobby-friend-avatar");u.title=`${c.memberName} \xB7 #${c.memberNumber}`,n.append(u)}e.friends.length>5&&n.append(s("span",{className:"kl-lobby-friend-more",text:`+${e.friends.length-5}`}))}let o=[e.language,e.creator?`by ${e.creator}`:"",Dm(e.mapType),e.locked?"Locked":"",e.privateRoom?"Private":""].filter(Boolean),a=i?s("span",{className:"kl-lobby-current",text:"Current room"}):s("button",{className:"kl-text-button kl-lobby-join",type:"button",text:this.#Qn?"Joining\u2026":e.canJoin?"Join":"Unavailable",onClick:()=>{this.#rc(e)}});a instanceof HTMLButtonElement&&(a.disabled=this.#Qn||!e.canJoin);let l=s("button",{className:"kl-icon-button kl-lobby-favorite",type:"button",title:t?`Remove ${e.name} from favorites`:`Add ${e.name} to favorites`,ariaLabel:t?`Remove ${e.name} from favorite rooms`:`Add ${e.name} to favorite rooms`,onClick:()=>this.#ic(e.name)});l.setAttribute("aria-pressed",String(t)),l.append(w("star","kl-lobby-favorite-icon",t));let d=s("article",{className:"kl-lobby-card"},s("div",{className:"kl-lobby-card-main"},s("strong",{className:"kl-lobby-name",text:e.name}),s("span",{className:"kl-lobby-count",text:`${e.memberCount}/${e.memberLimit}`}),e.friends.length>0?s("span",{className:"kl-lobby-friend-label",text:`${e.friends.length} friend${e.friends.length===1?"":"s"}`}):null,l),e.description?s("p",{className:"kl-lobby-description",text:e.description}):null,s("div",{className:"kl-lobby-card-footer"},s("span",{className:"kl-lobby-flags",text:o.join(" \xB7 ")||"Public room"}),n,a));return d.dataset.hasFriends=String(e.friends.length>0),d.dataset.favorite=String(t),d.dataset.current=String(i),d}#ic(e){let t=qe(e);if(!t)return;let i=!1;this.settings.update(n=>{let o=n.linkRoom.favoriteRoomNames.findIndex(a=>qe(a)===t);o>=0?n.linkRoom.favoriteRoomNames.splice(o,1):(n.linkRoom.favoriteRoomNames.unshift(e.trim()),i=!0)}),this.#jr(),this.#n(i?`${e} added to favorite rooms.`:`${e} removed from favorite rooms.`)}async#rc(e){if(this.#Qn)return;let t=!1,i=!0;try{t=typeof this.adapter.isInChatRoom=="function"&&this.adapter.isInChatRoom()}catch{i=!1,t=!0}if(t){if(typeof confirm!="function"){this.#n("KikiLink cannot safely confirm leaving the current room right now.","error");return}let n=i?`Leave the current room and join \u201C${e.name}\u201D?`:`KikiLink could not verify the current room state. Continue with Bondage Club's safe leave-and-join flow for \u201C${e.name}\u201D?`;if(!confirm(n))return}this.#Qn=!0,this.#jr();try{this.#n(t?`Leaving safely, then joining ${e.name}\u2026`:`Joining ${e.name}\u2026`),await this.adapter.joinRoom(e.name),this.#n(`Joined ${e.name}.`),this.close()}catch(n){this.#n(n instanceof Error?n.message:"Could not join this room.","error")}finally{this.#Qn=!1,this.#P&&this.#jr()}}#nc(){this.#ie.type="text",this.#ie.placeholder="Preset name (for example: Moon Garden)",this.#ie.maxLength=60,this.#Ie.addEventListener("click",()=>this.#oc()),this.#Pe.append(s("div",{className:"kl-room-preset-create"},s("div",{},s("h2",{text:"Room presets"}),s("p",{className:"kl-setting-help",text:"Save the room name, description, BC background, custom media, limits, access, admins, whitelist, and blacklist. Passwords and large map layouts are never copied."})),s("div",{className:"kl-room-preset-create-actions"},this.#ie,this.#Ie)),this.#Hi)}#oc(){let e=this.adapter.getRoomAdminSnapshot();if(!e){this.#n("Enter a chat room before saving a preset.","error");return}let t=this.#ie.value.trim()||e.roomName,i={id:ti("room"),label:t.slice(0,60),savedAt:Date.now(),room:structuredClone(e.settings)};this.settings.update(n=>{n.linkRoom.presets=[i,...n.linkRoom.presets].slice(0,12)}),this.#ie.value="",this.#qo(),this.#n(`Saved room preset \u201C${i.label}\u201D.`)}#qo(){let e=this.settings.get().linkRoom.presets;if(e.length===0){this.#Hi.replaceChildren(s("div",{className:"kl-gallery-empty",text:"No room presets yet."}));return}this.#Hi.replaceChildren(...e.map(t=>this.#ac(t)))}#ac(e){let t=[`${e.room.limit} players`,e.room.language||"Any language",`${e.room.admins.length} admins`,`${e.room.whitelist.length} whitelist`,`${e.room.blacklist.length} blacklist`].join(" \xB7 ");return s("article",{className:"kl-room-preset-card"},s("div",{className:"kl-room-preset-copy"},s("strong",{text:e.label}),s("span",{text:e.room.name}),s("small",{text:t})),s("div",{className:"kl-room-preset-actions"},s("button",{className:"kl-text-button kl-text-button--primary",type:"button",text:"Apply",onClick:()=>this.#sc(e)}),s("button",{className:"kl-icon-button",type:"button",title:"Delete preset",ariaLabel:`Delete ${e.label}`,onClick:()=>this.#lc(e)},w("trash"))))}#sc(e){if(!(typeof confirm=="function"&&!confirm(`Apply \u201C${e.label}\u201D to the current room? This updates the live room settings.`)))try{this.adapter.applyRoomPreset(e.room),this.#n(`Applying room preset \u201C${e.label}\u201D\u2026`),this.#Ol()}catch(t){this.#n(t instanceof Error?t.message:"The room preset could not be applied.","error")}}#lc(e){typeof confirm=="function"&&!confirm(`Delete room preset \u201C${e.label}\u201D?`)||(this.settings.update(t=>{t.linkRoom.presets=t.linkRoom.presets.filter(i=>i.id!==e.id)}),this.#qo())}async#us(e=!0){this.#Pt("room"),await this.#Gi(e)}async#Gi(e){let t=this.adapter.getRoomAdminSnapshot();if(!t){this.#ve.textContent="Enter a chat room to use Room Tools.",this.#ve.dataset.state="empty",this.#Fi.replaceChildren(s("div",{className:"kl-gallery-empty",text:"No active room."})),this.#_l(!1),this.#ci=!1,this.#be.checked=!1,this.#ke.textContent="Enter a room to follow the playlist.";return}this.#ve.textContent=t.isAdmin?`${t.roomName} \xB7 You are a room administrator`:`${t.roomName} \xB7 View only (administrator rights required to make changes)`,this.#ve.dataset.state=t.isAdmin?"admin":"readonly",this.#_l(t.isAdmin),this.#be.checked=t.isAdmin&&this.#ci,this.#ke.textContent=t.isAdmin?this.#ci?"Following the Music tab. Compatible device tracks are shared temporarily when needed.":"Playlist follow is off.":"Only a room administrator can make room music follow the playlist.",t.isAdmin||(this.#ci=!1),e&&(this.#Ee.value=t.customization.imageUrl,this.#V.value=t.customization.musicUrl,this.#gt.value=t.customization.sizeMode.toString(),this.#Qe.checked=t.customization.musicSync),this.#Fi.replaceChildren(...t.players.map(i=>this.#dc(i,t.isAdmin))),this.presence.requestMany(t.players.map(i=>i.memberNumber)),t.players.length===0&&this.#Fi.append(s("div",{className:"kl-gallery-empty",text:"No other players are in this room."}))}#_l(e){for(let t of[this.#Ee,this.#V,this.#gt,this.#Qe,this.#kr,this.#it,this.#Ue,this.#be])t.disabled=!e;for(let t of this.#Yt.querySelectorAll(".kl-room-media .kl-inline-actions button"))t.disabled=!e}#dc(e,t){let i=this.presence.get(e.memberNumber),n=s("div",{className:"kl-room-player-actions"});t&&n.append(this.#ps(e,e.admin?"demote":"promote",e.admin?"Remove admin":"Make admin"),this.#ps(e,e.whitelisted?"unwhitelist":"whitelist",e.whitelisted?"Remove whitelist":"Whitelist"),this.#ps(e,"kick","Kick",!0));let o=s("div",{className:"kl-room-player-badges"}),a=s("span",{text:Ie(i.status)});a.dataset.status=i.status,a.dataset.presenceLabel="true",a.hidden=i.status==="unknown",o.append(a),e.admin&&o.append(s("span",{text:"ADMIN"})),e.whitelisted&&o.append(s("span",{text:"WHITELIST"}));let l=s("button",{className:"kl-avatar-button kl-room-player-avatar-button",type:"button",ariaLabel:`Open KikiLink profile for ${e.memberName}`},s("span",{className:"kl-avatar-wrap"},this.#Tn(e.memberName,e.memberNumber),ge(i.status)));this.#mi(l,()=>({memberNumber:e.memberNumber,displayName:e.memberName})),l.addEventListener("click",c=>{c.stopPropagation(),this.#zr(e.memberNumber,e.memberName,l)});let d=s("article",{className:"kl-room-player"},l,s("div",{className:"kl-room-player-copy"},s("strong",{text:e.memberName}),s("span",{text:`#${e.memberNumber}`}),o),n);return d.dataset.memberNumber=e.memberNumber.toString(),d}#ps(e,t,i,n=!1){return s("button",{className:`kl-text-button${n?" kl-text-button--danger":""}`,type:"button",text:i,onClick:()=>{this.#cc(e,t)}})}async#cc(e,t){if(!(t==="kick"&&typeof confirm=="function"&&!confirm(`Kick ${e.memberName} from the room?`)))try{this.adapter.runRoomMemberAction(e.memberNumber,t),this.#n(`${Em(t)} ${e.memberName}.`),this.#Ol()}catch(i){this.#n(i instanceof Error?i.message:"The room action failed.","error")}}#Ol(){this.#Ir!==void 0&&clearTimeout(this.#Ir),this.#Ir=setTimeout(()=>{this.#Ir=void 0,this.#P&&this.#Gi(!0)},700)}#uc(){try{this.adapter.updateRoomCustomization({imageUrl:this.#Ee.value,musicUrl:this.#V.value,sizeMode:Number(this.#gt.value),musicSync:this.#Qe.checked}),this.#n("Room background and music update sent to Bondage Club.")}catch(e){this.#n(e instanceof Error?e.message:"Room media could not be updated.","error")}}#Dl(){this.#hs();let e=new AbortController;return this.#sr=e,{token:this.#Ga,controller:e}}#Vr(e,t){return this.#P&&e===this.#Ga&&this.#sr===t&&!t.signal.aborted}#hs(){this.#Ga+=1,this.#sr?.abort(),this.#sr=void 0}#ms(e){this.#gs(!0);let t=new AbortController;return this.#ai=t,this.#un=e,{token:this.#Ba,controller:t}}#mr(e,t){return this.#P&&e===this.#Ba&&this.#ai===t&&!t.signal.aborted}#gs(e){!e&&this.#un||(this.#Ba+=1,this.#ai?.abort(),this.#ai=void 0,this.#un=!1)}#fs(){this.#pn?.abort(),this.#pn=void 0}#Wo(e){return{roomName:e.roomName.trim().toLocaleLowerCase(),roomSpace:(e.settings?.space??"").trim().toLocaleLowerCase()}}#Gl(){let e=this.adapter.getRoomAdminSnapshot();if(!e)throw new Error("Open a Bondage Club chat room first");if(!e.isAdmin)throw new Error("Only a room administrator can change room media");return this.#Wo(e)}#bo(e){try{let t=this.adapter.getRoomAdminSnapshot();if(!t?.isAdmin)return!1;let i=this.#Wo(t);return i.roomName===e.roomName&&i.roomSpace===e.roomSpace}catch{return!1}}async#pc(){let e=this.#it.files?.[0];if(this.#it.value="",!e)return;let t=this.settings.get().linkChat.imageUploads,i=t.enabled?Le(t):null;if(!i){this.#n("Enable temporary local image uploads in Chat settings first.","error"),this.#fi("chat");return}let n;try{n=this.#Gl()}catch(l){this.#n(l instanceof Error?l.message:"The current room could not be verified.","error");return}let{token:o,controller:a}=this.#Dl();try{this.#ve.textContent="Preparing and uploading the room background\u2026";let l=await this.imageUploader.prepare(e);if(!this.#Vr(o,a)||!this.#bo(n))return;let d=await this.imageUploader.upload(l,i,a.signal);if(!this.#Vr(o,a)||!this.#bo(n)||(this.#Ee.value=d,await this.#Gi(!1),!this.#Vr(o,a)||!this.#bo(n)))return;this.#n("Background uploaded. Apply room media when ready.")}catch(l){if(!this.#Vr(o,a))return;this.#n(l instanceof Error?l.message:"The room background could not be uploaded.","error"),await this.#Gi(!1)}finally{this.#sr===a&&(this.#sr=void 0)}}async#hc(){let e=this.#Ue.files?.[0];if(this.#Ue.value="",!e)return;let t=this.settings.get().linkChat.imageUploads,i=t.enabled?Le(t):null;if(!i){this.#n("Enable temporary local uploads in Chat settings first.","error"),this.#fi("chat");return}let n;try{n=this.#Gl()}catch(l){this.#n(l instanceof Error?l.message:"The current room could not be verified.","error");return}let{token:o,controller:a}=this.#ms(!1);try{this.#ve.textContent="Uploading temporary room music\u2026";let l=await no(e,i,void 0,a.signal);if(!this.#mr(o,a)||!this.#bo(n)||(this.#V.value=l,await this.#Gi(!1),!this.#mr(o,a)||!this.#bo(n)))return;this.#n("Music uploaded. Apply room media when ready.")}catch(l){if(!this.#mr(o,a))return;this.#n(l instanceof Error?l.message:"The room music could not be uploaded.","error"),await this.#Gi(!1)}finally{this.#ai===a&&(this.#ai=void 0,this.#un=!1)}}#mc(){let e=s("header",{className:"kl-feature-page-header"},s("div",{className:"kl-feature-page-heading"},s("div",{className:"kl-feature-page-eyebrow",text:"YOUR MUSIC"}),s("h1",{className:"kl-feature-page-title",text:"Music & Playlists"}),s("p",{className:"kl-feature-page-subtitle",text:"A small private player for local files, direct links, and expiring shared tracks."})),this.#ki);this.#Tt.addEventListener("change",()=>{this.settings.update(p=>{p.linkMusic.activePlaylistId=this.#Tt.value}),this.#_e()}),this.#ki.addEventListener("click",()=>this.#kc());let t=s("button",{className:"kl-text-button",type:"button",text:"Rename",onClick:()=>this.#yc()}),i=s("button",{className:"kl-text-button",type:"button",text:"Duplicate",onClick:()=>this.#vc()}),n=s("button",{className:"kl-text-button",type:"button",text:"Clear",onClick:()=>{this.#xc()}}),o=s("button",{className:"kl-text-button kl-text-button--danger",type:"button",text:"Delete",onClick:()=>{this.#wc()}}),a=s("details",{className:"kl-music-playlist-menu"});a.append(s("summary",{className:"kl-text-button",text:"Manage",title:"Playlist actions",ariaLabel:"Playlist actions"}),s("div",{className:"kl-music-playlist-actions"},t,i,n,o)),this.#bt.type="text",this.#bt.placeholder="Track title (optional)",this.#bt.maxLength=80,this.#st.type="url",this.#st.placeholder="https://\u2026/track.mp3",this.#st.maxLength=500,this.#Ze.type="file",this.#Ze.accept="audio/*,video/mp4,.aac,.flac,.m4a,.mp3,.mp4,.oga,.ogg,.opus,.wav,.webm",this.#Ze.multiple=!0,this.#yi.replaceChildren(A("local","Keep only on this device"),...pe()?[A("catbox","Upload to long-lived Catbox")]:[]),this.#xe.addEventListener("click",()=>{this.#bc()}),this.#Z.type="search",this.#Z.placeholder="Search this playlist",this.#Z.autocomplete="off",this.#Z.addEventListener("input",()=>{this.#_e()});let l=s("section",{className:"kl-music-library"},s("div",{className:"kl-music-playlist-toolbar"},s("label",{},s("span",{text:"Playlist"}),this.#Tt),a),s("div",{className:"kl-music-queue-tools"},s("div",{className:"kl-music-queue-search-wrap"},w("search"),this.#Z),this.#kt),this.#q),d=s("section",{className:"kl-music-add"},s("h2",{text:"Add a track"}),s("label",{},s("span",{text:"Title"}),this.#bt),s("label",{},s("span",{text:"Direct HTTPS audio URL"}),this.#st),s("div",{className:"kl-music-add-divider",text:"or choose a file"}),s("label",{},s("span",{text:"Audio files"}),this.#Ze),s("label",{},s("span",{text:"File handling"}),this.#yi),s("p",{className:"kl-setting-help",text:pe()?"Local files stay in this browser. Catbox files are public bearer links and may include embedded audio metadata. KikiLink sends no userhash, but a userscript manager may attach an existing Catbox session cookie; retention then depends on Catbox account state.":"FUSAM keeps selected files on this device. For remote music, use a direct HTTPS link you trust; Catbox upload is unavailable."}),this.#$e,this.#xe);this.#lt.replaceChildren(s("span",{className:"kl-music-artwork-ring"}),s("span",{className:"kl-music-artwork-center"},w("music"))),this.#Dt.replaceChildren(A("0.75","0.75\xD7"),A("1","1\xD7"),A("1.25","1.25\xD7"),A("1.5","1.5\xD7"),A("2","2\xD7")),this.#Dt.value="1",this.#Dt.addEventListener("change",()=>{this.#N.playbackRate=Number(this.#Dt.value)||1}),this.#Ke.replaceChildren(A("off","Sleep timer off"),A("end","After this track"),A("15","After 15 minutes"),A("30","After 30 minutes"),A("60","After 1 hour")),this.#Ke.value="off",this.#Ke.addEventListener("change",()=>this.#Sc());let c=s("section",{className:"kl-music-now-card"},s("div",{className:"kl-music-now-eyebrow",text:"NOW PLAYING"}),this.#lt,s("div",{className:"kl-music-now-card-copy"},this.#Zt,this.#vi),s("div",{className:"kl-music-session-options"},s("label",{},s("span",{text:"Speed"}),this.#Dt),s("label",{},s("span",{text:"Sleep"}),this.#Ke)),this.#ti);this.#ae.type="range",this.#ae.min="0",this.#ae.max="1000",this.#ae.step="1",this.#ae.value="0",this.#ae.addEventListener("input",()=>{!Number.isFinite(this.#N.duration)||this.#N.duration<=0||(this.#N.currentTime=Number(this.#ae.value)/1e3*this.#N.duration,this.#ko())}),this.#_t.append(w("previous")),this.#Mt.append(w("play")),this.#Ot.append(w("next")),this.#_t.addEventListener("click",()=>{this.#Fl()}),this.#Mt.addEventListener("click",()=>{this.#Ul()}),this.#Ot.addEventListener("click",()=>{this.#bs(!1)}),this.#xi.addEventListener("click",()=>this.#Cc()),this.#ei.addEventListener("click",()=>this.#Mc()),this.#St.addEventListener("click",()=>{this.#N.muted=!this.#N.muted,this.#qr()}),this.#nt.type="range",this.#nt.min="0",this.#nt.max="100",this.#nt.step="1",this.#nt.addEventListener("input",()=>{let p=Math.max(0,Math.min(100,Number(this.#nt.value)||0));this.#N.volume=p/100,this.settings.update(h=>{h.linkMusic.volume=p})}),this.#N.preload="metadata",this.#N.addEventListener("timeupdate",()=>this.#ko()),this.#N.addEventListener("loadedmetadata",()=>this.#ko()),this.#N.addEventListener("durationchange",()=>this.#ko()),this.#N.addEventListener("play",()=>{this.#qr(),this.#zl()}),this.#N.addEventListener("pause",()=>this.#qr()),this.#N.addEventListener("ended",()=>{if(this.#jo){this.#jo=!1,this.#Ke.value="off",this.#ti.textContent="Stopped after the track.",this.#yo();return}this.#bs(!0)}),this.#N.addEventListener("error",()=>{this.#Ye&&this.#n("This track could not be played by the browser.","error"),this.#qr()}),this.#Rc();let u=s("footer",{className:"kl-music-player"},s("div",{className:"kl-music-seek"},this.#ae,this.#Te),s("div",{className:"kl-music-controls"},this.#ei,this.#_t,this.#Mt,this.#Ot,this.#xi,this.#St,s("label",{className:"kl-music-volume"},s("span",{text:"Volume"}),this.#nt)));this.#Qt.append(e,s("div",{className:"kl-music-body"},l,s("div",{className:"kl-music-side"},c,d)),u),this.#_e()}async#_e(e=!1){let t=++this.#dl,i=this.settings.get().linkMusic;this.#Tt.replaceChildren(...i.playlists.map(c=>A(c.id,`${c.name} \xB7 ${c.tracks.length}`))),this.#Tt.value=i.activePlaylistId,this.#nt.value=i.volume.toString(),this.#N.volume=i.volume/100,this.#xi.textContent=i.repeatMode==="one"?"Repeat one":i.repeatMode==="all"?"Repeat all":"Repeat off",this.#xi.dataset.active=String(i.repeatMode!=="off"),this.#ei.dataset.active=String(i.shuffle);let n=se(i.playlists,i.activePlaylistId),o=await this.#ks(e);if(t!==this.#dl)return;let a=!1;try{a=this.adapter.getRoomAdminSnapshot()?.isAdmin===!0}catch{}let l=this.#Z.value.trim().toLocaleLowerCase(),d=n.tracks.map((c,u)=>({track:c,index:u})).filter(({track:c})=>!l||`${c.title}
${c.source}`.toLocaleLowerCase().includes(l));this.#kt.textContent=l?`${d.length} of ${n.tracks.length} tracks`:`${n.tracks.length} track${n.tracks.length===1?"":"s"}`,this.#q.replaceChildren(...d.map(({track:c,index:u})=>this.#gc(c,u,o,a))),d.length===0&&this.#q.append(s("div",{className:"kl-gallery-empty",text:n.tracks.length===0?"This playlist is empty.":"No matching tracks."})),this.#qr()}#gc(e,t,i,n){let o=e.source==="local"&&!i.has(e.locator),a=s("button",{className:"kl-icon-button kl-music-track-play",type:"button",title:o?"Local file is unavailable on this device":`Play ${e.title}`,ariaLabel:o?`${e.title} unavailable`:`Play ${e.title}`,onClick:()=>{this.#Xo(e)}},w(this.#Ye===e.id&&!this.#N.paused?"pause":"play"));a.disabled=o;let l=s("details",{className:"kl-music-track-menu"}),d=s("summary",{className:"kl-icon-button",title:`Actions for ${e.title}`,ariaLabel:`Actions for ${e.title}`},w("more")),c=s("div",{className:"kl-music-track-menu-popover"}),u=e.source==="local"?void 0:Fl(e.locator);if(n&&!o&&(e.source==="local"||u)&&c.append(s("button",{className:"kl-music-track-room",type:"button",text:e.source==="local"?"Share & use as room music":"Use as room music",onClick:()=>{this.#fc(e)}})),c.append(s("button",{type:"button",text:"Rename",onClick:()=>this.#Nc(e)}),s("button",{type:"button",text:"Move up",onClick:()=>this.#Bl(e,-1)}),s("button",{type:"button",text:"Move down",onClick:()=>this.#Bl(e,1)})),e.source!=="local"){let h=s("a",{text:"Open original"});h.href=e.locator,h.target="_blank",h.rel="noopener noreferrer",c.append(h)}c.append(s("button",{className:"kl-music-track-delete",type:"button",text:"Remove",onClick:()=>{this.#Ac(e)}})),l.append(d,c);let p=s("article",{className:"kl-music-track"},s("span",{className:"kl-music-track-number",text:(t+1).toString()}),a,s("div",{className:"kl-music-track-copy"},s("strong",{text:e.title}),s("span",{text:o?"Local file missing on this device":e.source==="local"?"On this device":e.source==="catbox"?"Catbox":"Direct link"})),l);return p.dataset.active=String(this.#Ye===e.id),p.dataset.trackId=e.id,p}async#fc(e){let t=!1;try{t=this.adapter.getRoomAdminSnapshot()?.isAdmin===!0}catch{}if(!t){this.#n("Only a room administrator can change room music.","error");return}let i=this.settings.get().linkChat.imageUploads,n=e.source==="local"&&i.enabled?Le(i):null;if(e.source==="local"&&!n){this.#n("Enable temporary shared uploads in Chat settings first.","error"),this.#fi("chat");return}let{token:o,controller:a}=this.#ms(!1);try{e.source==="local"&&n&&this.#n(`Sharing \u201C${e.title}\u201D for ${ii(n.retention)}\u2026`);let l=await this.#Kl(e,n??void 0,a.signal);if(!this.#mr(o,a))return;if(!this.adapter.getRoomAdminSnapshot()?.isAdmin)throw new Error("Room administrator rights were lost before the music was ready");if(await this.#us(!0),!this.#mr(o,a))return;this.#V.value=l,this.#n(e.source==="local"&&n?`Music shared for ${ii(n.retention)}. Review it, then apply room media.`:"Music selected. Review it, then apply room media.")}catch(l){if(!this.#mr(o,a))return;this.#n(l instanceof Error?l.message:"The room music could not be prepared.","error")}finally{this.#ai===a&&(this.#ai=void 0,this.#un=!1)}}async#bc(){if(this.#xe.disabled)return;this.#fs();let e=new AbortController;this.#pn=e,this.#xe.disabled=!0,this.#$e.textContent="";let t=[],i=new Set,n=!1;try{let o=this.settings.get().linkMusic.playlists.reduce((d,c)=>d+c.tracks.length,0),a=[...this.#Ze.files??[]],l=Math.max(1,a.length);if(o+l>100)throw new Error(`You can add ${Math.max(0,100-o)} more tracks`);if(a.length>0)for(let[d,c]of a.entries()){if(e.signal.aborted)throw new Error("The upload was cancelled");let u,p,h=c.name.replace(/\.[^.]+$/u,"");if(this.#yi.value==="catbox"){if(!pe())throw new Error("Catbox uploads are unavailable in FUSAM");if(this.#$e.textContent=`Uploading ${d+1}/${a.length} to Catbox\u2026`,p=await $s(c,void 0,m=>{if(e.signal.aborted)return;let f=m.percent===void 0?"":` \xB7 ${m.percent}%`;this.#$e.textContent=`Uploading ${d+1}/${a.length}${f}`},e.signal),e.signal.aborted)throw new Error("The upload was cancelled");u="catbox"}else{this.#$e.textContent=`Saving ${d+1}/${a.length} on this device\u2026`;let m=await this.#ks(),f=await this.musicStore.add(c);if(this.#es.add(f.id),i.add(f.id),e.signal.aborted)throw new Error("The operation was cancelled");p=f.id,h=f.name.replace(/\.[^.]+$/u,""),u="local",m.add(f.id)}t.push({id:ti("track"),title:((a.length===1?this.#bt.value.trim():"")||h||"Untitled track").slice(0,80),source:u,locator:p,addedAt:Date.now()})}else{let d=Tm(this.#st.value);t.push({id:ti("track"),title:(this.#bt.value.trim()||_m(d)||"Untitled track").slice(0,80),source:"url",locator:d,addedAt:Date.now()})}if(e.signal.aborted)throw new Error("The operation was cancelled");this.#Hl(t),n=!0,this.#vs(i),this.#bt.value="",this.#st.value="",this.#Ze.value="",this.#$e.textContent=t.length===1?`Added \u201C${t[0].title}\u201D.`:`Added ${t.length} tracks.`,await this.#_e()}catch(o){if(e.signal.aborted||this.#pn!==e||!this.#P)return;let a=o instanceof Error?o.message:"The track could not be added.";t.length>0&&!n?(this.#Hl(t),n=!0,this.#vs(i),this.#bt.value="",this.#st.value="",this.#Ze.value="",await this.#_e(),this.#$e.textContent=`Added ${t.length}; stopped because: ${a}`):this.#$e.textContent=a,this.#n(this.#$e.textContent,"error")}finally{n||(this.#vs(i),this.#ys(this.settings.get())),this.#pn===e&&(this.#pn=void 0),this.#xe.disabled=!1}}#kc(){if(this.settings.get().linkMusic.playlists.length>=8){this.#n("KikiLink supports up to 8 playlists.","error");return}let t=(typeof prompt=="function"?prompt("Playlist name","New playlist"):"New playlist")?.trim().slice(0,60);if(!t)return;let i=ti("playlist");this.settings.update(n=>{n.linkMusic.playlists.push({id:i,name:t,tracks:[]}),n.linkMusic.activePlaylistId=i}),this.#_e()}#yc(){let e=this.settings.get().linkMusic,t=se(e.playlists,e.activePlaylistId),n=(typeof prompt=="function"?prompt("Playlist name",t.name):t.name)?.trim().slice(0,60);!n||n===t.name||(this.settings.update(o=>{se(o.linkMusic.playlists,o.linkMusic.activePlaylistId).name=n}),this.#_e())}#vc(){let e=this.settings.get().linkMusic;if(e.playlists.length>=8){this.#n("KikiLink supports up to 8 playlists.","error");return}let t=se(e.playlists,e.activePlaylistId);if(e.playlists.reduce((o,a)=>o+a.tracks.length,0)+t.tracks.length>100){this.#n("Duplicating this playlist would exceed 100 saved tracks.","error");return}let n=ti("playlist");this.settings.update(o=>{let a=se(o.linkMusic.playlists,o.linkMusic.activePlaylistId);o.linkMusic.playlists.push({id:n,name:`${a.name} copy`.slice(0,60),tracks:a.tracks.map(l=>({...l,id:ti("track"),addedAt:Date.now()}))}),o.linkMusic.activePlaylistId=n}),this.#_e()}async#xc(){let e=this.settings.get().linkMusic,t=se(e.playlists,e.activePlaylistId);if(t.tracks.length===0||typeof confirm=="function"&&!confirm(`Remove all tracks from \u201C${t.name}\u201D?`))return;let i=[...t.tracks];this.#Ye&&i.some(n=>n.id===this.#Ye)&&this.#yo(),this.settings.update(n=>{se(n.linkMusic.playlists,n.linkMusic.activePlaylistId).tracks=[]}),await this.#xs(i),await this.#_e()}async#wc(){let e=this.settings.get().linkMusic,t=se(e.playlists,e.activePlaylistId);if(e.playlists.length<=1){this.#n("Keep at least one playlist.","error");return}if(typeof confirm=="function"&&!confirm(`Delete playlist \u201C${t.name}\u201D?`))return;let i=[...t.tracks],n=new Set(i.map(o=>o.id));this.#Ye&&n.has(this.#Ye)&&this.#yo(),this.settings.update(o=>{o.linkMusic.playlists=o.linkMusic.playlists.filter(a=>a.id!==t.id),o.linkMusic.activePlaylistId=o.linkMusic.playlists[0].id}),await this.#xs(i),await this.#_e()}async#Ac(e){this.#Ye===e.id&&this.#yo(),this.settings.update(t=>{let i=se(t.linkMusic.playlists,t.linkMusic.activePlaylistId);i.tracks=i.tracks.filter(n=>n.id!==e.id)}),await this.#xs([e]),await this.#_e()}#Nc(e){let i=(typeof prompt=="function"?prompt("Track title",e.title):e.title)?.trim().slice(0,80);!i||i===e.title||(this.settings.update(n=>{let a=se(n.linkMusic.playlists,n.linkMusic.activePlaylistId).tracks.find(l=>l.id===e.id);a&&(a.title=i)}),this.#_e())}#Bl(e,t){this.settings.update(i=>{let n=se(i.linkMusic.playlists,i.linkMusic.activePlaylistId),o=n.tracks.findIndex(d=>d.id===e.id),a=o+t;if(o<0||a<0||a>=n.tracks.length)return;let[l]=n.tracks.splice(o,1);l&&n.tracks.splice(a,0,l)}),this.#_e()}async#Xo(e){let t;if(e.source==="local"){let i=await this.musicStore.get(e.locator);if(!i){this.#n("This local track is not stored on this device.","error"),await this.#_e();return}this.#Yo(),t=URL.createObjectURL(i.blob),this.#zo=t}else this.#Yo(),t=e.locator;this.#Ye=e.id,this.#N.src=t,this.#N.load();try{await this.#N.play()}catch(i){this.#n(i instanceof Error?i.message:"The browser blocked playback.","error")}await this.#_e()}async#Ul(){if(!this.#Ye){let e=this.settings.get().linkMusic,t=se(e.playlists,e.activePlaylistId).tracks[0];t&&await this.#Xo(t);return}if(this.#N.paused)try{await this.#N.play()}catch(e){this.#n(e instanceof Error?e.message:"The browser blocked playback.","error")}else this.#N.pause()}async#Fl(){if(this.#N.currentTime>3){this.#N.currentTime=0;return}let e=this.settings.get().linkMusic,t=se(e.playlists,e.activePlaylistId).tracks;if(t.length===0)return;let i=t.findIndex(o=>o.id===this.#Ye),n=t[(i<=0?t.length:i)-1];n&&await this.#Xo(n)}async#bs(e){let t=this.settings.get().linkMusic,i=se(t.playlists,t.activePlaylistId).tracks;if(i.length===0)return;if(e&&t.repeatMode==="one"){this.#N.currentTime=0,await this.#N.play().catch(()=>{});return}let n=i.findIndex(l=>l.id===this.#Ye),o=n+1;if(t.shuffle&&i.length>1)do o=Math.floor(Math.random()*i.length);while(o===n);else if(o>=i.length)if(!e||t.repeatMode==="all")o=0;else{this.#N.pause(),this.#N.currentTime=0,this.#qr();return}let a=i[Math.max(0,o)];a&&await this.#Xo(a)}#Cc(){this.settings.update(e=>{e.linkMusic.repeatMode=e.linkMusic.repeatMode==="off"?"all":e.linkMusic.repeatMode==="all"?"one":"off"}),this.#_e()}#Mc(){this.settings.update(e=>{e.linkMusic.shuffle=!e.linkMusic.shuffle}),this.#_e()}#qr(){let t=this.settings.get().linkMusic.playlists.flatMap(i=>i.tracks).find(i=>i.id===this.#Ye);this.#Zt.textContent=t?.title??"Nothing playing",this.#vi.textContent=t?t.source==="local"?"On this device":t.source==="catbox"?"Catbox":"Direct link":"Choose a track",this.#Mt.replaceChildren(w(t&&!this.#N.paused?"pause":"play")),this.#Mt.title=t&&!this.#N.paused?"Pause":"Play",this.#Mt.setAttribute("aria-label",this.#Mt.title),this.#lt.dataset.playing=String(!!(t&&!this.#N.paused)),this.#St.textContent=this.#N.muted?"Unmute":"Mute",this.#St.dataset.active=String(this.#N.muted),this.#ko();for(let i of this.#q.querySelectorAll(".kl-music-track")){let n=i.querySelector(".kl-music-track-play");if(!n)continue;let o=i.dataset.trackId===t?.id;i.dataset.active=String(o),n.replaceChildren(w(o&&!this.#N.paused?"pause":"play"))}this.#Lc(t)}#ko(){let e=Number.isFinite(this.#N.duration)&&this.#N.duration>0?this.#N.duration:0,t=Number.isFinite(this.#N.currentTime)?this.#N.currentTime:0;this.#ae.value=e>0?Math.round(Math.min(1,t/e)*1e3).toString():"0",this.#ae.disabled=e<=0,this.#Te.textContent=`${Hl(t)} / ${Hl(e)}`,this.#Ec(t,e)}#yo(){this.#N.pause(),this.#N.removeAttribute("src"),this.#Ye=void 0,this.#Yo(),this.#qr()}#Hl(e){e.length!==0&&this.settings.update(t=>{se(t.linkMusic.playlists,t.linkMusic.activePlaylistId).tracks.push(...e)})}async#ks(e=!1){if(!e&&this.#do)return this.#do;if(!e&&this.#co)return this.#co;let t=this.musicStore.list().catch(()=>[]).then(i=>(this.#do=new Set(i.map(n=>n.id)),this.#do));this.#co=t;try{return await t}finally{this.#co===t&&(this.#co=void 0)}}async#ys(e){if(!this.musicStore.reconcile)return;let t=Jl(e),i=new Set(this.#es);try{let n=await this.musicStore.reconcile(t,i);for(let o of n)this.#do?.delete(o),this.#xn.delete(o)}catch{}}#vs(e){for(let t of e)this.#es.delete(t);this.musicStore.releaseStaged?.(e)}async#xs(e){let t=new Set(e.filter(o=>o.source==="local").map(o=>o.locator));if(t.size===0)return;let i=new Set(this.settings.get().linkMusic.playlists.flatMap(o=>o.tracks.filter(a=>a.source==="local").map(a=>a.locator))),n=await this.#ks();await Promise.all([...t].filter(o=>!i.has(o)).map(async o=>{await this.musicStore.delete(o).catch(()=>{}),n.delete(o),this.#xn.delete(o)}))}#Sc(){this.#$l();let e=this.#Ke.value;if(e==="off"){this.#ti.textContent="";return}if(e==="end"){this.#jo=!0,this.#ti.textContent="Playback will stop after this track.";return}let t=Number(e);if(!Number.isFinite(t)||t<=0)return;let i=Date.now()+t*6e4;this.#ti.textContent=`Stops at ${new Date(i).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}.`,this.#uo=setTimeout(()=>{this.#uo=void 0,this.#Ke.value="off",this.#ti.textContent="Sleep timer finished.",this.#yo()},t*6e4)}#$l(){this.#uo!==void 0&&clearTimeout(this.#uo),this.#uo=void 0,this.#jo=!1}#Rc(){if(!("mediaSession"in navigator))return;let e={play:()=>{this.#Ul()},pause:()=>this.#N.pause(),previoustrack:()=>{this.#Fl()},nexttrack:()=>{this.#bs(!1)},seekbackward:t=>{this.#N.currentTime=Math.max(0,this.#N.currentTime-(t.seekOffset??10))},seekforward:t=>{this.#N.currentTime=Math.min(this.#N.duration||1/0,this.#N.currentTime+(t.seekOffset??10))},seekto:t=>{typeof t.seekTime=="number"&&(this.#N.currentTime=t.seekTime)}};for(let[t,i]of Object.entries(e))try{navigator.mediaSession.setActionHandler(t,i)}catch{}}#Lc(e){if("mediaSession"in navigator)try{if(navigator.mediaSession.playbackState=e?this.#N.paused?"paused":"playing":"none",!e){navigator.mediaSession.metadata=null;return}if(typeof MediaMetadata=="function"){let t=this.settings.get().linkMusic;navigator.mediaSession.metadata=new MediaMetadata({title:e.title,artist:"KikiLink",album:se(t.playlists,t.activePlaylistId).name,artwork:[{src:Fr,type:"image/webp"}]})}}catch{}}#Ec(e,t){if(!(!("mediaSession"in navigator)||t<=0))try{navigator.mediaSession.setPositionState({duration:t,playbackRate:this.#N.playbackRate||1,position:Math.max(0,Math.min(e,t))})}catch{}}#Pc(){if("mediaSession"in navigator){for(let e of["play","pause","previoustrack","nexttrack","seekbackward","seekforward","seekto"])try{navigator.mediaSession.setActionHandler(e,null)}catch{}try{navigator.mediaSession.metadata=null,navigator.mediaSession.playbackState="none"}catch{}}}#Yo(){this.#zo&&(URL.revokeObjectURL(this.#zo),this.#zo=void 0)}async#Kl(e,t,i){if(e.source!=="local"){let l=Fl(e.locator);if(!l)throw new Error("Bondage Club room music must use a direct HTTPS MP3 or MP4 link");return l}if(!t)throw new Error("Enable temporary shared uploads in Chat settings first");let n=this.#xn.get(e.locator);if(n&&n.expiresAt>Date.now()+6e4)return n.url;if(this.#xn.delete(e.locator),!i)throw new Error("The room-music upload lifecycle is unavailable");let o=this.#wn.get(e.locator);if(o&&!o.signal.aborted)return o.promise;o&&this.#wn.delete(e.locator);let a=(async()=>{let l=await this.musicStore.get(e.locator);if(i.aborted)throw new Error("The upload was cancelled");if(!l)throw new Error("This local track is not stored on this device");let d=await no($m(l),t,void 0,i);if(i.aborted)throw new Error("The upload was cancelled");return this.#xn.set(e.locator,{url:d,expiresAt:Date.now()+Vl(t.retention)}),d})();this.#wn.set(e.locator,{promise:a,signal:i});try{return await a}finally{this.#wn.get(e.locator)?.promise===a&&this.#wn.delete(e.locator)}}async#zl(e=!1){if(!this.#ci||!this.#Ye||this.#N.paused)return;let i=this.settings.get().linkMusic.playlists.flatMap(u=>u.tracks).find(u=>u.id===this.#Ye);if(!i)return;let n=this.adapter.getRoomAdminSnapshot();if(!n?.isAdmin){this.#ci=!1,this.#be.checked=!1,this.#ke.textContent="Playlist follow stopped because you are not a room administrator.",e&&this.#n(this.#ke.textContent,"error");return}let o=this.#Wo(n),a=this.settings.get().linkChat.imageUploads,l=i.source==="local"&&a.enabled?Le(a):null;if(i.source==="local"&&!l){this.#ke.textContent="Enable temporary shared uploads in Chat settings to use device tracks as room music.",e&&this.#n(this.#ke.textContent,"error");return}let{token:d,controller:c}=this.#ms(!0);try{i.source==="local"&&l&&(this.#ke.textContent=`Sharing \u201C${i.title}\u201D for room playback\u2026`);let u=i.id,p=await this.#Kl(i,l??void 0,c.signal);if(!this.#mr(d,c)||!this.#ci||this.#Ye!==u||this.#N.paused||!e&&p===this.#ts)return;let h=this.adapter.getRoomAdminSnapshot();if(!h?.isAdmin){this.#ci=!1,this.#be.checked=!1,this.#ke.textContent="Playlist follow stopped because you are not a room administrator.",e&&this.#n(this.#ke.textContent,"error");return}let m=this.#Wo(h);if(m.roomName!==o.roomName||m.roomSpace!==o.roomSpace)return;this.adapter.updateRoomCustomization({...h.customization,musicUrl:p,musicSync:!0}),this.#ts=p,this.#V.value=p,this.#Qe.checked=!0,this.#ke.textContent=`Room now follows \u201C${i.title}\u201D.`}catch(u){if(!this.#mr(d,c))return;this.#ke.textContent=u instanceof Error?u.message:"The room music could not be updated.",e&&this.#n(this.#ke.textContent,"error")}finally{this.#ai===c&&(this.#ai=void 0,this.#un=!1)}}#Ic(){let e=s("header",{className:"kl-feature-page-header"},s("div",{className:"kl-feature-page-heading"},s("div",{className:"kl-feature-page-eyebrow",text:"PEOPLE"}),s("h1",{className:"kl-feature-page-title",text:"Players"}),this.#Ys),s("button",{className:"kl-text-button",type:"button",text:"New chat",onClick:()=>this.#wo()}));for(let[a,l]of[["current","In room"],["known","Known"],["favorites","Favorites"]]){let d=s("button",{className:"kl-roster-scope",type:"button",text:l});d.dataset.scope=a,d.addEventListener("click",()=>{this.#Bi(!1),this.#dn=a,this.#ht=void 0,this.#mt()}),this.#ka.append(d)}this.#Ni.type="search",this.#Ni.placeholder="Search name, number, tag, or note",this.#Ni.autocomplete="off",this.#Ni.addEventListener("input",()=>this.#mt());let t=s("section",{className:"kl-roster-list-pane"},this.#ka,this.#Ni,this.#Bn),i=s("div",{className:"kl-roster-body"},t,this.#Mo),n=s("div",{className:"kl-roster-privacy",text:"Notes, tags, favorites, and encounter history belong only to this BC account."}),o=s("footer",{className:"kl-feature-page-footer"},n);this.#in.addEventListener("click",()=>this.#Bi(!0)),this.#Ji.maxLength=2e3,this.#Ji.rows=7,this.#Ji.placeholder="Private note about this player\u2026",this.#Ji.addEventListener("input",()=>{this.#Kt=!0,this.#in.disabled=!1}),this.#Ji.addEventListener("keydown",a=>{a.key==="Enter"&&(a.ctrlKey||a.metaKey)&&(a.preventDefault(),this.#Bi(!0))}),this.#tn.maxLength=200,this.#tn.placeholder="friend, roleplay, trusted",this.#tn.addEventListener("input",()=>{this.#Kt=!0,this.#in.disabled=!1}),this.#ba.append(e,i,o)}#vo(e){if(!this.settings.get().linkRoster.enabled){this.#fi("players"),this.#Zr.focus(),this.#n("Enable LinkRoster here to add it back to your deck.");return}this.#Pt("roster"),this.roster.sync(),this.#Ni.value="";let t=e===void 0?void 0:this.roster.list("known").find(i=>i.memberNumber===e);this.#dn=t?.present===!0?"current":e!==void 0?"known":this.adapter.isInChatRoom()?"current":"known",this.#ht=e,this.#Kt=!1,this.#mt(),e!==void 0?this.#Bn.querySelector(`[data-member-number="${e}"]`)?.querySelector(".kl-roster-entry-select")?.focus():this.#Ni.focus()}#mt(){let e=this.adapter.getCurrentRoomName();this.#Ys.textContent=e?`${e} \xB7 private player notebook`:"Private player notebook";for(let n of this.#ka.querySelectorAll(".kl-roster-scope"))n.dataset.active=String(n.dataset.scope===this.#dn);let t=this.roster.list(this.#dn,this.#Ni.value);if(t.some(n=>n.memberNumber===this.#ht)||(this.#ht=t[0]?.memberNumber,this.#Kt=!1),this.#Bn.replaceChildren(),t.length===0)this.#Bn.append(s("div",{className:"kl-roster-empty",text:this.#dn==="current"&&!this.adapter.isInChatRoom()?"Join a chat room to see its roster.":this.#dn==="favorites"?"No favorite players yet. Use the star on any player.":this.#Ni.value?"No players match this search.":"No players recorded yet."}));else{for(let n of t)this.#Bn.append(this.#Tc(n));this.presence.requestMany(t.slice(0,60).map(n=>n.memberNumber))}let i=t.find(n=>n.memberNumber===this.#ht);this.#Kt||this.#_c(i)}#Tc(e){let t=this.presence.get(e.memberNumber),i=s("div",{className:"kl-roster-entry-badges"});e.present&&i.append(s("span",{className:"kl-roster-badge kl-roster-live",text:"HERE"}));let n=s("span",{className:"kl-roster-badge kl-roster-presence-label",text:Ie(t.status)});n.dataset.status=t.status,n.dataset.presenceLabel="true",n.hidden=t.status==="unknown",i.append(n),e.isFriend&&i.append(s("span",{className:"kl-roster-badge kl-roster-friend",text:"FRIEND"}));for(let u of e.relationships)i.append(s("span",{className:`kl-roster-badge kl-roster-relationship kl-roster-relationship--${u}`,text:So(u).toUpperCase(),title:Ro(u)}));e.favorite&&i.append(w("star","kl-roster-favorite",!0));let o=e.tags.length?e.tags.join(" \xB7 "):e.note?e.note.replace(/\s+/gu," "):e.lastRoomName||`Member ${e.memberNumber}`,a=s("button",{className:"kl-avatar-button kl-roster-entry-avatar-button",type:"button",ariaLabel:`Open KikiLink profile for ${e.displayName}`},s("span",{className:"kl-avatar-wrap"},this.#Tn(e.displayName,e.memberNumber),ge(t.status))),l=s("button",{className:"kl-roster-entry-select",type:"button",ariaLabel:`Open private notes for ${e.displayName}`},s("div",{className:"kl-roster-entry-copy"},s("div",{className:"kl-roster-entry-name-row"},s("span",{className:"kl-roster-entry-name",text:e.displayName}),i),s("div",{className:"kl-roster-entry-preview",text:o})),s("span",{className:"kl-roster-entry-time",text:e.present?"now":_i(e.lastSeenAt)})),d=s("div",{className:"kl-roster-entry"},a,l);d.dataset.selected=String(e.memberNumber===this.#ht),d.dataset.memberNumber=e.memberNumber.toString(),l.addEventListener("click",()=>{e.memberNumber!==this.#ht&&(this.#Bi(!1),this.#ht=e.memberNumber,this.#Kt=!1,this.#mt())});let c=()=>({memberNumber:e.memberNumber,displayName:e.displayName});return this.#mi(a,c),this.#mi(l,c),a.addEventListener("click",u=>{u.stopPropagation(),this.#zr(e.memberNumber,e.displayName,a)}),d}#_c(e){if(this.#Mo.replaceChildren(),!e){this.#Mo.append(s("div",{className:"kl-roster-detail-empty",text:"Select a player to open quick actions and private notes."}));return}let t=s("button",{className:"kl-icon-button kl-roster-star",type:"button",title:e.favorite?"Remove from favorites":"Add to favorites",ariaLabel:e.favorite?"Remove from favorites":"Add to favorites",onClick:()=>{this.#Bi(!1),this.roster.toggleFavorite(e.memberNumber,e.displayName),this.#Kt=!1,this.#mt()}});t.append(w("star","kl-favorite-icon",e.favorite));let i=this.presence.get(e.memberNumber),n=s("div",{className:"kl-roster-detail-badges"});e.present&&n.append(s("span",{className:"kl-roster-badge kl-roster-live",text:"HERE"})),e.isFriend&&n.append(s("span",{className:"kl-roster-badge kl-roster-friend",text:"FRIEND"}));for(let g of e.relationships)n.append(s("span",{className:`kl-roster-badge kl-roster-relationship kl-roster-relationship--${g}`,text:So(g).toUpperCase(),title:Ro(g)}));let o=s("button",{className:"kl-avatar-button kl-roster-detail-avatar-button",type:"button",ariaLabel:`Open KikiLink profile for ${e.displayName}`},s("span",{className:"kl-avatar-wrap"},this.#Tn(e.displayName,e.memberNumber,"kl-roster-avatar"),ge(i.status)));this.#mi(o,()=>({memberNumber:e.memberNumber,displayName:e.displayName})),o.addEventListener("click",g=>{g.stopPropagation(),this.#zr(e.memberNumber,e.displayName,o)});let a=s("div",{className:"kl-roster-identity"},o,s("div",{className:"kl-roster-identity-copy"},s("div",{className:"kl-roster-name",text:e.displayName}),s("div",{className:"kl-roster-number",text:`Member ${e.memberNumber}${e.present?" \xB7 in this room":""}`}),n.childElementCount>0?n:null,s("div",{className:"kl-roster-detail-presence",title:Ii(i)},ge(i.status),s("span",{text:Ie(i.status)}),i.statusMessage?s("span",{className:"kl-presence-note",text:i.statusMessage}):null)),t);a.dataset.memberNumber=e.memberNumber.toString();let l=a.querySelector(".kl-roster-detail-presence");l&&(l.dataset.presenceDescription="true");let d=l?.querySelector("span:not(.kl-presence-dot)");d&&(d.dataset.presenceLabel="true");let c=s("button",{className:"kl-text-button",type:"button",text:"Whisper",title:e.present?"Set native Whisper target":"Player is not in this room",onClick:()=>this.#Oc(e)});c.disabled=!e.present;let u=s("button",{className:"kl-text-button",type:"button",text:"Beep",onClick:()=>{this.#Dc(e)}}),p=s("button",{className:"kl-text-button",type:"button",text:"Profile",title:e.present?"Open native profile":"Player is not in this room",onClick:()=>this.#Gc(e)});p.disabled=!e.present;let h=s("button",{className:"kl-text-button",type:"button",text:"Copy ID",onClick:()=>{this.#jl(e.memberNumber)}}),m=s("div",{className:"kl-roster-quick-actions"},c,u,p,h),f=s("div",{className:"kl-roster-stats"},this.#ws("Last seen",e.present?"Now":jr(e.lastSeenAt)),this.#ws("Last room",e.lastRoomName||"Not recorded"),this.#ws("Encounters",e.encounterCount.toString()));this.#tn.value=e.tags.join(", "),this.#Ji.value=e.note,this.#in.disabled=!0;let y=s("div",{className:"kl-roster-notebook"},s("label",{className:"kl-roster-field-label"},"Tags",this.#tn),s("label",{className:"kl-roster-field-label"},"Private note",this.#Ji),s("div",{className:"kl-roster-note-actions"},s("span",{className:"kl-setting-help",text:"Ctrl+Enter to save"}),this.#in));this.#Mo.append(a,m,f,y),this.#mi(a,()=>({memberNumber:e.memberNumber,displayName:e.displayName})),this.presence.request(e.memberNumber)}#ws(e,t){return s("div",{className:"kl-roster-stat"},s("div",{className:"kl-roster-stat-label",text:e}),s("div",{className:"kl-roster-stat-value",text:t}))}#Bi(e){if(!this.#Kt||this.#ht===void 0)return;let i=this.roster.list("known").find(o=>o.memberNumber===this.#ht)?.displayName??this.adapter.getMemberName(this.#ht),n=this.#tn.value.split(",").map(o=>o.trim()).filter(Boolean).slice(0,8);this.roster.saveNotebook(this.#ht,i,this.#Ji.value,n),this.#Kt=!1,this.#in.disabled=!0,e&&this.#n("Private player note saved."),this.#mt()}#Oc(e){this.#Bi(!1);try{this.adapter.startWhisper(e.memberNumber),this.close()}catch(t){this.#n(t instanceof Error?t.message:"Unable to start Whisper","error"),this.#mt()}}async#Dc(e){this.#Bi(!1),await this.openChat(e.memberNumber,e.displayName)}#Gc(e){this.#Bi(!1);try{this.adapter.openProfile(e.memberNumber),this.close()}catch(t){this.#n(t instanceof Error?t.message:"Unable to open profile","error"),this.#mt()}}async#jl(e){try{await ql(e.toString()),this.#n(`Member ${e} copied.`)}catch{this.#n("The browser blocked clipboard access.","error")}}#Bc(){this.#Po=new or(this.#xa,this.adapter,this.settings,this.activities,()=>{this.#gr(),this.#Ui()},(e,t)=>this.#n(e,t)),this.#Po.open()}#Jo(e){if(!this.settings.get().linkActivities.enabled){this.#fi("activities"),this.#rn.focus(),this.#n("Turn on the Custom Activities tab to open your activity builder.");return}this.#Pt("activities");let t=this.settings.get().linkActivities.customActivities;this.#sl=e!==void 0&&Number.isInteger(e)&&e>=0?e:0,this.#Po?.open(e===void 0?void 0:t[this.#sl]?.id)}#Uc(){this.#Po?.refresh()}#K(e,t,i){return s("div",{className:"kl-setting-row"},s("div",{className:"kl-setting-copy"},s("div",{className:"kl-setting-name",text:e}),s("div",{className:"kl-setting-help",text:t})),i)}#Qo(e,t){let i=s("button",{className:"kl-icon-button",type:"button",title:"Close",ariaLabel:e,onClick:t});return i.append(w("close")),i}async#Ui(e){if(!this.#P)return;let t=this.adapter.getOwnName().trim(),i=Fm();this.#A.textContent=t&&t.toLocaleLowerCase()!=="me"?`${i}, ${t}.`:`${i}.`;let n=e??await this.service.listConversations();if(!this.#P)return;let o=this.#tt?.listGroups()??[],a=n.length+o.length,l=typeof this.adapter.getOnlineFriends=="function"?this.adapter.getOnlineFriends().length:0,d=[...n].sort((u,p)=>p.lastMessageAt-u.lastMessageAt)[0],c=o.reduce((u,p)=>!u||p.lastMessageAt>u.lastMessageAt?p:u,void 0);this.#_a>0?this.#D.textContent=`${this.#_a} unread \xB7 ${a} chats`:c&&c.lastMessageAt>0&&(!d||c.lastMessageAt>d.lastMessageAt)?this.#D.textContent=`Last in ${c.title} \xB7 ${_i(c.lastMessageAt)}`:d&&d.lastMessageAt>0?this.#D.textContent=`Last with ${oe(d)} \xB7 ${_i(d.lastMessageAt)}`:a>0?this.#D.textContent=`${a} saved ${a===1?"chat":"chats"}`:l>0?this.#D.textContent=`${l} ${l===1?"friend":"friends"} online`:this.#D.textContent="Start your first Beep chat",this.#gr(),this.#Fc(n,d,o)}#Fc(e,t,i=[]){let n=e.find(h=>h.unread>0),o=i.find(h=>h.unread>0),a=e.reduce((h,m)=>h+m.unread,0),l=i.reduce((h,m)=>h+m.unread,0),d=i.reduce((h,m)=>!h||m.lastMessageAt>h.lastMessageAt?m:h,void 0),c=this.settings.get(),u=typeof this.adapter.isInChatRoom=="function"&&this.adapter.isInChatRoom(),p=typeof this.adapter.getCurrentRoomName=="function"?this.adapter.getCurrentRoomName()?.trim():void 0;if(this.#_.disabled=!1,n){let h=a;this.#Ii={kind:"chat",peerNumber:n.peerNumber,peerName:n.peerName},this.#I.replaceChildren(w("chat")),this.#M.textContent=`${h} unread ${h===1?"Beep":"Beeps"}`,this.#w.textContent=l>0?`Start with ${oe(n)}; ${l} unread group ${l===1?"message is":"messages are"} also waiting.`:h===n.unread?`Open the conversation with ${oe(n)} and continue when you are ready.`:`Start with ${oe(n)}, then work through the rest at your pace.`,this.#G.textContent=l>0?`${h} direct \xB7 ${l} group`:h===n.unread?`From ${oe(n)}`:"Across direct chats",this.#_.textContent=h===1?"Read message":"Read messages"}else o?(this.#Ii={kind:"group",groupId:o.groupId},this.#I.replaceChildren(w("users")),this.#M.textContent=`${o.unread} unread in ${o.title}`,this.#w.textContent="Open the group conversation and catch up with everyone.",this.#G.textContent=`${o.memberNumbers.length} members`,this.#_.textContent="Open group"):e.length===0&&i.length===0?(this.#Ii={kind:"new-chat"},this.#I.replaceChildren(w("plus")),this.#M.textContent="Start your first chat",this.#w.textContent="Choose someone you know or enter a member number. KikiLink keeps the conversation together.",this.#G.textContent="Takes only a moment",this.#_.textContent="Start a chat"):c.linkRoster.enabled&&u&&this.#or>0?(this.#Ii={kind:"roster"},this.#I.replaceChildren(w("users")),this.#M.textContent=p?`See who is in ${p}`:"See who is here",this.#w.textContent="Open Players to Whisper, Beep, view a profile, or add a private note.",this.#G.textContent=`${this.#or} ${this.#or===1?"person":"people"} here now`,this.#_.textContent="View players"):d&&(!t||d.lastMessageAt>t.lastMessageAt)?(this.#Ii={kind:"group",groupId:d.groupId},this.#I.replaceChildren(w("users")),this.#M.textContent=`Continue in ${d.title}`,this.#w.textContent="Pick up your most recent group conversation.",this.#G.textContent=`${d.memberNumbers.length} members`,this.#_.textContent="Open group"):t?(this.#Ii={kind:"chat",peerNumber:t.peerNumber,peerName:t.peerName},this.#I.replaceChildren(w("chat")),this.#M.textContent=`Continue with ${oe(t)}`,this.#w.textContent="Pick up your most recent Beep conversation.",this.#G.textContent=t.lastMessageAt>0?_i(t.lastMessageAt):"Conversation ready",this.#_.textContent="Open chat"):(this.#Ii={kind:"chat"},this.#I.replaceChildren(w("chat")),this.#M.textContent="Open your chats",this.#w.textContent="Find a conversation or start a new Beep.",this.#G.textContent="Recent chats are kept together",this.#_.textContent="Open Chat");this.#_.dataset.action=this.#Ii.kind}#gr(){let e=this.settings.get(),t=typeof this.adapter.isInChatRoom=="function"&&this.adapter.isInChatRoom(),i=typeof this.adapter.getCurrentRoomName=="function"?this.adapter.getCurrentRoomName():void 0;this.#O.textContent=this.#l.textContent||"Connecting",this.#O.dataset.state=this.#Da,this.#U.textContent=i||(t?"Unnamed room":"Not in a chat room"),this.#Zo(),this.#Gn.dataset.available=String(e.linkRoster.enabled),this.#Q.dataset.available=String(e.linkRoster.enabled),this.#re.textContent=e.linkRoster.enabled?this.#or>0?`${this.#or} ${this.#or===1?"person":"people"} here now`:t?"No other players in this room":"Open while you are in a room":"Disabled \xB7 tap to enable",this.#me.textContent=e.linkRoster.enabled?"View players":"Turn on Players",this.#So.dataset.available=String(e.linkActivities.enabled),this.#So.hidden=!e.linkActivities.enabled,this.#ue.dataset.available=String(e.linkActivities.enabled),this.#Oe.textContent=e.linkActivities.enabled?e.linkActivities.customActivities.length>0?`${e.linkActivities.customActivities.length} custom ${e.linkActivities.customActivities.length===1?"activity":"activities"}`:"No custom activities yet":"Hidden \xB7 tap to enable",this.#ye.textContent=e.linkActivities.enabled?"Manage activities":"Show Custom tab";let n=e.linkChat.gallery.saved.length+this.#hl;this.#De.textContent=n>0?`${n} saved ${n===1?"image":"images"} \xB7 chat media included`:"Chat media plus images you add directly";let o=e.ui.theme==="light"?"Light paper":e.ui.theme==="system"?"System theme":"Dark lacquer",a=e.ui.density==="super-compact"?"Super compact":e.ui.density==="compact"?"Compact":"Comfortable";this.#he.textContent=`${o} \xB7 ${a} \xB7 ${e.ui.accent.toUpperCase()}`}#Zo(){let e=this.settings.get().linkPresence.enabled,t=this.adapter.getOwnMemberNumber(),i=this.adapter.getOwnName(),n=this.presence.get(t),o=e?Ie(n.status):"Presence off";this.#Qs.dataset.status=e?n.status:"unknown",this.#tl.textContent=i,this.#il.textContent=n.statusMessage?`${o} \xB7 ${n.statusMessage}`:o,this.#Nt(this.#Zs,i,t,n.avatarUrl),this.#zn.title=n.statusMessage?`${i}: ${o} \xB7 ${n.statusMessage}`:`KikiLink status: ${o}`,this.#X.replaceChildren(ge(e?n.status:"unknown"),s("span",{text:o})),this.#X.title=this.#zn.title}#Vl(){this.#cn!==void 0&&clearTimeout(this.#cn);let e=new Date;this.#jn.dateTime=e.toISOString(),this.#jn.textContent=Po.format(e),this.#jn.title=`Local time \xB7 ${Sm.format(e)}`,this.#cn=setTimeout(()=>this.#Vl(),Math.max(1e3,6e4-Date.now()%6e4+25))}#As(){if(this.#W.replaceChildren(),this.#Y.replaceChildren(),this.#k===void 0){this.#Ns();return}let e=this.presence.get(this.#k);this.#Nt(this.#j,this.#$t,this.#k),this.#W.append(ge(e.status),s("span",{text:Ie(e.status)})),e.statusMessage&&this.#W.append(s("span",{className:"kl-presence-note",text:e.statusMessage})),e.roomName?(this.#Y.replaceChildren(w("location","kl-chat-room-icon"),s("span",{className:"kl-chat-room-name",text:e.roomName})),this.#Y.hidden=!1,this.#Y.title=`Current room: ${e.roomName}`):(this.#Y.hidden=!0,this.#Y.removeAttribute("title")),this.#W.title=Ii(e),this.#Ns()}#Ns(){let e=this.settings.get().linkChat.typingIndicators&&this.#k!==void 0&&this.presence.isTyping(this.#k);if(this.#Se.hidden=!e,!e){this.#Se.replaceChildren();return}this.#Se.replaceChildren(s("span",{className:"kl-typing-name",text:`${this.#$t} is typing`}),s("span",{className:"kl-typing-dots",ariaLabel:""},s("i"),s("i"),s("i")))}#ql(e,t,i){let n=this.#hn;n&&n.peerNumber!==e&&this.#xo(),this.#hn={peerNumber:e,peerName:t,value:i},this.#si!==void 0&&clearTimeout(this.#si),this.#si=setTimeout(()=>{this.#si=void 0,this.#xo()},250)}#xo(e){let t=this.#hn;return!t||e!==void 0&&t.peerNumber!==e?Promise.resolve():(this.#si!==void 0&&clearTimeout(this.#si),this.#si=void 0,this.#hn=void 0,this.service.setDraft(t.peerNumber,t.peerName,t.value).then(()=>{}).catch(()=>{}))}#Cs(e){let t=this.#hn;!t||e!==void 0&&t.peerNumber!==e||(this.#si!==void 0&&clearTimeout(this.#si),this.#si=void 0,this.#hn=void 0)}#Hc(){if(this.#jt!==void 0&&clearTimeout(this.#jt),this.#jt=void 0,this.#k===void 0||!this.#T.value.trim()){this.#fr();return}this.presence.setTyping(this.#k,!0),this.#jt=setTimeout(()=>{this.#jt=void 0,this.#k!==void 0&&this.presence.setTyping(this.#k,!1,!0)},2400)}#fr(){this.#jt!==void 0&&clearTimeout(this.#jt),this.#jt=void 0,this.#k!==void 0&&this.presence.setTyping(this.#k,!1,!0)}#ea(e){e===void 0?this.#Bo=!0:this.#Uo.add(e),this.#gn===void 0&&(this.#gn=requestAnimationFrame(()=>{this.#gn=void 0;let t=this.#Bo,i=[...this.#Uo];this.#Bo=!1,this.#Uo.clear(),this.#$c(t?void 0:i),(t||this.#k!==void 0&&i.includes(this.#k))&&this.#As();let n;try{let o=this.adapter.getOwnMemberNumber();Number.isSafeInteger(o)&&o>0&&(n=o)}catch{}if(n!==void 0&&(t||i.includes(n))&&this.#gr(),this.#At&&(t||i.includes(this.#At.memberNumber))){let o="";try{o=$l(this.presence.get(this.#At.memberNumber))}catch{}o!==this.#no&&this.#Nn()}t&&this.#Ui()}))}#$c(e){let t=e?new Set(e):void 0;for(let i of this.#t.querySelectorAll("[data-member-number]")){let n=Number(i.dataset.memberNumber);if(!Number.isSafeInteger(n)||t&&!t.has(n))continue;let o=this.presence.get(n);for(let d of i.querySelectorAll(".kl-presence-dot"))d.dataset.status=o.status;for(let d of i.querySelectorAll("[data-presence-label]"))d.textContent=Ie(o.status),d.dataset.status=o.status,d.hidden=o.status==="unknown";let a=i.querySelector("[data-presence-description]");a&&(a.title=Ii(o));let l=i.matches("[data-kikilink-avatar]")?i:i.querySelector("[data-kikilink-avatar]");if(l){let d=l.dataset.avatarName||`Member ${n}`;if(!l.dataset.avatarName)try{d=this.adapter.getMemberName(n)}catch{}this.#Nt(l,d,n)}}}async#Wr(e){if(!this.#P)return;let t=++this.#Do,i=this.#ee.value.trim().toLocaleLowerCase(),n=e??await this.service.listConversations();if(!this.#P||t!==this.#Do)return;for(let f of n){let y=this.adapter.getMemberNickname(f.peerNumber);if(y&&y!==f.peerName&&(f.peerName=y,this.service.setPeerName(f.peerNumber,y)),f.peerNumber===this.#k){let g=oe(f);this.#$t=g,this.#Pi=f.peerName,this.#Ge.textContent=g,this.#Nt(this.#j,g,f.peerNumber)}}this.#Wl(n);let o=n.filter(f=>i?oe(f).toLocaleLowerCase().includes(i)||f.peerName.toLocaleLowerCase().includes(i)||f.peerNumber.toString().includes(i)||f.lastMessage.toLocaleLowerCase().includes(i):!0).slice(0,200),a=(this.#tt?.listGroups()??[]).filter(f=>i?[f.title,f.lastMessage,...f.memberNumbers.map(String),...f.memberNumbers.map(y=>f.memberNames[String(y)]??"")].some(y=>y.toLocaleLowerCase().includes(i)):!0),l=[...o.map(f=>({kind:"direct",conversation:f,pinned:f.pinned,updatedAt:f.lastMessageAt})),...a.map(f=>({kind:"group",group:f,pinned:f.pinned,updatedAt:f.lastMessageAt||f.updatedAt||f.createdAt}))].sort((f,y)=>Number(y.pinned)-Number(f.pinned)||y.updatedAt-f.updatedAt||(f.kind==="group"?f.group.title:oe(f.conversation)).localeCompare(y.kind==="group"?y.group.title:oe(y.conversation))).slice(0,200);if(l.length===0){this.#ta(),this.#F.replaceChildren(s("div",{className:"kl-empty-copy",text:i?"No matching chats.":"No chats yet."}));return}let d=this.#F.getRootNode(),c=d.activeElement instanceof HTMLButtonElement&&this.#F.contains(d.activeElement)?d.activeElement.dataset.conversationKey:void 0,u=new Map;for(let f of this.#F.querySelectorAll(":scope > .kl-conversation[data-conversation-key]")){let y=f.dataset.conversationKey;y&&u.set(y,f)}let p=document.createDocumentFragment(),h=new Set,m=new Set;for(let f of l)if(f.kind==="direct"){let y=`direct:${f.conversation.peerNumber}`;p.append(this.#Kc(f.conversation,u.get(y))),h.add(f.conversation.peerNumber)}else{let y=`group:${f.group.groupId}`;m.add(y),p.append(this.#zc(f.group,u.get(y)));for(let g of f.group.memberNumbers)g!==this.adapter.getOwnMemberNumber()&&h.add(g)}if(!(!this.#P||t!==this.#Do)){if(this.#ta(m),this.#F.replaceChildren(p),c){for(let f of this.#F.querySelectorAll(":scope > .kl-conversation[data-conversation-key]"))if(f.dataset.conversationKey===c){f.focus({preventScroll:!0});break}}this.#P&&this.presence.requestMany([...h].slice(0,60))}}#Wl(e){this.#Zn=e,this.#Ha=e.reduce((t,i)=>t+i.unread,0)}#Kc(e,t){let i=this.presence.get(e.peerNumber),n=oe(e),o=t?.dataset.conversationKind==="direct"?t:void 0,a=o??s("button",{className:"kl-conversation",type:"button"},s("div",{className:"kl-avatar-wrap"},s("div",{className:"kl-avatar"}),ge(i.status)),s("div",{className:"kl-conversation-main"},s("div",{className:"kl-conversation-name-row"},s("span",{className:"kl-conversation-name"})),s("div",{className:"kl-conversation-preview"})),s("div",{className:"kl-conversation-side"},s("span",{className:"kl-time"})));o||(a.dataset.conversationKind="direct",a.addEventListener("click",()=>{let k=Number(a.dataset.memberNumber),C=a.dataset.peerName;Number.isSafeInteger(k)&&C&&this.#Yl(k,C)}),this.#mi(a,()=>{let k=Number(a.dataset.memberNumber);if(Number.isSafeInteger(k))return{memberNumber:k,displayName:a.dataset.displayName||`Member ${k}`}})),a.dataset.conversationKey=`direct:${e.peerNumber}`,a.dataset.memberNumber=e.peerNumber.toString(),a.dataset.peerName=e.peerName,a.dataset.displayName=n;let l=a.querySelector(".kl-avatar");l&&this.#Nt(l,n,e.peerNumber);let d=a.querySelector(".kl-presence-dot");d&&(d.dataset.status=i.status);let c=a.querySelector(".kl-conversation-name-row"),u=c?.querySelector(".kl-conversation-name");u&&(u.textContent=n);let p=c?.querySelector(".kl-pin");e.pinned&&!p?c?.append(w("pin","kl-pin",!0)):e.pinned||p?.remove();let h=e.lastDirection==="outgoing"?"You: ":"",m=$r(e.lastMessage),f=m?`${h}${m}`:`Member ${e.peerNumber}`,y=a.querySelector(".kl-conversation-preview");y&&(y.textContent=f,delete y.dataset.draft);let g=a.querySelector(".kl-time");g&&(g.textContent=e.lastMessageAt>0?zl(e.lastMessageAt):"");let x=a.querySelector(".kl-conversation-side"),b=x?.querySelector(".kl-unread");e.unread>0?(b||(b=s("span",{className:"kl-unread"}),x?.append(b)),b.textContent=e.unread>99?"99+":e.unread.toString()):b?.remove();let N=!this.#J?.activeGroupId&&e.peerNumber===this.#k;return a.dataset.active=String(N),a.setAttribute("aria-current",N?"true":"false"),a}#zc(e,t){let i=this.adapter.getOwnMemberNumber(),n=t?.dataset.conversationKind==="group"?t:void 0,o=n??s("button",{className:"kl-conversation kl-group-conversation",type:"button"},s("div",{className:"kl-group-conversation-avatar",ariaLabel:"Group chat"},s("div",{className:"kl-group-conversation-avatar-inner"}),s("span",{className:"kl-group-conversation-mark"},w("users"))),s("div",{className:"kl-conversation-main"},s("div",{className:"kl-conversation-name-row"},s("span",{className:"kl-conversation-name"}),s("span",{className:"kl-conversation-kind",text:"GROUP"})),s("div",{className:"kl-conversation-preview"})),s("div",{className:"kl-conversation-side"},s("span",{className:"kl-time"})));if(!n){o.dataset.conversationKind="group",o.addEventListener("click",()=>{let x=o.dataset.groupId;x&&this.#J?.activate(x)});let g=this.#J?.bindGroupActionTarget(o,()=>o.dataset.groupId);if(g){let x=`group:${e.groupId}`;this.#Oo.get(x)?.dispose(),this.#Oo.set(x,{target:o,dispose:g})}}o.dataset.conversationKey=`group:${e.groupId}`,this.#jc(o.querySelector(".kl-group-conversation-avatar"),e,i);let a=o.querySelector(".kl-conversation-name-row"),l=a?.querySelector(".kl-conversation-name");l&&(l.textContent=e.title);let d=a?.querySelector(".kl-pin");e.pinned&&!d?a?.append(w("pin","kl-pin",!0)):e.pinned||d?.remove();let c=e.lastSenderNumber===i?"You":e.lastSenderNumber===void 0?"":e.memberNames[String(e.lastSenderNumber)]??"Member",u=e.draft?`Draft: ${$r(e.draft)}`:e.lastMessage?`${c?`${c}: `:""}${$r(e.lastMessage)}`:`${e.memberNumbers.length} members`,p=o.querySelector(".kl-conversation-preview");p&&(p.textContent=u,e.draft?p.dataset.draft="true":delete p.dataset.draft);let h=o.querySelector(".kl-time");h&&(h.textContent=e.lastMessageAt>0?zl(e.lastMessageAt):"");let m=o.querySelector(".kl-conversation-side"),f=m?.querySelector(".kl-unread");e.unread>0?(f||(f=s("span",{className:"kl-unread"}),m?.append(f)),f.textContent=e.unread>99?"99+":e.unread.toString()):f?.remove(),o.dataset.groupId=e.groupId;let y=e.groupId===this.#J?.activeGroupId;return o.dataset.active=String(y),o.setAttribute("aria-current",y?"true":"false"),o.setAttribute("aria-label",`${e.title}, group chat with ${e.memberNumbers.length} members${e.unread>0?`, ${e.unread} unread`:""}`),o}#ta(e){for(let[t,i]of this.#Oo)e?.has(t)||(i.dispose(),this.#Oo.delete(t))}#jc(e,t,i){if(!e)return;let n=t,o=/^#[0-9a-f]{6}$/iu.test(n.outlineColor??"")?n.outlineColor:"";o?e.style.setProperty("--kl-group-outline",o):e.style.removeProperty("--kl-group-outline");let a=e.querySelector(".kl-group-conversation-avatar-inner");if(!a)return;let l=V(n.avatarUrl??"")??"",d=this.#Ms(t,l,i),c=t.memberNumbers.filter(h=>h!==i),u=d?`image:${l}:${t.title}`:`stack:${c.slice(0,3).map(h=>`${h}:${t.memberNames[String(h)]??""}`).join("|")}`;if(a.dataset.groupAvatarSignature===u&&(!d||a.hasAttribute(Ce)||a.dataset.avatarState==="error"||a.dataset.avatarState==="limited"))return;if(this.#hi(a),a.dataset.groupAvatarSignature=u,a.toggleAttribute("data-custom-avatar",d),d){this.#Ss(a,l,t.title),e.dataset.avatarCount="1";return}let p=document.createDocumentFragment();for(let h of c.slice(0,3)){let m=t.memberNames[String(h)]??`Member ${h}`,f=s("span",{className:"kl-group-conversation-avatar-item"});f.dataset.memberNumber=h.toString(),this.#Nt(f,m,h),p.append(f)}a.replaceChildren(p),e.dataset.avatarCount=String(Math.min(3,c.length))}#Vc(e,t){let i=/^#[0-9a-f]{6}$/iu.test(t.outlineColor)?t.outlineColor:"";i?e.style.setProperty("--kl-group-outline",i):e.style.removeProperty("--kl-group-outline");let n=V(t.avatarUrl)??"",o;try{o=this.adapter.getOwnMemberNumber()}catch{o=void 0}let a=this.#Ms(t,n,o),l=a?`image:${n}:${t.title}`:`initials:${t.title}`;e.dataset.hostGroupAvatarSignature===l&&(!a||e.hasAttribute(Ce)||e.dataset.avatarState==="error"||e.dataset.avatarState==="limited")||(this.#Ce(e),e.dataset.hostGroupAvatarSignature=l,e.toggleAttribute("data-custom-avatar",a),a?this.#Ss(e,n,t.title):(e.replaceChildren(document.createTextNode(Lo(t.title))),e.dataset.avatarState="initials"))}#Ms(e,t,i){if(!t)return!1;if(e.creatorNumber===i)return!0;let n=this.settings.get().linkPresence.profileImagePreviews;return n==="always"||n==="ask"&&this.#Oi.has(Kr(e.creatorNumber,t))}#Xl(e){let t=V(e.avatarUrl)??"";if(!t||this.settings.get().linkPresence.profileImagePreviews!=="ask")return!1;let i;try{i=this.adapter.getOwnMemberNumber()}catch{return!1}return!this.#Ms(e,t,i)}#qc(e){let t=this.#tt?.getGroup(e);if(!t||!this.#Xl(t))return;let i=V(t.avatarUrl);i&&(this.#md(t.creatorNumber,i),this.#J?.refresh(),this.#fl(!1),this.#n(`Showing ${t.title}'s custom avatar for this session.`))}#Ss(e,t,i){let n=this.#Pn(e),o=(d="initials")=>{e.replaceChildren(document.createTextNode(Lo(i))),e.dataset.avatarState=d};o();let a=()=>{this.#Ce(e),o("paused")},l=()=>this.#Ss(e,t,i);this.#Is(e,()=>{if(!this.#pe(e,n))return;e.dataset.avatarState="loading";let d=this.#ia(e);this.#ra(t,d.signal).then(c=>{if(!this.#pe(e,n)){c.release();return}this.#na(e,c);let u=document.createElement("img");u.alt=`${i} group avatar`,u.loading="eager",u.decoding="async",u.addEventListener("load",()=>{this.#pe(e,n)&&u.parentElement===e&&(e.dataset.avatarState="image",this.#Os(e,{pinned:this.#Ds(e),pause:a,reload:l})),this.#br(e,c)},{once:!0}),u.addEventListener("error",()=>{this.#br(e,c),this.#pe(e,n)&&u.parentElement===e&&(o("error"),this.#Ce(e),this.#En(e,l))},{once:!0}),e.replaceChildren(u),u.src=c.url}).catch(()=>{!d.signal.aborted&&this.#pe(e,n)&&(o("error"),this.#Ce(e),this.#En(e,l))}).finally(()=>this.#oa(e,d))})}async#Yl(e,t,i){let n=i??++this.#wt;if(n!==this.#wt)return;this.#J?.activeGroupId&&this.#J.closeActive(),this.#k!==void 0&&this.#k!==e&&(this.#xo(this.#k),this.#fr());let o=this.adapter.getMemberNickname(e)??t,a=await this.service.ensureConversation(e,o);if(n!==this.#wt)return;if(o!==a.peerName){if(await this.service.setPeerName(e,o),n!==this.#wt)return;a.peerName=o}if(await this.service.markRead(e),n!==this.#wt)return;let l=oe(a);this.#k=e,this.#$t=l,this.#Pi=o,this.#o.dataset.mobileView="chat",this.#H.hidden=!0,this.#te.hidden=!1,this.#j.dataset.memberNumber=e.toString(),this.#Nt(this.#j,l,e),this.#Ge.textContent=l,this.#Me.textContent=`Member ${e}`,this.#_r=120,this.#eo=e,this.#to=!1,this.#li.clear(),this.#As(),this.presence.request(e),this.#aa(a.pinned),this.#T.value=a.draft,this.#$.checked=this.settings.get().linkChat.includeRoomByDefault,this.#b.disabled=!this.adapter.canSendBeep()||this.#zt,this.#Je.disabled=!this.adapter.canSendBeep()||this.#zt,this.#T.disabled=!this.adapter.canSendBeep()||this.#zt,this.#Ks(),this.#ha(),await Promise.all([this.#Rs(e),this.refresh()]),n===this.#wt&&this.#T.focus()}async#Rs(e,t=!0){let i=await this.service.getMessages(e,this.#_r+1);if(this.#k!==e)return;let n=i.length>this.#_r,o=n?i.slice(-this.#_r):i;if(this.#eo=e,this.#li.clear(),o.length===0){this.#f.replaceChildren(s("div",{className:"kl-empty-copy",text:"No Beeps here yet. Send the first one."}));return}let a=document.createDocumentFragment();n&&a.append(this.#Ls(e));for(let[l,d]of o.entries())this.#li.add(d.id),a.append(this.#Es(d,Kl(o[l-1]?.direction,d.direction,o[l+1]?.direction)));this.#f.replaceChildren(a),t&&(this.#f.scrollTop=this.#f.scrollHeight)}async#Wc(e){if(this.#k!==e||this.#to)return;this.#to=!0,this.#f.setAttribute("aria-busy","true");let t=this.#f.querySelector(".kl-load-older button");t&&(t.disabled=!0);let i=this.#f.scrollHeight,n=this.#f.scrollTop;try{let o=this.#_r+120,a=await this.service.getMessages(e,o+1);if(this.#k!==e)return;let l=a.length>o,c=(l?a.slice(-o):a).filter(h=>!this.#li.has(h.id)),u=this.#f.querySelector(".kl-load-older"),p=document.createDocumentFragment();l?p.append(u??this.#Ls(e)):u?.remove();for(let h of c)this.#li.add(h.id),p.append(this.#Es(h));p.childNodes.length>0&&this.#f.prepend(p),this.#_r=o,this.#Yc(),this.#f.scrollTop=n+(this.#f.scrollHeight-i)}finally{this.#to=!1,this.#f.setAttribute("aria-busy","false");let o=this.#f.querySelector(".kl-load-older button");o&&(o.disabled=!1)}}#Ls(e){return s("div",{className:"kl-load-older"},s("button",{className:"kl-text-button",type:"button",text:"Load earlier messages",onClick:()=>{this.#Wc(e)}}))}#Es(e,t="single"){let i=this.#Qc(e),n=s("div",{className:"kl-message-side-actions"},s("button",{className:"kl-message-action",type:"button",title:"Quote this message in your reply",ariaLabel:"Reply to message",onClick:()=>this.#ou(e)},w("reply")),s("button",{className:"kl-message-action",type:"button",title:"Copy message",ariaLabel:"Copy message",onClick:()=>{this.#au(e.content)}},w("copy"))),o=s("div",{className:"kl-message-meta"},e.roomName?s("span",{className:"kl-message-room",text:e.roomName}):null,s("time",{text:Ti(e.sentAt)})),a=s("div",{className:"kl-message-bubble"},i,o);i.querySelector(".kl-message-media")&&(a.dataset.media="true");let l=s("div",{className:"kl-message-row"},a,n);return l.dataset.direction=e.direction,l.dataset.group=t,l.dataset.messageId=e.id,l}#Xc(e){if(this.#k!==e.peerNumber||this.#eo!==e.peerNumber||this.#li.has(e.id))return;let t=this.#f.scrollHeight-this.#f.scrollTop-this.#f.clientHeight<96,i=e.direction==="outgoing"||t,n=this.#f.scrollTop;this.#f.querySelector(".kl-empty-copy")?.remove();let o=this.#f.querySelector(".kl-message-row:last-child"),a=this.#Es(e);if(o?.dataset.direction===e.direction&&(o.dataset.group=o.dataset.group==="single"?"start":"middle",a.dataset.group="end"),this.#f.append(a),this.#li.add(e.id),this.#li.size>this.#_r){this.#f.querySelector(".kl-load-older")||this.#f.prepend(this.#Ls(e.peerNumber));let l=this.#f.querySelector(".kl-message-row");if(l){let d=this.#f.scrollHeight;if(l.dataset.messageId&&this.#li.delete(l.dataset.messageId),l.remove(),this.#Jc(),!i){let c=Math.max(0,d-this.#f.scrollHeight);this.#f.scrollTop=Math.max(0,n-c)}}}i&&(this.#f.scrollTop=this.#f.scrollHeight)}#Yc(){let e=[...this.#f.querySelectorAll(".kl-message-row")];for(let[t,i]of e.entries())i.dataset.group=Kl(e[t-1]?.dataset.direction,i.dataset.direction,e[t+1]?.dataset.direction)}#Jc(){let e=this.#f.querySelector(".kl-message-row");if(!e)return;let t=e.nextElementSibling;e.dataset.group=t instanceof HTMLElement&&t.classList.contains("kl-message-row")&&t.dataset.direction===e.dataset.direction?"start":"single"}async#Jl(){let e=this.#T.value.trim();!e||this.#zt||await this.#Ql(e,!0)}async#Ql(e,t,i){if(this.#k===void 0&&!i||this.#zt)return!1;let n=i?.peerNumber??this.#k,o=i?.peerName??this.#Pi,a=i?.includeRoom??this.#$.checked,l=this.#T.value;t&&this.#Cs(n),this.#zt=!0,this.#b.disabled=!0,this.#Je.disabled=!0,this.#T.disabled=!0;let d=!1;try{let c=this.adapter.sendBeep(n,e,a);d=!0;let u=await this.service.capture(c,!0);return this.#jt!==void 0&&clearTimeout(this.#jt),this.#jt=void 0,this.presence.setTyping(n,!1,!0),t&&(await this.service.setDraft(n,o,""),this.#k===n&&this.#T.value===l&&(this.#T.value="",this.#Ks(),this.#ha())),await this.onMessage(n,!1,u),t&&this.#k===n&&this.#T.focus(),!0}catch(c){return t&&this.#k===n&&this.#T.value===l&&this.#ql(n,o,l),this.#n(d?"Beep was sent, but KikiLink could not save it to this account's history.":c instanceof Error?c.message:"Unable to send Beep","error"),!1}finally{this.#zt=!1;let c=this.adapter.canSendBeep();this.#b.disabled=!c,this.#Je.disabled=!c||this.#k===void 0,this.#T.disabled=!c||this.#k===void 0}}#Qc(e){return this.#Zl(e.content||"Beep without a message")}#Zl(e,t="kl-message-content"){let i=fr(e),n=i?.content??e,o=Tt(n),a=this.settings.get().linkChat.imagePreviews!=="never",l=[...new Set(o.filter(u=>u.image).map(u=>u.url))].slice(0,2),d=s("div",{className:t});if(i){let u=s("div",{className:"kl-message-reply",ariaLabel:`Unverified quote attributed to ${i.author}: ${i.excerpt}`},w("reply","kl-message-reply-icon"),s("span",{className:"kl-message-reply-copy"},s("strong",{className:"kl-message-reply-author",text:`Quoted as ${i.author}`}),s("span",{className:"kl-message-reply-excerpt",text:i.excerpt}),s("small",{className:"kl-message-reply-warning",text:"Unverified quote"})));u.title=`Unverified quote attributed to ${i.author}: ${i.excerpt}`,u.setAttribute("role","note"),d.append(u),d.dataset.hasReply="true"}if(Ms(d,n,o,u=>{if(u.image&&a)return;let p=s("a",{className:"kl-message-link",text:n.slice(u.start,u.end)});return p.href=u.url,p.target="_blank",p.rel="noopener noreferrer nofollow",p.referrerPolicy="no-referrer",p}),l.length===0||!a)return d;d.textContent?.trim()||(d.replaceChildren(),d.dataset.mediaOnly="true");let c=s("div",{className:"kl-message-media"});for(let u of l)c.append(this.#ed(u));return d.append(c),d}#ed(e,t=!1){let i=new URL(e),n=s("div",{className:"kl-image-preview"}),o=s("a",{className:"kl-image-open",text:"Show original \u2197"});o.href=e,o.target="_blank",o.rel="noopener noreferrer nofollow",o.referrerPolicy="no-referrer";let a=s("figure",{className:"kl-image-card"},n,s("figcaption",{className:"kl-image-caption"},s("span",{className:"kl-image-host",text:t?"Stored on this device":i.hostname}),o)),l=this.settings.get().linkChat.imagePreviews;return t?this.#tu(n,e):l==="always"?this.#td(n,e):(n.append(w("image","kl-image-placeholder-icon"),s("span",{className:"kl-image-placeholder-title",text:"Remote image"}),s("span",{className:"kl-image-placeholder-help",text:l==="ask"?"Load it only when you trust this host.":"Preview disabled by your Links only setting."})),l==="ask"&&n.append(s("button",{className:"kl-text-button kl-image-load",type:"button",text:"Show image",onClick:()=>this.#Ps(n,e)}))),a}async#Ps(e,t){let i=this.#Pn(e);await this.#id(e,t,i)}#Zc(){typeof IntersectionObserver=="function"&&(this.#Ne=new IntersectionObserver(e=>{for(let t of e){let i=t.target,n=this.#dr.get(i);if(n){t.isIntersecting||(this.#dr.delete(i),this.#Ne?.unobserve(i),i.isConnected&&this.#P?n():this.#Ce(i));continue}let o=this.#_i.get(i);if(o){t.isIntersecting||(this.#_i.delete(i),this.#Ne?.unobserve(i),i.isConnected&&this.#P?o.reload():this.#Ce(i));continue}if(!t.isIntersecting){let d=this.#Et.get(i);if(d){this.#Et.delete(i);let u=i.isConnected&&this.#P;d.pause(),u&&d.reload();continue}let c=this.#Vt.get(i);c&&this.#Gs(i,c,"offscreen");continue}let a=this.#Ti.get(i);if(a){this.#Ne?.unobserve(i),this.#Ti.delete(i),i.isConnected&&this.#P&&a();continue}let l=this.#Br.get(i);if(l){if(this.#Ne?.unobserve(i),this.#Br.delete(i),!this.#pe(i,l.token)){this.#Ce(i);continue}i.dataset.state="queued",i.replaceChildren(w("image","kl-image-placeholder-icon"),s("span",{text:"Waiting to load safely\u2026"})),this.#di.push(l)}}this.#Ts()},{rootMargin:"240px 0px",threshold:.01}))}#td(e,t){let i=this.#Pn(e),n={target:e,url:t,token:i};if(this.#Ne){e.dataset.state="waiting",e.replaceChildren(w("image","kl-image-placeholder-icon"),s("span",{text:"Loads automatically when near view\u2026"})),this.#Br.set(e,n),this.#Ne.observe(e);return}if(this.#fn.size>=Gl){e.dataset.state="paused",e.replaceChildren(w("image","kl-image-placeholder-icon"),s("span",{text:"Automatic preview paused in this browser."}),s("button",{className:"kl-text-button kl-image-load",type:"button",text:"Show image",onClick:()=>this.#Ps(e,t)}));return}this.#fn.add(e),e.dataset.state="queued",e.replaceChildren(w("image","kl-image-placeholder-icon"),s("span",{text:"Waiting to load safely\u2026"})),this.#di.push(n),this.#Ts()}#Is(e,t,i="avatar"){if(i==="avatar"?e.dataset.avatarState="waiting":e.dataset.bannerState="waiting",this.#Ti.set(e,t),this.#Ne){this.#Ne.observe(e);return}queueMicrotask(()=>{if(this.#Ti.get(e)===t){if(!e.isConnected||!this.#P){this.#Ce(e);return}if(this.#fn.size>=Gl){this.#Ce(e),i==="avatar"?e.dataset.avatarState="limited":e.dataset.bannerState="limited";return}this.#Ti.delete(e),this.#fn.add(e),t()}})}#Ts(){this.#$a||(this.#$a=!0,queueMicrotask(()=>{this.#$a=!1,this.#eu()}))}#eu(){if(this.#P)for(;this.#Ho<Am&&this.#di.length>0;){let e=this.#di.shift();!e||!this.#pe(e.target,e.token)||(this.#Ho+=1,this.#id(e.target,e.url,e.token).finally(()=>{this.#Ho=Math.max(0,this.#Ho-1),this.#Ts()}))}}async#id(e,t,i){let n=this.#ia(e);try{e.dataset.state="loading",e.replaceChildren(w("image","kl-image-placeholder-icon"),s("span",{text:"Loading image safely\u2026"}));let o;try{o=await this.#ra(t,n.signal)}catch{if(n.signal.aborted||!this.#pe(e,i))return;this.#_s(e);return}if(!this.#pe(e,i)){o.release();return}this.#na(e,o);let a=document.createElement("img");a.alt="Image shared in LinkChat",a.loading="eager",a.decoding="async",await new Promise(l=>{let d=!1,c=m=>{d||(d=!0,a.removeEventListener("load",u),a.removeEventListener("error",p),n.signal.removeEventListener("abort",h),this.#br(e,o),m==="load"&&this.#pe(e,i)&&a.parentElement===e?(e.dataset.state="loaded",this.#iu(e,t)):m==="error"&&this.#pe(e,i)&&a.parentElement===e&&this.#_s(e),l())},u=()=>c("load"),p=()=>c("error"),h=()=>c("abort");a.addEventListener("load",u),a.addEventListener("error",p),n.signal.addEventListener("abort",h,{once:!0}),e.replaceChildren(a),a.src=o.url,n.signal.aborted&&c("abort")})}finally{this.#oa(e,n)}}#tu(e,t){let i=this.#Pn(e),n=document.createElement("img");n.alt="Image stored on this device",n.loading="lazy",n.decoding="async",n.addEventListener("load",()=>{this.#pe(e,i)&&(e.dataset.state="loaded")},{once:!0}),n.addEventListener("error",()=>{this.#pe(e,i)&&this.#_s(e)},{once:!0}),e.dataset.state="loading",e.replaceChildren(n),n.src=t}#_s(e){e.dataset.state="error",e.replaceChildren(s("span",{className:"kl-image-placeholder-icon",text:"!"}),s("span",{text:"This image could not be loaded safely. You can still open the original link."}))}#iu(e,t){for(this.#Vt.delete(e),this.#Vt.set(e,t),this.#Ne?.observe(e);this.#Vt.size>Nm;){let i=this.#Vt.entries().next().value;if(!i)break;this.#Gs(i[0],i[1],"capacity")}}#Os(e,t){for(this.#dr.delete(e),this.#_i.delete(e),this.#Et.delete(e),this.#Et.set(e,t),this.#Ne?.observe(e);this.#Et.size>Cm;){let i;for(let n of this.#Et)if(i??=n,!n[1].pinned){i=n;break}if(!i)break;this.#Et.delete(i[0]),this.#Ne?.unobserve(i[0]),i[1].pause(),this.#Ne&&i[0].isConnected&&this.#P&&(this.#_i.set(i[0],i[1]),this.#Or.add(i[0]),i[0].setAttribute(Ce,"true"),this.#Ne.observe(i[0]))}}#Ds(e){return!!e.closest(".kl-chat-header, .kl-presence-trigger, .kl-addon-profile-card, .kl-presence-dialog, .kl-group-pane-header, .kl-group-details-summary, .kl-group-menu-header")}#En(e,t){!this.#Ne||!e.isConnected||!this.#P||(this.#dr.set(e,t),this.#Or.add(e),e.setAttribute(Ce,"true"),this.#Ne.observe(e))}#Gs(e,t,i){if(this.#Vt.get(e)===t&&(this.#Vt.delete(e),this.#Ce(e),!!e.isConnected)){if(i==="offscreen"&&this.settings.get().linkChat.imagePreviews==="always"&&this.#Ne){this.#td(e,t);return}e.dataset.state="paused",e.replaceChildren(w("image","kl-image-placeholder-icon"),s("span",{text:i==="capacity"?"Preview paused to keep LinkChat responsive.":i==="offscreen"?"Preview unloaded to keep LinkChat responsive.":"Preview paused while LinkChat is closed."}),s("button",{className:"kl-text-button kl-image-load",type:"button",text:"Show image",onClick:()=>this.#Ps(e,t)}))}}#Pn(e){return this.#Ce(e),this.#Or.add(e),e.setAttribute(Ce,"true"),this.#Fo.get(e)??1}#rd(e,t){return this.#P&&this.#Fo.get(e)===t}#pe(e,t){return e.isConnected&&this.#rd(e,t)}#ia(e){let t=new AbortController;return this.#Dr.set(e,t),t}async#ra(e,t){return typeof this.remoteImageLoader.loadLease=="function"?this.remoteImageLoader.loadLease(e,t):{url:await this.remoteImageLoader.load(e,t),release:()=>{}}}#na(e,t){let i=this.#Gr.get(e);i!==t&&(i?.release(),this.#Gr.set(e,t))}#br(e,t){let i=this.#Gr.get(e);!i||t&&i!==t||(this.#Gr.delete(e),i.release())}#oa(e,t){this.#Dr.get(e)===t&&this.#Dr.delete(e)}#Ce(e){this.#Ne?.unobserve(e),this.#Br.delete(e),this.#Ti.delete(e),this.#fn.delete(e),this.#Vt.delete(e),this.#Et.delete(e),this.#_i.delete(e),this.#dr.delete(e);for(let i=this.#di.length-1;i>=0;i-=1)this.#di[i]?.target===e&&this.#di.splice(i,1);let t=this.#Dr.get(e);t&&(this.#Dr.delete(e),t.abort()),this.#br(e),this.#Fo.set(e,(this.#Fo.get(e)??0)+1),this.#Or.delete(e),e.removeAttribute(Ce)}#nd(e){delete e.dataset.groupAvatarSignature,delete e.dataset.hostGroupAvatarSignature;let t=e.closest(".kl-group-conversation-avatar-inner");t&&delete t.dataset.groupAvatarSignature;let i=e.closest(".kl-group-avatar-stack");i&&delete i.dataset.members;let n=e.closest(".kl-group-participant-strip");n&&delete n.dataset.members}#ru(e){if(this.#P){for(let t of e)for(let i of t.removedNodes){if(!(i instanceof Element)&&!(i instanceof DocumentFragment)||i.isConnected&&this.#t.contains(i))continue;(i instanceof Element&&i.hasAttribute(Ce)||i.querySelector(`[${Ce}]`)!==null)&&this.#bn.add(i)}this.#bn.size===0||this.#kn!==void 0||(this.#kn=requestAnimationFrame(()=>{this.#kn=void 0,this.#nu()}))}}#nu(){let e=[...this.#bn];this.#bn.clear();let t=new Set;for(let i of e)if(!(i.isConnected&&this.#t.contains(i))){i instanceof HTMLElement&&i.hasAttribute(Ce)&&t.add(i);for(let n of i.querySelectorAll(`[${Ce}]`))t.add(n)}for(let i of t)(!i.isConnected||!this.#t.contains(i))&&this.#Ce(i)}#od(){let e=[...this.#Vt],t=new Map([...this.#Et,...this.#_i]),i=new Set([...this.#Or,...this.#Dr.keys(),...this.#Gr.keys(),...this.#Br.keys(),...this.#Ti.keys(),...this.#Vt.keys(),...this.#Et.keys(),...this.#_i.keys(),...this.#dr.keys(),...this.#di.map(n=>n.target),...this.#t.querySelectorAll('[data-avatar-state="error"], [data-avatar-state="limited"], [data-banner-state="error"], [data-banner-state="limited"]')]);for(let[n,o]of t)this.#nd(n),o.pause();for(let[n,o]of e)this.#Gs(n,o,"teardown");for(let n of i)this.#nd(n),this.#Ce(n),(n.dataset.avatarState==="error"||n.dataset.avatarState==="limited"||n.dataset.avatarState==="paused")&&(n.dataset.avatarState="teardown"),(n.dataset.bannerState==="error"||n.dataset.bannerState==="limited"||n.dataset.bannerState==="paused")&&(n.dataset.bannerState="teardown");this.#di.length=0,this.#Br.clear(),this.#Ti.clear(),this.#fn.clear(),this.#Vt.clear(),this.#Et.clear(),this.#_i.clear(),this.#dr.clear(),this.#Or.clear(),this.#Gr.clear(),this.#bn.clear()}#hi(e){let t=new Set([...this.#Or,...this.#Dr.keys(),...this.#Gr.keys(),...this.#Br.keys(),...this.#Ti.keys(),...this.#Et.keys(),...this.#_i.keys(),...this.#dr.keys(),...this.#di.map(i=>i.target)]);for(let i of t)e.contains(i)&&this.#Ce(i)}#ou(e){let t=e.direction==="incoming"?this.#Pi:this.adapter.getOwnName(),i=As(t,e.content),n=xs(this.#T.value);if(n.length+i.length>1e3){this.#n("That reply would exceed the 1000 character Beep limit.","error");return}this.#T.value=`${i}${n}`,this.#T.dispatchEvent(new Event("input",{bubbles:!0})),this.#T.focus(),this.#T.setSelectionRange(this.#T.value.length,this.#T.value.length)}async#au(e){try{await ql(e),this.#n("Message copied.")}catch{this.#n("The browser blocked clipboard access.","error")}}async#su(){if(this.#k===void 0)return;let e=await this.service.togglePinned(this.#k);this.#aa(e),await this.#Wr()}#aa(e){this.#ge.replaceChildren(w("pin","kl-pin-button-icon",e)),this.#ge.title=e?"Unpin conversation":"Pin conversation",this.#ge.setAttribute("aria-label",e?"Unpin conversation":"Pin conversation"),this.#ge.setAttribute("aria-pressed",String(e))}#mi(e,t){!(e instanceof HTMLButtonElement)&&e===this.#j&&(e.tabIndex=0,e.setAttribute("role","button")),e.classList.add("kl-profile-menu-target");let i=e.title.trim();e.title=i?`${i} \xB7 Right-click or hold for actions`:"Right-click or hold for player actions",e.addEventListener("contextmenu",d=>{if(!zr(d,e))return;let c=t();c&&(d.preventDefault(),d.stopPropagation(),this.#sa(c.memberNumber,c.displayName,d.clientX,d.clientY,e))}),e.addEventListener("keydown",d=>{if(!zr(d,e)||d.key!=="ContextMenu"&&!(d.key==="F10"&&d.shiftKey))return;let c=t();if(!c)return;d.preventDefault();let u=e.getBoundingClientRect();this.#sa(c.memberNumber,c.displayName,u.left+u.width/2,u.top+Math.min(u.height,44),e)});let n,o=0,a=0,l=()=>{n!==void 0&&(clearTimeout(n),this.#io.delete(n)),n=void 0};e.addEventListener("pointerdown",d=>{if(!zr(d,e)||d.pointerType==="mouse"||d.button!==0)return;let c=t();if(!c)return;o=d.clientX,a=d.clientY,l();let u=setTimeout(()=>{this.#io.delete(u),n===u&&(n=void 0),!(!this.#P||this.#o.hidden||!e.isConnected)&&(this.#pl.set(e,Date.now()+700),this.#sa(c.memberNumber,c.displayName,o,a,e))},520);n=u,this.#io.add(u)}),e.addEventListener("pointermove",d=>{n!==void 0&&Math.hypot(d.clientX-o,d.clientY-a)>9&&l()}),e.addEventListener("pointerup",l),e.addEventListener("pointercancel",l),e.addEventListener("click",d=>{zr(d,e)&&(Date.now()>=(this.#pl.get(e)??0)||(d.preventDefault(),d.stopImmediatePropagation()))},!0)}async#sa(e,t,i,n,o){let a=++this.#Ka;if(this.#la(a))try{await this.#lu(e,t,i,n,o,a)}catch{if(!this.#la(a))return;this.#gi(),this.#n("Player actions could not be loaded right now.","error")}}async#lu(e,t,i,n,o,a){this.presence.request(e);let l=await this.service.getConversation(e);if(!this.#la(a))return;let d=l?.peerName??t,c=l?oe(l):t,u=this.presence.get(e),p=this.roster.get(e,d),h=!1;try{h=typeof this.adapter.isMemberInCurrentRoom=="function"?this.adapter.isMemberInCurrentRoom(e):!1}catch{}let m=this.presence.hasCompatiblePeer(e),f=u.profileFromCache===!0,y=s("span",{text:Ie(u.status)});y.dataset.presenceLabel="true";let g=s("span",{title:Ii(u)},ge(u.status),y,` \xB7 #${e}`);g.dataset.presenceDescription="true";let x=s("header",{className:"kl-profile-menu-header"},s("div",{className:"kl-avatar-wrap"},this.#Tn(c,e),ge(u.status)),s("div",{className:"kl-profile-menu-identity"},s("strong",{text:c}),g,u.statusMessage?s("small",{className:"kl-presence-note",text:u.statusMessage}):null,l?.localAlias?s("small",{className:"kl-profile-native-name",text:`Local nickname \xB7 ${l.peerName}`}):null));x.dataset.memberNumber=e.toString();let b=s("div",{className:"kl-profile-menu-group"},this.#Xt("profile","KikiLink Profile",m?"Open addon profile card":f?"Open the last public profile saved on this account":"KikiLink has not been detected for this player",()=>this.#zr(e,c,o),!1),this.#Xt("chat","Message","Open LinkChat",()=>this.openChat(e,d)),this.#Xt("whisper","Whisper",h?"Set native Whisper target":"Available while this player is in your room",()=>{try{this.adapter.startWhisper(e),this.close()}catch(I){this.#n(I instanceof Error?I.message:"Unable to start Whisper","error")}},!h),this.#Xt("profile","Native profile",h?"Open the Bondage Club profile":"Available while this player is in your room",()=>{try{this.adapter.openProfile(e),this.close()}catch(I){this.#n(I instanceof Error?I.message:"Unable to open profile","error")}},!h)),N=s("div",{className:"kl-profile-menu-group"},this.#Xt("star",p.favorite?"Remove favorite":"Add favorite","Saved in your private player notebook",()=>{this.roster.toggleFavorite(e,d),this.#mt(),this.#Ui(),this.#n(p.favorite?"Removed from favorites.":"Added to favorites.")},!1,p.favorite),this.#Xt("note","Player note","Open private notes and tags",()=>{this.#vo(e)}),l?this.#Xt("edit",l.localAlias?"Edit local nickname":"Set local nickname",l.localAlias?`Only you see \u201C${l.localAlias}\u201D`:"Cosmetic and visible only to you",()=>this.#Ud(l)):null,l?this.#Xt("pin",l.pinned?"Unpin chat":"Pin chat","Organize your recent chats",()=>this.#du(e),!1,l.pinned):null,l?this.#Xt("unread","Mark unread","Keep this chat in your unread queue",()=>this.#cu(e)):null,this.#Xt("id","Copy member ID",`Copy ${e}`,()=>{this.#jl(e)})),k=l?s("div",{className:"kl-profile-menu-group kl-profile-menu-group--danger"},this.#Xt("trash","Remove from recent chats","Deletes only this account's KikiLink history",()=>this.#Fd(e,c))):null;if(!this.#la(a))return;if(this.#za=o?.isConnected?o:void 0,this.#Ae.replaceChildren(x,b,N),this.#Ae.dataset.memberNumber=e.toString(),k&&this.#Ae.append(k),this.#Ae.hidden=!1,!this.#vt.open)try{this.#vt.showModal()}catch{this.#vt.setAttribute("open","")}this.#Ae.style.left=`${i}px`,this.#Ae.style.top=`${n}px`;let C=this.#Ae.getBoundingClientRect();this.#Ae.style.left=`${Fe(i,8,Math.max(8,window.innerWidth-C.width-8))}px`,this.#Ae.style.top=`${Fe(n,8,Math.max(8,window.innerHeight-C.height-8))}px`,this.#Ae.querySelector(".kl-profile-menu-action:not(:disabled)")?.focus()}#la(e){return e===this.#Ka&&this.#P&&!this.#o.hidden&&this.#e.isConnected}#Bs(){for(let e of this.#io)clearTimeout(e);this.#io.clear()}#Xt(e,t,i,n,o=!1,a=!1){let l=s("button",{className:"kl-profile-menu-action",type:"button"},s("span",{className:"kl-profile-menu-icon"},w(e,"kl-profile-action-icon",a)),s("span",{className:"kl-profile-menu-copy"},s("span",{className:"kl-profile-menu-label",text:t}),s("span",{className:"kl-profile-menu-help",text:i})));return l.setAttribute("role","menuitem"),l.disabled=o,l.addEventListener("click",()=>{this.#gi(),this.#In(n,"Player action could not be completed.")}),l}#In(e,t){try{let i=e();i&&i.catch(n=>this.#da(n,t))}catch(i){this.#da(i,t)}}#da(e,t){this.#P&&this.#n(e instanceof Error&&e.message.trim()?e.message:t,"error")}#gi(){this.#Ka+=1,this.#Bs();let e=this.#za;if(this.#za=void 0,this.#vt.open)try{this.#vt.close()}catch{this.#vt.removeAttribute("open")}this.#Ae.hidden=!0,this.#Ae.replaceChildren(),this.#P&&Ct(e)&&e.focus()}async#du(e){let t=await this.service.togglePinned(e);e===this.#k&&this.#aa(t),await this.#Wr(),this.#n(t?"Chat pinned.":"Chat unpinned.")}async#cu(e){await this.service.markUnread(e),await this.refresh(),this.#n("Chat marked unread.")}#wo(){this.#ri.value="",this.#Ao(),this.#ze.open||this.#ze.showModal(),this.#ri.focus()}async#ad(){let e=this.#ri.value.trim();if(!e){this.#n("Choose a contact or enter a valid member number.","error");return}let t=Number(e.replace(/^#/u,""));if(!Number.isSafeInteger(t)||t<=0){let o;try{o=this.adapter.getKnownContacts().find(a=>a.memberName.toLocaleLowerCase()===e.toLocaleLowerCase())}catch{this.#n("Bondage Club contacts could not be read right now. Try again shortly.","error");return}if(o){this.#ze.close();try{await this.openChat(o.memberNumber,o.memberName)}catch(a){this.#da(a,"LinkChat could not be opened.")}return}this.#n("Choose a contact or enter a valid member number.","error");return}let i=-1;try{i=this.adapter.getOwnMemberNumber()}catch{}if(!Number.isSafeInteger(i)||i<=0){this.#n("Your Bondage Club account could not be read right now. Try again shortly.","error");return}if(t===i){this.#n("You cannot Beep yourself.","error");return}let n=`Member ${t}`;try{n=this.adapter.getMemberName(t)}catch{}this.#ze.close();try{await this.openChat(t,n)}catch(o){this.#da(o,"LinkChat could not be opened.")}}#Ao(){let e=this.#ri.value.trim().toLocaleLowerCase(),t=new Set,i=new Set,n=!1;try{for(let d of this.adapter.getOnlineFriends())t.add(d.memberNumber);n=this.adapter.hasOnlineFriendSnapshot()}catch{}try{for(let d of this.adapter.getRoomCharacters())i.add(d.memberNumber)}catch{}let o=this.#$n.value,a=!0,l=[];try{l=this.adapter.getKnownContacts().map(d=>({...d,inRoom:i.has(d.memberNumber),online:t.has(d.memberNumber)||i.has(d.memberNumber)})).filter(d=>(!e||d.memberName.toLocaleLowerCase().includes(e)||d.memberNumber.toString().includes(e))&&(o!=="online"||d.online)&&(o!=="room"||d.inRoom)).sort((d,c)=>{if(this.#Kn.value==="online"){let u=d.inRoom?2:d.online?1:0,p=c.inRoom?2:c.online?1:0;if(u!==p)return p-u}return d.memberName.localeCompare(c.memberName,void 0,{numeric:!0,sensitivity:"base"})}).slice(0,40)}catch{a=!1}if(this.#Ro.replaceChildren(),l.length===0){this.#Ro.append(s("div",{className:"kl-contact-empty",text:a?this.#Da==="ready"?o==="online"?n?"No matching contacts are online. You can still enter a member number.":"Online status is still loading. You can still enter a member number.":o==="room"?"No matching contacts are in this room.":"No matching known contacts. You can still enter a member number.":"Contacts will appear after KikiLink connects to the game.":"Bondage Club contacts could not be read right now. Try again shortly."}));return}for(let d of l){let c=this.presence.get(d.memberNumber),u=d.inRoom?"room":d.online?"online":n?"offline":"unknown",p=s("button",{className:"kl-contact",type:"button"},s("div",{className:"kl-avatar-wrap"},this.#Tn(d.memberName,d.memberNumber),ge(c.status==="unknown"&&d.online?"online":c.status)),s("div",{className:"kl-contact-copy"},s("div",{className:"kl-contact-name",text:d.memberName}),s("div",{className:"kl-contact-meta"},s("span",{className:"kl-contact-number",text:`Member ${d.memberNumber}`}),s("span",{className:"kl-contact-native-state",text:d.inRoom?"In this room":d.online?"Online":n?"Offline":"Status unknown"}))));p.dataset.nativeState=u,p.addEventListener("click",()=>{this.#ze.close(),this.#In(()=>this.openChat(d.memberNumber,d.memberName),"LinkChat could not be opened.")}),this.#mi(p,()=>({memberNumber:d.memberNumber,displayName:d.memberName})),p.dataset.memberNumber=d.memberNumber.toString(),this.#Ro.append(p)}try{this.presence.requestMany(l.map(d=>d.memberNumber))}catch{}}#sd(){let e=this.settings.get().linkChat.quickActions;this.#Re.replaceChildren(),this.#Re.hidden=e.length===0;for(let t of e)this.#Re.append(s("button",{className:"kl-action-chip",type:"button",text:t.label,title:t.template,onClick:()=>this.#uu(t)}))}#uu(e){if(this.#k===void 0)return;let t=e.template.replaceAll("{name}",this.#Pi).replaceAll("{member}",this.#k.toString()).replaceAll("{me}",this.adapter.getOwnName()),i=this.#T.value.trimEnd(),n=i?`${i}
${t}`:t;if(n.length>1e3){this.#n("This action would exceed the 1000 character Beep limit.","error");return}this.#T.value=n,this.#T.dispatchEvent(new Event("input",{bubbles:!0})),this.#T.focus()}#pu(e){this.#On.replaceChildren();for(let t of e)this.#ld(t)}#ld(e={label:"",template:""}){if(this.#On.childElementCount>=12){this.#n("You can keep up to 12 quick actions.","error");return}let t=s("input",{className:"kl-action-label"});t.placeholder="Label",t.maxLength=24,t.value=e.label,t.dataset.field="label";let i=s("input",{className:"kl-action-template"});i.placeholder="Action text",i.maxLength=500,i.value=e.template,i.dataset.field="template";let n=s("button",{className:"kl-icon-button kl-remove-action",type:"button",title:"Remove action",ariaLabel:"Remove quick action"});n.append(w("trash"));let o=s("div",{className:"kl-action-editor-row"},t,i,n);n.addEventListener("click",()=>o.remove()),this.#On.append(o),!e.label&&!e.template&&t.focus()}#hu(){return[...this.#On.querySelectorAll(".kl-action-editor-row")].map(e=>({label:e.querySelector('[data-field="label"]')?.value.trim()??"",template:e.querySelector('[data-field="template"]')?.value.trim()??""})).filter(e=>e.label&&e.template)}#mu(e){this.#Nr.replaceChildren();for(let t of e)this.#dd(t);this.#Us()}#dd(e=ga(Bl())){if(this.#Nr.childElementCount>=20){this.#n(`You can keep up to ${20} reaction rules.`,"error");return}let t=s("input");t.type="checkbox",t.checked=e.enabled,t.dataset.field="enabled",t.setAttribute("aria-label",`Enable ${e.label}`);let i=s("label",{className:"kl-reaction-rule-enabled"},t,s("span",{text:"On"})),n=s("input",{className:"kl-reaction-name"});n.value=e.label,n.maxLength=32,n.placeholder="Rule name",n.dataset.field="label",n.setAttribute("aria-label","Reaction rule name");let o=s("select",{className:"kl-select"});o.replaceChildren(A("beep-received","Incoming Beep"),A("room-join","Player joins room"),A("room-leave","Player leaves room"),A("friend-online","Friend comes online")),o.value=e.trigger,o.dataset.field="trigger";let a=s("select",{className:"kl-select"});a.replaceChildren(A("anyone","Anyone"),A("friends","Friends only"),A("members","Specific members")),a.value=e.scope,a.dataset.field="scope";let l=s("input",{className:"kl-reaction-input"});l.value=e.memberNumbers.join(", "),l.placeholder="12345, 67890",l.maxLength=240,l.dataset.field="members";let d=s("input",{className:"kl-reaction-input"});d.value=e.textMatch,d.placeholder="Optional words",d.maxLength=80,d.dataset.field="text-match";let c=s("select",{className:"kl-select"});c.replaceChildren(A("notice","Local notice"),A("room-emote","Send room emote")),c.value=e.action,c.dataset.field="action";let u=s("input",{className:"kl-number-input kl-reaction-cooldown"});u.type="number",u.min="0",u.max=3600 .toString(),u.value=e.cooldownSeconds.toString(),u.dataset.field="cooldown";let p=s("textarea",{className:"kl-reaction-template"});p.value=e.template,p.maxLength=500,p.rows=2,p.dataset.field="template";let h=s("article",{className:"kl-reaction-rule"});h.dataset.ruleId=e.id;let m=s("button",{className:"kl-icon-button kl-reaction-move kl-reaction-move--up",type:"button",title:"Move rule up",ariaLabel:`Move ${e.label} up`,onClick:()=>{let x=h.previousElementSibling;x&&this.#Nr.insertBefore(h,x)}});m.append(w("back"));let f=s("button",{className:"kl-icon-button kl-reaction-move kl-reaction-move--down",type:"button",title:"Move rule down",ariaLabel:`Move ${e.label} down`,onClick:()=>{let x=h.nextElementSibling;x&&x.after(h)}});f.append(w("back"));let y=s("button",{className:"kl-icon-button kl-remove-action",type:"button",title:"Remove reaction rule",ariaLabel:`Remove ${e.label}`,onClick:()=>{h.remove(),this.#Us()}});y.append(w("trash"));let g=s("div",{className:"kl-reaction-rule-note"});h.append(s("header",{className:"kl-reaction-rule-header"},i,n,s("div",{className:"kl-reaction-rule-order"},m,f,y)),s("div",{className:"kl-reaction-rule-grid"},At("When",o),At("Who",a),At("Member numbers",l,"kl-reaction-members-field"),At("Beep contains",d,"kl-reaction-match-field"),At("Then",c),At("Cooldown (seconds)",u),At("Message template",p,"kl-reaction-template-field")),g),o.addEventListener("change",()=>this.#ca(h)),a.addEventListener("change",()=>this.#ca(h)),c.addEventListener("change",()=>this.#ca(h)),this.#Nr.append(h),this.#ca(h),this.#Us(),e.label||n.focus()}#ca(e){let t=e.querySelector('[data-field="trigger"]')?.value,i=e.querySelector('[data-field="scope"]')?.value,n=e.querySelector('[data-field="action"]')?.value,o=e.querySelector('[data-field="members"]'),a=e.querySelector('[data-field="text-match"]'),l=e.querySelector('[data-field="template"]');o&&(o.disabled=i!=="members"),a&&(a.disabled=t!=="beep-received"),e.querySelector(".kl-reaction-members-field")?.toggleAttribute("data-disabled",i!=="members"),e.querySelector(".kl-reaction-match-field")?.toggleAttribute("data-disabled",t!=="beep-received"),l&&(l.placeholder=n==="room-emote"?"greets {name} as they arrive.":"{name} {event}.");let d=e.querySelector(".kl-reaction-rule-note");d&&(d.textContent=n==="room-emote"?"Public room action. Private {message} content is always removed before sending.":"Private KikiLink notice shown beside the launcher when the panel is closed.",d.dataset.public=String(n==="room-emote"))}#gu(){let e=[],t=[...this.#Nr.querySelectorAll(".kl-reaction-rule")];for(let[i,n]of t.entries()){let o=n.querySelector('[data-field="label"]')?.value.trim()??"",a=n.querySelector('[data-field="template"]')?.value.trim()??"";if(!o||!a){n.querySelector(o?'[data-field="template"]':'[data-field="label"]')?.focus(),this.#n(`Complete the name and template for reaction rule ${i+1}.`,"error");return}let l=n.querySelector('[data-field="scope"]')?.value,d=l==="friends"||l==="members"?l:"anyone",c=n.querySelector('[data-field="members"]'),u=d==="members"?Lm(c?.value??""):[];if(d==="members"&&(!u||u.length===0)){c?.focus(),this.#n(`Enter up to ${20} valid member numbers for reaction rule ${i+1}.`,"error");return}let p=n.querySelector('[data-field="cooldown"]'),h=Number(p?.value);if(!Number.isInteger(h)||h<0||h>3600){p?.focus(),this.#n(`Reaction cooldown must be between 0 and ${3600} seconds.`,"error");return}let m=n.querySelector('[data-field="trigger"]')?.value,f=n.querySelector('[data-field="action"]')?.value;e.push({id:n.dataset.ruleId||Bl(),label:o,enabled:n.querySelector('[data-field="enabled"]')?.checked===!0,trigger:m==="room-join"||m==="room-leave"||m==="friend-online"?m:"beep-received",scope:d,memberNumbers:u??[],textMatch:m==="beep-received"?n.querySelector('[data-field="text-match"]')?.value.trim()??"":"",action:f==="room-emote"?"room-emote":"notice",template:a,cooldownSeconds:h})}return e}#Us(){let e=this.#Nr.childElementCount;this.#Js.textContent=e===0?"Optional":`${e} rule${e===1?"":"s"}`}#fi(e){let t=this.settings.get();this.#le!=="settings"&&(this.#Ia=this.#le),this.#Vi.value=t.ui.theme,this.#Ai.value=t.ui.accent,this.#$s(),this.#qi.value=t.ui.density,this.#Wi.value=t.ui.textScale,this.#Jr.value=t.ui.homeLayout,this.#Qr.value=t.ui.launcherSide,this.#Xi.value=t.ui.launcherOpen,this.#_n.checked=t.ui.reducedMotion,this.#et.checked=t.linkChat.saveHistory,this.#$i.checked=t.linkChat.enterToSend,this.#Ki.checked=t.linkChat.typingIndicators,this.#ne.value=t.linkChat.imagePreviews,this.#vr.value=t.linkPresence.profileImagePreviews,this.#zi.checked=t.linkChat.imageUploads.enabled,this.#wi.value=t.linkChat.imageUploads.retention,this.#cd(),this.#Yr.checked=t.ui.roomBadge.enabled,this.#ji.value=t.linkChat.retentionDays.toString(),this.#pu(t.linkChat.quickActions),this.#Zr.checked=t.linkRoster.enabled,this.#Dn.checked=t.linkRoster.trackEncounters,this.#en.value=t.linkRoster.retentionDays.toString(),this.#ua(),this.#rn.checked=t.linkActivities.enabled,this.#Un.checked=t.linkReactions.quickAlerts.friendOnline,this.#Fn.checked=t.linkReactions.quickAlerts.roomJoin,this.#xr.checked=t.linkReactions.sounds.enabled,this.#Rt.value=t.linkReactions.sounds.volume.toString(),this.#ya.textContent=`${t.linkReactions.sounds.volume}%`,this.#Zi.value=t.linkReactions.sounds.chat,this.#wr.value=t.linkReactions.sounds.friendOnline,this.#Ar.value=t.linkReactions.sounds.roomJoin,this.#Hs(t.linkReactions.sounds),this.#Hn.checked=t.linkReactions.enabled,this.#mu(t.linkReactions.rules),this.#Pt("settings",!1),this.#Fs(e??t.ui.settingsSection,!1),this.#Gt.querySelector(`[data-section="${this.#Ta}"]`)?.focus()}#Fs(e,t){this.#Ta=e;for(let[i,n]of this.#yr)n.hidden=i!==e;for(let i of this.#Gt.querySelectorAll(".kl-settings-tab")){let n=i.dataset.section===e;i.dataset.active=String(n),i.setAttribute("aria-selected",String(n)),i.tabIndex=n?0:-1}t&&this.settings.get().ui.settingsSection!==e&&this.settings.update(i=>{i.ui.settingsSection=e})}#cd(){let e=this.#zi.checked;this.#fa.hidden=!e,this.#wi.disabled=!e}async#Hs(e={...this.settings.get().linkReactions.sounds,chat:Nt(this.#Zi.value,"chime"),friendOnline:Nt(this.#wr.value,"sparkle"),roomJoin:Nt(this.#Ar.value,"pop")}){let t;try{t=await this.soundStore.list()}catch{t=[]}let i=Object.entries(Vn),n=new Set(t.map(a=>`custom:${a.id}`)),o=[[this.#Zi,e.chat,"chime"],[this.#wr,e.friendOnline,"sparkle"],[this.#Ar,e.roomJoin,"pop"]];for(let[a,l,d]of o){if(a.replaceChildren(...i.map(([c,u])=>A(c,u)),...t.map(c=>A(`custom:${c.id}`,`My \xB7 ${c.name}`))),l.startsWith("custom:")&&!n.has(l)){let c=A(l,"Custom sound unavailable on this device");c.disabled=!0,a.append(c)}a.value=l||d}if(t.length===0){this.#va.replaceChildren(s("div",{className:"kl-custom-sound-empty",text:"No local sounds saved on this device."}));return}this.#va.replaceChildren(...t.map(a=>s("div",{className:"kl-custom-sound"},s("div",{className:"kl-custom-sound-copy"},s("strong",{text:a.name}),s("span",{text:`${(a.durationMs/1e3).toFixed(1)} s \xB7 local`})),s("button",{className:"kl-text-button kl-sound-preview",type:"button",text:"Play",onClick:()=>{this.#hr.play(`custom:${a.id}`,{volume:Number(this.#Rt.value)})}}),s("button",{className:"kl-icon-button kl-text-button--danger",type:"button",title:`Delete ${a.name}`,ariaLabel:`Delete ${a.name}`,onClick:()=>{this.#bu(a)}},w("trash")))))}async#fu(){let e=this.#Qi.files?.[0];if(this.#Qi.value="",!!e)try{let t=await this.soundStore.add(e),i=this.settings.get().linkReactions.sounds;await this.#Hs({...i,chat:`custom:${t.id}`}),this.#Zi.value=`custom:${t.id}`,this.#n(`Saved \u201C${t.name}\u201D locally. Choose Save changes to use it.`)}catch(t){this.#n(t instanceof Error?t.message:"That local sound could not be saved.","error")}}async#bu(e){if(typeof confirm=="function"&&!confirm(`Delete the local sound \u201C${e.name}\u201D?`))return;await this.soundStore.delete(e.id);let t=`custom:${e.id}`,i=this.settings.update(n=>{n.linkReactions.sounds.chat===t&&(n.linkReactions.sounds.chat="chime"),n.linkReactions.sounds.friendOnline===t&&(n.linkReactions.sounds.friendOnline="sparkle"),n.linkReactions.sounds.roomJoin===t&&(n.linkReactions.sounds.roomJoin="pop")});await this.#Hs(i.linkReactions.sounds),this.#n(`Deleted \u201C${e.name}\u201D from this device.`)}#$s(){for(let e of this.#ii.querySelectorAll(".kl-color-swatch")){let t=e.dataset.color===this.#Ai.value.toLocaleLowerCase();e.dataset.selected=String(t),e.setAttribute("aria-pressed",String(t))}}#ku(){this.#Pt(this.#is(this.#Ia))}#yu(){let e=Number(this.#ji.value),t=this.#gu();if(!t)return;let i=this.settings.get(),n=this.#Qr.value==="left"?"left":"right",o=this.settings.update(l=>{l.ui.theme=this.#Vi.value==="light"||this.#Vi.value==="system"?this.#Vi.value:"dark",l.ui.accent=this.#Ai.value,l.ui.density=this.#qi.value==="compact"||this.#qi.value==="super-compact"?this.#qi.value:"comfortable",l.ui.textScale=this.#Wi.value==="large"||this.#Wi.value==="extra-large"?this.#Wi.value:"normal",l.ui.homeLayout=this.#Jr.value==="compact"?"compact":"showcase",l.ui.launcherSide=n,l.ui.launcherOpen=this.#Xi.value==="last"||this.#Xi.value==="chat"?this.#Xi.value:"home",n!==i.ui.launcherSide&&(l.ui.launcherPosition=null),l.ui.roomBadge={enabled:this.#Yr.checked,position:i.ui.roomBadge.position},l.ui.reducedMotion=this.#_n.checked,l.ui.settingsSection=this.#Ta,l.linkChat.saveHistory=this.#et.checked,l.linkChat.enterToSend=this.#$i.checked,l.linkChat.typingIndicators=this.#Ki.checked,l.linkChat.imagePreviews=this.#ne.value==="always"||this.#ne.value==="never"?this.#ne.value:"ask",l.linkPresence.profileImagePreviews=this.#vr.value==="ask"||this.#vr.value==="never"?this.#vr.value:"always",l.linkChat.imageUploads={enabled:this.#zi.checked,retention:this.#wi.value==="1h"||this.#wi.value==="12h"||this.#wi.value==="72h"?this.#wi.value:"24h"},l.linkChat.quickActions=this.#hu(),l.linkRoster.enabled=this.#Zr.checked,l.linkRoster.trackEncounters=this.#Dn.checked;let d=Number(this.#en.value);Number.isInteger(d)&&(l.linkRoster.retentionDays=d),l.linkActivities.enabled=this.#rn.checked,l.linkReactions.quickAlerts.friendOnline=this.#Un.checked,l.linkReactions.quickAlerts.roomJoin=this.#Fn.checked,l.linkReactions.sounds.enabled=this.#xr.checked,l.linkReactions.sounds.volume=Math.round(Number(this.#Rt.value)),l.linkReactions.sounds.chat=Nt(this.#Zi.value,"chime"),l.linkReactions.sounds.friendOnline=Nt(this.#wr.value,"sparkle"),l.linkReactions.sounds.roomJoin=Nt(this.#Ar.value,"pop"),l.linkReactions.enabled=this.#Hn.checked,l.linkReactions.rules=t,Number.isInteger(e)&&(l.linkChat.retentionDays=e)});this.#zs(o),this.#ea(),this.activities.syncFromSettings(),o.linkReactions.sounds.enabled&&this.#hr.unlock(),o.linkChat.typingIndicators||this.#fr();let a=this.roster.prune();this.#ua(),this.#sd(),this.#k!==void 0&&this.#Rs(this.#k),this.#As(),this.#gr(),this.#Ui(),this.#Pt(this.#is(this.#Ia,o)),this.service.prune(),this.#tt?.applyHistoryPolicy(Date.now()-o.linkChat.retentionDays*24*60*60*1e3),this.#n(a>0?`Settings saved. Forgot ${a} old encounter${a===1?"":"s"}.`:"Settings saved.")}#vu(){let e=this.settings.update(t=>{t.ui.launcherPosition=null});this.#zs(e),this.#n("Launcher returned to its default corner.")}#xu(){this.settings.update(e=>{e.ui.panelPosition=null}),this.#No(),this.#n("KikiLink window returned to its default corner.")}#wu(){this.#po.resetPosition(),this.#n("Blossom returned beside the character addon icons.")}#Au(){if(this.settings.get().ui.roomBadge.enabled||(this.settings.update(e=>{e.ui.roomBadge.enabled=!0}),this.#Yr.checked=!0),!this.#po.beginPlacement()){this.#n("Enter a chat room and wait until your character is visible, then try again.","error");return}this.close()}async#Nu(){if(!window.confirm("Clear all KikiLink direct and group chats, messages, and drafts?"))return;let[e,t]=await Promise.allSettled([this.service.clearHistory(),this.#tt?.clear()??Promise.resolve(!0)]);this.#ud();let i=!1;try{await this.refresh()}catch(n){i=!0,console.error("[KikiLink:link-chat] Chat list refresh after clear failed",n)}if(e.status==="rejected"||t.status==="rejected"){e.status==="rejected"&&console.error("[KikiLink:link-chat] Direct chat history clear failed",e.reason),t.status==="rejected"&&console.error("[KikiLink:group-chat] Group chat history clear failed",t.reason),this.#n("KikiLink could not verify that all chat history was cleared. Please retry.","error");return}if(!e.value&&!t.value){this.#n("Direct and group chats are cleared for this session, but durable browser storage did not retain the change. Saved chats may reappear after reload.","error");return}if(!t.value){this.#n("Group chats are cleared for this session, but browser storage did not retain the change. Saved groups may reappear; KikiLink will retry.","error");return}if(!e.value){this.#n("Direct chats are cleared for this session, but durable browser storage did not retain the change. Saved chats may reappear after reload.","error");return}if(i){this.#n("Chat history was cleared, but the list could not refresh. Reopen KikiLink to reload it.","error");return}this.#n("Direct and group chat history cleared.")}#ud(){this.#Cs(this.#k),this.#fr(),this.#k=void 0,this.#$t="",this.#Pi="",this.#eo=void 0,this.#to=!1,this.#li.clear(),this.#T.value="",this.#f.replaceChildren(),this.#Je.disabled=!0,this.#te.hidden=!0,this.#H.hidden=this.#J?.activeGroupId!==void 0,this.#o.dataset.mobileView="list"}#Cu(){if(typeof URL.createObjectURL!="function"){this.#n("This browser cannot create a notebook download.","error");return}let e=this.roster.exportNotebook(),t=new Blob([JSON.stringify(e,null,2)],{type:"application/json"}),i=URL.createObjectURL(t),n=document.createElement("a");n.href=i,n.download=`KikiLink-player-notebook-${new Date().toISOString().slice(0,10)}.json`,n.hidden=!0,this.#t.append(n),n.click(),n.remove(),setTimeout(()=>URL.revokeObjectURL(i),0),this.#n(e.records.length===1?"Exported 1 player to a local JSON backup.":`Exported ${e.records.length} players to a local JSON backup.`)}async#Mu(){let e=this.#Yi.files?.[0];if(this.#Yi.value="",!!e){if(e.size>2e6){this.#n("That notebook backup is larger than the 2 MB safety limit.","error");return}if(window.confirm("Merge this KikiLink backup with the current player notebook? Existing notes, tags, and favorites will be preserved."))try{let t=this.roster.importNotebook(await e.text()),i=this.roster.prune();this.#ua(),this.#ht=void 0,this.#Kt=!1,this.#le==="roster"&&this.#mt(),this.#Ui();let n=t.skipped>0?` ${t.skipped} invalid entr${t.skipped===1?"y was":"ies were"} skipped.`:"",o=i>0?` ${i} expired encounter${i===1?" was":"s were"} omitted.`:"";this.#n(`Merged ${t.imported} player${t.imported===1?"":"s"}.${n}${o}`)}catch(t){this.#n(t instanceof Error?t.message:"Could not import that notebook.","error")}}}#ua(){let e=this.roster.notebookCount();this.#Xs.textContent=`${e} saved player${e===1?"":"s"} \xB7 JSON stays local`}#Su(){window.confirm("Clear all KikiLink player notes, tags, favorites, and encounter history?")&&(this.roster.clear(),this.#ht=void 0,this.#Kt=!1,this.#ua(),this.#le==="roster"&&this.#mt(),this.#Ui(),this.#n("LinkRoster notebook cleared."))}async#pa(e=!0){(e||this.#Zn===void 0)&&(this.#Ha=await this.service.totalUnread());let t=this.#Ha+(this.#tt?.totalUnread()??0);this.#_a=t,this.#r.hidden=t===0,this.#r.textContent=t>99?"99+":t.toString()}#Ks(){this.#T.style.height="auto",this.#T.style.height=`${Math.min(this.#T.scrollHeight,120)}px`}#ha(){let e=this.#T.value.length;this.#Le.textContent=`${e}/1000 \xB7 Ctrl+Enter`,this.#Le.dataset.over=String(e>1e3)}#zs(e){this.#e.style.setProperty("--kl-accent",e.ui.accent),this.#e.style.setProperty("--kl-accent-strong",e.ui.accent),this.#e.style.setProperty("--kl-accent-foreground",Wl(e.ui.accent)),this.#e.dataset.theme=e.ui.theme,this.#e.dataset.density=e.ui.density,this.#e.dataset.textScale=e.ui.textScale,this.#e.dataset.homeLayout=e.ui.homeLayout,this.#e.dataset.reducedMotion=String(e.ui.reducedMotion),this.#i.dataset.side=e.ui.launcherSide,this.#o.dataset.side=e.ui.launcherSide,this.#e.isConnected&&this.#ma()}#Ru(e){if(e.button!==0)return;let t=this.#i.getBoundingClientRect();this.#Tr={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,startLeft:t.left,startTop:t.top,moved:!1};try{this.#i.setPointerCapture(e.pointerId)}catch{}}#Lu(e){let t=this.#Tr;if(!t||t.pointerId!==e.pointerId)return;let i=e.clientX-t.startX,n=e.clientY-t.startY;!t.moved&&Math.hypot(i,n)<5||(t.moved=!0,e.preventDefault(),this.#i.dataset.dragging="true",this.#pd(t.startLeft+i,t.startTop+n))}#Eu(e){let t=this.#Tr;if(!(!t||t.pointerId!==e.pointerId)){this.#Tr=void 0,this.#i.dataset.dragging="false";try{this.#i.releasePointerCapture(e.pointerId)}catch{}t.moved&&(this.#Iu(),this.#cl=Date.now()+500)}}#Pu(e){!this.#Tr||this.#Tr.pointerId!==e.pointerId||(this.#Tr=void 0,this.#i.dataset.dragging="false",this.#ma())}#pd(e,t){let i=this.#i.offsetWidth||58,n=this.#i.offsetHeight||58,o=Math.max(0,window.innerWidth-i),a=Math.max(0,window.innerHeight-n),l=Fe(e,0,o),d=Fe(t,0,a),c=l+i/2<window.innerWidth/2?"left":"right";this.#i.style.left=`${Math.round(l)}px`,this.#i.style.top=`${Math.round(d)}px`,this.#i.style.right="auto",this.#i.style.bottom="auto",this.#i.dataset.side=c,this.#o.dataset.side=c}#Iu(){let e=this.#i.getBoundingClientRect(),t=Math.max(0,window.innerWidth-e.width),i=Math.max(0,window.innerHeight-e.height),n=t===0?.5:Fe(e.left/t,0,1),o=i===0?.5:Fe(e.top/i,0,1),a=e.left+e.width/2<window.innerWidth/2?"left":"right";this.settings.update(l=>{l.ui.launcherPosition={x:n,y:o},l.ui.launcherSide=a})}#ma(){let e=this.settings.get().ui;if(!e.launcherPosition){this.#i.style.removeProperty("left"),this.#i.style.removeProperty("top"),this.#i.style.removeProperty("right"),this.#i.style.removeProperty("bottom"),this.#i.dataset.side=e.launcherSide,this.#o.dataset.side=e.launcherSide;return}let t=this.#i.offsetWidth||58,i=this.#i.offsetHeight||58;this.#pd(e.launcherPosition.x*Math.max(0,window.innerWidth-t),e.launcherPosition.y*Math.max(0,window.innerHeight-i))}#Tu(e){if(e.button!==0||this.#js()||this.#lr)return;let t=e.currentTarget;for(let n of e.composedPath()){if(n===t)break;if(n instanceof Element&&n.matches("button, a, input, select, textarea, label, [role='button'], [contenteditable='true'], [data-no-panel-drag]"))return}let i=this.#o.getBoundingClientRect();this.#lr={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,startLeft:i.left,startTop:i.top,moved:!1};try{e.currentTarget?.setPointerCapture(e.pointerId)}catch{}}#_u(e){let t=this.#lr;if(!t||t.pointerId!==e.pointerId)return;let i=e.clientX-t.startX,n=e.clientY-t.startY;!t.moved&&Math.hypot(i,n)<5||(t.moved=!0,e.preventDefault(),this.#o.dataset.dragging="true",this.#hd(t.startLeft+i,t.startTop+n))}#Ou(e){let t=this.#lr;if(!(!t||t.pointerId!==e.pointerId)){this.#lr=void 0,this.#o.dataset.dragging="false";try{e.currentTarget?.releasePointerCapture(e.pointerId)}catch{}t.moved&&this.#Gu()}}#Du(e){!this.#lr||this.#lr.pointerId!==e.pointerId||(this.#lr=void 0,this.#o.dataset.dragging="false",this.#No())}#hd(e,t){if(this.#js())return;let i=this.#o.getBoundingClientRect(),n=i.width||Math.min(1040,Math.max(320,window.innerWidth-40)),o=i.height||Math.min(680,Math.max(420,window.innerHeight-130)),a=8,l=Math.max(a,window.innerWidth-n-a),d=Math.max(a,window.innerHeight-o-a);this.#o.style.left=`${Math.round(Fe(e,a,l))}px`,this.#o.style.top=`${Math.round(Fe(t,a,d))}px`,this.#o.style.right="auto",this.#o.style.bottom="auto"}#Gu(){let e=this.#o.getBoundingClientRect(),t=8,i=Math.max(t,window.innerWidth-e.width-t),n=Math.max(t,window.innerHeight-e.height-t),o=i===t?.5:Fe((e.left-t)/(i-t),0,1),a=n===t?.5:Fe((e.top-t)/(n-t),0,1);this.settings.update(l=>{l.ui.panelPosition={x:o,y:a}})}#No(){let e=this.settings.get().ui.panelPosition;if(!e||this.#js()){this.#o.style.removeProperty("left"),this.#o.style.removeProperty("top"),this.#o.style.removeProperty("right"),this.#o.style.removeProperty("bottom");return}let t=this.#o.getBoundingClientRect(),i=t.width||Math.min(1040,Math.max(320,window.innerWidth-40)),n=t.height||Math.min(680,Math.max(420,window.innerHeight-130)),o=8;this.#hd(o+e.x*Math.max(0,window.innerWidth-i-o*2),o+e.y*Math.max(0,window.innerHeight-n-o*2))}#js(){return window.innerWidth<=720}#Bu(){this.#o.dataset.mobileView="list",this.#ee.focus()}#ga(e){let t=s("img",{className:"kl-emblem-image"});return t.src=Fr,t.alt="",t.decoding="async",t.draggable=!1,s("span",{className:`kl-emblem ${e}`},t)}#Tn(e,t,i=""){let n=s("div",{className:`kl-avatar${i?` ${i}`:""}`});return this.#Nt(n,e,t),n}#Nt(e,t,i,n,o=!1){let a;try{a=this.presence.get(i)}catch{a={memberNumber:i,status:"unknown",source:"unknown",updatedAt:0}}let l=!1;try{l=i===this.adapter.getOwnMemberNumber()}catch{}let d=V(n??a.avatarUrl??"")??"",c=this.settings.get().linkPresence.profileImagePreviews,u=n!==void 0||l||c==="always"||c==="ask"&&this.#Oi.has(Kr(i,d))?d:"",p=l&&n!==void 0?this.#Mr.value||this.settings.get().linkPresence.avatarFrame:a.avatarFrame??"none";if(!o&&e.dataset.avatarName===t&&e.dataset.avatarUrl===u&&e.dataset.avatarFrame===p&&e.childNodes.length>0&&(!u||e.hasAttribute(Ce)||e.dataset.avatarState==="error"||e.dataset.avatarState==="limited"))return;let h=this.#Pn(e);e.dataset.kikilinkAvatar="true",e.dataset.avatarName=t,e.dataset.avatarUrl=u,e.dataset.avatarMemberNumber=i.toString(),e.dataset.avatarFrame=p,e.getAttribute("role")==="button"?e.setAttribute("aria-label",`Open KikiLink profile for ${t}`):e.removeAttribute("aria-label");let m=(x="initials")=>{e.replaceChildren(document.createTextNode(Lo(t))),e.dataset.avatarState=x},f=(x="initials")=>{!this.#rd(e,h)||e.dataset.avatarName!==t||e.dataset.avatarUrl!==u||m(x)};if(f(),!u)return;let y=()=>{this.#Ce(e),m("paused")},g=()=>{this.#Nt(e,t,i,n,!0)};this.#Is(e,()=>{if(!this.#pe(e,h))return;e.dataset.avatarState="loading";let x=this.#ia(e);this.#ra(u,x.signal).then(b=>{if(!this.#pe(e,h)||e.dataset.avatarName!==t||e.dataset.avatarUrl!==u){b.release();return}this.#na(e,b);let N=document.createElement("img");N.alt=`${t} profile avatar`,N.loading="eager",N.decoding="async",N.addEventListener("load",()=>{this.#pe(e,h)&&N.parentElement===e&&(e.dataset.avatarState="image",this.#Os(e,{pinned:this.#Ds(e),pause:y,reload:g})),this.#br(e,b)},{once:!0}),N.addEventListener("error",()=>{this.#br(e,b),this.#pe(e,h)&&N.parentElement===e&&e.dataset.avatarName===t&&e.dataset.avatarUrl===u&&(f("error"),this.#Ce(e),this.#En(e,g))},{once:!0}),e.replaceChildren(N),N.src=b.url}).catch(()=>{!x.signal.aborted&&this.#pe(e,h)&&e.dataset.avatarName===t&&e.dataset.avatarUrl===u&&(f("error"),this.#Ce(e),this.#En(e,g))}).finally(()=>this.#oa(e,x))})}#md(e,t){let i=V(t);if(!i)return;let n=Kr(e,i);for(this.#Oi.delete(n),this.#Oi.add(n);this.#Oi.size>200;){let o=this.#Oi.values().next().value;if(o===void 0)break;this.#Oi.delete(o)}}#Vs(e,t,i,n,o=!1){let a=!1;try{a=i===this.adapter.getOwnMemberNumber()}catch{}let l=V(n)??"",d=this.settings.get().linkPresence.profileImagePreviews,c=o||a||d==="always"||d==="ask"&&this.#cr.has(Eo(i,l))?l:"";if(e.dataset.bannerUrl===c&&e.dataset.bannerName===t&&(c?e.hasAttribute(Ce)||e.dataset.bannerState==="error"||e.dataset.bannerState==="limited":e.childElementCount===0))return;let u=this.#Pn(e);if(e.dataset.bannerUrl=c,e.dataset.bannerName=t,e.dataset.bannerState=c?"loading":"default",e.replaceChildren(),!c)return;let p=()=>{this.#Ce(e),e.replaceChildren(),e.dataset.bannerState="paused"},h=()=>{this.#Vs(e,t,i,n,o)};this.#Is(e,()=>{if(!this.#pe(e,u))return;e.dataset.bannerState="loading";let m=this.#ia(e);this.#ra(c,m.signal).then(f=>{if(!this.#pe(e,u)||e.dataset.bannerUrl!==c||e.dataset.bannerName!==t){f.release();return}this.#na(e,f);let y=document.createElement("img");y.alt=`${t} profile banner`,y.loading="eager",y.decoding="async",y.addEventListener("load",()=>{this.#pe(e,u)&&y.parentElement===e&&(e.dataset.bannerState="image",this.#Os(e,{pinned:this.#Ds(e),pause:p,reload:h})),this.#br(e,f)},{once:!0}),y.addEventListener("error",()=>{this.#br(e,f),!(!this.#pe(e,u)||y.parentElement!==e||e.dataset.bannerUrl!==c||e.dataset.bannerName!==t)&&(e.replaceChildren(),e.dataset.bannerState="error",this.#Ce(e),this.#En(e,h))},{once:!0}),e.replaceChildren(y),y.src=f.url}).catch(()=>{!m.signal.aborted&&this.#pe(e,u)&&e.dataset.bannerUrl===c&&e.dataset.bannerName===t&&(e.replaceChildren(),e.dataset.bannerState="error",this.#Ce(e),this.#En(e,h))}).finally(()=>this.#oa(e,m))},"banner")}#Uu(e,t){let i=V(t);if(!i)return;let n=Eo(e,i);for(this.#cr.delete(n),this.#cr.add(n);this.#cr.size>100;){let o=this.#cr.values().next().value;if(o===void 0)break;this.#cr.delete(o)}}#qs(){let e=V(this.#ct.value);this.#Nt(this.#wa,this.adapter.getOwnName(),this.adapter.getOwnMemberNumber(),e??""),this.#wa.dataset.avatarFrame=this.#Mr.value||"none"}#Xr(){let e=tt(this.#Si.value),t=tt(this.#tr.value);this.#ni.checked&&e&&t?(this.#Sr.dataset.customGradient="true",this.#Sr.style.backgroundImage=`linear-gradient(125deg, ${e}, ${t})`):(delete this.#Sr.dataset.customGradient,this.#Sr.style.removeProperty("background-image")),this.#Vs(this.#Sr,this.adapter.getOwnName(),this.adapter.getOwnMemberNumber(),this.#Ve.value,!0)}#n(e,t="info"){this.#oi!==void 0&&clearTimeout(this.#oi),this.#oi=void 0,this.#t.querySelector(".kl-toast")?.remove();let i=s("div",{className:"kl-toast"},s("span",{className:"kl-toast-message",text:e}));i.dataset.kind=t,i.setAttribute("role",t==="error"?"alert":"status"),i.setAttribute("aria-live",t==="error"?"assertive":"polite"),i.setAttribute("aria-atomic","true");let n=s("button",{className:"kl-toast-dismiss",type:"button",title:"Dismiss message",ariaLabel:"Dismiss message",onClick:()=>{this.#oi!==void 0&&clearTimeout(this.#oi),this.#oi=void 0,i.remove()}});n.append(w("close")),i.append(n);let o=this.#ze.open?this.#ze:this.#o.hidden?this.#t:this.#o;o===this.#t&&(i.classList.add("kl-toast--floating"),i.dataset.side=this.settings.get().ui.launcherSide),o.append(i),t==="info"&&(this.#oi=setTimeout(()=>{i.remove(),this.#oi=void 0},5e3))}};function At(r,e,t=""){return s("label",{className:`kl-reaction-field${t?` ${t}`:""}`},s("span",{className:"kl-reaction-field-label",text:r}),e)}function Lm(r){let e=r.trim();if(!e)return[];let t=[];for(let i of e.split(/[\s,;]+/u).filter(Boolean)){let n=i.replace(/^#/u,"");if(!/^\d+$/u.test(n))return;let o=Number(n);if(!Number.isSafeInteger(o)||o<0||(t.includes(o)||t.push(o),t.length>20))return}return t}function Bl(){let r=typeof globalThis.crypto?.randomUUID=="function"?globalThis.crypto.randomUUID().slice(0,12):Math.random().toString(36).slice(2,14);return`reaction-${Date.now().toString(36)}-${r}`}function Nt(r,e){return r==="sparkle"||r==="pop"||r==="chime"||/^custom:[a-z0-9_-]{1,64}$/iu.test(r)?r:e}function Em(r){return r==="kick"?"Kicked":r==="promote"?"Promoted":r==="demote"?"Removed admin from":r==="whitelist"?"Whitelisted":"Removed from room whitelist"}function Pm(){return[{section:"appearance",title:"Appearance & comfort",detail:"Theme, logo comfort, room Blossom position, spacing, text size, and motion",keywords:"light dark system color colour blossom addon badge icon position drag reset guided focused density compact super tiny font scale reduced motion"},{section:"navigation",title:"Navigation & launcher",detail:"Opening destination, side, and launcher position",keywords:"home last chat left right drag reset emblem start screen"},{section:"chat",title:"Chat & history",detail:"Typing, temporary Litterbox sharing, history, retention, and Quick Actions",keywords:"beep messages typing indicator realtime image picture preview upload local litterbox catbox temporary privacy enter send newline save storage hours days clear wave hug boop template afk idle avatar profile"},{section:"players",title:"Players & notebook",detail:"Roster, encounters, retention, notes, and notebook backup",keywords:"people linkroster tracking private data clear whisper profile export import backup json favorites tags retention"},{section:"activities",title:"Custom Activities",detail:"Body slots, vanilla pictures, action text, and optional arousal",keywords:"custom activities blossom body slot image target me gender pronoun arousal advanced"},{section:"reactions",title:"Notifications",detail:"Friend, room, and chat alerts with optional sounds and advanced rules",keywords:"alert sound audio chime sparkle pop linkreactions automation event rule beep join leave online friend notification notice emote advanced cooldown template"},{section:"about",title:"About KikiLink",detail:"Creator, version, Discord, repository, and license",keywords:"about creator kiki member number version discord community github repository license mit"}].map((e,t)=>({id:`setting-${e.section}`,kind:"setting",icon:"settings",category:"Settings",title:e.title,detail:e.detail,keywords:e.keywords,priority:58-t,action:{kind:"setting",section:e.section}}))}function Oi(r){return r.trim().toLocaleLowerCase().normalize("NFKD").replace(/\p{M}/gu,"").replace(/\s+/gu," ")}function Im(r,e){let t=e.split(" ").filter(Boolean);return r.map(i=>{let n=Oi(i.title),o=Oi(i.detail),a=Oi(i.category),l=`${n} ${o} ${a} ${Oi(i.keywords)}`;if(!t.every(c=>l.includes(c)))return;let d=i.priority;n===e?d+=1e3:n.startsWith(e)?d+=650:n.includes(e)&&(d+=360),a===e?d+=220:a.startsWith(e)&&(d+=90),o.startsWith(e)&&(d+=80);for(let c of t)n.split(" ").some(u=>u.startsWith(c))&&(d+=35);return{result:i,score:d}}).filter(i=>i!==void 0).sort((i,n)=>n.score-i.score||i.result.title.localeCompare(n.result.title)).map(i=>i.result)}function Hr(r,e){return s("div",{className:"kl-about-fact"},s("dt",{text:r}),s("dd",{text:e}))}function A(r,e){let t=s("option",{text:e});return t.value=r,t}function se(r,e){let t=r.find(i=>i.id===e)??r[0];if(!t)throw new Error("Create a playlist first");return t}function Jl(r){return new Set(r.linkMusic.playlists.flatMap(e=>e.tracks.filter(t=>t.source==="local").map(t=>t.locator)))}function Ul(r){return[...Jl(r)].sort().join(`
`)}function ti(r){let e=typeof crypto=="object"&&typeof crypto.randomUUID=="function"?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;return`${r}-${e}`.toLocaleLowerCase().replace(/[^a-z0-9_-]/gu,"").slice(0,64)}function Tm(r){let e=r.trim();if(!e||e.length>500)throw new Error("Enter a direct HTTPS audio link");let t;try{t=new URL(e)}catch{throw new Error("Enter a valid direct HTTPS audio link")}if(t.protocol!=="https:"||t.username||t.password||!/\.(?:aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/iu.test(t.pathname))throw new Error("Use a direct HTTPS audio link ending in a supported audio extension");return t.href}function Fl(r){try{let e=new URL(r);return e.protocol==="https:"&&!e.username&&!e.password&&/\.(?:mp3|mp4)$/iu.test(e.pathname)?e.href:void 0}catch{return}}function _m(r){try{let e=new URL(r).pathname.split("/").at(-1)??"";return decodeURIComponent(e).replace(/\.[^.]+$/u,"").replace(/[_-]+/gu," ").trim().slice(0,80)}catch{return"Untitled track"}}function Hl(r){let e=Number.isFinite(r)&&r>0?Math.floor(r):0;return`${Math.floor(e/60)}:${(e%60).toString().padStart(2,"0")}`}function Om(r){return r==="X"?"Mixed":r==="M"?"Male":"Female"}function qe(r){return r.trim().replace(/\s+/gu," ").toLocaleLowerCase()}function Dm(r){let e=r.trim().toLocaleLowerCase();return e?e==="never"?"Character view":e==="always"?"Map view":`Map mode: ${r.trim()}`:""}function So(r){return r==="owner"?"Owner":r==="sub"?"Sub":r==="lover"?"Lover":r==="whitelist"?"Whitelist":r==="blacklist"?"Blacklist":"Ghosted"}function Ro(r){return r==="owner"?"This player is your current owner":r==="sub"?"This player is your BC submissive":r==="lover"?"This player is in your BC lover list":r==="whitelist"?"This player is on your BC whitelist":r==="blacklist"?"This player is on your BC blacklist":"This player is on your BC ghost list"}function Ie(r){return r==="online"?"Online":r==="idle"?"Idle":r==="dnd"?"Do not disturb":r==="offline"?"Offline":"Status unavailable"}function Gm(r){return r==="online"?"Available and ready to chat":r==="idle"?"Away for a little while":r==="dnd"?"Silences local alerts and stops chat auto-open":"Appear offline inside KikiLink"}function ge(r){let e=s("span",{className:"kl-presence-dot"});return e.dataset.status=r,e.setAttribute("aria-hidden","true"),e}function Ii(r){let e=Ie(r.status),t=r.source==="kikilink"?"shared by KikiLink":r.source==="room"?"currently in your room":r.source==="friend-list"?"Bondage Club friend list":"not available for this player";return r.statusMessage?`${e} \xB7 ${r.statusMessage} \xB7 ${t}`:`${e} \xB7 ${t}`}function $l(r){return JSON.stringify([r.status,r.statusMessage??"",r.avatarUrl??"",r.avatarFrame??"none",r.profileStyle??"classic",r.bannerUrl??"",r.bio??"",r.profileOutlineColor??"",r.profileGradient?.enabled??!1,r.profileGradient?.primary??"",r.profileGradient?.secondary??"",r.addonVersion??"",r.roomName??"",r.source,r.profileFromCache??!1,r.profileSyncedAt??0])}function $r(r){let e=fr(r)?.content??r,t=e.trim();return Tt(t).find(n=>n.image&&n.start===0&&n.end===t.length)?"Image":e}function Kl(r,e,t){let i=e!==void 0&&r===e,n=e!==void 0&&t===e;return i&&n?"middle":i?"end":n?"start":"single"}function Lo(r){let e=r.trim();return e?[...e][0]?.toLocaleUpperCase()??"?":"?"}function Kr(r,e){return`${r}:${e}`}function Eo(r,e){return`${r}:${e}`}function Ct(r){return!r?.isConnected||r.hidden?!1:r instanceof HTMLButtonElement||r instanceof HTMLInputElement||r instanceof HTMLSelectElement||r instanceof HTMLTextAreaElement?!r.disabled:!0}function zr(r,e){return r.composedPath().find(i=>i instanceof HTMLElement&&i.classList.contains("kl-profile-menu-target"))===e}function Bm(r){return["kl-group-contact-profile","kl-group-confirm-profile","kl-group-participant","kl-group-message-profile"].find(e=>r?.classList.contains(e))}function tt(r){let e=r.trim().toLocaleLowerCase();return/^#[0-9a-f]{6}$/u.test(e)?e:""}function Um(r,e){return`#${[1,3,5].map(i=>Math.round((Number.parseInt(r.slice(i,i+2),16)+Number.parseInt(e.slice(i,i+2),16))/2)).map(i=>i.toString(16).padStart(2,"0")).join("")}`}function zl(r){let e=new Date(r),t=new Date;return e.toDateString()===t.toDateString()?Po.format(e):Yl.format(e)}function Ti(r){return Po.format(new Date(r))}function _i(r){if(!r)return"\u2014";let e=Math.max(0,Date.now()-r),t=Math.floor(e/6e4);if(t<1)return"now";if(t<60)return`${t}m`;let i=Math.floor(t/60);if(i<24)return`${i}h`;let n=Math.floor(i/24);return n<30?`${n}d`:Yl.format(new Date(r))}function Fm(){let r=new Date().getHours();return r<5?"Still awake":r<12?"Good morning":r<18?"Good afternoon":"Good evening"}function jr(r){return r?Mm.format(new Date(r)):"Not recorded"}function jl(r){return r<1024?`${r} B`:r<1024*1024?`${Math.round(r/1024)} KB`:`${(r/(1024*1024)).toFixed(1)} MB`}function ii(r){let e=Number.parseInt(r,10);return e===24?"1 day":e===72?"3 days":`${e} hour${e===1?"":"s"}`}function Vl(r){return Number.parseInt(r,10)*60*60*1e3}function Hm(r){try{return`Expires ${new Date(r).toLocaleString([],{dateStyle:"medium",timeStyle:"short"})}`}catch{return"Expiry unavailable"}}function $m(r){let e=r.mimeType.toLocaleLowerCase().split(";",1)[0],t=e==="audio/mpeg"?"mp3":e==="audio/mp4"||e==="video/mp4"?"mp4":void 0,i=r.roomExtension??t;if(!i)throw new Error("Bondage Club room music must be a device MP3 or MP4 track");let n=i==="mp3"?"audio/mpeg":e==="video/mp4"?"video/mp4":"audio/mp4";return new File([r.blob],`kikilink-device-room-music.${i}`,{type:n,lastModified:0})}function Vr(r){return((r instanceof Error?r.message.trim():"Unable to prepare this image")||"Unable to prepare this image").slice(0,180)}async function ql(r){if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(r);return}let e=document.createElement("textarea");e.value=r,e.style.position="fixed",e.style.opacity="0",document.body.append(e),e.select();let t=document.execCommand("copy");if(e.remove(),!t)throw new Error("Clipboard unavailable")}function Wl(r){let e=[1,3,5].map(o=>Number.parseInt(r.slice(o,o+2),16)),t=Km(e),i=(t+.05)/.057,n=1.044/(t+.05);return i>=n?"#17100d":"#fff8ee"}function Km(r){let[e=0,t=0,i=0]=r.map(n=>{let o=n/255;return o<=.04045?o/12.92:((o+.055)/1.055)**2.4});return e*.2126+t*.7152+i*.0722}function Fe(r,e,t){return Math.min(t,Math.max(e,r))}var Wr=class{constructor(e,t){this.adapter=e;this.callbacks=t;let i=t.now;this.#r=i?()=>i.call(t):Date.now}adapter;callbacks;#e=new Set;#t=new Map;#i=[];#r;#a;syncStatus(){try{this.#c(this.callbacks.getStatus())}catch{this.#c("online")}}handleIncoming(e){if(e.direction!=="incoming"||!jm(e.peerNumber))return;let t,i;try{t=this.callbacks.getStatus(),i=this.callbacks.getConfig()}catch{return}if(this.#c(t),t!=="idle"&&t!=="dnd"||i.enabled!==!0)return;let n=zm(i.message);if(!n||this.#e.has(e.peerNumber))return;let o=this.#l();this.#o(o);let a=this.#t.get(e.peerNumber);if(!(a!==void 0&&o-a<18e5)&&!(this.#i.length>=5)){this.#e.add(e.peerNumber);try{let l=this.adapter.sendBeep(e.peerNumber,n,!1);return this.#t.set(e.peerNumber,o),this.#i.push(o),l}catch{this.#e.delete(e.peerNumber);return}}}reset(){this.#a=void 0,this.#e.clear(),this.#t.clear(),this.#i.splice(0)}#c(e){let t=e==="idle"||e==="dnd"?e:void 0;t!==this.#a&&(this.#a=t,this.#e.clear())}#l(){let e=this.#r();return Number.isFinite(e)&&e>=0?e:Date.now()}#o(e){for(;this.#i.length>0&&e-(this.#i[0]??e)>=6e4;)this.#i.shift();for(let[t,i]of this.#t)e-i>=18e5&&this.#t.delete(t)}};function zm(r){return typeof r!="string"?"":r.trim().slice(0,1e3)}function jm(r){return Number.isSafeInteger(r)&&r>=0}var Io="kikilink:public-profile-cache:v1";var Vm=/\.(?:gif|jpe?g|png|webp)$/iu,qm=/^[a-z0-9_-]{1,64}$/iu,Wm=/^[a-z0-9][a-z0-9._+-]{0,23}$/iu,Xm=/^#[0-9a-f]{6}$/iu,Ym=/[\u0000-\u0020\u007f-\u009f]/u,Jm=/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu,Yr=class{constructor(e){this.storage=e;this.#c()}storage;#e=new Map;#t=new Map;#i=new Map;#r=0;get(e,t=Date.now()){return this.#a(e,t,!0)}peek(e,t=Date.now()){return this.#a(e,t,!1)}#a(e,t,i){if(!Do(e))return;let n=this.#e.get(e);if(!n)return;let o=_o(t);if(To(n,o)){this.#g(e),this.#l();return}let a=Jr(n,o);if(!i)return a&&this.#l(),structuredClone(n);this.#p(e),o>n.lastAccessedAt&&(n.lastAccessedAt=o);let l=this.#i.get(e)??0;return(a||n.lastAccessedAt-l>=3e5)&&this.#l(),structuredClone(n)}list(e=Date.now()){return this.prune(e),this.#s().map(t=>structuredClone(t))}upsert(e,t=Date.now()){let i=_o(t),n=Qm(e,i);if(!n)throw new Error("Invalid cached public profile record");let o=this.#e.get(n.memberNumber);return o&&o.syncedAt>i?structuredClone(o):(this.#e.set(n.memberNumber,n),this.#p(n.memberNumber),this.#o(i),this.#l(),structuredClone(n))}remove(e){return!Do(e)||!this.#e.has(e)?!1:(this.#g(e),this.#l(),!0)}clear(){this.#e.clear(),this.#t.clear(),this.#i.clear(),this.#l()}prune(e=Date.now()){let t=this.#o(_o(e));return t.changed&&this.#l(),t.removed}#c(){let e;try{e=this.storage.getItem(Io)}catch{return}if(!(!e||e.length>512e3))try{let t=JSON.parse(e);if(!Di(t)||t.version!==2&&t.version!==1||!Array.isArray(t.records))return;let i=Date.now(),n=new Map;for(let[d,c]of t.records.slice(0,800).entries()){let u=Zm(c,i,t.version===1);if(!u||To(u,i))continue;let p=n.get(u.memberNumber);(!p||og(u,p.record))&&n.set(u.memberNumber,{record:u,index:d})}let o=[...n.values()].sort((d,c)=>ed(d.record,c.record)||c.index-d.index);for(let{record:d}of o)this.#e.set(d.memberNumber,d),this.#p(d.memberNumber),this.#i.set(d.memberNumber,d.lastAccessedAt);let a=this.#o(i),l=this.#e.size===0?null:JSON.stringify({version:2,records:this.#s()});(t.version===1||a.changed||l!==e)&&this.#l()}catch{}}#l(){try{if(this.#e.size===0)return this.storage.removeItem(Io),this.#i.clear(),!0;let e={version:2,records:this.#s()};this.storage.setItem(Io,JSON.stringify(e));for(let t of this.#e.values())this.#i.set(t.memberNumber,t.lastAccessedAt);return!0}catch{return!1}}#o(e){let t=this.#e.size,i=!1;for(let[n,o]of this.#e)To(o,e)?(this.#g(n),i=!0):Jr(o,e)&&(i=!0);if(this.#e.size>200){let n=[...this.#e.values()].sort((o,a)=>ed(o,a)||(this.#t.get(o.memberNumber)??0)-(this.#t.get(a.memberNumber)??0));for(let o of n){if(this.#e.size<=200)break;this.#g(o.memberNumber),i=!0}}return{removed:t-this.#e.size,changed:i}}#s(){return[...this.#e.values()].sort((e,t)=>ag(e,t)||(this.#t.get(t.memberNumber)??0)-(this.#t.get(e.memberNumber)??0))}#p(e){this.#r+=1,this.#t.set(e,this.#r)}#g(e){this.#e.delete(e),this.#t.delete(e),this.#i.delete(e)}};function Qm(r,e){let t=td(r);if(!t)return;let i=Go(t)?Di(r)&&Xr(r.richSyncedAt)&&r.richSyncedAt<=e?r.richSyncedAt:e:void 0,n={...t,...i!==void 0?{richSyncedAt:i}:{},syncedAt:e,lastAccessedAt:e};return Jr(n,e),n}function Zm(r,e,t){let i=td(r);if(!i||!Di(r)||!Xr(r.syncedAt)||!Xr(r.lastAccessedAt)||r.syncedAt>e||r.lastAccessedAt>e||r.lastAccessedAt<r.syncedAt)return;let n;if(Go(i)){let a=t?r.syncedAt:r.richSyncedAt;Xr(a)&&a<=r.syncedAt&&a<=e?n=a:id(i)}let o={...i,...n!==void 0?{richSyncedAt:n}:{},syncedAt:r.syncedAt,lastAccessedAt:r.lastAccessedAt};return Jr(o,e),o}function td(r){if(!Di(r)||!Do(r.memberNumber))return;let e=Zl(r.displayName,80)||`Member ${r.memberNumber}`,t=Ql(r.avatarUrl),i=Ql(r.bannerUrl),n=Zl(r.bio,160),o=eg(r.avatarFrame),a=tg(r.profileStyle),l=Oo(r.profileOutlineColor),d=ig(r.profileGradient),c=rg(r.profileRevision),u=ng(r.addonVersion);return{memberNumber:r.memberNumber,displayName:e,...t?{avatarUrl:t}:{},...o?{avatarFrame:o}:{},...a?{profileStyle:a}:{},...i?{bannerUrl:i}:{},...n?{bio:n}:{},...l?{profileOutlineColor:l}:{},...d?{profileGradient:d}:{},...c?{profileRevision:c}:{},...u?{addonVersion:u}:{}}}function Ql(r){if(typeof r!="string")return;let e=r.trim();if(!(!e||e.length>500||Ym.test(e)))try{let t=new URL(e);return t.protocol!=="https:"||t.username||t.password||!t.hostname||!Vm.test(t.pathname)||t.href.length>500?void 0:t.href}catch{return}}function eg(r){return r==="none"||r==="blossom"||r==="rose"||r==="starlight"||r==="laurel"||r==="thorn"||r==="moon"||r==="ribbon"?r:void 0}function tg(r){return r==="classic"||r==="garden"||r==="midnight"?r:void 0}function ig(r){if(!Di(r))return;let e=Oo(r.primary),t=Oo(r.secondary);return r.enabled===!0&&e&&t?{enabled:!0,primary:e,secondary:t}:void 0}function Oo(r){return typeof r=="string"&&Xm.test(r)?r.toLowerCase():void 0}function rg(r){if(typeof r!="string")return;let e=r.trim();return e.length<=64&&qm.test(e)?e:void 0}function ng(r){if(typeof r!="string")return;let e=r.trim();return e.length<=24&&Wm.test(e)?e:void 0}function Zl(r,e){return typeof r!="string"?"":[...r.replace(Jm," ").replace(/\s+/gu," ").trim()].slice(0,e).join("")}function Go(r){return!!(r.bannerUrl||r.bio||r.profileOutlineColor||r.profileGradient)}function id(r){delete r.bannerUrl,delete r.bio,delete r.profileOutlineColor,delete r.profileGradient,delete r.richSyncedAt}function Jr(r,e){return Go(r)?r.richSyncedAt!==void 0&&e-r.richSyncedAt<=7776e6?!1:(id(r),!0):r.richSyncedAt===void 0?!1:(delete r.richSyncedAt,!0)}function To(r,e){return e-r.syncedAt>7776e6}function og(r,e){return r.syncedAt>e.syncedAt||r.syncedAt===e.syncedAt&&r.lastAccessedAt>e.lastAccessedAt}function ag(r,e){return e.lastAccessedAt-r.lastAccessedAt||e.syncedAt-r.syncedAt}function ed(r,e){return r.lastAccessedAt-e.lastAccessedAt||r.syncedAt-e.syncedAt}function _o(r){return Number.isSafeInteger(r)&&r>=0?r:Date.now()}function Do(r){return typeof r=="number"&&Number.isSafeInteger(r)&&r>0}function Xr(r){return typeof r=="number"&&Number.isSafeInteger(r)&&r>=0}function Di(r){return typeof r=="object"&&r!==null&&!Array.isArray(r)}var Qr=class{id="link-chat";#e=new fe("link-chat");#t=[];#i;#r;#a;#c;#l;#o;#s;#p;#g;isEnabled(e){return e.linkChat.enabled}start(e){this.#i=e;let t=e.accountStorage??new be;if(this.#r=new Wi(e.repository,e.settings),this.#a=new Gt(e.adapter,e.settings),this.#a.start(),this.#c=new Ut(e.adapter,new Ft(t),e.settings),this.#l=new zt(e.adapter,e.settings,e.bus,e.version,new Yr(t),e.memberNumber),this.#l.start(),this.#o=new Wr(e.adapter,{getStatus:()=>this.#l?.getOwnStatus()??"online",getConfig:()=>e.settings.get().linkPresence.afkAutoReply}),this.#o.syncStatus(),this.#t.push(this.#l.subscribe(()=>this.#o?.syncStatus())),this.#c.prune(),this.#s=new Ir(e.adapter,t,{hasManagedPeer:n=>this.#l?.hasGroupManagedPeer(n)===!0,shouldPersistHistory:()=>e.settings.get().linkChat.saveHistory}),this.#p=new qr(e.adapter,this.#r,e.settings,e.version,this.#a,this.#c,this.#l),this.#p.attachGroupChatService(this.#s),this.#p.mount(),typeof window<"u"){let n=()=>{this.#p?.flushGroupStateForPageHide();let o=e.accountStorage;typeof o?.flush=="function"&&o.flush()};window.addEventListener("pagehide",n),this.#t.push(()=>window.removeEventListener("pagehide",n))}this.#t.push(e.bus.on("bc:status",({state:n,message:o})=>this.#p?.setConnectionState(n,o)),e.bus.on("bc:ready",()=>{this.#a?.syncFromSettings(),this.#m(),this.#h()}),e.bus.on("beep:received",n=>{this.#d(n)}),e.bus.on("beep:sent",n=>{this.#d(n)}),e.bus.on("bc:protocol",n=>{this.#u(n)}),e.bus.on("link-reactions:notification",n=>this.#p?.onNotification(n)),e.bus.on("link-reactions:fired",n=>this.#p?.onReaction(n))),this.#p.setConnectionState(e.adapter.isReady()?"ready":"connecting"),this.#r.prune();let i=e.settings.get().linkChat;this.#s.applyHistoryPolicy(Date.now()-i.retentionDays*24*60*60*1e3),this.#h(),this.#g=setInterval(()=>this.#h(),2e3)}async stop(){this.#g!==void 0&&clearInterval(this.#g),this.#g=void 0;for(let t of this.#t.splice(0).reverse())t();this.#p?.destroy(),this.#p=void 0;let e=this.#s;this.#s=void 0,e&&(await e.destroy()).degraded&&this.#e.warn("Group changes remain session-only because browser storage is unavailable"),this.#a?.stop(),this.#a=void 0,this.#l?.stop(),this.#l=void 0,this.#o?.reset(),this.#o=void 0,this.#r=void 0,this.#c=void 0,this.#i=void 0}open(){this.#y()&&this.#p?.open()}close(){this.#p?.close()}openChat(e,t){this.#y()&&this.#p?.openChat(e,t)}openRoster(){this.#y()&&this.#p?.openRoster()}openActivities(){this.#y()&&this.#p?.openActivities()}async#d(e){if(!this.#r||!this.#p||!this.#i||!this.#y())return;let t=e.direction==="incoming"?this.#o?.handleIncoming(e):void 0;try{this.#i.settings.get().linkRoster.enabled&&this.#c?.observePerson(e.peerNumber,e.peerName,e.sentAt);let i=this.#p.isActiveConversation(e.peerNumber),n=await this.#r.capture(e,i);await this.#p.onMessage(e.peerNumber,e.direction==="incoming",n),this.#i.bus.emit("link-chat:updated",{peerNumber:e.peerNumber})}catch(i){this.#e.error("Failed to capture a Beep",i)}t&&await this.#d(t)}async#u(e){if(!(!this.#s||!this.#y()))try{await this.#s.receiveProtocol(e,this.#p?.getActiveGroupId())}catch(t){this.#e.error("Failed to capture a KikiLink group packet",t)}}#h(){if(!(!this.#c||!this.#p||!this.#i||!this.#y())){if(!this.#i.settings.get().linkRoster.enabled){this.#p.onRosterSync({changed:!1,presentCount:0,joined:[],left:[]});return}try{this.#p.onRosterSync(this.#c.sync())}catch(e){this.#e.error("Failed to synchronize LinkRoster",e)}}}async#m(){if(!(!this.#r||!this.#p||!this.#i||!this.#y()))try{for(let e of this.#i.adapter.getRecentBeeps()){this.#i.settings.get().linkRoster.enabled&&this.#c?.observePerson(e.peerNumber,e.peerName,e.sentAt),await this.#r.captureRecent(e);let t=this.#i.adapter.getMemberNickname(e.peerNumber);t&&await this.#r.setPeerName(e.peerNumber,t)}await this.#p.refresh()}catch(e){this.#e.error("Failed to import recent Beeps",e)}}#y(){let e=this.#i?.memberNumber;return e===void 0||typeof Player!="object"||Player===null?!0:Player.MemberNumber===e}};var en=class{constructor(e,t,i){this.adapter=e;this.settings=t;this.canActForAccount=i}adapter;settings;canActForAccount;#e=new Map;#t=Number.NEGATIVE_INFINITY;react(e,t=Date.now()){if(!this.#i())return;let i=this.settings.get().linkReactions;if(this.#i()&&i.enabled)for(let n of i.rules){if(!this.#i())return;if(!sg(n,e))continue;let o=this.#e.get(n.id)??Number.NEGATIVE_INFINITY;if(t-o<n.cooldownSeconds*1e3)continue;let a=lg(n,e,this.adapter.getOwnName());if(!this.#i())return;if(a){if(n.action==="room-emote"){if(t-this.#t<1e4||!this.adapter.canSendRoomEmote())continue;if(!this.#i()||(this.adapter.sendRoomEmote(a),!this.#i()))return;this.#t=t}return this.#i()?(this.#e.set(n.id,t),{ruleId:n.id,ruleLabel:n.label,action:n.action,message:a,event:e,firedAt:t}):void 0}}}#i(){try{return this.canActForAccount()===!0}catch{return!1}}};function sg(r,e){return!r.enabled||r.trigger!==e.trigger||r.scope==="friends"&&!e.isFriend||r.scope==="members"&&!r.memberNumbers.includes(e.memberNumber)?!1:r.trigger==="beep-received"&&r.textMatch?rd(e.content??"").includes(rd(r.textMatch)):!0}function lg(r,e,t){let i=e.trigger==="room-join"?"joined the room":e.trigger==="room-leave"?"left the room":e.trigger==="friend-online"?"came online":"sent a Beep",n=r.action==="notice"?Zr(e.content):"";return r.template.replaceAll("{name}",Zr(e.memberName)).replaceAll("{member}",e.memberNumber.toString()).replaceAll("{message}",n).replaceAll("{room}",Zr(e.roomName)||"the room").replaceAll("{me}",Zr(t)||"me").replaceAll("{event}",i).replace(/[\u0000-\u001f\u007f]/gu," ").replace(/\s+/gu," ").trim().slice(0,1e3)}function rd(r){return r.trim().toLocaleLowerCase().normalize("NFKD").replace(/\p{M}/gu,"").replace(/\s+/gu," ")}function Zr(r){return typeof r=="string"?r.replace(/[\u0000-\u001f\u007f]/gu," ").replace(/\s+/gu," ").trim().slice(0,500):""}var dg=2e3,tn=class{id="link-reactions";#e=new fe("link-reactions");#t=[];#i=new Map;#r;#a;#c;#l;#o;isEnabled(e){return!0}start(e){this.#r=e,this.#a=new en(e.adapter,e.settings,()=>this.#m()),this.#t.push(e.bus.on("bc:ready",()=>this.#s()),e.bus.on("beep:received",t=>{if(!this.#m()||(this.#u("chat",`New Beep from ${t.peerName}.`,!1,t.peerNumber,t.sentAt),!this.#m()))return;let i=e.adapter.isKnownFriend(t.peerNumber);this.#m()&&this.#h({trigger:"beep-received",memberNumber:t.peerNumber,memberName:t.peerName,isFriend:i,occurredAt:t.sentAt,content:t.content,...t.roomName?{roomName:t.roomName}:{}})}),e.bus.on("bc:online-friends",({friends:t,receivedAt:i})=>this.#d(t,i))),this.#p(),this.#c=setInterval(()=>this.#p(),dg)}stop(){this.#c!==void 0&&clearInterval(this.#c),this.#c=void 0;for(let e of this.#t.splice(0).reverse())e();this.#i.clear(),this.#l=void 0,this.#o=void 0,this.#a=void 0,this.#r=void 0}#s(){this.#m()&&(this.#i.clear(),this.#l=void 0,this.#o=void 0,this.#p())}#p(){let e=this.#r;if(!e||!this.#m())return;let t=e.adapter.isInChatRoom();if(!this.#m())return;if(!t){this.#i.clear(),this.#l=void 0;return}let i=e.adapter.getCurrentRoomName()??"Unnamed room";if(!this.#m())return;let n=new Map(e.adapter.getRoomCharacters().map(d=>[d.memberNumber,d]));if(!this.#m())return;if(this.#l!==i){this.#l=i,this.#g(n);return}let o=[...n.values()].filter(d=>!this.#i.has(d.memberNumber)),a=[...this.#i.values()].filter(d=>!n.has(d.memberNumber));this.#g(n);let l=Date.now();for(let d of o){if(!this.#m())return;let c=nd("room-join",d,i,l);this.#u("room-join",`${d.memberName} joined ${i}.`,!0,d.memberNumber,l),this.#h(c)}for(let d of a){if(!this.#m())return;this.#h(nd("room-leave",d,i,l))}}#g(e){this.#i.clear();for(let[t,i]of e)this.#i.set(t,i)}#d(e,t){if(!this.#m())return;let i=new Set(e.map(o=>o.memberNumber)),n=this.#o;if(this.#o=i,!!n)for(let o of e){if(!this.#m())return;if(n.has(o.memberNumber))continue;let a={trigger:"friend-online",memberNumber:o.memberNumber,memberName:o.memberName,isFriend:!0,occurredAt:t,...o.roomName?{roomName:o.roomName}:{}};this.#u("friend-online",`${o.memberName} is online.`,!0,o.memberNumber,t),this.#h(a)}}#u(e,t,i,n,o){let a=this.#r;if(!a||!this.#m())return;let l=a.settings.get().linkReactions;(e==="chat"?l.sounds.enabled:e==="friend-online"?l.quickAlerts.friendOnline:l.quickAlerts.roomJoin)&&this.#m()&&a.bus.emit("link-reactions:notification",{kind:e,message:t,showToast:i,memberNumber:n,occurredAt:o})}#h(e){let t=this.#r,i=this.#a;if(!(!t||!i||!this.#m()))try{let n=i.react(e);n&&this.#m()&&t.bus.emit("link-reactions:fired",n)}catch(n){this.#e.error("Failed to run a reaction rule",n)}}#m(){let e=this.#r?.memberNumber;if(typeof e!="number"||!Number.isSafeInteger(e)||e<=0)return!1;try{if(typeof ServerIsLoggedIn=="function"&&!ServerIsLoggedIn()||typeof Player!="object"||Player===null)return!1;let t=Player.MemberNumber;return Number.isSafeInteger(t)&&t===e}catch{return!1}}};function nd(r,e,t,i){return{trigger:r,memberNumber:e.memberNumber,memberName:e.memberName,isFriend:e.isFriend===!0,roomName:t,occurredAt:i}}var Bo="KikiLink",od="kikilink:cloud-mirror:v1",Gi="kikilink:chat-dirty:v1",ad="kikilink:chat-cleared-at:v1",Fo="KIKILINK/1:",Ho="JSON:",cg=5e3,Bi=12e4,ud=100,pd=600,ug=100,$o=500,Uo=512e3,Ko=class{constructor(e,t=Ag()){this.backing=t;if(!rt(e))throw new Error("A valid BC account is required");this.#e=`kikilink:account:${e}:`}backing;#e;getItem(e){return this.backing.getItem(this.#t(e))}getItemResult(e){let t=this.#t(e);try{return this.backing.getItemResult?.(t)??{ok:!0,value:this.backing.getItem(t)}}catch{return{ok:!1}}}setItem(e,t){this.backing.setItem(this.#t(e),t)}removeItem(e){this.backing.removeItem(this.#t(e))}#t(e){return`${this.#e}${e}`}},rn=class{constructor(e,t){this.memberNumber=e;this.#e=new Ko(e,t);let i=this.#M(),n=sd(this.getItem(od),e),o=hg(i,n);this.#t=o??{version:1,owner:e,updatedAt:0};let a=ld(i?.chatPolicy,n?.chatPolicy);jo(a)&&(this.#t.chatPolicy=a);let l=Ng(this.#d(ad)),d=l!==void 0&&l>(this.#t.chatPolicy?.clearedAt??0);d&&(this.#t.updatedAt=Math.max(this.#t.updatedAt,l),this.#t.chats={conversations:[],messages:[]},this.#t.chatPolicy={clearedAt:l,prunedBefore:Math.max(l+1,this.#t.chatPolicy?.prunedBefore??0),deletedPeers:[],prunedPeers:[]}),o?(this.#v(Re,this.#t.settings),this.#v(Oe,this.#t.people),this.#R(),o===n&&(!i||n.updatedAt>i.updatedAt)&&this.#C()):(this.#L(Re,"settings"),this.#L(Oe,"people"),(this.#t.settings!==void 0||this.#t.people!==void 0)&&(this.#S(),this.#C())),d&&(!i||l>i.updatedAt)&&this.#C(),this.#o=this.getItem(Gi)==="1"}memberNumber;#e;#t;#i;#r;#a=Promise.resolve();#c=0;#l=0;#o=!1;#s=!1;#p;#g=!1;getItem(e){let t=this.#I(e);return t.matched?t.value:this.#d(e)}#d(e){try{return this.#e.getItem(e)}catch{return null}}getItemResult(e){let t=this.#I(e);return t.matched?{ok:!0,value:t.value}:this.#e.getItemResult(e)}setItem(e,t){try{this.#e.setItem(e,t)}catch{}e===Re&&this.#m("settings",t),e===Oe&&this.#m("people",t)}removeItem(e){try{this.#e.removeItem(e)}catch{}e===Re&&this.#y("settings"),e===Oe&&this.#y("people")}async attachChatRepository(e){this.#i=e;let t=this.#t.chatPolicy;t&&await dd(e,t);let i=ri(this.#t.chats,t);if(i?this.#t.chats=i:delete this.#t.chats,i){for(let n of i.messages)await e.addMessage(n);for(let n of i.conversations){let o=await e.getConversation(n.peerNumber);(!o||n.lastMessageAt>=o.lastMessageAt)&&await e.putConversation(n)}}t&&await md(e,t),this.#o&&this.#C()}markChatChanged(){if(!this.#s){this.#l+=1,this.#o=!0;try{this.#e.setItem(Gi,"1")}catch{}this.#C()}}commitConversationDelete(e,t=Date.now()){if(this.#s||!rt(e)||!Me(t))return!1;let i=Math.max(...(this.#t.chats?.messages??[]).filter(l=>l.peerNumber===e).map(l=>l.sentAt),...(this.#t.chats?.conversations??[]).filter(l=>l.peerNumber===e).map(l=>l.lastMessageAt),0);t=Math.max(t,i);let n=this.#u(),o=new Map(n.deletedPeers);o.set(e,Math.max(o.get(e)??0,t)),n.deletedPeers=Vo(o),this.#t.chatPolicy=n;let a=ri(this.#t.chats,n);return a?this.#t.chats=a:delete this.#t.chats,this.#h()}commitChatPrune(e){if(this.#s||!Me(e))return!1;let t=this.#u();if(e<=t.prunedBefore)return!0;t.prunedBefore=e,this.#t.chatPolicy=t;let i=ri(this.#t.chats,t);return i?this.#t.chats=i:delete this.#t.chats,this.#h()}commitConversationPrune(e,t){if(this.#s||!rt(e)||!Me(t))return!1;let i=this.#u(),n=new Map(i.prunedPeers);if(t<=(n.get(e)??0))return!0;n.set(e,t),i.prunedPeers=an(n),this.#t.chatPolicy=i;let o=ri(this.#t.chats,i);return o?this.#t.chats=o:delete this.#t.chats,this.#h()}async commitChatHistoryClear(e=Date.now()){if(this.#s)return!1;this.#l+=1;let t=Math.max(Date.now(),e,...this.#t.chats?.messages.map(o=>o.sentAt)??[],...this.#t.chats?.conversations.map(o=>o.lastMessageAt)??[]);this.#o=!1,this.#t.chats={conversations:[],messages:[]},this.#t.updatedAt=Math.max(this.#t.updatedAt,t),this.#S(),this.#t.chatPolicy={clearedAt:t,prunedBefore:Math.max(Wo(t),this.#t.chatPolicy?.prunedBefore??0),deletedPeers:[],prunedPeers:[]};let i=this.#A(ad,String(t)),n=this.#R();if(i||n)try{this.#e.removeItem(Gi)}catch{}this.#C();try{await this.flush()}catch{}return i||n}#u(){return this.#t.chatPolicy?structuredClone(this.#t.chatPolicy):{clearedAt:0,prunedBefore:0,deletedPeers:[],prunedPeers:[]}}#h(){this.#l+=1,this.#o=!0,this.#S();try{this.#e.setItem(Gi,"1")}catch{}let e=this.#R();return this.#C(),e}flush(){let e=this.#a.then(()=>this.#E());return this.#a=e.catch(t=>{console.warn("[KikiLink:storage] Account sync failed; local account data is safe",t)}),e}destroy(){return this.#p?this.#p:(this.#s=!0,this.#r!==void 0&&clearTimeout(this.#r),this.#r=void 0,this.#p=(async()=>{try{await this.flush()}catch{}finally{this.#r!==void 0&&clearTimeout(this.#r),this.#r=void 0,this.#i=void 0}})(),this.#p)}#m(e,t){try{let i=JSON.parse(t);if(e==="people"&&!Array.isArray(i))return;this.#t[e]=i,this.#S(),this.#R(),this.#C()}catch{}}#y(e){delete this.#t[e],this.#S(),this.#R(),this.#C()}#v(e,t){if(t===void 0){try{this.#e.removeItem(e)}catch{}return}try{this.#e.setItem(e,JSON.stringify(t))}catch{}}#L(e,t){let i=this.#d(e);if(i)try{let n=JSON.parse(i);if(t==="people"&&!Array.isArray(n))return;this.#t[t]=n}catch{}}#S(){this.#t.updatedAt=Math.max(Date.now(),this.#t.updatedAt+1)}#C(){this.#c+=1,!this.#s&&(this.#r!==void 0&&clearTimeout(this.#r),this.#r=setTimeout(()=>{this.#r=void 0,this.flush()},cg))}async#E(){if(this.#r!==void 0&&clearTimeout(this.#r),this.#r=void 0,this.#c===0)return;let e=this.#c,t=this.#M()?.chatPolicy;if(t){let n=ld(this.#t.chatPolicy,t);if(!fg(n,this.#t.chatPolicy)){this.#t.chatPolicy=n;let o=ri(this.#t.chats,n);o?this.#t.chats=o:delete this.#t.chats,this.#i&&await dd(this.#i,n),this.#o=!0}}if(this.#o&&this.#i)if(!on(this.#i))this.#G();else{let n=!1,o=this.#l;this.#o=!1;try{let a=await pg(this.#i,this.#t.chatPolicy);o===this.#l?(this.#t.chats=a,n=!0):this.#o=!0}catch(a){if(this.#o=!0,!on(this.#i))this.#G();else throw a}if(n){this.#S();let a=this.#R();if(!this.#o&&a)try{this.#e.removeItem(Gi)}catch{}}}if(!this.#w())return;let i=Ui(xg(this.#t));if(!i||i.length>Bi){console.warn("[KikiLink:storage] Account sync payload is too large; keeping the full local copy");return}try{if(Player.ExtensionSettings??={},Player.ExtensionSettings[Bo]=i,typeof ServerPlayerExtensionSettingsSync!="function")return;ServerPlayerExtensionSettingsSync(Bo),e===this.#c&&(this.#c=0)}catch(n){console.warn("[KikiLink:storage] BC account sync unavailable; local account data is safe",n)}}#R(){try{return this.#A(od,JSON.stringify(this.#t))}catch{return!1}}#A(e,t){try{this.#e.setItem(e,t);let i=this.#e.getItemResult(e);return i.ok&&i.value===t}catch{return!1}}#I(e){let t=e===Re?this.#t?.settings:e===Oe?this.#t?.people:void 0;if(e!==Re&&e!==Oe)return{matched:!1,value:null};if(t===void 0)return{matched:!0,value:null};try{return{matched:!0,value:JSON.stringify(t)}}catch{return{matched:!0,value:null}}}#M(){if(!(!this.#w()||!Player.ExtensionSettings))return sd(Player.ExtensionSettings[Bo],this.memberNumber)}#w(){return typeof Player=="object"&&Player!==null&&Player.MemberNumber===this.memberNumber}#G(){this.#g||(this.#g=!0,console.warn("[KikiLink:storage] Session fallback is active; preserving the last portable chat snapshot"))}},nn=class{constructor(e,t){this.repository=e;this.account=t}repository;account;async addMessage(e){await this.repository.addMessage(e),this.account.markChatChanged()}getMessages(e,t){return this.repository.getMessages(e,t)}getConversation(e){return this.repository.getConversation(e)}listConversations(){return this.repository.listConversations()}async putConversation(e){await this.repository.putConversation(e),this.account.markChatChanged()}async deleteConversation(e){let t=[],i;try{[t,i]=await Promise.all([this.repository.getMessages(e,Number.MAX_SAFE_INTEGER),this.repository.getConversation(e)])}catch{}let n=Math.max(Date.now(),i?.lastMessageAt??0,...t.map(o=>o.sentAt));await this.repository.deleteConversation(e),this.account.commitConversationDelete(e,n)}async deleteMessagesOlderThan(e){let t=await this.repository.deleteMessagesOlderThan(e);return this.account.commitChatPrune(e),t}async deleteMessagesForConversationAtOrBefore(e,t){let i=await this.repository.deleteMessagesForConversationAtOrBefore(e,t);return this.account.commitConversationDelete(e,t),i}async trimConversation(e,t){let i=await this.repository.trimConversation(e,t);if(i>0){let o=(await this.repository.getMessages(e,t))[0]?.sentAt;o!==void 0?this.account.commitConversationPrune(e,o):this.account.commitConversationDelete(e)}return i}async clearAll(){await this.clearAllDurably()}async clearAllDurably(){let e=[];try{e=await this.repository.listConversations()}catch{}let t=Math.max(Date.now(),...e.map(o=>o.lastMessageAt)),i=this.repository.clearAllDurably?await this.repository.clearAllDurably():await this.repository.clearAll().then(()=>!0),n=await this.account.commitChatHistoryClear(t);return i&&n}canSafelyCapturePortableSnapshot(){return this.repository.canSafelyCapturePortableSnapshot?.()!==!1}close(){this.repository.close()}};function hd(r){if(!rt(r))throw new Error("A valid BC account is required");return`kikilink-account-${r}`}async function pg(r,e){if(!on(r))throw new Error("KikiLink portable chat snapshot source is incomplete");let t=(await r.listConversations()).slice(0,ud).map(n=>({...n,lastMessage:ue(n.lastMessage)})),i=[];for(let n of t)i.push(...(await r.getMessages(n.peerNumber,ug)).map(o=>({...o,content:ue(o.content)})));if(i.sort((n,o)=>o.sentAt-n.sentAt),!on(r))throw new Error("KikiLink portable chat snapshot source changed during capture");return ri({conversations:t.map(n=>structuredClone(n)),messages:i.slice(0,pd).sort((n,o)=>n.sentAt-o.sentAt).map(n=>structuredClone(n))},e)??{conversations:[],messages:[]}}function on(r){return r.canSafelyCapturePortableSnapshot?.()!==!1}function hg(r,e){return r?e&&e.updatedAt>r.updatedAt?e:r:e}function sd(r,e){let t=r;if(typeof r=="string"){if(r.length>Uo)return;try{if(r.startsWith(Fo)){if(typeof LZString!="object"||typeof LZString.decompressFromBase64!="function")return;let l=LZString.decompressFromBase64(r.slice(Fo.length));if(!l||l.length>Uo)return;t=JSON.parse(l)}else if(r.startsWith(Ho)){let l=r.slice(Ho.length);if(l.length>Uo)return;t=JSON.parse(l)}else t=JSON.parse(r)}catch{return}}if(!Mt(t)||t.version!==1||t.owner!==e)return;let i=Me(t.updatedAt)?t.updatedAt:0,n={version:1,owner:e,updatedAt:i};Mt(t.settings)&&(n.settings=structuredClone(t.settings)),Array.isArray(t.people)&&(n.people=structuredClone(t.people));let o=mg(t.chats);o&&(n.chats=o);let a=gg(t.chatPolicy);return jo(a)&&(n.chatPolicy=a),n}function mg(r){if(!Mt(r)||!Array.isArray(r.conversations)||!Array.isArray(r.messages))return;let e=r.conversations.slice(0,ud).map(yg).filter(n=>n!==void 0),t=new Set(e.map(n=>n.peerNumber)),i=r.messages.slice(-pd).map(vg).filter(n=>n!==void 0&&t.has(n.peerNumber));return{conversations:e,messages:i}}function gg(r){if(!Mt(r))return{clearedAt:0,prunedBefore:0,deletedPeers:[],prunedPeers:[]};let e=Me(r.clearedAt)?r.clearedAt:0,t=Me(r.prunedBefore)?r.prunedBefore:0,i=new Map,n=new Map;if(Array.isArray(r.deletedPeers))for(let o of r.deletedPeers.slice(-$o*4))!Array.isArray(o)||o.length!==2||!rt(o[0])||!Me(o[1])||o[1]<=e||i.set(o[0],Math.max(i.get(o[0])??0,o[1]));if(Array.isArray(r.prunedPeers))for(let o of r.prunedPeers.slice(-$o*4))!Array.isArray(o)||o.length!==2||!rt(o[0])||!Me(o[1])||n.set(o[0],Math.max(n.get(o[0])??0,o[1]));return{clearedAt:e,prunedBefore:Math.max(t,e>0?Wo(e):0),deletedPeers:Vo(i),prunedPeers:an(n)}}function ld(r,e){let t=Math.max(r?.clearedAt??0,e?.clearedAt??0),i=new Map,n=new Map;for(let o of[r,e]){for(let[a,l]of o?.deletedPeers??[])l<=t||i.set(a,Math.max(i.get(a)??0,l));for(let[a,l]of o?.prunedPeers??[])n.set(a,Math.max(n.get(a)??0,l))}return{clearedAt:t,prunedBefore:Math.max(r?.prunedBefore??0,e?.prunedBefore??0,t>0?Wo(t):0),deletedPeers:Vo(i),prunedPeers:an(n)}}function jo(r){return r.clearedAt>0||r.prunedBefore>0||r.deletedPeers.length>0||r.prunedPeers.length>0}function fg(r,e){return!e||r.clearedAt!==e.clearedAt||r.prunedBefore!==e.prunedBefore||r.deletedPeers.length!==e.deletedPeers.length||r.prunedPeers.length!==e.prunedPeers.length?!1:r.deletedPeers.every(([t,i],n)=>{let o=e.deletedPeers[n];return o?.[0]===t&&o[1]===i})&&r.prunedPeers.every(([t,i],n)=>{let o=e.prunedPeers[n];return o?.[0]===t&&o[1]===i})}function Vo(r){return an(r)}function an(r){return[...r].sort((e,t)=>t[1]-e[1]||e[0]-t[0]).slice(0,$o).sort((e,t)=>e[0]-t[0])}function ri(r,e){if(!r)return;if(!e||!jo(e))return structuredClone(r);let t=new Map(e.deletedPeers),i=new Map(e.prunedPeers),n=r.messages.filter(l=>bg(l,e,t,i)),o=new Map;for(let l of n){let d=o.get(l.peerNumber)??[];d.push(l),o.set(l.peerNumber,d)}let a=[];for(let l of r.conversations){let d=t.get(l.peerNumber)??0,c=i.get(l.peerNumber)??0,u=Math.max(e.clearedAt,d),p=o.get(l.peerNumber)??[],h=p.at(-1);if(!(!h&&u>0&&l.lastMessageAt<=u)){if(h&&l.lastMessageAt<=u){a.push(zo(l,p));continue}if(!h&&l.lastMessageAt<Math.max(e.prunedBefore,c)){a.push(qo(l));continue}if(h&&l.lastMessageAt<Math.max(e.prunedBefore,c)){a.push(zo(l,p));continue}a.push(structuredClone(l))}}return{conversations:a,messages:n.map(l=>structuredClone(l))}}function bg(r,e,t=new Map(e.deletedPeers),i=new Map(e.prunedPeers)){return r.sentAt<=e.clearedAt||r.sentAt<e.prunedBefore||r.sentAt<(i.get(r.peerNumber)??0)?!1:r.sentAt>(t.get(r.peerNumber)??0)}async function dd(r,e){e.prunedBefore>0&&await r.deleteMessagesOlderThan(e.prunedBefore);for(let[t,i]of e.prunedPeers)i>0&&await r.deleteMessagesForConversationAtOrBefore(t,kg(i));for(let[t,i]of e.deletedPeers)await r.deleteMessagesForConversationAtOrBefore(t,i);await md(r,e)}async function md(r,e){let t=new Map(e.deletedPeers),i=new Map(e.prunedPeers);for(let n of await r.listConversations()){let o=await r.getMessages(n.peerNumber,Number.MAX_SAFE_INTEGER),a=o.at(-1),l=Math.max(e.clearedAt,t.get(n.peerNumber)??0),d=Math.max(e.prunedBefore,i.get(n.peerNumber)??0);if(!a&&l>0&&n.lastMessageAt<=l){await r.deleteConversation(n.peerNumber);continue}if(a&&(n.lastMessageAt<=l||n.lastMessageAt<d)){await r.putConversation(zo(n,o));continue}!a&&n.lastMessageAt<d&&await r.putConversation(qo(n))}}function zo(r,e){let t=e.at(-1);if(!t)return qo(r);let i=structuredClone(r);return delete i.hiddenAt,{...i,peerName:t.peerName||r.peerName,lastMessage:ue(t.content),lastMessageAt:t.sentAt,lastDirection:t.direction,unread:e.filter(n=>n.direction==="incoming"&&!n.read).length}}function qo(r){return{...r,lastMessage:"",lastMessageAt:0,lastDirection:"incoming",unread:0}}function Wo(r){return r>=Number.MAX_SAFE_INTEGER?Number.MAX_SAFE_INTEGER:Math.floor(r)+1}function kg(r){return r<=0?0:Math.max(0,Math.ceil(r)-1)}function yg(r){if(!Mt(r)||!rt(r.peerNumber))return;let e=it(r.peerName,80)||`Member ${r.peerNumber}`,t=r.lastDirection==="outgoing"?"outgoing":"incoming",i=it(r.localAlias,80),n=Me(r.hiddenAt)?r.hiddenAt:void 0;return{peerNumber:r.peerNumber,peerName:e,...i?{localAlias:i}:{},...n!==void 0?{hiddenAt:n}:{},lastMessage:it(ue(r.lastMessage),1e3),lastMessageAt:Me(r.lastMessageAt)?r.lastMessageAt:0,lastDirection:t,unread:Cg(r.unread,0,1e5,0),pinned:r.pinned===!0,draft:it(r.draft,1e3)}}function vg(r){if(!Mt(r)||!rt(r.peerNumber)||typeof r.id!="string"||!r.id.trim()||r.id.length>200||!Me(r.sentAt))return;let e=it(r.roomName,100);return{id:r.id,direction:r.direction==="outgoing"?"outgoing":"incoming",peerNumber:r.peerNumber,peerName:it(r.peerName,80)||`Member ${r.peerNumber}`,content:it(ue(r.content),1e3),sentAt:r.sentAt,includeRoom:r.includeRoom===!0,...e?{roomName:e}:{},read:r.read===!0}}function xg(r){let e=structuredClone(r),t=Ui(e);for(;t&&t.length>Bi&&e.chats&&e.chats.messages.length>0;){let i=Math.max(1,Math.ceil(e.chats.messages.length/5));e.chats.messages.splice(0,i),t=Ui(e)}if(t&&t.length<=Bi||(e.chats&&(delete e.chats,t=Ui(e)),t&&t.length<=Bi))return e;if(Array.isArray(e.people)){for(e.people=wg(e.people);e.people.length>0;)if(e.people.length=Math.floor(e.people.length*.8),t=Ui(e),t&&t.length<=Bi)return e;delete e.people}return e}function wg(r){return[...r].sort((e,t)=>cd(t)-cd(e))}function cd(r){if(!Mt(r))return 0;let e=r.favorite===!0||it(r.note,1).length>0||Array.isArray(r.tags)&&r.tags.length>0,t=Me(r.lastSeenAt)?r.lastSeenAt:0;return(e?10**15:0)+t}function Ui(r){try{let e=JSON.stringify(r);return typeof LZString=="object"&&typeof LZString.compressToBase64=="function"?`${Fo}${LZString.compressToBase64(e)}`:`${Ho}${e}`}catch{return}}function Ag(){if(typeof localStorage>"u")return new be;try{return localStorage.getItem("kikilink:account-storage-probe"),localStorage}catch{return new be}}function rt(r){return typeof r=="number"&&Number.isSafeInteger(r)&&r>0}function Me(r){return typeof r=="number"&&Number.isFinite(r)&&r>=0}function Ng(r){if(!r||!/^\d+$/u.test(r))return;let e=Number(r);return Number.isSafeInteger(e)&&e>=0?e:void 0}function Cg(r,e,t,i){return typeof r=="number"&&Number.isInteger(r)&&r>=e&&r<=t?r:i}function it(r,e){return typeof r=="string"?r.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,e):""}function Mt(r){return typeof r=="object"&&r!==null&&!Array.isArray(r)}var Mg="kikilink",Sg=1,le="messages",Se="conversations",Hi="peer-time",fd="time",sn=class{constructor(e=Mg){this.databaseName=e}databaseName;#e;async addMessage(e){let i=(await this.#t()).transaction(le,"readwrite"),n=He(i);i.objectStore(le).put(e),await n}async getMessages(e,t=200){let n=(await this.#t()).transaction(le,"readonly"),o=He(n),a=n.objectStore(le).index(Hi),l=IDBKeyRange.bound([e,0],[e,Number.MAX_SAFE_INTEGER]),d=[],c=Fi(a.openCursor(l,"prev"),u=>(d.push(u.value),d.length<t));return await Promise.all([c,o]),d.reverse()}async getConversation(e){let i=(await this.#t()).transaction(Se,"readonly"),n=He(i),o=gd(i.objectStore(Se).get(e)),[a]=await Promise.all([o,n]);return a}async listConversations(){let t=(await this.#t()).transaction(Se,"readonly"),i=He(t),n=gd(t.objectStore(Se).getAll()),[o]=await Promise.all([n,i]);return o.sort(mi)}async putConversation(e){let i=(await this.#t()).transaction(Se,"readwrite"),n=He(i);i.objectStore(Se).put(e),await n}async deleteConversation(e){let i=(await this.#t()).transaction([le,Se],"readwrite"),n=He(i);i.objectStore(Se).delete(e);let o=i.objectStore(le).index(Hi),a=IDBKeyRange.bound([e,0],[e,Number.MAX_SAFE_INTEGER]),l=Fi(o.openCursor(a),d=>(d.delete(),!0));await Promise.all([l,n])}async deleteMessagesOlderThan(e){let i=(await this.#t()).transaction(le,"readwrite"),n=He(i),o=i.objectStore(le).index(fd),a=IDBKeyRange.upperBound(e,!0),l=0,d=Fi(o.openCursor(a),c=>(c.delete(),l+=1,!0));return await Promise.all([d,n]),l}async deleteMessagesForConversationAtOrBefore(e,t){let n=(await this.#t()).transaction(le,"readwrite"),o=He(n),a=n.objectStore(le).index(Hi),l=IDBKeyRange.bound([e,0],[e,t]),d=0,c=Fi(a.openCursor(l),u=>(u.delete(),d+=1,!0));return await Promise.all([c,o]),d}async trimConversation(e,t){let n=(await this.#t()).transaction(le,"readwrite"),o=He(n),a=n.objectStore(le).index(Hi),l=IDBKeyRange.bound([e,0],[e,Number.MAX_SAFE_INTEGER]),d=0,c=0,u=Fi(a.openCursor(l,"prev"),p=>(d+=1,d>t&&(p.delete(),c+=1),!0));return await Promise.all([u,o]),c}async clearAll(){let t=(await this.#t()).transaction([le,Se],"readwrite"),i=He(t);t.objectStore(le).clear(),t.objectStore(Se).clear(),await i}close(){this.#e&&(this.#e.then(e=>e.close()).catch(()=>{}),this.#e=void 0)}#t(){return this.#e??=Rg(this.databaseName),this.#e}};function Rg(r){return new Promise((e,t)=>{let i=indexedDB.open(r,Sg),n=!1,o=a=>{n||(n=!0,t(a))};i.onerror=()=>o(i.error??new Error("Unable to open KikiLink storage")),i.onblocked=()=>o(new Error("KikiLink storage upgrade is blocked")),i.onupgradeneeded=()=>{let a=i.result;if(!a.objectStoreNames.contains(le)){let l=a.createObjectStore(le,{keyPath:"id"});l.createIndex(Hi,["peerNumber","sentAt"],{unique:!1}),l.createIndex(fd,"sentAt",{unique:!1})}a.objectStoreNames.contains(Se)||a.createObjectStore(Se,{keyPath:"peerNumber"})},i.onsuccess=()=>{let a=i.result;if(a.onversionchange=()=>a.close(),n){a.close();return}n=!0,e(a)}})}function gd(r){return new Promise((e,t)=>{r.onsuccess=()=>e(r.result),r.onerror=()=>t(r.error??new Error("KikiLink storage request failed"))})}function He(r){return new Promise((e,t)=>{r.oncomplete=()=>e(),r.onabort=()=>t(r.error??new Error("KikiLink transaction aborted")),r.onerror=()=>t(r.error??new Error("KikiLink transaction failed"))})}function Fi(r,e){return new Promise((t,i)=>{r.onerror=()=>i(r.error??new Error("KikiLink cursor failed")),r.onsuccess=()=>{let n=r.result;if(!n||!e(n)){t();return}n.continue()}})}var ln=class{constructor(e,t){this.primary=e;this.fallback=t}primary;fallback;#e=!1;addMessage(e){return this.#t(t=>t.addMessage(e))}getMessages(e,t){return this.#t(i=>i.getMessages(e,t))}getConversation(e){return this.#t(t=>t.getConversation(e))}listConversations(){return this.#t(e=>e.listConversations())}putConversation(e){return this.#t(t=>t.putConversation(e))}deleteConversation(e){return this.#t(t=>t.deleteConversation(e))}deleteMessagesOlderThan(e){return this.#t(t=>t.deleteMessagesOlderThan(e))}deleteMessagesForConversationAtOrBefore(e,t){return this.#t(i=>i.deleteMessagesForConversationAtOrBefore(e,t))}trimConversation(e,t){return this.#t(i=>i.trimConversation(e,t))}clearAll(){return this.#t(e=>e.clearAll())}async clearAllDurably(){if(this.#e)return await this.fallback.clearAll(),!1;try{return this.primary.clearAllDurably?await this.primary.clearAllDurably():(await this.primary.clearAll(),!0)}catch(e){return this.#i(e),await this.fallback.clearAll(),!1}}canSafelyCapturePortableSnapshot(){return!this.#e&&this.primary.canSafelyCapturePortableSnapshot?.()!==!1}close(){this.primary.close(),this.fallback.close()}async#t(e){if(this.#e)return e(this.fallback);try{return await e(this.primary)}catch(t){return this.#i(t),e(this.fallback)}}#i(e){this.#e||(this.#e=!0,this.primary.close(),console.warn("[KikiLink:storage] IndexedDB unavailable; using session-only memory storage",e))}};var dn=class{#e=new Map;#t=new Set;#i=new fe("modules");register(e){if(this.#e.has(e.id))throw new Error(`Module '${e.id}' is already registered`);this.#e.set(e.id,e)}async startAll(e){for(let t of this.#e.values())if(t.isEnabled(e.settings.get()))try{await t.start(e),this.#t.add(t.id),this.#i.info(`Started ${t.id}`)}catch(i){this.#i.error(`Failed to start ${t.id}`,i)}}async stopAll(){let e=[...this.#t].reverse();for(let t of e){let i=this.#e.get(t);if(i)try{await i.stop()}catch(n){this.#i.error(`Failed to stop ${t}`,n)}}this.#t.clear()}};var Lg=1e3,cn=class{constructor(e){this.version=e;this.#i=new ji(this.#t,e),this.#r.register(this.#a),this.#r.register(this.#c)}version;#e=new fe("core");#t=new Ot;#i;#r=new dn;#a=new Qr;#c=new tn;#l;#o;#s;#p;#g;#d;#u;#h;#m;#y=!1;#v=e=>{let t=ni();if(t!==this.#d||t!==this.#u){let n=document.querySelector("#kikilink-root");n&&(n.hidden=!0),(e?.type==="pointerdown"||e?.type==="keydown")&&(e.cancelable&&e.preventDefault(),e.stopImmediatePropagation())}this.#L()};publicApi(){return{name:"KikiLink",open:()=>this.#a.open(),openChat:(e,t)=>this.#a.openChat(e,t),openRoster:()=>this.#a.openRoster(),openActivities:()=>this.#a.openActivities(),close:()=>this.#a.close(),getVersion:()=>this.version,destroy:()=>this.destroy()}}async start(){this.#y||(this.#y=!0,this.#R(),await Eg(()=>this.#y),this.#y&&(this.#u=ni(),await this.#S(),this.#y&&(window.addEventListener("focus",this.#v),window.addEventListener("pageshow",this.#v),document.addEventListener("pointerdown",this.#v,!0),document.addEventListener("keydown",this.#v,!0),this.#g=setInterval(()=>this.#L(),Lg))))}async destroy(){this.#y&&(this.#y=!1,window.removeEventListener("focus",this.#v),window.removeEventListener("pageshow",this.#v),document.removeEventListener("pointerdown",this.#v,!0),document.removeEventListener("keydown",this.#v,!0),this.#g!==void 0&&clearInterval(this.#g),this.#g=void 0,this.#u=void 0,await this.#h,await this.#E(),this.#m?.remove(),this.#m=void 0,this.#t.clear(),this.#e.info("Stopped"))}#L(){let e=ni();if(e===this.#u&&e===this.#d){let i=document.querySelector("#kikilink-root");i&&(i.hidden=!1);return}let t=document.querySelector("#kikilink-root");t&&(t.hidden=!0),this.#u=e,this.#S()}#S(){if(this.#h)return this.#h;let e=(async()=>{for(;this.#y&&this.#u!==this.#d;){let t=this.#u;await this.#E(),!(!this.#y||t===void 0)&&ni()===t&&await this.#C(t)}})();return this.#h=e.finally(()=>{this.#h=void 0,this.#y&&this.#u!==this.#d&&this.#S()}),this.#h}async#C(e){let t=new rn(e),i=new Yi(t),n=typeof indexedDB>"u"?new hi:new ln(new sn(hd(e)),new hi);if(await t.attachChatRepository(n),!this.#y||this.#u!==e||ni()!==e){n.close(),await t.destroy();return}let o=new nn(n,t);this.#l=i,this.#o=o,this.#s=t,await this.#r.startAll({adapter:this.#i,bus:this.#t,repository:o,settings:i,accountStorage:t,memberNumber:e,version:this.version}),this.#d=e,this.#p=this.#i.start().catch(l=>{this.#e.error("Bondage Club connection failed",l)});let a=document.querySelector("#kikilink-root");a&&(a.hidden=!1),this.#e.info(`KikiLink ${this.version} ready`)}async#E(){if(!(this.#d===void 0&&!this.#l&&!this.#o&&!this.#s)){try{this.#i.stop()}catch(e){this.#e.warn("Bondage Club adapter teardown did not finish cleanly",e)}try{await this.#p}catch(e){this.#e.warn("Bondage Club adapter startup ended during teardown",e)}this.#p=void 0;try{await this.#r.stopAll()}catch(e){this.#e.warn("Module teardown did not finish cleanly",e)}try{await this.#s?.destroy()}catch(e){this.#e.warn("Account storage teardown did not finish cleanly",e)}try{this.#o?.close()}catch(e){this.#e.warn("Chat storage teardown did not finish cleanly",e)}this.#o=void 0,this.#l=void 0,this.#s=void 0,this.#d=void 0}}#R(){let e=document.getElementById("kikilink-version");e&&e.remove();let t=document.createElement("span");t.id="kikilink-version",t.dataset.kikilinkVersion=this.version,t.textContent=this.version,t.setAttribute("aria-hidden","true"),Object.assign(t.style,{position:"fixed",left:"3px",bottom:"2px",zIndex:"2147483646",color:"#fff",opacity:"0.18",font:"7px/1 monospace",letterSpacing:"0",pointerEvents:"none",userSelect:"none",mixBlendMode:"difference"}),document.body.append(t),this.#m=t}};async function Eg(r){for(;r()&&ni()===void 0;)await new Promise(e=>setTimeout(e,100))}function ni(){if(!(typeof document>"u"||document.body===null||typeof Player!="object"||Player===null||!Number.isSafeInteger(Player.MemberNumber)||Player.MemberNumber<=0))try{return typeof ServerIsLoggedIn=="function"&&(!ServerIsLoggedIn()||typeof Player.ExtensionSettings!="object"||Player.ExtensionSettings===null||Array.isArray(Player.ExtensionSettings))?void 0:Player.MemberNumber}catch{return}}async function Pg(){document.documentElement.dataset.kikilinkPageRealm="0.29.0";try{let t=window.KikiLink;t&&await t.destroy()}catch(t){console.warn("[KikiLink] Previous release cleanup failed; continuing startup",t)}let r=new cn("0.29.0"),e=r.publicApi();window.KikiLink=e;try{await r.start()}catch(t){console.error("[KikiLink] Startup failed",t)}}Pg();})();
//# sourceURL=KikiLink.fusam.js
