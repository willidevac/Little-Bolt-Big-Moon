import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const RUNTIME_FILE = "img/sprites/enemies/drone-guard-clean-hd.png";
const MASTER_FILE =
  "img/concepts/approvals/drone-guard-clean-hd-production-layout-v1.png";
const CLASS_FILE = "classes/entities/enemies/drone-guard.class.js";

verifyFiles();
verifyPng();
verifyManifest();
verifyRuntimeConfig();
verifyCredits();

console.log("ART-014: Drone Guard mit 20 Clean-HD-Frames bestanden.");

function verifyFiles() {
  assert.equal(existsSync(RUNTIME_FILE), true);
  assert.equal(existsSync(MASTER_FILE), true);
}

function verifyPng() {
  const header = readFileSync(RUNTIME_FILE).subarray(0, 26);
  assert.equal(header.subarray(1, 4).toString(), "PNG");
  assert.equal(header.readUInt32BE(16), 480);
  assert.equal(header.readUInt32BE(20), 256);
  assert.equal(header[25], 6);
}

function verifyManifest() {
  const assets = readJson("data/asset-manifest.json").assets;
  const drone = assets.find((asset) => asset.id === "drone-guard");
  assert.deepEqual(readGrid(drone), [RUNTIME_FILE, 96, 64, 5, 4, 20]);
  assert.equal(sumValues(drone.states), 20);
}

function verifyRuntimeConfig() {
  const source = readFileSync(CLASS_FILE, "utf8");
  assert.match(source, /"drone-guard-clean-hd\.png"/);
  assert.match(source, /frameWidth: 96,\s+frameHeight: 64,\s+frameCount: 20/);
  assert.match(source, /renderScale: 1/);
  assert.match(source, /offsetX: 14,\s+offsetY: 10,\s+width: 68,\s+height: 42/);
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
