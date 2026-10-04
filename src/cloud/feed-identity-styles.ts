/** Creator identity is tied to the authenticated member number, never the name.
 * A static gradient reuses the red/gold palette without animation or extra DOM. */
export const FEED_IDENTITY_STYLES = `
.kl-cloud .kl-feed-administrator { color:var(--kl-gold); }
.kl-cloud .kl-social-name[data-creator="true"]:not([data-loading="true"])>span { color:var(--kl-gold); }
@supports (background-clip:text) or (-webkit-background-clip:text) {
  .kl-cloud .kl-social-name[data-creator="true"]:not([data-loading="true"])>span {
    background-image:linear-gradient(100deg,#ed2844 0%,#df654c 35%,#d8b65d 73%,#c4a354 100%);
    background-clip:text; -webkit-background-clip:text; color:transparent; -webkit-text-fill-color:transparent;
  }
}
@media (forced-colors:active) {
  .kl-cloud .kl-social-name[data-creator="true"]:not([data-loading="true"])>span { background:none; color:ButtonText; -webkit-text-fill-color:ButtonText; }
  .kl-cloud .kl-feed-administrator { color:CanvasText; }
}
`;
