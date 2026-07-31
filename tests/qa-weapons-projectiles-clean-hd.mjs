import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const MASTER =
  "img/concepts/approvals/weapons-projectiles-clean-hd-production-layout-v1.png";
const ASSETS = Object.freeze([
  ["player-weapons", "player-weapons-clean-hd.png", 64, 64, 2, 1, 2],
  ["bolt-projectile", "bolt-projectile-clean-hd.png", 32, 16, 2, 1, 2],
  ["drone-projectile", "drone-projectile-clean-hd.png", 32, 32, 4, 1, 4],
  ["boss-projectiles", "boss-projectiles-clean-hd.png", 64, 32, 4, 2, 8],
  ["arc-cannon", "arc-cannon-clean-hd.png", 96, 64, 1, 1, 1],
  ["arc-projectile", "arc-projectile-clean-hd.png", 64, 64, 4, 1, 4],
]);

verifyFilesAndPngs();
verifyManifest();
verifyRuntimeConfigs();
verifyCredits();

console.log("ART-016: 21 Clean-HD-Waffen- und Projektilframes bestanden.");

function verifyFilesAndPngs() {
  assert.equal(existsSync(MASTER), true);
  ASSETS.forEach(([, name, width, height, columns, rows]) => {
    const file = `img/sprites/weapons/${name}`;
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
  ASSETS.forEach(([id, name, width, height, columns, rows, frames]) => {
    const asset = manifest.find((entry) => entry.id === id);
    assert.deepEqual(readGrid(asset), [
      `img/sprites/weapons/${name}`, width, height, columns, rows, frames,
    ]);
  });
}

function verifyRuntimeConfigs() {
  const bolt = readSource("classes/entities/weapons/bolt-projectile.class.js");
  const boss = readSource("classes/entities/weapons/boss-projectile.class.js");
  const arc = readSource("classes/entities/weapons/arc-projectile.class.js");
  const pickup = readSource("classes/entities/collectables/collectable-object.class.js");
  assert.match(bolt, /"bolt-projectile-clean-hd\.png"[\s\S]*frameWidth: 32,[\s\S]*frameHeight: 16/);
  assert.match(boss, /"boss-projectiles-clean-hd\.png"[\s\S]*frameWidth: 64,[\s\S]*frameHeight: 32/);
  assert.match(arc, /"arc-projectile-clean-hd\.png"/);
  assert.match(pickup, /"arc-cannon-clean-hd\.png"/);
}

function verifyCredits() {
  const files = readJson("data/asset-credits.json").assets.map(({ file }) => file);
  assert.equal(files.includes(MASTER), true);
  ASSETS.forEach(([, name]) => {
    assert.equal(files.includes(`img/sprites/weapons/${name}`), true);
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
