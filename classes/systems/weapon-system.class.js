import { Weapon } from "../entities/weapons/weapon.class.js";
import {
  GAMEPLAY_EVENTS,
} from "../core/gameplay-event-hub.class.js";

/**
 * Connects weapon switching, attack input, and ammunition consumption.
 */
export class WeaponSystem {
  /**
   * Creates the configured system.
   * @param {Readonly<object>} config Configuration values used by the system.
   * @param {Readonly<object>} input Current player input state.
   * @param {import("./run-stats.class.js").RunStats} runStats Run statistics updated by the operation.
   * @param {import("../core/gameplay-event-hub.class.js").GameplayEventHub} gameplayEvents Event hub receiving gameplay notifications.
   */
  constructor(config, input, runStats, gameplayEvents) {
    this.#validateDependencies(config, input, runStats, gameplayEvents);
    this.input = input;
    this.runStats = runStats;
    this.gameplayEvents = gameplayEvents;
    this.weapons = config.order.map((id) => new Weapon(config.definitions[id]));
    this.startingWeaponIds = Object.freeze([...config.startingUnlocked]);
    this.gameplayEvents.on((event) => this.#handleGameplayEvent(event));
    this.reset();
  }

  /**
   * Updates cooldowns and processes new key presses.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
   * @param {import("../entities/character.class.js").Character} character Player character processed by the system.
   * @returns {Readonly<object>|null}
   */
  update(deltaTimeSeconds, character) {
    this.weapons.forEach((weapon) => weapon.update(deltaTimeSeconds));
    const wantsToSwitch = this.input.consumePress("weaponSwitch");
    const wantsToAttack = this.input.consumePress("attack");
    if (!this.isCombatUnlocked) return null;
    if (wantsToSwitch) this.switchWeapon();
    if (!wantsToAttack) return null;
    return this.attack(character);
  }

  /**
   * Cycles to the next available weapon.
   * @returns {Readonly<object>}
   */
  switchWeapon() {
    if (!this.isCombatUnlocked) return this.getCurrentWeapon();
    const weapons = this.#getAvailableWeapons();
    this.currentWeaponIndex = (this.currentWeaponIndex + 1) % weapons.length;
    return this.#emitWeaponChange(weapons[this.currentWeaponIndex]);
  }

  /**
   * Executes an allowed attack and starts Byte's animation.
   * @param {import("../entities/character.class.js").Character} character Player character processed by the system.
   * @returns {Readonly<object>|null}
   */
  attack(character) {
    if (!this.isCombatUnlocked) return null;
    const weapon = this.#getAvailableWeapons()[this.currentWeaponIndex];
    if (!character?.canAttack || !this.#canAttack(weapon)) return null;
    if (!this.#spendAmmunition(weapon)) return null;
    const attack = weapon.attack(character);
    character.startAttack(attack.animationState, attack.animationDurationSeconds);
    return attack;
  }

  /** Restores the starting weapon, unlocks, and cooldowns. */
  reset() {
    this.unlockedWeaponIds = new Set(this.startingWeaponIds);
    this.currentWeaponIndex = 0;
    this.isCombatUnlocked = false;
    this.weapons.forEach((weapon) => weapon.reset());
    this.#emitWeaponChange(this.#getAvailableWeapons()[0]);
  }

  /** @returns {Readonly<object>} The selected available weapon. */
  getCurrentWeapon() {
    const weapon = this.#getAvailableWeapons()[this.currentWeaponIndex];
    return this.#createSnapshot(weapon);
  }

  /**
   * Unlocks exactly one known weapon and selects it immediately.
   * @param {string} weaponId Weapon id used while unlock weapon.
   * @param {number} starterAmmo Starter ammo used while unlock weapon.
   * @returns {boolean}
   */
  unlockWeapon(weaponId, starterAmmo) {
    const weapon = this.#getWeapon(weaponId);
    this.#validateStarterAmmo(starterAmmo);
    if (this.unlockedWeaponIds.has(weaponId)) return false;
    this.unlockedWeaponIds.add(weaponId);
    this.#grantStarterAmmo(weapon, starterAmmo);
    this.isCombatUnlocked = true;
    const availableWeapons = this.#getAvailableWeapons();
    this.currentWeaponIndex = availableWeapons.indexOf(weapon);
    this.#emitWeaponChange(weapon);
    return true;
  }

  /**
   * Upgrades exactly one known weapon.
   * @param {string} weaponId Weapon id used while increase damage.
   * @param {number} amount Amount used while increase damage.
   * @returns {Readonly<object>}
   */
  increaseDamage(weaponId, amount) {
    return this.#getWeapon(weaponId).increaseDamage(amount);
  }

  /**
   * Handles gameplay event.
   * @param {Readonly<object>} event Gameplay event handled by the system.
   */
  #handleGameplayEvent(event) {
    const pickup = event?.detail;
    if (event?.type !== GAMEPLAY_EVENTS.PICKUP || pickup?.type !== "weapon") {
      return false;
    }
    return this.unlockWeapon(pickup.weaponId, pickup.amount);
  }

  /** Returns available weapons. */
  #getAvailableWeapons() {
    return this.weapons.filter((weapon) => {
      return this.unlockedWeaponIds.has(weapon.id);
    });
  }

  /**
   * Returns weapon.
   * @param {string} weaponId Weapon id used while get weapon.
   */
  #getWeapon(weaponId) {
    const weapon = this.weapons.find((candidate) => candidate.id === weaponId);
    if (weapon) return weapon;
    throw new RangeError(`Unbekannte Waffe: ${weaponId}`);
  }

  /**
   * Performs the emit weapon change operation.
   * @param {Readonly<object>} weapon Weapon processed by the system.
   */
  #emitWeaponChange(weapon) {
    const snapshot = this.#createSnapshot(weapon);
    this.gameplayEvents.emit(GAMEPLAY_EVENTS.WEAPON_CHANGED, snapshot);
    return snapshot;
  }

  /**
   * Creates snapshot.
   * @param {Readonly<object>} weapon Weapon processed by the system.
   */
  #createSnapshot(weapon) {
    return Object.freeze({
      ...weapon.getSnapshot(),
      isCombatUnlocked: this.isCombatUnlocked,
    });
  }

  /**
   * Performs the grant starter ammo operation.
   * @param {Readonly<object>} weapon Weapon processed by the system.
   * @param {Readonly<object>} amount Amount used while grant starter ammo.
   */
  #grantStarterAmmo(weapon, amount) {
    if (weapon.ammoCost === 0) return;
    this.runStats.applyPickups([{
      type: weapon.ammoType,
      amount,
    }]);
  }

  /**
   * Checks the attack condition.
   * @param {Readonly<object>} weapon Weapon processed by the system.
   */
  #canAttack(weapon) {
    if (weapon.ammoCost === 0) return weapon.canAttack();
    return weapon.canAttack(this.runStats.getResourceAmount(weapon.ammoType));
  }

  /**
   * Performs the spend ammunition operation.
   * @param {Readonly<object>} weapon Weapon processed by the system.
   */
  #spendAmmunition(weapon) {
    if (weapon.ammoCost === 0) return true;
    return this.runStats.spendResource(weapon.ammoType, weapon.ammoCost);
  }

  /**
   * Validates starter ammo.
   * @param {number} starterAmmo Starter ammo used while validate starter ammo.
   */
  #validateStarterAmmo(starterAmmo) {
    if (Number.isInteger(starterAmmo) && starterAmmo > 0) return;
    throw new TypeError("Die Startmunition des Waffenfunds ist ungültig.");
  }

  /**
   * Validates dependencies.
   * @param {Readonly<object>} config Configuration values used by the system.
   * @param {Readonly<object>} input Current player input state.
   * @param {Readonly<object>} runStats Run statistics updated by the operation.
   * @param {Readonly<object>} gameplayEvents Event hub receiving gameplay notifications.
   */
  #validateDependencies(config, input, runStats, gameplayEvents) {
    const hasInput = typeof input?.consumePress === "function";
    const hasStats = typeof runStats?.spendResource === "function" &&
      typeof runStats?.getResourceAmount === "function";
    const hasEvents = typeof gameplayEvents?.on === "function" &&
      typeof gameplayEvents?.emit === "function";
    if (this.#hasValidWeaponOrder(config) && hasInput && hasStats && hasEvents) {
      return;
    }
    throw new TypeError("Das Waffensystem ist unvollständig konfiguriert.");
  }

  /**
   * Checks the valid weapon order condition.
   * @param {Readonly<object>} config Configuration values used by the system.
   */
  #hasValidWeaponOrder(config) {
    const definitions = config?.definitions;
    const order = config?.order;
    const starting = config?.startingUnlocked;
    if (!definitions || typeof definitions !== "object") return false;
    if (!Array.isArray(order) || order.length === 0) return false;
    if (!Array.isArray(starting) || starting.length === 0) return false;
    return order.every((id) => definitions[id]) &&
      starting.every((id) => order.includes(id));
  }
}
