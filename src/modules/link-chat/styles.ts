export const LINK_CHAT_STYLES = `
:host {
  --kl-accent: #d71932;
  --kl-accent-strong: #f13749;
  --kl-accent-foreground: #fff8ee;
  --kl-type-xxs: 9px;
  --kl-type-xs: 10px;
  --kl-type-sm: 11px;
  --kl-type-body: 12px;
  --kl-type-md: 14px;
  --kl-type-lg: 17px;
  --kl-type-xl: 20px;
  --kl-gold: #d6a24b;
  --kl-bg: #070708;
  --kl-panel-bg: rgba(8, 8, 9, 0.985);
  --kl-surface: #111113;
  --kl-surface-2: #19191c;
  --kl-surface-hover: #252427;
  --kl-input-bg: #101012;
  --kl-border: rgba(214, 162, 75, 0.18);
  --kl-border-strong: rgba(214, 162, 75, 0.42);
  --kl-text: #f5eee3;
  --kl-muted: #a89e91;
  --kl-meta: rgba(245, 238, 227, 0.58);
  --kl-danger: #ff8da0;
  --kl-sidebar-bg: rgba(255, 255, 255, 0.012);
  --kl-composer-bg: rgba(8, 8, 9, 0.94);
  --kl-topbar-bg: linear-gradient(180deg, rgba(214, 162, 75, 0.055), transparent);
  --kl-avatar-bg: linear-gradient(145deg, #302b28, #151416);
  --kl-panel-art:
    radial-gradient(circle at 78% 8%, rgba(215, 25, 50, 0.10), transparent 34%),
    radial-gradient(circle at 22% 120%, rgba(214, 162, 75, 0.055), transparent 40%);
  --kl-shadow: 0 26px 80px rgba(0, 0, 0, 0.68);
  color: var(--kl-text);
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 14px;
  line-height: 1.4;
}

:host([data-text-scale="large"]) {
  --kl-type-xxs: 10px;
  --kl-type-xs: 11px;
  --kl-type-sm: 12px;
  --kl-type-body: 13px;
  --kl-type-md: 15px;
  --kl-type-lg: 19px;
  --kl-type-xl: 22px;
  font-size: 15px;
}

:host([data-text-scale="extra-large"]) {
  --kl-type-xxs: 11px;
  --kl-type-xs: 12px;
  --kl-type-sm: 13px;
  --kl-type-body: 14px;
  --kl-type-md: 16px;
  --kl-type-lg: 20px;
  --kl-type-xl: 24px;
  font-size: 16px;
}

:host([data-theme="light"]) {
  --kl-accent-strong: #c9152e;
  --kl-gold: #ad7624;
  --kl-bg: #e9dcc2;
  --kl-panel-bg: rgba(244, 235, 214, 0.985);
  --kl-surface: rgba(250, 244, 229, 0.88);
  --kl-surface-2: #e8d9ba;
  --kl-surface-hover: #ddc79d;
  --kl-input-bg: rgba(255, 250, 238, 0.92);
  --kl-border: rgba(79, 49, 24, 0.18);
  --kl-border-strong: rgba(173, 118, 36, 0.48);
  --kl-text: #211611;
  --kl-muted: #756354;
  --kl-meta: rgba(51, 35, 26, 0.58);
  --kl-danger: #a8172c;
  --kl-sidebar-bg: rgba(103, 69, 35, 0.035);
  --kl-composer-bg: rgba(238, 225, 198, 0.92);
  --kl-topbar-bg: linear-gradient(180deg, rgba(255, 252, 242, 0.62), rgba(211, 188, 147, 0.12));
  --kl-avatar-bg: linear-gradient(145deg, #ead9b6, #cfb98f);
  --kl-panel-art:
    repeating-linear-gradient(7deg, rgba(93, 62, 31, 0.020) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(97deg, rgba(255, 255, 255, 0.10) 0 1px, transparent 1px 11px),
    radial-gradient(circle at 80% 4%, rgba(153, 27, 35, 0.07), transparent 28%),
    radial-gradient(circle at 12% 100%, rgba(81, 52, 29, 0.07), transparent 36%);
  --kl-shadow: 0 26px 72px rgba(50, 31, 17, 0.34);
  color-scheme: light;
}

@media (prefers-color-scheme: light) {
  :host([data-theme="system"]) {
    --kl-accent-strong: #c9152e;
    --kl-gold: #ad7624;
    --kl-bg: #e9dcc2;
    --kl-panel-bg: rgba(244, 235, 214, 0.985);
    --kl-surface: rgba(250, 244, 229, 0.88);
    --kl-surface-2: #e8d9ba;
    --kl-surface-hover: #ddc79d;
    --kl-input-bg: rgba(255, 250, 238, 0.92);
    --kl-border: rgba(79, 49, 24, 0.18);
    --kl-border-strong: rgba(173, 118, 36, 0.48);
    --kl-text: #211611;
    --kl-muted: #756354;
    --kl-meta: rgba(51, 35, 26, 0.58);
    --kl-danger: #a8172c;
    --kl-sidebar-bg: rgba(103, 69, 35, 0.035);
    --kl-composer-bg: rgba(238, 225, 198, 0.92);
    --kl-topbar-bg: linear-gradient(180deg, rgba(255, 252, 242, 0.62), rgba(211, 188, 147, 0.12));
    --kl-avatar-bg: linear-gradient(145deg, #ead9b6, #cfb98f);
    --kl-panel-art:
      repeating-linear-gradient(7deg, rgba(93, 62, 31, 0.020) 0 1px, transparent 1px 7px),
      repeating-linear-gradient(97deg, rgba(255, 255, 255, 0.10) 0 1px, transparent 1px 11px),
      radial-gradient(circle at 80% 4%, rgba(153, 27, 35, 0.07), transparent 28%),
      radial-gradient(circle at 12% 100%, rgba(81, 52, 29, 0.07), transparent 36%);
    --kl-shadow: 0 26px 72px rgba(50, 31, 17, 0.34);
    color-scheme: light;
  }
}

* { box-sizing: border-box; }
[hidden] { display: none !important; }

.kl-icon {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  display: block;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}
.kl-icon[data-filled="true"] .kl-icon-fill { fill: currentColor; }
.kl-icon-button .kl-icon { width: 18px; height: 18px; }

button,
input,
textarea,
select {
  font: inherit;
}

button { color: inherit; }

.kl-emblem {
  position: relative;
  display: block;
  overflow: hidden;
  background: #020203;
}

.kl-emblem-image {
  position: absolute;
  top: 0;
  left: 50%;
  width: 156%;
  height: auto;
  max-width: none;
  transform: translateX(-50%);
  pointer-events: none;
  user-select: none;
}

.kl-launcher {
  position: fixed;
  z-index: 2147483000;
  bottom: max(20px, env(safe-area-inset-bottom));
  width: 58px;
  height: 58px;
  padding: 0;
  border: 1px solid var(--kl-border-strong);
  border-radius: 19px;
  background: #030304;
  box-shadow:
    0 14px 38px color-mix(in srgb, var(--kl-accent), transparent 62%),
    0 0 0 1px rgba(0, 0, 0, 0.75),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  cursor: pointer;
  touch-action: none;
  user-select: none;
  transition: transform 160ms ease, filter 160ms ease, border-color 160ms ease;
}

.kl-launcher[data-side="right"] { right: max(20px, env(safe-area-inset-right)); }
.kl-launcher[data-side="left"] { left: max(20px, env(safe-area-inset-left)); }
.kl-launcher:hover { border-color: var(--kl-gold); filter: brightness(1.08); transform: translateY(-2px); }
.kl-launcher:active { transform: translateY(0) scale(0.97); }
.kl-launcher[data-dragging="true"] { cursor: grabbing; filter: brightness(1.1); transform: scale(1.03); transition: none; }

.kl-launcher-emblem {
  position: absolute;
  inset: 3px;
  border-radius: 15px;
}

.kl-badge {
  position: absolute;
  z-index: 2;
  top: -7px;
  right: -7px;
  min-width: 23px;
  height: 23px;
  padding: 0 6px;
  display: grid;
  place-items: center;
  border: 2px solid var(--kl-bg);
  border-radius: 999px;
  background: #f3e5cb;
  color: #9f1028;
  font-size: 11px;
  font-weight: 900;
}

.kl-panel {
  position: fixed;
  z-index: 2147482999;
  right: max(20px, env(safe-area-inset-right));
  bottom: max(90px, calc(env(safe-area-inset-bottom) + 78px));
  width: min(1040px, calc(100vw - 40px));
  height: min(680px, calc(100vh - 130px));
  min-height: 420px;
  display: grid;
  grid-template-rows: 64px minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--kl-border);
  border-radius: 24px;
  background: var(--kl-panel-art), var(--kl-panel-bg);
  box-shadow: var(--kl-shadow);
  contain: layout paint style;
  isolation: isolate;
  transform-origin: bottom right;
  animation: kl-enter 160ms ease-out;
}

.kl-panel::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.045);
  pointer-events: none;
}

.kl-panel[data-side="left"] {
  left: max(20px, env(safe-area-inset-left));
  right: auto;
  transform-origin: bottom left;
}

@keyframes kl-enter {
  from { opacity: 0; transform: translateY(10px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.kl-topbar {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px 0 18px;
  border-bottom: 1px solid var(--kl-border);
  background: var(--kl-topbar-bg);
}

.kl-topbar::after {
  content: "";
  position: absolute;
  left: 18px;
  bottom: -1px;
  width: 70px;
  height: 1px;
  background: linear-gradient(90deg, var(--kl-accent), var(--kl-gold), transparent);
}

.kl-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  margin-right: auto;
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.kl-panel[data-dragging="true"] .kl-brand { cursor: grabbing; }

.kl-brand-emblem {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border: 1px solid var(--kl-border-strong);
  border-radius: 12px;
  box-shadow: 0 5px 16px rgba(0, 0, 0, 0.24);
}

.kl-brand-copy { min-width: 0; }
.kl-brand-title {
  overflow: hidden;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.075em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}
.kl-brand-subtitle { display: flex; align-items: center; gap: 8px; color: var(--kl-muted); font-size: var(--kl-type-sm); letter-spacing: 0.02em; }
.kl-topbar-context {
  margin-right: 2px;
  color: var(--kl-gold);
  font-size: var(--kl-type-xs);
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.kl-topbar-settings { display: none; }
.kl-finder-trigger {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 8px 6px 10px;
  color: var(--kl-muted);
  font-size: var(--kl-type-sm);
}
.kl-finder-trigger:hover { color: var(--kl-text); }
.kl-finder-trigger-icon { width: 18px; height: 18px; color: var(--kl-gold); }
.kl-finder-trigger-label { font-weight: 800; }
.kl-finder-shortcut,
.kl-finder-keys kbd {
  padding: 2px 5px;
  border: 1px solid var(--kl-border);
  border-bottom-color: var(--kl-border-strong);
  border-radius: 5px;
  background: var(--kl-input-bg);
  color: var(--kl-meta);
  font-family: inherit;
  font-size: var(--kl-type-xxs);
  font-weight: 780;
  line-height: 1.35;
  white-space: nowrap;
}
.kl-topbar-settings[aria-current="page"] {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 24%);
  background: color-mix(in srgb, var(--kl-accent), transparent 84%);
}
.kl-connection { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.kl-connection-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--kl-gold); box-shadow: 0 0 0 3px color-mix(in srgb, var(--kl-gold), transparent 84%); }
.kl-connection[data-state="ready"] .kl-connection-dot { background: #68d391; box-shadow: 0 0 0 3px rgba(104, 211, 145, 0.16); }
.kl-connection[data-state="error"] .kl-connection-dot { background: var(--kl-danger); box-shadow: 0 0 0 3px color-mix(in srgb, var(--kl-danger), transparent 84%); }

.kl-icon-button,
.kl-text-button {
  border: 1px solid var(--kl-border);
  background: var(--kl-surface-2);
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease, transform 140ms ease;
}

.kl-icon-button {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 11px;
  font-size: 17px;
}

.kl-roster-button { position: relative; }
.kl-roster-count {
  position: absolute;
  top: 4px;
  right: 7px;
  min-width: 19px;
  height: 19px;
  display: grid;
  place-items: center;
  padding: 0 5px;
  border: 2px solid var(--kl-bg);
  border-radius: 999px;
  background: var(--kl-gold);
  color: #1b1005;
  font-size: 9px;
  font-weight: 900;
}

.kl-text-button {
  min-height: 40px;
  padding: 7px 12px;
  border-radius: 11px;
  font-weight: 750;
}

.kl-icon-button:hover,
.kl-text-button:hover {
  border-color: var(--kl-border-strong);
  background: var(--kl-surface-hover);
}
.kl-icon-button:active,
.kl-text-button:active { transform: scale(0.96); }
.kl-icon-button:disabled,
.kl-text-button:disabled { opacity: 0.48; cursor: wait; transform: none; }
.kl-text-button--danger { color: var(--kl-danger); }
.kl-text-button--primary {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 24%);
  background: var(--kl-accent);
  color: var(--kl-accent-foreground);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.13);
}
.kl-text-button--primary:hover { background: color-mix(in srgb, var(--kl-accent), var(--kl-accent-foreground) 10%); }

.kl-shell {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
}

.kl-feature-nav {
  position: relative;
  z-index: 2;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 14px 9px;
  border-right: 1px solid var(--kl-border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--kl-accent), transparent 94%), transparent 45%),
    var(--kl-sidebar-bg);
}

.kl-nav-item {
  position: relative;
  width: 100%;
  min-height: 62px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 7px 4px;
  border: 1px solid transparent;
  border-radius: 15px;
  background: transparent;
  color: var(--kl-muted);
  cursor: pointer;
  transition: color 140ms ease, border-color 140ms ease, background 140ms ease, transform 140ms ease;
}

.kl-nav-item:hover {
  border-color: var(--kl-border);
  background: var(--kl-surface-2);
  color: var(--kl-text);
}
.kl-nav-item:active { transform: scale(0.97); }
.kl-nav-item[data-active="true"] {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 22%);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--kl-accent), transparent 82%), transparent),
    var(--kl-surface-2);
  color: var(--kl-text);
  box-shadow: inset 3px 0 var(--kl-accent);
}
.kl-nav-item[data-available="false"] .kl-nav-icon { opacity: 0.48; }
.kl-nav-icon { width: 20px; height: 20px; }
.kl-nav-label {
  max-width: 100%;
  overflow: hidden;
  font-size: var(--kl-type-xs);
  font-weight: 820;
  letter-spacing: 0.035em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-nav-item[data-target="settings"] { margin-top: auto; }

.kl-workspace {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  contain: layout paint;
}
.kl-workspace > .kl-layout,
.kl-workspace > .kl-home,
.kl-workspace > .kl-feature-page,
.kl-workspace > .kl-settings-page { height: 100%; }

.kl-feature-page,
.kl-settings-page {
  min-width: 0;
  min-height: 0;
  background:
    radial-gradient(circle at 92% 0%, color-mix(in srgb, var(--kl-accent), transparent 91%), transparent 32%),
    transparent;
}

.kl-feature-page {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.kl-feature-page-header {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 19px 24px 17px;
  border-bottom: 1px solid var(--kl-border);
  background: color-mix(in srgb, var(--kl-surface), transparent 42%);
}
.kl-feature-page-heading { min-width: 0; margin-right: auto; }
.kl-feature-page-eyebrow {
  color: var(--kl-gold);
  font-size: var(--kl-type-xxs);
  font-weight: 900;
  letter-spacing: 0.16em;
}
.kl-feature-page-title {
  margin: 2px 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: var(--kl-type-xl);
  line-height: 1.15;
}
.kl-feature-page-subtitle {
  margin: 3px 0 0;
  color: var(--kl-muted);
  font-size: var(--kl-type-sm);
}
.kl-feature-page-footer {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  padding: 11px 20px;
  border-top: 1px solid var(--kl-border);
  background: var(--kl-composer-bg);
}
.kl-feature-page-footnote { margin-right: auto; color: var(--kl-muted); font-size: var(--kl-type-xs); }

.kl-settings-page {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
}
.kl-settings-layout {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
}
.kl-settings-tabs {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 15px 11px;
  overflow-y: auto;
  border-right: 1px solid var(--kl-border);
  background: var(--kl-sidebar-bg);
}
.kl-settings-tab {
  width: 100%;
  min-height: 46px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 11px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: var(--kl-muted);
  text-align: left;
  cursor: pointer;
}
.kl-settings-tab:hover { border-color: var(--kl-border); background: var(--kl-surface-2); color: var(--kl-text); }
.kl-settings-tab[data-active="true"] {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 22%);
  background: color-mix(in srgb, var(--kl-accent), transparent 87%);
  color: var(--kl-text);
  box-shadow: inset 3px 0 var(--kl-accent);
}
.kl-settings-tab-icon {
  width: 25px;
  height: 18px;
  padding-inline: 3px;
  color: var(--kl-gold);
}
.kl-settings-panels { min-width: 0; min-height: 0; overflow: hidden; }
.kl-settings-panel {
  height: 100%;
  overflow-y: auto;
  padding: 24px clamp(22px, 4vw, 42px) 34px;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-settings-panel-title {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: var(--kl-type-xl);
}
.kl-settings-panel-description {
  max-width: 680px;
  margin: 5px 0 22px;
  color: var(--kl-muted);
  font-size: var(--kl-type-body);
}
.kl-settings-panel-body { display: grid; gap: 18px; }
.kl-settings-actions {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  padding: 11px 20px;
  border-top: 1px solid var(--kl-border);
  background: var(--kl-composer-bg);
}
.kl-settings-local-note { margin-right: auto; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-setting-action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.kl-inline-actions { display: flex; flex: 0 0 auto; align-items: center; gap: 7px; flex-wrap: wrap; justify-content: flex-end; }
.kl-data-tools {
  position: relative;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px 15px 14px 17px;
  overflow: hidden;
  border: 1px solid var(--kl-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 18%);
}
.kl-data-tools::before {
  content: "";
  position: absolute;
  inset: 10px auto 10px 0;
  width: 2px;
  border-radius: 999px;
  background: linear-gradient(var(--kl-accent), var(--kl-gold));
}
.kl-data-tools-copy { min-width: 0; margin-right: auto; }
.kl-data-tools-title { font-weight: 780; }
.kl-data-tools-count { display: block; margin-top: 5px; color: var(--kl-meta); font-size: var(--kl-type-xs); }
.kl-data-tools-actions { display: flex; align-items: center; gap: 7px; flex: 0 0 auto; }
.kl-data-tools-actions .kl-text-button { min-width: 76px; }

.kl-home {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: clamp(20px, 3vw, 34px);
  background:
    radial-gradient(circle at 88% 3%, color-mix(in srgb, var(--kl-accent), transparent 82%), transparent 30%),
    radial-gradient(circle at 12% 105%, color-mix(in srgb, var(--kl-gold), transparent 91%), transparent 34%);
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}

.kl-home-hero {
  position: relative;
  min-height: 214px;
  display: grid;
  grid-template-columns: minmax(230px, 0.82fr) minmax(330px, 1.18fr);
  align-items: center;
  gap: clamp(20px, 3vw, 34px);
  margin-bottom: 22px;
  padding: 25px 28px;
  overflow: hidden;
  border: 1px solid var(--kl-border);
  border-radius: 24px;
  background:
    linear-gradient(125deg, color-mix(in srgb, var(--kl-accent), transparent 88%), transparent 46%),
    color-mix(in srgb, var(--kl-surface), transparent 8%);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.035);
}
.kl-home-hero::before {
  content: "";
  position: absolute;
  left: 28px;
  bottom: 0;
  width: 180px;
  height: 1px;
  background: linear-gradient(90deg, var(--kl-accent), var(--kl-gold), transparent);
}
.kl-home-hero-copy { position: relative; z-index: 2; min-width: 0; }
.kl-home-eyebrow,
.kl-feature-card-kicker,
.kl-home-next-kicker {
  color: var(--kl-gold);
  font-size: var(--kl-type-xxs);
  font-weight: 900;
  letter-spacing: 0.16em;
}
.kl-home-title {
  margin: 6px 0 4px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(25px, 3.2vw, 38px);
  font-weight: 650;
  letter-spacing: -0.025em;
}
.kl-home-lead { max-width: 590px; margin: 0; color: var(--kl-muted); font-size: var(--kl-type-body); }
.kl-home-statuses { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
.kl-home-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 30px;
  padding: 5px 10px;
  border: 1px solid var(--kl-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 18%);
  font-size: var(--kl-type-xs);
}
.kl-home-status-label { color: var(--kl-muted); }
.kl-home-status-value { font-weight: 780; }
.kl-home-status-value[data-state="ready"] { color: #68d391; }
.kl-home-status-value[data-state="error"] { color: var(--kl-danger); }
.kl-home-mark {
  position: absolute;
  left: 23%;
  bottom: -28px;
  width: 128px;
  height: 128px;
  opacity: 0.13;
  pointer-events: none;
  transform: rotate(-8deg);
}
.kl-home-emblem {
  position: absolute;
  inset: 14px;
  z-index: 1;
  border: 1px solid var(--kl-border-strong);
  border-radius: 38px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
  transform: rotate(3deg);
}
.kl-home-orbit {
  position: absolute;
  inset: 0;
  border: 1px solid color-mix(in srgb, var(--kl-gold), transparent 52%);
  border-radius: 50%;
  transform: rotate(-18deg) scaleY(0.62);
}
.kl-home-orbit::after {
  content: "";
  position: absolute;
  top: 44%;
  right: -4px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--kl-accent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--kl-accent), transparent 28%);
}

.kl-home-next {
  position: relative;
  z-index: 2;
  min-width: 0;
  align-self: stretch;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 13px 15px;
  padding: 20px;
  border: 1px solid color-mix(in srgb, var(--kl-accent), var(--kl-gold) 26%);
  border-radius: 19px;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--kl-accent), transparent 80%), transparent 68%),
    color-mix(in srgb, var(--kl-surface-2), transparent 5%);
  box-shadow: 0 16px 35px rgba(0, 0, 0, 0.12);
}
.kl-home-next-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--kl-gold), transparent 36%);
  border-radius: 15px;
  background: color-mix(in srgb, var(--kl-surface), transparent 7%);
  color: var(--kl-gold);
  font-size: 22px;
  font-weight: 850;
}
.kl-home-next-copy { min-width: 0; }
.kl-home-next-title {
  margin: 4px 0 3px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(20px, 2.3vw, 27px);
  line-height: 1.12;
}
.kl-home-next-description {
  max-width: 480px;
  margin: 0;
  color: var(--kl-muted);
  font-size: var(--kl-type-sm);
}
.kl-home-next-footer {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--kl-border);
}
.kl-home-next-meta {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: var(--kl-meta);
  font-size: var(--kl-type-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-home-next-button { flex: 0 0 auto; }

.kl-home-section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 18px;
  margin: 0 2px 10px;
}
.kl-home-section-heading h2 {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: var(--kl-type-xl);
}
.kl-home-section-heading p {
  margin: 0;
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
  text-align: right;
}

.kl-feature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.kl-feature-card {
  position: relative;
  min-width: 0;
  min-height: 150px;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 11px 14px;
  padding: 18px;
  overflow: hidden;
  border: 1px solid var(--kl-border);
  border-radius: 19px;
  background: var(--kl-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 150ms ease, border-color 150ms ease, background 150ms ease;
}
.kl-feature-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--kl-accent), transparent 91%), transparent 38%);
  pointer-events: none;
}
.kl-feature-card:hover {
  border-color: var(--kl-border-strong);
  background: var(--kl-surface-hover);
  transform: translateY(-2px);
}
.kl-feature-card:active { transform: translateY(0) scale(0.99); }
.kl-feature-card--primary {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 24%);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--kl-accent), transparent 82%), transparent 64%),
    var(--kl-surface);
}
.kl-feature-card[data-available="false"] { border-style: dashed; }
.kl-feature-card-icon {
  position: relative;
  z-index: 1;
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border: 1px solid var(--kl-border-strong);
  border-radius: 15px;
  background: var(--kl-surface-2);
  color: var(--kl-gold);
  padding: 12px;
}
.kl-feature-card-copy {
  position: relative;
  z-index: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.kl-feature-card-title {
  margin-top: 3px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 19px;
  font-weight: 700;
}
.kl-feature-card-description { margin-top: 5px; color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-feature-card-footer {
  position: relative;
  z-index: 1;
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--kl-border);
}
.kl-feature-card-metric {
  min-width: 0;
  overflow: hidden;
  color: var(--kl-meta);
  font-size: var(--kl-type-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-feature-card-action {
  flex: 0 0 auto;
  margin-left: auto;
  color: var(--kl-gold);
  font-size: var(--kl-type-xs);
  font-weight: 820;
  white-space: nowrap;
}
.kl-feature-card-action::after { content: " →"; }
.kl-home-privacy {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 8px 2px;
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
  text-align: center;
}
.kl-home-privacy-icon { width: 17px; height: 17px; color: var(--kl-gold); }

:host([data-home-layout="compact"]) .kl-home-hero {
  min-height: 0;
  grid-template-columns: minmax(0, 1fr);
  margin-bottom: 12px;
  padding-block: 18px;
}
:host([data-home-layout="compact"]) .kl-home-mark,
:host([data-home-layout="compact"]) .kl-home-next,
:host([data-home-layout="compact"]) .kl-home-lead,
:host([data-home-layout="compact"]) .kl-home-section-description,
:host([data-home-layout="compact"]) .kl-feature-card-description { display: none; }
:host([data-home-layout="compact"]) .kl-feature-card {
  min-height: 112px;
  grid-template-rows: minmax(0, 1fr) auto;
}

:host([data-density="compact"]) .kl-feature-nav { gap: 4px; padding-block: 9px; }
:host([data-density="compact"]) .kl-nav-item { min-height: 52px; }
:host([data-density="compact"]) .kl-home { padding: 18px; }
:host([data-density="compact"]) .kl-home-hero { min-height: 176px; margin-bottom: 14px; padding: 19px 22px; }
:host([data-density="compact"]) .kl-home-next { padding: 15px; }
:host([data-density="compact"]) .kl-feature-card { min-height: 126px; padding: 14px; }
:host([data-density="compact"]) .kl-conversation { padding-block: 7px; }
:host([data-density="compact"]) .kl-settings-panel { padding-top: 18px; }
:host([data-density="compact"]) .kl-settings-panel-body { gap: 13px; }

:host([data-density="super-compact"]) .kl-panel {
  width: min(920px, calc(100vw - 40px));
  height: min(600px, calc(100vh - 130px));
  min-height: 380px;
  grid-template-rows: 52px minmax(0, 1fr);
  border-radius: 20px;
  background: var(--kl-panel-bg);
}
:host([data-density="super-compact"]) .kl-topbar { gap: 7px; padding-inline: 12px; }
:host([data-density="super-compact"]) .kl-brand { gap: 7px; }
:host([data-density="super-compact"]) .kl-brand-emblem { width: 32px; height: 32px; border-radius: 10px; }
:host([data-density="super-compact"]) .kl-brand-subtitle,
:host([data-density="super-compact"]) .kl-feature-page-eyebrow,
:host([data-density="super-compact"]) .kl-feature-page-subtitle,
:host([data-density="super-compact"]) .kl-settings-panel-description,
:host([data-density="super-compact"]) .kl-home-lead,
:host([data-density="super-compact"]) .kl-home-mark,
:host([data-density="super-compact"]) .kl-home-section-description,
:host([data-density="super-compact"]) .kl-feature-card-description,
:host([data-density="super-compact"]) .kl-home-privacy { display: none; }
:host([data-density="super-compact"]) .kl-finder-trigger { min-height: 34px; padding-block: 4px; }
:host([data-density="super-compact"]) .kl-icon-button { width: 34px; height: 34px; border-radius: 9px; }
:host([data-density="super-compact"]) .kl-text-button { min-height: 34px; padding: 5px 10px; border-radius: 9px; }
:host([data-density="super-compact"]) .kl-shell { grid-template-columns: 72px minmax(0, 1fr); }
:host([data-density="super-compact"]) .kl-feature-nav { gap: 3px; padding: 7px 6px; }
:host([data-density="super-compact"]) .kl-nav-item { min-height: 46px; gap: 2px; padding: 4px 2px; border-radius: 11px; }
:host([data-density="super-compact"]) .kl-nav-icon { font-size: 18px; }
:host([data-density="super-compact"]) .kl-feature-page,
:host([data-density="super-compact"]) .kl-settings-page,
:host([data-density="super-compact"]) .kl-main { background: transparent; }
:host([data-density="super-compact"]) .kl-feature-page-header { gap: 10px; padding: 10px 16px; }
:host([data-density="super-compact"]) .kl-feature-page-title { margin-top: 0; font-size: var(--kl-type-lg); }
:host([data-density="super-compact"]) .kl-feature-page-footer { min-height: 50px; padding: 7px 12px; }
:host([data-density="super-compact"]) .kl-home { padding: 11px; background: transparent; }
:host([data-density="super-compact"]) .kl-home-hero {
  min-height: 130px;
  gap: 14px;
  margin-bottom: 10px;
  padding: 13px 16px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--kl-surface), transparent 5%);
}
:host([data-density="super-compact"]) .kl-home-title { margin-block: 2px; font-size: clamp(22px, 2.7vw, 30px); }
:host([data-density="super-compact"]) .kl-home-statuses { gap: 5px; margin-top: 9px; }
:host([data-density="super-compact"]) .kl-home-status { min-height: 25px; padding: 3px 8px; }
:host([data-density="super-compact"]) .kl-home-next {
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 8px 10px;
  padding: 11px;
  border-radius: 14px;
  box-shadow: none;
}
:host([data-density="super-compact"]) .kl-home-next-icon { width: 38px; height: 38px; border-radius: 11px; font-size: 18px; }
:host([data-density="super-compact"]) .kl-home-next-title { margin-top: 1px; font-size: var(--kl-type-lg); }
:host([data-density="super-compact"]) .kl-home-next-description { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
:host([data-density="super-compact"]) .kl-home-next-footer { gap: 8px; padding-top: 7px; }
:host([data-density="super-compact"]) .kl-home-section-heading { margin-bottom: 6px; }
:host([data-density="super-compact"]) .kl-home-section-heading h2 { font-size: var(--kl-type-lg); }
:host([data-density="super-compact"]) .kl-feature-grid { gap: 7px; }
:host([data-density="super-compact"]) .kl-feature-card {
  min-height: 84px;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 6px 9px;
  padding: 9px 10px;
  border-radius: 13px;
}
:host([data-density="super-compact"]) .kl-feature-card-icon { width: 36px; height: 36px; border-radius: 10px; font-size: 17px; }
:host([data-density="super-compact"]) .kl-feature-card-title { margin-top: 0; font-size: var(--kl-type-md); }
:host([data-density="super-compact"]) .kl-feature-card-footer { gap: 7px; padding-top: 5px; }
:host([data-density="super-compact"]) .kl-layout { grid-template-columns: 270px minmax(0, 1fr); }
:host([data-density="super-compact"]) .kl-search-wrap { padding: 8px; }
:host([data-density="super-compact"]) .kl-sidebar-heading { padding: 0 8px 5px 10px; }
:host([data-density="super-compact"]) .kl-search { height: 36px; border-radius: 9px; }
:host([data-density="super-compact"]) .kl-sidebar-new-chat { width: 32px; height: 32px; }
:host([data-density="super-compact"]) .kl-conversations { padding-inline: 5px; }
:host([data-density="super-compact"]) .kl-conversation {
  grid-template-columns: 36px minmax(0, 1fr) auto;
  gap: 8px;
  padding: 5px 7px;
  border-radius: 10px;
}
:host([data-density="super-compact"]) .kl-conversation .kl-avatar { width: 36px; height: 36px; border-radius: 10px; }
:host([data-density="super-compact"]) .kl-conversation-side { gap: 2px; }
:host([data-density="super-compact"]) .kl-chat { grid-template-rows: 50px minmax(0, 1fr) auto; }
:host([data-density="super-compact"]) .kl-chat-header { gap: 8px; padding-inline: 10px; }
:host([data-density="super-compact"]) .kl-chat-header .kl-avatar { width: 36px; height: 36px; border-radius: 10px; }
:host([data-density="super-compact"]) .kl-messages { padding: 10px 12px; }
:host([data-density="super-compact"]) .kl-message-row { margin-block: 4px; }
:host([data-density="super-compact"]) .kl-message-bubble { padding: 7px 9px 6px; border-radius: 12px 12px 12px 4px; box-shadow: none; }
:host([data-density="super-compact"]) .kl-message-row[data-direction="outgoing"] .kl-message-bubble { border-radius: 12px 12px 4px 12px; }
:host([data-density="super-compact"]) .kl-message-row[data-group="start"],
:host([data-density="super-compact"]) .kl-message-row[data-group="middle"] { margin-bottom: 2px; }
:host([data-density="super-compact"]) .kl-message-row[data-group="middle"],
:host([data-density="super-compact"]) .kl-message-row[data-group="end"] { margin-top: 2px; }
:host([data-density="super-compact"]) .kl-message-row[data-direction="incoming"][data-group="start"] .kl-message-bubble { border-radius: 12px 12px 12px 8px; }
:host([data-density="super-compact"]) .kl-message-row[data-direction="incoming"][data-group="middle"] .kl-message-bubble { border-radius: 8px 12px 12px 8px; }
:host([data-density="super-compact"]) .kl-message-row[data-direction="incoming"][data-group="end"] .kl-message-bubble { border-radius: 8px 12px 12px 4px; }
:host([data-density="super-compact"]) .kl-message-row[data-direction="outgoing"][data-group="start"] .kl-message-bubble { border-radius: 12px 12px 8px 12px; }
:host([data-density="super-compact"]) .kl-message-row[data-direction="outgoing"][data-group="middle"] .kl-message-bubble { border-radius: 12px 8px 8px 12px; }
:host([data-density="super-compact"]) .kl-message-row[data-direction="outgoing"][data-group="end"] .kl-message-bubble { border-radius: 12px 8px 4px 12px; }
:host([data-density="super-compact"]) .kl-message-meta { margin-top: 3px; }
:host([data-density="super-compact"]) .kl-composer { padding: 7px 9px 8px; }
:host([data-density="super-compact"]) .kl-quick-actions { gap: 5px; margin-bottom: 5px; padding-bottom: 2px; }
:host([data-density="super-compact"]) .kl-action-chip { min-height: 30px; padding: 3px 8px; }
:host([data-density="super-compact"]) .kl-composer-row { gap: 7px; }
:host([data-density="super-compact"]) .kl-composer-input { min-height: 38px; padding: 8px 10px; border-radius: 10px; }
:host([data-density="super-compact"]) .kl-send { height: 38px; min-width: 64px; }
:host([data-density="super-compact"]) .kl-composer-options { margin-top: 4px; }
:host([data-density="super-compact"]) .kl-settings-layout { grid-template-columns: 160px minmax(0, 1fr); }
:host([data-density="super-compact"]) .kl-settings-tabs { gap: 3px; padding: 8px 7px; }
:host([data-density="super-compact"]) .kl-settings-tab { min-height: 38px; gap: 7px; padding: 5px 8px; border-radius: 9px; }
:host([data-density="super-compact"]) .kl-settings-panel { padding: 13px 20px 20px; }
:host([data-density="super-compact"]) .kl-settings-panel-body { gap: 10px; }
:host([data-density="super-compact"]) .kl-settings-actions { min-height: 50px; padding: 7px 12px; }
:host([data-density="super-compact"]) .kl-setting-section { gap: 9px; }
:host([data-density="super-compact"]) .kl-setting-row,
:host([data-density="super-compact"]) .kl-setting-action-row { gap: 13px; }
:host([data-density="super-compact"]) .kl-select,
:host([data-density="super-compact"]) .kl-number-input,
:host([data-density="super-compact"]) .kl-color-input { height: 36px; }
:host([data-density="super-compact"]) .kl-color-swatch { width: 27px; height: 27px; }
:host([data-density="super-compact"]) .kl-switch { height: 36px; }
:host([data-density="super-compact"]) .kl-switch-track { inset-block: 5px; }
:host([data-density="super-compact"]) .kl-action-label,
:host([data-density="super-compact"]) .kl-action-template { height: 35px; }
:host([data-density="super-compact"]) .kl-data-tools { gap: 12px; padding: 10px 11px 10px 14px; border-radius: 11px; }
:host([data-density="super-compact"]) .kl-roster-body { gap: 9px; padding: 10px; }
:host([data-density="super-compact"]) .kl-roster-list-pane { gap: 6px; }
:host([data-density="super-compact"]) .kl-roster-scope { min-height: 34px; }
:host([data-density="super-compact"]) .kl-roster-entry { grid-template-columns: 35px minmax(0, 1fr) auto; gap: 7px; padding: 5px; border-radius: 9px; }
:host([data-density="super-compact"]) .kl-roster-entry .kl-avatar { width: 35px; height: 35px; border-radius: 9px; }
:host([data-density="super-compact"]) .kl-roster-detail { padding: 10px; border-radius: 12px; }
:host([data-density="super-compact"]) .kl-roster-quick-actions,
:host([data-density="super-compact"]) .kl-roster-stats { margin-top: 9px; }
:host([data-density="super-compact"]) .kl-roster-notebook { gap: 7px; margin-top: 9px; padding-top: 9px; }
:host([data-density="super-compact"]) .kl-roster-note { min-height: 86px; }

.kl-layout {
  position: relative;
  z-index: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 310px minmax(0, 1fr);
}

.kl-sidebar {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  border-right: 1px solid var(--kl-border);
  background: var(--kl-sidebar-bg);
}

.kl-search-wrap { padding: 14px; }
.kl-sidebar-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 13px 8px 16px;
  color: var(--kl-gold);
  font-size: var(--kl-type-xs);
  font-weight: 850;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.kl-sidebar-heading-actions { display: flex; align-items: center; gap: 6px; }
.kl-sidebar-new-chat {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--kl-border);
  border-radius: 8px;
  background: var(--kl-surface-2);
  color: var(--kl-text);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}
.kl-sidebar-new-chat:hover {
  border-color: var(--kl-border-strong);
  background: var(--kl-surface-hover);
}
.kl-sidebar-gallery {
  width: auto;
  grid-auto-flow: column;
  gap: 6px;
  padding-inline: 9px;
  color: var(--kl-gold);
  font-size: var(--kl-type-xs);
  font-weight: 820;
}
.kl-sidebar-gallery .kl-icon { width: 16px; height: 16px; }
.kl-search,
.kl-composer-input,
.kl-number-input,
.kl-select,
.kl-action-label,
.kl-action-template,
.kl-reaction-input,
.kl-reaction-name,
.kl-reaction-template,
.kl-roster-note,
.kl-roster-tags {
  border: 1px solid var(--kl-border);
  outline: none;
  background: var(--kl-input-bg);
  color: var(--kl-text);
  transition: border-color 140ms ease, box-shadow 140ms ease;
}

.kl-search,
.kl-composer-input { width: 100%; }

.kl-search {
  height: 44px;
  padding: 0 13px;
  border-radius: 12px;
}

.kl-search:focus,
.kl-composer-input:focus,
.kl-number-input:focus,
.kl-select:focus,
.kl-action-label:focus,
.kl-action-template:focus,
.kl-reaction-input:focus,
.kl-reaction-name:focus,
.kl-reaction-template:focus,
.kl-roster-note:focus,
.kl-roster-tags:focus {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 30%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--kl-accent), transparent 78%);
}

.kl-conversations {
  min-height: 0;
  overflow: auto;
  padding: 0 8px 12px;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
  overscroll-behavior: contain;
  contain: layout paint;
}

.kl-conversation {
  width: 100%;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 11px;
  align-items: center;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 15px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.kl-conversation:hover { background: color-mix(in srgb, var(--kl-surface-hover), transparent 34%); }
.kl-conversation[data-active="true"] {
  border-color: color-mix(in srgb, var(--kl-accent), transparent 56%);
  background: color-mix(in srgb, var(--kl-accent), transparent 88%);
}

.kl-avatar {
  position: relative;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px solid var(--kl-border);
  border-radius: 15px;
  background: var(--kl-avatar-bg);
  overflow: hidden;
  font-weight: 850;
  text-transform: uppercase;
}
.kl-avatar img { width: 100%; height: 100%; display: block; object-fit: cover; }

.kl-conversation-main { min-width: 0; }
.kl-conversation-name-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
.kl-conversation-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 750; }
.kl-pin { width: 13px; height: 13px; color: var(--kl-gold); }
.kl-conversation-preview { overflow: hidden; color: var(--kl-muted); font-size: var(--kl-type-body); text-overflow: ellipsis; white-space: nowrap; }
.kl-conversation-side { align-self: stretch; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 5px; }
.kl-time { color: var(--kl-muted); font-size: var(--kl-type-xs); white-space: nowrap; }
.kl-unread {
  min-width: 19px;
  height: 19px;
  display: grid;
  place-items: center;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--kl-accent);
  color: var(--kl-accent-foreground);
  font-size: var(--kl-type-xs);
  font-weight: 850;
}

.kl-main {
  min-width: 0;
  min-height: 0;
  display: grid;
  background: radial-gradient(circle at 78% 4%, color-mix(in srgb, var(--kl-accent), transparent 93%), transparent 39%);
}

.kl-empty {
  place-self: center;
  width: min(340px, 80%);
  text-align: center;
}

.kl-empty-mark {
  width: 76px;
  height: 76px;
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
  border: 1px solid var(--kl-border-strong);
  border-radius: 50%;
  background:
    radial-gradient(circle at center, color-mix(in srgb, var(--kl-accent), transparent 18%) 0 32%, transparent 33%),
    var(--kl-surface);
  color: var(--kl-gold);
  font-size: 30px;
  font-weight: 900;
}

.kl-empty-title { margin: 0 0 7px; font-family: Georgia, "Times New Roman", serif; font-size: var(--kl-type-xl); font-weight: 700; }
.kl-empty-copy { margin: 0 0 18px; color: var(--kl-muted); }

.kl-chat {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: 62px minmax(0, 1fr) auto;
}

.kl-chat-header {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 16px;
  border-bottom: 1px solid var(--kl-border);
}

.kl-back { display: none; }
.kl-chat-person { min-width: 0; margin-right: auto; }
.kl-chat-name { overflow: hidden; font-size: var(--kl-type-md); font-weight: 850; text-overflow: ellipsis; white-space: nowrap; }
.kl-chat-number { color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-chat-room {
  min-width: 0;
  max-width: min(220px, 31vw);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--kl-gold);
  font-size: var(--kl-type-sm);
}
.kl-chat-room::before { content: "·"; color: var(--kl-meta); }
.kl-chat-room-icon { width: 14px; height: 14px; flex: 0 0 auto; }
.kl-chat-room-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.kl-messages {
  min-height: 0;
  overflow-y: auto;
  padding: 18px;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
  scroll-behavior: auto;
  overscroll-behavior: contain;
  overflow-anchor: none;
  scrollbar-gutter: stable;
  contain: paint;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
}

.kl-message-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0;
}
.kl-message-row[data-group="start"],
.kl-message-row[data-group="middle"] { margin-bottom: 2px; }
.kl-message-row[data-group="middle"],
.kl-message-row[data-group="end"] { margin-top: 2px; }
.kl-message-row[data-direction="outgoing"] { flex-direction: row-reverse; }
.kl-message-bubble {
  position: relative;
  max-width: min(72%, 540px);
  padding: 10px 13px 8px;
  border: 1px solid color-mix(in srgb, var(--kl-border), var(--kl-accent) 9%);
  border-radius: 17px 17px 17px 5px;
  background: color-mix(in srgb, var(--kl-surface-2), var(--kl-surface) 18%);
  overflow: hidden;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.kl-message-bubble[data-media="true"] { width: min(88%, 720px); max-width: 720px; }
.kl-message-bubble::before {
  content: "";
  position: absolute;
  top: 0;
  right: 13px;
  left: 13px;
  height: 1px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, var(--kl-accent), transparent);
  opacity: 0.24;
  pointer-events: none;
}
.kl-message-row[data-direction="outgoing"] .kl-message-bubble {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 28%);
  border-radius: 17px 17px 5px 17px;
  background: color-mix(in srgb, var(--kl-accent), #070708 16%);
  color: var(--kl-accent-foreground);
}
.kl-message-row[data-direction="outgoing"] .kl-message-bubble::before {
  background: linear-gradient(90deg, transparent, var(--kl-gold), transparent);
  opacity: 0.2;
}
.kl-message-row[data-direction="incoming"][data-group="start"] .kl-message-bubble { border-radius: 17px 17px 17px 9px; }
.kl-message-row[data-direction="incoming"][data-group="middle"] .kl-message-bubble { border-radius: 9px 17px 17px 9px; }
.kl-message-row[data-direction="incoming"][data-group="end"] .kl-message-bubble { border-radius: 9px 17px 17px 5px; }
.kl-message-row[data-direction="outgoing"][data-group="start"] .kl-message-bubble { border-radius: 17px 17px 9px 17px; }
.kl-message-row[data-direction="outgoing"][data-group="middle"] .kl-message-bubble { border-radius: 17px 9px 9px 17px; }
.kl-message-row[data-direction="outgoing"][data-group="end"] .kl-message-bubble { border-radius: 17px 9px 5px 17px; }
.kl-message-row:hover .kl-message-bubble { border-color: color-mix(in srgb, var(--kl-border-strong), var(--kl-accent) 18%); }
.kl-message-meta { display: flex; justify-content: flex-end; gap: 7px; margin-top: 6px; color: var(--kl-meta); font-size: var(--kl-type-xxs); font-weight: 650; letter-spacing: 0.015em; }
.kl-message-row[data-direction="outgoing"] .kl-message-meta { color: color-mix(in srgb, var(--kl-accent-foreground), transparent 32%); }
.kl-message-room { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-load-older { display: flex; justify-content: center; padding: 3px 0 11px; overflow-anchor: none; }
.kl-load-older .kl-text-button { min-height: 34px; }

.kl-composer {
  padding: 12px 14px 14px;
  border-top: 1px solid var(--kl-border);
  background: var(--kl-composer-bg);
}

.kl-typing-indicator {
  min-height: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: -4px 2px 6px;
  color: var(--kl-muted);
  font-size: var(--kl-type-sm);
}
.kl-typing-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-typing-dots { display: inline-flex; align-items: center; gap: 3px; }
.kl-typing-dots i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--kl-gold);
  animation: kl-typing-dot 1.15s ease-in-out infinite;
}
.kl-typing-dots i:nth-child(2) { animation-delay: 120ms; }
.kl-typing-dots i:nth-child(3) { animation-delay: 240ms; }
@keyframes kl-typing-dot {
  0%, 60%, 100% { opacity: 0.35; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-2px); }
}

.kl-quick-actions {
  display: flex;
  gap: 7px;
  margin: 0 0 9px;
  overflow-x: auto;
  padding: 1px 1px 4px;
  scrollbar-width: thin;
  scrollbar-color: var(--kl-border-strong) transparent;
}
.kl-action-chip {
  min-height: 36px;
  flex: 0 0 auto;
  padding: 4px 10px;
  border: 1px solid var(--kl-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 8%);
  color: var(--kl-text);
  font-size: var(--kl-type-sm);
  font-weight: 750;
  cursor: pointer;
}
.kl-action-chip:hover { border-color: var(--kl-border-strong); background: var(--kl-surface-hover); }

.kl-composer-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: end; }
.kl-composer-input {
  min-height: 44px;
  max-height: 120px;
  padding: 11px 13px;
  resize: none;
  border-radius: 14px;
}
.kl-send { min-width: 82px; height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
.kl-send .kl-icon { width: 16px; height: 16px; }
.kl-composer-options { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 8px; color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-check { min-height: 32px; display: inline-flex; align-items: center; gap: 7px; cursor: pointer; }
.kl-check input { accent-color: var(--kl-accent); }
.kl-counter[data-over="true"] { color: var(--kl-danger); font-weight: 750; }

.kl-dialog {
  width: min(460px, calc(100vw - 32px));
  max-height: min(760px, calc(100vh - 32px));
  padding: 0;
  overflow: hidden;
  grid-template-rows: auto minmax(0, 1fr) auto;
  border: 1px solid var(--kl-border);
  border-radius: 20px;
  background: var(--kl-panel-art), var(--kl-panel-bg);
  color: var(--kl-text);
  box-shadow: var(--kl-shadow);
}
.kl-dialog[open] { display: grid; }
.kl-dialog::backdrop { background: rgba(0, 0, 0, 0.68); }
.kl-dialog-header { display: flex; align-items: center; gap: 10px; padding: 16px 18px; border-bottom: 1px solid var(--kl-border); background: var(--kl-topbar-bg); }
.kl-dialog-heading { min-width: 0; margin-right: auto; }
.kl-dialog-title { margin-right: auto; font-family: Georgia, "Times New Roman", serif; font-size: var(--kl-type-lg); font-weight: 700; }
.kl-dialog-subtitle { margin-top: 2px; color: var(--kl-muted); font-size: var(--kl-type-xs); letter-spacing: 0.035em; }
.kl-dialog-body { min-height: 0; display: grid; gap: 18px; padding: 18px; overflow: auto; }
.kl-setting-section { display: grid; gap: 14px; }
.kl-setting-section + .kl-setting-section { padding-top: 17px; border-top: 1px solid var(--kl-border); }
.kl-setting-section-title { color: var(--kl-gold); font-size: var(--kl-type-xs); font-weight: 850; letter-spacing: 0.14em; text-transform: uppercase; }
.kl-setting-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.kl-setting-copy { min-width: 0; }
.kl-setting-name { font-weight: 750; }
.kl-setting-help { margin-top: 2px; color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-image-upload-settings-options {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--kl-border);
  border-radius: 13px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 24%);
}
.kl-image-upload-setting-field { min-width: 0; display: grid; gap: 5px; color: var(--kl-muted); font-size: var(--kl-type-xs); font-weight: 750; }
.kl-image-upload-setting-input { width: 100%; min-width: 0; }
.kl-image-upload-privacy { display: flex; align-items: flex-start; gap: 8px; margin: 1px 0 0; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-room-badge-offsets { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 0 0 12px; }
.kl-room-badge-offsets .kl-text-button { grid-column: 1 / -1; justify-self: start; }
.kl-room-badge-advanced[data-disabled="true"] { opacity: 0.52; }
.kl-image-upload-privacy .kl-icon { width: 16px; height: 16px; flex: 0 0 auto; margin-top: 1px; color: var(--kl-gold); }
.kl-inline-link { color: var(--kl-gold); text-underline-offset: 2px; }
.kl-number-input { width: 90px; height: 44px; padding: 0 10px; border-radius: 11px; }
.kl-select { width: 156px; height: 44px; padding: 0 10px; border-radius: 11px; }
.kl-color-control { display: flex; align-items: center; gap: 8px; }
.kl-color-presets { display: flex; align-items: center; gap: 5px; }
.kl-color-swatch {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 2px solid var(--kl-surface);
  border-radius: 50%;
  outline: 1px solid var(--kl-border);
  background: var(--kl-swatch);
  cursor: pointer;
}
.kl-color-swatch:hover { outline-color: var(--kl-border-strong); transform: scale(1.08); }
.kl-color-swatch[data-selected="true"] {
  outline: 2px solid var(--kl-text);
  outline-offset: 2px;
}
.kl-color-input {
  width: 46px;
  height: 44px;
  padding: 3px;
  border: 1px solid var(--kl-border);
  border-radius: 10px;
  background: var(--kl-input-bg);
  cursor: pointer;
}
.kl-switch { width: 48px; height: 44px; position: relative; flex: 0 0 auto; }
.kl-switch input { position: absolute; opacity: 0; pointer-events: none; }
.kl-switch-track { position: absolute; inset: 9px 0; border: 1px solid var(--kl-border); border-radius: 999px; background: var(--kl-surface-hover); cursor: pointer; transition: background 140ms ease; }
.kl-switch-track::after { content: ""; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff8eb; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.24); transition: transform 140ms ease; }
.kl-switch input:checked + .kl-switch-track { background: var(--kl-accent); }
.kl-switch input:checked + .kl-switch-track::after { background: var(--kl-accent-foreground); transform: translateX(22px); }
.kl-dialog-actions { position: relative; z-index: 1; display: flex; flex: 0 0 auto; justify-content: flex-end; gap: 9px; padding: 12px 18px 18px; border-top: 1px solid var(--kl-border); background: var(--kl-panel-bg); }

.kl-action-editor { display: grid; gap: 8px; }
.kl-action-editor-row { display: grid; grid-template-columns: 100px minmax(0, 1fr) 40px; gap: 7px; align-items: center; }
.kl-action-label,
.kl-action-template { width: 100%; height: 40px; min-width: 0; padding: 0 9px; border-radius: 10px; }
.kl-remove-action { width: 40px; height: 40px; color: var(--kl-danger); }
.kl-add-action { justify-self: start; }
.kl-settings-disclosure { overflow: clip; border: 1px solid var(--kl-border); border-radius: 13px; background: color-mix(in srgb, var(--kl-surface-2), transparent 30%); }
.kl-settings-disclosure > summary { min-height: 48px; display: flex; align-items: center; gap: 10px; padding: 9px 12px; color: var(--kl-text); font-weight: 780; cursor: pointer; list-style: none; }
.kl-settings-disclosure > summary::-webkit-details-marker { display: none; }
.kl-settings-disclosure > summary::before { content: ""; width: 8px; height: 8px; flex: 0 0 auto; border-right: 2px solid var(--kl-muted); border-bottom: 2px solid var(--kl-muted); transform: rotate(-45deg); transition: transform 140ms ease; }
.kl-settings-disclosure[open] > summary::before { transform: rotate(45deg); }
.kl-settings-disclosure > summary:hover { background: var(--kl-surface-hover); }
.kl-settings-disclosure > summary:focus-visible { outline: 2px solid color-mix(in srgb, var(--kl-accent), var(--kl-gold) 24%); outline-offset: -2px; }
.kl-disclosure-meta { margin-left: auto; color: var(--kl-meta); font-size: var(--kl-type-xs); font-weight: 650; }
.kl-settings-disclosure > summary .kl-data-tools-count { display: inline; margin: 0 0 0 auto; }
.kl-sound-choices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 0 12px 12px; border-top: 1px solid var(--kl-border); }
.kl-sound-choice { min-width: 0; display: grid; gap: 6px; padding-top: 11px; }
.kl-sound-choice-controls { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; }
.kl-sound-choice .kl-select { width: 100%; min-width: 0; }
.kl-sound-preview { min-width: 58px; padding-inline: 10px; }
.kl-volume-control { min-width: 210px; display: grid; grid-template-columns: minmax(120px, 1fr) 48px; align-items: center; gap: 10px; }
.kl-volume-input { width: 100%; accent-color: var(--kl-accent); cursor: pointer; }
.kl-volume-value { color: var(--kl-gold); font-variant-numeric: tabular-nums; font-weight: 800; text-align: right; }
.kl-custom-sounds-body { display: grid; gap: 10px; padding: 12px; border-top: 1px solid var(--kl-border); }
.kl-custom-sound-list { display: grid; gap: 7px; }
.kl-custom-sound { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 8px; padding: 9px; border: 1px solid var(--kl-border); border-radius: 12px; background: var(--kl-surface-1); }
.kl-custom-sound-copy { min-width: 0; display: grid; gap: 2px; }
.kl-custom-sound-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-custom-sound-copy span,
.kl-custom-sound-empty { color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-reaction-advanced-content { display: grid; gap: 16px; padding: 12px; border-top: 1px solid var(--kl-border); }
.kl-reaction-safety { display: flex; align-items: flex-start; gap: 9px; padding: 11px 12px; border: 1px solid color-mix(in srgb, var(--kl-gold), transparent 68%); border-radius: 12px; background: color-mix(in srgb, var(--kl-gold), transparent 92%); color: var(--kl-muted); font-size: var(--kl-type-sm); line-height: 1.45; }
.kl-reaction-safety-icon { width: 18px; height: 18px; flex: 0 0 auto; margin-top: 1px; color: var(--kl-gold); }
.kl-reaction-rules-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.kl-reaction-rules-heading .kl-data-tools-count { margin-top: 0; }
.kl-reaction-rules-editor { display: grid; gap: 10px; }
.kl-reaction-rule { display: grid; gap: 10px; padding: 11px; border: 1px solid var(--kl-border); border-radius: 13px; background: color-mix(in srgb, var(--kl-surface-2), transparent 24%); }
.kl-reaction-rule-header { min-width: 0; display: grid; grid-template-columns: auto minmax(120px, 1fr) auto; gap: 8px; align-items: center; }
.kl-reaction-rule-enabled { min-height: 40px; display: inline-flex; align-items: center; gap: 6px; padding: 0 9px; border: 1px solid var(--kl-border); border-radius: 10px; background: var(--kl-input-bg); color: var(--kl-muted); font-size: var(--kl-type-sm); font-weight: 750; cursor: pointer; }
.kl-reaction-rule-enabled:has(input:checked) { border-color: color-mix(in srgb, var(--kl-accent), transparent 45%); background: color-mix(in srgb, var(--kl-accent), transparent 88%); color: var(--kl-text); }
.kl-reaction-rule-enabled input { accent-color: var(--kl-accent); }
.kl-reaction-name,
.kl-reaction-input { width: 100%; min-width: 0; height: 40px; padding: 0 9px; border-radius: 10px; }
.kl-reaction-rule-order { display: flex; gap: 4px; }
.kl-reaction-move { width: 36px; height: 40px; font-size: 17px; font-weight: 850; }
.kl-reaction-move--up .kl-icon { transform: rotate(90deg); }
.kl-reaction-move--down .kl-icon { transform: rotate(-90deg); }
.kl-reaction-rule-grid { min-width: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.kl-reaction-field { min-width: 0; display: grid; align-content: start; gap: 4px; }
.kl-reaction-field-label { color: var(--kl-meta); font-size: var(--kl-type-xs); font-weight: 720; }
.kl-reaction-field .kl-select,
.kl-reaction-field .kl-number-input { width: 100%; height: 40px; }
.kl-reaction-field[data-disabled] { opacity: 0.48; }
.kl-reaction-template-field { grid-column: 1 / -1; }
.kl-reaction-template { width: 100%; min-height: 58px; resize: vertical; padding: 8px 9px; border-radius: 10px; line-height: 1.35; }
.kl-reaction-rule-note { color: var(--kl-meta); font-size: var(--kl-type-xs); line-height: 1.4; }
.kl-reaction-rule-note[data-public="true"] { color: color-mix(in srgb, var(--kl-gold), var(--kl-text) 25%); }

.kl-new-chat-dialog { width: min(480px, calc(100vw - 32px)); }
.kl-new-chat-body { gap: 12px; }
.kl-new-chat-query { flex: 0 0 auto; }
.kl-contact-heading { color: var(--kl-gold); font-size: var(--kl-type-xs); font-weight: 850; letter-spacing: 0.14em; text-transform: uppercase; }
.kl-contact-results { min-height: 120px; max-height: min(430px, calc(100vh - 300px)); overflow-y: auto; }
.kl-contact {
  width: 100%;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 11px;
  align-items: center;
  padding: 9px;
  border: 1px solid transparent;
  border-radius: 13px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.kl-contact:hover { border-color: var(--kl-border); background: var(--kl-surface-hover); }
.kl-contact .kl-avatar { width: 42px; height: 42px; border-radius: 13px; }
.kl-contact-copy { min-width: 0; }
.kl-contact-name { overflow: hidden; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.kl-contact-number,
.kl-contact-empty { color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-contact-empty { padding: 18px 8px; text-align: center; }

.kl-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.kl-finder-dialog { width: min(680px, calc(100vw - 32px)); }
.kl-finder-body {
  position: relative;
  min-height: 360px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  padding: 16px;
}
.kl-finder-input-wrap { position: relative; }
.kl-finder-search-icon {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 15px;
  color: var(--kl-gold);
  width: 21px;
  height: 21px;
  pointer-events: none;
  transform: translateY(-50%);
}
.kl-finder-query {
  width: 100%;
  height: 52px;
  padding: 0 42px;
  border: 1px solid var(--kl-border-strong);
  border-radius: 15px;
  background: var(--kl-input-bg);
  color: var(--kl-text);
  font-size: var(--kl-type-body);
  outline: none;
}
.kl-finder-query:focus {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 30%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--kl-accent), transparent 78%);
}
.kl-finder-results {
  min-height: 260px;
  max-height: min(480px, calc(100vh - 240px));
  display: grid;
  align-content: start;
  gap: 4px;
  overflow-y: auto;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-finder-result {
  width: 100%;
  min-width: 0;
  min-height: 64px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 11px;
  align-items: center;
  padding: 9px 10px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.kl-finder-result:hover,
.kl-finder-result[data-selected="true"] {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 25%);
  background: color-mix(in srgb, var(--kl-accent), transparent 87%);
}
.kl-finder-result-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid var(--kl-border);
  border-radius: 13px;
  background: var(--kl-surface-2);
  color: var(--kl-gold);
}
.kl-finder-result-symbol { width: 20px; height: 20px; }
.kl-finder-result-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.kl-finder-result-title {
  overflow: hidden;
  font-weight: 820;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-finder-result-detail {
  overflow: hidden;
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-finder-result-category {
  padding: 3px 7px;
  border: 1px solid var(--kl-border);
  border-radius: 999px;
  color: var(--kl-meta);
  font-size: var(--kl-type-xxs);
  font-weight: 850;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}
.kl-finder-loading,
.kl-finder-empty {
  min-height: 220px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 5px;
  padding: 24px;
  color: var(--kl-muted);
  font-size: var(--kl-type-sm);
  text-align: center;
}
.kl-finder-empty-title { color: var(--kl-text); font-size: var(--kl-type-body); font-weight: 820; }
.kl-finder-footer {
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 16px;
  border-top: 1px solid var(--kl-border);
  background: var(--kl-topbar-bg);
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
}
.kl-finder-keys { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }

.kl-roster-body {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(280px, 0.78fr) minmax(360px, 1.22fr);
  gap: 14px;
  padding: 18px;
  overflow: hidden;
}
.kl-roster-list-pane {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 9px;
}
.kl-roster-scopes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  padding: 4px;
  border: 1px solid var(--kl-border);
  border-radius: 12px;
  background: var(--kl-input-bg);
}
.kl-roster-scope {
  min-height: 40px;
  padding: 4px 7px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
  font-weight: 800;
  cursor: pointer;
}
.kl-roster-scope:hover { color: var(--kl-text); background: var(--kl-surface-hover); }
.kl-roster-scope[data-active="true"] {
  border-color: var(--kl-border-strong);
  background: var(--kl-surface-2);
  color: var(--kl-text);
}
.kl-roster-list {
  min-height: 0;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid var(--kl-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--kl-input-bg), transparent 18%);
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
  overscroll-behavior: contain;
  contain: layout paint;
}
.kl-roster-empty,
.kl-roster-detail-empty {
  display: grid;
  min-height: 160px;
  place-items: center;
  padding: 18px;
  color: var(--kl-muted);
  font-size: var(--kl-type-body);
  text-align: center;
}
.kl-roster-entry {
  width: 100%;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 13px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.kl-roster-entry:hover { background: var(--kl-surface-hover); }
.kl-roster-entry[data-selected="true"] {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 28%);
  background: color-mix(in srgb, var(--kl-accent), transparent 87%);
}
.kl-roster-entry .kl-avatar { width: 42px; height: 42px; border-radius: 13px; }
.kl-roster-entry-copy { min-width: 0; }
.kl-roster-entry-name-row { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 6px; min-width: 0; }
.kl-roster-entry-name { overflow: hidden; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.kl-roster-entry-badges,
.kl-roster-detail-badges { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.kl-roster-entry-badges { flex: 0 1 auto; }
.kl-roster-detail-badges { margin-top: 4px; }
.kl-roster-badge {
  padding: 1px 4px;
  border-radius: 999px;
  font-size: var(--kl-type-xxs);
  font-weight: 900;
  letter-spacing: 0.08em;
}
.kl-roster-live { background: rgba(104, 211, 145, 0.14); color: #68d391; }
.kl-roster-friend { background: color-mix(in srgb, var(--kl-gold), transparent 84%); color: var(--kl-gold); }
.kl-roster-relationship--owner { background: color-mix(in srgb, #c795ff, transparent 82%); color: #d7b4ff; }
.kl-roster-relationship--lover { background: color-mix(in srgb, #ff78ae, transparent 82%); color: #ff9fc4; }
.kl-roster-relationship--whitelist { background: color-mix(in srgb, #69b8ff, transparent 83%); color: #8bc9ff; }
.kl-roster-relationship--blacklist,
.kl-roster-relationship--ghosted { background: color-mix(in srgb, var(--kl-danger), transparent 84%); color: #ff8d98; }
.kl-roster-relationship--ghosted { opacity: 0.82; }
.kl-roster-favorite { width: 13px; height: 13px; color: var(--kl-gold); }
.kl-roster-entry-preview {
  overflow: hidden;
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-roster-entry-time { color: var(--kl-muted); font-size: var(--kl-type-xxs); }
.kl-roster-detail {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 15px;
  border: 1px solid var(--kl-border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--kl-surface), transparent 12%);
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-roster-identity { display: grid; grid-template-columns: 54px minmax(0, 1fr) auto; gap: 12px; align-items: center; }
.kl-roster-avatar { width: 54px; height: 54px; border-radius: 17px; font-size: 17px; }
.kl-roster-identity-copy { min-width: 0; }
.kl-roster-name { overflow: hidden; font-family: Georgia, "Times New Roman", serif; font-size: 19px; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.kl-roster-number { color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-roster-star { color: var(--kl-gold); font-size: 20px; }
.kl-roster-quick-actions { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; margin-top: 15px; }
.kl-roster-quick-actions .kl-text-button { min-width: 0; padding-inline: 7px; font-size: var(--kl-type-sm); }
.kl-roster-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; margin-top: 15px; }
.kl-roster-stat { min-width: 0; padding: 9px 10px; border: 1px solid var(--kl-border); border-radius: 11px; background: var(--kl-surface-2); }
.kl-roster-stat-label { color: var(--kl-muted); font-size: var(--kl-type-xxs); font-weight: 850; letter-spacing: 0.08em; text-transform: uppercase; }
.kl-roster-stat-value { margin-top: 3px; overflow: hidden; font-size: var(--kl-type-sm); font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.kl-roster-notebook { display: grid; gap: 10px; margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--kl-border); }
.kl-roster-field-label { display: grid; gap: 5px; color: var(--kl-gold); font-size: var(--kl-type-xxs); font-weight: 850; letter-spacing: 0.09em; text-transform: uppercase; }
.kl-roster-note,
.kl-roster-tags { width: 100%; min-width: 0; padding: 9px 11px; border-radius: 11px; text-transform: none; }
.kl-roster-tags { height: 38px; }
.kl-roster-note { min-height: 120px; max-height: 230px; resize: vertical; line-height: 1.45; }
.kl-roster-note-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
.kl-roster-note-actions .kl-setting-help { margin-right: auto; }
.kl-roster-privacy { align-self: center; margin-right: auto; color: var(--kl-muted); font-size: var(--kl-type-xs); }

/* Custom Activities: simple library first, focused body-slot editor second. */
.kl-custom-activity-header .kl-text-button { flex: 0 0 auto; }
.kl-custom-activities-body {
  min-width: 0;
  min-height: 0;
  padding: 18px 22px 24px;
  overflow-y: auto;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-custom-activity-empty {
  min-height: 330px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 10px;
  padding: 34px;
  border: 1px dashed var(--kl-border-strong);
  border-radius: 20px;
  background:
    radial-gradient(circle at 50% 28%, color-mix(in srgb, var(--kl-accent), transparent 88%), transparent 38%),
    color-mix(in srgb, var(--kl-surface), transparent 22%);
  text-align: center;
}
.kl-custom-activity-empty h2 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: 22px; }
.kl-custom-activity-empty p { max-width: 430px; margin: 0 0 7px; color: var(--kl-muted); font-size: var(--kl-type-body); }
.kl-custom-empty-blossom {
  width: 72px;
  height: 72px;
  opacity: 0.88;
  filter: drop-shadow(0 10px 24px color-mix(in srgb, var(--kl-accent), transparent 62%));
}
.kl-custom-activity-intro {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 11px;
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
}
.kl-custom-activity-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.kl-custom-activity-card {
  min-width: 0;
  min-height: 100px;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px 10px 10px;
  border: 1px solid var(--kl-border);
  border-radius: 16px;
  background: linear-gradient(145deg, color-mix(in srgb, var(--kl-surface-2), transparent 4%), var(--kl-surface));
  color: var(--kl-text);
  text-align: left;
  cursor: pointer;
  transition: border-color 140ms ease, transform 140ms ease, background 140ms ease;
}
.kl-custom-activity-card:hover {
  border-color: var(--kl-border-strong);
  background: var(--kl-surface-hover);
  transform: translateY(-1px);
}
.kl-custom-activity-card-icon {
  position: relative;
  width: 72px;
  height: 72px;
  overflow: hidden;
  border: 1px solid var(--kl-border);
  border-radius: 14px;
  background: var(--kl-input-bg);
}
.kl-custom-activity-vanilla-icon { width: 100%; height: 100%; display: block; object-fit: cover; }
.kl-custom-activity-blossom {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 19px;
  height: 19px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.75));
}
.kl-custom-activity-card-copy { min-width: 0; }
.kl-custom-activity-card-name { overflow: hidden; font-size: var(--kl-type-md); font-weight: 850; text-overflow: ellipsis; white-space: nowrap; }
.kl-custom-activity-card-meta { margin-top: 2px; color: var(--kl-gold); font-size: var(--kl-type-xs); }
.kl-custom-activity-card-template { margin-top: 6px; overflow: hidden; color: var(--kl-muted); font-size: var(--kl-type-sm); text-overflow: ellipsis; white-space: nowrap; }
.kl-custom-activity-edit-label { color: var(--kl-meta); font-size: var(--kl-type-xs); font-weight: 800; }

.kl-custom-activity-editor {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  grid-row: 2 / -1;
}
.kl-custom-editor-body {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(230px, 0.72fr) minmax(390px, 1.28fr);
  gap: 16px;
  padding: 16px 20px;
  overflow: hidden;
}
.kl-custom-character-pane,
.kl-custom-activity-form {
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--kl-border);
  border-radius: 17px;
  background: color-mix(in srgb, var(--kl-surface), transparent 12%);
}
.kl-custom-character-pane {
  display: grid;
  grid-template-rows: auto auto auto minmax(190px, 1fr) auto;
  align-content: start;
  gap: 7px;
  padding: 14px;
  overflow-y: auto;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-custom-character-stage {
  position: relative;
  min-height: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--kl-border);
  border-radius: 14px;
  background:
    radial-gradient(ellipse at 50% 42%, color-mix(in srgb, var(--kl-gold), transparent 93%), transparent 62%),
    var(--kl-input-bg);
}
.kl-custom-character-canvas {
  width: auto;
  height: min(100%, 390px);
  max-width: 100%;
  display: block;
  cursor: crosshair;
  touch-action: manipulation;
}
.kl-custom-character-canvas:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: -2px; }
.kl-custom-character-fallback {
  position: absolute;
  inset: auto 16px 16px;
  padding: 8px;
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.62);
  color: #eee5d9;
  font-size: var(--kl-type-xs);
  text-align: center;
  pointer-events: none;
}
.kl-custom-slot-select[hidden] { display: none; }
.kl-custom-slot-picker {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--kl-border);
  border-radius: 11px;
  background: var(--kl-surface-2);
}
.kl-custom-slot-picker > summary {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 10px;
  color: var(--kl-text);
  cursor: pointer;
  list-style: none;
}
.kl-custom-slot-picker > summary::-webkit-details-marker { display: none; }
.kl-custom-slot-picker > summary:hover { background: var(--kl-surface-hover); }
.kl-custom-slot-picker[open] > summary { border-bottom: 1px solid var(--kl-border); }
.kl-custom-slot-current {
  min-width: 0;
  overflow: hidden;
  font-size: var(--kl-type-sm);
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-custom-slot-action {
  flex: 0 0 auto;
  color: var(--kl-gold);
  font-size: var(--kl-type-xxs);
  font-weight: 850;
  text-transform: uppercase;
}
.kl-custom-slot-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  max-height: 154px;
  padding: 6px;
  overflow-y: auto;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-custom-slot-choice {
  min-width: 0;
  min-height: 31px;
  padding: 4px 6px;
  overflow: hidden;
  border: 1px solid var(--kl-border);
  border-radius: 9px;
  background: var(--kl-surface-2);
  color: var(--kl-muted);
  font-size: var(--kl-type-xxs);
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
.kl-custom-slot-choice:hover { border-color: var(--kl-border-strong); color: var(--kl-text); }
.kl-custom-slot-choice[data-selected="true"] {
  border-color: var(--kl-accent);
  background: color-mix(in srgb, var(--kl-accent), transparent 84%);
  color: var(--kl-text);
  box-shadow: inset 0 -2px var(--kl-accent);
}
.kl-custom-slot-choice:focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 1px; }
.kl-custom-slot-note { color: var(--kl-meta); font-size: var(--kl-type-xxs); text-align: center; }
.kl-custom-activity-form {
  display: grid;
  align-content: start;
  gap: 15px;
  padding: 16px;
  overflow-y: auto;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-custom-field { min-width: 0; display: grid; gap: 6px; }
.kl-custom-field-label { color: var(--kl-text); font-size: var(--kl-type-sm); font-weight: 850; }
.kl-custom-field-help { color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-custom-activity-name,
.kl-custom-image-search { width: 100%; }
.kl-custom-activity-template {
  width: 100%;
  min-height: 86px;
  padding: 10px 12px;
  border: 1px solid var(--kl-border);
  border-radius: 12px;
  background: var(--kl-input-bg);
  color: var(--kl-text);
  resize: vertical;
  line-height: 1.45;
}
.kl-custom-activity-template:focus { border-color: var(--kl-accent); outline: 0; box-shadow: 0 0 0 3px color-mix(in srgb, var(--kl-accent), transparent 80%); }
.kl-custom-token-row { display: flex; flex-wrap: wrap; gap: 6px; }
.kl-custom-token {
  min-height: 28px;
  padding: 4px 9px;
  border: 1px solid var(--kl-border);
  border-radius: 999px;
  background: var(--kl-surface-2);
  color: var(--kl-gold);
  font-size: var(--kl-type-xs);
  font-weight: 800;
  cursor: pointer;
}
.kl-custom-token:hover { border-color: var(--kl-border-strong); background: var(--kl-surface-hover); }
.kl-custom-preview-wrap { display: grid; gap: 6px; }
.kl-custom-activity-live-preview {
  min-height: 46px;
  padding: 11px 13px;
  border: 1px solid color-mix(in srgb, var(--kl-accent), var(--kl-border) 60%);
  border-radius: 12px;
  background: color-mix(in srgb, var(--kl-accent), transparent 91%);
  overflow-wrap: anywhere;
  color: var(--kl-text);
  font-style: italic;
}
.kl-custom-image-gallery {
  max-height: 210px;
  display: grid;
  grid-template-columns: repeat(4, minmax(74px, 1fr));
  gap: 7px;
  padding: 5px;
  overflow-y: auto;
  border: 1px solid var(--kl-border);
  border-radius: 13px;
  background: var(--kl-input-bg);
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-custom-image-choice {
  min-width: 0;
  padding: 5px;
  display: grid;
  gap: 4px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--kl-muted);
  font-size: var(--kl-type-xxs);
  cursor: pointer;
}
.kl-custom-image-choice[hidden] { display: none; }
.kl-custom-image-choice:hover { background: var(--kl-surface-hover); color: var(--kl-text); }
.kl-custom-image-choice[data-selected="true"] {
  border-color: var(--kl-accent);
  background: color-mix(in srgb, var(--kl-accent), transparent 86%);
  color: var(--kl-text);
}
.kl-custom-image-choice img { width: 100%; aspect-ratio: 1; display: block; border-radius: 7px; object-fit: cover; }
.kl-custom-image-choice span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-custom-arousal-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 14px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--kl-border);
  border-radius: 13px;
  background: var(--kl-surface-2);
}
.kl-custom-arousal-copy { min-width: 0; display: grid; gap: 3px; }
.kl-custom-arousal-options { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(0, 1fr) 42px; gap: 10px; align-items: center; }
.kl-custom-arousal-range { width: 100%; accent-color: var(--kl-accent); }
.kl-custom-arousal-value { color: var(--kl-gold); font-size: var(--kl-type-sm); font-weight: 850; text-align: right; }
.kl-custom-activity-advanced {
  padding: 0 12px;
  border: 1px solid var(--kl-border);
  border-radius: 13px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 20%);
}
.kl-custom-activity-advanced summary { padding: 11px 0; color: var(--kl-muted); font-size: var(--kl-type-sm); font-weight: 800; cursor: pointer; }
.kl-custom-activity-advanced[open] { padding-bottom: 12px; }
.kl-custom-target-mode { width: 100%; }
.kl-custom-activity-footer { min-height: 62px; }
.kl-custom-editor-spacer { margin-right: auto; }

@media (max-width: 720px) {
  .kl-custom-activity-list { grid-template-columns: minmax(0, 1fr); }
  .kl-custom-activity-intro span:last-child { display: none; }
  .kl-custom-editor-body {
    display: block;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    -webkit-overflow-scrolling: touch;
  }
  .kl-custom-character-pane {
    grid-template-rows: auto auto auto 380px auto;
    margin-bottom: 12px;
    overflow: visible;
  }
  .kl-custom-slot-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    max-height: 206px;
  }
  .kl-custom-slot-choice { min-height: 44px; padding-inline: 8px; font-size: var(--kl-type-xs); }
  .kl-custom-activity-form { overflow: visible; }
  .kl-custom-image-gallery {
    max-height: none;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
  }
  .kl-custom-image-choice { flex: 0 0 88px; scroll-snap-align: start; }
  .kl-custom-activity-footer { gap: 6px; }
  .kl-custom-activity-footer .kl-text-button {
    min-width: 0;
    flex: 1 1 0;
    padding-inline: 8px;
  }
  .kl-custom-editor-spacer { display: none; }
}

@media (max-width: 420px) {
  .kl-custom-activity-header { align-items: flex-start; }
  .kl-custom-activity-header .kl-feature-page-subtitle { display: none; }
  .kl-custom-activities-body { padding: 12px; }
  .kl-custom-activity-card { grid-template-columns: 62px minmax(0, 1fr); }
  .kl-custom-activity-card-icon { width: 62px; height: 62px; }
  .kl-custom-activity-edit-label { display: none; }
  .kl-custom-editor-body { padding: 10px; }
  .kl-custom-character-pane { grid-template-rows: auto auto auto 360px auto; padding: 12px; }
}

.kl-toast {
  position: absolute;
  z-index: 3;
  right: 16px;
  bottom: 16px;
  max-width: 320px;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 8px 13px;
  border: 1px solid var(--kl-border-strong);
  border-radius: 12px;
  background: var(--kl-surface-hover);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.28);
  font-size: var(--kl-type-body);
  animation: kl-enter 140ms ease-out;
}
.kl-toast[data-kind="error"] { border-color: color-mix(in srgb, var(--kl-danger), transparent 44%); color: var(--kl-danger); }
.kl-toast.kl-toast--floating {
  position: fixed;
  z-index: 2147483001;
  bottom: max(90px, calc(env(safe-area-inset-bottom) + 78px));
}
.kl-toast--floating[data-side="right"] { right: max(20px, env(safe-area-inset-right)); }
.kl-toast--floating[data-side="left"] { right: auto; left: max(20px, env(safe-area-inset-left)); }
.kl-toast-message { min-width: 0; overflow-wrap: anywhere; }
.kl-toast-dismiss {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.kl-toast-dismiss:hover { background: color-mix(in srgb, var(--kl-surface-2), transparent 8%); }

button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--kl-accent), var(--kl-gold) 28%);
  outline-offset: 2px;
}
.kl-switch input:focus-visible + .kl-switch-track {
  outline: 2px solid color-mix(in srgb, var(--kl-accent), var(--kl-gold) 28%);
  outline-offset: 2px;
}

@media (max-width: 720px) {
  .kl-panel,
  .kl-panel[data-side="left"] {
    inset:
      max(8px, env(safe-area-inset-top))
      max(8px, env(safe-area-inset-right))
      max(8px, env(safe-area-inset-bottom))
      max(8px, env(safe-area-inset-left));
    width: auto;
    height: auto;
    min-height: 0;
    border-radius: 20px;
  }
  .kl-brand { cursor: default; touch-action: auto; }

  .kl-shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) 64px;
  }
  .kl-workspace { grid-row: 1; }
  .kl-feature-nav {
    grid-row: 2;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 4px;
    padding: 5px 7px calc(5px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--kl-border);
    border-right: 0;
    background: var(--kl-composer-bg);
  }
  .kl-nav-item {
    min-width: 0;
    min-height: 51px;
    gap: 2px;
    padding: 4px 2px;
    border-radius: 12px;
  }
  .kl-nav-item[data-target="settings"] { display: none; }
  .kl-nav-item[data-active="true"] { box-shadow: inset 0 -3px var(--kl-accent); }
  .kl-nav-icon { font-size: 18px; }
  .kl-nav-label { font-size: var(--kl-type-xs); }
  .kl-roster-count { top: 1px; right: calc(50% - 25px); }
  .kl-home { padding: 18px; }
  .kl-home-hero {
    min-height: 0;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    padding: 21px;
    border-radius: 19px;
  }
  .kl-home-mark { left: auto; right: 24px; bottom: auto; top: 18px; width: 110px; height: 110px; }
  .kl-home-emblem { inset: 11px; border-radius: 28px; }
  .kl-home-title { font-size: clamp(23px, 7vw, 31px); }
  .kl-home-section-heading { align-items: flex-start; flex-direction: column; gap: 2px; }
  .kl-home-section-heading p { text-align: left; }
  .kl-feature-card { min-height: 142px; padding: 15px; }
  .kl-layout { grid-template-columns: minmax(0, 1fr); }
  .kl-sidebar { width: auto; border-right: 0; }
  .kl-panel[data-mobile-view="list"] .kl-main { display: none; }
  .kl-panel[data-mobile-view="chat"] .kl-sidebar { display: none; }
  .kl-panel[data-mobile-view="chat"] .kl-main { display: grid; }
  .kl-back { display: grid; }
  .kl-icon-button { width: 44px; height: 44px; }
  .kl-text-button { min-height: 44px; }
  .kl-sidebar-new-chat { width: 44px; height: 44px; }
  .kl-sidebar-gallery { width: auto; }
  .kl-action-chip { min-height: 40px; }
  .kl-search-wrap { padding: 12px; }
  .kl-conversation { grid-template-columns: 44px minmax(0, 1fr) auto; gap: 10px; padding: 10px; }
  .kl-brand-subtitle { display: none; }
  .kl-topbar { padding-left: 12px; }
  .kl-finder-trigger { width: 44px; min-height: 44px; justify-content: center; padding: 0; }
  .kl-finder-trigger-label,
  .kl-finder-shortcut { display: none; }
  .kl-topbar-settings { display: grid; }
  .kl-topbar .kl-icon-button { width: 44px; height: 44px; }
  .kl-chat-header { padding: 0 12px; }
  .kl-messages { padding: 14px 12px; }
  .kl-message-bubble { max-width: 88%; }
  .kl-composer { padding: 10px 10px calc(10px + env(safe-area-inset-bottom)); }
  .kl-composer-row { grid-template-columns: minmax(0, 1fr) 48px; }
  .kl-send { min-width: 48px; width: 48px; }
  .kl-send-label { display: none; }
  .kl-setting-row { gap: 14px; }
  .kl-setting-help { max-width: 230px; }
  .kl-image-upload-settings-options { grid-template-columns: minmax(0, 1fr); }
  .kl-image-upload-privacy { grid-column: 1; }
  .kl-action-editor-row { grid-template-columns: 82px minmax(0, 1fr) 40px; }
  .kl-reaction-rule-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kl-reaction-template-field { grid-column: 1 / -1; }
  .kl-sound-choices { grid-template-columns: minmax(0, 1fr); }
  .kl-feature-page-header { padding: 14px 16px 13px; }
  .kl-feature-page-footer { min-height: 60px; padding: 8px 12px; }
  .kl-room-grid { grid-template-columns: minmax(0, 1fr); padding: 12px; }
  .kl-gallery-grid { grid-template-columns: minmax(0, 1fr); padding: 12px; }
  .kl-gallery-header-actions { width: 100%; }
  .kl-gallery-header-actions .kl-text-button { flex: 1 1 auto; }
  .kl-room-player { grid-template-columns: 40px minmax(0, 1fr); }
  .kl-room-player-actions { grid-column: 1 / -1; justify-content: flex-start; }
  .kl-roster-body {
    min-height: 0;
    grid-template-columns: minmax(0, 1fr);
    padding: 12px;
    overflow-y: auto;
  }
  .kl-roster-list-pane { min-height: 270px; }
  .kl-roster-list { max-height: 235px; }
  .kl-roster-detail { overflow: visible; }
  .kl-roster-privacy { display: none; }
  .kl-settings-layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }
  .kl-settings-tabs {
    flex-direction: row;
    gap: 5px;
    padding: 7px 9px;
    overflow-x: auto;
    overflow-y: hidden;
    border-right: 0;
    border-bottom: 1px solid var(--kl-border);
    scrollbar-width: thin;
  }
  .kl-settings-tab {
    width: auto;
    min-height: 44px;
    flex: 0 0 auto;
    padding-inline: 11px;
  }
  .kl-settings-tab[data-active="true"] { box-shadow: inset 0 -3px var(--kl-accent); }
  .kl-settings-panel { padding: 18px 18px 28px; }
  .kl-about-facts { grid-template-columns: minmax(0, 1fr); }
  .kl-about-watermark { right: -20%; width: 90%; }
  .kl-settings-actions { min-height: 60px; padding: 8px 12px; }
  .kl-toast { right: 12px; bottom: 76px; max-width: calc(100% - 24px); }
  .kl-finder-dialog {
    width: calc(100vw - 16px);
    max-height: calc(100vh - 16px);
    border-radius: 17px;
  }
  .kl-finder-body { min-height: 300px; padding: 12px; }
  .kl-finder-results { min-height: 210px; max-height: calc(100vh - 230px); }
  .kl-finder-footer { padding-inline: 12px; }
}

@media (max-width: 420px) {
  .kl-brand-title { font-size: 14px; }
  .kl-brand-emblem { width: 34px; height: 34px; }
  .kl-topbar { gap: 7px; padding-right: 10px; }
  .kl-topbar-context { display: none; }
  .kl-icon-button { width: 44px; height: 44px; }
  .kl-home { padding: 12px; }
  .kl-home-hero { min-height: 0; grid-template-columns: minmax(0, 1fr); margin-bottom: 10px; padding: 18px; }
  .kl-home-mark { display: none; }
  .kl-home-next { grid-template-columns: 42px minmax(0, 1fr); gap: 11px; padding: 14px; }
  .kl-home-next-icon { width: 42px; height: 42px; border-radius: 13px; font-size: 19px; }
  .kl-home-next-footer { align-items: stretch; flex-direction: column; }
  .kl-home-next-button { width: 100%; }
  .kl-home-lead { font-size: var(--kl-type-sm); }
  .kl-home-statuses { margin-top: 13px; }
  .kl-home-status { max-width: 100%; }
  .kl-home-status-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .kl-feature-grid { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .kl-feature-card { min-height: 126px; grid-template-columns: 42px minmax(0, 1fr); padding: 13px; }
  .kl-feature-card-icon { width: 42px; height: 42px; border-radius: 13px; font-size: 19px; }
  .kl-feature-card-title { font-size: var(--kl-type-lg); }
  .kl-home-privacy { padding-bottom: 8px; }
  .kl-color-control { align-items: flex-end; flex-direction: column; }
  .kl-conversation-side { max-width: 44px; }
  .kl-setting-row { align-items: flex-start; }
  .kl-setting-action-row { align-items: flex-start; flex-direction: column; }
  .kl-inline-actions { width: 100%; justify-content: flex-start; }
  .kl-select { width: 136px; }
  .kl-action-editor-row { grid-template-columns: 72px minmax(0, 1fr) 40px; }
  .kl-reaction-rule-header { grid-template-columns: auto minmax(0, 1fr); }
  .kl-reaction-rule-order { grid-column: 1 / -1; justify-content: flex-end; }
  .kl-reaction-rule-grid { grid-template-columns: minmax(0, 1fr); }
  .kl-reaction-template-field { grid-column: auto; }
  .kl-sound-choice-controls { grid-template-columns: minmax(0, 1fr) 64px; }
  .kl-settings-local-note { display: none; }
  .kl-settings-panel { padding-inline: 12px; }
  .kl-settings-panel-description { margin-bottom: 16px; }
  .kl-settings-panel-body { gap: 14px; }
  .kl-data-tools { align-items: stretch; flex-direction: column; gap: 10px; }
  .kl-data-tools-actions { width: 100%; }
  .kl-data-tools-actions .kl-text-button { min-width: 0; flex: 1; }
  .kl-feature-page-subtitle { max-width: 260px; }
  .kl-roster-quick-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kl-roster-stats { grid-template-columns: minmax(0, 1fr); }
  .kl-roster-stat-value { white-space: normal; }
  .kl-finder-dialog .kl-dialog-header { padding-inline: 14px; }
  .kl-finder-query { height: 48px; padding-inline: 40px 12px; }
  .kl-finder-result { grid-template-columns: 38px minmax(0, 1fr) auto; gap: 9px; padding: 8px; }
  .kl-finder-result-icon { width: 38px; height: 38px; border-radius: 12px; }
  .kl-finder-result-category { max-width: 82px; overflow: hidden; text-overflow: ellipsis; }
  .kl-finder-footer > span:first-child { display: none; }
  .kl-finder-footer { justify-content: center; }
}

@media (max-width: 720px) {
  :host([data-density="super-compact"]) .kl-panel,
  :host([data-density="super-compact"]) .kl-panel[data-side="left"] {
    inset:
      max(8px, env(safe-area-inset-top))
      max(8px, env(safe-area-inset-right))
      max(8px, env(safe-area-inset-bottom))
      max(8px, env(safe-area-inset-left));
    width: auto;
    height: auto;
    min-height: 0;
  }
  :host([data-density="super-compact"]) .kl-shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) 60px;
  }
  :host([data-density="super-compact"]) .kl-layout { grid-template-columns: minmax(0, 1fr); }
  :host([data-density="super-compact"]) .kl-settings-layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }
  :host([data-density="super-compact"]) .kl-home { padding: 9px; }
  :host([data-density="super-compact"]) .kl-home-hero { min-height: 0; gap: 10px; margin-bottom: 7px; padding: 12px; border-radius: 14px; }
  :host([data-density="super-compact"]) .kl-home-next { padding: 9px; }
  :host([data-density="super-compact"]) .kl-home-next-description { display: none; }
  :host([data-density="super-compact"]) .kl-feature-grid { gap: 6px; }
  :host([data-density="super-compact"]) .kl-feature-card { min-height: 76px; padding: 9px; border-radius: 12px; }
  :host([data-density="super-compact"]) .kl-feature-page-header { padding: 9px 12px; }
  :host([data-density="super-compact"]) .kl-settings-panel { padding: 12px 12px 20px; }
  :host([data-density="super-compact"]) .kl-settings-panel-body { gap: 10px; }
  :host([data-density="super-compact"]) .kl-settings-tab { min-height: 44px; }
  :host([data-density="super-compact"]) .kl-roster-body { padding: 9px; }
  :host([data-density="super-compact"]) .kl-icon-button { width: 44px; height: 44px; }
  :host([data-density="super-compact"]) .kl-text-button { min-height: 44px; }
  :host([data-density="super-compact"]) .kl-search,
  :host([data-density="super-compact"]) .kl-select,
  :host([data-density="super-compact"]) .kl-number-input,
  :host([data-density="super-compact"]) .kl-color-input { height: 44px; }
}

/* KikiLink presence, media, and contextual chat tools */
.kl-presence-dot {
  width: 9px;
  height: 9px;
  flex: 0 0 auto;
  display: inline-block;
  border: 2px solid var(--kl-panel-bg);
  border-radius: 999px;
  background: #6e6a66;
  box-shadow: 0 0 0 1px color-mix(in srgb, currentColor, transparent 62%);
}
.kl-presence-dot[data-status="online"] { background: #39c884; color: #39c884; }
.kl-presence-dot[data-status="idle"] { background: #e6ad45; color: #e6ad45; }
.kl-presence-dot[data-status="dnd"] { background: #e55365; color: #e55365; }
.kl-presence-dot[data-status="offline"],
.kl-presence-dot[data-status="unknown"] { background: #77716c; color: #77716c; }
.kl-avatar-wrap { position: relative; width: fit-content; flex: 0 0 auto; }
.kl-avatar-wrap > .kl-presence-dot {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 13px;
  height: 13px;
  border-width: 3px;
}
.kl-presence-trigger {
  min-width: 0;
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  border: 1px solid var(--kl-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 18%);
  color: var(--kl-muted);
  font-size: var(--kl-type-sm);
  font-weight: 760;
  cursor: pointer;
}
.kl-presence-trigger:hover { border-color: var(--kl-border-strong); color: var(--kl-text); }
.kl-home-presence {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.kl-presence-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.kl-presence-option {
  min-width: 0;
  min-height: 72px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 11px;
  border: 1px solid var(--kl-border);
  border-radius: 14px;
  background: var(--kl-surface);
  color: var(--kl-text);
  text-align: left;
  cursor: pointer;
}
.kl-presence-option:hover { border-color: var(--kl-border-strong); background: var(--kl-surface-2); }
.kl-presence-option[data-active="true"] {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 24%);
  background: color-mix(in srgb, var(--kl-accent), transparent 90%);
}
.kl-presence-option > .kl-presence-dot { width: 13px; height: 13px; border: 0; }
.kl-presence-option-copy { min-width: 0; display: grid; gap: 2px; }
.kl-presence-option-title { font-weight: 820; }
.kl-presence-option-help { color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-presence-option-check { opacity: 0; color: var(--kl-gold); font-weight: 900; }
.kl-presence-option[data-active="true"] .kl-presence-option-check { opacity: 1; }
.kl-presence-field { display: grid; gap: 7px; }
.kl-presence-field-label { font-size: var(--kl-type-sm); font-weight: 800; }
.kl-presence-message { width: 100%; }
.kl-profile-avatar-field { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 12px; align-items: center; }
.kl-profile-avatar-preview { width: 64px; height: 64px; border-radius: 20px; font-size: 20px; }
.kl-presence-avatar-url { width: 100%; }
.kl-afk-reply-options { display: grid; gap: 6px; padding: 12px; border: 1px solid var(--kl-border); border-radius: 13px; background: var(--kl-surface-2); }
.kl-afk-reply-options[data-disabled="true"] { opacity: 0.56; }
.kl-afk-reply-message { min-height: 72px; }
.kl-presence-caveat {
  display: flex;
  gap: 9px;
  padding: 10px 11px;
  border: 1px solid var(--kl-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--kl-gold), transparent 94%);
  color: var(--kl-muted);
  font-size: var(--kl-type-xs);
}
.kl-chat-subline { min-width: 0; display: flex; align-items: center; gap: 9px; }
.kl-chat-presence,
.kl-roster-detail-presence {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--kl-muted);
  font-size: var(--kl-type-sm);
}
.kl-chat-presence::before { content: "·"; color: var(--kl-meta); }
.kl-presence-note { min-width: 0; overflow: hidden; color: var(--kl-muted); text-overflow: ellipsis; white-space: nowrap; }
.kl-roster-detail-presence { margin-top: 3px; }
.kl-roster-presence-label {
  padding: 1px 4px;
  background: color-mix(in srgb, #77716c, transparent 84%);
  color: var(--kl-muted);
}
.kl-roster-presence-label[data-status="online"] { background: color-mix(in srgb, #39c884, transparent 84%); color: #58d99a; }
.kl-roster-presence-label[data-status="idle"] { background: color-mix(in srgb, #e6ad45, transparent 84%); color: #efbf67; }
.kl-roster-presence-label[data-status="dnd"] { background: color-mix(in srgb, #e55365, transparent 84%); color: #ff8795; }
.kl-roster-presence-label[data-status="offline"] { opacity: 0.72; }
.kl-profile-more { font-size: 11px; letter-spacing: -1px; }
.kl-profile-menu-target { -webkit-touch-callout: none; }
.kl-profile-menu {
  position: fixed;
  z-index: 2147483100;
  width: min(300px, calc(100vw - 16px));
  max-height: min(560px, calc(100vh - 16px));
  overflow: auto;
  padding: 7px;
  border: 1px solid var(--kl-border-strong);
  border-radius: 17px;
  background: var(--kl-panel-art), var(--kl-panel-bg);
  color: var(--kl-text);
  box-shadow: 0 20px 58px rgba(0, 0, 0, 0.58);
}
.kl-profile-menu-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 11px;
  align-items: center;
  padding: 9px 9px 11px;
  border-bottom: 1px solid var(--kl-border);
}
.kl-profile-menu-header .kl-avatar { width: 40px; height: 40px; border-radius: 13px; }
.kl-profile-menu-identity { min-width: 0; display: grid; gap: 2px; }
.kl-profile-menu-identity > strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-profile-menu-identity > span { display: flex; align-items: center; gap: 5px; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-profile-native-name { overflow: hidden; color: var(--kl-muted); font-size: var(--kl-type-xxs); text-overflow: ellipsis; white-space: nowrap; }
.kl-profile-menu-group { display: grid; gap: 2px; padding: 6px 0; }
.kl-profile-menu-group + .kl-profile-menu-group { border-top: 1px solid var(--kl-border); }
.kl-profile-menu-action {
  width: 100%;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  padding: 7px 8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--kl-text);
  text-align: left;
  cursor: pointer;
}
.kl-profile-menu-action:hover { background: var(--kl-surface-2); }
.kl-profile-menu-action:disabled { opacity: 0.42; cursor: not-allowed; }
.kl-profile-menu-icon { display: grid; place-items: center; color: var(--kl-gold); }
.kl-profile-action-icon { width: 17px; height: 17px; }
.kl-profile-menu-group--danger .kl-profile-menu-action,
.kl-profile-menu-group--danger .kl-profile-menu-icon { color: var(--kl-danger); }
.kl-profile-menu-copy { min-width: 0; display: grid; gap: 1px; }
.kl-profile-menu-label { font-size: var(--kl-type-body); font-weight: 780; }
.kl-profile-menu-help { overflow: hidden; color: var(--kl-muted); font-size: var(--kl-type-xxs); text-overflow: ellipsis; white-space: nowrap; }
.kl-composer-row { grid-template-columns: auto minmax(0, 1fr) auto; }
.kl-attach-image { width: 44px; height: 44px; border-radius: 13px; color: var(--kl-gold); }
.kl-image-source-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; padding: 4px; border: 1px solid var(--kl-border); border-radius: 13px; background: var(--kl-surface); }
.kl-image-source-tab { min-height: 38px; padding: 7px 10px; border: 0; border-radius: 9px; background: transparent; color: var(--kl-muted); font: inherit; font-weight: 750; cursor: pointer; }
.kl-image-source-tab[data-active="true"] { background: var(--kl-surface-2); color: var(--kl-text); box-shadow: inset 0 -2px var(--kl-accent); }
.kl-image-source-panel { display: grid; gap: 14px; }
.kl-image-compose-preview {
  min-height: 62px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px;
  border: 1px dashed var(--kl-border-strong);
  border-radius: 13px;
  background: var(--kl-surface);
  color: var(--kl-muted);
}
.kl-image-compose-preview[data-state="ready"] { border-style: solid; border-color: color-mix(in srgb, #39c884, transparent 36%); }
.kl-image-compose-preview[data-state="error"] { border-style: solid; border-color: color-mix(in srgb, var(--kl-danger), transparent 38%); color: var(--kl-danger); }
.kl-image-compose-preview[data-state="loading"] { border-style: solid; border-color: color-mix(in srgb, var(--kl-gold), transparent 42%); }
.kl-image-compose-icon { width: 30px; height: 30px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 9px; background: var(--kl-surface-2); font-weight: 900; }
.kl-image-compose-preview > span:last-child { min-width: 0; display: grid; gap: 2px; }
.kl-image-compose-preview small { overflow: hidden; color: var(--kl-muted); text-overflow: ellipsis; white-space: nowrap; }
.kl-image-upload-note { margin: -4px 0 0; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-image-file-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.kl-image-file-privacy { display: flex; align-items: flex-start; gap: 7px; }
.kl-image-file-privacy .kl-icon { width: 16px; height: 16px; flex: 0 0 auto; margin-top: 1px; color: var(--kl-gold); }
.kl-local-image-thumbnail { width: 54px; height: 54px; flex: 0 0 auto; object-fit: cover; border-radius: 10px; background: #09090a; }
.kl-message-content { line-height: 1.48; white-space: pre-wrap; }
.kl-message-link { color: #efc56c; text-decoration: underline; text-decoration-color: color-mix(in srgb, currentColor, transparent 48%); text-underline-offset: 2px; }
.kl-message-row[data-direction="outgoing"] .kl-message-link { color: var(--kl-accent-foreground); }
.kl-message-media { display: grid; gap: 7px; margin-top: 8px; }
.kl-message-content[data-media-only="true"] .kl-message-media { margin-top: 0; }
.kl-image-card { width: 100%; min-width: 0; max-width: 720px; margin: 0; overflow: hidden; border: 1px solid color-mix(in srgb, var(--kl-border-strong), transparent 12%); border-radius: 12px; background: var(--kl-surface); color: var(--kl-text); }
.kl-image-preview { min-height: 190px; display: grid; place-items: center; align-content: center; gap: 5px; overflow: hidden; padding: 14px; background: #09090a; color: #d8cec0; text-align: center; }
.kl-image-preview[data-state="loading"] { background: linear-gradient(110deg, #101012 30%, #202024 46%, #101012 62%); background-size: 240% 100%; animation: kl-image-loading 1.4s linear infinite; }
.kl-image-preview[data-state="loaded"] { min-height: 0; display: block; padding: 0; background: #09090a; }
.kl-image-preview img { display: block; width: 100%; height: auto; max-height: none; object-fit: contain; border-radius: 0; }
.kl-image-placeholder-icon { width: 25px; height: 25px; color: var(--kl-gold); }
.kl-image-placeholder-title { font-weight: 800; }
.kl-image-placeholder-help { max-width: 230px; color: #9f978d; font-size: var(--kl-type-xs); }
.kl-image-load { margin-top: 6px; }
.kl-image-caption { display: flex; align-items: center; justify-content: space-between; gap: 9px; padding: 7px 9px; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-image-host { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-image-open { flex: 0 0 auto; color: var(--kl-gold); text-decoration: none; }
.kl-gallery-grid {
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  align-content: start;
  gap: 14px;
  padding: 18px;
  overflow: auto;
}
.kl-gallery-header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.kl-gallery-item { min-width: 0; display: grid; align-content: start; gap: 8px; padding: 10px; border: 1px solid var(--kl-border); border-radius: 16px; background: var(--kl-surface-1); }
.kl-gallery-item .kl-image-card { max-width: none; }
.kl-gallery-meta { min-width: 0; display: flex; justify-content: space-between; gap: 10px; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-gallery-meta strong { color: var(--kl-gold); text-transform: capitalize; }
.kl-gallery-meta span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-gallery-actions { display: flex; flex-wrap: wrap; gap: 7px; }
.kl-gallery-remove { margin-left: auto; }
.kl-gallery-empty { grid-column: 1 / -1; place-self: center; display: grid; justify-items: center; gap: 12px; padding: 32px; color: var(--kl-muted); text-align: center; }

.kl-about-card {
  position: relative;
  isolation: isolate;
  min-height: 390px;
  display: grid;
  align-content: start;
  gap: 22px;
  padding: clamp(20px, 4vw, 34px);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--kl-gold), transparent 55%);
  border-radius: 24px;
  background:
    radial-gradient(circle at 92% 10%, color-mix(in srgb, var(--kl-accent), transparent 82%), transparent 35%),
    linear-gradient(145deg, color-mix(in srgb, var(--kl-surface-2), transparent 8%), var(--kl-surface));
}
.kl-about-watermark {
  position: absolute;
  z-index: -1;
  right: -7%;
  bottom: -19%;
  width: min(430px, 68%);
  opacity: 0.075;
  filter: saturate(0.85);
  pointer-events: none;
  user-select: none;
}
.kl-about-brand { display: flex; align-items: center; gap: 16px; }
.kl-about-emblem { width: 66px; height: 66px; flex: 0 0 auto; }
.kl-about-name {
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(25px, 4vw, 34px);
  font-weight: 750;
  letter-spacing: 0.01em;
}
.kl-about-tagline { margin-top: 2px; color: var(--kl-muted); font-size: var(--kl-type-body); }
.kl-about-creator { display: grid; justify-items: start; gap: 2px; }
.kl-about-label { color: var(--kl-gold); font-size: var(--kl-type-xxs); font-weight: 900; letter-spacing: 0.16em; }
.kl-about-creator strong { font-family: Georgia, "Times New Roman", serif; font-size: var(--kl-type-xl); }
.kl-about-creator-number { color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-about-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; margin: 0; }
.kl-about-fact { min-width: 0; padding: 11px 12px; border: 1px solid var(--kl-border); border-radius: 13px; background: color-mix(in srgb, var(--kl-surface), transparent 14%); }
.kl-about-fact dt { color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-about-fact dd { margin: 2px 0 0; overflow-wrap: anywhere; color: var(--kl-text); font-size: var(--kl-type-sm); font-weight: 800; }
.kl-about-links { display: flex; flex-wrap: wrap; gap: 9px; }
.kl-about-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 12px;
  border: 1px solid var(--kl-border-strong);
  border-radius: 999px;
  background: var(--kl-surface-2);
  color: var(--kl-text);
  font-size: var(--kl-type-sm);
  font-weight: 800;
  text-decoration: none;
}
.kl-about-link:hover { border-color: var(--kl-gold); background: var(--kl-surface-hover); }
.kl-about-link--discord { border-color: color-mix(in srgb, #7289da, var(--kl-border) 42%); }
.kl-about-link-icon { width: 14px; height: 14px; color: var(--kl-gold); }
.kl-about-note { max-width: 620px; margin: 0; color: var(--kl-muted); font-size: var(--kl-type-xs); line-height: 1.55; }
.kl-room-page { grid-template-rows: auto auto minmax(0, 1fr); }
.kl-room-admin-status { padding: 10px 20px; border-bottom: 1px solid var(--kl-border); color: var(--kl-muted); font-size: var(--kl-type-sm); }
.kl-room-admin-status[data-state="admin"] { color: #68d391; }
.kl-room-admin-status[data-state="readonly"] { color: var(--kl-gold); }
.kl-room-grid { min-height: 0; display: grid; grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr); gap: 16px; padding: 18px; overflow: auto; }
.kl-room-media,
.kl-room-players { min-width: 0; align-content: start; display: grid; gap: 12px; padding: 16px; border: 1px solid var(--kl-border); border-radius: 16px; background: var(--kl-surface-1); }
.kl-room-media h2,
.kl-room-players h2 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: var(--kl-type-lg); }
.kl-room-field { display: grid; gap: 6px; color: var(--kl-muted); font-size: var(--kl-type-sm); font-weight: 750; }
.kl-room-media-note { margin: 0; color: var(--kl-muted); font-size: var(--kl-type-xs); line-height: 1.45; }
.kl-room-player-list { display: grid; gap: 8px; }
.kl-room-player { min-width: 0; display: grid; grid-template-columns: 42px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 9px; border: 1px solid var(--kl-border); border-radius: 13px; background: var(--kl-surface); }
.kl-room-player .kl-avatar { width: 42px; height: 42px; border-radius: 11px; }
.kl-room-player-copy { min-width: 0; display: grid; gap: 2px; }
.kl-room-player-copy > strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-room-player-copy > span { color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-room-player-badges { display: flex; flex-wrap: wrap; gap: 4px; }
.kl-room-player-badges span { padding: 2px 5px; border-radius: 999px; background: color-mix(in srgb, var(--kl-gold), transparent 84%); color: var(--kl-gold); font-size: 9px; font-weight: 900; }
.kl-room-player-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }
.kl-room-player-actions .kl-text-button { min-height: 32px; padding: 4px 7px; font-size: var(--kl-type-xs); }

/* Identity and local time stay visible in the top bar without turning it into another toolbar. */
.kl-local-clock {
  flex: 0 0 auto;
  padding: 3px 7px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 45%);
  color: var(--kl-meta);
  font-size: var(--kl-type-xxs);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
}
.kl-presence-trigger {
  position: relative;
  min-width: 142px;
  max-width: 210px;
  min-height: 42px;
  padding: 4px 25px 4px 5px;
  border-radius: 12px;
}
.kl-presence-trigger-avatar { width: 32px; height: 32px; flex: 0 0 auto; border-radius: 9px; font-size: 12px; }
.kl-presence-trigger-label { min-width: 0; display: grid; gap: 0; text-align: left; line-height: 1.15; }
.kl-presence-trigger-name,
.kl-presence-trigger-status { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-presence-trigger-name { color: var(--kl-text); font-size: var(--kl-type-sm); }
.kl-presence-trigger-status { color: var(--kl-muted); font-size: var(--kl-type-xxs); font-weight: 650; }
.kl-presence-trigger > .kl-presence-dot { position: absolute; right: 9px; top: 50%; margin-top: -4px; }
.kl-presence-note {
  display: inline-flex;
  max-width: min(260px, 46vw);
  margin-left: 4px;
  padding: 2px 7px;
  border: 1px solid var(--kl-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 28%);
  color: var(--kl-muted);
}

/* Room is one primary destination; lobbies and presets remain compact subtools inside it. */
.kl-room-subnav {
  display: flex;
  gap: 4px;
  padding: 7px 18px;
  border-bottom: 1px solid var(--kl-border);
  background: color-mix(in srgb, var(--kl-surface), transparent 30%);
}
.kl-room-subnav-button {
  min-height: 34px;
  padding: 5px 13px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--kl-muted);
  font: inherit;
  font-size: var(--kl-type-sm);
  font-weight: 800;
  cursor: pointer;
}
.kl-room-subnav-button:hover { border-color: var(--kl-border); color: var(--kl-text); }
.kl-room-subnav-button[data-active="true"] { border-color: var(--kl-border-strong); background: var(--kl-surface-2); color: var(--kl-text); box-shadow: inset 0 -2px var(--kl-accent); }
.kl-room-content,
.kl-room-subpanel { min-width: 0; min-height: 0; height: 100%; }
.kl-room-content { overflow: hidden; }
.kl-room-current-panel { display: grid; grid-template-rows: auto minmax(0, 1fr); overflow: hidden; }
.kl-lobbies-panel,
.kl-room-presets-panel { overflow-y: auto; padding: 16px 18px 22px; }
.kl-lobby-toolbar,
.kl-room-preset-create { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.kl-lobby-toolbar h2,
.kl-room-preset-create h2 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: var(--kl-type-lg); }
.kl-lobby-search-wrap { width: min(380px, 48%); display: grid; grid-template-columns: minmax(0, 1fr) 42px; gap: 7px; }
.kl-lobby-refresh { width: 42px; height: 42px; }
.kl-lobby-refresh:disabled .kl-icon { animation: kl-spin 900ms linear infinite; }
.kl-room-directory-status { margin-bottom: 9px; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-room-directory-status[data-state="error"] { color: var(--kl-danger); }
.kl-lobby-list,
.kl-room-preset-list { display: grid; gap: 8px; }
.kl-lobby-card {
  display: grid;
  gap: 6px;
  padding: 11px 12px;
  border: 1px solid var(--kl-border);
  border-radius: 13px;
  background: var(--kl-surface);
}
.kl-lobby-card[data-has-friends="true"] { border-color: color-mix(in srgb, var(--kl-gold), transparent 48%); background: color-mix(in srgb, var(--kl-gold), transparent 95%); }
.kl-lobby-card-main { min-width: 0; display: flex; align-items: center; gap: 8px; }
.kl-lobby-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-lobby-count,
.kl-lobby-friend-label { flex: 0 0 auto; padding: 2px 6px; border-radius: 999px; background: var(--kl-surface-2); color: var(--kl-muted); font-size: var(--kl-type-xxs); font-weight: 800; }
.kl-lobby-friend-label { background: color-mix(in srgb, var(--kl-gold), transparent 84%); color: var(--kl-gold); }
.kl-lobby-description { margin: 0; overflow: hidden; color: var(--kl-muted); font-size: var(--kl-type-xs); text-overflow: ellipsis; white-space: nowrap; }
.kl-lobby-card-footer { min-width: 0; display: flex; align-items: center; gap: 9px; }
.kl-lobby-flags { min-width: 0; margin-right: auto; overflow: hidden; color: var(--kl-meta); font-size: var(--kl-type-xxs); text-overflow: ellipsis; white-space: nowrap; }
.kl-lobby-friends { display: flex; flex: 0 0 auto; align-items: center; padding-left: 6px; }
.kl-lobby-friend-avatar { width: 27px; height: 27px; margin-left: -6px; border: 2px solid var(--kl-panel-bg); border-radius: 9px; font-size: 9px; }
.kl-lobby-friend-more { margin-left: 3px; color: var(--kl-muted); font-size: var(--kl-type-xxs); }
.kl-lobby-join { min-height: 32px; padding: 4px 10px; }
.kl-room-preset-create-actions { width: min(420px, 54%); display: flex; gap: 7px; }
.kl-preset-name { min-width: 0; }
.kl-room-preset-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 12px; border: 1px solid var(--kl-border); border-radius: 13px; background: var(--kl-surface); }
.kl-room-preset-copy { min-width: 0; display: grid; gap: 2px; }
.kl-room-preset-copy > strong,
.kl-room-preset-copy > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-room-preset-copy > span,
.kl-room-preset-copy > small { color: var(--kl-muted); }
.kl-room-preset-actions { display: flex; gap: 6px; }

/* Full music features live in one primary page, with a persistent transport at the bottom. */
.kl-music-page { grid-template-rows: auto minmax(0, 1fr) auto; }
.kl-music-body { min-width: 0; min-height: 0; display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(260px, 0.75fr); gap: 14px; padding: 16px; overflow: hidden; }
.kl-music-library,
.kl-music-add { min-width: 0; min-height: 0; display: grid; align-content: start; gap: 10px; padding: 13px; border: 1px solid var(--kl-border); border-radius: 15px; background: var(--kl-surface); }
.kl-music-library { grid-template-rows: auto minmax(0, 1fr); }
.kl-music-add { overflow-y: auto; }
.kl-music-add h2 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: var(--kl-type-lg); }
.kl-music-add label,
.kl-music-playlist-toolbar label { display: grid; gap: 5px; color: var(--kl-muted); font-size: var(--kl-type-xs); font-weight: 800; }
.kl-music-playlist-toolbar { display: flex; align-items: end; gap: 7px; }
.kl-music-playlist-toolbar label { min-width: 0; flex: 1 1 auto; }
.kl-music-add-divider { display: flex; align-items: center; gap: 8px; color: var(--kl-meta); font-size: var(--kl-type-xxs); text-transform: uppercase; }
.kl-music-add-divider::before,
.kl-music-add-divider::after { content: ""; height: 1px; flex: 1 1 auto; background: var(--kl-border); }
.kl-music-add-status { min-height: 18px; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-music-queue { min-height: 0; display: grid; align-content: start; gap: 6px; overflow-y: auto; }
.kl-music-track { display: grid; grid-template-columns: 22px 36px minmax(0, 1fr) 34px; gap: 7px; align-items: center; padding: 7px; border: 1px solid transparent; border-radius: 11px; }
.kl-music-track:hover { border-color: var(--kl-border); background: var(--kl-surface-2); }
.kl-music-track[data-active="true"] { border-color: color-mix(in srgb, var(--kl-accent), transparent 48%); background: color-mix(in srgb, var(--kl-accent), transparent 91%); }
.kl-music-track-number { color: var(--kl-meta); font-size: var(--kl-type-xs); text-align: center; }
.kl-music-track-play,
.kl-music-track-remove { width: 34px; height: 34px; border-radius: 9px; }
.kl-music-track-copy { min-width: 0; display: grid; gap: 1px; }
.kl-music-track-copy strong,
.kl-music-track-copy span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-music-track-copy span { color: var(--kl-muted); font-size: var(--kl-type-xxs); }
.kl-music-track-remove { color: var(--kl-muted); }
.kl-music-player { display: grid; grid-template-columns: minmax(150px, 0.7fr) minmax(180px, 1fr) auto; gap: 14px; align-items: center; padding: 10px 15px; border-top: 1px solid var(--kl-border); background: var(--kl-composer-bg); }
.kl-music-now { min-width: 0; display: flex; align-items: center; gap: 9px; }
.kl-music-now-icon { width: 26px; height: 26px; color: var(--kl-gold); }
.kl-music-now > div { min-width: 0; display: grid; }
.kl-music-now-title,
.kl-music-now-source { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kl-music-now-source { color: var(--kl-muted); font-size: var(--kl-type-xxs); }
.kl-music-seek { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; }
.kl-music-progress { width: 100%; accent-color: var(--kl-accent); }
.kl-music-time { color: var(--kl-meta); font-size: var(--kl-type-xxs); font-variant-numeric: tabular-nums; }
.kl-music-controls { display: flex; align-items: center; gap: 5px; }
.kl-music-play { border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 20%); background: var(--kl-accent); color: var(--kl-accent-foreground); }
.kl-music-mode { min-height: 34px; padding: 4px 8px; color: var(--kl-muted); font-size: var(--kl-type-xxs); }
.kl-music-mode[data-active="true"] { border-color: var(--kl-border-strong); color: var(--kl-gold); }
.kl-music-volume { display: grid; grid-template-columns: auto 74px; gap: 5px; align-items: center; color: var(--kl-muted); font-size: var(--kl-type-xxs); }
.kl-music-volume .kl-volume-input { width: 74px; }
@keyframes kl-spin { to { transform: rotate(360deg); } }
@keyframes kl-image-loading { to { background-position: -240% 0; } }
.kl-message-side-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transform: translateX(-3px);
  transition: opacity 120ms ease, transform 120ms ease;
}
.kl-message-row[data-direction="outgoing"] .kl-message-side-actions { transform: translateX(3px); }
.kl-message-row:hover .kl-message-side-actions,
.kl-message-row:focus-within .kl-message-side-actions { opacity: 1; transform: translateX(0); }
.kl-message-action {
  width: 29px;
  height: 29px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--kl-muted);
  cursor: pointer;
}
.kl-message-action .kl-icon { width: 15px; height: 15px; }
.kl-message-action:hover { border-color: var(--kl-border); background: var(--kl-surface-2); color: var(--kl-gold); }

.kl-alias-dialog { width: min(500px, calc(100vw - 32px)); }
.kl-alias-body { display: grid; gap: 15px; }
.kl-local-only-note { display: flex; align-items: flex-start; gap: 9px; margin: 0; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-local-only-note .kl-icon { width: 17px; height: 17px; margin-top: 1px; color: var(--kl-gold); }
.kl-dialog-actions-spacer { flex: 1 1 auto; }
.kl-remove-chat-dialog { width: min(480px, calc(100vw - 32px)); }
.kl-remove-chat-body { display: grid; justify-items: center; gap: 10px; padding-block: 24px; text-align: center; }
.kl-remove-chat-body p { margin: 0; }
.kl-remove-chat-icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 15px; background: color-mix(in srgb, var(--kl-danger), transparent 88%); color: var(--kl-danger); }
.kl-remove-chat-icon .kl-icon { width: 23px; height: 23px; }
.kl-remove-chat-safe { max-width: 360px; color: var(--kl-muted); font-size: var(--kl-type-xs); }
.kl-text-button--danger { border-color: color-mix(in srgb, var(--kl-danger), transparent 50%); background: color-mix(in srgb, var(--kl-danger), transparent 90%); }

@media (max-width: 720px) {
  .kl-presence-trigger { min-width: 118px; max-width: 150px; min-height: 42px; padding-right: 21px; }
  .kl-presence-trigger-avatar { width: 32px; height: 32px; }
  .kl-presence-trigger > .kl-presence-dot { right: 7px; }
  .kl-presence-options { grid-template-columns: minmax(0, 1fr); }
  .kl-composer-row { grid-template-columns: 44px minmax(0, 1fr) 48px; gap: 7px; }
  .kl-message-side-actions { opacity: 0.66; transform: none; }
  .kl-message-bubble[data-media="true"] { width: 94%; max-width: 94%; }
  .kl-image-card { min-width: 0; }
  .kl-chat-presence .kl-presence-note { display: none; }
  .kl-lobby-toolbar,
  .kl-room-preset-create { align-items: stretch; flex-direction: column; }
  .kl-lobby-search-wrap,
  .kl-room-preset-create-actions { width: 100%; }
  .kl-music-body { grid-template-columns: minmax(0, 1fr); overflow-y: auto; }
  .kl-music-library { min-height: 310px; }
  .kl-music-queue { max-height: 260px; }
  .kl-music-player { grid-template-columns: minmax(0, 1fr); gap: 7px; padding: 9px 12px; }
  .kl-music-controls { justify-content: center; flex-wrap: wrap; }
  .kl-music-now { display: none; }
}

@media (max-width: 410px) {
  .kl-brand-copy { display: none; }
  .kl-local-clock { display: block; margin-left: auto; }
  .kl-presence-trigger { min-width: 96px; max-width: 112px; }
  .kl-presence-trigger-name { font-size: var(--kl-type-xs); }
  .kl-presence-trigger-status { max-width: 54px; }
  .kl-chat-number { display: none; }
  .kl-chat-presence::before { display: none; }
  .kl-profile-more { display: none; }
  .kl-room-subnav { padding-inline: 9px; }
  .kl-room-subnav-button { flex: 1 1 0; padding-inline: 5px; }
  .kl-lobbies-panel,
  .kl-room-presets-panel { padding: 12px; }
  .kl-lobby-card-footer { flex-wrap: wrap; }
  .kl-lobby-flags { flex-basis: 100%; }
  .kl-room-preset-card { grid-template-columns: minmax(0, 1fr); }
  .kl-room-preset-actions { justify-content: flex-end; }
}

:host([data-reduced-motion="true"]) *,
:host([data-reduced-motion="true"]) *::before,
:host([data-reduced-motion="true"]) *::after {
  animation-duration: 1ms !important;
  transition-duration: 1ms !important;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }
}
`;
