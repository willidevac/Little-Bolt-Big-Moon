import { AnimatedBiomeWall } from
  "../environment/animated-biome-wall.class.js";
import { getWallSpriteConfig, WALL_BOUNCE_CHALLENGES, WALL_WIDTH } from
  "../../js/config/wall-course-config.js";

const BIOME_WALL_SPEEDS = Object.freeze({
  scrapyard: 0.22,
  factory: 0.18,
  "launch-tower": 0.15,
  "space-station": 0.12,
  moon: 0.28,
});

/** Builds one continuous 48-pixel wall pair for each biome. */
export class ThinWallBuilder {
  /** @param {number} worldWidth */
  constructor(worldWidth) {
    if (!Number.isFinite(worldWidth) || worldWidth <= WALL_WIDTH * 2) {
      throw new RangeError("The thin-wall world width is invalid.");
    }
    this.worldWidth = worldWidth;
  }

  /** Returns biome boundaries plus sparse late-game rebound shafts. */
  build(sections) {
    const biomeBounds = this.#getBiomeBounds(sections);
    const boundaries = biomeBounds.flatMap((biome, index) =>
      this.#createBoundaryPair(biome, index));
    const challenges = this.#getChallengesFor(biomeBounds);
    const reboundWalls = challenges.flatMap((challenge, index) =>
      this.#createReboundPair(challenge, index));
    return Object.freeze([...boundaries, ...reboundWalls]);
  }

  /** Returns rebound challenges belonging to the supplied biomes. */
  #getChallengesFor(biomes) {
    const biomeIds = new Set(biomes.map(({ id }) => id));
    return WALL_BOUNCE_CHALLENGES.filter(({ biomeId }) => {
      return biomeIds.has(biomeId);
    });
  }

  /** Creates boundary pair. */
  #createBoundaryPair(biome, index) {
    return [this.#createWall(biome, "left", index),
      this.#createWall(biome, "right", index)];
  }

  /** Creates rebound pair. */
  #createReboundPair(challenge, index) {
    return [this.#createReboundWall(challenge, "left", challenge.leftX, index),
      this.#createReboundWall(challenge, "right", challenge.rightX, index)];
  }

  /** Creates wall. */
  #createWall(biome, side, biomeIndex) {
    const data = Object.freeze({
      id: `${biome.id}-${side}-thin-wall`,
      role: "animated-thin-wall",
      side,
      x: side === "left" ? 0 : this.worldWidth - WALL_WIDTH,
      y: biome.topY,
      height: biome.bottomY - biome.topY,
      phaseOffset: biomeIndex * 0.07 + (side === "right" ? 0.09 : 0),
      animationFrameSeconds: BIOME_WALL_SPEEDS[biome.id],
    });
    return new AnimatedBiomeWall(data, getWallSpriteConfig(biome.id));
  }

  /** Creates rebound wall. */
  #createReboundWall(challenge, side, x, challengeIndex) {
    const data = Object.freeze({
      ...this.#getReboundIdentity(challenge, side, x),
      ...this.#getReboundMotion(challenge),
      ...this.#getExitAssist(challenge),
      phaseOffset: challengeIndex * 0.11 + (side === "right" ? 0.09 : 0),
      animationFrameSeconds: BIOME_WALL_SPEEDS[challenge.biomeId],
    });
    return new AnimatedBiomeWall(data, getWallSpriteConfig(challenge.biomeId));
  }

  /** Returns rebound identity. */
  #getReboundIdentity(challenge, side, x) {
    return {
      id: `${challenge.id}-${side}-wall`,
      role: "wall-bounce-choke", challengeId: challenge.id,
      biomeId: challenge.biomeId, side, x, y: challenge.y,
      height: challenge.height,
      corridorWidth: challenge.corridorWidth,
    };
  }

  /** Returns rebound motion. */
  #getReboundMotion(challenge) {
    return {
      reboundHorizontalSpeedPixelsPerSecond:
        challenge.reboundHorizontalSpeedPixelsPerSecond,
      reboundVerticalSpeedPixelsPerSecond:
        challenge.reboundVerticalSpeedPixelsPerSecond,
      reboundControlSeconds: challenge.reboundControlSeconds,
      reboundReleasedVerticalRatio: challenge.reboundReleasedVerticalRatio,
      reboundDropVerticalRatio: challenge.reboundDropVerticalRatio,
    };
  }

  /** Returns exit assist. */
  #getExitAssist(challenge) {
    return {
      exitTargetCenterX: challenge.exitTargetCenterX,
      exitTargetSurfaceY: challenge.exitTargetSurfaceY,
      exitAssistBandPixels: challenge.exitAssistBandPixels,
      exitAssistVerticalSpeedPixelsPerSecond:
        challenge.exitAssistVerticalSpeedPixelsPerSecond,
      exitAssistMaximumHorizontalSpeedPixelsPerSecond:
        challenge.exitAssistMaximumHorizontalSpeedPixelsPerSecond,
      exitAssistControlSeconds: challenge.exitAssistControlSeconds,
    };
  }

  /** Returns biome bounds. */
  #getBiomeBounds(sections) {
    const bounds = new Map();
    sections.forEach((section) => {
      const current = bounds.get(section.tileset) ?? {
        id: section.tileset,
        topY: section.topY,
        bottomY: section.bottomY,
      };
      current.topY = Math.min(current.topY, section.topY);
      current.bottomY = Math.max(current.bottomY, section.bottomY);
      bounds.set(section.tileset, current);
    });
    return [...bounds.values()];
  }
}
