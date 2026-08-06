import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { ScrapCrawler } from
  "../classes/entities/enemies/scrap-crawler.class.js";
import { DroneGuard } from
  "../classes/entities/enemies/drone-guard.class.js";

const crawler = new ScrapCrawler(
  createEnemyData("crawler"), GAME_CONFIG.enemies.scrapCrawler,
);
const drone = new DroneGuard(
  createEnemyData("drone"), GAME_CONFIG.enemies.droneGuard,
);

assertFacing(crawler, -1);
assertFacing(drone, 1);

console.log("ENM-008: Gegner-Sprites blicken sichtbar in ihre Bewegungsrichtung.");

/** Verifies native and mirrored rendering for both movement directions. */
function assertFacing(enemy, nativeDirection) {
  assert.equal(enemy.nativeFacingDirection, nativeDirection);
  enemy.facingDirection = nativeDirection;
  assert.equal(drawAndCountMirrors(enemy), 0);
  enemy.facingDirection = -nativeDirection;
  assert.equal(drawAndCountMirrors(enemy), 1);
}

/** Draws one placeholder frame and counts horizontal mirror operations. */
function drawAndCountMirrors(enemy) {
  const context = createContext();
  enemy.draw(context);
  return context.mirrors;
}

/** Creates valid patrol data for one regular enemy. */
function createEnemyData(id) {
  return {
    id, type: id, x: 100, y: 100,
    patrolMinX: 0, patrolMaxX: 500, startDirection: 1,
  };
}

/** Creates the minimal canvas contract needed by enemy rendering. */
function createContext() {
  return {
    mirrors: 0,
    save() {}, restore() {}, translate() {}, fillRect() {}, strokeRect() {},
    scale(x, y) {
      if (x === -1 && y === 1) this.mirrors += 1;
    },
  };
}
