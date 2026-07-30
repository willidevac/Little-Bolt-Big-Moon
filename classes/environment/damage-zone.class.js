import { DrawableObject } from "../base/drawable-object.class.js";
import { AnimationController } from "../systems/animation-controller.class.js";
import { getAssetPath } from "../../js/config/asset-paths.js";

const DAMAGE_ZONE_SPRITE_CONFIG = Object.freeze({
  source: getAssetPath("tilesets", "scrapyard-hazards-clean-hd.png"),
  frameWidth: 64,
  frameHeight: 64,
  frameCount: 16,
});
const DAMAGE_ZONE_RENDER_SCALE = 1;
const DAMAGE_ZONE_COLLISION_BOX = Object.freeze({
  offsetX: 16,
  offsetY: 10,
  width: 32,
  height: 48,
});
const ELECTRIC_ANIMATION = Object.freeze({
  electric: Object.freeze({
    startFrame: 4,
    frameCount: 4,
    frameDurationSeconds: 0.1,
    loop: true,
  }),
});

/**
 * Eine sichtbare Umweltgefahr, die bei Berührung einen Treffer erzeugt.
 */
export class DamageZone extends DrawableObject {
  /**
   * @param {Readonly<object>} zoneData
   */
  constructor(zoneData) {
    super();
    this.#validateData(zoneData);
    this.id = zoneData.id;
    this.damage = zoneData.damage;
    this.x = zoneData.x;
    this.y = zoneData.y;
    this.width = DAMAGE_ZONE_SPRITE_CONFIG.frameWidth * DAMAGE_ZONE_RENDER_SCALE;
    this.height = DAMAGE_ZONE_SPRITE_CONFIG.frameHeight * DAMAGE_ZONE_RENDER_SCALE;
    this.setCollisionBox(DAMAGE_ZONE_COLLISION_BOX);
    this.animationController = new AnimationController(ELECTRIC_ANIMATION);
    this.loadSprite(DAMAGE_ZONE_SPRITE_CONFIG);
    this.setFrameIndex(this.animationController.setState("electric"));
  }

  /**
   * Animiert die elektrische Gefahr zeitbasiert.
   * @param {number} deltaTimeSeconds
   */
  update(deltaTimeSeconds) {
    const frame = this.animationController.update("electric", deltaTimeSeconds);
    this.setFrameIndex(frame);
  }

  /**
   * Erzeugt einen Treffer, der Byte von der Gefahrenmitte wegstößt.
   * @param {Readonly<object>} target
   * @returns {Readonly<{amount:number, direction:number}>}
   */
  createHit(target) {
    const targetCenterX = target.x + target.width / 2;
    const zoneCenterX = this.x + this.width / 2;
    const direction = targetCenterX < zoneCenterX ? -1 : 1;
    return Object.freeze({ amount: this.damage, direction });
  }

  #validateData(data) {
    const hasIdentity = typeof data?.id === "string" && data.id.length > 0;
    const hasPosition = Number.isFinite(data?.x) && Number.isFinite(data?.y);
    const hasDamage = Number.isFinite(data?.damage) && data.damage > 0;
    if (hasIdentity && hasPosition && hasDamage) return;
    throw new TypeError("Die Daten der Schadenszone sind ungültig.");
  }
}
