import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

class ReleaseError extends Error {}

/** Publish only a successful main CI commit; injectable fetch keeps tests offline. */
export async function publishRelease({
  repository, commit, version, workflowRun, token, dryRun = false, fetchImpl = fetch,
}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository ?? "") ||
      !/^[a-f0-9]{40}$/u.test(commit ?? "")) {
    throw new ReleaseError("Invalid repository or release commit.");
  }
  if (workflowRun?.name !== "CI" || workflowRun.status !== "completed" ||
      workflowRun.conclusion !== "success" || workflowRun.event !== "push" ||
      workflowRun.head_branch !== "main" ||
      workflowRun.head_repository?.full_name !== repository ||
      workflowRun.head_sha !== commit) {
    return { status: "skipped", reason: "ineligible-ci-run" };
  }
  if (typeof version !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.test(version) ||
      version.split(".").some((part) => !Number.isSafeInteger(Number(part)))) {
    throw new ReleaseError("Package version must be a stable semantic version.");
  }
  if (!token) throw new ReleaseError("GITHUB_TOKEN is required.");

  const tag = `v${version}`;
  const base = `https://api.github.com/repos/${repository}`;
  async function request(path, { method = "GET", body, allowMissing = false } = {}) {
    const response = await fetchImpl(`${base}${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    if (allowMissing && response.status === 404) return null;
    if (!response.ok) {
      // API bodies and headers may contain private context; do not log them.
      throw new ReleaseError(`GitHub API ${method} failed (HTTP ${response.status}).`);
    }
    return response.json();
  }

  const currentHead = async () => (await request("/git/ref/heads/main"))?.object?.sha;
  if (await currentHead() !== commit) return { status: "skipped", reason: "stale-commit" };

  // Existing versions are immutable, including a tag without a published release.
  if (await request(`/git/ref/tags/${tag}`, { allowMissing: true })) {
    return { status: "skipped", reason: "existing-tag", tag };
  }
  if (await request(`/releases/tags/${tag}`, { allowMissing: true })) {
    return { status: "skipped", reason: "existing-release", tag };
  }
  // Another push may have completed while the version checks were in flight.
  if (await currentHead() !== commit) return { status: "skipped", reason: "stale-commit" };
  if (dryRun) return { status: "dry-run", tag, commit };

  await request("/releases", {
    method: "POST",
    body: {
      tag_name: tag,
      target_commitish: commit,
      name: `KikiLink ${version}`,
      body: `Stable build from ${commit}, verified by CI.`,
      draft: false,
      prerelease: false,
    },
  });
  return { status: "published", tag, commit };
}

async function main() {
  if (process.env.GITHUB_EVENT_NAME !== "workflow_run" ||
      process.argv.slice(2).some((arg) => arg !== "--dry-run")) {
    throw new ReleaseError("Run from a completed CI workflow_run; only --dry-run is supported.");
  }
  const [event, pkg] = await Promise.all([
    readFile(process.env.GITHUB_EVENT_PATH, "utf8").then(JSON.parse),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  const result = await publishRelease({
    repository: process.env.GITHUB_REPOSITORY,
    commit: process.env.RELEASE_COMMIT,
    version: pkg.version,
    workflowRun: event.workflow_run,
    token: process.env.GITHUB_TOKEN,
    dryRun: process.argv.includes("--dry-run"),
  });
  console.log(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof ReleaseError ? error.message : "Stable release failed; check the runner and GitHub API connectivity.");
    process.exitCode = 1;
  });
}
