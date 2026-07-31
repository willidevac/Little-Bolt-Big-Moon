import assert from "node:assert/strict";
import { Platform } from "../classes/environment/platform.class.js";
import { SpringMine } from "../classes/entities/enemies/spring-mine.class.js";
import { GAME_CONFIG } from "../js/config/game-config.js";
import { createLevelOne } from "../js/levels/level-01.js";

const BIOMES = Object.freeze(["scrapyard", "factory", "launch", "space", "moon"]);
const level = createLevelOne(GAME_CONFIG.enemies);
const mines = level.enemies.filter(({ type }) => type === "springMine");

assert.equal(mines.length, BIOMES.length);
BIOMES.forEach(assertBiomeHasMine);
mines.forEach(assertFixedSupport);
assertTelegraphedLeap();
assertHurtAndDeathStates();

console.log("ENM-P2: Fünf faire Sprungminen mit Warnung und Flugbahn bestanden.");

function assertBiomeHasMine(biome) {
  assert.equal(mines.filter(({ id }) => id.startsWith(biome)).length, 1);
}

function assertFixedSupport(mine) {
  const support = level.platforms.find((platform) => {
    return platform.constructor === Platform &&
      platform.y === mine.y + mine.height && overlaps(mine, platform);
  });
  assert.ok(support, `${mine.id} braucht eine feste Plattform.`);
}

function assertTelegraphedLeap() {
  const mine = createMine();
  const world = createWorld({ x: 360, y: 100, width: 64, height: 96 });
  mine.setOnGround(true);
  mine.update(0.1, world);
  assert.equal(mine.movementPhase, "telegraph");
  assert.equal(mine.velocityX, 0);
  world.character.x = 0;
  runUpdates(mine, world, 4, 0.16);
  assert.equal(mine.movementPhase, "airborne");
  assert.ok(mine.velocityX > 0, "Die Flugrichtung darf nach der Warnung nicht folgen.");
  assert.ok(mine.velocityY < 0);
}

function assertHurtAndDeathStates() {
  const mine = createMine();
  mine.receivePlayerHit({ amount: 10 });
  assert.equal(mine.animationState, "hurt");
  mine.receivePlayerHit({ amount: 100 });
  assert.equal(mine.animationState, "dead");
  assert.equal(mine.isDead, true);
}

function createMine() {
  return new SpringMine({
    id: "test-spring-mine",
    type: "springMine",
    x: 100,
    y: 100,
    patrolMinX: 50,
    patrolMaxX: 500,
  }, GAME_CONFIG.enemies.springMine);
}

function createWorld(character) {
  return {
    character,
    config: {
      physics: {
        gravityPixelsPerSecondSquared: 1800,
        maximumFallSpeedPixelsPerSecond: 1200,
      },
    },
  };
}

function runUpdates(mine, world, count, deltaTimeSeconds) {
  for (let index = 0; index < count; index += 1) {
    mine.update(deltaTimeSeconds, world);
  }
}

function overlaps(first, second) {
  return first.x < second.x + second.width &&
    first.x + first.width > second.x;
}
