import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "espree";

const MAXIMUM_FILE_LINES = 400;
const MAXIMUM_FUNCTION_LINES = 14;
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
  `CLEAN-016: ${productionFiles.length} Produktionsdateien erfüllen 400 LOC, ` +
    "14-Zeilen-Funktionen und vollständiges JSDoc.",
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
  const tree = parse(source, {
    ecmaVersion: "latest", sourceType: "module", range: true, loc: true,
    comment: true,
  });
  const codeOnly = removeComments(source, tree.comments);
  const lines = countCodeLines(codeOnly);
  const violations = [];
  if (lines > MAXIMUM_FILE_LINES) {
    violations.push(`${file}: ${lines} Zeilen (Maximum ${MAXIMUM_FILE_LINES})`);
  }
  FORBIDDEN_PATTERNS.forEach(([label, pattern]) => {
    if (pattern.test(source)) violations.push(`${file}: ${label}`);
  });
  violations.push(...findOversizedFunctions(file, codeOnly, tree));
  violations.push(...findUndocumentedDeclarations(file, source, tree));
  return violations;
}

function removeComments(source, comments) {
  const characters = [...source];
  comments.forEach(({ range }) => {
    for (let index = range[0]; index < range[1]; index += 1) {
      if (!/[\r\n]/.test(characters[index])) characters[index] = " ";
    }
  });
  return characters.join("");
}

function countCodeLines(source) {
  return source.split(/\r?\n/).filter((line) => line.trim()).length;
}

function findOversizedFunctions(file, codeOnly, tree) {
  const lines = codeOnly.split(/\r?\n/);
  const violations = [];
  visit(tree, null, (node, parent) => {
    if (!isFunctionNode(node)) return;
    const count = lines.slice(node.loc.start.line - 1, node.loc.end.line)
      .filter((line) => line.trim()).length;
    if (count <= MAXIMUM_FUNCTION_LINES) return;
    const name = getFunctionName(node, parent);
    violations.push(`${file}:${node.loc.start.line}: ${name} hat ${count} Zeilen`);
  });
  return violations;
}

function findUndocumentedDeclarations(file, source, tree) {
  const violations = [];
  const targets = new Map();
  visit(tree, null, (node, parent) => {
    const target = getDocumentationTarget(node, parent);
    if (target) targets.set(target.start, target);
  });
  targets.forEach((target) => {
    if (hasJsDoc(source, target.start)) return;
    violations.push(`${file}:${target.line}: ${target.name} ohne JSDoc`);
  });
  return violations;
}

function getDocumentationTarget(node, parent) {
  if (node.type === "FunctionDeclaration") {
    const start = parent?.type === "ExportNamedDeclaration" ? parent.range[0] : node.range[0];
    return { start, line: node.loc.start.line, name: node.id.name };
  }
  if (node.type === "MethodDefinition") {
    return createTarget(node, node.key);
  }
  if (node.type === "Property" && isFunctionValue(node.value)) {
    return createTarget(node, node.key);
  }
  if (node.type === "PropertyDefinition" && isFunctionValue(node.value)) {
    return createTarget(node, node.key);
  }
  if (node.type === "VariableDeclaration") return getVariableTarget(node);
  return null;
}

function createTarget(node, key) {
  return {
    start: node.range[0], line: node.loc.start.line,
    name: String(key?.name ?? key?.value ?? "operation"),
  };
}

function getVariableTarget(node) {
  const functions = node.declarations.filter(({ init }) => isFunctionValue(init));
  if (functions.length === 0) return null;
  return {
    start: node.range[0], line: node.loc.start.line,
    name: functions.map(({ id }) => id.name).join(" and "),
  };
}

function hasJsDoc(source, start) {
  const lineStart = source.lastIndexOf("\n", start - 1) + 1;
  return /\/\*\*[\s\S]*\*\/$/.test(source.slice(0, lineStart).trimEnd());
}

function visit(node, parent, callback) {
  if (!node || typeof node !== "object") return;
  callback(node, parent);
  Object.entries(node).forEach(([key, value]) => {
    if (["range", "loc", "comments"].includes(key)) return;
    if (Array.isArray(value)) value.forEach((child) => visit(child, node, callback));
    else if (value?.type) visit(value, node, callback);
  });
}

function isFunctionNode(node) {
  return ["FunctionDeclaration", "FunctionExpression",
    "ArrowFunctionExpression"].includes(node.type);
}

function isFunctionValue(value) {
  return value && ["FunctionExpression", "ArrowFunctionExpression"].includes(value.type);
}

function getFunctionName(node, parent) {
  return node.id?.name ?? parent?.key?.name ?? parent?.id?.name ?? "anonymous";
}
