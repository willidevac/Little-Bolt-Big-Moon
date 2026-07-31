import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const MASTERS = Object.freeze([
  "img/concepts/approvals/collectables-clean-hd-production-layout-v1.png",
  "img/concepts/approvals/upgrade-icons-clean-hd-production-layout-v1.png",
  "img/concepts/approvals/gameplay-effects-clean-hd-production-layout-v1.png",
]);
const ASSETS = Object.freeze([
  ["collectable-items", "img/sprites/items/collectables-clean-hd.png",
    64, 64, 5, 3, 15],
  ["upgrade-icons", "img/sprites/items/upgrade-icons-clean-hd.png",
    64, 64, 5, 1, 5],
  ["gameplay-effects", "img/sprites/effects/gameplay-effects-clean-hd.png",
    64, 64, 6, 4, 23],
  ["arc-charge", "img/sprites/items/arc-charge-clean-hd.png",
    48, 72, 1, 1, 1],
]);
const EXPECTED_UPGRADE_SHEET = Object.freeze({
  source: `./${ASSETS[1][1]}`,
  frameWidth: 64,
  frameHeight: 64,
});

verifyFilesAndPngs();
verifyManifest();
verifyRuntimeConfig();
verifyCredits();

console.log("ART-017: 44 Clean-HD-Collectible-, Upgrade- und Effektframes bestanden.");

function verifyFilesAndPngs() {
  MASTERS.forEach((file) => assert.equal(existsSync(file), true));
  ASSETS.forEach(([, file, width, height, columns, rows]) => {
    assert.equal(existsSync(file), true);
    assertPng(file, width * columns, height * rows);
  });
}

function assertPng(file, width, height) {
  const header = readFileSync(file).subarray(0, 26);
  assert.equal(header.subarray(1, 4).toString(), "PNG");
  assert.equal(header.readUInt32BE(16), width);
  assert.equal(header.readUInt32BE(20), height);
  assert.equal(header[25], 6);
}

function verifyManifest() {
  const manifest = readJson("data/asset-manifest.json").assets;
  ASSETS.forEach(([id, file, width, height, columns, rows, frames]) => {
    const asset = manifest.find((entry) => entry.id === id);
    assert.deepEqual(readGrid(asset), [
      file, width, height, columns, rows, frames,
    ]);
  });
}

function verifyRuntimeConfig() {
  const collectable = readSource("classes/entities/collectables/collectable-object.class.js");
  const story = readSource("js/config/story-prop-config.js");
  const upgrades = readJson("data/upgrades.json").iconSheet;
  const css = readSource("styles/upgrades.css");
  assert.match(collectable, /"collectables-clean-hd\.png"[\s\S]*frameWidth: 64/);
  assert.match(collectable, /"arc-charge-clean-hd\.png"[\s\S]*frameWidth: 48/);
  assert.match(story, /"collectables-clean-hd\.png"/);
  assert.deepEqual(upgrades, EXPECTED_UPGRADE_SHEET);
  assert.match(css, /image-rendering: auto/);
}

function verifyCredits() {
  const files = readJson("data/asset-credits.json").assets.map(({ file }) => file);
  [...MASTERS, ...ASSETS.map(([, file]) => file)].forEach((file) => {
    assert.equal(files.includes(file), true);
  });
}

function readGrid(asset) {
  return [asset.file, asset.frameWidth, asset.frameHeight,
    asset.columns, asset.rows, asset.totalFrames];
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function readSource(file) {
  return readFileSync(file, "utf8");
}
