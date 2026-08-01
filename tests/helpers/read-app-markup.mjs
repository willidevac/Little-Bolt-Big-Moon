import fs from "node:fs";
import path from "node:path";

const FRAGMENT_PATTERN = /data-html-fragment=["']([^"']+)["']/g;

/** Liest Einstieg und ausgelagerte Fragmente als ein prüfbares Dokument. */
export function readAppMarkupSync(root = process.cwd()) {
  const entry = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const fragments = [...entry.matchAll(FRAGMENT_PATTERN)]
    .map((match) => readFragment(root, match[1]));
  return [entry, ...fragments].join("\n");
}

/** Asynchrone Fassade für Tests mit bestehendem await-Ablauf. */
export async function readAppMarkup(root = process.cwd()) {
  return readAppMarkupSync(root);
}

function readFragment(root, source) {
  const relativePath = source.replace(/^\.\//, "");
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
