import assert from "node:assert/strict";
import fs from "node:fs/promises";

const [index, stage, controls, touchCss, layoutCss] = await Promise.all([
  fs.readFile("index.html", "utf8"),
  fs.readFile("html/fragments/game-stage.html", "utf8"),
  fs.readFile("html/fragments/touch-controls.html", "utf8"),
  fs.readFile("styles/touch-controls.css", "utf8"),
  fs.readFile("styles/layout.css", "utf8"),
]);

assertViewportSibling();
assertCoarsePointerLayout();
assertCanvasContractUnchanged();
await assertReadableCompactHud();

console.log("UI-019: iPad-Touchleiste und mobiler Vollbild-Fallback bestanden.");

/** Verifies controls live at viewport level instead of inside the canvas shell. */
function assertViewportSibling() {
  assert.match(index, /<\/main>[\s\S]*touch-controls\.html/);
  assert.doesNotMatch(stage, /data-touch-controls/);
  assert.match(controls, /<nav[\s\S]*data-touch-controls[\s\S]*<\/nav>/);
  assert.equal((controls.match(/data-input-action=/g) ?? []).length, 7);
}

/** Verifies iPad input capability reveals bottom-safe controls and hides fullscreen. */
function assertCoarsePointerLayout() {
  assert.match(touchCss, /position:\s*fixed/);
  assert.match(touchCss, /bottom:\s*0/);
  assert.match(touchCss, /safe-area-inset-bottom/);
  assert.match(touchCss, /@media\s*\(hover:\s*none\)\s*and\s*\(pointer:\s*coarse\)/);
  assert.match(touchCss, /\.touch-controls:not\(\[hidden\]\)[\s\S]*display:\s*flex/);
  assert.match(touchCss, /\.fullscreen-button[\s\S]*display:\s*none/);
}

/** Verifies the viewport overlay does not distort the production canvas. */
function assertCanvasContractUnchanged() {
  assert.match(layoutCss, /\.game-shell[\s\S]*aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(layoutCss, /\.game-shell[\s\S]*overflow:\s*hidden/);
}

/** Verifies compact HUD text remains visible at readable minimum sizes. */
async function assertReadableCompactHud() {
  const source = await fs.readFile("styles/hud.css", "utf8");
  assert.match(source, /\.hud-label\s*\{[\s\S]*?font-size:\s*clamp\(0\.75rem/);
  assert.match(source, /\.hud-number\s*\{[\s\S]*?font-size:\s*clamp\(0\.85rem/);
  assert.match(source, /\.hud-announcement\s*\{[\s\S]*?font-size:\s*0\.8rem/);
  assert.doesNotMatch(source, /\.hud-label\s*\{\s*display:\s*none/);
  assert.match(touchCss, /\.hud-resources \.hud-label\s*\{\s*display:\s*inline/);
}
