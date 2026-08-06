import { MoonWarden } from "../entities/enemies/moon-warden.class.js";
import { CombatZone } from "../environment/combat-zone.class.js";
import { BossArenaStructure } from
  "../environment/boss-arena-structure.class.js";
import { GAME_CONFIG } from "../../js/config/game-config.js";
import {
  BOSS_ARENA,
  getBossArenaSpriteConfig,
} from "../../js/config/progression-route-config.js";

/** Creates only the final Moon Warden encounter at the top of the route. */
export class FinalBossBuilder {
  /** Returns the boss and its activation area. */
  build() {
    const arena = this.#createArena();
    const boss = this.#createBoss();
    const zone = this.#createZone(boss);
    return Object.freeze({
      structures: Object.freeze([arena]), enemies: Object.freeze([boss]),
      combatZones: Object.freeze([zone]),
    });
  }

  /** Creates arena. */
  #createArena() {
    return new BossArenaStructure(Object.freeze({
      id: "moon-warden-final-arena", role: "boss-arena-shell",
      x: BOSS_ARENA.imageX, y: BOSS_ARENA.imageY,
      width: BOSS_ARENA.imageWidth, height: BOSS_ARENA.imageHeight,
      floorY: BOSS_ARENA.floorY, innerLeftX: BOSS_ARENA.innerLeftX,
      innerRightX: BOSS_ARENA.innerRightX,
      wallThickness: BOSS_ARENA.wallThickness,
      ceilingBottomY: BOSS_ARENA.ceilingBottomY,
      roofThickness: BOSS_ARENA.roofThickness,
      entranceCenterX: BOSS_ARENA.entranceCenterX,
      entranceWidth: BOSS_ARENA.entranceWidth,
    }), getBossArenaSpriteConfig());
  }

  /** Creates boss. */
  #createBoss() {
    return new MoonWarden(Object.freeze({
      id: "moon-warden-final", type: "moonWarden",
      x: 840, y: 408, patrolMinX: 96, patrolMaxX: 1184,
      startDirection: -1, isBoss: true, isFinalBoss: true,
      bossName: "Mondwächter",
    }), GAME_CONFIG.enemies.moonWarden);
  }

  /**
   * Creates zone.
   * @param {ReadonlyArray<object>} boss Boss used while create zone.
   */
  #createZone(boss) {
    return new CombatZone(Object.freeze({
      id: "moon-warden-final-zone", x: 0, y: 0,
      width: 1280, height: BOSS_ARENA.triggerBottomY,
      enemyIds: Object.freeze([boss.id]), unlockPlatformId: null,
    }));
  }
}
