import { CombatSystem } from "../../classes/systems/combat-system.class.js";
import { WeaponSystem } from "../../classes/systems/weapon-system.class.js";
import { RunUpgradeFlow } from "../../classes/systems/run-upgrade-flow.class.js";
import upgradeData from "../../data/upgrades.json" with { type: "json" };

/**
 * Erstellt die drei voneinander abhängigen Kampfsysteme eines Laufs.
 * @param {Readonly<object>} config
 * @param {Readonly<object>} dependencies
 * @returns {Readonly<object>}
 */
export function createGameCombatSystems(config, dependencies) {
  const combatSystem = new CombatSystem(config.combat);
  const weaponSystem = new WeaponSystem(
    config.weapons, dependencies.keyboard, dependencies.runStats,
    dependencies.gameplayEvents,
  );
  const upgradeFlow = createUpgradeFlow(combatSystem, weaponSystem, dependencies);
  return { combatSystem, weaponSystem, upgradeFlow };
}

function createUpgradeFlow(combatSystem, weaponSystem, dependencies) {
  return new RunUpgradeFlow(upgradeData, {
    runStats: dependencies.runStats,
    weaponSystem,
    combatSystem,
    getCharacter: () => dependencies.world.character,
  });
}
