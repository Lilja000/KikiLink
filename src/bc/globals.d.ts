declare global {
  interface BCPlayer {
    MemberNumber: number;
    Name: string;
    Nickname?: string;
    FriendNames: Map<number, string>;
  }

  interface BCCharacter {
    MemberNumber: number;
    Name: string;
    Nickname?: string;
  }

  interface BCChatRoomData {
    Name?: string;
    Space?: string;
    Visibility?: string[];
  }

  interface BCServerAccountBeepResponse {
    MemberNumber: number;
    MemberName: string;
    BeepType?: string;
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

  function ServerAccountBeep(data: BCServerAccountBeepResponse): void;
  function ServerAccountQueryResult(data: BCAccountQueryResponse): void;
  function ChatRoomMessage(data: BCChatRoomMessage): void;
  function ServerSend(event: string, data: unknown): void;
  function ServerSendBeepMessage(
    target: number,
    message?: string,
    options?: { includeRoom?: boolean },
  ): void;
  function ChatRoomSendEmote(message: string): void;
  function ChatRoomSetTarget(memberNumber: number): void;
  function InformationSheetLoadCharacter(character: BCCharacter): void;
  function ServerIsLoggedIn(): boolean;
  function CharacterNickname(character: BCCharacter): string;
}

export {};
