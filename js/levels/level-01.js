import levelData from "../../data/levels/level-01.json" with { type: "json" };
import { ThinWallBuilder } from
  "../../classes/systems/thin-wall-builder.class.js";
import { EarlyTrickshotWallBuilder } from
  "../../classes/systems/early-trickshot-wall-builder.class.js";
import { JumpWindowBuilder } from
  "../../classes/systems/jump-window-builder.class.js";
import { SparseWallPlatformBuilder } from
  "../../classes/systems/sparse-wall-platform-builder.class.js";
import { ScrapyardPrototypeBuilder } from
  "../../classes/systems/scrapyard-prototype-builder.class.js";
import { ProgressionRouteBuilder } from
  "../../classes/systems/progression-route-builder.class.js";
import { FinalBossBuilder } from
  "../../classes/systems/final-boss-builder.class.js";
import { ItemPlacementBuilder } from
  "../../classes/systems/item-placement-builder.class.js";
import { ExplorationAreaBuilder } from
  "../../classes/systems/exploration-area-builder.class.js";
import { CombatEncounterBuilder } from
  "../../classes/systems/combat-encounter-builder.class.js";
import { StoryPropBuilder } from
  "../../classes/systems/story-prop-builder.class.js";
import { GAME_CONFIG } from "../config/game-config.js";
import { getAssetPath } from "../config/asset-paths.js";

/**
 * Creates the deliberately empty baseline used before the new world build.
 * @param {object} [enemyConfig=GAME_CONFIG.enemies] Enemy definitions used to populate the level.
 */
export function createLevelOne(enemyConfig = GAME_CONFIG.enemies) {
  validateLevelData(levelData);
  const sections = Object.freeze(levelData.sections.map(createSection));
  const prototype = new ScrapyardPrototypeBuilder();
  const routePlatforms = buildRoute(sections, prototype);
  return assembleLevel(sections, prototype, routePlatforms, enemyConfig);
}

/**
 * Builds the complete mandatory platform route.
 * @param {ReadonlyArray<object>} sections Immutable level sections used to assemble the route.
 * @param {object} prototype Scrapyard prototype builder used for the opening route.
 */
function buildRoute(sections, prototype) {
  const prototypePlatforms = prototype.buildPlatforms();
  const wallPlatforms = new SparseWallPlatformBuilder(levelData.width)
    .build(sections);
  const lastTutorialPlatform = getLastTutorialPlatform(prototypePlatforms);
  const progression = new ProgressionRouteBuilder(levelData.width).build(
    sections, wallPlatforms, lastTutorialPlatform,
  );
  return Object.freeze([...wallPlatforms, ...prototypePlatforms, ...progression]);
}

/**
 * Returns the final mandatory platform of the opening prototype.
 * @param {ReadonlyArray<object>} platforms Platform definitions used to place level content.
 */
function getLastTutorialPlatform(platforms) {
  return platforms.filter(({ routeRole }) => routeRole === "main")
    .sort((first, second) => first.routeOrder - second.routeOrder).at(-1);
}

/**
 * Assembles the production level and all generated content.
 * @param {ReadonlyArray<object>} sections Immutable level sections used to assemble the route.
 * @param {object} prototype Scrapyard prototype builder used for the opening route.
 * @param {ReadonlyArray<object>} routePlatforms Platforms that form the mandatory progression route.
 * @param {object} enemyConfig Enemy definitions used to populate the level.
 */
function assembleLevel(sections, prototype, routePlatforms, enemyConfig) {
  const boss = new FinalBossBuilder().build();
  const structures = createStructures(sections, prototype, routePlatforms, boss);
  const { platforms, collectables } = createItems(routePlatforms);
  const content = createLevelContent(platforms, collectables, enemyConfig);
  return createLevelResult(
    sections, structures, platforms, collectables,
    content.storyProps, content.encounters, boss,
  );
}

/**
 * Places route pickups and any platforms required by exploration rewards.
 * @param {ReadonlyArray<object>} routePlatforms Platforms that form the mandatory progression route.
 */
function createItems(routePlatforms) {
  const itemPlacement = new ItemPlacementBuilder();
  const routeCollectables = itemPlacement.build(routePlatforms);
  const platforms = createPlatforms(routePlatforms, routeCollectables);
  const collectables = createCollectables(
    itemPlacement, platforms, routePlatforms, routeCollectables,
  );
  return Object.freeze({ platforms, collectables });
}

/**
 * Creates story props and combat encounters around placed content.
 * @param {ReadonlyArray<object>} platforms Platform definitions used to place level content.
 * @param {ReadonlyArray<object>} collectables Collectable definitions included in the level.
 * @param {object} enemyConfig Enemy definitions used to populate the level.
 */
function createLevelContent(platforms, collectables, enemyConfig) {
  const storyProps = new StoryPropBuilder().build(platforms, collectables);
  const encounters = new CombatEncounterBuilder(levelData.width)
    .build(platforms, enemyConfig);
  return Object.freeze({ storyProps, encounters });
}

/**
 * Creates walls, route features, and boss-arena structures.
 * @param {ReadonlyArray<object>} sections Immutable level sections used to assemble the route.
 * @param {object} prototype Scrapyard prototype builder used for the opening route.
 * @param {ReadonlyArray<object>} routePlatforms Platforms that form the mandatory progression route.
 * @param {object} boss Final boss content included in the level.
 */
function createStructures(sections, prototype, routePlatforms, boss) {
  return Object.freeze([
    ...new ThinWallBuilder(levelData.width).build(sections),
    ...new EarlyTrickshotWallBuilder().build(sections, routePlatforms),
    ...new JumpWindowBuilder(levelData.width).build(sections, routePlatforms),
    ...prototype.buildStructures(),
    ...boss.structures,
  ]);
}

/**
 * Extends the mandatory route with optional exploration platforms.
 * @param {ReadonlyArray<object>} routePlatforms Platforms that form the mandatory progression route.
 * @param {ReadonlyArray<object>} routeCollectables Pickups already placed on the route.
 */
function createPlatforms(routePlatforms, routeCollectables) {
  const firstWeapon = routeCollectables.find(({ weaponId }) => {
    return weaponId === "boltThrower";
  });
  const explorationPlatforms = new ExplorationAreaBuilder(levelData.width)
    .build(routePlatforms, firstWeapon);
  return Object.freeze([...routePlatforms, ...explorationPlatforms]);
}

/**
 * Combines route pickups, search rewards, and pre-boss supplies.
 * @param {object} itemPlacement Builder responsible for placing route rewards.
 * @param {ReadonlyArray<object>} platforms Platform definitions used to place level content.
 * @param {ReadonlyArray<object>} route Route platforms used to position the content.
 * @param {ReadonlyArray<object>} existing Existing collectables retained in the result.
 */
function createCollectables(itemPlacement, platforms, route, existing) {
  return Object.freeze([
    ...existing,
    ...itemPlacement.buildSearchRewards(platforms),
    ...itemPlacement.buildPreBossSupply(route, existing),
  ]);
}

/**
 * Creates the immutable production-level contract.
 * @param {ReadonlyArray<object>} sections Immutable level sections used to assemble the route.
 * @param {ReadonlyArray<object>} structures Static structure definitions included in the level.
 * @param {ReadonlyArray<object>} platforms Platform definitions used to place level content.
 * @param {ReadonlyArray<object>} collectables Collectable definitions included in the level.
 * @param {ReadonlyArray<object>} storyProps Story-prop definitions included in the level.
 * @param {object} encounters Generated combat enemies and activation zones.
 * @param {object} boss Final boss content included in the level.
 */
function createLevelResult(sections, structures, platforms, collectables,
  storyProps, encounters, boss) {
  const combatZones = Object.freeze([
    ...encounters.combatZones, ...boss.combatZones,
  ]);
  const enemies = Object.freeze([...encounters.enemies, ...boss.enemies]);
  return Object.freeze({
    id: levelData.id, width: levelData.width, height: levelData.height,
    playerStart: Object.freeze({ ...levelData.playerStart }),
    sections, structures, platforms, collectables, storyProps,
    hazards: Object.freeze([]), combatZones, enemies,
  });
}

/**
 * Adds the configured background layer to one source section.
 * @param {object} section Source section definition to convert into runtime data.
 */
function createSection(section) {
  return Object.freeze({
    ...section,
    backgroundLayers: Object.freeze([Object.freeze({
      source: getAssetPath("backgrounds", `${section.id}-background-v1.png`),
      frameWidth: 1024,
      frameHeight: 1536,
      scrollRate: 1,
    })]),
  });
}

/**
 * Validates the minimum data required to build the production level.
 * @param {object} data Source data that must satisfy the level contract.
 */
function validateLevelData(data) {
  const values = [data?.width, data?.height,
    data?.playerStart?.x, data?.playerStart?.y];
  const hasIdentity = typeof data?.id === "string" && data.id.length > 0;
  const hasSections = Array.isArray(data?.sections) && data.sections.length > 0;
  if (hasIdentity && hasSections && values.every(Number.isFinite)) return;
  throw new TypeError("The cleared level data is incomplete.");
}
