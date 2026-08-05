import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const MAXIMUM_FILE_LINES = 400;
const FORBIDDEN_PATTERNS = Object.freeze([
  ["offener Wartungsmarker", /\b(?:TODO|FIXME|HACK|XXX)\b/],
  ["Debugausgabe", /\bconsole\.(?:log|debug|warn|error)\s*\(|\bdebugger\b/],
  ["var-Deklaration", /\bvar\s+/],
  ["lockerer Vergleich", /(?<![=!])==(?!=)|(?<!!)!=(?!=)/],
  ["Kodierungsrest", /Ã|Â|â/u],
  ["ASCII-Ersatz für Umlaut", /\b(?:ungueltig|fuer|Waechter)\b/],
]);
const productionFiles = [
  ...(await collectFiles("classes")),
  ...(await collectFiles("js")),
  "script.js",
];

const violations = (await Promise.all(productionFiles.map(auditFile))).flat();
assert.deepEqual(violations, []);

console.log(
  `CLEAN-016: ${productionFiles.length} Produktionsdateien erfüllen die Clean-Code-Grenzen.`,
);

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
  const lines = source.split(/\r?\n/).length;
  const violations = [];
  if (lines > MAXIMUM_FILE_LINES) {
    violations.push(`${file}: ${lines} Zeilen (Maximum ${MAXIMUM_FILE_LINES})`);
  }
  FORBIDDEN_PATTERNS.forEach(([label, pattern]) => {
    if (pattern.test(source)) violations.push(`${file}: ${label}`);
  });
  violations.push(...findUndocumentedPublicDeclarations(file, source));
  return violations;
}

function findUndocumentedPublicDeclarations(file, source) {
  const exports = source.matchAll(
    /^export\s+(?:async\s+)?(?:class|function)\s+/gm,
  );
  const methods = file.endsWith(".class.js")
    ? source.matchAll(
      /^ {2}(?!(?:if|for|while|switch|catch|with)\b)(?!#)(?:static\s+)?(?:async\s+)?(?:get\s+|set\s+)?[A-Za-z_$][\w$]*\s*\([^)]*\)\s*\{/gm,
    )
    : [];
  const declarations = [...exports, ...methods];
  return declarations.flatMap(({ index, 0: declaration }) => {
    const prefix = source.slice(0, index).trimEnd();
    if (prefix.endsWith("*/")) return [];
    const line = source.slice(0, index).split(/\r?\n/).length;
    return [`${file}:${line}: ${declaration.trim()} ohne JSDoc`];
  });
}
