import { KikiLinkApp } from "./core/kikilink";

async function bootstrap(): Promise<void> {
  const previous = window.KikiLink;
  if (previous) {
    try {
      await previous.destroy();
    } catch (error) {
      // A partially loaded older release must not block a repaired release from taking over.
      console.warn("[KikiLink] Previous release cleanup failed; continuing startup", error);
    }
  }

  const app = new KikiLinkApp(__KIKILINK_VERSION__);
  window.KikiLink = app.publicApi();

  try {
    await app.start();
  } catch (error) {
    console.error("[KikiLink] Startup failed", error);
  }
}

void bootstrap();
