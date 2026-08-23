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

  var Player: BCPlayer;
  var CurrentScreen: string;
  var ChatRoomData: BCChatRoomData | null;
  var ChatRoomCharacter: BCCharacter[];
  var FriendListBeepLog: BCFriendListBeepLogMessage[];

  function ServerAccountBeep(data: BCServerAccountBeepResponse): void;
  function ServerSendBeepMessage(
    target: number,
    message?: string,
    options?: { includeRoom?: boolean },
  ): void;
  function ServerIsLoggedIn(): boolean;
  function CharacterNickname(character: BCCharacter): string;
}

export {};
