import { KikiLinkApp } from "./core/kikilink";

async function bootstrap(): Promise<void> {
  const previous = window.KikiLink;
  if (previous) await previous.destroy();

  const app = new KikiLinkApp(__KIKILINK_VERSION__);
  window.KikiLink = app.publicApi();

  try {
    await app.start();
  } catch (error) {
    console.error("[KikiLink] Startup failed", error);
  }
}

void bootstrap();
