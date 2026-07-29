import { Projectile } from "./projectile.class.js";
import { getAssetPath } from "../../../js/config/asset-paths.js";

const BOLT_VISUAL_CONFIG = Object.freeze({
  sprite: Object.freeze({
    source: getAssetPath("weapons", "bolt-projectile.png"),
    frameWidth: 16,
    frameHeight: 8,
    frameCount: 2,
  }),
  renderScale: 2,
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
 * Spielerbolzen mit der gemeinsamen Projektilbewegung.
 */
export class BoltProjectile extends Projectile {
  /**
   * @param {Readonly<object>} attack
   * @param {Readonly<object>} config
   */
  constructor(attack, config) {
    validateBoltAttack(attack);
    super(createProjectileData(attack), config, BOLT_VISUAL_CONFIG);
    this.weaponId = attack.weaponId;
    this.direction = Math.sign(attack.direction);
  }
}

function createProjectileData(attack) {
  return {
    team: "player",
    source: attack.weaponId,
    damage: attack.damage,
    origin: attack.origin,
    direction: { x: attack.direction, y: 0 },
  };
}

function validateBoltAttack(attack) {
  const isBolt = attack?.type === "projectile" &&
    attack.projectileKind === "bolt";
  if (isBolt && Number.isFinite(attack.direction)) return;
  throw new TypeError("Der Spielerangriff ist kein gültiges Projektil.");
}
