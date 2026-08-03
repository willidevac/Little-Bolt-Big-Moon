import { EnvironmentStructure } from
  "../environment/environment-structure.class.js";
import { ArchitectureAtlasLibrary } from
  "../environment/architecture-atlas-library.class.js";
import { getLandmarkLayout } from
  "../../js/config/environment-landmark-config.js";
import { PLATFORM_WIDTHS } from "../../js/config/platform-route-rules.js";

const MODULE_SCALES = Object.freeze({
  wall: 0.72,
  facade: 0.78,
  overhead: 0.82,
  tower: 0.8,
  arch: 0.9,
  corner: 0.86,
  ledge: 0.7,
});
const WALL_COLLIDER_WIDTH = 36;

/** Builds only explicitly authored landmark architecture. */
export class EnvironmentArchitectureBuilder {
  /**
   * @param {number} worldWidth
   * @param {ArchitectureAtlasLibrary} [atlasLibrary]
   */
  constructor(worldWidth, atlasLibrary = new ArchitectureAtlasLibrary()) {
    if (!Number.isFinite(worldWidth) || worldWidth <= 0) {
      throw new TypeError("The architecture builder needs a positive world width.");
    }
    if (typeof atlasLibrary?.get !== "function") {
      throw new TypeError("The architecture builder needs an atlas library.");
    }
    this.worldWidth = worldWidth;
    this.atlasLibrary = atlasLibrary;
  }

  /** Builds architecture only for rooms explicitly marked as landmarks. */
  build(sections, platforms) {
    this.#validateCollections(sections, platforms);
    const structures = sections.flatMap((section, sectionIndex) => {
      return this.#buildSection(section, sectionIndex, platforms);
    });
    return Object.freeze(structures);
  }

  #buildSection(section, sectionIndex, platforms) {
    return section.route.rooms.flatMap((room, roomIndex) => {
      if (!room.landmark) return [];
      return this.#buildRoom(section, sectionIndex, room, roomIndex, platforms);
    });
  }

  #buildRoom(section, sectionIndex, room, roomIndex, platforms) {
    const roomPlatforms = this.#findRoomPlatforms(section, room, platforms);
    if (roomPlatforms.length === 0) return [];
    const variantId = (sectionIndex + roomIndex) % 2 === 0
      ? "base" : "alternate";
    const architecture = this.atlasLibrary.get(section.tileset, variantId);
    return this.#createLandmarkStructures(
      section, room, architecture, roomPlatforms,
    );
  }

  #createLandmarkStructures(section, room, architecture, platforms) {
    const roomData = this.#createRoomData(platforms);
    const solidWallSide = this.#selectSolidWallSide(
      roomData, architecture.frames,
    );
    return getLandmarkLayout(room.landmark).map((frameId, index) => {
      return this.#createLandmarkStructure(
        section, room, architecture, roomData, solidWallSide, frameId, index,
      );
    });
  }

  #createLandmarkStructure(
    section, room, architecture, roomData, solidWallSide, frameId, index,
  ) {
    const data = this.#createLandmarkData(
      section.id, room.id, frameId, index, architecture.frames, roomData,
      solidWallSide,
    );
    return new EnvironmentStructure(data, architecture.atlas);
  }

  #createLandmarkData(
    sectionId, roomId, frameId, index, frames, roomData, solidWallSide,
  ) {
    const role = this.#getFrameRole(frameId);
    const frame = frames[frameId];
    const size = this.#getRenderSize(frame, MODULE_SCALES[role]);
    const position = this.#getLandmarkPosition(frameId, roomData, size);
    const collisionBoxes = this.#getLandmarkCollisions(frameId, size,
      solidWallSide);
    return Object.freeze({
      id: `${sectionId}-${roomId}-landmark-${index + 1}`,
      role, frame, ...position, ...size, collisionBoxes,
    });
  }

  #getLandmarkPosition(frameId, roomData, size) {
    if (frameId === "ledge") {
      return this.#getLedgePosition(roomData.side, roomData.bounds, size);
    }
    const x = this.#getLandmarkX(frameId, roomData.side, size.width);
    const y = this.#getLandmarkY(frameId, roomData.bounds, size.height);
    return Object.freeze({ x, y });
  }

  #getLandmarkX(frameId, side, width) {
    if (frameId.startsWith("left")) return 0;
    if (frameId.startsWith("right")) return this.worldWidth - width;
    if (frameId === "tower") {
      return side === "left" ? 0 : this.worldWidth - width;
    }
    return Math.round((this.worldWidth - width) / 2);
  }

  #getLandmarkY(frameId, bounds, height) {
    if (frameId === "overhead") return bounds.top - 24;
    const bottomOffset = frameId === "facade" || frameId === "arch" ? 48 : 56;
    return bounds.bottom + bottomOffset - height;
  }

  #getLandmarkCollisions(frameId, size, solidWallSide) {
    if (frameId === "leftWall" && solidWallSide === "left") {
      return [this.#createSideCollision("left", size)];
    }
    if (frameId === "rightWall" && solidWallSide === "right") {
      return [this.#createSideCollision("right", size)];
    }
    if (frameId === "ledge") return [this.#createTopCollision(size)];
    return this.#hasWalkableTop(frameId)
      ? [this.#createTopCollision(size)] : [];
  }

  #selectSolidWallSide(roomData, frames) {
    const leftHits = this.#countWallIntersections("left", roomData, frames);
    const rightHits = this.#countWallIntersections("right", roomData, frames);
    if (leftHits === rightHits) return roomData.side;
    return leftHits < rightHits ? "left" : "right";
  }

  #countWallIntersections(side, roomData, frames) {
    const frameId = `${side}Wall`;
    const frame = frames[frameId];
    const size = this.#getRenderSize(frame, MODULE_SCALES.wall);
    const position = this.#getLandmarkPosition(frameId, roomData, size);
    const local = this.#createSideCollision(side, size);
    const collider = this.#createAbsoluteCollider(position, local);
    return roomData.platforms.filter((platform) => {
      return this.#platformCrossesCollider(platform, collider);
    }).length;
  }

  #createAbsoluteCollider(position, collider) {
    return Object.freeze({
      x: position.x + collider.offsetX,
      y: position.y + collider.offsetY,
      width: collider.width,
      height: collider.height,
    });
  }

  #platformCrossesCollider(platform, collider) {
    const width = PLATFORM_WIDTHS[platform.type];
    const crossesY = platform.y >= collider.y &&
      platform.y <= collider.y + collider.height;
    const crossesX = platform.x < collider.x + collider.width &&
      platform.x + width > collider.x;
    return crossesX && crossesY;
  }

  #hasWalkableTop(frameId) {
    return frameId === "arch" || frameId === "facade" ||
      frameId === "tower" || frameId.endsWith("Corner");
  }

  #createTopCollision(size) {
    return Object.freeze({
      offsetX: 8,
      offsetY: 8,
      width: size.width - 16,
      height: 18,
    });
  }

  #createSideCollision(side, size) {
    const offsetX = side === "left" ? size.width - WALL_COLLIDER_WIDTH : 0;
    return Object.freeze({
      offsetX,
      offsetY: 24,
      width: WALL_COLLIDER_WIDTH,
      height: size.height - 24,
    });
  }

  #getLedgePosition(side, bounds, size) {
    const edgeGap = 176;
    const x = side === "left"
      ? edgeGap : this.worldWidth - edgeGap - size.width;
    const y = Math.round((bounds.top + bounds.bottom) / 2 - size.height / 2);
    return Object.freeze({ x, y });
  }

  #getFrameRole(frameId) {
    if (frameId.endsWith("Wall")) return "wall";
    if (frameId.endsWith("Corner")) return "corner";
    return frameId;
  }

  #getRenderSize(frame, scale) {
    return Object.freeze({
      width: Math.round(frame.width * scale),
      height: Math.round(frame.height * scale),
    });
  }

  #createRoomData(platforms) {
    return Object.freeze({
      bounds: this.#getRoomBounds(platforms),
      side: this.#getOpenArchitectureSide(platforms),
      platforms: Object.freeze([...platforms]),
    });
  }

  #getRoomBounds(platforms) {
    const yValues = platforms.map(({ y }) => y);
    return Object.freeze({
      top: Math.min(...yValues),
      bottom: Math.max(...yValues),
    });
  }

  #getOpenArchitectureSide(platforms) {
    const averageX = platforms.reduce((sum, platform) => {
      return sum + platform.x;
    }, 0) / platforms.length;
    return averageX < this.worldWidth / 2 ? "right" : "left";
  }

  #findRoomPlatforms(section, room, platforms) {
    return platforms.filter((platform) => {
      return platform.roomId === room.id &&
        platform.id.startsWith(`${section.id}-`);
    });
  }

  #validateCollections(sections, platforms) {
    if (Array.isArray(sections) && sections.length > 0 &&
      Array.isArray(platforms)) return;
    throw new TypeError("Architecture sections and platforms must be arrays.");
  }
}
