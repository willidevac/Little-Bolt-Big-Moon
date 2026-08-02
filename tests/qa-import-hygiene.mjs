import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const IMPORT_PATTERN =
  /^import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'](?:\s+with\s+\{[^}]+\})?;\s*$/gm;
const productionFiles = [
  ...(await collectFiles("classes")),
  ...(await collectFiles("js")),
  "script.js",
];
const problems = (await Promise.all(productionFiles.map(auditFile))).flat();

assert.deepEqual(problems, []);
console.log(`CLEAN-015: ${productionFiles.length} Dateien besitzen saubere Imports.`);

async function collectFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(target);
    return entry.name.endsWith(".js") ? [target] : [];
  }));
  return groups.flat().sort();
}

async function auditFile(file) {
  const source = await fs.readFile(file, "utf8");
  const imports = [...source.matchAll(IMPORT_PATTERN)];
  const body = source.replace(IMPORT_PATTERN, "");
  return [
    ...auditDuplicateSources(file, imports),
    ...auditUnusedNames(file, imports, body),
  ];
}

function auditDuplicateSources(file, imports) {
  const sources = imports.map((entry) => entry[2]);
  const duplicates = sources.filter((source, index) => {
    return sources.indexOf(source) !== index;
  });
  return [...new Set(duplicates)].map((source) => {
    return `${file}: doppelte Importquelle ${source}`;
  });
}

function auditUnusedNames(file, imports, body) {
  return imports.flatMap((entry) => {
    return getLocalNames(entry[1]).flatMap((name) => {
      if (hasIdentifier(body, name)) return [];
      return [`${file}: unbenutzter Import ${name}`];
    });
  });
}

function getLocalNames(clause) {
  const names = [];
  const namespace = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
  if (namespace) names.push(namespace[1]);
  const named = clause.match(/\{([\s\S]*?)\}/);
  if (named) names.push(...getNamedImports(named[1]));
  const defaultName = clause.split(/[,{}*]/)[0].trim();
  if (/^[A-Za-z_$][\w$]*$/.test(defaultName)) names.push(defaultName);
  return names;
}

function getNamedImports(group) {
  return group.split(",").map((entry) => {
    const parts = entry.trim().split(/\s+as\s+/);
    return parts.at(-1)?.trim();
  }).filter(Boolean);
}

function hasIdentifier(source, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\w$])${escaped}([^\\w$]|$)`).test(source);
}
