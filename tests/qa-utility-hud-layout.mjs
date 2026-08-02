import assert from "node:assert/strict";
import fs from "node:fs/promises";

const screens = await fs.readFile("styles/screens.css", "utf8");
const hud = await fs.readFile("styles/hud.css", "utf8");
const responsive = await fs.readFile("styles/responsive.css", "utf8");

assert.match(screens, /\.utility-buttons\s*{[\s\S]*?position:\s*absolute/);
assert.match(
  hud,
  /\.hud-score-group\s*{[\s\S]*?transform:\s*translateY\(clamp\(3rem/,
);
assert.doesNotMatch(hud, /\.hud-score-group\s*{[\s\S]*?margin-right/);
assert.match(hud, /\.hud-combo\[hidden\]\s*{\s*display:\s*none/);
assert.match(hud, /\.hud-energy\s*{[\s\S]*?align-self:\s*start/);
assert.match(
  responsive,
  /max-width:\s*1024px[\s\S]*?max-height:\s*600px/,
);
assert.match(responsive, /\.game-shell \.utility-buttons\s*{[\s\S]*?top:\s*max\(0\.35rem/);
assert.match(responsive, /grid-template-columns:\s*minmax\(0, 1fr\) auto/);
assert.match(responsive, /\.hud-resources\s*{\s*grid-column:\s*1 \/ -1/);
assert.match(responsive, /max-height:\s*600px[\s\S]*?\.utility-button/);
assert.match(
  responsive,
  /max-width:\s*1024px[\s\S]*?\.game-shell \.utility-buttons/,
);
assert.match(responsive, /\.fullscreen-button::before[\s\S]*?content:\s*"⛶"/);

console.log("POLISH-001: Werkzeugleiste und Punkte-HUD bleiben getrennt.");
