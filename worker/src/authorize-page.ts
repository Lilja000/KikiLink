export const RELAY_SESSION_MESSAGE_TYPE = "kikilink:catbox-relay-session:v1";

export function renderAuthorizePage(siteKey: string, nonce: string): string {
  const serializedSiteKey = safeJson(siteKey);
  const serializedMessageType = safeJson(RELAY_SESSION_MESSAGE_TYPE);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>KikiLink upload verification</title>
  <style nonce="${nonce}">
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #11131a; color: #f4f1ff; }
    main { box-sizing: border-box; width: min(100% - 32px, 430px); padding: 28px; border: 1px solid #3d3652; border-radius: 18px; background: #1a1c26; box-shadow: 0 16px 48px #0008; }
    h1 { margin: 0 0 12px; font-size: 1.35rem; }
    p { margin: 0 0 16px; color: #cfcae1; line-height: 1.5; }
    #challenge { min-height: 70px; display: grid; place-items: center; }
    #status { min-height: 24px; margin-top: 14px; color: #e6dfff; font-size: .92rem; }
    .privacy { font-size: .82rem; color: #aaa4bd; }
  </style>
  <script nonce="${nonce}" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>
</head>
<body>
  <main>
    <h1>Verify this long-lived upload</h1>
    <p>KikiLink will send the selected file through this relay to Catbox after verification.</p>
    <p class="privacy">Cloudflare processes your IP address, site origin, file bytes, size, and timing. The relay does not retain the file. Catbox receives and hosts the file publicly and may also receive your IP in Cloudflare-added forwarding headers. This relay is not an IP-anonymity service.</p>
    <div id="challenge" aria-label="Cloudflare verification"></div>
    <div id="status" role="status" aria-live="polite">Loading verification…</div>
  </main>
  <script nonce="${nonce}">
    (() => {
      "use strict";
      const SITE_KEY = ${serializedSiteKey};
      const MESSAGE_TYPE = ${serializedMessageType};
      const STATE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
      const HOST_FAMILIES = [
        "bondageprojects.elementfx.com",
        "bondageprojects.com",
        "bondage-europe.com",
        "bondageeurope.com",
        "bondage-asia.com"
      ];
      const status = document.getElementById("status");
      const setStatus = (text) => { status.textContent = text; };
      const normalizeOrigin = (value) => {
        try {
          const url = new URL(value);
          const host = url.hostname.toLowerCase();
          if (url.protocol !== "https:" || url.origin !== value || url.port) return null;
          if (!HOST_FAMILIES.some((base) => host.endsWith("." + base))) return null;
          return url.origin;
        } catch { return null; }
      };
      const params = new URLSearchParams(window.location.hash.slice(1));
      const origin = normalizeOrigin(params.get("origin"));
      const state = params.get("state") || "";
      history.replaceState(null, "", window.location.pathname);
      if (!origin || !STATE_PATTERN.test(state) || !window.opener) {
        setStatus("This verification request is invalid. Close this window and try again.");
        return;
      }

      const complete = async (turnstileToken) => {
        setStatus("Creating a short-lived upload session…");
        try {
          const response = await fetch("/v1/session", {
            method: "POST",
            credentials: "omit",
            cache: "no-store",
            redirect: "error",
            referrerPolicy: "no-referrer",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ origin, state, turnstileToken })
          });
          const text = await response.text();
          if (!response.ok || text.length > 4096) throw new Error("Session rejected");
          const result = JSON.parse(text);
          if (!STATE_PATTERN.test(result.token) || !Number.isSafeInteger(result.expiresAt)) {
            throw new Error("Invalid session response");
          }
          window.opener.postMessage({
            type: MESSAGE_TYPE,
            state,
            token: result.token,
            expiresAt: result.expiresAt
          }, origin);
          setStatus("Verified. You may close this window.");
          window.close();
        } catch {
          setStatus("Verification could not be completed. Close this window and try again.");
        }
      };

      const render = () => {
        if (!window.turnstile) {
          setTimeout(render, 100);
          return;
        }
        setStatus("Complete the check to authorize this upload.");
        window.turnstile.render("#challenge", {
          sitekey: SITE_KEY,
          action: "kikilink_upload",
          cData: state,
          callback: complete,
          "error-callback": () => setStatus("Verification failed. Refresh this window to try again."),
          "expired-callback": () => setStatus("Verification expired. Refresh this window to try again.")
        });
      };
      window.addEventListener("load", render, { once: true });
    })();
  </script>
</body>
</html>`;
}

export function renderDisabledPage(): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KikiLink relay unavailable</title></head><body><main><h1>Uploads are not enabled</h1><p>The KikiLink long-lived upload relay is currently disabled.</p></main></body></html>`;
}

function safeJson(value: string): string {
  return JSON.stringify(value).replace(/</gu, "\\u003c");
}
