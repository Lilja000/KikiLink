import { KikiLinkApp } from "./core/kikilink";
import { KIKILINK_DEV_TEST, KIKILINK_DISTRIBUTION, KIKILINK_PLATFORM_PREVIEW } from "./core/distribution";
import type { KikiLinkPublicApi } from "./core/types";
import { compareKikiLinkVersions } from "./core/version-update-checker";

async function bootstrap(): Promise<void> {
  let previous = window.KikiLink;
  if (blockMixedPlatformRuntime(previous)) return;
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
    if (blockMixedPlatformRuntime(previous)) return;
    if ((existingRuntimePriority(previous) ?? 0) >= 0) return;
  }

  document.getElementById("kikilink-installation-conflict")?.remove();
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

/** A preview must never silently replace a user's active stable installation. */
function blockMixedPlatformRuntime(previous: KikiLinkPublicApi | undefined): boolean {
  if (!previous) return false;
  let conflict = false;
  try {
    const runtime = previous.getRuntimeInfo?.();
    conflict = runtime?.active !== false &&
      Boolean(runtime?.platformPreview) !== KIKILINK_PLATFORM_PREVIEW;
  } catch {
    // An unknown old loader is not evidence that it is safe to replace account services.
    conflict = KIKILINK_PLATFORM_PREVIEW;
  }
  if (!conflict) return false;
  const message = "KikiLink test and stable installations cannot run together. Disable the other KikiLink installation and reload the game.";
  console.warn(`[KikiLink] ${message}`);
  if (!document.getElementById("kikilink-installation-conflict")) {
    const notice = document.createElement("aside");
    notice.id = "kikilink-installation-conflict";
    notice.setAttribute("role", "alert");
    notice.style.cssText = "position:fixed;right:12px;top:12px;z-index:2147483647;box-sizing:border-box;width:360px;max-width:calc(100vw - 24px);padding:14px;border:1px solid #d6a24b;border-radius:10px;background:#111113;color:#f5eee3;font:14px/1.5 system-ui,sans-serif;box-shadow:0 8px 28px #0008";
    notice.append(document.createTextNode(message));
    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.textContent = "Dismiss";
    dismiss.style.cssText = "display:block;margin-top:8px;min-height:36px;padding:4px 12px;border:1px solid #746877;border-radius:6px;background:#222024;color:inherit;font:inherit;cursor:pointer";
    dismiss.addEventListener("click", () => notice.remove());
    notice.append(dismiss);
    (document.body ?? document.documentElement).append(notice);
  }
  return true;
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
