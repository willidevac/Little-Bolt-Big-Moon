import { Projectile } from "./projectile.class.js";
import { getAssetPath } from "../../../js/config/asset-paths.js";

const BOSS_PROJECTILE_SPRITE = Object.freeze({
  source: getAssetPath("weapons", "boss-projectiles-clean-hd.png"),
  frameWidth: 64,
  frameHeight: 32,
  frameCount: 8,
});
const ENERGY_BOLT_VISUAL_CONFIG = Object.freeze({
  sprite: BOSS_PROJECTILE_SPRITE,
  renderScale: 1,
  collisionBox: Object.freeze({
    offsetX: 8,
    offsetY: 4,
    width: 48,
    height: 24,
  }),
  animationStartFrame: 4,
  animationFrameCount: 4,
  originOffsetY: 0.5,
});
const VISUAL_CONFIGS = Object.freeze({
  shockwave: Object.freeze({
    sprite: BOSS_PROJECTILE_SPRITE,
    renderScale: 1,
    collisionBox: Object.freeze({
      offsetX: 4,
      offsetY: 10,
      width: 56,
      height: 18,
    }),
    animationStartFrame: 0,
    animationFrameCount: 4,
    originOffsetY: 1,
  }),
  moonBolt: ENERGY_BOLT_VISUAL_CONFIG,
  overseerBolt: ENERGY_BOLT_VISUAL_CONFIG,
});

/**
 * Hostile shockwave or aimed energy-bolt projectile.
 */
export class BossProjectile extends Projectile {
  /**
   * Creates the configured instance.
   * @param {Readonly<object>} attackEvent Attack event used to create the projectile.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  constructor(attackEvent, config) {
    const visualConfig = VISUAL_CONFIGS[attackEvent?.kind];
    const runtimeConfig = config?.[attackEvent?.kind];
    if (!visualConfig || !runtimeConfig) {
      throw new RangeError(`Unbekanntes Bossprojektil: ${attackEvent?.kind}`);
    }
    super(createProjectileData(attackEvent), runtimeConfig, visualConfig);
    this.kind = attackEvent.kind;
  }
}

/**
 * Creates projectile data.
 * @param {Event} attackEvent Attack event used to create the projectile.
 */
function createProjectileData(attackEvent) {
  return {
    team: "enemy",
    source: attackEvent.source,
    damage: attackEvent.damage,
    origin: attackEvent.origin,
    direction: attackEvent.direction,
  };
}
