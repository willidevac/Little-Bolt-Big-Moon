import { SpriteSurfacePlatform } from
  "../../classes/environment/sprite-surface-platform.class.js";
import { ThinWallBuilder } from
  "../../classes/systems/thin-wall-builder.class.js";
import { MechanicPlatformBuilder } from
  "../../classes/systems/mechanic-platform-builder.class.js";
import { getAssetPath } from "../config/asset-paths.js";
import {
  getScrapyardPrototypePlatformSpriteConfig,
  getStartFloorSpriteConfig,
} from "../config/wall-course-config.js";
import {
  TUTORIAL_LEVEL_CONFIG,
  TUTORIAL_PLATFORM_DEFINITIONS,
} from "../config/tutorial-level-config.js";

/** Creates the compact production tutorial with the regular level contract. */
export function createTutorialLevel() {
  const sections = Object.freeze([createSection()]);
  const { id, width, height } = TUTORIAL_LEVEL_CONFIG;
  return Object.freeze({
    id, width, height,
    playerStart: Object.freeze({ ...TUTORIAL_LEVEL_CONFIG.playerStart }),
    sections,
    structures: new ThinWallBuilder(TUTORIAL_LEVEL_CONFIG.width).build(sections),
    platforms: createPlatforms(),
    collectables: Object.freeze([]), storyProps: Object.freeze([]),
    hazards: Object.freeze([]), combatZones: Object.freeze([]),
    enemies: Object.freeze([]),
  });
}

/** Creates the tutorial background section from an existing panorama. */
function createSection() {
  return Object.freeze({
    ...TUTORIAL_LEVEL_CONFIG.section,
    backgroundLayers: Object.freeze([Object.freeze({
      source: getAssetPath(
        "backgrounds", "scrapyard-machine-graveyard-background-v1.png",
      ),
      frameWidth: 1024, frameHeight: 1536, scrollRate: 1,
    })]),
  });
}

/** Creates fresh platform entities for every tutorial run. */
function createPlatforms() {
  return Object.freeze(TUTORIAL_PLATFORM_DEFINITIONS.map(createPlatform));
}

/** Creates one platform with its existing production sprite. */
function createPlatform(definition) {
  if (definition.mechanic) {
    return new MechanicPlatformBuilder().create(definition);
  }
  const sprite = definition.platformRole === "floor"
    ? getStartFloorSpriteConfig()
    : getScrapyardPrototypePlatformSpriteConfig(definition.platformRole);
  return new SpriteSurfacePlatform(definition, sprite);
}
