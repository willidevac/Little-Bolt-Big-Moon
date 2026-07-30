import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const RUNTIME_FILE = "img/ui/hud-icons-clean-hd.png";
const MASTER_FILE =
  "img/concepts/approvals/hud-icons-clean-hd-production-layout-v1.png";
const ICON_NAMES = Object.freeze([
  "energy",
  "ammo",
  "gears",
  "height",
  "score",
  "arcCharge",
  "weapon",
  "pause",
]);

verifyFiles();
verifyPng();
verifyManifest();
verifyMarkup();
verifyStyles();
verifyCredits();

console.log("ART-008: Acht Clean-HD-HUD-Symbole und Rahmen bestanden.");

function verifyFiles() {
  assert.equal(existsSync(RUNTIME_FILE), true);
  assert.equal(existsSync(MASTER_FILE), true);
}

function verifyPng() {
  const header = readFileSync(RUNTIME_FILE).subarray(0, 26);
  assert.equal(header.subarray(1, 4).toString(), "PNG");
  assert.equal(header.readUInt32BE(16), 384);
  assert.equal(header.readUInt32BE(20), 48);
  assert.equal(header[25], 6);
}

function verifyManifest() {
  const assets = readJson("data/asset-manifest.json").assets;
  const hud = assets.find((asset) => asset.id === "hud-icons");
  assert.deepEqual(readGrid(hud), [RUNTIME_FILE, 48, 48, 8, 1, 8]);
  assert.deepEqual(Object.keys(hud.states), ICON_NAMES);
}

function verifyMarkup() {
  const html = readFileSync("index.html", "utf8");
  ICON_NAMES.forEach((name) => {
    assert.match(html, new RegExp(`data-hud-icon="${name}"[^>]+aria-hidden="true"`));
  });
  const hudStart = html.indexOf("data-game-hud");
  const hudEnd = html.indexOf("</section>", hudStart);
  assert.doesNotMatch(html.slice(hudStart, hudEnd), /[⚡↑⚙✦ϟ◆]/);
}

function verifyStyles() {
  const styles = readFileSync("styles/hud.css", "utf8");
  assert.match(styles, /hud-icons-clean-hd\.png/);
  assert.match(styles, /background-size: 800% 100%/);
  assert.match(styles, /image-rendering: pixelated/);
  ICON_NAMES.slice(1).forEach((name) => {
    assert.match(styles, new RegExp(`data-hud-icon="${name}"`));
  });
  assert.match(styles, /--hud-edge: #eadbb8/);
  assert.match(styles, /@media \(max-width: 700px\) and \(orientation: landscape\)/);
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
