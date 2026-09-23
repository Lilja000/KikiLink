import { PRODUCTION_CLOUD_ORIGIN } from "../cloud/src/production.mjs";

/** Resolve build inputs without changing files or contacting a service. */
export function resolveBuildConfig(args = [], env = {}) {
  const flags = new Set(args);
  const devTest = flags.has("--dev-test");
  const local = flags.has("--local") || devTest;
  const production = flags.has("--production") || !local;
  const trafficAudit = flags.has("--traffic-audit");
  const browserFixture = flags.has("--browser-fixture");
  const groupTrial = flags.has("--group-trial");
  const cloud = production || flags.has("--cloud");
  if (production && (devTest || trafficAudit || browserFixture || groupTrial)) {
    throw new Error("Production builds cannot include development fixtures or traffic instrumentation.");
  }
  if (production && env.KIKILINK_CLOUD_ORIGIN && env.KIKILINK_CLOUD_ORIGIN !== PRODUCTION_CLOUD_ORIGIN) {
    throw new Error("Production builds use the official Cloud origin; use --local --cloud for staging.");
  }
  if (groupTrial && (!cloud || !devTest || browserFixture)) {
    throw new Error("Group trial requires the private Cloud DevTest build.");
  }
  if (browserFixture && !cloud) throw new Error("Browser fixtures require an explicit local Cloud build.");
  const cloudOrigin = production ? PRODUCTION_CLOUD_ORIGIN : cloud ? env.KIKILINK_CLOUD_ORIGIN ?? "" : "";
  if (browserFixture && !/^https:\/\/browser-[a-f0-9]{16}\.example\.invalid$/.test(cloudOrigin)) {
    throw new Error("Browser fixtures require a disposable example.invalid origin.");
  }
  if (cloud) {
    const origin = new URL(cloudOrigin);
    const base = `${origin.origin}${origin.pathname === "/" ? "" : origin.pathname.replace(/\/$/u, "")}`;
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash ||
        !/^\/(?:[A-Za-z0-9._~-]+\/?)*$/u.test(origin.pathname) || base !== cloudOrigin) {
      throw new Error("Set KIKILINK_CLOUD_ORIGIN to an exact HTTPS Cloud base URL.");
    }
  }
  return {
    devTest, local, production, cloud, trafficAudit, browserFixture, groupTrial, cloudOrigin,
    // Local scope guards are not an identity proof. The server authenticates every login.
    cloudTestMember: cloud && devTest && !browserFixture ? 95634 : 0,
    cloudTestMembers: groupTrial ? [72385, 95634, 259875] : [],
    outputDirectory: production ? (local ? ".local-dev/production" : "dist")
      : trafficAudit ? (cloud ? ".local-dev/network-audit-cloud" : ".local-dev/network-audit")
      : groupTrial ? ".local-dev/cloud-group-devtest"
      : browserFixture ? ".local-dev/browser-cloud/bundle"
      : cloud ? (devTest ? ".local-dev/cloud-devtest" : ".local-dev/cloud")
      : devTest ? ".local-dev/devtest" : ".local-dev/dist",
  };
}
