const WEAPON_TYPES = Object.freeze(["melee", "projectile"]);
const COOLDOWN_EPSILON_SECONDS = 1e-9;

/**
 * Gemeinsame Werte, Cooldown und Angriffsdaten aller Waffen.
 */
export class Weapon {
  #startingDamage;

  /**
   * @param {Readonly<object>} config
   */
  constructor(config) {
    this.#validateConfig(config);
    Object.assign(this, config);
    this.#startingDamage = config.damage;
    this.level = 1;
    this.cooldownSecondsRemaining = 0;
  }

  /**
   * Verkürzt den Cooldown zeitbasiert.
   * @param {number} deltaTimeSeconds
   */
  update(deltaTimeSeconds) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    const hasElapsed = deltaTimeSeconds + COOLDOWN_EPSILON_SECONDS >=
      this.cooldownSecondsRemaining;
    if (hasElapsed) {
      this.cooldownSecondsRemaining = 0;
      return;
    }
    this.cooldownSecondsRemaining -= deltaTimeSeconds;
  }

  /**
   * Prüft Cooldown und vorhandene Munition.
   * @param {number} availableAmmo
   * @returns {boolean}
   */
  canAttack(availableAmmo) {
    const hasAmmo = Number.isInteger(availableAmmo) && availableAmmo >= this.ammoCost;
    return this.cooldownSecondsRemaining === 0 && hasAmmo;
  }

  /**
   * Erzeugt ein unveränderliches Angriffspaket für spätere Trefferprüfungen.
   * @param {Readonly<object>} character
   * @returns {Readonly<object>|null}
   */
  attack(character) {
    this.#validateCharacter(character);
    if (this.cooldownSecondsRemaining > 0) return null;
    this.cooldownSecondsRemaining = this.cooldownSeconds;
    return this.#createAttack(character);
  }

  /**
   * Setzt ausschließlich den zeitlichen Waffenzustand zurück.
   */
  reset() {
    this.damage = this.#startingDamage;
    this.level = 1;
    this.cooldownSecondsRemaining = 0;
  }

  /**
   * Erhöht den Schaden und die sichtbare Waffenstufe.
   * @param {number} amount
   * @returns {Readonly<object>}
   */
  increaseDamage(amount) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new TypeError("Der zusätzliche Waffenschaden ist ungültig.");
    }
    this.damage += amount;
    this.level += 1;
    return this.getSnapshot();
  }

  /**
   * Liefert die sichtbaren Waffendaten ohne veränderbaren internen Zustand.
   * @returns {Readonly<object>}
   */
  getSnapshot() {
    return Object.freeze({
      id: this.id,
      name: this.name,
      type: this.type,
      level: this.level,
      damage: this.damage,
      ammoCost: this.ammoCost,
    });
  }

  #createAttack(character) {
    const direction = Math.sign(character.facingDirection) || 1;
    const origin = this.#createOrigin(character, direction);
    return Object.freeze({
      weaponId: this.id,
      type: this.type,
      damage: this.damage,
      ammoCost: this.ammoCost,
      direction,
      origin,
      hitbox: this.#createHitbox(origin, direction),
      animationState: this.animationState,
      animationDurationSeconds: this.animationDurationSeconds,
    });
  }

  #createOrigin(character, direction) {
    const x = direction > 0 ? character.x + character.width : character.x;
    return Object.freeze({ x, y: character.y + this.attackOffsetY });
  }

  #createHitbox(origin, direction) {
    if (this.type !== "melee") return null;
    const x = direction > 0 ? origin.x : origin.x - this.attackWidth;
    return Object.freeze({
      x,
      y: origin.y - this.attackHeight / 2,
      width: this.attackWidth,
      height: this.attackHeight,
    });
  }

  #validateConfig(config) {
    if (this.#isValidConfig(config)) return;
    throw new TypeError("Die Waffenkonfiguration ist ungültig.");
  }

  #isValidConfig(config) {
    const hasAmmo = Number.isInteger(config?.ammoCost) && config.ammoCost >= 0;
    return (
      this.#hasValidText(config) &&
      this.#hasValidNumbers(config) &&
      hasAmmo &&
      WEAPON_TYPES.includes(config.type)
    );
  }

  #hasValidText(config) {
    const textValues = [config?.id, config?.name, config?.animationState];
    return textValues.every((value) => typeof value === "string" && value);
  }

  #hasValidNumbers(config) {
    const numberValues = [
      config?.damage,
      config?.cooldownSeconds,
      config?.animationDurationSeconds,
      config?.attackWidth,
      config?.attackHeight,
      config?.attackOffsetY,
    ];
    return numberValues.every((value) => Number.isFinite(value) && value > 0);
  }

  #validateCharacter(character) {
    const values = [
      character?.x,
      character?.y,
      character?.width,
      character?.height,
      character?.facingDirection,
    ];
    if (values.every((value) => Number.isFinite(value))) return;
    throw new TypeError("Die Waffe benötigt eine gültige Figurenposition.");
  }
}
