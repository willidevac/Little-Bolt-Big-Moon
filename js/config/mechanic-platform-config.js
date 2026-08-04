import { getAssetPath } from "./asset-paths.js";

export const MECHANIC_PLATFORM_SPRITES = Object.freeze({
  trap: sprite("factory-trap-platform-clean-hd.png", 512, 117),
  falling: sprite("launch-falling-platform-clean-hd.png", 448, 146),
  spring: sprite("launch-spring-platform-clean-hd.png", 320, 171),
});

/** First appearances only; later combination routes are built after playtesting. */
export const MECHANIC_PLATFORM_INTRODUCTIONS = Object.freeze([
  Object.freeze({
    id: "factory-trap-platform-intro",
    mechanic: "trap",
    biomeId: "factory",
    x: 480, y: 110000, width: 320, height: 82,
    accentColor: "#ff9b38",
    trap: Object.freeze({
      safeSeconds: 1.7,
      warningSeconds: 0.7,
      activeSeconds: 0.8,
      damage: 12,
    }),
  }),
  Object.freeze({
    id: "launch-falling-platform-intro",
    mechanic: "falling",
    biomeId: "launch-tower",
    x: 500, y: 82000, width: 280, height: 92,
    accentColor: "#ffc247",
    fall: Object.freeze({
      warningDelaySeconds: 1,
      speedPixelsPerSecond: 520,
      maximumDropPixels: 900,
      respawnDelaySeconds: 2.5,
    }),
  }),
  Object.freeze({
    id: "launch-spring-platform-intro",
    mechanic: "spring",
    biomeId: "launch-tower",
    x: 510, y: 75500, width: 260, height: 110,
    accentColor: "#53f4f2",
    bounceSpeedPixelsPerSecond: 1360,
    bounceHorizontalSpeedPixelsPerSecond: 400,
    bounceDirection: "right",
  }),
]);

function sprite(fileName, frameWidth, frameHeight) {
  return Object.freeze({
    source: getAssetPath("environment", fileName),
    frameWidth,
    frameHeight,
    frameCount: 1,
  });
}
