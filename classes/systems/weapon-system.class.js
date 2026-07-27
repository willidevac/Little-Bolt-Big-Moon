import { Weapon } from "../entities/weapons/weapon.class.js";

/**
 * Verbindet Waffenwechsel, Angriffseingabe und Munitionsverbrauch.
 */
export class WeaponSystem {
  /**
   * @param {Readonly<object>} config
   * @param {Readonly<object>} input
   * @param {import("./run-stats.class.js").RunStats} runStats
   */
  constructor(config, input, runStats) {
    this.#validateDependencies(config, input, runStats);
    this.input = input;
    this.runStats = runStats;
    this.weapons = config.order.map((id) => new Weapon(config.definitions[id]));
    this.currentWeaponIndex = 0;
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
    this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weapons.length;
    return this.getCurrentWeapon();
  }

  /**
   * Führt einen erlaubten Angriff aus und startet Bytes Animation.
   * @param {import("../entities/character.class.js").Character} character
   * @returns {Readonly<object>|null}
   */
  attack(character) {
    const weapon = this.weapons[this.currentWeaponIndex];
    if (!character?.canAttack || !weapon.canAttack(this.runStats.ammo)) return null;
    if (!this.runStats.spendAmmo(weapon.ammoCost)) return null;
    const attack = weapon.attack(character);
    character.startAttack(attack.animationState, attack.animationDurationSeconds);
    return attack;
  }

  /**
   * Stellt Startwaffe und alle Cooldowns wieder her.
   */
  reset() {
    this.currentWeaponIndex = 0;
    this.weapons.forEach((weapon) => weapon.reset());
  }

  /**
   * Liefert eine unveränderliche Momentaufnahme der aktuellen Waffe.
   * @returns {Readonly<object>}
   */
  getCurrentWeapon() {
    return this.weapons[this.currentWeaponIndex].getSnapshot();
  }

  #validateDependencies(config, input, runStats) {
    const orderIsValid = Array.isArray(config?.order) && config.order.length > 0;
    const hasDefinitions = config?.definitions && typeof config.definitions === "object";
    const hasInput = typeof input?.consumePress === "function";
    const hasStats = typeof runStats?.spendAmmo === "function";
    if (orderIsValid && hasDefinitions && hasInput && hasStats) return;
    throw new TypeError("Das Waffensystem ist unvollständig konfiguriert.");
  }
}
