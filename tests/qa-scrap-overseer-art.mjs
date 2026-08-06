import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { SCRAP_OVERSEER_VISUAL_CONFIG } from
  "../js/config/scrap-overseer-visual-config.js";

const RUNTIME_FILE = "img/sprites/enemies/scrap-overseer-clean-hd.png";

assert.equal(existsSync(RUNTIME_FILE), true);
assertPngContract();
assertManifestContract();
assertCreditsContract();
assertRuntimeVisualContract();

console.log("ART-018: Eigenständige Tutorial-Bossdrohne mit vier Frames bestanden.");

/** Verifies exact runtime dimensions and an RGBA color channel. */
function assertPngContract() {
  const header = readFileSync(RUNTIME_FILE).subarray(0, 26);
  assert.equal(header.subarray(1, 4).toString(), "PNG");
  assert.equal(header.readUInt32BE(16), 768);
  assert.equal(header.readUInt32BE(20), 160);
  assert.equal(header[25], 6);
}

/** Verifies the exact grid and tutorial-only identity in the asset manifest. */
function assertManifestContract() {
  const assets = readJson("data/asset-manifest.json").assets;
  const overseer = assets.find(({ id }) => id === "scrap-overseer");
  assert.deepEqual([
    overseer.file, overseer.frameWidth, overseer.frameHeight,
    overseer.columns, overseer.rows, overseer.totalFrames,
  ], [RUNTIME_FILE, 192, 160, 4, 1, 4]);
  assert.deepEqual(overseer.states, { idle: 4 });
}

/** Verifies the generated asset's origin and project-local licensing record. */
function assertCreditsContract() {
  const credits = readJson("data/asset-credits.json").assets;
  const entry = credits.find(({ file }) => file === RUNTIME_FILE);
  assert.equal(entry.status, "approved");
  assert.equal(entry.licenseId, "openai-assisted-project-art");
  assert.doesNotMatch(entry.role, /moon|warden/i);
}

/** Verifies sprite, collision, and animation data for the future boss class. */
function assertRuntimeVisualContract() {
  const visual = SCRAP_OVERSEER_VISUAL_CONFIG;
  assert.deepEqual([
    visual.sprite.frameWidth,
    visual.sprite.frameHeight,
    visual.sprite.frameCount,
  ], [192, 160, 4]);
  assert.equal(visual.nativeFacingDirection, 1);
  assert.deepEqual(visual.collisionBox, {
    offsetX: 30, offsetY: 18, width: 132, height: 126,
  });
  assert.deepEqual(Object.keys(visual.animations), [
    "idle", "move", "attack", "hurt", "dead",
  ]);
}

/** Reads one immutable JSON data file. */
function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}
