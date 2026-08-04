import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { ASSET_PATHS } from "../js/config/asset-paths.js";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { readAppMarkup } from "./helpers/read-app-markup.mjs";

const ROOT = process.cwd();
const SOURCE_EXTENSIONS = new Set([".js", ".mjs"]);
const STYLE_EXTENSIONS = new Set([".css"]);
const levelData = JSON.parse(
  await fs.readFile(path.join(ROOT, "data", "levels", "level-01.json")),
);
const upgradeData = JSON.parse(
  await fs.readFile(path.join(ROOT, "data", "upgrades.json")),
);
const sourceFiles = [
  ...(await listFiles(path.join(ROOT, "classes"), SOURCE_EXTENSIONS)),
  ...(await listFiles(path.join(ROOT, "js"), SOURCE_EXTENSIONS)),
  path.join(ROOT, "script.js"),
];
const styleFiles = [
  ...(await listFiles(path.join(ROOT, "styles"), STYLE_EXTENSIONS)),
  path.join(ROOT, "style.css"),
];

await assertNoDebugOutput(sourceFiles);
await assertRelativeImports(sourceFiles);
const documentAssets = await getDocumentAssets();
const styleAssets = await getStyleAssets(styleFiles);
const runtimeAssets = await getRuntimeAssets(sourceFiles);
const allRuntimeAssets = new Set([
  ...documentAssets, ...styleAssets, ...runtimeAssets,
]);
await assertFiles([...allRuntimeAssets]);
await assertAssetInventory(allRuntimeAssets);

console.log(
  `QA-001: ${sourceFiles.length} Dateien und alle Runtime-Assets geprüft.`,
);

async function listFiles(directory, extensions) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(file, extensions);
    return extensions.has(path.extname(file)) ? [file] : [];
  }));
  return nested.flat();
}

async function assertNoDebugOutput(files) {
  const forbidden = /\bconsole\.(?:log|debug|warn|error)\s*\(|\bdebugger\b/;
  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    assert.doesNotMatch(source, forbidden, relative(file));
  }
}

async function assertRelativeImports(files) {
  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    for (const specifier of getRelativeImports(source)) {
      const target = path.resolve(path.dirname(file), specifier);
      assert.equal(await exists(target), true, relative(target));
    }
  }
}

function getRelativeImports(source) {
  const matches = source.matchAll(
    /(?:from\s+|import\s*)["'](\.[^"']+)["']/g,
  );
  return [...matches].map((match) => match[1]);
}

async function getDocumentAssets() {
  const html = await readAppMarkup(ROOT);
  const matches = html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g);
  const localPaths = [...matches].map((match) => match[1]).filter(isLocalFile);
  return localPaths.map((file) => path.join(ROOT, file));
}

async function getStyleAssets(files) {
  const assets = [];
  for (const file of files) {
    const css = await fs.readFile(file, "utf8");
    const urls = [...css.matchAll(/url\(([^)]+)\)/g)]
      .map((match) => match[1].replaceAll(/["']/g, ""))
      .filter(isLocalFile)
      .map((url) => path.resolve(path.dirname(file), url));
    assets.push(...urls);
  }
  return assets;
}

async function getRuntimeAssets(files) {
  const assets = new Set(await getStaticAssetPaths(files));
  addAudioAssets(assets);
  addLevelAssets(assets);
  addDynamicRuntimeAssets(assets);
  assets.add(path.resolve(ROOT, upgradeData.iconSheet.source));
  return assets;
}

async function getStaticAssetPaths(files) {
  const assets = [];
  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    const matches = source.matchAll(
      /getAssetPath\(["']([^"']+)["'],\s*["']([^"']+)["']\)/g,
    );
    for (const match of matches) assets.push(resolveAsset(match[1], match[2]));
  }
  return assets;
}

function addAudioAssets(assets) {
  const groups = Object.values(GAME_CONFIG.audio);
  groups.flatMap((group) => Object.values(group)).forEach((definition) => {
    assets.add(path.resolve(ROOT, definition.source));
  });
}

function addDynamicRuntimeAssets(assets) {
  [
    ["effects", "gameplay-effects-clean-hd.png"],
    ["environment", "moon-warden-entry-lift-clean-hd.png"],
    ["weapons", "drone-projectile-clean-hd.png"],
    ["weapons", "player-weapons-clean-hd.png"],
    ["props", "story-abandoned-cradle-clean-hd.png"],
    ["props", "story-luma-transport-case-clean-hd.png"],
    ["props", "story-launch-trace-console-clean-hd.png"],
    ["props", "story-detention-pod-clean-hd.png"],
    ["props", "story-fortress-route-beacon-clean-hd.png"],
    ["props", "story-luma-containment-clean-hd.png"],
  ].forEach(([category, file]) => assets.add(resolveAsset(category, file)));
}

function addLevelAssets(assets) {
  levelData.sections.forEach((section) => {
    assets.add(resolveAsset(
      "backgrounds", `${section.id}-background-v1.png`,
    ));
    assets.add(resolveAsset(
      "environment", `${section.tileset}-wall-clean-hd.png`,
    ));
    assets.add(resolveAsset(
      "environment", `${section.tileset}-wall-platform-clean-hd.png`,
    ));
    assets.add(resolveAsset(
      "environment", `${section.tileset}-combat-platform-clean-hd.png`,
    ));
  });
  assets.add(resolveAsset("environment", "scrapyard-floor-clean-hd.png"));
  ["precision", "standard", "launch", "rest", "rescue"].forEach((role) => {
    assets.add(resolveAsset(
      "environment", `scrapyard-platform-${role}-clean-hd.png`,
    ));
  });
  [
    "factory-trap-platform-clean-hd.png",
    "launch-falling-platform-clean-hd.png",
    "launch-spring-platform-clean-hd.png",
  ].forEach((fileName) => {
    assets.add(resolveAsset("environment", fileName));
  });
}

async function assertAssetInventory(runtimeAssets) {
  const expected = [...runtimeAssets].filter(isManifestAsset).map(relative).sort();
  const manifest = JSON.parse(
    await fs.readFile(path.join(ROOT, "data", "asset-manifest.json"), "utf8"),
  );
  const declared = manifest.assets.map(({ file }) => file).sort();
  const onDisk = (await listFiles(path.join(ROOT, "img"),
    new Set([".png", ".ttf"]))).map(relative).sort();
  assert.deepEqual(declared, expected, "Asset-Manifest enthält Alt- oder Fehlpfade");
  assert.deepEqual(onDisk, expected, "Ungenutzte Bild- oder Schriftdateien gefunden");
  const credits = JSON.parse(
    await fs.readFile(path.join(ROOT, "data", "asset-credits.json"), "utf8"),
  );
  const credited = new Set(credits.assets.map(({ file }) => file));
  assert.ok(expected.every((file) => credited.has(file)));
}

function isManifestAsset(file) {
  return file.startsWith(path.join(ROOT, "img")) &&
    [".png", ".ttf"].includes(path.extname(file));
}

function resolveAsset(category, fileName) {
  const directory = ASSET_PATHS[category];
  assert.ok(directory, `Unbekannte Assetkategorie: ${category}`);
  return path.resolve(ROOT, directory, fileName);
}

async function assertFiles(files) {
  for (const file of files) {
    assert.equal(await exists(file), true, `Datei fehlt: ${relative(file)}`);
  }
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function isLocalFile(file) {
  return !/^(?:[a-z]+:|#)/i.test(file);
}

function relative(file) {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}
