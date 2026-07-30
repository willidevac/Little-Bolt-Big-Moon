import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { BackgroundRenderer } from "../../classes/systems/background-renderer.class.js";
import { GAME_CONFIG } from "../../js/config/game-config.js";
import { createLevelOne } from "../../js/levels/level-01.js";

const LAYER_NAMES = Object.freeze(["far", "mid", "near"]);
const EXPECTED_RATES = Object.freeze([0.72, 0.86, 1]);

/**
 * Prüft ein dreiteiliges Clean-HD-Hintergrundset vollständig.
 * @param {Readonly<object>} config
 */
export function verifyCleanHdBackground(config) {
  const level = createLevelOne(GAME_CONFIG.enemies);
  const files = createFiles(config.id);
  verifyFiles(config, files);
  verifyPngFiles(files);
  verifyLevelLayers(config, files, level);
  verifyMergedZone(config, level);
  verifyManifest(config.id, files);
  verifyCredits(config, files);
}

function createFiles(id) {
  return Object.freeze(LAYER_NAMES.map((name) => {
    return `img/backgrounds/${id}-${name}-clean-hd.png`;
  }));
}

function verifyFiles(config, files) {
  [...files, config.masterFile, config.compositeFile].forEach((file) => {
    assert.equal(existsSync(file), true, `Datei fehlt: ${file}`);
  });
}

function verifyPngFiles(files) {
  files.forEach((file, index) => {
    const header = readFileSync(file).subarray(0, 26);
    assert.equal(header.subarray(1, 4).toString(), "PNG");
    assert.equal(header.readUInt32BE(16), 1024);
    assert.equal(header.readUInt32BE(20), 1536);
    assert.equal(header[25], index === 0 ? 2 : 6);
  });
}

function verifyLevelLayers(config, files, level) {
  const sections = level.sections.slice(
    config.sectionStart,
    config.sectionStart + 3,
  );
  sections.forEach((section) => {
    const sources = section.backgroundLayers.map(({ source }) => source);
    const rates = section.backgroundLayers.map(({ scrollRate }) => scrollRate);
    assert.deepEqual(sources, files.map((file) => `./${file}`));
    assert.deepEqual(rates, EXPECTED_RATES);
  });
}

function verifyMergedZone(config, level) {
  const renderer = new BackgroundRenderer(
    level.sections,
    Object.freeze({ width: 1280, height: 720 }),
  );
  const zone = renderer.zones.find(({ id }) => id === config.id);
  assert.equal(zone.topY, config.topY);
  assert.equal(zone.bottomY, config.bottomY);
  assert.equal(zone.layers.length, 3);
}

function verifyManifest(id, files) {
  const assets = readJson("data/asset-manifest.json").assets;
  LAYER_NAMES.forEach((name, index) => {
    const asset = assets.find(({ id: assetId }) => {
      return assetId === `${id}-background-${name}`;
    });
    assert.equal(asset.file, files[index]);
    assert.deepEqual([asset.frameWidth, asset.frameHeight], [1024, 1536]);
  });
}

function verifyCredits(config, files) {
  const assets = readJson("data/asset-credits.json").assets;
  const creditFiles = assets.map(({ file }) => file);
  [...files, config.masterFile, config.compositeFile].forEach((file) => {
    assert.equal(creditFiles.includes(file), true);
  });
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}
