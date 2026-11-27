// This view shares the normal Explore scroll area. The content pane, not the
// browser viewport, determines when the two card columns need to stack.
export const MATCHES_SWIPE_STYLES = `
.kl-matching-host > .kl-matches-workspace, .kl-matches-workspace > .kl-matches-scroll,
.kl-matches-workspace > .kl-matches-catalog { box-sizing: border-box; height: 100%; min-height: 0; min-width: 0; }
.kl-matches-workspace > .kl-matches-scroll {
  overflow: auto; overscroll-behavior: contain; padding: var(--kl-explore-inset,20px);
  scrollbar-width: thin; scrollbar-color: var(--kl-border-strong) transparent;
}
.kl-matches-workspace > .kl-matches-catalog { display: flex; flex-direction: column; overflow: hidden; }
.kl-matches-workspace > [hidden], .kl-matches-catalog > [hidden] { display: none !important; }
.kl-matches-catalog > .kl-matching-page { flex: 1 1 0; height: auto; min-height: 0; }
.kl-matches-catalog > .kl-matches-back {
  display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; flex: none;
  margin: 8px var(--kl-explore-inset,20px) 0; min-height: var(--kl-action-height,36px);
  padding: 5px 10px; border-radius: var(--kl-action-radius,8px); color: var(--kl-muted); font: inherit;
}
.kl-matches-catalog > .kl-matches-back .ico { width: 16px; height: 16px; }
.kl-matches-swipe {
  container: kl-swipe / inline-size;
  box-sizing: border-box; position: relative; min-width: 0; width: 100%;
  color: var(--kl-text); font-family: inherit; line-height: normal;
  --kl-swipe-border: var(--kl-border);
  --kl-swipe-surface: color-mix(in srgb, var(--kl-surface) 97%, var(--kl-muted));
}
.kl-matches-swipe *, .kl-matches-swipe *::before, .kl-matches-swipe *::after { box-sizing: border-box; }
.kl-matches-swipe [hidden] { display: none !important; }
.kl-matches-swipe :is(h1, h2, h3, p) { margin: 0; }
.kl-matches-swipe :is(h1, h2, h3, p, strong, label, .meta) { overflow-wrap: anywhere; }
.kl-matches-swipe :is(button,input,select,textarea) { font-family: inherit; }
.kl-matches-swipe button { cursor: pointer; }
.kl-matches-swipe button:disabled { opacity: .55; cursor: default; }
.kl-matches-swipe :is(button,input,select,textarea):focus-visible { outline: 2px solid var(--kl-accent); outline-offset: 2px; }
.kl-matches-swipe .sr {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0;
}
.kl-matches-swipe .ico { flex: none; width: 16px; height: 16px; vertical-align: middle; }
.kl-matches-swipe .heading, .kl-matches-swipe .actions, .kl-matches-swipe .looktools,
.kl-matches-swipe .savebar, .kl-matches-swipe .dialogbuttons { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.kl-matches-swipe .heading { justify-content: space-between; margin-bottom: 10px; }
.kl-matches-swipe .heading h1 { font-size: var(--kl-type-xl); line-height: 1.3; }
.kl-matches-swipe .tabs {
  display: flex; align-items: stretch; gap: 20px; border-bottom: 1px solid var(--kl-border); margin-bottom: 16px;
}
.kl-matches-swipe .tab {
  display: inline-flex; align-items: center; gap: 6px; position: relative; padding: 0 2px 8px; min-height: 38px;
  border: 0; border-radius: 0; background: transparent; color: var(--kl-muted); font-size: var(--kl-type-body); font-weight: 550;
}
.kl-matches-swipe .tab[aria-current="page"] { color: var(--kl-text); }
.kl-matches-swipe .tab[aria-current="page"]::after {
  content: ""; position: absolute; height: 2px; inset: auto 0 0; background: var(--kl-accent); border-radius: 2px;
}
.kl-matches-swipe .tab:focus-visible { outline-offset: -2px; }
.kl-matches-swipe .count {
  min-width: 18px; padding: 1px 5px; border: 1px solid var(--kl-border); border-radius: 6px;
  background: var(--kl-surface-2); color: var(--kl-muted); font-size: var(--kl-type-xs); font-variant-numeric: tabular-nums;
}
.kl-matches-swipe :is(.button,.upload,.iconbtn) {
  display: inline-flex; justify-content: center; align-items: center; gap: 6px;
  min-height: var(--kl-action-height,36px); min-width: 0; max-width: 100%; padding: 5px 12px;
  border: 1px solid var(--kl-border); border-radius: var(--kl-action-radius,8px);
  background: var(--kl-surface-2); color: var(--kl-text); box-shadow: none;
  font-size: var(--kl-type-body,12px); font-weight: 550; line-height: 1.4; overflow-wrap: anywhere;
}
.kl-matches-swipe :is(.button.minor,.upload,.dialogbuttons .button:not(.primary)) { background: transparent; }
.kl-matches-swipe .button.primary {
  background: var(--kl-accent); color: var(--kl-accent-foreground); border-color: var(--kl-accent); font-weight: 650;
}
.kl-matches-swipe .matches-background-picker .button, .kl-matches-swipe .iconbtn {
  flex: none; width: var(--kl-action-height,36px); height: var(--kl-action-height,36px); padding: 0;
}
.kl-matches-swipe .iconbtn { width: var(--kl-action-square,32px); min-height: var(--kl-action-square,32px); height: var(--kl-action-square,32px); }
.kl-matches-swipe .panel {
  display: grid; grid-template-columns: minmax(0,1.05fr) minmax(0,1fr); overflow: hidden;
  background: linear-gradient(125deg, color-mix(in srgb, var(--kl-surface-2) 98.5%, var(--kl-accent)), var(--kl-swipe-surface) 70%);
  border: 1px solid var(--kl-swipe-border); border-radius: 12px;
}
.kl-matches-swipe .side { display: flex; flex-direction: column; justify-content: center; min-width: 0; gap: 16px; padding: clamp(20px,4cqi,37px); }
.kl-matches-swipe .side h2 { font-size: clamp(23px,3.3cqi,30px); line-height: 1.2; font-weight: 660; letter-spacing: -.8px; }
.kl-matches-swipe .intro { margin: 6px 0 0; color: var(--kl-muted); font-size: calc(var(--kl-type-body) + 1px); line-height: 1.5; }
.kl-matches-swipe .portraitBox { position: relative; display: flex; min-width: 0; flex-direction: column; background: #101012; }
.kl-matches-swipe .scene {
  position: relative; isolation: isolate; flex: 1; min-width: 0; min-height: clamp(315px,53cqh,525px);
  overflow: hidden; background: #242126; user-select: none; -webkit-touch-callout: none;
}
.kl-matches-swipe .scene .bg, .kl-matches-swipe .thumbbg {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2;
}
.kl-matches-swipe :is(.scene,.swipe-face,.swipe-under)::after {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: -1;
  background: linear-gradient(180deg,#08080d25,transparent 22% 73%,#0a080e7a);
}
.kl-matches-swipe :is(.figure,.upcoming-figure) {
  position: absolute; width: 88%; height: 91%; left: 6%; bottom: 3%;
  object-fit: contain; object-position: 50% 100%; pointer-events: none; filter: drop-shadow(1px 4px 5px #18121970);
}
.kl-matches-swipe :is(.scene,.mini,.pick) img { user-select: none; -webkit-user-drag: none; }
.kl-matches-swipe .where {
  display: flex; align-items: center; gap: 6px; padding: 9px 14px; color: #bcb3ad; background: #111114;
  border-top: 1px solid #343036; font-size: 12px;
}
.kl-matches-swipe .where .ico { width: 14px; height: 14px; color: #e7c994; }
.kl-matches-swipe .missing-look {
  display: grid; position: absolute; inset: 0; place-content: center; justify-items: center; gap: 8px;
  color: #fff6ee; text-shadow: 0 1px 4px #000; font-size: 13px;
}
.kl-matches-swipe .missing-look .ico { background: #171419c4; border: 1px solid #ffffff58; border-radius: 50%; padding: 14px; width: 56px; height: 56px; }

/* A snapshot occupies the entire thumbnail, with room for the native character's feet. */
.kl-matches-swipe .setupPanel form { margin: 0; }
.kl-matches-swipe .field { display: grid; gap: 7px; min-width: 0; }
.kl-matches-swipe .fieldlabel { font-size: calc(var(--kl-type-body) + 1px); font-weight: 620; color: var(--kl-text); }
.kl-matches-swipe .input, .kl-matches-swipe .matches-background-picker :is(.kl-input,.kl-select) {
  display: block; width: 100%; min-width: 0; min-height: var(--kl-action-height,36px); padding: 7px 10px;
  border: 1px solid var(--kl-border); border-radius: var(--kl-action-radius,8px); background-color: var(--kl-input-bg); color: var(--kl-text); font: inherit;
}
.kl-matches-swipe .matches-background-picker .kl-select { height: var(--kl-action-height,36px); }
.kl-matches-swipe .matches-background-picker { gap: 10px; }
.kl-matches-swipe .matches-background-picker h3 { margin: 0; }
.kl-matches-swipe .wardrobe-strip {
  --outfit-toggle: max(32px,var(--kl-action-square,32px));
  container: kl-outfits / inline-size; display: grid; grid-template-columns: minmax(0,1fr) var(--outfit-toggle);
  align-items: start; gap: 6px; width: 100%; max-width: 670px; min-width: 0;
}
.kl-matches-swipe .wardrobe-strip:has(> .wardrobe-toggle[hidden]) { grid-template-columns: minmax(0,1fr); }
.kl-matches-swipe .picks { display: grid; grid-template-columns: repeat(5,minmax(0,1fr)); gap: 6px; min-width: 0; }
.kl-matches-swipe .pick {
  position: relative; display: block; width: 100%; min-width: 0; aspect-ratio: 1 / 2; padding: 0;
  overflow: hidden; border: 1px solid var(--kl-border); border-radius: 7px; background: var(--kl-input-bg);
}
.kl-matches-swipe .outfit-image { position: absolute; inset: 1px; }
.kl-matches-swipe .outfit-image :is(img,canvas) { display: block; width: 100%; height: 100%; object-fit: contain; object-position: center; }
.kl-matches-swipe .pick[aria-pressed="true"] { border-color: var(--kl-accent); box-shadow: inset 0 0 0 1px var(--kl-accent); }
.kl-matches-swipe .wardrobe-toggle {
  width: var(--outfit-toggle); height: var(--outfit-toggle); display: grid; place-items: center; padding: 0;
  /* Half the native 1:2 portrait height is its width. Five gaps separate the six columns. */
  margin-top: max(0px,calc((100cqi - var(--outfit-toggle) - 30px) / 5 - var(--outfit-toggle) / 2));
  border: 0; border-radius: var(--kl-action-radius,8px); background: transparent; color: var(--kl-muted);
}
.kl-matches-swipe .wardrobe-toggle[aria-expanded="true"] .ico { transform: rotate(180deg); }
.kl-matches-swipe .wardrobe-caption, .kl-matches-swipe .swipe-feedback { font-size: var(--kl-type-body); color: var(--kl-muted); }
.kl-matches-swipe .swipe-feedback { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding-block: 8px; }
.kl-matches-swipe .switchrow { display: flex; align-items: center; gap: 9px; font-size: calc(var(--kl-type-body) + 1px); min-height: var(--kl-action-square,32px); cursor: pointer; }
.kl-matches-swipe .switchrow input { flex: 0 0 16px; width: 16px; height: 16px; margin: 0; accent-color: var(--kl-accent); }
.kl-matches-swipe .savebar, .kl-matches-swipe .decisions { padding-top: 14px; border-top: 1px solid var(--kl-border); }
.kl-matches-swipe .savebar .primary { flex: 1; }
.kl-matches-swipe .textbtn {
  align-self: flex-start; min-height: var(--kl-action-square,32px); margin: 0; padding: 3px 6px;
  border: 0; border-radius: var(--kl-action-radius,8px); background: transparent; color: var(--kl-muted);
  font-size: var(--kl-type-body); font-weight: 550;
}
.kl-matches-swipe :is(.error,.swipe-feedback[role="alert"]) { color: var(--kl-danger); font-size: var(--kl-type-body); line-height: 1.5; }

/* The gesture target stays stationary. Only the top card follows the pointer. */
.kl-matches-swipe .swipePanel { --art-inset: 8px; grid-template-columns: minmax(0,1.13fr) minmax(0,1fr); }
.kl-matches-swipe .deck-art {
  position: relative; display: flex; min-width: 0; isolation: isolate; overflow: hidden; border-radius: 7px; background: #151315;
  margin: var(--art-inset) 0 var(--art-inset) var(--art-inset);
}
.kl-matches-swipe .deck-art .portraitBox { width: 100%; }
.kl-matches-swipe .deck-art .scene { min-height: clamp(355px,57cqh,525px); }
.kl-matches-swipe .scene.swipable { touch-action: pan-y pinch-zoom; cursor: grab; background: radial-gradient(ellipse at 50% 65%,#392b31,#171518 80%); }
.kl-matches-swipe :is(.swipe-face,.swipe-under) { position: absolute; inset: 0; isolation: isolate; overflow: hidden; background: #242126; pointer-events: none; }
.kl-matches-swipe .swipe-under { transform: scale(.96); opacity: .78; transition: transform 280ms ease-out, opacity 260ms ease-out; }
.kl-matches-swipe .swipe-face { z-index: 1; transform-origin: 50% 83%; transition: transform 320ms cubic-bezier(.2,.85,.3,1.08); }
.kl-matches-swipe .swipable.dragging { cursor: grabbing; }
.kl-matches-swipe .swipable.dragging :is(.swipe-face,.swipe-under) { transition: none; will-change: transform; }
.kl-matches-swipe .swipe-leaving .swipe-face { transition: transform 235ms cubic-bezier(.32,.08,.66,.52); }
.kl-matches-swipe .swipe-leaving .swipe-under { transition-duration: 205ms; }
.kl-matches-swipe .flag {
  position: absolute; inset: 47% auto auto 50%; z-index: 1; transform: translate(-50%,-50%);
  pointer-events: none; opacity: 0; transition: opacity 110ms ease-out;
}
.kl-matches-swipe .swipable.dragging .flag { transition: none; }
.kl-matches-swipe .flag > span {
  display: none; width: clamp(56px,8cqi,78px); aspect-ratio: 1; align-items: center; justify-content: center;
  border: 1px solid; border-radius: 50%; box-shadow: 0 4px 16px #19111759;
}
.kl-matches-swipe .flag .ico { width: 54%; height: 54%; stroke-width: 2.3; }
.kl-matches-swipe [data-intent="like"] .swipe-like { display: flex; color: #ffeaf0; border-color: #e88da3; background: #70263de8; }
.kl-matches-swipe .swipe-like .ico { fill: currentColor; }
.kl-matches-swipe [data-intent="pass"] .swipe-pass { display: flex; color: #f6f2f6; border-color: #aeabae; background: #302e35e8; }
/* The card and its actions stay put while the server confirms a swipe. */
.kl-matches-swipe .swipe-toast {
  position: absolute; inset: auto 12px 12px; z-index: 3; pointer-events: none;
  margin: auto; width: fit-content; max-width: calc(100% - 24px); padding: 9px 15px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  border: 1px solid #6f5865; border-radius: 8px; color: #f2eae4; background: #29232a;
  font-size: calc(var(--kl-type-body) + 1px); box-shadow: 0 5px 16px #0008;
}
.kl-matches-swipe .matches-empty > .swipe-toast { top: calc(clamp(26px,7cqi,68px) + 6px); bottom: auto; }
.kl-matches-swipe .matches-empty:has(> .swipe-toast) .empty-emblem { visibility: hidden; }
.kl-matches-swipe .swipe-rain { position: absolute; inset: 0; z-index: 2; pointer-events: none; overflow: hidden; border-radius: inherit; contain: strict; user-select: none; }
.kl-matches-swipe .swipe-rain[data-type="pass"] { filter: grayscale(1) brightness(1.45); }
.kl-matches-swipe .rain-piece {
  position: absolute; top: -30px; line-height: 1; font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif;
  text-shadow: 0 1px 2px #180a1659; animation: kl-matches-rain var(--flight) cubic-bezier(.26,.19,.69,.73) both;
}
@keyframes kl-matches-rain {
  0% { opacity: 0; transform: translate3d(-50%,0,0) rotate(var(--tilt)); }
  9% { opacity: .94; } 75% { opacity: .9; }
  100% { opacity: 0; transform: translate3d(calc(-50% + var(--drift)),var(--fall),0) rotate(var(--turn)); }
}
.kl-matches-swipe .deck-art .where, .kl-matches-swipe .deck-position {
  position: absolute; z-index: 3; pointer-events: none; display: inline-flex; gap: 6px; align-items: center;
  background: #191519e8; border: 1px solid #f5e0cb32; color: #fff6eb; border-radius: 6px; font-size: 11px; line-height: 1.25;
}
.kl-matches-swipe .deck-art .where { right: 10px; top: 10px; max-width: calc(100% - 120px); padding: 5px 8px; }
.kl-matches-swipe .deck-art .where .ico { width: 13px; height: 13px; }
.kl-matches-swipe .deck-art .where span { white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
.kl-matches-swipe .deck-position { top: 10px; left: 10px; gap: 8px; padding: 5px 8px; font-variant-numeric: tabular-nums; }
.kl-matches-swipe .deck-track { display: flex; align-items: center; gap: 3px; }
.kl-matches-swipe .deck-track i { display: block; width: 10px; height: 3px; border-radius: 2px; background: #fff5e84d; }
.kl-matches-swipe .deck-track i.filled { background: #e1b671; }
.kl-matches-swipe .swipePanel .side {
  display: grid; grid-template-columns: minmax(0,1fr); grid-template-areas: "identity" "story" "actions"; align-content: center;
  padding: clamp(24px,4cqi,38px); gap: clamp(15px,2.6cqh,24px);
}
.kl-matches-swipe .details { display: grid; gap: 12px; min-width: 0; }
.kl-matches-swipe .card-identity { grid-area: identity; gap: 7px; }
.kl-matches-swipe .side h2.name { font-size: clamp(33px,min(5cqi,6.25cqh),48px); font-weight: 670; letter-spacing: -.04em; line-height: 1.05; }
.kl-matches-swipe .meta { display: flex; align-items: center; gap: 7px; color: color-mix(in srgb,var(--kl-text) 39%,var(--kl-muted)); font-size: calc(var(--kl-type-body) + 1px); }
.kl-matches-swipe .meta .ico { width: 15px; height: 15px; color: var(--kl-gold); }
.kl-matches-swipe .name-line { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 10px; min-width: 0; }
.kl-matches-swipe .name-line .name { min-width: 0; overflow-wrap: anywhere; }
.kl-matches-swipe .swipe-compatibility:not([hidden]) {
  display: inline-flex; align-items: center; gap: 4px; padding: 3px 7px; border-radius: 6px;
  border: 1px solid color-mix(in srgb,var(--kl-gold) 38%,var(--kl-border));
  background: color-mix(in srgb,var(--kl-gold) 8%,var(--kl-surface-2)); color: var(--kl-gold);
  font-size: var(--kl-type-sm); font-weight: 620; white-space: nowrap;
}
.kl-matches-swipe .swipe-compatibility .ico { width: 13px; height: 13px; }
.kl-matches-swipe .shared-language { color: var(--kl-gold); font-weight: 600; }
.kl-matches-swipe .both-like { font-size: var(--kl-type-body); color: var(--kl-text); line-height: 1.45; overflow-wrap: anywhere; }
.kl-matches-swipe .both-like strong { margin-inline-end: 7px; font-size: var(--kl-type-sm); color: var(--kl-muted); }
.kl-matches-swipe .swipePanel .side.no-story { grid-template-areas: "identity" "actions"; }
.kl-matches-swipe .card-story { grid-area: story; display: grid; justify-items: start; align-content: start; gap: 15px; }
.kl-matches-swipe .bio { font-size: var(--kl-type-md); line-height: 1.5; }
.kl-matches-swipe .card-story .bio { max-width: 40ch; color: color-mix(in srgb,var(--kl-text) 89%,var(--kl-muted)); font-size: calc(var(--kl-type-md) + 1px); }
.kl-matches-swipe .tagset { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
.kl-matches-swipe .tagset > span { max-width: 100%; overflow-wrap: anywhere; padding: 4px 8px; border: 1px solid var(--kl-border); border-radius: 6px; background: color-mix(in srgb,var(--kl-surface-2) 94%,var(--kl-muted)); color: color-mix(in srgb,var(--kl-text) 54%,color-mix(in srgb,var(--kl-gold),var(--kl-muted))); font-size: var(--kl-type-sm); }
.kl-matches-swipe .tagset .shared-setting {
  display: inline-flex; align-items: center; gap: 4px; color: var(--kl-gold);
  border-color: color-mix(in srgb,var(--kl-gold) 38%,var(--kl-border));
  background: color-mix(in srgb,var(--kl-gold) 8%,var(--kl-surface-2));
}
.kl-matches-swipe .shared-setting .ico { width: 12px; height: 12px; flex: none; }
.kl-matches-swipe .decisions { grid-area: actions; padding-top: 18px; }
.kl-matches-swipe .decisions .actions { display: grid; grid-template-columns: auto minmax(0,1fr) minmax(0,1fr); gap: 7px; }
.kl-matches-swipe .decisions .button { min-height: max(40px,var(--kl-action-height,36px)); }
.kl-matches-swipe .undo-button { width: max(38px,var(--kl-action-height,36px)); padding-inline: 0; }
.kl-matches-swipe .actions kbd { display: none; border: 1px solid currentColor; border-radius: 4px; padding: 0 3px; margin-left: 4px; font: 500 11px/15px system-ui,sans-serif; opacity: .76; }

.kl-matches-swipe .empty {
  position: relative; overflow: hidden; display: grid; justify-items: center; gap: 10px; padding: clamp(26px,7cqi,68px) 18px;
  text-align: center; border: 1px solid var(--kl-border); border-radius: 12px; background: var(--kl-swipe-surface);
}
.kl-matches-swipe .empty h2 { font-size: clamp(18px,3cqi,25px); }
.kl-matches-swipe .empty p, .kl-matches-swipe .dialog-copy { color: var(--kl-muted); font-size: var(--kl-type-md); line-height: 1.55; }
.kl-matches-swipe .empty p { max-width: 35ch; }
.kl-matches-swipe .empty .actions { justify-content: center; margin-top: 6px; }
.kl-matches-swipe .empty-emblem, .kl-matches-swipe .match-monogram span {
  display: grid; place-items: center; width: 48px; height: 48px; border-radius: 50%;
  background: color-mix(in srgb,var(--kl-surface-2) 92%,var(--kl-gold)); border: 1px solid var(--kl-border-strong); color: var(--kl-gold);
}
.kl-matches-swipe .empty-emblem .ico { width: 21px; height: 21px; }
.kl-matches-swipe .matches { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
.kl-matches-swipe .matches + .actions { justify-content: center; margin-top: 12px; }
.kl-matches-swipe .tile {
  display: grid; grid-template-columns: 76px minmax(0,1fr) auto; align-items: center; column-gap: 14px; min-width: 0;
  padding: 8px 14px 8px 8px; overflow: hidden; border: 1px solid var(--kl-border); border-radius: 10px;
  color: var(--kl-text); background: var(--kl-swipe-surface); text-align: left;
}
.kl-matches-swipe .tiletext { display: grid; min-width: 0; gap: 5px; }
.kl-matches-swipe .tiletext strong, .kl-matches-swipe .pair-names span {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--kl-type-md); line-height: 1.3;
}
.kl-matches-swipe .match-languages { color: var(--kl-muted); font-size: var(--kl-type-body); }
.kl-matches-swipe .tile-open { display: grid; place-items: center; color: var(--kl-gold); }
.kl-matches-swipe .tile-open .ico { width: 15px; height: 15px; transform: rotate(-90deg); }
.kl-matches-swipe .mini { position: relative; isolation: isolate; overflow: hidden; border-radius: 6px; background: var(--kl-input-bg); }
.kl-matches-swipe .tile .mini { height: 88px; }
.kl-matches-swipe .mini .figure { height: 92%; }
.kl-matches-swipe .swipe-dialog {
  width: min(390px,calc(100vw - 32px)); max-height: calc(100dvh - 32px); overflow: auto;
  padding: 22px; margin: auto; border: 1px solid var(--kl-border-strong); border-radius: 13px;
  background: var(--kl-surface-2); color: var(--kl-text); box-shadow: var(--kl-shadow);
}
.kl-matches-swipe .swipe-dialog::backdrop { background: #08070bd1; }
.kl-matches-swipe .dialoghead { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.kl-matches-swipe .dialoghead h2 { font-size: calc(var(--kl-type-xl) + 4px); font-weight: 660; letter-spacing: -.8px; line-height: 1.2; }
.kl-matches-swipe .dialogbuttons { margin-top: 18px; align-items: stretch; }
.kl-matches-swipe .dialogbuttons .button, .kl-matches-swipe .dialogbuttons .match-friend-action { flex: 1; }
.kl-matches-swipe .match-friend-action { display:flex; align-items:stretch; min-width:0; }
.kl-matches-swipe .match-duet { background: transparent; display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; margin: 15px 0 0; }
.kl-matches-swipe .pair-portrait { min-width: 0; }
.kl-matches-swipe .pair-portrait .mini { height: clamp(126px,24svh,184px); border: 1px solid var(--kl-border); border-radius: 8px; }
.kl-matches-swipe .pair-heart {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); z-index: 3; width: 35px; height: 35px;
  display: grid; place-items: center; color: #ffacbb; background: #321c24; border: 1px solid #9a596b; border-radius: 50%; box-shadow: 0 2px 10px #14090f66;
}
.kl-matches-swipe .pair-heart .ico { width: 17px; height: 17px; fill: currentColor; }
.kl-matches-swipe .pair-names { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; margin: 7px 0 14px; }
.kl-matches-swipe .pair-names span, .kl-matches-swipe .match-copy { text-align: center; }
.kl-matches-swipe .pair-names span { font-weight: 640; line-height: normal; }
.kl-matches-swipe .match-monogram { display: grid; place-items: center; background: var(--kl-avatar-bg); }
.kl-matches-swipe .match-monogram span { width: 52px; height: 52px; font-size: 20px; font-weight: 640; }
.kl-matches-swipe .match-profile-portrait .mini { height: clamp(145px,30svh,224px); margin: 0 0 13px; border: 1px solid var(--kl-border); }

@media (hover: hover) {
  .kl-matches-swipe :is(.button,.upload,.tile,.iconbtn,.wardrobe-toggle,.textbtn):enabled:hover {
    background: var(--kl-surface-hover); border-color: var(--kl-border-strong); color: var(--kl-text);
  }
  .kl-matches-swipe .button.primary:enabled:hover { background: color-mix(in srgb,var(--kl-accent) 96%,white); border-color: var(--kl-accent); color: var(--kl-accent-foreground); }
  .kl-matches-swipe .pick:enabled:not([aria-pressed="true"]):hover { border-color: var(--kl-border-strong); }
  .kl-matches-swipe .tab:hover { color: var(--kl-text); }
}
@media (prefers-reduced-motion: no-preference) {
  .kl-matches-swipe :is(.button,.tile,.upload,.wardrobe-toggle,.tab) { transition: background-color 120ms ease-out, border-color 120ms ease-out, color 120ms ease-out; }
  .kl-matches-swipe .swipe-advanced .details, .kl-matches-swipe .swipe-dialog[open] .pair-portrait { animation: kl-matches-appear 220ms ease-out both; }
  .kl-matches-swipe .swipe-dialog[open] .pair-portrait:nth-child(2) { animation-delay: 35ms; }
  .kl-matches-swipe .swipe-dialog[open] .pair-heart .ico { animation: kl-matches-heart 360ms cubic-bezier(.2,.72,.24,1) 90ms both; }
}
@keyframes kl-matches-appear { from { opacity: .45; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes kl-matches-heart { 0% { opacity: .6; transform: scale(.82); } 65% { transform: scale(1.12); } 100% { transform: scale(1); } }
@media (prefers-reduced-motion: reduce) {
  .kl-matches-swipe :is(.swipe-face,.swipe-under) { transform: none !important; transition: none !important; }
  .kl-matches-swipe .swipe-rain { display: none; }
  .kl-matches-swipe .flag { transition: none; }
}
@media (pointer: coarse) {
  .kl-matches-swipe .tab { min-height: 44px; }
  .kl-matches-swipe .input, .kl-matches-swipe .matches-background-picker :is(.kl-input,.kl-select) { font-size: 16px; }
}
@media (hover: hover) and (pointer: fine) {
  @container kl-swipe (min-width: 740px) { .kl-matches-swipe .actions kbd { display: inline-block; } }
}
@container kl-swipe (min-width: 701px) {
  .kl-matches-swipe .setupPanel:has(.picks .pick) {
    grid-template-columns: minmax(0,.8fr) minmax(0,1.2fr); overflow: clip;
  }
  /* Keep the full character visible while the expanded Wardrobe scrolls beside it. */
  .kl-matches-swipe .setupPanel:has(.picks .pick) .portraitBox {
    position: sticky; top: 0; align-self: start; height: clamp(160px,calc(100cqh - 90px),740px);
  }
  .kl-matches-swipe .setupPanel:has(.picks .pick) .scene { height: auto; min-height: 0; flex: 1; }
}
@container kl-swipe (max-width: 700px) {
  .kl-matches-swipe .panel { grid-template-columns: minmax(0,1fr); }
  .kl-matches-swipe .tabs { margin-bottom: 10px; }
  .kl-matches-swipe .deck-art { margin: 6px 6px 0; }
  .kl-matches-swipe .side { gap: 12px; padding: 16px; }
  .kl-matches-swipe .setupPanel .side h2 { font-size: 22px; }
  .kl-matches-swipe .setupPanel .intro { font-size: var(--kl-type-body); }
  .kl-matches-swipe .setupPanel .where { padding: 6px 12px; }
  .kl-matches-swipe .savebar { padding-top: 10px; }
  .kl-matches-swipe .scene { height: clamp(180px,37cqh,350px); min-height: 0; flex: none; }
  .kl-matches-swipe .setupPanel .scene:has(.missing-look:not([hidden])) { height: clamp(145px,26cqh,225px); }
  .kl-matches-swipe .deck-art .scene { height: clamp(185px,40cqh,368px); min-height: 0; }
  .kl-matches-swipe .swipePanel .side { padding: 14px 15px 16px; gap: 12px; }
  .kl-matches-swipe .side h2.name { font-size: 28px; }
  .kl-matches-swipe .card-story { gap: 9px; }
  .kl-matches-swipe .card-story .bio { font-size: var(--kl-type-md); line-height: 1.43; }
  .kl-matches-swipe .card-identity { gap: 4px; }
  .kl-matches-swipe .decisions { padding-top: 12px; }
  .kl-matches-swipe .deck-position { top: 8px; left: 8px; }
  .kl-matches-swipe .deck-art .where { top: 8px; right: 8px; }
}
@container kl-swipe (max-width: 640px) {
  .kl-matches-swipe .matches { grid-template-columns: minmax(0,1fr); gap: 8px; }
  .kl-matches-swipe .tile { grid-template-columns: 64px minmax(0,1fr) auto; gap: 11px; }
  .kl-matches-swipe .tile .mini { height: 72px; }
}
@container kl-swipe (max-width: 475px) {
  .kl-matches-swipe .heading:has(+ .tabs:not([hidden])) .actions {
    display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); width: 100%;
  }
}
@container kl-swipe (max-width: 340px) {
  .kl-matches-swipe .heading { gap: 5px; margin-bottom: 4px; }
  .kl-matches-swipe .heading .actions { gap: 4px; }
  .kl-matches-swipe .heading .button { gap: 4px; padding-inline: 6px; }
  .kl-matches-swipe .tabs { gap: 12px; }
}
@container kl-swipe (max-width: 350px) {
  .kl-matches-swipe .setupPanel .scene { height: max(185px,28cqh); }
  .kl-matches-swipe .setupPanel .side { padding: 13px; }
  .kl-matches-swipe .setupPanel .side h2 { font-size: 20px; }
}
@container kl-workspace (max-height: 750px) {
  @container kl-swipe (max-width: 700px) {
    .kl-matches-swipe .swipePanel .side { grid-template-areas: "identity" "actions" "story"; gap: 10px; padding: 12px; }
    .kl-matches-swipe .card-story { padding-top: 10px; border-top: 1px solid var(--kl-border); }
    .kl-matches-swipe .deck-art .scene { height: clamp(165px,36cqh,252px); }
    .kl-matches-swipe .decisions { padding: 0; border: 0; }
  }
}
@container kl-workspace (max-height: 425px) {
  @container kl-swipe (max-width: 489px) {
    .kl-matches-swipe .deck-art .scene { height: clamp(122px,32cqh,155px); }
    .kl-matches-swipe .swipePanel .side { gap: 6px; padding: 9px 10px; }
    .kl-matches-swipe .card-identity { gap: 2px; }
    .kl-matches-swipe .side h2.name { font-size: 23px; }
    .kl-matches-swipe .tabs { margin-bottom: 6px; }
  }
}
/* On a landscape phone, the Club shell already uses enough height to put
   the first Like below the scrollport. Keep the deck navigation in one row. */
@container kl-workspace (orientation: landscape) and (max-height: 260px) and (min-width: 840px) {
  .kl-matches-swipe:has(> .tabs:not([hidden])) {
    display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: 4px 8px;
  }
  .kl-matches-swipe:has(> .tabs:not([hidden])) > .heading { justify-content: flex-start; margin: 0; }
  .kl-matches-swipe > .tabs:not([hidden]) { margin-bottom: 0; }
  .kl-matches-swipe > :not(.heading,.tabs) { grid-column: 1/-1; }
}
@container kl-workspace (orientation: landscape) and (max-height: 540px) {
  @container kl-swipe (min-width: 490px) {
    .kl-matches-swipe .swipePanel { grid-template-columns: minmax(0,.94fr) minmax(0,1fr); }
    .kl-matches-swipe .deck-art { margin: 5px 0 5px 5px; }
    .kl-matches-swipe .deck-art .scene { height: clamp(clamp(145px,calc(100cqh - 12px),179px),53cqh,260px); min-height: 0; flex: 1 0 auto; }
    .kl-matches-swipe .swipePanel .side { grid-template-areas: "identity" "actions" "story"; padding: 10px 15px; gap: 6px; }
    .kl-matches-swipe .side h2.name { font-size: 25px; }
    .kl-matches-swipe .card-story { gap: 4px; padding: 0; border: 0; }
    .kl-matches-swipe .card-story .bio { font-size: var(--kl-type-body); line-height: 1.3; }
    .kl-matches-swipe .card-story .tagset span { padding-block: 2px; }
    .kl-matches-swipe .decisions { margin: 2px 0; padding: 0; border: 0; }
  }
}
@container kl-workspace (max-height: 540px) {
  @container kl-swipe (min-width: 650px) {
    .kl-matches-swipe .setupPanel { grid-template-columns: minmax(0,1.05fr) minmax(0,1fr); }
    .kl-matches-swipe .setupPanel .scene { flex: 1; height: auto; min-height: 250px; }
    .kl-matches-swipe .setupPanel .side { padding: 15px; gap: 10px; }
    .kl-matches-swipe .setupPanel .side h2 { font-size: 23px; }
    .kl-matches-swipe .setupPanel .intro { font-size: calc(var(--kl-type-body) + 1px); }
    .kl-matches-swipe .setupPanel .where { padding: 9px 14px; }
    .kl-matches-swipe .setupPanel .savebar { padding-top: 14px; }
  }
}
@media (max-height: 480px) {
  .kl-matches-swipe .pair-portrait .mini { height: 96px; }
}
@media (forced-colors: active) {
  .kl-matches-swipe :is(.button,.upload,.pick,.tagset span) { border-color: ButtonText; }
  .kl-matches-swipe .tab[aria-current="page"]::after { border-bottom: 2px solid Highlight; }
  .kl-matches-swipe .pick[aria-pressed="true"] { border: 2px solid Highlight; }
}
`;
