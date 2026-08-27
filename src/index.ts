import { KikiLinkApp } from "./core/kikilink";

async function bootstrap(): Promise<void> {
  document.documentElement.dataset.kikilinkPageRealm = __KIKILINK_VERSION__;
  try {
    const previous = window.KikiLink;
    if (previous) {
      await previous.destroy();
    }
  } catch (error) {
    // A cross-realm 0.22.8/0.22.9 API or partially loaded release must not block the safe runtime.
    console.warn("[KikiLink] Previous release cleanup failed; continuing startup", error);
  }

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
