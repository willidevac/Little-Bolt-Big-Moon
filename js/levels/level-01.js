import levelData from "../../data/levels/level-01.json" with { type: "json" };
import { AuthoredRoom } from
  "../../classes/environment/authored-room.class.js";
import { FallingPlatform } from
  "../../classes/environment/falling-platform.class.js";
import { Platform } from "../../classes/environment/platform.class.js";
import { RoomPuzzleRouteBuilder } from
  "../../classes/systems/room-puzzle-route-builder.class.js";
import { getAssetPath } from "../config/asset-paths.js";
import { getPlatformTilesetConfig } from
  "../config/platform-tileset-config.js";
import { createRoomPieceLayout } from "./room-stack-layout.js";

/** Creates the room-by-room rebuild of Little Bolt, Big Moon. */
export function createLevelOne() {
  validateLevelData(levelData);
  return createLevelDefinition(levelData);
}

function createLevelDefinition(data) {
  return Object.freeze({
    id: data.id,
    width: data.width,
    height: data.height,
    playerStart: Object.freeze({ ...data.playerStart }),
    sections: Object.freeze(data.sections.map(createSection)),
    structures: Object.freeze(createStructures(data)),
    ...createEntityGroups(data),
  });
}

function createEntityGroups(data) {
  return Object.freeze({
    platforms: Object.freeze(createPuzzlePlatforms(data)),
    collectables: Object.freeze([]),
    storyProps: Object.freeze([]),
    hazards: Object.freeze([]),
    combatZones: Object.freeze([]),
    enemies: Object.freeze([]),
  });
}

function createPuzzlePlatforms(data) {
  return new RoomPuzzleRouteBuilder(data).build().map((definition) => {
    return createPuzzlePlatform(definition, data.platformTypes);
  });
}

function createPuzzlePlatform(definition, platformTypes) {
  const platformType = platformTypes[definition.type];
  const platformData = Object.freeze({ ...platformType, ...definition });
  const PlatformClass = definition.type === "falling" ?
    FallingPlatform : Platform;
  return new PlatformClass(platformData,
    getPlatformTilesetConfig(definition.tileset));
}

function createStructures(data) {
  const templates = createRoomTemplateMap(data.roomTemplates);
  return [...createRoomStack(data, templates), ...data.rooms.map(createRoom)];
}

function createRoomStack(data, templates) {
  return data.sections.flatMap((section, index) => {
    const pieces = createRoomPieceLayout(
      section, index, data.sections.length, data.roomStack,
    );
    return pieces.map((piece) => {
      const template = templates.get(piece.templateId);
      return createRoom(createStackPiece(section, template, piece, data));
    });
  });
}

function createStackPiece(section, template, piece, data) {
  const reference = data.roomStack;
  const collisionBoxes = scaleCollisionBoxes(template.collisionBoxes,
    data.width, piece.height, reference);
  return Object.freeze({
    id: `${section.id}-room-${String(piece.index + 1).padStart(2, "0")}`,
    source: template.source,
    sourceWidth: reference.sourceWidth, sourceHeight: reference.sourceHeight,
    x: 0, y: piece.y, width: data.width, height: piece.height,
    collisionBoxes,
  });
}

function scaleCollisionBoxes(boxes, width, height, reference) {
  const scaleX = width / reference.referenceWidth;
  const scaleY = height / reference.referenceHeight;
  return boxes.map((box) => Object.freeze({
    ...box,
    offsetX: box.offsetX * scaleX,
    offsetY: box.offsetY * scaleY,
    width: box.width * scaleX,
    height: box.height * scaleY,
  }));
}

function createRoomTemplateMap(templates) {
  return new Map(templates.map((template) => [template.id, template]));
}

function createRoom(room) {
  const spriteConfig = Object.freeze({
    source: getAssetPath("rooms", room.source),
    frameWidth: room.sourceWidth,
    frameHeight: room.sourceHeight,
    frameCount: 1,
  });
  return new AuthoredRoom(room, spriteConfig);
}

function createSection(section) {
  return Object.freeze({
    ...section,
    backgroundLayers: Object.freeze([createBackgroundLayer(section.id)]),
  });
}

function createBackgroundLayer(sectionId) {
  return Object.freeze({
    source: getAssetPath("backgrounds", `${sectionId}-background-v1.png`),
    frameWidth: 1024,
    frameHeight: 1536,
    scrollRate: 1,
  });
}

function validateLevelData(data) {
  if (hasLevelIdentity(data) && hasLevelCollections(data) &&
    hasValidRoomPlan(data)) return;
  throw new TypeError("The level rebuild data is incomplete.");
}

function hasLevelIdentity(data) {
  const hasId = typeof data?.id === "string" && data.id.length > 0;
  const size = [data?.width, data?.height, data?.playerStart?.x,
    data?.playerStart?.y];
  return hasId && size.every(Number.isFinite) && data.width > 0 &&
    data.height > 0;
}

function hasLevelCollections(data) {
  return ["sections", "roomTemplates", "rooms", "platforms", "collectables",
    "storyProps", "hazards", "combatZones", "enemies"].every((key) => {
    return Array.isArray(data?.[key]);
  });
}

function hasValidRoomPlan(data) {
  const hasStack = Number.isInteger(data?.roomStack?.piecesPerSection) &&
    data.roomStack.piecesPerSection > 0;
  const hasPatterns = data?.sections?.every(({ roomPattern }) => {
    return Array.isArray(roomPattern) && roomPattern.length > 0;
  });
  return hasStack && hasPatterns && data.sections.length > 0 &&
    data.roomTemplates.length > 0 && data.rooms.length > 0;
}
