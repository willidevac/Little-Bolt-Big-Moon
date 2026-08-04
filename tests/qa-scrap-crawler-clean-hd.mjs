import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const RUNTIME_FILE = "img/sprites/enemies/scrap-crawler-clean-hd.png";
const CLASS_FILE = "classes/entities/enemies/scrap-crawler.class.js";

verifyFiles();
verifyPng();
verifyManifest();
verifyRuntimeConfig();
verifyCredits();

console.log("ART-007: Scrap Crawler mit 13 Clean-HD-Frames bestanden.");

function verifyFiles() {
  assert.equal(existsSync(RUNTIME_FILE), true);
}

function verifyPng() {
  const header = readFileSync(RUNTIME_FILE).subarray(0, 26);
  assert.equal(header.subarray(1, 4).toString(), "PNG");
  assert.equal(header.readUInt32BE(16), 672);
  assert.equal(header.readUInt32BE(20), 128);
  assert.equal(header[25], 6);
}

function verifyManifest() {
  const assets = readJson("data/asset-manifest.json").assets;
  const crawler = assets.find((asset) => asset.id === "scrap-crawler");
  assert.deepEqual(readGrid(crawler), [RUNTIME_FILE, 96, 64, 7, 2, 13]);
  assert.equal(sumValues(crawler.states), 13);
}

function verifyRuntimeConfig() {
  const source = readFileSync(CLASS_FILE, "utf8");
  assert.match(source, /"scrap-crawler-clean-hd\.png"/);
  assert.match(source, /frameWidth: 96,\s+frameHeight: 64,\s+frameCount: 13/);
  assert.match(source, /renderScale: 1/);
  assert.match(source, /offsetX: 12,\s+offsetY: 16,\s+width: 72,\s+height: 48/);
  assert.match(source, /startFrame: 0,\s+frameCount: 4/);
  assert.match(source, /startFrame: 4,\s+frameCount: 3/);
  assert.match(source, /startFrame: 7,\s+frameCount: 2/);
  assert.match(source, /startFrame: 9,\s+frameCount: 4/);
}

function verifyCredits() {
  const files = readJson("data/asset-credits.json").assets.map(({ file }) => file);
  assert.equal(files.includes(RUNTIME_FILE), true);
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
