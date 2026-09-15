import { execFileSync, spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const code = `import { resolveBuildConfig } from './scripts/build-config.mjs';
const [args, env] = JSON.parse(process.argv[1]);
console.log(JSON.stringify(resolveBuildConfig(args, env)));`;
function config(args: string[] = [], env: Record<string, string> = {}) {
  return JSON.parse(execFileSync(process.execPath,
    ["--input-type=module", "-e", code, JSON.stringify([args, env])], { encoding: "utf8" }));
}
function rejected(args: string[], env: Record<string, string> = {}) {
  return spawnSync(process.execPath,
    ["--input-type=module", "-e", code, JSON.stringify([args, env])], { encoding: "utf8" }).status;
}

describe("production configuration", () => {
  it("enables the official service without a development member allowlist", () => {
    expect(config()).toMatchObject({ production: true, cloud: true,
      cloudOrigin: "https://vps-18734a9e.vps.ovh.net", cloudTestMember: 0,
      cloudTestMembers: [], devTest: false, trafficAudit: false, outputDirectory: "dist" });
  });
  it("uses identical production inputs for the isolated final Local artifact", () => {
    const { local: _local, outputDirectory: _output, ...release } = config();
    expect(config(["--local", "--production"])).toEqual({ ...release,
      local: true, outputDirectory: ".local-dev/production" });
  });
  it("refuses development-only features and an overridden production service", () => {
    for (const flag of ["--dev-test", "--group-trial", "--browser-fixture", "--traffic-audit"]) {
      expect(rejected(["--production", "--local", flag])).not.toBe(0);
    }
    expect(rejected([], { KIKILINK_CLOUD_ORIGIN: "https://staging.example.invalid" })).not.toBe(0);
  });
  it("keeps ordinary local builds offline and explicit staging builds isolated", () => {
    expect(config(["--local"])).toMatchObject({ cloud: false, cloudOrigin: "", production: false,
      outputDirectory: ".local-dev/dist" });
    expect(config(["--local", "--cloud"], { KIKILINK_CLOUD_ORIGIN: "https://staging.example.invalid" }))
      .toMatchObject({ cloudOrigin: "https://staging.example.invalid", outputDirectory: ".local-dev/cloud",
        cloudTestMember: 0, production: false });
  });
  it("retains staging origin validation", () => {
    for (const origin of ["", "http://staging.example.invalid", "https://staging.example.invalid/path",
      "https://user:password@staging.example.invalid"]) {
      expect(rejected(["--local", "--cloud"], { KIKILINK_CLOUD_ORIGIN: origin })).not.toBe(0);
    }
  });
});
