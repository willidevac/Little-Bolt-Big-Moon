const WEAPON_TYPES = Object.freeze(["melee", "projectile"]);
const AMMO_TYPES = Object.freeze(["arcCharge"]);
const PROJECTILE_KINDS = Object.freeze(["bolt", "arc"]);
const COOLDOWN_EPSILON_SECONDS = 1e-9;

/**
 * Shared values, cooldown, and attack data for all weapons.
 */
export class Weapon {
  #startingDamage;

  /**
   * Creates the configured instance.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  constructor(config) {
    this.#validateConfig(config);
    Object.assign(this, config);
    this.#startingDamage = config.damage;
    this.level = 1;
    this.cooldownSecondsRemaining = 0;
  }

  /**
   * Reduces the cooldown over time.
   * @param {number} deltaTimeSeconds Elapsed time since the previous frame, in seconds.
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
   * Checks the cooldown and ammunition only when the weapon consumes it.
   * @param {number|null} [availableAmmo=null] Available ammo supplied to can attack.
   * @returns {boolean}
   */
  canAttack(availableAmmo = null) {
    const hasAmmo = this.ammoCost === 0 ||
      (Number.isInteger(availableAmmo) && availableAmmo >= this.ammoCost);
    return this.cooldownSecondsRemaining === 0 && hasAmmo;
  }

  /**
   * Creates an immutable attack payload for later hit checks.
   * @param {Readonly<object>} character Character affected by the operation.
   * @returns {Readonly<object>|null}
   */
  attack(character) {
    this.#validateCharacter(character);
    if (this.cooldownSecondsRemaining > 0) return null;
    this.cooldownSecondsRemaining = this.cooldownSeconds;
    return this.#createAttack(character);
  }

  /**
   * Resets only the weapon's time-based state.
   */
  reset() {
    this.damage = this.#startingDamage;
    this.level = 1;
    this.cooldownSecondsRemaining = 0;
  }

  /**
   * Increases damage and the visible weapon level.
   * @param {number} amount Amount applied by the operation.
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
   * Returns visible weapon data without exposing mutable internal state.
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
      ammoType: this.ammoType,
    });
  }

  /**
   * Creates attack.
   * @param {Readonly<object>} character Character affected by the operation.
   */
  #createAttack(character) {
    const direction = Math.sign(character.facingDirection) || 1;
    const origin = this.#createOrigin(character, direction);
    return Object.freeze(this.#createAttackDetails(origin, direction));
  }

  /**
   * Creates attack details.
   * @param {Readonly<object>} origin World-space origin used by the operation.
   * @param {string} direction Direction applied to the movement or impact.
   */
  #createAttackDetails(origin, direction) {
    return {
      weaponId: this.id,
      type: this.type,
      damage: this.damage,
      ammoCost: this.ammoCost,
      projectileKind: this.projectileKind ?? null,
      direction,
      origin,
      hitbox: this.#createHitbox(origin, direction),
      animationState: this.animationState,
      animationDurationSeconds: this.animationDurationSeconds,
    };
  }

  /**
   * Creates origin.
   * @param {Readonly<object>} character Character affected by the operation.
   * @param {string} direction Direction applied to the movement or impact.
   */
  #createOrigin(character, direction) {
    const x = direction > 0 ? character.x + character.width : character.x;
    return Object.freeze({ x, y: character.y + this.attackOffsetY });
  }

  /**
   * Creates hitbox.
   * @param {Readonly<object>} origin World-space origin used by the operation.
   * @param {string} direction Direction applied to the movement or impact.
   */
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

  /**
   * Validates config.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  #validateConfig(config) {
    if (this.#isValidConfig(config)) return;
    throw new TypeError("Die Waffenkonfiguration ist ungültig.");
  }

  /**
   * Checks the valid config condition.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  #isValidConfig(config) {
    const hasAmmo = Number.isInteger(config?.ammoCost) && config.ammoCost >= 0;
    const hasAmmoType = config?.ammoCost === 0
      ? config.ammoType === null
      : AMMO_TYPES.includes(config?.ammoType);
    return (
      this.#hasValidText(config) &&
      this.#hasValidNumbers(config) &&
      hasAmmo &&
      WEAPON_TYPES.includes(config.type) &&
      hasAmmoType &&
      this.#hasValidProjectileKind(config)
    );
  }

  /**
   * Checks the valid projectile kind condition.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  #hasValidProjectileKind(config) {
    if (config.type === "melee") return true;
    return PROJECTILE_KINDS.includes(config.projectileKind);
  }

  /**
   * Checks the valid text condition.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  #hasValidText(config) {
    const textValues = [config?.id, config?.name, config?.animationState];
    return textValues.every((value) => typeof value === "string" && value);
  }

  /**
   * Checks the valid numbers condition.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
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

  /**
   * Validates character.
   * @param {Readonly<object>} character Character affected by the operation.
   */
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
