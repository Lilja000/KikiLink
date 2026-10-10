import { describe, expect, it, vi } from "vitest";
// @ts-expect-error Standalone Node release script has no TypeScript declaration.
import { publishRelease } from "../scripts/publish-release.mjs";

const COMMIT = "a".repeat(40);
const OTHER_COMMIT = "b".repeat(40);
const REPOSITORY = "Lilja000/KikiLink";
const RUN = {
  name: "CI", status: "completed", conclusion: "success", event: "push",
  head_branch: "main", head_repository: { full_name: REPOSITORY }, head_sha: COMMIT,
};

function fixture({ heads = [COMMIT], tag = false, release = false } = {}) {
  const remainingHeads = [...heads];
  const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname;
    if (init?.method === "POST") return new Response("{}", { status: 201 });
    if (path.endsWith("/git/ref/heads/main")) {
      const sha = remainingHeads.length > 1 ? remainingHeads.shift() : remainingHeads[0];
      return Response.json({ object: { sha } });
    }
    if (path.endsWith("/git/ref/tags/v1.1.8")) {
      return Response.json({ object: { sha: OTHER_COMMIT } }, { status: tag ? 200 : 404 });
    }
    if (path.endsWith("/releases/tags/v1.1.8")) {
      return Response.json({ tag_name: "v1.1.8" }, { status: release ? 200 : 404 });
    }
    throw new Error("Unexpected request");
  });
  const options = {
    repository: REPOSITORY, commit: COMMIT, version: "1.1.8",
    workflowRun: RUN, token: "test-token", fetchImpl,
  };
  return { options, fetchImpl };
}

describe("stable release publication", () => {
  it.each([
    { conclusion: "failure" },
    { status: "in_progress" },
    { name: "Other workflow" },
    { event: "pull_request" },
    { head_branch: "feature" },
    { head_repository: { full_name: "fork/KikiLink" } },
    { head_sha: OTHER_COMMIT },
  ])("does not contact GitHub for an ineligible CI run: %j", async (change) => {
    const { options, fetchImpl } = fixture();
    expect(await publishRelease({ ...options, workflowRun: { ...RUN, ...change } }))
      .toEqual({ status: "skipped", reason: "ineligible-ci-run" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each(["1.1.8-beta.1", "1.1.8+build", "v1.1.8", "01.1.8", "1.1", "1.1.9007199254740992"])(
    "rejects a non-stable or invalid package version: %s", async (version) => {
      const { options, fetchImpl } = fixture();
      await expect(publishRelease({ ...options, version })).rejects.toThrow("stable semantic version");
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it("skips a completed CI run for a main commit that has been superseded", async () => {
    const { options, fetchImpl } = fixture({ heads: [OTHER_COMMIT] });
    expect(await publishRelease(options)).toEqual({ status: "skipped", reason: "stale-commit" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rechecks main after inspecting the version", async () => {
    const { options, fetchImpl } = fixture({ heads: [COMMIT, OTHER_COMMIT] });
    expect(await publishRelease(options)).toEqual({ status: "skipped", reason: "stale-commit" });
    expect(fetchImpl.mock.calls.every(([, init]) => init?.method === "GET")).toBe(true);
  });

  it.each([
    { tag: true, release: false, reason: "existing-tag" },
    { tag: false, release: true, reason: "existing-release" },
  ])("never modifies an existing version: $reason", async ({ reason, ...existing }) => {
    const { options, fetchImpl } = fixture(existing);
    expect(await publishRelease(options)).toEqual({ status: "skipped", reason, tag: "v1.1.8" });
    expect(fetchImpl.mock.calls.every(([, init]) => init?.method === "GET")).toBe(true);
  });

  it("creates a stable release at exactly the verified commit", async () => {
    const { options, fetchImpl } = fixture();
    expect(await publishRelease(options)).toEqual({ status: "published", tag: "v1.1.8", commit: COMMIT });
    const posts = fetchImpl.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(posts).toHaveLength(1);
    expect(posts[0]?.[0]).toBe(`https://api.github.com/repos/${REPOSITORY}/releases`);
    expect(JSON.parse(String(posts[0]?.[1]?.body))).toMatchObject({
      tag_name: "v1.1.8", target_commitish: COMMIT, draft: false, prerelease: false,
    });
    expect(posts[0]?.[1]?.redirect).toBe("error");
  });

  it("performs no writes during a dry run", async () => {
    const { options, fetchImpl } = fixture();
    expect(await publishRelease({ ...options, dryRun: true }))
      .toEqual({ status: "dry-run", tag: "v1.1.8", commit: COMMIT });
    expect(fetchImpl.mock.calls.every(([, init]) => init?.method === "GET")).toBe(true);
  });

  it("fails closed on API errors without reporting response bodies or credentials", async () => {
    const { options, fetchImpl } = fixture();
    fetchImpl.mockResolvedValueOnce(new Response("private API error test-token", { status: 403 }));
    await expect(publishRelease(options)).rejects.toThrow(/^GitHub API GET failed \(HTTP 403\)\.$/u);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
