export const LINK_CHAT_STYLES = `
:host {
  --kl-accent: #d71932;
  --kl-accent-strong: #f13749;
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
  backdrop-filter: blur(22px);
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
}

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
.kl-brand-subtitle { display: flex; align-items: center; gap: 8px; color: var(--kl-muted); font-size: 11px; letter-spacing: 0.02em; }
.kl-topbar-mode {
  margin-right: 2px;
  color: var(--kl-gold);
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.16em;
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
  width: 36px;
  height: 36px;
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
  min-height: 36px;
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
  background: linear-gradient(145deg, var(--kl-accent-strong), color-mix(in srgb, var(--kl-accent), #4b000d 42%));
  color: #fff8ee;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.13);
}
.kl-text-button--primary:hover { background: var(--kl-accent-strong); }

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
.kl-nav-icon { font-size: 20px; line-height: 1; }
.kl-nav-label {
  max-width: 100%;
  overflow: hidden;
  font-size: 9px;
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
}
.kl-workspace > .kl-layout,
.kl-workspace > .kl-home { height: 100%; }

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
  min-height: 190px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 176px;
  align-items: center;
  gap: 28px;
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
.kl-home-hero-copy { position: relative; z-index: 1; min-width: 0; }
.kl-home-eyebrow,
.kl-feature-card-kicker {
  color: var(--kl-gold);
  font-size: 9px;
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
.kl-home-lead { max-width: 590px; margin: 0; color: var(--kl-muted); font-size: 13px; }
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
  font-size: 10px;
}
.kl-home-status-label { color: var(--kl-muted); }
.kl-home-status-value { font-weight: 780; }
.kl-home-status-value[data-state="ready"] { color: #68d391; }
.kl-home-status-value[data-state="error"] { color: var(--kl-danger); }
.kl-home-mark { position: relative; width: 150px; height: 150px; place-self: center; }
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
  font-size: 22px;
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
.kl-feature-card-description { margin-top: 5px; color: var(--kl-muted); font-size: 11px; }
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
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-feature-card-arrow { margin-left: auto; color: var(--kl-gold); font-size: 14px; }
.kl-home-privacy {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 8px 2px;
  color: var(--kl-muted);
  font-size: 10px;
  text-align: center;
}
.kl-home-privacy-icon { color: var(--kl-gold); }

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
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.kl-sidebar-new-chat {
  width: 25px;
  height: 25px;
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
.kl-search,
.kl-composer-input,
.kl-number-input,
.kl-select,
.kl-action-label,
.kl-action-template,
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
  height: 40px;
  padding: 0 13px;
  border-radius: 12px;
}

.kl-search:focus,
.kl-composer-input:focus,
.kl-number-input:focus,
.kl-select:focus,
.kl-action-label:focus,
.kl-action-template:focus,
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
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px solid var(--kl-border);
  border-radius: 15px;
  background: var(--kl-avatar-bg);
  font-weight: 850;
  text-transform: uppercase;
}

.kl-conversation-main { min-width: 0; }
.kl-conversation-name-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
.kl-conversation-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 750; }
.kl-pin { color: var(--kl-gold); font-size: 11px; }
.kl-conversation-preview { overflow: hidden; color: var(--kl-muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.kl-conversation-side { align-self: stretch; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 5px; }
.kl-time { color: var(--kl-muted); font-size: 10px; white-space: nowrap; }
.kl-unread {
  min-width: 19px;
  height: 19px;
  display: grid;
  place-items: center;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--kl-accent);
  color: #fff7eb;
  font-size: 10px;
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

.kl-empty-title { margin: 0 0 7px; font-family: Georgia, "Times New Roman", serif; font-size: 20px; font-weight: 700; }
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
.kl-chat-name { overflow: hidden; font-size: 15px; font-weight: 850; text-overflow: ellipsis; white-space: nowrap; }
.kl-chat-number { color: var(--kl-muted); font-size: 11px; }

.kl-messages {
  min-height: 0;
  overflow-y: auto;
  padding: 18px;
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}

.kl-message-row { display: flex; margin: 7px 0; }
.kl-message-row[data-direction="outgoing"] { justify-content: flex-end; }
.kl-message-bubble {
  max-width: min(72%, 540px);
  padding: 10px 12px 8px;
  border: 1px solid var(--kl-border);
  border-radius: 16px 16px 16px 5px;
  background: var(--kl-surface-2);
  box-shadow: 0 5px 16px rgba(0, 0, 0, 0.10);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.kl-message-row[data-direction="outgoing"] .kl-message-bubble {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 22%);
  border-radius: 16px 16px 5px 16px;
  background: linear-gradient(145deg, color-mix(in srgb, var(--kl-accent), #2b0710 24%), #8f1028);
  color: #fff8ee;
}
.kl-message-meta { display: flex; justify-content: flex-end; gap: 7px; margin-top: 5px; color: var(--kl-meta); font-size: 9px; }
.kl-message-row[data-direction="outgoing"] .kl-message-meta { color: rgba(255, 245, 229, 0.64); }
.kl-message-room { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.kl-composer {
  padding: 12px 14px 14px;
  border-top: 1px solid var(--kl-border);
  background: var(--kl-composer-bg);
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
  min-height: 29px;
  flex: 0 0 auto;
  padding: 4px 10px;
  border: 1px solid var(--kl-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 8%);
  color: var(--kl-text);
  font-size: 11px;
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
.kl-send { min-width: 76px; height: 44px; }
.kl-composer-options { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 8px; color: var(--kl-muted); font-size: 11px; }
.kl-check { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; }
.kl-check input { accent-color: var(--kl-accent); }
.kl-counter[data-over="true"] { color: var(--kl-danger); font-weight: 750; }

.kl-dialog {
  width: min(460px, calc(100vw - 32px));
  max-height: min(760px, calc(100vh - 32px));
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--kl-border);
  border-radius: 20px;
  background: var(--kl-panel-art), var(--kl-panel-bg);
  color: var(--kl-text);
  box-shadow: var(--kl-shadow);
}
.kl-dialog::backdrop { background: rgba(0, 0, 0, 0.68); backdrop-filter: blur(4px); }
.kl-dialog-header { display: flex; align-items: center; gap: 10px; padding: 16px 18px; border-bottom: 1px solid var(--kl-border); background: var(--kl-topbar-bg); }
.kl-dialog-heading { min-width: 0; margin-right: auto; }
.kl-dialog-title { margin-right: auto; font-family: Georgia, "Times New Roman", serif; font-size: 17px; font-weight: 700; }
.kl-dialog-subtitle { margin-top: 2px; color: var(--kl-muted); font-size: 10px; letter-spacing: 0.035em; }
.kl-dialog-body { display: grid; gap: 18px; max-height: calc(100vh - 170px); padding: 18px; overflow: auto; }
.kl-setting-section { display: grid; gap: 14px; }
.kl-setting-section + .kl-setting-section { padding-top: 17px; border-top: 1px solid var(--kl-border); }
.kl-setting-section-title { color: var(--kl-gold); font-size: 10px; font-weight: 850; letter-spacing: 0.14em; text-transform: uppercase; }
.kl-setting-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.kl-setting-copy { min-width: 0; }
.kl-setting-name { font-weight: 750; }
.kl-setting-help { margin-top: 2px; color: var(--kl-muted); font-size: 11px; }
.kl-number-input { width: 90px; height: 38px; padding: 0 10px; border-radius: 11px; }
.kl-select { width: 142px; height: 38px; padding: 0 10px; border-radius: 11px; }
.kl-color-control { display: flex; align-items: center; gap: 8px; }
.kl-color-presets { display: flex; align-items: center; gap: 5px; }
.kl-color-swatch {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 2px solid var(--kl-surface);
  border-radius: 50%;
  outline: 1px solid var(--kl-border);
  background: var(--kl-swatch);
  cursor: pointer;
}
.kl-color-swatch:hover { outline-color: var(--kl-border-strong); transform: scale(1.08); }
.kl-color-input {
  width: 38px;
  height: 32px;
  padding: 3px;
  border: 1px solid var(--kl-border);
  border-radius: 10px;
  background: var(--kl-input-bg);
  cursor: pointer;
}
.kl-switch { width: 42px; height: 24px; position: relative; flex: 0 0 auto; }
.kl-switch input { position: absolute; opacity: 0; pointer-events: none; }
.kl-switch-track { position: absolute; inset: 0; border: 1px solid var(--kl-border); border-radius: 999px; background: var(--kl-surface-hover); cursor: pointer; transition: background 140ms ease; }
.kl-switch-track::after { content: ""; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff8eb; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.24); transition: transform 140ms ease; }
.kl-switch input:checked + .kl-switch-track { background: var(--kl-accent); }
.kl-switch input:checked + .kl-switch-track::after { transform: translateX(18px); }
.kl-dialog-actions { display: flex; justify-content: flex-end; gap: 9px; padding: 0 18px 18px; }

.kl-action-editor { display: grid; gap: 8px; }
.kl-action-editor-row { display: grid; grid-template-columns: 92px minmax(0, 1fr) 34px; gap: 7px; align-items: center; }
.kl-action-label,
.kl-action-template { width: 100%; height: 36px; min-width: 0; padding: 0 9px; border-radius: 10px; }
.kl-remove-action { width: 34px; height: 34px; color: var(--kl-danger); }
.kl-add-action { justify-self: start; }

.kl-new-chat-dialog { width: min(480px, calc(100vw - 32px)); }
.kl-new-chat-body { gap: 12px; }
.kl-new-chat-query { flex: 0 0 auto; }
.kl-contact-heading { color: var(--kl-gold); font-size: 10px; font-weight: 850; letter-spacing: 0.14em; text-transform: uppercase; }
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
.kl-contact-empty { color: var(--kl-muted); font-size: 11px; }
.kl-contact-empty { padding: 18px 8px; text-align: center; }

.kl-roster-dialog { width: min(880px, calc(100vw - 32px)); }
.kl-roster-body {
  min-height: min(540px, calc(100vh - 190px));
  display: grid;
  grid-template-columns: minmax(280px, 0.78fr) minmax(360px, 1.22fr);
  gap: 14px;
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
  min-height: 31px;
  padding: 4px 7px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--kl-muted);
  font-size: 10px;
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
}
.kl-roster-empty,
.kl-roster-detail-empty {
  display: grid;
  min-height: 160px;
  place-items: center;
  padding: 18px;
  color: var(--kl-muted);
  font-size: 12px;
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
.kl-roster-entry-name-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
.kl-roster-entry-name { overflow: hidden; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.kl-roster-entry-badges { display: flex; align-items: center; gap: 4px; flex: 0 0 auto; }
.kl-roster-live,
.kl-roster-friend {
  padding: 1px 4px;
  border-radius: 999px;
  font-size: 7px;
  font-weight: 900;
  letter-spacing: 0.08em;
}
.kl-roster-live { background: rgba(104, 211, 145, 0.14); color: #68d391; }
.kl-roster-friend { background: color-mix(in srgb, var(--kl-gold), transparent 84%); color: var(--kl-gold); }
.kl-roster-favorite { color: var(--kl-gold); font-size: 11px; }
.kl-roster-entry-preview {
  overflow: hidden;
  color: var(--kl-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-roster-entry-time { color: var(--kl-muted); font-size: 9px; }
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
.kl-roster-number { color: var(--kl-muted); font-size: 11px; }
.kl-roster-star { color: var(--kl-gold); font-size: 20px; }
.kl-roster-quick-actions { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; margin-top: 15px; }
.kl-roster-quick-actions .kl-text-button { min-width: 0; padding-inline: 7px; font-size: 11px; }
.kl-roster-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; margin-top: 15px; }
.kl-roster-stat { min-width: 0; padding: 9px 10px; border: 1px solid var(--kl-border); border-radius: 11px; background: var(--kl-surface-2); }
.kl-roster-stat-label { color: var(--kl-muted); font-size: 8px; font-weight: 850; letter-spacing: 0.08em; text-transform: uppercase; }
.kl-roster-stat-value { margin-top: 3px; overflow: hidden; font-size: 11px; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.kl-roster-notebook { display: grid; gap: 10px; margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--kl-border); }
.kl-roster-field-label { display: grid; gap: 5px; color: var(--kl-gold); font-size: 9px; font-weight: 850; letter-spacing: 0.09em; text-transform: uppercase; }
.kl-roster-note,
.kl-roster-tags { width: 100%; min-width: 0; padding: 9px 11px; border-radius: 11px; text-transform: none; }
.kl-roster-tags { height: 38px; }
.kl-roster-note { min-height: 120px; max-height: 230px; resize: vertical; line-height: 1.45; }
.kl-roster-note-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
.kl-roster-note-actions .kl-setting-help { margin-right: auto; }
.kl-roster-privacy { align-self: center; margin-right: auto; color: var(--kl-muted); font-size: 9px; }

.kl-activities-dialog { width: min(760px, calc(100vw - 32px)); }
.kl-activities-body { gap: 13px; }
.kl-activity-status {
  padding: 9px 11px;
  border: 1px solid var(--kl-border);
  border-radius: 11px;
  background: color-mix(in srgb, var(--kl-surface-2), transparent 20%);
  color: var(--kl-muted);
  font-size: 11px;
}
.kl-activity-status[data-kind="ready"] { color: #68d391; }
.kl-activity-status[data-kind="error"] { color: var(--kl-danger); }
.kl-activity-studio {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(220px, 0.82fr) minmax(260px, 1.18fr);
  gap: 14px;
}
.kl-activity-pane { min-width: 0; display: grid; align-content: start; gap: 9px; }
.kl-activity-pane-title {
  color: var(--kl-gold);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.kl-activity-targets,
.kl-activity-library {
  min-height: 180px;
  max-height: min(330px, calc(100vh - 390px));
  overflow-y: auto;
  padding: 4px;
  border: 1px solid var(--kl-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--kl-input-bg), transparent 20%);
  scrollbar-color: var(--kl-border-strong) transparent;
  scrollbar-width: thin;
}
.kl-activity-target {
  width: 100%;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  padding: 7px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.kl-activity-target:hover { background: var(--kl-surface-hover); }
.kl-activity-target[data-selected="true"] {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 28%);
  background: color-mix(in srgb, var(--kl-accent), transparent 87%);
}
.kl-activity-target .kl-avatar { width: 40px; height: 40px; border-radius: 12px; }
.kl-activity-library { display: grid; align-content: start; gap: 7px; }
.kl-activity-card {
  width: 100%;
  padding: 10px 11px;
  border: 1px solid var(--kl-border);
  border-radius: 12px;
  background: var(--kl-surface-2);
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.kl-activity-card:hover { border-color: var(--kl-border-strong); background: var(--kl-surface-hover); }
.kl-activity-card[data-selected="true"] {
  border-color: color-mix(in srgb, var(--kl-accent), var(--kl-gold) 32%);
  background: color-mix(in srgb, var(--kl-accent), transparent 84%);
  box-shadow: inset 3px 0 var(--kl-accent);
}
.kl-activity-card-label { font-weight: 800; }
.kl-activity-card-template {
  margin-top: 3px;
  overflow: hidden;
  color: var(--kl-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kl-activity-preview-wrap { display: grid; gap: 7px; }
.kl-activity-preview {
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid var(--kl-border-strong);
  border-radius: 13px;
  background: linear-gradient(145deg, color-mix(in srgb, var(--kl-accent), transparent 91%), var(--kl-surface));
  overflow-wrap: anywhere;
  font-style: italic;
}
.kl-activity-dialog-actions .kl-edit-activities { margin-right: auto; }

.kl-toast {
  position: absolute;
  z-index: 3;
  right: 16px;
  bottom: 16px;
  max-width: 320px;
  padding: 10px 13px;
  border: 1px solid var(--kl-border-strong);
  border-radius: 12px;
  background: var(--kl-surface-hover);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.28);
  font-size: 12px;
  animation: kl-enter 140ms ease-out;
}
.kl-toast[data-kind="error"] { border-color: color-mix(in srgb, var(--kl-danger), transparent 44%); color: var(--kl-danger); }

button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
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

  .kl-shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) 64px;
  }
  .kl-workspace { grid-row: 1; }
  .kl-feature-nav {
    grid-row: 2;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
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
  .kl-nav-item[data-target="settings"] { margin-top: 0; }
  .kl-nav-item[data-active="true"] { box-shadow: inset 0 -3px var(--kl-accent); }
  .kl-nav-icon { font-size: 18px; }
  .kl-nav-label { font-size: 8px; }
  .kl-roster-count { top: 1px; right: calc(50% - 25px); }
  .kl-home { padding: 18px; }
  .kl-home-hero {
    min-height: 174px;
    grid-template-columns: minmax(0, 1fr) 122px;
    gap: 16px;
    padding: 21px;
    border-radius: 19px;
  }
  .kl-home-mark { width: 110px; height: 110px; }
  .kl-home-emblem { inset: 11px; border-radius: 28px; }
  .kl-home-title { font-size: clamp(23px, 7vw, 31px); }
  .kl-feature-card { min-height: 142px; padding: 15px; }
  .kl-layout { grid-template-columns: minmax(0, 1fr); }
  .kl-sidebar { width: auto; border-right: 0; }
  .kl-panel[data-mobile-view="list"] .kl-main { display: none; }
  .kl-panel[data-mobile-view="chat"] .kl-sidebar { display: none; }
  .kl-panel[data-mobile-view="chat"] .kl-main { display: grid; }
  .kl-back { display: grid; }
  .kl-search-wrap { padding: 12px; }
  .kl-conversation { grid-template-columns: 44px minmax(0, 1fr) auto; gap: 10px; padding: 10px; }
  .kl-brand-subtitle { display: none; }
  .kl-topbar { padding-left: 12px; }
  .kl-chat-header { padding: 0 12px; }
  .kl-messages { padding: 14px 12px; }
  .kl-message-bubble { max-width: 88%; }
  .kl-composer { padding: 10px 10px calc(10px + env(safe-area-inset-bottom)); }
  .kl-composer-row { grid-template-columns: minmax(0, 1fr) 48px; }
  .kl-send { min-width: 48px; width: 48px; font-size: 0; }
  .kl-send::after { content: "➤"; font-size: 17px; }
  .kl-setting-row { gap: 14px; }
  .kl-setting-help { max-width: 230px; }
  .kl-action-editor-row { grid-template-columns: 76px minmax(0, 1fr) 34px; }
  .kl-activities-dialog {
    width: calc(100vw - 16px);
    max-height: calc(100vh - 16px);
  }
  .kl-activities-body { max-height: calc(100vh - 145px); }
  .kl-activity-studio { grid-template-columns: minmax(0, 1fr); }
  .kl-activity-targets,
  .kl-activity-library { min-height: 130px; max-height: 190px; }
  .kl-roster-dialog {
    width: calc(100vw - 16px);
    max-height: calc(100vh - 16px);
  }
  .kl-roster-body {
    min-height: 0;
    max-height: calc(100vh - 145px);
    grid-template-columns: minmax(0, 1fr);
    overflow-y: auto;
  }
  .kl-roster-list-pane { min-height: 270px; }
  .kl-roster-list { max-height: 235px; }
  .kl-roster-detail { overflow: visible; }
  .kl-roster-privacy { display: none; }
}

@media (max-width: 420px) {
  .kl-brand-title { font-size: 14px; }
  .kl-brand-emblem { width: 34px; height: 34px; }
  .kl-topbar { gap: 7px; padding-right: 10px; }
  .kl-topbar-mode { display: none; }
  .kl-icon-button { width: 34px; height: 34px; }
  .kl-home { padding: 12px; }
  .kl-home-hero { min-height: 0; grid-template-columns: minmax(0, 1fr); margin-bottom: 10px; padding: 18px; }
  .kl-home-mark { display: none; }
  .kl-home-lead { font-size: 11px; }
  .kl-home-statuses { margin-top: 13px; }
  .kl-home-status { max-width: 100%; }
  .kl-home-status-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .kl-feature-grid { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .kl-feature-card { min-height: 126px; grid-template-columns: 42px minmax(0, 1fr); padding: 13px; }
  .kl-feature-card-icon { width: 42px; height: 42px; border-radius: 13px; font-size: 19px; }
  .kl-feature-card-title { font-size: 17px; }
  .kl-home-privacy { padding-bottom: 8px; }
  .kl-color-control { align-items: flex-end; flex-direction: column; }
  .kl-conversation-side { max-width: 44px; }
  .kl-setting-row { align-items: flex-start; }
  .kl-select { width: 126px; }
  .kl-activity-dialog-actions { flex-wrap: wrap; }
  .kl-activity-dialog-actions .kl-edit-activities { width: 100%; margin-right: 0; }
  .kl-roster-quick-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kl-roster-stats { grid-template-columns: minmax(0, 1fr); }
  .kl-roster-stat-value { white-space: normal; }
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
