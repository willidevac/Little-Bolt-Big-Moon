import { EnvironmentStructure } from
  "../environment/environment-structure.class.js";
import { StructureSpriteAtlas } from
  "../environment/structure-sprite-atlas.class.js";
import {
  createArchitectureAtlasConfig,
  getArchitectureFrames,
} from "../../js/config/environment-architecture-config.js";

const MODULE_PATTERNS = Object.freeze([
  Object.freeze(["wall", "facade", "overhead", "tower", "arch", "corner"]),
  Object.freeze(["facade", "wall", "corner", "overhead", "tower", "arch"]),
  Object.freeze(["tower", "overhead", "facade", "wall", "corner", "arch"]),
  Object.freeze(["corner", "tower", "wall", "facade", "arch", "overhead"]),
  Object.freeze(["overhead", "corner", "tower", "arch", "facade", "wall"]),
]);
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

/** Builds varied architecture from the authored platform-room metadata. */
export class EnvironmentArchitectureBuilder {
  /** @param {number} worldWidth */
  constructor(worldWidth) {
    if (!Number.isFinite(worldWidth) || worldWidth <= 0) {
      throw new TypeError("The architecture builder needs a positive world width.");
    }
    this.worldWidth = worldWidth;
    this.atlases = new Map();
  }

  /**
   * @param {ReadonlyArray<object>} sections
   * @param {ReadonlyArray<object>} platforms
   * @returns {ReadonlyArray<EnvironmentStructure>}
   */
  build(sections, platforms) {
    this.#validateCollections(sections, platforms);
    const structures = sections.flatMap((section, sectionIndex) => {
      return this.#buildSection(section, sectionIndex, platforms);
    });
    return Object.freeze(structures);
  }

  #buildSection(section, sectionIndex, platforms) {
    const rooms = section.route.rooms ?? [];
    return rooms.flatMap((room, roomIndex) => this.#buildPlannedRoom(
      section, sectionIndex, room, roomIndex, rooms.length, platforms,
    ));
  }

  #buildPlannedRoom(section, sectionIndex, room, roomIndex, roomCount, platforms) {
    const variantId = (sectionIndex + roomIndex) % 2 === 0
      ? "base"
      : "alternate";
    const architecture = this.#getArchitecture(section.tileset, variantId);
    const roomPlatforms = this.#findRoomPlatforms(section, room, platforms);
    return this.#buildRoom(
      section, room, roomIndex, roomCount, sectionIndex, roomPlatforms,
      architecture,
    );
  }

  #findRoomPlatforms(section, room, platforms) {
    return platforms.filter((platform) => this.#matchesRoom(
      section.id, room.id, platform,
    ));
  }

  #matchesRoom(sectionId, roomId, platform) {
    return platform.roomId === roomId &&
      platform.id.startsWith(`${sectionId}-`);
  }

  #buildRoom(
    section, room, roomIndex, roomCount, sectionIndex, platforms, architecture,
  ) {
    if (platforms.length === 0) return [];
    const roomData = this.#createRoomData(
      roomIndex, roomCount, sectionIndex, platforms,
    );
    return this.#createRoomStructures(section, room, architecture, roomData);
  }

  #createRoomData(roomIndex, roomCount, sectionIndex, platforms) {
    const bounds = this.#getRoomBounds(platforms);
    const side = this.#getOpenArchitectureSide(platforms);
    const pattern = MODULE_PATTERNS[sectionIndex % MODULE_PATTERNS.length];
    const moduleType = roomIndex === roomCount - 1
      ? "arch"
      : pattern[roomIndex % pattern.length];
    return Object.freeze({ bounds, side, moduleType, roomIndex, sectionIndex });
  }

  #createRoomStructures(section, room, architecture, roomData) {
    const { bounds, side, moduleType, roomIndex, sectionIndex } = roomData;
    const mainData = this.#createMainData(
      section.id, room.id, moduleType, side, bounds, architecture.frames,
    );
    const structures = [new EnvironmentStructure(mainData, architecture.atlas)];
    this.#addOptionalLedge(structures, section, room, architecture, roomData);
    return structures;
  }

  #addOptionalLedge(structures, section, room, architecture, roomData) {
    const { bounds, side, roomIndex, sectionIndex } = roomData;
    if ((roomIndex + sectionIndex) % 5 !== 1) return;
    const data = this.#createLedgeData(
      section.id, room.id, side, bounds, architecture.frames,
    );
    structures.push(new EnvironmentStructure(data, architecture.atlas));
  }

  #createMainData(sectionId, roomId, moduleType, side, bounds, frames) {
    const frameId = this.#getSideFrameId(moduleType, side);
    if (frameId) return this.#createSideData(
      sectionId, roomId, frameId, side, bounds, frames,
    );
    return this.#createSceneryData(
      sectionId, roomId, moduleType, side, bounds, frames,
    );
  }

  #getSideFrameId(moduleType, side) {
    if (moduleType === "wall") {
      return side === "left" ? "leftWall" : "rightWall";
    }
    if (moduleType === "tower") return "tower";
    if (moduleType === "corner") return `${side}Corner`;
    return null;
  }

  #createSideData(sectionId, roomId, frameId, side, bounds, frames) {
    const role = this.#getRole(frameId);
    const frame = frames[frameId];
    const size = this.#getRenderSize(frame, MODULE_SCALES[role]);
    const x = side === "left" ? 0 : this.worldWidth - size.width;
    const y = bounds.bottom + 56 - size.height;
    return this.#createData({
      id: `${sectionId}-${roomId}-${frameId}`, role, frame, x, y, ...size,
      collisionBoxes: [this.#createSideCollision(side, size)],
    });
  }

  #createSceneryData(sectionId, roomId, role, side, bounds, frames) {
    const frame = frames[role];
    const size = this.#getRenderSize(frame, MODULE_SCALES[role]);
    const x = this.#getSceneryX(role, side, size.width);
    const y = role === "overhead"
      ? bounds.top - 24
      : bounds.bottom + 48 - size.height;
    return this.#createData({
      id: `${sectionId}-${roomId}-${role}`, role, frame, x, y, ...size,
      collisionBoxes: [],
    });
  }

  #createLedgeData(sectionId, roomId, side, bounds, frames) {
    const role = "ledge";
    const frame = frames[role];
    const size = this.#getRenderSize(frame, MODULE_SCALES[role]);
    const position = this.#getLedgePosition(side, bounds, size);
    return this.#createData({
      id: `${sectionId}-${roomId}-${role}`, role, frame, ...position, ...size,
      collisionBoxes: [this.#createLedgeCollision(size)],
    });
  }

  #getLedgePosition(side, bounds, size) {
    const edgeGap = 176;
    const x = side === "left"
      ? edgeGap
      : this.worldWidth - edgeGap - size.width;
    const y = Math.round((bounds.top + bounds.bottom) / 2 - size.height / 2);
    return Object.freeze({ x, y });
  }

  #createLedgeCollision(size) {
    return Object.freeze({
      offsetX: 8,
      offsetY: 8,
      width: size.width - 16,
      height: 18,
    });
  }

  #createData(data) {
    return Object.freeze({ ...data });
  }

  #createSideCollision(side, size) {
    const offsetX = side === "left"
      ? size.width - WALL_COLLIDER_WIDTH
      : 0;
    return Object.freeze({
      offsetX,
      offsetY: 24,
      width: WALL_COLLIDER_WIDTH,
      height: size.height - 24,
    });
  }

  #getSceneryX(role, side, width) {
    if (role !== "overhead") return Math.round((this.worldWidth - width) / 2);
    return side === "left" ? 32 : this.worldWidth - width - 32;
  }

  #getRole(frameId) {
    if (frameId === "leftWall" || frameId === "rightWall") return "wall";
    if (frameId === "tower") return "tower";
    return "corner";
  }

  #getRenderSize(frame, scale) {
    return Object.freeze({
      width: Math.round(frame.width * scale),
      height: Math.round(frame.height * scale),
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

  #getArchitecture(biomeId, variantId) {
    const key = `${biomeId}-${variantId}`;
    if (!this.atlases.has(key)) {
      const config = createArchitectureAtlasConfig(biomeId, variantId);
      this.atlases.set(key, Object.freeze({
        atlas: new StructureSpriteAtlas(config),
        frames: getArchitectureFrames(biomeId, variantId),
      }));
    }
    return this.atlases.get(key);
  }

  #validateCollections(sections, platforms) {
    if (Array.isArray(sections) && sections.length > 0 &&
      Array.isArray(platforms)) return;
    throw new TypeError("Architecture sections and platforms must be arrays.");
  }
}
