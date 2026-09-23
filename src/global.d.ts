import type { KikiLinkPublicApi } from "./core/types";

declare global {
  const __KIKILINK_VERSION__: string;
  const __KIKILINK_TRAFFIC_AUDIT__: boolean;
  const __KIKILINK_DEV_TEST__: boolean;
  const __KIKILINK_BUILD_ID__: string;
  const __KIKILINK_DISTRIBUTION__: "userscript" | "fusam";
  const __KIKILINK_CATBOX_RELAY_URL__: string;
  const __KIKILINK_CLOUD_ORIGIN__: string;
  const __KIKILINK_CLOUD_TEST_MEMBER__: number;
  const __KIKILINK_CLOUD_TEST_MEMBERS__: readonly number[];

  interface Window {
    KikiLink?: KikiLinkPublicApi;
  }
}

export {};
