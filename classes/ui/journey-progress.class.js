/**
 * Converts climbed metres into a stable journey percentage and biome ID.
 */
export class JourneyProgress {
  /**
   * @param {ReadonlyArray<Readonly<object>>} sections
   * @param {number} startY
   * @param {number} pixelsPerMeter
   */
  constructor(sections, startY, pixelsPerMeter) {
    this.#validate(sections, startY, pixelsPerMeter);
    this.sections = sections;
    this.startY = startY;
    this.pixelsPerMeter = pixelsPerMeter;
    this.maximumHeightMeters = Math.ceil(startY / pixelsPerMeter);
  }

  /** @returns {Readonly<{biomeId:string, percentage:number}>} */
  getSnapshot(heightMeters) {
    const climbedMeters = this.#clampHeight(heightMeters);
    const worldY = this.startY - (climbedMeters * this.pixelsPerMeter);
    const section = this.#findSection(worldY);
    const percentage = Math.round(climbedMeters / this.maximumHeightMeters * 100);
    return Object.freeze({ biomeId: section.backgroundId, percentage });
  }

  /** Performs the clamp height operation. */
  #clampHeight(heightMeters) {
    if (!Number.isFinite(heightMeters)) return 0;
    return Math.min(Math.max(0, heightMeters), this.maximumHeightMeters);
  }

  /** Returns find section. */
  #findSection(worldY) {
    const initialSection = this.sections[0];
    if (worldY === initialSection.bottomY) return initialSection;
    return this.sections.find(({ topY, bottomY }) => {
      return worldY >= topY && worldY < bottomY;
    }) ?? this.sections.at(-1);
  }

  /** Validates the progress state. */
  #validate(sections, startY, pixelsPerMeter) {
    const hasSections = Array.isArray(sections) && sections.length > 0;
    const hasStart = Number.isFinite(startY) && startY > 0;
    const hasScale = Number.isFinite(pixelsPerMeter) && pixelsPerMeter > 0;
    if (hasSections && hasStart && hasScale) return;
    throw new TypeError("Die Reiseanzeige hat ungültige Weltwerte erhalten.");
  }
}
