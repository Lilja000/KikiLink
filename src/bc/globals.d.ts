declare global {
  interface BCPlayer {
    ID?: number;
    MemberNumber: number;
    Name: string;
    Nickname?: string;
    FriendNames: Map<number, string>;
    FriendList?: number[];
    WhiteList?: number[];
    BlackList?: number[];
    GhostList?: number[];
    Ownership?: {
      MemberNumber?: number;
      Name?: string;
      Stage?: number;
    } | null;
    Lovership?: Array<{
      MemberNumber?: number;
      Name?: string;
      Stage?: number;
    }>;
    ExtensionSettings?: Record<string, unknown>;
  }

  interface BCLZString {
    compressToBase64(value: string): string;
    decompressFromBase64(value: string): string | null;
  }

  interface BCServerSocket {
    connected?: boolean;
    on(event: "AccountBeep", listener: (data: BCServerAccountBeepResponse) => void): unknown;
    on(event: "AccountQueryResult", listener: (data: BCAccountQueryResponse) => void): unknown;
    on(event: "ChatRoomMessage", listener: (data: BCChatRoomMessage) => void): unknown;
    off?(event: "AccountBeep", listener: (data: BCServerAccountBeepResponse) => void): unknown;
    off?(event: "AccountQueryResult", listener: (data: BCAccountQueryResponse) => void): unknown;
    off?(event: "ChatRoomMessage", listener: (data: BCChatRoomMessage) => void): unknown;
    removeListener?(
      event: "AccountBeep",
      listener: (data: BCServerAccountBeepResponse) => void,
    ): unknown;
    removeListener?(
      event: "AccountQueryResult",
      listener: (data: BCAccountQueryResponse) => void,
    ): unknown;
    removeListener?(
      event: "ChatRoomMessage",
      listener: (data: BCChatRoomMessage) => void,
    ): unknown;
  }

  interface BCCharacter {
    ID?: number;
    MemberNumber: number;
    Name: string;
    Nickname?: string;
    FocusGroup?: BCAssetGroup | null;
    GetPronouns?(): "SheHer" | "HeHim" | "TheyThem" | "ItIt";
  }

  interface BCActivity {
    Name: string;
    ActivityID?: number | undefined;
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
    MirrorActivitiesFrom?: string;
    Zone?: ReadonlyArray<readonly [number, number, number, number]>;
  }

  interface BCChatRoomData {
    Name?: string;
    Description?: string;
    Admin?: number[];
    Whitelist?: number[];
    Ban?: number[];
    Background?: string;
    Limit?: number;
    Game?: string;
    Space?: string;
    Visibility?: string[];
    Access?: string[];
    BlockCategory?: string[];
    Language?: string;
    MapData?: unknown;
    Custom?: {
      ImageURL?: string;
      SizeMode?: number;
      ImageFilter?: string;
      MusicURL?: string;
      MusicStart?: number;
    };
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
  var LZString: BCLZString;
  var CurrentScreen: string;
  var ChatRoomData: BCChatRoomData | null;
  var ChatRoomCharacter: BCCharacter[];
  var ChatRoomCharacterDrawlist: BCCharacter[];
  var FriendListBeepLog: BCFriendListBeepLogMessage[];
  var ServerSocket: BCServerSocket | null;
  var MainCanvas: CanvasRenderingContext2D | HTMLCanvasElement;
  var ChatRoomHideIconState: number;
  var GameVersion: string;
  var CurrentTime: number;
  var DialogMenuMode: string | null;
  var DialogActivity: BCItemActivity[];
  var CurrentCharacter: BCCharacter | null;
  var DialogMenuMapping: {
    activities?: {
      Reload(
        parameters?: unknown,
        options?: { reset?: boolean; resetDialogItems?: boolean },
      ): Promise<unknown> | void;
    };
  };
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
  function ActivityAllowedForGroup(character: BCCharacter, groupName: string): BCItemActivity[];
  function DialogBuildActivities(character: BCCharacter, reload?: boolean): void;
  function CharacterGetCurrent(): BCCharacter | null;
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
  function DrawImageCanvas(
    source: string | HTMLImageElement | HTMLCanvasElement,
    canvas: CanvasRenderingContext2D,
    x: number,
    y: number,
    options?: {
      Width?: number;
      Height?: number;
      Alpha?: number;
    },
  ): boolean;
  function DrawImageResize(
    source: string | HTMLImageElement | HTMLCanvasElement,
    x: number,
    y: number,
    width: number,
    height: number,
  ): boolean;
  function ChatRoomSetTarget(memberNumber: number): void;
  function InformationSheetLoadCharacter(character: BCCharacter): void;
  function ServerIsLoggedIn(): boolean;
  function ServerPlayerExtensionSettingsSync(dataKeyName: string, force?: boolean): void;
  function ServerPlayerIsInChatRoom(): boolean;
  function ChatRoomPlayerIsAdmin(): boolean;
  function ChatRoomGetSettings(room: BCChatRoomData): BCChatRoomData;
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
  function ChatRoomCharacterViewLoopCharacters(
    callback: (
      characterIndex: number,
      characterX: number,
      characterY: number,
      space: number,
      zoom: number,
    ) => boolean | void,
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
