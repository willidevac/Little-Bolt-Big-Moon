import { clamp } from "../../js/utils/math.js";

const BIOME_ACTIONS = Object.freeze([
  "reviewBiome1", "reviewBiome2", "reviewBiome3", "reviewBiome4", "reviewBiome5",
  "reviewBoss",
]);

/** Moves Byte during an unlocked review run without a separate physics loop. */
export class ReviewFlightController {
  /**
   * @param {import("../core/game.class.js").Game} game
   * @param {Readonly<object>} config
   */
  constructor(game, config) {
    this.#validate(game, config);
    this.game = game;
    this.config = config;
    this.character = game.world.character;
    this.isEnabled = false;
    this.isFlying = false;
  }

  /** Enables on-demand arrow-key flight for the review run. */
  enable() {
    if (this.isEnabled) return false;
    this.isEnabled = true;
    return true;
  }

  /** Disables the review helper and leaves normal gameplay physics active. */
  disable() {
    if (!this.isEnabled) return false;
    this.isEnabled = false;
    this.#endFlight();
    return true;
  }

  /** @param {number} deltaTimeSeconds */
  update(deltaTimeSeconds) {
    if (!this.isEnabled || !Number.isFinite(deltaTimeSeconds)) return;
    this.#applyBiomeJump();
    const direction = this.#getFlightDirection();
    if (!direction.x && !direction.y) return this.#endFlight();
    this.#beginFlight();
    this.#stopCharacter();
    const isFast = this.game.keyboard.fast;
    this.#syncCameraFollow(isFast);
    this.#applyFlight(deltaTimeSeconds, direction, isFast);
    this.game.runStats.updateHeight(this.character.y);
  }

  /** @param {number} biomeIndex */
  teleportTo(biomeIndex) {
    const target = this.config.reviewTargets[biomeIndex];
    if (!this.#isValidTarget(target)) return false;
    this.#endFlight();
    this.character.x = this.#clampX(target.x);
    this.character.y = this.#clampY(target.y);
    this.#stopCharacter();
    this.game.world.camera.reset(this.character);
    return true;
  }

  /** Teleports Byte to a measured height above the run start. */
  teleportToHeight(heightMeters) {
    if (!Number.isFinite(heightMeters) || heightMeters < 0) return false;
    const startY = this.game.world.level.playerStart.y;
    const pixelsPerMeter = this.game.config.hud.heightPixelsPerMeter;
    this.#endFlight();
    this.character.y = this.#clampY(startY - heightMeters * pixelsPerMeter);
    this.#stopCharacter();
    this.game.world.camera.reset(this.character);
    return true;
  }

  /** Applies biome jump. */
  #applyBiomeJump() {
    BIOME_ACTIONS.some((action, index) => {
      if (!this.game.keyboard.consumePress(action)) return false;
      this.teleportTo(index);
      return true;
    });
  }

  /** Applies flight. */
  #applyFlight(deltaTimeSeconds, direction, isFast) {
    const { x: directionX, y: directionY } = direction;
    const length = Math.hypot(directionX, directionY);
    const distance = this.#getSpeed(isFast) * deltaTimeSeconds;
    this.character.x = this.#clampX(this.character.x + directionX / length * distance);
    this.character.y = this.#clampY(this.character.y + directionY / length * distance);
  }

  /** Returns flight direction. */
  #getFlightDirection() {
    const input = this.game.keyboard;
    return Object.freeze({
      x: Number(input.reviewRight) - Number(input.reviewLeft),
      y: Number(input.reviewDown) - Number(input.reviewUp),
    });
  }

  /** Performs the begin flight operation. */
  #beginFlight() {
    if (this.isFlying) return;
    this.isFlying = true;
    this.character.isAffectedByGravity = false;
    this.character.setInvulnerability(Infinity);
  }

  /** Performs the end flight operation. */
  #endFlight() {
    if (!this.isFlying) return;
    this.isFlying = false;
    this.#syncCameraFollow(false);
    this.character.isAffectedByGravity = true;
    this.character.setInvulnerability(0);
    this.#stopCharacter();
  }

  /** Returns speed. */
  #getSpeed(isFast) {
    const speed = this.config.flightSpeedPixelsPerSecond;
    return isFast ? speed * this.config.fastMultiplier : speed;
  }

  /** Collects camera follow. */
  #syncCameraFollow(isFast) {
    const multiplier = isFast ? this.config.fastMultiplier : 1;
    this.game.world.camera.setFollowSpeedMultiplier?.(multiplier);
  }

  /** Clears character. */
  #stopCharacter() {
    this.character.velocityX = 0;
    this.character.velocityY = 0;
    this.character.setOnGround(false);
  }

  /** Performs the clamp x operation. */
  #clampX(x) {
    return clamp(x, 0, this.game.config.world.width - this.character.width);
  }

  /** Performs the clamp y operation. */
  #clampY(y) {
    return clamp(y, 0, this.game.config.world.height - this.character.height);
  }

  /** Checks the valid target condition. */
  #isValidTarget(target) {
    return Number.isFinite(target?.x) && Number.isFinite(target?.y);
  }

  /** Validates the flight state. */
  #validate(game, config) {
    const hasGame = game?.world?.character && game?.keyboard && game?.runStats;
    const hasHeightScale = Number.isFinite(
      game?.config?.hud?.heightPixelsPerMeter,
    ) && Number.isFinite(game?.world?.level?.playerStart?.y);
    const hasSpeed = Number.isFinite(config?.flightSpeedPixelsPerSecond) &&
      Number.isFinite(config?.fastMultiplier);
    const hasTargets = Array.isArray(config?.reviewTargets) &&
      config.reviewTargets.length === BIOME_ACTIONS.length &&
      config.reviewTargets.every((target) => this.#isValidTarget(target));
    if (hasGame && hasHeightScale && hasSpeed && hasTargets) return;
    throw new TypeError("Der Review-Flug benötigt Spiel, Tempo und sechs Ziele.");
  }
}
