import { Projectile } from "./projectile.class.js";
import { getAssetPath } from "../../../js/config/asset-paths.js";

const ARC_VISUAL_CONFIG = Object.freeze({
  sprite: Object.freeze({
    source: getAssetPath("weapons", "arc-projectile-clean-hd.png"),
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
  }),
  renderScale: 1,
  collisionBox: Object.freeze({
    offsetX: 16,
    offsetY: 16,
    width: 32,
    height: 32,
  }),
  animationStartFrame: 0,
  animationFrameCount: 4,
  originOffsetY: 0.5,
});

/**
 * Slow player projectile that chains to a second nearby enemy.
 */
export class ArcProjectile extends Projectile {
  /**
   * @param {Readonly<object>} attack
   * @param {Readonly<object>} config
   */
  constructor(attack, config) {
    validateArcInputs(attack, config);
    super(createProjectileData(attack), config, ARC_VISUAL_CONFIG);
    this.weaponId = attack.weaponId;
    this.direction = Math.sign(attack.direction);
    this.chainRangePixels = config.chainRangePixels;
    this.secondaryDamageMultiplier = config.secondaryDamageMultiplier;
  }

  /**
   * Returns the reduced hit for the second enemy.
   * @returns {Readonly<{amount:number,direction:number,source:string}>}
   */
  createSecondaryHit() {
    const hit = this.createHit();
    return Object.freeze({
      ...hit,
      amount: Math.round(hit.amount * this.secondaryDamageMultiplier),
    });
  }
}

/** Creates projectile data. */
function createProjectileData(attack) {
  return {
    team: "player",
    source: attack.weaponId,
    damage: attack.damage,
    origin: attack.origin,
    direction: { x: attack.direction, y: 0 },
  };
}

/** Validates arc inputs. */
function validateArcInputs(attack, config) {
  const hasAttack = attack?.type === "projectile" &&
    attack.projectileKind === "arc" &&
    Number.isFinite(attack.direction);
  const hasRange = Number.isFinite(config?.chainRangePixels) &&
    config.chainRangePixels > 0;
  const hasMultiplier = Number.isFinite(config?.secondaryDamageMultiplier) &&
    config.secondaryDamageMultiplier > 0 &&
    config.secondaryDamageMultiplier < 1;
  if (hasAttack && hasRange && hasMultiplier) return;
  throw new TypeError("Der Lichtbogenangriff ist ungültig.");
}
