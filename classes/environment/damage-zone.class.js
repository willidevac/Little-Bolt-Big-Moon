import { DrawableObject } from "../base/drawable-object.class.js";
import { AnimationController } from "../systems/animation-controller.class.js";
import { getAssetPath } from "../../js/config/asset-paths.js";
import { getGroundedSpriteY } from "../effects/grounded-sprite-position.js";
import {
  WORLD_OBJECT_INDICATOR_TYPES,
  WorldObjectIndicator,
} from "../effects/world-object-indicator.class.js";
import { HAZARD_CONFIGS } from "../../js/config/hazard-config.js";

const DAMAGE_ZONE_SPRITE_CONFIG = Object.freeze({
  source: getAssetPath("tilesets", "scrapyard-hazards-clean-hd.png"),
  frameWidth: 64,
  frameHeight: 64,
  frameCount: 16,
});
const DAMAGE_ZONE_RENDER_SCALE = 1;
const DAMAGE_ZONE_GROUND_OFFSETS = Object.freeze([
  16, 16, 16, 16, 16, 16, 16, 14, 14, 14, 14, 14, 13, 13, 13, 13,
]);
const CYCLE_STATE = "cycle";

/**
 * A visible environmental hazard that creates a hit on contact.
 */
export class DamageZone extends DrawableObject {
  /**
   * @param {Readonly<object>} zoneData
   * @param {Readonly<object>} anchorPlatform
   */
  constructor(zoneData, anchorPlatform) {
    super();
    this.#validateData(zoneData);
    const config = this.#getConfig(zoneData.type);
    this.#initializeVisual(config, zoneData.phaseOffsetSeconds);
    this.#validateAnchor(zoneData, anchorPlatform);
    this.#applyData(zoneData, anchorPlatform, config);
  }

  #applyData(zoneData, anchorPlatform, config) {
    this.id = zoneData.id;
    this.type = zoneData.type;
    this.damage = zoneData.damage;
    this.x = zoneData.x;
    this.y = anchorPlatform.y - this.height;
    this.anchorPlatformId = zoneData.anchorPlatformId;
    this.anchorPlatform = anchorPlatform;
    this.dangerousFrames = config.dangerousFrames;
  }

  #initializeVisual(config, phaseOffsetSeconds = 0) {
    this.width = DAMAGE_ZONE_SPRITE_CONFIG.frameWidth * DAMAGE_ZONE_RENDER_SCALE;
    this.height = DAMAGE_ZONE_SPRITE_CONFIG.frameHeight * DAMAGE_ZONE_RENDER_SCALE;
    this.setCollisionBox(config.collisionBox);
    this.animationController = new AnimationController({ cycle: config.clip });
    this.indicator = new WorldObjectIndicator(
      WORLD_OBJECT_INDICATOR_TYPES.DANGER,
    );
    this.loadSprite(DAMAGE_ZONE_SPRITE_CONFIG);
    this.animationController.setState(CYCLE_STATE);
    const frame = this.animationController.update(CYCLE_STATE, phaseOffsetSeconds);
    this.setFrameIndex(frame);
  }

  /** @returns {boolean} Whether the supporting platform can be touched. */
  get isAvailable() { return this.anchorPlatform.isCollidable !== false; }

  /** @returns {boolean} Whether the visible phase currently causes damage. */
  get isDangerous() {
    return this.isAvailable && this.dangerousFrames.includes(this.frameIndex);
  }

  /**
   * Animates the electrical hazard over time.
   * @param {number} deltaTimeSeconds
   */
  update(deltaTimeSeconds) {
    const frame = this.animationController.update(CYCLE_STATE, deltaTimeSeconds);
    this.setFrameIndex(frame);
    this.indicator.update(deltaTimeSeconds);
    const movement = this.anchorPlatform.getFrameDisplacement();
    this.x += movement.x;
    this.y += movement.y;
  }

  /** Draws the grounded hazard with the shared danger marker. */
  draw(context) {
    if (!this.isAvailable) return;
    context.save();
    this.indicator.drawGroundMarker(context, this);
    this.indicator.applyGlow(context);
    this.drawCurrentFrame(context, this.x, this.#getDrawY(), this.width, this.height);
    context.restore();
  }

  /**
   * Creates a hit that knocks Byte away from the center of the hazard.
   * @param {Readonly<object>} target
   * @returns {Readonly<{amount:number, direction:number}>|null}
   */
  createHit(target) {
    if (!this.isDangerous) return null;
    const targetCenterX = target.x + target.width / 2;
    const zoneCenterX = this.x + this.width / 2;
    const direction = targetCenterX < zoneCenterX ? -1 : 1;
    return Object.freeze({ amount: this.damage, direction });
  }

  #getDrawY() {
    return getGroundedSpriteY(this, DAMAGE_ZONE_GROUND_OFFSETS);
  }

  #validateData(data) {
    const hasIdentity = typeof data?.id === "string" && data.id.length > 0;
    const hasType = typeof data?.type === "string" && HAZARD_CONFIGS[data.type];
    const hasPosition = Number.isFinite(data?.x);
    const hasDamage = Number.isFinite(data?.damage) && data.damage > 0;
    const hasAnchor = typeof data?.anchorPlatformId === "string";
    const offset = data?.phaseOffsetSeconds ?? 0;
    const hasOffset = Number.isFinite(offset) && offset >= 0;
    if (hasIdentity && hasType && hasPosition && hasDamage &&
      hasAnchor && hasOffset) return;
    throw new TypeError("Die Daten der Schadenszone sind ungültig.");
  }

  #validateAnchor(data, platform) {
    const hasMatchingId = data.anchorPlatformId === platform?.id;
    const hasMovement = typeof platform?.getFrameDisplacement === "function";
    const fits = data.x >= platform?.x &&
      data.x + this.width <= platform?.x + platform?.width;
    if (hasMatchingId && hasMovement && fits) return;
    throw new TypeError("Eine Falle braucht eine passende Plattform.");
  }

  #getConfig(type) {
    const config = HAZARD_CONFIGS[type];
    if (config) return config;
    throw new RangeError(`Unbekannter Fallentyp: ${type}`);
  }
}
