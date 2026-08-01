import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIRECTORY = fileURLToPath(new URL(".", import.meta.url));
const CURRENT_FILE = path.basename(fileURLToPath(import.meta.url));
const REQUIRED_JOURNEYS = Object.freeze([
  "qa-game-states.mjs",
  "qa-review-mode.mjs",
  "qa-review-lifecycle.mjs",
  "qa-touch-input.mjs",
  "qa-localization.mjs",
  "qa-responsive-world.mjs",
  "qa-runtime.mjs",
]);

const checks = await discoverChecks();
assertRequiredJourneys(checks);
const results = checks.map(runCheck);
const failures = results.filter(({ status }) => status !== 0);
assert.deepEqual(failures, []);

console.log(
  `QA-005: ${results.length} Pflichtbereiche auf ${readRevision()} bestanden.`,
);

async function discoverChecks() {
  const entries = await fs.readdir(TEST_DIRECTORY, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && isQaFile(entry.name))
    .map(({ name }) => name)
    .sort();
}

function isQaFile(file) {
  return file.startsWith("qa-") && file.endsWith(".mjs") && file !== CURRENT_FILE;
}

function assertRequiredJourneys(checksToRun) {
  const missing = REQUIRED_JOURNEYS.filter((file) => !checksToRun.includes(file));
  assert.deepEqual(missing, [], "Ein verbindlicher Release-Weg fehlt.");
}

function runCheck(file) {
  const result = runProcess(process.execPath, [path.join(TEST_DIRECTORY, file)]);
  return { file, status: result.status, error: result.stderr.trim() };
}

function readRevision() {
  const commit = runProcess("git", ["rev-parse", "--short", "HEAD"]);
  const status = runProcess("git", ["status", "--porcelain"]);
  assert.equal(commit.status, 0, commit.stderr);
  assert.equal(status.status, 0, status.stderr);
  const suffix = status.stdout.trim() ? " plus geprueftem Arbeitsstand" : "";
  return `Commit ${commit.stdout.trim()}${suffix}`;
}

function runProcess(command, parameters) {
  return spawnSync(command, parameters, {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
  });
}
