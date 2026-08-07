import assert from "node:assert/strict";
import fs from "node:fs/promises";

const [base, screens, storage, review, responsive] = await Promise.all([
  fs.readFile("styles/base.css", "utf8"),
  fs.readFile("styles/screens.css", "utf8"),
  fs.readFile("styles/storage.css", "utf8"),
  fs.readFile("styles/review-mode.css", "utf8"),
  fs.readFile("styles/responsive.css", "utf8"),
]);

assert.match(base, /--font-size-readable-min:\s*0\.9375rem/);
assertMinimum(screens, ".start-screen__eyebrow");
assertMinimum(screens, ".start-screen__story");
assertMinimum(screens, ".start-screen__mission");
assertMinimum(screens, ".start-screen__mission-label");
assertMinimum(screens, ".start-screen__route");
assertMinimum(screens, ".menu-button");
assertMinimum(storage, ".record-summary dt");
assertMinimum(storage, ".record-summary dd");
assertMinimum(review, ".start-screen__version");
assertMinimum(responsive, ".menu-button");
assertMinimum(responsive, ".start-screen__hint");
assert.match(
  responsive,
  /max-width:\s*765px[\s\S]*?data-screen-state="home"[\s\S]*?\.start-menu[\s\S]*?grid-template-columns:\s*1fr/,
);
assert.match(
  responsive,
  /data-screen-state="home"[^{}]*\.record-summary\s*\{\s*display:\s*none/,
);

console.log("UI-020: Hauptmenütexte bleiben auf iPad und Mobile mindestens 15 px groß.");

/** Verifies one rule uses the shared readable minimum font size. */
function assertMinimum(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = new RegExp(`${escapedSelector}[^{}]*\\{[^}]*font-size:\\s*` +
    "(?:clamp\\()?var\\(--font-size-readable-min\\)");
  assert.match(source, rule, `${selector} unterschreitet die 15-px-Grenze.`);
}
