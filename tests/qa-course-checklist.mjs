import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const REQUIRED_PATHS = Object.freeze([
  "index.html",
  "script.js",
  "style.css",
  ".gitignore",
  "classes",
  "img",
  "templates",
]);
const html = await fs.readFile("index.html", "utf8");
const baseCss = await fs.readFile("styles/base.css", "utf8");
const layoutCss = await fs.readFile("styles/layout.css", "utf8");
const responsiveCss = await fs.readFile("styles/responsive.css", "utf8");
const touchCss = await fs.readFile("styles/touch-controls.css", "utf8");
const touchSource = await fs.readFile(
  "classes/input/touch-controls.class.js",
  "utf8",
);

await assertRequiredPaths();
await assertClassStructure();
await assertGitIgnore();
assertLocalDesign();
assertResponsiveLayout();
assertStaticInterface();

console.log("QA-005: Weiterbildungs-Checkliste strukturell vollständig.");

async function assertRequiredPaths() {
  for (const target of REQUIRED_PATHS) {
    await fs.access(path.join(ROOT, target));
  }
}

async function assertClassStructure() {
  const files = await collectFiles(path.join(ROOT, "classes"));
  assert.ok(files.length > 0);
  for (const file of files) await assertClassFile(file);
}

async function collectFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(target);
    return entry.name.endsWith(".js") ? [target] : [];
  }));
  return groups.flat();
}

async function assertClassFile(file) {
  const source = await fs.readFile(file, "utf8");
  const classes = [...source.matchAll(/\bexport\s+class\s+(\w+)/g)];
  if (classes.length === 0) return;
  assert.match(file, /\.class\.js$/);
  assert.equal(classes.length, 1, relative(file));
  const expected = `${toKebabCase(classes[0][1])}.class.js`;
  assert.equal(path.basename(file), expected);
}

function toKebabCase(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

async function assertGitIgnore() {
  const source = await fs.readFile(".gitignore", "utf8");
  assert.match(source, /^\/Arbeitsplan\.md$/m);
  assert.match(source, /^tmp\/$/m);
}

function assertLocalDesign() {
  assert.match(baseCss, /@font-face/);
  assert.match(baseCss, /url\("\.\.\/img\/fonts\/[^"]+\.ttf"\)/);
  assert.doesNotMatch(baseCss, /https?:\/\//);
  assert.match(baseCss, /button\s*\{[\s\S]*?cursor:\s*pointer/);
  assert.match(html, /rel="icon"[^>]+href="\.\/img\/[^"]+"/);
}

function assertResponsiveLayout() {
  assert.match(layoutCss, /overflow:\s*hidden/);
  assert.match(responsiveCss, /orientation:\s*portrait/);
  assert.match(responsiveCss, /\.portrait-notice/);
  assert.match(touchCss, /max-width:\s*1024px/);
  assert.match(touchCss, /orientation:\s*landscape/);
}

function assertStaticInterface() {
  const touchActions = [...html.matchAll(/data-input-action="([^"]+)"/g)];
  assert.equal(touchActions.length, 7);
  assert.ok(touchActions.some((match) => match[1] === "down"));
  assert.ok(touchActions.some((match) => match[1] === "fast"));
  assert.match(html, /data-game-screen="home"/);
  assert.match(html, /data-game-dialog="controls"/);
  assert.match(html, /data-game-dialog="imprint"/);
  assert.doesNotMatch(touchSource, /createElement/);
}

function relative(file) {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}
