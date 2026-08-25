import { KikiLinkApp } from "./core/kikilink";
import { installBCPageContextBridge } from "./bc/page-context";

async function bootstrap(): Promise<void> {
  const page = installBCPageContextBridge();
  const previous = page.KikiLink ?? window.KikiLink;
  if (previous) await previous.destroy();

  const app = new KikiLinkApp(__KIKILINK_VERSION__);
  const api = app.publicApi();
  window.KikiLink = api;
  page.KikiLink = api;

  try {
    await app.start();
  } catch (error) {
    console.error("[KikiLink] Startup failed", error);
  }
}

void bootstrap();
