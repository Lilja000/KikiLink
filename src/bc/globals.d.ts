declare global {
  interface BCPlayer {
    MemberNumber: number;
    Name: string;
    Nickname?: string;
    FriendNames: Map<number, string>;
    FriendList?: number[];
  }

  interface BCServerSocket {
    connected?: boolean;
    on(event: "AccountBeep", listener: (data: BCServerAccountBeepResponse) => void): unknown;
    on(event: "AccountQueryResult", listener: (data: BCAccountQueryResponse) => void): unknown;
    off?(event: "AccountBeep", listener: (data: BCServerAccountBeepResponse) => void): unknown;
    off?(event: "AccountQueryResult", listener: (data: BCAccountQueryResponse) => void): unknown;
    removeListener?(
      event: "AccountBeep",
      listener: (data: BCServerAccountBeepResponse) => void,
    ): unknown;
    removeListener?(
      event: "AccountQueryResult",
      listener: (data: BCAccountQueryResponse) => void,
    ): unknown;
  }

  interface BCCharacter {
    ID?: number;
    MemberNumber: number;
    Name: string;
    Nickname?: string;
    GetPronouns?(): "SheHer" | "HeHim" | "TheyThem" | "ItIt";
  }

  interface BCActivity {
    Name: string;
    ActivityID?: number;
    MaxProgress: number;
    MaxProgressSelf?: number;
    Prerequisite: string[];
    Target: string[];
    TargetSelf?: string[] | true;
  }

  interface BCItemActivity {
    Activity: BCActivity;
    Group: string;
    Item?: unknown;
  }

  interface BCAssetGroup {
    Name: string;
    Description: string;
    Category: "Appearance" | "Item" | "Script";
    Zone?: ReadonlyArray<readonly [number, number, number, number]>;
  }

  interface BCChatRoomData {
    Name?: string;
    Space?: string;
    Visibility?: string[];
  }

  interface BCServerAccountBeepResponse {
    MemberNumber: number;
    MemberName: string;
    BeepType?: string | null;
    Message?: string;
    ChatRoomName?: string;
    ChatRoomSpace?: string;
    Private?: boolean;
  }

  interface BCFriendListBeepLogMessage {
    MemberNumber: number;
    MemberName: string;
    ChatRoomName?: string;
    ChatRoomSpace?: string;
    Private?: boolean;
    Sent: boolean;
    Time: Date | string | number;
    Message?: string;
  }

  interface BCOnlineFriendInfo {
    Type: "Friend" | "Submissive" | "Lover";
    MemberNumber: number;
    MemberName: string;
    MemberNickname?: string;
    ChatRoomSpace?: string | null;
    ChatRoomName?: string | null;
    Private?: true;
  }

  interface BCAccountQueryResponse {
    Query: string;
    Result: unknown;
  }

  interface BCChatRoomMessage {
    Sender?: number;
    Target?: number;
    Content: string;
    Type: string;
    Dictionary?: unknown[];
  }

  var Player: BCPlayer;
  var CurrentScreen: string;
  var ChatRoomData: BCChatRoomData | null;
  var ChatRoomCharacter: BCCharacter[];
  var FriendListBeepLog: BCFriendListBeepLogMessage[];
  var ServerSocket: BCServerSocket | null;
  var MainCanvas: CanvasRenderingContext2D | HTMLCanvasElement;
  var ChatRoomHideIconState: number;
  var ActivityFemale3DCG: BCActivity[];
  var ActivityFemale3DCGOrdering: string[];
  var AssetGroup: BCAssetGroup[];

  function ServerAccountBeep(data: BCServerAccountBeepResponse): void;
  function ServerAccountQueryResult(data: BCAccountQueryResponse): void;
  function FriendListLoadFriendList(data: BCOnlineFriendInfo[]): void;
  function ChatRoomMessage(data: BCChatRoomMessage): void;
  function ServerSend(event: string, data: unknown): void;
  function ServerSendBeepMessage(
    target: number,
    message?: string,
    options?: { includeRoom?: boolean },
  ): void;
  function ChatRoomSendEmote(message: string): void;
  function ChatRoomPublishCustomAction(
    message: string,
    leaveDialog: boolean,
    dictionary: unknown[],
  ): void;
  function ActivityDictionaryText(keyword: string): string;
  function ActivityRun(
    actor: BCCharacter,
    acted: BCCharacter,
    targetGroup: BCAssetGroup,
    itemActivity: BCItemActivity,
    sendMessage?: boolean,
  ): void;
  function ActivityEffectFlat(
    source: BCCharacter,
    target: BCCharacter,
    amount: number,
    zone: string,
    count?: number,
  ): void;
  function PreferenceGetActivityFactor(
    character: BCCharacter,
    activityName: string,
    self: boolean,
  ): number;
  function DrawCharacter(
    character: BCCharacter,
    x: number,
    y: number,
    zoom: number,
    isHeightResizeAllowed?: boolean,
    drawCanvas?: CanvasRenderingContext2D,
  ): void;
  function ChatRoomSetTarget(memberNumber: number): void;
  function InformationSheetLoadCharacter(character: BCCharacter): void;
  function ServerIsLoggedIn(): boolean;
  function ServerPlayerIsInChatRoom(): boolean;
  function CharacterNickname(character: BCCharacter): string;
  function ChatRoomDrawCharacterStatusIcons(
    character: BCCharacter,
    characterX: number,
    characterY: number,
    zoom: number,
  ): void;
  function ChatRoomCharacterViewDrawOverlay(
    character: BCCharacter,
    characterX: number,
    characterY: number,
    zoom: number,
  ): void;

  namespace ElementButton {
    function CreateForActivity(
      idPrefix: string | null,
      activity: BCItemActivity,
      character: BCCharacter,
      onClick: (this: HTMLButtonElement, event: PointerEvent) => unknown,
      options?: null | { image?: string },
      htmlOptions?: unknown,
    ): HTMLButtonElement;
  }
}

export {};
