import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const RUNTIME_FILE = "img/tilesets/launch-tower-tiles-clean-hd.png";
const MASTER_FILE =
  "img/concepts/approvals/launch-tower-clean-hd-tiles-production-layout-v1.png";

verifyFilesAndPng();
verifyManifest();
verifyPlatformConfig();
verifyCredits();

console.log("ART-019: 32 Clean-HD-Startturmtiles bestanden.");

function verifyFilesAndPng() {
  assert.equal(existsSync(RUNTIME_FILE), true);
  assert.equal(existsSync(MASTER_FILE), true);
  const header = readFileSync(RUNTIME_FILE).subarray(0, 26);
  assert.equal(header.subarray(1, 4).toString(), "PNG");
  assert.equal(header.readUInt32BE(16), 512);
  assert.equal(header.readUInt32BE(20), 256);
  assert.equal(header[25], 6);
}

function verifyManifest() {
  const assets = readJson("data/asset-manifest.json").assets;
  const tiles = assets.find((asset) => asset.id === "launch-tower-tiles");
  assert.deepEqual(readGrid(tiles), [RUNTIME_FILE, 64, 64, 8, 4, 32]);
  assert.equal(tiles.states.tiles, 32);
}

function verifyPlatformConfig() {
  const source = readFileSync("js/levels/level-01.js", "utf8");
  assert.match(source, /"scrapyard",\s+"factory",\s+"launch-tower"/);
  assert.match(source, /CLEAN_HD_TILESET_IDS\.has\(tilesetName\)/);
  assert.match(source, /frameWidth: isCleanHd \? 64 : 32/);
  assert.match(source, /renderScale: isCleanHd \? 1 : 2/);
  assert.match(source, /surfaceOffset: isCleanHd \? 24 : 12/);
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
  return [asset.file, asset.frameWidth, asset.frameHeight,
    asset.columns, asset.rows, asset.totalFrames];
}
