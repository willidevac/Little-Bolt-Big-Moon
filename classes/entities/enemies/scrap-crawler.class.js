import { Enemy } from "./enemy.class.js";
import { getAssetPath } from "../../../js/config/asset-paths.js";

const VISUAL_CONFIG = Object.freeze({
  sprite: Object.freeze({
    source: getAssetPath("enemies", "scrap-crawler-clean-hd.png"),
    frameWidth: 96,
    frameHeight: 64,
    frameCount: 13,
  }),
  renderScale: 1,
  collisionBox: Object.freeze({
    offsetX: 12,
    offsetY: 16,
    width: 72,
    height: 48,
  }),
  initialState: "walk",
  animations: Object.freeze({
    walk: Object.freeze({
      startFrame: 0,
      frameCount: 4,
      frameDurationSeconds: 0.12,
      loop: true,
    }),
    attack: Object.freeze({
      startFrame: 4,
      frameCount: 3,
      frameDurationSeconds: 0.09,
      loop: false,
    }),
    hurt: Object.freeze({
      startFrame: 7,
      frameCount: 2,
      frameDurationSeconds: 0.1,
      loop: false,
    }),
    dead: Object.freeze({
      startFrame: 9,
      frameCount: 4,
      frameDurationSeconds: 0.12,
      loop: false,
    }),
  }),
});

/**
 * Bodengebundener Gegner, der zwischen zwei Plattformkanten patrouilliert.
 */
export class ScrapCrawler extends Enemy {
  /**
   * @param {Readonly<object>} enemyData
   * @param {Readonly<object>} config
   */
  constructor(enemyData, config) {
    super(enemyData, VISUAL_CONFIG, config);
    this.#validateConfig(config);
    this.speedPixelsPerSecond = config.speedPixelsPerSecond;
  }

  /**
   * Läuft mit Schwerkraft auf Plattformen hin und her.
   * @param {number} deltaTimeSeconds
   * @param {import("../../core/world.class.js").World} world
   */
  update(deltaTimeSeconds, world) {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
    this.activateBoss();
    if (!this.updateEnemyState(deltaTimeSeconds, "walk")) return;
    this.velocityX = this.direction * this.speedPixelsPerSecond;
    super.update(deltaTimeSeconds, world);
    this.stayInsidePatrol();
    this.updateAnimation(deltaTimeSeconds);
  }

  #validateConfig(config) {
    const speed = config?.speedPixelsPerSecond;
    if (Number.isFinite(speed) && speed > 0) return;
    throw new TypeError("Die Geschwindigkeit des Schrottkrabblers ist ungültig.");
  }
}
