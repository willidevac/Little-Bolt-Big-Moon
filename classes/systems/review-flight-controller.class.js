import { clamp } from "../../js/utils/math.js";

const BIOME_ACTIONS = Object.freeze([
  "reviewBiome1", "reviewBiome2", "reviewBiome3", "reviewBiome4", "reviewBiome5",
  "reviewBoss",
]);

/** Bewegt Byte im freigeschalteten Review-Lauf ohne eigene Physikschleife. */
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
  }

  /** Aktiviert Flug, Unverwundbarkeit und die Review-Eingaben. */
  enable() {
    if (this.isEnabled) return false;
    this.isEnabled = true;
    this.character.isAffectedByGravity = false;
    this.character.invulnerabilitySecondsRemaining = Infinity;
    this.#stopCharacter();
    return true;
  }

  /** @param {number} deltaTimeSeconds */
  update(deltaTimeSeconds) {
    if (!this.isEnabled || !Number.isFinite(deltaTimeSeconds)) return;
    this.#stopCharacter();
    this.#applyBiomeJump();
    this.#applyFlight(deltaTimeSeconds);
    this.game.runStats.updateHeight(this.character.y);
  }

  /** @param {number} biomeIndex */
  teleportTo(biomeIndex) {
    const target = this.config.reviewTargets[biomeIndex];
    if (!this.#isValidTarget(target)) return false;
    this.character.x = this.#clampX(target.x);
    this.character.y = this.#clampY(target.y);
    this.#stopCharacter();
    this.game.world.camera.reset(this.character);
    return true;
  }

  #applyBiomeJump() {
    BIOME_ACTIONS.some((action, index) => {
      if (!this.game.keyboard.consumePress(action)) return false;
      this.teleportTo(index);
      return true;
    });
  }

  #applyFlight(deltaTimeSeconds) {
    const input = this.game.keyboard;
    const directionX = Number(input.right) - Number(input.left);
    const directionY = Number(input.down) - Number(input.jump);
    const length = Math.hypot(directionX, directionY) || 1;
    const distance = this.#getSpeed(input.fast) * deltaTimeSeconds;
    this.character.x = this.#clampX(this.character.x + directionX / length * distance);
    this.character.y = this.#clampY(this.character.y + directionY / length * distance);
  }

  #getSpeed(isFast) {
    const speed = this.config.flightSpeedPixelsPerSecond;
    return isFast ? speed * this.config.fastMultiplier : speed;
  }

  #stopCharacter() {
    this.character.velocityX = 0;
    this.character.velocityY = 0;
    this.character.setOnGround(false);
  }

  #clampX(x) {
    return clamp(x, 0, this.game.config.world.width - this.character.width);
  }

  #clampY(y) {
    return clamp(y, 0, this.game.config.world.height - this.character.height);
  }

  #isValidTarget(target) {
    return Number.isFinite(target?.x) && Number.isFinite(target?.y);
  }

  #validate(game, config) {
    const hasGame = game?.world?.character && game?.keyboard && game?.runStats;
    const hasSpeed = Number.isFinite(config?.flightSpeedPixelsPerSecond) &&
      Number.isFinite(config?.fastMultiplier);
    const hasTargets = Array.isArray(config?.reviewTargets) &&
      config.reviewTargets.length === BIOME_ACTIONS.length &&
      config.reviewTargets.every((target) => this.#isValidTarget(target));
    if (hasGame && hasSpeed && hasTargets) return;
    throw new TypeError("Der Review-Flug benötigt Spiel, Tempo und sechs Ziele.");
  }
}
