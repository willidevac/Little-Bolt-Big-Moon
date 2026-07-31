import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const CHECKS = Object.freeze([
  Object.freeze({ id: "clean-code", file: "tests/qa-clean-code.mjs" }),
  Object.freeze({ id: "hitboxen", file: "tests/qa-collision-boundaries.mjs" }),
  Object.freeze({ id: "levelroute", file: "tests/qa-full-route.mjs" }),
  Object.freeze({ id: "challenge-raeume", file: "tests/qa-challenge-rooms.mjs" }),
  Object.freeze({ id: "biom-challenges", file: "tests/qa-biome-challenges.mjs" }),
  Object.freeze({ id: "risiko-routen", file: "tests/qa-risk-routes.mjs" }),
  Object.freeze({ id: "mentor-review", file: "tests/qa-review-mode.mjs" }),
  Object.freeze({ id: "start-sieg-restart", file: "tests/qa-game-states.mjs" }),
  Object.freeze({ id: "responsive", file: "tests/qa-responsive-world.mjs" }),
  Object.freeze({ id: "runtime-assets", file: "tests/qa-runtime.mjs" }),
  Object.freeze({ id: "speicher-audio", file: "tests/qa-storage-audio.mjs" }),
  Object.freeze({ id: "multitouch", file: "tests/qa-touch-input.mjs" }),
  Object.freeze({ id: "links-dialoge", file: "tests/qa-ui-contract.mjs" }),
  Object.freeze({ id: "waffenlauf", file: "tests/qa-weapon-run.mjs" }),
  Object.freeze({ id: "lichtbogenkanone", file: "tests/qa-arc-cannon.mjs" }),
  Object.freeze({ id: "upgrade-seltenheiten", file: "tests/qa-upgrade-rarities.mjs" }),
  Object.freeze({ id: "combo-wertung", file: "tests/qa-combo-score.mjs" }),
  Object.freeze({ id: "byte-clean-hd", file: "tests/qa-byte-clean-hd.mjs" }),
  Object.freeze({
    id: "schrottplatz-clean-hd",
    file: "tests/qa-scrapyard-clean-hd.mjs",
  }),
  Object.freeze({
    id: "scrap-crawler-clean-hd",
    file: "tests/qa-scrap-crawler-clean-hd.mjs",
  }),
  Object.freeze({
    id: "drone-guard-clean-hd",
    file: "tests/qa-drone-guard-clean-hd.mjs",
  }),
  Object.freeze({
    id: "moon-warden-clean-hd",
    file: "tests/qa-moon-warden-clean-hd.mjs",
  }),
  Object.freeze({
    id: "weapons-projectiles-clean-hd",
    file: "tests/qa-weapons-projectiles-clean-hd.mjs",
  }),
  Object.freeze({
    id: "collectibles-effects-clean-hd",
    file: "tests/qa-collectibles-effects-clean-hd.mjs",
  }),
  Object.freeze({
    id: "factory-tiles-clean-hd",
    file: "tests/qa-factory-tiles-clean-hd.mjs",
  }),
  Object.freeze({
    id: "launch-tower-tiles-clean-hd",
    file: "tests/qa-launch-tower-tiles-clean-hd.mjs",
  }),
  Object.freeze({
    id: "space-station-tiles-clean-hd",
    file: "tests/qa-space-station-tiles-clean-hd.mjs",
  }),
  Object.freeze({
    id: "moon-tiles-clean-hd",
    file: "tests/qa-moon-tiles-clean-hd.mjs",
  }),
  Object.freeze({ id: "hud-clean-hd", file: "tests/qa-hud-clean-hd.mjs" }),
  Object.freeze({
    id: "scrapyard-background-clean-hd",
    file: "tests/qa-scrapyard-background-clean-hd.mjs",
  }),
  Object.freeze({
    id: "factory-background-clean-hd",
    file: "tests/qa-factory-background-clean-hd.mjs",
  }),
  Object.freeze({
    id: "launch-tower-background-clean-hd",
    file: "tests/qa-launch-tower-background-clean-hd.mjs",
  }),
  Object.freeze({
    id: "space-station-background-clean-hd",
    file: "tests/qa-space-station-background-clean-hd.mjs",
  }),
  Object.freeze({
    id: "moon-background-clean-hd",
    file: "tests/qa-moon-background-clean-hd.mjs",
  }),
  Object.freeze({ id: "bosslauf", file: "tests/qa-boss-run.mjs" }),
  Object.freeze({ id: "boss-arena", file: "tests/qa-boss-arena.mjs" }),
  Object.freeze({ id: "gegnerdichte", file: "tests/qa-enemy-density.mjs" }),
  Object.freeze({ id: "abschlusskorrekturen", file: "tests/qa-tracking-fixes.mjs" }),
  Object.freeze({ id: "umweltgeschichte", file: "tests/qa-story-run.mjs" }),
  Object.freeze({ id: "story-positionen", file: "tests/qa-story-placement.mjs" }),
  Object.freeze({ id: "storysequenzen", file: "tests/qa-story-sequences.mjs" }),
  Object.freeze({
    id: "weiterbildungs-checkliste",
    file: "tests/qa-course-checklist.mjs",
  }),
  Object.freeze({
    id: "lokalisierung",
    file: "tests/qa-localization.mjs",
  }),
]);

const results = CHECKS.map(runCheck);
const failures = results.filter((result) => result.status !== 0);
assert.deepEqual(failures, []);

console.log(
  `QA-005: ${results.length} Pflichtbereiche auf ${readRevision()} bestanden.`,
);

function runCheck(check) {
  const result = runProcess(process.execPath, [check.file]);
  return {
    id: check.id,
    file: check.file,
    status: result.status,
    error: result.stderr.trim(),
  };
}

function readRevision() {
  const commit = runProcess("git", ["rev-parse", "--short", "HEAD"]);
  const status = runProcess("git", ["status", "--porcelain"]);
  assert.equal(commit.status, 0, commit.stderr);
  assert.equal(status.status, 0, status.stderr);
  const suffix = status.stdout.trim() ? " plus geprüftem Arbeitsstand" : "";
  return `Commit ${commit.stdout.trim()}${suffix}`;
}

function runProcess(command, parameters) {
  return spawnSync(command, parameters, {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
  });
}
