import { Weapon } from "../entities/weapons/weapon.class.js";
import {
  GAMEPLAY_EVENTS,
} from "../core/gameplay-event-hub.class.js";

/**
 * Verbindet Waffenwechsel, Angriffseingabe und Munitionsverbrauch.
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
   * Aktualisiert Cooldowns und verarbeitet neue Tastenanschläge.
   * @param {number} deltaTimeSeconds
   * @param {import("../entities/character.class.js").Character} character
   * @returns {Readonly<object>|null}
   */
  update(deltaTimeSeconds, character) {
    this.weapons.forEach((weapon) => weapon.update(deltaTimeSeconds));
    if (this.input.consumePress("weaponSwitch")) this.switchWeapon();
    if (!this.input.consumePress("attack")) return null;
    return this.attack(character);
  }

  /**
   * Wechselt zyklisch zur nächsten verfügbaren Waffe.
   * @returns {Readonly<object>}
   */
  switchWeapon() {
    const weapons = this.#getAvailableWeapons();
    this.currentWeaponIndex = (this.currentWeaponIndex + 1) % weapons.length;
    return this.#emitWeaponChange(weapons[this.currentWeaponIndex]);
  }

  /**
   * Führt einen erlaubten Angriff aus und startet Bytes Animation.
   * @param {import("../entities/character.class.js").Character} character
   * @returns {Readonly<object>|null}
   */
  attack(character) {
    const weapon = this.#getAvailableWeapons()[this.currentWeaponIndex];
    const availableAmmo = this.runStats.getResourceAmount(weapon.ammoType);
    if (!character?.canAttack || !weapon.canAttack(availableAmmo)) return null;
    if (!this.runStats.spendResource(weapon.ammoType, weapon.ammoCost)) return null;
    const attack = weapon.attack(character);
    character.startAttack(attack.animationState, attack.animationDurationSeconds);
    return attack;
  }

  /** Stellt Startwaffe, Freischaltungen und Cooldowns wieder her. */
  reset() {
    this.unlockedWeaponIds = new Set(this.startingWeaponIds);
    this.currentWeaponIndex = 0;
    this.weapons.forEach((weapon) => weapon.reset());
    this.#emitWeaponChange(this.#getAvailableWeapons()[0]);
  }

  /** @returns {Readonly<object>} Die ausgewählte verfügbare Waffe. */
  getCurrentWeapon() {
    return this.#getAvailableWeapons()[this.currentWeaponIndex].getSnapshot();
  }

  /**
   * Schaltet genau eine bekannte Waffe frei und wählt sie sofort aus.
   * @param {string} weaponId
   * @param {number} starterAmmo
   * @returns {boolean}
   */
  unlockWeapon(weaponId, starterAmmo) {
    const weapon = this.#getWeapon(weaponId);
    this.#validateStarterAmmo(starterAmmo);
    if (this.unlockedWeaponIds.has(weaponId)) return false;
    this.unlockedWeaponIds.add(weaponId);
    this.runStats.applyPickups([{
      type: weapon.ammoType,
      amount: starterAmmo,
    }]);
    const availableWeapons = this.#getAvailableWeapons();
    this.currentWeaponIndex = availableWeapons.indexOf(weapon);
    this.#emitWeaponChange(weapon);
    return true;
  }

  /**
   * Verstärkt genau eine bekannte Waffe.
   * @param {string} weaponId
   * @param {number} amount
   * @returns {Readonly<object>}
   */
  increaseDamage(weaponId, amount) {
    return this.#getWeapon(weaponId).increaseDamage(amount);
  }

  #handleGameplayEvent(event) {
    const pickup = event?.detail;
    if (event?.type !== GAMEPLAY_EVENTS.PICKUP || pickup?.type !== "weapon") {
      return false;
    }
    return this.unlockWeapon(pickup.weaponId, pickup.amount);
  }

  #getAvailableWeapons() {
    return this.weapons.filter((weapon) => {
      return this.unlockedWeaponIds.has(weapon.id);
    });
  }

  #getWeapon(weaponId) {
    const weapon = this.weapons.find((candidate) => candidate.id === weaponId);
    if (weapon) return weapon;
    throw new RangeError(`Unbekannte Waffe: ${weaponId}`);
  }

  #emitWeaponChange(weapon) {
    const snapshot = weapon.getSnapshot();
    this.gameplayEvents.emit(GAMEPLAY_EVENTS.WEAPON_CHANGED, snapshot);
    return snapshot;
  }

  #validateStarterAmmo(starterAmmo) {
    if (Number.isInteger(starterAmmo) && starterAmmo > 0) return;
    throw new TypeError("Die Startmunition des Waffenfunds ist ungültig.");
  }

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
