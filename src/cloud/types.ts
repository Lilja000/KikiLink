import type { AvatarFrame, ProfileCardStyle } from "../core/types";

export interface CloudProfile {
  memberNumber: number;
  displayName: string;
  bio: string;
  statusMessage?: string;
  isDefault?: boolean;
  autoPublishAllowed?: boolean;
  revision: number;
  visible: boolean;
  avatarFrame: AvatarFrame;
  profileStyle: ProfileCardStyle;
  profileOutlineColor?: string;
  profileGradient?: { start: string; end: string };
  avatarId: string | null;
  bannerId: string | null;
  updatedAt: number;
}
export interface CloudGroup {
  id: string;
  title: string;
  owner: number;
  revision: number;
  legacyId: string | null;
  avatarId?: string | null;
  pinnedMessage?: CloudMessage | null;
  pinRevision?: number;
  lastMessage?: CloudMessage | null;
  lastIncomingSequence?: number;
  incomingSequences?: Array<{memberNumber: number; sequence: number}>;
  conversationId: string;
  membershipVersion: number;
  keyVersion: number;
  createdAt: number;
  members: Array<{
    memberNumber: number;
    role: "owner" | "admin" | "member";
    status: "active" | "invited";
  }>;
}
export interface CloudMessage {
  id: string;
  conversationId: string;
  sender: number;
  sequence: number;
  clientId: string;
  text: string | null;
  schemaVersion: 1;
  encryption: "server-aes-256-gcm";
  membershipVersion: number;
  keyVersion: number;
  createdAt: number;
  deletedAt: number | null;
}
export interface CloudReactions {
  counts: Array<{ reaction: string; count: number }>;
  mine: string | null;
}
export interface CloudPost {
  id: number;
  author: number;
  profile: Pick<
    CloudProfile,
    "memberNumber" | "displayName" | "avatarId" | "avatarFrame"
  >;
  text: string;
  revision: number;
  createdAt: number;
  updatedAt: number;
  mediaIds: string[];
  reactions: CloudReactions;
  commentCount?: number;
}
export interface CloudComment extends Omit<CloudPost, "mediaIds"> {
  postId: number;
}
export interface CloudPage<T> {
  items: T[];
  nextCursor: number | null;
}
export interface CloudMedia {
  id: string;
  kind: "avatar" | "banner" | "feed";
  bytes: number;
  width: number;
  height: number;
}

export interface CloudGroupLive {
  members: Array<{ memberNumber: number; status: "online" | "idle" | "dnd" | "unavailable"; expiresInMs: number }>;
  typing: Array<{ memberNumber: number; expiresInMs: number }>;
}
