import { installUserscriptUploadHost } from "./userscript-upload-host";

declare const __KIKILINK_PAGE_BUNDLE__: string;

installUserscriptUploadHost();

const script = document.createElement("script");
script.dataset.kikilinkPageRuntime = __KIKILINK_VERSION__;
script.textContent = __KIKILINK_PAGE_BUNDLE__;
script.addEventListener("error", () => {
  console.error("[KikiLink] Bondage Club page runtime injection failed");
}, { once: true });
(document.head ?? document.documentElement).append(script);
script.remove();
