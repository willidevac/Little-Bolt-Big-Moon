import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const TILE_FILE = "img/tilesets/scrapyard-tiles-clean-hd.png";
const HAZARD_FILE = "img/tilesets/scrapyard-hazards-clean-hd.png";

verifyFiles();
verifyPng(TILE_FILE, 512, 256);
verifyPng(HAZARD_FILE, 512, 128);
verifyManifest();
verifyPlatformConfig();
verifyHazardConfig();
verifyCredits();

console.log("ART-006: Schrottplatz-Plattformen und Gefahren bestanden.");

function verifyFiles() {
  assert.equal(existsSync(TILE_FILE), true);
  assert.equal(existsSync(HAZARD_FILE), true);
}

function verifyPng(file, width, height) {
  const header = readFileSync(file).subarray(0, 26);
  assert.equal(header.subarray(1, 4).toString(), "PNG");
  assert.equal(header.readUInt32BE(16), width);
  assert.equal(header.readUInt32BE(20), height);
  assert.equal(header[25], 6);
}

function verifyManifest() {
  const assets = readJson("data/asset-manifest.json").assets;
  const tiles = assets.find((asset) => asset.id === "scrapyard-tiles");
  const hazards = assets.find((asset) => asset.id === "hazard-tiles");
  assert.deepEqual(readGrid(tiles), [TILE_FILE, 64, 64, 8, 4, 32]);
  assert.deepEqual(readGrid(hazards), [HAZARD_FILE, 64, 64, 8, 2, 16]);
}

function verifyPlatformConfig() {
  const source = readFileSync("js/levels/level-01.js", "utf8");
  assert.match(source, /tilesetName === "scrapyard"/);
  assert.match(source, /frameWidth: isCleanHd \? 64 : 32/);
  assert.match(source, /renderScale: isCleanHd \? 1 : 2/);
  assert.match(source, /surfaceOffset: isCleanHd \? 24 : 12/);
}

function verifyHazardConfig() {
  const source = readFileSync("classes/environment/damage-zone.class.js", "utf8");
  assert.match(source, /"scrapyard-hazards-clean-hd\.png"/);
  assert.match(source, /frameWidth: 64,\s+frameHeight: 64,\s+frameCount: 16/);
  assert.match(source, /const DAMAGE_ZONE_RENDER_SCALE = 1/);
  assert.match(source, /offsetX: 16,\s+offsetY: 10,\s+width: 32,\s+height: 48/);
  assert.match(source, /startFrame: 4,\s+frameCount: 4/);
}

function verifyCredits() {
  const files = readJson("data/asset-credits.json").assets.map(({ file }) => file);
  assert.equal(files.includes(TILE_FILE), true);
  assert.equal(files.includes(HAZARD_FILE), true);
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
