import assert from "node:assert/strict";
import { SpriteFallingPlatform } from
  "../classes/environment/sprite-falling-platform.class.js";
import { FALLING_PLATFORM_STATES } from
  "../classes/environment/falling-platform.class.js";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne();
const platform = level.platforms.find((candidate) => {
  return candidate instanceof SpriteFallingPlatform;
});

assert.ok(platform);
assert.equal(platform.biomeId, "launch-tower");
assert.equal(platform.state, FALLING_PLATFORM_STATES.STABLE);
assert.equal(platform.onLanded({ team: "player" }), true);
assert.equal(platform.state, FALLING_PLATFORM_STATES.WARNING);

platform.update(platform.warningDelaySeconds + 0.01, {
  config: { world: { height: level.height } },
});
assert.equal(platform.state, FALLING_PLATFORM_STATES.FALLING);
assert.ok(platform.y > platform.initialY);

platform.update(2, { config: { world: { height: level.height } } });
assert.equal(platform.state, FALLING_PLATFORM_STATES.FALLEN);
assert.equal(platform.isCollidable, false);

platform.update(platform.respawnDelaySeconds + 0.01);
assert.equal(platform.state, FALLING_PLATFORM_STATES.STABLE);
assert.equal(platform.y, platform.initialY);
assert.equal(platform.isCollidable, true);

console.log("PLT-003: The delayed falling platform respawns cleanly.");
