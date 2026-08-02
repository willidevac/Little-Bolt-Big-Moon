/** Überträgt neue Weltwerte vollständig und genau einmal in die Laufstatistik. */
export class RunStatsSynchronizer {
  #runStats;

  /** @param {import("./run-stats.class.js").RunStats} runStats */
  constructor(runStats) {
    this.#runStats = runStats;
  }

  /**
   * Synchronisiert Zeit, Höhe, Funde, Gegner und den aktiven Boss.
   * @param {number} deltaTimeSeconds
   * @param {import("../core/world.class.js").World} world
   */
  update(deltaTimeSeconds, world) {
    this.#runStats.updateTime(deltaTimeSeconds, world.getHeightLossPixels());
    this.#runStats.updateHeight(world.character?.y);
    this.#runStats.applyPickups(world.takeCollectedPickups());
    this.#runStats.applyEnemyDefeats(world.takeDefeatedEnemies());
    this.#runStats.updateBoss(world.bossFight.getSnapshot());
  }
}
