import { Enemy } from "./enemy.class.js";
import { getAssetPath } from "../../../js/config/asset-paths.js";
import { clamp } from "../../../js/utils/math.js";

const FULL_CIRCLE_RADIANS = Math.PI * 2;
const VISUAL_CONFIG = Object.freeze({
  sprite: Object.freeze({
    source: getAssetPath("enemies", "drone-guard-clean-hd.png"),
    frameWidth: 96,
    frameHeight: 64,
    frameCount: 20,
  }),
  renderScale: 1,
  collisionBox: Object.freeze({
    offsetX: 14,
    offsetY: 10,
    width: 68,
    height: 42,
  }),
  initialState: "move",
  animations: Object.freeze({
    move: Object.freeze({
      startFrame: 4,
      frameCount: 4,
      frameDurationSeconds: 0.1,
      loop: true,
    }),
    attack: Object.freeze({
      startFrame: 11,
      frameCount: 3,
      frameDurationSeconds: 0.09,
      loop: false,
    }),
    hurt: Object.freeze({
      startFrame: 14,
      frameCount: 2,
      frameDurationSeconds: 0.1,
      loop: false,
    }),
    dead: Object.freeze({
      startFrame: 16,
      frameCount: 4,
      frameDurationSeconds: 0.12,
      loop: false,
    }),
  }),
});

/**
 * Fliegender Gegner mit schneller Patrouille und ruhiger Schwebebewegung.
 */
export class DroneGuard extends Enemy {
  /**
   * @param {Readonly<object>} enemyData
   * @param {Readonly<object>} config
   */
  constructor(enemyData, config) {
    super(enemyData, VISUAL_CONFIG, config);
    this.#validateConfig(config);
    this.speedPixelsPerSecond = config.speedPixelsPerSecond;
    this.hoverAmplitudePixels = config.hoverAmplitudePixels;
    this.hoverCyclesPerSecond = config.hoverCyclesPerSecond;
    this.verticalTrackingSpeedPixelsPerSecond =
      config.verticalTrackingSpeedPixelsPerSecond;
    this.verticalTrackingRangePixels = config.verticalTrackingRangePixels;
    this.hoverHomeY = this.y;
    this.hoverCenterY = this.y;
    this.hoverSeconds = 0;
    this.isAffectedByGravity = false;
  }

  /**
   * Fliegt horizontal und schwebt dabei sinusförmig auf und ab.
   * @param {number} deltaTimeSeconds
   * @param {import("../../core/world.class.js").World} world
   */
  update(deltaTimeSeconds, world) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    this.activateBoss();
    if (!this.updateEnemyState(deltaTimeSeconds, "move")) return;
    this.velocityX = this.direction * this.speedPixelsPerSecond;
    super.update(deltaTimeSeconds, world);
    this.stayInsidePatrol();
    this.#updateHover(deltaTimeSeconds, world.character);
    this.updateAnimation(deltaTimeSeconds);
  }

  #updateHover(deltaTimeSeconds, target) {
    this.#trackTarget(deltaTimeSeconds, target);
    this.hoverSeconds += deltaTimeSeconds;
    const angle = this.hoverSeconds * this.hoverCyclesPerSecond *
      FULL_CIRCLE_RADIANS;
    this.y = this.hoverCenterY + Math.sin(angle) * this.hoverAmplitudePixels;
  }

  #trackTarget(deltaTimeSeconds, target) {
    if (!target) return;
    const desiredY = target.y + target.height / 2 - this.height / 2;
    const minimumY = this.hoverHomeY - this.verticalTrackingRangePixels;
    const maximumY = this.hoverHomeY + this.verticalTrackingRangePixels;
    const targetY = clamp(desiredY, minimumY, maximumY);
    const distance = targetY - this.hoverCenterY;
    const maximumStep = this.verticalTrackingSpeedPixelsPerSecond *
      deltaTimeSeconds;
    this.hoverCenterY += clamp(distance, -maximumStep, maximumStep);
  }

  #validateConfig(config) {
    const values = [
      config?.speedPixelsPerSecond,
      config?.hoverAmplitudePixels,
      config?.hoverCyclesPerSecond,
      config?.verticalTrackingSpeedPixelsPerSecond,
      config?.verticalTrackingRangePixels,
    ];
    if (values.every((value) => Number.isFinite(value) && value > 0)) return;
    throw new TypeError("Die Bewegung des Drohnenwächters ist ungültig.");
  }
}
