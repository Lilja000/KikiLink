import { KikiLinkApp } from "./core/kikilink";

async function bootstrap(): Promise<void> {
  document.documentElement.dataset.kikilinkPageRealm = __KIKILINK_VERSION__;
  const previous = window.KikiLink;
  try {
    if (previous) {
      await previous.destroy();
    }
  } catch (error) {
    // A cross-realm 0.22.8/0.22.9 API or partially loaded release must not block the safe runtime.
    console.warn("[KikiLink] Previous release cleanup failed; continuing startup", error);
  }

  // A newer loader invocation may already have completed this same cleanup.
  // Do not replace it with a second runtime whose listeners and hooks would survive.
  if (window.KikiLink !== previous) return;

  const app = new KikiLinkApp(__KIKILINK_VERSION__);
  const api = app.publicApi();
  window.KikiLink = api;

  try {
    await app.start();
  } catch (error) {
    console.error("[KikiLink] Startup failed", error);
  }
}

void bootstrap();
