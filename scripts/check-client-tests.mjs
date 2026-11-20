import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const vitest = resolve(root, "node_modules/vitest/vitest.mjs");
const largeSuites = [
  "tests/platform-view.test.ts",
  "tests/platform-invitation-review.test.ts",
];
const batchSize = 15;

function runVitest(...args) {
  execFileSync(process.execPath, [vitest, ...args], { cwd: root, stdio: "inherit" });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function checkSuite(file, temporary) {
  const testPath = resolve(root, file);
  const base = basename(file);
  const listPath = join(temporary, `${base}.list.json`);
  runVitest("list", file, "--maxWorkers=1", `--json=${listPath}`);
  const collected = readJson(listPath);
  assert.ok(collected.length > 0, `No tests collected in ${file}`);
  assert.ok(collected.every(test => resolve(test.file) === testPath), `Unexpected file collected for ${file}`);

  // The list command separates suite names with " > "; the run reporter uses spaces.
  const names = collected.map(test => test.name.replaceAll(" > ", " "));
  const uniqueNames = [...new Set(names)];
  for (let start = 0; start < uniqueNames.length; start += batchSize) {
    const batch = uniqueNames.slice(start, start + batchSize);
    const pattern = batch.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const reportPath = join(temporary, `${base}.${start}.json`);
    runVitest("run", file, "--maxWorkers=1", "--testTimeout=18000", "--reporter=default",
      "--reporter=json", `--outputFile.json=${reportPath}`, "--testNamePattern", `^(?:${pattern})$`);

    const { testResults } = readJson(reportPath);
    assert.deepEqual(testResults.map(result => resolve(result.name)), [testPath]);
    const passed = testResults[0].assertionResults
      .filter(result => result.status === "passed").map(result => result.fullName).sort();
    const expected = names.filter(name => batch.includes(name)).sort();
    assert.deepEqual(passed, expected, `Test coverage mismatch in ${file} at batch offset ${start}`);
  }
  console.log(`Verified all ${names.length} tests in ${file}`);
}

runVitest("run", "--maxWorkers=3", ...largeSuites.flatMap(file => ["--exclude", file]));

// These suites exhaust the worker heap when run as a whole. Fresh processes
// release the retained DOM between batches, and reports verify full coverage.
const temporary = mkdtempSync(join(tmpdir(), "kikilink-client-tests-"));
try {
  for (const file of largeSuites) checkSuite(file, temporary);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
