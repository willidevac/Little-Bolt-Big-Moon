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
assert.match(
  responsive,
  /\.game-shell:has\(\.game-hud:not\(\[hidden\]\)\) \.utility-buttons/,
);
assert.match(responsive, /\.utility-buttons\s*{\s*top:\s*0\.35rem/);
assert.match(responsive, /grid-template-columns:\s*minmax\(0, 1fr\) auto/);
assert.match(responsive, /\.hud-resources\s*{\s*grid-column:\s*1 \/ -1/);
assert.match(responsive, /max-width:\s*480px[\s\S]*?\.utility-button/);
assert.match(
  responsive,
  /max-width:\s*480px[\s\S]*?\.game-shell \.utility-buttons\s*{\s*top:\s*0\.35rem/,
);
assert.match(responsive, /\.fullscreen-button::before[\s\S]*?content:\s*"⛶"/);

console.log("POLISH-001: Werkzeugleiste und Punkte-HUD bleiben getrennt.");
