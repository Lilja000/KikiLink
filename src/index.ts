import { KikiLinkApp } from "./core/kikilink";
import { KIKILINK_DEV_TEST, KIKILINK_DISTRIBUTION } from "./core/distribution";
import type { KikiLinkPublicApi } from "./core/types";
import { compareKikiLinkVersions } from "./core/version-update-checker";

async function bootstrap(): Promise<void> {
  let previous = window.KikiLink;
  if ((existingRuntimePriority(previous) ?? 0) > 0) return;
  while (previous) {
    try {
      await previous.destroy();
    } catch (error) {
      // A cross-realm 0.22.8/0.22.9 API or partially loaded release must not block the safe runtime.
      console.warn("[KikiLink] Previous release cleanup failed; continuing startup", error);
    }
    if (window.KikiLink === previous) break;
    // Another loader may have finished the same teardown first. Keep its winner unless this
    // loader is strictly preferable (newer release, or equal standalone replacing FUSAM).
    // If replacing it, await its own teardown as well so no listeners/hooks survive the handoff.
    previous = window.KikiLink;
    if ((existingRuntimePriority(previous) ?? 0) >= 0) return;
  }

  document.documentElement.dataset.kikilinkPageRealm = __KIKILINK_VERSION__;
  const app = new KikiLinkApp(__KIKILINK_VERSION__);
  const api = app.publicApi();
  window.KikiLink = api;

  try {
    await app.start();
  } catch (error) {
    console.error("[KikiLink] Startup failed", error);
  }
}

/** Positive retains the existing runtime, negative favors this loader, zero permits a reload. */
function existingRuntimePriority(previous: KikiLinkPublicApi | undefined): number | undefined {
  if (!previous || KIKILINK_DEV_TEST) return undefined;
  try {
    const runtime = previous.getRuntimeInfo?.();
    if (!runtime || runtime.active !== true || runtime.devTest !== false ||
        (runtime.distribution !== "userscript" && runtime.distribution !== "fusam")) return undefined;
    const comparison = compareKikiLinkVersions(previous.getVersion(), __KIKILINK_VERSION__);
    if (comparison === undefined || comparison !== 0) return comparison;
    // A late FUSAM load must not replace an equal/newer standalone runtime: the replacement
    // would lose its lexical userscript upload capability. Metadata is only a loader preference;
    // it never exposes that capability or grants FUSAM a privileged transport.
    if (runtime.distribution === KIKILINK_DISTRIBUTION) return 0;
    return runtime.distribution === "userscript" ? 1 : -1;
  } catch {
    // An unknown, broken, or already stopped older API must remain replaceable.
    return undefined;
  }
}

void bootstrap();
