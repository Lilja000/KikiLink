declare global {
  interface BCPlayer {
    MemberNumber: number;
    Name: string;
    FriendNames: Map<number, string>;
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

  var Player: BCPlayer;
  var CurrentScreen: string;
  var ChatRoomData: BCChatRoomData | null;

  function ServerAccountBeep(data: BCServerAccountBeepResponse): void;
  function ServerSendBeepMessage(
    target: number,
    message?: string,
    options?: { includeRoom?: boolean },
  ): void;
  function ServerIsLoggedIn(): boolean;
}

export {};
