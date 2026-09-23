import releases from "../../../cloud/shared/news.json";

export interface KikiLinkNewsRelease {
  version: string;
  date: string;
  title: string;
  summary: string;
  highlights: readonly string[];
}

/** One curated release source for News and account-addressed release notifications. */
export const KIKILINK_NEWS: readonly KikiLinkNewsRelease[] = releases;
