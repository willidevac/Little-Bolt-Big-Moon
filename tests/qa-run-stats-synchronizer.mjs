import assert from "node:assert/strict";
import { RunStatsSynchronizer } from
  "../classes/systems/run-stats-synchronizer.class.js";

const calls = [];
const pickups = [{ id: "pickup" }];
const enemies = [{ id: "enemy" }];
const boss = { name: "boss" };
const synchronizer = new RunStatsSynchronizer(createRunStats(calls));

synchronizer.update(0.25, createWorld(pickups, enemies, boss));
assert.deepEqual(calls, [
  ["time", 0.25, 360],
  ["height", 1234],
  ["pickups", pickups],
  ["enemies", enemies],
  ["boss", boss],
]);

console.log("CLEAN-014: Weltwerte fließen geordnet in die Laufstatistik.");

function createRunStats(calls) {
  return {
    updateTime: (...values) => calls.push(["time", ...values]),
    updateHeight: (value) => calls.push(["height", value]),
    applyPickups: (values) => calls.push(["pickups", values]),
    applyEnemyDefeats: (values) => calls.push(["enemies", values]),
    updateBoss: (value) => calls.push(["boss", value]),
  };
}

function createWorld(pickups, enemies, boss) {
  return {
    character: { y: 1234 },
    bossFight: { getSnapshot: () => boss },
    getHeightLossPixels: () => 360,
    takeCollectedPickups: () => pickups,
    takeDefeatedEnemies: () => enemies,
  };
}
