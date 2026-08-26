interface KikiLinkGmXhrProgressEvent {
  loaded: number;
  total?: number;
  lengthComputable?: boolean;
}

interface KikiLinkGmXhrResponse {
  status: number;
  statusText?: string;
  responseText?: string;
}

interface KikiLinkGmXhrDetails {
  method: string;
  url: string;
  data?: FormData | Blob | File | string;
  anonymous?: boolean;
  timeout?: number;
  onload(response: KikiLinkGmXhrResponse): void;
  onerror(response: KikiLinkGmXhrResponse): void;
  onabort(): void;
  ontimeout(): void;
  onprogress?(event: KikiLinkGmXhrProgressEvent): void;
}

declare function GM_xmlhttpRequest(details: KikiLinkGmXhrDetails): { abort(): void };
