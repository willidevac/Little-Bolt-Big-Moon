import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { Keyboard } from "../classes/input/keyboard.class.js";
import { ReviewFlightController } from "../classes/systems/review-flight-controller.class.js";
import { REVIEW_MODE_CONFIG } from "../js/config/review-mode-config.js";

const character = createCharacter();
const keyboard = new Keyboard(new EventTarget());
const heights = [];
const cameraTargets = [];
const game = {
  world: { character, camera: { reset: (target) => cameraTargets.push(target) } },
  keyboard,
  runStats: { updateHeight: (y) => heights.push(y) },
  config: { world: { width: 1280, height: 150000 } },
};
const flight = new ReviewFlightController(game, REVIEW_MODE_CONFIG);

assert.equal(flight.enable(), true);
assert.equal(character.isAffectedByGravity, false);
assert.equal(character.invulnerabilitySecondsRemaining, Infinity);
keyboard.jump = true;
flight.update(0.5);
assert.equal(character.y, 149150);
keyboard.jump = false;
keyboard.fast = true;
keyboard.right = true;
flight.update(1);
assert.equal(character.x, 1216);
keyboard.setAction("reviewBiome5", true, "test");
flight.update(0);
assert.equal(character.y, REVIEW_MODE_CONFIG.reviewTargets[4].y);
assert.equal(cameraTargets.at(-1), character);
assert.equal(flight.teleportTo(5), true);
assert.deepEqual(
  { x: character.x, y: character.y },
  REVIEW_MODE_CONFIG.reviewTargets[5],
);
assert.ok(heights.length >= 2);
await assertReviewContract();

console.log("DEV-ART-001: Versteckter Mentor-Review-Modus und Freiflug bestanden.");

function createCharacter() {
  return {
    x: 160, y: 149600, width: 64, height: 64,
    velocityX: 4, velocityY: 8, isAffectedByGravity: true,
    setOnGround(value) { this.isOnGround = value; },
  };
}

async function assertReviewContract() {
  const html = await fs.readFile("index.html", "utf8");
  const styles = await fs.readFile("styles/review-mode.css", "utf8");
  const ui = await fs.readFile("classes/ui/review-mode-controller.class.js", "utf8");
  const storage = await fs.readFile("classes/ui/storage-controller.class.js", "utf8");
  assert.match(html, /data-review-version/);
  assert.match(html, /data-review-dialog/);
  assertHiddenBanner(html, styles);
  assert.match(ui, /requiredVersionClicks/);
  assert.match(ui, /sessionStorage/);
  assert.match(storage, /dataset\.reviewMode === "true"/);
  assert.doesNotMatch(ui, /MOON-REVIEW-150/);
}

function assertHiddenBanner(html, styles) {
  assert.match(html, /data-review-banner/);
  assert.match(html, /data-review-banner hidden/);
  assert.match(styles, /\.review-banner\[hidden\]\s*{\s*display:\s*none;/);
}
