import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { BackgroundRenderer } from "../classes/systems/background-renderer.class.js";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";

const LAYER_NAMES = Object.freeze(["far", "mid", "near"]);
const LAYER_FILES = Object.freeze(LAYER_NAMES.map((name) => {
  return `img/backgrounds/scrapyard-${name}-clean-hd.png`;
}));
const RUNTIME_LAYER_FILES = Object.freeze(LAYER_FILES.map((file) => {
  return `./${file}`;
}));
const MASTER_FILE =
  "img/concepts/approvals/scrapyard-clean-hd-background-master-v1.png";
const COMPOSITE_FILE =
  "img/concepts/approvals/scrapyard-clean-hd-background-composite-v1.png";
const level = createLevelOne(GAME_CONFIG.enemies);

verifyFiles();
verifyPngFiles();
verifyLevelLayers();
verifyMergedZone();
verifyManifest();
verifyCredits();

console.log("ART-009: Clean-HD-Schrottplatz-Parallaxset bestanden.");

function verifyFiles() {
  [...LAYER_FILES, MASTER_FILE, COMPOSITE_FILE].forEach((file) => {
    assert.equal(existsSync(file), true, `Datei fehlt: ${file}`);
  });
}

function verifyPngFiles() {
  LAYER_FILES.forEach((file, index) => {
    const header = readFileSync(file).subarray(0, 26);
    assert.equal(header.subarray(1, 4).toString(), "PNG");
    assert.equal(header.readUInt32BE(16), 1024);
    assert.equal(header.readUInt32BE(20), 1536);
    assert.equal(header[25], index === 0 ? 2 : 6);
  });
}

function verifyLevelLayers() {
  const sections = level.sections.slice(0, 3);
  const expectedRates = [0.72, 0.86, 1];
  sections.forEach((section) => {
    assert.deepEqual(
      section.backgroundLayers.map(({ source }) => source),
      RUNTIME_LAYER_FILES,
    );
    assert.deepEqual(
      section.backgroundLayers.map(({ scrollRate }) => scrollRate),
      expectedRates,
    );
  });
}

function verifyMergedZone() {
  const renderer = new BackgroundRenderer(
    level.sections,
    Object.freeze({ width: 1280, height: 720 }),
  );
  const scrapyard = renderer.zones.find(({ id }) => id === "scrapyard");
  assert.equal(renderer.zones.length, 13);
  assert.equal(scrapyard.topY, 120000);
  assert.equal(scrapyard.bottomY, 150000);
  assert.equal(scrapyard.layers.length, 3);
}

function verifyManifest() {
  const assets = readJson("data/asset-manifest.json").assets;
  LAYER_NAMES.forEach((name, index) => {
    const asset = assets.find(({ id }) => {
      return id === `scrapyard-background-${name}`;
    });
    assert.equal(asset.file, LAYER_FILES[index]);
    assert.deepEqual([asset.frameWidth, asset.frameHeight], [1024, 1536]);
  });
}

function verifyCredits() {
  const files = readJson("data/asset-credits.json").assets.map(({ file }) => file);
  [...LAYER_FILES, MASTER_FILE, COMPOSITE_FILE].forEach((file) => {
    assert.equal(files.includes(file), true);
  });
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}
