import assert from "node:assert/strict";
import { RunResources } from "../classes/systems/run-resources.class.js";

const CONFIG = Object.freeze({
  maximumEnergy: 100,
  maximumAmmo: 6,
  maximumArcCharges: 3,
  startingEnergy: 70,
  startingAmmo: 2,
  startingArcCharges: 1,
  startingGears: 0,
});

assertInitialResources();
assertPickupAndSpendFlow();
assertCapacityAndResetFlow();
assertValidation();

console.log("CLEAN-003: Laufvorräte sind getrennt und vollständig geprüft.");

function createResources() {
  return new RunResources(CONFIG);
}

function assertInitialResources() {
  const resources = createResources();
  assert.equal(resources.energy, 70);
  assert.equal(resources.maximumEnergy, 100);
  assert.equal(resources.ammo, 2);
  assert.equal(resources.arcCharges, 1);
  assert.equal(resources.gears, 0);
}

function assertPickupAndSpendFlow() {
  const resources = createResources();
  assert.equal(resources.applyPickups(createPickups()), true);
  assert.deepEqual(readValues(resources), [100, 6, 3, 2]);
  assert.equal(resources.applyPickups([{ type: "weapon", amount: 1 }]), false);
  assert.equal(resources.spend("ammo", 4), true);
  assert.equal(resources.spend("ammo", 3), false);
  assert.equal(resources.getAmount("ammo"), 2);
}

function assertCapacityAndResetFlow() {
  const resources = createResources();
  resources.increaseCapacity("energy", 25);
  resources.increaseCapacity("ammo", 2);
  resources.increaseCapacity("arcCharge", 1);
  assert.deepEqual(readCapacities(resources), [125, 8, 4]);
  assert.deepEqual(readValues(resources), [95, 4, 2, 0]);
  resources.reset();
  assert.deepEqual(readValues(resources), [70, 2, 1, 0]);
}

function assertValidation() {
  assert.throws(() => new RunResources({}), TypeError);
  assert.throws(() => createResources().takeDamage(0), TypeError);
  assert.throws(() => createResources().applyPickups([{}]), TypeError);
  assert.throws(() => createResources().spend("energy", 1), TypeError);
  assert.throws(() => createResources().getAmount("unknown"), RangeError);
  assert.throws(() => createResources().increaseCapacity("gear", 1), TypeError);
}

function createPickups() {
  return [
    { type: "energy", amount: 50 }, { type: "ammo", amount: 10 },
    { type: "arcCharge", amount: 10 }, { type: "gear", amount: 2 },
  ];
}

function readValues(resources) {
  return [resources.energy, resources.ammo, resources.arcCharges, resources.gears];
}

function readCapacities(resources) {
  return [
    resources.maximumEnergy, resources.maximumAmmo,
    resources.maximumArcCharges,
  ];
}
