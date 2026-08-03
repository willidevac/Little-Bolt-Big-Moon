import levelData from "../../data/levels/level-01.json" with { type: "json" };
import { AuthoredRoom } from
  "../../classes/environment/authored-room.class.js";
import { getAssetPath } from "../config/asset-paths.js";

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
    ...createEmptyEntityGroups(),
  });
}

function createStructures(data) {
  const templates = createRoomTemplateMap(data.roomTemplates);
  return [...createRoomStack(data, templates), ...data.rooms.map(createRoom)];
}

function createRoomStack(data, templates) {
  const lastIndex = data.sections.length - 1;
  return data.sections.flatMap((section, index) => {
    const bounds = getStackBounds(section, index, lastIndex, data.roomStack);
    const count = getStackPieceCount(index, lastIndex, data.roomStack);
    return createSectionRoomStack(section, bounds, count, data, templates);
  });
}

function createSectionRoomStack(section, bounds, count, data, templates) {
  const pieceHeight = (bounds.bottomY - bounds.topY) / count;
  return Array.from({ length: count }, (_, index) => {
    const templateId = section.roomPattern[index % section.roomPattern.length];
    const template = templates.get(templateId);
    const room = createStackPiece(section, template, index, pieceHeight,
      bounds.topY, data);
    return createRoom(room);
  });
}

function createStackPiece(section, template, index, height, topY, data) {
  const reference = data.roomStack;
  const collisionBoxes = scaleCollisionBoxes(template.collisionBoxes,
    data.width, height, reference);
  return Object.freeze({
    id: `${section.id}-room-${String(index + 1).padStart(2, "0")}`,
    source: template.source,
    sourceWidth: reference.sourceWidth, sourceHeight: reference.sourceHeight,
    x: 0, y: topY + index * height, width: data.width, height,
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

function getStackBounds(section, index, lastIndex, stack) {
  return Object.freeze({
    topY: index === lastIndex ? stack.bossRoomBottomY : section.topY,
    bottomY: index === 0 ? stack.startRoomTopY : section.bottomY,
  });
}

function getStackPieceCount(index, lastIndex, stack) {
  if (index === 0) return stack.firstSectionPieces;
  if (index === lastIndex) return stack.lastSectionPieces;
  return stack.piecesPerSection;
}

function createRoomTemplateMap(templates) {
  return new Map(templates.map((template) => [template.id, template]));
}

function createEmptyEntityGroups() {
  return Object.freeze(Object.fromEntries([
    "platforms", "collectables", "storyProps", "hazards", "combatZones",
    "enemies",
  ].map((group) => [group, Object.freeze([])])));
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
