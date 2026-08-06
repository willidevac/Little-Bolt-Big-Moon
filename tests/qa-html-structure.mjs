import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { readAppMarkup } from "./helpers/read-app-markup.mjs";

const ROOT = process.cwd();
const entry = await fs.readFile("index.html", "utf8");
const markup = await readAppMarkup();
const loader = await fs.readFile("js/ui/html-fragments.js", "utf8");
const rootHtmlFiles = (await fs.readdir(ROOT))
  .filter((file) => path.extname(file) === ".html");
const fragmentPaths = [...entry.matchAll(
  /data-html-fragment=["']([^"']+)["']/g,
)].map((match) => match[1].replace(/^\.\//, ""));

assert.deepEqual(rootHtmlFiles, ["index.html"]);
assert.ok(entry.split(/\r?\n/).length <= 40);
assert.equal(fragmentPaths.length, 6);
await Promise.all(fragmentPaths.map(assertNonEmptyFile));
assert.match(loader, /Promise\.all/);
assert.match(loader, /placeholder\.replaceWith/);
assert.match(markup, /data-game-canvas/);
assert.match(markup, /data-game-screen="home"/);
assert.match(markup, /data-game-dialog="settings"/);

console.log("HTML-001: Kurzer Einstieg und sechs geprüfte Fragmente bestanden.");

async function assertNonEmptyFile(relativePath) {
  const content = await fs.readFile(path.join(ROOT, relativePath), "utf8");
  assert.ok(content.trim().length > 0, `${relativePath} darf nicht leer sein.`);
}
