import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const coreFiles = await collectJavaScriptFiles("classes/core");
const coreImports = await Promise.all(coreFiles.map(async (file) => {
  const source = await fs.readFile(file, "utf8");
  return [...source.matchAll(/from\s+["']([^"']+)["']/g)]
    .map((match) => ({ file, specifier: match[1] }));
}));
const forbiddenCoreImports = coreImports.flat().filter(({ specifier }) => {
  return specifier.includes("/js/app/") ||
    specifier.includes("/js/factories/") ||
    specifier.includes("/js/levels/") ||
    specifier.includes("/js/ui/");
});
assert.deepEqual(forbiddenCoreImports, [], "Core imports application details");

const entrySource = await fs.readFile("script.js", "utf8");
assert.doesNotMatch(entrySource, /globalThis\.littleBoltGame/);

const uiFiles = await collectJavaScriptFiles("js/ui");
const hiddenSingletons = [];
for (const file of uiFiles) {
  const source = await fs.readFile(file, "utf8");
  if (/^let\s+[A-Za-z_$][\w$]*\s*=\s*null\s*;/m.test(source)) {
    hiddenSingletons.push(file);
  }
}
assert.deepEqual(hiddenSingletons, [], "UI modules contain hidden singletons");

console.log("ARCH-001: Composition Root, Core-Grenze und UI-Lebenszyklus sind explizit.");

async function collectJavaScriptFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectJavaScriptFiles(target);
    return entry.name.endsWith(".js") ? [target] : [];
  }));
  return files.flat();
}
