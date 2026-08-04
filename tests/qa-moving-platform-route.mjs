import assert from "node:assert/strict";
import { MovingPlatform } from
  "../classes/environment/moving-platform.class.js";
import { createLevelOne } from "../js/levels/level-01.js";

const level = createLevelOne();

assert.equal(level.platforms.some((platform) => {
  return platform instanceof MovingPlatform;
}), false);

console.log("PLT-004: All moving intermediate platforms are removed.");
