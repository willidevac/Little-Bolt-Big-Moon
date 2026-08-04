import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createLevelOne } from "../js/levels/level-01.js";
import { TrapPlatform, TRAP_PLATFORM_STATES } from
  "../classes/environment/trap-platform.class.js";
import { SpriteFallingPlatform } from
  "../classes/environment/sprite-falling-platform.class.js";
import { SpringPlatform } from
  "../classes/environment/spring-platform.class.js";
import { CranePlatform } from
  "../classes/environment/crane-platform.class.js";

const level = createLevelOne();
const platforms = level.platforms.filter(({ mechanic }) => {
  return Boolean(mechanic);
});
const trap = platforms.find((platform) => platform instanceof TrapPlatform);
const falling = platforms.find((platform) => {
  return platform instanceof SpriteFallingPlatform;
});
const spring = platforms.find((platform) => platform instanceof SpringPlatform);
const cranes = platforms.filter((platform) => platform instanceof CranePlatform);

assert.ok(platforms.length >= 45);
assert.ok(platforms.filter(({ biomeId }) => biomeId === "scrapyard")
  .every((platform) => platform instanceof CranePlatform));
assert.equal(trap.biomeId, "factory");
assert.equal(falling.biomeId, "launch-tower");
assert.equal(spring.biomeId, "launch-tower");
assert.equal(cranes.filter(({ biomeId }) => biomeId === "scrapyard").length, 3);
assert.equal(cranes.filter(({ biomeId }) => biomeId === "factory").length, 4);
assert.ok(platforms.every((platform) => {
  const surface = platform.getCollisionBounds();
  return surface.y === platform.y && surface.height === 4;
}));
assert.ok(platforms.filter((platform) => {
  return platform instanceof SpriteFallingPlatform;
}).every(({ warningDelaySeconds }) => warningDelaySeconds >= 1));
assert.ok(platforms.filter((platform) => {
  return platform instanceof TrapPlatform;
}).every(({ warningSeconds, landingGraceSeconds }) => {
  return warningSeconds >= 1.35 && landingGraceSeconds >= 0.85;
}));
const mainRoute = level.platforms
  .filter(({ routeRole }) => routeRole === "main")
  .sort((first, second) => first.routeOrder - second.routeOrder);
assert.equal(mainRoute.some((platform, index) => {
  return platform.mechanic && mainRoute[index + 1]?.mechanic;
}), false);

trap.update(trap.safeSeconds + 0.01);
assert.equal(trap.state, TRAP_PLATFORM_STATES.WARNING);
trap.update(trap.warningSeconds + 0.01);
assert.equal(trap.state, TRAP_PLATFORM_STATES.ACTIVE);
const target = { x: trap.x, width: 32, groundPlatform: trap };
assert.equal(trap.onLanded(target), true);
assert.equal(trap.createHit(target), null);
assert.equal(trap.onLanded(target), false);
trap.update(trap.activeSeconds + 0.01);
trap.onLanded(target);
trap.update(trap.safeSeconds + 0.01);
trap.onLanded(target);
assert.equal(trap.state, TRAP_PLATFORM_STATES.WARNING);
trap.update(trap.warningSeconds + 0.01);
trap.onLanded(target);
assert.equal(trap.state, TRAP_PLATFORM_STATES.ACTIVE);
assert.deepEqual(trap.createHit(target), { amount: 12, direction: -1 });

const launched = {
  speed: 0, velocityX: 0, facingDirection: 0,
  applyUpwardImpulse(speed) { this.speed = speed; },
};
assert.equal(spring.onLanded(launched), true);
assert.equal(launched.speed, 1360);
assert.equal(Math.sign(launched.velocityX), spring.bounceDirection === "left" ? -1 : 1);
assert.ok(Math.abs(launched.velocityX) >= 280);
assert.ok(spring.springTargetId);
assert.ok(spring.pulseSeconds > 0);

for (const name of [
  "factory-trap-platform-clean-hd.png",
  "launch-falling-platform-clean-hd.png",
  "launch-spring-platform-clean-hd.png",
]) {
  await fs.access(new URL(`../img/environment/${name}`, import.meta.url));
}

console.log("PLT-004: Gradual trap, falling and spring introductions passed.");
