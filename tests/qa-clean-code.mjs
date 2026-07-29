import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const MAX_FILE_LINES = 400;
const MAX_FUNCTION_LINES = 14;
const CONTROL_NAMES = new Set(["if", "for", "while", "switch", "catch", "with"]);
const FUNCTION_PATTERN =
  /(?:\bfunction\s+([A-Za-z_$][\w$]*)|^[\t ]*(?:async\s+)?(?:get\s+|set\s+)?(#?[A-Za-z_$][\w$]*))\s*\(/gm;
const ARROW_PATTERN = /=>\s*\{/g;
const MASK_PATTERNS = [
  /\/(?![/*])(?:\\.|[^/\n\\])+\/[dgimsuvy]*/g,
  /`(?:\\[\s\S]|[^`\\])*`/g,
  /"(?:\\[\s\S]|[^"\\])*"/g,
  /'(?:\\[\s\S]|[^'\\])*'/g,
  /\/\*[\s\S]*?\*\//g,
  /\/\/[^\n]*/g,
];

const productionFiles = [
  ...(await collectFiles("classes")),
  ...(await collectFiles("js")),
  "script.js",
];
const checkedFiles = [...productionFiles, ...(await collectFiles("tests"))];
const reports = await Promise.all(
  checkedFiles.map((file) => auditFile(file, productionFiles.includes(file))),
);
const problems = reports.flat();

assert.deepEqual(problems, []);
console.log(`QA-004: ${checkedFiles.length} JavaScript-Dateien sind sauber.`);

async function collectFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(target);
    return /\.(?:js|mjs)$/.test(entry.name) ? [target] : [];
  }));
  return groups.flat().sort();
}

async function auditFile(file, isProductionFile) {
  const source = await fs.readFile(file, "utf8");
  const functions = findFunctions(source);
  return [
    ...auditFileLength(file, source),
    ...auditFunctions(file, functions),
    ...auditProductionFile(file, source, functions, isProductionFile),
  ];
}

function auditFileLength(file, source) {
  const lineCount = source.split(/\r?\n/).length - Number(source.endsWith("\n"));
  if (lineCount <= MAX_FILE_LINES) return [];
  return [`${file}: ${lineCount} Zeilen statt maximal ${MAX_FILE_LINES}`];
}

function auditFunctions(file, functions) {
  return functions.flatMap((entry) => {
    const length = entry.endLine - entry.startLine + 1;
    if (length <= MAX_FUNCTION_LINES) return [];
    return [`${file}:${entry.startLine} ${entry.name} hat ${length} Zeilen`];
  });
}

function auditProductionFile(file, source, functions, isProductionFile) {
  if (!isProductionFile) return [];
  return [
    ...auditDebugCode(file, source),
    ...auditNames(file, functions),
    ...auditJsDoc(file, source, functions),
  ];
}

function auditDebugCode(file, source) {
  const problems = [];
  if (/\bconsole\./.test(source)) problems.push(`${file}: dauerhafte Konsolenausgabe`);
  if (/\bdebugger\b/.test(source)) problems.push(`${file}: debugger-Anweisung`);
  return problems;
}

function auditNames(file, functions) {
  return functions.flatMap((entry) => {
    if (entry.kind === "arrow" || isCamelCaseName(entry.name)) return [];
    return [`${file}:${entry.startLine} ${entry.name} ist nicht camelCase`];
  });
}

function isCamelCaseName(name) {
  if (name === "constructor") return true;
  return /^#?[a-z][A-Za-z0-9]*$/.test(name);
}

function auditJsDoc(file, source, functions) {
  const classRanges = findClassRanges(maskNonCode(source));
  return functions.flatMap((entry) => {
    if (!isPublic(entry, source, classRanges)) return [];
    if (hasLeadingJsDoc(source, entry.startIndex)) return [];
    return [`${file}:${entry.startLine} ${entry.name} hat kein JSDoc`];
  });
}

function findFunctions(source) {
  const code = maskNonCode(source);
  const functions = findNamedFunctions(code);
  findPatternMatches(code, ARROW_PATTERN).forEach((match) => {
    functions.push(createFunction(code, match.index, match.indexOf("{"), "arrow"));
  });
  return uniqueFunctions(functions.filter(Boolean));
}

function findNamedFunctions(code) {
  return findPatternMatches(code, FUNCTION_PATTERN).flatMap((match) => {
    const name = match.groups[0] ?? match.groups[1];
    if (CONTROL_NAMES.has(name)) return [];
    const parenthesis = code.indexOf("(", match.index);
    const bodyIndex = findBodyIndex(code, parenthesis);
    const kind = match.groups[0] ? "declaration" : "method";
    return createFunction(code, match.index, bodyIndex, kind, name) ?? [];
  });
}

function findPatternMatches(code, pattern) {
  pattern.lastIndex = 0;
  return [...code.matchAll(pattern)].map((match) => ({
    index: match.index,
    groups: match.slice(1),
    indexOf: (value) => match.index + match[0].indexOf(value),
  }));
}

function findBodyIndex(code, parenthesisIndex) {
  const closingIndex = findPair(code, parenthesisIndex, "(", ")");
  if (closingIndex < 0) return -1;
  const bodyIndex = findNextCodeIndex(code, closingIndex + 1);
  return code[bodyIndex] === "{" ? bodyIndex : -1;
}

function createFunction(code, startIndex, bodyIndex, kind, name = "anonymous") {
  if (bodyIndex < 0) return null;
  const endIndex = findPair(code, bodyIndex, "{", "}");
  if (endIndex < 0) return null;
  return {
    name,
    kind,
    startIndex,
    bodyIndex,
    startLine: getLineNumber(code, startIndex),
    endLine: getLineNumber(code, endIndex),
  };
}

function findPair(code, startIndex, opening, closing) {
  let depth = 0;
  for (let index = startIndex; index < code.length; index += 1) {
    if (code[index] === opening) depth += 1;
    if (code[index] !== closing) continue;
    depth -= 1;
    if (depth === 0) return index;
  }
  return -1;
}

function findNextCodeIndex(code, startIndex) {
  let index = startIndex;
  while (index < code.length && /\s/.test(code[index])) index += 1;
  return index;
}

function getLineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function uniqueFunctions(functions) {
  const byBody = new Map(functions.map((entry) => [entry.bodyIndex, entry]));
  return [...byBody.values()].sort((first, second) => {
    return first.startIndex - second.startIndex;
  });
}

function maskNonCode(source) {
  return MASK_PATTERNS.reduce((code, pattern) => {
    pattern.lastIndex = 0;
    return code.replace(pattern, maskCharacters);
  }, source);
}

function maskCharacters(value) {
  return value.replace(/[^\r\n]/g, " ");
}

function findClassRanges(code) {
  return [...code.matchAll(/\bclass\s+[A-Za-z_$][\w$]*[^{]*\{/g)]
    .map((match) => createClassRange(code, match.index, match[0]));
}

function createClassRange(code, startIndex, declaration) {
  const bodyIndex = startIndex + declaration.lastIndexOf("{");
  return {
    startIndex,
    bodyIndex,
    endIndex: findPair(code, bodyIndex, "{", "}"),
  };
}

function isPublic(entry, source, classRanges) {
  if (entry.kind === "declaration") return isExported(source, entry.startIndex);
  if (entry.kind !== "method" || entry.name.startsWith("#")) return false;
  return classRanges.some((range) => {
    return entry.bodyIndex > range.bodyIndex && entry.bodyIndex < range.endIndex;
  });
}

function isExported(source, startIndex) {
  const lineStart = source.lastIndexOf("\n", startIndex) + 1;
  return /\bexport\s*$/.test(source.slice(lineStart, startIndex));
}

function hasLeadingJsDoc(source, startIndex) {
  const lineStart = source.lastIndexOf("\n", startIndex) + 1;
  const before = source.slice(0, lineStart).trimEnd();
  if (!before.endsWith("*/")) return false;
  const commentStart = before.lastIndexOf("/**");
  const commentEnd = before.lastIndexOf("*/");
  return commentStart >= 0 && commentEnd === before.length - 2;
}
