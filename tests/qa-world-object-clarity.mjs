import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";

const PICKUP_FRAMES = Object.freeze({
  gear: Object.freeze([[0, 4], [1, 3], [2, 4], [3, 4]]),
  energy: Object.freeze([[4, 17], [5, 17], [6, 17], [7, 17]]),
  ammo: Object.freeze([[8, 21]]),
  weapon: Object.freeze([[9, 4], [10, 3], [11, 3], [12, 3]]),
  arcCannon: Object.freeze([[0, 10]]),
  arcCharge: Object.freeze([[0, 12]]),
  badgeLeft: Object.freeze([[13, 3]]),
  badgeRight: Object.freeze([[14, 3]]),
});
const HAZARD_FRAMES = Object.freeze([[4, 16], [5, 16], [6, 16], [7, 14]]);
const level = createLevelOne(GAME_CONFIG.enemies);

level.collectables.forEach(assertGroundedPickup);
level.hazards.forEach(assertGroundedDanger);

console.log("FB-003: Funde und Gefahren sind geerdet und klar markiert.");

function assertGroundedPickup(item) {
  PICKUP_FRAMES[item.animationState].forEach(([frame, gap]) => {
    assertFrameContact(item, frame, gap, item.anchorPlatform.y, "#ffd166");
  });
}

function assertGroundedDanger(hazard) {
  HAZARD_FRAMES.forEach(([frame, gap]) => {
    assertFrameContact(hazard, frame, gap, hazard.y + hazard.height, "#ff5b3d");
  });
}

function assertFrameContact(object, frame, gap, groundY, color) {
  object.setFrameIndex(frame);
  const draw = captureDraw(object);
  assert.equal(draw.shadowColor, color);
  assert.equal(draw.y + object.height - gap, groundY);
}

function captureDraw(object) {
  object.imageState = "ready";
  object.image = createImage(object.spriteConfig);
  const context = createContext();
  object.draw(context);
  return context.result;
}

function createImage(config) {
  return { naturalWidth: config.frameWidth * config.frameCount };
}

function createContext() {
  const result = {};
  return {
    result,
    save() {}, restore() {}, beginPath() {}, ellipse() {}, stroke() {},
    drawImage: (...values) => { result.y = values[6]; },
    set shadowColor(value) { result.shadowColor = value; },
    set shadowBlur(value) { result.shadowBlur = value; },
    set strokeStyle(value) { result.strokeStyle = value; },
    set lineWidth(value) { result.lineWidth = value; },
    set globalAlpha(value) { result.globalAlpha = value; },
  };
}
