import assert from "node:assert/strict";
import { RunResetController } from
  "../classes/systems/run-reset-controller.class.js";

const commands = [];
const oldWorld = createWorld("old", 0, commands);
const newWorld = createWorld("new", 42, commands);
const controller = new RunResetController({
  keyboard: createResetTarget("keyboard", commands),
  runStats: { reset: (startY) => commands.push(`stats:${startY}`) },
  weaponSystem: createResetTarget("weapon", commands),
  combatSystem: createResetTarget("combat", commands),
  upgradeFlow: createResetTarget("upgrade", commands),
  createWorld: () => {
    commands.push("create:new");
    return newWorld;
  },
  replaceWorld: (world) => commands.push(`replace:${world.name}`),
});

assert.equal(controller.restart(oldWorld), newWorld);
assert.deepEqual(commands, [
  "destroy:old", "keyboard", "create:new", "replace:new", "initialize:new",
  "stats:42", "weapon", "combat", "upgrade",
]);

commands.length = 0;
const checkpoint = Object.freeze({ x: 320, y: 180 });
assert.equal(controller.restart(newWorld, checkpoint), newWorld);
assert.deepEqual(commands, [
  "destroy:new", "keyboard", "create:new", "replace:new", "initialize:new",
  "place:320:180", "stats:42", "weapon", "combat", "upgrade",
]);

console.log("CLEAN-012: Ein Run-Neustart folgt einer festen Reihenfolge.");

function createWorld(name, startY, commands) {
  return {
    name,
    level: { playerStart: { y: startY } },
    destroy: () => commands.push(`destroy:${name}`),
    initialize: () => commands.push(`initialize:${name}`),
    placeCharacterAt: ({ x, y }) => commands.push(`place:${x}:${y}`),
  };
}

function createResetTarget(name, commands) {
  return { reset: () => commands.push(name) };
}
