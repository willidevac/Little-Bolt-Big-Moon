import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const RUNTIME_FILE = "img/sprites/enemies/moon-warden-clean-hd.png";
const MASTER_FILE =
  "img/concepts/approvals/moon-warden-clean-hd-production-layout-v1.png";
const CLASS_FILE = "classes/entities/enemies/moon-warden.class.js";

verifyFiles();
verifyPng();
verifyManifest();
verifyRuntimeConfig();
verifyCredits();

console.log("ART-015: Moon Warden mit 26 Clean-HD-Frames bestanden.");

function verifyFiles() {
  assert.equal(existsSync(RUNTIME_FILE), true);
  assert.equal(existsSync(MASTER_FILE), true);
}

function verifyPng() {
  const header = readFileSync(RUNTIME_FILE).subarray(0, 26);
  assert.equal(header.subarray(1, 4).toString(), "PNG");
  assert.equal(header.readUInt32BE(16), 1344);
  assert.equal(header.readUInt32BE(20), 768);
  assert.equal(header[25], 6);
}

function verifyManifest() {
  const assets = readJson("data/asset-manifest.json").assets;
  const warden = assets.find((asset) => asset.id === "moon-warden");
  assert.deepEqual(readGrid(warden), [RUNTIME_FILE, 192, 192, 7, 4, 26]);
  assert.equal(sumValues(warden.states), 26);
}

function verifyRuntimeConfig() {
  const source = readFileSync(CLASS_FILE, "utf8");
  assert.match(source, /"moon-warden-clean-hd\.png"/);
  assert.match(source, /frameWidth: 192,\s+frameHeight: 192,\s+frameCount: 26/);
  assert.match(source, /renderScale: 1/);
  assert.match(source, /offsetX: 24,\s+offsetY: 16,\s+width: 144,\s+height: 168/);
}

function verifyCredits() {
  const files = readJson("data/asset-credits.json").assets.map(({ file }) => file);
  assert.equal(files.includes(RUNTIME_FILE), true);
  assert.equal(files.includes(MASTER_FILE), true);
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function readGrid(asset) {
  return [
    asset.file,
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
