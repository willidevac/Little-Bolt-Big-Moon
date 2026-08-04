import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { readAppMarkup } from "./helpers/read-app-markup.mjs";
import { Keyboard } from "../classes/input/keyboard.class.js";
import { Camera } from "../classes/core/camera.class.js";
import { ReviewFlightController } from "../classes/systems/review-flight-controller.class.js";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { REVIEW_MODE_CONFIG } from "../js/config/review-mode-config.js";

const character = createCharacter();
const keyboard = new Keyboard(new EventTarget());
const heights = [];
const cameraTargets = [];
const cameraSpeedMultipliers = [];
const game = {
  world: {
    character,
    camera: {
      reset: (target) => cameraTargets.push(target),
      setFollowSpeedMultiplier: (value) => cameraSpeedMultipliers.push(value),
    },
    level: { playerStart: { y: 149853 } },
  },
  keyboard,
  runStats: { updateHeight: (y) => heights.push(y) },
  config: {
    world: { width: 1280, height: 150000 },
    hud: { heightPixelsPerMeter: 4 },
  },
};
const flight = new ReviewFlightController(game, REVIEW_MODE_CONFIG);

assert.equal(flight.enable(), true);
assert.equal(character.isAffectedByGravity, true);
assert.equal(flight.isFlying, false);
keyboard.jump = true;
flight.update(0.5);
assert.equal(character.y, 149600);
keyboard.jump = false;
keyboard.reviewUp = true;
flight.update(0.5);
assert.equal(character.y, 149150);
assert.equal(character.isAffectedByGravity, false);
assert.equal(character.invulnerabilitySecondsRemaining, Infinity);
keyboard.reviewUp = false;
flight.update(0.01);
assert.equal(character.isAffectedByGravity, true);
assert.equal(character.invulnerabilitySecondsRemaining, 0);
keyboard.fast = true;
keyboard.reviewRight = true;
flight.update(1);
assert.equal(character.x, 1216);
assert.equal(cameraSpeedMultipliers.at(-1), REVIEW_MODE_CONFIG.fastMultiplier);
keyboard.reviewRight = false;
flight.update(0.01);
assert.equal(cameraSpeedMultipliers.at(-1), 1);
keyboard.setAction("reviewBiome5", true, "test");
flight.update(0);
assert.equal(character.y, REVIEW_MODE_CONFIG.reviewTargets[4].y);
assert.equal(cameraTargets.at(-1), character);
assert.equal(flight.teleportTo(5), true);
assert.deepEqual(
  { x: character.x, y: character.y },
  REVIEW_MODE_CONFIG.reviewTargets[5],
);
assert.equal(flight.teleportToHeight(434), true);
assert.equal(character.y, 148117);
assert.equal(flight.disable(), true);
assert.equal(character.isAffectedByGravity, true);
assert.ok(heights.length >= 2);
assertFastCameraKeepsUp();
await assertReviewContract();

console.log("DEV-ART-001: Versteckter Mentor-Review-Modus und Freiflug bestanden.");

function createCharacter() {
  return {
    x: 160, y: 149600, width: 64, height: 64,
    velocityX: 4, velocityY: 8, isAffectedByGravity: true,
    setOnGround(value) { this.isOnGround = value; },
    setInvulnerability(value) { this.invulnerabilitySecondsRemaining = value; },
  };
}

function assertFastCameraKeepsUp() {
  const normalCamera = new Camera(GAME_CONFIG);
  const fastCamera = new Camera(GAME_CONFIG);
  const lowerTarget = { y: 1000, height: 64 };
  const upperTarget = { y: 0, height: 64 };
  normalCamera.reset(lowerTarget);
  fastCamera.reset(lowerTarget);
  fastCamera.setFollowSpeedMultiplier(REVIEW_MODE_CONFIG.fastMultiplier);
  normalCamera.update(upperTarget, 0.1);
  fastCamera.update(upperTarget, 0.1);
  assert.ok(fastCamera.y < normalCamera.y);
  assert.equal(normalCamera.y - fastCamera.y,
    GAME_CONFIG.camera.upwardFollowSpeedPixelsPerSecond * 0.2);
}

async function assertReviewContract() {
  const html = await readAppMarkup();
  const styles = await fs.readFile("styles/review-mode.css", "utf8");
  const ui = await fs.readFile("classes/ui/review-mode-controller.class.js", "utf8");
  const storage = await fs.readFile("classes/ui/storage-controller.class.js", "utf8");
  assert.match(html, /data-review-version/);
  assert.match(html, /data-review-dialog/);
  assertHiddenBanner(html, styles);
  assert.match(ui, /requiredVersionClicks/);
  assert.match(ui, /sessionStorage/);
  assert.match(ui, /filter\(\(\{ isBoss \}\) => !isBoss\)/);
  assert.match(storage, /dataset\.reviewMode === "true"/);
  assert.doesNotMatch(ui, /MOON-REVIEW-150/);
}

function assertHiddenBanner(html, styles) {
  assert.match(html, /data-review-banner/);
  assert.match(html, /data-review-banner hidden/);
  assert.match(styles, /\.review-banner\[hidden\]\s*{\s*display:\s*none;/);
}
