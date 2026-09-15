declare global {
  interface BCPlayer extends BCCharacter {
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
    LastChatRoom?: {
      Name?: string;
      Space?: string;
    } | null;
    ExtensionSettings?: Record<string, unknown>;
  }

  interface BCLZString {
    compressToBase64(value: string): string;
    decompressFromBase64(value: string): string | null;
  }

  interface BCServerSocket {
    onAnyOutgoing?(listener: (event: string, data: unknown) => void): unknown;
    offAnyOutgoing?(listener: (event: string, data: unknown) => void): unknown;
    connected?: boolean;
    on(event: "connect" | "ChatRoomSync", listener: () => void): unknown;
    on(event: "disconnect", listener: () => void): unknown;
    off?(event: "disconnect", listener: () => void): unknown;
    removeListener?(event: "disconnect", listener: () => void): unknown;
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
    Ownership?: {
      MemberNumber?: number;
      Name?: string;
      Stage?: number;
    } | null;
    FocusGroup?: BCAssetGroup | null;
    GetPronouns?(): "SheHer" | "HeHim" | "TheyThem" | "ItIt";
    AssetFamily?: string;
    Appearance?: BCAppearanceItem[];
    ActivePoseMapping?: Partial<Record<string, string>>;
    ActivePose?: readonly string[];
    ExpressionQueue?: Array<{ Group: string; Expression: string | null; Time: number }>;
    AllowItem?: boolean;
    CanInteract?(): boolean;
    CanChangeClothesOn?(character: BCCharacter): boolean;
    CanChangeOwnClothes?(): boolean;
    BlackList?: number[];
    GhostList?: number[];
  }

  interface BCAppearanceItem {
    Asset: BCAsset;
    Property?: { Expression?: string | null; LockedBy?: string; Effect?: string[]; [key: string]: unknown };
    Color?: string | readonly string[];
    Difficulty?: number;
    Craft?: Record<string, unknown>;
  }
  interface BCAsset {
    Name: string;
    Description?: string;
    Group: BCAssetGroup;
    AllowExpression?: readonly (string | null)[];
    ExpressionPrerequisite?: readonly string[];
    RemoveItemOnRemove?: ReadonlyArray<{ Group: string; Name: string }>;
  }
  interface BCPose {
    Name: string;
    Category: string;
    AllowMenu?: boolean;
    AllowMenuTransient?: boolean;
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
    Family?: string;
    Clothing?: boolean;
    AllowNone?: boolean;
    AllowExpression?: readonly (string | null)[];
    ExpressionPrerequisite?: readonly string[];
    RemoveItemOnRemove?: ReadonlyArray<{ Group: string; Name: string }>;
  }

  // BC r131 public API contracts. All optional feature entrypoints are checked at runtime.
  var PoseFemale3DCG: BCPose[];
  var PoseRecord: Record<string, BCPose>;
  function PoseSetActive(character: BCCharacter, pose: string | null, forceChange?: boolean, refreshDialog?: boolean): void;
  function PoseCanChangeUnaided(character: BCCharacter, pose: string): boolean;
  function PoseAvailable(character: BCCharacter, category: string, pose: string): boolean;
  function CharacterSetActivePose(character: BCCharacter, pose: string | null, forceChange?: boolean): void;
  function CharacterSetFacialExpression(character: BCCharacter, group: string, expression: string | null, timer?: number, color?: string | readonly string[], fromQueue?: boolean): void;
  function CharacterRefresh(character: BCCharacter, push?: boolean, refreshDialog?: boolean): void;
  function CharacterAppearanceSetItem(character: BCCharacter, group: string, asset: BCAsset, color?: string | readonly string[] | null, difficulty?: number | null, member?: number | null): BCAppearanceItem | undefined;
  function ChatRoomCharacterUpdate(character: BCCharacter): void;
  function ServerPlayerAppearanceSync(): void;
  function InventoryAllow(character: BCCharacter, asset: BCAsset, prerequisites?: readonly string[], setDialog?: boolean): boolean;
  function InventoryRemove(character: BCCharacter, group: string, refresh?: boolean): void;
  function InventoryBlockedOrLimited(character: BCCharacter, item: BCAppearanceItem): boolean;
  function InventoryItemHasEffect(item: BCAppearanceItem, effect?: string, properties?: boolean): boolean;
  function InventoryGroupIsBlocked(character: BCCharacter, group: string, activity?: boolean): boolean;
  function WardrobeGroupAccessible(character: BCCharacter, group: BCAssetGroup, options?: { ExcludeNonCloth: boolean }): boolean;
  function ValidationCreateDiffParams(character: BCCharacter, source: number): unknown;
  function ValidationCanRemoveItem(item: BCAppearanceItem, params: unknown, isSwap: boolean): boolean;
  function ServerChatRoomGetAllowItem(source: BCCharacter, target: BCCharacter): boolean;
  function ServerBundledItemFromAppearanceItem(item: BCAppearanceItem): import("../core/appearance-template").ClothingTemplate;
  function ServerBundledItemToAppearanceItem(family: string, item: import("../core/appearance-template").ClothingTemplate): BCAppearanceItem | null;
  function ServerAppearanceLoadFromBundle(character: BCCharacter, family: string, bundle: import("../core/appearance-template").ClothingTemplate[], sourceMemberNumber?: number, appearanceFull?: boolean): boolean;
  function ValidationCanAddItem(item: BCAppearanceItem, params: unknown): boolean;
  function ValidationResolveCyclicBlocks(appearance: BCAppearanceItem[], diffMap: Record<string, [BCAppearanceItem | null, BCAppearanceItem | null]>): { appearance: BCAppearanceItem[]; valid: boolean };
  function ValidationResolveAppearanceDiff(group: string, previous: BCAppearanceItem | null, next: BCAppearanceItem | null, params: unknown, unknownAsset: boolean): { item: BCAppearanceItem | null; valid: boolean };

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

  var ChatAdminGameList: string[];
  var ServerChatRoomSupportedLanguages: string[];
  var ServerChatRoomDescriptionMaxLength: number;
  var ChatRoomMapViewTypeList: string[];
  var ChatAdminAccessModeValues: string[][];
  var ChatAdminAccessModeLabels: string[];
  var ChatAdminVisibilityModeValues: string[][];
  var ChatAdminVisibilityModeLabels: string[];
  var BackgroundsList: Array<{ Name: string; Tag: string[] }>;
  var ChatAdminBackgroundList: string[] | null;
  function BackgroundsTextGet(name: string): string;
  var ServerChatRoomDataValidate: {
    Custom: ((value: BCChatRoomData["Custom"]) => NonNullable<BCChatRoomData["Custom"]>) & {
      ImageURL(value: string): string | undefined;
      MusicURL(value: string): string | undefined;
      ImageFilter(value: string): string | undefined;
    };
  };

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

  interface BCServerRoomSearchRequest {
    Query: string;
    Space?: string[] | string;
    Game?: string;
    FullRooms?: boolean;
    Language: string | string[];
    SearchDescs?: boolean;
    ShowLocked?: boolean;
    MapTypes?: string[];
  }

  interface BCServerRoomSearchData {
    Name: string;
    Language: string;
    Creator?: string;
    CreatorMemberNumber?: number;
    Creation?: number;
    MemberCount: number;
    MemberLimit: number;
    Description: string;
    BlockCategory?: string[];
    Game?: string;
    Friends?: BCOnlineFriendInfo[];
    Space?: string;
    Visibility?: string[];
    Access?: string[];
    Private?: boolean;
    Locked?: boolean;
    CanJoin: boolean;
    MapType?: string;
  }

  type BCServerRoomSearchResult =
    | BCServerRoomSearchData[]
    | { err?: unknown; error?: unknown; value?: BCServerRoomSearchData[] };

  interface BCServerResult<T = unknown> {
    ok?: boolean;
    value?: T;
    err?: unknown;
    error?: unknown;
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
  function DialogLeave(options?: unknown): void;
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
  function ServerRoomSearch(data: BCServerRoomSearchRequest): Promise<BCServerRoomSearchResult>;
  function ServerRoomSearch(
    query: string,
    data: BCServerRoomSearchRequest,
  ): Promise<BCServerRoomSearchResult>;
  function ServerRoomJoin(roomName: string): Promise<BCServerResult<string>>;
  function ChatRoomCanLeave(): boolean;
  function ChatRoomIsLeavingSlowly(): boolean;
  function ChatRoomAttemptLeave(): void;
  function ChatSearchJoin(roomName: string): void;
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
