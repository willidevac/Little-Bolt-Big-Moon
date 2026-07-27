import { MovableObject } from "../../base/movable-object.class.js";
import { getAssetPath } from "../../../js/config/asset-paths.js";

const BOLT_SPRITE_CONFIG = Object.freeze({
  source: getAssetPath("weapons", "bolt-projectile.png"),
  frameWidth: 16,
  frameHeight: 8,
  frameCount: 2,
});
const BOLT_RENDER_SCALE = 2;
const LIFETIME_EPSILON_SECONDS = 1e-9;
const BOLT_COLLISION_BOX = Object.freeze({
  offsetX: 2,
  offsetY: 2,
  width: 28,
  height: 12,
});

/**
 * Spielerbolzen mit zeitbasierter Bewegung und begrenzter Lebensdauer.
 */
export class BoltProjectile extends MovableObject {
  /**
   * @param {Readonly<object>} attack
   * @param {Readonly<object>} config
   */
  constructor(attack, config) {
    super();
    this.#validateInputs(attack, config);
    this.width = BOLT_SPRITE_CONFIG.frameWidth * BOLT_RENDER_SCALE;
    this.height = BOLT_SPRITE_CONFIG.frameHeight * BOLT_RENDER_SCALE;
    this.setCollisionBox(BOLT_COLLISION_BOX);
    this.#setAttackData(attack, config);
    this.#setStartPosition(attack.origin);
    this.loadSprite(BOLT_SPRITE_CONFIG);
  }

  /**
   * Bewegt und animiert den Bolzen unabhängig von der Bildrate.
   * @param {number} deltaTimeSeconds
   * @param {import("../../core/world.class.js").World} world
   */
  update(deltaTimeSeconds, world) {
    if (this.isExpired || !this.#isValidDeltaTime(deltaTimeSeconds)) return;
    this.previousX = this.x;
    this.previousY = this.y;
    super.update(deltaTimeSeconds, world);
    this.#updateLifetime(deltaTimeSeconds);
    this.#updateAnimation(deltaTimeSeconds);
    if (this.#shouldExpire(world.config.world)) this.expire();
  }

  /**
   * Spiegelt einen nach links fliegenden Bolzen.
   * @param {CanvasRenderingContext2D} context
   */
  draw(context) {
    if (this.direction > 0) return super.draw(context);
    context.save();
    context.translate(this.x + this.width, this.y);
    context.scale(-1, 1);
    this.drawCurrentFrame(context, 0, 0, this.width, this.height);
    context.restore();
  }

  /**
   * Liefert den kompletten Flugstreifen seit dem letzten Frame.
   * @returns {Readonly<{x:number, y:number, width:number, height:number}>}
   */
  getTravelBounds() {
    const current = this.getCollisionBounds();
    const previous = this.#getPreviousBounds();
    const x = Math.min(previous.x, current.x);
    const y = Math.min(previous.y, current.y);
    return Object.freeze({
      x,
      y,
      width: Math.max(previous.x + previous.width, current.x + current.width) - x,
      height: Math.max(previous.y + previous.height, current.y + current.height) - y,
    });
  }

  /**
   * Erzeugt ein unveränderliches Trefferpaket für einen Gegner.
   * @returns {Readonly<{amount:number, direction:number, source:string}>}
   */
  createHit() {
    return Object.freeze({
      amount: this.damage,
      direction: this.direction,
      source: this.weaponId,
    });
  }

  /**
   * Markiert das Projektil genau einmal zum Entfernen.
   * @returns {boolean}
   */
  expire() {
    if (this.isExpired) return false;
    this.isExpired = true;
    return true;
  }

  #setAttackData(attack, config) {
    this.team = "player";
    this.weaponId = attack.weaponId;
    this.damage = attack.damage;
    this.direction = attack.direction;
    this.velocityX = this.direction * config.speedPixelsPerSecond;
    this.isAffectedByGravity = false;
    this.lifetimeSecondsRemaining = config.lifetimeSeconds;
    this.worldPaddingPixels = config.worldPaddingPixels;
    this.animationFrameDurationSeconds = config.animationFrameDurationSeconds;
    this.animationSeconds = 0;
    this.isExpired = false;
  }

  #setStartPosition(origin) {
    this.x = this.direction > 0 ? origin.x : origin.x - this.width;
    this.y = origin.y - this.height / 2;
    this.previousX = this.x;
    this.previousY = this.y;
  }

  #updateAnimation(deltaTimeSeconds) {
    this.animationSeconds += deltaTimeSeconds;
    const frame = Math.floor(
      this.animationSeconds / this.animationFrameDurationSeconds,
    ) % BOLT_SPRITE_CONFIG.frameCount;
    this.setFrameIndex(frame);
  }

  #updateLifetime(deltaTimeSeconds) {
    const hasElapsed = deltaTimeSeconds + LIFETIME_EPSILON_SECONDS >=
      this.lifetimeSecondsRemaining;
    if (hasElapsed) this.lifetimeSecondsRemaining = 0;
    else this.lifetimeSecondsRemaining -= deltaTimeSeconds;
  }

  #shouldExpire(worldConfig) {
    if (this.lifetimeSecondsRemaining <= 0) return true;
    const padding = this.worldPaddingPixels;
    const outsideX = this.x + this.width < -padding ||
      this.x > worldConfig.width + padding;
    const outsideY = this.y + this.height < -padding ||
      this.y > worldConfig.height + padding;
    return outsideX || outsideY;
  }

  #getPreviousBounds() {
    const current = this.getCollisionBounds();
    return {
      x: this.previousX + (current.x - this.x),
      y: this.previousY + (current.y - this.y),
      width: current.width,
      height: current.height,
    };
  }

  #validateInputs(attack, config) {
    const attackValues = [attack?.damage, attack?.direction, attack?.origin?.x,
      attack?.origin?.y];
    const configValues = [config?.speedPixelsPerSecond, config?.lifetimeSeconds,
      config?.worldPaddingPixels, config?.animationFrameDurationSeconds];
    const hasAttack = attack?.type === "projectile" &&
      typeof attack.weaponId === "string" &&
      attackValues.every((value) => Number.isFinite(value));
    const hasConfig = configValues.every((value) => Number.isFinite(value) && value > 0);
    if (hasAttack && hasConfig && Math.sign(attack.direction) !== 0) return;
    throw new TypeError("Das Bolzenprojektil ist unvollständig konfiguriert.");
  }

  #isValidDeltaTime(deltaTimeSeconds) {
    return Number.isFinite(deltaTimeSeconds) && deltaTimeSeconds > 0;
  }
}
