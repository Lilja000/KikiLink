import type { KikiLinkPublicApi } from "./core/types";

declare global {
  const __KIKILINK_VERSION__: string;

  interface Window {
    KikiLink?: KikiLinkPublicApi;
  }
}

export {};
