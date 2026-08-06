import { Enemy } from "./enemy.class.js";
import { ScrapOverseerAttackController } from
  "../../systems/scrap-overseer-attack-controller.class.js";
import { SCRAP_OVERSEER_VISUAL_CONFIG } from
  "../../../js/config/scrap-overseer-visual-config.js";

const FULL_CIRCLE_RADIANS = Math.PI * 2;
const PHASES = Object.freeze([
  Object.freeze({ minimumHealthRatio: 0.5, speedMultiplier: 1,
    recoverySeconds: 1.6 }),
  Object.freeze({ minimumHealthRatio: 0, speedMultiplier: 1.2,
    recoverySeconds: 1.15 }),
]);

/** Tutorial-only flying boss with two phases and announced bolt volleys. */
export class ScrapOverseer extends Enemy {
  #attackController;

  /** @param {Readonly<object>} enemyData @param {Readonly<object>} config */
  constructor(enemyData, config) {
    super(createBossData(enemyData), SCRAP_OVERSEER_VISUAL_CONFIG, config);
    this.#validateConfig(config);
    this.bossConfig = config;
    this.isAffectedByGravity = false;
    this.hoverHomeY = this.y;
    this.hoverSeconds = 0;
    this.#attackController = new ScrapOverseerAttackController(this.id, config);
  }

  /** Starts with a safe observation delay before the first volley. */
  activateBoss() {
    const activated = super.activateBoss();
    if (activated) this.setAttackCooldown(this.bossConfig.initialDelaySeconds);
    return activated;
  }

  /** Draws the locked shot path before drawing the drone. */
  draw(context) {
    this.#drawTelegraph(context);
    super.draw(context);
  }

  /** Advances patrol, hover, phases, and announced attacks. */
  update(deltaTimeSeconds, world) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    this.activateBoss();
    this.#updatePhase();
    const canAct = this.updateEnemyState(deltaTimeSeconds, "move");
    this.#updatePendingAttack(deltaTimeSeconds);
    if (this.isDead) return;
    this.#updateFlight(deltaTimeSeconds, world, canAct);
    if (!this.#canBeginAttack(canAct)) return;
    this.#beginAttack(world.character);
  }

  /** Applies damage, phase changes, and death interruption. */
  receivePlayerHit(hit) {
    const accepted = super.receivePlayerHit(hit);
    if (!accepted) return false;
    this.#updatePhase();
    if (this.isDead) this.#attackController.clear();
    return true;
  }

  /** @returns {Readonly<object>|null} Current visible shot preparation. */
  getAttackTelegraph() { return this.#attackController.getPendingSnapshot(); }

  /** @returns {ReadonlyArray<Readonly<object>>} Prepared shots exactly once. */
  takeAttackEvents() { return this.#attackController.takeEvents(); }

  /** Draws a cyan aiming line and reactor pulse. */
  #drawTelegraph(context) {
    const pending = this.getAttackTelegraph();
    if (!pending) return;
    const progress = 1 - pending.secondsRemaining /
      this.bossConfig.attackReleaseSeconds;
    const origin = this.#getMuzzleOrigin();
    this.#drawAimLine(context, origin, pending.target, progress);
    this.#drawReactorPulse(context, origin, progress);
  }

  /** Draws the fixed shot path. */
  #drawAimLine(context, origin, target, progress) {
    context.save();
    context.strokeStyle = "#65efff";
    context.globalAlpha = 0.45 + progress * 0.45;
    context.lineWidth = 3 + progress * 3;
    context.setLineDash([10, 8]);
    context.beginPath();
    context.moveTo(origin.x, origin.y);
    context.lineTo(target.x, target.y);
    context.stroke();
    context.restore();
  }

  /** Draws a growing warning pulse around the weapon core. */
  #drawReactorPulse(context, origin, progress) {
    context.save();
    context.strokeStyle = "#ff9b32";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(origin.x, origin.y, 18 + progress * 20, 0, FULL_CIRCLE_RADIANS);
    context.stroke();
    context.restore();
  }

  /** Updates horizontal patrol and hover without target pursuit. */
  #updateFlight(deltaTimeSeconds, world, canAct) {
    const canPatrol = canAct && !this.#attackController.hasPendingAttack;
    this.velocityX = canPatrol ? this.direction * this.#getSpeed() : 0;
    super.update(deltaTimeSeconds, world);
    if (canPatrol) this.stayInsidePatrol();
    this.hoverSeconds += deltaTimeSeconds;
    const angle = this.hoverSeconds * this.bossConfig.hoverCyclesPerSecond *
      FULL_CIRCLE_RADIANS;
    this.y = this.hoverHomeY + Math.sin(angle) * this.bossConfig.hoverAmplitudePixels;
    if (canAct) this.updateAnimation(deltaTimeSeconds);
  }

  /** Checks whether the next announced shot may begin. */
  #canBeginAttack(canAct) {
    return canAct && this.isActive && !this.#attackController.hasPendingAttack &&
      this.attackCooldownSecondsRemaining === 0;
  }

  /** Locks Byte's current position and begins a visible warning. */
  #beginAttack(target) {
    if (!target || !this.startAttackState("attack")) return false;
    const targetCenter = this.#getCenter(target);
    this.direction = targetCenter.x < this.#getCenter(this).x ? -1 : 1;
    this.facingDirection = this.direction;
    this.velocityX = 0;
    this.#attackController.begin(targetCenter);
    return true;
  }

  /** Releases a due volley and applies the phase recovery time. */
  #updatePendingAttack(deltaTimeSeconds) {
    if (!this.#attackController.hasPendingAttack || this.isHurt || this.isDead) {
      return false;
    }
    const released = this.#attackController.update(
      deltaTimeSeconds, this.phase, this.#getMuzzleOrigin(),
    );
    if (released) this.setAttackCooldown(this.#getPhase().recoverySeconds);
    return released;
  }

  /** Updates the public two-phase boss state from current health. */
  #updatePhase() {
    const ratio = this.health / this.maximumHealth;
    this.phase = ratio > PHASES[0].minimumHealthRatio ? 1 : 2;
  }

  /** Returns the active phase configuration. */
  #getPhase() { return PHASES[this.phase - 1]; }

  /** Returns the current phase patrol speed. */
  #getSpeed() {
    return this.bossConfig.speedPixelsPerSecond * this.#getPhase().speedMultiplier;
  }

  /** Returns the muzzle point on the current facing side. */
  #getMuzzleOrigin() {
    const bounds = this.getCollisionBounds();
    return Object.freeze({
      x: this.facingDirection < 0 ? bounds.x : bounds.x + bounds.width,
      y: bounds.y + bounds.height * 0.46,
    });
  }

  /** Returns the collision center of one entity or rectangle. */
  #getCenter(entity) {
    const bounds = typeof entity?.getCollisionBounds === "function"
      ? entity.getCollisionBounds()
      : entity;
    return Object.freeze({
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    });
  }

  /** Validates all flight and attack values used by the boss. */
  #validateConfig(config) {
    const values = [
      config?.speedPixelsPerSecond, config?.hoverAmplitudePixels,
      config?.hoverCyclesPerSecond, config?.initialDelaySeconds,
      config?.attackReleaseSeconds, config?.boltDamage,
    ];
    if (values.every((value) => Number.isFinite(value) && value > 0)) return;
    throw new TypeError("Die Schrott-Aufseher-Konfiguration ist unvollständig.");
  }
}

/** Creates the immutable tutorial-final boss identity. */
function createBossData(data) {
  return Object.freeze({
    ...data,
    type: "scrapOverseer",
    isBoss: true,
    isFinalBoss: true,
    bossName: data?.bossName ?? "Schrott-Aufseher",
  });
}
