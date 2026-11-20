import type {BCRoomAdminSnapshot} from './adapter';
import {nativeRoomCapacity} from './room-capacity';
import {sendBCPacket} from './traffic-audit';

export interface BCRoomCreationDraft {
  name: string; description: string; background: string; capacity: number;
  searchSpace: '' | 'X' | 'M'; language: string;
  access: 'private' | 'public'; visibility: 'unlisted' | 'public';
}
type Payload = Required<Pick<BCChatRoomData, 'Name'|'Description'|'Background'|'Limit'|'Space'|'Language'|'Game'|'Admin'|'Whitelist'|'Ban'|'Access'|'Visibility'|'BlockCategory'>>;
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const sorted = (values: readonly (string|number)[]): (string|number)[] => [...values].sort();

/** Only plan fields and explicit native choices cross this boundary. Never copy another room. */
export function nativeCreationPayload(draft: BCRoomCreationDraft, member: number): Payload {
  if (!Number.isSafeInteger(member) || member <= 0 || typeof Player !== 'object' || Player?.MemberNumber !== member || !Player.OnlineSettings)
    throw new Error('Reconnect to BC before creating a room.');
  if (!draft || !['private','public'].includes(draft.access) || !['unlisted','public'].includes(draft.visibility) ||
      !['','X','M'].includes(draft.searchSpace) || typeof draft.name !== 'string' || typeof draft.description !== 'string' ||
      typeof draft.background !== 'string' || typeof draft.language !== 'string') throw new Error('Review the new room settings.');
  const name = draft.name.trim(), description = draft.description.trim();
  if (!name || name.length > 80 || description.length > 300 || !draft.background || draft.background.length > 120)
    throw new Error('Use a room name and background, and a description up to 300 characters.');
  const bans: number[] = [];
  for (const [enabled, list] of [[Player.OnlineSettings.AutoBanBlackList, Player.BlackList], [Player.OnlineSettings.AutoBanGhostList, Player.GhostList]] as const) {
    if (!enabled) continue;
    if (!Array.isArray(list) || list.some(n => !Number.isSafeInteger(n) || n <= 0)) throw new Error('BC automatic ban lists are unavailable.');
    bans.push(...list);
  }
  const ban = [...new Set(bans)].sort((a,b)=>a-b);
  if (ban.length > 100 || ban.includes(member)) throw new Error('Review your automatic ban lists in BC before creating this room.');
  const payload: Payload = {Name:name, Description:description, Background:draft.background, Limit:nativeRoomCapacity(draft.capacity),
    Space:draft.searchSpace, Language:draft.language, Game:'', Admin:[member], Whitelist:[], Ban:ban,
    Access:draft.access==='public'?['All']:['Admin'], Visibility:draft.visibility==='public'?['All']:[], BlockCategory:[]};
  const validators = typeof ServerChatRoomDataValidationRecord !== 'undefined' ? ServerChatRoomDataValidationRecord :
    typeof ServerChatRoomDataValidate !== 'undefined' ? ServerChatRoomDataValidate as unknown as Record<string, ((v: unknown)=>unknown) | undefined> : undefined;
  for (const [key,value] of Object.entries(payload)) {
    const validate = validators?.[key];
    if (typeof validate !== 'function') throw new Error('The loaded BC room validators are unavailable. Use the native room editor.');
    if (!same(validate(structuredClone(value)), value)) throw new Error(`BC does not support the selected ${key.toLowerCase()}. Edit the draft; the saved plan is kept.`);
  }
  return payload;
}

function confirmed(snapshot: BCRoomAdminSnapshot | undefined, payload: Payload): boolean {
  if (!snapshot?.isAdmin) return false;
  const s = snapshot.settings;
  if (snapshot.roomName.toUpperCase() !== payload.Name.toUpperCase() || s.space !== payload.Space) return false;
  for (const [key, value] of Object.entries({description:payload.Description, background:payload.Background, limit:payload.Limit, language:payload.Language, game:''}))
    if (s[key as keyof typeof s] !== value) return false;
  for (const [key, value] of Object.entries({admins:payload.Admin, whitelist:payload.Whitelist, blacklist:payload.Ban, access:payload.Access, visibility:payload.Visibility, blockCategory:payload.BlockCategory}))
    if (!same(sorted(s[key as 'admins']), sorted(value))) return false;
  return (!s.mapData || s.mapData.Type === 'Never') && !s.custom.imageUrl && !s.custom.musicUrl && !s.custom.musicSync;
}

/** Native create has no request ID. A lost reply is never replayed automatically. */
export class NativeRoomCreation {
  #busy = false;
  #uncertain = false;
  #stop: (()=>void) | undefined;
  #reconcile: (()=>void) | undefined;
  constructor(private readonly read: ()=>BCRoomAdminSnapshot|undefined, private readonly member: ()=>number) {}
  get blocked(): boolean { this.#reconcile?.(); return this.#busy || this.#uncertain; }
  stop(): void { this.#stop?.(); }

  async create(draft: BCRoomCreationDraft, authorize: ()=>Promise<void>, current: ()=>boolean): Promise<void> {
    if (this.blocked) throw new Error('A previous room creation is still unconfirmed. Check the room in BC before trying again.');
    this.#busy = true;
    try {
      const member = this.member(), socket = typeof ServerSocket === 'undefined' ? null : ServerSocket;
      const check = (): void => {
        if (!current() || this.member() !== member || typeof Player?.CharacterID !== 'string' || !Player.CharacterID ||
            !socket || ServerSocket !== socket || socket.connected !== true || typeof ServerSend !== 'function') throw new Error('The account or BC connection changed. Review the room again.');
        if (typeof ServerPlayerIsInChatRoom !== 'function' || ServerPlayerIsInChatRoom() ||
            typeof ChatRoomData === 'undefined' || ChatRoomData !== null) throw new Error('Leave your current BC room first, then review creation again.');
        if (CurrentScreen === 'ChatAdmin') throw new Error('Close the native BC room editor before creating from this review.');
      };
      check();
      const payload = nativeCreationPayload(draft, member);
      await authorize();
      check();
      if (!same(payload, nativeCreationPayload(draft, member))) throw new Error('BC settings changed during review. Review the room again.');
      if (!socket || typeof socket.on !== 'function' || (!socket.off && !socket.removeListener)) throw new Error('BC room responses cannot be observed. Use the native room editor.');
      await new Promise<void>((resolve,reject) => {
        let settled = false, sent = false, synced = false, observing = true;
        const expires = Date.now() + 10_000;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const remove = socket.off?.bind(socket) ?? socket.removeListener!.bind(socket);
        const cleanup = (): void => {
          observing=false;if(timer!==undefined)clearTimeout(timer);this.#stop=undefined;this.#reconcile=undefined;
          // A revoked wrapper must not turn a verified sync into an unhandled exception.
          for(const detach of [()=>remove('ChatRoomCreateResponse',response),()=>remove('disconnect',disconnect),()=>remove('ChatRoomSync',sync)])try{detach();}catch{/* Callbacks are inert after cleanup. */}
        };
        const settle = (error?: Error): void => { if(settled)return;settled=true;error?reject(error):resolve(); };
        const unknown = (message: string): void => { this.#uncertain=sent; if(timer!==undefined)clearTimeout(timer); settle(new Error(message+' Check BC; this request will not be sent again automatically.')); };
        const inspect = (): void => {
          if (!observing || !sent || settled && !this.#uncertain) return;
          try {
            if (this.member()!==member || ServerSocket!==socket || !socket.connected) { unknown('The BC connection or account changed.'); return; }
            if (synced && confirmed(this.read(),payload)) { this.#uncertain=false; cleanup(); settle(); return; }
            if (Date.now() >= expires) { unknown('BC has not confirmed the requested room and settings.'); return; }
            if(timer!==undefined)clearTimeout(timer);timer=setTimeout(inspect,100);
          } catch { unknown('BC room data could not be verified.'); }
        };
        const sync = (): void => { if(observing&&sent){synced=true;queueMicrotask(inspect);} };
        const disconnect = (): void => {if(observing)unknown('BC disconnected during creation.');};
        const response = (value: unknown): void => {
          if (!observing || !sent) return;
          try {
          if (value==='ChatRoomCreated') { inspect(); return; }
          const rejected:Record<string,string>={AccountError:'BC could not authorize creation. Reconnect before trying again.',
            RoomAlreadyExist:'That room name is already in use. Check the existing room in BC or choose another name.',
            InvalidRoomData:'BC rejected these room settings. Edit the draft before trying again.'};
          // Known rejection codes come from the inspected native Messages.d.ts. Never
          // reinterpret a new response format as a safe reason to send another create.
          if (typeof value==='string' && Object.hasOwn(rejected,value) && this.member()===member && ServerSocket===socket &&
              socket.connected && ChatRoomData===null && !ServerPlayerIsInChatRoom() && CurrentScreen!=='ChatAdmin') {
            this.#uncertain=false;cleanup();settle(new Error(rejected[value]));return;
          }
          // Only an exact native sync can establish success.
          unknown(typeof value==='string' && /^[A-Za-z]{1,64}$/u.test(value)
            ? `BC returned ${value}; creation is not confirmed.` : 'BC returned an unrecognized creation response.');
          inspect();
          } catch { unknown('BC creation response could not be verified.'); }
        };
        this.#stop=()=>{unknown('Room creation observation stopped.');cleanup();};
        this.#reconcile=inspect;
        try {
          socket.on('ChatRoomCreateResponse',response);socket.on('disconnect',disconnect);socket.on('ChatRoomSync',sync);
          check();sent=true;this.#uncertain=true;sendBCPacket('room-create','ChatRoomCreate',payload);inspect();
        } catch { if(sent)unknown('BC did not confirm sending the creation request.');else{cleanup();settle(new Error('BC room creation could not be started.'));} }
      });
    } finally { this.#busy=false; }
  }
}
