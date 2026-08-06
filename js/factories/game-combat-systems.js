import { CombatSystem } from "../../classes/systems/combat-system.class.js";
import { WeaponSystem } from "../../classes/systems/weapon-system.class.js";
import { RunUpgradeFlow } from "../../classes/systems/run-upgrade-flow.class.js";
import upgradeData from "../../data/upgrades.json" with { type: "json" };

/**
 * Creates the three interdependent combat systems for a run.
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

/** Creates upgrade flow. */
function createUpgradeFlow(combatSystem, weaponSystem, dependencies) {
  return new RunUpgradeFlow(upgradeData, {
    runStats: dependencies.runStats,
    weaponSystem,
    combatSystem,
    /** Returns character. */
    getCharacter: () => dependencies.world.character,
  });
}
