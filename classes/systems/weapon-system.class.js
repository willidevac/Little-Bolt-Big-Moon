import { Weapon } from "../entities/weapons/weapon.class.js";
import {
  GAMEPLAY_EVENTS,
} from "../core/gameplay-event-hub.class.js";

/**
 * Connects weapon switching, attack input, and ammunition consumption.
 */
export class WeaponSystem {
  /**
   * @param {Readonly<object>} config
   * @param {Readonly<object>} input
   * @param {import("./run-stats.class.js").RunStats} runStats
   * @param {import("../core/gameplay-event-hub.class.js").GameplayEventHub} gameplayEvents
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
   * @param {number} deltaTimeSeconds
   * @param {import("../entities/character.class.js").Character} character
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
   * @param {import("../entities/character.class.js").Character} character
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
   * @param {string} weaponId
   * @param {number} starterAmmo
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
   * @param {string} weaponId
   * @param {number} amount
   * @returns {Readonly<object>}
   */
  increaseDamage(weaponId, amount) {
    return this.#getWeapon(weaponId).increaseDamage(amount);
  }

  /** Handles gameplay event. */
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

  /** Returns weapon. */
  #getWeapon(weaponId) {
    const weapon = this.weapons.find((candidate) => candidate.id === weaponId);
    if (weapon) return weapon;
    throw new RangeError(`Unbekannte Waffe: ${weaponId}`);
  }

  /** Performs the emit weapon change operation. */
  #emitWeaponChange(weapon) {
    const snapshot = this.#createSnapshot(weapon);
    this.gameplayEvents.emit(GAMEPLAY_EVENTS.WEAPON_CHANGED, snapshot);
    return snapshot;
  }

  /** Creates snapshot. */
  #createSnapshot(weapon) {
    return Object.freeze({
      ...weapon.getSnapshot(),
      isCombatUnlocked: this.isCombatUnlocked,
    });
  }

  /** Performs the grant starter ammo operation. */
  #grantStarterAmmo(weapon, amount) {
    if (weapon.ammoCost === 0) return;
    this.runStats.applyPickups([{
      type: weapon.ammoType,
      amount,
    }]);
  }

  /** Checks the attack condition. */
  #canAttack(weapon) {
    if (weapon.ammoCost === 0) return weapon.canAttack();
    return weapon.canAttack(this.runStats.getResourceAmount(weapon.ammoType));
  }

  /** Performs the spend ammunition operation. */
  #spendAmmunition(weapon) {
    if (weapon.ammoCost === 0) return true;
    return this.runStats.spendResource(weapon.ammoType, weapon.ammoCost);
  }

  /** Validates starter ammo. */
  #validateStarterAmmo(starterAmmo) {
    if (Number.isInteger(starterAmmo) && starterAmmo > 0) return;
    throw new TypeError("Die Startmunition des Waffenfunds ist ungültig.");
  }

  /** Validates dependencies. */
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

  /** Checks the valid weapon order condition. */
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
