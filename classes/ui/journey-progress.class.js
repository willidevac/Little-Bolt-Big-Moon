/**
 * Converts climbed metres into a stable journey percentage and biome ID.
 */
export class JourneyProgress {
  /**
   * Creates the configured instance.
   * @param {ReadonlyArray<Readonly<object>>} sections Journey sections used to resolve progress.
   * @param {number} startY World-space starting height of the journey.
   * @param {number} pixelsPerMeter Conversion factor between world pixels and meters.
   */
  constructor(sections, startY, pixelsPerMeter) {
    this.#validate(sections, startY, pixelsPerMeter);
    this.sections = sections;
    this.startY = startY;
    this.pixelsPerMeter = pixelsPerMeter;
    this.maximumHeightMeters = Math.ceil(startY / pixelsPerMeter);
  }

  /**
   * Runs get snapshot with validated inputs.
   * @param {number} heightMeters Current world height expressed in meters.
   * @returns {Readonly<{biomeId:string, percentage:number}>}
   */
  getSnapshot(heightMeters) {
    const climbedMeters = this.#clampHeight(heightMeters);
    const worldY = this.startY - (climbedMeters * this.pixelsPerMeter);
    const section = this.#findSection(worldY);
    const percentage = Math.round(climbedMeters / this.maximumHeightMeters * 100);
    return Object.freeze({ biomeId: section.backgroundId, percentage });
  }

  /**
   * Performs the clamp height operation.
   * @param {number} heightMeters Current world height expressed in meters.
   */
  #clampHeight(heightMeters) {
    if (!Number.isFinite(heightMeters)) return 0;
    return Math.min(Math.max(0, heightMeters), this.maximumHeightMeters);
  }

  /**
   * Returns find section.
   * @param {number} worldY Vertical world coordinate used to resolve the section.
   */
  #findSection(worldY) {
    const initialSection = this.sections[0];
    if (worldY === initialSection.bottomY) return initialSection;
    return this.sections.find(({ topY, bottomY }) => {
      return worldY >= topY && worldY < bottomY;
    }) ?? this.sections.at(-1);
  }

  /**
   * Validates the progress state.
   * @param {ReadonlyArray<object>} sections Journey sections used to resolve progress.
   * @param {number} startY World-space starting height of the journey.
   * @param {number} pixelsPerMeter Conversion factor between world pixels and meters.
   */
  #validate(sections, startY, pixelsPerMeter) {
    const hasSections = Array.isArray(sections) && sections.length > 0;
    const hasStart = Number.isFinite(startY) && startY > 0;
    const hasScale = Number.isFinite(pixelsPerMeter) && pixelsPerMeter > 0;
    if (hasSections && hasStart && hasScale) return;
    throw new TypeError("Die Reiseanzeige hat ungültige Weltwerte erhalten.");
  }
}
