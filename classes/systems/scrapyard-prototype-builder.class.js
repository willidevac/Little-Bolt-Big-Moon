import { AnimatedBiomeWall } from
  "../environment/animated-biome-wall.class.js";
import { SpriteSurfacePlatform } from
  "../environment/sprite-surface-platform.class.js";
import { getScrapyardPrototypePlatformSpriteConfig, getWallSpriteConfig } from
  "../../js/config/wall-course-config.js";
import {
  SCRAPYARD_PLATFORM_ROLES,
  SCRAPYARD_PROTOTYPE_PLATFORMS,
  SCRAPYARD_PROTOTYPE_WALLS,
} from "../../js/config/scrapyard-prototype-config.js";

/** Builds only the isolated 3,000-pixel scrapyard gameplay prototype. */
export class ScrapyardPrototypeBuilder {
  /** @returns {ReadonlyArray<SpriteSurfacePlatform>} Stable tutorial floors. */
  buildPlatforms() {
    return Object.freeze(SCRAPYARD_PROTOTYPE_PLATFORMS.map((definition) => {
      return this.#createPlatform(definition);
    }));
  }

  /** Creates platform. */
  #createPlatform(definition) {
    const role = SCRAPYARD_PLATFORM_ROLES[definition.platformRole];
    const data = Object.freeze({ ...definition,
      kind: "prototype-jump-platform", biomeId: "scrapyard",
      accentColor: role.accentColor });
    const sprite = getScrapyardPrototypePlatformSpriteConfig(
      definition.platformRole,
    );
    return new SpriteSurfacePlatform(data, sprite);
  }

  /** @returns {ReadonlyArray<AnimatedBiomeWall>} Empty during onboarding. */
  buildStructures() {
    return Object.freeze(SCRAPYARD_PROTOTYPE_WALLS.map((definition, index) => {
      const data = Object.freeze({
        ...definition,
        role: "scrapyard-prototype-wall",
        biomeId: "scrapyard",
        phaseOffset: index * 0.08,
        animationFrameSeconds: 0.22,
      });
      return new AnimatedBiomeWall(data, getWallSpriteConfig("scrapyard"));
    }));
  }
}
