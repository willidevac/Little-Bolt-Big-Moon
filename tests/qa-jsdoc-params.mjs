import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "espree";

const TARGET_PATHS = Object.freeze([
  "classes/core",
  "classes/effects",
  "classes/entities",
  "classes/environment",
  "classes/ui",
  "classes/systems",
  "js/config",
]);

const files = (await Promise.all(TARGET_PATHS.map(collectFiles))).flat();
const violations = (await Promise.all(files.map(auditFile))).flat();
assert.deepEqual(violations, []);

console.log(
  `CLEAN-018: ${files.length} geprüfte Produktionsdateien dokumentieren ` +
    "alle Übergabeparameter mit Typ und Beschreibung.",
);

/** Collects JavaScript files below one production directory. */
async function collectFiles(directory) {
  const stats = await fs.stat(directory);
  if (stats.isFile()) return [directory];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(target);
    return entry.name.endsWith(".js") ? [target] : [];
  }));
  return groups.flat().sort();
}

/** Returns every incomplete parameter tag in one source file. */
async function auditFile(file) {
  const source = await fs.readFile(file, "utf8");
  const tree = parse(source, {
    ecmaVersion: "latest", sourceType: "module", range: true, loc: true,
    comment: true,
  });
  const violations = [];
  visit(tree, null, (node, parent) => {
    const target = getFunctionTarget(node, parent);
    if (!target || target.parameters.length === 0) return;
    violations.push(...auditTarget(file, source, tree.comments, target));
  });
  return violations;
}

/** Checks tag coverage and descriptions for one documented function. */
function auditTarget(file, source, comments, target) {
  const comment = findJsDoc(comments, source, target.start);
  const label = `${file}:${target.line}: ${target.name}`;
  if (!comment) return [`${label} ohne JSDoc`];
  const tags = readParamTags(comment.value);
  const violations = [];
  const directTags = tags.filter(({ name }) => !getPropertyPath(name).includes("."));
  if (directTags.length !== target.parameters.length) {
    violations.push(
      `${label}: ${directTags.length} direkte @param-Tags für ` +
        `${target.parameters.length} Parameter`,
    );
  }
  target.parameters.forEach((parameter, index) => {
    const expectedName = getParameterName(parameter);
    const tag = expectedName
      ? tags.find(({ name }) => normalizeTagName(name) === expectedName)
      : tags[index];
    if (!tag) violations.push(`${label}: @param für Parameter ${index + 1} fehlt`);
    else if (!tag.description) violations.push(`${label}: ${tag.name} ohne Beschreibung`);
  });
  tags.filter(({ description }) => !description).forEach(({ name }) => {
    const message = `${label}: ${name} ohne Beschreibung`;
    if (!violations.includes(message)) violations.push(message);
  });
  return violations;
}

/** Extracts one normalized entry for every JSDoc parameter tag. */
function readParamTags(commentValue) {
  const starts = [...commentValue.matchAll(/@param\b/g)].map(({ index }) => index);
  return starts.map((start, index) => {
    const end = starts[index + 1] ?? commentValue.length;
    return parseParamTag(commentValue.slice(start + 6, end));
  }).filter(Boolean);
}

/** Parses the type, name, and prose of a single parameter tag. */
function parseParamTag(value) {
  const typeEnd = findTypeEnd(value);
  if (typeEnd < 0) return null;
  const remainder = cleanTagText(value.slice(typeEnd + 1));
  const match = remainder.match(/^(\[[^\]]+\]|\S+)(?:\s+([\s\S]+))?$/);
  if (!match) return null;
  return { name: match[1], description: match[2]?.trim() ?? "" };
}

/** Locates the balanced closing brace of a JSDoc type expression. */
function findTypeEnd(value) {
  const start = value.indexOf("{");
  let depth = 0;
  for (let index = start; index >= 0 && index < value.length; index += 1) {
    if (value[index] === "{") depth += 1;
    if (value[index] === "}") depth -= 1;
    if (depth === 0) return index;
  }
  return -1;
}

/** Removes comment decoration and following JSDoc tags from tag prose. */
function cleanTagText(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\*?\s?/, ""))
    .join(" ")
    .split(/\s+@(?:returns?|throws?|type|property)\b/, 1)[0]
    .trim();
}

/** Returns the JSDoc block directly preceding a declaration. */
function findJsDoc(comments, source, start) {
  return [...comments].reverse().find((comment) => {
    if (comment.type !== "Block" || !comment.value.startsWith("*")) return false;
    if (comment.range[1] > start) return false;
    return source.slice(comment.range[1], start).trim() === "";
  });
}

/** Returns a declaration and its parameter list when it requires JSDoc. */
function getFunctionTarget(node, parent) {
  if (node.type === "FunctionDeclaration") {
    const start = parent?.type === "ExportNamedDeclaration"
      ? parent.range[0] : node.range[0];
    return createTarget(start, node.loc.start.line, node.id.name, node.params);
  }
  if (node.type === "MethodDefinition") {
    return createTarget(node.range[0], node.loc.start.line, getKeyName(node), node.value.params);
  }
  if (["Property", "PropertyDefinition"].includes(node.type) &&
      isFunctionValue(node.value)) {
    return createTarget(node.range[0], node.loc.start.line, getKeyName(node), node.value.params);
  }
  if (node.type === "VariableDeclarator" && isFunctionValue(node.init)) {
    return createTarget(parent.range[0], node.loc.start.line, node.id.name, node.init.params);
  }
  return null;
}

/** Builds an immutable audit target. */
function createTarget(start, line, name, parameters) {
  return { start, line, name: String(name ?? "operation"), parameters };
}

/** Returns the source name of a method or object property. */
function getKeyName(node) {
  return node.key?.name ?? node.key?.value;
}

/** Returns the binding name of a non-destructured parameter. */
function getParameterName(parameter) {
  if (parameter.type === "Identifier") return parameter.name;
  if (parameter.type === "AssignmentPattern") return getParameterName(parameter.left);
  if (parameter.type === "RestElement") return getParameterName(parameter.argument);
  return null;
}

/** Normalizes optional, defaulted, and rest parameter tag names. */
function normalizeTagName(name) {
  return name.replace(/^\[/, "").replace(/\]$/, "")
    .replace(/^\.\.\./, "").split("=")[0].split(".")[0];
}

/** Returns the property path without optional or default-value syntax. */
function getPropertyPath(name) {
  return name.replace(/^\[/, "").replace(/\]$/, "")
    .replace(/^\.\.\./, "").split("=")[0];
}

/** Walks an ESTree without revisiting source metadata. */
function visit(node, parent, callback) {
  if (!node || typeof node !== "object") return;
  callback(node, parent);
  Object.entries(node).forEach(([key, value]) => {
    if (["range", "loc", "comments"].includes(key)) return;
    if (Array.isArray(value)) value.forEach((child) => visit(child, node, callback));
    else if (value?.type) visit(value, node, callback);
  });
}

/** Returns whether a node stores a function expression. */
function isFunctionValue(value) {
  return value && ["FunctionExpression", "ArrowFunctionExpression"].includes(value.type);
}
