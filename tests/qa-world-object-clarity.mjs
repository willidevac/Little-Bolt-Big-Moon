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
const HAZARD_FRAMES = Object.freeze({
  shockPad: Object.freeze([[4, 16], [5, 16], [6, 16], [7, 14]]),
  retractableSpikes: Object.freeze([[0, 16], [1, 16], [2, 16], [3, 16]]),
  pulseGate: Object.freeze([[12, 13], [13, 13], [14, 13], [15, 13]]),
});
const STORY_PROP_FRAMES = Object.freeze({
  abandonedCompanionCradle: Object.freeze([[0, 4]]),
  sealedLumaTransport: Object.freeze([[0, 4]]),
  launchTraceConsole: Object.freeze([[0, 4]]),
  stationDetentionPod: Object.freeze([[0, 4]]),
  fortressRouteBeacon: Object.freeze([[0, 4]]),
  lumaContainmentCapsule: Object.freeze([[0, 4]]),
});
const level = createLevelOne(GAME_CONFIG.enemies);

level.collectables.forEach(assertGroundedPickup);
level.hazards.forEach(assertGroundedDanger);
level.storyProps.forEach(assertGroundedStoryProp);

console.log("FB-003: Funde, Gefahren und Storyobjekte stehen fest am Boden.");

function assertGroundedPickup(item) {
  PICKUP_FRAMES[item.animationState].forEach(([frame, gap]) => {
    assertFrameContact(item, frame, gap, item.anchorPlatform.y, "#6df6ff");
  });
}

function assertGroundedDanger(hazard) {
  HAZARD_FRAMES[hazard.type].forEach(([frame, gap]) => {
    assertFrameContact(hazard, frame, gap, hazard.anchorPlatform.y, "#ff5b3d");
  });
}

function assertGroundedStoryProp(prop) {
  STORY_PROP_FRAMES[prop.type].forEach(([frame, gap]) => {
    assertFrameContact(prop, frame, gap, prop.anchorPlatform.y);
  });
}

function assertFrameContact(object, frame, gap, groundY, color = null) {
  object.setFrameIndex(frame);
  const draw = captureDraw(object);
  assert.equal(object.y + object.height, groundY);
  if (color) assert.equal(draw.shadowColor, color);
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
