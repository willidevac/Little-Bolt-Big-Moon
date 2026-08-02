import { Enemy } from "./enemy.class.js";
import { MoonWardenAttackController } from
  "../../systems/moon-warden-attack-controller.class.js";
import { getAssetPath } from "../../../js/config/asset-paths.js";

const VISUAL_CONFIG = Object.freeze({
  sprite: Object.freeze({
    source: getAssetPath("enemies", "moon-warden-clean-hd.png"),
    frameWidth: 192,
    frameHeight: 192,
    frameCount: 26,
  }),
  renderScale: 1,
  collisionBox: Object.freeze({
    offsetX: 24,
    offsetY: 16,
    width: 144,
    height: 168,
  }),
  initialState: "idle",
  initialAttackState: "meleeAttack",
  animations: Object.freeze({
    idle: Object.freeze({
      startFrame: 0,
      frameCount: 4,
      frameDurationSeconds: 0.16,
      loop: true,
    }),
    move: Object.freeze({
      startFrame: 4,
      frameCount: 4,
      frameDurationSeconds: 0.12,
      loop: true,
    }),
    meleeAttack: Object.freeze({
      startFrame: 8,
      frameCount: 5,
      frameDurationSeconds: 0.16,
      loop: false,
    }),
    rangedAttack: Object.freeze({
      startFrame: 13,
      frameCount: 5,
      frameDurationSeconds: 0.16,
      loop: false,
    }),
    hurt: Object.freeze({
      startFrame: 18,
      frameCount: 2,
      frameDurationSeconds: 0.12,
      loop: false,
    }),
    dead: Object.freeze({
      startFrame: 20,
      frameCount: 6,
      frameDurationSeconds: 0.14,
      loop: false,
    }),
  }),
});
const PHASES = Object.freeze([
  Object.freeze({
    minimumHealthRatio: 2 / 3,
    speedMultiplier: 1,
    recoverySeconds: 1.4,
  }),
  Object.freeze({
    minimumHealthRatio: 1 / 3,
    speedMultiplier: 1.25,
    recoverySeconds: 1.1,
  }),
  Object.freeze({
    minimumHealthRatio: 0,
    speedMultiplier: 1.5,
    recoverySeconds: 0.85,
  }),
]);
/**
 * Final boss with alternating shockwaves, moon bolts, and three combat phases.
 */
export class MoonWarden extends Enemy {
  #attackController;

  /**
   * @param {Readonly<object>} enemyData
   * @param {Readonly<object>} config
   */
  constructor(enemyData, config) {
    super(enemyData, VISUAL_CONFIG, config);
    this.#validateMovementConfig(config);
    this.bossConfig = config;
    this.isBoss = true;
    this.bossName = enemyData.bossName ?? "Mondwächter";
    this.isFinalBoss = enemyData.isFinalBoss ?? true;
    this.isActive = false;
    this.phase = 1;
    this.#attackController = new MoonWardenAttackController(this.id, config);
  }

  /** Draws a clear world-space warning before every attack. */
  draw(context) {
    this.#drawAttackTelegraph(context);
    super.draw(context);
  }

  #drawAttackTelegraph(context) {
    const pendingAttack = this.#attackController.getPendingSnapshot();
    if (!pendingAttack) return;
    const progress = 1 - pendingAttack.secondsRemaining /
      this.bossConfig.attackReleaseSeconds;
    context.save();
    context.globalAlpha = 0.45 + progress * 0.45;
    context.lineWidth = 4 + progress * 4;
    if (pendingAttack.pattern === "meleeAttack") {
      this.#drawShockwaveWarning(context, progress);
    } else this.#drawMoonBoltWarning(context, pendingAttack.target);
    context.restore();
  }

  #drawShockwaveWarning(context, progress) {
    const bounds = this.getCollisionBounds();
    context.strokeStyle = "#ff9b32";
    context.beginPath();
    context.ellipse(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height,
      72 + progress * 92, 14, 0, 0, Math.PI * 2,
    );
    context.stroke();
  }

  #drawMoonBoltWarning(context, target) {
    const origin = this.#getRangedOrigin(target);
    context.strokeStyle = "#65efff";
    context.setLineDash([12, 8]);
    context.beginPath();
    context.moveTo(origin.x, origin.y);
    context.lineTo(target.x, target.y);
    context.stroke();
  }

  /**
   * Activates, moves, and controls the boss based on Byte and the current phase.
   * @param {number} deltaTimeSeconds
   * @param {import("../../core/world.class.js").World} world
   */
  update(deltaTimeSeconds, world) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    const target = world.character;
    this.#tryActivate(target);
    this.#updatePhase();
    if (!this.#canAct(deltaTimeSeconds, target)) return;
    if (this.attackCooldownSecondsRemaining > 0) return this.#recover(deltaTimeSeconds, world);
    if (this.#tryBeginAttack(target)) return;
    this.#moveToward(target);
    super.update(deltaTimeSeconds, world);
    this.stayInsidePatrol();
    this.updateAnimation(deltaTimeSeconds);
  }

  #recover(deltaTimeSeconds, world) {
    this.velocityX = 0;
    super.update(deltaTimeSeconds, world);
    this.stayInsidePatrol();
    this.updateAnimation(deltaTimeSeconds);
  }

  #tryBeginAttack(target) {
    if (this.attackCooldownSecondsRemaining !== 0) return false;
    this.#beginNextAttack(target);
    return true;
  }

  #canAct(deltaTimeSeconds, target) {
    const movementState = Math.abs(this.velocityX) > 0 ? "move" : "idle";
    const canAct = this.updateEnemyState(deltaTimeSeconds, movementState);
    this.#updatePendingAttack(deltaTimeSeconds, target);
    return canAct && this.isActive;
  }

  /**
   * Applies damage and immediately updates the visible phase.
   * @param {Readonly<{amount:number}>} hit
   * @returns {boolean}
   */
  receivePlayerHit(hit) {
    const accepted = super.receivePlayerHit(hit);
    if (!accepted) return false;
    if (this.isDead) this.#attackController.clear();
    this.#updatePhase();
    return true;
  }

  /**
   * Passes prepared boss attacks to the projectile system exactly once.
   * @returns {ReadonlyArray<Readonly<object>>}
   */
  takeAttackEvents() {
    return this.#attackController.takeEvents();
  }

  /** Activates the Moon Warden only when Byte is within reach. */
  #tryActivate(target) {
    if (this.isActive || !target) return;
    const targetCenter = this.#getCenter(target);
    const bossCenter = this.#getCenter(this);
    const distance = Math.hypot(
      targetCenter.x - bossCenter.x,
      targetCenter.y - bossCenter.y,
    );
    if (distance <= this.bossConfig.activationDistancePixels) {
      this.activateBoss();
    }
  }

  #updatePhase() {
    const healthRatio = this.health / this.maximumHealth;
    const phaseIndex = PHASES.findIndex((phase) => {
      return healthRatio > phase.minimumHealthRatio;
    });
    this.phase = (phaseIndex < 0 ? PHASES.length - 1 : phaseIndex) + 1;
  }

  #beginNextAttack(target) {
    const pattern = this.#attackController.nextPattern;
    if (!this.startAttackState(pattern)) return;
    this.velocityX = 0;
    this.#attackController.begin(this.#getCenter(target));
  }

  #updatePendingAttack(deltaTimeSeconds, target) {
    if (!this.#attackController.hasPendingAttack ||
      this.isHurt || this.isDead || !target) return;
    const pendingAttack = this.#attackController.getPendingSnapshot();
    const rangedOrigin = this.#getRangedOrigin(pendingAttack.target);
    const released = this.#attackController.update(
      deltaTimeSeconds, this.phase, this.getCollisionBounds(), rangedOrigin,
    );
    if (!released) return;
    this.setAttackCooldown(this.#getPhase().recoverySeconds);
  }

  #getRangedOrigin(targetCenter) {
    const bounds = this.getCollisionBounds();
    const targetIsLeft = targetCenter.x < this.#getCenter(this).x;
    return Object.freeze({
      x: targetIsLeft ? bounds.x : bounds.x + bounds.width,
      y: bounds.y + bounds.height * 0.42,
    });
  }

  #moveToward(target) {
    if (!target) return;
    const distanceX = this.#getCenter(target).x - this.#getCenter(this).x;
    if (Math.abs(distanceX) <= this.bossConfig.movementStopDistancePixels) {
      this.velocityX = 0;
      return;
    }
    this.direction = Math.sign(distanceX);
    this.facingDirection = this.direction;
    this.velocityX = this.direction * this.bossConfig.speedPixelsPerSecond *
      this.#getPhase().speedMultiplier;
  }

  #getPhase() {
    return PHASES[this.phase - 1];
  }

  #getCenter(entity) {
    const bounds = typeof entity?.getCollisionBounds === "function"
      ? entity.getCollisionBounds()
      : entity;
    return Object.freeze({
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    });
  }

  #validateMovementConfig(config) {
    const values = [
      config?.speedPixelsPerSecond,
      config?.activationDistancePixels,
      config?.movementStopDistancePixels,
    ];
    if (values.every((value) => Number.isFinite(value) && value > 0)) return;
    throw new TypeError("Die Mondwächter-Konfiguration ist unvollständig.");
  }
}
