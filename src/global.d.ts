import type { KikiLinkPublicApi } from "./core/types";

declare global {
  const __KIKILINK_VERSION__: string;
  const __KIKILINK_DISTRIBUTION__: "userscript" | "fusam";

  interface Window {
    KikiLink?: KikiLinkPublicApi;
  }
}

export {};
