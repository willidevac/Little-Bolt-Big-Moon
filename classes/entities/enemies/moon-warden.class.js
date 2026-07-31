import { Enemy } from "./enemy.class.js";
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
const ATTACK_PATTERNS = Object.freeze(["meleeAttack", "rangedAttack"]);
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
const RANGED_SPREAD_RADIANS = Object.freeze({
  1: Object.freeze([0]),
  2: Object.freeze([-0.1, 0.1]),
  3: Object.freeze([-0.18, 0, 0.18]),
});

/**
 * Endboss mit wechselnden Schockwellen, Mondbolzen und drei Kampfphasen.
 */
export class MoonWarden extends Enemy {
  #attackEvents;
  #pendingAttack;
  #nextAttackIndex;

  /**
   * @param {Readonly<object>} enemyData
   * @param {Readonly<object>} config
   */
  constructor(enemyData, config) {
    super(enemyData, VISUAL_CONFIG, config);
    this.#validateBossConfig(config);
    this.bossConfig = config;
    this.isBoss = true;
    this.bossName = enemyData.bossName ?? "Mondwächter";
    this.isFinalBoss = enemyData.isFinalBoss ?? true;
    this.isActive = false;
    this.phase = 1;
    this.#attackEvents = [];
    this.#pendingAttack = null;
    this.#nextAttackIndex = 0;
  }

  /** Zeichnet vor jedem Angriff eine eindeutige, weltgebundene Warnung. */
  draw(context) {
    this.#drawAttackTelegraph(context);
    super.draw(context);
  }

  #drawAttackTelegraph(context) {
    if (!this.#pendingAttack) return;
    const progress = 1 - this.#pendingAttack.secondsRemaining /
      this.bossConfig.attackReleaseSeconds;
    context.save();
    context.globalAlpha = 0.45 + progress * 0.45;
    context.lineWidth = 4 + progress * 4;
    if (this.#pendingAttack.pattern === "meleeAttack") {
      this.#drawShockwaveWarning(context, progress);
    } else this.#drawMoonBoltWarning(context);
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

  #drawMoonBoltWarning(context) {
    const target = this.#pendingAttack.target;
    const origin = this.#getRangedOrigin(target);
    context.strokeStyle = "#65efff";
    context.setLineDash([12, 8]);
    context.beginPath();
    context.moveTo(origin.x, origin.y);
    context.lineTo(target.x, target.y);
    context.stroke();
  }

  /**
   * Aktiviert, bewegt und steuert den Boss abhängig von Byte und seiner Phase.
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
   * Übernimmt Schaden und aktualisiert die sichtbare Phase sofort.
   * @param {Readonly<{amount:number}>} hit
   * @returns {boolean}
   */
  receivePlayerHit(hit) {
    const accepted = super.receivePlayerHit(hit);
    if (!accepted) return false;
    if (this.isDead) this.#pendingAttack = null;
    this.#updatePhase();
    return true;
  }

  /**
   * Übergibt vorbereitete Bossangriffe genau einmal an das Projektilsystem.
   * @returns {ReadonlyArray<Readonly<object>>}
   */
  takeAttackEvents() {
    const events = Object.freeze([...this.#attackEvents]);
    this.#attackEvents.length = 0;
    return events;
  }

  /** Aktiviert den Mondwächter erst in erreichbarer Nähe. */
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
    const pattern = ATTACK_PATTERNS[this.#nextAttackIndex];
    if (!this.startAttackState(pattern)) return;
    this.velocityX = 0;
    this.#pendingAttack = {
      pattern,
      target: this.#getCenter(target),
      secondsRemaining: this.bossConfig.attackReleaseSeconds,
    };
    this.#nextAttackIndex = (this.#nextAttackIndex + 1) % ATTACK_PATTERNS.length;
  }

  #updatePendingAttack(deltaTimeSeconds, target) {
    if (!this.#pendingAttack || this.isHurt || this.isDead || !target) return;
    this.#pendingAttack.secondsRemaining -= deltaTimeSeconds;
    if (this.#pendingAttack.secondsRemaining > 0) return;
    if (this.#pendingAttack.pattern === "meleeAttack") this.#releaseShockwaves();
    else this.#releaseMoonBolts(this.#pendingAttack.target);
    this.attackCooldownSecondsRemaining = this.#getPhase().recoverySeconds;
    this.#pendingAttack = null;
  }

  #releaseShockwaves() {
    const bounds = this.getCollisionBounds();
    const originY = bounds.y + bounds.height;
    this.#attackEvents.push(
      this.#createEvent("shockwave", -1, 0, bounds.x, originY),
      this.#createEvent("shockwave", 1, 0, bounds.x + bounds.width, originY),
    );
  }

  #releaseMoonBolts(targetCenter) {
    const origin = this.#getRangedOrigin(targetCenter);
    const baseAngle = Math.atan2(
      targetCenter.y - origin.y,
      targetCenter.x - origin.x,
    );
    RANGED_SPREAD_RADIANS[this.phase].forEach((spread) => {
      this.#releaseMoonBolt(origin, baseAngle + spread);
    });
  }

  #releaseMoonBolt(origin, angle) {
    this.#attackEvents.push(this.#createEvent(
      "moonBolt",
      Math.cos(angle),
      Math.sin(angle),
      origin.x,
      origin.y,
    ));
  }

  #createEvent(kind, directionX, directionY, originX, originY) {
    const damage = kind === "shockwave"
      ? this.bossConfig.shockwaveDamage
      : this.bossConfig.moonBoltDamage;
    return Object.freeze({
      kind,
      source: this.id,
      damage,
      origin: Object.freeze({ x: originX, y: originY }),
      direction: Object.freeze({ x: directionX, y: directionY }),
    });
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

  #validateBossConfig(config) {
    const values = [
      config?.speedPixelsPerSecond,
      config?.activationDistancePixels,
      config?.movementStopDistancePixels,
      config?.attackReleaseSeconds,
      config?.shockwaveDamage,
      config?.moonBoltDamage,
    ];
    if (values.every((value) => Number.isFinite(value) && value > 0)) return;
    throw new TypeError("Die Mondwächter-Konfiguration ist unvollständig.");
  }
}
