import assert from "node:assert/strict";
import { GAME_CONFIG } from "../js/config/game-config.js";
import {
  GameplayEventHub,
} from "../classes/core/gameplay-event-hub.class.js";
import { WORLD_ENTITY_GROUPS } from "../classes/core/world-entity-groups.js";
import { ProjectileSystem } from "../classes/systems/projectile-system.class.js";
import { RunStats } from "../classes/systems/run-stats.class.js";
import { WeaponSystem } from "../classes/systems/weapon-system.class.js";

const input = Object.freeze({ consumePress: () => false });
const events = new GameplayEventHub();
const stats = new RunStats(GAME_CONFIG.hud, 149_776);
const weapons = new WeaponSystem(GAME_CONFIG.weapons, input, stats, events);
const character = {
  x: 100,
  y: 100,
  width: 64,
  height: 64,
  facingDirection: 1,
  canAttack: true,
  startAttack: () => {},
};

assert.equal(weapons.unlockWeapon("boltThrower", 6), true);
const firstBolt = weapons.attack(character);
weapons.update(1, character);
const secondBolt = weapons.attack(character);
assert.equal(firstBolt.weaponId, "boltThrower");
assert.equal(secondBolt.weaponId, "boltThrower");
assert.equal(firstBolt.ammoCost, 0);
assert.equal(weapons.unlockWeapon("arcCannon", 3), true);
assert.equal(weapons.getCurrentWeapon().id, "arcCannon");
assert.equal(stats.arcCharges, 3);

const attack = weapons.attack(character);
assert.equal(attack.projectileKind, "arc");
assert.equal(attack.damage, 42);
assert.equal(stats.arcCharges, 2);
assert.equal(weapons.attack(character), null);

const projectileSystem = new ProjectileSystem(
  GAME_CONFIG.projectiles,
  { areOverlapping: (_bounds, target) => target.hitByProjectile === true },
);
const groups = new Map([
  [WORLD_ENTITY_GROUPS.PROJECTILES, []],
  [WORLD_ENTITY_GROUPS.ENEMIES, createEnemies()],
]);
const hits = [];
const world = createWorld(groups, hits);
const projectile = projectileSystem.spawn(attack, world);

assert.equal(projectile.constructor.name, "ArcProjectile");
projectileSystem.resolve(world);
assert.deepEqual(hits.map(({ amount }) => amount), [42, 21]);
assert.equal(groups.get(WORLD_ENTITY_GROUPS.PROJECTILES).length, 0);

stats.increaseArcChargeCapacity(1);
assert.equal(stats.maximumArcCharges, 7);
assert.equal(stats.arcCharges, 3);

console.log("WPN-002: Lichtbogenkanone, eigene Ladungen und Kettentreffer bestanden.");

function createEnemies() {
  return [
    createEnemy("first", 210, true),
    createEnemy("second", 330, false),
    createEnemy("distant", 700, false),
  ];
}

function createEnemy(id, x, hitByProjectile) {
  return {
    id,
    x,
    y: 100,
    width: 48,
    height: 48,
    isDead: false,
    hitByProjectile,
  };
}

function createWorld(groups, hits) {
  return {
    gameplayEvents: { emit: () => {} },
    character: null,
    getEntities: (group) => groups.get(group),
    addEntity: (group, entity) => groups.get(group).push(entity),
    removeEntity: (group, entity) => removeEntity(groups.get(group), entity),
    eventReporter: {
      damageEnemy: (enemy, hit) => recordHit(hits, enemy, hit),
    },
  };
}

function removeEntity(entities, entity) {
  const index = entities.indexOf(entity);
  if (index >= 0) entities.splice(index, 1);
}

function recordHit(hits, enemy, hit) {
  hits.push({ enemyId: enemy.id, amount: hit.amount });
  return true;
}
