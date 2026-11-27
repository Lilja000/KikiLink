/** Canonical public room image link shared by the Matches editor and Cloud. */
export function normalizeMatchesBackgroundUrl(value) {
  if (typeof value !== "string") return null;
  const input = value.trim();
  if (input.length > 250 || !/^https:\/\//iu.test(input) || /[\u0000-\u0020\u007f\\]/u.test(input)) return null;
  let url;
  try { url = new URL(input); } catch { return null; }
  const host = url.hostname.replace(/\.$/u, "");
  if (url.username || url.password || url.port ||
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*$/iu.test(host) ||
      /(?:^|\.)(?:localhost|local|internal|home\.arpa)$/iu.test(host) ||
      !/\.(?:jpe?g|png|webp)$/iu.test(url.pathname)) return null;
  url.hash = "";
  return url.href.length <= 250 ? url.href : null;
}
