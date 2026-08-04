import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const RUNTIME_FILE = "img/sprites/characters/byte-clean-hd.png";
const RUNTIME_CONFIG_FILE = "js/config/character-visual-config.js";

verifyFiles();
verifyPng();
verifyManifest();
verifyRuntimeConfig();
verifyCredits();

console.log("ART-005: Byte-Clean-HD-Runtime mit 33 Frames bestanden.");

function verifyFiles() {
  assert.equal(existsSync(RUNTIME_FILE), true);
}

function verifyPng() {
  const header = readFileSync(RUNTIME_FILE).subarray(0, 26);
  assert.equal(header.subarray(1, 4).toString(), "PNG");
  assert.equal(header.readUInt32BE(16), 512);
  assert.equal(header.readUInt32BE(20), 320);
  assert.equal(header[25], 6);
}

function verifyManifest() {
  const manifest = readJson("data/asset-manifest.json");
  const byte = manifest.assets.find((asset) => asset.id === "byte-character");
  assert.equal(byte.file, RUNTIME_FILE);
  assert.deepEqual(readGrid(byte), [64, 64, 8, 5, 33]);
  assert.equal(sumValues(byte.states), 33);
}

function verifyRuntimeConfig() {
  const source = readFileSync(RUNTIME_CONFIG_FILE, "utf8");
  assert.match(source, /getAssetPath\("characters", "byte-clean-hd\.png"\)/);
  assert.match(source, /frameWidth: 64,\s+frameHeight: 64/);
  assert.match(source, /const BYTE_RENDER_SCALE = 1;/);
  assert.match(source, /BYTE_GROUND_CONTACT_OFFSET_Y = 55/);
  assert.match(source, new RegExp(
    "offsetX: 12,\\s+offsetY: 6,\\s+width: 40,\\s+" +
    "height: BYTE_GROUND_CONTACT_OFFSET_Y - 6",
  ));
  assert.match(source, /offsetX: 16, offsetY: 50, width: 32, height: 14/);
}

function verifyCredits() {
  const credits = readJson("data/asset-credits.json").assets;
  assert.equal(hasCredit(credits, RUNTIME_FILE), true);
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function readGrid(asset) {
  return [
    asset.frameWidth,
    asset.frameHeight,
    asset.columns,
    asset.rows,
    asset.totalFrames,
  ];
}

function sumValues(values) {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

function hasCredit(credits, file) {
  return credits.some((credit) => credit.file === file);
}
