import { Projectile } from "./projectile.class.js";
import { getAssetPath } from "../../../js/config/asset-paths.js";

const BOLT_VISUAL_CONFIG = Object.freeze({
  sprite: Object.freeze({
    source: getAssetPath("weapons", "bolt-projectile-clean-hd.png"),
    frameWidth: 32,
    frameHeight: 16,
    frameCount: 2,
  }),
  renderScale: 1,
  collisionBox: Object.freeze({
    offsetX: 2,
    offsetY: 2,
    width: 28,
    height: 12,
  }),
  animationStartFrame: 0,
  animationFrameCount: 2,
  originOffsetY: 0.5,
});

/**
 * Player bolt using the shared projectile movement.
 */
export class BoltProjectile extends Projectile {
  /**
   * Creates the configured instance.
   * @param {Readonly<object>} attack Attack data processed by the operation.
   * @param {Readonly<object>} config Configuration values used by the operation.
   */
  constructor(attack, config) {
    validateBoltAttack(attack);
    super(createProjectileData(attack), config, BOLT_VISUAL_CONFIG);
    this.weaponId = attack.weaponId;
    this.direction = Math.sign(attack.direction);
  }
}

/**
 * Creates projectile data.
 * @param {Readonly<object>} attack Attack data processed by the operation.
 */
function createProjectileData(attack) {
  return {
    team: "player",
    source: attack.weaponId,
    damage: attack.damage,
    origin: attack.origin,
    direction: { x: attack.direction, y: 0 },
  };
}

/**
 * Validates bolt attack.
 * @param {Readonly<object>} attack Attack data processed by the operation.
 */
function validateBoltAttack(attack) {
  const isBolt = attack?.type === "projectile" &&
    attack.projectileKind === "bolt";
  if (isBolt && Number.isFinite(attack.direction)) return;
  throw new TypeError("Der Spielerangriff ist kein gültiges Projektil.");
}
