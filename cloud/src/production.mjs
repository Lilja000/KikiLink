// Deployment settings are public, not credentials. Exact origins only; the
// authenticated Member Number still comes from BC, never from an Origin header.
export const PRODUCTION_CLOUD_ORIGIN = "https://vps-18734a9e.vps.ovh.net";
export const PRODUCTION_BC_ORIGINS = Object.freeze([
  "https://bondage-europe.com", "https://www.bondage-europe.com",
  "https://bondageeurope.com", "https://www.bondageeurope.com",
  "https://bondageprojects.elementfx.com", "https://www.bondageprojects.elementfx.com",
  "https://bondageprojects.com", "https://www.bondageprojects.com",
  "https://bondage-asia.com", "https://www.bondage-asia.com",
]);
