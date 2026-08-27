export const KIKILINK_UPLOAD_BRIDGE_MARKER_ID = "kikilink-upload-bridge-v1";
export const KIKILINK_UPLOAD_REQUEST = "kikilink:upload-request:v1";
export const KIKILINK_UPLOAD_RESPONSE = "kikilink:upload-response:v1";
export const KIKILINK_UPLOAD_PROGRESS = "kikilink:upload-progress:v1";

export const KIKILINK_ALLOWED_UPLOAD_ENDPOINTS = new Set([
  "https://catbox.moe/user/api.php",
  "https://litterbox.catbox.moe/resources/internals/api.php",
]);

export type KikiLinkUploadField =
  | { kind: "text"; name: string; value: string }
  | { kind: "file"; name: string; blob: Blob; fileName: string; mimeType: string };

export interface KikiLinkUploadRequestMessage {
  type: typeof KIKILINK_UPLOAD_REQUEST;
  id: string;
  endpoint: string;
  timeoutMs: number;
  fields: KikiLinkUploadField[];
}

export interface KikiLinkUploadResponseMessage {
  type: typeof KIKILINK_UPLOAD_RESPONSE;
  id: string;
  ok: boolean;
  status: number;
  body: string;
  error?: string;
}

export interface KikiLinkUploadProgressMessage {
  type: typeof KIKILINK_UPLOAD_PROGRESS;
  id: string;
  loaded: number;
  total?: number;
}
