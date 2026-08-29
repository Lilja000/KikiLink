import { installUserscriptUploadHost } from "./userscript-upload-host";

declare const __KIKILINK_PAGE_BUNDLE__: string;

const uploadCapability = createUploadCapability();
const uninstallUploadHost = uploadCapability
  ? installUserscriptUploadHost(uploadCapability)
  : undefined;
if (uninstallUploadHost) {
  const handlePageHide = (event: PageTransitionEvent): void => {
    // BFCache freezes and later restores this exact userscript/page pair; retain the listener and
    // capability for that case. A final navigation tears down transports and all rolling state.
    if (event.persisted) return;
    window.removeEventListener("pagehide", handlePageHide);
    uninstallUploadHost();
  };
  window.addEventListener("pagehide", handlePageHide);
}

const script = document.createElement("script");
script.dataset.kikilinkPageRuntime = __KIKILINK_VERSION__;
// Keep the capability lexical to the injected runtime: it is never written to the marker or a
// window property. Authenticated bridge replies intentionally echo it for request correlation;
// a hostile page-realm listener can therefore observe a legitimate exchange, so the sandbox
// host's rolling budget remains the authoritative abuse boundary.
script.textContent = `(() => { const __KIKILINK_UPLOAD_CAPABILITY__ = ${JSON.stringify(
  uploadCapability ?? "",
)};\n${__KIKILINK_PAGE_BUNDLE__}\n})();`;
script.addEventListener("error", () => {
  uninstallUploadHost?.();
  console.error("[KikiLink] Bondage Club page runtime injection failed");
}, { once: true });
(document.head ?? document.documentElement).append(script);
script.remove();

function createUploadCapability(): string | undefined {
  try {
    if (typeof crypto !== "object" || typeof crypto.getRandomValues !== "function") {
      return undefined;
    }
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  } catch {
    // Never install a privileged upload bridge with a predictable fallback token.
    return undefined;
  }
}
