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

/** Creates the deliberately empty baseline used before the new world build. */
export function createLevelOne(enemyConfig = GAME_CONFIG.enemies) {
  validateLevelData(levelData);
  const sections = Object.freeze(levelData.sections.map(createSection));
  const prototype = new ScrapyardPrototypeBuilder();
  const routePlatforms = buildRoute(sections, prototype);
  return assembleLevel(sections, prototype, routePlatforms, enemyConfig);
}

/** Creates build route. */
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

/** Returns last tutorial platform. */
function getLastTutorialPlatform(platforms) {
  return platforms.filter(({ routeRole }) => routeRole === "main")
    .sort((first, second) => first.routeOrder - second.routeOrder).at(-1);
}

/** Creates assemble level. */
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

/** Creates items. */
function createItems(routePlatforms) {
  const itemPlacement = new ItemPlacementBuilder();
  const routeCollectables = itemPlacement.build(routePlatforms);
  const platforms = createPlatforms(routePlatforms, routeCollectables);
  const collectables = createCollectables(
    itemPlacement, platforms, routePlatforms, routeCollectables,
  );
  return Object.freeze({ platforms, collectables });
}

/** Creates level content. */
function createLevelContent(platforms, collectables, enemyConfig) {
  const storyProps = new StoryPropBuilder().build(platforms, collectables);
  const encounters = new CombatEncounterBuilder(levelData.width)
    .build(platforms, enemyConfig);
  return Object.freeze({ storyProps, encounters });
}

/** Creates structures. */
function createStructures(sections, prototype, routePlatforms, boss) {
  return Object.freeze([
    ...new ThinWallBuilder(levelData.width).build(sections),
    ...new EarlyTrickshotWallBuilder().build(sections, routePlatforms),
    ...new JumpWindowBuilder(levelData.width).build(sections, routePlatforms),
    ...prototype.buildStructures(),
    ...boss.structures,
  ]);
}

/** Creates platforms. */
function createPlatforms(routePlatforms, routeCollectables) {
  const firstWeapon = routeCollectables.find(({ weaponId }) => {
    return weaponId === "boltThrower";
  });
  const explorationPlatforms = new ExplorationAreaBuilder(levelData.width)
    .build(routePlatforms, firstWeapon);
  return Object.freeze([...routePlatforms, ...explorationPlatforms]);
}

/** Creates collectables. */
function createCollectables(itemPlacement, platforms, route, existing) {
  return Object.freeze([
    ...existing,
    ...itemPlacement.buildSearchRewards(platforms),
    ...itemPlacement.buildPreBossSupply(route, existing),
  ]);
}

/** Creates level result. */
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

/** Creates section. */
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

/** Validates level data. */
function validateLevelData(data) {
  const values = [data?.width, data?.height,
    data?.playerStart?.x, data?.playerStart?.y];
  const hasIdentity = typeof data?.id === "string" && data.id.length > 0;
  const hasSections = Array.isArray(data?.sections) && data.sections.length > 0;
  if (hasIdentity && hasSections && values.every(Number.isFinite)) return;
  throw new TypeError("The cleared level data is incomplete.");
}
