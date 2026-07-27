import { Enemy } from "./enemy.class.js";
import { getAssetPath } from "../../../js/config/asset-paths.js";

const FULL_CIRCLE_RADIANS = Math.PI * 2;
const VISUAL_CONFIG = Object.freeze({
  sprite: Object.freeze({
    source: getAssetPath("enemies", "drone-guard.png"),
    frameWidth: 48,
    frameHeight: 32,
    frameCount: 20,
  }),
  renderScale: 2,
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
    super(enemyData, VISUAL_CONFIG);
    this.#validateConfig(config);
    this.speedPixelsPerSecond = config.speedPixelsPerSecond;
    this.hoverAmplitudePixels = config.hoverAmplitudePixels;
    this.hoverCyclesPerSecond = config.hoverCyclesPerSecond;
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
    this.velocityX = this.direction * this.speedPixelsPerSecond;
    super.update(deltaTimeSeconds, world);
    this.stayInsidePatrol();
    this.#updateHover(deltaTimeSeconds);
    this.updateAnimation(deltaTimeSeconds);
  }

  #updateHover(deltaTimeSeconds) {
    this.hoverSeconds += deltaTimeSeconds;
    const angle = this.hoverSeconds * this.hoverCyclesPerSecond *
      FULL_CIRCLE_RADIANS;
    this.y = this.hoverCenterY + Math.sin(angle) * this.hoverAmplitudePixels;
  }

  #validateConfig(config) {
    const values = [
      config?.speedPixelsPerSecond,
      config?.hoverAmplitudePixels,
      config?.hoverCyclesPerSecond,
    ];
    if (values.every((value) => Number.isFinite(value) && value > 0)) return;
    throw new TypeError("Die Bewegung des Drohnenwächters ist ungültig.");
  }
}
